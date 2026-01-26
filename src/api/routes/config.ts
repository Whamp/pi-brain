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
      request: FastifyRequest<{
        Body: {
          provider?: string;
          model?: string;
          idleTimeoutMinutes?: number;
          parallelWorkers?: number;
        };
      }>,
      reply: FastifyReply
    ) => {
      const startTime = request.startTime ?? Date.now();
      const { provider, model, idleTimeoutMinutes, parallelWorkers } =
        request.body ?? {};

      // Validate at least one field is provided
      if (
        provider === undefined &&
        model === undefined &&
        idleTimeoutMinutes === undefined &&
        parallelWorkers === undefined
      ) {
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
      if (idleTimeoutMinutes !== undefined) {
        if (
          !Number.isInteger(idleTimeoutMinutes) ||
          idleTimeoutMinutes < 1 ||
          idleTimeoutMinutes > 1440
        ) {
          return reply
            .status(400)
            .send(
              errorResponse(
                "BAD_REQUEST",
                "idleTimeoutMinutes must be an integer between 1 and 1440"
              )
            );
        }
      }

      if (parallelWorkers !== undefined) {
        if (
          !Number.isInteger(parallelWorkers) ||
          parallelWorkers < 1 ||
          parallelWorkers > 10
        ) {
          return reply
            .status(400)
            .send(
              errorResponse(
                "BAD_REQUEST",
                "parallelWorkers must be an integer between 1 and 10"
              )
            );
        }
      }

      // Read existing config file
      let rawConfig: RawConfig = {};
      if (fs.existsSync(DEFAULT_CONFIG_PATH)) {
        const content = fs.readFileSync(DEFAULT_CONFIG_PATH, "utf8");
        if (content.trim()) {
          rawConfig = yaml.parse(content) as RawConfig;
        }
      }

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
