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
  constructor(private db: Database.Database) {}

  /**
   * Aggregates tool errors into failure patterns.
   * This is intended to be run nightly or periodically.
   */
  public aggregateFailurePatterns(): void {
    const stmt = this.db.prepare(`
      SELECT tool, error_type, model, node_id, created_at 
      FROM tool_errors 
      ORDER BY created_at DESC
    `);

    const groups = new Map<string, FailurePatternGroup>();

    // Use iterator to handle large datasets without loading everything into memory
    for (const error of stmt.iterate() as IterableIterator<ToolErrorRow>) {
      const key = `${error.tool}:${error.error_type}`;

      let group = groups.get(key);
      if (!group) {
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
  }

  /**
   * Aggregates model statistics from quirks and tool errors.
   */
  public aggregateModelStats(): void {
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
  }
}
