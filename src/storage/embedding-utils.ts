/**
 * Embedding Utilities
 *
 * Functions for building embedding text from nodes and managing embeddings.
 * See specs/semantic-search.md for specification.
 */

import type { Node } from "../types/index.js";

/**
 * Format version marker appended to rich embedding text.
 * Used to distinguish new-format embeddings (even with empty decisions/lessons)
 * from old simple-format embeddings.
 */
export const EMBEDDING_FORMAT_VERSION = "[emb:v2]";

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

  // Lessons from all levels in deterministic order: project, task, user, model, tool, skill, subagent
  // This order is stable across runs since it matches the LessonsByLevel interface property order
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

  // Append version marker to identify new-format embeddings
  // This ensures even nodes with empty decisions/lessons are recognized as new format
  parts.push("");
  parts.push(EMBEDDING_FORMAT_VERSION);

  return parts.join("\n");
}

/**
 * Build simple embedding text from node summary data.
 *
 * This is a lightweight version for use with partial node data
 * (e.g., NodeSummaryRow from database queries).
 *
 * Returns:
 * - `[type] summary` when both are present
 * - `summary` when only summary is present
 * - `[type]` when only type is present (sparse but valid for type-only filtering)
 * - `` (empty string) when both are null
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
 *
 * Detection criteria (any of these indicate rich format):
 * 1. Contains the version marker [emb:v2]
 * 2. Contains section headers: `\n\nDecisions:\n-` or `\n\nLessons:\n-`
 *
 * The version marker is the primary check - it handles nodes with empty
 * decisions/lessons that would otherwise be perpetually re-embedded.
 */
export function isRichEmbeddingFormat(inputText: string): boolean {
  // Check for version marker first (handles empty decisions/lessons case)
  if (inputText.includes(EMBEDDING_FORMAT_VERSION)) {
    return true;
  }

  // Must start with [type] format
  if (!inputText.startsWith("[")) {
    return false;
  }

  // Rich format has section headers preceded by blank line and followed by bullet points
  // Check for "\n\nDecisions:\n-" or "\n\nLessons:\n-" patterns
  const hasDecisionsSection = inputText.includes("\n\nDecisions:\n-");
  const hasLessonsSection = inputText.includes("\n\nLessons:\n-");

  return hasDecisionsSection || hasLessonsSection;
}
