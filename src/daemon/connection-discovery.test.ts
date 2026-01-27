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
    INSERT INTO nodes (id, session_file, data_file, timestamp, analyzed_at)
    VALUES (?, 'test.jsonl', 'test.json', ?, datetime('now'))
  `).run(id, timestamp);

  // Insert into FTS
  db.prepare(`
    INSERT INTO nodes_fts (node_id, summary) VALUES (?, ?)
  `).run(id, summary);

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
        analyzed_at TEXT
      );
      CREATE VIRTUAL TABLE nodes_fts USING fts5(
        node_id, summary, decisions, lessons, tags, topics
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
      CREATE TABLE lessons (
        id TEXT PRIMARY KEY,
        node_id TEXT,
        level TEXT,
        summary TEXT,
        details TEXT,
        confidence TEXT,
        created_at TEXT
      );
    `);
    discoverer = new ConnectionDiscoverer(db);
  });

  function manualInsertLesson(
    db: Database.Database,
    nodeId: string,
    summary: string,
    details: string,
    level = "project"
  ) {
    const id = Math.random().toString(36).slice(7);
    db.prepare(`
      INSERT INTO lessons (id, node_id, level, summary, details, confidence)
      VALUES (?, ?, ?, ?, ?, 'high')
    `).run(id, nodeId, level, summary, details);

    // Update FTS with lesson info
    const current = db
      .prepare("SELECT lessons FROM nodes_fts WHERE node_id = ?")
      .get(nodeId) as { lessons: string } | undefined;
    const newLessons = (current?.lessons || "") + " " + summary + " " + details;
    db.prepare("UPDATE nodes_fts SET lessons = ? WHERE node_id = ?").run(
      newLessons,
      nodeId
    );
  }

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
    const edges = db.prepare("SELECT * FROM edges").all() as {
      source_node_id: string;
      target_node_id: string;
    }[];
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

  it("should detect reference to existing node ID in summary", async () => {
    const targetId = "a1b2c3d4e5f60000";
    manualInsertNode(
      db,
      targetId,
      "Original node",
      [],
      [],
      new Date("2026-01-01T00:00:00Z").toISOString()
    );

    const sourceId = "1234567890abcdef";
    manualInsertNode(
      db,
      sourceId,
      `This work builds on node ${targetId} and improves it.`,
      [],
      [],
      new Date("2026-01-02T00:00:00Z").toISOString()
    );

    const result = await discoverer.discover(sourceId);

    expect(result.edges).toHaveLength(1);
    expect(result.edges[0].type).toBe("reference");
    expect(result.edges[0].targetNodeId).toBe(targetId);
  });

  it("should detect lesson reinforcement", async () => {
    // 1. Create candidate node (older) with a lesson
    const candidateId = "c1c1c1c1c1c1c1c1";
    manualInsertNode(
      db,
      candidateId,
      "Debugging session",
      ["debug"],
      ["coding"],
      new Date("2026-01-01T10:00:00Z").toISOString()
    );
    manualInsertLesson(
      db,
      candidateId,
      "Use explicit logging for async debugging",
      "When debugging async functions, always add console logs before and after await calls.",
      "task"
    );

    // 2. Create source node (newer) with a similar lesson
    const sourceId = "s1s1s1s1s1s1s1s1";
    manualInsertNode(
      db,
      sourceId,
      "Another debugging session",
      ["debug"],
      ["coding"],
      new Date("2026-01-02T10:00:00Z").toISOString()
    );
    manualInsertLesson(
      db,
      sourceId,
      "Async debugging needs logging",
      "Always use logging when working with async code to trace execution flow.",
      "task"
    );

    // 3. Run discovery
    // Use lower threshold because summaries are short and stopwords removal might leave few tokens
    const result = await discoverer.discover(sourceId, { threshold: 0.1 });

    // 4. Verify edge creation
    const lessonEdge = result.edges.find(
      (e) => e.type === "lesson_application"
    );
    expect(lessonEdge).toBeDefined();
    expect(lessonEdge?.targetNodeId).toBe(candidateId);
    expect(lessonEdge?.metadata.reason).toContain("Reinforces lesson");
  });

  it("should handle lesson summaries with quotes in FTS query", async () => {
    // 1. Create candidate node with a lesson containing quotes
    const candidateId = "q1q1q1q1q1q1q1q1";
    manualInsertNode(
      db,
      candidateId,
      "TypeScript config session",
      ["typescript"],
      ["config"],
      new Date("2026-01-01T10:00:00Z").toISOString()
    );
    manualInsertLesson(
      db,
      candidateId,
      'Use "strict" mode for TypeScript',
      'Always enable "strict": true in tsconfig.json for better type safety.',
      "tool"
    );

    // 2. Create source node with similar lesson (also with quotes)
    const sourceId = "q2q2q2q2q2q2q2q2";
    manualInsertNode(
      db,
      sourceId,
      "Another TypeScript session",
      ["typescript"],
      ["config"],
      new Date("2026-01-02T10:00:00Z").toISOString()
    );
    manualInsertLesson(
      db,
      sourceId,
      'Enable "strict" in TypeScript config',
      'TypeScript "strict" mode catches more errors at compile time.',
      "tool"
    );

    // 3. Run discovery - should not throw despite quotes in lesson text
    const result = await discoverer.discover(sourceId, { threshold: 0.1 });

    // 4. Should complete without error (FTS query should be properly escaped)
    // May or may not find a match depending on tokenization, but shouldn't crash
    expect(result.sourceNodeId).toBe(sourceId);
  });

  it("should deduplicate edges when multiple lessons match same candidate", async () => {
    // 1. Create candidate node (older) with a lesson
    const candidateId = "d1d1d1d1d1d1d1d1";
    manualInsertNode(
      db,
      candidateId,
      "Debugging session with async and logging",
      ["debug", "logging"],
      ["coding"],
      new Date("2026-01-01T10:00:00Z").toISOString()
    );
    manualInsertLesson(
      db,
      candidateId,
      "Use explicit logging for async debugging",
      "When debugging async functions, always add console logs.",
      "task"
    );
    manualInsertLesson(
      db,
      candidateId,
      "Logging helps trace async execution",
      "Add logs before and after await calls to trace flow.",
      "task"
    );

    // 2. Create source node (newer) with TWO lessons that could both match the candidate
    const sourceId = "d2d2d2d2d2d2d2d2";
    manualInsertNode(
      db,
      sourceId,
      "Another debugging session with async and logging",
      ["debug", "logging"],
      ["coding"],
      new Date("2026-01-02T10:00:00Z").toISOString()
    );
    // First lesson that matches candidate
    manualInsertLesson(
      db,
      sourceId,
      "Async debugging needs logging",
      "Always use logging when working with async code.",
      "task"
    );
    // Second lesson that also matches candidate (similar topic)
    manualInsertLesson(
      db,
      sourceId,
      "Trace async flow with console logs",
      "Use console logs before and after await for debugging.",
      "task"
    );

    // 3. Run discovery
    const result = await discoverer.discover(sourceId, { threshold: 0.1 });

    // 4. Verify only ONE edge is created to the candidate, not two
    const lessonEdges = result.edges.filter(
      (e) => e.type === "lesson_application"
    );
    expect(lessonEdges).toHaveLength(1);
    expect(lessonEdges[0].targetNodeId).toBe(candidateId);
  });
});
