# Semantic Search Implementation Plan

Implementation plan for sqlite-vec based semantic brain queries.

**Spec**: [docs/specs/semantic-search.md](../specs/semantic-search.md)

## Overview

Add vector similarity search to brain queries using sqlite-vec. This enables finding semantically related sessions even when wording differs from the original.

## Dependencies

- sqlite-vec npm package (or native extension)
- Existing embedding infrastructure in `facet-discovery.ts`

## Tasks

### Phase 1: Foundation (sqlite-vec setup)

#### 1.1 Install sqlite-vec extension

- [ ] Research sqlite-vec installation options for Node.js
  - Option A: `sqlite-vec` npm package (if available)
  - Option B: Download prebuilt binary, load via `better-sqlite3`
- [ ] Add installation to package.json or setup script
- [ ] Document installation in README

**Acceptance**: `npm install` gets sqlite-vec working

#### 1.2 Load extension in database.ts

- [ ] Add extension loading to `openDatabase()`
- [ ] Handle missing extension gracefully (warn, continue without)
- [ ] Add `isVecExtensionLoaded()` helper function
- [ ] Test extension loads correctly

**Acceptance**: `db.prepare("SELECT vec_version()").get()` returns version

#### 1.3 Create migration for virtual table

- [ ] Create `012_semantic_search.sql` migration
- [ ] Create `node_embeddings_vec` virtual table
- [ ] Populate from existing `node_embeddings` if any exist
- [ ] Add index on `embedding_model`

**Acceptance**: Migration runs, virtual table exists

---

### Phase 2: Richer Embedding Format

#### 2.1 Create buildEmbeddingText function

- [ ] Create `src/storage/embedding-utils.ts`
- [ ] Implement `buildEmbeddingText(node: Node): string`
- [ ] Format: `[type] summary\n\nDecisions:\n- ...\n\nLessons:\n- ...`
- [ ] Handle missing decisions/lessons gracefully
- [ ] Add unit tests

**Acceptance**: Function produces expected format, tests pass

#### 2.2 Update facet-discovery embedding text

- [ ] Replace `buildEmbeddingText` in `FacetDiscovery` class
- [ ] Import from new `embedding-utils.ts`
- [ ] Ensure clustering still works with richer text

**Acceptance**: Existing facet discovery tests pass

---

### Phase 3: Embedding at Ingest Time

#### 3.1 Add embedding to worker node creation

- [ ] Import embedding provider in `worker.ts`
- [ ] After node creation, generate embedding
- [ ] Store in `node_embeddings` table
- [ ] Insert into `node_embeddings_vec` virtual table
- [ ] Handle embedding failure gracefully (log, continue)

**Acceptance**: New nodes get embeddings automatically

#### 3.2 Add storeEmbeddingWithVec helper

- [ ] Create function in `embedding-utils.ts` or `search-repository.ts`
- [ ] Inserts into both `node_embeddings` and `node_embeddings_vec`
- [ ] Handles upsert (update if exists)

**Acceptance**: Helper works for new and existing nodes

---

### Phase 4: Backfill Job

#### 4.1 Create backfill function

- [ ] Add `backfillEmbeddings()` to `facet-discovery.ts` or new file
- [ ] Find nodes missing embeddings or with outdated format
- [ ] Detect old format via `input_text NOT LIKE '%Decisions:%'`
- [ ] Process in batches of 10-50
- [ ] Update `clustering_runs` or add new tracking table

**Acceptance**: Function re-embeds nodes with old/missing embeddings

#### 4.2 Add to scheduler

- [ ] Add backfill job to `scheduler.ts`
- [ ] Run hourly or after clustering job
- [ ] Add config option to disable if needed

**Acceptance**: Scheduler runs backfill automatically

#### 4.3 Add CLI command for manual backfill

- [ ] Add `pi-brain rebuild --embeddings` command
- [ ] Shows progress (X of Y nodes)
- [ ] Option to force re-embed all: `--force`

**Acceptance**: Can trigger backfill manually

---

### Phase 5: Semantic Search Function

#### 5.1 Create semanticSearch function

- [ ] Add to `search-repository.ts` or new `semantic-search.ts`
- [ ] Accept query string, embed it
- [ ] Query `node_embeddings_vec` for nearest neighbors
- [ ] Return `{ nodeId, distance, summary }[]`
- [ ] Add threshold parameter

**Acceptance**: Function returns relevant nodes sorted by distance

#### 5.2 Add unit tests for semantic search

- [ ] Test with mock embeddings
- [ ] Test threshold filtering
- [ ] Test empty results case
- [ ] Test distance ordering

**Acceptance**: Tests pass

---

### Phase 6: Query Processor Integration

#### 6.1 Update findRelevantNodes in query-processor.ts

- [ ] Try semantic search first (if extension loaded and provider configured)
- [ ] Check if best result distance < threshold
- [ ] If good matches, use them
- [ ] If no matches or threshold exceeded, fall back to FTS
- [ ] Log which method was used

**Acceptance**: Brain queries use semantic search when available

#### 6.2 Add configuration for threshold

- [ ] Add `semantic_search_threshold` to `DaemonConfig`
- [ ] Add to config schema in `config/types.ts`
- [ ] Add to config loading in `config/config.ts`
- [ ] Default: 0.5

**Acceptance**: Threshold is configurable via config.yaml

#### 6.3 Integration tests

- [ ] Test end-to-end: create node → embed → query finds it
- [ ] Test fallback: disable embedding → FTS still works
- [ ] Test threshold: high distance → falls back to FTS

**Acceptance**: Integration tests pass

---

### Phase 7: Error Handling & Polish

#### 7.1 Graceful degradation

- [ ] If sqlite-vec not loaded, skip semantic search silently
- [ ] If embedding provider fails at query time, fall back to FTS
- [ ] If embedding provider fails at ingest, log and continue

**Acceptance**: System works without sqlite-vec or embedding provider

#### 7.2 Dimension mismatch handling

- [ ] Detect if stored embeddings have different dimensions than current model
- [ ] Log warning suggesting re-embed
- [ ] Don't crash on mismatch

**Acceptance**: Changing embedding model doesn't crash queries

#### 7.3 Documentation

- [ ] Update README with semantic search info
- [ ] Document config options
- [ ] Add troubleshooting for common issues

**Acceptance**: Users can configure and troubleshoot

---

### Phase 8: Migration & Rollout

#### 8.1 Run backfill on existing data

- [ ] Run `pi-brain rebuild --embeddings`
- [ ] Verify all nodes have new-format embeddings
- [ ] Check query quality with real queries

**Acceptance**: Existing nodes searchable with semantic queries

---

## Task Summary

| Phase                | Tasks  | Estimated Effort |
| -------------------- | ------ | ---------------- |
| 1. Foundation        | 3      | 2-3 hours        |
| 2. Embedding Format  | 2      | 1-2 hours        |
| 3. Ingest-time       | 2      | 2-3 hours        |
| 4. Backfill          | 3      | 2-3 hours        |
| 5. Search Function   | 2      | 2-3 hours        |
| 6. Query Integration | 3      | 3-4 hours        |
| 7. Error Handling    | 3      | 2-3 hours        |
| 8. Migration         | 1      | 1 hour           |
| **Total**            | **19** | **~16-22 hours** |

## Risks & Mitigations

| Risk                       | Mitigation                                         |
| -------------------------- | -------------------------------------------------- |
| sqlite-vec hard to install | Fall back to pure-JS vector search or skip feature |
| Embedding API costs        | Use local Ollama as default, API as option         |
| Query latency              | Index tuning, limit result count                   |
| Dimension mismatches       | Detect and warn, offer re-embed command            |

## Success Criteria

1. Brain query "what did we learn about caching" finds sessions about Redis, memoization
2. Query latency < 500ms for typical knowledge graphs
3. Graceful fallback to FTS when semantic search unavailable
4. No regressions in existing functionality

## Future Work (out of scope)

- Similar sessions panel in UI
- Lesson deduplication at ingest
- Quirk pattern matching
- Query suggestions
