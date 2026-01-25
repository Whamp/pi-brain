/**
 * Fork detection for pi sessions
 *
 * Forks are created when a user runs /fork command, creating a new session
 * that branches from an existing session. The new session's header contains
 * a `parentSession` field pointing to the original session file.
 *
 * Unlike other boundaries (branch, tree_jump, compaction, resume) which are
 * detected within a single session, forks create relationships between
 * separate session files.
 */

import type { ForkRelationship, SessionHeader, SessionInfo } from "../types.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Result of detecting a fork from a session header
 */
export interface ForkInfo {
  /** Whether this session is a fork */
  isFork: boolean;
  /** Parent session path (if this is a fork) */
  parentPath?: string;
  /** Current session path */
  sessionPath: string;
  /** Session ID */
  sessionId: string;
  /** Session timestamp */
  timestamp: string;
}

// =============================================================================
// Fork Detection
// =============================================================================

/**
 * Check if a session is a fork (has parentSession in header)
 *
 * @param {SessionHeader} header Session header to check
 * @param {string} sessionPath Path to the session file
 * @returns {ForkInfo} ForkInfo with fork details
 */
export function isForkSession(
  header: SessionHeader,
  sessionPath: string
): ForkInfo {
  return {
    isFork: header.parentSession !== undefined,
    parentPath: header.parentSession,
    sessionPath,
    sessionId: header.id,
    timestamp: header.timestamp,
  };
}

/**
 * Find all fork relationships from a list of parsed sessions
 *
 * @param {SessionInfo[]} sessions Array of parsed session info objects
 * @returns {ForkRelationship[]} Array of fork relationships
 */
export function findForks(sessions: SessionInfo[]): ForkRelationship[] {
  const forks: ForkRelationship[] = [];

  for (const session of sessions) {
    if (session.header.parentSession) {
      forks.push({
        parentPath: session.header.parentSession,
        childPath: session.path,
        childSessionId: session.header.id,
        timestamp: session.header.timestamp,
      });
    }
  }

  return forks;
}

/**
 * Find fork relationships given just session headers and paths
 * Useful when you don't have fully parsed sessions
 *
 * @param {[string, SessionHeader][]} headers Array of [path, header] tuples
 * @returns {ForkRelationship[]} Array of fork relationships
 */
export function findForksFromHeaders(
  headers: [string, SessionHeader][]
): ForkRelationship[] {
  const forks: ForkRelationship[] = [];

  for (const [path, header] of headers) {
    if (header.parentSession) {
      forks.push({
        parentPath: header.parentSession,
        childPath: path,
        childSessionId: header.id,
        timestamp: header.timestamp,
      });
    }
  }

  return forks;
}

/**
 * Build a map of session paths to their fork children
 *
 * @param {ForkRelationship[]} forks Array of fork relationships
 * @returns {Map<string, string[]>} Map from parent path to array of child paths
 */
export function buildForkTree(
  forks: ForkRelationship[]
): Map<string, string[]> {
  const tree = new Map<string, string[]>();

  for (const fork of forks) {
    const children = tree.get(fork.parentPath) ?? [];
    children.push(fork.childPath);
    tree.set(fork.parentPath, children);
  }

  return tree;
}

/**
 * Get the fork chain for a session (all ancestors via fork)
 *
 * @param {string} sessionPath Starting session path
 * @param {ForkRelationship[]} forks All known fork relationships
 * @returns {string[]} Array of paths from oldest ancestor to the given session
 */
export function getForkChain(
  sessionPath: string,
  forks: ForkRelationship[]
): string[] {
  // Build child → parent map for reverse lookup
  const childToParent = new Map<string, string>();
  for (const fork of forks) {
    childToParent.set(fork.childPath, fork.parentPath);
  }

  const chain: string[] = [];
  let current: string | undefined = sessionPath;

  while (current) {
    chain.unshift(current);
    current = childToParent.get(current);
  }

  return chain;
}

/**
 * Get all descendants of a session via forks
 *
 * @param {string} sessionPath Starting session path
 * @param {ForkRelationship[]} forks All known fork relationships
 * @returns {string[]} Array of all descendant session paths
 */
export function getForkDescendants(
  sessionPath: string,
  forks: ForkRelationship[]
): string[] {
  const tree = buildForkTree(forks);
  const descendants: string[] = [];
  const queue = [sessionPath];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    const children = tree.get(current) ?? [];
    for (const child of children) {
      descendants.push(child);
      queue.push(child);
    }
  }

  return descendants;
}
