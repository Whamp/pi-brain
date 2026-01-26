#!/usr/bin/env node
/**
 * CLI for pi-brain
 *
 * Commands:
 * - pi-brain viz       - Generate interactive HTML visualization of pi sessions
 * - pi-brain daemon    - Control the daemon (start, stop, status, queue, analyze)
 * - pi-brain health    - Run health checks
 */

import { Command } from "commander";
import { watch } from "node:fs";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import open from "open";

import {
  startDaemon,
  stopDaemon,
  getDaemonStatus,
  getQueueStatus,
  queueAnalysis,
  runHealthChecks,
  formatDaemonStatus,
  formatQueueStatus,
  formatHealthStatus,
  rebuildIndex,
} from "./daemon/index.js";
import {
  scanSessions,
  findForkRelationships,
  getDefaultSessionDir,
  getOverallStats,
} from "./parser/analyzer.js";
import { generateHTML } from "./web/generator.js";

const program = new Command();

program
  .name("pi-brain")
  .description("A second brain for pi coding agent sessions")
  .version("0.1.0");

// =============================================================================
// Visualization command
// =============================================================================

program
  .command("viz")
  .description(
    "Generate interactive HTML visualization of pi coding agent sessions"
  )
  .option("-o, --output <path>", "Output HTML file", "pi-sessions.html")
  .option(
    "-d, --session-dir <path>",
    "Session directory",
    getDefaultSessionDir()
  )
  .option("-w, --watch", "Watch for changes and regenerate")
  .option("--open", "Open in browser after generation")
  .option("-p, --project <path>", "Filter to specific project path")
  .option("-q, --quiet", "Suppress output except errors")
  .action(async (options) => {
    const log = options.quiet ? () => {} : console.log;

    try {
      const outputPath = resolve(options.output);
      const sessionDir = resolve(options.sessionDir);

      async function generate() {
        log(`Scanning sessions in ${sessionDir}...`);

        let sessions = await scanSessions(sessionDir);

        if (options.project) {
          sessions = sessions.filter((s) => s.header.cwd === options.project);
          log(
            `Filtered to ${sessions.length} sessions for project: ${options.project}`
          );
        }

        if (sessions.length === 0) {
          console.error("No sessions found");
          process.exit(1);
        }

        const stats = getOverallStats(sessions);
        log(
          `Found ${stats.totalSessions} sessions across ${stats.projectCount} projects`
        );
        log(
          `Total: ${stats.totalEntries.toLocaleString()} entries, ${stats.totalMessages.toLocaleString()} messages`
        );

        const forks = findForkRelationships(sessions);
        if (forks.length > 0) {
          log(`Found ${forks.length} fork relationships`);
        }

        log(`Generating visualization...`);
        const html = generateHTML(sessions, forks);

        await writeFile(outputPath, html, "utf8");
        log(`✓ Written to ${outputPath}`);

        return outputPath;
      }

      const generatedPath = await generate();

      if (options.open) {
        log(`Opening in browser...`);
        await open(generatedPath);
      }

      if (options.watch) {
        log(`\nWatching for changes in ${sessionDir}...`);
        log(`Press Ctrl+C to stop\n`);

        let debounceTimer: ReturnType<typeof setTimeout> | null = null;

        // Watch the session directory recursively
        const watcher = watch(
          sessionDir,
          { recursive: true },
          (_eventType, filename) => {
            if (!filename?.endsWith(".jsonl")) {
              return;
            }

            // Debounce to avoid multiple regenerations
            if (debounceTimer) {
              clearTimeout(debounceTimer);
            }
            debounceTimer = setTimeout(async () => {
              log(`\nChange detected: ${filename}`);
              try {
                await generate();
              } catch (error) {
                console.error("Regeneration failed:", error);
              }
            }, 500);
          }
        );

        // Keep process running
        process.on("SIGINT", () => {
          watcher.close();
          log("\nStopped watching");
          process.exit(0);
        });
      }
    } catch (error) {
      console.error("Error:", error);
      process.exit(1);
    }
  });

// =============================================================================
// Daemon command
// =============================================================================

const daemonCmd = program
  .command("daemon")
  .description("Control the pi-brain daemon");

daemonCmd
  .command("start")
  .description("Start the daemon")
  .option("-f, --foreground", "Run in foreground (for debugging)")
  .option("-c, --config <path>", "Config file path")
  .action(async (options) => {
    const result = await startDaemon({
      foreground: options.foreground,
      configPath: options.config,
    });

    if (result.success) {
      console.log(result.message);
      if (options.foreground) {
        console.log("Press Ctrl+C to stop");
        // In foreground mode, the daemon process would continue here
        // For now, we just exit since the actual daemon loop isn't implemented
        process.on("SIGINT", () => {
          console.log("\nDaemon stopped");
          process.exit(0);
        });
        process.on("SIGTERM", () => {
          console.log("\nDaemon stopped");
          process.exit(0);
        });
        // Keep process running
        await new Promise(() => {});
      }
    } else {
      console.error(result.message);
      process.exit(1);
    }
  });

daemonCmd
  .command("stop")
  .description("Stop the daemon")
  .option("--force", "Force stop without waiting for current job")
  .action(async (options) => {
    const result = await stopDaemon({ force: options.force });

    if (result.success) {
      console.log(result.message);
    } else {
      console.error(result.message);
      process.exit(1);
    }
  });

daemonCmd
  .command("status")
  .description("Show daemon status")
  .option("-c, --config <path>", "Config file path")
  .option("--json", "Output as JSON")
  .action((options) => {
    const status = getDaemonStatus(options.config);

    if (options.json) {
      console.log(JSON.stringify(status, null, 2));
    } else {
      console.log(formatDaemonStatus(status));
    }
  });

daemonCmd
  .command("queue")
  .description("Show analysis queue status")
  .option("-c, --config <path>", "Config file path")
  .option("--json", "Output as JSON")
  .action((options) => {
    try {
      const queueStatus = getQueueStatus(options.config);

      if (options.json) {
        console.log(JSON.stringify(queueStatus, null, 2));
      } else {
        console.log(formatQueueStatus(queueStatus));
      }
    } catch (error) {
      console.error(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

daemonCmd
  .command("analyze <path>")
  .description("Queue a session for analysis")
  .option("-c, --config <path>", "Config file path")
  .action((sessionPath, options) => {
    const result = queueAnalysis(sessionPath, options.config);

    if (result.success) {
      console.log(`${result.message} (job ID: ${result.jobId})`);
    } else {
      console.error(result.message);
      process.exit(1);
    }
  });

daemonCmd
  .command("rebuild-index")
  .description("Rebuild the SQLite index from JSON files")
  .option("-c, --config <path>", "Config file path")
  .action((options) => {
    const result = rebuildIndex(options.config);
    if (result.success) {
      console.log(result.message);
    } else {
      console.error(result.message);
      process.exit(1);
    }
  });

// =============================================================================
// Health command
// =============================================================================

program
  .command("health")
  .description("Run health checks")
  .option("-c, --config <path>", "Config file path")
  .option("--json", "Output as JSON")
  .action(async (options) => {
    const status = await runHealthChecks(options.config);

    if (options.json) {
      console.log(JSON.stringify(status, null, 2));
    } else {
      console.log(formatHealthStatus(status));
    }

    // Exit with error code if not healthy
    if (!status.healthy) {
      process.exit(1);
    }
  });

// =============================================================================
// Parse and run
// =============================================================================

program.parse();
