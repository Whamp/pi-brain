# Project Overview

## Languages
- typescript: 41 files

## Statistics
- Total files: 41
- Total symbols: 202
  - function: 121
  - interface: 47
  - variable: 16
  - class: 10
  - type: 8

---

src/daemon/cli.test.ts [1-166]
  imports:
    - ../config/config.js
    - ../storage/database.js
    - ../storage/embedding-utils.js
    - ../storage/node-storage.js
    - ./cli.js
    - ./facet-discovery.js
    - node:fs
    - node:path
    - vitest

src/daemon/cli.ts [1-1222]
  interface:
    114-120: interface DaemonStatus [exported]
      /** Daemon status info */
    123-128: interface QueueStatus [exported]
      /** Queue status info */
      refs out: 4 [type: 4]
        - src/daemon/cli.ts:124: type QueueStats -> src/daemon/queue.ts
        - src/daemon/cli.ts:125: type AnalysisJob -> src/daemon/queue.ts
        - src/daemon/cli.ts:126: type AnalysisJob -> src/daemon/queue.ts
        - src/daemon/cli.ts:127: type AnalysisJob -> src/daemon/queue.ts
    131-136: interface HealthCheckResult [exported]
      /** Health check result */
    139-143: interface HealthStatus [exported]
      /** Overall health status */
      refs out: 1 [type: 1]
        - src/daemon/cli.ts:142: type HealthCheckResult -> src/daemon/cli.ts
    146-149: interface OutputOptions [exported]
      /** CLI output options */
    276-280: interface StartOptions [exported]
      /** Start options */
    283-286: interface StopOptions [exported]
      /** Stop options */
  function:
    61-70: isPortAvailable(port: number): Promise<boolean> [exported]
      /** Check if a port is available */
      refs out: 8 [call: 6, instantiate: 1, type: 1]
        - src/daemon/cli.ts:61: type Promise -> external
        - src/daemon/cli.ts:62: instantiate Promise -> external
        - src/daemon/cli.ts:64: call Server.once -> external
        - src/daemon/cli.ts:64: call resolve -> src/daemon/cli.ts
        - src/daemon/cli.ts:65: call Server.once -> external
        - src/daemon/cli.ts:66: call Server.close -> external
        - src/daemon/cli.ts:66: call resolve -> src/daemon/cli.ts
        - src/daemon/cli.ts:68: call Server.listen -> external
    75-88: findProcessOnPort(port: number): number [exported]
      /** Find process using a port (Linux/macOS) */
      refs out: 1 [call: 1]
        - src/daemon/cli.ts:84: call isNaN -> external
    158-169: readPidFile(): number [exported]
      /** Read the daemon PID from the PID file */
      refs out: 2 [call: 2]
        - src/daemon/cli.ts:160: call existsSync -> external
        - src/daemon/cli.ts:165: call isNaN -> external
    174-180: writePidFile(pid: number): void [exported]
      /** Write the daemon PID to the PID file */
      refs out: 4 [call: 4]
        - src/daemon/cli.ts:176: call existsSync -> external
        - src/daemon/cli.ts:177: call mkdirSync -> external
        - src/daemon/cli.ts:179: call writeFileSync -> external
        - src/daemon/cli.ts:179: call String -> external
    185-193: removePidFile(): void [exported]
      /** Remove the PID file */
      refs out: 2 [call: 2]
        - src/daemon/cli.ts:187: call existsSync -> external
        - src/daemon/cli.ts:188: call unlinkSync -> external
    198-206: isProcessRunning(pid: number): boolean [exported]
      /** Check if a process with the given PID is running */
      refs out: 1 [call: 1]
        - src/daemon/cli.ts:201: call kill -> external
    211-224: isDaemonRunning(): { running: boolean; pid: number; } [exported]
      /** Check if the daemon is currently running */
      refs out: 2 [call: 2]
        - src/daemon/cli.ts:217: call isProcessRunning -> src/daemon/cli.ts
        - src/daemon/cli.ts:222: call removePidFile -> src/daemon/cli.ts
    233-254: formatUptime(seconds: number): string [exported]
      /** Format uptime in a human-readable way */
      refs out: 5 [call: 5]
        - src/daemon/cli.ts:235: call floor -> external
        - src/daemon/cli.ts:244: call push -> external
        - src/daemon/cli.ts:247: call push -> external
        - src/daemon/cli.ts:250: call push -> external
        - src/daemon/cli.ts:253: call join -> external
    259-269: getProcessUptime(): number [exported]
      /** Get process uptime (approximate based on PID file modification time) */
      refs out: 2 [call: 2]
        - src/daemon/cli.ts:261: call existsSync -> external
        - src/daemon/cli.ts:265: call now -> external
    291-436: async startDaemon(options: StartOptions = {}): Promise<{ success: boolean; message: string; pid?: number; }> [exported]
      /** Start the daemon process */
      refs out: 26 [call: 20, type: 6]
        - src/daemon/cli.ts:291: type StartOptions -> src/daemon/cli.ts
        - src/daemon/cli.ts:291: type Promise -> external
        - src/daemon/cli.ts:310: call loadConfig -> src/config/config.ts
        - src/daemon/cli.ts:314: type Error -> external
        - src/daemon/cli.ts:323: call log -> external
        - src/daemon/cli.ts:327: call kill -> external
        - src/daemon/cli.ts:328: call sleep -> src/daemon/cli.ts
        - src/daemon/cli.ts:332: type Error -> external
        - src/daemon/cli.ts:346: call kill -> external
        - src/daemon/cli.ts:347: call removePidFile -> src/daemon/cli.ts
    441-503: async stopDaemon(options: StopOptions = {}): Promise<{ success: boolean; message: string; }> [exported]
      /** Stop the daemon process */
      refs out: 9 [call: 7, type: 2]
        - src/daemon/cli.ts:441: type StopOptions -> src/daemon/cli.ts
        - src/daemon/cli.ts:441: type Promise -> external
        - src/daemon/cli.ts:460: call kill -> external
        - src/daemon/cli.ts:463: call removePidFile -> src/daemon/cli.ts
        - src/daemon/cli.ts:472: call now -> external
        - src/daemon/cli.ts:473: call isProcessRunning -> src/daemon/cli.ts
        - src/daemon/cli.ts:474: call removePidFile -> src/daemon/cli.ts
        - src/daemon/cli.ts:480: call sleep -> src/daemon/cli.ts
        - src/daemon/cli.ts:492: call removePidFile -> src/daemon/cli.ts
    508-520: getDaemonStatus(configPath?: string): DaemonStatus [exported]
      /** Get daemon status information */
      refs out: 2 [call: 1, type: 1]
        - src/daemon/cli.ts:508: type DaemonStatus -> src/daemon/cli.ts
        - src/daemon/cli.ts:518: call join -> external
    529-558: getQueueStatus(configPath?: string): QueueStatus [exported]
      /** Get queue status information */
      refs out: 5 [call: 4, type: 1]
        - src/daemon/cli.ts:529: type QueueStatus -> src/daemon/cli.ts
        - src/daemon/cli.ts:534: call existsSync -> external
        - src/daemon/cli.ts:551: call migrate -> src/storage/database.ts
        - src/daemon/cli.ts:554: call getQueueStatusSummary -> src/daemon/queue.ts
        - src/daemon/cli.ts:556: call close -> external
    563-616: queueAnalysis(sessionPath: string, configPath?: string): { success: boolean; message: string; jobId?: string; } [exported]
      /** Queue a session for analysis */
      refs out: 5 [call: 5]
        - src/daemon/cli.ts:569: call existsSync -> external
        - src/daemon/cli.ts:576: call endsWith -> external
        - src/daemon/cli.ts:588: call migrate -> src/storage/database.ts
        - src/daemon/cli.ts:593: call QueueManager.hasExistingJob -> src/daemon/queue.ts
        - src/daemon/cli.ts:614: call close -> external
    836-866: async runHealthChecks(configPath?: string): Promise<HealthStatus> [exported]
      /** Run all health checks */
      refs out: 2 [type: 2]
        - src/daemon/cli.ts:838: type Promise -> external
        - src/daemon/cli.ts:838: type HealthStatus -> src/daemon/cli.ts
    875-896: formatDaemonStatus(status: DaemonStatus, _options: OutputOptions = {}): string [exported]
      /** Format daemon status for display */
      refs out: 6 [call: 4, type: 2]
        - src/daemon/cli.ts:876: type DaemonStatus -> src/daemon/cli.ts
        - src/daemon/cli.ts:877: type OutputOptions -> src/daemon/cli.ts
        - src/daemon/cli.ts:886: call push -> external
        - src/daemon/cli.ts:890: call push -> external
        - src/daemon/cli.ts:893: call push -> external
        - src/daemon/cli.ts:895: call join -> external
    901-951: formatQueueStatus(queueStatus: QueueStatus, _options: OutputOptions = {}): string [exported]
      /** Format queue status for display */
      refs out: 20 [call: 18, type: 2]
        - src/daemon/cli.ts:902: type QueueStatus -> src/daemon/cli.ts
        - src/daemon/cli.ts:903: type OutputOptions -> src/daemon/cli.ts
        - src/daemon/cli.ts:914: call push -> external
        - src/daemon/cli.ts:914: call toFixed -> external
        - src/daemon/cli.ts:918: call push -> external
        - src/daemon/cli.ts:919: call push -> external
        - src/daemon/cli.ts:922: call push -> external
        - src/daemon/cli.ts:922: call slice -> external
        - src/daemon/cli.ts:922: call padEnd -> external
        - src/daemon/cli.ts:927: call push -> external
    966-989: formatHealthStatus(status: HealthStatus, _options: OutputOptions = {}): string [exported]
      /** Format health check results for display */
      refs out: 7 [call: 5, type: 2]
        - src/daemon/cli.ts:967: type HealthStatus -> src/daemon/cli.ts
        - src/daemon/cli.ts:968: type OutputOptions -> src/daemon/cli.ts
        - src/daemon/cli.ts:974: call push -> external
        - src/daemon/cli.ts:977: call push -> external
        - src/daemon/cli.ts:983: call push -> external
        - src/daemon/cli.ts:985: call push -> external
        - src/daemon/cli.ts:988: call join -> external
    1004-1124: rebuildIndex(configPath?: string): { success: boolean; message: string; count: number; } [exported]
      /** Rebuild the SQLite index from JSON files */
      refs out: 17 [call: 16, type: 1]
        - src/daemon/cli.ts:1024: call migrate -> src/storage/database.ts
        - src/daemon/cli.ts:1027: call log -> external
        - src/daemon/cli.ts:1043: call set -> external
        - src/daemon/cli.ts:1047: call log -> external
        - src/daemon/cli.ts:1050: call log -> external
        - src/daemon/cli.ts:1052: call clearAllData -> src/storage/node-crud.ts
        - src/daemon/cli.ts:1055: call log -> external
        - src/daemon/cli.ts:1074: call processInsertBatch -> src/daemon/cli.ts
        - src/daemon/cli.ts:1075: call Socket.write -> external
        - src/daemon/cli.ts:1079: call log -> external
    1129-1211: async rebuildEmbeddings(configPath?: string, options: { force?: boolean } = {}): Promise<{ success: boolean; message: string; count: number; }> [exported]
      /** Rebuild embeddings for all nodes */
      refs out: 12 [call: 10, type: 2]
        - src/daemon/cli.ts:1132: type Promise -> external
        - src/daemon/cli.ts:1153: call migrate -> src/storage/database.ts
        - src/daemon/cli.ts:1172: call log -> external
        - src/daemon/cli.ts:1173: call log -> external
        - src/daemon/cli.ts:1185: call log -> external
        - src/daemon/cli.ts:1186: call log -> external
        - src/daemon/cli.ts:1187: call log -> external
        - src/daemon/cli.ts:1190: call log -> external
        - src/daemon/cli.ts:1192: call join -> external
        - src/daemon/cli.ts:1192: call slice -> external
  variable:
    108-108: any [exported]
      /** PID file location */
      refs out: 1 [call: 1]
        - src/daemon/cli.ts:108: call join -> external
    111-111: any [exported]
      /** Log file location */
      refs out: 1 [call: 1]
        - src/daemon/cli.ts:111: call join -> external
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

src/daemon/connection-discovery.test.ts [1-440]
  imports:
    - ../storage/index.js
    - ./connection-discovery.js
    - better-sqlite3
    - vitest

src/daemon/connection-discovery.ts [1-620]
  class:
    159-619: class ConnectionDiscoverer [exported]
      /** Discovers semantic connections between nodes in the knowledge graph. Uses keyword/tag similarity, explicit references, and lesson reinforcement patterns to find related nodes. Does not use LLM - relies on FTS and Jaccard similarity for performance. */
  interface:
    138-143: interface ConnectionResult [exported]
      refs out: 1 [type: 1]
        - src/daemon/connection-discovery.ts:142: type Edge -> src/types/index.ts
  imports:
    - ../storage/edge-repository.js
    - ../storage/index.js
    - ../storage/node-crud.js
    - ../storage/node-queries.js
    - ../types/index.js
    - better-sqlite3

src/daemon/daemon-process.ts [1-312]
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
        - src/daemon/errors.ts:253: type JobContext -> src/daemon/queue.ts
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

src/daemon/export.ts [1-148]
  function:
    17-30: getSegmentEntries(entries: SessionEntry[], startId: string, endId: string): {} [exported]
      /** Extract entries within a segment range */
      refs out: 3 [call: 1, type: 2]
        - src/daemon/export.ts:18: type SessionEntry -> src/types.ts
        - src/daemon/export.ts:21: type SessionEntry -> src/types.ts
        - src/daemon/export.ts:29: call slice -> external
    41-147: async exportFineTuneData(outputPath: string, configPath?: string): Promise<{ success: boolean; message: string; count: number; }> [exported]
      /** Export fine-tuning data to JSONL Format: { "input": <JSON string of segment entries>, "output": <JSON string of node analysis> } */
      refs out: 12 [call: 9, instantiate: 1, type: 2]
        - src/daemon/export.ts:44: type Promise -> external
        - src/daemon/export.ts:49: call existsSync -> external
        - src/daemon/export.ts:61: call log -> external
        - src/daemon/export.ts:78: call existsSync -> external
        - src/daemon/export.ts:116: call Writable.write -> external
        - src/daemon/export.ts:116: call stringify -> external
        - src/daemon/export.ts:120: call Socket.write -> external
        - src/daemon/export.ts:128: call Writable.end -> external
        - src/daemon/export.ts:129: instantiate Promise -> external
        - src/daemon/export.ts:130: call WriteStream.on -> external
  imports:
    - ../config/index.js
    - ../parser/session.js
    - ../storage/node-storage.js
    - ../types.js
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

src/daemon/facet-discovery.ts [1-1760]
  class:
    670-1731: class FacetDiscovery [exported]
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
    656-660: interface FacetDiscoveryLogger [exported]
  function:
    162-198: createEmbeddingProvider(config: EmbeddingConfig): EmbeddingProvider [exported]
      /** Create an embedding provider from config */
      refs out: 8 [call: 3, instantiate: 3, type: 2]
        - src/daemon/facet-discovery.ts:163: type EmbeddingConfig -> src/types/index.ts
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
    384-451: kMeansClustering(embeddings: number[][], k: number, maxIterations = 100): KMeansResult [exported]
      /** Simple K-means++ clustering implementation */
      refs out: 3 [call: 2, type: 1]
        - src/daemon/facet-discovery.ts:388: type KMeansResult -> src/daemon/facet-discovery.ts
        - src/daemon/facet-discovery.ts:395: call map -> external
        - src/daemon/facet-discovery.ts:396: call map -> external
    494-513: hdbscanClustering(embeddings: number[][], minClusterSize = 3, minSamples = 3): {} [exported]
      /** HDBSCAN-like density-based clustering (simplified) */
      refs out: 2 [call: 2]
        - src/daemon/facet-discovery.ts:500: call fill -> external
        - src/daemon/facet-discovery.ts:500: call from -> external
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

src/daemon/graph-export.ts [1-131]
  interface:
    15-20: interface GraphExportOptions [exported]
  function:
    25-91: exportGraphviz(outputPath: string, configPath?: string, options: GraphExportOptions = {}): { success: boolean; message: string; } [exported]
      /** Export knowledge graph to Graphviz DOT format */
      refs out: 4 [call: 3, type: 1]
        - src/daemon/graph-export.ts:28: type GraphExportOptions -> src/daemon/graph-export.ts
        - src/daemon/graph-export.ts:33: call migrate -> src/storage/database.ts
        - src/daemon/graph-export.ts:82: call writeFileSync -> external
        - src/daemon/graph-export.ts:89: call close -> external
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

src/daemon/insight-aggregation.ts [1-553]
  class:
    149-552: class InsightAggregator [exported]
  imports:
    - ../storage/node-storage.js
    - ../types/index.js
    - better-sqlite3
    - node:crypto

src/daemon/pattern-aggregation.test.ts [1-384]
  imports:
    - ./pattern-aggregation.js
    - better-sqlite3
    - vitest

src/daemon/pattern-aggregation.ts [1-332]
  class:
    22-331: class PatternAggregator [exported]
  imports:
    - better-sqlite3
    - node:crypto

src/daemon/processor.test.ts [1-723]
  imports:
    - ./processor.js
    - ./queue.js
    - node:fs/promises
    - node:os
    - node:path
    - vitest

src/daemon/processor.ts [1-809]
  class:
    747-801: class JobProcessor [exported]
      /** Job processor that invokes pi agents for analysis */
  interface:
    21-34: interface AgentResult [exported]
      /** Result from invoking the pi agent */
      refs out: 1 [type: 1]
        - src/daemon/processor.ts:27: type AgentNodeOutput -> src/daemon/processor.ts
    37-116: interface AgentNodeOutput [exported]
      /** Output schema from the session analyzer (matches session-analyzer.md) */
      refs out: 7 [type: 7]
        - src/daemon/processor.ts:63: type LessonOutput -> src/daemon/processor.ts
        - src/daemon/processor.ts:64: type LessonOutput -> src/daemon/processor.ts
        - src/daemon/processor.ts:65: type LessonOutput -> src/daemon/processor.ts
        - src/daemon/processor.ts:66: type LessonOutput -> src/daemon/processor.ts
        - src/daemon/processor.ts:67: type LessonOutput -> src/daemon/processor.ts
        - src/daemon/processor.ts:68: type LessonOutput -> src/daemon/processor.ts
        - src/daemon/processor.ts:69: type LessonOutput -> src/daemon/processor.ts
    128-132: interface SkillInfo [exported]
      /** Skill availability information */
    135-140: interface ProcessorLogger [exported]
      /** Logger interface for processor */
    212-219: interface EnvironmentValidationResult [exported]
      /** Result of environment validation */
    737-742: interface ProcessorConfig [exported]
      /** Processor configuration */
      refs out: 2 [type: 2]
        - src/daemon/processor.ts:739: type DaemonConfig -> src/config/types.ts
        - src/daemon/processor.ts:741: type ProcessorLogger -> src/daemon/processor.ts
  function:
    176-184: async checkSkillAvailable(skillName: string): Promise<boolean> [exported]
      /** Check if a skill is available by looking for SKILL.md */
      refs out: 2 [call: 1, type: 1]
        - src/daemon/processor.ts:176: type Promise -> external
        - src/daemon/processor.ts:179: call access -> external
    189-209: async getSkillAvailability(): Promise<Map<string, SkillInfo>> [exported]
      /** Get availability information for all skills */
      refs out: 4 [call: 1, type: 3]
        - src/daemon/processor.ts:189: type Promise -> external
        - src/daemon/processor.ts:189: type Map -> external
        - src/daemon/processor.ts:189: type SkillInfo -> src/daemon/processor.ts
        - src/daemon/processor.ts:201: call set -> external
    225-237: async validateRequiredSkills(): Promise<EnvironmentValidationResult> [exported]
      /** Validate that all required skills are available Returns validation result instead of throwing */
      refs out: 2 [type: 2]
        - src/daemon/processor.ts:225: type Promise -> external
        - src/daemon/processor.ts:225: type EnvironmentValidationResult -> src/daemon/processor.ts
    246-283: async buildSkillsArg(sessionFile?: string): Promise<string> [exported]
      /** Build the skills argument for pi invocation Returns comma-separated list of available skills RLM skill is only included for files larger than RLM_SIZE_THRESHOLD to avoid confusing smaller models with RLM instructions. */
      refs out: 8 [call: 7, type: 1]
        - src/daemon/processor.ts:246: type Promise -> external
        - src/daemon/processor.ts:265: call get -> external
        - src/daemon/processor.ts:266: call push -> external
        - src/daemon/processor.ts:272: call get -> external
        - src/daemon/processor.ts:273: call push -> external
        - src/daemon/processor.ts:278: call get -> external
        - src/daemon/processor.ts:279: call push -> external
        - src/daemon/processor.ts:282: call join -> external
    292-324: buildAnalysisPrompt(job: AnalysisJob): string [exported]
      /** Build the analysis prompt for a job */
      refs out: 10 [call: 9, type: 1]
        - src/daemon/processor.ts:292: type AnalysisJob -> src/daemon/queue.ts
        - src/daemon/processor.ts:300: call push -> external
        - src/daemon/processor.ts:304: call push -> external
        - src/daemon/processor.ts:306: call push -> external
        - src/daemon/processor.ts:312: call push -> external
        - src/daemon/processor.ts:313: call push -> external
        - src/daemon/processor.ts:314: call push -> external
        - src/daemon/processor.ts:318: call push -> external
        - src/daemon/processor.ts:319: call push -> external
        - src/daemon/processor.ts:323: call join -> external
    357-465: async invokeAgent(job: AnalysisJob, config: DaemonConfig, logger: ProcessorLogger = consoleLogger): Promise<AgentResult> [exported]
      /** Invoke the pi agent to analyze a session */
      refs out: 13 [call: 8, type: 5]
        - src/daemon/processor.ts:358: type AnalysisJob -> src/daemon/queue.ts
        - src/daemon/processor.ts:359: type DaemonConfig -> src/config/types.ts
        - src/daemon/processor.ts:360: type ProcessorLogger -> src/daemon/processor.ts
        - src/daemon/processor.ts:361: type Promise -> external
        - src/daemon/processor.ts:361: type AgentResult -> src/daemon/processor.ts
        - src/daemon/processor.ts:366: call access -> external
        - src/daemon/processor.ts:373: call now -> external
        - src/daemon/processor.ts:379: call access -> external
        - src/daemon/processor.ts:386: call now -> external
        - src/daemon/processor.ts:414: call debug -> src/daemon/processor.ts
    571-640: parseAgentOutput(stdout: string, logger: ProcessorLogger = consoleLogger): Omit<AgentResult, "exitCode" | "durationMs"> [exported]
      /** Parse the pi agent's JSON mode output */
      refs out: 9 [call: 5, type: 4]
        - src/daemon/processor.ts:573: type ProcessorLogger -> src/daemon/processor.ts
        - src/daemon/processor.ts:574: type Omit -> external
        - src/daemon/processor.ts:574: type AgentResult -> src/daemon/processor.ts
        - src/daemon/processor.ts:580: call trim -> external
        - src/daemon/processor.ts:584: call push -> external
        - src/daemon/processor.ts:584: call parse -> external
        - src/daemon/processor.ts:584: type PiJsonEvent -> src/daemon/processor.ts
        - src/daemon/processor.ts:587: call debug -> src/daemon/processor.ts
        - src/daemon/processor.ts:587: call slice -> external
    646-679: extractNodeFromText(text: string, logger: ProcessorLogger = consoleLogger): AgentNodeOutput [exported]
      /** Extract node JSON from text content Handles both raw JSON and code-fenced JSON */
      refs out: 8 [call: 6, type: 2]
        - src/daemon/processor.ts:648: type ProcessorLogger -> src/daemon/processor.ts
        - src/daemon/processor.ts:649: type AgentNodeOutput -> src/daemon/processor.ts
        - src/daemon/processor.ts:655: call isValidNodeOutput -> src/daemon/processor.ts
        - src/daemon/processor.ts:658: call warn -> src/daemon/processor.ts
        - src/daemon/processor.ts:660: call warn -> src/daemon/processor.ts
        - src/daemon/processor.ts:669: call isValidNodeOutput -> src/daemon/processor.ts
        - src/daemon/processor.ts:672: call warn -> src/daemon/processor.ts
        - src/daemon/processor.ts:674: call warn -> src/daemon/processor.ts
    684-730: isValidNodeOutput(obj: unknown): boolean [exported]
      /** Basic validation that output matches expected schema */
      refs out: 1 [type: 1]
        - src/daemon/processor.ts:684: type AgentNodeOutput -> src/daemon/processor.ts
    806-808: createProcessor(config: ProcessorConfig): JobProcessor [exported]
      /** Create a job processor */
      refs out: 3 [instantiate: 1, type: 2]
        - src/daemon/processor.ts:806: type ProcessorConfig -> src/daemon/processor.ts
        - src/daemon/processor.ts:806: type JobProcessor -> src/daemon/processor.ts
        - src/daemon/processor.ts:807: instantiate JobProcessor -> src/daemon/processor.ts
  variable:
    143-148: ProcessorLogger [exported]
      /** Default console logger */
      refs out: 5 [call: 4, type: 1]
        - src/daemon/processor.ts:143: type ProcessorLogger -> src/daemon/processor.ts
        - src/daemon/processor.ts:144: call debug -> external
        - src/daemon/processor.ts:145: call log -> external
        - src/daemon/processor.ts:146: call warn -> external
        - src/daemon/processor.ts:147: call error -> external
    155-155: readonly [] [exported]
      /** Required skills for analysis - must be available */
      refs out: 1 [type: 1]
        - src/daemon/processor.ts:155: type const -> external
    158-158: readonly ["codemap"] [exported]
      /** Optional skills - enhance analysis but not required */
      refs out: 1 [type: 1]
        - src/daemon/processor.ts:158: type const -> external
    161-161: readonly ["rlm"] [exported]
      /** Skills that are conditionally included based on file size */
      refs out: 1 [type: 1]
        - src/daemon/processor.ts:161: type const -> external
    164-164: number [exported]
      /** File size threshold (in bytes) for including RLM skill */
    167-167: any [exported]
      /** Skills directory location */
      refs out: 2 [call: 2]
        - src/daemon/processor.ts:167: call join -> external
        - src/daemon/processor.ts:167: call homedir -> external
  imports:
    - ../config/types.js
    - ./queue.js
    - node:child_process
    - node:fs/promises
    - node:os
    - node:path

src/daemon/query-processor.test.ts [1-463]
  imports:
    - ../config/types.js
    - ../storage/database.js
    - ../storage/node-queries.js
    - ../storage/quirk-repository.js
    - ../storage/search-repository.js
    - ../storage/semantic-search.js
    - ../storage/tool-error-repository.js
    - ./facet-discovery.js
    - ./query-processor.js
    - better-sqlite3
    - node:child_process
    - node:fs/promises
    - vitest

src/daemon/query-processor.ts [1-786]
  interface:
    32-45: interface QueryRequest [exported]
      /** Query request from the API */
    48-66: interface QueryResponse [exported]
      /** Query response to return to the client */
    91-104: interface QueryProcessorConfig [exported]
      refs out: 4 [type: 4]
        - src/daemon/query-processor.ts:93: type Database -> external
        - src/daemon/query-processor.ts:95: type DaemonConfig -> src/config/types.ts
        - src/daemon/query-processor.ts:97: type ProcessorLogger -> src/daemon/processor.ts
        - src/daemon/query-processor.ts:101: type EmbeddingProvider -> src/daemon/facet-discovery.ts
  function:
    109-188: async processQuery(request: QueryRequest, config: QueryProcessorConfig): Promise<QueryResponse> [exported]
      /** Process a natural language query against the knowledge graph */
      refs out: 12 [call: 8, type: 4]
        - src/daemon/query-processor.ts:110: type QueryRequest -> src/daemon/query-processor.ts
        - src/daemon/query-processor.ts:111: type QueryProcessorConfig -> src/daemon/query-processor.ts
        - src/daemon/query-processor.ts:112: type Promise -> external
        - src/daemon/query-processor.ts:112: type QueryResponse -> src/daemon/query-processor.ts
        - src/daemon/query-processor.ts:116: call info -> src/daemon/processor.ts
        - src/daemon/query-processor.ts:116: call slice -> external
        - src/daemon/query-processor.ts:129: call info -> src/daemon/processor.ts
        - src/daemon/query-processor.ts:164: call error -> src/daemon/processor.ts
        - src/daemon/query-processor.ts:169: call map -> external
        - src/daemon/query-processor.ts:180: call map -> external
  imports:
    - ../config/types.js
    - ../storage/database.js
    - ../storage/node-crud.js
    - ../storage/node-queries.js
    - ../storage/quirk-repository.js
    - ../storage/search-repository.js
    - ../storage/semantic-search.js
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

src/daemon/queue.ts [1-787]
  class:
    151-742: class QueueManager [exported]
      /** Manages the analysis job queue Thread-safe queue operations backed by SQLite with optimistic locking. */
  interface:
    37-50: interface JobContext [exported]
      /** Additional context for analysis jobs */
    53-88: interface AnalysisJob [exported]
      /** Analysis job structure */
      refs out: 3 [type: 3]
        - src/daemon/queue.ts:57: type JobType -> src/daemon/queue.ts
        - src/daemon/queue.ts:67: type JobContext -> src/daemon/queue.ts
        - src/daemon/queue.ts:69: type JobStatus -> src/daemon/queue.ts
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
      refs out: 2 [type: 2]
        - src/daemon/queue.ts:91: type Omit -> external
        - src/daemon/queue.ts:92: type AnalysisJob -> src/daemon/queue.ts
  function:
    753-755: generateJobId(): string [exported]
      /** Generate a unique job ID Uses the same format as node IDs: 16-char hex string */
      refs out: 3 [call: 3]
        - src/daemon/queue.ts:754: call slice -> external
        - src/daemon/queue.ts:754: call replaceAll -> external
        - src/daemon/queue.ts:754: call randomUUID -> external
    760-762: createQueueManager(db: Database.Database): QueueManager [exported]
      /** Create a queue manager from a database */
      refs out: 3 [instantiate: 1, type: 2]
        - src/daemon/queue.ts:760: type Database -> external
        - src/daemon/queue.ts:760: type QueueManager -> src/daemon/queue.ts
        - src/daemon/queue.ts:761: instantiate QueueManager -> src/daemon/queue.ts
    768-786: getQueueStatusSummary(db: Database.Database): { stats: QueueStats; pendingJobs: {}; runningJobs: {}; recentFailed: {}; } [exported]
      /** Get aggregated queue status Used by CLI and API */
      refs out: 5 [type: 5]
        - src/daemon/queue.ts:768: type Database -> external
        - src/daemon/queue.ts:769: type QueueStats -> src/daemon/queue.ts
        - src/daemon/queue.ts:770: type AnalysisJob -> src/daemon/queue.ts
        - src/daemon/queue.ts:771: type AnalysisJob -> src/daemon/queue.ts
        - src/daemon/queue.ts:772: type AnalysisJob -> src/daemon/queue.ts
  variable:
    23-34: PRIORITY [exported]
      /** Priority levels (lower = higher priority) */
      refs out: 1 [type: 1]
        - src/daemon/queue.ts:34: type const -> external
  imports:
    - better-sqlite3

src/daemon/scheduler.test.ts [1-967]
  imports:
    - ./queue.js
    - ./scheduler.js
    - better-sqlite3
    - vitest

src/daemon/scheduler.ts [1-978]
  class:
    163-904: class Scheduler [exported]
      /** Scheduler manages cron-based scheduled jobs */
  interface:
    59-66: interface ScheduledJobResult [exported]
      /** Result of a scheduled job execution */
      refs out: 3 [type: 3]
        - src/daemon/scheduler.ts:60: type ScheduledJobType -> src/daemon/scheduler.ts
        - src/daemon/scheduler.ts:61: type Date -> external
        - src/daemon/scheduler.ts:62: type Date -> external
    69-74: interface SchedulerLogger [exported]
      /** Logger interface for scheduler */
    95-146: interface SchedulerConfig [exported]
      /** Scheduler configuration */
    149-158: interface SchedulerStatus [exported]
      /** Scheduler state */
      refs out: 4 [type: 4]
        - src/daemon/scheduler.ts:152: type ScheduledJobType -> src/daemon/scheduler.ts
        - src/daemon/scheduler.ts:154: type Date -> external
        - src/daemon/scheduler.ts:155: type Date -> external
        - src/daemon/scheduler.ts:156: type ScheduledJobResult -> src/daemon/scheduler.ts
  type:
    51-56: ScheduledJobType = | "reanalysis"
  | "connection_discovery"
  | "pattern_aggregation"
  | "clustering"
  | "backfill_embeddings" [exported]
      /** Job types that can be scheduled */
  function:
    909-939: createScheduler(config: DaemonConfig, queue: QueueManager, db: Database.Database, logger?: SchedulerLogger): Scheduler [exported]
      /** Create a scheduler from daemon config */
      refs out: 6 [instantiate: 1, type: 5]
        - src/daemon/scheduler.ts:910: type DaemonConfig -> src/config/types.ts
        - src/daemon/scheduler.ts:911: type QueueManager -> src/daemon/queue.ts
        - src/daemon/scheduler.ts:912: type Database -> external
        - src/daemon/scheduler.ts:913: type SchedulerLogger -> src/daemon/scheduler.ts
        - src/daemon/scheduler.ts:914: type Scheduler -> src/daemon/scheduler.ts
        - src/daemon/scheduler.ts:915: instantiate Scheduler -> src/daemon/scheduler.ts
    945-955: isValidCronExpression(expression: string): boolean [exported]
      /** Validate a cron expression Returns true if valid, false otherwise */
      refs out: 1 [call: 1]
        - src/daemon/scheduler.ts:950: call Cron.stop -> external
    960-977: getNextRunTimes(expression: string, count = 5): {} [exported]
      /** Get the next N run times for a cron expression */
      refs out: 4 [call: 3, type: 1]
        - src/daemon/scheduler.ts:960: type Date -> external
        - src/daemon/scheduler.ts:968: call push -> external
        - src/daemon/scheduler.ts:969: call Cron.nextRun -> external
        - src/daemon/scheduler.ts:972: call Cron.stop -> external
  variable:
    78-83: SchedulerLogger [exported]
      /** Default no-op logger */
      refs out: 1 [type: 1]
        - src/daemon/scheduler.ts:78: type SchedulerLogger -> src/daemon/scheduler.ts
    87-92: SchedulerLogger [exported]
      /** Console logger for production use */
      refs out: 5 [call: 4, type: 1]
        - src/daemon/scheduler.ts:87: type SchedulerLogger -> src/daemon/scheduler.ts
        - src/daemon/scheduler.ts:88: call log -> external
        - src/daemon/scheduler.ts:89: call warn -> external
        - src/daemon/scheduler.ts:90: call error -> external
        - src/daemon/scheduler.ts:91: call debug -> external
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

src/daemon/semantic-search.integration.test.ts [1-323]
  imports:
    - ../config/types.js
    - ../storage/database.js
    - ../storage/embedding-utils.js
    - ../storage/node-crud.js
    - ../types/index.js
    - ./facet-discovery.js
    - ./query-processor.js
    - better-sqlite3
    - node:child_process
    - vitest

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

src/daemon/watcher.test.ts [1-844]
  imports:
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

src/daemon/worker.test.ts [1-539]
  imports:
    - ../config/types.js
    - ../storage/database.js
    - ../storage/embedding-utils.js
    - ./queue.js
    - ./worker.js
    - better-sqlite3
    - node:fs
    - node:os
    - node:path
    - vitest

src/daemon/worker.ts [1-717]
  class:
    126-656: class Worker [exported]
      /** Worker that processes jobs from the analysis queue */
  interface:
    66-83: interface WorkerConfig [exported]
      /** Worker configuration */
      refs out: 11 [type: 11]
        - src/daemon/worker.ts:70: type PiBrainConfig -> src/config/types.ts
        - src/daemon/worker.ts:72: type RetryPolicy -> src/daemon/errors.ts
        - src/daemon/worker.ts:74: type ProcessorLogger -> src/daemon/processor.ts
        - src/daemon/worker.ts:76: type AnalysisJob -> src/daemon/queue.ts
        - src/daemon/worker.ts:76: type Promise -> external
        - src/daemon/worker.ts:78: type AnalysisJob -> src/daemon/queue.ts
        - src/daemon/worker.ts:78: type Node -> src/types/index.ts
        - src/daemon/worker.ts:78: type Promise -> external
        - src/daemon/worker.ts:80: type AnalysisJob -> src/daemon/queue.ts
        - src/daemon/worker.ts:80: type Error -> external
    86-101: interface WorkerStatus [exported]
      /** Worker status */
      refs out: 2 [type: 2]
        - src/daemon/worker.ts:92: type AnalysisJob -> src/daemon/queue.ts
        - src/daemon/worker.ts:100: type Date -> external
    104-117: interface JobProcessingResult [exported]
      /** Result from processing a single job */
      refs out: 2 [type: 2]
        - src/daemon/worker.ts:108: type AnalysisJob -> src/daemon/queue.ts
        - src/daemon/worker.ts:112: type Error -> external
  function:
    665-667: createWorker(config: WorkerConfig): Worker [exported]
      /** Create a worker instance */
      refs out: 3 [instantiate: 1, type: 2]
        - src/daemon/worker.ts:665: type WorkerConfig -> src/daemon/worker.ts
        - src/daemon/worker.ts:665: type Worker -> src/daemon/worker.ts
        - src/daemon/worker.ts:666: instantiate Worker -> src/daemon/worker.ts
    673-687: processSingleJob(job: AnalysisJob, config: PiBrainConfig, db: Database.Database, logger?: ProcessorLogger): Promise<JobProcessingResult> [exported]
      /** Process a single job without the full worker loop Useful for one-off processing or testing */
      refs out: 8 [call: 2, type: 6]
        - src/daemon/worker.ts:674: type AnalysisJob -> src/daemon/queue.ts
        - src/daemon/worker.ts:675: type PiBrainConfig -> src/config/types.ts
        - src/daemon/worker.ts:676: type Database -> external
        - src/daemon/worker.ts:677: type ProcessorLogger -> src/daemon/processor.ts
        - src/daemon/worker.ts:678: type Promise -> external
        - src/daemon/worker.ts:678: type JobProcessingResult -> src/daemon/worker.ts
        - src/daemon/worker.ts:685: call Worker.initialize -> src/daemon/worker.ts
        - src/daemon/worker.ts:686: call Worker.processJob -> src/daemon/worker.ts
    692-716: handleJobError(error: Error, job: AnalysisJob, retryPolicy: RetryPolicy = DEFAULT_RETRY_POLICY): { shouldRetry: boolean; retryDelayMinutes: number; formattedError: string; category: ReturnType<any>; } [exported]
      /** Handle job error manually (for custom queue implementations) */
      refs out: 6 [call: 2, type: 4]
        - src/daemon/worker.ts:693: type Error -> external
        - src/daemon/worker.ts:694: type AnalysisJob -> src/daemon/queue.ts
        - src/daemon/worker.ts:695: type RetryPolicy -> src/daemon/errors.ts
        - src/daemon/worker.ts:700: type ReturnType -> external
        - src/daemon/worker.ts:712: call ceil -> external
        - src/daemon/worker.ts:713: call formatErrorForStorage -> src/daemon/errors.ts
  imports:
    - ../config/config.js
    - ../config/types.js
    - ../parser/index.js
    - ../prompt/prompt.js
    - ../storage/embedding-utils.js
    - ../storage/index.js
    - ../storage/node-conversion.js
    - ../storage/node-types.js
    - ./connection-discovery.js
    - ./errors.js
    - ./facet-discovery.js
    - ./processor.js
    - ./queue.js
    - better-sqlite3
    - node:path

src/parser/analyzer.ts [1-336]
  function:
    16-18: getDefaultSessionDir(): string [exported]
      /** Default session directory */
      refs out: 2 [call: 2]
        - src/parser/analyzer.ts:17: call join -> external
        - src/parser/analyzer.ts:17: call homedir -> external
    31-43: async scanSessions(sessionDir?: string): Promise<{}> [exported]
      /** Scan session directory and parse all sessions Note: This function loads all sessions into memory. For large session histories (thousands of sessions), consider using `scanSessionsIterator` which processes sessions one at a time. */
      refs out: 6 [call: 4, type: 2]
        - src/parser/analyzer.ts:33: type Promise -> external
        - src/parser/analyzer.ts:33: type SessionInfo -> src/types.ts
        - src/parser/analyzer.ts:35: call scanSessionsIterator -> src/parser/analyzer.ts
        - src/parser/analyzer.ts:36: call push -> external
        - src/parser/analyzer.ts:40: call sort -> external
        - src/parser/analyzer.ts:40: call localeCompare -> external
    60-102: async *scanSessionsIterator(sessionDir?: string): AsyncGenerator<SessionInfo, void, unknown> [exported]
      /** Async generator that yields sessions one at a time for memory efficiency Use this instead of `scanSessions` when processing large session histories (hundreds or thousands of sessions) to avoid loading all sessions into memory. Sessions are yielded in file system order, not sorted by timestamp. */
      refs out: 7 [call: 4, instantiate: 1, type: 2]
        - src/parser/analyzer.ts:62: type AsyncGenerator -> external
        - src/parser/analyzer.ts:62: type SessionInfo -> src/types.ts
        - src/parser/analyzer.ts:72: call isDirectory -> external
        - src/parser/analyzer.ts:80: call endsWith -> external
        - src/parser/analyzer.ts:89: call warn -> external
        - src/parser/analyzer.ts:93: call warn -> external
        - src/parser/analyzer.ts:97: instantiate Error -> external
    107-127: findForkRelationships(sessions: SessionInfo[]): {} [exported]
      /** Find fork relationships between sessions */
      refs out: 5 [call: 3, type: 2]
        - src/parser/analyzer.ts:108: type SessionInfo -> src/types.ts
        - src/parser/analyzer.ts:109: type ForkRelationship -> src/types.ts
        - src/parser/analyzer.ts:114: call push -> external
        - src/parser/analyzer.ts:124: call sort -> external
        - src/parser/analyzer.ts:124: call localeCompare -> external
    132-164: groupByProject(sessions: SessionInfo[]): {} [exported]
      /** Group sessions by project (cwd) */
      refs out: 11 [call: 9, type: 2]
        - src/parser/analyzer.ts:132: type SessionInfo -> src/types.ts
        - src/parser/analyzer.ts:132: type ProjectGroup -> src/types.ts
        - src/parser/analyzer.ts:137: call has -> external
        - src/parser/analyzer.ts:138: call set -> external
        - src/parser/analyzer.ts:140: call push -> external
        - src/parser/analyzer.ts:140: call get -> external
        - src/parser/analyzer.ts:146: call sort -> external
        - src/parser/analyzer.ts:147: call localeCompare -> external
        - src/parser/analyzer.ts:150: call push -> external
        - src/parser/analyzer.ts:153: call reduce -> external
    185-196: decodeProjectDir(encodedName: string): string [exported]
      /** Decode project directory name to path e.g., "--home-will-projects-myapp--" → "/home/will/projects/myapp" **Warning**: Pi's encoding is lossy - hyphens in original paths are not escaped. This means "--home-will-projects-pi-brain--" could be either: - /home/will/projects/pi-brain (correct) - /home/will/projects/pi/brain (wrong) Prefer using session.header.cwd which contains the accurate original path. This function is only useful for display purposes when session data is unavailable. */
      refs out: 3 [call: 3]
        - src/parser/analyzer.ts:186: call startsWith -> external
        - src/parser/analyzer.ts:186: call endsWith -> external
        - src/parser/analyzer.ts:195: call replaceAll -> external
    210-217: getProjectName(sessionPath: string): string [exported]
      /** Get project name from session path */
      refs out: 2 [call: 2]
        - src/parser/analyzer.ts:214: call decodeProjectDir -> src/parser/analyzer.ts
        - src/parser/analyzer.ts:216: call basename -> external
    228-230: getProjectNameFromSession(session: SessionInfo): string [exported]
      /** Get project name from a SessionInfo object (preferred over getProjectName) This function returns the accurate project path from the session header, which is not affected by the lossy directory name encoding. */
      refs out: 1 [type: 1]
        - src/parser/analyzer.ts:228: type SessionInfo -> src/types.ts
    235-240: filterByProject(sessions: SessionInfo[], projectPath: string): {} [exported]
      /** Filter sessions by project path */
      refs out: 3 [call: 1, type: 2]
        - src/parser/analyzer.ts:236: type SessionInfo -> src/types.ts
        - src/parser/analyzer.ts:238: type SessionInfo -> src/types.ts
        - src/parser/analyzer.ts:239: call filter -> external
    245-260: filterByDateRange(sessions: SessionInfo[], startDate?: Date, endDate?: Date): {} [exported]
      /** Filter sessions by date range */
      refs out: 5 [call: 1, type: 4]
        - src/parser/analyzer.ts:246: type SessionInfo -> src/types.ts
        - src/parser/analyzer.ts:247: type Date -> external
        - src/parser/analyzer.ts:248: type Date -> external
        - src/parser/analyzer.ts:249: type SessionInfo -> src/types.ts
        - src/parser/analyzer.ts:250: call filter -> external
    265-294: searchSessions(sessions: SessionInfo[], query: string): {} [exported]
      /** Search sessions for text content */
      refs out: 9 [call: 7, type: 2]
        - src/parser/analyzer.ts:266: type SessionInfo -> src/types.ts
        - src/parser/analyzer.ts:268: type SessionInfo -> src/types.ts
        - src/parser/analyzer.ts:276: call includes -> external
        - src/parser/analyzer.ts:276: call toLowerCase -> external
        - src/parser/analyzer.ts:277: call push -> external
        - src/parser/analyzer.ts:281: call includes -> external
        - src/parser/analyzer.ts:281: call toLowerCase -> external
        - src/parser/analyzer.ts:282: call push -> external
        - src/parser/analyzer.ts:289: call push -> external
    299-335: getOverallStats(sessions: SessionInfo[]): { totalSessions: number; totalEntries: number; totalMessages: number; totalTokens: number; totalCost: number; projectCount: number; forkCount: number; } [exported]
      /** Get session summary statistics */
      refs out: 2 [call: 1, type: 1]
        - src/parser/analyzer.ts:299: type SessionInfo -> src/types.ts
        - src/parser/analyzer.ts:316: call add -> external
  imports:
    - ../types.js
    - ./session.js
    - node:fs/promises
    - node:os
    - node:path

src/parser/boundary.test.ts [1-776]
  imports:
    - ../types.js
    - ./boundary.js
    - vitest

src/parser/boundary.ts [1-573]
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
    535-539: interface BoundaryStats [exported]
      /** Get boundary statistics for a session */
      refs out: 2 [type: 2]
        - src/parser/boundary.ts:537: type Record -> external
        - src/parser/boundary.ts:537: type BoundaryType -> src/parser/boundary.ts
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
      refs out: 14 [call: 11, type: 3]
        - src/parser/boundary.ts:305: type SessionEntry -> src/types.ts
        - src/parser/boundary.ts:306: type BoundaryOptions -> src/parser/boundary.ts
        - src/parser/boundary.ts:307: type Boundary -> src/parser/boundary.ts
        - src/parser/boundary.ts:318: call has -> external
        - src/parser/boundary.ts:325: call push -> external
        - src/parser/boundary.ts:339: call push -> external
        - src/parser/boundary.ts:354: call push -> external
        - src/parser/boundary.ts:358: call LeafTracker.getCurrentLeaf -> src/parser/boundary.ts
        - src/parser/boundary.ts:379: call push -> external
        - src/parser/boundary.ts:383: call LeafTracker.getPreviousEntryId -> src/parser/boundary.ts
    474-530: extractSegments(entries: SessionEntry[], options: BoundaryOptions = {}): {} [exported]
      /** Extract segments from entries based on detected boundaries A segment is a contiguous span of entries. Boundaries define the split points. */
      refs out: 9 [call: 6, type: 3]
        - src/parser/boundary.ts:475: type SessionEntry -> src/types.ts
        - src/parser/boundary.ts:476: type BoundaryOptions -> src/parser/boundary.ts
        - src/parser/boundary.ts:477: type Segment -> src/parser/boundary.ts
        - src/parser/boundary.ts:495: call push -> external
        - src/parser/boundary.ts:496: call set -> external
        - src/parser/boundary.ts:515: call push -> external
        - src/parser/boundary.ts:515: call createSegment -> src/parser/boundary.ts
        - src/parser/boundary.ts:526: call push -> external
        - src/parser/boundary.ts:526: call createSegment -> src/parser/boundary.ts
    548-572: getBoundaryStats(entries: SessionEntry[], options: BoundaryOptions = {}): BoundaryStats [exported]
      /** Calculate statistics about boundaries in a session */
      refs out: 3 [type: 3]
        - src/parser/boundary.ts:549: type SessionEntry -> src/types.ts
        - src/parser/boundary.ts:550: type BoundaryOptions -> src/parser/boundary.ts
        - src/parser/boundary.ts:551: type BoundaryStats -> src/parser/boundary.ts
  variable:
    98-98: 10 [exported]
      /** Default minimum gap in minutes to trigger a resume boundary. Can be overridden via BoundaryOptions.resumeGapMinutes. */
  imports:
    - ../types.js

src/parser/fork.test.ts [1-401]
  imports:
    - ../types.js
    - ./fork.js
    - vitest

src/parser/fork.ts [1-191]
  interface:
    22-33: interface ForkInfo [exported]
      /** Result of detecting a fork from a session header */
  function:
    46-57: isForkSession(header: SessionHeader, sessionPath: string): ForkInfo [exported]
      /** Check if a session is a fork (has parentSession in header) */
      refs out: 2 [type: 2]
        - src/parser/fork.ts:47: type SessionHeader -> src/types.ts
        - src/parser/fork.ts:49: type ForkInfo -> src/parser/fork.ts
    70-85: findForks(sessions: SessionInfo[]): {} [exported]
      /** Find all fork relationships from a list of parsed sessions Note: Similar to analyzer.ts:findForkRelationships() but without sorting. The analyzer version sorts by timestamp; this version preserves input order. Both are exported to avoid circular imports that would exceed the barrel file module limit. */
      refs out: 3 [call: 1, type: 2]
        - src/parser/fork.ts:70: type SessionInfo -> src/types.ts
        - src/parser/fork.ts:70: type ForkRelationship -> src/types.ts
        - src/parser/fork.ts:75: call push -> external
    94-111: findForksFromHeaders(headers: [string, SessionHeader][]): {} [exported]
      /** Find fork relationships given just session headers and paths Useful when you don't have fully parsed sessions */
      refs out: 3 [call: 1, type: 2]
        - src/parser/fork.ts:95: type SessionHeader -> src/types.ts
        - src/parser/fork.ts:96: type ForkRelationship -> src/types.ts
        - src/parser/fork.ts:101: call push -> external
    119-131: buildForkTree(forks: ForkRelationship[]): Map<string, {}> [exported]
      /** Build a map of session paths to their fork children */
      refs out: 4 [call: 2, type: 2]
        - src/parser/fork.ts:120: type ForkRelationship -> src/types.ts
        - src/parser/fork.ts:121: type Map -> external
        - src/parser/fork.ts:126: call push -> external
        - src/parser/fork.ts:127: call set -> external
    140-159: getForkChain(sessionPath: string, forks: ForkRelationship[]): {} [exported]
      /** Get the fork chain for a session (all ancestors via fork) */
      refs out: 4 [call: 3, type: 1]
        - src/parser/fork.ts:142: type ForkRelationship -> src/types.ts
        - src/parser/fork.ts:147: call set -> external
        - src/parser/fork.ts:154: call unshift -> external
        - src/parser/fork.ts:155: call get -> external
    168-190: getForkDescendants(sessionPath: string, forks: ForkRelationship[]): {} [exported]
      /** Get all descendants of a session via forks */
      refs out: 3 [call: 2, type: 1]
        - src/parser/fork.ts:170: type ForkRelationship -> src/types.ts
        - src/parser/fork.ts:184: call push -> external
        - src/parser/fork.ts:185: call push -> external
  imports:
    - ../types.js

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
    - ../types.js
    - ./session.js
    - vitest

src/parser/session.ts [1-419]
  function:
    25-28: async parseSession(filePath: string): Promise<SessionInfo> [exported]
      /** Parse a session JSONL file */
      refs out: 3 [call: 1, type: 2]
        - src/parser/session.ts:25: type Promise -> external
        - src/parser/session.ts:25: type SessionInfo -> src/types.ts
        - src/parser/session.ts:27: call parseSessionContent -> src/parser/session.ts
    33-82: parseSessionContent(content: string, filePath: string): SessionInfo [exported]
      /** Parse session content from string */
      refs out: 5 [call: 2, instantiate: 2, type: 1]
        - src/parser/session.ts:36: type SessionInfo -> src/types.ts
        - src/parser/session.ts:39: instantiate Error -> external
        - src/parser/session.ts:45: instantiate Error -> external
        - src/parser/session.ts:59: call push -> external
        - src/parser/session.ts:61: call warn -> external
    87-180: buildTree(entries: SessionEntry[]): any [exported]
      /** Build a tree structure from entries */
      refs out: 17 [call: 15, type: 2]
        - src/parser/session.ts:87: type SessionEntry -> src/types.ts
        - src/parser/session.ts:87: type TreeNode -> src/types.ts
        - src/parser/session.ts:95: call set -> external
        - src/parser/session.ts:102: call has -> external
        - src/parser/session.ts:103: call set -> external
        - src/parser/session.ts:107: call push -> external
        - src/parser/session.ts:112: call values -> external
        - src/parser/session.ts:113: call sort -> external
        - src/parser/session.ts:113: call localeCompare -> external
        - src/parser/session.ts:122: call has -> external
    186-210: findLeaf(entries: SessionEntry[]): string [exported]
      /** Find the current leaf entry ID The leaf is the latest entry that has no children */
      refs out: 3 [call: 2, type: 1]
        - src/parser/session.ts:186: type SessionEntry -> src/types.ts
        - src/parser/session.ts:195: call add -> external
        - src/parser/session.ts:202: call has -> external
    215-227: findBranchPoints(entries: SessionEntry[]): {} [exported]
      /** Find branch points (entries with multiple children) */
      refs out: 6 [call: 5, type: 1]
        - src/parser/session.ts:215: type SessionEntry -> src/types.ts
        - src/parser/session.ts:220: call set -> external
        - src/parser/session.ts:220: call get -> external
        - src/parser/session.ts:224: call map -> external
        - src/parser/session.ts:224: call filter -> external
        - src/parser/session.ts:224: call entries -> external
    232-304: calculateStats(entries: SessionEntry[], tree: TreeNode | null): SessionStats [exported]
      /** Calculate session statistics */
      refs out: 4 [call: 1, type: 3]
        - src/parser/session.ts:233: type SessionEntry -> src/types.ts
        - src/parser/session.ts:234: type TreeNode -> src/types.ts
        - src/parser/session.ts:235: type SessionStats -> src/types.ts
        - src/parser/session.ts:258: call add -> external
    351-370: extractTextPreview(message: UserMessage | AssistantMessage, maxLength = 100): string [exported]
      /** Extract text preview from a message */
      refs out: 6 [call: 3, type: 3]
        - src/parser/session.ts:352: type UserMessage -> src/types.ts
        - src/parser/session.ts:352: type AssistantMessage -> src/types.ts
        - src/parser/session.ts:358: call truncate -> src/parser/session.ts
        - src/parser/session.ts:361: call isArray -> external
        - src/parser/session.ts:364: call truncate -> src/parser/session.ts
        - src/parser/session.ts:364: type TextContent -> src/types.ts
    386-408: getPathToEntry(entries: SessionEntry[], targetId: string): {} [exported]
      /** Get the path from root to a specific entry */
      refs out: 4 [call: 2, type: 2]
        - src/parser/session.ts:387: type SessionEntry -> src/types.ts
        - src/parser/session.ts:389: type SessionEntry -> src/types.ts
        - src/parser/session.ts:392: call set -> external
        - src/parser/session.ts:403: call unshift -> external
    413-418: getEntry(entries: SessionEntry[], id: string): any [exported]
      /** Get entry by ID */
      refs out: 3 [call: 1, type: 2]
        - src/parser/session.ts:414: type SessionEntry -> src/types.ts
        - src/parser/session.ts:416: type SessionEntry -> src/types.ts
        - src/parser/session.ts:417: call find -> external
  imports:
    - ../types.js
    - node:fs/promises

src/parser/signals.test.ts [1-1260]
  imports:
    - ../types.js
    - ./signals.js
    - vitest

src/parser/signals.ts [1-1095]
  interface:
    555-564: interface FrictionDetectionOptions [exported]
      /** Options for friction detection */
    1067-1070: interface DelightDetectionOptions [exported]
      /** Options for delight detection */
  function:
    126-163: countRephrasingCascades(entries: SessionEntry[]): number [exported]
      /** Count rephrasing cascades in a segment A rephrasing cascade is 3+ consecutive user messages without a meaningful assistant response (no tool calls, no substantial text). */
      refs out: 1 [type: 1]
        - src/parser/signals.ts:126: type SessionEntry -> src/types.ts
    190-220: countToolLoops(entries: SessionEntry[]): number [exported]
      /** Count tool loops in a segment A tool loop is when the same tool fails with the same error type 3+ times. */
      refs out: 2 [call: 1, type: 1]
        - src/parser/signals.ts:190: type SessionEntry -> src/types.ts
        - src/parser/signals.ts:210: call set -> external
    292-342: countContextChurn(entries: SessionEntry[]): number [exported]
      /** Count context churn events Context churn is high frequency of read/ls operations on different files, indicating the user is fighting the context window. */
      refs out: 7 [call: 6, type: 1]
        - src/parser/signals.ts:292: type SessionEntry -> src/types.ts
        - src/parser/signals.ts:315: call has -> external
        - src/parser/signals.ts:316: call add -> external
        - src/parser/signals.ts:325: call startsWith -> external
        - src/parser/signals.ts:327: call has -> external
        - src/parser/signals.ts:328: call add -> external
        - src/parser/signals.ts:340: call floor -> external
    349-381: detectModelSwitch(entries: SessionEntry[], previousSegmentModel?: string): string [exported]
      /** Detect if a model switch occurred for this segment Returns the model switched FROM if this segment is a retry with a different model. */
      refs out: 1 [type: 1]
        - src/parser/signals.ts:350: type SessionEntry -> src/types.ts
    389-436: detectSilentTermination(entries: SessionEntry[], isLastSegment: boolean, wasResumed: boolean): boolean [exported]
      /** Detect silent termination Session ends mid-task (no handoff, no success) and is not resumed. This is detected by checking if the last entry shows incomplete work. */
      refs out: 2 [call: 1, type: 1]
        - src/parser/signals.ts:390: type SessionEntry -> src/types.ts
        - src/parser/signals.ts:428: call hasGenuineSuccessIndicator -> src/parser/signals.ts
    479-507: extractManualFlags(entries: SessionEntry[]): {} [exported]
      /** Extract manual flags from session entries Looks for custom entries with type 'brain_flag' */
      refs out: 4 [call: 1, type: 3]
        - src/parser/signals.ts:479: type SessionEntry -> src/types.ts
        - src/parser/signals.ts:479: type ManualFlag -> src/types/index.ts
        - src/parser/signals.ts:497: call push -> external
        - src/parser/signals.ts:498: type ManualFlag -> src/types/index.ts
    518-546: calculateFrictionScore(friction: FrictionSignals): number [exported]
      /** Calculate overall friction score (0.0-1.0) Weights different friction signals based on severity. */
      refs out: 5 [call: 4, type: 1]
        - src/parser/signals.ts:518: type FrictionSignals -> src/types/index.ts
        - src/parser/signals.ts:522: call min -> external
        - src/parser/signals.ts:525: call min -> external
        - src/parser/signals.ts:528: call min -> external
        - src/parser/signals.ts:545: call min -> external
    569-601: detectFrictionSignals(entries: SessionEntry[], options: FrictionDetectionOptions = {}): FrictionSignals [exported]
      /** Detect all friction signals in a session segment */
      refs out: 4 [call: 1, type: 3]
        - src/parser/signals.ts:570: type SessionEntry -> src/types.ts
        - src/parser/signals.ts:571: type FrictionDetectionOptions -> src/parser/signals.ts
        - src/parser/signals.ts:572: type FrictionSignals -> src/types/index.ts
        - src/parser/signals.ts:598: call calculateFrictionScore -> src/parser/signals.ts
    611-642: getFilesTouched(entries: SessionEntry[]): Set<string> [exported]
      /** Check if a segment touches similar files to another segment (for abandoned restart detection) */
      refs out: 4 [call: 2, type: 2]
        - src/parser/signals.ts:611: type SessionEntry -> src/types.ts
        - src/parser/signals.ts:611: type Set -> external
        - src/parser/signals.ts:631: call add -> external
        - src/parser/signals.ts:634: call add -> external
    647-665: hasFileOverlap(files1: Set<string>, files2: Set<string>, threshold = 0.3): boolean [exported]
      /** Check if two sets of files have significant overlap */
      refs out: 3 [call: 1, type: 2]
        - src/parser/signals.ts:648: type Set -> external
        - src/parser/signals.ts:649: type Set -> external
        - src/parser/signals.ts:658: call has -> external
    670-700: getPrimaryModel(entries: SessionEntry[]): string [exported]
      /** Get the primary model used in a segment */
      refs out: 3 [call: 2, type: 1]
        - src/parser/signals.ts:670: type SessionEntry -> src/types.ts
        - src/parser/signals.ts:684: call set -> external
        - src/parser/signals.ts:684: call get -> external
    705-714: getSegmentTimestamp(entries: SessionEntry[]): string [exported]
      /** Get segment timestamp for abandoned restart detection */
      refs out: 1 [type: 1]
        - src/parser/signals.ts:706: type SessionEntry -> src/types.ts
    724-758: isAbandonedRestart(segmentA: { entries: SessionEntry[]; outcome: string; endTime: string }, segmentB: { entries: SessionEntry[]; startTime: string }): boolean [exported]
      /** Check if segment B is an abandoned restart of segment A Criteria: - Segment A has outcome 'abandoned' - Segment B starts within 30 minutes of segment A ending - Both segments touch similar files */
      refs out: 5 [call: 3, type: 2]
        - src/parser/signals.ts:725: type SessionEntry -> src/types.ts
        - src/parser/signals.ts:726: type SessionEntry -> src/types.ts
        - src/parser/signals.ts:743: call isNaN -> external
        - src/parser/signals.ts:743: call isNaN -> external
        - src/parser/signals.ts:757: call hasFileOverlap -> src/parser/signals.ts
    771-810: isAbandonedRestartFromNode(previousNode: {
    outcome: string;
    timestamp: string;
    filesTouched: string[];
  }, currentStartTime: string, currentFilesTouched: string[]): boolean [exported]
      /** Check if a current segment is an abandoned restart of a previous node. This is similar to `isAbandonedRestart` but works with already-computed node data (with filesTouched arrays) instead of raw session entries. Criteria: - Previous node has outcome 'abandoned' - Current segment starts within 30 minutes of previous node's timestamp - Both touch similar files (30% overlap threshold) */
      refs out: 3 [call: 3]
        - src/parser/signals.ts:795: call isNaN -> external
        - src/parser/signals.ts:795: call isNaN -> external
        - src/parser/signals.ts:809: call hasFileOverlap -> src/parser/signals.ts
    822-864: detectResilientRecovery(entries: SessionEntry[]): boolean [exported]
      /** Detect resilient recovery Tool error occurs, but the model fixes it WITHOUT user intervention, and the task ultimately succeeds. */
      refs out: 2 [call: 1, type: 1]
        - src/parser/signals.ts:822: type SessionEntry -> src/types.ts
        - src/parser/signals.ts:855: call isMinimalAcknowledgment -> src/parser/signals.ts
    894-941: detectOneShotSuccess(entries: SessionEntry[]): boolean [exported]
      /** Detect one-shot success Complex task (multiple tool calls) completed with zero user corrections/rephrasings. */
      refs out: 2 [call: 1, type: 1]
        - src/parser/signals.ts:894: type SessionEntry -> src/types.ts
        - src/parser/signals.ts:927: call isUserCorrection -> src/parser/signals.ts
    982-1005: detectExplicitPraise(entries: SessionEntry[]): boolean [exported]
      /** Detect explicit praise from user User says "great job", "perfect", "thanks", etc. */
      refs out: 2 [call: 1, type: 1]
        - src/parser/signals.ts:982: type SessionEntry -> src/types.ts
        - src/parser/signals.ts:998: call hasGenuinePraise -> src/parser/signals.ts
    1039-1058: calculateDelightScore(delight: DelightSignals): number [exported]
      /** Calculate overall delight score (0.0-1.0) Weights different delight signals based on significance. */
      refs out: 2 [call: 1, type: 1]
        - src/parser/signals.ts:1039: type DelightSignals -> src/types/index.ts
        - src/parser/signals.ts:1057: call min -> external
    1075-1094: detectDelightSignals(entries: SessionEntry[], _options: DelightDetectionOptions = {}): DelightSignals [exported]
      /** Detect all delight signals in a session segment */
      refs out: 4 [call: 1, type: 3]
        - src/parser/signals.ts:1076: type SessionEntry -> src/types.ts
        - src/parser/signals.ts:1077: type DelightDetectionOptions -> src/parser/signals.ts
        - src/parser/signals.ts:1078: type DelightSignals -> src/types/index.ts
        - src/parser/signals.ts:1091: call calculateDelightScore -> src/parser/signals.ts
  imports:
    - ../types.js
    - ../types/index.js

---
Files: 41
Estimated tokens: 20,977 (codebase: ~1,159,465)
