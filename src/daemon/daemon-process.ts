#!/usr/bin/env node
/**
 * Daemon Process Entry Point
 *
 * This is the actual background process spawned by `pi-brain daemon start`.
 * It initializes and runs:
 * - SessionWatcher: Monitors session directories for changes
 * - QueueManager: Manages analysis job queue
 * - Worker: Processes analysis jobs
 * - Scheduler: Runs nightly jobs (reanalysis, connection discovery, etc.)
 * - API Server: Provides HTTP endpoints for queries and management
 */

import * as path from "node:path";

import {
  createLogger,
  daemonLogger as log,
  workerLogger,
  schedulerLogger,
  websocketLogger,
} from "../utils/logger.js";

import { startServer, WebSocketManager } from "../api/server.js";
import { loadConfig, ensureDirectories } from "../config/config.js";
import { openDatabase, migrate } from "../storage/database.js";
import { writePidFile, removePidFile } from "./cli.js";
import { createConsolidationScheduler } from "./consolidation/index.js";
import { createQueueManager, PRIORITY } from "./queue.js";
import { createScheduler } from "./scheduler.js";
import { SESSION_EVENTS, getSessionPath } from "./watcher-events.js";
import { SessionWatcher } from "./watcher.js";
import { createWorker } from "./worker.js";

// =============================================================================
// Parse Arguments
// =============================================================================

const args = process.argv.slice(2);
let configPath: string | undefined;
let force = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--config" && args[i + 1]) {
    configPath = args[i + 1];
    i++;
  } else if (args[i] === "--force") {
    force = true;
  }
}

// =============================================================================
// Event Handlers
// =============================================================================

const handleWatcherError = (event: Event) => {
  const customEvent = event as CustomEvent;
  log.error("Watcher error:", customEvent.detail?.error);
};

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

// =============================================================================
// Main Daemon Process
// =============================================================================

async function main(): Promise<void> {
  log.info("Starting pi-brain daemon process...");

  // Load configuration
  const config = loadConfig(configPath);
  ensureDirectories(config);

  // Check port availability if force is enabled
  const { isPortAvailable, findProcessOnPort } = await import("./cli.js");
  const portAvailable = await isPortAvailable(config.api.port);
  if (!portAvailable) {
    const existingPid = findProcessOnPort(config.api.port);
    if (force && existingPid) {
      log.info(`Killing process ${existingPid} on port ${config.api.port}...`);
      try {
        process.kill(existingPid, "SIGKILL");
        await sleep(500); // Wait for cleanup
      } catch (error) {
        log.error(
          `Failed to kill process on port ${config.api.port}: ${(error as Error).message}`
        );
        process.exit(1);
      }
    } else {
      log.error(
        `Port ${config.api.port} is already in use${existingPid ? ` by PID ${existingPid}` : ""}. Use --force to kill it.`
      );
      process.exit(1);
    }
  }

  // Open database
  const dbPath = path.join(config.hub.databaseDir, "brain.db");
  const db = openDatabase({ path: dbPath });
  migrate(db);

  log.info(`Database opened at ${dbPath}`);

  // Write PID file
  writePidFile(process.pid);
  log.info(`PID ${process.pid} written`);

  // Create queue manager
  const queue = createQueueManager(db);
  log.info("Queue manager initialized");

  // Release any stale jobs from previous run
  // We use releaseAllRunning() here instead of releaseStale() because on daemon startup
  // any jobs marked as 'running' are definitely stale regardless of lock expiration.
  const releasedCount = queue.releaseAllRunning();
  if (releasedCount > 0) {
    log.info(
      `Released ${releasedCount} stale running jobs from previous session`
    );
  }

  // Periodically release stale locks (every 15 minutes) to recover from worker crashes
  const staleReleaseInterval = setInterval(
    () => {
      const staleCount = queue.releaseStale();
      if (staleCount > 0) {
        log.info(`Released ${staleCount} stale locks`);
      }
    },
    15 * 60 * 1000
  );

  // Create WebSocket manager for real-time updates
  const wsManager = new WebSocketManager({
    info: (msg: string) => websocketLogger.info(msg),
    error: (msg: string) => websocketLogger.error(msg),
    debug: (msg: string) => websocketLogger.debug(msg),
  });
  log.info("WebSocket manager created");

  // Create worker with WebSocket event broadcasting
  const worker = createWorker({
    id: "worker-1",
    config,
    logger: {
      info: (msg: string) => workerLogger.info(msg),
      warn: (msg: string) => workerLogger.warn(msg),
      error: (msg: string) => workerLogger.error(msg),
      debug: (msg: string) => workerLogger.debug(msg),
    },
    onJobStarted: (job, workerId) => {
      // Broadcast analysis started via WebSocket
      wsManager.broadcastAnalysisStarted(job, workerId);
      return Promise.resolve();
    },
    onNodeCreated: (job, node) => {
      // Broadcast analysis completed + node created via WebSocket
      wsManager.broadcastAnalysisCompleted(job, node);
      return Promise.resolve();
    },
    onJobFailed: (job, error) => {
      // Broadcast analysis failed via WebSocket
      wsManager.broadcastAnalysisFailed(job, error, false);
      return Promise.resolve();
    },
  });
  worker.initialize(db);
  log.info("Worker created and initialized");

  // Create scheduler for nightly jobs (takes full DaemonConfig)
  const scheduler = createScheduler(config.daemon, queue, db, {
    info: (msg: string) => schedulerLogger.info(msg),
    warn: (msg: string) => schedulerLogger.warn(msg),
    error: (msg: string) => schedulerLogger.error(msg),
    debug: (msg: string) => schedulerLogger.debug(msg),
  });
  log.info("Scheduler created");

  // Create consolidation scheduler for memory decay and creative association
  const consolidationLogger = createLogger("consolidation");
  const consolidationScheduler = createConsolidationScheduler(
    db,
    {
      decaySchedule: config.daemon.decaySchedule,
      creativeSchedule: config.daemon.creativeSchedule,
      baseDecayRate: config.daemon.baseDecayRate,
      creativeConfig: {
        similarityThreshold: config.daemon.creativeSimilarityThreshold,
      },
    },
    {
      info: (msg: string) => consolidationLogger.info(msg),
      warn: (msg: string) => consolidationLogger.warn(msg),
      error: (msg: string) => consolidationLogger.error(msg),
      debug: (msg: string) => consolidationLogger.debug(msg),
    }
  );
  log.info("Consolidation scheduler created");

  // Create session watcher
  const watcher = new SessionWatcher({
    idleTimeoutMinutes: config.daemon.idleTimeoutMinutes,
  });

  // Handle session events
  const handleSessionIdle = (event: Event) => {
    const sessionPath = getSessionPath(event);
    if (sessionPath) {
      log.info(`Session idle, queuing for analysis: ${sessionPath}`);
      // Queue for analysis if not already queued
      if (!queue.hasExistingJob(sessionPath)) {
        queue.enqueue({
          type: "initial",
          priority: PRIORITY.INITIAL,
          sessionFile: sessionPath,
          context: { triggeredBy: "idle" },
        });
      }
    }
  };

  const handleSessionChange = (event: Event) => {
    const sessionPath = getSessionPath(event);
    if (sessionPath) {
      log.debug(`Session changed: ${sessionPath}`);
      // Watcher handles idle detection, just log for now
    }
  };

  watcher.addEventListener(SESSION_EVENTS.IDLE, handleSessionIdle);
  watcher.addEventListener(SESSION_EVENTS.CHANGE, handleSessionChange);
  watcher.addEventListener(SESSION_EVENTS.ERROR, handleWatcherError);

  // Start components - use startFromConfig for PiBrainConfig
  await watcher.startFromConfig(config);
  log.info("Session watcher started");

  scheduler.start();
  log.info("Scheduler started");

  consolidationScheduler.start();
  log.info("Consolidation scheduler started");

  worker.start();
  log.info("Worker started");

  // Start API server with WebSocket support
  const { app: server } = await startServer(
    db,
    config.api,
    config.daemon,
    wsManager
  );
  log.info(
    `API server listening on http://${config.api.host}:${config.api.port}`
  );

  // Broadcast daemon status periodically
  const statusBroadcastInterval = setInterval(() => {
    const queueStats = queue.getStats();
    const dailyStats = queue.getDailyStats();
    const workerStatus = worker.getStatus();

    wsManager.broadcastDaemonStatus({
      running: true,
      workers: {
        total: 1, // Currently single worker
        active: workerStatus.currentJob ? 1 : 0,
        idle: workerStatus.currentJob ? 0 : 1,
      },
      queue: {
        pending: queueStats.pending,
        running: queueStats.running,
        completedToday: dailyStats.completedToday,
        failedToday: dailyStats.failedToday,
      },
    });
  }, 2000); // Every 2 seconds

  log.info("pi-brain daemon is running");

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    log.info(`Received ${signal}, shutting down...`);

    clearInterval(staleReleaseInterval);
    clearInterval(statusBroadcastInterval);

    // Stop components in order
    worker.stop();
    log.info("Worker stopped");

    scheduler.stop();
    log.info("Scheduler stopped");

    consolidationScheduler.stop();
    log.info("Consolidation scheduler stopped");

    await watcher.stop();
    log.info("Watcher stopped");

    await server.close();
    log.info("API server stopped");

    wsManager.closeAll();
    log.info("WebSocket connections closed");

    db.close();
    log.info("Database closed");

    removePidFile();
    log.info("Shutdown complete");

    process.exit(0);
  };

  process.on("SIGTERM", () => {
    shutdown("SIGTERM");
  });
  process.on("SIGINT", () => {
    shutdown("SIGINT");
  });

  // Keep process alive
  process.stdin.resume();
}

// Run main using an async IIFE
(async () => {
  try {
    await main();
  } catch (error) {
    log.error("Fatal error:", error);
    removePidFile();
    process.exit(1);
  }
})();
