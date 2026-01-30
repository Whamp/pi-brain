# Runbook: Embedding Generation Errors

## Symptoms

- Semantic search returns no results
- `pi-brain health` reports embedding service issues
- Logs show embedding-related errors
- New nodes created without embeddings

## Diagnosis

### 1. Check embedding status

```bash
pi-brain health
```

Look for "Embeddings: OK" or errors.

### 2. Check sqlite-vec extension

```bash
sqlite3 ~/.pi-brain/brain.db "SELECT vec_version();"
```

Should return version number.

### 3. Check embedding counts

```bash
sqlite3 ~/.pi-brain/brain.db "SELECT COUNT(*) FROM node_embeddings;"
sqlite3 ~/.pi-brain/brain.db "SELECT COUNT(*) FROM nodes WHERE id NOT IN (SELECT node_id FROM node_embeddings);"
```

### 4. Check logs for errors

```bash
grep -i "embed\|vector\|sqlite-vec" ~/.pi-brain/daemon.log | tail -20
```

## Resolution

### Scenario A: Missing sqlite-vec extension

```bash
# Reinstall dependencies
cd ~/projects/pi-brain
npm install sqlite-vec
```

### Scenario B: Extension load failure

Check architecture compatibility:

```bash
uname -m  # Should match sqlite-vec binary
node -e "console.log(process.arch)"
```

If mismatch, reinstall for correct architecture.

### Scenario C: Missing embeddings for existing nodes

```bash
# Rebuild all embeddings
pi-brain daemon rebuild-embeddings
```

This reprocesses all nodes to generate missing embeddings.

### Scenario D: Embedding API rate limited

If using external embedding service:

```bash
grep -i "rate\|429\|quota" ~/.pi-brain/daemon.log | tail -10
```

Wait for rate limit to clear, or:

- Reduce embedding batch size in config
- Switch to local embedding model

### Scenario E: Corrupted embedding data

```bash
pi-brain daemon stop

# Clear and rebuild embeddings
sqlite3 ~/.pi-brain/brain.db "DELETE FROM node_embeddings;"

pi-brain daemon start
pi-brain daemon rebuild-embeddings
```

### Scenario F: Dimension mismatch

If embedding dimensions changed:

```bash
pi-brain daemon stop

# Check current dimensions
sqlite3 ~/.pi-brain/brain.db "SELECT LENGTH(embedding) FROM node_embeddings LIMIT 1;"

# If inconsistent, clear and rebuild
sqlite3 ~/.pi-brain/brain.db "DELETE FROM node_embeddings;"

pi-brain daemon start
pi-brain daemon rebuild-embeddings
```

## Verification

```bash
# Test semantic search
pi-brain query "test query"

# Check embedding counts match node counts
sqlite3 ~/.pi-brain/brain.db "SELECT
  (SELECT COUNT(*) FROM nodes) as nodes,
  (SELECT COUNT(*) FROM node_embeddings) as embeddings;"
```

## Performance Notes

- Embedding generation is CPU-intensive
- Large rebuilds may take hours
- Consider running overnight for full rebuild
