# Implementation Plan

## Overview

Build a browser-based visualization tool for pi coding agent sessions in two phases:

1. **Phase 1**: Static HTML generator (CLI tool)
2. **Phase 2**: Live dashboard (Pi extension with web server)

## Phase 1: Static Visualizer

### Goal

Create `pi-tree-viz` CLI tool that scans session files and generates an interactive HTML visualization.

### Architecture

```
src/
├── types.ts          # TypeScript interfaces for session data
├── parser.ts         # JSONL parser and tree builder
├── analyzer.ts       # Session analysis (forks, stats)
├── generator.ts      # HTML/JS generation
├── cli.ts            # CLI entry point
└── index.ts          # Library exports

templates/
├── index.html        # Main HTML template
├── styles.css        # Visualization styles
└── app.js            # D3.js visualization code

dist/                 # Built output
```

### Components

#### 1. Types (`src/types.ts`)

```typescript
// Mirror pi's session types
interface SessionHeader {
  type: 'session';
  version: number;
  id: string;
  timestamp: string;
  cwd: string;
  parentSession?: string;
}

interface SessionEntry {
  type: string;
  id: string;
  parentId: string | null;
  timestamp: string;
  // ... type-specific fields
}

// Visualization types
interface SessionInfo {
  path: string;
  header: SessionHeader;
  entries: SessionEntry[];
  tree: TreeNode;
  stats: SessionStats;
}

interface TreeNode {
  entry: SessionEntry;
  children: TreeNode[];
  depth: number;
  isLeaf: boolean;
  isBranchPoint: boolean;
}

interface SessionStats {
  entryCount: number;
  messageCount: number;
  compactionCount: number;
  branchPoints: number;
  tokenUsage: number;
  cost: number;
}

interface ForkRelationship {
  parent: string;  // session path
  child: string;   // session path
}
```

#### 2. Parser (`src/parser.ts`)

```typescript
// Parse single session file
function parseSession(filePath: string): SessionInfo

// Build tree from entries
function buildTree(entries: SessionEntry[]): TreeNode

// Find current leaf (latest entry with no children)
function findLeaf(entries: SessionEntry[]): string | null

// Detect branch points
function findBranchPoints(entries: SessionEntry[]): string[]
```

#### 3. Analyzer (`src/analyzer.ts`)

```typescript
// Scan session directory
function scanSessions(sessionDir: string): SessionInfo[]

// Find fork relationships across sessions
function findForkRelationships(sessions: SessionInfo[]): ForkRelationship[]

// Calculate session statistics
function calculateStats(session: SessionInfo): SessionStats

// Group sessions by project (cwd)
function groupByProject(sessions: SessionInfo[]): Map<string, SessionInfo[]>
```

#### 4. Generator (`src/generator.ts`)

```typescript
// Generate complete HTML file
function generateHTML(sessions: SessionInfo[], forks: ForkRelationship[]): string

// Embed data as JSON for browser
function embedData(sessions: SessionInfo[], forks: ForkRelationship[]): string

// Bundle CSS and JS
function bundleAssets(): { css: string; js: string }
```

#### 5. CLI (`src/cli.ts`)

```typescript
// Command-line interface
// pi-tree-viz [options]
//   --output, -o    Output HTML file (default: pi-sessions.html)
//   --session-dir   Session directory (default: ~/.pi/agent/sessions)
//   --watch, -w     Watch for changes and regenerate
//   --open          Open in browser after generation
//   --project       Filter to specific project path
```

### Visualization Features

#### Session Browser (Left Sidebar)
- List all sessions grouped by project
- Show: timestamp, first message preview, entry count
- Filter by project, date range
- Search across session content
- Fork indicators (parent/child icons)

#### Tree View (Main Panel)
- Interactive D3.js tree visualization
- Node types with distinct colors:
  - User messages: blue
  - Assistant messages: green
  - Tool results: orange
  - Compaction: purple
  - Branch summary: yellow
  - Model/thinking change: gray
- Collapsible subtrees
- Highlight path to current leaf
- Branch point markers
- Zoom and pan

#### Entry Details (Right Panel)
- Full entry content on click
- Message text with syntax highlighting
- Tool call details
- Token usage and cost
- Timestamp and metadata

#### Fork Graph (Optional View)
- Cross-session relationship graph
- Click to switch sessions
- Show parent → child connections

### Technology Stack

- **Build**: TypeScript + esbuild
- **Visualization**: D3.js v7
- **Styling**: Plain CSS with CSS variables
- **No framework**: Vanilla JS for simplicity

### Deliverables

1. `pi-tree-viz` npm package
2. CLI binary via `npx pi-tree-viz`
3. Self-contained HTML output (no external dependencies)

---

## Phase 2: Live Dashboard

### Goal

Pi extension that provides real-time session visualization with navigation capabilities.

### Architecture

```
extensions/dashboard/
├── index.ts          # Pi extension entry point
├── server.ts         # HTTP + WebSocket server
├── rpc-bridge.ts     # Bridge to pi's RPC commands
└── web/
    ├── index.html
    ├── app.tsx       # React/Svelte app
    ├── components/
    └── styles.css
```

### Extension Features

#### Command: `/dashboard`
- Starts local server on port 8765 (configurable)
- Opens browser to `http://localhost:8765`
- Shows notification with URL

#### Real-time Updates
- WebSocket connection for live events
- Stream new messages as they arrive
- Update tree visualization in real-time
- Show current agent status (streaming, compacting)

#### Navigation Actions
- Click node → Navigate to that point (calls pi's tree navigation)
- "Fork from here" button → Create fork
- "Switch session" → Load different session
- "New session" → Start fresh

#### Search
- Full-text search across all sessions
- Filter by entry type, date, project
- Jump to specific entry

### API Design

#### WebSocket Events (Server → Client)

```typescript
// Session state
{ type: 'session_state', data: SessionInfo }

// New entry added
{ type: 'entry_added', data: SessionEntry }

// Leaf changed (navigation)
{ type: 'leaf_changed', data: { oldLeafId: string, newLeafId: string } }

// Agent status
{ type: 'agent_status', data: { isStreaming: boolean, isCompacting: boolean } }
```

#### WebSocket Commands (Client → Server)

```typescript
// Navigate to entry
{ type: 'navigate', entryId: string, summarize: boolean }

// Fork from entry
{ type: 'fork', entryId: string }

// Switch session
{ type: 'switch_session', sessionPath: string }

// Get all sessions
{ type: 'list_sessions' }
```

### Deliverables

1. Pi extension package
2. Integration with Phase 1 visualization
3. Real-time updates via WebSocket
4. Navigation/fork capabilities

---

## Implementation Timeline

### Phase 1 (2-3 days)

**Day 1: Core Parser**
- [ ] Set up project structure (TypeScript, esbuild)
- [ ] Implement types.ts
- [ ] Implement parser.ts
- [ ] Basic tests with real session files

**Day 2: Analysis & Generation**
- [ ] Implement analyzer.ts (scan, forks, stats)
- [ ] Create HTML template
- [ ] Basic D3.js tree visualization
- [ ] Implement generator.ts

**Day 3: Polish & CLI**
- [ ] Implement cli.ts with all options
- [ ] Add session browser sidebar
- [ ] Add entry details panel
- [ ] Search functionality
- [ ] Package and publish

### Phase 2 (3-4 days)

**Day 4: Extension Setup**
- [ ] Pi extension boilerplate
- [ ] HTTP server with static file serving
- [ ] WebSocket server setup

**Day 5: RPC Bridge**
- [ ] Connect to pi's session events
- [ ] Implement navigation commands
- [ ] Implement fork/switch commands

**Day 6-7: Web App**
- [ ] Port Phase 1 visualization to React/Svelte
- [ ] Add real-time updates
- [ ] Add action buttons
- [ ] Polish and test

---

## Open Questions

1. **Permissions**: Should navigation from browser require confirmation in pi?
2. **Multiple windows**: How to handle multiple browser tabs?
3. **Large sessions**: Should we paginate or virtualize very large trees?
4. **Fork graph**: Is cross-session visualization needed in Phase 1?
5. **Export**: Should we support exporting selected paths as markdown?

---

## Success Criteria

### Phase 1
- [ ] Can visualize any session with correct tree structure
- [ ] Branch points clearly visible
- [ ] Current leaf highlighted
- [ ] Entry details readable
- [ ] Works with sessions of 1000+ entries
- [ ] Self-contained HTML (no external deps)

### Phase 2
- [ ] Real-time message streaming works
- [ ] Can navigate to any point from browser
- [ ] Fork creation works
- [ ] Session switching works
- [ ] Stable WebSocket connection
