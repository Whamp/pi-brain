/**
 * Tool Errors API routes
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

import {
  listToolErrors,
  getAggregatedToolErrors,
  getToolErrorStats,
  type ListToolErrorsFilters,
  type ListToolErrorsOptions,
} from "../../storage/node-repository.js";
import { successResponse } from "../responses.js";

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

export async function toolErrorsRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /tool-errors - List tool errors with filtering
   */
  app.get(
    "/",
    async (
      request: FastifyRequest<{
        Querystring: {
          tool?: string;
          model?: string;
          errorType?: string;
          project?: string;
          limit?: string;
          offset?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const startTime = request.startTime ?? Date.now();
      const { db } = app.ctx;
      const { query } = request;

      const filters: ListToolErrorsFilters = {
        tool: query.tool,
        model: query.model,
        errorType: query.errorType,
        project: query.project,
      };

      const options: ListToolErrorsOptions = {
        limit: parseIntParam(query.limit),
        offset: parseIntParam(query.offset),
      };

      const result = listToolErrors(db, filters, options);

      const durationMs = Date.now() - startTime;
      return reply.send(successResponse(result, durationMs));
    }
  );

  /**
   * GET /tool-errors/aggregated - Get grouped tool errors
   */
  app.get(
    "/aggregated",
    async (
      request: FastifyRequest<{
        Querystring: {
          tool?: string;
          model?: string;
          limit?: string;
          offset?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const startTime = request.startTime ?? Date.now();
      const { db } = app.ctx;
      const { query } = request;

      const result = getAggregatedToolErrors(
        db,
        {
          tool: query.tool,
          model: query.model,
        },
        {
          limit: parseIntParam(query.limit),
          offset: parseIntParam(query.offset),
        }
      );

      const durationMs = Date.now() - startTime;
      return reply.send(successResponse(result, durationMs));
    }
  );

  /**
   * GET /tool-errors/stats - Get tool error statistics for dashboard
   */
  app.get("/stats", async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = request.startTime ?? Date.now();
    const { db } = app.ctx;

    const stats = getToolErrorStats(db);

    const durationMs = Date.now() - startTime;
    return reply.send(successResponse(stats, durationMs));
  });
}
