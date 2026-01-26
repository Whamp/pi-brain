/**
 * Stats API routes
 */

import type Database from "better-sqlite3";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

import {
  countNodes,
  getAllProjects,
  getToolErrorStats,
  listNodes,
} from "../../storage/node-repository.js";
import { successResponse } from "../responses.js";

export async function statsRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /stats - Dashboard statistics
   */
  app.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = request.startTime ?? Date.now();
    const { db } = app.ctx;

    // Total counts
    const totalNodes = countNodes(db, {});
    const totalEdges = countEdges(db);

    // This week's nodes
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const nodesThisWeek = countNodes(db, {
      from: oneWeekAgo.toISOString(),
    });

    // Today's nodes
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const nodesToday = countNodes(db, {
      from: todayStart.toISOString(),
    });

    // Outcomes breakdown
    const successCount = countNodes(db, { outcome: "success" });
    const partialCount = countNodes(db, { outcome: "partial" });
    const failedCount = countNodes(db, { outcome: "failed" });
    const abandonedCount = countNodes(db, { outcome: "abandoned" });

    // Top projects (get all projects and count nodes for each)
    const allProjects = getAllProjects(db);
    const projectCounts = allProjects
      .slice(0, 10) // Limit to top 10
      .map((project) => ({
        project,
        nodeCount: countNodes(db, { project }),
      }))
      .toSorted((a, b) => b.nodeCount - a.nodeCount);

    // Vague goal tracking
    const vagueThisWeek = countNodes(db, {
      from: oneWeekAgo.toISOString(),
      hadClearGoal: false,
    });
    const clearThisWeek = countNodes(db, {
      from: oneWeekAgo.toISOString(),
      hadClearGoal: true,
    });

    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const vagueLastWeek = countNodes(db, {
      from: twoWeeksAgo.toISOString(),
      to: oneWeekAgo.toISOString(),
      hadClearGoal: false,
    });
    const clearLastWeek = countNodes(db, {
      from: twoWeeksAgo.toISOString(),
      to: oneWeekAgo.toISOString(),
      hadClearGoal: true,
    });

    const vagueRatioThisWeek =
      clearThisWeek + vagueThisWeek > 0
        ? vagueThisWeek / (clearThisWeek + vagueThisWeek)
        : 0;
    const vagueRatioLastWeek =
      clearLastWeek + vagueLastWeek > 0
        ? vagueLastWeek / (clearLastWeek + vagueLastWeek)
        : 0;

    // Token and cost totals (from recent nodes)
    const recentNodes = listNodes(db, {}, { limit: 500 });
    let totalTokens = 0;
    let totalCost = 0;
    const byModel: Record<string, { tokens: number; cost: number }> = {};

    for (const node of recentNodes.nodes) {
      totalTokens += node.tokens_used ?? 0;
      totalCost += node.cost ?? 0;
      // Note: we don't have model info in the node row, would need to read JSON
    }

    const durationMs = Date.now() - startTime;
    return reply.send(
      successResponse(
        {
          totals: {
            nodes: totalNodes,
            edges: totalEdges,
            sessions: totalNodes, // Approximate: 1 node per session segment
          },
          recent: {
            nodesThisWeek,
            nodesToday,
          },
          usage: {
            totalTokens,
            totalCost,
            byModel,
          },
          outcomes: {
            success: successCount,
            partial: partialCount,
            failed: failedCount,
            abandoned: abandonedCount,
          },
          topProjects: projectCounts,
          trends: {
            vagueGoals: {
              thisWeek: vagueRatioThisWeek,
              lastWeek: vagueRatioLastWeek,
              change: vagueRatioThisWeek - vagueRatioLastWeek,
            },
          },
        },
        durationMs
      )
    );
  });

  /**
   * GET /stats/tool-errors - Tool error statistics
   */
  app.get(
    "/tool-errors",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const startTime = request.startTime ?? Date.now();
      const { db } = app.ctx;

      const stats = getToolErrorStats(db);

      const durationMs = Date.now() - startTime;
      return reply.send(successResponse(stats, durationMs));
    }
  );
}

/**
 * Count edges in the database
 */
function countEdges(db: Database.Database): number {
  const stmt = db.prepare("SELECT COUNT(*) as count FROM edges");
  const result = stmt.get() as { count: number };
  return result.count;
}
