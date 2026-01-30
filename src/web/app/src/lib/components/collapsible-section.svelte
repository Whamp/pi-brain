<script lang="ts">
  import { ChevronDown } from "lucide-svelte";
  import type { Snippet, Component } from "svelte";

  interface Props {
    title: string;
    icon?: Component;
    defaultExpanded?: boolean;
    badge?: string | number;
    badgeVariant?: "default" | "accent" | "warning" | "success" | "error";
    children: Snippet;
    headerAction?: Snippet;
  }

  let {
    title,
    icon: Icon,
    defaultExpanded = false,
    badge,
    badgeVariant = "default",
    children,
    headerAction,
  }: Props = $props();

  let expanded = $state(defaultExpanded);

  function toggle() {
    expanded = !expanded;
  }
</script>

<section class="collapsible-section" class:expanded>
  <button
    type="button"
    class="collapsible-header"
    onclick={toggle}
    aria-expanded={expanded}
  >
    <div class="header-left">
      {#if Icon}
        <span class="header-icon">
          <Icon size={18} />
        </span>
      {/if}
      <h3 class="header-title">{title}</h3>
      {#if badge !== undefined}
        <span class="header-badge" data-variant={badgeVariant}>
          {badge}
        </span>
      {/if}
    </div>
    <div class="header-right">
      {#if headerAction}
        <span class="header-action" role="presentation" onclick={(e) => e.stopPropagation()} onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') e.stopPropagation(); }}>
          {@render headerAction()}
        </span>
      {/if}
      <span class="chevron" class:expanded>
        <ChevronDown size={16} />
      </span>
    </div>
  </button>

  {#if expanded}
    <div class="collapsible-content">
      {@render children()}
    </div>
  {/if}
</section>

<style>
  .collapsible-section {
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-lg);
    overflow: hidden;
    transition: border-color var(--transition-fast);
  }

  .collapsible-section:hover {
    border-color: var(--color-border);
  }

  .collapsible-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: var(--space-3) var(--space-4);
    background: transparent;
    border: none;
    cursor: pointer;
    text-align: left;
    color: var(--color-text);
    transition: background var(--transition-fast);
  }

  .collapsible-header:hover {
    background: var(--color-bg-hover);
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .header-icon {
    display: flex;
    align-items: center;
    color: var(--color-text-muted);
  }

  .header-title {
    font-size: var(--text-sm);
    font-weight: 600;
    margin: 0;
  }

  .header-badge {
    font-size: var(--text-xs);
    font-weight: 500;
    padding: 1px 6px;
    border-radius: var(--radius-full);
    background: var(--color-bg-hover);
    color: var(--color-text-muted);
  }

  .header-badge[data-variant="accent"] {
    background: var(--color-accent-muted);
    color: var(--color-accent);
  }

  .header-badge[data-variant="warning"] {
    background: hsla(30, 80%, 60%, 0.15);
    color: var(--color-warning);
  }

  .header-badge[data-variant="success"] {
    background: hsla(145, 65%, 52%, 0.15);
    color: var(--color-success);
  }

  .header-badge[data-variant="error"] {
    background: hsla(0, 72%, 72%, 0.15);
    color: var(--color-error);
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .header-action {
    display: flex;
    align-items: center;
  }

  .chevron {
    display: flex;
    align-items: center;
    color: var(--color-text-subtle);
    transition: transform var(--transition-fast);
  }

  .chevron.expanded {
    transform: rotate(180deg);
  }

  .collapsible-content {
    padding: var(--space-4);
    padding-top: 0;
    animation: slide-down 0.2s ease-out;
  }

  @keyframes slide-down {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
