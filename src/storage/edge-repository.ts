/**
 * Edge Repository - CRUD operations for edges in SQLite
 *
 * Edges connect nodes in the knowledge graph. This module provides
 * all edge-related operations.
 *
 * Based on specs/storage.md and specs/node-model.md.
 */

import type Database from "better-sqlite3";

import type { Edge, EdgeMetadata, EdgeType } from "./node-types.js";

// =============================================================================
// Types
// =============================================================================

/** Edge row from the database */
export interface EdgeRow {
  id: string;
  source_node_id: string;
  target_node_id: string;
  type: string;
  metadata: string | null;
  created_at: string;
  created_by: string | null;
  // AutoMem edge fields
  confidence: number | null;
  similarity: number | null;
}

// =============================================================================
// ID Generation
// =============================================================================

/**
 * Generate a unique edge ID with 'edg_' prefix
 */
export function generateEdgeId(): string {
  return `edg_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
}

// =============================================================================
// Edge CRUD Operations
// =============================================================================

/**
 * Create an edge between two nodes
 */
export function createEdge(
  db: Database.Database,
  sourceNodeId: string,
  targetNodeId: string,
  type: EdgeType,
  options: {
    metadata?: EdgeMetadata;
    createdBy?: "boundary" | "daemon" | "user";
    confidence?: number;
    similarity?: number;
  } = {}
): Edge {
  const edge: Edge = {
    id: generateEdgeId(),
    sourceNodeId,
    targetNodeId,
    type,
    metadata: options.metadata ?? {},
    createdAt: new Date().toISOString(),
    createdBy: options.createdBy ?? "daemon",
    confidence: options.confidence,
    similarity: options.similarity,
  };

  const stmt = db.prepare(`
    INSERT INTO edges (id, source_node_id, target_node_id, type, metadata, created_at, created_by, confidence, similarity)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    edge.id,
    edge.sourceNodeId,
    edge.targetNodeId,
    edge.type,
    JSON.stringify(edge.metadata),
    edge.createdAt,
    edge.createdBy,
    edge.confidence ?? null,
    edge.similarity ?? null
  );

  return edge;
}

/**
 * Get edges from a node (outgoing)
 */
export function getEdgesFrom(db: Database.Database, nodeId: string): EdgeRow[] {
  const stmt = db.prepare(`
    SELECT * FROM edges
    WHERE source_node_id = ?
    ORDER BY created_at DESC
  `);
  return stmt.all(nodeId) as EdgeRow[];
}

/**
 * Get edges to a node (incoming)
 */
export function getEdgesTo(db: Database.Database, nodeId: string): EdgeRow[] {
  const stmt = db.prepare(`
    SELECT * FROM edges
    WHERE target_node_id = ?
    ORDER BY created_at DESC
  `);
  return stmt.all(nodeId) as EdgeRow[];
}

/**
 * Get all edges for a node (both directions)
 */
export function getNodeEdges(db: Database.Database, nodeId: string): EdgeRow[] {
  const stmt = db.prepare(`
    SELECT * FROM edges
    WHERE source_node_id = ? OR target_node_id = ?
    ORDER BY created_at DESC
  `);
  return stmt.all(nodeId, nodeId) as EdgeRow[];
}

/**
 * Get all edges
 */
export function getAllEdges(db: Database.Database): EdgeRow[] {
  const stmt = db.prepare("SELECT * FROM edges");
  return stmt.all() as EdgeRow[];
}

/**
 * Get edge by ID
 */
export function getEdge(db: Database.Database, edgeId: string): EdgeRow | null {
  const stmt = db.prepare("SELECT * FROM edges WHERE id = ?");
  return (stmt.get(edgeId) as EdgeRow) ?? null;
}

/**
 * Delete an edge
 */
export function deleteEdge(db: Database.Database, edgeId: string): boolean {
  const result = db.prepare("DELETE FROM edges WHERE id = ?").run(edgeId);
  return result.changes > 0;
}

/**
 * Check if an edge exists between two nodes
 */
export function edgeExists(
  db: Database.Database,
  sourceNodeId: string,
  targetNodeId: string,
  type?: EdgeType
): boolean {
  if (type) {
    const stmt = db.prepare(`
      SELECT 1 FROM edges
      WHERE source_node_id = ? AND target_node_id = ? AND type = ?
    `);
    return stmt.get(sourceNodeId, targetNodeId, type) !== undefined;
  }
  const stmt = db.prepare(`
    SELECT 1 FROM edges
    WHERE source_node_id = ? AND target_node_id = ?
  `);
  return stmt.get(sourceNodeId, targetNodeId) !== undefined;
}

// =============================================================================
// Conversion Functions
// =============================================================================

/**
 * Convert an Edge row from the database to an Edge object
 */
export function edgeRowToEdge(row: EdgeRow): Edge {
  return {
    id: row.id,
    sourceNodeId: row.source_node_id,
    targetNodeId: row.target_node_id,
    type: row.type as EdgeType,
    metadata: row.metadata ? JSON.parse(row.metadata) : {},
    createdAt: row.created_at,
    createdBy: row.created_by as "boundary" | "daemon" | "user",
    confidence: row.confidence ?? undefined,
    similarity: row.similarity ?? undefined,
  };
}
