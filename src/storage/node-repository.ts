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
 * Returns the updated node.
 */
export function updateNode(
  db: Database.Database,
  node: Node,
  options: RepositoryOptions = {}
): Node {
  return db.transaction(() => {
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
 * Get a node by ID (returns the latest version)
 */
export function getNode(db: Database.Database, nodeId: string): NodeRow | null {
  const stmt = db.prepare(`
    SELECT * FROM nodes
    WHERE id = ?
    ORDER BY version DESC
    LIMIT 1
  `);
  return (stmt.get(nodeId) as NodeRow) ?? null;
}

/**
 * Get a specific version of a node
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

  const tags = node.semantic.tags.join(" ");

  // Delete existing entry (for updates)
  db.prepare("DELETE FROM nodes_fts WHERE node_id = ?").run(node.id);

  // Insert new entry
  db.prepare(`
    INSERT INTO nodes_fts (node_id, summary, decisions, lessons, tags)
    VALUES (?, ?, ?, ?, ?)
  `).run(node.id, node.content.summary, decisions, lessons, tags);
}

/**
 * Search nodes using full-text search
 */
export function searchNodes(
  db: Database.Database,
  query: string,
  limit = 20
): NodeRow[] {
  const stmt = db.prepare(`
    SELECT n.*, rank
    FROM nodes n
    JOIN nodes_fts f ON n.id = f.node_id
    WHERE nodes_fts MATCH ?
    ORDER BY rank
    LIMIT ?
  `);
  return stmt.all(query, limit) as NodeRow[];
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
