import type { Database } from "better-sqlite3";
import type * as ChildProcess from "node:child_process";
import type * as FsPromises from "node:fs/promises";

import { spawn } from "node:child_process";
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

import type { DaemonConfig } from "../config/types.js";
import type * as NodeQueries from "../storage/node-queries.js";
import type * as QuirkRepo from "../storage/quirk-repository.js";
import type * as SearchRepo from "../storage/search-repository.js";
import type * as ToolErrorRepo from "../storage/tool-error-repository.js";

import { listNodes } from "../storage/node-queries.js";
import { searchNodesAdvanced } from "../storage/search-repository.js";
import { processQuery, type QueryRequest } from "./query-processor.js";

// Mocks
vi.mock<typeof SearchRepo>("../storage/search-repository.js", () => ({
  searchNodesAdvanced: vi.fn(),
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
});
