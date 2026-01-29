-- Migration 015: Add clarifying questions count columns
-- Tracks agent clarifying questions per node for engagement metrics
-- Distinguishes between organic questions (agent-initiated) vs prompted questions
-- (explicitly requested by user, tools, skills, extensions)

-- Add clarifying question count columns to nodes table
ALTER TABLE nodes ADD COLUMN clarifying_question_count INTEGER DEFAULT NULL;
ALTER TABLE nodes ADD COLUMN prompted_question_count INTEGER DEFAULT NULL;

-- Index for efficient aggregation queries
CREATE INDEX IF NOT EXISTS idx_nodes_clarifying_questions 
  ON nodes(clarifying_question_count, prompted_question_count);
