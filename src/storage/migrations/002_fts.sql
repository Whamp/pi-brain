-- Migration 002: Full-text search
-- Adds FTS5 virtual table for text search on node content

-- FTS5 for full-text search on node content (contentless - managed by application)
CREATE VIRTUAL TABLE IF NOT EXISTS nodes_fts USING fts5(
    node_id,
    summary,
    decisions,
    lessons,
    tags,
    content='',
    content_rowid='rowid',
    tokenize='porter unicode61'
);
