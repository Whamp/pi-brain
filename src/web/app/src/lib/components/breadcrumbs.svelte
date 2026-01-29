<!--
  Breadcrumbs - Consistent navigation breadcrumb component
  
  Usage (links):
  <Breadcrumbs items={[
    { label: 'Graph', href: '/graph' },
    { label: 'Node abc123' }
  ]} />
  
  Usage (interactive with onClick):
  <Breadcrumbs items={[
    { label: 'All Projects', icon: Home, onClick: () => goToProjects() },
    { label: 'My Project', icon: Folder, onClick: () => goToProject() },
    { label: 'Session 123', icon: FileText }
  ]} showHome={false} />
  
  The last item (without href or onClick) is displayed as the current page.
-->
<script lang="ts">
  import { ChevronRight, Home } from "lucide-svelte";
  import type { ComponentType } from "svelte";

  interface BreadcrumbItem {
    label: string;
    href?: string;
    onClick?: () => void;
    icon?: ComponentType;
  }

  interface Props {
    items: BreadcrumbItem[];
    showHome?: boolean;
  }

  let { items, showHome = true }: Props = $props();

  function isClickable(item: BreadcrumbItem, isLast: boolean): boolean {
    return !isLast && (Boolean(item.href) || Boolean(item.onClick));
  }
</script>

<nav class="breadcrumbs" aria-label="Breadcrumb">
  <ol class="breadcrumb-list">
    {#if showHome}
      <li class="breadcrumb-item">
        <a href="/" class="breadcrumb-link home-link" aria-label="Dashboard">
          <Home size={14} />
        </a>
        {#if items.length > 0}
          <ChevronRight size={14} class="breadcrumb-separator" aria-hidden="true" />
        {/if}
      </li>
    {/if}
    
    {#each items as item, index}
      {@const isLast = index === items.length - 1}
      <li class="breadcrumb-item">
        {#if isLast}
          <!-- Current page (not clickable) -->
          <span class="breadcrumb-current" aria-current="page">
            {#if item.icon}
              <svelte:component this={item.icon} size={14} />
            {/if}
            {item.label}
          </span>
        {:else if item.href}
          <!-- Link-based navigation -->
          <a href={item.href} class="breadcrumb-link">
            {#if item.icon}
              <svelte:component this={item.icon} size={14} />
            {/if}
            {item.label}
          </a>
          <ChevronRight size={14} class="breadcrumb-separator" aria-hidden="true" />
        {:else if item.onClick}
          <!-- Button-based navigation -->
          <button type="button" class="breadcrumb-button" onclick={item.onClick}>
            {#if item.icon}
              <svelte:component this={item.icon} size={14} />
            {/if}
            {item.label}
          </button>
          <ChevronRight size={14} class="breadcrumb-separator" aria-hidden="true" />
        {:else}
          <!-- Non-interactive item (shouldn't happen for non-last items) -->
          <span class="breadcrumb-link">
            {#if item.icon}
              <svelte:component this={item.icon} size={14} />
            {/if}
            {item.label}
          </span>
          <ChevronRight size={14} class="breadcrumb-separator" aria-hidden="true" />
        {/if}
      </li>
    {/each}
  </ol>
</nav>

<style>
  .breadcrumbs {
    margin-bottom: var(--space-4);
  }

  .breadcrumb-list {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-1);
    list-style: none;
    margin: 0;
    padding: 0;
    font-size: var(--text-sm);
  }

  .breadcrumb-item {
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }

  .breadcrumb-link,
  .breadcrumb-button {
    color: var(--color-text-muted);
    text-decoration: none;
    transition: color var(--transition-fast), background var(--transition-fast);
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);
    font-size: inherit;
    font-family: inherit;
    background: transparent;
    border: none;
    cursor: pointer;
  }

  .breadcrumb-link:hover,
  .breadcrumb-button:hover {
    color: var(--color-accent);
    background: var(--color-bg-hover);
  }

  .home-link {
    padding: var(--space-1);
  }

  .breadcrumb-separator {
    color: var(--color-text-subtle);
    flex-shrink: 0;
  }

  .breadcrumb-current {
    color: var(--color-text);
    font-weight: 500;
    padding: var(--space-1) var(--space-2);
    max-width: 300px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
  }

  /* Responsive: On small screens, truncate earlier */
  @media (max-width: 640px) {
    .breadcrumb-current {
      max-width: 180px;
    }
  }
</style>
