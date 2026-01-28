# pi-brain Specifications

Technical specifications for implementing pi-brain.

## Core

- [Overview](overview.md) - Design philosophy, goals, and architecture overview
- [Coding Standards](coding-standards.md) - Linting, formatting, TypeScript configuration

## Data

- [Storage](storage.md) - SQLite schema, JSON file format, directory structure
- [Node Model](node-model.md) - Node and edge data structures, boundaries, versioning

## Integration

- [Pi Integration](pi-integration.md) - Session format, RPC, extensions, CLI invocation
- [Sync Protocol](sync-protocol.md) - Hub/spoke architecture, sync methods

## Daemon

- [Daemon Architecture](daemon.md) - Process management, queue system, agent invocation
- [Session Analyzer](session-analyzer.md) - Prompt design, RLM/codemap skills, output format

## Interfaces

- [API Specification](api.md) - HTTP/WebSocket APIs for web UI and queries
- [Web UI](web-ui.md) - Frontend architecture, components, visualization, dashboard panels

## Signals & Insights

- [Signals](signals.md) - Friction/delight detection, manual flags, facet discovery, embedding configuration
- [Semantic Search](semantic-search.md) - Vector similarity search for brain queries using sqlite-vec

## Future

- [Prompt Learning](prompt-learning.md) - Systematic prompt improvement pipeline

---

## Key Design Decisions

| Decision         | Choice                                                              |
| ---------------- | ------------------------------------------------------------------- |
| **Skills**       | RLM + codemap always loaded for every analysis                      |
| **User Query**   | `/brain <question>` command in pi                                   |
| **Agent Query**  | `brain_query` tool + `brain` skill                                  |
| **Dashboard**    | Tool errors, vague goal tracker, failure patterns, daemon decisions |
| **hadClearGoal** | Analyzer detects vague prompts and marks accordingly                |

## Spec Summary

| Spec                | Description                                | Status      |
| ------------------- | ------------------------------------------ | ----------- |
| overview.md         | Architecture, tech stack, data flow        | ✅ Complete |
| coding-standards.md | Ultracite, TypeScript, testing             | ✅ Complete |
| storage.md          | SQLite schema, JSON format, queries        | ✅ Complete |
| node-model.md       | Node/edge types, boundaries, versioning    | ✅ Complete |
| pi-integration.md   | Session format, extensions, CLI            | ✅ Complete |
| sync-protocol.md    | Hub/spoke, Syncthing, rsync                | ✅ Complete |
| daemon.md           | Watcher, queue, workers, scheduling        | ✅ Complete |
| session-analyzer.md | Prompt, RLM/codemap, output schema         | ✅ Complete |
| api.md              | REST API, WebSocket, endpoints             | ✅ Complete |
| web-ui.md           | SvelteKit, components, D3 graph, dashboard | ✅ Complete |
| prompt-learning.md  | Insight aggregation, prompt injection      | ✅ Complete |
| signals.md          | Friction/delight, clustering, embeddings   | ✅ Complete |
| semantic-search.md  | Vector similarity search, sqlite-vec       | 📋 Planned  |

## Implementation Order

Recommended order for implementing based on dependencies:

1. **Foundation** (Week 1)
   - `coding-standards.md` → Project setup with Ultracite
   - `storage.md` → SQLite schema, migrations
   - `node-model.md` → TypeScript types

2. **Parsing** (Week 2)
   - `pi-integration.md` → Session parser, boundary detection
   - `node-model.md` → Segment extraction

3. **Daemon Core** (Week 3-4)
   - `daemon.md` → File watcher, queue, workers
   - `session-analyzer.md` → Initial prompt, agent invocation

4. **Storage & Queries** (Week 4-5)
   - `storage.md` → Node CRUD, query layer
   - `api.md` → Core REST endpoints

5. **Web UI Core** (Week 5-6)
   - `web-ui.md` → SvelteKit setup, graph component
   - `api.md` → WebSocket integration

6. **Dashboard** (Week 6-7)
   - `web-ui.md` → Dashboard panels, metrics
   - `api.md` → Stats endpoints

7. **Pi Integration** (Week 7-8)
   - `pi-integration.md` → Extension, /brain command
   - `api.md` → Query endpoint

8. **Sync & Multi-computer** (Week 8-9)
   - `sync-protocol.md` → Syncthing/rsync setup
   - `daemon.md` → Multi-directory watching

9. **Prompt Learning** (Week 9-10)
   - `prompt-learning.md` → Aggregation, generation
   - `session-analyzer.md` → Feedback integration

## Cross-References

### Data Flow

```
pi-integration.md     →  node-model.md      →  storage.md
(session parsing)        (boundaries)           (SQLite + JSON)
       ↓                      ↓                      ↓
daemon.md             →  session-analyzer.md →  api.md
(queue, workers)         (prompt, output)       (REST, WebSocket)
       ↓                      ↓                      ↓
sync-protocol.md      →  prompt-learning.md  →  web-ui.md
(multi-computer)         (feedback loop)        (visualization)
```

### Key Types (defined in node-model.md, used everywhere)

- `Node` - Core data structure
- `Edge` - Node connections
- `Lesson` - Extracted insights
- `Boundary` - Segment detection
- `ModelQuirk` - Model observations
- `ToolError` - Tool usage patterns
