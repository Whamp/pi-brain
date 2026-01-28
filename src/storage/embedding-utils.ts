/**
 * Embedding Utilities
 *
 * Functions for building embedding text from nodes and managing embeddings.
 * See specs/semantic-search.md for specification.
 */

import type { Node } from "../types/index.js";

/**
 * Build embedding text from a node for semantic search.
 *
 * Format:
 * ```
 * [{type}] {summary}
 *
 * Decisions:
 * - {decision.what} (why: {decision.why})
 * - ...
 *
 * Lessons:
 * - {lesson.summary}
 * - ...
 * ```
 *
 * This richer format enables semantic search to find nodes by:
 * - What type of work was done
 * - What was accomplished (summary)
 * - What decisions were made and why
 * - What lessons were learned
 */
export function buildEmbeddingText(node: Node): string {
  const parts: string[] = [
    `[${node.classification.type}] ${node.content.summary}`,
  ];

  // Key decisions (if any)
  if (node.content.keyDecisions.length > 0) {
    parts.push("");
    parts.push("Decisions:");
    for (const decision of node.content.keyDecisions) {
      parts.push(`- ${decision.what} (why: ${decision.why})`);
    }
  }

  // Lessons from all levels (if any)
  const allLessons = [
    ...node.lessons.project,
    ...node.lessons.task,
    ...node.lessons.user,
    ...node.lessons.model,
    ...node.lessons.tool,
    ...node.lessons.skill,
    ...node.lessons.subagent,
  ];

  if (allLessons.length > 0) {
    parts.push("");
    parts.push("Lessons:");
    for (const lesson of allLessons) {
      parts.push(`- ${lesson.summary}`);
    }
  }

  return parts.join("\n");
}

/**
 * Build simple embedding text from node summary data.
 *
 * This is a lightweight version for use with partial node data
 * (e.g., NodeSummaryRow from database queries).
 */
export function buildSimpleEmbeddingText(
  type: string | null,
  summary: string | null
): string {
  const parts: string[] = [];
  if (type) {
    parts.push(`[${type}]`);
  }
  if (summary) {
    parts.push(summary);
  }
  return parts.join(" ");
}

/**
 * Check if embedding text uses the rich format (includes decisions/lessons).
 *
 * Used to detect nodes with old-format embeddings that need re-embedding.
 */
export function isRichEmbeddingFormat(inputText: string): boolean {
  // Rich format includes "Decisions:" or "Lessons:" sections
  return inputText.includes("\nDecisions:") || inputText.includes("\nLessons:");
}
