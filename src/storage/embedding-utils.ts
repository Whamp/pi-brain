/**
 * Embedding Utilities
 *
 * Functions for building embedding text from nodes and managing embeddings.
 * See specs/semantic-search.md for specification.
 */

import type Database from "better-sqlite3";

import type { Node } from "../types/index.js";

import { isVecLoaded } from "./database.js";

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

// =============================================================================
// Embedding Storage
// =============================================================================

/**
 * Store an embedding for a node in both node_embeddings and node_embeddings_vec tables.
 *
 * Handles upsert semantics - if an embedding already exists for the node, it will be
 * replaced. The vec table is only updated if sqlite-vec is loaded.
 */
export function storeEmbeddingWithVec(
  db: Database.Database,
  nodeId: string,
  embedding: number[],
  modelName: string,
  inputText: string
): { rowid: bigint; vecUpdated: boolean } {
  // Serialize embedding to binary blob for node_embeddings table
  const embeddingBlob = serializeEmbedding(embedding);

  // Insert or replace in node_embeddings table
  // Using INSERT OR REPLACE handles the upsert case
  db.prepare(
    `INSERT OR REPLACE INTO node_embeddings (node_id, embedding, embedding_model, input_text)
     VALUES (?, ?, ?, ?)`
  ).run(nodeId, embeddingBlob, modelName, inputText);

  // Get the rowid for the embedding (needed for vec table)
  const row = db
    .prepare(`SELECT rowid FROM node_embeddings WHERE node_id = ?`)
    .get(nodeId) as { rowid: number | bigint } | undefined;

  if (!row) {
    throw new Error(`Failed to get rowid for node embedding: ${nodeId}`);
  }

  // Convert to BigInt for vec table (sqlite-vec requires BigInt for rowid)
  const rowid = typeof row.rowid === "bigint" ? row.rowid : BigInt(row.rowid);

  // Update vec table if sqlite-vec is loaded
  let vecUpdated = false;
  if (isVecLoaded(db)) {
    try {
      // Delete any existing entry (for upsert semantics)
      db.prepare(`DELETE FROM node_embeddings_vec WHERE rowid = ?`).run(rowid);

      // Insert into vec table with JSON array format
      db.prepare(
        `INSERT INTO node_embeddings_vec (rowid, embedding) VALUES (?, vec_f32(?))`
      ).run(rowid, JSON.stringify(embedding));

      vecUpdated = true;
    } catch (error) {
      // Dimension mismatch or other vec table error - log but don't fail
      // This can happen if the embedding dimension doesn't match the table schema
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("Dimension mismatch")) {
        throw error; // Re-throw non-dimension errors
      }
      // Dimension mismatch is expected when model changes - backfill job will fix
    }
  }

  return { rowid, vecUpdated };
}

/**
 * Delete an embedding from both node_embeddings and node_embeddings_vec tables.
 */
export function deleteEmbedding(
  db: Database.Database,
  nodeId: string
): boolean {
  // Get the rowid first (needed for vec table)
  const row = db
    .prepare(`SELECT rowid FROM node_embeddings WHERE node_id = ?`)
    .get(nodeId) as { rowid: bigint } | undefined;

  if (!row) {
    return false;
  }

  // Delete from vec table if loaded
  if (isVecLoaded(db)) {
    db.prepare(`DELETE FROM node_embeddings_vec WHERE rowid = ?`).run(
      row.rowid
    );
  }

  // Delete from embeddings table
  const result = db
    .prepare(`DELETE FROM node_embeddings WHERE node_id = ?`)
    .run(nodeId);

  return result.changes > 0;
}

/**
 * Get embedding for a node.
 */
export function getEmbedding(
  db: Database.Database,
  nodeId: string
): {
  embedding: number[];
  modelName: string;
  inputText: string;
  createdAt: string;
} | null {
  const row = db
    .prepare(
      `SELECT embedding, embedding_model, input_text, created_at 
       FROM node_embeddings WHERE node_id = ?`
    )
    .get(nodeId) as
    | {
        embedding: Buffer;
        embedding_model: string;
        input_text: string;
        created_at: string;
      }
    | undefined;

  if (!row) {
    return null;
  }

  return {
    embedding: deserializeEmbedding(row.embedding),
    modelName: row.embedding_model,
    inputText: row.input_text,
    createdAt: row.created_at,
  };
}

/**
 * Check if a node has an embedding stored.
 */
export function hasEmbedding(db: Database.Database, nodeId: string): boolean {
  const row = db
    .prepare(`SELECT 1 FROM node_embeddings WHERE node_id = ?`)
    .get(nodeId);
  return row !== undefined;
}

// =============================================================================
// Serialization Helpers
// =============================================================================

/**
 * Serialize an embedding array to a binary Buffer (Float32 little-endian).
 *
 * This format is used for storing in the node_embeddings table.
 */
export function serializeEmbedding(embedding: number[]): Buffer {
  const buffer = Buffer.alloc(embedding.length * 4);
  for (let i = 0; i < embedding.length; i++) {
    buffer.writeFloatLE(embedding[i], i * 4);
  }
  return buffer;
}

/**
 * Deserialize a binary Buffer to an embedding array.
 *
 * Inverse of serializeEmbedding.
 */
export function deserializeEmbedding(buffer: Buffer): number[] {
  const embedding: number[] = [];
  for (let i = 0; i < buffer.length; i += 4) {
    embedding.push(buffer.readFloatLE(i));
  }
  return embedding;
}
