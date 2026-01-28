import type * as PathModule from "node:path";

import * as fs from "node:fs";
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

import type * as ConfigModule from "../config/config.js";
import type * as DatabaseModule from "../storage/database.js";
import type * as EmbeddingUtilsModule from "../storage/embedding-utils.js";
import type * as NodeStorageModule from "../storage/node-storage.js";
import type * as FacetDiscoveryModule from "./facet-discovery.js";

import { rebuildEmbeddings } from "./cli.js";

// Mocks
vi.mock<typeof ConfigModule>("../config/config.js", () => ({
  loadConfig: vi.fn(() => ({
    hub: { databaseDir: "/tmp/test-db" },
    daemon: {
      embeddingProvider: "openai",
      embeddingModel: "text-embedding-3-small",
      embeddingApiKey: "test-key",
    },
  })),
  DEFAULT_CONFIG_DIR: "/tmp/test-config",
  ensureDirectories: vi.fn(),
  getSessionDirs: vi.fn(() => []),
}));

vi.mock<typeof DatabaseModule>("../storage/database.js", () => ({
  openDatabase: vi.fn(() => ({
    close: vi.fn(),
  })),
  migrate: vi.fn(),
}));

vi.mock<typeof FacetDiscoveryModule>("./facet-discovery.js", () => ({
  createEmbeddingProvider: vi.fn(),
}));

vi.mock<typeof EmbeddingUtilsModule>("../storage/embedding-utils.js", () => ({
  backfillEmbeddings: vi.fn(),
}));

vi.mock<typeof NodeStorageModule>("../storage/node-storage.js", () => ({
  readNodeFromPath: vi.fn(),
  listNodeFiles: vi.fn(() => []),
  parseNodePath: vi.fn(),
}));

// Mock fs and path
vi.mock("node:fs");
vi.mock<typeof PathModule>("node:path", async () => {
  const actual = (await vi.importActual("node:path")) as Record<
    string,
    unknown
  >;
  return {
    ...actual,
    join: (...args: string[]) => args.join("/"),
  };
});

describe("daemon CLI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock fs.existsSync to return false for PID file so daemon is not running
    (fs.existsSync as Mock).mockReturnValue(false);
  });

  describe("rebuildEmbeddings", () => {
    it("should fail if daemon is running", async () => {
      // Setup mock to return true for PID file
      (fs.existsSync as Mock).mockImplementation((p: string) =>
        p.endsWith("daemon.pid")
      );
      (fs.readFileSync as Mock).mockReturnValue("12345");

      // Mock process.kill to return true (process running)
      const originalKill = process.kill;
      global.process.kill = vi.fn() as unknown as typeof process.kill;

      try {
        const result = await rebuildEmbeddings();
        expect(result.success).toBeFalsy();
        expect(result.message).toContain("Daemon is running");
      } finally {
        global.process.kill = originalKill;
      }
    });

    it("should fail if no embedding provider configured", async () => {
      const { createEmbeddingProvider } = await import("./facet-discovery.js");
      (createEmbeddingProvider as Mock).mockReturnValue(null);

      const result = await rebuildEmbeddings();
      expect(result.success).toBeFalsy();
      expect(result.message).toContain("No embedding provider");
    });

    it("should run backfill successfully", async () => {
      const { createEmbeddingProvider } = await import("./facet-discovery.js");
      const { backfillEmbeddings } =
        await import("../storage/embedding-utils.js");

      (createEmbeddingProvider as Mock).mockReturnValue({
        modelName: "test-model",
      });
      (backfillEmbeddings as Mock).mockResolvedValue({
        successCount: 10,
        failureCount: 0,
        failedNodeIds: [],
        durationMs: 100,
      });

      const result = await rebuildEmbeddings();
      expect(result.success).toBeTruthy();
      expect(result.count).toBe(10);
      expect(createEmbeddingProvider).toHaveBeenCalled();
      expect(backfillEmbeddings).toHaveBeenCalled();
    });

    it("should report failures", async () => {
      const { createEmbeddingProvider } = await import("./facet-discovery.js");
      const { backfillEmbeddings } =
        await import("../storage/embedding-utils.js");

      (createEmbeddingProvider as Mock).mockReturnValue({
        modelName: "test-model",
      });
      (backfillEmbeddings as Mock).mockResolvedValue({
        successCount: 5,
        failureCount: 2,
        failedNodeIds: ["node1", "node2"],
        durationMs: 100,
      });

      // Spy on console.log to check if failed nodes are logged
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await rebuildEmbeddings();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed: 2")
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed Node IDs:",
        expect.stringContaining("node1, node2")
      );

      consoleSpy.mockRestore();
    });

    it("should handle exceptions", async () => {
      const { createEmbeddingProvider } = await import("./facet-discovery.js");
      // createEmbeddingProvider is synchronous, so we must throw synchronously
      (createEmbeddingProvider as Mock).mockImplementation(() => {
        throw new Error("Test error");
      });

      const result = await rebuildEmbeddings();
      expect(result.success).toBeFalsy();
      expect(result.message).toContain("Test error");
    });
  });
});
