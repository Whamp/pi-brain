<svelte:head>
  <title>Prompt Learning - pi-brain</title>
  <meta name="description" content="Monitor and manage model-specific prompt additions" />
</svelte:head>

<script lang="ts">
  import { api, getErrorMessage, isBackendOffline } from "$lib/api/client";
  import { formatDate, parseDate } from "$lib/utils/date";
  import {
    Lightbulb,
    CheckCircle2,
    XCircle,
    AlertCircle,
    TrendingUp,
    TrendingDown,
    Activity,
    Brain,
    Shield,
    MessageSquare,
    Loader2,
    BarChart3,
    FileText,
    ExternalLink
  } from "lucide-svelte";
  import type { AggregatedInsight, PromptEffectiveness } from "$lib/types";

  type InsightWithEffectiveness = AggregatedInsight & {
    latestEffectiveness: PromptEffectiveness | null;
  };

  // State
  let activeInsights = $state<InsightWithEffectiveness[]>([]);
  let pendingInsights = $state<InsightWithEffectiveness[]>([]);
  let loading = $state(true);
  let errorMessage = $state<string | null>(null);
  let activeTab = $state<"active" | "pending">("active");

  // Selected insight for detail view
  let selectedInsight = $state<InsightWithEffectiveness | null>(null);
  let effectivenessHistory = $state<PromptEffectiveness[]>([]);
  let loadingHistory = $state(false);
  let historyError = $state<string | null>(null);
  let togglingInsightId = $state<string | null>(null);

  async function loadInsights() {
    loading = true;
    errorMessage = null;
    try {
      const [activeData, pendingData] = await Promise.all([
        api.getPromptInsights({ promptIncluded: true, limit: 100 }),
        api.getPromptInsights({ promptIncluded: false, limit: 100 })
      ]);
      activeInsights = activeData;
      pendingInsights = pendingData;
    } catch (error) {
      errorMessage = isBackendOffline(error)
        ? "Backend is offline. Start the daemon with 'pi-brain daemon start'."
        : getErrorMessage(error);
    } finally {
      loading = false;
    }
  }

  async function selectInsight(insight: InsightWithEffectiveness) {
    selectedInsight = insight;
    loadingHistory = true;
    historyError = null;
    try {
      effectivenessHistory = await api.getInsightHistory(insight.id);
    } catch (error) {
      historyError = isBackendOffline(error)
        ? "Backend is offline"
        : getErrorMessage(error);
      effectivenessHistory = [];
    } finally {
      loadingHistory = false;
    }
  }

  async function toggleInsight(insight: InsightWithEffectiveness, enabled: boolean) {
    togglingInsightId = insight.id;
    try {
      await api.toggleInsight(insight.id, enabled);
      await loadInsights();
      // Update selectedInsight from the refreshed lists to get full updated state
      if (selectedInsight?.id === insight.id) {
        const allInsights = [...activeInsights, ...pendingInsights];
        const updated = allInsights.find(i => i.id === insight.id);
        if (updated) {
          selectedInsight = updated;
        }
      }
    } catch (error) {
      alert(`Failed to update insight: ${getErrorMessage(error)}`);
    } finally {
      togglingInsightId = null;
    }
  }

  function getImprovementColor(pct: number): string {
    if (pct > 5) {return "color-success";}
    if (pct < -5) {return "color-error";}
    return "color-muted";
  }

  function getSeverityColor(severity: string): string {
    switch (severity) {
      case "high": { return "severity-high";
      }
      case "medium": { return "severity-medium";
      }
      case "low": { return "severity-low";
      }
      default: { return "";
      }
    }
  }

  $effect(() => {
    loadInsights();
  });
</script>

<div class="prompt-learning-page">
  <header class="page-header">
    <div class="header-main">
      <h1>
        <Lightbulb size={28} />
        Prompt Learning
      </h1>
      <p class="subtitle">Systematic prompt optimization based on session analysis</p>
    </div>
    <div class="header-stats">
      <div class="stat-card">
        <span class="stat-label">Active Prompts</span>
        <span class="stat-value">{activeInsights.length}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Avg Improvement</span>
        {#if activeInsights.length > 0}
          {@const significantInsights = activeInsights.filter(i => i.latestEffectiveness?.statisticallySignificant)}
          {@const avgImprovement = significantInsights.length > 0
            ? significantInsights.reduce((sum, i) => sum + (i.latestEffectiveness?.improvementPct ?? 0), 0) / significantInsights.length
            : 0}
          <span class="stat-value {avgImprovement > 0 ? 'color-success' : avgImprovement < 0 ? 'color-error' : ''}">{avgImprovement > 0 ? "+" : ""}{avgImprovement.toFixed(0)}%</span>
        {:else}
          <span class="stat-value">0%</span>
        {/if}
      </div>
    </div>
  </header>

  <div class="layout-grid">
    <!-- Sidebar / List -->
    <div class="insights-sidebar">
      <div class="tabs">
        <button 
          class="tab" 
          class:active={activeTab === "active"} 
          onclick={() => activeTab = "active"}
        >
          Active 
          <span class="badge">{activeInsights.length}</span>
        </button>
        <button 
          class="tab" 
          class:active={activeTab === "pending"} 
          onclick={() => activeTab = "pending"}
        >
          Pending
          <span class="badge">{pendingInsights.length}</span>
        </button>
      </div>

      <div class="insight-list">
        {#if loading}
          <div class="list-loading">
            <Loader2 size={24} class="spinner" />
            <span>Loading insights...</span>
          </div>
        {:else}
          {@const currentList = activeTab === "active" ? activeInsights : pendingInsights}
          {#if currentList.length === 0}
            <div class="list-empty">
              <Brain size={32} />
              <p>No {activeTab} insights found</p>
            </div>
          {:else}
            {#each currentList as insight}
              <button 
                class="insight-item" 
                class:selected={selectedInsight?.id === insight.id}
                onclick={() => selectInsight(insight)}
              >
                <div class="insight-item-header">
                  <span class="insight-type {insight.type}">{insight.type}</span>
                  <span class="insight-model">{insight.model}</span>
                </div>
                <div class="insight-pattern">{insight.pattern}</div>
                <div class="insight-item-footer">
                  <span class="insight-freq" title="Frequency">
                    <Activity size={12} />
                    {insight.frequency}
                  </span>
                  {#if insight.latestEffectiveness}
                    {@const imp = insight.latestEffectiveness.improvementPct}
                    <span class="insight-improvement {getImprovementColor(imp)}">
                      {#if imp > 0}<TrendingUp size={12} />{:else}<TrendingDown size={12} />{/if}
                      {Math.abs(imp).toFixed(0)}%
                    </span>
                    {#if insight.latestEffectiveness.statisticallySignificant}
                      <span title="Statistically Significant"><CheckCircle2 size={12} class="color-success" /></span>
                    {/if}
                  {/if}
                </div>
              </button>
            {/each}
          {/if}
        {/if}
      </div>
    </div>

    <!-- Detail View -->
    <div class="insight-detail">
      {#if selectedInsight}
        <div class="detail-header">
          <div class="detail-title-row">
            <div class="detail-titles">
              <div class="detail-meta">
                <span class="badge-type {selectedInsight.type}">{selectedInsight.type}</span>
                <span class="detail-model-name">{selectedInsight.model || "General"}</span>
                {#if selectedInsight.tool}
                  <span class="detail-tool-name">/ {selectedInsight.tool}</span>
                {/if}
              </div>
              <h2>{selectedInsight.pattern}</h2>
            </div>
            <div class="detail-actions">
              {#if selectedInsight.promptIncluded}
                <button 
                  class="btn-outline color-error" 
                  onclick={() => toggleInsight(selectedInsight!, false)}
                  disabled={togglingInsightId === selectedInsight.id}
                >
                  {#if togglingInsightId === selectedInsight.id}
                    <Loader2 size={16} class="spinner" />
                  {:else}
                    <XCircle size={16} />
                  {/if}
                  Disable Addition
                </button>
              {:else}
                <button 
                  class="btn-primary" 
                  onclick={() => toggleInsight(selectedInsight!, true)}
                  disabled={togglingInsightId === selectedInsight.id}
                >
                  {#if togglingInsightId === selectedInsight.id}
                    <Loader2 size={16} class="spinner" />
                  {:else}
                    <CheckCircle2 size={16} />
                  {/if}
                  Enable Addition
                </button>
              {/if}
            </div>
          </div>

          <div class="detail-stats-row">
            <div class="detail-stat">
              <span class="label">Frequency</span>
              <span class="value">{selectedInsight.frequency} occurrences</span>
            </div>
            <div class="detail-stat">
              <span class="label">Confidence</span>
              <span class="value">{(selectedInsight.confidence * 100).toFixed(0)}%</span>
            </div>
            <div class="detail-stat">
              <span class="label">Severity</span>
              <span class="value severity-tag {getSeverityColor(selectedInsight.severity)}">
                {selectedInsight.severity}
              </span>
            </div>
          </div>
        </div>

        <div class="detail-sections">
          <section class="detail-section">
            <h3><MessageSquare size={18} /> Prompt Addition</h3>
            {#if selectedInsight.promptText}
              <div class="prompt-box">
                <pre>{selectedInsight.promptText}</pre>
              </div>
            {:else}
              <div class="empty-box">No prompt text generated yet.</div>
            {/if}
          </section>

          {#if selectedInsight.workaround}
            <section class="detail-section">
              <h3><Shield size={18} /> Workaround</h3>
              <div class="workaround-box">{selectedInsight.workaround}</div>
            </section>
          {/if}

          <section class="detail-section">
            <h3><BarChart3 size={18} /> Effectiveness</h3>
            {#if loadingHistory}
              <div class="history-loading">
                <Loader2 size={24} class="spinner" />
              </div>
            {:else if historyError}
              <div class="error-box">
                <AlertCircle size={16} />
                {historyError}
              </div>
            {:else if effectivenessHistory.length === 0}
              <div class="empty-box">No effectiveness data available yet.</div>
            {:else}
              {@const latest = effectivenessHistory[0]}
              <div class="effectiveness-summary">
                <div class="eff-card">
                  <div class="eff-stat">
                    <span class="label">Improvement</span>
                    <span class="value {getImprovementColor(latest.improvementPct)}">
                      {latest.improvementPct > 0 ? "+" : ""}{latest.improvementPct.toFixed(1)}%
                    </span>
                  </div>
                  <div class="eff-stat">
                    <span class="label">Significance</span>
                    <span class="value">
                      {#if latest.statisticallySignificant}
                        <CheckCircle2 size={14} class="color-success" /> Significant
                      {:else}
                        <AlertCircle size={14} class="color-muted" /> Insufficient Data
                      {/if}
                    </span>
                  </div>
                  <div class="eff-stat">
                    <span class="label">Sessions</span>
                    <span class="value">{latest.sessionsBefore} before / {latest.sessionsAfter} after</span>
                  </div>
                </div>
              </div>

              <div class="history-table-container">
                <table class="history-table">
                  <thead>
                    <tr>
                      <th>Version</th>
                      <th>Measured At</th>
                      <th>Before Rate</th>
                      <th>After Rate</th>
                      <th>Improvement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each effectivenessHistory as record}
                      <tr>
                        <td class="font-mono">{record.promptVersion}</td>
                        <td>{formatDate(parseDate(record.measuredAt))}</td>
                        <td>{record.beforeOccurrences}/{record.sessionsBefore}</td>
                        <td>{record.afterOccurrences}/{record.sessionsAfter}</td>
                        <td class={getImprovementColor(record.improvementPct)}>
                          {record.improvementPct > 0 ? "+" : ""}{record.improvementPct.toFixed(1)}%
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            {/if}
          </section>

          <section class="detail-section">
            <h3><FileText size={18} /> Evidence ({selectedInsight.examples.length})</h3>
            <div class="examples-grid">
              {#each selectedInsight.examples.slice(0, 6) as nodeId}
                <a href="/nodes/{nodeId}" class="example-link">
                  <span class="node-id">{nodeId}</span>
                  <ExternalLink size={14} />
                </a>
              {/each}
            </div>
          </section>
        </div>
      {:else}
        <div class="detail-placeholder">
          <Lightbulb size={48} />
          <h2>Select an insight to view details</h2>
          <p>Review and manage prompt additions learned from model behavior.</p>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .prompt-learning-page {
    height: calc(100vh - var(--space-12));
    display: flex;
    flex-direction: column;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: var(--space-6);
  }

  .header-main h1 {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    font-size: var(--text-3xl);
    margin-bottom: var(--space-1);
  }

  .subtitle {
    color: var(--color-text-muted);
  }

  .header-stats {
    display: flex;
    gap: var(--space-4);
  }

  .stat-card {
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-3) var(--space-6);
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 120px;
  }

  .stat-label {
    font-size: var(--text-xs);
    color: var(--color-text-subtle);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .stat-value {
    font-size: var(--text-xl);
    font-weight: 700;
  }

  .layout-grid {
    flex: 1;
    display: grid;
    grid-template-columns: 320px 1fr;
    gap: var(--space-6);
    min-height: 0;
  }

  /* Insights Sidebar */
  .insights-sidebar {
    display: flex;
    flex-direction: column;
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-xl);
    overflow: hidden;
  }

  .tabs {
    display: flex;
    border-bottom: 1px solid var(--color-border-subtle);
  }

  .tab {
    flex: 1;
    padding: var(--space-3);
    background: transparent;
    border: none;
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--color-text-muted);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    border-bottom: 2px solid transparent;
  }

  .tab.active {
    color: var(--color-accent);
    border-bottom-color: var(--color-accent);
    background: var(--color-accent-muted);
  }

  .badge {
    background: var(--color-bg-hover);
    color: var(--color-text-subtle);
    padding: 1px 6px;
    border-radius: var(--radius-sm);
    font-size: var(--text-xs);
  }

  .insight-list {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-2);
  }

  .insight-item {
    width: 100%;
    text-align: left;
    background: transparent;
    border: 1px solid transparent;
    border-radius: var(--radius-lg);
    padding: var(--space-3);
    margin-bottom: var(--space-1);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .insight-item:hover {
    background: var(--color-bg-hover);
  }

  .insight-item.selected {
    background: var(--color-bg-hover);
    border-color: var(--color-accent-muted);
  }

  .insight-item-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: var(--space-1);
  }

  .insight-type {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0 4px;
    border-radius: 2px;
  }

  .quirk { background: #fef2f2; color: #991b1b; }
  .win { background: #f0fdf4; color: #166534; }
  .failure { background: #fffbeb; color: #92400e; }
  .tool_error { background: #eff6ff; color: #1e40af; }
  .lesson { background: #f5f3ff; color: #5b21b6; }

  .insight-model {
    font-size: var(--text-xs);
    color: var(--color-text-subtle);
  }

  .insight-pattern {
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--color-text);
    margin-bottom: var(--space-2);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .insight-item-footer {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    font-size: var(--text-xs);
    color: var(--color-text-subtle);
  }

  .insight-freq, .insight-improvement {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  /* Detail View */
  .insight-detail {
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-xl);
    overflow-y: auto;
    padding: var(--space-8);
  }

  .detail-placeholder {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: var(--color-text-subtle);
    text-align: center;
    gap: var(--space-4);
  }

  .detail-header {
    margin-bottom: var(--space-8);
    border-bottom: 1px solid var(--color-border-subtle);
    padding-bottom: var(--space-6);
  }

  .detail-title-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: var(--space-6);
  }

  .detail-meta {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    margin-bottom: var(--space-2);
  }

  .badge-type {
    font-size: var(--text-xs);
    font-weight: 600;
    text-transform: uppercase;
    padding: 2px 8px;
    border-radius: var(--radius-sm);
  }

  .detail-model-name {
    font-weight: 600;
    color: var(--color-text-muted);
  }

  .detail-titles h2 {
    font-size: var(--text-2xl);
    font-weight: 700;
    line-height: 1.2;
  }

  .detail-stats-row {
    display: flex;
    gap: var(--space-10);
  }

  .detail-stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .detail-stat .label {
    font-size: var(--text-xs);
    color: var(--color-text-subtle);
    text-transform: uppercase;
  }

  .detail-stat .value {
    font-weight: 600;
    font-size: var(--text-sm);
  }

  .severity-tag {
    padding: 1px 6px;
    border-radius: var(--radius-sm);
    text-transform: capitalize;
  }

  .severity-high { background: #fee2e2; color: #dc2626; }
  .severity-medium { background: #fef3c7; color: #d97706; }
  .severity-low { background: #ecfdf5; color: #059669; }

  .detail-sections {
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
  }

  .detail-section h3 {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-lg);
    font-weight: 600;
    margin-bottom: var(--space-4);
    color: var(--color-text);
  }

  .prompt-box {
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-4);
  }

  .prompt-box pre {
    white-space: pre-wrap;
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    color: var(--color-text);
  }

  .workaround-box {
    background: #f0fdfa;
    border: 1px solid #5eead4;
    color: #0f766e;
    padding: var(--space-4);
    border-radius: var(--radius-lg);
    font-style: italic;
  }

  .eff-card {
    display: flex;
    gap: var(--space-8);
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    padding: var(--space-4);
    border-radius: var(--radius-lg);
    margin-bottom: var(--space-4);
  }

  .eff-stat {
    display: flex;
    flex-direction: column;
  }

  .eff-stat .label {
    font-size: var(--text-xs);
    color: var(--color-text-subtle);
  }

  .eff-stat .value {
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .history-table-container {
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }

  .history-table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--text-sm);
  }

  .history-table th {
    background: var(--color-bg);
    text-align: left;
    padding: var(--space-2) var(--space-4);
    color: var(--color-text-muted);
    font-weight: 600;
    border-bottom: 1px solid var(--color-border-subtle);
  }

  .history-table td {
    padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid var(--color-border-subtle);
  }

  .examples-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: var(--space-2);
  }

  .example-link {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-2) var(--space-3);
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    text-decoration: none;
    color: var(--color-text-muted);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    transition: all var(--transition-fast);
  }

  .example-link:hover {
    border-color: var(--color-accent);
    color: var(--color-accent);
  }

  .color-success { color: #16a34a; }
  .color-error { color: #dc2626; }
  .color-muted { color: var(--color-text-subtle); }

  .error-box {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-4);
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: var(--radius-lg);
    color: #dc2626;
    font-size: var(--text-sm);
  }

  .font-mono { font-family: var(--font-mono); }

  .btn-primary, .btn-outline {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    font-weight: 600;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .btn-primary {
    background: var(--color-accent);
    color: white;
    border: none;
  }

  .btn-primary:hover { opacity: 0.9; }

  .btn-primary:disabled, .btn-outline:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-outline {
    background: transparent;
    border: 1px solid currentColor;
  }

  .btn-outline:hover { background: var(--color-bg-hover); }

  /* Utils */
  .list-loading, .list-empty, .history-loading {
    padding: var(--space-8);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-3);
    color: var(--color-text-subtle);
  }

  :global(.spinner) {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
</style>
