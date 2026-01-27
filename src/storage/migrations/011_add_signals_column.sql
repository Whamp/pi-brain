-- Migration 011: Add signals column to nodes table
-- Stores friction/delight signals as JSON for efficient querying
-- Supports queries like: SELECT COUNT(*) FROM nodes WHERE json_extract(signals, '$.friction.abandonedRestart') = 1

-- Add signals column (TEXT to store JSON)
ALTER TABLE nodes ADD COLUMN signals TEXT;

-- Create index for abandoned restart queries
CREATE INDEX IF NOT EXISTS idx_nodes_abandoned_restart ON nodes (
    json_extract(signals, '$.friction.abandonedRestart')
) WHERE signals IS NOT NULL;

-- Create index for friction score queries
CREATE INDEX IF NOT EXISTS idx_nodes_friction_score ON nodes (
    json_extract(signals, '$.friction.score')
) WHERE signals IS NOT NULL;

-- Create index for delight score queries
CREATE INDEX IF NOT EXISTS idx_nodes_delight_score ON nodes (
    json_extract(signals, '$.delight.score')
) WHERE signals IS NOT NULL;
