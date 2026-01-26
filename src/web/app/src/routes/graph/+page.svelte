<script lang="ts">
  import Graph from "$lib/components/graph.svelte";
  import { nodesStore, selectedNode } from "$lib/stores/nodes";
  import type { Node, NodeFilters, NodeType } from "$lib/types";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { parseDate, formatDateShort } from "$lib/utils/date";

  // Filters state
  let projectFilter = "";
  let typeFilter: NodeType | "" = "";
  let dateRangeFilter = "7"; // days
  let depth = 2;

  // Load connected graph from a node, or list nodes if no selection
  async function loadGraph(): Promise<void> {
    const nodeId = $nodesStore.selectedNodeId;

    if (nodeId) {
      await nodesStore.loadConnected(nodeId, depth);
      return;
    }
    // Load recent nodes when no selection
    const filters: NodeFilters = {};
    if (projectFilter) {
      filters.project = projectFilter;
    }
    if (typeFilter) {
      filters.type = typeFilter;
    }
    if (dateRangeFilter) {
      const from = new Date();
      from.setDate(from.getDate() - Number.parseInt(dateRangeFilter, 10));
      filters.from = from.toISOString();
    }
    await nodesStore.loadNodes(filters, { limit: 100 });
  }

  async function handleNodeClick(nodeId: string, _node: Node): Promise<void> {
    nodesStore.selectNode(nodeId);
    await loadGraph();
  }

  async function handleNodeDoubleClick(
    nodeId: string,
    _node: Node
  ): Promise<void> {
    await goto(`/nodes/${nodeId}`);
  }

  async function handleFilterChange(): Promise<void> {
    nodesStore.selectNode(null);
    await loadGraph();
  }

  async function handleDepthChange(): Promise<void> {
    if ($nodesStore.selectedNodeId) {
      await loadGraph();
    }
  }

  async function clearSelection(): Promise<void> {
    nodesStore.selectNode(null);
    await loadGraph();
  }

  onMount(() => {
    loadGraph();
  });
</script>

<svelte:head>
  <title>Graph - pi-brain</title>
  <meta
    name="description"
    content="Interactive knowledge graph visualization"
  />
</svelte:head>

<div class="graph-page">
  <header class="page-header">
    <div class="header-left">
      <h1>Knowledge Graph</h1>
      {#if $selectedNode}
        <button class="btn-secondary btn-sm" onclick={clearSelection}>
          ← Show all
        </button>
      {/if}
    </div>
  </header>

  <div class="graph-layout">
    <div class="graph-main" class:has-error={$nodesStore.error}>
      <Graph
        nodes={$nodesStore.nodes}
        edges={$nodesStore.edges}
        selectedNodeId={$nodesStore.selectedNodeId}
        onNodeClick={handleNodeClick}
        onNodeDoubleClick={handleNodeDoubleClick}
      />

      {#if $nodesStore.loading}
        <div class="loading-overlay" role="status" aria-live="polite">
          <div class="loading-spinner"></div>
          <span>Loading graph...</span>
        </div>
      {/if}

      {#if $nodesStore.error}
        <div class="error-banner" role="alert">
          <span>⚠️ {$nodesStore.error}</span>
          <button class="btn-ghost btn-sm" onclick={loadGraph}>Retry</button>
        </div>
      {/if}
    </div>

    <aside class="graph-sidebar">
      <section class="filters-section">
        <h2>Filters</h2>

        <div class="filter-group">
          <label for="project-filter">Project</label>
          <input
            type="text"
            id="project-filter"
            bind:value={projectFilter}
            onchange={handleFilterChange}
            placeholder="Filter by project..."
          />
        </div>

        <div class="filter-group">
          <label for="type-filter">Type</label>
          <select
            id="type-filter"
            bind:value={typeFilter}
            onchange={handleFilterChange}
          >
            <option value="">All types</option>
            <option value="coding">Coding</option>
            <option value="debugging">Debugging</option>
            <option value="refactor">Refactor</option>
            <option value="planning">Planning</option>
            <option value="research">Research</option>
            <option value="sysadmin">Sysadmin</option>
            <option value="documentation">Documentation</option>
            <option value="qa">QA</option>
            <option value="brainstorm">Brainstorm</option>
            <option value="configuration">Configuration</option>
            <option value="handoff">Handoff</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div class="filter-group">
          <label for="date-filter">Date range</label>
          <select
            id="date-filter"
            bind:value={dateRangeFilter}
            onchange={handleFilterChange}
          >
            <option value="1">Today</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="">All time</option>
          </select>
        </div>

        <div class="filter-group">
          <label for="depth-control">Graph depth</label>
          <input
            type="range"
            id="depth-control"
            min="1"
            max="5"
            bind:value={depth}
            onchange={handleDepthChange}
          />
          <span class="depth-value">{depth} hop{depth > 1 ? "s" : ""}</span>
        </div>
      </section>

      {#if $selectedNode}
        <section class="selected-node-section">
          <h2>Selected Node</h2>
          <div class="node-preview" class:loading={$nodesStore.loading}>
            {#if $nodesStore.loading}
              <div class="preview-loading-overlay">
                <div class="loading-spinner-small"></div>
              </div>
            {/if}
            <div class="node-type" data-type={$selectedNode.classification.type}>
              {$selectedNode.classification.type}
            </div>
            <h3 class="node-summary">{$selectedNode.content.summary}</h3>
            <p class="node-project">
              {$selectedNode.classification.project.split("/").pop()}
            </p>
            <div class="node-meta">
              <span class="outcome" data-outcome={$selectedNode.content.outcome}>
                {$selectedNode.content.outcome}
              </span>
              <span class="date">
                {formatDateShort(parseDate($selectedNode.metadata.timestamp))}
              </span>
            </div>
            {#if $selectedNode.semantic.tags.length > 0}
              <div class="node-tags">
                {#each $selectedNode.semantic.tags.slice(0, 5) as tag}
                  <span class="tag">{tag}</span>
                {/each}
              </div>
            {/if}
            <a href="/nodes/{$selectedNode.id}" class="btn-primary view-details">
              View Details →
            </a>
          </div>
        </section>
      {/if}

      <section class="legend-section">
        <h2>Legend</h2>
        <div class="legend-items">
          <div class="legend-group">
            <h3>Node Types</h3>
            <div class="legend-item">
              <span
                class="legend-dot"
                style="background: var(--color-node-coding)"
              ></span>
              Coding
            </div>
            <div class="legend-item">
              <span
                class="legend-dot"
                style="background: var(--color-node-debugging)"
              ></span>
              Debugging
            </div>
            <div class="legend-item">
              <span
                class="legend-dot"
                style="background: var(--color-node-refactoring)"
              ></span>
              Refactor
            </div>
            <div class="legend-item">
              <span
                class="legend-dot"
                style="background: var(--color-node-planning)"
              ></span>
              Planning
            </div>
            <div class="legend-item">
              <span
                class="legend-dot"
                style="background: var(--color-node-research)"
              ></span>
              Research
            </div>
          </div>
        </div>
      </section>

      <section class="stats-section">
        <h2>Graph Stats</h2>
        <div class="stats-grid">
          <div class="stat">
            <span class="stat-value">{$nodesStore.nodes.length}</span>
            <span class="stat-label">Nodes</span>
          </div>
          <div class="stat">
            <span class="stat-value">{$nodesStore.edges.length}</span>
            <span class="stat-label">Edges</span>
          </div>
        </div>
      </section>
    </aside>
  </div>
</div>

<style>
  .graph-page {
    height: calc(100vh - var(--space-12));
    display: flex;
    flex-direction: column;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-4);
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: var(--space-4);
  }

  .page-header h1 {
    font-size: var(--text-2xl);
  }

  .btn-sm {
    padding: var(--space-1) var(--space-3);
    font-size: var(--text-sm);
  }

  .graph-layout {
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 300px;
    gap: var(--space-4);
    min-height: 0;
  }

  .graph-main {
    position: relative;
    min-height: 400px;
  }

  .graph-main.has-error {
    pointer-events: none;
    opacity: 0.5;
  }

  .graph-main.has-error::after {
    content: "";
    position: absolute;
    inset: 0;
    background: var(--color-bg);
    opacity: 0.3;
    z-index: 1;
  }

  .loading-overlay {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    color: var(--color-text-muted);
    background: var(--color-bg-elevated);
    padding: var(--space-4);
    border-radius: var(--radius-md);
  }

  .loading-spinner {
    width: 24px;
    height: 24px;
    border: 2px solid var(--color-border);
    border-top-color: var(--color-accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .error-banner {
    position: absolute;
    top: var(--space-4);
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-2) var(--space-4);
    background: var(--color-error);
    color: white;
    border-radius: var(--radius-md);
  }

  .graph-sidebar {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    overflow-y: auto;
  }

  .graph-sidebar section {
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-4);
  }

  .graph-sidebar h2 {
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: var(--space-3);
  }

  .filter-group {
    margin-bottom: var(--space-3);
  }

  .filter-group:last-child {
    margin-bottom: 0;
  }

  .filter-group label {
    display: block;
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    margin-bottom: var(--space-1);
  }

  .filter-group input[type="text"],
  .filter-group select {
    width: 100%;
  }

  .filter-group input[type="range"] {
    width: 100%;
    accent-color: var(--color-accent);
  }

  .depth-value {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }

  /* Selected node preview */
  .node-preview {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    position: relative;
  }

  .node-preview.loading {
    opacity: 0.6;
    pointer-events: none;
  }

  .preview-loading-overlay {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 1;
  }

  .loading-spinner-small {
    width: 20px;
    height: 20px;
    border: 2px solid var(--color-border);
    border-top-color: var(--color-accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .node-type {
    display: inline-block;
    padding: 2px 8px;
    font-size: var(--text-xs);
    text-transform: uppercase;
    border-radius: var(--radius-sm);
    background: var(--color-accent-muted);
    color: var(--color-accent);
    width: fit-content;
  }

  .node-summary {
    font-size: var(--text-base);
    font-weight: 500;
    line-height: 1.4;
  }

  .node-project {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    margin: 0;
  }

  .node-meta {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-sm);
  }

  .outcome {
    padding: 2px 6px;
    border-radius: var(--radius-sm);
    font-size: var(--text-xs);
    text-transform: uppercase;
  }

  .outcome[data-outcome="success"] {
    background: var(--color-success);
    color: white;
  }

  .outcome[data-outcome="partial"] {
    background: var(--color-warning);
    color: black;
  }

  .outcome[data-outcome="failed"] {
    background: var(--color-error);
    color: white;
  }

  .outcome[data-outcome="abandoned"] {
    background: var(--color-text-subtle);
    color: white;
  }

  .date {
    color: var(--color-text-subtle);
  }

  .node-tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
  }

  .view-details {
    margin-top: var(--space-2);
    text-align: center;
    display: block;
    padding: var(--space-2);
    border-radius: var(--radius-md);
  }

  /* Legend */
  .legend-group h3 {
    font-size: var(--text-xs);
    color: var(--color-text-subtle);
    margin-bottom: var(--space-2);
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    margin-bottom: var(--space-1);
  }

  .legend-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  /* Stats */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-3);
  }

  .stat {
    text-align: center;
  }

  .stat-value {
    display: block;
    font-size: var(--text-xl);
    font-weight: 600;
    color: var(--color-text);
  }

  .stat-label {
    font-size: var(--text-xs);
    color: var(--color-text-subtle);
  }

  /* Responsive */
  @media (max-width: 1024px) {
    .graph-layout {
      grid-template-columns: 1fr;
    }

    .graph-sidebar {
      display: none;
    }
  }
</style>
