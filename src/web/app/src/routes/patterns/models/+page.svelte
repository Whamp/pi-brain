<svelte:head>
  <title>Model Reliability - pi-brain</title>
  <meta name="description" content="Model reliability statistics and quirks" />
</svelte:head>

<script lang="ts">
  import { onMount } from "svelte";
  import { api, getErrorMessage, isBackendOffline } from "$lib/api/client";
  import { formatDistanceToNow, parseDate } from "$lib/utils/date";
  import {
    Cpu,
    AlertCircle,
    Loader2,
    AlertTriangle,
    Bug,
    Clock,
    Home,
    ChevronRight,
  } from "lucide-svelte";
  import type { AggregatedModelStats } from "$lib/types";

  let loading = $state(true);
  let errorMessage = $state<string | null>(null);
  let modelStats = $state<AggregatedModelStats[]>([]);

  async function loadData() {
    loading = true;
    errorMessage = null;
    try {
      modelStats = await api.getModelStats();
    } catch (error) {
      errorMessage = isBackendOffline(error)
        ? "Backend is offline. Start the daemon with 'pi-brain daemon start'."
        : getErrorMessage(error);
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    loadData();
  });

  function formatTokens(tokens: number): string {
    if (tokens >= 1_000_000) {
      return `${(tokens / 1_000_000).toFixed(1)}M`;
    }
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}K`;
    }
    return tokens.toString();
  }
</script>

<div class="patterns-page">
  <header class="page-header">
    <h1>
      <Cpu size={24} />
      Model Reliability
    </h1>
  </header>

  <!-- Breadcrumbs -->
  <nav class="breadcrumbs" aria-label="Breadcrumb navigation">
    <a href="/" class="breadcrumb">
      <Home size={14} />
      <span>Dashboard</span>
    </a>
    <ChevronRight size={14} class="breadcrumb-separator" />
    <span class="breadcrumb active" aria-current="page">
      <Cpu size={14} />
      <span>Model Reliability</span>
    </span>
  </nav>

  {#if loading}
    <div class="loading-state" role="status" aria-live="polite">
      <Loader2 size={32} class="spinner" />
      <p>Loading model stats...</p>
    </div>
  {:else if errorMessage}
    <div class="error-state">
      <AlertCircle size={32} />
      <p>{errorMessage}</p>
      <button class="btn-primary" onclick={() => loadData()}>
        Retry
      </button>
    </div>
  {:else if modelStats.length === 0}
    <div class="empty-state">
      <Cpu size={48} />
      <p>No model statistics recorded yet</p>
      <p class="empty-hint">Model stats are aggregated from session analysis</p>
    </div>
  {:else}
    <div class="stats-list">
      {#each modelStats as stat}
        <div class="stat-card">
          <div class="stat-header">
            <code class="model-name">{stat.model}</code>
            <span class="last-used">
              <Clock size={14} />
              {formatDistanceToNow(parseDate(stat.lastUsed))}
            </span>
          </div>

          <div class="stat-metrics">
            <div class="metric" class:has-issues={stat.quirkCount > 0}>
              <AlertTriangle size={16} />
              <span class="metric-value">{stat.quirkCount}</span>
              <span class="metric-label">Quirks</span>
            </div>

            <div class="metric" class:has-issues={stat.errorCount > 0}>
              <Bug size={16} />
              <span class="metric-value">{stat.errorCount}</span>
              <span class="metric-label">Errors</span>
            </div>

            <div class="metric">
              <span class="metric-value">{formatTokens(stat.totalTokens)}</span>
              <span class="metric-label">Tokens</span>
            </div>

            <div class="metric">
              <span class="metric-value">{stat.totalSessions}</span>
              <span class="metric-label">Sessions</span>
            </div>

            <div class="metric">
              <span class="metric-value">${stat.totalCost.toFixed(2)}</span>
              <span class="metric-label">Cost</span>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .patterns-page {
    max-width: 1000px;
  }

  .page-header {
    margin-bottom: var(--space-4);
  }

  .page-header h1 {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    font-size: var(--text-2xl);
  }

  /* Breadcrumbs */
  .breadcrumbs {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-4);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    margin-bottom: var(--space-4);
  }

  .breadcrumb {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-1) var(--space-2);
    color: var(--color-text-muted);
    font-size: var(--text-sm);
    text-decoration: none;
    border-radius: var(--radius-sm);
  }

  a.breadcrumb:hover {
    background: var(--color-bg-hover);
    color: var(--color-text);
  }

  .breadcrumb.active {
    color: var(--color-accent);
    font-weight: 500;
  }

  .breadcrumb-separator {
    color: var(--color-text-subtle);
  }

  /* States */
  .loading-state,
  .error-state,
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-12);
    text-align: center;
    color: var(--color-text-muted);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    gap: var(--space-4);
  }

  .error-state {
    color: var(--color-error);
  }

  .empty-hint {
    font-size: var(--text-sm);
    color: var(--color-text-subtle);
  }

  :global(.spinner) {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  /* Stats List */
  .stats-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .stat-card {
    padding: var(--space-4);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
  }

  .stat-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-4);
  }

  .model-name {
    font-size: var(--text-lg);
    font-weight: 600;
    color: var(--color-text);
  }

  .last-used {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }

  .stat-metrics {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-6);
  }

  .metric {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    color: var(--color-text-muted);
  }

  .metric.has-issues {
    color: var(--color-warning);
  }

  .metric-value {
    font-size: var(--text-lg);
    font-weight: 600;
    color: var(--color-text);
  }

  .metric.has-issues .metric-value {
    color: var(--color-warning);
  }

  .metric-label {
    font-size: var(--text-sm);
  }

  @media (max-width: 640px) {
    .stat-header {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--space-2);
    }

    .stat-metrics {
      gap: var(--space-4);
    }
  }
</style>
