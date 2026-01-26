/**
 * Daemon CLI - Command-line interface for controlling the pi-brain daemon
 *
 * Implements:
 * - pi-brain daemon start [--foreground] [--config <path>]
 * - pi-brain daemon stop [--force]
 * - pi-brain daemon status [--json]
 * - pi-brain daemon queue [--json]
 * - pi-brain daemon analyze <path>
 * - pi-brain health [--json]
 *
 * Based on specs/daemon.md CLI specification.
 */

import { spawn, type ChildProcess } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

import type { PiBrainConfig } from "../config/types.js";

import {
  DEFAULT_CONFIG_DIR,
  loadConfig,
  ensureDirectories,
  getSessionDirs,
} from "../config/config.js";
import { openDatabase, migrate } from "../storage/database.js";
import {
  clearAllData,
  insertNodeToDb,
  linkNodeToPredecessors,
} from "../storage/node-repository.js";
import {
  listNodeFiles,
  parseNodePath,
  readNodeFromPath,
} from "../storage/node-storage.js";
import {
  checkSkillAvailable,
  REQUIRED_SKILLS,
  OPTIONAL_SKILLS,
} from "./processor.js";
import {
  getQueueStatusSummary,
  createQueueManager,
  PRIORITY,
  type QueueStats,
  type AnalysisJob,
} from "./queue.js";

// =============================================================================
// Helper function
// =============================================================================

/**
 * Sleep for a specified duration (lint-compliant)
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// =============================================================================
// Types
// =============================================================================

/** PID file location */
export const PID_FILE = path.join(DEFAULT_CONFIG_DIR, "daemon.pid");

/** Log file location */
export const LOG_FILE = path.join(DEFAULT_CONFIG_DIR, "logs", "daemon.log");

/** Daemon status info */
export interface DaemonStatus {
  running: boolean;
  pid: number | null;
  uptime: number | null;
  uptimeFormatted: string | null;
  configPath: string;
}

/** Queue status info */
export interface QueueStatus {
  stats: QueueStats;
  pendingJobs: AnalysisJob[];
  runningJobs: AnalysisJob[];
  recentFailed: AnalysisJob[];
}

/** Health check result */
export interface HealthCheckResult {
  check: string;
  passed: boolean;
  message: string;
  fatal: boolean;
}

/** Overall health status */
export interface HealthStatus {
  healthy: boolean;
  warnings: number;
  results: HealthCheckResult[];
}

/** CLI output options */
export interface OutputOptions {
  json?: boolean;
  quiet?: boolean;
}

// =============================================================================
// PID File Management
// =============================================================================

/**
 * Read the daemon PID from the PID file
 */
export function readPidFile(): number | null {
  try {
    if (!fs.existsSync(PID_FILE)) {
      return null;
    }
    const content = fs.readFileSync(PID_FILE, "utf8").trim();
    const pid = Number.parseInt(content, 10);
    return Number.isNaN(pid) ? null : pid;
  } catch {
    return null;
  }
}

/**
 * Write the daemon PID to the PID file
 */
export function writePidFile(pid: number): void {
  const dir = path.dirname(PID_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(PID_FILE, String(pid), "utf8");
}

/**
 * Remove the PID file
 */
export function removePidFile(): void {
  try {
    if (fs.existsSync(PID_FILE)) {
      fs.unlinkSync(PID_FILE);
    }
  } catch {
    // Ignore errors
  }
}

/**
 * Check if a process with the given PID is running
 */
export function isProcessRunning(pid: number): boolean {
  try {
    // Sending signal 0 checks if process exists without affecting it
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if the daemon is currently running
 */
export function isDaemonRunning(): { running: boolean; pid: number | null } {
  const pid = readPidFile();
  if (pid === null) {
    return { running: false, pid: null };
  }

  if (isProcessRunning(pid)) {
    return { running: true, pid };
  }

  // Stale PID file - process not running
  removePidFile();
  return { running: false, pid: null };
}

// =============================================================================
// Uptime Formatting
// =============================================================================

/**
 * Format uptime in a human-readable way
 */
export function formatUptime(seconds: number): string {
  if (seconds < 60) {
    return `${Math.floor(seconds)}s`;
  }

  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts: string[] = [];
  if (days > 0) {
    parts.push(`${days}d`);
  }
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0) {
    parts.push(`${minutes}m`);
  }

  return parts.join(" ") || "0m";
}

/**
 * Get process uptime (approximate based on PID file modification time)
 */
export function getProcessUptime(): number | null {
  try {
    if (!fs.existsSync(PID_FILE)) {
      return null;
    }
    const stats = fs.statSync(PID_FILE);
    return (Date.now() - stats.mtimeMs) / 1000;
  } catch {
    return null;
  }
}

// =============================================================================
// Daemon Control
// =============================================================================

/** Start options */
export interface StartOptions {
  foreground?: boolean;
  configPath?: string;
}

/** Stop options */
export interface StopOptions {
  force?: boolean;
  timeoutMs?: number;
}

/**
 * Start the daemon process
 */
export async function startDaemon(options: StartOptions = {}): Promise<{
  success: boolean;
  message: string;
  pid?: number;
}> {
  const { foreground = false, configPath } = options;

  // Check if already running
  const status = isDaemonRunning();
  if (status.running) {
    return {
      success: false,
      message: `Daemon is already running with PID ${status.pid}`,
    };
  }

  // Load and validate config
  let config: PiBrainConfig;
  try {
    config = loadConfig(configPath);
  } catch (error) {
    return {
      success: false,
      message: `Failed to load config: ${(error as Error).message}`,
    };
  }

  // Ensure directories exist
  try {
    ensureDirectories(config);
  } catch (error) {
    return {
      success: false,
      message: `Failed to create directories: ${(error as Error).message}`,
    };
  }

  if (foreground) {
    // Run in foreground - don't detach
    writePidFile(process.pid);
    return {
      success: true,
      message: "Daemon starting in foreground mode...",
      pid: process.pid,
    };
  }

  // Spawn detached daemon process
  const daemonScript = path.join(import.meta.dirname, "daemon-process.js");

  // Ensure log directory exists
  const logDir = path.dirname(LOG_FILE);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const logStream = fs.openSync(LOG_FILE, "a");

  const args = ["--daemon"];
  if (configPath) {
    args.push("--config", configPath);
  }

  let child: ChildProcess;
  try {
    child = spawn(process.execPath, [daemonScript, ...args], {
      detached: true,
      stdio: ["ignore", logStream, logStream],
      env: {
        ...process.env,
        PI_BRAIN_DAEMON: "1",
      },
    });
  } catch (error) {
    fs.closeSync(logStream);
    return {
      success: false,
      message: `Failed to spawn daemon: ${(error as Error).message}`,
    };
  }

  if (!child.pid) {
    fs.closeSync(logStream);
    return {
      success: false,
      message: "Failed to get daemon PID",
    };
  }

  writePidFile(child.pid);
  child.unref();
  fs.closeSync(logStream);

  // Give it a moment to start
  await sleep(500);

  // Verify it's running
  if (!isProcessRunning(child.pid)) {
    removePidFile();
    return {
      success: false,
      message: "Daemon process exited immediately. Check logs for details.",
    };
  }

  return {
    success: true,
    message: `Daemon started with PID ${child.pid}`,
    pid: child.pid,
  };
}

/**
 * Stop the daemon process
 */
export async function stopDaemon(options: StopOptions = {}): Promise<{
  success: boolean;
  message: string;
}> {
  const { force = false, timeoutMs = 10_000 } = options;

  const status = isDaemonRunning();
  if (!status.running || status.pid === null) {
    return {
      success: true,
      message: "Daemon is not running",
    };
  }

  const { pid } = status;

  try {
    // Send appropriate signal
    const signal = force ? "SIGKILL" : "SIGTERM";
    process.kill(pid, signal);

    if (force) {
      removePidFile();
      return {
        success: true,
        message: `Daemon forcefully stopped (PID ${pid})`,
      };
    }

    // Wait for graceful shutdown
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      if (!isProcessRunning(pid)) {
        removePidFile();
        return {
          success: true,
          message: `Daemon stopped gracefully (PID ${pid})`,
        };
      }
      await sleep(100);
    }

    // Timeout - process still running
    return {
      success: false,
      message: `Daemon did not stop within ${timeoutMs / 1000}s. Use --force to kill immediately.`,
    };
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ESRCH") {
      // Process not found
      removePidFile();
      return {
        success: true,
        message: "Daemon was not running (stale PID file removed)",
      };
    }
    return {
      success: false,
      message: `Failed to stop daemon: ${err.message}`,
    };
  }
}

/**
 * Get daemon status information
 */
export function getDaemonStatus(configPath?: string): DaemonStatus {
  const { running, pid } = isDaemonRunning();
  const uptime = running ? getProcessUptime() : null;
  const uptimeFormatted = uptime === null ? null : formatUptime(uptime);

  return {
    running,
    pid,
    uptime,
    uptimeFormatted,
    configPath: configPath ?? path.join(DEFAULT_CONFIG_DIR, "config.yaml"),
  };
}

// =============================================================================
// Queue Operations
// =============================================================================

/**
 * Get queue status information
 */
export function getQueueStatus(configPath?: string): QueueStatus {
  const config = loadConfig(configPath);
  const dbPath = path.join(config.hub.databaseDir, "brain.db");

  // Check if database exists
  if (!fs.existsSync(dbPath)) {
    return {
      stats: {
        pending: 0,
        running: 0,
        completed: 0,
        failed: 0,
        avgDurationMinutes: null,
        total: 0,
      },
      pendingJobs: [],
      runningJobs: [],
      recentFailed: [],
    };
  }

  const db = openDatabase({ path: dbPath });
  migrate(db);

  try {
    return getQueueStatusSummary(db);
  } finally {
    db.close();
  }
}

/**
 * Queue a session for analysis
 */
export function queueAnalysis(
  sessionPath: string,
  configPath?: string
): { success: boolean; message: string; jobId?: string } {
  // Validate session file exists
  const resolvedPath = path.resolve(sessionPath);
  if (!fs.existsSync(resolvedPath)) {
    return {
      success: false,
      message: `Session file not found: ${resolvedPath}`,
    };
  }

  if (!resolvedPath.endsWith(".jsonl")) {
    return {
      success: false,
      message: "Session file must be a .jsonl file",
    };
  }

  const config = loadConfig(configPath);
  const dbPath = path.join(config.hub.databaseDir, "brain.db");

  // Ensure database exists
  const db = openDatabase({ path: dbPath });
  migrate(db);
  const queue = createQueueManager(db);

  try {
    // Check if already queued (pending or running with same session file)
    if (queue.hasExistingJob(resolvedPath)) {
      return {
        success: false,
        message: "Session is already queued for analysis",
      };
    }

    // Queue with high priority (user-triggered)
    const jobId = queue.enqueue({
      type: "initial",
      priority: PRIORITY.USER_TRIGGERED,
      sessionFile: resolvedPath,
      context: { userTriggered: true },
    });

    return {
      success: true,
      message: `Session queued for analysis`,
      jobId,
    };
  } finally {
    db.close();
  }
}

// =============================================================================
// Health Checks
// =============================================================================

/**
 * Check if the pi CLI is available
 */
async function checkPiCli(): Promise<HealthCheckResult> {
  return new Promise((resolve) => {
    const child = spawn("which", ["pi"]);
    let output = "";

    child.stdout.on("data", (data) => {
      output += data.toString();
    });

    child.on("close", (code) => {
      if (code === 0 && output.trim()) {
        resolve({
          check: "pi-cli",
          passed: true,
          message: `Pi CLI found at ${output.trim()}`,
          fatal: false,
        });
      } else {
        resolve({
          check: "pi-cli",
          passed: false,
          message:
            "Pi CLI not found in PATH. Install pi-coding-agent globally.",
          fatal: true,
        });
      }
    });

    child.on("error", () => {
      resolve({
        check: "pi-cli",
        passed: false,
        message: "Could not check for pi CLI",
        fatal: true,
      });
    });
  });
}

/**
 * Check required skills
 */
async function checkRequiredSkills(): Promise<HealthCheckResult> {
  const missing: string[] = [];

  for (const skill of REQUIRED_SKILLS) {
    const available = await checkSkillAvailable(skill);
    if (!available) {
      missing.push(skill);
    }
  }

  if (missing.length > 0) {
    return {
      check: "required-skills",
      passed: false,
      message: `Missing required skills: ${missing.join(", ")}. Install in ~/skills/`,
      fatal: true,
    };
  }

  return {
    check: "required-skills",
    passed: true,
    message: `Required skills available: ${REQUIRED_SKILLS.join(", ")}`,
    fatal: false,
  };
}

/**
 * Check optional skills
 */
async function checkOptionalSkills(): Promise<HealthCheckResult> {
  const missing: string[] = [];

  for (const skill of OPTIONAL_SKILLS) {
    const available = await checkSkillAvailable(skill);
    if (!available) {
      missing.push(skill);
    }
  }

  if (missing.length > 0) {
    return {
      check: "optional-skills",
      passed: false,
      message: `Optional skills not found: ${missing.join(", ")}`,
      fatal: false,
    };
  }

  return {
    check: "optional-skills",
    passed: true,
    message: `Optional skills available: ${OPTIONAL_SKILLS.join(", ")}`,
    fatal: false,
  };
}

/**
 * Check sessions directory
 */
function checkSessionsDir(config: PiBrainConfig): HealthCheckResult {
  const dirs = getSessionDirs(config);
  const existing: string[] = [];
  const missing: string[] = [];

  for (const dir of dirs) {
    if (fs.existsSync(dir)) {
      existing.push(dir);
    } else {
      missing.push(dir);
    }
  }

  if (missing.length > 0 && existing.length === 0) {
    return {
      check: "sessions-dir",
      passed: false,
      message: `No session directories found: ${missing.join(", ")}`,
      fatal: true,
    };
  }

  if (missing.length > 0) {
    return {
      check: "sessions-dir",
      passed: false,
      message: `Some session directories missing: ${missing.join(", ")}`,
      fatal: false,
    };
  }

  // Count sessions
  let sessionCount = 0;
  for (const dir of existing) {
    try {
      const entries = fs.readdirSync(dir, { recursive: true });
      sessionCount += entries.filter((e) =>
        String(e).endsWith(".jsonl")
      ).length;
    } catch {
      // Ignore
    }
  }

  return {
    check: "sessions-dir",
    passed: true,
    message: `Sessions directory exists with ${sessionCount} sessions`,
    fatal: false,
  };
}

/**
 * Check database access
 */
function checkDatabaseAccess(config: PiBrainConfig): HealthCheckResult {
  const dbPath = path.join(config.hub.databaseDir, "brain.db");

  try {
    // Ensure directory exists
    if (!fs.existsSync(config.hub.databaseDir)) {
      fs.mkdirSync(config.hub.databaseDir, { recursive: true });
    }

    const db = openDatabase({ path: dbPath });
    migrate(db);
    db.exec("SELECT 1");
    db.close();

    return {
      check: "database",
      passed: true,
      message: `Database writable at ${dbPath}`,
      fatal: false,
    };
  } catch (error) {
    return {
      check: "database",
      passed: false,
      message: `Database error: ${(error as Error).message}`,
      fatal: true,
    };
  }
}

/**
 * Check prompt file
 */
function checkPromptFile(config: PiBrainConfig): HealthCheckResult {
  if (fs.existsSync(config.daemon.promptFile)) {
    return {
      check: "prompt-file",
      passed: true,
      message: "Prompt file exists",
      fatal: false,
    };
  }

  return {
    check: "prompt-file",
    passed: false,
    message: `Prompt file not found: ${config.daemon.promptFile}`,
    fatal: true,
  };
}

/**
 * Run all health checks
 */
export async function runHealthChecks(
  configPath?: string
): Promise<HealthStatus> {
  const config = loadConfig(configPath);

  // Run async checks first, then sync checks
  const asyncResults = await Promise.all([
    checkPiCli(),
    checkRequiredSkills(),
    checkOptionalSkills(),
  ]);

  // Run sync checks
  const syncResults = [
    checkSessionsDir(config),
    checkDatabaseAccess(config),
    checkPromptFile(config),
  ];

  const results = [...asyncResults, ...syncResults];

  const failed = results.filter((r) => !r.passed);
  const fatal = failed.filter((r) => r.fatal);
  const warnings = failed.length - fatal.length;

  return {
    healthy: fatal.length === 0,
    warnings,
    results,
  };
}

// =============================================================================
// Output Formatting
// =============================================================================

/**
 * Format daemon status for display
 */
export function formatDaemonStatus(
  status: DaemonStatus,
  _options: OutputOptions = {}
): string {
  const lines = [
    "Daemon Status",
    "─".repeat(35),
    `Status:      ${status.running ? "running" : "stopped"}`,
  ];

  if (status.running && status.pid !== null) {
    lines.push(`PID:         ${status.pid}`);
  }

  if (status.uptimeFormatted) {
    lines.push(`Uptime:      ${status.uptimeFormatted}`);
  }

  lines.push(`Config:      ${status.configPath}`);

  return lines.join("\n");
}

/**
 * Format queue status for display
 */
export function formatQueueStatus(
  queueStatus: QueueStatus,
  _options: OutputOptions = {}
): string {
  const { stats } = queueStatus;

  const lines = [
    "Analysis Queue",
    "─".repeat(60),
    `Summary: ${stats.pending} pending, ${stats.running} running, ${stats.completed} completed, ${stats.failed} failed`,
  ];

  if (stats.avgDurationMinutes !== null) {
    lines.push(`Avg duration: ${stats.avgDurationMinutes.toFixed(1)} min`);
  }

  if (queueStatus.runningJobs.length > 0) {
    lines.push("");
    lines.push("Running:");
    for (const job of queueStatus.runningJobs) {
      const session = truncatePath(job.sessionFile, 50);
      lines.push(`  ${job.id.slice(0, 8)}  ${job.type.padEnd(12)}  ${session}`);
    }
  }

  if (queueStatus.pendingJobs.length > 0) {
    lines.push("");
    lines.push("Pending:");
    for (const job of queueStatus.pendingJobs) {
      const session = truncatePath(job.sessionFile, 50);
      lines.push(`  ${job.id.slice(0, 8)}  ${job.type.padEnd(12)}  ${session}`);
    }
    if (stats.pending > queueStatus.pendingJobs.length) {
      lines.push(
        `  ... and ${stats.pending - queueStatus.pendingJobs.length} more`
      );
    }
  }

  if (queueStatus.recentFailed.length > 0) {
    lines.push("");
    lines.push("Recent failures:");
    for (const job of queueStatus.recentFailed) {
      const session = truncatePath(job.sessionFile, 40);
      const error = job.error ? truncateString(job.error, 30) : "Unknown error";
      lines.push(`  ${job.id.slice(0, 8)}  ${session}  ${error}`);
    }
  }

  return lines.join("\n");
}

/**
 * Get icon for health check result
 */
function getHealthIcon(result: HealthCheckResult): string {
  if (result.passed) {
    return "✓";
  }
  return result.fatal ? "✗" : "⚠";
}

/**
 * Format health check results for display
 */
export function formatHealthStatus(
  status: HealthStatus,
  _options: OutputOptions = {}
): string {
  const lines = ["pi-brain Health Check", "─".repeat(35)];

  for (const result of status.results) {
    const icon = getHealthIcon(result);
    lines.push(`${icon} ${result.check}: ${result.message}`);
  }

  lines.push("");
  if (status.healthy) {
    const suffix =
      status.warnings > 0
        ? ` (${status.warnings} warning${status.warnings > 1 ? "s" : ""})`
        : "";
    lines.push(`Status: Ready${suffix}`);
  } else {
    lines.push("Status: Not ready (fatal errors found)");
  }

  return lines.join("\n");
}

/**
 * Truncate a path for display
 */
function truncatePath(filePath: string, maxLen: number): string {
  if (filePath.length <= maxLen) {
    return filePath;
  }
  return "..." + filePath.slice(-(maxLen - 3));
}

/**
 * Rebuild the SQLite index from JSON files
 */
export function rebuildIndex(configPath?: string): {
  success: boolean;
  message: string;
  count: number;
} {
  const config = loadConfig(configPath);
  const dbPath = path.join(config.hub.databaseDir, "brain.db");

  // Check if daemon is running
  const { running } = isDaemonRunning();
  if (running) {
    return {
      success: false,
      message: "Daemon is running. Please stop it before rebuilding the index.",
      count: 0,
    };
  }

  // Ensure database exists
  const db = openDatabase({ path: dbPath });
  migrate(db);

  try {
    console.log("Scanning node files...");
    const files = listNodeFiles({
      nodesDir: path.join(config.hub.databaseDir, "nodes"),
    });

    // Group by ID to find latest versions
    const latestFiles = new Map<string, { version: number; path: string }>();

    for (const file of files) {
      const parsed = parseNodePath(file);
      if (!parsed) {
        continue;
      }

      const current = latestFiles.get(parsed.nodeId);
      if (!current || parsed.version > current.version) {
        latestFiles.set(parsed.nodeId, { version: parsed.version, path: file });
      }
    }

    console.log(
      `Found ${files.length} files, ${latestFiles.size} unique nodes.`
    );
    console.log("Clearing database...");

    clearAllData(db);

    // Phase 1: Insert Nodes
    console.log("Phase 1: Inserting nodes...");
    let insertCount = 0;
    const allFiles = [...latestFiles.values()];
    const batchSize = 100;

    const processInsertBatch = db.transaction((files: typeof allFiles) => {
      for (const { path: filePath } of files) {
        try {
          const node = readNodeFromPath(filePath);
          insertNodeToDb(db, node, filePath);
          insertCount++;
        } catch (error) {
          console.error(`\nFailed to import ${filePath}:`, error);
        }
      }
    });

    for (let i = 0; i < allFiles.length; i += batchSize) {
      const batch = allFiles.slice(i, i + batchSize);
      processInsertBatch(batch);
      process.stdout.write(
        `\rInserted ${insertCount} / ${allFiles.length} nodes...`
      );
    }
    console.log(`\nInserted ${insertCount} nodes.`);

    // Phase 2: Link Nodes
    console.log("Phase 2: Linking nodes...");
    let linkCount = 0;

    const processLinkBatch = db.transaction((files: typeof allFiles) => {
      for (const { path: filePath } of files) {
        try {
          const node = readNodeFromPath(filePath);
          linkNodeToPredecessors(db, node);
          linkCount++;
        } catch (error) {
          console.error(`\nFailed to link ${filePath}:`, error);
        }
      }
    });

    for (let i = 0; i < allFiles.length; i += batchSize) {
      const batch = allFiles.slice(i, i + batchSize);
      processLinkBatch(batch);
      process.stdout.write(
        `\rLinked ${linkCount} / ${allFiles.length} nodes...`
      );
    }

    console.log(`\nRebuild complete. Processed ${insertCount} nodes.`);
    console.log(
      "Note: Any metadata not stored in JSON (like user feedback) has been reset."
    );

    return {
      success: true,
      message: `Index rebuilt successfully. Processed ${insertCount} nodes.`,
      count: insertCount,
    };
  } catch (error) {
    return {
      success: false,
      message: `Rebuild failed: ${(error as Error).message}`,
      count: 0,
    };
  } finally {
    db.close();
  }
}

/**
 * Truncate a string for display
 */
function truncateString(str: string, maxLen: number): string {
  if (str.length <= maxLen) {
    return str;
  }
  return str.slice(0, maxLen - 3) + "...";
}
