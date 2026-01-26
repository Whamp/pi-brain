/**
 * Daemon Decisions API routes
 *
 * Provides endpoints for viewing and providing feedback on daemon decisions.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

import {
  listDecisions,
  updateDecisionFeedback,
} from "../../storage/decision-repository.js";
import { successResponse, errorResponse } from "../responses.js";

/**
 * Parse integer query param
 */
function parseIntParam(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const num = Number.parseInt(value, 10);
  return Number.isNaN(num) ? undefined : num;
}

export async function decisionsRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /decisions - List daemon decisions
   */
  app.get(
    "/",
    async (
      request: FastifyRequest<{
        Querystring: {
          decision?: string;
          project?: string;
          from?: string;
          to?: string;
          limit?: string;
          offset?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const startTime = request.startTime ?? Date.now();
      const { db } = app.ctx;
      const { decision, project, from, to } = request.query;
      const limit = parseIntParam(request.query.limit);
      const offset = parseIntParam(request.query.offset);

      const result = listDecisions(
        db,
        { decision, project, from, to },
        { limit, offset }
      );

      const durationMs = Date.now() - startTime;
      return reply.send(successResponse(result, durationMs));
    }
  );

  /**
   * POST /decisions/:id/feedback - Update user feedback
   */
  app.post(
    "/:id/feedback",
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: { feedback: string | null };
      }>,
      reply: FastifyReply
    ) => {
      const startTime = request.startTime ?? Date.now();
      const { db } = app.ctx;
      const { id } = request.params;
      const { feedback } = request.body;

      const updated = updateDecisionFeedback(db, id, feedback);

      if (!updated) {
        return reply
          .status(404)
          .send(errorResponse("NOT_FOUND", `Decision not found: ${id}`));
      }

      const durationMs = Date.now() - startTime;
      return reply.send(
        successResponse({ id, feedback, updated: true }, durationMs)
      );
    }
  );
}
