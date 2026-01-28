/**
 * Query API routes - Natural language queries against the knowledge graph
 *
 * POST /api/v1/query - Answer questions using pi agent + RLM
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

import * as os from "node:os";
import * as path from "node:path";

import {
  createEmbeddingProvider,
  type EmbeddingProvider,
} from "../../daemon/facet-discovery.js";
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
  semanticSearchThreshold: 0.5,
};

/**
 * Cached embedding provider instance.
 * Created once on first use to avoid HTTP client setup overhead per request.
 */
let cachedEmbeddingProvider: EmbeddingProvider | undefined;
let cachedEmbeddingConfig: string | undefined;

/**
 * Get or create the embedding provider with caching.
 * Cache is invalidated if the configuration changes.
 */
function getEmbeddingProvider(config: {
  embeddingProvider?: "openrouter" | "ollama" | "openai";
  embeddingModel?: string;
  embeddingApiKey?: string;
  embeddingBaseUrl?: string;
  embeddingDimensions?: number;
}): EmbeddingProvider | undefined {
  if (!config.embeddingProvider || !config.embeddingModel) {
    return undefined;
  }

  // Check if API key is required but missing
  const needsApiKey =
    config.embeddingProvider === "openrouter" ||
    config.embeddingProvider === "openai";
  if (needsApiKey && !config.embeddingApiKey) {
    return undefined;
  }

  // Create cache key from config to detect changes
  const configKey = JSON.stringify({
    provider: config.embeddingProvider,
    model: config.embeddingModel,
    apiKey: config.embeddingApiKey,
    baseUrl: config.embeddingBaseUrl,
    dimensions: config.embeddingDimensions,
  });

  // Return cached instance if config hasn't changed
  if (cachedEmbeddingProvider && cachedEmbeddingConfig === configKey) {
    return cachedEmbeddingProvider;
  }

  // Create new provider and cache it
  cachedEmbeddingProvider = createEmbeddingProvider({
    provider: config.embeddingProvider,
    model: config.embeddingModel,
    apiKey: config.embeddingApiKey,
    baseUrl: config.embeddingBaseUrl,
    dimensions: config.embeddingDimensions,
  });
  cachedEmbeddingConfig = configKey;

  return cachedEmbeddingProvider;
}

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

        // Get cached embedding provider for semantic search (if configured)
        let embeddingProvider: EmbeddingProvider | undefined;
        try {
          embeddingProvider = getEmbeddingProvider(effectiveConfig);
        } catch (error) {
          app.log.warn(
            `Failed to create embedding provider: ${error instanceof Error ? error.message : "Unknown error"}`
          );
          // Continue without semantic search
        }

        const response: QueryResponse = await processQuery(queryRequest, {
          db,
          daemonConfig: effectiveConfig,
          queryPromptFile: path.join(
            os.homedir(),
            ".pi-brain",
            "prompts",
            "brain-query.md"
          ),
          embeddingProvider,
          semanticSearchThreshold: effectiveConfig.semanticSearchThreshold,
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
