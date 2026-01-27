/**
 * Friction and delight signal detection for pi sessions
 *
 * Detects patterns that indicate user friction (rephrasing, abandonment, churn)
 * or delight (resilient recovery, one-shot success, explicit praise).
 *
 * @see specs/signals.md for full specification
 */

import type {
  AssistantMessage,
  ContentBlock,
  SessionEntry,
  SessionMessageEntry,
  ToolCallContent,
  ToolResultMessage,
  UserMessage,
} from "../types.js";
import type { FrictionSignals, ManualFlag } from "../types/index.js";

// =============================================================================
// Constants
// =============================================================================

/** Minimum consecutive user messages to count as rephrasing cascade */
const REPHRASING_CASCADE_THRESHOLD = 3;

/** Minimum times same tool error to count as tool loop */
const TOOL_LOOP_THRESHOLD = 3;

/** High context churn threshold (reads/ls on different files per segment) */
const CONTEXT_CHURN_THRESHOLD = 10;

/** Maximum minutes between abandoned node and restart to count as abandoned restart */
const ABANDONED_RESTART_WINDOW_MINUTES = 30;

// =============================================================================
// Types
// =============================================================================

// =============================================================================
// Friction Detection Functions
// =============================================================================

/**
 * Count rephrasing cascades in a segment
 *
 * A rephrasing cascade is 3+ consecutive user messages without a meaningful
 * assistant response (no tool calls, no substantial text).
 */
export function countRephrasingCascades(entries: SessionEntry[]): number {
  let cascadeCount = 0;
  let consecutiveUserMessages = 0;

  for (const entry of entries) {
    if (entry.type !== "message") {
      continue;
    }

    const msgEntry = entry as SessionMessageEntry;
    const msg = msgEntry.message;

    if (msg.role === "user") {
      consecutiveUserMessages++;
    } else if (msg.role === "assistant") {
      // Check if assistant response is meaningful
      const hasMeaningfulResponse = hasToolCallOrSubstantialText(
        msg as AssistantMessage
      );

      if (hasMeaningfulResponse) {
        // Reset the counter - the model responded meaningfully
        if (consecutiveUserMessages >= REPHRASING_CASCADE_THRESHOLD) {
          cascadeCount++;
        }
        consecutiveUserMessages = 0;
      }
      // If not meaningful, don't reset - user may need to rephrase again
    }
  }

  // Check if we ended with a cascade
  if (consecutiveUserMessages >= REPHRASING_CASCADE_THRESHOLD) {
    cascadeCount++;
  }

  return cascadeCount;
}

/**
 * Check if an assistant message has a tool call or substantial text
 */
function hasToolCallOrSubstantialText(msg: AssistantMessage): boolean {
  if (!msg.content || !Array.isArray(msg.content)) {
    return false;
  }

  for (const block of msg.content) {
    if (block.type === "toolCall") {
      return true;
    }
    if (block.type === "text" && (block as { text: string }).text.length > 50) {
      return true;
    }
  }

  return false;
}

/**
 * Count tool loops in a segment
 *
 * A tool loop is when the same tool fails with the same error type 3+ times.
 */
export function countToolLoops(entries: SessionEntry[]): number {
  const errorCounts = new Map<string, number>();
  let toolLoopCount = 0;

  for (const entry of entries) {
    if (entry.type !== "message") {
      continue;
    }

    const msgEntry = entry as SessionMessageEntry;
    const msg = msgEntry.message;

    if (msg.role === "toolResult") {
      const toolResult = msg as ToolResultMessage;
      if (toolResult.isError) {
        // Create a key from tool name + error signature
        const errorSignature = extractErrorSignature(toolResult);
        const key = `${toolResult.toolName}:${errorSignature}`;

        const count = (errorCounts.get(key) ?? 0) + 1;
        errorCounts.set(key, count);

        if (count === TOOL_LOOP_THRESHOLD) {
          toolLoopCount++;
        }
      }
    }
  }

  return toolLoopCount;
}

/**
 * Extract a normalized error signature from a tool result
 */
function extractErrorSignature(toolResult: ToolResultMessage): string {
  if (!toolResult.content || !Array.isArray(toolResult.content)) {
    return "unknown";
  }

  for (const block of toolResult.content) {
    if (block.type === "text") {
      const { text } = block as { text: string };
      // Extract first line or first 100 chars as signature
      const firstLine = text.split("\n")[0] ?? "";
      return normalizeErrorMessage(firstLine.slice(0, 100));
    }
  }

  return "unknown";
}

/**
 * Normalize error message for comparison
 */
function normalizeErrorMessage(msg: string): string {
  // Remove line numbers, file paths, and variable parts
  return msg
    .replaceAll(/\d+/g, "N") // Replace numbers
    .replaceAll(/\/[\w./\-_]+/g, "PATH") // Replace paths
    .replaceAll(/"[^"]+"/g, "STR") // Replace quoted strings
    .trim()
    .toLowerCase();
}

/**
 * Count context churn events
 *
 * Context churn is high frequency of read/ls operations on different files,
 * indicating the user is fighting the context window.
 */
export function countContextChurn(entries: SessionEntry[]): number {
  const filesAccessed = new Set<string>();
  let readLsCount = 0;

  for (const entry of entries) {
    if (entry.type !== "message") {
      continue;
    }

    const msgEntry = entry as SessionMessageEntry;
    const msg = msgEntry.message;

    // Look for tool calls to read/bash (for ls)
    if (msg.role === "assistant") {
      const assistantMsg = msg as AssistantMessage;
      for (const block of assistantMsg.content ?? []) {
        if (block.type === "toolCall") {
          const toolCall = block as ToolCallContent;
          const args = (toolCall.arguments ?? {}) as Record<string, unknown>;

          if (toolCall.name === "read" && args.path) {
            const path = args.path as string;
            if (!filesAccessed.has(path)) {
              filesAccessed.add(path);
              readLsCount++;
            }
          } else if (
            toolCall.name === "bash" &&
            typeof args.command === "string"
          ) {
            const cmd = args.command;
            // Check for ls commands
            if (cmd.startsWith("ls ") || cmd === "ls") {
              readLsCount++;
            }
          }
        }
      }
    }
  }

  // Return number of churn events above threshold
  return readLsCount >= CONTEXT_CHURN_THRESHOLD
    ? Math.floor(readLsCount / CONTEXT_CHURN_THRESHOLD)
    : 0;
}

/**
 * Detect if a model switch occurred for this segment
 *
 * Returns the model switched FROM if this segment is a retry with a different model.
 */
export function detectModelSwitch(
  entries: SessionEntry[],
  previousSegmentModel?: string
): string | undefined {
  // Get the first model used in this segment
  let firstModelInSegment: string | undefined;

  for (const entry of entries) {
    if (entry.type !== "message") {
      continue;
    }

    const msgEntry = entry as SessionMessageEntry;
    const msg = msgEntry.message;

    if (msg.role === "assistant") {
      const assistantMsg = msg as AssistantMessage;
      firstModelInSegment = `${assistantMsg.provider}/${assistantMsg.model}`;
      break;
    }
  }

  // If we have a previous segment model and it differs, this is a switch
  if (
    previousSegmentModel &&
    firstModelInSegment &&
    previousSegmentModel !== firstModelInSegment
  ) {
    return previousSegmentModel;
  }

  return undefined;
}

/**
 * Detect silent termination
 *
 * Session ends mid-task (no handoff, no success) and is not resumed.
 * This is detected by checking if the last entry shows incomplete work.
 */
export function detectSilentTermination(
  entries: SessionEntry[],
  isLastSegment: boolean,
  wasResumed: boolean
): boolean {
  if (!isLastSegment || wasResumed) {
    return false;
  }

  // Look at the last few entries to determine if work was incomplete
  const lastEntries = entries.slice(-5);

  // Check if there's an incomplete tool result or error
  let hasUnresolvedError = false;
  let hasSuccessIndicator = false;

  for (const entry of lastEntries) {
    if (entry.type !== "message") {
      continue;
    }

    const msgEntry = entry as SessionMessageEntry;
    const msg = msgEntry.message;

    if (msg.role === "toolResult") {
      const toolResult = msg as ToolResultMessage;
      if (toolResult.isError) {
        hasUnresolvedError = true;
      }
    }

    if (msg.role === "user") {
      const userMsg = msg as UserMessage;
      const text =
        typeof userMsg.content === "string"
          ? userMsg.content
          : extractTextFromContent(userMsg.content);

      // Check for success indicators
      if (
        text.toLowerCase().includes("thanks") ||
        text.toLowerCase().includes("great") ||
        text.toLowerCase().includes("perfect") ||
        text.toLowerCase().includes("done")
      ) {
        hasSuccessIndicator = true;
      }
    }
  }

  // Silent termination if we have unresolved error and no success indicator
  return hasUnresolvedError && !hasSuccessIndicator;
}

/**
 * Extract text from content blocks
 */
function extractTextFromContent(content: ContentBlock[]): string {
  const texts: string[] = [];
  for (const block of content) {
    if (block.type === "text") {
      texts.push((block as { text: string }).text);
    }
  }
  return texts.join(" ");
}

/**
 * Extract manual flags from session entries
 *
 * Looks for custom entries with type 'brain_flag'
 */
export function extractManualFlags(entries: SessionEntry[]): ManualFlag[] {
  const flags: ManualFlag[] = [];

  for (const entry of entries) {
    if (entry.type === "custom") {
      const customEntry = entry as {
        type: "custom";
        id: string;
        parentId: string | null;
        timestamp: string;
        customType: string;
        data?: { type?: string; message?: string };
      };

      if (
        customEntry.customType === "brain_flag" &&
        customEntry.data?.message
      ) {
        flags.push({
          type: (customEntry.data.type as ManualFlag["type"]) ?? "note",
          message: customEntry.data.message,
          timestamp: entry.timestamp,
        });
      }
    }
  }

  return flags;
}

// =============================================================================
// Friction Score Calculation
// =============================================================================

/**
 * Calculate overall friction score (0.0-1.0)
 *
 * Weights different friction signals based on severity.
 */
export function calculateFrictionScore(friction: FrictionSignals): number {
  let score = 0;

  // Rephrasing cascades (moderate friction)
  score += Math.min(friction.rephrasingCount * 0.15, 0.3);

  // Context churn (moderate friction)
  score += Math.min(friction.contextChurnCount * 0.1, 0.2);

  // Tool loops (high friction)
  score += Math.min(friction.toolLoopCount * 0.2, 0.4);

  // Abandoned restart (high friction)
  if (friction.abandonedRestart) {
    score += 0.3;
  }

  // Model switch (moderate friction)
  if (friction.modelSwitchFrom) {
    score += 0.15;
  }

  // Silent termination (high friction)
  if (friction.silentTermination) {
    score += 0.25;
  }

  return Math.min(score, 1);
}

// =============================================================================
// Main Detection Function
// =============================================================================

/**
 * Options for friction detection
 */
export interface FrictionDetectionOptions {
  /** Model from previous segment (for model switch detection) */
  previousSegmentModel?: string;
  /** Whether this is the last segment in the session */
  isLastSegment?: boolean;
  /** Whether the session was resumed after this segment */
  wasResumed?: boolean;
  /** Whether this segment was abandoned and restarted (from external analysis) */
  abandonedRestart?: boolean;
}

/**
 * Detect all friction signals in a session segment
 */
export function detectFrictionSignals(
  entries: SessionEntry[],
  options: FrictionDetectionOptions = {}
): FrictionSignals {
  const rephrasingCount = countRephrasingCascades(entries);
  const contextChurnCount = countContextChurn(entries);
  const toolLoopCount = countToolLoops(entries);
  const modelSwitchFrom = detectModelSwitch(
    entries,
    options.previousSegmentModel
  );
  const silentTermination = detectSilentTermination(
    entries,
    options.isLastSegment ?? false,
    options.wasResumed ?? false
  );
  const abandonedRestart = options.abandonedRestart ?? false;

  const friction: FrictionSignals = {
    score: 0, // Will be calculated below
    rephrasingCount,
    contextChurnCount,
    abandonedRestart,
    toolLoopCount,
    modelSwitchFrom,
    silentTermination,
  };

  // Calculate overall score
  friction.score = calculateFrictionScore(friction);

  return friction;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if a segment touches similar files to another segment
 * (for abandoned restart detection)
 */
export function getFilesTouched(entries: SessionEntry[]): Set<string> {
  const files = new Set<string>();

  for (const entry of entries) {
    if (entry.type !== "message") {
      continue;
    }

    const msgEntry = entry as SessionMessageEntry;
    const msg = msgEntry.message;

    if (msg.role === "assistant") {
      const assistantMsg = msg as AssistantMessage;
      for (const block of assistantMsg.content ?? []) {
        if (block.type === "toolCall") {
          const toolCall = block as ToolCallContent;
          const args = (toolCall.arguments ?? {}) as Record<string, unknown>;

          // Extract file paths from common tools
          if (args.path && typeof args.path === "string") {
            files.add(args.path);
          }
          if (args.file && typeof args.file === "string") {
            files.add(args.file);
          }
        }
      }
    }
  }

  return files;
}

/**
 * Check if two sets of files have significant overlap
 */
export function hasFileOverlap(
  files1: Set<string>,
  files2: Set<string>,
  threshold = 0.3
): boolean {
  if (files1.size === 0 || files2.size === 0) {
    return false;
  }

  let overlapCount = 0;
  for (const file of files1) {
    if (files2.has(file)) {
      overlapCount++;
    }
  }

  const overlapRatio = overlapCount / Math.min(files1.size, files2.size);
  return overlapRatio >= threshold;
}

/**
 * Get the primary model used in a segment
 */
export function getPrimaryModel(entries: SessionEntry[]): string | undefined {
  const modelCounts = new Map<string, number>();

  for (const entry of entries) {
    if (entry.type !== "message") {
      continue;
    }

    const msgEntry = entry as SessionMessageEntry;
    const msg = msgEntry.message;

    if (msg.role === "assistant") {
      const assistantMsg = msg as AssistantMessage;
      const model = `${assistantMsg.provider}/${assistantMsg.model}`;
      modelCounts.set(model, (modelCounts.get(model) ?? 0) + 1);
    }
  }

  // Return the most frequently used model
  let maxModel: string | undefined;
  let maxCount = 0;

  for (const [model, count] of modelCounts) {
    if (count > maxCount) {
      maxCount = count;
      maxModel = model;
    }
  }

  return maxModel;
}

/**
 * Get segment timestamp for abandoned restart detection
 */
export function getSegmentTimestamp(entries: SessionEntry[]): string {
  for (const entry of entries) {
    if (entry.type === "message") {
      return entry.timestamp;
    }
  }
  return entries[0]?.timestamp ?? "";
}

/**
 * Check if segment B is an abandoned restart of segment A
 *
 * Criteria:
 * - Segment A has outcome 'abandoned'
 * - Segment B starts within 30 minutes of segment A ending
 * - Both segments touch similar files
 */
export function isAbandonedRestart(
  segmentA: { entries: SessionEntry[]; outcome: string; endTime: string },
  segmentB: { entries: SessionEntry[]; startTime: string }
): boolean {
  // Check if A was abandoned
  if (segmentA.outcome !== "abandoned") {
    return false;
  }

  // Check time gap
  const aEnd = new Date(segmentA.endTime).getTime();
  const bStart = new Date(segmentB.startTime).getTime();
  const gapMinutes = (bStart - aEnd) / (1000 * 60);

  if (gapMinutes < 0 || gapMinutes > ABANDONED_RESTART_WINDOW_MINUTES) {
    return false;
  }

  // Check file overlap
  const filesA = getFilesTouched(segmentA.entries);
  const filesB = getFilesTouched(segmentB.entries);

  return hasFileOverlap(filesA, filesB);
}
