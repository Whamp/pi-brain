-- Migration 004: Update FTS schema
-- Recreates nodes_fts with topics column

DROP TABLE IF EXISTS nodes_fts;

CREATE VIRTUAL TABLE nodes_fts USING fts5(
    node_id,
    summary,
    decisions,
    lessons,
    tags,
    topics,
    tokenize='porter unicode61'
);
