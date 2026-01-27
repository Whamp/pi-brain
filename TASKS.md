# pi-brain Task Tracker

Track implementation progress. Agents update status as they complete work.

## Status Legend

| Status    | Meaning                           |
| --------- | --------------------------------- |
| `pending` | Not started                       |
| `active`  | Currently being worked on         |
| `done`    | Complete and validated            |
| `blocked` | Waiting on dependency or decision |

---

## Phase 1: Foundation

| ID  | Task                                                                             | Status | Deps | Notes      |
| --- | -------------------------------------------------------------------------------- | ------ | ---- | ---------- |
| 1.1 | Create project structure (src/daemon, src/parser, src/storage, src/api, src/web) | done   | -    | 2026-01-25 |
| 1.2 | Design and implement SQLite schema (see specs/storage.md)                        | done   | -    | 2026-01-25 |
| 1.3 | Implement JSON file storage for nodes                                            | done   | 1.2  | 2026-01-25 |
| 1.4 | Create configuration system (YAML-based, ~/.pi-brain/config.yaml)                | done   | -    | 2026-01-25 |
| 1.5 | Set up prompt file structure with versioning                                     | done   | -    | 2026-01-25 |
| 1.6 | Write initial session-analyzer prompt                                            | done   | 1.5  | 2026-01-25 |

## Phase 2: Session Parsing

| ID  | Task                                                                | Status | Deps | Notes            |
| --- | ------------------------------------------------------------------- | ------ | ---- | ---------------- |
| 2.1 | Enhance existing parser to detect all boundary types                | done   | 1.1  | 2026-01-25       |
| 2.2 | Implement branch_summary entry detection (tree/branch with summary) | done   | 2.1  | Completed in 2.1 |
| 2.3 | Implement parentId mismatch detection (tree without summary)        | done   | 2.1  | Completed in 2.1 |
| 2.4 | Implement compaction entry detection                                | done   | 2.1  | Completed in 2.1 |
| 2.5 | Implement fork detection (new sessions with parentSession)          | done   | 2.1  | 2026-01-25       |
| 2.6 | Implement 10-minute timestamp gap detection (resume)                | done   | 2.1  | Completed in 2.1 |
| 2.7 | Implement segment extraction (start_entry_id, end_entry_id)         | done   | 2.1  | Completed in 2.1 |
| 2.8 | Write tests with real session files                                 | done   | 2.7  | 2026-01-25       |

## Phase 3: Daemon Core

| ID  | Task                                                   | Status | Deps     | Notes            |
| --- | ------------------------------------------------------ | ------ | -------- | ---------------- |
| 3.1 | Implement file watcher (inotify or polling)            | done   | 1.1      | 2026-01-25       |
| 3.2 | Implement analysis queue (SQLite-backed)               | done   | 1.2      | 2026-01-25       |
| 3.3 | Implement idle detection (10-minute timeout)           | done   | 3.1      | Completed in 3.1 |
| 3.4 | Implement job processor (spawns pi agent)              | done   | 3.2      | 2026-01-25       |
| 3.5 | Implement pi agent invocation with correct flags       | done   | 3.4      | 2026-01-25       |
| 3.6 | Parse agent output (JSON mode)                         | done   | 3.5      | 2026-01-25       |
| 3.7 | Store nodes and edges in database                      | done   | 3.6, 1.2 | 2026-01-25       |
| 3.8 | Implement error handling and retry logic               | done   | 3.4      | 2026-01-25       |
| 3.9 | Implement daemon CLI (start, stop, status, queue info) | done   | 3.1-3.8  | 2026-01-25       |

## Phase 4: Node Storage & Queries

| ID   | Task                                               | Status | Deps     | Notes                               |
| ---- | -------------------------------------------------- | ------ | -------- | ----------------------------------- |
| 4.1  | Implement node creation (with JSON file)           | done   | 1.2, 1.3 | 2026-01-25 (completed in 3.7)       |
| 4.2  | Implement node versioning (reanalysis)             | done   | 4.1      | 2026-01-25 (implemented updateNode) |
| 4.3  | Implement edge creation                            | done   | 4.1      | 2026-01-25                          |
| 4.4  | Implement tag/topic indexing                       | done   | 4.1      | 2026-01-25                          |
| 4.5  | Build query layer: by project, type, date range    | done   | 4.1      | 2026-01-25                          |
| 4.6  | Build query layer: by tags, topics                 | done   | 4.4      | 2026-01-25                          |
| 4.7  | Build query layer: full-text search on summaries   | done   | 4.1      | 2026-01-25                          |
| 4.8  | Build query layer: graph traversal (related nodes) | done   | 4.3      | 2026-01-25                          |
| 4.9  | Implement lesson aggregation queries               | done   | 4.1      | 2026-01-25                          |
| 4.10 | Implement model quirk aggregation queries          | done   | 4.1      | 2026-01-25                          |
| 4.11 | Implement tool error aggregation queries           | done   | 4.1      | 2026-01-25                          |

## Phase 5: Web UI - Core

| ID  | Task                                                         | Status | Deps         | Notes                                   |
| --- | ------------------------------------------------------------ | ------ | ------------ | --------------------------------------- |
| 5.1 | Set up web framework (SvelteKit)                             | done   | -            | 2026-01-26                              |
| 5.2 | Implement API routes for queries                             | done   | 5.1, 4.5-4.8 | 2026-01-26                              |
| 5.3 | Build graph visualization component (D3.js) - node rendering | done   | 5.1          | 2026-01-26                              |
| 5.4 | Build graph visualization component - edge rendering         | done   | 5.3          | 2026-01-26 - force-directed links       |
| 5.5 | Build graph visualization component - zoom, pan, filter      | done   | 5.3          | 2026-01-26 - +/-/reset/fit, drag, panel |
| 5.6 | Build graph visualization component - click to select        | done   | 5.3          | 2026-01-26 - click + dblclick navigate  |
| 5.7 | Build node detail panel                                      | done   | 5.6          | 2026-01-26 - browser verified           |
| 5.8 | Build search interface                                       | done   | 5.2          | 2026-01-26 - filters, pagination, cards |
| 5.9 | Build file browser view                                      | done   | 5.2          | 2026-01-26 - sessions API + browser UI  |

## Phase 6: Web UI - Dashboard

| ID  | Task                                          | Status | Deps      | Notes                                     |
| --- | --------------------------------------------- | ------ | --------- | ----------------------------------------- |
| 6.1 | Implement tool use failures by model panel    | done   | 5.1, 4.11 | 2026-01-26                                |
| 6.2 | Implement vague goal tracker panel            | done   | 5.1, 4.5  | 2026-01-26                                |
| 6.3 | Implement recent activity timeline            | done   | 5.1, 4.5  | 2026-01-26                                |
| 6.4 | Implement daemon decision log with feedback   | done   | 5.1       | 2026-01-26                                |
| 6.5 | Implement quick stats panel                   | done   | 5.1, 4.5  | 2026-01-26                                |
| 6.6 | Implement real-time daemon status (WebSocket) | done   | 5.1, 3.9  | 2026-01-26 (status only, not full WS yet) |

## Phase 7: Pi Integration

| ID  | Task                                     | Status | Deps    | Notes                          |
| --- | ---------------------------------------- | ------ | ------- | ------------------------------ |
| 7.1 | Implement brain-query extension          | done   | 4.5-4.8 | 2026-01-26 - built & tested    |
| 7.2 | Implement /brain command                 | done   | 7.1     | Completed in 7.1               |
| 7.3 | Create query processing (pi agent + RLM) | done   | 7.1     | 2026-01-26 - query-processor   |
| 7.4 | Create brain skill for agent use         | done   | 7.1     | 2026-01-26 - skills/brain/     |
| 7.5 | Implement brain-query tool               | done   | 7.1     | Completed in 7.1               |
| 7.6 | Test integration end-to-end              | done   | 7.1-7.5 | 2026-01-26 - extension + tests |

## Phase 8: Nightly Processing

| ID   | Task                                                  | Status | Deps         | Notes                                          |
| ---- | ----------------------------------------------------- | ------ | ------------ | ---------------------------------------------- |
| 8.1  | Implement scheduler (cron-like or systemd timer)      | done   | 3.9          | 2026-01-26 - croner lib, 25 tests              |
| 8.2  | Implement reanalysis queue population                 | done   | 8.1, 4.2     | 2026-01-26 - scheduler updated                 |
| 8.3  | Implement connection discovery - semantic similarity  | done   | 8.1          | 2026-01-26 - connection-discovery.ts           |
| 8.4  | Implement connection discovery - reference detection  | done   | 8.1          | 2026-01-26 - Node IDs                          |
| 8.5  | Implement connection discovery - lesson reinforcement | done   | 8.1          | 2026-01-26                                     |
| 8.6  | Implement pattern aggregation - failure patterns      | done   | 8.1, 4.11    | 2026-01-26 - confirmed implemented & tested    |
| 8.7  | Implement pattern aggregation - model quirks          | done   | 8.1, 4.10    | 2026-01-26 - implemented model_stats update    |
| 8.8  | Implement pattern aggregation - lessons               | done   | 8.1, 4.9     | 2026-01-26 - implemented with 005 migration    |
| 8.9  | Update failure_patterns table                         | done   | 8.6          | 2026-01-26 - handled by scheduler & aggregator |
| 8.10 | Surface patterns in dashboard                         | done   | 8.6-8.9, 6.1 | 2026-01-26                                     |

## Phase 9: Multi-Computer Sync

| ID  | Task                                         | Status | Deps     | Notes                                    |
| --- | -------------------------------------------- | ------ | -------- | ---------------------------------------- |
| 9.1 | Document Syncthing setup for spokes          | done   | -        | 2026-01-26 - SYNCTHING-SETUP.md          |
| 9.2 | Implement rsync-based sync option            | done   | 3.1      | 2026-01-26 - sync module, CLI, docs      |
| 9.3 | Implement spoke configuration in config.yaml | done   | 1.4      | 2026-01-26 - enabled, schedule, rsyncOpt |
| 9.4 | Daemon watches synced directories            | done   | 3.1, 9.3 | 2026-01-26                               |
| 9.5 | Computer field populated correctly           | done   | 3.7      | 2026-01-26 - spoke name or hostname      |

## Phase 10: Prompt Learning Pipeline

| ID    | Task                                                                                   | Status | Deps      | Notes                          |
| ----- | -------------------------------------------------------------------------------------- | ------ | --------- | ------------------------------ |
| 10.1  | Aggregate model-specific learnings                                                     | done   | 4.10      | 2026-01-26 - InsightAggregator |
| 10.2  | Generate model-specific prompt additions                                               | done   | 10.1      | 2026-01-26                     |
| 10.3  | Implement skill-based prompt injection (brain-insights skill)                          | done   | 10.2      | 2026-01-26                     |
| 10.4  | Create `prompt_effectiveness` table migration                                          | done   | 10.3      | 2026-01-26                     |
| 10.5  | Implement `measureEffectiveness()` function                                            | done   | 10.4      | 2026-01-26                     |
| 10.6  | Implement auto-disable for ineffective insights                                        | done   | 10.5      | 2026-01-26                     |
| 10.7  | Add effectiveness tracking to nightly pipeline                                         | done   | 10.6      | 2026-01-26                     |
| 10.8  | Build prompt learning dashboard UI (`/prompt-learning` route)                          | done   | 10.7, 5.1 | 2026-01-26                     |
| 10.9  | Build insight editor component                                                         | done   | 10.8      | 2026-01-26                     |
| 10.10 | Add CLI commands for prompt-learning (run, insights, preview, enable/disable, measure) | done   | 10.3      | 2026-01-26                     |

## Phase 11: Signals & Insights

| ID    | Task                                                                    | Status  | Deps | Notes                               |
| ----- | ----------------------------------------------------------------------- | ------- | ---- | ----------------------------------- |
| 11.1  | Implement friction signal detection (rephrasing, abandonment, churn)    | done    | 2.1  | 2026-01-26                          |
| 11.2  | Implement delight signal detection (resilience, one-shot success)       | done    | 2.1  | 2026-01-26                          |
| 11.3  | Update Node model to include `signals` (friction/delight scores, flags) | done    | 1.2  | 2026-01-26 - integrated into worker |
| 11.4  | Implement `/brain --flag` manual notation command                       | done    | 7.2  | 2026-01-26 - 13 tests               |
| 11.5  | Implement facet discovery pipeline (embedding + clustering)             | done    | 8.1  | 2026-01-26 - see 11.5a for lint fix |
| 11.5a | Fix conditional expects in facet-discovery tests                        | done    | 11.5 | 2026-01-26                          |
| 11.6  | Implement LLM cluster analysis and naming                               | done    | 11.5 | 2026-01-26                          |
| 11.7  | Build "News Feed" UI component for clusters and signals                 | pending | 5.1  |                                     |
| 11.8  | Implement Model-Specific AGENTS.md generator                            | pending | 10.1 |                                     |
| 11.9  | Add clustering job to nightly scheduler                                 | pending | 8.1  |                                     |
| 11.10 | Surface "Abandoned Restart" patterns in dashboard                       | pending | 11.1 |                                     |

## Phase 12: Architecture Hardening

| ID   | Task                                                                        | Status  | Deps | Notes                                        |
| ---- | --------------------------------------------------------------------------- | ------- | ---- | -------------------------------------------- |
| 12.1 | Refactor: Shared Type Library (extract to `src/types` or configure imports) | done    | 5.1  | 2026-01-26 - extracted to src/types/index.ts |
| 12.2 | Architecture: Idempotent Ingestion (deterministic IDs or upsert logic)      | pending | 3.7  | TODO-36554ff9                                |
| 12.3 | Architecture: SQLite Rebuild CLI (restore DB from JSON)                     | done    | 4.1  | 2026-01-26 - added rebuild-index command     |
| 12.4 | Fix target deduplication in detectLessonReinforcement                       | pending | 8.5  | TODO-6347f019                                |
| 12.5 | Return counts from PatternAggregator methods for status reporting           | pending | 8.6  | TODO-10af064f                                |
| 12.6 | Make hardcoded limits configurable in nightly processing                    | pending | 8.1  | TODO-a2c7972a                                |
| 12.7 | Add JSDoc to connection-discovery.ts public methods                         | pending | 8.3  | TODO-42ac82b8                                |
