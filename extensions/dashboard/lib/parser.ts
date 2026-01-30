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
} from "./types.js";

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
  const topics = extractTopics(entries);

  return {
    entries,
    firstMessage,
    header,
    leafId,
    name,
    path: filePath,
    stats,
    topics,
    tree,
  };
}

/**
 * Build parent → children map from entries
 */
function buildChildrenMap(
  entries: SessionEntry[]
): Map<string | null, SessionEntry[]> {
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

  return childrenMap;
}

/**
 * Collect labels from label entries
 */
function collectLabels(entries: SessionEntry[]): Map<string, string[]> {
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
  return labelsMap;
}

/**
 * Build a tree structure from entries
 */
export function buildTree(entries: SessionEntry[]): TreeNode | null {
  if (entries.length === 0) {
    return null;
  }

  const childrenMap = buildChildrenMap(entries);
  const labelsMap = collectLabels(entries);
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

  // If multiple roots, return first one (shouldn't happen in valid sessions)
  return buildNode(roots[0], 0);
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
 * Process a message entry for statistics
 */
function processMessageEntry(
  entry: SessionMessageEntry,
  stats: {
    userMessageCount: number;
    assistantMessageCount: number;
    toolResultCount: number;
    totalTokens: number;
    totalCost: number;
    modelsUsed: Set<string>;
  }
): void {
  const msg = entry.message;

  if (msg.role === "user") {
    stats.userMessageCount++;
  } else if (msg.role === "assistant") {
    stats.assistantMessageCount++;
    const assistantMsg = msg as AssistantMessage;
    stats.modelsUsed.add(`${assistantMsg.provider}/${assistantMsg.model}`);
    if (assistantMsg.usage) {
      stats.totalTokens +=
        (assistantMsg.usage.input || 0) + (assistantMsg.usage.output || 0);
      if (assistantMsg.usage.cost) {
        stats.totalCost += assistantMsg.usage.cost.total || 0;
      }
    }
  } else if (msg.role === "toolResult") {
    stats.toolResultCount++;
  }
}

/**
 * Calculate session statistics
 */
export function calculateStats(
  entries: SessionEntry[],
  tree: TreeNode | null
): SessionStats {
  const stats = {
    messageCount: 0,
    userMessageCount: 0,
    assistantMessageCount: 0,
    toolResultCount: 0,
    compactionCount: 0,
    branchSummaryCount: 0,
    totalTokens: 0,
    totalCost: 0,
    modelsUsed: new Set<string>(),
  };

  for (const entry of entries) {
    if (entry.type === "message") {
      stats.messageCount++;
      processMessageEntry(entry as SessionMessageEntry, stats);
    } else if (entry.type === "compaction") {
      stats.compactionCount++;
    } else if (entry.type === "branch_summary") {
      stats.branchSummaryCount++;
    }
  }

  const branchPointCount = findBranchPoints(entries).length;
  const maxDepth = tree ? calculateMaxDepth(tree) : 0;

  return {
    assistantMessageCount: stats.assistantMessageCount,
    branchPointCount,
    branchSummaryCount: stats.branchSummaryCount,
    compactionCount: stats.compactionCount,
    entryCount: entries.length,
    maxDepth,
    messageCount: stats.messageCount,
    modelsUsed: [...stats.modelsUsed],
    toolResultCount: stats.toolResultCount,
    totalCost: stats.totalCost,
    totalTokens: stats.totalTokens,
    userMessageCount: stats.userMessageCount,
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
  return `${cleaned.slice(0, maxLength - 3)}...`;
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

/**
 * Extract simple topics from session based on frequent words in user messages
 */
export function extractTopics(entries: SessionEntry[]): string[] {
  const stopWords = new Set([
    "a",
    "an",
    "the",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "by",
    "from",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "can",
    "could",
    "should",
    "would",
    "will",
    "may",
    "might",
    "must",
    "i",
    "you",
    "he",
    "she",
    "it",
    "we",
    "they",
    "my",
    "your",
    "his",
    "her",
    "its",
    "our",
    "their",
    "this",
    "that",
    "these",
    "those",
    "what",
    "which",
    "who",
    "whom",
    "whose",
    "where",
    "when",
    "why",
    "how",
    "add",
    "create",
    "update",
    "delete",
    "remove",
    "change",
    "fix",
    "bug",
    "error",
    "issue",
    "problem",
    "code",
    "file",
    "files",
    "please",
    "help",
    "make",
    "use",
    "using",
    "need",
    "want",
    "like",
  ]);

  const words = new Map<string, number>();

  for (const entry of entries) {
    if (entry.type === "message") {
      const msgEntry = entry as SessionMessageEntry;
      if (msgEntry.message.role === "user") {
        const { content } = msgEntry.message;
        let text = "";
        if (typeof content === "string") {
          text = content;
        } else if (Array.isArray(content)) {
          text = content
            .filter((b) => b.type === "text")
            .map((b) => (b as TextContent).text)
            .join(" ");
        }

        // Simple tokenization
        // Replace non-alphanumeric with space to handle punctuation as separators
        const tokens = text
          .toLowerCase()
          .replaceAll(/[^a-z0-9\s]/g, " ")
          .split(/\s+/);
        for (const token of tokens) {
          if (token.length > 3 && !stopWords.has(token)) {
            words.set(token, (words.get(token) || 0) + 1);
          }
        }
      }
    }
  }

  return [...words.entries()]
    .toSorted((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map((e) => e[0]);
}
