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
        -- Preserve existing learning opportunity if user customized it
        learning_opportunity = COALESCE(failure_patterns.learning_opportunity, excluded.learning_opportunity)
    `);

    const transaction = this.db.transaction(() => {
      for (const group of groups.values()) {
        const id = createHash("sha256")
          .update(`${group.tool}:${group.errorType}`)
          .digest("hex")
          .slice(0, 16); // Short ID is enough

        const pattern = `Error '${group.errorType}' in tool '${group.tool}'`;
        const modelsJson = JSON.stringify([...group.models].toSorted());
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
}
