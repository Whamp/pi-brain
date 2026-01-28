/**
 * Creative Associator
 *
 * Discovers non-obvious connections between disparate nodes using vector similarity.
 * Part of the "Creative" consolidation cycle (weekly).
 *
 * Algorithm:
 * 1. Sample random nodes with relevance > 0.3
 * 2. Find similar but unconnected nodes via vector search
 * 3. Create RELATES_TO or semantic edges if similarity > threshold
 *
 * @see docs/specs/automem-features.md
 */

import type Database from "better-sqlite3";

import { isVecLoaded } from "../../storage/database.js";
import { createEdge } from "../../storage/edge-repository.js";
import { semanticSearch } from "../../storage/embedding-utils.js";

// =============================================================================
// Constants
// =============================================================================

/** Default similarity threshold for creating edges */
const DEFAULT_SIMILARITY_THRESHOLD = 0.75;

/** Default number of nodes to sample per run */
const DEFAULT_SAMPLE_SIZE = 50;

/** Maximum edges to create per node */
const MAX_EDGES_PER_NODE = 3;

// =============================================================================
// Types
// =============================================================================

/**
 * Configuration for the creative associator
 */
export interface CreativeAssociatorConfig {
  /** Minimum similarity score to create edge (0.0-1.0) */
  similarityThreshold?: number;
  /** Number of nodes to sample per run */
  sampleSize?: number;
  /** Minimum relevance score for nodes to consider */
  minRelevance?: number;
  /** Maximum edges to create per node */
  maxEdgesPerNode?: number;
}

/**
 * Result of a creative association run
 */
export interface CreativeAssociatorResult {
  /** Number of nodes sampled */
  nodesSampled: number;
  /** Number of edges created */
  edgesCreated: number;
  /** Nodes that were processed */
  processedNodes: string[];
  /** Errors encountered */
  errors: string[];
}

/**
 * Node with embedding data
 */
interface NodeWithEmbedding {
  id: string;
  summary: string | null;
  embedding: number[] | null;
}

// =============================================================================
// CreativeAssociator
// =============================================================================

/**
 * Discovers and creates non-obvious connections between nodes
 */
export class CreativeAssociator {
  private similarityThreshold: number;
  private sampleSize: number;
  private minRelevance: number;
  private maxEdgesPerNode: number;

  constructor(
    private db: Database.Database,
    config: CreativeAssociatorConfig = {}
  ) {
    this.similarityThreshold =
      config.similarityThreshold ?? DEFAULT_SIMILARITY_THRESHOLD;
    this.sampleSize = config.sampleSize ?? DEFAULT_SAMPLE_SIZE;
    this.minRelevance = config.minRelevance ?? 0.3;
    this.maxEdgesPerNode = config.maxEdgesPerNode ?? MAX_EDGES_PER_NODE;
  }

  /**
   * Check if a connection already exists between two nodes
   */
  private edgeExists(sourceId: string, targetId: string): boolean {
    const result = this.db
      .prepare<[string, string, string, string], { count: number }>(
        `
        SELECT COUNT(*) as count FROM edges
        WHERE (source_node_id = ? AND target_node_id = ?)
           OR (source_node_id = ? AND target_node_id = ?)
      `
      )
      .get(sourceId, targetId, targetId, sourceId);
    return (result?.count ?? 0) > 0;
  }

  /**
   * Sample nodes with sufficient relevance that have embeddings
   */
  private sampleNodes(): NodeWithEmbedding[] {
    // Get nodes with relevance above threshold that have embeddings
    const nodes = this.db
      .prepare<[number, number], { id: string; summary: string | null }>(
        `
        SELECT n.id, n.summary
        FROM nodes n
        INNER JOIN node_embeddings ne ON n.id = ne.node_id
        WHERE (n.archived IS NULL OR n.archived = 0)
          AND (n.relevance_score IS NULL OR n.relevance_score >= ?)
        ORDER BY RANDOM()
        LIMIT ?
      `
      )
      .all(this.minRelevance, this.sampleSize);

    return nodes.map((n) => ({
      id: n.id,
      summary: n.summary,
      embedding: null, // We'll use semanticSearch which handles embeddings internally
    }));
  }

  /**
   * Find similar nodes using semantic search
   */
  private async findSimilarNodes(
    nodeId: string,
    summary: string | null
  ): Promise<{ id: string; distance: number }[]> {
    if (!summary) {
      return [];
    }

    // Use semantic search to find similar nodes
    const results = await semanticSearch(
      this.db,
      summary,
      this.maxEdgesPerNode + 5, // Get extra to account for self and existing edges
      {
        excludeNodeIds: [nodeId],
      }
    );

    // Filter by similarity threshold (distance < threshold means similar)
    // semanticSearch returns distance (lower = more similar)
    // Convert to similarity: similarity = 1 - distance
    return results
      .filter((r) => 1 - r.distance >= this.similarityThreshold)
      .slice(0, this.maxEdgesPerNode);
  }

  /**
   * Run creative association to discover new connections
   */
  async run(): Promise<CreativeAssociatorResult> {
    const result: CreativeAssociatorResult = {
      nodesSampled: 0,
      edgesCreated: 0,
      processedNodes: [],
      errors: [],
    };

    // Check if vector search is available
    if (!isVecLoaded(this.db)) {
      result.errors.push(
        "sqlite-vec extension not loaded - creative association requires embeddings"
      );
      return result;
    }

    // Sample nodes
    const nodes = this.sampleNodes();
    result.nodesSampled = nodes.length;

    for (const node of nodes) {
      try {
        result.processedNodes.push(node.id);

        // Find similar nodes
        const similar = await this.findSimilarNodes(node.id, node.summary);

        for (const match of similar) {
          // Skip if edge already exists
          if (this.edgeExists(node.id, match.id)) {
            continue;
          }

          // Create RELATES_TO edge with similarity metadata
          const similarity = 1 - match.distance;
          createEdge(this.db, {
            sourceNodeId: node.id,
            targetNodeId: match.id,
            type: "RELATES_TO",
            createdBy: "daemon",
            metadata: {
              similarity,
              reason: "Creative association via vector similarity",
            },
            confidence: similarity,
            similarity,
          });

          result.edgesCreated++;
        }
      } catch (error) {
        result.errors.push(
          `Error processing node ${node.id}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    return result;
  }

  /**
   * Get configuration
   */
  getConfig(): Required<CreativeAssociatorConfig> {
    return {
      similarityThreshold: this.similarityThreshold,
      sampleSize: this.sampleSize,
      minRelevance: this.minRelevance,
      maxEdgesPerNode: this.maxEdgesPerNode,
    };
  }
}
