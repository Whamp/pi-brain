# Project Overview

## Languages
- typescript: 103 files

## Statistics
- Total files: 103
- Total symbols: 714
  - function: 387
  - interface: 229
  - type: 44
  - variable: 39
  - class: 15

---

src/api/index.ts [1-22]
  imports:
    - ./server.js
    - ./websocket.js

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

src/api/routes/clusters.ts [1-393]
  function:
    196-392: async clustersRoutes(app: FastifyInstance): Promise<void> [exported]
  imports:
    - ../../types/index.js
    - better-sqlite3
    - fastify

src/api/routes/config.ts [1-1792]
  function:
    1043-1791: async configRoutes(app: FastifyInstance): Promise<void> [exported]
  imports:
    - ../../config/config.js
    - ../../config/types.js
    - ../../daemon/scheduler.js
    - ../responses.js
    - fastify
    - node:fs
    - node:path
    - yaml

src/api/routes/daemon.ts [1-385]
  function:
    26-317: async daemonRoutes(app: FastifyInstance): Promise<void> [exported]
  imports:
    - ../../daemon/cli.js
    - ../../daemon/errors.js
    - ../../daemon/pattern-aggregation.js
    - ../../daemon/queue.js
    - ../responses.js
    - better-sqlite3
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
    - ../../storage/edge-repository.js
    - ../../storage/node-types.js
    - ../responses.js
    - fastify

src/api/routes/lessons.ts [1-94]
  function:
    39-93: async lessonsRoutes(app: FastifyInstance): Promise<void> [exported]
  imports:
    - ../../storage/lesson-repository.js
    - ../responses.js
    - fastify

src/api/routes/nodes.ts [1-261]
  function:
    109-260: async nodesRoutes(app: FastifyInstance): Promise<void> [exported]
  imports:
    - ../../storage/graph-repository.js
    - ../../storage/index.js
    - ../../storage/lesson-repository.js
    - ../../storage/node-conversion.js
    - ../../storage/node-queries.js
    - ../../storage/node-storage.js
    - ../../storage/node-types.js
    - ../../storage/quirk-repository.js
    - ../../storage/tool-error-repository.js
    - ../responses.js
    - better-sqlite3
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

src/api/routes/query.ts [1-291]
  function:
    115-290: async queryRoutes(app: FastifyInstance): Promise<void> [exported]
  imports:
    - ../../daemon/facet-discovery.js
    - ../../daemon/query-processor.js
    - ../responses.js
    - fastify
    - node:child_process
    - node:os
    - node:path

src/api/routes/quirks.ts [1-108]
  function:
    27-107: async quirksRoutes(app: FastifyInstance): Promise<void> [exported]
  imports:
    - ../../storage/quirk-repository.js
    - ../responses.js
    - fastify

src/api/routes/search.ts [1-105]
  function:
    40-104: async searchRoutes(app: FastifyInstance): Promise<void> [exported]
  imports:
    - ../../storage/node-queries.js
    - ../../storage/search-repository.js
    - ../responses.js
    - fastify

src/api/routes/sessions.ts [1-273]
  function:
    57-272: async sessionsRoutes(app: FastifyInstance): Promise<void> [exported]
  imports:
    - ../../storage/node-conversion.js
    - ../../storage/node-queries.js
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

src/api/routes/stats.ts [1-485]
  function:
    297-475: async statsRoutes(app: FastifyInstance): Promise<void> [exported]
  imports:
    - ../../storage/node-queries.js
    - ../../storage/tool-error-repository.js
    - ../responses.js
    - better-sqlite3
    - fastify

src/api/routes/tool-errors.ts [1-121]
  function:
    27-120: async toolErrorsRoutes(app: FastifyInstance): Promise<void> [exported]
  imports:
    - ../../storage/tool-error-repository.js
    - ../responses.js
    - fastify

src/api/server.ts [1-205]
  interface:
    49-54: interface ServerContext [exported]
      /** Server context passed to route handlers */
    171-174: interface ServerResult [exported]
      /** Server result including the Fastify instance and WebSocket manager */
  function:
    68-166: async createServer(db: Database, config: ApiConfig, daemonConfig?: DaemonConfig, wsManager?: WebSocketManager): Promise<FastifyInstance> [exported]
      /** Create and configure the Fastify server */
    179-197: async startServer(db: Database, config: ApiConfig, daemonConfig?: DaemonConfig, wsManager?: WebSocketManager): Promise<ServerResult> [exported]
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
    - ./websocket.js
    - @fastify/cors
    - @fastify/websocket
    - better-sqlite3
    - fastify

src/api/websocket.ts [1-404]
  class:
    74-359: class WebSocketManager [exported]
      /** Manages WebSocket connections and broadcasts events */
  interface:
    45-49: interface WSMessage [exported]
      /** Message format for WebSocket events */
  type:
    31-31: WSChannel = "daemon" | "analysis" | "node" | "queue" [exported]
      /** Available subscription channels */
    34-42: WSEventType = | "daemon.status"
  | "analysis.started"
  | "analysis.completed"
  | "analysis.failed"
  | "node.created"
  | "queue.updated"
  | "subscribed"
  | "error" [exported]
      /** WebSocket message types from server to client */
  function:
    368-380: registerWebSocketRoute(app: FastifyInstance, wsManager: WebSocketManager): void [exported]
      /** Register the WebSocket route on a Fastify instance */
    391-396: getWebSocketManager(): WebSocketManager [exported]
      /** Get or create the global WebSocket manager */
    401-403: setWebSocketManager(manager: WebSocketManager): void [exported]
      /** Set the global WebSocket manager (for testing or custom config) */
  imports:
    - ../daemon/queue.js
    - ../storage/node-types.js
    - fastify
    - ws

src/cli.ts [1-1165]
  imports:
    - ./config/index.js
    - ./daemon/export.js
    - ./daemon/graph-export.js
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

src/config/config.ts [1-1190]
  class:
    908-916: class ConfigError extends Error [exported]
      /** Configuration loading errors */
  function:
    35-43: expandPath(p: string): string [exported]
      /** Expand ~ in paths to home directory */
    48-54: getDefaultHubConfig(): HubConfig [exported]
      /** Default hub configuration */
    59-97: getDefaultDaemonConfig(): DaemonConfig [exported]
      /** Default daemon configuration */
    102-107: getDefaultQueryConfig(): QueryConfig [exported]
      /** Default query configuration */
    112-122: getDefaultApiConfig(): ApiConfig [exported]
      /** Default API configuration */
    127-135: getDefaultConfig(): PiBrainConfig [exported]
      /** Get complete default configuration */
    869-903: transformConfig(raw: RawConfig): PiBrainConfig [exported]
      /** Transform raw YAML config to typed config with validation */
    963-990: loadConfig(configPath?: string): PiBrainConfig [exported]
      /** Load configuration from a YAML file */
    995-1000: ensureConfigDir(configDir?: string): void [exported]
      /** Ensure the config directory exists */
    1005-1040: ensureDirectories(config: PiBrainConfig): void [exported]
      /** Ensure all required directories exist based on configuration */
    1045-1108: writeDefaultConfig(configPath?: string): void [exported]
      /** Write a default configuration file */
    1113-1121: getSessionDirs(config: PiBrainConfig): {} [exported]
      /** Get all session directories to watch (hub + enabled spokes) */
    1126-1128: getEnabledSpokes(config: PiBrainConfig): {} [exported]
      /** Get enabled spokes from configuration */
    1133-1137: getRsyncSpokes(config: PiBrainConfig): {} [exported]
      /** Get rsync spokes (enabled spokes with rsync sync method) */
    1142-1149: getScheduledRsyncSpokes(config: PiBrainConfig): {} [exported]
      /** Get scheduled rsync spokes (rsync spokes with a schedule) */
    1160-1189: getComputerFromPath(sessionPath: string, config: PiBrainConfig): string [exported]
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

src/config/types.ts [1-280]
  interface:
    16-28: interface RsyncOptions [exported]
      /** Rsync-specific options for spoke configuration */
    34-55: interface SpokeConfig [exported]
      /** Spoke machine configuration Spokes are secondary machines that sync sessions to the hub */
    61-70: interface HubConfig [exported]
      /** Hub configuration The hub is the primary computer where daemon runs */
    76-166: interface DaemonConfig [exported]
      /** Daemon configuration Controls the background analysis process */
    172-178: interface QueryConfig [exported]
      /** Query configuration Controls the /brain query interface */
    183-192: interface ApiConfig [exported]
      /** API server configuration */
    197-212: interface PiBrainConfig [exported]
      /** Complete pi-brain configuration */
    218-279: interface RawConfig [exported]
      /** Raw YAML configuration (snake_case, before transformation) This matches the YAML file structure */
  type:
    11-11: SyncMethod = "syncthing" | "rsync" | "api" [exported]
      /** Configuration types for pi-brain Configuration is loaded from ~/.pi-brain/config.yaml All paths support ~ expansion for home directory Spoke sync method options */

src/daemon/cli.ts [1-1337]
  interface:
    114-120: interface DaemonStatus [exported]
      /** Daemon status info */
    123-128: interface QueueStatus [exported]
      /** Queue status info */
    131-136: interface HealthCheckResult [exported]
      /** Health check result */
    139-143: interface HealthStatus [exported]
      /** Overall health status */
    146-149: interface OutputOptions [exported]
      /** CLI output options */
    276-280: interface StartOptions [exported]
      /** Start options */
    283-286: interface StopOptions [exported]
      /** Stop options */
  function:
    61-70: isPortAvailable(port: number): Promise<boolean> [exported]
      /** Check if a port is available */
    75-88: findProcessOnPort(port: number): number [exported]
      /** Find process using a port (Linux/macOS) */
    158-169: readPidFile(): number [exported]
      /** Read the daemon PID from the PID file */
    174-180: writePidFile(pid: number): void [exported]
      /** Write the daemon PID to the PID file */
    185-193: removePidFile(): void [exported]
      /** Remove the PID file */
    198-206: isProcessRunning(pid: number): boolean [exported]
      /** Check if a process with the given PID is running */
    211-224: isDaemonRunning(): { running: boolean; pid: number; } [exported]
      /** Check if the daemon is currently running */
    233-254: formatUptime(seconds: number): string [exported]
      /** Format uptime in a human-readable way */
    259-269: getProcessUptime(): number [exported]
      /** Get process uptime (approximate based on PID file modification time) */
    484-514: async startDaemon(options: StartOptions = {}): Promise<DaemonResult> [exported]
      /** Start the daemon process */
    553-588: async stopDaemon(options: StopOptions = {}): Promise<{ success: boolean; message: string; }> [exported]
      /** Stop the daemon process */
    593-605: getDaemonStatus(configPath?: string): DaemonStatus [exported]
      /** Get daemon status information */
    614-643: getQueueStatus(configPath?: string): QueueStatus [exported]
      /** Get queue status information */
    648-701: queueAnalysis(sessionPath: string, configPath?: string): { success: boolean; message: string; jobId?: string; } [exported]
      /** Queue a session for analysis */
    921-951: async runHealthChecks(configPath?: string): Promise<HealthStatus> [exported]
      /** Run all health checks */
    960-981: formatDaemonStatus(status: DaemonStatus, _options: OutputOptions = {}): string [exported]
      /** Format daemon status for display */
    1032-1066: formatQueueStatus(queueStatus: QueueStatus, _options: OutputOptions = {}): string [exported]
      /** Format queue status for display */
    1081-1104: formatHealthStatus(status: HealthStatus, _options: OutputOptions = {}): string [exported]
      /** Format health check results for display */
    1119-1239: rebuildIndex(configPath?: string): { success: boolean; message: string; count: number; } [exported]
      /** Rebuild the SQLite index from JSON files */
    1244-1326: async rebuildEmbeddings(configPath?: string, options: { force?: boolean } = {}): Promise<{ success: boolean; message: string; count: number; }> [exported]
      /** Rebuild embeddings for all nodes */
  variable:
    108-108: any [exported]
      /** PID file location */
    111-111: any [exported]
      /** Log file location */
  imports:
    - ../config/config.js
    - ../config/types.js
    - ../storage/database.js
    - ../storage/embedding-utils.js
    - ../storage/index.js
    - ../storage/node-storage.js
    - ./facet-discovery.js
    - ./processor.js
    - ./queue.js
    - node:child_process
    - node:fs
    - node:net
    - node:path

src/daemon/connection-discovery.ts [1-629]
  class:
    159-628: class ConnectionDiscoverer [exported]
      /** Discovers semantic connections between nodes in the knowledge graph. Uses keyword/tag similarity, explicit references, and lesson reinforcement patterns to find related nodes. Does not use LLM - relies on FTS and Jaccard similarity for performance. */
  interface:
    138-143: interface ConnectionResult [exported]
  imports:
    - ../storage/edge-repository.js
    - ../storage/index.js
    - ../storage/node-crud.js
    - ../storage/node-queries.js
    - ../types/index.js
    - better-sqlite3

src/daemon/consolidation/creative-associator.ts [1-241]
  class:
    83-240: class CreativeAssociator [exported]
      /** Discovers and creates non-obvious connections between nodes */
  interface:
    42-51: interface CreativeAssociatorConfig [exported]
      /** Configuration for the creative associator */
    56-65: interface CreativeAssociatorResult [exported]
      /** Result of a creative association run */
  imports:
    - ../../storage/database.js
    - ../../storage/edge-repository.js
    - ../../storage/embedding-utils.js
    - ../../storage/semantic-search.js
    - better-sqlite3

src/daemon/consolidation/decay-scheduler.ts [1-351]
  class:
    91-339: class ConsolidationScheduler [exported]
      /** Scheduler for memory consolidation jobs */
  interface:
    31-40: interface ConsolidationConfig [exported]
      /** Configuration for consolidation jobs */
    45-52: interface ConsolidationResult [exported]
      /** Result of a consolidation job */
  function:
    344-350: createConsolidationScheduler(db: Database.Database, config?: ConsolidationConfig, logger?: ConsolidationLogger): ConsolidationScheduler [exported]
      /** Create a consolidation scheduler with default configuration */
  imports:
    - ./creative-associator.js
    - ./relevance.js
    - better-sqlite3
    - croner

src/daemon/consolidation/index.ts [1-25]
  imports:
    - ./creative-associator.js
    - ./decay-scheduler.js
    - ./relevance.js

src/daemon/consolidation/relevance.ts [1-346]
  class:
    83-345: class RelevanceCalculator [exported]
      /** Calculates and updates node relevance scores */
  interface:
    39-50: interface RelevanceFactors [exported]
      /** Factors used in relevance calculation */
    55-62: interface RelevanceResult [exported]
      /** Result of calculating relevance for a single node */
  imports:
    - better-sqlite3

src/daemon/daemon-process.ts [1-339]
  imports:
    - ../api/server.js
    - ../config/config.js
    - ../storage/database.js
    - ./cli.js
    - ./consolidation/index.js
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

src/daemon/export.ts [1-175]
  function:
    17-30: getSegmentEntries(entries: SessionEntry[], startId: string, endId: string): {} [exported]
      /** Extract entries within a segment range */
    121-174: async exportFineTuneData(outputPath: string, configPath?: string): Promise<{ success: boolean; message: string; count: number; }> [exported]
      /** Export fine-tuning data to JSONL Format: { "input": <JSON string of segment entries>, "output": <JSON string of node analysis> } */
  imports:
    - ../config/index.js
    - ../parser/session.js
    - ../storage/node-storage.js
    - ../types/index.js
    - node:fs
    - node:path

src/daemon/facet-discovery.ts [1-1925]
  class:
    769-1896: class FacetDiscovery [exported]
  interface:
    99-108: interface ClusterAnalysisConfig [exported]
      /** Configuration for LLM cluster analysis */
    113-121: interface ClusterAnalysisResult [exported]
      /** Result from analyzing a single cluster */
    126-131: interface ClusterAnalysisBatchResult [exported]
      /** Result from analyzing multiple clusters */
    140-144: interface EmbeddingProvider [exported]
      /** Interface for embedding providers */
    755-759: interface FacetDiscoveryLogger [exported]
  function:
    162-198: createEmbeddingProvider(config: EmbeddingConfig): EmbeddingProvider [exported]
      /** Create an embedding provider from config */
    331-355: createMockEmbeddingProvider(dims = 384): EmbeddingProvider [exported]
      /** Create mock embedding provider for testing only. Not exposed in EmbeddingConfig - use createMockEmbeddingProvider() directly in tests. */
    473-500: kMeansClustering(embeddings: number[][], k: number, maxIterations = 100): KMeansResult [exported]
      /** Simple K-means++ clustering implementation */
    543-562: hdbscanClustering(embeddings: number[][], minClusterSize = 3, minSamples = 3): {} [exported]
      /** HDBSCAN-like density-based clustering (simplified) */
  imports:
    - ../storage/embedding-utils.js
    - ../storage/node-storage.js
    - ../types/index.js
    - better-sqlite3
    - node:child_process
    - node:crypto
    - node:fs/promises
    - node:os
    - node:path
    - node:url

src/daemon/graph-export.ts [1-134]
  interface:
    15-20: interface GraphExportOptions [exported]
  function:
    25-92: exportGraphviz(outputPath: string, configPath?: string, options: GraphExportOptions = {}): { success: boolean; message: string; } [exported]
      /** Export knowledge graph to Graphviz DOT format */
  imports:
    - ../config/index.js
    - ../storage/database.js
    - ../storage/edge-repository.js
    - ../storage/node-crud.js
    - ../storage/node-queries.js
    - node:fs
    - node:path

src/daemon/index.ts [1-182]
  variable:
    181-181: "0.1.0" [exported]
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

src/daemon/insight-aggregation.ts [1-628]
  class:
    149-627: class InsightAggregator [exported]
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

src/daemon/processor.ts [1-857]
  class:
    795-849: class JobProcessor [exported]
      /** Job processor that invokes pi agents for analysis */
  interface:
    21-34: interface AgentResult [exported]
      /** Result from invoking the pi agent */
    37-118: interface AgentNodeOutput [exported]
      /** Output schema from the session analyzer (matches session-analyzer.md) */
    121-143: interface RelationshipOutput [exported]
      /** Output schema for relationships extracted by the session analyzer */
    155-159: interface SkillInfo [exported]
      /** Skill availability information */
    162-167: interface ProcessorLogger [exported]
      /** Logger interface for processor */
    239-246: interface EnvironmentValidationResult [exported]
      /** Result of environment validation */
    785-790: interface ProcessorConfig [exported]
      /** Processor configuration */
  function:
    203-211: async checkSkillAvailable(skillName: string): Promise<boolean> [exported]
      /** Check if a skill is available by looking for SKILL.md */
    216-236: async getSkillAvailability(): Promise<Map<string, SkillInfo>> [exported]
      /** Get availability information for all skills */
    252-264: async validateRequiredSkills(): Promise<EnvironmentValidationResult> [exported]
      /** Validate that all required skills are available Returns validation result instead of throwing */
    299-313: async buildSkillsArg(sessionFile?: string): Promise<string> [exported]
      /** Build the skills argument for pi invocation Returns comma-separated list of available skills RLM skill is only included for files larger than RLM_SIZE_THRESHOLD to avoid confusing smaller models with RLM instructions. */
    322-354: buildAnalysisPrompt(job: AnalysisJob): string [exported]
      /** Build the analysis prompt for a job */
    387-495: async invokeAgent(job: AnalysisJob, config: DaemonConfig, logger: ProcessorLogger = consoleLogger): Promise<AgentResult> [exported]
      /** Invoke the pi agent to analyze a session */
    601-670: parseAgentOutput(stdout: string, logger: ProcessorLogger = consoleLogger): Omit<AgentResult, "exitCode" | "durationMs"> [exported]
      /** Parse the pi agent's JSON mode output */
    676-709: extractNodeFromText(text: string, logger: ProcessorLogger = consoleLogger): AgentNodeOutput [exported]
      /** Extract node JSON from text content Handles both raw JSON and code-fenced JSON */
    763-778: isValidNodeOutput(obj: unknown): boolean [exported]
      /** Basic validation that output matches expected schema */
    854-856: createProcessor(config: ProcessorConfig): JobProcessor [exported]
      /** Create a job processor */
  variable:
    170-175: ProcessorLogger [exported]
      /** Default console logger */
    182-182: readonly [] [exported]
      /** Required skills for analysis - must be available */
    185-185: readonly ["codemap"] [exported]
      /** Optional skills - enhance analysis but not required */
    188-188: readonly ["rlm"] [exported]
      /** Skills that are conditionally included based on file size */
    191-191: number [exported]
      /** File size threshold (in bytes) for including RLM skill */
    194-194: any [exported]
      /** Skills directory location */
  imports:
    - ../config/types.js
    - ./queue.js
    - node:child_process
    - node:fs/promises
    - node:os
    - node:path

src/daemon/query-processor.ts [1-926]
  interface:
    38-52: interface QueryRequest [exported]
      /** Query request from the API */
    55-73: interface QueryResponse [exported]
      /** Query response to return to the client */
    98-111: interface QueryProcessorConfig [exported]
  function:
    116-176: async processQuery(request: QueryRequest, config: QueryProcessorConfig): Promise<QueryResponse> [exported]
      /** Process a natural language query against the knowledge graph */
  imports:
    - ../config/types.js
    - ../storage/bridge-discovery.js
    - ../storage/database.js
    - ../storage/hybrid-search.js
    - ../storage/node-crud.js
    - ../storage/node-queries.js
    - ../storage/quirk-repository.js
    - ../storage/tool-error-repository.js
    - ./facet-discovery.js
    - ./processor.js
    - better-sqlite3
    - node:child_process
    - node:fs/promises
    - node:os
    - node:path

src/daemon/queue.ts [1-807]
  class:
    151-762: class QueueManager [exported]
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
    773-775: generateJobId(): string [exported]
      /** Generate a unique job ID Uses the same format as node IDs: 16-char hex string */
    780-782: createQueueManager(db: Database.Database): QueueManager [exported]
      /** Create a queue manager from a database */
    788-806: getQueueStatusSummary(db: Database.Database): { stats: QueueStats; pendingJobs: {}; runningJobs: {}; recentFailed: {}; } [exported]
      /** Get aggregated queue status Used by CLI and API */
  variable:
    23-34: PRIORITY [exported]
      /** Priority levels (lower = higher priority) */
  imports:
    - better-sqlite3

src/daemon/scheduler.ts [1-945]
  class:
    163-871: class Scheduler [exported]
      /** Scheduler manages cron-based scheduled jobs */
  interface:
    59-66: interface ScheduledJobResult [exported]
      /** Result of a scheduled job execution */
    69-74: interface SchedulerLogger [exported]
      /** Logger interface for scheduler */
    95-146: interface SchedulerConfig [exported]
      /** Scheduler configuration */
    149-158: interface SchedulerStatus [exported]
      /** Scheduler state */
  type:
    51-56: ScheduledJobType = | "reanalysis"
  | "connection_discovery"
  | "pattern_aggregation"
  | "clustering"
  | "backfill_embeddings" [exported]
      /** Job types that can be scheduled */
  function:
    876-906: createScheduler(config: DaemonConfig, queue: QueueManager, db: Database.Database, logger?: SchedulerLogger): Scheduler [exported]
      /** Create a scheduler from daemon config */
    912-922: isValidCronExpression(expression: string): boolean [exported]
      /** Validate a cron expression Returns true if valid, false otherwise */
    927-944: getNextRunTimes(expression: string, count = 5): {} [exported]
      /** Get the next N run times for a cron expression */
  variable:
    78-83: SchedulerLogger [exported]
      /** Default no-op logger */
    87-92: SchedulerLogger [exported]
      /** Console logger for production use */
  imports:
    - ../config/types.js
    - ../prompt/effectiveness.js
    - ../prompt/prompt.js
    - ../storage/embedding-utils.js
    - ../storage/node-storage.js
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

src/daemon/worker.ts [1-894]
  class:
    128-833: class Worker [exported]
      /** Worker that processes jobs from the analysis queue */
  interface:
    68-85: interface WorkerConfig [exported]
      /** Worker configuration */
    88-103: interface WorkerStatus [exported]
      /** Worker status */
    106-119: interface JobProcessingResult [exported]
      /** Result from processing a single job */
  function:
    842-844: createWorker(config: WorkerConfig): Worker [exported]
      /** Create a worker instance */
    850-864: processSingleJob(job: AnalysisJob, config: PiBrainConfig, db: Database.Database, logger?: ProcessorLogger): Promise<JobProcessingResult> [exported]
      /** Process a single job without the full worker loop Useful for one-off processing or testing */
    869-893: handleJobError(error: Error, job: AnalysisJob, retryPolicy: RetryPolicy = DEFAULT_RETRY_POLICY): { shouldRetry: boolean; retryDelayMinutes: number; formattedError: string; category: ReturnType<any>; } [exported]
      /** Handle job error manually (for custom queue implementations) */
  imports:
    - ../config/config.js
    - ../config/types.js
    - ../parser/index.js
    - ../prompt/prompt.js
    - ../storage/embedding-utils.js
    - ../storage/index.js
    - ../storage/node-conversion.js
    - ../storage/node-types.js
    - ../storage/relationship-edges.js
    - ../types/index.js
    - ./connection-discovery.js
    - ./errors.js
    - ./facet-discovery.js
    - ./processor.js
    - ./queue.js
    - better-sqlite3
    - node:path

src/index.ts [1-58]
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
    - ./types/index.js
    - ./web/generator.js

src/parser/analyzer.ts [1-340]
  function:
    20-22: getDefaultSessionDir(): string [exported]
      /** Default session directory */
    35-47: async scanSessions(sessionDir?: string): Promise<{}> [exported]
      /** Scan session directory and parse all sessions Note: This function loads all sessions into memory. For large session histories (thousands of sessions), consider using `scanSessionsIterator` which processes sessions one at a time. */
    64-106: async *scanSessionsIterator(sessionDir?: string): AsyncGenerator<SessionInfo, void, unknown> [exported]
      /** Async generator that yields sessions one at a time for memory efficiency Use this instead of `scanSessions` when processing large session histories (hundreds or thousands of sessions) to avoid loading all sessions into memory. Sessions are yielded in file system order, not sorted by timestamp. */
    111-131: findForkRelationships(sessions: SessionInfo[]): {} [exported]
      /** Find fork relationships between sessions */
    136-168: groupByProject(sessions: SessionInfo[]): {} [exported]
      /** Group sessions by project (cwd) */
    189-200: decodeProjectDir(encodedName: string): string [exported]
      /** Decode project directory name to path e.g., "--home-will-projects-myapp--" → "/home/will/projects/myapp" **Warning**: Pi's encoding is lossy - hyphens in original paths are not escaped. This means "--home-will-projects-pi-brain--" could be either: - /home/will/projects/pi-brain (correct) - /home/will/projects/pi/brain (wrong) Prefer using session.header.cwd which contains the accurate original path. This function is only useful for display purposes when session data is unavailable. */
    214-221: getProjectName(sessionPath: string): string [exported]
      /** Get project name from session path */
    232-234: getProjectNameFromSession(session: SessionInfo): string [exported]
      /** Get project name from a SessionInfo object (preferred over getProjectName) This function returns the accurate project path from the session header, which is not affected by the lossy directory name encoding. */
    239-244: filterByProject(sessions: SessionInfo[], projectPath: string): {} [exported]
      /** Filter sessions by project path */
    249-264: filterByDateRange(sessions: SessionInfo[], startDate?: Date, endDate?: Date): {} [exported]
      /** Filter sessions by date range */
    269-298: searchSessions(sessions: SessionInfo[], query: string): {} [exported]
      /** Search sessions for text content */
    303-339: getOverallStats(sessions: SessionInfo[]): { totalSessions: number; totalEntries: number; totalMessages: number; totalTokens: number; totalCost: number; projectCount: number; forkCount: number; } [exported]
      /** Get session summary statistics */
  imports:
    - ../types/index.js
    - ./session.js
    - node:fs/promises
    - node:os
    - node:path

src/parser/boundary.ts [1-655]
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
    617-621: interface BoundaryStats [exported]
      /** Get boundary statistics for a session */
  type:
    29-34: BoundaryType = | "branch"
  | "tree_jump"
  | "compaction"
  | "resume"
  | "handoff" [exported]
      /** Types of boundaries that can occur within a session */
  function:
    468-525: detectBoundaries(entries: SessionEntry[], options: BoundaryOptions = {}): {} [exported]
      /** Detect all boundaries in a list of session entries */
    556-612: extractSegments(entries: SessionEntry[], options: BoundaryOptions = {}): {} [exported]
      /** Extract segments from entries based on detected boundaries A segment is a contiguous span of entries. Boundaries define the split points. */
    630-654: getBoundaryStats(entries: SessionEntry[], options: BoundaryOptions = {}): BoundaryStats [exported]
      /** Calculate statistics about boundaries in a session */
  variable:
    98-98: 10 [exported]
      /** Default minimum gap in minutes to trigger a resume boundary. Can be overridden via BoundaryOptions.resumeGapMinutes. */
  imports:
    - ../types/index.js

src/parser/fork.ts [1-195]
  interface:
    26-37: interface ForkInfo [exported]
      /** Result of detecting a fork from a session header */
  function:
    50-61: isForkSession(header: SessionHeader, sessionPath: string): ForkInfo [exported]
      /** Check if a session is a fork (has parentSession in header) */
    74-89: findForks(sessions: SessionInfo[]): {} [exported]
      /** Find all fork relationships from a list of parsed sessions Note: Similar to analyzer.ts:findForkRelationships() but without sorting. The analyzer version sorts by timestamp; this version preserves input order. Both are exported to avoid circular imports that would exceed the barrel file module limit. */
    98-115: findForksFromHeaders(headers: [string, SessionHeader][]): {} [exported]
      /** Find fork relationships given just session headers and paths Useful when you don't have fully parsed sessions */
    123-135: buildForkTree(forks: ForkRelationship[]): Map<string, {}> [exported]
      /** Build a map of session paths to their fork children */
    144-163: getForkChain(sessionPath: string, forks: ForkRelationship[]): {} [exported]
      /** Get the fork chain for a session (all ancestors via fork) */
    172-194: getForkDescendants(sessionPath: string, forks: ForkRelationship[]): {} [exported]
      /** Get all descendants of a session via forks */
  imports:
    - ../types/index.js

src/parser/index.ts [1-9]
  imports:
    - ./analyzer.js
    - ./boundary.js
    - ./session.js
    - ./signals.js

src/parser/session.ts [1-438]
  function:
    25-28: async parseSession(filePath: string): Promise<SessionInfo> [exported]
      /** Parse a session JSONL file */
    33-82: parseSessionContent(content: string, filePath: string): SessionInfo [exported]
      /** Parse session content from string */
    151-182: buildTree(entries: SessionEntry[]): any [exported]
      /** Build a tree structure from entries */
    188-212: findLeaf(entries: SessionEntry[]): string [exported]
      /** Find the current leaf entry ID The leaf is the latest entry that has no children */
    217-229: findBranchPoints(entries: SessionEntry[]): {} [exported]
      /** Find branch points (entries with multiple children) */
    273-323: calculateStats(entries: SessionEntry[], tree: TreeNode | null): SessionStats [exported]
      /** Calculate session statistics */
    370-389: extractTextPreview(message: UserMessage | AssistantMessage, maxLength = 100): string [exported]
      /** Extract text preview from a message */
    405-427: getPathToEntry(entries: SessionEntry[], targetId: string): {} [exported]
      /** Get the path from root to a specific entry */
    432-437: getEntry(entries: SessionEntry[], id: string): any [exported]
      /** Get entry by ID */
  imports:
    - ../types/index.js
    - node:fs/promises

src/parser/signals.ts [1-1181]
  interface:
    590-599: interface FrictionDetectionOptions [exported]
      /** Options for friction detection */
    1153-1156: interface DelightDetectionOptions [exported]
      /** Options for delight detection */
  function:
    124-161: countRephrasingCascades(entries: SessionEntry[]): number [exported]
      /** Count rephrasing cascades in a segment A rephrasing cascade is 3+ consecutive user messages without a meaningful assistant response (no tool calls, no substantial text). */
    188-218: countToolLoops(entries: SessionEntry[]): number [exported]
      /** Count tool loops in a segment A tool loop is when the same tool fails with the same error type 3+ times. */
    352-377: countContextChurn(entries: SessionEntry[]): number [exported]
      /** Count context churn events Context churn is high frequency of read/ls operations on different files, indicating the user is fighting the context window. */
    384-416: detectModelSwitch(entries: SessionEntry[], previousSegmentModel?: string): string [exported]
      /** Detect if a model switch occurred for this segment Returns the model switched FROM if this segment is a retry with a different model. */
    457-471: detectSilentTermination(entries: SessionEntry[], isLastSegment: boolean, wasResumed: boolean): boolean [exported]
      /** Detect silent termination Session ends mid-task (no handoff, no success) and is not resumed. This is detected by checking if the last entry shows incomplete work. */
    514-542: extractManualFlags(entries: SessionEntry[]): {} [exported]
      /** Extract manual flags from session entries Looks for custom entries with type 'brain_flag' */
    553-581: calculateFrictionScore(friction: FrictionSignals): number [exported]
      /** Calculate overall friction score (0.0-1.0) Weights different friction signals based on severity. */
    604-636: detectFrictionSignals(entries: SessionEntry[], options: FrictionDetectionOptions = {}): FrictionSignals [exported]
      /** Detect all friction signals in a session segment */
    676-690: getFilesTouched(entries: SessionEntry[]): Set<string> [exported]
      /** Check if a segment touches similar files to another segment (for abandoned restart detection) */
    695-713: hasFileOverlap(files1: Set<string>, files2: Set<string>, threshold = 0.3): boolean [exported]
      /** Check if two sets of files have significant overlap */
    718-748: getPrimaryModel(entries: SessionEntry[]): string [exported]
      /** Get the primary model used in a segment */
    753-762: getSegmentTimestamp(entries: SessionEntry[]): string [exported]
      /** Get segment timestamp for abandoned restart detection */
    772-806: isAbandonedRestart(segmentA: { entries: SessionEntry[]; outcome: string; endTime: string }, segmentB: { entries: SessionEntry[]; startTime: string }): boolean [exported]
      /** Check if segment B is an abandoned restart of segment A Criteria: - Segment A has outcome 'abandoned' - Segment B starts within 30 minutes of segment A ending - Both segments touch similar files */
    819-858: isAbandonedRestartFromNode(previousNode: {
    outcome: string;
    timestamp: string;
    filesTouched: string[];
  }, currentStartTime: string, currentFilesTouched: string[]): boolean [exported]
      /** Check if a current segment is an abandoned restart of a previous node. This is similar to `isAbandonedRestart` but works with already-computed node data (with filesTouched arrays) instead of raw session entries. Criteria: - Previous node has outcome 'abandoned' - Current segment starts within 30 minutes of previous node's timestamp - Both touch similar files (30% overlap threshold) */
    914-938: detectResilientRecovery(entries: SessionEntry[]): boolean [exported]
      /** Detect resilient recovery Tool error occurs, but the model fixes it WITHOUT user intervention, and the task ultimately succeeds. */
    998-1027: detectOneShotSuccess(entries: SessionEntry[]): boolean [exported]
      /** Detect one-shot success Complex task (multiple tool calls) completed with zero user corrections/rephrasings. */
    1068-1091: detectExplicitPraise(entries: SessionEntry[]): boolean [exported]
      /** Detect explicit praise from user User says "great job", "perfect", "thanks", etc. */
    1125-1144: calculateDelightScore(delight: DelightSignals): number [exported]
      /** Calculate overall delight score (0.0-1.0) Weights different delight signals based on significance. */
    1161-1180: detectDelightSignals(entries: SessionEntry[], _options: DelightDetectionOptions = {}): DelightSignals [exported]
      /** Detect all delight signals in a session segment */
  imports:
    - ../types/index.js

src/prompt/agents-generator.ts [1-683]
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
    268-327: formatDataForPrompt(data: ModelInsightData): string [exported]
      /** Format model data into a structured prompt for LLM synthesis */
    333-388: generateFallbackAgents(data: ModelInsightData): string [exported]
      /** Generate a fallback AGENTS.md without LLM synthesis Used when LLM is not available or synthesis fails */
    393-422: async synthesizeWithLLM(data: ModelInsightData, config: AgentsGeneratorConfig = {}): Promise<string> [exported]
      /** Use LLM to synthesize model data into coherent AGENTS.md content */
    534-605: async generateAgentsForModel(db: Database.Database, model: string, config: AgentsGeneratorConfig = {}): Promise<AgentsGeneratorResult> [exported]
      /** Generate AGENTS.md for a specific model */
    610-620: listModelsWithInsights(db: Database.Database): {} [exported]
      /** List all models that have insights in the database */
    625-682: async previewAgentsForModel(db: Database.Database, model: string, config: AgentsGeneratorConfig = {}): Promise<AgentsGeneratorResult> [exported]
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

src/prompt/prompt-generator.ts [1-391]
  interface:
    25-36: interface GeneratePromptOptions [exported]
  function:
    55-74: getModelDisplayName(model: string): string [exported]
      /** Get a human-readable model name from provider/model format */
    79-99: groupInsightsByModel(insights: AggregatedInsight[]): Map<string, {}> [exported]
      /** Group insights by model */
    104-129: filterActionableInsights(insights: AggregatedInsight[], options: GeneratePromptOptions = {}): {} [exported]
      /** Filter insights to actionable ones */
    211-229: formatModelSection(model: string, insights: AggregatedInsight[], options: GeneratePromptOptions = {}): string [exported]
      /** Format a model-specific prompt section */
    238-277: generatePromptAdditions(insights: AggregatedInsight[], options: GeneratePromptOptions = {}): {} [exported]
      /** Generate prompt additions for all models with insights */
    284-301: generatePromptAdditionsFromDb(db: Database.Database, options: GeneratePromptOptions = {}): {} [exported]
      /** Generate prompt additions from the database Fetches insights from aggregated_insights table and generates additions. */
    308-331: formatPromptAdditionsDocument(additions: PromptAddition[]): string [exported]
      /** Format a complete prompt additions document Combines all model-specific additions into a single markdown document. */
    339-363: updateInsightPromptTexts(db: Database.Database, additions: PromptAddition[], promptVersion?: string): void [exported]
      /** Generate and store prompt text for insights For each insight that should be included in prompts, generates the appropriate prompt text and updates the database. */
    368-390: getPromptAdditionsForModel(db: Database.Database, model: string, options: GeneratePromptOptions = {}): any [exported]
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

src/storage/bridge-discovery.ts [1-338]
  interface:
    23-32: interface BridgePath [exported]
      /** A discovered path in the graph */
    34-41: interface BridgeDiscoveryOptions [exported]
  function:
    266-296: findBridgePaths(db: Database.Database, seedNodeIds: string[], options: BridgeDiscoveryOptions = {}): {} [exported]
      /** Find interesting multi-hop paths originating from seed nodes. Uses BFS/DFS to traverse outgoing edges, scoring paths based on edge confidence and node relevance. */
  imports:
    - ./edge-repository.js
    - ./node-crud.js
    - ./node-storage.js
    - better-sqlite3

src/storage/database.ts [1-331]
  interface:
    20-36: interface DatabaseOptions [exported]
    38-43: interface MigrationInfo [exported]
  function:
    100-117: openDatabase(options: DatabaseOptions = {}): Database.Database [exported]
      /** Open or create the pi-brain database */
    122-145: loadMigrations(): {} [exported]
      /** Load migrations from the migrations directory */
    150-160: getSchemaVersion(db: Database.Database): number [exported]
      /** Get current schema version */
    166-187: getMigrationSkippedReason(db: Database.Database, version: number): string [exported]
      /** Check if a specific migration was skipped due to missing dependencies. Returns the requirement that caused it to be skipped, or null if not skipped. */
    194-203: parseMigrationRequirements(sql: string): {} [exported]
      /** Parse a migration SQL file for REQUIRES directives. Format: -- REQUIRES: requirement1, requirement2 Returns array of requirements (e.g., ['sqlite-vec']) */
    209-220: checkMigrationRequirements(db: Database.Database, requirements: string[]): string [exported]
      /** Check if migration requirements are satisfied. Returns unsatisfied requirement, or null if all satisfied. */
    225-282: migrate(db: Database.Database): number [exported]
      /** Run pending migrations */
    287-289: closeDatabase(db: Database.Database): void [exported]
      /** Close the database connection */
    294-301: isDatabaseHealthy(db: Database.Database): boolean [exported]
      /** Check if the database is healthy */
    306-314: loadVecExtension(db: Database.Database): boolean [exported]
      /** Load the sqlite-vec extension */
    319-330: isVecLoaded(db: Database.Database): boolean [exported]
      /** Check if sqlite-vec extension is loaded */
  variable:
    15-15: any [exported]
      /** Default pi-brain data directory */
    18-18: any [exported]
      /** Default database path */
  imports:
    - better-sqlite3
    - node:fs
    - node:os
    - node:path
    - node:url
    - sqlite-vec

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

src/storage/edge-repository.ts [1-197]
  interface:
    19-30: interface EdgeRow [exported]
      /** Edge row from the database */
  function:
    39-41: generateEdgeId(): string [exported]
      /** Generate a unique edge ID with 'edg_' prefix */
    50-92: createEdge(db: Database.Database, sourceNodeId: string, targetNodeId: string, type: EdgeType, options: {
    metadata?: EdgeMetadata;
    createdBy?: "boundary" | "daemon" | "user";
    confidence?: number;
    similarity?: number;
  } = {}): Edge [exported]
      /** Create an edge between two nodes */
    97-104: getEdgesFrom(db: Database.Database, nodeId: string): {} [exported]
      /** Get edges from a node (outgoing) */
    109-116: getEdgesTo(db: Database.Database, nodeId: string): {} [exported]
      /** Get edges to a node (incoming) */
    121-128: getNodeEdges(db: Database.Database, nodeId: string): {} [exported]
      /** Get all edges for a node (both directions) */
    133-136: getAllEdges(db: Database.Database): {} [exported]
      /** Get all edges */
    141-144: getEdge(db: Database.Database, edgeId: string): EdgeRow [exported]
      /** Get edge by ID */
    149-152: deleteEdge(db: Database.Database, edgeId: string): boolean [exported]
      /** Delete an edge */
    157-175: edgeExists(db: Database.Database, sourceNodeId: string, targetNodeId: string, type?: EdgeType): boolean [exported]
      /** Check if an edge exists between two nodes */
    184-196: edgeRowToEdge(row: EdgeRow): Edge [exported]
      /** Convert an Edge row from the database to an Edge object */
  imports:
    - ./node-types.js
    - better-sqlite3

src/storage/embedding-utils.ts [1-676]
  interface:
    325-329: interface BackfillEmbeddingProvider [exported]
      /** Embedding provider interface for backfill operations. Matches the EmbeddingProvider interface from facet-discovery.ts. */
    334-339: interface BackfillLogger [exported]
      /** Logger interface for backfill operations. */
    344-355: interface BackfillEmbeddingsOptions [exported]
      /** Options for backfillEmbeddings function. */
    360-371: interface BackfillResult [exported]
      /** Result of a backfill operation. */
  function:
    43-83: buildEmbeddingText(node: Node): string [exported]
      /** Build embedding text from a node for semantic search. Format: ``` [{type}] {summary} Decisions: - {decision.what} (why: {decision.why}) - ... Lessons: - {lesson.summary} - ... ``` This richer format enables semantic search to find nodes by: - What type of work was done - What was accomplished (summary) - What decisions were made and why - What lessons were learned */
    97-109: buildSimpleEmbeddingText(type: string | null, summary: string | null): string [exported]
      /** Build simple embedding text from node summary data. This is a lightweight version for use with partial node data (e.g., NodeSummaryRow from database queries). Returns: - `[type] summary` when both are present - `summary` when only summary is present - `[type]` when only type is present (sparse but valid for type-only filtering) - `` (empty string) when both are null */
    119-121: isRichEmbeddingFormat(inputText: string): boolean [exported]
      /** Check if embedding text uses the rich format (includes decisions/lessons). Used to detect nodes with old-format embeddings that need re-embedding. Detection relies on the version marker [emb:v2]. This avoids strict dependencies on whitespace or formatting of the sections. */
    135-205: storeEmbeddingWithVec(db: Database.Database, nodeId: string, embedding: number[], modelName: string, inputText: string): { rowid: bigint; vecUpdated: boolean; } [exported]
      /** Store an embedding for a node in both node_embeddings and node_embeddings_vec tables. Handles upsert semantics - if an embedding already exists for the node, it will be replaced. The vec table is only updated if sqlite-vec is loaded. Uses a transaction to ensure atomicity - either both tables are updated or neither. */
    210-237: deleteEmbedding(db: Database.Database, nodeId: string): boolean [exported]
      /** Delete an embedding from both node_embeddings and node_embeddings_vec tables. */
    242-275: getEmbedding(db: Database.Database, nodeId: string): { embedding: {}; modelName: string; inputText: string; createdAt: string; } [exported]
      /** Get embedding for a node. */
    280-285: hasEmbedding(db: Database.Database, nodeId: string): boolean [exported]
      /** Check if a node has an embedding stored. */
    296-302: serializeEmbedding(embedding: number[]): Buffer [exported]
      /** Serialize an embedding array to a binary Buffer (Float32 little-endian). This format is used for storing in the node_embeddings table. */
    309-315: deserializeEmbedding(buffer: Buffer): {} [exported]
      /** Deserialize a binary Buffer to an embedding array. Inverse of serializeEmbedding. */
    403-443: findNodesNeedingEmbedding(db: Database.Database, provider: BackfillEmbeddingProvider, options: { limit?: number; force?: boolean } = {}): {} [exported]
      /** Find nodes that need embedding generation or update. A node needs embedding if: 1. No embedding exists for it 2. Embedding uses a different model than the current provider 3. Embedding uses old format (not rich format with decisions/lessons) */
    570-636: async backfillEmbeddings(db: Database.Database, provider: BackfillEmbeddingProvider, readNodeFromPath: (dataFile: string) => Node, options: BackfillEmbeddingsOptions = {}): Promise<BackfillResult> [exported]
      /** Backfill embeddings for nodes that are missing or have outdated embeddings. This function: 1. Finds nodes needing embedding (missing, wrong model, or old format) 2. Loads full node data from JSON files 3. Builds rich embedding text (summary + decisions + lessons) 4. Generates embeddings in batches via the provider 5. Stores in both node_embeddings table and node_embeddings_vec (if available) Errors are handled gracefully: - Individual node failures don't stop the batch - Returns statistics including failed node IDs for retry */
    643-675: countNodesNeedingEmbedding(db: Database.Database, provider: BackfillEmbeddingProvider, options: { force?: boolean } = {}): { total: number; needsEmbedding: number; } [exported]
      /** Count nodes that need embedding backfill. Useful for showing progress or estimating work before running backfill. */
  variable:
    19-19: "[emb:v2]" [exported]
      /** Format version marker appended to rich embedding text. Used to distinguish new-format embeddings (even with empty decisions/lessons) from old simple-format embeddings. */
  imports:
    - ../types/index.js
    - ./database.js
    - better-sqlite3

src/storage/filter-utils.ts [1-272]
  interface:
    17-38: interface BaseFilters [exported]
      /** Base filter fields shared by all filter types */
    41-46: interface ExtendedFilters extends BaseFilters [exported]
      /** Extended filters with additional fields for listNodes */
    49-54: interface WhereClauseResult [exported]
      /** Result of building a WHERE clause */
  function:
    249-271: buildWhereClause(filters: BaseFilters | ExtendedFilters | undefined, tableAlias = "n"): WhereClauseResult [exported]
      /** Build a WHERE clause from filter conditions. Supports filtering by: - project (partial match via LIKE) - exactProject (exact match) - type (exact match) - outcome (exact match) - date range (from/to on timestamp field) - computer (exact match) - hadClearGoal (boolean) - isNewProject (boolean) - sessionFile (exact match) - tags (AND logic - nodes must have ALL specified tags) - topics (AND logic - nodes must have ALL specified topics) */
  imports:
    - ./node-types.js

src/storage/graph-repository.ts [1-412]
  interface:
    31-47: interface ConnectedNodesOptions [exported]
      /** Options for getConnectedNodes */
    50-65: interface TraversalEdge [exported]
      /** An edge with direction information for traversal results */
    68-75: interface ConnectedNodesResult [exported]
      /** Result from getConnectedNodes */
  type:
    28-28: TraversalDirection = "incoming" | "outgoing" | "both" [exported]
      /** Direction for graph traversal */
  function:
    219-271: getConnectedNodes(db: Database.Database, nodeId: string, options: ConnectedNodesOptions = {}): ConnectedNodesResult [exported]
      /** Get all nodes connected to a specific node with graph traversal. Supports: - Multi-hop traversal (depth 1-5) - Direction filtering (incoming, outgoing, both) - Edge type filtering Based on specs/storage.md graph traversal query and specs/api.md GET /api/v1/nodes/:id/connected endpoint. */
    280-317: getSubgraph(db: Database.Database, rootNodeIds: string[], options: ConnectedNodesOptions = {}): ConnectedNodesResult [exported]
      /** Get the subgraph for visualization - returns nodes and edges within a given depth from multiple root nodes. Unlike getConnectedNodes, this INCLUDES the root nodes in the result, which is useful for rendering a graph view starting from selected nodes. */
    325-379: findPath(db: Database.Database, fromNodeId: string, toNodeId: string, options: { maxDepth?: number } = {}): { nodeIds: {}; edges: {}; } [exported]
      /** Get the path between two nodes if one exists. Uses BFS to find the shortest path. Returns null if no path exists. */
    385-395: getAncestors(db: Database.Database, nodeId: string, options: { maxDepth?: number; edgeTypes?: EdgeType[] } = {}): ConnectedNodesResult [exported]
      /** Get all ancestors of a node (nodes that lead TO this node). Follows incoming edges only. */
    401-411: getDescendants(db: Database.Database, nodeId: string, options: { maxDepth?: number; edgeTypes?: EdgeType[] } = {}): ConnectedNodesResult [exported]
      /** Get all descendants of a node (nodes that this node leads TO). Follows outgoing edges only. */
  imports:
    - ./edge-repository.js
    - ./node-crud.js
    - ./node-types.js
    - better-sqlite3

src/storage/hybrid-search.ts [1-732]
  interface:
    28-37: interface HybridWeights [exported]
      /** Type for hybrid search weight keys */
    71-90: interface HybridScoreBreakdown [exported]
      /** Breakdown of scores for transparency and debugging. */
    95-106: interface HybridSearchResult [exported]
      /** Enhanced search result with hybrid scoring. */
    111-128: interface HybridSearchOptions [exported]
      /** Options for hybrid search. */
    133-144: interface HybridSearchResponse [exported]
      /** Result from hybrid search with pagination metadata. */
  function:
    605-676: hybridSearch(db: Database.Database, query: string, options: HybridSearchOptions = {}): HybridSearchResponse [exported]
      /** Perform hybrid search combining vector, FTS, relation, and other signals. The algorithm: 1. If queryEmbedding provided, perform vector search to get initial candidates 2. Perform FTS search to get keyword matches 3. Merge candidates from both sources 4. For each candidate, calculate edge count (relation score) 5. Calculate all score components and weighted final score 6. Sort by final score, apply pagination */
    685-731: calculateNodeHybridScore(db: Database.Database, nodeId: string, query: string, options: HybridSearchOptions = {}): HybridScoreBreakdown [exported]
      /** Calculate hybrid score for a single node (useful for re-ranking). */
  variable:
    44-53: HybridWeights [exported]
      /** Weights for each scoring component. Sum should equal ~1.3 to allow strong signals to boost final score. Final scores are normalized to 0..1 range. */
  imports:
    - ./database.js
    - ./filter-utils.js
    - ./node-crud.js
    - ./search-repository.js
    - ./semantic-search.js
    - better-sqlite3

src/storage/index.ts [1-22]
  imports:
    - ./bridge-discovery.js
    - ./database.js
    - ./edge-repository.js
    - ./embedding-utils.js
    - ./graph-repository.js
    - ./hybrid-search.js
    - ./lesson-repository.js
    - ./node-conversion.js
    - ./node-crud.js
    - ./node-queries.js
    - ./node-storage.js
    - ./node-types.js
    - ./quirk-repository.js
    - ./relationship-edges.js
    - ./search-repository.js
    - ./semantic-search.js
    - ./tool-error-repository.js

src/storage/lesson-repository.ts [1-308]
  interface:
    16-25: interface ListLessonsFilters [exported]
      /** Filters for querying lessons */
    28-33: interface ListLessonsOptions [exported]
      /** Pagination options for lessons */
    36-55: interface ListLessonsResult [exported]
      /** Result from listLessons query */
  type:
    58-68: LessonsByLevelResult = Record<
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
  function:
    156-208: listLessons(db: Database.Database, filters: ListLessonsFilters = {}, options: ListLessonsOptions = {}): ListLessonsResult [exported]
      /** List lessons with filters and pagination. Supports filtering by: - level (exact match) - project (partial match via nodes table) - tags (AND logic via lesson_tags table) - confidence (exact match) Per specs/api.md GET /api/v1/lessons endpoint. */
    216-256: getLessonsByLevel(db: Database.Database, recentLimit = 5): Record<string, { count: number; recent: {}; }> [exported]
      /** Get aggregated lesson stats by level. Returns counts and most recent lessons for each level. Per specs/api.md GET /api/v1/lessons/by-level endpoint. */
    261-267: countLessons(db: Database.Database, filters: ListLessonsFilters = {}): number [exported]
      /** Count lessons matching filters (without fetching data) */
    272-295: getNodeLessons(db: Database.Database, nodeId: string): {} [exported]
      /** Get lessons for a node */
    300-307: getLessonTags(db: Database.Database, lessonId: string): {} [exported]
      /** Get tags for a specific lesson */
  imports:
    - better-sqlite3

src/storage/node-conversion.ts [1-432]
  interface:
    25-44: interface NodeConversionContext [exported]
      /** Context needed to convert AgentNodeOutput to a full Node */
  function:
    54-261: agentOutputToNode(output: AgentNodeOutput, context: NodeConversionContext): Node [exported]
      /** Convert AgentNodeOutput from the analyzer to a full Node structure Fills in source, metadata, and identity fields from the job context */
    416-424: nodeRowToNode(row: NodeRow, loadFull = false): Node [exported]
      /** Transform a NodeRow (flat SQLite row) to Node (nested structure). For listings, constructs Node from row data without reading JSON. For full details, reads the JSON file. */
    429-431: nodeRowsToNodes(rows: NodeRow[], loadFull = false): {} [exported]
      /** Transform array of NodeRows to Nodes */
  imports:
    - ../daemon/processor.js
    - ../daemon/queue.js
    - ./node-crud.js
    - ./node-storage.js
    - ./node-types.js

src/storage/node-crud.ts [1-881]
  interface:
    52-55: interface RepositoryOptions extends NodeStorageOptions [exported]
      /** Options for node repository operations */
    58-91: interface NodeRow [exported]
      /** Node row from the database */
  function:
    100-155: insertLessons(db: Database.Database, nodeId: string, lessonsByLevel: LessonsByLevel): void [exported]
      /** Insert lessons for a node and update lesson_patterns aggregation */
    160-193: insertModelQuirks(db: Database.Database, nodeId: string, quirks: ModelQuirk[]): void [exported]
      /** Insert model quirks for a node and update model_stats aggregation */
    198-262: insertToolErrors(db: Database.Database, nodeId: string, errors: ToolError[]): void [exported]
      /** Insert tool errors for a node and update failure_patterns + model_stats aggregation */
    267-286: insertDaemonDecisions(db: Database.Database, nodeId: string, decisions: DaemonDecision[]): void [exported]
      /** Insert daemon decisions for a node */
    296-325: clearAllData(db: Database.Database): void [exported]
      /** Clear all data from the database (nodes, edges, etc.) Used by rebuild-index CLI */
    477-493: insertNodeToDb(db: Database.Database, node: Node, dataFile: string, options: { skipFts?: boolean } = {}): void [exported]
      /** Insert a node into the database (without writing JSON file) Used by createNode and rebuild-index CLI */
    499-513: createNode(db: Database.Database, node: Node, options: RepositoryOptions = {}): Node [exported]
      /** Create a node - writes to both SQLite and JSON storage Returns the node with any auto-generated fields filled in */
    587-619: upsertNode(db: Database.Database, node: Node, options: RepositoryOptions = {}): { node: Node; created: boolean; } [exported]
      /** Upsert a node - creates if not exists, updates if exists. This provides idempotent ingestion for analysis jobs. If a job crashes after writing JSON but before DB insert, re-running will update the existing data cleanly without duplicates or errors. Returns the node and whether it was created (true) or updated (false). */
    626-657: updateNode(db: Database.Database, node: Node, options: RepositoryOptions = {}): Node [exported]
      /** Update a node - writes new JSON version and updates SQLite row. Throws if the node doesn't exist in the database. Returns the updated node. */
    662-668: getNode(db: Database.Database, nodeId: string): NodeRow [exported]
      /** Get a node by ID (returns the row from SQLite - always the latest version) */
    675-685: getNodeVersion(db: Database.Database, nodeId: string, version: number): NodeRow [exported]
      /** Get a specific version of a node from SQLite. Note: SQLite only stores the current/latest version. For historical versions, use getAllNodeVersions() which reads from JSON storage. */
    690-693: nodeExistsInDb(db: Database.Database, nodeId: string): boolean [exported]
      /** Check if a node exists in the database */
    698-704: getAllNodeVersions(nodeId: string, options: RepositoryOptions = {}): {} [exported]
      /** Get all versions of a node from JSON storage */
    710-716: deleteNode(db: Database.Database, nodeId: string): boolean [exported]
      /** Delete a node and all related data Note: Due to ON DELETE CASCADE, related records are automatically deleted */
    721-733: findNodeByEndEntryId(db: Database.Database, sessionFile: string, entryId: string): NodeRow [exported]
      /** Find a node that contains a specific entry ID as its end boundary */
    738-749: findLastNodeInSession(db: Database.Database, sessionFile: string): NodeRow [exported]
      /** Find the latest node for a given session file */
    754-765: findFirstNodeInSession(db: Database.Database, sessionFile: string): NodeRow [exported]
      /** Find the first node for a given session file */
    774-799: findPreviousProjectNode(db: Database.Database, project: string, beforeTimestamp: string): any [exported]
      /** Find the most recent node for a project before a given timestamp. Used for abandoned restart detection. Returns the full Node from JSON storage (not just the row) to access filesTouched and other content fields. */
    826-864: linkNodeToPredecessors(db: Database.Database, node: Node, context: {
    boundaryType?: string;
  } = {}): {} [exported]
      /** Automatically link a node to its predecessors based on session structure. Creates structural edges based on session continuity and fork relationships. Idempotent: will not create duplicate edges if called multiple times. */
  imports:
    - ./edge-repository.js
    - ./node-storage.js
    - ./node-types.js
    - ./search-repository.js
    - better-sqlite3
    - node:crypto

src/storage/node-queries.ts [1-336]
  interface:
    127-136: interface ListNodesOptions [exported]
      /** Pagination and sorting options */
    139-148: interface ListNodesResult [exported]
      /** Result from listNodes query */
    234-246: interface SessionSummaryRow [exported]
      /** Session summary row from aggregation query */
  type:
    110-118: NodeSortField = | "timestamp"
  | "analyzed_at"
  | "project"
  | "type"
  | "outcome"
  | "tokens_used"
  | "cost"
  | "duration_minutes" [exported]
      /** Valid sort fields for listNodes */
    121-121: SortOrder = "asc" | "desc" [exported]
      /** Sort order */
    124-124: ListNodesFilters = ExtendedFilters [exported]
      /** Filters for querying nodes */
  function:
    23-30: getNodeSummary(db: Database.Database, nodeId: string): string [exported]
      /** Get node summary from FTS index */
    35-39: getNodeTags(db: Database.Database, nodeId: string): {} [exported]
      /** Get tags for a node */
    44-48: getNodeTopics(db: Database.Database, nodeId: string): {} [exported]
      /** Get topics for a node */
    53-63: getAllTags(db: Database.Database): {} [exported]
      /** Get all unique tags in the system */
    68-72: getAllTopics(db: Database.Database): {} [exported]
      /** Get all unique topics in the system */
    77-87: getNodesByTag(db: Database.Database, tag: string): {} [exported]
      /** Find nodes by tag (matches both node tags and lesson tags) */
    92-103: getNodesByTopic(db: Database.Database, topic: string): {} [exported]
      /** Find nodes by topic */
    178-225: listNodes(db: Database.Database, filters: ListNodesFilters = {}, options: ListNodesOptions = {}): ListNodesResult [exported]
      /** List nodes with filters, pagination, and sorting. Supports filtering by: - project (partial match via LIKE) - type (exact match) - outcome (exact match) - date range (from/to on timestamp field) - computer (exact match) - hadClearGoal (boolean) - isNewProject (boolean) - tags (AND logic - nodes must have ALL specified tags) - topics (AND logic - nodes must have ALL specified topics) Per specs/api.md GET /api/v1/nodes endpoint. */
    252-281: getSessionSummaries(db: Database.Database, project: string, options: { limit?: number; offset?: number } = {}): {} [exported]
      /** Get aggregated session summaries for a project. Used for the session browser to avoid loading thousands of nodes. */
    290-298: getAllProjects(db: Database.Database): {} [exported]
      /** Get all unique projects in the system */
    303-311: getAllNodeTypes(db: Database.Database): {} [exported]
      /** Get all unique node types that have been used */
    316-324: getAllComputers(db: Database.Database): {} [exported]
      /** Get all unique computers (source machines) */
    329-335: countNodes(db: Database.Database, filters: ListNodesFilters = {}): number [exported]
      /** Count nodes matching filters (without fetching data) */
  imports:
    - ./filter-utils.js
    - ./node-crud.js
    - better-sqlite3

src/storage/node-storage.ts [1-323]
  interface:
    44-47: interface NodeStorageOptions [exported]
  function:
    53-61: getNodeDir(timestamp: string, nodesDir = DEFAULT_NODES_DIR): string [exported]
      /** Get the directory path for a node based on its timestamp Returns: nodesDir/YYYY/MM */
    67-75: getNodePath(nodeId: string, version: number, timestamp: string, nodesDir = DEFAULT_NODES_DIR): string [exported]
      /** Get the full file path for a node Returns: nodesDir/YYYY/MM/<nodeId>-v<version>.json */
    82-113: writeNode(node: Node, options: NodeStorageOptions = {}): string [exported]
      /** Write a node to JSON file storage */
    118-133: readNode(nodeId: string, version: number, timestamp: string, options: NodeStorageOptions = {}): Node [exported]
      /** Read a node from JSON file storage */
    138-145: readNodeFromPath(filePath: string): Node [exported]
      /** Read a node by file path */
    150-159: nodeExists(nodeId: string, version: number, timestamp: string, options: NodeStorageOptions = {}): boolean [exported]
      /** Check if a node file exists */
    165-206: listNodeFiles(options: NodeStorageOptions = {}): {} [exported]
      /** List all node files in the storage directory Returns array of file paths */
    212-233: listNodeVersions(nodeId: string, options: NodeStorageOptions = {}): {} [exported]
      /** List all versions of a specific node Returns array of { version, path } sorted by version ascending */
    238-248: getLatestNodeVersion(nodeId: string, options: NodeStorageOptions = {}): { version: number; path: string; } [exported]
      /** Get the latest version of a node */
    253-262: readLatestNode(nodeId: string, options: NodeStorageOptions = {}): any [exported]
      /** Read the latest version of a node */
    267-292: parseNodePath(filePath: string): { nodeId: string; version: number; year: string; month: string; } [exported]
      /** Parse a node file path to extract node ID, version, year, and month */
    298-322: createNodeVersion(existingNode: Node, updates: Partial<Node>, options: NodeStorageOptions = {}): Node [exported]
      /** Create a new version of an existing node Copies the node with incremented version and updated previousVersions */
  variable:
    22-22: any [exported]
      /** Default nodes directory */
  imports:
    - ./node-types.js
    - node:fs
    - node:os
    - node:path

src/storage/node-types.ts [1-151]
  type:
    22-34: NodeTypeFilter = | "coding"
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
    37-37: OutcomeFilter = "success" | "partial" | "failed" | "abandoned" [exported]
      /** Outcome filter values */
  function:
    47-49: generateNodeId(): string [exported]
      /** Generate a unique 16-character hex node ID Uses first 16 chars of UUID (64 bits of entropy) */
    51-53: generateLessonId(): string [exported]
    55-57: generateQuirkId(): string [exported]
    59-61: generateErrorId(): string [exported]
    63-65: generateDecisionId(): string [exported]
    81-91: generateDeterministicNodeId(sessionFile: string, segmentStart: string, segmentEnd: string): string [exported]
      /** Generate a deterministic 16-character hex node ID based on session and segment. This ensures idempotent ingestion - re-running the same job produces the same ID. The ID is derived from: - Session file path - Segment start entry ID - Segment end entry ID Uses length-prefix encoding to prevent collisions from inputs containing delimiter characters (e.g., "a:b" + "c" vs "a" + "b:c"). Two jobs with the same inputs will always produce the same node ID. */
    96-98: nodeRef(nodeId: string, version: number): string [exported]
      /** Create a full node reference with version */
    103-112: parseNodeRef(ref: string): { nodeId: string; version: number; } [exported]
      /** Parse a node reference into id and version */
    117-127: emptyLessons(): LessonsByLevel [exported]
      /** Create an empty lessons structure */
    132-140: emptyObservations(): ModelObservations [exported]
      /** Create an empty observations structure */
    145-150: emptyDaemonMeta(): DaemonMeta [exported]
      /** Create an empty daemon meta structure */
  imports:
    - ../types/index.js
    - node:crypto

src/storage/pattern-repository.ts [1-373]
  interface:
    74-78: interface ListFailurePatternsOptions [exported]
    142-146: interface ListLessonPatternsOptions [exported]
    188-197: interface ListInsightsOptions [exported]
  function:
    80-111: listFailurePatterns(db: Database.Database, options: ListFailurePatternsOptions = {}): {} [exported]
    117-136: listModelStats(db: Database.Database): {} [exported]
    148-182: listLessonPatterns(db: Database.Database, options: ListLessonPatternsOptions = {}): {} [exported]
    211-260: listInsights(db: Database.Database, options: ListInsightsOptions = {}): {} [exported]
    262-276: getInsight(db: Database.Database, id: string): any [exported]
    278-302: getInsightsByModel(db: Database.Database, model: string, options: { minConfidence?: number; promptIncludedOnly?: boolean } = {}): {} [exported]
    304-332: countInsights(db: Database.Database, options: { type?: InsightType; model?: string; promptIncluded?: boolean } = {}): number [exported]
    334-351: updateInsightPrompt(db: Database.Database, id: string, promptText: string, promptIncluded: boolean, promptVersion?: string): void [exported]
  imports:
    - ../types/index.js
    - better-sqlite3

src/storage/quirk-repository.ts [1-310]
  interface:
    19-26: interface ListQuirksFilters [exported]
      /** Filters for querying model quirks */
    29-34: interface ListQuirksOptions [exported]
      /** Pagination options for quirks */
    37-46: interface QuirkResult [exported]
      /** A quirk result with metadata */
    49-58: interface ListQuirksResult [exported]
      /** Result from listQuirks query */
    61-71: interface ModelQuirkStats [exported]
      /** Stats for a single model */
  type:
    16-16: QuirkFrequency = "once" | "sometimes" | "often" | "always" [exported]
      /** Frequency values for model quirks */
    74-74: QuirksByModelResult = Record<string, ModelQuirkStats> [exported]
      /** Result from getQuirksByModel */
  function:
    102-162: listQuirks(db: Database.Database, filters: ListQuirksFilters = {}, options: ListQuirksOptions = {}): ListQuirksResult [exported]
      /** List model quirks with filters and pagination. Supports filtering by: - model (exact match) - frequency (minimum frequency ranking) - project (partial match via nodes table) Per specs/api.md GET /api/v1/quirks endpoint. */
    170-208: getQuirksByModel(db: Database.Database, recentLimit = 5): Record<string, ModelQuirkStats> [exported]
      /** Get aggregated quirk stats by model. Returns counts and most recent quirks for each model that has quirks. Per specs/api.md GET /api/v1/stats/models endpoint (quirkCount field). */
    213-219: countQuirks(db: Database.Database, filters: ListQuirksFilters = {}): number [exported]
      /** Count quirks matching filters (without fetching data) */
    224-231: getAllQuirkModels(db: Database.Database): {} [exported]
      /** Get all unique models that have quirks recorded */
    239-281: getAggregatedQuirks(db: Database.Database, options: { minOccurrences?: number; limit?: number } = {}): {} [exported]
      /** Get aggregated quirks - similar observations grouped together. Useful for the dashboard "Model Quirks" panel. Per specs/storage.md "Find model quirks by frequency" query. */
    286-309: getNodeQuirks(db: Database.Database, nodeId: string): {} [exported]
      /** Get model quirks for a node */
  imports:
    - better-sqlite3

src/storage/relationship-edges.ts [1-290]
  interface:
    28-37: interface StoreRelationshipsResult [exported]
      /** Result of storing relationships for a node */
    49-56: interface UnresolvedRelationship [exported]
      /** Result type for unresolved relationships */
  function:
    65-67: isAutoMemEdgeType(type: string): boolean [exported]
      /** Check if a type is a valid AutoMem edge type */
    72-105: validateRelationship(relationship: RelationshipOutput): { valid: true; } | { valid: false; error: string; } [exported]
      /** Validate a relationship output from the analyzer */
    118-185: storeRelationshipEdges(db: Database.Database, sourceNodeId: string, relationships: RelationshipOutput[]): StoreRelationshipsResult [exported]
      /** Store relationships extracted by the analyzer as edges For resolved relationships (with targetNodeId), creates an edge directly. For unresolved relationships (targetNodeId is null), stores the description in metadata for potential future resolution via semantic search. */
    194-234: findUnresolvedRelationships(db: Database.Database, nodeId?: string): {} [exported]
      /** Find unresolved relationships (edges with unresolvedTarget in metadata) These are relationships where the analyzer identified a connection but couldn't determine the target node ID. They can be resolved later via semantic search. */
    242-289: resolveRelationship(db: Database.Database, edgeId: string, resolvedTargetNodeId: string): boolean [exported]
      /** Resolve an unresolved relationship by updating its target node Call this after semantic search finds a matching node for an unresolved relationship. */
  imports:
    - ../daemon/processor.js
    - ../types/index.js
    - ./edge-repository.js
    - better-sqlite3

src/storage/search-repository.ts [1-485]
  interface:
    41-46: interface SearchHighlight [exported]
      /** Highlight match for search results */
    49-56: interface SearchResult [exported]
      /** Enhanced search result with score and highlights */
    59-68: interface SearchOptions [exported]
      /** Options for enhanced search */
    71-80: interface SearchNodesResult [exported]
      /** Result from enhanced search with pagination metadata */
  type:
    21-26: SearchField = | "summary"
  | "decisions"
  | "lessons"
  | "tags"
  | "topics" [exported]
      /** Fields that can be searched in the FTS index */
    38-38: SearchFilters = BaseFilters [exported]
      /** Filters for search queries (subset of node filters relevant to search) */
  function:
    89-117: indexNodeForSearch(db: Database.Database, node: Node): void [exported]
      /** Index a node for full-text search */
    127-153: searchNodes(db: Database.Database, query: string, limit = 20): {} [exported]
      /** Search nodes using full-text search Quotes the query to handle special characters like hyphens */
    286-310: extractSnippet(text: string, query: string, maxLength = 100): string [exported]
      /** Extract a highlight snippet from text containing a match */
    394-454: searchNodesAdvanced(db: Database.Database, query: string, options: SearchOptions = {}): SearchNodesResult [exported]
      /** Enhanced search with scores, highlights, and filter support */
    459-484: countSearchResults(db: Database.Database, query: string, options: Pick<SearchOptions, "fields" | "filters"> = {}): number [exported]
      /** Count total search results (without fetching data) */
  imports:
    - ./filter-utils.js
    - ./node-crud.js
    - ./node-types.js
    - better-sqlite3

src/storage/semantic-search.ts [1-214]
  interface:
    25-28: interface SemanticSearchResult extends SearchResult [exported]
    30-39: interface SemanticSearchOptions [exported]
  function:
    55-156: semanticSearch(db: Database.Database, queryEmbedding: number[], options: SemanticSearchOptions = {}): {} [exported]
      /** Perform semantic search using vector similarity. Finds nodes with embeddings close to the query embedding. */
    166-179: getNodeEmbeddingVector(db: Database.Database, nodeId: string): {} [exported]
      /** Get the embedding vector for a node from the database. Useful for finding "related nodes" (node-to-node similarity). */
    189-213: findSimilarNodes(db: Database.Database, nodeId: string, options: SemanticSearchOptions = {}): {} [exported]
      /** Find nodes similar to a given node. Wraps semanticSearch using the node's own embedding. */
  imports:
    - ./database.js
    - ./embedding-utils.js
    - ./filter-utils.js
    - ./node-crud.js
    - ./search-repository.js
    - better-sqlite3

src/storage/tool-error-repository.ts [1-374]
  interface:
    16-25: interface ListToolErrorsFilters [exported]
      /** Filters for querying tool errors */
    28-33: interface ListToolErrorsOptions [exported]
      /** Pagination options for tool errors */
    36-45: interface ToolErrorResult [exported]
      /** A tool error result with metadata */
    48-57: interface ListToolErrorsResult [exported]
      /** Result from listToolErrors query */
    60-64: interface ToolStats [exported]
      /** Stats by tool from getToolErrorStats */
    67-70: interface ModelErrorStats [exported]
      /** Stats by model from getToolErrorStats */
    73-77: interface ToolErrorTrends [exported]
      /** Trend data from getToolErrorStats */
    80-84: interface ToolErrorStatsResult [exported]
      /** Result from getToolErrorStats */
    87-94: interface AggregatedToolError [exported]
      /** Aggregated tool error result */
    97-103: interface NodeToolError [exported]
      /** A single tool error for a node */
  function:
    176-213: listToolErrors(db: Database.Database, filters: ListToolErrorsFilters = {}, options: ListToolErrorsOptions = {}): ListToolErrorsResult [exported]
      /** List individual tool errors with filters and pagination. */
    219-274: getAggregatedToolErrors(db: Database.Database, filters: ListToolErrorsFilters = {}, options: { limit?: number; offset?: number; groupByModel?: boolean } = {}): {} [exported]
      /** Get aggregated tool errors - grouped by tool and error type (and optionally model). Per specs/api.md GET /api/v1/tool-errors. */
    280-334: getToolErrorStats(db: Database.Database): ToolErrorStatsResult [exported]
      /** Get tool error statistics for the dashboard. Per specs/api.md GET /api/v1/stats/tool-errors. */
    339-345: countToolErrors(db: Database.Database, filters: ListToolErrorsFilters = {}): number [exported]
      /** Count tool errors matching filters. */
    350-357: getAllToolsWithErrors(db: Database.Database): {} [exported]
      /** Get all unique tools that have errors recorded */
    362-373: getNodeToolErrors(db: Database.Database, nodeId: string): {} [exported]
      /** Get tool errors for a node */
  imports:
    - better-sqlite3

src/sync/index.ts [1-9]
  imports:
    - ./rsync.js
    - ./status.js

src/sync/rsync.ts [1-409]
  interface:
    20-28: interface RsyncResult [exported]
      /** Result of an rsync operation */
    33-44: interface RsyncOptions [exported]
      /** Options for running rsync */
  function:
    274-325: async runRsync(spoke: SpokeConfig, options: RsyncOptions = {}): Promise<RsyncResult> [exported]
      /** Run rsync for a spoke with rsync sync method */
    330-341: formatBytes(bytes: number): string [exported]
      /** Format bytes to human-readable string */
    349-357: async isRsyncAvailable(): Promise<boolean> [exported]
      /** Check if rsync is available on the system Uses `rsync --version` instead of `which` for cross-platform compatibility (works on Windows, Linux, macOS). Gracefully handles ENOENT. */
    362-373: countSpokeSessionFiles(spokePath: string): number [exported]
      /** Count session files in a spoke's sync directory */
    378-392: listSpokeSessions(spokePath: string): {} [exported]
      /** Get list of session files from a spoke's sync directory */
    397-408: getLastSyncTime(spokePath: string): any [exported]
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

src/types/index.ts [1-730]
  interface:
    12-40: interface Node [exported]
      /** Shared type definitions for pi-brain This file contains pure type definitions (no runtime code) shared between the daemon/storage backend and the web frontend. */
    42-59: interface NodeSource [exported]
    76-88: interface NodeClassification [exported]
    92-96: interface Decision [exported]
    98-102: interface ErrorSummary [exported]
    104-115: interface NodeContent [exported]
    132-143: interface Lesson [exported]
    145-153: interface LessonsByLevel [exported]
    159-167: interface ModelUsage [exported]
    171-178: interface ModelQuirk [exported]
    180-186: interface ToolError [exported]
    188-196: interface ModelObservations [exported]
    202-230: interface NodeMetadata [exported]
    232-241: interface SemanticData [exported]
    243-250: interface DaemonDecision [exported]
    252-262: interface DaemonMeta [exported]
    299-314: interface EdgeMetadata [exported]
    316-329: interface Edge [exported]
    362-369: interface NodeVersion [exported]
    375-385: interface AggregatedFailurePattern [exported]
    387-396: interface AggregatedModelStats [exported]
    398-407: interface AggregatedLessonPattern [exported]
    416-443: interface AggregatedInsight [exported]
    449-460: interface PromptAddition [exported]
    469-474: interface DateRange [exported]
      /** Date range for measuring effectiveness before/after prompt addition */
    479-497: interface EffectivenessResult [exported]
      /** Result of measuring prompt effectiveness for a single insight */
    502-538: interface PromptEffectiveness [exported]
      /** Full effectiveness measurement record stored in database */
    547-554: interface ManualFlag [exported]
      /** Manual flag recorded by user via /brain --flag command */
    559-574: interface FrictionSignals [exported]
      /** Friction signals detected in a session segment */
    579-588: interface DelightSignals [exported]
      /** Delight signals detected in a session segment */
    593-597: interface NodeSignals [exported]
      /** Combined signals for a node */
    616-638: interface Cluster [exported]
      /** A discovered cluster from facet discovery */
    643-650: interface ClusterNode [exported]
      /** Node membership in a cluster */
    655-665: interface NodeEmbedding [exported]
      /** Cached embedding for a node */
    670-683: interface ClusteringRun [exported]
      /** Record of a clustering run */
    688-699: interface EmbeddingConfig [exported]
      /** Configuration for the embedding provider */
    704-715: interface ClusteringConfig [exported]
      /** Configuration for clustering algorithm */
    720-723: interface FacetDiscoveryResult [exported]
      /** Result of facet discovery pipeline */
  type:
    61-74: NodeType = | "coding"
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
    90-90: Outcome = "success" | "partial" | "failed" | "abandoned" [exported]
    121-128: LessonLevel = | "project"
  | "task"
  | "user"
  | "model"
  | "tool"
  | "skill"
  | "subagent" [exported]
    130-130: Confidence = "high" | "medium" | "low" [exported]
    169-169: Frequency = "once" | "sometimes" | "often" | "always" [exported]
    268-295: EdgeType = | "fork"
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
    297-297: EdgeCreator = "boundary" | "daemon" | "user" [exported]
    349-349: AutoMemEdgeType = (typeof AUTOMEM_EDGE_TYPES)[number] [exported]
    355-360: VersionTrigger = | "initial"
  | "prompt_update"
  | "connection_found"
  | "user_feedback"
  | "schema_migration" [exported]
    413-413: InsightType = "quirk" | "win" | "failure" | "tool_error" | "lesson" [exported]
    414-414: InsightSeverity = "low" | "medium" | "high" [exported]
    606-606: ClusterStatus = "pending" | "confirmed" | "dismissed" [exported]
      /** Cluster status for user feedback */
    611-611: ClusterSignalType = "friction" | "delight" | null [exported]
      /** Signal type a cluster relates to */
  variable:
    335-347: AUTOMEM_EDGE_TYPES [exported]
      /** AutoMem typed relationship edge types (per automem-features.md) These enable semantic reasoning ("why" queries, causal chains) */
  imports:
    - ./session.js

src/types/session.ts [1-298]
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

src/web/app/playwright.config.ts [1-27]
  imports:
    - @playwright/test

src/web/app/src/app.d.ts [1-12]

src/web/app/src/lib/api/client.ts [1-748]
  function:
    68-77: createApiError(options: ApiErrorOptions): Error [exported]
    79-83: createTimeoutError(timeoutMs: number): Error [exported]
    85-89: createNetworkError(message: string): Error [exported]
    91-100: createContentTypeError(status: number, contentType: string): Error [exported]
    102-106: isApiError(error: unknown): boolean [exported]
    108-110: isTimeoutError(error: unknown): boolean [exported]
    112-114: isNetworkError(error: unknown): boolean [exported]
    116-120: isContentTypeError(error: unknown): boolean [exported]
    126-130: isBackendOffline(error: unknown): boolean [exported]
      /** Check if an error indicates the backend is unreachable (network error, timeout, or non-JSON response like 404 HTML page) */
    135-152: getErrorMessage(error: unknown): string [exported]
      /** Get a user-friendly message for API errors */
  variable:
    232-734: api [exported]
  imports:
    - $lib/types

src/web/app/src/lib/index.ts [1-18]
  imports:
    - ./api/client
    - ./stores/daemon
    - ./stores/nodes
    - ./stores/toast
    - ./stores/websocket
    - ./types

src/web/app/src/lib/stores/daemon.ts [1-132]
  variable:
    131-131: daemonStore [exported]
  imports:
    - $lib/api/client
    - $lib/types
    - svelte/store

src/web/app/src/lib/stores/keyboard-shortcuts.ts [1-204]
  variable:
    203-203: keyboardShortcuts [exported]
  imports:
    - $app/navigation
    - svelte/store

src/web/app/src/lib/stores/nodes.ts [1-112]
  variable:
    105-105: nodesStore [exported]
    108-111: any [exported]
  imports:
    - $lib/api/client
    - $lib/types
    - svelte/store

src/web/app/src/lib/stores/search-history.ts [1-106]
  variable:
    105-105: any [exported]
  imports:
    - svelte/store

src/web/app/src/lib/stores/theme.ts [1-180]
  type:
    10-10: Theme = "light" | "dark" | "system" [exported]
  function:
    93-121: initTheme(): () => void [exported]
    140-157: applyTheme(theme: "light" | "dark"): void [exported]
    160-179: toggleTheme(): void [exported]
  variable:
    81-81: themePreference [exported]
    82-82: { subscribe: any; set: any; } [exported]
    86-90: any [exported]
  imports:
    - svelte/store

src/web/app/src/lib/stores/toast.ts [1-114]
  interface:
    9-15: interface Toast [exported]
  type:
    7-7: ToastType = "success" | "error" | "warning" | "info" [exported]
  variable:
    110-110: toastStore [exported]
    113-113: any [exported]
  imports:
    - svelte/store

src/web/app/src/lib/stores/websocket.ts [1-179]
  variable:
    178-178: wsStore [exported]
  imports:
    - ./daemon
    - ./nodes
    - svelte/store

src/web/app/src/lib/types.ts [1-381]
  interface:
    78-84: interface LessonEntity extends Omit<Lesson, "tags"> [exported]
    86-91: interface ModelQuirkEntity extends ModelQuirk [exported]
    93-98: interface ToolErrorEntity extends ToolError [exported]
    101-106: interface ListNodesResponse [exported]
    108-116: interface SearchResult [exported]
    118-182: interface DashboardStats [exported]
    185-202: interface RunningJob [exported]
      /** Running job details for real-time monitoring */
    204-226: interface DaemonStatus [exported]
    230-239: interface DaemonDecisionEntity [exported]
    242-251: interface NodeFilters [exported]
    254-259: interface ProjectSummary [exported]
    261-275: interface SessionSummary [exported]
    278-283: interface ClusterNodeWithDetails extends ClusterNode [exported]
    285-287: interface ClusterWithNodes extends Cluster [exported]
    289-292: interface ClusterFeedResponse [exported]
    294-299: interface ClusterListResponse [exported]
    302-318: interface AbandonedRestartPattern [exported]
    320-326: interface AbandonedRestartsResponse [exported]
    328-341: interface FrictionSummary [exported]
    346-351: interface RsyncOptions [exported]
    353-361: interface SpokeConfig [exported]
    363-371: interface SpokeCreateRequest [exported]
    373-380: interface SpokeUpdateRequest [exported]
  type:
    344-344: SyncMethod = "syncthing" | "rsync" | "api" [exported]
  imports:
    - ../../../../types/index.js

src/web/app/src/lib/utils/date.ts [1-131]
  function:
    73-88: formatDistanceToNow(date: Date): string [exported]
      /** Format a date as a relative distance from now e.g., "5 minutes ago", "2 hours ago", "3 days ago" */
    93-102: formatDate(date: Date): string [exported]
      /** Format a date as "MMM D, YYYY at h:mm AM/PM" */
    107-113: formatDateShort(date: Date): string [exported]
      /** Format a date as "MMM D, YYYY" */
    118-123: formatDateForInput(date: Date): string [exported]
      /** Format a date as "YYYY-MM-DD" for input[type="date"] */
    128-130: parseDate(date: string | Date): Date [exported]
      /** Parse a date string or Date object to Date */

src/web/app/src/lib/utils/focus-trap.ts [1-146]
  function:
    47-121: createFocusTrap(container: HTMLElement, options: {
    /** Called when Escape key is pressed */
    onEscape?: () => void;
    /** Element to restore focus to when trap is removed */
    restoreFocus?: HTMLElement | null;
    /** Whether to focus the first element on activation (default: true) */
    autoFocus?: boolean;
  } = {}): () => void [exported]
      /** Creates a focus trap for a container element. */
    127-145: focusTrap(node: HTMLElement, options: Parameters<typeof createFocusTrap>[1] = {}): { destroy: () => void; update: (newOptions: Parameters<typeof createFocusTrap>) => void; } [exported]
      /** Svelte action for focus trapping. Use as `use:focusTrap={{ onEscape: () => ... }}` */

src/web/app/vite.config.ts [1-15]
  imports:
    - @sveltejs/kit/vite
    - vite

src/web/generator.ts [1-972]
  function:
    194-264: generateHTML(sessions: SessionInfo[], forks: ForkRelationship[]): string [exported]
      /** Generate complete visualization HTML */
  imports:
    - ../parser/analyzer.js
    - ../types/index.js

src/web/index.ts [1-6]
  imports:
    - ./generator.js

---
Files: 103
Estimated tokens: 29,532 (codebase: ~1,376,061)
