/**
 * Scheduler for nightly processing jobs
 *
 * Uses cron expressions from config to schedule:
 * - Reanalysis: Re-process nodes with older prompt versions
 * - Connection discovery: Find semantic connections between nodes
 */

import type Database from "better-sqlite3";

import { Cron } from "croner";

import type { DaemonConfig } from "../config/types.js";
import type { QueueManager } from "./queue.js";

import { getLatestVersion } from "../prompt/prompt.js";

/** Job types that can be scheduled */
export type ScheduledJobType = "reanalysis" | "connection_discovery";

/** Result of a scheduled job execution */
export interface ScheduledJobResult {
  type: ScheduledJobType;
  startedAt: Date;
  completedAt: Date;
  itemsQueued: number;
  error?: string;
}

/** Logger interface for scheduler */
export interface SchedulerLogger {
  info: (message: string) => void;
  error: (message: string) => void;
  debug?: (message: string) => void;
}

/** Default no-op logger */
export const noopLogger: SchedulerLogger = {
  info: () => {},
  error: () => {},
  debug: () => {},
};

/** Console logger for production use */
export const consoleLogger: SchedulerLogger = {
  info: (message: string) => console.log(`[scheduler] ${message}`),
  error: (message: string) => console.error(`[scheduler] ${message}`),
  debug: (message: string) => console.debug(`[scheduler] ${message}`),
};

/** Scheduler configuration */
export interface SchedulerConfig {
  /** Cron schedule for reanalysis (e.g., "0 2 * * *") */
  reanalysisSchedule: string;

  /** Cron schedule for connection discovery */
  connectionDiscoverySchedule: string;
}

/** Scheduler state */
export interface SchedulerStatus {
  running: boolean;
  jobs: {
    type: ScheduledJobType;
    schedule: string;
    nextRun: Date | null;
    lastRun: Date | null;
    lastResult?: ScheduledJobResult;
  }[];
}

/**
 * Scheduler manages cron-based scheduled jobs
 */
export class Scheduler {
  private reanalysisJob: Cron | null = null;
  private connectionDiscoveryJob: Cron | null = null;
  private running = false;
  private lastReanalysisResult: ScheduledJobResult | null = null;
  private lastConnectionDiscoveryResult: ScheduledJobResult | null = null;

  constructor(
    private config: SchedulerConfig,
    private queue: QueueManager,
    private db: Database.Database,
    private logger: SchedulerLogger = noopLogger
  ) {}

  /**
   * Start the scheduler - creates cron jobs for each configured schedule
   */
  start(): void {
    if (this.running) {
      this.logger.info("Scheduler already running");
      return;
    }

    this.running = true;

    // Start reanalysis job if schedule is configured
    if (this.config.reanalysisSchedule) {
      try {
        this.reanalysisJob = new Cron(
          this.config.reanalysisSchedule,
          { name: "reanalysis" },
          async () => {
            try {
              await this.runReanalysis();
            } catch (error) {
              this.logger.error(`Reanalysis cron error: ${error}`);
            }
          }
        );
        this.logger.info(
          `Reanalysis scheduled: ${this.config.reanalysisSchedule} (next: ${this.reanalysisJob.nextRun()?.toISOString() ?? "unknown"})`
        );
      } catch (error) {
        this.logger.error(
          `Invalid reanalysis schedule "${this.config.reanalysisSchedule}": ${error}`
        );
      }
    }

    // Start connection discovery job if schedule is configured
    if (this.config.connectionDiscoverySchedule) {
      try {
        this.connectionDiscoveryJob = new Cron(
          this.config.connectionDiscoverySchedule,
          { name: "connection_discovery" },
          async () => {
            try {
              await this.runConnectionDiscovery();
            } catch (error) {
              this.logger.error(`Connection discovery cron error: ${error}`);
            }
          }
        );
        this.logger.info(
          `Connection discovery scheduled: ${this.config.connectionDiscoverySchedule} (next: ${this.connectionDiscoveryJob.nextRun()?.toISOString() ?? "unknown"})`
        );
      } catch (error) {
        this.logger.error(
          `Invalid connection discovery schedule "${this.config.connectionDiscoverySchedule}": ${error}`
        );
      }
    }

    this.logger.info("Scheduler started");
  }

  /**
   * Stop the scheduler - cancels all cron jobs
   */
  stop(): void {
    if (!this.running) {
      this.logger.info("Scheduler not running");
      return;
    }

    if (this.reanalysisJob) {
      this.reanalysisJob.stop();
      this.reanalysisJob = null;
    }

    if (this.connectionDiscoveryJob) {
      this.connectionDiscoveryJob.stop();
      this.connectionDiscoveryJob = null;
    }

    this.running = false;
    this.logger.info("Scheduler stopped");
  }

  /**
   * Check if scheduler is running
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Get scheduler status including next run times
   */
  getStatus(): SchedulerStatus {
    const jobs: SchedulerStatus["jobs"] = [];

    if (this.config.reanalysisSchedule) {
      jobs.push({
        type: "reanalysis",
        schedule: this.config.reanalysisSchedule,
        nextRun: this.reanalysisJob?.nextRun() ?? null,
        lastRun: this.lastReanalysisResult?.completedAt ?? null,
        lastResult: this.lastReanalysisResult ?? undefined,
      });
    }

    if (this.config.connectionDiscoverySchedule) {
      jobs.push({
        type: "connection_discovery",
        schedule: this.config.connectionDiscoverySchedule,
        nextRun: this.connectionDiscoveryJob?.nextRun() ?? null,
        lastRun: this.lastConnectionDiscoveryResult?.completedAt ?? null,
        lastResult: this.lastConnectionDiscoveryResult ?? undefined,
      });
    }

    return {
      running: this.running,
      jobs,
    };
  }

  /**
   * Manually trigger reanalysis job
   */
  async triggerReanalysis(): Promise<ScheduledJobResult> {
    return this.runReanalysis();
  }

  /**
   * Manually trigger connection discovery job
   */
  async triggerConnectionDiscovery(): Promise<ScheduledJobResult> {
    return this.runConnectionDiscovery();
  }

  /**
   * Run reanalysis - queues nodes that were analyzed with older prompt versions
   */
  private async runReanalysis(): Promise<ScheduledJobResult> {
    const startedAt = new Date();
    let itemsQueued = 0;
    let errorMessage: string | undefined;

    try {
      this.logger.info("Starting reanalysis job");

      // Get current prompt version from prompt_versions table
      const latestVersion = getLatestVersion(this.db);
      const currentVersion = latestVersion?.version ?? null;

      if (!currentVersion) {
        this.logger.info(
          "No prompt versions found in database - skipping reanalysis"
        );
        return {
          type: "reanalysis",
          startedAt,
          completedAt: new Date(),
          itemsQueued: 0,
        };
      }

      // Find nodes analyzed with older prompts (or null analyzer_version)
      const outdatedNodes = this.db
        .prepare<
          [string],
          {
            id: string;
            session_file: string;
            segment_start: string | null;
            segment_end: string | null;
          }
        >(
          `
        SELECT id, session_file, segment_start, segment_end
        FROM nodes
        WHERE analyzer_version IS NULL OR analyzer_version != ?
        ORDER BY timestamp DESC
        LIMIT 100
      `
        )
        .all(currentVersion);

      this.logger.info(
        `Found ${outdatedNodes.length} nodes for reanalysis (current version: ${currentVersion})`
      );

      // Queue each for reanalysis
      for (const node of outdatedNodes) {
        await this.queue.enqueue({
          type: "reanalysis",
          priority: 200,
          sessionFile: node.session_file,
          segmentStart: node.segment_start ?? undefined,
          segmentEnd: node.segment_end ?? undefined,
          context: {
            existingNodeId: node.id,
            reason: "prompt_update",
          },
        });
        itemsQueued++;
      }

      this.logger.info(`Queued ${itemsQueued} nodes for reanalysis`);
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Reanalysis job failed: ${errorMessage}`);
    }

    const result: ScheduledJobResult = {
      type: "reanalysis",
      startedAt,
      completedAt: new Date(),
      itemsQueued,
      error: errorMessage,
    };

    this.lastReanalysisResult = result;
    return result;
  }

  /**
   * Run connection discovery - queues recently analyzed nodes for connection finding
   */
  private async runConnectionDiscovery(): Promise<ScheduledJobResult> {
    const startedAt = new Date();
    let itemsQueued = 0;
    let errorMessage: string | undefined;

    try {
      this.logger.info("Starting connection discovery job");

      // Get recently analyzed nodes (last 7 days)
      const recentNodes = this.db
        .prepare<
          [],
          {
            id: string;
            session_file: string;
          }
        >(
          `
        SELECT id, session_file FROM nodes
        WHERE analyzed_at > datetime('now', '-7 days')
        ORDER BY analyzed_at DESC
      `
        )
        .all();

      this.logger.info(
        `Found ${recentNodes.length} recent nodes for connection discovery`
      );

      // Queue each for connection discovery
      for (const node of recentNodes) {
        await this.queue.enqueue({
          type: "connection_discovery",
          priority: 300,
          sessionFile: node.session_file,
          context: {
            nodeId: node.id,
            findConnections: true,
          },
        });
        itemsQueued++;
      }

      this.logger.info(`Queued ${itemsQueued} nodes for connection discovery`);
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Connection discovery job failed: ${errorMessage}`);
    }

    const result: ScheduledJobResult = {
      type: "connection_discovery",
      startedAt,
      completedAt: new Date(),
      itemsQueued,
      error: errorMessage,
    };

    this.lastConnectionDiscoveryResult = result;
    return result;
  }
}

/**
 * Create a scheduler from daemon config
 */
export function createScheduler(
  config: DaemonConfig,
  queue: QueueManager,
  db: Database.Database,
  logger?: SchedulerLogger
): Scheduler {
  return new Scheduler(
    {
      reanalysisSchedule: config.reanalysisSchedule,
      connectionDiscoverySchedule: config.connectionDiscoverySchedule,
    },
    queue,
    db,
    logger
  );
}

/**
 * Validate a cron expression
 * Returns true if valid, false otherwise
 */
export function isValidCronExpression(expression: string): boolean {
  try {
    // Create a cron job but don't start it
    const job = new Cron(expression, { paused: true }, () => {});
    job.stop();
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the next N run times for a cron expression
 */
export function getNextRunTimes(expression: string, count = 5): Date[] | null {
  try {
    const job = new Cron(expression, { paused: true }, () => {});
    const times: Date[] = [];
    let next = job.nextRun();

    for (let i = 0; i < count && next; i++) {
      times.push(next);
      next = job.nextRun(next);
    }

    job.stop();
    return times;
  } catch {
    return null;
  }
}
