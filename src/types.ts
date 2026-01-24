/**
 * Type definitions for pi session data structures
 * Based on pi-coding-agent's session format (version 3)
 */

// =============================================================================
// Session Entry Types (from pi's session-manager.ts)
// =============================================================================

export interface SessionEntryBase {
  type: string;
  id: string;
  parentId: string | null;
  timestamp: string;
}

export interface SessionHeader {
  type: 'session';
  version: number;
  id: string;
  timestamp: string;
  cwd: string;
  parentSession?: string;
}

export interface SessionMessageEntry extends SessionEntryBase {
  type: 'message';
  message: AgentMessage;
}

export interface CompactionEntry extends SessionEntryBase {
  type: 'compaction';
  summary: string;
  firstKeptEntryId: string;
  tokensBefore: number;
  fromHook?: boolean;
  details?: CompactionDetails;
}

export interface CompactionDetails {
  readFiles: string[];
  modifiedFiles: string[];
}

export interface BranchSummaryEntry extends SessionEntryBase {
  type: 'branch_summary';
  fromId: string;
  summary: string;
  fromHook?: boolean;
  details?: BranchSummaryDetails;
}

export interface BranchSummaryDetails {
  readFiles: string[];
  modifiedFiles: string[];
}

export interface ModelChangeEntry extends SessionEntryBase {
  type: 'model_change';
  provider: string;
  modelId: string;
}

export interface ThinkingLevelChangeEntry extends SessionEntryBase {
  type: 'thinking_level_change';
  thinkingLevel: string;
}

export interface CustomEntry extends SessionEntryBase {
  type: 'custom';
  customType: string;
  data?: unknown;
}

export interface CustomMessageEntry extends SessionEntryBase {
  type: 'custom_message';
  customType: string;
  content: string | ContentBlock[];
  display: boolean;
  details?: unknown;
}

export interface LabelEntry extends SessionEntryBase {
  type: 'label';
  targetId: string;
  label: string | undefined;
}

export interface SessionInfoEntry extends SessionEntryBase {
  type: 'session_info';
  name: string;
}

export type SessionEntry =
  | SessionMessageEntry
  | CompactionEntry
  | BranchSummaryEntry
  | ModelChangeEntry
  | ThinkingLevelChangeEntry
  | CustomEntry
  | CustomMessageEntry
  | LabelEntry
  | SessionInfoEntry;

// =============================================================================
// Message Types (from pi's ai/types.ts)
// =============================================================================

export interface UserMessage {
  role: 'user';
  content: string | ContentBlock[];
  timestamp?: number;
  attachments?: Attachment[];
}

export interface AssistantMessage {
  role: 'assistant';
  content: ContentBlock[];
  provider: string;
  model: string;
  usage?: Usage;
  stopReason?: string;
  timestamp?: number;
}

export interface ToolResultMessage {
  role: 'toolResult';
  toolCallId: string;
  toolName: string;
  content: ContentBlock[];
  isError: boolean;
  timestamp?: number;
}

export type AgentMessage = UserMessage | AssistantMessage | ToolResultMessage;

export interface TextContent {
  type: 'text';
  text: string;
}

export interface ThinkingContent {
  type: 'thinking';
  thinking: string;
}

export interface ToolCallContent {
  type: 'toolCall';
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ImageContent {
  type: 'image';
  source: ImageSource;
}

export interface ImageSource {
  type: 'base64' | 'url';
  mediaType?: string;
  data?: string;
  url?: string;
}

export type ContentBlock = TextContent | ThinkingContent | ToolCallContent | ImageContent;

export interface Usage {
  input: number;
  output: number;
  cacheRead?: number;
  cacheWrite?: number;
  cost?: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
    total: number;
  };
}

export interface Attachment {
  id: string;
  type: string;
  fileName: string;
  mimeType: string;
  size: number;
  content: string;
  extractedText?: string;
  preview?: string;
}

// =============================================================================
// Visualization Types
// =============================================================================

export interface SessionInfo {
  /** Absolute path to the session file */
  path: string;
  /** Session header (first line) */
  header: SessionHeader;
  /** All entries (excluding header) */
  entries: SessionEntry[];
  /** Tree structure built from entries */
  tree: TreeNode | null;
  /** Current leaf entry ID */
  leafId: string | null;
  /** Session statistics */
  stats: SessionStats;
  /** Session display name (from session_info entry) */
  name?: string;
  /** First user message preview */
  firstMessage?: string;
}

export interface TreeNode {
  /** The session entry at this node */
  entry: SessionEntry;
  /** Child nodes */
  children: TreeNode[];
  /** Depth in tree (root = 0) */
  depth: number;
  /** True if this is the current leaf */
  isLeaf: boolean;
  /** True if this node has multiple children */
  isBranchPoint: boolean;
  /** Labels attached to this entry */
  labels: string[];
}

export interface SessionStats {
  /** Total number of entries */
  entryCount: number;
  /** Number of message entries */
  messageCount: number;
  /** Number of user messages */
  userMessageCount: number;
  /** Number of assistant messages */
  assistantMessageCount: number;
  /** Number of tool results */
  toolResultCount: number;
  /** Number of compaction entries */
  compactionCount: number;
  /** Number of branch summary entries */
  branchSummaryCount: number;
  /** Number of branch points (entries with multiple children) */
  branchPointCount: number;
  /** Total tokens used (input + output) */
  totalTokens: number;
  /** Total cost in dollars */
  totalCost: number;
  /** Maximum tree depth */
  maxDepth: number;
  /** Models used in session */
  modelsUsed: string[];
}

export interface ForkRelationship {
  /** Path to parent session */
  parentPath: string;
  /** Path to child (forked) session */
  childPath: string;
  /** Timestamp of fork */
  timestamp: string;
}

export interface ProjectGroup {
  /** Project working directory */
  cwd: string;
  /** Sessions in this project */
  sessions: SessionInfo[];
  /** Total entries across all sessions */
  totalEntries: number;
}

// =============================================================================
// Visualization Output Types
// =============================================================================

export interface VisualizationData {
  /** All sessions indexed by path */
  sessions: SessionInfo[];
  /** Fork relationships between sessions */
  forks: ForkRelationship[];
  /** Sessions grouped by project */
  projects: ProjectGroup[];
  /** Generation timestamp */
  generatedAt: string;
  /** Generator version */
  version: string;
}
