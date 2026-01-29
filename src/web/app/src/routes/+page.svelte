<script lang="ts">
  import { onMount } from "svelte";
  import {
    TrendingDown,
    TrendingUp,
    CircleAlert,
    Lightbulb,
  } from "lucide-svelte";
  import { api, getErrorMessage, isBackendOffline } from "$lib/api/client";
  import { formatDistanceToNow, parseDate } from "$lib/utils/date";
  import type {
    DashboardStats,
    Node,
    AggregatedFailurePattern,
    AggregatedLessonPattern,
    AggregatedModelStats
  } from "$lib/types";
  import { daemonStore } from "$lib/stores/daemon";
  import { wsStore } from "$lib/stores/websocket";
  import DaemonDecisions from "$lib/components/dashboard/daemon-decisions.svelte";
  import NewsFeed from "$lib/components/dashboard/news-feed.svelte";
  import AbandonedRestarts from "$lib/components/dashboard/abandoned-restarts.svelte";
  import GettingStarted from "$lib/components/getting-started.svelte";
  import ErrorState from "$lib/components/error-state.svelte";
  import DashboardSkeleton from "$lib/components/dashboard/dashboard-skeleton.svelte";
  import QuickActions from "$lib/components/quick-actions.svelte";
  import TokenSparkline from "$lib/components/dashboard/token-sparkline.svelte";
  import Card from "$lib/components/card.svelte";
  import CardHeader from "$lib/components/card-header.svelte";
  import TableSortIcon from "$lib/components/table-sort-icon.svelte";
  import Tag from "$lib/components/tag.svelte";
  import StatusDot from "$lib/components/status-dot.svelte";

  // State
  let stats = $state<DashboardStats | null>(null);
  let recentActivity = $state<Node[]>([]);
  let toolErrors = $state<{
    model?: string;
    tool: string;
    errorType: string;
    count: number;
    models?: string;
  }[]>([]);
  let failurePatterns = $state<AggregatedFailurePattern[]>([]);
  let lessonPatterns = $state<AggregatedLessonPattern[]>([]);
  let modelStats = $state<AggregatedModelStats[]>([]);
  let timeSeriesData = $state<{
    date: string;
    tokens: number;
    cost: number;
    nodes: number;
  }[]>([]);
  let loading = $state(true);
  let errorMessage = $state<string | null>(null);
  let isOfflineError = $state(false);
  let timeSeriesLoading = $state(false);

  // Sorting state
  let toolErrorSort = $state<{ column: string; direction: "asc" | "desc" }>({
    column: "count",
    direction: "desc",
  });

  let modelStatsSort = $state<{ column: string; direction: "asc" | "desc" }>({
    column: "lastUsed",
    direction: "desc",
  });

  // Sort functions
  function sortToolErrors(column: string) {
    if (toolErrorSort.column === column) {
      toolErrorSort.direction = toolErrorSort.direction === "asc" ? "desc" : "asc";
    } else {
      toolErrorSort.column = column;
      toolErrorSort.direction = "desc";
    }
  }

  function sortModelStats(column: string) {
    if (modelStatsSort.column === column) {
      modelStatsSort.direction = modelStatsSort.direction === "asc" ? "desc" : "asc";
    } else {
      modelStatsSort.column = column;
      modelStatsSort.direction = "desc";
    }
  }

  // Derived sorted data
  const sortedToolErrors = $derived.by(() => {
    const sorted = [...toolErrors];
    const { column, direction } = toolErrorSort;
    
    sorted.sort((a, b) => {
      // @ts-expect-error - dynamic column access
      const aVal = a[column] ?? "";
      // @ts-expect-error - dynamic column access
      const bVal = b[column] ?? "";
      
      if (typeof aVal === "number" && typeof bVal === "number") {
        return direction === "asc" ? aVal - bVal : bVal - aVal;
      }
      
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      
      if (aStr < bStr) {
        return direction === "asc" ? -1 : 1;
      }
      if (aStr > bStr) {
        return direction === "asc" ? 1 : -1;
      }
      return 0;
    });
    
    return sorted;
  });

  const sortedModelStats = $derived.by(() => {
    const sorted = [...modelStats];
    const { column, direction } = modelStatsSort;
    
    sorted.sort((a, b) => {
      // @ts-expect-error - dynamic column access
      const aVal = a[column] ?? "";
      // @ts-expect-error - dynamic column access
      const bVal = b[column] ?? "";
      
      if (typeof aVal === "number" && typeof bVal === "number") {
        return direction === "asc" ? aVal - bVal : bVal - aVal;
      }
      
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      
      if (aStr < bStr) {
        return direction === "asc" ? -1 : 1;
      }
      if (aStr > bStr) {
        return direction === "asc" ? 1 : -1;
      }
      return 0;
    });
    
    return sorted;
  });

  // Auto-refresh when new nodes are created
  $effect(() => {
    if ($wsStore.connected) {
      // The wsStore handles the subscription and stores.
      // We listen for changes in the subscribe call in onMount.
    }
  });

  // Function to refresh activity and stats
  async function refreshDashboardData(silent = false) {
    if (!silent) {
      loading = true;
    }
    try {
      const statsRes = await api.getStats();
      stats = statsRes;

      const toolErrorsRes = await api.getToolErrorStats();
      toolErrors = toolErrorsRes.byTool.map(t => ({
        tool: t.tool,
        errorType: "various",
        count: t.count,
        models: t.models?.join(", ")
      })).slice(0, 10);

      const activityRes = await api.listNodes({}, { limit: 5, sort: "timestamp", order: "desc" });
      recentActivity = activityRes.nodes;

      const failuresRes = await api.getFailurePatterns({ limit: 3 });
      failurePatterns = failuresRes;

      const lessonsRes = await api.getLessonPatterns({ limit: 3 });
      lessonPatterns = lessonsRes;

      const modelsRes = await api.getModelStats();
      modelStats = modelsRes;

      // Fetch time series data for sparklines
      await fetchTimeSeriesData();

    } catch (error) {
      console.error("Failed to refresh dashboard data:", error);
      errorMessage = getErrorMessage(error);
      isOfflineError = isBackendOffline(error);
    } finally {
      if (!silent) {
        loading = false;
      }
    }
  }

  // Fetch time series data
  async function fetchTimeSeriesData() {
    timeSeriesLoading = true;
    try {
      const res = await api.getTimeSeries(7);
      timeSeriesData = res.data;
    } catch (error) {
      console.error("Failed to fetch time series data:", error);
      // Don't fail entire dashboard if time series fails
      timeSeriesData = [];
    } finally {
      timeSeriesLoading = false;
    }
  }

  // Extract tokens and costs from time series data
  const tokensTimeSeries = $derived.by(() => timeSeriesData.map((d) => d.tokens));

  const costsTimeSeries = $derived.by(() => timeSeriesData.map((d) => d.cost * 100)); // Multiply by 100 for better visibility in sparkline

  onMount(async () => {
    await refreshDashboardData();

    // Subscribe to websocket events
    /*
    const unsubscribe = wsStore.subscribe(state => {
      // Check for node.created event in messages
      // This is a bit simplified; real implementation might want to check message type
      // but for now, any update to the websocket store is a good time to refresh
      if (state.connected && !loading) {
        // We could be more specific here, but refreshing everything ensures UI is in sync
        refreshDashboardData(true);
      }
    });

    return unsubscribe;
    */
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
    return `${Math.round(val * 100)}%`;
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
  {#if errorMessage}
    <ErrorState
      variant={isOfflineError ? "offline" : "failed"}
      description={errorMessage}
      onRetry={refreshDashboardData}
      showSettingsLink={isOfflineError}
    />
  {:else if loading}
    <DashboardSkeleton />
  {:else if stats}
    {#if stats.totals.nodes === 0}
      <!-- Empty State: No data yet -->
      <section class="dashboard-empty">
        <GettingStarted variant="dashboard" />
      </section>
    {:else}
    <!-- Hero Section with Key Stats -->
    <section class="dashboard-hero hero-animate">
      <div class="hero-content">
        <div class="hero-text">
          <span class="overline">Knowledge Graph</span>
          <h1 class="hero-title">Dashboard</h1>
          <p class="hero-subtitle">Your coding sessions, decisions, and lessons at a glance</p>
        </div>
        <div class="hero-stats list-animate">
          <div class="hero-stat">
            <div class="hero-stat-value">{stats.totals.nodes}</div>
            <div class="hero-stat-label">Total Nodes</div>
          </div>
          <div class="hero-stat accent">
            <div class="hero-stat-value">{stats.recent.nodesThisWeek}</div>
            <div class="hero-stat-label">This Week</div>
          </div>
          <div class="hero-stat">
            <div class="hero-stat-value">{stats.usage.totalTokens.toLocaleString()}</div>
            <div class="hero-stat-label">Total Tokens</div>
          </div>
          <div class="hero-stat success">
            <div class="hero-stat-value">${stats.usage.totalCost.toFixed(2)}</div>
            <div class="hero-stat-label">Total Cost</div>
          </div>
        </div>
      </div>
      <div class="hero-glow"></div>
    </section>

    <!-- Main Content Grid -->
    <div class="dashboard-grid card-grid-animate">
      <!-- Quick Actions -->
      <QuickActions />

      <!-- Usage Sparklines -->
      <TokenSparkline tokens={tokensTimeSeries} costs={costsTimeSeries} loading={timeSeriesLoading} />

      <!-- Tool Errors Panel -->
      <Card tag="section" variant="elevated" class="tool-errors-panel">
        <CardHeader title="Tool Errors by Model" href="/search?type=error" />

        <div class="table-wrapper">
          <table class="data-table" aria-label="Tool errors grouped by model">
            <thead>
              <tr>
                <th
                  class="sortable"
                  class:sorted={toolErrorSort.column === "models"}
                  onclick={() => sortToolErrors("models")}
                >
                  Model
                  <TableSortIcon direction={toolErrorSort.column === "models" ? toolErrorSort.direction : null} />
                </th>
                <th
                  class="sortable"
                  class:sorted={toolErrorSort.column === "tool"}
                  onclick={() => sortToolErrors("tool")}
                >
                  Tool
                  <TableSortIcon direction={toolErrorSort.column === "tool" ? toolErrorSort.direction : null} />
                </th>
                <th
                  class="sortable"
                  class:sorted={toolErrorSort.column === "errorType"}
                  onclick={() => sortToolErrors("errorType")}
                >
                  Error
                  <TableSortIcon direction={toolErrorSort.column === "errorType" ? toolErrorSort.direction : null} />
                </th>
                <th
                  class="sortable col-numeric"
                  class:sorted={toolErrorSort.column === "count"}
                  onclick={() => sortToolErrors("count")}
                >
                  Count
                  <TableSortIcon direction={toolErrorSort.column === "count" ? toolErrorSort.direction : null} />
                </th>
              </tr>
            </thead>
            <tbody>
              {#each sortedToolErrors as error}
                <tr>
                  <td><code>{error.models || error.model || "Unknown"}</code></td>
                  <td><code>{error.tool}</code></td>
                  <td>{error.errorType}</td>
                  <td class="col-numeric count">{error.count}</td>
                </tr>
              {/each}
              {#if sortedToolErrors.length === 0}
                <tr>
                  <td colspan="4" class="empty-state">No errors recorded</td>
                </tr>
              {/if}
            </tbody>
          </table>
        </div>
      </Card>

      <!-- Vague Goal Tracker -->
      <Card tag="section" variant="accent" class="vague-goal-panel">
        <CardHeader title="Vague Goal Tracker" />

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
      </Card>

      <!-- Recent Activity -->
      <Card tag="section" variant="accent" class="recent-activity-panel">
        <div class="card-header">
          <h2 class="card-title">Recent Activity</h2>
        </div>

        <ul class="activity-list list-animate">
          {#each recentActivity as activity (activity.id)}
            <li class="activity-item">
              <a href="/nodes/{activity.id}" class="activity-link">
                <span class="activity-outcome"
                  >{getOutcomeIcon(activity.content?.outcome ?? "abandoned")}</span
                >
                <div class="activity-content">
                  <span class="activity-summary">{activity.content?.summary ?? `Session from ${activity.metadata?.timestamp ?? 'unknown'}`}</span
                  >
                  <span class="activity-meta">
                    {activity.classification?.project?.split("/").pop() ?? 'Unknown Project'} • {activity.metadata?.timestamp ? formatDistanceToNow(
                      parseDate(activity.metadata.timestamp)
                    ) : 'unknown'}
                  </span>
                </div>
              </a>
            </li>
          {/each}
          {#if recentActivity.length === 0}
            <li class="empty-activity">No recent activity</li>
          {/if}
        </ul>
      </Card>

      <!-- Daemon Decisions -->
      <DaemonDecisions />

      <!-- Daemon Status -->
      <Card tag="section" variant="featured" class="daemon-status-panel">
        <CardHeader title="Daemon Status" />

        {#if $daemonStore.status}
          <div class="daemon-info">
            <div class="daemon-row">
              <span class="daemon-label">Status</span>
              <span class="daemon-value">
                <StatusDot
                  status={$daemonStore.status.running ? 'success' : 'error'}
                  size={10}
                />
                {$daemonStore.status.running ? "Running" : "Stopped"}
              </span>
            </div>
            <div class="daemon-row">
              <span class="daemon-label">Started</span>
              <span class="daemon-value">{$daemonStore.status.uptime ? formatDistanceToNow(new Date(Date.now() - $daemonStore.status.uptime * 1000)) : "-"}</span>
            </div>
            <div class="daemon-row">
              <span class="daemon-label">Queue</span>
              <span class="daemon-value"
                >{$daemonStore.status.queue.pending} pending</span
              >
            </div>
            <div class="daemon-row">
              <span class="daemon-label">Workers</span>
              <span class="daemon-value"
                >{$daemonStore.status.workers.active}/{$daemonStore.status.workers.total} active</span
              >
            </div>
            <div class="daemon-row">
              <span class="daemon-label">Today</span>
              <span class="daemon-value"
                >{$daemonStore.status.queue.completedToday} completed / {$daemonStore.status.queue.failedToday} failed</span
              >
            </div>
          </div>
        {:else}
          <div class="daemon-info">
            <div class="daemon-row">
              <span class="daemon-label">Status</span>
              <span class="daemon-value">
                {#if $daemonStore.loading}
                  Checking...
                {:else if $daemonStore.backendOffline}
                  Backend offline
                {:else}
                  Unknown
                {/if}
              </span>
            </div>
          </div>
        {/if}
      </Card>
    </div>

    <!-- Patterns & Insights -->
    <div class="patterns-grid card-grid-animate">
      <!-- Failure Patterns -->
      {#if failurePatterns.length > 0}
        <Card tag="section" class="failure-patterns-panel">
          <CardHeader title="Failure Patterns" href="/patterns/failures" />

          <div class="patterns-list list-animate">
            {#each failurePatterns as pattern}
              <div class="pattern-card error card-interactive">
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
        </Card>
      {/if}

      <!-- Lesson Patterns -->
      {#if lessonPatterns.length > 0}
        <Card tag="section" class="lesson-patterns-panel">
          <CardHeader title="Lesson Patterns" href="/patterns/lessons" />

          <div class="patterns-list list-animate">
            {#each lessonPatterns as pattern}
              <div class="pattern-card success card-interactive">
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
                    <Tag text={tag} variant="auto" />
                  {/each}
                </div>
              </div>
            {/each}
          </div>
        </Card>
      {/if}
    </div>

    <!-- News Feed (Discovered Clusters) -->
    <NewsFeed />

    <!-- Abandoned Restarts (Friction Patterns) -->
    <AbandonedRestarts />

    <!-- Model Stats -->
    {#if modelStats.length > 0}
      <Card tag="section" variant="elevated" class="model-stats-panel">
        <CardHeader title="Model Reliability" href="/patterns/models" />

        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th 
                  class="sortable" 
                  class:sorted={modelStatsSort.column === "model"} 
                  onclick={() => sortModelStats("model")}
                >
                  Model
                  <TableSortIcon direction={modelStatsSort.column === "model" ? modelStatsSort.direction : null} />
                </th>
                <th 
                  class="sortable col-numeric" 
                  class:sorted={modelStatsSort.column === "quirkCount"} 
                  onclick={() => sortModelStats("quirkCount")}
                >
                  Quirks
                  <TableSortIcon direction={modelStatsSort.column === "quirkCount" ? modelStatsSort.direction : null} />
                </th>
                <th 
                  class="sortable col-numeric" 
                  class:sorted={modelStatsSort.column === "errorCount"} 
                  onclick={() => sortModelStats("errorCount")}
                >
                  Errors
                  <TableSortIcon direction={modelStatsSort.column === "errorCount" ? modelStatsSort.direction : null} />
                </th>
                <th 
                  class="sortable" 
                  class:sorted={modelStatsSort.column === "lastUsed"} 
                  onclick={() => sortModelStats("lastUsed")}
                >
                  Last Used
                  <TableSortIcon direction={modelStatsSort.column === "lastUsed" ? modelStatsSort.direction : null} />
                </th>
              </tr>
            </thead>
            <tbody>
              {#each sortedModelStats as stat}
                <tr>
                  <td><code>{stat.model}</code></td>
                  <td class="col-numeric">{stat.quirkCount}</td>
                  <td class="col-numeric" class:count={stat.errorCount > 0}>{stat.errorCount}</td>
                  <td>{formatDistanceToNow(parseDate(stat.lastUsed))}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </Card>
    {/if}
    {/if}
  {/if}
</div>

<style>
  .dashboard {
    max-width: 1400px;
  }

  /* Empty State */
  .dashboard-empty {
    padding: var(--space-8) var(--space-4);
    display: flex;
    justify-content: center;
  }

  /* Hero Section */
  .dashboard-hero {
    position: relative;
    padding: var(--space-8) var(--space-6);
    margin-bottom: var(--space-6);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-xl);
    overflow: hidden;
  }

  .hero-content {
    position: relative;
    z-index: 1;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--space-8);
    flex-wrap: wrap;
  }

  .hero-text {
    flex: 1;
    min-width: 280px;
  }

  .hero-title {
    font-size: var(--text-4xl);
    font-weight: var(--font-black);
    letter-spacing: var(--tracking-tighter);
    margin-bottom: var(--space-2);
    background: linear-gradient(135deg, var(--color-text) 0%, var(--color-text-muted) 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .hero-subtitle {
    font-size: var(--text-lg);
    color: var(--color-text-muted);
    margin: 0;
  }

  .hero-stats {
    display: flex;
    gap: var(--space-4);
    flex-wrap: wrap;
  }

  .hero-stat {
    text-align: center;
    padding: var(--space-3) var(--space-4);
    background: var(--color-bg-hover);
    border-radius: var(--radius-lg);
    min-width: 100px;
    border: 1px solid var(--color-border-subtle);
    transition: border-color var(--transition-fast), transform var(--transition-fast);
  }

  .hero-stat:hover {
    border-color: var(--color-border);
    transform: translateY(-1px);
  }

  .hero-stat.accent {
    border-color: var(--color-accent-muted);
    background: hsla(190, 100%, 50%, 0.05);
  }

  .hero-stat.accent .hero-stat-value {
    color: var(--color-accent);
  }

  .hero-stat.success {
    border-color: hsla(145, 65%, 52%, 0.3);
    background: hsla(145, 65%, 52%, 0.05);
  }

  .hero-stat.success .hero-stat-value {
    color: var(--color-success);
  }

  .hero-stat-value {
    font-size: var(--text-2xl);
    font-weight: var(--font-bold);
    color: var(--color-text);
    line-height: 1;
    margin-bottom: var(--space-1);
  }

  .hero-stat-label {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  /* Decorative glow behind hero */
  .hero-glow {
    position: absolute;
    top: -50%;
    right: -20%;
    width: 60%;
    height: 200%;
    background: radial-gradient(
      ellipse at center,
      rgba(0, 217, 255, 0.08) 0%,
      transparent 60%
    );
    pointer-events: none;
  }

  @media (max-width: 768px) {
    .dashboard-hero {
      padding: var(--space-6) var(--space-4);
    }

    .hero-content {
      flex-direction: column;
      gap: var(--space-6);
    }

    .hero-stats {
      width: 100%;
      justify-content: space-between;
    }

    .hero-stat {
      flex: 1;
      min-width: 70px;
      padding: var(--space-2) var(--space-3);
    }

    .hero-stat-value {
      font-size: var(--text-lg);
    }
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
  .data-table .count {
    font-weight: 600;
    color: var(--color-error);
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
    background: hsla(0, 72%, 72%, 0.05);
    border-color: var(--color-error);
  }

  .pattern-card.success {
    background: hsla(145, 65%, 52%, 0.05);
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

  /* Model Stats */
  .model-stats-panel {
    margin-bottom: var(--space-4);
  }
</style>
