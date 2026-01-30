/**
 * Tests for fork detection module
 */

import { describe, expect, it } from "vitest";

import type {
  ForkRelationship,
  SessionHeader,
  SessionInfo,
} from "../types/index.js";

import {
  buildForkTree,
  findForks,
  findForksFromHeaders,
  getForkChain,
  getForkDescendants,
  isForkSession,
} from "./fork.js";

// =============================================================================
// Test Helpers
// =============================================================================

function createSessionHeader(
  id: string,
  parentSession?: string
): SessionHeader {
  return {
    type: "session",
    version: 3,
    id,
    timestamp: `2024-01-01T00:00:00.${id.padStart(3, "0")}Z`,
    cwd: "/home/will/projects/test",
    parentSession,
  };
}

function createSessionInfo(
  path: string,
  id: string,
  parentSession?: string
): SessionInfo {
  return {
    path,
    header: createSessionHeader(id, parentSession),
    entries: [],
    tree: null,
    leafId: null,
    stats: {
      entryCount: 0,
      messageCount: 0,
      userMessageCount: 0,
      assistantMessageCount: 0,
      toolResultCount: 0,
      compactionCount: 0,
      branchSummaryCount: 0,
      branchPointCount: 0,
      maxDepth: 0,
      totalTokens: 0,
      totalCost: 0,
      modelsUsed: [],
    },
  };
}

// =============================================================================
// isForkSession Tests
// =============================================================================

describe("isForkSession", () => {
  it("returns isFork=false for non-fork session", () => {
    const header = createSessionHeader("abc123");
    const result = isForkSession(header, "/path/to/session.jsonl");

    expect(result.isFork).toBeFalsy();
    expect(result.parentPath).toBeUndefined();
    expect(result.sessionPath).toBe("/path/to/session.jsonl");
    expect(result.sessionId).toBe("abc123");
  });

  it("returns isFork=true for fork session", () => {
    const header = createSessionHeader("child123", "/path/to/parent.jsonl");
    const result = isForkSession(header, "/path/to/child.jsonl");

    expect(result.isFork).toBeTruthy();
    expect(result.parentPath).toBe("/path/to/parent.jsonl");
    expect(result.sessionPath).toBe("/path/to/child.jsonl");
    expect(result.sessionId).toBe("child123");
  });

  it("includes timestamp from header", () => {
    const header = createSessionHeader("abc123");
    const result = isForkSession(header, "/path/to/session.jsonl");

    expect(result.timestamp).toBe(header.timestamp);
  });
});

// =============================================================================
// findForks Tests
// =============================================================================

describe("findForks", () => {
  it("returns empty array for no sessions", () => {
    const forks = findForks([]);
    expect(forks).toStrictEqual([]);
  });

  it("returns empty array when no forks exist", () => {
    const sessions: SessionInfo[] = [
      createSessionInfo("/sessions/a.jsonl", "a"),
      createSessionInfo("/sessions/b.jsonl", "b"),
      createSessionInfo("/sessions/c.jsonl", "c"),
    ];

    const forks = findForks(sessions);
    expect(forks).toStrictEqual([]);
  });

  it("finds single fork", () => {
    const sessions: SessionInfo[] = [
      createSessionInfo("/sessions/parent.jsonl", "parent"),
      createSessionInfo(
        "/sessions/child.jsonl",
        "child",
        "/sessions/parent.jsonl"
      ),
    ];

    const forks = findForks(sessions);

    expect(forks).toHaveLength(1);
    expect(forks[0].parentPath).toBe("/sessions/parent.jsonl");
    expect(forks[0].childPath).toBe("/sessions/child.jsonl");
    expect(forks[0].childSessionId).toBe("child");
  });

  it("finds multiple forks from same parent", () => {
    const sessions: SessionInfo[] = [
      createSessionInfo("/sessions/parent.jsonl", "parent"),
      createSessionInfo(
        "/sessions/child1.jsonl",
        "child1",
        "/sessions/parent.jsonl"
      ),
      createSessionInfo(
        "/sessions/child2.jsonl",
        "child2",
        "/sessions/parent.jsonl"
      ),
    ];

    const forks = findForks(sessions);

    expect(forks).toHaveLength(2);
    expect(forks.map((f) => f.childPath)).toContain("/sessions/child1.jsonl");
    expect(forks.map((f) => f.childPath)).toContain("/sessions/child2.jsonl");
  });

  it("finds fork chain (fork of a fork)", () => {
    const sessions: SessionInfo[] = [
      createSessionInfo("/sessions/grandparent.jsonl", "grandparent"),
      createSessionInfo(
        "/sessions/parent.jsonl",
        "parent",
        "/sessions/grandparent.jsonl"
      ),
      createSessionInfo(
        "/sessions/child.jsonl",
        "child",
        "/sessions/parent.jsonl"
      ),
    ];

    const forks = findForks(sessions);

    expect(forks).toHaveLength(2);
    expect(forks[0].parentPath).toBe("/sessions/grandparent.jsonl");
    expect(forks[0].childPath).toBe("/sessions/parent.jsonl");
    expect(forks[1].parentPath).toBe("/sessions/parent.jsonl");
    expect(forks[1].childPath).toBe("/sessions/child.jsonl");
  });
});

// =============================================================================
// findForksFromHeaders Tests
// =============================================================================

describe("findForksFromHeaders", () => {
  it("returns empty array for no headers", () => {
    const forks = findForksFromHeaders([]);
    expect(forks).toStrictEqual([]);
  });

  it("finds forks from headers", () => {
    const headers: [string, SessionHeader][] = [
      ["/sessions/parent.jsonl", createSessionHeader("parent")],
      [
        "/sessions/child.jsonl",
        createSessionHeader("child", "/sessions/parent.jsonl"),
      ],
    ];

    const forks = findForksFromHeaders(headers);

    expect(forks).toHaveLength(1);
    expect(forks[0].parentPath).toBe("/sessions/parent.jsonl");
    expect(forks[0].childPath).toBe("/sessions/child.jsonl");
  });
});

// =============================================================================
// buildForkTree Tests
// =============================================================================

describe("buildForkTree", () => {
  it("returns empty map for no forks", () => {
    const tree = buildForkTree([]);
    expect(tree.size).toBe(0);
  });

  it("builds tree with single fork", () => {
    const forks: ForkRelationship[] = [
      {
        parentPath: "/sessions/parent.jsonl",
        childPath: "/sessions/child.jsonl",
        childSessionId: "child",
        timestamp: "2024-01-01T00:00:00.000Z",
      },
    ];

    const tree = buildForkTree(forks);

    expect(tree.size).toBe(1);
    expect(tree.get("/sessions/parent.jsonl")).toStrictEqual([
      "/sessions/child.jsonl",
    ]);
  });

  it("builds tree with multiple children", () => {
    const forks: ForkRelationship[] = [
      {
        parentPath: "/sessions/parent.jsonl",
        childPath: "/sessions/child1.jsonl",
        childSessionId: "child1",
        timestamp: "2024-01-01T00:00:00.000Z",
      },
      {
        parentPath: "/sessions/parent.jsonl",
        childPath: "/sessions/child2.jsonl",
        childSessionId: "child2",
        timestamp: "2024-01-01T00:00:00.000Z",
      },
    ];

    const tree = buildForkTree(forks);

    expect(tree.size).toBe(1);
    const children = tree.get("/sessions/parent.jsonl");
    expect(children).toHaveLength(2);
    expect(children).toContain("/sessions/child1.jsonl");
    expect(children).toContain("/sessions/child2.jsonl");
  });
});

// =============================================================================
// getForkChain Tests
// =============================================================================

describe("getForkChain", () => {
  it("returns just the session for non-fork", () => {
    const chain = getForkChain("/sessions/a.jsonl", []);
    expect(chain).toStrictEqual(["/sessions/a.jsonl"]);
  });

  it("returns full chain for forked session", () => {
    const forks: ForkRelationship[] = [
      {
        parentPath: "/sessions/grandparent.jsonl",
        childPath: "/sessions/parent.jsonl",
        childSessionId: "parent",
        timestamp: "2024-01-01T00:00:00.000Z",
      },
      {
        parentPath: "/sessions/parent.jsonl",
        childPath: "/sessions/child.jsonl",
        childSessionId: "child",
        timestamp: "2024-01-01T00:00:00.000Z",
      },
    ];

    const chain = getForkChain("/sessions/child.jsonl", forks);

    expect(chain).toStrictEqual([
      "/sessions/grandparent.jsonl",
      "/sessions/parent.jsonl",
      "/sessions/child.jsonl",
    ]);
  });

  it("returns partial chain starting from middle", () => {
    const forks: ForkRelationship[] = [
      {
        parentPath: "/sessions/grandparent.jsonl",
        childPath: "/sessions/parent.jsonl",
        childSessionId: "parent",
        timestamp: "2024-01-01T00:00:00.000Z",
      },
      {
        parentPath: "/sessions/parent.jsonl",
        childPath: "/sessions/child.jsonl",
        childSessionId: "child",
        timestamp: "2024-01-01T00:00:00.000Z",
      },
    ];

    const chain = getForkChain("/sessions/parent.jsonl", forks);

    expect(chain).toStrictEqual([
      "/sessions/grandparent.jsonl",
      "/sessions/parent.jsonl",
    ]);
  });
});

// =============================================================================
// getForkDescendants Tests
// =============================================================================

describe("getForkDescendants", () => {
  it("returns empty array for session with no forks", () => {
    const descendants = getForkDescendants("/sessions/a.jsonl", []);
    expect(descendants).toStrictEqual([]);
  });

  it("returns direct children", () => {
    const forks: ForkRelationship[] = [
      {
        parentPath: "/sessions/parent.jsonl",
        childPath: "/sessions/child1.jsonl",
        childSessionId: "child1",
        timestamp: "2024-01-01T00:00:00.000Z",
      },
      {
        parentPath: "/sessions/parent.jsonl",
        childPath: "/sessions/child2.jsonl",
        childSessionId: "child2",
        timestamp: "2024-01-01T00:00:00.000Z",
      },
    ];

    const descendants = getForkDescendants("/sessions/parent.jsonl", forks);

    expect(descendants).toHaveLength(2);
    expect(descendants).toContain("/sessions/child1.jsonl");
    expect(descendants).toContain("/sessions/child2.jsonl");
  });

  it("returns all descendants recursively", () => {
    const forks: ForkRelationship[] = [
      {
        parentPath: "/sessions/root.jsonl",
        childPath: "/sessions/level1.jsonl",
        childSessionId: "level1",
        timestamp: "2024-01-01T00:00:00.000Z",
      },
      {
        parentPath: "/sessions/level1.jsonl",
        childPath: "/sessions/level2.jsonl",
        childSessionId: "level2",
        timestamp: "2024-01-01T00:00:00.000Z",
      },
      {
        parentPath: "/sessions/level2.jsonl",
        childPath: "/sessions/level3.jsonl",
        childSessionId: "level3",
        timestamp: "2024-01-01T00:00:00.000Z",
      },
    ];

    const descendants = getForkDescendants("/sessions/root.jsonl", forks);

    expect(descendants).toHaveLength(3);
    expect(descendants).toContain("/sessions/level1.jsonl");
    expect(descendants).toContain("/sessions/level2.jsonl");
    expect(descendants).toContain("/sessions/level3.jsonl");
  });

  it("returns empty for leaf session", () => {
    const forks: ForkRelationship[] = [
      {
        parentPath: "/sessions/parent.jsonl",
        childPath: "/sessions/child.jsonl",
        childSessionId: "child",
        timestamp: "2024-01-01T00:00:00.000Z",
      },
    ];

    const descendants = getForkDescendants("/sessions/child.jsonl", forks);
    expect(descendants).toStrictEqual([]);
  });
});
