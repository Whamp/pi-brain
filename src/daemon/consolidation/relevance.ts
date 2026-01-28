/**
 * Relevance Calculator
 *
 * Calculates and updates node relevance scores based on the AutoMem decay formula.
 * High-relevance nodes resist decay; low-relevance nodes get archived/deleted.
 *
 * Formula (from automem-features.md):
 * relevance = decay_factor(age) * (0.3 + 0.3 * access_recency) *
 *             relationship_density_factor * (0.5 + importance) * (0.7 + 0.3 * confidence)
 *
 * @see docs/specs/automem-features.md
 */

import type Database from "better-sqlite3";

// =============================================================================
// Constants
// =============================================================================

/** Default daily decay rate (10% per day of age) */
const DEFAULT_BASE_DECAY_RATE = 0.1;

/** Threshold below which nodes get archived */
const ARCHIVE_THRESHOLD = 0.2;

/** Threshold below which nodes get deleted (if enabled) */
const DELETE_THRESHOLD = 0.05;

/** Milliseconds per day */
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// =============================================================================
// Types
// =============================================================================

/**
 * Factors used in relevance calculation
 */
export interface RelevanceFactors {
  /** Days since node creation */
  ageInDays: number;
  /** Days since last access (0 = accessed today) */
  daysSinceAccess: number;
  /** Number of edges connected to this node */
  edgeCount: number;
  /** Base importance (0.0-1.0) from node.importance */
  importance: number;
  /** Confidence from analysis (0.0-1.0), default 0.5 */
  confidence: number;
}

/**
 * Result of calculating relevance for a single node
 */
export interface RelevanceResult {
  nodeId: string;
  previousScore: number;
  newScore: number;
  factors: RelevanceFactors;
  shouldArchive: boolean;
  shouldDelete: boolean;
}

/**
 * Node data needed for relevance calculation
 */
interface NodeRow {
  id: string;
  timestamp: string;
  last_accessed: string | null;
  relevance_score: number | null;
  importance: number | null;
  archived: number | null;
}

// =============================================================================
// RelevanceCalculator
// =============================================================================

/**
 * Calculates and updates node relevance scores
 */
export class RelevanceCalculator {
  constructor(
    private db: Database.Database,
    private baseDecayRate: number = DEFAULT_BASE_DECAY_RATE
  ) {}

  /**
   * Calculate the decay factor based on age
   * Uses exponential decay: e^(-rate * age)
   */
  calculateDecayFactor(ageInDays: number): number {
    return Math.exp(-this.baseDecayRate * ageInDays);
  }

  /**
   * Calculate access recency factor (0.0-1.0)
   * Returns 1.0 for recently accessed, decreasing over time
   */
  calculateAccessRecency(daysSinceAccess: number): number {
    // Recent access (within 7 days) gets full score
    // Older access decays logarithmically
    if (daysSinceAccess <= 0) {
      return 1;
    }
    if (daysSinceAccess <= 7) {
      return 1 - daysSinceAccess * 0.05; // Linear decay for first week
    }
    // Logarithmic decay after first week
    return Math.max(0, 0.65 - Math.log10(daysSinceAccess - 6) * 0.2);
  }

  /**
   * Calculate relationship density factor
   * More edges = higher relevance
   */
  calculateRelationshipDensity(edgeCount: number): number {
    // 0 edges = 0.5, 5+ edges = 1.0
    return 0.5 + Math.min(edgeCount, 5) * 0.1;
  }

  /**
   * Calculate full relevance score using AutoMem formula
   */
  calculateRelevance(factors: RelevanceFactors): number {
    const decayFactor = this.calculateDecayFactor(factors.ageInDays);
    const accessRecency = this.calculateAccessRecency(factors.daysSinceAccess);
    const relationshipDensity = this.calculateRelationshipDensity(
      factors.edgeCount
    );

    // AutoMem formula
    const relevance =
      decayFactor *
      (0.3 + 0.3 * accessRecency) *
      relationshipDensity *
      (0.5 + factors.importance) *
      (0.7 + 0.3 * factors.confidence);

    // Clamp to 0.0-1.0
    return Math.max(0, Math.min(1, relevance));
  }

  /**
   * Get edge count for a node
   */
  private getEdgeCount(nodeId: string): number {
    const result = this.db
      .prepare<[string, string], { count: number }>(
        `
        SELECT COUNT(*) as count FROM edges
        WHERE source_node_id = ? OR target_node_id = ?
      `
      )
      .get(nodeId, nodeId);
    return result?.count ?? 0;
  }

  /**
   * Calculate relevance for a single node
   */
  calculateForNode(nodeId: string): RelevanceResult | null {
    const row = this.db
      .prepare<[string], NodeRow>(
        `
        SELECT id, timestamp, last_accessed, relevance_score, importance, archived
        FROM nodes WHERE id = ?
      `
      )
      .get(nodeId);

    if (!row) {
      return null;
    }

    const now = Date.now();
    const createdAt = new Date(row.timestamp).getTime();
    const lastAccessed = row.last_accessed
      ? new Date(row.last_accessed).getTime()
      : createdAt;

    const factors: RelevanceFactors = {
      ageInDays: (now - createdAt) / MS_PER_DAY,
      daysSinceAccess: (now - lastAccessed) / MS_PER_DAY,
      edgeCount: this.getEdgeCount(nodeId),
      importance: row.importance ?? 0.5,
      confidence: 0.5, // Default confidence, could be extracted from node data
    };

    const newScore = this.calculateRelevance(factors);
    const previousScore = row.relevance_score ?? 1;

    return {
      nodeId,
      previousScore,
      newScore,
      factors,
      shouldArchive: newScore < ARCHIVE_THRESHOLD,
      shouldDelete: newScore < DELETE_THRESHOLD,
    };
  }

  /**
   * Update relevance score for a single node
   */
  updateNodeRelevance(nodeId: string): RelevanceResult | null {
    const result = this.calculateForNode(nodeId);
    if (!result) {
      return null;
    }

    this.db
      .prepare(
        `
        UPDATE nodes SET relevance_score = ? WHERE id = ?
      `
      )
      .run(result.newScore, nodeId);

    return result;
  }

  /**
   * Run decay on all non-archived nodes
   * Returns count of nodes updated
   */
  runDecay(): {
    updated: number;
    archived: number;
    deleted: number;
    results: RelevanceResult[];
  } {
    const nodes = this.db
      .prepare<[], NodeRow>(
        `
        SELECT id, timestamp, last_accessed, relevance_score, importance, archived
        FROM nodes
        WHERE archived IS NULL OR archived = 0
      `
      )
      .all();

    const results: RelevanceResult[] = [];
    let archived = 0;
    let deleted = 0;

    const updateStmt = this.db.prepare(
      "UPDATE nodes SET relevance_score = ? WHERE id = ?"
    );
    const archiveStmt = this.db.prepare(
      "UPDATE nodes SET archived = 1 WHERE id = ?"
    );

    const now = Date.now();

    for (const row of nodes) {
      const createdAt = new Date(row.timestamp).getTime();
      const lastAccessed = row.last_accessed
        ? new Date(row.last_accessed).getTime()
        : createdAt;

      const factors: RelevanceFactors = {
        ageInDays: (now - createdAt) / MS_PER_DAY,
        daysSinceAccess: (now - lastAccessed) / MS_PER_DAY,
        edgeCount: this.getEdgeCount(row.id),
        importance: row.importance ?? 0.5,
        confidence: 0.5,
      };

      const newScore = this.calculateRelevance(factors);
      const previousScore = row.relevance_score ?? 1;

      const result: RelevanceResult = {
        nodeId: row.id,
        previousScore,
        newScore,
        factors,
        shouldArchive: newScore < ARCHIVE_THRESHOLD,
        shouldDelete: newScore < DELETE_THRESHOLD,
      };

      results.push(result);

      // Update relevance score
      updateStmt.run(newScore, row.id);

      // Archive if below threshold
      if (result.shouldArchive) {
        archiveStmt.run(row.id);
        archived++;
      }
    }

    return {
      updated: results.length,
      archived,
      deleted, // Deletion not implemented yet (configurable)
      results,
    };
  }

  /**
   * Mark node as accessed (updates last_accessed timestamp)
   * Call this when a node is queried or viewed
   */
  touchNode(nodeId: string): void {
    this.db
      .prepare(
        `
        UPDATE nodes SET last_accessed = datetime('now') WHERE id = ?
      `
      )
      .run(nodeId);
  }

  /**
   * Unarchive a node (restore from archived state)
   * Also resets relevance score to 0.5
   */
  unarchiveNode(nodeId: string): void {
    this.db
      .prepare(
        `
        UPDATE nodes SET archived = 0, relevance_score = 0.5, last_accessed = datetime('now')
        WHERE id = ?
      `
      )
      .run(nodeId);
  }

  /**
   * Get archive threshold
   */
  getArchiveThreshold(): number {
    return ARCHIVE_THRESHOLD;
  }

  /**
   * Get delete threshold
   */
  getDeleteThreshold(): number {
    return DELETE_THRESHOLD;
  }
}
