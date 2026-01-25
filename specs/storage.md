# Storage

SQLite schema, JSON file format, and directory structure for pi-brain data.

## Design Decisions

### Why SQLite + JSON?

| Requirement                 | Solution                            |
| --------------------------- | ----------------------------------- |
| Queryable structured data   | SQLite — fast SQL queries           |
| Human-readable node details | JSON files — can view/edit manually |
| Portable, self-hosted       | SQLite — single file, no server     |
| Version controllable        | JSON files — can git track changes  |
| Graph traversal             | SQLite — indexed edges table        |
| Full-text search            | SQLite FTS5 extension               |

### Data Split

- **SQLite**: Indexes, relationships, aggregations, queue state
- **JSON**: Full node content, lessons, decisions, summaries

## Directory Structure

```
~/.pi-brain/
├── config.yaml              # User configuration
├── data/
│   ├── brain.db             # SQLite database
│   └── nodes/               # JSON node files
│       └── YYYY/
│           └── MM/
│               ├── <node-id>-v1.json
│               ├── <node-id>-v2.json  # Reanalysis
│               └── ...
├── prompts/
│   ├── session-analyzer.md  # Current prompt
│   └── history/
│       ├── v1-<hash>-<date>.md
│       └── v2-<hash>-<date>.md
└── logs/
    ├── daemon.log
    └── analysis/
        └── <job-id>.log     # Per-analysis logs
```

## SQLite Schema

### Core Tables

```sql
-- Main node table (indexed data, references JSON file)
CREATE TABLE nodes (
    id TEXT PRIMARY KEY,
    version INTEGER NOT NULL DEFAULT 1,

    -- Source reference
    session_file TEXT NOT NULL,
    segment_start TEXT,           -- Entry ID where segment starts
    segment_end TEXT,             -- Entry ID where segment ends
    computer TEXT,                -- Hostname of source machine

    -- Classification (queryable)
    type TEXT,                    -- coding, sysadmin, debugging, etc.
    project TEXT,                 -- Project path
    is_new_project BOOLEAN,
    had_clear_goal BOOLEAN,       -- For vague-prompting detection
    outcome TEXT,                 -- success, partial, failed, abandoned

    -- Metrics (queryable)
    tokens_used INTEGER DEFAULT 0,
    cost REAL DEFAULT 0.0,
    duration_minutes INTEGER DEFAULT 0,

    -- Timestamps
    timestamp TEXT NOT NULL,      -- When segment started
    analyzed_at TEXT NOT NULL,    -- When analysis completed

    -- Analysis metadata
    analyzer_version TEXT,        -- Prompt version hash
    data_file TEXT NOT NULL,      -- Path to JSON file

    -- Indexes
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Edges between nodes
CREATE TABLE edges (
    id TEXT PRIMARY KEY,
    source_node_id TEXT NOT NULL,
    target_node_id TEXT NOT NULL,
    type TEXT NOT NULL,           -- fork, branch, tree_jump, resume, etc.
    metadata TEXT,                -- JSON
    created_at TEXT DEFAULT (datetime('now')),
    created_by TEXT,              -- boundary, daemon, user

    FOREIGN KEY (source_node_id) REFERENCES nodes(id) ON DELETE CASCADE,
    FOREIGN KEY (target_node_id) REFERENCES nodes(id) ON DELETE CASCADE
);

-- Tags for semantic linking
CREATE TABLE tags (
    node_id TEXT NOT NULL,
    tag TEXT NOT NULL,

    PRIMARY KEY (node_id, tag),
    FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE
);

-- Topics for categorization
CREATE TABLE topics (
    node_id TEXT NOT NULL,
    topic TEXT NOT NULL,

    PRIMARY KEY (node_id, topic),
    FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE
);
```

### Lessons Tables

```sql
-- Lessons extracted from nodes
CREATE TABLE lessons (
    id TEXT PRIMARY KEY,
    node_id TEXT NOT NULL,
    level TEXT NOT NULL,          -- project, task, user, model, tool, skill, subagent
    summary TEXT NOT NULL,
    details TEXT,
    confidence TEXT,              -- high, medium, low
    created_at TEXT DEFAULT (datetime('now')),

    FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE
);

-- Lesson tags for filtering
CREATE TABLE lesson_tags (
    lesson_id TEXT NOT NULL,
    tag TEXT NOT NULL,

    PRIMARY KEY (lesson_id, tag),
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
);
```

### Model Observations Tables

```sql
-- Model quirks observed
CREATE TABLE model_quirks (
    id TEXT PRIMARY KEY,
    node_id TEXT NOT NULL,
    model TEXT NOT NULL,          -- provider/model
    observation TEXT NOT NULL,
    frequency TEXT,               -- once, sometimes, often, always
    workaround TEXT,
    created_at TEXT DEFAULT (datetime('now')),

    FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE
);

-- Tool use errors
CREATE TABLE tool_errors (
    id TEXT PRIMARY KEY,
    node_id TEXT NOT NULL,
    tool TEXT NOT NULL,
    error_type TEXT NOT NULL,
    context TEXT,
    model TEXT,                   -- Which model made the error
    created_at TEXT DEFAULT (datetime('now')),

    FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE
);
```

### Daemon Tables

```sql
-- Analysis work queue
CREATE TABLE analysis_queue (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,           -- initial, reanalysis, connection_discovery
    priority INTEGER DEFAULT 100, -- Lower = higher priority
    session_file TEXT NOT NULL,
    segment_start TEXT,
    segment_end TEXT,
    context TEXT,                 -- JSON: additional context for agent

    -- Status
    status TEXT DEFAULT 'pending', -- pending, running, completed, failed
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
CREATE TABLE daemon_decisions (
    id TEXT PRIMARY KEY,
    node_id TEXT,
    timestamp TEXT DEFAULT (datetime('now')),
    decision TEXT NOT NULL,
    reasoning TEXT NOT NULL,
    user_feedback TEXT,           -- User's response/correction

    FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE
);

-- Prompt version history
CREATE TABLE prompt_versions (
    version TEXT PRIMARY KEY,     -- Hash of content
    content_hash TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    notes TEXT,
    file_path TEXT                -- Path to archived prompt file
);
```

### Aggregation Tables

```sql
-- Failure patterns (populated by nightly job)
CREATE TABLE failure_patterns (
    id TEXT PRIMARY KEY,
    pattern TEXT NOT NULL,        -- Description of the pattern
    occurrences INTEGER DEFAULT 1,
    models TEXT,                  -- JSON array of models
    tools TEXT,                   -- JSON array of tools
    example_nodes TEXT,           -- JSON array of node IDs
    last_seen TEXT,
    learning_opportunity TEXT,    -- What we could learn
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Model statistics (populated by nightly job)
CREATE TABLE model_stats (
    model TEXT PRIMARY KEY,
    total_tokens INTEGER DEFAULT 0,
    total_cost REAL DEFAULT 0.0,
    total_sessions INTEGER DEFAULT 0,
    quirk_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    last_used TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
);
```

### Full-Text Search

```sql
-- FTS5 for full-text search on node content (contentless - managed by application)
CREATE VIRTUAL TABLE nodes_fts USING fts5(
    node_id,
    summary,
    decisions,
    lessons,
    tags,
    content='',  -- Contentless FTS (we manage content ourselves)
    content_rowid='rowid',
    tokenize='porter unicode61'
);
```

### Application-Level FTS Updates

FTS is updated by the application after node creation:

```typescript
interface FtsDocument {
  nodeId: string;
  summary: string;
  decisions: string;
  lessons: string;
  tags: string;
}

function extractFtsDocument(node: Node): FtsDocument {
  // Extract searchable text from node
  const decisions = node.content.keyDecisions
    .map(d => `${d.what} ${d.why}`)
    .join(' ');

  const lessons = Object.values(node.lessons)
    .flat()
    .map(l => `${l.summary} ${l.details}`)
    .join(' ');

  const tags = node.semantic.tags.join(' ');

  return {
    nodeId: node.id,
    summary: node.content.summary,
    decisions,
    lessons,
    tags,
  };
}

async function indexNodeForSearch(
  db: Database,
  node: Node,
): Promise<void> {
  const doc = extractFtsDocument(node);

  // Delete existing (for updates)
  db.run('DELETE FROM nodes_fts WHERE node_id = ?', [node.id]);

  // Insert new
  db.run(`
    INSERT INTO nodes_fts (node_id, summary, decisions, lessons, tags)
    VALUES (?, ?, ?, ?, ?)
  `, [doc.nodeId, doc.summary, doc.decisions, doc.lessons, doc.tags]);
}

// Call after node creation
async function createNode(node: Node): Promise<void> {
  await db.run('INSERT INTO nodes ...', [...]);
  await writeNodeJson(node);
  await indexNodeForSearch(db, node);  // Update FTS
}
```

### FTS Search Queries

```sql
-- Full-text search
SELECT n.*, rank
FROM nodes n
JOIN nodes_fts f ON n.id = f.node_id
WHERE nodes_fts MATCH ?
ORDER BY rank;

-- Search with filters
SELECT n.*, rank
FROM nodes n
JOIN nodes_fts f ON n.id = f.node_id
WHERE nodes_fts MATCH ?
  AND n.project LIKE ?
  AND n.type = ?
ORDER BY rank;
```

### Indexes

```sql
-- Query performance indexes
CREATE INDEX idx_nodes_project ON nodes(project);
CREATE INDEX idx_nodes_type ON nodes(type);
CREATE INDEX idx_nodes_timestamp ON nodes(timestamp);
CREATE INDEX idx_nodes_analyzed_at ON nodes(analyzed_at);
CREATE INDEX idx_nodes_analyzer_version ON nodes(analyzer_version);
CREATE INDEX idx_nodes_computer ON nodes(computer);

CREATE INDEX idx_edges_source ON edges(source_node_id);
CREATE INDEX idx_edges_target ON edges(target_node_id);
CREATE INDEX idx_edges_type ON edges(type);

CREATE INDEX idx_lessons_node ON lessons(node_id);
CREATE INDEX idx_lessons_level ON lessons(level);

CREATE INDEX idx_model_quirks_model ON model_quirks(model);
CREATE INDEX idx_tool_errors_tool ON tool_errors(tool);
CREATE INDEX idx_tool_errors_model ON tool_errors(model);

CREATE INDEX idx_analysis_queue_status ON analysis_queue(status);
CREATE INDEX idx_analysis_queue_priority ON analysis_queue(priority);
```

## JSON Node Format

### File Naming

```
~/.pi-brain/data/nodes/YYYY/MM/<node-id>-v<version>.json
```

Example: `~/.pi-brain/data/nodes/2026/01/a1b2c3d4e5f6g7h8-v1.json`

### Schema

```json
{
  "id": "a1b2c3d4e5f6g7h8",
  "version": 1,
  "previous_versions": [],

  "source": {
    "session_file": "/home/will/.pi/agent/sessions/--home-will-projects-pi-brain--/2026-01-24T10-00-00-000Z_abc123.jsonl",
    "segment": {
      "start_entry_id": "e1f2g3h4",
      "end_entry_id": "i5j6k7l8"
    },
    "computer": "desktop"
  },

  "classification": {
    "type": "coding",
    "project": "/home/will/projects/pi-brain",
    "is_new_project": false,
    "had_clear_goal": true
  },

  "content": {
    "summary": "Implemented SQLite storage layer for pi-brain. Created schema for nodes, edges, lessons, and analysis queue.",
    "outcome": "success",
    "key_decisions": [
      {
        "what": "Used SQLite + JSON hybrid storage",
        "why": "SQLite for queries, JSON for human-readable full content",
        "alternatives_considered": ["Pure SQLite", "Pure JSON", "PostgreSQL"]
      }
    ],
    "files_touched": [
      "src/storage/database.ts",
      "src/storage/schema.sql",
      "specs/storage.md"
    ]
  },

  "lessons": {
    "project": [
      {
        "level": "project",
        "summary": "pi-brain uses SQLite + JSON hybrid storage",
        "details": "SQLite for indexed queries, JSON files for full node content. This allows both fast queries and human-readable data.",
        "confidence": "high",
        "tags": ["storage", "architecture"]
      }
    ],
    "task": [],
    "user": [],
    "model": [],
    "tool": [],
    "skill": [],
    "subagent": []
  },

  "model_observations": {
    "models_used": [
      {
        "provider": "zai",
        "model": "glm-4.7",
        "tokens_input": 15000,
        "tokens_output": 3000,
        "cost": 0.0
      }
    ],
    "prompting_wins": [
      "Breaking the task into clear phases helped maintain focus"
    ],
    "prompting_failures": [],
    "model_quirks": [],
    "tool_use_errors": []
  },

  "metadata": {
    "tokens_used": 18000,
    "cost": 0.0,
    "duration_minutes": 45,
    "timestamp": "2026-01-24T10:00:00.000Z",
    "analyzed_at": "2026-01-24T10:55:00.000Z",
    "analyzer_version": "v1-abc123"
  },

  "semantic": {
    "tags": ["storage", "sqlite", "database", "architecture"],
    "topics": ["data persistence", "database design"]
  },

  "daemon_meta": {
    "decisions": [
      {
        "timestamp": "2026-01-24T10:50:00.000Z",
        "decision": "Created new 'architecture' tag",
        "reasoning": "This session involves high-level design decisions that warrant a dedicated tag for filtering"
      }
    ]
  }
}
```

## Query Examples

### Find nodes by project

```sql
SELECT n.*, COUNT(e.id) as edge_count
FROM nodes n
LEFT JOIN edges e ON e.source_node_id = n.id OR e.target_node_id = n.id
WHERE n.project LIKE '%pi-brain%'
GROUP BY n.id
ORDER BY n.timestamp DESC;
```

### Get lessons by level

```sql
SELECT l.*, n.project, n.type
FROM lessons l
JOIN nodes n ON l.node_id = n.id
WHERE l.level = 'model'
ORDER BY l.created_at DESC;
```

### Find model quirks by frequency

```sql
SELECT model, observation, COUNT(*) as occurrences
FROM model_quirks
GROUP BY model, observation
HAVING COUNT(*) > 1
ORDER BY occurrences DESC;
```

### Tool errors by model

```sql
SELECT model, tool, error_type, COUNT(*) as count
FROM tool_errors
GROUP BY model, tool, error_type
ORDER BY count DESC
LIMIT 20;
```

### Full-text search

```sql
SELECT n.id, n.project, n.type, n.timestamp
FROM nodes n
JOIN nodes_fts f ON n.id = f.id
WHERE nodes_fts MATCH 'authentication jwt'
ORDER BY rank;
```

### Graph traversal (related nodes)

```sql
-- Get all nodes connected to a specific node (1 hop)
WITH connected AS (
    SELECT target_node_id as id, type as edge_type, 'outgoing' as direction
    FROM edges WHERE source_node_id = ?
    UNION
    SELECT source_node_id as id, type as edge_type, 'incoming' as direction
    FROM edges WHERE target_node_id = ?
)
SELECT n.*, c.edge_type, c.direction
FROM nodes n
JOIN connected c ON n.id = c.id;
```

## Migration Strategy

### Schema Versioning

```sql
CREATE TABLE schema_version (
    version INTEGER PRIMARY KEY,
    applied_at TEXT DEFAULT (datetime('now')),
    description TEXT
);
```

### Migration Files

```
src/storage/migrations/
├── 001_initial.sql
├── 002_add_fts.sql
├── 003_add_model_stats.sql
└── ...
```

### Migration Runner

```typescript
async function migrate(db: Database): Promise<void> {
  const current =
    db.prepare("SELECT MAX(version) as v FROM schema_version").get()?.v ?? 0;

  const migrations = await loadMigrations();

  for (const migration of migrations) {
    if (migration.version > current) {
      db.exec(migration.sql);
      db.prepare(
        "INSERT INTO schema_version (version, description) VALUES (?, ?)"
      ).run(migration.version, migration.description);
    }
  }
}
```

## Backup Strategy

### Automatic Backups

```bash
# Daily backup (cron or systemd timer)
sqlite3 ~/.pi-brain/data/brain.db ".backup ~/.pi-brain/backups/brain-$(date +%Y%m%d).db"
```

### Export

```bash
# Export full database as SQL
sqlite3 ~/.pi-brain/data/brain.db .dump > backup.sql

# Export nodes as JSONL
pi-brain export --format jsonl --output nodes.jsonl
```

## Performance Considerations

### Write Performance

- Batch inserts in transactions
- Use prepared statements
- WAL mode for concurrency

```typescript
db.pragma("journal_mode = WAL");
db.pragma("synchronous = NORMAL");

// Batch insert
const insert = db.prepare("INSERT INTO tags (node_id, tag) VALUES (?, ?)");
const insertMany = db.transaction((items: Array<[string, string]>) => {
  for (const [nodeId, tag] of items) {
    insert.run(nodeId, tag);
  }
});
insertMany(tags);
```

### Read Performance

- Indexes on frequently queried columns
- FTS5 for text search
- Limit result sets
- Use appropriate fetch methods (`.get()` vs `.all()`)

### Storage Size

- Node JSON files: ~2-10KB each
- SQLite database: Grows with node count
- Estimate: 1000 nodes ≈ 10-50MB total
