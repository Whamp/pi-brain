import type { Database } from "better-sqlite3";

import { spawn } from "node:child_process";
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

import type { DaemonConfig } from "../config/types.js";
import type { EmbeddingProvider } from "./facet-discovery.js";

import { findBridgePaths } from "../storage/bridge-discovery.js";
import { hybridSearch } from "../storage/hybrid-search.js";
import { listNodes } from "../storage/node-queries.js";
import { processQuery, type QueryRequest } from "./query-processor.js";

// Mocks
vi.mock("../storage/database.js", () => ({
  isVecLoaded: vi.fn(() => true),
}));

vi.mock("../storage/hybrid-search.js", () => ({
  hybridSearch: vi.fn(),
}));

vi.mock("../storage/bridge-discovery.js", () => ({
  findBridgePaths: vi.fn(() => []),
}));

vi.mock("../storage/node-queries.js", () => ({
  listNodes: vi.fn(),
}));

vi.mock("../storage/quirk-repository.js", () => ({
  getAggregatedQuirks: vi.fn(() => []),
}));

vi.mock("../storage/tool-error-repository.js", () => ({
  getAggregatedToolErrors: vi.fn(() => []),
}));

vi.mock("node:child_process", () => ({
  spawn: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({
  access: vi.fn(),
}));

// Mock Database
const mockDb = {} as unknown as Database;

// Mock Logger
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
};

// Mock Daemon Config
const mockDaemonConfig = {
  provider: "test-provider",
  model: "test-model",
  analysisTimeoutMinutes: 1,
} as unknown as DaemonConfig;

// Mock Embedding Provider
function createMockEmbeddingProvider(): EmbeddingProvider {
  return {
    embed: vi.fn().mockResolvedValue([[0.1, 0.2, 0.3]]),
    dimensions: 3,
    modelName: "test-embedding-model",
  };
}

describe("query Processor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("processQuery", () => {
    it("should return early if no nodes found", async () => {
      (hybridSearch as Mock).mockReturnValue({ results: [] });
      (listNodes as Mock).mockReturnValue({ nodes: [] });

      const request: QueryRequest = { query: "nothing here" };
      const response = await processQuery(request, {
        db: mockDb,
        daemonConfig: mockDaemonConfig,
        logger: mockLogger,
      });

      expect(response.confidence).toBe("high");
      expect(response.summary).toContain("No matching sessions found");
      expect(response.relatedNodes).toHaveLength(0);
    });

    it("should process query with relevant nodes and bridge paths", async () => {
      // Mock search results
      (hybridSearch as Mock).mockReturnValue({
        results: [
          {
            node: {
              id: "1",
              summary: "Node 1",
              session_file: "s1.jsonl",
              timestamp: "2023-01-01",
              type: "coding",
              project: "/test",
              outcome: "success",
            },
            score: 0.9,
            breakdown: {},
          },
        ],
      });

      // Mock bridge paths
      (findBridgePaths as Mock).mockReturnValue([
        {
          nodes: [],
          edges: [],
          score: 0.8,
          description: "Node 1 leads to Node 2",
        },
      ]);

      // Mock pi agent spawning
      const mockProc = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
        kill: vi.fn(),
        unref: vi.fn(),
      };
      (spawn as Mock).mockReturnValue(mockProc);

      // Simulate pi output
      /* eslint-disable promise/prefer-await-to-callbacks */
      mockProc.stdout.on.mockImplementation(
        (_event: string, cb: (data: Buffer) => void) => {
          const output = {
            type: "agent_end",
            messages: [
              {
                role: "assistant",
                content: [
                  {
                    type: "text",
                    text: JSON.stringify({
                      answer: "This is the answer",
                      summary: "Short summary",
                      confidence: "high",
                      sources: [],
                    }),
                  },
                ],
              },
            ],
          };
          cb(Buffer.from(`${JSON.stringify(output)}\n`));
        }
      );

      mockProc.on.mockImplementation(
        (event: string, cb: (code: number) => void) => {
          if (event === "close") {
            cb(0);
          }
        }
      );
      /* eslint-enable promise/prefer-await-to-callbacks */

      const request: QueryRequest = { query: "test query" };
      const response = await processQuery(request, {
        db: mockDb,
        daemonConfig: mockDaemonConfig,
        logger: mockLogger,
      });

      expect(response.answer).toBe("This is the answer");
      expect(response.relatedNodes).toHaveLength(1);
      expect(response.relatedNodes[0].id).toBe("1");
      expect(findBridgePaths).toHaveBeenCalled();
    });

    it("should handle pi agent errors", async () => {
      // Mock search results
      (hybridSearch as Mock).mockReturnValue({
        results: [
          {
            node: {
              id: "1",
              summary: "Node 1",
              session_file: "s1.jsonl",
              timestamp: "2023-01-01",
              type: "coding",
              project: "/test",
              outcome: "success",
            },
            score: 0.9,
            breakdown: {},
          },
        ],
      });

      // Mock pi agent spawning failure
      const mockProc = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
        kill: vi.fn(),
        unref: vi.fn(),
      };
      (spawn as Mock).mockReturnValue(mockProc);

      /* eslint-disable promise/prefer-await-to-callbacks */
      mockProc.on.mockImplementation(
        (event: string, cb: (err: Error) => void) => {
          if (event === "error") {
            cb(new Error("Spawn failed"));
          }
        }
      );
      /* eslint-enable promise/prefer-await-to-callbacks */

      const request: QueryRequest = { query: "test query" };
      const response = await processQuery(request, {
        db: mockDb,
        daemonConfig: mockDaemonConfig,
        logger: mockLogger,
      });

      expect(response.confidence).toBe("low");
      expect(response.summary).toContain("failed");
    });
  });

  describe("hybrid search integration", () => {
    it("should use hybrid search with embedding when provider is configured", async () => {
      const mockEmbeddingProvider = createMockEmbeddingProvider();

      // Mock hybrid search returning results
      (hybridSearch as Mock).mockReturnValue({
        results: [
          {
            node: {
              id: "sem-1",
              summary: "Hybrid result",
              session_file: "s1.jsonl",
              timestamp: "2023-01-01",
              type: "coding",
              project: "/test",
              outcome: "success",
            },
            score: 0.95,
            breakdown: { vector: 0.9, keyword: 0.8 },
          },
        ],
      });

      const request: QueryRequest = { query: "test query" };
      const response = await processQuery(request, {
        db: mockDb,
        daemonConfig: mockDaemonConfig,
        logger: mockLogger,
        embeddingProvider: mockEmbeddingProvider,
        semanticSearchThreshold: 0.5,
      });

      // Verify embedding was generated
      expect(mockEmbeddingProvider.embed).toHaveBeenCalledWith(["test query"]);

      // Verify hybrid search was called with embedding
      expect(hybridSearch).toHaveBeenCalledWith(
        mockDb,
        "test query",
        expect.objectContaining({
          limit: 10,
          queryEmbedding: [0.1, 0.2, 0.3],
        })
      );

      // Check the response uses hybrid results
      expect(response.relatedNodes).toHaveLength(1);
      expect(response.relatedNodes[0].id).toBe("sem-1");
    });

    it("should fall back to recent nodes when hybrid search returns no results and no query/embedding", async () => {
      // Mock hybrid search returning empty
      (hybridSearch as Mock).mockReturnValue({ results: [] });

      (listNodes as Mock).mockReturnValue({
        nodes: [
          {
            id: "recent-1",
            summary: "Recent node",
            timestamp: "2023-01-02",
            type: "coding",
            session_file: "s2.jsonl",
          },
        ],
      });

      // Note: processQuery calls findRelevantNodes which checks if query/embedding exists before fallback
      // So pass empty query and undefined embedding provider
      const request: QueryRequest = { query: "" };
      const response = await processQuery(request, {
        db: mockDb,
        daemonConfig: mockDaemonConfig,
        logger: mockLogger,
      });

      // Verify fallback to listNodes
      expect(listNodes).toHaveBeenCalled();
      expect(response.relatedNodes).toHaveLength(1);
      expect(response.relatedNodes[0].id).toBe("recent-1");
    });

    it("should handle embedding generation errors gracefully", async () => {
      const mockEmbeddingProvider = createMockEmbeddingProvider();
      (mockEmbeddingProvider.embed as Mock).mockRejectedValue(
        new Error("API rate limit exceeded")
      );

      // Hybrid search still called but without embedding
      (hybridSearch as Mock).mockReturnValue({
        results: [
          {
            node: {
              id: "hybrid-no-embed",
              summary: "Result without embedding",
              session_file: "s3.jsonl",
              timestamp: "2023-01-03",
              type: "coding",
              project: "/test",
              outcome: "success",
            },
            score: 0.7,
            breakdown: {},
          },
        ],
      });

      const request: QueryRequest = { query: "error test" };
      const response = await processQuery(request, {
        db: mockDb,
        daemonConfig: mockDaemonConfig,
        logger: mockLogger,
        embeddingProvider: mockEmbeddingProvider,
      });

      // Verify warning was logged
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Embedding generation failed")
      );

      // Hybrid search was called (without embedding)
      expect(hybridSearch).toHaveBeenCalledWith(
        mockDb,
        "error test",
        expect.objectContaining({
          queryEmbedding: undefined,
        })
      );

      // Response uses results
      expect(response.relatedNodes).toHaveLength(1);
      expect(response.relatedNodes[0].id).toBe("hybrid-no-embed");
    });

    it("should disable bridge discovery if requested", async () => {
      // Mock search results
      (hybridSearch as Mock).mockReturnValue({
        results: [
          {
            node: {
              id: "1",
              summary: "Node 1",
              session_file: "s1.jsonl",
              timestamp: "2023-01-01",
            },
            score: 0.9,
            breakdown: {},
          },
        ],
      });

      (findBridgePaths as Mock).mockReturnValue([]);

      const request: QueryRequest = {
        query: "test query",
        options: { enableBridgeDiscovery: false },
      };
      await processQuery(request, {
        db: mockDb,
        daemonConfig: mockDaemonConfig,
        logger: mockLogger,
      });

      expect(findBridgePaths).not.toHaveBeenCalled();
    });
  });
});
