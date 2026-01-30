/**
 * Bridge Discovery - Multi-hop graph traversal for context explanation
 *
 * This module implements the "Bridge Discovery" feature from AutoMem.
 * It finds and scores paths from seed nodes to explain relationships and context.
 *
 * Based on docs/specs/automem-features.md Section 3.
 */

import type Database from "better-sqlite3";

import { getEdgesFrom, type EdgeRow } from "./edge-repository.js";
import { getNode, type NodeRow } from "./node-crud.js";
import { readNodeFromPath } from "./node-storage.js";

// =============================================================================
// Types
// =============================================================================

/**
 * A discovered path in the graph
 */
export interface BridgePath {
  /** The sequence of nodes in the path (starting with seed) */
  nodes: NodeRow[];
  /** The sequence of edges connecting the nodes (length = nodes.length - 1) */
  edges: EdgeRow[];
  /** Cumulative score of the path (0.0-1.0) */
  score: number;
  /** Human-readable explanation (e.g., "A leads to B which contradicts C") */
  description: string;
}

export interface BridgeDiscoveryOptions {
  /** Maximum number of hops (default: 2) */
  maxDepth?: number;
  /** Maximum number of paths to return (default: 5) */
  limit?: number;
  /** Minimum path score to include (default: 0.1) */
  minScore?: number;
}

// =============================================================================
// Internal Types
// =============================================================================

interface QueueItem {
  nodeId: string;
  pathNodeIds: string[];
  pathEdges: EdgeRow[];
  score: number;
}

interface TraversalState {
  nodesMap: Map<string, NodeRow>;
  queue: QueueItem[];
  discoveredPaths: BridgePath[];
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Initialize seed nodes and queue for traversal
 * @internal
 */
function initializeTraversal(
  db: Database.Database,
  seedNodeIds: string[]
): TraversalState {
  const nodesMap = new Map<string, NodeRow>();
  const queue: QueueItem[] = [];

  for (const id of seedNodeIds) {
    const node = getNode(db, id);
    if (node) {
      nodesMap.set(id, node);
      queue.push({
        nodeId: node.id,
        pathNodeIds: [node.id],
        pathEdges: [],
        score: 1,
      });
    }
  }

  return { nodesMap, queue, discoveredPaths: [] };
}

/**
 * Load a node, caching in nodesMap
 * @internal
 */
function loadNode(
  db: Database.Database,
  nodeId: string,
  nodesMap: Map<string, NodeRow>
): NodeRow | undefined {
  let node = nodesMap.get(nodeId);
  if (!node) {
    const fetched = getNode(db, nodeId);
    if (fetched) {
      nodesMap.set(nodeId, fetched);
      node = fetched;
    }
  }
  return node;
}

/**
 * Build a complete BridgePath from node IDs and edges
 * @internal
 */
function buildBridgePath(
  db: Database.Database,
  pathNodeIds: string[],
  pathEdges: EdgeRow[],
  score: number,
  nodesMap: Map<string, NodeRow>
): BridgePath | null {
  const pathNodes: NodeRow[] = [];

  for (const id of pathNodeIds) {
    const node = loadNode(db, id, nodesMap);
    if (!node) {
      return null; // Missing node, skip this path
    }
    pathNodes.push(node);
  }

  return {
    nodes: pathNodes,
    edges: pathEdges,
    score,
    description: generatePathDescription(pathNodes, pathEdges),
  };
}

/**
 * Process a completed path (length > 1) and add to discoveries
 * @internal
 */
function processCompletePath(
  db: Database.Database,
  current: QueueItem,
  state: TraversalState
): void {
  if (current.pathNodeIds.length <= 1) {
    return;
  }

  const path = buildBridgePath(
    db,
    current.pathNodeIds,
    current.pathEdges,
    current.score,
    state.nodesMap
  );

  if (path) {
    state.discoveredPaths.push(path);
  }
}

/**
 * Check if traversal should stop early
 * @internal
 */
function shouldStopTraversal(state: TraversalState, limit: number): boolean {
  return state.discoveredPaths.length >= limit * 2;
}

/**
 * Process a single iteration of the traversal loop
 * Returns true if traversal should continue, false to stop
 * @internal
 */
function processTraversalStep(
  db: Database.Database,
  state: TraversalState,
  maxDepth: number,
  minScore: number,
  limit: number
): boolean {
  // Sort queue by score (descending) to prioritize promising paths
  state.queue.sort((a, b) => b.score - a.score);

  const current = state.queue.shift();
  if (!current) {
    return false;
  }

  // Add completed paths (length > 1)
  processCompletePath(db, current, state);

  // Stop if we found enough paths
  if (shouldStopTraversal(state, limit)) {
    return false;
  }

  // Expand if not at max depth
  if (current.pathNodeIds.length <= maxDepth) {
    expandEdges(db, current, minScore, state);
  }

  return true;
}

/**
 * Calculate score for traversing an edge
 * @internal
 */
function calculateEdgeScore(currentScore: number, edge: EdgeRow): number {
  const confidence = edge.confidence ?? 0.7;
  const hopPenalty = 0.9;
  return currentScore * confidence * hopPenalty;
}

/**
 * Expand edges from current node and add valid paths to queue
 * @internal
 */
function expandEdges(
  db: Database.Database,
  current: QueueItem,
  minScore: number,
  state: TraversalState
): void {
  const outgoingEdges = getEdgesFrom(db, current.nodeId);

  for (const edge of outgoingEdges) {
    // Avoid cycles
    if (current.pathNodeIds.includes(edge.target_node_id)) {
      continue;
    }

    const newScore = calculateEdgeScore(current.score, edge);
    if (newScore < minScore) {
      continue;
    }

    state.queue.push({
      nodeId: edge.target_node_id,
      pathNodeIds: [...current.pathNodeIds, edge.target_node_id],
      pathEdges: [...current.pathEdges, edge],
      score: newScore,
    });
  }
}

// =============================================================================
// Discovery Functions
// =============================================================================

/**
 * Find interesting multi-hop paths originating from seed nodes.
 *
 * Uses BFS/DFS to traverse outgoing edges, scoring paths based on edge confidence
 * and node relevance.
 *
 * @param {Database.Database} db Database connection
 * @param {string[]} seedNodeIds IDs of nodes to start traversal from
 * @param {BridgeDiscoveryOptions} options Configuration options
 */
export function findBridgePaths(
  db: Database.Database,
  seedNodeIds: string[],
  options: BridgeDiscoveryOptions = {}
): BridgePath[] {
  const maxDepth = options.maxDepth ?? 2;
  const limit = options.limit ?? 5;
  const minScore = options.minScore ?? 0.1;

  if (seedNodeIds.length === 0) {
    return [];
  }

  const state = initializeTraversal(db, seedNodeIds);

  // Limit iterations to prevent infinite loops in large graphs
  let iterations = 0;
  const MAX_ITERATIONS = 1000;

  while (state.queue.length > 0 && iterations < MAX_ITERATIONS) {
    iterations++;
    if (!processTraversalStep(db, state, maxDepth, minScore, limit)) {
      break;
    }
  }

  // Sort by score and limit
  return state.discoveredPaths
    .toSorted((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Generate a human-readable description of the path
 */
function generatePathDescription(nodes: NodeRow[], edges: EdgeRow[]): string {
  if (nodes.length === 0) {
    return "";
  }

  const getSummary = (node: NodeRow): string => {
    try {
      // Try to read summary from JSON file
      const fullNode = readNodeFromPath(node.data_file);
      return fullNode.content.summary;
    } catch {
      // Fallback to project or ID if file not found
      return node.project
        ? `...${node.project.split("/").pop()}`
        : node.id.slice(0, 8);
    }
  };

  let desc = `"${truncate(getSummary(nodes[0]))}"`;

  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i];
    const target = nodes[i + 1];
    const type = edge.type.replaceAll("_", " ").toLowerCase();

    desc += ` ${type} "${truncate(getSummary(target))}"`;
  }

  return desc;
}

function truncate(str: string, len = 30): string {
  if (!str) {
    return "...";
  }
  return str.length > len ? `${str.slice(0, len)}...` : str;
}
