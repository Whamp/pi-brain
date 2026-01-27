/**
 * Connection Discovery - Finds semantic connections between nodes
 *
 * Implements simple keyword/tag similarity to find related nodes
 * without using an LLM. Used by the nightly connection discovery job.
 */

import type Database from "better-sqlite3";

import type { Edge } from "../types/index.js";

import {
  createEdge,
  edgeExists,
  getNode,
  getNodeSummary,
  type NodeRow,
} from "../storage/node-repository.js";

interface LessonRow {
  id: string;
  node_id: string;
  level: string;
  summary: string;
  details: string | null;
  confidence: string;
}

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
  /** The ID of the source node that connections were discovered for */
  sourceNodeId: string;
  /** Array of newly created edges */
  edges: Edge[];
}

/**
 * Discovers semantic connections between nodes in the knowledge graph.
 *
 * Uses keyword/tag similarity, explicit references, and lesson reinforcement
 * patterns to find related nodes. Does not use LLM - relies on FTS and
 * Jaccard similarity for performance.
 *
 * @example
 * ```typescript
 * const discoverer = new ConnectionDiscoverer(db);
 * const result = await discoverer.discover(nodeId, { threshold: 0.3 });
 * console.log(`Found ${result.edges.length} connections`);
 * ```
 */
export class ConnectionDiscoverer {
  /**
   * Create a new ConnectionDiscoverer instance
   * @param {Database.Database} db - SQLite database connection
   */
  constructor(private db: Database.Database) {}

  /**
   * Discover and create connections for a node
   *
   * Analyzes the source node and finds semantically related older nodes.
   * Creates edges of three types:
   * - `semantic`: Nodes with similar tags/topics/summaries
   * - `reference`: Nodes explicitly referenced by ID in text
   * - `lesson_application`: Nodes with matching lessons learned
   *
   * @param {string} nodeId - The ID of the node to find connections for
   * @param {object} options - Configuration options
   * @param {number} [options.threshold] - Minimum similarity score (0-1) to create edge (default: 0.2)
   * @param {number} [options.limit] - Maximum number of candidate nodes to check (default: 50)
   * @param {number} [options.daysToLookBack] - How far back to search for connections (default: 30)
   * @returns {Promise<ConnectionResult>} Promise resolving to the source node ID and array of created edges
   * @throws {Error} If the node ID is not found in the database
   *
   * @example
   * ```typescript
   * const result = await discoverer.discover('abc123', {
   *   threshold: 0.25,
   *   limit: 100,
   *   daysToLookBack: 60
   * });
   * ```
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

    // Use summary from FTS if available
    const sourceSummary = getNodeSummary(this.db, nodeId) || "";
    const fullText = this.getNodeFullText(nodeId) || sourceSummary;

    // 3. Find candidates
    // Look for nodes older than the source node but within the lookback window
    const candidates = this.findCandidates(
      nodeId,
      sourceNode.timestamp,
      daysToLookBack,
      limit
    );

    const newEdges: Edge[] = [];

    // 3b. Detect references (Explicit Node IDs)
    const referenceEdges = this.detectReferences(nodeId, fullText);
    newEdges.push(...referenceEdges);

    // 3c. Detect lesson reinforcement
    const lessonEdges = this.detectLessonReinforcement(
      nodeId,
      sourceNode.timestamp,
      threshold,
      limit
    );
    newEdges.push(...lessonEdges);

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
    sourceTimestamp: string,
    days: number,
    limit: number
  ): (NodeRow & { summary: string | null })[] {
    const startDate = new Date(sourceTimestamp);
    // Safety check
    if (Number.isNaN(startDate.getTime())) {
      return [];
    }
    const limitDate = new Date(startDate);
    limitDate.setDate(limitDate.getDate() - days);
    const limitStr = limitDate.toISOString();

    return this.db
      .prepare(`
      SELECT n.*, f.summary 
      FROM nodes n
      LEFT JOIN nodes_fts f ON n.id = f.node_id
      WHERE n.id != ?
      AND n.timestamp < ?
      AND n.timestamp > ?
      ORDER BY n.timestamp DESC
      LIMIT ?
    `)
      .all(excludeNodeId, sourceTimestamp, limitStr, limit) as (NodeRow & {
      summary: string | null;
    })[];
  }

  private getNodeFullText(nodeId: string): string {
    try {
      const row = this.db
        .prepare(
          "SELECT summary, decisions, lessons FROM nodes_fts WHERE node_id = ?"
        )
        .get(nodeId) as
        | {
            summary: string;
            decisions: string;
            lessons: string;
          }
        | undefined;

      if (!row) {
        return "";
      }
      return `${row.summary} ${row.decisions} ${row.lessons}`;
    } catch {
      return "";
    }
  }

  /**
   * Escape a token for use in FTS5 quoted strings.
   * Double quotes are escaped by doubling them (FTS5 convention).
   */
  private escapeFtsToken(token: string): string {
    return token.replaceAll('"', '""');
  }

  private detectReferences(sourceNodeId: string, sourceText: string): Edge[] {
    // Regex for 16-char hex strings (node IDs).
    // Matches exactly 16 hex chars, surrounded by word boundaries.
    // May over-match git SHAs, hashes, etc. - false positives are filtered
    // by the DB lookup below, so over-matching is acceptable.
    const hexRegex = /\b[a-f0-9]{16}\b/g;
    const matches = sourceText.match(hexRegex);

    if (!matches) {
      return [];
    }

    const uniqueMatches = [...new Set(matches)];
    const edges: Edge[] = [];

    for (const targetId of uniqueMatches) {
      if (targetId === sourceNodeId) {
        continue;
      }

      // Check if target node exists
      // Use getNode from node-repository which is imported
      const targetNode = getNode(this.db, targetId);

      if (targetNode) {
        // Skip if edge already exists
        if (edgeExists(this.db, sourceNodeId, targetId)) {
          continue;
        }

        // Create reference edge
        const edge = createEdge(this.db, sourceNodeId, targetId, "reference", {
          metadata: {
            reason: "Explicit reference in text",
          },
          createdBy: "daemon",
        });
        edges.push(edge);
      }
    }
    return edges;
  }

  private detectLessonReinforcement(
    nodeId: string,
    sourceTimestamp: string,
    threshold: number,
    limit: number
  ): Edge[] {
    const lessons = this.getLessons(nodeId);
    if (lessons.length === 0) {
      return [];
    }

    const edges: Edge[] = [];
    // Track targets we've already created edges for to avoid duplicates
    // when multiple lessons match the same candidate node
    const seenTargets = new Set<string>();

    for (const lesson of lessons) {
      // 1. Build query from lesson summary
      const tokens = this.tokenize(lesson.summary);
      if (tokens.size === 0) {
        continue;
      } // Skip empty lessons

      // Create OR query for FTS
      // We search specifically in the 'lessons' column
      // Escape quotes in tokens to prevent FTS5 syntax errors
      const queryTerms = [...tokens]
        .map((t) => `"${this.escapeFtsToken(t)}"`)
        .join(" OR ");
      const ftsQuery = `lessons:(${queryTerms})`;

      // 2. Find candidates
      // We look for nodes that have SIMILAR lessons
      // We exclude the source node and future nodes
      // Use explicit LIMIT to avoid scanning too many nodes
      const candidates = this.db
        .prepare(
          `
        SELECT n.id, n.timestamp
        FROM nodes n
        JOIN nodes_fts ON n.id = nodes_fts.node_id
        WHERE n.id != ?
        AND n.timestamp < ?
        AND nodes_fts MATCH ?
        LIMIT ?
      `
        )
        .all(nodeId, sourceTimestamp, ftsQuery, limit) as {
        id: string;
        timestamp: string;
      }[];

      for (const candidate of candidates) {
        // Skip if we've already created an edge to this target
        // (happens when multiple lessons match the same candidate)
        if (seenTargets.has(candidate.id)) {
          continue;
        }

        // Mark this candidate as seen to avoid redundant processing
        // (even if similarity is below threshold, skip it in subsequent lessons)
        seenTargets.add(candidate.id);

        // Skip if edge already exists in database
        if (edgeExists(this.db, nodeId, candidate.id)) {
          continue;
        }

        // Check exact lesson similarity
        const candidateLessons = this.getLessons(candidate.id);
        const bestMatch = this.findBestLessonMatch(lesson, candidateLessons);

        if (bestMatch && bestMatch.score >= threshold) {
          const edge = createEdge(
            this.db,
            nodeId,
            candidate.id,
            "lesson_application",
            {
              metadata: {
                similarity: bestMatch.score,
                lessonId: bestMatch.lesson.id,
                reason: `Reinforces lesson: "${bestMatch.lesson.summary}"`,
              },
              createdBy: "daemon",
            }
          );
          edges.push(edge);
        }
      }
    }

    return edges;
  }

  private getLessons(nodeId: string): LessonRow[] {
    return this.db
      .prepare("SELECT * FROM lessons WHERE node_id = ?")
      .all(nodeId) as LessonRow[];
  }

  private findBestLessonMatch(
    targetLesson: LessonRow,
    candidateLessons: LessonRow[]
  ): { lesson: LessonRow; score: number } | null {
    if (candidateLessons.length === 0) {
      return null;
    }

    let bestScore = -1;
    let bestLesson: LessonRow | null = null;

    const targetTokens = this.tokenize(
      targetLesson.summary + " " + (targetLesson.details || "")
    );

    for (const candidate of candidateLessons) {
      // Skip lessons of different levels if desired, but "cross-pollination" might be interesting
      // For now, enforce level match for stricter relevance
      if (candidate.level !== targetLesson.level) {
        continue;
      }

      const candidateTokens = this.tokenize(
        candidate.summary + " " + (candidate.details || "")
      );
      const score = this.jaccardIndex(targetTokens, candidateTokens);

      if (score > bestScore) {
        bestScore = score;
        bestLesson = candidate;
      }
    }

    return bestLesson ? { lesson: bestLesson, score: bestScore } : null;
  }

  /**
   * Calculate similarity score between two nodes
   *
   * Uses a weighted average of Jaccard indices:
   * - Tags: 40% weight
   * - Topics: 30% weight
   * - Summary words (tokenized, stopwords removed): 30% weight
   *
   * @param {object} a - First node's metadata (tags, topics, summary text)
   * @param {Set<string>} a.tags - Tags from the first node
   * @param {Set<string>} a.topics - Topics from the first node
   * @param {string} a.summary - Summary text from the first node
   * @param {object} b - Second node's metadata (tags, topics, summary text)
   * @param {Set<string>} b.tags - Tags from the second node
   * @param {Set<string>} b.topics - Topics from the second node
   * @param {string} b.summary - Summary text from the second node
   * @returns {number} Similarity score from 0 (no similarity) to 1 (identical)
   *
   * @example
   * ```typescript
   * const score = discoverer.calculateSimilarity(
   *   { tags: new Set(['typescript', 'api']), topics: new Set(['backend']), summary: 'Built REST API' },
   *   { tags: new Set(['typescript', 'web']), topics: new Set(['backend']), summary: 'Created web API' }
   * );
   * // score ≈ 0.5
   * ```
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
        .replaceAll(/[^\w\s]/g, " ") // Replace punctuation with space
        .split(/\s+/)
        .filter((w) => w.length > 2 && !STOPWORDS.has(w))
    );
  }
}
