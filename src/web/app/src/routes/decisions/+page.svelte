<script lang="ts">
  import { onMount } from "svelte";
  import {
    BrainCircuit,
    ThumbsUp,
    ThumbsDown,
    Filter,
    X,
    LayoutList,
    LayoutGrid,
    ChevronDown,
    ChevronRight,
    CheckSquare,
    Square,
  } from "lucide-svelte";
  import Spinner from "$lib/components/spinner.svelte";
  import LoadingState from "$lib/components/loading-state.svelte";
  import EmptyState from "$lib/components/empty-state.svelte";
  import { api, getErrorMessage, isBackendOffline } from "$lib/api/client";
  import type { DaemonDecisionEntity } from "$lib/types";
  import { formatDistanceToNow, parseDate } from "$lib/utils/date";
  import ErrorState from "$lib/components/error-state.svelte";

  let decisions: DaemonDecisionEntity[] = $state([]);
  let loading = $state(true);
  let errorMessage: string | null = $state(null);
  let isOfflineError = $state(false);
  let feedbackLoading: Record<string, boolean> = $state({});

  // Pagination
  let total = $state(0);
  let limit = 20;
  let offset = $state(0);

  // Filters
  let showFilters = $state(false);
  let filterProject = $state("");
  let filterDateFrom = $state("");
  let filterDateTo = $state("");

  // View mode
  let viewMode: "compact" | "expanded" = $state("expanded");
  let expandedIds: Set<string> = $state(new Set());

  // Batch mode
  let batchMode = $state(false);
  let selectedIds: Set<string> = $state(new Set());

  // Available projects for filter
  let availableProjects: string[] = $state([]);

  onMount(async () => {
    await loadProjects();
    await loadDecisions();
  });

  async function loadProjects() {
    try {
      const data = await api.getProjects();
      availableProjects = data.projects.map(p => p.project);
    } catch (error) {
      console.error("Failed to load projects:", error);
    }
  }

  async function loadDecisions() {
    loading = true;
    errorMessage = null;

    try {
      const filters: Record<string, string> = {};
      if (filterProject) {filters.project = filterProject;}
      if (filterDateFrom) {filters.from = filterDateFrom;}
      if (filterDateTo) {filters.to = filterDateTo;}

      const res = await api.getDecisions(filters, { limit, offset });
      ({ decisions } = res);
      ({ total } = res);
    } catch (error) {
      console.error("Failed to load decisions:", error);
      isOfflineError = isBackendOffline(error);
      errorMessage = isOfflineError
        ? "Backend is offline. Start the daemon with 'pi-brain daemon start'."
        : getErrorMessage(error);
    } finally {
      loading = false;
    }
  }

  async function handleFeedback(id: string, feedback: string) {
    if (feedbackLoading[id]) {return;}

    const current = decisions.find(d => d.id === id)?.userFeedback;
    const newFeedback = current === feedback ? null : feedback;

    feedbackLoading[id] = true;
    try {
      await api.updateDecisionFeedback(id, newFeedback);
      decisions = decisions.map(d =>
        d.id === id ? { ...d, userFeedback: newFeedback } : d
      );
    } catch (error) {
      console.error("Failed to update feedback:", error);
    } finally {
      feedbackLoading[id] = false;
    }
  }

  async function handleBatchFeedback(feedback: string) {
    if (selectedIds.size === 0) {return;}

    const ids = [...selectedIds];
    for (const id of ids) {
      await handleFeedback(id, feedback);
    }
    selectedIds = new Set();
    batchMode = false;
  }

  function toggleExpanded(id: string) {
    const newSet = new Set(expandedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    expandedIds = newSet;
  }

  function toggleSelected(id: string) {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    selectedIds = newSet;
  }

  function selectAll() {
    selectedIds = new Set(decisions.map(d => d.id));
  }

  function selectNone() {
    selectedIds = new Set();
  }

  function toggleBatchMode() {
    batchMode = !batchMode;
    if (!batchMode) {
      selectedIds = new Set();
    }
  }

  async function handleFilterChange() {
    offset = 0;
    await loadDecisions();
  }

  function clearFilters() {
    filterProject = "";
    filterDateFrom = "";
    filterDateTo = "";
    handleFilterChange();
  }

  function hasActiveFilters(): boolean {
    return Boolean(filterProject || filterDateFrom || filterDateTo);
  }

  async function loadMore() {
    if (offset + limit >= total) {return;}
    offset += limit;

    loading = true;
    try {
      const filters: Record<string, string> = {};
      if (filterProject) {filters.project = filterProject;}
      if (filterDateFrom) {filters.from = filterDateFrom;}
      if (filterDateTo) {filters.to = filterDateTo;}

      const res = await api.getDecisions(filters, { limit, offset });
      decisions = [...decisions, ...res.decisions];
    } catch (error) {
      console.error("Failed to load more decisions:", error);
    } finally {
      loading = false;
    }
  }

  function truncateDecision(text: string, maxLength = 80): string {
    if (text.length <= maxLength) {return text;}
    return `${text.slice(0, maxLength).trimEnd()}…`;
  }
</script>

<svelte:head>
  <title>Daemon Decisions - pi-brain</title>
  <meta name="description" content="View and manage daemon decisions" />
</svelte:head>

<div class="decisions-page">
  <header class="page-header">
    <div class="header-left">
      <h1 class="page-title">
        <BrainCircuit size={32} />
        Daemon Decisions
      </h1>
      <p class="page-subtitle">
        Review and provide feedback on autonomous daemon decisions
      </p>
    </div>
    <div class="header-actions">
      <div class="view-toggle" role="group" aria-label="View mode">
        <button
          class="view-toggle-btn"
          class:active={viewMode === "compact"}
          onclick={() => (viewMode = "compact")}
          aria-pressed={viewMode === "compact"}
          title="Compact view"
        >
          <LayoutList size={18} />
        </button>
        <button
          class="view-toggle-btn"
          class:active={viewMode === "expanded"}
          onclick={() => (viewMode = "expanded")}
          aria-pressed={viewMode === "expanded"}
          title="Expanded view"
        >
          <LayoutGrid size={18} />
        </button>
      </div>
      <button
        class="filter-toggle"
        class:active={batchMode}
        onclick={toggleBatchMode}
        title="Batch rating mode"
      >
        <CheckSquare size={18} />
        Batch
      </button>
      <button
        class="filter-toggle"
        class:active={hasActiveFilters()}
        onclick={() => (showFilters = !showFilters)}
      >
        <Filter size={18} />
        Filters
        {#if hasActiveFilters()}
          <span class="filter-badge"></span>
        {/if}
      </button>
    </div>
  </header>

  {#if batchMode && selectedIds.size > 0}
    <div class="batch-actions-bar">
      <span class="batch-count">{selectedIds.size} selected</span>
      <div class="batch-buttons">
        <button class="batch-btn select-all" onclick={selectAll}>Select all</button>
        <button class="batch-btn select-none" onclick={selectNone}>Clear</button>
        <button
          class="batch-btn good"
          onclick={() => handleBatchFeedback("good")}
          title="Mark selected as good"
        >
          <ThumbsUp size={16} />
          Good
        </button>
        <button
          class="batch-btn bad"
          onclick={() => handleBatchFeedback("bad")}
          title="Mark selected as bad"
        >
          <ThumbsDown size={16} />
          Bad
        </button>
      </div>
    </div>
  {/if}

  {#if showFilters}
    <div class="filters-panel">
      <div class="filters-header">
        <h2>Filters</h2>
        {#if hasActiveFilters()}
          <button class="clear-filters" onclick={clearFilters}>
            <X size={16} />
            Clear all
          </button>
        {/if}
      </div>

      <div class="filter-groups">
        <div class="filter-group">
          <label for="project-filter">Project</label>
          <select
            id="project-filter"
            bind:value={filterProject}
            onchange={handleFilterChange}
          >
            <option value="">All projects</option>
            {#each availableProjects as project}
              <option value={project}>{project.split("/").pop()}</option>
            {/each}
          </select>
        </div>

        <div class="filter-group">
          <label for="date-from">From</label>
          <input
            type="date"
            id="date-from"
            bind:value={filterDateFrom}
            onchange={handleFilterChange}
          />
        </div>

        <div class="filter-group">
          <label for="date-to">To</label>
          <input
            type="date"
            id="date-to"
            bind:value={filterDateTo}
            onchange={handleFilterChange}
          />
        </div>
      </div>
    </div>
  {/if}

  <div class="results-info" role="status" aria-live="polite">
    {#if !loading && total > 0}
      <p class="results-count">
        Showing {decisions.length} of {total} decision{total !== 1 ? "s" : ""}
      </p>
    {/if}
  </div>

  {#if loading && decisions.length === 0}
    <LoadingState message="Loading decisions..." />
  {:else if errorMessage}
    <ErrorState
      variant={isOfflineError ? "offline" : "failed"}
      description={errorMessage}
      onRetry={loadDecisions}
      showSettingsLink={isOfflineError}
    />
  {:else if decisions.length === 0}
    <EmptyState
      icon={BrainCircuit}
      title="No decisions found"
      description="The daemon hasn't made any decisions yet, or none match your filters."
    />
  {:else}
    <ul class="decision-list" class:compact={viewMode === "compact"}>
      {#each decisions as decision}
        {#if viewMode === "compact"}
          <li class="decision-item-compact" class:expanded={expandedIds.has(decision.id)}>
            <div class="compact-row">
              {#if batchMode}
                <button
                  class="checkbox-btn"
                  onclick={() => toggleSelected(decision.id)}
                  aria-label={selectedIds.has(decision.id) ? "Deselect decision" : "Select decision"}
                >
                  {#if selectedIds.has(decision.id)}
                    <CheckSquare size={16} />
                  {:else}
                    <Square size={16} />
                  {/if}
                </button>
              {/if}
              <button
                class="compact-row-content"
                onclick={() => toggleExpanded(decision.id)}
                aria-expanded={expandedIds.has(decision.id)}
              >
                <span class="expand-icon">
                  {#if expandedIds.has(decision.id)}
                    <ChevronDown size={16} />
                  {:else}
                    <ChevronRight size={16} />
                  {/if}
                </span>
                <span class="compact-time">{formatDistanceToNow(parseDate(decision.timestamp))}</span>
                <span class="compact-decision">{truncateDecision(decision.decision)}</span>
                {#if decision.sourceProject}
                  <span class="compact-project">{decision.sourceProject.split("/").pop()}</span>
                {/if}
                <span class="compact-feedback">
                  {#if decision.userFeedback === "good"}
                    <ThumbsUp size={14} class="feedback-good" />
                  {:else if decision.userFeedback === "bad"}
                    <ThumbsDown size={14} class="feedback-bad" />
                  {/if}
                </span>
              </button>
            </div>

            {#if expandedIds.has(decision.id)}
              <div class="compact-expanded-content">
                <div class="decision-content">
                  <div class="decision-text">{decision.decision}</div>
                  <div class="decision-reasoning">{decision.reasoning}</div>
                </div>
                <div class="decision-actions">
                  <button
                    class="btn-icon-bordered"
                    class:active={decision.userFeedback === "good"}
                    onclick={() => handleFeedback(decision.id, "good")}
                    title="Good decision"
                    disabled={feedbackLoading[decision.id]}
                  >
                    <ThumbsUp size={16} />
                  </button>
                  <button
                    class="btn-icon-bordered"
                    class:active={decision.userFeedback === "bad"}
                    onclick={() => handleFeedback(decision.id, "bad")}
                    title="Bad decision"
                    disabled={feedbackLoading[decision.id]}
                  >
                    <ThumbsDown size={16} />
                  </button>
                </div>
              </div>
            {/if}
          </li>
        {:else}
          <li class="decision-item">
            {#if batchMode}
              <button
                class="checkbox-wrapper"
                onclick={() => toggleSelected(decision.id)}
                aria-label={selectedIds.has(decision.id) ? "Deselect decision" : "Select decision"}
              >
                {#if selectedIds.has(decision.id)}
                  <CheckSquare size={18} />
                {:else}
                  <Square size={18} />
                {/if}
              </button>
            {/if}
            <div class="decision-header">
              <span class="decision-time">
                {formatDistanceToNow(parseDate(decision.timestamp))}
              </span>
              <div class="decision-actions">
                <button
                  class="btn-icon-bordered"
                  class:active={decision.userFeedback === "good"}
                  onclick={() => handleFeedback(decision.id, "good")}
                  title="Good decision"
                  disabled={feedbackLoading[decision.id]}
                >
                  <ThumbsUp size={16} />
                </button>
                <button
                  class="btn-icon-bordered"
                  class:active={decision.userFeedback === "bad"}
                  onclick={() => handleFeedback(decision.id, "bad")}
                  title="Bad decision"
                  disabled={feedbackLoading[decision.id]}
                >
                  <ThumbsDown size={16} />
                </button>
              </div>
            </div>

            <div class="decision-content">
              <div class="decision-text">{decision.decision}</div>
              <div class="decision-reasoning">{decision.reasoning}</div>
            </div>

            {#if decision.sourceProject}
              <div class="decision-meta">
                <span class="project-tag">
                  {decision.sourceProject.split("/").pop()}
                </span>
              </div>
            {/if}
          </li>
        {/if}
      {/each}
    </ul>

    {#if offset + limit < total}
      <button class="btn-secondary btn-full" style="margin-top: var(--space-6);" onclick={loadMore} disabled={loading}>
        {loading ? "Loading..." : "Load more"}
      </button>
    {/if}
  {/if}
</div>

<style>
  .decisions-page {
    max-width: 900px;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: var(--space-6);
    flex-wrap: wrap;
    gap: var(--space-4);
  }

  .header-left h1 {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  /* View Toggle */
  .view-toggle {
    display: flex;
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    overflow: hidden;
  }

  .view-toggle-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-2);
    background: none;
    border: none;
    color: var(--color-text-muted);
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
  }

  .view-toggle-btn:hover {
    background: var(--color-bg-hover);
  }

  .view-toggle-btn.active {
    background: var(--color-accent);
    color: var(--color-bg);
  }

  .filter-toggle {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    color: var(--color-text-muted);
    font-size: var(--text-sm);
    cursor: pointer;
    position: relative;
    transition: background 0.15s ease, border-color 0.15s ease;
  }

  .filter-toggle:hover {
    background: var(--color-bg-hover);
    border-color: var(--color-accent);
  }

  .filter-toggle.active {
    color: var(--color-accent);
    border-color: var(--color-accent);
  }

  .filter-badge {
    position: absolute;
    top: -4px;
    right: -4px;
    width: 10px;
    height: 10px;
    background: var(--color-accent);
    border-radius: 50%;
  }

  /* Batch Actions Bar */
  .batch-actions-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3) var(--space-4);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-accent);
    border-radius: var(--radius-lg);
    margin-bottom: var(--space-4);
  }

  .batch-count {
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--color-accent);
  }

  .batch-buttons {
    display: flex;
    gap: var(--space-2);
  }

  .batch-btn {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-2) var(--space-3);
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease;
  }

  .batch-btn:hover {
    background: var(--color-bg-hover);
  }

  .batch-btn.good:hover {
    border-color: var(--color-success);
    color: var(--color-success);
  }

  .batch-btn.bad:hover {
    border-color: var(--color-error);
    color: var(--color-error);
  }

  /* Filters Panel */
  .filters-panel {
    padding: var(--space-4);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    margin-bottom: var(--space-6);
  }

  .filters-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-4);
  }

  .filters-header h2 {
    font-size: var(--text-lg);
    font-weight: 600;
  }

  .clear-filters {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-2) var(--space-3);
    background: none;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    color: var(--color-text-muted);
    font-size: var(--text-sm);
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
  }

  .clear-filters:hover {
    background: var(--color-bg-hover);
    color: var(--color-text);
  }

  .filter-groups {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--space-4);
  }

  .filter-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .filter-group label {
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--color-text-muted);
  }

  .filter-group select,
  .filter-group input[type="date"] {
    padding: var(--space-2) var(--space-3);
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    color: var(--color-text);
    cursor: pointer;
  }

  /* Results Info */
  .results-info {
    margin-bottom: var(--space-4);
  }

  .results-count {
    color: var(--color-text-muted);
    font-size: var(--text-sm);
  }

  /* Decision List */
  .decision-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    padding: 0;
    margin: 0;
  }

  .decision-list.compact {
    gap: 0;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }

  /* Expanded View Items */
  .decision-item {
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-4);
    position: relative;
  }

  .checkbox-wrapper {
    position: absolute;
    top: var(--space-4);
    left: var(--space-4);
    background: none;
    border: none;
    color: var(--color-accent);
    cursor: pointer;
    padding: 0;
  }

  .decision-item:has(.checkbox-wrapper) {
    padding-left: calc(var(--space-4) + 28px);
  }

  .decision-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-3);
  }

  .decision-time {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }

  .decision-actions {
    display: flex;
    gap: var(--space-2);
  }

  .decision-content {
    margin-bottom: var(--space-3);
  }

  .decision-text {
    font-weight: 500;
    font-size: var(--text-base);
    margin-bottom: var(--space-2);
    color: var(--color-text);
  }

  .decision-reasoning {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    line-height: 1.5;
  }

  .decision-meta {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .project-tag {
    font-size: var(--text-xs);
    padding: 2px 8px;
    background: var(--color-bg);
    border-radius: var(--radius-sm);
    color: var(--color-text-muted);
    font-family: var(--font-mono);
  }

  /* Compact View Items */
  .decision-item-compact {
    background: var(--color-bg-elevated);
    border-bottom: 1px solid var(--color-border);
  }

  .decision-item-compact:last-child {
    border-bottom: none;
  }

  .decision-item-compact.expanded {
    background: var(--color-bg);
  }

  .compact-row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-1) var(--space-4);
  }

  .compact-row:hover {
    background: var(--color-bg-hover);
  }

  .checkbox-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    color: var(--color-text-muted);
    cursor: pointer;
    padding: var(--space-2);
    flex-shrink: 0;
  }

  .checkbox-btn:hover {
    color: var(--color-accent);
  }

  .compact-row-content {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    flex: 1;
    padding: var(--space-2) 0;
    background: none;
    border: none;
    text-align: left;
    cursor: pointer;
    min-width: 0;
  }

  .expand-icon {
    color: var(--color-text-muted);
    flex-shrink: 0;
  }

  .compact-time {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    white-space: nowrap;
    flex-shrink: 0;
    min-width: 80px;
  }

  .compact-decision {
    font-size: var(--text-sm);
    color: var(--color-text);
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .compact-project {
    font-size: var(--text-xs);
    padding: 2px 6px;
    background: var(--color-bg);
    border-radius: var(--radius-sm);
    color: var(--color-text-muted);
    font-family: var(--font-mono);
    flex-shrink: 0;
  }

  .compact-feedback {
    flex-shrink: 0;
    width: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .compact-feedback :global(.feedback-good) {
    color: var(--color-success);
  }

  .compact-feedback :global(.feedback-bad) {
    color: var(--color-error);
  }

  .compact-expanded-content {
    padding: var(--space-4);
    padding-top: 0;
    padding-left: calc(var(--space-4) + 16px + var(--space-3));
    border-top: 1px solid var(--color-border);
    background: var(--color-bg);
  }

  .compact-expanded-content .decision-content {
    margin-bottom: var(--space-3);
    padding-top: var(--space-3);
  }

  .compact-expanded-content .decision-actions {
    justify-content: flex-start;
  }
</style>
