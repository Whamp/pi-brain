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

    // 2. Insert into nodes table
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

    // 3. Insert tags
    const insertTag = db.prepare(
      "INSERT OR IGNORE INTO tags (node_id, tag) VALUES (?, ?)"
    );
    for (const tag of node.semantic.tags) {
      insertTag.run(node.id, tag);
    }

    // 4. Insert topics
    const insertTopic = db.prepare(
      "INSERT OR IGNORE INTO topics (node_id, topic) VALUES (?, ?)"
    );
    for (const topic of node.semantic.topics) {
      insertTopic.run(node.id, topic);
    }

    // 5. Insert lessons from all levels
    insertLessons(db, node.id, node.lessons);

    // 6. Insert model quirks
    insertModelQuirks(db, node.id, node.observations.modelQuirks);

    // 7. Insert tool errors
    insertToolErrors(db, node.id, node.observations.toolUseErrors);

    // 8. Insert daemon decisions
    insertDaemonDecisions(db, node.id, node.daemonMeta.decisions);

    // 9. Update FTS index
    if (!options.skipFts) {
      indexNodeForSearch(db, node);
    }

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
        SELECT node_id FROM tags 
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
// Query Helpers
// =============================================================================

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
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 500);
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

  // Tags filter: nodes must have ALL specified tags (AND logic)
  // Uses a subquery to count matching tags and require count == number of tags
  if (filters.tags !== undefined && filters.tags.length > 0) {
    const tagPlaceholders = filters.tags.map(() => "?").join(", ");
    conditions.push(`(
      SELECT COUNT(DISTINCT t.tag) FROM tags t
      WHERE t.node_id = n.id AND t.tag IN (${tagPlaceholders})
    ) = ?`);
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
