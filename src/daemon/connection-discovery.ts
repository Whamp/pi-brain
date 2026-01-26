/**
 * Connection Discovery - Finds semantic connections between nodes
 *
 * Implements simple keyword/tag similarity to find related nodes
 * without using an LLM. Used by the nightly connection discovery job.
 */

import type Database from "better-sqlite3";

import {
  createEdge,
  edgeExists,
  getNode,
  type Edge,
  type NodeRow,
} from "../storage/node-repository.js";

// Common English stopwords to filter out from summaries
const STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "but",
  "if",
  "then",
  "else",
  "when",
  "at",
  "by",
  "for",
  "from",
  "in",
  "of",
  "on",
  "to",
  "with",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "i",
  "you",
  "he",
  "she",
  "it",
  "we",
  "they",
  "this",
  "that",
  "these",
  "those",
  "which",
  "who",
  "whom",
  "whose",
  "can",
  "could",
  "will",
  "would",
  "shall",
  "should",
  "may",
  "might",
  "must",
  "about",
  "above",
  "across",
  "after",
  "against",
  "along",
  "among",
  "around",
  "before",
  "behind",
  "below",
  "beneath",
  "beside",
  "between",
  "beyond",
  "during",
  "inside",
  "into",
  "near",
  "outside",
  "over",
  "through",
  "under",
  "until",
  "up",
  "upon",
  "within",
  "without",
  "impl",
  "implement",
  "implemented",
  "fix",
  "fixed",
  "fixing", // Common dev words
  "add",
  "added",
  "adding",
  "update",
  "updated",
  "updating",
  "create",
  "created",
  "creating",
  "remove",
  "removed",
  "removing",
  "use",
  "used",
  "using",
  "make",
  "made",
  "making",
]);

export interface ConnectionResult {
  sourceNodeId: string;
  edges: Edge[];
}

export class ConnectionDiscoverer {
  constructor(private db: Database.Database) {}

  /**
   * Discover and create connections for a node
   * @param {string} nodeId The ID of the node to find connections for
   * @param {object} options Configuration options
   */
  public async discover(
    nodeId: string,
    options: {
      threshold?: number;
      limit?: number;
      daysToLookBack?: number;
    } = {}
  ): Promise<ConnectionResult> {
    const threshold = options.threshold ?? 0.2; // Similarity threshold (0-1)
    const limit = options.limit ?? 50; // Max candidates to check
    const daysToLookBack = options.daysToLookBack ?? 30;

    // 1. Get source node
    const sourceNode = getNode(this.db, nodeId);
    if (!sourceNode) {
      throw new Error(`Node ${nodeId} not found`);
    }

    // 2. Get source node metadata (tags, topics, summary)
    // We need to fetch tags/topics separately since they aren't in NodeRow
    const sourceMeta = this.getNodeMetadata(nodeId);
    if (!sourceMeta) {
      // Should handle this better, but for now assume no metadata
      return { sourceNodeId: nodeId, edges: [] };
    }

    // Use summary from the node row if available, otherwise from metadata
    const sourceSummary = sourceNode.summary || "";

    // 3. Find candidates
    // Look for nodes in the last N days, excluding self
    const candidates = this.findCandidates(nodeId, daysToLookBack, limit);

    const newEdges: Edge[] = [];

    // 4. Compare and create edges
    for (const candidate of candidates) {
      // Skip if edge already exists
      if (edgeExists(this.db, nodeId, candidate.id)) {
        continue;
      }

      const candidateMeta = this.getNodeMetadata(candidate.id);
      if (!candidateMeta) {
        continue;
      }

      const score = this.calculateSimilarity(
        {
          tags: sourceMeta.tags,
          topics: sourceMeta.topics,
          summary: sourceSummary,
        },
        {
          tags: candidateMeta.tags,
          topics: candidateMeta.topics,
          summary: candidate.summary || "",
        }
      );

      if (score >= threshold) {
        const edge = createEdge(this.db, nodeId, candidate.id, "semantic", {
          metadata: {
            similarity: score,
            reason: "Auto-discovered by semantic similarity",
          },
          createdBy: "daemon",
        });
        newEdges.push(edge);
      }
    }

    return { sourceNodeId: nodeId, edges: newEdges };
  }

  private getNodeMetadata(
    nodeId: string
  ): { tags: Set<string>; topics: Set<string> } | null {
    try {
      const tags = this.db
        .prepare("SELECT tag FROM tags WHERE node_id = ?")
        .all(nodeId) as { tag: string }[];
      const topics = this.db
        .prepare("SELECT topic FROM topics WHERE node_id = ?")
        .all(nodeId) as { topic: string }[];

      return {
        tags: new Set(tags.map((t) => t.tag)),
        topics: new Set(topics.map((t) => t.topic)),
      };
    } catch {
      return null;
    }
  }

  private findCandidates(
    excludeNodeId: string,
    days: number,
    limit: number
  ): NodeRow[] {
    return this.db
      .prepare(`
      SELECT * FROM nodes
      WHERE id != ?
      AND timestamp > datetime('now', '-' || ? || ' days')
      ORDER BY timestamp DESC
      LIMIT ?
    `)
      .all(excludeNodeId, days, limit) as NodeRow[];
  }

  /**
   * Calculate similarity score between two nodes (0-1)
   * Uses weighted average of:
   * - Jaccard index of tags (weight 0.4)
   * - Jaccard index of topics (weight 0.3)
   * - Jaccard index of summary words (weight 0.3)
   */
  public calculateSimilarity(
    a: { tags: Set<string>; topics: Set<string>; summary: string },
    b: { tags: Set<string>; topics: Set<string>; summary: string }
  ): number {
    const tagsScore = this.jaccardIndex(a.tags, b.tags);
    const topicsScore = this.jaccardIndex(a.topics, b.topics);

    const wordsA = this.tokenize(a.summary);
    const wordsB = this.tokenize(b.summary);
    const summaryScore = this.jaccardIndex(wordsA, wordsB);

    // Weights can be tuned
    return tagsScore * 0.4 + topicsScore * 0.3 + summaryScore * 0.3;
  }

  private jaccardIndex(setA: Set<string>, setB: Set<string>): number {
    if (setA.size === 0 && setB.size === 0) {
      return 0;
    }

    let intersection = 0;
    for (const item of setA) {
      if (setB.has(item)) {
        intersection++;
      }
    }

    const union = setA.size + setB.size - intersection;
    return intersection / union;
  }

  private tokenize(text: string): Set<string> {
    if (!text) {
      return new Set();
    }

    return new Set(
      text
        .toLowerCase()
        .replaceAll(/[^\w\s]/g, "") // Remove punctuation
        .split(/\s+/)
        .filter((w) => w.length > 2 && !STOPWORDS.has(w))
    );
  }
}
