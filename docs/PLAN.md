# pi-brain: Implementation Plan

A "second brain" for pi coding agent sessions — analyzing, connecting, and learning from every interaction.

## Vision

pi-brain continuously analyzes pi sessions to build an interconnected knowledge graph that enables:

- **Understanding**: How things were built, what worked, what didn't, why decisions were made
- **Learning**: Prompting techniques, model quirks, tool-use patterns, failure modes
- **Exploration**: Visual graph navigation, querying, filtering, searching
- **Feedback loops**: Insights fed back into future sessions and model prompts

### Success Criteria

When pi-brain is working, you can:

- Open the graph and immediately see connections you didn't notice
- Ask `/brain why did auth fail last month` and get a useful answer
- See a dashboard showing you've been vague-prompting too much this week
- Have prompts to Claude auto-include reminders about its quirks
- Explore the full history of a project's development across sessions
- Identify patterns in failures that reveal learning opportunities

---

## Architecture

### Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              HUB (Primary Computer)                         │
│                                                                             │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────────┐  │
│  │   Session   │──▶│   Daemon    │──▶│  Knowledge  │◀──│     Web UI      │  │
│  │   Watcher   │   │   Queue     │   │   Graph     │   │  - Dashboard    │  │
│  │             │   │             │   │  (SQLite +  │   │  - Graph Viz    │  │
│  │ Monitors:   │   │ Spawns pi   │   │   JSON)     │   │  - Search       │  │
│  │ - Local     │   │ agents for  │   │             │   │  - Filters      │  │
│  │ - Synced    │   │ analysis    │   │             │   │  - Decision Log │  │
│  └─────────────┘   └─────────────┘   └─────────────┘   └─────────────────┘  │
│         ▲                 │                                     │           │
│         │                 ▼                                     │           │
│  ┌─────────────┐   ┌─────────────┐                              │           │
│  │ Local Pi    │   │  Pi Agent   │◀─────────────────────────────┘           │
│  │ Sessions    │   │  + RLM Skill│   /brain queries                         │
│  │             │   │  (analyzes) │                                          │
│  └─────────────┘   └─────────────┘                                          │
│         ▲                                                                   │
└─────────│───────────────────────────────────────────────────────────────────┘
          │
    ┌─────┴─────┐
    │   Sync    │  (Syncthing / rsync / API)
    │  Layer    │
    └─────┬─────┘
          │
┌─────────▼─────────┐     ┌───────────────────┐
│  SPOKE (Laptop)   │     │  SPOKE (Server)   │
│  ┌─────────────┐  │     │  ┌─────────────┐  │
│  │ Local Pi    │  │     │  │ Local Pi    │  │
│  │ Sessions    │  │     │  │ Sessions    │  │
│  └─────────────┘  │     │  └─────────────┘  │
└───────────────────┘     └───────────────────┘
```

### Design Principles

1. **Works out of box**: Single computer, no configuration needed
2. **Modular**: Daemon, database, and web UI can run on different machines
3. **Hub and spoke**: Spokes contribute sessions, hub processes everything
4. **Configurable sync**: Syncthing, rsync, or API — user's choice
5. **Graceful degradation**: Queue-based processing, handles more sessions than time

### Components

| Component | Responsibility | Default Location |
|-----------|---------------|------------------|
| **Session Watcher** | Monitors directories for new/changed sessions | Hub |
| **Daemon Queue** | Manages analysis work queue, spawns pi agents | Hub |
| **Knowledge Graph** | SQLite + JSON storage for nodes and edges | Hub |
| **Web UI** | Dashboard, visualization, search, queries | Hub |
| **Sync Layer** | Moves sessions from spokes to hub | Between hub/spokes |

### Configuration

```yaml
# ~/.pi-brain/config.yaml

hub:
  sessions_dir: ~/.pi/agent/sessions
  database_dir: ~/.pi-brain/data
  web_ui_port: 8765

spokes:
  - name: laptop
    sync_method: syncthing  # or rsync, api
    path: /synced/laptop-sessions
  - name: server
    sync_method: rsync
    source: user@server:~/.pi/agent/sessions
    path: /synced/server-sessions

daemon:
  idle_timeout_minutes: 10
  parallel_workers: 1  # Increase for more powerful hardware
  reanalysis_schedule: "0 2 * * *"  # 2am nightly
  model: zai/glm-4.7
  prompt_file: ~/.pi-brain/prompts/session-analyzer.md
```

---

## Data Model

### Node

A node represents a contiguous segment of work within a session.

```typescript
interface Node {
  // Identity
  id: string;                    // UUID
  version: number;               // Analysis version (1, 2, 3...)
  previous_versions: string[];   // IDs of previous version nodes
  
  // Source
  session_file: string;          // Path to session .jsonl
  segment: {
    start_entry_id: string;
    end_entry_id: string;
  };
  computer: string;              // Hostname of originating machine
  
  // Classification
  type: NodeType;                // See enum below
  project: string;               // Project path
  is_new_project: boolean;
  had_clear_goal: boolean;       // For vague-prompting detection
  
  // Content
  summary: string;               // What happened
  outcome: 'success' | 'partial' | 'failed' | 'abandoned';
  key_decisions: Decision[];
  files_touched: string[];
  
  // Lessons (multi-level taxonomy)
  lessons: {
    project: Lesson[];           // "In pi-brain, we use SQLite because..."
    task: Lesson[];              // "Debugging async needs explicit logging"
    user: Lesson[];              // "I should be more specific on refactors"
    model: Lesson[];             // "Claude-sonnet over-engineers solutions"
    tool: Lesson[];              // "edit fails with trailing whitespace"
    skill: Lesson[];             // "RLM skill needs chunking hints"
    subagent: Lesson[];          // "worker agent needs clearer scope"
  };
  
  // Model/Agent Observations
  models_used: ModelUsage[];
  prompting_wins: string[];
  prompting_failures: string[];
  model_quirks: ModelQuirk[];
  tool_use_errors: ToolError[];
  
  // Metadata
  tokens_used: number;
  cost: number;
  duration_minutes: number;
  timestamp: string;             // ISO 8601
  
  // Semantic Linking
  tags: string[];
  topics: string[];
  
  // Daemon Meta
  analyzed_at: string;
  analyzer_version: string;      // Prompt version used
  daemon_decisions: DaemonDecision[];  // Key decisions made by daemon
}

type NodeType = 
  | 'coding'
  | 'sysadmin'
  | 'research'
  | 'planning'
  | 'debugging'
  | 'qa'
  | 'brainstorm'
  | 'handoff'
  | 'refactor'
  | 'documentation'
  | 'configuration'
  | 'other';

interface Lesson {
  level: 'project' | 'task' | 'user' | 'model' | 'tool' | 'skill' | 'subagent';
  summary: string;
  details: string;
  confidence: 'high' | 'medium' | 'low';
  tags: string[];
}

interface Decision {
  what: string;
  why: string;
  alternatives_considered: string[];
}

interface ModelUsage {
  provider: string;
  model: string;
  tokens_input: number;
  tokens_output: number;
  cost: number;
}

interface ModelQuirk {
  model: string;
  observation: string;
  frequency: 'once' | 'sometimes' | 'often' | 'always';
  workaround?: string;
}

interface ToolError {
  tool: string;
  error_type: string;
  context: string;
  model: string;
}

interface DaemonDecision {
  timestamp: string;
  decision: string;
  reasoning: string;
}
```

### Edge

Connections between nodes.

```typescript
interface Edge {
  id: string;
  source_node_id: string;
  target_node_id: string;
  type: EdgeType;
  metadata: Record<string, unknown>;
  created_at: string;
  created_by: 'boundary' | 'daemon' | 'user';  // How edge was created
}

type EdgeType =
  // Explicit boundaries (from session structure)
  | 'fork'              // Created via /fork command
  | 'branch'            // Created via /tree with summary
  | 'tree_jump'         // Created via /tree without summary
  | 'handoff'           // Explicit session handoff
  | 'resume'            // Resumed after 10+ min gap
  | 'compaction'        // Follows a compaction event
  
  // Inferred connections (daemon discovers)
  | 'semantic'          // Related by topic/technique
  | 'temporal'          // Same work session, different context
  | 'continuation'      // Continues work from earlier session
  | 'reference'         // References content from another session
  | 'lesson_application' // Applies lesson learned elsewhere
  | 'failure_pattern';   // Same failure mode observed
```

### Node Boundaries

A node boundary is triggered when:

| Event | Detection Method | Edge Type Created |
|-------|------------------|-------------------|
| `/tree` with summary | `branch_summary` entry | `branch` |
| `/tree` without summary | New entry's `parentId` ≠ previous leaf | `tree_jump` |
| `/branch` | `branch_summary` entry | `branch` |
| `/fork` | New session with `parentSession` header | `fork` |
| `/compact` | `compaction` entry | `compaction` |
| `/resume` | 10+ minute gap in timestamps | `resume` |
| Session end | 10+ minutes idle | (triggers analysis) |
| Handoff | Explicit handoff marker | `handoff` |

### Versioning

When a node is reprocessed (due to improved prompts or new connections):

1. Create new node with incremented version number
2. Link to previous version via `previous_versions` array
3. Old version remains in database (never deleted)
4. "Current" view always shows latest version
5. UI can show version history and diffs

---

## Daemon

### Overview

The daemon is a persistent process that:

1. Watches session directories for changes
2. Detects node boundaries and queues analysis work
3. Spawns pi agents to analyze sessions
4. Stores results in the knowledge graph
5. Periodically discovers new connections between nodes

### Work Queue

```typescript
interface AnalysisJob {
  id: string;
  type: 'initial' | 'reanalysis' | 'connection_discovery';
  priority: number;  // Lower = higher priority
  session_file: string;
  segment?: {
    start_entry_id: string;
    end_entry_id: string;
  };
  queued_at: string;
  started_at?: string;
  completed_at?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error?: string;
  retry_count: number;
}
```

### Processing Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        Daemon Main Loop                         │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│ File Watcher  │     │ Queue Worker  │     │ Nightly Job   │
│               │     │               │     │               │
│ - New session │     │ - Pop job     │     │ - Reanalysis  │
│ - Modified    │     │ - Spawn pi    │     │ - Connection  │
│ - Idle detect │     │ - Store node  │     │   discovery   │
└───────┬───────┘     └───────┬───────┘     └───────┬───────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Analysis Queue                          │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐       │
│  │ Job │ │ Job │ │ Job │ │ Job │ │ Job │ │ Job │ │ Job │  ...  │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘       │
└─────────────────────────────────────────────────────────────────┘
```

### Pi Agent Invocation

```bash
pi --provider zai --model glm-4.7 \
   --system-prompt ~/.pi-brain/prompts/session-analyzer.md \
   --skills rlm,codemap \
   --no-session \
   --mode json \
   -p "Analyze session segment:
       Session: /path/to/session.jsonl
       Start: entry_abc123
       End: entry_xyz789
       Previous context: {summary of related nodes}"
```

### Idle Detection

```python
def is_session_idle(session_file, timeout_minutes=10):
    """Check if session has been idle for timeout_minutes."""
    last_entry = get_last_entry(session_file)
    if not last_entry:
        return False
    
    last_activity = parse_timestamp(last_entry.timestamp)
    idle_duration = now() - last_activity
    
    return idle_duration.minutes >= timeout_minutes
```

### Nightly Reanalysis

Runs at configured schedule (default 2am):

1. **Reanalysis queue**: Check for nodes analyzed with older prompt versions
2. **Connection discovery**: For each recent node, search for semantic connections to older nodes
3. **Pattern aggregation**: Group similar failures, quirks, lessons across all nodes
4. **Queue management**: Process what's possible, carry remainder to next night

```python
def nightly_job():
    # 1. Queue reanalysis for outdated nodes
    current_prompt_version = get_prompt_version()
    outdated = db.query("""
        SELECT * FROM nodes 
        WHERE analyzer_version < ? 
        ORDER BY timestamp DESC
        LIMIT 100
    """, current_prompt_version)
    
    for node in outdated:
        queue_job('reanalysis', node)
    
    # 2. Connection discovery for recent nodes
    recent = db.query("""
        SELECT * FROM nodes 
        WHERE analyzed_at > datetime('now', '-7 days')
    """)
    
    for node in recent:
        queue_job('connection_discovery', node)
    
    # 3. Pattern aggregation
    aggregate_failure_patterns()
    aggregate_model_quirks()
    aggregate_lessons()
```

### Parallel Processing

```yaml
daemon:
  parallel_workers: 1  # Default: single worker
  # Increase for more powerful hardware
  # Each worker is a separate pi agent process
```

---

## Storage

### SQLite Schema

```sql
-- Core tables
CREATE TABLE nodes (
    id TEXT PRIMARY KEY,
    version INTEGER NOT NULL DEFAULT 1,
    session_file TEXT NOT NULL,
    segment_start TEXT,
    segment_end TEXT,
    computer TEXT,
    type TEXT,
    project TEXT,
    is_new_project BOOLEAN,
    had_clear_goal BOOLEAN,
    summary TEXT,
    outcome TEXT,
    tokens_used INTEGER,
    cost REAL,
    duration_minutes INTEGER,
    timestamp TEXT,
    analyzed_at TEXT,
    analyzer_version TEXT,
    
    -- Full data stored as JSON
    data_file TEXT NOT NULL  -- Path to JSON file with full node data
);

CREATE TABLE edges (
    id TEXT PRIMARY KEY,
    source_node_id TEXT NOT NULL,
    target_node_id TEXT NOT NULL,
    type TEXT NOT NULL,
    metadata TEXT,  -- JSON
    created_at TEXT,
    created_by TEXT,
    
    FOREIGN KEY (source_node_id) REFERENCES nodes(id),
    FOREIGN KEY (target_node_id) REFERENCES nodes(id)
);

CREATE TABLE tags (
    node_id TEXT NOT NULL,
    tag TEXT NOT NULL,
    
    PRIMARY KEY (node_id, tag),
    FOREIGN KEY (node_id) REFERENCES nodes(id)
);

CREATE TABLE topics (
    node_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    
    PRIMARY KEY (node_id, topic),
    FOREIGN KEY (node_id) REFERENCES nodes(id)
);

CREATE TABLE lessons (
    id TEXT PRIMARY KEY,
    node_id TEXT NOT NULL,
    level TEXT NOT NULL,  -- project, task, user, model, tool, skill, subagent
    summary TEXT,
    details TEXT,
    confidence TEXT,
    
    FOREIGN KEY (node_id) REFERENCES nodes(id)
);

CREATE TABLE model_quirks (
    id TEXT PRIMARY KEY,
    node_id TEXT NOT NULL,
    model TEXT NOT NULL,
    observation TEXT,
    frequency TEXT,
    workaround TEXT,
    
    FOREIGN KEY (node_id) REFERENCES nodes(id)
);

CREATE TABLE tool_errors (
    id TEXT PRIMARY KEY,
    node_id TEXT NOT NULL,
    tool TEXT NOT NULL,
    error_type TEXT,
    context TEXT,
    model TEXT,
    
    FOREIGN KEY (node_id) REFERENCES nodes(id)
);

CREATE TABLE daemon_decisions (
    id TEXT PRIMARY KEY,
    node_id TEXT NOT NULL,
    timestamp TEXT,
    decision TEXT,
    reasoning TEXT,
    
    FOREIGN KEY (node_id) REFERENCES nodes(id)
);

CREATE TABLE analysis_queue (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    priority INTEGER DEFAULT 100,
    session_file TEXT NOT NULL,
    segment_start TEXT,
    segment_end TEXT,
    queued_at TEXT,
    started_at TEXT,
    completed_at TEXT,
    status TEXT DEFAULT 'pending',
    error TEXT,
    retry_count INTEGER DEFAULT 0
);

-- Aggregation tables (updated nightly)
CREATE TABLE failure_patterns (
    id TEXT PRIMARY KEY,
    pattern TEXT,
    occurrences INTEGER,
    models TEXT,  -- JSON array
    tools TEXT,   -- JSON array
    examples TEXT,  -- JSON array of node IDs
    last_seen TEXT,
    learning_opportunity TEXT
);

CREATE TABLE prompt_version_history (
    version TEXT PRIMARY KEY,
    content_hash TEXT,
    created_at TEXT,
    notes TEXT
);

-- Indexes
CREATE INDEX idx_nodes_project ON nodes(project);
CREATE INDEX idx_nodes_type ON nodes(type);
CREATE INDEX idx_nodes_timestamp ON nodes(timestamp);
CREATE INDEX idx_nodes_analyzer_version ON nodes(analyzer_version);
CREATE INDEX idx_edges_source ON edges(source_node_id);
CREATE INDEX idx_edges_target ON edges(target_node_id);
CREATE INDEX idx_edges_type ON edges(type);
CREATE INDEX idx_lessons_level ON lessons(level);
CREATE INDEX idx_lessons_node ON lessons(node_id);
CREATE INDEX idx_model_quirks_model ON model_quirks(model);
CREATE INDEX idx_tool_errors_tool ON tool_errors(tool);
CREATE INDEX idx_tool_errors_model ON tool_errors(model);
```

### JSON File Storage

Full node data stored as JSON for human readability and version control:

```
~/.pi-brain/data/
├── brain.db                 # SQLite database
├── nodes/
│   ├── 2026/
│   │   ├── 01/
│   │   │   ├── abc123-v1.json
│   │   │   ├── abc123-v2.json
│   │   │   └── def456-v1.json
│   │   └── 02/
│   └── ...
├── prompts/
│   ├── session-analyzer.md  # Current prompt
│   └── history/
│       ├── v1-2026-01-15.md
│       └── v2-2026-01-20.md
└── exports/
    └── ...
```

---

## Web UI

### Overview

Browser-based interface for exploring the knowledge graph.

### Views

#### 1. Dashboard

Initial landing page with key metrics and recent activity.

**Panels:**
- **Tool Use Failures by Model** (table/chart)
  - Model | Tool | Error Type | Count | Last Seen
  - Click to see examples

- **Vague Goal Tracker** (chart over time)
  - Sessions with `had_clear_goal: false`
  - Trend line: "You've been clearer this week"

- **Recent Activity** (timeline)
  - Latest analyzed nodes
  - Click to explore

- **Daemon Decision Log** (expandable list)
  - Key decisions made by daemon
  - User can provide feedback

- **Quick Stats**
  - Total nodes, edges, sessions
  - Sessions this week
  - Models used
  - Total tokens/cost

#### 2. Graph Visualization

Interactive node-link-node DAG visualization.

**Features:**
- Nodes as circles/boxes with summary preview
- Edges as labeled arrows (fork, branch, resume, semantic, etc.)
- Color coding by node type or project
- Click node to expand details panel
- Double-click to drill into raw session
- Zoom, pan, filter controls
- Time-based layout (left-to-right or top-to-bottom)
- Cluster by project

**Controls:**
- Filter by: project, type, model, date range, tags
- Search: fuzzy search across summaries
- Layout: tree, force-directed, timeline
- Depth: how many hops to show from selected node

#### 3. Node Detail View

Expanded view when clicking a node.

**Sections:**
- **Summary**: What happened
- **Classification**: Type, project, outcome
- **Key Decisions**: What was decided and why
- **Lessons Learned**: By level (project, task, user, model, tool, skill, subagent)
- **Model Observations**: Quirks, wins, failures
- **Tool Errors**: Errors encountered
- **Files Touched**: List of files modified
- **Connections**: Related nodes (incoming/outgoing edges)
- **Metadata**: Tokens, cost, duration, timestamp
- **Version History**: Previous analyses (if reprocessed)
- **Raw Session**: Link to view original session entries

#### 4. Search & Filter

Structured search interface.

**Search modes:**
- **Fuzzy text**: Search summaries, lessons, decisions
- **SQL-like**: `project:pi-brain type:debugging model:claude*`
- **Tag-based**: Click tags to filter

**Saved searches:**
- User can save common queries
- Quick access from sidebar

#### 5. File Browser

Traditional file explorer for manual browsing.

**Structure:**
- By project
  - By session
    - By node (segment)
- Breadcrumb navigation
- Metadata shown inline

#### 6. Session Viewer

View raw session data.

- Tree visualization of session entries (existing pi-tree-viz functionality)
- Highlight node boundaries
- Show which segment each node covers
- Link back to node analysis

### Technology

- **Framework**: SvelteKit or Next.js (SSR for fast initial load)
- **Visualization**: D3.js for graph, custom components for dashboard
- **Database access**: Direct SQLite queries via server API
- **Real-time**: WebSocket for live daemon status

---

## Pi Integration

### `/brain` Command

Query the knowledge graph from within pi.

```
/brain why did auth fail last month

/brain what techniques work for debugging TypeScript

/brain show me lessons about Claude

/brain what did I decide about database choice in pi-brain
```

**Implementation:**

```typescript
// Extension: brain-query
pi.registerCommand("brain", {
  description: "Query the pi-brain knowledge graph",
  handler: async (query, ctx) => {
    // 1. Send query to brain API
    const response = await fetch(`http://localhost:8765/api/query`, {
      method: 'POST',
      body: JSON.stringify({ query, context: getCurrentContext(ctx) })
    });
    
    // 2. Brain uses pi agent + RLM to answer
    const result = await response.json();
    
    // 3. Display result
    ctx.ui.notify(result.summary, "info");
    ctx.setNextUserMessage(result.detailed_answer);
  }
});
```

### `brain` Skill

Allow agents to query the knowledge graph programmatically.

```markdown
# Brain Query Skill

Use this skill to query the pi-brain knowledge graph for:
- Past decisions and their rationale
- Lessons learned about tools, models, techniques
- Related work on the same project
- Known quirks about the model you're using

## Usage

Query the brain via the brain-query tool:

\`\`\`
brain-query "What did we decide about X in project Y"
\`\`\`

## When to Use

- Before making architectural decisions
- When encountering a tool error (check if it's a known pattern)
- Starting work on a project (get context from previous sessions)
- Debugging (check if similar issues were solved before)
```

### Integration Points

| Integration | How |
|-------------|-----|
| Query from pi | `/brain` command |
| Agent queries | `brain` skill + tool |
| Live updates | Dashboard shows current session |
| Prompt injection | Model-specific quirks added to system prompt |

---

## Prompt Design

### Session Analyzer Prompt

Located at `~/.pi-brain/prompts/session-analyzer.md`.

```markdown
# Session Analyzer

You are analyzing a pi coding agent session to extract structured insights for the pi-brain knowledge graph.

## Your Task

Analyze the provided session segment and extract:

1. **Classification**: What type of work was this?
2. **Summary**: What happened? What was accomplished?
3. **Outcome**: Success, partial, failed, or abandoned?
4. **Key Decisions**: What was decided and why?
5. **Lessons Learned**: At all levels (project, task, user, model, tool, skill, subagent)
6. **Model Observations**: Quirks, effective techniques, failures
7. **Tool Errors**: Any tool use errors and their context
8. **Tags & Topics**: For semantic linking

## Guidelines

- Be thorough but concise
- Extract actionable insights, not just summaries
- Note prompting techniques that worked or failed
- Identify model-specific behaviors
- Look for patterns that could help future sessions
- If you see something that doesn't fit existing categories, note it in daemon_decisions with your reasoning

## Output Format

Return a JSON object matching the Node schema. Use the RLM skill if the session is too long to fit in context.

## Examples

### Example 1: Successful Coding Session

Input: [session with user asking to implement auth, agent successfully implementing it]

Output:
\`\`\`json
{
  "type": "coding",
  "project": "/home/will/projects/myapp",
  "is_new_project": false,
  "had_clear_goal": true,
  "summary": "Implemented JWT authentication with refresh tokens. Added login/logout endpoints, middleware for protected routes, and token refresh logic.",
  "outcome": "success",
  "key_decisions": [
    {
      "what": "Used short-lived access tokens (15min) with longer refresh tokens (7 days)",
      "why": "Balance between security and user experience",
      "alternatives_considered": ["Session-based auth", "Longer access tokens"]
    }
  ],
  "lessons": {
    "project": [
      {
        "level": "project",
        "summary": "Auth is JWT-based with refresh tokens",
        "details": "Access tokens expire in 15 minutes, refresh tokens in 7 days. Stored in httpOnly cookies.",
        "confidence": "high",
        "tags": ["auth", "jwt", "security"]
      }
    ],
    "task": [],
    "user": [
      {
        "level": "user",
        "summary": "Providing security requirements upfront saves iteration",
        "details": "User specified 'secure' and 'production-ready' which guided decisions",
        "confidence": "medium",
        "tags": ["prompting"]
      }
    ],
    "model": [],
    "tool": [],
    "skill": [],
    "subagent": []
  },
  "prompting_wins": [
    "User specified 'production-ready' which prompted more thorough implementation"
  ],
  "prompting_failures": [],
  "model_quirks": [],
  "tool_use_errors": [],
  "tags": ["auth", "jwt", "api", "security"],
  "topics": ["authentication", "web development"]
}
\`\`\`

### Example 2: Debugging Session with Model Quirk

Input: [session where Claude kept using sed instead of read tool]

Output:
\`\`\`json
{
  "type": "debugging",
  "project": "/home/will/projects/pi-brain",
  "is_new_project": false,
  "had_clear_goal": true,
  "summary": "Debugged issue with SQLite connection pooling. Found that connections weren't being released properly.",
  "outcome": "success",
  "key_decisions": [...],
  "lessons": {
    "tool": [
      {
        "level": "tool",
        "summary": "Claude uses sed to read files instead of read tool",
        "details": "Multiple times during this session, Claude used 'bash: cat file | sed' instead of the read tool. This is less efficient and loses line number context.",
        "confidence": "high",
        "tags": ["claude", "tool-use", "read"]
      }
    ],
    ...
  },
  "model_quirks": [
    {
      "model": "anthropic/claude-sonnet-4-20250514",
      "observation": "Uses sed/cat to read files instead of read tool",
      "frequency": "often",
      "workaround": "Remind in system prompt to use read tool"
    }
  ],
  ...
}
\`\`\`
```

### Prompt Versioning

Each prompt version is saved with a hash:

```
prompts/
├── session-analyzer.md           # Current
└── history/
    ├── v1-abc123-2026-01-15.md
    ├── v2-def456-2026-01-20.md
    └── v3-ghi789-2026-01-24.md
```

When prompt changes:
1. Hash new content
2. If different from current, save to history
3. Update prompt_version_history table
4. Nodes analyzed with old versions become reanalysis candidates

---

## Implementation Phases

### Phase 1: Foundation

**Goal**: Storage schema, configuration, project structure

**Tasks:**
- [ ] Create project structure (rename pi-tree-viz → pi-brain or create new)
- [ ] Design and implement SQLite schema
- [ ] Implement JSON file storage for nodes
- [ ] Create configuration system (YAML-based)
- [ ] Set up prompt file structure with versioning
- [ ] Write initial session-analyzer prompt

**Deliverables:**
- `~/.pi-brain/` directory structure
- `brain.db` SQLite database
- Configuration loading
- Prompt versioning system

### Phase 2: Session Parsing

**Goal**: Parse sessions, detect boundaries, extract segments

**Tasks:**
- [ ] Enhance existing parser to detect all boundary types
- [ ] Implement boundary detection:
  - [ ] `branch_summary` entries (tree/branch with summary)
  - [ ] `parentId` mismatches (tree without summary)
  - [ ] `compaction` entries
  - [ ] New sessions with `parentSession` (forks)
  - [ ] 10-minute timestamp gaps (resume)
- [ ] Segment extraction (start_entry_id, end_entry_id)
- [ ] Tests with real session files

**Deliverables:**
- Boundary detection module
- Segment extraction module
- Test coverage

### Phase 3: Daemon Core

**Goal**: File watcher, queue system, job processing

**Tasks:**
- [ ] Implement file watcher (inotify or polling)
- [ ] Implement analysis queue (SQLite-backed)
- [ ] Implement idle detection (10-minute timeout)
- [ ] Implement job processor (spawns pi agent)
- [ ] Implement pi agent invocation with correct flags
- [ ] Parse agent output (JSON mode)
- [ ] Store nodes and edges in database
- [ ] Error handling and retry logic
- [ ] Daemon CLI (start, stop, status, queue info)

**Deliverables:**
- `pi-brain daemon start/stop/status`
- Queue management
- Agent spawning and result parsing
- Persistent daemon process

### Phase 4: Node Storage & Queries

**Goal**: Full node persistence, query layer

**Tasks:**
- [ ] Implement node creation (with JSON file)
- [ ] Implement node versioning (reanalysis)
- [ ] Implement edge creation
- [ ] Implement tag/topic indexing
- [ ] Build query layer:
  - [ ] By project, type, date range
  - [ ] By tags, topics
  - [ ] Full-text search on summaries
  - [ ] Graph traversal (related nodes)
- [ ] Lesson aggregation queries
- [ ] Model quirk aggregation queries
- [ ] Tool error aggregation queries

**Deliverables:**
- Node CRUD operations
- Query API
- Aggregation functions

### Phase 5: Web UI - Core

**Goal**: Basic web interface with graph visualization

**Tasks:**
- [ ] Set up web framework (SvelteKit recommended)
- [ ] Implement API routes for queries
- [ ] Build graph visualization component (D3.js)
  - [ ] Node rendering (boxes/circles)
  - [ ] Edge rendering (labeled arrows)
  - [ ] Zoom, pan, filter
  - [ ] Click to select
- [ ] Build node detail panel
- [ ] Build search interface
- [ ] Build file browser view

**Deliverables:**
- Web server
- Graph visualization
- Node details
- Basic search

### Phase 6: Web UI - Dashboard

**Goal**: Dashboard with key metrics

**Tasks:**
- [ ] Tool use failures by model panel
- [ ] Vague goal tracker panel
- [ ] Recent activity timeline
- [ ] Daemon decision log with feedback
- [ ] Quick stats panel
- [ ] Real-time daemon status

**Deliverables:**
- Dashboard view
- All panels implemented
- Live updates

### Phase 7: Pi Integration

**Goal**: `/brain` command and skill

**Tasks:**
- [ ] Implement brain-query extension
- [ ] Implement `/brain` command
- [ ] Create query processing (pi agent + RLM)
- [ ] Create `brain` skill for agent use
- [ ] Implement brain-query tool
- [ ] Test integration

**Deliverables:**
- Pi extension
- `/brain` command
- `brain` skill

### Phase 8: Nightly Processing

**Goal**: Reanalysis, connection discovery, pattern aggregation

**Tasks:**
- [ ] Implement scheduler (cron-like or systemd timer)
- [ ] Implement reanalysis queue population
- [ ] Implement connection discovery
  - [ ] Semantic similarity (embeddings or keyword matching)
  - [ ] Reference detection
  - [ ] Lesson reinforcement
- [ ] Implement pattern aggregation
  - [ ] Failure patterns
  - [ ] Model quirks
  - [ ] Lessons
- [ ] Update failure_patterns table
- [ ] Surface in dashboard

**Deliverables:**
- Nightly job runner
- Connection discovery
- Pattern aggregation
- Dashboard integration

### Phase 9: Multi-Computer Sync

**Goal**: Hub and spoke architecture

**Tasks:**
- [ ] Document Syncthing setup for spokes
- [ ] Implement rsync-based sync option
- [ ] Implement API-based sync option (future)
- [ ] Spoke configuration in config.yaml
- [ ] Daemon watches synced directories
- [ ] Computer field populated correctly

**Deliverables:**
- Sync documentation
- Spoke configuration
- Multi-source session processing

### Phase 10: Prompt Learning Pipeline

**Goal**: Systematic prompt improvement from insights

**Tasks:**
- [ ] Aggregate model-specific learnings
- [ ] Generate model-specific prompt additions
- [ ] Implement prompt injection mechanism
- [ ] Create feedback loop: quirk → prompt fix → measure improvement
- [ ] Build "insights to prompts" UI

**Deliverables:**
- Aggregated insights API
- Prompt generation
- Injection mechanism
- Feedback tracking

---

## Long-Term Goals

### Fine-Tuning Data Collection

The structured output from session analysis creates potential training data:

- Input: Session segment
- Output: Structured node (classification, lessons, quirks, etc.)

Over time, this could be used to fine-tune a specialized "librarian" model (GLM-4.7 or similar) that's optimized for this specific task.

**Requirements:**
- Store raw session segments alongside analyzed nodes
- Track quality of analyses (user feedback)
- Export in fine-tuning format when ready

### Failure Mode Analysis

Aggregate task failures across all nodes:

1. Group by failure type/pattern
2. Identify common causes
3. Generate learning opportunities
4. Track if patterns decrease over time

### Cross-Project Learning

Lessons learned in one project may apply to others:

- Technique that worked in project A might help project B
- Architecture decision in project A might inform project B
- Same bug pattern across projects

---

## Open Questions

1. **Embedding model**: For semantic similarity, should we use local embeddings (slower, free) or API (faster, cost)?

2. **Session segment size**: How much context to include when analyzing a segment? Just the segment, or also surrounding context?

3. **Feedback mechanism**: How should user feedback on daemon decisions be incorporated? Directly edit the analysis? Separate feedback store?

4. **Privacy**: Should there be a way to exclude certain sessions from analysis? Redact sensitive content?

5. **Export**: Should we support exporting the knowledge graph? What formats?

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Session coverage | 90%+ of sessions analyzed within 24h |
| Query response time | < 3 seconds for simple queries |
| Graph render time | < 2 seconds for 100 nodes |
| Daemon uptime | 99%+ |
| Prompt improvement | Measurable reduction in known quirks |
| User satisfaction | "I understand my work better" |

---

## Appendix: Directory Structure

```
pi-brain/
├── src/
│   ├── daemon/
│   │   ├── watcher.ts
│   │   ├── queue.ts
│   │   ├── worker.ts
│   │   └── scheduler.ts
│   ├── parser/
│   │   ├── session.ts
│   │   ├── boundary.ts
│   │   └── segment.ts
│   ├── storage/
│   │   ├── database.ts
│   │   ├── nodes.ts
│   │   ├── edges.ts
│   │   └── queries.ts
│   ├── api/
│   │   ├── routes.ts
│   │   └── query-processor.ts
│   ├── web/
│   │   ├── app/
│   │   ├── components/
│   │   └── lib/
│   └── extension/
│       ├── brain-query.ts
│       └── brain-skill.md
├── prompts/
│   └── session-analyzer.md
├── docs/
│   ├── PLAN.md
│   ├── RESEARCH.md
│   └── SETUP.md
├── tests/
├── package.json
└── README.md

~/.pi-brain/
├── config.yaml
├── data/
│   ├── brain.db
│   └── nodes/
│       └── YYYY/MM/
├── prompts/
│   ├── session-analyzer.md
│   └── history/
└── logs/
    └── daemon.log
```
