# Plan: Native AutoMem Port ("Super pi-brain")

**Date:** 2026-01-28
**Goal:** Enhance pi-brain with "AutoMem-style" capabilities (Consolidation, Typed Edges, Multi-hop Recall) natively within the existing SQLite architecture, avoiding external dependencies.

## Rationale

- **Philosophy:** `pi` tools should be lightweight and local. Running a 3-container Docker stack (AutoMem) for a single-user tool is overkill.
- **Performance:** `sqlite-vec` + BetterSQLite3 is sufficient for the scale of a single developer's history (<100k vectors).
- **Consolidation:** `pi-brain` currently only _accumulates_. Adding decay and forgetting prevents noise accumulation.
- **Reasoning:** Typed edges enable "why" queries (e.g., "Why did we choose X?").

## Core Features to Port

1.  **Typed Relationships** (Schema Upgrade)
    - Migrate from generic `edges` to 11 semantic types (e.g., `PREFERS_OVER`, `CONTRADICTS`, `LEADS_TO`).
    - Update analyzer prompt to extract these specific types.

2.  **Biological Consolidation** (Daemon Module)
    - **Decay:** Daily job to lower `relevance_score` based on age and lack of access.
    - **Creative:** Weekly job to find non-obvious connections between disparate nodes (using vector similarity).
    - **Cluster:** Monthly job to group nodes into "Meta-Patterns".
    - **Forget:** Archive/delete nodes with low relevance to keep the graph fast and relevant.

3.  **Hybrid Scoring & Multi-Hop Recall** (Query Layer)
    - Implement the 9-component scoring algorithm (Vector + Keyword + Relation + Temporal + etc.).
    - Implement "Bridge Discovery": Traversal logic to find connecting nodes (A -> B -> C) to explain context.

## Implementation Steps

### Phase 1: Schema & Data Model

- [ ] Create migration for `nodes` table: Add `relevance_score`, `last_accessed`, `archived` flags.
- [ ] Create migration for `edges` table: Add `confidence`, `similarity` columns (if missing).
- [ ] Define the 11 relationship types in `src/types/index.ts`.

### Phase 2: Analyzer Upgrade

- [ ] Update `src/daemon/prompts/session-analyzer.md` to instruct the LLM to use specific edge types.
- [ ] Update `src/daemon/processor.ts` to parse and store these typed edges.

### Phase 3: Consolidation Engine

- [ ] Create `src/daemon/consolidation/` module.
- [ ] Implement `DecayScheduler` (cron job).
- [ ] Implement `RelevanceCalculator` (Math.exp decay formula).
- [ ] Implement `CreativeAssociator` (Vector similarity search for unconnected nodes).

### Phase 4: Query Engine Upgrade

- [ ] Update `src/storage/search-repository.ts` to implement Hybrid Scoring.
- [ ] Create `src/storage/bridge-discovery.ts` for multi-hop graph traversal.
- [ ] Expose new query capabilities via `/api/v1/query`.

### Phase 5: UI & Visualization

- [ ] Update Web UI graph view to color-code edge types.
- [ ] Add "Relevance" visualization (fade out old/unimportant nodes).

## Success Metrics

- **Recall Accuracy:** Does `/brain "Why X?"` return the causal decision node?
- **Graph Hygiene:** Does the DB size stay manageable? (Old/useless nodes get archived).
- **Latency:** Query time remains <100ms.
