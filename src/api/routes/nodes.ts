/**
 * Nodes API routes
 */

import type Database from "better-sqlite3";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

import type { EdgeType } from "../../storage/node-types.js";

import { getConnectedNodes } from "../../storage/graph-repository.js";
import { getAllNodeVersions, getNode } from "../../storage/index.js";
import { getNodeLessons } from "../../storage/lesson-repository.js";
import { nodeRowsToNodes } from "../../storage/node-conversion.js";
import {
  getNodeTags,
  getNodeTopics,
  listNodes,
  type ListNodesFilters,
  type ListNodesOptions,
} from "../../storage/node-queries.js";
import { readNodeFromPath } from "../../storage/node-storage.js";
import { getNodeQuirks } from "../../storage/quirk-repository.js";
import { getNodeToolErrors } from "../../storage/tool-error-repository.js";
import { successResponse, errorResponse } from "../responses.js";

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
 * Parse boolean query param
 */
function parseBooleanParam(value: string | undefined): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }
  return value === "true" || value === "1";
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

// =============================================================================
// Include Data Fetchers
// =============================================================================

/**
 * Lookup table for include data fetchers
 * Each key maps to a function that fetches the relevant data
 */
function buildIncludeFetchers(
  db: Database.Database,
  id: string
): Record<string, () => unknown> {
  return {
    lessons: () => getNodeLessons(db, id),
    quirks: () => getNodeQuirks(db, id),
    errors: () => getNodeToolErrors(db, id),
    tags: () => getNodeTags(db, id),
    topics: () => getNodeTopics(db, id),
    edges: () => {
      const connected = getConnectedNodes(db, id, { depth: 1 });
      return connected.edges;
    },
    versions: () => {
      const allVersions = getAllNodeVersions(id);
      return allVersions.map((v) => ({
        version: v.version,
        analyzedAt: v.metadata.analyzedAt,
      }));
    },
  };
}

/**
 * Populate response data based on include params
 */
function populateIncludeData(
  responseData: Record<string, unknown>,
  includes: string[],
  fetchers: Record<string, () => unknown>
): void {
  const isFull = includes.includes("full");

  for (const [key, fetcher] of Object.entries(fetchers)) {
    if (isFull || includes.includes(key)) {
      responseData[key] = fetcher();
    }
  }
}

export async function nodesRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /nodes - List nodes with filtering and pagination
   */
  app.get(
    "/",
    async (
      request: FastifyRequest<{
        Querystring: {
          project?: string;
          type?: string;
          outcome?: string;
          from?: string;
          to?: string;
          tags?: string;
          topics?: string;
          computer?: string;
          hadClearGoal?: string;
          isNewProject?: string;
          limit?: string;
          offset?: string;
          sort?: string;
          order?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const startTime = request.startTime ?? Date.now();
      const { db } = app.ctx;
      const { query } = request;

      const filters: ListNodesFilters = {
        project: query.project,
        type: query.type as ListNodesFilters["type"],
        outcome: query.outcome as ListNodesFilters["outcome"],
        from: query.from,
        to: query.to,
        tags: parseArrayParam(query.tags),
        topics: parseArrayParam(query.topics),
        computer: query.computer,
        hadClearGoal: parseBooleanParam(query.hadClearGoal),
        isNewProject: parseBooleanParam(query.isNewProject),
      };

      const options: ListNodesOptions = {
        limit: parseIntParam(query.limit),
        offset: parseIntParam(query.offset),
        sort: query.sort as ListNodesOptions["sort"],
        order: query.order as ListNodesOptions["order"],
      };

      const result = listNodes(db, filters, options);
      const transformedResult = {
        ...result,
        nodes: nodeRowsToNodes(result.nodes),
      };
      const durationMs = Date.now() - startTime;

      return reply.send(successResponse(transformedResult, durationMs));
    }
  );

  /**
   * GET /nodes/:id - Get a single node by ID
   */
  app.get(
    "/:id",
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Querystring: {
          version?: string;
          include?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const startTime = request.startTime ?? Date.now();
      const { db } = app.ctx;
      const { id } = request.params;
      const { include } = request.query;

      // Get node from SQLite (for queryable fields)
      // Version lookup not yet implemented - always returns latest
      const nodeRow = getNode(db, id);

      if (!nodeRow) {
        return reply
          .status(404)
          .send(errorResponse("NOT_FOUND", `Node not found: ${id}`));
      }

      // Read full node data from JSON
      const node = readNodeFromPath(nodeRow.data_file);

      const responseData: Record<string, unknown> = { node };

      // Include related data based on include param
      const includes = parseArrayParam(include) ?? [];
      const fetchers = buildIncludeFetchers(db, id);
      populateIncludeData(responseData, includes, fetchers);

      const durationMs = Date.now() - startTime;
      return reply.send(successResponse(responseData, durationMs));
    }
  );

  /**
   * GET /nodes/:id/connected - Get connected nodes (graph traversal)
   */
  app.get(
    "/:id/connected",
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Querystring: {
          depth?: string;
          direction?: string;
          edgeTypes?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const startTime = request.startTime ?? Date.now();
      const { db } = app.ctx;
      const { id } = request.params;
      const { depth, direction, edgeTypes } = request.query;

      // Verify node exists
      const nodeRow = getNode(db, id);
      if (!nodeRow) {
        return reply
          .status(404)
          .send(errorResponse("NOT_FOUND", `Node not found: ${id}`));
      }

      const result = getConnectedNodes(db, id, {
        depth: parseIntParam(depth),
        direction: direction as "incoming" | "outgoing" | "both" | undefined,
        edgeTypes: parseArrayParam(edgeTypes) as EdgeType[] | undefined,
      });

      const transformedResult = {
        ...result,
        nodes: nodeRowsToNodes(result.nodes),
      };

      const durationMs = Date.now() - startTime;
      return reply.send(successResponse(transformedResult, durationMs));
    }
  );
}
