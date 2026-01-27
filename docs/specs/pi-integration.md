# Pi Integration

How pi-brain interfaces with pi-mono: session format, RPC, extensions, and CLI invocation.

## Session File Format

### Location

Sessions are stored at:

```
~/.pi/agent/sessions/--<encoded-path>--/<timestamp>_<uuid>.jsonl
```

Where `<encoded-path>` is the working directory with `/` replaced by `-`.

### Format

JSONL (JSON Lines) — each line is a JSON object with a `type` field.

**Version**: Current format is version 3.

### Session Header (First Line)

```json
{
  "type": "session",
  "version": 3,
  "id": "uuid",
  "timestamp": "2024-12-03T14:00:00.000Z",
  "cwd": "/path/to/project",
  "parentSession": "/path/to/parent.jsonl" // Optional, for forks
}
```

### Entry Base

All entries (except header) have:

```typescript
interface SessionEntryBase {
  type: string;
  id: string; // 8-char hex ID
  parentId: string | null; // Parent entry ID (null for first)
  timestamp: string; // ISO 8601
}
```

### Entry Types

| Type                    | Description                      | Key Fields                                    |
| ----------------------- | -------------------------------- | --------------------------------------------- |
| `message`               | User, assistant, or tool result  | `message: AgentMessage`                       |
| `compaction`            | Context compaction               | `summary`, `firstKeptEntryId`, `tokensBefore` |
| `branch_summary`        | Tree navigation with summary     | `fromId`, `summary`                           |
| `model_change`          | Model switch                     | `provider`, `modelId`                         |
| `thinking_level_change` | Thinking level change            | `thinkingLevel`                               |
| `custom`                | Extension state (not in context) | `customType`, `data`                          |
| `custom_message`        | Extension message (in context)   | `customType`, `content`, `display`            |
| `label`                 | User bookmark                    | `targetId`, `label`                           |
| `session_info`          | Session metadata                 | `name`                                        |

### Message Types

```typescript
interface UserMessage {
  role: "user";
  content: string | ContentBlock[];
  timestamp?: number;
  attachments?: Attachment[];
}

interface AssistantMessage {
  role: "assistant";
  content: ContentBlock[]; // text, thinking, toolCall
  provider: string;
  model: string;
  usage?: Usage;
  stopReason?: string;
  timestamp?: number;
}

interface ToolResultMessage {
  role: "toolResult";
  toolCallId: string;
  toolName: string;
  content: ContentBlock[];
  isError: boolean;
  timestamp?: number;
}
```

### Usage

```typescript
interface Usage {
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
```

### Tree Structure

Entries form a tree via `id`/`parentId`:

- First entry has `parentId: null`
- Each entry points to its parent
- Branching creates multiple children from one parent
- "Leaf" is the current position

```
[user] ─── [assistant] ─── [user] ─── [assistant] ─┬─ [user] ← leaf
                                                    │
                                                    └─ [branch_summary] ─── [user]
```

## CLI Invocation

### Daemon Agent Spawning

When the daemon needs to analyze a session, it spawns pi:

```bash
pi --provider zai --model glm-4.7 \
   --system-prompt ~/.pi-brain/prompts/session-analyzer.md \
   --skills rlm \
   --no-session \
   --mode json \
   -p "Analyze session segment:
       Session: /path/to/session.jsonl
       Start: entry_abc123
       End: entry_xyz789"
```

### Flags Used

| Flag                    | Purpose                            |
| ----------------------- | ---------------------------------- |
| `--provider`, `--model` | Select analysis model              |
| `--system-prompt`       | Custom prompt for session analysis |
| `--skills`              | Load RLM skill for long sessions   |
| `--no-session`          | Don't persist the analysis session |
| `--mode json`           | Output structured JSON             |
| `-p`                    | Print mode (non-interactive)       |

### JSON Mode Output

When `--mode json` is used, pi outputs structured events:

```json
{"type": "agent_start"}
{"type": "message_start", "message": {...}}
{"type": "message_update", "message": {...}, "assistantMessageEvent": {...}}
{"type": "message_end", "message": {...}}
{"type": "agent_end", "messages": [...]}
```

The final `agent_end` contains all messages. Extract the assistant's response from there.

## Pi Extension

### Registration

pi-brain registers as a pi extension providing both a user command and an agent tool:

```typescript
// extension/brain-query.ts
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function brainExtension(pi: ExtensionAPI) {
  // Register /brain command for USER queries
  // Usage: /brain why did auth fail last month?
  pi.registerCommand("brain", {
    description: "Query the pi-brain knowledge graph",
    handler: async (query, ctx) => {
      if (!query) {
        ctx.ui.notify("Usage: /brain <your question>", "error");
        return;
      }

      // Query the brain API
      const response = await fetch("http://localhost:8765/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          context: {
            project: ctx.cwd,
            model: ctx.model,
          },
        }),
      });

      const result = await response.json();

      // Display summary notification
      ctx.ui.notify(result.summary, "info");

      // Inject detailed answer into conversation
      if (result.answer) {
        ctx.setNextUserMessage(
          `Based on pi-brain analysis:\n\n${result.answer}`
        );
      }
    },
  });

  // Register brain_query tool for AGENT queries
  // Agents can use this tool to query the knowledge graph programmatically
  pi.registerTool({
    name: "brain_query",
    label: "Brain Query",
    description:
      "Query the pi-brain knowledge graph for past decisions, lessons, and patterns. Use this to check if similar problems were solved before, find project context, or learn from past sessions.",
    parameters: Type.Object({
      query: Type.String({
        description:
          "Natural language query about past sessions, decisions, or lessons",
      }),
    }),
    async execute(toolCallId, params, onUpdate, ctx, signal) {
      const response = await fetch("http://localhost:8765/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: params.query,
          context: {
            project: ctx.cwd,
            model: ctx.model,
          },
        }),
        signal,
      });

      const result = await response.json();
      return {
        content: [{ type: "text", text: result.answer }],
        details: {
          nodes: result.relatedNodes,
          sources: result.sources,
        },
      };
    },
  });
}
```

### User vs Agent Access

| Interface          | How                            | Use Case                          |
| ------------------ | ------------------------------ | --------------------------------- |
| `/brain` command   | User types `/brain <question>` | Quick lookups while working       |
| `brain_query` tool | Agent calls tool automatically | Agent needs context during task   |
| `brain` skill      | Load skill for complex queries | Agent needs guided query strategy |

### Brain Skill

For complex queries, agents can load the `brain` skill which provides guided access:

```markdown
---
name: brain
description: Query the pi-brain knowledge graph for context, decisions, and lessons
---

# Brain Query Skill

Use the `brain_query` tool to search the pi-brain knowledge graph.

## When to Use

- **Before architectural decisions**: Check what was decided before
- **When encountering errors**: See if this error pattern was solved before
- **Starting work on a project**: Get context from previous sessions
- **Debugging**: Find similar issues and their solutions

## Query Examples
```

brain_query "What authentication approach did we use in this project?"
brain_query "Have we seen this SQLite connection error before?"
brain_query "What are known quirks of Claude when using the edit tool?"
brain_query "What lessons were learned about async debugging?"

```

## Understanding Results

Results include:
- **answer**: Synthesized response to your query
- **relatedNodes**: Node IDs for deeper exploration
- **sources**: Excerpts from relevant sessions
```

### Installation

The extension is installed by symlinking:

```bash
ln -s /path/to/pi-brain/extension ~/.pi/agent/extensions/brain-query
```

Or via the pi manifest:

```json
// .pi/settings.json
{
  "extensions": ["/path/to/pi-brain/extension"]
}
```

## RPC Mode (Future)

For tighter integration, pi-brain could use RPC mode:

```bash
pi --mode rpc --no-session
```

### Relevant RPC Commands

| Command        | Purpose                  |
| -------------- | ------------------------ |
| `prompt`       | Send analysis prompt     |
| `get_messages` | Get conversation history |
| `get_state`    | Check streaming status   |
| `abort`        | Cancel analysis          |

### Events to Handle

| Event              | Use                      |
| ------------------ | ------------------------ |
| `message_update`   | Stream analysis progress |
| `agent_end`        | Get final result         |
| `tool_execution_*` | Track RLM usage          |

## Session Parsing

### Parsing Algorithm

```typescript
import { readFile } from "node:fs/promises";

interface SessionInfo {
  path: string;
  header: SessionHeader;
  entries: SessionEntry[];
  tree: TreeNode | null;
  leafId: string | null;
}

async function parseSession(filePath: string): Promise<SessionInfo> {
  const content = await readFile(filePath, "utf-8");
  const lines = content.trim().split("\n");

  // Parse header (first line)
  const header = JSON.parse(lines[0]) as SessionHeader;
  if (header.type !== "session") {
    throw new Error(`Invalid header: expected type "session"`);
  }

  // Parse entries
  const entries: SessionEntry[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    try {
      entries.push(JSON.parse(line) as SessionEntry);
    } catch (e) {
      console.warn(`Failed to parse line ${i + 1}`);
    }
  }

  // Build tree
  const tree = buildTree(entries);
  const leafId = findLeaf(entries);

  return { path: filePath, header, entries, tree, leafId };
}
```

### Building Tree

```typescript
function buildTree(entries: SessionEntry[]): TreeNode | null {
  if (entries.length === 0) return null;

  // Index by ID
  const byId = new Map<string, SessionEntry>();
  for (const entry of entries) {
    byId.set(entry.id, entry);
  }

  // Build parent -> children map
  const children = new Map<string | null, SessionEntry[]>();
  for (const entry of entries) {
    if (!children.has(entry.parentId)) {
      children.set(entry.parentId, []);
    }
    children.get(entry.parentId)!.push(entry);
  }

  // Sort children by timestamp
  for (const c of children.values()) {
    c.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  // Find leaf
  const leafId = findLeaf(entries);

  // Build recursively
  function buildNode(entry: SessionEntry, depth: number): TreeNode {
    const nodeChildren = children.get(entry.id) || [];
    return {
      entry,
      children: nodeChildren
        .filter((e) => e.type !== "label")
        .map((e) => buildNode(e, depth + 1)),
      depth,
      isLeaf: entry.id === leafId,
      isBranchPoint: nodeChildren.length > 1,
    };
  }

  const roots = children.get(null) || [];
  return roots.length > 0 ? buildNode(roots[0], 0) : null;
}
```

### Finding Leaf

```typescript
function findLeaf(entries: SessionEntry[]): string | null {
  if (entries.length === 0) return null;

  // Find entries that have children
  const hasChildren = new Set<string>();
  for (const entry of entries) {
    if (entry.parentId) {
      hasChildren.add(entry.parentId);
    }
  }

  // Find latest entry without children
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
```

## Boundary Detection

### Boundary Types

| Boundary                | Detection                           | Edge Type           |
| ----------------------- | ----------------------------------- | ------------------- |
| `/tree` with summary    | `type === 'branch_summary'`         | `branch`            |
| `/tree` without summary | `entry.parentId !== previousLeafId` | `tree_jump`         |
| `/compact`              | `type === 'compaction'`             | `compaction`        |
| `/fork`                 | New session with `parentSession`    | `fork`              |
| Resume                  | 10+ minute timestamp gap            | `resume`            |
| Session end             | 10+ minutes idle                    | (triggers analysis) |

### Detection Algorithm

```typescript
interface Boundary {
  type: "branch" | "tree_jump" | "compaction" | "resume";
  entryId: string;
  timestamp: string;
  previousEntryId?: string;
}

function detectBoundaries(entries: SessionEntry[]): Boundary[] {
  const boundaries: Boundary[] = [];
  let previousEntry: SessionEntry | null = null;
  let previousLeafId: string | null = null;

  for (const entry of entries) {
    // Branch summary = explicit tree navigation with summary
    if (entry.type === "branch_summary") {
      boundaries.push({
        type: "branch",
        entryId: entry.id,
        timestamp: entry.timestamp,
        previousEntryId: (entry as BranchSummaryEntry).fromId,
      });
    }

    // Compaction
    else if (entry.type === "compaction") {
      boundaries.push({
        type: "compaction",
        entryId: entry.id,
        timestamp: entry.timestamp,
      });
    }

    // Tree jump without summary
    else if (previousLeafId && entry.parentId !== previousLeafId) {
      // Check it's not just normal continuation
      if (previousEntry && entry.parentId !== previousEntry.id) {
        boundaries.push({
          type: "tree_jump",
          entryId: entry.id,
          timestamp: entry.timestamp,
          previousEntryId: previousLeafId,
        });
      }
    }

    // Resume detection (10+ minute gap)
    if (previousEntry) {
      const gap =
        new Date(entry.timestamp).getTime() -
        new Date(previousEntry.timestamp).getTime();
      if (gap >= 10 * 60 * 1000) {
        // 10 minutes
        boundaries.push({
          type: "resume",
          entryId: entry.id,
          timestamp: entry.timestamp,
          previousEntryId: previousEntry.id,
        });
      }
    }

    previousEntry = entry;
    // Update leaf tracking (simplified - full algorithm is more complex)
    if (!["label", "session_info"].includes(entry.type)) {
      previousLeafId = entry.id;
    }
  }

  return boundaries;
}
```

## Fork Detection

Forks create new session files:

```typescript
interface ForkRelationship {
  parentPath: string;
  childPath: string;
  timestamp: string;
}

function findForks(sessions: SessionInfo[]): ForkRelationship[] {
  const forks: ForkRelationship[] = [];

  for (const session of sessions) {
    if (session.header.parentSession) {
      forks.push({
        parentPath: session.header.parentSession,
        childPath: session.path,
        timestamp: session.header.timestamp,
      });
    }
  }

  return forks;
}
```

## Data Extraction

### From Assistant Messages

```typescript
function extractFromAssistant(entry: SessionMessageEntry): {
  model: string;
  provider: string;
  usage: Usage | null;
  hasThinking: boolean;
  toolCalls: string[];
} {
  const msg = entry.message as AssistantMessage;

  const toolCalls: string[] = [];
  let hasThinking = false;

  for (const block of msg.content) {
    if (block.type === "toolCall") {
      toolCalls.push(block.name);
    } else if (block.type === "thinking") {
      hasThinking = true;
    }
  }

  return {
    model: msg.model,
    provider: msg.provider,
    usage: msg.usage ?? null,
    hasThinking,
    toolCalls,
  };
}
```

### From Tool Results

```typescript
function extractFromToolResult(entry: SessionMessageEntry): {
  toolName: string;
  isError: boolean;
  outputSize: number;
} {
  const msg = entry.message as ToolResultMessage;

  let outputSize = 0;
  for (const block of msg.content) {
    if (block.type === "text") {
      outputSize += block.text.length;
    }
  }

  return {
    toolName: msg.toolName,
    isError: msg.isError,
    outputSize,
  };
}
```

## Source References

- Session format: `packages/coding-agent/docs/session.md`
- Tree navigation: `packages/coding-agent/docs/tree.md`
- Compaction: `packages/coding-agent/docs/compaction.md`
- RPC mode: `packages/coding-agent/docs/rpc.md`
- Extensions: `packages/coding-agent/docs/extensions.md`
- Session manager: `packages/coding-agent/src/core/session-manager.ts`
