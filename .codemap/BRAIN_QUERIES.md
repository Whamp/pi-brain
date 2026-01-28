# Project Overview

## Languages
- typescript: 57 files

## Statistics
- Total files: 57
- Total symbols: 338
  - function: 204
  - interface: 89
  - variable: 19
  - type: 17
  - class: 9

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
      refs in: 3 [reexport: 1, type: 2]
        - src/daemon/cli.ts:508: type getDaemonStatus
        - src/daemon/cli.ts:876: type formatDaemonStatus
        - src/daemon/index.ts:134: reexport (module)
    123-128: interface QueueStatus [exported]
      /** Queue status info */
      refs in: 3 [reexport: 1, type: 2]
        - src/daemon/cli.ts:529: type getQueueStatus
        - src/daemon/cli.ts:902: type formatQueueStatus
        - src/daemon/index.ts:135: reexport (module)
    131-136: interface HealthCheckResult [exported]
      /** Health check result */
      refs in: 9 [reexport: 1, type: 8]
        - src/daemon/cli.ts:142: type HealthStatus
        - src/daemon/cli.ts:625: type checkPiCli
        - src/daemon/cli.ts:667: type checkRequiredSkills
        - src/daemon/cli.ts:697: type checkOptionalSkills
        - src/daemon/cli.ts:727: type checkSessionsDir
        - src/daemon/cli.ts:782: type checkDatabaseAccess
        - src/daemon/cli.ts:815: type checkPromptFile
        - src/daemon/cli.ts:956: type getHealthIcon
        - src/daemon/index.ts:136: reexport (module)
    139-143: interface HealthStatus [exported]
      /** Overall health status */
      refs in: 3 [reexport: 1, type: 2]
        - src/daemon/cli.ts:838: type runHealthChecks
        - src/daemon/cli.ts:967: type formatHealthStatus
        - src/daemon/index.ts:137: reexport (module)
    146-149: interface OutputOptions [exported]
      /** CLI output options */
      refs in: 4 [reexport: 1, type: 3]
        - src/daemon/cli.ts:877: type formatDaemonStatus
        - src/daemon/cli.ts:903: type formatQueueStatus
        - src/daemon/cli.ts:968: type formatHealthStatus
        - src/daemon/index.ts:138: reexport (module)
    276-280: interface StartOptions [exported]
      /** Start options */
      refs in: 2 [reexport: 1, type: 1]
        - src/daemon/cli.ts:291: type startDaemon
        - src/daemon/index.ts:139: reexport (module)
    283-286: interface StopOptions [exported]
      /** Stop options */
      refs in: 2 [reexport: 1, type: 1]
        - src/daemon/cli.ts:441: type stopDaemon
        - src/daemon/index.ts:140: reexport (module)
  function:
    61-70: isPortAvailable(port: number): Promise<boolean> [exported]
      /** Check if a port is available */
      refs in: 1 [call: 1]
        - src/daemon/cli.ts:319: call portAvailable
    75-88: findProcessOnPort(port: number): number [exported]
      /** Find process using a port (Linux/macOS) */
      refs in: 1 [call: 1]
        - src/daemon/cli.ts:321: call existingPid
    158-169: readPidFile(): number [exported]
      /** Read the daemon PID from the PID file */
      refs in: 2 [call: 1, reexport: 1]
        - src/daemon/cli.ts:212: call pid
        - src/daemon/index.ts:116: reexport (module)
    174-180: writePidFile(pid: number): void [exported]
      /** Write the daemon PID to the PID file */
      refs in: 5 [call: 3, import: 1, reexport: 1]
        - src/daemon/cli.ts:365: call startDaemon
        - src/daemon/cli.ts:415: call startDaemon
        - src/daemon/daemon-process.ts:19: import (module)
        - src/daemon/daemon-process.ts:102: call main
        - src/daemon/index.ts:117: reexport (module)
    185-193: removePidFile(): void [exported]
      /** Remove the PID file */
      refs in: 10 [call: 8, import: 1, reexport: 1]
        - src/daemon/cli.ts:222: call isDaemonRunning
        - src/daemon/cli.ts:347: call startDaemon
        - src/daemon/cli.ts:424: call startDaemon
        - src/daemon/cli.ts:463: call stopDaemon
        - src/daemon/cli.ts:474: call stopDaemon
        - src/daemon/cli.ts:492: call stopDaemon
        - src/daemon/daemon-process.ts:19: import (module)
        - src/daemon/daemon-process.ts:285: call shutdown
        - src/daemon/daemon-process.ts:308: call (module)
        - src/daemon/index.ts:118: reexport (module)
    198-206: isProcessRunning(pid: number): boolean [exported]
      /** Check if a process with the given PID is running */
      refs in: 4 [call: 3, reexport: 1]
        - src/daemon/cli.ts:217: call isDaemonRunning
        - src/daemon/cli.ts:423: call startDaemon
        - src/daemon/cli.ts:473: call stopDaemon
        - src/daemon/index.ts:119: reexport (module)
    211-224: isDaemonRunning(): { running: boolean; pid: number; } [exported]
      /** Check if the daemon is currently running */
      refs in: 6 [call: 5, reexport: 1]
        - src/daemon/cli.ts:299: call status
        - src/daemon/cli.ts:447: call status
        - src/daemon/cli.ts:509: call { running, pid }
        - src/daemon/cli.ts:1013: call { running }
        - src/daemon/cli.ts:1141: call { running }
        - src/daemon/index.ts:120: reexport (module)
    233-254: formatUptime(seconds: number): string [exported]
      /** Format uptime in a human-readable way */
      refs in: 2 [call: 1, reexport: 1]
        - src/daemon/cli.ts:511: call uptimeFormatted
        - src/daemon/index.ts:121: reexport (module)
    259-269: getProcessUptime(): number [exported]
      /** Get process uptime (approximate based on PID file modification time) */
      refs in: 2 [call: 1, reexport: 1]
        - src/daemon/cli.ts:510: call uptime
        - src/daemon/index.ts:122: reexport (module)
    291-436: async startDaemon(options: StartOptions = {}): Promise<{ success: boolean; message: string; pid?: number; }> [exported]
      /** Start the daemon process */
      refs in: 3 [call: 1, import: 1, reexport: 1]
        - src/cli.ts:22: import (module)
        - src/cli.ts:214: call result
        - src/daemon/index.ts:123: reexport (module)
    441-503: async stopDaemon(options: StopOptions = {}): Promise<{ success: boolean; message: string; }> [exported]
      /** Stop the daemon process */
      refs in: 3 [call: 1, import: 1, reexport: 1]
        - src/cli.ts:23: import (module)
        - src/cli.ts:249: call result
        - src/daemon/index.ts:124: reexport (module)
    508-520: getDaemonStatus(configPath?: string): DaemonStatus [exported]
      /** Get daemon status information */
      refs in: 3 [call: 1, import: 1, reexport: 1]
        - src/cli.ts:24: import (module)
        - src/cli.ts:265: call status
        - src/daemon/index.ts:125: reexport (module)
    529-558: getQueueStatus(configPath?: string): QueueStatus [exported]
      /** Get queue status information */
      refs in: 3 [call: 1, import: 1, reexport: 1]
        - src/cli.ts:25: import (module)
        - src/cli.ts:281: call queueStatus
        - src/daemon/index.ts:126: reexport (module)
    563-616: queueAnalysis(sessionPath: string, configPath?: string): { success: boolean; message: string; jobId?: string; } [exported]
      /** Queue a session for analysis */
      refs in: 3 [call: 1, import: 1, reexport: 1]
        - src/cli.ts:26: import (module)
        - src/cli.ts:299: call result
        - src/daemon/index.ts:127: reexport (module)
    836-866: async runHealthChecks(configPath?: string): Promise<HealthStatus> [exported]
      /** Run all health checks */
      refs in: 3 [call: 1, import: 1, reexport: 1]
        - src/cli.ts:27: import (module)
        - src/cli.ts:371: call status
        - src/daemon/index.ts:128: reexport (module)
    875-896: formatDaemonStatus(status: DaemonStatus, _options: OutputOptions = {}): string [exported]
      /** Format daemon status for display */
      refs in: 3 [call: 1, import: 1, reexport: 1]
        - src/cli.ts:28: import (module)
        - src/cli.ts:270: call (module)
        - src/daemon/index.ts:129: reexport (module)
    901-951: formatQueueStatus(queueStatus: QueueStatus, _options: OutputOptions = {}): string [exported]
      /** Format queue status for display */
      refs in: 3 [call: 1, import: 1, reexport: 1]
        - src/cli.ts:29: import (module)
        - src/cli.ts:286: call (module)
        - src/daemon/index.ts:130: reexport (module)
    966-989: formatHealthStatus(status: HealthStatus, _options: OutputOptions = {}): string [exported]
      /** Format health check results for display */
      refs in: 3 [call: 1, import: 1, reexport: 1]
        - src/cli.ts:30: import (module)
        - src/cli.ts:376: call (module)
        - src/daemon/index.ts:131: reexport (module)
    1004-1124: rebuildIndex(configPath?: string): { success: boolean; message: string; count: number; } [exported]
      /** Rebuild the SQLite index from JSON files */
      refs in: 4 [call: 2, import: 1, reexport: 1]
        - src/cli.ts:31: import (module)
        - src/cli.ts:314: call result
        - src/cli.ts:341: call result
        - src/daemon/index.ts:132: reexport (module)
    1129-1211: async rebuildEmbeddings(configPath?: string, options: { force?: boolean } = {}): Promise<{ success: boolean; message: string; count: number; }> [exported]
      /** Rebuild embeddings for all nodes */
      refs in: 9 [call: 6, import: 2, reexport: 1]
        - src/cli.ts:32: import (module)
        - src/cli.ts:350: call result
        - src/daemon/cli.test.ts:12: import (module)
        - src/daemon/cli.test.ts:83: call result
        - src/daemon/cli.test.ts:95: call result
        - src/daemon/cli.test.ts:115: call result
        - src/daemon/cli.test.ts:140: call (module)
        - src/daemon/cli.test.ts:160: call result
        - src/daemon/index.ts:133: reexport (module)
  variable:
    108-108: any [exported]
      /** PID file location */
      refs in: 1 [reexport: 1]
        - src/daemon/index.ts:114: reexport (module)
    111-111: any [exported]
      /** Log file location */
      refs in: 1 [reexport: 1]
        - src/daemon/index.ts:115: reexport (module)
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
      refs in: 7 [import: 2, instantiate: 2, reexport: 1, type: 2]
        - src/daemon/connection-discovery.test.ts:5: import (module)
        - src/daemon/connection-discovery.test.ts:39: type discoverer
        - src/daemon/connection-discovery.test.ts:76: instantiate (module)
        - src/daemon/index.ts:160: reexport (module)
        - src/daemon/worker.ts:37: import (module)
        - src/daemon/worker.ts:147: type Worker.connectionDiscoverer
        - src/daemon/worker.ts:180: instantiate Worker.initialize
  interface:
    138-143: interface ConnectionResult [exported]
      refs in: 2 [reexport: 1, type: 1]
        - src/daemon/connection-discovery.ts:199: type ConnectionDiscoverer.discover
        - src/daemon/index.ts:161: reexport (module)
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
        - src/daemon/worker.ts:42: import (module)
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
        - src/daemon/worker.ts:41: import (module)
        - src/daemon/worker.ts:554: call Worker.storedError
        - src/daemon/worker.ts:713: call handleJobError
    375-393: parseStoredError(stored: string): { timestamp: string; type: ErrorCategoryType; reason: string; message: string; stack?: string; } [exported]
      /** Parse stored error back to object */
      refs in: 5 [call: 3, import: 1, reexport: 1]
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
        - src/daemon/worker.ts:43: import (module)
  imports:
    - ./queue.js

src/daemon/export.ts [1-148]
  function:
    17-30: getSegmentEntries(entries: SessionEntry[], startId: string, endId: string): {} [exported]
      /** Extract entries within a segment range */
      refs in: 1 [call: 1]
        - src/daemon/export.ts:85: call segmentEntries
    41-147: async exportFineTuneData(outputPath: string, configPath?: string): Promise<{ success: boolean; message: string; count: number; }> [exported]
      /** Export fine-tuning data to JSONL Format: { "input": <JSON string of segment entries>, "output": <JSON string of node analysis> } */
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
      refs in: 11 [import: 2, instantiate: 5, reexport: 1, type: 3]
        - src/daemon/facet-discovery.test.ts:17: import (module)
        - src/daemon/facet-discovery.test.ts:301: type discovery
        - src/daemon/facet-discovery.test.ts:310: instantiate (module)
        - src/daemon/facet-discovery.test.ts:697: type discovery
        - src/daemon/facet-discovery.test.ts:704: instantiate (module)
        - src/daemon/facet-discovery.test.ts:747: type discovery
        - src/daemon/facet-discovery.test.ts:754: instantiate (module)
        - src/daemon/facet-discovery.test.ts:852: instantiate discoveryWithMore
        - src/daemon/index.ts:169: reexport (module)
        - src/daemon/scheduler.ts:31: import (module)
  interface:
    99-108: interface ClusterAnalysisConfig [exported]
      /** Configuration for LLM cluster analysis */
      refs in: 4 [reexport: 1, type: 3]
        - src/daemon/facet-discovery.ts:1247: type FacetDiscovery.analyzeClusters
        - src/daemon/facet-discovery.ts:1308: type FacetDiscovery.analyzeCluster
        - src/daemon/facet-discovery.ts:1455: type FacetDiscovery.invokeClusterAnalysisAgent
        - src/daemon/index.ts:175: reexport (module)
    113-121: interface ClusterAnalysisResult [exported]
      /** Result from analyzing a single cluster */
      refs in: 4 [reexport: 1, type: 3]
        - src/daemon/facet-discovery.ts:130: type ClusterAnalysisBatchResult
        - src/daemon/facet-discovery.ts:1270: type FacetDiscovery.results
        - src/daemon/facet-discovery.ts:1309: type FacetDiscovery.analyzeCluster
        - src/daemon/index.ts:176: reexport (module)
    126-131: interface ClusterAnalysisBatchResult [exported]
      /** Result from analyzing multiple clusters */
      refs in: 2 [reexport: 1, type: 1]
        - src/daemon/facet-discovery.ts:1249: type FacetDiscovery.analyzeClusters
        - src/daemon/index.ts:177: reexport (module)
    140-144: interface EmbeddingProvider [exported]
      /** Interface for embedding providers */
      refs in: 27 [import: 5, reexport: 1, type: 21]
        - src/daemon/facet-discovery.ts:150: type isEmbeddingProvider
        - src/daemon/facet-discovery.ts:151: type isEmbeddingProvider
        - src/daemon/facet-discovery.ts:153: type isEmbeddingProvider
        - src/daemon/facet-discovery.ts:154: type isEmbeddingProvider
        - src/daemon/facet-discovery.ts:155: type isEmbeddingProvider
        - src/daemon/facet-discovery.ts:164: type createEmbeddingProvider
        - src/daemon/facet-discovery.ts:206: type createOllamaProvider
        - src/daemon/facet-discovery.ts:252: type createOpenAIProvider
        - src/daemon/facet-discovery.ts:294: type createOpenRouterProvider
        - src/daemon/facet-discovery.ts:331: type createMockEmbeddingProvider
    656-660: interface FacetDiscoveryLogger [exported]
      refs in: 4 [reexport: 1, type: 3]
        - src/daemon/facet-discovery.ts:663: type noopLogger
        - src/daemon/facet-discovery.ts:673: type FacetDiscovery.logger
        - src/daemon/facet-discovery.ts:679: type FacetDiscovery.constructor
        - src/daemon/index.ts:174: reexport (module)
  function:
    162-198: createEmbeddingProvider(config: EmbeddingConfig): EmbeddingProvider [exported]
      /** Create an embedding provider from config */
      refs in: 11 [call: 6, import: 4, reexport: 1]
        - src/daemon/cli.ts:40: import (module)
        - src/daemon/cli.ts:1156: call provider
        - src/daemon/facet-discovery.test.ts:15: import (module)
        - src/daemon/facet-discovery.test.ts:81: call (module)
        - src/daemon/facet-discovery.test.ts:90: call (module)
        - src/daemon/facet-discovery.ts:684: call FacetDiscovery.constructor
        - src/daemon/index.ts:170: reexport (module)
        - src/daemon/scheduler.ts:30: import (module)
        - src/daemon/scheduler.ts:758: call Scheduler.createSchedulerEmbeddingProvider
        - src/daemon/worker.ts:46: import (module)
    331-355: createMockEmbeddingProvider(dims = 384): EmbeddingProvider [exported]
      /** Create mock embedding provider for testing only. Not exposed in EmbeddingConfig - use createMockEmbeddingProvider() directly in tests. */
      refs in: 9 [call: 8, import: 1]
        - src/daemon/facet-discovery.test.ts:16: import (module)
        - src/daemon/facet-discovery.test.ts:100: call provider
        - src/daemon/facet-discovery.test.ts:107: call provider
        - src/daemon/facet-discovery.test.ts:117: call provider
        - src/daemon/facet-discovery.test.ts:127: call provider
        - src/daemon/facet-discovery.test.ts:309: call (module)
        - src/daemon/facet-discovery.test.ts:704: call (module)
        - src/daemon/facet-discovery.test.ts:754: call (module)
        - src/daemon/facet-discovery.test.ts:854: call discoveryWithMore
    384-451: kMeansClustering(embeddings: number[][], k: number, maxIterations = 100): KMeansResult [exported]
      /** Simple K-means++ clustering implementation */
      refs in: 8 [call: 6, import: 1, reexport: 1]
        - src/daemon/facet-discovery.test.ts:19: import (module)
        - src/daemon/facet-discovery.test.ts:142: call result
        - src/daemon/facet-discovery.test.ts:152: call result
        - src/daemon/facet-discovery.test.ts:174: call result
        - src/daemon/facet-discovery.test.ts:194: call result
        - src/daemon/facet-discovery.test.ts:205: call result
        - src/daemon/facet-discovery.ts:932: call FacetDiscovery.result
        - src/daemon/index.ts:171: reexport (module)
    494-513: hdbscanClustering(embeddings: number[][], minClusterSize = 3, minSamples = 3): {} [exported]
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
        - src/daemon/facet-discovery.ts:936: call FacetDiscovery.clusterEmbeddings
        - src/daemon/index.ts:172: reexport (module)
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
      refs in: 1 [type: 1]
        - src/daemon/graph-export.ts:28: type exportGraphviz
  function:
    25-91: exportGraphviz(outputPath: string, configPath?: string, options: GraphExportOptions = {}): { success: boolean; message: string; } [exported]
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

src/daemon/pattern-aggregation.test.ts [1-384]
  imports:
    - ./pattern-aggregation.js
    - better-sqlite3
    - vitest

src/daemon/pattern-aggregation.ts [1-332]
  class:
    22-331: class PatternAggregator [exported]
      refs in: 7 [import: 2, instantiate: 2, reexport: 1, type: 2]
        - src/daemon/index.ts:165: reexport (module)
        - src/daemon/pattern-aggregation.test.ts:4: import (module)
        - src/daemon/pattern-aggregation.test.ts:21: type aggregator
        - src/daemon/pattern-aggregation.test.ts:81: instantiate (module)
        - src/daemon/scheduler.ts:35: import (module)
        - src/daemon/scheduler.ts:175: type Scheduler.patternAggregator
        - src/daemon/scheduler.ts:184: instantiate Scheduler.constructor
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
      refs in: 5 [import: 1, instantiate: 1, reexport: 1, type: 2]
        - src/daemon/index.ts:56: reexport (module)
        - src/daemon/processor.ts:806: type createProcessor
        - src/daemon/processor.ts:807: instantiate createProcessor
        - src/daemon/worker.ts:52: import (module)
        - src/daemon/worker.ts:146: type Worker.processor
  interface:
    21-34: interface AgentResult [exported]
      /** Result from invoking the pi agent */
      refs in: 4 [reexport: 1, type: 3]
        - src/daemon/index.ts:71: reexport (module)
        - src/daemon/processor.ts:361: type invokeAgent
        - src/daemon/processor.ts:574: type parseAgentOutput
        - src/daemon/processor.ts:759: type JobProcessor.process
    37-116: interface AgentNodeOutput [exported]
      /** Output schema from the session analyzer (matches session-analyzer.md) */
      refs in: 8 [import: 1, reexport: 1, type: 6]
        - src/daemon/index.ts:72: reexport (module)
        - src/daemon/processor.test.ts:26: import (module)
        - src/daemon/processor.test.ts:49: type createValidNodeOutput
        - src/daemon/processor.ts:27: type AgentResult
        - src/daemon/processor.ts:649: type extractNodeFromText
        - src/daemon/processor.ts:654: type parsed
        - src/daemon/processor.ts:668: type parsed
        - src/daemon/processor.ts:684: type isValidNodeOutput
    128-132: interface SkillInfo [exported]
      /** Skill availability information */
      refs in: 3 [reexport: 1, type: 2]
        - src/daemon/index.ts:73: reexport (module)
        - src/daemon/processor.ts:189: type getSkillAvailability
        - src/daemon/processor.ts:190: type availability
    135-140: interface ProcessorLogger [exported]
      /** Logger interface for processor */
      refs in: 22 [import: 3, reexport: 1, type: 18]
        - src/daemon/index.ts:74: reexport (module)
        - src/daemon/processor.test.ts:27: import (module)
        - src/daemon/processor.test.ts:107: type silentLogger
        - src/daemon/processor.ts:143: type consoleLogger
        - src/daemon/processor.ts:360: type invokeAgent
        - src/daemon/processor.ts:482: type spawnPiProcess
        - src/daemon/processor.ts:573: type parseAgentOutput
        - src/daemon/processor.ts:648: type extractNodeFromText
        - src/daemon/processor.ts:741: type ProcessorConfig
        - src/daemon/processor.ts:749: type JobProcessor.logger
    212-219: interface EnvironmentValidationResult [exported]
      /** Result of environment validation */
      refs in: 2 [type: 2]
        - src/daemon/processor.ts:225: type validateRequiredSkills
        - src/daemon/processor.ts:781: type JobProcessor.validateEnvironment
    737-742: interface ProcessorConfig [exported]
      /** Processor configuration */
      refs in: 3 [reexport: 1, type: 2]
        - src/daemon/index.ts:75: reexport (module)
        - src/daemon/processor.ts:751: type JobProcessor.constructor
        - src/daemon/processor.ts:806: type createProcessor
  function:
    176-184: async checkSkillAvailable(skillName: string): Promise<boolean> [exported]
      /** Check if a skill is available by looking for SKILL.md */
      refs in: 9 [call: 6, import: 2, reexport: 1]
        - src/daemon/cli.ts:42: import (module)
        - src/daemon/cli.ts:671: call available
        - src/daemon/cli.ts:701: call available
        - src/daemon/index.ts:65: reexport (module)
        - src/daemon/processor.test.ts:14: import (module)
        - src/daemon/processor.test.ts:555: call available
        - src/daemon/processor.test.ts:561: call available
        - src/daemon/processor.test.ts:658: call rlmAvailable
        - src/daemon/processor.ts:199: call available
    189-209: async getSkillAvailability(): Promise<Map<string, SkillInfo>> [exported]
      /** Get availability information for all skills */
      refs in: 6 [call: 4, import: 1, reexport: 1]
        - src/daemon/index.ts:64: reexport (module)
        - src/daemon/processor.test.ts:19: import (module)
        - src/daemon/processor.test.ts:570: call availability
        - src/daemon/processor.test.ts:592: call availability
        - src/daemon/processor.ts:226: call skills
        - src/daemon/processor.ts:247: call skills
    225-237: async validateRequiredSkills(): Promise<EnvironmentValidationResult> [exported]
      /** Validate that all required skills are available Returns validation result instead of throwing */
      refs in: 2 [call: 1, reexport: 1]
        - src/daemon/index.ts:66: reexport (module)
        - src/daemon/processor.ts:783: call JobProcessor.skillsResult
    246-283: async buildSkillsArg(sessionFile?: string): Promise<string> [exported]
      /** Build the skills argument for pi invocation Returns comma-separated list of available skills RLM skill is only included for files larger than RLM_SIZE_THRESHOLD to avoid confusing smaller models with RLM instructions. */
      refs in: 7 [call: 5, import: 1, reexport: 1]
        - src/daemon/index.ts:63: reexport (module)
        - src/daemon/processor.test.ts:13: import (module)
        - src/daemon/processor.test.ts:606: call skills
        - src/daemon/processor.test.ts:611: call skills
        - src/daemon/processor.test.ts:638: call skills
        - src/daemon/processor.test.ts:656: call skills
        - src/daemon/processor.ts:391: call skills
    292-324: buildAnalysisPrompt(job: AnalysisJob): string [exported]
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
        - src/daemon/processor.ts:395: call prompt
    357-465: async invokeAgent(job: AnalysisJob, config: DaemonConfig, logger: ProcessorLogger = consoleLogger): Promise<AgentResult> [exported]
      /** Invoke the pi agent to analyze a session */
      refs in: 2 [call: 1, reexport: 1]
        - src/daemon/index.ts:58: reexport (module)
        - src/daemon/processor.ts:764: call JobProcessor.result
    571-640: parseAgentOutput(stdout: string, logger: ProcessorLogger = consoleLogger): Omit<AgentResult, "exitCode" | "durationMs"> [exported]
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
    646-679: extractNodeFromText(text: string, logger: ProcessorLogger = consoleLogger): AgentNodeOutput [exported]
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
        - src/daemon/processor.ts:625: call nodeData
    684-730: isValidNodeOutput(obj: unknown): boolean [exported]
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
    806-808: createProcessor(config: ProcessorConfig): JobProcessor [exported]
      /** Create a job processor */
      refs in: 5 [call: 2, import: 2, reexport: 1]
        - src/daemon/index.ts:57: reexport (module)
        - src/daemon/processor.test.ts:17: import (module)
        - src/daemon/processor.test.ts:677: call processor
        - src/daemon/worker.ts:51: import (module)
        - src/daemon/worker.ts:176: call Worker.initialize
  variable:
    143-148: ProcessorLogger [exported]
      /** Default console logger */
      refs in: 4 [import: 3, reexport: 1]
        - src/daemon/index.ts:67: reexport (module)
        - src/daemon/processor.test.ts:16: import (module)
        - src/daemon/query-processor.ts:25: import (module)
        - src/daemon/worker.ts:50: import (module)
    155-155: readonly [] [exported]
      /** Required skills for analysis - must be available */
      refs in: 3 [import: 2, reexport: 1]
        - src/daemon/cli.ts:43: import (module)
        - src/daemon/index.ts:68: reexport (module)
        - src/daemon/processor.test.ts:23: import (module)
    158-158: readonly ["codemap"] [exported]
      /** Optional skills - enhance analysis but not required */
      refs in: 3 [import: 2, reexport: 1]
        - src/daemon/cli.ts:44: import (module)
        - src/daemon/index.ts:69: reexport (module)
        - src/daemon/processor.test.ts:21: import (module)
    161-161: readonly ["rlm"] [exported]
      /** Skills that are conditionally included based on file size */
      refs in: 1 [import: 1]
        - src/daemon/processor.test.ts:15: import (module)
    164-164: number [exported]
      /** File size threshold (in bytes) for including RLM skill */
      refs in: 1 [import: 1]
        - src/daemon/processor.test.ts:24: import (module)
    167-167: any [exported]
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
      refs in: 15 [import: 2, type: 13]
        - src/daemon/query-processor.test.ts:20: import (module)
        - src/daemon/query-processor.test.ts:92: type request
        - src/daemon/query-processor.test.ts:166: type request
        - src/daemon/query-processor.test.ts:214: type request
        - src/daemon/query-processor.test.ts:252: type request
        - src/daemon/query-processor.test.ts:308: type request
        - src/daemon/query-processor.test.ts:356: type request
        - src/daemon/query-processor.test.ts:401: type request
        - src/daemon/query-processor.test.ts:441: type request
        - src/daemon/query-processor.ts:110: type processQuery
    48-66: interface QueryResponse [exported]
      /** Query response to return to the client */
      refs in: 3 [type: 3]
        - src/daemon/query-processor.ts:71: type AgentQueryResult
        - src/daemon/query-processor.ts:112: type processQuery
        - src/daemon/query-processor.ts:647: type ParseResult
    91-104: interface QueryProcessorConfig [exported]
      refs in: 2 [type: 2]
        - src/daemon/query-processor.ts:111: type processQuery
        - src/daemon/query-processor.ts:383: type invokeQueryAgent
  function:
    109-188: async processQuery(request: QueryRequest, config: QueryProcessorConfig): Promise<QueryResponse> [exported]
      /** Process a natural language query against the knowledge graph */
      refs in: 14 [call: 12, import: 2]
        - src/daemon/query-processor.test.ts:20: import (module)
        - src/daemon/query-processor.test.ts:93: call response
        - src/daemon/query-processor.test.ts:167: call response
        - src/daemon/query-processor.test.ts:215: call response
        - src/daemon/query-processor.test.ts:253: call response
        - src/daemon/query-processor.test.ts:309: call response
        - src/daemon/query-processor.test.ts:357: call response
        - src/daemon/query-processor.test.ts:402: call response
        - src/daemon/query-processor.test.ts:445: call (module)
        - src/daemon/semantic-search.integration.test.ts:13: import (module)
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
      refs in: 14 [import: 4, instantiate: 2, reexport: 1, type: 7]
        - src/daemon/index.ts:42: reexport (module)
        - src/daemon/queue.test.ts:14: import (module)
        - src/daemon/queue.test.ts:23: type queue
        - src/daemon/queue.ts:760: type createQueueManager
        - src/daemon/queue.ts:761: instantiate createQueueManager
        - src/daemon/queue.ts:774: instantiate queue
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
        - src/daemon/queue.ts:728: type QueueManager.parseRow
    53-88: interface AnalysisJob [exported]
      /** Analysis job structure */
      refs in: 56 [import: 9, reexport: 1, type: 46]
        - src/api/websocket.test.ts:9: import (module)
        - src/api/websocket.test.ts:300: type mockJob
        - src/api/websocket.test.ts:415: type mockJob
        - src/api/websocket.ts:11: import (module)
        - src/api/websocket.ts:286: type WebSocketManager.broadcastAnalysisStarted
        - src/api/websocket.ts:301: type WebSocketManager.broadcastAnalysisCompleted
        - src/api/websocket.ts:329: type WebSocketManager.broadcastAnalysisFailed
        - src/daemon/cli.ts:51: import (module)
        - src/daemon/cli.ts:125: type QueueStatus
        - src/daemon/cli.ts:126: type QueueStatus
    102-115: interface QueueStats [exported]
      /** Queue statistics */
      refs in: 5 [import: 1, reexport: 1, type: 3]
        - src/daemon/cli.ts:50: import (module)
        - src/daemon/cli.ts:124: type QueueStatus
        - src/daemon/index.ts:51: reexport (module)
        - src/daemon/queue.ts:624: type QueueManager.getStats
        - src/daemon/queue.ts:769: type getQueueStatusSummary
  type:
    17-17: JobType = "initial" | "reanalysis" | "connection_discovery" [exported]
      /** Job type determines analysis behavior */
      refs in: 5 [import: 1, reexport: 1, type: 3]
        - src/daemon/index.ts:46: reexport (module)
        - src/daemon/processor.test.ts:9: import (module)
        - src/daemon/processor.test.ts:37: type createTestJob
        - src/daemon/queue.ts:57: type AnalysisJob
        - src/daemon/queue.ts:722: type QueueManager.parseRow
    20-20: JobStatus = "pending" | "running" | "completed" | "failed" [exported]
      /** Job status tracks progress through the queue */
      refs in: 8 [import: 1, reexport: 1, type: 6]
        - src/daemon/index.ts:47: reexport (module)
        - src/daemon/processor.test.ts:9: import (module)
        - src/daemon/processor.test.ts:41: type createTestJob
        - src/daemon/queue.ts:69: type AnalysisJob
        - src/daemon/queue.ts:664: type QueueManager.getJobCounts
        - src/daemon/queue.ts:675: type QueueManager.counts
        - src/daemon/queue.ts:684: type QueueManager.getJobCounts
        - src/daemon/queue.ts:730: type QueueManager.parseRow
    91-99: JobInput = Omit<
  AnalysisJob,
  "id" | "status" | "queuedAt" | "retryCount" | "maxRetries" | "priority"
> & {
  /** Priority (defaults to PRIORITY.INITIAL) */
  priority?: number;
  /** Override default max re... [exported]
      /** Job creation input (id, status, queuedAt are auto-generated) */
      refs in: 10 [import: 2, reexport: 1, type: 7]
        - src/daemon/index.ts:49: reexport (module)
        - src/daemon/queue.test.ts:18: import (module)
        - src/daemon/queue.test.ts:129: type jobs
        - src/daemon/queue.ts:160: type QueueManager.enqueue
        - src/daemon/queue.ts:194: type QueueManager.enqueueMany
        - src/daemon/scheduler.test.ts:9: import (module)
        - src/daemon/scheduler.test.ts:23: type createMockQueue
        - src/daemon/scheduler.test.ts:24: type enqueuedJobs
        - src/daemon/scheduler.test.ts:27: type createMockQueue
        - src/daemon/scheduler.test.ts:47: type createMockQueue
  function:
    753-755: generateJobId(): string [exported]
      /** Generate a unique job ID Uses the same format as node IDs: 16-char hex string */
      refs in: 6 [call: 4, import: 1, reexport: 1]
        - src/daemon/index.ts:44: reexport (module)
        - src/daemon/queue.test.ts:16: import (module)
        - src/daemon/queue.test.ts:40: call id
        - src/daemon/queue.test.ts:47: call (module)
        - src/daemon/queue.ts:161: call QueueManager.id
        - src/daemon/queue.ts:206: call QueueManager.id
    760-762: createQueueManager(db: Database.Database): QueueManager [exported]
      /** Create a queue manager from a database */
      refs in: 11 [call: 5, import: 5, reexport: 1]
        - src/daemon/cli.ts:48: import (module)
        - src/daemon/cli.ts:589: call queue
        - src/daemon/daemon-process.ts:20: import (module)
        - src/daemon/daemon-process.ts:106: call queue
        - src/daemon/index.ts:43: reexport (module)
        - src/daemon/queue.test.ts:15: import (module)
        - src/daemon/queue.test.ts:30: call (module)
        - src/daemon/worker.test.ts:16: import (module)
        - src/daemon/worker.test.ts:275: call (module)
        - src/daemon/worker.ts:56: import (module)
    768-786: getQueueStatusSummary(db: Database.Database): { stats: QueueStats; pendingJobs: {}; runningJobs: {}; recentFailed: {}; } [exported]
      /** Get aggregated queue status Used by CLI and API */
      refs in: 2 [call: 1, import: 1]
        - src/daemon/cli.ts:47: import (module)
        - src/daemon/cli.ts:554: call getQueueStatus
  variable:
    23-34: PRIORITY [exported]
      /** Priority levels (lower = higher priority) */
      refs in: 5 [import: 4, reexport: 1]
        - src/daemon/cli.ts:49: import (module)
        - src/daemon/daemon-process.ts:20: import (module)
        - src/daemon/index.ts:45: reexport (module)
        - src/daemon/queue.test.ts:17: import (module)
        - src/daemon/worker.test.ts:16: import (module)
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
      refs in: 31 [import: 1, instantiate: 27, reexport: 1, type: 2]
        - src/daemon/index.ts:145: reexport (module)
        - src/daemon/scheduler.test.ts:12: import (module)
        - src/daemon/scheduler.test.ts:140: type scheduler
        - src/daemon/scheduler.test.ts:154: instantiate (module)
        - src/daemon/scheduler.test.ts:245: instantiate (module)
        - src/daemon/scheduler.test.ts:267: instantiate (module)
        - src/daemon/scheduler.test.ts:286: instantiate (module)
        - src/daemon/scheduler.test.ts:302: instantiate (module)
        - src/daemon/scheduler.test.ts:322: instantiate (module)
        - src/daemon/scheduler.test.ts:350: instantiate (module)
  interface:
    59-66: interface ScheduledJobResult [exported]
      /** Result of a scheduled job execution */
      refs in: 24 [reexport: 1, type: 23]
        - src/daemon/index.ts:152: reexport (module)
        - src/daemon/scheduler.ts:156: type SchedulerStatus
        - src/daemon/scheduler.ts:170: type Scheduler.lastReanalysisResult
        - src/daemon/scheduler.ts:171: type Scheduler.lastConnectionDiscoveryResult
        - src/daemon/scheduler.ts:172: type Scheduler.lastPatternAggregationResult
        - src/daemon/scheduler.ts:173: type Scheduler.lastClusteringResult
        - src/daemon/scheduler.ts:174: type Scheduler.lastBackfillEmbeddingsResult
        - src/daemon/scheduler.ts:434: type Scheduler.triggerReanalysis
        - src/daemon/scheduler.ts:441: type Scheduler.triggerConnectionDiscovery
        - src/daemon/scheduler.ts:448: type Scheduler.triggerPatternAggregation
    69-74: interface SchedulerLogger [exported]
      /** Logger interface for scheduler */
      refs in: 7 [import: 1, reexport: 1, type: 5]
        - src/daemon/index.ts:153: reexport (module)
        - src/daemon/scheduler.test.ts:19: import (module)
        - src/daemon/scheduler.test.ts:128: type createCapturingLogger
        - src/daemon/scheduler.ts:78: type noopLogger
        - src/daemon/scheduler.ts:87: type consoleLogger
        - src/daemon/scheduler.ts:182: type Scheduler.constructor
        - src/daemon/scheduler.ts:913: type createScheduler
    95-146: interface SchedulerConfig [exported]
      /** Scheduler configuration */
      refs in: 20 [import: 1, reexport: 1, type: 18]
        - src/daemon/index.ts:154: reexport (module)
        - src/daemon/scheduler.test.ts:18: import (module)
        - src/daemon/scheduler.test.ts:145: type defaultConfig
        - src/daemon/scheduler.test.ts:485: type badConfig
        - src/daemon/scheduler.test.ts:502: type badConfig
        - src/daemon/scheduler.test.ts:522: type config
        - src/daemon/scheduler.test.ts:535: type config
        - src/daemon/scheduler.test.ts:647: type config
        - src/daemon/scheduler.test.ts:668: type config
        - src/daemon/scheduler.test.ts:684: type config
    149-158: interface SchedulerStatus [exported]
      /** Scheduler state */
      refs in: 3 [reexport: 1, type: 2]
        - src/daemon/index.ts:155: reexport (module)
        - src/daemon/scheduler.ts:372: type Scheduler.getStatus
        - src/daemon/scheduler.ts:373: type Scheduler.jobs
  type:
    51-56: ScheduledJobType = | "reanalysis"
  | "connection_discovery"
  | "pattern_aggregation"
  | "clustering"
  | "backfill_embeddings" [exported]
      /** Job types that can be scheduled */
      refs in: 3 [reexport: 1, type: 2]
        - src/daemon/index.ts:151: reexport (module)
        - src/daemon/scheduler.ts:60: type ScheduledJobResult
        - src/daemon/scheduler.ts:152: type SchedulerStatus
  function:
    909-939: createScheduler(config: DaemonConfig, queue: QueueManager, db: Database.Database, logger?: SchedulerLogger): Scheduler [exported]
      /** Create a scheduler from daemon config */
      refs in: 5 [call: 2, import: 2, reexport: 1]
        - src/daemon/daemon-process.ts:21: import (module)
        - src/daemon/daemon-process.ts:170: call scheduler
        - src/daemon/index.ts:146: reexport (module)
        - src/daemon/scheduler.test.ts:13: import (module)
        - src/daemon/scheduler.test.ts:562: call scheduler
    945-955: isValidCronExpression(expression: string): boolean [exported]
      /** Validate a cron expression Returns true if valid, false otherwise */
      refs in: 12 [call: 10, import: 1, reexport: 1]
        - src/daemon/index.ts:147: reexport (module)
        - src/daemon/scheduler.test.ts:14: import (module)
        - src/daemon/scheduler.test.ts:573: call (module)
        - src/daemon/scheduler.test.ts:574: call (module)
        - src/daemon/scheduler.test.ts:575: call (module)
        - src/daemon/scheduler.test.ts:576: call (module)
        - src/daemon/scheduler.test.ts:577: call (module)
        - src/daemon/scheduler.test.ts:581: call (module)
        - src/daemon/scheduler.test.ts:582: call (module)
        - src/daemon/scheduler.test.ts:583: call (module)
    960-977: getNextRunTimes(expression: string, count = 5): {} [exported]
      /** Get the next N run times for a cron expression */
      refs in: 5 [call: 3, import: 1, reexport: 1]
        - src/daemon/index.ts:148: reexport (module)
        - src/daemon/scheduler.test.ts:15: import (module)
        - src/daemon/scheduler.test.ts:591: call times
        - src/daemon/scheduler.test.ts:613: call (module)
        - src/daemon/scheduler.test.ts:617: call times
  variable:
    78-83: SchedulerLogger [exported]
      /** Default no-op logger */
      refs in: 2 [import: 1, reexport: 1]
        - src/daemon/index.ts:149: reexport (module)
        - src/daemon/scheduler.test.ts:16: import (module)
    87-92: SchedulerLogger [exported]
      /** Console logger for production use */
      refs in: 2 [import: 1, reexport: 1]
        - src/daemon/index.ts:150: reexport (module)
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
        - src/daemon/daemon-process.ts:22: import (module)
        - src/daemon/daemon-process.ts:185: call sessionPath
        - src/daemon/daemon-process.ts:203: call sessionPath
        - src/daemon/index.ts:33: reexport (module)
        - src/daemon/watcher.test.ts:16: import (module)
        - src/daemon/watcher.test.ts:228: call (module)
        - src/daemon/watcher.test.ts:271: call (module)
        - src/daemon/watcher.test.ts:302: call (module)
        - src/daemon/watcher.test.ts:330: call (module)
        - src/daemon/watcher.test.ts:364: call (module)
    111-116: getEventError(event: Event): any [exported]
      /** Helper to get error from an error event */
      refs in: 3 [call: 1, import: 1, reexport: 1]
        - src/daemon/index.ts:34: reexport (module)
        - src/daemon/watcher.test.ts:13: import (module)
        - src/daemon/watcher.test.ts:840: call (module)
  variable:
    24-37: SESSION_EVENTS [exported]
      /** Session event names */
      refs in: 4 [import: 3, reexport: 1]
        - src/daemon/daemon-process.ts:22: import (module)
        - src/daemon/index.ts:27: reexport (module)
        - src/daemon/watcher.test.ts:18: import (module)
        - src/daemon/watcher.ts:18: import (module)

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
      refs in: 21 [import: 2, instantiate: 14, reexport: 1, type: 4]
        - src/daemon/daemon-process.ts:23: import (module)
        - src/daemon/daemon-process.ts:179: instantiate watcher
        - src/daemon/index.ts:15: reexport (module)
        - src/daemon/watcher.test.ts:19: import (module)
        - src/daemon/watcher.test.ts:53: type waitForEvent
        - src/daemon/watcher.test.ts:73: type createTestWatcher
        - src/daemon/watcher.test.ts:74: instantiate createTestWatcher
        - src/daemon/watcher.test.ts:84: instantiate watcher
        - src/daemon/watcher.test.ts:90: instantiate watcher
        - src/daemon/watcher.test.ts:343: instantiate watcher
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
        - src/daemon/watcher.test.ts:11: import (module)
        - src/daemon/watcher.test.ts:776: call watcher
    555-557: isSessionFile(filePath: string): boolean [exported]
      /** Check if a path is a valid session file */
      refs in: 7 [call: 5, import: 1, reexport: 1]
        - src/daemon/index.ts:17: reexport (module)
        - src/daemon/watcher.test.ts:17: import (module)
        - src/daemon/watcher.test.ts:783: call (module)
        - src/daemon/watcher.test.ts:784: call (module)
        - src/daemon/watcher.test.ts:788: call (module)
        - src/daemon/watcher.test.ts:789: call (module)
        - src/daemon/watcher.test.ts:790: call (module)
    562-564: getSessionName(sessionPath: string): string [exported]
      /** Extract session name from path */
      refs in: 4 [call: 2, import: 1, reexport: 1]
        - src/daemon/index.ts:18: reexport (module)
        - src/daemon/watcher.test.ts:15: import (module)
        - src/daemon/watcher.test.ts:796: call (module)
        - src/daemon/watcher.test.ts:798: call (module)
    571-581: getProjectFromSessionPath(sessionPath: string): string [exported]
      /** Extract project name from session path Session paths are typically: ~/.pi/agent/sessions/<project-name>/<session-file>.jsonl */
      refs in: 4 [call: 2, import: 1, reexport: 1]
        - src/daemon/index.ts:19: reexport (module)
        - src/daemon/watcher.test.ts:14: import (module)
        - src/daemon/watcher.test.ts:806: call (module)
        - src/daemon/watcher.test.ts:814: call (module)
  variable:
    67-73: WatcherConfig [exported]
      /** Default watcher configuration */
      refs in: 2 [import: 1, reexport: 1]
        - src/daemon/index.ts:20: reexport (module)
        - src/daemon/watcher.test.ts:12: import (module)
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
      refs in: 5 [import: 1, instantiate: 2, reexport: 1, type: 1]
        - src/daemon/index.ts:103: reexport (module)
        - src/daemon/worker.test.ts:20: import (module)
        - src/daemon/worker.ts:665: type createWorker
        - src/daemon/worker.ts:666: instantiate createWorker
        - src/daemon/worker.ts:679: instantiate worker
  interface:
    66-83: interface WorkerConfig [exported]
      /** Worker configuration */
      refs in: 6 [import: 1, reexport: 1, type: 4]
        - src/daemon/index.ts:107: reexport (module)
        - src/daemon/worker.test.ts:21: import (module)
        - src/daemon/worker.test.ts:68: type createTestWorkerConfig
        - src/daemon/worker.test.ts:69: type createTestWorkerConfig
        - src/daemon/worker.ts:159: type Worker.constructor
        - src/daemon/worker.ts:665: type createWorker
    86-101: interface WorkerStatus [exported]
      /** Worker status */
      refs in: 2 [reexport: 1, type: 1]
        - src/daemon/index.ts:108: reexport (module)
        - src/daemon/worker.ts:320: type Worker.getStatus
    104-117: interface JobProcessingResult [exported]
      /** Result from processing a single job */
      refs in: 4 [reexport: 1, type: 3]
        - src/daemon/index.ts:109: reexport (module)
        - src/daemon/worker.ts:337: type Worker.processJob
        - src/daemon/worker.ts:538: type Worker.handleJobFailure
        - src/daemon/worker.ts:678: type processSingleJob
  function:
    665-667: createWorker(config: WorkerConfig): Worker [exported]
      /** Create a worker instance */
      refs in: 19 [call: 16, import: 2, reexport: 1]
        - src/daemon/daemon-process.ts:24: import (module)
        - src/daemon/daemon-process.ts:139: call worker
        - src/daemon/index.ts:104: reexport (module)
        - src/daemon/worker.test.ts:18: import (module)
        - src/daemon/worker.test.ts:119: call worker
        - src/daemon/worker.test.ts:126: call worker
        - src/daemon/worker.test.ts:135: call worker
        - src/daemon/worker.test.ts:143: call worker
        - src/daemon/worker.test.ts:159: call worker
        - src/daemon/worker.test.ts:173: call worker
    673-687: processSingleJob(job: AnalysisJob, config: PiBrainConfig, db: Database.Database, logger?: ProcessorLogger): Promise<JobProcessingResult> [exported]
      /** Process a single job without the full worker loop Useful for one-off processing or testing */
      refs in: 1 [reexport: 1]
        - src/daemon/index.ts:105: reexport (module)
    692-716: handleJobError(error: Error, job: AnalysisJob, retryPolicy: RetryPolicy = DEFAULT_RETRY_POLICY): { shouldRetry: boolean; retryDelayMinutes: number; formattedError: string; category: ReturnType<any>; } [exported]
      /** Handle job error manually (for custom queue implementations) */
      refs in: 11 [call: 9, import: 1, reexport: 1]
        - src/daemon/index.ts:106: reexport (module)
        - src/daemon/worker.test.ts:19: import (module)
        - src/daemon/worker.test.ts:188: call result
        - src/daemon/worker.test.ts:198: call result
        - src/daemon/worker.test.ts:207: call result
        - src/daemon/worker.test.ts:216: call result
        - src/daemon/worker.test.ts:234: call result
        - src/daemon/worker.test.ts:253: call result0
        - src/daemon/worker.test.ts:254: call result1
        - src/daemon/worker.test.ts:255: call result2
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

src/storage/database-vec.test.ts [1-72]
  imports:
    - ./database
    - better-sqlite3
    - node:fs
    - node:os
    - node:path
    - vitest

src/storage/database.test.ts [1-643]
  imports:
    - ./database.js
    - better-sqlite3
    - node:fs
    - node:os
    - node:path
    - vitest

src/storage/database.ts [1-298]
  interface:
    20-34: interface DatabaseOptions [exported]
      refs in: 1 [type: 1]
        - src/storage/database.ts:46: type openDatabase
    36-41: interface MigrationInfo [exported]
      refs in: 2 [type: 2]
        - src/storage/database.ts:89: type loadMigrations
        - src/storage/database.ts:95: type migrations
  function:
    46-84: openDatabase(options: DatabaseOptions = {}): Database.Database [exported]
      /** Open or create the pi-brain database */
      refs in: 111 [call: 96, import: 15]
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
    89-112: loadMigrations(): {} [exported]
      /** Load migrations from the migrations directory */
      refs in: 5 [call: 4, import: 1]
        - src/storage/database.test.ts:16: import (module)
        - src/storage/database.test.ts:50: call migrations
        - src/storage/database.test.ts:58: call migrations
        - src/storage/database.test.ts:143: call migrations
        - src/storage/database.ts:194: call migrations
    117-127: getSchemaVersion(db: Database.Database): number [exported]
      /** Get current schema version */
      refs in: 7 [call: 6, import: 1]
        - src/storage/database.test.ts:14: import (module)
        - src/storage/database.test.ts:86: call version
        - src/storage/database.test.ts:100: call (module)
        - src/storage/database.test.ts:148: call (module)
        - src/storage/database.test.ts:159: call firstVersion
        - src/storage/database.test.ts:165: call (module)
        - src/storage/database.ts:193: call currentVersion
    133-154: getMigrationSkippedReason(db: Database.Database, version: number): string [exported]
      /** Check if a specific migration was skipped due to missing dependencies. Returns the requirement that caused it to be skipped, or null if not skipped. */
      refs in: 1 [call: 1]
        - src/storage/database.ts:199: call skippedReason
    161-170: parseMigrationRequirements(sql: string): {} [exported]
      /** Parse a migration SQL file for REQUIRES directives. Format: -- REQUIRES: requirement1, requirement2 Returns array of requirements (e.g., ['sqlite-vec']) */
      refs in: 2 [call: 2]
        - src/storage/database.ts:202: call requirements
        - src/storage/database.ts:220: call requirements
    176-187: checkMigrationRequirements(db: Database.Database, requirements: string[]): string [exported]
      /** Check if migration requirements are satisfied. Returns unsatisfied requirement, or null if all satisfied. */
      refs in: 2 [call: 2]
        - src/storage/database.ts:203: call unsatisfied
        - src/storage/database.ts:221: call unsatisfied
    192-249: migrate(db: Database.Database): number [exported]
      /** Run pending migrations */
      refs in: 55 [call: 43, import: 12]
        - src/api/routes/clusters.test.ts:10: import (module)
        - src/api/routes/clusters.test.ts:21: call (module)
        - src/api/routes/config.test.ts:9: import (module)
        - src/api/routes/config.test.ts:21: call (module)
        - src/api/routes/query.test.ts:10: import (module)
        - src/api/routes/query.test.ts:19: call (module)
        - src/api/server.test.ts:13: import (module)
        - src/api/server.test.ts:132: call (module)
        - src/api/server.test.ts:146: call (module)
        - src/api/server.test.ts:167: call (module)
    254-256: closeDatabase(db: Database.Database): void [exported]
      /** Close the database connection */
      refs in: 20 [call: 14, import: 6]
        - src/daemon/queue.test.ts:12: import (module)
        - src/daemon/queue.test.ts:34: call (module)
        - src/daemon/worker.test.ts:14: import (module)
        - src/daemon/worker.test.ts:112: call (module)
        - src/daemon/worker.test.ts:279: call (module)
        - src/daemon/worker.test.ts:373: call (module)
        - src/daemon/worker.test.ts:461: call (module)
        - src/storage/database-vec.test.ts:8: import (module)
        - src/storage/database-vec.test.ts:17: call (module)
        - src/storage/database.test.ts:13: import (module)
    261-268: isDatabaseHealthy(db: Database.Database): boolean [exported]
      /** Check if the database is healthy */
      refs in: 4 [call: 3, import: 1]
        - src/storage/database.test.ts:15: import (module)
        - src/storage/database.test.ts:424: call (module)
        - src/storage/database.test.ts:437: call (module)
        - src/storage/database.test.ts:453: call (module)
    273-281: loadVecExtension(db: Database.Database): boolean [exported]
      /** Load the sqlite-vec extension */
      refs in: 1 [call: 1]
        - src/storage/database.ts:68: call loaded
    286-297: isVecLoaded(db: Database.Database): boolean [exported]
      /** Check if sqlite-vec extension is loaded */
      refs in: 11 [call: 6, import: 5]
        - src/daemon/query-processor.ts:19: import (module)
        - src/daemon/query-processor.ts:228: call findRelevantNodes
        - src/storage/database-vec.test.ts:8: import (module)
        - src/storage/database-vec.test.ts:35: call (module)
        - src/storage/database.ts:181: call checkMigrationRequirements
        - src/storage/embedding-utils.ts:12: import (module)
        - src/storage/embedding-utils.ts:182: call txn
        - src/storage/embedding-utils.ts:227: call deleteEmbedding
        - src/storage/semantic-search.test.ts:8: import (module)
        - src/storage/semantic-search.ts:12: import (module)
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

src/storage/decision-repository.test.ts [1-328]
  imports:
    - ./database.js
    - ./decision-repository.js
    - ./index.js
    - ./node-crud.js
    - ./node-types.js
    - better-sqlite3
    - node:fs
    - node:os
    - node:path
    - vitest

src/storage/decision-repository.ts [1-143]
  interface:
    10-19: interface ListDecisionsFilters [exported]
      /** Filters for querying daemon decisions */
      refs in: 1 [type: 1]
        - src/storage/decision-repository.ts:58: type listDecisions
    22-27: interface ListDecisionsOptions [exported]
      /** Pagination options */
      refs in: 1 [type: 1]
        - src/storage/decision-repository.ts:59: type listDecisions
    30-39: interface DaemonDecisionResult [exported]
      /** A daemon decision result with metadata */
      refs in: 2 [type: 2]
        - src/storage/decision-repository.ts:44: type ListDecisionsResult
        - src/storage/decision-repository.ts:121: type decisions
    42-51: interface ListDecisionsResult [exported]
      /** Result from listDecisions query */
      refs in: 1 [type: 1]
        - src/storage/decision-repository.ts:60: type listDecisions
  function:
    56-124: listDecisions(db: Database.Database, filters: ListDecisionsFilters = {}, options: ListDecisionsOptions = {}): ListDecisionsResult [exported]
      /** List daemon decisions with filters and pagination. */
      refs in: 9 [call: 7, import: 2]
        - src/api/routes/decisions.ts:10: import (module)
        - src/api/routes/decisions.ts:51: call result
        - src/storage/decision-repository.test.ts:13: import (module)
        - src/storage/decision-repository.test.ts:106: call result
        - src/storage/decision-repository.test.ts:240: call resA
        - src/storage/decision-repository.test.ts:244: call resB
        - src/storage/decision-repository.test.ts:313: call [decision]
        - src/storage/decision-repository.test.ts:319: call [updatedDecision]
        - src/storage/decision-repository.test.ts:324: call [clearedDecision]
    129-142: updateDecisionFeedback(db: Database.Database, decisionId: string, feedback: string | null): boolean [exported]
      /** Update user feedback for a daemon decision */
      refs in: 5 [call: 3, import: 2]
        - src/api/routes/decisions.ts:11: import (module)
        - src/api/routes/decisions.ts:79: call updated
        - src/storage/decision-repository.test.ts:14: import (module)
        - src/storage/decision-repository.test.ts:316: call updated
        - src/storage/decision-repository.test.ts:323: call (module)
  imports:
    - better-sqlite3

src/storage/edge-repository.ts [1-186]
  interface:
    19-27: interface EdgeRow [exported]
      /** Edge row from the database */
      refs in: 15 [import: 1, type: 14]
        - src/storage/edge-repository.ts:88: type getEdgesFrom
        - src/storage/edge-repository.ts:94: type getEdgesFrom
        - src/storage/edge-repository.ts:100: type getEdgesTo
        - src/storage/edge-repository.ts:106: type getEdgesTo
        - src/storage/edge-repository.ts:112: type getNodeEdges
        - src/storage/edge-repository.ts:118: type getNodeEdges
        - src/storage/edge-repository.ts:124: type getAllEdges
        - src/storage/edge-repository.ts:126: type getAllEdges
        - src/storage/edge-repository.ts:132: type getEdge
        - src/storage/edge-repository.ts:134: type getEdge
  function:
    36-38: generateEdgeId(): string [exported]
      /** Generate a unique edge ID with 'edg_' prefix */
      refs in: 1 [call: 1]
        - src/storage/edge-repository.ts:58: call edge
    47-83: createEdge(db: Database.Database, sourceNodeId: string, targetNodeId: string, type: EdgeType, options: {
    metadata?: EdgeMetadata;
    createdBy?: "boundary" | "daemon" | "user";
  } = {}): Edge [exported]
      /** Create an edge between two nodes */
      refs in: 59 [call: 55, import: 4]
        - src/daemon/connection-discovery.test.ts:4: import (module)
        - src/daemon/connection-discovery.test.ts:190: call (module)
        - src/daemon/connection-discovery.ts:13: import (module)
        - src/daemon/connection-discovery.ts:272: call ConnectionDiscoverer.edge
        - src/daemon/connection-discovery.ts:399: call ConnectionDiscoverer.edge
        - src/daemon/connection-discovery.ts:484: call ConnectionDiscoverer.edge
        - src/storage/index.test.ts:20: import (module)
        - src/storage/index.test.ts:1237: call edge
        - src/storage/index.test.ts:1254: call edge
        - src/storage/index.test.ts:1275: call (module)
    88-95: getEdgesFrom(db: Database.Database, nodeId: string): {} [exported]
      /** Get edges from a node (outgoing) */
      refs in: 6 [call: 4, import: 2]
        - src/storage/graph-repository.ts:17: import (module)
        - src/storage/graph-repository.ts:144: call outgoing
        - src/storage/index.test.ts:39: import (module)
        - src/storage/index.test.ts:1278: call edges
        - src/storage/index.test.ts:1288: call edges
        - src/storage/index.test.ts:2176: call (module)
    100-107: getEdgesTo(db: Database.Database, nodeId: string): {} [exported]
      /** Get edges to a node (incoming) */
      refs in: 6 [call: 4, import: 2]
        - src/storage/graph-repository.ts:18: import (module)
        - src/storage/graph-repository.ts:151: call incoming
        - src/storage/index.test.ts:40: import (module)
        - src/storage/index.test.ts:1196: call allEdges
        - src/storage/index.test.ts:1305: call edges
        - src/storage/index.test.ts:2177: call (module)
    112-119: getNodeEdges(db: Database.Database, nodeId: string): {} [exported]
      /** Get all edges for a node (both directions) */
      refs in: 4 [call: 2, import: 2]
        - src/storage/graph-repository.ts:19: import (module)
        - src/storage/graph-repository.ts:312: call allEdges
        - src/storage/index.test.ts:44: import (module)
        - src/storage/index.test.ts:1324: call edges
    124-127: getAllEdges(db: Database.Database): {} [exported]
      /** Get all edges */
      refs in: 2 [call: 1, import: 1]
        - src/daemon/graph-export.ts:12: import (module)
        - src/daemon/graph-export.ts:51: call allEdges
    132-135: getEdge(db: Database.Database, edgeId: string): EdgeRow [exported]
      /** Get edge by ID */
      refs in: 4 [call: 3, import: 1]
        - src/storage/index.test.ts:38: import (module)
        - src/storage/index.test.ts:1259: call retrieved
        - src/storage/index.test.ts:1371: call (module)
        - src/storage/index.test.ts:1391: call row
    140-143: deleteEdge(db: Database.Database, edgeId: string): boolean [exported]
      /** Delete an edge */
      refs in: 3 [call: 2, import: 1]
        - src/storage/index.test.ts:22: import (module)
        - src/storage/index.test.ts:1369: call result
        - src/storage/index.test.ts:1375: call result
    148-166: edgeExists(db: Database.Database, sourceNodeId: string, targetNodeId: string, type?: EdgeType): boolean [exported]
      /** Check if an edge exists between two nodes */
      refs in: 13 [call: 10, import: 3]
        - src/daemon/connection-discovery.ts:13: import (module)
        - src/daemon/connection-discovery.ts:249: call ConnectionDiscoverer.discover
        - src/daemon/connection-discovery.ts:394: call ConnectionDiscoverer.detectReferences
        - src/daemon/connection-discovery.ts:475: call ConnectionDiscoverer.detectLessonReinforcement
        - src/storage/index.test.ts:24: import (module)
        - src/storage/index.test.ts:1336: call (module)
        - src/storage/index.test.ts:1346: call (module)
        - src/storage/index.test.ts:1356: call (module)
        - src/storage/index.test.ts:1357: call (module)
        - src/storage/index.test.ts:2175: call (module)
    175-185: edgeRowToEdge(row: EdgeRow): Edge [exported]
      /** Convert an Edge row from the database to an Edge object */
      refs in: 3 [call: 1, import: 2]
        - src/daemon/graph-export.ts:12: import (module)
        - src/storage/index.test.ts:25: import (module)
        - src/storage/index.test.ts:1394: call converted
  imports:
    - ./node-types.js
    - better-sqlite3

src/storage/embedding-utils.test.ts [1-1069]
  imports:
    - ../types/index.js
    - ./database.js
    - ./embedding-utils.js
    - better-sqlite3
    - vitest

src/storage/embedding-utils.ts [1-625]
  interface:
    325-329: interface BackfillEmbeddingProvider [exported]
      /** Embedding provider interface for backfill operations. Matches the EmbeddingProvider interface from facet-discovery.ts. */
      refs in: 3 [type: 3]
        - src/storage/embedding-utils.ts:405: type findNodesNeedingEmbedding
        - src/storage/embedding-utils.ts:461: type backfillEmbeddings
        - src/storage/embedding-utils.ts:594: type countNodesNeedingEmbedding
    334-339: interface BackfillLogger [exported]
      /** Logger interface for backfill operations. */
      refs in: 2 [type: 2]
        - src/storage/embedding-utils.ts:352: type BackfillEmbeddingsOptions
        - src/storage/embedding-utils.ts:379: type noopLogger
    344-355: interface BackfillEmbeddingsOptions [exported]
      /** Options for backfillEmbeddings function. */
      refs in: 1 [type: 1]
        - src/storage/embedding-utils.ts:463: type backfillEmbeddings
    360-371: interface BackfillResult [exported]
      /** Result of a backfill operation. */
      refs in: 3 [import: 1, type: 2]
        - src/daemon/scheduler.ts:26: import (module)
        - src/daemon/scheduler.ts:767: type Scheduler.result
        - src/storage/embedding-utils.ts:464: type backfillEmbeddings
  function:
    43-83: buildEmbeddingText(node: Node): string [exported]
      /** Build embedding text from a node for semantic search. Format: ``` [{type}] {summary} Decisions: - {decision.what} (why: {decision.why}) - ... Lessons: - {lesson.summary} - ... ``` This richer format enables semantic search to find nodes by: - What type of work was done - What was accomplished (summary) - What decisions were made and why - What lessons were learned */
      refs in: 11 [call: 8, import: 3]
        - src/daemon/facet-discovery.ts:35: import (module)
        - src/daemon/facet-discovery.ts:876: call FacetDiscovery.buildNodeEmbeddingText
        - src/daemon/worker.ts:28: import (module)
        - src/daemon/worker.ts:617: call Worker.text
        - src/storage/embedding-utils.test.ts:14: import (module)
        - src/storage/embedding-utils.test.ts:143: call text
        - src/storage/embedding-utils.test.ts:173: call text
        - src/storage/embedding-utils.test.ts:230: call text
        - src/storage/embedding-utils.test.ts:281: call text
        - src/storage/embedding-utils.test.ts:316: call text
    97-109: buildSimpleEmbeddingText(type: string | null, summary: string | null): string [exported]
      /** Build simple embedding text from node summary data. This is a lightweight version for use with partial node data (e.g., NodeSummaryRow from database queries). Returns: - `[type] summary` when both are present - `summary` when only summary is present - `[type]` when only type is present (sparse but valid for type-only filtering) - `` (empty string) when both are null */
      refs in: 7 [call: 5, import: 2]
        - src/daemon/facet-discovery.ts:36: import (module)
        - src/daemon/facet-discovery.ts:882: call FacetDiscovery.buildNodeEmbeddingText
        - src/storage/embedding-utils.test.ts:15: import (module)
        - src/storage/embedding-utils.test.ts:328: call text
        - src/storage/embedding-utils.test.ts:333: call text
        - src/storage/embedding-utils.test.ts:338: call text
        - src/storage/embedding-utils.test.ts:343: call text
    119-121: isRichEmbeddingFormat(inputText: string): boolean [exported]
      /** Check if embedding text uses the rich format (includes decisions/lessons). Used to detect nodes with old-format embeddings that need re-embedding. Detection relies on the version marker [emb:v2]. This avoids strict dependencies on whitespace or formatting of the sections. */
      refs in: 13 [call: 11, import: 2]
        - src/daemon/facet-discovery.ts:37: import (module)
        - src/daemon/facet-discovery.ts:820: call FacetDiscovery.embedNodes
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
        - src/daemon/semantic-search.integration.test.ts:11: import (module)
        - src/daemon/semantic-search.integration.test.ts:166: call (module)
        - src/daemon/semantic-search.integration.test.ts:167: call (module)
        - src/daemon/semantic-search.integration.test.ts:208: call (module)
        - src/daemon/semantic-search.integration.test.ts:256: call (module)
        - src/daemon/semantic-search.integration.test.ts:257: call (module)
        - src/daemon/semantic-search.integration.test.ts:292: call (module)
        - src/daemon/worker.ts:29: import (module)
        - src/daemon/worker.ts:630: call Worker.{ vecUpdated }
        - src/storage/embedding-utils.test.ts:25: import (module)
    210-237: deleteEmbedding(db: Database.Database, nodeId: string): boolean [exported]
      /** Delete an embedding from both node_embeddings and node_embeddings_vec tables. */
      refs in: 3 [call: 2, import: 1]
        - src/storage/embedding-utils.test.ts:17: import (module)
        - src/storage/embedding-utils.test.ts:589: call deleted
        - src/storage/embedding-utils.test.ts:597: call deleted
    242-275: getEmbedding(db: Database.Database, nodeId: string): { embedding: {}; modelName: string; inputText: string; createdAt: string; } [exported]
      /** Get embedding for a node. */
      refs in: 4 [call: 3, import: 1]
        - src/storage/embedding-utils.test.ts:21: import (module)
        - src/storage/embedding-utils.test.ts:432: call stored
        - src/storage/embedding-utils.test.ts:463: call stored
        - src/storage/embedding-utils.test.ts:903: call stored
    280-285: hasEmbedding(db: Database.Database, nodeId: string): boolean [exported]
      /** Check if a node has an embedding stored. */
      refs in: 9 [call: 7, import: 2]
        - src/daemon/worker.test.ts:15: import (module)
        - src/daemon/worker.test.ts:536: call (module)
        - src/storage/embedding-utils.test.ts:22: import (module)
        - src/storage/embedding-utils.test.ts:516: call (module)
        - src/storage/embedding-utils.test.ts:548: call (module)
        - src/storage/embedding-utils.test.ts:555: call (module)
        - src/storage/embedding-utils.test.ts:587: call (module)
        - src/storage/embedding-utils.test.ts:591: call (module)
        - src/storage/embedding-utils.test.ts:902: call (module)
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
        - src/storage/semantic-search.test.ts:9: import (module)
        - src/storage/semantic-search.ts:13: import (module)
        - src/storage/semantic-search.ts:176: call getNodeEmbeddingVector
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
        - src/storage/embedding-utils.ts:476: call nodes
    459-585: async backfillEmbeddings(db: Database.Database, provider: BackfillEmbeddingProvider, readNodeFromPath: (dataFile: string) => Node, options: BackfillEmbeddingsOptions = {}): Promise<BackfillResult> [exported]
      /** Backfill embeddings for nodes that are missing or have outdated embeddings. This function: 1. Finds nodes needing embedding (missing, wrong model, or old format) 2. Loads full node data from JSON files 3. Builds rich embedding text (summary + decisions + lessons) 4. Generates embeddings in batches via the provider 5. Stores in both node_embeddings table and node_embeddings_vec (if available) Errors are handled gracefully: - Individual node failures don't stop the batch - Returns statistics including failed node IDs for retry */
      refs in: 13 [call: 10, import: 3]
        - src/daemon/cli.ts:29: import (module)
        - src/daemon/cli.ts:1175: call result
        - src/daemon/scheduler.ts:25: import (module)
        - src/daemon/scheduler.ts:794: call Scheduler.runBackfillEmbeddings
        - src/storage/embedding-utils.test.ts:13: import (module)
        - src/storage/embedding-utils.test.ts:895: call result
        - src/storage/embedding-utils.test.ts:919: call result
        - src/storage/embedding-utils.test.ts:941: call result
        - src/storage/embedding-utils.test.ts:964: call result
        - src/storage/embedding-utils.test.ts:994: call result
    592-624: countNodesNeedingEmbedding(db: Database.Database, provider: BackfillEmbeddingProvider, options: { force?: boolean } = {}): { total: number; needsEmbedding: number; } [exported]
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

src/storage/graph-repository.ts [1-366]
  interface:
    31-47: interface ConnectedNodesOptions [exported]
      /** Options for getConnectedNodes */
      refs in: 2 [type: 2]
        - src/storage/graph-repository.ts:113: type getConnectedNodes
        - src/storage/graph-repository.ts:227: type getSubgraph
    50-65: interface TraversalEdge [exported]
      /** An edge with direction information for traversal results */
      refs in: 3 [type: 3]
        - src/storage/graph-repository.ts:74: type ConnectedNodesResult
        - src/storage/graph-repository.ts:122: type traversalEdges
        - src/storage/graph-repository.ts:236: type allEdges
    68-75: interface ConnectedNodesResult [exported]
      /** Result from getConnectedNodes */
      refs in: 4 [type: 4]
        - src/storage/graph-repository.ts:114: type getConnectedNodes
        - src/storage/graph-repository.ts:228: type getSubgraph
        - src/storage/graph-repository.ts:343: type getAncestors
        - src/storage/graph-repository.ts:359: type getDescendants
  type:
    28-28: TraversalDirection = "incoming" | "outgoing" | "both" [exported]
      /** Direction for graph traversal */
      refs in: 1 [type: 1]
        - src/storage/graph-repository.ts:41: type ConnectedNodesOptions
  function:
    110-215: getConnectedNodes(db: Database.Database, nodeId: string, options: ConnectedNodesOptions = {}): ConnectedNodesResult [exported]
      /** Get all nodes connected to a specific node with graph traversal. Supports: - Multi-hop traversal (depth 1-5) - Direction filtering (incoming, outgoing, both) - Edge type filtering Based on specs/storage.md graph traversal query and specs/api.md GET /api/v1/nodes/:id/connected endpoint. */
      refs in: 18 [call: 16, import: 2]
        - src/api/routes/nodes.ts:9: import (module)
        - src/api/routes/nodes.ts:180: call connected
        - src/api/routes/nodes.ts:227: call result
        - src/storage/graph-repository.ts:239: call result
        - src/storage/graph-repository.ts:344: call getAncestors
        - src/storage/graph-repository.ts:360: call getDescendants
        - src/storage/index.test.ts:36: import (module)
        - src/storage/index.test.ts:2956: call result
        - src/storage/index.test.ts:2976: call result
        - src/storage/index.test.ts:2998: call result
    224-271: getSubgraph(db: Database.Database, rootNodeIds: string[], options: ConnectedNodesOptions = {}): ConnectedNodesResult [exported]
      /** Get the subgraph for visualization - returns nodes and edges within a given depth from multiple root nodes. Unlike getConnectedNodes, this INCLUDES the root nodes in the result, which is useful for rendering a graph view starting from selected nodes. */
      refs in: 5 [call: 4, import: 1]
        - src/storage/index.test.ts:53: import (module)
        - src/storage/index.test.ts:3165: call result
        - src/storage/index.test.ts:3186: call result
        - src/storage/index.test.ts:3201: call result
        - src/storage/index.test.ts:3222: call result
    279-333: findPath(db: Database.Database, fromNodeId: string, toNodeId: string, options: { maxDepth?: number } = {}): { nodeIds: {}; edges: {}; } [exported]
      /** Get the path between two nodes if one exists. Uses BFS to find the shortest path. Returns null if no path exists. */
      refs in: 6 [call: 5, import: 1]
        - src/storage/index.test.ts:26: import (module)
        - src/storage/index.test.ts:3239: call result
        - src/storage/index.test.ts:3251: call result
        - src/storage/index.test.ts:3270: call result
        - src/storage/index.test.ts:3281: call result
        - src/storage/index.test.ts:3301: call result
    339-349: getAncestors(db: Database.Database, nodeId: string, options: { maxDepth?: number; edgeTypes?: EdgeType[] } = {}): ConnectedNodesResult [exported]
      /** Get all ancestors of a node (nodes that lead TO this node). Follows incoming edges only. */
      refs in: 3 [call: 2, import: 1]
        - src/storage/index.test.ts:27: import (module)
        - src/storage/index.test.ts:3320: call result
        - src/storage/index.test.ts:3340: call result
    355-365: getDescendants(db: Database.Database, nodeId: string, options: { maxDepth?: number; edgeTypes?: EdgeType[] } = {}): ConnectedNodesResult [exported]
      /** Get all descendants of a node (nodes that this node leads TO). Follows outgoing edges only. */
      refs in: 3 [call: 2, import: 1]
        - src/storage/index.test.ts:37: import (module)
        - src/storage/index.test.ts:3360: call result
        - src/storage/index.test.ts:3380: call result
  imports:
    - ./edge-repository.js
    - ./node-crud.js
    - ./node-types.js
    - better-sqlite3

src/storage/index.test.ts [1-4087]
  imports:
    - ../daemon/processor.js
    - ../daemon/queue.js
    - ./database.js
    - ./index.js
    - ./node-types.js
    - ./tool-error-repository.js
    - node:fs
    - node:os
    - node:path
    - vitest

src/storage/index.ts [1-18]
  imports:
    - ./database.js
    - ./edge-repository.js
    - ./embedding-utils.js
    - ./graph-repository.js
    - ./lesson-repository.js
    - ./node-conversion.js
    - ./node-crud.js
    - ./node-queries.js
    - ./node-storage.js
    - ./node-types.js
    - ./quirk-repository.js
    - ./search-repository.js
    - ./tool-error-repository.js

src/storage/lesson-repository.ts [1-284]
  interface:
    16-25: interface ListLessonsFilters [exported]
      /** Filters for querying lessons */
      refs in: 6 [import: 1, type: 5]
        - src/api/routes/lessons.ts:10: import (module)
        - src/api/routes/lessons.ts:62: type filters
        - src/api/routes/lessons.ts:63: type filters
        - src/api/routes/lessons.ts:66: type filters
        - src/storage/lesson-repository.ts:87: type listLessons
        - src/storage/lesson-repository.ts:239: type countLessons
    28-33: interface ListLessonsOptions [exported]
      /** Pagination options for lessons */
      refs in: 3 [import: 1, type: 2]
        - src/api/routes/lessons.ts:11: import (module)
        - src/api/routes/lessons.ts:69: type options
        - src/storage/lesson-repository.ts:88: type listLessons
    36-55: interface ListLessonsResult [exported]
      /** Result from listLessons query */
      refs in: 1 [type: 1]
        - src/storage/lesson-repository.ts:89: type listLessons
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
      refs in: 2 [type: 2]
        - src/storage/lesson-repository.ts:195: type getLessonsByLevel
        - src/storage/lesson-repository.ts:205: type result
  function:
    85-184: listLessons(db: Database.Database, filters: ListLessonsFilters = {}, options: ListLessonsOptions = {}): ListLessonsResult [exported]
      /** List lessons with filters and pagination. Supports filtering by: - level (exact match) - project (partial match via nodes table) - tags (AND logic via lesson_tags table) - confidence (exact match) Per specs/api.md GET /api/v1/lessons endpoint. */
      refs in: 9 [call: 7, import: 2]
        - src/api/routes/lessons.ts:9: import (module)
        - src/api/routes/lessons.ts:74: call result
        - src/storage/index.test.ts:57: import (module)
        - src/storage/index.test.ts:3434: call modelLessons
        - src/storage/index.test.ts:3439: call project1Lessons
        - src/storage/index.test.ts:3444: call tag1Lessons
        - src/storage/index.test.ts:3447: call tag2Lessons
        - src/storage/index.test.ts:3452: call paginated
        - src/storage/lesson-repository.ts:241: call result
    192-232: getLessonsByLevel(db: Database.Database, recentLimit = 5): Record<string, { count: number; recent: {}; }> [exported]
      /** Get aggregated lesson stats by level. Returns counts and most recent lessons for each level. Per specs/api.md GET /api/v1/lessons/by-level endpoint. */
      refs in: 4 [call: 2, import: 2]
        - src/api/routes/lessons.ts:8: import (module)
        - src/api/routes/lessons.ts:88: call result
        - src/storage/index.test.ts:41: import (module)
        - src/storage/index.test.ts:3490: call stats
    237-243: countLessons(db: Database.Database, filters: ListLessonsFilters = {}): number [exported]
      /** Count lessons matching filters (without fetching data) */
      refs in: 4 [call: 3, import: 1]
        - src/storage/index.test.ts:17: import (module)
        - src/storage/index.test.ts:3532: call (module)
        - src/storage/index.test.ts:3533: call (module)
        - src/storage/index.test.ts:3534: call (module)
    248-271: getNodeLessons(db: Database.Database, nodeId: string): {} [exported]
      /** Get lessons for a node */
      refs in: 8 [call: 6, import: 2]
        - src/api/routes/nodes.ts:11: import (module)
        - src/api/routes/nodes.ts:160: call nodesRoutes
        - src/storage/index.test.ts:45: import (module)
        - src/storage/index.test.ts:369: call lessons
        - src/storage/index.test.ts:753: call lessons
        - src/storage/index.test.ts:800: call (module)
        - src/storage/index.test.ts:998: call lessons
        - src/storage/index.test.ts:2142: call lessons
    276-283: getLessonTags(db: Database.Database, lessonId: string): {} [exported]
      /** Get tags for a specific lesson */
      refs in: 2 [call: 1, import: 1]
        - src/storage/index.test.ts:42: import (module)
        - src/storage/index.test.ts:999: call lessonTags
  imports:
    - better-sqlite3

src/storage/node-conversion.ts [1-343]
  interface:
    25-44: interface NodeConversionContext [exported]
      /** Context needed to convert AgentNodeOutput to a full Node */
      refs in: 3 [import: 1, type: 2]
        - src/storage/index.test.ts:66: import (module)
        - src/storage/index.test.ts:238: type createTestConversionContext
        - src/storage/node-conversion.ts:56: type agentOutputToNode
  function:
    54-261: agentOutputToNode(output: AgentNodeOutput, context: NodeConversionContext): Node [exported]
      /** Convert AgentNodeOutput from the analyzer to a full Node structure Fills in source, metadata, and identity fields from the job context */
      refs in: 24 [call: 22, import: 2]
        - src/daemon/worker.ts:36: import (module)
        - src/daemon/worker.ts:464: call Worker.node
        - src/storage/index.test.ts:16: import (module)
        - src/storage/index.test.ts:824: call newNode
        - src/storage/index.test.ts:849: call (module)
        - src/storage/index.test.ts:867: call newNode
        - src/storage/index.test.ts:894: call (module)
        - src/storage/index.test.ts:1856: call node
        - src/storage/index.test.ts:1887: call node
        - src/storage/index.test.ts:1912: call node
    268-335: nodeRowToNode(row: NodeRow, loadFull = false): Node [exported]
      /** Transform a NodeRow (flat SQLite row) to Node (nested structure). For listings, constructs Node from row data without reading JSON. For full details, reads the JSON file. */
      refs in: 1 [call: 1]
        - src/storage/node-conversion.ts:341: call nodeRowsToNodes
    340-342: nodeRowsToNodes(rows: NodeRow[], loadFull = false): {} [exported]
      /** Transform array of NodeRows to Nodes */
      refs in: 5 [call: 3, import: 2]
        - src/api/routes/nodes.ts:12: import (module)
        - src/api/routes/nodes.ts:113: call transformedResult
        - src/api/routes/nodes.ts:235: call transformedResult
        - src/api/routes/sessions.ts:9: import (module)
        - src/api/routes/sessions.ts:239: call sessionNodes
  imports:
    - ../daemon/processor.js
    - ../daemon/queue.js
    - ./node-crud.js
    - ./node-storage.js
    - ./node-types.js

src/storage/node-crud.ts [1-751]
  interface:
    39-42: interface RepositoryOptions extends NodeStorageOptions [exported]
      /** Options for node repository operations */
      refs in: 8 [import: 2, type: 6]
        - src/storage/decision-repository.test.ts:8: import (module)
        - src/storage/decision-repository.test.ts:22: type options
        - src/storage/index.test.ts:67: import (module)
        - src/storage/index.test.ts:273: type options
        - src/storage/node-crud.ts:301: type createNode
        - src/storage/node-crud.ts:326: type upsertNode
        - src/storage/node-crud.ts:440: type updateNode
        - src/storage/node-crud.ts:570: type getAllNodeVersions
    45-67: interface NodeRow [exported]
      /** Node row from the database */
      refs in: 42 [import: 8, type: 34]
        - src/daemon/connection-discovery.ts:10: import (module)
        - src/daemon/connection-discovery.ts:311: type ConnectionDiscoverer.findCandidates
        - src/daemon/connection-discovery.ts:332: type ConnectionDiscoverer.findCandidates
        - src/daemon/graph-export.ts:8: import (module)
        - src/daemon/graph-export.ts:97: type formatNodeLabel
        - src/daemon/query-processor.ts:16: import (module)
        - src/daemon/query-processor.ts:296: type nodeRowToRelevant
        - src/storage/graph-repository.ts:13: import (module)
        - src/storage/graph-repository.ts:72: type ConnectedNodesResult
        - src/storage/graph-repository.ts:199: type nodes
  function:
    76-107: insertLessons(db: Database.Database, nodeId: string, lessonsByLevel: LessonsByLevel): void [exported]
      /** Insert lessons for a node */
      refs in: 3 [call: 3]
        - src/storage/node-crud.ts:283: call insertNodeToDb
        - src/storage/node-crud.ts:418: call upsertNode
        - src/storage/node-crud.ts:515: call updateNode
    112-132: insertModelQuirks(db: Database.Database, nodeId: string, quirks: ModelQuirk[]): void [exported]
      /** Insert model quirks for a node */
      refs in: 3 [call: 3]
        - src/storage/node-crud.ts:284: call insertNodeToDb
        - src/storage/node-crud.ts:419: call upsertNode
        - src/storage/node-crud.ts:516: call updateNode
    137-157: insertToolErrors(db: Database.Database, nodeId: string, errors: ToolError[]): void [exported]
      /** Insert tool errors for a node */
      refs in: 3 [call: 3]
        - src/storage/node-crud.ts:285: call insertNodeToDb
        - src/storage/node-crud.ts:420: call upsertNode
        - src/storage/node-crud.ts:517: call updateNode
    162-181: insertDaemonDecisions(db: Database.Database, nodeId: string, decisions: DaemonDecision[]): void [exported]
      /** Insert daemon decisions for a node */
      refs in: 3 [call: 3]
        - src/storage/node-crud.ts:286: call insertNodeToDb
        - src/storage/node-crud.ts:421: call upsertNode
        - src/storage/node-crud.ts:518: call updateNode
    191-220: clearAllData(db: Database.Database): void [exported]
      /** Clear all data from the database (nodes, edges, etc.) Used by rebuild-index CLI */
      refs in: 2 [call: 1, import: 1]
        - src/daemon/cli.ts:31: import (module)
        - src/daemon/cli.ts:1052: call rebuildIndex
    226-292: insertNodeToDb(db: Database.Database, node: Node, dataFile: string, options: { skipFts?: boolean } = {}): void [exported]
      /** Insert a node into the database (without writing JSON file) Used by createNode and rebuild-index CLI */
      refs in: 4 [call: 3, import: 1]
        - src/daemon/cli.ts:32: import (module)
        - src/daemon/cli.ts:1064: call processInsertBatch
        - src/storage/node-crud.ts:308: call createNode
        - src/storage/node-crud.ts:336: call upsertNode
    298-312: createNode(db: Database.Database, node: Node, options: RepositoryOptions = {}): Node [exported]
      /** Create a node - writes to both SQLite and JSON storage Returns the node with any auto-generated fields filled in */
      refs in: 258 [call: 254, import: 4]
        - src/api/server.test.ts:14: import (module)
        - src/api/server.test.ts:224: call (module)
        - src/api/server.test.ts:272: call (module)
        - src/api/server.test.ts:273: call (module)
        - src/api/server.test.ts:320: call (module)
        - src/api/server.test.ts:478: call (module)
        - src/api/server.test.ts:479: call (module)
        - src/api/server.test.ts:584: call (module)
        - src/api/server.test.ts:585: call (module)
        - src/api/server.test.ts:660: call (module)
    323-430: upsertNode(db: Database.Database, node: Node, options: RepositoryOptions = {}): { node: Node; created: boolean; } [exported]
      /** Upsert a node - creates if not exists, updates if exists. This provides idempotent ingestion for analysis jobs. If a job crashes after writing JSON but before DB insert, re-running will update the existing data cleanly without duplicates or errors. Returns the node and whether it was created (true) or updated (false). */
      refs in: 9 [call: 7, import: 2]
        - src/daemon/worker.ts:34: import (module)
        - src/daemon/worker.ts:481: call Worker.{ created }
        - src/storage/index.test.ts:65: import (module)
        - src/storage/index.test.ts:625: call { node: resultNode, created }
        - src/storage/index.test.ts:655: call { node: resultNode, created }
        - src/storage/index.test.ts:673: call first
        - src/storage/index.test.ts:677: call second
        - src/storage/index.test.ts:703: call (module)
        - src/storage/index.test.ts:751: call (module)
    437-527: updateNode(db: Database.Database, node: Node, options: RepositoryOptions = {}): Node [exported]
      /** Update a node - writes new JSON version and updates SQLite row. Throws if the node doesn't exist in the database. Returns the updated node. */
      refs in: 6 [call: 5, import: 1]
        - src/storage/index.test.ts:64: import (module)
        - src/storage/index.test.ts:830: call (module)
        - src/storage/index.test.ts:850: call (module)
        - src/storage/index.test.ts:868: call (module)
        - src/storage/index.test.ts:895: call (module)
        - src/storage/index.test.ts:908: call (module)
    532-538: getNode(db: Database.Database, nodeId: string): NodeRow [exported]
      /** Get a node by ID (returns the row from SQLite - always the latest version) */
      refs in: 14 [call: 11, import: 3]
        - src/api/routes/nodes.ts:10: import (module)
        - src/api/routes/nodes.ts:143: call nodeRow
        - src/api/routes/nodes.ts:220: call nodeRow
        - src/daemon/connection-discovery.ts:14: import (module)
        - src/daemon/connection-discovery.ts:205: call ConnectionDiscoverer.sourceNode
        - src/daemon/connection-discovery.ts:390: call ConnectionDiscoverer.targetNode
        - src/storage/index.test.ts:43: import (module)
        - src/storage/index.test.ts:304: call row
        - src/storage/index.test.ts:442: call result
        - src/storage/index.test.ts:450: call result
    545-555: getNodeVersion(db: Database.Database, nodeId: string, version: number): NodeRow [exported]
      /** Get a specific version of a node from SQLite. Note: SQLite only stores the current/latest version. For historical versions, use getAllNodeVersions() which reads from JSON storage. */
      refs in: 3 [call: 2, import: 1]
        - src/storage/index.test.ts:51: import (module)
        - src/storage/index.test.ts:461: call result
        - src/storage/index.test.ts:470: call result
    560-563: nodeExistsInDb(db: Database.Database, nodeId: string): boolean [exported]
      /** Check if a node exists in the database */
      refs in: 8 [call: 7, import: 1]
        - src/storage/index.test.ts:61: import (module)
        - src/storage/index.test.ts:477: call (module)
        - src/storage/index.test.ts:484: call (module)
        - src/storage/index.test.ts:629: call (module)
        - src/storage/index.test.ts:681: call (module)
        - src/storage/index.test.ts:767: call (module)
        - src/storage/node-crud.ts:329: call exists
        - src/storage/node-crud.ts:444: call updateNode
    568-574: getAllNodeVersions(nodeId: string, options: RepositoryOptions = {}): {} [exported]
      /** Get all versions of a node from JSON storage */
      refs in: 4 [call: 2, import: 2]
        - src/api/routes/nodes.ts:10: import (module)
        - src/api/routes/nodes.ts:186: call allVersions
        - src/storage/index.test.ts:30: import (module)
        - src/storage/index.test.ts:897: call allVersions
    580-586: deleteNode(db: Database.Database, nodeId: string): boolean [exported]
      /** Delete a node and all related data Note: Due to ON DELETE CASCADE, related records are automatically deleted */
      refs in: 4 [call: 3, import: 1]
        - src/storage/index.test.ts:23: import (module)
        - src/storage/index.test.ts:765: call result
        - src/storage/index.test.ts:771: call result
        - src/storage/index.test.ts:796: call (module)
    591-603: findNodeByEndEntryId(db: Database.Database, sessionFile: string, entryId: string): NodeRow [exported]
      /** Find a node that contains a specific entry ID as its end boundary */
    608-619: findLastNodeInSession(db: Database.Database, sessionFile: string): NodeRow [exported]
      /** Find the latest node for a given session file */
      refs in: 1 [call: 1]
        - src/storage/node-crud.ts:727: call parentLastNode
    624-635: findFirstNodeInSession(db: Database.Database, sessionFile: string): NodeRow [exported]
      /** Find the first node for a given session file */
    644-669: findPreviousProjectNode(db: Database.Database, project: string, beforeTimestamp: string): any [exported]
      /** Find the most recent node for a project before a given timestamp. Used for abandoned restart detection. Returns the full Node from JSON storage (not just the row) to access filesTouched and other content fields. */
      refs in: 8 [call: 6, import: 2]
        - src/daemon/worker.ts:32: import (module)
        - src/daemon/worker.ts:425: call Worker.previousNode
        - src/storage/index.test.ts:54: import (module)
        - src/storage/index.test.ts:490: call result
        - src/storage/index.test.ts:527: call result
        - src/storage/index.test.ts:553: call result
        - src/storage/index.test.ts:578: call result
        - src/storage/index.test.ts:607: call result
    696-734: linkNodeToPredecessors(db: Database.Database, node: Node, context: {
    boundaryType?: string;
  } = {}): {} [exported]
      /** Automatically link a node to its predecessors based on session structure. Creates structural edges based on session continuity and fork relationships. Idempotent: will not create duplicate edges if called multiple times. */
      refs in: 12 [call: 9, import: 3]
        - src/daemon/cli.ts:33: import (module)
        - src/daemon/cli.ts:1089: call processLinkBatch
        - src/daemon/worker.ts:33: import (module)
        - src/daemon/worker.ts:488: call Worker.processJob
        - src/storage/index.test.ts:56: import (module)
        - src/storage/index.test.ts:1108: call edges
        - src/storage/index.test.ts:1133: call edges
        - src/storage/index.test.ts:1160: call edges
        - src/storage/index.test.ts:1186: call edges1
        - src/storage/index.test.ts:1187: call edges2
  imports:
    - ./edge-repository.js
    - ./node-storage.js
    - ./node-types.js
    - ./search-repository.js
    - better-sqlite3

src/storage/node-queries.ts [1-455]
  interface:
    140-165: interface ListNodesFilters [exported]
      /** Filters for querying nodes */
      refs in: 13 [import: 3, type: 10]
        - src/api/routes/nodes.ts:17: import (module)
        - src/api/routes/nodes.ts:90: type filters
        - src/api/routes/nodes.ts:92: type filters
        - src/api/routes/nodes.ts:93: type filters
        - src/api/routes/search.ts:7: import (module)
        - src/api/routes/search.ts:71: type filters
        - src/api/routes/search.ts:73: type filters
        - src/api/routes/search.ts:74: type filters
        - src/daemon/query-processor.ts:20: import (module)
        - src/daemon/query-processor.ts:222: type filters
    168-177: interface ListNodesOptions [exported]
      /** Pagination and sorting options */
      refs in: 5 [import: 1, type: 4]
        - src/api/routes/nodes.ts:18: import (module)
        - src/api/routes/nodes.ts:103: type options
        - src/api/routes/nodes.ts:106: type options
        - src/api/routes/nodes.ts:107: type options
        - src/storage/node-queries.ts:222: type listNodes
    180-189: interface ListNodesResult [exported]
      /** Result from listNodes query */
      refs in: 1 [type: 1]
        - src/storage/node-queries.ts:223: type listNodes
    353-365: interface SessionSummaryRow [exported]
      /** Session summary row from aggregation query */
      refs in: 2 [type: 2]
        - src/storage/node-queries.ts:375: type getSessionSummaries
        - src/storage/node-queries.ts:399: type getSessionSummaries
  type:
    108-116: NodeSortField = | "timestamp"
  | "analyzed_at"
  | "project"
  | "type"
  | "outcome"
  | "tokens_used"
  | "cost"
  | "duration_minutes" [exported]
      /** Valid sort fields for listNodes */
      refs in: 5 [type: 5]
        - src/storage/node-queries.ts:174: type ListNodesOptions
        - src/storage/node-queries.ts:192: type ALLOWED_SORT_FIELDS
        - src/storage/node-queries.ts:229: type sort
        - src/storage/node-queries.ts:230: type sort
        - src/storage/node-queries.ts:232: type sort
    119-119: SortOrder = "asc" | "desc" [exported]
      /** Sort order */
      refs in: 2 [type: 2]
        - src/storage/node-queries.ts:176: type ListNodesOptions
        - src/storage/node-queries.ts:234: type order
    122-134: NodeTypeFilter = | "coding"
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
      refs in: 1 [type: 1]
        - src/storage/node-queries.ts:146: type ListNodesFilters
    137-137: OutcomeFilter = "success" | "partial" | "failed" | "abandoned" [exported]
      /** Outcome filter values */
      refs in: 1 [type: 1]
        - src/storage/node-queries.ts:148: type ListNodesFilters
  function:
    21-28: getNodeSummary(db: Database.Database, nodeId: string): string [exported]
      /** Get node summary from FTS index */
      refs in: 2 [call: 1, import: 1]
        - src/daemon/connection-discovery.ts:15: import (module)
        - src/daemon/connection-discovery.ts:219: call ConnectionDiscoverer.sourceSummary
    33-37: getNodeTags(db: Database.Database, nodeId: string): {} [exported]
      /** Get tags for a node */
      refs in: 8 [call: 6, import: 2]
        - src/api/routes/nodes.ts:14: import (module)
        - src/api/routes/nodes.ts:172: call nodesRoutes
        - src/storage/index.test.ts:49: import (module)
        - src/storage/index.test.ts:321: call tags
        - src/storage/index.test.ts:705: call tags
        - src/storage/index.test.ts:798: call (module)
        - src/storage/index.test.ts:837: call tags
        - src/storage/index.test.ts:2138: call tags
    42-46: getNodeTopics(db: Database.Database, nodeId: string): {} [exported]
      /** Get topics for a node */
      refs in: 6 [call: 4, import: 2]
        - src/api/routes/nodes.ts:15: import (module)
        - src/api/routes/nodes.ts:176: call nodesRoutes
        - src/storage/index.test.ts:50: import (module)
        - src/storage/index.test.ts:337: call topics
        - src/storage/index.test.ts:711: call topics
        - src/storage/index.test.ts:799: call (module)
    51-61: getAllTags(db: Database.Database): {} [exported]
      /** Get all unique tags in the system */
      refs in: 2 [call: 1, import: 1]
        - src/storage/index.test.ts:32: import (module)
        - src/storage/index.test.ts:954: call allTags
    66-70: getAllTopics(db: Database.Database): {} [exported]
      /** Get all unique topics in the system */
      refs in: 2 [call: 1, import: 1]
        - src/storage/index.test.ts:33: import (module)
        - src/storage/index.test.ts:974: call allTopics
    75-85: getNodesByTag(db: Database.Database, tag: string): {} [exported]
      /** Find nodes by tag (matches both node tags and lesson tags) */
      refs in: 2 [call: 1, import: 1]
        - src/storage/index.test.ts:47: import (module)
        - src/storage/index.test.ts:1030: call results
    90-101: getNodesByTopic(db: Database.Database, topic: string): {} [exported]
      /** Find nodes by topic */
      refs in: 2 [call: 1, import: 1]
        - src/storage/index.test.ts:48: import (module)
        - src/storage/index.test.ts:1048: call results
    219-344: listNodes(db: Database.Database, filters: ListNodesFilters = {}, options: ListNodesOptions = {}): ListNodesResult [exported]
      /** List nodes with filters, pagination, and sorting. Supports filtering by: - project (partial match via LIKE) - type (exact match) - outcome (exact match) - date range (from/to on timestamp field) - computer (exact match) - hadClearGoal (boolean) - isNewProject (boolean) - tags (AND logic - nodes must have ALL specified tags) - topics (AND logic - nodes must have ALL specified topics) Per specs/api.md GET /api/v1/nodes endpoint. */
      refs in: 49 [call: 42, import: 7]
        - src/api/routes/nodes.ts:16: import (module)
        - src/api/routes/nodes.ts:110: call result
        - src/api/routes/sessions.ts:13: import (module)
        - src/api/routes/sessions.ts:71: call result
        - src/api/routes/sessions.ts:142: call checkResult
        - src/api/routes/sessions.ts:234: call result
        - src/api/routes/stats.ts:11: import (module)
        - src/api/routes/stats.ts:91: call recentNodes
        - src/daemon/graph-export.ts:13: import (module)
        - src/daemon/graph-export.ts:37: call nodesResult
    371-400: getSessionSummaries(db: Database.Database, project: string, options: { limit?: number; offset?: number } = {}): {} [exported]
      /** Get aggregated session summaries for a project. Used for the session browser to avoid loading thousands of nodes. */
      refs in: 3 [call: 2, import: 1]
        - src/api/routes/sessions.ts:12: import (module)
        - src/api/routes/sessions.ts:79: call sessionSummaries
        - src/api/routes/sessions.ts:162: call allSummaries
    409-417: getAllProjects(db: Database.Database): {} [exported]
      /** Get all unique projects in the system */
      refs in: 7 [call: 4, import: 3]
        - src/api/routes/sessions.ts:11: import (module)
        - src/api/routes/sessions.ts:66: call projects
        - src/api/routes/stats.ts:10: import (module)
        - src/api/routes/stats.ts:49: call allProjects
        - src/storage/index.test.ts:31: import (module)
        - src/storage/index.test.ts:2878: call projects
        - src/storage/index.test.ts:2884: call projects
    422-430: getAllNodeTypes(db: Database.Database): {} [exported]
      /** Get all unique node types that have been used */
      refs in: 2 [call: 1, import: 1]
        - src/storage/index.test.ts:29: import (module)
        - src/storage/index.test.ts:2903: call types
    435-443: getAllComputers(db: Database.Database): {} [exported]
      /** Get all unique computers (source machines) */
      refs in: 2 [call: 1, import: 1]
        - src/storage/index.test.ts:28: import (module)
        - src/storage/index.test.ts:2920: call computers
    448-454: countNodes(db: Database.Database, filters: ListNodesFilters = {}): number [exported]
      /** Count nodes matching filters (without fetching data) */
      refs in: 18 [call: 16, import: 2]
        - src/api/routes/stats.ts:9: import (module)
        - src/api/routes/stats.ts:25: call totalNodes
        - src/api/routes/stats.ts:31: call nodesThisWeek
        - src/api/routes/stats.ts:38: call nodesToday
        - src/api/routes/stats.ts:43: call successCount
        - src/api/routes/stats.ts:44: call partialCount
        - src/api/routes/stats.ts:45: call failedCount
        - src/api/routes/stats.ts:46: call abandonedCount
        - src/api/routes/stats.ts:54: call projectCounts
        - src/api/routes/stats.ts:59: call vagueThisWeek
  imports:
    - ./node-crud.js
    - better-sqlite3

src/storage/node-storage.test.ts [1-849]
  imports:
    - ./node-storage.js
    - ./node-types.js
    - node:fs
    - node:os
    - node:path
    - vitest

src/storage/node-storage.ts [1-292]
  interface:
    24-27: interface NodeStorageOptions [exported]
      refs in: 10 [extends: 1, import: 1, type: 8]
        - src/storage/node-crud.ts:17: import (module)
        - src/storage/node-crud.ts:39: extends RepositoryOptions
        - src/storage/node-storage.ts:62: type writeNode
        - src/storage/node-storage.ts:91: type readNode
        - src/storage/node-storage.ts:123: type nodeExists
        - src/storage/node-storage.ts:134: type listNodeFiles
        - src/storage/node-storage.ts:183: type listNodeVersions
        - src/storage/node-storage.ts:209: type getLatestNodeVersion
        - src/storage/node-storage.ts:224: type readLatestNode
        - src/storage/node-storage.ts:270: type createNodeVersion
  function:
    33-41: getNodeDir(timestamp: string, nodesDir = DEFAULT_NODES_DIR): string [exported]
      /** Get the directory path for a node based on its timestamp Returns: nodesDir/YYYY/MM */
      refs in: 6 [call: 5, import: 1]
        - src/storage/node-storage.test.ts:13: import (module)
        - src/storage/node-storage.test.ts:113: call dir
        - src/storage/node-storage.test.ts:123: call dir
        - src/storage/node-storage.test.ts:133: call dir
        - src/storage/node-storage.test.ts:203: call expectedDir
        - src/storage/node-storage.ts:53: call dir
    47-55: getNodePath(nodeId: string, version: number, timestamp: string, nodesDir = DEFAULT_NODES_DIR): string [exported]
      /** Get the full file path for a node Returns: nodesDir/YYYY/MM/<nodeId>-v<version>.json */
      refs in: 6 [call: 5, import: 1]
        - src/storage/node-storage.test.ts:14: import (module)
        - src/storage/node-storage.test.ts:145: call path
        - src/storage/node-storage.test.ts:162: call path
        - src/storage/node-storage.ts:65: call filePath
        - src/storage/node-storage.ts:94: call filePath
        - src/storage/node-storage.ts:126: call filePath
    60-82: writeNode(node: Node, options: NodeStorageOptions = {}): string [exported]
      /** Write a node to JSON file storage */
      refs in: 26 [call: 24, import: 2]
        - src/storage/node-crud.ts:16: import (module)
        - src/storage/node-crud.ts:305: call dataFile
        - src/storage/node-crud.ts:332: call dataFile
        - src/storage/node-crud.ts:451: call dataFile
        - src/storage/node-storage.test.ts:22: import (module)
        - src/storage/node-storage.test.ts:182: call path
        - src/storage/node-storage.test.ts:207: call (module)
        - src/storage/node-storage.test.ts:234: call path
        - src/storage/node-storage.test.ts:255: call (module)
        - src/storage/node-storage.test.ts:337: call (module)
    87-102: readNode(nodeId: string, version: number, timestamp: string, options: NodeStorageOptions = {}): Node [exported]
      /** Read a node from JSON file storage */
      refs in: 3 [call: 2, import: 1]
        - src/storage/node-storage.test.ts:20: import (module)
        - src/storage/node-storage.test.ts:186: call readBack
        - src/storage/node-storage.test.ts:219: call (module)
    107-114: readNodeFromPath(filePath: string): Node [exported]
      /** Read a node by file path */
      refs in: 24 [call: 13, import: 11]
        - src/api/routes/nodes.ts:20: import (module)
        - src/api/routes/nodes.ts:152: call node
        - src/daemon/cli.ts:38: import (module)
        - src/daemon/cli.ts:1063: call node
        - src/daemon/cli.ts:1088: call node
        - src/daemon/export.ts:12: import (module)
        - src/daemon/export.ts:65: call node
        - src/daemon/facet-discovery.ts:39: import (module)
        - src/daemon/facet-discovery.ts:875: call FacetDiscovery.fullNode
        - src/daemon/insight-aggregation.ts:20: import (module)
    119-128: nodeExists(nodeId: string, version: number, timestamp: string, options: NodeStorageOptions = {}): boolean [exported]
      /** Check if a node file exists */
      refs in: 3 [call: 2, import: 1]
        - src/storage/node-storage.test.ts:17: import (module)
        - src/storage/node-storage.test.ts:258: call (module)
        - src/storage/node-storage.test.ts:271: call (module)
    134-175: listNodeFiles(options: NodeStorageOptions = {}): {} [exported]
      /** List all node files in the storage directory Returns array of file paths */
      refs in: 9 [call: 6, import: 3]
        - src/daemon/cli.ts:36: import (module)
        - src/daemon/cli.ts:1028: call files
        - src/daemon/export.ts:12: import (module)
        - src/daemon/export.ts:57: call files
        - src/storage/node-storage.test.ts:15: import (module)
        - src/storage/node-storage.test.ts:285: call files
        - src/storage/node-storage.test.ts:295: call files
        - src/storage/node-storage.test.ts:341: call files
        - src/storage/node-storage.ts:185: call allFiles
    181-202: listNodeVersions(nodeId: string, options: NodeStorageOptions = {}): {} [exported]
      /** List all versions of a specific node Returns array of { version, path } sorted by version ascending */
      refs in: 7 [call: 5, import: 2]
        - src/storage/node-crud.ts:14: import (module)
        - src/storage/node-crud.ts:572: call versions
        - src/storage/node-storage.test.ts:16: import (module)
        - src/storage/node-storage.test.ts:356: call versions
        - src/storage/node-storage.test.ts:420: call versions
        - src/storage/node-storage.test.ts:714: call versions
        - src/storage/node-storage.ts:211: call versions
    207-217: getLatestNodeVersion(nodeId: string, options: NodeStorageOptions = {}): { version: number; path: string; } [exported]
      /** Get the latest version of a node */
      refs in: 4 [call: 3, import: 1]
        - src/storage/node-storage.test.ts:12: import (module)
        - src/storage/node-storage.test.ts:436: call latest
        - src/storage/node-storage.test.ts:495: call latest
        - src/storage/node-storage.ts:226: call latest
    222-231: readLatestNode(nodeId: string, options: NodeStorageOptions = {}): any [exported]
      /** Read the latest version of a node */
      refs in: 3 [call: 2, import: 1]
        - src/storage/node-storage.test.ts:19: import (module)
        - src/storage/node-storage.test.ts:509: call node
        - src/storage/node-storage.test.ts:570: call latest
    236-261: parseNodePath(filePath: string): { nodeId: string; version: number; year: string; month: string; } [exported]
      /** Parse a node file path to extract node ID, version, year, and month */
      refs in: 9 [call: 7, import: 2]
        - src/daemon/cli.ts:37: import (module)
        - src/daemon/cli.ts:1036: call parsed
        - src/storage/node-storage.test.ts:18: import (module)
        - src/storage/node-storage.test.ts:584: call result
        - src/storage/node-storage.test.ts:596: call result
        - src/storage/node-storage.test.ts:608: call result
        - src/storage/node-storage.test.ts:614: call result
        - src/storage/node-storage.test.ts:620: call result
        - src/storage/node-storage.test.ts:626: call result
    267-291: createNodeVersion(existingNode: Node, updates: Partial<Node>, options: NodeStorageOptions = {}): Node [exported]
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

src/storage/node-types.ts [1-129]
  function:
    25-27: generateNodeId(): string [exported]
      /** Generate a unique 16-character hex node ID Uses first 16 chars of UUID (64 bits of entropy) */
      refs in: 9 [call: 7, import: 2]
        - src/storage/index.test.ts:73: import (module)
        - src/storage/index.test.ts:90: call id
        - src/storage/node-storage.test.ts:29: import (module)
        - src/storage/node-storage.test.ts:37: call id
        - src/storage/node-storage.test.ts:368: call nodeId
        - src/storage/node-storage.test.ts:448: call nodeId
        - src/storage/node-storage.test.ts:519: call nodeId
        - src/storage/node-storage.test.ts:747: call id
        - src/storage/node-storage.test.ts:754: call (module)
    29-31: generateLessonId(): string [exported]
      refs in: 2 [call: 1, import: 1]
        - src/storage/node-crud.ts:22: import (module)
        - src/storage/node-crud.ts:92: call lessonId
    33-35: generateQuirkId(): string [exported]
      refs in: 2 [call: 1, import: 1]
        - src/storage/node-crud.ts:23: import (module)
        - src/storage/node-crud.ts:124: call insertModelQuirks
    37-39: generateErrorId(): string [exported]
      refs in: 2 [call: 1, import: 1]
        - src/storage/node-crud.ts:21: import (module)
        - src/storage/node-crud.ts:149: call insertToolErrors
    41-43: generateDecisionId(): string [exported]
      refs in: 2 [call: 1, import: 1]
        - src/storage/node-crud.ts:20: import (module)
        - src/storage/node-crud.ts:174: call insertDaemonDecisions
    59-69: generateDeterministicNodeId(sessionFile: string, segmentStart: string, segmentEnd: string): string [exported]
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
    74-76: nodeRef(nodeId: string, version: number): string [exported]
      /** Create a full node reference with version */
    81-90: parseNodeRef(ref: string): { nodeId: string; version: number; } [exported]
      /** Parse a node reference into id and version */
    95-105: emptyLessons(): LessonsByLevel [exported]
      /** Create an empty lessons structure */
      refs in: 19 [call: 17, import: 2]
        - src/storage/index.test.ts:71: import (module)
        - src/storage/index.test.ts:128: call createTestNode
        - src/storage/index.test.ts:346: call node
        - src/storage/index.test.ts:719: call node
        - src/storage/index.test.ts:738: call updatedNode
        - src/storage/index.test.ts:778: call node
        - src/storage/index.test.ts:923: call node1
        - src/storage/index.test.ts:938: call node2
        - src/storage/index.test.ts:984: call node
        - src/storage/index.test.ts:1010: call node2
    110-118: emptyObservations(): ModelObservations [exported]
      /** Create an empty observations structure */
      refs in: 23 [call: 21, import: 2]
        - src/storage/index.test.ts:72: import (module)
        - src/storage/index.test.ts:140: call createTestNode
        - src/storage/index.test.ts:378: call node
        - src/storage/index.test.ts:401: call node
        - src/storage/index.test.ts:3553: call node1
        - src/storage/index.test.ts:3580: call node2
        - src/storage/index.test.ts:3628: call node
        - src/storage/index.test.ts:3670: call node1
        - src/storage/index.test.ts:3693: call node2
        - src/storage/index.test.ts:3722: call node
    123-128: emptyDaemonMeta(): DaemonMeta [exported]
      /** Create an empty daemon meta structure */
      refs in: 4 [call: 2, import: 2]
        - src/storage/index.test.ts:70: import (module)
        - src/storage/index.test.ts:163: call createTestNode
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

src/storage/pattern-repository.ts [1-369]
  interface:
    74-78: interface ListFailurePatternsOptions [exported]
      refs in: 1 [type: 1]
        - src/storage/pattern-repository.ts:82: type listFailurePatterns
    142-146: interface ListLessonPatternsOptions [exported]
      refs in: 1 [type: 1]
        - src/storage/pattern-repository.ts:150: type listLessonPatterns
    188-197: interface ListInsightsOptions [exported]
      refs in: 1 [type: 1]
        - src/storage/pattern-repository.ts:201: type listInsights
  function:
    80-111: listFailurePatterns(db: Database.Database, options: ListFailurePatternsOptions = {}): {} [exported]
      refs in: 5 [call: 3, import: 2]
        - src/api/routes/patterns.ts:13: import (module)
        - src/api/routes/patterns.ts:61: call result
        - src/storage/pattern-repository.test.ts:8: import (module)
        - src/storage/pattern-repository.test.ts:28: call patterns
        - src/storage/pattern-repository.test.ts:35: call rarePatterns
    117-136: listModelStats(db: Database.Database): {} [exported]
      refs in: 4 [call: 2, import: 2]
        - src/api/routes/patterns.ts:15: import (module)
        - src/api/routes/patterns.ts:83: call result
        - src/storage/pattern-repository.test.ts:11: import (module)
        - src/storage/pattern-repository.test.ts:52: call stats
    148-182: listLessonPatterns(db: Database.Database, options: ListLessonPatternsOptions = {}): {} [exported]
      refs in: 5 [call: 3, import: 2]
        - src/api/routes/patterns.ts:14: import (module)
        - src/api/routes/patterns.ts:108: call result
        - src/storage/pattern-repository.test.ts:10: import (module)
        - src/storage/pattern-repository.test.ts:71: call patterns
        - src/storage/pattern-repository.test.ts:76: call projectPatterns
    199-252: listInsights(db: Database.Database, options: ListInsightsOptions = {}): {} [exported]
      refs in: 21 [call: 16, import: 5]
        - src/api/routes/prompt-learning.ts:12: import (module)
        - src/api/routes/prompt-learning.ts:51: call insights
        - src/cli.ts:62: import (module)
        - src/cli.ts:640: call insights
        - src/cli.ts:783: call (module)
        - src/prompt/agents-generator.ts:21: import (module)
        - src/prompt/agents-generator.ts:143: call insights
        - src/prompt/agents-generator.ts:151: call generalToolErrors
        - src/prompt/prompt-generator.ts:15: import (module)
        - src/prompt/prompt-generator.ts:263: call insights
    254-268: getInsight(db: Database.Database, id: string): any [exported]
      refs in: 13 [call: 9, import: 4]
        - src/api/routes/prompt-learning.ts:13: import (module)
        - src/api/routes/prompt-learning.ts:146: call insight
        - src/cli.ts:61: import (module)
        - src/cli.ts:691: call insight
        - src/cli.ts:723: call insight
        - src/cli.ts:775: call insight
        - src/prompt/effectiveness.ts:24: import (module)
        - src/prompt/effectiveness.ts:409: call insight
        - src/prompt/effectiveness.ts:464: call insight
        - src/storage/pattern-repository.test.ts:6: import (module)
    270-294: getInsightsByModel(db: Database.Database, model: string, options: { minConfidence?: number; promptIncludedOnly?: boolean } = {}): {} [exported]
      refs in: 3 [call: 2, import: 1]
        - src/storage/pattern-repository.test.ts:7: import (module)
        - src/storage/pattern-repository.test.ts:179: call claudeInsights
        - src/storage/pattern-repository.test.ts:183: call highConfidence
    296-328: countInsights(db: Database.Database, options: { type?: InsightType; model?: string; promptIncluded?: boolean } = {}): number [exported]
      refs in: 5 [call: 4, import: 1]
        - src/storage/pattern-repository.test.ts:5: import (module)
        - src/storage/pattern-repository.test.ts:193: call (module)
        - src/storage/pattern-repository.test.ts:194: call (module)
        - src/storage/pattern-repository.test.ts:195: call (module)
        - src/storage/pattern-repository.test.ts:196: call (module)
    330-347: updateInsightPrompt(db: Database.Database, id: string, promptText: string, promptIncluded: boolean, promptVersion?: string): void [exported]
      refs in: 11 [call: 6, import: 5]
        - src/api/routes/prompt-learning.ts:14: import (module)
        - src/api/routes/prompt-learning.ts:153: call promptLearningRoutes
        - src/cli.ts:63: import (module)
        - src/cli.ts:697: call (module)
        - src/cli.ts:729: call (module)
        - src/prompt/effectiveness.ts:25: import (module)
        - src/prompt/effectiveness.ts:779: call autoDisableIneffectiveInsights
        - src/prompt/prompt-generator.ts:16: import (module)
        - src/prompt/prompt-generator.ts:329: call updateInsightPromptTexts
        - src/storage/pattern-repository.test.ts:12: import (module)
  imports:
    - ../types/index.js
    - better-sqlite3

src/storage/quirk-repository.ts [1-315]
  interface:
    22-31: interface ListQuirksFilters [exported]
      /** Filters for querying model quirks */
      refs in: 6 [import: 1, type: 5]
        - src/api/routes/quirks.ts:11: import (module)
        - src/api/routes/quirks.ts:50: type filters
        - src/api/routes/quirks.ts:52: type filters
        - src/api/routes/quirks.ts:53: type filters
        - src/storage/quirk-repository.ts:109: type listQuirks
        - src/storage/quirk-repository.ts:220: type countQuirks
    34-39: interface ListQuirksOptions [exported]
      /** Pagination options for quirks */
      refs in: 3 [import: 1, type: 2]
        - src/api/routes/quirks.ts:12: import (module)
        - src/api/routes/quirks.ts:57: type options
        - src/storage/quirk-repository.ts:110: type listQuirks
    42-51: interface QuirkResult [exported]
      /** A quirk result with metadata */
      refs in: 2 [type: 2]
        - src/storage/quirk-repository.ts:56: type ListQuirksResult
        - src/storage/quirk-repository.ts:164: type quirks
    54-63: interface ListQuirksResult [exported]
      /** Result from listQuirks query */
      refs in: 1 [type: 1]
        - src/storage/quirk-repository.ts:111: type listQuirks
    66-76: interface ModelQuirkStats [exported]
      /** Stats for a single model */
      refs in: 1 [type: 1]
        - src/storage/quirk-repository.ts:79: type QuirksByModelResult
  type:
    16-16: QuirkFrequency = "once" | "sometimes" | "often" | "always" [exported]
      /** Frequency values for model quirks */
      refs in: 1 [type: 1]
        - src/storage/quirk-repository.ts:26: type ListQuirksFilters
    19-19: QuirkSeverity = "low" | "medium" | "high" [exported]
      /** Severity values for model quirks (matches spec) */
      refs in: 1 [type: 1]
        - src/storage/quirk-repository.ts:28: type ListQuirksFilters
    79-79: QuirksByModelResult = Record<string, ModelQuirkStats> [exported]
      /** Result from getQuirksByModel */
      refs in: 2 [type: 2]
        - src/storage/quirk-repository.ts:178: type getQuirksByModel
        - src/storage/quirk-repository.ts:185: type result
  function:
    107-167: listQuirks(db: Database.Database, filters: ListQuirksFilters = {}, options: ListQuirksOptions = {}): ListQuirksResult [exported]
      /** List model quirks with filters and pagination. Supports filtering by: - model (exact match) - frequency (minimum frequency ranking) - project (partial match via nodes table) Per specs/api.md GET /api/v1/quirks endpoint. */
      refs in: 14 [call: 12, import: 2]
        - src/api/routes/quirks.ts:10: import (module)
        - src/api/routes/quirks.ts:62: call result
        - src/storage/index.test.ts:59: import (module)
        - src/storage/index.test.ts:3540: call result
        - src/storage/index.test.ts:3595: call all
        - src/storage/index.test.ts:3600: call glmQuirks
        - src/storage/index.test.ts:3604: call claudeQuirks
        - src/storage/index.test.ts:3612: call project1Quirks
        - src/storage/index.test.ts:3616: call sometimesOrMore
        - src/storage/index.test.ts:3619: call oftenOrMore
    175-213: getQuirksByModel(db: Database.Database, recentLimit = 5): Record<string, ModelQuirkStats> [exported]
      /** Get aggregated quirk stats by model. Returns counts and most recent quirks for each model that has quirks. Per specs/api.md GET /api/v1/stats/models endpoint (quirkCount field). */
      refs in: 4 [call: 2, import: 2]
        - src/api/routes/quirks.ts:9: import (module)
        - src/api/routes/quirks.ts:76: call result
        - src/storage/index.test.ts:52: import (module)
        - src/storage/index.test.ts:3707: call stats
    218-224: countQuirks(db: Database.Database, filters: ListQuirksFilters = {}): number [exported]
      /** Count quirks matching filters (without fetching data) */
      refs in: 4 [call: 3, import: 1]
        - src/storage/index.test.ts:60: import (module)
        - src/storage/index.test.ts:3743: call (module)
        - src/storage/index.test.ts:3744: call (module)
        - src/storage/index.test.ts:3745: call (module)
    229-236: getAllQuirkModels(db: Database.Database): {} [exported]
      /** Get all unique models that have quirks recorded */
      refs in: 2 [call: 1, import: 1]
        - src/storage/index.test.ts:35: import (module)
        - src/storage/index.test.ts:3779: call models
    244-286: getAggregatedQuirks(db: Database.Database, options: { minOccurrences?: number; limit?: number } = {}): {} [exported]
      /** Get aggregated quirks - similar observations grouped together. Useful for the dashboard "Model Quirks" panel. Per specs/storage.md "Find model quirks by frequency" query. */
      refs in: 7 [call: 4, import: 3]
        - src/api/routes/quirks.ts:8: import (module)
        - src/api/routes/quirks.ts:100: call result
        - src/daemon/query-processor.ts:21: import (module)
        - src/daemon/query-processor.ts:337: call quirks
        - src/storage/index.test.ts:34: import (module)
        - src/storage/index.test.ts:3827: call aggregated
        - src/storage/index.test.ts:3837: call all
    291-314: getNodeQuirks(db: Database.Database, nodeId: string): {} [exported]
      /** Get model quirks for a node */
      refs in: 4 [call: 2, import: 2]
        - src/api/routes/nodes.ts:21: import (module)
        - src/api/routes/nodes.ts:164: call nodesRoutes
        - src/storage/index.test.ts:46: import (module)
        - src/storage/index.test.ts:392: call quirks
  imports:
    - better-sqlite3

src/storage/search-highlight.test.ts [1-39]
  imports:
    - ./search-repository.js
    - vitest

src/storage/search-repository.ts [1-549]
  interface:
    36-41: interface SearchHighlight [exported]
      /** Highlight match for search results */
      refs in: 5 [import: 1, type: 4]
        - src/storage/search-repository.ts:50: type SearchResult
        - src/storage/search-repository.ts:304: type findHighlights
        - src/storage/search-repository.ts:305: type highlights
        - src/storage/semantic-search.ts:15: import (module)
        - src/storage/semantic-search.ts:125: type highlights
    44-51: interface SearchResult [exported]
      /** Enhanced search result with score and highlights */
      refs in: 4 [extends: 1, import: 1, type: 2]
        - src/storage/search-repository.ts:92: type SearchNodesResult
        - src/storage/search-repository.ts:508: type results
        - src/storage/semantic-search.ts:16: import (module)
        - src/storage/semantic-search.ts:25: extends SemanticSearchResult
    54-75: interface SearchFilters [exported]
      /** Filters for search queries (subset of node filters relevant to search) */
      refs in: 5 [import: 1, type: 4]
        - src/storage/search-repository.ts:86: type SearchOptions
        - src/storage/search-repository.ts:361: type buildFilterClause
        - src/storage/semantic-search.ts:18: import (module)
        - src/storage/semantic-search.ts:36: type SemanticSearchOptions
        - src/storage/semantic-search.ts:198: type filters
    78-87: interface SearchOptions [exported]
      /** Options for enhanced search */
      refs in: 2 [type: 2]
        - src/storage/search-repository.ts:461: type searchNodesAdvanced
        - src/storage/search-repository.ts:526: type countSearchResults
    90-99: interface SearchNodesResult [exported]
      /** Result from enhanced search with pagination metadata */
      refs in: 1 [type: 1]
        - src/storage/search-repository.ts:462: type searchNodesAdvanced
  type:
    19-24: SearchField = | "summary"
  | "decisions"
  | "lessons"
  | "tags"
  | "topics" [exported]
      /** Fields that can be searched in the FTS index */
      refs in: 5 [type: 5]
        - src/storage/search-repository.ts:27: type ALL_SEARCH_FIELDS
        - src/storage/search-repository.ts:38: type SearchHighlight
        - src/storage/search-repository.ts:80: type SearchOptions
        - src/storage/search-repository.ts:195: type buildFieldQuery
        - src/storage/search-repository.ts:303: type findHighlights
  function:
    108-136: indexNodeForSearch(db: Database.Database, node: Node): void [exported]
      /** Index a node for full-text search */
      refs in: 6 [call: 4, import: 2]
        - src/storage/index.test.ts:55: import (module)
        - src/storage/index.test.ts:1498: call (module)
        - src/storage/node-crud.ts:32: import (module)
        - src/storage/node-crud.ts:290: call insertNodeToDb
        - src/storage/node-crud.ts:425: call upsertNode
        - src/storage/node-crud.ts:522: call updateNode
    146-172: searchNodes(db: Database.Database, query: string, limit = 20): {} [exported]
      /** Search nodes using full-text search Quotes the query to handle special characters like hyphens */
      refs in: 10 [call: 9, import: 1]
        - src/storage/index.test.ts:62: import (module)
        - src/storage/index.test.ts:434: call results
        - src/storage/index.test.ts:1062: call results
        - src/storage/index.test.ts:1084: call results
        - src/storage/index.test.ts:1434: call results
        - src/storage/index.test.ts:1457: call results
        - src/storage/index.test.ts:1477: call results
        - src/storage/index.test.ts:1500: call results
        - src/storage/index.test.ts:1505: call results
        - src/storage/index.test.ts:1510: call results
    226-293: extractSnippet(text: string, query: string, maxLength = 100): string [exported]
      /** Extract a highlight snippet from text containing a match */
      refs in: 5 [call: 4, import: 1]
        - src/storage/search-highlight.test.ts:3: import (module)
        - src/storage/search-highlight.test.ts:10: call snippet
        - src/storage/search-highlight.test.ts:21: call snippet
        - src/storage/search-highlight.test.ts:31: call snippet
        - src/storage/search-repository.ts:345: call findHighlights
    361-432: buildFilterClause(filters: SearchFilters | undefined): { clause: string; params: {}; } [exported]
      /** Build WHERE clause conditions and params from search filters */
      refs in: 4 [call: 3, import: 1]
        - src/storage/search-repository.ts:480: call { clause: filterClause, params }
        - src/storage/search-repository.ts:537: call { clause: filterClause, params }
        - src/storage/semantic-search.ts:17: import (module)
        - src/storage/semantic-search.ts:74: call { clause: filterClause, params: filterParams }
    458-518: searchNodesAdvanced(db: Database.Database, query: string, options: SearchOptions = {}): SearchNodesResult [exported]
      /** Enhanced search with scores, highlights, and filter support */
      refs in: 16 [call: 13, import: 3]
        - src/daemon/query-processor.test.ts:18: import (module)
        - src/daemon/query-processor.ts:22: import (module)
        - src/daemon/query-processor.ts:267: call searchResults
        - src/storage/index.test.ts:63: import (module)
        - src/storage/index.test.ts:1533: call { results, total }
        - src/storage/index.test.ts:1584: call summaryResults
        - src/storage/index.test.ts:1595: call decisionResults
        - src/storage/index.test.ts:1623: call page1
        - src/storage/index.test.ts:1633: call page2
        - src/storage/index.test.ts:1685: call results
    523-548: countSearchResults(db: Database.Database, query: string, options: Pick<SearchOptions, "fields" | "filters"> = {}): number [exported]
      /** Count total search results (without fetching data) */
      refs in: 5 [call: 4, import: 1]
        - src/storage/index.test.ts:19: import (module)
        - src/storage/index.test.ts:1798: call count
        - src/storage/index.test.ts:1832: call summaryCount
        - src/storage/index.test.ts:1837: call allFieldsCount
        - src/storage/index.test.ts:1842: call count
  imports:
    - ./node-crud.js
    - ./node-types.js
    - better-sqlite3

src/storage/semantic-search.test.ts [1-388]
  imports:
    - ./database.js
    - ./embedding-utils.js
    - ./semantic-search.js
    - better-sqlite3
    - vitest

src/storage/semantic-search.ts [1-212]
  interface:
    25-28: interface SemanticSearchResult extends SearchResult [exported]
      refs in: 2 [type: 2]
        - src/storage/semantic-search.ts:59: type semanticSearch
        - src/storage/semantic-search.ts:191: type findSimilarNodes
    30-39: interface SemanticSearchOptions [exported]
      refs in: 2 [type: 2]
        - src/storage/semantic-search.ts:58: type semanticSearch
        - src/storage/semantic-search.ts:190: type findSimilarNodes
  function:
    55-154: semanticSearch(db: Database.Database, queryEmbedding: number[], options: SemanticSearchOptions = {}): {} [exported]
      /** Perform semantic search using vector similarity. Finds nodes with embeddings close to the query embedding. */
      refs in: 17 [call: 14, import: 3]
        - src/daemon/query-processor.test.ts:19: import (module)
        - src/daemon/query-processor.ts:23: import (module)
        - src/daemon/query-processor.ts:239: call semanticResults
        - src/storage/semantic-search.test.ts:11: import (module)
        - src/storage/semantic-search.test.ts:49: call result
        - src/storage/semantic-search.test.ts:72: call result
        - src/storage/semantic-search.test.ts:104: call result
        - src/storage/semantic-search.test.ts:116: call (module)
        - src/storage/semantic-search.test.ts:132: call result
        - src/storage/semantic-search.test.ts:142: call result
    164-177: getNodeEmbeddingVector(db: Database.Database, nodeId: string): {} [exported]
      /** Get the embedding vector for a node from the database. Useful for finding "related nodes" (node-to-node similarity). */
      refs in: 5 [call: 4, import: 1]
        - src/storage/semantic-search.test.ts:13: import (module)
        - src/storage/semantic-search.test.ts:356: call result
        - src/storage/semantic-search.test.ts:367: call result
        - src/storage/semantic-search.test.ts:378: call (module)
        - src/storage/semantic-search.ts:192: call embedding
    187-211: findSimilarNodes(db: Database.Database, nodeId: string, options: SemanticSearchOptions = {}): {} [exported]
      /** Find nodes similar to a given node. Wraps semanticSearch using the node's own embedding. */
      refs in: 4 [call: 3, import: 1]
        - src/storage/semantic-search.test.ts:12: import (module)
        - src/storage/semantic-search.test.ts:266: call result
        - src/storage/semantic-search.test.ts:295: call result
        - src/storage/semantic-search.test.ts:342: call result
  imports:
    - ./database.js
    - ./embedding-utils.js
    - ./node-crud.js
    - ./search-repository.js
    - better-sqlite3

src/storage/sqlite-vec.test.ts [1-98]
  imports:
    - better-sqlite3
    - sqlite-vec
    - vitest

src/storage/tool-error-repository.ts [1-352]
  interface:
    16-25: interface ListToolErrorsFilters [exported]
      /** Filters for querying tool errors */
      refs in: 5 [import: 1, type: 4]
        - src/api/routes/tool-errors.ts:11: import (module)
        - src/api/routes/tool-errors.ts:50: type filters
        - src/storage/tool-error-repository.ts:114: type listToolErrors
        - src/storage/tool-error-repository.ts:178: type getAggregatedToolErrors
        - src/storage/tool-error-repository.ts:319: type countToolErrors
    28-33: interface ListToolErrorsOptions [exported]
      /** Pagination options for tool errors */
      refs in: 3 [import: 1, type: 2]
        - src/api/routes/tool-errors.ts:12: import (module)
        - src/api/routes/tool-errors.ts:57: type options
        - src/storage/tool-error-repository.ts:115: type listToolErrors
    36-45: interface ToolErrorResult [exported]
      /** A tool error result with metadata */
      refs in: 2 [type: 2]
        - src/storage/tool-error-repository.ts:50: type ListToolErrorsResult
        - src/storage/tool-error-repository.ts:167: type errors
    48-57: interface ListToolErrorsResult [exported]
      /** Result from listToolErrors query */
      refs in: 1 [type: 1]
        - src/storage/tool-error-repository.ts:116: type listToolErrors
    60-64: interface ToolStats [exported]
      /** Stats by tool from getToolErrorStats */
      refs in: 1 [type: 1]
        - src/storage/tool-error-repository.ts:81: type ToolErrorStatsResult
    67-70: interface ModelErrorStats [exported]
      /** Stats by model from getToolErrorStats */
      refs in: 1 [type: 1]
        - src/storage/tool-error-repository.ts:82: type ToolErrorStatsResult
    73-77: interface ToolErrorTrends [exported]
      /** Trend data from getToolErrorStats */
      refs in: 1 [type: 1]
        - src/storage/tool-error-repository.ts:83: type ToolErrorStatsResult
    80-84: interface ToolErrorStatsResult [exported]
      /** Result from getToolErrorStats */
      refs in: 1 [type: 1]
        - src/storage/tool-error-repository.ts:258: type getToolErrorStats
    87-94: interface AggregatedToolError [exported]
      /** Aggregated tool error result */
      refs in: 2 [type: 2]
        - src/storage/tool-error-repository.ts:180: type getAggregatedToolErrors
        - src/storage/tool-error-repository.ts:235: type result
    97-103: interface NodeToolError [exported]
      /** A single tool error for a node */
      refs in: 2 [type: 2]
        - src/storage/tool-error-repository.ts:343: type getNodeToolErrors
        - src/storage/tool-error-repository.ts:350: type getNodeToolErrors
  function:
    112-170: listToolErrors(db: Database.Database, filters: ListToolErrorsFilters = {}, options: ListToolErrorsOptions = {}): ListToolErrorsResult [exported]
      /** List individual tool errors with filters and pagination. */
      refs in: 8 [call: 6, import: 2]
        - src/api/routes/tool-errors.ts:8: import (module)
        - src/api/routes/tool-errors.ts:62: call result
        - src/storage/index.test.ts:82: import (module)
        - src/storage/index.test.ts:3917: call all
        - src/storage/index.test.ts:3922: call editErrors
        - src/storage/index.test.ts:3926: call modelAErrors
        - src/storage/index.test.ts:3930: call project1Errors
        - src/storage/tool-error-repository.ts:321: call result
    176-252: getAggregatedToolErrors(db: Database.Database, filters: ListToolErrorsFilters = {}, options: { limit?: number; offset?: number; groupByModel?: boolean } = {}): {} [exported]
      /** Get aggregated tool errors - grouped by tool and error type (and optionally model). Per specs/api.md GET /api/v1/tool-errors. */
      refs in: 6 [call: 3, import: 3]
        - src/api/routes/tool-errors.ts:9: import (module)
        - src/api/routes/tool-errors.ts:90: call result
        - src/daemon/query-processor.ts:24: import (module)
        - src/daemon/query-processor.ts:358: call errors
        - src/storage/index.test.ts:78: import (module)
        - src/storage/index.test.ts:3974: call aggregated
    258-312: getToolErrorStats(db: Database.Database): ToolErrorStatsResult [exported]
      /** Get tool error statistics for the dashboard. Per specs/api.md GET /api/v1/stats/tool-errors. */
      refs in: 6 [call: 3, import: 3]
        - src/api/routes/stats.ts:13: import (module)
        - src/api/routes/stats.ts:149: call stats
        - src/api/routes/tool-errors.ts:10: import (module)
        - src/api/routes/tool-errors.ts:115: call stats
        - src/storage/index.test.ts:81: import (module)
        - src/storage/index.test.ts:4019: call stats
    317-323: countToolErrors(db: Database.Database, filters: ListToolErrorsFilters = {}): number [exported]
      /** Count tool errors matching filters. */
      refs in: 4 [call: 3, import: 1]
        - src/storage/index.test.ts:77: import (module)
        - src/storage/index.test.ts:4051: call (module)
        - src/storage/index.test.ts:4052: call (module)
        - src/storage/index.test.ts:4053: call (module)
    328-335: getAllToolsWithErrors(db: Database.Database): {} [exported]
      /** Get all unique tools that have errors recorded */
      refs in: 2 [call: 1, import: 1]
        - src/storage/index.test.ts:79: import (module)
        - src/storage/index.test.ts:4080: call tools
    340-351: getNodeToolErrors(db: Database.Database, nodeId: string): {} [exported]
      /** Get tool errors for a node */
      refs in: 4 [call: 2, import: 2]
        - src/api/routes/nodes.ts:22: import (module)
        - src/api/routes/nodes.ts:168: call nodesRoutes
        - src/storage/index.test.ts:80: import (module)
        - src/storage/index.test.ts:415: call errors
  imports:
    - better-sqlite3

---
Files: 57
Estimated tokens: 42,797 (codebase: ~1,108,865)
