-- Migration 005: Lesson Patterns
-- Adds table for aggregated lesson patterns

CREATE TABLE IF NOT EXISTS lesson_patterns (
    id TEXT PRIMARY KEY,
    level TEXT NOT NULL,
    pattern TEXT NOT NULL,
    occurrences INTEGER DEFAULT 1,
    tags TEXT, -- JSON array
    example_nodes TEXT, -- JSON array of node IDs
    last_seen TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    
    CONSTRAINT unique_pattern UNIQUE (level, pattern)
);

CREATE INDEX IF NOT EXISTS idx_lesson_patterns_level ON lesson_patterns(level);

-- Composite index for common query pattern (ORDER BY occurrences DESC, last_seen DESC)
CREATE INDEX IF NOT EXISTS idx_lesson_patterns_sort ON lesson_patterns(occurrences DESC, last_seen DESC);
