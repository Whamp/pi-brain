/**
 * Tool Error Repository - Tool error query operations
 *
 * Provides functionality for querying tool errors observed during sessions.
 *
 * Based on specs/storage.md.
 */

import type Database from "better-sqlite3";

import { normalizePagination } from "./filter-utils.js";

// =============================================================================
// Types
// =============================================================================

/** Filters for querying tool errors */
export interface ListToolErrorsFilters {
  /** Filter by tool name (e.g., "edit") */
  tool?: string;
  /** Filter by exact model */
  model?: string;
  /** Filter by error type */
  errorType?: string;
  /** Filter by source project (partial match via nodes table) */
  project?: string;
}

/** Pagination options for tool errors */
export interface ListToolErrorsOptions {
  /** Max results to return (default: 50, max: 500) */
  limit?: number;
  /** Offset for pagination (default: 0) */
  offset?: number;
}

/** A tool error result with metadata */
export interface ToolErrorResult {
  id: string;
  nodeId: string;
  tool: string;
  errorType: string;
  context: string | null;
  model: string | null;
  sourceProject: string | null;
  createdAt: string;
}

/** Result from listToolErrors query */
export interface ListToolErrorsResult {
  /** Matched tool errors with metadata */
  errors: ToolErrorResult[];
  /** Total count of errors matching filters (before pagination) */
  total: number;
  /** Limit used for the query */
  limit: number;
  /** Offset used for the query */
  offset: number;
}

/** Stats by tool from getToolErrorStats */
export interface ToolStats {
  tool: string;
  count: number;
  models: string[];
}

/** Stats by model from getToolErrorStats */
export interface ModelErrorStats {
  model: string;
  count: number;
}

/** Trend data from getToolErrorStats */
export interface ToolErrorTrends {
  thisWeek: number;
  lastWeek: number;
  change: number;
}

/** Result from getToolErrorStats */
export interface ToolErrorStatsResult {
  byTool: ToolStats[];
  byModel: ModelErrorStats[];
  trends: ToolErrorTrends;
}

/** Aggregated tool error result */
export interface AggregatedToolError {
  tool: string;
  errorType: string;
  count: number;
  recentNodes: string[];
  model?: string;
  models?: string[];
}

/** A single tool error for a node */
export interface NodeToolError {
  id: string;
  tool: string;
  error_type: string;
  context: string | null;
  model: string | null;
}

// =============================================================================
// Internal Helpers
// =============================================================================

interface WhereClauseResult {
  clause: string;
  params: (string | number)[];
}

/**
 * Build WHERE clause for tool error queries using a lookup table
 */
function buildToolErrorWhereClause(
  filters: ListToolErrorsFilters,
  includeProject = false
): WhereClauseResult {
  const conditions: string[] = ["1=1"];
  const params: (string | number)[] = [];

  // Lookup table: filter key -> { column, transform? }
  const filterDefs: {
    key: keyof ListToolErrorsFilters;
    column: string;
    transform?: (v: string) => string;
  }[] = [
    { key: "tool", column: "te.tool" },
    { key: "model", column: "te.model" },
    { key: "errorType", column: "te.error_type" },
  ];

  for (const def of filterDefs) {
    const value = filters[def.key];
    if (value !== undefined) {
      conditions.push(`${def.column} = ?`);
      params.push(def.transform ? def.transform(value) : value);
    }
  }

  // Project filter needs LIKE and nodes table join
  if (includeProject && filters.project !== undefined) {
    conditions.push("n.project LIKE ?");
    params.push(`%${filters.project}%`);
  }

  return { clause: conditions.join(" AND "), params };
}

/**
 * Parse comma-separated node IDs to unique array, limited to N items
 */
function parseRecentNodes(nodeIdsList: string | null, limit = 5): string[] {
  if (!nodeIdsList) {
    return [];
  }
  return [...new Set(nodeIdsList.split(","))].slice(0, limit);
}

/**
 * Parse comma-separated string to array
 */
function parseCommaSeparated(list: string | null): string[] {
  return list ? list.split(",") : [];
}

// =============================================================================
// Query Functions
// =============================================================================

/**
 * List individual tool errors with filters and pagination.
 */
export function listToolErrors(
  db: Database.Database,
  filters: ListToolErrorsFilters = {},
  options: ListToolErrorsOptions = {}
): ListToolErrorsResult {
  const { limit, offset } = normalizePagination(options.limit, options.offset);

  const { clause: whereClause, params } = buildToolErrorWhereClause(
    filters,
    true
  );

  // Count total
  const countStmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM tool_errors te
    JOIN nodes n ON te.node_id = n.id
    WHERE ${whereClause}
  `);
  const total = (countStmt.get(...params) as { count: number }).count;

  // Fetch errors with project info
  const dataStmt = db.prepare(`
    SELECT 
      te.id, te.node_id as nodeId, te.tool, te.error_type as errorType, te.context, te.model, te.created_at as createdAt,
      n.project as sourceProject
    FROM tool_errors te
    JOIN nodes n ON te.node_id = n.id
    WHERE ${whereClause}
    ORDER BY te.created_at DESC, te.id DESC
    LIMIT ? OFFSET ?
  `);

  const errors = dataStmt.all(...params, limit, offset) as ToolErrorResult[];

  return { errors, total, limit, offset };
}

/**
 * Get aggregated tool errors - grouped by tool and error type (and optionally model).
 * Per specs/api.md GET /api/v1/tool-errors.
 */
export function getAggregatedToolErrors(
  db: Database.Database,
  filters: ListToolErrorsFilters = {},
  options: { limit?: number; offset?: number; groupByModel?: boolean } = {}
): AggregatedToolError[] {
  const { limit, offset } = normalizePagination(options.limit, options.offset);
  const groupByModel = options.groupByModel ?? false;

  const { clause: whereClause, params } = buildToolErrorWhereClause(filters);

  const groupBy = groupByModel ? "model, tool, errorType" : "tool, errorType";
  const selectModel = groupByModel
    ? "model,"
    : "GROUP_CONCAT(DISTINCT model) as modelsList,";

  const stmt = db.prepare(`
    SELECT 
      ${selectModel}
      tool, 
      error_type as errorType, 
      COUNT(*) as count,
      GROUP_CONCAT(node_id) as nodeIdsList
    FROM tool_errors te
    WHERE ${whereClause}
    GROUP BY ${groupBy}
    ORDER BY count DESC, ${groupBy}
    LIMIT ? OFFSET ?
  `);

  const rows = stmt.all(...params, limit, offset) as {
    model?: string;
    modelsList?: string;
    tool: string;
    errorType: string;
    count: number;
    nodeIdsList: string;
  }[];

  return rows.map((row) => {
    const result: AggregatedToolError = {
      tool: row.tool,
      errorType: row.errorType,
      count: row.count,
      recentNodes: parseRecentNodes(row.nodeIdsList),
    };

    if (groupByModel) {
      result.model = row.model;
    } else {
      result.models = parseCommaSeparated(row.modelsList ?? null);
    }

    return result;
  });
}

/**
 * Get tool error statistics for the dashboard.
 * Per specs/api.md GET /api/v1/stats/tool-errors.
 */
export function getToolErrorStats(db: Database.Database): ToolErrorStatsResult {
  // Stats by tool
  const byToolStmt = db.prepare(`
    SELECT 
      tool, 
      COUNT(*) as count,
      GROUP_CONCAT(DISTINCT model) as modelsList
    FROM tool_errors
    GROUP BY tool
    ORDER BY count DESC
  `);
  const toolRows = byToolStmt.all() as {
    tool: string;
    count: number;
    modelsList: string | null;
  }[];
  const byTool = toolRows.map((r) => ({
    tool: r.tool,
    count: r.count,
    models: parseCommaSeparated(r.modelsList),
  }));

  // Stats by model
  const byModelStmt = db.prepare(`
    SELECT 
      model, 
      COUNT(*) as count
    FROM tool_errors
    WHERE model IS NOT NULL
    GROUP BY model
    ORDER BY count DESC
  `);
  const byModel = byModelStmt.all() as { model: string; count: number }[];

  // Trends
  const thisWeekStmt = db.prepare(`
    SELECT COUNT(*) as count FROM tool_errors 
    WHERE created_at >= datetime('now', '-7 days')
  `);
  const lastWeekStmt = db.prepare(`
    SELECT COUNT(*) as count FROM tool_errors 
    WHERE created_at >= datetime('now', '-14 days') 
      AND created_at < datetime('now', '-7 days')
  `);

  const thisWeek = (thisWeekStmt.get() as { count: number }).count;
  const lastWeek = (lastWeekStmt.get() as { count: number }).count;
  const change = thisWeek - lastWeek;

  return {
    byTool,
    byModel,
    trends: { thisWeek, lastWeek, change },
  };
}

/**
 * Get tool errors for a node
 */
export function getNodeToolErrors(
  db: Database.Database,
  nodeId: string
): NodeToolError[] {
  const stmt = db.prepare(`
    SELECT id, tool, error_type, context, model
    FROM tool_errors
    WHERE node_id = ?
    ORDER BY created_at
  `);
  return stmt.all(nodeId) as NodeToolError[];
}
