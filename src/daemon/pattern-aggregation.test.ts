import Database from "better-sqlite3";
import { describe, it, expect, beforeEach } from "vitest";

import { PatternAggregator } from "./pattern-aggregation.js";

interface FailurePatternRow {
  id: string;
  pattern: string;
  occurrences: number;
  models: string;
  tools: string;
  example_nodes: string;
  last_seen: string;
  learning_opportunity: string;
  created_at: string;
  updated_at: string;
}

describe("patternAggregator", () => {
  let db: Database.Database;
  let aggregator: PatternAggregator;

  beforeEach(() => {
    db = new Database(":memory:");

    // Create tables
    db.exec(`
      CREATE TABLE tool_errors (
        id TEXT PRIMARY KEY,
        node_id TEXT NOT NULL,
        tool TEXT NOT NULL,
        error_type TEXT NOT NULL,
        context TEXT,
        model TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE failure_patterns (
        id TEXT PRIMARY KEY,
        pattern TEXT NOT NULL,
        occurrences INTEGER DEFAULT 1,
        models TEXT,
        tools TEXT,
        example_nodes TEXT,
        last_seen TEXT,
        learning_opportunity TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `);

    aggregator = new PatternAggregator(db);
  });

  it("should aggregate tool errors correctly", () => {
    // Insert test data
    const errors = [
      {
        id: "1",
        node_id: "n1",
        tool: "git",
        error_type: "conflict",
        model: "gpt-4",
        created_at: "2026-01-01T10:00:00Z",
      },
      {
        id: "2",
        node_id: "n2",
        tool: "git",
        error_type: "conflict",
        model: "claude-3",
        created_at: "2026-01-02T10:00:00Z",
      },
      {
        id: "3",
        node_id: "n3",
        tool: "read",
        error_type: "access_denied",
        model: "gpt-4",
        created_at: "2026-01-03T10:00:00Z",
      },
    ];

    const insert = db.prepare(`
      INSERT INTO tool_errors (id, node_id, tool, error_type, model, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const error of errors) {
      insert.run(
        error.id,
        error.node_id,
        error.tool,
        error.error_type,
        error.model,
        error.created_at
      );
    }

    // Run aggregation
    aggregator.aggregateFailurePatterns();

    // Verify results
    const patterns = db
      .prepare("SELECT * FROM failure_patterns ORDER BY pattern")
      .all() as FailurePatternRow[];

    expect(patterns).toHaveLength(2);

    // Check git conflict pattern
    const gitPattern = patterns.find((p) => p.tools.includes("git"));
    expect(gitPattern).toBeDefined();

    // We know it exists because of the previous expectation
    const gitP = gitPattern as FailurePatternRow;
    expect(gitP.pattern).toBe("Error 'conflict' in tool 'git'");
    expect(gitP.occurrences).toBe(2);
    expect(JSON.parse(gitP.models)).toContain("gpt-4");
    expect(JSON.parse(gitP.models)).toContain("claude-3");
    expect(JSON.parse(gitP.example_nodes)).toStrictEqual(["n2", "n1"]); // n2 is newer
    expect(gitP.last_seen).toBe("2026-01-02T10:00:00Z");

    // Check read access_denied pattern
    const readPattern = patterns.find((p) => p.tools.includes("read"));
    expect(readPattern).toBeDefined();

    const readP = readPattern as FailurePatternRow;
    expect(readP.pattern).toBe("Error 'access_denied' in tool 'read'");
    expect(readP.occurrences).toBe(1);
  });

  it("should update existing patterns", () => {
    // Initial error
    db.prepare(`
      INSERT INTO tool_errors (id, node_id, tool, error_type, model, created_at)
      VALUES ('1', 'n1', 'git', 'conflict', 'gpt-4', '2026-01-01T10:00:00Z')
    `).run();

    aggregator.aggregateFailurePatterns();
    let pattern = db
      .prepare("SELECT * FROM failure_patterns")
      .get() as FailurePatternRow;
    expect(pattern.occurrences).toBe(1);

    // New error of same type
    db.prepare(`
      INSERT INTO tool_errors (id, node_id, tool, error_type, model, created_at)
      VALUES ('2', 'n2', 'git', 'conflict', 'gpt-4', '2026-01-02T10:00:00Z')
    `).run();

    aggregator.aggregateFailurePatterns();
    pattern = db
      .prepare("SELECT * FROM failure_patterns")
      .get() as FailurePatternRow;
    expect(pattern.occurrences).toBe(2);
    expect(pattern.last_seen).toBe("2026-01-02T10:00:00Z");
  });

  it("should limit example nodes to 5", () => {
    const insert = db.prepare(`
      INSERT INTO tool_errors (id, node_id, tool, error_type, model, created_at)
      VALUES (?, ?, 'git', 'conflict', 'gpt-4', ?)
    `);

    // Insert 10 errors
    for (let i = 1; i <= 10; i++) {
      const day = i.toString().padStart(2, "0");
      const date = `2026-01-${day}T10:00:00Z`;
      insert.run(i.toString(), `n${i}`, date);
    }

    aggregator.aggregateFailurePatterns();
    const pattern = db
      .prepare("SELECT * FROM failure_patterns")
      .get() as FailurePatternRow;

    expect(pattern.occurrences).toBe(10);
    const examples = JSON.parse(pattern.example_nodes);
    expect(examples).toHaveLength(5);
    // Should be n10, n9, n8, n7, n6 (descending order of created_at)
    expect(examples).toStrictEqual(["n10", "n9", "n8", "n7", "n6"]);
  });

  interface ModelStatsRow {
    model: string;
    total_tokens: number;
    total_cost: number;
    total_sessions: number;
    quirk_count: number;
    error_count: number;
    last_used: string;
    updated_at: string;
  }

  it("should aggregate model stats correctly", () => {
    // Create model_quirks and model_stats tables
    db.exec(`
      CREATE TABLE model_quirks (
        id TEXT PRIMARY KEY,
        node_id TEXT NOT NULL,
        model TEXT NOT NULL,
        observation TEXT NOT NULL,
        frequency TEXT,
        workaround TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE model_stats (
        model TEXT PRIMARY KEY,
        total_tokens INTEGER DEFAULT 0,
        total_cost REAL DEFAULT 0.0,
        total_sessions INTEGER DEFAULT 0,
        quirk_count INTEGER DEFAULT 0,
        error_count INTEGER DEFAULT 0,
        last_used TEXT,
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `);

    // Insert test data for quirks
    db.prepare(`
      INSERT INTO model_quirks (id, node_id, model, observation, created_at)
      VALUES
        ('1', 'n1', 'gpt-4', 'obs1', '2026-01-01T10:00:00Z'),
        ('2', 'n2', 'gpt-4', 'obs2', '2026-01-02T10:00:00Z'),
        ('3', 'n3', 'claude-3', 'obs1', '2026-01-03T10:00:00Z')
    `).run();

    // Insert test data for errors (using existing tool_errors table)
    db.prepare(`
      INSERT INTO tool_errors (id, node_id, tool, error_type, model, created_at)
      VALUES
        ('e1', 'n4', 'git', 'error', 'gpt-4', '2026-01-04T10:00:00Z'),
        ('e2', 'n5', 'git', 'error', 'claude-3', '2026-01-05T10:00:00Z'),
        ('e3', 'n6', 'git', 'error', 'claude-3', '2026-01-06T10:00:00Z')
    `).run();

    // Run aggregation
    aggregator.aggregateModelStats();

    // Verify results
    const stats = db
      .prepare("SELECT * FROM model_stats ORDER BY model")
      .all() as ModelStatsRow[];

    expect(stats).toHaveLength(2);

    const claudeStats = stats.find((s) => s.model === "claude-3");
    expect(claudeStats).toBeDefined();
    expect(claudeStats?.quirk_count).toBe(1);
    expect(claudeStats?.error_count).toBe(2);
    expect(claudeStats?.last_used).toBe("2026-01-06T10:00:00Z");

    const gpt4Stats = stats.find((s) => s.model === "gpt-4");
    expect(gpt4Stats).toBeDefined();
    expect(gpt4Stats?.quirk_count).toBe(2);
    expect(gpt4Stats?.error_count).toBe(1);
    expect(gpt4Stats?.last_used).toBe("2026-01-04T10:00:00Z");
  });
});
