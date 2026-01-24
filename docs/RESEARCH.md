# Pi Session Research

Comprehensive analysis of how pi coding agent stores and manages session trees, branches, and forks.

## Session Storage

### File Location

Sessions are stored as JSONL files:
```
~/.pi/agent/sessions/--<encoded-path>--/<timestamp>_<uuid>.jsonl
```

Where `<encoded-path>` is the working directory with `/` replaced by `-`.

Example:
```
~/.pi/agent/sessions/--home-will-projects-myapp--/2026-01-24T16-22-26-831Z_e99116ac-a6da-48fc-ad8b-2feca1c51550.jsonl
```

### JSONL Format

Each line is a JSON object with a `type` field. The first line is always the session header.

## Entry Types

### SessionHeader (first line only)

```json
{
  "type": "session",
  "version": 3,
  "id": "uuid",
  "timestamp": "2024-12-03T14:00:00.000Z",
  "cwd": "/path/to/project",
  "parentSession": "/path/to/parent.jsonl"  // optional, for forks
}
```

### SessionMessageEntry

Messages in the conversation (user, assistant, toolResult):

```json
{
  "type": "message",
  "id": "a1b2c3d4",
  "parentId": "prev1234",
  "timestamp": "2024-12-03T14:00:01.000Z",
  "message": {
    "role": "user",
    "content": "Hello"
  }
}
```

Assistant messages include:
- `provider`, `model` - Which LLM responded
- `usage` - Token counts and costs
- `stopReason` - Why generation stopped
- `content` - Array of text, thinking, and toolCall blocks

### CompactionEntry

Created when context is compacted (auto or via `/compact`):

```json
{
  "type": "compaction",
  "id": "f6g7h8i9",
  "parentId": "e5f6g7h8",
  "timestamp": "...",
  "summary": "User discussed X, Y, Z...",
  "firstKeptEntryId": "c3d4e5f6",
  "tokensBefore": 50000,
  "details": {
    "readFiles": ["path/to/file.ts"],
    "modifiedFiles": ["path/to/changed.ts"]
  }
}
```

### BranchSummaryEntry

Created when switching branches via `/tree` with summarization:

```json
{
  "type": "branch_summary",
  "id": "g7h8i9j0",
  "parentId": "a1b2c3d4",
  "timestamp": "...",
  "fromId": "f6g7h8i9",
  "summary": "Branch explored approach A...",
  "details": {
    "readFiles": [...],
    "modifiedFiles": [...]
  }
}
```

### ModelChangeEntry

When user switches models mid-session:

```json
{
  "type": "model_change",
  "id": "d4e5f6g7",
  "parentId": "c3d4e5f6",
  "timestamp": "...",
  "provider": "openai",
  "modelId": "gpt-4o"
}
```

### ThinkingLevelChangeEntry

When user changes reasoning level:

```json
{
  "type": "thinking_level_change",
  "id": "e5f6g7h8",
  "parentId": "d4e5f6g7",
  "timestamp": "...",
  "thinkingLevel": "high"
}
```

### CustomEntry

Extension state persistence (NOT in LLM context):

```json
{
  "type": "custom",
  "id": "h8i9j0k1",
  "parentId": "g7h8i9j0",
  "timestamp": "...",
  "customType": "my-extension",
  "data": {"count": 42}
}
```

### CustomMessageEntry

Extension-injected messages (IN LLM context):

```json
{
  "type": "custom_message",
  "id": "i9j0k1l2",
  "parentId": "h8i9j0k1",
  "timestamp": "...",
  "customType": "my-extension",
  "content": "Injected context...",
  "display": true
}
```

### LabelEntry

User-defined bookmarks:

```json
{
  "type": "label",
  "id": "j0k1l2m3",
  "parentId": "i9j0k1l2",
  "timestamp": "...",
  "targetId": "a1b2c3d4",
  "label": "checkpoint-1"
}
```

### SessionInfoEntry

Session display name (set via `/name`):

```json
{
  "type": "session_info",
  "id": "k1l2m3n4",
  "parentId": "j0k1l2m3",
  "timestamp": "...",
  "name": "Refactor auth module"
}
```

## Tree Structure

### How It Works

Entries form a tree via `id` and `parentId` fields:

- First entry has `parentId: null`
- Each subsequent entry points to its parent
- The "leaf" is the current position in the tree
- Branching creates new children from an earlier entry

```
[user msg] ─── [assistant] ─── [user msg] ─── [assistant] ─┬─ [user msg] ← current leaf
                                                            │
                                                            └─ [branch_summary] ─── [user msg] ← alternate branch
```

### Branch Points

A branch point occurs when multiple entries share the same `parentId`. This happens when:

1. User uses `/tree` to navigate back and continues from an earlier point
2. Model/thinking level changes create parallel entries
3. Tool results and user messages branch from the same assistant message

### Finding Branch Points

```python
parent_to_children = {}
for entry in entries:
    if entry.parentId:
        parent_to_children.setdefault(entry.parentId, []).append(entry.id)

branch_points = {k: v for k, v in parent_to_children.items() if len(v) > 1}
```

## Forks vs Trees

| Feature | `/fork` | `/tree` |
|---------|---------|---------|
| View | Flat list of user messages | Full tree structure |
| Action | Creates **new session file** | Changes leaf in **same session** |
| Summary | Never | Optional (user prompted) |
| Tracking | `parentSession` in header | `branch_summary` entry |

### Fork Relationships

Forked sessions have `parentSession` in their header pointing to the original session file:

```json
{"type":"session","version":3,"id":"...","parentSession":"/path/to/original.jsonl"}
```

This creates a cross-file relationship that can be visualized as a "family tree" of sessions.

## Context Building

`buildSessionContext()` walks from the current leaf to the root:

1. Collects all entries on the path
2. Extracts current model and thinking level settings
3. If a `CompactionEntry` is on the path:
   - Emits the summary first
   - Then messages from `firstKeptEntryId` onward
4. Converts `BranchSummaryEntry` and `CustomMessageEntry` to appropriate formats

## Real-World Observations

From analyzing actual session files:

### Session Sizes
- Typical sessions: 50-500 entries
- Large sessions: 1000+ entries
- File sizes: 1KB to 4MB+

### Branch Complexity
- Most sessions have 0-4 branch points
- Branch points often occur at:
  - Model/thinking changes (adjacent branches)
  - `/tree` navigation (intentional exploration)
  - Tool result vs. user continuation

### Compaction Frequency
- Triggers when context exceeds threshold
- Typically 1-5 compactions per large session
- Each compaction tracks `tokensBefore` for history

### Fork Usage
- Less common than in-session branching
- Used for major exploration divergences
- Creates separate session files for cleaner history

## API Reference

### SessionManager Methods

```typescript
// Creation
SessionManager.create(cwd, sessionDir?)
SessionManager.open(path, sessionDir?)
SessionManager.continueRecent(cwd, sessionDir?)
SessionManager.inMemory(cwd?)
SessionManager.list(cwd, sessionDir?)

// Tree Navigation
getLeafId(): string | null
getLeafEntry(): SessionEntry | null
getEntry(id: string): SessionEntry | undefined
getBranch(fromId?: string): SessionEntry[]
getTree(): SessionTreeNode[]
getChildren(parentId: string): SessionEntry[]
branch(entryId: string): void
branchWithSummary(entryId, summary, details?, fromHook?): void

// Context
buildSessionContext(): SessionContext
getEntries(): SessionEntry[]
getHeader(): SessionHeader
```

### RPC Commands

```json
{"type": "get_fork_messages"}
{"type": "fork", "entryId": "abc123"}
{"type": "switch_session", "sessionPath": "/path/to/session.jsonl"}
{"type": "get_messages"}
{"type": "get_state"}
```

### Extension Events

- `session_start` - Session loaded
- `session_before_tree` - Before `/tree` navigation
- `session_tree` - After `/tree` navigation
- `session_before_fork` - Before `/fork`
- `session_fork` - After `/fork`
- `session_before_compact` - Before compaction
- `session_compact` - After compaction

## Source References

- Session format: `docs/session.md`
- Tree navigation: `docs/tree.md`
- Compaction: `docs/compaction.md`
- RPC mode: `docs/rpc.md`
- Extensions: `docs/extensions.md`
- SDK: `docs/sdk.md`
