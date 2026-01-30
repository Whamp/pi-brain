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

/**
 * Format a date to UTC date string (YYYY-MM-DD)
 */
function formatDateToUTC(d: Date): string {
  return d.toISOString().split("T")[0];
}

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

// =============================================================================
// Stats Helper Functions
// =============================================================================

interface DateRanges {
  oneWeekAgo: Date;
  twoWeeksAgo: Date;
  todayStart: Date;
}

function getDateRanges(): DateRanges {
  const now = new Date();

  const oneWeekAgo = new Date(now);
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const twoWeeksAgo = new Date(now);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  return { oneWeekAgo, twoWeeksAgo, todayStart };
}

interface OutcomeCounts {
  success: number;
  partial: number;
  failed: number;
  abandoned: number;
}

function getOutcomeCounts(db: Database.Database): OutcomeCounts {
  return {
    success: countNodes(db, { outcome: "success" }),
    partial: countNodes(db, { outcome: "partial" }),
    failed: countNodes(db, { outcome: "failed" }),
    abandoned: countNodes(db, { outcome: "abandoned" }),
  };
}

interface VagueGoalTrends {
  thisWeek: number;
  lastWeek: number;
  change: number;
}

function getVagueGoalTrends(
  db: Database.Database,
  dates: DateRanges
): VagueGoalTrends {
  const vagueThisWeek = countNodes(db, {
    from: dates.oneWeekAgo.toISOString(),
    hadClearGoal: false,
  });
  const clearThisWeek = countNodes(db, {
    from: dates.oneWeekAgo.toISOString(),
    hadClearGoal: true,
  });

  const vagueLastWeek = countNodes(db, {
    from: dates.twoWeeksAgo.toISOString(),
    to: dates.oneWeekAgo.toISOString(),
    hadClearGoal: false,
  });
  const clearLastWeek = countNodes(db, {
    from: dates.twoWeeksAgo.toISOString(),
    to: dates.oneWeekAgo.toISOString(),
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

  return {
    thisWeek: vagueRatioThisWeek,
    lastWeek: vagueRatioLastWeek,
    change: vagueRatioThisWeek - vagueRatioLastWeek,
  };
}

interface UsageTotals {
  totalTokens: number;
  totalCost: number;
  byModel: Record<string, { tokens: number; cost: number }>;
}

function getUsageTotals(db: Database.Database): UsageTotals {
  const recentNodes = listNodes(db, {}, { limit: 500 });
  let totalTokens = 0;
  let totalCost = 0;

  for (const node of recentNodes.nodes) {
    totalTokens += node.tokens_used ?? 0;
    totalCost += node.cost ?? 0;
  }

  return { totalTokens, totalCost, byModel: {} };
}

export async function statsRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /stats - Dashboard statistics
   */
  app.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = request.startTime ?? Date.now();
    const { db } = app.ctx;

    const dates = getDateRanges();

    // Total counts
    const totalNodes = countNodes(db, {});
    const totalEdges = countEdges(db);

    // This week's and today's nodes
    const nodesThisWeek = countNodes(db, {
      from: dates.oneWeekAgo.toISOString(),
    });
    const nodesToday = countNodes(db, { from: dates.todayStart.toISOString() });

    // Outcomes and trends
    const outcomes = getOutcomeCounts(db);
    const vagueGoals = getVagueGoalTrends(db, dates);
    const usage = getUsageTotals(db);

    // Top projects (get all projects and count nodes for each)
    const allProjects = getAllProjects(db);
    const projectCounts = allProjects
      .slice(0, 10)
      .map((project) => ({
        project,
        nodeCount: countNodes(db, { project }),
      }))
      .toSorted((a, b) => b.nodeCount - a.nodeCount);

    // Aggregate metrics
    const messageEngagement = getMessageEngagement(db);
    const clarifyingQuestions = getClarifyingQuestions(db);
    const contextWindowUsage = getContextWindowUsage(db);

    const durationMs = Date.now() - startTime;
    return reply.send(
      successResponse(
        {
          totals: {
            nodes: totalNodes,
            edges: totalEdges,
            sessions: totalNodes,
          },
          recent: {
            nodesThisWeek,
            nodesToday,
          },
          usage,
          outcomes,
          topProjects: projectCounts,
          trends: {
            vagueGoals,
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

  /**
   * GET /stats/timeseries - Time-series data for tokens and costs
   */
  app.get(
    "/timeseries",
    async (
      request: FastifyRequest<{
        Querystring: {
          days?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const startTime = request.startTime ?? Date.now();
      const { db } = app.ctx;
      const days = Number.parseInt(request.query.days ?? "7", 10);

      // Calculate date range
      // Use UTC dates to match SQLite's DATE() function which returns UTC dates
      const now = new Date();

      // End date is today in UTC
      const endDateStr = formatDateToUTC(now);
      // Start date is 'days' ago from today in UTC
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = formatDateToUTC(startDate);

      // Get daily token/cost totals from database
      const stmt = db.prepare(`
        SELECT
          DATE(timestamp) as date,
          SUM(tokens_used) as tokens,
          SUM(cost) as cost,
          COUNT(*) as nodes
        FROM nodes
        WHERE DATE(timestamp) >= ? AND DATE(timestamp) <= ?
        GROUP BY DATE(timestamp)
        ORDER BY date ASC
      `);

      const rows = stmt.all(startDateStr, endDateStr) as {
        date: string;
        tokens: number;
        cost: number;
        nodes: number;
      }[];

      // Fill in missing dates with zeros
      const result = [];
      const currentDate = new Date(startDate);
      const endDate = new Date(now);

      let rowIndex = 0;

      while (currentDate <= endDate) {
        const dateStr = formatDateToUTC(currentDate);

        if (rowIndex < rows.length && rows[rowIndex].date === dateStr) {
          result.push({
            date: dateStr,
            tokens: rows[rowIndex].tokens ?? 0,
            cost: rows[rowIndex].cost ?? 0,
            nodes: rows[rowIndex].nodes ?? 0,
          });
          rowIndex++;
        } else {
          result.push({
            date: dateStr,
            tokens: 0,
            cost: 0,
            nodes: 0,
          });
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      const durationMs = Date.now() - startTime;
      return reply.send(
        successResponse(
          {
            data: result,
            summary: {
              totalTokens: result.reduce((sum, d) => sum + d.tokens, 0),
              totalCost: result.reduce((sum, d) => sum + d.cost, 0),
              totalNodes: result.reduce((sum, d) => sum + d.nodes, 0),
            },
          },
          durationMs
        )
      );
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
