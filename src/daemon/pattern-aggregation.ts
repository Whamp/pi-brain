import type Database from "better-sqlite3";

import { createHash } from "node:crypto";

interface FailurePatternGroup {
  tool: string;
  errorType: string;
  occurrences: number;
  models: Set<string>;
  nodeIds: string[]; // Sorted by recent first
  lastSeen: string;
}

interface ToolErrorRow {
  tool: string;
  error_type: string;
  model: string | null;
  node_id: string;
  created_at: string;
}

export class PatternAggregator {
  /** Maximum unique patterns to track before logging warning */
  private static readonly MAX_PATTERNS = 10_000;

  constructor(private db: Database.Database) {}

  /**
   * Aggregates tool errors into failure patterns.
   * This is intended to be run nightly or periodically.
   * @returns {number} The number of patterns aggregated
   */
  public aggregateFailurePatterns(): number {
    const stmt = this.db.prepare(`
      SELECT tool, error_type, model, node_id, created_at 
      FROM tool_errors 
      ORDER BY created_at DESC
    `);

    const groups = new Map<string, FailurePatternGroup>();
    let hitLimit = false;

    // Use iterator to handle large datasets without loading everything into memory
    for (const error of stmt.iterate() as IterableIterator<ToolErrorRow>) {
      const key = `${error.tool}:${error.error_type}`;

      let group = groups.get(key);
      if (!group) {
        // Check if we've hit the pattern limit
        if (groups.size >= PatternAggregator.MAX_PATTERNS) {
          if (!hitLimit) {
            console.warn(
              `[pattern-aggregation] Hit ${PatternAggregator.MAX_PATTERNS} failure pattern limit, skipping new patterns`
            );
            hitLimit = true;
          }
          continue; // Skip new patterns, only update existing ones
        }
        group = {
          tool: error.tool,
          errorType: error.error_type,
          occurrences: 0,
          models: new Set(),
          nodeIds: [],
          lastSeen: error.created_at, // Since we iterate DESC, the first one is the latest
        };
        groups.set(key, group);
      }

      group.occurrences++;
      if (error.model) {
        group.models.add(error.model);
      }
      // Limit example nodes to 5 recent ones
      if (group.nodeIds.length < 5) {
        group.nodeIds.push(error.node_id);
      }
    }

    const insertStmt = this.db.prepare(`
      INSERT INTO failure_patterns (
        id, pattern, occurrences, models, tools, example_nodes, last_seen, learning_opportunity, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, datetime('now')
      )
      ON CONFLICT(id) DO UPDATE SET
        occurrences = excluded.occurrences,
        models = excluded.models,
        example_nodes = excluded.example_nodes,
        last_seen = excluded.last_seen,
        updated_at = excluded.updated_at,
        pattern = excluded.pattern,
        tools = excluded.tools,
        -- Preserve existing learning opportunity if user customized it
        learning_opportunity = COALESCE(learning_opportunity, excluded.learning_opportunity)
    `);

    const transaction = this.db.transaction(() => {
      for (const group of groups.values()) {
        const id = createHash("sha256")
          .update(`${group.tool}:${group.errorType}`)
          .digest("hex")
          .slice(0, 16); // Short ID is enough

        const pattern = `Error '${group.errorType}' in tool '${group.tool}'`;
        // eslint-disable-next-line unicorn/no-array-sort
        const modelsJson = JSON.stringify([...group.models].sort());
        const toolsJson = JSON.stringify([group.tool]);
        const examplesJson = JSON.stringify(group.nodeIds);
        const learningOpportunity = `Investigate why ${group.tool} fails with ${group.errorType}`;

        insertStmt.run(
          id,
          pattern,
          group.occurrences,
          modelsJson,
          toolsJson,
          examplesJson,
          group.lastSeen,
          learningOpportunity
        );
      }
    });

    transaction();
    return groups.size;
  }

  /**
   * Aggregates lessons into lesson patterns.
   * Groups by level and exact summary text.
   * @returns {number} The number of patterns aggregated
   */
  public aggregateLessons(): number {
    const stmt = this.db.prepare(`
      SELECT l.level, l.summary, l.node_id, l.created_at,
             GROUP_CONCAT(lt.tag, '|') as tag_list
      FROM lessons l
      LEFT JOIN lesson_tags lt ON l.id = lt.lesson_id
      GROUP BY l.id
      ORDER BY l.created_at DESC
    `);

    const groups = new Map<
      string,
      {
        level: string;
        pattern: string;
        occurrences: number;
        tags: Set<string>;
        nodeIds: string[];
        lastSeen: string;
      }
    >();

    let hitLimit = false;

    for (const row of stmt.iterate() as IterableIterator<{
      level: string;
      summary: string;
      node_id: string;
      created_at: string;
      tag_list: string | null;
    }>) {
      const summary = row.summary.trim();
      const key = `${row.level}:${summary}`;

      let group = groups.get(key);
      if (!group) {
        // Check if we've hit the pattern limit
        if (groups.size >= PatternAggregator.MAX_PATTERNS) {
          if (!hitLimit) {
            console.warn(
              `[pattern-aggregation] Hit ${PatternAggregator.MAX_PATTERNS} lesson pattern limit, skipping new patterns`
            );
            hitLimit = true;
          }
          continue; // Skip new patterns, only update existing ones
        }
        group = {
          level: row.level,
          pattern: summary,
          occurrences: 0,
          tags: new Set(),
          nodeIds: [],
          lastSeen: row.created_at,
        };
        groups.set(key, group);
      }

      group.occurrences++;

      // Add tags
      if (row.tag_list) {
        for (const tag of row.tag_list.split("|")) {
          group.tags.add(tag);
        }
      }

      // Limit example nodes to 5 recent ones
      if (group.nodeIds.length < 5) {
        group.nodeIds.push(row.node_id);
      }
    }

    const insertStmt = this.db.prepare(`
      INSERT INTO lesson_patterns (
        id, level, pattern, occurrences, tags, example_nodes, last_seen, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, datetime('now')
      )
      ON CONFLICT(level, pattern) DO UPDATE SET
        occurrences = excluded.occurrences,
        tags = excluded.tags,
        example_nodes = excluded.example_nodes,
        last_seen = excluded.last_seen,
        updated_at = excluded.updated_at
    `);

    const transaction = this.db.transaction(() => {
      for (const group of groups.values()) {
        const id = createHash("sha256")
          .update(`${group.level}:${group.pattern}`)
          .digest("hex")
          .slice(0, 16);

        // eslint-disable-next-line unicorn/no-array-sort
        const tagsJson = JSON.stringify([...group.tags].sort());
        const examplesJson = JSON.stringify(group.nodeIds);

        insertStmt.run(
          id,
          group.level,
          group.pattern,
          group.occurrences,
          tagsJson,
          examplesJson,
          group.lastSeen
        );
      }
    });

    transaction();
    return groups.size;
  }

  /**
   * Aggregates model statistics from quirks and tool errors.
   * @returns {number} The number of models aggregated
   */
  public aggregateModelStats(): number {
    const quirksStmt = this.db.prepare(`
      SELECT model, COUNT(*) as count, MAX(created_at) as last_seen
      FROM model_quirks
      GROUP BY model
    `);

    const errorsStmt = this.db.prepare(`
      SELECT model, COUNT(*) as count, MAX(created_at) as last_seen
      FROM tool_errors
      WHERE model IS NOT NULL
      GROUP BY model
    `);

    const statsMap = new Map<
      string,
      { quirkCount: number; errorCount: number; lastUsed: string }
    >();

    for (const row of quirksStmt.iterate() as IterableIterator<{
      model: string;
      count: number;
      last_seen: string;
    }>) {
      const stats = statsMap.get(row.model) ?? {
        quirkCount: 0,
        errorCount: 0,
        lastUsed: row.last_seen,
      };
      stats.quirkCount = row.count;
      if (row.last_seen > stats.lastUsed) {
        stats.lastUsed = row.last_seen;
      }
      statsMap.set(row.model, stats);
    }

    for (const row of errorsStmt.iterate() as IterableIterator<{
      model: string;
      count: number;
      last_seen: string;
    }>) {
      const stats = statsMap.get(row.model) ?? {
        quirkCount: 0,
        errorCount: 0,
        lastUsed: row.last_seen,
      };
      stats.errorCount = row.count;
      if (row.last_seen > stats.lastUsed) {
        stats.lastUsed = row.last_seen;
      }
      statsMap.set(row.model, stats);
    }

    const insertStmt = this.db.prepare(`
      INSERT INTO model_stats (
        model, quirk_count, error_count, last_used, updated_at
      ) VALUES (
        ?, ?, ?, ?, datetime('now')
      )
      ON CONFLICT(model) DO UPDATE SET
        quirk_count = excluded.quirk_count,
        error_count = excluded.error_count,
        last_used = MAX(last_used, excluded.last_used),
        updated_at = excluded.updated_at
    `);

    const transaction = this.db.transaction(() => {
      for (const [model, stats] of statsMap.entries()) {
        insertStmt.run(
          model,
          stats.quirkCount,
          stats.errorCount,
          stats.lastUsed
        );
      }
    });

    transaction();
    return statsMap.size;
  }
}
