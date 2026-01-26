# pi-brain

A "second brain" for the [pi coding agent](https://github.com/mariozechner/pi-coding-agent) that analyzes, connects, and learns from every interaction.

## Overview

pi-brain runs in the background to build a knowledge graph from your coding sessions. It helps you:

- **Recall Decisions**: "Why did we choose SQLite over Postgres last month?"
- **Avoid Mistakes**: "What error patterns usually happen with this library?"
- **Learn Quirks**: "How does this model behave with large file edits?"
- **Visualize History**: Interactive graph of all sessions, branches, and forks.

## Components

- **Daemon**: Background service that watches session files and analyzes them.
- **Knowledge Graph**: SQLite database storing nodes (decisions, errors, patterns) and edges.
- **Web Dashboard**: SvelteKit app to visualize the graph and track agent performance.
- **Integration**: `brain-query` extension for pi to access the knowledge graph.

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/pi-brain.git
cd pi-brain

# Install dependencies
npm install

# Build everything
npm run build

# Link CLI globally
npm link
```

## Usage

### Daemon

Control the background analysis service:

```bash
# Start the daemon
pi-brain daemon start

# Check status
pi-brain daemon status

# Stop daemon
pi-brain daemon stop
```

### Visualization

Generate a standalone HTML visualization of your sessions (legacy feature):

```bash
pi-brain viz --open
```

### Pi Integration

Install the `brain-query` extension to let your agent access the brain:

```bash
# Link the extension to your pi agent
ln -s $(pwd)/extensions/brain-query ~/.pi/agent/extensions/brain-query
```

Then in pi, you can use:

- `/brain` command to see status
- Natural language queries like: "Have we seen this error before?" (uses `brain_query` tool)

## Documentation

- [docs/specs/](docs/specs/) - Detailed system specifications
- [docs/PLAN.md](docs/PLAN.md) - Implementation roadmap
- [extensions/brain-query/](extensions/brain-query/) - Extension documentation

## Development

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm test

# Run linter/formatter
npm run check
```

## License

MIT
