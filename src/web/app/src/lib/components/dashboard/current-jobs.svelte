<script lang="ts">
  import { Loader2, FileCode, Clock, RefreshCw, HardDrive, Timer } from "lucide-svelte";
  import { daemonStore } from "$lib/stores/daemon";
  import type { RunningJob } from "$lib/types";

  /**
   * Format seconds into human-readable duration
   */
  function formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }

  /**
   * Format bytes into human-readable size
   */
  function formatBytes(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  /**
   * Format bytes per second into human-readable rate
   */
  function formatRate(bytesPerSecond: number): string {
    if (bytesPerSecond < 1024) {
      return `${bytesPerSecond} B/s`;
    }
    if (bytesPerSecond < 1024 * 1024) {
      return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
    }
    return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
  }

  /**
   * Get job type label with appropriate styling
   */
  function getJobTypeLabel(type: RunningJob["type"]): string {
    const labels: Record<RunningJob["type"], string> = {
      initial: "Initial Analysis",
      reanalysis: "Reanalysis",
      connection_discovery: "Connection Discovery",
    };
    return labels[type];
  }

  /**
   * Check if job is taking longer than expected (> 5 minutes)
   */
  function isLongRunning(elapsedSeconds: number): boolean {
    return elapsedSeconds > 300; // 5 minutes
  }

  /**
   * Get progress based on elapsed vs estimated time, or fallback to time-based estimate
   */
  function getProgressPercent(job: RunningJob): number {
    // If we have estimated total, use that
    if (job.estimatedTotalSeconds !== null && job.estimatedTotalSeconds > 0) {
      const percent = (job.elapsedSeconds / job.estimatedTotalSeconds) * 100;
      return Math.min(95, Math.round(percent));
    }

    // Fallback: estimate based on typical 2-minute analysis
    const typicalDuration = 120;
    const percent = Math.min(95, (job.elapsedSeconds / typicalDuration) * 100);
    return Math.round(percent);
  }
</script>

{#if $daemonStore.status?.runningJobs && $daemonStore.status.runningJobs.length > 0}
  <section class="current-jobs-panel card" aria-label="Currently running jobs">
    <div class="card-header">
      <h2 class="card-title">
        <Loader2 size={18} class="spinning" />
        Current Activity
      </h2>
      <span class="job-count">
        {$daemonStore.status.runningJobs.length} running
      </span>
    </div>

    <div class="jobs-list">
      {#each $daemonStore.status.runningJobs as job (job.id)}
        <div class="job-card" class:long-running={isLongRunning(job.elapsedSeconds)}>
          <div class="job-header">
            <div class="job-type">
              <FileCode size={14} />
              <span>{getJobTypeLabel(job.type)}</span>
            </div>
            <div class="job-duration" class:warning={isLongRunning(job.elapsedSeconds)}>
              <Clock size={12} />
              <span>{formatDuration(job.elapsedSeconds)}</span>
            </div>
          </div>

          <div class="job-session">
            <span class="session-name" title={job.sessionFile}>
              {job.sessionName}
            </span>
          </div>

          <div class="job-stats">
            {#if job.sessionFileSize !== null}
              <div class="stat" title="Session file size">
                <HardDrive size={12} />
                <span>{formatBytes(job.sessionFileSize)}</span>
              </div>
            {/if}
            {#if job.estimatedRemainingSeconds !== null && job.estimatedRemainingSeconds > 0}
              <div class="stat" title="Estimated time remaining">
                <Timer size={12} />
                <span>~{formatDuration(job.estimatedRemainingSeconds)} remaining</span>
              </div>
            {/if}
            {#if job.processingRate !== null && job.processingRate > 0}
              <div class="stat muted" title="Processing rate">
                <span>{formatRate(job.processingRate)}</span>
              </div>
            {/if}
          </div>

          <div class="job-progress">
            <div class="progress-bar">
              <div
                class="progress-fill"
                class:slow={isLongRunning(job.elapsedSeconds)}
                style="width: {getProgressPercent(job)}%"
              ></div>
            </div>
            <span class="progress-status">
              {#if job.sessionFileSize !== null && job.sessionFileSize > 5_000_000}
                Processing large session ({formatBytes(job.sessionFileSize)})...
              {:else if isLongRunning(job.elapsedSeconds)}
                Processing large session...
              {:else}
                Analyzing...
              {/if}
            </span>
          </div>

          {#if job.retryCount > 0}
            <div class="job-retries">
              <RefreshCw size={12} />
              Retry {job.retryCount} of {job.maxRetries}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </section>
{/if}

<style>
  .current-jobs-panel {
    margin-bottom: var(--space-4);
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-4);
  }

  .card-title {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-lg);
    font-weight: 600;
    color: var(--color-accent);
  }

  :global(.card-title .spinning) {
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

  .job-count {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    background: var(--color-accent-muted);
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);
  }

  .jobs-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .job-card {
    background: var(--color-bg);
    border: 1px solid var(--color-border-subtle);
    border-left: 3px solid var(--color-accent);
    border-radius: var(--radius-md);
    padding: var(--space-3);
    transition: all var(--transition-fast);
  }

  .job-card.long-running {
    border-left-color: var(--color-warning);
  }

  .job-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-2);
  }

  .job-type {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--color-text);
  }

  .job-duration {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    font-family: var(--font-mono);
  }

  .job-duration.warning {
    color: var(--color-warning);
  }

  .job-session {
    margin-bottom: var(--space-2);
  }

  .session-name {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    font-family: var(--font-mono);
    word-break: break-all;
  }

  .job-stats {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    margin-bottom: var(--space-3);
    padding: var(--space-2);
    background: var(--color-bg-hover);
    border-radius: var(--radius-sm);
  }

  .stat {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    font-family: var(--font-mono);
  }

  .stat.muted {
    color: var(--color-text-subtle);
  }

  .job-progress {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .progress-bar {
    height: 4px;
    background: var(--color-bg-hover);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: var(--color-accent);
    border-radius: var(--radius-sm);
    transition: width 1s ease-out;
    position: relative;
  }

  .progress-fill::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.3) 50%,
      transparent 100%
    );
    animation: shimmer 1.5s infinite;
  }

  @keyframes shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }

  .progress-fill.slow {
    background: var(--color-warning);
  }

  .progress-status {
    font-size: var(--text-xs);
    color: var(--color-text-subtle);
  }

  .job-retries {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    margin-top: var(--space-2);
    padding-top: var(--space-2);
    border-top: 1px solid var(--color-border-subtle);
    font-size: var(--text-xs);
    color: var(--color-warning);
  }
</style>
