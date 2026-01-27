/**
 * Shared type definitions for pi-brain
 *
 * This file contains pure type definitions (no runtime code) shared between
 * the daemon/storage backend and the web frontend.
 */

// =============================================================================
// Node Types
// =============================================================================

export interface Node {
  /** 16-char hex ID */
  id: string;
  /** Starts at 1, increments on reanalysis */
  version: number;
  /** IDs of prior version nodes */
  previousVersions: string[];

  source: NodeSource;
  classification: NodeClassification;
  content: NodeContent;
  lessons: LessonsByLevel;
  observations: ModelObservations;
  metadata: NodeMetadata;
  semantic: SemanticData;
  daemonMeta: DaemonMeta;
  /** Friction/delight signals (optional, populated by signal detection) */
  signals?: NodeSignals;
}

export interface NodeSource {
  /** Absolute path to .jsonl file */
  sessionFile: string;
  segment: {
    /** First entry ID in segment */
    startEntryId: string;
    /** Last entry ID in segment */
    endEntryId: string;
    /** Number of entries */
    entryCount: number;
  };
  /** Hostname of source machine */
  computer: string;
  /** Session UUID from header */
  sessionId: string;
  /** If forked, parent session path */
  parentSession?: string;
}

export type NodeType =
  | "coding"
  | "debugging"
  | "refactoring"
  | "sysadmin"
  | "research"
  | "planning"
  | "qa"
  | "brainstorm"
  | "handoff"
  | "documentation"
  | "configuration"
  | "data"
  | "other";

export interface NodeClassification {
  type: NodeType;
  /** Absolute path */
  project: string;
  /** First session for this project */
  isNewProject: boolean;
  /** User provided specific, actionable goal */
  hadClearGoal: boolean;
  /** Primary programming language */
  language?: string;
  /** Frameworks used */
  frameworks?: string[];
}

export type Outcome = "success" | "partial" | "failed" | "abandoned";

export interface Decision {
  what: string;
  why: string;
  alternativesConsidered: string[];
}

export interface ErrorSummary {
  type: string;
  message: string;
  resolved: boolean;
}

export interface NodeContent {
  /** 1-3 sentence description */
  summary: string;
  outcome: Outcome;
  keyDecisions: Decision[];
  /** Relative paths from project root */
  filesTouched: string[];
  /** Tools invoked */
  toolsUsed: string[];
  /** Errors encountered */
  errorsSeen: ErrorSummary[];
}

// =============================================================================
// Lessons Types
// =============================================================================

export type LessonLevel =
  | "project"
  | "task"
  | "user"
  | "model"
  | "tool"
  | "skill"
  | "subagent";

export type Confidence = "high" | "medium" | "low";

export interface Lesson {
  level: LessonLevel;
  /** One-line summary */
  summary: string;
  /** Full explanation */
  details: string;
  confidence: Confidence;
  /** For filtering */
  tags: string[];
  /** Suggested action to take */
  actionable?: string;
}

export interface LessonsByLevel {
  project: Lesson[];
  task: Lesson[];
  user: Lesson[];
  model: Lesson[];
  tool: Lesson[];
  skill: Lesson[];
  subagent: Lesson[];
}

// =============================================================================
// Model Observations Types
// =============================================================================

export interface ModelUsage {
  provider: string;
  model: string;
  tokensInput: number;
  tokensOutput: number;
  cacheRead?: number;
  cacheWrite?: number;
  cost: number;
}

export type Frequency = "once" | "sometimes" | "often" | "always";

export interface ModelQuirk {
  /** "provider/model" format */
  model: string;
  observation: string;
  frequency: Frequency;
  workaround?: string;
  severity: "low" | "medium" | "high";
}

export interface ToolError {
  tool: string;
  errorType: string;
  context: string;
  model: string;
  wasRetried: boolean;
}

export interface ModelObservations {
  modelsUsed: ModelUsage[];
  /** Techniques that worked well */
  promptingWins: string[];
  /** Approaches that failed */
  promptingFailures: string[];
  modelQuirks: ModelQuirk[];
  toolUseErrors: ToolError[];
}

// =============================================================================
// Metadata Types
// =============================================================================

export interface NodeMetadata {
  /** Total tokens (input + output) */
  tokensUsed: number;
  /** USD */
  cost: number;
  /** Wall clock time for segment */
  durationMinutes: number;
  /** ISO 8601, when segment started */
  timestamp: string;
  /** ISO 8601, when analysis completed */
  analyzedAt: string;
  /** Prompt version hash */
  analyzerVersion: string;
}

export interface SemanticData {
  /** Specific terms */
  tags: string[];
  /** Broader concepts */
  topics: string[];
  /** Other projects this relates to */
  relatedProjects?: string[];
  /** Technical concepts */
  concepts?: string[];
}

export interface DaemonDecision {
  /** ISO 8601 */
  timestamp: string;
  decision: string;
  reasoning: string;
  /** Flag for user attention */
  needsReview?: boolean;
}

export interface DaemonMeta {
  decisions: DaemonDecision[];
  /** Path to detailed log file */
  analysisLog?: string;
  /** Whether RLM skill was needed */
  rlmUsed: boolean;
  /** Whether codemap skill was available during analysis */
  codemapAvailable?: boolean;
  /** Approximate tokens in raw segment */
  segmentTokenCount?: number;
}

// =============================================================================
// Edge Types
// =============================================================================

export type EdgeType =
  // Structural edges (from session structure)
  | "fork"
  | "branch"
  | "tree_jump"
  | "resume"
  | "compaction"
  | "continuation"
  | "handoff"
  // Semantic edges (daemon discovers)
  | "semantic"
  | "reference"
  | "lesson_application"
  | "failure_pattern"
  | "project_related"
  | "technique_shared";

export type EdgeCreator = "boundary" | "daemon" | "user";

export interface EdgeMetadata {
  /** For branch edges: the branch summary */
  summary?: string;
  /** For resume edges: idle duration */
  gapMinutes?: number;
  /** For semantic edges: 0.0-1.0 */
  similarity?: number;
  /** For lesson_application: which lesson */
  lessonId?: string;
  /** For failure_pattern: which pattern */
  patternId?: string;
  /** Human readable reason for the connection */
  reason?: string;
}

export interface Edge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  type: EdgeType;
  metadata: EdgeMetadata;
  /** ISO 8601 */
  createdAt: string;
  createdBy: EdgeCreator;
}

// =============================================================================
// Version Types
// =============================================================================

export type VersionTrigger =
  | "initial"
  | "prompt_update"
  | "connection_found"
  | "user_feedback"
  | "schema_migration";

export interface NodeVersion {
  nodeId: string;
  version: number;
  previousVersions: string[];
  analyzerVersion: string;
  analyzedAt: string;
  triggerReason: VersionTrigger;
}

// =============================================================================
// Aggregated Pattern Types
// =============================================================================

export interface AggregatedFailurePattern {
  id: string;
  pattern: string;
  occurrences: number;
  models: string[]; // List of models where this occurred
  tools: string[]; // List of tools involved
  exampleNodes: string[]; // Node IDs
  lastSeen: string;
  learningOpportunity?: string;
  updatedAt: string;
}

export interface AggregatedModelStats {
  model: string;
  totalTokens: number;
  totalCost: number;
  totalSessions: number;
  quirkCount: number;
  errorCount: number;
  lastUsed: string;
  updatedAt: string;
}

export interface AggregatedLessonPattern {
  id: string;
  level: LessonLevel;
  pattern: string;
  occurrences: number;
  tags: string[];
  exampleNodes: string[]; // Node IDs
  lastSeen: string;
  updatedAt: string;
}

// =============================================================================
// Prompt Learning Types (specs/prompt-learning.md)
// =============================================================================

export type InsightType = "quirk" | "win" | "failure" | "tool_error" | "lesson";
export type InsightSeverity = "low" | "medium" | "high";

export interface AggregatedInsight {
  id: string;
  type: InsightType;
  /** provider/model format, undefined for non-model-specific insights */
  model?: string;
  /** Tool name, undefined for non-tool-specific insights */
  tool?: string;
  /** Normalized pattern description */
  pattern: string;
  /** How often observed */
  frequency: number;
  /** 0.0-1.0 confidence score */
  confidence: number;
  severity: InsightSeverity;
  /** Suggested workaround if applicable */
  workaround?: string;
  /** Node IDs where this was observed */
  examples: string[];
  firstSeen: string;
  lastSeen: string;
  /** Generated prompt text */
  promptText?: string;
  /** Whether included in prompts */
  promptIncluded: boolean;
  /** Which prompt version includes this */
  promptVersion?: string;
  updatedAt: string;
}

// =============================================================================
// Prompt Learning Types (prompt additions)
// =============================================================================

export interface PromptAddition {
  /** provider/model format */
  model: string;
  /** Section header (e.g., "## Notes for Gemini 3 Flash") */
  section: string;
  /** Order in prompt (lower = higher priority) */
  priority: number;
  /** Formatted markdown content */
  content: string;
  /** Insight IDs used to generate this addition */
  sourceInsights: string[];
}

// =============================================================================
// Prompt Effectiveness Types (specs/prompt-learning.md)
// =============================================================================

/**
 * Date range for measuring effectiveness before/after prompt addition
 */
export interface DateRange {
  /** ISO 8601 timestamp */
  start: string;
  /** ISO 8601 timestamp */
  end: string;
}

/**
 * Result of measuring prompt effectiveness for a single insight
 */
export interface EffectivenessResult {
  insightId: string;
  /** Occurrences per session before prompt was added */
  beforeRate: number;
  /** Occurrences per session after prompt was added */
  afterRate: number;
  /** Raw occurrence count before prompt was added */
  beforeCount: number;
  /** Raw occurrence count after prompt was added */
  afterCount: number;
  /** Percentage improvement (positive = fewer occurrences = better) */
  improvement: number;
  /** Whether we have enough data to be confident */
  significant: boolean;
  /** Number of sessions in before period */
  beforeSessions: number;
  /** Number of sessions in after period */
  afterSessions: number;
}

/**
 * Full effectiveness measurement record stored in database
 */
export interface PromptEffectiveness {
  id: string;
  insightId: string;
  promptVersion: string;

  /** Occurrences before prompt was added */
  beforeOccurrences: number;
  /** Average severity before (0.0-1.0) */
  beforeSeverity: number;

  /** Occurrences after prompt was added */
  afterOccurrences: number;
  /** Average severity after (0.0-1.0) */
  afterSeverity: number;

  /** Analysis period - before */
  beforeStart: string;
  beforeEnd: string;

  /** Analysis period - after */
  afterStart: string;
  afterEnd: string;

  /** Improvement percentage (positive = better) */
  improvementPct: number;
  /** Whether statistically significant */
  statisticallySignificant: boolean;

  /** Session counts for rate calculations */
  sessionsBefore: number;
  sessionsAfter: number;

  /** When this measurement was taken */
  measuredAt: string;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// Signals Types (specs/signals.md)
// =============================================================================

/**
 * Manual flag recorded by user via /brain --flag command
 */
export interface ManualFlag {
  /** Flag type: quirk, failure, win, or generic note */
  type: "quirk" | "failure" | "win" | "note";
  /** User's message */
  message: string;
  /** ISO 8601 timestamp when flag was recorded */
  timestamp: string;
}

/**
 * Friction signals detected in a session segment
 */
export interface FrictionSignals {
  /** Overall friction score (0.0-1.0) */
  score: number;
  /** Number of rephrasing cascades (3+ user messages without tool call) */
  rephrasingCount: number;
  /** Count of context churn events (frequent read/ls on different files) */
  contextChurnCount: number;
  /** Whether this segment was abandoned and restarted within 30 mins */
  abandonedRestart: boolean;
  /** Number of tool loops (same tool fails 3+ times with same error) */
  toolLoopCount: number;
  /** Model this node switched FROM (if this is a model switch retry) */
  modelSwitchFrom?: string;
  /** Whether session ended mid-task without handoff or success */
  silentTermination: boolean;
}

/**
 * Delight signals detected in a session segment
 */
export interface DelightSignals {
  /** Overall delight score (0.0-1.0) */
  score: number;
  /** Model recovered from tool error without user intervention */
  resilientRecovery: boolean;
  /** Complex task completed with zero user corrections */
  oneShotSuccess: boolean;
  /** User expressed explicit praise */
  explicitPraise: boolean;
}

/**
 * Combined signals for a node
 */
export interface NodeSignals {
  friction: FrictionSignals;
  delight: DelightSignals;
  manualFlags: ManualFlag[];
}
