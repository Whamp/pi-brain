import type { Database } from "better-sqlite3";

import { describe, it, expect, beforeEach, afterEach } from "vitest";

import type { Node, NodeType } from "../types/index.js";

import { openDatabase, migrate } from "../storage/database.js";
import { storeEmbeddingWithVec } from "../storage/embedding-utils.js";
import { insertNodeToDb } from "../storage/node-crud.js";
import {
  semanticSearch,
  findSimilarNodes,
} from "../storage/semantic-search.js";

function createTestNode(id: string, summary: string, type = "coding"): Node {
  return {
    id,
    version: 1,
    previousVersions: [],
    source: {
      sessionFile: `/sessions/${id}.jsonl`,
      segment: { startEntryId: "1", endEntryId: "10", entryCount: 10 },
      computer: "test",
      sessionId: id,
    },
    classification: {
      type: type as NodeType,
      project: "/test/project",
      isNewProject: false,
      hadClearGoal: true,
    },
    content: {
      summary,
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
      tokensUsed: 100,
      cost: 0.01,
      durationMinutes: 5,
      timestamp: new Date().toISOString(),
      analyzedAt: new Date().toISOString(),
      analyzerVersion: "1.0",
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
}

describe("semantic Search Integration", () => {
  let db: Database;

  beforeEach(() => {
    db = openDatabase({ path: ":memory:" });
    migrate(db);

    // Recreate virtual table with small dimensions for testing
    // Migration creates it with 4096 dimensions
    try {
      db.exec("DROP TABLE IF EXISTS node_embeddings_vec");
      db.exec(
        "CREATE VIRTUAL TABLE node_embeddings_vec USING vec0(embedding float[4])"
      );
    } catch {
      // If sqlite-vec is not loaded, this might fail or table might not exist
      // We check for capability in individual tests or rely on openDatabase loading it
    }
  });

  afterEach(() => {
    db.close();
  });

  it("should find similar nodes using vector search", () => {
    // Skip if sqlite-vec not loaded
    try {
      db.prepare("SELECT vec_version()").get();
    } catch {
      console.warn("Skipping semantic search test: sqlite-vec not available");
      return;
    }

    // Insert nodes
    const node1 = createTestNode("1", "Implementation of auth");
    const node2 = createTestNode("2", "Debugging auth");
    const node3 = createTestNode("3", "UI styling");

    insertNodeToDb(db, node1, "data1.json");
    insertNodeToDb(db, node2, "data2.json");
    insertNodeToDb(db, node3, "data3.json");

    // Insert embeddings (4 dimensions)
    // node1: [1, 0, 0, 0] (Base auth)
    // node2: [0.9, 0.1, 0, 0] (Similar to node1)
    // node3: [0, 0, 1, 0] (Different)

    storeEmbeddingWithVec(db, "1", [1, 0, 0, 0], "test-model", "Auth impl");
    storeEmbeddingWithVec(
      db,
      "2",
      [0.9, 0.1, 0, 0],
      "test-model",
      "Auth debug"
    );
    storeEmbeddingWithVec(db, "3", [0, 0, 1, 0], "test-model", "UI stuff");

    // Search for vector close to node1/node2
    const results = semanticSearch(db, [1, 0, 0, 0], { limit: 2 });

    expect(results).toHaveLength(2);
    expect(results[0].node.id).toBe("1"); // Exact match
    expect(results[1].node.id).toBe("2"); // Close match
    expect(results[0].distance).toBeLessThan(results[1].distance);
  });

  it("should filter results by metadata", () => {
    try {
      db.prepare("SELECT vec_version()").get();
    } catch {
      return;
    }

    const node1 = createTestNode("1", "Node 1", "coding");
    const node2 = createTestNode("2", "Node 2", "debugging");

    insertNodeToDb(db, node1, "data1.json");
    insertNodeToDb(db, node2, "data2.json");

    storeEmbeddingWithVec(db, "1", [1, 0, 0, 0], "test-model", "Text 1");
    storeEmbeddingWithVec(db, "2", [1, 0, 0, 0], "test-model", "Text 2");

    // Search with filter
    const results = semanticSearch(db, [1, 0, 0, 0], {
      filters: { type: "debugging" },
    });

    expect(results).toHaveLength(1);
    expect(results[0].node.id).toBe("2");
  });

  it("should find similar nodes to a given node", () => {
    try {
      db.prepare("SELECT vec_version()").get();
    } catch {
      return;
    }

    const node1 = createTestNode("1", "Base");
    const node2 = createTestNode("2", "Similar");
    const node3 = createTestNode("3", "Different");

    insertNodeToDb(db, node1, "d1");
    insertNodeToDb(db, node2, "d2");
    insertNodeToDb(db, node3, "d3");

    storeEmbeddingWithVec(db, "1", [1, 0, 0, 0], "test-model", "t1");
    storeEmbeddingWithVec(db, "2", [0.9, 0.1, 0, 0], "test-model", "t2");
    storeEmbeddingWithVec(db, "3", [0, 0, 1, 0], "test-model", "t3");

    const similar = findSimilarNodes(db, "1", { limit: 1 });

    expect(similar).toHaveLength(1);
    expect(similar[0].node.id).toBe("2"); // Should be node 2 (similar), excluding self (node 1)
  });
});
