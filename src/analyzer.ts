/**
 * Analyzer for scanning session directories and finding relationships
 */

import { readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join, basename } from "node:path";

import  { type SessionInfo, type ForkRelationship, type ProjectGroup } from "./types.js";

import { parseSession } from "./parser.js";

/**
 * Default session directory
 */
export function getDefaultSessionDir(): string {
  return join(homedir(), ".pi", "agent", "sessions");
}

/**
 * Scan session directory and parse all sessions
 */
export async function scanSessions(
  sessionDir?: string
): Promise<SessionInfo[]> {
  const dir = sessionDir || getDefaultSessionDir();
  const sessions: SessionInfo[] = [];

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
            sessions.push(session);
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

  // Sort by timestamp (newest first)
  sessions.sort((a, b) => b.header.timestamp.localeCompare(a.header.timestamp));

  return sessions;
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
 */
export function groupByProject(sessions: SessionInfo[]): ProjectGroup[] {
  const groups = new Map<string, SessionInfo[]>();

  for (const session of sessions) {
    const { cwd } = session.header;
    if (!groups.has(cwd)) {
      groups.set(cwd, []);
    }
    groups.get(cwd)?.push(session);
  }

  const result: ProjectGroup[] = [];
  for (const [cwd, projectSessions] of groups) {
    // Sort sessions within project by timestamp (newest first)
    projectSessions.sort((a, b) =>
      b.header.timestamp.localeCompare(a.header.timestamp)
    );

    result.push({
      cwd,
      sessions: projectSessions,
      totalEntries: projectSessions.reduce(
        (sum, s) => sum + s.stats.entryCount,
        0
      ),
    });
  }

  // Sort projects by total entries (most active first)
  result.sort((a, b) => b.totalEntries - a.totalEntries);

  return result;
}

/**
 * Decode project directory name to path
 * e.g., "--home-will-projects-myapp--" → "/home/will/projects/myapp"
 */
export function decodeProjectDir(encodedName: string): string {
  if (!encodedName.startsWith("--") || !encodedName.endsWith("--")) {
    return encodedName;
  }

  const inner = encodedName.slice(2, -2);
  return `/${inner.replaceAll("-", "/")}`;
}

/**
 * Get project name from session path
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
