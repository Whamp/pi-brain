<script lang="ts">
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Tab {
    id: string;
    label: string;
    // lucide-svelte components don't match Svelte 5 Component type - needs explicit any
    // oxlint-ignore no-explicit-any
    icon?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  }

  interface Props {
    tabs: Tab[];
    activeTab: string;
    onchange: (tabId: string) => void;
  }

  const {
    tabs = [],
    activeTab,
    onchange,
  }: Props = $props();

  function handleKeydown(event: KeyboardEvent, index: number) {
    let newIndex = index;

    switch (event.key) {
      case "ArrowRight": {
        newIndex = (index + 1) % tabs.length;
        break;
      }
      case "ArrowLeft": {
        newIndex = (index - 1 + tabs.length) % tabs.length;
        break;
      }
      case "Home": {
        newIndex = 0;
        break;
      }
      case "End": {
        newIndex = tabs.length - 1;
        break;
      }
      default: {
        return;
      }
    }

    event.preventDefault();
    onchange(tabs[newIndex].id);
    
    // Focus the new tab
    const tabElement = document.querySelector(`[data-tab-id="${tabs[newIndex].id}"]`) as HTMLElement;
    tabElement?.focus();
  }
</script>

<div class="tabs" role="tablist" aria-label="Settings sections">
  {#each tabs as tab, index (tab.id)}
    {@const isActive = tab.id === activeTab}
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      aria-controls={`panel-${tab.id}`}
      id={`tab-${tab.id}`}
      data-tab-id={tab.id}
      tabindex={isActive ? 0 : -1}
      class="tab"
      class:active={isActive}
      onclick={() => onchange(tab.id)}
      onkeydown={(e) => handleKeydown(e, index)}
    >
      {#if tab.icon}
        {@const Icon = tab.icon}
        <Icon size={16} />
      {/if}
      <span>{tab.label}</span>
    </button>
  {/each}
</div>

<style>
  .tabs {
    display: flex;
    gap: var(--space-1);
    padding: var(--space-1);
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }

  .tabs::-webkit-scrollbar {
    display: none;
  }

  .tab {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    background: transparent;
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--color-text-muted);
    white-space: nowrap;
    cursor: pointer;
    transition: color 0.15s ease, background 0.15s ease;
  }

  .tab:hover {
    color: var(--color-text);
    background: var(--color-bg-hover);
  }

  .tab:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: -2px;
  }

  .tab.active {
    color: var(--color-text);
    background: var(--color-bg-elevated);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  @media (max-width: 768px) {
    .tabs {
      flex-wrap: nowrap;
      justify-content: flex-start;
    }

    .tab {
      padding: var(--space-2);
    }

    .tab span {
      display: none;
    }

    .tab :global(svg) {
      width: 18px;
      height: 18px;
    }
  }
</style>
