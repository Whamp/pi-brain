/**
 * Quirk Repository - Model quirk query operations
 *
 * Provides functionality for querying model quirks observed during sessions.
 *
 * Based on specs/storage.md.
 */

import type Database from "better-sqlite3";

// =============================================================================
// Types
// =============================================================================

/** Frequency values for model quirks */
export type QuirkFrequency = "once" | "sometimes" | "often" | "always";

/** Severity values for model quirks (matches spec) */
export type QuirkSeverity = "low" | "medium" | "high";

/** Filters for querying model quirks */
export interface ListQuirksFilters {
  /** Filter by exact model (e.g., "zai/glm-4.7") */
  model?: string;
  /** Filter by minimum frequency (inclusive ranking: once < sometimes < often < always) */
  frequency?: QuirkFrequency;
  /** Filter by severity (if present in observations) */
  severity?: QuirkSeverity;
  /** Filter by source project (partial match via nodes table) */
  project?: string;
}

/** Pagination options for quirks */
export interface ListQuirksOptions {
  /** Max results to return (default: 50, max: 500) */
  limit?: number;
  /** Offset for pagination (default: 0) */
  offset?: number;
}

/** A quirk result with metadata */
export interface QuirkResult {
  id: string;
  nodeId: string;
  model: string;
  observation: string;
  frequency: string | null;
  workaround: string | null;
  sourceProject: string | null;
  createdAt: string;
}

/** Result from listQuirks query */
export interface ListQuirksResult {
  /** Matched quirks with metadata */
  quirks: QuirkResult[];
  /** Total count of quirks matching filters (before pagination) */
  total: number;
  /** Limit used for the query */
  limit: number;
  /** Offset used for the query */
  offset: number;
}

/** Stats for a single model */
export interface ModelQuirkStats {
  /** Total number of quirks observed for this model */
  count: number;
  /** Most recent quirks */
  recent: {
    id: string;
    observation: string;
    frequency: string | null;
    createdAt: string;
  }[];
}

/** Result from getQuirksByModel */
export type QuirksByModelResult = Record<string, ModelQuirkStats>;

// =============================================================================
// Internal Constants
// =============================================================================

/** Frequency ranking for filtering (higher = more frequent) */
const FREQUENCY_RANK: Record<string, number> = {
  once: 1,
  sometimes: 2,
  often: 3,
  always: 4,
};

// =============================================================================
// Query Functions
// =============================================================================

/**
 * List model quirks with filters and pagination.
 *
 * Supports filtering by:
 * - model (exact match)
 * - frequency (minimum frequency ranking)
 * - project (partial match via nodes table)
 *
 * Per specs/api.md GET /api/v1/quirks endpoint.
 */
export function listQuirks(
  db: Database.Database,
  filters: ListQuirksFilters = {},
  options: ListQuirksOptions = {}
): ListQuirksResult {
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 500);
  const offset = Math.max(options.offset ?? 0, 0);

  // Build WHERE clause
  const conditions: string[] = ["1=1"];
  const params: (string | number)[] = [];

  if (filters.model) {
    conditions.push("q.model = ?");
    params.push(filters.model);
  }

  if (filters.project) {
    conditions.push("n.project LIKE ?");
    params.push(`%${filters.project}%`);
  }

  // Frequency filtering: match specified frequency OR higher
  if (filters.frequency) {
    const minRank = FREQUENCY_RANK[filters.frequency] ?? 1;
    // Filter to frequencies with rank >= minRank
    const validFrequencies = Object.entries(FREQUENCY_RANK)
      .filter(([, rank]) => rank >= minRank)
      .map(([freq]) => freq);
    const placeholders = validFrequencies.map(() => "?").join(", ");
    conditions.push(`q.frequency IN (${placeholders})`);
    params.push(...validFrequencies);
  }

  const whereClause = conditions.join(" AND ");

  // Count total
  const countStmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM model_quirks q
    JOIN nodes n ON q.node_id = n.id
    WHERE ${whereClause}
  `);
  const total = (countStmt.get(...params) as { count: number }).count;

  // Fetch quirks with project info
  const dataStmt = db.prepare(`
    SELECT 
      q.id, q.node_id as nodeId, q.model, q.observation, q.frequency, q.workaround, q.created_at as createdAt,
      n.project as sourceProject
    FROM model_quirks q
    JOIN nodes n ON q.node_id = n.id
    WHERE ${whereClause}
    ORDER BY q.created_at DESC, q.id DESC
    LIMIT ? OFFSET ?
  `);

  const quirks = dataStmt.all(...params, limit, offset) as QuirkResult[];

  return { quirks, total, limit, offset };
}

/**
 * Get aggregated quirk stats by model.
 * Returns counts and most recent quirks for each model that has quirks.
 *
 * Per specs/api.md GET /api/v1/stats/models endpoint (quirkCount field).
 */
export function getQuirksByModel(
  db: Database.Database,
  recentLimit = 5
): QuirksByModelResult {
  // Get all unique models that have quirks
  const modelsStmt = db.prepare(`
    SELECT DISTINCT model FROM model_quirks ORDER BY model
  `);
  const models = (modelsStmt.all() as { model: string }[]).map((r) => r.model);

  const result: QuirksByModelResult = {};

  for (const model of models) {
    // Get count
    const countStmt = db.prepare(
      "SELECT COUNT(*) as count FROM model_quirks WHERE model = ?"
    );
    const { count } = countStmt.get(model) as { count: number };

    // Get recent quirks
    const recentStmt = db.prepare(`
      SELECT id, observation, frequency, created_at as createdAt
      FROM model_quirks
      WHERE model = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `);
    const recent = recentStmt.all(model, recentLimit) as {
      id: string;
      observation: string;
      frequency: string | null;
      createdAt: string;
    }[];

    result[model] = { count, recent };
  }

  return result;
}

/**
 * Count quirks matching filters (without fetching data)
 */
export function countQuirks(
  db: Database.Database,
  filters: ListQuirksFilters = {}
): number {
  const result = listQuirks(db, filters, { limit: 1 });
  return result.total;
}

/**
 * Get all unique models that have quirks recorded
 */
export function getAllQuirkModels(db: Database.Database): string[] {
  const stmt = db.prepare(`
    SELECT DISTINCT model FROM model_quirks
    ORDER BY model
  `);
  const rows = stmt.all() as { model: string }[];
  return rows.map((r) => r.model);
}

/**
 * Get aggregated quirks - similar observations grouped together.
 * Useful for the dashboard "Model Quirks" panel.
 *
 * Per specs/storage.md "Find model quirks by frequency" query.
 */
export function getAggregatedQuirks(
  db: Database.Database,
  options: { minOccurrences?: number; limit?: number } = {}
): {
  model: string;
  observation: string;
  occurrences: number;
  frequency: string | null;
  nodeIds: string[];
}[] {
  const minOccurrences = options.minOccurrences ?? 1;
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 500);

  const stmt = db.prepare(`
    SELECT 
      model, 
      observation, 
      COUNT(*) as occurrences,
      MAX(frequency) as frequency,
      GROUP_CONCAT(node_id, ',') as nodeIdList
    FROM model_quirks
    GROUP BY model, observation
    HAVING COUNT(*) >= ?
    ORDER BY occurrences DESC, model, observation
    LIMIT ?
  `);

  const rows = stmt.all(minOccurrences, limit) as {
    model: string;
    observation: string;
    occurrences: number;
    frequency: string | null;
    nodeIdList: string;
  }[];

  return rows.map((row) => ({
    model: row.model,
    observation: row.observation,
    occurrences: row.occurrences,
    frequency: row.frequency,
    nodeIds: row.nodeIdList.split(","),
  }));
}

/**
 * Get model quirks for a node
 */
export function getNodeQuirks(
  db: Database.Database,
  nodeId: string
): {
  id: string;
  model: string;
  observation: string;
  frequency: string | null;
  workaround: string | null;
}[] {
  const stmt = db.prepare(`
    SELECT id, model, observation, frequency, workaround
    FROM model_quirks
    WHERE node_id = ?
    ORDER BY created_at
  `);
  return stmt.all(nodeId) as {
    id: string;
    model: string;
    observation: string;
    frequency: string | null;
    workaround: string | null;
  }[];
}
