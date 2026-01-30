/**
 * Storage Types - Shared types for the storage layer
 *
 * This module provides types that need to be shared across the storage layer
 * without creating circular dependencies.
 */

// =============================================================================
// Node Row Types
// =============================================================================

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
