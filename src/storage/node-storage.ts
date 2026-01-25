/**
 * JSON file storage for nodes
 *
 * Stores node data as JSON files in the structure:
 * ~/.pi-brain/data/nodes/YYYY/MM/<node-id>-v<version>.json
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

import type { Node } from "./node-types.js";

/** Default nodes directory */
export const DEFAULT_NODES_DIR = join(homedir(), ".pi-brain", "data", "nodes");

export interface NodeStorageOptions {
  /** Base directory for node files */
  nodesDir?: string;
}

/**
 * Get the directory path for a node based on its timestamp
 * Returns: nodesDir/YYYY/MM
 */
export function getNodeDir(
  timestamp: string,
  nodesDir = DEFAULT_NODES_DIR
): string {
  const date = new Date(timestamp);
  const year = date.getFullYear().toString();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  return join(nodesDir, year, month);
}

/**
 * Get the full file path for a node
 * Returns: nodesDir/YYYY/MM/<nodeId>-v<version>.json
 */
export function getNodePath(
  nodeId: string,
  version: number,
  timestamp: string,
  nodesDir = DEFAULT_NODES_DIR
): string {
  const dir = getNodeDir(timestamp, nodesDir);
  return join(dir, `${nodeId}-v${version}.json`);
}

/**
 * Write a node to JSON file storage
 */
export function writeNode(
  node: Node,
  options: NodeStorageOptions = {}
): string {
  const nodesDir = options.nodesDir ?? DEFAULT_NODES_DIR;
  const filePath = getNodePath(
    node.id,
    node.version,
    node.metadata.timestamp,
    nodesDir
  );

  // Ensure directory exists
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // Write with pretty formatting for human readability
  writeFileSync(filePath, JSON.stringify(node, null, 2), "utf8");

  return filePath;
}

/**
 * Read a node from JSON file storage
 */
export function readNode(
  nodeId: string,
  version: number,
  timestamp: string,
  options: NodeStorageOptions = {}
): Node {
  const nodesDir = options.nodesDir ?? DEFAULT_NODES_DIR;
  const filePath = getNodePath(nodeId, version, timestamp, nodesDir);

  if (!existsSync(filePath)) {
    throw new Error(`Node file not found: ${filePath}`);
  }

  const content = readFileSync(filePath, "utf8");
  return JSON.parse(content) as Node;
}

/**
 * Read a node by file path
 */
export function readNodeFromPath(filePath: string): Node {
  if (!existsSync(filePath)) {
    throw new Error(`Node file not found: ${filePath}`);
  }

  const content = readFileSync(filePath, "utf8");
  return JSON.parse(content) as Node;
}

/**
 * Check if a node file exists
 */
export function nodeExists(
  nodeId: string,
  version: number,
  timestamp: string,
  options: NodeStorageOptions = {}
): boolean {
  const nodesDir = options.nodesDir ?? DEFAULT_NODES_DIR;
  const filePath = getNodePath(nodeId, version, timestamp, nodesDir);
  return existsSync(filePath);
}

/**
 * List all node files in the storage directory
 * Returns array of file paths
 */
export function listNodeFiles(options: NodeStorageOptions = {}): string[] {
  const nodesDir = options.nodesDir ?? DEFAULT_NODES_DIR;

  if (!existsSync(nodesDir)) {
    return [];
  }

  const files: string[] = [];

  // Walk YYYY/MM directory structure
  const years = readdirSync(nodesDir).filter((f) => /^\d{4}$/.test(f));

  for (const year of years) {
    const yearPath = join(nodesDir, year);
    const months = readdirSync(yearPath).filter((f) => /^\d{2}$/.test(f));

    for (const month of months) {
      const monthPath = join(yearPath, month);
      const nodeFiles = readdirSync(monthPath).filter((f) =>
        f.endsWith(".json")
      );

      for (const nodeFile of nodeFiles) {
        files.push(join(monthPath, nodeFile));
      }
    }
  }

  return files;
}

/**
 * List all versions of a specific node
 * Returns array of { version, path } sorted by version ascending
 */
export function listNodeVersions(
  nodeId: string,
  options: NodeStorageOptions = {}
): { version: number; path: string }[] {
  const allFiles = listNodeFiles(options);
  const versions: { version: number; path: string }[] = [];

  const pattern = new RegExp(`^${nodeId}-v(\\d+)\\.json$`);

  for (const filePath of allFiles) {
    const fileName = filePath.split("/").pop() ?? "";
    const match = pattern.exec(fileName);
    if (match) {
      versions.push({
        version: Number.parseInt(match[1], 10),
        path: filePath,
      });
    }
  }

  return versions.toSorted((a, b) => a.version - b.version);
}

/**
 * Get the latest version of a node
 */
export function getLatestNodeVersion(
  nodeId: string,
  options: NodeStorageOptions = {}
): { version: number; path: string } | null {
  const versions = listNodeVersions(nodeId, options);
  if (versions.length === 0) {
    return null;
  }
  const last = versions.at(-1);
  return last ?? null;
}

/**
 * Read the latest version of a node
 */
export function readLatestNode(
  nodeId: string,
  options: NodeStorageOptions = {}
): Node | null {
  const latest = getLatestNodeVersion(nodeId, options);
  if (!latest) {
    return null;
  }
  return readNodeFromPath(latest.path);
}

/**
 * Parse a node file path to extract node ID, version, year, and month
 */
export function parseNodePath(
  filePath: string
): { nodeId: string; version: number; year: string; month: string } | null {
  const parts = filePath.split("/");
  const fileName = parts.pop() ?? "";
  const month = parts.pop() ?? "";
  const year = parts.pop() ?? "";

  // Validate year/month format
  if (!/^\d{4}$/.test(year) || !/^\d{2}$/.test(month)) {
    return null;
  }

  // Parse filename
  const match = /^([a-f0-9]{16})-v(\d+)\.json$/.exec(fileName);
  if (!match) {
    return null;
  }

  return {
    nodeId: match[1],
    version: Number.parseInt(match[2], 10),
    year,
    month,
  };
}

/**
 * Create a new version of an existing node
 * Copies the node with incremented version and updated previousVersions
 */
export function createNodeVersion(
  existingNode: Node,
  updates: Partial<Node>,
  options: NodeStorageOptions = {}
): Node {
  const newVersion = existingNode.version + 1;
  const previousRef = `${existingNode.id}-v${existingNode.version}`;

  const newNode: Node = {
    ...existingNode,
    ...updates,
    version: newVersion,
    previousVersions: [...existingNode.previousVersions, previousRef],
    metadata: {
      ...existingNode.metadata,
      ...updates.metadata,
      analyzedAt: new Date().toISOString(),
    },
  };

  writeNode(newNode, options);
  return newNode;
}
