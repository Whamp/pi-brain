/**
 * Configuration API routes
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

import * as fs from "node:fs";
import * as yaml from "yaml";

import type { RawConfig } from "../../config/types.js";

import {
  DEFAULT_CONFIG_PATH,
  loadConfig,
  getDefaultDaemonConfig,
} from "../../config/config.js";
import { successResponse, errorResponse } from "../responses.js";

/**
 * Validation result - either success (null) or error message
 */
type ValidationResult = string | null;

/**
 * Validate an integer field is within a range
 */
function validateIntRange(
  value: number | undefined,
  field: string,
  min: number,
  max: number
): ValidationResult {
  if (value === undefined) {
    return null;
  }
  if (!Number.isInteger(value) || value < min || value > max) {
    return `${field} must be an integer between ${min} and ${max}`;
  }
  return null;
}

/**
 * Validate a float field is within a range
 */
function validateFloatRange(
  value: number | undefined,
  field: string,
  min: number,
  max: number
): ValidationResult {
  if (value === undefined) {
    return null;
  }
  if (typeof value !== "number" || value < min || value > max) {
    return `${field} must be a number between ${min} and ${max}`;
  }
  return null;
}

/**
 * Daemon configuration update request body
 */
interface DaemonConfigUpdateBody {
  provider?: string;
  model?: string;
  idleTimeoutMinutes?: number;
  parallelWorkers?: number;
  maxRetries?: number;
  retryDelaySeconds?: number;
  analysisTimeoutMinutes?: number;
  maxConcurrentAnalysis?: number;
  maxQueueSize?: number;
  backfillLimit?: number;
  reanalysisLimit?: number;
  connectionDiscoveryLimit?: number;
  connectionDiscoveryLookbackDays?: number;
  connectionDiscoveryCooldownHours?: number;
  semanticSearchThreshold?: number;
}

/**
 * Validate daemon configuration update fields
 */
function validateDaemonUpdate(body: DaemonConfigUpdateBody): ValidationResult {
  const {
    idleTimeoutMinutes,
    parallelWorkers,
    maxRetries,
    retryDelaySeconds,
    analysisTimeoutMinutes,
    maxConcurrentAnalysis,
    maxQueueSize,
    backfillLimit,
    reanalysisLimit,
    connectionDiscoveryLimit,
    connectionDiscoveryLookbackDays,
    connectionDiscoveryCooldownHours,
    semanticSearchThreshold,
  } = body;

  const validations: ValidationResult[] = [
    validateIntRange(idleTimeoutMinutes, "idleTimeoutMinutes", 1, 1440),
    validateIntRange(parallelWorkers, "parallelWorkers", 1, 10),
    validateIntRange(maxRetries, "maxRetries", 0, 10),
    validateIntRange(retryDelaySeconds, "retryDelaySeconds", 1, 3600),
    validateIntRange(analysisTimeoutMinutes, "analysisTimeoutMinutes", 1, 120),
    validateIntRange(maxConcurrentAnalysis, "maxConcurrentAnalysis", 1, 10),
    validateIntRange(maxQueueSize, "maxQueueSize", 10, 10_000),
    validateIntRange(backfillLimit, "backfillLimit", 1, 1000),
    validateIntRange(reanalysisLimit, "reanalysisLimit", 1, 1000),
    validateIntRange(
      connectionDiscoveryLimit,
      "connectionDiscoveryLimit",
      1,
      1000
    ),
    validateIntRange(
      connectionDiscoveryLookbackDays,
      "connectionDiscoveryLookbackDays",
      1,
      365
    ),
    validateIntRange(
      connectionDiscoveryCooldownHours,
      "connectionDiscoveryCooldownHours",
      1,
      168
    ),
    validateFloatRange(
      semanticSearchThreshold,
      "semanticSearchThreshold",
      0,
      1
    ),
  ];

  for (const error of validations) {
    if (error !== null) {
      return error;
    }
  }

  return null;
}

/**
 * Apply daemon config updates to raw config object
 */
function applyDaemonUpdates(
  rawConfig: RawConfig,
  body: DaemonConfigUpdateBody
): void {
  const {
    provider,
    model,
    idleTimeoutMinutes,
    parallelWorkers,
    maxRetries,
    retryDelaySeconds,
    analysisTimeoutMinutes,
    maxConcurrentAnalysis,
    maxQueueSize,
    backfillLimit,
    reanalysisLimit,
    connectionDiscoveryLimit,
    connectionDiscoveryLookbackDays,
    connectionDiscoveryCooldownHours,
    semanticSearchThreshold,
  } = body;

  // Initialize daemon section if needed
  if (!rawConfig.daemon) {
    rawConfig.daemon = {};
  }

  // Update provided fields
  if (provider !== undefined) {
    rawConfig.daemon.provider = provider;
  }
  if (model !== undefined) {
    rawConfig.daemon.model = model;
  }
  if (idleTimeoutMinutes !== undefined) {
    rawConfig.daemon.idle_timeout_minutes = idleTimeoutMinutes;
  }
  if (parallelWorkers !== undefined) {
    rawConfig.daemon.parallel_workers = parallelWorkers;
  }
  if (maxRetries !== undefined) {
    rawConfig.daemon.max_retries = maxRetries;
  }
  if (retryDelaySeconds !== undefined) {
    rawConfig.daemon.retry_delay_seconds = retryDelaySeconds;
  }
  if (analysisTimeoutMinutes !== undefined) {
    rawConfig.daemon.analysis_timeout_minutes = analysisTimeoutMinutes;
  }
  if (maxConcurrentAnalysis !== undefined) {
    rawConfig.daemon.max_concurrent_analysis = maxConcurrentAnalysis;
  }
  if (maxQueueSize !== undefined) {
    rawConfig.daemon.max_queue_size = maxQueueSize;
  }
  if (backfillLimit !== undefined) {
    rawConfig.daemon.backfill_limit = backfillLimit;
  }
  if (reanalysisLimit !== undefined) {
    rawConfig.daemon.reanalysis_limit = reanalysisLimit;
  }
  if (connectionDiscoveryLimit !== undefined) {
    rawConfig.daemon.connection_discovery_limit = connectionDiscoveryLimit;
  }
  if (connectionDiscoveryLookbackDays !== undefined) {
    rawConfig.daemon.connection_discovery_lookback_days =
      connectionDiscoveryLookbackDays;
  }
  if (connectionDiscoveryCooldownHours !== undefined) {
    rawConfig.daemon.connection_discovery_cooldown_hours =
      connectionDiscoveryCooldownHours;
  }
  if (semanticSearchThreshold !== undefined) {
    rawConfig.daemon.semantic_search_threshold = semanticSearchThreshold;
  }
}

export async function configRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /config/daemon - Get daemon configuration
   */
  app.get("/daemon", async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = request.startTime ?? Date.now();

    const config = loadConfig();
    const defaults = getDefaultDaemonConfig();

    const durationMs = Date.now() - startTime;
    return reply.send(
      successResponse(
        {
          provider: config.daemon.provider,
          model: config.daemon.model,
          idleTimeoutMinutes: config.daemon.idleTimeoutMinutes,
          parallelWorkers: config.daemon.parallelWorkers,
          maxRetries: config.daemon.maxRetries,
          retryDelaySeconds: config.daemon.retryDelaySeconds,
          analysisTimeoutMinutes: config.daemon.analysisTimeoutMinutes,
          maxConcurrentAnalysis: config.daemon.maxConcurrentAnalysis,
          maxQueueSize: config.daemon.maxQueueSize,
          backfillLimit: config.daemon.backfillLimit,
          reanalysisLimit: config.daemon.reanalysisLimit,
          connectionDiscoveryLimit: config.daemon.connectionDiscoveryLimit,
          connectionDiscoveryLookbackDays:
            config.daemon.connectionDiscoveryLookbackDays,
          connectionDiscoveryCooldownHours:
            config.daemon.connectionDiscoveryCooldownHours,
          semanticSearchThreshold: config.daemon.semanticSearchThreshold,
          // Include defaults for UI reference
          defaults: {
            provider: defaults.provider,
            model: defaults.model,
          },
        },
        durationMs
      )
    );
  });

  /**
   * PUT /config/daemon - Update daemon configuration
   */
  app.put(
    "/daemon",
    async (
      request: FastifyRequest<{ Body: DaemonConfigUpdateBody }>,
      reply: FastifyReply
    ) => {
      const startTime = request.startTime ?? Date.now();
      const body = request.body ?? {};
      const {
        provider,
        model,
        idleTimeoutMinutes,
        parallelWorkers,
        maxRetries,
        retryDelaySeconds,
        analysisTimeoutMinutes,
        maxConcurrentAnalysis,
        maxQueueSize,
        backfillLimit,
        reanalysisLimit,
        connectionDiscoveryLimit,
        connectionDiscoveryLookbackDays,
        connectionDiscoveryCooldownHours,
        semanticSearchThreshold,
      } = body;

      // Validate at least one field is provided
      const hasAnyField =
        provider !== undefined ||
        model !== undefined ||
        idleTimeoutMinutes !== undefined ||
        parallelWorkers !== undefined ||
        maxRetries !== undefined ||
        retryDelaySeconds !== undefined ||
        analysisTimeoutMinutes !== undefined ||
        maxConcurrentAnalysis !== undefined ||
        maxQueueSize !== undefined ||
        backfillLimit !== undefined ||
        reanalysisLimit !== undefined ||
        connectionDiscoveryLimit !== undefined ||
        connectionDiscoveryLookbackDays !== undefined ||
        connectionDiscoveryCooldownHours !== undefined ||
        semanticSearchThreshold !== undefined;

      if (!hasAnyField) {
        return reply
          .status(400)
          .send(
            errorResponse(
              "BAD_REQUEST",
              "At least one configuration field is required"
            )
          );
      }

      // Validate numeric fields
      const validationError = validateDaemonUpdate(body);
      if (validationError !== null) {
        return reply
          .status(400)
          .send(errorResponse("BAD_REQUEST", validationError));
      }

      // Read existing config file
      let rawConfig: RawConfig = {};
      if (fs.existsSync(DEFAULT_CONFIG_PATH)) {
        const content = fs.readFileSync(DEFAULT_CONFIG_PATH, "utf8");
        if (content.trim()) {
          rawConfig = yaml.parse(content) as RawConfig;
        }
      }

      // Apply updates
      applyDaemonUpdates(rawConfig, body);

      // Write updated config
      const yamlContent = yaml.stringify(rawConfig, {
        indent: 2,
        lineWidth: 0,
      });
      fs.writeFileSync(DEFAULT_CONFIG_PATH, yamlContent, "utf8");

      // Reload and return updated config
      const updatedConfig = loadConfig();

      const durationMs = Date.now() - startTime;
      return reply.send(
        successResponse(
          {
            provider: updatedConfig.daemon.provider,
            model: updatedConfig.daemon.model,
            idleTimeoutMinutes: updatedConfig.daemon.idleTimeoutMinutes,
            parallelWorkers: updatedConfig.daemon.parallelWorkers,
            maxRetries: updatedConfig.daemon.maxRetries,
            retryDelaySeconds: updatedConfig.daemon.retryDelaySeconds,
            analysisTimeoutMinutes: updatedConfig.daemon.analysisTimeoutMinutes,
            maxConcurrentAnalysis: updatedConfig.daemon.maxConcurrentAnalysis,
            maxQueueSize: updatedConfig.daemon.maxQueueSize,
            backfillLimit: updatedConfig.daemon.backfillLimit,
            reanalysisLimit: updatedConfig.daemon.reanalysisLimit,
            connectionDiscoveryLimit:
              updatedConfig.daemon.connectionDiscoveryLimit,
            connectionDiscoveryLookbackDays:
              updatedConfig.daemon.connectionDiscoveryLookbackDays,
            connectionDiscoveryCooldownHours:
              updatedConfig.daemon.connectionDiscoveryCooldownHours,
            semanticSearchThreshold:
              updatedConfig.daemon.semanticSearchThreshold,
            message: "Configuration updated. Restart daemon to apply changes.",
          },
          durationMs
        )
      );
    }
  );

  /**
   * GET /config/providers - Get available AI providers
   */
  app.get(
    "/providers",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const startTime = request.startTime ?? Date.now();

      // List of known providers
      const providers = [
        {
          id: "zai",
          name: "Zhipu AI",
          models: ["glm-4.7", "glm-4.6", "glm-4"],
        },
        {
          id: "anthropic",
          name: "Anthropic",
          models: ["claude-sonnet-4-20250514", "claude-3-5-sonnet-latest"],
        },
        {
          id: "openai",
          name: "OpenAI",
          models: ["gpt-4o", "gpt-4o-mini", "o1-preview"],
        },
        {
          id: "google",
          name: "Google",
          models: ["gemini-2.0-flash-exp", "gemini-1.5-pro"],
        },
        { id: "xai", name: "xAI", models: ["grok-2", "grok-2-mini"] },
        {
          id: "groq",
          name: "Groq",
          models: ["llama-3.3-70b-versatile", "mixtral-8x7b-32768"],
        },
      ];

      const durationMs = Date.now() - startTime;
      return reply.send(successResponse({ providers }, durationMs));
    }
  );
}
