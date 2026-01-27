/**
 * Node CRUD Types and Helpers
 *
 * Core types and helper functions for node CRUD operations.
 * The main CRUD functions remain in node-repository.ts until search-repository.ts
 * is extracted (to avoid circular dependency with indexNodeForSearch).
 *
 * Based on specs/storage.md and specs/node-model.md.
 */

import type Database from "better-sqlite3";

import type { NodeStorageOptions } from "./node-storage.js";
import type {
  DaemonDecision,
  LessonsByLevel,
  ModelQuirk,
  ToolError,
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
  signals: string | null;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// ID Generators
// =============================================================================

export function generateLessonId(): string {
  return `les_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
}

export function generateQuirkId(): string {
  return `qrk_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
}

export function generateErrorId(): string {
  return `err_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
}

export function generateDecisionId(): string {
  return `dec_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
}

// =============================================================================
// Helper Insert Functions
// =============================================================================

/**
 * Insert lessons for a node
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
export function insertModelQuirks(
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
export function insertToolErrors(
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
