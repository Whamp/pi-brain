-- Migration 003: Add worker locking columns to analysis_queue
-- Required for optimistic locking in job dequeue

-- Add worker_id to track which worker is processing a job
ALTER TABLE analysis_queue ADD COLUMN worker_id TEXT;

-- Add locked_until for lock expiration (enables stale lock recovery)
ALTER TABLE analysis_queue ADD COLUMN locked_until TEXT;

-- Index for efficient stale lock detection
CREATE INDEX IF NOT EXISTS idx_analysis_queue_locked_until ON analysis_queue(locked_until);
