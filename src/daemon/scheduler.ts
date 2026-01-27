/**
 * Scheduler for nightly processing jobs
 *
 * Uses cron expressions from config to schedule:
 * - Reanalysis: Re-process nodes with older prompt versions
 * - Connection discovery: Find semantic connections between nodes
 * - Pattern aggregation: Aggregate failure patterns and model stats
 * - Clustering: Run facet discovery to find patterns across nodes
 */

import type Database from "better-sqlite3";

import { Cron } from "croner";

import type { DaemonConfig } from "../config/types.js";
import type { QueueManager } from "./queue.js";

import {
  autoDisableIneffectiveInsights,
  getInsightsNeedingMeasurement,
  measureAndStoreEffectiveness,
} from "../prompt/effectiveness.js";
import { getLatestVersion } from "../prompt/prompt.js";
import { FacetDiscovery } from "./facet-discovery.js";
import { InsightAggregator } from "./insight-aggregation.js";
import { PatternAggregator } from "./pattern-aggregation.js";

// =============================================================================
// Constants
// =============================================================================

/** Days to look back for "before" period when measuring effectiveness */
const EFFECTIVENESS_BEFORE_PERIOD_DAYS = 14;

/** Default days to look back when no prompt version timestamp is available */
const DEFAULT_SPLIT_DAYS = 7;

/** Milliseconds per day */
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Job types that can be scheduled */
export type ScheduledJobType =
  | "reanalysis"
  | "connection_discovery"
  | "pattern_aggregation"
  | "clustering";

/** Result of a scheduled job execution */
export interface ScheduledJobResult {
  type: ScheduledJobType;
  startedAt: Date;
  completedAt: Date;
  itemsQueued?: number;
  itemsProcessed?: number;
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

  /** Cron schedule for pattern aggregation (optional) */
  patternAggregationSchedule?: string;

  /** Cron schedule for facet discovery/clustering (optional) */
  clusteringSchedule?: string;

  /** Model provider for LLM cluster analysis */
  provider?: string;

  /** Model name for LLM cluster analysis */
  model?: string;

  /** Embedding provider for clustering */
  embeddingProvider?: "ollama" | "openai" | "openrouter" | "mock";

  /** Embedding model name */
  embeddingModel?: string;

  /** Embedding API key */
  embeddingApiKey?: string;

  /** Embedding API base URL */
  embeddingBaseUrl?: string;

  /** Embedding dimensions */
  embeddingDimensions?: number;
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
  private patternAggregationJob: Cron | null = null;
  private clusteringJob: Cron | null = null;
  private running = false;
  private lastReanalysisResult: ScheduledJobResult | null = null;
  private lastConnectionDiscoveryResult: ScheduledJobResult | null = null;
  private lastPatternAggregationResult: ScheduledJobResult | null = null;
  private lastClusteringResult: ScheduledJobResult | null = null;
  private patternAggregator: PatternAggregator;
  private insightAggregator: InsightAggregator;

  constructor(
    private config: SchedulerConfig,
    private queue: QueueManager,
    private db: Database.Database,
    private logger: SchedulerLogger = noopLogger
  ) {
    this.patternAggregator = new PatternAggregator(db);
    this.insightAggregator = new InsightAggregator(db);
  }

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

    // Start pattern aggregation job if schedule is configured
    if (this.config.patternAggregationSchedule) {
      try {
        this.patternAggregationJob = new Cron(
          this.config.patternAggregationSchedule,
          { name: "pattern_aggregation" },
          async () => {
            try {
              await this.runPatternAggregation();
            } catch (error) {
              this.logger.error(`Pattern aggregation cron error: ${error}`);
            }
          }
        );
        this.logger.info(
          `Pattern aggregation scheduled: ${this.config.patternAggregationSchedule} (next: ${this.patternAggregationJob.nextRun()?.toISOString() ?? "unknown"})`
        );
      } catch (error) {
        this.logger.error(
          `Invalid pattern aggregation schedule "${this.config.patternAggregationSchedule}": ${error}`
        );
      }
    }

    // Start clustering job if schedule is configured
    if (this.config.clusteringSchedule) {
      try {
        this.clusteringJob = new Cron(
          this.config.clusteringSchedule,
          { name: "clustering" },
          async () => {
            try {
              await this.runClustering();
            } catch (error) {
              this.logger.error(`Clustering cron error: ${error}`);
            }
          }
        );
        this.logger.info(
          `Clustering scheduled: ${this.config.clusteringSchedule} (next: ${this.clusteringJob.nextRun()?.toISOString() ?? "unknown"})`
        );
      } catch (error) {
        this.logger.error(
          `Invalid clustering schedule "${this.config.clusteringSchedule}": ${error}`
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

    if (this.patternAggregationJob) {
      this.patternAggregationJob.stop();
      this.patternAggregationJob = null;
    }

    if (this.clusteringJob) {
      this.clusteringJob.stop();
      this.clusteringJob = null;
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

    if (this.config.patternAggregationSchedule) {
      jobs.push({
        type: "pattern_aggregation",
        schedule: this.config.patternAggregationSchedule,
        nextRun: this.patternAggregationJob?.nextRun() ?? null,
        lastRun: this.lastPatternAggregationResult?.completedAt ?? null,
        lastResult: this.lastPatternAggregationResult ?? undefined,
      });
    }

    if (this.config.clusteringSchedule) {
      jobs.push({
        type: "clustering",
        schedule: this.config.clusteringSchedule,
        nextRun: this.clusteringJob?.nextRun() ?? null,
        lastRun: this.lastClusteringResult?.completedAt ?? null,
        lastResult: this.lastClusteringResult ?? undefined,
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
   * Manually trigger pattern aggregation job
   */
  async triggerPatternAggregation(): Promise<ScheduledJobResult> {
    return this.runPatternAggregation();
  }

  /**
   * Manually trigger clustering job
   */
  async triggerClustering(): Promise<ScheduledJobResult> {
    return this.runClustering();
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
      // and exclude nodes that are already in the queue for reanalysis
      // Uses denormalized target_node_id column for performance (indexed)
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
        FROM nodes n
        WHERE (analyzer_version IS NULL OR analyzer_version != ?)
        AND NOT EXISTS (
          SELECT 1 FROM analysis_queue q
          WHERE q.type = 'reanalysis'
          AND q.status IN ('pending', 'running')
          AND q.target_node_id = n.id
        )
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
      // that haven't had a connection discovery job recently (last 24h)
      // and aren't currently queued
      // Uses denormalized target_node_id column for performance (indexed)
      const recentNodes = this.db
        .prepare<
          [],
          {
            id: string;
            session_file: string;
          }
        >(
          `
        SELECT id, session_file FROM nodes n
        WHERE analyzed_at > datetime('now', '-7 days')
        AND NOT EXISTS (
          SELECT 1 FROM analysis_queue q
          WHERE q.type = 'connection_discovery'
          AND q.target_node_id = n.id
          AND (
            status IN ('pending', 'running')
            OR (status = 'completed' AND completed_at > datetime('now', '-24 hours'))
          )
        )
        ORDER BY analyzed_at DESC
        LIMIT 100
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

  /**
   * Run pattern aggregation - aggregates tool errors into failure patterns
   * and model-specific insights for prompt learning
   */
  private async runPatternAggregation(): Promise<ScheduledJobResult> {
    const startedAt = new Date();
    let errorMessage: string | undefined;

    try {
      this.logger.info("Starting pattern aggregation job");
      this.patternAggregator.aggregateFailurePatterns();
      this.patternAggregator.aggregateModelStats();
      this.patternAggregator.aggregateLessons();

      // Run insight aggregation for prompt learning pipeline
      this.logger.info("Running insight aggregation for prompt learning");
      this.insightAggregator.aggregateAll();

      // Run effectiveness measurements for prompt learning pipeline
      this.logger.info("Measuring effectiveness of prompt additions");
      const needingMeasurement = getInsightsNeedingMeasurement(this.db);
      this.logger.info(
        `Found ${needingMeasurement.length} insights needing measurement`
      );

      // Prepare statement once before loop for better performance
      const versionStmt = this.db.prepare(
        "SELECT created_at FROM prompt_versions WHERE version = ?"
      );

      for (const insight of needingMeasurement) {
        try {
          // If we have a prompt version for this insight, use its creation date as the split point
          let splitDate = new Date(
            Date.now() - DEFAULT_SPLIT_DAYS * MS_PER_DAY
          );

          if (insight.promptVersion) {
            const versionRow = versionStmt.get(insight.promptVersion) as
              | { created_at: string }
              | undefined;
            if (versionRow) {
              splitDate = new Date(versionRow.created_at);
            }
          }

          const now = new Date();
          const beforeStart = new Date(
            splitDate.getTime() - EFFECTIVENESS_BEFORE_PERIOD_DAYS * MS_PER_DAY
          );

          measureAndStoreEffectiveness(
            this.db,
            insight.id,
            { start: beforeStart.toISOString(), end: splitDate.toISOString() },
            { start: splitDate.toISOString(), end: now.toISOString() },
            insight.promptVersion || "unknown"
          );
        } catch (error) {
          this.logger.error(
            `Failed to measure effectiveness for ${insight.id}: ${error}`
          );
        }
      }

      // Auto-disable ineffective insights
      this.logger.info("Auto-disabling ineffective insights");
      const disabled = autoDisableIneffectiveInsights(this.db);
      if (disabled.length > 0) {
        this.logger.info(
          `Auto-disabled ${disabled.length} ineffective insights: ${disabled.join(", ")}`
        );
      }

      this.logger.info("Pattern aggregation completed");
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Pattern aggregation job failed: ${errorMessage}`);
    }

    const result: ScheduledJobResult = {
      type: "pattern_aggregation",
      startedAt,
      completedAt: new Date(),
      // Pattern aggregation processes all records, so count isn't easily available
      // without changing the aggregator interface
      itemsProcessed: undefined,
      error: errorMessage,
    };

    this.lastPatternAggregationResult = result;
    return result;
  }

  /**
   * Run clustering - discovers patterns across nodes using embedding + clustering
   * and analyzes clusters with LLM to generate names/descriptions
   */
  private async runClustering(): Promise<ScheduledJobResult> {
    const startedAt = new Date();
    let clustersCreated = 0;
    let clustersAnalyzed = 0;
    let errorMessage: string | undefined;

    try {
      this.logger.info("Starting clustering job");

      // Build embedding config from scheduler config
      const embeddingProvider = this.config.embeddingProvider ?? "mock";
      const embeddingConfig = {
        provider: embeddingProvider,
        model: this.config.embeddingModel ?? "qwen/qwen3-embedding-8b",
        apiKey: this.config.embeddingApiKey,
        baseUrl: this.config.embeddingBaseUrl,
        dimensions: this.config.embeddingDimensions,
      };

      if (embeddingProvider === "mock") {
        this.logger.info(
          "Using mock embeddings - configure embedding_provider for semantic clustering"
        );
      }

      const facetDiscovery = new FacetDiscovery(
        this.db,
        embeddingConfig,
        { algorithm: "hdbscan", minClusterSize: 3 },
        {
          info: (msg: string) => this.logger.info(`[facet] ${msg}`),
          error: (msg: string) => this.logger.error(`[facet] ${msg}`),
          debug: this.logger.debug
            ? (msg: string) => this.logger.debug?.(`[facet] ${msg}`)
            : undefined,
        }
      );

      // Run facet discovery to create clusters
      const result = await facetDiscovery.run();
      clustersCreated = result.clusters.length;
      this.logger.info(`Created ${clustersCreated} clusters`);

      // Analyze unnamed clusters with LLM if provider/model configured
      if (this.config.provider && this.config.model && clustersCreated > 0) {
        this.logger.info("Analyzing clusters with LLM");
        const analysisResult = await facetDiscovery.analyzeClusters({
          provider: this.config.provider,
          model: this.config.model,
        });
        clustersAnalyzed = analysisResult.succeeded;
        this.logger.info(
          `Analyzed ${clustersAnalyzed} clusters (${analysisResult.failed} failed)`
        );
      }

      this.logger.info("Clustering job completed");
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Clustering job failed: ${errorMessage}`);
    }

    const result: ScheduledJobResult = {
      type: "clustering",
      startedAt,
      completedAt: new Date(),
      itemsProcessed: clustersCreated + clustersAnalyzed,
      error: errorMessage,
    };

    this.lastClusteringResult = result;
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
      patternAggregationSchedule: config.patternAggregationSchedule,
      clusteringSchedule: config.clusteringSchedule,
      provider: config.provider,
      model: config.model,
      embeddingProvider: config.embeddingProvider,
      embeddingModel: config.embeddingModel,
      embeddingApiKey: config.embeddingApiKey,
      embeddingBaseUrl: config.embeddingBaseUrl,
      embeddingDimensions: config.embeddingDimensions,
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
