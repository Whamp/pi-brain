import type Database from "better-sqlite3";
import type * as ChildProcess from "node:child_process";

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import type { DaemonConfig } from "../config/types.js";
import type { Node } from "../types/index.js";
import type { EmbeddingProvider } from "./facet-discovery.js";

import { openDatabase } from "../storage/database.js";
import { storeEmbeddingWithVec } from "../storage/embedding-utils.js";
import { createNode } from "../storage/node-crud.js";
import { processQuery, type QueryRequest } from "./query-processor.js";

// Mocks
vi.mock<typeof ChildProcess>("node:child_process", () => ({
  spawn: vi.fn().mockReturnValue({
    stdout: {
      /* eslint-disable promise/prefer-await-to-callbacks */
      on: vi.fn((_event, cb) => {
        const output = {
          type: "agent_end",
          messages: [
            {
              role: "assistant",
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    answer: "Mocked answer",
                    summary: "Mocked summary",
                    confidence: "high",
                    sources: [],
                  }),
                },
              ],
            },
          ],
        };
        cb(Buffer.from(JSON.stringify(output)));
      }),
    },
    stderr: { on: vi.fn() },
    on: vi.fn((event, cb) => {
      if (event === "close") {
        cb(0);
      }
    }),
    /* eslint-enable promise/prefer-await-to-callbacks */
    kill: vi.fn(),
    unref: vi.fn(),
  }),
}));

// Helper to create a dummy node
function createDummyNode(id: string, summary: string): Node {
  return {
    id,
    version: 1,
    previousVersions: [],
    source: {
      sessionFile: `session-${id}.jsonl`,
      segment: {
        startEntryId: "00000001",
        endEntryId: "00000005",
        entryCount: 5,
      },
      computer: "test-host",
      sessionId: "test-session-id",
    },
    classification: {
      type: "coding",
      project: "/test",
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
      tokensUsed: 1000,
      cost: 0.002,
      durationMinutes: 5,
      timestamp: new Date().toISOString(),
      analyzedAt: new Date().toISOString(),
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
}

describe("semantic Search Integration", () => {
  let db: Database.Database;

  const mockLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };

  const mockConfig: DaemonConfig = {
    provider: "test",
    model: "test",
    analysisTimeoutMinutes: 1,
  } as unknown as DaemonConfig;

  beforeEach(() => {
    // Open in-memory DB and run migrations
    db = openDatabase({ path: ":memory:", migrate: true });
  });

  afterEach(() => {
    db.close();
  });

  it("should find nodes semantically when keywords don't match", async () => {
    // 1. Setup nodes and embeddings
    const node1 = createDummyNode(
      "node1",
      "Authentication implementation using JWT"
    );
    const node2 = createDummyNode(
      "node2",
      "Database schema migration for users"
    );

    createNode(db, node1);
    createNode(db, node2);

    // Manual embeddings (4096 dimensions)
    const vec1 = Array.from({ length: 4096 }).fill(0) as number[];
    vec1[0] = 1;

    const vec2 = Array.from({ length: 4096 }).fill(0) as number[];
    vec2[1] = 1;

    storeEmbeddingWithVec(db, node1.id, vec1, "test-model", "Auth JWT");
    storeEmbeddingWithVec(db, node2.id, vec2, "test-model", "User Schema");

    // 2. Mock embedding provider for the query
    // Query: "How do I handle login?"
    // We want it to be close to node1
    const queryVec = Array.from({ length: 4096 }).fill(0) as number[];
    queryVec[0] = 0.9; // Close to vec1

    const mockEmbeddingProvider: EmbeddingProvider = {
      embed: vi.fn().mockResolvedValue([queryVec]),
      dimensions: 4096,
      modelName: "test-model",
    };

    // 3. Process query
    const request: QueryRequest = { query: "How do I handle login?" };
    const response = await processQuery(request, {
      db,
      daemonConfig: mockConfig,
      logger: mockLogger,
      embeddingProvider: mockEmbeddingProvider,
      semanticSearchThreshold: 0.5,
    });

    // 4. Verify results
    expect(response.relatedNodes).toHaveLength(1);
    expect(response.relatedNodes[0].id).toBe("node1");
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining("Semantic search found")
    );
  });

  it("should fall back to FTS when semantic search distance is too high", async () => {
    // 1. Setup node with specific keywords
    // FTS matches keywords. "SpecialUniqueKeyword" is not in the embedding text but it IS in the summary.
    const node1 = createDummyNode("node1", "SpecialUniqueKeyword search test");
    createNode(db, node1);

    // Embedding far away from everything
    const vec1 = Array.from({ length: 4096 }).fill(0) as number[];
    vec1[500] = 1;
    storeEmbeddingWithVec(db, node1.id, vec1, "test-model", "Some random text");

    // 2. Query with the keyword but a very different semantic meaning (simulated by vector)
    const queryVec = Array.from({ length: 4096 }).fill(0) as number[];
    queryVec[1000] = 1; // Very far from vec1 (distance ~1.0)

    const mockEmbeddingProvider: EmbeddingProvider = {
      embed: vi.fn().mockResolvedValue([queryVec]),
      dimensions: 4096,
      modelName: "test-model",
    };

    // 3. Process query
    const request: QueryRequest = { query: "SpecialUniqueKeyword" };
    const response = await processQuery(request, {
      db,
      daemonConfig: mockConfig,
      logger: mockLogger,
      embeddingProvider: mockEmbeddingProvider,
      semanticSearchThreshold: 0.5, // Distance threshold
    });

    // 4. Verify results
    // Semantic search should find nothing because distance (1.0) > threshold (0.5)
    // FTS should find node1 by keyword
    expect(response.relatedNodes).toHaveLength(1);
    expect(response.relatedNodes[0].id).toBe("node1");
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining(
        "Semantic search returned no results, falling back to FTS"
      )
    );
  });

  it("should combine semantic search with project filtering", async () => {
    // 1. Setup nodes and embeddings
    const node1 = createDummyNode("node1", "Auth in project A");
    node1.classification.project = "/project-a";
    const node2 = createDummyNode("node2", "Auth in project B");
    node2.classification.project = "/project-b";

    createNode(db, node1);
    createNode(db, node2);

    // Both have same embedding vector
    const vec = Array.from({ length: 4096 }).fill(0) as number[];
    vec[0] = 1;

    storeEmbeddingWithVec(db, node1.id, vec, "test-model", "Auth");
    storeEmbeddingWithVec(db, node2.id, vec, "test-model", "Auth");

    const queryVec = Array.from({ length: 4096 }).fill(0) as number[];
    queryVec[0] = 1;

    const mockEmbeddingProvider: EmbeddingProvider = {
      embed: vi.fn().mockResolvedValue([queryVec]),
      dimensions: 4096,
      modelName: "test-model",
    };

    // 2. Query with project filter
    const request: QueryRequest = {
      query: "Auth",
      context: { project: "/project-b" },
    };
    const response = await processQuery(request, {
      db,
      daemonConfig: mockConfig,
      logger: mockLogger,
      embeddingProvider: mockEmbeddingProvider,
      semanticSearchThreshold: 0.5,
    });

    // 3. Verify results
    // It should only return node2 because node1 is in a different project
    expect(response.relatedNodes).toHaveLength(1);
    expect(response.relatedNodes[0].id).toBe("node2");
  });

  it("should fall back to FTS when embedding dimensions mismatch", async () => {
    // 1. Setup node with 4096-dim embedding (standard in our test migrations)
    const node1 = createDummyNode("node1", "Dimension mismatch test");
    createNode(db, node1);
    const vec4096 = Array.from({ length: 4096 }).fill(0) as number[];
    storeEmbeddingWithVec(db, node1.id, vec4096, "model-4096", "Text");

    // 2. Mock provider with DIFFERENT dimensions (e.g. 1536)
    const queryVec1536 = Array.from({ length: 1536 }).fill(0) as number[];
    const mockEmbeddingProvider: EmbeddingProvider = {
      embed: vi.fn().mockResolvedValue([queryVec1536]),
      dimensions: 1536,
      modelName: "model-1536",
    };

    // 3. Process query
    const request: QueryRequest = { query: "Dimension" };
    const response = await processQuery(request, {
      db,
      daemonConfig: mockConfig,
      logger: mockLogger,
      embeddingProvider: mockEmbeddingProvider,
      semanticSearchThreshold: 0.5,
    });

    // 4. Verify results
    // It should fall back to FTS because sqlite-vec will return [] on dimension mismatch
    expect(response.relatedNodes).toHaveLength(1);
    expect(response.relatedNodes[0].id).toBe("node1");
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining(
        "Semantic search returned no results, falling back to FTS"
      )
    );
  });
});
