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
 * Detection relies on the version marker [emb:v2]. This avoids strict
 * dependencies on whitespace or formatting of the sections.
 */
export function isRichEmbeddingFormat(inputText: string): boolean {
  return inputText.includes(EMBEDDING_FORMAT_VERSION);
}

// =============================================================================
// Embedding Storage
// =============================================================================

/**
 * Store an embedding for a node in both node_embeddings and node_embeddings_vec tables.
 *
 * Handles upsert semantics - if an embedding already exists for the node, it will be
 * replaced. The vec table is only updated if sqlite-vec is loaded.
 *
 * Uses a transaction to ensure atomicity - either both tables are updated or neither.
 */
export function storeEmbeddingWithVec(
  db: Database.Database,
  nodeId: string,
  embedding: number[],
  modelName: string,
  inputText: string
): { rowid: bigint; vecUpdated: boolean } {
  // Wrap in transaction for atomicity
  const txn = db.transaction(() => {
    // Serialize embedding to binary blob for node_embeddings table
    const embeddingBlob = serializeEmbedding(embedding);

    // Query old rowid BEFORE INSERT OR REPLACE
    // INSERT OR REPLACE deletes then inserts, which can change the rowid
    // We need the old rowid to delete any existing vec table entry
    const oldRow = db
      .prepare(`SELECT rowid FROM node_embeddings WHERE node_id = ?`)
      .get(nodeId) as { rowid: number | bigint } | undefined;

    let oldRowid: bigint | null = null;
    if (oldRow) {
      oldRowid =
        typeof oldRow.rowid === "bigint" ? oldRow.rowid : BigInt(oldRow.rowid);
    }

    // Insert or replace in node_embeddings table
    // Using INSERT OR REPLACE handles the upsert case
    db.prepare(
      `INSERT OR REPLACE INTO node_embeddings (node_id, embedding, embedding_model, input_text)
       VALUES (?, ?, ?, ?)`
    ).run(nodeId, embeddingBlob, modelName, inputText);

    // Get the new rowid for the embedding (needed for vec table)
    const newRow = db
      .prepare(`SELECT rowid FROM node_embeddings WHERE node_id = ?`)
      .get(nodeId) as { rowid: number | bigint } | undefined;

    if (!newRow) {
      throw new Error(`Failed to get rowid for node embedding: ${nodeId}`);
    }

    // Convert to BigInt for vec table (sqlite-vec requires BigInt for rowid)
    const rowid =
      typeof newRow.rowid === "bigint" ? newRow.rowid : BigInt(newRow.rowid);

    // Update vec table if sqlite-vec is loaded
    let vecUpdated = false;
    if (isVecLoaded(db)) {
      // Delete old entry using the OLD rowid (may differ from new rowid)
      if (oldRowid !== null) {
        db.prepare(`DELETE FROM node_embeddings_vec WHERE rowid = ?`).run(
          oldRowid
        );
      }

      // Insert into vec table with JSON array format using the NEW rowid
      // This will throw if dimensions mismatch the table schema, which is intentional.
      // Failing here prevents the system from being in an inconsistent state
      // (embedded in blob but not searchable).
      db.prepare(
        `INSERT INTO node_embeddings_vec (rowid, embedding) VALUES (?, vec_f32(?))`
      ).run(rowid, JSON.stringify(embedding));

      vecUpdated = true;
    }

    return { rowid, vecUpdated };
  });

  return txn();
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
    .get(nodeId) as { rowid: number | bigint } | undefined;

  if (!row) {
    return false;
  }

  // Convert to BigInt for vec table consistency
  const rowid = typeof row.rowid === "bigint" ? row.rowid : BigInt(row.rowid);

  // Delete from vec table if loaded
  if (isVecLoaded(db)) {
    db.prepare(`DELETE FROM node_embeddings_vec WHERE rowid = ?`).run(rowid);
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

// =============================================================================
// Backfill Types
// =============================================================================

/**
 * Embedding provider interface for backfill operations.
 * Matches the EmbeddingProvider interface from facet-discovery.ts.
 */
export interface BackfillEmbeddingProvider {
  embed(texts: string[]): Promise<number[][]>;
  dimensions: number;
  modelName: string;
}

/**
 * Logger interface for backfill operations.
 */
export interface BackfillLogger {
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
  debug?: (message: string) => void;
}

/**
 * Options for backfillEmbeddings function.
 */
export interface BackfillEmbeddingsOptions {
  /** Maximum number of nodes to process in one run (default: 100) */
  limit?: number;
  /** Batch size for embedding API calls (default: 10) */
  batchSize?: number;
  /** Force re-embed all nodes, not just outdated ones */
  force?: boolean;
  /** Logger for progress reporting */
  logger?: BackfillLogger;
  /** Progress callback called after each batch */
  onProgress?: (processed: number, total: number) => void;
}

/**
 * Result of a backfill operation.
 */
export interface BackfillResult {
  /** Total nodes that needed embedding */
  totalNodes: number;
  /** Nodes successfully embedded */
  successCount: number;
  /** Nodes that failed to embed */
  failureCount: number;
  /** Node IDs that failed */
  failedNodeIds: string[];
  /** Duration in milliseconds */
  durationMs: number;
}

// =============================================================================
// Backfill Implementation
// =============================================================================

/** Default no-op logger for backfill */
const noopLogger: BackfillLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
};

/**
 * Row type for nodes query
 */
interface NodeNeedingEmbeddingRow {
  id: string;
  data_file: string;
}

/**
 * Find nodes that need embedding generation or update.
 *
 * A node needs embedding if:
 * 1. No embedding exists for it
 * 2. Embedding uses a different model than the current provider
 * 3. Embedding uses old format (not rich format with decisions/lessons)
 */
export function findNodesNeedingEmbedding(
  db: Database.Database,
  provider: BackfillEmbeddingProvider,
  options: { limit?: number; force?: boolean } = {}
): NodeNeedingEmbeddingRow[] {
  const { limit = 100, force = false } = options;

  if (force) {
    // Force mode: return all nodes up to limit
    return db
      .prepare(
        `SELECT n.id, n.data_file
         FROM nodes n
         ORDER BY n.timestamp DESC
         LIMIT ?`
      )
      .all(limit) as NodeNeedingEmbeddingRow[];
  }

  // Normal mode: find nodes missing embeddings or with outdated format
  // We use a LEFT JOIN to find nodes that:
  // 1. Have no embedding record (ne.node_id IS NULL)
  // 2. OR have an embedding from a different model
  // 3. OR have an embedding with the old format (missing version marker)
  return db
    .prepare(
      `SELECT n.id, n.data_file
       FROM nodes n
       LEFT JOIN node_embeddings ne ON n.id = ne.node_id
       WHERE ne.node_id IS NULL
          OR ne.embedding_model != ?
          OR ne.input_text NOT LIKE '%' || ? || '%'
       ORDER BY n.timestamp DESC
       LIMIT ?`
    )
    .all(
      provider.modelName,
      EMBEDDING_FORMAT_VERSION,
      limit
    ) as NodeNeedingEmbeddingRow[];
}

/**
 * Backfill embeddings for nodes that are missing or have outdated embeddings.
 *
 * This function:
 * 1. Finds nodes needing embedding (missing, wrong model, or old format)
 * 2. Loads full node data from JSON files
 * 3. Builds rich embedding text (summary + decisions + lessons)
 * 4. Generates embeddings in batches via the provider
 * 5. Stores in both node_embeddings table and node_embeddings_vec (if available)
 *
 * Errors are handled gracefully:
 * - Individual node failures don't stop the batch
 * - Returns statistics including failed node IDs for retry
 */
export async function backfillEmbeddings(
  db: Database.Database,
  provider: BackfillEmbeddingProvider,
  readNodeFromPath: (dataFile: string) => Node,
  options: BackfillEmbeddingsOptions = {}
): Promise<BackfillResult> {
  const {
    limit = 100,
    batchSize = 10,
    force = false,
    logger = noopLogger,
    onProgress,
  } = options;

  const startTime = Date.now();

  // Find nodes that need embedding
  const nodes = findNodesNeedingEmbedding(db, provider, { limit, force });
  const totalNodes = nodes.length;

  if (totalNodes === 0) {
    logger.info("No nodes need embedding backfill");
    return {
      totalNodes: 0,
      successCount: 0,
      failureCount: 0,
      failedNodeIds: [],
      durationMs: Date.now() - startTime,
    };
  }

  logger.info(
    `Found ${totalNodes} nodes needing embedding (limit: ${limit}, force: ${force})`
  );

  let successCount = 0;
  let failureCount = 0;
  const failedNodeIds: string[] = [];

  // Process in batches
  for (let i = 0; i < nodes.length; i += batchSize) {
    const batch = nodes.slice(i, i + batchSize);
    const batchTexts: { nodeId: string; text: string }[] = [];

    // Build embedding text for each node in the batch
    for (const node of batch) {
      try {
        const fullNode = readNodeFromPath(node.data_file);
        const text = buildEmbeddingText(fullNode);
        batchTexts.push({ nodeId: node.id, text });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.warn(`Failed to load node ${node.id}: ${message}`);
        failedNodeIds.push(node.id);
        failureCount++;
      }
    }

    if (batchTexts.length === 0) {
      continue;
    }

    // Generate embeddings for the batch
    try {
      const texts = batchTexts.map((bt) => bt.text);
      const embeddings = await provider.embed(texts);

      // Store each embedding
      for (let j = 0; j < batchTexts.length; j++) {
        const { nodeId, text } = batchTexts[j];
        const embedding = embeddings[j];

        if (!embedding || embedding.length === 0) {
          logger.warn(`Empty embedding returned for node ${nodeId}`);
          failedNodeIds.push(nodeId);
          failureCount++;
          continue;
        }

        try {
          storeEmbeddingWithVec(
            db,
            nodeId,
            embedding,
            provider.modelName,
            text
          );
          successCount++;
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          logger.warn(`Failed to store embedding for ${nodeId}: ${message}`);
          failedNodeIds.push(nodeId);
          failureCount++;
        }
      }
    } catch (error) {
      // Batch embedding failed - mark all nodes in batch as failed
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Batch embedding failed: ${message}`);
      for (const { nodeId } of batchTexts) {
        failedNodeIds.push(nodeId);
        failureCount++;
      }
    }

    // Progress callback
    const processed = Math.min(i + batchSize, nodes.length);
    onProgress?.(processed, totalNodes);
    logger.debug?.(
      `Processed ${processed}/${totalNodes} nodes (${successCount} success, ${failureCount} failed)`
    );
  }

  const durationMs = Date.now() - startTime;
  logger.info(
    `Backfill complete: ${successCount}/${totalNodes} successful in ${durationMs}ms`
  );

  return {
    totalNodes,
    successCount,
    failureCount,
    failedNodeIds,
    durationMs,
  };
}

/**
 * Count nodes that need embedding backfill.
 *
 * Useful for showing progress or estimating work before running backfill.
 */
export function countNodesNeedingEmbedding(
  db: Database.Database,
  provider: BackfillEmbeddingProvider,
  options: { force?: boolean } = {}
): { total: number; needsEmbedding: number } {
  const { force = false } = options;

  // Count total nodes
  const totalRow = db.prepare("SELECT COUNT(*) as count FROM nodes").get() as {
    count: number;
  };
  const total = totalRow.count;

  if (force) {
    return { total, needsEmbedding: total };
  }

  // Count nodes with valid embeddings (right model and rich format)
  // This is more efficient than loading all nodes for a count
  const validEmbeddingsRow = db
    .prepare(
      `SELECT COUNT(*) as count
       FROM node_embeddings
       WHERE embedding_model = ?
         AND (input_text LIKE '%[emb:v2]%'
              OR input_text LIKE '%\n\nDecisions:\n-%'
              OR input_text LIKE '%\n\nLessons:\n-%')`
    )
    .get(provider.modelName) as { count: number };

  const needsEmbedding = total - validEmbeddingsRow.count;
  return { total, needsEmbedding };
}
