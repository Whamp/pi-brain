/**
 * Signals API routes
 *
 * Provides endpoints for querying friction/delight signals
 * and patterns like Abandoned Restarts.
 */

import type Database from "better-sqlite3";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import type { NodeSignals } from "../../types/index.js";

import { successResponse } from "../responses.js";

// =============================================================================
// Types
// =============================================================================

interface AbandonedRestartPattern {
  /** Node that was abandoned */
  abandonedNodeId: string;
  abandonedSummary: string;
  abandonedProject: string;
  abandonedTimestamp: string;
  /** Node that restarted the work (may not be available) */
  restartNodeId?: string;
  restartSummary?: string;
  restartTimestamp?: string;
  /** Model used in abandoned session */
  model?: string;
  /** Friction score of the abandoned node */
  frictionScore: number;
}

interface FrictionSummary {
  /** Total nodes with high friction (score > 0.5) */
  highFrictionCount: number;
  /** Total abandoned restart patterns */
  abandonedRestartCount: number;
  /** Total rephrasing cascade events */
  rephrasingCascadeCount: number;
  /** Total tool loop events */
  toolLoopCount: number;
  /** Total context churn events */
  contextChurnCount: number;
  /** Models with highest friction */
  modelFriction: { model: string; count: number }[];
}

// =============================================================================
// Routes
// =============================================================================

export async function signalsRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /signals/abandoned-restarts - Get abandoned restart patterns
   *
   * Returns nodes where user abandoned work and restarted within 30 mins.
   */
  app.get(
    "/abandoned-restarts",
    async (
      request: FastifyRequest<{
        Querystring: { limit?: string; offset?: string };
      }>,
      reply: FastifyReply
    ) => {
      const startTime = request.startTime ?? Date.now();
      const { db } = app.ctx;
      const limit = Math.min(
        Number.parseInt(request.query.limit ?? "10", 10),
        100
      );
      const offset = Number.parseInt(request.query.offset ?? "0", 10);

      const patterns = getAbandonedRestartPatterns(db, limit, offset);
      const total = countAbandonedRestartPatterns(db);

      const durationMs = Date.now() - startTime;
      return reply.send(
        successResponse(
          {
            patterns,
            total,
            limit,
            offset,
          },
          durationMs
        )
      );
    }
  );

  /**
   * GET /signals/friction-summary - Get friction signal summary
   *
   * Returns aggregate friction statistics for the dashboard.
   */
  app.get(
    "/friction-summary",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const startTime = request.startTime ?? Date.now();
      const { db } = app.ctx;

      const summary = getFrictionSummary(db);

      const durationMs = Date.now() - startTime;
      return reply.send(successResponse(summary, durationMs));
    }
  );
}

// =============================================================================
// Data Access Functions
// =============================================================================

/**
 * Get abandoned restart patterns by querying the signals column.
 *
 * Uses SQLite's json_extract to query the stored signals JSON.
 */
function getAbandonedRestartPatterns(
  db: Database.Database,
  limit: number,
  offset: number
): AbandonedRestartPattern[] {
  // Query nodes where signals.friction.abandonedRestart is true
  const stmt = db.prepare(`
    SELECT n.id, n.project, n.timestamp, n.signals
    FROM nodes n
    WHERE json_extract(n.signals, '$.friction.abandonedRestart') = 1
    ORDER BY n.timestamp DESC
    LIMIT ? OFFSET ?
  `);

  const rows = stmt.all(limit, offset) as {
    id: string;
    project: string | null;
    timestamp: string;
    signals: string | null;
  }[];

  const patterns: AbandonedRestartPattern[] = [];

  for (const row of rows) {
    if (!row.signals) {
      continue;
    }

    try {
      const signals = JSON.parse(row.signals) as NodeSignals;

      patterns.push({
        abandonedNodeId: row.id,
        abandonedSummary: "", // Not stored in signals column
        abandonedProject: row.project ?? "Unknown",
        abandonedTimestamp: row.timestamp,
        frictionScore: signals.friction?.score ?? 0,
      });
    } catch {
      // Skip invalid JSON
    }
  }

  return patterns;
}

/**
 * Count total abandoned restart patterns using the signals column.
 *
 * This is now accurate instead of an approximation.
 */
function countAbandonedRestartPatterns(db: Database.Database): number {
  const stmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM nodes
    WHERE json_extract(signals, '$.friction.abandonedRestart') = 1
  `);
  const result = stmt.get() as { count: number };
  return result.count;
}

/**
 * Get friction summary statistics using the signals column.
 *
 * Queries are now efficient using SQLite's json_extract.
 */
function getFrictionSummary(db: Database.Database): FrictionSummary {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoffDate = thirtyDaysAgo.toISOString();

  // High friction count (score > 0.5)
  const highFrictionStmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM nodes
    WHERE timestamp > ?
      AND signals IS NOT NULL
      AND json_extract(signals, '$.friction.score') > 0.5
  `);
  const highFrictionCount = (
    highFrictionStmt.get(cutoffDate) as { count: number }
  ).count;

  // Abandoned restart count
  const abandonedRestartStmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM nodes
    WHERE timestamp > ?
      AND json_extract(signals, '$.friction.abandonedRestart') = 1
  `);
  const abandonedRestartCount = (
    abandonedRestartStmt.get(cutoffDate) as { count: number }
  ).count;

  // Aggregate rephrasing, tool loop, and context churn counts
  const aggregateStmt = db.prepare(`
    SELECT
      COALESCE(SUM(json_extract(signals, '$.friction.rephrasingCount')), 0) as rephrasingTotal,
      COALESCE(SUM(json_extract(signals, '$.friction.toolLoopCount')), 0) as toolLoopTotal,
      COALESCE(SUM(json_extract(signals, '$.friction.contextChurnCount')), 0) as contextChurnTotal
    FROM nodes
    WHERE timestamp > ?
      AND signals IS NOT NULL
  `);
  const aggregates = aggregateStmt.get(cutoffDate) as {
    rephrasingTotal: number;
    toolLoopTotal: number;
    contextChurnTotal: number;
  };

  // For model friction, we still need to query related tables
  // since model info isn't in the signals column
  const modelStmt = db.prepare(`
    SELECT mq.model, COUNT(*) as count
    FROM nodes n
    JOIN model_quirks mq ON mq.node_id = n.id
    WHERE n.timestamp > ?
      AND n.signals IS NOT NULL
      AND json_extract(n.signals, '$.friction.score') > 0.3
    GROUP BY mq.model
    ORDER BY count DESC
    LIMIT 5
  `);

  const modelRows = modelStmt.all(cutoffDate) as {
    model: string;
    count: number;
  }[];

  return {
    highFrictionCount,
    abandonedRestartCount,
    rephrasingCascadeCount: aggregates.rephrasingTotal,
    toolLoopCount: aggregates.toolLoopTotal,
    contextChurnCount: aggregates.contextChurnTotal,
    modelFriction: modelRows,
  };
}
