<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import {
    Sparkles,
    ThumbsUp,
    ThumbsDown,
    Zap,
    AlertTriangle,
    ChevronRight,
    Layers,
    Undo2,
  } from "lucide-svelte";
  import { api, getErrorMessage, isBackendOffline } from "$lib/api/client";
  import { formatDistanceToNow, parseDate } from "$lib/utils/date";
  import type { ClusterWithNodes } from "$lib/types";
  import Spinner from "$lib/components/spinner.svelte";
  import LoadingState from "$lib/components/loading-state.svelte";
  import EmptyState from "$lib/components/empty-state.svelte";
  import Tag from "$lib/components/tag.svelte";

  // Undo delay in milliseconds
  const UNDO_DELAY_MS = 5000;

  // Pending action type
  interface PendingAction {
    clusterId: string;
    action: "confirmed" | "dismissed";
    timeoutId: ReturnType<typeof setTimeout>;
    startTime: number;
  }

  // State
  let clusters: ClusterWithNodes[] = [];
  let loading = true;
  let errorMessage: string | null = null;
  let processingIds = new Set<string>();
  let actionErrors = new Map<string, string>();
  let pendingActions = new Map<string, PendingAction>();

  /** Clear action error after a delay */
  function clearActionError(clusterId: string, delayMs = 3000) {
    setTimeout(() => {
      actionErrors.delete(clusterId);
      actionErrors = new Map(actionErrors);
    }, delayMs);
  }

  /** Clean up all pending timeouts on destroy */
  onDestroy(() => {
    for (const pending of pendingActions.values()) {
      clearTimeout(pending.timeoutId);
    }
  });

  onMount(async () => {
    await loadClusters();
  });

  async function loadClusters() {
    loading = true;
    errorMessage = null;
    try {
      const { clusters: loadedClusters } = await api.getClusterFeed(10);
      clusters = loadedClusters;
    } catch (error) {
      console.error("Failed to load clusters:", error);
      errorMessage = isBackendOffline(error)
        ? "Backend is offline"
        : getErrorMessage(error);
    } finally {
      loading = false;
    }
  }

  /** Commit the pending action to the API */
  async function commitAction(clusterId: string, action: "confirmed" | "dismissed") {
    processingIds = new Set([...processingIds, clusterId]);
    try {
      await api.updateClusterStatus(clusterId, action);
      // Remove from list after successful action
      clusters = clusters.filter((c) => c.id !== clusterId);
      pendingActions.delete(clusterId);
      pendingActions = new Map(pendingActions);
    } catch (error) {
      console.error(`Failed to ${action} cluster:`, error);
      actionErrors.set(clusterId, `Failed to ${action}`);
      actionErrors = new Map(actionErrors);
      clearActionError(clusterId);
      // Clear pending state so user can retry
      pendingActions.delete(clusterId);
      pendingActions = new Map(pendingActions);
    } finally {
      processingIds.delete(clusterId);
      processingIds = new Set(processingIds);
    }
  }

  /** Start a pending action with undo window */
  function startPendingAction(clusterId: string, action: "confirmed" | "dismissed") {
    // Clear any existing pending action
    const existing = pendingActions.get(clusterId);
    if (existing) {
      clearTimeout(existing.timeoutId);
    }

    // Set up new pending action
    const timeoutId = setTimeout(() => {
      commitAction(clusterId, action);
    }, UNDO_DELAY_MS);

    pendingActions.set(clusterId, {
      clusterId,
      action,
      timeoutId,
      startTime: Date.now(),
    });
    pendingActions = new Map(pendingActions);
  }

  /** Undo a pending action */
  function handleUndo(clusterId: string) {
    const pending = pendingActions.get(clusterId);
    if (pending) {
      clearTimeout(pending.timeoutId);
      pendingActions.delete(clusterId);
      pendingActions = new Map(pendingActions);
    }
  }

  function handleConfirm(clusterId: string) {
    startPendingAction(clusterId, "confirmed");
  }

  function handleDismiss(clusterId: string) {
    startPendingAction(clusterId, "dismissed");
  }

  function getSignalIcon(signalType: "friction" | "delight" | null) {
    if (signalType === "friction") {
      return AlertTriangle;
    }
    if (signalType === "delight") {
      return Zap;
    }
    return Layers;
  }

  function getSignalColor(signalType: "friction" | "delight" | null) {
    if (signalType === "friction") {
      return "var(--color-warning)";
    }
    if (signalType === "delight") {
      return "var(--color-success)";
    }
    return "var(--color-accent)";
  }

  function getSignalLabel(signalType: "friction" | "delight" | null) {
    if (signalType === "friction") {
      return "Friction Pattern";
    }
    if (signalType === "delight") {
      return "Delight Pattern";
    }
    return "Discovered Pattern";
  }

  function truncateSummary(summary: string, maxLen = 60): string {
    if (summary.length <= maxLen) {
      return summary;
    }
    return `${summary.slice(0, maxLen).trim()}...`;
  }

  function getActionLabel(action: "confirmed" | "dismissed"): string {
    return action === "confirmed" ? "Confirmed" : "Dismissed";
  }
</script>

<section class="card news-feed-panel">
  <div class="card-header">
    <h2 class="card-title">
      <Sparkles size={18} />
      News Feed
    </h2>
    {#if clusters.length > 0}
      <a href="/clusters" class="view-all">View all →</a>
    {/if}
  </div>

  {#if errorMessage}
    <div class="error-message">
      <AlertTriangle size={16} />
      {errorMessage}
    </div>
  {:else if loading}
    <LoadingState message="Discovering patterns..." size="md" variant="sm" />
  {:else if clusters.length === 0}
    <EmptyState
      icon={Sparkles}
      title="No new patterns discovered yet"
      description="Clusters will appear here after nightly analysis"
      size="sm"
    />
  {:else}
    <div class="clusters-list">
      {#each clusters as cluster (cluster.id)}
        {@const isProcessing = processingIds.has(cluster.id)}
        {@const actionError = actionErrors.get(cluster.id)}
        {@const pending = pendingActions.get(cluster.id)}
        {@const SignalIcon = getSignalIcon(cluster.signalType)}
        <article
          class="cluster-card"
          class:pending-action={pending}
          data-signal={cluster.signalType ?? "neutral"}
        >
          {#if pending}
            <!-- Pending action overlay -->
            <div class="pending-overlay">
              <div class="pending-content">
                <span class="pending-label">{getActionLabel(pending.action)}</span>
                <button
                  class="undo-btn"
                  onclick={() => handleUndo(cluster.id)}
                  disabled={isProcessing}
                >
                  <Undo2 size={16} />
                  <span>Undo</span>
                </button>
              </div>
              <div class="pending-timer">
                <div class="timer-bar"></div>
              </div>
            </div>
          {:else}
            <header class="cluster-header">
              <div class="cluster-signal" style="color: {getSignalColor(cluster.signalType)}">
                <SignalIcon size={16} />
                <span class="signal-label">{getSignalLabel(cluster.signalType)}</span>
              </div>
              {#if cluster.relatedModel}
                <span class="cluster-model">
                  <code>{cluster.relatedModel}</code>
                </span>
              {/if}
            </header>

            <h3 class="cluster-name">{cluster.name}</h3>

            {#if cluster.description}
              <p class="cluster-description">{cluster.description}</p>
            {/if}

            {#if cluster.nodes && cluster.nodes.length > 0}
              <div class="cluster-examples">
                <span class="examples-label">Examples ({cluster.nodeCount} nodes):</span>
                <ul class="example-list">
                  {#each cluster.nodes.slice(0, 3) as node}
                    <li class="example-item">
                      <a href="/nodes/{node.nodeId}" class="example-link">
                        <ChevronRight size={14} />
                        <span class="example-summary">
                          {truncateSummary(node.summary ?? "No summary")}
                        </span>
                        {#if node.project}
                          <Tag 
                            text={node.project.split("/").pop()} 
                            variant="auto" 
                            className="example-project" 
                          />
                        {/if}
                      </a>
                    </li>
                  {/each}
                </ul>
              </div>
            {/if}

            <footer class="cluster-footer">
              {#if actionError}
                <span class="action-error">
                  <AlertTriangle size={12} />
                  {actionError}
                </span>
              {:else}
                <span class="cluster-time">
                  Discovered {formatDistanceToNow(parseDate(cluster.createdAt))}
                </span>
              {/if}
              <div class="cluster-actions">
                <button
                  class="action-btn confirm"
                  onclick={() => handleConfirm(cluster.id)}
                  disabled={isProcessing}
                  title="Confirm this pattern"
                >
                  <ThumbsUp size={16} />
                  {#if isProcessing}
                    <span>...</span>
                  {:else}
                    <span>Confirm</span>
                  {/if}
                </button>
                <button
                  class="action-btn dismiss"
                  onclick={() => handleDismiss(cluster.id)}
                  disabled={isProcessing}
                  title="Dismiss this pattern"
                >
                  <ThumbsDown size={16} />
                  <span>Dismiss</span>
                </button>
              </div>
            </footer>
          {/if}
        </article>
      {/each}
    </div>
  {/if}
</section>

<style>
  .news-feed-panel {
    grid-column: 1 / -1;
  }

  .card-title {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .card-title :global(svg) {
    color: var(--color-accent);
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
    color: var(--color-text-subtle);
    margin-bottom: var(--space-3);
    opacity: 0.5;
  }

  .empty-state p {
    font-weight: 500;
    margin-bottom: var(--space-2);
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

  .clusters-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .cluster-card {
    position: relative;
    padding: var(--space-4);
    background: var(--color-bg);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-lg);
    transition: border-color var(--transition-fast);
    overflow: hidden;
  }

  .cluster-card:hover {
    border-color: var(--color-border);
  }

  .cluster-card[data-signal="friction"] {
    border-left: 3px solid var(--color-warning);
  }

  .cluster-card[data-signal="delight"] {
    border-left: 3px solid var(--color-success);
  }

  .cluster-card[data-signal="neutral"] {
    border-left: 3px solid var(--color-accent);
  }

  /* Pending action state */
  .cluster-card.pending-action {
    opacity: 0.8;
    background: var(--color-bg-elevated);
  }

  .pending-overlay {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-4) 0;
  }

  .pending-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .pending-label {
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--color-text-muted);
  }

  .undo-btn {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-2) var(--space-3);
    font-size: var(--text-sm);
    font-weight: 600;
    border: 1px solid var(--color-accent);
    border-radius: var(--radius-md);
    background: var(--color-accent-muted);
    color: var(--color-accent);
    cursor: pointer;
    transition:
      background var(--transition-fast),
      border-color var(--transition-fast);
  }

  .undo-btn:hover:not(:disabled) {
    background: var(--color-accent);
    color: var(--color-text);
  }

  .undo-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .pending-timer {
    height: 3px;
    background: var(--color-border-subtle);
    border-radius: 2px;
    overflow: hidden;
  }

  .timer-bar {
    height: 100%;
    background: var(--color-accent);
    width: 100%;
    animation: timer-shrink 5s linear forwards;
  }

  @keyframes timer-shrink {
    from {
      width: 100%;
    }
    to {
      width: 0%;
    }
  }

  .cluster-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-2);
  }

  .cluster-signal {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    font-size: var(--text-xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .cluster-model code {
    font-size: var(--text-xs);
    padding: 2px 6px;
    background: var(--color-bg-hover);
    border-radius: var(--radius-sm);
    color: var(--color-text-muted);
  }

  .cluster-name {
    font-size: var(--text-lg);
    font-weight: 600;
    margin-bottom: var(--space-2);
    color: var(--color-text);
  }

  .cluster-description {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    line-height: 1.5;
    margin-bottom: var(--space-3);
  }

  .cluster-examples {
    margin-bottom: var(--space-3);
  }

  .examples-label {
    font-size: var(--text-xs);
    color: var(--color-text-subtle);
    font-weight: 500;
    margin-bottom: var(--space-2);
    display: block;
  }

  .example-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .example-item {
    font-size: var(--text-sm);
  }

  .example-link {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    color: var(--color-text-muted);
    text-decoration: none;
    padding: var(--space-1) 0;
    transition: color var(--transition-fast);
  }

  .example-link:hover {
    color: var(--color-accent);
  }

  .example-link :global(svg) {
    flex-shrink: 0;
    color: var(--color-text-subtle);
  }

  .example-summary {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .cluster-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: var(--space-3);
    border-top: 1px solid var(--color-border-subtle);
  }

  .cluster-time {
    font-size: var(--text-xs);
    color: var(--color-text-subtle);
  }

  .action-error {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    font-size: var(--text-xs);
    color: var(--color-error);
    animation: fade-in 0.2s ease-out;
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .cluster-actions {
    display: flex;
    gap: var(--space-2);
  }

  .action-btn {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-1) var(--space-2);
    font-size: var(--text-sm);
    font-weight: 500;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-bg);
    color: var(--color-text-muted);
    cursor: pointer;
    transition:
      background var(--transition-fast),
      border-color var(--transition-fast),
      color var(--transition-fast);
  }

  .action-btn:hover:not(:disabled) {
    background: var(--color-bg-hover);
  }

  .action-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .action-btn.confirm:hover:not(:disabled) {
    border-color: var(--color-success);
    color: var(--color-success);
  }

  .action-btn.dismiss:hover:not(:disabled) {
    border-color: var(--color-error);
    color: var(--color-error);
  }

  @media (max-width: 640px) {
    .cluster-header {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--space-2);
    }

    .cluster-footer {
      flex-direction: column;
      gap: var(--space-3);
      align-items: flex-start;
    }

    .cluster-actions {
      width: 100%;
    }

    .action-btn {
      flex: 1;
      justify-content: center;
    }

    .pending-content {
      flex-direction: column;
      gap: var(--space-3);
      align-items: flex-start;
    }

    .undo-btn {
      width: 100%;
      justify-content: center;
    }
  }
</style>
