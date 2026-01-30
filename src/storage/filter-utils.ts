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
// Filter Handlers
// =============================================================================

interface FilterContext {
  conditions: string[];
  params: (string | number)[];
  tableAlias: string;
}

type FilterHandler = (
  filters: BaseFilters | ExtendedFilters,
  ctx: FilterContext
) => void;

/** Handle project partial match filter */
function handleProjectFilter(
  filters: BaseFilters | ExtendedFilters,
  ctx: FilterContext
): void {
  if (filters.project !== undefined) {
    ctx.conditions.push(`${ctx.tableAlias}.project LIKE ?`);
    ctx.params.push(`%${filters.project}%`);
  }
}

/** Handle exact project filter (ExtendedFilters only) */
function handleExactProjectFilter(
  filters: BaseFilters | ExtendedFilters,
  ctx: FilterContext
): void {
  if ("exactProject" in filters && filters.exactProject !== undefined) {
    ctx.conditions.push(`${ctx.tableAlias}.project = ?`);
    ctx.params.push(filters.exactProject);
  }
}

/** Handle type filter */
function handleTypeFilter(
  filters: BaseFilters | ExtendedFilters,
  ctx: FilterContext
): void {
  if (filters.type !== undefined) {
    ctx.conditions.push(`${ctx.tableAlias}.type = ?`);
    ctx.params.push(filters.type);
  }
}

/** Handle outcome filter */
function handleOutcomeFilter(
  filters: BaseFilters | ExtendedFilters,
  ctx: FilterContext
): void {
  if (filters.outcome !== undefined) {
    ctx.conditions.push(`${ctx.tableAlias}.outcome = ?`);
    ctx.params.push(filters.outcome);
  }
}

/** Handle date range filters */
function handleDateRangeFilters(
  filters: BaseFilters | ExtendedFilters,
  ctx: FilterContext
): void {
  if (filters.from !== undefined) {
    ctx.conditions.push(`${ctx.tableAlias}.timestamp >= ?`);
    ctx.params.push(filters.from);
  }
  if (filters.to !== undefined) {
    ctx.conditions.push(`${ctx.tableAlias}.timestamp <= ?`);
    ctx.params.push(filters.to);
  }
}

/** Handle computer filter */
function handleComputerFilter(
  filters: BaseFilters | ExtendedFilters,
  ctx: FilterContext
): void {
  if (filters.computer !== undefined) {
    ctx.conditions.push(`${ctx.tableAlias}.computer = ?`);
    ctx.params.push(filters.computer);
  }
}

/** Handle boolean filters (hadClearGoal, isNewProject) */
function handleBooleanFilters(
  filters: BaseFilters | ExtendedFilters,
  ctx: FilterContext
): void {
  if (filters.hadClearGoal !== undefined) {
    ctx.conditions.push(`${ctx.tableAlias}.had_clear_goal = ?`);
    ctx.params.push(filters.hadClearGoal ? 1 : 0);
  }
  if (filters.isNewProject !== undefined) {
    ctx.conditions.push(`${ctx.tableAlias}.is_new_project = ?`);
    ctx.params.push(filters.isNewProject ? 1 : 0);
  }
}

/** Handle session file filter (ExtendedFilters only) */
function handleSessionFileFilter(
  filters: BaseFilters | ExtendedFilters,
  ctx: FilterContext
): void {
  if ("sessionFile" in filters && filters.sessionFile !== undefined) {
    ctx.conditions.push(`${ctx.tableAlias}.session_file = ?`);
    ctx.params.push(filters.sessionFile);
  }
}

/** Handle tags filter with AND logic */
function handleTagsFilter(
  filters: BaseFilters | ExtendedFilters,
  ctx: FilterContext
): void {
  if (filters.tags !== undefined && filters.tags.length > 0) {
    const tagPlaceholders = filters.tags.map(() => "?").join(", ");
    ctx.conditions.push(`${ctx.tableAlias}.id IN (
      SELECT node_id FROM (
        SELECT node_id, tag FROM tags
        UNION
        SELECT l.node_id, lt.tag FROM lesson_tags lt JOIN lessons l ON lt.lesson_id = l.id
      )
      WHERE tag IN (${tagPlaceholders})
      GROUP BY node_id
      HAVING COUNT(DISTINCT tag) = ?
    )`);
    ctx.params.push(...filters.tags, filters.tags.length);
  }
}

/** Handle topics filter with AND logic */
function handleTopicsFilter(
  filters: BaseFilters | ExtendedFilters,
  ctx: FilterContext
): void {
  if (filters.topics !== undefined && filters.topics.length > 0) {
    const topicPlaceholders = filters.topics.map(() => "?").join(", ");
    ctx.conditions.push(`(
      SELECT COUNT(DISTINCT tp.topic) FROM topics tp
      WHERE tp.node_id = ${ctx.tableAlias}.id AND tp.topic IN (${topicPlaceholders})
    ) = ?`);
    ctx.params.push(...filters.topics, filters.topics.length);
  }
}

/** All filter handlers in order */
const FILTER_HANDLERS: FilterHandler[] = [
  handleProjectFilter,
  handleExactProjectFilter,
  handleTypeFilter,
  handleOutcomeFilter,
  handleDateRangeFilters,
  handleComputerFilter,
  handleBooleanFilters,
  handleSessionFileFilter,
  handleTagsFilter,
  handleTopicsFilter,
];

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
  if (filters === undefined) {
    return { clause: "", params: [] };
  }

  const ctx: FilterContext = {
    conditions: [],
    params: [],
    tableAlias,
  };

  for (const handler of FILTER_HANDLERS) {
    handler(filters, ctx);
  }

  const clause =
    ctx.conditions.length > 0 ? `AND ${ctx.conditions.join(" AND ")}` : "";

  return { clause, params: ctx.params };
}
