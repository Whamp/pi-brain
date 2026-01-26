/**
 * Pattern Repository - Read operations for aggregated patterns
 */

import type Database from "better-sqlite3";

import type {
  AggregatedFailurePattern,
  AggregatedLessonPattern,
  AggregatedModelStats,
  LessonLevel,
} from "../types/index.js";

interface FailurePatternRow {
  id: string;
  pattern: string;
  occurrences: number;
  models: string;
  tools: string;
  example_nodes: string;
  last_seen: string;
  learning_opportunity: string | null;
  updated_at: string;
}

interface ModelStatsRow {
  model: string;
  total_tokens: number;
  total_cost: number;
  total_sessions: number;
  quirk_count: number;
  error_count: number;
  last_used: string;
  updated_at: string;
}

interface LessonPatternRow {
  id: string;
  level: string;
  pattern: string;
  occurrences: number;
  tags: string;
  example_nodes: string;
  last_seen: string;
  updated_at: string;
}

// =============================================================================
// Failure Patterns
// =============================================================================

export interface ListFailurePatternsOptions {
  limit?: number;
  offset?: number;
  minOccurrences?: number;
}

export function listFailurePatterns(
  db: Database.Database,
  options: ListFailurePatternsOptions = {}
): AggregatedFailurePattern[] {
  const { limit = 50, offset = 0, minOccurrences = 1 } = options;

  const stmt = db.prepare(`
    SELECT *
    FROM failure_patterns
    WHERE occurrences >= ?
    ORDER BY occurrences DESC, last_seen DESC
    LIMIT ? OFFSET ?
  `);

  const rows = stmt.all(
    minOccurrences,
    limit,
    offset
  ) as unknown as FailurePatternRow[];

  return rows.map((row) => ({
    id: row.id,
    pattern: row.pattern,
    occurrences: row.occurrences,
    models: JSON.parse(row.models || "[]"),
    tools: JSON.parse(row.tools || "[]"),
    exampleNodes: JSON.parse(row.example_nodes || "[]"),
    lastSeen: row.last_seen,
    learningOpportunity: row.learning_opportunity || undefined,
    updatedAt: row.updated_at,
  }));
}

// =============================================================================
// Model Stats
// =============================================================================

export function listModelStats(db: Database.Database): AggregatedModelStats[] {
  const stmt = db.prepare(`
    SELECT *
    FROM model_stats
    ORDER BY last_used DESC
  `);

  const rows = stmt.all() as unknown as ModelStatsRow[];

  return rows.map((row) => ({
    model: row.model,
    totalTokens: row.total_tokens,
    totalCost: row.total_cost,
    totalSessions: row.total_sessions,
    quirkCount: row.quirk_count,
    errorCount: row.error_count,
    lastUsed: row.last_used,
    updatedAt: row.updated_at,
  }));
}

// =============================================================================
// Lesson Patterns
// =============================================================================

export interface ListLessonPatternsOptions {
  limit?: number;
  offset?: number;
  level?: string;
}

export function listLessonPatterns(
  db: Database.Database,
  options: ListLessonPatternsOptions = {}
): AggregatedLessonPattern[] {
  const { limit = 50, offset = 0, level } = options;

  let query = `
    SELECT *
    FROM lesson_patterns
  `;
  const params: unknown[] = [];

  if (level) {
    query += ` WHERE level = ?`;
    params.push(level);
  }

  query += ` ORDER BY occurrences DESC, last_seen DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const stmt = db.prepare(query);
  const rows = stmt.all(...params) as unknown as LessonPatternRow[];

  return rows.map((row) => ({
    id: row.id,
    level: row.level as LessonLevel,
    pattern: row.pattern,
    occurrences: row.occurrences,
    tags: JSON.parse(row.tags || "[]"),
    exampleNodes: JSON.parse(row.example_nodes || "[]"),
    lastSeen: row.last_seen,
    updatedAt: row.updated_at,
  }));
}
