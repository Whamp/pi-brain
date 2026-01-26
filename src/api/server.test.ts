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
import { createNode } from "../storage/node-repository.js";
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
      expect(body.data.nodes[0].project).toContain("alpha");

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
});
