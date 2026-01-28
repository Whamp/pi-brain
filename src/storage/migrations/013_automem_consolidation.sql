-- Migration 013: AutoMem Consolidation Schema
-- Adds fields for memory consolidation (decay, archival) and typed edges

-- ============================================================================
-- NODES TABLE: Memory consolidation fields
-- ============================================================================

-- relevance_score: 0.0-1.0, measures current importance of this node
-- Higher = more relevant, lower = candidate for archival
-- Default 1.0 for new nodes (max relevance)
ALTER TABLE nodes ADD COLUMN relevance_score REAL DEFAULT 1.0;

-- last_accessed: ISO 8601 timestamp of last query/access
-- Used for decay calculation - frequently accessed nodes decay slower
ALTER TABLE nodes ADD COLUMN last_accessed TEXT;

-- archived: Whether this node is archived (soft-deleted)
-- Archived nodes are excluded from normal queries but kept for history
ALTER TABLE nodes ADD COLUMN archived INTEGER DEFAULT 0;

-- importance: Base importance level for decay resistance (0.0-1.0)
-- User can mark certain nodes as high-importance to prevent archival
ALTER TABLE nodes ADD COLUMN importance REAL DEFAULT 0.5;

-- ============================================================================
-- EDGES TABLE: Enhanced edge metadata for AutoMem relationship types
-- ============================================================================

-- confidence: 0.0-1.0, how confident we are in this edge relationship
-- Used for multi-hop path scoring and bridge discovery
ALTER TABLE edges ADD COLUMN confidence REAL DEFAULT 1.0;

-- similarity: Vector cosine similarity score (0.0-1.0)
-- Populated for semantic edges created via vector search
ALTER TABLE edges ADD COLUMN similarity REAL;

-- ============================================================================
-- INDEXES for efficient queries
-- ============================================================================

-- Index for decay scheduler to find nodes ordered by relevance
CREATE INDEX IF NOT EXISTS idx_nodes_relevance_score ON nodes(relevance_score);

-- Index for archival queries
CREATE INDEX IF NOT EXISTS idx_nodes_archived ON nodes(archived);

-- Index for last accessed queries (decay calculation)
CREATE INDEX IF NOT EXISTS idx_nodes_last_accessed ON nodes(last_accessed);

-- Index for edge confidence filtering in bridge discovery
CREATE INDEX IF NOT EXISTS idx_edges_confidence ON edges(confidence);
