# Code Review Fix Tasks

Fixes for code review issues related to semantic search migration handling.

| ID  | Task                                                                  | Priority | Status | Notes                                                   |
| --- | --------------------------------------------------------------------- | -------- | ------ | ------------------------------------------------------- |
| 1.1 | Fix skipped migration permanently disabling semantic search           | P1       | done   | File: src/storage/database.ts:150-157                   |
| 1.2 | Replace brittle filename-based migration filtering with SQL directive | P2       | done   | File: src/storage/database.ts:151                       |
| 1.3 | Fix misleading "fail silently" comment in migration                   | P3       | done   | File: src/storage/migrations/012_semantic_search.sql:22 |
| 1.4 | Fix type assertion for rowid to handle BigInt                         | P3       | done   | File: src/storage/database.test.ts:357                  |
