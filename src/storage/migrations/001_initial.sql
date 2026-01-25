-- Migration 001: Initial schema
-- Creates all core tables for pi-brain

-- Schema versioning
CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at TEXT DEFAULT (datetime('now')),
    description TEXT
);

-- Main node table (indexed data, references JSON file)
CREATE TABLE IF NOT EXISTS nodes (
    id TEXT PRIMARY KEY,
    version INTEGER NOT NULL DEFAULT 1,

    -- Source reference
    session_file TEXT NOT NULL,
    segment_start TEXT,
    segment_end TEXT,
    computer TEXT,

    -- Classification (queryable)
    type TEXT,
    project TEXT,
    is_new_project INTEGER DEFAULT 0,
    had_clear_goal INTEGER DEFAULT 1,
    outcome TEXT,

    -- Metrics (queryable)
    tokens_used INTEGER DEFAULT 0,
    cost REAL DEFAULT 0.0,
    duration_minutes INTEGER DEFAULT 0,

    -- Timestamps
    timestamp TEXT NOT NULL,
    analyzed_at TEXT NOT NULL,

    -- Analysis metadata
    analyzer_version TEXT,
    data_file TEXT NOT NULL,

    -- Indexes
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Edges between nodes
CREATE TABLE IF NOT EXISTS edges (
    id TEXT PRIMARY KEY,
    source_node_id TEXT NOT NULL,
    target_node_id TEXT NOT NULL,
    type TEXT NOT NULL,
    metadata TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    created_by TEXT,

    FOREIGN KEY (source_node_id) REFERENCES nodes(id) ON DELETE CASCADE,
    FOREIGN KEY (target_node_id) REFERENCES nodes(id) ON DELETE CASCADE
);

-- Tags for semantic linking
CREATE TABLE IF NOT EXISTS tags (
    node_id TEXT NOT NULL,
    tag TEXT NOT NULL,

    PRIMARY KEY (node_id, tag),
    FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE
);

-- Topics for categorization
CREATE TABLE IF NOT EXISTS topics (
    node_id TEXT NOT NULL,
    topic TEXT NOT NULL,

    PRIMARY KEY (node_id, topic),
    FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE
);

-- Lessons extracted from nodes
CREATE TABLE IF NOT EXISTS lessons (
    id TEXT PRIMARY KEY,
    node_id TEXT NOT NULL,
    level TEXT NOT NULL,
    summary TEXT NOT NULL,
    details TEXT,
    confidence TEXT,
    created_at TEXT DEFAULT (datetime('now')),

    FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE
);

-- Lesson tags for filtering
CREATE TABLE IF NOT EXISTS lesson_tags (
    lesson_id TEXT NOT NULL,
    tag TEXT NOT NULL,

    PRIMARY KEY (lesson_id, tag),
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
);

-- Model quirks observed
CREATE TABLE IF NOT EXISTS model_quirks (
    id TEXT PRIMARY KEY,
    node_id TEXT NOT NULL,
    model TEXT NOT NULL,
    observation TEXT NOT NULL,
    frequency TEXT,
    workaround TEXT,
    created_at TEXT DEFAULT (datetime('now')),

    FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE
);

-- Tool use errors
CREATE TABLE IF NOT EXISTS tool_errors (
    id TEXT PRIMARY KEY,
    node_id TEXT NOT NULL,
    tool TEXT NOT NULL,
    error_type TEXT NOT NULL,
    context TEXT,
    model TEXT,
    created_at TEXT DEFAULT (datetime('now')),

    FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE
);

-- Analysis work queue
CREATE TABLE IF NOT EXISTS analysis_queue (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    priority INTEGER DEFAULT 100,
    session_file TEXT NOT NULL,
    segment_start TEXT,
    segment_end TEXT,
    context TEXT,

    -- Status
    status TEXT DEFAULT 'pending',
    queued_at TEXT DEFAULT (datetime('now')),
    started_at TEXT,
    completed_at TEXT,

    -- Results
    result_node_id TEXT,
    error TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,

    FOREIGN KEY (result_node_id) REFERENCES nodes(id)
);

-- Daemon decisions log (for UI feedback)
CREATE TABLE IF NOT EXISTS daemon_decisions (
    id TEXT PRIMARY KEY,
    node_id TEXT,
    timestamp TEXT DEFAULT (datetime('now')),
    decision TEXT NOT NULL,
    reasoning TEXT NOT NULL,
    user_feedback TEXT,

    FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE
);

-- Prompt version history
CREATE TABLE IF NOT EXISTS prompt_versions (
    version TEXT PRIMARY KEY,
    content_hash TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    notes TEXT,
    file_path TEXT
);

-- Failure patterns (populated by nightly job)
CREATE TABLE IF NOT EXISTS failure_patterns (
    id TEXT PRIMARY KEY,
    pattern TEXT NOT NULL,
    occurrences INTEGER DEFAULT 1,
    models TEXT,
    tools TEXT,
    example_nodes TEXT,
    last_seen TEXT,
    learning_opportunity TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Model statistics (populated by nightly job)
CREATE TABLE IF NOT EXISTS model_stats (
    model TEXT PRIMARY KEY,
    total_tokens INTEGER DEFAULT 0,
    total_cost REAL DEFAULT 0.0,
    total_sessions INTEGER DEFAULT 0,
    quirk_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    last_used TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Query performance indexes
CREATE INDEX IF NOT EXISTS idx_nodes_project ON nodes(project);
CREATE INDEX IF NOT EXISTS idx_nodes_type ON nodes(type);
CREATE INDEX IF NOT EXISTS idx_nodes_timestamp ON nodes(timestamp);
CREATE INDEX IF NOT EXISTS idx_nodes_analyzed_at ON nodes(analyzed_at);
CREATE INDEX IF NOT EXISTS idx_nodes_analyzer_version ON nodes(analyzer_version);
CREATE INDEX IF NOT EXISTS idx_nodes_computer ON nodes(computer);

CREATE INDEX IF NOT EXISTS idx_edges_source ON edges(source_node_id);
CREATE INDEX IF NOT EXISTS idx_edges_target ON edges(target_node_id);
CREATE INDEX IF NOT EXISTS idx_edges_type ON edges(type);

CREATE INDEX IF NOT EXISTS idx_lessons_node ON lessons(node_id);
CREATE INDEX IF NOT EXISTS idx_lessons_level ON lessons(level);

CREATE INDEX IF NOT EXISTS idx_model_quirks_model ON model_quirks(model);
CREATE INDEX IF NOT EXISTS idx_tool_errors_tool ON tool_errors(tool);
CREATE INDEX IF NOT EXISTS idx_tool_errors_model ON tool_errors(model);

CREATE INDEX IF NOT EXISTS idx_analysis_queue_status ON analysis_queue(status);
CREATE INDEX IF NOT EXISTS idx_analysis_queue_priority ON analysis_queue(priority);
