/**
 * pi-brain TypeScript types for the Web UI
 * These mirror the backend types from src/types.ts
 */

// Node types
export type NodeType =
  | "coding"
  | "sysadmin"
  | "research"
  | "planning"
  | "debugging"
  | "qa"
  | "brainstorm"
  | "handoff"
  | "refactor"
  | "documentation"
  | "configuration"
  | "other";

export type Outcome = "success" | "partial" | "failed" | "abandoned";

export type LessonLevel =
  | "project"
  | "task"
  | "user"
  | "model"
  | "tool"
  | "skill"
  | "subagent";

export type Confidence = "high" | "medium" | "low";

export type EdgeType =
  | "fork"
  | "branch"
  | "tree_jump"
  | "handoff"
  | "resume"
  | "compaction"
  | "semantic"
  | "temporal"
  | "continuation"
  | "reference"
  | "lesson_application"
  | "failure_pattern";

// Core interfaces
export interface Lesson {
  id: string;
  level: LessonLevel;
  summary: string;
  details: string;
  confidence: Confidence;
  tags: string[];
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

export interface Decision {
  what: string;
  why: string;
  alternativesConsidered: string[];
}

export interface ModelQuirk {
  id: string;
  model: string;
  observation: string;
  frequency: "once" | "sometimes" | "often" | "always";
  workaround?: string;
}

export interface ToolError {
  id: string;
  tool: string;
  errorType: string;
  context: string;
  model: string;
}

export interface Node {
  id: string;
  version: number;
  previousVersions: string[];
  source: {
    sessionFile: string;
    segment: {
      startEntryId: string;
      endEntryId: string;
    };
    computer: string;
  };
  classification: {
    type: NodeType;
    project: string;
    isNewProject: boolean;
    hadClearGoal: boolean;
  };
  content: {
    summary: string;
    outcome: Outcome;
    keyDecisions: Decision[];
    filesTouched: string[];
  };
  lessons: LessonsByLevel;
  observations: {
    modelsUsed: {
      provider: string;
      model: string;
      tokensInput: number;
      tokensOutput: number;
      cost: number;
    }[];
    promptingWins: string[];
    promptingFailures: string[];
    modelQuirks: ModelQuirk[];
    toolUseErrors: ToolError[];
  };
  metadata: {
    tokensUsed: number;
    cost: number;
    durationMinutes: number;
    timestamp: string;
  };
  semantic: {
    tags: string[];
    topics: string[];
  };
  daemonMeta: {
    analyzedAt: string;
    analyzerVersion: string;
    daemonDecisions: {
      timestamp: string;
      decision: string;
      reasoning: string;
    }[];
  };
}

export interface Edge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  type: EdgeType;
  metadata: Record<string, unknown>;
  createdAt: string;
  createdBy: "boundary" | "daemon" | "user";
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
