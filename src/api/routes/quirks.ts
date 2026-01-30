/**
 * Model Quirks API routes
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

import {
  getAggregatedQuirks,
  getQuirksByModel,
  listQuirks,
  type ListQuirksFilters,
  type ListQuirksOptions,
} from "../../storage/quirk-repository.js";
import { parseIntParam } from "../query-params.js";
import { successResponse } from "../responses.js";

export async function quirksRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /quirks - List model quirks with filtering
   */
  app.get(
    "/",
    async (
      request: FastifyRequest<{
        Querystring: {
          model?: string;
          frequency?: string;
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

      const filters: ListQuirksFilters = {
        model: query.model,
        frequency: query.frequency as ListQuirksFilters["frequency"],
        project: query.project,
      };

      const options: ListQuirksOptions = {
        limit: parseIntParam(query.limit),
        offset: parseIntParam(query.offset),
      };

      const result = listQuirks(db, filters, options);

      const durationMs = Date.now() - startTime;
      return reply.send(successResponse(result, durationMs));
    }
  );

  /**
   * GET /quirks/by-model - Get quirks grouped by model
   */
  app.get("/by-model", async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = request.startTime ?? Date.now();
    const { db } = app.ctx;

    const result = getQuirksByModel(db);

    const durationMs = Date.now() - startTime;
    return reply.send(successResponse(result, durationMs));
  });

  /**
   * GET /quirks/aggregated - Get aggregated quirks (grouped by observation)
   */
  app.get(
    "/aggregated",
    async (
      request: FastifyRequest<{
        Querystring: {
          limit?: string;
          minOccurrences?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const startTime = request.startTime ?? Date.now();
      const { db } = app.ctx;
      const { query } = request;

      const result = getAggregatedQuirks(db, {
        limit: parseIntParam(query.limit),
        minOccurrences: parseIntParam(query.minOccurrences),
      });

      const durationMs = Date.now() - startTime;
      return reply.send(successResponse(result, durationMs));
    }
  );
}
