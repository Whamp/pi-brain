<script lang="ts">
  import { Play, Square, Zap, RefreshCw } from "lucide-svelte";
  import { api, getErrorMessage } from "$lib/api/client";
  import { daemonStore } from "$lib/stores/daemon";
  import Card from "$lib/components/card.svelte";
  import CardHeader from "$lib/components/card-header.svelte";
  import StatusDot from "$lib/components/status-dot.svelte";

  let isLoading = $state(false);
  let actionMessage = $state<string | null>(null);
  let showMessage = $state(false);

  function showTemporaryMessage(message: string) {
    actionMessage = message;
    showMessage = true;
    setTimeout(() => {
      showMessage = false;
    }, 3000);
  }

  async function handleTriggerAnalysis() {
    if (isLoading) {
      return;
    }
    isLoading = true;
    actionMessage = null;

    try {
      // Trigger a reanalysis of recent sessions
      // This queues all unanalyzed sessions for analysis
      const queueRes = await api.getQueueStatus("pending", 1);

      if (queueRes.stats.pending === 0) {
        showTemporaryMessage("No pending sessions to analyze");
        return;
      }

      showTemporaryMessage("Analysis triggered - check queue status");

      // Refresh daemon status
      await daemonStore.loadStatus();
    } catch (error) {
      const message = getErrorMessage(error);
      showTemporaryMessage(message);
    } finally {
      isLoading = false;
    }
  }

  function handleToggleDaemon() {
    if (isLoading) {
      return;
    }
    isLoading = true;
    actionMessage = null;

    const isRunning = $daemonStore.status?.running;

    try {
      if (isRunning) {
        // For stopping daemon, we need to use the CLI
        showTemporaryMessage("Use 'pi-brain daemon stop' to stop the daemon");
      } else {
        // For starting daemon, we need to use the CLI
        showTemporaryMessage("Use 'pi-brain daemon start' to start the daemon");
      }
    } catch (error) {
      const message = getErrorMessage(error);
      showTemporaryMessage(message);
    } finally {
      isLoading = false;
    }
  }

  async function handleRefreshStatus() {
    if (isLoading) {
      return;
    }
    isLoading = true;
    actionMessage = null;

    try {
      await daemonStore.loadStatus();
      showTemporaryMessage("Status refreshed");
    } catch (error) {
      const message = getErrorMessage(error);
      showTemporaryMessage(message);
    } finally {
      isLoading = false;
    }
  }

  function getDaemonStatusText(): string {
    if ($daemonStore.loading) {
      return "Checking...";
    }
    if ($daemonStore.backendOffline) {
      return "Backend offline";
    }
    if (!$daemonStore.status) {
      return "Unknown";
    }
    return $daemonStore.status.running ? "Running" : "Stopped";
  }

  function getDaemonStatusClass(): string {
    if ($daemonStore.loading) {
      return "loading";
    }
    if ($daemonStore.backendOffline) {
      return "offline";
    }
    if (!$daemonStore.status) {
      return "unknown";
    }
    return $daemonStore.status.running ? "running" : "stopped";
  }
</script>

<Card tag="section" variant="featured" class="quick-actions-panel">
  <CardHeader title="Quick Actions" />

  <div class="quick-actions">
    <!-- Daemon Status & Control -->
    <div class="action-group daemon-control">
      <div class="action-label">Daemon</div>
      <div class="daemon-status-badge {getDaemonStatusClass()}">
        <StatusDot
          status={$daemonStore.status?.running ? 'success' : ($daemonStore.backendOffline ? 'error' : 'neutral')}
          size={10}
        />
        <span>{getDaemonStatusText()}</span>
      </div>
      <div class="action-buttons">
        <button
          class="btn btn-sm btn-outline"
          onclick={handleToggleDaemon}
          disabled={isLoading}
          title="{$daemonStore.status?.running ? 'Stop daemon (use CLI)' : 'Start daemon (use CLI)'}"
        >
          {#if $daemonStore.status?.running}
            <Square size={14} />
            Stop
          {:else}
            <Play size={14} />
            Start
          {/if}
        </button>
        <button
          class="btn btn-sm btn-text"
          onclick={handleRefreshStatus}
          disabled={isLoading}
          title="Refresh status"
        >
          <span class:spin={isLoading}>
            <RefreshCw size={14} />
          </span>
        </button>
      </div>
    </div>

    <!-- Analysis Trigger -->
    <div class="action-group analysis-trigger">
      <div class="action-label">Analysis</div>
      <div class="queue-info">
        <span class="queue-count">{$daemonStore.status?.queue.pending ?? 0} pending</span>
      </div>
      <button
        class="btn btn-sm btn-primary"
        onclick={handleTriggerAnalysis}
        disabled={isLoading}
        title="Trigger analysis of pending sessions"
      >
        <Zap size={14} />
        Trigger Analysis
      </button>
    </div>

    <!-- Action Message -->
    {#if showMessage && actionMessage}
      <div class="action-message {actionMessage.includes('error') || actionMessage.includes('offline') ? 'error' : 'success'}">
        {actionMessage}
      </div>
    {/if}
  </div>
</Card>

<style>
  .quick-actions {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .action-group {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3);
    background: var(--color-bg-hover);
    border-radius: var(--radius-md);
    transition: border-color var(--transition-fast);
  }

  .action-group:hover {
    border-color: var(--color-border);
  }

  .action-label {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    min-width: 60px;
  }

  /* Daemon Status Badge */
  .daemon-status-badge {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-sm);
    font-weight: 500;
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-full);
    flex: 1;
  }

  .daemon-status-badge.running {
    background: hsla(145, 65%, 52%, 0.1);
    color: var(--color-success);
  }

  .daemon-status-badge.stopped {
    background: hsla(0, 72%, 72%, 0.1);
    color: var(--color-error);
  }

  .daemon-status-badge.offline {
    background: hsla(30, 80%, 60%, 0.1);
    color: hsla(30, 80%, 60%, 1);
  }

  .daemon-status-badge.loading,
  .daemon-status-badge.unknown {
    background: var(--color-bg-elevated);
    color: var(--color-text-muted);
  }

  /* Queue Info */
  .queue-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .queue-count {
    font-size: var(--text-sm);
    font-weight: 500;
  }

  .queue-subtext {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  /* Action Buttons */
  .action-buttons {
    display: flex;
    gap: var(--space-2);
  }

  /* Action Message */
  .action-message {
    font-size: var(--text-sm);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md);
    text-align: center;
    animation: fade-in 0.3s ease;
  }

  .action-message.success {
    background: hsla(145, 65%, 52%, 0.1);
    color: var(--color-success);
    border: 1px solid hsla(145, 65%, 52%, 0.2);
  }

  .action-message.error {
    background: hsla(0, 72%, 72%, 0.1);
    color: var(--color-error);
    border: 1px solid hsla(0, 72%, 72%, 0.2);
  }

  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(-5px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Spin animation for refresh */
  .spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 640px) {
    .action-group {
      flex-wrap: wrap;
    }

    .action-buttons {
      width: 100%;
    }

    .action-buttons .btn {
      flex: 1;
    }
  }
</style>
