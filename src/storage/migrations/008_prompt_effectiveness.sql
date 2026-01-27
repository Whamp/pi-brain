-- Migration 008: Prompt Effectiveness Tracking
-- Measures whether prompt additions actually improve behavior (specs/prompt-learning.md)

CREATE TABLE IF NOT EXISTS prompt_effectiveness (
    id TEXT PRIMARY KEY,
    insight_id TEXT NOT NULL,
    prompt_version TEXT NOT NULL,

    -- Before metrics (period before prompt was added)
    before_occurrences INTEGER DEFAULT 0,     -- How often the issue occurred
    before_severity REAL DEFAULT 0.0,         -- Average severity (0.0-1.0)

    -- After metrics (period after prompt was added)
    after_occurrences INTEGER DEFAULT 0,      -- How often the issue occurred
    after_severity REAL DEFAULT 0.0,          -- Average severity

    -- Analysis period (ISO 8601 timestamps)
    before_start TEXT,                        -- Start of before period
    before_end TEXT,                          -- End of before period
    after_start TEXT,                         -- Start of after period
    after_end TEXT,                           -- End of after period

    -- Improvement metrics
    improvement_pct REAL,                     -- Positive = better (fewer occurrences)
    statistically_significant INTEGER DEFAULT 0, -- Boolean: enough data for confidence

    -- Metadata
    sessions_before INTEGER DEFAULT 0,        -- Number of sessions in before period
    sessions_after INTEGER DEFAULT 0,         -- Number of sessions in after period
    measured_at TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    FOREIGN KEY (insight_id) REFERENCES aggregated_insights(id) ON DELETE CASCADE
);

-- Index for looking up effectiveness by insight
CREATE INDEX IF NOT EXISTS idx_effectiveness_insight ON prompt_effectiveness(insight_id);

-- Index for finding recent measurements
CREATE INDEX IF NOT EXISTS idx_effectiveness_measured_at ON prompt_effectiveness(measured_at DESC);

-- Index for finding statistically significant results
CREATE INDEX IF NOT EXISTS idx_effectiveness_significant ON prompt_effectiveness(statistically_significant);

-- Index for filtering by improvement
CREATE INDEX IF NOT EXISTS idx_effectiveness_improvement ON prompt_effectiveness(improvement_pct DESC);
