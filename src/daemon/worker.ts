/**
 * Worker - Processes analysis jobs from the queue
 *
 * Combines queue management, job processing, and error handling
 * into a cohesive worker that can be run as part of the daemon.
 *
 * Based on specs/daemon.md worker pool specification.
 */

import type Database from "better-sqlite3";

import { join } from "node:path";

import type { PiBrainConfig } from "../config/types.js";
import type { Node } from "../storage/node-types.js";

import { getComputerFromPath } from "../config/config.js";
import {
  detectDelightSignals,
  detectFrictionSignals,
  extractManualFlags,
  getFilesTouched,
  isAbandonedRestartFromNode,
  parseSession,
} from "../parser/index.js";
import { getOrCreatePromptVersion } from "../prompt/prompt.js";
import { agentOutputToNode } from "../storage/node-conversion.js";
import {
  findPreviousProjectNode,
  linkNodeToPredecessors,
  upsertNode,
} from "../storage/node-repository.js";
import { ConnectionDiscoverer } from "./connection-discovery.js";
import {
  classifyError,
  classifyErrorWithContext,
  formatErrorForStorage,
  type RetryPolicy,
  DEFAULT_RETRY_POLICY,
} from "./errors.js";
import {
  consoleLogger,
  createProcessor,
  type JobProcessor,
  type ProcessorLogger,
} from "./processor.js";
import {
  createQueueManager,
  type AnalysisJob,
  type QueueManager,
} from "./queue.js";

// =============================================================================
// Types
// =============================================================================

/** Worker configuration */
export interface WorkerConfig {
  /** Unique worker identifier */
  id: string;
  /** PiBrain configuration */
  config: PiBrainConfig;
  /** Retry policy */
  retryPolicy?: RetryPolicy;
  /** Logger */
  logger?: ProcessorLogger;
  /** Callback when a node is created */
  onNodeCreated?: (job: AnalysisJob, node: Node) => Promise<void>;
  /** Callback when a job fails permanently */
  onJobFailed?: (job: AnalysisJob, error: Error) => Promise<void>;
  /** Poll interval when queue is empty (ms) */
  pollIntervalMs?: number;
}

/** Worker status */
export interface WorkerStatus {
  /** Worker ID */
  id: string;
  /** Whether worker is running */
  running: boolean;
  /** Current job being processed */
  currentJob: AnalysisJob | null;
  /** Total jobs processed */
  jobsProcessed: number;
  /** Jobs that succeeded */
  jobsSucceeded: number;
  /** Jobs that failed */
  jobsFailed: number;
  /** When worker started */
  startedAt: Date | null;
}

/** Result from processing a single job */
export interface JobProcessingResult {
  /** Whether processing succeeded */
  success: boolean;
  /** The processed job */
  job: AnalysisJob;
  /** Created node ID (if successful) */
  nodeId?: string;
  /** Error (if failed) */
  error?: Error;
  /** Whether job will be retried */
  willRetry: boolean;
  /** Duration in milliseconds */
  durationMs: number;
}

// =============================================================================
// Worker Class
// =============================================================================

/**
 * Worker that processes jobs from the analysis queue
 */
export class Worker {
  private readonly id: string;
  private readonly config: PiBrainConfig;
  private readonly retryPolicy: RetryPolicy;
  private readonly logger: ProcessorLogger;
  private readonly onNodeCreated?: (
    job: AnalysisJob,
    node: Node
  ) => Promise<void>;
  private readonly onJobFailed?: (
    job: AnalysisJob,
    error: Error
  ) => Promise<void>;
  private readonly pollIntervalMs: number;

  private queue: QueueManager | null = null;
  private processor: JobProcessor | null = null;
  private connectionDiscoverer: ConnectionDiscoverer | null = null;
  private db: Database.Database | null = null;
  private running = false;
  private currentJob: AnalysisJob | null = null;
  private startedAt: Date | null = null;

  // Stats
  private jobsProcessed = 0;
  private jobsSucceeded = 0;
  private jobsFailed = 0;

  constructor(config: WorkerConfig) {
    this.id = config.id;
    this.config = config.config;
    this.retryPolicy = config.retryPolicy ?? DEFAULT_RETRY_POLICY;
    this.logger = config.logger ?? consoleLogger;
    this.onNodeCreated = config.onNodeCreated;
    this.onJobFailed = config.onJobFailed;
    this.pollIntervalMs = config.pollIntervalMs ?? 5000;
  }

  /**
   * Initialize the worker with database connection
   */
  initialize(db: Database.Database): void {
    this.db = db;
    this.queue = createQueueManager(db);
    this.processor = createProcessor({
      daemonConfig: this.config.daemon,
      logger: this.logger,
    });
    this.connectionDiscoverer = new ConnectionDiscoverer(db);
  }

  /**
   * Start the worker loop
   */
  async start(): Promise<void> {
    if (!this.queue || !this.processor) {
      throw new Error("Worker not initialized. Call initialize() first.");
    }

    if (this.running) {
      this.logger.warn(`Worker ${this.id} is already running`);
      return;
    }

    this.running = true;
    this.startedAt = new Date();
    this.logger.info(`Worker ${this.id} started`);

    // Validate environment
    const envStatus = await this.processor.validateEnvironment();
    if (!envStatus.valid) {
      if (envStatus.missingSkills.length > 0) {
        this.logger.warn(
          `Missing skills: ${envStatus.missingSkills.join(", ")}. Worker will idle until skills are installed.`
        );
      } else if (envStatus.missingPromptFile) {
        this.logger.warn(
          `Prompt file not found: ${envStatus.missingPromptFile}. Worker will idle until file exists.`
        );
      } else {
        this.logger.warn("Environment validation failed. Worker will idle.");
      }
      // Worker stays running but doesn't process jobs - allows API to still work
      // Re-check environment periodically with interruptible sleep
      while (this.running) {
        // Use shorter sleep intervals (1s) for faster shutdown, check 30 times for ~30s total
        for (let i = 0; i < 30 && this.running; i++) {
          await this.sleep(1000);
        }
        if (!this.running) {
          break;
        }
        const recheck = await this.processor.validateEnvironment();
        if (recheck.valid) {
          this.logger.info("Environment now valid. Resuming job processing.");
          break;
        }
      }
    }

    // Main loop
    while (this.running) {
      const job = this.queue.dequeue(this.id);

      if (job) {
        await this.processJob(job);
      } else {
        // No work available, wait before polling again
        await this.sleep(this.pollIntervalMs);
      }
    }

    this.logger.info(`Worker ${this.id} stopped`);
  }

  /**
   * Stop the worker gracefully
   */
  stop(): void {
    this.logger.info(`Worker ${this.id} stopping...`);
    this.running = false;
  }

  /**
   * Check if worker is running
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Get the current job being processed
   */
  getCurrentJob(): AnalysisJob | null {
    return this.currentJob;
  }

  /**
   * Get worker status
   */
  getStatus(): WorkerStatus {
    return {
      id: this.id,
      running: this.running,
      currentJob: this.currentJob,
      jobsProcessed: this.jobsProcessed,
      jobsSucceeded: this.jobsSucceeded,
      jobsFailed: this.jobsFailed,
      startedAt: this.startedAt,
    };
  }

  /**
   * Process a single job (can be called directly for testing)
   */
  async processJob(job: AnalysisJob): Promise<JobProcessingResult> {
    if (
      !this.queue ||
      !this.processor ||
      !this.db ||
      !this.connectionDiscoverer
    ) {
      throw new Error("Worker not initialized");
    }

    const startTime = Date.now();
    this.currentJob = job;
    this.jobsProcessed++;

    this.logger.info(`Processing job ${job.id}: ${job.type}`);

    try {
      // Handle connection discovery jobs specifically
      if (job.type === "connection_discovery") {
        const nodeId = job.context?.nodeId as string | undefined;
        if (!nodeId) {
          throw new Error("Missing nodeId in connection_discovery job context");
        }

        const result = await this.connectionDiscoverer.discover(nodeId);

        await this.queue.complete(job.id, nodeId);
        this.jobsSucceeded++;

        this.logger.info(
          `Job ${job.id} completed successfully, found ${result.edges.length} connections for node ${nodeId}`
        );

        return {
          success: true,
          job,
          nodeId,
          willRetry: false,
          durationMs: Date.now() - startTime,
        };
      }

      // Invoke the agent for other job types
      const result = await this.processor.process(job);

      if (result.success && result.nodeData) {
        // 1. Parse session for source metadata
        const session = await parseSession(job.sessionFile);

        // 2. Extract segment entries and count
        let segmentEntries = session.entries;
        let entryCount = session.entries.length;
        if (job.segmentStart || job.segmentEnd) {
          const startIndex = job.segmentStart
            ? session.entries.findIndex((e) => e.id === job.segmentStart)
            : 0;
          const endIndex = job.segmentEnd
            ? session.entries.findIndex((e) => e.id === job.segmentEnd)
            : session.entries.length - 1;

          if (startIndex !== -1 && endIndex !== -1) {
            segmentEntries = session.entries.slice(startIndex, endIndex + 1);
            entryCount = endIndex - startIndex + 1;
          }
        }

        // 3. Detect abandoned restart by checking previous project node
        // Get the segment's start time and files touched
        const segmentStartTime =
          segmentEntries[0]?.timestamp ?? session.header.timestamp;
        const currentFilesTouched = [
          ...getFilesTouched(segmentEntries),
          ...result.nodeData.content.filesTouched,
        ];
        const { project } = result.nodeData.classification;

        // Look up previous node for the same project
        let abandonedRestart = false;
        if (project) {
          const previousNode = findPreviousProjectNode(
            this.db,
            project,
            segmentStartTime
          );
          if (previousNode) {
            abandonedRestart = isAbandonedRestartFromNode(
              {
                outcome: previousNode.content.outcome,
                timestamp: previousNode.metadata.timestamp,
                filesTouched: previousNode.content.filesTouched,
              },
              segmentStartTime,
              currentFilesTouched
            );
          }
        }

        // 4. Detect friction and delight signals from segment entries
        const frictionSignals = detectFrictionSignals(segmentEntries, {
          isLastSegment: !job.segmentEnd, // If no end specified, assume it's the latest segment
          wasResumed: job.context?.boundaryType === "resume",
          abandonedRestart,
        });
        const delightSignals = detectDelightSignals(segmentEntries, {
          outcome: result.nodeData.content.outcome,
        });
        const manualFlags = extractManualFlags(segmentEntries);

        // 5. Convert AgentNodeOutput to Node
        const promptVersion = getOrCreatePromptVersion(
          this.db,
          this.config.daemon.promptFile
        );

        // Determine computer name from session path
        // For spoke sessions, use the spoke name; for local sessions, use hostname
        const computer = getComputerFromPath(job.sessionFile, this.config);

        const node = agentOutputToNode(result.nodeData, {
          job,
          computer,
          sessionId: session.header.id,
          parentSession: session.header.parentSession,
          entryCount,
          analysisDurationMs: result.durationMs,
          analyzerVersion: promptVersion.version,
          signals: {
            friction: frictionSignals,
            delight: delightSignals,
            manualFlags,
          },
        });

        // 6. Store node in SQLite and JSON (upsert for idempotent ingestion)
        // If this job is a retry after a crash, the node may already exist
        const { created } = upsertNode(this.db, node, {
          nodesDir: join(this.config.hub.databaseDir, "nodes"),
        });

        // 7. Create structural edges based on session boundaries.
        // Only for initial analysis of new nodes - reanalysis preserves existing edges.
        if (job.type === "initial" && created) {
          linkNodeToPredecessors(this.db, node, {
            boundaryType: job.context?.boundaryType,
          });
        }

        this.queue.complete(job.id, node.id);
        this.jobsSucceeded++;

        this.logger.info(
          `Job ${job.id} completed successfully, ${created ? "created" : "updated"} node ${node.id}`
        );

        // Call callback if provided
        if (this.onNodeCreated) {
          await this.onNodeCreated(job, node);
        }

        return {
          success: true,
          job,
          nodeId: node.id,
          willRetry: false,
          durationMs: Date.now() - startTime,
        };
      }

      // Processing failed
      const error = new Error(result.error ?? "Unknown error");
      return await this.handleJobFailure(job, error, startTime);
    } catch (error) {
      return await this.handleJobFailure(
        job,
        error instanceof Error ? error : new Error(String(error)),
        startTime
      );
    } finally {
      this.currentJob = null;
    }
  }

  /**
   * Handle a job failure with proper error classification and retry logic
   */
  private async handleJobFailure(
    job: AnalysisJob,
    error: Error,
    startTime: number
  ): Promise<JobProcessingResult> {
    if (!this.queue) {
      throw new Error("Worker not initialized");
    }

    // Classify the error
    const classified = classifyErrorWithContext(
      error,
      job.retryCount,
      job.maxRetries,
      this.retryPolicy
    );

    this.logger.error(`Job ${job.id} failed: ${classified.description}`);

    // Format error for storage
    const storedError = formatErrorForStorage(error, classified.category);

    if (classified.shouldRetry) {
      // Job will be retried
      this.queue.fail(job.id, storedError);

      this.logger.info(
        `Job ${job.id} scheduled for retry ${job.retryCount + 1}/${job.maxRetries} ` +
          `in ${classified.retryDelaySeconds ?? 60}s`
      );

      return {
        success: false,
        job,
        error,
        willRetry: true,
        durationMs: Date.now() - startTime,
      };
    }

    // Permanent failure - no more retries
    // Use failPermanently for permanent errors, fail for exhausted retries
    if (classified.category.type === "permanent") {
      this.queue.failPermanently(job.id, storedError);
    } else {
      this.queue.fail(job.id, storedError);
    }
    this.jobsFailed++;

    this.logger.error(`Job ${job.id} permanently failed: ${error.message}`);

    // Call callback if provided
    if (this.onJobFailed) {
      try {
        await this.onJobFailed(job, error);
      } catch (error) {
        this.logger.error(`onJobFailed callback error: ${error}`);
      }
    }

    return {
      success: false,
      job,
      error,
      willRetry: false,
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * Sleep for a specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create a worker instance
 */
export function createWorker(config: WorkerConfig): Worker {
  return new Worker(config);
}

/**
 * Process a single job without the full worker loop
 * Useful for one-off processing or testing
 */
export async function processSingleJob(
  job: AnalysisJob,
  config: PiBrainConfig,
  db: Database.Database,
  logger?: ProcessorLogger
): Promise<JobProcessingResult> {
  const worker = new Worker({
    id: "single-job-worker",
    config,
    logger,
  });

  worker.initialize(db);
  return worker.processJob(job);
}

/**
 * Handle job error manually (for custom queue implementations)
 */
export function handleJobError(
  error: Error,
  job: AnalysisJob,
  retryPolicy: RetryPolicy = DEFAULT_RETRY_POLICY
): {
  shouldRetry: boolean;
  retryDelayMinutes: number;
  formattedError: string;
  category: ReturnType<typeof classifyError>;
} {
  const category = classifyError(error);
  const classified = classifyErrorWithContext(
    error,
    job.retryCount,
    job.maxRetries,
    retryPolicy
  );

  return {
    shouldRetry: classified.shouldRetry,
    retryDelayMinutes: Math.ceil((classified.retryDelaySeconds ?? 60) / 60),
    formattedError: formatErrorForStorage(error, category),
    category,
  };
}
