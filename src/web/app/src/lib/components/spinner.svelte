<script lang="ts">
  /**
   * Spinner - Unified loading indicator component
   * Single source of truth for all spinner styles in the application.
   *
   * Variants:
   * - default: Standalone spinner with optional message (for page loading states)
   * - inline: Small spinner for buttons, inline contexts
   *
   * Sizes: sm (16px), md (24px), lg (32px), xl (48px)
   */
  interface Props {
    size?: 'sm' | 'md' | 'lg' | 'xl' | number;
    message?: string;
    variant?: 'default' | 'inline';
    class?: string;
  }

  const { size = 'lg', message, variant = 'default', class: className = '' }: Props = $props();

  const sizeMap = {
    sm: 16,
    md: 24,
    lg: 32,
    xl: 48
  };

  const sizeValue = $derived(typeof size === 'number' ? size : sizeMap[size]);
  const borderWidth = $derived(sizeValue <= 24 ? 2 : 3);
</script>

{#if variant === 'inline'}
  <span
    class="spinner-inline {className}"
    style="width: {sizeValue}px; height: {sizeValue}px; border-width: {borderWidth}px"
    role="status"
    aria-label={message ?? 'Loading'}
  ></span>
{:else}
  <div class="spinner-container {className}" role="status" aria-live="polite">
    <div
      class="spinner"
      style="width: {sizeValue}px; height: {sizeValue}px; border-width: {borderWidth}px"
      aria-hidden="true"
    ></div>
    {#if message}
      <p class="spinner-message">{message}</p>
    {/if}
    <span class="sr-only">{message ?? 'Loading...'}</span>
  </div>
{/if}

<style>
  .spinner-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-3);
    padding: var(--space-4);
  }

  .spinner,
  .spinner-inline {
    border: 3px solid var(--color-border);
    border-top-color: var(--color-accent);
    border-radius: 50%;
    animation: spinner-rotate 0.8s linear infinite;
    flex-shrink: 0;
  }

  .spinner-inline {
    display: inline-block;
    vertical-align: middle;
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

  @keyframes spinner-rotate {
    to {
      transform: rotate(360deg);
    }
  }
</style>
