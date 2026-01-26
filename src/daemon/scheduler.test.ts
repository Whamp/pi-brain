/**
 * Tests for the scheduler module
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import type { Database } from "../storage/database.js";
import type { QueueManager, JobInput } from "./queue.js";

import {
  Scheduler,
  createScheduler,
  isValidCronExpression,
  getNextRunTimes,
  noopLogger,
  consoleLogger,
  type SchedulerConfig,
  type SchedulerLogger,
} from "./scheduler.js";

// Mock queue manager
function createMockQueue(): QueueManager & { enqueuedJobs: JobInput[] } {
  const enqueuedJobs: JobInput[] = [];
  return {
    enqueuedJobs,
    enqueue: vi.fn(async (job: JobInput) => {
      enqueuedJobs.push(job);
      return `job-${enqueuedJobs.length}`;
    }),
    dequeue: vi.fn(async () => null),
    complete: vi.fn(async () => {}),
    fail: vi.fn(async () => {}),
    getJob: vi.fn(async () => null),
    getStats: vi.fn(async () => ({
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0,
      avgDurationMinutes: null,
    })),
    getPendingJobs: vi.fn(async () => []),
    getRunningJobs: vi.fn(async () => []),
    getRecentJobs: vi.fn(async () => []),
    cleanupOldJobs: vi.fn(async () => 0),
    close: vi.fn(async () => {}),
  } as unknown as QueueManager & { enqueuedJobs: JobInput[] };
}

// Mock database
function createMockDatabase(
  nodes: {
    id: string;
    session_file: string;
    segment_start?: string;
    segment_end?: string;
    analyzer_version?: string;
    analyzed_at?: string;
  }[] = []
): Database {
  return {
    get: vi.fn(async (sql: string) => {
      if (sql.includes("metadata")) {
        return { value: "1.0.0" };
      }
      return null;
    }),
    all: vi.fn(async (sql: string) => {
      if (sql.includes("analyzer_version")) {
        // Return nodes with old version for reanalysis
        return nodes
          .filter((n) => n.analyzer_version !== "1.0.0")
          .map((n) => ({
            id: n.id,
            session_file: n.session_file,
            segment_start: n.segment_start ?? null,
            segment_end: n.segment_end ?? null,
          }));
      }
      if (sql.includes("analyzed_at")) {
        // Return recent nodes for connection discovery
        return nodes.map((n) => ({
          id: n.id,
          session_file: n.session_file,
        }));
      }
      return [];
    }),
    run: vi.fn(async () => ({ changes: 0, lastInsertRowid: 0 })),
    exec: vi.fn(async () => {}),
    close: vi.fn(async () => {}),
  } as unknown as Database;
}

// Capture logger for testing
function createCapturingLogger(): SchedulerLogger & { messages: string[] } {
  const messages: string[] = [];
  return {
    messages,
    info: (msg: string) => messages.push(`INFO: ${msg}`),
    error: (msg: string) => messages.push(`ERROR: ${msg}`),
    debug: (msg: string) => messages.push(`DEBUG: ${msg}`),
  };
}

describe("scheduler", () => {
  let scheduler: Scheduler;
  let queue: ReturnType<typeof createMockQueue>;
  let db: Database;
  let logger: ReturnType<typeof createCapturingLogger>;

  const defaultConfig: SchedulerConfig = {
    reanalysisSchedule: "0 2 * * *", // 2 AM daily
    connectionDiscoverySchedule: "0 3 * * *", // 3 AM daily
  };

  beforeEach(() => {
    queue = createMockQueue();
    db = createMockDatabase();
    logger = createCapturingLogger();
    scheduler = new Scheduler(defaultConfig, queue, db, logger);
  });

  afterEach(() => {
    if (scheduler.isRunning()) {
      scheduler.stop();
    }
  });

  describe("start/stop", () => {
    it("should start and track running state", () => {
      expect(scheduler.isRunning()).toBeFalsy();
      scheduler.start();
      expect(scheduler.isRunning()).toBeTruthy();
    });

    it("should stop and update running state", () => {
      scheduler.start();
      expect(scheduler.isRunning()).toBeTruthy();
      scheduler.stop();
      expect(scheduler.isRunning()).toBeFalsy();
    });

    it("should handle start when already running", () => {
      scheduler.start();
      scheduler.start(); // Second call should be safe
      expect(scheduler.isRunning()).toBeTruthy();
      expect(logger.messages).toContain("INFO: Scheduler already running");
    });

    it("should handle stop when not running", () => {
      scheduler.stop(); // Should be safe when not running
      expect(scheduler.isRunning()).toBeFalsy();
      expect(logger.messages).toContain("INFO: Scheduler not running");
    });

    it("should log schedule info on start", () => {
      scheduler.start();
      expect(
        logger.messages.some((m) => m.includes("Reanalysis scheduled"))
      ).toBeTruthy();
      expect(
        logger.messages.some((m) =>
          m.includes("Connection discovery scheduled")
        )
      ).toBeTruthy();
    });
  });

  describe("getStatus", () => {
    it("should return status with job info", () => {
      scheduler.start();
      const status = scheduler.getStatus();

      expect(status.running).toBeTruthy();
      expect(status.jobs).toHaveLength(2);

      const reanalysisJob = status.jobs.find((j) => j.type === "reanalysis");
      expect(reanalysisJob).toBeDefined();
      expect(reanalysisJob?.schedule).toBe("0 2 * * *");
      expect(reanalysisJob?.nextRun).toBeInstanceOf(Date);

      const connectionJob = status.jobs.find(
        (j) => j.type === "connection_discovery"
      );
      expect(connectionJob).toBeDefined();
      expect(connectionJob?.schedule).toBe("0 3 * * *");
      expect(connectionJob?.nextRun).toBeInstanceOf(Date);
    });

    it("should show running false when stopped", () => {
      const status = scheduler.getStatus();
      expect(status.running).toBeFalsy();
    });
  });

  describe("triggerReanalysis", () => {
    it("should queue outdated nodes for reanalysis", async () => {
      const nodes = [
        {
          id: "node-1",
          session_file: "/path/to/session1.jsonl",
          analyzer_version: "0.9.0",
        },
        {
          id: "node-2",
          session_file: "/path/to/session2.jsonl",
          analyzer_version: "0.8.0",
        },
      ];
      db = createMockDatabase(nodes);
      scheduler = new Scheduler(defaultConfig, queue, db, logger);

      const result = await scheduler.triggerReanalysis();

      expect(result.type).toBe("reanalysis");
      expect(result.itemsQueued).toBe(2);
      expect(result.error).toBeUndefined();
      expect(result.completedAt.getTime()).toBeGreaterThanOrEqual(
        result.startedAt.getTime()
      );

      expect(queue.enqueue).toHaveBeenCalledTimes(2);
      expect(queue.enqueuedJobs[0]).toMatchObject({
        type: "reanalysis",
        priority: 200,
        sessionFile: "/path/to/session1.jsonl",
        context: { existingNodeId: "node-1", reason: "prompt_update" },
      });
    });

    it("should handle empty results", async () => {
      db = createMockDatabase([]);
      scheduler = new Scheduler(defaultConfig, queue, db, logger);

      const result = await scheduler.triggerReanalysis();

      expect(result.itemsQueued).toBe(0);
      expect(result.error).toBeUndefined();
    });

    it("should handle database errors", async () => {
      db = {
        ...createMockDatabase(),
        all: vi.fn(async () => {
          throw new Error("Database connection failed");
        }),
      } as unknown as Database;
      scheduler = new Scheduler(defaultConfig, queue, db, logger);

      const result = await scheduler.triggerReanalysis();

      expect(result.itemsQueued).toBe(0);
      expect(result.error).toBe("Database connection failed");
    });

    it("should update lastResult in status", async () => {
      db = createMockDatabase([
        {
          id: "node-1",
          session_file: "/test.jsonl",
          analyzer_version: "0.1.0",
        },
      ]);
      scheduler = new Scheduler(defaultConfig, queue, db, logger);
      scheduler.start();

      await scheduler.triggerReanalysis();
      const status = scheduler.getStatus();

      const reanalysisJob = status.jobs.find((j) => j.type === "reanalysis");
      expect(reanalysisJob?.lastResult).toBeDefined();
      expect(reanalysisJob?.lastResult?.itemsQueued).toBe(1);
    });
  });

  describe("triggerConnectionDiscovery", () => {
    it("should queue recent nodes for connection discovery", async () => {
      const nodes = [
        { id: "node-1", session_file: "/path/to/session1.jsonl" },
        { id: "node-2", session_file: "/path/to/session2.jsonl" },
        { id: "node-3", session_file: "/path/to/session3.jsonl" },
      ];
      db = createMockDatabase(nodes);
      scheduler = new Scheduler(defaultConfig, queue, db, logger);

      const result = await scheduler.triggerConnectionDiscovery();

      expect(result.type).toBe("connection_discovery");
      expect(result.itemsQueued).toBe(3);
      expect(result.error).toBeUndefined();

      expect(queue.enqueue).toHaveBeenCalledTimes(3);
      expect(queue.enqueuedJobs[0]).toMatchObject({
        type: "connection_discovery",
        priority: 300,
        sessionFile: "/path/to/session1.jsonl",
        context: { nodeId: "node-1", findConnections: true },
      });
    });

    it("should handle database errors", async () => {
      db = {
        ...createMockDatabase(),
        all: vi.fn(async () => {
          throw new Error("Query timeout");
        }),
      } as unknown as Database;
      scheduler = new Scheduler(defaultConfig, queue, db, logger);

      const result = await scheduler.triggerConnectionDiscovery();

      expect(result.itemsQueued).toBe(0);
      expect(result.error).toBe("Query timeout");
    });
  });

  describe("invalid cron expressions", () => {
    it("should handle invalid reanalysis schedule gracefully", () => {
      const badConfig: SchedulerConfig = {
        reanalysisSchedule: "invalid cron",
        connectionDiscoverySchedule: "0 3 * * *",
      };
      scheduler = new Scheduler(badConfig, queue, db, logger);
      scheduler.start();

      expect(scheduler.isRunning()).toBeTruthy();
      expect(
        logger.messages.some(
          (m) =>
            m.includes("ERROR") && m.includes("Invalid reanalysis schedule")
        )
      ).toBeTruthy();
    });

    it("should handle invalid connection discovery schedule gracefully", () => {
      const badConfig: SchedulerConfig = {
        reanalysisSchedule: "0 2 * * *",
        connectionDiscoverySchedule: "not valid",
      };
      scheduler = new Scheduler(badConfig, queue, db, logger);
      scheduler.start();

      expect(scheduler.isRunning()).toBeTruthy();
      expect(
        logger.messages.some(
          (m) =>
            m.includes("ERROR") &&
            m.includes("Invalid connection discovery schedule")
        )
      ).toBeTruthy();
    });
  });

  describe("empty schedules", () => {
    it("should handle empty reanalysis schedule", () => {
      const config: SchedulerConfig = {
        reanalysisSchedule: "",
        connectionDiscoverySchedule: "0 3 * * *",
      };
      scheduler = new Scheduler(config, queue, db, logger);
      scheduler.start();

      const status = scheduler.getStatus();
      expect(status.jobs).toHaveLength(1);
      expect(status.jobs[0].type).toBe("connection_discovery");
    });

    it("should handle empty connection discovery schedule", () => {
      const config: SchedulerConfig = {
        reanalysisSchedule: "0 2 * * *",
        connectionDiscoverySchedule: "",
      };
      scheduler = new Scheduler(config, queue, db, logger);
      scheduler.start();

      const status = scheduler.getStatus();
      expect(status.jobs).toHaveLength(1);
      expect(status.jobs[0].type).toBe("reanalysis");
    });
  });
});

describe("createScheduler", () => {
  it("should create scheduler from daemon config", () => {
    const daemonConfig = {
      reanalysisSchedule: "0 2 * * *",
      connectionDiscoverySchedule: "0 3 * * *",
      // Other daemon config fields...
    } as {
      reanalysisSchedule: string;
      connectionDiscoverySchedule: string;
    };
    const queue = createMockQueue();
    const db = createMockDatabase();

    const scheduler = createScheduler(daemonConfig as never, queue, db);

    expect(scheduler).toBeInstanceOf(Scheduler);
    scheduler.start();
    expect(scheduler.isRunning()).toBeTruthy();
    scheduler.stop();
  });
});

describe("isValidCronExpression", () => {
  it("should return true for valid expressions", () => {
    expect(isValidCronExpression("0 2 * * *")).toBeTruthy(); // Daily at 2 AM
    expect(isValidCronExpression("*/5 * * * *")).toBeTruthy(); // Every 5 minutes
    expect(isValidCronExpression("0 0 * * 0")).toBeTruthy(); // Weekly on Sunday
    expect(isValidCronExpression("0 0 1 * *")).toBeTruthy(); // Monthly on 1st
    expect(isValidCronExpression("0 0 1 1 *")).toBeTruthy(); // Yearly on Jan 1
  });

  it("should return false for invalid expressions", () => {
    expect(isValidCronExpression("invalid")).toBeFalsy();
    expect(isValidCronExpression("")).toBeFalsy();
    expect(isValidCronExpression("* * *")).toBeFalsy(); // Too few fields
    expect(isValidCronExpression("60 * * * *")).toBeFalsy(); // Invalid minute
    expect(isValidCronExpression("* 25 * * *")).toBeFalsy(); // Invalid hour
  });
});

describe("getNextRunTimes", () => {
  it("should return next run times for valid expression", () => {
    const times = getNextRunTimes("*/5 * * * *", 3);

    expect(times).not.toBeNull();
    expect(times).toHaveLength(3);

    // Use assert to narrow type after null check
    if (!times) {
      throw new Error("Expected times to be defined");
    }

    expect(times[0]).toBeInstanceOf(Date);
    expect(times[1]).toBeInstanceOf(Date);
    expect(times[2]).toBeInstanceOf(Date);

    // Each time should be 5 minutes apart
    const diff1 = times[1].getTime() - times[0].getTime();
    const diff2 = times[2].getTime() - times[1].getTime();
    expect(diff1).toBe(5 * 60 * 1000);
    expect(diff2).toBe(5 * 60 * 1000);
  });

  it("should return null for invalid expression", () => {
    expect(getNextRunTimes("invalid")).toBeNull();
  });

  it("should use default count of 5", () => {
    const times = getNextRunTimes("*/5 * * * *");
    expect(times).toHaveLength(5);
  });
});

describe("loggers", () => {
  it("noopLogger should not throw", () => {
    expect(() => noopLogger.info("test")).not.toThrow();
    expect(() => noopLogger.error("test")).not.toThrow();
    expect(() => noopLogger.debug?.("test")).not.toThrow();
  });

  it("consoleLogger should exist and have all methods", () => {
    expect(consoleLogger.info).toBeDefined();
    expect(consoleLogger.error).toBeDefined();
    expect(consoleLogger.debug).toBeDefined();
  });
});
