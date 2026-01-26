-- Migration 002: Full-text search
-- Adds FTS5 virtual table for text search on node content

-- FTS5 for full-text search on node content
-- Note: We store content in FTS table to enable joins on node_id
CREATE VIRTUAL TABLE IF NOT EXISTS nodes_fts USING fts5(
    node_id,
    summary,
    decisions,
    lessons,
    tags,
    tokenize='porter unicode61'
);
