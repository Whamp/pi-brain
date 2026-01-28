# Semantic Search Specification

Vector similarity search for brain queries using sqlite-vec.

## Overview

Enable the `brain_query` tool to find semantically related sessions even when wording differs. "What did we learn about caching?" should find sessions about "Redis performance", "memoization patterns", and "CDN configuration" even if they don't contain the word "caching".

### Goals

1. **Semantic matching** - Find related content by meaning, not just keywords
2. **Low latency** - Queries return in <500ms for typical knowledge graphs
3. **Always available** - Graceful fallback to FTS when vector search fails
4. **Minimal config** - Works out of the box with sensible defaults

### Non-Goals (for now)

- Ingest-time deduplication (lessons, quirks)
- Multiple embeddings per node
- Incremental clustering improvements
- Real-time similar session suggestions

## Key Decisions

| Decision             | Choice                        | Rationale                                                         |
| -------------------- | ----------------------------- | ----------------------------------------------------------------- |
| Extension            | sqlite-vec                    | Simpler install than sqlite-vss, actively maintained, same author |
| Embed content        | Summary + decisions + lessons | Covers all query patterns (decisions, lessons, patterns)          |
| When to embed        | Hybrid: ingest + backfill     | New nodes immediately queryable, batch catches gaps               |
| Search strategy      | Vector-first, FTS fallback    | Semantic search primary, keywords for exact matches               |
| Similarity threshold | 0.5 (configurable)            | Balanced between precision and recall                             |
| Query embedding      | Same provider, raw text       | Simple, modern models handle query/doc in same space              |
| Embedding table      | Reuse existing, richer text   | One embedding per node, simpler schema                            |

## Schema Changes

### sqlite-vec Virtual Table

```sql
-- Virtual table for vector similarity search
-- Links to node_embeddings table via rowid
CREATE VIRTUAL TABLE node_embeddings_vec USING vec0(
    embedding float[4096]  -- Dimension matches embedding model
);
```

Note: Dimension is configurable based on embedding model:

- `qwen/qwen3-embedding-8b`: 4096
- `text-embedding-3-small`: 1536
- `nomic-embed-text`: 768

### Updated node_embeddings Table

The existing `node_embeddings` table remains unchanged:

```sql
CREATE TABLE node_embeddings (
    node_id TEXT PRIMARY KEY,
    embedding BLOB NOT NULL,        -- Float32 array as binary
    embedding_model TEXT NOT NULL,  -- Model used
    input_text TEXT NOT NULL,       -- Source text that was embedded
    created_at TEXT DEFAULT (datetime('now')),

    FOREIGN KEY (node_id) REFERENCES nodes(id)
);
```

The `input_text` format changes from `[type] summary` to richer content (see Embedding Format below).

### Configuration Schema

Add to `~/.pi-brain/config.yaml`:

```yaml
daemon:
  # Existing embedding config
  embedding_provider: openrouter # ollama, openai, openrouter
  embedding_model: qwen/qwen3-embedding-8b
  embedding_api_key: sk-or-v1-...
  embedding_dimensions: 4096 # Must match model output

  # New semantic search config
  semantic_search_threshold: 0.5 # 0.0-1.0, distance above which FTS fallback triggers
```

## Embedding Format

### Input Text Structure

Each node is embedded as a single text combining summary, decisions, and lessons:

```
[{type}] {summary}

Decisions:
- {decision.what} (why: {decision.why})
- ...

Lessons:
- {lesson.summary}
- ...
```

### Example

```
[coding] Implemented rate limiting for API endpoints using token bucket algorithm

Decisions:
- Used token bucket algorithm (why: predictable behavior under burst traffic)
- Chose Redis for rate limit storage (why: shared state across instances)
- Set 100 req/min default limit (why: matches our SLA commitments)

Lessons:
- Redis MULTI/EXEC is essential for atomic increment + expire operations
- Consider circuit breaker pattern for downstream service failures
- Load testing should simulate burst patterns, not just steady state
```

### Text Building Function

```typescript
function buildEmbeddingText(node: Node): string {
  const parts: string[] = [];

  // Type + Summary
  parts.push(`[${node.classification.type}] ${node.content.summary}`);

  // Key decisions
  if (node.content.keyDecisions.length > 0) {
    parts.push("");
    parts.push("Decisions:");
    for (const decision of node.content.keyDecisions) {
      parts.push(`- ${decision.what} (why: ${decision.why})`);
    }
  }

  // Lessons (all levels)
  const allLessons = Object.values(node.lessons).flat();
  if (allLessons.length > 0) {
    parts.push("");
    parts.push("Lessons:");
    for (const lesson of allLessons) {
      parts.push(`- ${lesson.summary}`);
    }
  }

  return parts.join("\n");
}
```

## Embedding Generation

### At Ingest Time

When a node is created or updated in `worker.ts`:

```typescript
async function processAnalysisResult(node: Node): Promise<void> {
  // ... existing node creation logic ...

  // Generate embedding for semantic search
  if (config.embeddingProvider) {
    try {
      const text = buildEmbeddingText(node);
      const embedding = await embeddingProvider.embed([text]);
      await storeEmbedding(db, node.id, embedding[0], text);
      await updateVecIndex(db, node.id, embedding[0]);
    } catch (error) {
      // Log but don't fail - backfill job will catch it
      logger.warn(`Failed to embed node ${node.id}: ${error.message}`);
    }
  }
}
```

### Batch Backfill Job

Scheduled job to embed nodes missing embeddings or with outdated text format:

```typescript
async function backfillEmbeddings(
  db: Database,
  provider: EmbeddingProvider
): Promise<void> {
  // Find nodes needing embedding
  const nodes = db
    .prepare(
      `
    SELECT n.id, n.data_file
    FROM nodes n
    LEFT JOIN node_embeddings ne ON n.id = ne.node_id
    WHERE ne.node_id IS NULL
       OR ne.embedding_model != ?
       OR ne.input_text NOT LIKE 'Decisions:%'  -- Detect old format
    ORDER BY n.timestamp DESC
    LIMIT 100
  `
    )
    .all(provider.modelName);

  for (const batch of chunk(nodes, 10)) {
    // Load full node data, build text, embed, store
  }
}
```

### Scheduler Integration

Add to existing scheduler in `scheduler.ts`:

```typescript
// Run backfill every hour (or after clustering)
schedule("0 * * * *", () => backfillEmbeddings(db, embeddingProvider));
```

## Query Flow

### Search Function

```typescript
interface SemanticSearchResult {
  nodeId: string;
  distance: number;
  summary: string;
}

async function semanticSearch(
  db: Database,
  query: string,
  provider: EmbeddingProvider,
  options: { limit?: number; threshold?: number } = {}
): Promise<SemanticSearchResult[]> {
  const limit = options.limit ?? 20;
  const threshold = options.threshold ?? 0.5;

  // Embed the query
  const [queryEmbedding] = await provider.embed([query]);

  // Vector similarity search
  const results = db
    .prepare(
      `
    SELECT 
      ne.node_id,
      vec_distance_cosine(nev.embedding, ?) as distance,
      fts.summary
    FROM node_embeddings_vec nev
    JOIN node_embeddings ne ON ne.rowid = nev.rowid
    JOIN nodes_fts fts ON fts.node_id = ne.node_id
    WHERE distance < ?
    ORDER BY distance ASC
    LIMIT ?
  `
    )
    .all(serializeEmbedding(queryEmbedding), threshold, limit);

  return results;
}
```

### Query Processor Integration

Update `query-processor.ts`:

```typescript
async function findRelevantNodes(
  db: Database,
  query: string,
  config: QueryProcessorConfig
): Promise<NodeRow[]> {
  // Try semantic search first
  if (config.embeddingProvider) {
    const semanticResults = await semanticSearch(
      db,
      query,
      config.embeddingProvider,
      { threshold: config.semanticSearchThreshold }
    );

    if (semanticResults.length > 0) {
      logger.info(`Semantic search found ${semanticResults.length} results`);
      return loadNodes(
        db,
        semanticResults.map((r) => r.nodeId)
      );
    }

    logger.info("No semantic matches, falling back to FTS");
  }

  // Fallback to FTS keyword search
  return ftsSearch(db, query);
}
```

## Error Handling

### Embedding Provider Unavailable

- **At ingest**: Log warning, continue without embedding. Backfill job will retry.
- **At query time**: Fall back to FTS search, log that semantic search was skipped.

### Invalid Embeddings

- Detect dimension mismatch when loading sqlite-vec extension
- Clear and regenerate embeddings if model changes

### Graceful Degradation

```typescript
async function findRelevantNodes(db, query, config) {
  try {
    if (config.embeddingProvider && isVecExtensionLoaded(db)) {
      const results = await semanticSearch(db, query, config);
      if (results.length > 0) return results;
    }
  } catch (error) {
    logger.warn(`Semantic search failed: ${error.message}, using FTS`);
  }

  // Always have FTS as fallback
  return ftsSearch(db, query);
}
```

## Migration

### Steps

1. **Add sqlite-vec extension loading** in `database.ts`
2. **Create virtual table** via new migration
3. **Update embedding text format** in `facet-discovery.ts`
4. **Add ingest-time embedding** in `worker.ts`
5. **Add backfill job** to scheduler
6. **Update query processor** to use semantic search
7. **Run backfill** to re-embed existing nodes with richer text

### Migration SQL

```sql
-- Migration 012: Semantic search with sqlite-vec

-- Create the vector index virtual table
-- Dimension configured at runtime based on embedding model
CREATE VIRTUAL TABLE IF NOT EXISTS node_embeddings_vec USING vec0(
    embedding float[4096]
);

-- Populate from existing embeddings
INSERT INTO node_embeddings_vec (rowid, embedding)
SELECT rowid, embedding FROM node_embeddings;

-- Index for faster joins
CREATE INDEX IF NOT EXISTS idx_node_embeddings_model
ON node_embeddings(embedding_model);
```

## Configuration

### Full Config Example

```yaml
daemon:
  # LLM for analysis
  provider: zai
  model: glm-4.7

  # Embedding configuration
  embedding_provider: openrouter
  embedding_model: qwen/qwen3-embedding-8b
  embedding_api_key: ${OPENROUTER_API_KEY}
  embedding_dimensions: 4096

  # Semantic search tuning
  semantic_search_threshold: 0.5 # 0.0 = only exact matches, 1.0 = accept anything
```

### Environment Variables

```bash
# Can use env vars for secrets
OPENROUTER_API_KEY=sk-or-v1-...
```

## Testing

### Unit Tests

- `buildEmbeddingText()` produces expected format
- `semanticSearch()` returns results sorted by distance
- Fallback triggers when threshold exceeded
- Fallback triggers when embedding provider unavailable

### Integration Tests

- End-to-end: ingest node → embedding generated → query finds it
- Backfill job processes nodes with missing/outdated embeddings
- sqlite-vec extension loads correctly

### Manual Testing

```bash
# Trigger a brain query
pi brain "what did we learn about error handling"

# Check embedding stats
pi-brain stats --embeddings

# Force re-embed all nodes
pi-brain rebuild --embeddings
```

## Future Enhancements

Once semantic search is working, these become easier:

1. **Similar sessions panel** - Given current session, show semantically similar past sessions
2. **Lesson deduplication** - At ingest, find existing similar lessons before creating new ones
3. **Quirk clustering** - Group similar model observations automatically
4. **Query suggestions** - "Did you mean..." based on similar past queries
