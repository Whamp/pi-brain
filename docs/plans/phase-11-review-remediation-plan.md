# Phase 11 Remediation Plan: Signals & Insights Polish

This document outlines the specific steps required to address the gaps identified in the Phase 11 review and bring the "Signals & Insights" feature set to full completion.

## 1. Objective

Enable functional "Abandoned Restart" detection, ensure accurate signal metrics, and improve the out-of-the-box configuration experience for the clustering engine.

## 2. Tasks

### 2.1. Wire Up Abandoned Restart Detection

**Context**: The `isAbandonedRestart` logic exists in `src/parser/signals.ts` but is currently dead code. The ingestion worker does not check previous sessions.

**Steps**:

1.  **Extend Node Repository**:
    - Add `findPreviousSessionNode(db, projectId, timestamp)` to `src/storage/node-repository.ts`.
    - This should return the most recent node for the same project before the current session's start time.
    - It needs to return the full node data (read from JSON) to access `filesTouched` and `outcome`.

2.  **Update Worker Logic (`src/daemon/worker.ts`)**:
    - In `processJob`, before creating the node:
      - Call `findPreviousSessionNode`.
      - If found, call `isAbandonedRestart(previousNode, currentNode)`.
    - Pass the result (`true/false`) into the `detectFrictionSignals` options object.

3.  **Verification**:
    - Create a new integration test `tests/integration/abandoned-restart.test.ts`.
    - Scenario:
      1.  Ingest Session A (Outcome: Abandoned, touches `auth.ts`).
      2.  Wait 5 minutes (simulated).
      3.  Ingest Session B (touches `auth.ts`).
      4.  Verify Session B's node has `signals.friction.abandonedRestart === true`.

### 2.2. Refine Signals API & Storage

**Context**: The API currently estimates the "Abandoned Restart Count" by counting _all_ abandoned nodes, which is inaccurate. Counting properly requires reading every JSON file, which is too slow.

**Steps**:

1.  **Schema Migration**:
    - Create migration `006_add_signals_index.sql`.
    - Add `signals` JSON column (or specific `friction_score`, `is_abandoned_restart` columns) to the `nodes` table.
    - _Recommendation_: Add `signals` text column to store the compact signals JSON object.

2.  **Update Ingestion**:
    - Update `upsertNode` in `src/storage/node-repository.ts` to write the signals object to the new database column.

3.  **Update API**:
    - Update `countAbandonedRestartPatterns` in `src/api/routes/signals.ts` to query the DB column directly:
      ```sql
      SELECT COUNT(*) FROM nodes WHERE json_extract(signals, '$.friction.abandonedRestart') = 1
      ```

### 2.3. Configuration & Defaults

**Context**: The default `openrouter` embedding provider crashes or errors loudly if no API key is present, creating a poor initial experience.

**Steps**:

1.  **Update Config Generation**:
    - Modify `writeDefaultConfig` in `src/config/config.ts`.
    - Add clear comments explaining that `embedding_api_key` is required for the default provider.

2.  **Graceful Degradation**:
    - Update `Scheduler.runClustering` in `src/daemon/scheduler.ts`.
    - If `embedding_api_key` is missing and provider is `openrouter` or `openai`:
      - Log a warning ("Clustering skipped: No embedding API key configured").
      - Return early with a success status (itemsProcessed: 0) instead of throwing an error.

## 3. Implementation Schedule

| Task                   | Estimated Effort |
| ---------------------- | ---------------- |
| 2.1 Worker Integration | Medium           |
| 2.2 Schema & API       | Medium           |
| 2.3 Config & Defaults  | Low              |
| **Total**              | **~1 Day**       |

## 4. Acceptance Criteria

- [ ] **Abandoned Restarts** appear in the dashboard when a user abandons a task and restarts it shortly after.
- [ ] **Signal Counts** on the dashboard match the actual number of detected patterns, not the total count of abandoned sessions.
- [ ] **Fresh Install** does not log errors about missing API keys for clustering; it simply skips the step with a warning.
- [ ] **Tests Pass**: New integration test confirms the end-to-end flow.
