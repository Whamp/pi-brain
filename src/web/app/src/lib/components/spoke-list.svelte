<script lang="ts">
  import { Plus, Pencil, Trash2, Server, RefreshCw, Globe, Power, PowerOff } from "lucide-svelte";
  import type { SpokeConfig } from "$lib/types";

  interface Props {
    spokes: SpokeConfig[];
    loading?: boolean;
    onadd: () => void;
    onedit: (spoke: SpokeConfig) => void;
    ondelete: (spoke: SpokeConfig) => void;
    ontoggle: (spoke: SpokeConfig, enabled: boolean) => void;
  }

  const {
    spokes = [],
    loading = false,
    onadd,
    onedit,
    ondelete,
    ontoggle,
  }: Props = $props();

  function getSyncMethodIcon(method: string) {
    switch (method) {
      case "syncthing": {
        return RefreshCw;
      }
      case "rsync": {
        return Server;
      }
      case "api": {
        return Globe;
      }
      default: {
        return Server;
      }
    }
  }

  function getSyncMethodLabel(method: string) {
    switch (method) {
      case "syncthing": {
        return "Syncthing";
      }
      case "rsync": {
        return "Rsync";
      }
      case "api": {
        return "API";
      }
      default: {
        return method;
      }
    }
  }
</script>

<div class="spoke-list">
  <div class="spoke-list-header">
    <div class="header-content">
      <h3>Remote Spokes</h3>
      <span class="count">{spokes.length} configured</span>
    </div>
    <button
      type="button"
      class="btn-add"
      onclick={onadd}
      disabled={loading}
    >
      <Plus size={16} />
      Add Spoke
    </button>
  </div>

  {#if loading}
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading spokes...</p>
    </div>
  {:else if spokes.length === 0}
    <div class="empty-state">
      <Server size={40} />
      <h4>No Spokes Configured</h4>
      <p>Add a spoke to sync session files from another computer.</p>
      <button
        type="button"
        class="btn-primary"
        onclick={onadd}
      >
        <Plus size={16} />
        Add First Spoke
      </button>
    </div>
  {:else}
    <div class="spoke-items">
      {#each spokes as spoke (spoke.name)}
        {@const SyncIcon = getSyncMethodIcon(spoke.syncMethod)}
        <div class="spoke-item" class:disabled={!spoke.enabled}>
          <div class="spoke-info">
            <div class="spoke-header">
              <span class="spoke-name">{spoke.name}</span>
              <span class="spoke-method">
                <SyncIcon size={14} />
                {getSyncMethodLabel(spoke.syncMethod)}
              </span>
              {#if spoke.enabled}
                <span class="status-badge enabled">
                  <Power size={12} />
                  Active
                </span>
              {:else}
                <span class="status-badge disabled">
                  <PowerOff size={12} />
                  Disabled
                </span>
              {/if}
            </div>
            <div class="spoke-path">{spoke.path}</div>
            {#if spoke.source}
              <div class="spoke-source">
                <span class="label">Source:</span> {spoke.source}
              </div>
            {/if}
            {#if spoke.schedule}
              <div class="spoke-schedule">
                <span class="label">Schedule:</span> <code>{spoke.schedule}</code>
              </div>
            {/if}
          </div>
          <div class="spoke-actions">
            <button
              type="button"
              class="action-btn"
              onclick={() => ontoggle(spoke, !spoke.enabled)}
              title={spoke.enabled ? "Disable spoke" : "Enable spoke"}
            >
              {#if spoke.enabled}
                <PowerOff size={16} />
              {:else}
                <Power size={16} />
              {/if}
            </button>
            <button
              type="button"
              class="action-btn"
              onclick={() => onedit(spoke)}
              title="Edit spoke"
            >
              <Pencil size={16} />
            </button>
            <button
              type="button"
              class="action-btn danger"
              onclick={() => ondelete(spoke)}
              title="Delete spoke"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .spoke-list {
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }

  .spoke-list-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4);
    border-bottom: 1px solid var(--color-border);
  }

  .header-content {
    display: flex;
    align-items: baseline;
    gap: var(--space-3);
  }

  .header-content h3 {
    font-size: var(--text-lg);
    font-weight: 600;
    margin: 0;
  }

  .count {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }

  .btn-add {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    background: var(--color-accent);
    border: 1px solid var(--color-accent);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    font-weight: 500;
    color: white;
    cursor: pointer;
    transition: background 0.15s ease;
  }

  .btn-add:hover:not(:disabled) {
    background: var(--color-accent-hover);
  }

  .btn-add:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-8);
    color: var(--color-text-muted);
  }

  .spinner {
    width: 24px;
    height: 24px;
    border: 3px solid var(--color-border);
    border-top-color: var(--color-accent);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-8);
    text-align: center;
    color: var(--color-text-muted);
  }

  .empty-state h4 {
    font-size: var(--text-base);
    font-weight: 600;
    margin: 0;
    color: var(--color-text);
  }

  .empty-state p {
    margin: 0;
    font-size: var(--text-sm);
  }

  .btn-primary {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    background: var(--color-accent);
    border: 1px solid var(--color-accent);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    font-weight: 500;
    color: white;
    cursor: pointer;
    transition: background 0.15s ease;
    margin-top: var(--space-2);
  }

  .btn-primary:hover {
    background: var(--color-accent-hover);
  }

  .spoke-items {
    display: flex;
    flex-direction: column;
  }

  .spoke-item {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-4);
    padding: var(--space-4);
    border-bottom: 1px solid var(--color-border);
    transition: background 0.15s ease;
  }

  .spoke-item:last-child {
    border-bottom: none;
  }

  .spoke-item:hover {
    background: var(--color-bg-hover);
  }

  .spoke-item.disabled {
    opacity: 0.6;
  }

  .spoke-info {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    min-width: 0;
    flex: 1;
  }

  .spoke-header {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    flex-wrap: wrap;
  }

  .spoke-name {
    font-weight: 600;
    color: var(--color-text);
  }

  .spoke-method {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    padding: var(--space-1) var(--space-2);
    background: var(--color-bg);
    border-radius: var(--radius-sm);
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    font-size: var(--text-xs);
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);
  }

  .status-badge.enabled {
    color: var(--color-success);
    background: var(--color-success-muted, rgba(34, 197, 94, 0.1));
  }

  .status-badge.disabled {
    color: var(--color-text-muted);
    background: var(--color-bg);
  }

  .spoke-path {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    font-family: var(--font-mono);
    word-break: break-all;
  }

  .spoke-source,
  .spoke-schedule {
    font-size: var(--text-xs);
    color: var(--color-text-subtle);
  }

  .spoke-source .label,
  .spoke-schedule .label {
    color: var(--color-text-muted);
  }

  .spoke-schedule code {
    font-family: var(--font-mono);
    padding: var(--space-1);
    background: var(--color-bg);
    border-radius: var(--radius-sm);
  }

  .spoke-actions {
    display: flex;
    gap: var(--space-2);
    flex-shrink: 0;
  }

  .action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: transparent;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    color: var(--color-text-muted);
    cursor: pointer;
    transition: color 0.15s ease, border-color 0.15s ease, background 0.15s ease;
  }

  .action-btn:hover {
    color: var(--color-text);
    border-color: var(--color-text-muted);
    background: var(--color-bg);
  }

  .action-btn.danger:hover {
    color: var(--color-error);
    border-color: var(--color-error);
  }
</style>
