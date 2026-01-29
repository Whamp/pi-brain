<!--
  LoadingState Component

  A unified loading state component with spinner and optional message.

  Usage:
    <LoadingState message="Loading sessions..." />

    With custom size:
    <LoadingState message="Analyzing data..." size="xl" />

    Minimal (spinner only):
    <LoadingState size="md" />
-->
<script lang="ts">
  import Spinner from './spinner.svelte';
  import type { HTMLAttributes } from 'svelte/elements';

  interface Props extends HTMLAttributes<HTMLElement> {
    /** Message text to display below spinner */
    message?: string;
    /** Spinner size: sm (16px), md (24px), lg (32px), xl (48px) */
    size?: 'sm' | 'md' | 'lg' | 'xl';
    /** Size variant for container: sm, md, lg */
    variant?: 'sm' | 'md' | 'lg';
    /** Whether to show as inline (no vertical padding) */
    inline?: boolean;
    /** Additional CSS classes */
    class?: string;
  }

  let {
    message,
    size = 'lg',
    variant = 'md',
    inline = false,
    class: className = '',
    ...rest
  }: Props = $props();

  const variantStyles = {
    sm: { padding: 'var(--space-6)' },
    md: { padding: 'var(--space-12)' },
    lg: { padding: 'var(--space-16)' },
  };

  const style = $derived(inline ? undefined : `padding: ${variantStyles[variant].padding}`);
</script>

<div class="loading-state {className}" class:inline {style} {...rest} role="status" aria-live="polite">
  <Spinner {size} variant="inline" aria-hidden="true" />
  {#if message}
    <p class="loading-message">{message}</p>
  {/if}
</div>

<style>
  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-4);
    color: var(--color-text-muted);
    border-radius: var(--radius-lg);
  }

  .loading-state.inline {
    display: inline-flex;
    flex-direction: row;
    gap: var(--space-2);
    padding: 0;
  }

  .loading-message {
    margin: 0;
    font-size: var(--text-sm);
    line-height: var(--leading-normal);
  }
</style>
