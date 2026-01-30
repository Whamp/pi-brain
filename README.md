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

pi-brain can be configured via the **Web UI Settings** page or by editing `~/.pi-brain/config.yaml` directly.

### Web UI Settings

Access all configuration options through the web dashboard at **Settings** (gear icon). The settings are organized into tabs:

| Tab            | Description                                                           |
| -------------- | --------------------------------------------------------------------- |
| **Daemon**     | AI model for session analysis, worker count, timeouts, retry logic    |
| **Embeddings** | Vector embedding provider (Ollama/OpenAI/OpenRouter), model, API keys |
| **Schedules**  | Cron schedules for background tasks (reanalysis, clustering, etc.)    |
| **Query**      | AI model used for `/brain` queries                                    |
| **API Server** | Port, host, and CORS configuration                                    |
| **Hub**        | Session and database directory paths                                  |
| **Spokes**     | Multi-computer sync via rsync or Syncthing                            |

All settings changes require a daemon restart to take effect (except spokes, which apply immediately).

### Configuration File

The config file is located at `~/.pi-brain/config.yaml`:

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

  # Analysis behavior
  idle_timeout_minutes: 10 # Wait before analyzing idle sessions
  parallel_workers: 2 # Concurrent analysis workers
  max_retries: 3 # Retry failed analysis jobs
  retry_delay_seconds: 60 # Delay between retries
  analysis_timeout_minutes: 10 # Timeout per job
  max_concurrent_analysis: 2 # Concurrent LLM API calls

query:
  # LLM for /brain queries (can differ from daemon)
  provider: anthropic
  model: claude-3-5-sonnet-20240620

api:
  port: 8765
  host: localhost
  cors_origins:
    - http://localhost:5173

hub:
  sessions_dir: ~/.pi/agent/sessions
  database_dir: ~/.pi-brain/data
  web_ui_port: 5173

# Multi-computer sync
spokes:
  - name: laptop
    sync_method: syncthing
    path: /data/laptop-sessions
    enabled: true
  - name: server
    sync_method: rsync
    path: /data/server-sessions
    source: user@server:~/.pi/sessions
    schedule: "0 */6 * * *"
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

# Generate API documentation for agents
npm run docs:agent
```

### API Documentation

This project uses [API Extractor](https://api-extractor.com/) to generate structured API documentation optimized for AI agents:

```bash
# Generate agent-friendly JSON docs
npm run docs:agent

# Query the API (e.g., find functions related to "session")
npm run docs:query -- --query="session"

# Watch mode - regenerate on changes
npm run docs:watch
```

See [docs/API-DOCUMENTATION.md](docs/API-DOCUMENTATION.md) for details.

## License

MIT
