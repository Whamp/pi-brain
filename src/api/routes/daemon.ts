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
import {
  getQueueStatusSummary,
  createQueueManager,
  PRIORITY,
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
}
