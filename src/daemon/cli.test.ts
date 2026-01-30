import * as fs from "node:fs";
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

import { rebuildEmbeddings } from "./cli.js";

// Mocks
vi.mock("../config/config.js", () => ({
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

vi.mock("../storage/database.js", () => ({
  openDatabase: vi.fn(() => ({
    close: vi.fn(),
  })),
  migrate: vi.fn(),
}));

vi.mock("./facet-discovery.js", () => ({
  createEmbeddingProvider: vi.fn(),
}));

vi.mock("../storage/embedding-utils.js", () => ({
  backfillEmbeddings: vi.fn(),
}));

vi.mock("../storage/node-storage.js", () => ({
  readNodeFromPath: vi.fn(),
  listNodeFiles: vi.fn(() => []),
  parseNodePath: vi.fn(),
}));

// Mock fs and path
vi.mock("node:fs");
vi.mock("node:path", async () => {
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

      await expect(rebuildEmbeddings(undefined, {})).rejects.toThrow(
        "Daemon is currently running"
      );
    });
  });
});
