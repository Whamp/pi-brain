/**
 * Boundary detection for pi sessions
 *
 * Detects boundaries in session entries that indicate segment splits:
 * - branch: Tree navigation with summary (branch_summary entry)
 * - tree_jump: Tree navigation without summary (parentId mismatch)
 * - compaction: Context compaction event
 * - resume: 10+ minute timestamp gap
 */

import type {
  BranchSummaryEntry,
  CompactionEntry,
  SessionEntry,
} from "../types.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Types of boundaries that can occur within a session
 */
export type BoundaryType = "branch" | "tree_jump" | "compaction" | "resume";

/**
 * A detected boundary in the session
 */
export interface Boundary {
  /** Type of boundary */
  type: BoundaryType;
  /** Entry ID where boundary occurs */
  entryId: string;
  /** Timestamp of the boundary entry */
  timestamp: string;
  /** Entry ID before this boundary (if applicable) */
  previousEntryId?: string;
  /** Additional metadata depending on type */
  metadata?: BoundaryMetadata;
}

/**
 * Metadata for different boundary types
 */
export interface BoundaryMetadata {
  /** For branch: the summary text */
  summary?: string;
  /** For compaction: token count before */
  tokensBefore?: number;
  /** For compaction: token count after */
  tokensAfter?: number;
  /** For resume: gap duration in minutes */
  gapMinutes?: number;
  /** For tree_jump: the expected parent (previous leaf) */
  expectedParentId?: string;
  /** For tree_jump: the actual parent */
  actualParentId?: string;
}

/**
 * A segment is a contiguous span of entries between boundaries
 */
export interface Segment {
  /** First entry ID in segment */
  startEntryId: string;
  /** Last entry ID in segment */
  endEntryId: string;
  /** Boundaries at the end of this segment (leading to next segment) */
  boundaries: Boundary[];
  /** Number of entries in segment */
  entryCount: number;
  /** Timestamp of first entry */
  startTimestamp: string;
  /** Timestamp of last entry */
  endTimestamp: string;
}

// =============================================================================
// Constants
// =============================================================================

/** Minimum gap in minutes to trigger a resume boundary */
const RESUME_GAP_MINUTES = 10;

/** Entry types that don't participate in the conversation tree */
const METADATA_ENTRY_TYPES = new Set(["label", "session_info"]);

// =============================================================================
// Leaf Tracker
// =============================================================================

/**
 * Tracks the "current leaf" as entries are processed.
 *
 * In a session tree, the leaf is the most recently added entry that
 * hasn't become a parent of another entry. This is used to detect
 * tree jumps (when a new entry's parentId doesn't match the current leaf).
 */
export class LeafTracker {
  /** Map of entry ID to its children */
  private childrenOf = new Map<string, string[]>();
  /** Most recently seen entry ID */
  private latestEntryId: string | null = null;
  /** Previous entry's ID (for gap detection) */
  private previousEntryId: string | null = null;
  /** Previous entry's timestamp */
  private previousTimestamp: string | null = null;

  /**
   * Update the tracker with a new entry
   */
  update(entry: SessionEntry): void {
    // Track parent-child relationships
    if (entry.parentId) {
      const children = this.childrenOf.get(entry.parentId) ?? [];
      children.push(entry.id);
      this.childrenOf.set(entry.parentId, children);
    }

    // Skip metadata entries for leaf tracking
    if (!METADATA_ENTRY_TYPES.has(entry.type)) {
      this.previousEntryId = this.latestEntryId;
      this.previousTimestamp = entry.timestamp;
      this.latestEntryId = entry.id;
    }
  }

  /**
   * Get the current leaf entry ID
   *
   * The leaf is the entry that was most recently added and hasn't
   * become a parent of another entry yet.
   */
  getCurrentLeaf(): string | null {
    return this.latestEntryId;
  }

  /**
   * Get the previous entry ID (for gap detection)
   */
  getPreviousEntryId(): string | null {
    return this.previousEntryId;
  }

  /**
   * Get the previous entry timestamp
   */
  getPreviousTimestamp(): string | null {
    return this.previousTimestamp;
  }

  /**
   * Check if an entry is a leaf (has no children)
   */
  isLeaf(entryId: string): boolean {
    return !this.childrenOf.has(entryId);
  }

  /**
   * Check if an entry has multiple children (branch point)
   */
  isBranchPoint(entryId: string): boolean {
    const children = this.childrenOf.get(entryId);
    return children !== undefined && children.length > 1;
  }

  /**
   * Reset the tracker
   */
  reset(): void {
    this.childrenOf.clear();
    this.latestEntryId = null;
    this.previousEntryId = null;
    this.previousTimestamp = null;
  }
}

// =============================================================================
// Boundary Detection
// =============================================================================

/**
 * Detect all boundaries in a list of session entries
 *
 * @param {SessionEntry[]} entries Session entries to analyze
 * @returns {Boundary[]} Array of detected boundaries, in order of occurrence
 */
export function detectBoundaries(entries: SessionEntry[]): Boundary[] {
  const boundaries: Boundary[] = [];
  const leafTracker = new LeafTracker();

  let previousEntryForGap: SessionEntry | null = null;
  let previousNonMetadataEntry: SessionEntry | null = null;

  for (const entry of entries) {
    // Skip metadata-only entries for boundary detection
    if (METADATA_ENTRY_TYPES.has(entry.type)) {
      continue;
    }

    // 1. Branch summary (explicit tree navigation with summary)
    if (entry.type === "branch_summary") {
      const branchEntry = entry as BranchSummaryEntry;
      boundaries.push({
        type: "branch",
        entryId: entry.id,
        timestamp: entry.timestamp,
        previousEntryId: branchEntry.fromId,
        metadata: {
          summary: branchEntry.summary,
        },
      });
    }

    // 2. Compaction
    else if (entry.type === "compaction") {
      const compactionEntry = entry as CompactionEntry;
      boundaries.push({
        type: "compaction",
        entryId: entry.id,
        timestamp: entry.timestamp,
        metadata: {
          tokensBefore: compactionEntry.tokensBefore,
          summary: compactionEntry.summary,
        },
      });
    }

    // 3. Tree jump (parentId doesn't match current leaf)
    // Only check for message entries since they're the main conversation flow
    // Skip if the previous entry was a branch_summary (that's already captured as a branch boundary)
    else if (entry.type === "message") {
      const currentLeaf = leafTracker.getCurrentLeaf();
      const previousWasBranchSummary =
        previousNonMetadataEntry?.type === "branch_summary";

      // A tree jump occurs when:
      // - We have a current leaf
      // - The new entry's parent is NOT the current leaf
      // - The new entry's parent is also NOT null (would be first entry)
      // - The previous entry was NOT a branch_summary (that's already a branch boundary)
      if (
        currentLeaf &&
        entry.parentId !== currentLeaf &&
        entry.parentId !== null &&
        !previousWasBranchSummary
      ) {
        boundaries.push({
          type: "tree_jump",
          entryId: entry.id,
          timestamp: entry.timestamp,
          previousEntryId: currentLeaf,
          metadata: {
            expectedParentId: currentLeaf,
            actualParentId: entry.parentId ?? undefined,
          },
        });
      }
    }

    // 4. Resume detection (10+ minute gap)
    // Check against the previous non-metadata entry
    if (previousEntryForGap) {
      const gapMs =
        new Date(entry.timestamp).getTime() -
        new Date(previousEntryForGap.timestamp).getTime();
      const gapMinutes = gapMs / (1000 * 60);

      if (gapMinutes >= RESUME_GAP_MINUTES) {
        boundaries.push({
          type: "resume",
          entryId: entry.id,
          timestamp: entry.timestamp,
          previousEntryId: previousEntryForGap.id,
          metadata: {
            gapMinutes: Math.round(gapMinutes * 100) / 100, // Round to 2 decimal places
          },
        });
      }
    }

    // Update tracking state
    leafTracker.update(entry);
    previousEntryForGap = entry;
    previousNonMetadataEntry = entry;
  }

  return boundaries;
}

/**
 * Extract segments from entries based on detected boundaries
 *
 * A segment is a contiguous span of entries. Boundaries define the split points.
 *
 * @param {SessionEntry[]} entries Session entries to segment
 * @returns {Segment[]} Array of segments
 */
export function extractSegments(entries: SessionEntry[]): Segment[] {
  // Filter out metadata-only entries for segmentation
  const contentEntries = entries.filter(
    (e) => !METADATA_ENTRY_TYPES.has(e.type)
  );

  if (contentEntries.length === 0) {
    return [];
  }

  const boundaries = detectBoundaries(entries);
  const segments: Segment[] = [];

  // Create a map of entry ID to boundary for quick lookup
  const boundaryByEntryId = new Map<string, Boundary>();
  for (const boundary of boundaries) {
    boundaryByEntryId.set(boundary.entryId, boundary);
  }

  let segmentStartIndex = 0;

  for (let i = 0; i < contentEntries.length; i++) {
    const entry = contentEntries[i];
    const boundary = boundaryByEntryId.get(entry.id);

    if (boundary) {
      // A boundary at entry[i] means:
      // - Previous segment ends at entry[i-1]
      // - New segment starts at entry[i]

      if (i > segmentStartIndex) {
        // Create segment for entries before this boundary
        const segmentEntries = contentEntries.slice(segmentStartIndex, i);
        segments.push({
          startEntryId: segmentEntries[0].id,
          endEntryId: segmentEntries.at(-1).id,
          boundaries: [], // No boundary at end of this segment
          entryCount: segmentEntries.length,
          startTimestamp: segmentEntries[0].timestamp,
          endTimestamp: segmentEntries.at(-1).timestamp,
        });
      }

      // Update segment start for next iteration
      segmentStartIndex = i;
    }
  }

  // Handle the final segment
  if (segmentStartIndex < contentEntries.length) {
    const segmentEntries = contentEntries.slice(segmentStartIndex);
    segments.push({
      startEntryId: segmentEntries[0].id,
      endEntryId: segmentEntries.at(-1).id,
      boundaries: [], // Final segment has no boundaries leading out
      entryCount: segmentEntries.length,
      startTimestamp: segmentEntries[0].timestamp,
      endTimestamp: segmentEntries.at(-1).timestamp,
    });
  }

  return segments;
}

/**
 * Get boundary statistics for a session
 */
export interface BoundaryStats {
  total: number;
  byType: Record<BoundaryType, number>;
  segmentCount: number;
}

/**
 * Calculate statistics about boundaries in a session
 *
 * @param {SessionEntry[]} entries Session entries to analyze
 * @returns {BoundaryStats} Statistics about detected boundaries
 */
export function getBoundaryStats(entries: SessionEntry[]): BoundaryStats {
  const boundaries = detectBoundaries(entries);
  const segments = extractSegments(entries);

  const byType: Record<BoundaryType, number> = {
    branch: 0,
    tree_jump: 0,
    compaction: 0,
    resume: 0,
  };

  for (const boundary of boundaries) {
    byType[boundary.type]++;
  }

  return {
    total: boundaries.length,
    byType,
    segmentCount: segments.length,
  };
}
