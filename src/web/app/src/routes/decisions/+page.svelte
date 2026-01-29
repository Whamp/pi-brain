<script lang="ts">
  import { onMount } from "svelte";
  import { BrainCircuit, ThumbsUp, ThumbsDown, Filter, X, FileX } from "lucide-svelte";
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
  </header>

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
    <ul class="decision-list">
      {#each decisions as decision}
        <li class="decision-item">
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
  }

  .header-left h1 {
    display: flex;
    align-items: center;
    gap: var(--space-3);
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

  /* States */
  .loading-state,
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-4);
    padding: var(--space-12);
    text-align: center;
    color: var(--color-text-muted);
  }

  .empty-state h2 {
    font-size: var(--text-xl);
    color: var(--color-text);
    margin-bottom: var(--space-2);
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

  .decision-item {
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-4);
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
</style>
