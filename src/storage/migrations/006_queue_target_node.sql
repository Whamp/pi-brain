-- Migration 006: Queue Target Node Denormalization
-- Adds denormalized column for faster lookups in scheduler queries
-- Avoids expensive json_extract() on every row during reanalysis checks

ALTER TABLE analysis_queue ADD COLUMN target_node_id TEXT;

-- Backfill existing rows from context JSON
UPDATE analysis_queue 
SET target_node_id = json_extract(context, '$.existingNodeId')
WHERE type = 'reanalysis' AND target_node_id IS NULL;

-- Also backfill connection discovery node IDs
UPDATE analysis_queue 
SET target_node_id = json_extract(context, '$.nodeId')
WHERE type = 'connection_discovery' AND target_node_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_queue_target_node ON analysis_queue(target_node_id);
