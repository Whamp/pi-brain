<script lang="ts">
  import Graph from "$lib/components/graph.svelte";
  import Spinner from "$lib/components/spinner.svelte";
  import GettingStarted from "$lib/components/getting-started.svelte";
  import GraphControlsSheet from "$lib/components/graph-controls-sheet.svelte";
  import { nodesStore, selectedNode } from "$lib/stores/nodes";
  import type { Node, NodeFilters, NodeType } from "$lib/types";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { parseDate, formatDateShort } from "$lib/utils/date";
  import Tag from "$lib/components/tag.svelte";

  // Legend data - all node types with their colors and labels
  const legendItems: { type: NodeType; label: string; color: string }[] = [
    { type: "coding", label: "Coding", color: "var(--color-node-coding)" },
    { type: "debugging", label: "Debugging", color: "var(--color-node-debugging)" },
    { type: "refactoring", label: "Refactor", color: "var(--color-node-refactor)" },
    { type: "planning", label: "Planning", color: "var(--color-node-planning)" },
    { type: "research", label: "Research", color: "var(--color-node-research)" },
    { type: "sysadmin", label: "Sysadmin", color: "var(--color-node-sysadmin)" },
    { type: "brainstorm", label: "Brainstorm", color: "var(--color-node-brainstorm)" },
    { type: "documentation", label: "Documentation", color: "var(--color-node-documentation)" },
    { type: "configuration", label: "Configuration", color: "var(--color-node-configuration)" },
    { type: "qa", label: "QA", color: "var(--color-node-qa)" },
    { type: "handoff", label: "Handoff", color: "var(--color-node-handoff)" },
    { type: "other", label: "Other", color: "var(--color-node-other)" },
  ];
  
  // Legend collapsed state
  let legendCollapsed = $state(false);

  // Filters state
  let projectFilter = $state("");
  let typeFilter = $state<NodeType | "">("");
  let dateRangeFilter = $state("7"); // days
  let depth = $state(2);
  
  // Track if initial load has completed (to distinguish fresh state from filtered)
  let hasLoadedOnce = $state(false);
  
  // Derived: are we showing the "getting started" guide?
  const showGettingStarted = $derived(
    hasLoadedOnce && 
    !$nodesStore.loading && 
    !$nodesStore.error && 
    $nodesStore.nodes.length === 0 && 
    !projectFilter && 
    !typeFilter
  );

  // Load connected graph from a node, or list nodes if no selection
  async function loadGraph(): Promise<void> {
    const nodeId = $nodesStore.selectedNodeId;

    if (nodeId) {
      await nodesStore.loadConnected(nodeId, depth);
      hasLoadedOnce = true;
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

    // Try progressively wider date ranges if empty and no specific date filter set by user
    // (If user manually changed the filter, respect it)
    const dateRanges = ["7", "30", "90", ""]; // 7 days, 30 days, 90 days, all time

    // If this is a manual filter change, only use the selected range
    const rangesToTry = (dateRangeFilter === "7" && !projectFilter && !typeFilter) 
      ? dateRanges 
      : [dateRangeFilter];

    for (const range of rangesToTry) {
      if (range) {
        const from = new Date();
        from.setDate(from.getDate() - Number.parseInt(range, 10));
        filters.from = from.toISOString();
      } else {
        delete filters.from;
      }

      await nodesStore.loadNodes(filters, { limit: 100 });

      // If we got results, update the UI filter to match and stop
      if ($nodesStore.nodes.length > 0) {
        if (dateRangeFilter !== (range || "")) {
          dateRangeFilter = range || "";
        }
        break;
      }

      // If we tried everything and still empty, we're done
      if (range === "") {break;}
    }

    hasLoadedOnce = true;
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

  // Handlers for mobile controls sheet
  async function handleMobileProjectChange(value: string): Promise<void> {
    projectFilter = value;
    await handleFilterChange();
  }

  async function handleMobileTypeChange(value: NodeType | ""): Promise<void> {
    typeFilter = value;
    await handleFilterChange();
  }

  async function handleMobileDateChange(value: string): Promise<void> {
    dateRangeFilter = value;
    await handleFilterChange();
  }

  async function handleMobileDepthChange(value: number): Promise<void> {
    depth = value;
    await handleDepthChange();
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

<div class="graph-page page-animate">
  {#if showGettingStarted}
    <header class="page-header animate-in">
      <div class="header-left">
        <h1 class="page-title">Knowledge Graph</h1>
      </div>
    </header>
    <div class="getting-started-container animate-in stagger-2">
      <GettingStarted variant="graph" />
    </div>
  {:else}
  <header class="page-header animate-in">
    <div class="header-left">
      <h1 class="page-title">Knowledge Graph</h1>
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
        <Spinner size="md" message="Loading graph..." />
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
                <Spinner size={20} />
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
                  <Tag text={tag} variant="auto" />
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
        <button 
          class="legend-header"
          onclick={() => legendCollapsed = !legendCollapsed}
          aria-expanded={!legendCollapsed}
          aria-controls="legend-content"
        >
          <h2>Legend</h2>
          <svg
            class="legend-chevron"
            class:collapsed={legendCollapsed}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        {#if !legendCollapsed}
          <div class="legend-items" id="legend-content">
            <div class="legend-group">
              <h3>Node Types</h3>
              {#each legendItems as item (item.type)}
                <div class="legend-item">
                  <span
                    class="legend-dot"
                    style="background: {item.color}"
                  ></span>
                  {item.label}
                </div>
              {/each}
            </div>
          </div>
        {/if}
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

  <!-- Mobile controls bottom sheet -->
  <GraphControlsSheet
    {projectFilter}
    {typeFilter}
    {dateRangeFilter}
    {depth}
    selectedNode={$selectedNode}
    nodesCount={$nodesStore.nodes.length}
    edgesCount={$nodesStore.edges.length}
    loading={$nodesStore.loading}
    onProjectChange={handleMobileProjectChange}
    onTypeChange={handleMobileTypeChange}
    onDateChange={handleMobileDateChange}
    onDepthChange={handleMobileDepthChange}
  />
  {/if}
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

  .btn-sm {
    padding: var(--space-1) var(--space-3);
    font-size: var(--text-sm);
  }

  .getting-started-container {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 400px;
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
    background: rgba(20, 20, 23, 0.7);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: var(--space-4);
    border-radius: var(--radius-md);
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
    background: rgba(20, 20, 23, 0.4);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: var(--radius-lg);
    padding: var(--space-4);
    box-shadow: var(--shadow-sm), var(--shadow-highlight);
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
  .legend-section {
    padding: 0 !important;
  }

  .legend-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding: var(--space-4);
    background: transparent;
    border: none;
    cursor: pointer;
    transition: background-color var(--transition-fast);
  }

  .legend-header:hover {
    background: var(--color-bg-subtle);
  }

  .legend-header h2 {
    margin: 0;
  }

  .legend-chevron {
    color: var(--color-text-subtle);
    transition: transform var(--transition-fast);
  }

  .legend-chevron.collapsed {
    transform: rotate(-90deg);
  }

  .legend-items {
    padding: 0 var(--space-4) var(--space-4);
  }

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

  .legend-item:last-child {
    margin-bottom: 0;
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
