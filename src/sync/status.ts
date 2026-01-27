/**
 * Sync status tracking and reporting
 *
 * Provides status information about spoke sync state.
 */

import * as fs from "node:fs";
import * as os from "node:os";

import type { PiBrainConfig, SpokeConfig } from "../config/types.js";

import {
  countSpokeSessionFiles,
  getLastSyncTime,
  isRsyncAvailable,
} from "./rsync.js";

/**
 * Status of a single spoke
 */
export interface SpokeStatus {
  name: string;
  syncMethod: string;
  path: string;
  source?: string;
  enabled: boolean;
  exists: boolean;
  sessionCount: number;
  lastSync: Date | null;
  lastSyncFormatted: string | null;
}

/**
 * Overall sync status
 */
export interface SyncStatus {
  hubName: string;
  hubSessionsDir: string;
  hubSessionCount: number;
  rsyncAvailable: boolean;
  spokes: SpokeStatus[];
  totalSpokeSessionCount: number;
}

/**
 * Format relative time ago
 */
export function formatTimeAgo(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ago`;
  }
  if (hours > 0) {
    return `${hours}h ago`;
  }
  if (minutes > 0) {
    return `${minutes}m ago`;
  }
  return "just now";
}

/**
 * Get status for a single spoke
 */
export function getSpokeStatus(spoke: SpokeConfig): SpokeStatus {
  const exists = fs.existsSync(spoke.path);
  const sessionCount = exists ? countSpokeSessionFiles(spoke.path) : 0;
  const lastSync = getLastSyncTime(spoke.path);

  return {
    name: spoke.name,
    syncMethod: spoke.syncMethod,
    path: spoke.path,
    source: spoke.source,
    enabled: true, // Could be extended to support enabled flag in config
    exists,
    sessionCount,
    lastSync,
    lastSyncFormatted: lastSync ? formatTimeAgo(lastSync) : null,
  };
}

/**
 * Count sessions in a directory
 */
function countSessions(dir: string): number {
  if (!fs.existsSync(dir)) {
    return 0;
  }

  try {
    const files = fs.readdirSync(dir, { recursive: true });
    return files.filter((f) => String(f).endsWith(".jsonl")).length;
  } catch {
    return 0;
  }
}

/**
 * Get overall sync status
 */
export async function getSyncStatus(
  config: PiBrainConfig
): Promise<SyncStatus> {
  const rsyncAvailable = await isRsyncAvailable();
  const spokes = config.spokes.map((spoke) => getSpokeStatus(spoke));
  const totalSpokeSessionCount = spokes.reduce(
    (sum, s) => sum + s.sessionCount,
    0
  );

  return {
    hubName: os.hostname(),
    hubSessionsDir: config.hub.sessionsDir,
    hubSessionCount: countSessions(config.hub.sessionsDir),
    rsyncAvailable,
    spokes,
    totalSpokeSessionCount,
  };
}

/**
 * Format sync status for display
 */
export function formatSyncStatus(status: SyncStatus): string {
  const lines: string[] = [
    "Sync Status",
    "─".repeat(60),
    "",
    `Hub: ${status.hubName}`,
    `  Sessions: ${status.hubSessionCount}`,
    `  Directory: ${status.hubSessionsDir}`,
    "",
  ];

  if (status.spokes.length === 0) {
    lines.push("No spokes configured.");
    lines.push("");
    lines.push("To add spokes, edit ~/.pi-brain/config.yaml:");
    lines.push("  spokes:");
    lines.push("    - name: laptop");
    lines.push("      sync_method: rsync");
    lines.push("      source: user@laptop:~/.pi/agent/sessions");
    lines.push("      path: ~/.pi-brain/synced/laptop");
  } else {
    lines.push("Spokes:");

    for (const spoke of status.spokes) {
      const statusIcon = spoke.exists ? "✓" : "✗";
      const syncInfo = spoke.lastSyncFormatted ?? "never synced";

      lines.push(`  ${statusIcon} ${spoke.name} (${spoke.syncMethod})`);
      lines.push(`      Sessions: ${spoke.sessionCount}`);
      lines.push(`      Path: ${spoke.path}`);

      if (spoke.source) {
        lines.push(`      Source: ${spoke.source}`);
      }

      lines.push(`      Last sync: ${syncInfo}`);
      lines.push("");
    }

    lines.push(`Total spoke sessions: ${status.totalSpokeSessionCount}`);
  }

  if (!status.rsyncAvailable) {
    lines.push("");
    lines.push(
      "⚠ rsync command not found. Install rsync to use rsync sync method."
    );
  }

  return lines.join("\n");
}
