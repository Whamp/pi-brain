# AutoMem Features Specification

This document specifies the integration of AutoMem-inspired capabilities into pi-brain's native architecture.

## 1. Relationship Model

Adopt AutoMem's typed relationship model to enable semantic reasoning.

### Edge Types

The `type` column in the `edges` table will support the following values:

| Type              | Description            | Example                       |
| ----------------- | ---------------------- | ----------------------------- |
| `RELATES_TO`      | General connection     | Bug report → Related issue    |
| `LEADS_TO`        | Causal relationship    | Problem → Solution            |
| `OCCURRED_BEFORE` | Temporal sequence      | Planning → Execution          |
| `PREFERS_OVER`    | User preferences       | PostgreSQL → MongoDB          |
| `EXEMPLIFIES`     | Pattern examples       | Code review → Best practice   |
| `CONTRADICTS`     | Conflicting info       | Old approach → New approach   |
| `REINFORCES`      | Supporting evidence    | Decision → Validation         |
| `INVALIDATED_BY`  | Outdated info          | Legacy docs → Current docs    |
| `EVOLVED_INTO`    | Knowledge evolution    | Initial design → Final design |
| `DERIVED_FROM`    | Source tracking        | Implementation → Spec         |
| `PART_OF`         | Hierarchical structure | Feature → Epic                |

### Schema Updates

**Table: `edges`**

- `type` (TEXT, NOT NULL) - One of the enum values above.
- `confidence` (REAL) - 0.0 to 1.0.
- `similarity` (REAL) - Vector cosine similarity (optional).

## 2. Memory Consolidation

Implement a "Sleep Cycle" system to manage the knowledge graph's lifecycle.

### Relevance Scoring

Formula for `nodes.relevance_score` (0.0 - 1.0):

```typescript
relevance =
  decay_factor(age) *
  (0.3 + 0.3 * access_recency) *
  relationship_density_factor *
  (0.5 + importance) *
  (0.7 + 0.3 * confidence);
```

- **Base Decay Rate:** 0.1 (daily)
- **Archive Threshold:** < 0.2
- **Delete Threshold:** < 0.05 (unless protected)

### Cycles

1.  **Decay (Daily)**
    - Iterate all non-archived nodes.
    - Recalculate `relevance_score`.
    - Update `nodes` table.

2.  **Creative (Weekly)**
    - Sample random nodes with `relevance > 0.3`.
    - Perform vector search to find similar but unconnected nodes.
    - Create `SHARES_THEME` or `RELATES_TO` edges if similarity > 0.75.

3.  **Cluster (Monthly)**
    - Use DBSCAN or similar on node embeddings.
    - Group dense clusters.
    - Create a "Meta-Node" summarizing the cluster.
    - Link cluster members to Meta-Node via `PART_OF`.

4.  **Forget (Quarterly)**
    - Mark nodes < 0.2 as `archived = true`.
    - Delete nodes < 0.05 (optional, configurable).

## 3. Hybrid Search & Scoring

Enhance the `/search` endpoint to use a weighted scoring algorithm.

### Components

| Component      | Weight | Source                    |
| -------------- | ------ | ------------------------- |
| **Vector**     | 0.25   | `sqlite-vec` distance     |
| **Keyword**    | 0.15   | FTS5 Match                |
| **Relation**   | 0.25   | Graph centrality / degree |
| **Content**    | 0.25   | Exact token overlap       |
| **Temporal**   | 0.15   | Proximity to time query   |
| **Tag**        | 0.10   | Tag match                 |
| **Importance** | 0.05   | `node.importance`         |
| **Recency**    | 0.10   | `node.timestamp` vs now   |

### Multi-Hop Bridge Discovery

When searching, do not just return top-K matches.

1.  **Seed Retrieval:** Get top N results using Hybrid Scoring.
2.  **Expansion:** For each seed, traverse outgoing edges (`LEADS_TO`, `DERIVED_FROM`, etc.).
3.  **Path Scoring:** Score the path based on edge confidence.
4.  **Result:** Return the path (Source -> Bridge -> Target) to explain context.

## 4. Analyzer Prompts

Update `session-analyzer.md` to explicitly request these edge types.

```markdown
When connecting nodes, use one of these specific types:

- LEADS_TO: Causal (A caused B)
- PREFERS_OVER: Preference (Chose A instead of B)
  ...
```

## 5. Persistence

- **Nodes Table:** Add `relevance_score`, `last_accessed`, `archived`.
- **Meta-Nodes:** Stored in `nodes` table with `type='MetaPattern'`.
