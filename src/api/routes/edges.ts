/**
 * Edges API routes
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

import type { EdgeType } from "../../storage/node-types.js";

import {
  createEdge,
  deleteEdge,
  getEdge,
  getEdgesFrom,
  getEdgesTo,
} from "../../storage/edge-repository.js";
import { parseIntParam } from "../query-params.js";
import { successResponse, errorResponse } from "../responses.js";

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
      const { nodeId, type, createdBy, limit, offset } = request.query;

      let edges: ReturnType<typeof getEdgesFrom> = [];
      let total = 0;

      if (nodeId) {
        // Get edges connected to this node (both directions)
        const outgoing = getEdgesFrom(db, nodeId);
        const incoming = getEdgesTo(db, nodeId);
        edges = [...outgoing, ...incoming];

        // Filter by type and createdBy if specified
        if (type) {
          edges = edges.filter((e) => e.type === type);
        }
        if (createdBy) {
          edges = edges.filter((e) => e.created_by === createdBy);
        }
        total = edges.length;
      } else {
        // Build query with filters applied at SQL level
        const conditions: string[] = [];
        const params: (string | number)[] = [];

        if (type) {
          conditions.push("type = ?");
          params.push(type);
        }
        if (createdBy) {
          conditions.push("created_by = ?");
          params.push(createdBy);
        }

        const whereClause =
          conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

        // Get total count
        const countStmt = db.prepare(
          `SELECT COUNT(*) as count FROM edges ${whereClause}`
        );
        const countResult = countStmt.get(...params) as { count: number };
        total = countResult.count;

        // Get paginated results
        const limitVal = Math.min(parseIntParam(limit) ?? 50, 500);
        const offsetVal = parseIntParam(offset) ?? 0;

        const stmt = db.prepare(`
          SELECT * FROM edges
          ${whereClause}
          ORDER BY created_at DESC
          LIMIT ? OFFSET ?
        `);
        edges = stmt.all(...params, limitVal, offsetVal) as typeof edges;
      }

      const durationMs = Date.now() - startTime;
      return reply.send(
        successResponse(
          {
            edges,
            total,
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
