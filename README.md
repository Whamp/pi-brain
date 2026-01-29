# pi-brain

A "second brain" for the [pi coding agent](https://github.com/mariozechner/pi-coding-agent) that analyzes, connects, and learns from every interaction.

## Overview

pi-brain runs in the background to build a knowledge graph from your coding sessions. It helps you:

- **Recall Decisions**: "Why did we choose SQLite over Postgres last month?"
- **Avoid Mistakes**: "What error patterns usually happen with this library?"
- **Learn Quirks**: "How does this model behave with large file edits?"
- **Visualize History**: Interactive graph of all sessions, branches, and forks.
- **Detect Friction**: Automatically identify rephrasing cascades, tool loops, and abandoned tasks.
- **Surface Patterns**: Discover clusters of related work and insights via the News Feed.

## Components

- **Daemon**: Background service that watches session files and analyzes them.
- **Knowledge Graph**: SQLite database storing nodes (decisions, errors, patterns) and edges.
- **Web Dashboard**: SvelteKit app to visualize the graph and track agent performance.
- **Integration**: `brain-query` extension for pi to access the knowledge graph.
- **Signal Detection**: Friction (rephrasing, abandonment, churn) and delight (resilience, one-shot success) analysis.
- **News Feed**: Dashboard panel showing discovered clusters and actionable insights.
- **AGENTS.md Generator**: Creates model-specific guidance files from aggregated learnings.

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
- `/brain --flag` to manually annotate significant moments (friction, breakthrough, insight)
- Natural language queries like: "Have we seen this error before?" (uses `brain_query` tool)

### Model-Specific Guidance

The daemon generates model-specific AGENTS.md files based on aggregated insights:

```bash
# Generate AGENTS.md for a specific model
pi-brain prompt-learning run --model zai/glm-4.7

# Preview what would be generated
pi-brain prompt-learning preview --model zai/glm-4.7
```

Generated files are placed in `~/.pi/agent/contexts/` and automatically loaded by pi when using that model.

## Documentation

- [docs/specs/](docs/specs/) - Detailed system specifications
- [docs/plans/PLAN.md](docs/plans/PLAN.md) - Implementation roadmap
- [extensions/brain-query/](extensions/brain-query/) - Extension documentation

### Key Features

#### AutoMem Integration

The knowledge graph implements AutoMem-style memory management with typed relationships and lifecycle processing:

**Typed Relationships (11 Edge Types):**
The analyzer extracts semantic connections between nodes:

- `LEADS_TO` - Causal links (problem → solution)
- `PREFERS_OVER` - User preferences (chose A over B)
- `CONTRADICTS` / `REINFORCES` - Conflicts and supporting evidence
- `DERIVED_FROM` / `EVOLVED_INTO` - Source tracking and evolution
- `EXEMPLIFIES` - Pattern examples
- `PART_OF` - Hierarchical grouping
- `RELATES_TO`, `OCCURRED_BEFORE`, `INVALIDATED_BY` - General, temporal, and deprecation links

**Sleep Cycle Processing:**
Scheduled consolidation runs manage the knowledge graph lifecycle:

- **Daily Decay** - Updates relevance scores using age, access patterns, and relationship density
- **Weekly Creative** - Connects similar unlinked nodes via vector similarity
- **Monthly Cluster** - Groups dense embeddings into Meta-Nodes
- **Quarterly Forget** - Archives low-relevance nodes

**Hybrid Search:**
Searches combine nine weighted signals: vector similarity, keyword matching, graph centrality, content overlap, temporal proximity, tags, importance, and recency.

**Bridge Discovery:**
Multi-hop traversal returns explanatory paths (source → bridge → target) instead of isolated results.

#### Signals Detection (Phase 11)

Automatic detection of friction and delight patterns in coding sessions:

**Friction Signals:**

- Rephrasing cascades (3+ consecutive user clarifications)
- Tool loops (same error 3+ times)
- Context churn (excessive file exploration)
- Abandoned restarts (task abandoned then resumed)

**Delight Signals:**

- Resilient recovery (success after initial failures)
- One-shot success (complex task completed without iteration)
- Explicit praise (user satisfaction detected)

#### News Feed

The web dashboard includes a News Feed panel that surfaces:

- Discovered clusters of related work (via embedding similarity)
- Friction patterns requiring attention
- Model-specific insights

Users can confirm or dismiss patterns to refine future analysis.

#### Nightly Processing

The daemon runs scheduled jobs at configured times:

- **2am**: Reanalysis of sessions with outdated prompts
- **4am**: Facet discovery (clustering pipeline with embeddings)

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
