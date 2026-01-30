# Project Overview

## Languages
- typescript: 42 files

## Statistics
- Total files: 42
- Total symbols: 202
  - function: 120
  - interface: 48
  - variable: 16
  - class: 10
  - type: 8

---

src/daemon/cli.test.ts [1-90]
  imports:
    - ./cli.js
    - node:fs
    - vitest

src/daemon/cli.ts [1-1340]
  interface:
    117-123: interface DaemonStatus [exported]
      /** Daemon status info */
    126-131: interface QueueStatus [exported]
      /** Queue status info */
      refs out: 4 [type: 4]
        - src/daemon/cli.ts:127: type QueueStats -> src/daemon/queue.ts
        - src/daemon/cli.ts:128: type AnalysisJob -> src/daemon/types.ts
        - src/daemon/cli.ts:129: type AnalysisJob -> src/daemon/types.ts
        - src/daemon/cli.ts:130: type AnalysisJob -> src/daemon/types.ts
    134-139: interface HealthCheckResult [exported]
      /** Health check result */
    142-146: interface HealthStatus [exported]
      /** Overall health status */
      refs out: 1 [type: 1]
        - src/daemon/cli.ts:145: type HealthCheckResult -> src/daemon/cli.ts
    149-152: interface OutputOptions [exported]
      /** CLI output options */
    279-283: interface StartOptions [exported]
      /** Start options */
    286-289: interface StopOptions [exported]
      /** Stop options */
  function:
    64-73: isPortAvailable(port: number): Promise<boolean> [exported]
      /** Check if a port is available */
      refs out: 8 [call: 6, instantiate: 1, type: 1]
        - src/daemon/cli.ts:64: type Promise -> external
        - src/daemon/cli.ts:65: instantiate Promise -> external
        - src/daemon/cli.ts:67: call Server.once -> external
        - src/daemon/cli.ts:67: call resolve -> src/daemon/cli.ts
        - src/daemon/cli.ts:68: call Server.once -> external
        - src/daemon/cli.ts:69: call Server.close -> external
        - src/daemon/cli.ts:69: call resolve -> src/daemon/cli.ts
        - src/daemon/cli.ts:71: call Server.listen -> external
    78-91: findProcessOnPort(port: number): number [exported]
      /** Find process using a port (Linux/macOS) */
      refs out: 1 [call: 1]
        - src/daemon/cli.ts:87: call isNaN -> external
    161-172: readPidFile(): number [exported]
      /** Read the daemon PID from the PID file */
      refs out: 2 [call: 2]
        - src/daemon/cli.ts:163: call existsSync -> external
        - src/daemon/cli.ts:168: call isNaN -> external
    177-183: writePidFile(pid: number): void [exported]
      /** Write the daemon PID to the PID file */
      refs out: 4 [call: 4]
        - src/daemon/cli.ts:179: call existsSync -> external
        - src/daemon/cli.ts:180: call mkdirSync -> external
        - src/daemon/cli.ts:182: call writeFileSync -> external
        - src/daemon/cli.ts:182: call String -> external
    188-196: removePidFile(): void [exported]
      /** Remove the PID file */
      refs out: 2 [call: 2]
        - src/daemon/cli.ts:190: call existsSync -> external
        - src/daemon/cli.ts:191: call unlinkSync -> external
    201-209: isProcessRunning(pid: number): boolean [exported]
      /** Check if a process with the given PID is running */
      refs out: 1 [call: 1]
        - src/daemon/cli.ts:204: call kill -> external
    214-227: isDaemonRunning(): { running: boolean; pid: number; } [exported]
      /** Check if the daemon is currently running */
      refs out: 2 [call: 2]
        - src/daemon/cli.ts:220: call isProcessRunning -> src/daemon/cli.ts
        - src/daemon/cli.ts:225: call removePidFile -> src/daemon/cli.ts
    236-257: formatUptime(seconds: number): string [exported]
      /** Format uptime in a human-readable way */
      refs out: 5 [call: 5]
        - src/daemon/cli.ts:238: call floor -> external
        - src/daemon/cli.ts:247: call push -> external
        - src/daemon/cli.ts:250: call push -> external
        - src/daemon/cli.ts:253: call push -> external
        - src/daemon/cli.ts:256: call join -> external
    262-272: getProcessUptime(): number [exported]
      /** Get process uptime (approximate based on PID file modification time) */
      refs out: 2 [call: 2]
        - src/daemon/cli.ts:264: call existsSync -> external
        - src/daemon/cli.ts:268: call now -> external
    487-517: async startDaemon(options: StartOptions = {}): Promise<DaemonResult> [exported]
      /** Start the daemon process */
      refs out: 5 [call: 2, type: 3]
        - src/daemon/cli.ts:488: type StartOptions -> src/daemon/cli.ts
        - src/daemon/cli.ts:489: type Promise -> external
        - src/daemon/cli.ts:489: type DaemonResult -> src/daemon/cli.ts
        - src/daemon/cli.ts:508: call writePidFile -> src/daemon/cli.ts
        - src/daemon/cli.ts:516: call spawnBackgroundDaemon -> src/daemon/cli.ts
    556-591: async stopDaemon(options: StopOptions = {}): Promise<{ success: boolean; message: string; }> [exported]
      /** Stop the daemon process */
      refs out: 7 [call: 4, type: 3]
        - src/daemon/cli.ts:556: type StopOptions -> src/daemon/cli.ts
        - src/daemon/cli.ts:556: type Promise -> external
        - src/daemon/cli.ts:571: call kill -> external
        - src/daemon/cli.ts:573: call handleKillError -> src/daemon/cli.ts
        - src/daemon/cli.ts:573: type ErrnoException -> external
        - src/daemon/cli.ts:577: call removePidFile -> src/daemon/cli.ts
        - src/daemon/cli.ts:583: call removePidFile -> src/daemon/cli.ts
    596-608: getDaemonStatus(configPath?: string): DaemonStatus [exported]
      /** Get daemon status information */
      refs out: 2 [call: 1, type: 1]
        - src/daemon/cli.ts:596: type DaemonStatus -> src/daemon/cli.ts
        - src/daemon/cli.ts:606: call join -> external
    617-646: getQueueStatus(configPath?: string): QueueStatus [exported]
      /** Get queue status information */
      refs out: 5 [call: 4, type: 1]
        - src/daemon/cli.ts:617: type QueueStatus -> src/daemon/cli.ts
        - src/daemon/cli.ts:622: call existsSync -> external
        - src/daemon/cli.ts:639: call migrate -> src/storage/database.ts
        - src/daemon/cli.ts:642: call getQueueStatusSummary -> src/daemon/queue.ts
        - src/daemon/cli.ts:644: call close -> external
    651-704: queueAnalysis(sessionPath: string, configPath?: string): { success: boolean; message: string; jobId?: string; } [exported]
      /** Queue a session for analysis */
      refs out: 5 [call: 5]
        - src/daemon/cli.ts:657: call existsSync -> external
        - src/daemon/cli.ts:664: call endsWith -> external
        - src/daemon/cli.ts:676: call migrate -> src/storage/database.ts
        - src/daemon/cli.ts:681: call QueueManager.hasExistingJob -> src/daemon/queue.ts
        - src/daemon/cli.ts:702: call close -> external
    924-954: async runHealthChecks(configPath?: string): Promise<HealthStatus> [exported]
      /** Run all health checks */
      refs out: 2 [type: 2]
        - src/daemon/cli.ts:926: type Promise -> external
        - src/daemon/cli.ts:926: type HealthStatus -> src/daemon/cli.ts
    963-984: formatDaemonStatus(status: DaemonStatus, _options: OutputOptions = {}): string [exported]
      /** Format daemon status for display */
      refs out: 6 [call: 4, type: 2]
        - src/daemon/cli.ts:964: type DaemonStatus -> src/daemon/cli.ts
        - src/daemon/cli.ts:965: type OutputOptions -> src/daemon/cli.ts
        - src/daemon/cli.ts:974: call push -> external
        - src/daemon/cli.ts:978: call push -> external
        - src/daemon/cli.ts:981: call push -> external
        - src/daemon/cli.ts:983: call join -> external
    1035-1069: formatQueueStatus(queueStatus: QueueStatus, _options: OutputOptions = {}): string [exported]
      /** Format queue status for display */
      refs out: 8 [call: 6, type: 2]
        - src/daemon/cli.ts:1036: type QueueStatus -> src/daemon/cli.ts
        - src/daemon/cli.ts:1037: type OutputOptions -> src/daemon/cli.ts
        - src/daemon/cli.ts:1048: call push -> external
        - src/daemon/cli.ts:1048: call toFixed -> external
        - src/daemon/cli.ts:1051: call appendJobSection -> src/daemon/cli.ts
        - src/daemon/cli.ts:1052: call appendJobSection -> src/daemon/cli.ts
        - src/daemon/cli.ts:1060: call appendJobSection -> src/daemon/cli.ts
        - src/daemon/cli.ts:1068: call join -> external
    1084-1107: formatHealthStatus(status: HealthStatus, _options: OutputOptions = {}): string [exported]
      /** Format health check results for display */
      refs out: 7 [call: 5, type: 2]
        - src/daemon/cli.ts:1085: type HealthStatus -> src/daemon/cli.ts
        - src/daemon/cli.ts:1086: type OutputOptions -> src/daemon/cli.ts
        - src/daemon/cli.ts:1092: call push -> external
        - src/daemon/cli.ts:1095: call push -> external
        - src/daemon/cli.ts:1101: call push -> external
        - src/daemon/cli.ts:1103: call push -> external
        - src/daemon/cli.ts:1106: call join -> external
    1122-1242: rebuildIndex(configPath?: string): { success: boolean; message: string; count: number; } [exported]
      /** Rebuild the SQLite index from JSON files */
      refs out: 17 [call: 16, type: 1]
        - src/daemon/cli.ts:1142: call migrate -> src/storage/database.ts
        - src/daemon/cli.ts:1145: call log -> external
        - src/daemon/cli.ts:1161: call set -> external
        - src/daemon/cli.ts:1165: call log -> external
        - src/daemon/cli.ts:1168: call log -> external
        - src/daemon/cli.ts:1170: call clearAllData -> src/storage/node-crud.ts
        - src/daemon/cli.ts:1173: call log -> external
        - src/daemon/cli.ts:1192: call processInsertBatch -> src/daemon/cli.ts
        - src/daemon/cli.ts:1193: call Socket.write -> external
        - src/daemon/cli.ts:1197: call log -> external
    1247-1329: async rebuildEmbeddings(configPath?: string, options: { force?: boolean } = {}): Promise<{ success: boolean; message: string; count: number; }> [exported]
      /** Rebuild embeddings for all nodes */
      refs out: 12 [call: 10, type: 2]
        - src/daemon/cli.ts:1250: type Promise -> external
        - src/daemon/cli.ts:1271: call migrate -> src/storage/database.ts
        - src/daemon/cli.ts:1290: call log -> external
        - src/daemon/cli.ts:1291: call log -> external
        - src/daemon/cli.ts:1303: call log -> external
        - src/daemon/cli.ts:1304: call log -> external
        - src/daemon/cli.ts:1305: call log -> external
        - src/daemon/cli.ts:1308: call log -> external
        - src/daemon/cli.ts:1310: call join -> external
        - src/daemon/cli.ts:1310: call slice -> external
  variable:
    111-111: any [exported]
      /** PID file location */
      refs out: 1 [call: 1]
        - src/daemon/cli.ts:111: call join -> external
    114-114: any [exported]
      /** Log file location */
      refs out: 1 [call: 1]
        - src/daemon/cli.ts:114: call join -> external
  imports:
    - ../config/config.js
    - ../config/types.js
    - ../storage/database.js
    - ../storage/embedding-utils.js
    - ../storage/node-crud.js
    - ../storage/node-storage.js
    - ../utils/fs-async.js
    - ./facet-discovery.js
    - ./processor.js
    - ./queue.js
    - node:child_process
    - node:fs
    - node:fs/promises
    - node:net
    - node:path

src/daemon/connection-discovery.test.ts [1-446]
  imports:
    - ../storage/edge-repository.js
    - ./connection-discovery.js
    - better-sqlite3
    - vitest

src/daemon/connection-discovery.ts [1-628]
  class:
    158-627: class ConnectionDiscoverer [exported]
      /** Discovers semantic connections between nodes in the knowledge graph. Uses keyword/tag similarity, explicit references, and lesson reinforcement patterns to find related nodes. Does not use LLM - relies on FTS and Jaccard similarity for performance. */
  interface:
    137-142: interface ConnectionResult [exported]
      refs out: 1 [type: 1]
        - src/daemon/connection-discovery.ts:141: type Edge -> src/types/index.ts
  imports:
    - ../storage/edge-repository.js
    - ../storage/node-crud.js
    - ../storage/node-queries.js
    - ../types/index.js
    - better-sqlite3

src/daemon/daemon-process.ts [1-341]
  imports:
    - ../api/server.js
    - ../config/config.js
    - ../storage/database.js
    - ../utils/logger.js
    - ./cli.js
    - ./consolidation/index.js
    - ./queue.js
    - ./scheduler.js
    - ./watcher-events.js
    - ./watcher.js
    - ./worker.js
    - node:path

src/daemon/errors.test.ts [1-493]
  imports:
    - ./errors.js
    - vitest

src/daemon/errors.ts [1-457]
  interface:
    15-24: interface RetryPolicy [exported]
      /** Retry policy configuration */
    55-66: interface ClassifiedError [exported]
      /** Classified error with metadata */
      refs out: 2 [type: 2]
        - src/daemon/errors.ts:57: type Error -> external
        - src/daemon/errors.ts:59: type ErrorCategory -> src/daemon/errors.ts
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
      refs out: 6 [call: 3, type: 3]
        - src/daemon/errors.ts:252: type Error -> external
        - src/daemon/errors.ts:253: type JobContext -> src/daemon/types.ts
        - src/daemon/errors.ts:254: type ErrorCategory -> src/daemon/errors.ts
        - src/daemon/errors.ts:260: call test -> external
        - src/daemon/errors.ts:261: call category -> src/daemon/errors.ts
        - src/daemon/errors.ts:271: call slice -> external
    278-308: classifyErrorWithContext(error: Error, retryCount: number, maxRetries: number, policy: RetryPolicy = DEFAULT_RETRY_POLICY): ClassifiedError [exported]
      /** Classify an error with full context */
      refs out: 4 [call: 1, type: 3]
        - src/daemon/errors.ts:279: type Error -> external
        - src/daemon/errors.ts:282: type RetryPolicy -> src/daemon/errors.ts
        - src/daemon/errors.ts:283: type ClassifiedError -> src/daemon/errors.ts
        - src/daemon/errors.ts:306: call formatErrorDescription -> src/daemon/errors.ts
    317-324: calculateRetryDelay(retryCount: number, policy: RetryPolicy = DEFAULT_RETRY_POLICY): number [exported]
      /** Calculate retry delay with exponential backoff */
      refs out: 2 [call: 1, type: 1]
        - src/daemon/errors.ts:319: type RetryPolicy -> src/daemon/errors.ts
        - src/daemon/errors.ts:323: call min -> external
    329-334: calculateRetryDelayMinutes(retryCount: number, policy: RetryPolicy = DEFAULT_RETRY_POLICY): number [exported]
      /** Calculate retry delay in minutes (for queue integration) */
      refs out: 3 [call: 2, type: 1]
        - src/daemon/errors.ts:331: type RetryPolicy -> src/daemon/errors.ts
        - src/daemon/errors.ts:333: call ceil -> external
        - src/daemon/errors.ts:333: call calculateRetryDelay -> src/daemon/errors.ts
    356-370: formatErrorForStorage(error: Error, category?: ErrorCategory): string [exported]
      /** Format error for storage in database */
      refs out: 5 [call: 3, type: 2]
        - src/daemon/errors.ts:357: type Error -> external
        - src/daemon/errors.ts:358: type ErrorCategory -> src/daemon/errors.ts
        - src/daemon/errors.ts:363: call stringify -> external
        - src/daemon/errors.ts:367: call slice -> external
        - src/daemon/errors.ts:368: call slice -> external
    375-393: parseStoredError(stored: string): { timestamp: string; type: ErrorCategoryType; reason: string; message: string; stack?: string; } [exported]
      /** Parse stored error back to object */
      refs out: 3 [call: 1, type: 2]
        - src/daemon/errors.ts:377: type ErrorCategoryType -> src/daemon/errors.ts
        - src/daemon/errors.ts:383: call parse -> external
        - src/daemon/errors.ts:385: type ErrorCategoryType -> src/daemon/errors.ts
    402-404: isRetryableError(error: Error): boolean [exported]
      /** Check if an error is retryable */
      refs out: 2 [call: 1, type: 1]
        - src/daemon/errors.ts:402: type Error -> external
        - src/daemon/errors.ts:403: call classifyError -> src/daemon/errors.ts
    409-411: isPermanentError(error: Error): boolean [exported]
      /** Check if an error is permanent */
      refs out: 2 [call: 1, type: 1]
        - src/daemon/errors.ts:409: type Error -> external
        - src/daemon/errors.ts:410: call classifyError -> src/daemon/errors.ts
    416-426: createTypedError(message: string, type: ErrorCategoryType): Error [exported]
      /** Create a typed error with a specific category */
      refs out: 3 [instantiate: 1, type: 2]
        - src/daemon/errors.ts:418: type ErrorCategoryType -> src/daemon/errors.ts
        - src/daemon/errors.ts:419: type Error -> external
        - src/daemon/errors.ts:425: instantiate Error -> external
    433-435: createFileNotFoundError(path: string): Error [exported]
      /** Create a "file not found" error */
      refs out: 2 [instantiate: 1, type: 1]
        - src/daemon/errors.ts:433: type Error -> external
        - src/daemon/errors.ts:434: instantiate Error -> external
    438-440: createInvalidSessionError(reason: string): Error [exported]
      /** Create a "session invalid" error */
      refs out: 2 [instantiate: 1, type: 1]
        - src/daemon/errors.ts:438: type Error -> external
        - src/daemon/errors.ts:439: instantiate Error -> external
    443-445: createTimeoutError(durationMinutes: number): Error [exported]
      /** Create a "timeout" error */
      refs out: 2 [instantiate: 1, type: 1]
        - src/daemon/errors.ts:443: type Error -> external
        - src/daemon/errors.ts:444: instantiate Error -> external
    448-451: createRateLimitError(retryAfter?: number): Error [exported]
      /** Create a "rate limit" error */
      refs out: 2 [instantiate: 1, type: 1]
        - src/daemon/errors.ts:448: type Error -> external
        - src/daemon/errors.ts:450: instantiate Error -> external
    454-456: createValidationError(details: string): Error [exported]
      /** Create a "validation" error */
      refs out: 2 [instantiate: 1, type: 1]
        - src/daemon/errors.ts:454: type Error -> external
        - src/daemon/errors.ts:455: instantiate Error -> external
  variable:
    73-78: RetryPolicy [exported]
      /** Default retry policy */
      refs out: 1 [type: 1]
        - src/daemon/errors.ts:73: type RetryPolicy -> src/daemon/errors.ts
  imports:
    - ./queue.js

src/daemon/export.ts [1-176]
  function:
    18-31: getSegmentEntries(entries: SessionEntry[], startId: string, endId: string): {} [exported]
      /** Extract entries within a segment range */
      refs out: 3 [call: 1, type: 2]
        - src/daemon/export.ts:19: type SessionEntry -> src/types/session.ts
        - src/daemon/export.ts:22: type SessionEntry -> src/types/session.ts
        - src/daemon/export.ts:30: call slice -> external
    122-175: async exportFineTuneData(outputPath: string, configPath?: string): Promise<{ success: boolean; message: string; count: number; }> [exported]
      /** Export fine-tuning data to JSONL Format: { "input": <JSON string of segment entries>, "output": <JSON string of node analysis> } */
      refs out: 10 [call: 7, instantiate: 1, type: 2]
        - src/daemon/export.ts:125: type Promise -> external
        - src/daemon/export.ts:130: call fileExists -> src/utils/fs-async.ts
        - src/daemon/export.ts:142: call log -> external
        - src/daemon/export.ts:146: call processNodeFile -> src/daemon/export.ts
        - src/daemon/export.ts:149: call Socket.write -> external
        - src/daemon/export.ts:156: call Writable.end -> external
        - src/daemon/export.ts:157: instantiate Promise -> external
        - src/daemon/export.ts:158: call WriteStream.on -> external
        - src/daemon/export.ts:161: call log -> external
        - src/daemon/export.ts:171: type Error -> external
  imports:
    - ../config/index.js
    - ../parser/session.js
    - ../storage/node-storage.js
    - ../types/index.js
    - ../utils/fs-async.js
    - node:fs
    - node:path

src/daemon/facet-discovery.test.ts [1-913]
  imports:
    - ../storage/database.js
    - ../storage/embedding-utils.js
    - ./facet-discovery.js
    - better-sqlite3
    - node:fs
    - node:os
    - node:path
    - vitest

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
      refs out: 1 [type: 1]
        - src/daemon/facet-discovery.ts:130: type ClusterAnalysisResult -> src/daemon/facet-discovery.ts
    140-144: interface EmbeddingProvider [exported]
      /** Interface for embedding providers */
      refs out: 1 [type: 1]
        - src/daemon/facet-discovery.ts:141: type Promise -> external
    755-759: interface FacetDiscoveryLogger [exported]
  function:
    162-198: createEmbeddingProvider(config: EmbeddingConfig): EmbeddingProvider [exported]
      /** Create an embedding provider from config */
      refs out: 7 [call: 3, instantiate: 3, type: 1]
        - src/daemon/facet-discovery.ts:164: type EmbeddingProvider -> src/daemon/facet-discovery.ts
        - src/daemon/facet-discovery.ts:167: call createOllamaProvider -> src/daemon/facet-discovery.ts
        - src/daemon/facet-discovery.ts:174: instantiate Error -> external
        - src/daemon/facet-discovery.ts:176: call createOpenAIProvider -> src/daemon/facet-discovery.ts
        - src/daemon/facet-discovery.ts:185: instantiate Error -> external
        - src/daemon/facet-discovery.ts:187: call createOpenRouterProvider -> src/daemon/facet-discovery.ts
        - src/daemon/facet-discovery.ts:195: instantiate Error -> external
    331-355: createMockEmbeddingProvider(dims = 384): EmbeddingProvider [exported]
      /** Create mock embedding provider for testing only. Not exposed in EmbeddingConfig - use createMockEmbeddingProvider() directly in tests. */
      refs out: 1 [type: 1]
        - src/daemon/facet-discovery.ts:331: type EmbeddingProvider -> src/daemon/facet-discovery.ts
    473-500: kMeansClustering(embeddings: number[][], k: number, maxIterations = 100): KMeansResult [exported]
      /** Simple K-means++ clustering implementation */
      refs out: 3 [call: 2, type: 1]
        - src/daemon/facet-discovery.ts:477: type KMeansResult -> src/daemon/facet-discovery.ts
        - src/daemon/facet-discovery.ts:484: call map -> external
        - src/daemon/facet-discovery.ts:485: call map -> external
    543-562: hdbscanClustering(embeddings: number[][], minClusterSize = 3, minSamples = 3): {} [exported]
      /** HDBSCAN-like density-based clustering (simplified) */
      refs out: 2 [call: 2]
        - src/daemon/facet-discovery.ts:549: call fill -> external
        - src/daemon/facet-discovery.ts:549: call from -> external
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
      refs out: 4 [call: 3, type: 1]
        - src/daemon/graph-export.ts:28: type GraphExportOptions -> src/daemon/graph-export.ts
        - src/daemon/graph-export.ts:33: call migrate -> src/storage/database.ts
        - src/daemon/graph-export.ts:83: call writeFileSync -> external
        - src/daemon/graph-export.ts:90: call close -> external
  imports:
    - ../config/index.js
    - ../storage/database.js
    - ../storage/edge-repository.js
    - ../storage/node-crud.js
    - ../storage/node-queries.js
    - node:fs
    - node:path

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

src/daemon/insight-aggregation.test.ts [1-559]
  imports:
    - ../types/index.js
    - ./insight-aggregation.js
    - better-sqlite3
    - node:crypto
    - node:fs
    - node:os
    - node:path
    - vitest

src/daemon/insight-aggregation.ts [1-632]
  class:
    153-631: class InsightAggregator [exported]
  imports:
    - ../storage/node-storage.js
    - ../types/index.js
    - ../utils/logger.js
    - better-sqlite3
    - node:crypto

src/daemon/pattern-aggregation.test.ts [1-407]
  imports:
    - ./pattern-aggregation.js
    - better-sqlite3
    - vitest

src/daemon/pattern-aggregation.ts [1-331]
  class:
    22-330: class PatternAggregator [exported]
  imports:
    - better-sqlite3
    - node:crypto

src/daemon/processor.test.ts [1-733]
  imports:
    - ./processor.js
    - ./queue.js
    - node:fs/promises
    - node:os
    - node:path
    - vitest

src/daemon/processor.ts [1-744]
  class:
    682-736: class JobProcessor [exported]
      /** Job processor that invokes pi agents for analysis */
  interface:
    25-38: interface AgentResult [exported]
      /** Result from invoking the pi agent */
      refs out: 1 [type: 1]
        - src/daemon/processor.ts:31: type AgentNodeOutput -> src/daemon/types.ts
    41-45: interface SkillInfo [exported]
      /** Skill availability information */
    48-53: interface ProcessorLogger [exported]
      /** Logger interface for processor */
    126-133: interface EnvironmentValidationResult [exported]
      /** Result of environment validation */
    672-677: interface ProcessorConfig [exported]
      /** Processor configuration */
      refs out: 2 [type: 2]
        - src/daemon/processor.ts:674: type DaemonConfig -> src/config/types.ts
        - src/daemon/processor.ts:676: type ProcessorLogger -> src/daemon/processor.ts
  function:
    90-98: async checkSkillAvailable(skillName: string): Promise<boolean> [exported]
      /** Check if a skill is available by looking for SKILL.md */
      refs out: 2 [call: 1, type: 1]
        - src/daemon/processor.ts:90: type Promise -> external
        - src/daemon/processor.ts:93: call access -> external
    103-123: async getSkillAvailability(): Promise<Map<string, SkillInfo>> [exported]
      /** Get availability information for all skills */
      refs out: 4 [call: 1, type: 3]
        - src/daemon/processor.ts:103: type Promise -> external
        - src/daemon/processor.ts:103: type Map -> external
        - src/daemon/processor.ts:103: type SkillInfo -> src/daemon/processor.ts
        - src/daemon/processor.ts:115: call set -> external
    139-151: async validateRequiredSkills(): Promise<EnvironmentValidationResult> [exported]
      /** Validate that all required skills are available Returns validation result instead of throwing */
      refs out: 2 [type: 2]
        - src/daemon/processor.ts:139: type Promise -> external
        - src/daemon/processor.ts:139: type EnvironmentValidationResult -> src/daemon/processor.ts
    186-200: async buildSkillsArg(sessionFile?: string): Promise<string> [exported]
      /** Build the skills argument for pi invocation Returns comma-separated list of available skills RLM skill is only included for files larger than RLM_SIZE_THRESHOLD to avoid confusing smaller models with RLM instructions. */
      refs out: 4 [call: 3, type: 1]
        - src/daemon/processor.ts:186: type Promise -> external
        - src/daemon/processor.ts:195: call get -> external
        - src/daemon/processor.ts:196: call push -> external
        - src/daemon/processor.ts:199: call join -> external
    209-241: buildAnalysisPrompt(job: AnalysisJob): string [exported]
      /** Build the analysis prompt for a job */
      refs out: 10 [call: 9, type: 1]
        - src/daemon/processor.ts:209: type AnalysisJob -> src/daemon/types.ts
        - src/daemon/processor.ts:217: call push -> external
        - src/daemon/processor.ts:221: call push -> external
        - src/daemon/processor.ts:223: call push -> external
        - src/daemon/processor.ts:229: call push -> external
        - src/daemon/processor.ts:230: call push -> external
        - src/daemon/processor.ts:231: call push -> external
        - src/daemon/processor.ts:235: call push -> external
        - src/daemon/processor.ts:236: call push -> external
        - src/daemon/processor.ts:240: call join -> external
    274-382: async invokeAgent(job: AnalysisJob, config: DaemonConfig, logger: ProcessorLogger = consoleLogger): Promise<AgentResult> [exported]
      /** Invoke the pi agent to analyze a session */
      refs out: 13 [call: 8, type: 5]
        - src/daemon/processor.ts:275: type AnalysisJob -> src/daemon/types.ts
        - src/daemon/processor.ts:276: type DaemonConfig -> src/config/types.ts
        - src/daemon/processor.ts:277: type ProcessorLogger -> src/daemon/processor.ts
        - src/daemon/processor.ts:278: type Promise -> external
        - src/daemon/processor.ts:278: type AgentResult -> src/daemon/processor.ts
        - src/daemon/processor.ts:283: call access -> external
        - src/daemon/processor.ts:290: call now -> external
        - src/daemon/processor.ts:296: call access -> external
        - src/daemon/processor.ts:303: call now -> external
        - src/daemon/processor.ts:331: call debug -> src/daemon/processor.ts
    488-557: parseAgentOutput(stdout: string, logger: ProcessorLogger = consoleLogger): Omit<AgentResult, "exitCode" | "durationMs"> [exported]
      /** Parse the pi agent's JSON mode output */
      refs out: 9 [call: 5, type: 4]
        - src/daemon/processor.ts:490: type ProcessorLogger -> src/daemon/processor.ts
        - src/daemon/processor.ts:491: type Omit -> external
        - src/daemon/processor.ts:491: type AgentResult -> src/daemon/processor.ts
        - src/daemon/processor.ts:497: call trim -> external
        - src/daemon/processor.ts:501: call push -> external
        - src/daemon/processor.ts:501: call parse -> external
        - src/daemon/processor.ts:501: type PiJsonEvent -> src/daemon/processor.ts
        - src/daemon/processor.ts:504: call debug -> src/daemon/processor.ts
        - src/daemon/processor.ts:504: call slice -> external
    563-596: extractNodeFromText(text: string, logger: ProcessorLogger = consoleLogger): any [exported]
      /** Extract node JSON from text content Handles both raw JSON and code-fenced JSON */
      refs out: 8 [call: 6, type: 2]
        - src/daemon/processor.ts:565: type ProcessorLogger -> src/daemon/processor.ts
        - src/daemon/processor.ts:566: type AgentNodeOutput -> src/daemon/types.ts
        - src/daemon/processor.ts:572: call isValidNodeOutput -> src/daemon/processor.ts
        - src/daemon/processor.ts:575: call warn -> src/daemon/processor.ts
        - src/daemon/processor.ts:577: call warn -> src/daemon/processor.ts
        - src/daemon/processor.ts:586: call isValidNodeOutput -> src/daemon/processor.ts
        - src/daemon/processor.ts:589: call warn -> src/daemon/processor.ts
        - src/daemon/processor.ts:591: call warn -> src/daemon/processor.ts
    650-665: isValidNodeOutput(obj: unknown): boolean [exported]
      /** Basic validation that output matches expected schema */
      refs out: 5 [call: 4, type: 1]
        - src/daemon/processor.ts:650: type AgentNodeOutput -> src/daemon/types.ts
        - src/daemon/processor.ts:651: call isObject -> src/daemon/processor.ts
        - src/daemon/processor.ts:657: call hasRequiredObjectFields -> src/daemon/processor.ts
        - src/daemon/processor.ts:664: call hasValidClassification -> src/daemon/processor.ts
        - src/daemon/processor.ts:664: call hasValidContent -> src/daemon/processor.ts
    741-743: createProcessor(config: ProcessorConfig): JobProcessor [exported]
      /** Create a job processor */
      refs out: 3 [instantiate: 1, type: 2]
        - src/daemon/processor.ts:741: type ProcessorConfig -> src/daemon/processor.ts
        - src/daemon/processor.ts:741: type JobProcessor -> src/daemon/processor.ts
        - src/daemon/processor.ts:742: instantiate JobProcessor -> src/daemon/processor.ts
  variable:
    57-62: ProcessorLogger [exported]
      refs out: 5 [call: 4, type: 1]
        - src/daemon/processor.ts:57: type ProcessorLogger -> src/daemon/processor.ts
        - src/daemon/processor.ts:58: call debug -> src/utils/logger.ts
        - src/daemon/processor.ts:59: call info -> src/utils/logger.ts
        - src/daemon/processor.ts:60: call warn -> src/utils/logger.ts
        - src/daemon/processor.ts:61: call error -> src/utils/logger.ts
    69-69: readonly [] [exported]
      /** Required skills for analysis - must be available */
      refs out: 1 [type: 1]
        - src/daemon/processor.ts:69: type const -> external
    72-72: readonly ["codemap"] [exported]
      /** Optional skills - enhance analysis but not required */
      refs out: 1 [type: 1]
        - src/daemon/processor.ts:72: type const -> external
    75-75: readonly ["rlm"] [exported]
      /** Skills that are conditionally included based on file size */
      refs out: 1 [type: 1]
        - src/daemon/processor.ts:75: type const -> external
    78-78: number [exported]
      /** File size threshold (in bytes) for including RLM skill */
    81-81: any [exported]
      /** Skills directory location */
      refs out: 2 [call: 2]
        - src/daemon/processor.ts:81: call join -> external
        - src/daemon/processor.ts:81: call homedir -> external
  imports:
    - ../config/types.js
    - ../utils/logger.js
    - ./queue.js
    - ./types.js
    - node:child_process
    - node:fs/promises
    - node:os
    - node:path

src/daemon/query-processor.test.ts [1-403]
  imports:
    - ../config/types.js
    - ../storage/bridge-discovery.js
    - ../storage/hybrid-search.js
    - ../storage/node-queries.js
    - ./facet-discovery.js
    - ./query-processor.js
    - better-sqlite3
    - node:child_process
    - vitest

src/daemon/query-processor.ts [1-926]
  interface:
    38-52: interface QueryRequest [exported]
      /** Query request from the API */
    55-73: interface QueryResponse [exported]
      /** Query response to return to the client */
    98-111: interface QueryProcessorConfig [exported]
      refs out: 4 [type: 4]
        - src/daemon/query-processor.ts:100: type Database -> external
        - src/daemon/query-processor.ts:102: type DaemonConfig -> src/config/types.ts
        - src/daemon/query-processor.ts:104: type ProcessorLogger -> src/daemon/processor.ts
        - src/daemon/query-processor.ts:108: type EmbeddingProvider -> src/daemon/facet-discovery.ts
  function:
    116-176: async processQuery(request: QueryRequest, config: QueryProcessorConfig): Promise<QueryResponse> [exported]
      /** Process a natural language query against the knowledge graph */
      refs out: 13 [call: 9, type: 4]
        - src/daemon/query-processor.ts:117: type QueryRequest -> src/daemon/query-processor.ts
        - src/daemon/query-processor.ts:118: type QueryProcessorConfig -> src/daemon/query-processor.ts
        - src/daemon/query-processor.ts:119: type Promise -> external
        - src/daemon/query-processor.ts:119: type QueryResponse -> src/daemon/query-processor.ts
        - src/daemon/query-processor.ts:123: call info -> src/daemon/processor.ts
        - src/daemon/query-processor.ts:123: call slice -> external
        - src/daemon/query-processor.ts:134: call info -> src/daemon/processor.ts
        - src/daemon/query-processor.ts:137: call buildNoResultsResponse -> src/daemon/query-processor.ts
        - src/daemon/query-processor.ts:163: call error -> src/daemon/processor.ts
        - src/daemon/query-processor.ts:164: call buildFailedQueryResponse -> src/daemon/query-processor.ts
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

src/daemon/queue.test.ts [1-837]
  imports:
    - ../storage/database.js
    - ./queue.js
    - better-sqlite3
    - node:fs
    - node:os
    - node:path
    - vitest

src/daemon/queue.ts [1-746]
  class:
    90-701: class QueueManager [exported]
      /** Manages the analysis job queue Thread-safe queue operations backed by SQLite with optimistic locking. */
  interface:
    41-54: interface QueueStats [exported]
      /** Queue statistics */
  function:
    712-714: generateJobId(): string [exported]
      /** Generate a unique job ID Uses the same format as node IDs: 16-char hex string */
      refs out: 3 [call: 3]
        - src/daemon/queue.ts:713: call slice -> external
        - src/daemon/queue.ts:713: call replaceAll -> external
        - src/daemon/queue.ts:713: call randomUUID -> external
    719-721: createQueueManager(db: Database.Database): QueueManager [exported]
      /** Create a queue manager from a database */
      refs out: 3 [instantiate: 1, type: 2]
        - src/daemon/queue.ts:719: type Database -> external
        - src/daemon/queue.ts:719: type QueueManager -> src/daemon/queue.ts
        - src/daemon/queue.ts:720: instantiate QueueManager -> src/daemon/queue.ts
    727-745: getQueueStatusSummary(db: Database.Database): { stats: QueueStats; pendingJobs: {}; runningJobs: {}; recentFailed: {}; } [exported]
      /** Get aggregated queue status Used by CLI and API */
      refs out: 5 [type: 5]
        - src/daemon/queue.ts:727: type Database -> external
        - src/daemon/queue.ts:728: type QueueStats -> src/daemon/queue.ts
        - src/daemon/queue.ts:729: type AnalysisJob -> src/daemon/types.ts
        - src/daemon/queue.ts:730: type AnalysisJob -> src/daemon/types.ts
        - src/daemon/queue.ts:731: type AnalysisJob -> src/daemon/types.ts
  variable:
    27-38: PRIORITY [exported]
      /** Priority levels (lower = higher priority) */
      refs out: 1 [type: 1]
        - src/daemon/queue.ts:38: type const -> external
  imports:
    - ./types.js
    - better-sqlite3

src/daemon/scheduler.test.ts [1-961]
  imports:
    - ./queue.js
    - ./scheduler.js
    - better-sqlite3
    - vitest

src/daemon/scheduler.ts [1-947]
  class:
    165-873: class Scheduler [exported]
      /** Scheduler manages cron-based scheduled jobs */
  interface:
    60-67: interface ScheduledJobResult [exported]
      /** Result of a scheduled job execution */
      refs out: 3 [type: 3]
        - src/daemon/scheduler.ts:61: type ScheduledJobType -> src/daemon/scheduler.ts
        - src/daemon/scheduler.ts:62: type Date -> external
        - src/daemon/scheduler.ts:63: type Date -> external
    70-75: interface SchedulerLogger [exported]
      /** Logger interface for scheduler */
    97-148: interface SchedulerConfig [exported]
      /** Scheduler configuration */
    151-160: interface SchedulerStatus [exported]
      /** Scheduler state */
      refs out: 4 [type: 4]
        - src/daemon/scheduler.ts:154: type ScheduledJobType -> src/daemon/scheduler.ts
        - src/daemon/scheduler.ts:156: type Date -> external
        - src/daemon/scheduler.ts:157: type Date -> external
        - src/daemon/scheduler.ts:158: type ScheduledJobResult -> src/daemon/scheduler.ts
  type:
    52-57: ScheduledJobType = | "reanalysis"
  | "connection_discovery"
  | "pattern_aggregation"
  | "clustering"
  | "backfill_embeddings" [exported]
      /** Job types that can be scheduled */
  function:
    878-908: createScheduler(config: DaemonConfig, queue: QueueManager, db: Database.Database, logger?: SchedulerLogger): Scheduler [exported]
      /** Create a scheduler from daemon config */
      refs out: 6 [instantiate: 1, type: 5]
        - src/daemon/scheduler.ts:879: type DaemonConfig -> src/config/types.ts
        - src/daemon/scheduler.ts:880: type QueueManager -> src/daemon/queue.ts
        - src/daemon/scheduler.ts:881: type Database -> external
        - src/daemon/scheduler.ts:882: type SchedulerLogger -> src/daemon/scheduler.ts
        - src/daemon/scheduler.ts:883: type Scheduler -> src/daemon/scheduler.ts
        - src/daemon/scheduler.ts:884: instantiate Scheduler -> src/daemon/scheduler.ts
    914-924: isValidCronExpression(expression: string): boolean [exported]
      /** Validate a cron expression Returns true if valid, false otherwise */
      refs out: 1 [call: 1]
        - src/daemon/scheduler.ts:919: call Cron.stop -> external
    929-946: getNextRunTimes(expression: string, count = 5): {} [exported]
      /** Get the next N run times for a cron expression */
      refs out: 4 [call: 3, type: 1]
        - src/daemon/scheduler.ts:929: type Date -> external
        - src/daemon/scheduler.ts:937: call push -> external
        - src/daemon/scheduler.ts:938: call Cron.nextRun -> external
        - src/daemon/scheduler.ts:941: call Cron.stop -> external
  variable:
    79-84: SchedulerLogger [exported]
      /** Default no-op logger */
      refs out: 1 [type: 1]
        - src/daemon/scheduler.ts:79: type SchedulerLogger -> src/daemon/scheduler.ts
    89-94: SchedulerLogger [exported]
      refs out: 5 [call: 4, type: 1]
        - src/daemon/scheduler.ts:89: type SchedulerLogger -> src/daemon/scheduler.ts
        - src/daemon/scheduler.ts:90: call info -> src/utils/logger.ts
        - src/daemon/scheduler.ts:91: call warn -> src/utils/logger.ts
        - src/daemon/scheduler.ts:92: call error -> src/utils/logger.ts
        - src/daemon/scheduler.ts:93: call debug -> src/utils/logger.ts
  imports:
    - ../config/types.js
    - ../prompt/effectiveness.js
    - ../prompt/prompt.js
    - ../storage/embedding-utils.js
    - ../storage/node-storage.js
    - ../utils/logger.js
    - ./facet-discovery.js
    - ./insight-aggregation.js
    - ./pattern-aggregation.js
    - ./queue.js
    - better-sqlite3
    - croner

src/daemon/semantic-search.integration.test.ts [1-338]
  imports:
    - ../config/types.js
    - ../storage/database.js
    - ../storage/embedding-utils.js
    - ../storage/node-crud.js
    - ../types/index.js
    - ./facet-discovery.js
    - ./query-processor.js
    - better-sqlite3
    - node:fs
    - node:os
    - node:path
    - vitest

src/daemon/types.ts [1-204]
  interface:
    19-32: interface JobContext [exported]
      /** Additional context for analysis jobs */
    35-70: interface AnalysisJob [exported]
      /** Analysis job structure */
      refs out: 3 [type: 3]
        - src/daemon/types.ts:39: type JobType -> src/daemon/types.ts
        - src/daemon/types.ts:49: type JobContext -> src/daemon/types.ts
        - src/daemon/types.ts:51: type JobStatus -> src/daemon/types.ts
    88-110: interface RelationshipOutput [exported]
      /** Output schema for relationships extracted by the session analyzer */
    113-194: interface AgentNodeOutput [exported]
      /** Output schema from the session analyzer (matches session-analyzer.md) */
      refs out: 8 [type: 8]
        - src/daemon/types.ts:139: type LessonOutput -> src/daemon/types.ts
        - src/daemon/types.ts:140: type LessonOutput -> src/daemon/types.ts
        - src/daemon/types.ts:141: type LessonOutput -> src/daemon/types.ts
        - src/daemon/types.ts:142: type LessonOutput -> src/daemon/types.ts
        - src/daemon/types.ts:143: type LessonOutput -> src/daemon/types.ts
        - src/daemon/types.ts:144: type LessonOutput -> src/daemon/types.ts
        - src/daemon/types.ts:145: type LessonOutput -> src/daemon/types.ts
        - src/daemon/types.ts:193: type RelationshipOutput -> src/daemon/types.ts
  type:
    13-13: JobType = "initial" | "reanalysis" | "connection_discovery" [exported]
      /** Daemon Types - Shared types for the daemon layer This module provides types that need to be shared across the daemon layer and to other layers (storage, etc.) without creating circular dependencies. Job type determines analysis behavior */
    16-16: JobStatus = "pending" | "running" | "completed" | "failed" [exported]
      /** Job status tracks progress through the queue */
    73-81: JobInput = Omit<
  AnalysisJob,
  "id" | "status" | "queuedAt" | "retryCount" | "maxRetries" | "priority"
> & {
  /** Priority (defaults to PRIORITY.INITIAL) */
  priority?: number;
  /** Override default max re... [exported]
      /** Job creation input (id, status, queuedAt are auto-generated) */
      refs out: 2 [type: 2]
        - src/daemon/types.ts:73: type Omit -> external
        - src/daemon/types.ts:74: type AnalysisJob -> src/daemon/types.ts

src/daemon/watcher-events.ts [1-117]
  interface:
    8-11: interface SessionEventDetail [exported]
      /** Event types for the SessionWatcher Event detail for session events */
    16-19: interface ErrorEventDetail [exported]
      /** Event detail for error events */
      refs out: 1 [type: 1]
        - src/daemon/watcher-events.ts:18: type Error -> external
  type:
    42-43: SessionEventName = (typeof SESSION_EVENTS)[keyof typeof SESSION_EVENTS] [exported]
      /** Type for session event names */
  function:
    48-55: createSessionEvent(type: string, sessionPath: string): CustomEvent<SessionEventDetail> [exported]
      /** Create a session event */
      refs out: 4 [instantiate: 1, type: 3]
        - src/daemon/watcher-events.ts:51: type CustomEvent -> external
        - src/daemon/watcher-events.ts:51: type SessionEventDetail -> src/daemon/watcher-events.ts
        - src/daemon/watcher-events.ts:52: instantiate CustomEvent -> external
        - src/daemon/watcher-events.ts:52: type SessionEventDetail -> src/daemon/watcher-events.ts
    60-64: createErrorEvent(error: Error): CustomEvent<ErrorEventDetail> [exported]
      /** Create an error event */
      refs out: 5 [instantiate: 1, type: 4]
        - src/daemon/watcher-events.ts:60: type Error -> external
        - src/daemon/watcher-events.ts:60: type CustomEvent -> external
        - src/daemon/watcher-events.ts:60: type ErrorEventDetail -> src/daemon/watcher-events.ts
        - src/daemon/watcher-events.ts:61: instantiate CustomEvent -> external
        - src/daemon/watcher-events.ts:61: type ErrorEventDetail -> src/daemon/watcher-events.ts
    69-71: createReadyEvent(): Event [exported]
      /** Create a ready event */
      refs out: 2 [instantiate: 1, type: 1]
        - src/daemon/watcher-events.ts:69: type Event -> external
        - src/daemon/watcher-events.ts:70: instantiate Event -> external
    76-84: isSessionEvent(event: Event): boolean [exported]
      /** Type guard to check if an event is a session event */
      refs out: 5 [type: 5]
        - src/daemon/watcher-events.ts:77: type Event -> external
        - src/daemon/watcher-events.ts:78: type CustomEvent -> external
        - src/daemon/watcher-events.ts:78: type SessionEventDetail -> src/daemon/watcher-events.ts
        - src/daemon/watcher-events.ts:81: type CustomEvent -> external
        - src/daemon/watcher-events.ts:81: type SessionEventDetail -> src/daemon/watcher-events.ts
    89-96: isErrorEvent(event: Event): boolean [exported]
      /** Type guard to check if an event is an error event */
      refs out: 5 [type: 5]
        - src/daemon/watcher-events.ts:90: type Event -> external
        - src/daemon/watcher-events.ts:91: type CustomEvent -> external
        - src/daemon/watcher-events.ts:91: type ErrorEventDetail -> src/daemon/watcher-events.ts
        - src/daemon/watcher-events.ts:94: type CustomEvent -> external
        - src/daemon/watcher-events.ts:94: type ErrorEventDetail -> src/daemon/watcher-events.ts
    101-106: getSessionPath(event: Event): string [exported]
      /** Helper to get session path from a session event */
      refs out: 2 [call: 1, type: 1]
        - src/daemon/watcher-events.ts:101: type Event -> external
        - src/daemon/watcher-events.ts:102: call isSessionEvent -> src/daemon/watcher-events.ts
    111-116: getEventError(event: Event): any [exported]
      /** Helper to get error from an error event */
      refs out: 3 [call: 1, type: 2]
        - src/daemon/watcher-events.ts:111: type Event -> external
        - src/daemon/watcher-events.ts:111: type Error -> external
        - src/daemon/watcher-events.ts:112: call isErrorEvent -> src/daemon/watcher-events.ts
  variable:
    24-37: SESSION_EVENTS [exported]
      /** Session event names */
      refs out: 1 [type: 1]
        - src/daemon/watcher-events.ts:37: type const -> external

src/daemon/watcher.test.ts [1-830]
  imports:
    - ../config/types.js
    - ./index.js
    - node:fs/promises
    - node:os
    - node:path
    - vitest

src/daemon/watcher.ts [1-582]
  class:
    83-541: class SessionWatcher extends EventTarget [exported]
      /** Session file watcher Monitors directories for .jsonl session files, tracks their state, and emits events when sessions are ready for analysis. Uses EventTarget for cross-platform compatibility. */
      refs out: 1 [extends: 1]
        - src/daemon/watcher.ts:83: extends EventTarget -> external
  interface:
    27-42: interface SessionState [exported]
      /** State tracking for a single session file */
      refs out: 1 [type: 1]
        - src/daemon/watcher.ts:38: type ReturnType -> external
    47-62: interface WatcherConfig [exported]
      /** Watcher configuration options */
  function:
    546-550: createWatcher(daemonConfig: DaemonConfig): SessionWatcher [exported]
      /** Create a watcher from daemon config */
      refs out: 3 [instantiate: 1, type: 2]
        - src/daemon/watcher.ts:546: type DaemonConfig -> src/config/types.ts
        - src/daemon/watcher.ts:546: type SessionWatcher -> src/daemon/watcher.ts
        - src/daemon/watcher.ts:547: instantiate SessionWatcher -> src/daemon/watcher.ts
    555-557: isSessionFile(filePath: string): boolean [exported]
      /** Check if a path is a valid session file */
      refs out: 1 [call: 1]
        - src/daemon/watcher.ts:556: call endsWith -> external
    562-564: getSessionName(sessionPath: string): string [exported]
      /** Extract session name from path */
      refs out: 1 [call: 1]
        - src/daemon/watcher.ts:563: call basename -> external
    571-581: getProjectFromSessionPath(sessionPath: string): string [exported]
      /** Extract project name from session path Session paths are typically: ~/.pi/agent/sessions/<project-name>/<session-file>.jsonl */
  variable:
    67-73: WatcherConfig [exported]
      /** Default watcher configuration */
      refs out: 1 [type: 1]
        - src/daemon/watcher.ts:67: type WatcherConfig -> src/daemon/watcher.ts
  imports:
    - ../config/config.js
    - ../config/types.js
    - ./watcher-events.js
    - chokidar
    - node:fs
    - node:fs/promises
    - node:path

src/daemon/worker.test.ts [1-1229]
  imports:
    - ../config/types.js
    - ../storage/database.js
    - ../storage/embedding-utils.js
    - ../storage/node-crud.js
    - ../storage/node-types.js
    - ./facet-discovery.js
    - ./queue.js
    - ./worker.js
    - better-sqlite3
    - node:fs
    - node:os
    - node:path
    - vitest

src/daemon/worker.ts [1-882]
  class:
    128-841: class Worker [exported]
      /** Worker that processes jobs from the analysis queue */
  interface:
    68-85: interface WorkerConfig [exported]
      /** Worker configuration */
      refs out: 11 [type: 11]
        - src/daemon/worker.ts:72: type PiBrainConfig -> src/config/types.ts
        - src/daemon/worker.ts:74: type RetryPolicy -> src/daemon/errors.ts
        - src/daemon/worker.ts:76: type ProcessorLogger -> src/daemon/processor.ts
        - src/daemon/worker.ts:78: type AnalysisJob -> src/daemon/types.ts
        - src/daemon/worker.ts:78: type Promise -> external
        - src/daemon/worker.ts:80: type AnalysisJob -> src/daemon/types.ts
        - src/daemon/worker.ts:80: type Node -> src/types/index.ts
        - src/daemon/worker.ts:80: type Promise -> external
        - src/daemon/worker.ts:82: type AnalysisJob -> src/daemon/types.ts
        - src/daemon/worker.ts:82: type Error -> external
    88-103: interface WorkerStatus [exported]
      /** Worker status */
      refs out: 2 [type: 2]
        - src/daemon/worker.ts:94: type AnalysisJob -> src/daemon/types.ts
        - src/daemon/worker.ts:102: type Date -> external
    106-119: interface JobProcessingResult [exported]
      /** Result from processing a single job */
      refs out: 2 [type: 2]
        - src/daemon/worker.ts:110: type AnalysisJob -> src/daemon/types.ts
        - src/daemon/worker.ts:114: type Error -> external
  function:
    850-852: createWorker(config: WorkerConfig): Worker [exported]
      /** Create a worker instance */
      refs out: 3 [instantiate: 1, type: 2]
        - src/daemon/worker.ts:850: type WorkerConfig -> src/daemon/worker.ts
        - src/daemon/worker.ts:850: type Worker -> src/daemon/worker.ts
        - src/daemon/worker.ts:851: instantiate Worker -> src/daemon/worker.ts
    857-881: handleJobError(error: Error, job: AnalysisJob, retryPolicy: RetryPolicy = DEFAULT_RETRY_POLICY): { shouldRetry: boolean; retryDelayMinutes: number; formattedError: string; category: ReturnType<any>; } [exported]
      /** Handle job error manually (for custom queue implementations) */
      refs out: 6 [call: 2, type: 4]
        - src/daemon/worker.ts:858: type Error -> external
        - src/daemon/worker.ts:859: type AnalysisJob -> src/daemon/types.ts
        - src/daemon/worker.ts:860: type RetryPolicy -> src/daemon/errors.ts
        - src/daemon/worker.ts:865: type ReturnType -> external
        - src/daemon/worker.ts:877: call ceil -> external
        - src/daemon/worker.ts:878: call formatErrorForStorage -> src/daemon/errors.ts
  imports:
    - ../config/config.js
    - ../config/types.js
    - ../parser/index.js
    - ../prompt/prompt.js
    - ../storage/embedding-utils.js
    - ../storage/node-conversion.js
    - ../storage/node-crud.js
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

src/parser/analyzer.ts [1-312]
  function:
    21-23: getDefaultSessionDir(): string [exported]
      /** Default session directory */
      refs out: 2 [call: 2]
        - src/parser/analyzer.ts:22: call join -> external
        - src/parser/analyzer.ts:22: call homedir -> external
    36-48: async scanSessions(sessionDir?: string): Promise<{}> [exported]
      /** Scan session directory and parse all sessions Note: This function loads all sessions into memory. For large session histories (thousands of sessions), consider using `scanSessionsIterator` which processes sessions one at a time. */
      refs out: 6 [call: 4, type: 2]
        - src/parser/analyzer.ts:38: type Promise -> external
        - src/parser/analyzer.ts:38: type SessionInfo -> src/types/session.ts
        - src/parser/analyzer.ts:40: call scanSessionsIterator -> src/parser/analyzer.ts
        - src/parser/analyzer.ts:41: call push -> external
        - src/parser/analyzer.ts:45: call sort -> external
        - src/parser/analyzer.ts:45: call localeCompare -> external
    65-107: async *scanSessionsIterator(sessionDir?: string): AsyncGenerator<SessionInfo, void, unknown> [exported]
      /** Async generator that yields sessions one at a time for memory efficiency Use this instead of `scanSessions` when processing large session histories (hundreds or thousands of sessions) to avoid loading all sessions into memory. Sessions are yielded in file system order, not sorted by timestamp. */
      refs out: 7 [call: 4, instantiate: 1, type: 2]
        - src/parser/analyzer.ts:67: type AsyncGenerator -> external
        - src/parser/analyzer.ts:67: type SessionInfo -> src/types/session.ts
        - src/parser/analyzer.ts:77: call isDirectory -> external
        - src/parser/analyzer.ts:85: call endsWith -> external
        - src/parser/analyzer.ts:94: call warn -> external
        - src/parser/analyzer.ts:98: call warn -> external
        - src/parser/analyzer.ts:102: instantiate Error -> external
    112-132: findForkRelationships(sessions: SessionInfo[]): {} [exported]
      /** Find fork relationships between sessions */
      refs out: 5 [call: 3, type: 2]
        - src/parser/analyzer.ts:113: type SessionInfo -> src/types/session.ts
        - src/parser/analyzer.ts:114: type ForkRelationship -> src/types/session.ts
        - src/parser/analyzer.ts:119: call push -> external
        - src/parser/analyzer.ts:129: call sort -> external
        - src/parser/analyzer.ts:129: call localeCompare -> external
    138-140: groupByProject(sessions: SessionInfo[]): {} [exported]
      /** Group sessions by project (cwd) */
      refs out: 3 [call: 1, type: 2]
        - src/parser/analyzer.ts:138: type SessionInfo -> src/types/session.ts
        - src/parser/analyzer.ts:138: type ProjectGroup -> src/types/session.ts
        - src/parser/analyzer.ts:139: call groupByProject -> src/utils/session-utils.ts
    161-172: decodeProjectDir(encodedName: string): string [exported]
      /** Decode project directory name to path e.g., "--home-will-projects-myapp--" → "/home/will/projects/myapp" **Warning**: Pi's encoding is lossy - hyphens in original paths are not escaped. This means "--home-will-projects-pi-brain--" could be either: - /home/will/projects/pi-brain (correct) - /home/will/projects/pi/brain (wrong) Prefer using session.header.cwd which contains the accurate original path. This function is only useful for display purposes when session data is unavailable. */
      refs out: 3 [call: 3]
        - src/parser/analyzer.ts:162: call startsWith -> external
        - src/parser/analyzer.ts:162: call endsWith -> external
        - src/parser/analyzer.ts:171: call replaceAll -> external
    186-193: getProjectName(sessionPath: string): string [exported]
      /** Get project name from session path */
      refs out: 2 [call: 2]
        - src/parser/analyzer.ts:190: call decodeProjectDir -> src/parser/analyzer.ts
        - src/parser/analyzer.ts:192: call basename -> external
    204-206: getProjectNameFromSession(session: SessionInfo): string [exported]
      /** Get project name from a SessionInfo object (preferred over getProjectName) This function returns the accurate project path from the session header, which is not affected by the lossy directory name encoding. */
      refs out: 1 [type: 1]
        - src/parser/analyzer.ts:204: type SessionInfo -> src/types/session.ts
    211-216: filterByProject(sessions: SessionInfo[], projectPath: string): {} [exported]
      /** Filter sessions by project path */
      refs out: 3 [call: 1, type: 2]
        - src/parser/analyzer.ts:212: type SessionInfo -> src/types/session.ts
        - src/parser/analyzer.ts:214: type SessionInfo -> src/types/session.ts
        - src/parser/analyzer.ts:215: call filter -> external
    221-236: filterByDateRange(sessions: SessionInfo[], startDate?: Date, endDate?: Date): {} [exported]
      /** Filter sessions by date range */
      refs out: 5 [call: 1, type: 4]
        - src/parser/analyzer.ts:222: type SessionInfo -> src/types/session.ts
        - src/parser/analyzer.ts:223: type Date -> external
        - src/parser/analyzer.ts:224: type Date -> external
        - src/parser/analyzer.ts:225: type SessionInfo -> src/types/session.ts
        - src/parser/analyzer.ts:226: call filter -> external
    241-270: searchSessions(sessions: SessionInfo[], query: string): {} [exported]
      /** Search sessions for text content */
      refs out: 9 [call: 7, type: 2]
        - src/parser/analyzer.ts:242: type SessionInfo -> src/types/session.ts
        - src/parser/analyzer.ts:244: type SessionInfo -> src/types/session.ts
        - src/parser/analyzer.ts:252: call includes -> external
        - src/parser/analyzer.ts:252: call toLowerCase -> external
        - src/parser/analyzer.ts:253: call push -> external
        - src/parser/analyzer.ts:257: call includes -> external
        - src/parser/analyzer.ts:257: call toLowerCase -> external
        - src/parser/analyzer.ts:258: call push -> external
        - src/parser/analyzer.ts:265: call push -> external
    275-311: getOverallStats(sessions: SessionInfo[]): { totalSessions: number; totalEntries: number; totalMessages: number; totalTokens: number; totalCost: number; projectCount: number; forkCount: number; } [exported]
      /** Get session summary statistics */
      refs out: 2 [call: 1, type: 1]
        - src/parser/analyzer.ts:275: type SessionInfo -> src/types/session.ts
        - src/parser/analyzer.ts:292: call add -> external
  imports:
    - ../types/index.js
    - ../utils/session-utils.js
    - ./session.js
    - node:fs/promises
    - node:os
    - node:path

src/parser/boundary.test.ts [1-776]
  imports:
    - ../types/index.js
    - ./boundary.js
    - vitest

src/parser/boundary.ts [1-655]
  class:
    214-291: class LeafTracker [exported]
      /** Tracks the "current leaf" as entries are processed. In a session tree, the leaf is the most recently added entry that hasn't become a parent of another entry. This is used to detect tree jumps (when a new entry's parentId doesn't match the current leaf). */
  interface:
    39-50: interface Boundary [exported]
      /** A detected boundary in the session */
      refs out: 2 [type: 2]
        - src/parser/boundary.ts:41: type BoundaryType -> src/parser/boundary.ts
        - src/parser/boundary.ts:49: type BoundaryMetadata -> src/parser/boundary.ts
    55-70: interface BoundaryMetadata [exported]
      /** Metadata for different boundary types */
    75-88: interface Segment [exported]
      /** A segment is a contiguous span of entries between boundaries */
      refs out: 1 [type: 1]
        - src/parser/boundary.ts:81: type Boundary -> src/parser/boundary.ts
    103-109: interface BoundaryOptions [exported]
      /** Options for boundary detection */
    617-621: interface BoundaryStats [exported]
      /** Get boundary statistics for a session */
      refs out: 2 [type: 2]
        - src/parser/boundary.ts:619: type Record -> external
        - src/parser/boundary.ts:619: type BoundaryType -> src/parser/boundary.ts
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
      refs out: 11 [call: 8, type: 3]
        - src/parser/boundary.ts:469: type SessionEntry -> src/types/session.ts
        - src/parser/boundary.ts:470: type BoundaryOptions -> src/parser/boundary.ts
        - src/parser/boundary.ts:471: type Boundary -> src/parser/boundary.ts
        - src/parser/boundary.ts:483: call has -> external
        - src/parser/boundary.ts:490: call push -> external
        - src/parser/boundary.ts:495: call push -> external
        - src/parser/boundary.ts:500: call push -> external
        - src/parser/boundary.ts:503: call push -> external
        - src/parser/boundary.ts:503: call processMessageEntry -> src/parser/boundary.ts
        - src/parser/boundary.ts:515: call push -> external
    556-612: extractSegments(entries: SessionEntry[], options: BoundaryOptions = {}): {} [exported]
      /** Extract segments from entries based on detected boundaries A segment is a contiguous span of entries. Boundaries define the split points. */
      refs out: 9 [call: 6, type: 3]
        - src/parser/boundary.ts:557: type SessionEntry -> src/types/session.ts
        - src/parser/boundary.ts:558: type BoundaryOptions -> src/parser/boundary.ts
        - src/parser/boundary.ts:559: type Segment -> src/parser/boundary.ts
        - src/parser/boundary.ts:577: call push -> external
        - src/parser/boundary.ts:578: call set -> external
        - src/parser/boundary.ts:597: call push -> external
        - src/parser/boundary.ts:597: call createSegment -> src/parser/boundary.ts
        - src/parser/boundary.ts:608: call push -> external
        - src/parser/boundary.ts:608: call createSegment -> src/parser/boundary.ts
    630-654: getBoundaryStats(entries: SessionEntry[], options: BoundaryOptions = {}): BoundaryStats [exported]
      /** Calculate statistics about boundaries in a session */
      refs out: 3 [type: 3]
        - src/parser/boundary.ts:631: type SessionEntry -> src/types/session.ts
        - src/parser/boundary.ts:632: type BoundaryOptions -> src/parser/boundary.ts
        - src/parser/boundary.ts:633: type BoundaryStats -> src/parser/boundary.ts
  variable:
    98-98: 10 [exported]
      /** Default minimum gap in minutes to trigger a resume boundary. Can be overridden via BoundaryOptions.resumeGapMinutes. */
  imports:
    - ../types/index.js

src/parser/fork.test.ts [1-405]
  imports:
    - ../types/index.js
    - ./fork.js
    - vitest

src/parser/fork.ts [1-195]
  interface:
    26-37: interface ForkInfo [exported]
      /** Result of detecting a fork from a session header */
  function:
    50-61: isForkSession(header: SessionHeader, sessionPath: string): ForkInfo [exported]
      /** Check if a session is a fork (has parentSession in header) */
      refs out: 2 [type: 2]
        - src/parser/fork.ts:51: type SessionHeader -> src/types/session.ts
        - src/parser/fork.ts:53: type ForkInfo -> src/parser/fork.ts
    74-89: findForks(sessions: SessionInfo[]): {} [exported]
      /** Find all fork relationships from a list of parsed sessions Note: Similar to analyzer.ts:findForkRelationships() but without sorting. The analyzer version sorts by timestamp; this version preserves input order. Both are exported to avoid circular imports that would exceed the barrel file module limit. */
      refs out: 3 [call: 1, type: 2]
        - src/parser/fork.ts:74: type SessionInfo -> src/types/session.ts
        - src/parser/fork.ts:74: type ForkRelationship -> src/types/session.ts
        - src/parser/fork.ts:79: call push -> external
    98-115: findForksFromHeaders(headers: [string, SessionHeader][]): {} [exported]
      /** Find fork relationships given just session headers and paths Useful when you don't have fully parsed sessions */
      refs out: 3 [call: 1, type: 2]
        - src/parser/fork.ts:99: type SessionHeader -> src/types/session.ts
        - src/parser/fork.ts:100: type ForkRelationship -> src/types/session.ts
        - src/parser/fork.ts:105: call push -> external
    123-135: buildForkTree(forks: ForkRelationship[]): Map<string, {}> [exported]
      /** Build a map of session paths to their fork children */
      refs out: 4 [call: 2, type: 2]
        - src/parser/fork.ts:124: type ForkRelationship -> src/types/session.ts
        - src/parser/fork.ts:125: type Map -> external
        - src/parser/fork.ts:130: call push -> external
        - src/parser/fork.ts:131: call set -> external
    144-163: getForkChain(sessionPath: string, forks: ForkRelationship[]): {} [exported]
      /** Get the fork chain for a session (all ancestors via fork) */
      refs out: 4 [call: 3, type: 1]
        - src/parser/fork.ts:146: type ForkRelationship -> src/types/session.ts
        - src/parser/fork.ts:151: call set -> external
        - src/parser/fork.ts:158: call unshift -> external
        - src/parser/fork.ts:159: call get -> external
    172-194: getForkDescendants(sessionPath: string, forks: ForkRelationship[]): {} [exported]
      /** Get all descendants of a session via forks */
      refs out: 3 [call: 2, type: 1]
        - src/parser/fork.ts:174: type ForkRelationship -> src/types/session.ts
        - src/parser/fork.ts:188: call push -> external
        - src/parser/fork.ts:189: call push -> external
  imports:
    - ../types/index.js

src/parser/index.ts [1-9]
  imports:
    - ./analyzer.js
    - ./boundary.js
    - ./session.js
    - ./signals.js

src/parser/real-session.test.ts [1-534]
  imports:
    - ./boundary.js
    - ./fork.js
    - ./session.js
    - node:path
    - node:url
    - vitest

src/parser/session.test.ts [1-1128]
  imports:
    - ../types/index.js
    - ./session.js
    - vitest

src/parser/session.ts [1-438]
  function:
    25-28: async parseSession(filePath: string): Promise<SessionInfo> [exported]
      /** Parse a session JSONL file */
      refs out: 3 [call: 1, type: 2]
        - src/parser/session.ts:25: type Promise -> external
        - src/parser/session.ts:25: type SessionInfo -> src/types/session.ts
        - src/parser/session.ts:27: call parseSessionContent -> src/parser/session.ts
    33-82: parseSessionContent(content: string, filePath: string): SessionInfo [exported]
      /** Parse session content from string */
      refs out: 5 [call: 2, instantiate: 2, type: 1]
        - src/parser/session.ts:36: type SessionInfo -> src/types/session.ts
        - src/parser/session.ts:39: instantiate Error -> external
        - src/parser/session.ts:45: instantiate Error -> external
        - src/parser/session.ts:59: call push -> external
        - src/parser/session.ts:61: call warn -> external
    151-182: buildTree(entries: SessionEntry[]): any [exported]
      /** Build a tree structure from entries */
      refs out: 7 [call: 5, type: 2]
        - src/parser/session.ts:151: type SessionEntry -> src/types/session.ts
        - src/parser/session.ts:151: type TreeNode -> src/types/session.ts
        - src/parser/session.ts:167: call buildNode -> src/parser/session.ts
        - src/parser/session.ts:171: call warn -> external
        - src/parser/session.ts:174: call join -> external
        - src/parser/session.ts:174: call map -> external
        - src/parser/session.ts:181: call buildNode -> src/parser/session.ts
    188-212: findLeaf(entries: SessionEntry[]): string [exported]
      /** Find the current leaf entry ID The leaf is the latest entry that has no children */
      refs out: 3 [call: 2, type: 1]
        - src/parser/session.ts:188: type SessionEntry -> src/types/session.ts
        - src/parser/session.ts:197: call add -> external
        - src/parser/session.ts:204: call has -> external
    217-229: findBranchPoints(entries: SessionEntry[]): {} [exported]
      /** Find branch points (entries with multiple children) */
      refs out: 6 [call: 5, type: 1]
        - src/parser/session.ts:217: type SessionEntry -> src/types/session.ts
        - src/parser/session.ts:222: call set -> external
        - src/parser/session.ts:222: call get -> external
        - src/parser/session.ts:226: call map -> external
        - src/parser/session.ts:226: call filter -> external
        - src/parser/session.ts:226: call entries -> external
    273-323: calculateStats(entries: SessionEntry[], tree: TreeNode | null): SessionStats [exported]
      /** Calculate session statistics */
      refs out: 7 [call: 3, type: 4]
        - src/parser/session.ts:274: type SessionEntry -> src/types/session.ts
        - src/parser/session.ts:275: type TreeNode -> src/types/session.ts
        - src/parser/session.ts:276: type SessionStats -> src/types/session.ts
        - src/parser/session.ts:293: call processMessageEntry -> src/parser/session.ts
        - src/parser/session.ts:293: type SessionMessageEntry -> src/types/session.ts
        - src/parser/session.ts:311: call findBranchPoints -> src/parser/session.ts
        - src/parser/session.ts:315: call calculateMaxDepth -> src/parser/session.ts
    370-389: extractTextPreview(message: UserMessage | AssistantMessage, maxLength = 100): string [exported]
      /** Extract text preview from a message */
      refs out: 6 [call: 3, type: 3]
        - src/parser/session.ts:371: type UserMessage -> src/types/session.ts
        - src/parser/session.ts:371: type AssistantMessage -> src/types/session.ts
        - src/parser/session.ts:377: call truncate -> src/parser/session.ts
        - src/parser/session.ts:380: call isArray -> external
        - src/parser/session.ts:383: call truncate -> src/parser/session.ts
        - src/parser/session.ts:383: type TextContent -> src/types/session.ts
    405-427: getPathToEntry(entries: SessionEntry[], targetId: string): {} [exported]
      /** Get the path from root to a specific entry */
      refs out: 4 [call: 2, type: 2]
        - src/parser/session.ts:406: type SessionEntry -> src/types/session.ts
        - src/parser/session.ts:408: type SessionEntry -> src/types/session.ts
        - src/parser/session.ts:411: call set -> external
        - src/parser/session.ts:422: call unshift -> external
    432-437: getEntry(entries: SessionEntry[], id: string): any [exported]
      /** Get entry by ID */
      refs out: 3 [call: 1, type: 2]
        - src/parser/session.ts:433: type SessionEntry -> src/types/session.ts
        - src/parser/session.ts:435: type SessionEntry -> src/types/session.ts
        - src/parser/session.ts:436: call find -> external
  imports:
    - ../types/index.js
    - node:fs/promises

src/parser/signals.test.ts [1-1260]
  imports:
    - ../types/index.js
    - ./signals.js
    - vitest

src/parser/signals.ts [1-1181]
  interface:
    590-599: interface FrictionDetectionOptions [exported]
      /** Options for friction detection */
    1153-1156: interface DelightDetectionOptions [exported]
      /** Options for delight detection */
  function:
    124-161: countRephrasingCascades(entries: SessionEntry[]): number [exported]
      /** Count rephrasing cascades in a segment A rephrasing cascade is 3+ consecutive user messages without a meaningful assistant response (no tool calls, no substantial text). */
      refs out: 1 [type: 1]
        - src/parser/signals.ts:124: type SessionEntry -> src/types/session.ts
    188-218: countToolLoops(entries: SessionEntry[]): number [exported]
      /** Count tool loops in a segment A tool loop is when the same tool fails with the same error type 3+ times. */
      refs out: 2 [call: 1, type: 1]
        - src/parser/signals.ts:188: type SessionEntry -> src/types/session.ts
        - src/parser/signals.ts:208: call set -> external
    352-377: countContextChurn(entries: SessionEntry[]): number [exported]
      /** Count context churn events Context churn is high frequency of read/ls operations on different files, indicating the user is fighting the context window. */
      refs out: 5 [call: 2, type: 3]
        - src/parser/signals.ts:352: type SessionEntry -> src/types/session.ts
        - src/parser/signals.ts:367: type AssistantMessage -> src/types/session.ts
        - src/parser/signals.ts:369: call processToolCallForChurn -> src/parser/signals.ts
        - src/parser/signals.ts:369: type ToolCallContent -> src/types/session.ts
        - src/parser/signals.ts:375: call floor -> external
    384-416: detectModelSwitch(entries: SessionEntry[], previousSegmentModel?: string): string [exported]
      /** Detect if a model switch occurred for this segment Returns the model switched FROM if this segment is a retry with a different model. */
      refs out: 1 [type: 1]
        - src/parser/signals.ts:385: type SessionEntry -> src/types/session.ts
    457-471: detectSilentTermination(entries: SessionEntry[], isLastSegment: boolean, wasResumed: boolean): boolean [exported]
      /** Detect silent termination Session ends mid-task (no handoff, no success) and is not resumed. This is detected by checking if the last entry shows incomplete work. */
      refs out: 1 [type: 1]
        - src/parser/signals.ts:458: type SessionEntry -> src/types/session.ts
    514-542: extractManualFlags(entries: SessionEntry[]): {} [exported]
      /** Extract manual flags from session entries Looks for custom entries with type 'brain_flag' */
      refs out: 2 [call: 1, type: 1]
        - src/parser/signals.ts:514: type SessionEntry -> src/types/session.ts
        - src/parser/signals.ts:532: call push -> external
    553-581: calculateFrictionScore(friction: FrictionSignals): number [exported]
      /** Calculate overall friction score (0.0-1.0) Weights different friction signals based on severity. */
      refs out: 4 [call: 4]
        - src/parser/signals.ts:557: call min -> external
        - src/parser/signals.ts:560: call min -> external
        - src/parser/signals.ts:563: call min -> external
        - src/parser/signals.ts:580: call min -> external
    604-636: detectFrictionSignals(entries: SessionEntry[], options: FrictionDetectionOptions = {}): FrictionSignals [exported]
      /** Detect all friction signals in a session segment */
      refs out: 3 [call: 1, type: 2]
        - src/parser/signals.ts:605: type SessionEntry -> src/types/session.ts
        - src/parser/signals.ts:606: type FrictionDetectionOptions -> src/parser/signals.ts
        - src/parser/signals.ts:633: call calculateFrictionScore -> src/parser/signals.ts
    676-690: getFilesTouched(entries: SessionEntry[]): Set<string> [exported]
      /** Check if a segment touches similar files to another segment (for abandoned restart detection) */
      refs out: 4 [call: 1, type: 3]
        - src/parser/signals.ts:676: type SessionEntry -> src/types/session.ts
        - src/parser/signals.ts:676: type Set -> external
        - src/parser/signals.ts:685: call extractFilesFromAssistantMessage -> src/parser/signals.ts
        - src/parser/signals.ts:685: type AssistantMessage -> src/types/session.ts
    695-713: hasFileOverlap(files1: Set<string>, files2: Set<string>, threshold = 0.3): boolean [exported]
      /** Check if two sets of files have significant overlap */
      refs out: 3 [call: 1, type: 2]
        - src/parser/signals.ts:696: type Set -> external
        - src/parser/signals.ts:697: type Set -> external
        - src/parser/signals.ts:706: call has -> external
    718-748: getPrimaryModel(entries: SessionEntry[]): string [exported]
      /** Get the primary model used in a segment */
      refs out: 3 [call: 2, type: 1]
        - src/parser/signals.ts:718: type SessionEntry -> src/types/session.ts
        - src/parser/signals.ts:732: call set -> external
        - src/parser/signals.ts:732: call get -> external
    753-762: getSegmentTimestamp(entries: SessionEntry[]): string [exported]
      /** Get segment timestamp for abandoned restart detection */
      refs out: 1 [type: 1]
        - src/parser/signals.ts:754: type SessionEntry -> src/types/session.ts
    772-806: isAbandonedRestart(segmentA: { entries: SessionEntry[]; outcome: string; endTime: string }, segmentB: { entries: SessionEntry[]; startTime: string }): boolean [exported]
      /** Check if segment B is an abandoned restart of segment A Criteria: - Segment A has outcome 'abandoned' - Segment B starts within 30 minutes of segment A ending - Both segments touch similar files */
      refs out: 5 [call: 3, type: 2]
        - src/parser/signals.ts:773: type SessionEntry -> src/types/session.ts
        - src/parser/signals.ts:774: type SessionEntry -> src/types/session.ts
        - src/parser/signals.ts:791: call isNaN -> external
        - src/parser/signals.ts:791: call isNaN -> external
        - src/parser/signals.ts:805: call hasFileOverlap -> src/parser/signals.ts
    819-858: isAbandonedRestartFromNode(previousNode: {
    outcome: string;
    timestamp: string;
    filesTouched: string[];
  }, currentStartTime: string, currentFilesTouched: string[]): boolean [exported]
      /** Check if a current segment is an abandoned restart of a previous node. This is similar to `isAbandonedRestart` but works with already-computed node data (with filesTouched arrays) instead of raw session entries. Criteria: - Previous node has outcome 'abandoned' - Current segment starts within 30 minutes of previous node's timestamp - Both touch similar files (30% overlap threshold) */
      refs out: 3 [call: 3]
        - src/parser/signals.ts:843: call isNaN -> external
        - src/parser/signals.ts:843: call isNaN -> external
        - src/parser/signals.ts:857: call hasFileOverlap -> src/parser/signals.ts
    914-938: detectResilientRecovery(entries: SessionEntry[]): boolean [exported]
      /** Detect resilient recovery Tool error occurs, but the model fixes it WITHOUT user intervention, and the task ultimately succeeds. */
      refs out: 5 [call: 2, type: 3]
        - src/parser/signals.ts:914: type SessionEntry -> src/types/session.ts
        - src/parser/signals.ts:927: call processToolResultForRecovery -> src/parser/signals.ts
        - src/parser/signals.ts:927: type ToolResultMessage -> src/types/session.ts
        - src/parser/signals.ts:929: call processUserMessageForRecovery -> src/parser/signals.ts
        - src/parser/signals.ts:929: type UserMessage -> src/types/session.ts
    998-1027: detectOneShotSuccess(entries: SessionEntry[]): boolean [exported]
      /** Detect one-shot success Complex task (multiple tool calls) completed with zero user corrections/rephrasings. */
      refs out: 3 [call: 1, type: 2]
        - src/parser/signals.ts:998: type SessionEntry -> src/types/session.ts
        - src/parser/signals.ts:1010: call countToolCallsInMessage -> src/parser/signals.ts
        - src/parser/signals.ts:1010: type AssistantMessage -> src/types/session.ts
    1068-1091: detectExplicitPraise(entries: SessionEntry[]): boolean [exported]
      /** Detect explicit praise from user User says "great job", "perfect", "thanks", etc. */
      refs out: 2 [call: 1, type: 1]
        - src/parser/signals.ts:1068: type SessionEntry -> src/types/session.ts
        - src/parser/signals.ts:1084: call hasGenuinePraise -> src/parser/signals.ts
    1125-1144: calculateDelightScore(delight: DelightSignals): number [exported]
      /** Calculate overall delight score (0.0-1.0) Weights different delight signals based on significance. */
      refs out: 1 [call: 1]
        - src/parser/signals.ts:1143: call min -> external
    1161-1180: detectDelightSignals(entries: SessionEntry[], _options: DelightDetectionOptions = {}): DelightSignals [exported]
      /** Detect all delight signals in a session segment */
      refs out: 3 [call: 1, type: 2]
        - src/parser/signals.ts:1162: type SessionEntry -> src/types/session.ts
        - src/parser/signals.ts:1163: type DelightDetectionOptions -> src/parser/signals.ts
        - src/parser/signals.ts:1177: call calculateDelightScore -> src/parser/signals.ts
  imports:
    - ../types/index.js

---
Files: 42
Estimated tokens: 20,795 (codebase: ~1,389,221)
