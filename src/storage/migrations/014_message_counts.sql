-- Migration 014: Add user/assistant message count columns
-- Tracks message counts per node for engagement metrics

-- Add message count columns to nodes table
ALTER TABLE nodes ADD COLUMN user_message_count INTEGER DEFAULT NULL;
ALTER TABLE nodes ADD COLUMN assistant_message_count INTEGER DEFAULT NULL;

-- Index for efficient aggregation queries
CREATE INDEX IF NOT EXISTS idx_nodes_message_counts 
  ON nodes(user_message_count, assistant_message_count);
