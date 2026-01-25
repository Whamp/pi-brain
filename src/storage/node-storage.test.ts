/**
 * Tests for node JSON file storage
 */

import { existsSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  createNodeVersion,
  getLatestNodeVersion,
  getNodeDir,
  getNodePath,
  listNodeFiles,
  listNodeVersions,
  nodeExists,
  parseNodePath,
  readLatestNode,
  readNode,
  readNodeFromPath,
  writeNode,
} from "./node-storage.js";
import {
  emptyDaemonMeta,
  emptyLessons,
  emptyObservations,
  generateNodeId,
  type Node,
} from "./node-types.js";

/**
 * Create a minimal valid node for testing
 */
function createTestNode(overrides: Partial<Node> = {}): Node {
  const id = generateNodeId();
  const timestamp = "2026-01-24T10:00:00.000Z";

  return {
    id,
    version: 1,
    previousVersions: [],
    source: {
      sessionFile: "/home/user/.pi/agent/sessions/test/session.jsonl",
      segment: {
        startEntryId: "entry1",
        endEntryId: "entry10",
        entryCount: 10,
      },
      computer: "testhost",
      sessionId: "test-session-123",
    },
    classification: {
      type: "coding",
      project: "/home/user/projects/test",
      isNewProject: false,
      hadClearGoal: true,
    },
    content: {
      summary: "Test node for unit testing",
      outcome: "success",
      keyDecisions: [],
      filesTouched: [],
      toolsUsed: ["read", "write"],
      errorsSeen: [],
    },
    lessons: emptyLessons(),
    observations: emptyObservations(),
    metadata: {
      tokensUsed: 1000,
      cost: 0,
      durationMinutes: 5,
      timestamp,
      analyzedAt: "2026-01-24T10:10:00.000Z",
      analyzerVersion: "v1-test",
    },
    semantic: {
      tags: ["test"],
      topics: ["testing"],
    },
    daemonMeta: emptyDaemonMeta(),
    ...overrides,
  };
}

/**
 * Create a unique temp directory for a test
 */
function createTempDir(): string {
  const dir = join(
    tmpdir(),
    `pi-brain-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Clean up a temp directory
 */
function cleanupTempDir(dir: string): void {
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe("node-storage", () => {
  describe("getNodeDir", () => {
    it("returns correct directory for timestamp", () => {
      const testDir = createTempDir();
      try {
        const dir = getNodeDir("2026-01-24T10:00:00.000Z", testDir);
        expect(dir).toBe(join(testDir, "2026", "01"));
      } finally {
        cleanupTempDir(testDir);
      }
    });

    it("handles different months correctly", () => {
      const testDir = createTempDir();
      try {
        const dir = getNodeDir("2025-12-31T23:59:59.999Z", testDir);
        expect(dir).toBe(join(testDir, "2025", "12"));
      } finally {
        cleanupTempDir(testDir);
      }
    });

    it("pads single-digit months with zero", () => {
      const testDir = createTempDir();
      try {
        const dir = getNodeDir("2026-05-15T12:00:00.000Z", testDir);
        expect(dir).toBe(join(testDir, "2026", "05"));
      } finally {
        cleanupTempDir(testDir);
      }
    });
  });

  describe("getNodePath", () => {
    it("returns correct file path", () => {
      const testDir = createTempDir();
      try {
        const path = getNodePath(
          "a1b2c3d4e5f60718",
          1,
          "2026-01-24T10:00:00.000Z",
          testDir
        );
        expect(path).toBe(
          join(testDir, "2026", "01", "a1b2c3d4e5f60718-v1.json")
        );
      } finally {
        cleanupTempDir(testDir);
      }
    });

    it("handles higher version numbers", () => {
      const testDir = createTempDir();
      try {
        const path = getNodePath(
          "a1b2c3d4e5f60718",
          5,
          "2026-01-24T10:00:00.000Z",
          testDir
        );
        expect(path).toBe(
          join(testDir, "2026", "01", "a1b2c3d4e5f60718-v5.json")
        );
      } finally {
        cleanupTempDir(testDir);
      }
    });
  });

  describe("writeNode and readNode", () => {
    it("writes and reads a node correctly", () => {
      const testDir = createTempDir();
      try {
        const node = createTestNode();
        const path = writeNode(node, { nodesDir: testDir });

        expect(existsSync(path)).toBeTruthy();

        const readBack = readNode(
          node.id,
          node.version,
          node.metadata.timestamp,
          { nodesDir: testDir }
        );

        expect(readBack).toStrictEqual(node);
      } finally {
        cleanupTempDir(testDir);
      }
    });

    it("creates directory structure if it doesn't exist", () => {
      const testDir = createTempDir();
      try {
        const node = createTestNode();
        const expectedDir = getNodeDir(node.metadata.timestamp, testDir);

        expect(existsSync(expectedDir)).toBeFalsy();

        writeNode(node, { nodesDir: testDir });

        expect(existsSync(expectedDir)).toBeTruthy();
      } finally {
        cleanupTempDir(testDir);
      }
    });

    it("throws when reading non-existent node", () => {
      const testDir = createTempDir();
      try {
        expect(() =>
          readNode("nonexistent12345", 1, "2026-01-24T10:00:00.000Z", {
            nodesDir: testDir,
          })
        ).toThrow(/Node file not found/);
      } finally {
        cleanupTempDir(testDir);
      }
    });
  });

  describe("readNodeFromPath", () => {
    it("reads a node from explicit path", () => {
      const testDir = createTempDir();
      try {
        const node = createTestNode();
        const path = writeNode(node, { nodesDir: testDir });

        const readBack = readNodeFromPath(path);
        expect(readBack).toStrictEqual(node);
      } finally {
        cleanupTempDir(testDir);
      }
    });

    it("throws for non-existent path", () => {
      expect(() => readNodeFromPath("/nonexistent/path.json")).toThrow(
        /Node file not found/
      );
    });
  });

  describe("nodeExists", () => {
    it("returns true for existing node", () => {
      const testDir = createTempDir();
      try {
        const node = createTestNode();
        writeNode(node, { nodesDir: testDir });

        expect(
          nodeExists(node.id, node.version, node.metadata.timestamp, {
            nodesDir: testDir,
          })
        ).toBeTruthy();
      } finally {
        cleanupTempDir(testDir);
      }
    });

    it("returns false for non-existent node", () => {
      const testDir = createTempDir();
      try {
        expect(
          nodeExists("nonexistent12345", 1, "2026-01-24T10:00:00.000Z", {
            nodesDir: testDir,
          })
        ).toBeFalsy();
      } finally {
        cleanupTempDir(testDir);
      }
    });
  });

  describe("listNodeFiles", () => {
    it("returns empty array for empty directory", () => {
      const testDir = createTempDir();
      try {
        const files = listNodeFiles({ nodesDir: testDir });
        expect(files).toStrictEqual([]);
      } finally {
        cleanupTempDir(testDir);
      }
    });

    it("returns empty array when directory doesn't exist", () => {
      const testDir = createTempDir();
      try {
        const files = listNodeFiles({ nodesDir: join(testDir, "nonexistent") });
        expect(files).toStrictEqual([]);
      } finally {
        cleanupTempDir(testDir);
      }
    });

    it("lists all node files across years and months", () => {
      const testDir = createTempDir();
      try {
        // Create nodes in different months
        const node1 = createTestNode({
          metadata: {
            tokensUsed: 100,
            cost: 0,
            durationMinutes: 5,
            timestamp: "2026-01-15T10:00:00.000Z",
            analyzedAt: "2026-01-15T10:10:00.000Z",
            analyzerVersion: "v1",
          },
        });
        const node2 = createTestNode({
          metadata: {
            tokensUsed: 100,
            cost: 0,
            durationMinutes: 5,
            timestamp: "2026-02-20T10:00:00.000Z",
            analyzedAt: "2026-02-20T10:10:00.000Z",
            analyzerVersion: "v1",
          },
        });
        const node3 = createTestNode({
          metadata: {
            tokensUsed: 100,
            cost: 0,
            durationMinutes: 5,
            timestamp: "2025-12-25T10:00:00.000Z",
            analyzedAt: "2025-12-25T10:10:00.000Z",
            analyzerVersion: "v1",
          },
        });

        writeNode(node1, { nodesDir: testDir });
        writeNode(node2, { nodesDir: testDir });
        writeNode(node3, { nodesDir: testDir });

        const files = listNodeFiles({ nodesDir: testDir });
        expect(files).toHaveLength(3);
        expect(files.some((f) => f.includes("2026/01"))).toBeTruthy();
        expect(files.some((f) => f.includes("2026/02"))).toBeTruthy();
        expect(files.some((f) => f.includes("2025/12"))).toBeTruthy();
      } finally {
        cleanupTempDir(testDir);
      }
    });
  });

  describe("listNodeVersions", () => {
    it("returns empty array for non-existent node", () => {
      const testDir = createTempDir();
      try {
        const versions = listNodeVersions("nonexistent12345", {
          nodesDir: testDir,
        });
        expect(versions).toStrictEqual([]);
      } finally {
        cleanupTempDir(testDir);
      }
    });

    it("lists all versions of a node sorted by version", () => {
      const testDir = createTempDir();
      try {
        const nodeId = generateNodeId();
        const timestamp = "2026-01-24T10:00:00.000Z";

        // Create v1
        const node1 = createTestNode({
          id: nodeId,
          version: 1,
          metadata: {
            tokensUsed: 100,
            cost: 0,
            durationMinutes: 5,
            timestamp,
            analyzedAt: "2026-01-24T10:10:00.000Z",
            analyzerVersion: "v1",
          },
        });

        // Create v2
        const node2 = createTestNode({
          id: nodeId,
          version: 2,
          previousVersions: [`${nodeId}-v1`],
          metadata: {
            tokensUsed: 100,
            cost: 0,
            durationMinutes: 5,
            timestamp,
            analyzedAt: "2026-01-24T11:00:00.000Z",
            analyzerVersion: "v2",
          },
        });

        // Create v3
        const node3 = createTestNode({
          id: nodeId,
          version: 3,
          previousVersions: [`${nodeId}-v1`, `${nodeId}-v2`],
          metadata: {
            tokensUsed: 100,
            cost: 0,
            durationMinutes: 5,
            timestamp,
            analyzedAt: "2026-01-24T12:00:00.000Z",
            analyzerVersion: "v3",
          },
        });

        // Write in random order
        writeNode(node3, { nodesDir: testDir });
        writeNode(node1, { nodesDir: testDir });
        writeNode(node2, { nodesDir: testDir });

        const versions = listNodeVersions(nodeId, { nodesDir: testDir });

        expect(versions).toHaveLength(3);
        expect(versions[0].version).toBe(1);
        expect(versions[1].version).toBe(2);
        expect(versions[2].version).toBe(3);
      } finally {
        cleanupTempDir(testDir);
      }
    });
  });

  describe("getLatestNodeVersion", () => {
    it("returns null for non-existent node", () => {
      const testDir = createTempDir();
      try {
        const latest = getLatestNodeVersion("nonexistent12345", {
          nodesDir: testDir,
        });
        expect(latest).toBeNull();
      } finally {
        cleanupTempDir(testDir);
      }
    });

    it("returns the highest version", () => {
      const testDir = createTempDir();
      try {
        const nodeId = generateNodeId();
        const timestamp = "2026-01-24T10:00:00.000Z";

        const baseMetadata = {
          tokensUsed: 100,
          cost: 0,
          durationMinutes: 5,
          timestamp,
          analyzerVersion: "v1",
        };

        writeNode(
          createTestNode({
            id: nodeId,
            version: 1,
            metadata: {
              ...baseMetadata,
              analyzedAt: "2026-01-24T10:10:00.000Z",
            },
          }),
          { nodesDir: testDir }
        );

        writeNode(
          createTestNode({
            id: nodeId,
            version: 3,
            metadata: {
              ...baseMetadata,
              analyzedAt: "2026-01-24T12:00:00.000Z",
            },
          }),
          { nodesDir: testDir }
        );

        writeNode(
          createTestNode({
            id: nodeId,
            version: 2,
            metadata: {
              ...baseMetadata,
              analyzedAt: "2026-01-24T11:00:00.000Z",
            },
          }),
          { nodesDir: testDir }
        );

        const latest = getLatestNodeVersion(nodeId, { nodesDir: testDir });

        expect(latest).not.toBeNull();
        expect(latest?.version).toBe(3);
      } finally {
        cleanupTempDir(testDir);
      }
    });
  });

  describe("readLatestNode", () => {
    it("returns null for non-existent node", () => {
      const testDir = createTempDir();
      try {
        const node = readLatestNode("nonexistent12345", { nodesDir: testDir });
        expect(node).toBeNull();
      } finally {
        cleanupTempDir(testDir);
      }
    });

    it("returns the latest version content", () => {
      const testDir = createTempDir();
      try {
        const nodeId = generateNodeId();
        const timestamp = "2026-01-24T10:00:00.000Z";

        const baseMetadata = {
          tokensUsed: 100,
          cost: 0,
          durationMinutes: 5,
          timestamp,
          analyzerVersion: "v1",
        };

        writeNode(
          createTestNode({
            id: nodeId,
            version: 1,
            content: {
              summary: "Version 1 summary",
              outcome: "success",
              keyDecisions: [],
              filesTouched: [],
              toolsUsed: [],
              errorsSeen: [],
            },
            metadata: {
              ...baseMetadata,
              analyzedAt: "2026-01-24T10:10:00.000Z",
            },
          }),
          { nodesDir: testDir }
        );

        writeNode(
          createTestNode({
            id: nodeId,
            version: 2,
            content: {
              summary: "Version 2 summary - updated",
              outcome: "success",
              keyDecisions: [],
              filesTouched: [],
              toolsUsed: [],
              errorsSeen: [],
            },
            metadata: {
              ...baseMetadata,
              analyzedAt: "2026-01-24T11:00:00.000Z",
            },
          }),
          { nodesDir: testDir }
        );

        const latest = readLatestNode(nodeId, { nodesDir: testDir });

        expect(latest).not.toBeNull();
        expect(latest?.version).toBe(2);
        expect(latest?.content.summary).toBe("Version 2 summary - updated");
      } finally {
        cleanupTempDir(testDir);
      }
    });
  });

  describe("parseNodePath", () => {
    it("parses valid node path", () => {
      const path = "/some/dir/2026/01/a1b2c3d4e5f60718-v1.json";
      const result = parseNodePath(path);

      expect(result).toStrictEqual({
        nodeId: "a1b2c3d4e5f60718",
        version: 1,
        year: "2026",
        month: "01",
      });
    });

    it("handles higher version numbers", () => {
      const path = "/some/dir/2025/12/abcdef0123456789-v42.json";
      const result = parseNodePath(path);

      expect(result).toStrictEqual({
        nodeId: "abcdef0123456789",
        version: 42,
        year: "2025",
        month: "12",
      });
    });

    it("returns null for invalid year", () => {
      const path = "/some/dir/20/01/a1b2c3d4e5f60718-v1.json";
      const result = parseNodePath(path);
      expect(result).toBeNull();
    });

    it("returns null for invalid month", () => {
      const path = "/some/dir/2026/1/a1b2c3d4e5f60718-v1.json";
      const result = parseNodePath(path);
      expect(result).toBeNull();
    });

    it("returns null for invalid node ID format", () => {
      const path = "/some/dir/2026/01/short-v1.json";
      const result = parseNodePath(path);
      expect(result).toBeNull();
    });

    it("returns null for non-json file", () => {
      const path = "/some/dir/2026/01/a1b2c3d4e5f60718-v1.txt";
      const result = parseNodePath(path);
      expect(result).toBeNull();
    });
  });

  describe("createNodeVersion", () => {
    it("creates a new version with incremented version number", () => {
      const testDir = createTempDir();
      try {
        const original = createTestNode();
        writeNode(original, { nodesDir: testDir });

        const newNode = createNodeVersion(
          original,
          {
            content: {
              ...original.content,
              summary: "Updated summary for v2",
            },
          },
          { nodesDir: testDir }
        );

        expect(newNode.version).toBe(2);
        expect(newNode.content.summary).toBe("Updated summary for v2");
        expect(newNode.previousVersions).toStrictEqual([`${original.id}-v1`]);
      } finally {
        cleanupTempDir(testDir);
      }
    });

    it("preserves original node content not overridden", () => {
      const testDir = createTempDir();
      try {
        const original = createTestNode({
          semantic: {
            tags: ["original", "tags"],
            topics: ["original topic"],
          },
        });
        writeNode(original, { nodesDir: testDir });

        const newNode = createNodeVersion(
          original,
          {
            content: {
              ...original.content,
              summary: "Updated summary",
            },
          },
          { nodesDir: testDir }
        );

        expect(newNode.semantic.tags).toStrictEqual(["original", "tags"]);
        expect(newNode.semantic.topics).toStrictEqual(["original topic"]);
      } finally {
        cleanupTempDir(testDir);
      }
    });

    it("updates analyzedAt timestamp", () => {
      const testDir = createTempDir();
      try {
        const original = createTestNode();
        writeNode(original, { nodesDir: testDir });

        const beforeCreate = new Date();
        const newNode = createNodeVersion(original, {}, { nodesDir: testDir });
        const afterCreate = new Date();

        const analyzedAt = new Date(newNode.metadata.analyzedAt);
        expect(analyzedAt.getTime()).toBeGreaterThanOrEqual(
          beforeCreate.getTime()
        );
        expect(analyzedAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
      } finally {
        cleanupTempDir(testDir);
      }
    });

    it("writes the new version to storage", () => {
      const testDir = createTempDir();
      try {
        const original = createTestNode();
        writeNode(original, { nodesDir: testDir });

        createNodeVersion(original, {}, { nodesDir: testDir });

        const versions = listNodeVersions(original.id, { nodesDir: testDir });
        expect(versions).toHaveLength(2);
        expect(versions[0].version).toBe(1);
        expect(versions[1].version).toBe(2);
      } finally {
        cleanupTempDir(testDir);
      }
    });

    it("accumulates previousVersions over multiple versions", () => {
      const testDir = createTempDir();
      try {
        const original = createTestNode();
        writeNode(original, { nodesDir: testDir });

        const v2 = createNodeVersion(original, {}, { nodesDir: testDir });
        const v3 = createNodeVersion(v2, {}, { nodesDir: testDir });

        expect(v3.version).toBe(3);
        expect(v3.previousVersions).toStrictEqual([
          `${original.id}-v1`,
          `${original.id}-v2`,
        ]);
      } finally {
        cleanupTempDir(testDir);
      }
    });
  });
});

describe("node-types", () => {
  describe("generateNodeId", () => {
    it("generates 16-character hex string", () => {
      const id = generateNodeId();
      expect(id).toMatch(/^[a-f0-9]{16}$/);
    });

    it("generates unique IDs", () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateNodeId());
      }
      expect(ids.size).toBe(100);
    });
  });
});
