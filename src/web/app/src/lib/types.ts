/**
 * pi-brain TypeScript types for the Web UI
 * These mirror the backend types from src/types.ts
 */

import type {
  Node,
  Edge,
  Lesson,
  ModelQuirk,
  ToolError,
  NodeType,
  Outcome,
  Decision,
  DaemonDecision,
  DaemonMeta,
  NodeSource,
  NodeClassification,
  NodeContent,
  NodeMetadata,
  SemanticData,
  LessonsByLevel,
  ModelObservations,
  EdgeType,
  EdgeMetadata,
  VersionTrigger,
  NodeVersion,
  LessonLevel,
  Confidence,
  AggregatedFailurePattern,
  AggregatedModelStats,
  AggregatedLessonPattern,
  AggregatedInsight,
  PromptEffectiveness,
  Cluster,
  ClusterNode,
  ClusterStatus,
  ClusterSignalType,
} from "../../../../types/index.js";

// Re-export shared types
export type {
  Node,
  Edge,
  Lesson,
  ModelQuirk,
  ToolError,
  NodeType,
  Outcome,
  Decision,
  DaemonDecision,
  DaemonMeta,
  NodeSource,
  NodeClassification,
  NodeContent,
  NodeMetadata,
  SemanticData,
  LessonsByLevel,
  ModelObservations,
  EdgeType,
  EdgeMetadata,
  VersionTrigger,
  NodeVersion,
  LessonLevel,
  Confidence,
  AggregatedFailurePattern,
  AggregatedModelStats,
  AggregatedLessonPattern,
  AggregatedInsight,
  PromptEffectiveness,
  Cluster,
  ClusterNode,
  ClusterStatus,
  ClusterSignalType,
};

// Extended types with IDs for API responses (Entities)
export interface LessonEntity extends Omit<Lesson, "tags"> {
  id: string;
  nodeId: string;
  sourceProject: string | null;
  createdAt: string;
  tags: string[]; // API returns tags
}

export interface ModelQuirkEntity extends ModelQuirk {
  id: string;
  nodeId: string;
  sourceProject: string | null;
  createdAt: string;
}

export interface ToolErrorEntity extends ToolError {
  id: string;
  nodeId: string;
  sourceProject: string | null;
  createdAt: string;
}

// API response types
export interface ListNodesResponse {
  nodes: Node[];
  total: number;
  limit: number;
  offset: number;
}

export interface SearchResult {
  nodeId: string;
  score: number;
  highlights: {
    field: string;
    snippet: string;
  }[];
  node: Node;
}

export interface DashboardStats {
  totals: {
    nodes: number;
    edges: number;
    lessons: number;
    sessions: number;
  };
  recent: {
    nodesThisWeek: number;
    sessionsToday: number;
  };
  usage: {
    totalTokens: number;
    totalCost: number;
    byModel: Record<string, { tokens: number; cost: number }>;
  };
  outcomes: {
    success: number;
    partial: number;
    failed: number;
    abandoned: number;
  };
  topProjects: { project: string; nodeCount: number }[];
  trends: {
    vagueGoals: {
      thisWeek: number;
      lastWeek: number;
      change: number;
    };
  };
}

export interface DaemonStatus {
  running: boolean;
  pid?: number;
  uptime?: number;
  workers: {
    total: number;
    active: number;
    idle: number;
  };
  queue: {
    pending: number;
    running: number;
    completedToday: number;
    failedToday: number;
  };
  lastAnalysis?: string;
  nextScheduled?: {
    reanalysis?: string;
    connectionDiscovery?: string;
  };
}

// DaemonDecision in shared types is the embedded one (no ID, etc)
// We need the entity version for lists
export interface DaemonDecisionEntity {
  id: string;
  nodeId: string;
  timestamp: string;
  decision: string;
  reasoning: string;
  userFeedback: string | null;
  sourceProject: string | null;
  sourceSession: string | null;
}

// Filter types
export interface NodeFilters {
  project?: string;
  type?: NodeType;
  outcome?: Outcome;
  from?: string;
  to?: string;
  tags?: string[];
  computer?: string;
  hadClearGoal?: boolean;
}

// Session browser types
export interface ProjectSummary {
  project: string;
  sessionCount: number;
  nodeCount: number;
  lastActivity: string;
}

export interface SessionSummary {
  sessionFile: string;
  nodeCount: number;
  firstTimestamp: string;
  lastTimestamp: string;
  outcomes: {
    success: number;
    partial: number;
    failed: number;
    abandoned: number;
  };
  types: string[];
  totalTokens: number;
  totalCost: number;
}

// Cluster types for News Feed
export interface ClusterNodeWithDetails extends ClusterNode {
  summary?: string;
  type?: string;
  project?: string;
  outcome?: string;
}

export interface ClusterWithNodes extends Cluster {
  nodes?: ClusterNodeWithDetails[];
}

export interface ClusterFeedResponse {
  clusters: ClusterWithNodes[];
  count: number;
}

export interface ClusterListResponse {
  clusters: ClusterWithNodes[];
  total: number;
  limit: number;
  offset: number;
}

// Signals types for friction/delight tracking
export interface AbandonedRestartPattern {
  /** Node that was abandoned */
  abandonedNodeId: string;
  abandonedSummary: string;
  abandonedProject: string;
  abandonedTimestamp: string;
  /** Node that restarted the work (may not be available) */
  restartNodeId?: string;
  restartSummary?: string;
  restartTimestamp?: string;
  /** Model used in abandoned session */
  model?: string;
  /** Files touched in abandoned session */
  filesTouched: string[];
  /** Friction score of the abandoned node */
  frictionScore: number;
}

export interface AbandonedRestartsResponse {
  patterns: AbandonedRestartPattern[];
  /** Approximate count - based on 'abandoned' outcome, not all have abandonedRestart signal */
  approximateTotal: number;
  limit: number;
  offset: number;
}

export interface FrictionSummary {
  /** Total nodes with high friction (score > 0.5) */
  highFrictionCount: number;
  /** Total abandoned restart patterns */
  abandonedRestartCount: number;
  /** Total rephrasing cascade events */
  rephrasingCascadeCount: number;
  /** Total tool loop events */
  toolLoopCount: number;
  /** Total context churn events */
  contextChurnCount: number;
  /** Models with highest friction */
  modelFriction: { model: string; count: number }[];
}

// Spoke configuration types
export type SyncMethod = "syncthing" | "rsync" | "api";

export interface RsyncOptions {
  bwLimit?: number;
  delete?: boolean;
  extraArgs?: string[];
  timeoutSeconds?: number;
}

export interface SpokeConfig {
  name: string;
  syncMethod: SyncMethod;
  path: string;
  source?: string;
  enabled: boolean;
  schedule?: string;
  rsyncOptions?: RsyncOptions;
}

export interface SpokeCreateRequest {
  name: string;
  syncMethod: SyncMethod;
  path: string;
  source?: string;
  enabled?: boolean;
  schedule?: string;
  rsyncOptions?: RsyncOptions;
}

export interface SpokeUpdateRequest {
  syncMethod?: SyncMethod;
  path?: string;
  source?: string | null;
  enabled?: boolean;
  schedule?: string | null;
  rsyncOptions?: RsyncOptions | null;
}
