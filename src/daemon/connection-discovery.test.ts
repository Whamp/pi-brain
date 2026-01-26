import Database from "better-sqlite3";
import { describe, it, expect, beforeEach } from "vitest";

import { createEdge } from "../storage/node-repository.js";
import { ConnectionDiscoverer } from "./connection-discovery.js";

// Manual insertion helper to avoid FS side effects
function manualInsertNode(
  db: Database.Database,
  id: string,
  summary: string,
  tags: string[],
  topics: string[],
  timestamp: string = new Date().toISOString()
) {
  db.prepare(`
    INSERT INTO nodes (id, session_file, data_file, timestamp, summary, analyzed_at)
    VALUES (?, 'test.jsonl', 'test.json', ?, ?, datetime('now'))
  `).run(id, timestamp, summary);

  for (const tag of tags) {
    db.prepare("INSERT INTO tags (node_id, tag) VALUES (?, ?)").run(id, tag);
  }
  for (const topic of topics) {
    db.prepare("INSERT INTO topics (node_id, topic) VALUES (?, ?)").run(
      id,
      topic
    );
  }
}

describe("connectionDiscoverer", () => {
  let db: Database.Database;
  let discoverer: ConnectionDiscoverer;

  beforeEach(() => {
    db = new Database(":memory:");
    // Setup schema (simplified for test)
    db.exec(`
      CREATE TABLE nodes (
        id TEXT PRIMARY KEY,
        session_file TEXT,
        data_file TEXT,
        timestamp TEXT,
        summary TEXT,
        analyzed_at TEXT
      );
      CREATE TABLE tags (node_id TEXT, tag TEXT);
      CREATE TABLE topics (node_id TEXT, topic TEXT);
      CREATE TABLE edges (
        id TEXT PRIMARY KEY,
        source_node_id TEXT,
        target_node_id TEXT,
        type TEXT,
        metadata TEXT,
        created_at TEXT,
        created_by TEXT
      );
    `);
    discoverer = new ConnectionDiscoverer(db);
  });

  it("should calculate similarity correctly", () => {
    const score = discoverer.calculateSimilarity(
      {
        tags: new Set(["a", "b"]),
        topics: new Set(["x"]),
        summary: "hello world",
      },
      {
        tags: new Set(["a", "c"]),
        topics: new Set(["x"]),
        summary: "hello universe",
      }
    );
    // Tags: 1/3 = 0.33 * 0.4 = 0.133
    // Topics: 1/1 = 1.0 * 0.3 = 0.3
    // Summary: "hello" matches. "world"/"universe" diff. 1/3 = 0.33 * 0.3 = 0.1
    // Total: ~0.533
    expect(score).toBeGreaterThan(0.5);
    expect(score).toBeLessThan(0.6);
  });

  it("should find candidates and create edges", async () => {
    // Recent node (Source)
    manualInsertNode(
      db,
      "1",
      "This is about typescript and sql",
      ["ts", "sql"],
      ["coding"],
      new Date("2026-01-02T12:00:00Z").toISOString()
    );
    // Older node (Candidate)
    manualInsertNode(
      db,
      "2",
      "Another typescript sql session",
      ["ts", "sql"],
      ["coding"],
      new Date("2026-01-01T12:00:00Z").toISOString()
    );
    // Older unrelated node
    manualInsertNode(
      db,
      "3",
      "Something completely different",
      ["rust", "web"],
      ["other"],
      new Date("2026-01-01T10:00:00Z").toISOString()
    );

    const result = await discoverer.discover("1", { threshold: 0.5 });

    expect(result.sourceNodeId).toBe("1");
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0].targetNodeId).toBe("2");
    expect(result.edges[0].type).toBe("semantic");

    // Check DB
    const edges = db.prepare("SELECT * FROM edges").all();
    expect(edges).toHaveLength(1);
    expect(edges[0].source_node_id).toBe("1");
    expect(edges[0].target_node_id).toBe("2");
  });

  it("should not duplicate edges", async () => {
    // Timestamps must differ for the new logic (source > target)
    manualInsertNode(
      db,
      "1",
      "Ts sql",
      ["ts"],
      [],
      new Date("2026-01-02T12:00:00Z").toISOString()
    );
    manualInsertNode(
      db,
      "2",
      "Ts sql",
      ["ts"],
      [],
      new Date("2026-01-01T12:00:00Z").toISOString()
    );

    // Create edge manually first
    createEdge(db, "1", "2", "semantic");

    const result = await discoverer.discover("1");
    expect(result.edges).toHaveLength(0);

    const edges = db.prepare("SELECT * FROM edges").all();
    expect(edges).toHaveLength(1); // Still just 1
  });
});
