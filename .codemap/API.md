# Project Overview

## Languages
- typescript: 77 files

## Statistics
- Total files: 77
- Total symbols: 596
  - function: 332
  - interface: 189
  - type: 37
  - variable: 27
  - class: 11

---

src/api/index.ts [1-14]
  imports:
    - ./server.js

src/api/responses.ts [1-52]
  type:
    24-30: ApiErrorCode = | "BAD_REQUEST"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR"
  | "SERVICE_UNAVAILABLE" [exported]
      /** API error codes */
  function:
    10-19: successResponse<T>(data: T, durationMs?: number): { status: "success"; data: T; meta: { timestamp: any; duration_ms: number; }; } [exported]
      /** API response helpers Shared response formatting utilities used by all route handlers. API response wrapper for success */
    35-51: errorResponse(code: ApiErrorCode, message: string, details?: Record<string, unknown>): { status: "error"; error: { code: ApiErrorCode; message: string; details: Record<string, unknown>; }; meta: { timestamp: any; }; } [exported]
      /** API response wrapper for errors */

src/api/routes/agents.ts [1-207]
  function:
    22-206: async agentsRoutes(app: FastifyInstance): Promise<void> [exported]
      /** Register AGENTS.md routes */
  imports:
    - ../../prompt/agents-generator.js
    - ../server.js
    - fastify

src/api/routes/clusters.ts [1-375]
  function:
    142-374: async clustersRoutes(app: FastifyInstance): Promise<void> [exported]
  imports:
    - ../../types/index.js
    - better-sqlite3
    - fastify

src/api/routes/config.ts [1-218]
  function:
    19-217: async configRoutes(app: FastifyInstance): Promise<void> [exported]
  imports:
    - ../../config/config.js
    - ../../config/types.js
    - ../responses.js
    - fastify
    - node:fs
    - yaml

src/api/routes/daemon.ts [1-157]
  function:
    22-156: async daemonRoutes(app: FastifyInstance): Promise<void> [exported]
  imports:
    - ../../daemon/cli.js
    - ../../daemon/queue.js
    - ../responses.js
    - fastify
    - node:fs
    - node:path

src/api/routes/decisions.ts [1-94]
  function:
    26-93: async decisionsRoutes(app: FastifyInstance): Promise<void> [exported]
  imports:
    - ../../storage/decision-repository.js
    - ../responses.js
    - fastify

src/api/routes/edges.ts [1-221]
  function:
    29-220: async edgesRoutes(app: FastifyInstance): Promise<void> [exported]
  imports:
    - ../../storage/node-repository.js
    - ../../storage/node-types.js
    - ../responses.js
    - fastify

src/api/routes/lessons.ts [1-94]
  function:
    39-93: async lessonsRoutes(app: FastifyInstance): Promise<void> [exported]
  imports:
    - ../../storage/node-repository.js
    - ../responses.js
    - fastify

src/api/routes/nodes.ts [1-234]
  function:
    59-233: async nodesRoutes(app: FastifyInstance): Promise<void> [exported]
  imports:
    - ../../storage/node-repository.js
    - ../../storage/node-storage.js
    - ../../storage/node-types.js
    - ../responses.js
    - fastify

src/api/routes/patterns.ts [1-119]
  function:
    41-118: async patternsRoutes(app: FastifyInstance): Promise<void> [exported]
  imports:
    - ../../storage/pattern-repository.js
    - ../responses.js
    - fastify

src/api/routes/prompt-learning.ts [1-166]
  function:
    18-165: async promptLearningRoutes(app: FastifyInstance): Promise<void> [exported]
  imports:
    - ../../prompt/effectiveness.js
    - ../../storage/pattern-repository.js
    - ../responses.js
    - fastify

src/api/routes/query.ts [1-205]
  function:
    44-204: async queryRoutes(app: FastifyInstance): Promise<void> [exported]
  imports:
    - ../../daemon/query-processor.js
    - ../responses.js
    - fastify
    - node:child_process
    - node:os
    - node:path

src/api/routes/quirks.ts [1-110]
  function:
    27-109: async quirksRoutes(app: FastifyInstance): Promise<void> [exported]
  imports:
    - ../../storage/node-repository.js
    - ../responses.js
    - fastify

src/api/routes/search.ts [1-104]
  function:
    39-103: async searchRoutes(app: FastifyInstance): Promise<void> [exported]
  imports:
    - ../../storage/node-repository.js
    - ../responses.js
    - fastify

src/api/routes/sessions.ts [1-272]
  function:
    56-271: async sessionsRoutes(app: FastifyInstance): Promise<void> [exported]
  imports:
    - ../../storage/node-repository.js
    - ../responses.js
    - fastify

src/api/routes/signals.ts [1-260]
  function:
    54-111: async signalsRoutes(app: FastifyInstance): Promise<void> [exported]
  imports:
    - ../../types/index.js
    - ../responses.js
    - better-sqlite3
    - fastify

src/api/routes/stats.ts [1-165]
  function:
    16-155: async statsRoutes(app: FastifyInstance): Promise<void> [exported]
  imports:
    - ../../storage/node-repository.js
    - ../responses.js
    - better-sqlite3
    - fastify

src/api/routes/tool-errors.ts [1-121]
  function:
    27-120: async toolErrorsRoutes(app: FastifyInstance): Promise<void> [exported]
  imports:
    - ../../storage/node-repository.js
    - ../responses.js
    - fastify

src/api/server.ts [1-183]
  interface:
    46-51: interface ServerContext [exported]
      /** Server context passed to route handlers */
  function:
    65-155: async createServer(db: Database, config: ApiConfig, daemonConfig?: DaemonConfig): Promise<FastifyInstance> [exported]
      /** Create and configure the Fastify server */
    160-175: async startServer(db: Database, config: ApiConfig, daemonConfig?: DaemonConfig): Promise<FastifyInstance> [exported]
      /** Start the API server */
  imports:
    - ../config/types.js
    - ./responses.js
    - ./routes/agents.js
    - ./routes/clusters.js
    - ./routes/config.js
    - ./routes/daemon.js
    - ./routes/decisions.js
    - ./routes/edges.js
    - ./routes/lessons.js
    - ./routes/nodes.js
    - ./routes/patterns.js
    - ./routes/prompt-learning.js
    - ./routes/query.js
    - ./routes/quirks.js
    - ./routes/search.js
    - ./routes/sessions.js
    - ./routes/signals.js
    - ./routes/stats.js
    - ./routes/tool-errors.js
    - @fastify/cors
    - @fastify/websocket
    - better-sqlite3
    - fastify

src/cli.ts [1-1047]
  imports:
    - ./config/index.js
    - ./daemon/index.js
    - ./parser/analyzer.js
    - ./prompt/agents-generator.js
    - ./prompt/effectiveness.js
    - ./prompt/prompt-generator.js
    - ./prompt/prompt-injector.js
    - ./storage/database.js
    - ./storage/pattern-repository.js
    - ./sync/index.js
    - ./types/index.js
    - ./web/generator.js
    - commander
    - node:fs
    - node:fs/promises
    - node:path
    - open

src/config/config.ts [1-726]
  class:
    472-480: class ConfigError extends Error [exported]
      /** Configuration loading errors */
  function:
    35-43: expandPath(p: string): string [exported]
      /** Expand ~ in paths to home directory */
    48-54: getDefaultHubConfig(): HubConfig [exported]
      /** Default hub configuration */
    59-90: getDefaultDaemonConfig(): DaemonConfig [exported]
      /** Default daemon configuration */
    95-100: getDefaultQueryConfig(): QueryConfig [exported]
      /** Default query configuration */
    105-115: getDefaultApiConfig(): ApiConfig [exported]
      /** Default API configuration */
    120-128: getDefaultConfig(): PiBrainConfig [exported]
      /** Get complete default configuration */
    319-467: transformConfig(raw: RawConfig): PiBrainConfig [exported]
      /** Transform raw YAML config to typed config with validation */
    485-531: loadConfig(configPath?: string): PiBrainConfig [exported]
      /** Load configuration from a YAML file */
    536-541: ensureConfigDir(configDir?: string): void [exported]
      /** Ensure the config directory exists */
    546-581: ensureDirectories(config: PiBrainConfig): void [exported]
      /** Ensure all required directories exist based on configuration */
    586-644: writeDefaultConfig(configPath?: string): void [exported]
      /** Write a default configuration file */
    649-657: getSessionDirs(config: PiBrainConfig): {} [exported]
      /** Get all session directories to watch (hub + enabled spokes) */
    662-664: getEnabledSpokes(config: PiBrainConfig): {} [exported]
      /** Get enabled spokes from configuration */
    669-673: getRsyncSpokes(config: PiBrainConfig): {} [exported]
      /** Get rsync spokes (enabled spokes with rsync sync method) */
    678-685: getScheduledRsyncSpokes(config: PiBrainConfig): {} [exported]
      /** Get scheduled rsync spokes (rsync spokes with a schedule) */
    696-725: getComputerFromPath(sessionPath: string, config: PiBrainConfig): string [exported]
      /** Get the computer name for a session based on its path. For sessions from spoke directories, returns the spoke name. For local sessions (hub), returns the local hostname. Uses proper path boundary checking to avoid false matches (e.g., `/synced/laptop` should not match `/synced/laptop-backup/...`) */
  variable:
    25-25: any [exported]
      /** Default configuration directory */
    30-30: any [exported]
      /** Default configuration file path */
  imports:
    - ./types.js
    - node:fs
    - node:os
    - node:path
    - yaml

src/config/index.ts [1-36]
  imports:
    - ./config.js
    - ./types.js

src/config/types.ts [1-252]
  interface:
    16-28: interface RsyncOptions [exported]
      /** Rsync-specific options for spoke configuration */
    34-55: interface SpokeConfig [exported]
      /** Spoke machine configuration Spokes are secondary machines that sync sessions to the hub */
    61-70: interface HubConfig [exported]
      /** Hub configuration The hub is the primary computer where daemon runs */
    76-145: interface DaemonConfig [exported]
      /** Daemon configuration Controls the background analysis process */
    151-157: interface QueryConfig [exported]
      /** Query configuration Controls the /brain query interface */
    162-171: interface ApiConfig [exported]
      /** API server configuration */
    176-191: interface PiBrainConfig [exported]
      /** Complete pi-brain configuration */
    197-251: interface RawConfig [exported]
      /** Raw YAML configuration (snake_case, before transformation) This matches the YAML file structure */
  type:
    11-11: SyncMethod = "syncthing" | "rsync" | "api" [exported]
      /** Configuration types for pi-brain Configuration is loaded from ~/.pi-brain/config.yaml All paths support ~ expansion for home directory Spoke sync method options */

src/daemon/cli.ts [1-1060]
  interface:
    75-81: interface DaemonStatus [exported]
      /** Daemon status info */
    84-89: interface QueueStatus [exported]
      /** Queue status info */
    92-97: interface HealthCheckResult [exported]
      /** Health check result */
    100-104: interface HealthStatus [exported]
      /** Overall health status */
    107-110: interface OutputOptions [exported]
      /** CLI output options */
    237-240: interface StartOptions [exported]
      /** Start options */
    243-246: interface StopOptions [exported]
      /** Stop options */
  function:
    119-130: readPidFile(): number [exported]
      /** Read the daemon PID from the PID file */
    135-141: writePidFile(pid: number): void [exported]
      /** Write the daemon PID to the PID file */
    146-154: removePidFile(): void [exported]
      /** Remove the PID file */
    159-167: isProcessRunning(pid: number): boolean [exported]
      /** Check if a process with the given PID is running */
    172-185: isDaemonRunning(): { running: boolean; pid: number; } [exported]
      /** Check if the daemon is currently running */
    194-215: formatUptime(seconds: number): string [exported]
      /** Format uptime in a human-readable way */
    220-230: getProcessUptime(): number [exported]
      /** Get process uptime (approximate based on PID file modification time) */
    251-361: async startDaemon(options: StartOptions = {}): Promise<{ success: boolean; message: string; pid?: number; }> [exported]
      /** Start the daemon process */
    366-428: async stopDaemon(options: StopOptions = {}): Promise<{ success: boolean; message: string; }> [exported]
      /** Stop the daemon process */
    433-445: getDaemonStatus(configPath?: string): DaemonStatus [exported]
      /** Get daemon status information */
    454-483: getQueueStatus(configPath?: string): QueueStatus [exported]
      /** Get queue status information */
    488-541: queueAnalysis(sessionPath: string, configPath?: string): { success: boolean; message: string; jobId?: string; } [exported]
      /** Queue a session for analysis */
    761-791: async runHealthChecks(configPath?: string): Promise<HealthStatus> [exported]
      /** Run all health checks */
    800-821: formatDaemonStatus(status: DaemonStatus, _options: OutputOptions = {}): string [exported]
      /** Format daemon status for display */
    826-876: formatQueueStatus(queueStatus: QueueStatus, _options: OutputOptions = {}): string [exported]
      /** Format queue status for display */
    891-914: formatHealthStatus(status: HealthStatus, _options: OutputOptions = {}): string [exported]
      /** Format health check results for display */
    929-1049: rebuildIndex(configPath?: string): { success: boolean; message: string; count: number; } [exported]
      /** Rebuild the SQLite index from JSON files */
  variable:
    69-69: any [exported]
      /** PID file location */
    72-72: any [exported]
      /** Log file location */
  imports:
    - ../config/config.js
    - ../config/types.js
    - ../storage/database.js
    - ../storage/node-repository.js
    - ../storage/node-storage.js
    - ./processor.js
    - ./queue.js
    - node:child_process
    - node:fs
    - node:path

src/daemon/connection-discovery.ts [1-623]
  class:
    162-622: class ConnectionDiscoverer [exported]
      /** Discovers semantic connections between nodes in the knowledge graph. Uses keyword/tag similarity, explicit references, and lesson reinforcement patterns to find related nodes. Does not use LLM - relies on FTS and Jaccard similarity for performance. */
  interface:
    141-146: interface ConnectionResult [exported]
  imports:
    - ../storage/node-repository.js
    - ../types/index.js
    - better-sqlite3

src/daemon/daemon-process.ts [1-194]
  imports:
    - ../api/server.js
    - ../config/config.js
    - ../storage/database.js
    - ./cli.js
    - ./queue.js
    - ./scheduler.js
    - ./watcher-events.js
    - ./watcher.js
    - ./worker.js
    - node:path

src/daemon/errors.ts [1-457]
  interface:
    15-24: interface RetryPolicy [exported]
      /** Retry policy configuration */
    55-66: interface ClassifiedError [exported]
      /** Classified error with metadata */
  type:
    27-27: ErrorCategoryType = "transient" | "permanent" | "unknown" [exported]
      /** Error category types */
    30-52: ErrorCategory = | {
      type: "transient";
      retryable: true;
      /** Suggested max retries for this error type */
      maxRetries: number;
      /** Reason for classification */
      reason: string;
    }
... [exported]
      /** Error category - determines retry behavior */
  function:
    251-273: classifyError(error: Error, _context?: JobContext): ErrorCategory [exported]
      /** Classify an error to determine retry behavior */
    278-308: classifyErrorWithContext(error: Error, retryCount: number, maxRetries: number, policy: RetryPolicy = DEFAULT_RETRY_POLICY): ClassifiedError [exported]
      /** Classify an error with full context */
    317-324: calculateRetryDelay(retryCount: number, policy: RetryPolicy = DEFAULT_RETRY_POLICY): number [exported]
      /** Calculate retry delay with exponential backoff */
    329-334: calculateRetryDelayMinutes(retryCount: number, policy: RetryPolicy = DEFAULT_RETRY_POLICY): number [exported]
      /** Calculate retry delay in minutes (for queue integration) */
    356-370: formatErrorForStorage(error: Error, category?: ErrorCategory): string [exported]
      /** Format error for storage in database */
    375-393: parseStoredError(stored: string): { timestamp: string; type: ErrorCategoryType; reason: string; message: string; stack?: string; } [exported]
      /** Parse stored error back to object */
    402-404: isRetryableError(error: Error): boolean [exported]
      /** Check if an error is retryable */
    409-411: isPermanentError(error: Error): boolean [exported]
      /** Check if an error is permanent */
    416-426: createTypedError(message: string, type: ErrorCategoryType): Error [exported]
      /** Create a typed error with a specific category */
    433-435: createFileNotFoundError(path: string): Error [exported]
      /** Create a "file not found" error */
    438-440: createInvalidSessionError(reason: string): Error [exported]
      /** Create a "session invalid" error */
    443-445: createTimeoutError(durationMinutes: number): Error [exported]
      /** Create a "timeout" error */
    448-451: createRateLimitError(retryAfter?: number): Error [exported]
      /** Create a "rate limit" error */
    454-456: createValidationError(details: string): Error [exported]
      /** Create a "validation" error */
  variable:
    73-78: RetryPolicy [exported]
      /** Default retry policy */
  imports:
    - ./queue.js

src/daemon/facet-discovery.ts [1-1734]
  class:
    659-1705: class FacetDiscovery [exported]
  interface:
    91-100: interface ClusterAnalysisConfig [exported]
      /** Configuration for LLM cluster analysis */
    105-113: interface ClusterAnalysisResult [exported]
      /** Result from analyzing a single cluster */
    118-123: interface ClusterAnalysisBatchResult [exported]
      /** Result from analyzing multiple clusters */
    132-136: interface EmbeddingProvider [exported]
      /** Interface for embedding providers */
    647-651: interface FacetDiscoveryLogger [exported]
  function:
    154-190: createEmbeddingProvider(config: EmbeddingConfig): EmbeddingProvider [exported]
      /** Create an embedding provider from config */
    323-346: createMockEmbeddingProvider(dims = 384): EmbeddingProvider [exported]
      /** Create mock embedding provider for testing only. Not exposed in EmbeddingConfig - use createMockEmbeddingProvider() directly in tests. */
    375-442: kMeansClustering(embeddings: number[][], k: number, maxIterations = 100): KMeansResult [exported]
      /** Simple K-means++ clustering implementation */
    485-504: hdbscanClustering(embeddings: number[][], minClusterSize = 3, minSamples = 3): {} [exported]
      /** HDBSCAN-like density-based clustering (simplified) */
  imports:
    - ../types/index.js
    - better-sqlite3
    - node:child_process
    - node:crypto
    - node:fs/promises
    - node:os
    - node:path
    - node:url

src/daemon/index.ts [1-181]
  variable:
    180-180: "0.1.0" [exported]
      /** Daemon module version */
  imports:
    - ./cli.js
    - ./connection-discovery.js
    - ./errors.js
    - ./facet-discovery.js
    - ./pattern-aggregation.js
    - ./processor.js
    - ./queue.js
    - ./scheduler.js
    - ./watcher-events.js
    - ./watcher.js
    - ./worker.js

src/daemon/insight-aggregation.ts [1-553]
  class:
    149-552: class InsightAggregator [exported]
  imports:
    - ../storage/node-storage.js
    - ../types/index.js
    - better-sqlite3
    - node:crypto

src/daemon/pattern-aggregation.ts [1-332]
  class:
    22-331: class PatternAggregator [exported]
  imports:
    - better-sqlite3
    - node:crypto

src/daemon/processor.ts [1-747]
  class:
    702-739: class JobProcessor [exported]
      /** Job processor that invokes pi agents for analysis */
  interface:
    21-34: interface AgentResult [exported]
      /** Result from invoking the pi agent */
    37-116: interface AgentNodeOutput [exported]
      /** Output schema from the session analyzer (matches session-analyzer.md) */
    128-132: interface SkillInfo [exported]
      /** Skill availability information */
    135-140: interface ProcessorLogger [exported]
      /** Logger interface for processor */
    692-697: interface ProcessorConfig [exported]
      /** Processor configuration */
  function:
    170-178: async checkSkillAvailable(skillName: string): Promise<boolean> [exported]
      /** Check if a skill is available by looking for SKILL.md */
    183-199: async getSkillAvailability(): Promise<Map<string, SkillInfo>> [exported]
      /** Get availability information for all skills */
    205-218: async validateRequiredSkills(): Promise<void> [exported]
      /** Validate that all required skills are available Throws if any required skill is missing */
    224-230: async buildSkillsArg(): Promise<string> [exported]
      /** Build the skills argument for pi invocation Returns comma-separated list of available skills */
    239-271: buildAnalysisPrompt(job: AnalysisJob): string [exported]
      /** Build the analysis prompt for a job */
    304-420: async invokeAgent(job: AnalysisJob, config: DaemonConfig, logger: ProcessorLogger = consoleLogger): Promise<AgentResult> [exported]
      /** Invoke the pi agent to analyze a session */
    526-595: parseAgentOutput(stdout: string, logger: ProcessorLogger = consoleLogger): Omit<AgentResult, "exitCode" | "durationMs"> [exported]
      /** Parse the pi agent's JSON mode output */
    601-634: extractNodeFromText(text: string, logger: ProcessorLogger = consoleLogger): AgentNodeOutput [exported]
      /** Extract node JSON from text content Handles both raw JSON and code-fenced JSON */
    639-685: isValidNodeOutput(obj: unknown): boolean [exported]
      /** Basic validation that output matches expected schema */
    744-746: createProcessor(config: ProcessorConfig): JobProcessor [exported]
      /** Create a job processor */
  variable:
    143-148: ProcessorLogger [exported]
      /** Default console logger */
    155-155: readonly ["rlm"] [exported]
      /** Required skills for analysis - must be available */
    158-158: readonly ["codemap"] [exported]
      /** Optional skills - enhance analysis but not required */
    161-161: any [exported]
      /** Skills directory location */
  imports:
    - ../config/types.js
    - ./queue.js
    - node:child_process
    - node:fs/promises
    - node:os
    - node:path

src/daemon/query-processor.ts [1-727]
  interface:
    32-45: interface QueryRequest [exported]
      /** Query request from the API */
    48-66: interface QueryResponse [exported]
      /** Query response to return to the client */
    91-100: interface QueryProcessorConfig [exported]
  function:
    105-181: async processQuery(request: QueryRequest, config: QueryProcessorConfig): Promise<QueryResponse> [exported]
      /** Process a natural language query against the knowledge graph */
  imports:
    - ../config/types.js
    - ../storage/node-repository.js
    - ./processor.js
    - better-sqlite3
    - node:child_process
    - node:fs/promises
    - node:os
    - node:path

src/daemon/queue.ts [1-733]
  class:
    151-688: class QueueManager [exported]
      /** Manages the analysis job queue Thread-safe queue operations backed by SQLite with optimistic locking. */
  interface:
    37-50: interface JobContext [exported]
      /** Additional context for analysis jobs */
    53-88: interface AnalysisJob [exported]
      /** Analysis job structure */
    102-115: interface QueueStats [exported]
      /** Queue statistics */
  type:
    17-17: JobType = "initial" | "reanalysis" | "connection_discovery" [exported]
      /** Job type determines analysis behavior */
    20-20: JobStatus = "pending" | "running" | "completed" | "failed" [exported]
      /** Job status tracks progress through the queue */
    91-99: JobInput = Omit<
  AnalysisJob,
  "id" | "status" | "queuedAt" | "retryCount" | "maxRetries" | "priority"
> & {
  /** Priority (defaults to PRIORITY.INITIAL) */
  priority?: number;
  /** Override default max re... [exported]
      /** Job creation input (id, status, queuedAt are auto-generated) */
  function:
    699-701: generateJobId(): string [exported]
      /** Generate a unique job ID Uses the same format as node IDs: 16-char hex string */
    706-708: createQueueManager(db: Database.Database): QueueManager [exported]
      /** Create a queue manager from a database */
    714-732: getQueueStatusSummary(db: Database.Database): { stats: QueueStats; pendingJobs: {}; runningJobs: {}; recentFailed: {}; } [exported]
      /** Get aggregated queue status Used by CLI and API */
  variable:
    23-34: PRIORITY [exported]
      /** Priority levels (lower = higher priority) */
  imports:
    - better-sqlite3

src/daemon/scheduler.ts [1-831]
  class:
    145-761: class Scheduler [exported]
      /** Scheduler manages cron-based scheduled jobs */
  interface:
    49-56: interface ScheduledJobResult [exported]
      /** Result of a scheduled job execution */
    59-64: interface SchedulerLogger [exported]
      /** Logger interface for scheduler */
    83-128: interface SchedulerConfig [exported]
      /** Scheduler configuration */
    131-140: interface SchedulerStatus [exported]
      /** Scheduler state */
  type:
    42-46: ScheduledJobType = | "reanalysis"
  | "connection_discovery"
  | "pattern_aggregation"
  | "clustering" [exported]
      /** Job types that can be scheduled */
  function:
    766-794: createScheduler(config: DaemonConfig, queue: QueueManager, db: Database.Database, logger?: SchedulerLogger): Scheduler [exported]
      /** Create a scheduler from daemon config */
    800-809: isValidCronExpression(expression: string): boolean [exported]
      /** Validate a cron expression Returns true if valid, false otherwise */
    814-830: getNextRunTimes(expression: string, count = 5): {} [exported]
      /** Get the next N run times for a cron expression */
  variable:
    67-72: SchedulerLogger [exported]
      /** Default no-op logger */
    75-80: SchedulerLogger [exported]
      /** Console logger for production use */
  imports:
    - ../config/types.js
    - ../prompt/effectiveness.js
    - ../prompt/prompt.js
    - ./facet-discovery.js
    - ./insight-aggregation.js
    - ./pattern-aggregation.js
    - ./queue.js
    - better-sqlite3
    - croner

src/daemon/watcher-events.ts [1-117]
  interface:
    8-11: interface SessionEventDetail [exported]
      /** Event types for the SessionWatcher Event detail for session events */
    16-19: interface ErrorEventDetail [exported]
      /** Event detail for error events */
  type:
    42-43: SessionEventName = (typeof SESSION_EVENTS)[keyof typeof SESSION_EVENTS] [exported]
      /** Type for session event names */
  function:
    48-55: createSessionEvent(type: string, sessionPath: string): CustomEvent<SessionEventDetail> [exported]
      /** Create a session event */
    60-64: createErrorEvent(error: Error): CustomEvent<ErrorEventDetail> [exported]
      /** Create an error event */
    69-71: createReadyEvent(): Event [exported]
      /** Create a ready event */
    76-84: isSessionEvent(event: Event): boolean [exported]
      /** Type guard to check if an event is a session event */
    89-96: isErrorEvent(event: Event): boolean [exported]
      /** Type guard to check if an event is an error event */
    101-106: getSessionPath(event: Event): string [exported]
      /** Helper to get session path from a session event */
    111-116: getEventError(event: Event): any [exported]
      /** Helper to get error from an error event */
  variable:
    24-37: SESSION_EVENTS [exported]
      /** Session event names */

src/daemon/watcher.ts [1-582]
  class:
    83-541: class SessionWatcher extends EventTarget [exported]
      /** Session file watcher Monitors directories for .jsonl session files, tracks their state, and emits events when sessions are ready for analysis. Uses EventTarget for cross-platform compatibility. */
  interface:
    27-42: interface SessionState [exported]
      /** State tracking for a single session file */
    47-62: interface WatcherConfig [exported]
      /** Watcher configuration options */
  function:
    546-550: createWatcher(daemonConfig: DaemonConfig): SessionWatcher [exported]
      /** Create a watcher from daemon config */
    555-557: isSessionFile(filePath: string): boolean [exported]
      /** Check if a path is a valid session file */
    562-564: getSessionName(sessionPath: string): string [exported]
      /** Extract session name from path */
    571-581: getProjectFromSessionPath(sessionPath: string): string [exported]
      /** Extract project name from session path Session paths are typically: ~/.pi/agent/sessions/<project-name>/<session-file>.jsonl */
  variable:
    67-73: WatcherConfig [exported]
      /** Default watcher configuration */
  imports:
    - ../config/config.js
    - ../config/types.js
    - ./watcher-events.js
    - chokidar
    - node:fs
    - node:fs/promises
    - node:path

src/daemon/worker.ts [1-571]
  class:
    116-510: class Worker [exported]
      /** Worker that processes jobs from the analysis queue */
  interface:
    58-73: interface WorkerConfig [exported]
      /** Worker configuration */
    76-91: interface WorkerStatus [exported]
      /** Worker status */
    94-107: interface JobProcessingResult [exported]
      /** Result from processing a single job */
  function:
    519-521: createWorker(config: WorkerConfig): Worker [exported]
      /** Create a worker instance */
    527-541: async processSingleJob(job: AnalysisJob, config: PiBrainConfig, db: Database.Database, logger?: ProcessorLogger): Promise<JobProcessingResult> [exported]
      /** Process a single job without the full worker loop Useful for one-off processing or testing */
    546-570: handleJobError(error: Error, job: AnalysisJob, retryPolicy: RetryPolicy = DEFAULT_RETRY_POLICY): { shouldRetry: boolean; retryDelayMinutes: number; formattedError: string; category: ReturnType<any>; } [exported]
      /** Handle job error manually (for custom queue implementations) */
  imports:
    - ../config/config.js
    - ../config/types.js
    - ../parser/index.js
    - ../prompt/prompt.js
    - ../storage/node-repository.js
    - ../storage/node-types.js
    - ./connection-discovery.js
    - ./errors.js
    - ./processor.js
    - ./queue.js
    - better-sqlite3
    - node:path

src/index.ts [1-54]
  imports:
    - ./config/index.js
    - ./daemon/index.js
    - ./parser/analyzer.js
    - ./parser/boundary.js
    - ./parser/fork.js
    - ./parser/session.js
    - ./prompt/index.js
    - ./storage/database.js
    - ./storage/node-storage.js
    - ./storage/node-types.js
    - ./types.js
    - ./web/generator.js

src/parser/analyzer.ts [1-336]
  function:
    16-18: getDefaultSessionDir(): string [exported]
      /** Default session directory */
    31-43: async scanSessions(sessionDir?: string): Promise<{}> [exported]
      /** Scan session directory and parse all sessions Note: This function loads all sessions into memory. For large session histories (thousands of sessions), consider using `scanSessionsIterator` which processes sessions one at a time. */
    60-102: async *scanSessionsIterator(sessionDir?: string): AsyncGenerator<SessionInfo, void, unknown> [exported]
      /** Async generator that yields sessions one at a time for memory efficiency Use this instead of `scanSessions` when processing large session histories (hundreds or thousands of sessions) to avoid loading all sessions into memory. Sessions are yielded in file system order, not sorted by timestamp. */
    107-127: findForkRelationships(sessions: SessionInfo[]): {} [exported]
      /** Find fork relationships between sessions */
    132-164: groupByProject(sessions: SessionInfo[]): {} [exported]
      /** Group sessions by project (cwd) */
    185-196: decodeProjectDir(encodedName: string): string [exported]
      /** Decode project directory name to path e.g., "--home-will-projects-myapp--" → "/home/will/projects/myapp" **Warning**: Pi's encoding is lossy - hyphens in original paths are not escaped. This means "--home-will-projects-pi-brain--" could be either: - /home/will/projects/pi-brain (correct) - /home/will/projects/pi/brain (wrong) Prefer using session.header.cwd which contains the accurate original path. This function is only useful for display purposes when session data is unavailable. */
    210-217: getProjectName(sessionPath: string): string [exported]
      /** Get project name from session path */
    228-230: getProjectNameFromSession(session: SessionInfo): string [exported]
      /** Get project name from a SessionInfo object (preferred over getProjectName) This function returns the accurate project path from the session header, which is not affected by the lossy directory name encoding. */
    235-240: filterByProject(sessions: SessionInfo[], projectPath: string): {} [exported]
      /** Filter sessions by project path */
    245-260: filterByDateRange(sessions: SessionInfo[], startDate?: Date, endDate?: Date): {} [exported]
      /** Filter sessions by date range */
    265-294: searchSessions(sessions: SessionInfo[], query: string): {} [exported]
      /** Search sessions for text content */
    299-335: getOverallStats(sessions: SessionInfo[]): { totalSessions: number; totalEntries: number; totalMessages: number; totalTokens: number; totalCost: number; projectCount: number; forkCount: number; } [exported]
      /** Get session summary statistics */
  imports:
    - ../types.js
    - ./session.js
    - node:fs/promises
    - node:os
    - node:path

src/parser/boundary.ts [1-571]
  class:
    214-291: class LeafTracker [exported]
      /** Tracks the "current leaf" as entries are processed. In a session tree, the leaf is the most recently added entry that hasn't become a parent of another entry. This is used to detect tree jumps (when a new entry's parentId doesn't match the current leaf). */
  interface:
    39-50: interface Boundary [exported]
      /** A detected boundary in the session */
    55-70: interface BoundaryMetadata [exported]
      /** Metadata for different boundary types */
    75-88: interface Segment [exported]
      /** A segment is a contiguous span of entries between boundaries */
    103-109: interface BoundaryOptions [exported]
      /** Options for boundary detection */
    533-537: interface BoundaryStats [exported]
      /** Get boundary statistics for a session */
  type:
    29-34: BoundaryType = | "branch"
  | "tree_jump"
  | "compaction"
  | "resume"
  | "handoff" [exported]
      /** Types of boundaries that can occur within a session */
  function:
    304-443: detectBoundaries(entries: SessionEntry[], options: BoundaryOptions = {}): {} [exported]
      /** Detect all boundaries in a list of session entries */
    454-528: extractSegments(entries: SessionEntry[], options: BoundaryOptions = {}): {} [exported]
      /** Extract segments from entries based on detected boundaries A segment is a contiguous span of entries. Boundaries define the split points. */
    546-570: getBoundaryStats(entries: SessionEntry[], options: BoundaryOptions = {}): BoundaryStats [exported]
      /** Calculate statistics about boundaries in a session */
  variable:
    98-98: 10 [exported]
      /** Default minimum gap in minutes to trigger a resume boundary. Can be overridden via BoundaryOptions.resumeGapMinutes. */
  imports:
    - ../types.js

src/parser/fork.ts [1-191]
  interface:
    22-33: interface ForkInfo [exported]
      /** Result of detecting a fork from a session header */
  function:
    46-57: isForkSession(header: SessionHeader, sessionPath: string): ForkInfo [exported]
      /** Check if a session is a fork (has parentSession in header) */
    70-85: findForks(sessions: SessionInfo[]): {} [exported]
      /** Find all fork relationships from a list of parsed sessions Note: Similar to analyzer.ts:findForkRelationships() but without sorting. The analyzer version sorts by timestamp; this version preserves input order. Both are exported to avoid circular imports that would exceed the barrel file module limit. */
    94-111: findForksFromHeaders(headers: [string, SessionHeader][]): {} [exported]
      /** Find fork relationships given just session headers and paths Useful when you don't have fully parsed sessions */
    119-131: buildForkTree(forks: ForkRelationship[]): Map<string, {}> [exported]
      /** Build a map of session paths to their fork children */
    140-159: getForkChain(sessionPath: string, forks: ForkRelationship[]): {} [exported]
      /** Get the fork chain for a session (all ancestors via fork) */
    168-190: getForkDescendants(sessionPath: string, forks: ForkRelationship[]): {} [exported]
      /** Get all descendants of a session via forks */
  imports:
    - ../types.js

src/parser/index.ts [1-9]
  imports:
    - ./analyzer.js
    - ./boundary.js
    - ./session.js
    - ./signals.js

src/parser/session.ts [1-415]
  function:
    25-28: async parseSession(filePath: string): Promise<SessionInfo> [exported]
      /** Parse a session JSONL file */
    33-82: parseSessionContent(content: string, filePath: string): SessionInfo [exported]
      /** Parse session content from string */
    87-180: buildTree(entries: SessionEntry[]): any [exported]
      /** Build a tree structure from entries */
    186-210: findLeaf(entries: SessionEntry[]): string [exported]
      /** Find the current leaf entry ID The leaf is the latest entry that has no children */
    215-227: findBranchPoints(entries: SessionEntry[]): {} [exported]
      /** Find branch points (entries with multiple children) */
    232-300: calculateStats(entries: SessionEntry[], tree: TreeNode | null): SessionStats [exported]
      /** Calculate session statistics */
    347-366: extractTextPreview(message: UserMessage | AssistantMessage, maxLength = 100): string [exported]
      /** Extract text preview from a message */
    382-404: getPathToEntry(entries: SessionEntry[], targetId: string): {} [exported]
      /** Get the path from root to a specific entry */
    409-414: getEntry(entries: SessionEntry[], id: string): any [exported]
      /** Get entry by ID */
  imports:
    - ../types.js
    - node:fs/promises

src/parser/signals.ts [1-1095]
  interface:
    555-564: interface FrictionDetectionOptions [exported]
      /** Options for friction detection */
    1067-1070: interface DelightDetectionOptions [exported]
      /** Options for delight detection */
  function:
    126-163: countRephrasingCascades(entries: SessionEntry[]): number [exported]
      /** Count rephrasing cascades in a segment A rephrasing cascade is 3+ consecutive user messages without a meaningful assistant response (no tool calls, no substantial text). */
    190-220: countToolLoops(entries: SessionEntry[]): number [exported]
      /** Count tool loops in a segment A tool loop is when the same tool fails with the same error type 3+ times. */
    292-342: countContextChurn(entries: SessionEntry[]): number [exported]
      /** Count context churn events Context churn is high frequency of read/ls operations on different files, indicating the user is fighting the context window. */
    349-381: detectModelSwitch(entries: SessionEntry[], previousSegmentModel?: string): string [exported]
      /** Detect if a model switch occurred for this segment Returns the model switched FROM if this segment is a retry with a different model. */
    389-436: detectSilentTermination(entries: SessionEntry[], isLastSegment: boolean, wasResumed: boolean): boolean [exported]
      /** Detect silent termination Session ends mid-task (no handoff, no success) and is not resumed. This is detected by checking if the last entry shows incomplete work. */
    479-507: extractManualFlags(entries: SessionEntry[]): {} [exported]
      /** Extract manual flags from session entries Looks for custom entries with type 'brain_flag' */
    518-546: calculateFrictionScore(friction: FrictionSignals): number [exported]
      /** Calculate overall friction score (0.0-1.0) Weights different friction signals based on severity. */
    569-601: detectFrictionSignals(entries: SessionEntry[], options: FrictionDetectionOptions = {}): FrictionSignals [exported]
      /** Detect all friction signals in a session segment */
    611-642: getFilesTouched(entries: SessionEntry[]): Set<string> [exported]
      /** Check if a segment touches similar files to another segment (for abandoned restart detection) */
    647-665: hasFileOverlap(files1: Set<string>, files2: Set<string>, threshold = 0.3): boolean [exported]
      /** Check if two sets of files have significant overlap */
    670-700: getPrimaryModel(entries: SessionEntry[]): string [exported]
      /** Get the primary model used in a segment */
    705-714: getSegmentTimestamp(entries: SessionEntry[]): string [exported]
      /** Get segment timestamp for abandoned restart detection */
    724-758: isAbandonedRestart(segmentA: { entries: SessionEntry[]; outcome: string; endTime: string }, segmentB: { entries: SessionEntry[]; startTime: string }): boolean [exported]
      /** Check if segment B is an abandoned restart of segment A Criteria: - Segment A has outcome 'abandoned' - Segment B starts within 30 minutes of segment A ending - Both segments touch similar files */
    771-810: isAbandonedRestartFromNode(previousNode: {
    outcome: string;
    timestamp: string;
    filesTouched: string[];
  }, currentStartTime: string, currentFilesTouched: string[]): boolean [exported]
      /** Check if a current segment is an abandoned restart of a previous node. This is similar to `isAbandonedRestart` but works with already-computed node data (with filesTouched arrays) instead of raw session entries. Criteria: - Previous node has outcome 'abandoned' - Current segment starts within 30 minutes of previous node's timestamp - Both touch similar files (30% overlap threshold) */
    822-864: detectResilientRecovery(entries: SessionEntry[]): boolean [exported]
      /** Detect resilient recovery Tool error occurs, but the model fixes it WITHOUT user intervention, and the task ultimately succeeds. */
    894-941: detectOneShotSuccess(entries: SessionEntry[]): boolean [exported]
      /** Detect one-shot success Complex task (multiple tool calls) completed with zero user corrections/rephrasings. */
    982-1005: detectExplicitPraise(entries: SessionEntry[]): boolean [exported]
      /** Detect explicit praise from user User says "great job", "perfect", "thanks", etc. */
    1039-1058: calculateDelightScore(delight: DelightSignals): number [exported]
      /** Calculate overall delight score (0.0-1.0) Weights different delight signals based on significance. */
    1075-1094: detectDelightSignals(entries: SessionEntry[], _options: DelightDetectionOptions = {}): DelightSignals [exported]
      /** Detect all delight signals in a session segment */
  imports:
    - ../types.js
    - ../types/index.js

src/prompt/agents-generator.ts [1-649]
  interface:
    31-52: interface AgentsGeneratorConfig [exported]
      /** Configuration for AGENTS.md generation */
    57-76: interface AgentsGeneratorResult [exported]
      /** Result of AGENTS.md generation */
    81-90: interface ModelInsightData [exported]
      /** Data gathered for a model's AGENTS.md */
  function:
    129-189: gatherModelData(db: Database.Database, model: string, config: AgentsGeneratorConfig = {}): ModelInsightData [exported]
      /** Gather all insights and clusters for a specific model */
    231-298: formatDataForPrompt(data: ModelInsightData): string [exported]
      /** Format model data into a structured prompt for LLM synthesis */
    304-354: generateFallbackAgents(data: ModelInsightData): string [exported]
      /** Generate a fallback AGENTS.md without LLM synthesis Used when LLM is not available or synthesis fails */
    359-388: async synthesizeWithLLM(data: ModelInsightData, config: AgentsGeneratorConfig = {}): Promise<string> [exported]
      /** Use LLM to synthesize model data into coherent AGENTS.md content */
    500-571: async generateAgentsForModel(db: Database.Database, model: string, config: AgentsGeneratorConfig = {}): Promise<AgentsGeneratorResult> [exported]
      /** Generate AGENTS.md for a specific model */
    576-586: listModelsWithInsights(db: Database.Database): {} [exported]
      /** List all models that have insights in the database */
    591-648: async previewAgentsForModel(db: Database.Database, model: string, config: AgentsGeneratorConfig = {}): Promise<AgentsGeneratorResult> [exported]
      /** Preview AGENTS.md generation without saving */
  imports:
    - ../storage/pattern-repository.js
    - ../types/index.js
    - ./prompt-generator.js
    - better-sqlite3
    - node:child_process
    - node:fs/promises
    - node:os
    - node:path

src/prompt/effectiveness.ts [1-881]
  interface:
    32-38: interface MeasureEffectivenessOptions [exported]
  function:
    92-104: countSessions(db: Database.Database, dateRange: DateRange): number [exported]
      /** Count unique sessions within a date range */
    109-121: countNodes(db: Database.Database, dateRange: DateRange): number [exported]
      /** Count nodes analyzed within a date range */
    295-320: countOccurrences(db: Database.Database, insight: AggregatedInsight, dateRange: DateRange): number [exported]
      /** Count occurrences of an insight pattern within a date range */
    326-342: calculateAverageSeverity(insight: AggregatedInsight): number [exported]
      /** Calculate average severity for occurrences within a date range. Returns a value between 0.0 and 1.0. */
    350-387: isStatisticallySignificant(beforeCount: number, afterCount: number, beforeSessions: number, afterSessions: number, minSessions: number = DEFAULT_MIN_SESSIONS): boolean [exported]
      /** Simplified chi-square test for statistical significance. Tests whether the difference between before and after rates is statistically significant at p < 0.05. */
    399-451: measureEffectiveness(db: Database.Database, insightId: string, beforePeriod: DateRange, afterPeriod: DateRange, options: MeasureEffectivenessOptions = {}): EffectivenessResult [exported]
      /** Measure the effectiveness of a prompt addition for a specific insight. Compares occurrence rates before and after the prompt was added to determine if it actually helped reduce the targeted behavior. */
    456-621: measureAndStoreEffectiveness(db: Database.Database, insightId: string, beforePeriod: DateRange, afterPeriod: DateRange, promptVersion: string, options: MeasureEffectivenessOptions = {}): PromptEffectiveness [exported]
      /** Measure effectiveness and store the result in the database */
    626-640: getEffectivenessHistory(db: Database.Database, insightId: string): {} [exported]
      /** Get effectiveness measurements for an insight */
    645-663: getLatestEffectiveness(db: Database.Database, insightId: string): any [exported]
      /** Get the latest effectiveness measurement for an insight */
    669-699: getLatestEffectivenessBatch(db: Database.Database, insightIds: string[]): Map<string, PromptEffectiveness> [exported]
      /** Get the latest effectiveness measurements for multiple insights in a single query. Returns a map of insightId -> PromptEffectiveness. */
    705-731: getInsightsNeedingMeasurement(db: Database.Database, measureAfterDays = 7): {} [exported]
      /** Get all insights that need effectiveness measurement. Returns insights that are included in prompts but haven't been measured recently. */
    737-792: autoDisableIneffectiveInsights(db: Database.Database, options: {
    threshold?: number; // Improvement % threshold (e.g. -10)
    minSessions?: number;
  } = {}): {} [exported]
      /** Auto-disable insights that have been measured as ineffective. Returns the IDs of disabled insights. */
  imports:
    - ../storage/node-storage.js
    - ../storage/pattern-repository.js
    - ../types/index.js
    - better-sqlite3
    - node:crypto

src/prompt/index.ts [1-13]
  imports:
    - ./agents-generator.js
    - ./effectiveness.js
    - ./prompt-generator.js
    - ./prompt-injector.js
    - ./prompt.js
    - ./types.js

src/prompt/prompt-generator.ts [1-360]
  interface:
    25-36: interface GeneratePromptOptions [exported]
  function:
    55-74: getModelDisplayName(model: string): string [exported]
      /** Get a human-readable model name from provider/model format */
    79-99: groupInsightsByModel(insights: AggregatedInsight[]): Map<string, {}> [exported]
      /** Group insights by model */
    104-129: filterActionableInsights(insights: AggregatedInsight[], options: GeneratePromptOptions = {}): {} [exported]
      /** Filter insights to actionable ones */
    134-198: formatModelSection(model: string, insights: AggregatedInsight[], options: GeneratePromptOptions = {}): string [exported]
      /** Format a model-specific prompt section */
    207-246: generatePromptAdditions(insights: AggregatedInsight[], options: GeneratePromptOptions = {}): {} [exported]
      /** Generate prompt additions for all models with insights */
    253-270: generatePromptAdditionsFromDb(db: Database.Database, options: GeneratePromptOptions = {}): {} [exported]
      /** Generate prompt additions from the database Fetches insights from aggregated_insights table and generates additions. */
    277-300: formatPromptAdditionsDocument(additions: PromptAddition[]): string [exported]
      /** Format a complete prompt additions document Combines all model-specific additions into a single markdown document. */
    308-332: updateInsightPromptTexts(db: Database.Database, additions: PromptAddition[], promptVersion?: string): void [exported]
      /** Generate and store prompt text for insights For each insight that should be included in prompts, generates the appropriate prompt text and updates the database. */
    337-359: getPromptAdditionsForModel(db: Database.Database, model: string, options: GeneratePromptOptions = {}): any [exported]
      /** Get prompt additions for a specific model */
  imports:
    - ../storage/pattern-repository.js
    - ../types/index.js
    - better-sqlite3

src/prompt/prompt-injector.ts [1-445]
  interface:
    33-46: interface PromptInjectionConfig [exported]
    48-57: interface InjectionResult [exported]
  type:
    30-30: InjectionMethod = "skill" | "agents_file" [exported]
    31-31: InjectionScope = "analysis_only" | "global" [exported]
  function:
    96-126: generateBrainInsightsSkill(additions: PromptAddition[]): string [exported]
      /** Generate the full brain-insights skill content */
    131-182: writeBrainInsightsSkill(db: Database.Database, options: PromptInjectionConfig = {}): InjectionResult [exported]
      /** Write the brain-insights skill to disk */
    187-207: generateModelSkill(db: Database.Database, model: string, options: PromptInjectionConfig = {}): string [exported]
      /** Generate skill content for a specific model */
    230-296: updateAgentsFile(db: Database.Database, options: PromptInjectionConfig = {}): InjectionResult [exported]
      /** Update AGENTS.md with insights section WARNING: This affects ALL pi sessions, not just analysis. Use skill-based injection instead. */
    301-336: removeFromAgentsFile(options: PromptInjectionConfig = {}): InjectionResult [exported]
      /** Remove insights section from AGENTS.md */
    345-365: injectInsights(db: Database.Database, options: PromptInjectionConfig = {}): InjectionResult [exported]
      /** Inject insights into prompts using configured method */
    370-407: removeInjectedInsights(options: PromptInjectionConfig = {}): InjectionResult [exported]
      /** Remove injected insights */
    412-436: getInjectionStatus(options: PromptInjectionConfig = {}): { skillExists: boolean; skillPath: string; agentsHasSection: boolean; agentsPath: string; } [exported]
      /** Check current injection status */
  imports:
    - ../types/index.js
    - ./prompt-generator.js
    - better-sqlite3
    - node:fs
    - node:os
    - node:path

src/prompt/prompt.ts [1-388]
  function:
    51-57: normalizePromptContent(content: string): string [exported]
      /** Normalize prompt content for hashing This ensures that whitespace changes and HTML comments don't unnecessarily trigger new versions. */
    64-67: calculatePromptHash(content: string): string [exported]
      /** Calculate the hash of prompt content Returns an 8-character hex prefix of SHA-256 hash */
    72-83: parseVersionString(version: string): { sequential: number; hash: string; } [exported]
      /** Parse a version string into its components */
    88-90: createVersionString(sequential: number, hash: string): string [exported]
      /** Create a version string from components */
    95-98: getArchiveFilename(version: string): string [exported]
      /** Get the archive filename for a version */
    103-113: ensurePromptsDir(promptsDir?: string): void [exported]
      /** Ensure the prompts directory structure exists */
    118-126: getVersionByHash(db: Database.Database, hash: string): any [exported]
      /** Get prompt version by content hash from database */
    131-138: getLatestVersion(db: Database.Database): any [exported]
      /** Get the latest prompt version from database */
    143-151: getNextSequential(db: Database.Database): number [exported]
      /** Get the next sequential version number */
    156-171: recordPromptVersion(db: Database.Database, version: PromptVersion, notes?: string): void [exported]
      /** Record a new prompt version in the database */
    176-194: archivePrompt(promptPath: string, historyDir: string, version: string): string [exported]
      /** Archive prompt to history directory */
    203-255: getOrCreatePromptVersion(db: Database.Database, promptPath: string, historyDir?: string): PromptVersion [exported]
      /** Get or create a prompt version If the current prompt has the same hash as an existing version, returns that version. Otherwise, creates a new version, archives the prompt, and records it in the database. */
    262-272: compareVersions(a: string, b: string): number [exported]
      /** Compare two version strings Returns negative if a < b, positive if a > b, 0 if equal */
    277-292: listPromptVersions(db: Database.Database): {} [exported]
      /** List all prompt versions from database */
    299-311: hasOutdatedNodes(db: Database.Database, currentVersion: string): boolean [exported]
      /** Check if a prompt needs reanalysis Returns true if nodes exist that were analyzed with an older version */
    316-328: getOutdatedNodeCount(db: Database.Database, currentVersion: string): number [exported]
      /** Get count of nodes needing reanalysis */
    335-340: getBundledPromptPath(): string [exported]
      /** Get the path to the bundled default prompt This is the prompt file shipped with the pi-brain package */
    348-387: ensureDefaultPrompt(targetPath?: string): boolean [exported]
      /** Ensure the default prompt exists at the target location If no prompt file exists at the target path, copies the bundled default. Returns true if a new prompt was installed, false if one already existed. */
  variable:
    30-30: any [exported]
      /** Default prompts directory */
    35-38: any [exported]
      /** Default prompt file path */
    43-43: any [exported]
      /** Default history directory */
  imports:
    - ./types.js
    - better-sqlite3
    - node:crypto
    - node:fs
    - node:os
    - node:path
    - node:url

src/prompt/types.ts [1-35]
  interface:
    8-23: interface PromptVersion [exported]
      /** Types for prompt versioning and management Prompt version information */
    28-34: interface PromptVersionRecord [exported]
      /** Prompt info retrieved from database */

src/storage/database.ts [1-155]
  interface:
    19-26: interface DatabaseOptions [exported]
    28-33: interface MigrationInfo [exported]
  function:
    38-63: openDatabase(options: DatabaseOptions = {}): Database.Database [exported]
      /** Open or create the pi-brain database */
    68-91: loadMigrations(): {} [exported]
      /** Load migrations from the migrations directory */
    96-106: getSchemaVersion(db: Database.Database): number [exported]
      /** Get current schema version */
    111-135: migrate(db: Database.Database): number [exported]
      /** Run pending migrations */
    140-142: closeDatabase(db: Database.Database): void [exported]
      /** Close the database connection */
    147-154: isDatabaseHealthy(db: Database.Database): boolean [exported]
      /** Check if the database is healthy */
  variable:
    14-14: any [exported]
      /** Default pi-brain data directory */
    17-17: any [exported]
      /** Default database path */
  imports:
    - better-sqlite3
    - node:fs
    - node:os
    - node:path
    - node:url

src/storage/decision-repository.ts [1-143]
  interface:
    10-19: interface ListDecisionsFilters [exported]
      /** Filters for querying daemon decisions */
    22-27: interface ListDecisionsOptions [exported]
      /** Pagination options */
    30-39: interface DaemonDecisionResult [exported]
      /** A daemon decision result with metadata */
    42-51: interface ListDecisionsResult [exported]
      /** Result from listDecisions query */
  function:
    56-124: listDecisions(db: Database.Database, filters: ListDecisionsFilters = {}, options: ListDecisionsOptions = {}): ListDecisionsResult [exported]
      /** List daemon decisions with filters and pagination. */
    129-142: updateDecisionFeedback(db: Database.Database, decisionId: string, feedback: string | null): boolean [exported]
      /** Update user feedback for a daemon decision */
  imports:
    - better-sqlite3

src/storage/index.ts [1-10]
  imports:
    - ./database.js
    - ./node-crud.js
    - ./node-repository.js
    - ./node-storage.js
    - ./node-types.js

src/storage/node-crud.ts [1-189]
  interface:
    26-29: interface RepositoryOptions extends NodeStorageOptions [exported]
      /** Options for node repository operations */
    32-54: interface NodeRow [exported]
      /** Node row from the database */
  function:
    60-62: generateLessonId(): string [exported]
    64-66: generateQuirkId(): string [exported]
    68-70: generateErrorId(): string [exported]
    72-74: generateDecisionId(): string [exported]
    83-114: insertLessons(db: Database.Database, nodeId: string, lessonsByLevel: LessonsByLevel): void [exported]
      /** Insert lessons for a node */
    119-139: insertModelQuirks(db: Database.Database, nodeId: string, quirks: ModelQuirk[]): void [exported]
      /** Insert model quirks for a node */
    144-164: insertToolErrors(db: Database.Database, nodeId: string, errors: ToolError[]): void [exported]
      /** Insert tool errors for a node */
    169-188: insertDaemonDecisions(db: Database.Database, nodeId: string, decisions: DaemonDecision[]): void [exported]
      /** Insert daemon decisions for a node */
  imports:
    - ./node-storage.js
    - ./node-types.js
    - better-sqlite3

src/storage/node-repository.ts [1-3200]
  interface:
    44-52: interface EdgeRow [exported]
      /** Edge row from the database */
    834-839: interface SearchHighlight [exported]
      /** Highlight match for search results */
    842-849: interface SearchResult [exported]
      /** Enhanced search result with score and highlights */
    852-861: interface SearchOptions [exported]
      /** Options for enhanced search */
    864-873: interface SearchNodesResult [exported]
      /** Result from enhanced search with pagination metadata */
    1276-1285: interface ListLessonsFilters [exported]
      /** Filters for querying lessons */
    1288-1293: interface ListLessonsOptions [exported]
      /** Pagination options for lessons */
    1296-1315: interface ListLessonsResult [exported]
      /** Result from listLessons query */
    1512-1521: interface ListQuirksFilters [exported]
      /** Filters for querying model quirks */
    1524-1529: interface ListQuirksOptions [exported]
      /** Pagination options for quirks */
    1532-1541: interface QuirkResult [exported]
      /** A quirk result with metadata */
    1544-1553: interface ListQuirksResult [exported]
      /** Result from listQuirks query */
    1636-1646: interface ModelQuirkStats [exported]
      /** Stats for a single model */
    1775-1784: interface ListToolErrorsFilters [exported]
      /** Filters for querying tool errors */
    1787-1792: interface ListToolErrorsOptions [exported]
      /** Pagination options for tool errors */
    1795-1804: interface ToolErrorResult [exported]
      /** A tool error result with metadata */
    1807-1816: interface ListToolErrorsResult [exported]
      /** Result from listToolErrors query */
    2284-2309: interface ListNodesFilters [exported]
      /** Filters for querying nodes */
    2312-2321: interface ListNodesOptions [exported]
      /** Pagination and sorting options */
    2324-2333: interface ListNodesResult [exported]
      /** Result from listNodes query */
    2493-2505: interface SessionSummaryRow [exported]
      /** Session summary row from aggregation query */
    2600-2616: interface ConnectedNodesOptions [exported]
      /** Options for getConnectedNodes */
    2619-2634: interface TraversalEdge [exported]
      /** An edge with direction information for traversal results */
    2637-2644: interface ConnectedNodesResult [exported]
      /** Result from getConnectedNodes */
    2964-2983: interface NodeConversionContext [exported]
      /** Context needed to convert AgentNodeOutput to a full Node */
  type:
    817-822: SearchField = | "summary"
  | "decisions"
  | "lessons"
  | "tags"
  | "topics" [exported]
      /** Fields that can be searched in the FTS index */
    1430-1440: LessonsByLevelResult = Record<
  string,
  {
    count: number;
    recent: {
      id: string;
      summary: string;
      createdAt: string;
    }[];
  }
> [exported]
      /** Result from getLessonsByLevel */
    1506-1506: QuirkFrequency = "once" | "sometimes" | "often" | "always" [exported]
      /** Frequency values for model quirks */
    1509-1509: QuirkSeverity = "low" | "medium" | "high" [exported]
      /** Severity values for model quirks (matches spec) */
    1649-1649: QuirksByModelResult = Record<string, ModelQuirkStats> [exported]
      /** Result from getQuirksByModel */
    2252-2260: NodeSortField = | "timestamp"
  | "analyzed_at"
  | "project"
  | "type"
  | "outcome"
  | "tokens_used"
  | "cost"
  | "duration_minutes" [exported]
      /** Valid sort fields for listNodes */
    2263-2263: SortOrder = "asc" | "desc" [exported]
      /** Sort order */
    2266-2278: NodeTypeFilter = | "coding"
  | "sysadmin"
  | "research"
  | "planning"
  | "debugging"
  | "qa"
  | "brainstorm"
  | "handoff"
  | "refactor"
  | "documentation"
  | "configuration"
  | "other" [exported]
      /** Node type filter values */
    2281-2281: OutcomeFilter = "success" | "partial" | "failed" | "abandoned" [exported]
      /** Outcome filter values */
    2597-2597: TraversalDirection = "incoming" | "outgoing" | "both" [exported]
      /** Direction for graph traversal */
  function:
    62-91: clearAllData(db: Database.Database): void [exported]
      /** Clear all data from the database (nodes, edges, etc.) Used by rebuild-index CLI */
    97-163: insertNodeToDb(db: Database.Database, node: Node, dataFile: string, options: { skipFts?: boolean } = {}): void [exported]
      /** Insert a node into the database (without writing JSON file) Used by createNode and rebuild-index CLI */
    169-183: createNode(db: Database.Database, node: Node, options: RepositoryOptions = {}): Node [exported]
      /** Create a node - writes to both SQLite and JSON storage Returns the node with any auto-generated fields filled in */
    194-301: upsertNode(db: Database.Database, node: Node, options: RepositoryOptions = {}): { node: Node; created: boolean; } [exported]
      /** Upsert a node - creates if not exists, updates if exists. This provides idempotent ingestion for analysis jobs. If a job crashes after writing JSON but before DB insert, re-running will update the existing data cleanly without duplicates or errors. Returns the node and whether it was created (true) or updated (false). */
    308-398: updateNode(db: Database.Database, node: Node, options: RepositoryOptions = {}): Node [exported]
      /** Update a node - writes new JSON version and updates SQLite row. Throws if the node doesn't exist in the database. Returns the updated node. */
    403-409: getNode(db: Database.Database, nodeId: string): any [exported]
      /** Get a node by ID (returns the row from SQLite - always the latest version) */
    416-426: getNodeVersion(db: Database.Database, nodeId: string, version: number): any [exported]
      /** Get a specific version of a node from SQLite. Note: SQLite only stores the current/latest version. For historical versions, use getAllNodeVersions() which reads from JSON storage. */
    431-434: nodeExistsInDb(db: Database.Database, nodeId: string): boolean [exported]
      /** Check if a node exists in the database */
    439-445: getAllNodeVersions(nodeId: string, options: RepositoryOptions = {}): {} [exported]
      /** Get all versions of a node from JSON storage */
    451-457: deleteNode(db: Database.Database, nodeId: string): boolean [exported]
      /** Delete a node and all related data Note: Due to ON DELETE CASCADE, related records are automatically deleted */
    462-474: findNodeByEndEntryId(db: Database.Database, sessionFile: string, entryId: string): any [exported]
      /** Find a node that contains a specific entry ID as its end boundary */
    479-490: findLastNodeInSession(db: Database.Database, sessionFile: string): any [exported]
      /** Find the latest node for a given session file */
    495-506: findFirstNodeInSession(db: Database.Database, sessionFile: string): any [exported]
      /** Find the first node for a given session file */
    515-540: findPreviousProjectNode(db: Database.Database, project: string, beforeTimestamp: string): any [exported]
      /** Find the most recent node for a project before a given timestamp. Used for abandoned restart detection. Returns the full Node from JSON storage (not just the row) to access filesTouched and other content fields. */
    567-605: linkNodeToPredecessors(db: Database.Database, node: Node, context: {
    boundaryType?: string;
  } = {}): {} [exported]
      /** Automatically link a node to its predecessors based on session structure. Creates structural edges based on session continuity and fork relationships. Idempotent: will not create duplicate edges if called multiple times. */
    630-666: createEdge(db: Database.Database, sourceNodeId: string, targetNodeId: string, type: EdgeType, options: {
    metadata?: EdgeMetadata;
    createdBy?: "boundary" | "daemon" | "user";
  } = {}): Edge [exported]
      /** Create an edge between two nodes */
    671-678: getEdgesFrom(db: Database.Database, nodeId: string): {} [exported]
      /** Get edges from a node (outgoing) */
    683-690: getEdgesTo(db: Database.Database, nodeId: string): {} [exported]
      /** Get edges to a node (incoming) */
    695-702: getNodeEdges(db: Database.Database, nodeId: string): {} [exported]
      /** Get all edges for a node (both directions) */
    707-710: getEdge(db: Database.Database, edgeId: string): EdgeRow [exported]
      /** Get edge by ID */
    715-718: deleteEdge(db: Database.Database, edgeId: string): boolean [exported]
      /** Delete an edge */
    723-741: edgeExists(db: Database.Database, sourceNodeId: string, targetNodeId: string, type?: EdgeType): boolean [exported]
      /** Check if an edge exists between two nodes */
    750-778: indexNodeForSearch(db: Database.Database, node: Node): void [exported]
      /** Index a node for full-text search */
    784-810: searchNodes(db: Database.Database, query: string, limit = 20): {} [exported]
      /** Search nodes using full-text search Quotes the query to handle special characters like hyphens */
    1053-1176: searchNodesAdvanced(db: Database.Database, query: string, options: SearchOptions = {}): SearchNodesResult [exported]
      /** Enhanced search with scores, highlights, and filter support */
    1181-1269: countSearchResults(db: Database.Database, query: string, options: Pick<SearchOptions, "fields" | "filters"> = {}): number [exported]
      /** Count total search results (without fetching data) */
    1328-1427: listLessons(db: Database.Database, filters: ListLessonsFilters = {}, options: ListLessonsOptions = {}): ListLessonsResult [exported]
      /** List lessons with filters and pagination. Supports filtering by: - level (exact match) - project (partial match via nodes table) - tags (AND logic via lesson_tags table) - confidence (exact match) Per specs/api.md GET /api/v1/lessons endpoint. */
    1448-1488: getLessonsByLevel(db: Database.Database, recentLimit = 5): Record<string, { count: number; recent: {}; }> [exported]
      /** Get aggregated lesson stats by level. Returns counts and most recent lessons for each level. Per specs/api.md GET /api/v1/lessons/by-level endpoint. */
    1493-1499: countLessons(db: Database.Database, filters: ListLessonsFilters = {}): number [exported]
      /** Count lessons matching filters (without fetching data) */
    1573-1633: listQuirks(db: Database.Database, filters: ListQuirksFilters = {}, options: ListQuirksOptions = {}): ListQuirksResult [exported]
      /** List model quirks with filters and pagination. Supports filtering by: - model (exact match) - frequency (minimum frequency ranking) - project (partial match via nodes table) Per specs/api.md GET /api/v1/quirks endpoint. */
    1657-1695: getQuirksByModel(db: Database.Database, recentLimit = 5): Record<string, ModelQuirkStats> [exported]
      /** Get aggregated quirk stats by model. Returns counts and most recent quirks for each model that has quirks. Per specs/api.md GET /api/v1/stats/models endpoint (quirkCount field). */
    1700-1706: countQuirks(db: Database.Database, filters: ListQuirksFilters = {}): number [exported]
      /** Count quirks matching filters (without fetching data) */
    1711-1718: getAllQuirkModels(db: Database.Database): {} [exported]
      /** Get all unique models that have quirks recorded */
    1726-1768: getAggregatedQuirks(db: Database.Database, options: { minOccurrences?: number; limit?: number } = {}): {} [exported]
      /** Get aggregated quirks - similar observations grouped together. Useful for the dashboard "Model Quirks" panel. Per specs/storage.md "Find model quirks by frequency" query. */
    1821-1879: listToolErrors(db: Database.Database, filters: ListToolErrorsFilters = {}, options: ListToolErrorsOptions = {}): ListToolErrorsResult [exported]
      /** List individual tool errors with filters and pagination. */
    1885-1973: getAggregatedToolErrors(db: Database.Database, filters: ListToolErrorsFilters = {}, options: { limit?: number; offset?: number; groupByModel?: boolean } = {}): {} [exported]
      /** Get aggregated tool errors - grouped by tool and error type (and optionally model). Per specs/api.md GET /api/v1/tool-errors. */
    1979-2037: getToolErrorStats(db: Database.Database): { byTool: {}; byModel: {}; trends: { thisWeek: number; lastWeek: number; change: number; }; } [exported]
      /** Get tool error statistics for the dashboard. Per specs/api.md GET /api/v1/stats/tool-errors. */
    2042-2048: countToolErrors(db: Database.Database, filters: ListToolErrorsFilters = {}): number [exported]
      /** Count tool errors matching filters. */
    2053-2060: getAllToolsWithErrors(db: Database.Database): {} [exported]
      /** Get all unique tools that have errors recorded */
    2069-2076: getNodeSummary(db: Database.Database, nodeId: string): string [exported]
      /** Get node summary from FTS index */
    2081-2085: getNodeTags(db: Database.Database, nodeId: string): {} [exported]
      /** Get tags for a node */
    2090-2094: getNodeTopics(db: Database.Database, nodeId: string): {} [exported]
      /** Get topics for a node */
    2099-2122: getNodeLessons(db: Database.Database, nodeId: string): {} [exported]
      /** Get lessons for a node */
    2127-2150: getNodeQuirks(db: Database.Database, nodeId: string): {} [exported]
      /** Get model quirks for a node */
    2155-2178: getNodeToolErrors(db: Database.Database, nodeId: string): {} [exported]
      /** Get tool errors for a node */
    2183-2193: getAllTags(db: Database.Database): {} [exported]
      /** Get all unique tags in the system */
    2198-2202: getAllTopics(db: Database.Database): {} [exported]
      /** Get all unique topics in the system */
    2207-2214: getLessonTags(db: Database.Database, lessonId: string): {} [exported]
      /** Get tags for a specific lesson */
    2219-2229: getNodesByTag(db: Database.Database, tag: string): {} [exported]
      /** Find nodes by tag (matches both node tags and lesson tags) */
    2234-2245: getNodesByTopic(db: Database.Database, topic: string): {} [exported]
      /** Find nodes by topic */
    2363-2488: listNodes(db: Database.Database, filters: ListNodesFilters = {}, options: ListNodesOptions = {}): ListNodesResult [exported]
      /** List nodes with filters, pagination, and sorting. Supports filtering by: - project (partial match via LIKE) - type (exact match) - outcome (exact match) - date range (from/to on timestamp field) - computer (exact match) - hadClearGoal (boolean) - isNewProject (boolean) - tags (AND logic - nodes must have ALL specified tags) - topics (AND logic - nodes must have ALL specified topics) Per specs/api.md GET /api/v1/nodes endpoint. */
    2511-2540: getSessionSummaries(db: Database.Database, project: string, options: { limit?: number; offset?: number } = {}): {} [exported]
      /** Get aggregated session summaries for a project. Used for the session browser to avoid loading thousands of nodes. */
    2545-2553: getAllProjects(db: Database.Database): {} [exported]
      /** Get all unique projects in the system */
    2558-2566: getAllNodeTypes(db: Database.Database): {} [exported]
      /** Get all unique node types that have been used */
    2571-2579: getAllComputers(db: Database.Database): {} [exported]
      /** Get all unique computers (source machines) */
    2584-2590: countNodes(db: Database.Database, filters: ListNodesFilters = {}): number [exported]
      /** Count nodes matching filters (without fetching data) */
    2675-2780: getConnectedNodes(db: Database.Database, nodeId: string, options: ConnectedNodesOptions = {}): ConnectedNodesResult [exported]
      /** Get all nodes connected to a specific node with graph traversal. Supports: - Multi-hop traversal (depth 1-5) - Direction filtering (incoming, outgoing, both) - Edge type filtering Based on specs/storage.md graph traversal query and specs/api.md GET /api/v1/nodes/:id/connected endpoint. */
    2789-2836: getSubgraph(db: Database.Database, rootNodeIds: string[], options: ConnectedNodesOptions = {}): ConnectedNodesResult [exported]
      /** Get the subgraph for visualization - returns nodes and edges within a given depth from multiple root nodes. Unlike getConnectedNodes, this INCLUDES the root nodes in the result, which is useful for rendering a graph view starting from selected nodes. */
    2844-2898: findPath(db: Database.Database, fromNodeId: string, toNodeId: string, options: { maxDepth?: number } = {}): { nodeIds: {}; edges: {}; } [exported]
      /** Get the path between two nodes if one exists. Uses BFS to find the shortest path. Returns null if no path exists. */
    2904-2914: getAncestors(db: Database.Database, nodeId: string, options: { maxDepth?: number; edgeTypes?: EdgeType[] } = {}): ConnectedNodesResult [exported]
      /** Get all ancestors of a node (nodes that lead TO this node). Follows incoming edges only. */
    2920-2930: getDescendants(db: Database.Database, nodeId: string, options: { maxDepth?: number; edgeTypes?: EdgeType[] } = {}): ConnectedNodesResult [exported]
      /** Get all descendants of a node (nodes that this node leads TO). Follows outgoing edges only. */
    2947-2957: edgeRowToEdge(row: EdgeRow): Edge [exported]
      /** Convert an Edge row from the database to an Edge object */
    2989-3196: agentOutputToNode(output: AgentNodeOutput, context: NodeConversionContext): Node [exported]
      /** Convert AgentNodeOutput from the analyzer to a full Node structure Fills in source, metadata, and identity fields from the job context */
  imports:
    - ../daemon/processor.js
    - ../daemon/queue.js
    - ./node-crud.js
    - ./node-storage.js
    - ./node-types.js
    - better-sqlite3

src/storage/node-storage.ts [1-292]
  interface:
    24-27: interface NodeStorageOptions [exported]
  function:
    33-41: getNodeDir(timestamp: string, nodesDir = DEFAULT_NODES_DIR): string [exported]
      /** Get the directory path for a node based on its timestamp Returns: nodesDir/YYYY/MM */
    47-55: getNodePath(nodeId: string, version: number, timestamp: string, nodesDir = DEFAULT_NODES_DIR): string [exported]
      /** Get the full file path for a node Returns: nodesDir/YYYY/MM/<nodeId>-v<version>.json */
    60-82: writeNode(node: Node, options: NodeStorageOptions = {}): string [exported]
      /** Write a node to JSON file storage */
    87-102: readNode(nodeId: string, version: number, timestamp: string, options: NodeStorageOptions = {}): Node [exported]
      /** Read a node from JSON file storage */
    107-114: readNodeFromPath(filePath: string): Node [exported]
      /** Read a node by file path */
    119-128: nodeExists(nodeId: string, version: number, timestamp: string, options: NodeStorageOptions = {}): boolean [exported]
      /** Check if a node file exists */
    134-175: listNodeFiles(options: NodeStorageOptions = {}): {} [exported]
      /** List all node files in the storage directory Returns array of file paths */
    181-202: listNodeVersions(nodeId: string, options: NodeStorageOptions = {}): {} [exported]
      /** List all versions of a specific node Returns array of { version, path } sorted by version ascending */
    207-217: getLatestNodeVersion(nodeId: string, options: NodeStorageOptions = {}): { version: number; path: string; } [exported]
      /** Get the latest version of a node */
    222-231: readLatestNode(nodeId: string, options: NodeStorageOptions = {}): any [exported]
      /** Read the latest version of a node */
    236-261: parseNodePath(filePath: string): { nodeId: string; version: number; year: string; month: string; } [exported]
      /** Parse a node file path to extract node ID, version, year, and month */
    267-291: createNodeVersion(existingNode: Node, updates: Partial<Node>, options: NodeStorageOptions = {}): Node [exported]
      /** Create a new version of an existing node Copies the node with incremented version and updated previousVersions */
  variable:
    22-22: any [exported]
      /** Default nodes directory */
  imports:
    - ./node-types.js
    - node:fs
    - node:os
    - node:path

src/storage/node-types.ts [1-113]
  function:
    25-27: generateNodeId(): string [exported]
      /** Generate a unique 16-character hex node ID Uses first 16 chars of UUID (64 bits of entropy) */
    43-53: generateDeterministicNodeId(sessionFile: string, segmentStart: string, segmentEnd: string): string [exported]
      /** Generate a deterministic 16-character hex node ID based on session and segment. This ensures idempotent ingestion - re-running the same job produces the same ID. The ID is derived from: - Session file path - Segment start entry ID - Segment end entry ID Uses length-prefix encoding to prevent collisions from inputs containing delimiter characters (e.g., "a:b" + "c" vs "a" + "b:c"). Two jobs with the same inputs will always produce the same node ID. */
    58-60: nodeRef(nodeId: string, version: number): string [exported]
      /** Create a full node reference with version */
    65-74: parseNodeRef(ref: string): { nodeId: string; version: number; } [exported]
      /** Parse a node reference into id and version */
    79-89: emptyLessons(): LessonsByLevel [exported]
      /** Create an empty lessons structure */
    94-102: emptyObservations(): ModelObservations [exported]
      /** Create an empty observations structure */
    107-112: emptyDaemonMeta(): DaemonMeta [exported]
      /** Create an empty daemon meta structure */
  imports:
    - ../types/index.js
    - node:crypto

src/storage/pattern-repository.ts [1-369]
  interface:
    74-78: interface ListFailurePatternsOptions [exported]
    142-146: interface ListLessonPatternsOptions [exported]
    188-197: interface ListInsightsOptions [exported]
  function:
    80-111: listFailurePatterns(db: Database.Database, options: ListFailurePatternsOptions = {}): {} [exported]
    117-136: listModelStats(db: Database.Database): {} [exported]
    148-182: listLessonPatterns(db: Database.Database, options: ListLessonPatternsOptions = {}): {} [exported]
    199-252: listInsights(db: Database.Database, options: ListInsightsOptions = {}): {} [exported]
    254-268: getInsight(db: Database.Database, id: string): any [exported]
    270-294: getInsightsByModel(db: Database.Database, model: string, options: { minConfidence?: number; promptIncludedOnly?: boolean } = {}): {} [exported]
    296-328: countInsights(db: Database.Database, options: { type?: InsightType; model?: string; promptIncluded?: boolean } = {}): number [exported]
    330-347: updateInsightPrompt(db: Database.Database, id: string, promptText: string, promptIncluded: boolean, promptVersion?: string): void [exported]
  imports:
    - ../types/index.js
    - better-sqlite3

src/sync/index.ts [1-9]
  imports:
    - ./rsync.js
    - ./status.js

src/sync/rsync.ts [1-351]
  interface:
    20-28: interface RsyncResult [exported]
      /** Result of an rsync operation */
    33-44: interface RsyncOptions [exported]
      /** Options for running rsync */
  function:
    138-267: async runRsync(spoke: SpokeConfig, options: RsyncOptions = {}): Promise<RsyncResult> [exported]
      /** Run rsync for a spoke with rsync sync method */
    272-283: formatBytes(bytes: number): string [exported]
      /** Format bytes to human-readable string */
    291-299: async isRsyncAvailable(): Promise<boolean> [exported]
      /** Check if rsync is available on the system Uses `rsync --version` instead of `which` for cross-platform compatibility (works on Windows, Linux, macOS). Gracefully handles ENOENT. */
    304-315: countSpokeSessionFiles(spokePath: string): number [exported]
      /** Count session files in a spoke's sync directory */
    320-334: listSpokeSessions(spokePath: string): {} [exported]
      /** Get list of session files from a spoke's sync directory */
    339-350: getLastSyncTime(spokePath: string): any [exported]
      /** Get last sync time for a spoke (based on directory modification time) */
  imports:
    - ../config/types.js
    - node:child_process
    - node:fs
    - node:path
    - node:util

src/sync/status.ts [1-182]
  interface:
    21-31: interface SpokeStatus [exported]
      /** Status of a single spoke */
    36-43: interface SyncStatus [exported]
      /** Overall sync status */
  function:
    48-67: formatTimeAgo(date: Date): string [exported]
      /** Format relative time ago */
    72-88: getSpokeStatus(spoke: SpokeConfig): SpokeStatus [exported]
      /** Get status for a single spoke */
    93-111: async getSyncStatus(config: PiBrainConfig): Promise<SyncStatus> [exported]
      /** Get overall sync status */
    116-181: formatSyncStatus(status: SyncStatus): string [exported]
      /** Format sync status for display */
  imports:
    - ../config/types.js
    - ./rsync.js
    - node:fs
    - node:os

src/types.ts [1-298]
  interface:
    10-15: interface SessionEntryBase [exported]
      /** Type definitions for pi session data structures Based on pi-coding-agent's session format (version 3) */
    17-24: interface SessionHeader [exported]
    26-29: interface SessionMessageEntry extends SessionEntryBase [exported]
    31-38: interface CompactionEntry extends SessionEntryBase [exported]
    40-43: interface CompactionDetails [exported]
    45-51: interface BranchSummaryEntry extends SessionEntryBase [exported]
    53-56: interface BranchSummaryDetails [exported]
    58-62: interface ModelChangeEntry extends SessionEntryBase [exported]
    64-67: interface ThinkingLevelChangeEntry extends SessionEntryBase [exported]
    69-73: interface CustomEntry extends SessionEntryBase [exported]
    75-81: interface CustomMessageEntry extends SessionEntryBase [exported]
    83-87: interface LabelEntry extends SessionEntryBase [exported]
    89-92: interface SessionInfoEntry extends SessionEntryBase [exported]
    109-114: interface UserMessage [exported]
    116-124: interface AssistantMessage [exported]
    126-133: interface ToolResultMessage [exported]
    137-140: interface TextContent [exported]
    142-145: interface ThinkingContent [exported]
    147-152: interface ToolCallContent [exported]
    154-157: interface ImageContent [exported]
    159-164: interface ImageSource [exported]
    172-184: interface Usage [exported]
    186-195: interface Attachment [exported]
    201-218: interface SessionInfo [exported]
    220-233: interface TreeNode [exported]
    235-260: interface SessionStats [exported]
    262-271: interface ForkRelationship [exported]
    273-280: interface ProjectGroup [exported]
    286-297: interface VisualizationData [exported]
  type:
    94-103: SessionEntry = | SessionMessageEntry
  | CompactionEntry
  | BranchSummaryEntry
  | ModelChangeEntry
  | ThinkingLevelChangeEntry
  | CustomEntry
  | CustomMessageEntry
  | LabelEntry
  | SessionInfoEntry [exported]
    135-135: AgentMessage = UserMessage | AssistantMessage | ToolResultMessage [exported]
    166-170: ContentBlock = | TextContent
  | ThinkingContent
  | ToolCallContent
  | ImageContent [exported]

src/types/index.ts [1-661]
  interface:
    12-30: interface Node [exported]
      /** Shared type definitions for pi-brain This file contains pure type definitions (no runtime code) shared between the daemon/storage backend and the web frontend. */
    32-49: interface NodeSource [exported]
    66-78: interface NodeClassification [exported]
    82-86: interface Decision [exported]
    88-92: interface ErrorSummary [exported]
    94-105: interface NodeContent [exported]
    122-133: interface Lesson [exported]
    135-143: interface LessonsByLevel [exported]
    149-157: interface ModelUsage [exported]
    161-168: interface ModelQuirk [exported]
    170-176: interface ToolError [exported]
    178-186: interface ModelObservations [exported]
    192-205: interface NodeMetadata [exported]
    207-216: interface SemanticData [exported]
    218-225: interface DaemonDecision [exported]
    227-237: interface DaemonMeta [exported]
    262-275: interface EdgeMetadata [exported]
    277-286: interface Edge [exported]
    299-306: interface NodeVersion [exported]
    312-322: interface AggregatedFailurePattern [exported]
    324-333: interface AggregatedModelStats [exported]
    335-344: interface AggregatedLessonPattern [exported]
    353-380: interface AggregatedInsight [exported]
    386-397: interface PromptAddition [exported]
    406-411: interface DateRange [exported]
      /** Date range for measuring effectiveness before/after prompt addition */
    416-434: interface EffectivenessResult [exported]
      /** Result of measuring prompt effectiveness for a single insight */
    439-475: interface PromptEffectiveness [exported]
      /** Full effectiveness measurement record stored in database */
    484-491: interface ManualFlag [exported]
      /** Manual flag recorded by user via /brain --flag command */
    496-511: interface FrictionSignals [exported]
      /** Friction signals detected in a session segment */
    516-525: interface DelightSignals [exported]
      /** Delight signals detected in a session segment */
    530-534: interface NodeSignals [exported]
      /** Combined signals for a node */
    553-575: interface Cluster [exported]
      /** A discovered cluster from facet discovery */
    580-587: interface ClusterNode [exported]
      /** Node membership in a cluster */
    592-602: interface NodeEmbedding [exported]
      /** Cached embedding for a node */
    607-620: interface ClusteringRun [exported]
      /** Record of a clustering run */
    625-636: interface EmbeddingConfig [exported]
      /** Configuration for the embedding provider */
    641-652: interface ClusteringConfig [exported]
      /** Configuration for clustering algorithm */
    657-660: interface FacetDiscoveryResult [exported]
      /** Result of facet discovery pipeline */
  type:
    51-64: NodeType = | "coding"
  | "debugging"
  | "refactoring"
  | "sysadmin"
  | "research"
  | "planning"
  | "qa"
  | "brainstorm"
  | "handoff"
  | "documentation"
  | "configuration"
  | "data"
  | "other" [exported]
    80-80: Outcome = "success" | "partial" | "failed" | "abandoned" [exported]
    111-118: LessonLevel = | "project"
  | "task"
  | "user"
  | "model"
  | "tool"
  | "skill"
  | "subagent" [exported]
    120-120: Confidence = "high" | "medium" | "low" [exported]
    159-159: Frequency = "once" | "sometimes" | "often" | "always" [exported]
    243-258: EdgeType = | "fork"
  | "branch"
  | "tree_jump"
  | "resume"
  | "compaction"
  | "continuation"
  | "handoff"
  // Semantic edges (daemon discovers)
  | "semantic"
  | "reference"
  | "lesson_application"
  | ... [exported]
    260-260: EdgeCreator = "boundary" | "daemon" | "user" [exported]
    292-297: VersionTrigger = | "initial"
  | "prompt_update"
  | "connection_found"
  | "user_feedback"
  | "schema_migration" [exported]
    350-350: InsightType = "quirk" | "win" | "failure" | "tool_error" | "lesson" [exported]
    351-351: InsightSeverity = "low" | "medium" | "high" [exported]
    543-543: ClusterStatus = "pending" | "confirmed" | "dismissed" [exported]
      /** Cluster status for user feedback */
    548-548: ClusterSignalType = "friction" | "delight" | null [exported]
      /** Signal type a cluster relates to */

src/web/app/src/app.d.ts [1-12]

src/web/app/src/lib/api/client.ts [1-457]
  function:
    65-74: createApiError(options: ApiErrorOptions): Error [exported]
    76-80: createTimeoutError(timeoutMs: number): Error [exported]
    82-86: isApiError(error: unknown): boolean [exported]
    88-90: isTimeoutError(error: unknown): boolean [exported]
  variable:
    151-454: api [exported]
  imports:
    - $lib/types

src/web/app/src/lib/index.ts [1-17]
  imports:
    - ./api/client
    - ./stores/daemon
    - ./stores/nodes
    - ./stores/websocket
    - ./types

src/web/app/src/lib/stores/daemon.ts [1-68]
  variable:
    67-67: { subscribe: any; loadStatus(): any; setStatus(status: DaemonStatus): void; reset(): void; } [exported]
  imports:
    - $lib/api/client
    - $lib/types
    - svelte/store

src/web/app/src/lib/stores/nodes.ts [1-112]
  variable:
    105-105: nodesStore [exported]
    108-111: any [exported]
  imports:
    - $lib/api/client
    - $lib/types
    - svelte/store

src/web/app/src/lib/stores/websocket.ts [1-175]
  variable:
    174-174: wsStore [exported]
  imports:
    - ./daemon
    - ./nodes
    - svelte/store

src/web/app/src/lib/types.ts [1-286]
  interface:
    78-84: interface LessonEntity extends Omit<Lesson, "tags"> [exported]
    86-91: interface ModelQuirkEntity extends ModelQuirk [exported]
    93-98: interface ToolErrorEntity extends ToolError [exported]
    101-106: interface ListNodesResponse [exported]
    108-116: interface SearchResult [exported]
    118-148: interface DashboardStats [exported]
    150-170: interface DaemonStatus [exported]
    174-183: interface DaemonDecisionEntity [exported]
    186-195: interface NodeFilters [exported]
    198-203: interface ProjectSummary [exported]
    205-219: interface SessionSummary [exported]
    222-227: interface ClusterNodeWithDetails extends ClusterNode [exported]
    229-231: interface ClusterWithNodes extends Cluster [exported]
    233-236: interface ClusterFeedResponse [exported]
    238-243: interface ClusterListResponse [exported]
    246-262: interface AbandonedRestartPattern [exported]
    264-270: interface AbandonedRestartsResponse [exported]
    272-285: interface FrictionSummary [exported]
  imports:
    - ../../../../types/index.js

src/web/app/src/lib/utils/date.ts [1-94]
  function:
    16-51: formatDistanceToNow(date: Date): string [exported]
      /** Format a date as a relative distance from now e.g., "5 minutes ago", "2 hours ago", "3 days ago" */
    56-65: formatDate(date: Date): string [exported]
      /** Format a date as "MMM D, YYYY at h:mm AM/PM" */
    70-76: formatDateShort(date: Date): string [exported]
      /** Format a date as "MMM D, YYYY" */
    81-86: formatDateForInput(date: Date): string [exported]
      /** Format a date as "YYYY-MM-DD" for input[type="date"] */
    91-93: parseDate(date: string | Date): Date [exported]
      /** Parse a date string or Date object to Date */

src/web/app/vite.config.ts [1-7]
  imports:
    - @sveltejs/kit/vite
    - vite

src/web/generator.ts [1-948]
  function:
    170-240: generateHTML(sessions: SessionInfo[], forks: ForkRelationship[]): string [exported]
      /** Generate complete visualization HTML */
  imports:
    - ../parser/analyzer.js
    - ../types.js

src/web/index.ts [1-6]
  imports:
    - ./generator.js

---
Files: 77
Estimated tokens: 23,342 (codebase: ~953,496)
