/**
 * Stats API routes
 */

import type Database from "better-sqlite3";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

import {
  countNodes,
  getAllProjects,
  listNodes,
} from "../../storage/node-queries.js";
import { getToolErrorStats } from "../../storage/tool-error-repository.js";
import { successResponse } from "../responses.js";

/** Message engagement stats from aggregating user/assistant message counts */
interface MessageEngagement {
  /** Total user messages across all nodes */
  totalUserMessages: number;
  /** Total assistant messages across all nodes */
  totalAssistantMessages: number;
  /** Ratio of assistant messages per user message */
  agentPerUserRatio: number;
  /** Number of nodes with message count data */
  nodesWithData: number;
}

/** Clarifying questions stats from aggregating question counts */
interface ClarifyingQuestions {
  /** Total clarifying questions (agent-initiated, filtered) */
  totalClarifyingQuestions: number;
  /** Total prompted questions (explicitly requested) */
  totalPromptedQuestions: number;
  /** Ratio of organic questions vs prompted questions */
  organicVsPromptedRatio: number;
  /** Questions per user message (engagement indicator) */
  questionsPerUserMessage: number;
  /** Number of nodes with question count data */
  nodesWithData: number;
}

/** Context window usage stats */
interface ContextWindowUsage {
  /** Average percentage of context window used (0.0-1.0) */
  averageUsagePercent: number;
  /** Number of nodes where context usage exceeded 75% */
  exceeds75PercentCount: number;
  /** Number of nodes where context usage exceeded 50% */
  exceeds50PercentCount: number;
  /** Default context window size used for calculations */
  defaultContextWindowSize: number;
  /** Number of nodes with token data */
  nodesWithData: number;
}

/**
 * Get message engagement statistics from the database
 */
function getMessageEngagement(db: Database.Database): MessageEngagement {
  const stmt = db.prepare(`
    SELECT 
      SUM(user_message_count) as totalUserMessages,
      SUM(assistant_message_count) as totalAssistantMessages,
      COUNT(*) as nodesWithData
    FROM nodes 
    WHERE user_message_count IS NOT NULL 
      AND assistant_message_count IS NOT NULL
  `);

  const result = stmt.get() as {
    totalUserMessages: number | null;
    totalAssistantMessages: number | null;
    nodesWithData: number;
  };

  const totalUserMessages = result.totalUserMessages ?? 0;
  const totalAssistantMessages = result.totalAssistantMessages ?? 0;
  const agentPerUserRatio =
    totalUserMessages > 0 ? totalAssistantMessages / totalUserMessages : 0;

  return {
    totalUserMessages,
    totalAssistantMessages,
    agentPerUserRatio,
    nodesWithData: result.nodesWithData,
  };
}

/**
 * Get clarifying questions statistics from the database
 *
 * Tracks agent-initiated clarifying questions (filtered to exclude
 * cases where questions were explicitly requested by user/tools/skills).
 */
function getClarifyingQuestions(db: Database.Database): ClarifyingQuestions {
  const stmt = db.prepare(`
    SELECT 
      SUM(clarifying_question_count) as totalClarifying,
      SUM(prompted_question_count) as totalPrompted,
      SUM(user_message_count) as totalUserMessages,
      COUNT(*) as nodesWithData
    FROM nodes 
    WHERE clarifying_question_count IS NOT NULL 
      OR prompted_question_count IS NOT NULL
  `);

  const result = stmt.get() as {
    totalClarifying: number | null;
    totalPrompted: number | null;
    totalUserMessages: number | null;
    nodesWithData: number;
  };

  const totalClarifyingQuestions = result.totalClarifying ?? 0;
  const totalPromptedQuestions = result.totalPrompted ?? 0;
  const totalUserMessages = result.totalUserMessages ?? 0;

  // Ratio of organic vs prompted (higher = more agent initiative)
  let organicVsPromptedRatio: number;
  if (totalPromptedQuestions > 0) {
    organicVsPromptedRatio = totalClarifyingQuestions / totalPromptedQuestions;
  } else if (totalClarifyingQuestions > 0) {
    organicVsPromptedRatio = -1; // -1 indicates all organic (no prompted questions)
  } else {
    organicVsPromptedRatio = 0;
  }

  // Questions per user message (engagement density)
  // Questions per user message (engagement density)
  const questionsPerUserMessage =
    totalUserMessages > 0 ? totalClarifyingQuestions / totalUserMessages : 0;

  return {
    totalClarifyingQuestions,
    totalPromptedQuestions,
    organicVsPromptedRatio,
    questionsPerUserMessage,
    nodesWithData: result.nodesWithData,
  };
}

/**
 * Default context window size for analysis (128K tokens, common for modern LLMs)
 */
const DEFAULT_CONTEXT_WINDOW_SIZE = 128_000;

/**
 * Get context window usage statistics from the database.
 *
 * Calculates what percentage of the context window is typically used,
 * and counts how many sessions exceeded 50% and 75% thresholds.
 */
function getContextWindowUsage(db: Database.Database): ContextWindowUsage {
  const contextSize = DEFAULT_CONTEXT_WINDOW_SIZE;
  const threshold50 = contextSize * 0.5;
  const threshold75 = contextSize * 0.75;

  const stmt = db.prepare(`
    SELECT 
      AVG(CAST(tokens_used AS FLOAT) / ?) as avgUsage,
      SUM(CASE WHEN tokens_used > ? THEN 1 ELSE 0 END) as exceeds50,
      SUM(CASE WHEN tokens_used > ? THEN 1 ELSE 0 END) as exceeds75,
      COUNT(*) as nodesWithData
    FROM nodes 
    WHERE tokens_used IS NOT NULL AND tokens_used > 0
  `);

  const result = stmt.get(contextSize, threshold50, threshold75) as {
    avgUsage: number | null;
    exceeds50: number;
    exceeds75: number;
    nodesWithData: number;
  };

  return {
    averageUsagePercent: result.avgUsage ?? 0,
    exceeds75PercentCount: result.exceeds75,
    exceeds50PercentCount: result.exceeds50,
    defaultContextWindowSize: contextSize,
    nodesWithData: result.nodesWithData,
  };
}

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

    // Message engagement metrics
    const messageEngagement = getMessageEngagement(db);

    // Clarifying questions metrics
    const clarifyingQuestions = getClarifyingQuestions(db);

    // Context window usage metrics
    const contextWindowUsage = getContextWindowUsage(db);

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
          messageEngagement,
          clarifyingQuestions,
          contextWindowUsage,
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
