<script lang="ts">
  import { SlidersHorizontal, X, ChevronUp } from "lucide-svelte";
  import Spinner from "./spinner.svelte";
  import type { Node, NodeType } from "$lib/types";
  import { formatDateShort, parseDate } from "$lib/utils/date";
  import { focusTrap, createFocusTrap } from "$lib/utils/focus-trap";
  import EmptyState from "./empty-state.svelte";
  import Tag from "./tag.svelte";

  interface Props {
    // Filter values
    projectFilter: string;
    typeFilter: NodeType | "";
    dateRangeFilter: string;
    depth: number;
    // State
    selectedNode: Node | null;
    nodesCount: number;
    edgesCount: number;
    loading: boolean;
    // Callbacks
    onProjectChange: (value: string) => void;
    onTypeChange: (value: NodeType | "") => void;
    onDateChange: (value: string) => void;
    onDepthChange: (value: number) => void;
  }

  let {
    projectFilter,
    typeFilter,
    dateRangeFilter,
    depth,
    selectedNode,
    nodesCount,
    edgesCount,
    loading,
    onProjectChange,
    onTypeChange,
    onDateChange,
    onDepthChange,
  }: Props = $props();

  let isOpen = $state(false);
  let activeTab = $state<"filters" | "node" | "legend">("filters");

  function toggle() {
    isOpen = !isOpen;
  }

  function close() {
    isOpen = false;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape" && isOpen) {
      close();
    }
  }

  // Auto-switch to node tab when a node is selected
  $effect(() => {
    if (selectedNode && isOpen) {
      activeTab = "node";
    }
  });

  // Trap focus when open
  let cleanup: (() => void) | null = null;
  $effect(() => {
    const sheetNode = document.getElementById("graph-controls-sheet");
    if (isOpen && sheetNode) {
      cleanup = createFocusTrap(sheetNode, {
        onEscape: close,
      });
    } else {
      cleanup?.();
      cleanup = null;
    }
    return () => cleanup?.();
  });
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<svelte:window onkeydown={handleKeydown} />

<!-- Mobile toggle button - fixed at bottom -->
<button
  class="sheet-toggle"
  onclick={toggle}
  aria-label={isOpen ? "Close controls" : "Open graph controls"}
  aria-expanded={isOpen}
  aria-controls="graph-controls-sheet"
>
  {#if isOpen}
    <X size={20} />
    <span>Close</span>
  {:else}
    <SlidersHorizontal size={20} />
    <span>Filters</span>
    {#if selectedNode}
      <span class="badge">1</span>
    {/if}
  {/if}
</button>

<!-- Backdrop -->
{#if isOpen}
  <button
    class="backdrop"
    onclick={close}
    aria-label="Close controls"
    tabindex="-1"
  ></button>
{/if}

<!-- Bottom sheet -->
<div
  id="graph-controls-sheet"
  class="sheet"
  class:open={isOpen}
  aria-hidden={!isOpen}
>
  <!-- Drag handle -->
  <div class="sheet-handle">
    <button class="handle-bar" onclick={toggle} aria-label="Toggle sheet">
      <ChevronUp size={20} />
    </button>
  </div>

  <!-- Tabs -->
  <div class="sheet-tabs" role="tablist">
    <button
      class="tab"
      class:active={activeTab === "filters"}
      role="tab"
      aria-selected={activeTab === "filters"}
      onclick={() => (activeTab = "filters")}
    >
      Filters
    </button>
    <button
      class="tab"
      class:active={activeTab === "node"}
      class:has-selection={selectedNode}
      role="tab"
      aria-selected={activeTab === "node"}
      onclick={() => (activeTab = "node")}
      disabled={!selectedNode}
    >
      Selected
      {#if selectedNode}
        <span class="tab-dot"></span>
      {/if}
    </button>
    <button
      class="tab"
      class:active={activeTab === "legend"}
      role="tab"
      aria-selected={activeTab === "legend"}
      onclick={() => (activeTab = "legend")}
    >
      Legend
    </button>
  </div>

  <!-- Tab content -->
  <div class="sheet-content">
    {#if activeTab === "filters"}
      <div class="filters-grid">
        <div class="filter-group">
          <label for="mobile-project-filter">Project</label>
          <input
            type="text"
            id="mobile-project-filter"
            value={projectFilter}
            oninput={(e) => onProjectChange(e.currentTarget.value)}
            placeholder="Filter by project..."
          />
        </div>

        <div class="filter-group">
          <label for="mobile-type-filter">Type</label>
          <select
            id="mobile-type-filter"
            value={typeFilter}
            onchange={(e) => onTypeChange(e.currentTarget.value as NodeType | "")}
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
          <label for="mobile-date-filter">Date range</label>
          <select
            id="mobile-date-filter"
            value={dateRangeFilter}
            onchange={(e) => onDateChange(e.currentTarget.value)}
          >
            <option value="1">Today</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="">All time</option>
          </select>
        </div>

        <div class="filter-group full-width">
          <label for="mobile-depth-control">
            Graph depth: <strong>{depth} hop{depth > 1 ? "s" : ""}</strong>
          </label>
          <input
            type="range"
            id="mobile-depth-control"
            min="1"
            max="5"
            value={depth}
            oninput={(e) => onDepthChange(Number.parseInt(e.currentTarget.value, 10))}
          />
        </div>
      </div>

      <!-- Stats row -->
      <div class="stats-row">
        <div class="stat">
          <span class="stat-value">{nodesCount}</span>
          <span class="stat-label">Nodes</span>
        </div>
        <div class="stat">
          <span class="stat-value">{edgesCount}</span>
          <span class="stat-label">Edges</span>
        </div>
      </div>
    {:else if activeTab === "node"}
      {#if selectedNode}
        <div class="node-preview" class:loading>
          {#if loading}
            <div class="preview-loading-overlay">
              <Spinner size={20} />
            </div>
          {/if}
          <div class="node-type" data-type={selectedNode.classification.type}>
            {selectedNode.classification.type}
          </div>
          <h3 class="node-summary">{selectedNode.content.summary}</h3>
          <p class="node-project">
            {selectedNode.classification.project.split("/").pop()}
          </p>
          <div class="node-meta">
            <span class="outcome" data-outcome={selectedNode.content.outcome}>
              {selectedNode.content.outcome}
            </span>
            <span class="date">
              {formatDateShort(parseDate(selectedNode.metadata.timestamp))}
            </span>
          </div>
          {#if selectedNode.semantic.tags.length > 0}
            <div class="node-tags">
              {#each selectedNode.semantic.tags.slice(0, 5) as tag}
                <Tag text={tag} variant="auto" />
              {/each}
            </div>
          {/if}
          <a href="/nodes/{selectedNode.id}" class="btn-primary view-details">
            View Details →
          </a>
        </div>
      {:else}
        <EmptyState
          title="No node selected"
          description="Tap a node in the graph to see its details here."
          size="sm"
        />
      {/if}
    {:else if activeTab === "legend"}
      <div class="legend-grid">
        <div class="legend-item">
          <span class="legend-dot" style="background: var(--color-node-coding)"></span>
          Coding
        </div>
        <div class="legend-item">
          <span class="legend-dot" style="background: var(--color-node-debugging)"></span>
          Debugging
        </div>
        <div class="legend-item">
          <span class="legend-dot" style="background: var(--color-node-refactoring)"></span>
          Refactor
        </div>
        <div class="legend-item">
          <span class="legend-dot" style="background: var(--color-node-planning)"></span>
          Planning
        </div>
        <div class="legend-item">
          <span class="legend-dot" style="background: var(--color-node-research)"></span>
          Research
        </div>
        <div class="legend-item">
          <span class="legend-dot" style="background: var(--color-node-sysadmin)"></span>
          Sysadmin
        </div>
        <div class="legend-item">
          <span class="legend-dot" style="background: var(--color-node-documentation)"></span>
          Documentation
        </div>
        <div class="legend-item">
          <span class="legend-dot" style="background: var(--color-node-qa)"></span>
          QA
        </div>
        <div class="legend-item">
          <span class="legend-dot" style="background: var(--color-node-brainstorm)"></span>
          Brainstorm
        </div>
        <div class="legend-item">
          <span class="legend-dot" style="background: var(--color-node-configuration)"></span>
          Config
        </div>
        <div class="legend-item">
          <span class="legend-dot" style="background: var(--color-node-handoff)"></span>
          Handoff
        </div>
        <div class="legend-item">
          <span class="legend-dot" style="background: var(--color-node-other)"></span>
          Other
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  /* Hide on desktop */
  .sheet-toggle,
  .backdrop,
  .sheet {
    display: none;
  }

  /* Mobile styles */
  @media (max-width: 1024px) {
    /* Toggle button - fixed at bottom right */
    .sheet-toggle {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      position: fixed;
      bottom: var(--space-6);
      right: var(--space-4);
      padding: var(--space-3) var(--space-4);
      min-height: 48px;
      background: var(--color-accent);
      color: var(--color-bg);
      border: none;
      border-radius: var(--radius-full);
      font-size: var(--text-sm);
      font-weight: 600;
      cursor: pointer;
      box-shadow:
        0 4px 12px rgba(0, 0, 0, 0.3),
        0 0 20px var(--color-accent-muted);
      z-index: 100;
      transition:
        transform var(--transition-fast),
        box-shadow var(--transition-fast);
    }

    .sheet-toggle:hover {
      transform: translateY(-2px);
      box-shadow:
        0 6px 16px rgba(0, 0, 0, 0.4),
        0 0 24px var(--color-accent-muted);
    }

    .sheet-toggle:active {
      transform: translateY(0);
    }

    .badge {
      background: var(--color-bg);
      color: var(--color-accent);
      font-size: var(--text-xs);
      font-weight: 700;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Backdrop */
    .backdrop {
      display: block;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      z-index: 250;
      border: none;
      cursor: pointer;
      -webkit-backdrop-filter: blur(4px);
      backdrop-filter: blur(4px);
      animation: fadeIn 0.2s ease;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    /* Bottom sheet */
    .sheet {
      display: flex;
      flex-direction: column;
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      max-height: 70vh;
      background: rgba(20, 20, 23, 0.7);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: var(--radius-xl) var(--radius-xl) 0 0;
      z-index: 300;
      transform: translateY(100%);
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.4);
    }

    .sheet.open {
      transform: translateY(0);
    }

    /* Drag handle */
    .sheet-handle {
      display: flex;
      justify-content: center;
      padding: var(--space-2) 0;
    }

    .handle-bar {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 32px;
      background: transparent;
      border: none;
      color: var(--color-text-muted);
      cursor: pointer;
      border-radius: var(--radius-sm);
      transition: background var(--transition-fast);
    }

    .handle-bar:hover {
      background: var(--color-bg-hover);
    }

    .handle-bar :global(svg) {
      transition: transform var(--transition-fast);
    }

    .sheet.open .handle-bar :global(svg) {
      transform: rotate(180deg);
    }

    /* Tabs */
    .sheet-tabs {
      display: flex;
      gap: var(--space-1);
      padding: 0 var(--space-4);
      border-bottom: 1px solid var(--color-border-subtle);
    }

    .tab {
      position: relative;
      flex: 1;
      padding: var(--space-3);
      min-height: 44px;
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      color: var(--color-text-muted);
      font-size: var(--text-sm);
      font-weight: 500;
      cursor: pointer;
      transition:
        color var(--transition-fast),
        border-color var(--transition-fast);
    }

    .tab:hover:not(:disabled) {
      color: var(--color-text);
    }

    .tab.active {
      color: var(--color-accent);
      border-bottom-color: var(--color-accent);
    }

    .tab:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .tab-dot {
      position: absolute;
      top: 8px;
      right: calc(50% - 24px);
      width: 6px;
      height: 6px;
      background: var(--color-accent);
      border-radius: 50%;
    }

    /* Sheet content */
    .sheet-content {
      flex: 1;
      overflow-y: auto;
      padding: var(--space-4);
    }

    /* Filters grid */
    .filters-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-3);
    }

    .filter-group {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
    }

    .filter-group.full-width {
      grid-column: 1 / -1;
    }

    .filter-group label {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
    }

    .filter-group input[type="text"],
    .filter-group select {
      width: 100%;
      min-height: 44px;
    }

    .filter-group input[type="range"] {
      width: 100%;
      accent-color: var(--color-accent);
    }

    /* Stats row */
    .stats-row {
      display: flex;
      gap: var(--space-4);
      margin-top: var(--space-4);
      padding-top: var(--space-4);
      border-top: 1px solid var(--color-border-subtle);
    }

    .stat {
      flex: 1;
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

    /* Node preview */
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
      margin: 0;
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
      margin-top: var(--space-3);
      text-align: center;
      display: block;
      padding: var(--space-3);
      border-radius: var(--radius-md);
      min-height: 44px;
    }

    /* Empty state */
    .empty-state {
      text-align: center;
      padding: var(--space-6);
      color: var(--color-text-muted);
    }

    /* Legend grid */
    .legend-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--space-2);
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--text-sm);
      color: var(--color-text-muted);
      padding: var(--space-2);
    }

    .legend-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      flex-shrink: 0;
    }
  }

  /* Small phones - single column filters */
  @media (max-width: 480px) {
    .filters-grid {
      grid-template-columns: 1fr;
    }

    .legend-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>
