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

import {
  buildWhereClause,
  normalizePagination,
  type ExtendedFilters,
} from "./filter-utils.js";

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

/** Filters for querying nodes */
export type ListNodesFilters = ExtendedFilters;

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

  // Build WHERE clause using shared filter builder
  // buildWhereClause returns "AND ... " prefix for compatibility with FTS queries
  // We need to convert it to "WHERE ..." format for listNodes
  const { clause, params } = buildWhereClause(filters, "n");
  const whereClause = clause ? `WHERE ${clause.slice(4)}` : ""; // Remove "AND " prefix

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
  /** Summary of the first node (earliest timestamp) in the session */
  firstNodeSummary: string | null;
  /** Type of the first node in the session */
  firstNodeType: string | null;
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
  const { limit, offset } = normalizePagination(options.limit, options.offset);

  // Get the first node ID for each session (earliest timestamp)
  // Then join with nodes_fts to get the summary
  const stmt = db.prepare(`
    WITH session_stats AS (
      SELECT
        session_file,
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
    ),
    first_nodes AS (
      SELECT n.session_file, n.id as first_node_id, n.type as first_node_type
      FROM nodes n
      INNER JOIN session_stats s ON n.session_file = s.session_file AND n.timestamp = s.firstTimestamp
      WHERE n.project = ?
    )
    SELECT
      s.session_file as sessionFile,
      s.nodeCount,
      s.firstTimestamp,
      s.lastTimestamp,
      s.totalTokens,
      s.totalCost,
      s.types,
      s.successCount,
      s.partialCount,
      s.failedCount,
      s.abandonedCount,
      fts.summary as firstNodeSummary,
      fn.first_node_type as firstNodeType
    FROM session_stats s
    LEFT JOIN first_nodes fn ON s.session_file = fn.session_file
    LEFT JOIN nodes_fts fts ON fn.first_node_id = fts.node_id
    ORDER BY s.lastTimestamp DESC
    LIMIT ? OFFSET ?
  `);

  return stmt.all(project, project, limit, offset) as SessionSummaryRow[];
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
 * Count nodes matching filters (without fetching data)
 */
export function countNodes(
  db: Database.Database,
  filters: ListNodesFilters = {}
): number {
  const result = listNodes(db, filters, { limit: 1 });
  return result.total;
}
