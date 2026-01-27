# Refining the Plan: Code Review Issues & Resolutions

This document captures all issues identified during code review of the pi-brain plan and specifications, along with specific resolutions and implementation guidance.

## Background

pi-brain is a "second brain" for pi coding agent sessions that:

- Analyzes sessions to extract structured insights (nodes)
- Builds a knowledge graph connecting related work
- Provides queryable access via `/brain` command and web UI
- Learns from patterns to improve future prompts

The project builds on existing `pi-tree-viz` code (session parser, analyzer, generator, CLI) which handles Phase 1 static visualization. The specs describe the full pi-brain system across 11 specification documents.

### Existing Specs

| Spec                        | Status   | Description                             |
| --------------------------- | -------- | --------------------------------------- |
| `specs/overview.md`         | Complete | Architecture, tech stack, data flow     |
| `specs/coding-standards.md` | Complete | Ultracite, TypeScript, testing          |
| `specs/storage.md`          | Complete | SQLite schema, JSON format, queries     |
| `specs/node-model.md`       | Complete | Node/edge types, boundaries, versioning |
| `specs/pi-integration.md`   | Complete | Session format, extensions, CLI         |
| `specs/sync-protocol.md`    | Complete | Hub/spoke, Syncthing, rsync             |
| `specs/daemon.md`           | Complete | Watcher, queue, workers, scheduling     |
| `specs/session-analyzer.md` | Complete | Prompt, RLM/codemap, output schema      |
| `specs/api.md`              | Complete | REST API, WebSocket, endpoints          |
| `specs/web-ui.md`           | Complete | SvelteKit, components, D3 graph         |
| `specs/prompt-learning.md`  | Complete | Insight aggregation, prompt injection   |

---

## Issue Summary

| Priority        | Count | Description                           |
| --------------- | ----- | ------------------------------------- |
| **Critical**    | 3     | Must fix before implementation begins |
| **Significant** | 5     | Should fix before relevant phase      |
| **Moderate**    | 4     | Address during implementation         |
| **Minor**       | 5     | Polish during review                  |

---

## Critical Issues

### Issue 1: Missing Segment Extraction Specification

**Priority:** Critical  
**Affects Phase:** 2 (Session Parsing), 3 (Daemon Core)  
**Location:** Gap between `node-model.md` and `daemon.md`

**Problem:**
While `node-model.md` defines boundary types and detection algorithms, there's no specification for:

- How segments are extracted between boundaries
- How the daemon determines what constitutes a "complete" segment
- What happens if a session is actively being written when a boundary is detected
- How segments spanning multiple compactions are handled
- Minimum segment size worth analyzing

**Resolution:**

Add a new section to `daemon.md` titled "Segment Extraction" with the following content:

````typescript
// Add to daemon.md after "Boundary Detection Trigger"

## Segment Extraction

### Segment Completeness

A segment is considered "complete" and ready for analysis when:

1. **Idle detection fires** (10+ minutes since last entry)
2. **Explicit boundary detected** (branch_summary, compaction, fork)
3. **Session file unchanged** for `stabilityThreshold` (5 seconds for local, 30 seconds for synced)

### Active Session Handling

```typescript
interface SegmentReadiness {
  sessionPath: string;
  isComplete: boolean;
  reason: 'idle' | 'boundary' | 'stability' | 'active';
  lastModified: number;
  pendingBoundary?: Boundary;
}

async function checkSegmentReadiness(
  sessionPath: string,
  config: DaemonConfig,
): Promise<SegmentReadiness> {
  const stat = await fs.stat(sessionPath);
  const lastModified = stat.mtimeMs;
  const now = Date.now();

  // Check file stability
  const stableMs = config.isLocalSession(sessionPath)
    ? 5000
    : 30000;  // Longer for synced sessions

  if (now - lastModified < stableMs) {
    return {
      sessionPath,
      isComplete: false,
      reason: 'active',
      lastModified,
    };
  }

  // Check for idle timeout
  const session = await parseSession(sessionPath);
  const lastEntry = session.entries.at(-1);

  if (lastEntry) {
    const entryTime = new Date(lastEntry.timestamp).getTime();
    const idleMs = config.idleTimeoutMinutes * 60 * 1000;

    if (now - entryTime >= idleMs) {
      return {
        sessionPath,
        isComplete: true,
        reason: 'idle',
        lastModified,
      };
    }
  }

  // Check for unprocessed boundaries
  const boundaries = detectBoundaries(session.entries);
  const lastProcessed = await getLastProcessedBoundary(sessionPath);
  const newBoundaries = boundaries.filter(b =>
    !lastProcessed || b.timestamp > lastProcessed.timestamp
  );

  if (newBoundaries.length > 0) {
    return {
      sessionPath,
      isComplete: true,
      reason: 'boundary',
      lastModified,
      pendingBoundary: newBoundaries[0],
    };
  }

  return {
    sessionPath,
    isComplete: false,
    reason: 'active',
    lastModified,
  };
}
````

### Minimum Segment Size

Segments smaller than a threshold are skipped or merged:

```typescript
interface SegmentConfig {
  minEntries: number; // Default: 3
  minMessages: number; // Default: 2 (1 user + 1 assistant minimum)
  minTokens: number; // Default: 100
}

function shouldAnalyzeSegment(
  entries: SessionEntry[],
  config: SegmentConfig
): boolean {
  if (entries.length < config.minEntries) return false;

  const messageCount = entries.filter((e) => e.type === "message").length;
  if (messageCount < config.minMessages) return false;

  // Estimate tokens (rough: 4 chars per token)
  const totalChars = entries.reduce(
    (sum, e) => sum + JSON.stringify(e).length,
    0
  );
  const estimatedTokens = totalChars / 4;

  return estimatedTokens >= config.minTokens;
}
```

### Multi-Compaction Segments

When a segment contains multiple compactions:

1. Treat each compaction as a natural boundary
2. Create separate nodes for each sub-segment
3. Link with `compaction` edges
4. Include compaction summaries as context for subsequent segments

```typescript
function splitByCompactions(entries: SessionEntry[]): SessionEntry[][] {
  const segments: SessionEntry[][] = [];
  let current: SessionEntry[] = [];

  for (const entry of entries) {
    current.push(entry);

    if (entry.type === "compaction") {
      if (current.length > 1) {
        segments.push(current);
      }
      current = [entry]; // Compaction starts next segment as context
    }
  }

  if (current.length > 0) {
    segments.push(current);
  }

  return segments;
}
```

**Spec to Update:** `specs/daemon.md`

---

### Issue 2: Codemap Skill Assumption Without Verification

**Priority:** Critical  
**Affects Phase:** 3 (Daemon Core)  
**Location:** `session-analyzer.md`, `daemon.md`

**Problem:**
The specs state that `codemap` skill is "always loaded" alongside `rlm`, but:

- The `codemap` skill may not exist in the user's pi installation
- No verification before spawning agents
- No fallback behavior if unavailable
- Daemon will crash if skill is missing

**Resolution:**

Update `daemon.md` agent invocation section:

```typescript
// Replace the hardcoded skills line in daemon.md

interface SkillAvailability {
  name: string;
  available: boolean;
  path?: string;
}

const REQUIRED_SKILLS = ["rlm"] as const;
const OPTIONAL_SKILLS = ["codemap"] as const;

async function getAvailableSkills(): Promise<Map<string, SkillAvailability>> {
  const skillsDir = path.join(os.homedir(), "skills");
  const availability = new Map<string, SkillAvailability>();

  const allSkills = [...REQUIRED_SKILLS, ...OPTIONAL_SKILLS];

  for (const skill of allSkills) {
    const skillPath = path.join(skillsDir, skill, "SKILL.md");
    const exists = await fs
      .access(skillPath)
      .then(() => true)
      .catch(() => false);

    availability.set(skill, {
      name: skill,
      available: exists,
      path: exists ? skillPath : undefined,
    });
  }

  return availability;
}

async function validateSkillRequirements(): Promise<void> {
  const skills = await getAvailableSkills();

  const missingRequired = REQUIRED_SKILLS.filter(
    (s) => !skills.get(s)?.available
  );

  if (missingRequired.length > 0) {
    throw new Error(
      `Missing required skills: ${missingRequired.join(", ")}. ` +
        `Ensure these skills are installed in ~/skills/`
    );
  }

  const missingOptional = OPTIONAL_SKILLS.filter(
    (s) => !skills.get(s)?.available
  );
  if (missingOptional.length > 0) {
    console.warn(
      `Optional skills not available: ${missingOptional.join(", ")}. ` +
        `Analysis will proceed without them.`
    );
  }
}

function buildSkillsArg(): string {
  const skills = await getAvailableSkills();

  return [...REQUIRED_SKILLS, ...OPTIONAL_SKILLS]
    .filter((s) => skills.get(s)?.available)
    .join(",");
}

// Update invokeAgent function
async function invokeAgent(
  job: AnalysisJob,
  config: DaemonConfig,
  logger: Logger
): Promise<AgentResult> {
  const skills = await buildSkillsArg();

  const args = [
    "--provider",
    config.provider,
    "--model",
    config.model,
    "--system-prompt",
    config.promptFile,
    "--skills",
    skills, // Dynamic based on availability
    "--no-session",
    "--mode",
    "json",
    "-p",
    buildAnalysisPrompt(job),
  ];

  // ... rest of implementation
}
```

Also update `session-analyzer.md` to reflect optional codemap:

```markdown
### Required Skills

The daemon loads these skills when spawning the analyzer agent:

| Skill     | Required | Purpose                                                           |
| --------- | -------- | ----------------------------------------------------------------- |
| `rlm`     | **Yes**  | Chunks long sessions, processes in parallel. Essential.           |
| `codemap` | No       | Code structure analysis. Enhances understanding but not required. |

If `codemap` is unavailable, analysis proceeds with reduced code structure insight.
The analyzer should note `daemonMeta.codemapAvailable: false` in output.
```

**Specs to Update:** `specs/daemon.md`, `specs/session-analyzer.md`

---

### Issue 3: No Graceful Degradation for Pi CLI Unavailability

**Priority:** Critical  
**Affects Phase:** 3 (Daemon Core)  
**Location:** `daemon.md`

**Problem:**
The daemon assumes `pi` CLI is always available and configured. No handling for:

- Pi not installed
- Pi not in PATH
- Pi lacking required model/provider credentials
- Pi version incompatibility

**Resolution:**

Add a new "Startup Health Checks" section to `daemon.md`:

````typescript
// Add after "Process Management" section in daemon.md

## Startup Health Checks

Before the daemon starts processing, it validates the environment:

```typescript
interface HealthCheckResult {
  check: string;
  passed: boolean;
  message: string;
  fatal: boolean;
}

async function runStartupHealthChecks(
  config: DaemonConfig,
): Promise<HealthCheckResult[]> {
  const results: HealthCheckResult[] = [];

  // Check 1: Pi CLI available
  results.push(await checkPiCli());

  // Check 2: Pi version compatibility
  results.push(await checkPiVersion());

  // Check 3: Required skills available
  results.push(await checkRequiredSkills());

  // Check 4: Model/provider accessible
  results.push(await checkModelAccess(config));

  // Check 5: Sessions directory exists
  results.push(await checkSessionsDir(config));

  // Check 6: Database writable
  results.push(await checkDatabaseAccess(config));

  // Check 7: Prompt file exists
  results.push(await checkPromptFile(config));

  return results;
}

async function checkPiCli(): Promise<HealthCheckResult> {
  try {
    const { stdout } = await execAsync('which pi');
    return {
      check: 'pi-cli',
      passed: true,
      message: `Pi CLI found at ${stdout.trim()}`,
      fatal: false,
    };
  } catch {
    return {
      check: 'pi-cli',
      passed: false,
      message: 'Pi CLI not found in PATH. Install pi-coding-agent globally.',
      fatal: true,
    };
  }
}

async function checkPiVersion(): Promise<HealthCheckResult> {
  try {
    const { stdout } = await execAsync('pi --version');
    const version = stdout.trim();
    const minVersion = '0.1.0';  // Minimum required version

    if (semver.gte(version, minVersion)) {
      return {
        check: 'pi-version',
        passed: true,
        message: `Pi version ${version} meets minimum ${minVersion}`,
        fatal: false,
      };
    }

    return {
      check: 'pi-version',
      passed: false,
      message: `Pi version ${version} below minimum ${minVersion}`,
      fatal: true,
    };
  } catch (error) {
    return {
      check: 'pi-version',
      passed: false,
      message: `Could not determine pi version: ${error}`,
      fatal: false,  // Non-fatal, might still work
    };
  }
}

async function checkModelAccess(
  config: DaemonConfig,
): Promise<HealthCheckResult> {
  try {
    // Attempt a minimal pi invocation to verify model access
    const { stdout } = await execAsync(
      `pi --provider ${config.provider} --model ${config.model} ` +
      `--no-session --mode json -p "Reply with OK"`,
      { timeout: 30000 }
    );

    if (stdout.includes('OK')) {
      return {
        check: 'model-access',
        passed: true,
        message: `Model ${config.provider}/${config.model} accessible`,
        fatal: false,
      };
    }

    return {
      check: 'model-access',
      passed: false,
      message: `Model responded but output unexpected`,
      fatal: false,
    };
  } catch (error) {
    return {
      check: 'model-access',
      passed: false,
      message: `Cannot access ${config.provider}/${config.model}: ${error}`,
      fatal: true,
    };
  }
}

// Daemon startup integration
async function startDaemon(config: DaemonConfig): Promise<void> {
  console.log('Running startup health checks...');

  const results = await runStartupHealthChecks(config);

  const failed = results.filter(r => !r.passed);
  const fatal = failed.filter(r => r.fatal);

  // Log all results
  for (const result of results) {
    const icon = result.passed ? '✓' : '✗';
    console.log(`  ${icon} ${result.check}: ${result.message}`);
  }

  if (fatal.length > 0) {
    console.error('\nFatal errors prevent daemon startup:');
    for (const f of fatal) {
      console.error(`  - ${f.message}`);
    }
    process.exit(1);
  }

  if (failed.length > 0) {
    console.warn('\nWarnings (non-fatal):');
    for (const f of failed) {
      console.warn(`  - ${f.message}`);
    }
  }

  console.log('\nHealth checks passed. Starting daemon...');
  // Continue with normal startup
}
````

**CLI command for manual health check:**

```bash
# Add to CLI commands
pi-brain health

# Output:
# pi-brain Health Check
# ─────────────────────────────
# ✓ pi-cli: Pi CLI found at /usr/local/bin/pi
# ✓ pi-version: Pi version 0.2.1 meets minimum 0.1.0
# ✓ required-skills: rlm skill available
# ⚠ optional-skills: codemap skill not found
# ✓ model-access: Model zai/glm-4.7 accessible
# ✓ sessions-dir: Sessions directory exists with 47 sessions
# ✓ database: Database writable at ~/.pi-brain/data/brain.db
# ✓ prompt-file: Prompt file exists
#
# Status: Ready (1 warning)
```

**Spec to Update:** `specs/daemon.md`

---

## Significant Issues

### Issue 4: Inconsistent Node ID Generation (Collision Risk)

**Priority:** Significant  
**Affects Phase:** 4 (Node Storage & Queries)  
**Location:** `node-model.md`, `storage.md`

**Problem:**

- Node IDs are "8-character hex strings" via `crypto.randomUUID().slice(0, 8)`
- Only 16^8 = ~4.3 billion possible values
- With birthday paradox, 50% collision probability at ~83,000 nodes
- For a long-running knowledge graph, this is a real risk

**Resolution:**

Update `node-model.md` ID generation:

````typescript
// Replace 8-char with 16-char hex IDs

## Node ID Generation

### Format

Node IDs are 16-character hex strings for uniqueness and readability.

```typescript
function generateNodeId(): string {
  // Use first 16 chars of UUID (64 bits of entropy)
  // Collision probability < 0.1% at 1 billion nodes
  return crypto.randomUUID().replace(/-/g, '').slice(0, 16);
}

// Examples: "a1b2c3d4e5f6g7h8", "f9e8d7c6b5a4321f"
````

### Full Node Reference

When referencing a specific version:

```
{nodeId}-v{version}

Examples:
  a1b2c3d4e5f6g7h8-v1    # First version
  a1b2c3d4e5f6g7h8-v3    # Third version (current)
```

### File Naming

```
~/.pi-brain/data/nodes/YYYY/MM/{nodeId}-v{version}.json

Examples:
  ~/.pi-brain/data/nodes/2026/01/a1b2c3d4e5f6g7h8-v1.json
```

Update all references in specs to use 16-character IDs in examples.

**Specs to Update:** `specs/node-model.md`, `specs/storage.md`

---

### Issue 5: FTS5 Trigger Is Incomplete

**Priority:** Significant  
**Affects Phase:** 4 (Node Storage & Queries)  
**Location:** `storage.md`

**Problem:**
The FTS5 trigger inserts empty strings and never populates actual content:

```sql
CREATE TRIGGER nodes_ai AFTER INSERT ON nodes BEGIN
    INSERT INTO nodes_fts(id, summary, content)
    SELECT NEW.id, '', '';  -- Never populated!
END;
```

**Resolution:**

Replace trigger-based approach with application-level FTS management:

````typescript
// Add to storage.md under "Full-Text Search" section

## Full-Text Search

### FTS5 Table

```sql
-- FTS5 for full-text search on node content
CREATE VIRTUAL TABLE nodes_fts USING fts5(
    node_id,
    summary,
    decisions,
    lessons,
    tags,
    content='',  -- Contentless FTS (we manage content ourselves)
    content_rowid='rowid',
    tokenize='porter unicode61'
);
````

### Application-Level FTS Updates

FTS is updated by the application after node creation:

```typescript
interface FtsDocument {
  nodeId: string;
  summary: string;
  decisions: string;
  lessons: string;
  tags: string;
}

function extractFtsDocument(node: Node): FtsDocument {
  // Extract searchable text from node
  const decisions = node.content.keyDecisions
    .map(d => `${d.what} ${d.why}`)
    .join(' ');

  const lessons = Object.values(node.lessons)
    .flat()
    .map(l => `${l.summary} ${l.details}`)
    .join(' ');

  const tags = node.semantic.tags.join(' ');

  return {
    nodeId: node.id,
    summary: node.content.summary,
    decisions,
    lessons,
    tags,
  };
}

async function indexNodeForSearch(
  db: Database,
  node: Node,
): Promise<void> {
  const doc = extractFtsDocument(node);

  // Delete existing (for updates)
  db.run('DELETE FROM nodes_fts WHERE node_id = ?', [node.id]);

  // Insert new
  db.run(`
    INSERT INTO nodes_fts (node_id, summary, decisions, lessons, tags)
    VALUES (?, ?, ?, ?, ?)
  `, [doc.nodeId, doc.summary, doc.decisions, doc.lessons, doc.tags]);
}

// Call after node creation
async function createNode(node: Node): Promise<void> {
  await db.run('INSERT INTO nodes ...', [...]);
  await writeNodeJson(node);
  await indexNodeForSearch(db, node);  // Update FTS
}
```

### Search Queries

```sql
-- Full-text search
SELECT n.*, rank
FROM nodes n
JOIN nodes_fts f ON n.id = f.node_id
WHERE nodes_fts MATCH ?
ORDER BY rank;

-- Search with filters
SELECT n.*, rank
FROM nodes n
JOIN nodes_fts f ON n.id = f.node_id
WHERE nodes_fts MATCH ?
  AND n.project LIKE ?
  AND n.type = ?
ORDER BY rank;
```

**Spec to Update:** `specs/storage.md`

---

### Issue 6: Missing Rate Limiting Implementation

**Priority:** Significant  
**Affects Phase:** 5 (Web UI Core)  
**Location:** `api.md`

**Problem:**
Rate limits are specified but implementation is unclear:

- No storage mechanism for counters
- No algorithm specified (sliding window vs token bucket)
- Unclear scope (per-IP, per-client, global)

**Resolution:**

Add implementation section to `api.md`:

````typescript
// Add after "Rate Limiting" section in api.md

### Implementation

Using `@fastify/rate-limit` with in-memory storage:

```typescript
import rateLimit from '@fastify/rate-limit';

await app.register(rateLimit, {
  global: true,
  max: 60,                    // Default: 60 requests
  timeWindow: '1 minute',

  // Per-route overrides
  keyGenerator: (request) => {
    // Rate limit by IP (localhost allowed higher limits)
    const ip = request.ip;
    return ip === '127.0.0.1' ? 'localhost' : ip;
  },

  // Custom error response
  errorResponseBuilder: (request, context) => ({
    status: 'error',
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests',
      details: {
        retryAfter: Math.ceil(context.ttl / 1000),
      },
    },
  }),
});

// Route-specific limits
app.post('/api/v1/query', {
  config: {
    rateLimit: {
      max: 10,
      timeWindow: '1 minute',
    },
  },
}, queryHandler);

app.post('/api/v1/daemon/*', {
  config: {
    rateLimit: {
      max: 5,
      timeWindow: '1 minute',
    },
  },
}, daemonHandler);
````

### Rate Limit Scoping

| Scope     | Limit         | Rationale                |
| --------- | ------------- | ------------------------ |
| localhost | 10x normal    | Local development        |
| Per-IP    | Normal limits | Standard protection      |
| WebSocket | 30 msg/min    | Prevent message flooding |

### Persistence (Future)

For multi-process deployments, use Redis:

```typescript
import Redis from "ioredis";

await app.register(rateLimit, {
  redis: new Redis(),
  // ... same config
});
```

**Spec to Update:** `specs/api.md`

---

### Issue 7: WebSocket Reconnection Missing Backoff

**Priority:** Significant  
**Affects Phase:** 5 (Web UI Core)  
**Location:** `web-ui.md`

**Problem:**
Fixed 5-second reconnection delay could cause connection flooding:

```typescript
function scheduleReconnect() {
  reconnectTimeout = setTimeout(connect, 5000); // No backoff!
}
```

**Resolution:**

Update WebSocket store in `web-ui.md`:

```typescript
// Replace reconnection logic in web-ui.md

function createWebSocketStore() {
  const { subscribe, set, update } = writable<WSState>({
    connected: false,
    reconnecting: false,
  });

  let ws: WebSocket | null = null;
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  let reconnectAttempts = 0;

  const MAX_RECONNECT_DELAY = 60000; // 1 minute max
  const BASE_DELAY = 1000; // 1 second base

  function getReconnectDelay(): number {
    // Exponential backoff with jitter
    const exponentialDelay = BASE_DELAY * Math.pow(2, reconnectAttempts);
    const jitter = Math.random() * 1000; // 0-1 second jitter
    return Math.min(exponentialDelay + jitter, MAX_RECONNECT_DELAY);
  }

  function connect() {
    ws = new WebSocket("ws://localhost:8765/ws");

    ws.onopen = () => {
      reconnectAttempts = 0; // Reset on successful connection
      set({ connected: true, reconnecting: false });
      ws?.send(
        JSON.stringify({
          type: "subscribe",
          channels: ["daemon", "analysis", "node"],
        })
      );
    };

    ws.onclose = (event) => {
      set({ connected: false, reconnecting: true });

      // Don't reconnect if closed intentionally
      if (event.code === 1000) return;

      scheduleReconnect();
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleMessage(data);
    };
  }

  function scheduleReconnect() {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
    }

    const delay = getReconnectDelay();
    reconnectAttempts++;

    console.log(
      `Reconnecting in ${Math.round(delay / 1000)}s (attempt ${reconnectAttempts})`
    );

    reconnectTimeout = setTimeout(connect, delay);
  }

  function disconnect() {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
    }
    reconnectAttempts = 0;
    ws?.close(1000); // Normal closure
  }

  return {
    subscribe,
    connect,
    disconnect,
  };
}
```

**Spec to Update:** `specs/web-ui.md`

---

### Issue 8: Prompt Versioning Hash Not Specified

**Priority:** Significant  
**Affects Phase:** 3 (Daemon Core)  
**Location:** `session-analyzer.md`, `daemon.md`

**Problem:**
Prompt versions use a "hash" but:

- No hash algorithm specified
- No handling for whitespace-only changes
- No way to force reanalysis on semantic changes

**Resolution:**

Add to `session-analyzer.md` under "Prompt Versioning":

```typescript
## Prompt Versioning

### Version Format

```

v{sequential}-{hash8}

Examples:
v1-a1b2c3d4
v2-e5f6g7h8

````

### Hash Calculation

```typescript
import { createHash } from 'node:crypto';

interface PromptVersion {
  version: string;       // "v1-a1b2c3d4"
  sequential: number;    // 1, 2, 3, ...
  hash: string;          // 8-char SHA-256 prefix
  createdAt: string;
  filePath: string;
}

function calculatePromptHash(content: string): string {
  // Normalize: trim, collapse whitespace, remove comments
  const normalized = content
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/<!--[\s\S]*?-->/g, '');  // Remove HTML comments

  return createHash('sha256')
    .update(normalized)
    .digest('hex')
    .slice(0, 8);
}

async function getOrCreatePromptVersion(
  promptPath: string,
): Promise<PromptVersion> {
  const content = await fs.readFile(promptPath, 'utf-8');
  const hash = calculatePromptHash(content);

  // Check if this hash already exists
  const existing = await db.get(
    'SELECT * FROM prompt_versions WHERE content_hash = ?',
    [hash]
  );

  if (existing) {
    return existing;
  }

  // Create new version
  const lastVersion = await db.get(
    'SELECT MAX(sequential) as max FROM prompt_versions'
  );
  const sequential = (lastVersion?.max ?? 0) + 1;
  const version = `v${sequential}-${hash}`;

  // Archive the prompt content
  const archivePath = path.join(
    os.homedir(),
    '.pi-brain/prompts/history',
    `${version}-${new Date().toISOString().split('T')[0]}.md`
  );
  await fs.copyFile(promptPath, archivePath);

  // Record in database
  await db.run(`
    INSERT INTO prompt_versions (version, content_hash, created_at, file_path)
    VALUES (?, ?, datetime('now'), ?)
  `, [version, hash, archivePath]);

  return {
    version,
    sequential,
    hash,
    createdAt: new Date().toISOString(),
    filePath: archivePath,
  };
}
````

### Forcing Reanalysis

To force reanalysis when semantic meaning changes but normalization produces same hash:

```bash
# Manually bump version by adding a comment with timestamp
# At top of session-analyzer.md:
<!-- Version bump: 2026-01-25 - Added hadClearGoal detection -->

# Or use CLI
pi-brain prompt bump --reason "Added hadClearGoal detection"
```

**Spec to Update:** `specs/session-analyzer.md`

---

## Moderate Issues

### Issue 9: No Session Retention Policy

**Priority:** Moderate  
**Affects Phase:** 8 (Sync & Multi-computer)  
**Location:** All specs

**Problem:**
No mechanism to manage storage growth—sessions, nodes, and JSON files accumulate indefinitely.

**Recommendation:**

Add retention configuration to `overview.md` or create new `specs/retention.md`:

```yaml
# ~/.pi-brain/config.yaml

retention:
  # Session retention (original pi sessions - managed separately)
  sessions:
    enabled: false # Don't delete pi sessions by default

  # Node retention
  nodes:
    # Archive old versions to compressed storage
    archive_versions_after_days: 90
    archive_path: ~/.pi-brain/archive/nodes

    # Delete archived versions after this period
    delete_archived_after_days: 365

    # Always keep current version
    keep_current: true

  # JSON file retention
  json_files:
    compress_after_days: 30 # gzip old JSON files

  # Database maintenance
  database:
    vacuum_schedule: "0 4 * * 0" # Weekly vacuum at 4am Sunday
    backup_before_vacuum: true
```

Implementation:

```typescript
async function runRetentionPolicy(config: RetentionConfig): Promise<void> {
  // Archive old node versions
  const cutoffDate = subDays(
    new Date(),
    config.nodes.archive_versions_after_days
  );

  const oldVersions = await db.all(
    `
    SELECT * FROM nodes 
    WHERE version < (
      SELECT MAX(version) FROM nodes n2 WHERE n2.id = nodes.id
    )
    AND analyzed_at < ?
  `,
    [cutoffDate.toISOString()]
  );

  for (const node of oldVersions) {
    await archiveNode(node, config.nodes.archive_path);
    await db.run("DELETE FROM nodes WHERE id = ? AND version = ?", [
      node.id,
      node.version,
    ]);
  }

  // Compress old JSON files
  // Delete old archives
  // etc.
}
```

**Action:** Create `specs/retention.md` or add section to `specs/storage.md`

---

### Issue 10: No Validation Schema for Analyzer Output

**Priority:** Moderate  
**Affects Phase:** 3 (Daemon Core)  
**Location:** `session-analyzer.md`

**Problem:**
Analyzer outputs JSON without runtime validation—malformed responses could crash storage.

**Recommendation:**

Add TypeBox schema to `session-analyzer.md`:

````typescript
// Add to session-analyzer.md

## Output Validation

### TypeBox Schema

```typescript
import { Type, Static } from '@sinclair/typebox';
import { TypeCompiler } from '@sinclair/typebox/compiler';

const LessonSchema = Type.Object({
  level: Type.Union([
    Type.Literal('project'),
    Type.Literal('task'),
    Type.Literal('user'),
    Type.Literal('model'),
    Type.Literal('tool'),
    Type.Literal('skill'),
    Type.Literal('subagent'),
  ]),
  summary: Type.String({ minLength: 1 }),
  details: Type.String(),
  confidence: Type.Union([
    Type.Literal('high'),
    Type.Literal('medium'),
    Type.Literal('low'),
  ]),
  tags: Type.Array(Type.String()),
});

const NodeOutputSchema = Type.Object({
  classification: Type.Object({
    type: Type.String(),
    project: Type.String(),
    isNewProject: Type.Boolean(),
    hadClearGoal: Type.Boolean(),
    language: Type.Optional(Type.String()),
    frameworks: Type.Optional(Type.Array(Type.String())),
  }),
  content: Type.Object({
    summary: Type.String({ minLength: 10 }),
    outcome: Type.Union([
      Type.Literal('success'),
      Type.Literal('partial'),
      Type.Literal('failed'),
      Type.Literal('abandoned'),
    ]),
    keyDecisions: Type.Array(Type.Object({
      what: Type.String(),
      why: Type.String(),
      alternativesConsidered: Type.Array(Type.String()),
    })),
    filesTouched: Type.Array(Type.String()),
    toolsUsed: Type.Array(Type.String()),
    errorsSeen: Type.Array(Type.Object({
      type: Type.String(),
      message: Type.String(),
      resolved: Type.Boolean(),
    })),
  }),
  lessons: Type.Object({
    project: Type.Array(LessonSchema),
    task: Type.Array(LessonSchema),
    user: Type.Array(LessonSchema),
    model: Type.Array(LessonSchema),
    tool: Type.Array(LessonSchema),
    skill: Type.Array(LessonSchema),
    subagent: Type.Array(LessonSchema),
  }),
  // ... rest of schema
});

type NodeOutput = Static<typeof NodeOutputSchema>;

const validateNodeOutput = TypeCompiler.Compile(NodeOutputSchema);

function parseAndValidateOutput(jsonString: string): NodeOutput {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch (e) {
    throw new Error(`Invalid JSON from analyzer: ${e}`);
  }

  if (!validateNodeOutput.Check(parsed)) {
    const errors = [...validateNodeOutput.Errors(parsed)];
    throw new Error(
      `Invalid node output: ${errors.map(e => `${e.path}: ${e.message}`).join(', ')}`
    );
  }

  return parsed;
}
````

### Partial Result Handling

If validation fails, attempt to salvage partial data:

```typescript
function salvagePartialOutput(parsed: unknown): Partial<NodeOutput> | null {
  const partial: Partial<NodeOutput> = {};

  if (typeof parsed === "object" && parsed !== null) {
    const obj = parsed as Record<string, unknown>;

    // Try to extract what we can
    if (obj.classification && typeof obj.classification === "object") {
      partial.classification = obj.classification as any;
    }
    if (obj.content?.summary && typeof obj.content.summary === "string") {
      partial.content = {
        summary: obj.content.summary,
        outcome: "partial",
        keyDecisions: [],
        filesTouched: [],
        toolsUsed: [],
        errorsSeen: [],
      };
    }

    // Mark as needing reanalysis
    partial.daemonMeta = {
      decisions: [
        {
          timestamp: new Date().toISOString(),
          decision: "Salvaged partial output due to validation failure",
          reasoning: "Full output did not pass schema validation",
          needsReview: true,
        },
      ],
      rlmUsed: false,
    };
  }

  return Object.keys(partial).length > 0 ? partial : null;
}
```

**Action:** Add to `specs/session-analyzer.md`

---

### Issue 11: Circular Dependency Risk in Prompt Learning

**Priority:** Moderate  
**Affects Phase:** 9 (Prompt Learning)  
**Location:** `prompt-learning.md`

**Problem:**
Prompt learning modifies AGENTS.md, which affects ALL pi sessions, not just the analyzer. This could:

- Inject model-specific hints that don't apply to all contexts
- Create feedback loops where quirks are reinforced
- Affect unrelated projects

**Recommendation:**

Update `prompt-learning.md` to prefer skill-based injection:

````markdown
## Injection Methods

### Recommended: Skill-Based Injection (Default)

Create a `brain-insights` skill that's loaded only for analysis sessions:

```markdown
---
name: brain-insights
description: Load learned insights about current model
trigger: manual
---

# Model Insights for {model}

{dynamically generated content}
```
````

This approach:

- Only affects analyzer sessions
- No cross-contamination with user sessions
- Easy to disable/enable
- Version controlled separately

### Not Recommended: AGENTS.md Modification

Modifying `~/.pi/agent/AGENTS.md` affects ALL sessions:

- User coding sessions
- Extension commands
- Subagent invocations

Only use if you want global model hints. Enable with:

```yaml
prompt_learning:
  injection_method: agents_file # NOT recommended
  injection_scope: global # Default would be 'analysis_only'
```

### Scoped Insights

Even with skill injection, scope insights appropriately:

```typescript
function shouldApplyInsight(
  insight: AggregatedInsight,
  context: AnalysisContext
): boolean {
  // Tool errors: apply broadly
  if (insight.type === "tool_error") return true;

  // Model quirks: only for matching model
  if (insight.type === "quirk" && insight.model !== context.model) {
    return false;
  }

  // Project lessons: only for matching project
  if (insight.level === "project" && insight.project !== context.project) {
    return false;
  }

  return true;
}
```

````

**Action:** Update `specs/prompt-learning.md`

---

### Issue 12: Inadequate Error Categories for Queue

**Priority:** Moderate
**Affects Phase:** 3 (Daemon Core)
**Location:** `daemon.md`

**Problem:**
Error categories don't distinguish between transient and permanent failures—a malformed session will retry forever.

**Recommendation:**

Update error handling in `daemon.md`:

```typescript
// Add to daemon.md "Error Handling" section

### Error Classification

```typescript
type ErrorCategory = {
  type: 'transient';
  retryable: true;
  maxRetries: number;
} | {
  type: 'permanent';
  retryable: false;
  reason: string;
} | {
  type: 'unknown';
  retryable: true;
  maxRetries: number;
};

function classifyError(error: Error, context: JobContext): ErrorCategory {
  const message = error.message.toLowerCase();

  // Permanent: session file issues
  if (message.includes('enoent') || message.includes('file not found')) {
    return { type: 'permanent', retryable: false, reason: 'Session file not found' };
  }
  if (message.includes('invalid session header')) {
    return { type: 'permanent', retryable: false, reason: 'Malformed session file' };
  }
  if (message.includes('empty session')) {
    return { type: 'permanent', retryable: false, reason: 'Empty session file' };
  }

  // Permanent: schema issues (likely analyzer bug)
  if (message.includes('schema validation')) {
    return { type: 'permanent', retryable: false, reason: 'Output validation failed' };
  }

  // Transient: network/resource issues
  if (message.includes('timeout') || message.includes('etimedout')) {
    return { type: 'transient', retryable: true, maxRetries: 3 };
  }
  if (message.includes('rate limit') || message.includes('429')) {
    return { type: 'transient', retryable: true, maxRetries: 5 };
  }
  if (message.includes('connection refused') || message.includes('econnrefused')) {
    return { type: 'transient', retryable: true, maxRetries: 3 };
  }

  // Transient: model issues
  if (message.includes('overloaded') || message.includes('capacity')) {
    return { type: 'transient', retryable: true, maxRetries: 5 };
  }

  // Unknown: retry with limited attempts
  return { type: 'unknown', retryable: true, maxRetries: 2 };
}

async function handleJobError(
  job: AnalysisJob,
  error: Error,
): Promise<void> {
  const category = classifyError(error, job);

  if (!category.retryable) {
    // Move to dead letter queue
    await db.run(`
      UPDATE analysis_queue
      SET status = 'failed',
          completed_at = datetime('now'),
          error = ?,
          error_category = 'permanent'
      WHERE id = ?
    `, [category.reason, job.id]);

    logger.error(`Job ${job.id} permanently failed: ${category.reason}`);
    return;
  }

  if (job.retryCount >= category.maxRetries) {
    await db.run(`
      UPDATE analysis_queue
      SET status = 'failed',
          completed_at = datetime('now'),
          error = ?,
          error_category = 'max_retries'
      WHERE id = ?
    `, [error.message, job.id]);

    logger.error(`Job ${job.id} exceeded max retries (${category.maxRetries})`);
    return;
  }

  // Schedule retry
  const delay = calculateRetryDelay(job.retryCount, category);
  await db.run(`
    UPDATE analysis_queue
    SET status = 'pending',
        retry_count = retry_count + 1,
        error = ?,
        locked_until = datetime('now', '+' || ? || ' seconds')
    WHERE id = ?
  `, [error.message, delay, job.id]);

  logger.info(`Job ${job.id} scheduled for retry in ${delay}s`);
}
````

**Action:** Update `specs/daemon.md`

---

## Minor Issues

### Issue 13: Inconsistent Time Formats

**Priority:** Minor  
**Affects Phase:** All

**Problem:**
Inconsistent time references: "10+ minute gap", "10 minutes", snake_case in YAML vs camelCase in TypeScript.

**Recommendation:**

- YAML config: always `snake_case`
- TypeScript: always `camelCase`
- Documentation: always include units ("10 minutes" not "10+")
- Constants: define in one place

```typescript
// src/constants.ts
export const DEFAULTS = {
  idleTimeoutMinutes: 10,
  stabilityThresholdMs: 5000,
  maxRetries: 3,
  // ...
} as const;
```

**Action:** Review all specs for consistency

---

### Issue 14: Missing Index on `analysis_queue.session_file`

**Priority:** Minor  
**Affects Phase:** 3 (Daemon Core)  
**Location:** `daemon.md`

**Problem:**
The index `idx_queue_session` is defined in `storage.md` but missing from `daemon.md`.

**Recommendation:**

Add to `daemon.md` queue schema:

```sql
-- Add after existing indexes
CREATE INDEX idx_queue_session_file ON analysis_queue(session_file);
```

Or reference `storage.md` for complete schema.

**Action:** Update `specs/daemon.md`

---

### Issue 15: D3.js Type Safety

**Priority:** Minor  
**Affects Phase:** 5 (Web UI Core)  
**Location:** `web-ui.md`

**Problem:**
Graph component uses raw D3 without proper typing.

**Recommendation:**

Add typed interfaces:

```typescript
import type { SimulationNodeDatum, SimulationLinkDatum } from "d3";

interface GraphNode extends SimulationNodeDatum {
  id: string;
  classification: {
    type: string;
    project: string;
  };
  content: {
    summary: string;
  };
  // D3 adds: x, y, vx, vy, fx, fy
}

interface GraphEdge extends SimulationLinkDatum<GraphNode> {
  id: string;
  type: EdgeType;
  // D3 uses: source, target (can be string or node ref)
}
```

**Action:** Update `specs/web-ui.md`

---

### Issue 16: SQL Injection Risk Pattern

**Priority:** Minor  
**Affects Phase:** 3-4  
**Location:** `daemon.md`

**Problem:**
Template literal in SQL with computed values is risky pattern:

```typescript
// Bad
`SET locked_until = datetime('now', '+${delayMinutes} minutes')`;
```

**Recommendation:**

Use parameterized:

```typescript
// Good
db.run(
  `
  UPDATE analysis_queue
  SET locked_until = datetime('now', '+' || ? || ' minutes')
  WHERE id = ?
`,
  [delayMinutes, jobId]
);
```

**Action:** Review all SQL in specs for parameterization

---

### Issue 17: Missing CORS Configuration for Dev

**Priority:** Minor  
**Affects Phase:** 5 (Web UI Core)  
**Location:** `api.md`

**Problem:**
No guidance for development CORS setup.

**Recommendation:**

Add to `api.md`:

```yaml
# Development configuration
api:
  cors_origins:
    - "http://localhost:5173" # Vite dev server
    - "http://localhost:3000" # Alternative dev port
    - "http://127.0.0.1:5173"
```

```typescript
// In server setup
if (process.env.NODE_ENV === "development") {
  await app.register(cors, {
    origin: ["http://localhost:5173", "http://localhost:3000"],
    credentials: true,
  });
}
```

**Action:** Update `specs/api.md`

---

## Documentation Issues

### Issue 18: PLAN.md vs Specs Drift

**Priority:** Minor (Documentation)

**Problem:**
`PLAN.md` describes "pi-tree-viz" with static HTML generator (Phase 1) and live dashboard (Phase 2), but specs describe "pi-brain" which is a much larger system.

**Recommendation:**

Update `PLAN.md` header to clarify:

```markdown
# pi-brain: Implementation Plan

> **Note:** This plan has evolved from the original `pi-tree-viz` project.
> Phase 1 (Static Visualizer) is complete in the existing codebase.
> The specs in `specs/` describe the full pi-brain system.

## Original pi-tree-viz Phases (Complete)

- **Phase 1**: Static HTML generator ✅ (see `src/`)
- **Phase 2**: Live dashboard ✅ (see `extensions/dashboard/`)

## pi-brain Phases (This Document)

The remainder of this document describes pi-brain...
```

**Action:** Update `docs/PLAN.md` header

---

### Issue 19: No Reference to Reusable Code

**Priority:** Minor (Documentation)

**Problem:**
Specs don't reference which existing `pi-tree-viz` code can be reused.

**Recommendation:**

Add to `specs/overview.md`:

```markdown
## Existing Code (from pi-tree-viz)

The following modules from the existing codebase can be reused:

| Module           | Path                      | Reusable For                      |
| ---------------- | ------------------------- | --------------------------------- |
| Session Parser   | `src/parser.ts`           | Phase 2: Session parsing          |
| Type Definitions | `src/types.ts`            | All phases: base types            |
| Tree Builder     | `src/parser.ts:buildTree` | Phase 2: Tree construction        |
| Session Analyzer | `src/analyzer.ts`         | Phase 2: Scanning, fork detection |
| CLI Framework    | `src/cli.ts`              | Phase 3: Daemon CLI base          |

### Modules to Rewrite

| Module    | Current            | Reason                             |
| --------- | ------------------ | ---------------------------------- |
| Generator | `src/generator.ts` | Replace static HTML with SvelteKit |
| Types     | `src/types.ts`     | Extend for full Node schema        |
```

**Action:** Add to `specs/overview.md`

---

## Implementation Phase Mapping

### Pre-Implementation (Before Coding)

Must resolve:

- **Issue 1** (Segment extraction spec)
- **Issue 2** (Codemap skill verification)
- **Issue 3** (Pi CLI health checks)
- **Issue 18** (PLAN.md clarification)
- **Issue 19** (Reusable code documentation)

### Phase 1: Foundation

Should have resolved:

- **Issue 4** (Node ID length) — affects schema design
- **Issue 5** (FTS5 approach) — affects schema design
- **Issue 13** (Time format consistency)

### Phase 2: Session Parsing

No blocking issues (uses existing code).

### Phase 3: Daemon Core

Should have resolved:

- **Issue 8** (Prompt versioning hash)
- **Issue 12** (Error classification)
- **Issue 14** (Queue indexes)
- **Issue 16** (SQL injection patterns)

### Phase 4: Node Storage & Queries

Should have resolved:

- **Issue 10** (Output validation schema)

### Phase 5: Web UI Core

Should have resolved:

- **Issue 6** (Rate limiting implementation)
- **Issue 7** (WebSocket reconnection)
- **Issue 15** (D3 typing)
- **Issue 17** (CORS for dev)

### Phase 8: Sync & Multi-computer

Should have resolved:

- **Issue 9** (Retention policy)

### Phase 9: Prompt Learning

Should have resolved:

- **Issue 11** (Circular dependency risk)

---

## Pre-Implementation Checklist

Complete these items before writing implementation code:

### Spec Updates Required

- [ ] **`specs/daemon.md`**: Add "Segment Extraction" section (Issue 1)
- [ ] **`specs/daemon.md`**: Add skill availability checking (Issue 2)
- [ ] **`specs/daemon.md`**: Add "Startup Health Checks" section (Issue 3)
- [ ] **`specs/daemon.md`**: Add error classification (Issue 12)
- [ ] **`specs/daemon.md`**: Add missing queue index (Issue 14)
- [ ] **`specs/node-model.md`**: Update ID length to 16 chars (Issue 4)
- [ ] **`specs/storage.md`**: Update ID length, fix FTS5 (Issues 4, 5)
- [ ] **`specs/session-analyzer.md`**: Add output validation schema (Issue 10)
- [ ] **`specs/session-analyzer.md`**: Add prompt hash specification (Issue 8)
- [ ] **`specs/api.md`**: Add rate limiting implementation (Issue 6)
- [ ] **`specs/api.md`**: Add CORS dev configuration (Issue 17)
- [ ] **`specs/web-ui.md`**: Fix WebSocket reconnection (Issue 7)
- [ ] **`specs/web-ui.md`**: Add D3 typing (Issue 15)
- [ ] **`specs/prompt-learning.md`**: Change default to skill injection (Issue 11)
- [ ] **`specs/overview.md`**: Add reusable code section (Issue 19)

### New Specs/Sections to Create

- [ ] `specs/daemon.md` → "Segment Extraction" (new section)
- [ ] `specs/daemon.md` → "Startup Health Checks" (new section)
- [ ] `specs/retention.md` OR `specs/storage.md` → retention policy (Issue 9)

### Documentation Updates

- [ ] **`docs/PLAN.md`**: Add header clarifying pi-tree-viz vs pi-brain (Issue 18)
- [ ] **`README.md`**: Update to describe pi-brain scope

### Validation

- [ ] Ensure all SQL examples use parameterized queries (Issue 16)
- [ ] Ensure time references are consistent across specs (Issue 13)
- [ ] Verify all 16-char ID examples are updated in specs

---

## Quick Reference: Issue by Spec

| Spec                  | Issues              |
| --------------------- | ------------------- |
| `daemon.md`           | 1, 2, 3, 12, 14, 16 |
| `node-model.md`       | 4                   |
| `storage.md`          | 4, 5, 9             |
| `session-analyzer.md` | 2, 8, 10            |
| `api.md`              | 6, 17               |
| `web-ui.md`           | 7, 15               |
| `prompt-learning.md`  | 11                  |
| `overview.md`         | 19                  |
| `PLAN.md`             | 18                  |
| All specs             | 13                  |

---

## Summary

The pi-brain specs are comprehensive and well-structured. The 19 issues identified are resolvable before or during implementation. The 3 critical issues must be addressed before coding begins:

1. **Segment extraction** — Add spec for how segments are identified and extracted
2. **Codemap skill** — Make optional with fallback
3. **Pi CLI availability** — Add startup health checks

With these addressed, the specs provide a solid foundation for implementation.
