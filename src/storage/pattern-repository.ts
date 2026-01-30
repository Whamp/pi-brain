/**
 * Pattern Repository - Read operations for aggregated patterns
 */

import type Database from "better-sqlite3";

import type {
  AggregatedFailurePattern,
  AggregatedInsight,
  AggregatedLessonPattern,
  AggregatedModelStats,
  InsightSeverity,
  InsightType,
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

interface InsightRow {
  id: string;
  type: string;
  model: string | null;
  tool: string | null;
  pattern: string;
  frequency: number;
  confidence: number;
  severity: string;
  workaround: string | null;
  examples: string;
  first_seen: string;
  last_seen: string;
  prompt_text: string | null;
  prompt_included: number;
  prompt_version: string | null;
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

  // Use single parameterized query with NULL coalescing pattern
  // to avoid string concatenation for query building
  const stmt = db.prepare(`
    SELECT *
    FROM lesson_patterns
    WHERE (? IS NULL OR level = ?)
    ORDER BY occurrences DESC, last_seen DESC
    LIMIT ? OFFSET ?
  `);

  const levelParam = level ?? null;
  const rows = stmt.all(
    levelParam,
    levelParam,
    limit,
    offset
  ) as unknown as LessonPatternRow[];

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

// =============================================================================
// Aggregated Insights (for prompt learning)
// =============================================================================

export interface ListInsightsOptions {
  limit?: number;
  offset?: number;
  type?: InsightType;
  model?: string;
  tool?: string;
  minFrequency?: number;
  minConfidence?: number;
  promptIncluded?: boolean;
}

/**
 * Convert promptIncluded boolean to database integer representation
 */
function toPromptIncludedParam(
  promptIncluded: boolean | undefined
): number | null {
  if (promptIncluded === undefined) {
    return null;
  }
  return promptIncluded ? 1 : 0;
}

export function listInsights(
  db: Database.Database,
  options: ListInsightsOptions = {}
): AggregatedInsight[] {
  const {
    limit = 50,
    offset = 0,
    type,
    model,
    tool,
    minFrequency = 1,
    minConfidence = 0,
    promptIncluded,
  } = options;

  const stmt = db.prepare(`
    SELECT *
    FROM aggregated_insights
    WHERE frequency >= ?
      AND confidence >= ?
      AND (? IS NULL OR type = ?)
      AND (? IS NULL OR model = ?)
      AND (? IS NULL OR tool = ?)
      AND (? IS NULL OR prompt_included = ?)
    ORDER BY frequency DESC, confidence DESC, last_seen DESC
    LIMIT ? OFFSET ?
  `);

  const typeParam = type ?? null;
  const modelParam = model ?? null;
  const toolParam = tool ?? null;
  const promptIncludedParam = toPromptIncludedParam(promptIncluded);

  const rows = stmt.all(
    minFrequency,
    minConfidence,
    typeParam,
    typeParam,
    modelParam,
    modelParam,
    toolParam,
    toolParam,
    promptIncludedParam,
    promptIncludedParam,
    limit,
    offset
  ) as unknown as InsightRow[];

  return rows.map(rowToInsight);
}

export function getInsight(
  db: Database.Database,
  id: string
): AggregatedInsight | null {
  const stmt = db.prepare(`
    SELECT * FROM aggregated_insights WHERE id = ?
  `);

  const row = stmt.get(id) as InsightRow | undefined;
  if (!row) {
    return null;
  }

  return rowToInsight(row);
}

export function getInsightsByModel(
  db: Database.Database,
  model: string,
  options: { minConfidence?: number; promptIncludedOnly?: boolean } = {}
): AggregatedInsight[] {
  const { minConfidence = 0.5, promptIncludedOnly = false } = options;

  // Use parameterized query to avoid string concatenation
  const stmt = db.prepare(`
    SELECT *
    FROM aggregated_insights
    WHERE model = ?
      AND confidence >= ?
      AND (? = 0 OR prompt_included = 1)
    ORDER BY frequency DESC, confidence DESC
  `);

  const rows = stmt.all(
    model,
    minConfidence,
    promptIncludedOnly ? 1 : 0
  ) as unknown as InsightRow[];

  return rows.map(rowToInsight);
}

export function countInsights(
  db: Database.Database,
  options: { type?: InsightType; model?: string; promptIncluded?: boolean } = {}
): number {
  const { type, model, promptIncluded } = options;

  const stmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM aggregated_insights
    WHERE (? IS NULL OR type = ?)
      AND (? IS NULL OR model = ?)
      AND (? IS NULL OR prompt_included = ?)
  `);

  const typeParam = type ?? null;
  const modelParam = model ?? null;
  const promptIncludedParam = toPromptIncludedParam(promptIncluded);

  const result = stmt.get(
    typeParam,
    typeParam,
    modelParam,
    modelParam,
    promptIncludedParam,
    promptIncludedParam
  ) as { count: number };

  return result.count;
}

export function updateInsightPrompt(
  db: Database.Database,
  id: string,
  promptText: string,
  promptIncluded: boolean,
  promptVersion?: string
): void {
  const stmt = db.prepare(`
    UPDATE aggregated_insights
    SET prompt_text = ?,
        prompt_included = ?,
        prompt_version = ?,
        updated_at = datetime('now')
    WHERE id = ?
  `);

  stmt.run(promptText, promptIncluded ? 1 : 0, promptVersion ?? null, id);
}

function rowToInsight(row: InsightRow): AggregatedInsight {
  return {
    id: row.id,
    type: row.type as InsightType,
    model: row.model ?? undefined,
    tool: row.tool ?? undefined,
    pattern: row.pattern,
    frequency: row.frequency,
    confidence: row.confidence,
    severity: row.severity as InsightSeverity,
    workaround: row.workaround ?? undefined,
    examples: JSON.parse(row.examples || "[]"),
    firstSeen: row.first_seen,
    lastSeen: row.last_seen,
    promptText: row.prompt_text ?? undefined,
    promptIncluded: row.prompt_included === 1,
    promptVersion: row.prompt_version ?? undefined,
    updatedAt: row.updated_at,
  };
}
