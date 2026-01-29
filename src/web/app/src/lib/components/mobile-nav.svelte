<script lang="ts">
  import { page } from "$app/state";
  import {
    LayoutDashboard,
    Network,
    Search,
    FolderTree,
    Settings,
    Brain,
    Lightbulb,
    Menu,
    X,
  } from "lucide-svelte";
  import { daemonStore } from "$lib/stores/daemon";
  import { focusTrap, createFocusTrap } from "$lib/utils/focus-trap";
  import StatusDot from "$lib/components/status-dot.svelte";

  interface NavItem {
    href: string;
    label: string;
    icon: typeof LayoutDashboard;
  }

  const navItems: NavItem[] = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/graph", label: "Graph", icon: Network },
    { href: "/search", label: "Search", icon: Search },
    { href: "/prompt-learning", label: "Learning", icon: Lightbulb },
    { href: "/sessions", label: "Sessions", icon: FolderTree },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  function isActive(href: string, pathname: string): boolean {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  }

  let isOpen = $state(false);

  function toggle() {
    isOpen = !isOpen;
  }

  function close() {
    isOpen = false;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape" && isOpen) {
      close();
    }
  }

  function handleNavClick() {
    close();
  }

  // Trap focus when open
  let cleanup: (() => void) | null = null;
  $effect(() => {
    const drawerNode = document.getElementById("mobile-drawer");
    if (isOpen && drawerNode) {
      cleanup = createFocusTrap(drawerNode, {
        onEscape: close,
      });
    } else {
      cleanup?.();
      cleanup = null;
    }
    return () => cleanup?.();
  });
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<svelte:window onkeydown={handleKeydown} />

<!-- Mobile Header Bar -->
<header class="mobile-header">
  <a href="/" class="mobile-logo">
    <Brain size={24} />
    <span>pi-brain</span>
  </a>

  <button
    class="hamburger"
    onclick={toggle}
    aria-label={isOpen ? "Close menu" : "Open menu"}
    aria-expanded={isOpen}
    aria-controls="mobile-drawer"
  >
    {#if isOpen}
      <X size={24} />
    {:else}
      <Menu size={24} />
    {/if}
  </button>
</header>

<!-- Backdrop overlay -->
{#if isOpen}
  <button
    class="backdrop"
    onclick={close}
    aria-label="Close menu"
    tabindex="-1"
  ></button>
{/if}

<!-- Slide-out drawer -->
<nav
  id="mobile-drawer"
  class="drawer"
  class:open={isOpen}
  aria-hidden={!isOpen}
>
  <div class="drawer-header">
    <a href="/" class="drawer-logo" onclick={handleNavClick}>
      <Brain size={28} />
      <span>pi-brain</span>
    </a>
  </div>

  <ul class="drawer-nav">
    {#each navItems as item}
      <li>
        <a
          href={item.href}
          class="drawer-link"
          class:active={isActive(item.href, page.url.pathname)}
          aria-current={isActive(item.href, page.url.pathname)
            ? "page"
            : undefined}
          onclick={handleNavClick}
        >
          <item.icon size={22} />
          <span>{item.label}</span>
        </a>
      </li>
    {/each}
  </ul>

  <div class="drawer-footer">
    <div class="daemon-status">
      <StatusDot
        status={$daemonStore.loading ? 'loading' : $daemonStore.backendOffline ? 'offline' : $daemonStore.status?.running ? 'success' : 'error'}
        size={10}
      />
      <span class="status-text">
        {#if $daemonStore.loading}
          Checking...
        {:else if $daemonStore.backendOffline}
          Backend offline
        {:else if $daemonStore.status?.running}
          Daemon running
        {:else if $daemonStore.status}
          Daemon stopped
        {:else}
          Daemon unknown
        {/if}
      </span>
    </div>
  </div>
</nav>

<style>
  /* Mobile header bar - fixed at top */
  .mobile-header {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 60px;
    background: rgba(20, 20, 23, 0.7);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--color-border);
    padding: 0 var(--space-4);
    align-items: center;
    justify-content: space-between;
    z-index: 200;
  }

  .mobile-logo {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    color: var(--color-text);
    text-decoration: none;
    font-size: var(--text-lg);
    font-weight: 600;
  }

  /* Hamburger button - touch-optimized 44px minimum */
  .hamburger {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    background: transparent;
    border: none;
    border-radius: var(--radius-md);
    color: var(--color-text);
    cursor: pointer;
    transition: background var(--transition-fast);
  }

  .hamburger:hover {
    background: var(--color-bg-hover);
  }

  .hamburger:active {
    background: var(--color-border);
  }

  /* Backdrop overlay */
  .backdrop {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    z-index: 250;
    border: none;
    cursor: pointer;
    -webkit-backdrop-filter: blur(4px);
    backdrop-filter: blur(4px);
    animation: fadeIn 0.2s ease;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  /* Slide-out drawer */
  .drawer {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 280px;
    max-width: 85vw;
    background: rgba(20, 20, 23, 0.85);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-right: 1px solid var(--color-border);
    z-index: 300;
    flex-direction: column;
    transform: translateX(-100%);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 4px 0 24px rgba(0, 0, 0, 0.3);
  }

  .drawer.open {
    transform: translateX(0);
  }

  .drawer-header {
    padding: var(--space-6) var(--space-6);
    border-bottom: 1px solid var(--color-border-subtle);
  }

  .drawer-logo {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    color: var(--color-text);
    text-decoration: none;
    font-size: var(--text-xl);
    font-weight: 600;
  }

  .drawer-nav {
    flex: 1;
    list-style: none;
    padding: var(--space-4);
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  /* Navigation links - touch-optimized 44px minimum height */
  .drawer-link {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-3) var(--space-4);
    min-height: 48px;
    color: var(--color-text-muted);
    text-decoration: none;
    border-radius: var(--radius-md);
    font-size: var(--text-base);
    font-weight: 500;
    transition:
      background var(--transition-fast),
      color var(--transition-fast);
  }

  .drawer-link:hover {
    background: var(--color-bg-hover);
    color: var(--color-text);
  }

  .drawer-link:active {
    background: var(--color-border);
  }

  .drawer-link.active {
    background: var(--color-accent-muted);
    color: var(--color-accent);
  }

  .drawer-footer {
    padding: var(--space-4) var(--space-6);
    border-top: 1px solid var(--color-border-subtle);
  }

  .daemon-status {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }

  /* Show mobile navigation on small screens */
  @media (max-width: 768px) {
    .mobile-header {
      display: flex;
    }

    .backdrop {
      display: block;
    }

    .drawer {
      display: flex;
    }
  }
</style>
