/**
 * Tests for boundary detection module
 */

import { describe, expect, it } from "vitest";

import type {
  BranchSummaryEntry,
  CompactionEntry,
  SessionEntry,
  SessionMessageEntry,
} from "../types.js";

import {
  detectBoundaries,
  extractSegments,
  getBoundaryStats,
  LeafTracker,
} from "./boundary.js";

// =============================================================================
// Test Helpers
// =============================================================================

function createMessageEntry(
  id: string,
  parentId: string | null,
  timestamp?: string
): SessionMessageEntry {
  return {
    type: "message",
    id,
    parentId,
    timestamp: timestamp ?? `2024-01-01T00:00:00.${id.padStart(3, "0")}Z`,
    message: {
      role: "user",
      content: `Message ${id}`,
    },
  };
}

function createBranchSummaryEntry(
  id: string,
  parentId: string | null,
  fromId: string,
  summary: string,
  timestamp?: string
): BranchSummaryEntry {
  return {
    type: "branch_summary",
    id,
    parentId,
    timestamp: timestamp ?? `2024-01-01T00:00:00.${id.padStart(3, "0")}Z`,
    fromId,
    summary,
  };
}

function createCompactionEntry(
  id: string,
  parentId: string | null,
  tokensBefore: number,
  summary: string,
  timestamp?: string
): CompactionEntry {
  return {
    type: "compaction",
    id,
    parentId,
    timestamp: timestamp ?? `2024-01-01T00:00:00.${id.padStart(3, "0")}Z`,
    summary,
    firstKeptEntryId: parentId ?? id,
    tokensBefore,
  };
}

function createLabelEntry(
  id: string,
  parentId: string | null,
  targetId: string
): SessionEntry {
  return {
    type: "label",
    id,
    parentId,
    timestamp: `2024-01-01T00:00:00.${id.padStart(3, "0")}Z`,
    targetId,
    label: "test-label",
  } as SessionEntry;
}

function createSessionInfoEntry(
  id: string,
  parentId: string | null,
  name: string
): SessionEntry {
  return {
    type: "session_info",
    id,
    parentId,
    timestamp: `2024-01-01T00:00:00.${id.padStart(3, "0")}Z`,
    name,
  } as SessionEntry;
}

// Helper to create a timestamp with minute offset
function timestamp(baseMinute: number): string {
  const minutes = String(baseMinute).padStart(2, "0");
  return `2024-01-01T00:${minutes}:00.000Z`;
}

// =============================================================================
// LeafTracker Tests
// =============================================================================

describe("leafTracker", () => {
  describe("basic tracking", () => {
    it("starts with null leaf", () => {
      const tracker = new LeafTracker();
      expect(tracker.getCurrentLeaf()).toBeNull();
    });

    it("tracks single entry as leaf", () => {
      const tracker = new LeafTracker();
      const entry = createMessageEntry("a", null);

      tracker.update(entry);

      expect(tracker.getCurrentLeaf()).toBe("a");
    });

    it("updates leaf as entries are added", () => {
      const tracker = new LeafTracker();

      tracker.update(createMessageEntry("a", null));
      expect(tracker.getCurrentLeaf()).toBe("a");

      tracker.update(createMessageEntry("b", "a"));
      expect(tracker.getCurrentLeaf()).toBe("b");

      tracker.update(createMessageEntry("c", "b"));
      expect(tracker.getCurrentLeaf()).toBe("c");
    });

    it("ignores label entries for leaf tracking", () => {
      const tracker = new LeafTracker();

      tracker.update(createMessageEntry("a", null));
      tracker.update(createLabelEntry("label1", "a", "a"));

      expect(tracker.getCurrentLeaf()).toBe("a");
    });

    it("ignores session_info entries for leaf tracking", () => {
      const tracker = new LeafTracker();

      tracker.update(createMessageEntry("a", null));
      tracker.update(createSessionInfoEntry("info1", "a", "Test Session"));

      expect(tracker.getCurrentLeaf()).toBe("a");
    });
  });

  describe("branch point detection", () => {
    it("detects branch points", () => {
      const tracker = new LeafTracker();

      tracker.update(createMessageEntry("root", null));
      tracker.update(createMessageEntry("child1", "root"));
      tracker.update(createMessageEntry("child2", "root"));

      expect(tracker.isBranchPoint("root")).toBeTruthy();
      expect(tracker.isBranchPoint("child1")).toBeFalsy();
      expect(tracker.isBranchPoint("child2")).toBeFalsy();
    });

    it("single child is not a branch point", () => {
      const tracker = new LeafTracker();

      tracker.update(createMessageEntry("root", null));
      tracker.update(createMessageEntry("child", "root"));

      expect(tracker.isBranchPoint("root")).toBeFalsy();
    });
  });

  describe("leaf detection", () => {
    it("entry without children is a leaf", () => {
      const tracker = new LeafTracker();

      tracker.update(createMessageEntry("a", null));
      tracker.update(createMessageEntry("b", "a"));

      expect(tracker.isLeaf("a")).toBeFalsy();
      expect(tracker.isLeaf("b")).toBeTruthy();
    });
  });

  describe("reset", () => {
    it("clears all tracking state", () => {
      const tracker = new LeafTracker();

      tracker.update(createMessageEntry("a", null));
      tracker.update(createMessageEntry("b", "a"));

      tracker.reset();

      expect(tracker.getCurrentLeaf()).toBeNull();
      expect(tracker.getPreviousEntryId()).toBeNull();
      expect(tracker.isLeaf("a")).toBeTruthy(); // No info after reset
    });
  });
});

// =============================================================================
// detectBoundaries Tests
// =============================================================================

describe("detectBoundaries", () => {
  describe("empty and simple cases", () => {
    it("returns empty array for empty entries", () => {
      const boundaries = detectBoundaries([]);
      expect(boundaries).toStrictEqual([]);
    });

    it("returns empty array for single entry", () => {
      const entries = [createMessageEntry("a", null)];
      const boundaries = detectBoundaries(entries);
      expect(boundaries).toStrictEqual([]);
    });

    it("returns empty array for linear conversation", () => {
      const entries = [
        createMessageEntry("a", null, timestamp(0)),
        createMessageEntry("b", "a", timestamp(1)),
        createMessageEntry("c", "b", timestamp(2)),
      ];
      const boundaries = detectBoundaries(entries);
      expect(boundaries).toStrictEqual([]);
    });
  });

  describe("branch_summary detection", () => {
    it("detects branch_summary entry", () => {
      const entries: SessionEntry[] = [
        createMessageEntry("a", null),
        createMessageEntry("b", "a"),
        createBranchSummaryEntry("bs1", "a", "b", "Summarized the work"),
        createMessageEntry("c", "a"),
      ];

      const boundaries = detectBoundaries(entries);

      expect(boundaries).toHaveLength(1);
      expect(boundaries[0].type).toBe("branch");
      expect(boundaries[0].entryId).toBe("bs1");
      expect(boundaries[0].previousEntryId).toBe("b");
      expect(boundaries[0].metadata?.summary).toBe("Summarized the work");
    });

    it("detects multiple branch_summary entries", () => {
      const entries: SessionEntry[] = [
        createMessageEntry("a", null),
        createBranchSummaryEntry("bs1", "a", "a", "First summary"),
        createMessageEntry("b", "a"),
        createBranchSummaryEntry("bs2", "b", "b", "Second summary"),
        createMessageEntry("c", "b"),
      ];

      const boundaries = detectBoundaries(entries);

      expect(boundaries).toHaveLength(2);
      expect(boundaries[0].metadata?.summary).toBe("First summary");
      expect(boundaries[1].metadata?.summary).toBe("Second summary");
    });
  });

  describe("compaction detection", () => {
    it("detects compaction entry", () => {
      const entries: SessionEntry[] = [
        createMessageEntry("a", null),
        createMessageEntry("b", "a"),
        createCompactionEntry("comp1", "b", 50_000, "Context was compacted"),
        createMessageEntry("c", "comp1"),
      ];

      const boundaries = detectBoundaries(entries);

      expect(boundaries).toHaveLength(1);
      expect(boundaries[0].type).toBe("compaction");
      expect(boundaries[0].entryId).toBe("comp1");
      expect(boundaries[0].metadata?.tokensBefore).toBe(50_000);
      expect(boundaries[0].metadata?.summary).toBe("Context was compacted");
    });
  });

  describe("tree_jump detection", () => {
    it("detects tree jump when parentId mismatches current leaf", () => {
      const entries: SessionEntry[] = [
        createMessageEntry("a", null),
        createMessageEntry("b", "a"),
        createMessageEntry("c", "b"),
        // Jump back to "a" instead of continuing from "c"
        createMessageEntry("d", "a"),
      ];

      const boundaries = detectBoundaries(entries);

      expect(boundaries).toHaveLength(1);
      expect(boundaries[0].type).toBe("tree_jump");
      expect(boundaries[0].entryId).toBe("d");
      expect(boundaries[0].previousEntryId).toBe("c");
    });

    it("detects tree jump with correct metadata", () => {
      const entries: SessionEntry[] = [
        createMessageEntry("a", null),
        createMessageEntry("b", "a"),
        createMessageEntry("c", "b"),
        // Jump back to "a" instead of continuing from "c"
        createMessageEntry("d", "a"),
      ];

      const boundaries = detectBoundaries(entries);

      expect(boundaries[0].metadata?.expectedParentId).toBe("c");
      expect(boundaries[0].metadata?.actualParentId).toBe("a");
    });

    it("does not detect jump on first entry with null parent", () => {
      const entries: SessionEntry[] = [createMessageEntry("a", null)];

      const boundaries = detectBoundaries(entries);
      expect(boundaries).toHaveLength(0);
    });

    it("detects jump to middle of tree", () => {
      const entries: SessionEntry[] = [
        createMessageEntry("a", null),
        createMessageEntry("b", "a"),
        createMessageEntry("c", "b"),
        createMessageEntry("d", "c"),
        // Jump back to "b"
        createMessageEntry("e", "b"),
      ];

      const boundaries = detectBoundaries(entries);

      expect(boundaries).toHaveLength(1);
      expect(boundaries[0].type).toBe("tree_jump");
      expect(boundaries[0].entryId).toBe("e");
      expect(boundaries[0].metadata?.expectedParentId).toBe("d");
      expect(boundaries[0].metadata?.actualParentId).toBe("b");
    });
  });

  describe("resume detection (10+ minute gap)", () => {
    it("detects gap of exactly 10 minutes", () => {
      const entries: SessionEntry[] = [
        createMessageEntry("a", null, "2024-01-01T00:00:00.000Z"),
        createMessageEntry("b", "a", "2024-01-01T00:10:00.000Z"),
      ];

      const boundaries = detectBoundaries(entries);

      expect(boundaries).toHaveLength(1);
      expect(boundaries[0].type).toBe("resume");
      expect(boundaries[0].entryId).toBe("b");
      expect(boundaries[0].previousEntryId).toBe("a");
      expect(boundaries[0].metadata?.gapMinutes).toBe(10);
    });

    it("detects gap longer than 10 minutes", () => {
      const entries: SessionEntry[] = [
        createMessageEntry("a", null, "2024-01-01T00:00:00.000Z"),
        createMessageEntry("b", "a", "2024-01-01T00:30:00.000Z"),
      ];

      const boundaries = detectBoundaries(entries);

      expect(boundaries).toHaveLength(1);
      expect(boundaries[0].metadata?.gapMinutes).toBe(30);
    });

    it("does not detect gap shorter than 10 minutes", () => {
      const entries: SessionEntry[] = [
        createMessageEntry("a", null, "2024-01-01T00:00:00.000Z"),
        createMessageEntry("b", "a", "2024-01-01T00:09:59.000Z"),
      ];

      const boundaries = detectBoundaries(entries);

      expect(boundaries).toHaveLength(0);
    });

    it("detects multiple resume gaps", () => {
      const entries: SessionEntry[] = [
        createMessageEntry("a", null, "2024-01-01T00:00:00.000Z"),
        createMessageEntry("b", "a", "2024-01-01T00:15:00.000Z"),
        createMessageEntry("c", "b", "2024-01-01T00:16:00.000Z"),
        createMessageEntry("d", "c", "2024-01-01T01:00:00.000Z"),
      ];

      const boundaries = detectBoundaries(entries);

      expect(boundaries).toHaveLength(2);
      expect(boundaries[0].entryId).toBe("b");
      expect(boundaries[1].entryId).toBe("d");
    });
  });

  describe("metadata entries are ignored", () => {
    it("skips label entries", () => {
      const entries: SessionEntry[] = [
        createMessageEntry("a", null, timestamp(0)),
        createLabelEntry("label1", "a", "a"),
        createMessageEntry("b", "a", timestamp(1)),
      ];

      const boundaries = detectBoundaries(entries);
      expect(boundaries).toHaveLength(0);
    });

    it("skips session_info entries", () => {
      const entries: SessionEntry[] = [
        createMessageEntry("a", null, timestamp(0)),
        createSessionInfoEntry("info1", "a", "Test"),
        createMessageEntry("b", "a", timestamp(1)),
      ];

      const boundaries = detectBoundaries(entries);
      expect(boundaries).toHaveLength(0);
    });
  });

  describe("multiple boundary types together", () => {
    it("detects all boundary types in one session", () => {
      const entries: SessionEntry[] = [
        createMessageEntry("a", null, "2024-01-01T00:00:00.000Z"),
        createMessageEntry("b", "a", "2024-01-01T00:01:00.000Z"),
        // Resume after 15 min gap
        createMessageEntry("c", "b", "2024-01-01T00:16:00.000Z"),
        // Compaction
        createCompactionEntry(
          "comp1",
          "c",
          40_000,
          "Compacted",
          "2024-01-01T00:17:00.000Z"
        ),
        createMessageEntry("d", "comp1", "2024-01-01T00:18:00.000Z"),
        // Branch summary
        createBranchSummaryEntry(
          "bs1",
          "d",
          "d",
          "Summary",
          "2024-01-01T00:19:00.000Z"
        ),
        createMessageEntry("e", "d", "2024-01-01T00:20:00.000Z"),
        createMessageEntry("f", "e", "2024-01-01T00:21:00.000Z"),
        // Tree jump back to "d"
        createMessageEntry("g", "d", "2024-01-01T00:22:00.000Z"),
      ];

      const boundaries = detectBoundaries(entries);

      const types = boundaries.map((b) => b.type);
      expect(types).toContain("resume");
      expect(types).toContain("compaction");
      expect(types).toContain("branch");
      expect(types).toContain("tree_jump");
    });
  });
});

// =============================================================================
// extractSegments Tests
// =============================================================================

describe("extractSegments", () => {
  it("returns empty array for empty entries", () => {
    const segments = extractSegments([]);
    expect(segments).toStrictEqual([]);
  });

  it("returns single segment for entries without boundaries", () => {
    const entries: SessionEntry[] = [
      createMessageEntry("a", null, timestamp(0)),
      createMessageEntry("b", "a", timestamp(1)),
      createMessageEntry("c", "b", timestamp(2)),
    ];

    const segments = extractSegments(entries);

    expect(segments).toHaveLength(1);
    expect(segments[0].startEntryId).toBe("a");
    expect(segments[0].endEntryId).toBe("c");
    expect(segments[0].entryCount).toBe(3);
  });

  it("splits on resume boundary - creates two segments", () => {
    const entries: SessionEntry[] = [
      createMessageEntry("a", null, "2024-01-01T00:00:00.000Z"),
      createMessageEntry("b", "a", "2024-01-01T00:01:00.000Z"),
      // 15 minute gap
      createMessageEntry("c", "b", "2024-01-01T00:16:00.000Z"),
      createMessageEntry("d", "c", "2024-01-01T00:17:00.000Z"),
    ];

    const segments = extractSegments(entries);

    expect(segments).toHaveLength(2);
    expect(segments[0].startEntryId).toBe("a");
    expect(segments[0].endEntryId).toBe("b");
    expect(segments[0].entryCount).toBe(2);
  });

  it("splits on resume boundary - second segment is correct", () => {
    const entries: SessionEntry[] = [
      createMessageEntry("a", null, "2024-01-01T00:00:00.000Z"),
      createMessageEntry("b", "a", "2024-01-01T00:01:00.000Z"),
      // 15 minute gap
      createMessageEntry("c", "b", "2024-01-01T00:16:00.000Z"),
      createMessageEntry("d", "c", "2024-01-01T00:17:00.000Z"),
    ];

    const segments = extractSegments(entries);

    expect(segments[1].startEntryId).toBe("c");
    expect(segments[1].endEntryId).toBe("d");
    expect(segments[1].entryCount).toBe(2);
  });

  it("splits on compaction boundary", () => {
    const entries: SessionEntry[] = [
      createMessageEntry("a", null, timestamp(0)),
      createMessageEntry("b", "a", timestamp(1)),
      createCompactionEntry("comp1", "b", 40_000, "Compacted", timestamp(2)),
      createMessageEntry("c", "comp1", timestamp(3)),
    ];

    const segments = extractSegments(entries);

    expect(segments).toHaveLength(2);
    expect(segments[0].endEntryId).toBe("b");
    expect(segments[1].startEntryId).toBe("comp1");
  });

  it("splits on branch_summary boundary", () => {
    const entries: SessionEntry[] = [
      createMessageEntry("a", null, timestamp(0)),
      createMessageEntry("b", "a", timestamp(1)),
      createBranchSummaryEntry("bs1", "a", "b", "Summary", timestamp(2)),
      createMessageEntry("c", "a", timestamp(3)),
    ];

    const segments = extractSegments(entries);

    expect(segments).toHaveLength(2);
    expect(segments[0].endEntryId).toBe("b");
    expect(segments[1].startEntryId).toBe("bs1");
  });

  it("splits on tree_jump boundary", () => {
    const entries: SessionEntry[] = [
      createMessageEntry("a", null, timestamp(0)),
      createMessageEntry("b", "a", timestamp(1)),
      createMessageEntry("c", "b", timestamp(2)),
      // Jump back to "a"
      createMessageEntry("d", "a", timestamp(3)),
    ];

    const segments = extractSegments(entries);

    expect(segments).toHaveLength(2);
    expect(segments[0].startEntryId).toBe("a");
    expect(segments[0].endEntryId).toBe("c");
    expect(segments[1].startEntryId).toBe("d");
    expect(segments[1].endEntryId).toBe("d");
  });

  it("handles multiple boundaries creating multiple segments", () => {
    const entries: SessionEntry[] = [
      createMessageEntry("a", null, "2024-01-01T00:00:00.000Z"),
      // Resume after gap
      createMessageEntry("b", "a", "2024-01-01T00:15:00.000Z"),
      createMessageEntry("c", "b", "2024-01-01T00:16:00.000Z"),
      // Another gap
      createMessageEntry("d", "c", "2024-01-01T00:30:00.000Z"),
    ];

    const segments = extractSegments(entries);

    expect(segments).toHaveLength(3);
    expect(segments[0].entryCount).toBe(1);
    expect(segments[1].entryCount).toBe(2);
    expect(segments[2].entryCount).toBe(1);
  });

  it("excludes metadata entries from segments", () => {
    const entries: SessionEntry[] = [
      createMessageEntry("a", null, timestamp(0)),
      createLabelEntry("label1", "a", "a"),
      createSessionInfoEntry("info1", "a", "Test"),
      createMessageEntry("b", "a", timestamp(1)),
    ];

    const segments = extractSegments(entries);

    expect(segments).toHaveLength(1);
    expect(segments[0].entryCount).toBe(2); // Only message entries
    expect(segments[0].startEntryId).toBe("a");
    expect(segments[0].endEntryId).toBe("b");
  });

  describe("boundaries field population", () => {
    it("populates boundaries array on segments that end due to a boundary", () => {
      const entries: SessionEntry[] = [
        createMessageEntry("a", null, "2024-01-01T00:00:00.000Z"),
        createMessageEntry("b", "a", "2024-01-01T00:01:00.000Z"),
        // 15 minute gap creates resume boundary
        createMessageEntry("c", "b", "2024-01-01T00:16:00.000Z"),
        createMessageEntry("d", "c", "2024-01-01T00:17:00.000Z"),
      ];

      const segments = extractSegments(entries);

      expect(segments).toHaveLength(2);
      // First segment should have the resume boundary
      expect(segments[0].boundaries).toHaveLength(1);
      expect(segments[0].boundaries[0].type).toBe("resume");
      expect(segments[0].boundaries[0].entryId).toBe("c");
      // Last segment has no boundaries (session ends normally)
      expect(segments[1].boundaries).toHaveLength(0);
    });

    it("returns empty boundaries array for segment without boundaries", () => {
      const entries: SessionEntry[] = [
        createMessageEntry("a", null, timestamp(0)),
        createMessageEntry("b", "a", timestamp(1)),
        createMessageEntry("c", "b", timestamp(2)),
      ];

      const segments = extractSegments(entries);

      expect(segments).toHaveLength(1);
      expect(segments[0].boundaries).toStrictEqual([]);
    });

    it("handles multiple boundaries at same entry", () => {
      // This can happen when a branch_summary and resume occur together
      // (but in practice our detection logic mostly prevents this)
      const entries: SessionEntry[] = [
        createMessageEntry("a", null, "2024-01-01T00:00:00.000Z"),
        createMessageEntry("b", "a", "2024-01-01T00:01:00.000Z"),
        // Compaction after 15 min gap - both compaction AND resume detected
        createCompactionEntry(
          "comp1",
          "b",
          40_000,
          "Compacted",
          "2024-01-01T00:16:00.000Z"
        ),
        createMessageEntry("c", "comp1", "2024-01-01T00:17:00.000Z"),
      ];

      const segments = extractSegments(entries);

      expect(segments).toHaveLength(2);
      // First segment should have both compaction and resume boundaries
      expect(segments[0].boundaries.length).toBeGreaterThanOrEqual(1);
      const types = segments[0].boundaries.map((b) => b.type);
      expect(types).toContain("compaction");
      // Resume is also detected since there's a 15 min gap
      expect(types).toContain("resume");
    });

    it("attaches correct boundary type to each segment", () => {
      const entries: SessionEntry[] = [
        createMessageEntry("a", null, timestamp(0)),
        createMessageEntry("b", "a", timestamp(1)),
        createBranchSummaryEntry("bs1", "a", "b", "Summary", timestamp(2)),
        createMessageEntry("c", "a", timestamp(3)),
      ];

      const segments = extractSegments(entries);

      expect(segments).toHaveLength(2);
      expect(segments[0].boundaries).toHaveLength(1);
      expect(segments[0].boundaries[0].type).toBe("branch");
      expect(segments[0].boundaries[0].metadata?.summary).toBe("Summary");
    });
  });
});

// =============================================================================
// getBoundaryStats Tests
// =============================================================================

describe("getBoundaryStats", () => {
  it("returns zero total and segment count for empty entries", () => {
    const stats = getBoundaryStats([]);

    expect(stats.total).toBe(0);
    expect(stats.segmentCount).toBe(0);
  });

  it("returns zero counts by type for empty entries", () => {
    const stats = getBoundaryStats([]);

    expect(stats.byType.branch).toBe(0);
    expect(stats.byType.tree_jump).toBe(0);
    expect(stats.byType.compaction).toBe(0);
    expect(stats.byType.resume).toBe(0);
  });

  it("counts total boundaries correctly", () => {
    const entries: SessionEntry[] = [
      createMessageEntry("a", null, "2024-01-01T00:00:00.000Z"),
      createMessageEntry("b", "a", "2024-01-01T00:15:00.000Z"), // resume
      createCompactionEntry(
        "comp1",
        "b",
        40_000,
        "Compact",
        "2024-01-01T00:16:00.000Z"
      ), // compaction
      createMessageEntry("c", "comp1", "2024-01-01T00:17:00.000Z"),
      createBranchSummaryEntry(
        "bs1",
        "c",
        "c",
        "Summary",
        "2024-01-01T00:18:00.000Z"
      ), // branch
      createMessageEntry("d", "c", "2024-01-01T00:19:00.000Z"),
    ];

    const stats = getBoundaryStats(entries);

    expect(stats.total).toBe(3);
    expect(stats.segmentCount).toBe(4);
  });

  it("counts boundaries by type", () => {
    const entries: SessionEntry[] = [
      createMessageEntry("a", null, "2024-01-01T00:00:00.000Z"),
      createMessageEntry("b", "a", "2024-01-01T00:15:00.000Z"), // resume
      createCompactionEntry(
        "comp1",
        "b",
        40_000,
        "Compact",
        "2024-01-01T00:16:00.000Z"
      ), // compaction
      createMessageEntry("c", "comp1", "2024-01-01T00:17:00.000Z"),
      createBranchSummaryEntry(
        "bs1",
        "c",
        "c",
        "Summary",
        "2024-01-01T00:18:00.000Z"
      ), // branch
      createMessageEntry("d", "c", "2024-01-01T00:19:00.000Z"),
    ];

    const stats = getBoundaryStats(entries);

    expect(stats.byType.resume).toBe(1);
    expect(stats.byType.compaction).toBe(1);
    expect(stats.byType.branch).toBe(1);
    expect(stats.byType.tree_jump).toBe(0);
  });
});
