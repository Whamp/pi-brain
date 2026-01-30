# Semgrep Findings Remediation Plan

## Summary

| Rule | Findings | Priority | Effort |
|------|----------|----------|--------|
| `no-console-log` | 41 | Medium | Low |
| `no-sync-fs-in-async` | 20 | High | Medium |
| `tainted-direct-response` | 1 | Low | Low |
| **Total** | **62** | | |

---

## Phase 1: Create Logger Infrastructure (Prerequisite)

**Goal:** Replace console.log with a proper logger that supports log levels and can be disabled in tests.

### Task 1.1: Create Logger Module

Create `src/utils/logger.ts`:

```typescript
type LogLevel = "debug" | "info" | "warn" | "error";

interface Logger {
  debug: (msg: string, ...args: unknown[]) => void;
  info: (msg: string, ...args: unknown[]) => void;
  warn: (msg: string, ...args: unknown[]) => void;
  error: (msg: string, ...args: unknown[]) => void;
}

function createLogger(prefix: string): Logger {
  const log = (level: LogLevel, msg: string, ...args: unknown[]) => {
    const timestamp = new Date().toISOString();
    console[level](`[${timestamp}] [${prefix}] ${msg}`, ...args);
  };

  return {
    debug: (msg, ...args) => log("debug", msg, ...args),
    info: (msg, ...args) => log("info", msg, ...args),
    warn: (msg, ...args) => log("warn", msg, ...args),
    error: (msg, ...args) => log("error", msg, ...args),
  };
}
```

### Task 1.2: Update Semgrep Rule

Exclude logger.ts from console.log rule since it wraps console intentionally.

---

## Phase 2: Fix console.log Findings (41 findings)

### Task 2.1: Daemon Process (32 findings)

**File:** `src/daemon/daemon-process.ts`

- Create logger: `const log = createLogger("daemon")`
- Replace all `console.log` with `log.info`
- Replace error logs with `log.error`

### Task 2.2: Daemon Components (6 findings)

| File | Lines | Action |
|------|-------|--------|
| `src/daemon/export.ts` | 141, 160 | Use `createLogger("export")` |
| `src/daemon/insight-aggregation.ts` | 168, 579 | Use `createLogger("insights")` |
| `src/daemon/processor.ts` | 56 | Replace inline logger with createLogger |
| `src/daemon/scheduler.ts` | 88 | Replace inline logger with createLogger |

### Task 2.3: API Layer (1 finding)

**File:** `src/api/websocket.ts:88`

- Use `createLogger("websocket")`

### Task 2.4: Web App (1 finding)

**File:** `src/web/app/src/lib/stores/websocket.ts:99`

- Create browser-compatible logger or use `// semgrep-ignore` with justification (reconnection logging is useful for debugging)

### Task 2.5: Already Excluded (1 finding)

**File:** `src/daemon/export.ts` (if CLI output, may be intentional)

- Review if this is user-facing CLI output vs debug logging

---

## Phase 3: Fix Sync FS in Async (20 findings)

### Task 3.1: Config Routes (15 findings)

**File:** `src/api/routes/config.ts`

Lines: 1139-1154, 1268-1283, 1411-1426, 1515-1530, 1751-1778

**Pattern to fix:**
```typescript
// Before
if (fs.existsSync(path)) {
  const content = fs.readFileSync(path, "utf8");
}
fs.writeFileSync(path, content, "utf8");

// After
import { access, readFile, writeFile } from "fs/promises";

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

if (await fileExists(path)) {
  const content = await readFile(path, "utf8");
}
await writeFile(path, content, "utf8");
```

**Refactoring approach:**
1. Create helper: `src/utils/fs-async.ts` with `fileExists`, `safeReadFile`, `safeWriteFile`
2. Replace all 5 occurrences in config.ts

### Task 3.2: Daemon Routes (1 finding)

**File:** `src/api/routes/daemon.ts:175`

- Convert `fs.existsSync` to async check

### Task 3.3: CLI (2 findings)

**File:** `src/daemon/cli.ts:400-401`

- If this is CLI initialization code that runs before async context, consider:
  - Moving to top-level sync code outside async function
  - Or converting to async with top-level await

### Task 3.4: Export (2 findings)

**File:** `src/daemon/export.ts:92, 129`

- Convert to fs/promises

---

## Phase 4: Fix Tainted Response (1 finding)

### Task 4.1: Clusters Route

**File:** `src/api/routes/clusters.ts`

- Review the finding - likely a false positive for Fastify
- If false positive, add to exclusion list or add inline ignore with comment
- If real, ensure response data is validated/sanitized

---

## Implementation Order

```
Week 1:
├── Phase 1: Logger infrastructure (1-2 hours)
├── Phase 2.1: daemon-process.ts (1 hour)
└── Phase 2.2: Other daemon files (30 min)

Week 2:
├── Phase 3.1: fs-async helpers (30 min)
├── Phase 3.1: config.ts refactor (2 hours)
└── Phase 3.2-3.4: Other fs fixes (1 hour)

Week 3:
├── Phase 2.3-2.4: API/Web console.log (30 min)
├── Phase 4: Review tainted response (15 min)
└── Final validation run
```

---

## Verification

After each phase:

```bash
# Quick check (custom rules only)
npm run semgrep:quick

# Full check
npm run semgrep

# Should show 0 findings when complete
```

---

## Files to Create

1. `src/utils/logger.ts` - Structured logger
2. `src/utils/fs-async.ts` - Async fs helpers

## Files to Modify

| File | Changes |
|------|---------|
| `src/daemon/daemon-process.ts` | Replace 32 console.log |
| `src/daemon/export.ts` | Replace 2 console.log, 2 sync fs |
| `src/daemon/insight-aggregation.ts` | Replace 2 console.log |
| `src/daemon/processor.ts` | Replace 1 console.log |
| `src/daemon/scheduler.ts` | Replace 1 console.log |
| `src/api/websocket.ts` | Replace 1 console.log |
| `src/api/routes/config.ts` | Replace 15 sync fs calls |
| `src/api/routes/daemon.ts` | Replace 1 sync fs call |
| `src/daemon/cli.ts` | Replace 2 sync fs calls |
| `src/web/app/src/lib/stores/websocket.ts` | Review 1 console.log |
| `.semgrep.yml` | Exclude logger.ts from no-console-log |

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Breaking async/await chains | Run tests after each file change |
| Logger import cycles | Keep logger.ts dependency-free |
| CLI behavior change | Test CLI commands manually |
| Config file race conditions | Use atomic write patterns |
