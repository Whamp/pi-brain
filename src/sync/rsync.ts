/**
 * Rsync-based session sync for pi-brain
 *
 * Syncs sessions from spoke machines to the hub using rsync over SSH.
 * Based on specs/sync-protocol.md.
 */

import { execFile, type ExecFileException } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { promisify } from "node:util";

import type { SpokeConfig } from "../config/types.js";

const execFileAsync = promisify(execFile);

/**
 * Result of an rsync operation
 */
export interface RsyncResult {
  success: boolean;
  spokeName: string;
  filesTransferred: number;
  bytesTransferred: number;
  message: string;
  durationMs: number;
  error?: string;
}

/**
 * Options for running rsync
 */
export interface RsyncOptions {
  /** Bandwidth limit in KB/s (0 = unlimited) */
  bwLimit?: number;
  /** Dry run (don't actually transfer) */
  dryRun?: boolean;
  /** Delete files on destination that don't exist on source */
  delete?: boolean;
  /** Additional rsync arguments */
  extraArgs?: string[];
  /** Timeout in milliseconds */
  timeoutMs?: number;
}

/**
 * Parse rsync stats output to get transfer details.
 *
 * Logs a warning if stats cannot be parsed from non-empty output,
 * which may indicate an older rsync version with different output format.
 */
function parseRsyncStats(output: string): {
  filesTransferred: number;
  bytesTransferred: number;
} {
  let filesTransferred = 0;
  let bytesTransferred = 0;

  // Try to parse from --stats output
  // Look for "Number of files transferred: X"
  const filesMatch = output.match(
    /Number of (?:regular )?files transferred:\s*(\d+)/i
  );
  if (filesMatch) {
    filesTransferred = Number.parseInt(filesMatch[1], 10);
  }

  // Look for "Total transferred file size: X bytes"
  const bytesMatch = output.match(/Total transferred file size:\s*([\d,]+)/i);
  if (bytesMatch) {
    bytesTransferred = Number.parseInt(bytesMatch[1].replaceAll(",", ""), 10);
  }

  // Warn if we have substantial output but couldn't parse stats
  // (indicates older rsync version or unexpected output format)
  const trimmedOutput = output.trim();
  if (trimmedOutput.length > 100 && !filesMatch && !bytesMatch) {
    console.warn(
      "[pi-brain] Warning: Could not parse rsync stats from output. " +
        "This may indicate an older rsync version with a different output format. " +
        "File transfer counts will show as 0."
    );
  }

  return { filesTransferred, bytesTransferred };
}

/**
 * Create a failed rsync result
 */
function createFailedResult(
  spokeName: string,
  message: string,
  durationMs: number,
  error?: string
): RsyncResult {
  return {
    success: false,
    spokeName,
    filesTransferred: 0,
    bytesTransferred: 0,
    message,
    durationMs,
    error,
  };
}

/**
 * Parse rsync error message to make it more user-friendly
 */
function parseRsyncError(
  stderr: string,
  source: string | undefined,
  code: number | null
): string {
  if (stderr.includes("Connection refused")) {
    return "SSH connection refused. Check if SSH is running on the spoke.";
  }
  if (stderr.includes("Permission denied")) {
    return "SSH permission denied. Check SSH key configuration.";
  }
  if (
    stderr.includes("No such file or directory") &&
    source &&
    stderr.includes(source)
  ) {
    return `Source directory not found: ${source}`;
  }
  if (stderr.includes("Host key verification failed")) {
    return "SSH host key verification failed. Add the spoke to known_hosts.";
  }
  return stderr.trim() || `rsync exited with code ${code}`;
}

/**
 * Run rsync for a spoke with rsync sync method
 */
export async function runRsync(
  spoke: SpokeConfig,
  options: RsyncOptions = {}
): Promise<RsyncResult> {
  const startTime = Date.now();

  // Merge spoke's rsyncOptions with passed options (passed options take precedence)
  const spokeOpts = spoke.rsyncOptions ?? {};
  const bwLimit = options.bwLimit ?? spokeOpts.bwLimit ?? 0;
  const dryRun = options.dryRun ?? false;
  const doDelete = options.delete ?? spokeOpts.delete ?? false;
  const extraArgs = options.extraArgs ?? spokeOpts.extraArgs ?? [];
  const timeoutMs =
    options.timeoutMs ??
    (spokeOpts.timeoutSeconds ? spokeOpts.timeoutSeconds * 1000 : 300_000);

  // Validate spoke has rsync method and source
  if (spoke.syncMethod !== "rsync") {
    return createFailedResult(
      spoke.name,
      `Spoke "${spoke.name}" is not configured for rsync (method: ${spoke.syncMethod})`,
      Date.now() - startTime
    );
  }

  if (!spoke.source) {
    return createFailedResult(
      spoke.name,
      `Spoke "${spoke.name}" is missing source field for rsync`,
      Date.now() - startTime
    );
  }

  // Ensure destination directory exists
  if (!fs.existsSync(spoke.path)) {
    fs.mkdirSync(spoke.path, { recursive: true });
  }

  // Build rsync arguments
  const args: string[] = [
    "-avz", // archive, verbose, compress
    "--stats", // show transfer statistics
  ];

  if (bwLimit > 0) {
    args.push(`--bwlimit=${bwLimit}`);
  }

  if (dryRun) {
    args.push("--dry-run");
  }

  if (doDelete) {
    args.push("--delete");
  }

  // Add extra args (validated in config to reject dangerous options like --rsh)
  args.push(...extraArgs);

  // Ensure source ends with / to sync contents, not the directory itself
  let { source } = spoke;
  if (!source.endsWith("/")) {
    source = `${source}/`;
  }

  // Ensure destination ends with /
  let dest = spoke.path;
  if (!dest.endsWith("/")) {
    dest = `${dest}/`;
  }

  args.push(source, dest);

  // Execute rsync
  try {
    const { stdout } = await execFileAsync("rsync", args, {
      timeout: timeoutMs,
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large outputs
    });

    const durationMs = Date.now() - startTime;
    const stats = parseRsyncStats(stdout);

    return {
      success: true,
      spokeName: spoke.name,
      filesTransferred: stats.filesTransferred,
      bytesTransferred: stats.bytesTransferred,
      message: dryRun
        ? `Dry run: would transfer ${stats.filesTransferred} files`
        : `Synced ${stats.filesTransferred} files (${formatBytes(stats.bytesTransferred)})`,
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const execError = error as ExecFileException;

    // Check for timeout
    if (execError.killed && execError.signal === "SIGTERM") {
      return createFailedResult(
        spoke.name,
        `Rsync timed out after ${timeoutMs / 1000}s`,
        durationMs,
        "Timeout"
      );
    }

    // Check for command not found
    if (execError.code === "ENOENT") {
      return createFailedResult(
        spoke.name,
        `Failed to run rsync for "${spoke.name}"`,
        durationMs,
        "rsync command not found. Install rsync on this system."
      );
    }

    // Parse rsync error
    const stderr = execError.stderr ?? "";
    const parsedError = parseRsyncError(
      stderr,
      spoke.source,
      execError.code ?? null
    );

    return createFailedResult(
      spoke.name,
      `Rsync failed for "${spoke.name}"`,
      durationMs,
      parsedError
    );
  }
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = bytes / k ** i;

  return `${size.toFixed(1)} ${units[i]}`;
}

/**
 * Check if rsync is available on the system
 *
 * Uses `rsync --version` instead of `which` for cross-platform compatibility
 * (works on Windows, Linux, macOS). Gracefully handles ENOENT.
 */
export async function isRsyncAvailable(): Promise<boolean> {
  try {
    await execFileAsync("rsync", ["--version"]);
    return true;
  } catch {
    // ENOENT means command not found, any other error also means unavailable
    return false;
  }
}

/**
 * Count session files in a spoke's sync directory
 */
export function countSpokeSessionFiles(spokePath: string): number {
  if (!fs.existsSync(spokePath)) {
    return 0;
  }

  try {
    const files = fs.readdirSync(spokePath, { recursive: true });
    return files.filter((f) => String(f).endsWith(".jsonl")).length;
  } catch {
    return 0;
  }
}

/**
 * Get list of session files from a spoke's sync directory
 */
export function listSpokeSessions(spokePath: string): string[] {
  if (!fs.existsSync(spokePath)) {
    return [];
  }

  try {
    const files = fs.readdirSync(spokePath, { recursive: true });
    return files
      .filter((f) => String(f).endsWith(".jsonl"))
      .map((f) => path.join(spokePath, String(f)))
      .toSorted();
  } catch {
    return [];
  }
}

/**
 * Get last sync time for a spoke (based on directory modification time)
 */
export function getLastSyncTime(spokePath: string): Date | null {
  if (!fs.existsSync(spokePath)) {
    return null;
  }

  try {
    const stats = fs.statSync(spokePath);
    return stats.mtime;
  } catch {
    return null;
  }
}
