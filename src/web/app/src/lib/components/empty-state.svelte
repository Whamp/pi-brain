<!--
  EmptyState Component

  A reusable empty state component for displaying when no data is available.

  Usage:
    <EmptyState
      icon={FileText}
      title="No sessions found"
      description="Run some pi sessions and they'll appear here."
    />

    With actions:
    <EmptyState
      icon={Network}
      title="Knowledge graph empty"
      description="Nodes will appear after daemon analyzes sessions."
    >
      <svelte:fragment slot="actions">
        <a href="/settings" class="btn btn-secondary">Check Settings</a>
        <a href="/sessions" class="btn btn-ghost">View Sessions</a>
      </svelte:fragment>
    </EmptyState>
-->
<script lang="ts">
  import type { Snippet, ComponentType } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import type { LucideProps } from 'lucide-svelte';

  interface Props extends HTMLAttributes<HTMLElement> {
    /** Icon component to display */
    icon?: ComponentType<LucideProps>;
    /** Icon size (default: 48) */
    iconSize?: number;
    /** Primary title text */
    title?: string;
    /** Descriptive text below title */
    description?: string;
    /** Size variant: sm, md, lg */
    size?: 'sm' | 'md' | 'lg';
    /** Additional CSS classes */
    class?: string;
    /** Custom action buttons */
    actions?: Snippet;
  }

  let {
    icon,
    iconSize = 48,
    title = 'No data available',
    description,
    size = 'md',
    class: className = '',
    actions,
    ...rest
  }: Props = $props();

  const sizeStyles = {
    sm: {
      padding: 'var(--space-8)',
      iconSize: 32,
      titleSize: 'var(--text-lg)',
      descriptionSize: 'var(--text-sm)',
    },
    md: {
      padding: 'var(--space-12)',
      iconSize: 48,
      titleSize: 'var(--text-xl)',
      descriptionSize: 'var(--text-sm)',
    },
    lg: {
      padding: 'var(--space-16)',
      iconSize: 64,
      titleSize: 'var(--text-2xl)',
      descriptionSize: 'var(--text-base)',
    },
  };

  const styles = $derived(sizeStyles[size]);
  const IconComponent = $derived(icon);
  const computedIconSize = $derived(iconSize === 48 ? styles.iconSize : iconSize);
</script>

<div class="empty-state empty-state-{size} {className}" {...rest} role="status" aria-live="polite">
  {#if IconComponent}
    <div class="empty-icon">
      <IconComponent size={computedIconSize} strokeWidth={1.5} />
    </div>
  {/if}

  {#if title}
    <h3 class="empty-title" style="font-size: {styles.titleSize}">{title}</h3>
  {/if}

  {#if description}
    <p class="empty-description" style="font-size: {styles.descriptionSize}">{description}</p>
  {/if}

  {#if actions}
    <div class="empty-actions">
      {@render actions()}
    </div>
  {/if}
</div>

<style>
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-4);
    text-align: center;
    color: var(--color-text-subtle);
  }

  .empty-state-sm {
    gap: var(--space-3);
  }

  .empty-state-lg {
    gap: var(--space-6);
  }

  .empty-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 80px;
    height: 80px;
    border-radius: var(--radius-xl);
    background: var(--color-bg-hover);
    color: var(--color-text-muted);
    flex-shrink: 0;
  }

  .empty-state-sm .empty-icon {
    width: 56px;
    height: 56px;
    border-radius: var(--radius-lg);
  }

  .empty-state-lg .empty-icon {
    width: 120px;
    height: 120px;
  }

  .empty-title {
    margin: 0;
    font-weight: 600;
    color: var(--color-text-muted);
  }

  .empty-description {
    margin: 0;
    line-height: var(--leading-normal);
    max-width: 400px;
  }

  .empty-actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    justify-content: center;
    margin-top: var(--space-2);
  }
</style>
