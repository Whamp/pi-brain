/**
 * Filter Utils - Shared filter building logic for node queries
 *
 * Provides a unified `buildWhereClause` function used by both
 * `node-queries.ts` (listNodes) and `search-repository.ts` (searchNodesAdvanced).
 *
 * This eliminates code duplication and ensures consistent filter behavior.
 */

import type { NodeTypeFilter, OutcomeFilter } from "./node-types.js";

// =============================================================================
// Types
// =============================================================================

/** Base filter fields shared by all filter types */
export interface BaseFilters {
  /** Filter by project path (partial match via LIKE %project%) */
  project?: string;
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
}

/** Extended filters with additional fields for listNodes */
export interface ExtendedFilters extends BaseFilters {
  /** Filter by project path (exact match) */
  exactProject?: string;
  /** Filter by session file path */
  sessionFile?: string;
}

/** Result of building a WHERE clause */
export interface WhereClauseResult {
  /** The WHERE clause (without the "WHERE" keyword, or empty string if no conditions) */
  clause: string;
  /** Parameters for prepared statement placeholders */
  params: (string | number)[];
}

// =============================================================================
// WHERE Clause Builder
// =============================================================================

/**
 * Build a WHERE clause from filter conditions.
 *
 * Supports filtering by:
 * - project (partial match via LIKE)
 * - exactProject (exact match)
 * - type (exact match)
 * - outcome (exact match)
 * - date range (from/to on timestamp field)
 * - computer (exact match)
 * - hadClearGoal (boolean)
 * - isNewProject (boolean)
 * - sessionFile (exact match)
 * - tags (AND logic - nodes must have ALL specified tags)
 * - topics (AND logic - nodes must have ALL specified topics)
 *
 * @param {BaseFilters | ExtendedFilters | undefined} filters - Filter conditions (BaseFilters or ExtendedFilters)
 * @param {string} tableAlias - Table alias for the nodes table (default: "n")
 * @returns {WhereClauseResult} WHERE clause and parameters for prepared statement
 *
 * @example
 * const { clause, params } = buildWhereClause(
 *   { type: "coding", project: "pi-brain", tags: ["auth", "security"] },
 *   "n"
 * );
 * // clause: "n.type = ? AND n.project LIKE ? AND n.id IN (SELECT node_id ...)"
 * // params: ["coding", "%pi-brain%", "auth", "security", 2]
 */
export function buildWhereClause(
  filters: BaseFilters | ExtendedFilters | undefined,
  tableAlias = "n"
): WhereClauseResult {
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  // Handle undefined filters
  if (filters === undefined) {
    return { clause: "", params: [] };
  }

  // Project partial match
  if (filters.project !== undefined) {
    conditions.push(`${tableAlias}.project LIKE ?`);
    params.push(`%${filters.project}%`);
  }

  // Project exact match (ExtendedFilters only)
  if ("exactProject" in filters && filters.exactProject !== undefined) {
    conditions.push(`${tableAlias}.project = ?`);
    params.push(filters.exactProject);
  }

  // Type filter
  if (filters.type !== undefined) {
    conditions.push(`${tableAlias}.type = ?`);
    params.push(filters.type);
  }

  // Outcome filter
  if (filters.outcome !== undefined) {
    conditions.push(`${tableAlias}.outcome = ?`);
    params.push(filters.outcome);
  }

  // Date range: from
  if (filters.from !== undefined) {
    conditions.push(`${tableAlias}.timestamp >= ?`);
    params.push(filters.from);
  }

  // Date range: to
  if (filters.to !== undefined) {
    conditions.push(`${tableAlias}.timestamp <= ?`);
    params.push(filters.to);
  }

  // Computer filter
  if (filters.computer !== undefined) {
    conditions.push(`${tableAlias}.computer = ?`);
    params.push(filters.computer);
  }

  // Had clear goal filter
  if (filters.hadClearGoal !== undefined) {
    conditions.push(`${tableAlias}.had_clear_goal = ?`);
    params.push(filters.hadClearGoal ? 1 : 0);
  }

  // Is new project filter
  if (filters.isNewProject !== undefined) {
    conditions.push(`${tableAlias}.is_new_project = ?`);
    params.push(filters.isNewProject ? 1 : 0);
  }

  // Session file filter (ExtendedFilters only)
  if ("sessionFile" in filters && filters.sessionFile !== undefined) {
    conditions.push(`${tableAlias}.session_file = ?`);
    params.push(filters.sessionFile);
  }

  // Tags filter: nodes must have ALL specified tags (AND logic)
  // Considers both node-level tags and lesson-level tags
  if (filters.tags !== undefined && filters.tags.length > 0) {
    const tagPlaceholders = filters.tags.map(() => "?").join(", ");
    conditions.push(`${tableAlias}.id IN (
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
      WHERE tp.node_id = ${tableAlias}.id AND tp.topic IN (${topicPlaceholders})
    ) = ?`);
    params.push(...filters.topics, filters.topics.length);
  }

  const clause = conditions.length > 0 ? `AND ${conditions.join(" AND ")}` : "";

  return { clause, params };
}
