/**
 * Tests for signals API routes
 */

import Database from "better-sqlite3";
import Fastify, { type FastifyInstance } from "fastify";
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  type MockInstance,
} from "vitest";

import type { Node } from "../../types/index.js";

import * as nodeStorage from "../../storage/node-storage.js";
import { signalsRoutes } from "./signals.js";

describe("signalsRoutes", () => {
  let app: FastifyInstance;
  let db: Database.Database;
  let readNodeSpy: MockInstance;

  beforeEach(async () => {
    // Create in-memory database
    db = new Database(":memory:");

    // Create minimal schema
    db.exec(`
      CREATE TABLE nodes (
        id TEXT PRIMARY KEY,
        version INTEGER DEFAULT 1,
        session_file TEXT,
        segment_start TEXT,
        segment_end TEXT,
        computer TEXT,
        type TEXT,
        project TEXT,
        is_new_project INTEGER DEFAULT 0,
        had_clear_goal INTEGER DEFAULT 1,
        outcome TEXT,
        tokens_used INTEGER DEFAULT 0,
        cost REAL DEFAULT 0,
        duration_minutes INTEGER DEFAULT 0,
        timestamp TEXT,
        analyzed_at TEXT,
        analyzer_version TEXT,
        data_file TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Set up Fastify
    app = Fastify();
    app.decorate("ctx", { db, config: {} });

    // Register routes
    await app.register(signalsRoutes, { prefix: "/signals" });

    // Mock readNodeFromPath
    readNodeSpy = vi.spyOn(nodeStorage, "readNodeFromPath");
  });

  afterEach(async () => {
    await app.close();
    db.close();
    vi.restoreAllMocks();
  });

  describe("gET /signals/abandoned-restarts", () => {
    it("should return empty array when no abandoned nodes exist", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/signals/abandoned-restarts",
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.status).toBe("success");
      expect(body.data.patterns).toStrictEqual([]);
      expect(body.data.total).toBe(0);
    });

    it("should return abandoned restart patterns when they exist", async () => {
      // Insert abandoned node
      db.prepare(`
        INSERT INTO nodes (id, session_file, project, timestamp, outcome, data_file)
        VALUES ('node-1', '/path/to/session.jsonl', '/home/user/project', '2026-01-27T10:00:00Z', 'abandoned', '/path/to/node-1.json')
      `).run();

      // Mock the node read
      readNodeSpy.mockReturnValue({
        id: "node-1",
        content: {
          summary: "Working on auth feature",
          outcome: "abandoned",
          filesTouched: ["src/auth.ts", "src/login.ts"],
        },
        classification: {
          project: "/home/user/project",
        },
        metadata: {
          timestamp: "2026-01-27T10:00:00Z",
        },
        observations: {
          modelsUsed: [{ model: "claude-3-sonnet" }],
        },
        signals: {
          friction: {
            abandonedRestart: true,
            score: 0.65,
            rephrasingCount: 2,
            toolLoopCount: 1,
            contextChurnCount: 0,
            silentTermination: false,
          },
          delight: {
            score: 0,
            resilientRecovery: false,
            oneShotSuccess: false,
            explicitPraise: false,
          },
          manualFlags: [],
        },
      } as unknown as Node);

      const response = await app.inject({
        method: "GET",
        url: "/signals/abandoned-restarts",
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.status).toBe("success");
      expect(body.data.patterns).toHaveLength(1);
      expect(body.data.patterns[0]).toMatchObject({
        abandonedNodeId: "node-1",
        abandonedSummary: "Working on auth feature",
        abandonedProject: "/home/user/project",
        frictionScore: 0.65,
      });
    });

    it("should respect limit parameter", async () => {
      // Insert multiple abandoned nodes
      for (let i = 1; i <= 5; i++) {
        db.prepare(`
          INSERT INTO nodes (id, session_file, project, timestamp, outcome, data_file)
          VALUES (?, ?, '/home/user/project', ?, 'abandoned', ?)
        `).run(
          `node-${i}`,
          "/path/session.jsonl",
          `2026-01-27T10:0${i}:00Z`,
          `/path/node-${i}.json`
        );
      }

      readNodeSpy.mockReturnValue({
        content: { summary: "Test summary", filesTouched: [] },
        classification: { project: "/home/user/project" },
        metadata: { timestamp: "2026-01-27T10:00:00Z" },
        observations: { modelsUsed: [] },
        signals: {
          friction: { abandonedRestart: true, score: 0.5 },
          delight: {},
          manualFlags: [],
        },
      } as unknown as Node);

      const response = await app.inject({
        method: "GET",
        url: "/signals/abandoned-restarts?limit=2",
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.patterns.length).toBeLessThanOrEqual(2);
      expect(body.data.limit).toBe(2);
    });

    it("should filter out nodes without abandonedRestart signal", async () => {
      // Insert abandoned node without abandonedRestart signal
      db.prepare(`
        INSERT INTO nodes (id, session_file, project, timestamp, outcome, data_file)
        VALUES ('node-1', '/path/to/session.jsonl', '/home/user/project', '2026-01-27T10:00:00Z', 'abandoned', '/path/to/node-1.json')
      `).run();

      readNodeSpy.mockReturnValue({
        content: { summary: "Test summary", filesTouched: [] },
        classification: { project: "/home/user/project" },
        metadata: { timestamp: "2026-01-27T10:00:00Z" },
        signals: {
          friction: { abandonedRestart: false, score: 0.2 }, // Not an abandoned restart
          delight: {},
          manualFlags: [],
        },
      } as unknown as Node);

      const response = await app.inject({
        method: "GET",
        url: "/signals/abandoned-restarts",
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.patterns).toStrictEqual([]);
    });
  });

  describe("gET /signals/friction-summary", () => {
    it("should return zero counts when no nodes exist", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/signals/friction-summary",
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.status).toBe("success");
      expect(body.data).toMatchObject({
        highFrictionCount: 0,
        abandonedRestartCount: 0,
        rephrasingCascadeCount: 0,
        toolLoopCount: 0,
        contextChurnCount: 0,
        modelFriction: [],
      });
    });

    it("should aggregate friction signals from recent nodes", async () => {
      // Insert recent node
      const recentTimestamp = new Date().toISOString();
      db.prepare(`
        INSERT INTO nodes (id, session_file, project, timestamp, outcome, data_file)
        VALUES ('node-1', '/path/to/session.jsonl', '/home/user/project', ?, 'partial', '/path/to/node-1.json')
      `).run(recentTimestamp);

      readNodeSpy.mockReturnValue({
        content: { summary: "Test summary", filesTouched: [] },
        classification: { project: "/home/user/project" },
        metadata: { timestamp: recentTimestamp },
        observations: {
          modelsUsed: [{ model: "claude-3-sonnet" }],
        },
        signals: {
          friction: {
            score: 0.6, // High friction
            abandonedRestart: true,
            rephrasingCount: 3,
            toolLoopCount: 2,
            contextChurnCount: 1,
            silentTermination: false,
          },
          delight: {},
          manualFlags: [],
        },
      } as unknown as Node);

      const response = await app.inject({
        method: "GET",
        url: "/signals/friction-summary",
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.highFrictionCount).toBe(1);
      expect(body.data.abandonedRestartCount).toBe(1);
      expect(body.data.rephrasingCascadeCount).toBe(3);
      expect(body.data.toolLoopCount).toBe(2);
      expect(body.data.contextChurnCount).toBe(1);
      expect(body.data.modelFriction).toHaveLength(1);
      expect(body.data.modelFriction[0].model).toBe("claude-3-sonnet");
    });

    it("should exclude old nodes (older than 30 days)", async () => {
      // Insert old node (40 days ago)
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 40);
      db.prepare(`
        INSERT INTO nodes (id, session_file, project, timestamp, outcome, data_file)
        VALUES ('node-1', '/path/to/session.jsonl', '/home/user/project', ?, 'partial', '/path/to/node-1.json')
      `).run(oldDate.toISOString());

      // This shouldn't be called since node is too old
      readNodeSpy.mockReturnValue({
        signals: {
          friction: { score: 0.8, abandonedRestart: true },
        },
      } as unknown as Node);

      const response = await app.inject({
        method: "GET",
        url: "/signals/friction-summary",
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      // Old nodes should be excluded from count
      expect(body.data.abandonedRestartCount).toBe(0);
    });
  });
});
