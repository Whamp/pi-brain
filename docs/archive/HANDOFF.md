# pi-brain Session Handoff

## Context

We are building **pi-brain** (formerly pi-tree-viz), a "second brain" for pi coding agent sessions that analyzes, connects, and learns from every interaction.

## Documentation

### Planning

- `docs/PLAN.md` — Comprehensive implementation plan with 10 phases, data models, architecture

### Specifications (in `specs/`)

All specifications are complete:

| Spec                  | Description                                 | Status |
| --------------------- | ------------------------------------------- | ------ |
| `SPECS.md`            | Index of all spec files                     | ✅     |
| `overview.md`         | Design philosophy, architecture, tech stack | ✅     |
| `coding-standards.md` | Ultracite/oxlint setup, TypeScript config   | ✅     |
| `storage.md`          | SQLite schema, JSON node format, queries    | ✅     |
| `node-model.md`       | Node/edge types, boundaries, versioning     | ✅     |
| `pi-integration.md`   | Session format, extensions, CLI invocation  | ✅     |
| `sync-protocol.md`    | Hub/spoke, Syncthing, rsync                 | ✅     |
| `daemon.md`           | Watcher, queue, workers, scheduling         | ✅     |
| `session-analyzer.md` | Prompt, RLM/codemap skills, output schema   | ✅     |
| `api.md`              | REST API, WebSocket, endpoints              | ✅     |
| `web-ui.md`           | SvelteKit, components, D3 graph, dashboard  | ✅     |
| `prompt-learning.md`  | Insight aggregation, prompt injection       | ✅     |

## Key Technical Decisions

| Decision        | Choice                          | Rationale                                       |
| --------------- | ------------------------------- | ----------------------------------------------- |
| Linting         | Ultracite + oxlint + oxfmt      | Fast, zero-config, AI-ready                     |
| Database        | SQLite + JSON files             | Portable, queryable, human-readable             |
| Web framework   | SvelteKit                       | Fast, simple SSR                                |
| Visualization   | D3.js                           | Flexible node-link-node DAG                     |
| Daemon model    | Local GLM-4.7 via pi CLI        | Free tokens, future fine-tuning                 |
| Analysis skills | RLM (always) + codemap (always) | Handle long sessions, understand code structure |

## Architecture Summary

- **Hub/spoke model**: Desktop as hub, laptop as spoke, sessions sync to hub
- **Daemon**: Watches sessions, detects boundaries (10min idle, /tree, /fork, etc.), queues analysis
- **Analysis**: Pi agent with custom prompt + RLM + codemap skills extracts structured node data
- **Storage**: SQLite for queries, JSON for full content, versioned nodes
- **Interfaces**: Web UI (dashboard, graph viz), `/brain` command, `brain` skill

## Node Boundaries

Detected by:

- `branch_summary` entries → `branch` edge
- `parentId` mismatch → `tree_jump` edge
- `compaction` entries → `compaction` edge
- New session with `parentSession` → `fork` edge
- 10+ minute timestamp gap → `resume` edge

## Lessons Taxonomy

Multi-level lessons extracted from each node:

- Project, Task, User, Model, Tool, Skill, Subagent

Plus: Daemon can autonomously create new categories and logs decisions for user review.

## Dashboard Panels

Key metrics displayed:

- **Tool Use Failures by Model** — Table with model, tool, error type, count
- **Vague Goal Tracker** — Chart showing `hadClearGoal: false` trend over time
- **Failure Pattern Analysis** — Grouped failures by mode with learning opportunities
- **Daemon Decision Log** — Key decisions requiring user review/feedback

## Next Steps

1. Set up project structure with Ultracite
2. Implement Phase 1: Foundation (storage, config, prompts)
3. Implement Phase 2: Session parsing and boundary detection
4. Continue through phases per PLAN.md

## Source References

- Pi session format: `~/tools/pi-mono/packages/coding-agent/docs/session.md`
- Pi extensions: `~/tools/pi-mono/packages/coding-agent/docs/extensions.md`
- Pi RPC: `~/tools/pi-mono/packages/coding-agent/docs/rpc.md`
- Ultracite docs: https://docs.ultracite.ai/
- Project location: `/home/will/projects/pi-brain`
