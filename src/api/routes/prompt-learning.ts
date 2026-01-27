/**
 * Prompt Learning API routes
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

import {
  getEffectivenessHistory,
  getLatestEffectivenessBatch,
} from "../../prompt/effectiveness.js";
import {
  listInsights,
  getInsight,
  updateInsightPrompt,
} from "../../storage/pattern-repository.js";
import { successResponse, errorResponse } from "../responses.js";

export async function promptLearningRoutes(
  app: FastifyInstance
): Promise<void> {
  /**
   * GET /prompt-learning/insights - List insights with latest effectiveness
   */
  app.get(
    "/insights",
    async (
      request: FastifyRequest<{
        Querystring: {
          limit?: string;
          offset?: string;
          model?: string;
          promptIncluded?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const startTime = request.startTime ?? Date.now();
      const { db } = app.ctx;
      const { query } = request;

      const limit = query.limit ? Number.parseInt(query.limit, 10) : 50;
      const offset = query.offset ? Number.parseInt(query.offset, 10) : 0;

      let promptIncluded: boolean | undefined;
      if (query.promptIncluded === "true") {
        promptIncluded = true;
      } else if (query.promptIncluded === "false") {
        promptIncluded = false;
      }

      const insights = listInsights(db, {
        limit,
        offset,
        model: query.model,
        promptIncluded,
      });

      // Batch fetch effectiveness data for all insights (avoids N+1 queries)
      const insightIds = insights.map((i) => i.id);
      const effectivenessMap = getLatestEffectivenessBatch(db, insightIds);

      // Attach latest effectiveness to each insight
      const result = insights.map((insight) => ({
        ...insight,
        latestEffectiveness: effectivenessMap.get(insight.id) ?? null,
      }));

      const durationMs = Date.now() - startTime;
      return reply.send(successResponse(result, durationMs));
    }
  );

  /**
   * GET /prompt-learning/history/:insightId - Get effectiveness history
   */
  app.get(
    "/history/:insightId",
    async (
      request: FastifyRequest<{
        Params: { insightId: string };
      }>,
      reply: FastifyReply
    ) => {
      const startTime = request.startTime ?? Date.now();
      const { db } = app.ctx;
      const { insightId } = request.params;

      // Validate insightId format (16 hex chars)
      if (!/^[\da-f]{16}$/i.test(insightId)) {
        return reply
          .status(400)
          .send(errorResponse("Invalid insightId format", 400));
      }

      const history = getEffectivenessHistory(db, insightId);

      const durationMs = Date.now() - startTime;
      return reply.send(successResponse(history, durationMs));
    }
  );

  /**
   * POST /prompt-learning/toggle/:insightId - Enable/disable an insight
   */
  app.post(
    "/toggle/:insightId",
    async (
      request: FastifyRequest<{
        Params: { insightId: string };
        Body: { enabled: boolean };
      }>,
      reply: FastifyReply
    ) => {
      const startTime = request.startTime ?? Date.now();
      const { db } = app.ctx;
      const { insightId } = request.params;
      const { enabled } = request.body;

      // Validate insightId format (16 hex chars)
      if (!/^[\da-f]{16}$/i.test(insightId)) {
        return reply
          .status(400)
          .send(errorResponse("Invalid insightId format", 400));
      }

      // Validate enabled field
      if (typeof enabled !== "boolean") {
        return reply
          .status(400)
          .send(errorResponse("Invalid 'enabled' field: must be boolean", 400));
      }

      const insight = getInsight(db, insightId);
      if (!insight) {
        return reply.status(404).send(errorResponse("Insight not found", 404));
      }

      updateInsightPrompt(
        db,
        insightId,
        insight.promptText || "",
        enabled,
        insight.promptVersion
      );

      const durationMs = Date.now() - startTime;
      return reply.send(successResponse({ success: true }, durationMs));
    }
  );
}
