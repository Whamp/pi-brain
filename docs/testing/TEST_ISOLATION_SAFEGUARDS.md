# Test Isolation Safeguards

This document describes all safeguards in place to prevent test data contamination of the production database.

## Overview

After discovering test data contamination in the production database (`~/.pi-brain/data/brain.db`), multiple safeguards have been implemented to prevent recurrence.

## Safeguards

### 1. Database Open Guard (`src/storage/database.ts`)

**What it does:** Prevents test code from opening the production database.

**How it works:**

- Detects test environment via `process.env.VITEST`, `process.env.NODE_ENV`, or `process.env.JEST_WORKER_ID`
- Checks if the requested database path matches `~/.pi-brain/data/brain.db`
- Throws an error if test code tries to open production database

**Code:**

```typescript
function isTestEnvironment(): boolean {
  return (
    process.env.NODE_ENV === "test" ||
    process.env.VITEST !== undefined ||
    process.env.JEST_WORKER_ID !== undefined
  );
}

function isProductionDatabase(dbPath: string): boolean {
  const normalized = dbPath.replace(/\/+$/, "");
  const defaultNormalized = DEFAULT_DB_PATH.replace(/\/+$/, "");
  return normalized === defaultNormalized;
}

// In openDatabase():
if (
  !options.skipTestCheck &&
  isTestEnvironment() &&
  isProductionDatabase(dbPath)
) {
  throw new Error(
    "Test code attempted to open production database (~/.pi-brain/data/brain.db). " +
      "Use ':memory:' or a temp database path in tests."
  );
}
```

**Test verification:** `src/storage/database-guard.test.ts`

### 2. Node Write Guard (`src/storage/node-storage.ts`)

**What it does:** Prevents test code from writing node JSON files to the production nodes directory.

**How it works:**

- Detects test environment (same as above)
- Checks if the target directory is `~/.pi-brain/data/nodes`
- Throws an error if test code tries to write to production

**Code:**

```typescript
export function writeNode(
  node: Node,
  options: NodeStorageOptions = {}
): string {
  const nodesDir = options.nodesDir ?? DEFAULT_NODES_DIR;

  // Guard: prevent test code from writing to production paths
  if (isTestEnvironment() && isProductionPath(nodesDir)) {
    throw new Error(
      "Test attempted to write to production nodes directory (~/.pi-brain/data/nodes). " +
        "Pass a temp nodesDir option to writeNode()/createNode() in tests."
    );
  }
  // ... rest of function
}
```

### 3. Production Code Uses `skipTestCheck`

All production code paths that legitimately need to open the production database must use `skipTestCheck: true`:

- `src/cli.ts` - CLI commands
- `src/daemon/cli.ts` - Daemon CLI functions
- `src/daemon/daemon-process.ts` - Daemon process
- `src/daemon/graph-export.ts` - Graph export functions

This makes it explicit that these code paths are allowed to access production data.

## Test Requirements

All tests must follow these patterns:

### Database Access

**✅ Good:**

```typescript
// Use :memory: database
const db = openDatabase({ path: ":memory:" });

// Use temp database file
const tempDir = mkdtempSync(join(tmpdir(), "test-"));
const db = openDatabase({ path: join(tempDir, "test.db") });
```

**❌ Bad:**

```typescript
// NEVER do this in tests
const db = openDatabase(); // Opens production DB!
const db = openDatabase({ path: "~/.pi-brain/data/brain.db" });
```

### Node File Storage

**✅ Good:**

```typescript
const tempDir = mkdtempSync(join(tmpdir(), "test-"));
const nodesDir = join(tempDir, "nodes");
mkdirSync(nodesDir, { recursive: true });

createNode(db, node, { nodesDir });
writeNode(node, { nodesDir });
```

**❌ Bad:**

```typescript
// NEVER do this in tests
createNode(db, node); // Uses production nodes dir!
writeNode(node); // Uses production nodes dir!
```

## Detection Queries

Run these SQL queries to detect contamination:

```sql
-- Test session files
SELECT * FROM analysis_queue WHERE session_file LIKE '/tmp/%';

-- Test models (sonnet-4 is not used in production)
SELECT * FROM model_stats WHERE model LIKE '%sonnet-4%';
SELECT * FROM model_quirks WHERE model LIKE '%sonnet-4%';
SELECT * FROM tool_errors WHERE model LIKE '%sonnet-4%';
SELECT * FROM aggregated_insights WHERE model LIKE '%sonnet-4%';

-- Hardcoded test node IDs
SELECT * FROM nodes WHERE id IN ('node1', 'node2', 'node-1', 'node-2');
```

## Verification

Run the guard test to verify safeguards are working:

```bash
npm test -- --run src/storage/database-guard.test.ts
```

## Cleanup History

**2026-01-29:** Removed test contamination:

- 20 jobs from `analysis_queue` (`/tmp/test-session.jsonl`)
- 5 entries from `model_quirks` (`claude-sonnet-4-20250514`)
- 5 entries from `tool_errors` (`claude-sonnet-4-20250514`)
- 2 entries from `aggregated_insights` (`claude-sonnet-4-20250514`)
- 1 entry from `model_stats` (`claude-sonnet-4-20250514`)
- 4 node files from disk (`node1-v1.json`, `node2-v1.json`, `node-1-v1.json`, `node-2-v1.json`)

## Prevention Checklist

When writing new tests:

- [ ] Database uses `:memory:` or temp path
- [ ] Node files use temp directory (`{ nodesDir: join(tempDir, "nodes") }`)
- [ ] No hardcoded production paths (`~/.pi-brain/data`)
- [ ] Proper cleanup in `afterEach`/`afterAll`
- [ ] Mocks don't accidentally write to production
