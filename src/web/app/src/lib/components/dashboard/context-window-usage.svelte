<script lang="ts">
  import { Gauge, AlertTriangle, Activity } from "lucide-svelte";
  import type { DashboardStats } from "$lib/types";

  interface Props {
    stats: DashboardStats;
  }

  const { stats }: Props = $props();

  /**
   * Format percentage for display
   */
  function formatPercent(value: number): string {
    return `${Math.round(value * 100)}%`;
  }

  /**
   * Get color class based on usage level
   */
  function getUsageColorClass(percent: number): string {
    if (percent >= 0.75) {
      return "high";
    }
    if (percent >= 0.5) {
      return "medium";
    }
    return "low";
  }

  /**
   * Format large numbers with K suffix
   */
  function formatTokens(value: number): string {
    if (value >= 1000) {
      return `${Math.round(value / 1000)}K`;
    }
    return value.toString();
  }
</script>

{#if stats.contextWindowUsage && stats.contextWindowUsage.nodesWithData > 0}
  <section class="card context-window-panel">
    <div class="card-header">
      <h2 class="card-title">
        <Gauge size={18} />
        Context Window Usage
      </h2>
    </div>

    <div class="context-content">
      <div class="main-metric">
        <div class="metric-label">Average Usage</div>
        <div class="metric-value-row">
          <span class="metric-value {getUsageColorClass(stats.contextWindowUsage.averageUsagePercent)}">
            {formatPercent(stats.contextWindowUsage.averageUsagePercent)}
          </span>
          <span class="context-size">
            of {formatTokens(stats.contextWindowUsage.defaultContextWindowSize)} tokens
          </span>
        </div>
      </div>

      <div class="usage-bar">
        <div class="bar-track">
          <div
            class="bar-fill {getUsageColorClass(stats.contextWindowUsage.averageUsagePercent)}"
            style="width: {Math.min(stats.contextWindowUsage.averageUsagePercent * 100, 100)}%"
          ></div>
          <div class="threshold-marker threshold-50" title="50% threshold"></div>
          <div class="threshold-marker threshold-75" title="75% threshold"></div>
        </div>
      </div>

      <div class="threshold-counts">
        <div class="threshold-item">
          <div class="threshold-header">
            {#if stats.contextWindowUsage.exceeds75PercentCount > 0}
              <AlertTriangle size={14} class="warning-icon" />
            {:else}
              <Activity size={14} />
            {/if}
            <span class="threshold-label">&gt;75% usage</span>
          </div>
          <span class="threshold-count" class:warning={stats.contextWindowUsage.exceeds75PercentCount > 0}>
            {stats.contextWindowUsage.exceeds75PercentCount}
          </span>
        </div>
        <div class="threshold-item">
          <div class="threshold-header">
            <Activity size={14} />
            <span class="threshold-label">&gt;50% usage</span>
          </div>
          <span class="threshold-count">
            {stats.contextWindowUsage.exceeds50PercentCount}
          </span>
        </div>
      </div>

      <div class="data-note">
        Based on {stats.contextWindowUsage.nodesWithData} analyzed sessions
      </div>
    </div>
  </section>
{/if}

<style>
  .context-window-panel {
    display: flex;
    flex-direction: column;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-4);
  }

  .card-header .card-title {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-lg);
    font-weight: 600;
  }

  .context-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .main-metric {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .metric-label {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }

  .metric-value-row {
    display: flex;
    align-items: baseline;
    gap: var(--space-2);
  }

  .metric-value {
    font-size: var(--text-3xl);
    font-weight: 600;
  }

  .metric-value.low {
    color: var(--color-success);
  }

  .metric-value.medium {
    color: var(--color-warning);
  }

  .metric-value.high {
    color: var(--color-error);
  }

  .context-size {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }

  .usage-bar {
    padding: var(--space-2) 0;
  }

  .bar-track {
    position: relative;
    height: 8px;
    background: var(--color-bg-hover);
    border-radius: var(--radius-sm);
    overflow: visible;
  }

  .bar-fill {
    height: 100%;
    border-radius: var(--radius-sm);
    transition: width 0.3s ease;
  }

  .bar-fill.low {
    background: var(--color-success);
  }

  .bar-fill.medium {
    background: var(--color-warning);
  }

  .bar-fill.high {
    background: var(--color-error);
  }

  .threshold-marker {
    position: absolute;
    top: -2px;
    bottom: -2px;
    width: 2px;
    background: var(--color-text-subtle);
    opacity: 0.5;
  }

  .threshold-50 {
    left: 50%;
  }

  .threshold-75 {
    left: 75%;
  }

  .threshold-counts {
    display: flex;
    gap: var(--space-6);
  }

  .threshold-item {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .threshold-header {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    color: var(--color-text-muted);
  }

  :global(.threshold-header .warning-icon) {
    color: var(--color-warning);
  }

  .threshold-label {
    font-size: var(--text-xs);
  }

  .threshold-count {
    font-size: var(--text-xl);
    font-weight: 600;
  }

  .threshold-count.warning {
    color: var(--color-warning);
  }

  .data-note {
    font-size: var(--text-xs);
    color: var(--color-text-subtle);
    padding-top: var(--space-2);
    border-top: 1px solid var(--color-border-subtle);
  }
</style>
