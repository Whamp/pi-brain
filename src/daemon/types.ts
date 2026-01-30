/**
 * Daemon Types - Shared types for the daemon layer
 *
 * This module provides types that need to be shared across the daemon layer
 * and to other layers (storage, etc.) without creating circular dependencies.
 */

// =============================================================================
// Queue Types
// =============================================================================

/** Job type determines analysis behavior */
export type JobType = "initial" | "reanalysis" | "connection_discovery";

/** Job status tracks progress through the queue */
export type JobStatus = "pending" | "running" | "completed" | "failed";

/** Additional context for analysis jobs */
export interface JobContext {
  /** For reanalysis: existing node ID */
  existingNodeId?: string;
  /** Reason for reanalysis */
  reason?: string;
  /** For connection_discovery: node ID to find connections for */
  nodeId?: string;
  /** Whether to find connections */
  findConnections?: boolean;
  /** Boundary type that triggered this job */
  boundaryType?: string;
  /** Additional metadata */
  [key: string]: unknown;
}

/** Analysis job structure */
export interface AnalysisJob {
  /** Unique job identifier */
  id: string;
  /** Type of analysis to perform */
  type: JobType;
  /** Priority (lower = higher priority) */
  priority: number;
  /** Path to session file */
  sessionFile: string;
  /** Start entry ID for segment (optional) */
  segmentStart?: string;
  /** End entry ID for segment (optional) */
  segmentEnd?: string;
  /** Additional context for the agent */
  context?: JobContext;
  /** Current job status */
  status: JobStatus;
  /** When job was added to queue */
  queuedAt: string;
  /** When job started processing */
  startedAt?: string;
  /** When job completed or failed */
  completedAt?: string;
  /** Result node ID on success */
  resultNodeId?: string;
  /** Error message on failure */
  error?: string;
  /** Number of retry attempts */
  retryCount: number;
  /** Maximum retry attempts */
  maxRetries: number;
  /** Worker ID processing this job */
  workerId?: string;
  /** Lock expiration time */
  lockedUntil?: string;
}

/** Job creation input (id, status, queuedAt are auto-generated) */
export type JobInput = Omit<
  AnalysisJob,
  "id" | "status" | "queuedAt" | "retryCount" | "maxRetries" | "priority"
> & {
  /** Priority (defaults to PRIORITY.INITIAL) */
  priority?: number;
  /** Override default max retries */
  maxRetries?: number;
};

// =============================================================================
// Processor Types
// =============================================================================

/** Output schema for relationships extracted by the session analyzer */
export interface RelationshipOutput {
  /** UUID of the target node if known (null if unknown) */
  targetNodeId: string | null;
  /** Human-readable description of what this connects to */
  targetDescription: string;
  /** One of the 11 AutoMem relationship types */
  type:
    | "LEADS_TO"
    | "PREFERS_OVER"
    | "CONTRADICTS"
    | "REINFORCES"
    | "DERIVED_FROM"
    | "EXEMPLIFIES"
    | "PART_OF"
    | "RELATES_TO"
    | "OCCURRED_BEFORE"
    | "INVALIDATED_BY"
    | "EVOLVED_INTO";
  /** Confidence in this relationship (0.0-1.0) */
  confidence: number;
  /** Brief explanation of why this relationship exists */
  reason: string;
}

/** Output schema from the session analyzer (matches session-analyzer.md) */
export interface AgentNodeOutput {
  classification: {
    type: string;
    project: string;
    isNewProject: boolean;
    hadClearGoal: boolean;
    language?: string;
    frameworks?: string[];
  };
  content: {
    summary: string;
    outcome: "success" | "partial" | "failed" | "abandoned";
    keyDecisions: {
      what: string;
      why: string;
      alternativesConsidered: string[];
    }[];
    filesTouched: string[];
    toolsUsed: string[];
    errorsSeen: {
      type: string;
      message: string;
      resolved: boolean;
    }[];
  };
  lessons: {
    project: LessonOutput[];
    task: LessonOutput[];
    user: LessonOutput[];
    model: LessonOutput[];
    tool: LessonOutput[];
    skill: LessonOutput[];
    subagent: LessonOutput[];
  };
  observations: {
    modelsUsed: {
      provider: string;
      model: string;
      tokensInput: number;
      tokensOutput: number;
      cacheRead?: number;
      cacheWrite?: number;
      cost: number;
    }[];
    promptingWins: string[];
    promptingFailures: string[];
    modelQuirks: {
      model: string;
      observation: string;
      frequency: "once" | "sometimes" | "often" | "always";
      workaround?: string;
      severity: "low" | "medium" | "high";
    }[];
    toolUseErrors: {
      tool: string;
      errorType: string;
      context: string;
      model: string;
      wasRetried: boolean;
    }[];
  };
  semantic: {
    tags: string[];
    topics: string[];
    relatedProjects?: string[];
    concepts?: string[];
  };
  daemonMeta: {
    decisions: {
      timestamp: string;
      decision: string;
      reasoning: string;
      needsReview?: boolean;
    }[];
    rlmUsed: boolean;
    codemapAvailable?: boolean;
    analysisLog?: string;
    segmentTokenCount?: number;
  };
  /** AutoMem typed relationships extracted by the analyzer */
  relationships?: RelationshipOutput[];
}

interface LessonOutput {
  level: string;
  summary: string;
  details: string;
  confidence: "high" | "medium" | "low";
  tags: string[];
  actionable?: string;
}
