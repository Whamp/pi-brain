/**
 * Consolidation Scheduler
 *
 * Manages cron-scheduled consolidation jobs:
 * - Decay (daily): Update relevance scores, archive low-relevance nodes
 * - Creative (weekly): Find non-obvious connections via vector similarity
 *
 * Integrates with the existing Scheduler infrastructure but manages
 * consolidation-specific jobs.
 *
 * @see docs/specs/automem-features.md
 */

import type Database from "better-sqlite3";

import { Cron } from "croner";

import {
  CreativeAssociator,
  type CreativeAssociatorConfig,
} from "./creative-associator.js";
import { RelevanceCalculator } from "./relevance.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Configuration for consolidation jobs
 */
export interface ConsolidationConfig {
  /** Cron schedule for decay job (default: daily at 3am) */
  decaySchedule?: string;
  /** Cron schedule for creative association (default: weekly Sunday at 4am) */
  creativeSchedule?: string;
  /** Base decay rate for relevance calculation */
  baseDecayRate?: number;
  /** Creative associator configuration */
  creativeConfig?: CreativeAssociatorConfig;
}

/**
 * Result of a consolidation job
 */
export interface ConsolidationResult {
  type: "decay" | "creative";
  startedAt: Date;
  completedAt: Date;
  itemsProcessed: number;
  details: Record<string, unknown>;
  error?: string;
}

/**
 * Logger interface
 */
interface ConsolidationLogger {
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
  debug?: (message: string) => void;
}

/** Default no-op logger */
const noopLogger: ConsolidationLogger = {
  /* oxlint-disable no-empty-function */
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
  /* oxlint-enable no-empty-function */
};

// =============================================================================
// Default Schedules
// =============================================================================

/** Default decay schedule: daily at 3am */
const DEFAULT_DECAY_SCHEDULE = "0 3 * * *";

/** Default creative schedule: weekly Sunday at 4am */
const DEFAULT_CREATIVE_SCHEDULE = "0 4 * * 0";

// =============================================================================
// ConsolidationScheduler
// =============================================================================

/**
 * Scheduler for memory consolidation jobs
 */
export class ConsolidationScheduler {
  private decayJob: Cron | null = null;
  private creativeJob: Cron | null = null;
  private running = false;
  private lastDecayResult: ConsolidationResult | null = null;
  private lastCreativeResult: ConsolidationResult | null = null;
  private relevanceCalculator: RelevanceCalculator;
  private creativeAssociator: CreativeAssociator;

  constructor(
    private config: ConsolidationConfig,
    private db: Database.Database,
    private logger: ConsolidationLogger = noopLogger
  ) {
    this.relevanceCalculator = new RelevanceCalculator(
      db,
      config.baseDecayRate
    );
    this.creativeAssociator = new CreativeAssociator(db, config.creativeConfig);
  }

  /**
   * Start the consolidation scheduler
   */
  start(): void {
    if (this.running) {
      this.logger.info("Consolidation scheduler already running");
      return;
    }

    this.running = true;

    // Start decay job
    const decaySchedule = this.config.decaySchedule ?? DEFAULT_DECAY_SCHEDULE;
    try {
      this.decayJob = new Cron(
        decaySchedule,
        { name: "consolidation_decay" },
        async () => {
          try {
            await this.runDecay();
          } catch (error) {
            this.logger.error(`Decay cron error: ${error}`);
          }
        }
      );
      this.logger.info(
        `Decay scheduled: ${decaySchedule} (next: ${this.decayJob.nextRun()?.toISOString() ?? "unknown"})`
      );
    } catch (error) {
      this.logger.error(`Invalid decay schedule "${decaySchedule}": ${error}`);
    }

    // Start creative job
    const creativeSchedule =
      this.config.creativeSchedule ?? DEFAULT_CREATIVE_SCHEDULE;
    try {
      this.creativeJob = new Cron(
        creativeSchedule,
        { name: "consolidation_creative" },
        async () => {
          try {
            await this.runCreative();
          } catch (error) {
            this.logger.error(`Creative cron error: ${error}`);
          }
        }
      );
      this.logger.info(
        `Creative association scheduled: ${creativeSchedule} (next: ${this.creativeJob.nextRun()?.toISOString() ?? "unknown"})`
      );
    } catch (error) {
      this.logger.error(
        `Invalid creative schedule "${creativeSchedule}": ${error}`
      );
    }

    this.logger.info("Consolidation scheduler started");
  }

  /**
   * Stop the consolidation scheduler
   */
  stop(): void {
    if (!this.running) {
      this.logger.info("Consolidation scheduler not running");
      return;
    }

    if (this.decayJob) {
      this.decayJob.stop();
      this.decayJob = null;
    }

    if (this.creativeJob) {
      this.creativeJob.stop();
      this.creativeJob = null;
    }

    this.running = false;
    this.logger.info("Consolidation scheduler stopped");
  }

  /**
   * Check if scheduler is running
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    running: boolean;
    decay: {
      schedule: string;
      nextRun: Date | null;
      lastResult: ConsolidationResult | null;
    };
    creative: {
      schedule: string;
      nextRun: Date | null;
      lastResult: ConsolidationResult | null;
    };
  } {
    return {
      running: this.running,
      decay: {
        schedule: this.config.decaySchedule ?? DEFAULT_DECAY_SCHEDULE,
        nextRun: this.decayJob?.nextRun() ?? null,
        lastResult: this.lastDecayResult,
      },
      creative: {
        schedule: this.config.creativeSchedule ?? DEFAULT_CREATIVE_SCHEDULE,
        nextRun: this.creativeJob?.nextRun() ?? null,
        lastResult: this.lastCreativeResult,
      },
    };
  }

  /**
   * Manually trigger decay job
   */
  triggerDecay(): Promise<ConsolidationResult> {
    return this.runDecay();
  }

  /**
   * Manually trigger creative association job
   */
  triggerCreative(): Promise<ConsolidationResult> {
    return this.runCreative();
  }

  /**
   * Run decay job
   */
  private runDecay(): Promise<ConsolidationResult> {
    const startedAt = new Date();
    let errorMessage: string | undefined;
    let updated = 0;
    let archived = 0;

    try {
      this.logger.info("Starting decay consolidation job");
      const decayResult = this.relevanceCalculator.runDecay();
      ({ updated } = decayResult);
      ({ archived } = decayResult);
      this.logger.info(
        `Decay completed: ${updated} nodes updated, ${archived} archived`
      );
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Decay job failed: ${errorMessage}`);
    }

    const result: ConsolidationResult = {
      type: "decay",
      startedAt,
      completedAt: new Date(),
      itemsProcessed: updated,
      details: { updated, archived },
      error: errorMessage,
    };

    this.lastDecayResult = result;
    return Promise.resolve(result);
  }

  /**
   * Run creative association job
   */
  private async runCreative(): Promise<ConsolidationResult> {
    const startedAt = new Date();
    let errorMessage: string | undefined;
    let nodesSampled = 0;
    let edgesCreated = 0;

    try {
      this.logger.info("Starting creative association job");
      const creativeResult = await this.creativeAssociator.run();
      ({ nodesSampled } = creativeResult);
      ({ edgesCreated } = creativeResult);

      if (creativeResult.errors.length > 0) {
        this.logger.warn(
          `Creative association had ${creativeResult.errors.length} errors`
        );
        for (const err of creativeResult.errors) {
          this.logger.warn(`  - ${err}`);
        }
      }

      this.logger.info(
        `Creative association completed: ${nodesSampled} nodes sampled, ${edgesCreated} edges created`
      );
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Creative association job failed: ${errorMessage}`);
    }

    const result: ConsolidationResult = {
      type: "creative",
      startedAt,
      completedAt: new Date(),
      itemsProcessed: edgesCreated,
      details: { nodesSampled, edgesCreated },
      error: errorMessage,
    };

    this.lastCreativeResult = result;
    return result;
  }

  /**
   * Get the relevance calculator for direct access
   */
  getRelevanceCalculator(): RelevanceCalculator {
    return this.relevanceCalculator;
  }

  /**
   * Get the creative associator for direct access
   */
  getCreativeAssociator(): CreativeAssociator {
    return this.creativeAssociator;
  }
}

/**
 * Create a consolidation scheduler with default configuration
 */
export function createConsolidationScheduler(
  db: Database.Database,
  config?: ConsolidationConfig,
  logger?: ConsolidationLogger
): ConsolidationScheduler {
  return new ConsolidationScheduler(config ?? {}, db, logger);
}
