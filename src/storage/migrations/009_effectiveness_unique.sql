-- Migration 009: Add unique constraint to prompt_effectiveness
-- Prevents duplicate measurements when nightly job runs measureEffectiveness() multiple times

CREATE UNIQUE INDEX IF NOT EXISTS idx_effectiveness_unique ON prompt_effectiveness(insight_id, prompt_version);
