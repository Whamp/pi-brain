/**
 * Fastify API server for pi-brain
 *
 * Provides REST endpoints for querying the knowledge graph
 * and WebSocket for real-time updates.
 */

import type { Database } from "better-sqlite3";

import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import Fastify, {
  type FastifyInstance,
  type FastifyRequest,
  type FastifyReply,
} from "fastify";

import type { ApiConfig } from "../config/types.js";

import { errorResponse } from "./responses.js";
import { agentsRoutes } from "./routes/agents.js";
import { clustersRoutes } from "./routes/clusters.js";
import { configRoutes } from "./routes/config.js";
import { daemonRoutes } from "./routes/daemon.js";
import { decisionsRoutes } from "./routes/decisions.js";
import { edgesRoutes } from "./routes/edges.js";
import { lessonsRoutes } from "./routes/lessons.js";
import { nodesRoutes } from "./routes/nodes.js";
import { patternsRoutes } from "./routes/patterns.js";
import { promptLearningRoutes } from "./routes/prompt-learning.js";
import { queryRoutes } from "./routes/query.js";
import { quirksRoutes } from "./routes/quirks.js";
import { searchRoutes } from "./routes/search.js";
import { sessionsRoutes } from "./routes/sessions.js";
import { statsRoutes } from "./routes/stats.js";
import { toolErrorsRoutes } from "./routes/tool-errors.js";

// Re-export response helpers for convenience
export { successResponse, errorResponse } from "./responses.js";
export type { ApiErrorCode } from "./responses.js";

/**
 * Server context passed to route handlers
 */
export interface ServerContext {
  db: Database;
  config: ApiConfig;
}

/**
 * Extend FastifyRequest to include timing
 */
declare module "fastify" {
  interface FastifyRequest {
    startTime?: number;
  }
}

/**
 * Create and configure the Fastify server
 */
export async function createServer(
  db: Database,
  config: ApiConfig
): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
    },
  });

  // Register CORS for development
  await app.register(cors, {
    origin: config.corsOrigins,
    credentials: true,
  });

  // Register WebSocket support
  await app.register(websocket);

  // Add timing hook
  app.addHook("onRequest", async (request) => {
    request.startTime = Date.now();
  });

  // Decorate with context
  const context: ServerContext = { db, config };
  app.decorate("ctx", context);

  // Health check endpoint
  app.get("/health", async () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
  }));

  // API v1 routes
  await app.register(
    async (api) => {
      await api.register(nodesRoutes, { prefix: "/nodes" });
      await api.register(edgesRoutes, { prefix: "/edges" });
      await api.register(searchRoutes, { prefix: "/search" });
      await api.register(queryRoutes, { prefix: "/query" });
      await api.register(lessonsRoutes, { prefix: "/lessons" });
      await api.register(patternsRoutes, { prefix: "/patterns" });
      await api.register(quirksRoutes, { prefix: "/quirks" });
      await api.register(toolErrorsRoutes, { prefix: "/tool-errors" });
      await api.register(statsRoutes, { prefix: "/stats" });
      await api.register(daemonRoutes, { prefix: "/daemon" });
      await api.register(decisionsRoutes, { prefix: "/decisions" });
      await api.register(promptLearningRoutes, { prefix: "/prompt-learning" });
      await api.register(sessionsRoutes, { prefix: "/sessions" });
      await api.register(configRoutes, { prefix: "/config" });
      await api.register(clustersRoutes, { prefix: "" });
      await api.register(agentsRoutes, { prefix: "/agents" });
    },
    { prefix: "/api/v1" }
  );

  // Global error handler
  async function handleError(
    error: Error,
    _request: FastifyRequest,
    reply: FastifyReply
  ) {
    app.log.error(error);

    const statusCode =
      "statusCode" in error
        ? (error as { statusCode: number }).statusCode
        : 500;

    if (statusCode === 404) {
      return reply.status(404).send(errorResponse("NOT_FOUND", error.message));
    }

    if (statusCode === 400) {
      return reply
        .status(400)
        .send(errorResponse("BAD_REQUEST", error.message));
    }

    return reply
      .status(500)
      .send(errorResponse("INTERNAL_ERROR", "An unexpected error occurred"));
  }

  app.setErrorHandler(handleError);

  return app;
}

/**
 * Start the API server
 */
export async function startServer(
  db: Database,
  config: ApiConfig
): Promise<FastifyInstance> {
  const app = await createServer(db, config);

  await app.listen({
    port: config.port,
    host: config.host,
  });

  app.log.info(`API server listening on http://${config.host}:${config.port}`);

  return app;
}

// Extend Fastify instance to include context
declare module "fastify" {
  interface FastifyInstance {
    ctx: ServerContext;
  }
}
