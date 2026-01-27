/**
 * Patterns API routes
 */

import type {
  FastifyBaseLogger,
  FastifyInstance,
  FastifyRequest,
  FastifyReply,
} from "fastify";

import {
  listFailurePatterns,
  listLessonPatterns,
  listModelStats,
} from "../../storage/pattern-repository.js";
import { successResponse } from "../responses.js";

/**
 * Parse integer query param with optional debug logging for invalid values
 */
function parseIntParam(
  value: string | undefined,
  paramName?: string,
  logger?: FastifyBaseLogger
): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const num = Number.parseInt(value, 10);
  if (Number.isNaN(num)) {
    logger?.debug(
      { param: paramName, value },
      "Invalid integer param, using default"
    );
    return undefined;
  }
  return num;
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
        limit: parseIntParam(query.limit, "limit", request.log),
        offset: parseIntParam(query.offset, "offset", request.log),
        minOccurrences: parseIntParam(
          query.minOccurrences,
          "minOccurrences",
          request.log
        ),
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
        limit: parseIntParam(query.limit, "limit", request.log),
        offset: parseIntParam(query.offset, "offset", request.log),
        level: query.level,
      });

      const durationMs = Date.now() - startTime;
      return reply.send(successResponse(result, durationMs));
    }
  );
}
