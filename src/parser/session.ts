/**
 * Parser for pi session JSONL files
 * Parses entries and builds tree structure
 */

import { readFile } from "node:fs/promises";

import type {
  SessionHeader,
  SessionEntry,
  SessionInfo,
  TreeNode,
  SessionStats,
  SessionMessageEntry,
  AssistantMessage,
  UserMessage,
  TextContent,
  LabelEntry,
  SessionInfoEntry,
} from "../types.js";

/**
 * Parse a session JSONL file
 */
export async function parseSession(filePath: string): Promise<SessionInfo> {
  const content = await readFile(filePath, "utf8");
  return parseSessionContent(content, filePath);
}

/**
 * Parse session content from string
 */
export function parseSessionContent(
  content: string,
  filePath: string
): SessionInfo {
  const lines = content.trim().split("\n");
  if (lines.length === 0) {
    throw new Error(`Empty session file: ${filePath}`);
  }

  // Parse header (first line)
  const header = JSON.parse(lines[0]) as SessionHeader;
  if (header.type !== "session") {
    throw new Error(
      `Invalid session header in ${filePath}: expected type "session"`
    );
  }

  // Parse entries (remaining lines)
  const entries: SessionEntry[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      continue;
    }
    try {
      const entry = JSON.parse(line) as SessionEntry;
      entries.push(entry);
    } catch (error) {
      console.warn(`Failed to parse line ${i + 1} in ${filePath}:`, error);
    }
  }

  // Build tree and calculate stats
  const tree = buildTree(entries);
  const leafId = findLeaf(entries);
  const stats = calculateStats(entries, tree);
  const name = findSessionName(entries);
  const firstMessage = findFirstMessage(entries);

  return {
    entries,
    firstMessage,
    header,
    leafId,
    name,
    path: filePath,
    stats,
    tree,
  };
}

/**
 * Build a tree structure from entries
 */
export function buildTree(entries: SessionEntry[]): TreeNode | null {
  if (entries.length === 0) {
    return null;
  }

  // Index entries by ID
  const entriesById = new Map<string, SessionEntry>();
  for (const entry of entries) {
    entriesById.set(entry.id, entry);
  }

  // Build parent → children map
  const childrenMap = new Map<string | null, SessionEntry[]>();
  for (const entry of entries) {
    const { parentId } = entry;
    if (!childrenMap.has(parentId)) {
      childrenMap.set(parentId, []);
    }
    const children = childrenMap.get(parentId);
    if (children) {
      children.push(entry);
    }
  }

  // Sort children by timestamp
  for (const children of childrenMap.values()) {
    children.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  // Collect labels
  const labelsMap = new Map<string, string[]>();
  for (const entry of entries) {
    if (entry.type === "label") {
      const labelEntry = entry as LabelEntry;
      if (labelEntry.label) {
        if (!labelsMap.has(labelEntry.targetId)) {
          labelsMap.set(labelEntry.targetId, []);
        }
        const labels = labelsMap.get(labelEntry.targetId);
        if (labels) {
          labels.push(labelEntry.label);
        }
      }
    }
  }

  // Find leaf
  const leafId = findLeaf(entries);

  // Build tree recursively
  function buildNode(entry: SessionEntry, depth: number): TreeNode {
    const children = childrenMap.get(entry.id) || [];
    const childNodes = children
      .filter((e) => e.type !== "label") // Labels don't appear as tree nodes
      .map((e) => buildNode(e, depth + 1));

    return {
      children: childNodes,
      depth,
      entry,
      isBranchPoint: childNodes.length > 1,
      isLeaf: entry.id === leafId,
      labels: labelsMap.get(entry.id) || [],
    };
  }

  // Find root entries (parentId === null)
  const roots = childrenMap.get(null) || [];
  if (roots.length === 0) {
    return null;
  }

  // Single root is the normal case
  if (roots.length === 1) {
    return buildNode(roots[0], 0);
  }

  // Multiple roots detected - this indicates a potentially corrupt session
  // or entries imported from multiple sources. Log warning for debugging.
  console.warn(
    `[session-parser] Warning: Found ${roots.length} root entries (expected 1). ` +
      `This may indicate a corrupt session or merged entries. ` +
      `Root IDs: ${roots.map((r) => r.id).join(", ")}`
  );

  // Return a forest structure: build nodes for all roots at depth 0
  // This preserves all data rather than silently dropping roots.
  // For now, return the chronologically first root as the primary tree
  // since the TreeNode interface doesn't support multiple roots directly.
  const sortedRoots = [...roots].toSorted((a, b) =>
    a.timestamp.localeCompare(b.timestamp)
  );
  return buildNode(sortedRoots[0], 0);
}

/**
 * Find the current leaf entry ID
 * The leaf is the latest entry that has no children
 */
export function findLeaf(entries: SessionEntry[]): string | null {
  if (entries.length === 0) {
    return null;
  }

  // Build set of entries that have children
  const hasChildren = new Set<string>();
  for (const entry of entries) {
    if (entry.parentId) {
      hasChildren.add(entry.parentId);
    }
  }

  // Find entries without children, get the latest one
  let leafEntry: SessionEntry | null = null;
  for (const entry of entries) {
    if (!hasChildren.has(entry.id)) {
      if (!leafEntry || entry.timestamp > leafEntry.timestamp) {
        leafEntry = entry;
      }
    }
  }

  return leafEntry?.id ?? null;
}

/**
 * Find branch points (entries with multiple children)
 */
export function findBranchPoints(entries: SessionEntry[]): string[] {
  const childCount = new Map<string, number>();

  for (const entry of entries) {
    if (entry.parentId) {
      childCount.set(entry.parentId, (childCount.get(entry.parentId) || 0) + 1);
    }
  }

  return [...childCount.entries()]
    .filter(([_, count]) => count > 1)
    .map(([id]) => id);
}

/**
 * Calculate session statistics
 */
export function calculateStats(
  entries: SessionEntry[],
  tree: TreeNode | null
): SessionStats {
  let messageCount = 0;
  let userMessageCount = 0;
  let assistantMessageCount = 0;
  let toolResultCount = 0;
  let compactionCount = 0;
  let branchSummaryCount = 0;
  let totalTokens = 0;
  let totalCost = 0;
  const modelsUsed = new Set<string>();

  for (const entry of entries) {
    switch (entry.type) {
      case "message": {
        messageCount++;
        const msgEntry = entry as SessionMessageEntry;
        const msg = msgEntry.message;

        if (msg.role === "user") {
          userMessageCount++;
        } else if (msg.role === "assistant") {
          assistantMessageCount++;
          const assistantMsg = msg as AssistantMessage;
          modelsUsed.add(`${assistantMsg.provider}/${assistantMsg.model}`);
          if (assistantMsg.usage) {
            totalTokens +=
              (assistantMsg.usage.input || 0) +
              (assistantMsg.usage.output || 0);
            if (assistantMsg.usage.cost) {
              totalCost += assistantMsg.usage.cost.total || 0;
            }
          }
        } else if (msg.role === "toolResult") {
          toolResultCount++;
        }
        break;
      }
      case "compaction": {
        compactionCount++;
        break;
      }
      case "branch_summary": {
        branchSummaryCount++;
        break;
      }
    }
  }

  const branchPointCount = findBranchPoints(entries).length;
  const maxDepth = tree ? calculateMaxDepth(tree) : 0;

  return {
    assistantMessageCount,
    branchPointCount,
    branchSummaryCount,
    compactionCount,
    entryCount: entries.length,
    maxDepth,
    messageCount,
    modelsUsed: [...modelsUsed],
    toolResultCount,
    totalCost,
    totalTokens,
    userMessageCount,
  };
}

/**
 * Calculate maximum depth of tree
 */
function calculateMaxDepth(node: TreeNode): number {
  if (node.children.length === 0) {
    return node.depth;
  }
  return Math.max(...node.children.map(calculateMaxDepth));
}

/**
 * Find session name from session_info entries
 */
function findSessionName(entries: SessionEntry[]): string | undefined {
  // Get the latest session_info entry
  let latest: SessionInfoEntry | undefined;
  for (const entry of entries) {
    if (entry.type === "session_info") {
      const infoEntry = entry as SessionInfoEntry;
      if (!latest || entry.timestamp > latest.timestamp) {
        latest = infoEntry;
      }
    }
  }
  return latest?.name;
}

/**
 * Find first user message preview
 */
function findFirstMessage(entries: SessionEntry[]): string | undefined {
  for (const entry of entries) {
    if (entry.type === "message") {
      const msgEntry = entry as SessionMessageEntry;
      if (msgEntry.message.role === "user") {
        return extractTextPreview(msgEntry.message);
      }
    }
  }
  return undefined;
}

/**
 * Extract text preview from a message
 */
export function extractTextPreview(
  message: UserMessage | AssistantMessage,
  maxLength = 100
): string {
  const { content } = message;

  if (typeof content === "string") {
    return truncate(content, maxLength);
  }

  if (Array.isArray(content)) {
    for (const block of content) {
      if (block.type === "text") {
        return truncate((block as TextContent).text, maxLength);
      }
    }
  }

  return "";
}

/**
 * Truncate string with ellipsis
 */
function truncate(str: string, maxLength: number): string {
  const cleaned = str.replaceAll(/\s+/g, " ").trim();
  if (cleaned.length <= maxLength) {
    return cleaned;
  }
  return cleaned.slice(0, maxLength - 3) + "...";
}

/**
 * Get the path from root to a specific entry
 */
export function getPathToEntry(
  entries: SessionEntry[],
  targetId: string
): SessionEntry[] {
  const entriesById = new Map<string, SessionEntry>();
  for (const entry of entries) {
    entriesById.set(entry.id, entry);
  }

  const path: SessionEntry[] = [];
  let currentId: string | null = targetId;

  while (currentId) {
    const entry = entriesById.get(currentId);
    if (!entry) {
      break;
    }
    path.unshift(entry);
    currentId = entry.parentId;
  }

  return path;
}

/**
 * Get entry by ID
 */
export function getEntry(
  entries: SessionEntry[],
  id: string
): SessionEntry | undefined {
  return entries.find((e) => e.id === id);
}
