/**
 * Sessions API routes
 *
 * Provides endpoints for browsing sessions organized by project.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

import { nodeRowsToNodes } from "../../storage/node-conversion.js";
import {
  getAllProjects,
  getSessionSummaries,
  listNodes,
} from "../../storage/node-queries.js";
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
        { exactProject: project },
        { limit: 1, sort: "timestamp", order: "desc" }
      );

      // Get unique session count via aggregation query
      // This is efficient because it groups by session_file
      const sessionSummaries = getSessionSummaries(db, project, {
        limit: 100_000,
      });

      return {
        project,
        sessionCount: sessionSummaries.length,
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
   * GET /sessions/list - List sessions for a project
   */
  app.get(
    "/list",
    async (
      request: FastifyRequest<{
        Querystring: {
          project: string;
          limit?: string;
          offset?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const startTime = request.startTime ?? Date.now();
      const { db } = app.ctx;
      const { project } = request.query;
      const limit = parseIntParam(request.query.limit) ?? 50;
      const offset = parseIntParam(request.query.offset) ?? 0;

      if (!project) {
        return reply
          .status(400)
          .send(
            errorResponse("BAD_REQUEST", "project query parameter is required")
          );
      }

      // Check if project has any nodes at all
      const checkResult = listNodes(
        db,
        { exactProject: project },
        { limit: 1 }
      );

      if (checkResult.total === 0) {
        return reply
          .status(404)
          .send(
            errorResponse(
              "NOT_FOUND",
              `No sessions found for project: ${project}`
            )
          );
      }

      // Get session summaries using efficient aggregation
      // We'll run getSessionSummaries with a high limit to get total count
      // This is slightly inefficient but better than loading full nodes.
      const allSummaries = getSessionSummaries(db, project, { limit: 100_000 });
      const total = allSummaries.length;

      // Now get the page (we could just slice allSummaries, but let's trust the DB limit for the page)
      // Actually, since we fetched all to count, we can slice here.
      const pageSummaries = allSummaries.slice(offset, offset + limit);

      const sessions: SessionSummary[] = pageSummaries.map((row) => ({
        sessionFile: row.sessionFile,
        nodeCount: row.nodeCount,
        firstTimestamp: row.firstTimestamp,
        lastTimestamp: row.lastTimestamp,
        outcomes: {
          success: row.successCount,
          partial: row.partialCount,
          failed: row.failedCount,
          abandoned: row.abandonedCount,
        },
        types: row.types ? row.types.split(",") : [],
        totalTokens: row.totalTokens,
        totalCost: row.totalCost,
      }));

      const durationMs = Date.now() - startTime;
      return reply.send(
        successResponse(
          {
            project,
            sessions,
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

      // Get nodes for this session using the database filter
      const result = listNodes(
        db,
        { sessionFile },
        { limit, offset, sort: "timestamp", order: "asc" }
      );
      const sessionNodes = nodeRowsToNodes(result.nodes);
      const { total } = result;

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

      // Get project from first node
      const project = sessionNodes[0]?.classification.project;

      const durationMs = Date.now() - startTime;
      return reply.send(
        successResponse(
          {
            sessionFile,
            project,
            nodes: sessionNodes,
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
