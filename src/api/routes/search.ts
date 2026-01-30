/**
 * Search API routes
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

import type { ListNodesFilters } from "../../storage/node-queries.js";

import {
  searchNodesAdvanced,
  type SearchField,
  type SearchOptions,
} from "../../storage/search-repository.js";
import { parseArrayParam, parseIntParam } from "../query-params.js";
import { successResponse } from "../responses.js";

export async function searchRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /search - Full-text search across nodes
   */
  app.get(
    "/",
    async (
      request: FastifyRequest<{
        Querystring: {
          q?: string;
          fields?: string;
          limit?: string;
          offset?: string;
          project?: string;
          type?: string;
          outcome?: string;
          from?: string;
          to?: string;
          tags?: string;
          topics?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const startTime = request.startTime ?? Date.now();
      const { db } = app.ctx;
      const { query } = request;

      const searchQuery = query.q ?? "";

      // Build filters from query params
      const filters: ListNodesFilters = {
        project: query.project,
        type: query.type as ListNodesFilters["type"],
        outcome: query.outcome as ListNodesFilters["outcome"],
        from: query.from,
        to: query.to,
        tags: parseArrayParam(query.tags),
        topics: parseArrayParam(query.topics),
      };

      const options: SearchOptions = {
        fields: parseArrayParam(query.fields) as SearchField[] | undefined,
        limit: parseIntParam(query.limit),
        offset: parseIntParam(query.offset),
        filters,
      };

      const result = searchNodesAdvanced(db, searchQuery, options);

      const durationMs = Date.now() - startTime;
      return reply.send(
        successResponse(
          {
            results: result.results,
            total: result.total,
            limit: result.limit,
            offset: result.offset,
          },
          durationMs
        )
      );
    }
  );
}
