/**
 * Tests for InsightAggregator
 */

import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Node } from "../types/index.js";

import { InsightAggregator } from "./insight-aggregation.js";

// =============================================================================
// Test Setup
// =============================================================================

function createTestDb(): Database.Database {
  const db = new Database(":memory:");

  // Create necessary tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS model_quirks (
      id TEXT PRIMARY KEY,
      node_id TEXT NOT NULL,
      model TEXT NOT NULL,
      observation TEXT NOT NULL,
      frequency TEXT,
      workaround TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tool_errors (
      id TEXT PRIMARY KEY,
      node_id TEXT NOT NULL,
      tool TEXT NOT NULL,
      error_type TEXT NOT NULL,
      context TEXT,
      model TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS lessons (
      id TEXT PRIMARY KEY,
      node_id TEXT NOT NULL,
      level TEXT NOT NULL,
      summary TEXT NOT NULL,
      details TEXT,
      confidence TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS nodes (
      id TEXT PRIMARY KEY,
      version INTEGER NOT NULL DEFAULT 1,
      session_file TEXT NOT NULL,
      segment_start TEXT,
      segment_end TEXT,
      computer TEXT,
      type TEXT,
      project TEXT,
      is_new_project INTEGER DEFAULT 0,
      had_clear_goal INTEGER DEFAULT 1,
      outcome TEXT,
      tokens_used INTEGER DEFAULT 0,
      cost REAL DEFAULT 0.0,
      duration_minutes INTEGER DEFAULT 0,
      timestamp TEXT NOT NULL,
      analyzed_at TEXT NOT NULL,
      analyzer_version TEXT,
      data_file TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS aggregated_insights (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      model TEXT,
      tool TEXT,
      pattern TEXT NOT NULL,
      frequency INTEGER DEFAULT 1,
      confidence REAL DEFAULT 0.5,
      severity TEXT DEFAULT 'low',
      workaround TEXT,
      examples TEXT,
      first_seen TEXT,
      last_seen TEXT,
      prompt_text TEXT,
      prompt_included INTEGER DEFAULT 0,
      prompt_version TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  return db;
}

function createTestNode(overrides: Partial<Node> = {}): Node {
  const now = new Date().toISOString();
  return {
    id: randomUUID().replaceAll("-", "").slice(0, 16),
    version: 1,
    previousVersions: [],
    source: {
      sessionFile: "/test/session.jsonl",
      segment: { startEntryId: "a", endEntryId: "b", entryCount: 10 },
      computer: "test",
      sessionId: "test-session",
    },
    classification: {
      type: "coding",
      project: "/test/project",
      isNewProject: false,
      hadClearGoal: true,
    },
    content: {
      summary: "Test node",
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
      modelsUsed: [
        {
          provider: "anthropic",
          model: "claude-sonnet-4-20250514",
          tokensInput: 1000,
          tokensOutput: 500,
          cost: 0.01,
        },
      ],
      promptingWins: [],
      promptingFailures: [],
      modelQuirks: [],
      toolUseErrors: [],
    },
    metadata: {
      tokensUsed: 1500,
      cost: 0.01,
      durationMinutes: 5,
      timestamp: now,
      analyzedAt: now,
      analyzerVersion: "v1",
    },
    semantic: { tags: [], topics: [] },
    daemonMeta: { decisions: [], rlmUsed: false },
    ...overrides,
  };
}

let tempDir: string;

// =============================================================================
// Tests
// =============================================================================

describe("insightAggregator", () => {
  beforeEach(() => {
    tempDir = join(tmpdir(), `insight-test-${randomUUID()}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe("aggregateAll", () => {
    it("should aggregate model quirks", () => {
      const db = createTestDb();
      const aggregator = new InsightAggregator(db);

      // Insert test quirks
      db.prepare(`
        INSERT INTO model_quirks (id, node_id, model, observation, frequency, workaround, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        "q1",
        "node1",
        "anthropic/claude-sonnet-4-20250514",
        "Uses sed instead of read tool",
        "often",
        "Remind to use read tool",
        "2026-01-01T00:00:00Z"
      );

      db.prepare(`
        INSERT INTO model_quirks (id, node_id, model, observation, frequency, workaround, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        "q2",
        "node2",
        "anthropic/claude-sonnet-4-20250514",
        "Uses sed instead of read tool",
        "always",
        null,
        "2026-01-02T00:00:00Z"
      );

      aggregator.aggregateAll();

      // Check insights were created
      const insights = db
        .prepare("SELECT * FROM aggregated_insights WHERE type = 'quirk'")
        .all() as {
        id: string;
        frequency: number;
        model: string;
        pattern: string;
        workaround: string;
      }[];

      expect(insights).toHaveLength(1);
      expect(insights[0].frequency).toBe(2);
      expect(insights[0].model).toBe("anthropic/claude-sonnet-4-20250514");
      expect(insights[0].pattern).toBe("Uses sed instead of read tool");
      expect(insights[0].workaround).toBe("Remind to use read tool");
    });

    it("should aggregate tool errors", () => {
      const db = createTestDb();
      const aggregator = new InsightAggregator(db);

      // Insert test tool errors
      for (let i = 0; i < 5; i++) {
        db.prepare(`
          INSERT INTO tool_errors (id, node_id, tool, error_type, model, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          `te${i}`,
          `node${i}`,
          "edit",
          "text_not_found",
          "anthropic/claude-sonnet-4-20250514",
          `2026-01-0${i + 1}T00:00:00Z`
        );
      }

      aggregator.aggregateAll();

      const insights = db
        .prepare("SELECT * FROM aggregated_insights WHERE type = 'tool_error'")
        .all() as {
        id: string;
        frequency: number;
        confidence: number;
        tool: string;
      }[];

      expect(insights).toHaveLength(1);
      expect(insights[0].frequency).toBe(5);
      expect(insights[0].confidence).toBe(0.75); // 5 occurrences => 0.75
      expect(insights[0].tool).toBe("edit");
    });

    it("should aggregate lessons at model/tool/user levels", () => {
      const db = createTestDb();
      const aggregator = new InsightAggregator(db);

      // Insert test lessons
      db.prepare(`
        INSERT INTO lessons (id, node_id, level, summary, confidence, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        "l1",
        "node1",
        "model",
        "Claude over-engineers solutions",
        "high",
        "2026-01-01T00:00:00Z"
      );

      db.prepare(`
        INSERT INTO lessons (id, node_id, level, summary, confidence, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        "l2",
        "node2",
        "model",
        "Claude over-engineers solutions",
        "medium",
        "2026-01-02T00:00:00Z"
      );

      db.prepare(`
        INSERT INTO lessons (id, node_id, level, summary, confidence, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        "l3",
        "node3",
        "tool",
        "Always read file before editing",
        "high",
        "2026-01-03T00:00:00Z"
      );

      // This should be ignored (project level not included)
      db.prepare(`
        INSERT INTO lessons (id, node_id, level, summary, confidence, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        "l4",
        "node4",
        "project",
        "Project-specific lesson",
        "high",
        "2026-01-04T00:00:00Z"
      );

      aggregator.aggregateAll();

      const insights = db
        .prepare(
          "SELECT * FROM aggregated_insights WHERE type = 'lesson' ORDER BY pattern"
        )
        .all() as { pattern: string; frequency: number }[];

      expect(insights).toHaveLength(2);
      expect(
        insights.find((i) => i.pattern === "Claude over-engineers solutions")
          ?.frequency
      ).toBe(2);
      expect(
        insights.find((i) => i.pattern === "Always read file before editing")
          ?.frequency
      ).toBe(1);
    });

    it("should aggregate prompting wins from node JSON files", () => {
      const db = createTestDb();

      // Create node with prompting wins
      const node = createTestNode({
        observations: {
          modelsUsed: [
            {
              provider: "anthropic",
              model: "claude-sonnet-4-20250514",
              tokensInput: 1000,
              tokensOutput: 500,
              cost: 0.01,
            },
          ],
          promptingWins: ["Being specific about scope improved results"],
          promptingFailures: [],
          modelQuirks: [],
          toolUseErrors: [],
        },
      });

      // Write node file
      const nodesDir = join(tempDir, "2026", "01");
      mkdirSync(nodesDir, { recursive: true });
      const nodePath = join(nodesDir, `${node.id}-v1.json`);
      writeFileSync(nodePath, JSON.stringify(node));

      // Insert node reference in DB
      db.prepare(`
        INSERT INTO nodes (id, version, session_file, timestamp, analyzed_at, data_file)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        node.id,
        1,
        "/test/session.jsonl",
        node.metadata.timestamp,
        node.metadata.analyzedAt,
        nodePath
      );

      const aggregator = new InsightAggregator(db);
      aggregator.aggregateAll();

      const insights = db
        .prepare("SELECT * FROM aggregated_insights WHERE type = 'win'")
        .all() as { pattern: string; frequency: number }[];

      expect(insights).toHaveLength(1);
      expect(insights[0].pattern).toBe(
        "Being specific about scope improved results"
      );
      expect(insights[0].frequency).toBe(1);
    });

    it("should aggregate prompting failures from node JSON files", () => {
      const db = createTestDb();

      // Create nodes with prompting failures
      const node1 = createTestNode({
        observations: {
          modelsUsed: [
            {
              provider: "anthropic",
              model: "claude-sonnet-4-20250514",
              tokensInput: 1000,
              tokensOutput: 500,
              cost: 0.01,
            },
          ],
          promptingWins: [],
          promptingFailures: ["Vague refactor request caused confusion"],
          modelQuirks: [],
          toolUseErrors: [],
        },
      });

      const node2 = createTestNode({
        observations: {
          modelsUsed: [
            {
              provider: "anthropic",
              model: "claude-sonnet-4-20250514",
              tokensInput: 1000,
              tokensOutput: 500,
              cost: 0.01,
            },
          ],
          promptingWins: [],
          promptingFailures: ["Vague refactor request caused confusion"],
          modelQuirks: [],
          toolUseErrors: [],
        },
      });

      // Write node files
      const nodesDir = join(tempDir, "2026", "01");
      mkdirSync(nodesDir, { recursive: true });

      const nodePath1 = join(nodesDir, `${node1.id}-v1.json`);
      const nodePath2 = join(nodesDir, `${node2.id}-v1.json`);
      writeFileSync(nodePath1, JSON.stringify(node1));
      writeFileSync(nodePath2, JSON.stringify(node2));

      // Insert node references in DB
      db.prepare(`
        INSERT INTO nodes (id, version, session_file, timestamp, analyzed_at, data_file)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        node1.id,
        1,
        "/test/session.jsonl",
        node1.metadata.timestamp,
        node1.metadata.analyzedAt,
        nodePath1
      );

      db.prepare(`
        INSERT INTO nodes (id, version, session_file, timestamp, analyzed_at, data_file)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        node2.id,
        1,
        "/test/session.jsonl",
        node2.metadata.timestamp,
        node2.metadata.analyzedAt,
        nodePath2
      );

      const aggregator = new InsightAggregator(db);
      aggregator.aggregateAll();

      const insights = db
        .prepare("SELECT * FROM aggregated_insights WHERE type = 'failure'")
        .all() as {
        pattern: string;
        frequency: number;
        severity: string;
      }[];

      expect(insights).toHaveLength(1);
      expect(insights[0].pattern).toBe(
        "Vague refactor request caused confusion"
      );
      expect(insights[0].frequency).toBe(2);
    });

    it("should update existing insights on re-aggregation", () => {
      const db = createTestDb();
      const aggregator = new InsightAggregator(db);

      // First aggregation
      db.prepare(`
        INSERT INTO model_quirks (id, node_id, model, observation, frequency, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        "q1",
        "node1",
        "anthropic/claude-sonnet-4-20250514",
        "Test quirk",
        "sometimes",
        "2026-01-01T00:00:00Z"
      );

      aggregator.aggregateAll();

      let insights = db
        .prepare("SELECT * FROM aggregated_insights WHERE type = 'quirk'")
        .all() as { frequency: number }[];
      expect(insights[0].frequency).toBe(1);

      // Add more data and re-aggregate
      db.prepare(`
        INSERT INTO model_quirks (id, node_id, model, observation, frequency, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        "q2",
        "node2",
        "anthropic/claude-sonnet-4-20250514",
        "Test quirk",
        "often",
        "2026-01-02T00:00:00Z"
      );

      aggregator.aggregateAll();

      insights = db
        .prepare("SELECT * FROM aggregated_insights WHERE type = 'quirk'")
        .all() as { frequency: number }[];
      expect(insights).toHaveLength(1);
      expect(insights[0].frequency).toBe(2);
    });

    it("should skip nodes with missing JSON files gracefully", () => {
      const db = createTestDb();

      // Insert node reference pointing to non-existent file
      db.prepare(`
        INSERT INTO nodes (id, version, session_file, timestamp, analyzed_at, data_file)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        "missing-node",
        1,
        "/test/session.jsonl",
        "2026-01-01T00:00:00Z",
        "2026-01-01T00:00:00Z",
        "/non/existent/path.json"
      );

      const aggregator = new InsightAggregator(db);

      // Should not throw
      expect(() => aggregator.aggregateAll()).not.toThrow();
    });
  });
});
