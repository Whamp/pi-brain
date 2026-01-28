/**
 * Nodes API routes
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

import type { EdgeType } from "../../storage/node-types.js";

import { getConnectedNodes } from "../../storage/graph-repository.js";
import { getNodeLessons } from "../../storage/lesson-repository.js";
import {
  getNodeTags,
  getNodeTopics,
  listNodes,
  type ListNodesFilters,
  type ListNodesOptions,
} from "../../storage/node-queries.js";
import { getAllNodeVersions, getNode } from "../../storage/node-repository.js";
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
      const durationMs = Date.now() - startTime;

      return reply.send(successResponse(result, durationMs));
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

      if (includes.includes("lessons") || includes.includes("full")) {
        responseData.lessons = getNodeLessons(db, id);
      }

      if (includes.includes("quirks") || includes.includes("full")) {
        responseData.quirks = getNodeQuirks(db, id);
      }

      if (includes.includes("errors") || includes.includes("full")) {
        responseData.errors = getNodeToolErrors(db, id);
      }

      if (includes.includes("tags") || includes.includes("full")) {
        responseData.tags = getNodeTags(db, id);
      }

      if (includes.includes("topics") || includes.includes("full")) {
        responseData.topics = getNodeTopics(db, id);
      }

      if (includes.includes("edges") || includes.includes("full")) {
        const connected = getConnectedNodes(db, id, { depth: 1 });
        responseData.edges = connected.edges;
      }

      if (includes.includes("versions") || includes.includes("full")) {
        // Return version metadata only (not full node data)
        const allVersions = getAllNodeVersions(id);
        responseData.versions = allVersions.map((v) => ({
          version: v.version,
          analyzedAt: v.metadata.analyzedAt,
        }));
      }

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

      const durationMs = Date.now() - startTime;
      return reply.send(successResponse(result, durationMs));
    }
  );
}
