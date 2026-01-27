# Daemon Architecture

Process management, work queue, agent invocation, and scheduled jobs for pi-brain.

## Overview

The daemon is a persistent background process that:

1. Watches session directories for changes
2. Detects node boundaries and queues analysis work
3. Spawns pi agents to analyze sessions
4. Stores results in the knowledge graph
5. Runs scheduled jobs (nightly reanalysis, connection discovery)

## Architecture

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                              Daemon Process                                    │
│                                                                                │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────────────┐│
│  │   Watcher   │──▶│    Queue    │◀──│  Scheduler  │   │    CLI Interface    ││
│  │             │   │   Manager   │   │             │   │                     ││
│  │ - inotify   │   │             │   │ - Cron      │   │ - start/stop/status ││
│  │ - polling   │   │ - SQLite    │   │ - Nightly   │   │ - queue info        ││
│  │ - idle det. │   │ - Priority  │   │ - Reanalysis│   │ - force analyze     ││
│  └─────────────┘   └──────┬──────┘   └─────────────┘   └─────────────────────┘│
│                           │                                                    │
│                           ▼                                                    │
│                    ┌─────────────┐                                             │
│                    │   Worker    │                                             │
│                    │   Pool      │                                             │
│                    │             │                                             │
│                    │ - Spawn pi  │                                             │
│                    │ - Parse out │                                             │
│                    │ - Store     │                                             │
│                    └─────────────┘                                             │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

## Process Management

### Starting the Daemon

```bash
# Start daemon (detached, writes PID file)
pi-brain daemon start

# Start in foreground (for debugging)
pi-brain daemon start --foreground

# With custom config
pi-brain daemon start --config ~/.pi-brain/config.yaml
```

### Stopping the Daemon

```bash
# Graceful shutdown (finish current job)
pi-brain daemon stop

# Force stop
pi-brain daemon stop --force
```

### Status and Control

```bash
# Check daemon status
pi-brain daemon status

# View queue status
pi-brain daemon queue

# Force analyze a session
pi-brain daemon analyze /path/to/session.jsonl

# Trigger nightly job manually
pi-brain daemon run-nightly
```

### PID and Logging

```
~/.pi-brain/
├── daemon.pid          # PID file for running daemon
└── logs/
    ├── daemon.log      # Main daemon log (rotated)
    └── analysis/
        └── <job-id>.log  # Per-analysis logs
```

### Daemon Configuration

```typescript
interface DaemonConfig {
  // Directories to watch
  sessionsDir: string; // ~/.pi/agent/sessions
  spokesDirs: string[]; // Additional synced directories

  // Behavior
  idleTimeoutMinutes: number; // Default: 10
  parallelWorkers: number; // Default: 1
  maxRetries: number; // Default: 3
  retryDelaySeconds: number; // Default: 60

  // Model settings
  provider: string; // Default: "zai"
  model: string; // Default: "glm-4.7"
  promptFile: string; // Path to analyzer prompt

  // Scheduling
  reanalysisSchedule: string; // Cron format, default: "0 2 * * *"
  connectionDiscoverySchedule: string; // Cron format

  // Resource limits
  maxConcurrentAnalysis: number; // Default: 1
  analysisTimeoutMinutes: number; // Default: 30
  maxQueueSize: number; // Default: 1000
}
```

## File Watcher

### Implementation

Uses `chokidar` for cross-platform file watching with inotify on Linux.

```typescript
import chokidar from "chokidar";

class SessionWatcher {
  private watcher: chokidar.FSWatcher | null = null;
  private sessionStates = new Map<string, SessionState>();

  async start(config: DaemonConfig): Promise<void> {
    const watchPaths = [config.sessionsDir, ...config.spokesDirs];

    this.watcher = chokidar.watch(watchPaths, {
      persistent: true,
      ignoreInitial: false,
      depth: 2, // session/project-dir/files
      awaitWriteFinish: {
        stabilityThreshold: 2000, // Wait for writes to settle
        pollInterval: 100,
      },
    });

    this.watcher
      .on("add", (path) => this.handleNewFile(path))
      .on("change", (path) => this.handleFileChange(path))
      .on("error", (error) => this.handleError(error));
  }

  private async handleNewFile(path: string): Promise<void> {
    if (!path.endsWith(".jsonl")) return;

    // Track new session
    this.sessionStates.set(path, {
      path,
      lastModified: Date.now(),
      lastAnalyzed: null,
      idleTimer: null,
    });

    // Start idle detection
    this.scheduleIdleCheck(path);
  }

  private async handleFileChange(path: string): Promise<void> {
    if (!path.endsWith(".jsonl")) return;

    const state = this.sessionStates.get(path);
    if (state) {
      state.lastModified = Date.now();
      this.scheduleIdleCheck(path);
    }
  }
}
```

### Idle Detection

```typescript
interface SessionState {
  path: string;
  lastModified: number;
  lastAnalyzed: number | null;
  idleTimer: NodeJS.Timeout | null;
}

class IdleDetector {
  constructor(
    private config: DaemonConfig,
    private onIdle: (session: string) => void
  ) {}

  scheduleIdleCheck(path: string, state: SessionState): void {
    // Clear existing timer
    if (state.idleTimer) {
      clearTimeout(state.idleTimer);
    }

    // Schedule new check
    state.idleTimer = setTimeout(
      () => {
        this.checkIdle(path, state);
      },
      this.config.idleTimeoutMinutes * 60 * 1000
    );
  }

  private checkIdle(path: string, state: SessionState): void {
    const idleDuration = Date.now() - state.lastModified;
    const idleMinutes = idleDuration / (1000 * 60);

    if (idleMinutes >= this.config.idleTimeoutMinutes) {
      // Session is idle, trigger analysis
      this.onIdle(path);
    }
  }
}
```

### Boundary Detection Trigger

```typescript
class BoundaryWatcher {
  async checkForBoundaries(path: string): Promise<void> {
    const session = await parseSession(path);
    const boundaries = detectBoundaries(session.entries);

    // Get last processed boundary
    const lastProcessed = await db.getLastProcessedBoundary(path);

    // Queue any new boundaries
    for (const boundary of boundaries) {
      if (isNewBoundary(boundary, lastProcessed)) {
        await queueManager.enqueue({
          type: "initial",
          sessionFile: path,
          segmentStart: boundary.previousEntryId,
          segmentEnd: boundary.entryId,
          boundary: boundary.type,
        });
      }
    }
  }
}
```

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
  reason: "idle" | "boundary" | "stability" | "active";
  lastModified: number;
  pendingBoundary?: Boundary;
}

async function checkSegmentReadiness(
  sessionPath: string,
  config: DaemonConfig
): Promise<SegmentReadiness> {
  const stat = await fs.stat(sessionPath);
  const lastModified = stat.mtimeMs;
  const now = Date.now();

  // Check file stability
  const stableMs = config.isLocalSession(sessionPath) ? 5000 : 30000; // Longer for synced sessions

  if (now - lastModified < stableMs) {
    return {
      sessionPath,
      isComplete: false,
      reason: "active",
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
        reason: "idle",
        lastModified,
      };
    }
  }

  // Check for unprocessed boundaries
  const boundaries = detectBoundaries(session.entries);
  const lastProcessed = await getLastProcessedBoundary(sessionPath);
  const newBoundaries = boundaries.filter(
    (b) => !lastProcessed || b.timestamp > lastProcessed.timestamp
  );

  if (newBoundaries.length > 0) {
    return {
      sessionPath,
      isComplete: true,
      reason: "boundary",
      lastModified,
      pendingBoundary: newBoundaries[0],
    };
  }

  return {
    sessionPath,
    isComplete: false,
    reason: "active",
    lastModified,
  };
}
```

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

## Queue System

### Queue Schema

```sql
CREATE TABLE analysis_queue (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,              -- 'initial', 'reanalysis', 'connection_discovery'
    priority INTEGER DEFAULT 100,    -- Lower = higher priority

    -- Job specification
    session_file TEXT NOT NULL,
    segment_start TEXT,              -- Entry ID
    segment_end TEXT,                -- Entry ID
    context TEXT,                    -- JSON: additional context

    -- Status tracking
    status TEXT DEFAULT 'pending',   -- 'pending', 'running', 'completed', 'failed'
    queued_at TEXT DEFAULT (datetime('now')),
    started_at TEXT,
    completed_at TEXT,

    -- Results
    result_node_id TEXT,
    error TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,

    -- Worker assignment
    worker_id TEXT,
    locked_until TEXT
);

CREATE INDEX idx_queue_status_priority ON analysis_queue(status, priority);
CREATE INDEX idx_queue_session_file ON analysis_queue(session_file);
```

### Priority Levels

| Priority | Type           | Description                     |
| -------- | -------------- | ------------------------------- |
| 10       | User-triggered | Manual `/brain analyze` command |
| 50       | Fork           | New fork from existing session  |
| 100      | Initial        | First-time analysis (default)   |
| 200      | Reanalysis     | Improved prompt reprocessing    |
| 300      | Connection     | Nightly connection discovery    |

### Queue Manager

```typescript
interface AnalysisJob {
  id: string;
  type: "initial" | "reanalysis" | "connection_discovery";
  priority: number;
  sessionFile: string;
  segmentStart?: string;
  segmentEnd?: string;
  context?: Record<string, unknown>;
  status: JobStatus;
  queuedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  resultNodeId?: string;
  error?: string;
  retryCount: number;
  maxRetries: number;
}

type JobStatus = "pending" | "running" | "completed" | "failed";

class QueueManager {
  constructor(private db: Database) {}

  async enqueue(
    job: Omit<AnalysisJob, "id" | "status" | "queuedAt">
  ): Promise<string> {
    const id = generateJobId();

    await this.db.run(
      `
      INSERT INTO analysis_queue (
        id, type, priority, session_file, segment_start, segment_end,
        context, status, queued_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'))
    `,
      [
        id,
        job.type,
        job.priority ?? 100,
        job.sessionFile,
        job.segmentStart,
        job.segmentEnd,
        JSON.stringify(job.context ?? {}),
      ]
    );

    return id;
  }

  async dequeue(workerId: string): Promise<AnalysisJob | null> {
    // Lock with optimistic locking
    const lockDuration = 30; // minutes

    const job = await this.db.get(
      `
      UPDATE analysis_queue
      SET status = 'running',
          started_at = datetime('now'),
          worker_id = ?,
          locked_until = datetime('now', '+${lockDuration} minutes')
      WHERE id = (
        SELECT id FROM analysis_queue
        WHERE status = 'pending'
          AND (locked_until IS NULL OR locked_until < datetime('now'))
        ORDER BY priority, queued_at
        LIMIT 1
      )
      RETURNING *
    `,
      [workerId]
    );

    return job ? this.parseJob(job) : null;
  }

  async complete(jobId: string, nodeId: string): Promise<void> {
    await this.db.run(
      `
      UPDATE analysis_queue
      SET status = 'completed',
          completed_at = datetime('now'),
          result_node_id = ?
      WHERE id = ?
    `,
      [nodeId, jobId]
    );
  }

  async fail(jobId: string, error: string): Promise<void> {
    const job = await this.getJob(jobId);

    if (job.retryCount < job.maxRetries) {
      // Retry with exponential backoff
      const delayMinutes = Math.pow(2, job.retryCount);
      await this.db.run(
        `
        UPDATE analysis_queue
        SET status = 'pending',
            retry_count = retry_count + 1,
            error = ?,
            locked_until = datetime('now', '+${delayMinutes} minutes')
        WHERE id = ?
      `,
        [error, jobId]
      );
    } else {
      // Max retries exceeded
      await this.db.run(
        `
        UPDATE analysis_queue
        SET status = 'failed',
            completed_at = datetime('now'),
            error = ?
        WHERE id = ?
      `,
        [error, jobId]
      );
    }
  }

  async getQueueStats(): Promise<QueueStats> {
    return this.db.get(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'running') as running,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        AVG(CASE 
          WHEN status = 'completed' 
          THEN (julianday(completed_at) - julianday(started_at)) * 24 * 60
        END) as avg_duration_minutes
      FROM analysis_queue
    `);
  }
}
```

## Worker Pool

### Worker Implementation

```typescript
class Worker {
  private running = false;

  constructor(
    private id: string,
    private config: DaemonConfig,
    private queue: QueueManager,
    private storage: StorageManager
  ) {}

  async start(): Promise<void> {
    this.running = true;

    while (this.running) {
      const job = await this.queue.dequeue(this.id);

      if (job) {
        await this.processJob(job);
      } else {
        // No work, wait before polling again
        await sleep(5000);
      }
    }
  }

  stop(): void {
    this.running = false;
  }

  private async processJob(job: AnalysisJob): Promise<void> {
    const logFile = `${this.config.logsDir}/analysis/${job.id}.log`;
    const logger = createLogger(logFile);

    try {
      logger.info(`Starting analysis for ${job.sessionFile}`);

      // Invoke pi agent
      const result = await this.invokeAgent(job, logger);

      // Parse and validate result
      const node = this.parseAgentResult(result);

      // Store node
      const nodeId = await this.storage.createNode(node);

      // Create edges based on boundaries
      if (job.type === "initial") {
        await this.createBoundaryEdges(job, nodeId);
      }

      // Mark complete
      await this.queue.complete(job.id, nodeId);
      logger.info(`Completed analysis, created node ${nodeId}`);
    } catch (error) {
      logger.error(`Analysis failed: ${error}`);
      await this.queue.fail(job.id, String(error));
    }
  }
}
```

### Worker Pool Manager

```typescript
class WorkerPool {
  private workers: Worker[] = [];

  constructor(
    private config: DaemonConfig,
    private queue: QueueManager,
    private storage: StorageManager
  ) {}

  start(): void {
    for (let i = 0; i < this.config.parallelWorkers; i++) {
      const worker = new Worker(
        `worker-${i}`,
        this.config,
        this.queue,
        this.storage
      );
      this.workers.push(worker);
      worker.start();
    }
  }

  async stop(): Promise<void> {
    await Promise.all(this.workers.map((w) => w.stop()));
  }

  getStatus(): WorkerStatus[] {
    return this.workers.map((w) => ({
      id: w.id,
      running: w.isRunning(),
      currentJob: w.getCurrentJob(),
    }));
  }
}
```

## Agent Invocation

### Pi CLI Spawning

```typescript
import { spawn } from "node:child_process";

interface AgentResult {
  success: boolean;
  messages: AgentMessage[];
  node?: NodeData;
  error?: string;
}

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

async function buildSkillsArg(): Promise<string> {
  const skills = await getAvailableSkills();

  return [...REQUIRED_SKILLS, ...OPTIONAL_SKILLS]
    .filter((s) => skills.get(s)?.available)
    .join(",");
}

async function invokeAgent(
  job: AnalysisJob,
  config: DaemonConfig,
  logger: Logger
): Promise<AgentResult> {
  // Build prompt
  const prompt = buildAnalysisPrompt(job);

  // Build skills arg dynamically based on availability
  const skills = await buildSkillsArg();

  // Spawn pi with available skills
  // RLM: Required - handles sessions of any length transparently
  // codemap: Optional - provides code structure analysis for understanding changes
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
    prompt,
  ];

  logger.debug(`Spawning: pi ${args.join(" ")}`);

  return new Promise((resolve, reject) => {
    const proc = spawn("pi", args, {
      stdio: ["ignore", "pipe", "pipe"],
      timeout: config.analysisTimeoutMinutes * 60 * 1000,
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
      // Parse streaming JSON events
      parseStreamingEvents(data.toString(), logger);
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
      logger.warn(data.toString());
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve(parseAgentOutput(stdout));
      } else {
        reject(new Error(`Pi exited with code ${code}: ${stderr}`));
      }
    });

    proc.on("error", reject);
  });
}
```

### Building Analysis Prompt

```typescript
function buildAnalysisPrompt(job: AnalysisJob): string {
  const parts = [
    "Analyze this pi session segment and extract structured insights.",
    "",
    `Session: ${job.sessionFile}`,
  ];

  if (job.segmentStart && job.segmentEnd) {
    parts.push(
      `Segment: entries from ${job.segmentStart} to ${job.segmentEnd}`
    );
  }

  if (job.context) {
    parts.push("");
    parts.push("Additional context:");
    parts.push(JSON.stringify(job.context, null, 2));
  }

  parts.push("");
  parts.push("Return a JSON object matching the Node schema.");

  return parts.join("\n");
}
```

### Parsing Agent Output

````typescript
interface PiJsonEvent {
  type: string;
  message?: AgentMessage;
  messages?: AgentMessage[];
}

function parseAgentOutput(stdout: string): AgentResult {
  const lines = stdout.trim().split("\n");
  const events: PiJsonEvent[] = [];

  for (const line of lines) {
    try {
      events.push(JSON.parse(line));
    } catch {
      // Skip non-JSON lines
    }
  }

  // Find agent_end event
  const endEvent = events.find((e) => e.type === "agent_end");
  if (!endEvent?.messages) {
    return { success: false, messages: [], error: "No agent_end event found" };
  }

  // Extract assistant message with node data
  const assistantMsg = endEvent.messages.find((m) => m.role === "assistant");

  if (!assistantMsg) {
    return {
      success: false,
      messages: endEvent.messages,
      error: "No assistant message",
    };
  }

  // Parse node from assistant response
  const nodeData = extractNodeFromResponse(assistantMsg);

  return {
    success: true,
    messages: endEvent.messages,
    node: nodeData,
  };
}

function extractNodeFromResponse(message: AgentMessage): NodeData | undefined {
  // Find JSON in response (may be in code block)
  const content = message.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  // Try to extract JSON
  const jsonMatch =
    content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\{[\s\S]*\}/);

  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1] || jsonMatch[0]);
    } catch {
      return undefined;
    }
  }

  return undefined;
}
````

## Scheduled Jobs

### Scheduler

```typescript
import { CronJob } from "cron";

class Scheduler {
  private jobs: CronJob[] = [];

  constructor(
    private config: DaemonConfig,
    private queue: QueueManager,
    private db: Database
  ) {}

  start(): void {
    // Nightly reanalysis
    if (this.config.reanalysisSchedule) {
      this.jobs.push(
        new CronJob(
          this.config.reanalysisSchedule,
          () => this.runReanalysis(),
          null,
          true
        )
      );
    }

    // Connection discovery
    if (this.config.connectionDiscoverySchedule) {
      this.jobs.push(
        new CronJob(
          this.config.connectionDiscoverySchedule,
          () => this.runConnectionDiscovery(),
          null,
          true
        )
      );
    }
  }

  stop(): void {
    this.jobs.forEach((job) => job.stop());
  }
}
```

### Nightly Reanalysis

Reanalyze nodes that were processed with older prompt versions.

```typescript
async function runReanalysis(
  queue: QueueManager,
  db: Database,
  config: DaemonConfig
): Promise<void> {
  const currentVersion = await getPromptVersion(config.promptFile);

  // Find nodes analyzed with older prompts
  const outdated = await db.all(
    `
    SELECT id, session_file, segment_start, segment_end
    FROM nodes
    WHERE analyzer_version != ?
    ORDER BY timestamp DESC
    LIMIT 100
  `,
    [currentVersion]
  );

  console.log(`Queueing ${outdated.length} nodes for reanalysis`);

  for (const node of outdated) {
    await queue.enqueue({
      type: "reanalysis",
      priority: 200,
      sessionFile: node.session_file,
      segmentStart: node.segment_start,
      segmentEnd: node.segment_end,
      context: {
        existingNodeId: node.id,
        reason: "prompt_update",
      },
    });
  }
}
```

### Connection Discovery

Find semantic connections between nodes.

```typescript
async function runConnectionDiscovery(
  queue: QueueManager,
  db: Database
): Promise<void> {
  // Get recently analyzed nodes
  const recent = await db.all(`
    SELECT * FROM nodes
    WHERE analyzed_at > datetime('now', '-7 days')
    ORDER BY analyzed_at DESC
  `);

  console.log(`Running connection discovery for ${recent.length} recent nodes`);

  for (const node of recent) {
    await queue.enqueue({
      type: "connection_discovery",
      priority: 300,
      sessionFile: node.session_file,
      context: {
        nodeId: node.id,
        findConnections: true,
      },
    });
  }
}
```

### Pattern Aggregation

Run after analysis to aggregate patterns.

```typescript
async function aggregatePatterns(db: Database): Promise<void> {
  // Aggregate failure patterns
  await db.run(`
    INSERT OR REPLACE INTO failure_patterns (
      id, pattern, occurrences, models, tools, example_nodes, last_seen
    )
    SELECT 
      hex(randomblob(8)) as id,
      te.error_type as pattern,
      COUNT(*) as occurrences,
      json_group_array(DISTINCT te.model) as models,
      json_group_array(DISTINCT te.tool) as tools,
      json_group_array(te.node_id) as example_nodes,
      MAX(te.created_at) as last_seen
    FROM tool_errors te
    GROUP BY te.error_type
    HAVING COUNT(*) > 1
  `);

  // Aggregate model quirks
  await db.run(`
    INSERT OR REPLACE INTO model_stats (
      model, total_tokens, total_cost, total_sessions,
      quirk_count, error_count, last_used
    )
    SELECT
      n.model,
      SUM(n.tokens_used) as total_tokens,
      SUM(n.cost) as total_cost,
      COUNT(DISTINCT n.session_file) as total_sessions,
      COUNT(DISTINCT mq.id) as quirk_count,
      COUNT(DISTINCT te.id) as error_count,
      MAX(n.timestamp) as last_used
    FROM nodes n
    LEFT JOIN model_quirks mq ON mq.node_id = n.id
    LEFT JOIN tool_errors te ON te.node_id = n.id
    GROUP BY n.model
  `);
}
```

## Error Handling

### Retry Strategy

```typescript
interface RetryPolicy {
  maxRetries: number;
  baseDelaySeconds: number;
  maxDelaySeconds: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 3,
  baseDelaySeconds: 60,
  maxDelaySeconds: 3600,
  backoffMultiplier: 2,
};

function calculateRetryDelay(retryCount: number, policy: RetryPolicy): number {
  const delay =
    policy.baseDelaySeconds * Math.pow(policy.backoffMultiplier, retryCount);
  return Math.min(delay, policy.maxDelaySeconds);
}
```

### Error Categories

| Category          | Retry? | Action                        |
| ----------------- | ------ | ----------------------------- |
| Agent timeout     | Yes    | Increase timeout, retry       |
| Agent crash       | Yes    | Retry with backoff            |
| Parse error       | Yes    | Retry with different approach |
| Session not found | No     | Mark failed, log              |
| Invalid session   | No     | Mark failed, log              |
| Storage error     | Yes    | Retry with backoff            |
| Queue full        | No     | Wait, retry later             |

### Error Classification

```typescript
type ErrorCategory =
  | {
      type: "transient";
      retryable: true;
      maxRetries: number;
    }
  | {
      type: "permanent";
      retryable: false;
      reason: string;
    }
  | {
      type: "unknown";
      retryable: true;
      maxRetries: number;
    };

function classifyError(error: Error, context: JobContext): ErrorCategory {
  const message = error.message.toLowerCase();

  // Permanent: session file issues
  if (message.includes("enoent") || message.includes("file not found")) {
    return {
      type: "permanent",
      retryable: false,
      reason: "Session file not found",
    };
  }
  if (message.includes("invalid session header")) {
    return {
      type: "permanent",
      retryable: false,
      reason: "Malformed session file",
    };
  }
  if (message.includes("empty session")) {
    return {
      type: "permanent",
      retryable: false,
      reason: "Empty session file",
    };
  }

  // Permanent: schema issues (likely analyzer bug)
  if (message.includes("schema validation")) {
    return {
      type: "permanent",
      retryable: false,
      reason: "Output validation failed",
    };
  }

  // Transient: network/resource issues
  if (message.includes("timeout") || message.includes("etimedout")) {
    return { type: "transient", retryable: true, maxRetries: 3 };
  }
  if (message.includes("rate limit") || message.includes("429")) {
    return { type: "transient", retryable: true, maxRetries: 5 };
  }
  if (
    message.includes("connection refused") ||
    message.includes("econnrefused")
  ) {
    return { type: "transient", retryable: true, maxRetries: 3 };
  }

  // Transient: model issues
  if (message.includes("overloaded") || message.includes("capacity")) {
    return { type: "transient", retryable: true, maxRetries: 5 };
  }

  // Unknown: retry with limited attempts
  return { type: "unknown", retryable: true, maxRetries: 2 };
}

async function handleJobError(job: AnalysisJob, error: Error): Promise<void> {
  const category = classifyError(error, job);

  if (!category.retryable) {
    // Move to dead letter queue
    await db.run(
      `
      UPDATE analysis_queue
      SET status = 'failed',
          completed_at = datetime('now'),
          error = ?,
          error_category = 'permanent'
      WHERE id = ?
    `,
      [category.reason, job.id]
    );

    logger.error(`Job ${job.id} permanently failed: ${category.reason}`);
    return;
  }

  if (job.retryCount >= category.maxRetries) {
    await db.run(
      `
      UPDATE analysis_queue
      SET status = 'failed',
          completed_at = datetime('now'),
          error = ?,
          error_category = 'max_retries'
      WHERE id = ?
    `,
      [error.message, job.id]
    );

    logger.error(`Job ${job.id} exceeded max retries (${category.maxRetries})`);
    return;
  }

  // Schedule retry with parameterized query
  const delay = calculateRetryDelay(job.retryCount, category);
  await db.run(
    `
    UPDATE analysis_queue
    SET status = 'pending',
        retry_count = retry_count + 1,
        error = ?,
        locked_until = datetime('now', '+' || ? || ' seconds')
    WHERE id = ?
  `,
    [error.message, delay, job.id]
  );

  logger.info(`Job ${job.id} scheduled for retry in ${delay}s`);
}
```

### Dead Letter Queue

Jobs that exceed max retries go to a dead letter state:

```sql
-- Failed jobs remain in queue with status='failed'
-- Can be inspected and manually retried

SELECT * FROM analysis_queue
WHERE status = 'failed'
ORDER BY completed_at DESC;

-- Manual retry
UPDATE analysis_queue
SET status = 'pending',
    retry_count = 0,
    error = NULL
WHERE id = ?;
```

## CLI Commands

### `pi-brain daemon`

```
pi-brain daemon <command> [options]

Commands:
  start              Start the daemon
  stop               Stop the daemon
  status             Show daemon status
  queue              Show queue status
  analyze <path>     Force analyze a session
  run-nightly        Trigger nightly job

Options:
  --config <path>    Config file path
  --foreground       Run in foreground (for start)
  --force            Force stop without waiting
  --json             Output as JSON
```

### Status Output

```bash
$ pi-brain daemon status

Daemon Status
─────────────────────────────────
Status:      running
PID:         12345
Uptime:      2d 4h 32m
Config:      ~/.pi-brain/config.yaml

Workers
─────────────────────────────────
worker-0:    idle
worker-1:    processing job abc123

Queue
─────────────────────────────────
Pending:     12
Running:     1
Completed:   847 (today)
Failed:      3

Next Scheduled
─────────────────────────────────
Reanalysis:  in 5h 28m (02:00)
```

### Queue Output

```bash
$ pi-brain daemon queue

Analysis Queue
─────────────────────────────────
ID          Type        Status    Session
abc123      initial     running   ...projects-pi-brain--/2026-01...
def456      initial     pending   ...projects-webapp--/2026-01...
ghi789      reanalysis  pending   ...projects-cli--/2026-01...
...

Summary: 12 pending, 1 running, 847 completed today
```

## Graceful Shutdown

```typescript
class Daemon {
  private shutdownRequested = false;

  async shutdown(force = false): Promise<void> {
    this.shutdownRequested = true;

    // Stop accepting new work
    this.watcher.stop();
    this.scheduler.stop();

    if (force) {
      // Kill workers immediately
      this.workerPool.forceStop();
    } else {
      // Wait for current jobs to complete
      await this.workerPool.gracefulStop();
    }

    // Close database
    await this.db.close();

    // Remove PID file
    await fs.unlink(this.pidFile);
  }
}

// Signal handlers
process.on("SIGTERM", () => daemon.shutdown(false));
process.on("SIGINT", () => daemon.shutdown(false));
process.on("SIGKILL", () => daemon.shutdown(true));
```

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
  config: DaemonConfig
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
    const { stdout } = await execAsync("which pi");
    return {
      check: "pi-cli",
      passed: true,
      message: `Pi CLI found at ${stdout.trim()}`,
      fatal: false,
    };
  } catch {
    return {
      check: "pi-cli",
      passed: false,
      message: "Pi CLI not found in PATH. Install pi-coding-agent globally.",
      fatal: true,
    };
  }
}

async function checkPiVersion(): Promise<HealthCheckResult> {
  try {
    const { stdout } = await execAsync("pi --version");
    const version = stdout.trim();
    const minVersion = "0.1.0"; // Minimum required version

    if (semver.gte(version, minVersion)) {
      return {
        check: "pi-version",
        passed: true,
        message: `Pi version ${version} meets minimum ${minVersion}`,
        fatal: false,
      };
    }

    return {
      check: "pi-version",
      passed: false,
      message: `Pi version ${version} below minimum ${minVersion}`,
      fatal: true,
    };
  } catch (error) {
    return {
      check: "pi-version",
      passed: false,
      message: `Could not determine pi version: ${error}`,
      fatal: false, // Non-fatal, might still work
    };
  }
}

async function checkModelAccess(
  config: DaemonConfig
): Promise<HealthCheckResult> {
  try {
    // Attempt a minimal pi invocation to verify model access
    const { stdout } = await execAsync(
      `pi --provider ${config.provider} --model ${config.model} ` +
        `--no-session --mode json -p "Reply with OK"`,
      { timeout: 30000 }
    );

    if (stdout.includes("OK")) {
      return {
        check: "model-access",
        passed: true,
        message: `Model ${config.provider}/${config.model} accessible`,
        fatal: false,
      };
    }

    return {
      check: "model-access",
      passed: false,
      message: `Model responded but output unexpected`,
      fatal: false,
    };
  } catch (error) {
    return {
      check: "model-access",
      passed: false,
      message: `Cannot access ${config.provider}/${config.model}: ${error}`,
      fatal: true,
    };
  }
}

// Daemon startup integration
async function startDaemon(config: DaemonConfig): Promise<void> {
  console.log("Running startup health checks...");

  const results = await runStartupHealthChecks(config);

  const failed = results.filter((r) => !r.passed);
  const fatal = failed.filter((r) => r.fatal);

  // Log all results
  for (const result of results) {
    const icon = result.passed ? "✓" : "✗";
    console.log(`  ${icon} ${result.check}: ${result.message}`);
  }

  if (fatal.length > 0) {
    console.error("\nFatal errors prevent daemon startup:");
    for (const f of fatal) {
      console.error(`  - ${f.message}`);
    }
    process.exit(1);
  }

  if (failed.length > 0) {
    console.warn("\nWarnings (non-fatal):");
    for (const f of failed) {
      console.warn(`  - ${f.message}`);
    }
  }

  console.log("\nHealth checks passed. Starting daemon...");
  // Continue with normal startup
}
```

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

## Monitoring

### Health Check

```typescript
interface HealthStatus {
  healthy: boolean;
  uptime: number;
  workers: {
    total: number;
    active: number;
    idle: number;
  };
  queue: {
    pending: number;
    running: number;
    failedToday: number;
  };
  lastAnalysis: string | null;
  errors: string[];
}

async function checkHealth(): Promise<HealthStatus> {
  const errors: string[] = [];

  // Check database connection
  try {
    await db.get("SELECT 1");
  } catch {
    errors.push("Database connection failed");
  }

  // Check sessions directory
  if (!(await fs.exists(config.sessionsDir))) {
    errors.push("Sessions directory not found");
  }

  // Check prompt file
  if (!(await fs.exists(config.promptFile))) {
    errors.push("Prompt file not found");
  }

  return {
    healthy: errors.length === 0,
    uptime: process.uptime(),
    workers: workerPool.getStatus(),
    queue: await queue.getStats(),
    lastAnalysis: await getLastAnalysisTime(),
    errors,
  };
}
```

### Metrics

```typescript
interface DaemonMetrics {
  analysisTotal: number;
  analysisSuccessful: number;
  analysisFailed: number;
  avgAnalysisDuration: number;
  queueDepth: number;
  activeWorkers: number;
}

// Expose via HTTP for monitoring
app.get("/metrics", async (req, res) => {
  const metrics = await collectMetrics();
  res.json(metrics);
});
```
