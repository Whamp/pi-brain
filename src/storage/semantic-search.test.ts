import type { Database } from "better-sqlite3";

import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

import type * as DatabaseModule from "./database.js";
import type * as EmbeddingUtilsModule from "./embedding-utils.js";

import { isVecLoaded } from "./database.js";
import { deserializeEmbedding } from "./embedding-utils.js";
import { semanticSearch, findSimilarNodes } from "./semantic-search.js";

// Mocks
vi.mock<typeof DatabaseModule>("./database.js", () => ({
  isVecLoaded: vi.fn(),
}));

vi.mock<typeof EmbeddingUtilsModule>("./embedding-utils.js", () => ({
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
  });

  describe("findSimilarNodes", () => {
    it("should return empty if node has no embedding", () => {
      mockPrepare.mockReturnValue({
        get: vi.fn().mockReturnValue(), // No embedding found
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
  });
});
