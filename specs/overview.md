# Overview

pi-brain is a "second brain" for pi coding agent sessions — analyzing, connecting, and learning from every interaction.

## Design Philosophy

### Core Principles

1. **Understanding over recording** — Don't just store sessions; extract meaning, lessons, and connections
2. **Background intelligence** — Analysis happens automatically, invisibly, continuously
3. **Queryable knowledge** — Everything extracted is searchable, filterable, and explorable
4. **Feedback loops** — Insights flow back into future sessions as improved prompts
5. **Modular and shareable** — Works single-computer by default, scales to multi-machine

### Non-Goals

- **Real-time collaboration** — pi-brain is personal, not shared (but sync is supported)
- **Session editing** — We analyze sessions, we don't modify them
- **Model training** — We collect data that could enable training, but that's a future goal

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              HUB (Primary Computer)                         │
│                                                                             │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────────┐  │
│  │   Session   │──▶│   Daemon    │──▶│  Knowledge  │◀──│     Web UI      │  │
│  │   Watcher   │   │   Queue     │   │   Graph     │   │                 │  │
│  └─────────────┘   └─────────────┘   └─────────────┘   └─────────────────┘  │
│                           │                 ▲                               │
│                           ▼                 │                               │
│                    ┌─────────────┐   ┌─────────────┐                        │
│                    │  Pi Agent   │   │  Query API  │◀── /brain command      │
│                    │  + RLM Skill│   │             │                        │
│                    └─────────────┘   └─────────────┘                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      ▲
                                      │ Sync
┌───────────────────┐     ┌───────────────────┐
│  SPOKE (Laptop)   │     │  SPOKE (Server)   │
│  Pi Sessions      │     │  Pi Sessions      │
└───────────────────┘     └───────────────────┘
```

### Component Responsibilities

| Component           | Responsibility                                              |
| ------------------- | ----------------------------------------------------------- |
| **Session Watcher** | Monitors session directories, detects idle/boundary events  |
| **Daemon Queue**    | Manages analysis work queue, schedules jobs, spawns agents  |
| **Pi Agent**        | Analyzes sessions using RLM skill, extracts structured data |
| **Knowledge Graph** | SQLite + JSON storage for nodes, edges, lessons             |
| **Query API**       | HTTP/WebSocket interface for web UI and `/brain` command    |
| **Web UI**          | Dashboard, graph visualization, search, filtering           |

### Data Flow

1. **Session created/modified** → Watcher detects change
2. **Boundary detected** (idle 10min, `/tree`, `/fork`, etc.) → Job queued
3. **Agent spawned** → Analyzes segment using RLM + codemap skills (always loaded)
4. **Node created** → Stored in SQLite + JSON, edges created
5. **Query/browse** → Web UI or `/brain` command accesses data

## Technology Stack

| Layer             | Technology                 | Rationale                             |
| ----------------- | -------------------------- | ------------------------------------- |
| **Language**      | TypeScript                 | Consistency with pi-mono, type safety |
| **Linting**       | Ultracite (oxlint + oxfmt) | Fast, zero-config, AI-ready           |
| **Database**      | SQLite                     | Portable, embedded, SQL queries       |
| **Node Storage**  | JSON files                 | Human-readable, version-controllable  |
| **Web Framework** | SvelteKit                  | Fast, simple, SSR                     |
| **Graph Viz**     | D3.js                      | Flexible, industry standard           |
| **Daemon**        | Node.js process            | Matches pi ecosystem                  |
| **Agent**         | pi CLI (--mode json)       | Direct integration with pi            |

## Integration Points

### With pi-mono

| Touchpoint         | Description                                                       |
| ------------------ | ----------------------------------------------------------------- |
| **Session files**  | Read `.jsonl` files from `~/.pi/agent/sessions/`                  |
| **Session format** | Parse according to `docs/session.md` (version 3)                  |
| **Entry types**    | Handle all entry types: message, compaction, branch_summary, etc. |
| **RPC mode**       | Could use `pi --mode rpc` for deeper integration (future)         |
| **Extensions**     | Register `/brain` command and `brain_query` tool                  |
| **CLI invocation** | Spawn pi with `--system-prompt`, `--skills rlm,codemap`, `-p`     |

### Entry/Exit Points

| Interface        | Direction | Description                       |
| ---------------- | --------- | --------------------------------- |
| Session files    | In        | Raw session data to analyze       |
| `/brain` command | In/Out    | Query interface from pi           |
| `brain` skill    | In/Out    | Agent query interface             |
| Web UI           | Out       | Visual exploration and dashboards |
| Query API        | In/Out    | HTTP/WebSocket for all queries    |
| Config file      | In        | User configuration                |
| Prompt file      | In        | Session analyzer instructions     |

## Directory Structure

### Project Source

```
pi-brain/
├── src/
│   ├── daemon/           # Session watcher, queue, scheduler
│   ├── parser/           # Session parsing, boundary detection
│   ├── storage/          # SQLite, JSON, queries
│   ├── api/              # HTTP/WebSocket server
│   ├── web/              # SvelteKit frontend
│   └── extension/        # Pi extension for /brain
├── prompts/
│   └── session-analyzer.md
├── specs/                # Technical specifications
├── docs/                 # User documentation
├── tests/
└── package.json
```

### User Data

```
~/.pi-brain/
├── config.yaml           # User configuration
├── data/
│   ├── brain.db          # SQLite database
│   └── nodes/
│       └── YYYY/MM/      # JSON node files by date
├── prompts/
│   ├── session-analyzer.md    # Current prompt
│   └── history/               # Versioned prompts
└── logs/
    └── daemon.log
```

## Configuration

```yaml
# ~/.pi-brain/config.yaml

# Hub settings (where daemon runs)
hub:
  sessions_dir: ~/.pi/agent/sessions
  database_dir: ~/.pi-brain/data
  web_ui_port: 8765

# Spoke machines that sync sessions
spokes: []
  # - name: laptop
  #   sync_method: syncthing
  #   path: /synced/laptop-sessions

# Daemon behavior
daemon:
  idle_timeout_minutes: 10
  parallel_workers: 1
  reanalysis_schedule: "0 2 * * *" # Cron format, 2am nightly
  model: zai/glm-4.7
  provider: zai
  prompt_file: ~/.pi-brain/prompts/session-analyzer.md

# Query settings
query:
  model: zai/glm-4.7
  provider: zai
```

## Success Metrics

| Metric              | Target                                     |
| ------------------- | ------------------------------------------ |
| Session coverage    | 90%+ of sessions analyzed within 24h       |
| Query response time | < 3 seconds for simple queries             |
| Graph render time   | < 2 seconds for 100 nodes                  |
| Daemon uptime       | 99%+                                       |
| Prompt improvement  | Measurable reduction in known model quirks |

## Existing Code (from pi-tree-viz)

The following modules from the existing codebase can be reused:

| Module           | Path                      | Reusable For                      |
| ---------------- | ------------------------- | --------------------------------- |
| Session Parser   | `src/parser.ts`           | Phase 2: Session parsing          |
| Type Definitions | `src/types.ts`            | All phases: base types            |
| Tree Builder     | `src/parser.ts:buildTree` | Phase 2: Tree construction        |
| Session Analyzer | `src/analyzer.ts`         | Phase 2: Scanning, fork detection |
| CLI Framework    | `src/cli.ts`              | Phase 3: Daemon CLI base          |

### Modules to Rewrite

| Module    | Current            | Reason                             |
| --------- | ------------------ | ---------------------------------- |
| Generator | `src/generator.ts` | Replace static HTML with SvelteKit |
| Types     | `src/types.ts`     | Extend for full Node schema        |
