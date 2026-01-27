/**
 * Node data structure types for pi-brain knowledge graph
 * Based on specs/node-model.md
 */

import { createHash } from "node:crypto";

import type {
  DaemonMeta,
  LessonsByLevel,
  ModelObservations,
} from "../types/index.js";

// Re-export shared types
export * from "../types/index.js";

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Generate a unique 16-character hex node ID
 * Uses first 16 chars of UUID (64 bits of entropy)
 */
export function generateNodeId(): string {
  return crypto.randomUUID().replaceAll("-", "").slice(0, 16);
}

/**
 * Generate a deterministic 16-character hex node ID based on session and segment.
 * This ensures idempotent ingestion - re-running the same job produces the same ID.
 *
 * The ID is derived from:
 * - Session file path
 * - Segment start entry ID
 * - Segment end entry ID
 *
 * Two jobs with the same inputs will always produce the same node ID.
 */
export function generateDeterministicNodeId(
  sessionFile: string,
  segmentStart: string,
  segmentEnd: string
): string {
  const input = `${sessionFile}:${segmentStart}:${segmentEnd}`;
  const hash = createHash("sha256").update(input).digest("hex");
  return hash.slice(0, 16);
}

/**
 * Create a full node reference with version
 */
export function nodeRef(nodeId: string, version: number): string {
  return `${nodeId}-v${version}`;
}

/**
 * Parse a node reference into id and version
 */
export function parseNodeRef(ref: string): { nodeId: string; version: number } {
  const match = /^([a-f0-9]{16})-v(\d+)$/.exec(ref);
  if (!match) {
    throw new Error(`Invalid node reference: ${ref}`);
  }
  return {
    nodeId: match[1],
    version: Number.parseInt(match[2], 10),
  };
}

/**
 * Create an empty lessons structure
 */
export function emptyLessons(): LessonsByLevel {
  return {
    project: [],
    task: [],
    user: [],
    model: [],
    tool: [],
    skill: [],
    subagent: [],
  };
}

/**
 * Create an empty observations structure
 */
export function emptyObservations(): ModelObservations {
  return {
    modelsUsed: [],
    promptingWins: [],
    promptingFailures: [],
    modelQuirks: [],
    toolUseErrors: [],
  };
}

/**
 * Create an empty daemon meta structure
 */
export function emptyDaemonMeta(): DaemonMeta {
  return {
    decisions: [],
    rlmUsed: false,
  };
}
