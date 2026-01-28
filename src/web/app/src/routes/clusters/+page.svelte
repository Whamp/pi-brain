<script lang="ts">
  import { onMount } from "svelte";
  import { Sparkles, Check, X, Filter, ChevronDown } from "lucide-svelte";
  import { api, getErrorMessage, isBackendOffline } from "$lib/api/client";
  import type { ClusterWithNodes, ClusterStatus } from "$lib/types";
  import { formatDistanceToNow, parseDate } from "$lib/utils/date";

  let clusters: ClusterWithNodes[] = $state([]);
  let loading = $state(true);
  let errorMessage: string | null = $state(null);
  let statusLoading: Record<string, boolean> = $state({});

  // Pagination
  let total = $state(0);
  let limit = 20;
  let offset = $state(0);

  // Filters
  let showFilters = $state(false);
  let filterStatus = $state<ClusterStatus | "">("");
  let filterSignalType = $state<"friction" | "delight" | "">("");

  onMount(async () => {
    await loadClusters();
  });

  async function loadClusters() {
    loading = true;
    errorMessage = null;

    try {
      const options: Record<string, unknown> = {
        limit,
        offset,
        includeNodes: true,
      };
      if (filterStatus) {options.status = filterStatus;}
      if (filterSignalType) {options.signalType = filterSignalType;}

      const res = await api.getClusters(options);
      ({ clusters } = res);
      ({ total } = res);
    } catch (error) {
      console.error("Failed to load clusters:", error);
      errorMessage = isBackendOffline(error)
        ? "Backend is offline. Start the daemon with 'pi-brain daemon start'."
        : getErrorMessage(error);
    } finally {
      loading = false;
    }
  }

  async function handleStatusUpdate(id: string, status: "confirmed" | "dismissed") {
    if (statusLoading[id]) {return;}

    statusLoading[id] = true;
    try {
      await api.updateClusterStatus(id, status);
      clusters = clusters.map(c =>
        c.id === id ? { ...c, status } : c
      );
    } catch (error) {
      console.error("Failed to update cluster status:", error);
    } finally {
      statusLoading[id] = false;
    }
  }

  async function handleFilterChange() {
    offset = 0;
    await loadClusters();
  }

  function clearFilters() {
    filterStatus = "";
    filterSignalType = "";
    handleFilterChange();
  }

  function hasActiveFilters(): boolean {
    return Boolean(filterStatus || filterSignalType);
  }

  async function loadMore() {
    if (offset + limit >= total) {return;}

    offset += limit;
    loading = true;

    try {
      const options: Record<string, unknown> = {
        limit,
        offset,
        includeNodes: true,
      };
      if (filterStatus) {options.status = filterStatus;}
      if (filterSignalType) {options.signalType = filterSignalType;}

      const res = await api.getClusters(options);
      clusters = [...clusters, ...res.clusters];
    } catch (error) {
      console.error("Failed to load more clusters:", error);
    } finally {
      loading = false;
    }
  }

  function getSignalIcon(signalType: "friction" | "delight" | null | undefined): string {
    if (signalType === "friction") {return "🔴";}
    if (signalType === "delight") {return "🟢";}
    return "⚪";
  }

  function getStatusClass(status: ClusterStatus): string {
    if (status === "confirmed") {return "status-confirmed";}
    if (status === "dismissed") {return "status-dismissed";}
    return "status-pending";
  }
</script>

<svelte:head>
  <title>Clusters | Pi Brain</title>
  <meta name="description" content="View and manage discovered clusters from session analysis" />
</svelte:head>

<div class="clusters-page">
  <header class="page-header">
    <div class="header-content">
      <h1>
        <Sparkles size={24} />
        Discovered Clusters
      </h1>
      <p class="subtitle">
        Patterns and themes discovered from session analysis
      </p>
    </div>

    <div class="header-actions">
      <button
        class="btn-filter"
        class:active={showFilters}
        onclick={() => (showFilters = !showFilters)}
      >
        <Filter size={16} />
        Filters
        {#if hasActiveFilters()}
          <span class="filter-badge"></span>
        {/if}
      </button>
    </div>
  </header>

  {#if showFilters}
    <div class="filters-panel">
      <div class="filter-group">
        <label for="filter-status">Status</label>
        <select
          id="filter-status"
          bind:value={filterStatus}
          onchange={handleFilterChange}
        >
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="dismissed">Dismissed</option>
        </select>
      </div>

      <div class="filter-group">
        <label for="filter-signal">Signal Type</label>
        <select
          id="filter-signal"
          bind:value={filterSignalType}
          onchange={handleFilterChange}
        >
          <option value="">All</option>
          <option value="friction">Friction</option>
          <option value="delight">Delight</option>
        </select>
      </div>

      {#if hasActiveFilters()}
        <button class="btn-clear-filters" onclick={clearFilters}>
          <X size={14} />
          Clear
        </button>
      {/if}
    </div>
  {/if}

  {#if errorMessage}
    <div class="error-message">
      {errorMessage}
    </div>
  {:else if loading && clusters.length === 0}
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading clusters...</p>
    </div>
  {:else if clusters.length === 0}
    <div class="empty-state">
      <Sparkles size={48} />
      <h2>No clusters found</h2>
      <p>Clusters are discovered during nightly analysis runs.</p>
    </div>
  {:else}
    <div class="clusters-list">
      {#each clusters as cluster (cluster.id)}
        <div class="cluster-card">
          <div class="cluster-header">
            <div class="cluster-info">
              <span class="signal-icon">{getSignalIcon(cluster.signalType)}</span>
              <h3 class="cluster-name">
                {cluster.name || `Cluster ${cluster.id.slice(0, 8)}`}
              </h3>
              <span class="node-count">{cluster.nodeCount} nodes</span>
            </div>

            <div class="cluster-meta">
              <span class={`status-badge ${getStatusClass(cluster.status)}`}>
                {cluster.status}
              </span>
              <span class="timestamp">
                {formatDistanceToNow(parseDate(cluster.createdAt))}
              </span>
            </div>
          </div>

          {#if cluster.description}
            <p class="cluster-description">{cluster.description}</p>
          {/if}

          {#if cluster.nodes && cluster.nodes.length > 0}
            <div class="cluster-nodes">
              <h4>Representative Sessions</h4>
              <ul>
                {#each cluster.nodes.slice(0, 3) as node}
                  <li>
                    <a href="/nodes/{node.nodeId}" class="node-link">
                      {node.summary || node.nodeId}
                    </a>
                    {#if node.project}
                      <span class="node-project">{node.project}</span>
                    {/if}
                  </li>
                {/each}
              </ul>
            </div>
          {/if}

          {#if cluster.status === "pending"}
            <div class="cluster-actions">
              <button
                class="btn-confirm"
                disabled={statusLoading[cluster.id]}
                onclick={() => handleStatusUpdate(cluster.id, "confirmed")}
              >
                <Check size={14} />
                Confirm
              </button>
              <button
                class="btn-dismiss"
                disabled={statusLoading[cluster.id]}
                onclick={() => handleStatusUpdate(cluster.id, "dismissed")}
              >
                <X size={14} />
                Dismiss
              </button>
            </div>
          {/if}
        </div>
      {/each}
    </div>

    {#if offset + limit < total}
      <div class="load-more">
        <button onclick={loadMore} disabled={loading}>
          {#if loading}
            Loading...
          {:else}
            <ChevronDown size={16} />
            Load More ({total - offset - clusters.length} remaining)
          {/if}
        </button>
      </div>
    {/if}
  {/if}
</div>

<style>
  .clusters-page {
    max-width: 1000px;
    margin: 0 auto;
    padding: 2rem;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 2rem;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .header-content h1 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0 0 0.5rem;
    font-size: 1.75rem;
    color: var(--color-text-primary, #fff);
  }

  .subtitle {
    margin: 0;
    color: var(--color-text-secondary, #888);
  }

  .btn-filter {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border: 1px solid var(--color-border, #333);
    border-radius: 6px;
    background: var(--color-bg-secondary, #1a1a1a);
    color: var(--color-text-primary, #fff);
    cursor: pointer;
    position: relative;
  }

  .btn-filter.active {
    border-color: var(--color-accent, #3b82f6);
  }

  .filter-badge {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--color-accent, #3b82f6);
    position: absolute;
    top: -2px;
    right: -2px;
  }

  .filters-panel {
    display: flex;
    gap: 1rem;
    padding: 1rem;
    margin-bottom: 1.5rem;
    background: var(--color-bg-secondary, #1a1a1a);
    border: 1px solid var(--color-border, #333);
    border-radius: 8px;
    flex-wrap: wrap;
    align-items: flex-end;
  }

  .filter-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .filter-group label {
    font-size: 0.75rem;
    color: var(--color-text-secondary, #888);
    text-transform: uppercase;
  }

  .filter-group select {
    padding: 0.5rem;
    border: 1px solid var(--color-border, #333);
    border-radius: 4px;
    background: var(--color-bg-primary, #0a0a0a);
    color: var(--color-text-primary, #fff);
    min-width: 120px;
  }

  .btn-clear-filters {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.5rem 0.75rem;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: var(--color-text-secondary, #888);
    cursor: pointer;
  }

  .btn-clear-filters:hover {
    color: var(--color-text-primary, #fff);
  }

  .error-message {
    padding: 1rem;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 8px;
    color: #ef4444;
    text-align: center;
  }

  .loading-state,
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem 2rem;
    text-align: center;
    color: var(--color-text-secondary, #888);
  }

  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--color-border, #333);
    border-top-color: var(--color-accent, #3b82f6);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .empty-state h2 {
    margin: 1rem 0 0.5rem;
    color: var(--color-text-primary, #fff);
  }

  .clusters-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .cluster-card {
    padding: 1.25rem;
    background: var(--color-bg-secondary, #1a1a1a);
    border: 1px solid var(--color-border, #333);
    border-radius: 8px;
  }

  .cluster-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 0.75rem;
  }

  .cluster-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .signal-icon {
    font-size: 0.875rem;
  }

  .cluster-name {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text-primary, #fff);
  }

  .node-count {
    font-size: 0.75rem;
    padding: 0.125rem 0.5rem;
    background: var(--color-bg-primary, #0a0a0a);
    border-radius: 4px;
    color: var(--color-text-secondary, #888);
  }

  .cluster-meta {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-shrink: 0;
  }

  .status-badge {
    font-size: 0.75rem;
    padding: 0.125rem 0.5rem;
    border-radius: 4px;
    text-transform: capitalize;
  }

  .status-pending {
    background: rgba(234, 179, 8, 0.1);
    color: #eab308;
  }

  .status-confirmed {
    background: rgba(34, 197, 94, 0.1);
    color: #22c55e;
  }

  .status-dismissed {
    background: rgba(107, 114, 128, 0.1);
    color: #6b7280;
  }

  .timestamp {
    font-size: 0.75rem;
    color: var(--color-text-secondary, #888);
  }

  .cluster-description {
    margin: 0 0 1rem;
    font-size: 0.875rem;
    color: var(--color-text-secondary, #888);
    line-height: 1.5;
  }

  .cluster-nodes {
    margin-bottom: 1rem;
  }

  .cluster-nodes h4 {
    margin: 0 0 0.5rem;
    font-size: 0.75rem;
    color: var(--color-text-secondary, #888);
    text-transform: uppercase;
  }

  .cluster-nodes ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .cluster-nodes li {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem 0;
    font-size: 0.875rem;
  }

  .node-link {
    color: var(--color-accent, #3b82f6);
    text-decoration: none;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 400px;
  }

  .node-link:hover {
    text-decoration: underline;
  }

  .node-project {
    font-size: 0.75rem;
    padding: 0.125rem 0.375rem;
    background: var(--color-bg-primary, #0a0a0a);
    border-radius: 3px;
    color: var(--color-text-secondary, #888);
    flex-shrink: 0;
  }

  .cluster-actions {
    display: flex;
    gap: 0.5rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--color-border, #333);
  }

  .btn-confirm,
  .btn-dismiss {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.375rem 0.75rem;
    border: 1px solid transparent;
    border-radius: 4px;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-confirm {
    background: rgba(34, 197, 94, 0.1);
    border-color: rgba(34, 197, 94, 0.3);
    color: #22c55e;
  }

  .btn-confirm:hover:not(:disabled) {
    background: rgba(34, 197, 94, 0.2);
  }

  .btn-dismiss {
    background: rgba(107, 114, 128, 0.1);
    border-color: rgba(107, 114, 128, 0.3);
    color: #6b7280;
  }

  .btn-dismiss:hover:not(:disabled) {
    background: rgba(107, 114, 128, 0.2);
  }

  .btn-confirm:disabled,
  .btn-dismiss:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .load-more {
    display: flex;
    justify-content: center;
    margin-top: 1.5rem;
  }

  .load-more button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    border: 1px solid var(--color-border, #333);
    border-radius: 6px;
    background: var(--color-bg-secondary, #1a1a1a);
    color: var(--color-text-primary, #fff);
    cursor: pointer;
    transition: all 0.15s;
  }

  .load-more button:hover:not(:disabled) {
    border-color: var(--color-accent, #3b82f6);
  }

  .load-more button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
