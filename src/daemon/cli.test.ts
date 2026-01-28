/**
 * Tests for daemon CLI module
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";

import type { Node } from "../types/index.js";

import { openDatabase, migrate } from "../storage/database.js";
import { getNode, listNodes } from "../storage/index.js";
import { writeNode, readNodeFromPath } from "../storage/node-storage.js";
import {
  generateNodeId,
  emptyLessons,
  emptyObservations,
  emptyDaemonMeta,
} from "../storage/node-types.js";
import {
  PID_FILE,
  readPidFile,
  writePidFile,
  removePidFile,
  isProcessRunning,
  isDaemonRunning,
  formatUptime,
  getDaemonStatus,
  getQueueStatus,
  queueAnalysis,
  formatDaemonStatus,
  formatQueueStatus,
  formatHealthStatus,
  rebuildIndex,
  type DaemonStatus,
  type QueueStatus,
  type HealthStatus,
} from "./cli.js";
import { createQueueManager, PRIORITY } from "./queue.js";

describe("pID file management", () => {
  const testPidFile = path.join(os.tmpdir(), "pi-brain-test-daemon.pid");

  beforeEach(() => {
    // Clean up any existing test PID file
    try {
      fs.unlinkSync(testPidFile);
    } catch {
      // Ignore
    }
  });

  afterEach(() => {
    // Clean up
    try {
      fs.unlinkSync(testPidFile);
    } catch {
      // Ignore
    }
  });

  describe("readPidFile", () => {
    it("should return null or a number", () => {
      const result = readPidFile();
      // Real PID file might exist, so we just check it's a valid type
      // Either it's null, or it's a number - using type assertion pattern
      const isValidResult = result === null ? true : typeof result === "number";
      expect(isValidResult).toBeTruthy();
    });
  });

  describe("writePidFile and removePidFile", () => {
    // These tests use the real PID file location, which might interfere with actual daemon
    it("should write and read PID file", () => {
      const pid = 12_345;
      const testDir = path.dirname(PID_FILE);

      // Ensure directory exists
      fs.mkdirSync(testDir, { recursive: true });

      // Read current state and save for restoration
      const originalPid = readPidFile();

      try {
        // Write test PID
        writePidFile(pid);
        expect(readPidFile()).toBe(pid);

        // Clean up
        removePidFile();
        expect(readPidFile()).toBeNull();
      } finally {
        // Restore original - using finally to ensure cleanup
        // biome-ignore lint/correctness/noUnsafeFinally: test cleanup
        if (originalPid !== null) {
          writePidFile(originalPid);
        }
      }
    });
  });

  describe("isProcessRunning", () => {
    it("should return true for current process", () => {
      expect(isProcessRunning(process.pid)).toBeTruthy();
    });

    it("should return false for non-existent PID", () => {
      // Use a very high PID that's unlikely to exist
      expect(isProcessRunning(9_999_999)).toBeFalsy();
    });
  });

  describe("isDaemonRunning", () => {
    it("should return running status object with valid types", () => {
      const status = isDaemonRunning();
      expect(status).toHaveProperty("running");
      expect(status).toHaveProperty("pid");
      expect(typeof status.running).toBe("boolean");
      // pid should be null or a number - using ternary to avoid || in assertion
      const isPidValid =
        status.pid === null ? true : typeof status.pid === "number";
      expect(isPidValid).toBeTruthy();
    });
  });
});

describe("formatUptime", () => {
  it("should format seconds only", () => {
    expect(formatUptime(30)).toBe("30s");
  });

  it("should format minutes only", () => {
    expect(formatUptime(120)).toBe("2m");
  });

  it("should format hours and minutes", () => {
    expect(formatUptime(3660)).toBe("1h 1m");
  });

  it("should format days, hours, and minutes", () => {
    expect(formatUptime(90_061)).toBe("1d 1h 1m");
  });

  it("should handle large values", () => {
    expect(formatUptime(259_200)).toBe("3d");
  });

  it("should handle edge case of 0", () => {
    expect(formatUptime(0)).toBe("0s");
  });
});

describe("getDaemonStatus", () => {
  it("should return status object with all properties", () => {
    const status = getDaemonStatus();

    expect(status).toHaveProperty("running");
    expect(status).toHaveProperty("pid");
    expect(status).toHaveProperty("uptime");
    expect(status).toHaveProperty("uptimeFormatted");
    expect(status).toHaveProperty("configPath");

    expect(typeof status.running).toBe("boolean");
    expect(typeof status.configPath).toBe("string");
  });
});

describe("getQueueStatus", () => {
  let tempDir: string;
  let configPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "pi-brain-cli-test-"));
    configPath = path.join(tempDir, "config.yaml");

    // Create a minimal config file
    const config = `
hub:
  sessions_dir: ${path.join(tempDir, "sessions")}
  database_dir: ${tempDir}
  web_ui_port: 8765
daemon:
  prompt_file: ${path.join(tempDir, "prompts", "session-analyzer.md")}
`;
    fs.writeFileSync(configPath, config);
    fs.mkdirSync(path.join(tempDir, "sessions"));
    fs.mkdirSync(path.join(tempDir, "prompts"));
    fs.writeFileSync(
      path.join(tempDir, "prompts", "session-analyzer.md"),
      "# Test prompt"
    );
  });

  afterEach(() => {
    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("should return empty stats when database does not exist", () => {
    const status = getQueueStatus(configPath);

    expect(status.stats.pending).toBe(0);
    expect(status.stats.running).toBe(0);
    expect(status.stats.completed).toBe(0);
    expect(status.stats.failed).toBe(0);
    expect(status.pendingJobs).toHaveLength(0);
    expect(status.runningJobs).toHaveLength(0);
    expect(status.recentFailed).toHaveLength(0);
  });

  it("should return queue stats when database exists", () => {
    // Create database with some jobs
    const dbPath = path.join(tempDir, "brain.db");
    const db = openDatabase({ path: dbPath });
    migrate(db);
    const queue = createQueueManager(db);

    // Add some jobs
    queue.enqueue({
      type: "initial",
      priority: PRIORITY.INITIAL,
      sessionFile: "/test/session1.jsonl",
    });
    queue.enqueue({
      type: "initial",
      priority: PRIORITY.INITIAL,
      sessionFile: "/test/session2.jsonl",
    });
    db.close();

    // Get status
    const status = getQueueStatus(configPath);

    expect(status.stats.pending).toBe(2);
    expect(status.pendingJobs).toHaveLength(2);
  });
});

describe("queueAnalysis", () => {
  let tempDir: string;
  let configPath: string;
  let sessionFile: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "pi-brain-cli-test-"));
    configPath = path.join(tempDir, "config.yaml");
    sessionFile = path.join(tempDir, "test-session.jsonl");

    // Create a minimal config file
    const config = `
hub:
  sessions_dir: ${path.join(tempDir, "sessions")}
  database_dir: ${tempDir}
  web_ui_port: 8765
daemon:
  prompt_file: ${path.join(tempDir, "prompts", "session-analyzer.md")}
`;
    fs.writeFileSync(configPath, config);
    fs.mkdirSync(path.join(tempDir, "sessions"));
    fs.mkdirSync(path.join(tempDir, "prompts"));
    fs.writeFileSync(
      path.join(tempDir, "prompts", "session-analyzer.md"),
      "# Test prompt"
    );

    // Create a test session file
    fs.writeFileSync(
      sessionFile,
      '{"type":"session","id":"test"}\n{"type":"message","role":"user"}\n'
    );
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("should fail if session file does not exist", () => {
    const result = queueAnalysis("/nonexistent/session.jsonl", configPath);

    expect(result.success).toBeFalsy();
    expect(result.message).toContain("not found");
  });

  it("should fail if file is not a jsonl file", () => {
    const txtFile = path.join(tempDir, "test.txt");
    fs.writeFileSync(txtFile, "test");

    const result = queueAnalysis(txtFile, configPath);

    expect(result.success).toBeFalsy();
    expect(result.message).toContain(".jsonl");
  });

  it("should queue analysis for valid session file", () => {
    const result = queueAnalysis(sessionFile, configPath);

    expect(result.success).toBeTruthy();
    expect(result.message).toContain("queued");
    expect(result.jobId).toBeDefined();
  });

  it("should not queue duplicate analysis", () => {
    // Queue once
    queueAnalysis(sessionFile, configPath);

    // Try to queue again
    const result = queueAnalysis(sessionFile, configPath);

    expect(result.success).toBeFalsy();
    expect(result.message).toContain("already queued");
  });
});

describe("formatDaemonStatus", () => {
  it("should format running status", () => {
    const status: DaemonStatus = {
      running: true,
      pid: 12_345,
      uptime: 3600,
      uptimeFormatted: "1h",
      configPath: "/home/user/.pi-brain/config.yaml",
    };

    const output = formatDaemonStatus(status);

    expect(output).toContain("Daemon Status");
    expect(output).toContain("running");
    expect(output).toContain("12345");
    expect(output).toContain("1h");
    expect(output).toContain("config.yaml");
  });

  it("should format stopped status", () => {
    const status: DaemonStatus = {
      running: false,
      pid: null,
      uptime: null,
      uptimeFormatted: null,
      configPath: "/home/user/.pi-brain/config.yaml",
    };

    const output = formatDaemonStatus(status);

    expect(output).toContain("stopped");
    expect(output).not.toContain("PID");
    expect(output).not.toContain("Uptime");
  });
});

describe("formatQueueStatus", () => {
  it("should format empty queue", () => {
    const status: QueueStatus = {
      stats: {
        pending: 0,
        running: 0,
        completed: 0,
        failed: 0,
        avgDurationMinutes: null,
        total: 0,
      },
      pendingJobs: [],
      runningJobs: [],
      recentFailed: [],
    };

    const output = formatQueueStatus(status);

    expect(output).toContain("Analysis Queue");
    expect(output).toContain("0 pending");
    expect(output).toContain("0 running");
  });

  it("should format queue with jobs", () => {
    const now = new Date().toISOString();
    const status: QueueStatus = {
      stats: {
        pending: 5,
        running: 1,
        completed: 100,
        failed: 2,
        avgDurationMinutes: 2.5,
        total: 108,
      },
      pendingJobs: [
        {
          id: "job-123456",
          type: "initial",
          priority: 100,
          sessionFile: "/very/long/path/to/session.jsonl",
          context: {},
          status: "pending",
          queuedAt: now,
          retryCount: 0,
          maxRetries: 3,
        },
      ],
      runningJobs: [],
      recentFailed: [],
    };

    const output = formatQueueStatus(status);

    expect(output).toContain("5 pending");
    expect(output).toContain("1 running");
    expect(output).toContain("100 completed");
    expect(output).toContain("2 failed");
    expect(output).toContain("2.5 min");
    expect(output).toContain("Pending:");
    expect(output).toContain("job-1234");
  });
});

describe("formatHealthStatus", () => {
  it("should format healthy status", () => {
    const status: HealthStatus = {
      healthy: true,
      warnings: 0,
      results: [
        {
          check: "pi-cli",
          passed: true,
          message: "Pi CLI found",
          fatal: false,
        },
        {
          check: "database",
          passed: true,
          message: "Database writable",
          fatal: false,
        },
      ],
    };

    const output = formatHealthStatus(status);

    expect(output).toContain("pi-brain Health Check");
    expect(output).toContain("✓");
    expect(output).toContain("Ready");
    expect(output).not.toContain("✗");
  });

  it("should format unhealthy status", () => {
    const status: HealthStatus = {
      healthy: false,
      warnings: 1,
      results: [
        { check: "pi-cli", passed: false, message: "Not found", fatal: true },
        {
          check: "optional",
          passed: false,
          message: "Not found",
          fatal: false,
        },
      ],
    };

    const output = formatHealthStatus(status);

    expect(output).toContain("✗");
    expect(output).toContain("⚠");
    expect(output).toContain("Not ready");
  });

  it("should show warnings count", () => {
    const status: HealthStatus = {
      healthy: true,
      warnings: 2,
      results: [
        { check: "required", passed: true, message: "OK", fatal: false },
        { check: "opt1", passed: false, message: "Missing", fatal: false },
        { check: "opt2", passed: false, message: "Missing", fatal: false },
      ],
    };

    const output = formatHealthStatus(status);

    expect(output).toContain("Ready");
    expect(output).toContain("2 warnings");
  });
});

// =============================================================================
// rebuildIndex tests
// =============================================================================

/**
 * Create a minimal test node for rebuild tests
 */
function createTestNode(overrides: Partial<Node> = {}): Node {
  const id = generateNodeId();
  const now = new Date().toISOString();

  return {
    id,
    version: 1,
    previousVersions: [],
    source: {
      sessionFile: "/tmp/test-session.jsonl",
      segment: {
        startEntryId: "entry1",
        endEntryId: "entry10",
        entryCount: 10,
      },
      computer: "test-host",
      sessionId: "test-session-id",
    },
    classification: {
      type: "coding",
      project: "/home/test/project",
      isNewProject: false,
      hadClearGoal: true,
    },
    content: {
      summary: "Test node summary",
      outcome: "success",
      keyDecisions: [],
      filesTouched: ["src/index.ts"],
      toolsUsed: ["read"],
      errorsSeen: [],
    },
    lessons: emptyLessons(),
    observations: emptyObservations(),
    metadata: {
      tokensUsed: 1500,
      cost: 0,
      durationMinutes: 10,
      timestamp: now,
      analyzedAt: now,
      analyzerVersion: "v1-test",
    },
    semantic: {
      tags: ["test"],
      topics: ["testing"],
    },
    daemonMeta: emptyDaemonMeta(),
    ...overrides,
  };
}

describe("rebuildIndex", () => {
  let tempDir: string;
  let configPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "pi-brain-rebuild-test-"));
    configPath = path.join(tempDir, "config.yaml");

    // Create a minimal config file
    const config = `
hub:
  sessions_dir: ${path.join(tempDir, "sessions")}
  database_dir: ${tempDir}
  web_ui_port: 8765
daemon:
  prompt_file: ${path.join(tempDir, "prompts", "session-analyzer.md")}
`;
    fs.writeFileSync(configPath, config);
    fs.mkdirSync(path.join(tempDir, "sessions"));
    fs.mkdirSync(path.join(tempDir, "prompts"));
    fs.mkdirSync(path.join(tempDir, "nodes"), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, "prompts", "session-analyzer.md"),
      "# Test prompt"
    );
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("should return success with count 0 when no node files exist", () => {
    const result = rebuildIndex(configPath);

    expect(result.success).toBeTruthy();
    expect(result.count).toBe(0);
    expect(result.message).toContain("0 nodes");
  });

  it("should rebuild index from single node file", () => {
    // Create a test node and write it to JSON
    const node = createTestNode();
    writeNode(node, { nodesDir: path.join(tempDir, "nodes") });

    // Rebuild the index
    const result = rebuildIndex(configPath);

    expect(result.success).toBeTruthy();
    expect(result.count).toBe(1);
    expect(result.message).toContain("1 nodes");

    // Verify node is in database
    const dbPath = path.join(tempDir, "brain.db");
    const db = openDatabase({ path: dbPath });
    migrate(db);

    const retrieved = getNode(db, node.id);
    expect(retrieved).not.toBeNull();
    const nodeRow = retrieved as NonNullable<typeof retrieved>;
    expect(nodeRow.id).toBe(node.id);
    expect(nodeRow.version).toBe(1);

    // Content is stored in JSON file, verify via data_file
    expect(nodeRow.data_file).toBeDefined();
    const fullNode = readNodeFromPath(nodeRow.data_file);
    expect(fullNode.content.summary).toBe("Test node summary");

    db.close();
  });

  it("should rebuild index from multiple node files", () => {
    const nodesDir = path.join(tempDir, "nodes");
    const node1 = createTestNode({
      content: { ...createTestNode().content, summary: "Node 1" },
    });
    const node2 = createTestNode({
      content: { ...createTestNode().content, summary: "Node 2" },
    });
    const node3 = createTestNode({
      content: { ...createTestNode().content, summary: "Node 3" },
    });

    writeNode(node1, { nodesDir });
    writeNode(node2, { nodesDir });
    writeNode(node3, { nodesDir });

    const result = rebuildIndex(configPath);

    expect(result.success).toBeTruthy();
    expect(result.count).toBe(3);

    // Verify all nodes are in database
    const dbPath = path.join(tempDir, "brain.db");
    const db = openDatabase({ path: dbPath });
    migrate(db);

    const listResult = listNodes(db, { limit: 10 });
    expect(listResult.nodes).toHaveLength(3);

    db.close();
  });

  it("should use latest version when multiple versions exist", () => {
    const nodesDir = path.join(tempDir, "nodes");
    const nodeId = generateNodeId();
    const now = new Date().toISOString();

    // Create version 1
    const nodeV1 = createTestNode({
      id: nodeId,
      version: 1,
      content: { ...createTestNode().content, summary: "Version 1 summary" },
      metadata: { ...createTestNode().metadata, timestamp: now },
    });

    // Create version 2 with same ID
    const nodeV2 = createTestNode({
      id: nodeId,
      version: 2,
      previousVersions: [nodeId],
      content: { ...createTestNode().content, summary: "Version 2 summary" },
      metadata: { ...createTestNode().metadata, timestamp: now },
    });

    writeNode(nodeV1, { nodesDir });
    writeNode(nodeV2, { nodesDir });

    const result = rebuildIndex(configPath);

    expect(result.success).toBeTruthy();
    expect(result.count).toBe(1); // Should only count 1 unique node

    // Verify the latest version is in database
    const dbPath = path.join(tempDir, "brain.db");
    const db = openDatabase({ path: dbPath });
    migrate(db);

    const retrieved = getNode(db, nodeId);
    expect(retrieved).not.toBeNull();
    const nodeRow = retrieved as NonNullable<typeof retrieved>;
    expect(nodeRow.version).toBe(2);

    // Verify content via JSON file
    const fullNode = readNodeFromPath(nodeRow.data_file);
    expect(fullNode.content.summary).toBe("Version 2 summary");

    db.close();
  });

  it("should clear existing data before rebuilding", () => {
    const nodesDir = path.join(tempDir, "nodes");
    const dbPath = path.join(tempDir, "brain.db");

    // Create initial node and insert directly to database
    const node1 = createTestNode({
      content: { ...createTestNode().content, summary: "Original node" },
    });
    writeNode(node1, { nodesDir });

    // First rebuild
    rebuildIndex(configPath);

    // Verify node1 is there
    let db = openDatabase({ path: dbPath });
    migrate(db);
    let listResult = listNodes(db, { limit: 10 });
    expect(listResult.nodes).toHaveLength(1);
    db.close();

    // Delete the JSON file and create a different one
    fs.rmSync(path.join(tempDir, "nodes"), { recursive: true });
    fs.mkdirSync(path.join(tempDir, "nodes"), { recursive: true });

    const node2 = createTestNode({
      content: { ...createTestNode().content, summary: "New node" },
    });
    writeNode(node2, { nodesDir });

    // Second rebuild should clear old data
    const result = rebuildIndex(configPath);
    expect(result.success).toBeTruthy();
    expect(result.count).toBe(1);

    // Verify only node2 exists now
    db = openDatabase({ path: dbPath });
    migrate(db);
    listResult = listNodes(db, { limit: 10 });
    expect(listResult.nodes).toHaveLength(1);
    expect(listResult.nodes[0].id).toBe(node2.id);

    // Verify content via JSON file
    const fullNode = readNodeFromPath(listResult.nodes[0].data_file);
    expect(fullNode.content.summary).toBe("New node");
    db.close();
  });

  it("should handle malformed JSON files gracefully", () => {
    const nodesDir = path.join(tempDir, "nodes");
    const yearMonth = new Date().toISOString().slice(0, 7).replace("-", "/");
    const badDir = path.join(nodesDir, yearMonth);
    fs.mkdirSync(badDir, { recursive: true });

    // Create a valid node
    const validNode = createTestNode();
    writeNode(validNode, { nodesDir });

    // Create a malformed JSON file with valid naming pattern
    const badFilePath = path.join(badDir, "abcd1234abcd1234-v1.json");
    fs.writeFileSync(badFilePath, "{ invalid json }");

    // Rebuild should succeed with the valid node, skipping the bad one
    const result = rebuildIndex(configPath);

    expect(result.success).toBeTruthy();
    expect(result.count).toBe(1); // Only the valid node
  });
});
