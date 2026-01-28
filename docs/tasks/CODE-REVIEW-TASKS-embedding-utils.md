# Code Review Fix Tasks - embedding-utils

| ID  | Task                                                                                     | Priority | Status | Notes                                      |
| --- | ---------------------------------------------------------------------------------------- | -------- | ------ | ------------------------------------------ |
| 1.1 | Fix `isRichEmbeddingFormat` false positive - use more robust format detection            | P2       | done   | File: src/storage/embedding-utils.ts:82-85 |
| 1.2 | Add documentation for lesson ordering (deterministic by level order)                     | P3       | done   | File: src/storage/embedding-utils.ts:47-55 |
| 1.3 | Document `buildSimpleEmbeddingText` behavior when summary is null                        | P3       | done   | File: src/storage/embedding-utils.ts:69-77 |
| 1.4 | Improve `createTestNode` helper type safety with DeepPartial or explicit nested defaults | P3       | done   | File: src/storage/embedding-utils.test.ts  |
