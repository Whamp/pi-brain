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
  // AutoMem consolidation fields
  relevance_score: number | null;
  last_accessed: string | null;
  archived: number | null;
  importance: number | null;
  // Message count fields
  user_message_count: number | null;
  assistant_message_count: number | null;
  // Clarifying question count fields
  clarifying_question_count: number | null;
  prompted_question_count: number | null;
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
 * Convert boolean to SQLite integer
 */
function boolToInt(value: boolean | undefined): number {
  return value ? 1 : 0;
}

/**
 * Build source-related params for node insert
 */
function buildSourceParams(node: Node): (string | number | null)[] {
  return [
    node.id,
    node.version,
    node.source.sessionFile,
    node.source.segment.startEntryId,
    node.source.segment.endEntryId,
    node.source.computer,
  ];
}

/**
 * Build classification and content params for node insert
 */
function buildClassificationContentParams(
  node: Node
): (string | number | null)[] {
  return [
    node.classification.type,
    node.classification.project,
    boolToInt(node.classification.isNewProject),
    boolToInt(node.classification.hadClearGoal),
    node.content.outcome,
  ];
}

/**
 * Build metadata params for node insert
 */
function buildMetadataParams(
  node: Node,
  dataFile: string
): (string | number | null)[] {
  return [
    node.metadata.tokensUsed,
    node.metadata.cost,
    node.metadata.durationMinutes,
    node.metadata.timestamp,
    node.metadata.analyzedAt,
    node.metadata.analyzerVersion,
    dataFile,
    node.signals ? JSON.stringify(node.signals) : null,
  ];
}

/**
 * Build AutoMem consolidation params for node insert
 */
function buildAutoMemParams(node: Node): (string | number | null)[] {
  return [
    node.relevanceScore ?? 1,
    node.lastAccessed ?? null,
    boolToInt(node.archived),
    node.importance ?? 0.5,
  ];
}

/**
 * Build message count params for node insert
 */
function buildMessageCountParams(node: Node): (number | null)[] {
  return [
    node.metadata.userMessageCount ?? null,
    node.metadata.assistantMessageCount ?? null,
    node.metadata.clarifyingQuestionCount ?? null,
    node.metadata.promptedQuestionCount ?? null,
  ];
}

/**
 * Build the array of parameters for node insertion
 */
function buildNodeInsertParams(
  node: Node,
  dataFile: string
): (string | number | null)[] {
  return [
    ...buildSourceParams(node),
    ...buildClassificationContentParams(node),
    ...buildMetadataParams(node, dataFile),
    ...buildAutoMemParams(node),
    ...buildMessageCountParams(node),
  ];
}

const INSERT_NODE_SQL = `
  INSERT INTO nodes (
    id, version, session_file, segment_start, segment_end, computer,
    type, project, is_new_project, had_clear_goal, outcome,
    tokens_used, cost, duration_minutes,
    timestamp, analyzed_at, analyzer_version, data_file, signals,
    relevance_score, last_accessed, archived, importance,
    user_message_count, assistant_message_count,
    clarifying_question_count, prompted_question_count
  ) VALUES (
    ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?,
    ?, ?, ?,
    ?, ?, ?, ?, ?,
    ?, ?, ?, ?,
    ?, ?,
    ?, ?
  )
`;

/**
 * Insert a node row into the nodes table
 */
function insertNodeRow(
  db: Database.Database,
  node: Node,
  dataFile: string
): void {
  const insertNode = db.prepare(INSERT_NODE_SQL);
  insertNode.run(...buildNodeInsertParams(node, dataFile));
}

/**
 * Insert tags and topics for a node
 */
function insertTagsAndTopics(db: Database.Database, node: Node): void {
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
  insertNodeRow(db, node, dataFile);
  insertTagsAndTopics(db, node);
  insertLessons(db, node.id, node.lessons);
  insertModelQuirks(db, node.id, node.observations.modelQuirks);
  insertToolErrors(db, node.id, node.observations.toolUseErrors);
  insertDaemonDecisions(db, node.id, node.daemonMeta.decisions);

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
 * Build the array of parameters for node update
 */
function buildNodeUpdateParams(
  node: Node,
  dataFile: string
): (string | number | null)[] {
  return [
    node.version,
    ...buildClassificationContentParams(node),
    ...buildMetadataParams(node, dataFile),
    ...buildMessageCountParams(node),
    node.id,
  ];
}

const UPDATE_NODE_SQL = `
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
    user_message_count = ?,
    assistant_message_count = ?,
    clarifying_question_count = ?,
    prompted_question_count = ?,
    updated_at = datetime('now')
  WHERE id = ?
`;

/**
 * Clear all related data for a node (for re-insertion)
 */
function clearNodeRelatedData(db: Database.Database, nodeId: string): void {
  db.prepare("DELETE FROM tags WHERE node_id = ?").run(nodeId);
  db.prepare("DELETE FROM topics WHERE node_id = ?").run(nodeId);
  db.prepare("DELETE FROM lessons WHERE node_id = ?").run(nodeId);
  db.prepare("DELETE FROM model_quirks WHERE node_id = ?").run(nodeId);
  db.prepare("DELETE FROM tool_errors WHERE node_id = ?").run(nodeId);
  db.prepare("DELETE FROM daemon_decisions WHERE node_id = ?").run(nodeId);
}

/**
 * Insert all related data for a node
 */
function insertNodeRelatedData(db: Database.Database, node: Node): void {
  insertTagsAndTopics(db, node);
  insertLessons(db, node.id, node.lessons);
  insertModelQuirks(db, node.id, node.observations.modelQuirks);
  insertToolErrors(db, node.id, node.observations.toolUseErrors);
  insertDaemonDecisions(db, node.id, node.daemonMeta.decisions);
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
    const stmt = db.prepare(UPDATE_NODE_SQL);
    stmt.run(...buildNodeUpdateParams(node, dataFile));

    // 3. Clear and re-insert related data
    clearNodeRelatedData(db, node.id);
    insertNodeRelatedData(db, node);

    // 4. Update FTS index
    if (!options.skipFts) {
      indexNodeForSearch(db, node);
    }

    return { node, created: false };
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
 * Find a node that contains a specific entry ID as its end boundary
 */
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
