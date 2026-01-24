# pi-tree-viz

Interactive browser-based visualization for [pi coding agent](https://github.com/mariozechner/pi-coding-agent) session trees, branches, and forks.

## Overview

Pi sessions are stored as JSONL files with a tree structure. This tool parses session files and generates interactive visualizations to help you:

- **Explore session history** across all projects
- **Visualize branching** when you use `/tree` to navigate back
- **Track fork relationships** between sessions created via `/fork`
- **Understand compaction** and how context is summarized
- **Search across sessions** for specific content

## Status

🚧 **Work in Progress**

See [docs/RESEARCH.md](docs/RESEARCH.md) for detailed research on pi's session format.
See [docs/PLAN.md](docs/PLAN.md) for the implementation roadmap.

## Planned Features

### Phase 1: Static Visualizer
- CLI tool that generates interactive HTML
- Tree visualization with D3.js
- Session browser with filtering
- Entry details and search

### Phase 2: Live Dashboard  
- Pi extension with `/dashboard` command
- Real-time session updates via WebSocket
- Navigate, fork, and switch sessions from browser

## Installation

```bash
# Coming soon
npm install -g pi-tree-viz
```

## Usage

```bash
# Generate visualization for default session directory
pi-tree-viz

# Specify output file
pi-tree-viz --output ./my-sessions.html

# Watch for changes
pi-tree-viz --watch

# Custom session directory
pi-tree-viz --session-dir ~/.pi/agent/sessions
```

## License

MIT
