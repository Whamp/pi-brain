/**
 * Integration tests for session parsing with real session file fixtures
 *
 * Tests the parser against realistic session files that exercise:
 * - Simple linear sessions
 * - Sessions with compaction boundaries
 * - Sessions with branch_summary boundaries
 * - Sessions with resume boundaries (10+ minute gaps)
 * - Forked sessions (with parentSession)
 * - Mixed boundary sessions (multiple boundary types)
 *
 * Fixtures are located in __fixtures__/ directory
 */

import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  detectBoundaries,
  extractSegments,
  getBoundaryStats,
} from "./boundary.js";
import {
  isForkSession,
  findForks,
  findForksFromHeaders,
  buildForkTree,
  getForkChain,
  getForkDescendants,
} from "./fork.js";
import { parseSession } from "./session.js";

// =============================================================================
// Test Utilities
// =============================================================================

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const FIXTURES_DIR = join(__dirname, "__fixtures__");

function fixturePath(name: string): string {
  return join(FIXTURES_DIR, name);
}

// =============================================================================
// Simple Session Tests
// =============================================================================

describe("real Session Fixtures - Simple Session", () => {
  const sessionPath = fixturePath("simple-session.jsonl");

  it("should parse session header correctly", async () => {
    const session = await parseSession(sessionPath);
    expect(session.header.type).toBe("session");
    expect(session.header.version).toBe(3);
    expect(session.header.id).toBe("a1b2c3d4-e5f6-7890-abcd-ef1234567890");
    expect(session.header.cwd).toBe("/home/will/projects/test-project");
  });

  it("should have no parentSession in header", async () => {
    const session = await parseSession(sessionPath);
    expect(session.header.parentSession).toBeUndefined();
  });

  it("should parse all entries", async () => {
    const session = await parseSession(sessionPath);
    expect(session.entries).toHaveLength(6);
  });

  it("should detect no boundaries in linear session", async () => {
    const session = await parseSession(sessionPath);
    const boundaries = detectBoundaries(session.entries);
    expect(boundaries).toHaveLength(0);
  });

  it("should extract single segment for linear session", async () => {
    const session = await parseSession(sessionPath);
    const segments = extractSegments(session.entries);
    expect(segments).toHaveLength(1);
    expect(segments[0].startEntryId).toBe("00000001");
    expect(segments[0].endEntryId).toBe("00000006");
  });

  it("should not be detected as fork session", async () => {
    const session = await parseSession(sessionPath);
    const forkInfo = isForkSession(session.header, session.path);
    expect(forkInfo.isFork).toBeFalsy();
    expect(forkInfo.parentPath).toBeUndefined();
  });

  it("should calculate message stats correctly", async () => {
    const session = await parseSession(sessionPath);
    expect(session.stats.messageCount).toBe(6);
    expect(session.stats.userMessageCount).toBe(2);
    expect(session.stats.assistantMessageCount).toBe(3);
    expect(session.stats.toolResultCount).toBe(1);
  });

  it("should have zero boundary entry counts", async () => {
    const session = await parseSession(sessionPath);
    expect(session.stats.compactionCount).toBe(0);
    expect(session.stats.branchSummaryCount).toBe(0);
  });

  it("should track models used", async () => {
    const session = await parseSession(sessionPath);
    expect(session.stats.modelsUsed).toContain("openai/gpt-4");
  });

  it("should find leaf entry", async () => {
    const session = await parseSession(sessionPath);
    expect(session.leafId).toBe("00000006");
  });

  it("should build tree correctly", async () => {
    const session = await parseSession(sessionPath);
    expect(session.tree).not.toBeNull();
    expect(session.tree?.entry.id).toBe("00000001");
    expect(session.tree?.depth).toBe(0);
  });
});

// =============================================================================
// Session with Compaction Tests
// =============================================================================

describe("real Session Fixtures - Session with Compaction", () => {
  const sessionPath = fixturePath("session-with-compaction.jsonl");

  it("should parse session with compaction entry", async () => {
    const session = await parseSession(sessionPath);
    expect(session.entries).toHaveLength(7);
    expect(session.stats.compactionCount).toBe(1);
  });

  it("should detect compaction boundary", async () => {
    const session = await parseSession(sessionPath);
    const boundaries = detectBoundaries(session.entries);
    const compactionBoundaries = boundaries.filter(
      (b) => b.type === "compaction"
    );
    expect(compactionBoundaries).toHaveLength(1);
    expect(compactionBoundaries[0].entryId).toBe("00000005");
  });

  it("should have compaction metadata with tokensBefore", async () => {
    const session = await parseSession(sessionPath);
    const boundaries = detectBoundaries(session.entries);
    const compaction = boundaries.find((b) => b.type === "compaction");
    expect(compaction?.metadata?.tokensBefore).toBe(70_948);
  });

  it("should have compaction metadata with summary", async () => {
    const session = await parseSession(sessionPath);
    const boundaries = detectBoundaries(session.entries);
    const compaction = boundaries.find((b) => b.type === "compaction");
    expect(compaction?.metadata?.summary).toContain("Context Checkpoint");
  });

  it("should extract segments split by compaction", async () => {
    const session = await parseSession(sessionPath);
    const segments = extractSegments(session.entries);
    expect(segments).toHaveLength(2);
    expect(segments[0].endEntryId).toBe("00000004");
    expect(segments[1].startEntryId).toBe("00000005");
  });

  it("should calculate boundary stats correctly", async () => {
    const session = await parseSession(sessionPath);
    const stats = getBoundaryStats(session.entries);
    expect(stats.total).toBe(1);
    expect(stats.byType.compaction).toBe(1);
    expect(stats.segmentCount).toBe(2);
  });

  it("should have zero non-compaction boundaries", async () => {
    const session = await parseSession(sessionPath);
    const stats = getBoundaryStats(session.entries);
    expect(stats.byType.branch).toBe(0);
    expect(stats.byType.tree_jump).toBe(0);
    expect(stats.byType.resume).toBe(0);
  });
});

// =============================================================================
// Session with Branch Summary Tests
// =============================================================================

describe("real Session Fixtures - Session with Branch Summary", () => {
  const sessionPath = fixturePath("session-with-branch-summary.jsonl");

  it("should parse session with branch_summary entry", async () => {
    const session = await parseSession(sessionPath);
    expect(session.entries).toHaveLength(7);
    expect(session.stats.branchSummaryCount).toBe(1);
  });

  it("should detect branch boundary", async () => {
    const session = await parseSession(sessionPath);
    const boundaries = detectBoundaries(session.entries);
    const branchBoundaries = boundaries.filter((b) => b.type === "branch");
    expect(branchBoundaries).toHaveLength(1);
    expect(branchBoundaries[0].entryId).toBe("00000005");
  });

  it("should have branch metadata with summary", async () => {
    const session = await parseSession(sessionPath);
    const boundaries = detectBoundaries(session.entries);
    const branch = boundaries.find((b) => b.type === "branch");
    expect(branch?.metadata?.summary).toContain("Explored feature A");
  });

  it("should have branch previousEntryId from fromId", async () => {
    const session = await parseSession(sessionPath);
    const boundaries = detectBoundaries(session.entries);
    const branch = boundaries.find((b) => b.type === "branch");
    expect(branch?.previousEntryId).toBe("00000002");
  });

  it("should extract segments split by branch", async () => {
    const session = await parseSession(sessionPath);
    const segments = extractSegments(session.entries);
    expect(segments).toHaveLength(2);
  });

  it("should track model used", async () => {
    const session = await parseSession(sessionPath);
    expect(session.stats.modelsUsed).toContain(
      "anthropic/claude-sonnet-4-20250514"
    );
  });
});

// =============================================================================
// Session with Resume (10+ min gap) Tests
// =============================================================================

describe("real Session Fixtures - Session with Resume", () => {
  const sessionPath = fixturePath("session-with-resume.jsonl");

  it("should parse session with timestamp gaps", async () => {
    const session = await parseSession(sessionPath);
    expect(session.entries).toHaveLength(8);
  });

  it("should detect resume boundary for 20-minute gap", async () => {
    const session = await parseSession(sessionPath);
    const boundaries = detectBoundaries(session.entries);
    const resumeBoundaries = boundaries.filter((b) => b.type === "resume");
    expect(resumeBoundaries).toHaveLength(1);
    expect(resumeBoundaries[0].entryId).toBe("00000005");
  });

  it("should have resume metadata with gap duration", async () => {
    const session = await parseSession(sessionPath);
    const boundaries = detectBoundaries(session.entries);
    const resume = boundaries.find((b) => b.type === "resume");
    expect(resume?.metadata?.gapMinutes).toBeGreaterThanOrEqual(19);
    expect(resume?.metadata?.gapMinutes).toBeLessThanOrEqual(21);
  });

  it("should not trigger resume for 5-minute gaps", async () => {
    const session = await parseSession(sessionPath);
    const boundaries = detectBoundaries(session.entries);
    expect(boundaries).toHaveLength(1);
  });

  it("should extract segments split by resume", async () => {
    const session = await parseSession(sessionPath);
    const segments = extractSegments(session.entries);
    expect(segments).toHaveLength(2);
    expect(segments[0].entryCount).toBe(4);
    expect(segments[1].entryCount).toBe(4);
  });
});

// =============================================================================
// Forked Session Tests
// =============================================================================

describe("real Session Fixtures - Forked Session", () => {
  const sessionPath = fixturePath("session-forked.jsonl");
  const expectedParentPath =
    "/home/will/.pi/agent/sessions/--home-will-projects-test-project--/2026-01-25T10-00-00-000Z_parent-sess.jsonl";

  it("should parse forked session header", async () => {
    const session = await parseSession(sessionPath);
    expect(session.header.parentSession).toBe(expectedParentPath);
  });

  it("should detect as fork session", async () => {
    const session = await parseSession(sessionPath);
    const forkInfo = isForkSession(session.header, session.path);
    expect(forkInfo.isFork).toBeTruthy();
    expect(forkInfo.parentPath).toBe(expectedParentPath);
  });

  it("should have correct session ID in fork info", async () => {
    const session = await parseSession(sessionPath);
    const forkInfo = isForkSession(session.header, session.path);
    expect(forkInfo.sessionId).toBe("fork-child-1234-5678-90ab-cdef12345678");
  });

  it("should find forks from session list", async () => {
    const session = await parseSession(sessionPath);
    const forks = findForks([session]);
    expect(forks).toHaveLength(1);
    expect(forks[0].parentPath).toBe(expectedParentPath);
    expect(forks[0].childPath).toBe(session.path);
  });

  it("should include childSessionId in fork relationship", async () => {
    const session = await parseSession(sessionPath);
    const forks = findForks([session]);
    expect(forks[0].childSessionId).toBe(
      "fork-child-1234-5678-90ab-cdef12345678"
    );
  });

  it("should find forks from headers", async () => {
    const session = await parseSession(sessionPath);
    const headers: [string, typeof session.header][] = [
      [session.path, session.header],
    ];
    const forks = findForksFromHeaders(headers);
    expect(forks).toHaveLength(1);
    expect(forks[0].parentPath).toBe(session.header.parentSession);
  });

  it("should track model used", async () => {
    const session = await parseSession(sessionPath);
    expect(session.stats.modelsUsed).toContain("xai/grok-3");
  });
});

// =============================================================================
// Fork Tree and Chain Tests
// =============================================================================

describe("real Session Fixtures - Fork Tree Operations", () => {
  const mockForks = [
    {
      parentPath: "/sessions/root.jsonl",
      childPath: "/sessions/child1.jsonl",
      childSessionId: "child1",
      timestamp: "2026-01-25T11:00:00.000Z",
    },
    {
      parentPath: "/sessions/root.jsonl",
      childPath: "/sessions/child2.jsonl",
      childSessionId: "child2",
      timestamp: "2026-01-25T12:00:00.000Z",
    },
    {
      parentPath: "/sessions/child1.jsonl",
      childPath: "/sessions/grandchild.jsonl",
      childSessionId: "grandchild",
      timestamp: "2026-01-25T13:00:00.000Z",
    },
  ];

  it("should build fork tree with correct children for root", () => {
    const tree = buildForkTree(mockForks);
    expect(tree.get("/sessions/root.jsonl")).toStrictEqual([
      "/sessions/child1.jsonl",
      "/sessions/child2.jsonl",
    ]);
  });

  it("should build fork tree with correct children for intermediate node", () => {
    const tree = buildForkTree(mockForks);
    expect(tree.get("/sessions/child1.jsonl")).toStrictEqual([
      "/sessions/grandchild.jsonl",
    ]);
  });

  it("should not have entries for leaf nodes in fork tree", () => {
    const tree = buildForkTree(mockForks);
    expect(tree.has("/sessions/child2.jsonl")).toBeFalsy();
    expect(tree.has("/sessions/grandchild.jsonl")).toBeFalsy();
  });

  it("should get full fork chain to root", () => {
    const chain = getForkChain("/sessions/grandchild.jsonl", mockForks);
    expect(chain).toStrictEqual([
      "/sessions/root.jsonl",
      "/sessions/child1.jsonl",
      "/sessions/grandchild.jsonl",
    ]);
  });

  it("should get fork chain for root as just itself", () => {
    const chain = getForkChain("/sessions/root.jsonl", mockForks);
    expect(chain).toStrictEqual(["/sessions/root.jsonl"]);
  });

  it("should get all fork descendants", () => {
    const descendants = getForkDescendants("/sessions/root.jsonl", mockForks);
    expect(descendants).toHaveLength(3);
    expect(descendants).toContain("/sessions/child1.jsonl");
    expect(descendants).toContain("/sessions/child2.jsonl");
  });

  it("should include grandchildren in fork descendants", () => {
    const descendants = getForkDescendants("/sessions/root.jsonl", mockForks);
    expect(descendants).toContain("/sessions/grandchild.jsonl");
  });

  it("should get empty descendants for leaf", () => {
    const descendants = getForkDescendants(
      "/sessions/grandchild.jsonl",
      mockForks
    );
    expect(descendants).toHaveLength(0);
  });
});

// =============================================================================
// Mixed Boundary Session Tests
// =============================================================================

describe("real Session Fixtures - Session with Mixed Boundaries", () => {
  const sessionPath = fixturePath("session-with-mixed-boundaries.jsonl");

  it("should parse session with multiple entry types", async () => {
    const session = await parseSession(sessionPath);
    expect(session.entries).toHaveLength(16);
  });

  it("should have one compaction entry", async () => {
    const session = await parseSession(sessionPath);
    expect(session.stats.compactionCount).toBe(1);
  });

  it("should have one branch_summary entry", async () => {
    const session = await parseSession(sessionPath);
    expect(session.stats.branchSummaryCount).toBe(1);
  });

  it("should detect all boundary types", async () => {
    const session = await parseSession(sessionPath);
    const stats = getBoundaryStats(session.entries);
    expect(stats.byType.compaction).toBe(1);
    expect(stats.byType.branch).toBe(1);
    expect(stats.byType.resume).toBe(1);
  });

  it("should detect compaction first in order", async () => {
    const session = await parseSession(sessionPath);
    const boundaries = detectBoundaries(session.entries);
    expect(boundaries[0].type).toBe("compaction");
  });

  it("should detect resume second in order", async () => {
    const session = await parseSession(sessionPath);
    const boundaries = detectBoundaries(session.entries);
    expect(boundaries[1].type).toBe("resume");
  });

  it("should detect branch third in order", async () => {
    const session = await parseSession(sessionPath);
    const boundaries = detectBoundaries(session.entries);
    expect(boundaries[2].type).toBe("branch");
  });

  it("should extract multiple segments", async () => {
    const session = await parseSession(sessionPath);
    const segments = extractSegments(session.entries);
    expect(segments.length).toBeGreaterThanOrEqual(3);
  });

  it("should not create boundaries for label entries", async () => {
    const session = await parseSession(sessionPath);
    const boundaries = detectBoundaries(session.entries);
    const boundaryIds = boundaries.map((b) => b.entryId);
    expect(boundaryIds).not.toContain("00000003");
  });

  it("should not create boundaries for session_info entries", async () => {
    const session = await parseSession(sessionPath);
    const boundaries = detectBoundaries(session.entries);
    const boundaryIds = boundaries.map((b) => b.entryId);
    expect(boundaryIds).not.toContain("00000006");
  });

  it("should find session name from session_info entry", async () => {
    const session = await parseSession(sessionPath);
    expect(session.name).toBe("Complex Session - Phase 1");
  });
});

// =============================================================================
// Cross-Session Fork Detection
// =============================================================================

describe("real Session Fixtures - Cross-Session Fork Detection", () => {
  it("should find forks across multiple sessions", async () => {
    const simpleSession = await parseSession(
      fixturePath("simple-session.jsonl")
    );
    const forkedSession = await parseSession(
      fixturePath("session-forked.jsonl")
    );
    const allSessions = [simpleSession, forkedSession];
    const forks = findForks(allSessions);
    expect(forks).toHaveLength(1);
    expect(forks[0].childPath).toBe(forkedSession.path);
  });

  it("should not create forks for non-forked sessions", async () => {
    const simpleSession = await parseSession(
      fixturePath("simple-session.jsonl")
    );
    const forks = findForks([simpleSession]);
    expect(forks).toHaveLength(0);
  });

  it("should work with findForksFromHeaders for multiple sessions", async () => {
    const simpleSession = await parseSession(
      fixturePath("simple-session.jsonl")
    );
    const forkedSession = await parseSession(
      fixturePath("session-forked.jsonl")
    );
    const headers: [string, typeof simpleSession.header][] = [
      [simpleSession.path, simpleSession.header],
      [forkedSession.path, forkedSession.header],
    ];
    const forks = findForksFromHeaders(headers);
    expect(forks).toHaveLength(1);
    expect(forks[0].childPath).toBe(forkedSession.path);
  });
});
