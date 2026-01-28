<svelte:head>
  <title>Lesson Patterns - pi-brain</title>
  <meta name="description" content="Aggregated lesson patterns from sessions" />
</svelte:head>

<script lang="ts">
  import { onMount } from "svelte";
  import { api, getErrorMessage, isBackendOffline } from "$lib/api/client";
  import { formatDistanceToNow, parseDate } from "$lib/utils/date";
  import {
    Lightbulb,
    AlertCircle,
    Loader2,
    Clock,
    Home,
    ChevronRight,
    BookOpen,
  } from "lucide-svelte";
  import type { AggregatedLessonPattern } from "$lib/types";

  let loading = $state(true);
  let errorMessage = $state<string | null>(null);
  let patterns = $state<AggregatedLessonPattern[]>([]);

  async function loadData() {
    loading = true;
    errorMessage = null;
    try {
      patterns = await api.getLessonPatterns({ limit: 100 });
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

  function getLevelColor(level: string): string {
    switch (level) {
      case "critical": {
        return "level-critical";
      }
      case "important": {
        return "level-important";
      }
      case "minor": {
        return "level-minor";
      }
      default: {
        return "level-default";
      }
    }
  }
</script>

<div class="patterns-page">
  <header class="page-header">
    <h1>
      <Lightbulb size={24} />
      Lesson Patterns
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
      <Lightbulb size={14} />
      <span>Lesson Patterns</span>
    </span>
  </nav>

  {#if loading}
    <div class="loading-state" role="status" aria-live="polite">
      <Loader2 size={32} class="spinner" />
      <p>Loading lesson patterns...</p>
    </div>
  {:else if errorMessage}
    <div class="error-state">
      <AlertCircle size={32} />
      <p>{errorMessage}</p>
      <button class="btn-primary" onclick={() => loadData()}>
        Retry
      </button>
    </div>
  {:else if patterns.length === 0}
    <div class="empty-state">
      <Lightbulb size={48} />
      <p>No lesson patterns recorded yet</p>
      <p class="empty-hint">Lesson patterns are aggregated from session analysis</p>
    </div>
  {:else}
    <div class="patterns-list">
      {#each patterns as pattern}
        <div class="pattern-card">
          <div class="pattern-header">
            <BookOpen size={18} class="pattern-icon" />
            <span class="pattern-title">{pattern.pattern}</span>
            <span class="pattern-count">{pattern.occurrences}×</span>
          </div>

          <div class="pattern-meta">
            <span class="level-badge {getLevelColor(pattern.level)}">
              {pattern.level}
            </span>
            <span class="meta-item">
              <Clock size={14} />
              Last seen {formatDistanceToNow(parseDate(pattern.lastSeen))}
            </span>
          </div>

          {#if pattern.tags && pattern.tags.length > 0}
            <div class="pattern-tags">
              {#each pattern.tags as tag}
                <span class="tag">{tag}</span>
              {/each}
            </div>
          {/if}
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

  /* Patterns List */
  .patterns-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .pattern-card {
    padding: var(--space-4);
    background: rgba(34, 197, 94, 0.05);
    border: 1px solid var(--color-border);
    border-left: 3px solid var(--color-success);
    border-radius: var(--radius-lg);
  }

  .pattern-header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-3);
    color: var(--color-success);
  }

  .pattern-icon {
    flex-shrink: 0;
  }

  .pattern-title {
    flex: 1;
    font-weight: 600;
    color: var(--color-text);
  }

  .pattern-count {
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--color-success);
  }

  .pattern-meta {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    margin-bottom: var(--space-3);
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }

  .meta-item {
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }

  .level-badge {
    padding: 2px 8px;
    border-radius: var(--radius-sm);
    font-size: var(--text-xs);
    font-weight: 500;
    text-transform: capitalize;
  }

  .level-critical {
    background: #ef444420;
    color: var(--color-error);
  }

  .level-important {
    background: #eab30820;
    color: var(--color-warning);
  }

  .level-minor {
    background: var(--color-bg-hover);
    color: var(--color-text-muted);
  }

  .level-default {
    background: var(--color-bg-hover);
    color: var(--color-text-muted);
  }

  .pattern-tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .tag {
    padding: 2px 6px;
    background: var(--color-accent-muted);
    color: var(--color-accent);
    border-radius: var(--radius-sm);
    font-size: var(--text-xs);
  }
</style>
