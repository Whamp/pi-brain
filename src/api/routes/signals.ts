/**
 * Signals API routes
 *
 * Provides endpoints for querying friction/delight signals
 * and patterns like Abandoned Restarts.
 */

import type Database from "better-sqlite3";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import type { NodeRow } from "../../storage/node-repository.js";

import { readNodeFromPath } from "../../storage/node-storage.js";
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
  /** Files touched in abandoned session */
  filesTouched: string[];
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
      const approximateTotal = countAbandonedRestartPatterns(db);

      const durationMs = Date.now() - startTime;
      return reply.send(
        successResponse(
          {
            patterns,
            approximateTotal,
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
 * Get abandoned restart patterns by scanning node JSON files
 */
function getAbandonedRestartPatterns(
  db: Database.Database,
  limit: number,
  offset: number
): AbandonedRestartPattern[] {
  // Query nodes with outcome='abandoned' ordered by timestamp desc
  const stmt = db.prepare(`
    SELECT id, session_file, project, timestamp, data_file, outcome
    FROM nodes
    WHERE outcome = 'abandoned'
    ORDER BY timestamp DESC
    LIMIT ? OFFSET ?
  `);

  const abandonedRows = stmt.all(limit * 2, offset) as (NodeRow & {
    outcome: string;
  })[];

  const patterns: AbandonedRestartPattern[] = [];

  for (const row of abandonedRows) {
    try {
      const node = readNodeFromPath(row.data_file);
      if (!node) {
        continue;
      }

      // Check if this node has the abandonedRestart signal
      if (node.signals?.friction?.abandonedRestart) {
        patterns.push({
          abandonedNodeId: row.id,
          abandonedSummary: node.content?.summary ?? "No summary",
          abandonedProject:
            node.classification?.project ?? row.project ?? "Unknown",
          abandonedTimestamp: node.metadata?.timestamp ?? row.timestamp,
          model: node.observations?.modelsUsed?.[0]?.model,
          filesTouched: node.content?.filesTouched ?? [],
          frictionScore: node.signals.friction.score,
        });

        if (patterns.length >= limit) {
          break;
        }
      }
    } catch {
      // Skip nodes with missing/invalid JSON
    }
  }

  return patterns;
}

/**
 * Count total abandoned restart patterns
 */
function countAbandonedRestartPatterns(db: Database.Database): number {
  // First get count of abandoned nodes (approximate upper bound)
  const stmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM nodes
    WHERE outcome = 'abandoned'
  `);
  const result = stmt.get() as { count: number };

  // For exact count, we'd need to scan all JSON files
  // Return approximate count for performance
  return result.count;
}

/**
 * Get friction summary statistics
 */
function getFrictionSummary(db: Database.Database): FrictionSummary {
  // Get recent nodes (last 30 days) and scan their signals
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const stmt = db.prepare(`
    SELECT id, data_file, project, timestamp
    FROM nodes
    WHERE timestamp > ?
    ORDER BY timestamp DESC
    LIMIT 500
  `);

  const rows = stmt.all(thirtyDaysAgo.toISOString()) as NodeRow[];

  let highFrictionCount = 0;
  let abandonedRestartCount = 0;
  let rephrasingCascadeCount = 0;
  let toolLoopCount = 0;
  let contextChurnCount = 0;
  const modelFrictionMap = new Map<string, number>();

  for (const row of rows) {
    try {
      const node = readNodeFromPath(row.data_file);
      if (!node?.signals?.friction) {
        continue;
      }

      const { friction } = node.signals;

      if (friction.score > 0.5) {
        highFrictionCount++;
      }

      if (friction.abandonedRestart) {
        abandonedRestartCount++;
      }

      rephrasingCascadeCount += friction.rephrasingCount ?? 0;
      toolLoopCount += friction.toolLoopCount ?? 0;
      contextChurnCount += friction.contextChurnCount ?? 0;

      // Track model friction
      if (friction.score > 0.3) {
        const model = node.observations?.modelsUsed?.[0]?.model ?? "unknown";
        modelFrictionMap.set(model, (modelFrictionMap.get(model) ?? 0) + 1);
      }
    } catch {
      // Skip nodes with missing/invalid JSON
    }
  }

  // Convert model map to sorted array
  const modelFriction = [...modelFrictionMap.entries()]
    .map(([model, count]) => ({ model, count }))
    .toSorted((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    highFrictionCount,
    abandonedRestartCount,
    rephrasingCascadeCount,
    toolLoopCount,
    contextChurnCount,
    modelFriction,
  };
}
