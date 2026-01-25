/**
 * Tests for prompt versioning and management
 */

import Database from "better-sqlite3";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import type { PromptVersion } from "./types.js";

import {
  normalizePromptContent,
  calculatePromptHash,
  parseVersionString,
  createVersionString,
  getArchiveFilename,
  ensurePromptsDir,
  getVersionByHash,
  getLatestVersion,
  getNextSequential,
  recordPromptVersion,
  archivePrompt,
  getOrCreatePromptVersion,
  compareVersions,
  listPromptVersions,
  hasOutdatedNodes,
  getOutdatedNodeCount,
} from "./prompt.js";

/** Create unique test directory */
function createTestDir(): string {
  return join(
    tmpdir(),
    `prompt-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

/** Clean up test directory */
function cleanupTestDir(testDir: string): void {
  if (existsSync(testDir)) {
    rmSync(testDir, { recursive: true, force: true });
  }
}

/** Create in-memory database with minimal schema for testing */
function createTestDb(): Database.Database {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE prompt_versions (
      version TEXT PRIMARY KEY,
      content_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      file_path TEXT,
      notes TEXT
    );

    CREATE TABLE nodes (
      id TEXT PRIMARY KEY,
      analyzer_version TEXT
    );
  `);
  return db;
}

describe("prompt versioning", () => {
  describe("normalizePromptContent", () => {
    it("trims whitespace", () => {
      expect(normalizePromptContent("  hello  ")).toBe("hello");
    });

    it("collapses multiple spaces", () => {
      expect(normalizePromptContent("hello    world")).toBe("hello world");
    });

    it("collapses newlines and tabs", () => {
      expect(normalizePromptContent("hello\n\n\tworld")).toBe("hello world");
    });

    it("removes HTML comments", () => {
      expect(normalizePromptContent("hello <!-- comment --> world")).toBe(
        "hello world"
      );
    });

    it("removes multi-line HTML comments", () => {
      const content = `hello
      <!-- 
        multi-line
        comment 
      -->
      world`;
      expect(normalizePromptContent(content)).toBe("hello world");
    });

    it("preserves non-HTML comment content", () => {
      expect(normalizePromptContent("// not a comment")).toBe(
        "// not a comment"
      );
    });
  });

  describe("calculatePromptHash", () => {
    it("returns 8-character hex string", () => {
      const hash = calculatePromptHash("test content");
      expect(hash).toMatch(/^[a-f0-9]{8}$/);
    });

    it("produces consistent hash for same content", () => {
      const hash1 = calculatePromptHash("test content");
      const hash2 = calculatePromptHash("test content");
      expect(hash1).toBe(hash2);
    });

    it("produces different hash for different content", () => {
      const hash1 = calculatePromptHash("content 1");
      const hash2 = calculatePromptHash("content 2");
      expect(hash1).not.toBe(hash2);
    });

    it("normalizes before hashing (whitespace invariance)", () => {
      const hash1 = calculatePromptHash("hello world");
      const hash2 = calculatePromptHash("hello   world");
      expect(hash1).toBe(hash2);
    });

    it("normalizes before hashing (comment invariance)", () => {
      const hash1 = calculatePromptHash("hello world");
      const hash2 = calculatePromptHash("hello <!-- test --> world");
      expect(hash1).toBe(hash2);
    });
  });

  describe("parseVersionString", () => {
    it("parses valid version string", () => {
      const result = parseVersionString("v5-abc12345");
      expect(result).toStrictEqual({ sequential: 5, hash: "abc12345" });
    });

    it("parses version with high sequential number", () => {
      const result = parseVersionString("v123-deadbeef");
      expect(result).toStrictEqual({ sequential: 123, hash: "deadbeef" });
    });

    it("returns null for invalid format", () => {
      expect(parseVersionString("invalid")).toBeNull();
      expect(parseVersionString("v1")).toBeNull();
      expect(parseVersionString("1-abc12345")).toBeNull();
      expect(parseVersionString("v1-abc")).toBeNull(); // hash too short
    });
  });

  describe("createVersionString", () => {
    it("creates valid version string", () => {
      expect(createVersionString(1, "abc12345")).toBe("v1-abc12345");
      expect(createVersionString(42, "deadbeef")).toBe("v42-deadbeef");
    });
  });

  describe("getArchiveFilename", () => {
    it("includes version and date", () => {
      const filename = getArchiveFilename("v1-abc12345");
      expect(filename).toMatch(/^v1-abc12345-\d{4}-\d{2}-\d{2}\.md$/);
    });
  });

  describe("ensurePromptsDir", () => {
    it("creates prompts directory if missing", () => {
      const testDir = createTestDir();
      try {
        const newDir = join(testDir, "new-prompts");
        ensurePromptsDir(newDir);
        expect(existsSync(newDir)).toBeTruthy();
        expect(existsSync(join(newDir, "history"))).toBeTruthy();
      } finally {
        cleanupTestDir(testDir);
      }
    });

    it("does nothing if directory exists", () => {
      const testDir = createTestDir();
      try {
        const promptsDir = join(testDir, "prompts");
        mkdirSync(promptsDir, { recursive: true });
        ensurePromptsDir(promptsDir);
        expect(existsSync(promptsDir)).toBeTruthy();
      } finally {
        cleanupTestDir(testDir);
      }
    });
  });

  describe("database operations", () => {
    describe("getVersionByHash", () => {
      it("returns null when no version exists", () => {
        const db = createTestDb();
        try {
          expect(getVersionByHash(db, "nonexist")).toBeNull();
        } finally {
          db.close();
        }
      });

      it("returns version when hash exists", () => {
        const db = createTestDb();
        try {
          db.prepare(
            "INSERT INTO prompt_versions (version, content_hash) VALUES (?, ?)"
          ).run("v1-abc12345", "abc12345");

          const result = getVersionByHash(db, "abc12345");
          expect(result).not.toBeNull();
          expect(result?.version).toBe("v1-abc12345");
          expect(result?.content_hash).toBe("abc12345");
        } finally {
          db.close();
        }
      });
    });

    describe("getLatestVersion", () => {
      it("returns null when no versions exist", () => {
        const db = createTestDb();
        try {
          expect(getLatestVersion(db)).toBeNull();
        } finally {
          db.close();
        }
      });

      it("returns most recent version", () => {
        const db = createTestDb();
        try {
          db.prepare(
            "INSERT INTO prompt_versions (version, content_hash, created_at) VALUES (?, ?, ?)"
          ).run("v1-aaa11111", "aaa11111", "2026-01-01T00:00:00Z");
          db.prepare(
            "INSERT INTO prompt_versions (version, content_hash, created_at) VALUES (?, ?, ?)"
          ).run("v2-bbb22222", "bbb22222", "2026-01-02T00:00:00Z");

          const result = getLatestVersion(db);
          expect(result?.version).toBe("v2-bbb22222");
        } finally {
          db.close();
        }
      });
    });

    describe("getNextSequential", () => {
      it("returns 1 when no versions exist", () => {
        const db = createTestDb();
        try {
          expect(getNextSequential(db)).toBe(1);
        } finally {
          db.close();
        }
      });

      it("returns next sequential number", () => {
        const db = createTestDb();
        try {
          db.prepare(
            "INSERT INTO prompt_versions (version, content_hash) VALUES (?, ?)"
          ).run("v3-abc12345", "abc12345");

          expect(getNextSequential(db)).toBe(4);
        } finally {
          db.close();
        }
      });

      it("finds max across multiple versions", () => {
        const db = createTestDb();
        try {
          db.prepare(
            "INSERT INTO prompt_versions (version, content_hash) VALUES (?, ?)"
          ).run("v1-aaa11111", "aaa11111");
          db.prepare(
            "INSERT INTO prompt_versions (version, content_hash) VALUES (?, ?)"
          ).run("v5-bbb22222", "bbb22222");
          db.prepare(
            "INSERT INTO prompt_versions (version, content_hash) VALUES (?, ?)"
          ).run("v3-ccc33333", "ccc33333");

          expect(getNextSequential(db)).toBe(6);
        } finally {
          db.close();
        }
      });
    });

    describe("recordPromptVersion", () => {
      it("inserts version into database", () => {
        const db = createTestDb();
        try {
          const version: PromptVersion = {
            version: "v1-abc12345",
            sequential: 1,
            hash: "abc12345",
            createdAt: "2026-01-25T12:00:00Z",
            filePath: "/path/to/prompt.md",
          };

          recordPromptVersion(db, version, "Initial version");

          const result = db
            .prepare("SELECT * FROM prompt_versions WHERE version = ?")
            .get("v1-abc12345") as { notes: string };
          expect(result).toBeDefined();
          expect(result.notes).toBe("Initial version");
        } finally {
          db.close();
        }
      });

      it("works without notes", () => {
        const db = createTestDb();
        try {
          const version: PromptVersion = {
            version: "v2-def67890",
            sequential: 2,
            hash: "def67890",
            createdAt: "2026-01-25T12:00:00Z",
            filePath: "/path/to/prompt.md",
          };

          recordPromptVersion(db, version);

          const result = db
            .prepare("SELECT * FROM prompt_versions WHERE version = ?")
            .get("v2-def67890") as { notes: string | null };
          expect(result).toBeDefined();
          expect(result.notes).toBeNull();
        } finally {
          db.close();
        }
      });
    });
  });

  describe("archivePrompt", () => {
    it("copies prompt to history directory", () => {
      const testDir = createTestDir();
      const db = createTestDb();
      try {
        const promptsDir = join(testDir, "prompts");
        const historyDir = join(promptsDir, "history");
        const promptPath = join(promptsDir, "session-analyzer.md");
        mkdirSync(historyDir, { recursive: true });
        writeFileSync(promptPath, "test prompt content");

        const archivePath = archivePrompt(
          promptPath,
          historyDir,
          "v1-abc12345"
        );

        expect(existsSync(archivePath)).toBeTruthy();
        expect(readFileSync(archivePath, "utf8")).toBe("test prompt content");
      } finally {
        db.close();
        cleanupTestDir(testDir);
      }
    });

    it("creates archive with correct filename pattern", () => {
      const testDir = createTestDir();
      try {
        const promptsDir = join(testDir, "prompts");
        const historyDir = join(promptsDir, "history");
        const promptPath = join(promptsDir, "session-analyzer.md");
        mkdirSync(historyDir, { recursive: true });
        writeFileSync(promptPath, "test content");

        const archivePath = archivePrompt(
          promptPath,
          historyDir,
          "v1-abc12345"
        );
        const filename = archivePath.split("/").pop();

        expect(filename).toMatch(/^v1-abc12345-\d{4}-\d{2}-\d{2}\.md$/);
      } finally {
        cleanupTestDir(testDir);
      }
    });
  });

  describe("getOrCreatePromptVersion", () => {
    it("throws if prompt file does not exist", () => {
      const db = createTestDb();
      try {
        expect(() => getOrCreatePromptVersion(db, "/nonexistent/path")).toThrow(
          "Prompt file not found"
        );
      } finally {
        db.close();
      }
    });

    it("creates new version for new prompt", () => {
      const testDir = createTestDir();
      const db = createTestDb();
      try {
        const promptsDir = join(testDir, "prompts");
        const historyDir = join(promptsDir, "history");
        const promptPath = join(promptsDir, "session-analyzer.md");
        mkdirSync(historyDir, { recursive: true });
        writeFileSync(promptPath, "# New Prompt\n\nContent here.");

        const version = getOrCreatePromptVersion(db, promptPath, historyDir);

        expect(version.sequential).toBe(1);
        expect(version.version).toMatch(/^v1-[a-f0-9]{8}$/);
        expect(existsSync(version.filePath)).toBeTruthy();
      } finally {
        db.close();
        cleanupTestDir(testDir);
      }
    });

    it("returns existing version if hash matches", () => {
      const testDir = createTestDir();
      const db = createTestDb();
      try {
        const promptsDir = join(testDir, "prompts");
        const historyDir = join(promptsDir, "history");
        const promptPath = join(promptsDir, "session-analyzer.md");
        mkdirSync(historyDir, { recursive: true });
        const content = "# Same Prompt";
        writeFileSync(promptPath, content);

        // Create first version
        const version1 = getOrCreatePromptVersion(db, promptPath, historyDir);

        // Get version again (same content)
        const version2 = getOrCreatePromptVersion(db, promptPath, historyDir);

        expect(version2.version).toBe(version1.version);
        expect(version2.sequential).toBe(version1.sequential);
      } finally {
        db.close();
        cleanupTestDir(testDir);
      }
    });

    it("creates new version when content changes", () => {
      const testDir = createTestDir();
      const db = createTestDb();
      try {
        const promptsDir = join(testDir, "prompts");
        const historyDir = join(promptsDir, "history");
        const promptPath = join(promptsDir, "session-analyzer.md");
        mkdirSync(historyDir, { recursive: true });

        writeFileSync(promptPath, "content v1");
        const version1 = getOrCreatePromptVersion(db, promptPath, historyDir);

        writeFileSync(promptPath, "content v2 - different");
        const version2 = getOrCreatePromptVersion(db, promptPath, historyDir);

        expect(version2.sequential).toBe(2);
        expect(version2.version).not.toBe(version1.version);
      } finally {
        db.close();
        cleanupTestDir(testDir);
      }
    });

    it("records version in database", () => {
      const testDir = createTestDir();
      const db = createTestDb();
      try {
        const promptsDir = join(testDir, "prompts");
        const historyDir = join(promptsDir, "history");
        const promptPath = join(promptsDir, "session-analyzer.md");
        mkdirSync(historyDir, { recursive: true });
        writeFileSync(promptPath, "prompt content");

        const version = getOrCreatePromptVersion(db, promptPath, historyDir);

        const record = db
          .prepare("SELECT * FROM prompt_versions WHERE version = ?")
          .get(version.version);
        expect(record).toBeDefined();
      } finally {
        db.close();
        cleanupTestDir(testDir);
      }
    });

    it("archives prompt file", () => {
      const testDir = createTestDir();
      const db = createTestDb();
      try {
        const promptsDir = join(testDir, "prompts");
        const historyDir = join(promptsDir, "history");
        const promptPath = join(promptsDir, "session-analyzer.md");
        mkdirSync(historyDir, { recursive: true });
        writeFileSync(promptPath, "archived content");

        const version = getOrCreatePromptVersion(db, promptPath, historyDir);

        const files = readdirSync(historyDir);
        expect(files).toHaveLength(1);
        expect(files[0]).toContain(version.version);
      } finally {
        db.close();
        cleanupTestDir(testDir);
      }
    });
  });

  describe("compareVersions", () => {
    it("compares versions correctly", () => {
      expect(compareVersions("v1-abc12345", "v2-def67890")).toBeLessThan(0);
      expect(compareVersions("v2-abc12345", "v1-def67890")).toBeGreaterThan(0);
      expect(compareVersions("v5-abc12345", "v5-def67890")).toBe(0);
    });

    it("handles large version numbers", () => {
      expect(compareVersions("v10-abc12345", "v9-def67890")).toBeGreaterThan(0);
      expect(compareVersions("v99-abc12345", "v100-def67890")).toBeLessThan(0);
    });

    it("falls back to string comparison for invalid versions", () => {
      const result = compareVersions("invalid", "also-invalid");
      expect(typeof result).toBe("number");
    });
  });

  describe("listPromptVersions", () => {
    it("returns empty array when no versions", () => {
      const db = createTestDb();
      try {
        expect(listPromptVersions(db)).toStrictEqual([]);
      } finally {
        db.close();
      }
    });

    it("returns versions in descending order by date", () => {
      const db = createTestDb();
      try {
        db.prepare(
          "INSERT INTO prompt_versions (version, content_hash, created_at) VALUES (?, ?, ?)"
        ).run("v1-aaa11111", "aaa11111", "2026-01-01T00:00:00Z");
        db.prepare(
          "INSERT INTO prompt_versions (version, content_hash, created_at) VALUES (?, ?, ?)"
        ).run("v2-bbb22222", "bbb22222", "2026-01-02T00:00:00Z");

        const versions = listPromptVersions(db);

        expect(versions).toHaveLength(2);
        expect(versions[0].version).toBe("v2-bbb22222");
        expect(versions[1].version).toBe("v1-aaa11111");
      } finally {
        db.close();
      }
    });
  });

  describe("outdated nodes detection", () => {
    it("hasOutdatedNodes returns true when nodes have different versions", () => {
      const db = createTestDb();
      try {
        db.prepare(
          "INSERT INTO nodes (id, analyzer_version) VALUES (?, ?)"
        ).run("node1", "v1-old11111");
        db.prepare(
          "INSERT INTO nodes (id, analyzer_version) VALUES (?, ?)"
        ).run("node2", "v2-new22222");

        expect(hasOutdatedNodes(db, "v2-new22222")).toBeTruthy();
      } finally {
        db.close();
      }
    });

    it("hasOutdatedNodes returns false when all nodes have current version", () => {
      const db = createTestDb();
      try {
        db.prepare(
          "INSERT INTO nodes (id, analyzer_version) VALUES (?, ?)"
        ).run("node1", "v2-new22222");
        db.prepare(
          "INSERT INTO nodes (id, analyzer_version) VALUES (?, ?)"
        ).run("node2", "v2-new22222");

        expect(hasOutdatedNodes(db, "v2-new22222")).toBeFalsy();
      } finally {
        db.close();
      }
    });

    it("hasOutdatedNodes ignores nodes with null analyzer_version", () => {
      const db = createTestDb();
      try {
        db.prepare(
          "INSERT INTO nodes (id, analyzer_version) VALUES (?, ?)"
        ).run("node1", null);

        expect(hasOutdatedNodes(db, "v1-abc12345")).toBeFalsy();
      } finally {
        db.close();
      }
    });

    it("getOutdatedNodeCount returns count of outdated nodes", () => {
      const db = createTestDb();
      try {
        db.prepare(
          "INSERT INTO nodes (id, analyzer_version) VALUES (?, ?)"
        ).run("node1", "v1-old11111");
        db.prepare(
          "INSERT INTO nodes (id, analyzer_version) VALUES (?, ?)"
        ).run("node2", "v1-old11111");
        db.prepare(
          "INSERT INTO nodes (id, analyzer_version) VALUES (?, ?)"
        ).run("node3", "v2-new22222");

        expect(getOutdatedNodeCount(db, "v2-new22222")).toBe(2);
      } finally {
        db.close();
      }
    });

    it("getOutdatedNodeCount returns 0 when all nodes current", () => {
      const db = createTestDb();
      try {
        db.prepare(
          "INSERT INTO nodes (id, analyzer_version) VALUES (?, ?)"
        ).run("node1", "v2-new22222");

        expect(getOutdatedNodeCount(db, "v2-new22222")).toBe(0);
      } finally {
        db.close();
      }
    });
  });
});
