# Pi Dashboard Extension

A Pi extension that provides a live, browser-based visualization of session trees with real-time updates.

## Features

- **Real-time session tree visualization** - See messages, tool calls, compactions, and branch points
- **Live updates** - Watch messages stream in as the agent works
- **Navigate tree** - Click nodes to view details, navigate to different points
- **Fork from any entry** - Create new branches from any user message
- **Agent status** - See when the agent is streaming, compacting, or idle

## Installation

### Option 1: Symlink to pi extensions directory

```bash
ln -s /path/to/pi-tree-viz/extensions/dashboard ~/.pi/agent/extensions/dashboard
```

### Option 2: Copy to pi extensions directory

```bash
cp -r /path/to/pi-tree-viz/extensions/dashboard ~/.pi/agent/extensions/
```

## Usage

1. Start pi normally
2. Use the `/dashboard` command to open the visualization in your browser
3. The dashboard will open at `http://localhost:8765`

### Commands

- `/dashboard` - Open dashboard in browser (default port 8765)
- `/dashboard 9000` - Open dashboard on custom port
- `/dashboard-nav <entryId> [summarize]` - Navigate to specific entry
- `/dashboard-fork <entryId>` - Fork from specific entry

## How It Works

The extension starts an HTTP + WebSocket server when you run `/dashboard`:

1. **HTTP server** - Serves the web UI files
2. **WebSocket server** - Streams real-time session updates to the browser

### WebSocket Events (Server → Client)

- `session_state` - Full session state (entries, branch, leaf, streaming status)
- `entry_added` - New entry added to session
- `leaf_changed` - Current leaf changed (navigation)
- `agent_status` - Agent streaming/compacting status

### WebSocket Commands (Client → Server)

- `get_state` - Request current session state
- `navigate` - Navigate to entry (requires entryId, optional summarize)
- `fork` - Fork from entry (requires entryId)
- `switch_session` - Switch to different session
- `list_sessions` - List available sessions

## Development

The web UI is vanilla JavaScript with no build step required:

- `web/index.html` - Main HTML structure
- `web/styles.css` - CSS styles (dark theme)
- `web/app.js` - JavaScript application

Server components:

- `index.ts` - Pi extension entry point
- `server.ts` - HTTP + WebSocket server

## Node Type Colors

- 🔵 Blue - User messages
- 🟢 Green - Assistant messages
- 🟠 Orange - Tool results
- 🟣 Purple - Compaction entries
- 🟡 Yellow - Branch summaries / branch points
- ⚫ Gray - Model/thinking changes
