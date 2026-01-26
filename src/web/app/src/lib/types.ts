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
