<script lang="ts">
  import {
    Activity,
    Zap,
    DollarSign,
    TrendingDown,
    TrendingUp,
    CircleAlert,
  } from "lucide-svelte";

  // Placeholder data - will be fetched from API
  const stats = {
    totalNodes: 847,
    thisWeek: 42,
    totalTokens: "2.5M",
    totalCost: "$12.45",
  };

  const vagueGoalStats: {
    thisWeek: number;
    lastWeek: number;
    trend: "improving" | "worsening" | "stable";
  } = {
    thisWeek: 15,
    lastWeek: 22,
    trend: "improving",
  };

  const recentActivity = [
    {
      id: "1",
      summary: "Implemented SQLite storage layer",
      project: "pi-brain",
      outcome: "success" as const,
      time: "10m ago",
    },
    {
      id: "2",
      summary: "Debugging connection pooling issue",
      project: "webapp",
      outcome: "partial" as const,
      time: "2h ago",
    },
    {
      id: "3",
      summary: "Refactored authentication flow",
      project: "api-server",
      outcome: "success" as const,
      time: "5h ago",
    },
  ];

  const toolErrors = [
    { model: "claude-sonnet", tool: "edit", error: "exact match", count: 47 },
    { model: "claude-sonnet", tool: "read", error: "sed usage", count: 15 },
    { model: "glm-4.7", tool: "bash", error: "timeout", count: 12 },
    { model: "gemini", tool: "edit", error: "scope", count: 8 },
  ];

  function getOutcomeIcon(
    outcome: "success" | "partial" | "failed" | "abandoned"
  ): string {
    const icons = {
      success: "🟢",
      partial: "🟡",
      failed: "🔴",
      abandoned: "⚪",
    };
    return icons[outcome];
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

  <!-- Quick Stats -->
  <section class="stats-grid" aria-label="Quick statistics">
    <div class="stat-card">
      <div class="stat-icon">
        <Activity size={20} />
      </div>
      <div class="stat-content">
        <div class="stat-value">{stats.totalNodes}</div>
        <div class="stat-label">Total Nodes</div>
      </div>
    </div>

    <div class="stat-card">
      <div class="stat-icon accent">
        <Zap size={20} />
      </div>
      <div class="stat-content">
        <div class="stat-value">{stats.thisWeek}</div>
        <div class="stat-label">This Week</div>
      </div>
    </div>

    <div class="stat-card">
      <div class="stat-icon">
        <Activity size={20} />
      </div>
      <div class="stat-content">
        <div class="stat-value">{stats.totalTokens}</div>
        <div class="stat-label">Total Tokens</div>
      </div>
    </div>

    <div class="stat-card">
      <div class="stat-icon success">
        <DollarSign size={20} />
      </div>
      <div class="stat-content">
        <div class="stat-value">{stats.totalCost}</div>
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
                <td>{error.error}</td>
                <td class="count">{error.count}</td>
              </tr>
            {/each}
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
            <span class="metric-value">{vagueGoalStats.thisWeek}%</span>
            <span class="metric-trend" class:improving={vagueGoalStats.trend === "improving"} class:worsening={vagueGoalStats.trend === "worsening"}>
              {#if vagueGoalStats.trend === "improving"}
                <TrendingDown size={16} />
                Improving!
              {:else if vagueGoalStats.trend === "worsening"}
                <TrendingUp size={16} />
                Worsening
              {:else}
                Stable
              {/if}
            </span>
          </div>
        </div>

        <div class="vague-goal-comparison">
          <div class="comparison-item">
            <span class="comparison-label">This week</span>
            <span class="comparison-value">{vagueGoalStats.thisWeek}%</span>
          </div>
          <div class="comparison-item">
            <span class="comparison-label">Last week</span>
            <span class="comparison-value">{vagueGoalStats.lastWeek}%</span>
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
                >{getOutcomeIcon(activity.outcome)}</span
              >
              <div class="activity-content">
                <span class="activity-summary">{activity.summary}</span>
                <span class="activity-meta">
                  {activity.project} • {activity.time}
                </span>
              </div>
            </a>
          </li>
        {/each}
      </ul>
    </section>

    <!-- Daemon Status -->
    <section class="card daemon-status-panel">
      <div class="card-header">
        <h2 class="card-title">Daemon Status</h2>
      </div>

      <div class="daemon-info">
        <div class="daemon-row">
          <span class="daemon-label">Status</span>
          <span class="daemon-value">
            <span class="status-dot success"></span>
            Running
          </span>
        </div>
        <div class="daemon-row">
          <span class="daemon-label">Queue</span>
          <span class="daemon-value">12 pending</span>
        </div>
        <div class="daemon-row">
          <span class="daemon-label">Workers</span>
          <span class="daemon-value">1/2 active</span>
        </div>
        <div class="daemon-row">
          <span class="daemon-label">Last analysis</span>
          <span class="daemon-value">5 min ago</span>
        </div>
        <div class="daemon-row">
          <span class="daemon-label">Next nightly</span>
          <span class="daemon-value">2:00 AM</span>
        </div>
      </div>
    </section>
  </div>

  <!-- Failure Patterns (full width) -->
  <section class="card failure-patterns-panel">
    <div class="card-header">
      <h2 class="card-title">Failure Pattern Analysis</h2>
      <a href="/search?type=failure" class="view-all">View all →</a>
    </div>

    <div class="patterns-list">
      <div class="pattern-card error">
        <div class="pattern-header">
          <CircleAlert size={16} />
          <span class="pattern-title">Edit exact match failures</span>
          <span class="pattern-count">47 occurrences</span>
        </div>
        <div class="pattern-models">
          Models: claude-sonnet (35), glm-4.7 (12)
        </div>
        <div class="pattern-learning">
          <strong>Learning:</strong> Read file before editing to get exact text
        </div>
      </div>

      <div class="pattern-card warning">
        <div class="pattern-header">
          <CircleAlert size={16} />
          <span class="pattern-title">Bash timeout on long operations</span>
          <span class="pattern-count">12 occurrences</span>
        </div>
        <div class="pattern-models">Models: glm-4.7 (8), gemini (4)</div>
        <div class="pattern-learning">
          <strong>Learning:</strong> Use tmux skill for long-running processes
        </div>
      </div>
    </div>
  </section>
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
