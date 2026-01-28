/**
 * Tool Error Repository - Tool error query operations
 *
 * Provides functionality for querying tool errors observed during sessions.
 *
 * Based on specs/storage.md.
 */

import type Database from "better-sqlite3";

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
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 500);
  const offset = Math.max(options.offset ?? 0, 0);

  // Build WHERE clause
  const conditions: string[] = ["1=1"];
  const params: (string | number)[] = [];

  if (filters.tool) {
    conditions.push("te.tool = ?");
    params.push(filters.tool);
  }

  if (filters.model) {
    conditions.push("te.model = ?");
    params.push(filters.model);
  }

  if (filters.errorType) {
    conditions.push("te.error_type = ?");
    params.push(filters.errorType);
  }

  if (filters.project) {
    conditions.push("n.project LIKE ?");
    params.push(`%${filters.project}%`);
  }

  const whereClause = conditions.join(" AND ");

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
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 500);
  const offset = Math.max(options.offset ?? 0, 0);
  const groupByModel = options.groupByModel ?? false;

  // Build WHERE clause
  const conditions: string[] = ["1=1"];
  const params: (string | number)[] = [];

  if (filters.tool) {
    conditions.push("te.tool = ?");
    params.push(filters.tool);
  }

  if (filters.model) {
    conditions.push("te.model = ?");
    params.push(filters.model);
  }

  if (filters.errorType) {
    conditions.push("te.error_type = ?");
    params.push(filters.errorType);
  }

  const whereClause = conditions.join(" AND ");

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
      recentNodes: row.nodeIdsList
        ? [...new Set(row.nodeIdsList.split(","))].slice(0, 5)
        : [],
    };

    if (groupByModel) {
      result.model = row.model;
    } else {
      result.models = row.modelsList ? row.modelsList.split(",") : [];
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
    models: r.modelsList ? r.modelsList.split(",") : [],
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
 * Count tool errors matching filters.
 */
export function countToolErrors(
  db: Database.Database,
  filters: ListToolErrorsFilters = {}
): number {
  const result = listToolErrors(db, filters, { limit: 1 });
  return result.total;
}

/**
 * Get all unique tools that have errors recorded
 */
export function getAllToolsWithErrors(db: Database.Database): string[] {
  const stmt = db.prepare(`
    SELECT DISTINCT tool FROM tool_errors
    ORDER BY tool
  `);
  const rows = stmt.all() as { tool: string }[];
  return rows.map((r) => r.tool);
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
