/**
 * Node Queries - Listing, filtering, and aggregation queries for nodes
 *
 * This module provides query functions for listing nodes with filters,
 * pagination, sorting, and various aggregation queries.
 *
 * Based on specs/api.md and specs/storage.md.
 */

import type Database from "better-sqlite3";

import type { NodeRow } from "./node-crud.js";

// =============================================================================
// Query Helpers
// =============================================================================

/**
 * Get node summary from FTS index
 */
export function getNodeSummary(
  db: Database.Database,
  nodeId: string
): string | null {
  const stmt = db.prepare("SELECT summary FROM nodes_fts WHERE node_id = ?");
  const result = stmt.get(nodeId) as { summary: string } | undefined;
  return result?.summary ?? null;
}

/**
 * Get tags for a node
 */
export function getNodeTags(db: Database.Database, nodeId: string): string[] {
  const stmt = db.prepare("SELECT tag FROM tags WHERE node_id = ?");
  const rows = stmt.all(nodeId) as { tag: string }[];
  return rows.map((r) => r.tag);
}

/**
 * Get topics for a node
 */
export function getNodeTopics(db: Database.Database, nodeId: string): string[] {
  const stmt = db.prepare("SELECT topic FROM topics WHERE node_id = ?");
  const rows = stmt.all(nodeId) as { topic: string }[];
  return rows.map((r) => r.topic);
}

/**
 * Get all unique tags in the system
 */
export function getAllTags(db: Database.Database): string[] {
  const stmt = db.prepare(`
    SELECT tag FROM (
      SELECT tag FROM tags
      UNION
      SELECT tag FROM lesson_tags
    ) ORDER BY tag
  `);
  const rows = stmt.all() as { tag: string }[];
  return rows.map((r) => r.tag);
}

/**
 * Get all unique topics in the system
 */
export function getAllTopics(db: Database.Database): string[] {
  const stmt = db.prepare("SELECT DISTINCT topic FROM topics ORDER BY topic");
  const rows = stmt.all() as { topic: string }[];
  return rows.map((r) => r.topic);
}

/**
 * Find nodes by tag (matches both node tags and lesson tags)
 */
export function getNodesByTag(db: Database.Database, tag: string): NodeRow[] {
  const stmt = db.prepare(`
    SELECT DISTINCT n.* FROM nodes n
    LEFT JOIN tags t ON n.id = t.node_id
    LEFT JOIN lessons l ON n.id = l.node_id
    LEFT JOIN lesson_tags lt ON l.id = lt.lesson_id
    WHERE t.tag = ? OR lt.tag = ?
    ORDER BY n.timestamp DESC
  `);
  return stmt.all(tag, tag) as NodeRow[];
}

/**
 * Find nodes by topic
 */
export function getNodesByTopic(
  db: Database.Database,
  topic: string
): NodeRow[] {
  const stmt = db.prepare(`
    SELECT n.* FROM nodes n
    JOIN topics t ON n.id = t.node_id
    WHERE t.topic = ?
    ORDER BY n.timestamp DESC
  `);
  return stmt.all(topic) as NodeRow[];
}

// =============================================================================
// Query Layer: List Nodes with Filters
// =============================================================================

/** Valid sort fields for listNodes */
export type NodeSortField =
  | "timestamp"
  | "analyzed_at"
  | "project"
  | "type"
  | "outcome"
  | "tokens_used"
  | "cost"
  | "duration_minutes";

/** Sort order */
export type SortOrder = "asc" | "desc";

/** Node type filter values */
export type NodeTypeFilter =
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

/** Outcome filter values */
export type OutcomeFilter = "success" | "partial" | "failed" | "abandoned";

/** Filters for querying nodes */
export interface ListNodesFilters {
  /** Filter by project path (partial match via LIKE %project%) */
  project?: string;
  /** Filter by project path (exact match) */
  exactProject?: string;
  /** Filter by exact node type */
  type?: NodeTypeFilter;
  /** Filter by exact outcome */
  outcome?: OutcomeFilter;
  /** Filter by start date (ISO 8601, inclusive) */
  from?: string;
  /** Filter by end date (ISO 8601, inclusive) */
  to?: string;
  /** Filter by source computer */
  computer?: string;
  /** Filter by whether goal was clear (vague prompting detection) */
  hadClearGoal?: boolean;
  /** Filter by new project flag */
  isNewProject?: boolean;
  /** Filter by tags (nodes must have ALL specified tags - AND logic) */
  tags?: string[];
  /** Filter by topics (nodes must have ALL specified topics - AND logic) */
  topics?: string[];
  /** Filter by session file path */
  sessionFile?: string;
}

/** Pagination and sorting options */
export interface ListNodesOptions {
  /** Max results to return (default: 50, max: 500) */
  limit?: number;
  /** Offset for pagination (default: 0) */
  offset?: number;
  /** Sort field (default: "timestamp") */
  sort?: NodeSortField;
  /** Sort order (default: "desc") */
  order?: SortOrder;
}

/** Result from listNodes query */
export interface ListNodesResult {
  /** Matched nodes */
  nodes: NodeRow[];
  /** Total count of nodes matching filters (before pagination) */
  total: number;
  /** Limit used for the query */
  limit: number;
  /** Offset used for the query */
  offset: number;
}

/** Allowed sort fields (validated against SQL injection) */
const ALLOWED_SORT_FIELDS = new Set<NodeSortField>([
  "timestamp",
  "analyzed_at",
  "project",
  "type",
  "outcome",
  "tokens_used",
  "cost",
  "duration_minutes",
]);

/**
 * List nodes with filters, pagination, and sorting.
 *
 * Supports filtering by:
 * - project (partial match via LIKE)
 * - type (exact match)
 * - outcome (exact match)
 * - date range (from/to on timestamp field)
 * - computer (exact match)
 * - hadClearGoal (boolean)
 * - isNewProject (boolean)
 * - tags (AND logic - nodes must have ALL specified tags)
 * - topics (AND logic - nodes must have ALL specified topics)
 *
 * Per specs/api.md GET /api/v1/nodes endpoint.
 */
export function listNodes(
  db: Database.Database,
  filters: ListNodesFilters = {},
  options: ListNodesOptions = {}
): ListNodesResult {
  // Apply defaults and constraints
  // Cap at 100,000 to allow for large internal queries (like session aggregation)
  // while still preventing OOM. API routes should enforce tighter limits.
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 100_000);
  const offset = Math.max(options.offset ?? 0, 0);
  const sort: NodeSortField = ALLOWED_SORT_FIELDS.has(
    options.sort as NodeSortField
  )
    ? (options.sort as NodeSortField)
    : "timestamp";
  const order: SortOrder = options.order === "asc" ? "asc" : "desc";

  // Build WHERE clause dynamically
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (filters.project !== undefined) {
    conditions.push("n.project LIKE ?");
    params.push(`%${filters.project}%`);
  }

  if (filters.exactProject !== undefined) {
    conditions.push("n.project = ?");
    params.push(filters.exactProject);
  }

  if (filters.type !== undefined) {
    conditions.push("n.type = ?");
    params.push(filters.type);
  }

  if (filters.outcome !== undefined) {
    conditions.push("n.outcome = ?");
    params.push(filters.outcome);
  }

  if (filters.from !== undefined) {
    conditions.push("n.timestamp >= ?");
    params.push(filters.from);
  }

  if (filters.to !== undefined) {
    conditions.push("n.timestamp <= ?");
    params.push(filters.to);
  }

  if (filters.computer !== undefined) {
    conditions.push("n.computer = ?");
    params.push(filters.computer);
  }

  if (filters.hadClearGoal !== undefined) {
    conditions.push("n.had_clear_goal = ?");
    params.push(filters.hadClearGoal ? 1 : 0);
  }

  if (filters.isNewProject !== undefined) {
    conditions.push("n.is_new_project = ?");
    params.push(filters.isNewProject ? 1 : 0);
  }

  if (filters.sessionFile !== undefined) {
    conditions.push("n.session_file = ?");
    params.push(filters.sessionFile);
  }

  // Tags filter: nodes must have ALL specified tags (AND logic)
  // Considers both node-level tags and lesson-level tags
  if (filters.tags !== undefined && filters.tags.length > 0) {
    const tagPlaceholders = filters.tags.map(() => "?").join(", ");
    conditions.push(`n.id IN (
      SELECT node_id FROM (
        SELECT node_id, tag FROM tags
        UNION
        SELECT l.node_id, lt.tag FROM lesson_tags lt JOIN lessons l ON lt.lesson_id = l.id
      )
      WHERE tag IN (${tagPlaceholders})
      GROUP BY node_id
      HAVING COUNT(DISTINCT tag) = ?
    )`);
    params.push(...filters.tags, filters.tags.length);
  }

  // Topics filter: nodes must have ALL specified topics (AND logic)
  if (filters.topics !== undefined && filters.topics.length > 0) {
    const topicPlaceholders = filters.topics.map(() => "?").join(", ");
    conditions.push(`(
      SELECT COUNT(DISTINCT tp.topic) FROM topics tp
      WHERE tp.node_id = n.id AND tp.topic IN (${topicPlaceholders})
    ) = ?`);
    params.push(...filters.topics, filters.topics.length);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Count query for total (before pagination)
  const countStmt = db.prepare(
    `SELECT COUNT(*) as count FROM nodes n ${whereClause}`
  );
  const countResult = countStmt.get(...params) as { count: number };
  const total = countResult.count;

  // Main query with pagination and sorting
  // Sort field is validated against ALLOWED_SORT_FIELDS so safe for template literal
  const dataStmt = db.prepare(`
    SELECT n.* FROM nodes n
    ${whereClause}
    ORDER BY n.${sort} ${order.toUpperCase()}
    LIMIT ? OFFSET ?
  `);

  const nodes = dataStmt.all(...params, limit, offset) as NodeRow[];

  return {
    nodes,
    total,
    limit,
    offset,
  };
}

// =============================================================================
// Session Summaries
// =============================================================================

/**
 * Session summary row from aggregation query
 */
export interface SessionSummaryRow {
  sessionFile: string;
  nodeCount: number;
  firstTimestamp: string;
  lastTimestamp: string;
  totalTokens: number;
  totalCost: number;
  types: string | null; // comma separated
  successCount: number;
  partialCount: number;
  failedCount: number;
  abandonedCount: number;
}

/**
 * Get aggregated session summaries for a project.
 * Used for the session browser to avoid loading thousands of nodes.
 */
export function getSessionSummaries(
  db: Database.Database,
  project: string,
  options: { limit?: number; offset?: number } = {}
): SessionSummaryRow[] {
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 500);
  const offset = Math.max(options.offset ?? 0, 0);

  const stmt = db.prepare(`
    SELECT
      session_file as sessionFile,
      COUNT(*) as nodeCount,
      MIN(timestamp) as firstTimestamp,
      MAX(timestamp) as lastTimestamp,
      SUM(tokens_used) as totalTokens,
      SUM(cost) as totalCost,
      GROUP_CONCAT(DISTINCT type) as types,
      SUM(CASE WHEN outcome = 'success' THEN 1 ELSE 0 END) as successCount,
      SUM(CASE WHEN outcome = 'partial' THEN 1 ELSE 0 END) as partialCount,
      SUM(CASE WHEN outcome = 'failed' THEN 1 ELSE 0 END) as failedCount,
      SUM(CASE WHEN outcome = 'abandoned' THEN 1 ELSE 0 END) as abandonedCount
    FROM nodes
    WHERE project = ?
    GROUP BY session_file
    ORDER BY lastTimestamp DESC
    LIMIT ? OFFSET ?
  `);

  return stmt.all(project, limit, offset) as SessionSummaryRow[];
}

// =============================================================================
// Aggregation Queries
// =============================================================================

/**
 * Get all unique projects in the system
 */
export function getAllProjects(db: Database.Database): string[] {
  const stmt = db.prepare(`
    SELECT DISTINCT project FROM nodes
    WHERE project IS NOT NULL
    ORDER BY project
  `);
  const rows = stmt.all() as { project: string }[];
  return rows.map((r) => r.project);
}

/**
 * Get all unique node types that have been used
 */
export function getAllNodeTypes(db: Database.Database): string[] {
  const stmt = db.prepare(`
    SELECT DISTINCT type FROM nodes
    WHERE type IS NOT NULL
    ORDER BY type
  `);
  const rows = stmt.all() as { type: string }[];
  return rows.map((r) => r.type);
}

/**
 * Get all unique computers (source machines)
 */
export function getAllComputers(db: Database.Database): string[] {
  const stmt = db.prepare(`
    SELECT DISTINCT computer FROM nodes
    WHERE computer IS NOT NULL
    ORDER BY computer
  `);
  const rows = stmt.all() as { computer: string }[];
  return rows.map((r) => r.computer);
}

/**
 * Count nodes matching filters (without fetching data)
 */
export function countNodes(
  db: Database.Database,
  filters: ListNodesFilters = {}
): number {
  const result = listNodes(db, filters, { limit: 1 });
  return result.total;
}
