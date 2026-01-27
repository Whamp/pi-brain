# Code Review Fix Tasks

| ID  | Task                                                                           | Priority | Status | Notes                                                   |
| --- | ------------------------------------------------------------------------------ | -------- | ------ | ------------------------------------------------------- |
| 1.1 | Add comment explaining why source fields are omitted from UPDATE in upsertNode | P2       | done   | Commit 294c730 - src/storage/node-repository.ts:234-237 |
| 1.2 | Cache prepared DELETE statements in upsertNode                                 | P3       | done   | Commit 294c730 - src/storage/node-repository.ts:275-293 |
| 1.3 | Use length-prefix encoding for deterministic ID generation                     | P3       | done   | Commit 294c730 - src/storage/node-types.ts:38-53        |

All tasks completed in commit 294c730 (2026-01-27).
