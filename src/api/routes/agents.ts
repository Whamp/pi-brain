/**
 * AGENTS.md API Routes
 *
 * Endpoints for generating and managing model-specific AGENTS.md files.
 */

import type { FastifyInstance } from "fastify";

import type { ServerContext } from "../types.js";

import {
  generateAgentsForModel,
  listModelsWithInsights,
  previewAgentsForModel,
  gatherModelData,
  formatDataForPrompt,
} from "../../prompt/agents-generator.js";

/**
 * Register AGENTS.md routes
 */
export async function agentsRoutes(app: FastifyInstance): Promise<void> {
  const context = (app as unknown as { ctx: ServerContext }).ctx;
  const database = context.db;

  /**
   * GET /agents/models
   * List all models with insights
   */
  app.get("/models", async (_request, _reply) => {
    const models = listModelsWithInsights(database);
    return {
      models,
      count: models.length,
    };
  });

  /**
   * GET /agents/data/:model
   * Get raw insight data for a model (for debugging/inspection)
   */
  app.get<{
    Params: { model: string };
    Querystring: {
      minConfidence?: string;
      minFrequency?: string;
    };
  }>("/data/:model", async (request, _reply) => {
    const { model } = request.params;
    const { minConfidence, minFrequency } = request.query;

    // URL-decode the model parameter (e.g., "zai%2Fglm-4.7" -> "zai/glm-4.7")
    const decodedModel = decodeURIComponent(model);

    const data = gatherModelData(database, decodedModel, {
      minConfidence: minConfidence
        ? Number.parseFloat(minConfidence)
        : undefined,
      minFrequency: minFrequency
        ? Number.parseInt(minFrequency, 10)
        : undefined,
    });

    return {
      model: decodedModel,
      displayName: data.displayName,
      stats: {
        quirks: data.quirks.length,
        wins: data.wins.length,
        toolErrors: data.toolErrors.length,
        failures: data.failures.length,
        lessons: data.lessons.length,
        frictionClusters: data.frictionClusters.length,
      },
      data,
    };
  });

  /**
   * GET /agents/preview/:model
   * Preview generated AGENTS.md content without saving
   */
  app.get<{
    Params: { model: string };
    Querystring: {
      minConfidence?: string;
      minFrequency?: string;
      noLlm?: string;
    };
  }>("/preview/:model", async (request, reply) => {
    const { model } = request.params;
    const { minConfidence, minFrequency, noLlm } = request.query;

    // URL-decode the model parameter
    const decodedModel = decodeURIComponent(model);

    const config = {
      minConfidence: minConfidence
        ? Number.parseFloat(minConfidence)
        : undefined,
      minFrequency: minFrequency
        ? Number.parseInt(minFrequency, 10)
        : undefined,
      // If noLlm is set, don't provide LLM config to force fallback
      provider: noLlm === "true" ? undefined : "zai",
      model: noLlm === "true" ? undefined : "glm-4.7",
    };

    const result = await previewAgentsForModel(database, decodedModel, config);

    if (!result.success) {
      return reply.status(404).send({
        status: "error",
        error: result.error,
      });
    }

    return {
      status: "success",
      model: decodedModel,
      content: result.content,
      stats: result.stats,
    };
  });

  /**
   * POST /agents/generate/:model
   * Generate and save AGENTS.md for a model
   */
  app.post<{
    Params: { model: string };
    Body: {
      provider?: string;
      model?: string;
      outputDir?: string;
      minConfidence?: number;
      minFrequency?: number;
      noLlm?: boolean;
    };
  }>("/generate/:model", async (request, reply) => {
    const { model: targetModel } = request.params;
    const body = request.body || {};

    // URL-decode the model parameter
    const decodedModel = decodeURIComponent(targetModel);

    const config = {
      provider: body.noLlm ? undefined : (body.provider ?? "zai"),
      model: body.noLlm ? undefined : (body.model ?? "glm-4.7"),
      outputDir: body.outputDir,
      minConfidence: body.minConfidence,
      minFrequency: body.minFrequency,
    };

    const result = await generateAgentsForModel(database, decodedModel, config);

    if (!result.success) {
      return reply.status(400).send({
        status: "error",
        error: result.error,
      });
    }

    return {
      status: "success",
      model: decodedModel,
      outputPath: result.outputPath,
      stats: result.stats,
    };
  });

  /**
   * GET /agents/prompt-data/:model
   * Get the formatted prompt data that would be sent to the LLM
   * Useful for debugging/inspection
   */
  app.get<{
    Params: { model: string };
    Querystring: {
      minConfidence?: string;
      minFrequency?: string;
    };
  }>("/prompt-data/:model", async (request, _reply) => {
    const { model } = request.params;
    const { minConfidence, minFrequency } = request.query;

    // URL-decode the model parameter
    const decodedModel = decodeURIComponent(model);

    const data = gatherModelData(database, decodedModel, {
      minConfidence: minConfidence
        ? Number.parseFloat(minConfidence)
        : undefined,
      minFrequency: minFrequency
        ? Number.parseInt(minFrequency, 10)
        : undefined,
    });

    const promptContent = formatDataForPrompt(data);

    return {
      model: decodedModel,
      promptContent,
    };
  });
}
