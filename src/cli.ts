#!/usr/bin/env node
/**
 * CLI for pi-brain
 *
 * Commands:
 * - pi-brain viz       - Generate interactive HTML visualization of pi sessions
 * - pi-brain daemon    - Control the daemon (start, stop, status, queue, analyze)
 * - pi-brain health    - Run health checks
 * - pi-brain sync      - Manage session sync from spokes
 */

import { Command } from "commander";
import { watch } from "node:fs";
import { writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import open from "open";

import type { AggregatedInsight } from "./types/index.js";

import { loadConfig } from "./config/index.js";
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
import {
  generateAgentsForModel,
  listModelsWithInsights,
  previewAgentsForModel,
} from "./prompt/agents-generator.js";
import {
  autoDisableIneffectiveInsights,
  measureAndStoreEffectiveness,
} from "./prompt/effectiveness.js";
import {
  generatePromptAdditionsFromDb,
  formatPromptAdditionsDocument,
  getPromptAdditionsForModel,
} from "./prompt/prompt-generator.js";
import {
  injectInsights,
  removeInjectedInsights,
  getInjectionStatus,
} from "./prompt/prompt-injector.js";
import { openDatabase, migrate } from "./storage/database.js";
import {
  getInsight,
  listInsights,
  updateInsightPrompt,
} from "./storage/pattern-repository.js";
import {
  getSyncStatus,
  formatSyncStatus,
  runRsync,
  listSpokeSessions,
} from "./sync/index.js";
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
// Sync command
// =============================================================================

const syncCmd = program
  .command("sync")
  .description("Manage session sync from spoke machines");

syncCmd
  .command("status")
  .description("Show sync status for all spokes")
  .option("-c, --config <path>", "Config file path")
  .option("--json", "Output as JSON")
  .action(async (options) => {
    try {
      const config = loadConfig(options.config);
      const status = await getSyncStatus(config);

      if (options.json) {
        console.log(JSON.stringify(status, null, 2));
      } else {
        console.log(formatSyncStatus(status));
      }
    } catch (error) {
      console.error(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

syncCmd
  .command("run")
  .description("Run rsync for configured spokes")
  .option("-c, --config <path>", "Config file path")
  .option("-s, --spoke <name>", "Sync specific spoke only")
  .option("-n, --dry-run", "Show what would be transferred without syncing")
  .option("--delete", "Delete files on hub that don't exist on spoke")
  .option("--bwlimit <kbps>", "Bandwidth limit in KB/s", "0")
  .action(async (options) => {
    try {
      const config = loadConfig(options.config);
      const rsyncSpokes = config.spokes.filter((s) => s.syncMethod === "rsync");

      if (rsyncSpokes.length === 0) {
        console.error("No spokes configured with rsync sync method.");
        console.error(
          "\nTo configure rsync spokes, add to ~/.pi-brain/config.yaml:"
        );
        console.error("  spokes:");
        console.error("    - name: laptop");
        console.error("      sync_method: rsync");
        console.error("      source: user@laptop:~/.pi/agent/sessions");
        console.error("      path: ~/.pi-brain/synced/laptop");
        process.exit(1);
      }

      // Filter to specific spoke if requested
      let spokesToSync = rsyncSpokes;
      if (options.spoke) {
        spokesToSync = rsyncSpokes.filter((s) => s.name === options.spoke);
        if (spokesToSync.length === 0) {
          console.error(
            `Spoke "${options.spoke}" not found or not configured for rsync.`
          );
          console.error("\nAvailable rsync spokes:");
          for (const s of rsyncSpokes) {
            console.error(`  - ${s.name}`);
          }
          process.exit(1);
        }
      }

      const bwLimit = Number.parseInt(options.bwlimit, 10);

      console.log(options.dryRun ? "Dry run mode\n" : "Starting sync...\n");

      let hasErrors = false;

      for (const spoke of spokesToSync) {
        console.log(`Syncing ${spoke.name}...`);

        const result = await runRsync(spoke, {
          dryRun: options.dryRun,
          delete: options.delete,
          bwLimit,
        });

        if (result.success) {
          console.log(`  ✓ ${result.message} (${result.durationMs}ms)`);
        } else {
          console.error(`  ✗ ${result.message}`);
          if (result.error) {
            console.error(`    Error: ${result.error}`);
          }
          hasErrors = true;
        }
      }

      console.log("");
      if (hasErrors) {
        console.error("Some syncs failed.");
        process.exit(1);
      } else {
        console.log("All syncs completed successfully.");
      }
    } catch (error) {
      console.error(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

syncCmd
  .command("list")
  .description("List sessions from spokes")
  .option("-c, --config <path>", "Config file path")
  .option("-s, --spoke <name>", "List sessions for specific spoke only")
  .option("-l, --long", "Show full paths")
  .action((options) => {
    try {
      const config = loadConfig(options.config);

      let { spokes } = config;
      if (options.spoke) {
        spokes = spokes.filter((s) => s.name === options.spoke);
        if (spokes.length === 0) {
          console.error(`Spoke "${options.spoke}" not found.`);
          console.error("\nAvailable spokes:");
          for (const s of config.spokes) {
            console.error(`  - ${s.name}`);
          }
          process.exit(1);
        }
      }

      if (spokes.length === 0) {
        console.error("No spokes configured.");
        process.exit(1);
      }

      for (const spoke of spokes) {
        const sessions = listSpokeSessions(spoke.path);

        console.log(
          `${spoke.name} (${spoke.syncMethod}): ${sessions.length} sessions`
        );

        if (sessions.length > 0) {
          for (const session of sessions) {
            if (options.long) {
              console.log(`  ${session}`);
            } else {
              // Show relative path from spoke directory
              const relativePath = relative(spoke.path, session);
              console.log(`  ${relativePath}`);
            }
          }
        }

        console.log("");
      }
    } catch (error) {
      console.error(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

// =============================================================================
// Prompt Learning command
// =============================================================================

const promptCmd = program
  .command("prompt-learning")
  .description("Manage prompt learning from session insights");

promptCmd
  .command("preview")
  .description("Preview generated prompt additions")
  .option("-c, --config <path>", "Config file path")
  .option("-m, --model <name>", "Show only for specific model (provider/model)")
  .option("--min-confidence <n>", "Minimum confidence (0.0-1.0)", "0.5")
  .option("--min-frequency <n>", "Minimum frequency", "3")
  .option("--json", "Output as JSON")
  .action((options) => {
    try {
      const config = loadConfig(options.config);
      const db = openDatabase({ path: config.hub.databaseDir });
      migrate(db);

      const genOptions = {
        minConfidence: Number.parseFloat(options.minConfidence),
        minFrequency: Number.parseInt(options.minFrequency, 10),
      };

      if (options.model) {
        // Show for specific model
        const addition = getPromptAdditionsForModel(
          db,
          options.model,
          genOptions
        );

        if (!addition) {
          console.log(`No insights found for model: ${options.model}`);
          process.exit(0);
        }

        if (options.json) {
          console.log(JSON.stringify(addition, null, 2));
        } else {
          console.log(addition.section);
          console.log("");
          console.log(addition.content);
        }
      } else {
        // Show for all models
        const additions = generatePromptAdditionsFromDb(db, genOptions);

        if (additions.length === 0) {
          console.log("No actionable insights found.");
          console.log(
            "\nInsights need minimum frequency and confidence to be included."
          );
          process.exit(0);
        }

        if (options.json) {
          console.log(JSON.stringify(additions, null, 2));
        } else {
          console.log(formatPromptAdditionsDocument(additions));
        }
      }

      db.close();
    } catch (error) {
      console.error(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

promptCmd
  .command("insights")
  .description("List aggregated insights")
  .option("-c, --config <path>", "Config file path")
  .option("-m, --model <name>", "Filter by model")
  .option(
    "-t, --type <type>",
    "Filter by type (quirk, win, failure, tool_error, lesson)"
  )
  .option("--limit <n>", "Maximum insights to show", "20")
  .option("--json", "Output as JSON")
  .action((options) => {
    try {
      const config = loadConfig(options.config);
      const db = openDatabase({ path: config.hub.databaseDir });
      migrate(db);

      const insights = listInsights(db, {
        model: options.model,
        type: options.type,
        limit: Number.parseInt(options.limit, 10),
      });

      if (insights.length === 0) {
        console.log("No insights found.");
        process.exit(0);
      }

      if (options.json) {
        console.log(JSON.stringify(insights, null, 2));
      } else {
        console.log(`Found ${insights.length} insights:\n`);

        for (const insight of insights) {
          const modelStr = insight.model ? ` [${insight.model}]` : "";
          const toolStr = insight.tool ? ` (${insight.tool})` : "";
          const included = insight.promptIncluded ? " ✓" : "";

          console.log(
            `${insight.type}${modelStr}${toolStr}: ${insight.pattern}${included}`
          );
          console.log(
            `  freq=${insight.frequency} conf=${(insight.confidence * 100).toFixed(0)}% sev=${insight.severity}`
          );
          if (insight.workaround) {
            console.log(`  → ${insight.workaround}`);
          }
          console.log("");
        }
      }

      db.close();
    } catch (error) {
      console.error(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

promptCmd
  .command("enable <id>")
  .description("Enable an insight in system prompts")
  .option("-c, --config <path>", "Config file path")
  .action(async (id, options) => {
    try {
      const config = loadConfig(options.config);
      const db = openDatabase({ path: config.hub.databaseDir });
      migrate(db);

      const insight = getInsight(db, id);
      if (!insight) {
        console.error(`Error: Insight not found: ${id}`);
        process.exit(1);
      }

      updateInsightPrompt(
        db,
        id,
        insight.promptText || "",
        true,
        insight.promptVersion
      );
      console.log(`✓ Insight enabled: ${insight.pattern}`);

      db.close();
    } catch (error) {
      console.error(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

promptCmd
  .command("disable <id>")
  .description("Disable an insight in system prompts")
  .option("-c, --config <path>", "Config file path")
  .action(async (id, options) => {
    try {
      const config = loadConfig(options.config);
      const db = openDatabase({ path: config.hub.databaseDir });
      migrate(db);

      const insight = getInsight(db, id);
      if (!insight) {
        console.error(`Error: Insight not found: ${id}`);
        process.exit(1);
      }

      updateInsightPrompt(
        db,
        id,
        insight.promptText || "",
        false,
        insight.promptVersion
      );
      console.log(`✓ Insight disabled: ${insight.pattern}`);

      db.close();
    } catch (error) {
      console.error(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

promptCmd
  .command("measure")
  .description("Manually measure effectiveness of insights")
  .option("-c, --config <path>", "Config file path")
  .option("-i, --id <id>", "Measure specific insight only")
  .option("--days <n>", "Number of days for before/after periods", "7")
  .action(async (options) => {
    try {
      const config = loadConfig(options.config);
      const db = openDatabase({ path: config.hub.databaseDir });
      migrate(db);

      const days = Number.parseInt(options.days, 10);
      const now = new Date();
      const splitDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      const beforeStart = new Date(
        splitDate.getTime() - days * 24 * 60 * 60 * 1000
      );

      const beforePeriod = {
        start: beforeStart.toISOString(),
        end: splitDate.toISOString(),
      };
      const afterPeriod = {
        start: splitDate.toISOString(),
        end: now.toISOString(),
      };

      let insightsToMeasure: AggregatedInsight[] = [];
      if (options.id) {
        const insight = getInsight(db, options.id);
        if (insight) {
          insightsToMeasure = [insight];
        } else {
          console.error(`Error: Insight not found: ${options.id}`);
          process.exit(1);
        }
      } else {
        insightsToMeasure = listInsights(db, { promptIncluded: true });
      }

      console.log(
        `Measuring effectiveness for ${insightsToMeasure.length} insights...`
      );
      console.log(`Before: ${beforePeriod.start} to ${beforePeriod.end}`);
      console.log(`After:  ${afterPeriod.start} to ${afterPeriod.end}\n`);

      for (const insight of insightsToMeasure) {
        process.stdout.write(`  ${insight.pattern.slice(0, 40)}... `);
        const result = measureAndStoreEffectiveness(
          db,
          insight.id,
          beforePeriod,
          afterPeriod,
          insight.promptVersion || "manual"
        );

        const impStr =
          result.improvementPct > 0
            ? `+${result.improvementPct.toFixed(1)}%`
            : `${result.improvementPct.toFixed(1)}%`;
        const sigStr = result.statisticallySignificant ? " [SIG]" : "";

        console.log(`${impStr}${sigStr}`);
      }

      // Also run auto-disable
      console.log("\nChecking for ineffective insights to auto-disable...");
      const disabled = autoDisableIneffectiveInsights(db);
      if (disabled.length > 0) {
        console.log(`✓ Auto-disabled ${disabled.length} insights.`);
      } else {
        console.log("  No insights met the disable threshold.");
      }

      db.close();
    } catch (error) {
      console.error(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

promptCmd
  .command("inject")
  .description("Inject insights into prompts")
  .option("-c, --config <path>", "Config file path")
  .option(
    "-m, --method <method>",
    "Injection method: skill (recommended) or agents_file",
    "skill"
  )
  .option("--min-confidence <n>", "Minimum confidence (0.0-1.0)", "0.7")
  .option("--min-frequency <n>", "Minimum frequency", "5")
  .option("--skill-dir <path>", "Custom skill directory")
  .action((options) => {
    try {
      const config = loadConfig(options.config);
      const db = openDatabase({ path: config.hub.databaseDir });
      migrate(db);

      const result = injectInsights(db, {
        method: options.method,
        minConfidence: Number.parseFloat(options.minConfidence),
        minFrequency: Number.parseInt(options.minFrequency, 10),
        skillDir: options.skillDir,
      });

      db.close();

      if (result.success) {
        console.log(`✓ ${result.message}`);
        if (result.path) {
          console.log(`  Path: ${result.path}`);
        }
        if (result.models && result.models.length > 0) {
          console.log(`  Models: ${result.models.join(", ")}`);
        }
      } else {
        console.error(`✗ ${result.message}`);
        process.exit(1);
      }
    } catch (error) {
      console.error(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

promptCmd
  .command("remove")
  .description("Remove injected insights")
  .option(
    "-m, --method <method>",
    "Injection method: skill or agents_file",
    "skill"
  )
  .option("--skill-dir <path>", "Custom skill directory")
  .action((options) => {
    try {
      const result = removeInjectedInsights({
        method: options.method,
        skillDir: options.skillDir,
      });

      if (result.success) {
        console.log(`✓ ${result.message}`);
      } else {
        console.error(`✗ ${result.message}`);
        process.exit(1);
      }
    } catch (error) {
      console.error(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

promptCmd
  .command("status")
  .description("Show prompt injection status")
  .option("--skill-dir <path>", "Custom skill directory")
  .option("--json", "Output as JSON")
  .action((options) => {
    try {
      const status = getInjectionStatus({
        skillDir: options.skillDir,
      });

      if (options.json) {
        console.log(JSON.stringify(status, null, 2));
      } else {
        console.log("Prompt Injection Status:\n");
        console.log(
          `  Skill (brain-insights): ${status.skillExists ? "✓ installed" : "not installed"}`
        );
        console.log(`    Path: ${status.skillPath}`);
        console.log(
          `\n  AGENTS.md section: ${status.agentsHasSection ? "✓ present" : "not present"}`
        );
        console.log(`    Path: ${status.agentsPath}`);

        if (!status.skillExists && !status.agentsHasSection) {
          console.log("\n  No insights currently injected.");
          console.log(
            "  Run 'pi-brain prompt-learning inject' to inject insights."
          );
        }
      }
    } catch (error) {
      console.error(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

// =============================================================================
// Agents command (Model-Specific AGENTS.md)
// =============================================================================

const agentsCmd = program
  .command("agents")
  .description("Generate model-specific AGENTS.md files");

agentsCmd
  .command("list")
  .description("List all models with insights")
  .option("-c, --config <path>", "Config file path")
  .action((options) => {
    try {
      const config = loadConfig(options.config);
      const db = openDatabase({ path: config.hub.databaseDir });
      migrate(db);

      const models = listModelsWithInsights(db);

      if (models.length === 0) {
        console.log("No models with insights found.");
        console.log(
          "\nRun 'pi-brain daemon start' and analyze sessions to collect insights."
        );
      } else {
        console.log(`Found ${models.length} models with insights:\n`);
        for (const model of models) {
          console.log(`  ${model}`);
        }
      }

      db.close();
    } catch (error) {
      console.error(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

agentsCmd
  .command("generate <model>")
  .description("Generate AGENTS.md for a specific model")
  .option("-c, --config <path>", "Config file path")
  .option(
    "-o, --output-dir <path>",
    "Output directory (default: ~/.pi/agent/contexts)"
  )
  .option("--provider <provider>", "LLM provider for synthesis", "zai")
  .option("--synthesis-model <model>", "LLM model for synthesis", "glm-4.7")
  .option("--no-llm", "Skip LLM synthesis, use fallback template")
  .option("--min-confidence <n>", "Minimum confidence (0.0-1.0)", "0.5")
  .option("--min-frequency <n>", "Minimum frequency", "2")
  .option("--json", "Output as JSON")
  .action(async (targetModel, options) => {
    try {
      const config = loadConfig(options.config);
      const db = openDatabase({ path: config.hub.databaseDir });
      migrate(db);

      console.log(`Generating AGENTS.md for ${targetModel}...`);

      const generatorConfig = {
        provider: options.llm === false ? undefined : options.provider,
        model: options.llm === false ? undefined : options.synthesisModel,
        minConfidence: Number.parseFloat(options.minConfidence),
        minFrequency: Number.parseInt(options.minFrequency, 10),
        outputDir: options.outputDir,
      };

      // Always use generateAgentsForModel - it handles fallback when LLM config is undefined
      const result = await generateAgentsForModel(
        db,
        targetModel,
        generatorConfig
      );

      db.close();

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      if (result.success) {
        console.log(`✓ Generated AGENTS.md for ${targetModel}`);
        if (result.outputPath) {
          console.log(`  Path: ${result.outputPath}`);
        }
        if (result.stats) {
          console.log(`  Statistics:`);
          console.log(`    Quirks: ${result.stats.quirksIncluded}`);
          console.log(`    Wins: ${result.stats.winsIncluded}`);
          console.log(`    Tool errors: ${result.stats.toolErrorsIncluded}`);
          console.log(`    Failures: ${result.stats.failuresIncluded}`);
          console.log(`    Lessons: ${result.stats.lessonsIncluded}`);
          console.log(
            `    Friction clusters: ${result.stats.clustersIncluded}`
          );
        }
      } else {
        console.error(`✗ Failed: ${result.error}`);
        process.exit(1);
      }
    } catch (error) {
      console.error(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

agentsCmd
  .command("preview <model>")
  .description("Preview AGENTS.md content without saving")
  .option("-c, --config <path>", "Config file path")
  .option("--provider <provider>", "LLM provider for synthesis", "zai")
  .option("--synthesis-model <model>", "LLM model for synthesis", "glm-4.7")
  .option("--no-llm", "Skip LLM synthesis, use fallback template")
  .option("--min-confidence <n>", "Minimum confidence (0.0-1.0)", "0.5")
  .option("--min-frequency <n>", "Minimum frequency", "2")
  .action(async (targetModel, options) => {
    try {
      const config = loadConfig(options.config);
      const db = openDatabase({ path: config.hub.databaseDir });
      migrate(db);

      const generatorConfig = {
        provider: options.llm === false ? undefined : options.provider,
        model: options.llm === false ? undefined : options.synthesisModel,
        minConfidence: Number.parseFloat(options.minConfidence),
        minFrequency: Number.parseInt(options.minFrequency, 10),
      };

      const result = await previewAgentsForModel(
        db,
        targetModel,
        generatorConfig
      );

      db.close();

      if (result.success && result.content) {
        console.log(result.content);
      } else {
        console.error(`Error: ${result.error}`);
        process.exit(1);
      }
    } catch (error) {
      console.error(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

// =============================================================================
// Export command
// =============================================================================

const exportCmd = program
  .command("export")
  .description("Export data from the knowledge graph");

exportCmd
  .command("finetune")
  .description("Export fine-tuning dataset (JSONL)")
  .option("-c, --config <path>", "Config file path")
  .option("-o, --output <path>", "Output file path", "finetune.jsonl")
  .action(async (options) => {
    try {
      const { exportFineTuneData } = await import("./daemon/export.js");
      const result = await exportFineTuneData(options.output, options.config);
      if (result.success) {
        console.log(result.message);
      } else {
        console.error(result.message);
        process.exit(1);
      }
    } catch (error) {
      console.error(`Error: ${(error as Error).message}`);
      process.exit(1);
    }
  });

// =============================================================================
// Parse and run
// =============================================================================

program.parse();
