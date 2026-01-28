# Code Review Fix Tasks - Embedding Storage

Branch: fix/code-review-20260127-213318
Created: 2026-01-27 21:33
Main branch: major/pi-brain

## Issues to Fix

| ID  | Task                                                                     | Priority | Status  | Notes                                        |
| --- | ------------------------------------------------------------------------ | -------- | ------- | -------------------------------------------- |
| 1.1 | Wrap storeEmbeddingWithVec in transaction for atomicity                  | P2       | pending | File: src/storage/embedding-utils.ts:160-199 |
| 1.2 | Query old rowid before INSERT OR REPLACE to prevent orphaned vec entries | P2       | pending | File: src/storage/embedding-utils.ts:163-189 |
| 1.3 | Fix type annotation for rowid in deleteEmbedding to `number \| bigint`   | P3       | pending | File: src/storage/embedding-utils.ts:216     |

## Summary

The `storeEmbeddingWithVec` function has two related issues:

1. Multiple database operations without a transaction can leave the database inconsistent on failure
2. `INSERT OR REPLACE` can change rowid, causing the vec table delete to miss the old entry (orphaned entries)

The `deleteEmbedding` function has a minor type annotation issue where rowid should support both number and bigint.

---

## Progress Log

### 2026-01-27 21:33 - Created

Initial creation of code review fix task list.
