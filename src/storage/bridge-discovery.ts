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

  // Fetch seed nodes
  const nodesMap = new Map<string, NodeRow>();
  const seedNodes: NodeRow[] = [];

  for (const id of seedNodeIds) {
    const node = getNode(db, id);
    if (node) {
      nodesMap.set(id, node);
      seedNodes.push(node);
    }
  }

  // Priority queue for paths (highest score first)
  // Each item is [currentNodeId, pathNodeIds, pathEdges, currentScore]
  const queue: {
    nodeId: string;
    pathNodeIds: string[];
    pathEdges: EdgeRow[];
    score: number;
  }[] = [];

  // Initialize queue with seed nodes
  for (const node of seedNodes) {
    // Initial score based on node's own importance/relevance if available
    // Default to 1.0 for the start of a path
    const initialScore = 1;
    queue.push({
      nodeId: node.id,
      pathNodeIds: [node.id],
      pathEdges: [],
      score: initialScore,
    });
  }

  const discoveredPaths: BridgePath[] = [];

  // Perform traversal
  // We use a simplified BFS/search. To get "best" paths, we might want to prioritize
  // expanding high-scoring paths.

  // Track visited nodes per path to avoid cycles?
  // Actually, queue contains full path state, so we just check pathNodeIds for cycles.

  // Limit iterations to prevent infinite loops in large graphs
  let iterations = 0;
  const MAX_ITERATIONS = 1000;

  while (queue.length > 0 && iterations < MAX_ITERATIONS) {
    iterations++;

    // Sort queue by score (descending) to prioritize promising paths
    queue.sort((a, b) => b.score - a.score);

    // Pop best path
    const current = queue.shift();
    if (!current) {
      break;
    }

    const { nodeId, pathNodeIds, pathEdges, score } = current;

    // If we have a valid path (length > 1), add to results
    if (pathNodeIds.length > 1) {
      // Check if we already have this exact path (shouldn't happen with tree search but good safety)
      // Or maybe check if we have a path ending at this node with higher score?

      // Ensure all nodes are loaded
      const pathNodes: NodeRow[] = [];
      let missingNode = false;
      for (const id of pathNodeIds) {
        let n = nodesMap.get(id);
        if (!n) {
          n = getNode(db, id) || undefined;
          if (n) {
            nodesMap.set(id, n);
          }
        }
        if (n) {
          pathNodes.push(n);
        } else {
          missingNode = true;
          break;
        }
      }

      if (!missingNode) {
        discoveredPaths.push({
          nodes: pathNodes,
          edges: pathEdges,
          score,
          description: generatePathDescription(pathNodes, pathEdges),
        });
      }
    }

    // Stop if we found enough paths (heuristic: checking discovered count)
    // Note: this might stop early before finding deeper but better paths,
    // but with score sorting, we prioritize high confidence short paths.
    // If we want exactly 'limit' paths, we should collect more and filter/sort at end.
    if (discoveredPaths.length >= limit * 2) {
      // Heuristic: collect 2x limit then trim
      break;
    }

    // Stop if max depth reached
    if (pathNodeIds.length > maxDepth) {
      continue;
    }

    // Expand outgoing edges
    // We strictly follow outgoing edges as per "LEADS_TO", "DERIVED_FROM" logic
    // but maybe we should allow some incoming types?
    // For now, stick to outgoing edges as per spec.
    const outgoingEdges = getEdgesFrom(db, nodeId);

    for (const edge of outgoingEdges) {
      // Avoid cycles
      if (pathNodeIds.includes(edge.target_node_id)) {
        continue;
      }

      const nextNodeId = edge.target_node_id;

      // Calculate new score
      // Score = currentScore * edgeConfidence * edgeSimilarity (if relevant)
      // Default confidence to 0.7 if missing
      const confidence = edge.confidence ?? 0.7;

      // Penalize each hop slightly to prefer shorter paths unless strong signal
      const hopPenalty = 0.9;

      const newScore = score * confidence * hopPenalty;

      if (newScore < minScore) {
        continue;
      }

      queue.push({
        nodeId: nextNodeId,
        pathNodeIds: [...pathNodeIds, nextNodeId],
        pathEdges: [...pathEdges, edge],
        score: newScore,
      });
    }
  }

  // Sort by score and limit
  return discoveredPaths.toSorted((a, b) => b.score - a.score).slice(0, limit);
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
