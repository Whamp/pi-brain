/**
 * Node data structure types for pi-brain knowledge graph
 * Based on specs/node-model.md
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
// Utility Functions
// =============================================================================

/**
 * Generate a unique 16-character hex node ID
 * Uses first 16 chars of UUID (64 bits of entropy)
 */
export function generateNodeId(): string {
  return crypto.randomUUID().replaceAll("-", "").slice(0, 16);
}

/**
 * Create a full node reference with version
 */
export function nodeRef(nodeId: string, version: number): string {
  return `${nodeId}-v${version}`;
}

/**
 * Parse a node reference into id and version
 */
export function parseNodeRef(ref: string): { nodeId: string; version: number } {
  const match = /^([a-f0-9]{16})-v(\d+)$/.exec(ref);
  if (!match) {
    throw new Error(`Invalid node reference: ${ref}`);
  }
  return {
    nodeId: match[1],
    version: Number.parseInt(match[2], 10),
  };
}

/**
 * Create an empty lessons structure
 */
export function emptyLessons(): LessonsByLevel {
  return {
    project: [],
    task: [],
    user: [],
    model: [],
    tool: [],
    skill: [],
    subagent: [],
  };
}

/**
 * Create an empty observations structure
 */
export function emptyObservations(): ModelObservations {
  return {
    modelsUsed: [],
    promptingWins: [],
    promptingFailures: [],
    modelQuirks: [],
    toolUseErrors: [],
  };
}

/**
 * Create an empty daemon meta structure
 */
export function emptyDaemonMeta(): DaemonMeta {
  return {
    decisions: [],
    rlmUsed: false,
  };
}
