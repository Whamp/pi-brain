<script lang="ts">
  import { onMount } from "svelte";
  import {
    AlertCircle,
    FileText,
    RefreshCw,
    ChevronDown,
    ChevronRight,
  } from "lucide-svelte";
  import { api, getErrorMessage } from "$lib/api/client";
  import Spinner from "$lib/components/spinner.svelte";

  // Types
  interface FailedJob {
    id: string;
    sessionFile: string;
    type: string;
    completedAt: string;
    error: {
      timestamp: string;
      type: string;
      reason: string;
      message: string;
      stack?: string;
    };
    retryCount: number;
    maxRetries: number;
  }

  interface ErrorPattern {
    type: string;
    reason: string;
    count: number;
    jobs: FailedJob[];
  }

  // State
  let loading = $state(true);
  let errorMessage = $state<string | null>(null);
  let failedJobs = $state<FailedJob[]>([]);
  let errorPatterns = $state<ErrorPattern[]>([]);
  let expandedJobs = $state<Set<string>>(new Set());
  let expandedPatterns = $state<Set<string>>(new Set());

  async function loadFailedJobs() {
    loading = true;
    errorMessage = null;
    try {
      const response = await fetch("/api/daemon/jobs/failed?limit=20");
      if (!response.ok) {
        throw new Error(`Failed to load failed jobs: ${response.statusText}`);
      }
      const data = await response.json();
      failedJobs = data.jobs ?? [];
      groupErrorsByPattern();
    } catch (error) {
      errorMessage = getErrorMessage(error);
    } finally {
      loading = false;
    }
  }

  function groupErrorsByPattern() {
    const patternMap = new Map<string, FailedJob[]>();

    for (const job of failedJobs) {
      const key = `${job.error.type}:${job.error.reason}`;
      if (!patternMap.has(key)) {
        patternMap.set(key, []);
      }
      const jobs = patternMap.get(key);
      if (jobs) {
        jobs.push(job);
      }
    }

    errorPatterns = [...patternMap.entries()].map(([key, jobs]) => {
      const [type, reason] = key.split(":");
      return {
        type,
        reason,
        count: jobs.length,
        jobs,
      };
    }).toSorted((a, b) => b.count - a.count);
  }

  function toggleJob(jobId: string) {
    const newSet = new Set(expandedJobs);
    if (newSet.has(jobId)) {
      newSet.delete(jobId);
    } else {
      newSet.add(jobId);
    }
    expandedJobs = newSet;
  }

  function togglePattern(key: string) {
    const newSet = new Set(expandedPatterns);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    expandedPatterns = new Set;
  }

  function getSessionName(sessionFile: string): string {
    const parts = sessionFile.split("/");
    return parts.at(-1) ?? sessionFile;
  }

  function getErrorTypeColor(type: string): string {
    const colors: Record<string, string> = {
      permanent: "var(--color-error)",
      transient: "var(--color-warning)",
      unknown: "var(--color-text-muted)",
    };
    return colors[type] ?? colors.unknown;
  }

  function getErrorTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      permanent: "Permanent",
      transient: "Transient",
      unknown: "Unknown",
    };
    return labels[type] ?? type;
  }

  onMount(() => {
    loadFailedJobs();
  });
</script>

<div class="job-errors-panel">
  <div class="panel-header">
    <h2 class="panel-title">Recent Job Errors</h2>
    <button
      class="refresh-button"
      on:click={loadFailedJobs}
      aria-label="Refresh errors"
    >
      <RefreshCw size={16} />
    </button>
  </div>

  {#if errorMessage}
    <div class="error-message" role="alert">
      <AlertCircle size={16} />
      {errorMessage}
    </div>
  {:else if loading}
    <div class="loading" role="status">
      <Spinner message="Loading errors..." />
    </div>
  {:else if errorPatterns.length === 0}
    <div class="empty-state">
      <AlertCircle size={24} />
      <p>No failed jobs in the queue</p>
    </div>
  {:else}
    <div class="patterns-container">
      {#each errorPatterns as pattern}
        {@const patternKey = `${pattern.type}:${pattern.reason}`}
        <div class="pattern-group">
          <div
            class="pattern-header"
            class:expanded={expandedPatterns.has(patternKey)}
            on:click={() => togglePattern(patternKey)}
          >
            <div class="pattern-info">
              <div class="pattern-type" style="color: {getErrorTypeColor(pattern.type)}"
              >
                {getErrorTypeLabel(pattern.type)}
              </div>
              <div class="pattern-reason">{pattern.reason}</div>
            </div>
            <div class="pattern-count">{pattern.count}x</div>
            {#if expandedPatterns.has(patternKey)}
              <ChevronDown size={16} class="chevron" />
            {:else}
              <ChevronRight size={16} class="chevron" />
            {/if}
          </div>

          {#if expandedPatterns.has(patternKey)}
            <div class="pattern-jobs">
              {#each pattern.jobs as job}
                {@const jobKey = job.id}
                <div class="job-item">
                  <div
                    class="job-header"
                    class:expanded={expandedJobs.has(jobKey)}
                    on:click={() => toggleJob(jobKey)}
                  >
                    <div class="job-info">
                      <FileText size={14} />
                      <span class="job-name">{getSessionName(job.sessionFile)}</span>
                      <span class="job-retries"
                        >{job.retryCount}/{job.maxRetries} retries</span
                      >
                    </div>
                    {#if expandedJobs.has(jobKey)}
                      <ChevronDown size={14} class="chevron" />
                    {:else}
                      <ChevronRight size={14} class="chevron" />
                    {/if}
                  </div>

                  {#if expandedJobs.has(jobKey)}
                    <div class="job-details">
                      <div class="job-detail-row">
                        <span class="detail-label">Session:</span>
                        <code class="detail-value">{job.sessionFile}</code>
                      </div>
                      <div class="job-detail-row">
                        <span class="detail-label">Job ID:</span>
                        <code class="detail-value">{job.id}</code>
                      </div>
                      <div class="job-detail-row">
                        <span class="detail-label">Failed at:</span>
                        <span class="detail-value"
                          >{new Date(job.completedAt).toLocaleString()}</span
                        >
                      </div>
                      <div class="job-detail-row">
                        <span class="detail-label">Error type:</span>
                        <span
                          class="detail-value"
                          style="color: {getErrorTypeColor(job.error.type)}"
                        >
                          {getErrorTypeLabel(job.error.type)}
                        </span>
                      </div>
                      <div class="job-detail-row">
                        <span class="detail-label">Reason:</span>
                        <span class="detail-value">{job.error.reason}</span>
                      </div>
                      <div class="job-error-message">
                        <div class="error-label">Error message:</div>
                        <pre class="error-message">{job.error.message}</pre>
                      </div>
                      {#if job.error.stack}
                        <details class="stack-trace">
                          <summary>Stack trace</summary>
                          <pre class="stack-content">{job.error.stack}</pre>
                        </details>
                      {/if}
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .job-errors-panel {
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-4);
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-4);
  }

  .panel-title {
    font-size: var(--text-lg);
    font-weight: 600;
  }

  .refresh-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: var(--color-bg-hover);
    border: none;
    border-radius: var(--radius-md);
    color: var(--color-text-muted);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .refresh-button:hover {
    background: var(--color-bg-subtle);
    color: var(--color-text);
  }

  .error-message {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3);
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid var(--color-error);
    border-radius: var(--radius-md);
    color: var(--color-error);
    font-size: var(--text-sm);
  }

  .loading {
    padding: var(--space-8);
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-8);
    color: var(--color-text-muted);
  }

  .empty-state p {
    font-size: var(--text-sm);
    margin: 0;
  }

  .patterns-container {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .pattern-group {
    background: var(--color-bg);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-md);
    overflow: hidden;
  }

  .pattern-header {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3);
    cursor: pointer;
    transition: background var(--transition-fast);
  }

  .pattern-header:hover {
    background: var(--color-bg-hover);
  }

  .pattern-info {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    flex: 1;
  }

  .pattern-type {
    font-size: var(--text-xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .pattern-reason {
    font-size: var(--text-sm);
    font-weight: 500;
  }

  .pattern-count {
    font-size: var(--text-lg);
    font-weight: 600;
    color: var(--color-text-muted);
  }

  .chevron {
    color: var(--color-text-subtle);
  }

  .pattern-jobs {
    border-top: 1px solid var(--color-border-subtle);
    padding: var(--space-2);
  }

  .job-item {
    border-bottom: 1px solid var(--color-border-subtle);
  }

  .job-item:last-child {
    border-bottom: none;
  }

  .job-header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2);
    cursor: pointer;
    border-radius: var(--radius-sm);
    transition: background var(--transition-fast);
  }

  .job-header:hover {
    background: var(--color-bg-hover);
  }

  .job-info {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex: 1;
    font-size: var(--text-sm);
  }

  .job-name {
    font-weight: 500;
    flex: 1;
  }

  .job-retries {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  .job-details {
    padding: var(--space-3);
    padding-top: 0;
    background: var(--color-bg-elevated);
    margin: 0 var(--space-2) var(--space-2) var(--space-2);
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-border-subtle);
  }

  .job-detail-row {
    display: flex;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
    font-size: var(--text-sm);
  }

  .job-detail-row:last-child {
    margin-bottom: 0;
  }

  .detail-label {
    color: var(--color-text-muted);
    min-width: 80px;
  }

  .detail-value {
    color: var(--color-text);
  }

  .job-error-message {
    margin-top: var(--space-3);
    padding-top: var(--space-3);
    border-top: 1px solid var(--color-border-subtle);
  }

  .error-label {
    font-size: var(--text-xs);
    font-weight: 600;
    color: var(--color-error);
    margin-bottom: var(--space-2);
  }

  .error-message {
    background: rgba(239, 68, 68, 0.05);
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: var(--radius-sm);
    padding: var(--space-2);
    font-size: var(--text-sm);
    color: var(--color-error);
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .stack-trace {
    margin-top: var(--space-2);
  }

  .stack-trace summary {
    cursor: pointer;
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    margin-bottom: var(--space-2);
    user-select: none;
  }

  .stack-trace summary:hover {
    color: var(--color-text);
  }

  .stack-content {
    background: rgba(0, 0, 0, 0.03);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-sm);
    padding: var(--space-2);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    overflow-x: auto;
  }
</style>
