<script lang="ts">
  import { WifiOff, AlertCircle, FileQuestion, RefreshCw, Home, Settings } from "lucide-svelte";
  import type { Snippet } from "svelte";

  interface Props {
    /**
     * Error variant determines the visual style and default messaging
     * - "offline": Backend/network connectivity issues (amber)
     * - "failed": Operation failed (soft red)
     * - "not-found": Resource not found (neutral)
     */
    variant?: "offline" | "failed" | "not-found";
    /**
     * Custom title - if not provided, uses variant default
     */
    title?: string;
    /**
     * Custom description - if not provided, uses variant default
     */
    description?: string;
    /**
     * Primary action handler (e.g., retry)
     */
    onRetry?: () => void;
    /**
     * Label for the retry button
     */
    retryLabel?: string;
    /**
     * Show a "Go to Dashboard" secondary action
     */
    showHomeLink?: boolean;
    /**
     * Show a "Check Settings" secondary action
     */
    showSettingsLink?: boolean;
    /**
     * Optional slot for custom actions
     */
    actions?: Snippet;
  }

  const {
    variant = "failed",
    title,
    description,
    onRetry,
    retryLabel = "Try again",
    showHomeLink = false,
    showSettingsLink = false,
    actions,
  }: Props = $props();

  // Default titles and descriptions per variant
  const defaults = {
    offline: {
      title: "Connection lost",
      description: "Unable to reach the backend. Start the daemon with 'pi-brain daemon start' or check your network connection.",
      icon: WifiOff,
    },
    failed: {
      title: "Something went wrong",
      description: "The operation could not be completed. Please try again.",
      icon: AlertCircle,
    },
    "not-found": {
      title: "Not found",
      description: "The requested resource could not be found.",
      icon: FileQuestion,
    },
  };

  const config = $derived(defaults[variant]);
  const displayTitle = $derived(title ?? config.title);
  const displayDescription = $derived(description ?? config.description);
  const Icon = $derived(config.icon);
</script>

<div class="error-state" data-variant={variant} role="alert">
  <div class="error-icon">
    <Icon size={28} />
  </div>
  
  <div class="error-content">
    <h3 class="error-title">{displayTitle}</h3>
    <p class="error-description">{displayDescription}</p>
  </div>

  <div class="error-actions">
    {#if actions}
      {@render actions()}
    {:else}
      {#if onRetry}
        <button type="button" class="action-btn primary" onclick={onRetry}>
          <RefreshCw size={16} />
          {retryLabel}
        </button>
      {/if}
      {#if showHomeLink}
        <a href="/" class="action-btn secondary">
          <Home size={16} />
          Dashboard
        </a>
      {/if}
      {#if showSettingsLink}
        <a href="/settings" class="action-btn secondary">
          <Settings size={16} />
          Settings
        </a>
      {/if}
    {/if}
  </div>
</div>

<style>
  .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-4);
    padding: var(--space-8);
    text-align: center;
    background: var(--color-bg-elevated);
    border-radius: var(--radius-lg);
    border: 1px solid var(--color-border);
  }

  /* Softer visual treatment with amber tones for offline */
  .error-state[data-variant="offline"] {
    --error-color: hsl(45, 80%, 55%); /* Warm amber */
    --error-bg: hsl(45, 80%, 55%, 0.08);
    --error-border: hsl(45, 80%, 55%, 0.25);
    border-color: var(--error-border);
    background: linear-gradient(
      to bottom,
      var(--error-bg),
      var(--color-bg-elevated)
    );
  }

  /* Soft treatment for generic failures */
  .error-state[data-variant="failed"] {
    --error-color: hsl(0, 65%, 65%); /* Soft coral red */
    --error-bg: hsl(0, 65%, 65%, 0.06);
    --error-border: hsl(0, 65%, 65%, 0.2);
    border-color: var(--error-border);
    background: linear-gradient(
      to bottom,
      var(--error-bg),
      var(--color-bg-elevated)
    );
  }

  /* Neutral for not-found */
  .error-state[data-variant="not-found"] {
    --error-color: var(--color-text-muted);
    --error-bg: transparent;
    --error-border: var(--color-border);
  }

  .error-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: var(--error-bg, hsl(0, 65%, 65%, 0.06));
    color: var(--error-color, var(--color-text-muted));
  }

  .error-content {
    max-width: 400px;
  }

  .error-title {
    margin: 0 0 var(--space-2) 0;
    font-family: var(--font-display);
    font-size: var(--text-lg);
    font-weight: 600;
    color: var(--color-text);
    line-height: 1.3;
  }

  .error-description {
    margin: 0;
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    line-height: 1.6;
  }

  .error-actions {
    display: flex;
    gap: var(--space-3);
    flex-wrap: wrap;
    justify-content: center;
    margin-top: var(--space-2);
  }

  .action-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    font-size: var(--text-sm);
    font-weight: 500;
    border-radius: var(--radius-md);
    border: none;
    cursor: pointer;
    text-decoration: none;
    transition:
      background var(--transition-fast),
      transform var(--transition-fast),
      opacity var(--transition-fast);
  }

  .action-btn:hover {
    transform: translateY(-1px);
  }

  .action-btn:active {
    transform: translateY(0);
  }

  .action-btn.primary {
    background: var(--color-accent);
    color: var(--color-bg);
  }

  .action-btn.primary:hover {
    background: var(--color-accent-hover);
  }

  .action-btn.secondary {
    background: var(--color-bg-hover);
    color: var(--color-text);
    border: 1px solid var(--color-border);
  }

  .action-btn.secondary:hover {
    background: var(--color-border);
  }

  /* Responsive adjustments */
  @media (max-width: 480px) {
    .error-state {
      padding: var(--space-6);
    }

    .error-actions {
      flex-direction: column;
      width: 100%;
    }

    .action-btn {
      width: 100%;
      justify-content: center;
    }
  }
</style>
