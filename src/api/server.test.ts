/**
 * API server tests
 */

import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { ApiConfig } from "../config/types.js";
import type { Node } from "../storage/node-types.js";

import { openDatabase, migrate } from "../storage/database.js";
import { createNode } from "../storage/node-crud.js";
import { createServer } from "./server.js";

// =============================================================================
// Test Helpers
// =============================================================================

function createTempDir(): string {
  const dir = join(tmpdir(), `pi-brain-api-test-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function cleanupTempDir(dir: string): void {
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
  }
}

function createTestApiConfig(): ApiConfig {
  return {
    port: 0, // Random port
    host: "127.0.0.1",
    corsOrigins: ["http://localhost:5173"],
  };
}

function createTestNode(overrides: Partial<Node> = {}): Node {
  return {
    id: `node-${Date.now()}`,
    version: 1,
    previousVersions: [],
    source: {
      sessionFile: "/test/session.jsonl",
      segment: {
        startEntryId: "entry-1",
        endEntryId: "entry-10",
        entryCount: 10,
      },
      sessionId: "session-1",
      computer: "test-computer",
    },
    classification: {
      type: "coding",
      project: "/test/project",
      isNewProject: false,
      hadClearGoal: true,
      language: "typescript",
      frameworks: [],
    },
    content: {
      summary: "Test node summary",
      outcome: "success",
      keyDecisions: [],
      filesTouched: [],
      toolsUsed: [],
      errorsSeen: [],
    },
    lessons: {
      project: [],
      task: [],
      user: [],
      model: [],
      tool: [],
      skill: [],
      subagent: [],
    },
    observations: {
      modelsUsed: [],
      promptingWins: [],
      promptingFailures: [],
      modelQuirks: [],
      toolUseErrors: [],
    },
    metadata: {
      tokensUsed: 1000,
      cost: 0.01,
      durationMinutes: 5,
      timestamp: new Date().toISOString(),
      analyzedAt: new Date().toISOString(),
      analyzerVersion: "1.0.0",
    },
    semantic: {
      tags: ["test"],
      topics: ["testing"],
      relatedProjects: [],
      concepts: [],
    },
    daemonMeta: {
      decisions: [],
      rlmUsed: false,
      codemapAvailable: false,
      analysisLog: "",
      segmentTokenCount: 500,
    },
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("aPI Server", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
    mkdirSync(join(tempDir, "nodes", "2026", "01"), { recursive: true });
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  describe("createServer", () => {
    it("should create a Fastify server instance", async () => {
      const db = openDatabase({ path: ":memory:" });
      migrate(db);
      const config = createTestApiConfig();

      const app = await createServer(db, config);

      expect(app).toBeDefined();
      expect(app.server).toBeDefined();

      await app.close();
      db.close();
    });

    it("should have health check endpoint", async () => {
      const db = openDatabase({ path: ":memory:" });
      migrate(db);
      const config = createTestApiConfig();

      const app = await createServer(db, config);

      const response = await app.inject({
        method: "GET",
        url: "/health",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("ok");
      expect(body.timestamp).toBeDefined();

      await app.close();
      db.close();
    });

    it("should register WebSocket route when manager provided", async () => {
      const db = openDatabase({ path: ":memory:" });
      migrate(db);
      const config = createTestApiConfig();

      // Import WebSocketManager
      const { WebSocketManager } = await import("./websocket.js");
      const wsManager = new WebSocketManager();

      const app = await createServer(db, config, undefined, wsManager);

      // Check that the /ws route exists by looking at routes
      // Routes are printed without leading slash in Fastify
      const routes = app.printRoutes();
      expect(routes).toContain("ws (GET");

      await app.close();
      db.close();
    });
  });

  describe("gET /api/v1/nodes", () => {
    it("should return empty list when no nodes", async () => {
      const db = openDatabase({ path: ":memory:" });
      migrate(db);
      const config = createTestApiConfig();

      const app = await createServer(db, config);

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/nodes",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("success");
      expect(body.data.nodes).toStrictEqual([]);
      expect(body.data.total).toBe(0);

      await app.close();
      db.close();
    });

    it("should return nodes when they exist", async () => {
      const db = openDatabase({ path: ":memory:" });
      migrate(db);
      const config = createTestApiConfig();

      // Create a test node
      const node = createTestNode();
      const nodeFile = join(
        tempDir,
        "nodes",
        "2026",
        "01",
        `${node.id}-v1.json`
      );
      writeFileSync(nodeFile, JSON.stringify(node));
      createNode(db, node, { nodesDir: join(tempDir, "nodes") });

      const app = await createServer(db, config);

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/nodes",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("success");
      expect(body.data.nodes).toHaveLength(1);
      expect(body.data.total).toBe(1);

      await app.close();
      db.close();
    });

    it("should filter nodes by project", async () => {
      const db = openDatabase({ path: ":memory:" });
      migrate(db);
      const config = createTestApiConfig();

      // Create nodes with different projects
      const node1 = createTestNode({
        id: "node-1",
        classification: {
          type: "coding",
          project: "/project/alpha",
          isNewProject: false,
          hadClearGoal: true,
          language: "typescript",
          frameworks: [],
        },
      });
      const node2 = createTestNode({
        id: "node-2",
        classification: {
          type: "coding",
          project: "/project/beta",
          isNewProject: false,
          hadClearGoal: true,
          language: "typescript",
          frameworks: [],
        },
      });

      createNode(db, node1, { nodesDir: join(tempDir, "nodes") });
      createNode(db, node2, { nodesDir: join(tempDir, "nodes") });

      const app = await createServer(db, config);

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/nodes?project=alpha",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.nodes).toHaveLength(1);
      expect(body.data.nodes[0].classification.project).toContain("alpha");

      await app.close();
      db.close();
    });
  });

  describe("gET /api/v1/nodes/:id", () => {
    it("should return 404 for non-existent node", async () => {
      const db = openDatabase({ path: ":memory:" });
      migrate(db);
      const config = createTestApiConfig();

      const app = await createServer(db, config);

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/nodes/non-existent-id",
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("error");
      expect(body.error.code).toBe("NOT_FOUND");

      await app.close();
      db.close();
    });

    it("should return node when it exists", async () => {
      const db = openDatabase({ path: ":memory:" });
      migrate(db);
      const config = createTestApiConfig();

      const node = createTestNode({ id: "test-node-123" });
      createNode(db, node, { nodesDir: join(tempDir, "nodes") });

      const app = await createServer(db, config);

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/nodes/test-node-123",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("success");
      expect(body.data.node).toBeDefined();
      expect(body.data.node.id).toBe("test-node-123");

      await app.close();
      db.close();
    });
  });

  describe("gET /api/v1/stats", () => {
    it("should return dashboard statistics", async () => {
      const db = openDatabase({ path: ":memory:" });
      migrate(db);
      const config = createTestApiConfig();

      const app = await createServer(db, config);

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/stats",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("success");
      expect(body.data.totals).toBeDefined();
      expect(body.data.totals.nodes).toBe(0);
      expect(body.data.outcomes).toBeDefined();
      expect(body.data.trends).toBeDefined();

      await app.close();
      db.close();
    });

    it("should return context window usage statistics", async () => {
      const tempDir = createTempDir();
      const db = openDatabase({ path: ":memory:" });
      migrate(db);
      const config = createTestApiConfig();
      const nodesDir = join(tempDir, "nodes");

      // Create nodes with varying token usage
      // 128K context window is the default
      const highUsageNode = createTestNode({
        id: "high-usage",
        metadata: {
          tokensUsed: 100_000, // ~78% of 128K
          cost: 0.1,
          durationMinutes: 30,
          timestamp: new Date().toISOString(),
          analyzedAt: new Date().toISOString(),
          analyzerVersion: "1.0.0",
        },
      });

      const mediumUsageNode = createTestNode({
        id: "medium-usage",
        metadata: {
          tokensUsed: 70_000, // ~55% of 128K
          cost: 0.07,
          durationMinutes: 20,
          timestamp: new Date().toISOString(),
          analyzedAt: new Date().toISOString(),
          analyzerVersion: "1.0.0",
        },
      });

      const lowUsageNode = createTestNode({
        id: "low-usage",
        metadata: {
          tokensUsed: 20_000, // ~16% of 128K
          cost: 0.02,
          durationMinutes: 10,
          timestamp: new Date().toISOString(),
          analyzedAt: new Date().toISOString(),
          analyzerVersion: "1.0.0",
        },
      });

      createNode(db, highUsageNode, { nodesDir });
      createNode(db, mediumUsageNode, { nodesDir });
      createNode(db, lowUsageNode, { nodesDir });

      const app = await createServer(db, config);

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/stats",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("success");
      expect(body.data.contextWindowUsage).toBeDefined();

      const usage = body.data.contextWindowUsage;
      expect(usage.nodesWithData).toBe(3);
      expect(usage.defaultContextWindowSize).toBe(128_000);
      // One node at 100K > 75% (96K), one at 70K > 50% (64K)
      expect(usage.exceeds75PercentCount).toBe(1);
      expect(usage.exceeds50PercentCount).toBe(2); // Both 100K and 70K exceed 50%
      // Average: (100K + 70K + 20K) / 3 / 128K = 190K / 3 / 128K ≈ 0.495
      expect(usage.averageUsagePercent).toBeCloseTo(0.495, 2);

      await app.close();
      db.close();
      cleanupTempDir(tempDir);
    });
  });

  describe("gET /api/v1/search", () => {
    it("should return search results", async () => {
      const db = openDatabase({ path: ":memory:" });
      migrate(db);
      const config = createTestApiConfig();

      const app = await createServer(db, config);

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/search?q=test",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("success");
      expect(body.data.results).toBeDefined();
      expect(body.data.total).toBeDefined();

      await app.close();
      db.close();
    });
  });

  describe("gET /api/v1/daemon/status", () => {
    it("should return daemon status", async () => {
      const db = openDatabase({ path: ":memory:" });
      migrate(db);
      const config = createTestApiConfig();

      const app = await createServer(db, config);

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/daemon/status",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("success");
      expect(body.data.running).toBeDefined();

      await app.close();
      db.close();
    });
  });

  describe("response format", () => {
    it("should include meta with timestamp and duration", async () => {
      const db = openDatabase({ path: ":memory:" });
      migrate(db);
      const config = createTestApiConfig();

      const app = await createServer(db, config);

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/nodes",
      });

      const body = JSON.parse(response.body);
      expect(body.meta).toBeDefined();
      expect(body.meta.timestamp).toBeDefined();
      expect(body.meta.duration_ms).toBeGreaterThanOrEqual(0);

      await app.close();
      db.close();
    });
  });

  describe("sessions API", () => {
    it("should list projects when nodes exist", async () => {
      const db = openDatabase({ path: ":memory:" });
      migrate(db);
      const config = createTestApiConfig();

      // Create nodes in different projects
      const node1 = createTestNode({
        id: "node-1",
        classification: {
          type: "coding",
          project: "/home/will/project-alpha",
          isNewProject: false,
          hadClearGoal: true,
          language: "typescript",
          frameworks: [],
        },
        source: {
          sessionFile: "/sessions/session-1.jsonl",
          segment: { startEntryId: "e1", endEntryId: "e2", entryCount: 2 },
          sessionId: "s1",
          computer: "test",
        },
      });
      const node2 = createTestNode({
        id: "node-2",
        classification: {
          type: "debugging",
          project: "/home/will/project-beta",
          isNewProject: false,
          hadClearGoal: true,
          language: "typescript",
          frameworks: [],
        },
        source: {
          sessionFile: "/sessions/session-2.jsonl",
          segment: { startEntryId: "e1", endEntryId: "e2", entryCount: 2 },
          sessionId: "s2",
          computer: "test",
        },
      });

      createNode(db, node1, { nodesDir: join(tempDir, "nodes") });
      createNode(db, node2, { nodesDir: join(tempDir, "nodes") });

      const app = await createServer(db, config);

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/sessions/projects",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("success");
      expect(body.data.projects).toHaveLength(2);
      expect(body.data.total).toBe(2);

      // Check project summaries have expected fields
      const [project] = body.data.projects;
      expect(project.project).toBeDefined();
      expect(project.sessionCount).toBeDefined();
      expect(project.nodeCount).toBeDefined();
      expect(project.lastActivity).toBeDefined();

      await app.close();
      db.close();
    });

    it("should return empty projects list when no nodes", async () => {
      const db = openDatabase({ path: ":memory:" });
      migrate(db);
      const config = createTestApiConfig();

      const app = await createServer(db, config);

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/sessions/projects",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("success");
      expect(body.data.projects).toHaveLength(0);
      expect(body.data.total).toBe(0);

      await app.close();
      db.close();
    });

    it("should list sessions by project", async () => {
      const db = openDatabase({ path: ":memory:" });
      migrate(db);
      const config = createTestApiConfig();

      // Create nodes in the same project with different sessions
      const node1 = createTestNode({
        id: "node-1",
        classification: {
          type: "coding",
          project: "/home/will/project-alpha",
          isNewProject: false,
          hadClearGoal: true,
          language: "typescript",
          frameworks: [],
        },
        source: {
          sessionFile: "/sessions/session-1.jsonl",
          segment: { startEntryId: "e1", endEntryId: "e2", entryCount: 2 },
          sessionId: "s1",
          computer: "test",
        },
        content: {
          summary: "Test summary 1",
          outcome: "success",
          keyDecisions: [],
          filesTouched: [],
          toolsUsed: [],
          errorsSeen: [],
        },
      });
      const node2 = createTestNode({
        id: "node-2",
        classification: {
          type: "debugging",
          project: "/home/will/project-alpha",
          isNewProject: false,
          hadClearGoal: true,
          language: "typescript",
          frameworks: [],
        },
        source: {
          sessionFile: "/sessions/session-2.jsonl",
          segment: { startEntryId: "e1", endEntryId: "e2", entryCount: 2 },
          sessionId: "s2",
          computer: "test",
        },
        content: {
          summary: "Test summary 2",
          outcome: "partial",
          keyDecisions: [],
          filesTouched: [],
          toolsUsed: [],
          errorsSeen: [],
        },
      });

      createNode(db, node1, { nodesDir: join(tempDir, "nodes") });
      createNode(db, node2, { nodesDir: join(tempDir, "nodes") });

      const app = await createServer(db, config);

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/sessions/list?project=/home/will/project-alpha",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("success");
      expect(body.data.project).toBe("/home/will/project-alpha");
      expect(body.data.sessions).toHaveLength(2);
      expect(body.data.total).toBe(2);

      // Check session summaries have expected fields
      const [session] = body.data.sessions;
      expect(session.sessionFile).toBeDefined();
      expect(session.nodeCount).toBeDefined();
      expect(session.firstTimestamp).toBeDefined();
      expect(session.lastTimestamp).toBeDefined();
      expect(session.outcomes).toBeDefined();
      expect(session.types).toBeDefined();

      await app.close();
      db.close();
    });

    it("should return 404 for non-existent project", async () => {
      const db = openDatabase({ path: ":memory:" });
      migrate(db);
      const config = createTestApiConfig();

      const app = await createServer(db, config);

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/sessions/list?project=/home/will/non-existent",
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("error");
      expect(body.error.code).toBe("NOT_FOUND");

      await app.close();
      db.close();
    });

    it("should list nodes by session file", async () => {
      const db = openDatabase({ path: ":memory:" });
      migrate(db);
      const config = createTestApiConfig();

      const sessionFile = "/sessions/test-session.jsonl";
      const node1 = createTestNode({
        id: "node-1",
        source: {
          sessionFile,
          segment: { startEntryId: "e1", endEntryId: "e5", entryCount: 5 },
          sessionId: "s1",
          computer: "test",
        },
      });
      const node2 = createTestNode({
        id: "node-2",
        source: {
          sessionFile,
          segment: { startEntryId: "e6", endEntryId: "e10", entryCount: 5 },
          sessionId: "s1",
          computer: "test",
        },
      });

      createNode(db, node1, { nodesDir: join(tempDir, "nodes") });
      createNode(db, node2, { nodesDir: join(tempDir, "nodes") });

      const app = await createServer(db, config);

      const response = await app.inject({
        method: "GET",
        url: `/api/v1/sessions/nodes?sessionFile=${encodeURIComponent(sessionFile)}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("success");
      expect(body.data.sessionFile).toBe(sessionFile);
      expect(body.data.nodes).toHaveLength(2);
      expect(body.data.total).toBe(2);

      await app.close();
      db.close();
    });

    it("should return 400 when sessionFile param missing", async () => {
      const db = openDatabase({ path: ":memory:" });
      migrate(db);
      const config = createTestApiConfig();

      const app = await createServer(db, config);

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/sessions/nodes",
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("error");
      expect(body.error.code).toBe("BAD_REQUEST");

      await app.close();
      db.close();
    });
  });
});
