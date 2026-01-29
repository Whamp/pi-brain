<script lang="ts">
  import "../app.css";
  import { page } from "$app/state";
  import { onMount } from "svelte";
  import {
    LayoutDashboard,
    Network,
    Search,
    FolderTree,
    Settings,
    Brain,
    Lightbulb,
  } from "lucide-svelte";
  import { wsStore } from "$lib/stores/websocket";
  import { daemonStore } from "$lib/stores/daemon";
  import ErrorFallback from "$lib/components/error-fallback.svelte";
  import Toast from "$lib/components/toast.svelte";
  import PageTransition from "$lib/components/page-transition.svelte";

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
    if (href === "/") {return pathname === "/";}
    return pathname.startsWith(href);
  }

  let { children } = $props();

  onMount(() => {
    // Load initial daemon status
    daemonStore.loadStatus();

    // Connect WebSocket for real-time updates
    wsStore.connect();

    // Set up reactive polling: start when WS disconnected, stop when connected.
    // Skip the initial subscription callback (before WebSocket has connected)
    // to avoid an unnecessary HTTP request on page load.
    let isFirstEmission = true;
    const unsubscribeWs = wsStore.subscribe((wsState) => {
      if (isFirstEmission) {
        isFirstEmission = false;
        return;
      }

      // Simple logic: poll when not connected, stop when connected
      if (wsState.connected) {
        daemonStore.stopPolling();
      } else {
        daemonStore.startPolling();
      }
    });

    return () => {
      unsubscribeWs();
      daemonStore.stopPolling();
      wsStore.disconnect();
    };
  });
</script>

<div class="app-layout">
  <aside class="sidebar">
    <a href="/" class="logo">
      <Brain size={24} />
      <span class="logo-text">pi-brain</span>
    </a>

    <nav class="nav" aria-label="Main navigation">
      <ul class="nav-list">
        {#each navItems as item}
          <li>
            <a
              href={item.href}
              class="nav-link"
              class:active={isActive(item.href, page.url.pathname)}
              aria-current={isActive(item.href, page.url.pathname)
                ? "page"
                : undefined}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </a>
          </li>
        {/each}
      </ul>
    </nav>

    <div class="sidebar-footer">
      <div class="daemon-status">
        <span
          class="status-dot"
          class:success={$daemonStore.status?.running}
          class:error={$daemonStore.status && !$daemonStore.status.running}
          class:offline={$daemonStore.backendOffline}
        ></span>
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
  </aside>

  <main class="main-content">
    <svelte:boundary>
      <PageTransition key={page.url.pathname}>
        {#snippet children()}
          {@render children()}
        {/snippet}
      </PageTransition>
      {#snippet failed(error, reset)}
        <ErrorFallback error={error instanceof Error ? error : new Error(String(error))} {reset} />
      {/snippet}
    </svelte:boundary>
  </main>

  <Toast />
</div>

<style>
  .app-layout {
    display: flex;
    min-height: 100vh;
  }

  .sidebar {
    width: 240px;
    background: var(--color-bg-elevated);
    border-right: 1px solid var(--color-border);
    display: flex;
    flex-direction: column;
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    z-index: 100;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-6) var(--space-4);
    color: var(--color-text);
    text-decoration: none;
    border-bottom: 1px solid var(--color-border-subtle);
  }

  .logo-text {
    font-size: var(--text-lg);
    font-weight: 600;
  }

  .nav {
    flex: 1;
    min-height: 0;
    padding: var(--space-4);
    overflow-y: auto;
  }

  .nav-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .nav-link {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-2) var(--space-3);
    color: var(--color-text-muted);
    text-decoration: none;
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    font-weight: 500;
    transition:
      background var(--transition-fast),
      color var(--transition-fast);
  }

  .nav-link:hover {
    background: var(--color-bg-hover);
    color: var(--color-text);
  }

  .nav-link.active {
    background: var(--color-accent-muted);
    color: var(--color-accent);
  }

  .sidebar-footer {
    padding: var(--space-4);
    border-top: 1px solid var(--color-border-subtle);
  }

  .daemon-status {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--color-text-subtle);
  }

  .status-dot.success {
    background: var(--color-success);
  }

  .status-dot.error {
    background: var(--color-error);
  }

  .status-dot.offline {
    background: var(--color-warning, #f59e0b);
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .main-content {
    flex: 1;
    margin-left: 240px;
    padding: var(--space-6);
    min-height: 100vh;
  }

  /* Responsive: Hide sidebar on mobile */
  @media (max-width: 768px) {
    .sidebar {
      transform: translateX(-100%);
      transition: transform var(--transition-normal);
    }

    .main-content {
      margin-left: 0;
    }
  }
</style>
