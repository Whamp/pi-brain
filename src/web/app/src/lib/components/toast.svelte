<script lang="ts">
  import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-svelte";
  import { toasts, toastStore, type ToastType } from "$lib/stores/toast";
  import { fly, fade } from "svelte/transition";

  const icons: Record<ToastType, typeof CheckCircle> = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  };
</script>

<div class="toast-container" aria-live="polite" aria-label="Notifications">
  {#each $toasts as toast (toast.id)}
    <div
      class="toast toast-{toast.type}"
      role="alert"
      in:fly={{ x: 300, duration: 200 }}
      out:fade={{ duration: 150 }}
    >
      <svelte:component this={icons[toast.type]} size={18} class="toast-icon" />
      <span class="toast-message">{toast.message}</span>
      <button
        type="button"
        class="toast-dismiss"
        onclick={() => toastStore.dismiss(toast.id)}
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
      <div
        class="toast-progress"
        style="animation-duration: {toast.duration}ms"
      ></div>
    </div>
  {/each}
</div>

<style>
  .toast-container {
    position: fixed;
    top: var(--space-4);
    right: var(--space-4);
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    max-width: 400px;
    pointer-events: none;
  }

  .toast {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    box-shadow:
      0 10px 15px -3px rgba(0, 0, 0, 0.1),
      0 4px 6px -2px rgba(0, 0, 0, 0.05);
    font-size: var(--text-sm);
    pointer-events: auto;
    position: relative;
    overflow: hidden;
  }

  .toast-success {
    border-left: 3px solid var(--color-success);
  }

  .toast-success :global(.toast-icon) {
    color: var(--color-success);
  }

  .toast-error {
    border-left: 3px solid var(--color-error);
  }

  .toast-error :global(.toast-icon) {
    color: var(--color-error);
  }

  .toast-warning {
    border-left: 3px solid var(--color-warning, #f59e0b);
  }

  .toast-warning :global(.toast-icon) {
    color: var(--color-warning, #f59e0b);
  }

  .toast-info {
    border-left: 3px solid var(--color-accent);
  }

  .toast-info :global(.toast-icon) {
    color: var(--color-accent);
  }

  .toast-message {
    flex: 1;
    color: var(--color-text);
    line-height: 1.4;
  }

  .toast-dismiss {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-1);
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    color: var(--color-text-muted);
    cursor: pointer;
    transition: background var(--transition-fast), color var(--transition-fast);
  }

  .toast-dismiss:hover {
    background: var(--color-bg-hover);
    color: var(--color-text);
  }

  .toast-progress {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: currentColor;
    opacity: 0.3;
    animation: shrink linear forwards;
  }

  @keyframes shrink {
    from {
      width: 100%;
    }
    to {
      width: 0%;
    }
  }

  /* Mobile responsiveness */
  @media (max-width: 480px) {
    .toast-container {
      top: auto;
      bottom: var(--space-4);
      left: var(--space-4);
      right: var(--space-4);
      max-width: none;
    }
  }
</style>
