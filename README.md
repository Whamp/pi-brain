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
git clone https://github.com/Whamp/pi-brain.git
cd pi-brain

# Install dependencies
npm install

# Build everything
npm run build

# Link CLI globally
npm link
```

### Dependencies

pi-brain uses the following key dependencies:

- **better-sqlite3**: High-performance SQLite bindings for Node.js
- **sqlite-vec**: Vector similarity search extension for semantic queries

The `sqlite-vec` extension is installed automatically via npm and provides native vector search capabilities. Supported platforms:

- Linux (x64, arm64)
- macOS (x64, arm64)
- Windows (x64)

No additional configuration is needed - the extension loads automatically when the database opens.

## Quick Start: Launching the UI

To explore the pi-brain experience and visualize your knowledge graph:

1. **Build the project** (if not already built):

   ```bash
   npm run build
   ```

2. **Start the background daemon**:

   ```bash
   node dist/src/daemon/daemon-process.js --force
   ```

3. **Start the Web UI**:
   ```bash
   npm run web:dev
   ```
   Open **[http://localhost:5173/](http://localhost:5173/)** in your browser.

---

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

## Configuration

pi-brain is configured via `~/.pi-brain/config.yaml`.

```yaml
daemon:
  # LLM for session analysis
  provider: anthropic
  model: claude-3-5-sonnet-20240620

  # Semantic Search (Vector embeddings)
  embedding_provider: openrouter # options: openrouter, ollama, openai
  embedding_model: qwen/qwen3-embedding-8b
  embedding_api_key: sk-or-v1-...
  embedding_dimensions: 4096
  semantic_search_threshold: 0.5 # 0.0 to 1.0 (lower = stricter)
```

### Semantic Search

pi-brain uses `sqlite-vec` to enable semantic queries. Instead of just keyword matching, it finds sessions with similar meanings.

- **Threshold**: Control how strict the semantic matching is. If no semantic results are found within the threshold, it falls back to keyword search (FTS).
- **Models**: We recommend `qwen/qwen3-embedding-8b` (4096 dimensions) for high-quality semantic understanding.
- **Local Search**: Set `embedding_provider: ollama` and `embedding_model: nomic-embed-text` for fully local vector search.

If you change your embedding model, you should re-index your knowledge graph:

```bash
pi-brain rebuild --embeddings
```

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
