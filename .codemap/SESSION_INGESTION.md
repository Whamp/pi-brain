# Project Overview

## Languages
- typescript: 37 files

## Statistics
- Total files: 37
- Total symbols: 186
  - function: 111
  - interface: 44
  - variable: 13
  - class: 10
  - type: 8

---

src/daemon/cli.test.ts [1-471]
  imports:
    - ../storage/database.js
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
    84-89: interface QueueStatus [exported]
      /** Queue status info */
      refs out: 4 [type: 4]
        - src/daemon/cli.ts:85: type QueueStats -> src/daemon/queue.ts
        - src/daemon/cli.ts:86: type AnalysisJob -> src/daemon/queue.ts
        - src/daemon/cli.ts:87: type AnalysisJob -> src/daemon/queue.ts
        - src/daemon/cli.ts:88: type AnalysisJob -> src/daemon/queue.ts
    92-97: interface HealthCheckResult [exported]
      /** Health check result */
    100-104: interface HealthStatus [exported]
      /** Overall health status */
      refs out: 1 [type: 1]
        - src/daemon/cli.ts:103: type HealthCheckResult -> src/daemon/cli.ts
    107-110: interface OutputOptions [exported]
      /** CLI output options */
    237-240: interface StartOptions [exported]
      /** Start options */
    243-246: interface StopOptions [exported]
      /** Stop options */
  function:
    119-130: readPidFile(): number [exported]
      /** Read the daemon PID from the PID file */
      refs out: 2 [call: 2]
        - src/daemon/cli.ts:121: call existsSync -> external
        - src/daemon/cli.ts:126: call isNaN -> external
    135-141: writePidFile(pid: number): void [exported]
      /** Write the daemon PID to the PID file */
      refs out: 4 [call: 4]
        - src/daemon/cli.ts:137: call existsSync -> external
        - src/daemon/cli.ts:138: call mkdirSync -> external
        - src/daemon/cli.ts:140: call writeFileSync -> external
        - src/daemon/cli.ts:140: call String -> external
    146-154: removePidFile(): void [exported]
      /** Remove the PID file */
      refs out: 2 [call: 2]
        - src/daemon/cli.ts:148: call existsSync -> external
        - src/daemon/cli.ts:149: call unlinkSync -> external
    159-167: isProcessRunning(pid: number): boolean [exported]
      /** Check if a process with the given PID is running */
      refs out: 1 [call: 1]
        - src/daemon/cli.ts:162: call kill -> external
    172-185: isDaemonRunning(): { running: boolean; pid: number; } [exported]
      /** Check if the daemon is currently running */
      refs out: 2 [call: 2]
        - src/daemon/cli.ts:178: call isProcessRunning -> src/daemon/cli.ts
        - src/daemon/cli.ts:183: call removePidFile -> src/daemon/cli.ts
    194-215: formatUptime(seconds: number): string [exported]
      /** Format uptime in a human-readable way */
      refs out: 5 [call: 5]
        - src/daemon/cli.ts:196: call floor -> external
        - src/daemon/cli.ts:205: call push -> external
        - src/daemon/cli.ts:208: call push -> external
        - src/daemon/cli.ts:211: call push -> external
        - src/daemon/cli.ts:214: call join -> external
    220-230: getProcessUptime(): number [exported]
      /** Get process uptime (approximate based on PID file modification time) */
      refs out: 2 [call: 2]
        - src/daemon/cli.ts:222: call existsSync -> external
        - src/daemon/cli.ts:226: call now -> external
    251-361: async startDaemon(options: StartOptions = {}): Promise<{ success: boolean; message: string; pid?: number; }> [exported]
      /** Start the daemon process */
      refs out: 18 [call: 13, type: 5]
        - src/daemon/cli.ts:251: type StartOptions -> src/daemon/cli.ts
        - src/daemon/cli.ts:251: type Promise -> external
        - src/daemon/cli.ts:274: type Error -> external
        - src/daemon/cli.ts:284: type Error -> external
        - src/daemon/cli.ts:290: call writePidFile -> src/daemon/cli.ts
        - src/daemon/cli.ts:303: call existsSync -> external
        - src/daemon/cli.ts:304: call mkdirSync -> external
        - src/daemon/cli.ts:311: call push -> external
        - src/daemon/cli.ts:316: call spawn -> external
        - src/daemon/cli.ts:325: call closeSync -> external
    366-428: async stopDaemon(options: StopOptions = {}): Promise<{ success: boolean; message: string; }> [exported]
      /** Stop the daemon process */
      refs out: 9 [call: 7, type: 2]
        - src/daemon/cli.ts:366: type StopOptions -> src/daemon/cli.ts
        - src/daemon/cli.ts:366: type Promise -> external
        - src/daemon/cli.ts:385: call kill -> external
        - src/daemon/cli.ts:388: call removePidFile -> src/daemon/cli.ts
        - src/daemon/cli.ts:397: call now -> external
        - src/daemon/cli.ts:398: call isProcessRunning -> src/daemon/cli.ts
        - src/daemon/cli.ts:399: call removePidFile -> src/daemon/cli.ts
        - src/daemon/cli.ts:405: call sleep -> src/daemon/cli.ts
        - src/daemon/cli.ts:417: call removePidFile -> src/daemon/cli.ts
    433-445: getDaemonStatus(configPath?: string): DaemonStatus [exported]
      /** Get daemon status information */
      refs out: 2 [call: 1, type: 1]
        - src/daemon/cli.ts:433: type DaemonStatus -> src/daemon/cli.ts
        - src/daemon/cli.ts:443: call join -> external
    454-483: getQueueStatus(configPath?: string): QueueStatus [exported]
      /** Get queue status information */
      refs out: 5 [call: 4, type: 1]
        - src/daemon/cli.ts:454: type QueueStatus -> src/daemon/cli.ts
        - src/daemon/cli.ts:459: call existsSync -> external
        - src/daemon/cli.ts:476: call migrate -> src/storage/database.ts
        - src/daemon/cli.ts:479: call getQueueStatusSummary -> src/daemon/queue.ts
        - src/daemon/cli.ts:481: call close -> external
    488-541: queueAnalysis(sessionPath: string, configPath?: string): { success: boolean; message: string; jobId?: string; } [exported]
      /** Queue a session for analysis */
      refs out: 5 [call: 5]
        - src/daemon/cli.ts:494: call existsSync -> external
        - src/daemon/cli.ts:501: call endsWith -> external
        - src/daemon/cli.ts:513: call migrate -> src/storage/database.ts
        - src/daemon/cli.ts:518: call QueueManager.hasExistingJob -> src/daemon/queue.ts
        - src/daemon/cli.ts:539: call close -> external
    761-791: async runHealthChecks(configPath?: string): Promise<HealthStatus> [exported]
      /** Run all health checks */
      refs out: 2 [type: 2]
        - src/daemon/cli.ts:763: type Promise -> external
        - src/daemon/cli.ts:763: type HealthStatus -> src/daemon/cli.ts
    800-821: formatDaemonStatus(status: DaemonStatus, _options: OutputOptions = {}): string [exported]
      /** Format daemon status for display */
      refs out: 6 [call: 4, type: 2]
        - src/daemon/cli.ts:801: type DaemonStatus -> src/daemon/cli.ts
        - src/daemon/cli.ts:802: type OutputOptions -> src/daemon/cli.ts
        - src/daemon/cli.ts:811: call push -> external
        - src/daemon/cli.ts:815: call push -> external
        - src/daemon/cli.ts:818: call push -> external
        - src/daemon/cli.ts:820: call join -> external
    826-876: formatQueueStatus(queueStatus: QueueStatus, _options: OutputOptions = {}): string [exported]
      /** Format queue status for display */
      refs out: 20 [call: 18, type: 2]
        - src/daemon/cli.ts:827: type QueueStatus -> src/daemon/cli.ts
        - src/daemon/cli.ts:828: type OutputOptions -> src/daemon/cli.ts
        - src/daemon/cli.ts:839: call push -> external
        - src/daemon/cli.ts:839: call toFixed -> external
        - src/daemon/cli.ts:843: call push -> external
        - src/daemon/cli.ts:844: call push -> external
        - src/daemon/cli.ts:847: call push -> external
        - src/daemon/cli.ts:847: call slice -> external
        - src/daemon/cli.ts:847: call padEnd -> external
        - src/daemon/cli.ts:852: call push -> external
    891-914: formatHealthStatus(status: HealthStatus, _options: OutputOptions = {}): string [exported]
      /** Format health check results for display */
      refs out: 7 [call: 5, type: 2]
        - src/daemon/cli.ts:892: type HealthStatus -> src/daemon/cli.ts
        - src/daemon/cli.ts:893: type OutputOptions -> src/daemon/cli.ts
        - src/daemon/cli.ts:899: call push -> external
        - src/daemon/cli.ts:902: call push -> external
        - src/daemon/cli.ts:908: call push -> external
        - src/daemon/cli.ts:910: call push -> external
        - src/daemon/cli.ts:913: call join -> external
    929-1049: rebuildIndex(configPath?: string): { success: boolean; message: string; count: number; } [exported]
      /** Rebuild the SQLite index from JSON files */
      refs out: 17 [call: 16, type: 1]
        - src/daemon/cli.ts:949: call migrate -> src/storage/database.ts
        - src/daemon/cli.ts:952: call log -> external
        - src/daemon/cli.ts:968: call set -> external
        - src/daemon/cli.ts:972: call log -> external
        - src/daemon/cli.ts:975: call log -> external
        - src/daemon/cli.ts:977: call clearAllData -> src/storage/node-repository.ts
        - src/daemon/cli.ts:980: call log -> external
        - src/daemon/cli.ts:999: call processInsertBatch -> src/daemon/cli.ts
        - src/daemon/cli.ts:1000: call Socket.write -> external
        - src/daemon/cli.ts:1004: call log -> external
  variable:
    69-69: any [exported]
      /** PID file location */
      refs out: 1 [call: 1]
        - src/daemon/cli.ts:69: call join -> external
    72-72: any [exported]
      /** Log file location */
      refs out: 1 [call: 1]
        - src/daemon/cli.ts:72: call join -> external
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
  interface:
    141-144: interface ConnectionResult [exported]
      refs out: 1 [type: 1]
        - src/daemon/connection-discovery.ts:143: type Edge -> src/types/index.ts
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

src/daemon/facet-discovery.test.ts [1-833]
  imports:
    - ../storage/database.js
    - ./facet-discovery.js
    - better-sqlite3
    - node:fs
    - node:os
    - node:path
    - vitest

src/daemon/facet-discovery.ts [1-1666]
  class:
    594-1637: class FacetDiscovery [exported]
  interface:
    91-100: interface ClusterAnalysisConfig [exported]
      /** Configuration for LLM cluster analysis */
    105-113: interface ClusterAnalysisResult [exported]
      /** Result from analyzing a single cluster */
    118-123: interface ClusterAnalysisBatchResult [exported]
      /** Result from analyzing multiple clusters */
      refs out: 1 [type: 1]
        - src/daemon/facet-discovery.ts:122: type ClusterAnalysisResult -> src/daemon/facet-discovery.ts
    132-136: interface EmbeddingProvider [exported]
      /** Interface for embedding providers */
      refs out: 1 [type: 1]
        - src/daemon/facet-discovery.ts:133: type Promise -> external
    582-586: interface FacetDiscoveryLogger [exported]
  function:
    141-168: createEmbeddingProvider(config: EmbeddingConfig): EmbeddingProvider [exported]
      /** Create an embedding provider from config */
      refs out: 7 [call: 3, instantiate: 2, type: 2]
        - src/daemon/facet-discovery.ts:142: type EmbeddingConfig -> src/types/index.ts
        - src/daemon/facet-discovery.ts:143: type EmbeddingProvider -> src/daemon/facet-discovery.ts
        - src/daemon/facet-discovery.ts:146: call createOllamaProvider -> src/daemon/facet-discovery.ts
        - src/daemon/facet-discovery.ts:153: instantiate Error -> external
        - src/daemon/facet-discovery.ts:155: call createOpenAIProvider -> src/daemon/facet-discovery.ts
        - src/daemon/facet-discovery.ts:162: call createMockProvider -> src/daemon/facet-discovery.ts
        - src/daemon/facet-discovery.ts:165: instantiate Error -> external
    310-377: kMeansClustering(embeddings: number[][], k: number, maxIterations = 100): KMeansResult [exported]
      /** Simple K-means++ clustering implementation */
      refs out: 3 [call: 2, type: 1]
        - src/daemon/facet-discovery.ts:314: type KMeansResult -> src/daemon/facet-discovery.ts
        - src/daemon/facet-discovery.ts:321: call map -> external
        - src/daemon/facet-discovery.ts:322: call map -> external
    420-439: hdbscanClustering(embeddings: number[][], minClusterSize = 3, minSamples = 3): {} [exported]
      /** HDBSCAN-like density-based clustering (simplified) */
      refs out: 2 [call: 2]
        - src/daemon/facet-discovery.ts:426: call fill -> external
        - src/daemon/facet-discovery.ts:426: call from -> external
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

src/daemon/pattern-aggregation.ts [1-326]
  class:
    22-325: class PatternAggregator [exported]
  imports:
    - better-sqlite3
    - node:crypto

src/daemon/processor.test.ts [1-665]
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
    692-697: interface ProcessorConfig [exported]
      /** Processor configuration */
      refs out: 1 [type: 1]
        - src/daemon/processor.ts:696: type ProcessorLogger -> src/daemon/processor.ts
  function:
    170-178: async checkSkillAvailable(skillName: string): Promise<boolean> [exported]
      /** Check if a skill is available by looking for SKILL.md */
      refs out: 2 [call: 1, type: 1]
        - src/daemon/processor.ts:170: type Promise -> external
        - src/daemon/processor.ts:173: call access -> external
    183-199: async getSkillAvailability(): Promise<Map<string, SkillInfo>> [exported]
      /** Get availability information for all skills */
      refs out: 4 [call: 1, type: 3]
        - src/daemon/processor.ts:183: type Promise -> external
        - src/daemon/processor.ts:183: type Map -> external
        - src/daemon/processor.ts:183: type SkillInfo -> src/daemon/processor.ts
        - src/daemon/processor.ts:191: call set -> external
    205-218: async validateRequiredSkills(): Promise<void> [exported]
      /** Validate that all required skills are available Throws if any required skill is missing */
      refs out: 3 [call: 1, instantiate: 1, type: 1]
        - src/daemon/processor.ts:205: type Promise -> external
        - src/daemon/processor.ts:213: instantiate Error -> external
        - src/daemon/processor.ts:214: call join -> external
    224-230: async buildSkillsArg(): Promise<string> [exported]
      /** Build the skills argument for pi invocation Returns comma-separated list of available skills */
      refs out: 4 [call: 3, type: 1]
        - src/daemon/processor.ts:224: type Promise -> external
        - src/daemon/processor.ts:227: call join -> external
        - src/daemon/processor.ts:227: call filter -> external
        - src/daemon/processor.ts:228: call get -> external
    239-271: buildAnalysisPrompt(job: AnalysisJob): string [exported]
      /** Build the analysis prompt for a job */
      refs out: 10 [call: 9, type: 1]
        - src/daemon/processor.ts:239: type AnalysisJob -> src/daemon/queue.ts
        - src/daemon/processor.ts:247: call push -> external
        - src/daemon/processor.ts:251: call push -> external
        - src/daemon/processor.ts:253: call push -> external
        - src/daemon/processor.ts:259: call push -> external
        - src/daemon/processor.ts:260: call push -> external
        - src/daemon/processor.ts:261: call push -> external
        - src/daemon/processor.ts:265: call push -> external
        - src/daemon/processor.ts:266: call push -> external
        - src/daemon/processor.ts:270: call join -> external
    304-420: async invokeAgent(job: AnalysisJob, config: DaemonConfig, logger: ProcessorLogger = consoleLogger): Promise<AgentResult> [exported]
      /** Invoke the pi agent to analyze a session */
      refs out: 13 [call: 9, type: 4]
        - src/daemon/processor.ts:305: type AnalysisJob -> src/daemon/queue.ts
        - src/daemon/processor.ts:307: type ProcessorLogger -> src/daemon/processor.ts
        - src/daemon/processor.ts:308: type Promise -> external
        - src/daemon/processor.ts:308: type AgentResult -> src/daemon/processor.ts
        - src/daemon/processor.ts:313: call access -> external
        - src/daemon/processor.ts:320: call now -> external
        - src/daemon/processor.ts:326: call access -> external
        - src/daemon/processor.ts:333: call now -> external
        - src/daemon/processor.ts:345: call now -> external
        - src/daemon/processor.ts:369: call debug -> src/daemon/processor.ts
    526-595: parseAgentOutput(stdout: string, logger: ProcessorLogger = consoleLogger): Omit<AgentResult, "exitCode" | "durationMs"> [exported]
      /** Parse the pi agent's JSON mode output */
      refs out: 9 [call: 5, type: 4]
        - src/daemon/processor.ts:528: type ProcessorLogger -> src/daemon/processor.ts
        - src/daemon/processor.ts:529: type Omit -> external
        - src/daemon/processor.ts:529: type AgentResult -> src/daemon/processor.ts
        - src/daemon/processor.ts:535: call trim -> external
        - src/daemon/processor.ts:539: call push -> external
        - src/daemon/processor.ts:539: call parse -> external
        - src/daemon/processor.ts:539: type PiJsonEvent -> src/daemon/processor.ts
        - src/daemon/processor.ts:542: call debug -> src/daemon/processor.ts
        - src/daemon/processor.ts:542: call slice -> external
    601-634: extractNodeFromText(text: string, logger: ProcessorLogger = consoleLogger): AgentNodeOutput [exported]
      /** Extract node JSON from text content Handles both raw JSON and code-fenced JSON */
      refs out: 8 [call: 6, type: 2]
        - src/daemon/processor.ts:603: type ProcessorLogger -> src/daemon/processor.ts
        - src/daemon/processor.ts:604: type AgentNodeOutput -> src/daemon/processor.ts
        - src/daemon/processor.ts:610: call isValidNodeOutput -> src/daemon/processor.ts
        - src/daemon/processor.ts:613: call warn -> src/daemon/processor.ts
        - src/daemon/processor.ts:615: call warn -> src/daemon/processor.ts
        - src/daemon/processor.ts:624: call isValidNodeOutput -> src/daemon/processor.ts
        - src/daemon/processor.ts:627: call warn -> src/daemon/processor.ts
        - src/daemon/processor.ts:629: call warn -> src/daemon/processor.ts
    639-685: isValidNodeOutput(obj: unknown): boolean [exported]
      /** Basic validation that output matches expected schema */
      refs out: 1 [type: 1]
        - src/daemon/processor.ts:639: type AgentNodeOutput -> src/daemon/processor.ts
    744-746: createProcessor(config: ProcessorConfig): JobProcessor [exported]
      /** Create a job processor */
      refs out: 3 [instantiate: 1, type: 2]
        - src/daemon/processor.ts:744: type ProcessorConfig -> src/daemon/processor.ts
        - src/daemon/processor.ts:744: type JobProcessor -> src/daemon/processor.ts
        - src/daemon/processor.ts:745: instantiate JobProcessor -> src/daemon/processor.ts
  variable:
    143-148: ProcessorLogger [exported]
      /** Default console logger */
      refs out: 5 [call: 4, type: 1]
        - src/daemon/processor.ts:143: type ProcessorLogger -> src/daemon/processor.ts
        - src/daemon/processor.ts:144: call debug -> external
        - src/daemon/processor.ts:145: call log -> external
        - src/daemon/processor.ts:146: call warn -> external
        - src/daemon/processor.ts:147: call error -> external
    155-155: readonly ["rlm"] [exported]
      /** Required skills for analysis - must be available */
      refs out: 1 [type: 1]
        - src/daemon/processor.ts:155: type const -> external
    158-158: readonly ["codemap"] [exported]
      /** Optional skills - enhance analysis but not required */
      refs out: 1 [type: 1]
        - src/daemon/processor.ts:158: type const -> external
    161-161: any [exported]
      /** Skills directory location */
      refs out: 2 [call: 2]
        - src/daemon/processor.ts:161: call join -> external
        - src/daemon/processor.ts:161: call homedir -> external
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
    48-66: interface QueryResponse [exported]
      /** Query response to return to the client */
    91-100: interface QueryProcessorConfig [exported]
      refs out: 2 [type: 2]
        - src/daemon/query-processor.ts:93: type Database -> external
        - src/daemon/query-processor.ts:97: type ProcessorLogger -> src/daemon/processor.ts
  function:
    105-181: async processQuery(request: QueryRequest, config: QueryProcessorConfig): Promise<QueryResponse> [exported]
      /** Process a natural language query against the knowledge graph */
      refs out: 12 [call: 8, type: 4]
        - src/daemon/query-processor.ts:106: type QueryRequest -> src/daemon/query-processor.ts
        - src/daemon/query-processor.ts:107: type QueryProcessorConfig -> src/daemon/query-processor.ts
        - src/daemon/query-processor.ts:108: type Promise -> external
        - src/daemon/query-processor.ts:108: type QueryResponse -> src/daemon/query-processor.ts
        - src/daemon/query-processor.ts:112: call info -> src/daemon/processor.ts
        - src/daemon/query-processor.ts:112: call slice -> external
        - src/daemon/query-processor.ts:122: call info -> src/daemon/processor.ts
        - src/daemon/query-processor.ts:157: call error -> src/daemon/processor.ts
        - src/daemon/query-processor.ts:162: call map -> external
        - src/daemon/query-processor.ts:173: call map -> external
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
    699-701: generateJobId(): string [exported]
      /** Generate a unique job ID Uses the same format as node IDs: 16-char hex string */
      refs out: 3 [call: 3]
        - src/daemon/queue.ts:700: call slice -> external
        - src/daemon/queue.ts:700: call replaceAll -> external
        - src/daemon/queue.ts:700: call randomUUID -> external
    706-708: createQueueManager(db: Database.Database): QueueManager [exported]
      /** Create a queue manager from a database */
      refs out: 3 [instantiate: 1, type: 2]
        - src/daemon/queue.ts:706: type Database -> external
        - src/daemon/queue.ts:706: type QueueManager -> src/daemon/queue.ts
        - src/daemon/queue.ts:707: instantiate QueueManager -> src/daemon/queue.ts
    714-732: getQueueStatusSummary(db: Database.Database): { stats: QueueStats; pendingJobs: {}; runningJobs: {}; recentFailed: {}; } [exported]
      /** Get aggregated queue status Used by CLI and API */
      refs out: 5 [type: 5]
        - src/daemon/queue.ts:714: type Database -> external
        - src/daemon/queue.ts:715: type QueueStats -> src/daemon/queue.ts
        - src/daemon/queue.ts:716: type AnalysisJob -> src/daemon/queue.ts
        - src/daemon/queue.ts:717: type AnalysisJob -> src/daemon/queue.ts
        - src/daemon/queue.ts:718: type AnalysisJob -> src/daemon/queue.ts
  variable:
    23-34: PRIORITY [exported]
      /** Priority levels (lower = higher priority) */
      refs out: 1 [type: 1]
        - src/daemon/queue.ts:34: type const -> external
  imports:
    - better-sqlite3

src/daemon/scheduler.test.ts [1-718]
  imports:
    - ./queue.js
    - ./scheduler.js
    - better-sqlite3
    - vitest

src/daemon/scheduler.ts [1-757]
  class:
    115-696: class Scheduler [exported]
      /** Scheduler manages cron-based scheduled jobs */
  interface:
    49-56: interface ScheduledJobResult [exported]
      /** Result of a scheduled job execution */
      refs out: 3 [type: 3]
        - src/daemon/scheduler.ts:50: type ScheduledJobType -> src/daemon/scheduler.ts
        - src/daemon/scheduler.ts:51: type Date -> external
        - src/daemon/scheduler.ts:52: type Date -> external
    59-63: interface SchedulerLogger [exported]
      /** Logger interface for scheduler */
    80-98: interface SchedulerConfig [exported]
      /** Scheduler configuration */
    101-110: interface SchedulerStatus [exported]
      /** Scheduler state */
      refs out: 4 [type: 4]
        - src/daemon/scheduler.ts:104: type ScheduledJobType -> src/daemon/scheduler.ts
        - src/daemon/scheduler.ts:106: type Date -> external
        - src/daemon/scheduler.ts:107: type Date -> external
        - src/daemon/scheduler.ts:108: type ScheduledJobResult -> src/daemon/scheduler.ts
  type:
    42-46: ScheduledJobType = | "reanalysis"
  | "connection_discovery"
  | "pattern_aggregation"
  | "clustering" [exported]
      /** Job types that can be scheduled */
  function:
    701-720: createScheduler(config: DaemonConfig, queue: QueueManager, db: Database.Database, logger?: SchedulerLogger): Scheduler [exported]
      /** Create a scheduler from daemon config */
      refs out: 6 [instantiate: 1, type: 5]
        - src/daemon/scheduler.ts:702: type DaemonConfig -> src/config/types.ts
        - src/daemon/scheduler.ts:703: type QueueManager -> src/daemon/queue.ts
        - src/daemon/scheduler.ts:704: type Database -> external
        - src/daemon/scheduler.ts:705: type SchedulerLogger -> src/daemon/scheduler.ts
        - src/daemon/scheduler.ts:706: type Scheduler -> src/daemon/scheduler.ts
        - src/daemon/scheduler.ts:707: instantiate Scheduler -> src/daemon/scheduler.ts
    726-735: isValidCronExpression(expression: string): boolean [exported]
      /** Validate a cron expression Returns true if valid, false otherwise */
      refs out: 1 [call: 1]
        - src/daemon/scheduler.ts:730: call Cron.stop -> external
    740-756: getNextRunTimes(expression: string, count = 5): {} [exported]
      /** Get the next N run times for a cron expression */
      refs out: 4 [call: 3, type: 1]
        - src/daemon/scheduler.ts:740: type Date -> external
        - src/daemon/scheduler.ts:747: call push -> external
        - src/daemon/scheduler.ts:748: call Cron.nextRun -> external
        - src/daemon/scheduler.ts:751: call Cron.stop -> external
  variable:
    66-70: SchedulerLogger [exported]
      /** Default no-op logger */
      refs out: 1 [type: 1]
        - src/daemon/scheduler.ts:66: type SchedulerLogger -> src/daemon/scheduler.ts
    73-77: SchedulerLogger [exported]
      /** Console logger for production use */
      refs out: 4 [call: 3, type: 1]
        - src/daemon/scheduler.ts:73: type SchedulerLogger -> src/daemon/scheduler.ts
        - src/daemon/scheduler.ts:74: call log -> external
        - src/daemon/scheduler.ts:75: call error -> external
        - src/daemon/scheduler.ts:76: call debug -> external
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

src/daemon/watcher.test.ts [1-835]
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
      refs out: 2 [instantiate: 1, type: 1]
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

src/daemon/worker.test.ts [1-442]
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

src/daemon/worker.ts [1-535]
  class:
    113-474: class Worker [exported]
      /** Worker that processes jobs from the analysis queue */
  interface:
    55-70: interface WorkerConfig [exported]
      /** Worker configuration */
      refs out: 8 [type: 8]
        - src/daemon/worker.ts:61: type RetryPolicy -> src/daemon/errors.ts
        - src/daemon/worker.ts:63: type ProcessorLogger -> src/daemon/processor.ts
        - src/daemon/worker.ts:65: type AnalysisJob -> src/daemon/queue.ts
        - src/daemon/worker.ts:65: type Node -> src/types/index.ts
        - src/daemon/worker.ts:65: type Promise -> external
        - src/daemon/worker.ts:67: type AnalysisJob -> src/daemon/queue.ts
        - src/daemon/worker.ts:67: type Error -> external
        - src/daemon/worker.ts:67: type Promise -> external
    73-88: interface WorkerStatus [exported]
      /** Worker status */
      refs out: 2 [type: 2]
        - src/daemon/worker.ts:79: type AnalysisJob -> src/daemon/queue.ts
        - src/daemon/worker.ts:87: type Date -> external
    91-104: interface JobProcessingResult [exported]
      /** Result from processing a single job */
      refs out: 2 [type: 2]
        - src/daemon/worker.ts:95: type AnalysisJob -> src/daemon/queue.ts
        - src/daemon/worker.ts:99: type Error -> external
  function:
    483-485: createWorker(config: WorkerConfig): Worker [exported]
      /** Create a worker instance */
      refs out: 3 [instantiate: 1, type: 2]
        - src/daemon/worker.ts:483: type WorkerConfig -> src/daemon/worker.ts
        - src/daemon/worker.ts:483: type Worker -> src/daemon/worker.ts
        - src/daemon/worker.ts:484: instantiate Worker -> src/daemon/worker.ts
    491-505: async processSingleJob(job: AnalysisJob, config: PiBrainConfig, db: Database.Database, logger?: ProcessorLogger): Promise<JobProcessingResult> [exported]
      /** Process a single job without the full worker loop Useful for one-off processing or testing */
      refs out: 7 [call: 2, type: 5]
        - src/daemon/worker.ts:492: type AnalysisJob -> src/daemon/queue.ts
        - src/daemon/worker.ts:494: type Database -> external
        - src/daemon/worker.ts:495: type ProcessorLogger -> src/daemon/processor.ts
        - src/daemon/worker.ts:496: type Promise -> external
        - src/daemon/worker.ts:496: type JobProcessingResult -> src/daemon/worker.ts
        - src/daemon/worker.ts:503: call Worker.initialize -> src/daemon/worker.ts
        - src/daemon/worker.ts:504: call Worker.processJob -> src/daemon/worker.ts
    510-534: handleJobError(error: Error, job: AnalysisJob, retryPolicy: RetryPolicy = DEFAULT_RETRY_POLICY): { shouldRetry: boolean; retryDelayMinutes: number; formattedError: string; category: ReturnType<any>; } [exported]
      /** Handle job error manually (for custom queue implementations) */
      refs out: 6 [call: 2, type: 4]
        - src/daemon/worker.ts:511: type Error -> external
        - src/daemon/worker.ts:512: type AnalysisJob -> src/daemon/queue.ts
        - src/daemon/worker.ts:513: type RetryPolicy -> src/daemon/errors.ts
        - src/daemon/worker.ts:518: type ReturnType -> external
        - src/daemon/worker.ts:530: call ceil -> external
        - src/daemon/worker.ts:531: call formatErrorForStorage -> src/daemon/errors.ts
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

src/parser/analyzer.ts [1-263]
  function:
    16-18: getDefaultSessionDir(): string [exported]
      /** Default session directory */
      refs out: 2 [call: 2]
        - src/parser/analyzer.ts:17: call join -> external
        - src/parser/analyzer.ts:17: call homedir -> external
    23-70: async scanSessions(sessionDir?: string): Promise<{}> [exported]
      /** Scan session directory and parse all sessions */
      refs out: 10 [call: 7, instantiate: 1, type: 2]
        - src/parser/analyzer.ts:25: type Promise -> external
        - src/parser/analyzer.ts:25: type SessionInfo -> src/types.ts
        - src/parser/analyzer.ts:36: call isDirectory -> external
        - src/parser/analyzer.ts:44: call endsWith -> external
        - src/parser/analyzer.ts:51: call push -> external
        - src/parser/analyzer.ts:53: call warn -> external
        - src/parser/analyzer.ts:57: call warn -> external
        - src/parser/analyzer.ts:61: instantiate Error -> external
        - src/parser/analyzer.ts:67: call sort -> external
        - src/parser/analyzer.ts:67: call localeCompare -> external
    75-95: findForkRelationships(sessions: SessionInfo[]): {} [exported]
      /** Find fork relationships between sessions */
      refs out: 5 [call: 3, type: 2]
        - src/parser/analyzer.ts:76: type SessionInfo -> src/types.ts
        - src/parser/analyzer.ts:77: type ForkRelationship -> src/types.ts
        - src/parser/analyzer.ts:82: call push -> external
        - src/parser/analyzer.ts:92: call sort -> external
        - src/parser/analyzer.ts:92: call localeCompare -> external
    100-132: groupByProject(sessions: SessionInfo[]): {} [exported]
      /** Group sessions by project (cwd) */
      refs out: 11 [call: 9, type: 2]
        - src/parser/analyzer.ts:100: type SessionInfo -> src/types.ts
        - src/parser/analyzer.ts:100: type ProjectGroup -> src/types.ts
        - src/parser/analyzer.ts:105: call has -> external
        - src/parser/analyzer.ts:106: call set -> external
        - src/parser/analyzer.ts:108: call push -> external
        - src/parser/analyzer.ts:108: call get -> external
        - src/parser/analyzer.ts:114: call sort -> external
        - src/parser/analyzer.ts:115: call localeCompare -> external
        - src/parser/analyzer.ts:118: call push -> external
        - src/parser/analyzer.ts:121: call reduce -> external
    138-145: decodeProjectDir(encodedName: string): string [exported]
      /** Decode project directory name to path e.g., "--home-will-projects-myapp--" → "/home/will/projects/myapp" */
      refs out: 3 [call: 3]
        - src/parser/analyzer.ts:139: call startsWith -> external
        - src/parser/analyzer.ts:139: call endsWith -> external
        - src/parser/analyzer.ts:144: call replaceAll -> external
    150-157: getProjectName(sessionPath: string): string [exported]
      /** Get project name from session path */
      refs out: 2 [call: 2]
        - src/parser/analyzer.ts:154: call decodeProjectDir -> src/parser/analyzer.ts
        - src/parser/analyzer.ts:156: call basename -> external
    162-167: filterByProject(sessions: SessionInfo[], projectPath: string): {} [exported]
      /** Filter sessions by project path */
      refs out: 3 [call: 1, type: 2]
        - src/parser/analyzer.ts:163: type SessionInfo -> src/types.ts
        - src/parser/analyzer.ts:165: type SessionInfo -> src/types.ts
        - src/parser/analyzer.ts:166: call filter -> external
    172-187: filterByDateRange(sessions: SessionInfo[], startDate?: Date, endDate?: Date): {} [exported]
      /** Filter sessions by date range */
      refs out: 5 [call: 1, type: 4]
        - src/parser/analyzer.ts:173: type SessionInfo -> src/types.ts
        - src/parser/analyzer.ts:174: type Date -> external
        - src/parser/analyzer.ts:175: type Date -> external
        - src/parser/analyzer.ts:176: type SessionInfo -> src/types.ts
        - src/parser/analyzer.ts:177: call filter -> external
    192-221: searchSessions(sessions: SessionInfo[], query: string): {} [exported]
      /** Search sessions for text content */
      refs out: 9 [call: 7, type: 2]
        - src/parser/analyzer.ts:193: type SessionInfo -> src/types.ts
        - src/parser/analyzer.ts:195: type SessionInfo -> src/types.ts
        - src/parser/analyzer.ts:203: call includes -> external
        - src/parser/analyzer.ts:203: call toLowerCase -> external
        - src/parser/analyzer.ts:204: call push -> external
        - src/parser/analyzer.ts:208: call includes -> external
        - src/parser/analyzer.ts:208: call toLowerCase -> external
        - src/parser/analyzer.ts:209: call push -> external
        - src/parser/analyzer.ts:216: call push -> external
    226-262: getOverallStats(sessions: SessionInfo[]): { totalSessions: number; totalEntries: number; totalMessages: number; totalTokens: number; totalCost: number; projectCount: number; forkCount: number; } [exported]
      /** Get session summary statistics */
      refs out: 2 [call: 1, type: 1]
        - src/parser/analyzer.ts:226: type SessionInfo -> src/types.ts
        - src/parser/analyzer.ts:243: call add -> external
  imports:
    - ../types.js
    - ./session.js
    - node:fs/promises
    - node:os
    - node:path

src/parser/boundary.test.ts [1-697]
  imports:
    - ../types.js
    - ./boundary.js
    - vitest

src/parser/boundary.ts [1-400]
  class:
    99-176: class LeafTracker [exported]
      /** Tracks the "current leaf" as entries are processed. In a session tree, the leaf is the most recently added entry that hasn't become a parent of another entry. This is used to detect tree jumps (when a new entry's parentId doesn't match the current leaf). */
  interface:
    29-40: interface Boundary [exported]
      /** A detected boundary in the session */
      refs out: 2 [type: 2]
        - src/parser/boundary.ts:31: type BoundaryType -> src/parser/boundary.ts
        - src/parser/boundary.ts:39: type BoundaryMetadata -> src/parser/boundary.ts
    45-58: interface BoundaryMetadata [exported]
      /** Metadata for different boundary types */
    63-76: interface Segment [exported]
      /** A segment is a contiguous span of entries between boundaries */
      refs out: 1 [type: 1]
        - src/parser/boundary.ts:69: type Boundary -> src/parser/boundary.ts
    367-371: interface BoundaryStats [exported]
      /** Get boundary statistics for a session */
      refs out: 2 [type: 2]
        - src/parser/boundary.ts:369: type Record -> external
        - src/parser/boundary.ts:369: type BoundaryType -> src/parser/boundary.ts
  type:
    24-24: BoundaryType = "branch" | "tree_jump" | "compaction" | "resume" [exported]
      /** Types of boundaries that can occur within a session */
  function:
    188-289: detectBoundaries(entries: SessionEntry[]): {} [exported]
      /** Detect all boundaries in a list of session entries */
      refs out: 9 [call: 7, type: 2]
        - src/parser/boundary.ts:188: type SessionEntry -> src/types.ts
        - src/parser/boundary.ts:188: type Boundary -> src/parser/boundary.ts
        - src/parser/boundary.ts:197: call has -> external
        - src/parser/boundary.ts:204: call push -> external
        - src/parser/boundary.ts:218: call push -> external
        - src/parser/boundary.ts:248: call push -> external
        - src/parser/boundary.ts:270: call push -> external
        - src/parser/boundary.ts:276: call round -> external
        - src/parser/boundary.ts:283: call LeafTracker.update -> src/parser/boundary.ts
    299-362: extractSegments(entries: SessionEntry[]): {} [exported]
      /** Extract segments from entries based on detected boundaries A segment is a contiguous span of entries. Boundaries define the split points. */
      refs out: 7 [call: 5, type: 2]
        - src/parser/boundary.ts:299: type SessionEntry -> src/types.ts
        - src/parser/boundary.ts:299: type Segment -> src/parser/boundary.ts
        - src/parser/boundary.ts:315: call set -> external
        - src/parser/boundary.ts:347: call push -> external
        - src/parser/boundary.ts:347: call createSegment -> src/parser/boundary.ts
        - src/parser/boundary.ts:358: call push -> external
        - src/parser/boundary.ts:358: call createSegment -> src/parser/boundary.ts
    379-399: getBoundaryStats(entries: SessionEntry[]): BoundaryStats [exported]
      /** Calculate statistics about boundaries in a session */
      refs out: 2 [type: 2]
        - src/parser/boundary.ts:379: type SessionEntry -> src/types.ts
        - src/parser/boundary.ts:379: type BoundaryStats -> src/parser/boundary.ts
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

src/parser/session.ts [1-401]
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
    87-166: buildTree(entries: SessionEntry[]): any [exported]
      /** Build a tree structure from entries */
      refs out: 14 [call: 12, type: 2]
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
    172-196: findLeaf(entries: SessionEntry[]): string [exported]
      /** Find the current leaf entry ID The leaf is the latest entry that has no children */
      refs out: 3 [call: 2, type: 1]
        - src/parser/session.ts:172: type SessionEntry -> src/types.ts
        - src/parser/session.ts:181: call add -> external
        - src/parser/session.ts:188: call has -> external
    201-213: findBranchPoints(entries: SessionEntry[]): {} [exported]
      /** Find branch points (entries with multiple children) */
      refs out: 6 [call: 5, type: 1]
        - src/parser/session.ts:201: type SessionEntry -> src/types.ts
        - src/parser/session.ts:206: call set -> external
        - src/parser/session.ts:206: call get -> external
        - src/parser/session.ts:210: call map -> external
        - src/parser/session.ts:210: call filter -> external
        - src/parser/session.ts:210: call entries -> external
    218-286: calculateStats(entries: SessionEntry[], tree: TreeNode | null): SessionStats [exported]
      /** Calculate session statistics */
      refs out: 4 [call: 1, type: 3]
        - src/parser/session.ts:219: type SessionEntry -> src/types.ts
        - src/parser/session.ts:220: type TreeNode -> src/types.ts
        - src/parser/session.ts:221: type SessionStats -> src/types.ts
        - src/parser/session.ts:244: call add -> external
    333-352: extractTextPreview(message: UserMessage | AssistantMessage, maxLength = 100): string [exported]
      /** Extract text preview from a message */
      refs out: 6 [call: 3, type: 3]
        - src/parser/session.ts:334: type UserMessage -> src/types.ts
        - src/parser/session.ts:334: type AssistantMessage -> src/types.ts
        - src/parser/session.ts:340: call truncate -> src/parser/session.ts
        - src/parser/session.ts:343: call isArray -> external
        - src/parser/session.ts:346: call truncate -> src/parser/session.ts
        - src/parser/session.ts:346: type TextContent -> src/types.ts
    368-390: getPathToEntry(entries: SessionEntry[], targetId: string): {} [exported]
      /** Get the path from root to a specific entry */
      refs out: 4 [call: 2, type: 2]
        - src/parser/session.ts:369: type SessionEntry -> src/types.ts
        - src/parser/session.ts:371: type SessionEntry -> src/types.ts
        - src/parser/session.ts:374: call set -> external
        - src/parser/session.ts:385: call unshift -> external
    395-400: getEntry(entries: SessionEntry[], id: string): any [exported]
      /** Get entry by ID */
      refs out: 3 [call: 1, type: 2]
        - src/parser/session.ts:396: type SessionEntry -> src/types.ts
        - src/parser/session.ts:398: type SessionEntry -> src/types.ts
        - src/parser/session.ts:399: call find -> external
  imports:
    - ../types.js
    - node:fs/promises

src/parser/signals.test.ts [1-1117]
  imports:
    - ../types.js
    - ./signals.js
    - vitest

src/parser/signals.ts [1-1043]
  interface:
    555-564: interface FrictionDetectionOptions [exported]
      /** Options for friction detection */
    1015-1018: interface DelightDetectionOptions [exported]
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
    770-812: detectResilientRecovery(entries: SessionEntry[]): boolean [exported]
      /** Detect resilient recovery Tool error occurs, but the model fixes it WITHOUT user intervention, and the task ultimately succeeds. */
      refs out: 2 [call: 1, type: 1]
        - src/parser/signals.ts:770: type SessionEntry -> src/types.ts
        - src/parser/signals.ts:803: call isMinimalAcknowledgment -> src/parser/signals.ts
    842-889: detectOneShotSuccess(entries: SessionEntry[]): boolean [exported]
      /** Detect one-shot success Complex task (multiple tool calls) completed with zero user corrections/rephrasings. */
      refs out: 2 [call: 1, type: 1]
        - src/parser/signals.ts:842: type SessionEntry -> src/types.ts
        - src/parser/signals.ts:875: call isUserCorrection -> src/parser/signals.ts
    930-953: detectExplicitPraise(entries: SessionEntry[]): boolean [exported]
      /** Detect explicit praise from user User says "great job", "perfect", "thanks", etc. */
      refs out: 2 [call: 1, type: 1]
        - src/parser/signals.ts:930: type SessionEntry -> src/types.ts
        - src/parser/signals.ts:946: call hasGenuinePraise -> src/parser/signals.ts
    987-1006: calculateDelightScore(delight: DelightSignals): number [exported]
      /** Calculate overall delight score (0.0-1.0) Weights different delight signals based on significance. */
      refs out: 2 [call: 1, type: 1]
        - src/parser/signals.ts:987: type DelightSignals -> src/types/index.ts
        - src/parser/signals.ts:1005: call min -> external
    1023-1042: detectDelightSignals(entries: SessionEntry[], _options: DelightDetectionOptions = {}): DelightSignals [exported]
      /** Detect all delight signals in a session segment */
      refs out: 4 [call: 1, type: 3]
        - src/parser/signals.ts:1024: type SessionEntry -> src/types.ts
        - src/parser/signals.ts:1025: type DelightDetectionOptions -> src/parser/signals.ts
        - src/parser/signals.ts:1026: type DelightSignals -> src/types/index.ts
        - src/parser/signals.ts:1039: call calculateDelightScore -> src/parser/signals.ts
  imports:
    - ../types.js
    - ../types/index.js

---
Files: 37
Estimated tokens: 18,155 (codebase: ~837,486)
