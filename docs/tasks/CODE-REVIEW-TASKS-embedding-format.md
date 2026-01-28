# Code Review Fix Tasks

Branch: fix/code-review-20260127-211938
Created: 2026-01-27 21:19
Main branch: major/pi-brain

## Issues to Fix

| ID  | Task                                                                                              | Priority | Status  | Notes                                                               |
| --- | ------------------------------------------------------------------------------------------------- | -------- | ------- | ------------------------------------------------------------------- |
| 1.1 | Add format version marker to prevent perpetual re-embedding of nodes with empty decisions/lessons | P2       | pending | File: src/daemon/facet-discovery.ts, src/storage/embedding-utils.ts |
| 1.2 | Fix test assertion to verify embedding was actually regenerated                                   | P3       | pending | File: src/daemon/facet-discovery.test.ts:401-402                    |
| 1.3 | Make test path dependency explicit instead of relying on implicit test.json absence               | P3       | pending | File: src/daemon/facet-discovery.test.ts:388-425                    |

---

## Task Details

### 1.1 - Add format version marker (P2)

**Problem**: When a node genuinely has no decisions and no lessons, `buildEmbeddingText` produces text without the `\n\nDecisions:\n-` or `\n\nLessons:\n-` markers. On subsequent runs, `isRichEmbeddingFormat` returns `false`, causing the node to be re-embedded every time.

**Solution**: Add a format marker (e.g., `[v2]` suffix or similar) to distinguish "new format, empty sections" from "old format". Update `isRichEmbeddingFormat` to check for this marker.

### 1.2 - Fix test assertion (P3)

**Problem**: The test comment says "the embedding was regenerated" but the assertion only checks `input_text` is defined, which was already true before.

**Solution**: Assert that the provider's `embed` method was called, or check the embedding blob changed.

### 1.3 - Make test path explicit (P3)

**Problem**: Tests rely on `test.json` not existing for fallback behavior. If someone creates this file, tests break.

**Solution**: Use an explicit non-existent path like `/nonexistent/node-data.json` in `insertTestNodes`.
