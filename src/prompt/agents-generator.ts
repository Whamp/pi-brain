/**
 * Model-Specific AGENTS.md Generator
 *
 * Generates tailored AGENTS.md files for different models based on:
 * - Aggregated insights (quirks, wins, tool errors) for the model
 * - Friction clusters associated with the model
 * - LLM synthesis to produce coherent guidance
 *
 * See specs/signals.md Section 4 for specification.
 */

import type Database from "better-sqlite3";

import { spawn } from "node:child_process";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import type { AggregatedInsight, Cluster } from "../types/index.js";

import { listInsights } from "../storage/pattern-repository.js";
import { getModelDisplayName } from "./prompt-generator.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Configuration for AGENTS.md generation
 */
export interface AgentsGeneratorConfig {
  /** LLM provider for synthesis (e.g., 'zai') */
  provider?: string;
  /** Model for synthesis (e.g., 'glm-4.7') */
  model?: string;
  /** Path to the AGENTS generator prompt file */
  promptFile?: string;
  /** Timeout in minutes (default: 5) */
  timeoutMinutes?: number;
  /** Minimum confidence for insights (default: 0.5) */
  minConfidence?: number;
  /** Minimum frequency for insights (default: 2) */
  minFrequency?: number;
  /** Maximum quirks to include (default: 10) */
  maxQuirks?: number;
  /** Maximum wins to include (default: 10) */
  maxWins?: number;
  /** Maximum tool errors to include (default: 10) */
  maxToolErrors?: number;
  /** Output directory (default: ~/.pi/agent/contexts) */
  outputDir?: string;
}

/**
 * Result of AGENTS.md generation
 */
export interface AgentsGeneratorResult {
  success: boolean;
  /** Generated markdown content */
  content?: string;
  /** Path where the file was saved (if saved) */
  outputPath?: string;
  /** Model that was processed */
  model: string;
  /** Statistics about included insights */
  stats?: {
    quirksIncluded: number;
    winsIncluded: number;
    toolErrorsIncluded: number;
    lessonsIncluded: number;
    failuresIncluded: number;
    clustersIncluded: number;
  };
  /** Error message if failed */
  error?: string;
}

/**
 * Data gathered for a model's AGENTS.md
 */
export interface ModelInsightData {
  model: string;
  displayName: string;
  quirks: AggregatedInsight[];
  wins: AggregatedInsight[];
  toolErrors: AggregatedInsight[];
  failures: AggregatedInsight[];
  lessons: AggregatedInsight[];
  frictionClusters: Cluster[];
}

// =============================================================================
// Cluster Query Types
// =============================================================================

interface ClusterRow {
  id: string;
  name: string | null;
  description: string | null;
  node_count: number;
  signal_type: string | null;
  related_model: string | null;
  status: string;
  algorithm: string;
  min_cluster_size: number | null;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_OUTPUT_DIR = path.join(os.homedir(), ".pi/agent/contexts");
const DEFAULT_MIN_CONFIDENCE = 0.5;
const DEFAULT_MIN_FREQUENCY = 2;
const DEFAULT_MAX_QUIRKS = 10;
const DEFAULT_MAX_WINS = 10;
const DEFAULT_MAX_TOOL_ERRORS = 10;
const DEFAULT_TIMEOUT_MINUTES = 5;

// =============================================================================
// Core Functions
// =============================================================================

/**
 * Gather all insights and clusters for a specific model
 */
export function gatherModelData(
  db: Database.Database,
  model: string,
  config: AgentsGeneratorConfig = {}
): ModelInsightData {
  const {
    minConfidence = DEFAULT_MIN_CONFIDENCE,
    minFrequency = DEFAULT_MIN_FREQUENCY,
    maxQuirks = DEFAULT_MAX_QUIRKS,
    maxWins = DEFAULT_MAX_WINS,
    maxToolErrors = DEFAULT_MAX_TOOL_ERRORS,
  } = config;

  // Fetch insights for this model
  const insights = listInsights(db, {
    model,
    minFrequency,
    minConfidence,
    limit: 200, // Get more than we need, then filter
  });

  // Also get tool errors that aren't model-specific (apply to all)
  const generalToolErrors = listInsights(db, {
    type: "tool_error",
    minFrequency,
    minConfidence,
    limit: 50,
  }).filter((i) => !i.model || i.model === model);

  // Categorize insights
  const quirks = insights.filter((i) => i.type === "quirk").slice(0, maxQuirks);

  const wins = insights.filter((i) => i.type === "win").slice(0, maxWins);

  const toolErrors = [
    ...insights.filter((i) => i.type === "tool_error"),
    ...generalToolErrors.filter(
      (i) => !insights.some((existing) => existing.id === i.id)
    ),
  ].slice(0, maxToolErrors);

  const failures = insights
    .filter((i) => i.type === "failure")
    .slice(0, maxToolErrors);

  const lessons = insights.filter((i) => i.type === "lesson").slice(0, 10);

  // Fetch friction clusters for this model
  const frictionClusters = getFrictionClustersForModel(db, model);

  return {
    model,
    displayName: getModelDisplayName(model),
    quirks,
    wins,
    toolErrors,
    failures,
    lessons,
    frictionClusters,
  };
}

/**
 * Get friction clusters associated with a model
 */
function getFrictionClustersForModel(
  db: Database.Database,
  model: string
): Cluster[] {
  const stmt = db.prepare(`
    SELECT id, name, description, node_count, signal_type, related_model, status,
           algorithm, min_cluster_size, created_at, updated_at
    FROM clusters
    WHERE (related_model = ? OR related_model IS NULL)
      AND signal_type = 'friction'
      AND status != 'dismissed'
      AND name IS NOT NULL
    ORDER BY node_count DESC
    LIMIT 10
  `);

  const rows = stmt.all(model) as ClusterRow[];

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    nodeCount: row.node_count,
    signalType: row.signal_type as "friction" | "delight" | null,
    relatedModel: row.related_model ?? undefined,
    status: row.status as "pending" | "confirmed" | "dismissed",
    algorithm: row.algorithm,
    minClusterSize: row.min_cluster_size ?? undefined,
    centroid: null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * Format a section of insights for prompt data
 */
function formatInsightSection(
  title: string,
  insights: AggregatedInsight[],
  formatItem: (item: AggregatedInsight) => string[]
): string[] {
  if (insights.length === 0) {
    return [];
  }
  const lines = [`## ${title}\n`];
  for (const insight of insights) {
    lines.push(...formatItem(insight));
  }
  lines.push("");
  return lines;
}

/**
 * Format friction clusters section
 */
function formatClusterSection(clusters: Cluster[]): string[] {
  if (clusters.length === 0) {
    return [];
  }
  const lines = ["## Friction Patterns (from clustering)\n"];
  for (const cluster of clusters) {
    lines.push(
      `- **${cluster.name}**: ${cluster.description ?? "No description"}`
    );
    lines.push(`  - Occurrences: ${cluster.nodeCount} sessions`);
  }
  lines.push("");
  return lines;
}

/**
 * Format model data into a structured prompt for LLM synthesis
 */
export function formatDataForPrompt(data: ModelInsightData): string {
  // Quirks with workarounds and frequency
  const quirkLines = formatInsightSection(
    "Known Quirks",
    data.quirks,
    (quirk) => {
      const result = [`- **${quirk.pattern}** (seen ${quirk.frequency} times)`];
      if (quirk.workaround) {
        result.push(`  - Workaround: ${quirk.workaround}`);
      }
      return result;
    }
  );

  // Wins with frequency
  const winLines = formatInsightSection(
    "Effective Techniques",
    data.wins,
    (win) => [`- ${win.pattern} (seen ${win.frequency} times)`]
  );

  // Tool errors with frequency
  const toolErrorLines = formatInsightSection(
    "Common Tool Errors",
    data.toolErrors,
    (item) => {
      const tool = item.tool ? `[${item.tool}] ` : "";
      return [`- ${tool}${item.pattern} (seen ${item.frequency} times)`];
    }
  );

  // Failures with frequency
  const failureLines = formatInsightSection(
    "Prompting Failures",
    data.failures,
    (failure) => [`- ${failure.pattern} (seen ${failure.frequency} times)`]
  );

  // Lessons (no frequency)
  const lessonLines = formatInsightSection(
    "Learned Lessons",
    data.lessons,
    (lesson) => [`- ${lesson.pattern}`]
  );

  // Friction clusters
  const clusterLines = formatClusterSection(data.frictionClusters);

  const lines: string[] = [
    `# Model Data for ${data.displayName} (${data.model})\n`,
    ...quirkLines,
    ...winLines,
    ...toolErrorLines,
    ...failureLines,
    ...lessonLines,
    ...clusterLines,
  ];

  return lines.join("\n");
}

/**
 * Generate a fallback AGENTS.md without LLM synthesis
 * Used when LLM is not available or synthesis fails
 */
export function generateFallbackAgents(data: ModelInsightData): string {
  const totalPatterns =
    data.quirks.length + data.wins.length + data.toolErrors.length;

  // Quirks section (with workarounds, no frequency)
  const quirkLines = formatInsightSection(
    "Known Quirks to Avoid",
    data.quirks,
    (quirk) => {
      const result = [`- **${quirk.pattern}**`];
      if (quirk.workaround) {
        result.push(`  - Workaround: ${quirk.workaround}`);
      }
      return result;
    }
  );

  // Effective techniques
  const winLines = formatInsightSection(
    "Effective Techniques",
    data.wins,
    (win) => [`- ${win.pattern}`]
  );

  // Tool reminders
  const toolLines = formatInsightSection(
    "Tool Usage Reminders",
    data.toolErrors,
    (item) => {
      const tool = item.tool ? `**${item.tool}**: ` : "";
      return [`- ${tool}${item.pattern}`];
    }
  );

  // Friction patterns
  const frictionLines: string[] = [];
  if (data.frictionClusters.length > 0) {
    frictionLines.push("## Common Friction Patterns\n");
    frictionLines.push("These patterns have been observed causing issues:\n");
    for (const cluster of data.frictionClusters) {
      frictionLines.push(`- **${cluster.name}**: ${cluster.description ?? ""}`);
    }
    frictionLines.push("");
  }

  const lines: string[] = [
    `# AGENTS.md for ${data.displayName}\n`,
    `Auto-generated guidance based on ${totalPatterns} analyzed patterns.\n`,
    ...quirkLines,
    ...winLines,
    ...toolLines,
    ...frictionLines,
  ];

  return lines.join("\n");
}

/**
 * Use LLM to synthesize model data into coherent AGENTS.md content
 */
export async function synthesizeWithLLM(
  data: ModelInsightData,
  config: AgentsGeneratorConfig = {}
): Promise<string> {
  const {
    provider = "zai",
    model = "glm-4.7",
    promptFile,
    timeoutMinutes = DEFAULT_TIMEOUT_MINUTES,
  } = config;

  // Build the system prompt
  const systemPrompt = promptFile
    ? await fs.readFile(promptFile, "utf8")
    : getDefaultSystemPrompt();

  // Format the data for the LLM
  const userPrompt = formatDataForPrompt(data);

  // Spawn pi agent to synthesize
  const result = await spawnPiAgent({
    provider,
    model,
    systemPrompt,
    userPrompt,
    timeoutMinutes,
  });

  return result;
}

/**
 * Default system prompt for AGENTS.md generation
 */
function getDefaultSystemPrompt(): string {
  return `You are an expert at writing AGENTS.md files for AI coding assistants.

Your task is to synthesize the provided model-specific insights into a coherent, actionable AGENTS.md file.

## Guidelines

1. **Structure**: Organize the content into clear sections that are easy to scan
2. **Actionable**: Turn observations into concrete guidance the model can follow
3. **Prioritize**: Put the most important/frequent issues first
4. **Workarounds**: When quirks have workarounds, phrase them as positive instructions
5. **Concise**: Be brief but complete - avoid unnecessary verbosity
6. **Tone**: Write in second person ("You should..." or "Always...")

## Output Format

Write a complete AGENTS.md file in markdown. Include:
- A brief header explaining this is model-specific guidance
- Sections for different types of guidance (quirks to avoid, effective techniques, tool usage, etc.)
- Clear, actionable bullet points

Do NOT include a preamble or explanation - output only the AGENTS.md content.`;
}

/**
 * Spawn pi agent to process the synthesis
 */
async function spawnPiAgent(options: {
  provider: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  timeoutMinutes: number;
}): Promise<string> {
  const { provider, model, systemPrompt, userPrompt, timeoutMinutes } = options;

  // Write prompts to temp files
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "pi-brain-agents-"));
  const systemPromptPath = path.join(tempDir, "system.md");
  const userPromptPath = path.join(tempDir, "user.md");

  await fs.writeFile(systemPromptPath, systemPrompt);
  await fs.writeFile(userPromptPath, userPrompt);

  return new Promise((resolve, reject) => {
    const timeoutMs = timeoutMinutes * 60 * 1000;
    let output = "";
    let stderr = "";

    const args = [
      "--provider",
      provider,
      "--model",
      model,
      "--system-prompt",
      systemPromptPath,
      "--no-session",
      "--file",
      userPromptPath,
    ];

    const proc = spawn("pi", args, {
      stdio: ["pipe", "pipe", "pipe"],
      timeout: timeoutMs,
    });

    proc.stdout.on("data", (data: Buffer) => {
      output += data.toString();
    });

    proc.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on("close", async (code) => {
      // Cleanup temp files
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }

      if (code === 0) {
        resolve(output.trim());
      } else {
        reject(new Error(`pi agent failed (code ${code}): ${stderr}`));
      }
    });

    proc.on("error", async (err) => {
      // Cleanup temp files
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
      reject(err);
    });

    // Close stdin immediately since we're using --file
    proc.stdin.end();
  });
}

/**
 * Generate AGENTS.md for a specific model
 */
export async function generateAgentsForModel(
  db: Database.Database,
  model: string,
  config: AgentsGeneratorConfig = {}
): Promise<AgentsGeneratorResult> {
  const { outputDir = DEFAULT_OUTPUT_DIR } = config;

  try {
    // Gather all data for this model
    const data = gatherModelData(db, model, config);

    // Check if we have any data
    const totalInsights =
      data.quirks.length +
      data.wins.length +
      data.toolErrors.length +
      data.failures.length +
      data.lessons.length +
      data.frictionClusters.length;

    if (totalInsights === 0) {
      return {
        success: false,
        model,
        error: `No insights found for model: ${model}`,
      };
    }

    // Try LLM synthesis, fall back to template if it fails
    let content: string;
    try {
      content = await synthesizeWithLLM(data, config);
    } catch (error) {
      console.warn(
        `[agents-generator] LLM synthesis failed, using fallback: ${(error as Error).message}`
      );
      content = generateFallbackAgents(data);
    }

    // Determine output path
    // Convert model name to filename-safe format (e.g., "zai/glm-4.7" -> "zai_glm-4.7.md")
    const filename = `${model.replaceAll("/", "_")}.md`;
    const outputPath = path.join(outputDir, filename);

    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    // Write the file
    await fs.writeFile(outputPath, content, "utf8");

    return {
      success: true,
      content,
      outputPath,
      model,
      stats: {
        quirksIncluded: data.quirks.length,
        winsIncluded: data.wins.length,
        toolErrorsIncluded: data.toolErrors.length,
        lessonsIncluded: data.lessons.length,
        failuresIncluded: data.failures.length,
        clustersIncluded: data.frictionClusters.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      model,
      error: (error as Error).message,
    };
  }
}

/**
 * List all models that have insights in the database
 */
export function listModelsWithInsights(db: Database.Database): string[] {
  const stmt = db.prepare(`
    SELECT DISTINCT model
    FROM aggregated_insights
    WHERE model IS NOT NULL
    ORDER BY model
  `);

  const rows = stmt.all() as { model: string }[];
  return rows.map((r) => r.model);
}

/**
 * Preview AGENTS.md generation without saving
 */
export async function previewAgentsForModel(
  db: Database.Database,
  model: string,
  config: AgentsGeneratorConfig = {}
): Promise<AgentsGeneratorResult> {
  try {
    // Gather all data for this model
    const data = gatherModelData(db, model, config);

    // Check if we have any data
    const totalInsights =
      data.quirks.length +
      data.wins.length +
      data.toolErrors.length +
      data.failures.length +
      data.lessons.length +
      data.frictionClusters.length;

    if (totalInsights === 0) {
      return {
        success: false,
        model,
        error: `No insights found for model: ${model}`,
      };
    }

    // Try LLM synthesis, fall back to template if it fails
    let content: string;
    try {
      content = await synthesizeWithLLM(data, config);
    } catch (error) {
      console.warn(
        `[agents-generator] LLM synthesis failed, using fallback: ${(error as Error).message}`
      );
      content = generateFallbackAgents(data);
    }

    return {
      success: true,
      content,
      model,
      stats: {
        quirksIncluded: data.quirks.length,
        winsIncluded: data.wins.length,
        toolErrorsIncluded: data.toolErrors.length,
        lessonsIncluded: data.lessons.length,
        failuresIncluded: data.failures.length,
        clustersIncluded: data.frictionClusters.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      model,
      error: (error as Error).message,
    };
  }
}
