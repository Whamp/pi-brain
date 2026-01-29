<script lang="ts">
  import { goto } from "$app/navigation";
  import { AlertTriangle, RefreshCw, Home, Bug } from "lucide-svelte";

  interface Props {
    error: Error;
    reset?: () => void;
  }

  const { error, reset }: Props = $props();

  let showDetails = $state(false);

  function handleReset(): void {
    if (reset) {
      reset();
    } else {
      window.location.reload();
    }
  }

  async function handleGoHome(): Promise<void> {
    try {
      await goto("/");
    } catch {
      // Fallback to hard navigation if client-side navigation fails
      window.location.href = "/";
    }
  }

  async function copyErrorDetails(): Promise<void> {
    const details = `Error: ${error.message}\n\nStack:\n${error.stack ?? "No stack trace available"}`;
    try {
      await navigator.clipboard.writeText(details);
    } catch {
      // Clipboard API may fail in non-secure contexts or due to permissions
      console.error("Failed to copy to clipboard");
    }
  }
</script>

<div class="error-boundary">
  <div class="error-card">
    <div class="error-icon">
      <AlertTriangle size={48} />
    </div>

    <h1 class="error-title">Something went wrong</h1>

    <p class="error-message">
      {error.message || "An unexpected error occurred"}
    </p>

    <div class="error-actions">
      <button type="button" class="btn btn-primary" onclick={handleReset}>
        <RefreshCw size={16} />
        Try again
      </button>
      <button type="button" class="btn btn-secondary" onclick={handleGoHome}>
        <Home size={16} />
        Go to Dashboard
      </button>
    </div>

    <div class="error-details-section">
      <button
        type="button"
        class="details-toggle"
        onclick={() => (showDetails = !showDetails)}
      >
        <Bug size={14} />
        {showDetails ? "Hide" : "Show"} technical details
      </button>

      {#if showDetails}
        <div class="error-details">
          <div class="details-header">
            <span class="details-label">Error Details</span>
            <button type="button" class="copy-btn" onclick={copyErrorDetails}>
              Copy
            </button>
          </div>
          <pre class="error-stack">{error.stack ?? error.message}</pre>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .error-boundary {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: calc(100vh - var(--space-6) * 2);
    padding: var(--space-6);
  }

  .error-card {
    max-width: 480px;
    width: 100%;
    text-align: center;
    padding: var(--space-8);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
  }

  .error-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 80px;
    height: 80px;
    margin-bottom: var(--space-4);
    background: var(--color-error-muted);
    border-radius: 50%;
    color: var(--color-error);
  }

  .error-title {
    margin: 0 0 var(--space-2) 0;
    font-size: var(--text-xl);
    font-weight: 600;
    color: var(--color-text);
  }

  .error-message {
    margin: 0 0 var(--space-6) 0;
    font-size: var(--text-base);
    color: var(--color-text-muted);
    line-height: 1.5;
  }

  .error-actions {
    display: flex;
    gap: var(--space-3);
    justify-content: center;
    margin-bottom: var(--space-6);
  }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    font-size: var(--text-sm);
    font-weight: 500;
    border-radius: var(--radius-md);
    border: none;
    cursor: pointer;
    transition:
      background var(--transition-fast),
      opacity var(--transition-fast);
  }

  .btn:hover {
    opacity: 0.9;
  }

  .btn-primary {
    background: var(--color-accent);
    color: white;
  }

  .btn-secondary {
    background: var(--color-bg-hover);
    color: var(--color-text);
    border: 1px solid var(--color-border);
  }

  .error-details-section {
    border-top: 1px solid var(--color-border-subtle);
    padding-top: var(--space-4);
  }

  .details-toggle {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    background: transparent;
    border: none;
    cursor: pointer;
    transition: color var(--transition-fast);
  }

  .details-toggle:hover {
    color: var(--color-text);
  }

  .error-details {
    margin-top: var(--space-3);
    text-align: left;
    background: var(--color-bg);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-md);
    overflow: hidden;
  }

  .details-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-2) var(--space-3);
    background: var(--color-bg-elevated);
    border-bottom: 1px solid var(--color-border-subtle);
  }

  .details-label {
    font-size: var(--text-xs);
    font-weight: 500;
    color: var(--color-text-muted);
    text-transform: uppercase;
  }

  .copy-btn {
    padding: var(--space-1) var(--space-2);
    font-size: var(--text-xs);
    color: var(--color-accent);
    background: transparent;
    border: 1px solid var(--color-accent);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: background var(--transition-fast);
  }

  .copy-btn:hover {
    background: var(--color-accent-muted);
  }

  .error-stack {
    margin: 0;
    padding: var(--space-3);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    line-height: 1.6;
    color: var(--color-text-muted);
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 200px;
    overflow-y: auto;
  }
</style>
