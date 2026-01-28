-- Migration 012: Semantic search with sqlite-vec
-- Creates virtual table for vector similarity search
-- Requires sqlite-vec extension to be loaded

-- Create the vector index virtual table
-- Default dimension 4096 matches qwen/qwen3-embedding-8b (default embedding model)
-- 
-- NOTE: If you change embedding models with different dimensions,
-- you may need to recreate this table. Use `pi-brain rebuild --embeddings`
-- to regenerate all embeddings with the current model.
--
-- Common dimensions by model:
--   qwen/qwen3-embedding-8b: 4096
--   text-embedding-3-small: 1536
--   text-embedding-3-large: 3072
--   nomic-embed-text: 768
CREATE VIRTUAL TABLE IF NOT EXISTS node_embeddings_vec USING vec0(
    embedding float[4096]
);

-- Populate from existing embeddings (if any)
-- This will fail silently if dimensions don't match (4096 expected)
-- Run `pi-brain rebuild --embeddings` to regenerate if needed
INSERT OR IGNORE INTO node_embeddings_vec (rowid, embedding)
SELECT ne.rowid, ne.embedding 
FROM node_embeddings ne
WHERE NOT EXISTS (
    SELECT 1 FROM node_embeddings_vec nev WHERE nev.rowid = ne.rowid
);
