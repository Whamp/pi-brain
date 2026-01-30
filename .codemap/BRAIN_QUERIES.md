# Project Overview

## Languages
- typescript: 63 files

## Statistics
- Total files: 63
- Total symbols: 340
  - function: 193
  - interface: 100
  - variable: 20
  - type: 18
  - class: 9

---

src/daemon/cli.test.ts [1-90]
  imports:
    - ./cli.js
    - node:fs
    - vitest

src/daemon/cli.ts [1-1337]
  interface:
    114-120: interface DaemonStatus [exported]
      /** Daemon status info */
      refs in: 3 [reexport: 1, type: 2]
        - src/daemon/cli.ts:593: type getDaemonStatus
        - src/daemon/cli.ts:961: type formatDaemonStatus
        - src/daemon/index.ts:133: reexport (module)
    123-128: interface QueueStatus [exported]
      /** Queue status info */
      refs in: 3 [reexport: 1, type: 2]
        - src/daemon/cli.ts:614: type getQueueStatus
        - src/daemon/cli.ts:1033: type formatQueueStatus
        - src/daemon/index.ts:134: reexport (module)
    131-136: interface HealthCheckResult [exported]
      /** Health check result */
      refs in: 9 [reexport: 1, type: 8]
        - src/daemon/cli.ts:142: type HealthStatus
        - src/daemon/cli.ts:710: type checkPiCli
        - src/daemon/cli.ts:752: type checkRequiredSkills
        - src/daemon/cli.ts:782: type checkOptionalSkills
        - src/daemon/cli.ts:812: type checkSessionsDir
        - src/daemon/cli.ts:867: type checkDatabaseAccess
        - src/daemon/cli.ts:900: type checkPromptFile
        - src/daemon/cli.ts:1071: type getHealthIcon
        - src/daemon/index.ts:135: reexport (module)
    139-143: interface HealthStatus [exported]
      /** Overall health status */
      refs in: 3 [reexport: 1, type: 2]
        - src/daemon/cli.ts:923: type runHealthChecks
        - src/daemon/cli.ts:1082: type formatHealthStatus
        - src/daemon/index.ts:136: reexport (module)
    146-149: interface OutputOptions [exported]
      /** CLI output options */
      refs in: 4 [reexport: 1, type: 3]
        - src/daemon/cli.ts:962: type formatDaemonStatus
        - src/daemon/cli.ts:1034: type formatQueueStatus
        - src/daemon/cli.ts:1083: type formatHealthStatus
        - src/daemon/index.ts:137: reexport (module)
    276-280: interface StartOptions [exported]
      /** Start options */
      refs in: 2 [reexport: 1, type: 1]
        - src/daemon/cli.ts:485: type startDaemon
        - src/daemon/index.ts:138: reexport (module)
    283-286: interface StopOptions [exported]
      /** Stop options */
      refs in: 2 [reexport: 1, type: 1]
        - src/daemon/cli.ts:553: type stopDaemon
        - src/daemon/index.ts:139: reexport (module)
  function:
    61-70: isPortAvailable(port: number): Promise<boolean> [exported]
      /** Check if a port is available */
      refs in: 1 [call: 1]
        - src/daemon/cli.ts:459: call portAvailable
    75-88: findProcessOnPort(port: number): number [exported]
      /** Find process using a port (Linux/macOS) */
      refs in: 1 [call: 1]
        - src/daemon/cli.ts:302: call existingPid
    158-169: readPidFile(): number [exported]
      /** Read the daemon PID from the PID file */
      refs in: 2 [call: 1, reexport: 1]
        - src/daemon/cli.ts:212: call pid
        - src/daemon/index.ts:115: reexport (module)
    174-180: writePidFile(pid: number): void [exported]
      /** Write the daemon PID to the PID file */
      refs in: 5 [call: 3, import: 1, reexport: 1]
        - src/daemon/cli.ts:422: call spawnBackgroundDaemon
        - src/daemon/cli.ts:505: call startDaemon
        - src/daemon/daemon-process.ts:19: import (module)
        - src/daemon/daemon-process.ts:103: call main
        - src/daemon/index.ts:116: reexport (module)
    185-193: removePidFile(): void [exported]
      /** Remove the PID file */
      refs in: 10 [call: 8, import: 1, reexport: 1]
        - src/daemon/cli.ts:222: call isDaemonRunning
        - src/daemon/cli.ts:334: call killExistingDaemon
        - src/daemon/cli.ts:429: call spawnBackgroundDaemon
        - src/daemon/cli.ts:541: call handleKillError
        - src/daemon/cli.ts:574: call stopDaemon
        - src/daemon/cli.ts:580: call stopDaemon
        - src/daemon/daemon-process.ts:19: import (module)
        - src/daemon/daemon-process.ts:312: call shutdown
        - src/daemon/daemon-process.ts:335: call (module)
        - src/daemon/index.ts:117: reexport (module)
    198-206: isProcessRunning(pid: number): boolean [exported]
      /** Check if a process with the given PID is running */
      refs in: 4 [call: 3, reexport: 1]
        - src/daemon/cli.ts:217: call isDaemonRunning
        - src/daemon/cli.ts:428: call spawnBackgroundDaemon
        - src/daemon/cli.ts:525: call waitForProcessStop
        - src/daemon/index.ts:118: reexport (module)
    211-224: isDaemonRunning(): { running: boolean; pid: number; } [exported]
      /** Check if the daemon is currently running */
      refs in: 6 [call: 5, reexport: 1]
        - src/daemon/cli.ts:490: call status
        - src/daemon/cli.ts:559: call status
        - src/daemon/cli.ts:594: call { running, pid }
        - src/daemon/cli.ts:1128: call { running }
        - src/daemon/cli.ts:1256: call { running }
        - src/daemon/index.ts:119: reexport (module)
    233-254: formatUptime(seconds: number): string [exported]
      /** Format uptime in a human-readable way */
      refs in: 2 [call: 1, reexport: 1]
        - src/daemon/cli.ts:596: call uptimeFormatted
        - src/daemon/index.ts:120: reexport (module)
    259-269: getProcessUptime(): number [exported]
      /** Get process uptime (approximate based on PID file modification time) */
      refs in: 2 [call: 1, reexport: 1]
        - src/daemon/cli.ts:595: call uptime
        - src/daemon/index.ts:121: reexport (module)
    484-514: async startDaemon(options: StartOptions = {}): Promise<DaemonResult> [exported]
      /** Start the daemon process */
      refs in: 1 [reexport: 1]
        - src/daemon/index.ts:122: reexport (module)
    553-588: async stopDaemon(options: StopOptions = {}): Promise<{ success: boolean; message: string; }> [exported]
      /** Stop the daemon process */
      refs in: 1 [reexport: 1]
        - src/daemon/index.ts:123: reexport (module)
    593-605: getDaemonStatus(configPath?: string): DaemonStatus [exported]
      /** Get daemon status information */
      refs in: 1 [reexport: 1]
        - src/daemon/index.ts:124: reexport (module)
    614-643: getQueueStatus(configPath?: string): QueueStatus [exported]
      /** Get queue status information */
      refs in: 1 [reexport: 1]
        - src/daemon/index.ts:125: reexport (module)
    648-701: queueAnalysis(sessionPath: string, configPath?: string): { success: boolean; message: string; jobId?: string; } [exported]
      /** Queue a session for analysis */
      refs in: 1 [reexport: 1]
        - src/daemon/index.ts:126: reexport (module)
    921-951: async runHealthChecks(configPath?: string): Promise<HealthStatus> [exported]
      /** Run all health checks */
      refs in: 1 [reexport: 1]
        - src/daemon/index.ts:127: reexport (module)
    960-981: formatDaemonStatus(status: DaemonStatus, _options: OutputOptions = {}): string [exported]
      /** Format daemon status for display */
      refs in: 1 [reexport: 1]
        - src/daemon/index.ts:128: reexport (module)
    1032-1066: formatQueueStatus(queueStatus: QueueStatus, _options: OutputOptions = {}): string [exported]
      /** Format queue status for display */
      refs in: 1 [reexport: 1]
        - src/daemon/index.ts:129: reexport (module)
    1081-1104: formatHealthStatus(status: HealthStatus, _options: OutputOptions = {}): string [exported]
      /** Format health check results for display */
      refs in: 1 [reexport: 1]
        - src/daemon/index.ts:130: reexport (module)
    1119-1239: rebuildIndex(configPath?: string): { success: boolean; message: string; count: number; } [exported]
      /** Rebuild the SQLite index from JSON files */
      refs in: 1 [reexport: 1]
        - src/daemon/index.ts:131: reexport (module)
    1244-1326: async rebuildEmbeddings(configPath?: string, options: { force?: boolean } = {}): Promise<{ success: boolean; message: string; count: number; }> [exported]
      /** Rebuild embeddings for all nodes */
      refs in: 3 [call: 1, import: 1, reexport: 1]
        - src/daemon/cli.test.ts:4: import (module)
        - src/daemon/cli.test.ts:81: call result
        - src/daemon/index.ts:132: reexport (module)
  variable:
    108-108: any [exported]
      /** PID file location */
      refs in: 1 [reexport: 1]
        - src/daemon/index.ts:113: reexport (module)
    111-111: any [exported]
      /** Log file location */
      refs in: 1 [reexport: 1]
        - src/daemon/index.ts:114: reexport (module)
  imports:
    - ../config/config.js
    - ../config/types.js
    - ../storage/database.js
    - ../storage/embedding-utils.js
    - ../storage/node-crud.js
    - ../storage/node-storage.js
    - ./facet-discovery.js
    - ./processor.js
    - ./queue.js
    - node:child_process
    - node:fs
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
      refs in: 7 [import: 2, instantiate: 2, reexport: 1, type: 2]
        - src/daemon/connection-discovery.test.ts:5: import (module)
        - src/daemon/connection-discovery.test.ts:39: type discoverer
        - src/daemon/connection-discovery.test.ts:78: instantiate (module)
        - src/daemon/index.ts:159: reexport (module)
        - src/daemon/worker.ts:39: import (module)
        - src/daemon/worker.ts:149: type Worker.connectionDiscoverer
        - src/daemon/worker.ts:182: instantiate Worker.initialize
  interface:
    137-142: interface ConnectionResult [exported]
      refs in: 2 [reexport: 1, type: 1]
        - src/daemon/connection-discovery.ts:198: type ConnectionDiscoverer.discover
        - src/daemon/index.ts:160: reexport (module)
  imports:
    - ../storage/edge-repository.js
    - ../storage/node-crud.js
    - ../storage/node-queries.js
    - ../types/index.js
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

src/daemon/errors.test.ts [1-493]
  imports:
    - ./errors.js
    - vitest

src/daemon/errors.ts [1-457]
  interface:
    15-24: interface RetryPolicy [exported]
      /** Retry policy configuration */
      refs in: 13 [import: 2, reexport: 1, type: 10]
        - src/daemon/errors.test.ts:23: import (module)
        - src/daemon/errors.test.ts:224: type policy
        - src/daemon/errors.test.ts:249: type policy
        - src/daemon/errors.test.ts:301: type policy
        - src/daemon/errors.ts:73: type DEFAULT_RETRY_POLICY
        - src/daemon/errors.ts:282: type classifyErrorWithContext
        - src/daemon/errors.ts:319: type calculateRetryDelay
        - src/daemon/errors.ts:331: type calculateRetryDelayMinutes
        - src/daemon/index.ts:95: reexport (module)
        - src/daemon/worker.ts:44: import (module)
    55-66: interface ClassifiedError [exported]
      /** Classified error with metadata */
      refs in: 2 [reexport: 1, type: 1]
        - src/daemon/errors.ts:283: type classifyErrorWithContext
        - src/daemon/index.ts:98: reexport (module)
  type:
    27-27: ErrorCategoryType = "transient" | "permanent" | "unknown" [exported]
      /** Error category types */
      refs in: 5 [reexport: 1, type: 4]
        - src/daemon/errors.ts:377: type parseStoredError
        - src/daemon/errors.ts:385: type parseStoredError
        - src/daemon/errors.ts:418: type createTypedError
        - src/daemon/errors.ts:420: type prefixes
        - src/daemon/index.ts:97: reexport (module)
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
      refs in: 6 [reexport: 1, type: 5]
        - src/daemon/errors.ts:59: type ClassifiedError
        - src/daemon/errors.ts:90: type ERROR_PATTERNS
        - src/daemon/errors.ts:254: type classifyError
        - src/daemon/errors.ts:343: type formatErrorDescription
        - src/daemon/errors.ts:358: type formatErrorForStorage
        - src/daemon/index.ts:96: reexport (module)
  function:
    251-273: classifyError(error: Error, _context?: JobContext): ErrorCategory [exported]
      /** Classify an error to determine retry behavior */
      refs in: 27 [call: 24, import: 2, reexport: 1]
        - src/daemon/errors.test.ts:10: import (module)
        - src/daemon/errors.test.ts:34: call category
        - src/daemon/errors.test.ts:43: call category
        - src/daemon/errors.test.ts:51: call category
        - src/daemon/errors.test.ts:60: call category
        - src/daemon/errors.test.ts:69: call category
        - src/daemon/errors.test.ts:78: call category
        - src/daemon/errors.test.ts:89: call category
        - src/daemon/errors.test.ts:98: call category
        - src/daemon/errors.test.ts:106: call category
    278-308: classifyErrorWithContext(error: Error, retryCount: number, maxRetries: number, policy: RetryPolicy = DEFAULT_RETRY_POLICY): ClassifiedError [exported]
      /** Classify an error with full context */
      refs in: 13 [call: 10, import: 2, reexport: 1]
        - src/daemon/errors.test.ts:11: import (module)
        - src/daemon/errors.test.ts:269: call first
        - src/daemon/errors.test.ts:274: call atMax
        - src/daemon/errors.test.ts:283: call result
        - src/daemon/errors.test.ts:287: call atLimit
        - src/daemon/errors.test.ts:294: call result
        - src/daemon/errors.test.ts:308: call result
        - src/daemon/errors.test.ts:313: call transient
        - src/daemon/errors.test.ts:317: call permanent
        - src/daemon/index.ts:81: reexport (module)
    317-324: calculateRetryDelay(retryCount: number, policy: RetryPolicy = DEFAULT_RETRY_POLICY): number [exported]
      /** Calculate retry delay with exponential backoff */
      refs in: 14 [call: 12, import: 1, reexport: 1]
        - src/daemon/errors.test.ts:8: import (module)
        - src/daemon/errors.test.ts:207: call delay
        - src/daemon/errors.test.ts:212: call (module)
        - src/daemon/errors.test.ts:213: call (module)
        - src/daemon/errors.test.ts:214: call (module)
        - src/daemon/errors.test.ts:215: call (module)
        - src/daemon/errors.test.ts:219: call delay
        - src/daemon/errors.test.ts:231: call (module)
        - src/daemon/errors.test.ts:232: call (module)
        - src/daemon/errors.test.ts:233: call (module)
    329-334: calculateRetryDelayMinutes(retryCount: number, policy: RetryPolicy = DEFAULT_RETRY_POLICY): number [exported]
      /** Calculate retry delay in minutes (for queue integration) */
      refs in: 6 [call: 4, import: 1, reexport: 1]
        - src/daemon/errors.test.ts:9: import (module)
        - src/daemon/errors.test.ts:241: call (module)
        - src/daemon/errors.test.ts:243: call (module)
        - src/daemon/errors.test.ts:245: call (module)
        - src/daemon/errors.test.ts:256: call (module)
        - src/daemon/index.ts:83: reexport (module)
    356-370: formatErrorForStorage(error: Error, category?: ErrorCategory): string [exported]
      /** Format error for storage in database */
      refs in: 9 [call: 6, import: 2, reexport: 1]
        - src/daemon/errors.test.ts:19: import (module)
        - src/daemon/errors.test.ts:334: call stored
        - src/daemon/errors.test.ts:344: call stored
        - src/daemon/errors.test.ts:358: call stored
        - src/daemon/errors.test.ts:366: call stored
        - src/daemon/index.ts:84: reexport (module)
        - src/daemon/worker.ts:43: import (module)
        - src/daemon/worker.ts:731: call Worker.storedError
        - src/daemon/worker.ts:870: call handleJobError
    375-393: parseStoredError(stored: string): { timestamp: string; type: ErrorCategoryType; reason: string; message: string; stack?: string; } [exported]
      /** Parse stored error back to object */
      refs in: 7 [call: 4, import: 2, reexport: 1]
        - src/api/routes/daemon.ts:16: import (module)
        - src/api/routes/daemon.ts:247: call parsedError
        - src/daemon/errors.test.ts:22: import (module)
        - src/daemon/errors.test.ts:383: call parsed
        - src/daemon/errors.test.ts:390: call (module)
        - src/daemon/errors.test.ts:391: call (module)
        - src/daemon/index.ts:85: reexport (module)
    402-404: isRetryableError(error: Error): boolean [exported]
      /** Check if an error is retryable */
      refs in: 10 [call: 8, import: 1, reexport: 1]
        - src/daemon/errors.test.ts:21: import (module)
        - src/daemon/errors.test.ts:401: call (module)
        - src/daemon/errors.test.ts:402: call (module)
        - src/daemon/errors.test.ts:403: call (module)
        - src/daemon/errors.test.ts:407: call (module)
        - src/daemon/errors.test.ts:411: call (module)
        - src/daemon/errors.test.ts:412: call (module)
        - src/daemon/errors.test.ts:464: call (module)
        - src/daemon/errors.test.ts:471: call (module)
        - src/daemon/index.ts:86: reexport (module)
    409-411: isPermanentError(error: Error): boolean [exported]
      /** Check if an error is permanent */
      refs in: 10 [call: 8, import: 1, reexport: 1]
        - src/daemon/errors.test.ts:20: import (module)
        - src/daemon/errors.test.ts:418: call (module)
        - src/daemon/errors.test.ts:419: call (module)
        - src/daemon/errors.test.ts:420: call (module)
        - src/daemon/errors.test.ts:424: call (module)
        - src/daemon/errors.test.ts:425: call (module)
        - src/daemon/errors.test.ts:451: call (module)
        - src/daemon/errors.test.ts:457: call (module)
        - src/daemon/errors.test.ts:477: call (module)
        - src/daemon/index.ts:87: reexport (module)
    416-426: createTypedError(message: string, type: ErrorCategoryType): Error [exported]
      /** Create a typed error with a specific category */
      refs in: 5 [call: 3, import: 1, reexport: 1]
        - src/daemon/errors.test.ts:16: import (module)
        - src/daemon/errors.test.ts:431: call permanent
        - src/daemon/errors.test.ts:434: call transient
        - src/daemon/errors.test.ts:437: call unknown
        - src/daemon/index.ts:88: reexport (module)
    433-435: createFileNotFoundError(path: string): Error [exported]
      /** Create a "file not found" error */
      refs in: 3 [call: 1, import: 1, reexport: 1]
        - src/daemon/errors.test.ts:12: import (module)
        - src/daemon/errors.test.ts:448: call error
        - src/daemon/index.ts:89: reexport (module)
    438-440: createInvalidSessionError(reason: string): Error [exported]
      /** Create a "session invalid" error */
      refs in: 3 [call: 1, import: 1, reexport: 1]
        - src/daemon/errors.test.ts:13: import (module)
        - src/daemon/errors.test.ts:455: call error
        - src/daemon/index.ts:90: reexport (module)
    443-445: createTimeoutError(durationMinutes: number): Error [exported]
      /** Create a "timeout" error */
      refs in: 3 [call: 1, import: 1, reexport: 1]
        - src/daemon/errors.test.ts:15: import (module)
        - src/daemon/errors.test.ts:461: call error
        - src/daemon/index.ts:91: reexport (module)
    448-451: createRateLimitError(retryAfter?: number): Error [exported]
      /** Create a "rate limit" error */
      refs in: 3 [call: 1, import: 1, reexport: 1]
        - src/daemon/errors.test.ts:14: import (module)
        - src/daemon/errors.test.ts:468: call error
        - src/daemon/index.ts:92: reexport (module)
    454-456: createValidationError(details: string): Error [exported]
      /** Create a "validation" error */
      refs in: 3 [call: 1, import: 1, reexport: 1]
        - src/daemon/errors.test.ts:17: import (module)
        - src/daemon/errors.test.ts:475: call error
        - src/daemon/index.ts:93: reexport (module)
  variable:
    73-78: RetryPolicy [exported]
      /** Default retry policy */
      refs in: 3 [import: 2, reexport: 1]
        - src/daemon/errors.test.ts:18: import (module)
        - src/daemon/index.ts:94: reexport (module)
        - src/daemon/worker.ts:45: import (module)
  imports:
    - ./queue.js

src/daemon/export.ts [1-175]
  function:
    17-30: getSegmentEntries(entries: SessionEntry[], startId: string, endId: string): {} [exported]
      /** Extract entries within a segment range */
      refs in: 1 [call: 1]
        - src/daemon/export.ts:97: call segmentEntries
    121-174: async exportFineTuneData(outputPath: string, configPath?: string): Promise<{ success: boolean; message: string; count: number; }> [exported]
      /** Export fine-tuning data to JSONL Format: { "input": <JSON string of segment entries>, "output": <JSON string of node analysis> } */
  imports:
    - ../config/index.js
    - ../parser/session.js
    - ../storage/node-storage.js
    - ../types/index.js
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
      refs in: 11 [import: 2, instantiate: 5, reexport: 1, type: 3]
        - src/daemon/facet-discovery.test.ts:17: import (module)
        - src/daemon/facet-discovery.test.ts:301: type discovery
        - src/daemon/facet-discovery.test.ts:310: instantiate (module)
        - src/daemon/facet-discovery.test.ts:697: type discovery
        - src/daemon/facet-discovery.test.ts:704: instantiate (module)
        - src/daemon/facet-discovery.test.ts:747: type discovery
        - src/daemon/facet-discovery.test.ts:754: instantiate (module)
        - src/daemon/facet-discovery.test.ts:852: instantiate discoveryWithMore
        - src/daemon/index.ts:168: reexport (module)
        - src/daemon/scheduler.ts:31: import (module)
  interface:
    99-108: interface ClusterAnalysisConfig [exported]
      /** Configuration for LLM cluster analysis */
      refs in: 5 [reexport: 1, type: 4]
        - src/daemon/facet-discovery.ts:1366: type FacetDiscovery.analyzeClusters
        - src/daemon/facet-discovery.ts:1409: type FacetDiscovery.validateClusterAnalysisConfig
        - src/daemon/facet-discovery.ts:1454: type FacetDiscovery.analyzeCluster
        - src/daemon/facet-discovery.ts:1601: type FacetDiscovery.invokeClusterAnalysisAgent
        - src/daemon/index.ts:174: reexport (module)
    113-121: interface ClusterAnalysisResult [exported]
      /** Result from analyzing a single cluster */
      refs in: 5 [reexport: 1, type: 4]
        - src/daemon/facet-discovery.ts:130: type ClusterAnalysisBatchResult
        - src/daemon/facet-discovery.ts:1378: type FacetDiscovery.results
        - src/daemon/facet-discovery.ts:1433: type FacetDiscovery.processAnalysisResult
        - src/daemon/facet-discovery.ts:1455: type FacetDiscovery.analyzeCluster
        - src/daemon/index.ts:175: reexport (module)
    126-131: interface ClusterAnalysisBatchResult [exported]
      /** Result from analyzing multiple clusters */
      refs in: 2 [reexport: 1, type: 1]
        - src/daemon/facet-discovery.ts:1368: type FacetDiscovery.analyzeClusters
        - src/daemon/index.ts:176: reexport (module)
    140-144: interface EmbeddingProvider [exported]
      /** Interface for embedding providers */
      refs in: 34 [import: 7, reexport: 1, type: 26]
        - src/api/routes/query.ts:14: import (module)
        - src/api/routes/query.ts:62: type cachedEmbeddingProvider
        - src/api/routes/query.ts:75: type getEmbeddingProvider
        - src/api/routes/query.ts:176: type embeddingProvider
        - src/daemon/facet-discovery.ts:150: type isEmbeddingProvider
        - src/daemon/facet-discovery.ts:151: type isEmbeddingProvider
        - src/daemon/facet-discovery.ts:153: type isEmbeddingProvider
        - src/daemon/facet-discovery.ts:154: type isEmbeddingProvider
        - src/daemon/facet-discovery.ts:155: type isEmbeddingProvider
        - src/daemon/facet-discovery.ts:164: type createEmbeddingProvider
    755-759: interface FacetDiscoveryLogger [exported]
      refs in: 4 [reexport: 1, type: 3]
        - src/daemon/facet-discovery.ts:762: type noopLogger
        - src/daemon/facet-discovery.ts:772: type FacetDiscovery.logger
        - src/daemon/facet-discovery.ts:778: type FacetDiscovery.constructor
        - src/daemon/index.ts:173: reexport (module)
  function:
    162-198: createEmbeddingProvider(config: EmbeddingConfig): EmbeddingProvider [exported]
      /** Create an embedding provider from config */
      refs in: 13 [call: 7, import: 5, reexport: 1]
        - src/api/routes/query.ts:13: import (module)
        - src/api/routes/query.ts:103: call getEmbeddingProvider
        - src/daemon/cli.ts:40: import (module)
        - src/daemon/cli.ts:1271: call provider
        - src/daemon/facet-discovery.test.ts:15: import (module)
        - src/daemon/facet-discovery.test.ts:81: call (module)
        - src/daemon/facet-discovery.test.ts:90: call (module)
        - src/daemon/facet-discovery.ts:783: call FacetDiscovery.constructor
        - src/daemon/index.ts:169: reexport (module)
        - src/daemon/scheduler.ts:30: import (module)
    331-355: createMockEmbeddingProvider(dims = 384): EmbeddingProvider [exported]
      /** Create mock embedding provider for testing only. Not exposed in EmbeddingConfig - use createMockEmbeddingProvider() directly in tests. */
      refs in: 16 [call: 14, import: 2]
        - src/daemon/facet-discovery.test.ts:16: import (module)
        - src/daemon/facet-discovery.test.ts:100: call provider
        - src/daemon/facet-discovery.test.ts:107: call provider
        - src/daemon/facet-discovery.test.ts:117: call provider
        - src/daemon/facet-discovery.test.ts:127: call provider
        - src/daemon/facet-discovery.test.ts:309: call (module)
        - src/daemon/facet-discovery.test.ts:704: call (module)
        - src/daemon/facet-discovery.test.ts:754: call (module)
        - src/daemon/facet-discovery.test.ts:854: call discoveryWithMore
        - src/daemon/worker.test.ts:23: import (module)
    473-500: kMeansClustering(embeddings: number[][], k: number, maxIterations = 100): KMeansResult [exported]
      /** Simple K-means++ clustering implementation */
      refs in: 8 [call: 6, import: 1, reexport: 1]
        - src/daemon/facet-discovery.test.ts:19: import (module)
        - src/daemon/facet-discovery.test.ts:142: call result
        - src/daemon/facet-discovery.test.ts:152: call result
        - src/daemon/facet-discovery.test.ts:174: call result
        - src/daemon/facet-discovery.test.ts:194: call result
        - src/daemon/facet-discovery.test.ts:205: call result
        - src/daemon/facet-discovery.ts:1051: call FacetDiscovery.result
        - src/daemon/index.ts:170: reexport (module)
    543-562: hdbscanClustering(embeddings: number[][], minClusterSize = 3, minSamples = 3): {} [exported]
      /** HDBSCAN-like density-based clustering (simplified) */
      refs in: 10 [call: 8, import: 1, reexport: 1]
        - src/daemon/facet-discovery.test.ts:18: import (module)
        - src/daemon/facet-discovery.test.ts:218: call labels
        - src/daemon/facet-discovery.test.ts:224: call labels
        - src/daemon/facet-discovery.test.ts:244: call labels
        - src/daemon/facet-discovery.test.ts:270: call labels
        - src/daemon/facet-discovery.test.ts:290: call labels6
        - src/daemon/facet-discovery.test.ts:670: call labels
        - src/daemon/facet-discovery.test.ts:686: call labels
        - src/daemon/facet-discovery.ts:1055: call FacetDiscovery.clusterEmbeddings
        - src/daemon/index.ts:171: reexport (module)
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
      refs in: 1 [type: 1]
        - src/daemon/graph-export.ts:28: type exportGraphviz
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

src/daemon/insight-aggregation.ts [1-628]
  class:
    149-627: class InsightAggregator [exported]
      refs in: 11 [import: 2, instantiate: 8, type: 1]
        - src/daemon/insight-aggregation.test.ts:14: import (module)
        - src/daemon/insight-aggregation.test.ts:185: instantiate aggregator
        - src/daemon/insight-aggregation.test.ts:236: instantiate aggregator
        - src/daemon/insight-aggregation.test.ts:272: instantiate aggregator
        - src/daemon/insight-aggregation.test.ts:384: instantiate aggregator
        - src/daemon/insight-aggregation.test.ts:472: instantiate aggregator
        - src/daemon/insight-aggregation.test.ts:492: instantiate aggregator
        - src/daemon/insight-aggregation.test.ts:552: instantiate aggregator
        - src/daemon/scheduler.ts:34: import (module)
        - src/daemon/scheduler.ts:176: type Scheduler.insightAggregator
  imports:
    - ../storage/node-storage.js
    - ../types/index.js
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
      refs in: 7 [import: 2, instantiate: 2, reexport: 1, type: 2]
        - src/daemon/index.ts:164: reexport (module)
        - src/daemon/pattern-aggregation.test.ts:4: import (module)
        - src/daemon/pattern-aggregation.test.ts:21: type aggregator
        - src/daemon/pattern-aggregation.test.ts:81: instantiate (module)
        - src/daemon/scheduler.ts:35: import (module)
        - src/daemon/scheduler.ts:175: type Scheduler.patternAggregator
        - src/daemon/scheduler.ts:184: instantiate Scheduler.constructor
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

src/daemon/processor.ts [1-857]
  class:
    795-849: class JobProcessor [exported]
      /** Job processor that invokes pi agents for analysis */
      refs in: 8 [import: 1, instantiate: 1, reexport: 1, type: 5]
        - src/daemon/index.ts:56: reexport (module)
        - src/daemon/processor.ts:854: type createProcessor
        - src/daemon/processor.ts:855: instantiate createProcessor
        - src/daemon/worker.ts:54: import (module)
        - src/daemon/worker.ts:148: type Worker.processor
        - src/daemon/worker.ts:486: type Worker.storeRelationships
        - src/daemon/worker.ts:513: type Worker.processAnalysisResult
        - src/daemon/worker.ts:588: type Worker.createNodeFromResult
  interface:
    21-34: interface AgentResult [exported]
      /** Result from invoking the pi agent */
      refs in: 4 [reexport: 1, type: 3]
        - src/daemon/index.ts:71: reexport (module)
        - src/daemon/processor.ts:391: type invokeAgent
        - src/daemon/processor.ts:604: type parseAgentOutput
        - src/daemon/processor.ts:807: type JobProcessor.process
    37-118: interface AgentNodeOutput [exported]
      /** Output schema from the session analyzer (matches session-analyzer.md) */
      refs in: 10 [import: 2, reexport: 1, type: 7]
        - src/daemon/index.ts:72: reexport (module)
        - src/daemon/processor.test.ts:26: import (module)
        - src/daemon/processor.test.ts:49: type createValidNodeOutput
        - src/daemon/processor.ts:27: type AgentResult
        - src/daemon/processor.ts:679: type extractNodeFromText
        - src/daemon/processor.ts:684: type parsed
        - src/daemon/processor.ts:698: type parsed
        - src/daemon/processor.ts:763: type isValidNodeOutput
        - src/storage/node-conversion.ts:8: import (module)
        - src/storage/node-conversion.ts:55: type agentOutputToNode
    121-143: interface RelationshipOutput [exported]
      /** Output schema for relationships extracted by the session analyzer */
      refs in: 13 [import: 1, type: 12]
        - src/daemon/processor.ts:117: type AgentNodeOutput
        - src/storage/relationship-edges.test.ts:12: import (module)
        - src/storage/relationship-edges.test.ts:84: type rel
        - src/storage/relationship-edges.test.ts:96: type rel
        - src/storage/relationship-edges.test.ts:108: type rel
        - src/storage/relationship-edges.test.ts:111: type rel
        - src/storage/relationship-edges.test.ts:125: type rel
        - src/storage/relationship-edges.test.ts:142: type rel
        - src/storage/relationship-edges.test.ts:159: type rel
        - src/storage/relationship-edges.test.ts:178: type relationships
    155-159: interface SkillInfo [exported]
      /** Skill availability information */
      refs in: 4 [reexport: 1, type: 3]
        - src/daemon/index.ts:73: reexport (module)
        - src/daemon/processor.ts:216: type getSkillAvailability
        - src/daemon/processor.ts:217: type availability
        - src/daemon/processor.ts:287: type collectAvailableSkills
    162-167: interface ProcessorLogger [exported]
      /** Logger interface for processor */
      refs in: 26 [import: 3, reexport: 1, type: 22]
        - src/daemon/index.ts:74: reexport (module)
        - src/daemon/processor.test.ts:27: import (module)
        - src/daemon/processor.test.ts:107: type silentLogger
        - src/daemon/processor.ts:170: type consoleLogger
        - src/daemon/processor.ts:390: type invokeAgent
        - src/daemon/processor.ts:512: type spawnPiProcess
        - src/daemon/processor.ts:603: type parseAgentOutput
        - src/daemon/processor.ts:678: type extractNodeFromText
        - src/daemon/processor.ts:789: type ProcessorConfig
        - src/daemon/processor.ts:797: type JobProcessor.logger
    239-246: interface EnvironmentValidationResult [exported]
      /** Result of environment validation */
      refs in: 2 [type: 2]
        - src/daemon/processor.ts:252: type validateRequiredSkills
        - src/daemon/processor.ts:829: type JobProcessor.validateEnvironment
    785-790: interface ProcessorConfig [exported]
      /** Processor configuration */
      refs in: 3 [reexport: 1, type: 2]
        - src/daemon/index.ts:75: reexport (module)
        - src/daemon/processor.ts:799: type JobProcessor.constructor
        - src/daemon/processor.ts:854: type createProcessor
  function:
    203-211: async checkSkillAvailable(skillName: string): Promise<boolean> [exported]
      /** Check if a skill is available by looking for SKILL.md */
      refs in: 9 [call: 6, import: 2, reexport: 1]
        - src/daemon/cli.ts:42: import (module)
        - src/daemon/cli.ts:756: call available
        - src/daemon/cli.ts:786: call available
        - src/daemon/index.ts:65: reexport (module)
        - src/daemon/processor.test.ts:14: import (module)
        - src/daemon/processor.test.ts:555: call available
        - src/daemon/processor.test.ts:561: call available
        - src/daemon/processor.test.ts:658: call rlmAvailable
        - src/daemon/processor.ts:226: call available
    216-236: async getSkillAvailability(): Promise<Map<string, SkillInfo>> [exported]
      /** Get availability information for all skills */
      refs in: 6 [call: 4, import: 1, reexport: 1]
        - src/daemon/index.ts:64: reexport (module)
        - src/daemon/processor.test.ts:19: import (module)
        - src/daemon/processor.test.ts:570: call availability
        - src/daemon/processor.test.ts:592: call availability
        - src/daemon/processor.ts:253: call skills
        - src/daemon/processor.ts:300: call skills
    252-264: async validateRequiredSkills(): Promise<EnvironmentValidationResult> [exported]
      /** Validate that all required skills are available Returns validation result instead of throwing */
      refs in: 2 [call: 1, reexport: 1]
        - src/daemon/index.ts:66: reexport (module)
        - src/daemon/processor.ts:831: call JobProcessor.skillsResult
    299-313: async buildSkillsArg(sessionFile?: string): Promise<string> [exported]
      /** Build the skills argument for pi invocation Returns comma-separated list of available skills RLM skill is only included for files larger than RLM_SIZE_THRESHOLD to avoid confusing smaller models with RLM instructions. */
      refs in: 7 [call: 5, import: 1, reexport: 1]
        - src/daemon/index.ts:63: reexport (module)
        - src/daemon/processor.test.ts:13: import (module)
        - src/daemon/processor.test.ts:606: call skills
        - src/daemon/processor.test.ts:611: call skills
        - src/daemon/processor.test.ts:638: call skills
        - src/daemon/processor.test.ts:656: call skills
        - src/daemon/processor.ts:421: call skills
    322-354: buildAnalysisPrompt(job: AnalysisJob): string [exported]
      /** Build the analysis prompt for a job */
      refs in: 10 [call: 8, import: 1, reexport: 1]
        - src/daemon/index.ts:62: reexport (module)
        - src/daemon/processor.test.ts:12: import (module)
        - src/daemon/processor.test.ts:121: call prompt
        - src/daemon/processor.test.ts:133: call prompt
        - src/daemon/processor.test.ts:142: call prompt
        - src/daemon/processor.test.ts:151: call prompt
        - src/daemon/processor.test.ts:164: call prompt
        - src/daemon/processor.test.ts:177: call prompt
        - src/daemon/processor.test.ts:189: call prompt
        - src/daemon/processor.ts:425: call prompt
    387-495: async invokeAgent(job: AnalysisJob, config: DaemonConfig, logger: ProcessorLogger = consoleLogger): Promise<AgentResult> [exported]
      /** Invoke the pi agent to analyze a session */
      refs in: 2 [call: 1, reexport: 1]
        - src/daemon/index.ts:58: reexport (module)
        - src/daemon/processor.ts:812: call JobProcessor.result
    601-670: parseAgentOutput(stdout: string, logger: ProcessorLogger = consoleLogger): Omit<AgentResult, "exitCode" | "durationMs"> [exported]
      /** Parse the pi agent's JSON mode output */
      refs in: 12 [call: 10, import: 1, reexport: 1]
        - src/daemon/index.ts:59: reexport (module)
        - src/daemon/processor.test.ts:22: import (module)
        - src/daemon/processor.test.ts:397: call result
        - src/daemon/processor.test.ts:421: call result
        - src/daemon/processor.test.ts:429: call result
        - src/daemon/processor.test.ts:437: call result
        - src/daemon/processor.test.ts:448: call result
        - src/daemon/processor.test.ts:464: call result
        - src/daemon/processor.test.ts:488: call result
        - src/daemon/processor.test.ts:516: call result
    676-709: extractNodeFromText(text: string, logger: ProcessorLogger = consoleLogger): AgentNodeOutput [exported]
      /** Extract node JSON from text content Handles both raw JSON and code-fenced JSON */
      refs in: 10 [call: 8, import: 1, reexport: 1]
        - src/daemon/index.ts:60: reexport (module)
        - src/daemon/processor.test.ts:18: import (module)
        - src/daemon/processor.test.ts:306: call result
        - src/daemon/processor.test.ts:318: call result
        - src/daemon/processor.test.ts:327: call result
        - src/daemon/processor.test.ts:334: call result
        - src/daemon/processor.test.ts:343: call result
        - src/daemon/processor.test.ts:348: call result
        - src/daemon/processor.test.ts:365: call result
        - src/daemon/processor.ts:655: call nodeData
    763-778: isValidNodeOutput(obj: unknown): boolean [exported]
      /** Basic validation that output matches expected schema */
      refs in: 19 [call: 17, import: 1, reexport: 1]
        - src/daemon/index.ts:61: reexport (module)
        - src/daemon/processor.test.ts:20: import (module)
        - src/daemon/processor.test.ts:203: call (module)
        - src/daemon/processor.test.ts:207: call (module)
        - src/daemon/processor.test.ts:211: call (module)
        - src/daemon/processor.test.ts:212: call (module)
        - src/daemon/processor.test.ts:219: call (module)
        - src/daemon/processor.test.ts:226: call (module)
        - src/daemon/processor.test.ts:233: call (module)
        - src/daemon/processor.test.ts:240: call (module)
    854-856: createProcessor(config: ProcessorConfig): JobProcessor [exported]
      /** Create a job processor */
      refs in: 5 [call: 2, import: 2, reexport: 1]
        - src/daemon/index.ts:57: reexport (module)
        - src/daemon/processor.test.ts:17: import (module)
        - src/daemon/processor.test.ts:677: call processor
        - src/daemon/worker.ts:53: import (module)
        - src/daemon/worker.ts:178: call Worker.initialize
  variable:
    170-175: ProcessorLogger [exported]
      /** Default console logger */
      refs in: 4 [import: 3, reexport: 1]
        - src/daemon/index.ts:67: reexport (module)
        - src/daemon/processor.test.ts:16: import (module)
        - src/daemon/query-processor.ts:31: import (module)
        - src/daemon/worker.ts:52: import (module)
    182-182: readonly [] [exported]
      /** Required skills for analysis - must be available */
      refs in: 3 [import: 2, reexport: 1]
        - src/daemon/cli.ts:43: import (module)
        - src/daemon/index.ts:68: reexport (module)
        - src/daemon/processor.test.ts:23: import (module)
    185-185: readonly ["codemap"] [exported]
      /** Optional skills - enhance analysis but not required */
      refs in: 3 [import: 2, reexport: 1]
        - src/daemon/cli.ts:44: import (module)
        - src/daemon/index.ts:69: reexport (module)
        - src/daemon/processor.test.ts:21: import (module)
    188-188: readonly ["rlm"] [exported]
      /** Skills that are conditionally included based on file size */
      refs in: 1 [import: 1]
        - src/daemon/processor.test.ts:15: import (module)
    191-191: number [exported]
      /** File size threshold (in bytes) for including RLM skill */
      refs in: 1 [import: 1]
        - src/daemon/processor.test.ts:24: import (module)
    194-194: any [exported]
      /** Skills directory location */
      refs in: 2 [import: 1, reexport: 1]
        - src/daemon/index.ts:70: reexport (module)
        - src/daemon/processor.test.ts:25: import (module)
  imports:
    - ../config/types.js
    - ./queue.js
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
      refs in: 16 [import: 3, type: 13]
        - src/api/routes/query.ts:18: import (module)
        - src/api/routes/query.ts:165: type queryRequest
        - src/daemon/query-processor.test.ts:12: import (module)
        - src/daemon/query-processor.test.ts:84: type request
        - src/daemon/query-processor.test.ts:172: type request
        - src/daemon/query-processor.test.ts:225: type request
        - src/daemon/query-processor.test.ts:260: type request
        - src/daemon/query-processor.test.ts:305: type request
        - src/daemon/query-processor.test.ts:343: type request
        - src/daemon/query-processor.test.ts:389: type request
    55-73: interface QueryResponse [exported]
      /** Query response to return to the client */
      refs in: 7 [import: 1, type: 6]
        - src/api/routes/query.ts:19: import (module)
        - src/api/routes/query.ts:186: type response
        - src/daemon/query-processor.ts:78: type AgentQueryResult
        - src/daemon/query-processor.ts:119: type processQuery
        - src/daemon/query-processor.ts:181: type buildNoResultsResponse
        - src/daemon/query-processor.ts:202: type buildFailedQueryResponse
        - src/daemon/query-processor.ts:787: type ParseResult
    98-111: interface QueryProcessorConfig [exported]
      refs in: 2 [type: 2]
        - src/daemon/query-processor.ts:118: type processQuery
        - src/daemon/query-processor.ts:469: type invokeQueryAgent
  function:
    116-176: async processQuery(request: QueryRequest, config: QueryProcessorConfig): Promise<QueryResponse> [exported]
      /** Process a natural language query against the knowledge graph */
      refs in: 15 [call: 12, import: 3]
        - src/api/routes/query.ts:17: import (module)
        - src/api/routes/query.ts:186: call response
        - src/daemon/query-processor.test.ts:12: import (module)
        - src/daemon/query-processor.test.ts:85: call response
        - src/daemon/query-processor.test.ts:173: call response
        - src/daemon/query-processor.test.ts:226: call response
        - src/daemon/query-processor.test.ts:261: call response
        - src/daemon/query-processor.test.ts:306: call response
        - src/daemon/query-processor.test.ts:344: call response
        - src/daemon/query-processor.test.ts:393: call (module)
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

src/daemon/queue.ts [1-807]
  class:
    151-762: class QueueManager [exported]
      /** Manages the analysis job queue Thread-safe queue operations backed by SQLite with optimistic locking. */
      refs in: 14 [import: 4, instantiate: 2, reexport: 1, type: 7]
        - src/daemon/index.ts:42: reexport (module)
        - src/daemon/queue.test.ts:14: import (module)
        - src/daemon/queue.test.ts:23: type queue
        - src/daemon/queue.ts:780: type createQueueManager
        - src/daemon/queue.ts:781: instantiate createQueueManager
        - src/daemon/queue.ts:794: instantiate queue
        - src/daemon/scheduler.test.ts:9: import (module)
        - src/daemon/scheduler.test.ts:23: type createMockQueue
        - src/daemon/scheduler.test.ts:47: type createMockQueue
        - src/daemon/scheduler.ts:16: import (module)
  interface:
    37-50: interface JobContext [exported]
      /** Additional context for analysis jobs */
      refs in: 5 [import: 1, reexport: 1, type: 3]
        - src/daemon/errors.ts:8: import (module)
        - src/daemon/errors.ts:253: type classifyError
        - src/daemon/index.ts:48: reexport (module)
        - src/daemon/queue.ts:67: type AnalysisJob
        - src/daemon/queue.ts:748: type QueueManager.parseRow
    53-88: interface AnalysisJob [exported]
      /** Analysis job structure */
      refs in: 56 [import: 7, reexport: 1, type: 48]
        - src/api/websocket.test.ts:9: import (module)
        - src/api/websocket.test.ts:300: type mockJob
        - src/api/websocket.test.ts:415: type mockJob
        - src/daemon/cli.ts:51: import (module)
        - src/daemon/cli.ts:125: type QueueStatus
        - src/daemon/cli.ts:126: type QueueStatus
        - src/daemon/cli.ts:127: type QueueStatus
        - src/daemon/cli.ts:987: type formatJobLine
        - src/daemon/cli.ts:1008: type appendJobSection
        - src/daemon/index.ts:50: reexport (module)
    102-115: interface QueueStats [exported]
      /** Queue statistics */
      refs in: 5 [import: 1, reexport: 1, type: 3]
        - src/daemon/cli.ts:50: import (module)
        - src/daemon/cli.ts:124: type QueueStatus
        - src/daemon/index.ts:51: reexport (module)
        - src/daemon/queue.ts:644: type QueueManager.getStats
        - src/daemon/queue.ts:789: type getQueueStatusSummary
  type:
    17-17: JobType = "initial" | "reanalysis" | "connection_discovery" [exported]
      /** Job type determines analysis behavior */
      refs in: 5 [import: 1, reexport: 1, type: 3]
        - src/daemon/index.ts:46: reexport (module)
        - src/daemon/processor.test.ts:9: import (module)
        - src/daemon/processor.test.ts:37: type createTestJob
        - src/daemon/queue.ts:57: type AnalysisJob
        - src/daemon/queue.ts:742: type QueueManager.parseRow
    20-20: JobStatus = "pending" | "running" | "completed" | "failed" [exported]
      /** Job status tracks progress through the queue */
      refs in: 8 [import: 1, reexport: 1, type: 6]
        - src/daemon/index.ts:47: reexport (module)
        - src/daemon/processor.test.ts:9: import (module)
        - src/daemon/processor.test.ts:41: type createTestJob
        - src/daemon/queue.ts:69: type AnalysisJob
        - src/daemon/queue.ts:684: type QueueManager.getJobCounts
        - src/daemon/queue.ts:695: type QueueManager.counts
        - src/daemon/queue.ts:704: type QueueManager.getJobCounts
        - src/daemon/queue.ts:750: type QueueManager.parseRow
    91-99: JobInput = Omit<
  AnalysisJob,
  "id" | "status" | "queuedAt" | "retryCount" | "maxRetries" | "priority"
> & {
  /** Priority (defaults to PRIORITY.INITIAL) */
  priority?: number;
  /** Override default max re... [exported]
      /** Job creation input (id, status, queuedAt are auto-generated) */
      refs in: 11 [import: 2, reexport: 1, type: 8]
        - src/daemon/index.ts:49: reexport (module)
        - src/daemon/queue.test.ts:18: import (module)
        - src/daemon/queue.test.ts:129: type jobs
        - src/daemon/queue.ts:160: type QueueManager.enqueue
        - src/daemon/queue.ts:195: type QueueManager.jobToInsertParams
        - src/daemon/queue.ts:227: type QueueManager.enqueueMany
        - src/daemon/scheduler.test.ts:9: import (module)
        - src/daemon/scheduler.test.ts:23: type createMockQueue
        - src/daemon/scheduler.test.ts:24: type enqueuedJobs
        - src/daemon/scheduler.test.ts:27: type createMockQueue
  function:
    773-775: generateJobId(): string [exported]
      /** Generate a unique job ID Uses the same format as node IDs: 16-char hex string */
      refs in: 6 [call: 4, import: 1, reexport: 1]
        - src/daemon/index.ts:44: reexport (module)
        - src/daemon/queue.test.ts:16: import (module)
        - src/daemon/queue.test.ts:40: call id
        - src/daemon/queue.test.ts:47: call (module)
        - src/daemon/queue.ts:161: call QueueManager.id
        - src/daemon/queue.ts:207: call QueueManager.id
    780-782: createQueueManager(db: Database.Database): QueueManager [exported]
      /** Create a queue manager from a database */
      refs in: 11 [call: 5, import: 5, reexport: 1]
        - src/daemon/cli.ts:48: import (module)
        - src/daemon/cli.ts:674: call queue
        - src/daemon/daemon-process.ts:21: import (module)
        - src/daemon/daemon-process.ts:107: call queue
        - src/daemon/index.ts:43: reexport (module)
        - src/daemon/queue.test.ts:15: import (module)
        - src/daemon/queue.test.ts:30: call (module)
        - src/daemon/worker.test.ts:26: import (module)
        - src/daemon/worker.test.ts:295: call (module)
        - src/daemon/worker.ts:58: import (module)
    788-806: getQueueStatusSummary(db: Database.Database): { stats: QueueStats; pendingJobs: {}; runningJobs: {}; recentFailed: {}; } [exported]
      /** Get aggregated queue status Used by CLI and API */
      refs in: 2 [call: 1, import: 1]
        - src/daemon/cli.ts:47: import (module)
        - src/daemon/cli.ts:639: call getQueueStatus
  variable:
    23-34: PRIORITY [exported]
      /** Priority levels (lower = higher priority) */
      refs in: 5 [import: 4, reexport: 1]
        - src/daemon/cli.ts:49: import (module)
        - src/daemon/daemon-process.ts:21: import (module)
        - src/daemon/index.ts:45: reexport (module)
        - src/daemon/queue.test.ts:17: import (module)
        - src/daemon/worker.test.ts:26: import (module)
  imports:
    - better-sqlite3

src/daemon/scheduler.test.ts [1-961]
  imports:
    - ./queue.js
    - ./scheduler.js
    - better-sqlite3
    - vitest

src/daemon/scheduler.ts [1-945]
  class:
    163-871: class Scheduler [exported]
      /** Scheduler manages cron-based scheduled jobs */
      refs in: 31 [import: 1, instantiate: 27, reexport: 1, type: 2]
        - src/daemon/index.ts:144: reexport (module)
        - src/daemon/scheduler.test.ts:12: import (module)
        - src/daemon/scheduler.test.ts:156: type scheduler
        - src/daemon/scheduler.test.ts:167: instantiate (module)
        - src/daemon/scheduler.test.ts:258: instantiate (module)
        - src/daemon/scheduler.test.ts:280: instantiate (module)
        - src/daemon/scheduler.test.ts:299: instantiate (module)
        - src/daemon/scheduler.test.ts:315: instantiate (module)
        - src/daemon/scheduler.test.ts:335: instantiate (module)
        - src/daemon/scheduler.test.ts:363: instantiate (module)
  interface:
    59-66: interface ScheduledJobResult [exported]
      /** Result of a scheduled job execution */
      refs in: 26 [reexport: 1, type: 25]
        - src/daemon/index.ts:151: reexport (module)
        - src/daemon/scheduler.ts:156: type SchedulerStatus
        - src/daemon/scheduler.ts:170: type Scheduler.lastReanalysisResult
        - src/daemon/scheduler.ts:171: type Scheduler.lastConnectionDiscoveryResult
        - src/daemon/scheduler.ts:172: type Scheduler.lastPatternAggregationResult
        - src/daemon/scheduler.ts:173: type Scheduler.lastClusteringResult
        - src/daemon/scheduler.ts:174: type Scheduler.lastBackfillEmbeddingsResult
        - src/daemon/scheduler.ts:195: type Scheduler.createCronJob
        - src/daemon/scheduler.ts:233: type Scheduler.jobConfigs
        - src/daemon/scheduler.ts:401: type Scheduler.triggerReanalysis
    69-74: interface SchedulerLogger [exported]
      /** Logger interface for scheduler */
      refs in: 7 [import: 1, reexport: 1, type: 5]
        - src/daemon/index.ts:152: reexport (module)
        - src/daemon/scheduler.test.ts:19: import (module)
        - src/daemon/scheduler.test.ts:128: type createCapturingLogger
        - src/daemon/scheduler.ts:78: type noopLogger
        - src/daemon/scheduler.ts:87: type consoleLogger
        - src/daemon/scheduler.ts:182: type Scheduler.constructor
        - src/daemon/scheduler.ts:880: type createScheduler
    95-146: interface SchedulerConfig [exported]
      /** Scheduler configuration */
      refs in: 22 [import: 1, reexport: 1, type: 20]
        - src/daemon/index.ts:153: reexport (module)
        - src/daemon/scheduler.test.ts:18: import (module)
        - src/daemon/scheduler.test.ts:141: type getDefaultTestConfig
        - src/daemon/scheduler.test.ts:142: type getDefaultTestConfig
        - src/daemon/scheduler.test.ts:161: type defaultConfig
        - src/daemon/scheduler.test.ts:498: type badConfig
        - src/daemon/scheduler.test.ts:515: type badConfig
        - src/daemon/scheduler.test.ts:535: type config
        - src/daemon/scheduler.test.ts:548: type config
        - src/daemon/scheduler.test.ts:660: type config
    149-158: interface SchedulerStatus [exported]
      /** Scheduler state */
      refs in: 3 [reexport: 1, type: 2]
        - src/daemon/index.ts:154: reexport (module)
        - src/daemon/scheduler.ts:343: type Scheduler.getStatus
        - src/daemon/scheduler.ts:377: type Scheduler.jobs
  type:
    51-56: ScheduledJobType = | "reanalysis"
  | "connection_discovery"
  | "pattern_aggregation"
  | "clustering"
  | "backfill_embeddings" [exported]
      /** Job types that can be scheduled */
      refs in: 3 [reexport: 1, type: 2]
        - src/daemon/index.ts:150: reexport (module)
        - src/daemon/scheduler.ts:60: type ScheduledJobResult
        - src/daemon/scheduler.ts:152: type SchedulerStatus
  function:
    876-906: createScheduler(config: DaemonConfig, queue: QueueManager, db: Database.Database, logger?: SchedulerLogger): Scheduler [exported]
      /** Create a scheduler from daemon config */
      refs in: 5 [call: 2, import: 2, reexport: 1]
        - src/daemon/daemon-process.ts:22: import (module)
        - src/daemon/daemon-process.ts:171: call scheduler
        - src/daemon/index.ts:145: reexport (module)
        - src/daemon/scheduler.test.ts:13: import (module)
        - src/daemon/scheduler.test.ts:575: call scheduler
    912-922: isValidCronExpression(expression: string): boolean [exported]
      /** Validate a cron expression Returns true if valid, false otherwise */
      refs in: 14 [call: 11, import: 2, reexport: 1]
        - src/api/routes/config.ts:26: import (module)
        - src/api/routes/config.ts:161: call validateCronSchedule
        - src/daemon/index.ts:146: reexport (module)
        - src/daemon/scheduler.test.ts:14: import (module)
        - src/daemon/scheduler.test.ts:586: call (module)
        - src/daemon/scheduler.test.ts:587: call (module)
        - src/daemon/scheduler.test.ts:588: call (module)
        - src/daemon/scheduler.test.ts:589: call (module)
        - src/daemon/scheduler.test.ts:590: call (module)
        - src/daemon/scheduler.test.ts:594: call (module)
    927-944: getNextRunTimes(expression: string, count = 5): {} [exported]
      /** Get the next N run times for a cron expression */
      refs in: 5 [call: 3, import: 1, reexport: 1]
        - src/daemon/index.ts:147: reexport (module)
        - src/daemon/scheduler.test.ts:15: import (module)
        - src/daemon/scheduler.test.ts:604: call times
        - src/daemon/scheduler.test.ts:626: call (module)
        - src/daemon/scheduler.test.ts:630: call times
  variable:
    78-83: SchedulerLogger [exported]
      /** Default no-op logger */
      refs in: 2 [import: 1, reexport: 1]
        - src/daemon/index.ts:148: reexport (module)
        - src/daemon/scheduler.test.ts:16: import (module)
    87-92: SchedulerLogger [exported]
      /** Console logger for production use */
      refs in: 2 [import: 1, reexport: 1]
        - src/daemon/index.ts:149: reexport (module)
        - src/daemon/scheduler.test.ts:17: import (module)
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

src/daemon/watcher-events.ts [1-117]
  interface:
    8-11: interface SessionEventDetail [exported]
      /** Event types for the SessionWatcher Event detail for session events */
      refs in: 5 [reexport: 1, type: 4]
        - src/daemon/index.ts:35: reexport (module)
        - src/daemon/watcher-events.ts:51: type createSessionEvent
        - src/daemon/watcher-events.ts:52: type createSessionEvent
        - src/daemon/watcher-events.ts:78: type isSessionEvent
        - src/daemon/watcher-events.ts:81: type isSessionEvent
    16-19: interface ErrorEventDetail [exported]
      /** Event detail for error events */
      refs in: 5 [reexport: 1, type: 4]
        - src/daemon/index.ts:36: reexport (module)
        - src/daemon/watcher-events.ts:60: type createErrorEvent
        - src/daemon/watcher-events.ts:61: type createErrorEvent
        - src/daemon/watcher-events.ts:91: type isErrorEvent
        - src/daemon/watcher-events.ts:94: type isErrorEvent
  type:
    42-43: SessionEventName = (typeof SESSION_EVENTS)[keyof typeof SESSION_EVENTS] [exported]
      /** Type for session event names */
      refs in: 1 [reexport: 1]
        - src/daemon/index.ts:37: reexport (module)
  function:
    48-55: createSessionEvent(type: string, sessionPath: string): CustomEvent<SessionEventDetail> [exported]
      /** Create a session event */
      refs in: 6 [call: 4, import: 1, reexport: 1]
        - src/daemon/index.ts:28: reexport (module)
        - src/daemon/watcher.ts:19: import (module)
        - src/daemon/watcher.ts:417: call SessionWatcher.handleNewFile
        - src/daemon/watcher.ts:449: call SessionWatcher.handleFileChange
        - src/daemon/watcher.ts:479: call SessionWatcher.handleFileRemove
        - src/daemon/watcher.ts:532: call SessionWatcher.checkIdle
    60-64: createErrorEvent(error: Error): CustomEvent<ErrorEventDetail> [exported]
      /** Create an error event */
      refs in: 3 [call: 1, import: 1, reexport: 1]
        - src/daemon/index.ts:29: reexport (module)
        - src/daemon/watcher.ts:20: import (module)
        - src/daemon/watcher.ts:274: call SessionWatcher.start
    69-71: createReadyEvent(): Event [exported]
      /** Create a ready event */
      refs in: 3 [call: 1, import: 1, reexport: 1]
        - src/daemon/index.ts:30: reexport (module)
        - src/daemon/watcher.ts:21: import (module)
        - src/daemon/watcher.ts:277: call SessionWatcher.start
    76-84: isSessionEvent(event: Event): boolean [exported]
      /** Type guard to check if an event is a session event */
      refs in: 2 [call: 1, reexport: 1]
        - src/daemon/index.ts:31: reexport (module)
        - src/daemon/watcher-events.ts:102: call getSessionPath
    89-96: isErrorEvent(event: Event): boolean [exported]
      /** Type guard to check if an event is an error event */
      refs in: 2 [call: 1, reexport: 1]
        - src/daemon/index.ts:32: reexport (module)
        - src/daemon/watcher-events.ts:112: call getEventError
    101-106: getSessionPath(event: Event): string [exported]
      /** Helper to get session path from a session event */
      refs in: 12 [call: 9, import: 2, reexport: 1]
        - src/daemon/daemon-process.ts:23: import (module)
        - src/daemon/daemon-process.ts:206: call sessionPath
        - src/daemon/daemon-process.ts:224: call sessionPath
        - src/daemon/index.ts:33: reexport (module)
        - src/daemon/watcher.test.ts:18: import (module)
        - src/daemon/watcher.test.ts:265: call (module)
        - src/daemon/watcher.test.ts:308: call (module)
        - src/daemon/watcher.test.ts:339: call (module)
        - src/daemon/watcher.test.ts:367: call (module)
        - src/daemon/watcher.test.ts:401: call (module)
    111-116: getEventError(event: Event): any [exported]
      /** Helper to get error from an error event */
      refs in: 3 [call: 1, import: 1, reexport: 1]
        - src/daemon/index.ts:34: reexport (module)
        - src/daemon/watcher.test.ts:15: import (module)
        - src/daemon/watcher.test.ts:826: call (module)
  variable:
    24-37: SESSION_EVENTS [exported]
      /** Session event names */
      refs in: 4 [import: 3, reexport: 1]
        - src/daemon/daemon-process.ts:23: import (module)
        - src/daemon/index.ts:27: reexport (module)
        - src/daemon/watcher.test.ts:20: import (module)
        - src/daemon/watcher.ts:18: import (module)

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
      refs in: 21 [import: 2, instantiate: 14, reexport: 1, type: 4]
        - src/daemon/daemon-process.ts:24: import (module)
        - src/daemon/daemon-process.ts:200: instantiate watcher
        - src/daemon/index.ts:15: reexport (module)
        - src/daemon/watcher.test.ts:21: import (module)
        - src/daemon/watcher.test.ts:90: type waitForEvent
        - src/daemon/watcher.test.ts:110: type createTestWatcher
        - src/daemon/watcher.test.ts:111: instantiate createTestWatcher
        - src/daemon/watcher.test.ts:121: instantiate watcher
        - src/daemon/watcher.test.ts:127: instantiate watcher
        - src/daemon/watcher.test.ts:380: instantiate watcher
  interface:
    27-42: interface SessionState [exported]
      /** State tracking for a single session file */
      refs in: 5 [reexport: 1, type: 4]
        - src/daemon/index.ts:21: reexport (module)
        - src/daemon/watcher.ts:85: type SessionWatcher.sessionStates
        - src/daemon/watcher.ts:335: type SessionWatcher.getSessionState
        - src/daemon/watcher.ts:342: type SessionWatcher.getAllSessions
        - src/daemon/watcher.ts:405: type SessionWatcher.state
    47-62: interface WatcherConfig [exported]
      /** Watcher configuration options */
      refs in: 4 [reexport: 1, type: 3]
        - src/daemon/index.ts:22: reexport (module)
        - src/daemon/watcher.ts:67: type DEFAULT_WATCHER_CONFIG
        - src/daemon/watcher.ts:86: type SessionWatcher.watchConfig
        - src/daemon/watcher.ts:96: type SessionWatcher.constructor
  function:
    546-550: createWatcher(daemonConfig: DaemonConfig): SessionWatcher [exported]
      /** Create a watcher from daemon config */
      refs in: 3 [call: 1, import: 1, reexport: 1]
        - src/daemon/index.ts:16: reexport (module)
        - src/daemon/watcher.test.ts:13: import (module)
        - src/daemon/watcher.test.ts:762: call watcher
    555-557: isSessionFile(filePath: string): boolean [exported]
      /** Check if a path is a valid session file */
      refs in: 7 [call: 5, import: 1, reexport: 1]
        - src/daemon/index.ts:17: reexport (module)
        - src/daemon/watcher.test.ts:19: import (module)
        - src/daemon/watcher.test.ts:769: call (module)
        - src/daemon/watcher.test.ts:770: call (module)
        - src/daemon/watcher.test.ts:774: call (module)
        - src/daemon/watcher.test.ts:775: call (module)
        - src/daemon/watcher.test.ts:776: call (module)
    562-564: getSessionName(sessionPath: string): string [exported]
      /** Extract session name from path */
      refs in: 4 [call: 2, import: 1, reexport: 1]
        - src/daemon/index.ts:18: reexport (module)
        - src/daemon/watcher.test.ts:17: import (module)
        - src/daemon/watcher.test.ts:782: call (module)
        - src/daemon/watcher.test.ts:784: call (module)
    571-581: getProjectFromSessionPath(sessionPath: string): string [exported]
      /** Extract project name from session path Session paths are typically: ~/.pi/agent/sessions/<project-name>/<session-file>.jsonl */
      refs in: 4 [call: 2, import: 1, reexport: 1]
        - src/daemon/index.ts:19: reexport (module)
        - src/daemon/watcher.test.ts:16: import (module)
        - src/daemon/watcher.test.ts:792: call (module)
        - src/daemon/watcher.test.ts:800: call (module)
  variable:
    67-73: WatcherConfig [exported]
      /** Default watcher configuration */
      refs in: 2 [import: 1, reexport: 1]
        - src/daemon/index.ts:20: reexport (module)
        - src/daemon/watcher.test.ts:14: import (module)
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

src/daemon/worker.ts [1-874]
  class:
    128-833: class Worker [exported]
      /** Worker that processes jobs from the analysis queue */
      refs in: 5 [import: 1, instantiate: 1, reexport: 1, type: 2]
        - src/daemon/index.ts:103: reexport (module)
        - src/daemon/worker.test.ts:30: import (module)
        - src/daemon/worker.ts:590: type Worker.createNodeFromResult
        - src/daemon/worker.ts:842: type createWorker
        - src/daemon/worker.ts:843: instantiate createWorker
  interface:
    68-85: interface WorkerConfig [exported]
      /** Worker configuration */
      refs in: 6 [import: 1, reexport: 1, type: 4]
        - src/daemon/index.ts:106: reexport (module)
        - src/daemon/worker.test.ts:31: import (module)
        - src/daemon/worker.test.ts:88: type createTestWorkerConfig
        - src/daemon/worker.test.ts:89: type createTestWorkerConfig
        - src/daemon/worker.ts:161: type Worker.constructor
        - src/daemon/worker.ts:842: type createWorker
    88-103: interface WorkerStatus [exported]
      /** Worker status */
      refs in: 2 [reexport: 1, type: 1]
        - src/daemon/index.ts:107: reexport (module)
        - src/daemon/worker.ts:340: type Worker.getStatus
    106-119: interface JobProcessingResult [exported]
      /** Result from processing a single job */
      refs in: 7 [reexport: 1, type: 6]
        - src/daemon/index.ts:108: reexport (module)
        - src/daemon/worker.ts:355: type Worker.processJob
        - src/daemon/worker.ts:405: type Worker.handleConnectionDiscoveryJob
        - src/daemon/worker.ts:439: type Worker.handleAnalysisJob
        - src/daemon/worker.ts:515: type Worker.processAnalysisResult
        - src/daemon/worker.ts:622: type Worker.finalizeJobSuccess
        - src/daemon/worker.ts:715: type Worker.handleJobFailure
  function:
    842-844: createWorker(config: WorkerConfig): Worker [exported]
      /** Create a worker instance */
      refs in: 20 [call: 17, import: 2, reexport: 1]
        - src/daemon/daemon-process.ts:25: import (module)
        - src/daemon/daemon-process.ts:140: call worker
        - src/daemon/index.ts:104: reexport (module)
        - src/daemon/worker.test.ts:28: import (module)
        - src/daemon/worker.test.ts:139: call worker
        - src/daemon/worker.test.ts:146: call worker
        - src/daemon/worker.test.ts:155: call worker
        - src/daemon/worker.test.ts:163: call worker
        - src/daemon/worker.test.ts:179: call worker
        - src/daemon/worker.test.ts:193: call worker
    849-873: handleJobError(error: Error, job: AnalysisJob, retryPolicy: RetryPolicy = DEFAULT_RETRY_POLICY): { shouldRetry: boolean; retryDelayMinutes: number; formattedError: string; category: ReturnType<any>; } [exported]
      /** Handle job error manually (for custom queue implementations) */
      refs in: 11 [call: 9, import: 1, reexport: 1]
        - src/daemon/index.ts:105: reexport (module)
        - src/daemon/worker.test.ts:29: import (module)
        - src/daemon/worker.test.ts:208: call result
        - src/daemon/worker.test.ts:218: call result
        - src/daemon/worker.test.ts:227: call result
        - src/daemon/worker.test.ts:236: call result
        - src/daemon/worker.test.ts:254: call result
        - src/daemon/worker.test.ts:273: call result0
        - src/daemon/worker.test.ts:274: call result1
        - src/daemon/worker.test.ts:275: call result2
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

src/storage/bridge-discovery.test.ts [1-207]
  imports:
    - ./bridge-discovery.js
    - ./database.js
    - ./edge-repository.js
    - ./node-crud.js
    - ./node-types.js
    - better-sqlite3
    - node:fs
    - node:os
    - node:path
    - vitest

src/storage/bridge-discovery.ts [1-338]
  interface:
    23-32: interface BridgePath [exported]
      /** A discovered path in the graph */
      refs in: 8 [import: 1, type: 7]
        - src/daemon/query-processor.ts:21: import (module)
        - src/daemon/query-processor.ts:224: type discoverBridgePaths
        - src/daemon/query-processor.ts:467: type invokeQueryAgent
        - src/daemon/query-processor.ts:579: type buildQueryPrompt
        - src/daemon/query-processor.ts:627: type formatBridgePaths
        - src/storage/bridge-discovery.ts:57: type TraversalState
        - src/storage/bridge-discovery.ts:121: type buildBridgePath
        - src/storage/bridge-discovery.ts:270: type findBridgePaths
    34-41: interface BridgeDiscoveryOptions [exported]
      refs in: 1 [type: 1]
        - src/storage/bridge-discovery.ts:269: type findBridgePaths
  function:
    266-296: findBridgePaths(db: Database.Database, seedNodeIds: string[], options: BridgeDiscoveryOptions = {}): {} [exported]
      /** Find interesting multi-hop paths originating from seed nodes. Uses BFS/DFS to traverse outgoing edges, scoring paths based on edge confidence and node relevance. */
      refs in: 10 [call: 7, import: 3]
        - src/daemon/query-processor.test.ts:9: import (module)
        - src/daemon/query-processor.ts:20: import (module)
        - src/daemon/query-processor.ts:230: call bridgePaths
        - src/storage/bridge-discovery.test.ts:8: import (module)
        - src/storage/bridge-discovery.test.ts:107: call paths
        - src/storage/bridge-discovery.test.ts:130: call paths
        - src/storage/bridge-discovery.test.ts:150: call paths
        - src/storage/bridge-discovery.test.ts:164: call paths
        - src/storage/bridge-discovery.test.ts:188: call paths
        - src/storage/bridge-discovery.test.ts:203: call paths
  imports:
    - ./edge-repository.js
    - ./node-crud.js
    - ./node-storage.js
    - better-sqlite3

src/storage/database-guard.test.ts [1-52]
  imports:
    - ./database.js
    - node:fs
    - node:os
    - node:path
    - vitest

src/storage/database-vec.test.ts [1-72]
  imports:
    - ./database
    - better-sqlite3
    - node:fs
    - node:os
    - node:path
    - vitest

src/storage/database.test.ts [1-815]
  imports:
    - ./database.js
    - better-sqlite3
    - node:fs
    - node:os
    - node:path
    - vitest

src/storage/database.ts [1-331]
  interface:
    20-36: interface DatabaseOptions [exported]
      refs in: 2 [type: 2]
        - src/storage/database.ts:48: type guardTestAccess
        - src/storage/database.ts:100: type openDatabase
    38-43: interface MigrationInfo [exported]
      refs in: 2 [type: 2]
        - src/storage/database.ts:122: type loadMigrations
        - src/storage/database.ts:128: type migrations
  function:
    100-117: openDatabase(options: DatabaseOptions = {}): Database.Database [exported]
      /** Open or create the pi-brain database */
      refs in: 125 [call: 108, import: 17]
        - src/api/server.test.ts:13: import (module)
        - src/api/server.test.ts:131: call db
        - src/api/server.test.ts:145: call db
        - src/api/server.test.ts:166: call db
        - src/api/server.test.ts:188: call db
        - src/api/server.test.ts:210: call db
        - src/api/server.test.ts:244: call db
        - src/api/server.test.ts:294: call db
        - src/api/server.test.ts:315: call db
        - src/api/server.test.ts:342: call db
    122-145: loadMigrations(): {} [exported]
      /** Load migrations from the migrations directory */
      refs in: 5 [call: 4, import: 1]
        - src/storage/database.test.ts:16: import (module)
        - src/storage/database.test.ts:50: call migrations
        - src/storage/database.test.ts:58: call migrations
        - src/storage/database.test.ts:143: call migrations
        - src/storage/database.ts:227: call migrations
    150-160: getSchemaVersion(db: Database.Database): number [exported]
      /** Get current schema version */
      refs in: 7 [call: 6, import: 1]
        - src/storage/database.test.ts:14: import (module)
        - src/storage/database.test.ts:86: call version
        - src/storage/database.test.ts:100: call (module)
        - src/storage/database.test.ts:148: call (module)
        - src/storage/database.test.ts:159: call firstVersion
        - src/storage/database.test.ts:165: call (module)
        - src/storage/database.ts:226: call currentVersion
    166-187: getMigrationSkippedReason(db: Database.Database, version: number): string [exported]
      /** Check if a specific migration was skipped due to missing dependencies. Returns the requirement that caused it to be skipped, or null if not skipped. */
      refs in: 1 [call: 1]
        - src/storage/database.ts:232: call skippedReason
    194-203: parseMigrationRequirements(sql: string): {} [exported]
      /** Parse a migration SQL file for REQUIRES directives. Format: -- REQUIRES: requirement1, requirement2 Returns array of requirements (e.g., ['sqlite-vec']) */
      refs in: 2 [call: 2]
        - src/storage/database.ts:235: call requirements
        - src/storage/database.ts:253: call requirements
    209-220: checkMigrationRequirements(db: Database.Database, requirements: string[]): string [exported]
      /** Check if migration requirements are satisfied. Returns unsatisfied requirement, or null if all satisfied. */
      refs in: 2 [call: 2]
        - src/storage/database.ts:236: call unsatisfied
        - src/storage/database.ts:254: call unsatisfied
    225-282: migrate(db: Database.Database): number [exported]
      /** Run pending migrations */
      refs in: 62 [call: 48, import: 14]
        - src/api/routes/clusters.test.ts:10: import (module)
        - src/api/routes/clusters.test.ts:21: call (module)
        - src/api/routes/config.test.ts:11: import (module)
        - src/api/routes/config.test.ts:33: call (module)
        - src/api/routes/query.test.ts:10: import (module)
        - src/api/routes/query.test.ts:19: call (module)
        - src/api/routes/stats.test.ts:10: import (module)
        - src/api/routes/stats.test.ts:21: call (module)
        - src/api/server.test.ts:13: import (module)
        - src/api/server.test.ts:132: call (module)
    287-289: closeDatabase(db: Database.Database): void [exported]
      /** Close the database connection */
      refs in: 23 [call: 16, import: 7]
        - src/daemon/queue.test.ts:12: import (module)
        - src/daemon/queue.test.ts:34: call (module)
        - src/daemon/worker.test.ts:15: import (module)
        - src/daemon/worker.test.ts:132: call (module)
        - src/daemon/worker.test.ts:299: call (module)
        - src/daemon/worker.test.ts:393: call (module)
        - src/daemon/worker.test.ts:481: call (module)
        - src/daemon/worker.test.ts:575: call (module)
        - src/storage/bridge-discovery.test.ts:9: import (module)
        - src/storage/bridge-discovery.test.ts:34: call (module)
    294-301: isDatabaseHealthy(db: Database.Database): boolean [exported]
      /** Check if the database is healthy */
      refs in: 4 [call: 3, import: 1]
        - src/storage/database.test.ts:15: import (module)
        - src/storage/database.test.ts:424: call (module)
        - src/storage/database.test.ts:437: call (module)
        - src/storage/database.test.ts:453: call (module)
    306-314: loadVecExtension(db: Database.Database): boolean [exported]
      /** Load the sqlite-vec extension */
      refs in: 1 [call: 1]
        - src/storage/database.ts:87: call loaded
    319-330: isVecLoaded(db: Database.Database): boolean [exported]
      /** Check if sqlite-vec extension is loaded */
      refs in: 13 [call: 7, import: 6]
        - src/daemon/query-processor.ts:23: import (module)
        - src/daemon/query-processor.ts:317: call generateQueryEmbedding
        - src/storage/database-vec.test.ts:8: import (module)
        - src/storage/database-vec.test.ts:35: call (module)
        - src/storage/database.ts:214: call checkMigrationRequirements
        - src/storage/embedding-utils.ts:12: import (module)
        - src/storage/embedding-utils.ts:182: call txn
        - src/storage/embedding-utils.ts:227: call deleteEmbedding
        - src/storage/hybrid-search.ts:17: import (module)
        - src/storage/hybrid-search.ts:561: call collectCandidates
  variable:
    15-15: any [exported]
      /** Default pi-brain data directory */
    18-18: any [exported]
      /** Default database path */
      refs in: 1 [import: 1]
        - src/storage/database-guard.test.ts:11: import (module)
  imports:
    - better-sqlite3
    - node:fs
    - node:os
    - node:path
    - node:url
    - sqlite-vec

src/storage/decision-repository.test.ts [1-327]
  imports:
    - ./database.js
    - ./decision-repository.js
    - ./node-crud.js
    - ./node-types.js
    - better-sqlite3
    - node:fs
    - node:os
    - node:path
    - vitest

src/storage/decision-repository.ts [1-144]
  interface:
    12-21: interface ListDecisionsFilters [exported]
      /** Filters for querying daemon decisions */
      refs in: 1 [type: 1]
        - src/storage/decision-repository.ts:60: type listDecisions
    24-29: interface ListDecisionsOptions [exported]
      /** Pagination options */
      refs in: 1 [type: 1]
        - src/storage/decision-repository.ts:61: type listDecisions
    32-41: interface DaemonDecisionResult [exported]
      /** A daemon decision result with metadata */
      refs in: 2 [type: 2]
        - src/storage/decision-repository.ts:46: type ListDecisionsResult
        - src/storage/decision-repository.ts:122: type decisions
    44-53: interface ListDecisionsResult [exported]
      /** Result from listDecisions query */
      refs in: 1 [type: 1]
        - src/storage/decision-repository.ts:62: type listDecisions
  function:
    58-125: listDecisions(db: Database.Database, filters: ListDecisionsFilters = {}, options: ListDecisionsOptions = {}): ListDecisionsResult [exported]
      /** List daemon decisions with filters and pagination. */
      refs in: 9 [call: 7, import: 2]
        - src/api/routes/decisions.ts:10: import (module)
        - src/api/routes/decisions.ts:41: call result
        - src/storage/decision-repository.test.ts:12: import (module)
        - src/storage/decision-repository.test.ts:105: call result
        - src/storage/decision-repository.test.ts:239: call resA
        - src/storage/decision-repository.test.ts:243: call resB
        - src/storage/decision-repository.test.ts:312: call [decision]
        - src/storage/decision-repository.test.ts:318: call [updatedDecision]
        - src/storage/decision-repository.test.ts:323: call [clearedDecision]
    130-143: updateDecisionFeedback(db: Database.Database, decisionId: string, feedback: string | null): boolean [exported]
      /** Update user feedback for a daemon decision */
      refs in: 5 [call: 3, import: 2]
        - src/api/routes/decisions.ts:11: import (module)
        - src/api/routes/decisions.ts:69: call updated
        - src/storage/decision-repository.test.ts:13: import (module)
        - src/storage/decision-repository.test.ts:315: call updated
        - src/storage/decision-repository.test.ts:322: call (module)
  imports:
    - ./filter-utils.js
    - better-sqlite3

src/storage/edge-repository.ts [1-197]
  interface:
    19-30: interface EdgeRow [exported]
      /** Edge row from the database */
      refs in: 22 [import: 2, type: 20]
        - src/storage/bridge-discovery.ts:12: import (module)
        - src/storage/bridge-discovery.ts:27: type BridgePath
        - src/storage/bridge-discovery.ts:50: type QueueItem
        - src/storage/bridge-discovery.ts:118: type buildBridgePath
        - src/storage/bridge-discovery.ts:214: type calculateEdgeScore
        - src/storage/bridge-discovery.ts:301: type generatePathDescription
        - src/storage/edge-repository.ts:97: type getEdgesFrom
        - src/storage/edge-repository.ts:103: type getEdgesFrom
        - src/storage/edge-repository.ts:109: type getEdgesTo
        - src/storage/edge-repository.ts:115: type getEdgesTo
  function:
    39-41: generateEdgeId(): string [exported]
      /** Generate a unique edge ID with 'edg_' prefix */
      refs in: 1 [call: 1]
        - src/storage/edge-repository.ts:63: call edge
    50-92: createEdge(db: Database.Database, sourceNodeId: string, targetNodeId: string, type: EdgeType, options: {
    metadata?: EdgeMetadata;
    createdBy?: "boundary" | "daemon" | "user";
    confidence?: number;
    similarity?: number;
  } = {}): Edge [exported]
      /** Create an edge between two nodes */
      refs in: 24 [call: 18, import: 6]
        - src/api/routes/edges.ts:10: import (module)
        - src/api/routes/edges.ts:167: call edge
        - src/daemon/connection-discovery.test.ts:4: import (module)
        - src/daemon/connection-discovery.test.ts:192: call (module)
        - src/daemon/connection-discovery.ts:12: import (module)
        - src/daemon/connection-discovery.ts:280: call ConnectionDiscoverer.edge
        - src/daemon/connection-discovery.ts:407: call ConnectionDiscoverer.edge
        - src/daemon/connection-discovery.ts:492: call ConnectionDiscoverer.edge
        - src/storage/bridge-discovery.test.ts:10: import (module)
        - src/storage/bridge-discovery.test.ts:105: call (module)
    97-104: getEdgesFrom(db: Database.Database, nodeId: string): {} [exported]
      /** Get edges from a node (outgoing) */
      refs in: 10 [call: 6, import: 4]
        - src/api/routes/edges.ts:13: import (module)
        - src/api/routes/edges.ts:46: call outgoing
        - src/storage/bridge-discovery.ts:12: import (module)
        - src/storage/bridge-discovery.ts:230: call outgoingEdges
        - src/storage/graph-repository.ts:17: import (module)
        - src/storage/graph-repository.ts:98: call outgoing
        - src/storage/relationship-edges.test.ts:15: import (module)
        - src/storage/relationship-edges.test.ts:196: call edges
        - src/storage/relationship-edges.test.ts:221: call edges
        - src/storage/relationship-edges.test.ts:384: call edges
    109-116: getEdgesTo(db: Database.Database, nodeId: string): {} [exported]
      /** Get edges to a node (incoming) */
      refs in: 4 [call: 2, import: 2]
        - src/api/routes/edges.ts:14: import (module)
        - src/api/routes/edges.ts:47: call incoming
        - src/storage/graph-repository.ts:18: import (module)
        - src/storage/graph-repository.ts:105: call incoming
    121-128: getNodeEdges(db: Database.Database, nodeId: string): {} [exported]
      /** Get all edges for a node (both directions) */
      refs in: 2 [call: 1, import: 1]
        - src/storage/graph-repository.ts:19: import (module)
        - src/storage/graph-repository.ts:360: call allEdges
    133-136: getAllEdges(db: Database.Database): {} [exported]
      /** Get all edges */
      refs in: 2 [call: 1, import: 1]
        - src/daemon/graph-export.ts:12: import (module)
        - src/daemon/graph-export.ts:51: call allEdges
    141-144: getEdge(db: Database.Database, edgeId: string): EdgeRow [exported]
      /** Get edge by ID */
      refs in: 2 [call: 1, import: 1]
        - src/api/routes/edges.ts:12: import (module)
        - src/api/routes/edges.ts:123: call edge
    149-152: deleteEdge(db: Database.Database, edgeId: string): boolean [exported]
      /** Delete an edge */
      refs in: 2 [call: 1, import: 1]
        - src/api/routes/edges.ts:11: import (module)
        - src/api/routes/edges.ts:198: call deleted
    157-175: edgeExists(db: Database.Database, sourceNodeId: string, targetNodeId: string, type?: EdgeType): boolean [exported]
      /** Check if an edge exists between two nodes */
      refs in: 7 [call: 5, import: 2]
        - src/daemon/connection-discovery.ts:12: import (module)
        - src/daemon/connection-discovery.ts:257: call ConnectionDiscoverer.discoverSemanticEdges
        - src/daemon/connection-discovery.ts:402: call ConnectionDiscoverer.detectReferences
        - src/daemon/connection-discovery.ts:483: call ConnectionDiscoverer.detectLessonReinforcement
        - src/storage/node-crud.ts:14: import (module)
        - src/storage/node-crud.ts:752: call linkNodeToPredecessors
        - src/storage/node-crud.ts:761: call linkNodeToPredecessors
    184-196: edgeRowToEdge(row: EdgeRow): Edge [exported]
      /** Convert an Edge row from the database to an Edge object */
      refs in: 1 [import: 1]
        - src/daemon/graph-export.ts:12: import (module)
  imports:
    - ./node-types.js
    - better-sqlite3

src/storage/embedding-utils.test.ts [1-1075]
  imports:
    - ../types/index.js
    - ./database.js
    - ./embedding-utils.js
    - better-sqlite3
    - vitest

src/storage/embedding-utils.ts [1-676]
  interface:
    325-329: interface BackfillEmbeddingProvider [exported]
      /** Embedding provider interface for backfill operations. Matches the EmbeddingProvider interface from facet-discovery.ts. */
      refs in: 5 [type: 5]
        - src/storage/embedding-utils.ts:405: type findNodesNeedingEmbedding
        - src/storage/embedding-utils.ts:496: type storeBatchEmbeddings
        - src/storage/embedding-utils.ts:530: type processBatch
        - src/storage/embedding-utils.ts:572: type backfillEmbeddings
        - src/storage/embedding-utils.ts:645: type countNodesNeedingEmbedding
    334-339: interface BackfillLogger [exported]
      /** Logger interface for backfill operations. */
      refs in: 5 [type: 5]
        - src/storage/embedding-utils.ts:352: type BackfillEmbeddingsOptions
        - src/storage/embedding-utils.ts:379: type noopLogger
        - src/storage/embedding-utils.ts:467: type buildBatchTexts
        - src/storage/embedding-utils.ts:497: type storeBatchEmbeddings
        - src/storage/embedding-utils.ts:532: type processBatch
    344-355: interface BackfillEmbeddingsOptions [exported]
      /** Options for backfillEmbeddings function. */
      refs in: 1 [type: 1]
        - src/storage/embedding-utils.ts:574: type backfillEmbeddings
    360-371: interface BackfillResult [exported]
      /** Result of a backfill operation. */
      refs in: 3 [import: 1, type: 2]
        - src/daemon/scheduler.ts:26: import (module)
        - src/daemon/scheduler.ts:734: type Scheduler.result
        - src/storage/embedding-utils.ts:575: type backfillEmbeddings
  function:
    43-83: buildEmbeddingText(node: Node): string [exported]
      /** Build embedding text from a node for semantic search. Format: ``` [{type}] {summary} Decisions: - {decision.what} (why: {decision.why}) - ... Lessons: - {lesson.summary} - ... ``` This richer format enables semantic search to find nodes by: - What type of work was done - What was accomplished (summary) - What decisions were made and why - What lessons were learned */
      refs in: 17 [call: 13, import: 4]
        - src/daemon/facet-discovery.ts:35: import (module)
        - src/daemon/facet-discovery.ts:995: call FacetDiscovery.buildNodeEmbeddingText
        - src/daemon/worker.test.ts:17: import (module)
        - src/daemon/worker.test.ts:673: call text
        - src/daemon/worker.test.ts:777: call text
        - src/daemon/worker.test.ts:953: call text
        - src/daemon/worker.test.ts:1062: call text
        - src/daemon/worker.test.ts:1182: call text
        - src/daemon/worker.ts:29: import (module)
        - src/daemon/worker.ts:794: call Worker.text
    97-109: buildSimpleEmbeddingText(type: string | null, summary: string | null): string [exported]
      /** Build simple embedding text from node summary data. This is a lightweight version for use with partial node data (e.g., NodeSummaryRow from database queries). Returns: - `[type] summary` when both are present - `summary` when only summary is present - `[type]` when only type is present (sparse but valid for type-only filtering) - `` (empty string) when both are null */
      refs in: 7 [call: 5, import: 2]
        - src/daemon/facet-discovery.ts:36: import (module)
        - src/daemon/facet-discovery.ts:1001: call FacetDiscovery.buildNodeEmbeddingText
        - src/storage/embedding-utils.test.ts:15: import (module)
        - src/storage/embedding-utils.test.ts:328: call text
        - src/storage/embedding-utils.test.ts:333: call text
        - src/storage/embedding-utils.test.ts:338: call text
        - src/storage/embedding-utils.test.ts:343: call text
    119-121: isRichEmbeddingFormat(inputText: string): boolean [exported]
      /** Check if embedding text uses the rich format (includes decisions/lessons). Used to detect nodes with old-format embeddings that need re-embedding. Detection relies on the version marker [emb:v2]. This avoids strict dependencies on whitespace or formatting of the sections. */
      refs in: 13 [call: 11, import: 2]
        - src/daemon/facet-discovery.ts:37: import (module)
        - src/daemon/facet-discovery.ts:939: call FacetDiscovery.embedNodes
        - src/storage/embedding-utils.test.ts:23: import (module)
        - src/storage/embedding-utils.test.ts:352: call (module)
        - src/storage/embedding-utils.test.ts:357: call (module)
        - src/storage/embedding-utils.test.ts:363: call (module)
        - src/storage/embedding-utils.test.ts:368: call (module)
        - src/storage/embedding-utils.test.ts:373: call (module)
        - src/storage/embedding-utils.test.ts:378: call (module)
        - src/storage/embedding-utils.test.ts:384: call (module)
    135-205: storeEmbeddingWithVec(db: Database.Database, nodeId: string, embedding: number[], modelName: string, inputText: string): { rowid: bigint; vecUpdated: boolean; } [exported]
      /** Store an embedding for a node in both node_embeddings and node_embeddings_vec tables. Handles upsert semantics - if an embedding already exists for the node, it will be replaced. The vec table is only updated if sqlite-vec is loaded. Uses a transaction to ensure atomicity - either both tables are updated or neither. */
      refs in: 26 [call: 23, import: 3]
        - src/daemon/semantic-search.integration.test.ts:13: import (module)
        - src/daemon/semantic-search.integration.test.ts:178: call (module)
        - src/daemon/semantic-search.integration.test.ts:179: call (module)
        - src/daemon/semantic-search.integration.test.ts:222: call (module)
        - src/daemon/semantic-search.integration.test.ts:267: call (module)
        - src/daemon/semantic-search.integration.test.ts:268: call (module)
        - src/daemon/semantic-search.integration.test.ts:306: call (module)
        - src/daemon/worker.ts:30: import (module)
        - src/daemon/worker.ts:807: call Worker.{ vecUpdated }
        - src/storage/embedding-utils.test.ts:25: import (module)
    210-237: deleteEmbedding(db: Database.Database, nodeId: string): boolean [exported]
      /** Delete an embedding from both node_embeddings and node_embeddings_vec tables. */
      refs in: 3 [call: 2, import: 1]
        - src/storage/embedding-utils.test.ts:17: import (module)
        - src/storage/embedding-utils.test.ts:589: call deleted
        - src/storage/embedding-utils.test.ts:597: call deleted
    242-275: getEmbedding(db: Database.Database, nodeId: string): { embedding: {}; modelName: string; inputText: string; createdAt: string; } [exported]
      /** Get embedding for a node. */
      refs in: 6 [call: 4, import: 2]
        - src/daemon/worker.test.ts:18: import (module)
        - src/daemon/worker.test.ts:1081: call stored
        - src/storage/embedding-utils.test.ts:21: import (module)
        - src/storage/embedding-utils.test.ts:432: call stored
        - src/storage/embedding-utils.test.ts:463: call stored
        - src/storage/embedding-utils.test.ts:909: call stored
    280-285: hasEmbedding(db: Database.Database, nodeId: string): boolean [exported]
      /** Check if a node has an embedding stored. */
      refs in: 11 [call: 9, import: 2]
        - src/daemon/worker.test.ts:19: import (module)
        - src/daemon/worker.test.ts:557: call (module)
        - src/daemon/worker.test.ts:1078: call (module)
        - src/daemon/worker.test.ts:1196: call (module)
        - src/storage/embedding-utils.test.ts:22: import (module)
        - src/storage/embedding-utils.test.ts:516: call (module)
        - src/storage/embedding-utils.test.ts:548: call (module)
        - src/storage/embedding-utils.test.ts:555: call (module)
        - src/storage/embedding-utils.test.ts:587: call (module)
        - src/storage/embedding-utils.test.ts:591: call (module)
    296-302: serializeEmbedding(embedding: number[]): Buffer [exported]
      /** Serialize an embedding array to a binary Buffer (Float32 little-endian). This format is used for storing in the node_embeddings table. */
      refs in: 5 [call: 4, import: 1]
        - src/storage/embedding-utils.test.ts:24: import (module)
        - src/storage/embedding-utils.test.ts:605: call buffer
        - src/storage/embedding-utils.test.ts:617: call buffer
        - src/storage/embedding-utils.test.ts:626: call buffer
        - src/storage/embedding-utils.ts:145: call embeddingBlob
    309-315: deserializeEmbedding(buffer: Buffer): {} [exported]
      /** Deserialize a binary Buffer to an embedding array. Inverse of serializeEmbedding. */
      refs in: 8 [call: 5, import: 3]
        - src/storage/embedding-utils.test.ts:18: import (module)
        - src/storage/embedding-utils.test.ts:606: call restored
        - src/storage/embedding-utils.test.ts:618: call restored
        - src/storage/embedding-utils.test.ts:627: call restored
        - src/storage/embedding-utils.ts:270: call getEmbedding
        - src/storage/semantic-search.test.ts:6: import (module)
        - src/storage/semantic-search.ts:18: import (module)
        - src/storage/semantic-search.ts:178: call getNodeEmbeddingVector
    403-443: findNodesNeedingEmbedding(db: Database.Database, provider: BackfillEmbeddingProvider, options: { limit?: number; force?: boolean } = {}): {} [exported]
      /** Find nodes that need embedding generation or update. A node needs embedding if: 1. No embedding exists for it 2. Embedding uses a different model than the current provider 3. Embedding uses old format (not rich format with decisions/lessons) */
      refs in: 10 [call: 9, import: 1]
        - src/storage/embedding-utils.test.ts:20: import (module)
        - src/storage/embedding-utils.test.ts:671: call nodes
        - src/storage/embedding-utils.test.ts:689: call nodes
        - src/storage/embedding-utils.test.ts:706: call nodes
        - src/storage/embedding-utils.test.ts:722: call nodes
        - src/storage/embedding-utils.test.ts:733: call nodes
        - src/storage/embedding-utils.test.ts:748: call (module)
        - src/storage/embedding-utils.test.ts:750: call nodes
        - src/storage/embedding-utils.test.ts:775: call nodes
        - src/storage/embedding-utils.ts:587: call nodes
    570-636: async backfillEmbeddings(db: Database.Database, provider: BackfillEmbeddingProvider, readNodeFromPath: (dataFile: string) => Node, options: BackfillEmbeddingsOptions = {}): Promise<BackfillResult> [exported]
      /** Backfill embeddings for nodes that are missing or have outdated embeddings. This function: 1. Finds nodes needing embedding (missing, wrong model, or old format) 2. Loads full node data from JSON files 3. Builds rich embedding text (summary + decisions + lessons) 4. Generates embeddings in batches via the provider 5. Stores in both node_embeddings table and node_embeddings_vec (if available) Errors are handled gracefully: - Individual node failures don't stop the batch - Returns statistics including failed node IDs for retry */
      refs in: 13 [call: 10, import: 3]
        - src/daemon/cli.ts:29: import (module)
        - src/daemon/cli.ts:1290: call result
        - src/daemon/scheduler.ts:25: import (module)
        - src/daemon/scheduler.ts:761: call Scheduler.runBackfillEmbeddings
        - src/storage/embedding-utils.test.ts:13: import (module)
        - src/storage/embedding-utils.test.ts:901: call result
        - src/storage/embedding-utils.test.ts:925: call result
        - src/storage/embedding-utils.test.ts:947: call result
        - src/storage/embedding-utils.test.ts:970: call result
        - src/storage/embedding-utils.test.ts:1000: call result
    643-675: countNodesNeedingEmbedding(db: Database.Database, provider: BackfillEmbeddingProvider, options: { force?: boolean } = {}): { total: number; needsEmbedding: number; } [exported]
      /** Count nodes that need embedding backfill. Useful for showing progress or estimating work before running backfill. */
      refs in: 3 [call: 2, import: 1]
        - src/storage/embedding-utils.test.ts:16: import (module)
        - src/storage/embedding-utils.test.ts:817: call result
        - src/storage/embedding-utils.test.ts:836: call result
  variable:
    19-19: "[emb:v2]" [exported]
      /** Format version marker appended to rich embedding text. Used to distinguish new-format embeddings (even with empty decisions/lessons) from old simple-format embeddings. */
      refs in: 2 [import: 2]
        - src/daemon/facet-discovery.test.ts:13: import (module)
        - src/storage/embedding-utils.test.ts:19: import (module)
  imports:
    - ../types/index.js
    - ./database.js
    - better-sqlite3

src/storage/filter-utils.ts [1-302]
  interface:
    47-68: interface BaseFilters [exported]
      /** Base filter fields shared by all filter types */
      refs in: 15 [extends: 1, import: 1, type: 13]
        - src/storage/filter-utils.ts:71: extends ExtendedFilters
        - src/storage/filter-utils.ts:97: type FilterHandler
        - src/storage/filter-utils.ts:103: type handleProjectFilter
        - src/storage/filter-utils.ts:114: type handleExactProjectFilter
        - src/storage/filter-utils.ts:125: type handleTypeFilter
        - src/storage/filter-utils.ts:136: type handleOutcomeFilter
        - src/storage/filter-utils.ts:147: type handleDateRangeFilters
        - src/storage/filter-utils.ts:162: type handleComputerFilter
        - src/storage/filter-utils.ts:173: type handleBooleanFilters
        - src/storage/filter-utils.ts:188: type handleSessionFileFilter
    71-76: interface ExtendedFilters extends BaseFilters [exported]
      /** Extended filters with additional fields for listNodes */
      refs in: 14 [import: 1, type: 13]
        - src/storage/filter-utils.ts:97: type FilterHandler
        - src/storage/filter-utils.ts:103: type handleProjectFilter
        - src/storage/filter-utils.ts:114: type handleExactProjectFilter
        - src/storage/filter-utils.ts:125: type handleTypeFilter
        - src/storage/filter-utils.ts:136: type handleOutcomeFilter
        - src/storage/filter-utils.ts:147: type handleDateRangeFilters
        - src/storage/filter-utils.ts:162: type handleComputerFilter
        - src/storage/filter-utils.ts:173: type handleBooleanFilters
        - src/storage/filter-utils.ts:188: type handleSessionFileFilter
        - src/storage/filter-utils.ts:199: type handleTagsFilter
    79-84: interface WhereClauseResult [exported]
      /** Result of building a WHERE clause */
      refs in: 1 [type: 1]
        - src/storage/filter-utils.ts:282: type buildWhereClause
  function:
    32-40: normalizePagination(limit?: number, offset?: number): { limit: number; offset: number; } [exported]
      /** Normalize pagination options with clamping. */
      refs in: 12 [call: 7, import: 5]
        - src/storage/decision-repository.ts:9: import (module)
        - src/storage/decision-repository.ts:63: call { limit, offset }
        - src/storage/lesson-repository.ts:11: import (module)
        - src/storage/lesson-repository.ts:163: call { limit, offset }
        - src/storage/node-queries.ts:16: import (module)
        - src/storage/node-queries.ts:206: call { limit, offset }
        - src/storage/quirk-repository.ts:11: import (module)
        - src/storage/quirk-repository.ts:109: call { limit, offset }
        - src/storage/quirk-repository.ts:228: call { limit }
        - src/storage/tool-error-repository.ts:11: import (module)
    279-301: buildWhereClause(filters: BaseFilters | ExtendedFilters | undefined, tableAlias = "n"): WhereClauseResult [exported]
      /** Build a WHERE clause from filter conditions. Supports filtering by: - project (partial match via LIKE) - exactProject (exact match) - type (exact match) - outcome (exact match) - date range (from/to on timestamp field) - computer (exact match) - hadClearGoal (boolean) - isNewProject (boolean) - sessionFile (exact match) - tags (AND logic - nodes must have ALL specified tags) - topics (AND logic - nodes must have ALL specified topics) */
      refs in: 8 [call: 4, import: 4]
        - src/storage/hybrid-search.ts:18: import (module)
        - src/storage/hybrid-search.ts:624: call { clause: filterClause, params: filterParams }
        - src/storage/node-queries.ts:15: import (module)
        - src/storage/node-queries.ts:147: call { clause, params }
        - src/storage/search-repository.ts:14: import (module)
        - src/storage/search-repository.ts:380: call { clause: filterClause, params }
        - src/storage/semantic-search.ts:19: import (module)
        - src/storage/semantic-search.ts:73: call { clause: filterClause, params: filterParams }
  imports:
    - ./node-types.js

src/storage/graph-repository.ts [1-416]
  interface:
    31-47: interface ConnectedNodesOptions [exported]
      /** Options for getConnectedNodes */
      refs in: 2 [type: 2]
        - src/storage/graph-repository.ts:222: type getConnectedNodes
        - src/storage/graph-repository.ts:284: type getSubgraph
    50-65: interface TraversalEdge [exported]
      /** An edge with direction information for traversal results */
      refs in: 5 [type: 5]
        - src/storage/graph-repository.ts:74: type ConnectedNodesResult
        - src/storage/graph-repository.ts:122: type toTraversalEdge
        - src/storage/graph-repository.ts:143: type processEdge
        - src/storage/graph-repository.ts:231: type traversalEdges
        - src/storage/graph-repository.ts:293: type allEdges
    68-75: interface ConnectedNodesResult [exported]
      /** Result from getConnectedNodes */
      refs in: 4 [type: 4]
        - src/storage/graph-repository.ts:223: type getConnectedNodes
        - src/storage/graph-repository.ts:285: type getSubgraph
        - src/storage/graph-repository.ts:392: type getAncestors
        - src/storage/graph-repository.ts:409: type getDescendants
  type:
    28-28: TraversalDirection = "incoming" | "outgoing" | "both" [exported]
      /** Direction for graph traversal */
      refs in: 2 [type: 2]
        - src/storage/graph-repository.ts:41: type ConnectedNodesOptions
        - src/storage/graph-repository.ts:93: type getEdgesToProcess
  function:
    219-271: getConnectedNodes(db: Database.Database, nodeId: string, options: ConnectedNodesOptions = {}): ConnectedNodesResult [exported]
      /** Get all nodes connected to a specific node with graph traversal. Supports: - Multi-hop traversal (depth 1-5) - Direction filtering (incoming, outgoing, both) - Edge type filtering Based on specs/storage.md graph traversal query and specs/api.md GET /api/v1/nodes/:id/connected endpoint. */
      refs in: 6 [call: 5, import: 1]
        - src/api/routes/nodes.ts:10: import (module)
        - src/api/routes/nodes.ts:50: call connected
        - src/api/routes/nodes.ts:216: call result
        - src/storage/graph-repository.ts:296: call result
        - src/storage/graph-repository.ts:393: call getAncestors
        - src/storage/graph-repository.ts:410: call getDescendants
    281-318: getSubgraph(db: Database.Database, rootNodeIds: string[], options: ConnectedNodesOptions = {}): ConnectedNodesResult [exported]
      /** Get the subgraph for visualization - returns nodes and edges within a given depth from multiple root nodes. Unlike getConnectedNodes, this INCLUDES the root nodes in the result, which is useful for rendering a graph view starting from selected nodes. */
    327-381: findPath(db: Database.Database, fromNodeId: string, toNodeId: string, options: { maxDepth?: number } = {}): { nodeIds: {}; edges: {}; } [exported]
      /** Get the path between two nodes if one exists. Uses BFS to find the shortest path. Returns null if no path exists. */
    388-398: getAncestors(db: Database.Database, nodeId: string, options: { maxDepth?: number; edgeTypes?: EdgeType[] } = {}): ConnectedNodesResult [exported]
      /** Get all ancestors of a node (nodes that lead TO this node). Follows incoming edges only. */
    405-415: getDescendants(db: Database.Database, nodeId: string, options: { maxDepth?: number; edgeTypes?: EdgeType[] } = {}): ConnectedNodesResult [exported]
      /** Get all descendants of a node (nodes that this node leads TO). Follows outgoing edges only. */
  imports:
    - ./edge-repository.js
    - ./node-crud.js
    - ./node-types.js
    - better-sqlite3

src/storage/hybrid-search.test.ts [1-443]
  imports:
    - ./hybrid-search.js
    - better-sqlite3
    - vitest

src/storage/hybrid-search.ts [1-732]
  interface:
    28-37: interface HybridWeights [exported]
      /** Type for hybrid search weight keys */
      refs in: 2 [type: 2]
        - src/storage/hybrid-search.ts:44: type HYBRID_WEIGHTS
        - src/storage/hybrid-search.ts:125: type HybridSearchOptions
    71-90: interface HybridScoreBreakdown [exported]
      /** Breakdown of scores for transparency and debugging. */
      refs in: 6 [import: 1, type: 5]
        - src/daemon/query-processor.ts:26: import (module)
        - src/daemon/query-processor.ts:256: type RelevantNode
        - src/storage/hybrid-search.ts:101: type HybridSearchResult
        - src/storage/hybrid-search.ts:296: type calculateHybridScore
        - src/storage/hybrid-search.ts:302: type breakdown
        - src/storage/hybrid-search.ts:690: type calculateNodeHybridScore
    95-106: interface HybridSearchResult [exported]
      /** Enhanced search result with hybrid scoring. */
      refs in: 5 [import: 1, type: 4]
        - src/storage/hybrid-search.test.ts:10: import (module)
        - src/storage/hybrid-search.test.ts:400: type findNode
        - src/storage/hybrid-search.ts:135: type HybridSearchResponse
        - src/storage/hybrid-search.ts:524: type buildScoredResults
        - src/storage/hybrid-search.ts:525: type results
    111-128: interface HybridSearchOptions [exported]
      /** Options for hybrid search. */
      refs in: 4 [type: 4]
        - src/storage/hybrid-search.ts:295: type calculateHybridScore
        - src/storage/hybrid-search.ts:523: type buildScoredResults
        - src/storage/hybrid-search.ts:608: type hybridSearch
        - src/storage/hybrid-search.ts:689: type calculateNodeHybridScore
    133-144: interface HybridSearchResponse [exported]
      /** Result from hybrid search with pagination metadata. */
      refs in: 1 [type: 1]
        - src/storage/hybrid-search.ts:609: type hybridSearch
  function:
    605-676: hybridSearch(db: Database.Database, query: string, options: HybridSearchOptions = {}): HybridSearchResponse [exported]
      /** Perform hybrid search combining vector, FTS, relation, and other signals. The algorithm: 1. If queryEmbedding provided, perform vector search to get initial candidates 2. Perform FTS search to get keyword matches 3. Merge candidates from both sources 4. For each candidate, calculate edge count (relation score) 5. Calculate all score components and weighted final score 6. Sort by final score, apply pagination */
      refs in: 16 [call: 13, import: 3]
        - src/daemon/query-processor.test.ts:10: import (module)
        - src/daemon/query-processor.ts:25: import (module)
        - src/daemon/query-processor.ts:281: call searchResponse
        - src/storage/hybrid-search.test.ts:12: import (module)
        - src/storage/hybrid-search.test.ts:277: call result
        - src/storage/hybrid-search.test.ts:284: call result
        - src/storage/hybrid-search.test.ts:291: call result
        - src/storage/hybrid-search.test.ts:298: call result
        - src/storage/hybrid-search.test.ts:304: call result
        - src/storage/hybrid-search.test.ts:309: call resultWithoutBoost
    685-731: calculateNodeHybridScore(db: Database.Database, nodeId: string, query: string, options: HybridSearchOptions = {}): HybridScoreBreakdown [exported]
      /** Calculate hybrid score for a single node (useful for re-ranking). */
      refs in: 6 [call: 5, import: 1]
        - src/storage/hybrid-search.test.ts:11: import (module)
        - src/storage/hybrid-search.test.ts:360: call result
        - src/storage/hybrid-search.test.ts:365: call result
        - src/storage/hybrid-search.test.ts:372: call result
        - src/storage/hybrid-search.test.ts:377: call resultWithBoost
        - src/storage/hybrid-search.test.ts:384: call result
  variable:
    44-53: HybridWeights [exported]
      /** Weights for each scoring component. Sum should equal ~1.3 to allow strong signals to boost final score. Final scores are normalized to 0..1 range. */
      refs in: 1 [import: 1]
        - src/storage/hybrid-search.test.ts:13: import (module)
  imports:
    - ./database.js
    - ./filter-utils.js
    - ./node-crud.js
    - ./search-repository.js
    - ./semantic-search.js
    - better-sqlite3

src/storage/lesson-repository.ts [1-286]
  interface:
    18-27: interface ListLessonsFilters [exported]
      /** Filters for querying lessons */
      refs in: 6 [import: 1, type: 5]
        - src/api/routes/lessons.ts:10: import (module)
        - src/api/routes/lessons.ts:39: type filters
        - src/api/routes/lessons.ts:40: type filters
        - src/api/routes/lessons.ts:43: type filters
        - src/storage/lesson-repository.ts:79: type buildLessonWhereClause
        - src/storage/lesson-repository.ts:160: type listLessons
    30-35: interface ListLessonsOptions [exported]
      /** Pagination options for lessons */
      refs in: 3 [import: 1, type: 2]
        - src/api/routes/lessons.ts:11: import (module)
        - src/api/routes/lessons.ts:46: type options
        - src/storage/lesson-repository.ts:161: type listLessons
    38-57: interface ListLessonsResult [exported]
      /** Result from listLessons query */
      refs in: 1 [type: 1]
        - src/storage/lesson-repository.ts:162: type listLessons
  type:
    60-70: LessonsByLevelResult = Record<
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
      refs in: 2 [type: 2]
        - src/storage/lesson-repository.ts:220: type getLessonsByLevel
        - src/storage/lesson-repository.ts:230: type result
  function:
    158-209: listLessons(db: Database.Database, filters: ListLessonsFilters = {}, options: ListLessonsOptions = {}): ListLessonsResult [exported]
      /** List lessons with filters and pagination. Supports filtering by: - level (exact match) - project (partial match via nodes table) - tags (AND logic via lesson_tags table) - confidence (exact match) Per specs/api.md GET /api/v1/lessons endpoint. */
      refs in: 2 [call: 1, import: 1]
        - src/api/routes/lessons.ts:9: import (module)
        - src/api/routes/lessons.ts:51: call result
    217-257: getLessonsByLevel(db: Database.Database, recentLimit = 5): Record<string, { count: number; recent: {}; }> [exported]
      /** Get aggregated lesson stats by level. Returns counts and most recent lessons for each level. Per specs/api.md GET /api/v1/lessons/by-level endpoint. */
      refs in: 2 [call: 1, import: 1]
        - src/api/routes/lessons.ts:8: import (module)
        - src/api/routes/lessons.ts:65: call result
    262-285: getNodeLessons(db: Database.Database, nodeId: string): {} [exported]
      /** Get lessons for a node */
      refs in: 2 [call: 1, import: 1]
        - src/api/routes/nodes.ts:11: import (module)
        - src/api/routes/nodes.ts:44: call buildIncludeFetchers
  imports:
    - ./filter-utils.js
    - better-sqlite3

src/storage/node-conversion.ts [1-432]
  interface:
    25-44: interface NodeConversionContext [exported]
      /** Context needed to convert AgentNodeOutput to a full Node */
      refs in: 1 [type: 1]
        - src/storage/node-conversion.ts:56: type agentOutputToNode
  function:
    54-261: agentOutputToNode(output: AgentNodeOutput, context: NodeConversionContext): Node [exported]
      /** Convert AgentNodeOutput from the analyzer to a full Node structure Fills in source, metadata, and identity fields from the job context */
      refs in: 2 [call: 1, import: 1]
        - src/daemon/worker.ts:32: import (module)
        - src/daemon/worker.ts:602: call Worker.createNodeFromResult
    416-424: nodeRowToNode(row: NodeRow, loadFull = false): Node [exported]
      /** Transform a NodeRow (flat SQLite row) to Node (nested structure). For listings, constructs Node from row data without reading JSON. For full details, reads the JSON file. */
      refs in: 1 [call: 1]
        - src/storage/node-conversion.ts:430: call nodeRowsToNodes
    429-431: nodeRowsToNodes(rows: NodeRow[], loadFull = false): {} [exported]
      /** Transform array of NodeRows to Nodes */
      refs in: 5 [call: 3, import: 2]
        - src/api/routes/nodes.ts:12: import (module)
        - src/api/routes/nodes.ts:134: call transformedResult
        - src/api/routes/nodes.ts:224: call transformedResult
        - src/api/routes/sessions.ts:9: import (module)
        - src/api/routes/sessions.ts:229: call sessionNodes
  imports:
    - ../daemon/processor.js
    - ../daemon/queue.js
    - ./node-crud.js
    - ./node-storage.js
    - ./node-types.js

src/storage/node-crud.ts [1-784]
  interface:
    52-55: interface RepositoryOptions extends NodeStorageOptions [exported]
      /** Options for node repository operations */
      refs in: 7 [import: 2, type: 5]
        - src/daemon/semantic-search.integration.test.ts:14: import (module)
        - src/daemon/semantic-search.integration.test.ts:126: type options
        - src/storage/decision-repository.test.ts:15: import (module)
        - src/storage/decision-repository.test.ts:21: type options
        - src/storage/node-crud.ts:502: type createNode
        - src/storage/node-crud.ts:590: type upsertNode
        - src/storage/node-crud.ts:645: type getAllNodeVersions
    58-91: interface NodeRow [exported]
      /** Node row from the database */
      refs in: 51 [import: 10, type: 41]
        - src/daemon/connection-discovery.ts:13: import (module)
        - src/daemon/connection-discovery.ts:249: type ConnectionDiscoverer.discoverSemanticEdges
        - src/daemon/connection-discovery.ts:319: type ConnectionDiscoverer.findCandidates
        - src/daemon/connection-discovery.ts:340: type ConnectionDiscoverer.findCandidates
        - src/daemon/graph-export.ts:8: import (module)
        - src/daemon/graph-export.ts:98: type formatNodeLabel
        - src/daemon/query-processor.ts:16: import (module)
        - src/daemon/query-processor.ts:360: type nodeRowToRelevant
        - src/storage/bridge-discovery.ts:13: import (module)
        - src/storage/bridge-discovery.ts:25: type BridgePath
  function:
    100-155: insertLessons(db: Database.Database, nodeId: string, lessonsByLevel: LessonsByLevel): void [exported]
      /** Insert lessons for a node and update lesson_patterns aggregation */
      refs in: 2 [call: 2]
        - src/storage/node-crud.ts:485: call insertNodeToDb
        - src/storage/node-crud.ts:572: call insertNodeRelatedData
    160-193: insertModelQuirks(db: Database.Database, nodeId: string, quirks: ModelQuirk[]): void [exported]
      /** Insert model quirks for a node and update model_stats aggregation */
      refs in: 2 [call: 2]
        - src/storage/node-crud.ts:486: call insertNodeToDb
        - src/storage/node-crud.ts:573: call insertNodeRelatedData
    198-262: insertToolErrors(db: Database.Database, nodeId: string, errors: ToolError[]): void [exported]
      /** Insert tool errors for a node and update failure_patterns + model_stats aggregation */
      refs in: 2 [call: 2]
        - src/storage/node-crud.ts:487: call insertNodeToDb
        - src/storage/node-crud.ts:574: call insertNodeRelatedData
    267-286: insertDaemonDecisions(db: Database.Database, nodeId: string, decisions: DaemonDecision[]): void [exported]
      /** Insert daemon decisions for a node */
      refs in: 2 [call: 2]
        - src/storage/node-crud.ts:488: call insertNodeToDb
        - src/storage/node-crud.ts:575: call insertNodeRelatedData
    296-325: clearAllData(db: Database.Database): void [exported]
      /** Clear all data from the database (nodes, edges, etc.) Used by rebuild-index CLI */
      refs in: 2 [call: 1, import: 1]
        - src/daemon/cli.ts:31: import (module)
        - src/daemon/cli.ts:1167: call rebuildIndex
    477-493: insertNodeToDb(db: Database.Database, node: Node, dataFile: string, options: { skipFts?: boolean } = {}): void [exported]
      /** Insert a node into the database (without writing JSON file) Used by createNode and rebuild-index CLI */
      refs in: 4 [call: 3, import: 1]
        - src/daemon/cli.ts:32: import (module)
        - src/daemon/cli.ts:1179: call processInsertBatch
        - src/storage/node-crud.ts:509: call createNode
        - src/storage/node-crud.ts:600: call upsertNode
    499-513: createNode(db: Database.Database, node: Node, options: RepositoryOptions = {}): Node [exported]
      /** Create a node - writes to both SQLite and JSON storage Returns the node with any auto-generated fields filled in */
      refs in: 28 [call: 24, import: 4]
        - src/api/server.test.ts:14: import (module)
        - src/api/server.test.ts:224: call (module)
        - src/api/server.test.ts:272: call (module)
        - src/api/server.test.ts:273: call (module)
        - src/api/server.test.ts:320: call (module)
        - src/api/server.test.ts:410: call (module)
        - src/api/server.test.ts:411: call (module)
        - src/api/server.test.ts:412: call (module)
        - src/api/server.test.ts:553: call (module)
        - src/api/server.test.ts:554: call (module)
    587-619: upsertNode(db: Database.Database, node: Node, options: RepositoryOptions = {}): { node: Node; created: boolean; } [exported]
      /** Upsert a node - creates if not exists, updates if exists. This provides idempotent ingestion for analysis jobs. If a job crashes after writing JSON but before DB insert, re-running will update the existing data cleanly without duplicates or errors. Returns the node and whether it was created (true) or updated (false). */
      refs in: 4 [call: 2, import: 2]
        - src/daemon/worker.test.ts:21: import (module)
        - src/daemon/worker.test.ts:1059: call (module)
        - src/daemon/worker.ts:36: import (module)
        - src/daemon/worker.ts:562: call Worker.{ created }
    624-630: getNode(db: Database.Database, nodeId: string): NodeRow [exported]
      /** Get a node by ID (returns the row from SQLite - always the latest version) */
      refs in: 9 [call: 6, import: 3]
        - src/api/routes/nodes.ts:13: import (module)
        - src/api/routes/nodes.ts:164: call nodeRow
        - src/api/routes/nodes.ts:209: call nodeRow
        - src/daemon/connection-discovery.ts:13: import (module)
        - src/daemon/connection-discovery.ts:203: call ConnectionDiscoverer.sourceNode
        - src/daemon/connection-discovery.ts:398: call ConnectionDiscoverer.targetNode
        - src/storage/bridge-discovery.ts:13: import (module)
        - src/storage/bridge-discovery.ts:76: call node
        - src/storage/bridge-discovery.ts:102: call fetched
    635-638: nodeExistsInDb(db: Database.Database, nodeId: string): boolean [exported]
      /** Check if a node exists in the database */
      refs in: 1 [call: 1]
        - src/storage/node-crud.ts:593: call exists
    643-649: getAllNodeVersions(nodeId: string, options: RepositoryOptions = {}): {} [exported]
      /** Get all versions of a node from JSON storage */
      refs in: 2 [call: 1, import: 1]
        - src/api/routes/nodes.ts:13: import (module)
        - src/api/routes/nodes.ts:54: call allVersions
    657-668: findLastNodeInSession(db: Database.Database, sessionFile: string): NodeRow [exported]
      /** Find a node that contains a specific entry ID as its end boundary Find the latest node for a given session file */
      refs in: 1 [call: 1]
        - src/storage/node-crud.ts:760: call parentLastNode
    677-702: findPreviousProjectNode(db: Database.Database, project: string, beforeTimestamp: string): any [exported]
      /** Find the most recent node for a project before a given timestamp. Used for abandoned restart detection. Returns the full Node from JSON storage (not just the row) to access filesTouched and other content fields. */
      refs in: 2 [call: 1, import: 1]
        - src/daemon/worker.ts:34: import (module)
        - src/daemon/worker.ts:687: call Worker.previousNode
    729-767: linkNodeToPredecessors(db: Database.Database, node: Node, context: {
    boundaryType?: string;
  } = {}): {} [exported]
      /** Automatically link a node to its predecessors based on session structure. Creates structural edges based on session continuity and fork relationships. Idempotent: will not create duplicate edges if called multiple times. */
      refs in: 4 [call: 2, import: 2]
        - src/daemon/cli.ts:33: import (module)
        - src/daemon/cli.ts:1204: call processLinkBatch
        - src/daemon/worker.ts:35: import (module)
        - src/daemon/worker.ts:568: call Worker.processAnalysisResult
  imports:
    - ./edge-repository.js
    - ./node-storage.js
    - ./node-types.js
    - ./search-repository.js
    - better-sqlite3
    - node:crypto

src/storage/node-queries.ts [1-258]
  interface:
    76-85: interface ListNodesOptions [exported]
      /** Pagination and sorting options */
      refs in: 5 [import: 1, type: 4]
        - src/api/routes/nodes.ts:19: import (module)
        - src/api/routes/nodes.ts:124: type options
        - src/api/routes/nodes.ts:127: type options
        - src/api/routes/nodes.ts:128: type options
        - src/storage/node-queries.ts:130: type listNodes
    88-97: interface ListNodesResult [exported]
      /** Result from listNodes query */
      refs in: 1 [type: 1]
        - src/storage/node-queries.ts:131: type listNodes
    183-195: interface SessionSummaryRow [exported]
      /** Session summary row from aggregation query */
      refs in: 2 [type: 2]
        - src/storage/node-queries.ts:205: type getSessionSummaries
        - src/storage/node-queries.ts:228: type getSessionSummaries
  type:
    59-67: NodeSortField = | "timestamp"
  | "analyzed_at"
  | "project"
  | "type"
  | "outcome"
  | "tokens_used"
  | "cost"
  | "duration_minutes" [exported]
      /** Valid sort fields for listNodes */
      refs in: 5 [type: 5]
        - src/storage/node-queries.ts:82: type ListNodesOptions
        - src/storage/node-queries.ts:100: type ALLOWED_SORT_FIELDS
        - src/storage/node-queries.ts:137: type sort
        - src/storage/node-queries.ts:138: type sort
        - src/storage/node-queries.ts:140: type sort
    70-70: SortOrder = "asc" | "desc" [exported]
      /** Sort order */
      refs in: 2 [type: 2]
        - src/storage/node-queries.ts:84: type ListNodesOptions
        - src/storage/node-queries.ts:142: type order
    73-73: ListNodesFilters = ExtendedFilters [exported]
      /** Filters for querying nodes */
      refs in: 13 [import: 3, type: 10]
        - src/api/routes/nodes.ts:18: import (module)
        - src/api/routes/nodes.ts:111: type filters
        - src/api/routes/nodes.ts:113: type filters
        - src/api/routes/nodes.ts:114: type filters
        - src/api/routes/search.ts:7: import (module)
        - src/api/routes/search.ts:48: type filters
        - src/api/routes/search.ts:50: type filters
        - src/api/routes/search.ts:51: type filters
        - src/daemon/query-processor.ts:28: import (module)
        - src/daemon/query-processor.ts:270: type filters
  function:
    27-34: getNodeSummary(db: Database.Database, nodeId: string): string [exported]
      /** Get node summary from FTS index */
      refs in: 4 [call: 2, import: 2]
        - src/daemon/connection-discovery.ts:14: import (module)
        - src/daemon/connection-discovery.ts:213: call ConnectionDiscoverer.sourceSummary
        - src/daemon/graph-export.ts:13: import (module)
        - src/daemon/graph-export.ts:67: call summary
    39-43: getNodeTags(db: Database.Database, nodeId: string): {} [exported]
      /** Get tags for a node */
      refs in: 2 [call: 1, import: 1]
        - src/api/routes/nodes.ts:15: import (module)
        - src/api/routes/nodes.ts:47: call buildIncludeFetchers
    48-52: getNodeTopics(db: Database.Database, nodeId: string): {} [exported]
      /** Get topics for a node */
      refs in: 2 [call: 1, import: 1]
        - src/api/routes/nodes.ts:16: import (module)
        - src/api/routes/nodes.ts:48: call buildIncludeFetchers
    127-174: listNodes(db: Database.Database, filters: ListNodesFilters = {}, options: ListNodesOptions = {}): ListNodesResult [exported]
      /** List nodes with filters, pagination, and sorting. Supports filtering by: - project (partial match via LIKE) - type (exact match) - outcome (exact match) - date range (from/to on timestamp field) - computer (exact match) - hadClearGoal (boolean) - isNewProject (boolean) - tags (AND logic - nodes must have ALL specified tags) - topics (AND logic - nodes must have ALL specified topics) Per specs/api.md GET /api/v1/nodes endpoint. */
      refs in: 12 [call: 7, import: 5]
        - src/api/routes/nodes.ts:17: import (module)
        - src/api/routes/nodes.ts:131: call result
        - src/api/routes/sessions.ts:13: import (module)
        - src/api/routes/sessions.ts:61: call result
        - src/api/routes/sessions.ts:132: call checkResult
        - src/api/routes/sessions.ts:224: call result
        - src/daemon/graph-export.ts:13: import (module)
        - src/daemon/graph-export.ts:37: call nodesResult
        - src/daemon/query-processor.test.ts:11: import (module)
        - src/daemon/query-processor.ts:28: import (module)
    201-229: getSessionSummaries(db: Database.Database, project: string, options: { limit?: number; offset?: number } = {}): {} [exported]
      /** Get aggregated session summaries for a project. Used for the session browser to avoid loading thousands of nodes. */
      refs in: 3 [call: 2, import: 1]
        - src/api/routes/sessions.ts:12: import (module)
        - src/api/routes/sessions.ts:69: call sessionSummaries
        - src/api/routes/sessions.ts:152: call allSummaries
    238-246: getAllProjects(db: Database.Database): {} [exported]
      /** Get all unique projects in the system */
      refs in: 2 [call: 1, import: 1]
        - src/api/routes/sessions.ts:11: import (module)
        - src/api/routes/sessions.ts:56: call projects
    251-257: countNodes(db: Database.Database, filters: ListNodesFilters = {}): number [exported]
      /** Count nodes matching filters (without fetching data) */
  imports:
    - ./filter-utils.js
    - ./node-crud.js
    - better-sqlite3

src/storage/node-storage.test.ts [1-874]
  imports:
    - ./node-storage.js
    - ./node-types.js
    - node:fs
    - node:os
    - node:path
    - vitest

src/storage/node-storage.ts [1-323]
  interface:
    44-47: interface NodeStorageOptions [exported]
      refs in: 10 [extends: 1, import: 1, type: 8]
        - src/storage/node-crud.ts:19: import (module)
        - src/storage/node-crud.ts:52: extends RepositoryOptions
        - src/storage/node-storage.ts:84: type writeNode
        - src/storage/node-storage.ts:122: type readNode
        - src/storage/node-storage.ts:154: type nodeExists
        - src/storage/node-storage.ts:165: type listNodeFiles
        - src/storage/node-storage.ts:214: type listNodeVersions
        - src/storage/node-storage.ts:240: type getLatestNodeVersion
        - src/storage/node-storage.ts:255: type readLatestNode
        - src/storage/node-storage.ts:301: type createNodeVersion
  function:
    53-61: getNodeDir(timestamp: string, nodesDir = DEFAULT_NODES_DIR): string [exported]
      /** Get the directory path for a node based on its timestamp Returns: nodesDir/YYYY/MM */
      refs in: 6 [call: 5, import: 1]
        - src/storage/node-storage.test.ts:13: import (module)
        - src/storage/node-storage.test.ts:113: call dir
        - src/storage/node-storage.test.ts:123: call dir
        - src/storage/node-storage.test.ts:133: call dir
        - src/storage/node-storage.test.ts:203: call expectedDir
        - src/storage/node-storage.ts:73: call dir
    67-75: getNodePath(nodeId: string, version: number, timestamp: string, nodesDir = DEFAULT_NODES_DIR): string [exported]
      /** Get the full file path for a node Returns: nodesDir/YYYY/MM/<nodeId>-v<version>.json */
      refs in: 6 [call: 5, import: 1]
        - src/storage/node-storage.test.ts:14: import (module)
        - src/storage/node-storage.test.ts:145: call path
        - src/storage/node-storage.test.ts:162: call path
        - src/storage/node-storage.ts:96: call filePath
        - src/storage/node-storage.ts:125: call filePath
        - src/storage/node-storage.ts:157: call filePath
    82-113: writeNode(node: Node, options: NodeStorageOptions = {}): string [exported]
      /** Write a node to JSON file storage */
      refs in: 27 [call: 25, import: 2]
        - src/storage/node-crud.ts:18: import (module)
        - src/storage/node-crud.ts:506: call dataFile
        - src/storage/node-crud.ts:596: call dataFile
        - src/storage/node-storage.test.ts:22: import (module)
        - src/storage/node-storage.test.ts:182: call path
        - src/storage/node-storage.test.ts:207: call (module)
        - src/storage/node-storage.test.ts:234: call path
        - src/storage/node-storage.test.ts:255: call (module)
        - src/storage/node-storage.test.ts:337: call (module)
        - src/storage/node-storage.test.ts:338: call (module)
    118-133: readNode(nodeId: string, version: number, timestamp: string, options: NodeStorageOptions = {}): Node [exported]
      /** Read a node from JSON file storage */
      refs in: 3 [call: 2, import: 1]
        - src/storage/node-storage.test.ts:20: import (module)
        - src/storage/node-storage.test.ts:186: call readBack
        - src/storage/node-storage.test.ts:219: call (module)
    138-145: readNodeFromPath(filePath: string): Node [exported]
      /** Read a node by file path */
      refs in: 26 [call: 14, import: 12]
        - src/api/routes/nodes.ts:21: import (module)
        - src/api/routes/nodes.ts:173: call node
        - src/daemon/cli.ts:38: import (module)
        - src/daemon/cli.ts:1178: call node
        - src/daemon/cli.ts:1203: call node
        - src/daemon/export.ts:12: import (module)
        - src/daemon/export.ts:85: call node
        - src/daemon/facet-discovery.ts:39: import (module)
        - src/daemon/facet-discovery.ts:994: call FacetDiscovery.fullNode
        - src/daemon/insight-aggregation.ts:20: import (module)
    150-159: nodeExists(nodeId: string, version: number, timestamp: string, options: NodeStorageOptions = {}): boolean [exported]
      /** Check if a node file exists */
      refs in: 3 [call: 2, import: 1]
        - src/storage/node-storage.test.ts:17: import (module)
        - src/storage/node-storage.test.ts:258: call (module)
        - src/storage/node-storage.test.ts:271: call (module)
    165-206: listNodeFiles(options: NodeStorageOptions = {}): {} [exported]
      /** List all node files in the storage directory Returns array of file paths */
      refs in: 9 [call: 6, import: 3]
        - src/daemon/cli.ts:36: import (module)
        - src/daemon/cli.ts:1143: call files
        - src/daemon/export.ts:12: import (module)
        - src/daemon/export.ts:137: call files
        - src/storage/node-storage.test.ts:15: import (module)
        - src/storage/node-storage.test.ts:285: call files
        - src/storage/node-storage.test.ts:295: call files
        - src/storage/node-storage.test.ts:341: call files
        - src/storage/node-storage.ts:216: call allFiles
    212-233: listNodeVersions(nodeId: string, options: NodeStorageOptions = {}): {} [exported]
      /** List all versions of a specific node Returns array of { version, path } sorted by version ascending */
      refs in: 7 [call: 5, import: 2]
        - src/storage/node-crud.ts:16: import (module)
        - src/storage/node-crud.ts:647: call versions
        - src/storage/node-storage.test.ts:16: import (module)
        - src/storage/node-storage.test.ts:356: call versions
        - src/storage/node-storage.test.ts:420: call versions
        - src/storage/node-storage.test.ts:714: call versions
        - src/storage/node-storage.ts:242: call versions
    238-248: getLatestNodeVersion(nodeId: string, options: NodeStorageOptions = {}): { version: number; path: string; } [exported]
      /** Get the latest version of a node */
      refs in: 4 [call: 3, import: 1]
        - src/storage/node-storage.test.ts:12: import (module)
        - src/storage/node-storage.test.ts:436: call latest
        - src/storage/node-storage.test.ts:495: call latest
        - src/storage/node-storage.ts:257: call latest
    253-262: readLatestNode(nodeId: string, options: NodeStorageOptions = {}): any [exported]
      /** Read the latest version of a node */
      refs in: 3 [call: 2, import: 1]
        - src/storage/node-storage.test.ts:19: import (module)
        - src/storage/node-storage.test.ts:509: call node
        - src/storage/node-storage.test.ts:570: call latest
    267-292: parseNodePath(filePath: string): { nodeId: string; version: number; year: string; month: string; } [exported]
      /** Parse a node file path to extract node ID, version, year, and month */
      refs in: 9 [call: 7, import: 2]
        - src/daemon/cli.ts:37: import (module)
        - src/daemon/cli.ts:1151: call parsed
        - src/storage/node-storage.test.ts:18: import (module)
        - src/storage/node-storage.test.ts:584: call result
        - src/storage/node-storage.test.ts:596: call result
        - src/storage/node-storage.test.ts:608: call result
        - src/storage/node-storage.test.ts:614: call result
        - src/storage/node-storage.test.ts:620: call result
        - src/storage/node-storage.test.ts:626: call result
    298-322: createNodeVersion(existingNode: Node, updates: Partial<Node>, options: NodeStorageOptions = {}): Node [exported]
      /** Create a new version of an existing node Copies the node with incremented version and updated previousVersions */
      refs in: 7 [call: 6, import: 1]
        - src/storage/node-storage.test.ts:11: import (module)
        - src/storage/node-storage.test.ts:638: call newNode
        - src/storage/node-storage.test.ts:668: call newNode
        - src/storage/node-storage.test.ts:693: call newNode
        - src/storage/node-storage.test.ts:712: call (module)
        - src/storage/node-storage.test.ts:729: call v2
        - src/storage/node-storage.test.ts:730: call v3
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
      refs in: 2 [import: 1, type: 1]
        - src/storage/filter-utils.ts:11: import (module)
        - src/storage/filter-utils.ts:51: type BaseFilters
    37-37: OutcomeFilter = "success" | "partial" | "failed" | "abandoned" [exported]
      /** Outcome filter values */
      refs in: 2 [import: 1, type: 1]
        - src/storage/filter-utils.ts:11: import (module)
        - src/storage/filter-utils.ts:53: type BaseFilters
  function:
    47-49: generateNodeId(): string [exported]
      /** Generate a unique 16-character hex node ID Uses first 16 chars of UUID (64 bits of entropy) */
      refs in: 22 [call: 20, import: 2]
        - src/storage/bridge-discovery.test.ts:12: import (module)
        - src/storage/bridge-discovery.test.ts:99: call idA
        - src/storage/bridge-discovery.test.ts:100: call idB
        - src/storage/bridge-discovery.test.ts:119: call idA
        - src/storage/bridge-discovery.test.ts:120: call idB
        - src/storage/bridge-discovery.test.ts:121: call idC
        - src/storage/bridge-discovery.test.ts:142: call idA
        - src/storage/bridge-discovery.test.ts:143: call idB
        - src/storage/bridge-discovery.test.ts:155: call idA
        - src/storage/bridge-discovery.test.ts:156: call idB
    51-53: generateLessonId(): string [exported]
      refs in: 2 [call: 1, import: 1]
        - src/storage/node-crud.ts:24: import (module)
        - src/storage/node-crud.ts:127: call lessonId
    55-57: generateQuirkId(): string [exported]
      refs in: 2 [call: 1, import: 1]
        - src/storage/node-crud.ts:25: import (module)
        - src/storage/node-crud.ts:182: call insertModelQuirks
    59-61: generateErrorId(): string [exported]
      refs in: 2 [call: 1, import: 1]
        - src/storage/node-crud.ts:23: import (module)
        - src/storage/node-crud.ts:232: call insertToolErrors
    63-65: generateDecisionId(): string [exported]
      refs in: 2 [call: 1, import: 1]
        - src/storage/node-crud.ts:22: import (module)
        - src/storage/node-crud.ts:279: call insertDaemonDecisions
    81-91: generateDeterministicNodeId(sessionFile: string, segmentStart: string, segmentEnd: string): string [exported]
      /** Generate a deterministic 16-character hex node ID based on session and segment. This ensures idempotent ingestion - re-running the same job produces the same ID. The ID is derived from: - Session file path - Segment start entry ID - Segment end entry ID Uses length-prefix encoding to prevent collisions from inputs containing delimiter characters (e.g., "a:b" + "c" vs "a" + "b:c"). Two jobs with the same inputs will always produce the same node ID. */
      refs in: 14 [call: 12, import: 2]
        - src/storage/node-conversion.ts:14: import (module)
        - src/storage/node-conversion.ts:85: call agentOutputToNode
        - src/storage/node-storage.test.ts:28: import (module)
        - src/storage/node-storage.test.ts:762: call id
        - src/storage/node-storage.test.ts:771: call id1
        - src/storage/node-storage.test.ts:776: call id2
        - src/storage/node-storage.test.ts:785: call id1
        - src/storage/node-storage.test.ts:790: call id2
        - src/storage/node-storage.test.ts:799: call id1
        - src/storage/node-storage.test.ts:804: call id2
    96-98: nodeRef(nodeId: string, version: number): string [exported]
      /** Create a full node reference with version */
    103-112: parseNodeRef(ref: string): { nodeId: string; version: number; } [exported]
      /** Parse a node reference into id and version */
    117-127: emptyLessons(): LessonsByLevel [exported]
      /** Create an empty lessons structure */
      refs in: 2 [call: 1, import: 1]
        - src/storage/node-storage.test.ts:26: import (module)
        - src/storage/node-storage.test.ts:68: call createTestNode
    132-140: emptyObservations(): ModelObservations [exported]
      /** Create an empty observations structure */
      refs in: 2 [call: 1, import: 1]
        - src/storage/node-storage.test.ts:27: import (module)
        - src/storage/node-storage.test.ts:69: call createTestNode
    145-150: emptyDaemonMeta(): DaemonMeta [exported]
      /** Create an empty daemon meta structure */
      refs in: 2 [call: 1, import: 1]
        - src/storage/node-storage.test.ts:25: import (module)
        - src/storage/node-storage.test.ts:82: call createTestNode
  imports:
    - ../types/index.js
    - node:crypto

src/storage/pattern-repository.test.ts [1-210]
  imports:
    - ./database.js
    - ./pattern-repository.js
    - vitest

src/storage/pattern-repository.ts [1-373]
  interface:
    74-78: interface ListFailurePatternsOptions [exported]
      refs in: 1 [type: 1]
        - src/storage/pattern-repository.ts:82: type listFailurePatterns
    142-146: interface ListLessonPatternsOptions [exported]
      refs in: 1 [type: 1]
        - src/storage/pattern-repository.ts:150: type listLessonPatterns
    188-197: interface ListInsightsOptions [exported]
      refs in: 1 [type: 1]
        - src/storage/pattern-repository.ts:213: type listInsights
  function:
    80-111: listFailurePatterns(db: Database.Database, options: ListFailurePatternsOptions = {}): {} [exported]
      refs in: 5 [call: 3, import: 2]
        - src/api/routes/patterns.ts:8: import (module)
        - src/api/routes/patterns.ts:35: call result
        - src/storage/pattern-repository.test.ts:8: import (module)
        - src/storage/pattern-repository.test.ts:28: call patterns
        - src/storage/pattern-repository.test.ts:35: call rarePatterns
    117-136: listModelStats(db: Database.Database): {} [exported]
      refs in: 4 [call: 2, import: 2]
        - src/api/routes/patterns.ts:10: import (module)
        - src/api/routes/patterns.ts:57: call result
        - src/storage/pattern-repository.test.ts:11: import (module)
        - src/storage/pattern-repository.test.ts:52: call stats
    148-182: listLessonPatterns(db: Database.Database, options: ListLessonPatternsOptions = {}): {} [exported]
      refs in: 5 [call: 3, import: 2]
        - src/api/routes/patterns.ts:9: import (module)
        - src/api/routes/patterns.ts:82: call result
        - src/storage/pattern-repository.test.ts:10: import (module)
        - src/storage/pattern-repository.test.ts:71: call patterns
        - src/storage/pattern-repository.test.ts:76: call projectPatterns
    211-260: listInsights(db: Database.Database, options: ListInsightsOptions = {}): {} [exported]
      refs in: 19 [call: 15, import: 4]
        - src/cli.ts:62: import (module)
        - src/cli.ts:657: call insights
        - src/cli.ts:800: call (module)
        - src/prompt/agents-generator.ts:21: import (module)
        - src/prompt/agents-generator.ts:143: call insights
        - src/prompt/agents-generator.ts:151: call generalToolErrors
        - src/prompt/prompt-generator.ts:15: import (module)
        - src/prompt/prompt-generator.ts:294: call insights
        - src/prompt/prompt-generator.ts:379: call insights
        - src/storage/pattern-repository.test.ts:9: import (module)
    262-276: getInsight(db: Database.Database, id: string): any [exported]
      refs in: 11 [call: 8, import: 3]
        - src/cli.ts:61: import (module)
        - src/cli.ts:708: call insight
        - src/cli.ts:740: call insight
        - src/cli.ts:792: call insight
        - src/prompt/effectiveness.ts:24: import (module)
        - src/prompt/effectiveness.ts:409: call insight
        - src/prompt/effectiveness.ts:464: call insight
        - src/storage/pattern-repository.test.ts:6: import (module)
        - src/storage/pattern-repository.test.ts:167: call insight
        - src/storage/pattern-repository.test.ts:172: call missing
    278-302: getInsightsByModel(db: Database.Database, model: string, options: { minConfidence?: number; promptIncludedOnly?: boolean } = {}): {} [exported]
      refs in: 3 [call: 2, import: 1]
        - src/storage/pattern-repository.test.ts:7: import (module)
        - src/storage/pattern-repository.test.ts:179: call claudeInsights
        - src/storage/pattern-repository.test.ts:183: call highConfidence
    304-332: countInsights(db: Database.Database, options: { type?: InsightType; model?: string; promptIncluded?: boolean } = {}): number [exported]
      refs in: 5 [call: 4, import: 1]
        - src/storage/pattern-repository.test.ts:5: import (module)
        - src/storage/pattern-repository.test.ts:193: call (module)
        - src/storage/pattern-repository.test.ts:194: call (module)
        - src/storage/pattern-repository.test.ts:195: call (module)
        - src/storage/pattern-repository.test.ts:196: call (module)
    334-351: updateInsightPrompt(db: Database.Database, id: string, promptText: string, promptIncluded: boolean, promptVersion?: string): void [exported]
      refs in: 9 [call: 5, import: 4]
        - src/cli.ts:63: import (module)
        - src/cli.ts:714: call (module)
        - src/cli.ts:746: call (module)
        - src/prompt/effectiveness.ts:25: import (module)
        - src/prompt/effectiveness.ts:779: call autoDisableIneffectiveInsights
        - src/prompt/prompt-generator.ts:16: import (module)
        - src/prompt/prompt-generator.ts:360: call updateInsightPromptTexts
        - src/storage/pattern-repository.test.ts:12: import (module)
        - src/storage/pattern-repository.test.ts:202: call (module)
  imports:
    - ../types/index.js
    - better-sqlite3

src/storage/quirk-repository.ts [1-288]
  interface:
    21-28: interface ListQuirksFilters [exported]
      /** Filters for querying model quirks */
      refs in: 4 [import: 1, type: 3]
        - src/api/routes/quirks.ts:11: import (module)
        - src/api/routes/quirks.ts:39: type filters
        - src/api/routes/quirks.ts:41: type filters
        - src/storage/quirk-repository.ts:106: type listQuirks
    31-36: interface ListQuirksOptions [exported]
      /** Pagination options for quirks */
      refs in: 3 [import: 1, type: 2]
        - src/api/routes/quirks.ts:12: import (module)
        - src/api/routes/quirks.ts:45: type options
        - src/storage/quirk-repository.ts:107: type listQuirks
    39-48: interface QuirkResult [exported]
      /** A quirk result with metadata */
      refs in: 2 [type: 2]
        - src/storage/quirk-repository.ts:53: type ListQuirksResult
        - src/storage/quirk-repository.ts:160: type quirks
    51-60: interface ListQuirksResult [exported]
      /** Result from listQuirks query */
      refs in: 1 [type: 1]
        - src/storage/quirk-repository.ts:108: type listQuirks
    63-73: interface ModelQuirkStats [exported]
      /** Stats for a single model */
      refs in: 1 [type: 1]
        - src/storage/quirk-repository.ts:76: type QuirksByModelResult
  type:
    18-18: QuirkFrequency = "once" | "sometimes" | "often" | "always" [exported]
      /** Frequency values for model quirks */
      refs in: 1 [type: 1]
        - src/storage/quirk-repository.ts:25: type ListQuirksFilters
    76-76: QuirksByModelResult = Record<string, ModelQuirkStats> [exported]
      /** Result from getQuirksByModel */
      refs in: 2 [type: 2]
        - src/storage/quirk-repository.ts:174: type getQuirksByModel
        - src/storage/quirk-repository.ts:181: type result
  function:
    104-163: listQuirks(db: Database.Database, filters: ListQuirksFilters = {}, options: ListQuirksOptions = {}): ListQuirksResult [exported]
      /** List model quirks with filters and pagination. Supports filtering by: - model (exact match) - frequency (minimum frequency ranking) - project (partial match via nodes table) Per specs/api.md GET /api/v1/quirks endpoint. */
      refs in: 2 [call: 1, import: 1]
        - src/api/routes/quirks.ts:10: import (module)
        - src/api/routes/quirks.ts:50: call result
    171-209: getQuirksByModel(db: Database.Database, recentLimit = 5): Record<string, ModelQuirkStats> [exported]
      /** Get aggregated quirk stats by model. Returns counts and most recent quirks for each model that has quirks. Per specs/api.md GET /api/v1/stats/models endpoint (quirkCount field). */
      refs in: 2 [call: 1, import: 1]
        - src/api/routes/quirks.ts:9: import (module)
        - src/api/routes/quirks.ts:64: call result
    217-259: getAggregatedQuirks(db: Database.Database, options: { minOccurrences?: number; limit?: number } = {}): {} [exported]
      /** Get aggregated quirks - similar observations grouped together. Useful for the dashboard "Model Quirks" panel. Per specs/storage.md "Find model quirks by frequency" query. */
      refs in: 4 [call: 2, import: 2]
        - src/api/routes/quirks.ts:8: import (module)
        - src/api/routes/quirks.ts:88: call result
        - src/daemon/query-processor.ts:29: import (module)
        - src/daemon/query-processor.ts:424: call quirks
    264-287: getNodeQuirks(db: Database.Database, nodeId: string): {} [exported]
      /** Get model quirks for a node */
      refs in: 2 [call: 1, import: 1]
        - src/api/routes/nodes.ts:22: import (module)
        - src/api/routes/nodes.ts:45: call buildIncludeFetchers
  imports:
    - ./filter-utils.js
    - better-sqlite3

src/storage/relationship-edges.test.ts [1-409]
  imports:
    - ../daemon/processor.js
    - ./database.js
    - ./edge-repository.js
    - ./relationship-edges.js
    - better-sqlite3
    - node:fs
    - node:os
    - node:path
    - vitest

src/storage/relationship-edges.ts [1-290]
  interface:
    28-37: interface StoreRelationshipsResult [exported]
      /** Result of storing relationships for a node */
      refs in: 2 [type: 2]
        - src/storage/relationship-edges.ts:122: type storeRelationshipEdges
        - src/storage/relationship-edges.ts:123: type result
    49-56: interface UnresolvedRelationship [exported]
      /** Result type for unresolved relationships */
      refs in: 2 [type: 2]
        - src/storage/relationship-edges.ts:197: type findUnresolvedRelationships
        - src/storage/relationship-edges.ts:207: type results
  function:
    65-67: isAutoMemEdgeType(type: string): boolean [exported]
      /** Check if a type is a valid AutoMem edge type */
      refs in: 18 [call: 17, import: 1]
        - src/storage/relationship-edges.test.ts:18: import (module)
        - src/storage/relationship-edges.test.ts:57: call (module)
        - src/storage/relationship-edges.test.ts:58: call (module)
        - src/storage/relationship-edges.test.ts:59: call (module)
        - src/storage/relationship-edges.test.ts:60: call (module)
        - src/storage/relationship-edges.test.ts:61: call (module)
        - src/storage/relationship-edges.test.ts:62: call (module)
        - src/storage/relationship-edges.test.ts:63: call (module)
        - src/storage/relationship-edges.test.ts:64: call (module)
        - src/storage/relationship-edges.test.ts:65: call (module)
    72-105: validateRelationship(relationship: RelationshipOutput): { valid: true; } | { valid: false; error: string; } [exported]
      /** Validate a relationship output from the analyzer */
      refs in: 8 [call: 7, import: 1]
        - src/storage/relationship-edges.test.ts:21: import (module)
        - src/storage/relationship-edges.test.ts:92: call (module)
        - src/storage/relationship-edges.test.ts:104: call (module)
        - src/storage/relationship-edges.test.ts:116: call result
        - src/storage/relationship-edges.test.ts:133: call result
        - src/storage/relationship-edges.test.ts:150: call result
        - src/storage/relationship-edges.test.ts:167: call result
        - src/storage/relationship-edges.ts:136: call validation
    118-185: storeRelationshipEdges(db: Database.Database, sourceNodeId: string, relationships: RelationshipOutput[]): StoreRelationshipsResult [exported]
      /** Store relationships extracted by the analyzer as edges For resolved relationships (with targetNodeId), creates an edge directly. For unresolved relationships (targetNodeId is null), stores the description in metadata for potential future resolution via semantic search. */
      refs in: 13 [call: 11, import: 2]
        - src/daemon/worker.ts:38: import (module)
        - src/daemon/worker.ts:493: call Worker.relResult
        - src/storage/relationship-edges.test.ts:20: import (module)
        - src/storage/relationship-edges.test.ts:188: call result
        - src/storage/relationship-edges.test.ts:214: call result
        - src/storage/relationship-edges.test.ts:250: call result
        - src/storage/relationship-edges.test.ts:258: call result
        - src/storage/relationship-edges.test.ts:284: call result
        - src/storage/relationship-edges.test.ts:294: call (module)
        - src/storage/relationship-edges.test.ts:315: call (module)
    194-234: findUnresolvedRelationships(db: Database.Database, nodeId?: string): {} [exported]
      /** Find unresolved relationships (edges with unresolvedTarget in metadata) These are relationships where the analyzer identified a connection but couldn't determine the target node ID. They can be resolved later via semantic search. */
      refs in: 6 [call: 5, import: 1]
        - src/storage/relationship-edges.test.ts:17: import (module)
        - src/storage/relationship-edges.test.ts:304: call unresolved
        - src/storage/relationship-edges.test.ts:335: call unresolved
        - src/storage/relationship-edges.test.ts:352: call unresolved
        - src/storage/relationship-edges.test.ts:372: call unresolved
        - src/storage/relationship-edges.test.ts:395: call stillUnresolved
    242-289: resolveRelationship(db: Database.Database, edgeId: string, resolvedTargetNodeId: string): boolean [exported]
      /** Resolve an unresolved relationship by updating its target node Call this after semantic search finds a matching node for an unresolved relationship. */
      refs in: 3 [call: 2, import: 1]
        - src/storage/relationship-edges.test.ts:19: import (module)
        - src/storage/relationship-edges.test.ts:376: call success
        - src/storage/relationship-edges.test.ts:400: call success
  imports:
    - ../daemon/processor.js
    - ../types/index.js
    - ./edge-repository.js
    - better-sqlite3

src/storage/search-highlight.test.ts [1-39]
  imports:
    - ./search-repository.js
    - vitest

src/storage/search-repository.ts [1-419]
  interface:
    41-46: interface SearchHighlight [exported]
      /** Highlight match for search results */
      refs in: 7 [import: 2, type: 5]
        - src/storage/hybrid-search.ts:15: import (module)
        - src/storage/hybrid-search.ts:103: type HybridSearchResult
        - src/storage/search-repository.ts:55: type SearchResult
        - src/storage/search-repository.ts:285: type findHighlights
        - src/storage/search-repository.ts:286: type highlights
        - src/storage/semantic-search.ts:13: import (module)
        - src/storage/semantic-search.ts:127: type highlights
    49-56: interface SearchResult [exported]
      /** Enhanced search result with score and highlights */
      refs in: 4 [extends: 1, import: 1, type: 2]
        - src/storage/search-repository.ts:73: type SearchNodesResult
        - src/storage/search-repository.ts:408: type results
        - src/storage/semantic-search.ts:14: import (module)
        - src/storage/semantic-search.ts:25: extends SemanticSearchResult
    59-68: interface SearchOptions [exported]
      /** Options for enhanced search */
      refs in: 3 [import: 1, type: 2]
        - src/api/routes/search.ts:12: import (module)
        - src/api/routes/search.ts:58: type options
        - src/storage/search-repository.ts:361: type searchNodesAdvanced
    71-80: interface SearchNodesResult [exported]
      /** Result from enhanced search with pagination metadata */
      refs in: 1 [type: 1]
        - src/storage/search-repository.ts:362: type searchNodesAdvanced
  type:
    21-26: SearchField = | "summary"
  | "decisions"
  | "lessons"
  | "tags"
  | "topics" [exported]
      /** Fields that can be searched in the FTS index */
      refs in: 7 [import: 1, type: 6]
        - src/api/routes/search.ts:11: import (module)
        - src/api/routes/search.ts:59: type options
        - src/storage/search-repository.ts:29: type ALL_SEARCH_FIELDS
        - src/storage/search-repository.ts:43: type SearchHighlight
        - src/storage/search-repository.ts:61: type SearchOptions
        - src/storage/search-repository.ts:140: type buildFieldQuery
        - src/storage/search-repository.ts:284: type findHighlights
    38-38: SearchFilters = BaseFilters [exported]
      /** Filters for search queries (subset of node filters relevant to search) */
      refs in: 8 [import: 2, type: 6]
        - src/storage/hybrid-search.ts:15: import (module)
        - src/storage/hybrid-search.ts:117: type HybridSearchOptions
        - src/storage/hybrid-search.ts:360: type addVectorCandidates
        - src/storage/hybrid-search.ts:551: type collectCandidates
        - src/storage/search-repository.ts:67: type SearchOptions
        - src/storage/semantic-search.ts:12: import (module)
        - src/storage/semantic-search.ts:36: type SemanticSearchOptions
        - src/storage/semantic-search.ts:200: type filters
  function:
    89-117: indexNodeForSearch(db: Database.Database, node: Node): void [exported]
      /** Index a node for full-text search */
      refs in: 3 [call: 2, import: 1]
        - src/storage/node-crud.ts:34: import (module)
        - src/storage/node-crud.ts:491: call insertNodeToDb
        - src/storage/node-crud.ts:614: call upsertNode
    250-274: extractSnippet(text: string, query: string, maxLength = 100): string [exported]
      /** Extract a highlight snippet from text containing a match */
      refs in: 5 [call: 4, import: 1]
        - src/storage/search-highlight.test.ts:3: import (module)
        - src/storage/search-highlight.test.ts:10: call snippet
        - src/storage/search-highlight.test.ts:21: call snippet
        - src/storage/search-highlight.test.ts:31: call snippet
        - src/storage/search-repository.ts:326: call findHighlights
    358-418: searchNodesAdvanced(db: Database.Database, query: string, options: SearchOptions = {}): SearchNodesResult [exported]
      /** Enhanced search with scores, highlights, and filter support */
      refs in: 2 [call: 1, import: 1]
        - src/api/routes/search.ts:10: import (module)
        - src/api/routes/search.ts:65: call result
  imports:
    - ./filter-utils.js
    - ./node-crud.js
    - ./node-types.js
    - better-sqlite3

src/storage/semantic-search.test.ts [1-385]
  imports:
    - ./database.js
    - ./embedding-utils.js
    - ./semantic-search.js
    - better-sqlite3
    - vitest

src/storage/semantic-search.ts [1-214]
  interface:
    25-28: interface SemanticSearchResult extends SearchResult [exported]
      refs in: 2 [type: 2]
        - src/storage/semantic-search.ts:59: type semanticSearch
        - src/storage/semantic-search.ts:193: type findSimilarNodes
    30-39: interface SemanticSearchOptions [exported]
      refs in: 2 [type: 2]
        - src/storage/semantic-search.ts:58: type semanticSearch
        - src/storage/semantic-search.ts:192: type findSimilarNodes
  function:
    55-156: semanticSearch(db: Database.Database, queryEmbedding: number[], options: SemanticSearchOptions = {}): {} [exported]
      /** Perform semantic search using vector similarity. Finds nodes with embeddings close to the query embedding. */
      refs in: 16 [call: 14, import: 2]
        - src/storage/hybrid-search.ts:19: import (module)
        - src/storage/hybrid-search.ts:363: call vectorResults
        - src/storage/semantic-search.test.ts:8: import (module)
        - src/storage/semantic-search.test.ts:46: call result
        - src/storage/semantic-search.test.ts:69: call result
        - src/storage/semantic-search.test.ts:101: call result
        - src/storage/semantic-search.test.ts:113: call (module)
        - src/storage/semantic-search.test.ts:129: call result
        - src/storage/semantic-search.test.ts:139: call result
        - src/storage/semantic-search.test.ts:166: call result
    166-179: getNodeEmbeddingVector(db: Database.Database, nodeId: string): {} [exported]
      /** Get the embedding vector for a node from the database. Useful for finding "related nodes" (node-to-node similarity). */
      refs in: 5 [call: 4, import: 1]
        - src/storage/semantic-search.test.ts:10: import (module)
        - src/storage/semantic-search.test.ts:353: call result
        - src/storage/semantic-search.test.ts:364: call result
        - src/storage/semantic-search.test.ts:375: call (module)
        - src/storage/semantic-search.ts:194: call embedding
    189-213: findSimilarNodes(db: Database.Database, nodeId: string, options: SemanticSearchOptions = {}): {} [exported]
      /** Find nodes similar to a given node. Wraps semanticSearch using the node's own embedding. */
      refs in: 4 [call: 3, import: 1]
        - src/storage/semantic-search.test.ts:9: import (module)
        - src/storage/semantic-search.test.ts:263: call result
        - src/storage/semantic-search.test.ts:292: call result
        - src/storage/semantic-search.test.ts:339: call result
  imports:
    - ./database.js
    - ./embedding-utils.js
    - ./filter-utils.js
    - ./node-crud.js
    - ./search-repository.js
    - better-sqlite3

src/storage/sqlite-vec.test.ts [1-98]
  imports:
    - better-sqlite3
    - sqlite-vec
    - vitest

src/storage/tool-error-repository.ts [1-351]
  interface:
    18-27: interface ListToolErrorsFilters [exported]
      /** Filters for querying tool errors */
      refs in: 6 [import: 1, type: 5]
        - src/api/routes/tool-errors.ts:11: import (module)
        - src/api/routes/tool-errors.ts:40: type filters
        - src/storage/tool-error-repository.ts:120: type buildToolErrorWhereClause
        - src/storage/tool-error-repository.ts:128: type filterDefs
        - src/storage/tool-error-repository.ts:180: type listToolErrors
        - src/storage/tool-error-repository.ts:222: type getAggregatedToolErrors
    30-35: interface ListToolErrorsOptions [exported]
      /** Pagination options for tool errors */
      refs in: 3 [import: 1, type: 2]
        - src/api/routes/tool-errors.ts:12: import (module)
        - src/api/routes/tool-errors.ts:47: type options
        - src/storage/tool-error-repository.ts:181: type listToolErrors
    38-47: interface ToolErrorResult [exported]
      /** A tool error result with metadata */
      refs in: 2 [type: 2]
        - src/storage/tool-error-repository.ts:52: type ListToolErrorsResult
        - src/storage/tool-error-repository.ts:211: type errors
    50-59: interface ListToolErrorsResult [exported]
      /** Result from listToolErrors query */
      refs in: 1 [type: 1]
        - src/storage/tool-error-repository.ts:182: type listToolErrors
    62-66: interface ToolStats [exported]
      /** Stats by tool from getToolErrorStats */
      refs in: 1 [type: 1]
        - src/storage/tool-error-repository.ts:83: type ToolErrorStatsResult
    69-72: interface ModelErrorStats [exported]
      /** Stats by model from getToolErrorStats */
      refs in: 1 [type: 1]
        - src/storage/tool-error-repository.ts:84: type ToolErrorStatsResult
    75-79: interface ToolErrorTrends [exported]
      /** Trend data from getToolErrorStats */
      refs in: 1 [type: 1]
        - src/storage/tool-error-repository.ts:85: type ToolErrorStatsResult
    82-86: interface ToolErrorStatsResult [exported]
      /** Result from getToolErrorStats */
      refs in: 1 [type: 1]
        - src/storage/tool-error-repository.ts:280: type getToolErrorStats
    89-96: interface AggregatedToolError [exported]
      /** Aggregated tool error result */
      refs in: 2 [type: 2]
        - src/storage/tool-error-repository.ts:224: type getAggregatedToolErrors
        - src/storage/tool-error-repository.ts:259: type result
    99-105: interface NodeToolError [exported]
      /** A single tool error for a node */
      refs in: 2 [type: 2]
        - src/storage/tool-error-repository.ts:342: type getNodeToolErrors
        - src/storage/tool-error-repository.ts:349: type getNodeToolErrors
  function:
    178-214: listToolErrors(db: Database.Database, filters: ListToolErrorsFilters = {}, options: ListToolErrorsOptions = {}): ListToolErrorsResult [exported]
      /** List individual tool errors with filters and pagination. */
      refs in: 2 [call: 1, import: 1]
        - src/api/routes/tool-errors.ts:8: import (module)
        - src/api/routes/tool-errors.ts:52: call result
    220-274: getAggregatedToolErrors(db: Database.Database, filters: ListToolErrorsFilters = {}, options: { limit?: number; offset?: number; groupByModel?: boolean } = {}): {} [exported]
      /** Get aggregated tool errors - grouped by tool and error type (and optionally model). Per specs/api.md GET /api/v1/tool-errors. */
      refs in: 4 [call: 2, import: 2]
        - src/api/routes/tool-errors.ts:9: import (module)
        - src/api/routes/tool-errors.ts:80: call result
        - src/daemon/query-processor.ts:30: import (module)
        - src/daemon/query-processor.ts:445: call errors
    280-334: getToolErrorStats(db: Database.Database): ToolErrorStatsResult [exported]
      /** Get tool error statistics for the dashboard. Per specs/api.md GET /api/v1/stats/tool-errors. */
      refs in: 2 [call: 1, import: 1]
        - src/api/routes/tool-errors.ts:10: import (module)
        - src/api/routes/tool-errors.ts:105: call stats
    339-350: getNodeToolErrors(db: Database.Database, nodeId: string): {} [exported]
      /** Get tool errors for a node */
      refs in: 2 [call: 1, import: 1]
        - src/api/routes/nodes.ts:23: import (module)
        - src/api/routes/nodes.ts:46: call buildIncludeFetchers
  imports:
    - ./filter-utils.js
    - better-sqlite3

---
Files: 63
Estimated tokens: 42,863 (codebase: ~1,347,749)
