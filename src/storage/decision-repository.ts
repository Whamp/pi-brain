/**
 * Daemon Decision Repository - CRUD operations for daemon decisions
 *
 * Based on specs/storage.md
 */

import type Database from "better-sqlite3";

import { normalizePagination } from "./filter-utils.js";

/** Filters for querying daemon decisions */
export interface ListDecisionsFilters {
  /** Filter by decision type/text (partial match) */
  decision?: string;
  /** Filter by source project (partial match via nodes table) */
  project?: string;
  /** Filter by timestamp range (start) */
  from?: string;
  /** Filter by timestamp range (end) */
  to?: string;
}

/** Pagination options */
export interface ListDecisionsOptions {
  /** Max results to return (default: 50, max: 500) */
  limit?: number;
  /** Offset for pagination (default: 0) */
  offset?: number;
}

/** A daemon decision result with metadata */
export interface DaemonDecisionResult {
  id: string;
  nodeId: string;
  timestamp: string;
  decision: string;
  reasoning: string;
  userFeedback: string | null;
  sourceProject: string | null;
  sourceSession: string | null;
}

/** Result from listDecisions query */
export interface ListDecisionsResult {
  /** Matched decisions */
  decisions: DaemonDecisionResult[];
  /** Total count matching filters (before pagination) */
  total: number;
  /** Limit used for the query */
  limit: number;
  /** Offset used for the query */
  offset: number;
}

/**
 * List daemon decisions with filters and pagination.
 */
export function listDecisions(
  db: Database.Database,
  filters: ListDecisionsFilters = {},
  options: ListDecisionsOptions = {}
): ListDecisionsResult {
  const { limit, offset } = normalizePagination(options.limit, options.offset);

  // Build WHERE clause
  const conditions: string[] = ["1=1"];
  const params: (string | number)[] = [];

  if (filters.decision) {
    conditions.push("d.decision LIKE ?");
    params.push(`%${filters.decision}%`);
  }

  if (filters.project) {
    conditions.push("n.project LIKE ?");
    params.push(`%${filters.project}%`);
  }

  if (filters.from) {
    conditions.push("d.timestamp >= ?");
    params.push(filters.from);
  }

  if (filters.to) {
    conditions.push("d.timestamp <= ?");
    params.push(filters.to);
  }

  const whereClause = conditions.join(" AND ");

  // Count total
  const countStmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM daemon_decisions d
    JOIN nodes n ON d.node_id = n.id
    WHERE ${whereClause}
  `);
  const total = (countStmt.get(...params) as { count: number }).count;

  // Fetch decisions
  const dataStmt = db.prepare(`
    SELECT 
      d.id, 
      d.node_id as nodeId, 
      d.timestamp, 
      d.decision, 
      d.reasoning, 
      d.user_feedback as userFeedback,
      n.project as sourceProject,
      n.session_file as sourceSession
    FROM daemon_decisions d
    JOIN nodes n ON d.node_id = n.id
    WHERE ${whereClause}
    ORDER BY d.timestamp DESC
    LIMIT ? OFFSET ?
  `);

  const decisions = dataStmt.all(
    ...params,
    limit,
    offset
  ) as DaemonDecisionResult[];

  return { decisions, total, limit, offset };
}

/**
 * Update user feedback for a daemon decision
 */
export function updateDecisionFeedback(
  db: Database.Database,
  decisionId: string,
  feedback: string | null
): boolean {
  const stmt = db.prepare(`
    UPDATE daemon_decisions 
    SET user_feedback = ?
    WHERE id = ?
  `);

  const result = stmt.run(feedback, decisionId);
  return result.changes > 0;
}
