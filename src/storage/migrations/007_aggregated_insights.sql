-- Migration 007: Aggregated Insights
-- Storage for the prompt learning pipeline (specs/prompt-learning.md)

CREATE TABLE IF NOT EXISTS aggregated_insights (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,  -- 'quirk', 'win', 'failure', 'tool_error', 'lesson'
    model TEXT,          -- provider/model format, NULL for non-model-specific
    tool TEXT,           -- tool name, NULL for non-tool-specific
    pattern TEXT NOT NULL,
    frequency INTEGER DEFAULT 1,
    confidence REAL DEFAULT 0.5,
    severity TEXT DEFAULT 'low',  -- 'low', 'medium', 'high'
    workaround TEXT,
    examples TEXT,       -- JSON array of node IDs
    first_seen TEXT,
    last_seen TEXT,

    -- Prompt generation fields
    prompt_text TEXT,    -- Generated prompt addition
    prompt_included INTEGER DEFAULT 0,
    prompt_version TEXT, -- Which prompt version includes this

    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_insights_model ON aggregated_insights(model);
CREATE INDEX IF NOT EXISTS idx_insights_type ON aggregated_insights(type);
CREATE INDEX IF NOT EXISTS idx_insights_frequency ON aggregated_insights(frequency DESC);
CREATE INDEX IF NOT EXISTS idx_insights_prompt_included ON aggregated_insights(prompt_included);
