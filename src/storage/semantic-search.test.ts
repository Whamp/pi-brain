import type { Database } from "better-sqlite3";

import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

import { isVecLoaded } from "./database.js";
import { deserializeEmbedding } from "./embedding-utils.js";
import {
  semanticSearch,
  findSimilarNodes,
  getNodeEmbeddingVector,
} from "./semantic-search.js";

// Mocks
vi.mock("./database.js", () => ({
  isVecLoaded: vi.fn(),
}));

vi.mock("./embedding-utils.js", () => ({
  deserializeEmbedding: vi.fn(),
}));

// Mock Database
const mockPrepare = vi.fn();
const mockDb = {
  prepare: mockPrepare,
} as unknown as Database;

// Helper to create mock node rows
const createMockNode = (id: string, title: string) => ({
  id,
  type: "coding",
  project: "/test/project",
  summary: title,
  // ... other fields as needed
});

describe("semantic Search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("semanticSearch", () => {
    it("should return empty array if vec extension not loaded", () => {
      (isVecLoaded as Mock).mockReturnValue(false);

      const result = semanticSearch(mockDb, [1, 2, 3]);
      expect(result).toStrictEqual([]);
      expect(mockPrepare).not.toHaveBeenCalled();
    });

    it("should execute vector search query", () => {
      (isVecLoaded as Mock).mockReturnValue(true);
      mockPrepare.mockReturnValue({
        all: vi.fn().mockReturnValue([
          {
            ...createMockNode("1", "Node 1"),
            distance: 0.1,
            input_text: "Summary 1",
          },
          {
            ...createMockNode("2", "Node 2"),
            distance: 0.5,
            input_text: "Summary 2",
          },
        ]),
      });

      const queryEmbedding = [0.1, 0.2, 0.3];
      const result = semanticSearch(mockDb, queryEmbedding, { limit: 10 });

      expect(result).toHaveLength(2);
      expect(result[0].node.id).toBe("1");
      expect(result[0].distance).toBe(0.1);
      expect(result[0].score).toBeCloseTo(1 / 1.1); // 1 / (1 + distance)

      expect(mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining("FROM node_embeddings_vec v")
      );
      expect(mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining("v.embedding MATCH ?")
      );
    });

    it("should filter by maxDistance", () => {
      (isVecLoaded as Mock).mockReturnValue(true);
      mockPrepare.mockReturnValue({
        all: vi.fn().mockReturnValue([
          {
            ...createMockNode("1", "Close Node"),
            distance: 0.1,
            input_text: "Text",
          },
          {
            ...createMockNode("2", "Far Node"),
            distance: 0.9,
            input_text: "Text",
          },
        ]),
      });

      const result = semanticSearch(mockDb, [0, 0], { maxDistance: 0.5 });

      expect(result).toHaveLength(1);
      expect(result[0].node.id).toBe("1");
    });

    it("should apply filters", () => {
      (isVecLoaded as Mock).mockReturnValue(true);
      mockPrepare.mockReturnValue({
        all: vi.fn().mockReturnValue([]),
      });

      semanticSearch(mockDb, [0, 0], {
        filters: { type: "coding", project: "pi" },
      });

      // Using destructuring as linter suggests
      const [sqlCall] = mockPrepare.mock.calls[0] as [string];
      expect(sqlCall).toContain("n.type = ?");
      expect(sqlCall).toContain("n.project LIKE ?");
    });

    it("should handle dimension mismatch errors gracefully", () => {
      (isVecLoaded as Mock).mockReturnValue(true);
      mockPrepare.mockImplementation(() => {
        throw new Error("vec_f32 dimensions mismatch");
      });

      const result = semanticSearch(mockDb, [1, 2]); // Too few dims maybe?
      expect(result).toStrictEqual([]);
    });

    it("should return empty array when database has no matching nodes", () => {
      (isVecLoaded as Mock).mockReturnValue(true);
      mockPrepare.mockReturnValue({
        all: vi.fn().mockReturnValue([]),
      });

      const result = semanticSearch(mockDb, [0.5, 0.5, 0.5]);
      expect(result).toStrictEqual([]);
    });

    it("should preserve distance ordering from database", () => {
      (isVecLoaded as Mock).mockReturnValue(true);
      // Return results in order: closest first
      mockPrepare.mockReturnValue({
        all: vi.fn().mockReturnValue([
          {
            ...createMockNode("closest", "Closest Node"),
            distance: 0.05,
            input_text: "Very close",
          },
          {
            ...createMockNode("mid", "Middle Node"),
            distance: 0.3,
            input_text: "Middle distance",
          },
          {
            ...createMockNode("far", "Far Node"),
            distance: 0.7,
            input_text: "Far away",
          },
        ]),
      });

      const result = semanticSearch(mockDb, [1, 0, 0]);

      expect(result).toHaveLength(3);
      // Verify ordering by distance (ascending)
      expect(result[0].distance).toBe(0.05);
      expect(result[1].distance).toBe(0.3);
      expect(result[2].distance).toBe(0.7);
      // Verify scores are inverse of distance (higher is better)
      expect(result[0].score).toBeGreaterThan(result[1].score);
      expect(result[1].score).toBeGreaterThan(result[2].score);
    });

    it("should generate highlights when includeHighlights is true", () => {
      (isVecLoaded as Mock).mockReturnValue(true);
      mockPrepare.mockReturnValue({
        all: vi.fn().mockReturnValue([
          {
            ...createMockNode("1", "Node with highlights"),
            distance: 0.2,
            input_text:
              "[coding] Implemented caching layer\n\nDecisions:\n- Used Redis",
          },
        ]),
      });

      const result = semanticSearch(mockDb, [1, 0], {
        includeHighlights: true,
      });

      expect(result).toHaveLength(1);
      expect(result[0].highlights).toHaveLength(1);
      expect(result[0].highlights[0].field).toBe("summary");
      expect(result[0].highlights[0].snippet).toBe(
        "[coding] Implemented caching layer"
      );
    });

    it("should not generate highlights when includeHighlights is false", () => {
      (isVecLoaded as Mock).mockReturnValue(true);
      mockPrepare.mockReturnValue({
        all: vi.fn().mockReturnValue([
          {
            ...createMockNode("1", "Node without highlights"),
            distance: 0.2,
            input_text: "[coding] Some summary text",
          },
        ]),
      });

      const result = semanticSearch(mockDb, [1, 0], {
        includeHighlights: false,
      });

      expect(result).toHaveLength(1);
      expect(result[0].highlights).toHaveLength(0);
    });

    it("should use default limit of 20", () => {
      (isVecLoaded as Mock).mockReturnValue(true);
      const mockAll = vi.fn().mockReturnValue([]);
      mockPrepare.mockReturnValue({ all: mockAll });

      semanticSearch(mockDb, [1, 0]);

      // The query should use LIMIT 20 (default)
      const [, ...params] = mockAll.mock.calls[0] as unknown[];
      // Last param is the limit
      expect(params.at(-1)).toBe(20);
    });

    it("should respect custom limit option", () => {
      (isVecLoaded as Mock).mockReturnValue(true);
      const mockAll = vi.fn().mockReturnValue([]);
      mockPrepare.mockReturnValue({ all: mockAll });

      semanticSearch(mockDb, [1, 0], { limit: 5 });

      const [, ...params] = mockAll.mock.calls[0] as unknown[];
      expect(params.at(-1)).toBe(5);
    });

    it("should rethrow non-dimension errors", () => {
      (isVecLoaded as Mock).mockReturnValue(true);
      mockPrepare.mockImplementation(() => {
        throw new Error("SQLITE_ERROR: no such table: node_embeddings_vec");
      });

      expect(() => semanticSearch(mockDb, [1, 2, 3])).toThrow("no such table");
    });
  });

  describe("findSimilarNodes", () => {
    it("should return empty if node has no embedding", () => {
      mockPrepare.mockReturnValue({
        get: vi.fn().mockReturnValue(null), // No embedding found
      });

      const result = findSimilarNodes(mockDb, "missing-node");
      expect(result).toStrictEqual([]);
    });

    it("should search using node embedding and exclude self", () => {
      // Mock getting node embedding
      mockPrepare.mockReturnValueOnce({
        get: vi.fn().mockReturnValue({ embedding: Buffer.from("fake") }),
      });
      (deserializeEmbedding as Mock).mockReturnValue([1, 0, 0]);

      (isVecLoaded as Mock).mockReturnValue(true);

      // Mock search results (including self)
      mockPrepare.mockReturnValueOnce({
        all: vi.fn().mockReturnValue([
          {
            ...createMockNode("target-id", "Target"),
            distance: 0,
            input_text: "Target",
          },
          {
            ...createMockNode("other-1", "Other 1"),
            distance: 0.2,
            input_text: "Other",
          },
        ]),
      });

      const result = findSimilarNodes(mockDb, "target-id", { limit: 5 });

      expect(result).toHaveLength(1);
      expect(result[0].node.id).toBe("other-1");

      // Verify fetching embedding
      expect(mockPrepare).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining("SELECT embedding FROM node_embeddings")
      );
    });

    it("should respect limit option when filtering out self", () => {
      // Mock getting node embedding
      mockPrepare.mockReturnValueOnce({
        get: vi.fn().mockReturnValue({ embedding: Buffer.from("fake") }),
      });
      (deserializeEmbedding as Mock).mockReturnValue([1, 0, 0]);
      (isVecLoaded as Mock).mockReturnValue(true);

      // Return 4 results including self
      mockPrepare.mockReturnValueOnce({
        all: vi.fn().mockReturnValue([
          {
            ...createMockNode("self", "Self"),
            distance: 0,
            input_text: "Self",
          },
          {
            ...createMockNode("a", "A"),
            distance: 0.1,
            input_text: "A",
          },
          {
            ...createMockNode("b", "B"),
            distance: 0.2,
            input_text: "B",
          },
          {
            ...createMockNode("c", "C"),
            distance: 0.3,
            input_text: "C",
          },
        ]),
      });

      // Request limit: 2
      const result = findSimilarNodes(mockDb, "self", { limit: 2 });

      // Should return exactly 2 after filtering out self
      expect(result).toHaveLength(2);
      expect(result.map((r) => r.node.id)).toStrictEqual(["a", "b"]);
    });
  });

  describe("getNodeEmbeddingVector", () => {
    it("should return null if node has no embedding", () => {
      mockPrepare.mockReturnValue({
        get: vi.fn().mockReturnValue(null),
      });

      const result = getNodeEmbeddingVector(mockDb, "missing-node");
      expect(result).toBeNull();
    });

    it("should deserialize and return embedding vector", () => {
      const mockEmbedding = Buffer.from("test-embedding");
      mockPrepare.mockReturnValue({
        get: vi.fn().mockReturnValue({ embedding: mockEmbedding }),
      });
      (deserializeEmbedding as Mock).mockReturnValue([0.1, 0.2, 0.3]);

      const result = getNodeEmbeddingVector(mockDb, "node-123");

      expect(result).toStrictEqual([0.1, 0.2, 0.3]);
      expect(deserializeEmbedding).toHaveBeenCalledWith(mockEmbedding);
    });

    it("should query correct table with node_id", () => {
      mockPrepare.mockReturnValue({
        get: vi.fn().mockReturnValue(null),
      });

      getNodeEmbeddingVector(mockDb, "test-node-id");

      expect(mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining(
          "SELECT embedding FROM node_embeddings WHERE node_id = ?"
        )
      );
    });
  });
});
