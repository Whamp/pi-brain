/**
 * Semantic Search Implementation
 *
 * Provides vector-based search functionality using sqlite-vec.
 * See specs/semantic-search.md for specification.
 */

import type Database from "better-sqlite3";

import type { NodeRow } from "./node-crud.js";

import { isVecLoaded } from "./database.js";
import { deserializeEmbedding } from "./embedding-utils.js";
import {
  type SearchHighlight,
  type SearchResult,
  buildFilterClause,
  type SearchFilters,
} from "./search-repository.js";

// =============================================================================
// Types
// =============================================================================

export interface SemanticSearchResult extends SearchResult {
  /** Vector distance (lower is better, 0 = identical) */
  distance: number;
}

export interface SemanticSearchOptions {
  /** Maximum number of results (default: 20, max: 500) */
  limit?: number;
  /** Filter results by threshold distance */
  maxDistance?: number;
  /** Additional filters to combine with search */
  filters?: SearchFilters;
  /** Include text snippets in highlights (default: false) */
  includeHighlights?: boolean;
}

// =============================================================================
// Core Search Function
// =============================================================================

/**
 * Perform semantic search using vector similarity.
 *
 * Finds nodes with embeddings close to the query embedding.
 *
 * @param {Database.Database} db - Database connection
 * @param {number[]} queryEmbedding - Embedding vector for the search query
 * @param {SemanticSearchOptions} [options] - Search options (limit, filters, etc.)
 * @returns {SemanticSearchResult[]} List of matching nodes with scores and distances
 */
export function semanticSearch(
  db: Database.Database,
  queryEmbedding: number[],
  options: SemanticSearchOptions = {}
): SemanticSearchResult[] {
  // Graceful degradation: If vector extension not loaded, return empty
  if (!isVecLoaded(db)) {
    return [];
  }

  const {
    limit = 20,
    maxDistance,
    filters,
    includeHighlights = false,
  } = options;

  // Build WHERE clause from filters
  const { clause: filterClause, params: filterParams } =
    buildFilterClause(filters);

  // We need to construct a dynamic query because sqlite-vec uses virtual tables
  // and we need to join with the nodes table for metadata and filtering.
  const overfetchFactor = filters ? 5 : 1;
  const k = limit * overfetchFactor;

  // Ensure k is reasonable (e.g. not > 10000)
  const safeK = Math.min(k, 1000);

  const sql = `
    SELECT 
      n.*,
      v.distance,
      ne.input_text
    FROM node_embeddings_vec v
    JOIN node_embeddings ne ON ne.rowid = v.rowid
    JOIN nodes n ON n.id = ne.node_id
    WHERE v.embedding MATCH ?
      AND v.k = ?
      ${filterClause}
    ORDER BY v.distance
    LIMIT ?
  `;

  // Prepare parameters: embedding blob (JSON string for sqlite-vec), k, filter params..., limit
  const queryParams = [
    JSON.stringify(queryEmbedding),
    safeK,
    ...filterParams,
    limit,
  ];

  try {
    const rows = db.prepare(sql).all(...queryParams) as (NodeRow & {
      distance: number;
      input_text: string;
    })[];

    // Filter by maxDistance if specified
    const filteredRows =
      maxDistance === undefined
        ? rows
        : rows.filter((r) => r.distance <= maxDistance);

    // Map to result format
    return filteredRows.map((row) => {
      // Extract properties to separate NodeRow from extra fields
      const { distance, input_text, ...nodeRow } = row;

      // Generate snippet if requested (simple prefix for now)
      const highlights: SearchHighlight[] = [];
      if (includeHighlights && input_text) {
        // Find relevant part of text or just take summary line
        const [summaryLine] = input_text.split("\n");
        highlights.push({
          field: "summary", // Using summary as proxy field
          snippet: summaryLine,
        });
      }

      return {
        node: nodeRow as NodeRow,
        score: 1 / (1 + distance), // Convert distance to score (0..1)
        distance,
        highlights,
      };
    });
  } catch (error) {
    // Check for dimension mismatch error
    if (error instanceof Error && error.message.includes("dimensions")) {
      // Log or handle dimension mismatch (e.g. old embeddings)
      // For now, return empty result to be safe
      return [];
    }
    throw error;
  }
}

// =============================================================================
// Helper: Get Vector for Node
// =============================================================================

/**
 * Get the embedding vector for a node from the database.
 * Useful for finding "related nodes" (node-to-node similarity).
 */
export function getNodeEmbeddingVector(
  db: Database.Database,
  nodeId: string
): number[] | null {
  const row = db
    .prepare("SELECT embedding FROM node_embeddings WHERE node_id = ?")
    .get(nodeId) as { embedding: Buffer } | undefined;

  if (!row) {
    return null;
  }

  return deserializeEmbedding(row.embedding);
}

// =============================================================================
// Helper: Find Similar Nodes
// =============================================================================

/**
 * Find nodes similar to a given node.
 * Wraps semanticSearch using the node's own embedding.
 */
export function findSimilarNodes(
  db: Database.Database,
  nodeId: string,
  options: SemanticSearchOptions = {}
): SemanticSearchResult[] {
  const embedding = getNodeEmbeddingVector(db, nodeId);
  if (!embedding) {
    return [];
  }

  // Filter out the node itself
  const filters: SearchFilters = { ...options.filters };
  // Note: SearchFilters doesn't support "NOT ID", so we'll filter in memory

  const results = semanticSearch(db, embedding, {
    ...options,
    // Request one more than limit since we'll drop the node itself
    limit: (options.limit ?? 20) + 1,
    filters,
  });

  return results
    .filter((r) => r.node.id !== nodeId)
    .slice(0, options.limit ?? 20);
}
