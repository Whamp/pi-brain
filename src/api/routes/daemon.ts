/**
 * Daemon API routes
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

import {
  isDaemonRunning,
  getProcessUptime,
  readPidFile,
  getQueueStatus,
  queueAnalysis,
} from "../../daemon/cli.js";
import { successResponse, errorResponse } from "../responses.js";

export async function daemonRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /daemon/status - Get daemon status
   */
  app.get("/status", async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = request.startTime ?? Date.now();

    const running = isDaemonRunning();
    const pid = readPidFile();
    const uptime = running ? getProcessUptime() : undefined;

    const durationMs = Date.now() - startTime;
    return reply.send(
      successResponse(
        {
          running,
          pid: pid ?? null,
          uptime: uptime ?? null,
          workers: {
            total: 1, // Placeholder until daemon reports actual worker count
            active: 0,
            idle: 1,
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

      // getQueueStatus takes optional config path
      const status = getQueueStatus();

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
      const { sessionFile } = request.body ?? {};

      if (!sessionFile) {
        return reply
          .status(400)
          .send(errorResponse("BAD_REQUEST", "sessionFile is required"));
      }

      // queueAnalysis takes sessionPath and optional configPath
      const result = queueAnalysis(sessionFile);

      if (!result.success) {
        return reply
          .status(result.message.includes("already queued") ? 409 : 400)
          .send(
            errorResponse(
              result.message.includes("already queued")
                ? "CONFLICT"
                : "BAD_REQUEST",
              result.message
            )
          );
      }

      const durationMs = Date.now() - startTime;
      return reply.send(successResponse({ jobId: result.jobId }, durationMs));
    }
  );
}
