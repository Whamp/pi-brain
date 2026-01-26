/**
 * Sessions API routes
 *
 * Provides endpoints for browsing sessions organized by project.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

import {
  getAllProjects,
  listNodes,
  type NodeRow,
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

/**
 * Session summary for the file browser
 */
interface SessionSummary {
  sessionFile: string;
  nodeCount: number;
  firstTimestamp: string;
  lastTimestamp: string;
  outcomes: {
    success: number;
    partial: number;
    failed: number;
    abandoned: number;
  };
  types: string[];
  totalTokens: number;
  totalCost: number;
}

/**
 * Project summary for the file browser
 */
interface ProjectSummary {
  project: string;
  sessionCount: number;
  nodeCount: number;
  lastActivity: string;
}

export async function sessionsRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /sessions/projects - List all projects with summary stats
   */
  app.get("/projects", async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = request.startTime ?? Date.now();
    const { db } = app.ctx;

    // Get all projects
    const projects = getAllProjects(db);

    // Get summary stats for each project
    const projectSummaries: ProjectSummary[] = projects.map((project) => {
      // Count nodes and get last activity for this project
      const result = listNodes(
        db,
        { project },
        { limit: 1, sort: "timestamp", order: "desc" }
      );

      // Get unique session count
      const allNodes = listNodes(db, { project }, { limit: 10_000 });
      const sessionFiles = new Set(allNodes.nodes.map((n) => n.session_file));

      return {
        project,
        sessionCount: sessionFiles.size,
        nodeCount: result.total,
        lastActivity:
          result.nodes.length > 0
            ? result.nodes[0].timestamp
            : new Date().toISOString(),
      };
    });

    // Sort by last activity (most recent first)
    projectSummaries.sort(
      (a, b) =>
        new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
    );

    const durationMs = Date.now() - startTime;
    return reply.send(
      successResponse(
        {
          projects: projectSummaries,
          total: projectSummaries.length,
        },
        durationMs
      )
    );
  });

  /**
   * GET /sessions/by-project/:project - List sessions for a project
   */
  app.get(
    "/by-project/*",
    async (
      request: FastifyRequest<{
        Params: { "*": string };
        Querystring: { limit?: string; offset?: string };
      }>,
      reply: FastifyReply
    ) => {
      const startTime = request.startTime ?? Date.now();
      const { db } = app.ctx;
      const project = "/" + request.params["*"]; // Reconstruct absolute path
      const limit = parseIntParam(request.query.limit) ?? 50;
      const offset = parseIntParam(request.query.offset) ?? 0;

      // Get all nodes for this project
      const allNodes = listNodes(db, { project }, { limit: 10_000 });

      if (allNodes.nodes.length === 0) {
        return reply
          .status(404)
          .send(
            errorResponse(
              "NOT_FOUND",
              `No sessions found for project: ${project}`
            )
          );
      }

      // Group nodes by session file
      const sessionMap = new Map<string, NodeRow[]>();
      for (const node of allNodes.nodes) {
        const sessionFile = node.session_file;
        const existing = sessionMap.get(sessionFile);
        if (existing) {
          existing.push(node);
        } else {
          sessionMap.set(sessionFile, [node]);
        }
      }

      // Build session summaries
      const sessions: SessionSummary[] = [];
      for (const [sessionFile, nodes] of sessionMap) {
        const outcomes = { success: 0, partial: 0, failed: 0, abandoned: 0 };
        const types = new Set<string>();
        let totalTokens = 0;
        let totalCost = 0;
        let firstTimestamp = nodes[0].timestamp;
        let lastTimestamp = nodes[0].timestamp;

        for (const node of nodes) {
          // Count outcomes
          const { outcome } = node;
          if (outcome && outcome in outcomes) {
            outcomes[outcome as keyof typeof outcomes]++;
          }

          // Collect types
          if (node.type) {
            types.add(node.type);
          }

          // Sum tokens and cost
          totalTokens += node.tokens_used;
          totalCost += node.cost;

          // Track timestamp range
          const ts = node.timestamp;
          if (ts < firstTimestamp) {
            firstTimestamp = ts;
          }
          if (ts > lastTimestamp) {
            lastTimestamp = ts;
          }
        }

        sessions.push({
          sessionFile,
          nodeCount: nodes.length,
          firstTimestamp,
          lastTimestamp,
          outcomes,
          types: [...types],
          totalTokens,
          totalCost,
        });
      }

      // Sort by last timestamp (most recent first)
      sessions.sort(
        (a, b) =>
          new Date(b.lastTimestamp).getTime() -
          new Date(a.lastTimestamp).getTime()
      );

      // Paginate
      const total = sessions.length;
      const paginatedSessions = sessions.slice(offset, offset + limit);

      const durationMs = Date.now() - startTime;
      return reply.send(
        successResponse(
          {
            project,
            sessions: paginatedSessions,
            total,
            limit,
            offset,
          },
          durationMs
        )
      );
    }
  );

  /**
   * GET /sessions/nodes - List nodes for a specific session file
   */
  app.get(
    "/nodes",
    async (
      request: FastifyRequest<{
        Querystring: {
          sessionFile: string;
          limit?: string;
          offset?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const startTime = request.startTime ?? Date.now();
      const { db } = app.ctx;
      const { sessionFile } = request.query;
      const limit = parseIntParam(request.query.limit) ?? 50;
      const offset = parseIntParam(request.query.offset) ?? 0;

      if (!sessionFile) {
        return reply
          .status(400)
          .send(
            errorResponse(
              "BAD_REQUEST",
              "sessionFile query parameter is required"
            )
          );
      }

      // Get all nodes for this session
      // We query by finding nodes that match the session file
      const allNodes = listNodes(db, {}, { limit: 10_000 });
      const sessionNodes = allNodes.nodes.filter(
        (n) => n.session_file === sessionFile
      );

      if (sessionNodes.length === 0) {
        return reply
          .status(404)
          .send(
            errorResponse(
              "NOT_FOUND",
              `No nodes found for session: ${sessionFile}`
            )
          );
      }

      // Sort by timestamp
      sessionNodes.sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      // Paginate
      const total = sessionNodes.length;
      const paginatedNodes = sessionNodes.slice(offset, offset + limit);

      // Get project from first node
      const [{ project }] = sessionNodes;

      const durationMs = Date.now() - startTime;
      return reply.send(
        successResponse(
          {
            sessionFile,
            project,
            nodes: paginatedNodes,
            total,
            limit,
            offset,
          },
          durationMs
        )
      );
    }
  );
}
