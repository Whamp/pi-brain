/**
 * Lessons API routes
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

import {
  getLessonsByLevel,
  listLessons,
  type ListLessonsFilters,
  type ListLessonsOptions,
} from "../../storage/lesson-repository.js";
import { successResponse } from "../responses.js";

/**
 * Parse comma-separated string to array
 */
function parseArrayParam(value: string | undefined): string[] | undefined {
  if (!value) {
    return undefined;
  }
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

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

export async function lessonsRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /lessons - List lessons with filtering
   */
  app.get(
    "/",
    async (
      request: FastifyRequest<{
        Querystring: {
          level?: string;
          project?: string;
          tags?: string;
          confidence?: string;
          limit?: string;
          offset?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const startTime = request.startTime ?? Date.now();
      const { db } = app.ctx;
      const { query } = request;

      const filters: ListLessonsFilters = {
        level: query.level as ListLessonsFilters["level"],
        project: query.project,
        tags: parseArrayParam(query.tags),
        confidence: query.confidence as ListLessonsFilters["confidence"],
      };

      const options: ListLessonsOptions = {
        limit: parseIntParam(query.limit),
        offset: parseIntParam(query.offset),
      };

      const result = listLessons(db, filters, options);

      const durationMs = Date.now() - startTime;
      return reply.send(successResponse(result, durationMs));
    }
  );

  /**
   * GET /lessons/by-level - Get lessons grouped by level
   */
  app.get("/by-level", async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = request.startTime ?? Date.now();
    const { db } = app.ctx;

    const result = getLessonsByLevel(db);

    const durationMs = Date.now() - startTime;
    return reply.send(successResponse(result, durationMs));
  });
}
