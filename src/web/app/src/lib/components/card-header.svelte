<!--
  CardHeader Component

  A reusable header for cards with title and optional "View all" link.

  Usage:
    <CardHeader title="Recent Sessions" href="/sessions" />
    <CardHeader title="Tool Errors">
      <button>Action</button>
    </CardHeader>
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { ArrowRight } from 'lucide-svelte';

  interface Props extends HTMLAttributes<HTMLElement> {
    /** Card title */
    title: string;
    /** Link text for "View all" action (default: "View all") */
    linkText?: string;
    /** URL for "View all" link (renders as <a>) */
    href?: string;
    /** Whether to show arrow icon on link */
    showIcon?: boolean;
    /** Additional CSS classes */
    class?: string;
    /** Custom action content (overrides href/linkText) */
    actions?: Snippet;
  }

  let {
    title,
    linkText = 'View all',
    href,
    showIcon = true,
    class: className = '',
    actions,
    ...rest
  }: Props = $props();
</script>

<div class="card-header {className}" {...rest}>
  <h2 class="card-title">{title}</h2>
  {#if actions}
    {@render actions()}
  {:else if href}
    <a href={href} class="view-all">
      {linkText}
      {#if showIcon}
        <ArrowRight size={14} />
      {/if}
    </a>
  {/if}
</div>

<style>
  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    margin-bottom: var(--space-4);
  }

  .card-title {
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--color-text-muted);
    margin: 0;
  }

  .view-all {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    font-size: var(--text-sm);
    color: var(--color-accent);
    text-decoration: none;
    transition: color var(--transition-fast);
  }

  .view-all:hover {
    color: var(--color-accent-hover);
  }
</style>
