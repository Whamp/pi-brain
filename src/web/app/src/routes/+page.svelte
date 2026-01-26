<script lang="ts">
  import { onMount } from "svelte";
  import {
    Activity,
    Zap,
    DollarSign,
    TrendingDown,
    TrendingUp,
    CircleAlert,
    AlertTriangle,
  } from "lucide-svelte";
  import { api } from "$lib/api/client";
  import { formatDistanceToNow, parseDate } from "$lib/utils/date";
  import type { DashboardStats, DaemonStatus, Node } from "$lib/types";

  // State
  let stats: DashboardStats | null = null;
  let recentActivity: Node[] = [];
  let toolErrors: {
    model?: string;
    tool: string;
    errorType: string;
    count: number;
  }[] = [];
  let failurePatterns: {
    tool: string;
    errorType: string;
    count: number;
    models?: string[];
  }[] = [];
  let daemonStatus: DaemonStatus | null = null;
  let loading = true;
  let error: string | null = null;

  onMount(async () => {
    try {
      const [statsRes, toolErrorsRes, activityRes, patternsRes, daemonRes] =
        await Promise.all([
          api.getStats(),
          api.getAggregatedToolErrors({}, { groupByModel: true, limit: 10 }),
          api.listNodes({}, { limit: 5, sort: "timestamp", order: "desc" }),
          api.getAggregatedToolErrors({}, { limit: 3 }),
          api.getDaemonStatus(),
        ]);

      stats = statsRes;
      toolErrors = toolErrorsRes;
      recentActivity = activityRes.nodes;
      failurePatterns = patternsRes;
      daemonStatus = daemonRes;
    } catch (e) {
      console.error("Failed to load dashboard data:", e);
      error = "Failed to load dashboard data. Is the server running?";
    } finally {
      loading = false;
    }
  });

  function getOutcomeIcon(outcome: string | null): string {
    const icons: Record<string, string> = {
      success: "🟢",
      partial: "🟡",
      failed: "🔴",
      abandoned: "⚪",
    };
    return icons[outcome ?? "abandoned"] ?? "⚪";
  }

  function getTrendLabel(change: number): string {
    if (Math.abs(change) < 0.01) return "Stable";
    return change < 0 ? "Improving!" : "Worsening";
  }

  function formatPercent(val: number): string {
    return Math.round(val * 100) + "%";
  }
</script>

<svelte:head>
  <title>Dashboard - pi-brain</title>
  <meta
    name="description"
    content="pi-brain dashboard - view session analytics and insights"
  />
</svelte:head>

<div class="dashboard">
  <header class="page-header">
    <h1>Dashboard</h1>
  </header>

  {#if error}
    <div class="error-banner">
      <AlertTriangle size={20} />
      {error}
    </div>
  {:else if loading}
    <div class="loading">Loading dashboard...</div>
  {:else if stats}
    <!-- Quick Stats -->
    <section class="stats-grid" aria-label="Quick statistics">
      <div class="stat-card">
        <div class="stat-icon">
          <Activity size={20} />
        </div>
        <div class="stat-content">
          <div class="stat-value">{stats.totals.nodes}</div>
          <div class="stat-label">Total Nodes</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon accent">
          <Zap size={20} />
        </div>
        <div class="stat-content">
          <div class="stat-value">{stats.recent.nodesThisWeek}</div>
          <div class="stat-label">This Week</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">
          <Activity size={20} />
        </div>
        <div class="stat-content">
          <div class="stat-value">
            {stats.usage.totalTokens.toLocaleString()}
          </div>
          <div class="stat-label">Total Tokens</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon success">
          <DollarSign size={20} />
        </div>
        <div class="stat-content">
          <div class="stat-value">
            ${stats.usage.totalCost.toFixed(2)}
          </div>
          <div class="stat-label">Total Cost</div>
        </div>
      </div>
    </section>

    <!-- Main Content Grid -->
    <div class="dashboard-grid">
      <!-- Tool Errors Panel -->
      <section class="card tool-errors-panel">
        <div class="card-header">
          <h2 class="card-title">Tool Errors by Model</h2>
          <a href="/search?type=error" class="view-all">View all →</a>
        </div>

        <div class="table-wrapper">
          <table class="data-table" aria-label="Tool errors grouped by model">
            <thead>
              <tr>
                <th>Model</th>
                <th>Tool</th>
                <th>Error</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              {#each toolErrors as error}
                <tr>
                  <td><code>{error.model}</code></td>
                  <td><code>{error.tool}</code></td>
                  <td>{error.errorType}</td>
                  <td class="count">{error.count}</td>
                </tr>
              {/each}
              {#if toolErrors.length === 0}
                <tr>
                  <td colspan="4" class="empty">No errors recorded</td>
                </tr>
              {/if}
            </tbody>
          </table>
        </div>
      </section>

      <!-- Vague Goal Tracker -->
      <section class="card vague-goal-panel">
        <div class="card-header">
          <h2 class="card-title">Vague Goal Tracker</h2>
        </div>

        <div class="vague-goal-content">
          <div class="vague-goal-metric">
            <span class="metric-label">hadClearGoal: false</span>
            <div class="metric-value-row">
              <span class="metric-value"
                >{formatPercent(stats.trends.vagueGoals.thisWeek)}</span
              >
              <span
                class="metric-trend"
                class:improving={stats.trends.vagueGoals.change < 0}
                class:worsening={stats.trends.vagueGoals.change > 0}
              >
                {#if stats.trends.vagueGoals.change < 0}
                  <TrendingDown size={16} />
                {:else if stats.trends.vagueGoals.change > 0}
                  <TrendingUp size={16} />
                {/if}
                {getTrendLabel(stats.trends.vagueGoals.change)}
              </span>
            </div>
          </div>

          <div class="vague-goal-comparison">
            <div class="comparison-item">
              <span class="comparison-label">This week</span>
              <span class="comparison-value"
                >{formatPercent(stats.trends.vagueGoals.thisWeek)}</span
              >
            </div>
            <div class="comparison-item">
              <span class="comparison-label">Last week</span>
              <span class="comparison-value"
                >{formatPercent(stats.trends.vagueGoals.lastWeek)}</span
              >
            </div>
          </div>

          <a href="/search?hadClearGoal=false" class="view-all"
            >View sessions →</a
          >
        </div>
      </section>

      <!-- Recent Activity -->
      <section class="card recent-activity-panel">
        <div class="card-header">
          <h2 class="card-title">Recent Activity</h2>
        </div>

        <ul class="activity-list">
          {#each recentActivity as activity}
            <li class="activity-item">
              <a href="/nodes/{activity.id}" class="activity-link">
                <span class="activity-outcome"
                  >{getOutcomeIcon(activity.content.outcome)}</span
                >
                <div class="activity-content">
                  <span class="activity-summary">{activity.content.summary}</span
                  >
                  <span class="activity-meta">
                    {activity.classification.project?.split("/").pop()} • {formatDistanceToNow(
                      parseDate(activity.metadata.timestamp)
                    )}
                  </span>
                </div>
              </a>
            </li>
          {/each}
          {#if recentActivity.length === 0}
            <li class="empty-activity">No recent activity</li>
          {/if}
        </ul>
      </section>

      <!-- Daemon Status -->
      <section class="card daemon-status-panel">
        <div class="card-header">
          <h2 class="card-title">Daemon Status</h2>
        </div>

        {#if daemonStatus}
          <div class="daemon-info">
            <div class="daemon-row">
              <span class="daemon-label">Status</span>
              <span class="daemon-value">
                <span
                  class="status-dot"
                  class:success={daemonStatus.running}
                  class:error={!daemonStatus.running}
                ></span>
                {daemonStatus.running ? "Running" : "Stopped"}
              </span>
            </div>
            <div class="daemon-row">
              <span class="daemon-label">Started</span>
              <span class="daemon-value">{daemonStatus.uptime ? formatDistanceToNow(new Date(Date.now() - daemonStatus.uptime * 1000)) : "-"}</span>
            </div>
            <div class="daemon-row">
              <span class="daemon-label">Queue</span>
              <span class="daemon-value"
                >{daemonStatus.queue.pending} pending</span
              >
            </div>
            <div class="daemon-row">
              <span class="daemon-label">Workers</span>
              <span class="daemon-value"
                >{daemonStatus.workers.active}/{daemonStatus.workers.total} active</span
              >
            </div>
          </div>
        {:else}
          <div class="daemon-info">
            <div class="daemon-row">
              <span class="daemon-label">Status</span>
              <span class="daemon-value">Unknown</span>
            </div>
          </div>
        {/if}
      </section>
    </div>

    <!-- Failure Patterns (full width) -->
    {#if failurePatterns.length > 0}
      <section class="card failure-patterns-panel">
        <div class="card-header">
          <h2 class="card-title">Failure Pattern Analysis</h2>
          <a href="/search?type=failure" class="view-all">View all →</a>
        </div>

        <div class="patterns-list">
          {#each failurePatterns as pattern}
            <div class="pattern-card error">
              <div class="pattern-header">
                <CircleAlert size={16} />
                <span class="pattern-title"
                  >{pattern.tool} {pattern.errorType}</span
                >
                <span class="pattern-count"
                  >{pattern.count} occurrences</span
                >
              </div>
              <div class="pattern-models">
                Models: {pattern.models?.join(", ") ?? "Unknown"}
              </div>
              <div class="pattern-learning">
                <!-- Learning opportunity is not yet in the API, using placeholder logic -->
                <strong>Learning:</strong>
                {#if pattern.errorType === "exact_match_failed"}
                  Read file before editing to verify exact text
                {:else if pattern.errorType === "timeout"}
                  Use tmux skill for long-running processes
                {:else if pattern.errorType === "file_not_found"}
                  Check file exists before reading/editing
                {:else}
                  Review examples for common causes
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </section>
    {/if}
  {/if}
</div>

<style>
  .dashboard {
    max-width: 1400px;
  }

  .page-header {
    margin-bottom: var(--space-6);
  }

  .page-header h1 {
    font-size: var(--text-2xl);
  }

  .loading,
  .error-banner {
    padding: var(--space-8);
    text-align: center;
    background: var(--color-bg-elevated);
    border-radius: var(--radius-lg);
    border: 1px solid var(--color-border);
  }

  .error-banner {
    color: var(--color-error);
    border-color: var(--color-error);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-3);
  }

  /* Stats Grid */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-4);
    margin-bottom: var(--space-6);
  }

  @media (max-width: 1024px) {
    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 640px) {
    .stats-grid {
      grid-template-columns: 1fr;
    }
  }

  .stat-card {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-4);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
  }

  .stat-icon {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-bg-hover);
    border-radius: var(--radius-md);
    color: var(--color-text-muted);
  }

  .stat-icon.accent {
    background: var(--color-accent-muted);
    color: var(--color-accent);
  }

  .stat-icon.success {
    background: rgba(34, 197, 94, 0.1);
    color: var(--color-success);
  }

  .stat-value {
    font-size: var(--text-2xl);
    font-weight: 600;
  }

  .stat-label {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }

  /* Dashboard Grid */
  .dashboard-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-4);
    margin-bottom: var(--space-4);
  }

  @media (max-width: 1024px) {
    .dashboard-grid {
      grid-template-columns: 1fr;
    }
  }

  .view-all {
    font-size: var(--text-sm);
    color: var(--color-accent);
  }

  /* Tool Errors Table */
  .table-wrapper {
    overflow-x: auto;
  }

  .data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--text-sm);
  }

  .data-table th,
  .data-table td {
    padding: var(--space-2) var(--space-3);
    text-align: left;
    border-bottom: 1px solid var(--color-border-subtle);
  }

  .data-table th {
    color: var(--color-text-muted);
    font-weight: 500;
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .data-table td code {
    font-size: var(--text-xs);
  }

  .data-table .count {
    font-weight: 600;
    color: var(--color-error);
  }

  .empty {
    text-align: center;
    color: var(--color-text-muted);
    padding: var(--space-4);
  }

  /* Vague Goal Panel */
  .vague-goal-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .metric-label {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    font-family: var(--font-mono);
  }

  .metric-value-row {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    margin-top: var(--space-2);
  }

  .metric-value {
    font-size: var(--text-3xl);
    font-weight: 600;
  }

  .metric-trend {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    font-size: var(--text-sm);
    font-weight: 500;
  }

  .metric-trend.improving {
    color: var(--color-success);
  }

  .metric-trend.worsening {
    color: var(--color-error);
  }

  .vague-goal-comparison {
    display: flex;
    gap: var(--space-6);
  }

  .comparison-item {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .comparison-label {
    font-size: var(--text-xs);
    color: var(--color-text-subtle);
  }

  .comparison-value {
    font-size: var(--text-lg);
    font-weight: 500;
  }

  /* Activity List */
  .activity-list {
    list-style: none;
  }

  .activity-item {
    border-bottom: 1px solid var(--color-border-subtle);
  }

  .activity-item:last-child {
    border-bottom: none;
  }

  .activity-link {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
    padding: var(--space-3) 0;
    color: inherit;
    text-decoration: none;
    transition: background var(--transition-fast);
  }

  .activity-link:hover {
    background: var(--color-bg-hover);
    margin: 0 calc(-1 * var(--space-3));
    padding-left: var(--space-3);
    padding-right: var(--space-3);
    border-radius: var(--radius-md);
  }

  .activity-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .activity-summary {
    font-size: var(--text-sm);
    font-weight: 500;
  }

  .activity-meta {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  .empty-activity {
    padding: var(--space-4);
    text-align: center;
    color: var(--color-text-muted);
    font-size: var(--text-sm);
  }

  /* Daemon Status */
  .daemon-info {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .daemon-row {
    display: flex;
    justify-content: space-between;
    font-size: var(--text-sm);
  }

  .daemon-label {
    color: var(--color-text-muted);
  }

  .daemon-value {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-weight: 500;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--color-text-muted);
  }

  .status-dot.success {
    background: var(--color-success);
  }

  .status-dot.error {
    background: var(--color-error);
  }

  /* Failure Patterns */
  .failure-patterns-panel {
    margin-top: var(--space-4);
  }

  .patterns-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .pattern-card {
    padding: var(--space-3);
    border-radius: var(--radius-md);
    border-left: 3px solid;
  }

  .pattern-card.error {
    background: rgba(239, 68, 68, 0.05);
    border-color: var(--color-error);
  }

  .pattern-card.warning {
    background: rgba(234, 179, 8, 0.05);
    border-color: var(--color-warning);
  }

  .pattern-header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
  }

  .pattern-card.error .pattern-header {
    color: var(--color-error);
  }

  .pattern-card.warning .pattern-header {
    color: var(--color-warning);
  }

  .pattern-title {
    font-weight: 600;
    flex: 1;
    text-transform: capitalize;
  }

  .pattern-count {
    font-size: var(--text-sm);
    opacity: 0.8;
  }

  .pattern-models {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    margin-bottom: var(--space-2);
  }

  .pattern-learning {
    font-size: var(--text-sm);
  }

  .pattern-learning strong {
    color: var(--color-text);
  }
</style>
