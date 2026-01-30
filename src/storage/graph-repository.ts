/**
 * Graph Repository - Graph traversal operations for the knowledge graph
 *
 * This module provides graph traversal functions to find connected nodes,
 * build subgraphs, find paths, and get ancestors/descendants.
 *
 * Based on specs/storage.md graph traversal query and specs/api.md
 * GET /api/v1/nodes/:id/connected endpoint.
 */

import type Database from "better-sqlite3";

import type { NodeRow } from "./node-crud.js";
import type { EdgeMetadata, EdgeType } from "./node-types.js";

import {
  getEdgesFrom,
  getEdgesTo,
  getNodeEdges,
  type EdgeRow,
} from "./edge-repository.js";

// =============================================================================
// Types
// =============================================================================

/** Direction for graph traversal */
export type TraversalDirection = "incoming" | "outgoing" | "both";

/** Options for getConnectedNodes */
export interface ConnectedNodesOptions {
  /**
   * Traversal depth - how many edge hops to follow
   * (default: 1, max: 5)
   */
  depth?: number;
  /**
   * Which edge directions to follow
   * (default: "both")
   */
  direction?: TraversalDirection;
  /**
   * Filter by specific edge types only
   * (default: all edge types)
   */
  edgeTypes?: EdgeType[];
}

/** An edge with direction information for traversal results */
export interface TraversalEdge {
  /** Unique edge ID */
  id: string;
  /** Source node ID */
  sourceNodeId: string;
  /** Target node ID */
  targetNodeId: string;
  /** Edge type (fork, branch, semantic, etc.) */
  type: EdgeType;
  /** Edge metadata */
  metadata: EdgeMetadata;
  /** Relationship to the root node: outgoing = root→node, incoming = node→root */
  direction: "incoming" | "outgoing";
  /** How many hops from the root node */
  hopDistance: number;
}

/** Result from getConnectedNodes */
export interface ConnectedNodesResult {
  /** The root node ID that was queried */
  rootNodeId: string;
  /** All connected nodes (not including the root node) */
  nodes: NodeRow[];
  /** All edges in the traversed subgraph */
  edges: TraversalEdge[];
}

// =============================================================================
// Traversal Helpers
// =============================================================================

interface EdgeWithDirection {
  edge: EdgeRow;
  edgeDirection: "incoming" | "outgoing";
}

/**
 * Get edges to process based on traversal direction
 * @internal
 */
function getEdgesToProcess(
  db: Database.Database,
  nodeId: string,
  direction: TraversalDirection
): EdgeWithDirection[] {
  const edgesToProcess: EdgeWithDirection[] = [];

  if (direction === "outgoing" || direction === "both") {
    const outgoing = getEdgesFrom(db, nodeId);
    for (const edge of outgoing) {
      edgesToProcess.push({ edge, edgeDirection: "outgoing" });
    }
  }

  if (direction === "incoming" || direction === "both") {
    const incoming = getEdgesTo(db, nodeId);
    for (const edge of incoming) {
      edgesToProcess.push({ edge, edgeDirection: "incoming" });
    }
  }

  return edgesToProcess;
}

/**
 * Convert EdgeRow to TraversalEdge
 * @internal
 */
function toTraversalEdge(
  edge: EdgeRow,
  edgeDirection: "incoming" | "outgoing",
  hopDistance: number
): TraversalEdge {
  return {
    id: edge.id,
    sourceNodeId: edge.source_node_id,
    targetNodeId: edge.target_node_id,
    type: edge.type as EdgeType,
    metadata: edge.metadata ? JSON.parse(edge.metadata) : {},
    direction: edgeDirection,
    hopDistance,
  };
}

/**
 * Process a single edge during traversal
 * @internal
 */
function processEdge(
  edgeInfo: EdgeWithDirection,
  currentHop: number,
  edgeTypes: EdgeType[] | undefined,
  visitedNodeIds: Set<string>,
  traversalEdges: TraversalEdge[],
  nextFrontier: Set<string>
): void {
  const { edge, edgeDirection } = edgeInfo;

  // Apply edge type filter if specified
  if (edgeTypes && !edgeTypes.includes(edge.type as EdgeType)) {
    return;
  }

  // Determine the "other" node in this edge
  const otherNodeId =
    edgeDirection === "outgoing" ? edge.target_node_id : edge.source_node_id;

  // Add edge if not seen (deduplicate by edge ID)
  if (!traversalEdges.some((te) => te.id === edge.id)) {
    traversalEdges.push(toTraversalEdge(edge, edgeDirection, currentHop));
  }

  // Add to next frontier if not visited
  if (!visitedNodeIds.has(otherNodeId)) {
    visitedNodeIds.add(otherNodeId);
    nextFrontier.add(otherNodeId);
  }
}

/**
 * Fetch node data for a list of node IDs
 * @internal
 */
function fetchNodes(db: Database.Database, nodeIds: string[]): NodeRow[] {
  if (nodeIds.length === 0) {
    return [];
  }
  const placeholders = nodeIds.map(() => "?").join(", ");
  const stmt = db.prepare(`
    SELECT * FROM nodes
    WHERE id IN (${placeholders})
    ORDER BY timestamp DESC
  `);
  return stmt.all(...nodeIds) as NodeRow[];
}

// =============================================================================
// Graph Traversal Functions
// =============================================================================

/**
 * Get all nodes connected to a specific node with graph traversal.
 *
 * Supports:
 * - Multi-hop traversal (depth 1-5)
 * - Direction filtering (incoming, outgoing, both)
 * - Edge type filtering
 *
 * Based on specs/storage.md graph traversal query and specs/api.md
 * GET /api/v1/nodes/:id/connected endpoint.
 *
 * @example
 * // Get directly connected nodes (1 hop, both directions)
 * const result = getConnectedNodes(db, "abc123");
 *
 * @example
 * // Get nodes up to 3 hops away, only following outgoing edges
 * const result = getConnectedNodes(db, "abc123", {
 *   depth: 3,
 *   direction: "outgoing"
 * });
 *
 * @example
 * // Get only fork and branch edges, 2 hops
 * const result = getConnectedNodes(db, "abc123", {
 *   depth: 2,
 *   edgeTypes: ["fork", "branch"]
 * });
 */
export function getConnectedNodes(
  db: Database.Database,
  nodeId: string,
  options: ConnectedNodesOptions = {}
): ConnectedNodesResult {
  // Apply defaults and constraints
  const depth = Math.min(Math.max(options.depth ?? 1, 1), 5);
  const direction = options.direction ?? "both";
  const { edgeTypes } = options;

  // Track visited nodes and edges
  const visitedNodeIds = new Set<string>([nodeId]);
  const traversalEdges: TraversalEdge[] = [];

  // BFS frontier
  let currentFrontier = new Set<string>([nodeId]);

  // Traverse up to requested depth
  for (let currentHop = 1; currentHop <= depth; currentHop++) {
    if (currentFrontier.size === 0) {
      break;
    }

    const nextFrontier = new Set<string>();

    for (const currentNodeId of currentFrontier) {
      const edgesToProcess = getEdgesToProcess(db, currentNodeId, direction);

      for (const edgeInfo of edgesToProcess) {
        processEdge(
          edgeInfo,
          currentHop,
          edgeTypes,
          visitedNodeIds,
          traversalEdges,
          nextFrontier
        );
      }
    }

    currentFrontier = nextFrontier;
  }

  // Collect connected node IDs (excluding root)
  const connectedNodeIds = [...visitedNodeIds].filter((id) => id !== nodeId);
  const nodes = fetchNodes(db, connectedNodeIds);

  return {
    rootNodeId: nodeId,
    nodes,
    edges: traversalEdges,
  };
}

/**
 * Get the subgraph for visualization - returns nodes and edges
 * within a given depth from multiple root nodes.
 *
 * Unlike getConnectedNodes, this INCLUDES the root nodes in the result,
 * which is useful for rendering a graph view starting from selected nodes.
 * @public
 */
export function getSubgraph(
  db: Database.Database,
  rootNodeIds: string[],
  options: ConnectedNodesOptions = {}
): ConnectedNodesResult {
  if (rootNodeIds.length === 0) {
    return { rootNodeId: "", nodes: [], edges: [] };
  }

  // Combine results from all roots and deduplicate
  // Note: We always include root nodes in the result (unlike getConnectedNodes)
  const allNodeIds = new Set<string>(rootNodeIds);
  const allEdges = new Map<string, TraversalEdge>();

  for (const rootId of rootNodeIds) {
    const result = getConnectedNodes(db, rootId, options);

    for (const node of result.nodes) {
      allNodeIds.add(node.id);
    }

    for (const edge of result.edges) {
      // Use edge ID as key to deduplicate
      if (!allEdges.has(edge.id)) {
        allEdges.set(edge.id, edge);
      }
    }
  }

  // Fetch all nodes (including roots)
  const nodes = fetchNodes(db, [...allNodeIds]);

  return {
    rootNodeId: rootNodeIds[0], // Use first root as "primary"
    nodes,
    edges: [...allEdges.values()],
  };
}

/**
 * Get the path between two nodes if one exists.
 * Uses BFS to find the shortest path.
 *
 * Returns null if no path exists.
 * @public
 */
export function findPath(
  db: Database.Database,
  fromNodeId: string,
  toNodeId: string,
  options: { maxDepth?: number } = {}
): { nodeIds: string[]; edges: EdgeRow[] } | null {
  const maxDepth = Math.min(Math.max(options.maxDepth ?? 10, 1), 20);

  // BFS to find shortest path
  // Each entry: [currentNodeId, pathToHere, edgesToHere]
  const queue: [string, string[], EdgeRow[]][] = [
    [fromNodeId, [fromNodeId], []],
  ];
  const visited = new Set<string>([fromNodeId]);

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      break;
    }
    const [currentNodeId, pathSoFar, edgesSoFar] = current;

    // Check if we've reached the target
    if (currentNodeId === toNodeId) {
      return { nodeIds: pathSoFar, edges: edgesSoFar };
    }

    // Don't explore beyond max depth
    if (pathSoFar.length > maxDepth) {
      continue;
    }

    // Get all edges from current node (both directions)
    const allEdges = getNodeEdges(db, currentNodeId);

    for (const edge of allEdges) {
      const nextNodeId =
        edge.source_node_id === currentNodeId
          ? edge.target_node_id
          : edge.source_node_id;

      if (!visited.has(nextNodeId)) {
        visited.add(nextNodeId);
        queue.push([
          nextNodeId,
          [...pathSoFar, nextNodeId],
          [...edgesSoFar, edge],
        ]);
      }
    }
  }

  // No path found
  return null;
}

/**
 * Get all ancestors of a node (nodes that lead TO this node).
 * Follows incoming edges only.
 * @public
 */
export function getAncestors(
  db: Database.Database,
  nodeId: string,
  options: { maxDepth?: number; edgeTypes?: EdgeType[] } = {}
): ConnectedNodesResult {
  return getConnectedNodes(db, nodeId, {
    depth: options.maxDepth ?? 5,
    direction: "incoming",
    edgeTypes: options.edgeTypes,
  });
}

/**
 * Get all descendants of a node (nodes that this node leads TO).
 * Follows outgoing edges only.
 * @public
 */
export function getDescendants(
  db: Database.Database,
  nodeId: string,
  options: { maxDepth?: number; edgeTypes?: EdgeType[] } = {}
): ConnectedNodesResult {
  return getConnectedNodes(db, nodeId, {
    depth: options.maxDepth ?? 5,
    direction: "outgoing",
    edgeTypes: options.edgeTypes,
  });
}
