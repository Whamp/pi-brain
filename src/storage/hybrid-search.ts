/**
 * Hybrid Search Implementation
 *
 * Combines multiple scoring signals (vector, FTS, relations, recency, tags, etc.)
 * into a single weighted score for more accurate and context-aware search results.
 *
 * Based on specs/automem-features.md Hybrid Search specification.
 *
 * @see docs/specs/automem-features.md
 */

import type Database from "better-sqlite3";

import type { NodeRow } from "./node-crud.js";
import type { SearchFilters, SearchHighlight } from "./search-repository.js";

import { isVecLoaded } from "./database.js";
import { buildWhereClause } from "./filter-utils.js";
import { semanticSearch } from "./semantic-search.js";

// =============================================================================
// Constants: Scoring Weights
// =============================================================================

/**
 * Type for hybrid search weight keys
 */
export interface HybridWeights {
  vector: number;
  keyword: number;
  relation: number;
  content: number;
  temporal: number;
  tag: number;
  importance: number;
  recency: number;
}

/**
 * Weights for each scoring component.
 * Sum should equal ~1.3 to allow strong signals to boost final score.
 * Final scores are normalized to 0..1 range.
 */
export const HYBRID_WEIGHTS: HybridWeights = {
  vector: 0.25, // Semantic similarity via embeddings
  keyword: 0.15, // FTS5 match score
  relation: 0.25, // Graph centrality / edge count
  content: 0.25, // Exact token overlap
  temporal: 0.15, // Proximity to query time or recency
  tag: 0.1, // Tag match count
  importance: 0.05, // Node importance field
  recency: 0.1, // How recent is the node
};

/** Max edges to consider for relation score (diminishing returns after) */
const MAX_EDGES_FOR_SCORE = 10;

/** Days after which recency score starts decaying */
const RECENCY_HALF_LIFE_DAYS = 30;

/** Milliseconds per day */
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// =============================================================================
// Types
// =============================================================================

/**
 * Breakdown of scores for transparency and debugging.
 */
export interface HybridScoreBreakdown {
  /** Semantic vector similarity score (0..1) */
  vector: number;
  /** FTS keyword match score (0..1) */
  keyword: number;
  /** Relationship density score (0..1) */
  relation: number;
  /** Content token overlap score (0..1) */
  content: number;
  /** Temporal proximity score (0..1) */
  temporal: number;
  /** Tag match score (0..1) */
  tag: number;
  /** Node importance score (0..1) */
  importance: number;
  /** Recency score (0..1) */
  recency: number;
  /** Final weighted score (0..1) */
  final: number;
}

/**
 * Enhanced search result with hybrid scoring.
 */
export interface HybridSearchResult {
  /** The matching node row */
  node: NodeRow;
  /** Final hybrid score (0..1, higher is better) */
  score: number;
  /** Breakdown of individual score components */
  breakdown: HybridScoreBreakdown;
  /** Highlighted snippets showing where matches occurred */
  highlights: SearchHighlight[];
  /** Vector distance (if vector search was used) */
  vectorDistance?: number;
}

/**
 * Options for hybrid search.
 */
export interface HybridSearchOptions {
  /** Maximum number of results (default: 20, max: 500) */
  limit?: number;
  /** Pagination offset (default: 0) */
  offset?: number;
  /** Additional filters to combine with search */
  filters?: SearchFilters;
  /** Query embedding for semantic search (optional, will skip vector scoring if missing) */
  queryEmbedding?: number[];
  /** Temporal reference point for scoring (ISO 8601) */
  temporalReference?: string;
  /** Tags to boost matching (increases tag score for matches) */
  boostTags?: string[];
  /** Custom weights (overrides defaults) */
  weights?: Partial<HybridWeights>;
  /** Include archived nodes (default: false) */
  includeArchived?: boolean;
}

/**
 * Result from hybrid search with pagination metadata.
 */
export interface HybridSearchResponse {
  /** The search results */
  results: HybridSearchResult[];
  /** Total matching results (before limit/offset) */
  total: number;
  /** Applied limit */
  limit: number;
  /** Applied offset */
  offset: number;
  /** Whether vector search was used */
  usedVectorSearch: boolean;
}

// =============================================================================
// Internal Types
// =============================================================================

interface CandidateNode {
  nodeRow: NodeRow;
  ftsRank: number | null;
  vectorDistance: number | null;
  edgeCount: number;
  matchedTags: number;
  totalBoostTags: number;
}

// =============================================================================
// Score Calculation Functions
// =============================================================================

/**
 * Calculate vector similarity score from distance.
 * Lower distance = higher score.
 */
function calculateVectorScore(distance: number | null): number {
  if (distance === null) {
    return 0;
  }
  // Convert distance to 0..1 score (distance 0 = score 1, distance 1+ = score approaches 0)
  return 1 / (1 + distance);
}

/**
 * Calculate keyword score from FTS5 rank.
 * FTS5 rank is negative, lower (more negative) is better.
 */
function calculateKeywordScore(rank: number | null): number {
  if (rank === null) {
    return 0;
  }
  // FTS5 rank is negative; -10 is better than -1
  // Normalize to 0..1 scale. Typical ranks range from -30 to -0.1
  // Use sigmoid-like transform to handle wide range
  const absRank = Math.abs(rank);
  return absRank / (absRank + 1);
}

/**
 * Calculate relation score based on edge count.
 * More edges = higher score (up to MAX_EDGES_FOR_SCORE).
 */
function calculateRelationScore(edgeCount: number): number {
  // 0 edges = 0, MAX_EDGES_FOR_SCORE+ edges = 1
  return Math.min(edgeCount / MAX_EDGES_FOR_SCORE, 1);
}

/**
 * Calculate content overlap score.
 * Based on exact token matching between query and summary.
 */
function calculateContentScore(query: string, summary: string | null): number {
  if (!summary) {
    return 0;
  }

  const queryTokens = new Set(
    query
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 2)
  );
  const summaryTokens = new Set(
    summary
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 2)
  );

  if (queryTokens.size === 0) {
    return 0;
  }

  let matchCount = 0;
  for (const token of queryTokens) {
    if (summaryTokens.has(token)) {
      matchCount++;
    }
  }

  return matchCount / queryTokens.size;
}

/**
 * Calculate temporal proximity score.
 * Nodes closer to the reference time get higher scores.
 */
function calculateTemporalScore(
  nodeTimestamp: string,
  referenceTime: Date | null
): number {
  if (!referenceTime) {
    // If no reference, use recency (time since node creation)
    return 0.5; // Neutral score
  }

  const nodeDate = new Date(nodeTimestamp).getTime();
  const refTime = referenceTime.getTime();
  const daysDiff = Math.abs(refTime - nodeDate) / MS_PER_DAY;

  // Use exponential decay: 0 days = 1.0, 30 days = 0.5, 60 days = 0.25
  return Math.exp(-daysDiff / RECENCY_HALF_LIFE_DAYS);
}

/**
 * Calculate tag match score.
 */
function calculateTagScore(
  matchedTags: number,
  totalBoostTags: number
): number {
  if (totalBoostTags === 0) {
    return 0;
  }
  return matchedTags / totalBoostTags;
}

/**
 * Calculate importance score from node importance field.
 */
function calculateImportanceScore(importance: number | null): number {
  return importance ?? 0.5;
}

/**
 * Calculate recency score based on node age.
 * Newer nodes get higher scores.
 */
function calculateRecencyScore(nodeTimestamp: string): number {
  const nodeDate = new Date(nodeTimestamp).getTime();
  const now = Date.now();
  const daysSince = (now - nodeDate) / MS_PER_DAY;

  // Use exponential decay: 0 days = 1.0, 30 days = 0.5, 60 days = 0.25
  return Math.exp(-daysSince / RECENCY_HALF_LIFE_DAYS);
}

/**
 * Calculate final hybrid score from all components.
 */
function calculateHybridScore(
  candidate: CandidateNode,
  query: string,
  options: HybridSearchOptions
): HybridScoreBreakdown {
  const weights = { ...HYBRID_WEIGHTS, ...options.weights };
  const referenceTime = options.temporalReference
    ? new Date(options.temporalReference)
    : null;

  const breakdown: HybridScoreBreakdown = {
    vector: calculateVectorScore(candidate.vectorDistance),
    keyword: calculateKeywordScore(candidate.ftsRank),
    relation: calculateRelationScore(candidate.edgeCount),
    content: calculateContentScore(query, candidate.nodeRow.project),
    temporal: calculateTemporalScore(
      candidate.nodeRow.timestamp,
      referenceTime
    ),
    tag: calculateTagScore(candidate.matchedTags, candidate.totalBoostTags),
    importance: calculateImportanceScore(candidate.nodeRow.importance),
    recency: calculateRecencyScore(candidate.nodeRow.timestamp),
    final: 0,
  };

  // Also add content score from summary (stored in node)
  // We need to get summary from data file, but for now use project as proxy
  // In practice, you'd fetch summary from the node data

  // Calculate weighted final score
  breakdown.final =
    breakdown.vector * weights.vector +
    breakdown.keyword * weights.keyword +
    breakdown.relation * weights.relation +
    breakdown.content * weights.content +
    breakdown.temporal * weights.temporal +
    breakdown.tag * weights.tag +
    breakdown.importance * weights.importance +
    breakdown.recency * weights.recency;

  // Normalize to 0..1 range
  const maxPossible =
    weights.vector +
    weights.keyword +
    weights.relation +
    weights.content +
    weights.temporal +
    weights.tag +
    weights.importance +
    weights.recency;
  breakdown.final /= maxPossible;

  return breakdown;
}

// =============================================================================
// Candidate Collection Helpers
// =============================================================================

/**
 * Add vector search candidates to the candidate map
 * @internal
 */
function addVectorCandidates(
  db: Database.Database,
  candidateMap: Map<string, CandidateNode>,
  queryEmbedding: number[],
  limit: number,
  filters: SearchFilters | undefined,
  boostTags: string[]
): void {
  const vectorResults = semanticSearch(db, queryEmbedding, {
    limit: limit * 3, // Overfetch for merging
    filters,
  });

  for (const result of vectorResults) {
    candidateMap.set(result.node.id, {
      nodeRow: result.node,
      ftsRank: null,
      vectorDistance: result.distance,
      edgeCount: 0,
      matchedTags: 0,
      totalBoostTags: boostTags.length,
    });
  }
}

/**
 * Add FTS search candidates to the candidate map
 * @internal
 */
function addFtsCandidates(
  db: Database.Database,
  candidateMap: Map<string, CandidateNode>,
  query: string,
  limit: number,
  filterClause: string,
  filterParams: (string | number)[],
  archivedClause: string,
  boostTags: string[]
): void {
  const words = query.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) {
    return;
  }

  const quotedQuery = words
    .map((word) => `"${word.replaceAll('"', '""')}"`)
    .join(" ");

  try {
    const ftsStmt = db.prepare(`
      SELECT n.*, nodes_fts.rank as fts_rank
      FROM nodes n
      JOIN nodes_fts ON n.id = nodes_fts.node_id
      WHERE nodes_fts MATCH ?
        ${filterClause}
        ${archivedClause}
      ORDER BY nodes_fts.rank
      LIMIT ?
    `);

    const ftsRows = ftsStmt.all(
      quotedQuery,
      ...filterParams,
      limit * 3
    ) as (NodeRow & {
      fts_rank: number;
    })[];

    for (const row of ftsRows) {
      const existing = candidateMap.get(row.id);
      if (existing) {
        // Merge: keep vector distance, add FTS rank
        existing.ftsRank = row.fts_rank;
      } else {
        candidateMap.set(row.id, {
          nodeRow: row,
          ftsRank: row.fts_rank,
          vectorDistance: null,
          edgeCount: 0,
          matchedTags: 0,
          totalBoostTags: boostTags.length,
        });
      }
    }
  } catch {
    // FTS might fail on malformed queries; ignore and continue
  }
}

/**
 * Enrich candidates with edge counts from the graph
 * @internal
 */
function enrichWithEdgeCounts(
  db: Database.Database,
  candidateMap: Map<string, CandidateNode>,
  nodeIds: string[]
): void {
  if (nodeIds.length === 0) {
    return;
  }

  const placeholders = nodeIds.map(() => "?").join(",");
  const edgeStmt = db.prepare(`
    SELECT node_id, COUNT(*) as edge_count FROM (
      SELECT source_node_id as node_id FROM edges WHERE source_node_id IN (${placeholders})
      UNION ALL
      SELECT target_node_id as node_id FROM edges WHERE target_node_id IN (${placeholders})
    ) GROUP BY node_id
  `);

  const edgeRows = edgeStmt.all(...nodeIds, ...nodeIds) as {
    node_id: string;
    edge_count: number;
  }[];

  for (const row of edgeRows) {
    const candidate = candidateMap.get(row.node_id);
    if (candidate) {
      candidate.edgeCount = row.edge_count;
    }
  }
}

/**
 * Enrich candidates with tag match counts
 * @internal
 */
function enrichWithTagMatches(
  db: Database.Database,
  candidateMap: Map<string, CandidateNode>,
  nodeIds: string[],
  boostTags: string[]
): void {
  if (boostTags.length === 0 || nodeIds.length === 0) {
    return;
  }

  const nodePlaceholders = nodeIds.map(() => "?").join(",");
  const tagPlaceholders = boostTags.map(() => "?").join(",");

  const tagStmt = db.prepare(`
    SELECT node_id, COUNT(DISTINCT tag) as tag_count
    FROM tags
    WHERE node_id IN (${nodePlaceholders}) AND tag IN (${tagPlaceholders})
    GROUP BY node_id
  `);

  const tagRows = tagStmt.all(...nodeIds, ...boostTags) as {
    node_id: string;
    tag_count: number;
  }[];

  for (const row of tagRows) {
    const candidate = candidateMap.get(row.node_id);
    if (candidate) {
      candidate.matchedTags = row.tag_count;
    }
  }
}

/**
 * Build scored results from candidates
 * @internal
 */
function buildScoredResults(
  candidateMap: Map<string, CandidateNode>,
  query: string,
  options: HybridSearchOptions
): HybridSearchResult[] {
  const results: HybridSearchResult[] = [];

  for (const candidate of candidateMap.values()) {
    const breakdown = calculateHybridScore(candidate, query, options);

    results.push({
      node: candidate.nodeRow,
      score: breakdown.final,
      breakdown,
      highlights: [], // Could add FTS highlights here
      vectorDistance: candidate.vectorDistance ?? undefined,
    });
  }

  return results;
}

/**
 * Collect candidates from vector and FTS sources
 * @internal
 */
function collectCandidates(
  db: Database.Database,
  query: string,
  queryEmbedding: number[] | undefined,
  limit: number,
  filters: SearchFilters | undefined,
  filterClause: string,
  filterParams: (string | number)[],
  archivedClause: string,
  boostTags: string[]
): { candidateMap: Map<string, CandidateNode>; usedVectorSearch: boolean } {
  const candidateMap = new Map<string, CandidateNode>();
  let usedVectorSearch = false;

  // Vector Search (if embedding provided and sqlite-vec loaded)
  if (queryEmbedding && isVecLoaded(db)) {
    usedVectorSearch = true;
    addVectorCandidates(
      db,
      candidateMap,
      queryEmbedding,
      limit,
      filters,
      boostTags
    );
  }

  // FTS Search (keyword matching)
  if (query.trim().length > 0) {
    addFtsCandidates(
      db,
      candidateMap,
      query,
      limit,
      filterClause,
      filterParams,
      archivedClause,
      boostTags
    );
  }

  return { candidateMap, usedVectorSearch };
}

// =============================================================================
// Main Hybrid Search Function
// =============================================================================

/**
 * Perform hybrid search combining vector, FTS, relation, and other signals.
 *
 * The algorithm:
 * 1. If queryEmbedding provided, perform vector search to get initial candidates
 * 2. Perform FTS search to get keyword matches
 * 3. Merge candidates from both sources
 * 4. For each candidate, calculate edge count (relation score)
 * 5. Calculate all score components and weighted final score
 * 6. Sort by final score, apply pagination
 */
export function hybridSearch(
  db: Database.Database,
  query: string,
  options: HybridSearchOptions = {}
): HybridSearchResponse {
  const {
    limit: rawLimit,
    offset: rawOffset,
    filters,
    queryEmbedding,
    boostTags = [],
    includeArchived = false,
  } = options;

  const limit = Math.min(Math.max(1, rawLimit ?? 20), 500);
  const offset = Math.max(0, rawOffset ?? 0);

  // Build WHERE clause from filters
  const { clause: filterClause, params: filterParams } =
    buildWhereClause(filters);

  // Add archived filter if needed
  const archivedClause = includeArchived
    ? ""
    : "AND (n.archived IS NULL OR n.archived = 0)";

  // Step 1-2: Collect candidates from vector and FTS sources
  const { candidateMap, usedVectorSearch } = collectCandidates(
    db,
    query,
    queryEmbedding,
    limit,
    filters,
    filterClause,
    filterParams,
    archivedClause,
    boostTags
  );

  // If no candidates at all, return empty
  if (candidateMap.size === 0) {
    return {
      results: [],
      total: 0,
      limit,
      offset,
      usedVectorSearch,
    };
  }

  // Step 3: Enrich candidates with edge counts and tag matches
  const nodeIds = [...candidateMap.keys()];
  enrichWithEdgeCounts(db, candidateMap, nodeIds);
  enrichWithTagMatches(db, candidateMap, nodeIds, boostTags);

  // Step 4: Calculate hybrid scores for all candidates
  const scoredResults = buildScoredResults(candidateMap, query, options);

  // Step 5: Sort by final score (descending) and apply pagination
  scoredResults.sort((a, b) => b.score - a.score);

  const total = scoredResults.length;
  const paginatedResults = scoredResults.slice(offset, offset + limit);

  return {
    results: paginatedResults,
    total,
    limit,
    offset,
    usedVectorSearch,
  };
}

// =============================================================================
// Utility: Calculate Hybrid Score for Single Node
// =============================================================================

/**
 * Calculate hybrid score for a single node (useful for re-ranking).
 */
export function calculateNodeHybridScore(
  db: Database.Database,
  nodeId: string,
  query: string,
  options: HybridSearchOptions = {}
): HybridScoreBreakdown | null {
  // Get node
  const nodeRow = db.prepare("SELECT * FROM nodes WHERE id = ?").get(nodeId) as
    | NodeRow
    | undefined;
  if (!nodeRow) {
    return null;
  }

  // Get edge count
  const edgeRow = db
    .prepare(`
    SELECT COUNT(*) as count FROM edges 
    WHERE source_node_id = ? OR target_node_id = ?
  `)
    .get(nodeId, nodeId) as { count: number };

  // Get matched tags
  let matchedTags = 0;
  const boostTags = options.boostTags ?? [];
  if (boostTags.length > 0) {
    const placeholders = boostTags.map(() => "?").join(",");
    const tagRow = db
      .prepare(`
      SELECT COUNT(*) as count FROM tags 
      WHERE node_id = ? AND tag IN (${placeholders})
    `)
      .get(nodeId, ...boostTags) as { count: number } | undefined;
    matchedTags = tagRow?.count ?? 0;
  }

  const candidate: CandidateNode = {
    nodeRow,
    ftsRank: null, // Would need to run FTS query
    vectorDistance: null, // Would need embedding
    edgeCount: edgeRow.count,
    matchedTags,
    totalBoostTags: boostTags.length,
  };

  return calculateHybridScore(candidate, query, options);
}
