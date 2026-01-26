/**
 * Patterns API routes
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

import {
  listFailurePatterns,
  listLessonPatterns,
  listModelStats,
} from "../../storage/pattern-repository.js";
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

export async function patternsRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /patterns/failures - List aggregated failure patterns
   */
  app.get(
    "/failures",
    async (
      request: FastifyRequest<{
        Querystring: {
          limit?: string;
          offset?: string;
          minOccurrences?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const startTime = request.startTime ?? Date.now();
      const { db } = app.ctx;
      const { query } = request;

      const result = listFailurePatterns(db, {
        limit: parseIntParam(query.limit),
        offset: parseIntParam(query.offset),
        minOccurrences: parseIntParam(query.minOccurrences),
      });

      const durationMs = Date.now() - startTime;
      return reply.send(successResponse(result, durationMs));
    }
  );

  /**
   * GET /patterns/models - List aggregated model stats
   */
  app.get("/models", async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = request.startTime ?? Date.now();
    const { db } = app.ctx;

    const result = listModelStats(db);

    const durationMs = Date.now() - startTime;
    return reply.send(successResponse(result, durationMs));
  });

  /**
   * GET /patterns/lessons - List aggregated lesson patterns
   */
  app.get(
    "/lessons",
    async (
      request: FastifyRequest<{
        Querystring: {
          limit?: string;
          offset?: string;
          level?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const startTime = request.startTime ?? Date.now();
      const { db } = app.ctx;
      const { query } = request;

      const result = listLessonPatterns(db, {
        limit: parseIntParam(query.limit),
        offset: parseIntParam(query.offset),
        level: query.level,
      });

      const durationMs = Date.now() - startTime;
      return reply.send(successResponse(result, durationMs));
    }
  );
}
