/**
 * Analyzer for scanning session directories and finding relationships
 */

import { readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join, basename } from "node:path";

import type {
  SessionInfo,
  ForkRelationship,
  ProjectGroup,
} from "../types/index.js";

import { groupByProject as groupByProjectUtil } from "../utils/session-utils.js";
import { parseSession } from "./session.js";

/**
 * Default session directory
 */
export function getDefaultSessionDir(): string {
  return join(homedir(), ".pi", "agent", "sessions");
}

/**
 * Scan session directory and parse all sessions
 *
 * Note: This function loads all sessions into memory. For large session
 * histories (thousands of sessions), consider using `scanSessionsIterator`
 * which processes sessions one at a time.
 *
 * @param {string} [sessionDir] - Optional session directory path (defaults to ~/.pi/agent/sessions)
 * @returns {Promise<SessionInfo[]>} Array of all parsed sessions, sorted by timestamp (newest first)
 * @see scanSessionsIterator for memory-efficient iteration over large histories
 */
export async function scanSessions(
  sessionDir?: string
): Promise<SessionInfo[]> {
  const sessions: SessionInfo[] = [];
  for await (const session of scanSessionsIterator(sessionDir)) {
    sessions.push(session);
  }

  // Sort by timestamp (newest first)
  sessions.sort((a, b) => b.header.timestamp.localeCompare(a.header.timestamp));

  return sessions;
}

/**
 * Async generator that yields sessions one at a time for memory efficiency
 *
 * Use this instead of `scanSessions` when processing large session histories
 * (hundreds or thousands of sessions) to avoid loading all sessions into memory.
 * Sessions are yielded in file system order, not sorted by timestamp.
 *
 * @param {string} [sessionDir] - Optional session directory path (defaults to ~/.pi/agent/sessions)
 * @yields {SessionInfo} Parsed session info, one at a time
 * @example
 * for await (const session of scanSessionsIterator()) {
 *   // Process each session individually
 *   console.log(session.header.cwd, session.stats.entryCount);
 * }
 */
export async function* scanSessionsIterator(
  sessionDir?: string
): AsyncGenerator<SessionInfo, void, unknown> {
  const dir = sessionDir || getDefaultSessionDir();

  try {
    const projectDirs = await readdir(dir);

    for (const projectDir of projectDirs) {
      const projectPath = join(dir, projectDir);
      const projectStat = await stat(projectPath);

      if (!projectStat.isDirectory()) {
        continue;
      }

      try {
        const sessionFiles = await readdir(projectPath);

        for (const sessionFile of sessionFiles) {
          if (!sessionFile.endsWith(".jsonl")) {
            continue;
          }

          const sessionPath = join(projectPath, sessionFile);
          try {
            const session = await parseSession(sessionPath);
            yield session;
          } catch (error) {
            console.warn(`Failed to parse session ${sessionPath}:`, error);
          }
        }
      } catch (error) {
        console.warn(`Failed to read project directory ${projectPath}:`, error);
      }
    }
  } catch (error) {
    throw new Error(`Failed to read session directory ${dir}: ${error}`, {
      cause: error,
    });
  }
  // Generator ends naturally - no explicit return needed
}

/**
 * Find fork relationships between sessions
 */
export function findForkRelationships(
  sessions: SessionInfo[]
): ForkRelationship[] {
  const relationships: ForkRelationship[] = [];

  for (const session of sessions) {
    if (session.header.parentSession) {
      relationships.push({
        childPath: session.path,
        childSessionId: session.header.id,
        parentPath: session.header.parentSession,
        timestamp: session.header.timestamp,
      });
    }
  }

  // Sort by timestamp
  relationships.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  return relationships;
}

/**
 * Group sessions by project (cwd)
 * @deprecated Use groupByProject from ../utils/session-utils.js instead
 */
export function groupByProject(sessions: SessionInfo[]): ProjectGroup[] {
  return groupByProjectUtil(sessions);
}

/**
 * Decode project directory name to path
 * e.g., "--home-will-projects-myapp--" → "/home/will/projects/myapp"
 *
 * **Warning**: Pi's encoding is lossy - hyphens in original paths are not escaped.
 * This means "--home-will-projects-pi-brain--" could be either:
 *   - /home/will/projects/pi-brain (correct)
 *   - /home/will/projects/pi/brain (wrong)
 *
 * Prefer using session.header.cwd which contains the accurate original path.
 * This function is only useful for display purposes when session data is unavailable.
 *
 * @deprecated Since 0.1.0. Use `session.header.cwd` for accurate project paths.
 *             This function exists only for legacy compatibility when session data
 *             is unavailable. The encoding is lossy and may produce incorrect paths.
 * @param {string} encodedName - The encoded project directory name (e.g., "--home-will--")
 * @returns {string} The decoded path (may be incorrect due to lossy encoding)
 * @see SessionInfo.header.cwd for the accurate project path
 */
export function decodeProjectDir(encodedName: string): string {
  if (!encodedName.startsWith("--") || !encodedName.endsWith("--")) {
    return encodedName;
  }

  const inner = encodedName.slice(2, -2);

  // Pi encodes paths by replacing /\: with -
  // Since hyphens aren't escaped, decoding is lossy.
  // We decode naively but callers should prefer session.header.cwd
  return `/${inner.replaceAll("-", "/")}`;
}

/**
 * Get project name from session path
 *
 * @deprecated Since 0.1.0. Use `session.header.cwd` directly for accurate paths.
 *             This function relies on the lossy `decodeProjectDir` function.
 *             When you have a SessionInfo object, use `session.header.cwd` instead.
 *             When you only have a path, use `getProjectNameFromSession(session)` instead.
 * @param {string} sessionPath - The path to the session file
 * @returns {string} The decoded project name (may be incorrect)
 * @see SessionInfo.header.cwd for the accurate project path
 * @see getProjectNameFromSession for the preferred alternative
 */
export function getProjectName(sessionPath: string): string {
  const parts = sessionPath.split("/");
  const sessionsIdx = parts.indexOf("sessions");
  if (sessionsIdx !== -1 && sessionsIdx < parts.length - 2) {
    return decodeProjectDir(parts[sessionsIdx + 1]);
  }
  return basename(sessionPath);
}

/**
 * Get project name from a SessionInfo object (preferred over getProjectName)
 *
 * This function returns the accurate project path from the session header,
 * which is not affected by the lossy directory name encoding.
 *
 * @param {SessionInfo} session - The parsed session info
 * @returns {string} The accurate project working directory
 */
export function getProjectNameFromSession(session: SessionInfo): string {
  return session.header.cwd;
}

/**
 * Filter sessions by project path
 */
export function filterByProject(
  sessions: SessionInfo[],
  projectPath: string
): SessionInfo[] {
  return sessions.filter((s) => s.header.cwd === projectPath);
}

/**
 * Filter sessions by date range
 */
export function filterByDateRange(
  sessions: SessionInfo[],
  startDate?: Date,
  endDate?: Date
): SessionInfo[] {
  return sessions.filter((s) => {
    const timestamp = new Date(s.header.timestamp);
    if (startDate && timestamp < startDate) {
      return false;
    }
    if (endDate && timestamp > endDate) {
      return false;
    }
    return true;
  });
}

/**
 * Search sessions for text content
 */
export function searchSessions(
  sessions: SessionInfo[],
  query: string
): { session: SessionInfo; matches: string[] }[] {
  const results: { session: SessionInfo; matches: string[] }[] = [];
  const queryLower = query.toLowerCase();

  for (const session of sessions) {
    const matches: string[] = [];

    // Check session name
    if (session.name?.toLowerCase().includes(queryLower)) {
      matches.push(`Session name: ${session.name}`);
    }

    // Check first message
    if (session.firstMessage?.toLowerCase().includes(queryLower)) {
      matches.push(`First message: ${session.firstMessage}`);
    }

    // For full content search, would need to read file again
    // This is a lightweight preview search

    if (matches.length > 0) {
      results.push({ matches, session });
    }
  }

  return results;
}

/**
 * Get session summary statistics
 */
export function getOverallStats(sessions: SessionInfo[]): {
  totalSessions: number;
  totalEntries: number;
  totalMessages: number;
  totalTokens: number;
  totalCost: number;
  projectCount: number;
  forkCount: number;
} {
  const projects = new Set<string>();
  let totalEntries = 0;
  let totalMessages = 0;
  let totalTokens = 0;
  let totalCost = 0;
  let forkCount = 0;

  for (const session of sessions) {
    projects.add(session.header.cwd);
    totalEntries += session.stats.entryCount;
    totalMessages += session.stats.messageCount;
    totalTokens += session.stats.totalTokens;
    totalCost += session.stats.totalCost;
    if (session.header.parentSession) {
      forkCount += 1;
    }
  }

  return {
    forkCount,
    projectCount: projects.size,
    totalCost,
    totalEntries,
    totalMessages,
    totalSessions: sessions.length,
    totalTokens,
  };
}
