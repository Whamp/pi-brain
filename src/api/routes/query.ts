/**
 * Query API routes - Natural language queries against the knowledge graph
 *
 * POST /api/v1/query - Answer questions using pi agent + RLM
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

import * as os from "node:os";
import * as path from "node:path";

import {
  processQuery,
  type QueryRequest,
  type QueryResponse,
} from "../../daemon/query-processor.js";
import { successResponse, errorResponse } from "../responses.js";

/** Default daemon config for query processing */
const DEFAULT_QUERY_CONFIG = {
  provider: "zai",
  model: "glm-4.7",
  promptFile: path.join(
    os.homedir(),
    ".pi-brain",
    "prompts",
    "session-analyzer.md"
  ),
  parallelWorkers: 1,
  idleTimeoutMinutes: 10,
  analysisTimeoutMinutes: 5,
  reanalysisSchedule: "0 2 * * *",
  maxRetries: 3,
  retryDelaySeconds: 30,
  connectionDiscoverySchedule: "0 3 * * *",
  patternAggregationSchedule: "0 3 * * *",
  clusteringSchedule: "0 4 * * *",
  embeddingProvider: "openrouter" as const,
  embeddingModel: "qwen/qwen3-embedding-8b",
  maxConcurrentAnalysis: 2,
  maxQueueSize: 100,
};

export async function queryRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /query - Natural language query
   *
   * Request body:
   * {
   *   query: string,
   *   context?: { project?: string, model?: string },
   *   options?: { maxNodes?: number, includeDetails?: boolean }
   * }
   */
  app.post(
    "/",
    async (
      request: FastifyRequest<{
        Body: {
          query?: string;
          context?: {
            project?: string;
            model?: string;
          };
          options?: {
            maxNodes?: number;
            includeDetails?: boolean;
          };
        };
      }>,
      reply: FastifyReply
    ) => {
      const startTime = request.startTime ?? Date.now();
      const { db, daemonConfig } = app.ctx;
      const { body } = request;

      // Validate query
      if (
        !body.query ||
        typeof body.query !== "string" ||
        body.query.trim() === ""
      ) {
        return reply
          .status(400)
          .send(
            errorResponse(
              "BAD_REQUEST",
              "Query is required and must be a non-empty string"
            )
          );
      }

      const queryRequest: QueryRequest = {
        query: body.query.trim(),
        context: body.context,
        options: body.options,
      };

      try {
        // Use daemonConfig from context if available, otherwise fall back to defaults
        const effectiveConfig = daemonConfig ?? DEFAULT_QUERY_CONFIG;
        const response: QueryResponse = await processQuery(queryRequest, {
          db,
          daemonConfig: effectiveConfig,
          queryPromptFile: path.join(
            os.homedir(),
            ".pi-brain",
            "prompts",
            "brain-query.md"
          ),
        });

        const durationMs = Date.now() - startTime;
        return reply.send(successResponse(response, durationMs));
      } catch (error) {
        app.log.error(error);
        return reply
          .status(500)
          .send(
            errorResponse(
              "INTERNAL_ERROR",
              `Query processing failed: ${error instanceof Error ? error.message : "Unknown error"}`
            )
          );
      }
    }
  );

  /**
   * GET /query/health - Check if query processing is available
   */
  app.get("/health", async (_request: FastifyRequest, reply: FastifyReply) => {
    // Check if pi is available
    const { spawn } = await import("node:child_process");

    return new Promise((resolve) => {
      const proc = spawn("which", ["pi"], {
        stdio: ["ignore", "pipe", "pipe"],
      });
      let resolved = false;

      proc.on("close", (code) => {
        if (resolved) {
          return;
        }
        resolved = true;

        if (code === 0) {
          resolve(
            reply.send(
              successResponse({
                available: true,
                message: "Query processing is available",
              })
            )
          );
        } else {
          resolve(
            reply.send(
              successResponse({
                available: false,
                message: "pi command not found in PATH",
              })
            )
          );
        }
      });

      proc.on("error", () => {
        if (resolved) {
          return;
        }
        resolved = true;

        resolve(
          reply.send(
            successResponse({
              available: false,
              message: "Failed to check pi availability",
            })
          )
        );
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        if (resolved) {
          return;
        }
        resolved = true;
        proc.kill();

        resolve(
          reply.send(
            successResponse({
              available: false,
              message: "Timeout checking pi availability",
            })
          )
        );
      }, 5000);
    });
  });
}
