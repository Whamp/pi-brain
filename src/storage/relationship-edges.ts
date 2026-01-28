/**
 * Relationship Edges - Store AutoMem typed relationships extracted by the analyzer
 *
 * Handles conversion of analyzer relationship output to edges in the knowledge graph.
 * When targetNodeId is null, the relationship is stored with a description in metadata
 * for potential future resolution via semantic search.
 *
 * Based on docs/specs/automem-features.md and prompts/session-analyzer.md.
 */

import type Database from "better-sqlite3";

import type { RelationshipOutput } from "../daemon/processor.js";

import {
  AUTOMEM_EDGE_TYPES,
  type AutoMemEdgeType,
  type EdgeMetadata,
  type EdgeType,
} from "../types/index.js";
import { createEdge } from "./edge-repository.js";

// =============================================================================
// Types
// =============================================================================

/** Result of storing relationships for a node */
export interface StoreRelationshipsResult {
  /** Number of relationships with resolved target nodes */
  resolvedCount: number;
  /** Number of relationships with unresolved (null) targets stored for later */
  unresolvedCount: number;
  /** Total edges created */
  edgesCreated: number;
  /** Errors encountered during storage */
  errors: string[];
}

/** Row shape for unresolved relationship edges */
interface UnresolvedEdgeRow {
  id: string;
  source_node_id: string;
  type: string;
  metadata: string | null;
  confidence: number | null;
}

/** Result type for unresolved relationships */
export interface UnresolvedRelationship {
  edgeId: string;
  sourceNodeId: string;
  type: EdgeType;
  targetDescription: string;
  reason: string;
  confidence: number | null;
}

// =============================================================================
// Validation
// =============================================================================

/**
 * Check if a type is a valid AutoMem edge type
 */
export function isAutoMemEdgeType(type: string): type is AutoMemEdgeType {
  return AUTOMEM_EDGE_TYPES.includes(type as AutoMemEdgeType);
}

/**
 * Validate a relationship output from the analyzer
 */
export function validateRelationship(
  relationship: RelationshipOutput
): { valid: true } | { valid: false; error: string } {
  // Check type is valid
  if (!isAutoMemEdgeType(relationship.type)) {
    return {
      valid: false,
      error: `Invalid relationship type: ${relationship.type}`,
    };
  }

  // Check confidence is in range
  if (relationship.confidence < 0 || relationship.confidence > 1) {
    return {
      valid: false,
      error: `Confidence must be 0.0-1.0: ${relationship.confidence}`,
    };
  }

  // Check we have either a target node ID or description
  if (!relationship.targetNodeId && !relationship.targetDescription) {
    return {
      valid: false,
      error: "Relationship must have targetNodeId or targetDescription",
    };
  }

  // Check reason is provided
  if (!relationship.reason || relationship.reason.trim().length === 0) {
    return { valid: false, error: "Relationship must have a reason" };
  }

  return { valid: true };
}

// =============================================================================
// Storage Functions
// =============================================================================

/**
 * Store relationships extracted by the analyzer as edges
 *
 * For resolved relationships (with targetNodeId), creates an edge directly.
 * For unresolved relationships (targetNodeId is null), stores the description
 * in metadata for potential future resolution via semantic search.
 */
export function storeRelationshipEdges(
  db: Database.Database,
  sourceNodeId: string,
  relationships: RelationshipOutput[]
): StoreRelationshipsResult {
  const result: StoreRelationshipsResult = {
    resolvedCount: 0,
    unresolvedCount: 0,
    edgesCreated: 0,
    errors: [],
  };

  if (!relationships || relationships.length === 0) {
    return result;
  }

  for (const rel of relationships) {
    // Validate the relationship
    const validation = validateRelationship(rel);
    if (!validation.valid) {
      result.errors.push(validation.error);
      continue;
    }

    // Build edge metadata
    const metadata: EdgeMetadata = {
      reason: rel.reason,
    };

    // If target is unresolved, store description for future resolution
    if (!rel.targetNodeId) {
      metadata.unresolvedTarget = rel.targetDescription;
    }

    try {
      if (rel.targetNodeId) {
        // Resolved relationship - create edge to the target
        createEdge(db, sourceNodeId, rel.targetNodeId, rel.type as EdgeType, {
          metadata,
          createdBy: "daemon",
          confidence: rel.confidence,
        });
        result.resolvedCount++;
      } else {
        // Unresolved relationship - store as a "pending" edge
        // Use a special placeholder target that we can query later
        // We store the edge with the source pointing to itself temporarily,
        // but mark it as unresolved in metadata
        //
        // Note: We could also use a separate table for pending relationships,
        // but storing them inline with metadata makes them queryable alongside
        // regular edges and simplifies the resolution logic.
        createEdge(db, sourceNodeId, sourceNodeId, rel.type as EdgeType, {
          metadata,
          createdBy: "daemon",
          confidence: rel.confidence,
        });
        result.unresolvedCount++;
      }
      result.edgesCreated++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.errors.push(`Failed to create edge: ${message}`);
    }
  }

  return result;
}

/**
 * Find unresolved relationships (edges with unresolvedTarget in metadata)
 *
 * These are relationships where the analyzer identified a connection but
 * couldn't determine the target node ID. They can be resolved later via
 * semantic search.
 */
export function findUnresolvedRelationships(
  db: Database.Database,
  nodeId?: string
): UnresolvedRelationship[] {
  // Query edges where source and target are the same (our placeholder pattern)
  // and metadata contains unresolvedTarget
  const query = nodeId
    ? `SELECT * FROM edges WHERE source_node_id = ? AND source_node_id = target_node_id`
    : `SELECT * FROM edges WHERE source_node_id = target_node_id`;

  const stmt = db.prepare(query);
  const rows = (nodeId ? stmt.all(nodeId) : stmt.all()) as UnresolvedEdgeRow[];

  const results: UnresolvedRelationship[] = [];

  for (const row of rows) {
    if (!row.metadata) {
      continue;
    }

    try {
      const metadata = JSON.parse(row.metadata) as EdgeMetadata & {
        unresolvedTarget?: string;
      };
      if (metadata.unresolvedTarget) {
        results.push({
          edgeId: row.id,
          sourceNodeId: row.source_node_id,
          type: row.type as EdgeType,
          targetDescription: metadata.unresolvedTarget,
          reason: metadata.reason ?? "",
          confidence: row.confidence,
        });
      }
    } catch {
      // Skip rows with invalid metadata
    }
  }

  return results;
}

/**
 * Resolve an unresolved relationship by updating its target node
 *
 * Call this after semantic search finds a matching node for an unresolved
 * relationship.
 */
export function resolveRelationship(
  db: Database.Database,
  edgeId: string,
  resolvedTargetNodeId: string
): boolean {
  // Get the current edge
  const stmt = db.prepare("SELECT * FROM edges WHERE id = ?");
  const row = stmt.get(edgeId) as
    | {
        id: string;
        metadata: string | null;
      }
    | undefined;

  if (!row) {
    return false;
  }

  // Parse and update metadata
  let metadata: Record<string, unknown> = {};
  if (row.metadata) {
    try {
      metadata = JSON.parse(row.metadata) as Record<string, unknown>;
    } catch {
      // Keep empty metadata
    }
  }

  // Remove the unresolved marker and add resolution info
  const { unresolvedTarget } = metadata;
  delete metadata.unresolvedTarget;
  metadata.resolvedFrom = unresolvedTarget;
  metadata.resolvedAt = new Date().toISOString();

  // Update the edge with the resolved target
  const updateStmt = db.prepare(`
    UPDATE edges
    SET target_node_id = ?, metadata = ?
    WHERE id = ?
  `);

  const result = updateStmt.run(
    resolvedTargetNodeId,
    JSON.stringify(metadata),
    edgeId
  );
  return result.changes > 0;
}
