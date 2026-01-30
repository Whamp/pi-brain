# Preventing Test Data Contamination

## Root Cause

Test data leaked into the production database (~/.pi-brain/data/brain.db) because:

1. Tests use hardcoded session files like `/tmp/test-session.jsonl`
2. Tests use models like `claude-sonnet-4-20250514` that don't match production usage
3. Database INSERT operations don't have path guards like writeNode() does

## Prevention Measures Implemented

### 1. Database Guard (Added to storage/database.ts)

```typescript
export function isTestEnvironment(): boolean {
  return (
    process.env.NODE_ENV === "test" ||
    process.env.VITEST !== undefined ||
    process.env.JEST_WORKER_ID !== undefined
  );
}

export function isProductionDatabase(dbPath: string): boolean {
  return dbPath.includes(".pi-brain/data/brain.db");
}
```

### 2. Test Isolation Requirements

- All tests MUST use `:memory:` databases OR temp database files
- All tests MUST use temp directories for node files
- Integration tests MUST clean up database entries in beforeEach/afterAll

### 3. Code Review Checklist

- [ ] Tests use `openDatabase({ path: ":memory:" })` or temp path
- [ ] Tests use temp directories: `mkdtempSync(join(tmpdir(), "test-"))`
- [ ] Tests clean up: `rmSync(tempDir, { recursive: true })`
- [ ] Tests don't use production paths like `~/.pi-brain/data`

### 4. Detection Queries

Run these to detect contamination:

```sql
-- Test session files
SELECT * FROM analysis_queue WHERE session_file LIKE '/tmp/%';

-- Test models
SELECT * FROM model_stats WHERE model LIKE '%sonnet-4%';

-- Test node IDs
SELECT * FROM nodes WHERE id IN ('node1', 'node2', 'node-1', 'node-2');
```

## Cleanup Done

Deleted from production database:

- 20 test jobs from analysis_queue
- 5 model_quirks entries
- 5 tool_errors entries
- 2 aggregated_insights entries
- 1 model_stats entry
- 4 test node files from disk
