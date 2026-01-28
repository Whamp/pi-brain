<script lang="ts">
  import { onMount } from "svelte";
  import {
    RefreshCw,
    AlertTriangle,
    FileText,
    ChevronRight,
  } from "lucide-svelte";
  import { api, getErrorMessage, isBackendOffline } from "$lib/api/client";
  import { formatDistanceToNow, parseDate } from "$lib/utils/date";
  import type { AbandonedRestartPattern, FrictionSummary } from "$lib/types";
  import Spinner from "$lib/components/spinner.svelte";

  // State
  let patterns: AbandonedRestartPattern[] = [];
  let summary: FrictionSummary | null = null;
  let loading = true;
  let errorMessage: string | null = null;

  onMount(async () => {
    await loadData();
  });

  async function loadData() {
    loading = true;
    errorMessage = null;
    try {
      const [patternsResult, summaryResult] = await Promise.allSettled([
        api.getAbandonedRestarts({ limit: 5 }),
        api.getFrictionSummary(),
      ]);

      if (patternsResult.status === "fulfilled") {
        ({ patterns } = patternsResult.value);
      }
      if (summaryResult.status === "fulfilled") {
        summary = summaryResult.value;
      }

      // Only show error if both calls failed
      if (
        patternsResult.status === "rejected" &&
        summaryResult.status === "rejected"
      ) {
        const firstError = patternsResult.reason;
        errorMessage = isBackendOffline(firstError)
          ? "Backend is offline"
          : getErrorMessage(firstError);
      }
    } catch (error) {
      console.error("Failed to load friction data:", error);
      errorMessage = isBackendOffline(error)
        ? "Backend is offline"
        : getErrorMessage(error);
    } finally {
      loading = false;
    }
  }

  function getProjectName(project: string): string {
    return project.split("/").pop() ?? project;
  }

  function formatFrictionScore(score: number): string {
    return `${(score * 100).toFixed(0)}%`;
  }

  function truncateSummary(text: string, maxLen = 50): string {
    if (text.length <= maxLen) {
      return text;
    }
    return `${text.slice(0, maxLen).trim()}...`;
  }
</script>

<section class="card abandoned-restarts-panel">
  <div class="card-header">
    <h2 class="card-title">
      <RefreshCw size={18} />
      Abandoned Restarts
    </h2>
    {#if summary && summary.abandonedRestartCount > 0}
      <span class="count-badge">{summary.abandonedRestartCount}</span>
    {/if}
  </div>

  {#if errorMessage}
    <div class="error-message">
      <AlertTriangle size={16} />
      {errorMessage}
    </div>
  {:else if loading}
    <div class="loading-state">
      <Spinner message="Loading friction patterns..." />
    </div>
  {:else if patterns.length === 0}
    <div class="empty-state">
      <RefreshCw size={32} />
      <p>No abandoned restart patterns detected</p>
      <span class="empty-hint"
        >This is good! Users aren't abandoning and restarting tasks.</span
      >
    </div>
  {:else}
    <div class="patterns-content">
      {#if summary}
        <div class="friction-stats">
          <div class="stat-item">
            <span class="stat-value">{summary.abandonedRestartCount}</span>
            <span class="stat-label">Abandoned Restarts</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{summary.toolLoopCount}</span>
            <span class="stat-label">Tool Loops</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{summary.rephrasingCascadeCount}</span>
            <span class="stat-label">Rephrasing Cascades</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{summary.highFrictionCount}</span>
            <span class="stat-label">High Friction</span>
          </div>
        </div>
      {/if}

      <div class="patterns-list">
        <span class="section-label">Recent Abandoned Restarts:</span>
        {#each patterns as pattern (pattern.abandonedNodeId)}
          <a
            href="/nodes/{pattern.abandonedNodeId}"
            class="pattern-item"
          >
            <div class="pattern-icon">
              <FileText size={16} />
            </div>
            <div class="pattern-content">
              <div class="pattern-summary">
                {truncateSummary(pattern.abandonedSummary)}
              </div>
              <div class="pattern-meta">
                <span class="pattern-project"
                  >{getProjectName(pattern.abandonedProject)}</span
                >
                {#if pattern.model}
                  <span class="separator">•</span>
                  <code class="pattern-model">{pattern.model}</code>
                {/if}
                <span class="separator">•</span>
                <span class="pattern-time">
                  {formatDistanceToNow(parseDate(pattern.abandonedTimestamp))}
                </span>
                <span class="separator">•</span>
                <span
                  class="friction-score"
                  class:high={pattern.frictionScore > 0.5}
                  class:medium={pattern.frictionScore > 0.3 &&
                    pattern.frictionScore <= 0.5}
                >
                  {formatFrictionScore(pattern.frictionScore)} friction
                </span>
              </div>
            </div>
            <ChevronRight size={16} class="pattern-arrow" />
          </a>
        {/each}
      </div>

      {#if summary && summary.modelFriction.length > 0}
        <div class="model-friction">
          <span class="section-label">Models with Most Friction:</span>
          <div class="model-list">
            {#each summary.modelFriction.slice(0, 3) as item}
              <div class="model-item">
                <code>{item.model}</code>
                <span class="model-count">{item.count} events</span>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {/if}
</section>

<style>
  .abandoned-restarts-panel {
    grid-column: 1 / -1;
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .card-title {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex: 1;
  }

  .card-title :global(svg) {
    color: var(--color-warning);
  }

  .count-badge {
    background: var(--color-warning);
    color: var(--color-bg);
    font-size: var(--text-xs);
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 12px;
  }

  .loading-state,
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-8);
    color: var(--color-text-muted);
    text-align: center;
  }

  .empty-state :global(svg) {
    color: var(--color-success);
    margin-bottom: var(--space-3);
    opacity: 0.5;
  }

  .empty-state p {
    font-weight: 500;
    margin-bottom: var(--space-2);
    color: var(--color-success);
  }

  .empty-hint {
    font-size: var(--text-sm);
    color: var(--color-text-subtle);
  }

  .error-message {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-4);
    color: var(--color-error);
    font-size: var(--text-sm);
  }

  .patterns-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .friction-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-3);
    padding: var(--space-3);
    background: var(--color-bg);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border-subtle);
  }

  @media (max-width: 768px) {
    .friction-stats {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-1);
  }

  .stat-value {
    font-size: var(--text-xl);
    font-weight: 600;
    color: var(--color-warning);
  }

  .stat-label {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    text-align: center;
  }

  .section-label {
    font-size: var(--text-xs);
    color: var(--color-text-subtle);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .patterns-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .pattern-item {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
    padding: var(--space-3);
    background: var(--color-bg);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-md);
    text-decoration: none;
    color: inherit;
    transition:
      background var(--transition-fast),
      border-color var(--transition-fast);
  }

  .pattern-item:hover {
    background: var(--color-bg-hover);
    border-color: var(--color-warning);
  }

  .pattern-icon {
    flex-shrink: 0;
    color: var(--color-warning);
    opacity: 0.8;
  }

  .pattern-content {
    flex: 1;
    min-width: 0;
  }

  .pattern-summary {
    font-size: var(--text-sm);
    font-weight: 500;
    margin-bottom: var(--space-1);
    color: var(--color-text);
  }

  .pattern-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-1);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  .separator {
    color: var(--color-text-subtle);
  }

  .pattern-project {
    font-weight: 500;
  }

  .pattern-model {
    font-size: var(--text-xs);
    padding: 1px 4px;
    background: var(--color-bg-hover);
    border-radius: var(--radius-sm);
  }

  .friction-score {
    font-weight: 500;
  }

  .friction-score.high {
    color: var(--color-error);
  }

  .friction-score.medium {
    color: var(--color-warning);
  }

  .pattern-item :global(.pattern-arrow) {
    flex-shrink: 0;
    color: var(--color-text-subtle);
    transition: color var(--transition-fast);
  }

  .pattern-item:hover :global(.pattern-arrow) {
    color: var(--color-warning);
  }

  .model-friction {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .model-list {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .model-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    background: var(--color-bg);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
  }

  .model-item code {
    font-size: var(--text-xs);
    color: var(--color-text);
  }

  .model-count {
    font-size: var(--text-xs);
    color: var(--color-warning);
    font-weight: 500;
  }
</style>
