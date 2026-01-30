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
import type {
  DelightSignals,
  FrictionSignals,
  ManualFlag,
} from "../types/index.js";

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

/** Minimum tool calls to consider a task "complex" for one-shot success */
const COMPLEX_TASK_TOOL_CALL_THRESHOLD = 3;

// =============================================================================
// Shared Pattern Constants
// =============================================================================

/**
 * Patterns indicating sarcasm or frustration (false positives for praise/success)
 */
const SARCASM_NEGATION_PATTERNS: readonly RegExp[] = [
  /i'?m done trying/i,
  /done with this/i,
  /great[,.]?\s*(another|more|yet)/i,
  /thanks for nothing/i,
  /perfect[,.]?\s*(now|another|more)/i,
  /not working/i,
  /still (not|broken|failing)/i,
  /sarcasti/i,
] as const;

/**
 * Patterns indicating genuine praise or success
 */
const PRAISE_PATTERNS: readonly RegExp[] = [
  /\bthanks?\b/,
  /\bthank you\b/,
  /\bperfect\b/,
  /\bgreat\b/,
  /\bawesome\b/,
  /\bexcellent\b/,
  /\blooks good\b/,
  /\bthat works\b/,
  /\ball (done|set|good)\b/,
  /\bnice work?\b/,
  /\bgood job\b/,
  /\bwell done\b/,
  /\bbrilliant\b/,
  /\bamazing\b/,
  /\bfantastic\b/,
  /\bwonderful\b/,
  /\blgtm\b/,
  /\bship it\b/,
  /👍/,
  /🎉/,
  /✅/,
] as const;

/**
 * Patterns indicating user correction or confusion
 */
const CORRECTION_PATTERNS: readonly RegExp[] = [
  /\bno\b/,
  /\bwrong\b/,
  /\bincorrect\b/,
  /\bnot what\b/,
  /\binstead\b/,
  /\bactually\b/,
  /\bshould be\b/,
  /\bchange\b/,
  /\bfix\b/,
  /\btry again\b/,
  /\bretry\b/,
  /\bplease\b.*\binstead\b/,
  // Question patterns that indicate confusion (more specific than just /?$/)
  /\bwhy\b.*\?$/i,
  /\bwhat went wrong\b/i,
  /\bwhat happened\b/i,
  /\bcan you (fix|try|redo)\b/i,
] as const;

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
 * Extract directory path from an ls command
 *
 * Note: This handles basic cases including options but does not fully
 * parse shell quoting. Paths with spaces in quotes may not be extracted correctly.
 */
function extractLsDirectory(cmd: string): string {
  // Handle "ls" with no args
  if (cmd === "ls") {
    return ".";
  }

  // Handle quoted paths (single or double quotes)
  const quotedMatch = cmd.match(/ls\s+(?:-\S+\s+)*["']([^"']+)["']/);
  if (quotedMatch?.[1]) {
    return quotedMatch[1];
  }

  // Extract path from "ls [options] path"
  // Split and find first non-option argument
  const parts = cmd.split(/\s+/);
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    if (part && !part.startsWith("-")) {
      return part;
    }
  }

  return ".";
}

/**
 * State for tracking context churn
 */
interface ChurnState {
  filesAccessed: Set<string>;
  dirsAccessed: Set<string>;
  readLsCount: number;
}

/**
 * Process a read tool call for churn tracking
 */
function processReadToolForChurn(
  args: Record<string, unknown>,
  state: ChurnState
): void {
  if (!args.path) {
    return;
  }
  const path = args.path as string;
  if (!state.filesAccessed.has(path)) {
    state.filesAccessed.add(path);
    state.readLsCount++;
  }
}

/**
 * Process a bash tool call for churn tracking (ls commands)
 */
function processBashToolForChurn(
  args: Record<string, unknown>,
  state: ChurnState
): void {
  if (typeof args.command !== "string") {
    return;
  }
  const cmd = args.command;
  if (!cmd.startsWith("ls ") && cmd !== "ls") {
    return;
  }
  const dir = extractLsDirectory(cmd);
  if (!state.dirsAccessed.has(dir)) {
    state.dirsAccessed.add(dir);
    state.readLsCount++;
  }
}

/**
 * Process a tool call for churn tracking
 */
function processToolCallForChurn(
  toolCall: ToolCallContent,
  state: ChurnState
): void {
  const args = (toolCall.arguments ?? {}) as Record<string, unknown>;
  if (toolCall.name === "read") {
    processReadToolForChurn(args, state);
  } else if (toolCall.name === "bash") {
    processBashToolForChurn(args, state);
  }
}

/**
 * Count context churn events
 *
 * Context churn is high frequency of read/ls operations on different files,
 * indicating the user is fighting the context window.
 */
export function countContextChurn(entries: SessionEntry[]): number {
  const state: ChurnState = {
    filesAccessed: new Set<string>(),
    dirsAccessed: new Set<string>(),
    readLsCount: 0,
  };

  for (const entry of entries) {
    if (entry.type !== "message") {
      continue;
    }
    const msg = (entry as SessionMessageEntry).message;
    if (msg.role !== "assistant") {
      continue;
    }
    for (const block of (msg as AssistantMessage).content ?? []) {
      if (block.type === "toolCall") {
        processToolCallForChurn(block as ToolCallContent, state);
      }
    }
  }

  return state.readLsCount >= CONTEXT_CHURN_THRESHOLD
    ? Math.floor(state.readLsCount / CONTEXT_CHURN_THRESHOLD)
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
 * Check if an entry indicates an unresolved tool error
 */
function isUnresolvedToolError(entry: SessionEntry): boolean {
  if (entry.type !== "message") {
    return false;
  }
  const msg = (entry as SessionMessageEntry).message;
  if (msg.role !== "toolResult") {
    return false;
  }
  return (msg as ToolResultMessage).isError;
}

/**
 * Check if an entry indicates user success acknowledgment
 */
function isUserSuccessIndicator(entry: SessionEntry): boolean {
  if (entry.type !== "message") {
    return false;
  }
  const msg = (entry as SessionMessageEntry).message;
  if (msg.role !== "user") {
    return false;
  }
  const userMsg = msg as UserMessage;
  const text =
    typeof userMsg.content === "string"
      ? userMsg.content
      : extractTextFromContent(userMsg.content);
  return hasGenuineSuccessIndicator(text);
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

  const lastEntries = entries.slice(-10);
  const hasUnresolvedError = lastEntries.some(isUnresolvedToolError);
  const hasSuccessIndicator = lastEntries.some(isUserSuccessIndicator);

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
 * Check if text contains genuine success indicators (not negated or sarcastic)
 */
function hasGenuineSuccessIndicator(text: string): boolean {
  const lower = text.toLowerCase();

  // Check for sarcasm/negation first
  for (const pattern of SARCASM_NEGATION_PATTERNS) {
    if (pattern.test(text)) {
      return false;
    }
  }

  // Check for praise patterns
  for (const pattern of PRAISE_PATTERNS) {
    if (pattern.test(lower)) {
      return true;
    }
  }

  return false;
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
 * Extract file paths from a tool call's arguments
 */
function extractFilePathsFromToolCall(
  toolCall: ToolCallContent,
  files: Set<string>
): void {
  const args = (toolCall.arguments ?? {}) as Record<string, unknown>;
  if (args.path && typeof args.path === "string") {
    files.add(args.path);
  }
  if (args.file && typeof args.file === "string") {
    files.add(args.file);
  }
}

/**
 * Process an assistant message to extract touched files
 */
function extractFilesFromAssistantMessage(
  msg: AssistantMessage,
  files: Set<string>
): void {
  for (const block of msg.content ?? []) {
    if (block.type === "toolCall") {
      extractFilePathsFromToolCall(block as ToolCallContent, files);
    }
  }
}

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
    const msg = (entry as SessionMessageEntry).message;
    if (msg.role === "assistant") {
      extractFilesFromAssistantMessage(msg as AssistantMessage, files);
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
export function getSegmentTimestamp(
  entries: SessionEntry[]
): string | undefined {
  for (const entry of entries) {
    if (entry.type === "message") {
      return entry.timestamp;
    }
  }
  return entries[0]?.timestamp;
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

  // Validate timestamps
  if (!segmentA.endTime || !segmentB.startTime) {
    return false;
  }

  // Check time gap
  const aEnd = new Date(segmentA.endTime).getTime();
  const bStart = new Date(segmentB.startTime).getTime();

  // Handle invalid dates (NaN)
  if (Number.isNaN(aEnd) || Number.isNaN(bStart)) {
    return false;
  }

  const gapMinutes = (bStart - aEnd) / (1000 * 60);

  if (gapMinutes < 0 || gapMinutes > ABANDONED_RESTART_WINDOW_MINUTES) {
    return false;
  }

  // Check file overlap
  const filesA = getFilesTouched(segmentA.entries);
  const filesB = getFilesTouched(segmentB.entries);

  return hasFileOverlap(filesA, filesB);
}

/**
 * Check if a current segment is an abandoned restart of a previous node.
 *
 * This is similar to `isAbandonedRestart` but works with already-computed
 * node data (with filesTouched arrays) instead of raw session entries.
 *
 * Criteria:
 * - Previous node has outcome 'abandoned'
 * - Current segment starts within 30 minutes of previous node's timestamp
 * - Both touch similar files (30% overlap threshold)
 */
export function isAbandonedRestartFromNode(
  previousNode: {
    outcome: string;
    timestamp: string;
    filesTouched: string[];
  },
  currentStartTime: string,
  currentFilesTouched: string[]
): boolean {
  // Check if previous node was abandoned
  if (previousNode.outcome !== "abandoned") {
    return false;
  }

  // Validate timestamps
  if (!previousNode.timestamp || !currentStartTime) {
    return false;
  }

  // Check time gap
  const prevEnd = new Date(previousNode.timestamp).getTime();
  const currStart = new Date(currentStartTime).getTime();

  // Handle invalid dates
  if (Number.isNaN(prevEnd) || Number.isNaN(currStart)) {
    return false;
  }

  const gapMinutes = (currStart - prevEnd) / (1000 * 60);

  if (gapMinutes < 0 || gapMinutes > ABANDONED_RESTART_WINDOW_MINUTES) {
    return false;
  }

  // Check file overlap
  const filesA = new Set(previousNode.filesTouched);
  const filesB = new Set(currentFilesTouched);

  return hasFileOverlap(filesA, filesB);
}

// =============================================================================
// Delight Detection Functions
// =============================================================================

/**
 * State tracker for resilient recovery detection
 */
interface RecoveryState {
  sawToolError: boolean;
  userInterventionBeforeRecovery: boolean;
  successAfterError: boolean;
}

/**
 * Process a tool result entry for recovery detection
 */
function processToolResultForRecovery(
  toolResult: ToolResultMessage,
  state: RecoveryState
): void {
  if (toolResult.isError) {
    state.sawToolError = true;
    state.userInterventionBeforeRecovery = false;
    state.successAfterError = false;
  } else if (state.sawToolError && !state.userInterventionBeforeRecovery) {
    state.successAfterError = true;
  }
}

/**
 * Process a user message entry for recovery detection
 */
function processUserMessageForRecovery(
  userMsg: UserMessage,
  state: RecoveryState
): void {
  if (!state.sawToolError || state.successAfterError) {
    return;
  }
  const text =
    typeof userMsg.content === "string"
      ? userMsg.content
      : extractTextFromContent(userMsg.content);
  if (!isMinimalAcknowledgment(text)) {
    state.userInterventionBeforeRecovery = true;
  }
}

/**
 * Detect resilient recovery
 *
 * Tool error occurs, but the model fixes it WITHOUT user intervention,
 * and the task ultimately succeeds.
 */
export function detectResilientRecovery(entries: SessionEntry[]): boolean {
  const state: RecoveryState = {
    sawToolError: false,
    userInterventionBeforeRecovery: false,
    successAfterError: false,
  };

  for (const entry of entries) {
    if (entry.type !== "message") {
      continue;
    }
    const msg = (entry as SessionMessageEntry).message;
    if (msg.role === "toolResult") {
      processToolResultForRecovery(msg as ToolResultMessage, state);
    } else if (msg.role === "user") {
      processUserMessageForRecovery(msg as UserMessage, state);
    }
  }

  return (
    state.sawToolError &&
    state.successAfterError &&
    !state.userInterventionBeforeRecovery
  );
}

/**
 * Check if text is a minimal acknowledgment (not a correction)
 */
function isMinimalAcknowledgment(text: string): boolean {
  const lower = text.toLowerCase().trim();

  // Very short responses are usually acknowledgments
  if (lower.length < 10) {
    return true;
  }

  // Patterns that indicate minimal acknowledgment
  const acknowledgmentPatterns = [/^ok$/, /^okay$/, /^k$/, /^yes$/, /^go$/];

  for (const pattern of acknowledgmentPatterns) {
    if (pattern.test(lower)) {
      return true;
    }
  }

  return false;
}

/**
 * Count tool calls in an assistant message
 */
function countToolCallsInMessage(msg: AssistantMessage): number {
  let count = 0;
  for (const block of msg.content ?? []) {
    if (block.type === "toolCall") {
      count++;
    }
  }
  return count;
}

/**
 * Check if a user message is a correction (not first message)
 */
function checkUserMessageForCorrection(
  userMsg: UserMessage,
  isFirst: boolean
): { isCorrection: boolean; isFirst: boolean } {
  if (isFirst) {
    return { isCorrection: false, isFirst: false };
  }
  const text =
    typeof userMsg.content === "string"
      ? userMsg.content
      : extractTextFromContent(userMsg.content);
  return { isCorrection: isUserCorrection(text), isFirst: false };
}

/**
 * Detect one-shot success
 *
 * Complex task (multiple tool calls) completed with zero user corrections/rephrasings.
 */
export function detectOneShotSuccess(entries: SessionEntry[]): boolean {
  let toolCallCount = 0;
  let userCorrectionCount = 0;
  let isFirstUserMessage = true;

  for (const entry of entries) {
    if (entry.type !== "message") {
      continue;
    }
    const msg = (entry as SessionMessageEntry).message;

    if (msg.role === "assistant") {
      toolCallCount += countToolCallsInMessage(msg as AssistantMessage);
    } else if (msg.role === "user") {
      const result = checkUserMessageForCorrection(
        msg as UserMessage,
        isFirstUserMessage
      );
      isFirstUserMessage = result.isFirst;
      if (result.isCorrection) {
        userCorrectionCount++;
      }
    }
  }

  return (
    toolCallCount >= COMPLEX_TASK_TOOL_CALL_THRESHOLD &&
    userCorrectionCount === 0
  );
}

/**
 * Check if user message looks like a correction
 */
function isUserCorrection(text: string): boolean {
  const lower = text.toLowerCase().trim();

  // Very short messages are usually not corrections
  if (lower.length < 5) {
    return false;
  }

  // Check for praise patterns first - not corrections
  for (const pattern of PRAISE_PATTERNS) {
    if (pattern.test(lower)) {
      return false;
    }
  }

  // Also check acknowledgment patterns
  if (/^ok$/i.test(lower) || /^okay$/i.test(lower) || /^yes$/i.test(lower)) {
    return false;
  }

  // Check for correction patterns
  for (const pattern of CORRECTION_PATTERNS) {
    if (pattern.test(lower)) {
      return true;
    }
  }

  // If message is substantial (>50 chars) and not praise, treat as potential correction/guidance
  return lower.length > 50;
}

/**
 * Detect explicit praise from user
 *
 * User says "great job", "perfect", "thanks", etc.
 */
export function detectExplicitPraise(entries: SessionEntry[]): boolean {
  for (const entry of entries) {
    if (entry.type !== "message") {
      continue;
    }

    const msgEntry = entry as SessionMessageEntry;
    const msg = msgEntry.message;

    if (msg.role === "user") {
      const userMsg = msg as UserMessage;
      const text =
        typeof userMsg.content === "string"
          ? userMsg.content
          : extractTextFromContent(userMsg.content);

      if (hasGenuinePraise(text)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if text contains genuine praise
 */
function hasGenuinePraise(text: string): boolean {
  const lower = text.toLowerCase();

  // Check for sarcasm/negation first
  for (const pattern of SARCASM_NEGATION_PATTERNS) {
    if (pattern.test(text)) {
      return false;
    }
  }

  // Check for praise patterns
  for (const pattern of PRAISE_PATTERNS) {
    if (pattern.test(lower)) {
      return true;
    }
  }

  return false;
}

// =============================================================================
// Delight Score Calculation
// =============================================================================

/**
 * Calculate overall delight score (0.0-1.0)
 *
 * Weights different delight signals based on significance.
 */
export function calculateDelightScore(delight: DelightSignals): number {
  let score = 0;

  // Resilient recovery (high value - shows robustness)
  if (delight.resilientRecovery) {
    score += 0.4;
  }

  // One-shot success (high value - efficiency)
  if (delight.oneShotSuccess) {
    score += 0.4;
  }

  // Explicit praise (moderate value - user satisfaction)
  if (delight.explicitPraise) {
    score += 0.3;
  }

  return Math.min(score, 1);
}

// =============================================================================
// Main Delight Detection Function
// =============================================================================

/**
 * Options for delight detection
 */
export interface DelightDetectionOptions {
  /** Outcome of the segment (for context) */
  outcome?: string;
}

/**
 * Detect all delight signals in a session segment
 */
export function detectDelightSignals(
  entries: SessionEntry[],
  _options: DelightDetectionOptions = {}
): DelightSignals {
  const resilientRecovery = detectResilientRecovery(entries);
  const oneShotSuccess = detectOneShotSuccess(entries);
  const explicitPraise = detectExplicitPraise(entries);

  const delight: DelightSignals = {
    score: 0, // Will be calculated below
    resilientRecovery,
    oneShotSuccess,
    explicitPraise,
  };

  // Calculate overall score
  delight.score = calculateDelightScore(delight);

  return delight;
}
