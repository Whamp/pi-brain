/**
 * Insight Aggregator - Aggregates model-specific learnings for prompt improvement
 *
 * Collects insights from:
 * - Model quirks (model_quirks table)
 * - Tool errors (tool_errors table)
 * - Lessons at model/tool/user levels (lessons table)
 * - Prompting wins/failures (from node JSON files)
 *
 * Stores aggregated results in aggregated_insights table.
 * See specs/prompt-learning.md for full specification.
 */

import type Database from "better-sqlite3";

import { createHash } from "node:crypto";

import { createLogger } from "../utils/logger.js";
import type { InsightSeverity, InsightType, Node } from "../types/index.js";

import { readNodeFromPath } from "../storage/node-storage.js";

// =============================================================================
// Types
// =============================================================================

interface InsightGroup {
  type: InsightType;
  model?: string;
  tool?: string;
  pattern: string;
  frequency: number;
  confidence: number;
  severity: InsightSeverity;
  workaround?: string;
  examples: string[]; // Node IDs
  firstSeen: string;
  lastSeen: string;
}

interface ModelQuirkRow {
  id: string;
  node_id: string;
  model: string;
  observation: string;
  frequency: string | null;
  workaround: string | null;
  created_at: string;
}

interface ToolErrorRow {
  id: string;
  node_id: string;
  tool: string;
  error_type: string;
  model: string | null;
  created_at: string;
}

interface LessonRow {
  id: string;
  node_id: string;
  level: string;
  summary: string;
  confidence: string | null;
  created_at: string;
}

interface NodeRow {
  id: string;
  data_file: string;
}

// =============================================================================
// Constants
// =============================================================================

const MAX_PATTERNS = 10_000;
const MAX_EXAMPLES = 10;
const NODE_BATCH_SIZE = 1000; // Process nodes in batches to limit memory pressure

// Logger for insight aggregation
const log = createLogger("insight-aggregation");

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Normalize pattern text for grouping similar patterns
 */
function normalizePattern(text: string): string {
  return text.toLowerCase().replaceAll(/\s+/g, " ").trim();
}

/**
 * Convert frequency string to confidence score
 */
function frequencyToConfidence(freq: string | null): number {
  switch (freq) {
    case "always": {
      return 0.95;
    }
    case "often": {
      return 0.75;
    }
    case "sometimes": {
      return 0.5;
    }
    case "once": {
      return 0.25;
    }
    default: {
      return 0.5;
    }
  }
}

/**
 * Generate deterministic ID for an insight
 */
function generateInsightId(
  type: InsightType,
  pattern: string,
  model?: string,
  tool?: string
): string {
  const parts = [type, model ?? "", tool ?? "", normalizePattern(pattern)];
  return createHash("sha256")
    .update(parts.join(":"))
    .digest("hex")
    .slice(0, 16);
}

/**
 * Get max of two date strings
 */
function maxDate(a: string, b: string): string {
  return a > b ? a : b;
}

/**
 * Get min of two date strings
 */
function minDate(a: string, b: string): string {
  return a < b ? a : b;
}

// =============================================================================
// Insight Aggregator
// =============================================================================

export class InsightAggregator {
  constructor(private db: Database.Database) {}

  /**
   * Run full insight aggregation.
   * Collects from all sources and updates aggregated_insights table.
   */
  public aggregateAll(): void {
    const insights = new Map<string, InsightGroup>();

    // Collect from all sources
    this.aggregateModelQuirks(insights);
    this.aggregateToolErrors(insights);
    this.aggregateLessons(insights);
    this.aggregatePromptingPatterns(insights);

    // Store results
    this.storeInsights(insights);

    log.info(` Aggregated ${insights.size} insights`);
  }

  /**
   * Aggregate model quirks from model_quirks table
   */
  private aggregateModelQuirks(insights: Map<string, InsightGroup>): void {
    const stmt = this.db.prepare(`
      SELECT id, node_id, model, observation, frequency, workaround, created_at
      FROM model_quirks
      ORDER BY created_at DESC
    `);

    let hitLimit = false;

    for (const row of stmt.iterate() as IterableIterator<ModelQuirkRow>) {
      const pattern = row.observation;
      const id = generateInsightId("quirk", pattern, row.model);

      let group = insights.get(id);
      if (!group) {
        if (insights.size >= MAX_PATTERNS) {
          if (!hitLimit) {
            log.warn(
              `[insight-aggregation] Hit ${MAX_PATTERNS} pattern limit for quirks`
            );
            hitLimit = true;
          }
          continue;
        }

        group = {
          type: "quirk",
          model: row.model,
          pattern,
          frequency: 0,
          confidence: frequencyToConfidence(row.frequency),
          severity: "medium", // Default for quirks
          workaround: row.workaround ?? undefined,
          examples: [],
          firstSeen: row.created_at,
          lastSeen: row.created_at,
        };
        insights.set(id, group);
      }

      group.frequency++;
      group.lastSeen = maxDate(group.lastSeen, row.created_at);
      group.firstSeen = minDate(group.firstSeen, row.created_at);

      // Use maximum confidence from all row frequency values
      const rowConfidence = frequencyToConfidence(row.frequency);
      group.confidence = Math.max(group.confidence, rowConfidence);

      // Update confidence based on occurrence count
      if (group.frequency >= 5) {
        group.confidence = Math.max(group.confidence, 0.75);
      }

      // Merge workaround if better one found
      if (row.workaround && !group.workaround) {
        group.workaround = row.workaround;
      }

      if (group.examples.length < MAX_EXAMPLES) {
        group.examples.push(row.node_id);
      }
    }
  }

  /**
   * Aggregate tool errors from tool_errors table
   */
  private aggregateToolErrors(insights: Map<string, InsightGroup>): void {
    const stmt = this.db.prepare(`
      SELECT id, node_id, tool, error_type, model, created_at
      FROM tool_errors
      ORDER BY created_at DESC
    `);

    let hitLimit = false;

    for (const row of stmt.iterate() as IterableIterator<ToolErrorRow>) {
      const pattern = `${row.error_type} in ${row.tool}`;
      const id = generateInsightId(
        "tool_error",
        pattern,
        row.model ?? undefined,
        row.tool
      );

      let group = insights.get(id);
      if (!group) {
        if (insights.size >= MAX_PATTERNS) {
          if (!hitLimit) {
            log.warn(
              `[insight-aggregation] Hit ${MAX_PATTERNS} pattern limit for tool errors`
            );
            hitLimit = true;
          }
          continue;
        }

        group = {
          type: "tool_error",
          model: row.model ?? undefined,
          tool: row.tool,
          pattern,
          frequency: 0,
          confidence: 0.5,
          severity: "medium",
          examples: [],
          firstSeen: row.created_at,
          lastSeen: row.created_at,
        };
        insights.set(id, group);
      }

      group.frequency++;
      group.lastSeen = maxDate(group.lastSeen, row.created_at);
      group.firstSeen = minDate(group.firstSeen, row.created_at);

      // Increase confidence and severity with frequency
      if (group.frequency >= 10) {
        group.confidence = 0.9;
        group.severity = "high";
      } else if (group.frequency >= 5) {
        group.confidence = 0.75;
        group.severity = "medium";
      }

      if (group.examples.length < MAX_EXAMPLES) {
        group.examples.push(row.node_id);
      }
    }
  }

  /**
   * Aggregate lessons from lessons table (model, tool, user levels)
   */
  private aggregateLessons(insights: Map<string, InsightGroup>): void {
    const stmt = this.db.prepare(`
      SELECT id, node_id, level, summary, confidence, created_at
      FROM lessons
      WHERE level IN ('model', 'tool', 'user')
      ORDER BY created_at DESC
    `);

    let hitLimit = false;

    for (const row of stmt.iterate() as IterableIterator<LessonRow>) {
      const pattern = row.summary;
      const id = generateInsightId("lesson", pattern);

      let group = insights.get(id);
      if (!group) {
        if (insights.size >= MAX_PATTERNS) {
          if (!hitLimit) {
            log.warn(
              `[insight-aggregation] Hit ${MAX_PATTERNS} pattern limit for lessons`
            );
            hitLimit = true;
          }
          continue;
        }

        let confidence = 0.5;
        if (row.confidence === "high") {
          confidence = 0.9;
        } else if (row.confidence === "medium") {
          confidence = 0.7;
        }

        group = {
          type: "lesson",
          pattern,
          frequency: 0,
          confidence,
          severity: "low",
          examples: [],
          firstSeen: row.created_at,
          lastSeen: row.created_at,
        };
        insights.set(id, group);
      }

      group.frequency++;
      group.lastSeen = maxDate(group.lastSeen, row.created_at);
      group.firstSeen = minDate(group.firstSeen, row.created_at);

      // Boost confidence once when we reach 3 occurrences
      if (group.frequency === 3) {
        group.confidence = Math.min(group.confidence + 0.1, 0.95);
      }

      if (group.examples.length < MAX_EXAMPLES) {
        group.examples.push(row.node_id);
      }
    }
  }

  /**
   * Aggregate prompting wins and failures from node JSON files.
   * Processes nodes in batches to limit memory pressure.
   */
  private aggregatePromptingPatterns(
    insights: Map<string, InsightGroup>
  ): void {
    let hitLimit = false;
    let nodesProcessed = 0;
    let errorsEncountered = 0;
    let offset = 0;

    const stmt = this.db.prepare(`
      SELECT id, data_file
      FROM nodes
      WHERE data_file IS NOT NULL
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `);

    // Process in batches
    while (true) {
      const rows = stmt.all(NODE_BATCH_SIZE, offset) as unknown as NodeRow[];

      if (rows.length === 0) {
        break;
      }

      for (const row of rows) {
        const result = this.processNodePromptingPatterns(
          row,
          insights,
          hitLimit
        );
        if (result.error) {
          errorsEncountered++;
        } else {
          nodesProcessed++;
          ({ hitLimit } = result);
        }
      }

      offset += NODE_BATCH_SIZE;
    }

    this.logPromptingPatternsSummary(nodesProcessed, errorsEncountered);
  }

  /**
   * Process prompting patterns from a single node
   */
  private processNodePromptingPatterns(
    row: NodeRow,
    insights: Map<string, InsightGroup>,
    initialHitLimit: boolean
  ): { error: boolean; hitLimit: boolean } {
    let node: Node;
    try {
      node = readNodeFromPath(row.data_file);
    } catch {
      return { error: true, hitLimit: initialHitLimit };
    }

    const primaryModel = node.observations.modelsUsed[0]?.model;
    const nodeTimestamp = node.metadata.timestamp;
    let currentHitLimit = initialHitLimit;

    for (const win of node.observations.promptingWins) {
      currentHitLimit = this.aggregatePromptingWin(
        win,
        primaryModel,
        nodeTimestamp,
        row.id,
        insights,
        currentHitLimit
      );
    }

    for (const failure of node.observations.promptingFailures) {
      currentHitLimit = this.aggregatePromptingFailure(
        failure,
        primaryModel,
        nodeTimestamp,
        row.id,
        insights,
        currentHitLimit
      );
    }

    return { error: false, hitLimit: currentHitLimit };
  }

  /**
   * Aggregate a single prompting win
   */
  private aggregatePromptingWin(
    win: string,
    primaryModel: string | undefined,
    nodeTimestamp: string,
    nodeId: string,
    insights: Map<string, InsightGroup>,
    currentHitLimit: boolean
  ): boolean {
    let hitLimit = currentHitLimit;
    if (insights.size >= MAX_PATTERNS && !hitLimit) {
      log.warn(` Hit ${MAX_PATTERNS} pattern limit`);
      hitLimit = true;
    }

    const id = generateInsightId("win", win, primaryModel);
    let group = insights.get(id);

    if (!group && !hitLimit) {
      group = {
        type: "win",
        model: primaryModel,
        pattern: win,
        frequency: 0,
        confidence: 0.6,
        severity: "low",
        examples: [],
        firstSeen: nodeTimestamp,
        lastSeen: nodeTimestamp,
      };
      insights.set(id, group);
    }

    if (group) {
      this.updateInsightGroup(group, nodeTimestamp, nodeId);
    }

    return hitLimit;
  }

  /**
   * Aggregate a single prompting failure
   */
  private aggregatePromptingFailure(
    failure: string,
    primaryModel: string | undefined,
    nodeTimestamp: string,
    nodeId: string,
    insights: Map<string, InsightGroup>,
    currentHitLimit: boolean
  ): boolean {
    let hitLimit = currentHitLimit;
    if (insights.size >= MAX_PATTERNS && !hitLimit) {
      log.warn(` Hit ${MAX_PATTERNS} pattern limit`);
      hitLimit = true;
    }

    const id = generateInsightId("failure", failure, primaryModel);
    let group = insights.get(id);

    if (!group && !hitLimit) {
      group = {
        type: "failure",
        model: primaryModel,
        pattern: failure,
        frequency: 0,
        confidence: 0.6,
        severity: "medium",
        examples: [],
        firstSeen: nodeTimestamp,
        lastSeen: nodeTimestamp,
      };
      insights.set(id, group);
    }

    if (group) {
      this.updateInsightGroup(group, nodeTimestamp, nodeId);
      // Failures that repeat are more severe - boost once at threshold
      if (group.frequency === 3) {
        group.severity = "high";
        group.confidence = Math.min(group.confidence + 0.15, 0.95);
      }
    }

    return hitLimit;
  }

  /**
   * Update insight group with new occurrence
   */
  private updateInsightGroup(
    group: InsightGroup,
    nodeTimestamp: string,
    nodeId: string
  ): void {
    group.frequency++;
    group.lastSeen = maxDate(group.lastSeen, nodeTimestamp);
    group.firstSeen = minDate(group.firstSeen, nodeTimestamp);

    if (group.examples.length < MAX_EXAMPLES) {
      group.examples.push(nodeId);
    }
  }

  /**
   * Log prompting patterns processing summary
   */
  private logPromptingPatternsSummary(
    nodesProcessed: number,
    errorsEncountered: number
  ): void {
    if (errorsEncountered > 0) {
      log.warn(
        `[insight-aggregation] Skipped ${errorsEncountered} nodes due to missing/invalid JSON files`
      );
    }
    log.info(
      `[insight-aggregation] Processed ${nodesProcessed} nodes for prompting patterns`
    );
  }

  /**
   * Store aggregated insights in the database
   */
  private storeInsights(insights: Map<string, InsightGroup>): void {
    const insertStmt = this.db.prepare(`
      INSERT INTO aggregated_insights (
        id, type, model, tool, pattern, frequency, confidence, severity,
        workaround, examples, first_seen, last_seen, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, datetime('now')
      )
      ON CONFLICT(id) DO UPDATE SET
        frequency = excluded.frequency,
        confidence = excluded.confidence,
        severity = excluded.severity,
        workaround = COALESCE(excluded.workaround, workaround),
        examples = excluded.examples,
        last_seen = excluded.last_seen,
        updated_at = excluded.updated_at
    `);

    const transaction = this.db.transaction(() => {
      for (const [id, group] of insights.entries()) {
        insertStmt.run(
          id,
          group.type,
          group.model ?? null,
          group.tool ?? null,
          group.pattern,
          group.frequency,
          group.confidence,
          group.severity,
          group.workaround ?? null,
          JSON.stringify(group.examples),
          group.firstSeen,
          group.lastSeen
        );
      }
    });

    transaction();
  }
}
