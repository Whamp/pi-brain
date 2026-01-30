/**
 * Session Utilities - Pure functions for session manipulation
 *
 * This module provides utility functions for working with session data
 * that can be used across all layers without creating circular dependencies.
 */

import type { ProjectGroup, SessionInfo } from "../types/index.js";

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
