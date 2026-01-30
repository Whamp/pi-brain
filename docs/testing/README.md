# Testing Documentation

This directory contains documentation related to testing practices and safeguards.

## Contents

- **[TEST_ISOLATION_SAFEGUARDS.md](./TEST_ISOLATION_SAFEGUARDS.md)** - Describes all safeguards in place to prevent test data contamination of the production database
- **[prevent-test-contamination.md](./prevent-test-contamination.md)** - Prevention checklist and guidelines for writing tests

## Quick Reference

### Preventing Test Contamination

Always use these patterns in tests:

```typescript
// Database - use :memory: or temp path
const db = openDatabase({ path: ":memory:" });
// or
const db = openDatabase({ path: join(tempDir, "test.db") });

// Node files - use temp directory
const nodesDir = join(tempDir, "nodes");
createNode(db, node, { nodesDir });
```

### Detection

Run these queries if you suspect contamination:

```sql
SELECT * FROM analysis_queue WHERE session_file LIKE '/tmp/%';
SELECT * FROM model_stats WHERE model LIKE '%sonnet-4%';
```

See [TEST_ISOLATION_SAFEGUARDS.md](./TEST_ISOLATION_SAFEGUARDS.md) for full details.
