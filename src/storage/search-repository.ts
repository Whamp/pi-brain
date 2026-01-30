/**
 * Search Repository - Full-Text Search operations for nodes
 *
 * Provides FTS5-based search functionality for the knowledge graph.
 *
 * Based on specs/storage.md and specs/node-model.md.
 */

import type Database from "better-sqlite3";

import type { Node } from "./node-types.js";
import type { NodeRow } from "./types.js";

import { buildWhereClause, type BaseFilters } from "./filter-utils.js";

// =============================================================================
// Types
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

/** Filters for search queries (subset of node filters relevant to search) */
export type SearchFilters = BaseFilters;

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
  filters?: SearchFilters;
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

// =============================================================================
// Index Operations
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

// =============================================================================
// Helper Functions
// =============================================================================

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

const escapeRegExp = (str: string) =>
  str.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

// =============================================================================
// Snippet Extraction Helpers
// =============================================================================

/**
 * Find the first match position in text for any query word
 * @internal
 */
function findFirstMatchIndex(lowerText: string, queryWords: string[]): number {
  let matchIndex = -1;
  for (const word of queryWords) {
    const idx = lowerText.indexOf(word);
    if (idx !== -1 && (matchIndex === -1 || idx < matchIndex)) {
      matchIndex = idx;
    }
  }
  return matchIndex;
}

/**
 * Calculate snippet window boundaries, avoiding word breaks
 * @internal
 */
function calculateSnippetBounds(
  text: string,
  matchIndex: number,
  maxLength: number
): { start: number; end: number } {
  const halfWindow = Math.floor(maxLength / 2);
  let start = Math.max(0, matchIndex - halfWindow);
  let end = Math.min(text.length, matchIndex + halfWindow);

  // Adjust start to avoid cutting words
  if (start > 0) {
    const nextSpace = text.indexOf(" ", start);
    if (nextSpace !== -1 && nextSpace < matchIndex) {
      start = nextSpace + 1;
    }
  }

  // Adjust end to avoid cutting words
  if (end < text.length) {
    const prevSpace = text.lastIndexOf(" ", end);
    if (prevSpace > matchIndex) {
      end = prevSpace;
    }
  }

  return { start, end };
}

/**
 * Apply highlight markers and ellipsis to snippet
 * @internal
 */
function formatSnippet(
  text: string,
  start: number,
  end: number,
  queryWords: string[]
): string {
  const pattern = new RegExp(
    `(${queryWords.map(escapeRegExp).join("|")})`,
    "gi"
  );

  let snippet = text.slice(start, end);
  snippet = snippet.replace(pattern, "<mark>$1</mark>");

  if (start > 0) {
    snippet = `...${snippet}`;
  }
  if (end < text.length) {
    snippet = `${snippet}...`;
  }

  return snippet;
}

/**
 * Extract a highlight snippet from text containing a match
 * @internal
 */
export function extractSnippet(
  text: string,
  query: string,
  maxLength = 100
): string {
  if (!text) {
    return "";
  }

  const lowerText = text.toLowerCase();
  const queryWords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 0);

  const matchIndex = findFirstMatchIndex(lowerText, queryWords);

  // No match found - return start of text
  if (matchIndex === -1) {
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
  }

  const { start, end } = calculateSnippetBounds(text, matchIndex, maxLength);
  return formatSnippet(text, start, end, queryWords);
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

// =============================================================================
// Enhanced Search
// =============================================================================

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
  const { clause: filterClause, params } = buildWhereClause(filters, "n");

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
