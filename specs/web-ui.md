# Web UI

Frontend architecture, components, graph visualization, and user interface design.

## Overview

The web UI provides:

- **Dashboard** — Key metrics, trends, recent activity
- **Graph View** — Interactive node-link visualization
- **Node Detail** — Full node information with lessons and connections
- **Search** — Full-text and structured search
- **Session Browser** — File-based navigation
- **Settings** — Configuration and daemon control

## Technology Stack

| Layer     | Technology                  | Rationale                       |
| --------- | --------------------------- | ------------------------------- |
| Framework | SvelteKit                   | Fast, simple, SSR, small bundle |
| Styling   | Vanilla CSS + CSS Variables | Maximum control, themeable      |
| Graph     | D3.js                       | Industry standard, flexible     |
| Charts    | Chart.js or D3              | Dashboard metrics               |
| Icons     | Lucide                      | Clean, consistent               |
| HTTP      | fetch (built-in)            | No extra deps                   |
| WebSocket | Native WebSocket            | Real-time updates               |

## Project Structure

```
src/web/
├── routes/
│   ├── +layout.svelte         # Main layout with nav
│   ├── +page.svelte           # Dashboard
│   ├── graph/
│   │   └── +page.svelte       # Graph visualization
│   ├── nodes/
│   │   ├── +page.svelte       # Node list
│   │   └── [id]/
│   │       └── +page.svelte   # Node detail
│   ├── search/
│   │   └── +page.svelte       # Search
│   ├── sessions/
│   │   └── +page.svelte       # Session browser
│   └── settings/
│       └── +page.svelte       # Settings
├── lib/
│   ├── components/
│   │   ├── Graph.svelte       # D3 graph component
│   │   ├── NodeCard.svelte    # Node summary card
│   │   ├── LessonList.svelte  # Lessons display
│   │   ├── TagCloud.svelte    # Tag visualization
│   │   └── ...
│   ├── stores/
│   │   ├── nodes.ts           # Node data store
│   │   ├── daemon.ts          # Daemon status store
│   │   └── websocket.ts       # WebSocket connection
│   └── api/
│       └── client.ts          # API client
├── app.css                    # Global styles
└── app.html                   # HTML template
```

## Design System

### Colors

```css
:root {
  /* Base colors */
  --color-bg: #0a0a0b;
  --color-bg-elevated: #141417;
  --color-bg-hover: #1c1c21;
  --color-border: #27272a;
  --color-border-subtle: #1f1f23;

  /* Text */
  --color-text: #fafafa;
  --color-text-muted: #a1a1aa;
  --color-text-subtle: #71717a;

  /* Accent */
  --color-accent: #3b82f6;
  --color-accent-hover: #2563eb;
  --color-accent-muted: #3b82f620;

  /* Status */
  --color-success: #22c55e;
  --color-warning: #eab308;
  --color-error: #ef4444;
  --color-info: #3b82f6;

  /* Node types (for graph) */
  --color-node-coding: #3b82f6;
  --color-node-debugging: #ef4444;
  --color-node-refactoring: #8b5cf6;
  --color-node-sysadmin: #22c55e;
  --color-node-research: #eab308;
  --color-node-planning: #06b6d4;
  --color-node-other: #71717a;

  /* Edge types */
  --color-edge-fork: #22c55e;
  --color-edge-branch: #3b82f6;
  --color-edge-resume: #eab308;
  --color-edge-semantic: #8b5cf6;
}
```

### Typography

```css
:root {
  --font-sans: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: "JetBrains Mono", "Fira Code", monospace;

  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --text-3xl: 1.875rem;
}
```

### Spacing

```css
:root {
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-12: 3rem;
}
```

## Page Layouts

### Dashboard

The dashboard is the primary landing page, showing key metrics and actionable insights.

**Key Panels (in priority order):**

1. **Quick Stats** — Total nodes, this week's activity, tokens, cost
2. **Tool Errors by Model** — Table showing model, tool, error type, count (click to drill down)
3. **Vague Goal Tracker** — Chart showing `hadClearGoal: false` percentage over time with trend indicator
4. **Failure Pattern Analysis** — Grouped failure modes with learning opportunities
5. **Recent Activity** — Latest analyzed nodes with outcome indicators
6. **Daemon Status** — Running state, queue depth, next scheduled job
7. **Daemon Decisions** — Key decisions made by daemon that need user review/feedback

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  pi-brain                                    [Search...]  [⚙]                  │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Total Nodes  │  │  This Week   │  │ Total Tokens │  │  Total Cost  │       │
│  │    847       │  │     42       │  │    2.5M      │  │   $12.45     │       │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                                                │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐     │
│  │ Tool Errors by Model            │  │ Vague Goal Tracker              │     │
│  │ ┌───────┬──────┬───────┬─────┐  │  │ hadClearGoal: false             │     │
│  │ │ Model │ Tool │ Error │ Cnt │  │  │                                 │     │
│  │ ├───────┼──────┼───────┼─────┤  │  │    ╭─╮         This week: 15%   │     │
│  │ │ claude│ edit │ match │  47 │  │  │   ╭╯ ╰╮    ╭╮  Last week: 22%   │     │
│  │ │ claude│ read │ sed   │  15 │  │  │  ╭╯   ╰╮  ╭╯╰╮ ▼ Improving!     │     │
│  │ │ glm   │ bash │ tmout │  12 │  │  │ ─╯     ╰──╯  ╰─                 │     │
│  │ │ gemini│ edit │ scope │   8 │  │  │  W1  W2  W3  W4                 │     │
│  │ │       [View all →]        │  │  │                                 │     │
│  │ └───────┴──────┴───────┴─────┘  │  │  [View sessions →]              │     │
│  └─────────────────────────────────┘  └─────────────────────────────────┘     │
│                                                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐      │
│  │ Failure Pattern Analysis                              [View all →]  │      │
│  │                                                                      │      │
│  │ ┌──────────────────────────────────────────────────────────────┐    │      │
│  │ │ 🔴 Edit exact match failures                    47 occurrences│    │      │
│  │ │    Models: claude-sonnet (35), glm-4.7 (12)                   │    │      │
│  │ │    Learning: Read file before editing to get exact text       │    │      │
│  │ └──────────────────────────────────────────────────────────────┘    │      │
│  │ ┌──────────────────────────────────────────────────────────────┐    │      │
│  │ │ 🟡 Bash timeout on long operations              12 occurrences│    │      │
│  │ │    Models: glm-4.7 (8), gemini (4)                            │    │      │
│  │ │    Learning: Use tmux skill for long-running processes        │    │      │
│  │ └──────────────────────────────────────────────────────────────┘    │      │
│  └─────────────────────────────────────────────────────────────────────┘      │
│                                                                                │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐     │
│  │ Recent Activity                 │  │ Daemon Status                   │     │
│  │ ┌───────────────────────────┐   │  │                                 │     │
│  │ │ 🟢 Implemented auth...    │   │  │ Status: Running                 │     │
│  │ │    pi-brain • 10m ago     │   │  │ Queue: 12 pending               │     │
│  │ ├───────────────────────────┤   │  │ Workers: 1/2 active             │     │
│  │ │ 🟡 Debugging connection...│   │  │                                 │     │
│  │ │    webapp • 2h ago        │   │  │ Last: 5 min ago                 │     │
│  │ └───────────────────────────┘   │  │ Next nightly: 2:00 AM           │     │
│  └─────────────────────────────────┘  └─────────────────────────────────┘     │
│                                                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐      │
│  │ Daemon Decisions (needs review)                                     │      │
│  │ ┌───────────────────────────────────────────────────────────────┐   │      │
│  │ │ Created new 'architecture' tag                           [👍][👎]│   │      │
│  │ │ Reasoning: Session involves high-level design decisions...   │   │      │
│  │ └───────────────────────────────────────────────────────────────┘   │      │
│  └─────────────────────────────────────────────────────────────────────┘      │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

### Graph View

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  pi-brain                                    [Search...]  [⚙]                  │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  ┌─────────────────────────────────────────────────────┐  ┌─────────────────┐ │
│  │                                                      │  │ Filters         │ │
│  │         ●───────●───────●                           │  │                 │ │
│  │         │       │       │                           │  │ Project:        │ │
│  │         │       │       ●───●                       │  │ [All        ▾]  │ │
│  │         │       │           │                       │  │                 │ │
│  │     ●───●       ●───────●───●                       │  │ Type:           │ │
│  │     │               │                               │  │ [All        ▾]  │ │
│  │     ●───────────────●                               │  │                 │ │
│  │                     │                               │  │ Date:           │ │
│  │                     ●                               │  │ [Last 7 days ▾] │ │
│  │                                                      │  │                 │ │
│  │  [−] [+] [⟲]                          [Tree] [Force] │  │ Tags:           │ │
│  └─────────────────────────────────────────────────────┘  │ [auth] [sqlite] │ │
│                                                           │                 │ │
│  ┌─────────────────────────────────────────────────────┐  │ Edge Types:     │ │
│  │ Selected: a1b2c3d4                                  │  │ ☑ fork          │ │
│  │ Implemented SQLite storage layer for pi-brain       │  │ ☑ branch        │ │
│  │ Project: pi-brain • Type: coding • Success          │  │ ☑ resume        │ │
│  │                                                      │  │ ☐ semantic      │ │
│  │ Tags: storage, sqlite, database                      │  │                 │ │
│  │                                          [View →]    │  └─────────────────┘ │
│  └─────────────────────────────────────────────────────┘                       │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

### Node Detail

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  pi-brain                                    [Search...]  [⚙]                  │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  ← Back to Graph                                                               │
│                                                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐      │
│  │ Implemented SQLite storage layer                                     │      │
│  │                                                                      │      │
│  │ Project: /home/will/projects/pi-brain                               │      │
│  │ Type: coding • Outcome: success • Version: 2                        │      │
│  │ Date: Jan 24, 2026 at 10:00 AM • Duration: 45 min                   │      │
│  │ Tokens: 18,000 • Cost: $0.00                                        │      │
│  │                                                                      │      │
│  │ Tags: [storage] [sqlite] [database] [architecture]                  │      │
│  └─────────────────────────────────────────────────────────────────────┘      │
│                                                                                │
│  ┌───────────────────────────────────┐  ┌───────────────────────────────────┐ │
│  │ Summary                           │  │ Key Decisions                     │ │
│  │                                   │  │                                   │ │
│  │ Implemented SQLite storage layer  │  │ ▼ Used SQLite + JSON hybrid      │ │
│  │ for pi-brain. Created schema for  │  │   Why: SQLite for queries, JSON  │ │
│  │ nodes, edges, lessons, and        │  │   for human-readable content     │ │
│  │ analysis queue.                   │  │   Also considered: Pure SQLite,  │ │
│  │                                   │  │   Pure JSON, PostgreSQL          │ │
│  └───────────────────────────────────┘  └───────────────────────────────────┘ │
│                                                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐      │
│  │ Lessons                                                   [By Level ▾]│      │
│  │                                                                      │      │
│  │ 📁 Project                                                          │      │
│  │ ┌────────────────────────────────────────────────────────────────┐  │      │
│  │ │ pi-brain uses SQLite + JSON hybrid storage                     │  │      │
│  │ │ SQLite for indexed queries, JSON files for full node content.  │  │      │
│  │ │ Confidence: high • Tags: storage, architecture                 │  │      │
│  │ └────────────────────────────────────────────────────────────────┘  │      │
│  │                                                                      │      │
│  │ 🔧 Tool                                                              │      │
│  │ (none)                                                               │      │
│  └─────────────────────────────────────────────────────────────────────┘      │
│                                                                                │
│  ┌───────────────────────────────────┐  ┌───────────────────────────────────┐ │
│  │ Connected Nodes                   │  │ Files Touched                     │ │
│  │                                   │  │                                   │ │
│  │ ← b2c3d4e5 (branch)              │  │ src/storage/database.ts           │ │
│  │   "Set up project structure..."  │  │ src/storage/schema.sql            │ │
│  │                                   │  │ specs/storage.md                  │ │
│  │ → c3d4e5f6 (continuation)        │  │                                   │ │
│  │   "Implemented node parsing..."  │  │                                   │ │
│  └───────────────────────────────────┘  └───────────────────────────────────┘ │
│                                                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐      │
│  │ Version History                                             [v2 ▾]  │      │
│  │                                                                      │      │
│  │ v2 - Jan 25, 2026 02:00 AM (current)                                │      │
│  │   Trigger: prompt_update • +1 lesson                                │      │
│  │                                                                      │      │
│  │ v1 - Jan 24, 2026 10:55 AM                                          │      │
│  │   Initial analysis                                                  │      │
│  └─────────────────────────────────────────────────────────────────────┘      │
│                                                                                │
│  [View Raw Session]                                                            │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

## Components

### Graph Component

D3.js force-directed graph with customizations and proper typing.

```typescript
// Type definitions for D3 graph
import type { SimulationNodeDatum, SimulationLinkDatum } from "d3";

interface GraphNode extends SimulationNodeDatum {
  id: string;
  classification: {
    type: string;
    project: string;
  };
  content: {
    summary: string;
  };
  // D3 adds: x, y, vx, vy, fx, fy
}

interface GraphEdge extends SimulationLinkDatum<GraphNode> {
  id: string;
  type: EdgeType;
  // D3 uses: source, target (can be string or node ref)
}
```

```svelte
<!-- lib/components/Graph.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as d3 from 'd3';
  import type { Node, Edge } from '$lib/types';

  export let nodes: Node[] = [];
  export let edges: Edge[] = [];
  export let selectedNodeId: string | null = null;
  export let layout: 'force' | 'tree' = 'force';

  let container: HTMLDivElement;
  let svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  let simulation: d3.Simulation<Node, Edge>;

  function initGraph() {
    const width = container.clientWidth;
    const height = container.clientHeight;

    svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .call(d3.zoom().on('zoom', zoomed));

    // Arrow marker for edges
    svg.append('defs')
      .append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .append('path')
      .attr('d', 'M 0,-5 L 10,0 L 0,5')
      .attr('fill', 'var(--color-border)');

    const g = svg.append('g');

    // Edges
    const edgeGroup = g.append('g').attr('class', 'edges');

    // Nodes
    const nodeGroup = g.append('g').attr('class', 'nodes');

    // Force simulation
    simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(edges).id(d => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .on('tick', ticked);
  }

  function updateGraph() {
    // Update edges
    const edge = svg.select('.edges')
      .selectAll('line')
      .data(edges, d => d.id);

    edge.enter()
      .append('line')
      .attr('stroke', d => getEdgeColor(d.type))
      .attr('stroke-width', 2)
      .attr('marker-end', 'url(#arrowhead)');

    edge.exit().remove();

    // Update nodes
    const node = svg.select('.nodes')
      .selectAll('g')
      .data(nodes, d => d.id);

    const nodeEnter = node.enter()
      .append('g')
      .attr('class', 'node')
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    nodeEnter.append('circle')
      .attr('r', 12)
      .attr('fill', d => getNodeColor(d.classification.type));

    nodeEnter.append('text')
      .attr('dx', 18)
      .attr('dy', 4)
      .text(d => truncate(d.content.summary, 30));

    node.exit().remove();

    simulation.nodes(nodes);
    simulation.force('link').links(edges);
    simulation.alpha(0.3).restart();
  }

  function getNodeColor(type: string): string {
    const colors = {
      coding: 'var(--color-node-coding)',
      debugging: 'var(--color-node-debugging)',
      refactoring: 'var(--color-node-refactoring)',
      // ...
    };
    return colors[type] ?? 'var(--color-node-other)';
  }

  function getEdgeColor(type: string): string {
    const colors = {
      fork: 'var(--color-edge-fork)',
      branch: 'var(--color-edge-branch)',
      // ...
    };
    return colors[type] ?? 'var(--color-border)';
  }

  onMount(initGraph);

  $: if (nodes && edges && svg) updateGraph();
</script>

<div class="graph-container" bind:this={container}>
  <div class="controls">
    <button on:click={zoomIn}>+</button>
    <button on:click={zoomOut}>−</button>
    <button on:click={resetZoom}>⟲</button>
  </div>
</div>

<style>
  .graph-container {
    width: 100%;
    height: 100%;
    position: relative;
    background: var(--color-bg);
    border-radius: 8px;
    overflow: hidden;
  }

  .controls {
    position: absolute;
    bottom: 16px;
    left: 16px;
    display: flex;
    gap: 4px;
  }

  :global(.node circle) {
    cursor: pointer;
    transition: transform 0.15s ease;
  }

  :global(.node:hover circle) {
    transform: scale(1.2);
  }

  :global(.node.selected circle) {
    stroke: var(--color-accent);
    stroke-width: 3px;
  }

  :global(.node text) {
    font-size: 12px;
    fill: var(--color-text-muted);
    pointer-events: none;
  }
</style>
```

### Node Card Component

```svelte
<!-- lib/components/NodeCard.svelte -->
<script lang="ts">
  import type { Node } from '$lib/types';
  import { formatRelative } from '$lib/utils/date';

  export let node: Node;
  export let compact = false;

  function getOutcomeIcon(outcome: string): string {
    switch (outcome) {
      case 'success': return '🟢';
      case 'partial': return '🟡';
      case 'failed': return '🔴';
      case 'abandoned': return '⚪';
      default: return '⚪';
    }
  }
</script>

<a href="/nodes/{node.id}" class="node-card" class:compact>
  <div class="header">
    <span class="outcome">{getOutcomeIcon(node.content.outcome)}</span>
    <span class="summary">{node.content.summary}</span>
  </div>

  {#if !compact}
    <div class="meta">
      <span class="project">{node.classification.project.split('/').pop()}</span>
      <span class="separator">•</span>
      <span class="type">{node.classification.type}</span>
      <span class="separator">•</span>
      <span class="time">{formatRelative(node.metadata.timestamp)}</span>
    </div>

    <div class="tags">
      {#each node.semantic.tags.slice(0, 5) as tag}
        <span class="tag">{tag}</span>
      {/each}
    </div>
  {/if}
</a>

<style>
  .node-card {
    display: block;
    padding: var(--space-4);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    text-decoration: none;
    color: inherit;
    transition: border-color 0.15s ease, background 0.15s ease;
  }

  .node-card:hover {
    border-color: var(--color-accent);
    background: var(--color-bg-hover);
  }

  .header {
    display: flex;
    align-items: flex-start;
    gap: var(--space-2);
  }

  .outcome {
    flex-shrink: 0;
  }

  .summary {
    font-weight: 500;
    line-height: 1.4;
  }

  .meta {
    margin-top: var(--space-2);
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }

  .separator {
    margin: 0 var(--space-1);
    color: var(--color-text-subtle);
  }

  .tags {
    margin-top: var(--space-2);
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
  }

  .tag {
    padding: 2px 8px;
    background: var(--color-accent-muted);
    color: var(--color-accent);
    border-radius: 4px;
    font-size: var(--text-xs);
  }

  .compact {
    padding: var(--space-3);
  }

  .compact .summary {
    font-size: var(--text-sm);
  }
</style>
```

### Lesson List Component

```svelte
<!-- lib/components/LessonList.svelte -->
<script lang="ts">
  import type { LessonsByLevel } from '$lib/types';

  export let lessons: LessonsByLevel;
  export let groupBy: 'level' | 'confidence' = 'level';

  const levelIcons = {
    project: '📁',
    task: '📋',
    user: '👤',
    model: '🤖',
    tool: '🔧',
    skill: '⚡',
    subagent: '🔀',
  };

  const levelLabels = {
    project: 'Project',
    task: 'Task',
    user: 'User',
    model: 'Model',
    tool: 'Tool',
    skill: 'Skill',
    subagent: 'Subagent',
  };

  $: allLessons = Object.entries(lessons).flatMap(([level, items]) =>
    items.map(lesson => ({ ...lesson, level }))
  );

  $: groupedLessons = groupBy === 'level'
    ? lessons
    : groupByConfidence(allLessons);
</script>

<div class="lesson-list">
  {#each Object.entries(groupedLessons) as [group, items]}
    {#if items.length > 0}
      <div class="group">
        <h3 class="group-header">
          <span class="icon">{levelIcons[group] ?? '📌'}</span>
          {levelLabels[group] ?? group}
          <span class="count">({items.length})</span>
        </h3>

        <div class="lessons">
          {#each items as lesson}
            <div class="lesson" data-confidence={lesson.confidence}>
              <div class="summary">{lesson.summary}</div>

              {#if lesson.details}
                <div class="details">{lesson.details}</div>
              {/if}

              <div class="meta">
                <span class="confidence" data-level={lesson.confidence}>
                  {lesson.confidence}
                </span>

                {#if lesson.tags?.length}
                  <div class="tags">
                    {#each lesson.tags as tag}
                      <span class="tag">{tag}</span>
                    {/each}
                  </div>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  {/each}
</div>

<style>
  .group {
    margin-bottom: var(--space-6);
  }

  .group-header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--color-text-muted);
    margin-bottom: var(--space-3);
  }

  .count {
    font-weight: 400;
    color: var(--color-text-subtle);
  }

  .lesson {
    padding: var(--space-3);
    background: var(--color-bg);
    border: 1px solid var(--color-border-subtle);
    border-radius: 6px;
    margin-bottom: var(--space-2);
  }

  .summary {
    font-weight: 500;
    margin-bottom: var(--space-1);
  }

  .details {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    line-height: 1.5;
    margin-bottom: var(--space-2);
  }

  .meta {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .confidence {
    font-size: var(--text-xs);
    padding: 2px 6px;
    border-radius: 4px;
    text-transform: uppercase;
    font-weight: 500;
  }

  .confidence[data-level="high"] {
    background: var(--color-success);
    color: white;
  }

  .confidence[data-level="medium"] {
    background: var(--color-warning);
    color: black;
  }

  .confidence[data-level="low"] {
    background: var(--color-text-subtle);
    color: white;
  }

  .tags {
    display: flex;
    gap: var(--space-1);
  }

  .tag {
    font-size: var(--text-xs);
    color: var(--color-text-subtle);
  }

  .tag::before {
    content: '#';
  }
</style>
```

## State Management

### Svelte Stores

```typescript
// lib/stores/nodes.ts
import { writable, derived } from "svelte/store";
import type { Node, Edge } from "$lib/types";
import { api } from "$lib/api/client";

interface NodesState {
  nodes: Node[];
  edges: Edge[];
  loading: boolean;
  error: string | null;
  selectedNodeId: string | null;
  filters: NodeFilters;
}

const initialState: NodesState = {
  nodes: [],
  edges: [],
  loading: false,
  error: null,
  selectedNodeId: null,
  filters: {},
};

function createNodesStore() {
  const { subscribe, set, update } = writable<NodesState>(initialState);

  return {
    subscribe,

    async loadNodes(filters?: NodeFilters) {
      update((s) => ({ ...s, loading: true, error: null }));

      try {
        const response = await api.listNodes(filters);
        update((s) => ({
          ...s,
          nodes: response.data.nodes,
          loading: false,
        }));
      } catch (error) {
        update((s) => ({
          ...s,
          loading: false,
          error: error.message,
        }));
      }
    },

    async loadConnected(nodeId: string, depth = 1) {
      const response = await api.getConnectedNodes(nodeId, depth);
      update((s) => ({
        ...s,
        nodes: response.data.nodes,
        edges: response.data.edges,
      }));
    },

    selectNode(nodeId: string | null) {
      update((s) => ({ ...s, selectedNodeId: nodeId }));
    },

    setFilters(filters: NodeFilters) {
      update((s) => ({ ...s, filters }));
    },
  };
}

export const nodesStore = createNodesStore();

// Derived stores
export const selectedNode = derived(
  nodesStore,
  ($store) => $store.nodes.find((n) => n.id === $store.selectedNodeId) ?? null
);
```

### WebSocket Store

```typescript
// lib/stores/websocket.ts
import { writable } from "svelte/store";

interface WSState {
  connected: boolean;
  reconnecting: boolean;
}

function createWebSocketStore() {
  const { subscribe, set, update } = writable<WSState>({
    connected: false,
    reconnecting: false,
  });

  let ws: WebSocket | null = null;
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  let reconnectAttempts = 0;

  const MAX_RECONNECT_DELAY = 60000; // 1 minute max
  const BASE_DELAY = 1000; // 1 second base

  function getReconnectDelay(): number {
    // Exponential backoff with jitter
    const exponentialDelay = BASE_DELAY * Math.pow(2, reconnectAttempts);
    const jitter = Math.random() * 1000; // 0-1 second jitter
    return Math.min(exponentialDelay + jitter, MAX_RECONNECT_DELAY);
  }

  function connect() {
    ws = new WebSocket("ws://localhost:8765/ws");

    ws.onopen = () => {
      reconnectAttempts = 0; // Reset on successful connection
      set({ connected: true, reconnecting: false });
      ws?.send(
        JSON.stringify({
          type: "subscribe",
          channels: ["daemon", "analysis", "node"],
        })
      );
    };

    ws.onclose = (event) => {
      set({ connected: false, reconnecting: true });

      // Don't reconnect if closed intentionally
      if (event.code === 1000) return;

      scheduleReconnect();
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleMessage(data);
    };
  }

  function handleMessage(msg: any) {
    switch (msg.type) {
      case "analysis.completed":
        // Trigger node list refresh
        nodesStore.loadNodes();
        break;
      case "daemon.status":
        daemonStore.setStatus(msg.data);
        break;
    }
  }

  function scheduleReconnect() {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
    }

    const delay = getReconnectDelay();
    reconnectAttempts++;

    console.log(
      `Reconnecting in ${Math.round(delay / 1000)}s (attempt ${reconnectAttempts})`
    );

    reconnectTimeout = setTimeout(connect, delay);
  }

  function disconnect() {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
    }
    reconnectAttempts = 0;
    ws?.close(1000); // Normal closure
  }

  return {
    subscribe,
    connect,
    disconnect,
  };
}

export const wsStore = createWebSocketStore();
```

## API Client

```typescript
// lib/api/client.ts
const BASE_URL = "http://localhost:8765/api/v1";

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: T }> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const json = await response.json();

  if (json.status === "error") {
    throw new Error(json.error.message);
  }

  return json;
}

export const api = {
  // Nodes
  listNodes: (filters?: NodeFilters) =>
    request<{ nodes: Node[]; total: number }>(`/nodes?${toQuery(filters)}`),

  getNode: (id: string, options?: { include?: string[] }) =>
    request<{ node: Node }>(`/nodes/${id}?${toQuery(options)}`),

  getConnectedNodes: (id: string, depth = 1) =>
    request<{ nodes: Node[]; edges: Edge[] }>(
      `/nodes/${id}/connected?depth=${depth}`
    ),

  // Search
  search: (query: string, filters?: NodeFilters) =>
    request<{ results: SearchResult[] }>(
      `/search?q=${encodeURIComponent(query)}&${toQuery(filters)}`
    ),

  // Query
  query: (query: string) =>
    request<{ answer: string; relatedNodes: Node[] }>("/query", {
      method: "POST",
      body: JSON.stringify({ query }),
    }),

  // Stats
  getStats: () => request<DashboardStats>("/stats"),

  // Daemon
  getDaemonStatus: () => request<DaemonStatus>("/daemon/status"),
};
```

## Responsive Design

```css
/* Mobile-first breakpoints */
@media (min-width: 640px) {
  /* sm */
}

@media (min-width: 768px) {
  /* md */
}

@media (min-width: 1024px) {
  /* lg */
}

@media (min-width: 1280px) {
  /* xl */
}

/* Example: Dashboard grid */
.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-4);
}

@media (min-width: 768px) {
  .dashboard-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .dashboard-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
```

## Accessibility

### Keyboard Navigation

- Tab through all interactive elements
- Enter/Space to activate buttons and links
- Escape to close modals and dropdowns
- Arrow keys for graph navigation

### ARIA Labels

```svelte
<button
  aria-label="Zoom in"
  aria-pressed={zoomed}
  on:click={zoomIn}
>
  +
</button>

<nav aria-label="Main navigation">
  <a href="/" aria-current={$page.url.pathname === '/' ? 'page' : undefined}>
    Dashboard
  </a>
</nav>
```

### Color Contrast

All text meets WCAG AA contrast requirements:

- Normal text: 4.5:1 minimum
- Large text: 3:1 minimum

### Screen Reader Support

```svelte
<div role="status" aria-live="polite">
  {#if $nodesStore.loading}
    Loading nodes...
  {/if}
</div>

<table role="grid" aria-label="Tool errors by model">
  <caption class="sr-only">Tool errors grouped by model and tool</caption>
  ...
</table>
```

## Dashboard Panel Details

### Vague Goal Tracker

The `hadClearGoal` field is set by the session analyzer based on user prompting quality.

**Detection Criteria:**

A session is marked `hadClearGoal: false` when:

- User's first message is vague ("improve this", "fix it", "update the code")
- Significant clarification was needed before work could begin
- No specific outcome was defined
- User said things like "just explore" or "brainstorm" without focus

**Calculation:**

```typescript
interface VagueGoalStats {
  thisWeek: number; // Percentage of sessions with hadClearGoal: false
  lastWeek: number;
  change: number; // Positive = improvement (fewer vague goals)
  trend: "improving" | "worsening" | "stable";
}

async function getVagueGoalStats(): Promise<VagueGoalStats> {
  const thisWeek = await db.get(`
    SELECT 
      COUNT(*) FILTER (WHERE had_clear_goal = 0) * 100.0 / COUNT(*) as pct
    FROM nodes
    WHERE timestamp > datetime('now', '-7 days')
  `);

  const lastWeek = await db.get(`
    SELECT 
      COUNT(*) FILTER (WHERE had_clear_goal = 0) * 100.0 / COUNT(*) as pct
    FROM nodes
    WHERE timestamp BETWEEN datetime('now', '-14 days') AND datetime('now', '-7 days')
  `);

  const change = lastWeek.pct - thisWeek.pct; // Positive = improvement

  return {
    thisWeek: thisWeek.pct,
    lastWeek: lastWeek.pct,
    change,
    trend: change > 2 ? "improving" : change < -2 ? "worsening" : "stable",
  };
}
```

**Display:**

- Line chart showing weekly trend
- Current week percentage prominently displayed
- Trend indicator (▲ improving, ▼ worsening)
- Click to view sessions without clear goals

### Failure Pattern Analysis

Groups similar failures across all sessions to identify learning opportunities.

**Data Source:**

```typescript
interface FailurePattern {
  id: string;
  pattern: string; // Normalized description
  occurrences: number;
  models: string[]; // Which models exhibited this
  tools: string[]; // Which tools were involved
  exampleNodes: string[]; // Sample node IDs
  learningOpportunity: string; // Suggested improvement
  lastSeen: string;
}

async function getFailurePatterns(): Promise<FailurePattern[]> {
  return db.all(`
    SELECT * FROM failure_patterns
    ORDER BY occurrences DESC
    LIMIT 10
  `);
}
```

**Pattern Aggregation (Nightly Job):**

```typescript
async function aggregateFailurePatterns(): Promise<void> {
  // Group tool errors by normalized pattern
  await db.run(`
    INSERT OR REPLACE INTO failure_patterns (
      id, pattern, occurrences, models, tools, example_nodes, last_seen, learning_opportunity
    )
    SELECT 
      'pattern-' || hex(randomblob(4)) as id,
      error_type as pattern,
      COUNT(*) as occurrences,
      json_group_array(DISTINCT model) as models,
      json_group_array(DISTINCT tool) as tools,
      json_group_array(node_id) as example_nodes,
      MAX(created_at) as last_seen,
      CASE error_type
        WHEN 'exact_match_failed' THEN 'Read file before editing to verify exact text'
        WHEN 'timeout' THEN 'Use tmux skill for long-running processes'
        WHEN 'file_not_found' THEN 'Check file exists before reading/editing'
        ELSE 'Review examples for common causes'
      END as learning_opportunity
    FROM tool_errors
    GROUP BY error_type
    HAVING COUNT(*) >= 3
  `);
}
```

**Display:**

- Cards showing pattern, count, affected models
- Learning opportunity prominently displayed
- Expand to see example sessions
- Track if pattern is decreasing over time

### Daemon Decisions Log

Shows autonomous decisions made by the daemon that may need user review.

**Data Source:**

From `daemon_decisions` table, filtered to `needsReview: true`.

**Feedback Mechanism:**

```typescript
interface DaemonDecisionFeedback {
  decisionId: string;
  approved: boolean;
  userComment?: string;
}

async function submitFeedback(feedback: DaemonDecisionFeedback): Promise<void> {
  await db.run(
    `
    UPDATE daemon_decisions
    SET user_feedback = ?,
        needs_review = FALSE
    WHERE id = ?
  `,
    [
      JSON.stringify({
        approved: feedback.approved,
        comment: feedback.userComment,
      }),
      feedback.decisionId,
    ]
  );

  // If disapproved, potentially trigger reanalysis with guidance
  if (!feedback.approved) {
    await queueReanalysisWithFeedback(feedback);
  }
}
```

**Display:**

- Decision text with reasoning
- 👍/👎 buttons for quick feedback
- Optional comment field
- Dismiss once reviewed
