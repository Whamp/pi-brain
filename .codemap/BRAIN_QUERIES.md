# Project Overview

## Languages
- typescript: 38 files

## Statistics
- Total files: 38
- Total symbols: 279
  - function: 163
  - interface: 74
  - type: 17
  - variable: 16
  - class: 9

---

src/daemon/cli.test.ts [1-758]
  imports:
    - ../storage/database.js
    - ../storage/node-repository.js
    - ../storage/node-storage.js
    - ../storage/node-types.js
    - ../types/index.js
    - ./cli.js
    - ./queue.js
    - node:fs
    - node:os
    - node:path
    - vitest

src/daemon/cli.ts [1-1060]
  interface:
    75-81: interface DaemonStatus [exported]
      /** Daemon status info */
      refs in: 6 [import: 1, reexport: 1, type: 4]
        - src/daemon/cli.test.ts:36: import (module)
        - src/daemon/cli.test.ts:317: type status
        - src/daemon/cli.test.ts:335: type status
        - src/daemon/cli.ts:433: type getDaemonStatus
        - src/daemon/cli.ts:801: type formatDaemonStatus
        - src/daemon/index.ts:133: reexport (module)
    84-89: interface QueueStatus [exported]
      /** Queue status info */
      refs in: 6 [import: 1, reexport: 1, type: 4]
        - src/daemon/cli.test.ts:37: import (module)
        - src/daemon/cli.test.ts:353: type status
        - src/daemon/cli.test.ts:376: type status
        - src/daemon/cli.ts:454: type getQueueStatus
        - src/daemon/cli.ts:827: type formatQueueStatus
        - src/daemon/index.ts:134: reexport (module)
    92-97: interface HealthCheckResult [exported]
      /** Health check result */
      refs in: 9 [reexport: 1, type: 8]
        - src/daemon/cli.ts:103: type HealthStatus
        - src/daemon/cli.ts:550: type checkPiCli
        - src/daemon/cli.ts:592: type checkRequiredSkills
        - src/daemon/cli.ts:622: type checkOptionalSkills
        - src/daemon/cli.ts:652: type checkSessionsDir
        - src/daemon/cli.ts:707: type checkDatabaseAccess
        - src/daemon/cli.ts:740: type checkPromptFile
        - src/daemon/cli.ts:881: type getHealthIcon
        - src/daemon/index.ts:135: reexport (module)
    100-104: interface HealthStatus [exported]
      /** Overall health status */
      refs in: 7 [import: 1, reexport: 1, type: 5]
        - src/daemon/cli.test.ts:38: import (module)
        - src/daemon/cli.test.ts:416: type status
        - src/daemon/cli.test.ts:444: type status
        - src/daemon/cli.test.ts:466: type status
        - src/daemon/cli.ts:763: type runHealthChecks
        - src/daemon/cli.ts:892: type formatHealthStatus
        - src/daemon/index.ts:136: reexport (module)
    107-110: interface OutputOptions [exported]
      /** CLI output options */
      refs in: 4 [reexport: 1, type: 3]
        - src/daemon/cli.ts:802: type formatDaemonStatus
        - src/daemon/cli.ts:828: type formatQueueStatus
        - src/daemon/cli.ts:893: type formatHealthStatus
        - src/daemon/index.ts:137: reexport (module)
    237-240: interface StartOptions [exported]
      /** Start options */
      refs in: 2 [reexport: 1, type: 1]
        - src/daemon/cli.ts:251: type startDaemon
        - src/daemon/index.ts:138: reexport (module)
    243-246: interface StopOptions [exported]
      /** Stop options */
      refs in: 2 [reexport: 1, type: 1]
        - src/daemon/cli.ts:366: type stopDaemon
        - src/daemon/index.ts:139: reexport (module)
  function:
    119-130: readPidFile(): number [exported]
      /** Read the daemon PID from the PID file */
      refs in: 9 [call: 6, import: 2, reexport: 1]
        - src/api/routes/daemon.ts:13: import (module)
        - src/api/routes/daemon.ts:31: call pid
        - src/daemon/cli.test.ts:23: import (module)
        - src/daemon/cli.test.ts:65: call result
        - src/daemon/cli.test.ts:83: call originalPid
        - src/daemon/cli.test.ts:88: call (module)
        - src/daemon/cli.test.ts:92: call (module)
        - src/daemon/cli.ts:173: call pid
        - src/daemon/index.ts:116: reexport (module)
    135-141: writePidFile(pid: number): void [exported]
      /** Write the daemon PID to the PID file */
      refs in: 6 [call: 4, import: 1, reexport: 1]
        - src/daemon/cli.test.ts:24: import (module)
        - src/daemon/cli.test.ts:87: call (module)
        - src/daemon/cli.test.ts:97: call (module)
        - src/daemon/cli.ts:290: call startDaemon
        - src/daemon/cli.ts:340: call startDaemon
        - src/daemon/index.ts:117: reexport (module)
    146-154: removePidFile(): void [exported]
      /** Remove the PID file */
      refs in: 8 [call: 6, import: 1, reexport: 1]
        - src/daemon/cli.test.ts:25: import (module)
        - src/daemon/cli.test.ts:91: call (module)
        - src/daemon/cli.ts:183: call isDaemonRunning
        - src/daemon/cli.ts:349: call startDaemon
        - src/daemon/cli.ts:388: call stopDaemon
        - src/daemon/cli.ts:399: call stopDaemon
        - src/daemon/cli.ts:417: call stopDaemon
        - src/daemon/index.ts:118: reexport (module)
    159-167: isProcessRunning(pid: number): boolean [exported]
      /** Check if a process with the given PID is running */
      refs in: 7 [call: 5, import: 1, reexport: 1]
        - src/daemon/cli.test.ts:26: import (module)
        - src/daemon/cli.test.ts:105: call (module)
        - src/daemon/cli.test.ts:110: call (module)
        - src/daemon/cli.ts:178: call isDaemonRunning
        - src/daemon/cli.ts:348: call startDaemon
        - src/daemon/cli.ts:398: call stopDaemon
        - src/daemon/index.ts:119: reexport (module)
    172-185: isDaemonRunning(): { running: boolean; pid: number; } [exported]
      /** Check if the daemon is currently running */
      refs in: 9 [call: 6, import: 2, reexport: 1]
        - src/api/routes/daemon.ts:11: import (module)
        - src/api/routes/daemon.ts:30: call running
        - src/daemon/cli.test.ts:27: import (module)
        - src/daemon/cli.test.ts:116: call status
        - src/daemon/cli.ts:259: call status
        - src/daemon/cli.ts:372: call status
        - src/daemon/cli.ts:434: call { running, pid }
        - src/daemon/cli.ts:938: call { running }
        - src/daemon/index.ts:120: reexport (module)
    194-215: formatUptime(seconds: number): string [exported]
      /** Format uptime in a human-readable way */
      refs in: 9 [call: 7, import: 1, reexport: 1]
        - src/daemon/cli.test.ts:28: import (module)
        - src/daemon/cli.test.ts:130: call (module)
        - src/daemon/cli.test.ts:134: call (module)
        - src/daemon/cli.test.ts:138: call (module)
        - src/daemon/cli.test.ts:142: call (module)
        - src/daemon/cli.test.ts:146: call (module)
        - src/daemon/cli.test.ts:150: call (module)
        - src/daemon/cli.ts:436: call uptimeFormatted
        - src/daemon/index.ts:121: reexport (module)
    220-230: getProcessUptime(): number [exported]
      /** Get process uptime (approximate based on PID file modification time) */
      refs in: 4 [call: 2, import: 1, reexport: 1]
        - src/api/routes/daemon.ts:12: import (module)
        - src/api/routes/daemon.ts:32: call uptime
        - src/daemon/cli.ts:435: call uptime
        - src/daemon/index.ts:122: reexport (module)
    251-361: async startDaemon(options: StartOptions = {}): Promise<{ success: boolean; message: string; pid?: number; }> [exported]
      /** Start the daemon process */
      refs in: 3 [call: 1, import: 1, reexport: 1]
        - src/cli.ts:22: import (module)
        - src/cli.ts:208: call result
        - src/daemon/index.ts:123: reexport (module)
    366-428: async stopDaemon(options: StopOptions = {}): Promise<{ success: boolean; message: string; }> [exported]
      /** Stop the daemon process */
      refs in: 3 [call: 1, import: 1, reexport: 1]
        - src/cli.ts:23: import (module)
        - src/cli.ts:241: call result
        - src/daemon/index.ts:124: reexport (module)
    433-445: getDaemonStatus(configPath?: string): DaemonStatus [exported]
      /** Get daemon status information */
      refs in: 5 [call: 2, import: 2, reexport: 1]
        - src/cli.ts:24: import (module)
        - src/cli.ts:257: call status
        - src/daemon/cli.test.ts:29: import (module)
        - src/daemon/cli.test.ts:156: call status
        - src/daemon/index.ts:125: reexport (module)
    454-483: getQueueStatus(configPath?: string): QueueStatus [exported]
      /** Get queue status information */
      refs in: 6 [call: 3, import: 2, reexport: 1]
        - src/cli.ts:25: import (module)
        - src/cli.ts:273: call queueStatus
        - src/daemon/cli.test.ts:30: import (module)
        - src/daemon/cli.test.ts:201: call status
        - src/daemon/cli.test.ts:233: call status
        - src/daemon/index.ts:126: reexport (module)
    488-541: queueAnalysis(sessionPath: string, configPath?: string): { success: boolean; message: string; jobId?: string; } [exported]
      /** Queue a session for analysis */
      refs in: 9 [call: 6, import: 2, reexport: 1]
        - src/cli.ts:26: import (module)
        - src/cli.ts:291: call result
        - src/daemon/cli.test.ts:31: import (module)
        - src/daemon/cli.test.ts:279: call result
        - src/daemon/cli.test.ts:289: call result
        - src/daemon/cli.test.ts:296: call result
        - src/daemon/cli.test.ts:305: call (module)
        - src/daemon/cli.test.ts:308: call result
        - src/daemon/index.ts:127: reexport (module)
    761-791: async runHealthChecks(configPath?: string): Promise<HealthStatus> [exported]
      /** Run all health checks */
      refs in: 3 [call: 1, import: 1, reexport: 1]
        - src/cli.ts:27: import (module)
        - src/cli.ts:325: call status
        - src/daemon/index.ts:128: reexport (module)
    800-821: formatDaemonStatus(status: DaemonStatus, _options: OutputOptions = {}): string [exported]
      /** Format daemon status for display */
      refs in: 6 [call: 3, import: 2, reexport: 1]
        - src/cli.ts:28: import (module)
        - src/cli.ts:262: call (module)
        - src/daemon/cli.test.ts:32: import (module)
        - src/daemon/cli.test.ts:325: call output
        - src/daemon/cli.test.ts:343: call output
        - src/daemon/index.ts:129: reexport (module)
    826-876: formatQueueStatus(queueStatus: QueueStatus, _options: OutputOptions = {}): string [exported]
      /** Format queue status for display */
      refs in: 6 [call: 3, import: 2, reexport: 1]
        - src/cli.ts:29: import (module)
        - src/cli.ts:278: call (module)
        - src/daemon/cli.test.ts:33: import (module)
        - src/daemon/cli.test.ts:367: call output
        - src/daemon/cli.test.ts:402: call output
        - src/daemon/index.ts:130: reexport (module)
    891-914: formatHealthStatus(status: HealthStatus, _options: OutputOptions = {}): string [exported]
      /** Format health check results for display */
      refs in: 7 [call: 4, import: 2, reexport: 1]
        - src/cli.ts:30: import (module)
        - src/cli.ts:330: call (module)
        - src/daemon/cli.test.ts:34: import (module)
        - src/daemon/cli.test.ts:435: call output
        - src/daemon/cli.test.ts:458: call output
        - src/daemon/cli.test.ts:476: call output
        - src/daemon/index.ts:131: reexport (module)
    929-1049: rebuildIndex(configPath?: string): { success: boolean; message: string; count: number; } [exported]
      /** Rebuild the SQLite index from JSON files */
      refs in: 11 [call: 8, import: 2, reexport: 1]
        - src/cli.ts:31: import (module)
        - src/cli.ts:306: call result
        - src/daemon/cli.test.ts:35: import (module)
        - src/daemon/cli.test.ts:573: call result
        - src/daemon/cli.test.ts:586: call result
        - src/daemon/cli.test.ts:627: call result
        - src/daemon/cli.test.ts:668: call result
        - src/daemon/cli.test.ts:701: call (module)
        - src/daemon/cli.test.ts:720: call result
        - src/daemon/cli.test.ts:752: call result
  variable:
    69-69: any [exported]
      /** PID file location */
      refs in: 2 [import: 1, reexport: 1]
        - src/daemon/cli.test.ts:22: import (module)
        - src/daemon/index.ts:114: reexport (module)
    72-72: any [exported]
      /** Log file location */
      refs in: 1 [reexport: 1]
        - src/daemon/index.ts:115: reexport (module)
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

src/daemon/connection-discovery.test.ts [1-322]
  imports:
    - ../storage/node-repository.js
    - ./connection-discovery.js
    - better-sqlite3
    - vitest

src/daemon/connection-discovery.ts [1-549]
  class:
    146-548: class ConnectionDiscoverer [exported]
      refs in: 7 [import: 2, instantiate: 2, reexport: 1, type: 2]
        - src/daemon/connection-discovery.test.ts:5: import (module)
        - src/daemon/connection-discovery.test.ts:39: type discoverer
        - src/daemon/connection-discovery.test.ts:76: instantiate (module)
        - src/daemon/index.ts:159: reexport (module)
        - src/daemon/worker.ts:30: import (module)
        - src/daemon/worker.ts:130: type Worker.connectionDiscoverer
        - src/daemon/worker.ts:161: instantiate Worker.initialize
  interface:
    141-144: interface ConnectionResult [exported]
      refs in: 2 [reexport: 1, type: 1]
        - src/daemon/connection-discovery.ts:161: type ConnectionDiscoverer.discover
        - src/daemon/index.ts:160: reexport (module)
  imports:
    - ../storage/node-repository.js
    - ../types/index.js
    - better-sqlite3

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
        - src/daemon/worker.ts:35: import (module)
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
        - src/daemon/worker.ts:34: import (module)
        - src/daemon/worker.ts:418: call Worker.storedError
        - src/daemon/worker.ts:532: call handleJobError
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
        - src/daemon/worker.ts:36: import (module)
  imports:
    - ./queue.js

src/daemon/facet-discovery.test.ts [1-827]
  imports:
    - ../storage/database.js
    - ./facet-discovery.js
    - better-sqlite3
    - node:fs
    - node:os
    - node:path
    - vitest

src/daemon/facet-discovery.ts [1-1734]
  class:
    659-1705: class FacetDiscovery [exported]
      refs in: 11 [import: 2, instantiate: 5, reexport: 1, type: 3]
        - src/daemon/facet-discovery.test.ts:16: import (module)
        - src/daemon/facet-discovery.test.ts:300: type discovery
        - src/daemon/facet-discovery.test.ts:307: instantiate (module)
        - src/daemon/facet-discovery.test.ts:611: type discovery
        - src/daemon/facet-discovery.test.ts:618: instantiate (module)
        - src/daemon/facet-discovery.test.ts:661: type discovery
        - src/daemon/facet-discovery.test.ts:668: instantiate (module)
        - src/daemon/facet-discovery.test.ts:766: instantiate discoveryWithMore
        - src/daemon/index.ts:168: reexport (module)
        - src/daemon/scheduler.ts:24: import (module)
  interface:
    91-100: interface ClusterAnalysisConfig [exported]
      /** Configuration for LLM cluster analysis */
      refs in: 4 [reexport: 1, type: 3]
        - src/daemon/facet-discovery.ts:1221: type FacetDiscovery.analyzeClusters
        - src/daemon/facet-discovery.ts:1282: type FacetDiscovery.analyzeCluster
        - src/daemon/facet-discovery.ts:1429: type FacetDiscovery.invokeClusterAnalysisAgent
        - src/daemon/index.ts:174: reexport (module)
    105-113: interface ClusterAnalysisResult [exported]
      /** Result from analyzing a single cluster */
      refs in: 4 [reexport: 1, type: 3]
        - src/daemon/facet-discovery.ts:122: type ClusterAnalysisBatchResult
        - src/daemon/facet-discovery.ts:1244: type FacetDiscovery.results
        - src/daemon/facet-discovery.ts:1283: type FacetDiscovery.analyzeCluster
        - src/daemon/index.ts:175: reexport (module)
    118-123: interface ClusterAnalysisBatchResult [exported]
      /** Result from analyzing multiple clusters */
      refs in: 2 [reexport: 1, type: 1]
        - src/daemon/facet-discovery.ts:1223: type FacetDiscovery.analyzeClusters
        - src/daemon/index.ts:176: reexport (module)
    132-136: interface EmbeddingProvider [exported]
      /** Interface for embedding providers */
      refs in: 13 [reexport: 1, type: 12]
        - src/daemon/facet-discovery.ts:142: type isEmbeddingProvider
        - src/daemon/facet-discovery.ts:143: type isEmbeddingProvider
        - src/daemon/facet-discovery.ts:145: type isEmbeddingProvider
        - src/daemon/facet-discovery.ts:146: type isEmbeddingProvider
        - src/daemon/facet-discovery.ts:147: type isEmbeddingProvider
        - src/daemon/facet-discovery.ts:156: type createEmbeddingProvider
        - src/daemon/facet-discovery.ts:198: type createOllamaProvider
        - src/daemon/facet-discovery.ts:244: type createOpenAIProvider
        - src/daemon/facet-discovery.ts:286: type createOpenRouterProvider
        - src/daemon/facet-discovery.ts:323: type createMockEmbeddingProvider
    647-651: interface FacetDiscoveryLogger [exported]
      refs in: 4 [reexport: 1, type: 3]
        - src/daemon/facet-discovery.ts:653: type noopLogger
        - src/daemon/facet-discovery.ts:662: type FacetDiscovery.logger
        - src/daemon/facet-discovery.ts:668: type FacetDiscovery.constructor
        - src/daemon/index.ts:173: reexport (module)
  function:
    154-190: createEmbeddingProvider(config: EmbeddingConfig): EmbeddingProvider [exported]
      /** Create an embedding provider from config */
      refs in: 5 [call: 3, import: 1, reexport: 1]
        - src/daemon/facet-discovery.test.ts:14: import (module)
        - src/daemon/facet-discovery.test.ts:80: call (module)
        - src/daemon/facet-discovery.test.ts:89: call (module)
        - src/daemon/facet-discovery.ts:673: call FacetDiscovery.constructor
        - src/daemon/index.ts:169: reexport (module)
    323-346: createMockEmbeddingProvider(dims = 384): EmbeddingProvider [exported]
      /** Create mock embedding provider for testing only. Not exposed in EmbeddingConfig - use createMockEmbeddingProvider() directly in tests. */
      refs in: 9 [call: 8, import: 1]
        - src/daemon/facet-discovery.test.ts:15: import (module)
        - src/daemon/facet-discovery.test.ts:99: call provider
        - src/daemon/facet-discovery.test.ts:106: call provider
        - src/daemon/facet-discovery.test.ts:116: call provider
        - src/daemon/facet-discovery.test.ts:126: call provider
        - src/daemon/facet-discovery.test.ts:307: call (module)
        - src/daemon/facet-discovery.test.ts:618: call (module)
        - src/daemon/facet-discovery.test.ts:668: call (module)
        - src/daemon/facet-discovery.test.ts:768: call discoveryWithMore
    375-442: kMeansClustering(embeddings: number[][], k: number, maxIterations = 100): KMeansResult [exported]
      /** Simple K-means++ clustering implementation */
      refs in: 8 [call: 6, import: 1, reexport: 1]
        - src/daemon/facet-discovery.test.ts:18: import (module)
        - src/daemon/facet-discovery.test.ts:141: call result
        - src/daemon/facet-discovery.test.ts:151: call result
        - src/daemon/facet-discovery.test.ts:173: call result
        - src/daemon/facet-discovery.test.ts:193: call result
        - src/daemon/facet-discovery.test.ts:204: call result
        - src/daemon/facet-discovery.ts:906: call FacetDiscovery.result
        - src/daemon/index.ts:170: reexport (module)
    485-504: hdbscanClustering(embeddings: number[][], minClusterSize = 3, minSamples = 3): {} [exported]
      /** HDBSCAN-like density-based clustering (simplified) */
      refs in: 10 [call: 8, import: 1, reexport: 1]
        - src/daemon/facet-discovery.test.ts:17: import (module)
        - src/daemon/facet-discovery.test.ts:217: call labels
        - src/daemon/facet-discovery.test.ts:223: call labels
        - src/daemon/facet-discovery.test.ts:243: call labels
        - src/daemon/facet-discovery.test.ts:269: call labels
        - src/daemon/facet-discovery.test.ts:289: call labels6
        - src/daemon/facet-discovery.test.ts:584: call labels
        - src/daemon/facet-discovery.test.ts:600: call labels
        - src/daemon/facet-discovery.ts:910: call FacetDiscovery.clusterEmbeddings
        - src/daemon/index.ts:171: reexport (module)
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
      refs in: 1 [reexport: 1]
        - src/index.ts:29: reexport (module)
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
        - src/daemon/scheduler.ts:25: import (module)
        - src/daemon/scheduler.ts:141: type Scheduler.insightAggregator
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

src/daemon/pattern-aggregation.ts [1-326]
  class:
    22-325: class PatternAggregator [exported]
      refs in: 7 [import: 2, instantiate: 2, reexport: 1, type: 2]
        - src/daemon/index.ts:164: reexport (module)
        - src/daemon/pattern-aggregation.test.ts:4: import (module)
        - src/daemon/pattern-aggregation.test.ts:21: type aggregator
        - src/daemon/pattern-aggregation.test.ts:81: instantiate (module)
        - src/daemon/scheduler.ts:26: import (module)
        - src/daemon/scheduler.ts:140: type Scheduler.patternAggregator
        - src/daemon/scheduler.ts:149: instantiate Scheduler.constructor
  imports:
    - better-sqlite3
    - node:crypto

src/daemon/processor.test.ts [1-668]
  imports:
    - ./processor.js
    - ./queue.js
    - node:os
    - node:path
    - vitest

src/daemon/processor.ts [1-747]
  class:
    702-739: class JobProcessor [exported]
      /** Job processor that invokes pi agents for analysis */
      refs in: 5 [import: 1, instantiate: 1, reexport: 1, type: 2]
        - src/daemon/index.ts:56: reexport (module)
        - src/daemon/processor.ts:744: type createProcessor
        - src/daemon/processor.ts:745: instantiate createProcessor
        - src/daemon/worker.ts:41: import (module)
        - src/daemon/worker.ts:129: type Worker.processor
  interface:
    21-34: interface AgentResult [exported]
      /** Result from invoking the pi agent */
      refs in: 4 [reexport: 1, type: 3]
        - src/daemon/index.ts:71: reexport (module)
        - src/daemon/processor.ts:308: type invokeAgent
        - src/daemon/processor.ts:529: type parseAgentOutput
        - src/daemon/processor.ts:714: type JobProcessor.process
    37-116: interface AgentNodeOutput [exported]
      /** Output schema from the session analyzer (matches session-analyzer.md) */
      refs in: 12 [import: 3, reexport: 1, type: 8]
        - src/daemon/index.ts:72: reexport (module)
        - src/daemon/processor.test.ts:24: import (module)
        - src/daemon/processor.test.ts:47: type createValidNodeOutput
        - src/daemon/processor.ts:27: type AgentResult
        - src/daemon/processor.ts:604: type extractNodeFromText
        - src/daemon/processor.ts:609: type parsed
        - src/daemon/processor.ts:623: type parsed
        - src/daemon/processor.ts:639: type isValidNodeOutput
        - src/storage/node-repository.test.ts:11: import (module)
        - src/storage/node-repository.test.ts:165: type createTestAgentOutput
    128-132: interface SkillInfo [exported]
      /** Skill availability information */
      refs in: 3 [reexport: 1, type: 2]
        - src/daemon/index.ts:73: reexport (module)
        - src/daemon/processor.ts:183: type getSkillAvailability
        - src/daemon/processor.ts:184: type availability
    135-140: interface ProcessorLogger [exported]
      /** Logger interface for processor */
      refs in: 21 [import: 3, reexport: 1, type: 17]
        - src/daemon/index.ts:74: reexport (module)
        - src/daemon/processor.test.ts:25: import (module)
        - src/daemon/processor.test.ts:105: type silentLogger
        - src/daemon/processor.ts:143: type consoleLogger
        - src/daemon/processor.ts:307: type invokeAgent
        - src/daemon/processor.ts:437: type spawnPiProcess
        - src/daemon/processor.ts:528: type parseAgentOutput
        - src/daemon/processor.ts:603: type extractNodeFromText
        - src/daemon/processor.ts:696: type ProcessorConfig
        - src/daemon/processor.ts:704: type JobProcessor.logger
    692-697: interface ProcessorConfig [exported]
      /** Processor configuration */
      refs in: 3 [reexport: 1, type: 2]
        - src/daemon/index.ts:75: reexport (module)
        - src/daemon/processor.ts:706: type JobProcessor.constructor
        - src/daemon/processor.ts:744: type createProcessor
  function:
    170-178: async checkSkillAvailable(skillName: string): Promise<boolean> [exported]
      /** Check if a skill is available by looking for SKILL.md */
      refs in: 8 [call: 5, import: 2, reexport: 1]
        - src/daemon/cli.ts:39: import (module)
        - src/daemon/cli.ts:596: call available
        - src/daemon/cli.ts:626: call available
        - src/daemon/index.ts:65: reexport (module)
        - src/daemon/processor.test.ts:14: import (module)
        - src/daemon/processor.test.ts:549: call available
        - src/daemon/processor.test.ts:555: call available
        - src/daemon/processor.ts:189: call available
    183-199: async getSkillAvailability(): Promise<Map<string, SkillInfo>> [exported]
      /** Get availability information for all skills */
      refs in: 6 [call: 4, import: 1, reexport: 1]
        - src/daemon/index.ts:64: reexport (module)
        - src/daemon/processor.test.ts:18: import (module)
        - src/daemon/processor.test.ts:564: call availability
        - src/daemon/processor.test.ts:580: call availability
        - src/daemon/processor.ts:206: call skills
        - src/daemon/processor.ts:225: call skills
    205-218: async validateRequiredSkills(): Promise<void> [exported]
      /** Validate that all required skills are available Throws if any required skill is missing */
      refs in: 2 [call: 1, reexport: 1]
        - src/daemon/index.ts:66: reexport (module)
        - src/daemon/processor.ts:736: call JobProcessor.validateEnvironment
    224-230: async buildSkillsArg(): Promise<string> [exported]
      /** Build the skills argument for pi invocation Returns comma-separated list of available skills */
      refs in: 5 [call: 3, import: 1, reexport: 1]
        - src/daemon/index.ts:63: reexport (module)
        - src/daemon/processor.test.ts:13: import (module)
        - src/daemon/processor.test.ts:594: call skills
        - src/daemon/processor.test.ts:599: call skills
        - src/daemon/processor.ts:338: call skills
    239-271: buildAnalysisPrompt(job: AnalysisJob): string [exported]
      /** Build the analysis prompt for a job */
      refs in: 10 [call: 8, import: 1, reexport: 1]
        - src/daemon/index.ts:62: reexport (module)
        - src/daemon/processor.test.ts:12: import (module)
        - src/daemon/processor.test.ts:119: call prompt
        - src/daemon/processor.test.ts:131: call prompt
        - src/daemon/processor.test.ts:140: call prompt
        - src/daemon/processor.test.ts:149: call prompt
        - src/daemon/processor.test.ts:162: call prompt
        - src/daemon/processor.test.ts:175: call prompt
        - src/daemon/processor.test.ts:187: call prompt
        - src/daemon/processor.ts:350: call prompt
    304-420: async invokeAgent(job: AnalysisJob, config: DaemonConfig, logger: ProcessorLogger = consoleLogger): Promise<AgentResult> [exported]
      /** Invoke the pi agent to analyze a session */
      refs in: 2 [call: 1, reexport: 1]
        - src/daemon/index.ts:58: reexport (module)
        - src/daemon/processor.ts:719: call JobProcessor.result
    526-595: parseAgentOutput(stdout: string, logger: ProcessorLogger = consoleLogger): Omit<AgentResult, "exitCode" | "durationMs"> [exported]
      /** Parse the pi agent's JSON mode output */
      refs in: 12 [call: 10, import: 1, reexport: 1]
        - src/daemon/index.ts:59: reexport (module)
        - src/daemon/processor.test.ts:20: import (module)
        - src/daemon/processor.test.ts:395: call result
        - src/daemon/processor.test.ts:419: call result
        - src/daemon/processor.test.ts:427: call result
        - src/daemon/processor.test.ts:435: call result
        - src/daemon/processor.test.ts:446: call result
        - src/daemon/processor.test.ts:462: call result
        - src/daemon/processor.test.ts:486: call result
        - src/daemon/processor.test.ts:514: call result
    601-634: extractNodeFromText(text: string, logger: ProcessorLogger = consoleLogger): AgentNodeOutput [exported]
      /** Extract node JSON from text content Handles both raw JSON and code-fenced JSON */
      refs in: 10 [call: 8, import: 1, reexport: 1]
        - src/daemon/index.ts:60: reexport (module)
        - src/daemon/processor.test.ts:17: import (module)
        - src/daemon/processor.test.ts:304: call result
        - src/daemon/processor.test.ts:316: call result
        - src/daemon/processor.test.ts:325: call result
        - src/daemon/processor.test.ts:332: call result
        - src/daemon/processor.test.ts:341: call result
        - src/daemon/processor.test.ts:346: call result
        - src/daemon/processor.test.ts:363: call result
        - src/daemon/processor.ts:580: call nodeData
    639-685: isValidNodeOutput(obj: unknown): boolean [exported]
      /** Basic validation that output matches expected schema */
      refs in: 19 [call: 17, import: 1, reexport: 1]
        - src/daemon/index.ts:61: reexport (module)
        - src/daemon/processor.test.ts:19: import (module)
        - src/daemon/processor.test.ts:201: call (module)
        - src/daemon/processor.test.ts:205: call (module)
        - src/daemon/processor.test.ts:209: call (module)
        - src/daemon/processor.test.ts:210: call (module)
        - src/daemon/processor.test.ts:217: call (module)
        - src/daemon/processor.test.ts:224: call (module)
        - src/daemon/processor.test.ts:231: call (module)
        - src/daemon/processor.test.ts:238: call (module)
    744-746: createProcessor(config: ProcessorConfig): JobProcessor [exported]
      /** Create a job processor */
      refs in: 5 [call: 2, import: 2, reexport: 1]
        - src/daemon/index.ts:57: reexport (module)
        - src/daemon/processor.test.ts:16: import (module)
        - src/daemon/processor.test.ts:622: call processor
        - src/daemon/worker.ts:40: import (module)
        - src/daemon/worker.ts:157: call Worker.initialize
  variable:
    143-148: ProcessorLogger [exported]
      /** Default console logger */
      refs in: 4 [import: 3, reexport: 1]
        - src/daemon/index.ts:67: reexport (module)
        - src/daemon/processor.test.ts:15: import (module)
        - src/daemon/query-processor.ts:25: import (module)
        - src/daemon/worker.ts:39: import (module)
    155-155: readonly ["rlm"] [exported]
      /** Required skills for analysis - must be available */
      refs in: 3 [import: 2, reexport: 1]
        - src/daemon/cli.ts:40: import (module)
        - src/daemon/index.ts:68: reexport (module)
        - src/daemon/processor.test.ts:21: import (module)
    158-158: readonly ["codemap"] [exported]
      /** Optional skills - enhance analysis but not required */
      refs in: 3 [import: 2, reexport: 1]
        - src/daemon/cli.ts:41: import (module)
        - src/daemon/index.ts:69: reexport (module)
        - src/daemon/processor.test.ts:22: import (module)
    161-161: any [exported]
      /** Skills directory location */
      refs in: 2 [import: 1, reexport: 1]
        - src/daemon/index.ts:70: reexport (module)
        - src/daemon/processor.test.ts:23: import (module)
  imports:
    - ../config/types.js
    - ./queue.js
    - node:child_process
    - node:fs/promises
    - node:os
    - node:path

src/daemon/query-processor.test.ts [1-79]
  imports:
    - vitest

src/daemon/query-processor.ts [1-720]
  interface:
    32-45: interface QueryRequest [exported]
      /** Query request from the API */
      refs in: 3 [import: 1, type: 2]
        - src/api/routes/query.ts:14: import (module)
        - src/api/routes/query.ts:93: type queryRequest
        - src/daemon/query-processor.ts:106: type processQuery
    48-66: interface QueryResponse [exported]
      /** Query response to return to the client */
      refs in: 5 [import: 1, type: 4]
        - src/api/routes/query.ts:15: import (module)
        - src/api/routes/query.ts:100: type response
        - src/daemon/query-processor.ts:71: type AgentQueryResult
        - src/daemon/query-processor.ts:108: type processQuery
        - src/daemon/query-processor.ts:581: type ParseResult
    91-100: interface QueryProcessorConfig [exported]
      refs in: 2 [type: 2]
        - src/daemon/query-processor.ts:107: type processQuery
        - src/daemon/query-processor.ts:322: type invokeQueryAgent
  function:
    105-181: async processQuery(request: QueryRequest, config: QueryProcessorConfig): Promise<QueryResponse> [exported]
      /** Process a natural language query against the knowledge graph */
      refs in: 2 [call: 1, import: 1]
        - src/api/routes/query.ts:13: import (module)
        - src/api/routes/query.ts:100: call response
  imports:
    - ../config/types.js
    - ../storage/node-repository.js
    - ./processor.js
    - better-sqlite3
    - node:child_process
    - node:fs/promises
    - node:os
    - node:path

src/daemon/queue.test.ts [1-698]
  imports:
    - ../storage/database.js
    - ./queue.js
    - better-sqlite3
    - node:fs
    - node:os
    - node:path
    - vitest

src/daemon/queue.ts [1-733]
  class:
    151-688: class QueueManager [exported]
      /** Manages the analysis job queue Thread-safe queue operations backed by SQLite with optimistic locking. */
      refs in: 14 [import: 4, instantiate: 2, reexport: 1, type: 7]
        - src/daemon/index.ts:42: reexport (module)
        - src/daemon/queue.test.ts:14: import (module)
        - src/daemon/queue.test.ts:23: type queue
        - src/daemon/queue.ts:706: type createQueueManager
        - src/daemon/queue.ts:707: instantiate createQueueManager
        - src/daemon/queue.ts:720: instantiate queue
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
        - src/daemon/queue.ts:674: type QueueManager.parseRow
    53-88: interface AnalysisJob [exported]
      /** Analysis job structure */
      refs in: 47 [import: 7, reexport: 1, type: 39]
        - src/daemon/cli.ts:48: import (module)
        - src/daemon/cli.ts:86: type QueueStatus
        - src/daemon/cli.ts:87: type QueueStatus
        - src/daemon/cli.ts:88: type QueueStatus
        - src/daemon/index.ts:50: reexport (module)
        - src/daemon/processor.test.ts:9: import (module)
        - src/daemon/processor.test.ts:32: type createTestJob
        - src/daemon/processor.test.ts:32: type createTestJob
        - src/daemon/processor.ts:14: import (module)
        - src/daemon/processor.ts:239: type buildAnalysisPrompt
    102-115: interface QueueStats [exported]
      /** Queue statistics */
      refs in: 5 [import: 1, reexport: 1, type: 3]
        - src/daemon/cli.ts:47: import (module)
        - src/daemon/cli.ts:85: type QueueStatus
        - src/daemon/index.ts:51: reexport (module)
        - src/daemon/queue.ts:570: type QueueManager.getStats
        - src/daemon/queue.ts:715: type getQueueStatusSummary
  type:
    17-17: JobType = "initial" | "reanalysis" | "connection_discovery" [exported]
      /** Job type determines analysis behavior */
      refs in: 5 [import: 1, reexport: 1, type: 3]
        - src/daemon/index.ts:46: reexport (module)
        - src/daemon/processor.test.ts:9: import (module)
        - src/daemon/processor.test.ts:35: type createTestJob
        - src/daemon/queue.ts:57: type AnalysisJob
        - src/daemon/queue.ts:668: type QueueManager.parseRow
    20-20: JobStatus = "pending" | "running" | "completed" | "failed" [exported]
      /** Job status tracks progress through the queue */
      refs in: 8 [import: 1, reexport: 1, type: 6]
        - src/daemon/index.ts:47: reexport (module)
        - src/daemon/processor.test.ts:9: import (module)
        - src/daemon/processor.test.ts:39: type createTestJob
        - src/daemon/queue.ts:69: type AnalysisJob
        - src/daemon/queue.ts:610: type QueueManager.getJobCounts
        - src/daemon/queue.ts:621: type QueueManager.counts
        - src/daemon/queue.ts:630: type QueueManager.getJobCounts
        - src/daemon/queue.ts:676: type QueueManager.parseRow
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
    699-701: generateJobId(): string [exported]
      /** Generate a unique job ID Uses the same format as node IDs: 16-char hex string */
      refs in: 6 [call: 4, import: 1, reexport: 1]
        - src/daemon/index.ts:44: reexport (module)
        - src/daemon/queue.test.ts:16: import (module)
        - src/daemon/queue.test.ts:40: call id
        - src/daemon/queue.test.ts:47: call (module)
        - src/daemon/queue.ts:161: call QueueManager.id
        - src/daemon/queue.ts:206: call QueueManager.id
    706-708: createQueueManager(db: Database.Database): QueueManager [exported]
      /** Create a queue manager from a database */
      refs in: 13 [call: 6, import: 6, reexport: 1]
        - src/api/routes/daemon.ts:17: import (module)
        - src/api/routes/daemon.ts:133: call queue
        - src/daemon/cli.test.ts:40: import (module)
        - src/daemon/cli.test.ts:217: call queue
        - src/daemon/cli.ts:45: import (module)
        - src/daemon/cli.ts:514: call queue
        - src/daemon/index.ts:43: reexport (module)
        - src/daemon/queue.test.ts:15: import (module)
        - src/daemon/queue.test.ts:30: call (module)
        - src/daemon/worker.test.ts:15: import (module)
    714-732: getQueueStatusSummary(db: Database.Database): { stats: QueueStats; pendingJobs: {}; runningJobs: {}; recentFailed: {}; } [exported]
      /** Get aggregated queue status Used by CLI and API */
      refs in: 5 [call: 3, import: 2]
        - src/api/routes/daemon.ts:16: import (module)
        - src/api/routes/daemon.ts:35: call queueStatus
        - src/api/routes/daemon.ts:81: call status
        - src/daemon/cli.ts:44: import (module)
        - src/daemon/cli.ts:479: call getQueueStatus
  variable:
    23-34: PRIORITY [exported]
      /** Priority levels (lower = higher priority) */
      refs in: 6 [import: 5, reexport: 1]
        - src/api/routes/daemon.ts:18: import (module)
        - src/daemon/cli.test.ts:40: import (module)
        - src/daemon/cli.ts:46: import (module)
        - src/daemon/index.ts:45: reexport (module)
        - src/daemon/queue.test.ts:17: import (module)
        - src/daemon/worker.test.ts:15: import (module)
  imports:
    - better-sqlite3

src/daemon/scheduler.test.ts [1-718]
  imports:
    - ./queue.js
    - ./scheduler.js
    - better-sqlite3
    - vitest

src/daemon/scheduler.ts [1-797]
  class:
    130-731: class Scheduler [exported]
      /** Scheduler manages cron-based scheduled jobs */
      refs in: 25 [import: 1, instantiate: 21, reexport: 1, type: 2]
        - src/daemon/index.ts:144: reexport (module)
        - src/daemon/scheduler.test.ts:12: import (module)
        - src/daemon/scheduler.test.ts:139: type scheduler
        - src/daemon/scheduler.test.ts:153: instantiate (module)
        - src/daemon/scheduler.test.ts:244: instantiate (module)
        - src/daemon/scheduler.test.ts:266: instantiate (module)
        - src/daemon/scheduler.test.ts:285: instantiate (module)
        - src/daemon/scheduler.test.ts:301: instantiate (module)
        - src/daemon/scheduler.test.ts:321: instantiate (module)
        - src/daemon/scheduler.test.ts:349: instantiate (module)
  interface:
    49-56: interface ScheduledJobResult [exported]
      /** Result of a scheduled job execution */
      refs in: 18 [reexport: 1, type: 17]
        - src/daemon/index.ts:151: reexport (module)
        - src/daemon/scheduler.ts:123: type SchedulerStatus
        - src/daemon/scheduler.ts:136: type Scheduler.lastReanalysisResult
        - src/daemon/scheduler.ts:137: type Scheduler.lastConnectionDiscoveryResult
        - src/daemon/scheduler.ts:138: type Scheduler.lastPatternAggregationResult
        - src/daemon/scheduler.ts:139: type Scheduler.lastClusteringResult
        - src/daemon/scheduler.ts:358: type Scheduler.triggerReanalysis
        - src/daemon/scheduler.ts:365: type Scheduler.triggerConnectionDiscovery
        - src/daemon/scheduler.ts:372: type Scheduler.triggerPatternAggregation
        - src/daemon/scheduler.ts:379: type Scheduler.triggerClustering
    59-63: interface SchedulerLogger [exported]
      /** Logger interface for scheduler */
      refs in: 7 [import: 1, reexport: 1, type: 5]
        - src/daemon/index.ts:152: reexport (module)
        - src/daemon/scheduler.test.ts:19: import (module)
        - src/daemon/scheduler.test.ts:128: type createCapturingLogger
        - src/daemon/scheduler.ts:66: type noopLogger
        - src/daemon/scheduler.ts:73: type consoleLogger
        - src/daemon/scheduler.ts:147: type Scheduler.constructor
        - src/daemon/scheduler.ts:740: type createScheduler
    80-113: interface SchedulerConfig [exported]
      /** Scheduler configuration */
      refs in: 15 [import: 1, reexport: 1, type: 13]
        - src/daemon/index.ts:153: reexport (module)
        - src/daemon/scheduler.test.ts:18: import (module)
        - src/daemon/scheduler.test.ts:144: type defaultConfig
        - src/daemon/scheduler.test.ts:401: type badConfig
        - src/daemon/scheduler.test.ts:418: type badConfig
        - src/daemon/scheduler.test.ts:438: type config
        - src/daemon/scheduler.test.ts:451: type config
        - src/daemon/scheduler.test.ts:563: type config
        - src/daemon/scheduler.test.ts:584: type config
        - src/daemon/scheduler.test.ts:600: type config
    116-125: interface SchedulerStatus [exported]
      /** Scheduler state */
      refs in: 3 [reexport: 1, type: 2]
        - src/daemon/index.ts:154: reexport (module)
        - src/daemon/scheduler.ts:306: type Scheduler.getStatus
        - src/daemon/scheduler.ts:307: type Scheduler.jobs
  type:
    42-46: ScheduledJobType = | "reanalysis"
  | "connection_discovery"
  | "pattern_aggregation"
  | "clustering" [exported]
      /** Job types that can be scheduled */
      refs in: 3 [reexport: 1, type: 2]
        - src/daemon/index.ts:150: reexport (module)
        - src/daemon/scheduler.ts:50: type ScheduledJobResult
        - src/daemon/scheduler.ts:119: type SchedulerStatus
  function:
    736-760: createScheduler(config: DaemonConfig, queue: QueueManager, db: Database.Database, logger?: SchedulerLogger): Scheduler [exported]
      /** Create a scheduler from daemon config */
      refs in: 3 [call: 1, import: 1, reexport: 1]
        - src/daemon/index.ts:145: reexport (module)
        - src/daemon/scheduler.test.ts:13: import (module)
        - src/daemon/scheduler.test.ts:478: call scheduler
    766-775: isValidCronExpression(expression: string): boolean [exported]
      /** Validate a cron expression Returns true if valid, false otherwise */
      refs in: 12 [call: 10, import: 1, reexport: 1]
        - src/daemon/index.ts:146: reexport (module)
        - src/daemon/scheduler.test.ts:14: import (module)
        - src/daemon/scheduler.test.ts:489: call (module)
        - src/daemon/scheduler.test.ts:490: call (module)
        - src/daemon/scheduler.test.ts:491: call (module)
        - src/daemon/scheduler.test.ts:492: call (module)
        - src/daemon/scheduler.test.ts:493: call (module)
        - src/daemon/scheduler.test.ts:497: call (module)
        - src/daemon/scheduler.test.ts:498: call (module)
        - src/daemon/scheduler.test.ts:499: call (module)
    780-796: getNextRunTimes(expression: string, count = 5): {} [exported]
      /** Get the next N run times for a cron expression */
      refs in: 5 [call: 3, import: 1, reexport: 1]
        - src/daemon/index.ts:147: reexport (module)
        - src/daemon/scheduler.test.ts:15: import (module)
        - src/daemon/scheduler.test.ts:507: call times
        - src/daemon/scheduler.test.ts:529: call (module)
        - src/daemon/scheduler.test.ts:533: call times
  variable:
    66-70: SchedulerLogger [exported]
      /** Default no-op logger */
      refs in: 2 [import: 1, reexport: 1]
        - src/daemon/index.ts:148: reexport (module)
        - src/daemon/scheduler.test.ts:16: import (module)
    73-77: SchedulerLogger [exported]
      /** Console logger for production use */
      refs in: 2 [import: 1, reexport: 1]
        - src/daemon/index.ts:149: reexport (module)
        - src/daemon/scheduler.test.ts:17: import (module)
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
      refs in: 6 [reexport: 2, type: 4]
        - src/daemon/index.ts:35: reexport (module)
        - src/daemon/watcher-events.ts:51: type createSessionEvent
        - src/daemon/watcher-events.ts:52: type createSessionEvent
        - src/daemon/watcher-events.ts:78: type isSessionEvent
        - src/daemon/watcher-events.ts:81: type isSessionEvent
        - src/index.ts:47: reexport (module)
    16-19: interface ErrorEventDetail [exported]
      /** Event detail for error events */
      refs in: 6 [reexport: 2, type: 4]
        - src/daemon/index.ts:36: reexport (module)
        - src/daemon/watcher-events.ts:60: type createErrorEvent
        - src/daemon/watcher-events.ts:61: type createErrorEvent
        - src/daemon/watcher-events.ts:91: type isErrorEvent
        - src/daemon/watcher-events.ts:94: type isErrorEvent
        - src/index.ts:48: reexport (module)
  type:
    42-43: SessionEventName = (typeof SESSION_EVENTS)[keyof typeof SESSION_EVENTS] [exported]
      /** Type for session event names */
      refs in: 2 [reexport: 2]
        - src/daemon/index.ts:37: reexport (module)
        - src/index.ts:49: reexport (module)
  function:
    48-55: createSessionEvent(type: string, sessionPath: string): CustomEvent<SessionEventDetail> [exported]
      /** Create a session event */
      refs in: 7 [call: 4, import: 1, reexport: 2]
        - src/daemon/index.ts:28: reexport (module)
        - src/daemon/watcher.ts:19: import (module)
        - src/daemon/watcher.ts:417: call SessionWatcher.handleNewFile
        - src/daemon/watcher.ts:449: call SessionWatcher.handleFileChange
        - src/daemon/watcher.ts:479: call SessionWatcher.handleFileRemove
        - src/daemon/watcher.ts:532: call SessionWatcher.checkIdle
        - src/index.ts:36: reexport (module)
    60-64: createErrorEvent(error: Error): CustomEvent<ErrorEventDetail> [exported]
      /** Create an error event */
      refs in: 4 [call: 1, import: 1, reexport: 2]
        - src/daemon/index.ts:29: reexport (module)
        - src/daemon/watcher.ts:20: import (module)
        - src/daemon/watcher.ts:274: call SessionWatcher.start
        - src/index.ts:37: reexport (module)
    69-71: createReadyEvent(): Event [exported]
      /** Create a ready event */
      refs in: 4 [call: 1, import: 1, reexport: 2]
        - src/daemon/index.ts:30: reexport (module)
        - src/daemon/watcher.ts:21: import (module)
        - src/daemon/watcher.ts:277: call SessionWatcher.start
        - src/index.ts:38: reexport (module)
    76-84: isSessionEvent(event: Event): boolean [exported]
      /** Type guard to check if an event is a session event */
      refs in: 3 [call: 1, reexport: 2]
        - src/daemon/index.ts:31: reexport (module)
        - src/daemon/watcher-events.ts:102: call getSessionPath
        - src/index.ts:39: reexport (module)
    89-96: isErrorEvent(event: Event): boolean [exported]
      /** Type guard to check if an event is an error event */
      refs in: 3 [call: 1, reexport: 2]
        - src/daemon/index.ts:32: reexport (module)
        - src/daemon/watcher-events.ts:112: call getEventError
        - src/index.ts:40: reexport (module)
    101-106: getSessionPath(event: Event): string [exported]
      /** Helper to get session path from a session event */
      refs in: 10 [call: 7, import: 1, reexport: 2]
        - src/daemon/index.ts:33: reexport (module)
        - src/daemon/watcher.test.ts:16: import (module)
        - src/daemon/watcher.test.ts:228: call (module)
        - src/daemon/watcher.test.ts:271: call (module)
        - src/daemon/watcher.test.ts:302: call (module)
        - src/daemon/watcher.test.ts:330: call (module)
        - src/daemon/watcher.test.ts:364: call (module)
        - src/daemon/watcher.test.ts:718: call sessionPath
        - src/daemon/watcher.test.ts:833: call (module)
        - src/index.ts:41: reexport (module)
    111-116: getEventError(event: Event): any [exported]
      /** Helper to get error from an error event */
      refs in: 4 [call: 1, import: 1, reexport: 2]
        - src/daemon/index.ts:34: reexport (module)
        - src/daemon/watcher.test.ts:13: import (module)
        - src/daemon/watcher.test.ts:840: call (module)
        - src/index.ts:42: reexport (module)
  variable:
    24-37: SESSION_EVENTS [exported]
      /** Session event names */
      refs in: 4 [import: 2, reexport: 2]
        - src/daemon/index.ts:27: reexport (module)
        - src/daemon/watcher.test.ts:18: import (module)
        - src/daemon/watcher.ts:18: import (module)
        - src/index.ts:35: reexport (module)

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
      refs in: 20 [import: 1, instantiate: 13, reexport: 2, type: 4]
        - src/daemon/index.ts:15: reexport (module)
        - src/daemon/watcher.test.ts:19: import (module)
        - src/daemon/watcher.test.ts:53: type waitForEvent
        - src/daemon/watcher.test.ts:73: type createTestWatcher
        - src/daemon/watcher.test.ts:74: instantiate createTestWatcher
        - src/daemon/watcher.test.ts:84: instantiate watcher
        - src/daemon/watcher.test.ts:90: instantiate watcher
        - src/daemon/watcher.test.ts:343: instantiate watcher
        - src/daemon/watcher.test.ts:373: instantiate watcher
        - src/daemon/watcher.test.ts:593: instantiate watcher
  interface:
    27-42: interface SessionState [exported]
      /** State tracking for a single session file */
      refs in: 6 [reexport: 2, type: 4]
        - src/daemon/index.ts:21: reexport (module)
        - src/daemon/watcher.ts:85: type SessionWatcher.sessionStates
        - src/daemon/watcher.ts:335: type SessionWatcher.getSessionState
        - src/daemon/watcher.ts:342: type SessionWatcher.getAllSessions
        - src/daemon/watcher.ts:405: type SessionWatcher.state
        - src/index.ts:45: reexport (module)
    47-62: interface WatcherConfig [exported]
      /** Watcher configuration options */
      refs in: 5 [reexport: 2, type: 3]
        - src/daemon/index.ts:22: reexport (module)
        - src/daemon/watcher.ts:67: type DEFAULT_WATCHER_CONFIG
        - src/daemon/watcher.ts:86: type SessionWatcher.watchConfig
        - src/daemon/watcher.ts:96: type SessionWatcher.constructor
        - src/index.ts:46: reexport (module)
  function:
    546-550: createWatcher(daemonConfig: DaemonConfig): SessionWatcher [exported]
      /** Create a watcher from daemon config */
      refs in: 4 [call: 1, import: 1, reexport: 2]
        - src/daemon/index.ts:16: reexport (module)
        - src/daemon/watcher.test.ts:11: import (module)
        - src/daemon/watcher.test.ts:776: call watcher
        - src/index.ts:27: reexport (module)
    555-557: isSessionFile(filePath: string): boolean [exported]
      /** Check if a path is a valid session file */
      refs in: 8 [call: 5, import: 1, reexport: 2]
        - src/daemon/index.ts:17: reexport (module)
        - src/daemon/watcher.test.ts:17: import (module)
        - src/daemon/watcher.test.ts:783: call (module)
        - src/daemon/watcher.test.ts:784: call (module)
        - src/daemon/watcher.test.ts:788: call (module)
        - src/daemon/watcher.test.ts:789: call (module)
        - src/daemon/watcher.test.ts:790: call (module)
        - src/index.ts:32: reexport (module)
    562-564: getSessionName(sessionPath: string): string [exported]
      /** Extract session name from path */
      refs in: 5 [call: 2, import: 1, reexport: 2]
        - src/daemon/index.ts:18: reexport (module)
        - src/daemon/watcher.test.ts:15: import (module)
        - src/daemon/watcher.test.ts:796: call (module)
        - src/daemon/watcher.test.ts:798: call (module)
        - src/index.ts:31: reexport (module)
    571-581: getProjectFromSessionPath(sessionPath: string): string [exported]
      /** Extract project name from session path Session paths are typically: ~/.pi/agent/sessions/<project-name>/<session-file>.jsonl */
      refs in: 5 [call: 2, import: 1, reexport: 2]
        - src/daemon/index.ts:19: reexport (module)
        - src/daemon/watcher.test.ts:14: import (module)
        - src/daemon/watcher.test.ts:806: call (module)
        - src/daemon/watcher.test.ts:814: call (module)
        - src/index.ts:30: reexport (module)
  variable:
    67-73: WatcherConfig [exported]
      /** Default watcher configuration */
      refs in: 3 [import: 1, reexport: 2]
        - src/daemon/index.ts:20: reexport (module)
        - src/daemon/watcher.test.ts:12: import (module)
        - src/index.ts:28: reexport (module)
  imports:
    - ../config/config.js
    - ../config/types.js
    - ./watcher-events.js
    - chokidar
    - node:fs
    - node:fs/promises
    - node:path

src/daemon/worker.test.ts [1-445]
  imports:
    - ../config/types.js
    - ../storage/database.js
    - ./queue.js
    - ./worker.js
    - better-sqlite3
    - node:fs
    - node:os
    - node:path
    - vitest

src/daemon/worker.ts [1-536]
  class:
    113-475: class Worker [exported]
      /** Worker that processes jobs from the analysis queue */
      refs in: 5 [import: 1, instantiate: 2, reexport: 1, type: 1]
        - src/daemon/index.ts:103: reexport (module)
        - src/daemon/worker.test.ts:19: import (module)
        - src/daemon/worker.ts:484: type createWorker
        - src/daemon/worker.ts:485: instantiate createWorker
        - src/daemon/worker.ts:498: instantiate worker
  interface:
    55-70: interface WorkerConfig [exported]
      /** Worker configuration */
      refs in: 6 [import: 1, reexport: 1, type: 4]
        - src/daemon/index.ts:107: reexport (module)
        - src/daemon/worker.test.ts:20: import (module)
        - src/daemon/worker.test.ts:67: type createTestWorkerConfig
        - src/daemon/worker.test.ts:68: type createTestWorkerConfig
        - src/daemon/worker.ts:141: type Worker.constructor
        - src/daemon/worker.ts:484: type createWorker
    73-88: interface WorkerStatus [exported]
      /** Worker status */
      refs in: 2 [reexport: 1, type: 1]
        - src/daemon/index.ts:108: reexport (module)
        - src/daemon/worker.ts:230: type Worker.getStatus
    91-104: interface JobProcessingResult [exported]
      /** Result from processing a single job */
      refs in: 4 [reexport: 1, type: 3]
        - src/daemon/index.ts:109: reexport (module)
        - src/daemon/worker.ts:245: type Worker.processJob
        - src/daemon/worker.ts:402: type Worker.handleJobFailure
        - src/daemon/worker.ts:497: type processSingleJob
  function:
    484-486: createWorker(config: WorkerConfig): Worker [exported]
      /** Create a worker instance */
      refs in: 14 [call: 12, import: 1, reexport: 1]
        - src/daemon/index.ts:104: reexport (module)
        - src/daemon/worker.test.ts:17: import (module)
        - src/daemon/worker.test.ts:118: call worker
        - src/daemon/worker.test.ts:125: call worker
        - src/daemon/worker.test.ts:134: call worker
        - src/daemon/worker.test.ts:142: call worker
        - src/daemon/worker.test.ts:158: call worker
        - src/daemon/worker.test.ts:172: call worker
        - src/daemon/worker.test.ts:290: call worker
        - src/daemon/worker.test.ts:314: call worker
    492-506: async processSingleJob(job: AnalysisJob, config: PiBrainConfig, db: Database.Database, logger?: ProcessorLogger): Promise<JobProcessingResult> [exported]
      /** Process a single job without the full worker loop Useful for one-off processing or testing */
      refs in: 1 [reexport: 1]
        - src/daemon/index.ts:105: reexport (module)
    511-535: handleJobError(error: Error, job: AnalysisJob, retryPolicy: RetryPolicy = DEFAULT_RETRY_POLICY): { shouldRetry: boolean; retryDelayMinutes: number; formattedError: string; category: ReturnType<any>; } [exported]
      /** Handle job error manually (for custom queue implementations) */
      refs in: 11 [call: 9, import: 1, reexport: 1]
        - src/daemon/index.ts:106: reexport (module)
        - src/daemon/worker.test.ts:18: import (module)
        - src/daemon/worker.test.ts:187: call result
        - src/daemon/worker.test.ts:197: call result
        - src/daemon/worker.test.ts:206: call result
        - src/daemon/worker.test.ts:215: call result
        - src/daemon/worker.test.ts:233: call result
        - src/daemon/worker.test.ts:252: call result0
        - src/daemon/worker.test.ts:253: call result1
        - src/daemon/worker.test.ts:254: call result2
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

src/storage/database.test.ts [1-574]
  imports:
    - ./database.js
    - better-sqlite3
    - node:fs
    - node:os
    - node:path
    - vitest

src/storage/database.ts [1-155]
  interface:
    19-26: interface DatabaseOptions [exported]
      refs in: 1 [type: 1]
        - src/storage/database.ts:38: type openDatabase
    28-33: interface MigrationInfo [exported]
      refs in: 2 [type: 2]
        - src/storage/database.ts:68: type loadMigrations
        - src/storage/database.ts:74: type migrations
  function:
    38-63: openDatabase(options: DatabaseOptions = {}): Database.Database [exported]
      /** Open or create the pi-brain database */
      refs in: 81 [call: 70, import: 11]
        - src/api/server.test.ts:13: import (module)
        - src/api/server.test.ts:131: call db
        - src/api/server.test.ts:145: call db
        - src/api/server.test.ts:168: call db
        - src/api/server.test.ts:190: call db
        - src/api/server.test.ts:224: call db
        - src/api/server.test.ts:274: call db
        - src/api/server.test.ts:295: call db
        - src/api/server.test.ts:322: call db
        - src/api/server.test.ts:348: call db
    68-91: loadMigrations(): {} [exported]
      /** Load migrations from the migrations directory */
      refs in: 5 [call: 4, import: 1]
        - src/storage/database.test.ts:16: import (module)
        - src/storage/database.test.ts:50: call migrations
        - src/storage/database.test.ts:58: call migrations
        - src/storage/database.test.ts:143: call migrations
        - src/storage/database.ts:113: call migrations
    96-106: getSchemaVersion(db: Database.Database): number [exported]
      /** Get current schema version */
      refs in: 7 [call: 6, import: 1]
        - src/storage/database.test.ts:14: import (module)
        - src/storage/database.test.ts:86: call version
        - src/storage/database.test.ts:100: call (module)
        - src/storage/database.test.ts:148: call (module)
        - src/storage/database.test.ts:159: call firstVersion
        - src/storage/database.test.ts:165: call (module)
        - src/storage/database.ts:112: call currentVersion
    111-135: migrate(db: Database.Database): number [exported]
      /** Run pending migrations */
      refs in: 60 [call: 48, import: 12]
        - src/api/routes/clusters.test.ts:10: import (module)
        - src/api/routes/clusters.test.ts:21: call (module)
        - src/api/routes/query.test.ts:10: import (module)
        - src/api/routes/query.test.ts:19: call (module)
        - src/api/server.test.ts:13: import (module)
        - src/api/server.test.ts:132: call (module)
        - src/api/server.test.ts:146: call (module)
        - src/api/server.test.ts:169: call (module)
        - src/api/server.test.ts:191: call (module)
        - src/api/server.test.ts:225: call (module)
    140-142: closeDatabase(db: Database.Database): void [exported]
      /** Close the database connection */
      refs in: 10 [call: 6, import: 4]
        - src/daemon/queue.test.ts:12: import (module)
        - src/daemon/queue.test.ts:34: call (module)
        - src/daemon/worker.test.ts:14: import (module)
        - src/daemon/worker.test.ts:111: call (module)
        - src/daemon/worker.test.ts:278: call (module)
        - src/daemon/worker.test.ts:372: call (module)
        - src/storage/database.test.ts:13: import (module)
        - src/storage/database.test.ts:382: call (module)
        - src/storage/decision-repository.test.ts:8: import (module)
        - src/storage/decision-repository.test.ts:25: call (module)
    147-154: isDatabaseHealthy(db: Database.Database): boolean [exported]
      /** Check if the database is healthy */
      refs in: 4 [call: 3, import: 1]
        - src/storage/database.test.ts:15: import (module)
        - src/storage/database.test.ts:355: call (module)
        - src/storage/database.test.ts:368: call (module)
        - src/storage/database.test.ts:384: call (module)
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

src/storage/decision-repository.test.ts [1-320]
  imports:
    - ./database.js
    - ./decision-repository.js
    - ./node-repository.js
    - ./node-types.js
    - better-sqlite3
    - node:fs
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
        - src/storage/decision-repository.test.ts:10: import (module)
        - src/storage/decision-repository.test.ts:98: call result
        - src/storage/decision-repository.test.ts:232: call resA
        - src/storage/decision-repository.test.ts:236: call resB
        - src/storage/decision-repository.test.ts:305: call [decision]
        - src/storage/decision-repository.test.ts:311: call [updatedDecision]
        - src/storage/decision-repository.test.ts:316: call [clearedDecision]
    129-142: updateDecisionFeedback(db: Database.Database, decisionId: string, feedback: string | null): boolean [exported]
      /** Update user feedback for a daemon decision */
      refs in: 5 [call: 3, import: 2]
        - src/api/routes/decisions.ts:11: import (module)
        - src/api/routes/decisions.ts:79: call updated
        - src/storage/decision-repository.test.ts:11: import (module)
        - src/storage/decision-repository.test.ts:308: call updated
        - src/storage/decision-repository.test.ts:315: call (module)
  imports:
    - better-sqlite3

src/storage/index.ts [1-9]
  imports:
    - ./database.js
    - ./node-repository.js
    - ./node-storage.js
    - ./node-types.js

src/storage/node-repository.test.ts [1-3950]
  imports:
    - ../daemon/processor.js
    - ../daemon/queue.js
    - ./database.js
    - ./node-repository.js
    - ./node-types.js
    - node:fs
    - node:os
    - node:path
    - vitest

src/storage/node-repository.ts [1-3311]
  interface:
    38-41: interface RepositoryOptions extends NodeStorageOptions [exported]
      /** Options for node repository operations */
      refs in: 6 [import: 1, type: 5]
        - src/storage/node-repository.test.ts:72: import (module)
        - src/storage/node-repository.test.ts:270: type options
        - src/storage/node-repository.ts:195: type createNode
        - src/storage/node-repository.ts:220: type upsertNode
        - src/storage/node-repository.ts:332: type updateNode
        - src/storage/node-repository.ts:570: type getAllNodeVersions
    44-65: interface NodeRow [exported]
      /** Node row from the database */
      refs in: 31 [import: 2, type: 29]
        - src/daemon/connection-discovery.ts:17: import (module)
        - src/daemon/connection-discovery.ts:273: type ConnectionDiscoverer.findCandidates
        - src/daemon/connection-discovery.ts:294: type ConnectionDiscoverer.findCandidates
        - src/daemon/query-processor.ts:23: import (module)
        - src/daemon/query-processor.ts:236: type nodeRowToRelevant
        - src/storage/node-repository.ts:532: type getNode
        - src/storage/node-repository.ts:537: type getNode
        - src/storage/node-repository.ts:549: type getNodeVersion
        - src/storage/node-repository.ts:554: type getNodeVersion
        - src/storage/node-repository.ts:595: type findNodeByEndEntryId
    68-76: interface EdgeRow [exported]
      /** Edge row from the database */
      refs in: 12 [type: 12]
        - src/storage/node-repository.ts:766: type getEdgesFrom
        - src/storage/node-repository.ts:772: type getEdgesFrom
        - src/storage/node-repository.ts:778: type getEdgesTo
        - src/storage/node-repository.ts:784: type getEdgesTo
        - src/storage/node-repository.ts:790: type getNodeEdges
        - src/storage/node-repository.ts:796: type getNodeEdges
        - src/storage/node-repository.ts:802: type getEdge
        - src/storage/node-repository.ts:804: type getEdge
        - src/storage/node-repository.ts:2799: type edgesToProcess
        - src/storage/node-repository.ts:2944: type findPath
    929-934: interface SearchHighlight [exported]
      /** Highlight match for search results */
      refs in: 3 [type: 3]
        - src/storage/node-repository.ts:943: type SearchResult
        - src/storage/node-repository.ts:1079: type findHighlights
        - src/storage/node-repository.ts:1080: type highlights
    937-944: interface SearchResult [exported]
      /** Enhanced search result with score and highlights */
      refs in: 2 [type: 2]
        - src/storage/node-repository.ts:961: type SearchNodesResult
        - src/storage/node-repository.ts:1261: type results
    947-956: interface SearchOptions [exported]
      /** Options for enhanced search */
      refs in: 2 [type: 2]
        - src/storage/node-repository.ts:1151: type searchNodesAdvanced
        - src/storage/node-repository.ts:1279: type countSearchResults
    959-968: interface SearchNodesResult [exported]
      /** Result from enhanced search with pagination metadata */
      refs in: 1 [type: 1]
        - src/storage/node-repository.ts:1152: type searchNodesAdvanced
    1371-1380: interface ListLessonsFilters [exported]
      /** Filters for querying lessons */
      refs in: 2 [type: 2]
        - src/storage/node-repository.ts:1425: type listLessons
        - src/storage/node-repository.ts:1590: type countLessons
    1383-1388: interface ListLessonsOptions [exported]
      /** Pagination options for lessons */
      refs in: 1 [type: 1]
        - src/storage/node-repository.ts:1426: type listLessons
    1391-1410: interface ListLessonsResult [exported]
      /** Result from listLessons query */
      refs in: 1 [type: 1]
        - src/storage/node-repository.ts:1427: type listLessons
    1607-1616: interface ListQuirksFilters [exported]
      /** Filters for querying model quirks */
      refs in: 2 [type: 2]
        - src/storage/node-repository.ts:1670: type listQuirks
        - src/storage/node-repository.ts:1797: type countQuirks
    1619-1624: interface ListQuirksOptions [exported]
      /** Pagination options for quirks */
      refs in: 1 [type: 1]
        - src/storage/node-repository.ts:1671: type listQuirks
    1627-1636: interface QuirkResult [exported]
      /** A quirk result with metadata */
      refs in: 2 [type: 2]
        - src/storage/node-repository.ts:1641: type ListQuirksResult
        - src/storage/node-repository.ts:1725: type quirks
    1639-1648: interface ListQuirksResult [exported]
      /** Result from listQuirks query */
      refs in: 1 [type: 1]
        - src/storage/node-repository.ts:1672: type listQuirks
    1731-1741: interface ModelQuirkStats [exported]
      /** Stats for a single model */
      refs in: 1 [type: 1]
        - src/storage/node-repository.ts:1744: type QuirksByModelResult
    1870-1879: interface ListToolErrorsFilters [exported]
      /** Filters for querying tool errors */
      refs in: 3 [type: 3]
        - src/storage/node-repository.ts:1918: type listToolErrors
        - src/storage/node-repository.ts:1982: type getAggregatedToolErrors
        - src/storage/node-repository.ts:2139: type countToolErrors
    1882-1887: interface ListToolErrorsOptions [exported]
      /** Pagination options for tool errors */
      refs in: 1 [type: 1]
        - src/storage/node-repository.ts:1919: type listToolErrors
    1890-1899: interface ToolErrorResult [exported]
      /** A tool error result with metadata */
      refs in: 2 [type: 2]
        - src/storage/node-repository.ts:1904: type ListToolErrorsResult
        - src/storage/node-repository.ts:1971: type errors
    1902-1911: interface ListToolErrorsResult [exported]
      /** Result from listToolErrors query */
      refs in: 1 [type: 1]
        - src/storage/node-repository.ts:1920: type listToolErrors
    2379-2404: interface ListNodesFilters [exported]
      /** Filters for querying nodes */
      refs in: 6 [import: 1, type: 5]
        - src/daemon/query-processor.ts:22: import (module)
        - src/daemon/query-processor.ts:206: type filters
        - src/daemon/query-processor.ts:219: type listFilters
        - src/storage/node-repository.ts:955: type SearchOptions
        - src/storage/node-repository.ts:2460: type listNodes
        - src/storage/node-repository.ts:2681: type countNodes
    2407-2416: interface ListNodesOptions [exported]
      /** Pagination and sorting options */
      refs in: 1 [type: 1]
        - src/storage/node-repository.ts:2461: type listNodes
    2419-2428: interface ListNodesResult [exported]
      /** Result from listNodes query */
      refs in: 1 [type: 1]
        - src/storage/node-repository.ts:2462: type listNodes
    2588-2600: interface SessionSummaryRow [exported]
      /** Session summary row from aggregation query */
      refs in: 2 [type: 2]
        - src/storage/node-repository.ts:2610: type getSessionSummaries
        - src/storage/node-repository.ts:2634: type getSessionSummaries
    2695-2711: interface ConnectedNodesOptions [exported]
      /** Options for getConnectedNodes */
      refs in: 2 [type: 2]
        - src/storage/node-repository.ts:2773: type getConnectedNodes
        - src/storage/node-repository.ts:2887: type getSubgraph
    2714-2729: interface TraversalEdge [exported]
      /** An edge with direction information for traversal results */
      refs in: 3 [type: 3]
        - src/storage/node-repository.ts:2738: type ConnectedNodesResult
        - src/storage/node-repository.ts:2782: type traversalEdges
        - src/storage/node-repository.ts:2896: type allEdges
    2732-2739: interface ConnectedNodesResult [exported]
      /** Result from getConnectedNodes */
      refs in: 4 [type: 4]
        - src/storage/node-repository.ts:2774: type getConnectedNodes
        - src/storage/node-repository.ts:2888: type getSubgraph
        - src/storage/node-repository.ts:3003: type getAncestors
        - src/storage/node-repository.ts:3019: type getDescendants
    3075-3094: interface NodeConversionContext [exported]
      /** Context needed to convert AgentNodeOutput to a full Node */
      refs in: 3 [import: 1, type: 2]
        - src/storage/node-repository.test.ts:71: import (module)
        - src/storage/node-repository.test.ts:235: type createTestConversionContext
        - src/storage/node-repository.ts:3102: type agentOutputToNode
  type:
    912-917: SearchField = | "summary"
  | "decisions"
  | "lessons"
  | "tags"
  | "topics" [exported]
      /** Fields that can be searched in the FTS index */
      refs in: 5 [type: 5]
        - src/storage/node-repository.ts:920: type ALL_SEARCH_FIELDS
        - src/storage/node-repository.ts:931: type SearchHighlight
        - src/storage/node-repository.ts:949: type SearchOptions
        - src/storage/node-repository.ts:987: type buildFieldQuery
        - src/storage/node-repository.ts:1078: type findHighlights
    1525-1535: LessonsByLevelResult = Record<
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
        - src/storage/node-repository.ts:1546: type getLessonsByLevel
        - src/storage/node-repository.ts:1556: type result
    1601-1601: QuirkFrequency = "once" | "sometimes" | "often" | "always" [exported]
      /** Frequency values for model quirks */
      refs in: 1 [type: 1]
        - src/storage/node-repository.ts:1611: type ListQuirksFilters
    1604-1604: QuirkSeverity = "low" | "medium" | "high" [exported]
      /** Severity values for model quirks (matches spec) */
      refs in: 1 [type: 1]
        - src/storage/node-repository.ts:1613: type ListQuirksFilters
    1744-1744: QuirksByModelResult = Record<string, ModelQuirkStats> [exported]
      /** Result from getQuirksByModel */
      refs in: 2 [type: 2]
        - src/storage/node-repository.ts:1755: type getQuirksByModel
        - src/storage/node-repository.ts:1762: type result
    2347-2355: NodeSortField = | "timestamp"
  | "analyzed_at"
  | "project"
  | "type"
  | "outcome"
  | "tokens_used"
  | "cost"
  | "duration_minutes" [exported]
      /** Valid sort fields for listNodes */
      refs in: 5 [type: 5]
        - src/storage/node-repository.ts:2413: type ListNodesOptions
        - src/storage/node-repository.ts:2431: type ALLOWED_SORT_FIELDS
        - src/storage/node-repository.ts:2468: type sort
        - src/storage/node-repository.ts:2469: type sort
        - src/storage/node-repository.ts:2471: type sort
    2358-2358: SortOrder = "asc" | "desc" [exported]
      /** Sort order */
      refs in: 2 [type: 2]
        - src/storage/node-repository.ts:2415: type ListNodesOptions
        - src/storage/node-repository.ts:2473: type order
    2361-2373: NodeTypeFilter = | "coding"
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
        - src/storage/node-repository.ts:2385: type ListNodesFilters
    2376-2376: OutcomeFilter = "success" | "partial" | "failed" | "abandoned" [exported]
      /** Outcome filter values */
      refs in: 1 [type: 1]
        - src/storage/node-repository.ts:2387: type ListNodesFilters
    2692-2692: TraversalDirection = "incoming" | "outgoing" | "both" [exported]
      /** Direction for graph traversal */
      refs in: 1 [type: 1]
        - src/storage/node-repository.ts:2705: type ConnectedNodesOptions
  function:
    86-115: clearAllData(db: Database.Database): void [exported]
      /** Clear all data from the database (nodes, edges, etc.) Used by rebuild-index CLI */
      refs in: 2 [call: 1, import: 1]
        - src/daemon/cli.ts:29: import (module)
        - src/daemon/cli.ts:977: call rebuildIndex
    121-186: insertNodeToDb(db: Database.Database, node: Node, dataFile: string, options: { skipFts?: boolean } = {}): void [exported]
      /** Insert a node into the database (without writing JSON file) Used by createNode and rebuild-index CLI */
      refs in: 4 [call: 3, import: 1]
        - src/daemon/cli.ts:30: import (module)
        - src/daemon/cli.ts:989: call processInsertBatch
        - src/storage/node-repository.ts:202: call createNode
        - src/storage/node-repository.ts:230: call upsertNode
    192-206: createNode(db: Database.Database, node: Node, options: RepositoryOptions = {}): Node [exported]
      /** Create a node - writes to both SQLite and JSON storage Returns the node with any auto-generated fields filled in */
      refs in: 235 [call: 233, import: 2]
        - src/storage/decision-repository.test.ts:13: import (module)
        - src/storage/decision-repository.test.ts:96: call (module)
        - src/storage/decision-repository.test.ts:107: call (module)
        - src/storage/decision-repository.test.ts:170: call (module)
        - src/storage/decision-repository.test.ts:243: call (module)
        - src/storage/node-repository.test.ts:21: import (module)
        - src/storage/node-repository.test.ts:296: call created
        - src/storage/node-repository.test.ts:316: call (module)
        - src/storage/node-repository.test.ts:332: call (module)
        - src/storage/node-repository.test.ts:364: call (module)
    217-322: upsertNode(db: Database.Database, node: Node, options: RepositoryOptions = {}): { node: Node; created: boolean; } [exported]
      /** Upsert a node - creates if not exists, updates if exists. This provides idempotent ingestion for analysis jobs. If a job crashes after writing JSON but before DB insert, re-running will update the existing data cleanly without duplicates or errors. Returns the node and whether it was created (true) or updated (false). */
      refs in: 9 [call: 7, import: 2]
        - src/daemon/worker.ts:28: import (module)
        - src/daemon/worker.ts:348: call Worker.{ created }
        - src/storage/node-repository.test.ts:70: import (module)
        - src/storage/node-repository.test.ts:488: call { node: resultNode, created }
        - src/storage/node-repository.test.ts:518: call { node: resultNode, created }
        - src/storage/node-repository.test.ts:536: call first
        - src/storage/node-repository.test.ts:540: call second
        - src/storage/node-repository.test.ts:566: call (module)
        - src/storage/node-repository.test.ts:614: call (module)
    329-417: updateNode(db: Database.Database, node: Node, options: RepositoryOptions = {}): Node [exported]
      /** Update a node - writes new JSON version and updates SQLite row. Throws if the node doesn't exist in the database. Returns the updated node. */
      refs in: 6 [call: 5, import: 1]
        - src/storage/node-repository.test.ts:69: import (module)
        - src/storage/node-repository.test.ts:693: call (module)
        - src/storage/node-repository.test.ts:713: call (module)
        - src/storage/node-repository.test.ts:731: call (module)
        - src/storage/node-repository.test.ts:758: call (module)
        - src/storage/node-repository.test.ts:771: call (module)
    532-538: getNode(db: Database.Database, nodeId: string): NodeRow [exported]
      /** Get a node by ID (returns the row from SQLite - always the latest version) */
      refs in: 14 [call: 11, import: 3]
        - src/daemon/cli.test.ts:13: import (module)
        - src/daemon/cli.test.ts:597: call retrieved
        - src/daemon/cli.test.ts:678: call retrieved
        - src/daemon/connection-discovery.ts:15: import (module)
        - src/daemon/connection-discovery.ts:167: call ConnectionDiscoverer.sourceNode
        - src/daemon/connection-discovery.ts:352: call ConnectionDiscoverer.targetNode
        - src/storage/node-repository.test.ts:45: import (module)
        - src/storage/node-repository.test.ts:301: call row
        - src/storage/node-repository.test.ts:439: call result
        - src/storage/node-repository.test.ts:447: call result
    545-555: getNodeVersion(db: Database.Database, nodeId: string, version: number): NodeRow [exported]
      /** Get a specific version of a node from SQLite. Note: SQLite only stores the current/latest version. For historical versions, use getAllNodeVersions() which reads from JSON storage. */
      refs in: 3 [call: 2, import: 1]
        - src/storage/node-repository.test.ts:55: import (module)
        - src/storage/node-repository.test.ts:458: call result
        - src/storage/node-repository.test.ts:467: call result
    560-563: nodeExistsInDb(db: Database.Database, nodeId: string): boolean [exported]
      /** Check if a node exists in the database */
      refs in: 8 [call: 7, import: 1]
        - src/storage/node-repository.test.ts:66: import (module)
        - src/storage/node-repository.test.ts:474: call (module)
        - src/storage/node-repository.test.ts:481: call (module)
        - src/storage/node-repository.test.ts:492: call (module)
        - src/storage/node-repository.test.ts:544: call (module)
        - src/storage/node-repository.test.ts:630: call (module)
        - src/storage/node-repository.ts:223: call exists
        - src/storage/node-repository.ts:336: call updateNode
    568-574: getAllNodeVersions(nodeId: string, options: RepositoryOptions = {}): {} [exported]
      /** Get all versions of a node from JSON storage */
      refs in: 2 [call: 1, import: 1]
        - src/storage/node-repository.test.ts:30: import (module)
        - src/storage/node-repository.test.ts:760: call allVersions
    580-586: deleteNode(db: Database.Database, nodeId: string): boolean [exported]
      /** Delete a node and all related data Note: Due to ON DELETE CASCADE, related records are automatically deleted */
      refs in: 4 [call: 3, import: 1]
        - src/storage/node-repository.test.ts:23: import (module)
        - src/storage/node-repository.test.ts:628: call result
        - src/storage/node-repository.test.ts:634: call result
        - src/storage/node-repository.test.ts:659: call (module)
    591-603: findNodeByEndEntryId(db: Database.Database, sessionFile: string, entryId: string): NodeRow [exported]
      /** Find a node that contains a specific entry ID as its end boundary */
    608-619: findLastNodeInSession(db: Database.Database, sessionFile: string): NodeRow [exported]
      /** Find the latest node for a given session file */
      refs in: 1 [call: 1]
        - src/storage/node-repository.ts:693: call parentLastNode
    624-635: findFirstNodeInSession(db: Database.Database, sessionFile: string): NodeRow [exported]
      /** Find the first node for a given session file */
    662-700: linkNodeToPredecessors(db: Database.Database, node: Node, context: {
    boundaryType?: string;
  } = {}): {} [exported]
      /** Automatically link a node to its predecessors based on session structure. Creates structural edges based on session continuity and fork relationships. Idempotent: will not create duplicate edges if called multiple times. */
      refs in: 12 [call: 9, import: 3]
        - src/daemon/cli.ts:31: import (module)
        - src/daemon/cli.ts:1014: call processLinkBatch
        - src/daemon/worker.ts:27: import (module)
        - src/daemon/worker.ts:355: call Worker.processJob
        - src/storage/node-repository.test.ts:59: import (module)
        - src/storage/node-repository.test.ts:971: call edges
        - src/storage/node-repository.test.ts:996: call edges
        - src/storage/node-repository.test.ts:1023: call edges
        - src/storage/node-repository.test.ts:1049: call edges1
        - src/storage/node-repository.test.ts:1050: call edges2
    725-761: createEdge(db: Database.Database, sourceNodeId: string, targetNodeId: string, type: EdgeType, options: {
    metadata?: EdgeMetadata;
    createdBy?: "boundary" | "daemon" | "user";
  } = {}): Edge [exported]
      /** Create an edge between two nodes */
      refs in: 58 [call: 55, import: 3]
        - src/daemon/connection-discovery.test.ts:4: import (module)
        - src/daemon/connection-discovery.test.ts:190: call (module)
        - src/daemon/connection-discovery.ts:13: import (module)
        - src/daemon/connection-discovery.ts:234: call ConnectionDiscoverer.edge
        - src/daemon/connection-discovery.ts:361: call ConnectionDiscoverer.edge
        - src/daemon/connection-discovery.ts:433: call ConnectionDiscoverer.edge
        - src/storage/node-repository.test.ts:20: import (module)
        - src/storage/node-repository.test.ts:1100: call edge
        - src/storage/node-repository.test.ts:1117: call edge
        - src/storage/node-repository.test.ts:1138: call (module)
    766-773: getEdgesFrom(db: Database.Database, nodeId: string): {} [exported]
      /** Get edges from a node (outgoing) */
      refs in: 5 [call: 4, import: 1]
        - src/storage/node-repository.test.ts:41: import (module)
        - src/storage/node-repository.test.ts:1141: call edges
        - src/storage/node-repository.test.ts:1151: call edges
        - src/storage/node-repository.test.ts:2039: call (module)
        - src/storage/node-repository.ts:2804: call outgoing
    778-785: getEdgesTo(db: Database.Database, nodeId: string): {} [exported]
      /** Get edges to a node (incoming) */
      refs in: 5 [call: 4, import: 1]
        - src/storage/node-repository.test.ts:42: import (module)
        - src/storage/node-repository.test.ts:1059: call allEdges
        - src/storage/node-repository.test.ts:1168: call edges
        - src/storage/node-repository.test.ts:2040: call (module)
        - src/storage/node-repository.ts:2811: call incoming
    790-797: getNodeEdges(db: Database.Database, nodeId: string): {} [exported]
      /** Get all edges for a node (both directions) */
      refs in: 3 [call: 2, import: 1]
        - src/storage/node-repository.test.ts:46: import (module)
        - src/storage/node-repository.test.ts:1187: call edges
        - src/storage/node-repository.ts:2972: call allEdges
    802-805: getEdge(db: Database.Database, edgeId: string): EdgeRow [exported]
      /** Get edge by ID */
      refs in: 4 [call: 3, import: 1]
        - src/storage/node-repository.test.ts:40: import (module)
        - src/storage/node-repository.test.ts:1122: call retrieved
        - src/storage/node-repository.test.ts:1234: call (module)
        - src/storage/node-repository.test.ts:1254: call row
    810-813: deleteEdge(db: Database.Database, edgeId: string): boolean [exported]
      /** Delete an edge */
      refs in: 3 [call: 2, import: 1]
        - src/storage/node-repository.test.ts:22: import (module)
        - src/storage/node-repository.test.ts:1232: call result
        - src/storage/node-repository.test.ts:1238: call result
    818-836: edgeExists(db: Database.Database, sourceNodeId: string, targetNodeId: string, type?: EdgeType): boolean [exported]
      /** Check if an edge exists between two nodes */
      refs in: 12 [call: 10, import: 2]
        - src/daemon/connection-discovery.ts:14: import (module)
        - src/daemon/connection-discovery.ts:211: call ConnectionDiscoverer.discover
        - src/daemon/connection-discovery.ts:356: call ConnectionDiscoverer.detectReferences
        - src/daemon/connection-discovery.ts:424: call ConnectionDiscoverer.detectLessonReinforcement
        - src/storage/node-repository.test.ts:24: import (module)
        - src/storage/node-repository.test.ts:1199: call (module)
        - src/storage/node-repository.test.ts:1209: call (module)
        - src/storage/node-repository.test.ts:1219: call (module)
        - src/storage/node-repository.test.ts:1220: call (module)
        - src/storage/node-repository.test.ts:2038: call (module)
    845-873: indexNodeForSearch(db: Database.Database, node: Node): void [exported]
      /** Index a node for full-text search */
      refs in: 5 [call: 4, import: 1]
        - src/storage/node-repository.test.ts:58: import (module)
        - src/storage/node-repository.test.ts:1361: call (module)
        - src/storage/node-repository.ts:184: call insertNodeToDb
        - src/storage/node-repository.ts:317: call upsertNode
        - src/storage/node-repository.ts:412: call updateNode
    879-905: searchNodes(db: Database.Database, query: string, limit = 20): {} [exported]
      /** Search nodes using full-text search Quotes the query to handle special characters like hyphens */
      refs in: 10 [call: 9, import: 1]
        - src/storage/node-repository.test.ts:67: import (module)
        - src/storage/node-repository.test.ts:431: call results
        - src/storage/node-repository.test.ts:925: call results
        - src/storage/node-repository.test.ts:947: call results
        - src/storage/node-repository.test.ts:1297: call results
        - src/storage/node-repository.test.ts:1320: call results
        - src/storage/node-repository.test.ts:1340: call results
        - src/storage/node-repository.test.ts:1363: call results
        - src/storage/node-repository.test.ts:1368: call results
        - src/storage/node-repository.test.ts:1373: call results
    1148-1271: searchNodesAdvanced(db: Database.Database, query: string, options: SearchOptions = {}): SearchNodesResult [exported]
      /** Enhanced search with scores, highlights, and filter support */
      refs in: 15 [call: 13, import: 2]
        - src/daemon/query-processor.ts:18: import (module)
        - src/daemon/query-processor.ts:209: call searchResults
        - src/storage/node-repository.test.ts:68: import (module)
        - src/storage/node-repository.test.ts:1396: call { results, total }
        - src/storage/node-repository.test.ts:1447: call summaryResults
        - src/storage/node-repository.test.ts:1458: call decisionResults
        - src/storage/node-repository.test.ts:1486: call page1
        - src/storage/node-repository.test.ts:1496: call page2
        - src/storage/node-repository.test.ts:1548: call results
        - src/storage/node-repository.test.ts:1591: call results
    1276-1364: countSearchResults(db: Database.Database, query: string, options: Pick<SearchOptions, "fields" | "filters"> = {}): number [exported]
      /** Count total search results (without fetching data) */
      refs in: 5 [call: 4, import: 1]
        - src/storage/node-repository.test.ts:19: import (module)
        - src/storage/node-repository.test.ts:1661: call count
        - src/storage/node-repository.test.ts:1695: call summaryCount
        - src/storage/node-repository.test.ts:1700: call allFieldsCount
        - src/storage/node-repository.test.ts:1705: call count
    1423-1522: listLessons(db: Database.Database, filters: ListLessonsFilters = {}, options: ListLessonsOptions = {}): ListLessonsResult [exported]
      /** List lessons with filters and pagination. Supports filtering by: - level (exact match) - project (partial match via nodes table) - tags (AND logic via lesson_tags table) - confidence (exact match) Per specs/api.md GET /api/v1/lessons endpoint. */
      refs in: 7 [call: 6, import: 1]
        - src/storage/node-repository.test.ts:60: import (module)
        - src/storage/node-repository.test.ts:3297: call modelLessons
        - src/storage/node-repository.test.ts:3302: call project1Lessons
        - src/storage/node-repository.test.ts:3307: call tag1Lessons
        - src/storage/node-repository.test.ts:3310: call tag2Lessons
        - src/storage/node-repository.test.ts:3315: call paginated
        - src/storage/node-repository.ts:1592: call result
    1543-1583: getLessonsByLevel(db: Database.Database, recentLimit = 5): Record<string, { count: number; recent: {}; }> [exported]
      /** Get aggregated lesson stats by level. Returns counts and most recent lessons for each level. Per specs/api.md GET /api/v1/lessons/by-level endpoint. */
      refs in: 2 [call: 1, import: 1]
        - src/storage/node-repository.test.ts:43: import (module)
        - src/storage/node-repository.test.ts:3353: call stats
    1588-1594: countLessons(db: Database.Database, filters: ListLessonsFilters = {}): number [exported]
      /** Count lessons matching filters (without fetching data) */
      refs in: 4 [call: 3, import: 1]
        - src/storage/node-repository.test.ts:17: import (module)
        - src/storage/node-repository.test.ts:3395: call (module)
        - src/storage/node-repository.test.ts:3396: call (module)
        - src/storage/node-repository.test.ts:3397: call (module)
    1668-1728: listQuirks(db: Database.Database, filters: ListQuirksFilters = {}, options: ListQuirksOptions = {}): ListQuirksResult [exported]
      /** List model quirks with filters and pagination. Supports filtering by: - model (exact match) - frequency (minimum frequency ranking) - project (partial match via nodes table) Per specs/api.md GET /api/v1/quirks endpoint. */
      refs in: 12 [call: 11, import: 1]
        - src/storage/node-repository.test.ts:62: import (module)
        - src/storage/node-repository.test.ts:3403: call result
        - src/storage/node-repository.test.ts:3458: call all
        - src/storage/node-repository.test.ts:3463: call glmQuirks
        - src/storage/node-repository.test.ts:3467: call claudeQuirks
        - src/storage/node-repository.test.ts:3475: call project1Quirks
        - src/storage/node-repository.test.ts:3479: call sometimesOrMore
        - src/storage/node-repository.test.ts:3482: call oftenOrMore
        - src/storage/node-repository.test.ts:3519: call page1
        - src/storage/node-repository.test.ts:3525: call page2
    1752-1790: getQuirksByModel(db: Database.Database, recentLimit = 5): Record<string, ModelQuirkStats> [exported]
      /** Get aggregated quirk stats by model. Returns counts and most recent quirks for each model that has quirks. Per specs/api.md GET /api/v1/stats/models endpoint (quirkCount field). */
      refs in: 2 [call: 1, import: 1]
        - src/storage/node-repository.test.ts:56: import (module)
        - src/storage/node-repository.test.ts:3570: call stats
    1795-1801: countQuirks(db: Database.Database, filters: ListQuirksFilters = {}): number [exported]
      /** Count quirks matching filters (without fetching data) */
      refs in: 4 [call: 3, import: 1]
        - src/storage/node-repository.test.ts:64: import (module)
        - src/storage/node-repository.test.ts:3606: call (module)
        - src/storage/node-repository.test.ts:3607: call (module)
        - src/storage/node-repository.test.ts:3608: call (module)
    1806-1813: getAllQuirkModels(db: Database.Database): {} [exported]
      /** Get all unique models that have quirks recorded */
      refs in: 2 [call: 1, import: 1]
        - src/storage/node-repository.test.ts:36: import (module)
        - src/storage/node-repository.test.ts:3642: call models
    1821-1863: getAggregatedQuirks(db: Database.Database, options: { minOccurrences?: number; limit?: number } = {}): {} [exported]
      /** Get aggregated quirks - similar observations grouped together. Useful for the dashboard "Model Quirks" panel. Per specs/storage.md "Find model quirks by frequency" query. */
      refs in: 5 [call: 3, import: 2]
        - src/daemon/query-processor.ts:20: import (module)
        - src/daemon/query-processor.ts:276: call quirks
        - src/storage/node-repository.test.ts:34: import (module)
        - src/storage/node-repository.test.ts:3690: call aggregated
        - src/storage/node-repository.test.ts:3700: call all
    1916-1974: listToolErrors(db: Database.Database, filters: ListToolErrorsFilters = {}, options: ListToolErrorsOptions = {}): ListToolErrorsResult [exported]
      /** List individual tool errors with filters and pagination. */
      refs in: 6 [call: 5, import: 1]
        - src/storage/node-repository.test.ts:63: import (module)
        - src/storage/node-repository.test.ts:3780: call all
        - src/storage/node-repository.test.ts:3785: call editErrors
        - src/storage/node-repository.test.ts:3789: call modelAErrors
        - src/storage/node-repository.test.ts:3793: call project1Errors
        - src/storage/node-repository.ts:2141: call result
    1980-2068: getAggregatedToolErrors(db: Database.Database, filters: ListToolErrorsFilters = {}, options: { limit?: number; offset?: number; groupByModel?: boolean } = {}): {} [exported]
      /** Get aggregated tool errors - grouped by tool and error type (and optionally model). Per specs/api.md GET /api/v1/tool-errors. */
      refs in: 4 [call: 2, import: 2]
        - src/daemon/query-processor.ts:21: import (module)
        - src/daemon/query-processor.ts:297: call errors
        - src/storage/node-repository.test.ts:35: import (module)
        - src/storage/node-repository.test.ts:3837: call aggregated
    2074-2132: getToolErrorStats(db: Database.Database): { byTool: {}; byModel: {}; trends: { thisWeek: number; lastWeek: number; change: number; }; } [exported]
      /** Get tool error statistics for the dashboard. Per specs/api.md GET /api/v1/stats/tool-errors. */
      refs in: 2 [call: 1, import: 1]
        - src/storage/node-repository.test.ts:53: import (module)
        - src/storage/node-repository.test.ts:3882: call stats
    2137-2143: countToolErrors(db: Database.Database, filters: ListToolErrorsFilters = {}): number [exported]
      /** Count tool errors matching filters. */
      refs in: 4 [call: 3, import: 1]
        - src/storage/node-repository.test.ts:65: import (module)
        - src/storage/node-repository.test.ts:3914: call (module)
        - src/storage/node-repository.test.ts:3915: call (module)
        - src/storage/node-repository.test.ts:3916: call (module)
    2148-2155: getAllToolsWithErrors(db: Database.Database): {} [exported]
      /** Get all unique tools that have errors recorded */
      refs in: 2 [call: 1, import: 1]
        - src/storage/node-repository.test.ts:37: import (module)
        - src/storage/node-repository.test.ts:3943: call tools
    2164-2171: getNodeSummary(db: Database.Database, nodeId: string): string [exported]
      /** Get node summary from FTS index */
      refs in: 2 [call: 1, import: 1]
        - src/daemon/connection-discovery.ts:16: import (module)
        - src/daemon/connection-discovery.ts:181: call ConnectionDiscoverer.sourceSummary
    2176-2180: getNodeTags(db: Database.Database, nodeId: string): {} [exported]
      /** Get tags for a node */
      refs in: 6 [call: 5, import: 1]
        - src/storage/node-repository.test.ts:51: import (module)
        - src/storage/node-repository.test.ts:318: call tags
        - src/storage/node-repository.test.ts:568: call tags
        - src/storage/node-repository.test.ts:661: call (module)
        - src/storage/node-repository.test.ts:700: call tags
        - src/storage/node-repository.test.ts:2001: call tags
    2185-2189: getNodeTopics(db: Database.Database, nodeId: string): {} [exported]
      /** Get topics for a node */
      refs in: 4 [call: 3, import: 1]
        - src/storage/node-repository.test.ts:54: import (module)
        - src/storage/node-repository.test.ts:334: call topics
        - src/storage/node-repository.test.ts:574: call topics
        - src/storage/node-repository.test.ts:662: call (module)
    2194-2217: getNodeLessons(db: Database.Database, nodeId: string): {} [exported]
      /** Get lessons for a node */
      refs in: 6 [call: 5, import: 1]
        - src/storage/node-repository.test.ts:47: import (module)
        - src/storage/node-repository.test.ts:366: call lessons
        - src/storage/node-repository.test.ts:616: call lessons
        - src/storage/node-repository.test.ts:663: call (module)
        - src/storage/node-repository.test.ts:861: call lessons
        - src/storage/node-repository.test.ts:2005: call lessons
    2222-2245: getNodeQuirks(db: Database.Database, nodeId: string): {} [exported]
      /** Get model quirks for a node */
      refs in: 2 [call: 1, import: 1]
        - src/storage/node-repository.test.ts:48: import (module)
        - src/storage/node-repository.test.ts:389: call quirks
    2250-2273: getNodeToolErrors(db: Database.Database, nodeId: string): {} [exported]
      /** Get tool errors for a node */
      refs in: 2 [call: 1, import: 1]
        - src/storage/node-repository.test.ts:52: import (module)
        - src/storage/node-repository.test.ts:412: call errors
    2278-2288: getAllTags(db: Database.Database): {} [exported]
      /** Get all unique tags in the system */
      refs in: 2 [call: 1, import: 1]
        - src/storage/node-repository.test.ts:32: import (module)
        - src/storage/node-repository.test.ts:817: call allTags
    2293-2297: getAllTopics(db: Database.Database): {} [exported]
      /** Get all unique topics in the system */
      refs in: 2 [call: 1, import: 1]
        - src/storage/node-repository.test.ts:33: import (module)
        - src/storage/node-repository.test.ts:837: call allTopics
    2302-2309: getLessonTags(db: Database.Database, lessonId: string): {} [exported]
      /** Get tags for a specific lesson */
      refs in: 2 [call: 1, import: 1]
        - src/storage/node-repository.test.ts:44: import (module)
        - src/storage/node-repository.test.ts:862: call lessonTags
    2314-2324: getNodesByTag(db: Database.Database, tag: string): {} [exported]
      /** Find nodes by tag (matches both node tags and lesson tags) */
      refs in: 2 [call: 1, import: 1]
        - src/storage/node-repository.test.ts:49: import (module)
        - src/storage/node-repository.test.ts:893: call results
    2329-2340: getNodesByTopic(db: Database.Database, topic: string): {} [exported]
      /** Find nodes by topic */
      refs in: 2 [call: 1, import: 1]
        - src/storage/node-repository.test.ts:50: import (module)
        - src/storage/node-repository.test.ts:911: call results
    2458-2583: listNodes(db: Database.Database, filters: ListNodesFilters = {}, options: ListNodesOptions = {}): ListNodesResult [exported]
      /** List nodes with filters, pagination, and sorting. Supports filtering by: - project (partial match via LIKE) - type (exact match) - outcome (exact match) - date range (from/to on timestamp field) - computer (exact match) - hadClearGoal (boolean) - isNewProject (boolean) - tags (AND logic - nodes must have ALL specified tags) - topics (AND logic - nodes must have ALL specified topics) Per specs/api.md GET /api/v1/nodes endpoint. */
      refs in: 42 [call: 39, import: 3]
        - src/daemon/cli.test.ts:13: import (module)
        - src/daemon/cli.test.ts:637: call listResult
        - src/daemon/cli.test.ts:706: call listResult
        - src/daemon/cli.test.ts:727: call (module)
        - src/daemon/query-processor.ts:19: import (module)
        - src/daemon/query-processor.ts:224: call nodes
        - src/storage/node-repository.test.ts:61: import (module)
        - src/storage/node-repository.test.ts:2065: call result
        - src/storage/node-repository.test.ts:2089: call result
        - src/storage/node-repository.test.ts:2113: call result
    2606-2635: getSessionSummaries(db: Database.Database, project: string, options: { limit?: number; offset?: number } = {}): {} [exported]
      /** Get aggregated session summaries for a project. Used for the session browser to avoid loading thousands of nodes. */
    2640-2648: getAllProjects(db: Database.Database): {} [exported]
      /** Get all unique projects in the system */
      refs in: 3 [call: 2, import: 1]
        - src/storage/node-repository.test.ts:31: import (module)
        - src/storage/node-repository.test.ts:2741: call projects
        - src/storage/node-repository.test.ts:2747: call projects
    2653-2661: getAllNodeTypes(db: Database.Database): {} [exported]
      /** Get all unique node types that have been used */
      refs in: 2 [call: 1, import: 1]
        - src/storage/node-repository.test.ts:29: import (module)
        - src/storage/node-repository.test.ts:2766: call types
    2666-2674: getAllComputers(db: Database.Database): {} [exported]
      /** Get all unique computers (source machines) */
      refs in: 2 [call: 1, import: 1]
        - src/storage/node-repository.test.ts:28: import (module)
        - src/storage/node-repository.test.ts:2783: call computers
    2679-2685: countNodes(db: Database.Database, filters: ListNodesFilters = {}): number [exported]
      /** Count nodes matching filters (without fetching data) */
      refs in: 5 [call: 4, import: 1]
        - src/storage/node-repository.test.ts:18: import (module)
        - src/storage/node-repository.test.ts:2807: call (module)
        - src/storage/node-repository.test.ts:2808: call (module)
        - src/storage/node-repository.test.ts:2809: call (module)
        - src/storage/node-repository.test.ts:2810: call (module)
    2770-2875: getConnectedNodes(db: Database.Database, nodeId: string, options: ConnectedNodesOptions = {}): ConnectedNodesResult [exported]
      /** Get all nodes connected to a specific node with graph traversal. Supports: - Multi-hop traversal (depth 1-5) - Direction filtering (incoming, outgoing, both) - Edge type filtering Based on specs/storage.md graph traversal query and specs/api.md GET /api/v1/nodes/:id/connected endpoint. */
      refs in: 15 [call: 14, import: 1]
        - src/storage/node-repository.test.ts:38: import (module)
        - src/storage/node-repository.test.ts:2819: call result
        - src/storage/node-repository.test.ts:2839: call result
        - src/storage/node-repository.test.ts:2861: call result
        - src/storage/node-repository.test.ts:2883: call result
        - src/storage/node-repository.test.ts:2902: call result
        - src/storage/node-repository.test.ts:2921: call result
        - src/storage/node-repository.test.ts:2942: call result
        - src/storage/node-repository.test.ts:2962: call result
        - src/storage/node-repository.test.ts:2979: call result
    2884-2931: getSubgraph(db: Database.Database, rootNodeIds: string[], options: ConnectedNodesOptions = {}): ConnectedNodesResult [exported]
      /** Get the subgraph for visualization - returns nodes and edges within a given depth from multiple root nodes. Unlike getConnectedNodes, this INCLUDES the root nodes in the result, which is useful for rendering a graph view starting from selected nodes. */
      refs in: 5 [call: 4, import: 1]
        - src/storage/node-repository.test.ts:57: import (module)
        - src/storage/node-repository.test.ts:3028: call result
        - src/storage/node-repository.test.ts:3049: call result
        - src/storage/node-repository.test.ts:3064: call result
        - src/storage/node-repository.test.ts:3085: call result
    2939-2993: findPath(db: Database.Database, fromNodeId: string, toNodeId: string, options: { maxDepth?: number } = {}): { nodeIds: {}; edges: {}; } [exported]
      /** Get the path between two nodes if one exists. Uses BFS to find the shortest path. Returns null if no path exists. */
      refs in: 6 [call: 5, import: 1]
        - src/storage/node-repository.test.ts:26: import (module)
        - src/storage/node-repository.test.ts:3102: call result
        - src/storage/node-repository.test.ts:3114: call result
        - src/storage/node-repository.test.ts:3133: call result
        - src/storage/node-repository.test.ts:3144: call result
        - src/storage/node-repository.test.ts:3164: call result
    2999-3009: getAncestors(db: Database.Database, nodeId: string, options: { maxDepth?: number; edgeTypes?: EdgeType[] } = {}): ConnectedNodesResult [exported]
      /** Get all ancestors of a node (nodes that lead TO this node). Follows incoming edges only. */
      refs in: 3 [call: 2, import: 1]
        - src/storage/node-repository.test.ts:27: import (module)
        - src/storage/node-repository.test.ts:3183: call result
        - src/storage/node-repository.test.ts:3203: call result
    3015-3025: getDescendants(db: Database.Database, nodeId: string, options: { maxDepth?: number; edgeTypes?: EdgeType[] } = {}): ConnectedNodesResult [exported]
      /** Get all descendants of a node (nodes that this node leads TO). Follows outgoing edges only. */
      refs in: 3 [call: 2, import: 1]
        - src/storage/node-repository.test.ts:39: import (module)
        - src/storage/node-repository.test.ts:3223: call result
        - src/storage/node-repository.test.ts:3243: call result
    3058-3068: edgeRowToEdge(row: EdgeRow): Edge [exported]
      /** Convert an Edge row from the database to an Edge object */
      refs in: 2 [call: 1, import: 1]
        - src/storage/node-repository.test.ts:25: import (module)
        - src/storage/node-repository.test.ts:1257: call converted
    3100-3307: agentOutputToNode(output: AgentNodeOutput, context: NodeConversionContext): Node [exported]
      /** Convert AgentNodeOutput from the analyzer to a full Node structure Fills in source, metadata, and identity fields from the job context */
      refs in: 24 [call: 22, import: 2]
        - src/daemon/worker.ts:26: import (module)
        - src/daemon/worker.ts:331: call Worker.node
        - src/storage/node-repository.test.ts:16: import (module)
        - src/storage/node-repository.test.ts:687: call newNode
        - src/storage/node-repository.test.ts:712: call (module)
        - src/storage/node-repository.test.ts:730: call newNode
        - src/storage/node-repository.test.ts:757: call (module)
        - src/storage/node-repository.test.ts:1719: call node
        - src/storage/node-repository.test.ts:1750: call node
        - src/storage/node-repository.test.ts:1775: call node
  imports:
    - ../daemon/processor.js
    - ../daemon/queue.js
    - ./node-storage.js
    - ./node-types.js
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
        - src/storage/node-repository.ts:17: import (module)
        - src/storage/node-repository.ts:38: extends RepositoryOptions
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
      refs in: 36 [call: 33, import: 3]
        - src/daemon/cli.test.ts:14: import (module)
        - src/daemon/cli.test.ts:583: call (module)
        - src/daemon/cli.test.ts:623: call (module)
        - src/daemon/cli.test.ts:624: call (module)
        - src/daemon/cli.test.ts:625: call (module)
        - src/daemon/cli.test.ts:665: call (module)
        - src/daemon/cli.test.ts:666: call (module)
        - src/daemon/cli.test.ts:698: call (module)
        - src/daemon/cli.test.ts:717: call (module)
        - src/daemon/cli.test.ts:745: call (module)
    87-102: readNode(nodeId: string, version: number, timestamp: string, options: NodeStorageOptions = {}): Node [exported]
      /** Read a node from JSON file storage */
      refs in: 3 [call: 2, import: 1]
        - src/storage/node-storage.test.ts:20: import (module)
        - src/storage/node-storage.test.ts:186: call readBack
        - src/storage/node-storage.test.ts:219: call (module)
    107-114: readNodeFromPath(filePath: string): Node [exported]
      /** Read a node by file path */
      refs in: 23 [call: 14, import: 9]
        - src/api/routes/nodes.ts:22: import (module)
        - src/api/routes/nodes.ts:148: call node
        - src/api/routes/signals.ts:13: import (module)
        - src/api/routes/signals.ts:145: call node
        - src/api/routes/signals.ts:219: call node
        - src/daemon/cli.test.ts:14: import (module)
        - src/daemon/cli.test.ts:605: call fullNode
        - src/daemon/cli.test.ts:684: call fullNode
        - src/daemon/cli.test.ts:732: call fullNode
        - src/daemon/cli.ts:36: import (module)
    119-128: nodeExists(nodeId: string, version: number, timestamp: string, options: NodeStorageOptions = {}): boolean [exported]
      /** Check if a node file exists */
      refs in: 3 [call: 2, import: 1]
        - src/storage/node-storage.test.ts:17: import (module)
        - src/storage/node-storage.test.ts:258: call (module)
        - src/storage/node-storage.test.ts:271: call (module)
    134-175: listNodeFiles(options: NodeStorageOptions = {}): {} [exported]
      /** List all node files in the storage directory Returns array of file paths */
      refs in: 7 [call: 5, import: 2]
        - src/daemon/cli.ts:34: import (module)
        - src/daemon/cli.ts:953: call files
        - src/storage/node-storage.test.ts:15: import (module)
        - src/storage/node-storage.test.ts:285: call files
        - src/storage/node-storage.test.ts:295: call files
        - src/storage/node-storage.test.ts:341: call files
        - src/storage/node-storage.ts:185: call allFiles
    181-202: listNodeVersions(nodeId: string, options: NodeStorageOptions = {}): {} [exported]
      /** List all versions of a specific node Returns array of { version, path } sorted by version ascending */
      refs in: 7 [call: 5, import: 2]
        - src/storage/node-repository.ts:14: import (module)
        - src/storage/node-repository.ts:572: call versions
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
        - src/daemon/cli.ts:35: import (module)
        - src/daemon/cli.ts:961: call parsed
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

src/storage/node-types.ts [1-113]
  function:
    25-27: generateNodeId(): string [exported]
      /** Generate a unique 16-character hex node ID Uses first 16 chars of UUID (64 bits of entropy) */
      refs in: 13 [call: 9, import: 4]
        - src/daemon/cli.test.ts:16: import (module)
        - src/daemon/cli.test.ts:491: call id
        - src/daemon/cli.test.ts:645: call nodeId
        - src/storage/node-repository.test.ts:78: import (module)
        - src/storage/node-repository.test.ts:87: call id
        - src/storage/node-repository.ts:21: import (module)
        - src/storage/node-storage.test.ts:29: import (module)
        - src/storage/node-storage.test.ts:37: call id
        - src/storage/node-storage.test.ts:368: call nodeId
        - src/storage/node-storage.test.ts:448: call nodeId
    43-53: generateDeterministicNodeId(sessionFile: string, segmentStart: string, segmentEnd: string): string [exported]
      /** Generate a deterministic 16-character hex node ID based on session and segment. This ensures idempotent ingestion - re-running the same job produces the same ID. The ID is derived from: - Session file path - Segment start entry ID - Segment end entry ID Uses length-prefix encoding to prevent collisions from inputs containing delimiter characters (e.g., "a:b" + "c" vs "a" + "b:c"). Two jobs with the same inputs will always produce the same node ID. */
      refs in: 14 [call: 12, import: 2]
        - src/storage/node-repository.ts:20: import (module)
        - src/storage/node-repository.ts:3131: call agentOutputToNode
        - src/storage/node-storage.test.ts:28: import (module)
        - src/storage/node-storage.test.ts:762: call id
        - src/storage/node-storage.test.ts:771: call id1
        - src/storage/node-storage.test.ts:776: call id2
        - src/storage/node-storage.test.ts:785: call id1
        - src/storage/node-storage.test.ts:790: call id2
        - src/storage/node-storage.test.ts:799: call id1
        - src/storage/node-storage.test.ts:804: call id2
    58-60: nodeRef(nodeId: string, version: number): string [exported]
      /** Create a full node reference with version */
    65-74: parseNodeRef(ref: string): { nodeId: string; version: number; } [exported]
      /** Parse a node reference into id and version */
    79-89: emptyLessons(): LessonsByLevel [exported]
      /** Create an empty lessons structure */
      refs in: 21 [call: 18, import: 3]
        - src/daemon/cli.test.ts:17: import (module)
        - src/daemon/cli.test.ts:522: call createTestNode
        - src/storage/node-repository.test.ts:76: import (module)
        - src/storage/node-repository.test.ts:125: call createTestNode
        - src/storage/node-repository.test.ts:343: call node
        - src/storage/node-repository.test.ts:582: call node
        - src/storage/node-repository.test.ts:601: call updatedNode
        - src/storage/node-repository.test.ts:641: call node
        - src/storage/node-repository.test.ts:786: call node1
        - src/storage/node-repository.test.ts:801: call node2
    94-102: emptyObservations(): ModelObservations [exported]
      /** Create an empty observations structure */
      refs in: 25 [call: 22, import: 3]
        - src/daemon/cli.test.ts:18: import (module)
        - src/daemon/cli.test.ts:523: call createTestNode
        - src/storage/node-repository.test.ts:77: import (module)
        - src/storage/node-repository.test.ts:137: call createTestNode
        - src/storage/node-repository.test.ts:375: call node
        - src/storage/node-repository.test.ts:398: call node
        - src/storage/node-repository.test.ts:3416: call node1
        - src/storage/node-repository.test.ts:3443: call node2
        - src/storage/node-repository.test.ts:3491: call node
        - src/storage/node-repository.test.ts:3533: call node1
    107-112: emptyDaemonMeta(): DaemonMeta [exported]
      /** Create an empty daemon meta structure */
      refs in: 6 [call: 3, import: 3]
        - src/daemon/cli.test.ts:19: import (module)
        - src/daemon/cli.test.ts:536: call createTestNode
        - src/storage/node-repository.test.ts:75: import (module)
        - src/storage/node-repository.test.ts:160: call createTestNode
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
        - src/cli.ts:61: import (module)
        - src/cli.ts:594: call insights
        - src/cli.ts:737: call (module)
        - src/prompt/agents-generator.ts:21: import (module)
        - src/prompt/agents-generator.ts:143: call insights
        - src/prompt/agents-generator.ts:151: call generalToolErrors
        - src/prompt/prompt-generator.ts:15: import (module)
        - src/prompt/prompt-generator.ts:263: call insights
    254-268: getInsight(db: Database.Database, id: string): any [exported]
      refs in: 13 [call: 9, import: 4]
        - src/api/routes/prompt-learning.ts:13: import (module)
        - src/api/routes/prompt-learning.ts:146: call insight
        - src/cli.ts:60: import (module)
        - src/cli.ts:645: call insight
        - src/cli.ts:677: call insight
        - src/cli.ts:729: call insight
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
        - src/cli.ts:62: import (module)
        - src/cli.ts:651: call (module)
        - src/cli.ts:683: call (module)
        - src/prompt/effectiveness.ts:25: import (module)
        - src/prompt/effectiveness.ts:779: call autoDisableIneffectiveInsights
        - src/prompt/prompt-generator.ts:16: import (module)
        - src/prompt/prompt-generator.ts:329: call updateInsightPromptTexts
        - src/storage/pattern-repository.test.ts:12: import (module)
  imports:
    - ../types/index.js
    - better-sqlite3

---
Files: 38
Estimated tokens: 35,295 (codebase: ~924,935)
