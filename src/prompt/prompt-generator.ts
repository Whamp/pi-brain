/**
 * Prompt Generator - Generate model-specific prompt additions from aggregated insights
 *
 * Takes aggregated insights (quirks, wins, failures, tool errors, lessons) and
 * generates formatted markdown sections that can be injected into prompts.
 *
 * See specs/prompt-learning.md for full specification.
 */

import type Database from "better-sqlite3";

import type { AggregatedInsight, PromptAddition } from "../types/index.js";

import {
  listInsights,
  updateInsightPrompt,
} from "../storage/pattern-repository.js";

// =============================================================================
// Types
// =============================================================================

// PromptAddition is imported from src/types/index.ts

export interface GeneratePromptOptions {
  /** Minimum confidence to include (default: 0.5) */
  minConfidence?: number;
  /** Minimum frequency to include (default: 3) */
  minFrequency?: number;
  /** Maximum quirks per model (default: 5) */
  maxQuirks?: number;
  /** Maximum wins per model (default: 5) */
  maxWins?: number;
  /** Maximum tool issues per model (default: 5) */
  maxToolIssues?: number;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_MIN_CONFIDENCE = 0.5;
const DEFAULT_MIN_FREQUENCY = 3;
const DEFAULT_MAX_QUIRKS = 5;
const DEFAULT_MAX_WINS = 5;
const DEFAULT_MAX_TOOL_ISSUES = 5;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get a human-readable model name from provider/model format
 */
export function getModelDisplayName(model: string): string {
  const [provider, modelName] = model.split("/");
  if (!modelName) {
    return model;
  }

  // Capitalize provider and format model name nicely
  const formattedProvider =
    provider.charAt(0).toUpperCase() + provider.slice(1);

  // Common model name formatting
  const formattedModel = modelName
    .replaceAll("-", " ")
    .replaceAll("_", " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return `${formattedProvider} ${formattedModel}`;
}

/**
 * Group insights by model
 */
export function groupInsightsByModel(
  insights: AggregatedInsight[]
): Map<string, AggregatedInsight[]> {
  const grouped = new Map<string, AggregatedInsight[]>();

  for (const insight of insights) {
    // Skip insights without a model
    if (!insight.model) {
      continue;
    }

    const existing = grouped.get(insight.model);
    if (existing) {
      existing.push(insight);
    } else {
      grouped.set(insight.model, [insight]);
    }
  }

  return grouped;
}

/**
 * Filter insights to actionable ones
 */
export function filterActionableInsights(
  insights: AggregatedInsight[],
  options: GeneratePromptOptions = {}
): AggregatedInsight[] {
  const {
    minConfidence = DEFAULT_MIN_CONFIDENCE,
    minFrequency = DEFAULT_MIN_FREQUENCY,
  } = options;

  return insights.filter((insight) => {
    // Must meet confidence and frequency thresholds
    if (
      insight.confidence < minConfidence ||
      insight.frequency < minFrequency
    ) {
      return false;
    }

    // Quirks need a workaround to be actionable
    if (insight.type === "quirk" && !insight.workaround) {
      return false;
    }

    return true;
  });
}

/**
 * Format quirks section for a model
 */
function formatQuirksSection(
  insights: AggregatedInsight[],
  maxQuirks: number
): string[] {
  const quirks = insights
    .filter((i) => i.type === "quirk")
    .toSorted((a, b) => b.frequency - a.frequency)
    .slice(0, maxQuirks);

  if (quirks.length === 0) {
    return [];
  }

  const lines = ["### Known quirks to avoid:\n"];
  for (const quirk of quirks) {
    lines.push(`- **${quirk.pattern}**`);
    if (quirk.workaround) {
      lines.push(`  - Workaround: ${quirk.workaround}`);
    }
  }
  lines.push("");
  return lines;
}

/**
 * Format wins section for a model
 */
function formatWinsSection(
  insights: AggregatedInsight[],
  maxWins: number
): string[] {
  const wins = insights
    .filter((i) => i.type === "win")
    .toSorted((a, b) => b.frequency - a.frequency)
    .slice(0, maxWins);

  if (wins.length === 0) {
    return [];
  }

  const lines = ["### Effective techniques:\n"];
  for (const win of wins) {
    lines.push(`- ${win.pattern}`);
  }
  lines.push("");
  return lines;
}

/**
 * Format tool issues section for a model
 */
function formatToolIssuesSection(
  insights: AggregatedInsight[],
  maxToolIssues: number
): string[] {
  const toolIssues = insights
    .filter((i) => i.type === "tool_error" || i.type === "failure")
    .filter((i) => i.tool || i.pattern.toLowerCase().includes("tool"))
    .toSorted((a, b) => b.frequency - a.frequency)
    .slice(0, maxToolIssues);

  if (toolIssues.length === 0) {
    return [];
  }

  const lines = ["### Tool usage reminders:\n"];
  for (const issue of toolIssues) {
    const prefix = issue.tool ? `${issue.tool}: ` : "";
    lines.push(`- ${prefix}${issue.pattern}`);
  }
  lines.push("");
  return lines;
}

/**
 * Format a model-specific prompt section
 */
export function formatModelSection(
  model: string,
  insights: AggregatedInsight[],
  options: GeneratePromptOptions = {}
): string {
  const {
    maxQuirks = DEFAULT_MAX_QUIRKS,
    maxWins = DEFAULT_MAX_WINS,
    maxToolIssues = DEFAULT_MAX_TOOL_ISSUES,
  } = options;

  const lines: string[] = [
    ...formatQuirksSection(insights, maxQuirks),
    ...formatWinsSection(insights, maxWins),
    ...formatToolIssuesSection(insights, maxToolIssues),
  ];

  return lines.join("\n").trim();
}

// =============================================================================
// Main Generator Functions
// =============================================================================

/**
 * Generate prompt additions for all models with insights
 */
export function generatePromptAdditions(
  insights: AggregatedInsight[],
  options: GeneratePromptOptions = {}
): PromptAddition[] {
  const additions: PromptAddition[] = [];

  // Filter to actionable insights
  const actionable = filterActionableInsights(insights, options);

  // Group by model
  const byModel = groupInsightsByModel(actionable);

  for (const [model, modelInsights] of byModel) {
    // Skip if no actionable insights for this model
    if (modelInsights.length === 0) {
      continue;
    }

    // Generate prompt section
    const content = formatModelSection(model, modelInsights, options);

    // Skip empty sections
    if (!content.trim()) {
      continue;
    }

    const displayName = getModelDisplayName(model);

    additions.push({
      model,
      section: `## Notes for ${displayName}`,
      priority: 100,
      content,
      sourceInsights: modelInsights.map((i) => i.id),
    });
  }

  // Sort by model name for consistent ordering
  return additions.toSorted((a, b) => a.model.localeCompare(b.model));
}

/**
 * Generate prompt additions from the database
 *
 * Fetches insights from aggregated_insights table and generates additions.
 */
export function generatePromptAdditionsFromDb(
  db: Database.Database,
  options: GeneratePromptOptions = {}
): PromptAddition[] {
  const {
    minConfidence = DEFAULT_MIN_CONFIDENCE,
    minFrequency = DEFAULT_MIN_FREQUENCY,
  } = options;

  // Fetch all insights meeting minimum thresholds
  const insights = listInsights(db, {
    minFrequency,
    minConfidence,
    limit: 1000, // Reasonable limit for prompt generation
  });

  return generatePromptAdditions(insights, options);
}

/**
 * Format a complete prompt additions document
 *
 * Combines all model-specific additions into a single markdown document.
 */
export function formatPromptAdditionsDocument(
  additions: PromptAddition[]
): string {
  if (additions.length === 0) {
    return "";
  }

  const lines: string[] = [
    "# Model-Specific Insights",
    "",
    "The following insights have been learned from analyzing your coding sessions.",
    "These are model-specific observations and recommendations.",
    "",
  ];

  for (const addition of additions) {
    lines.push(addition.section);
    lines.push("");
    lines.push(addition.content);
    lines.push("");
  }

  return lines.join("\n").trim();
}

/**
 * Generate and store prompt text for insights
 *
 * For each insight that should be included in prompts, generates the
 * appropriate prompt text and updates the database.
 */
export function updateInsightPromptTexts(
  db: Database.Database,
  additions: PromptAddition[],
  promptVersion?: string
): void {
  // Create a map of insight ID to the generated content
  const insightContents = new Map<string, { model: string; content: string }>();

  for (const addition of additions) {
    for (const insightId of addition.sourceInsights) {
      insightContents.set(insightId, {
        model: addition.model,
        content: addition.content,
      });
    }
  }

  // Update each insight with its prompt text in a transaction
  // to prevent inconsistent state on errors
  db.transaction(() => {
    for (const [insightId, { content }] of insightContents) {
      updateInsightPrompt(db, insightId, content, true, promptVersion);
    }
  })();
}

/**
 * Get prompt additions for a specific model
 */
export function getPromptAdditionsForModel(
  db: Database.Database,
  model: string,
  options: GeneratePromptOptions = {}
): PromptAddition | null {
  const {
    minConfidence = DEFAULT_MIN_CONFIDENCE,
    minFrequency = DEFAULT_MIN_FREQUENCY,
  } = options;

  // Fetch insights for this specific model
  const insights = listInsights(db, {
    model,
    minFrequency,
    minConfidence,
    limit: 100,
  });

  const additions = generatePromptAdditions(insights, options);

  // Find the addition for this model
  return additions.find((a) => a.model === model) ?? null;
}
