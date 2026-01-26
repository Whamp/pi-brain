<script lang="ts">
  /**
   * Spinner - Reusable loading indicator component
   */
  interface Props {
    size?: number;
    message?: string;
  }

  const { size = 32, message }: Props = $props();
</script>

<div class="spinner-container" role="status" aria-live="polite">
  <div 
    class="spinner" 
    style="width: {size}px; height: {size}px"
    aria-hidden="true"
  ></div>
  {#if message}
    <p class="spinner-message">{message}</p>
  {/if}
  <span class="sr-only">{message ?? "Loading..."}</span>
</div>

<style>
  .spinner-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-3);
    padding: var(--space-4);
  }

  .spinner {
    border: 3px solid var(--color-border);
    border-top-color: var(--color-accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .spinner-message {
    margin: 0;
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
