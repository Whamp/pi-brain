/**
 * Prompt Effectiveness Measurement
 *
 * Measures whether prompt additions actually improve model behavior by comparing
 * occurrence rates before and after the prompt was added.
 *
 * See specs/prompt-learning.md for full specification.
 */

import type Database from "better-sqlite3";

import { randomBytes } from "node:crypto";

import type {
  AggregatedInsight,
  DateRange,
  EffectivenessResult,
  InsightType,
  PromptEffectiveness,
} from "../types/index.js";

import { readNodeFromPath } from "../storage/node-storage.js";
import {
  getInsight,
  updateInsightPrompt,
} from "../storage/pattern-repository.js";

// =============================================================================
// Types
// =============================================================================

export interface MeasureEffectivenessOptions {
  /**
   * Minimum sessions required for statistical significance
   * @default 10
   */
  minSessions?: number;
}

interface NodeDataFileRow {
  id: string;
  data_file: string;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_MIN_SESSIONS = 10;

// Chi-square critical value for p < 0.05 with 1 degree of freedom
const CHI_SQUARE_CRITICAL = 3.841;

// SQL LIKE escape character
const LIKE_ESCAPE_CHAR = "\\";

// Maximum nodes to read from disk for prompting pattern counting
// This bounds file I/O to prevent performance issues with large date ranges
const MAX_PROMPTING_PATTERN_NODES = 1000;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generate a random ID for effectiveness records
 */
function generateId(): string {
  return randomBytes(8).toString("hex");
}

/**
 * Normalize pattern text for matching (same as insight-aggregation.ts)
 */
function normalizePattern(text: string): string {
  return text.toLowerCase().replaceAll(/\s+/g, " ").trim();
}

/**
 * Escape SQL LIKE special characters (%, _) to prevent pattern interpretation
 */
function escapeLikePattern(pattern: string): string {
  return pattern
    .replaceAll(LIKE_ESCAPE_CHAR, LIKE_ESCAPE_CHAR + LIKE_ESCAPE_CHAR) // Escape the escape character itself
    .replaceAll("%", LIKE_ESCAPE_CHAR + "%")
    .replaceAll("_", LIKE_ESCAPE_CHAR + "_");
}

/**
 * Count unique sessions within a date range
 */
export function countSessions(
  db: Database.Database,
  dateRange: DateRange
): number {
  const stmt = db.prepare(`
    SELECT COUNT(DISTINCT session_file) as count
    FROM nodes
    WHERE timestamp >= ? AND timestamp <= ?
  `);

  const result = stmt.get(dateRange.start, dateRange.end) as { count: number };
  return result.count;
}

/**
 * Count nodes analyzed within a date range
 */
export function countNodes(
  db: Database.Database,
  dateRange: DateRange
): number {
  const stmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM nodes
    WHERE timestamp >= ? AND timestamp <= ?
  `);

  const result = stmt.get(dateRange.start, dateRange.end) as { count: number };
  return result.count;
}

/**
 * Count occurrences of a quirk pattern within a date range
 */
function countQuirkOccurrences(
  db: Database.Database,
  insight: AggregatedInsight,
  dateRange: DateRange
): number {
  const normalizedPattern = normalizePattern(insight.pattern);
  const escapedPattern = escapeLikePattern(normalizedPattern);

  // Join with nodes to filter by timestamp
  const stmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM model_quirks q
    JOIN nodes n ON q.node_id = n.id
    WHERE n.timestamp >= ? AND n.timestamp <= ?
      AND (? IS NULL OR q.model = ?)
      AND LOWER(REPLACE(REPLACE(q.observation, '  ', ' '), char(10), ' ')) LIKE ? ESCAPE '${LIKE_ESCAPE_CHAR}'
  `);

  const modelParam = insight.model ?? null;
  // Use LIKE for fuzzy matching of normalized patterns (escaped for special chars)
  const patternParam = `%${escapedPattern}%`;

  const result = stmt.get(
    dateRange.start,
    dateRange.end,
    modelParam,
    modelParam,
    patternParam
  ) as { count: number };

  return result.count;
}

/**
 * Count occurrences of a tool error pattern within a date range
 */
function countToolErrorOccurrences(
  db: Database.Database,
  insight: AggregatedInsight,
  dateRange: DateRange
): number {
  // Tool error patterns are formatted as "error_type in tool"
  const stmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM tool_errors te
    JOIN nodes n ON te.node_id = n.id
    WHERE n.timestamp >= ? AND n.timestamp <= ?
      AND (? IS NULL OR te.tool = ?)
      AND (? IS NULL OR te.model = ?)
  `);

  const toolParam = insight.tool ?? null;
  const modelParam = insight.model ?? null;

  const result = stmt.get(
    dateRange.start,
    dateRange.end,
    toolParam,
    toolParam,
    modelParam,
    modelParam
  ) as { count: number };

  return result.count;
}

/**
 * Count occurrences of a lesson pattern within a date range
 */
function countLessonOccurrences(
  db: Database.Database,
  insight: AggregatedInsight,
  dateRange: DateRange
): number {
  const normalizedPattern = normalizePattern(insight.pattern);
  const escapedPattern = escapeLikePattern(normalizedPattern);

  const stmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM lessons l
    JOIN nodes n ON l.node_id = n.id
    WHERE n.timestamp >= ? AND n.timestamp <= ?
      AND l.level IN ('model', 'tool', 'user')
      AND LOWER(REPLACE(REPLACE(l.summary, '  ', ' '), char(10), ' ')) LIKE ? ESCAPE '${LIKE_ESCAPE_CHAR}'
  `);

  const patternParam = `%${escapedPattern}%`;

  const result = stmt.get(dateRange.start, dateRange.end, patternParam) as {
    count: number;
  };

  return result.count;
}

/**
 * Count occurrences of win/failure patterns within a date range.
 * These are stored in node JSON files, not in the database directly.
 *
 * Note: This function limits the number of files read to MAX_PROMPTING_PATTERN_NODES
 * to prevent unbounded I/O. For very large date ranges, results may be approximate.
 */
function countPromptingPatternOccurrences(
  db: Database.Database,
  insight: AggregatedInsight,
  dateRange: DateRange
): number {
  const normalizedPattern = normalizePattern(insight.pattern);
  const isWin = insight.type === "win";

  // Get nodes in the date range, limited to prevent unbounded file I/O
  const stmt = db.prepare(`
    SELECT id, data_file
    FROM nodes
    WHERE timestamp >= ? AND timestamp <= ?
      AND data_file IS NOT NULL
    ORDER BY timestamp DESC
    LIMIT ?
  `);

  const rows = stmt.all(
    dateRange.start,
    dateRange.end,
    MAX_PROMPTING_PATTERN_NODES
  ) as unknown as NodeDataFileRow[];

  let count = 0;

  for (const row of rows) {
    try {
      const node = readNodeFromPath(row.data_file);

      // Check model match if insight is model-specific
      if (insight.model) {
        const nodeModel = node.observations.modelsUsed[0]?.model;
        if (nodeModel !== insight.model) {
          continue;
        }
      }

      // Count matching patterns
      const patterns = isWin
        ? node.observations.promptingWins
        : node.observations.promptingFailures;

      for (const pattern of patterns) {
        if (normalizePattern(pattern).includes(normalizedPattern)) {
          count++;
        }
      }
    } catch {
      // Skip nodes with missing/invalid JSON files
      continue;
    }
  }

  return count;
}

/**
 * Count occurrences of an insight pattern within a date range
 */
export function countOccurrences(
  db: Database.Database,
  insight: AggregatedInsight,
  dateRange: DateRange
): number {
  switch (insight.type) {
    case "quirk": {
      return countQuirkOccurrences(db, insight, dateRange);
    }
    case "tool_error": {
      return countToolErrorOccurrences(db, insight, dateRange);
    }
    case "lesson": {
      return countLessonOccurrences(db, insight, dateRange);
    }
    case "win":
    case "failure": {
      return countPromptingPatternOccurrences(db, insight, dateRange);
    }
    default: {
      // TypeScript exhaustiveness check
      const _exhaustive: never = insight.type;
      throw new Error(`Unknown insight type: ${_exhaustive}`);
    }
  }
}

/**
 * Calculate average severity for occurrences within a date range.
 * Returns a value between 0.0 and 1.0.
 */
export function calculateAverageSeverity(insight: AggregatedInsight): number {
  // Convert severity to numeric value
  switch (insight.severity) {
    case "high": {
      return 0.9;
    }
    case "medium": {
      return 0.5;
    }
    case "low": {
      return 0.2;
    }
    default: {
      return 0.5;
    }
  }
}

/**
 * Simplified chi-square test for statistical significance.
 *
 * Tests whether the difference between before and after rates is
 * statistically significant at p < 0.05.
 */
export function isStatisticallySignificant(
  beforeCount: number,
  afterCount: number,
  beforeSessions: number,
  afterSessions: number,
  minSessions: number = DEFAULT_MIN_SESSIONS
): boolean {
  // Not enough data for significance
  if (beforeSessions < minSessions || afterSessions < minSessions) {
    return false;
  }

  // Calculate expected values under null hypothesis
  const total = beforeCount + afterCount;
  const totalSessions = beforeSessions + afterSessions;

  // If no occurrences at all, can't determine significance
  if (total === 0) {
    return false;
  }

  // Expected counts based on session proportions
  const expectedBefore = total * (beforeSessions / totalSessions);
  const expectedAfter = total * (afterSessions / totalSessions);

  // Avoid division by zero
  if (expectedBefore === 0 || expectedAfter === 0) {
    return false;
  }

  // Chi-square statistic
  const chiSquare =
    (beforeCount - expectedBefore) ** 2 / expectedBefore +
    (afterCount - expectedAfter) ** 2 / expectedAfter;

  // Compare against critical value for p < 0.05
  return chiSquare >= CHI_SQUARE_CRITICAL;
}

// =============================================================================
// Main Functions
// =============================================================================

/**
 * Measure the effectiveness of a prompt addition for a specific insight.
 *
 * Compares occurrence rates before and after the prompt was added to
 * determine if it actually helped reduce the targeted behavior.
 */
export function measureEffectiveness(
  db: Database.Database,
  insightId: string,
  beforePeriod: DateRange,
  afterPeriod: DateRange,
  options: MeasureEffectivenessOptions = {}
): EffectivenessResult {
  const { minSessions = DEFAULT_MIN_SESSIONS } = options;

  // Get the insight
  const insight = getInsight(db, insightId);
  if (!insight) {
    throw new Error(`Insight not found: ${insightId}`);
  }

  // Count occurrences before prompt change
  const beforeCount = countOccurrences(db, insight, beforePeriod);
  const beforeSessions = countSessions(db, beforePeriod);
  const beforeRate = beforeSessions > 0 ? beforeCount / beforeSessions : 0;

  // Count occurrences after prompt change
  const afterCount = countOccurrences(db, insight, afterPeriod);
  const afterSessions = countSessions(db, afterPeriod);
  const afterRate = afterSessions > 0 ? afterCount / afterSessions : 0;

  // Calculate improvement (positive = fewer occurrences = better)
  // Only calculate improvement if we have data in both periods
  const improvement =
    beforeRate > 0 && afterSessions > 0
      ? ((beforeRate - afterRate) / beforeRate) * 100
      : 0;

  // Statistical significance test
  const significant = isStatisticallySignificant(
    beforeCount,
    afterCount,
    beforeSessions,
    afterSessions,
    minSessions
  );

  return {
    insightId,
    beforeRate,
    afterRate,
    beforeCount,
    afterCount,
    improvement,
    significant,
    beforeSessions,
    afterSessions,
  };
}

/**
 * Measure effectiveness and store the result in the database
 */
export function measureAndStoreEffectiveness(
  db: Database.Database,
  insightId: string,
  beforePeriod: DateRange,
  afterPeriod: DateRange,
  promptVersion: string,
  options: MeasureEffectivenessOptions = {}
): PromptEffectiveness {
  const insight = getInsight(db, insightId);
  if (!insight) {
    throw new Error(`Insight not found: ${insightId}`);
  }

  const result = measureEffectiveness(
    db,
    insightId,
    beforePeriod,
    afterPeriod,
    options
  );

  // Use counts directly from measureEffectiveness (avoids floating-point precision loss)
  const { beforeSessions, afterSessions, beforeCount, afterCount } = result;

  // Calculate average severities
  const beforeSeverity = calculateAverageSeverity(insight);
  const afterSeverity = calculateAverageSeverity(insight);

  const id = generateId();
  const now = new Date().toISOString();

  // Check for existing record
  const existingStmt = db.prepare(`
    SELECT id, created_at FROM prompt_effectiveness 
    WHERE insight_id = ? AND prompt_version = ?
  `);
  const existing = existingStmt.get(insightId, promptVersion) as
    | { id: string; created_at: string }
    | undefined;

  if (existing) {
    // Update existing record
    const updateStmt = db.prepare(`
      UPDATE prompt_effectiveness SET
        before_occurrences = ?,
        before_severity = ?,
        after_occurrences = ?,
        after_severity = ?,
        before_start = ?,
        before_end = ?,
        after_start = ?,
        after_end = ?,
        improvement_pct = ?,
        statistically_significant = ?,
        sessions_before = ?,
        sessions_after = ?,
        measured_at = ?,
        updated_at = ?
      WHERE id = ?
    `);

    updateStmt.run(
      beforeCount,
      beforeSeverity,
      afterCount,
      afterSeverity,
      beforePeriod.start,
      beforePeriod.end,
      afterPeriod.start,
      afterPeriod.end,
      result.improvement,
      result.significant ? 1 : 0,
      beforeSessions,
      afterSessions,
      now,
      now,
      existing.id
    );

    return {
      id: existing.id,
      insightId,
      promptVersion,
      beforeOccurrences: beforeCount,
      beforeSeverity,
      afterOccurrences: afterCount,
      afterSeverity,
      beforeStart: beforePeriod.start,
      beforeEnd: beforePeriod.end,
      afterStart: afterPeriod.start,
      afterEnd: afterPeriod.end,
      improvementPct: result.improvement,
      statisticallySignificant: result.significant,
      sessionsBefore: beforeSessions,
      sessionsAfter: afterSessions,
      measuredAt: now,
      createdAt: existing.created_at, // Preserve original creation timestamp
      updatedAt: now,
    };
  }

  // Insert new record
  const insertStmt = db.prepare(`
    INSERT INTO prompt_effectiveness (
      id, insight_id, prompt_version,
      before_occurrences, before_severity,
      after_occurrences, after_severity,
      before_start, before_end,
      after_start, after_end,
      improvement_pct, statistically_significant,
      sessions_before, sessions_after,
      measured_at, created_at, updated_at
    ) VALUES (
      ?, ?, ?,
      ?, ?,
      ?, ?,
      ?, ?,
      ?, ?,
      ?, ?,
      ?, ?,
      ?, ?, ?
    )
  `);

  insertStmt.run(
    id,
    insightId,
    promptVersion,
    beforeCount,
    beforeSeverity,
    afterCount,
    afterSeverity,
    beforePeriod.start,
    beforePeriod.end,
    afterPeriod.start,
    afterPeriod.end,
    result.improvement,
    result.significant ? 1 : 0,
    beforeSessions,
    afterSessions,
    now,
    now,
    now
  );

  return {
    id,
    insightId,
    promptVersion,
    beforeOccurrences: beforeCount,
    beforeSeverity,
    afterOccurrences: afterCount,
    afterSeverity,
    beforeStart: beforePeriod.start,
    beforeEnd: beforePeriod.end,
    afterStart: afterPeriod.start,
    afterEnd: afterPeriod.end,
    improvementPct: result.improvement,
    statisticallySignificant: result.significant,
    sessionsBefore: beforeSessions,
    sessionsAfter: afterSessions,
    measuredAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Get effectiveness measurements for an insight
 */
export function getEffectivenessHistory(
  db: Database.Database,
  insightId: string
): PromptEffectiveness[] {
  const stmt = db.prepare(`
    SELECT *
    FROM prompt_effectiveness
    WHERE insight_id = ?
    ORDER BY measured_at DESC
  `);

  const rows = stmt.all(insightId) as unknown as EffectivenessRow[];

  return rows.map(rowToEffectiveness);
}

/**
 * Get the latest effectiveness measurement for an insight
 */
export function getLatestEffectiveness(
  db: Database.Database,
  insightId: string
): PromptEffectiveness | null {
  const stmt = db.prepare(`
    SELECT *
    FROM prompt_effectiveness
    WHERE insight_id = ?
    ORDER BY measured_at DESC
    LIMIT 1
  `);

  const row = stmt.get(insightId) as EffectivenessRow | undefined;
  if (!row) {
    return null;
  }

  return rowToEffectiveness(row);
}

/**
 * Get the latest effectiveness measurements for multiple insights in a single query.
 * Returns a map of insightId -> PromptEffectiveness.
 */
export function getLatestEffectivenessBatch(
  db: Database.Database,
  insightIds: string[]
): Map<string, PromptEffectiveness> {
  if (insightIds.length === 0) {
    return new Map();
  }

  // Use a subquery to get only the latest measurement per insight
  const placeholders = insightIds.map(() => "?").join(", ");
  const stmt = db.prepare(`
    SELECT pe.*
    FROM prompt_effectiveness pe
    INNER JOIN (
      SELECT insight_id, MAX(measured_at) as max_measured_at
      FROM prompt_effectiveness
      WHERE insight_id IN (${placeholders})
      GROUP BY insight_id
    ) latest ON pe.insight_id = latest.insight_id 
             AND pe.measured_at = latest.max_measured_at
  `);

  const rows = stmt.all(...insightIds) as unknown as EffectivenessRow[];

  const result = new Map<string, PromptEffectiveness>();
  for (const row of rows) {
    result.set(row.insight_id, rowToEffectiveness(row));
  }

  return result;
}

/**
 * Get all insights that need effectiveness measurement.
 * Returns insights that are included in prompts but haven't been measured recently.
 */
export function getInsightsNeedingMeasurement(
  db: Database.Database,
  measureAfterDays = 7
): AggregatedInsight[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - measureAfterDays);
  const cutoffStr = cutoff.toISOString();

  // Use subquery to get most recent measurement per insight to avoid duplicates
  const stmt = db.prepare(`
    SELECT ai.*
    FROM aggregated_insights ai
    LEFT JOIN (
      SELECT insight_id, MAX(measured_at) as latest_measured_at
      FROM prompt_effectiveness
      GROUP BY insight_id
    ) pe ON ai.id = pe.insight_id
    WHERE ai.prompt_included = 1
      AND (pe.latest_measured_at IS NULL OR pe.latest_measured_at < ?)
    ORDER BY ai.frequency DESC
    LIMIT 50
  `);

  const rows = stmt.all(cutoffStr) as unknown as InsightRow[];

  return rows.map(insightRowToAggregatedInsight);
}

/**
 * Auto-disable insights that have been measured as ineffective.
 * Returns the IDs of disabled insights.
 */
export function autoDisableIneffectiveInsights(
  db: Database.Database,
  options: {
    threshold?: number; // Improvement % threshold (e.g. -10)
    minSessions?: number;
  } = {}
): string[] {
  const { threshold = -10, minSessions = 10 } = options;

  // Find insights that are currently included but have poor effectiveness.
  // We join with aggregated_insights to ensure they are still included.
  // We use a subquery to only consider the LATEST measurement for each insight.
  const stmt = db.prepare(`
    SELECT pe.*, ai.prompt_text, ai.prompt_version as ai_version
    FROM prompt_effectiveness pe
    JOIN aggregated_insights ai ON pe.insight_id = ai.id
    WHERE ai.prompt_included = 1
      AND pe.statistically_significant = 1
      AND pe.improvement_pct < ?
      AND pe.sessions_after >= ?
      AND pe.measured_at = (
        SELECT MAX(measured_at)
        FROM prompt_effectiveness
        WHERE insight_id = pe.insight_id
      )
  `);

  const ineffective = stmt.all(
    threshold,
    minSessions
  ) as unknown as (EffectivenessRow & {
    prompt_text: string;
    ai_version: string;
  })[];

  const disabledIds: string[] = [];

  db.transaction(() => {
    for (const row of ineffective) {
      // Only auto-disable if the measurement is for the CURRENTLY active prompt version.
      // If the prompt was updated since the measurement, we should wait for new measurements.
      if (row.prompt_version === row.ai_version) {
        updateInsightPrompt(
          db,
          row.insight_id,
          row.prompt_text,
          false, // promptIncluded = false
          row.ai_version
        );
        disabledIds.push(row.insight_id);
      }
    }
  })();

  return disabledIds;
}

// =============================================================================
// Internal Types and Helpers
// =============================================================================

interface EffectivenessRow {
  id: string;
  insight_id: string;
  prompt_version: string;
  before_occurrences: number;
  before_severity: number;
  after_occurrences: number;
  after_severity: number;
  before_start: string;
  before_end: string;
  after_start: string;
  after_end: string;
  improvement_pct: number;
  statistically_significant: number;
  sessions_before: number;
  sessions_after: number;
  measured_at: string;
  created_at: string;
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

function rowToEffectiveness(row: EffectivenessRow): PromptEffectiveness {
  return {
    id: row.id,
    insightId: row.insight_id,
    promptVersion: row.prompt_version,
    beforeOccurrences: row.before_occurrences,
    beforeSeverity: row.before_severity,
    afterOccurrences: row.after_occurrences,
    afterSeverity: row.after_severity,
    beforeStart: row.before_start,
    beforeEnd: row.before_end,
    afterStart: row.after_start,
    afterEnd: row.after_end,
    improvementPct: row.improvement_pct,
    statisticallySignificant: row.statistically_significant === 1,
    sessionsBefore: row.sessions_before,
    sessionsAfter: row.sessions_after,
    measuredAt: row.measured_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function insightRowToAggregatedInsight(row: InsightRow): AggregatedInsight {
  return {
    id: row.id,
    type: row.type as InsightType,
    model: row.model ?? undefined,
    tool: row.tool ?? undefined,
    pattern: row.pattern,
    frequency: row.frequency,
    confidence: row.confidence,
    severity: row.severity as "low" | "medium" | "high",
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
