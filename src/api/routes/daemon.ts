/**
 * Daemon API routes
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

import * as fs from "node:fs";
import * as path from "node:path";

import {
  isDaemonRunning,
  getProcessUptime,
  readPidFile,
} from "../../daemon/cli.js";
import { parseStoredError } from "../../daemon/errors.js";
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
}
