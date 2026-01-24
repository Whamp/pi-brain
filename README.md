# pi-tree-viz

Interactive browser-based visualization for [pi coding agent](https://github.com/mariozechner/pi-coding-agent) session trees, branches, and forks.

## Overview

Pi sessions are stored as JSONL files with a tree structure. This tool parses session files and generates interactive visualizations to help you:

- **Explore session history** across all projects
- **Visualize branching** when you use `/tree` to navigate back
- **Track fork relationships** between sessions created via `/fork`
- **Understand compaction** and how context is summarized
- **Search across sessions** for specific content

## Features

### Phase 1: Static Visualizer ✅

CLI tool that generates a self-contained HTML file with an interactive visualization:

```bash
# Install globally
npm install -g pi-tree-viz

# Generate visualization
pi-tree-viz

# Specify output file
pi-tree-viz --output ./my-sessions.html

# Filter to specific project
pi-tree-viz --project ~/my-project

# Open in browser after generation
pi-tree-viz --open
```

### Phase 2: Live Dashboard ✅

Pi extension with real-time session visualization:

```bash
# Install the extension
ln -s /path/to/pi-tree-viz/extensions/dashboard ~/.pi/agent/extensions/dashboard

# Or copy it
cp -r /path/to/pi-tree-viz/extensions/dashboard ~/.pi/agent/extensions/

# Then in pi, use:
/dashboard
```

See [extensions/dashboard/README.md](extensions/dashboard/README.md) for full documentation.

## Installation

```bash
# CLI tool
npm install -g pi-tree-viz

# Extension (symlink to your pi extensions)
cd ~/.pi/agent/extensions
ln -s /path/to/pi-tree-viz/extensions/dashboard
```

## Documentation

- [docs/RESEARCH.md](docs/RESEARCH.md) - Detailed research on pi's session format
- [docs/PLAN.md](docs/PLAN.md) - Implementation roadmap
- [extensions/dashboard/README.md](extensions/dashboard/README.md) - Live dashboard extension

## Development

```bash
# Install dependencies
npm install

# Build CLI
npm run build

# Watch mode
npm run dev

# Install extension dependencies
cd extensions/dashboard && npm install
```

## License

MIT
