/**
 * Boundary detection for pi sessions
 *
 * Detects boundaries in session entries that indicate segment splits:
 * - branch: Tree navigation with summary (branch_summary entry)
 * - tree_jump: Tree navigation without summary (parentId mismatch)
 * - compaction: Context compaction event
 * - resume: 10+ minute timestamp gap
 * - handoff: Explicit session handoff to another agent/model
 */

import type {
  BranchSummaryEntry,
  CompactionEntry,
  CustomEntry,
  SessionEntry,
  SessionMessageEntry,
  TextContent,
  UserMessage,
} from "../types.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Types of boundaries that can occur within a session
 */
export type BoundaryType =
  | "branch"
  | "tree_jump"
  | "compaction"
  | "resume"
  | "handoff";

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
  /** For handoff: the target agent/model/session being handed off to */
  handoffTarget?: string;
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

/**
 * Default minimum gap in minutes to trigger a resume boundary.
 * Can be overridden via BoundaryOptions.resumeGapMinutes.
 */
export const DEFAULT_RESUME_GAP_MINUTES = 10;

/**
 * Options for boundary detection
 */
export interface BoundaryOptions {
  /**
   * Minimum gap in minutes to trigger a resume boundary.
   * @default 10
   */
  resumeGapMinutes?: number;
}

/**
 * Handoff detection patterns - matches user messages indicating a handoff.
 * Case-insensitive matching against message text content.
 *
 * Examples that match:
 * - "handoff to claude"
 * - "hand this off to the architect"
 * - "passing to security-auditor"
 * - "continue with worker agent"
 */
const HANDOFF_PATTERNS = [
  /\bhandoff\s+to\s+(\S+)/i,
  /\bhand\s+(?:this\s+)?off\s+to\s+(\S+)/i,
  /\bpassing\s+to\s+(\S+)/i,
  /\bcontinue\s+with\s+(\S+)\s+agent/i,
];

/** CustomEntry type for explicit handoff markers (for future upstream support) */
const HANDOFF_CUSTOM_TYPE = "handoff";

/** Entry types that don't participate in the conversation tree */
const METADATA_ENTRY_TYPES = new Set(["label", "session_info"]);

// =============================================================================
// Handoff Detection Helpers
// =============================================================================

/**
 * Extract text content from a user message
 */
function extractUserMessageText(entry: SessionMessageEntry): string | null {
  const { message } = entry;
  if (message.role !== "user") {
    return null;
  }
  const userMsg = message as UserMessage;
  if (typeof userMsg.content === "string") {
    return userMsg.content;
  }
  if (Array.isArray(userMsg.content)) {
    for (const block of userMsg.content) {
      if (block.type === "text") {
        return (block as TextContent).text;
      }
    }
  }
  return null;
}

/**
 * Detect handoff from a user message using heuristic patterns
 *
 * @param {string} text - The message text to check
 * @returns {string | null} The handoff target if detected, null otherwise
 */
function detectHandoffFromMessage(text: string): string | null {
  for (const pattern of HANDOFF_PATTERNS) {
    const match = pattern.exec(text);
    if (match?.[1]) {
      return match[1];
    }
  }
  return null;
}

/**
 * Check if a custom entry is an explicit handoff marker
 *
 * When pi upstream supports explicit handoff entries, they will be
 * CustomEntry with customType === "handoff" and data containing target info.
 */
function isExplicitHandoffEntry(entry: SessionEntry): {
  isHandoff: boolean;
  target?: string;
} {
  if (entry.type !== "custom") {
    return { isHandoff: false };
  }
  const customEntry = entry as CustomEntry;
  if (customEntry.customType !== HANDOFF_CUSTOM_TYPE) {
    return { isHandoff: false };
  }
  // Extract target from data if present
  const target =
    typeof customEntry.data === "object" &&
    customEntry.data !== null &&
    "target" in customEntry.data
      ? String((customEntry.data as Record<string, unknown>).target)
      : undefined;
  return { isHandoff: true, target };
}

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

/** Context for boundary detection */
interface BoundaryContext {
  leafTracker: LeafTracker;
  previousNonMetadataEntry: SessionEntry | null;
  previousEntryForGap: SessionEntry | null;
  resumeGapMinutes: number;
}

/** Check for branch_summary boundary */
function checkBranchBoundary(entry: SessionEntry): Boundary | null {
  if (entry.type !== "branch_summary") {
    return null;
  }
  const branchEntry = entry as BranchSummaryEntry;
  return {
    type: "branch",
    entryId: entry.id,
    timestamp: entry.timestamp,
    previousEntryId: branchEntry.fromId,
    metadata: { summary: branchEntry.summary },
  };
}

/** Check for compaction boundary */
function checkCompactionBoundary(entry: SessionEntry): Boundary | null {
  if (entry.type !== "compaction") {
    return null;
  }
  const compactionEntry = entry as CompactionEntry;
  return {
    type: "compaction",
    entryId: entry.id,
    timestamp: entry.timestamp,
    metadata: {
      tokensBefore: compactionEntry.tokensBefore,
      summary: compactionEntry.summary,
    },
  };
}

/** Check for explicit handoff boundary */
function checkExplicitHandoff(
  entry: SessionEntry,
  leafTracker: LeafTracker
): Boundary | null {
  const explicitHandoff = isExplicitHandoffEntry(entry);
  if (!explicitHandoff.isHandoff) {
    return null;
  }
  return {
    type: "handoff",
    entryId: entry.id,
    timestamp: entry.timestamp,
    previousEntryId: leafTracker.getCurrentLeaf() ?? undefined,
    metadata: { handoffTarget: explicitHandoff.target },
  };
}

/** Check for message-based handoff heuristic */
function checkMessageHandoff(
  entry: SessionEntry,
  leafTracker: LeafTracker
): Boundary | null {
  if (entry.type !== "message") {
    return null;
  }
  const msgEntry = entry as SessionMessageEntry;
  const messageText = extractUserMessageText(msgEntry);
  if (!messageText) {
    return null;
  }
  const handoffTarget = detectHandoffFromMessage(messageText);
  if (!handoffTarget) {
    return null;
  }
  return {
    type: "handoff",
    entryId: entry.id,
    timestamp: entry.timestamp,
    previousEntryId: leafTracker.getPreviousEntryId() ?? undefined,
    metadata: { handoffTarget },
  };
}

/** Check for tree jump boundary */
function checkTreeJump(
  entry: SessionEntry,
  leafTracker: LeafTracker,
  previousNonMetadataEntry: SessionEntry | null
): Boundary | null {
  if (entry.type !== "message") {
    return null;
  }
  const currentLeaf = leafTracker.getCurrentLeaf();
  const previousWasBranchSummary =
    previousNonMetadataEntry?.type === "branch_summary";
  // A tree jump occurs when parent doesn't match expected leaf
  if (
    !currentLeaf ||
    entry.parentId === currentLeaf ||
    entry.parentId === null ||
    previousWasBranchSummary
  ) {
    return null;
  }
  return {
    type: "tree_jump",
    entryId: entry.id,
    timestamp: entry.timestamp,
    previousEntryId: currentLeaf,
    metadata: {
      expectedParentId: currentLeaf,
      actualParentId: entry.parentId ?? undefined,
    },
  };
}

/** Check for resume boundary (10+ minute gap) */
function checkResumeBoundary(
  entry: SessionEntry,
  previousEntryForGap: SessionEntry | null,
  resumeGapMinutes: number
): Boundary | null {
  if (!previousEntryForGap) {
    return null;
  }
  const gapMs =
    new Date(entry.timestamp).getTime() -
    new Date(previousEntryForGap.timestamp).getTime();
  const gapMinutes = gapMs / (1000 * 60);
  // Use >= to match original logic (NaN >= X is false, so NaN gaps are ignored)
  if (!(gapMinutes >= resumeGapMinutes)) {
    return null;
  }
  return {
    type: "resume",
    entryId: entry.id,
    timestamp: entry.timestamp,
    previousEntryId: previousEntryForGap.id,
    metadata: { gapMinutes: Math.round(gapMinutes * 100) / 100 },
  };
}

/** Process message entry for handoff and tree jump boundaries */
function processMessageEntry(
  entry: SessionEntry,
  ctx: BoundaryContext
): Boundary[] {
  const results: Boundary[] = [];
  const handoff = checkMessageHandoff(entry, ctx.leafTracker);
  if (handoff) {
    results.push(handoff);
  }
  const treeJump = checkTreeJump(
    entry,
    ctx.leafTracker,
    ctx.previousNonMetadataEntry
  );
  if (treeJump) {
    results.push(treeJump);
  }
  return results;
}

/**
 * Detect all boundaries in a list of session entries
 *
 * @param {SessionEntry[]} entries Session entries to analyze
 * @param {BoundaryOptions} [options] Optional configuration for boundary detection
 * @returns {Boundary[]} Array of detected boundaries, in order of occurrence
 */
export function detectBoundaries(
  entries: SessionEntry[],
  options: BoundaryOptions = {}
): Boundary[] {
  const resumeGapMinutes =
    options.resumeGapMinutes ?? DEFAULT_RESUME_GAP_MINUTES;
  const boundaries: Boundary[] = [];
  const ctx: BoundaryContext = {
    leafTracker: new LeafTracker(),
    previousNonMetadataEntry: null,
    previousEntryForGap: null,
    resumeGapMinutes,
  };

  for (const entry of entries) {
    if (METADATA_ENTRY_TYPES.has(entry.type)) {
      continue;
    }

    // 1. Branch summary (mutually exclusive with compaction and message checks)
    const branch = checkBranchBoundary(entry);
    if (branch) {
      boundaries.push(branch);
    } else {
      // 2. Compaction (mutually exclusive with branch and message checks)
      const compaction = checkCompactionBoundary(entry);
      if (compaction) {
        boundaries.push(compaction);
      } else {
        // 3. Explicit handoff (can happen independently)
        const explicitHandoff = checkExplicitHandoff(entry, ctx.leafTracker);
        if (explicitHandoff) {
          boundaries.push(explicitHandoff);
        } else {
          // 4. Message-based handoff and tree jump
          boundaries.push(...processMessageEntry(entry, ctx));
        }
      }
    }

    // 5. Resume detection (independent - always check)
    const resume = checkResumeBoundary(
      entry,
      ctx.previousEntryForGap,
      resumeGapMinutes
    );
    if (resume) {
      boundaries.push(resume);
    }

    // Update tracking state
    ctx.leafTracker.update(entry);
    ctx.previousEntryForGap = entry;
    ctx.previousNonMetadataEntry = entry;
  }

  return boundaries;
}

/**
 * Create a segment from a slice of entries
 * Precondition: segmentEntries.length > 0 (ensured by caller)
 */
function createSegment(
  segmentEntries: SessionEntry[],
  endingBoundaries: Boundary[]
): Segment {
  const [first, ...rest] = segmentEntries;
  const last = rest.length > 0 ? (rest.at(-1) ?? first) : first;
  return {
    startEntryId: first.id,
    endEntryId: last.id,
    boundaries: endingBoundaries,
    entryCount: segmentEntries.length,
    startTimestamp: first.timestamp,
    endTimestamp: last.timestamp,
  };
}

/**
 * Extract segments from entries based on detected boundaries
 *
 * A segment is a contiguous span of entries. Boundaries define the split points.
 *
 * @param {SessionEntry[]} entries Session entries to segment
 * @param {BoundaryOptions} [options] Optional configuration for boundary detection
 * @returns {Segment[]} Array of segments
 */
export function extractSegments(
  entries: SessionEntry[],
  options: BoundaryOptions = {}
): Segment[] {
  // Filter out metadata-only entries for segmentation
  const contentEntries = entries.filter(
    (e) => !METADATA_ENTRY_TYPES.has(e.type)
  );

  if (contentEntries.length === 0) {
    return [];
  }

  const boundaries = detectBoundaries(entries, options);
  const segments: Segment[] = [];

  // Create a map of entry ID to boundaries for quick lookup
  // Multiple boundaries can occur at the same entry (e.g., resume + branch)
  const boundariesByEntryId = new Map<string, Boundary[]>();
  for (const boundary of boundaries) {
    const existing = boundariesByEntryId.get(boundary.entryId) ?? [];
    existing.push(boundary);
    boundariesByEntryId.set(boundary.entryId, existing);
  }

  let segmentStartIndex = 0;

  for (let i = 0; i < contentEntries.length; i++) {
    const entry = contentEntries[i];
    const entryBoundaries = boundariesByEntryId.get(entry.id);

    if (entryBoundaries) {
      // A boundary at entry[i] means:
      // - Previous segment ends at entry[i-1]
      // - New segment starts at entry[i]
      // The boundary is what caused the split, so it belongs to the ending segment

      if (i > segmentStartIndex) {
        // Create segment for entries before this boundary
        // Attach the boundaries that caused this split
        const segmentEntries = contentEntries.slice(segmentStartIndex, i);
        segments.push(createSegment(segmentEntries, entryBoundaries));
      }

      // Update segment start for next iteration
      segmentStartIndex = i;
    }
  }

  // Handle the final segment (no boundaries at the end)
  if (segmentStartIndex < contentEntries.length) {
    const segmentEntries = contentEntries.slice(segmentStartIndex);
    segments.push(createSegment(segmentEntries, []));
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
 * @param {BoundaryOptions} [options] Optional configuration for boundary detection
 * @returns {BoundaryStats} Statistics about detected boundaries
 */
export function getBoundaryStats(
  entries: SessionEntry[],
  options: BoundaryOptions = {}
): BoundaryStats {
  const boundaries = detectBoundaries(entries, options);
  const segments = extractSegments(entries, options);

  const byType: Record<BoundaryType, number> = {
    branch: 0,
    tree_jump: 0,
    compaction: 0,
    resume: 0,
    handoff: 0,
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
