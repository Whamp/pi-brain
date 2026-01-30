# Runbook: Slow Queries

## Symptoms
- Web UI slow to load
- CLI queries take >5 seconds
- API timeouts
- High CPU during queries

## Diagnosis

### 1. Identify slow queries
```bash
# Enable query logging temporarily
sqlite3 ~/.pi-brain/brain.db ".timer on"
# Then run queries manually
```

### 2. Check database size
```bash
ls -lh ~/.pi-brain/brain.db
sqlite3 ~/.pi-brain/brain.db "SELECT COUNT(*) FROM nodes; SELECT COUNT(*) FROM edges;"
```

### 3. Check index usage
```bash
sqlite3 ~/.pi-brain/brain.db "EXPLAIN QUERY PLAN SELECT * FROM nodes WHERE type = 'decision';"
```

Look for "SCAN" (bad) vs "SEARCH USING INDEX" (good).

### 4. Check for locks
```bash
fuser ~/.pi-brain/brain.db
```

## Resolution

### Scenario A: Missing indexes
```bash
pi-brain daemon stop

sqlite3 ~/.pi-brain/brain.db <<EOF
CREATE INDEX IF NOT EXISTS idx_nodes_type ON nodes(type);
CREATE INDEX IF NOT EXISTS idx_nodes_session ON nodes(session_id);
CREATE INDEX IF NOT EXISTS idx_edges_source ON edges(source_id);
CREATE INDEX IF NOT EXISTS idx_edges_target ON edges(target_id);
ANALYZE;
EOF

pi-brain daemon start
```

### Scenario B: Database needs optimization
```bash
pi-brain daemon stop

sqlite3 ~/.pi-brain/brain.db <<EOF
PRAGMA optimize;
VACUUM;
ANALYZE;
EOF

pi-brain daemon start
```

### Scenario C: WAL file too large
```bash
ls -lh ~/.pi-brain/brain.db-wal

pi-brain daemon stop
sqlite3 ~/.pi-brain/brain.db "PRAGMA wal_checkpoint(TRUNCATE);"
pi-brain daemon start
```

### Scenario D: Vector search slow
For semantic queries:
```bash
# Check embedding index
sqlite3 ~/.pi-brain/brain.db "SELECT COUNT(*) FROM node_embeddings;"

# Rebuild vector index
pi-brain daemon rebuild-embeddings --index-only
```

### Scenario E: Too many results
Add limits to queries:
```bash
# Instead of
pi-brain query "find all errors"

# Use
pi-brain query "find all errors" --limit 50
```

### Scenario F: Concurrent load
Reduce concurrent operations:
```yaml
# ~/.pi-brain/config.yaml
daemon:
  max_concurrent_analyses: 1
api:
  rate_limit:
    requests_per_minute: 30
```

## Query Optimization Tips

### Use specific types
```bash
# Slow: scans all nodes
pi-brain query "authentication"

# Fast: filters by type first
pi-brain query "authentication errors" --type error
```

### Limit date range
```bash
pi-brain query "errors" --since 2024-01-01
```

### Use pagination
```bash
pi-brain query "patterns" --limit 20 --offset 0
```

## Verification
```bash
# Time a query
time pi-brain query "test"

# Should complete in <2 seconds for most queries
```

## When to Consider Scaling
- Database >1GB
- >100k nodes
- Response times consistently >5s

Options:
- Archive old sessions
- Split by project
- Consider PostgreSQL migration
