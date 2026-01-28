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
    BookOpen,
    Lightbulb,
  } from "lucide-svelte";
  import { api, getErrorMessage, isBackendOffline } from "$lib/api/client";
  import { formatDistanceToNow, parseDate } from "$lib/utils/date";
  import type { 
    DashboardStats, 
    DaemonStatus, 
    Node,
    AggregatedFailurePattern,
    AggregatedLessonPattern,
    AggregatedModelStats
  } from "$lib/types";
  import DaemonDecisions from "$lib/components/dashboard/daemon-decisions.svelte";
  import NewsFeed from "$lib/components/dashboard/news-feed.svelte";
  import AbandonedRestarts from "$lib/components/dashboard/abandoned-restarts.svelte";
  import Spinner from "$lib/components/spinner.svelte";

  // State
  let stats: DashboardStats | null = null;
  let recentActivity: Node[] = [];
  let toolErrors: {
    model?: string;
    tool: string;
    errorType: string;
    count: number;
  }[] = [];
  let failurePatterns: AggregatedFailurePattern[] = [];
  let lessonPatterns: AggregatedLessonPattern[] = [];
  let modelStats: AggregatedModelStats[] = [];
  let daemonStatus: DaemonStatus | null = null;
  let loading = true;
  let errorMessage: string | null = null;

  onMount(async () => {
    try {
      const [
        statsResult, 
        toolErrorsResult, 
        activityResult, 
        failuresResult, 
        lessonsResult,
        modelsResult,
        daemonResult
      ] =
        await Promise.allSettled([
          api.getStats(),
          api.getToolErrorStats(),
          api.listNodes({}, { limit: 5, sort: "timestamp", order: "desc" }),
          api.getFailurePatterns({ limit: 3 }),
          api.getLessonPatterns({ limit: 3 }),
          api.getModelStats(),
          api.getDaemonStatus(),
        ]);

      if (statsResult.status === "fulfilled") {
        stats = statsResult.value;
      }
      if (toolErrorsResult.status === "fulfilled") {
        // Flatten the byTool result for the table
        toolErrors = toolErrorsResult.value.byTool.map(t => ({
          tool: t.tool,
          errorType: "various", // The aggregated view doesn't split by type
          count: t.count,
          models: t.models?.join(", ")
        })).slice(0, 10);
      }
      if (activityResult.status === "fulfilled") {
        recentActivity = activityResult.value.nodes;
      }
      if (failuresResult.status === "fulfilled") {
        failurePatterns = failuresResult.value;
      }
      if (lessonsResult.status === "fulfilled") {
        lessonPatterns = lessonsResult.value;
      }
      if (modelsResult.status === "fulfilled") {
        modelStats = modelsResult.value;
      }
      if (daemonResult.status === "fulfilled") {
        daemonStatus = daemonResult.value;
      }

      // Show error only if all calls failed
      const allResults = [statsResult, toolErrorsResult, activityResult, failuresResult, daemonResult];
      const allFailed = allResults.every(r => r.status === "rejected");
      if (allFailed) {
        // Get the first error for a specific message
        const firstRejected = allResults.find(r => r.status === "rejected") as PromiseRejectedResult | undefined;
        if (firstRejected && isBackendOffline(firstRejected.reason)) {
          errorMessage = "Backend is offline. Start the daemon with 'pi-brain daemon start'.";
        } else if (firstRejected) {
          errorMessage = getErrorMessage(firstRejected.reason);
        } else {
          errorMessage = "Failed to load dashboard data.";
        }
      }
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
      if (isBackendOffline(error)) {
        errorMessage = "Backend is offline. Start the daemon with 'pi-brain daemon start'.";
      } else {
        errorMessage = getErrorMessage(error);
      }
    } finally {
      loading = false;
    }
  });

  // Fallback learning recommendations when API doesn't provide them
  function getLearningFallback(errorType: string): string {
    const fallbacks: Record<string, string> = {
      exact_match_failed: "Read file before editing to verify exact text",
      timeout: "Use tmux skill for long-running processes",
      file_not_found: "Check file exists before reading/editing",
      permission_denied: "Verify file permissions before access",
      syntax_error: "Validate syntax before executing",
    };
    return fallbacks[errorType] ?? "Review examples for common causes";
  }

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
    if (Math.abs(change) < 0.01) {return "Stable";}
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

  {#if errorMessage}
    <div class="error-banner" role="alert">
      <AlertTriangle size={20} />
      {errorMessage}
    </div>
  {:else if loading}
    <div class="loading" role="status" aria-live="polite">
      <Spinner message="Loading dashboard..." />
    </div>
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

      <!-- Daemon Decisions -->
      <DaemonDecisions />

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

    <!-- Patterns & Insights -->
    <div class="patterns-grid">
      <!-- Failure Patterns -->
      {#if failurePatterns.length > 0}
        <section class="card failure-patterns-panel">
          <div class="card-header">
            <h2 class="card-title">Failure Patterns</h2>
            <a href="/patterns/failures" class="view-all">View all →</a>
          </div>

          <div class="patterns-list">
            {#each failurePatterns as pattern}
              <div class="pattern-card error">
                <div class="pattern-header">
                  <CircleAlert size={16} />
                  <span class="pattern-title">{pattern.pattern}</span>
                  <span class="pattern-count">{pattern.occurrences}x</span>
                </div>
                <div class="pattern-meta">
                  Models: {pattern.models.join(", ")} • Last seen {formatDistanceToNow(parseDate(pattern.lastSeen))}
                </div>
                {#if pattern.learningOpportunity}
                  <div class="pattern-learning">
                    <strong>Learning:</strong> {pattern.learningOpportunity}
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        </section>
      {/if}

      <!-- Lesson Patterns -->
      {#if lessonPatterns.length > 0}
        <section class="card lesson-patterns-panel">
          <div class="card-header">
            <h2 class="card-title">Lesson Patterns</h2>
            <a href="/patterns/lessons" class="view-all">View all →</a>
          </div>

          <div class="patterns-list">
            {#each lessonPatterns as pattern}
              <div class="pattern-card success">
                <div class="pattern-header">
                  <Lightbulb size={16} />
                  <span class="pattern-title">{pattern.pattern}</span>
                  <span class="pattern-count">{pattern.occurrences}x</span>
                </div>
                <div class="pattern-meta">
                  Level: {pattern.level} • Last seen {formatDistanceToNow(parseDate(pattern.lastSeen))}
                </div>
                <div class="pattern-tags">
                  {#each pattern.tags as tag}
                    <span class="tag">{tag}</span>
                  {/each}
                </div>
              </div>
            {/each}
          </div>
        </section>
      {/if}
    </div>

    <!-- News Feed (Discovered Clusters) -->
    <NewsFeed />

    <!-- Abandoned Restarts (Friction Patterns) -->
    <AbandonedRestarts />

    <!-- Model Stats -->
    {#if modelStats.length > 0}
      <section class="card model-stats-panel">
        <div class="card-header">
          <h2 class="card-title">Model Reliability</h2>
          <a href="/patterns/models" class="view-all">View all →</a>
        </div>

        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Model</th>
                <th>Quirks</th>
                <th>Errors</th>
                <th>Last Used</th>
              </tr>
            </thead>
            <tbody>
              {#each modelStats as stat}
                <tr>
                  <td><code>{stat.model}</code></td>
                  <td>{stat.quirkCount}</td>
                  <td class:count={stat.errorCount > 0}>{stat.errorCount}</td>
                  <td>{formatDistanceToNow(parseDate(stat.lastUsed))}</td>
                </tr>
              {/each}
            </tbody>
          </table>
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

  /* Patterns Grid */
  .patterns-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-4);
    margin-bottom: var(--space-4);
  }

  @media (max-width: 1024px) {
    .patterns-grid {
      grid-template-columns: 1fr;
    }
  }

  /* Failure Patterns */
  /* .failure-patterns-panel { margin-top: 0; } */

  .patterns-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .pattern-card {
    padding: var(--space-3);
    border-radius: var(--radius-md);
    border-left: 3px solid;
    background: var(--color-bg-elevated);
  }

  .pattern-card.error {
    background: rgba(239, 68, 68, 0.05);
    border-color: var(--color-error);
  }

  .pattern-card.success {
    background: rgba(34, 197, 94, 0.05);
    border-color: var(--color-success);
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

  .pattern-card.success .pattern-header {
    color: var(--color-success);
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

  .pattern-meta {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    margin-bottom: var(--space-2);
  }

  .pattern-learning {
    font-size: var(--text-sm);
  }

  .pattern-learning strong {
    color: var(--color-text);
  }

  .pattern-tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin-top: var(--space-2);
  }

  .tag {
    font-size: var(--text-xs);
    padding: 2px 6px;
    background: var(--color-bg-hover);
    border-radius: var(--radius-sm);
    color: var(--color-text-muted);
  }

  /* Model Stats */
  .model-stats-panel {
    margin-bottom: var(--space-4);
  }
</style>
