/**
 * Lesson Repository - Lesson query operations
 *
 * Provides functionality for querying lessons learned from sessions.
 *
 * Based on specs/storage.md.
 */

import type Database from "better-sqlite3";

// =============================================================================
// Types
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

// =============================================================================
// Query Functions
// =============================================================================

/**
 * Build WHERE clause and params from filters
 */
function buildLessonWhereClause(filters: ListLessonsFilters): {
  whereClause: string;
  params: (string | number)[];
} {
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

  return { whereClause: conditions.join(" AND "), params };
}

/**
 * Fetch tags for a list of lesson IDs and return as a map
 */
function fetchLessonTagsMap(
  db: Database.Database,
  lessonIds: string[]
): Map<string, string[]> {
  const lessonMap = new Map<string, string[]>();
  if (lessonIds.length === 0) {
    return lessonMap;
  }

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

  return lessonMap;
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

  const { whereClause, params } = buildLessonWhereClause(filters);

  // Count total
  const countStmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM lessons l
    JOIN nodes n ON l.node_id = n.id
    WHERE ${whereClause}
  `);
  const total = (countStmt.get(...params) as { count: number }).count;

  // Fetch lessons with project info
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

  // Attach tags to each lesson
  const lessonIds = rows.map((r) => r.id);
  const lessonMap = fetchLessonTagsMap(db, lessonIds);

  const lessons = rows.map((row) => ({
    ...row,
    tags: lessonMap.get(row.id) ?? [],
  }));

  return { lessons, total, limit, offset };
}

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
