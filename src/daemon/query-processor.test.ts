import type { Database } from "better-sqlite3";
import type * as ChildProcess from "node:child_process";
import type * as FsPromises from "node:fs/promises";

import { spawn } from "node:child_process";
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

import type { DaemonConfig } from "../config/types.js";
import type * as NodeQueries from "../storage/node-queries.js";
import type * as QuirkRepo from "../storage/quirk-repository.js";
import type * as SearchRepo from "../storage/search-repository.js";
import type * as SemanticSearchMod from "../storage/semantic-search.js";
import type * as ToolErrorRepo from "../storage/tool-error-repository.js";
import type { EmbeddingProvider } from "./facet-discovery.js";

import { listNodes } from "../storage/node-queries.js";
import { searchNodesAdvanced } from "../storage/search-repository.js";
import { semanticSearch } from "../storage/semantic-search.js";
import { processQuery, type QueryRequest } from "./query-processor.js";

// Mocks
vi.mock<typeof SearchRepo>("../storage/search-repository.js", () => ({
  searchNodesAdvanced: vi.fn(),
}));

vi.mock<typeof SemanticSearchMod>("../storage/semantic-search.js", () => ({
  semanticSearch: vi.fn(),
}));

vi.mock<typeof NodeQueries>("../storage/node-queries.js", () => ({
  listNodes: vi.fn(),
}));

vi.mock<typeof QuirkRepo>("../storage/quirk-repository.js", () => ({
  getAggregatedQuirks: vi.fn(() => []),
}));

vi.mock<typeof ToolErrorRepo>("../storage/tool-error-repository.js", () => ({
  getAggregatedToolErrors: vi.fn(() => []),
}));

vi.mock<typeof ChildProcess>("node:child_process", () => ({
  spawn: vi.fn(),
}));

vi.mock<typeof FsPromises>("node:fs/promises", () => ({
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
      (searchNodesAdvanced as Mock).mockReturnValue({ results: [] });
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

    it("should process query with relevant nodes", async () => {
      // Mock search results
      (searchNodesAdvanced as Mock).mockReturnValue({
        results: [
          {
            node: {
              id: "1",
              summary: "Node 1",
              session_file: "s1.jsonl",
              timestamp: "2023-01-01",
            },
            score: 0.9,
          },
        ],
      });

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
          cb(Buffer.from(JSON.stringify(output) + "\n"));
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
    });

    it("should handle pi agent errors", async () => {
      // Mock search results
      (searchNodesAdvanced as Mock).mockReturnValue({
        results: [
          {
            node: {
              id: "1",
              summary: "Node 1",
              session_file: "s1.jsonl",
              timestamp: "2023-01-01",
            },
            score: 0.9,
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

  describe("semantic search integration", () => {
    it("should use semantic search when embedding provider is configured", async () => {
      const mockEmbeddingProvider = createMockEmbeddingProvider();

      // Mock semantic search returning results
      (semanticSearch as Mock).mockReturnValue([
        {
          node: {
            id: "sem-1",
            summary: "Semantic result",
            session_file: "s1.jsonl",
            timestamp: "2023-01-01",
            type: "coding",
            project: "/test",
            outcome: "success",
          },
          score: 0.95,
          distance: 0.1,
          highlights: [],
        },
      ]);

      // FTS should not be called since semantic search found results
      (searchNodesAdvanced as Mock).mockReturnValue({ results: [] });
      (listNodes as Mock).mockReturnValue({ nodes: [] });

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

      // Verify semantic search was called
      expect(semanticSearch).toHaveBeenCalledWith(
        mockDb,
        [0.1, 0.2, 0.3],
        expect.objectContaining({
          limit: 10,
          maxDistance: 0.5,
        })
      );

      // Verify FTS was NOT called since semantic found results
      expect(searchNodesAdvanced).not.toHaveBeenCalled();

      // Check the response uses semantic results
      expect(response.relatedNodes).toHaveLength(1);
      expect(response.relatedNodes[0].id).toBe("sem-1");
    });

    it("should fall back to FTS when semantic search returns no results", async () => {
      const mockEmbeddingProvider = createMockEmbeddingProvider();

      // Mock semantic search returning empty
      (semanticSearch as Mock).mockReturnValue([]);

      // FTS returns results
      (searchNodesAdvanced as Mock).mockReturnValue({
        results: [
          {
            node: {
              id: "fts-1",
              summary: "FTS result",
              session_file: "s2.jsonl",
              timestamp: "2023-01-02",
              type: "debugging",
              project: "/test",
              outcome: "success",
            },
            score: 0.8,
          },
        ],
      });

      (listNodes as Mock).mockReturnValue({ nodes: [] });

      const request: QueryRequest = { query: "fallback query" };
      const response = await processQuery(request, {
        db: mockDb,
        daemonConfig: mockDaemonConfig,
        logger: mockLogger,
        embeddingProvider: mockEmbeddingProvider,
      });

      // Verify both searches were called
      expect(semanticSearch).toHaveBeenCalled();
      expect(searchNodesAdvanced).toHaveBeenCalled();

      // Verify logger was informed about fallback
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining("falling back to FTS")
      );

      // Response uses FTS results
      expect(response.relatedNodes).toHaveLength(1);
      expect(response.relatedNodes[0].id).toBe("fts-1");
    });

    it("should fall back to FTS when semantic search throws an error", async () => {
      const mockEmbeddingProvider = createMockEmbeddingProvider();
      (mockEmbeddingProvider.embed as Mock).mockRejectedValue(
        new Error("API rate limit exceeded")
      );

      // FTS returns results
      (searchNodesAdvanced as Mock).mockReturnValue({
        results: [
          {
            node: {
              id: "fts-error-fallback",
              summary: "FTS after error",
              session_file: "s3.jsonl",
              timestamp: "2023-01-03",
              type: "coding",
              project: "/test",
              outcome: "success",
            },
            score: 0.7,
          },
        ],
      });

      (listNodes as Mock).mockReturnValue({ nodes: [] });

      const request: QueryRequest = { query: "error test" };
      const response = await processQuery(request, {
        db: mockDb,
        daemonConfig: mockDaemonConfig,
        logger: mockLogger,
        embeddingProvider: mockEmbeddingProvider,
      });

      // Verify warning was logged
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Semantic search failed")
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining("API rate limit exceeded")
      );

      // FTS was called as fallback
      expect(searchNodesAdvanced).toHaveBeenCalled();

      // Response uses FTS results
      expect(response.relatedNodes).toHaveLength(1);
      expect(response.relatedNodes[0].id).toBe("fts-error-fallback");
    });

    it("should skip semantic search when no embedding provider configured", async () => {
      // No embedding provider
      (searchNodesAdvanced as Mock).mockReturnValue({
        results: [
          {
            node: {
              id: "fts-only",
              summary: "FTS only result",
              session_file: "s4.jsonl",
              timestamp: "2023-01-04",
              type: "coding",
              project: "/test",
              outcome: "success",
            },
            score: 0.9,
          },
        ],
      });

      (listNodes as Mock).mockReturnValue({ nodes: [] });

      const request: QueryRequest = { query: "no embedding" };
      const response = await processQuery(request, {
        db: mockDb,
        daemonConfig: mockDaemonConfig,
        logger: mockLogger,
        // No embeddingProvider
      });

      // Semantic search should not be called
      expect(semanticSearch).not.toHaveBeenCalled();

      // FTS was used directly
      expect(searchNodesAdvanced).toHaveBeenCalled();

      expect(response.relatedNodes).toHaveLength(1);
      expect(response.relatedNodes[0].id).toBe("fts-only");
    });

    it("should pass project filter to semantic search", async () => {
      const mockEmbeddingProvider = createMockEmbeddingProvider();

      (semanticSearch as Mock).mockReturnValue([
        {
          node: {
            id: "project-filtered",
            summary: "Project result",
            session_file: "s5.jsonl",
            timestamp: "2023-01-05",
            type: "coding",
            project: "/my-project",
            outcome: "success",
          },
          score: 0.9,
          distance: 0.15,
          highlights: [],
        },
      ]);

      (listNodes as Mock).mockReturnValue({ nodes: [] });

      const request: QueryRequest = {
        query: "project specific",
        context: { project: "/my-project" },
      };
      await processQuery(request, {
        db: mockDb,
        daemonConfig: mockDaemonConfig,
        logger: mockLogger,
        embeddingProvider: mockEmbeddingProvider,
      });

      // Verify semantic search was called with project filter
      expect(semanticSearch).toHaveBeenCalledWith(
        mockDb,
        expect.any(Array),
        expect.objectContaining({
          filters: { project: "/my-project" },
        })
      );
    });
  });
});
