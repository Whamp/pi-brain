# Web UI Fix Plan

This plan addresses critical issues discovered during the Phase 18 UI validation session.

**Status:** 0/5 items resolved  
**Blocking:** Build failure, data display broken  
**Estimated Total Effort:** 3-4 hours

---

## Issue Summary

| #   | Issue                                     | Priority | Status  | Effort |
| --- | ----------------------------------------- | -------- | ------- | ------ |
| 1   | Data Structure Mismatch (NodeRow vs Node) | P0       | ❌ Open | 1 hour |
| 2   | Build Failure (WebSocket types)           | P0       | ❌ Open | 15 min |
| 3   | Port Conflict & Cleanup                   | P1       | ❌ Open | 30 min |
| 4   | UI UX Improvements                        | P3       | ❌ Open | 30 min |
| 5   | Config File Validation                    | P2       | ❌ Open | 15 min |

---

## 1. Fix Data Structure Mismatch (P0 - CRITICAL)

### Problem

The frontend components expect a nested `Node` structure (e.g., `node.content.outcome`), while the API listing endpoints return flattened `NodeRow` objects directly from SQLite.

**API returns:**

```typescript
interface NodeRow {
  id: string;
  summary: string; // ❌ Flat
  outcome: string; // ❌ Flat
  // ...
}
```

**Frontend expects:**

```typescript
interface Node {
  id: string;
  content: {
    summary: string; // ✅ Nested
    outcome: string; // ✅ Nested
  };
  // ...
}
```

### Affected Components

| File                                                       | Broken Pattern                                         |
| ---------------------------------------------------------- | ------------------------------------------------------ |
| `src/web/app/src/routes/+page.svelte`                      | `activity.content.outcome`, `activity.content.summary` |
| `src/web/app/src/routes/graph/+page.svelte`                | `$selectedNode.content.summary`                        |
| `src/web/app/src/routes/nodes/[id]/+page.svelte`           | `node.content.outcome`, `node.content.summary`         |
| `src/web/app/src/routes/sessions/+page.svelte`             | `node.content.outcome`, `node.content.summary`         |
| `src/web/app/src/lib/components/graph.svelte`              | `d.content.summary`                                    |
| `src/web/app/src/lib/components/search-result-card.svelte` | `node.content.outcome`                                 |

### Solution

Create a transformation utility and apply it in API routes that return node lists.

### Tasks

- [ ] **1.1** Create `transformNodeRowToNode()` utility function
  - Location: `src/storage/node-conversion.ts` (extend existing file)
  - Function: Read JSON from `data_file` path, return full `Node` object
  - Fallback: If JSON read fails, construct minimal `Node` from row data

- [ ] **1.2** Create lightweight `transformNodeRowToNodeSummary()` for listings
  - Location: `src/storage/node-conversion.ts`
  - Purpose: Avoid reading JSON for every node in large listings
  - Returns: `Node` with `content`, `classification`, `metadata` populated from row

- [ ] **1.3** Update `GET /nodes` route to transform response
  - Location: `src/api/routes/nodes.ts`
  - Change: Map `result.nodes` through transformation before response

- [ ] **1.4** Update `GET /nodes/:id/connected` route
  - Location: `src/api/routes/nodes.ts`
  - Change: Transform nodes in graph traversal response

- [ ] **1.5** Update `GET /sessions/nodes` route
  - Location: `src/api/routes/sessions.ts`
  - Change: Transform node list in session browser

- [ ] **1.6** Verify frontend receives correct structure
  - Test: Load dashboard, graph, sessions pages
  - Verify: Summaries and outcomes display correctly

### Implementation Details

```typescript
// src/storage/node-conversion.ts - ADD this function

import type { Node } from "./node-types.js";
import type { NodeRow } from "./node-crud.js";
import { readNodeFromPath } from "./node-storage.js";

/**
 * Transform a NodeRow (flat SQLite row) to Node (nested structure).
 * For listings, constructs Node from row data without reading JSON.
 * For full details, reads the JSON file.
 */
export function nodeRowToNode(row: NodeRow, loadFull = false): Node {
  // If full data requested, read from JSON file
  if (loadFull && row.data_file) {
    try {
      return readNodeFromPath(row.data_file);
    } catch {
      // Fall through to construct from row
    }
  }

  // Construct minimal Node from row data for listings
  return {
    id: row.id,
    version: row.version,
    previousVersions: [],
    source: {
      sessionFile: row.session_file,
      segment: {
        startEntryId: row.segment_start ?? "",
        endEntryId: row.segment_end ?? "",
        entryCount: 0,
      },
      computer: row.computer ?? "",
      sessionId: "",
    },
    classification: {
      type: (row.type as Node["classification"]["type"]) ?? "other",
      project: row.project ?? "",
      isNewProject: Boolean(row.is_new_project),
      hadClearGoal: Boolean(row.had_clear_goal),
    },
    content: {
      summary: row.summary ?? "",
      outcome: (row.outcome as Node["content"]["outcome"]) ?? "abandoned",
      keyDecisions: [],
      filesTouched: [],
      toolsUsed: [],
      errorsSeen: [],
    },
    lessons: {
      project: [],
      task: [],
      user: [],
      model: [],
      tool: [],
      skill: [],
      subagent: [],
    },
    observations: {
      modelsUsed: [],
      promptingWins: [],
      promptingFailures: [],
      modelQuirks: [],
      toolUseErrors: [],
    },
    metadata: {
      tokensUsed: row.tokens_used ?? 0,
      cost: row.cost ?? 0,
      durationMinutes: row.duration_minutes ?? 0,
      timestamp: row.timestamp ?? "",
      analyzedAt: row.analyzed_at ?? "",
      analyzerVersion: row.analyzer_version ?? "",
    },
    semantic: { tags: [], topics: [] },
    daemonMeta: { decisions: [], rlmUsed: false },
  };
}

/**
 * Transform array of NodeRows to Nodes
 */
export function nodeRowsToNodes(rows: NodeRow[], loadFull = false): Node[] {
  return rows.map((row) => nodeRowToNode(row, loadFull));
}
```

```typescript
// src/api/routes/nodes.ts - MODIFY the GET / handler

import { nodeRowsToNodes } from "../../storage/node-conversion.js";

// In the GET / handler, change:
// return reply.send(successResponse(result, durationMs));
// To:
const transformedResult = {
  ...result,
  nodes: nodeRowsToNodes(result.nodes),
};
return reply.send(successResponse(transformedResult, durationMs));
```

### Verification

```bash
# 1. Start daemon
pi-brain daemon start

# 2. Verify API returns nested structure
curl http://localhost:8765/api/v1/nodes?limit=1 | jq '.data.nodes[0].content'

# 3. Load web UI and verify display
open http://localhost:8765
```

---

## 2. Fix Build Failure (P0 - CRITICAL)

### Problem

The backend build fails due to type mismatch in WebSocket broadcasting.

```
src/daemon/daemon-process.ts(203,9): error TS2353: Object literal may only specify known properties,
and 'total' does not exist in type '{ active: number; idle: number; }'.

src/daemon/daemon-process.ts(210,9): error TS2353: Object literal may only specify known properties,
and 'completedToday' does not exist in type '{ pending: number; running: number; }'.
```

### Root Cause

`broadcastDaemonStatus()` in `src/api/websocket.ts` has a restrictive type:

```typescript
broadcastDaemonStatus(status: {
  running: boolean;
  workers?: { active: number; idle: number };           // Missing: total
  queue?: { pending: number; running: number };          // Missing: completedToday, failedToday
}): void
```

But `daemon-process.ts` passes additional fields that the frontend expects.

### Solution

Update the type signature to match what the frontend `DaemonStatus` expects.

### Tasks

- [ ] **2.1** Update `broadcastDaemonStatus` type signature
  - Location: `src/api/websocket.ts` lines 255-260
  - Add: `total` to workers, `completedToday`/`failedToday` to queue

- [ ] **2.2** Verify build succeeds
  - Run: `npm run build`
  - Expect: No TypeScript errors

### Implementation

```typescript
// src/api/websocket.ts - UPDATE broadcastDaemonStatus signature

/**
 * Broadcast daemon status update
 */
broadcastDaemonStatus(status: {
  running: boolean;
  pid?: number;
  uptime?: number;
  workers?: {
    total: number;      // ADD
    active: number;
    idle: number
  };
  queue?: {
    pending: number;
    running: number;
    completedToday: number;  // ADD
    failedToday: number;     // ADD
  };
  lastAnalysis?: string;
  nextScheduled?: {
    reanalysis?: string;
    connectionDiscovery?: string;
  };
}): void {
  this.broadcast("daemon", {
    type: "daemon.status",
    data: status,
    timestamp: new Date().toISOString(),
  });
}
```

### Verification

```bash
npm run build
# Should complete without errors
```

---

## 3. Port Conflict & Cleanup (P1)

### Problem

The daemon fails to start if port 8765 is already bound, often by a previous session that didn't clean up correctly. No helpful error message or recovery option.

### Tasks

- [ ] **3.1** Add port availability check before daemon start
  - Location: `src/daemon/cli.ts` in `startDaemon()`
  - Check: Attempt to bind port, fail fast with clear message

- [ ] **3.2** Improve `stopDaemon` to force-kill stuck processes
  - Location: `src/daemon/cli.ts` in `stopDaemon()`
  - Add: `SIGKILL` after timeout if `SIGTERM` ignored

- [ ] **3.3** Add `--force` flag to `daemon start` command
  - Location: `src/cli.ts` daemon start command
  - Behavior: Kill any process on port 8765 before starting

### Implementation

```typescript
// src/daemon/cli.ts - ADD helper function

import { createServer } from "net";

/**
 * Check if a port is available
 */
export function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "127.0.0.1");
  });
}

/**
 * Find process using a port (Linux/macOS)
 */
export function findProcessOnPort(port: number): number | null {
  try {
    const result = execSync(
      `lsof -t -i:${port} 2>/dev/null || fuser ${port}/tcp 2>/dev/null`,
      {
        encoding: "utf8",
      }
    ).trim();
    const pid = parseInt(result.split("\n")[0], 10);
    return isNaN(pid) ? null : pid;
  } catch {
    return null;
  }
}

// In startDaemon(), add before spawning:
const portAvailable = await isPortAvailable(config.api.port);
if (!portAvailable) {
  const existingPid = findProcessOnPort(config.api.port);
  if (options.force && existingPid) {
    process.kill(existingPid, "SIGKILL");
    await new Promise((r) => setTimeout(r, 500)); // Wait for cleanup
  } else {
    return {
      success: false,
      message: `Port ${config.api.port} is already in use${existingPid ? ` by PID ${existingPid}` : ""}. Use --force to kill it.`,
    };
  }
}
```

```typescript
// In stopDaemon(), enhance termination:

// After sending SIGTERM, wait with escalation
const maxWait = 5000;
const checkInterval = 200;
let waited = 0;

while (isProcessRunning(pid) && waited < maxWait) {
  await new Promise((r) => setTimeout(r, checkInterval));
  waited += checkInterval;
}

if (isProcessRunning(pid)) {
  process.kill(pid, "SIGKILL");
  await new Promise((r) => setTimeout(r, 500));
}
```

### Verification

```bash
# Test port conflict detection
pi-brain daemon start &
sleep 1
pi-brain daemon start  # Should fail with clear message

# Test force flag
pi-brain daemon start --force  # Should kill and restart
```

---

## 4. UI UX Improvements (P3)

### Problem

- Graph page defaults to "Last 7 days" which may show empty if no recent activity
- No auto-refresh of Dashboard activity list when WebSocket notifications arrive

### Tasks

- [ ] **4.1** Improve graph page empty state handling
  - Location: `src/web/app/src/routes/graph/+page.svelte`
  - Behavior: If "Last 7 days" returns empty, auto-expand to "Last 30 days", then "All time"

- [ ] **4.2** Add auto-refresh to Dashboard on `node.created` events
  - Location: `src/web/app/src/routes/+page.svelte`
  - Behavior: When `node.created` WebSocket event received, refresh activity list

### Implementation

```svelte
<!-- src/web/app/src/routes/graph/+page.svelte - MODIFY loadGraph -->

async function loadGraph() {
  const filters: NodeFilters = {};

  // Build filters from UI state
  if (projectFilter) filters.project = projectFilter;
  if (typeFilter) filters.type = typeFilter;

  // Try progressively wider date ranges if empty
  const dateRanges = ["7", "30", ""];  // 7 days, 30 days, all time

  for (const range of dateRanges) {
    if (range) {
      const from = new Date();
      from.setDate(from.getDate() - Number.parseInt(range, 10));
      filters.from = from.toISOString();
    } else {
      delete filters.from;
    }

    await nodesStore.loadNodes(filters, { limit: 100 });

    // If we got results, update the UI filter to match and stop
    if ($nodesStore.nodes.length > 0) {
      dateRangeFilter = range || "all";
      break;
    }
  }

  hasLoadedOnce = true;
}
```

```svelte
<!-- src/web/app/src/routes/+page.svelte - ADD WebSocket listener -->

<script lang="ts">
  import { wsStore } from "$lib/stores/websocket";

  // ... existing code ...

  // Auto-refresh on new node
  $effect(() => {
    if ($wsStore.connected) {
      // The websocket store already handles node.created events
      // We just need to refresh our local data when nodes change
    }
  });

  // Subscribe to node creation events for activity refresh
  onMount(() => {
    const unsubscribe = nodesStore.subscribe((state) => {
      // When nodes store updates (from WS event), refresh activity
      if (state.nodes.length > 0 && !loading) {
        refreshActivity();
      }
    });

    return unsubscribe;
  });

  async function refreshActivity() {
    try {
      const activityResult = await api.listNodes({}, { limit: 5, sort: "timestamp", order: "desc" });
      recentActivity = activityResult.nodes;
    } catch {
      // Silently fail - this is a background refresh
    }
  }
</script>
```

### Verification

```bash
# 1. Clear database to test empty state
rm ~/.pi-brain/data/brain.db

# 2. Start daemon and load graph page
pi-brain daemon start
open http://localhost:8765/graph

# 3. Verify "Getting Started" guide appears

# 4. Queue an analysis, verify dashboard updates automatically
```

---

## 5. Config File Validation (P2)

### Problem

`loadConfig()` doesn't validate file extension, leading to confusing errors if a non-YAML file is provided.

### Tasks

- [ ] **5.1** Add file extension check in `loadConfig()`
  - Location: `src/config/config.ts`
  - Check: Warn if extension is not `.yaml` or `.yml`

### Implementation

```typescript
// src/config/config.ts - MODIFY loadConfig

export function loadConfig(configPath?: string): PiBrainConfig {
  const filePath = configPath ?? DEFAULT_CONFIG_PATH;

  // If no config file exists, return defaults
  if (!fs.existsSync(filePath)) {
    return getDefaultConfig();
  }

  // Validate file extension
  const ext = path.extname(filePath).toLowerCase();
  if (ext && ext !== ".yaml" && ext !== ".yml") {
    throw new ConfigError(
      `Config file must be YAML format (.yaml or .yml), got: ${ext}`,
      filePath
    );
  }

  // ... rest of function
}
```

### Verification

```bash
# Test with wrong extension
echo '{"foo": "bar"}' > /tmp/config.json
pi-brain --config /tmp/config.json daemon status
# Should show clear error about YAML format
```

---

## Completion Criteria

Phase 18 can be declared **truly complete** when:

1. [ ] `npm run build` succeeds without errors
2. [ ] `npm run check` passes (lint + format)
3. [ ] `npm test -- --run` passes (all 1,276+ tests)
4. [ ] Dashboard displays node summaries and outcomes correctly
5. [ ] Graph page displays node labels correctly
6. [ ] Sessions page displays node data correctly
7. [ ] All 5 items in this plan marked as resolved

---

## Related Work

### Phase 17 Pending Tasks (Not blocking Phase 18)

The following semantic search tasks remain pending but are not required for Phase 18 closure:

- 17.6.1: Update findRelevantNodes with semantic + FTS
- 17.6.2: Add semantic_search_threshold config option
- 17.6.3: Integration tests for semantic search
- 17.7.1: Graceful degradation when vec/embed unavailable
- 17.7.2: Handle embedding dimension mismatches
- 17.7.3: Document semantic search configuration
- 17.8.1: Run backfill on existing data and verify

These should be tracked separately as Phase 17 completion items.
