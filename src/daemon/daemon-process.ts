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

import { startServer } from "../api/server.js";
import { loadConfig, ensureDirectories } from "../config/config.js";
import { openDatabase, migrate } from "../storage/database.js";
import { writePidFile, removePidFile } from "./cli.js";
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

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--config" && args[i + 1]) {
    configPath = args[i + 1];
    i++;
  }
}

// =============================================================================
// Main Daemon Process
// =============================================================================

async function main(): Promise<void> {
  console.log("[daemon] Starting pi-brain daemon process...");

  // Load configuration
  const config = loadConfig(configPath);
  ensureDirectories(config);

  // Open database
  const dbPath = path.join(config.hub.databaseDir, "brain.db");
  const db = openDatabase({ path: dbPath });
  migrate(db);

  console.log(`[daemon] Database opened at ${dbPath}`);

  // Write PID file
  writePidFile(process.pid);
  console.log(`[daemon] PID ${process.pid} written`);

  // Create queue manager
  const queue = createQueueManager(db);
  console.log("[daemon] Queue manager initialized");

  // Create worker
  const worker = createWorker({
    id: "worker-1",
    config,
    logger: {
      info: (msg: string) => console.log(`[worker] ${msg}`),
      warn: (msg: string) => console.warn(`[worker] ${msg}`),
      error: (msg: string) => console.error(`[worker] ${msg}`),
      debug: (msg: string) => console.debug(`[worker] ${msg}`),
    },
  });
  console.log("[daemon] Worker created");

  worker.initialize(db);
  console.log("[daemon] Worker initialized");

  // Create scheduler for nightly jobs (takes full DaemonConfig)
  const scheduler = createScheduler(config.daemon, queue, db, {
    info: (msg: string) => console.log(`[scheduler] ${msg}`),
    warn: (msg: string) => console.warn(`[scheduler] ${msg}`),
    error: (msg: string) => console.error(`[scheduler] ${msg}`),
    debug: (msg: string) => console.debug(`[scheduler] ${msg}`),
  });
  console.log("[daemon] Scheduler created");

  // Create session watcher
  const watcher = new SessionWatcher({
    idleTimeoutMinutes: config.daemon.idleTimeoutMinutes,
  });

  // Handle session events
  const handleSessionIdle = (event: Event) => {
    const sessionPath = getSessionPath(event);
    if (sessionPath) {
      console.log(
        `[daemon] Session idle, queuing for analysis: ${sessionPath}`
      );
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
      console.log(`[daemon] Session changed: ${sessionPath}`);
      // Watcher handles idle detection, just log for now
    }
  };

  const handleError = (event: Event) => {
    const customEvent = event as CustomEvent;
    console.error("[daemon] Watcher error:", customEvent.detail?.error);
  };

  watcher.addEventListener(SESSION_EVENTS.IDLE, handleSessionIdle);
  watcher.addEventListener(SESSION_EVENTS.CHANGE, handleSessionChange);
  watcher.addEventListener(SESSION_EVENTS.ERROR, handleError);

  // Start components - use startFromConfig for PiBrainConfig
  await watcher.startFromConfig(config);
  console.log("[daemon] Session watcher started");

  scheduler.start();
  console.log("[daemon] Scheduler started");

  worker.start();
  console.log("[daemon] Worker started");

  // Start API server
  const server = await startServer(db, config.api, config.daemon);
  console.log(
    `[daemon] API server listening on http://${config.api.host}:${config.api.port}`
  );

  console.log("[daemon] pi-brain daemon is running");

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`[daemon] Received ${signal}, shutting down...`);

    // Stop components in order
    worker.stop();
    console.log("[daemon] Worker stopped");

    scheduler.stop();
    console.log("[daemon] Scheduler stopped");

    await watcher.stop();
    console.log("[daemon] Watcher stopped");

    await server.close();
    console.log("[daemon] API server stopped");

    db.close();
    console.log("[daemon] Database closed");

    removePidFile();
    console.log("[daemon] Shutdown complete");

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
    console.error("[daemon] Fatal error:", error);
    removePidFile();
    process.exit(1);
  }
})();
