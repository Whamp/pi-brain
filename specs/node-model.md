# Node Model

Detailed data structures for nodes and edges, boundary detection algorithms, and versioning semantics.

## Overview

Nodes represent discrete units of work extracted from pi sessions. Each node encapsulates:

- What happened (summary, decisions, files)
- What was learned (multi-level lessons)
- Model behavior (quirks, wins, failures)
- Metadata (cost, tokens, timing)

Edges connect nodes to form a knowledge graph showing relationships and continuity.

## Node Data Structure

### Core Types

```typescript
interface Node {
  // Identity
  id: string; // 16-char hex, e.g., "a1b2c3d4e5f6g7h8"
  version: number; // Starts at 1, increments on reanalysis
  previousVersions: string[]; // IDs of prior version nodes

  // Source Reference
  source: NodeSource;

  // Classification
  classification: NodeClassification;

  // Content
  content: NodeContent;

  // Multi-level Lessons
  lessons: LessonsByLevel;

  // Model/Agent Observations
  observations: ModelObservations;

  // Metadata
  metadata: NodeMetadata;

  // Semantic Linking
  semantic: SemanticData;

  // Daemon Metadata
  daemonMeta: DaemonMeta;
}
```

### Source Reference

Links the node back to the original session segment.

```typescript
interface NodeSource {
  sessionFile: string; // Absolute path to .jsonl file
  segment: {
    startEntryId: string; // First entry ID in segment
    endEntryId: string; // Last entry ID in segment
    entryCount: number; // Number of entries
  };
  computer: string; // Hostname of source machine
  sessionId: string; // Session UUID from header
  parentSession?: string; // If forked, parent session path
}
```

### Classification

How the work is categorized.

```typescript
interface NodeClassification {
  type: NodeType;
  project: string; // Absolute path, e.g., "/home/will/projects/pi-brain"
  isNewProject: boolean; // First session for this project
  hadClearGoal: boolean; // User provided specific, actionable goal
  language?: string; // Primary programming language
  frameworks?: string[]; // Frameworks used (React, SvelteKit, etc.)
}

type NodeType =
  | "coding" // Writing new code
  | "debugging" // Fixing bugs
  | "refactoring" // Restructuring existing code
  | "sysadmin" // System administration, config
  | "research" // Reading docs, exploring
  | "planning" // Architecture, design decisions
  | "qa" // Testing, review
  | "brainstorm" // Open-ended exploration
  | "handoff" // Session handoff documentation
  | "documentation" // Writing docs
  | "configuration" // Config files, tooling setup
  | "data" // Data manipulation, analysis
  | "other"; // Doesn't fit other categories
```

### Content

What actually happened in the segment.

```typescript
interface NodeContent {
  summary: string; // 1-3 sentence description
  outcome: Outcome;
  keyDecisions: Decision[];
  filesTouched: string[]; // Relative paths from project root
  toolsUsed: string[]; // Tools invoked (read, bash, edit, etc.)
  errorsSeen: ErrorSummary[]; // Errors encountered
}

type Outcome = "success" | "partial" | "failed" | "abandoned";

interface Decision {
  what: string; // What was decided
  why: string; // Rationale
  alternativesConsidered: string[];
}

interface ErrorSummary {
  type: string; // Error category
  message: string; // Key part of error message
  resolved: boolean; // Was it fixed in this segment?
}
```

### Lessons

Multi-level learning taxonomy. Each level captures different kinds of insights.

```typescript
interface LessonsByLevel {
  project: Lesson[]; // Project-specific facts
  task: Lesson[]; // General techniques
  user: Lesson[]; // User behavior patterns
  model: Lesson[]; // Model-specific observations
  tool: Lesson[]; // Tool usage patterns
  skill: Lesson[]; // Skill effectiveness
  subagent: Lesson[]; // Subagent patterns
}

interface Lesson {
  level: LessonLevel;
  summary: string; // One-line summary
  details: string; // Full explanation
  confidence: Confidence;
  tags: string[]; // For filtering
  actionable?: string; // Suggested action to take
}

type LessonLevel =
  | "project" // "In pi-brain, we use SQLite + JSON hybrid storage"
  | "task" // "Async debugging requires explicit logging"
  | "user" // "I should be more specific about scope"
  | "model" // "Claude tends to over-engineer solutions"
  | "tool" // "Edit tool fails with trailing whitespace"
  | "skill" // "RLM skill needs chunking hints for very long files"
  | "subagent"; // "Worker agents need explicit completion criteria"

type Confidence = "high" | "medium" | "low";
```

### Model Observations

Captures model behavior for systematic improvement.

```typescript
interface ModelObservations {
  modelsUsed: ModelUsage[];
  promptingWins: string[]; // Techniques that worked well
  promptingFailures: string[]; // Approaches that failed
  modelQuirks: ModelQuirk[]; // Unexpected behaviors
  toolUseErrors: ToolError[]; // Tool misuse patterns
}

interface ModelUsage {
  provider: string; // "anthropic", "zai", etc.
  model: string; // "gemini-3-flash", "glm-4.7"
  tokensInput: number;
  tokensOutput: number;
  cacheRead?: number;
  cacheWrite?: number;
  cost: number; // USD
}

interface ModelQuirk {
  model: string; // "provider/model" format
  observation: string; // What happened
  frequency: Frequency;
  workaround?: string; // How to avoid/mitigate
  severity: "low" | "medium" | "high";
}

type Frequency = "once" | "sometimes" | "often" | "always";

interface ToolError {
  tool: string; // Tool name
  errorType: string; // Error category
  context: string; // What led to the error
  model: string; // Which model made the error
  wasRetried: boolean; // Did model retry successfully?
}
```

### Metadata

Timing, cost, and analysis tracking.

```typescript
interface NodeMetadata {
  tokensUsed: number; // Total tokens (input + output)
  cost: number; // USD
  durationMinutes: number; // Wall clock time for segment
  timestamp: string; // ISO 8601, when segment started
  analyzedAt: string; // ISO 8601, when analysis completed
  analyzerVersion: string; // Prompt version hash
}
```

### Semantic Data

Tags and topics for discoverability.

```typescript
interface SemanticData {
  tags: string[]; // Specific terms: "jwt", "auth", "sqlite"
  topics: string[]; // Broader concepts: "authentication", "database"
  relatedProjects?: string[]; // Other projects this relates to
  concepts?: string[]; // Technical concepts: "caching", "concurrency"
}
```

### Daemon Meta

Decisions made during analysis (for transparency and feedback).

```typescript
interface DaemonMeta {
  decisions: DaemonDecision[];
  analysisLog?: string; // Path to detailed log file
  rlmUsed: boolean; // Whether RLM skill was needed
  segmentTokenCount?: number; // Approximate tokens in raw segment
}

interface DaemonDecision {
  timestamp: string; // ISO 8601
  decision: string; // What was decided
  reasoning: string; // Why
  needsReview?: boolean; // Flag for user attention
}
```

## Edge Data Structure

### Core Types

```typescript
interface Edge {
  id: string; // UUID
  sourceNodeId: string;
  targetNodeId: string;
  type: EdgeType;
  metadata: EdgeMetadata;
  createdAt: string; // ISO 8601
  createdBy: EdgeCreator;
}

type EdgeType =
  // Structural edges (from session structure)
  | "fork" // Created via /fork command
  | "branch" // Tree navigation with summary
  | "tree_jump" // Tree navigation without summary
  | "resume" // Resumed after idle period
  | "compaction" // Follows a compaction event
  | "continuation" // Same session, next segment

  // Semantic edges (daemon discovers)
  | "semantic" // Related by topic/technique
  | "reference" // References content from another node
  | "lesson_application" // Applies lesson learned elsewhere
  | "failure_pattern" // Same failure mode observed
  | "project_related" // Same project, different sessions
  | "technique_shared"; // Uses same technique

type EdgeCreator = "boundary" | "daemon" | "user";

interface EdgeMetadata {
  summary?: string; // For branch edges: the branch summary
  gapMinutes?: number; // For resume edges: idle duration
  similarity?: number; // For semantic edges: 0.0-1.0
  lessonId?: string; // For lesson_application: which lesson
  patternId?: string; // For failure_pattern: which pattern
}
```

## Boundary Detection

### Boundary Types

| Boundary               | Session Signal                   | Edge Type           | Priority |
| ---------------------- | -------------------------------- | ------------------- | -------- |
| Branch with summary    | `type: 'branch_summary'`         | `branch`            | 1        |
| Branch without summary | `parentId` mismatch              | `tree_jump`         | 2        |
| Compaction             | `type: 'compaction'`             | `compaction`        | 3        |
| Fork                   | New session with `parentSession` | `fork`              | 1        |
| Resume                 | 10+ minute timestamp gap         | `resume`            | 4        |
| Session end            | 10+ minutes idle                 | (triggers analysis) | —        |

### Detection Algorithm

```typescript
interface Boundary {
  type: BoundaryType;
  entryId: string;
  timestamp: string;
  previousEntryId?: string;
  metadata?: Record<string, unknown>;
}

type BoundaryType = "branch" | "tree_jump" | "compaction" | "resume";

interface Segment {
  startEntryId: string;
  endEntryId: string;
  boundaries: Boundary[];
  entryCount: number;
  startTimestamp: string;
  endTimestamp: string;
}

function extractSegments(entries: SessionEntry[]): Segment[] {
  const boundaries = detectBoundaries(entries);
  const segments: Segment[] = [];

  let segmentStart = 0;
  for (const boundary of boundaries) {
    const boundaryIndex = entries.findIndex((e) => e.id === boundary.entryId);

    if (boundaryIndex > segmentStart) {
      segments.push({
        startEntryId: entries[segmentStart].id,
        endEntryId: entries[boundaryIndex - 1].id,
        boundaries: [],
        entryCount: boundaryIndex - segmentStart,
        startTimestamp: entries[segmentStart].timestamp,
        endTimestamp: entries[boundaryIndex - 1].timestamp,
      });
    }

    segmentStart = boundaryIndex;
  }

  // Final segment
  if (segmentStart < entries.length) {
    segments.push({
      startEntryId: entries[segmentStart].id,
      endEntryId: entries[entries.length - 1].id,
      boundaries: [],
      entryCount: entries.length - segmentStart,
      startTimestamp: entries[segmentStart].timestamp,
      endTimestamp: entries[entries.length - 1].timestamp,
    });
  }

  return segments;
}
```

### Detailed Boundary Detection

```typescript
function detectBoundaries(entries: SessionEntry[]): Boundary[] {
  const boundaries: Boundary[] = [];
  let previousEntry: SessionEntry | null = null;
  const leafTracker = new LeafTracker();

  for (const entry of entries) {
    // Skip metadata-only entries
    if (entry.type === "label" || entry.type === "session_info") {
      continue;
    }

    // 1. Branch summary (explicit tree navigation with summary)
    if (entry.type === "branch_summary") {
      const branchEntry = entry as BranchSummaryEntry;
      boundaries.push({
        type: "branch",
        entryId: entry.id,
        timestamp: entry.timestamp,
        previousEntryId: branchEntry.fromId,
        metadata: { summary: branchEntry.summary },
      });
    }

    // 2. Compaction
    else if (entry.type === "compaction") {
      const compactionEntry = entry as CompactionEntry;
      boundaries.push({
        type: "compaction",
        entryId: entry.id,
        timestamp: entry.timestamp,
        metadata: {
          tokensBefore: compactionEntry.tokensBefore,
          tokensAfter: compactionEntry.tokensAfter,
          summary: compactionEntry.summary,
        },
      });
    }

    // 3. Tree jump (parentId doesn't match current leaf)
    else if (entry.type === "message") {
      const currentLeaf = leafTracker.getCurrentLeaf();
      if (currentLeaf && entry.parentId !== currentLeaf) {
        // Verify this isn't just normal branching
        if (previousEntry && entry.parentId !== previousEntry.id) {
          boundaries.push({
            type: "tree_jump",
            entryId: entry.id,
            timestamp: entry.timestamp,
            previousEntryId: currentLeaf,
          });
        }
      }
    }

    // 4. Resume (10+ minute gap)
    if (previousEntry) {
      const gapMs =
        new Date(entry.timestamp).getTime() -
        new Date(previousEntry.timestamp).getTime();
      const gapMinutes = gapMs / (1000 * 60);

      if (gapMinutes >= 10) {
        boundaries.push({
          type: "resume",
          entryId: entry.id,
          timestamp: entry.timestamp,
          previousEntryId: previousEntry.id,
          metadata: { gapMinutes },
        });
      }
    }

    // Update tracking
    previousEntry = entry;
    leafTracker.update(entry);
  }

  return boundaries;
}
```

### Leaf Tracking

```typescript
class LeafTracker {
  private childrenOf = new Map<string, string[]>();
  private latestByTime: string | null = null;

  update(entry: SessionEntry): void {
    // Track parent-child relationships
    if (entry.parentId) {
      const children = this.childrenOf.get(entry.parentId) ?? [];
      children.push(entry.id);
      this.childrenOf.set(entry.parentId, children);
    }

    this.latestByTime = entry.id;
  }

  getCurrentLeaf(): string | null {
    // The leaf is the entry with no children that was most recently added
    // In practice, we track the latest entry that hasn't become a parent
    return this.latestByTime;
  }

  isLeaf(entryId: string): boolean {
    return !this.childrenOf.has(entryId);
  }
}
```

## Versioning

### Why Version Nodes?

Nodes are reanalyzed when:

1. **Prompt improvement**: Better analysis prompt discovers new insights
2. **Connection discovery**: New relationships to other nodes found
3. **User correction**: User provides feedback on analysis
4. **Schema changes**: Data model updates require re-extraction

### Version Lifecycle

```
┌──────────────────────────────────────────────────────────────────────┐
│                        Node Version Lifecycle                        │
└──────────────────────────────────────────────────────────────────────┘

  v1 (initial)           v2 (reanalysis)         v3 (reanalysis)
  ┌────────────┐         ┌────────────┐          ┌────────────┐
  │ node-abc-v1│◀───────┤│ node-abc-v2│◀────────┤│ node-abc-v3│ ← current
  └────────────┘         └────────────┘          └────────────┘
       │                      │                       │
       │ previousVersions:[]  │ previousVersions:     │ previousVersions:
       │                      │   [node-abc-v1]       │   [node-abc-v1,
       │                      │                       │    node-abc-v2]
       ▼                      ▼                       ▼
  ┌────────────┐         ┌────────────┐          ┌────────────┐
  │   JSON     │         │   JSON     │          │   JSON     │
  │  Storage   │         │  Storage   │          │  Storage   │
  └────────────┘         └────────────┘          └────────────┘
```

### Versioning Rules

1. **ID is stable**: A node's ID never changes; only version increments
2. **All versions kept**: Previous versions remain in storage (never deleted)
3. **Edges point to current**: Edges always reference the latest version
4. **Queries default to current**: UI/API shows latest unless history requested
5. **Diff available**: Can compute diff between any two versions

### Version Data Structure

```typescript
interface NodeVersion {
  nodeId: string; // Stable across versions
  version: number; // 1, 2, 3, ...
  previousVersions: string[]; // Full IDs with version suffix
  analyzerVersion: string; // Prompt hash used
  analyzedAt: string;
  triggerReason: VersionTrigger;
}

type VersionTrigger =
  | "initial" // First analysis
  | "prompt_update" // New analyzer prompt
  | "connection_found" // New relationship discovered
  | "user_feedback" // User corrected something
  | "schema_migration"; // Data model changed
```

### Computing Diffs

```typescript
interface NodeDiff {
  nodeId: string;
  fromVersion: number;
  toVersion: number;
  changes: FieldChange[];
}

interface FieldChange {
  path: string; // "content.summary", "lessons.model[0]"
  type: "added" | "removed" | "changed";
  oldValue?: unknown;
  newValue?: unknown;
}

function computeDiff(oldNode: Node, newNode: Node): NodeDiff {
  const changes: FieldChange[] = [];

  // Compare each field recursively
  compareObjects(oldNode, newNode, "", changes);

  return {
    nodeId: newNode.id,
    fromVersion: oldNode.version,
    toVersion: newNode.version,
    changes,
  };
}
```

## Node ID Generation

### Format

Node IDs are 16-character hex strings for uniqueness and readability.
Using 16 characters (64 bits of entropy) ensures collision probability < 0.1% even at 1 billion nodes.

```typescript
function generateNodeId(): string {
  // Use first 16 chars of UUID (64 bits of entropy)
  // Collision probability < 0.1% at 1 billion nodes
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

// Examples: "a1b2c3d4e5f6g7h8", "f9e8d7c6b5a4321f"
```

### Full Node Reference

When referencing a specific version:

```
{nodeId}-v{version}

Examples:
  a1b2c3d4e5f6g7h8-v1    # First version
  a1b2c3d4e5f6g7h8-v3    # Third version (current)
```

### File Naming

```
~/.pi-brain/data/nodes/YYYY/MM/{nodeId}-v{version}.json

Examples:
  ~/.pi-brain/data/nodes/2026/01/a1b2c3d4e5f6g7h8-v1.json
  ~/.pi-brain/data/nodes/2026/01/a1b2c3d4e5f6g7h8-v2.json
```

## Edge Creation

### From Boundaries

When a boundary is detected, create the corresponding edge:

```typescript
function createEdgeFromBoundary(
  boundary: Boundary,
  sourceNodeId: string,
  targetNodeId: string
): Edge {
  const edgeType = boundaryToEdgeType(boundary.type);

  return {
    id: crypto.randomUUID(),
    sourceNodeId,
    targetNodeId,
    type: edgeType,
    metadata: boundary.metadata ?? {},
    createdAt: new Date().toISOString(),
    createdBy: "boundary",
  };
}

function boundaryToEdgeType(boundary: BoundaryType): EdgeType {
  switch (boundary) {
    case "branch":
      return "branch";
    case "tree_jump":
      return "tree_jump";
    case "compaction":
      return "compaction";
    case "resume":
      return "resume";
  }
}
```

### Continuation Edges

For sequential segments in the same session:

```typescript
function createContinuationEdge(
  previousNodeId: string,
  nextNodeId: string
): Edge {
  return {
    id: crypto.randomUUID(),
    sourceNodeId: previousNodeId,
    targetNodeId: nextNodeId,
    type: "continuation",
    metadata: {},
    createdAt: new Date().toISOString(),
    createdBy: "boundary",
  };
}
```

### Fork Edges

When a session has `parentSession`:

```typescript
async function createForkEdge(
  childSession: SessionInfo,
  parentSession: SessionInfo
): Promise<Edge> {
  // Find the node that corresponds to the fork point in parent
  const parentLeafNode = await findNodeByEntryId(
    parentSession.path,
    parentSession.leafId
  );

  // Find the first node in child session
  const childFirstNode = await findFirstNodeInSession(childSession.path);

  return {
    id: crypto.randomUUID(),
    sourceNodeId: parentLeafNode.id,
    targetNodeId: childFirstNode.id,
    type: "fork",
    metadata: {
      parentSession: parentSession.path,
      childSession: childSession.path,
    },
    createdAt: new Date().toISOString(),
    createdBy: "boundary",
  };
}
```

## Example Node

Complete example of an analyzed node:

```json
{
  "id": "a1b2c3d4e5f6g7h8",
  "version": 1,
  "previousVersions": [],

  "source": {
    "sessionFile": "/home/will/.pi/agent/sessions/--home-will-projects-pi-brain--/2026-01-24T10-00-00-000Z_abc123.jsonl",
    "segment": {
      "startEntryId": "e1f2g3h4",
      "endEntryId": "i5j6k7l8",
      "entryCount": 47
    },
    "computer": "desktop",
    "sessionId": "abc123"
  },

  "classification": {
    "type": "coding",
    "project": "/home/will/projects/pi-brain",
    "isNewProject": false,
    "hadClearGoal": true,
    "language": "typescript",
    "frameworks": ["svelte"]
  },

  "content": {
    "summary": "Implemented SQLite storage layer for pi-brain. Created schema for nodes, edges, lessons, and analysis queue.",
    "outcome": "success",
    "keyDecisions": [
      {
        "what": "Used SQLite + JSON hybrid storage",
        "why": "SQLite for indexed queries, JSON for human-readable full content",
        "alternativesConsidered": ["Pure SQLite", "Pure JSON", "PostgreSQL"]
      }
    ],
    "filesTouched": [
      "src/storage/database.ts",
      "src/storage/schema.sql",
      "specs/storage.md"
    ],
    "toolsUsed": ["read", "write", "bash", "edit"],
    "errorsSeen": []
  },

  "lessons": {
    "project": [
      {
        "level": "project",
        "summary": "pi-brain uses SQLite + JSON hybrid storage",
        "details": "SQLite for indexed queries, JSON files for full node content. This allows both fast queries and human-readable data.",
        "confidence": "high",
        "tags": ["storage", "architecture"]
      }
    ],
    "task": [],
    "user": [],
    "model": [],
    "tool": [],
    "skill": [],
    "subagent": []
  },

  "observations": {
    "modelsUsed": [
      {
        "provider": "zai",
        "model": "glm-4.7",
        "tokensInput": 15000,
        "tokensOutput": 3000,
        "cost": 0.0
      }
    ],
    "promptingWins": [
      "Breaking the task into clear phases helped maintain focus"
    ],
    "promptingFailures": [],
    "modelQuirks": [],
    "toolUseErrors": []
  },

  "metadata": {
    "tokensUsed": 18000,
    "cost": 0.0,
    "durationMinutes": 45,
    "timestamp": "2026-01-24T10:00:00.000Z",
    "analyzedAt": "2026-01-24T10:55:00.000Z",
    "analyzerVersion": "v1-abc123"
  },

  "semantic": {
    "tags": ["storage", "sqlite", "database", "architecture"],
    "topics": ["data persistence", "database design"]
  },

  "daemonMeta": {
    "decisions": [
      {
        "timestamp": "2026-01-24T10:50:00.000Z",
        "decision": "Created new 'architecture' tag",
        "reasoning": "This session involves high-level design decisions that warrant a dedicated tag for filtering"
      }
    ],
    "rlmUsed": false,
    "segmentTokenCount": 12000
  }
}
```
