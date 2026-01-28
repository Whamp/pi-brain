/**
 * Tests for the session file watcher
 */

import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { describe, expect, it } from "vitest";

import type { DaemonConfig } from "../config/types.js";

import {
  createWatcher,
  DEFAULT_WATCHER_CONFIG,
  getEventError,
  getProjectFromSessionPath,
  getSessionName,
  getSessionPath,
  isSessionFile,
  SESSION_EVENTS,
  SessionWatcher,
} from "./index.js";

// Helper to create a complete DaemonConfig for tests
function getTestDaemonConfig(
  overrides: Partial<DaemonConfig> = {}
): DaemonConfig {
  return {
    idleTimeoutMinutes: 15,
    parallelWorkers: 1,
    maxRetries: 3,
    retryDelaySeconds: 60,
    reanalysisSchedule: "0 2 * * *",
    connectionDiscoverySchedule: "0 3 * * *",
    patternAggregationSchedule: "0 3 * * *",
    clusteringSchedule: "0 4 * * *",
    embeddingProvider: "openrouter" as const,
    embeddingModel: "mock",
    provider: "zai",
    model: "glm-4.7",
    promptFile: "/test/prompt.md",
    maxConcurrentAnalysis: 1,
    analysisTimeoutMinutes: 30,
    maxQueueSize: 1000,
    backfillLimit: 100,
    reanalysisLimit: 100,
    connectionDiscoveryLimit: 100,
    connectionDiscoveryLookbackDays: 7,
    connectionDiscoveryCooldownHours: 24,
    semanticSearchThreshold: 0.5,
    ...overrides,
  };
}

// Test helpers
async function createTempDir(): Promise<string> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "pi-brain-test-"));
  return tempDir;
}

async function cleanupTempDir(tempDir: string): Promise<void> {
  try {
    await fs.rm(tempDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}

async function writeSessionFile(
  dir: string,
  name: string,
  content = ""
): Promise<string> {
  const filePath = path.join(dir, name);
  await fs.writeFile(filePath, content, "utf8");
  return filePath;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitForEvent(
  watcher: SessionWatcher,
  eventName: string,
  timeoutMs = 5000
): Promise<Event> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timeout waiting for event: ${eventName}`));
    }, timeoutMs);

    watcher.addEventListener(
      eventName,
      (event) => {
        clearTimeout(timeout);
        resolve(event);
      },
      { once: true }
    );
  });
}

function createTestWatcher(): SessionWatcher {
  return new SessionWatcher({
    idleTimeoutMinutes: 0.01, // 0.6 seconds for testing
    stabilityThreshold: 100, // Quick stability for tests
    pollInterval: 50,
  });
}

describe("sessionWatcher", () => {
  describe("constructor", () => {
    it("should create with default config", () => {
      const watcher = new SessionWatcher();
      expect(watcher.running).toBeFalsy();
      expect(watcher.sessionCount).toBe(0);
    });

    it("should merge custom config with defaults", () => {
      const watcher = new SessionWatcher({
        idleTimeoutMinutes: 5,
      });
      expect(watcher.running).toBeFalsy();
    });
  });

  describe("start", () => {
    it("should start watching a single directory", async () => {
      const tempDir = await createTempDir();
      const watcher = createTestWatcher();
      try {
        const readyPromise = waitForEvent(watcher, SESSION_EVENTS.READY);
        await watcher.start(tempDir);
        await readyPromise;

        expect(watcher.running).toBeTruthy();
        expect(watcher.getWatchPaths()).toStrictEqual([tempDir]);
      } finally {
        await watcher.stop();
        await cleanupTempDir(tempDir);
      }
    });

    it("should start watching multiple directories", async () => {
      const tempDir = await createTempDir();
      const dir2 = await createTempDir();
      const watcher = createTestWatcher();
      try {
        const readyPromise = waitForEvent(watcher, SESSION_EVENTS.READY);
        await watcher.start([tempDir, dir2]);
        await readyPromise;

        expect(watcher.running).toBeTruthy();
        expect(watcher.getWatchPaths()).toStrictEqual([tempDir, dir2]);
      } finally {
        await watcher.stop();
        await cleanupTempDir(tempDir);
        await cleanupTempDir(dir2);
      }
    });

    it("should create directory if it doesn't exist", async () => {
      const tempDir = await createTempDir();
      const watcher = createTestWatcher();
      try {
        const newDir = path.join(tempDir, "new-sessions");
        const readyPromise = waitForEvent(watcher, SESSION_EVENTS.READY);
        await watcher.start(newDir);
        await readyPromise;

        const stat = await fs.stat(newDir);
        expect(stat.isDirectory()).toBeTruthy();
      } finally {
        await watcher.stop();
        await cleanupTempDir(tempDir);
      }
    });

    it("should throw if already running", async () => {
      const tempDir = await createTempDir();
      const watcher = createTestWatcher();
      try {
        await watcher.start(tempDir);
        await expect(watcher.start(tempDir)).rejects.toThrow(
          "Watcher is already running"
        );
      } finally {
        await watcher.stop();
        await cleanupTempDir(tempDir);
      }
    });

    it("should throw if path is not a directory", async () => {
      const tempDir = await createTempDir();
      const watcher = createTestWatcher();
      try {
        const filePath = await writeSessionFile(tempDir, "test.jsonl");
        await expect(watcher.start(filePath)).rejects.toThrow(
          "Not a directory"
        );
      } finally {
        await watcher.stop();
        await cleanupTempDir(tempDir);
      }
    });
  });

  describe("stop", () => {
    it("should stop watching", async () => {
      const tempDir = await createTempDir();
      const watcher = createTestWatcher();
      try {
        const readyPromise = waitForEvent(watcher, SESSION_EVENTS.READY);
        await watcher.start(tempDir);
        await readyPromise;

        await watcher.stop();
        expect(watcher.running).toBeFalsy();
        expect(watcher.sessionCount).toBe(0);
      } finally {
        await cleanupTempDir(tempDir);
      }
    });

    it("should be safe to call stop multiple times", async () => {
      const tempDir = await createTempDir();
      const watcher = createTestWatcher();
      try {
        await watcher.start(tempDir);
        await watcher.stop();
        await watcher.stop(); // Should not throw
        expect(watcher.running).toBeFalsy();
      } finally {
        await cleanupTempDir(tempDir);
      }
    });

    it("should be safe to call stop without starting", async () => {
      const watcher = createTestWatcher();
      await watcher.stop(); // Should not throw
      expect(watcher.running).toBeFalsy();
    });
  });

  describe("file detection", () => {
    it("should detect new .jsonl files", async () => {
      const tempDir = await createTempDir();
      const watcher = createTestWatcher();
      try {
        const readyPromise = waitForEvent(watcher, SESSION_EVENTS.READY);
        await watcher.start(tempDir);
        await readyPromise;

        const newEventPromise = waitForEvent(watcher, SESSION_EVENTS.NEW);
        const filePath = await writeSessionFile(tempDir, "session.jsonl");

        const event = await newEventPromise;
        expect(getSessionPath(event)).toBe(filePath);
        expect(watcher.sessionCount).toBe(1);
      } finally {
        await watcher.stop();
        await cleanupTempDir(tempDir);
      }
    });

    it("should ignore non-.jsonl files", async () => {
      const tempDir = await createTempDir();
      const watcher = createTestWatcher();
      try {
        const readyPromise = waitForEvent(watcher, SESSION_EVENTS.READY);
        await watcher.start(tempDir);
        await readyPromise;

        // Write a non-jsonl file
        await writeSessionFile(tempDir, "readme.txt");

        // Wait a bit to ensure no event is fired
        await delay(200);
        expect(watcher.sessionCount).toBe(0);
      } finally {
        await watcher.stop();
        await cleanupTempDir(tempDir);
      }
    });

    it("should detect files in subdirectories", async () => {
      const tempDir = await createTempDir();
      const watcher = createTestWatcher();
      try {
        const subDir = path.join(tempDir, "project");
        await fs.mkdir(subDir, { recursive: true });

        const readyPromise = waitForEvent(watcher, SESSION_EVENTS.READY);
        await watcher.start(tempDir);
        await readyPromise;

        const newEventPromise = waitForEvent(watcher, SESSION_EVENTS.NEW);
        const filePath = await writeSessionFile(subDir, "session.jsonl");

        const event = await newEventPromise;
        expect(getSessionPath(event)).toBe(filePath);
      } finally {
        await watcher.stop();
        await cleanupTempDir(tempDir);
      }
    });

    it("should detect file changes", async () => {
      const tempDir = await createTempDir();
      const watcher = createTestWatcher();
      try {
        const filePath = await writeSessionFile(
          tempDir,
          "session.jsonl",
          '{"line": 1}'
        );

        // Set up listeners before starting to catch all events
        const newEventPromise = waitForEvent(watcher, SESSION_EVENTS.NEW);
        const readyPromise = waitForEvent(watcher, SESSION_EVENTS.READY);

        await watcher.start(tempDir);
        await readyPromise;

        // Wait for initial detection (might have already fired)
        await newEventPromise;

        const changeEventPromise = waitForEvent(watcher, SESSION_EVENTS.CHANGE);
        await fs.appendFile(filePath, '\n{"line": 2}');

        const event = await changeEventPromise;
        expect(getSessionPath(event)).toBe(filePath);
      } finally {
        await watcher.stop();
        await cleanupTempDir(tempDir);
      }
    });

    it("should detect file removal", async () => {
      const tempDir = await createTempDir();
      const watcher = createTestWatcher();
      try {
        const filePath = await writeSessionFile(tempDir, "session.jsonl");

        // Set up listeners before starting
        const newEventPromise = waitForEvent(watcher, SESSION_EVENTS.NEW);
        const readyPromise = waitForEvent(watcher, SESSION_EVENTS.READY);

        await watcher.start(tempDir);
        await readyPromise;

        // Wait for initial detection
        await newEventPromise;
        expect(watcher.sessionCount).toBe(1);

        const removeEventPromise = waitForEvent(watcher, SESSION_EVENTS.REMOVE);
        await fs.unlink(filePath);

        const event = await removeEventPromise;
        expect(getSessionPath(event)).toBe(filePath);
        expect(watcher.sessionCount).toBe(0);
      } finally {
        await watcher.stop();
        await cleanupTempDir(tempDir);
      }
    });
  });

  describe("idle detection", () => {
    it("should emit sessionIdle after timeout", async () => {
      const tempDir = await createTempDir();
      // Use a very short timeout for testing
      const watcher = new SessionWatcher({
        idleTimeoutMinutes: 0.005, // 0.3 seconds
        stabilityThreshold: 50,
        pollInterval: 25,
      });

      try {
        const readyPromise = waitForEvent(watcher, SESSION_EVENTS.READY);
        await watcher.start(tempDir);
        await readyPromise;

        const newEventPromise = waitForEvent(watcher, SESSION_EVENTS.NEW);
        const filePath = await writeSessionFile(tempDir, "session.jsonl");
        await newEventPromise;

        const idleEventPromise = waitForEvent(
          watcher,
          SESSION_EVENTS.IDLE,
          3000
        );
        const event = await idleEventPromise;
        expect(getSessionPath(event)).toBe(filePath);
      } finally {
        await watcher.stop();
        await cleanupTempDir(tempDir);
      }
    });

    it("should not emit idle while analyzing", async () => {
      const tempDir = await createTempDir();
      const watcher = new SessionWatcher({
        idleTimeoutMinutes: 0.005,
        stabilityThreshold: 50,
        pollInterval: 25,
      });

      try {
        const readyPromise = waitForEvent(watcher, SESSION_EVENTS.READY);
        await watcher.start(tempDir);
        await readyPromise;

        const newEventPromise = waitForEvent(watcher, SESSION_EVENTS.NEW);
        const filePath = await writeSessionFile(tempDir, "session.jsonl");
        await newEventPromise;

        // Mark as analyzing
        watcher.markAnalyzing(filePath);

        // Set up listener that should not be called
        let idleCalled = false;
        watcher.addEventListener(SESSION_EVENTS.IDLE, () => {
          idleCalled = true;
        });

        // Wait longer than idle timeout
        await delay(500);
        expect(idleCalled).toBeFalsy();
      } finally {
        await watcher.stop();
        await cleanupTempDir(tempDir);
      }
    });
  });

  describe("session state", () => {
    it("should track session state", async () => {
      const tempDir = await createTempDir();
      const watcher = createTestWatcher();
      try {
        const readyPromise = waitForEvent(watcher, SESSION_EVENTS.READY);
        await watcher.start(tempDir);
        await readyPromise;

        const newEventPromise = waitForEvent(watcher, SESSION_EVENTS.NEW);
        const filePath = await writeSessionFile(tempDir, "session.jsonl");
        await newEventPromise;

        const state = watcher.getSessionState(filePath);
        expect(state).toBeDefined();
        expect(state?.path).toBe(filePath);
        expect(state?.lastAnalyzed).toBeNull();
        expect(state?.analyzing).toBeFalsy();
      } finally {
        await watcher.stop();
        await cleanupTempDir(tempDir);
      }
    });

    it("should get all sessions", async () => {
      const tempDir = await createTempDir();
      const watcher = createTestWatcher();
      try {
        const readyPromise = waitForEvent(watcher, SESSION_EVENTS.READY);
        await watcher.start(tempDir);
        await readyPromise;

        await writeSessionFile(tempDir, "session1.jsonl");
        await waitForEvent(watcher, SESSION_EVENTS.NEW);

        await writeSessionFile(tempDir, "session2.jsonl");
        await waitForEvent(watcher, SESSION_EVENTS.NEW);

        const sessions = watcher.getAllSessions();
        expect(sessions.size).toBe(2);
      } finally {
        await watcher.stop();
        await cleanupTempDir(tempDir);
      }
    });

    it("should update lastAnalyzed with markAnalyzed", async () => {
      const tempDir = await createTempDir();
      const watcher = createTestWatcher();
      try {
        const readyPromise = waitForEvent(watcher, SESSION_EVENTS.READY);
        await watcher.start(tempDir);
        await readyPromise;

        const newEventPromise = waitForEvent(watcher, SESSION_EVENTS.NEW);
        const filePath = await writeSessionFile(tempDir, "session.jsonl");
        await newEventPromise;

        watcher.markAnalyzing(filePath);
        let state = watcher.getSessionState(filePath);
        expect(state?.analyzing).toBeTruthy();

        watcher.markAnalyzed(filePath);
        state = watcher.getSessionState(filePath);
        expect(state?.analyzing).toBeFalsy();
        expect(state?.lastAnalyzed).toBeGreaterThan(0);
      } finally {
        await watcher.stop();
        await cleanupTempDir(tempDir);
      }
    });
  });

  describe("fromConfig", () => {
    it("should create watcher from config", () => {
      const config = {
        hub: {
          sessionsDir: "/test/sessions",
          databaseDir: "/test/data",
          webUiPort: 8765,
        },
        spokes: [],
        daemon: getTestDaemonConfig(),
        query: {
          provider: "zai",
          model: "glm-4.7",
        },
        api: {
          port: 8765,
          host: "127.0.0.1",
          corsOrigins: [],
        },
      };

      const configWatcher = SessionWatcher.fromConfig(config);
      expect(configWatcher).toBeInstanceOf(SessionWatcher);
    });

    it("should track enabled spoke paths", () => {
      const config = {
        hub: {
          sessionsDir: "/test/sessions",
          databaseDir: "/test/data",
          webUiPort: 8765,
        },
        spokes: [
          {
            name: "laptop",
            syncMethod: "syncthing" as const,
            path: "/synced/laptop",
            enabled: true,
          },
          {
            name: "server",
            syncMethod: "rsync" as const,
            path: "/synced/server",
            source: "user@server:~/.pi/agent/sessions",
            enabled: true,
          },
          {
            name: "disabled-spoke",
            syncMethod: "syncthing" as const,
            path: "/synced/disabled",
            enabled: false,
          },
        ],
        daemon: getTestDaemonConfig(),
        query: {
          provider: "zai",
          model: "glm-4.7",
        },
        api: {
          port: 8765,
          host: "127.0.0.1",
          corsOrigins: [],
        },
      };

      const configWatcher = SessionWatcher.fromConfig(config);
      const spokePaths = configWatcher.getSpokePaths();

      // Should track enabled spokes
      expect(spokePaths.has("/synced/laptop")).toBeTruthy();
      expect(spokePaths.has("/synced/server")).toBeTruthy();

      // Should not track disabled spokes
      expect(spokePaths.has("/synced/disabled")).toBeFalsy();
    });
  });

  describe("spoke path detection", () => {
    it("should identify sessions from spoke directories", () => {
      const watcher = new SessionWatcher();
      watcher.addSpokePath("/synced/laptop");
      watcher.addSpokePath("/synced/server");

      // Sessions from spoke directories
      expect(
        watcher.isFromSpoke("/synced/laptop/project/session.jsonl")
      ).toBeTruthy();
      expect(
        watcher.isFromSpoke("/synced/server/another/session.jsonl")
      ).toBeTruthy();

      // Sessions from local directory
      expect(
        watcher.isFromSpoke(
          "/home/user/.pi/agent/sessions/project/session.jsonl"
        )
      ).toBeFalsy();
      expect(watcher.isFromSpoke("/test/sessions/session.jsonl")).toBeFalsy();
    });

    it("should not match paths with similar prefixes (path boundary check)", () => {
      const watcher = new SessionWatcher();
      watcher.addSpokePath("/synced/laptop");

      // Should NOT match - laptop-backup starts with laptop but is different dir
      expect(
        watcher.isFromSpoke("/synced/laptop-backup/session.jsonl")
      ).toBeFalsy();
      expect(watcher.isFromSpoke("/synced/laptops/session.jsonl")).toBeFalsy();
      expect(watcher.isFromSpoke("/synced/laptop2/session.jsonl")).toBeFalsy();

      // Should match - actually under /synced/laptop/
      expect(
        watcher.isFromSpoke("/synced/laptop/project/session.jsonl")
      ).toBeTruthy();
      expect(watcher.isFromSpoke("/synced/laptop/session.jsonl")).toBeTruthy();
    });

    it("should normalize trailing slashes in spoke paths", () => {
      const watcher = new SessionWatcher();
      // Add with trailing slash
      watcher.addSpokePath("/synced/laptop/");

      // Should still match correctly
      expect(
        watcher.isFromSpoke("/synced/laptop/project/session.jsonl")
      ).toBeTruthy();
      expect(watcher.isFromSpoke("/synced/laptop/session.jsonl")).toBeTruthy();

      // Should NOT match similar prefixes
      expect(
        watcher.isFromSpoke("/synced/laptop-backup/session.jsonl")
      ).toBeFalsy();

      // Verify normalization in stored paths
      const spokePaths = watcher.getSpokePaths();
      expect(spokePaths.has("/synced/laptop")).toBeTruthy();
      expect(spokePaths.has("/synced/laptop/")).toBeFalsy();
    });

    it("should return appropriate stability thresholds", () => {
      const watcher = new SessionWatcher();
      watcher.addSpokePath("/synced/laptop");

      // Local sessions should use local threshold
      expect(
        watcher.getStabilityThreshold("/home/user/sessions/session.jsonl")
      ).toBe(5000);

      // Synced sessions should use synced threshold
      expect(
        watcher.getStabilityThreshold("/synced/laptop/project/session.jsonl")
      ).toBe(30_000);
    });

    it("should use custom stability thresholds if configured", () => {
      const watcher = new SessionWatcher({
        stabilityThreshold: 3000,
        syncedStabilityThreshold: 15_000,
      });
      watcher.addSpokePath("/synced/laptop");

      expect(watcher.getStabilityThreshold("/local/session.jsonl")).toBe(3000);
      expect(
        watcher.getStabilityThreshold("/synced/laptop/session.jsonl")
      ).toBe(15_000);
    });

    it("should watch both hub and spoke directories with startFromConfig", async () => {
      // Create temp directories for hub and spoke
      const hubDir = await createTempDir();
      const spokeDir = await createTempDir();

      try {
        // Use short stability threshold for faster test
        const watcher = new SessionWatcher({
          idleTimeoutMinutes: 10,
          stabilityThreshold: 100,
          syncedStabilityThreshold: 200,
        });
        watcher.addSpokePath(spokeDir);

        // Set up ready promise BEFORE starting
        const readyPromise = waitForEvent(watcher, SESSION_EVENTS.READY);

        // Start watching both directories
        await watcher.start([hubDir, spokeDir]);

        // Wait for ready event
        await readyPromise;

        // Verify spoke paths are tracked
        expect(watcher.getSpokePaths().has(spokeDir)).toBeTruthy();

        // Verify both directories are watched
        const watchPaths = watcher.getWatchPaths();
        expect(watchPaths).toContain(hubDir);
        expect(watchPaths).toContain(spokeDir);

        // Test events for sessions in both directories
        const hubEvents: string[] = [];
        const spokeEvents: string[] = [];

        watcher.addEventListener(SESSION_EVENTS.NEW, (event) => {
          const sessionPath = getSessionPath(event);
          if (sessionPath?.startsWith(hubDir)) {
            hubEvents.push(sessionPath);
          } else if (sessionPath?.startsWith(spokeDir)) {
            spokeEvents.push(sessionPath);
          }
        });

        // Create sessions in both directories
        const hubSession = await writeSessionFile(hubDir, "hub-session.jsonl");
        const spokeSession = await writeSessionFile(
          spokeDir,
          "spoke-session.jsonl"
        );

        // Wait for file system events (stability threshold + buffer)
        await new Promise((resolve) => {
          setTimeout(resolve, 400);
        });

        // Verify events from both directories
        expect(hubEvents).toContain(hubSession);
        expect(spokeEvents).toContain(spokeSession);

        // Verify spoke session is identified correctly
        expect(watcher.isFromSpoke(hubSession)).toBeFalsy();
        expect(watcher.isFromSpoke(spokeSession)).toBeTruthy();

        await watcher.stop();
      } finally {
        await cleanupTempDir(hubDir);
        await cleanupTempDir(spokeDir);
      }
    });
  });
});

describe("createWatcher", () => {
  it("should create watcher from daemon config", () => {
    const daemonConfig = getTestDaemonConfig({ idleTimeoutMinutes: 20 });

    const watcher = createWatcher(daemonConfig);
    expect(watcher).toBeInstanceOf(SessionWatcher);
  });
});

describe("isSessionFile", () => {
  it("should return true for .jsonl files", () => {
    expect(isSessionFile("/path/to/session.jsonl")).toBeTruthy();
    expect(isSessionFile("session.jsonl")).toBeTruthy();
  });

  it("should return false for other files", () => {
    expect(isSessionFile("/path/to/file.json")).toBeFalsy();
    expect(isSessionFile("/path/to/file.txt")).toBeFalsy();
    expect(isSessionFile("/path/to/jsonl")).toBeFalsy();
  });
});

describe("getSessionName", () => {
  it("should extract session name from path", () => {
    expect(getSessionName("/path/to/my-session.jsonl")).toBe("my-session");
    expect(
      getSessionName("/home/user/.pi/agent/sessions/project/2026-01-25.jsonl")
    ).toBe("2026-01-25");
  });
});

describe("getProjectFromSessionPath", () => {
  it("should extract project name from session path", () => {
    expect(
      getProjectFromSessionPath(
        "/home/user/.pi/agent/sessions/my-project/session.jsonl"
      )
    ).toBe("my-project");
  });

  it("should return null for sessions directory itself", () => {
    expect(
      getProjectFromSessionPath("/home/user/.pi/agent/sessions/session.jsonl")
    ).toBeNull();
  });
});

describe("default watcher config", () => {
  it("should have expected default values", () => {
    expect(DEFAULT_WATCHER_CONFIG.idleTimeoutMinutes).toBe(10);
    expect(DEFAULT_WATCHER_CONFIG.stabilityThreshold).toBe(5000); // 5 seconds for local
    expect(DEFAULT_WATCHER_CONFIG.syncedStabilityThreshold).toBe(30_000); // 30 seconds for synced
    expect(DEFAULT_WATCHER_CONFIG.pollInterval).toBe(100);
    expect(DEFAULT_WATCHER_CONFIG.depth).toBe(2);
  });
});

describe("event helpers", () => {
  describe("getSessionPath", () => {
    it("should return undefined for non-session events", () => {
      const event = new Event("test");
      expect(getSessionPath(event)).toBeUndefined();
    });
  });

  describe("getEventError", () => {
    it("should return undefined for non-error events", () => {
      const event = new Event("test");
      expect(getEventError(event)).toBeUndefined();
    });
  });
});
