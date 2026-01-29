/**
 * Daemon API routes
 */

import type Database from "better-sqlite3";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

import * as fs from "node:fs";
import * as path from "node:path";

import {
  isDaemonRunning,
  getProcessUptime,
  readPidFile,
} from "../../daemon/cli.js";
import { parseStoredError } from "../../daemon/errors.js";
import { PatternAggregator } from "../../daemon/pattern-aggregation.js";
import {
  getQueueStatusSummary,
  createQueueManager,
  PRIORITY,
  type AnalysisJob,
} from "../../daemon/queue.js";
import { successResponse, errorResponse } from "../responses.js";

export async function daemonRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /daemon/status - Get daemon status with queue info
   */
  app.get("/status", async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = request.startTime ?? Date.now();
    const { db } = app.ctx;

    const running = isDaemonRunning();
    const pid = readPidFile();
    const uptime = running ? getProcessUptime() : undefined;

    // Get queue status reusing existing DB connection
    const queueStatus = getQueueStatusSummary(db);

    // Get average processing rate from historical data (bytes per second)
    // We estimate based on completed jobs with known durations
    const avgBytesPerSecond = getAverageProcessingRate(db);

    // Map running jobs to include elapsed time and file size
    const runningJobs = queueStatus.runningJobs.map((job) => {
      const startedAt = job.startedAt ? new Date(job.startedAt) : null;
      const elapsedMs = startedAt ? Date.now() - startedAt.getTime() : 0;
      const elapsedSeconds = Math.floor(elapsedMs / 1000);

      // Extract session name from path
      const sessionName = job.sessionFile.split("/").pop() ?? job.sessionFile;

      // Get file size
      let sessionFileSize: number | null = null;
      try {
        const stat = fs.statSync(job.sessionFile);
        sessionFileSize = stat.size;
      } catch {
        // File may have been moved or deleted
      }

      // Estimate remaining time based on file size and processing rate
      let estimatedTotalSeconds: number | null = null;
      let estimatedRemainingSeconds: number | null = null;
      if (sessionFileSize !== null && avgBytesPerSecond > 0) {
        estimatedTotalSeconds = Math.ceil(sessionFileSize / avgBytesPerSecond);
        estimatedRemainingSeconds = Math.max(
          0,
          estimatedTotalSeconds - elapsedSeconds
        );
      }

      // Calculate processing rate for this job
      const processingRate =
        sessionFileSize !== null && elapsedSeconds > 0
          ? Math.round(sessionFileSize / elapsedSeconds)
          : null;

      return {
        id: job.id,
        sessionFile: job.sessionFile,
        sessionName,
        type: job.type,
        startedAt: job.startedAt,
        elapsedSeconds,
        retryCount: job.retryCount,
        maxRetries: job.maxRetries,
        sessionFileSize,
        estimatedTotalSeconds,
        estimatedRemainingSeconds,
        processingRate,
      };
    });

    const durationMs = Date.now() - startTime;
    return reply.send(
      successResponse(
        {
          running,
          pid: pid ?? null,
          uptime: uptime ?? null,
          // Use real queue stats
          queue: {
            pending: queueStatus.stats.pending,
            running: queueStatus.stats.running,
            completedToday: queueStatus.stats.completed,
            failedToday: queueStatus.stats.failed,
          },
          // Placeholder for worker details as they aren't exposed yet
          workers: {
            total: 1,
            active: queueStatus.stats.running,
            idle: Math.max(0, 1 - queueStatus.stats.running),
          },
          // Running job details
          runningJobs,
        },
        durationMs
      )
    );
  });

  /**
   * GET /daemon/queue - Get queue status
   */
  app.get(
    "/queue",
    async (
      request: FastifyRequest<{
        Querystring: {
          status?: string;
          limit?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const startTime = request.startTime ?? Date.now();
      const { db } = app.ctx;

      // Use shared DB connection
      const status = getQueueStatusSummary(db);

      const durationMs = Date.now() - startTime;
      return reply.send(successResponse(status, durationMs));
    }
  );

  /**
   * POST /daemon/analyze - Trigger analysis of a session
   */
  app.post(
    "/analyze",
    async (
      request: FastifyRequest<{
        Body: {
          sessionFile: string;
          priority?: number;
        };
      }>,
      reply: FastifyReply
    ) => {
      const startTime = request.startTime ?? Date.now();
      const { db } = app.ctx;
      const { sessionFile } = request.body ?? {};

      if (!sessionFile) {
        return reply
          .status(400)
          .send(errorResponse("BAD_REQUEST", "sessionFile is required"));
      }

      // Validate session file
      const resolvedPath = path.resolve(sessionFile);
      if (!fs.existsSync(resolvedPath)) {
        return reply
          .status(400)
          .send(
            errorResponse(
              "BAD_REQUEST",
              `Session file not found: ${resolvedPath}`
            )
          );
      }

      if (!resolvedPath.endsWith(".jsonl")) {
        return reply
          .status(400)
          .send(
            errorResponse("BAD_REQUEST", "Session file must be a .jsonl file")
          );
      }

      const queue = createQueueManager(db);

      // Check if already queued
      if (queue.hasExistingJob(resolvedPath)) {
        return reply
          .status(409)
          .send(
            errorResponse("CONFLICT", "Session is already queued for analysis")
          );
      }

      // Queue with high priority
      const jobId = queue.enqueue({
        type: "initial",
        priority: PRIORITY.USER_TRIGGERED,
        sessionFile: resolvedPath,
        context: { userTriggered: true },
      });

      const durationMs = Date.now() - startTime;
      return reply.send(successResponse({ jobId }, durationMs));
    }
  );

  /**
   * GET /daemon/jobs/failed - Get failed jobs with parsed error details
   */
  app.get(
    "/jobs/failed",
    async (
      request: FastifyRequest<{
        Querystring: {
          limit?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const startTime = request.startTime ?? Date.now();
      const { db } = app.ctx;
      const limit = request.query.limit
        ? Number.parseInt(request.query.limit, 10)
        : 50;

      const queue = createQueueManager(db);
      const failedJobs = queue.getFailedJobs(limit);

      // Parse error JSON into structured objects
      const jobsWithParsedErrors = failedJobs
        .map((job: AnalysisJob) => {
          if (!job.error) {
            return null;
          }

          const parsedError = parseStoredError(job.error);

          return {
            id: job.id,
            sessionFile: job.sessionFile,
            type: job.type,
            completedAt: job.completedAt,
            error: parsedError ?? {
              timestamp: job.completedAt ?? "",
              type: "unknown",
              reason: "Failed to parse error",
              message: job.error ?? "Unknown error",
            },
            retryCount: job.retryCount,
            maxRetries: job.maxRetries,
          };
        })
        .filter((job): job is NonNullable<typeof job> => job !== null);

      const durationMs = Date.now() - startTime;
      return reply.send(
        successResponse({ jobs: jobsWithParsedErrors }, durationMs)
      );
    }
  );

  /**
   * POST /daemon/aggregate - Trigger pattern aggregation
   *
   * Manually runs pattern aggregation to update model_stats,
   * failure_patterns, and lesson_patterns tables from source data.
   */
  app.post(
    "/aggregate",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const startTime = request.startTime ?? Date.now();
      const { db } = app.ctx;

      try {
        const aggregator = new PatternAggregator(db);

        const failurePatterns = aggregator.aggregateFailurePatterns();
        const modelStats = aggregator.aggregateModelStats();
        const lessonPatterns = aggregator.aggregateLessons();

        const durationMs = Date.now() - startTime;
        return reply.send(
          successResponse(
            {
              aggregated: {
                failurePatterns,
                modelStats,
                lessonPatterns,
              },
              message: "Pattern aggregation completed successfully",
            },
            durationMs
          )
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        return reply
          .status(500)
          .send(
            errorResponse("INTERNAL_ERROR", `Aggregation failed: ${message}`)
          );
      }
    }
  );
}

/**
 * Calculate average processing rate (bytes per second) from historical completed jobs
 *
 * Looks at recently completed jobs to estimate how long processing takes
 * based on session file size. Returns 0 if no historical data is available.
 */
function getAverageProcessingRate(db: Database.Database): number {
  // Default estimate: ~50KB/s (based on typical session processing)
  const DEFAULT_BYTES_PER_SECOND = 50_000;

  try {
    // Query completed jobs with durations from last 7 days
    const result = db
      .prepare(
        `
        SELECT 
          session_file,
          started_at,
          completed_at
        FROM analysis_queue
        WHERE status = 'completed'
          AND started_at IS NOT NULL
          AND completed_at IS NOT NULL
          AND completed_at >= datetime('now', '-7 days')
        ORDER BY completed_at DESC
        LIMIT 50
      `
      )
      .all() as {
      session_file: string;
      started_at: string;
      completed_at: string;
    }[];

    if (result.length === 0) {
      return DEFAULT_BYTES_PER_SECOND;
    }

    let totalBytes = 0;
    let totalSeconds = 0;
    let validSamples = 0;

    for (const row of result) {
      try {
        const stat = fs.statSync(row.session_file);
        const startTime = new Date(row.started_at).getTime();
        const endTime = new Date(row.completed_at).getTime();
        const durationSeconds = Math.max(1, (endTime - startTime) / 1000);

        totalBytes += stat.size;
        totalSeconds += durationSeconds;
        validSamples++;
      } catch {
        // File may have been moved or deleted, skip
      }
    }

    if (validSamples === 0 || totalSeconds === 0) {
      return DEFAULT_BYTES_PER_SECOND;
    }

    return Math.round(totalBytes / totalSeconds);
  } catch {
    return DEFAULT_BYTES_PER_SECOND;
  }
}
