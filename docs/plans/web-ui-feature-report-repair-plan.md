# Web UI Feature Report & Repair Plan

This document summarizes the findings from the systematic exploration of the `pi-brain` Web UI and outlines the necessary repairs to move from a "static shell" to a fully reactive, reliable knowledge interface.

## 1. Feature Report Summary

| Feature             | Status        | Implementation Notes                                                   |
| :------------------ | :------------ | :--------------------------------------------------------------------- |
| **Dashboard**       | 🟡 Partial    | Renders static stats; News Feed actions work; lacks real-time updates. |
| **Knowledge Graph** | 🟢 Functional | D3-based; filtering and zoom work; needs data to populate.             |
| **Search**          | 🟢 Functional | FTS5-powered; advanced filters (Outcome, Type) are implemented.        |
| **Prompt Learning** | 🟡 Partial    | Renders insights; needs `InsightAggregator` to run via Scheduler.      |
| **Session Browser** | 🟢 Functional | Project-based grouping works; provides direct access to nodes.         |
| **Settings**        | 🟢 Functional | Successfully updates `config.yaml` via API.                            |
| **Daemon Status**   | 🔴 Broken     | Sidebar indicator relies on a non-existent WebSocket route.            |

---

## 2. Punch List (Critical Repairs)

### 2.1. Backend: Implement WebSocket Route (`/ws`)

**Problem**: The frontend `wsStore` attempts to connect to `/ws`, but the Fastify server returns a 404.
**Impact**: Dashboard stats, news feed, and sidebar status dots never update without a manual page refresh.
**Fix**:

- Modify `src/api/server.ts` to handle WebSocket connections.
- Implement a broadcast system in `src/daemon/worker.ts` to push `analysis.completed` and `daemon.status` events.

### 2.2. Daemon: Stale Job Recovery

**Problem**: Jobs marked as `running` when the daemon crashes/restarts remain `running` forever in the SQLite DB.
**Impact**: Analysis hangs; workers are "occupied" by non-existent processes.
**Fix**:

- Call `queue.releaseStale()` inside `main()` in `src/daemon/daemon-process.ts` before starting workers.

### 2.3. Frontend: Status Polling Fallback

**Problem**: Total reliance on WebSockets for connectivity status.
**Impact**: If the WebSocket fails, the user sees "Daemon unknown" even if the API is responsive.
**Fix**:

- Add an `Interval` to `src/web/app/src/lib/stores/daemon.ts` to poll `/api/v1/daemon/status` every 30 seconds.

### 2.4. Dashboard: News Feed UX Polish

**Problem**: Cards disappear instantly on action without confirmation or undo.
**Impact**: Accidental clicks on "Dismiss" lose discovered patterns.
**Fix**:

- Implement a "Success" state or a brief undo window in `src/web/app/src/lib/components/dashboard/news-feed.svelte`.

---

## 3. Implementation Schedule

| Phase       | Task                                     | Priority     |
| :---------- | :--------------------------------------- | :----------- |
| **Phase 1** | **Stale Job Recovery** (2.2)             | 🚨 Immediate |
| **Phase 1** | **WebSocket Route Implementation** (2.1) | 🚨 Immediate |
| **Phase 2** | **Status Polling Fallback** (2.3)        | 🟡 High      |
| **Phase 3** | **News Feed UX Refinement** (2.4)        | 🔵 Medium    |

---

## 4. Verification Procedures

1. **Reactivity Check**: Start a manual analysis via CLI (`pi-brain analyze <file>`) and verify the Dashboard node count increments without a refresh.
2. **Crash Resilience**: Kill the daemon mid-analysis, restart it, and verify the interrupted job returns to `pending`.
3. **Offline Detection**: Stop the daemon and verify the sidebar status turns red/error within 30 seconds.
