# Code Review Fix Tasks

| ID  | Task                                                                           | Priority | Status  | Notes                                        |
| --- | ------------------------------------------------------------------------------ | -------- | ------- | -------------------------------------------- |
| 1.1 | Add comment explaining why source fields are omitted from UPDATE in upsertNode | P2       | pending | File: src/storage/node-repository.ts:234-268 |
| 1.2 | Cache prepared DELETE statements in upsertNode                                 | P3       | pending | File: src/storage/node-repository.ts:269-274 |
| 1.3 | Use length-prefix encoding for deterministic ID generation                     | P3       | pending | File: src/storage/node-types.ts:38-42        |
