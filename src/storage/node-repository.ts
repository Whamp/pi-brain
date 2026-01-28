/**
 * Node Repository - CRUD operations for nodes and edges in SQLite
 *
 * This module stores nodes in both SQLite (for queries) and JSON (for full content).
 * Based on specs/storage.md and specs/node-model.md.
 */

import type Database from "better-sqlite3";

import {
  createEdge,
  deleteEdge,
  edgeExists,
  edgeRowToEdge,
  generateEdgeId,
  getEdge,
  getEdgesFrom,
  getEdgesTo,
  getNodeEdges,
  type EdgeRow,
} from "./edge-repository.js";
import {
  agentOutputToNode,
  type NodeConversionContext,
} from "./node-conversion.js";
import {
  insertDaemonDecisions,
  insertLessons,
  insertModelQuirks,
  insertToolErrors,
  type NodeRow,
  type RepositoryOptions,
} from "./node-crud.js";
import {
  listNodeVersions,
  readNodeFromPath,
  writeNode,
} from "./node-storage.js";
import {
  generateNodeId,
  type Edge,
  type EdgeType,
  type Node,
} from "./node-types.js";
import {
  countSearchResults,
  indexNodeForSearch,
  searchNodes,
  searchNodesAdvanced,
  type SearchField,
  type SearchFilters,
  type SearchHighlight,
  type SearchNodesResult,
  type SearchOptions,
  type SearchResult,
} from "./search-repository.js";

// Re-export types from node-crud.ts for backward compatibility
export type { NodeRow, RepositoryOptions } from "./node-crud.js";

// Re-export edge functions and types from edge-repository.ts for backward compatibility
export {
  createEdge,
  deleteEdge,
  edgeExists,
  edgeRowToEdge,
  generateEdgeId,
  getEdge,
  getEdgesFrom,
  getEdgesTo,
  getNodeEdges,
  type EdgeRow,
} from "./edge-repository.js";

// Re-export node conversion function and types from node-conversion.ts for backward compatibility
export {
  agentOutputToNode,
  type NodeConversionContext,
} from "./node-conversion.js";

// Re-export search functions and types from search-repository.ts for backward compatibility
export {
  countSearchResults,
  indexNodeForSearch,
  searchNodes,
  searchNodesAdvanced,
  type SearchField,
  type SearchFilters,
  type SearchHighlight,
  type SearchNodesResult,
  type SearchOptions,
  type SearchResult,
} from "./search-repository.js";

// Re-export lesson functions and types from lesson-repository.ts for backward compatibility
export {
  countLessons,
  getLessonTags,
  getLessonsByLevel,
  getNodeLessons,
  listLessons,
  type LessonsByLevelResult,
  type ListLessonsFilters,
  type ListLessonsOptions,
  type ListLessonsResult,
} from "./lesson-repository.js";

// Re-export quirk functions and types from quirk-repository.ts for backward compatibility
export {
  countQuirks,
  getAggregatedQuirks,
  getAllQuirkModels,
  getNodeQuirks,
  getQuirksByModel,
  listQuirks,
  type ListQuirksFilters,
  type ListQuirksOptions,
  type ListQuirksResult,
  type ModelQuirkStats,
  type QuirkFrequency,
  type QuirkResult,
  type QuirksByModelResult,
  type QuirkSeverity,
} from "./quirk-repository.js";

// Re-export node query functions and types from node-queries.ts for backward compatibility
export {
  countNodes,
  getAllComputers,
  getAllNodeTypes,
  getAllProjects,
  getAllTags,
  getAllTopics,
  getNodesByTag,
  getNodesByTopic,
  getNodeSummary,
  getNodeTags,
  getNodeTopics,
  getSessionSummaries,
  listNodes,
  type ListNodesFilters,
  type ListNodesOptions,
  type ListNodesResult,
  type NodeSortField,
  type NodeTypeFilter,
  type OutcomeFilter,
  type SessionSummaryRow,
  type SortOrder,
} from "./node-queries.js";

// =============================================================================
// Node CRUD Operations
// =============================================================================

/**
 * Clear all data from the database (nodes, edges, etc.)
 * Used by rebuild-index CLI
 */
export function clearAllData(db: Database.Database): void {
  db.transaction(() => {
    // Delete in order to respect FKs (though CASCADE handles it, being explicit is safer)
    db.prepare("DELETE FROM edges").run();

    // Clear queue and patterns
    try {
      db.prepare("DELETE FROM analysis_queue").run();
    } catch {
      // Table might not exist or other error, ignore
    }

    try {
      db.prepare("DELETE FROM failure_patterns").run();
    } catch {
      // Table might not exist or other error, ignore
    }

    try {
      db.prepare("DELETE FROM lesson_patterns").run();
    } catch {
      // Table might not exist or other error, ignore
    }

    db.prepare("DELETE FROM nodes").run();
    // FTS table (triggers might handle this, but explicit delete is safe)
    db.prepare("DELETE FROM nodes_fts").run();
    // Other tables cascade from nodes
  })();
}

/**
 * Insert a node into the database (without writing JSON file)
 * Used by createNode and rebuild-index CLI
 */
export function insertNodeToDb(
  db: Database.Database,
  node: Node,
  dataFile: string,
  options: { skipFts?: boolean } = {}
): void {
  const insertNode = db.prepare(`
    INSERT INTO nodes (
      id, version, session_file, segment_start, segment_end, computer,
      type, project, is_new_project, had_clear_goal, outcome,
      tokens_used, cost, duration_minutes,
      timestamp, analyzed_at, analyzer_version, data_file, signals
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?, ?
    )
  `);

  insertNode.run(
    node.id,
    node.version,
    node.source.sessionFile,
    node.source.segment.startEntryId,
    node.source.segment.endEntryId,
    node.source.computer,
    node.classification.type,
    node.classification.project,
    node.classification.isNewProject ? 1 : 0,
    node.classification.hadClearGoal ? 1 : 0,
    node.content.outcome,
    node.metadata.tokensUsed,
    node.metadata.cost,
    node.metadata.durationMinutes,
    node.metadata.timestamp,
    node.metadata.analyzedAt,
    node.metadata.analyzerVersion,
    dataFile,
    node.signals ? JSON.stringify(node.signals) : null
  );

  // Insert related data
  const insertTag = db.prepare(
    "INSERT OR IGNORE INTO tags (node_id, tag) VALUES (?, ?)"
  );
  for (const tag of node.semantic.tags) {
    insertTag.run(node.id, tag);
  }

  const insertTopic = db.prepare(
    "INSERT OR IGNORE INTO topics (node_id, topic) VALUES (?, ?)"
  );
  for (const topic of node.semantic.topics) {
    insertTopic.run(node.id, topic);
  }

  insertLessons(db, node.id, node.lessons);
  insertModelQuirks(db, node.id, node.observations.modelQuirks);
  insertToolErrors(db, node.id, node.observations.toolUseErrors);
  insertDaemonDecisions(db, node.id, node.daemonMeta.decisions);

  // Update FTS index
  if (!options.skipFts) {
    indexNodeForSearch(db, node);
  }
}

/**
 * Create a node - writes to both SQLite and JSON storage
 * Returns the node with any auto-generated fields filled in
 */
export function createNode(
  db: Database.Database,
  node: Node,
  options: RepositoryOptions = {}
): Node {
  return db.transaction(() => {
    // 1. Write JSON file first
    const dataFile = writeNode(node, options);

    // 2. Insert into database
    insertNodeToDb(db, node, dataFile, options);

    return node;
  })();
}

/**
 * Upsert a node - creates if not exists, updates if exists.
 * This provides idempotent ingestion for analysis jobs.
 *
 * If a job crashes after writing JSON but before DB insert, re-running
 * will update the existing data cleanly without duplicates or errors.
 *
 * Returns the node and whether it was created (true) or updated (false).
 */
export function upsertNode(
  db: Database.Database,
  node: Node,
  options: RepositoryOptions = {}
): { node: Node; created: boolean } {
  return db.transaction(() => {
    const exists = nodeExistsInDb(db, node.id);

    // 1. Write JSON file (overwrites if exists)
    const dataFile = writeNode(node, options);

    if (!exists) {
      // 2a. Insert into database
      insertNodeToDb(db, node, dataFile, options);
      return { node, created: true };
    }

    // 2b. Update existing node in database
    // Note: source fields (session_file, segment_start, segment_end, computer) are
    // intentionally omitted. The node ID is deterministic from these values, so they
    // are guaranteed to be identical on retry. Only analysis-derived fields are updated.
    const stmt = db.prepare(`
      UPDATE nodes SET
        version = ?,
        type = ?,
        project = ?,
        is_new_project = ?,
        had_clear_goal = ?,
        outcome = ?,
        tokens_used = ?,
        cost = ?,
        duration_minutes = ?,
        timestamp = ?,
        analyzed_at = ?,
        analyzer_version = ?,
        data_file = ?,
        signals = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `);

    stmt.run(
      node.version,
      node.classification.type,
      node.classification.project,
      node.classification.isNewProject ? 1 : 0,
      node.classification.hadClearGoal ? 1 : 0,
      node.content.outcome,
      node.metadata.tokensUsed,
      node.metadata.cost,
      node.metadata.durationMinutes,
      node.metadata.timestamp,
      node.metadata.analyzedAt,
      node.metadata.analyzerVersion,
      dataFile,
      node.signals ? JSON.stringify(node.signals) : null,
      node.id
    );

    // 3. Clear and re-insert related data
    const deleteTags = db.prepare("DELETE FROM tags WHERE node_id = ?");
    const deleteTopics = db.prepare("DELETE FROM topics WHERE node_id = ?");
    const deleteLessons = db.prepare("DELETE FROM lessons WHERE node_id = ?");
    const deleteModelQuirks = db.prepare(
      "DELETE FROM model_quirks WHERE node_id = ?"
    );
    const deleteToolErrors = db.prepare(
      "DELETE FROM tool_errors WHERE node_id = ?"
    );
    const deleteDaemonDecisions = db.prepare(
      "DELETE FROM daemon_decisions WHERE node_id = ?"
    );

    deleteTags.run(node.id);
    deleteTopics.run(node.id);
    deleteLessons.run(node.id);
    deleteModelQuirks.run(node.id);
    deleteToolErrors.run(node.id);
    deleteDaemonDecisions.run(node.id);

    // 4. Re-insert related data
    const insertTag = db.prepare(
      "INSERT OR IGNORE INTO tags (node_id, tag) VALUES (?, ?)"
    );
    for (const tag of node.semantic.tags) {
      insertTag.run(node.id, tag);
    }

    const insertTopic = db.prepare(
      "INSERT OR IGNORE INTO topics (node_id, topic) VALUES (?, ?)"
    );
    for (const topic of node.semantic.topics) {
      insertTopic.run(node.id, topic);
    }

    insertLessons(db, node.id, node.lessons);
    insertModelQuirks(db, node.id, node.observations.modelQuirks);
    insertToolErrors(db, node.id, node.observations.toolUseErrors);
    insertDaemonDecisions(db, node.id, node.daemonMeta.decisions);

    // 5. Update FTS index
    if (!options.skipFts) {
      indexNodeForSearch(db, node);
    }

    return { node, created: false };
  })();
}

/**
 * Update a node - writes new JSON version and updates SQLite row.
 * Throws if the node doesn't exist in the database.
 * Returns the updated node.
 */
export function updateNode(
  db: Database.Database,
  node: Node,
  options: RepositoryOptions = {}
): Node {
  return db.transaction(() => {
    // Verify node exists before any side effects
    if (!nodeExistsInDb(db, node.id)) {
      throw new Error(
        `Cannot update node ${node.id}: node does not exist in database. Use createNode for new nodes.`
      );
    }

    // 1. Write new JSON file (version should be incremented)
    const dataFile = writeNode(node, options);

    // 2. Update nodes table
    const stmt = db.prepare(`
      UPDATE nodes SET
        version = ?,
        type = ?,
        project = ?,
        is_new_project = ?,
        had_clear_goal = ?,
        outcome = ?,
        tokens_used = ?,
        cost = ?,
        duration_minutes = ?,
        timestamp = ?,
        analyzed_at = ?,
        analyzer_version = ?,
        data_file = ?,
        signals = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `);

    stmt.run(
      node.version,
      node.classification.type,
      node.classification.project,
      node.classification.isNewProject ? 1 : 0,
      node.classification.hadClearGoal ? 1 : 0,
      node.content.outcome,
      node.metadata.tokensUsed,
      node.metadata.cost,
      node.metadata.durationMinutes,
      node.metadata.timestamp,
      node.metadata.analyzedAt,
      node.metadata.analyzerVersion,
      dataFile,
      node.signals ? JSON.stringify(node.signals) : null,
      node.id
    );

    // 3. Clear and re-insert related data (tags, topics, lessons, etc.)
    db.prepare("DELETE FROM tags WHERE node_id = ?").run(node.id);
    db.prepare("DELETE FROM topics WHERE node_id = ?").run(node.id);
    db.prepare("DELETE FROM lessons WHERE node_id = ?").run(node.id);
    db.prepare("DELETE FROM model_quirks WHERE node_id = ?").run(node.id);
    db.prepare("DELETE FROM tool_errors WHERE node_id = ?").run(node.id);
    db.prepare("DELETE FROM daemon_decisions WHERE node_id = ?").run(node.id);

    // 4. Re-insert
    const insertTag = db.prepare(
      "INSERT OR IGNORE INTO tags (node_id, tag) VALUES (?, ?)"
    );
    for (const tag of node.semantic.tags) {
      insertTag.run(node.id, tag);
    }

    const insertTopic = db.prepare(
      "INSERT OR IGNORE INTO topics (node_id, topic) VALUES (?, ?)"
    );
    for (const topic of node.semantic.topics) {
      insertTopic.run(node.id, topic);
    }

    insertLessons(db, node.id, node.lessons);
    insertModelQuirks(db, node.id, node.observations.modelQuirks);
    insertToolErrors(db, node.id, node.observations.toolUseErrors);
    insertDaemonDecisions(db, node.id, node.daemonMeta.decisions);

    // 5. Update FTS index
    if (!options.skipFts) {
      indexNodeForSearch(db, node);
    }

    return node;
  })();
}

/**
 * Get a node by ID (returns the row from SQLite - always the latest version)
 */
export function getNode(db: Database.Database, nodeId: string): NodeRow | null {
  const stmt = db.prepare(`
    SELECT * FROM nodes
    WHERE id = ?
  `);
  return (stmt.get(nodeId) as NodeRow) ?? null;
}

/**
 * Get a specific version of a node from SQLite.
 * Note: SQLite only stores the current/latest version. For historical versions,
 * use getAllNodeVersions() which reads from JSON storage.
 */
export function getNodeVersion(
  db: Database.Database,
  nodeId: string,
  version: number
): NodeRow | null {
  const stmt = db.prepare(`
    SELECT * FROM nodes
    WHERE id = ? AND version = ?
  `);
  return (stmt.get(nodeId, version) as NodeRow) ?? null;
}

/**
 * Check if a node exists in the database
 */
export function nodeExistsInDb(db: Database.Database, nodeId: string): boolean {
  const stmt = db.prepare("SELECT 1 FROM nodes WHERE id = ?");
  return stmt.get(nodeId) !== undefined;
}

/**
 * Get all versions of a node from JSON storage
 */
export function getAllNodeVersions(
  nodeId: string,
  options: RepositoryOptions = {}
): Node[] {
  const versions = listNodeVersions(nodeId, options);
  return versions.map((v) => readNodeFromPath(v.path));
}

/**
 * Delete a node and all related data
 * Note: Due to ON DELETE CASCADE, related records are automatically deleted
 */
export function deleteNode(db: Database.Database, nodeId: string): boolean {
  // Also delete from FTS
  db.prepare("DELETE FROM nodes_fts WHERE node_id = ?").run(nodeId);

  const result = db.prepare("DELETE FROM nodes WHERE id = ?").run(nodeId);
  return result.changes > 0;
}

/**
 * Find a node that contains a specific entry ID as its end boundary
 */
export function findNodeByEndEntryId(
  db: Database.Database,
  sessionFile: string,
  entryId: string
): NodeRow | null {
  const stmt = db.prepare(`
    SELECT * FROM nodes
    WHERE session_file = ? AND segment_end = ?
    ORDER BY version DESC
    LIMIT 1
  `);
  return (stmt.get(sessionFile, entryId) as NodeRow) ?? null;
}

/**
 * Find the latest node for a given session file
 */
export function findLastNodeInSession(
  db: Database.Database,
  sessionFile: string
): NodeRow | null {
  const stmt = db.prepare(`
    SELECT * FROM nodes
    WHERE session_file = ?
    ORDER BY timestamp DESC, version DESC
    LIMIT 1
  `);
  return (stmt.get(sessionFile) as NodeRow) ?? null;
}

/**
 * Find the first node for a given session file
 */
export function findFirstNodeInSession(
  db: Database.Database,
  sessionFile: string
): NodeRow | null {
  const stmt = db.prepare(`
    SELECT * FROM nodes
    WHERE session_file = ?
    ORDER BY timestamp ASC, version ASC
    LIMIT 1
  `);
  return (stmt.get(sessionFile) as NodeRow) ?? null;
}

/**
 * Find the most recent node for a project before a given timestamp.
 * Used for abandoned restart detection.
 *
 * Returns the full Node from JSON storage (not just the row) to access
 * filesTouched and other content fields.
 */
export function findPreviousProjectNode(
  db: Database.Database,
  project: string,
  beforeTimestamp: string
): Node | null {
  const stmt = db.prepare(`
    SELECT data_file FROM nodes
    WHERE project = ? AND timestamp < ?
    ORDER BY timestamp DESC, version DESC
    LIMIT 1
  `);
  const row = stmt.get(project, beforeTimestamp) as
    | { data_file: string }
    | undefined;

  if (!row) {
    return null;
  }

  try {
    return readNodeFromPath(row.data_file);
  } catch {
    // JSON file may have been deleted or corrupted
    return null;
  }
}

/** Valid structural edge types for boundary detection */
const STRUCTURAL_EDGE_TYPES = new Set<EdgeType>([
  "continuation",
  "resume",
  "fork",
  "branch",
  "tree_jump",
  "compaction",
]);

/**
 * Validate and normalize a boundary type to a valid EdgeType
 */
function normalizeEdgeType(boundaryType: string | undefined): EdgeType {
  if (boundaryType && STRUCTURAL_EDGE_TYPES.has(boundaryType as EdgeType)) {
    return boundaryType as EdgeType;
  }
  return "continuation";
}

/**
 * Automatically link a node to its predecessors based on session structure.
 * Creates structural edges based on session continuity and fork relationships.
 * Idempotent: will not create duplicate edges if called multiple times.
 */
export function linkNodeToPredecessors(
  db: Database.Database,
  node: Node,
  context: {
    boundaryType?: string;
  } = {}
): Edge[] {
  const edges: Edge[] = [];

  // 1. Continuation Edge - Link to previous node in same session
  // Find the most recent node in the same session that isn't this node.
  // Use timestamp + segment_end for robust ordering even with identical timestamps.
  if (node.source.segment.startEntryId) {
    const stmt = db.prepare(`
      SELECT * FROM nodes
      WHERE session_file = ? AND id != ?
      ORDER BY timestamp DESC, segment_end DESC, version DESC
      LIMIT 1
    `);
    const prevRow = stmt.get(node.source.sessionFile, node.id) as
      | NodeRow
      | undefined;

    if (prevRow && !edgeExists(db, prevRow.id, node.id)) {
      const type = normalizeEdgeType(context.boundaryType);
      edges.push(createEdge(db, prevRow.id, node.id, type));
    }
  }

  // 2. Fork Edge - Link to parent session if this is the first node in a forked session
  if (node.source.parentSession && !edgeExistsInSameSession(db, node.id)) {
    const parentLastNode = findLastNodeInSession(db, node.source.parentSession);
    if (parentLastNode && !edgeExists(db, parentLastNode.id, node.id)) {
      edges.push(createEdge(db, parentLastNode.id, node.id, "fork"));
    }
  }

  return edges;
}

/**
 * Check if a node has any incoming edges from the same session
 */
function edgeExistsInSameSession(
  db: Database.Database,
  nodeId: string
): boolean {
  const stmt = db.prepare(`
    SELECT 1 FROM edges e
    JOIN nodes s ON e.source_node_id = s.id
    JOIN nodes t ON e.target_node_id = t.id
    WHERE t.id = ? AND s.session_file = t.session_file
  `);
  return stmt.get(nodeId) !== undefined;
}
// =============================================================================
// Full-Text Search
// =============================================================================
// Note: Search functions are now in search-repository.ts
// They are imported and re-exported at the top of this file for backward compatibility

// =============================================================================
// Query Layer: Lessons
// =============================================================================
// Note: Lesson query functions are now in lesson-repository.ts
// They are imported and re-exported at the top of this file for backward compatibility

// =============================================================================
// Query Layer: Model Quirks
// =============================================================================
// Note: Model quirk query functions are now in quirk-repository.ts
// They are imported and re-exported at the top of this file for backward compatibility

// =============================================================================
// Query Layer: Tool Errors
// =============================================================================
// Note: Tool error query functions are now in tool-error-repository.ts
// They are imported and re-exported at the top of this file for backward compatibility

// =============================================================================
// Query Helpers and List Nodes
// =============================================================================
// Note: Query helper functions and listNodes are now in node-queries.ts
// They are imported and re-exported at the top of this file for backward compatibility

// =============================================================================
// Graph Traversal
// =============================================================================
// Note: Graph traversal functions are now in graph-repository.ts
// Re-exported below for backward compatibility

export {
  findPath,
  getAncestors,
  getConnectedNodes,
  getDescendants,
  getSubgraph,
  type ConnectedNodesOptions,
  type ConnectedNodesResult,
  type TraversalDirection,
  type TraversalEdge,
} from "./graph-repository.js";

// Re-export generateNodeId for convenience
export { generateNodeId };
