/**
 * Tests for signals API routes
 */

import Database from "better-sqlite3";
import Fastify, { type FastifyInstance } from "fastify";
import { describe, it, expect, beforeEach, afterEach } from "vitest";

import type { ApiConfig } from "../../config/types.js";

import { signalsRoutes } from "./signals.js";

/** Create a minimal valid API config for tests */
function createTestApiConfig(): ApiConfig {
  return {
    port: 0,
    host: "127.0.0.1",
    corsOrigins: ["http://localhost:5173"],
  };
}

describe("signalsRoutes", () => {
  let app: FastifyInstance;
  let db: Database.Database;

  beforeEach(async () => {
    // Create in-memory database
    db = new Database(":memory:");

    // Create minimal schema with signals column
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
        signals TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE model_quirks (
        id TEXT PRIMARY KEY,
        node_id TEXT,
        model TEXT,
        observation TEXT,
        frequency TEXT,
        workaround TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Set up Fastify
    app = Fastify();
    app.decorate("ctx", { db, config: createTestApiConfig() });

    // Register routes
    await app.register(signalsRoutes, { prefix: "/signals" });
  });

  afterEach(async () => {
    await app.close();
    db.close();
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
      // Insert node with signals in the database column
      const signals = JSON.stringify({
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
      });

      db.prepare(`
        INSERT INTO nodes (id, session_file, project, timestamp, outcome, data_file, signals)
        VALUES ('node-1', '/path/to/session.jsonl', '/home/user/project', '2026-01-27T10:00:00Z', 'abandoned', '/path/to/node-1.json', ?)
      `).run(signals);

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
        abandonedProject: "/home/user/project",
        frictionScore: 0.65,
      });
    });

    it("should respect limit parameter", async () => {
      const signals = JSON.stringify({
        friction: { abandonedRestart: true, score: 0.5 },
        delight: {},
        manualFlags: [],
      });

      // Insert multiple nodes with abandoned restart signals
      for (let i = 1; i <= 5; i++) {
        db.prepare(`
          INSERT INTO nodes (id, session_file, project, timestamp, outcome, data_file, signals)
          VALUES (?, ?, '/home/user/project', ?, 'abandoned', ?, ?)
        `).run(
          `node-${i}`,
          "/path/session.jsonl",
          `2026-01-27T10:0${i}:00Z`,
          `/path/node-${i}.json`,
          signals
        );
      }

      const response = await app.inject({
        method: "GET",
        url: "/signals/abandoned-restarts?limit=3",
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.patterns).toHaveLength(3);
      expect(body.data.total).toBe(5);
    });

    it("should only return nodes with abandonedRestart=true", async () => {
      // Insert node without abandonedRestart signal
      const noRestartSignals = JSON.stringify({
        friction: { abandonedRestart: false, score: 0.3 },
        delight: {},
        manualFlags: [],
      });

      // Insert node with abandonedRestart signal
      const restartSignals = JSON.stringify({
        friction: { abandonedRestart: true, score: 0.6 },
        delight: {},
        manualFlags: [],
      });

      db.prepare(`
        INSERT INTO nodes (id, session_file, project, timestamp, outcome, data_file, signals)
        VALUES ('node-no-restart', '/path/session.jsonl', 'project', '2026-01-27T10:00:00Z', 'abandoned', '/path/node.json', ?)
      `).run(noRestartSignals);

      db.prepare(`
        INSERT INTO nodes (id, session_file, project, timestamp, outcome, data_file, signals)
        VALUES ('node-with-restart', '/path/session.jsonl', 'project', '2026-01-27T11:00:00Z', 'abandoned', '/path/node2.json', ?)
      `).run(restartSignals);

      const response = await app.inject({
        method: "GET",
        url: "/signals/abandoned-restarts",
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.patterns).toHaveLength(1);
      expect(body.data.patterns[0].abandonedNodeId).toBe("node-with-restart");
    });
  });

  describe("gET /signals/friction-summary", () => {
    it("should return zeros when no nodes exist", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/signals/friction-summary",
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.status).toBe("success");
      expect(body.data.highFrictionCount).toBe(0);
      expect(body.data.abandonedRestartCount).toBe(0);
      expect(body.data.rephrasingCascadeCount).toBe(0);
      expect(body.data.toolLoopCount).toBe(0);
      expect(body.data.contextChurnCount).toBe(0);
    });

    it("should count high friction nodes correctly", async () => {
      const now = new Date().toISOString();

      // High friction node
      const highFrictionSignals = JSON.stringify({
        friction: {
          score: 0.75,
          rephrasingCount: 3,
          toolLoopCount: 2,
          contextChurnCount: 1,
          abandonedRestart: false,
        },
        delight: {},
        manualFlags: [],
      });

      // Low friction node
      const lowFrictionSignals = JSON.stringify({
        friction: {
          score: 0.2,
          rephrasingCount: 0,
          toolLoopCount: 0,
          contextChurnCount: 0,
        },
        delight: {},
        manualFlags: [],
      });

      db.prepare(`
        INSERT INTO nodes (id, session_file, project, timestamp, outcome, data_file, signals)
        VALUES ('high-friction', '/path/session.jsonl', 'project', ?, 'success', '/path/node.json', ?)
      `).run(now, highFrictionSignals);

      db.prepare(`
        INSERT INTO nodes (id, session_file, project, timestamp, outcome, data_file, signals)
        VALUES ('low-friction', '/path/session.jsonl', 'project', ?, 'success', '/path/node2.json', ?)
      `).run(now, lowFrictionSignals);

      const response = await app.inject({
        method: "GET",
        url: "/signals/friction-summary",
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.highFrictionCount).toBe(1);
      expect(body.data.rephrasingCascadeCount).toBe(3);
      expect(body.data.toolLoopCount).toBe(2);
      expect(body.data.contextChurnCount).toBe(1);
    });

    it("should exclude old nodes (older than 30 days)", async () => {
      const now = new Date();
      const oldDate = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000); // 45 days ago

      const signals = JSON.stringify({
        friction: {
          score: 0.8,
          rephrasingCount: 5,
          toolLoopCount: 3,
          contextChurnCount: 2,
        },
        delight: {},
        manualFlags: [],
      });

      // Insert old node
      db.prepare(`
        INSERT INTO nodes (id, session_file, project, timestamp, outcome, data_file, signals)
        VALUES ('old-node', '/path/session.jsonl', 'project', ?, 'success', '/path/node.json', ?)
      `).run(oldDate.toISOString(), signals);

      const response = await app.inject({
        method: "GET",
        url: "/signals/friction-summary",
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      // Old nodes should be excluded from count
      expect(body.data.highFrictionCount).toBe(0);
      expect(body.data.rephrasingCascadeCount).toBe(0);
    });
  });
});
