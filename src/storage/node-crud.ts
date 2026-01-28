/**
 * Node CRUD Operations
 *
 * Core CRUD operations for nodes.
 * The main CRUD functions are here now that search-repository.ts is extracted.
 *
 * Based on specs/storage.md and specs/node-model.md.
 */

import type Database from "better-sqlite3";

import { createHash } from "node:crypto";

import { createEdge, edgeExists } from "./edge-repository.js";
import {
  listNodeVersions,
  readNodeFromPath,
  writeNode,
  type NodeStorageOptions,
} from "./node-storage.js";
import {
  generateDecisionId,
  generateErrorId,
  generateLessonId,
  generateQuirkId,
  type DaemonDecision,
  type Edge,
  type EdgeType,
  type LessonsByLevel,
  type ModelQuirk,
  type Node,
  type ToolError,
} from "./node-types.js";
import { indexNodeForSearch } from "./search-repository.js";

// =============================================================================
// Helpers
// =============================================================================

/**
 * Create a short hash ID for aggregation patterns
 */
function createPatternId(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 16);
}

// =============================================================================
// Types
// =============================================================================

/** Options for node repository operations */
export interface RepositoryOptions extends NodeStorageOptions {
  /** Skip FTS indexing */
  skipFts?: boolean;
}

/** Node row from the database */
export interface NodeRow {
  id: string;
  version: number;
  session_file: string;
  segment_start: string | null;
  segment_end: string | null;
  computer: string | null;
  type: string | null;
  project: string | null;
  is_new_project: number;
  had_clear_goal: number;
  outcome: string | null;
  tokens_used: number;
  cost: number;
  duration_minutes: number;
  timestamp: string;
  analyzed_at: string;
  analyzer_version: string | null;
  data_file: string;
  signals: string | null;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// Helper Insert Functions
// =============================================================================

/**
 * Insert lessons for a node and update lesson_patterns aggregation
 */
export function insertLessons(
  db: Database.Database,
  nodeId: string,
  lessonsByLevel: LessonsByLevel
): void {
  const insertLesson = db.prepare(`
    INSERT INTO lessons (id, node_id, level, summary, details, confidence)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertLessonTag = db.prepare(
    "INSERT OR IGNORE INTO lesson_tags (lesson_id, tag) VALUES (?, ?)"
  );

  // Incremental aggregation: upsert into lesson_patterns
  // Simple increment - nightly batch handles full recalculation if needed
  const upsertLessonPattern = db.prepare(`
    INSERT INTO lesson_patterns (id, level, pattern, occurrences, tags, example_nodes, last_seen)
    VALUES (?, ?, ?, 1, ?, ?, datetime('now'))
    ON CONFLICT(level, pattern) DO UPDATE SET
      occurrences = occurrences + 1,
      last_seen = datetime('now'),
      updated_at = datetime('now')
  `);

  for (const [_level, lessons] of Object.entries(lessonsByLevel)) {
    for (const lesson of lessons) {
      const lessonId = generateLessonId();
      insertLesson.run(
        lessonId,
        nodeId,
        lesson.level,
        lesson.summary,
        lesson.details,
        lesson.confidence
      );

      for (const tag of lesson.tags) {
        insertLessonTag.run(lessonId, tag);
      }

      // Update lesson_patterns aggregation
      const patternId = createPatternId(`${lesson.level}:${lesson.summary}`);
      const tagsJson = JSON.stringify(lesson.tags);
      const exampleNodesJson = JSON.stringify([nodeId]);

      upsertLessonPattern.run(
        patternId,
        lesson.level,
        lesson.summary.trim(),
        tagsJson,
        exampleNodesJson
      );
    }
  }
}

/**
 * Insert model quirks for a node and update model_stats aggregation
 */
export function insertModelQuirks(
  db: Database.Database,
  nodeId: string,
  quirks: ModelQuirk[]
): void {
  const insertQuirk = db.prepare(`
    INSERT INTO model_quirks (id, node_id, model, observation, frequency, workaround)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // Incremental aggregation: upsert into model_stats
  const upsertModelStats = db.prepare(`
    INSERT INTO model_stats (model, quirk_count, error_count, last_used)
    VALUES (?, 1, 0, datetime('now'))
    ON CONFLICT(model) DO UPDATE SET
      quirk_count = quirk_count + 1,
      last_used = datetime('now'),
      updated_at = datetime('now')
  `);

  for (const quirk of quirks) {
    insertQuirk.run(
      generateQuirkId(),
      nodeId,
      quirk.model,
      quirk.observation,
      quirk.frequency,
      quirk.workaround ?? null
    );

    // Update model_stats aggregation
    upsertModelStats.run(quirk.model);
  }
}

/**
 * Insert tool errors for a node and update failure_patterns + model_stats aggregation
 */
export function insertToolErrors(
  db: Database.Database,
  nodeId: string,
  errors: ToolError[]
): void {
  const insertError = db.prepare(`
    INSERT INTO tool_errors (id, node_id, tool, error_type, context, model)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // Incremental aggregation: upsert into failure_patterns
  // Simple increment - nightly batch handles full recalculation if needed
  const upsertFailurePattern = db.prepare(`
    INSERT INTO failure_patterns (
      id, pattern, occurrences, models, tools, example_nodes, last_seen, learning_opportunity
    ) VALUES (?, ?, 1, ?, ?, ?, datetime('now'), ?)
    ON CONFLICT(id) DO UPDATE SET
      occurrences = occurrences + 1,
      last_seen = datetime('now'),
      updated_at = datetime('now')
  `);

  // Incremental aggregation: upsert into model_stats for error_count
  const upsertModelStatsError = db.prepare(`
    INSERT INTO model_stats (model, quirk_count, error_count, last_used)
    VALUES (?, 0, 1, datetime('now'))
    ON CONFLICT(model) DO UPDATE SET
      error_count = error_count + 1,
      last_used = datetime('now'),
      updated_at = datetime('now')
  `);

  for (const error of errors) {
    insertError.run(
      generateErrorId(),
      nodeId,
      error.tool,
      error.errorType,
      error.context,
      error.model
    );

    // Update failure_patterns aggregation
    const patternId = createPatternId(`${error.tool}:${error.errorType}`);
    const pattern = `Error '${error.errorType}' in tool '${error.tool}'`;
    const modelsJson = error.model ? JSON.stringify([error.model]) : "[]";
    const toolsJson = JSON.stringify([error.tool]);
    const exampleNodesJson = JSON.stringify([nodeId]);
    const learningOpportunity = `Investigate why ${error.tool} fails with ${error.errorType}`;

    upsertFailurePattern.run(
      patternId,
      pattern,
      modelsJson,
      toolsJson,
      exampleNodesJson,
      learningOpportunity
    );

    // Update model_stats error_count if model is present
    if (error.model) {
      upsertModelStatsError.run(error.model);
    }
  }
}

/**
 * Insert daemon decisions for a node
 */
export function insertDaemonDecisions(
  db: Database.Database,
  nodeId: string,
  decisions: DaemonDecision[]
): void {
  const insertDecision = db.prepare(`
    INSERT INTO daemon_decisions (id, node_id, timestamp, decision, reasoning)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const decision of decisions) {
    insertDecision.run(
      generateDecisionId(),
      nodeId,
      decision.timestamp,
      decision.decision,
      decision.reasoning
    );
  }
}

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
