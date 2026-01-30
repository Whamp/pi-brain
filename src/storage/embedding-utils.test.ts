/**
 * Tests for embedding-utils
 */

import type Database from "better-sqlite3";

import { afterEach, describe, expect, it } from "vitest";

import type { Node } from "../types/index.js";

import { closeDatabase, openDatabase } from "./database.js";
import {
  backfillEmbeddings,
  buildEmbeddingText,
  buildSimpleEmbeddingText,
  countNodesNeedingEmbedding,
  deleteEmbedding,
  deserializeEmbedding,
  EMBEDDING_FORMAT_VERSION,
  findNodesNeedingEmbedding,
  getEmbedding,
  hasEmbedding,
  isRichEmbeddingFormat,
  serializeEmbedding,
  storeEmbeddingWithVec,
} from "./embedding-utils.js";

/**
 * Helper to create an embedding of valid size (4096) or custom size.
 */
function createEmbedding(length = 4096): number[] {
  return Array.from({ length }, (_, i) => i / length);
}

/**
 * Create a minimal Node for testing.
 *
 * Accepts only top-level overrides that replace entire sub-objects.
 * This ensures nested required fields aren't accidentally omitted.
 */
function createTestNode(
  overrides: {
    id?: string;
    version?: number;
    previousVersions?: string[];
    source?: Node["source"];
    classification?: Node["classification"];
    content?: Node["content"];
    lessons?: Node["lessons"];
    observations?: Node["observations"];
    metadata?: Node["metadata"];
    semantic?: Node["semantic"];
    daemonMeta?: Node["daemonMeta"];
  } = {}
): Node {
  const defaults: Node = {
    id: "test-node-id",
    version: 1,
    previousVersions: [],
    source: {
      sessionFile: "/test/session.jsonl",
      segment: {
        startEntryId: "00000001",
        endEntryId: "00000010",
        entryCount: 10,
      },
      computer: "test-host",
      sessionId: "test-session-id",
    },
    classification: {
      type: "coding",
      project: "/test/project",
      isNewProject: false,
      hadClearGoal: true,
    },
    content: {
      summary: "Test summary",
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
      timestamp: "2026-01-27T12:00:00Z",
      analyzedAt: "2026-01-27T12:05:00Z",
      analyzerVersion: "v1",
    },
    semantic: {
      tags: [],
      topics: [],
    },
    daemonMeta: {
      decisions: [],
      rlmUsed: false,
    },
  };

  return {
    ...defaults,
    ...overrides,
  };
}

describe("buildEmbeddingText", () => {
  it("should include type, summary, and version marker", () => {
    const node = createTestNode({
      classification: {
        type: "debugging",
        project: "/test",
        isNewProject: false,
        hadClearGoal: true,
      },
      content: {
        summary: "Fixed a bug in the parser",
        outcome: "success",
        keyDecisions: [],
        filesTouched: [],
        toolsUsed: [],
        errorsSeen: [],
      },
    });

    const text = buildEmbeddingText(node);

    expect(text).toBe(
      `[debugging] Fixed a bug in the parser\n\n${EMBEDDING_FORMAT_VERSION}`
    );
  });

  it("should include decisions when present", () => {
    const node = createTestNode({
      content: {
        summary: "Implemented rate limiting",
        outcome: "success",
        keyDecisions: [
          {
            what: "Used token bucket algorithm",
            why: "predictable behavior under burst traffic",
            alternativesConsidered: ["leaky bucket"],
          },
          {
            what: "Chose Redis for storage",
            why: "shared state across instances",
            alternativesConsidered: ["in-memory"],
          },
        ],
        filesTouched: [],
        toolsUsed: [],
        errorsSeen: [],
      },
    });

    const text = buildEmbeddingText(node);

    expect(text).toContain("[coding] Implemented rate limiting");
    expect(text).toContain("\n\nDecisions:");
    expect(text).toContain(
      "- Used token bucket algorithm (why: predictable behavior under burst traffic)"
    );
    expect(text).toContain(
      "- Chose Redis for storage (why: shared state across instances)"
    );
  });

  it("should include lessons from all levels", () => {
    const node = createTestNode({
      content: {
        summary: "Database optimization session",
        outcome: "success",
        keyDecisions: [],
        filesTouched: [],
        toolsUsed: [],
        errorsSeen: [],
      },
      lessons: {
        project: [
          {
            level: "project",
            summary: "Use connection pooling for SQLite",
            details: "Improves performance under load",
            confidence: "high",
            tags: ["sqlite", "performance"],
          },
        ],
        task: [],
        user: [
          {
            level: "user",
            summary: "Be specific about performance requirements",
            details: "Helps the model focus on the right optimizations",
            confidence: "medium",
            tags: ["prompting"],
          },
        ],
        model: [
          {
            level: "model",
            summary: "Claude tends to over-engineer database solutions",
            details: "Start with simple solutions first",
            confidence: "high",
            tags: ["claude"],
          },
        ],
        tool: [],
        skill: [],
        subagent: [],
      },
    });

    const text = buildEmbeddingText(node);

    expect(text).toContain("\n\nLessons:");
    expect(text).toContain("- Use connection pooling for SQLite");
    expect(text).toContain("- Be specific about performance requirements");
    expect(text).toContain(
      "- Claude tends to over-engineer database solutions"
    );
  });

  it("should handle nodes with both decisions and lessons", () => {
    const node = createTestNode({
      classification: {
        type: "refactoring",
        project: "/test",
        isNewProject: false,
        hadClearGoal: true,
      },
      content: {
        summary: "Refactored authentication module",
        outcome: "success",
        keyDecisions: [
          {
            what: "Split into separate files",
            why: "improve maintainability",
            alternativesConsidered: [],
          },
        ],
        filesTouched: ["auth.ts"],
        toolsUsed: ["edit"],
        errorsSeen: [],
      },
      lessons: {
        project: [],
        task: [
          {
            level: "task",
            summary: "Refactor in small incremental steps",
            details: "Reduces risk of breaking changes",
            confidence: "high",
            tags: ["refactoring"],
          },
        ],
        user: [],
        model: [],
        tool: [],
        skill: [],
        subagent: [],
      },
    });

    const text = buildEmbeddingText(node);

    // Check order: summary, then decisions, then lessons
    const decisionIndex = text.indexOf("\nDecisions:");
    const lessonIndex = text.indexOf("\nLessons:");

    expect(decisionIndex).toBeGreaterThan(0);
    expect(lessonIndex).toBeGreaterThan(decisionIndex);
    expect(text).toContain(
      "- Split into separate files (why: improve maintainability)"
    );
    expect(text).toContain("- Refactor in small incremental steps");
  });

  it("should handle empty decisions and lessons", () => {
    const node = createTestNode({
      content: {
        summary: "Quick fix for typo",
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
    });

    const text = buildEmbeddingText(node);

    expect(text).toBe(
      `[coding] Quick fix for typo\n\n${EMBEDDING_FORMAT_VERSION}`
    );
    expect(text).not.toContain("Decisions:");
    expect(text).not.toContain("Lessons:");
  });
});

describe("buildSimpleEmbeddingText", () => {
  it("should format type and summary", () => {
    const text = buildSimpleEmbeddingText("debugging", "Fixed parser bug");
    expect(text).toBe("[debugging] Fixed parser bug");
  });

  it("should handle null type", () => {
    const text = buildSimpleEmbeddingText(null, "Some summary");
    expect(text).toBe("Some summary");
  });

  it("should handle null summary", () => {
    const text = buildSimpleEmbeddingText("coding", null);
    expect(text).toBe("[coding]");
  });

  it("should handle both null", () => {
    const text = buildSimpleEmbeddingText(null, null);
    expect(text).toBe("");
  });
});

describe("isRichEmbeddingFormat", () => {
  it("should return false for text with sections but no version marker", () => {
    // Rely primarily on version marker now to avoid strict whitespace dependency
    const text = "[coding] Summary\n\nDecisions:\n- Decision 1";
    expect(isRichEmbeddingFormat(text)).toBeFalsy();
  });

  it("should return false for text with Lessons section but no version marker", () => {
    const text = "[coding] Summary\n\nLessons:\n- Lesson 1";
    expect(isRichEmbeddingFormat(text)).toBeFalsy();
  });

  it("should return false for text with both sections but no version marker", () => {
    const text =
      "[coding] Summary\n\nDecisions:\n- Decision 1\n\nLessons:\n- Lesson 1";
    expect(isRichEmbeddingFormat(text)).toBeFalsy();
  });

  it("should return false for simple format", () => {
    const text = "[coding] Summary only";
    expect(isRichEmbeddingFormat(text)).toBeFalsy();
  });

  it("should return false for text mentioning decisions without section", () => {
    const text = "[coding] Made some decisions about the architecture";
    expect(isRichEmbeddingFormat(text)).toBeFalsy();
  });

  it("should return false for text without [type] prefix", () => {
    const text = "Summary\n\nDecisions:\n- Decision 1";
    expect(isRichEmbeddingFormat(text)).toBeFalsy();
  });

  it("should return false for user content containing Decisions: text", () => {
    // Edge case: user summary that happens to contain "\nDecisions:" text
    const text = "[coding] User wrote about\nDecisions: what to do next";
    expect(isRichEmbeddingFormat(text)).toBeFalsy();
  });

  it("should return true for text with version marker", () => {
    // Node with no decisions/lessons but marked as new format
    const text = `[coding] Summary only\n\n${EMBEDDING_FORMAT_VERSION}`;
    expect(isRichEmbeddingFormat(text)).toBeTruthy();
  });

  it("should return true for text with version marker and sections", () => {
    const text = `[coding] Summary\n\nDecisions:\n- Decision 1\n\n${EMBEDDING_FORMAT_VERSION}`;
    expect(isRichEmbeddingFormat(text)).toBeTruthy();
  });
});

describe("storeEmbeddingWithVec", () => {
  let db: Database.Database;

  afterEach(() => {
    if (db) {
      closeDatabase(db);
    }
  });

  function createTestNodeInDb(nodeId: string): void {
    db.prepare(
      `INSERT INTO nodes (id, version, session_file, type, project, outcome, data_file, timestamp, analyzed_at, analyzer_version)
       VALUES (?, 1, '/test.jsonl', 'coding', '/test/project', 'success', '/test.json', datetime('now'), datetime('now'), 'v1')`
    ).run(nodeId);
  }

  it("should store embedding in node_embeddings table", () => {
    db = openDatabase({ path: ":memory:" });
    createTestNodeInDb("test-node-1");

    const embedding = createEmbedding();
    const result = storeEmbeddingWithVec(
      db,
      "test-node-1",
      embedding,
      "test-model",
      "[coding] Test summary"
    );

    expect(result.rowid).toBeDefined();
    // vecUpdated will be true now since dimensions match
    expect(result.vecUpdated).toBeTruthy();

    const stored = getEmbedding(db, "test-node-1");
    expect(stored).not.toBeNull();
    expect(stored?.modelName).toBe("test-model");
    expect(stored?.inputText).toBe("[coding] Test summary");
    for (let i = 0; i < 5; i++) {
      // Check first few
      expect(stored?.embedding[i]).toBeCloseTo(embedding[i], 5);
    }
  });

  it("should handle upsert (update existing embedding)", () => {
    db = openDatabase({ path: ":memory:" });
    createTestNodeInDb("test-node-2");

    const embedding1 = createEmbedding();
    storeEmbeddingWithVec(db, "test-node-2", embedding1, "model-v1", "Text v1");

    const embedding2 = createEmbedding();
    // modify slightly to verify update
    embedding2[0] = 0.99;

    const result = storeEmbeddingWithVec(
      db,
      "test-node-2",
      embedding2,
      "model-v2",
      "Text v2"
    );

    expect(result.vecUpdated).toBeTruthy();

    const stored = getEmbedding(db, "test-node-2");
    expect(stored?.modelName).toBe("model-v2");
    expect(stored?.inputText).toBe("Text v2");
    expect(stored?.embedding[0]).toBeCloseTo(0.99, 5);

    const count = db
      .prepare(
        `SELECT COUNT(*) as count FROM node_embeddings WHERE node_id = ?`
      )
      .get("test-node-2") as { count: number };
    expect(count.count).toBe(1);
  });

  it("should update vec table with correct dimensions", () => {
    db = openDatabase({ path: ":memory:" });
    createTestNodeInDb("test-node-3");

    // Use 4096-dimension embedding to match vec table schema
    const embedding = Array.from({ length: 4096 }, (_, i) => i / 4096);
    const result = storeEmbeddingWithVec(
      db,
      "test-node-3",
      embedding,
      "test-model",
      "[coding] Test"
    );

    expect(result.vecUpdated).toBeTruthy();

    const vecCount = db
      .prepare(`SELECT COUNT(*) as count FROM node_embeddings_vec`)
      .get() as { count: number };
    expect(vecCount.count).toBeGreaterThan(0);
  });

  it("should throw on dimension mismatch", () => {
    db = openDatabase({ path: ":memory:" });
    createTestNodeInDb("test-node-4");

    // Use small embedding that won't match vec table schema (4096)
    const embedding = [1, 0, 0, 0];

    expect(() => {
      storeEmbeddingWithVec(
        db,
        "test-node-4",
        embedding,
        "test-model",
        "[coding] Test"
      );
    }).toThrow("Dimension mismatch");

    // Verify embedding was NOT stored (transaction rolled back)
    expect(hasEmbedding(db, "test-node-4")).toBeFalsy();
  });
});

describe("hasEmbedding", () => {
  let db: Database.Database;

  afterEach(() => {
    if (db) {
      closeDatabase(db);
    }
  });

  function createTestNodeInDb(nodeId: string): void {
    db.prepare(
      `INSERT INTO nodes (id, version, session_file, type, project, outcome, data_file, timestamp, analyzed_at, analyzer_version)
       VALUES (?, 1, '/test.jsonl', 'coding', '/test/project', 'success', '/test.json', datetime('now'), datetime('now'), 'v1')`
    ).run(nodeId);
  }

  it("should return true when embedding exists", () => {
    db = openDatabase({ path: ":memory:" });
    createTestNodeInDb("node-with-embedding");

    storeEmbeddingWithVec(
      db,
      "node-with-embedding",
      createEmbedding(),
      "model",
      "text"
    );

    expect(hasEmbedding(db, "node-with-embedding")).toBeTruthy();
  });

  it("should return false when embedding does not exist", () => {
    db = openDatabase({ path: ":memory:" });
    createTestNodeInDb("node-without-embedding");

    expect(hasEmbedding(db, "node-without-embedding")).toBeFalsy();
  });
});

describe("deleteEmbedding", () => {
  let db: Database.Database;

  afterEach(() => {
    if (db) {
      closeDatabase(db);
    }
  });

  function createTestNodeInDb(nodeId: string): void {
    db.prepare(
      `INSERT INTO nodes (id, version, session_file, type, project, outcome, data_file, timestamp, analyzed_at, analyzer_version)
       VALUES (?, 1, '/test.jsonl', 'coding', '/test/project', 'success', '/test.json', datetime('now'), datetime('now'), 'v1')`
    ).run(nodeId);
  }

  it("should delete embedding from both tables", () => {
    db = openDatabase({ path: ":memory:" });
    createTestNodeInDb("node-to-delete");

    storeEmbeddingWithVec(
      db,
      "node-to-delete",
      createEmbedding(),
      "model",
      "text"
    );

    expect(hasEmbedding(db, "node-to-delete")).toBeTruthy();

    const deleted = deleteEmbedding(db, "node-to-delete");
    expect(deleted).toBeTruthy();
    expect(hasEmbedding(db, "node-to-delete")).toBeFalsy();
  });

  it("should return false when embedding does not exist", () => {
    db = openDatabase({ path: ":memory:" });

    const deleted = deleteEmbedding(db, "non-existent-node");
    expect(deleted).toBeFalsy();
  });
});

describe("serializeEmbedding and deserializeEmbedding", () => {
  it("should serialize and deserialize embedding correctly", () => {
    const original = [0.1, 0.2, 0.3, 0.4, 0.5];
    const buffer = serializeEmbedding(original);
    const restored = deserializeEmbedding(buffer);

    expect(buffer).toHaveLength(original.length * 4);

    for (let i = 0; i < original.length; i++) {
      expect(restored[i]).toBeCloseTo(original[i], 5);
    }
  });

  it("should handle empty embedding", () => {
    const original: number[] = [];
    const buffer = serializeEmbedding(original);
    const restored = deserializeEmbedding(buffer);

    expect(buffer).toHaveLength(0);
    expect(restored).toStrictEqual([]);
  });

  it("should handle large embeddings", () => {
    const original = Array.from({ length: 4096 }, () => Math.random());
    const buffer = serializeEmbedding(original);
    const restored = deserializeEmbedding(buffer);

    expect(buffer).toHaveLength(4096 * 4);
    for (let i = 0; i < original.length; i++) {
      expect(restored[i]).toBeCloseTo(original[i], 5);
    }
  });
});

// =============================================================================
// Backfill Tests
// =============================================================================

describe("findNodesNeedingEmbedding", () => {
  let db: Database.Database;
  const mockProvider = {
    embed: async (texts: string[]) => texts.map(() => createEmbedding(4096)),
    dimensions: 4096,
    modelName: "test-model",
  };

  /** Helper to insert a test node */
  function insertTestNode(
    nodeId: string,
    opts: { dataFile?: string; timestamp?: string } = {}
  ): void {
    const dataFile = opts.dataFile ?? `/data/${nodeId}.json`;
    const timestamp = opts.timestamp ?? "2026-01-27T12:00:00Z";
    db.prepare(
      `INSERT INTO nodes (id, version, session_file, type, project, outcome, data_file, timestamp, analyzed_at, analyzer_version)
       VALUES (?, 1, '/session.jsonl', 'coding', '/test/project', 'success', ?, ?, datetime('now'), 'v1')`
    ).run(nodeId, dataFile, timestamp);
  }

  afterEach(() => {
    if (db) {
      closeDatabase(db);
    }
  });

  it("should find nodes without embeddings", () => {
    db = openDatabase({ path: ":memory:" });
    insertTestNode("node-1");

    const nodes = findNodesNeedingEmbedding(db, mockProvider);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].id).toBe("node-1");
  });

  it("should skip nodes with valid embeddings", () => {
    db = openDatabase({ path: ":memory:" });
    insertTestNode("node-1");

    const richText = `[coding] Test summary\n\nDecisions:\n- Use X (why: because Y)\n\n${EMBEDDING_FORMAT_VERSION}`;
    storeEmbeddingWithVec(
      db,
      "node-1",
      createEmbedding(),
      "test-model",
      richText
    );

    const nodes = findNodesNeedingEmbedding(db, mockProvider);
    expect(nodes).toHaveLength(0);
  });

  it("should find nodes with old format embeddings", () => {
    db = openDatabase({ path: ":memory:" });
    insertTestNode("node-1");

    const oldText = "[coding] Test summary";
    storeEmbeddingWithVec(
      db,
      "node-1",
      createEmbedding(),
      "test-model",
      oldText
    );

    const nodes = findNodesNeedingEmbedding(db, mockProvider);
    expect(nodes).toHaveLength(1);
  });

  it("should find nodes with different model", () => {
    db = openDatabase({ path: ":memory:" });
    insertTestNode("node-1");

    storeEmbeddingWithVec(
      db,
      "node-1",
      createEmbedding(),
      "different-model",
      `[coding] Test\n\n${EMBEDDING_FORMAT_VERSION}`
    );

    const nodes = findNodesNeedingEmbedding(db, mockProvider);
    expect(nodes).toHaveLength(1);
  });

  it("should respect limit option", () => {
    db = openDatabase({ path: ":memory:" });

    for (let i = 0; i < 5; i++) {
      insertTestNode(`node-${i}`, { timestamp: `2026-01-27T12:0${i}:00Z` });
    }

    const nodes = findNodesNeedingEmbedding(db, mockProvider, { limit: 3 });
    expect(nodes).toHaveLength(3);
  });

  it("should return all nodes when force is true", () => {
    db = openDatabase({ path: ":memory:" });
    insertTestNode("node-1");
    storeEmbeddingWithVec(
      db,
      "node-1",
      createEmbedding(),
      "test-model",
      `[coding] Test\n\n${EMBEDDING_FORMAT_VERSION}`
    );

    expect(findNodesNeedingEmbedding(db, mockProvider)).toHaveLength(0);

    const nodes = findNodesNeedingEmbedding(db, mockProvider, { force: true });
    expect(nodes).toHaveLength(1);
  });

  it("should find older nodes even if recent nodes are valid (P0 fix)", () => {
    db = openDatabase({ path: ":memory:" });

    // Create 5 recent valid nodes
    for (let i = 0; i < 5; i++) {
      insertTestNode(`valid-${i}`, { timestamp: `2026-01-27T12:0${i}:00Z` });
      storeEmbeddingWithVec(
        db,
        `valid-${i}`,
        createEmbedding(),
        "test-model",
        `[coding] Test\n\n${EMBEDDING_FORMAT_VERSION}`
      );
    }

    // Create 1 old invalid node (no embedding)
    insertTestNode("old-invalid", { timestamp: "2025-01-01T00:00:00Z" });

    // With a limit of 3, a simple "ORDER BY timestamp DESC LIMIT 3" would only see
    // valid-4, valid-3, valid-2 and filter them all out, returning empty.
    // The fixed query should ignore the valid ones and find the old invalid one.
    const nodes = findNodesNeedingEmbedding(db, mockProvider, { limit: 3 });
    expect(nodes).toHaveLength(1);
    expect(nodes[0].id).toBe("old-invalid");
  });
});

describe("countNodesNeedingEmbedding", () => {
  let db: Database.Database;
  const mockProvider = {
    embed: async (texts: string[]) => texts.map(() => createEmbedding(4096)),
    dimensions: 4096,
    modelName: "test-model",
  };

  function insertTestNode(nodeId: string): void {
    db.prepare(
      `INSERT INTO nodes (id, version, session_file, type, project, outcome, data_file, timestamp, analyzed_at, analyzer_version)
       VALUES (?, 1, '/session.jsonl', 'coding', '/test/project', 'success', ?, datetime('now'), datetime('now'), 'v1')`
    ).run(nodeId, `/data/${nodeId}.json`);
  }

  afterEach(() => {
    if (db) {
      closeDatabase(db);
    }
  });

  it("should count nodes needing embedding", () => {
    db = openDatabase({ path: ":memory:" });

    for (let i = 0; i < 3; i++) {
      insertTestNode(`node-${i}`);
    }

    storeEmbeddingWithVec(
      db,
      "node-0",
      createEmbedding(),
      "test-model",
      `[coding] Test\n\n${EMBEDDING_FORMAT_VERSION}`
    );

    const result = countNodesNeedingEmbedding(db, mockProvider);
    expect(result.total).toBe(3);
    expect(result.needsEmbedding).toBe(2);
  });

  it("should return total for force mode", () => {
    db = openDatabase({ path: ":memory:" });

    for (let i = 0; i < 3; i++) {
      insertTestNode(`node-${i}`);
      storeEmbeddingWithVec(
        db,
        `node-${i}`,
        createEmbedding(),
        "test-model",
        `[coding] Test\n\n${EMBEDDING_FORMAT_VERSION}`
      );
    }

    const result = countNodesNeedingEmbedding(db, mockProvider, {
      force: true,
    });
    expect(result.total).toBe(3);
    expect(result.needsEmbedding).toBe(3);
  });
});

describe("backfillEmbeddings", () => {
  let db: Database.Database;
  let mockProvider: {
    embed: (texts: string[]) => Promise<number[][]>;
    dimensions: number;
    modelName: string;
  };
  let mockReadNode: (dataFile: string) => Node;

  function insertTestNode(
    nodeId: string,
    opts: { dataFile?: string; timestamp?: string } = {}
  ): void {
    const dataFile = opts.dataFile ?? `/data/${nodeId}.json`;
    const timestamp = opts.timestamp ?? "2026-01-27T12:00:00Z";
    db.prepare(
      `INSERT INTO nodes (id, version, session_file, type, project, outcome, data_file, timestamp, analyzed_at, analyzer_version)
       VALUES (?, 1, '/session.jsonl', 'coding', '/test/project', 'success', ?, ?, datetime('now'), 'v1')`
    ).run(nodeId, dataFile, timestamp);
  }

  afterEach(() => {
    if (db) {
      closeDatabase(db);
    }
  });

  it("should backfill missing embeddings", async () => {
    db = openDatabase({ path: ":memory:" });

    mockProvider = {
      embed: async (texts) => texts.map(() => createEmbedding(4096)),
      dimensions: 4096,
      modelName: "test-model",
    };

    mockReadNode = (dataFile: string) =>
      createTestNode({
        id: dataFile.replace("/data/", "").replace(".json", ""),
        content: {
          summary: "Test summary from JSON",
          outcome: "success",
          keyDecisions: [
            {
              what: "Use TypeScript",
              why: "Type safety",
              alternativesConsidered: [],
            },
          ],
          filesTouched: [],
          toolsUsed: [],
          errorsSeen: [],
        },
      });

    insertTestNode("node-1");

    const result = await backfillEmbeddings(db, mockProvider, mockReadNode);

    expect(result.totalNodes).toBe(1);
    expect(result.successCount).toBe(1);
    expect(result.failureCount).toBe(0);
    expect(result.failedNodeIds).toHaveLength(0);

    expect(hasEmbedding(db, "node-1")).toBeTruthy();
    const stored = getEmbedding(db, "node-1");
    expect(stored?.embedding).toHaveLength(4096);
    expect(isRichEmbeddingFormat(stored?.inputText ?? "")).toBeTruthy();
  });

  it("should handle empty database", async () => {
    db = openDatabase({ path: ":memory:" });

    mockProvider = {
      embed: async (texts) => texts.map(() => createEmbedding(4096)),
      dimensions: 4096,
      modelName: "test-model",
    };

    mockReadNode = () => createTestNode();

    const result = await backfillEmbeddings(db, mockProvider, mockReadNode);

    expect(result.totalNodes).toBe(0);
    expect(result.successCount).toBe(0);
    expect(result.failureCount).toBe(0);
  });

  it("should handle node loading failure gracefully", async () => {
    db = openDatabase({ path: ":memory:" });

    mockProvider = {
      embed: async (texts) => texts.map(() => createEmbedding(4096)),
      dimensions: 4096,
      modelName: "test-model",
    };

    mockReadNode = () => {
      throw new Error("Failed to load node");
    };

    insertTestNode("node-1");

    const result = await backfillEmbeddings(db, mockProvider, mockReadNode);

    expect(result.totalNodes).toBe(1);
    expect(result.successCount).toBe(0);
    expect(result.failureCount).toBe(1);
    expect(result.failedNodeIds).toContain("node-1");
  });

  it("should handle embedding API failure gracefully", async () => {
    db = openDatabase({ path: ":memory:" });

    mockProvider = {
      embed: async () => {
        throw new Error("API error");
      },
      dimensions: 4096,
      modelName: "test-model",
    };

    mockReadNode = () => createTestNode();

    insertTestNode("node-1");

    const result = await backfillEmbeddings(db, mockProvider, mockReadNode);

    expect(result.totalNodes).toBe(1);
    expect(result.successCount).toBe(0);
    expect(result.failureCount).toBe(1);
    expect(result.failedNodeIds).toContain("node-1");
  });

  it("should process multiple nodes in batches", async () => {
    db = openDatabase({ path: ":memory:" });

    let embedCallCount = 0;
    mockProvider = {
      embed: async (texts) => {
        embedCallCount++;
        return texts.map(() => createEmbedding(4096));
      },
      dimensions: 4096,
      modelName: "test-model",
    };

    mockReadNode = (dataFile: string) =>
      createTestNode({
        id: dataFile.replace("/data/", "").replace(".json", ""),
      });

    for (let i = 0; i < 5; i++) {
      insertTestNode(`node-${i}`, { timestamp: `2026-01-27T12:0${i}:00Z` });
    }

    const result = await backfillEmbeddings(db, mockProvider, mockReadNode, {
      batchSize: 2,
    });

    expect(result.totalNodes).toBe(5);
    expect(result.successCount).toBe(5);
    expect(embedCallCount).toBe(3);
  });

  it("should call progress callback", async () => {
    db = openDatabase({ path: ":memory:" });

    mockProvider = {
      embed: async (texts) => texts.map(() => createEmbedding(4096)),
      dimensions: 4096,
      modelName: "test-model",
    };

    mockReadNode = (dataFile: string) =>
      createTestNode({
        id: dataFile.replace("/data/", "").replace(".json", ""),
      });

    for (let i = 0; i < 5; i++) {
      insertTestNode(`node-${i}`, { timestamp: `2026-01-27T12:0${i}:00Z` });
    }

    const progressCalls: { processed: number; total: number }[] = [];

    await backfillEmbeddings(db, mockProvider, mockReadNode, {
      batchSize: 2,
      onProgress: (processed, total) => {
        progressCalls.push({ processed, total });
      },
    });

    expect(progressCalls).toHaveLength(3);
    expect(progressCalls[0]).toStrictEqual({ processed: 2, total: 5 });
    expect(progressCalls[1]).toStrictEqual({ processed: 4, total: 5 });
    expect(progressCalls[2]).toStrictEqual({ processed: 5, total: 5 });
  });

  it("should skip already embedded nodes unless force is true", async () => {
    db = openDatabase({ path: ":memory:" });

    mockProvider = {
      embed: async (texts) => texts.map(() => createEmbedding(4096)),
      dimensions: 4096,
      modelName: "test-model",
    };

    mockReadNode = (dataFile: string) =>
      createTestNode({
        id: dataFile.replace("/data/", "").replace(".json", ""),
      });

    insertTestNode("node-1");
    storeEmbeddingWithVec(
      db,
      "node-1",
      createEmbedding(),
      "test-model",
      `[coding] Test\n\n${EMBEDDING_FORMAT_VERSION}`
    );

    const result1 = await backfillEmbeddings(db, mockProvider, mockReadNode);
    expect(result1.totalNodes).toBe(0);

    const result2 = await backfillEmbeddings(db, mockProvider, mockReadNode, {
      force: true,
    });
    expect(result2.totalNodes).toBe(1);
    expect(result2.successCount).toBe(1);
  });
});
