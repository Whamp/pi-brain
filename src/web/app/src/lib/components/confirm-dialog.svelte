<script lang="ts">
  import { AlertTriangle, X } from "lucide-svelte";
  import { focusTrap } from "$lib/utils/focus-trap";

  interface Props {
    open: boolean;
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "danger" | "warning" | "info";
    onconfirm: () => void;
    oncancel: () => void;
  }

  const {
    open = false,
    title = "Confirm",
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    variant = "danger",
    onconfirm,
    oncancel,
  }: Props = $props();

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      oncancel();
    }
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      oncancel();
    }
  }
</script>

{#if open}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <!-- svelte-ignore a11y_interactive_supports_focus -->
  <div
    class="dialog-backdrop"
    role="dialog"
    aria-modal="true"
    aria-labelledby="dialog-title"
    onclick={handleBackdropClick}
    onkeydown={handleKeydown}
  >
    <div class="dialog" use:focusTrap={{ onEscape: oncancel }}>
      <header class="dialog-header">
        <div class="dialog-title-row">
          {#if variant === "danger" || variant === "warning"}
            <AlertTriangle
              size={20}
              class="icon-{variant}"
            />
          {/if}
          <h2 id="dialog-title">{title}</h2>
        </div>
        <button
          type="button"
          class="close-btn"
          onclick={oncancel}
          aria-label="Close dialog"
        >
          <X size={18} />
        </button>
      </header>

      <div class="dialog-body">
        <p>{message}</p>
      </div>

      <footer class="dialog-footer">
        <button
          type="button"
          class="btn-secondary"
          onclick={oncancel}
        >
          {cancelText}
        </button>
        <button
          type="button"
          class="btn-{variant}"
          onclick={onconfirm}
        >
          {confirmText}
        </button>
      </footer>
    </div>
  </div>
{/if}

<style>
  .dialog-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: var(--z-modal, 100);
    animation: fadeIn 0.15s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .dialog {
    background: rgba(20, 20, 23, 0.85);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--radius-lg);
    width: 100%;
    max-width: 400px;
    margin: var(--space-4);
    box-shadow: var(--shadow-xl), var(--shadow-highlight);
    animation: slideUp 0.2s ease-out;
  }

  @keyframes slideUp {
    from {
      transform: translateY(10px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .dialog-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4);
    border-bottom: 1px solid var(--color-border);
  }

  .dialog-title-row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .dialog-title-row :global(.icon-danger) {
    color: var(--color-error);
  }

  .dialog-title-row :global(.icon-warning) {
    color: var(--color-warning);
  }

  .dialog-header h2 {
    font-size: var(--text-lg);
    font-weight: 600;
    margin: 0;
  }

  .close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-1);
    background: transparent;
    border: none;
    color: var(--color-text-muted);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: color 0.15s ease, background 0.15s ease;
  }

  .close-btn:hover {
    color: var(--color-text);
    background: var(--color-bg-hover);
  }

  .dialog-body {
    padding: var(--space-4);
  }

  .dialog-body p {
    margin: 0;
    color: var(--color-text-muted);
    line-height: 1.5;
  }

  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-3);
    padding: var(--space-4);
    border-top: 1px solid var(--color-border);
  }

  .btn-secondary,
  .btn-danger,
  .btn-warning,
  .btn-info {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease;
  }

  .btn-secondary {
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    color: var(--color-text);
  }

  .btn-secondary:hover {
    background: var(--color-bg-hover);
    border-color: var(--color-text-muted);
  }

  .btn-danger {
    background: var(--color-error);
    border: 1px solid var(--color-error);
    color: white;
  }

  .btn-danger:hover {
    background: var(--color-error-hover);
  }

  .btn-warning {
    background: var(--color-warning);
    border: 1px solid var(--color-warning);
    color: white;
  }

  .btn-warning:hover {
    background: var(--color-warning-hover, #ea580c);
  }

  .btn-info {
    background: var(--color-accent);
    border: 1px solid var(--color-accent);
    color: white;
  }

  .btn-info:hover {
    background: var(--color-accent-hover);
  }
</style>
