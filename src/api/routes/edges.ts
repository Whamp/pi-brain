/**
 * Edges API routes
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

import type { EdgeType } from "../../storage/node-types.js";

import {
  getEdge,
  getEdgesFrom,
  getEdgesTo,
  createEdge,
  deleteEdge,
} from "../../storage/node-repository.js";
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

export async function edgesRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /edges - List edges with filtering
   */
  app.get(
    "/",
    async (
      request: FastifyRequest<{
        Querystring: {
          nodeId?: string;
          type?: string;
          createdBy?: string;
          limit?: string;
          offset?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const startTime = request.startTime ?? Date.now();
      const { db } = app.ctx;
      const { nodeId, type, limit, offset } = request.query;

      let edges: ReturnType<typeof getEdgesFrom> = [];

      if (nodeId) {
        // Get edges connected to this node (both directions)
        const outgoing = getEdgesFrom(db, nodeId);
        const incoming = getEdgesTo(db, nodeId);
        edges = [...outgoing, ...incoming];
      } else {
        // Get all edges (limited query via direct SQL)
        const stmt = db.prepare(`
          SELECT * FROM edges
          ORDER BY created_at DESC
          LIMIT ? OFFSET ?
        `);
        const limitVal = Math.min(parseIntParam(limit) ?? 50, 500);
        const offsetVal = parseIntParam(offset) ?? 0;
        edges = stmt.all(limitVal, offsetVal) as typeof edges;
      }

      // Filter by type if specified
      if (type) {
        edges = edges.filter((e) => e.type === type);
      }

      const durationMs = Date.now() - startTime;
      return reply.send(
        successResponse(
          {
            edges,
            total: edges.length,
          },
          durationMs
        )
      );
    }
  );

  /**
   * GET /edges/:id - Get a single edge
   */
  app.get(
    "/:id",
    async (
      request: FastifyRequest<{
        Params: { id: string };
      }>,
      reply: FastifyReply
    ) => {
      const startTime = request.startTime ?? Date.now();
      const { db } = app.ctx;
      const { id } = request.params;

      const edge = getEdge(db, id);

      if (!edge) {
        return reply
          .status(404)
          .send(errorResponse("NOT_FOUND", `Edge not found: ${id}`));
      }

      const durationMs = Date.now() - startTime;
      return reply.send(successResponse({ edge }, durationMs));
    }
  );

  /**
   * POST /edges - Create a new edge
   */
  app.post(
    "/",
    async (
      request: FastifyRequest<{
        Body: {
          sourceNodeId: string;
          targetNodeId: string;
          type: string;
          metadata?: Record<string, unknown>;
        };
      }>,
      reply: FastifyReply
    ) => {
      const startTime = request.startTime ?? Date.now();
      const { db } = app.ctx;
      const { sourceNodeId, targetNodeId, type, metadata } = request.body ?? {};

      if (!sourceNodeId || !targetNodeId || !type) {
        return reply
          .status(400)
          .send(
            errorResponse(
              "BAD_REQUEST",
              "sourceNodeId, targetNodeId, and type are required"
            )
          );
      }

      const edge = createEdge(
        db,
        sourceNodeId,
        targetNodeId,
        type as EdgeType,
        {
          metadata,
          createdBy: "user",
        }
      );

      const durationMs = Date.now() - startTime;
      return reply.status(201).send(successResponse({ edge }, durationMs));
    }
  );

  /**
   * DELETE /edges/:id - Delete an edge
   */
  app.delete(
    "/:id",
    async (
      request: FastifyRequest<{
        Params: { id: string };
      }>,
      reply: FastifyReply
    ) => {
      const startTime = request.startTime ?? Date.now();
      const { db } = app.ctx;
      const { id } = request.params;

      const deleted = deleteEdge(db, id);

      if (!deleted) {
        return reply
          .status(404)
          .send(errorResponse("NOT_FOUND", `Edge not found: ${id}`));
      }

      const durationMs = Date.now() - startTime;
      return reply.send(successResponse({ deleted: true }, durationMs));
    }
  );
}
