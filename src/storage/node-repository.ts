/**
 * Node Repository - CRUD operations for nodes and edges in SQLite
 *
 * This module stores nodes in both SQLite (for queries) and JSON (for full content).
 * Based on specs/storage.md and specs/node-model.md.
 */

import type Database from "better-sqlite3";

import type { AgentNodeOutput } from "../daemon/processor.js";
import type { AnalysisJob } from "../daemon/queue.js";

import {
  listNodeVersions,
  readNodeFromPath,
  writeNode,
  type NodeStorageOptions,
} from "./node-storage.js";
import {
  generateNodeId,
  type DaemonDecision,
  type Edge,
  type EdgeMetadata,
  type EdgeType,
  type LessonsByLevel,
  type ModelQuirk,
  type Node,
  type ToolError,
} from "./node-types.js";

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
  created_at: string;
  updated_at: string;
}

/** Edge row from the database */
export interface EdgeRow {
  id: string;
  source_node_id: string;
  target_node_id: string;
  type: string;
  metadata: string | null;
  created_at: string;
  created_by: string | null;
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
      timestamp, analyzed_at, analyzer_version, data_file
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?
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
    dataFile
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
 * Insert lessons for a node
 */
function insertLessons(
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
    }
  }
}

/**
 * Insert model quirks for a node
 */
function insertModelQuirks(
  db: Database.Database,
  nodeId: string,
  quirks: ModelQuirk[]
): void {
  const insertQuirk = db.prepare(`
    INSERT INTO model_quirks (id, node_id, model, observation, frequency, workaround)
    VALUES (?, ?, ?, ?, ?, ?)
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
  }
}

/**
 * Insert tool errors for a node
 */
function insertToolErrors(
  db: Database.Database,
  nodeId: string,
  errors: ToolError[]
): void {
  const insertError = db.prepare(`
    INSERT INTO tool_errors (id, node_id, tool, error_type, context, model)
    VALUES (?, ?, ?, ?, ?, ?)
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
  }
}

/**
 * Insert daemon decisions for a node
 */
function insertDaemonDecisions(
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
  };

  const stmt = db.prepare(`
    INSERT INTO edges (id, source_node_id, target_node_id, type, metadata, created_at, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    edge.id,
    edge.sourceNodeId,
    edge.targetNodeId,
    edge.type,
    JSON.stringify(edge.metadata),
    edge.createdAt,
    edge.createdBy
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
// Full-Text Search
// =============================================================================

/**
 * Index a node for full-text search
 */
export function indexNodeForSearch(db: Database.Database, node: Node): void {
  // Extract searchable text
  const decisions = node.content.keyDecisions
    .map((d) => `${d.what} ${d.why}`)
    .join(" ");

  const lessons = Object.values(node.lessons)
    .flat()
    .map((l) => `${l.summary} ${l.details}`)
    .join(" ");

  // Collect all tags from semantic tags and all lesson tags
  const allLessonTags = Object.values(node.lessons)
    .flat()
    .flatMap((l) => l.tags);
  const combinedTags = [...new Set([...node.semantic.tags, ...allLessonTags])];
  const tagsStr = combinedTags.join(" ");

  const topicsStr = node.semantic.topics.join(" ");

  // Delete existing entry (for updates)
  db.prepare("DELETE FROM nodes_fts WHERE node_id = ?").run(node.id);

  // Insert new entry
  db.prepare(`
    INSERT INTO nodes_fts (node_id, summary, decisions, lessons, tags, topics)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(node.id, node.content.summary, decisions, lessons, tagsStr, topicsStr);
}

/**
 * Search nodes using full-text search
 * Quotes the query to handle special characters like hyphens
 */
export function searchNodes(
  db: Database.Database,
  query: string,
  limit = 20
): NodeRow[] {
  // Quote each word to handle special FTS5 characters (hyphens, etc.)
  const words = query.split(/\s+/).filter((w) => w.length > 0);

  // Return empty array for empty/whitespace-only queries
  if (words.length === 0) {
    return [];
  }

  const quotedQuery = words
    .map((word) => `"${word.replaceAll('"', '""')}"`)
    .join(" ");

  const stmt = db.prepare(`
    SELECT n.*
    FROM nodes n
    JOIN nodes_fts ON n.id = nodes_fts.node_id
    WHERE nodes_fts MATCH ?
    ORDER BY nodes_fts.rank
    LIMIT ?
  `);
  return stmt.all(quotedQuery, limit) as NodeRow[];
}

// =============================================================================
// Enhanced Full-Text Search
// =============================================================================

/** Fields that can be searched in the FTS index */
export type SearchField =
  | "summary"
  | "decisions"
  | "lessons"
  | "tags"
  | "topics";

/** All searchable fields */
const ALL_SEARCH_FIELDS: SearchField[] = [
  "summary",
  "decisions",
  "lessons",
  "tags",
  "topics",
];

/** Highlight match for search results */
export interface SearchHighlight {
  /** The field where the match was found */
  field: SearchField;
  /** Snippet with the matched text */
  snippet: string;
}

/** Enhanced search result with score and highlights */
export interface SearchResult {
  /** The matching node row */
  node: NodeRow;
  /** FTS rank score (lower is better in FTS5) */
  score: number;
  /** Highlighted snippets showing where matches occurred */
  highlights: SearchHighlight[];
}

/** Options for enhanced search */
export interface SearchOptions {
  /** Specific fields to search (default: all fields) */
  fields?: SearchField[];
  /** Maximum number of results (default: 20, max: 500) */
  limit?: number;
  /** Pagination offset (default: 0) */
  offset?: number;
  /** Additional filters to combine with search */
  filters?: ListNodesFilters;
}

/** Result from enhanced search with pagination metadata */
export interface SearchNodesResult {
  /** The search results */
  results: SearchResult[];
  /** Total matching results (before limit/offset) */
  total: number;
  /** Applied limit */
  limit: number;
  /** Applied offset */
  offset: number;
}

/**
 * Helper to quote query terms for FTS5 to handle special characters
 * @internal
 */
function quoteSearchQuery(query: string): string {
  const words = query.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) {
    return "";
  }
  return words.map((word) => `"${word.replaceAll('"', '""')}"`).join(" ");
}

/**
 * Build column filter for FTS5 search
 * Returns column:term syntax for field-specific search
 * @internal
 */
function buildFieldQuery(query: string, fields: SearchField[]): string {
  const quotedQuery = quoteSearchQuery(query);
  if (!quotedQuery) {
    return "";
  }

  // If searching all fields, just return quoted query
  if (
    fields.length === ALL_SEARCH_FIELDS.length &&
    fields.every((f) => ALL_SEARCH_FIELDS.includes(f))
  ) {
    return quotedQuery;
  }

  // For field-specific search, use FTS5 column filter syntax: {col1 col2}:term
  // Each term needs to be applied to specified columns
  const words = query.split(/\s+/).filter((w) => w.length > 0);
  const columnList = fields.join(" ");

  return words
    .map((word) => `{${columnList}}:"${word.replaceAll('"', '""')}"`)
    .join(" ");
}

/**
 * Extract a highlight snippet from text containing a match
 * @internal
 */
function extractSnippet(text: string, query: string, maxLength = 100): string {
  if (!text) {
    return "";
  }

  const lowerText = text.toLowerCase();
  const queryWords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 0);

  // Find the first matching word
  let matchIndex = -1;
  for (const word of queryWords) {
    const idx = lowerText.indexOf(word);
    if (idx !== -1 && (matchIndex === -1 || idx < matchIndex)) {
      matchIndex = idx;
    }
  }

  if (matchIndex === -1) {
    // No match found, return start of text
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
  }

  // Calculate snippet window
  const halfWindow = Math.floor(maxLength / 2);
  let start = Math.max(0, matchIndex - halfWindow);
  let end = Math.min(text.length, matchIndex + halfWindow);

  // Adjust to avoid cutting words
  if (start > 0) {
    const nextSpace = text.indexOf(" ", start);
    if (nextSpace !== -1 && nextSpace < matchIndex) {
      start = nextSpace + 1;
    }
  }
  if (end < text.length) {
    const prevSpace = text.lastIndexOf(" ", end);
    if (prevSpace > matchIndex) {
      end = prevSpace;
    }
  }

  let snippet = text.slice(start, end);
  if (start > 0) {
    snippet = `...${snippet}`;
  }
  if (end < text.length) {
    snippet = `${snippet}...`;
  }

  return snippet;
}

/**
 * Find highlights for a search result by checking which fields match
 * @internal
 */
function findHighlights(
  db: Database.Database,
  nodeId: string,
  query: string,
  fields: SearchField[]
): SearchHighlight[] {
  const highlights: SearchHighlight[] = [];

  // Get the FTS document content
  const stmt = db.prepare(`
    SELECT summary, decisions, lessons, tags, topics
    FROM nodes_fts
    WHERE node_id = ?
  `);
  const doc = stmt.get(nodeId) as
    | {
        summary: string | null;
        decisions: string | null;
        lessons: string | null;
        tags: string | null;
        topics: string | null;
      }
    | undefined;

  if (!doc) {
    return highlights;
  }

  const queryWords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 0);

  // Check each field for matches
  for (const field of fields) {
    const content = doc[field];
    if (!content) {
      continue;
    }

    const lowerContent = content.toLowerCase();
    const hasMatch = queryWords.some((word) => lowerContent.includes(word));

    if (hasMatch) {
      highlights.push({
        field,
        snippet: extractSnippet(content, query),
      });
    }
  }

  return highlights;
}

/**
 * Enhanced search with scores, highlights, and filter support
 *
 * @example
 * // Search all fields
 * const results = searchNodesAdvanced(db, "authentication JWT");
 *
 * @example
 * // Search only in summary and lessons
 * const results = searchNodesAdvanced(db, "auth", {
 *   fields: ["summary", "lessons"],
 *   limit: 10
 * });
 *
 * @example
 * // Combine search with filters
 * const results = searchNodesAdvanced(db, "database", {
 *   filters: { project: "pi-brain", type: "coding" }
 * });
 */
export function searchNodesAdvanced(
  db: Database.Database,
  query: string,
  options: SearchOptions = {}
): SearchNodesResult {
  const {
    fields: rawFields,
    limit: rawLimit,
    offset: rawOffset,
    filters,
  } = options;
  const fields = rawFields ?? ALL_SEARCH_FIELDS;
  const limit = Math.min(Math.max(1, rawLimit ?? 20), 500);
  const offset = Math.max(0, rawOffset ?? 0);

  // Handle empty query
  const ftsQuery = buildFieldQuery(query, fields);
  if (!ftsQuery) {
    return { results: [], total: 0, limit, offset };
  }

  // Build WHERE clause from filters
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (filters) {
    if (filters.project) {
      conditions.push("n.project LIKE ?");
      params.push(`%${filters.project}%`);
    }
    if (filters.type) {
      conditions.push("n.type = ?");
      params.push(filters.type);
    }
    if (filters.outcome) {
      conditions.push("n.outcome = ?");
      params.push(filters.outcome);
    }
    if (filters.from) {
      conditions.push("n.timestamp >= ?");
      params.push(filters.from);
    }
    if (filters.to) {
      conditions.push("n.timestamp <= ?");
      params.push(filters.to);
    }
    if (filters.computer) {
      conditions.push("n.computer = ?");
      params.push(filters.computer);
    }
    if (filters.hadClearGoal !== undefined) {
      conditions.push("n.had_clear_goal = ?");
      params.push(filters.hadClearGoal ? 1 : 0);
    }
    if (filters.isNewProject !== undefined) {
      conditions.push("n.is_new_project = ?");
      params.push(filters.isNewProject ? 1 : 0);
    }
    if (filters.tags && filters.tags.length > 0) {
      const tagPlaceholders = filters.tags.map(() => "?").join(", ");
      conditions.push(`n.id IN (
        SELECT node_id FROM (
          SELECT node_id, tag FROM tags
          UNION
          SELECT l.node_id, lt.tag FROM lesson_tags lt JOIN lessons l ON lt.lesson_id = l.id
        )
        WHERE tag IN (${tagPlaceholders})
        GROUP BY node_id
        HAVING COUNT(DISTINCT tag) = ?
      )`);
      params.push(...filters.tags, filters.tags.length);
    }
    if (filters.topics && filters.topics.length > 0) {
      const topicPlaceholders = filters.topics.map(() => "?").join(", ");
      conditions.push(`n.id IN (
        SELECT node_id FROM topics 
        WHERE topic IN (${topicPlaceholders})
        GROUP BY node_id
        HAVING COUNT(DISTINCT topic) = ?
      )`);
      params.push(...filters.topics, filters.topics.length);
    }
  }

  const filterClause =
    conditions.length > 0 ? `AND ${conditions.join(" AND ")}` : "";

  // Get total count
  const countStmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM nodes n
    JOIN nodes_fts ON n.id = nodes_fts.node_id
    WHERE nodes_fts MATCH ?
    ${filterClause}
  `);
  const countResult = countStmt.get(ftsQuery, ...params) as { count: number };
  const total = countResult.count;

  // Get paginated results with rank
  const dataStmt = db.prepare(`
    SELECT n.*, nodes_fts.rank as fts_rank
    FROM nodes n
    JOIN nodes_fts ON n.id = nodes_fts.node_id
    WHERE nodes_fts MATCH ?
    ${filterClause}
    ORDER BY nodes_fts.rank
    LIMIT ? OFFSET ?
  `);
  const rows = dataStmt.all(ftsQuery, ...params, limit, offset) as (NodeRow & {
    fts_rank: number;
  })[];

  // Build results with highlights
  const results: SearchResult[] = rows.map((row) => {
    const { fts_rank, ...nodeRow } = row;
    return {
      node: nodeRow,
      score: fts_rank,
      highlights: findHighlights(db, nodeRow.id, query, fields),
    };
  });

  return { results, total, limit, offset };
}

/**
 * Count total search results (without fetching data)
 */
export function countSearchResults(
  db: Database.Database,
  query: string,
  options: Pick<SearchOptions, "fields" | "filters"> = {}
): number {
  const { fields: rawFields, filters } = options;
  const fields = rawFields ?? ALL_SEARCH_FIELDS;

  const ftsQuery = buildFieldQuery(query, fields);
  if (!ftsQuery) {
    return 0;
  }

  // Build WHERE clause from filters
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (filters) {
    if (filters.project) {
      conditions.push("n.project LIKE ?");
      params.push(`%${filters.project}%`);
    }
    if (filters.type) {
      conditions.push("n.type = ?");
      params.push(filters.type);
    }
    if (filters.outcome) {
      conditions.push("n.outcome = ?");
      params.push(filters.outcome);
    }
    if (filters.from) {
      conditions.push("n.timestamp >= ?");
      params.push(filters.from);
    }
    if (filters.to) {
      conditions.push("n.timestamp <= ?");
      params.push(filters.to);
    }
    if (filters.computer) {
      conditions.push("n.computer = ?");
      params.push(filters.computer);
    }
    if (filters.hadClearGoal !== undefined) {
      conditions.push("n.had_clear_goal = ?");
      params.push(filters.hadClearGoal ? 1 : 0);
    }
    if (filters.isNewProject !== undefined) {
      conditions.push("n.is_new_project = ?");
      params.push(filters.isNewProject ? 1 : 0);
    }
    if (filters.tags && filters.tags.length > 0) {
      const tagPlaceholders = filters.tags.map(() => "?").join(", ");
      conditions.push(`n.id IN (
        SELECT node_id FROM (
          SELECT node_id, tag FROM tags
          UNION
          SELECT l.node_id, lt.tag FROM lesson_tags lt JOIN lessons l ON lt.lesson_id = l.id
        )
        WHERE tag IN (${tagPlaceholders})
        GROUP BY node_id
        HAVING COUNT(DISTINCT tag) = ?
      )`);
      params.push(...filters.tags, filters.tags.length);
    }
    if (filters.topics && filters.topics.length > 0) {
      const topicPlaceholders = filters.topics.map(() => "?").join(", ");
      conditions.push(`n.id IN (
        SELECT node_id FROM topics 
        WHERE topic IN (${topicPlaceholders})
        GROUP BY node_id
        HAVING COUNT(DISTINCT topic) = ?
      )`);
      params.push(...filters.topics, filters.topics.length);
    }
  }

  const filterClause =
    conditions.length > 0 ? `AND ${conditions.join(" AND ")}` : "";

  const stmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM nodes n
    JOIN nodes_fts ON n.id = nodes_fts.node_id
    WHERE nodes_fts MATCH ?
    ${filterClause}
  `);
  const result = stmt.get(ftsQuery, ...params) as { count: number };
  return result.count;
}

// =============================================================================
// Query Layer: Lessons
// =============================================================================

/** Filters for querying lessons */
export interface ListLessonsFilters {
  /** Filter by lesson level (model, project, etc.) */
  level?: string;
  /** Filter by source project (partial match via LIKE %project%) */
  project?: string;
  /** Filter by tags (AND logic - lessons must have ALL specified tags) */
  tags?: string[];
  /** Filter by exact confidence level */
  confidence?: string;
}

/** Pagination options for lessons */
export interface ListLessonsOptions {
  /** Max results to return (default: 50, max: 500) */
  limit?: number;
  /** Offset for pagination (default: 0) */
  offset?: number;
}

/** Result from listLessons query */
export interface ListLessonsResult {
  /** Matched lessons with metadata */
  lessons: {
    id: string;
    nodeId: string;
    level: string;
    summary: string;
    details: string | null;
    confidence: string | null;
    tags: string[];
    sourceProject: string | null;
    createdAt: string;
  }[];
  /** Total count of lessons matching filters (before pagination) */
  total: number;
  /** Limit used for the query */
  limit: number;
  /** Offset used for the query */
  offset: number;
}

/**
 * List lessons with filters and pagination.
 *
 * Supports filtering by:
 * - level (exact match)
 * - project (partial match via nodes table)
 * - tags (AND logic via lesson_tags table)
 * - confidence (exact match)
 *
 * Per specs/api.md GET /api/v1/lessons endpoint.
 */
export function listLessons(
  db: Database.Database,
  filters: ListLessonsFilters = {},
  options: ListLessonsOptions = {}
): ListLessonsResult {
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 500);
  const offset = Math.max(options.offset ?? 0, 0);

  // Build WHERE clause
  const conditions: string[] = ["1=1"];
  const params: (string | number)[] = [];

  if (filters.level) {
    conditions.push("l.level = ?");
    params.push(filters.level);
  }

  if (filters.confidence) {
    conditions.push("l.confidence = ?");
    params.push(filters.confidence);
  }

  if (filters.project) {
    conditions.push("n.project LIKE ?");
    params.push(`%${filters.project}%`);
  }

  if (filters.tags && filters.tags.length > 0) {
    const tagPlaceholders = filters.tags.map(() => "?").join(", ");
    conditions.push(`(
      SELECT COUNT(DISTINCT lt.tag) FROM lesson_tags lt
      WHERE lt.lesson_id = l.id AND lt.tag IN (${tagPlaceholders})
    ) = ?`);
    params.push(...filters.tags, filters.tags.length);
  }

  const whereClause = conditions.join(" AND ");

  // Count total
  const countStmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM lessons l
    JOIN nodes n ON l.node_id = n.id
    WHERE ${whereClause}
  `);
  const total = (countStmt.get(...params) as { count: number }).count;

  // Fetch lessons with tags and project info
  const dataStmt = db.prepare(`
    SELECT 
      l.id, l.node_id as nodeId, l.level, l.summary, l.details, l.confidence, l.created_at as createdAt,
      n.project as sourceProject
    FROM lessons l
    JOIN nodes n ON l.node_id = n.id
    WHERE ${whereClause}
    ORDER BY l.created_at DESC, l.id DESC
    LIMIT ? OFFSET ?
  `);

  const rows = dataStmt.all(...params, limit, offset) as {
    id: string;
    nodeId: string;
    level: string;
    summary: string;
    details: string | null;
    confidence: string | null;
    createdAt: string;
    sourceProject: string | null;
  }[];

  // Attach tags to each lesson efficiently
  const lessonIds = rows.map((r) => r.id);
  const lessonMap = new Map<string, string[]>();
  if (lessonIds.length > 0) {
    const placeholders = lessonIds.map(() => "?").join(", ");
    const tagsStmt = db.prepare(`
      SELECT lesson_id, tag FROM lesson_tags
      WHERE lesson_id IN (${placeholders})
    `);
    const allTags = tagsStmt.all(...lessonIds) as {
      lesson_id: string;
      tag: string;
    }[];
    for (const { lesson_id, tag } of allTags) {
      let tags = lessonMap.get(lesson_id);
      if (!tags) {
        tags = [];
        lessonMap.set(lesson_id, tags);
      }
      tags.push(tag);
    }
  }

  const lessons = rows.map((row) => ({
    ...row,
    tags: lessonMap.get(row.id) ?? [],
  }));

  return { lessons, total, limit, offset };
}

/** Result from getLessonsByLevel */
export type LessonsByLevelResult = Record<
  string,
  {
    count: number;
    recent: {
      id: string;
      summary: string;
      createdAt: string;
    }[];
  }
>;

/**
 * Get aggregated lesson stats by level.
 * Returns counts and most recent lessons for each level.
 *
 * Per specs/api.md GET /api/v1/lessons/by-level endpoint.
 */
export function getLessonsByLevel(
  db: Database.Database,
  recentLimit = 5
): LessonsByLevelResult {
  const levels = [
    "project",
    "task",
    "user",
    "model",
    "tool",
    "skill",
    "subagent",
  ];
  const result: LessonsByLevelResult = {};

  for (const level of levels) {
    // Get count
    const countStmt = db.prepare(
      "SELECT COUNT(*) as count FROM lessons WHERE level = ?"
    );
    const { count } = countStmt.get(level) as { count: number };

    // Get recent
    const recentStmt = db.prepare(`
      SELECT id, summary, created_at as createdAt
      FROM lessons
      WHERE level = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `);
    const recent = recentStmt.all(level, recentLimit) as {
      id: string;
      summary: string;
      createdAt: string;
    }[];

    result[level] = { count, recent };
  }

  return result;
}

/**
 * Count lessons matching filters (without fetching data)
 */
export function countLessons(
  db: Database.Database,
  filters: ListLessonsFilters = {}
): number {
  const result = listLessons(db, filters, { limit: 1 });
  return result.total;
}

// =============================================================================
// Query Layer: Model Quirks
// =============================================================================

/** Frequency values for model quirks */
export type QuirkFrequency = "once" | "sometimes" | "often" | "always";

/** Severity values for model quirks (matches spec) */
export type QuirkSeverity = "low" | "medium" | "high";

/** Filters for querying model quirks */
export interface ListQuirksFilters {
  /** Filter by exact model (e.g., "zai/glm-4.7") */
  model?: string;
  /** Filter by minimum frequency (inclusive ranking: once < sometimes < often < always) */
  frequency?: QuirkFrequency;
  /** Filter by severity (if present in observations) */
  severity?: QuirkSeverity;
  /** Filter by source project (partial match via nodes table) */
  project?: string;
}

/** Pagination options for quirks */
export interface ListQuirksOptions {
  /** Max results to return (default: 50, max: 500) */
  limit?: number;
  /** Offset for pagination (default: 0) */
  offset?: number;
}

/** A quirk result with metadata */
export interface QuirkResult {
  id: string;
  nodeId: string;
  model: string;
  observation: string;
  frequency: string | null;
  workaround: string | null;
  sourceProject: string | null;
  createdAt: string;
}

/** Result from listQuirks query */
export interface ListQuirksResult {
  /** Matched quirks with metadata */
  quirks: QuirkResult[];
  /** Total count of quirks matching filters (before pagination) */
  total: number;
  /** Limit used for the query */
  limit: number;
  /** Offset used for the query */
  offset: number;
}

/** Frequency ranking for filtering (higher = more frequent) */
const FREQUENCY_RANK: Record<string, number> = {
  once: 1,
  sometimes: 2,
  often: 3,
  always: 4,
};

/**
 * List model quirks with filters and pagination.
 *
 * Supports filtering by:
 * - model (exact match)
 * - frequency (minimum frequency ranking)
 * - project (partial match via nodes table)
 *
 * Per specs/api.md GET /api/v1/quirks endpoint.
 */
export function listQuirks(
  db: Database.Database,
  filters: ListQuirksFilters = {},
  options: ListQuirksOptions = {}
): ListQuirksResult {
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 500);
  const offset = Math.max(options.offset ?? 0, 0);

  // Build WHERE clause
  const conditions: string[] = ["1=1"];
  const params: (string | number)[] = [];

  if (filters.model) {
    conditions.push("q.model = ?");
    params.push(filters.model);
  }

  if (filters.project) {
    conditions.push("n.project LIKE ?");
    params.push(`%${filters.project}%`);
  }

  // Frequency filtering: match specified frequency OR higher
  if (filters.frequency) {
    const minRank = FREQUENCY_RANK[filters.frequency] ?? 1;
    // Filter to frequencies with rank >= minRank
    const validFrequencies = Object.entries(FREQUENCY_RANK)
      .filter(([, rank]) => rank >= minRank)
      .map(([freq]) => freq);
    const placeholders = validFrequencies.map(() => "?").join(", ");
    conditions.push(`q.frequency IN (${placeholders})`);
    params.push(...validFrequencies);
  }

  const whereClause = conditions.join(" AND ");

  // Count total
  const countStmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM model_quirks q
    JOIN nodes n ON q.node_id = n.id
    WHERE ${whereClause}
  `);
  const total = (countStmt.get(...params) as { count: number }).count;

  // Fetch quirks with project info
  const dataStmt = db.prepare(`
    SELECT 
      q.id, q.node_id as nodeId, q.model, q.observation, q.frequency, q.workaround, q.created_at as createdAt,
      n.project as sourceProject
    FROM model_quirks q
    JOIN nodes n ON q.node_id = n.id
    WHERE ${whereClause}
    ORDER BY q.created_at DESC, q.id DESC
    LIMIT ? OFFSET ?
  `);

  const quirks = dataStmt.all(...params, limit, offset) as QuirkResult[];

  return { quirks, total, limit, offset };
}

/** Stats for a single model */
export interface ModelQuirkStats {
  /** Total number of quirks observed for this model */
  count: number;
  /** Most recent quirks */
  recent: {
    id: string;
    observation: string;
    frequency: string | null;
    createdAt: string;
  }[];
}

/** Result from getQuirksByModel */
export type QuirksByModelResult = Record<string, ModelQuirkStats>;

/**
 * Get aggregated quirk stats by model.
 * Returns counts and most recent quirks for each model that has quirks.
 *
 * Per specs/api.md GET /api/v1/stats/models endpoint (quirkCount field).
 */
export function getQuirksByModel(
  db: Database.Database,
  recentLimit = 5
): QuirksByModelResult {
  // Get all unique models that have quirks
  const modelsStmt = db.prepare(`
    SELECT DISTINCT model FROM model_quirks ORDER BY model
  `);
  const models = (modelsStmt.all() as { model: string }[]).map((r) => r.model);

  const result: QuirksByModelResult = {};

  for (const model of models) {
    // Get count
    const countStmt = db.prepare(
      "SELECT COUNT(*) as count FROM model_quirks WHERE model = ?"
    );
    const { count } = countStmt.get(model) as { count: number };

    // Get recent quirks
    const recentStmt = db.prepare(`
      SELECT id, observation, frequency, created_at as createdAt
      FROM model_quirks
      WHERE model = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `);
    const recent = recentStmt.all(model, recentLimit) as {
      id: string;
      observation: string;
      frequency: string | null;
      createdAt: string;
    }[];

    result[model] = { count, recent };
  }

  return result;
}

/**
 * Count quirks matching filters (without fetching data)
 */
export function countQuirks(
  db: Database.Database,
  filters: ListQuirksFilters = {}
): number {
  const result = listQuirks(db, filters, { limit: 1 });
  return result.total;
}

/**
 * Get all unique models that have quirks recorded
 */
export function getAllQuirkModels(db: Database.Database): string[] {
  const stmt = db.prepare(`
    SELECT DISTINCT model FROM model_quirks
    ORDER BY model
  `);
  const rows = stmt.all() as { model: string }[];
  return rows.map((r) => r.model);
}

/**
 * Get aggregated quirks - similar observations grouped together.
 * Useful for the dashboard "Model Quirks" panel.
 *
 * Per specs/storage.md "Find model quirks by frequency" query.
 */
export function getAggregatedQuirks(
  db: Database.Database,
  options: { minOccurrences?: number; limit?: number } = {}
): {
  model: string;
  observation: string;
  occurrences: number;
  frequency: string | null;
  nodeIds: string[];
}[] {
  const minOccurrences = options.minOccurrences ?? 1;
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 500);

  const stmt = db.prepare(`
    SELECT 
      model, 
      observation, 
      COUNT(*) as occurrences,
      MAX(frequency) as frequency,
      GROUP_CONCAT(node_id, ',') as nodeIdList
    FROM model_quirks
    GROUP BY model, observation
    HAVING COUNT(*) >= ?
    ORDER BY occurrences DESC, model, observation
    LIMIT ?
  `);

  const rows = stmt.all(minOccurrences, limit) as {
    model: string;
    observation: string;
    occurrences: number;
    frequency: string | null;
    nodeIdList: string;
  }[];

  return rows.map((row) => ({
    model: row.model,
    observation: row.observation,
    occurrences: row.occurrences,
    frequency: row.frequency,
    nodeIds: row.nodeIdList.split(","),
  }));
}

// =============================================================================
// Query Layer: Tool Errors
// =============================================================================

/** Filters for querying tool errors */
export interface ListToolErrorsFilters {
  /** Filter by tool name (e.g., "edit") */
  tool?: string;
  /** Filter by exact model */
  model?: string;
  /** Filter by error type */
  errorType?: string;
  /** Filter by source project (partial match via nodes table) */
  project?: string;
}

/** Pagination options for tool errors */
export interface ListToolErrorsOptions {
  /** Max results to return (default: 50, max: 500) */
  limit?: number;
  /** Offset for pagination (default: 0) */
  offset?: number;
}

/** A tool error result with metadata */
export interface ToolErrorResult {
  id: string;
  nodeId: string;
  tool: string;
  errorType: string;
  context: string | null;
  model: string | null;
  sourceProject: string | null;
  createdAt: string;
}

/** Result from listToolErrors query */
export interface ListToolErrorsResult {
  /** Matched tool errors with metadata */
  errors: ToolErrorResult[];
  /** Total count of errors matching filters (before pagination) */
  total: number;
  /** Limit used for the query */
  limit: number;
  /** Offset used for the query */
  offset: number;
}

/**
 * List individual tool errors with filters and pagination.
 */
export function listToolErrors(
  db: Database.Database,
  filters: ListToolErrorsFilters = {},
  options: ListToolErrorsOptions = {}
): ListToolErrorsResult {
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 500);
  const offset = Math.max(options.offset ?? 0, 0);

  // Build WHERE clause
  const conditions: string[] = ["1=1"];
  const params: (string | number)[] = [];

  if (filters.tool) {
    conditions.push("te.tool = ?");
    params.push(filters.tool);
  }

  if (filters.model) {
    conditions.push("te.model = ?");
    params.push(filters.model);
  }

  if (filters.errorType) {
    conditions.push("te.error_type = ?");
    params.push(filters.errorType);
  }

  if (filters.project) {
    conditions.push("n.project LIKE ?");
    params.push(`%${filters.project}%`);
  }

  const whereClause = conditions.join(" AND ");

  // Count total
  const countStmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM tool_errors te
    JOIN nodes n ON te.node_id = n.id
    WHERE ${whereClause}
  `);
  const total = (countStmt.get(...params) as { count: number }).count;

  // Fetch errors with project info
  const dataStmt = db.prepare(`
    SELECT 
      te.id, te.node_id as nodeId, te.tool, te.error_type as errorType, te.context, te.model, te.created_at as createdAt,
      n.project as sourceProject
    FROM tool_errors te
    JOIN nodes n ON te.node_id = n.id
    WHERE ${whereClause}
    ORDER BY te.created_at DESC, te.id DESC
    LIMIT ? OFFSET ?
  `);

  const errors = dataStmt.all(...params, limit, offset) as ToolErrorResult[];

  return { errors, total, limit, offset };
}

/**
 * Get aggregated tool errors - grouped by tool and error type (and optionally model).
 * Per specs/api.md GET /api/v1/tool-errors.
 */
export function getAggregatedToolErrors(
  db: Database.Database,
  filters: ListToolErrorsFilters = {},
  options: { limit?: number; offset?: number; groupByModel?: boolean } = {}
): {
  model?: string;
  tool: string;
  errorType: string;
  count: number;
  models?: string[];
  recentNodes: string[];
}[] {
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 500);
  const offset = Math.max(options.offset ?? 0, 0);
  const groupByModel = options.groupByModel ?? false;

  // Build WHERE clause
  const conditions: string[] = ["1=1"];
  const params: (string | number)[] = [];

  if (filters.tool) {
    conditions.push("te.tool = ?");
    params.push(filters.tool);
  }

  if (filters.model) {
    conditions.push("te.model = ?");
    params.push(filters.model);
  }

  if (filters.errorType) {
    conditions.push("te.error_type = ?");
    params.push(filters.errorType);
  }

  const whereClause = conditions.join(" AND ");

  const groupBy = groupByModel ? "model, tool, errorType" : "tool, errorType";
  const selectModel = groupByModel
    ? "model,"
    : "GROUP_CONCAT(DISTINCT model) as modelsList,";

  const stmt = db.prepare(`
    SELECT 
      ${selectModel}
      tool, 
      error_type as errorType, 
      COUNT(*) as count,
      GROUP_CONCAT(node_id) as nodeIdsList
    FROM tool_errors te
    WHERE ${whereClause}
    GROUP BY ${groupBy}
    ORDER BY count DESC, ${groupBy}
    LIMIT ? OFFSET ?
  `);

  const rows = stmt.all(...params, limit, offset) as {
    model?: string;
    modelsList?: string;
    tool: string;
    errorType: string;
    count: number;
    nodeIdsList: string;
  }[];

  return rows.map((row) => {
    const result: {
      tool: string;
      errorType: string;
      count: number;
      recentNodes: string[];
      model?: string;
      models?: string[];
    } = {
      tool: row.tool,
      errorType: row.errorType,
      count: row.count,
      recentNodes: [...new Set(row.nodeIdsList.split(","))].slice(0, 5),
    };

    if (groupByModel) {
      result.model = row.model;
    } else {
      result.models = row.modelsList ? row.modelsList.split(",") : [];
    }

    return result;
  });
}

/**
 * Get tool error statistics for the dashboard.
 * Per specs/api.md GET /api/v1/stats/tool-errors.
 */
export function getToolErrorStats(db: Database.Database): {
  byTool: { tool: string; count: number; models: string[] }[];
  byModel: { model: string; count: number }[];
  trends: { thisWeek: number; lastWeek: number; change: number };
} {
  // Stats by tool
  const byToolStmt = db.prepare(`
    SELECT 
      tool, 
      COUNT(*) as count,
      GROUP_CONCAT(DISTINCT model) as modelsList
    FROM tool_errors
    GROUP BY tool
    ORDER BY count DESC
  `);
  const toolRows = byToolStmt.all() as {
    tool: string;
    count: number;
    modelsList: string | null;
  }[];
  const byTool = toolRows.map((r) => ({
    tool: r.tool,
    count: r.count,
    models: r.modelsList ? r.modelsList.split(",") : [],
  }));

  // Stats by model
  const byModelStmt = db.prepare(`
    SELECT 
      model, 
      COUNT(*) as count
    FROM tool_errors
    WHERE model IS NOT NULL
    GROUP BY model
    ORDER BY count DESC
  `);
  const byModel = byModelStmt.all() as { model: string; count: number }[];

  // Trends
  const thisWeekStmt = db.prepare(`
    SELECT COUNT(*) as count FROM tool_errors 
    WHERE created_at >= datetime('now', '-7 days')
  `);
  const lastWeekStmt = db.prepare(`
    SELECT COUNT(*) as count FROM tool_errors 
    WHERE created_at >= datetime('now', '-14 days') 
      AND created_at < datetime('now', '-7 days')
  `);

  const thisWeek = (thisWeekStmt.get() as { count: number }).count;
  const lastWeek = (lastWeekStmt.get() as { count: number }).count;
  const change = thisWeek - lastWeek;

  return {
    byTool,
    byModel,
    trends: { thisWeek, lastWeek, change },
  };
}

/**
 * Count tool errors matching filters.
 */
export function countToolErrors(
  db: Database.Database,
  filters: ListToolErrorsFilters = {}
): number {
  const result = listToolErrors(db, filters, { limit: 1 });
  return result.total;
}

/**
 * Get all unique tools that have errors recorded
 */
export function getAllToolsWithErrors(db: Database.Database): string[] {
  const stmt = db.prepare(`
    SELECT DISTINCT tool FROM tool_errors
    ORDER BY tool
  `);
  const rows = stmt.all() as { tool: string }[];
  return rows.map((r) => r.tool);
}

// =============================================================================
// Query Helpers
// =============================================================================

/**
 * Get node summary from FTS index
 */
export function getNodeSummary(
  db: Database.Database,
  nodeId: string
): string | null {
  const stmt = db.prepare("SELECT summary FROM nodes_fts WHERE node_id = ?");
  const result = stmt.get(nodeId) as { summary: string } | undefined;
  return result?.summary ?? null;
}

/**
 * Get tags for a node
 */
export function getNodeTags(db: Database.Database, nodeId: string): string[] {
  const stmt = db.prepare("SELECT tag FROM tags WHERE node_id = ?");
  const rows = stmt.all(nodeId) as { tag: string }[];
  return rows.map((r) => r.tag);
}

/**
 * Get topics for a node
 */
export function getNodeTopics(db: Database.Database, nodeId: string): string[] {
  const stmt = db.prepare("SELECT topic FROM topics WHERE node_id = ?");
  const rows = stmt.all(nodeId) as { topic: string }[];
  return rows.map((r) => r.topic);
}

/**
 * Get lessons for a node
 */
export function getNodeLessons(
  db: Database.Database,
  nodeId: string
): {
  id: string;
  level: string;
  summary: string;
  details: string | null;
  confidence: string | null;
}[] {
  const stmt = db.prepare(`
    SELECT id, level, summary, details, confidence
    FROM lessons
    WHERE node_id = ?
    ORDER BY level, created_at
  `);
  return stmt.all(nodeId) as {
    id: string;
    level: string;
    summary: string;
    details: string | null;
    confidence: string | null;
  }[];
}

/**
 * Get model quirks for a node
 */
export function getNodeQuirks(
  db: Database.Database,
  nodeId: string
): {
  id: string;
  model: string;
  observation: string;
  frequency: string | null;
  workaround: string | null;
}[] {
  const stmt = db.prepare(`
    SELECT id, model, observation, frequency, workaround
    FROM model_quirks
    WHERE node_id = ?
    ORDER BY created_at
  `);
  return stmt.all(nodeId) as {
    id: string;
    model: string;
    observation: string;
    frequency: string | null;
    workaround: string | null;
  }[];
}

/**
 * Get tool errors for a node
 */
export function getNodeToolErrors(
  db: Database.Database,
  nodeId: string
): {
  id: string;
  tool: string;
  error_type: string;
  context: string | null;
  model: string | null;
}[] {
  const stmt = db.prepare(`
    SELECT id, tool, error_type, context, model
    FROM tool_errors
    WHERE node_id = ?
    ORDER BY created_at
  `);
  return stmt.all(nodeId) as {
    id: string;
    tool: string;
    error_type: string;
    context: string | null;
    model: string | null;
  }[];
}

/**
 * Get all unique tags in the system
 */
export function getAllTags(db: Database.Database): string[] {
  const stmt = db.prepare(`
    SELECT tag FROM (
      SELECT tag FROM tags
      UNION
      SELECT tag FROM lesson_tags
    ) ORDER BY tag
  `);
  const rows = stmt.all() as { tag: string }[];
  return rows.map((r) => r.tag);
}

/**
 * Get all unique topics in the system
 */
export function getAllTopics(db: Database.Database): string[] {
  const stmt = db.prepare("SELECT DISTINCT topic FROM topics ORDER BY topic");
  const rows = stmt.all() as { topic: string }[];
  return rows.map((r) => r.topic);
}

/**
 * Get tags for a specific lesson
 */
export function getLessonTags(
  db: Database.Database,
  lessonId: string
): string[] {
  const stmt = db.prepare("SELECT tag FROM lesson_tags WHERE lesson_id = ?");
  const rows = stmt.all(lessonId) as { tag: string }[];
  return rows.map((r) => r.tag);
}

/**
 * Find nodes by tag (matches both node tags and lesson tags)
 */
export function getNodesByTag(db: Database.Database, tag: string): NodeRow[] {
  const stmt = db.prepare(`
    SELECT DISTINCT n.* FROM nodes n
    LEFT JOIN tags t ON n.id = t.node_id
    LEFT JOIN lessons l ON n.id = l.node_id
    LEFT JOIN lesson_tags lt ON l.id = lt.lesson_id
    WHERE t.tag = ? OR lt.tag = ?
    ORDER BY n.timestamp DESC
  `);
  return stmt.all(tag, tag) as NodeRow[];
}

/**
 * Find nodes by topic
 */
export function getNodesByTopic(
  db: Database.Database,
  topic: string
): NodeRow[] {
  const stmt = db.prepare(`
    SELECT n.* FROM nodes n
    JOIN topics t ON n.id = t.node_id
    WHERE t.topic = ?
    ORDER BY n.timestamp DESC
  `);
  return stmt.all(topic) as NodeRow[];
}

// =============================================================================
// Query Layer: List Nodes with Filters
// =============================================================================

/** Valid sort fields for listNodes */
export type NodeSortField =
  | "timestamp"
  | "analyzed_at"
  | "project"
  | "type"
  | "outcome"
  | "tokens_used"
  | "cost"
  | "duration_minutes";

/** Sort order */
export type SortOrder = "asc" | "desc";

/** Node type filter values */
export type NodeTypeFilter =
  | "coding"
  | "sysadmin"
  | "research"
  | "planning"
  | "debugging"
  | "qa"
  | "brainstorm"
  | "handoff"
  | "refactor"
  | "documentation"
  | "configuration"
  | "other";

/** Outcome filter values */
export type OutcomeFilter = "success" | "partial" | "failed" | "abandoned";

/** Filters for querying nodes */
export interface ListNodesFilters {
  /** Filter by project path (partial match via LIKE %project%) */
  project?: string;
  /** Filter by project path (exact match) */
  exactProject?: string;
  /** Filter by exact node type */
  type?: NodeTypeFilter;
  /** Filter by exact outcome */
  outcome?: OutcomeFilter;
  /** Filter by start date (ISO 8601, inclusive) */
  from?: string;
  /** Filter by end date (ISO 8601, inclusive) */
  to?: string;
  /** Filter by source computer */
  computer?: string;
  /** Filter by whether goal was clear (vague prompting detection) */
  hadClearGoal?: boolean;
  /** Filter by new project flag */
  isNewProject?: boolean;
  /** Filter by tags (nodes must have ALL specified tags - AND logic) */
  tags?: string[];
  /** Filter by topics (nodes must have ALL specified topics - AND logic) */
  topics?: string[];
  /** Filter by session file path */
  sessionFile?: string;
}

/** Pagination and sorting options */
export interface ListNodesOptions {
  /** Max results to return (default: 50, max: 500) */
  limit?: number;
  /** Offset for pagination (default: 0) */
  offset?: number;
  /** Sort field (default: "timestamp") */
  sort?: NodeSortField;
  /** Sort order (default: "desc") */
  order?: SortOrder;
}

/** Result from listNodes query */
export interface ListNodesResult {
  /** Matched nodes */
  nodes: NodeRow[];
  /** Total count of nodes matching filters (before pagination) */
  total: number;
  /** Limit used for the query */
  limit: number;
  /** Offset used for the query */
  offset: number;
}

/** Allowed sort fields (validated against SQL injection) */
const ALLOWED_SORT_FIELDS = new Set<NodeSortField>([
  "timestamp",
  "analyzed_at",
  "project",
  "type",
  "outcome",
  "tokens_used",
  "cost",
  "duration_minutes",
]);

/**
 * List nodes with filters, pagination, and sorting.
 *
 * Supports filtering by:
 * - project (partial match via LIKE)
 * - type (exact match)
 * - outcome (exact match)
 * - date range (from/to on timestamp field)
 * - computer (exact match)
 * - hadClearGoal (boolean)
 * - isNewProject (boolean)
 * - tags (AND logic - nodes must have ALL specified tags)
 * - topics (AND logic - nodes must have ALL specified topics)
 *
 * Per specs/api.md GET /api/v1/nodes endpoint.
 */
export function listNodes(
  db: Database.Database,
  filters: ListNodesFilters = {},
  options: ListNodesOptions = {}
): ListNodesResult {
  // Apply defaults and constraints
  // Cap at 100,000 to allow for large internal queries (like session aggregation)
  // while still preventing OOM. API routes should enforce tighter limits.
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 100_000);
  const offset = Math.max(options.offset ?? 0, 0);
  const sort: NodeSortField = ALLOWED_SORT_FIELDS.has(
    options.sort as NodeSortField
  )
    ? (options.sort as NodeSortField)
    : "timestamp";
  const order: SortOrder = options.order === "asc" ? "asc" : "desc";

  // Build WHERE clause dynamically
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (filters.project !== undefined) {
    conditions.push("n.project LIKE ?");
    params.push(`%${filters.project}%`);
  }

  if (filters.exactProject !== undefined) {
    conditions.push("n.project = ?");
    params.push(filters.exactProject);
  }

  if (filters.type !== undefined) {
    conditions.push("n.type = ?");
    params.push(filters.type);
  }

  if (filters.outcome !== undefined) {
    conditions.push("n.outcome = ?");
    params.push(filters.outcome);
  }

  if (filters.from !== undefined) {
    conditions.push("n.timestamp >= ?");
    params.push(filters.from);
  }

  if (filters.to !== undefined) {
    conditions.push("n.timestamp <= ?");
    params.push(filters.to);
  }

  if (filters.computer !== undefined) {
    conditions.push("n.computer = ?");
    params.push(filters.computer);
  }

  if (filters.hadClearGoal !== undefined) {
    conditions.push("n.had_clear_goal = ?");
    params.push(filters.hadClearGoal ? 1 : 0);
  }

  if (filters.isNewProject !== undefined) {
    conditions.push("n.is_new_project = ?");
    params.push(filters.isNewProject ? 1 : 0);
  }

  if (filters.sessionFile !== undefined) {
    conditions.push("n.session_file = ?");
    params.push(filters.sessionFile);
  }

  // Tags filter: nodes must have ALL specified tags (AND logic)
  // Considers both node-level tags and lesson-level tags
  if (filters.tags !== undefined && filters.tags.length > 0) {
    const tagPlaceholders = filters.tags.map(() => "?").join(", ");
    conditions.push(`n.id IN (
      SELECT node_id FROM (
        SELECT node_id, tag FROM tags
        UNION
        SELECT l.node_id, lt.tag FROM lesson_tags lt JOIN lessons l ON lt.lesson_id = l.id
      )
      WHERE tag IN (${tagPlaceholders})
      GROUP BY node_id
      HAVING COUNT(DISTINCT tag) = ?
    )`);
    params.push(...filters.tags, filters.tags.length);
  }

  // Topics filter: nodes must have ALL specified topics (AND logic)
  if (filters.topics !== undefined && filters.topics.length > 0) {
    const topicPlaceholders = filters.topics.map(() => "?").join(", ");
    conditions.push(`(
      SELECT COUNT(DISTINCT tp.topic) FROM topics tp
      WHERE tp.node_id = n.id AND tp.topic IN (${topicPlaceholders})
    ) = ?`);
    params.push(...filters.topics, filters.topics.length);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Count query for total (before pagination)
  const countStmt = db.prepare(
    `SELECT COUNT(*) as count FROM nodes n ${whereClause}`
  );
  const countResult = countStmt.get(...params) as { count: number };
  const total = countResult.count;

  // Main query with pagination and sorting
  // Sort field is validated against ALLOWED_SORT_FIELDS so safe for template literal
  const dataStmt = db.prepare(`
    SELECT n.* FROM nodes n
    ${whereClause}
    ORDER BY n.${sort} ${order.toUpperCase()}
    LIMIT ? OFFSET ?
  `);

  const nodes = dataStmt.all(...params, limit, offset) as NodeRow[];

  return {
    nodes,
    total,
    limit,
    offset,
  };
}

/**
 * Session summary row from aggregation query
 */
export interface SessionSummaryRow {
  sessionFile: string;
  nodeCount: number;
  firstTimestamp: string;
  lastTimestamp: string;
  totalTokens: number;
  totalCost: number;
  types: string | null; // comma separated
  successCount: number;
  partialCount: number;
  failedCount: number;
  abandonedCount: number;
}

/**
 * Get aggregated session summaries for a project.
 * Used for the session browser to avoid loading thousands of nodes.
 */
export function getSessionSummaries(
  db: Database.Database,
  project: string,
  options: { limit?: number; offset?: number } = {}
): SessionSummaryRow[] {
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 500);
  const offset = Math.max(options.offset ?? 0, 0);

  const stmt = db.prepare(`
    SELECT
      session_file as sessionFile,
      COUNT(*) as nodeCount,
      MIN(timestamp) as firstTimestamp,
      MAX(timestamp) as lastTimestamp,
      SUM(tokens_used) as totalTokens,
      SUM(cost) as totalCost,
      GROUP_CONCAT(DISTINCT type) as types,
      SUM(CASE WHEN outcome = 'success' THEN 1 ELSE 0 END) as successCount,
      SUM(CASE WHEN outcome = 'partial' THEN 1 ELSE 0 END) as partialCount,
      SUM(CASE WHEN outcome = 'failed' THEN 1 ELSE 0 END) as failedCount,
      SUM(CASE WHEN outcome = 'abandoned' THEN 1 ELSE 0 END) as abandonedCount
    FROM nodes
    WHERE project = ?
    GROUP BY session_file
    ORDER BY lastTimestamp DESC
    LIMIT ? OFFSET ?
  `);

  return stmt.all(project, limit, offset) as SessionSummaryRow[];
}

/**
 * Get all unique projects in the system
 */
export function getAllProjects(db: Database.Database): string[] {
  const stmt = db.prepare(`
    SELECT DISTINCT project FROM nodes
    WHERE project IS NOT NULL
    ORDER BY project
  `);
  const rows = stmt.all() as { project: string }[];
  return rows.map((r) => r.project);
}

/**
 * Get all unique node types that have been used
 */
export function getAllNodeTypes(db: Database.Database): string[] {
  const stmt = db.prepare(`
    SELECT DISTINCT type FROM nodes
    WHERE type IS NOT NULL
    ORDER BY type
  `);
  const rows = stmt.all() as { type: string }[];
  return rows.map((r) => r.type);
}

/**
 * Get all unique computers (source machines)
 */
export function getAllComputers(db: Database.Database): string[] {
  const stmt = db.prepare(`
    SELECT DISTINCT computer FROM nodes
    WHERE computer IS NOT NULL
    ORDER BY computer
  `);
  const rows = stmt.all() as { computer: string }[];
  return rows.map((r) => r.computer);
}

/**
 * Count nodes matching filters (without fetching data)
 */
export function countNodes(
  db: Database.Database,
  filters: ListNodesFilters = {}
): number {
  const result = listNodes(db, filters, { limit: 1 });
  return result.total;
}

// =============================================================================
// Graph Traversal
// =============================================================================

/** Direction for graph traversal */
export type TraversalDirection = "incoming" | "outgoing" | "both";

/** Options for getConnectedNodes */
export interface ConnectedNodesOptions {
  /**
   * Traversal depth - how many edge hops to follow
   * (default: 1, max: 5)
   */
  depth?: number;
  /**
   * Which edge directions to follow
   * (default: "both")
   */
  direction?: TraversalDirection;
  /**
   * Filter by specific edge types only
   * (default: all edge types)
   */
  edgeTypes?: EdgeType[];
}

/** An edge with direction information for traversal results */
export interface TraversalEdge {
  /** Unique edge ID */
  id: string;
  /** Source node ID */
  sourceNodeId: string;
  /** Target node ID */
  targetNodeId: string;
  /** Edge type (fork, branch, semantic, etc.) */
  type: EdgeType;
  /** Edge metadata */
  metadata: EdgeMetadata;
  /** Relationship to the root node: outgoing = root→node, incoming = node→root */
  direction: "incoming" | "outgoing";
  /** How many hops from the root node */
  hopDistance: number;
}

/** Result from getConnectedNodes */
export interface ConnectedNodesResult {
  /** The root node ID that was queried */
  rootNodeId: string;
  /** All connected nodes (not including the root node) */
  nodes: NodeRow[];
  /** All edges in the traversed subgraph */
  edges: TraversalEdge[];
}

/**
 * Get all nodes connected to a specific node with graph traversal.
 *
 * Supports:
 * - Multi-hop traversal (depth 1-5)
 * - Direction filtering (incoming, outgoing, both)
 * - Edge type filtering
 *
 * Based on specs/storage.md graph traversal query and specs/api.md
 * GET /api/v1/nodes/:id/connected endpoint.
 *
 * @example
 * // Get directly connected nodes (1 hop, both directions)
 * const result = getConnectedNodes(db, "abc123");
 *
 * @example
 * // Get nodes up to 3 hops away, only following outgoing edges
 * const result = getConnectedNodes(db, "abc123", {
 *   depth: 3,
 *   direction: "outgoing"
 * });
 *
 * @example
 * // Get only fork and branch edges, 2 hops
 * const result = getConnectedNodes(db, "abc123", {
 *   depth: 2,
 *   edgeTypes: ["fork", "branch"]
 * });
 */
export function getConnectedNodes(
  db: Database.Database,
  nodeId: string,
  options: ConnectedNodesOptions = {}
): ConnectedNodesResult {
  // Apply defaults and constraints
  const depth = Math.min(Math.max(options.depth ?? 1, 1), 5);
  const direction = options.direction ?? "both";
  const { edgeTypes } = options;

  // Track visited nodes and edges to avoid duplicates in multi-hop traversal
  const visitedNodeIds = new Set<string>([nodeId]); // Root already "visited"
  const traversalEdges: TraversalEdge[] = [];

  // BFS frontier: nodes to explore at each depth level
  let currentFrontier = new Set<string>([nodeId]);

  // Traverse up to requested depth
  for (let currentHop = 1; currentHop <= depth; currentHop++) {
    if (currentFrontier.size === 0) {
      break; // No more nodes to explore
    }

    const nextFrontier = new Set<string>();

    // Process each node in the current frontier
    for (const currentNodeId of currentFrontier) {
      // Get edges based on direction
      const edgesToProcess: {
        edge: EdgeRow;
        edgeDirection: "incoming" | "outgoing";
      }[] = [];

      if (direction === "outgoing" || direction === "both") {
        const outgoing = getEdgesFrom(db, currentNodeId);
        for (const edge of outgoing) {
          edgesToProcess.push({ edge, edgeDirection: "outgoing" });
        }
      }

      if (direction === "incoming" || direction === "both") {
        const incoming = getEdgesTo(db, currentNodeId);
        for (const edge of incoming) {
          edgesToProcess.push({ edge, edgeDirection: "incoming" });
        }
      }

      // Process each edge
      for (const { edge, edgeDirection } of edgesToProcess) {
        // Apply edge type filter if specified
        if (edgeTypes && !edgeTypes.includes(edge.type as EdgeType)) {
          continue;
        }

        // Determine the "other" node in this edge
        const otherNodeId =
          edgeDirection === "outgoing"
            ? edge.target_node_id
            : edge.source_node_id;

        // Add the edge to results if we haven't seen it yet
        // Note: multiple edges might exist between the same nodes
        if (!traversalEdges.some((te) => te.id === edge.id)) {
          traversalEdges.push({
            id: edge.id,
            sourceNodeId: edge.source_node_id,
            targetNodeId: edge.target_node_id,
            type: edge.type as EdgeType,
            metadata: edge.metadata ? JSON.parse(edge.metadata) : {},
            direction: edgeDirection,
            hopDistance: currentHop,
          });
        }

        // Add to next frontier if we haven't visited this node yet
        if (!visitedNodeIds.has(otherNodeId)) {
          visitedNodeIds.add(otherNodeId);
          nextFrontier.add(otherNodeId);
        }
      }
    }

    currentFrontier = nextFrontier;
  }

  // Collect all connected node IDs (excluding root)
  const connectedNodeIds = [...visitedNodeIds].filter((id) => id !== nodeId);

  // Fetch node data for all connected nodes
  let nodes: NodeRow[] = [];
  if (connectedNodeIds.length > 0) {
    const placeholders = connectedNodeIds.map(() => "?").join(", ");
    const stmt = db.prepare(`
      SELECT * FROM nodes
      WHERE id IN (${placeholders})
      ORDER BY timestamp DESC
    `);
    nodes = stmt.all(...connectedNodeIds) as NodeRow[];
  }

  return {
    rootNodeId: nodeId,
    nodes,
    edges: traversalEdges,
  };
}

/**
 * Get the subgraph for visualization - returns nodes and edges
 * within a given depth from multiple root nodes.
 *
 * Unlike getConnectedNodes, this INCLUDES the root nodes in the result,
 * which is useful for rendering a graph view starting from selected nodes.
 */
export function getSubgraph(
  db: Database.Database,
  rootNodeIds: string[],
  options: ConnectedNodesOptions = {}
): ConnectedNodesResult {
  if (rootNodeIds.length === 0) {
    return { rootNodeId: "", nodes: [], edges: [] };
  }

  // Combine results from all roots and deduplicate
  // Note: We always include root nodes in the result (unlike getConnectedNodes)
  const allNodeIds = new Set<string>(rootNodeIds);
  const allEdges = new Map<string, TraversalEdge>();

  for (const rootId of rootNodeIds) {
    const result = getConnectedNodes(db, rootId, options);

    for (const node of result.nodes) {
      allNodeIds.add(node.id);
    }

    for (const edge of result.edges) {
      // Use edge ID as key to deduplicate
      if (!allEdges.has(edge.id)) {
        allEdges.set(edge.id, edge);
      }
    }
  }

  // Fetch all nodes (including roots)
  const nodeIdsArray = [...allNodeIds];
  let nodes: NodeRow[] = [];
  if (nodeIdsArray.length > 0) {
    const placeholders = nodeIdsArray.map(() => "?").join(", ");
    const stmt = db.prepare(`
      SELECT * FROM nodes
      WHERE id IN (${placeholders})
      ORDER BY timestamp DESC
    `);
    nodes = stmt.all(...nodeIdsArray) as NodeRow[];
  }

  return {
    rootNodeId: rootNodeIds[0], // Use first root as "primary"
    nodes,
    edges: [...allEdges.values()],
  };
}

/**
 * Get the path between two nodes if one exists.
 * Uses BFS to find the shortest path.
 *
 * Returns null if no path exists.
 */
export function findPath(
  db: Database.Database,
  fromNodeId: string,
  toNodeId: string,
  options: { maxDepth?: number } = {}
): { nodeIds: string[]; edges: EdgeRow[] } | null {
  const maxDepth = Math.min(Math.max(options.maxDepth ?? 10, 1), 20);

  // BFS to find shortest path
  // Each entry: [currentNodeId, pathToHere, edgesToHere]
  const queue: [string, string[], EdgeRow[]][] = [
    [fromNodeId, [fromNodeId], []],
  ];
  const visited = new Set<string>([fromNodeId]);

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      break;
    }
    const [currentNodeId, pathSoFar, edgesSoFar] = current;

    // Check if we've reached the target
    if (currentNodeId === toNodeId) {
      return { nodeIds: pathSoFar, edges: edgesSoFar };
    }

    // Don't explore beyond max depth
    if (pathSoFar.length > maxDepth) {
      continue;
    }

    // Get all edges from current node (both directions)
    const allEdges = getNodeEdges(db, currentNodeId);

    for (const edge of allEdges) {
      const nextNodeId =
        edge.source_node_id === currentNodeId
          ? edge.target_node_id
          : edge.source_node_id;

      if (!visited.has(nextNodeId)) {
        visited.add(nextNodeId);
        queue.push([
          nextNodeId,
          [...pathSoFar, nextNodeId],
          [...edgesSoFar, edge],
        ]);
      }
    }
  }

  // No path found
  return null;
}

/**
 * Get all ancestors of a node (nodes that lead TO this node).
 * Follows incoming edges only.
 */
export function getAncestors(
  db: Database.Database,
  nodeId: string,
  options: { maxDepth?: number; edgeTypes?: EdgeType[] } = {}
): ConnectedNodesResult {
  return getConnectedNodes(db, nodeId, {
    depth: options.maxDepth ?? 5,
    direction: "incoming",
    edgeTypes: options.edgeTypes,
  });
}

/**
 * Get all descendants of a node (nodes that this node leads TO).
 * Follows outgoing edges only.
 */
export function getDescendants(
  db: Database.Database,
  nodeId: string,
  options: { maxDepth?: number; edgeTypes?: EdgeType[] } = {}
): ConnectedNodesResult {
  return getConnectedNodes(db, nodeId, {
    depth: options.maxDepth ?? 5,
    direction: "outgoing",
    edgeTypes: options.edgeTypes,
  });
}

// =============================================================================
// ID Generation
// =============================================================================

function generateLessonId(): string {
  return `les_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
}

function generateQuirkId(): string {
  return `qrk_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
}

function generateErrorId(): string {
  return `err_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
}

function generateDecisionId(): string {
  return `dec_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
}

function generateEdgeId(): string {
  return `edg_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
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
  };
}

// =============================================================================
// AgentNodeOutput to Node Conversion
// =============================================================================

/** Context needed to convert AgentNodeOutput to a full Node */
export interface NodeConversionContext {
  /** The analysis job that produced this output */
  job: AnalysisJob;
  /** Computer hostname */
  computer: string;
  /** Session ID from header */
  sessionId: string;
  /** Parent session path (if forked) */
  parentSession?: string;
  /** Number of entries in the segment */
  entryCount: number;
  /** Analysis duration in milliseconds */
  analysisDurationMs: number;
  /** Prompt version used for analysis */
  analyzerVersion: string;
  /** Existing node (if reanalyzing) */
  existingNode?: Node;
}

/**
 * Convert AgentNodeOutput from the analyzer to a full Node structure
 * Fills in source, metadata, and identity fields from the job context
 */
export function agentOutputToNode(
  output: AgentNodeOutput,
  context: NodeConversionContext
): Node {
  const now = new Date().toISOString();

  // Calculate duration from segment timestamps if available
  // For now, use a placeholder - real duration calculation requires parsing session
  const durationMinutes = Math.round(context.analysisDurationMs / 60_000);

  // Calculate total tokens from modelsUsed
  const tokensUsed = output.observations.modelsUsed.reduce(
    (sum, m) => sum + m.tokensInput + m.tokensOutput,
    0
  );

  // Calculate total cost from modelsUsed
  const cost = output.observations.modelsUsed.reduce(
    (sum, m) => sum + m.cost,
    0
  );

  // Identity and versioning
  const id = context.existingNode?.id ?? generateNodeId();
  const version = (context.existingNode?.version ?? 0) + 1;
  const previousVersions = context.existingNode
    ? [
        ...context.existingNode.previousVersions,
        `${context.existingNode.id}-v${context.existingNode.version}`,
      ]
    : [];

  return {
    id,
    version,
    previousVersions,

    source: {
      sessionFile: context.job.sessionFile,
      segment: {
        startEntryId: context.job.segmentStart ?? "",
        endEntryId: context.job.segmentEnd ?? "",
        entryCount: context.entryCount,
      },
      computer: context.computer,
      sessionId: context.sessionId,
      parentSession: context.parentSession,
    },

    classification: {
      type: output.classification.type as Node["classification"]["type"],
      project: output.classification.project,
      isNewProject: output.classification.isNewProject,
      hadClearGoal: output.classification.hadClearGoal,
      language: output.classification.language,
      frameworks: output.classification.frameworks,
    },

    content: {
      summary: output.content.summary,
      outcome: output.content.outcome,
      keyDecisions: output.content.keyDecisions.map((d) => ({
        what: d.what,
        why: d.why,
        alternativesConsidered: d.alternativesConsidered,
      })),
      filesTouched: output.content.filesTouched,
      toolsUsed: output.content.toolsUsed,
      errorsSeen: output.content.errorsSeen.map((e) => ({
        type: e.type,
        message: e.message,
        resolved: e.resolved,
      })),
    },

    lessons: {
      project: output.lessons.project.map((l) => ({
        level: l.level as LessonsByLevel["project"][0]["level"],
        summary: l.summary,
        details: l.details,
        confidence: l.confidence,
        tags: l.tags,
        actionable: l.actionable,
      })),
      task: output.lessons.task.map((l) => ({
        level: l.level as LessonsByLevel["task"][0]["level"],
        summary: l.summary,
        details: l.details,
        confidence: l.confidence,
        tags: l.tags,
        actionable: l.actionable,
      })),
      user: output.lessons.user.map((l) => ({
        level: l.level as LessonsByLevel["user"][0]["level"],
        summary: l.summary,
        details: l.details,
        confidence: l.confidence,
        tags: l.tags,
        actionable: l.actionable,
      })),
      model: output.lessons.model.map((l) => ({
        level: l.level as LessonsByLevel["model"][0]["level"],
        summary: l.summary,
        details: l.details,
        confidence: l.confidence,
        tags: l.tags,
        actionable: l.actionable,
      })),
      tool: output.lessons.tool.map((l) => ({
        level: l.level as LessonsByLevel["tool"][0]["level"],
        summary: l.summary,
        details: l.details,
        confidence: l.confidence,
        tags: l.tags,
        actionable: l.actionable,
      })),
      skill: output.lessons.skill.map((l) => ({
        level: l.level as LessonsByLevel["skill"][0]["level"],
        summary: l.summary,
        details: l.details,
        confidence: l.confidence,
        tags: l.tags,
        actionable: l.actionable,
      })),
      subagent: output.lessons.subagent.map((l) => ({
        level: l.level as LessonsByLevel["subagent"][0]["level"],
        summary: l.summary,
        details: l.details,
        confidence: l.confidence,
        tags: l.tags,
        actionable: l.actionable,
      })),
    },

    observations: {
      modelsUsed: output.observations.modelsUsed.map((m) => ({
        provider: m.provider,
        model: m.model,
        tokensInput: m.tokensInput,
        tokensOutput: m.tokensOutput,
        cacheRead: m.cacheRead,
        cacheWrite: m.cacheWrite,
        cost: m.cost,
      })),
      promptingWins: output.observations.promptingWins,
      promptingFailures: output.observations.promptingFailures,
      modelQuirks: output.observations.modelQuirks.map((q) => ({
        model: q.model,
        observation: q.observation,
        frequency: q.frequency,
        workaround: q.workaround,
        severity: q.severity,
      })),
      toolUseErrors: output.observations.toolUseErrors.map((e) => ({
        tool: e.tool,
        errorType: e.errorType,
        context: e.context,
        model: e.model,
        wasRetried: e.wasRetried,
      })),
    },

    metadata: {
      tokensUsed,
      cost,
      durationMinutes,
      timestamp: context.job.queuedAt,
      analyzedAt: now,
      analyzerVersion: context.analyzerVersion,
    },

    semantic: {
      tags: output.semantic.tags,
      topics: output.semantic.topics,
      relatedProjects: output.semantic.relatedProjects,
      concepts: output.semantic.concepts,
    },

    daemonMeta: {
      decisions: output.daemonMeta.decisions.map((d) => ({
        timestamp: d.timestamp,
        decision: d.decision,
        reasoning: d.reasoning,
        needsReview: d.needsReview,
      })),
      rlmUsed: output.daemonMeta.rlmUsed,
      codemapAvailable: output.daemonMeta.codemapAvailable,
      analysisLog: output.daemonMeta.analysisLog,
      segmentTokenCount: output.daemonMeta.segmentTokenCount,
    },
  };
}

// Re-export generateNodeId for convenience
export { generateNodeId };
