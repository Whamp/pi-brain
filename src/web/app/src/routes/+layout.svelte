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
    PanelLeftClose,
    PanelLeft,
  } from "lucide-svelte";
  import { wsStore } from "$lib/stores/websocket";
  import { daemonStore } from "$lib/stores/daemon";
  import { keyboardShortcuts } from "$lib/stores/keyboard-shortcuts";
  import { activeTheme, initTheme, applyTheme } from "$lib/stores/theme";
  import ErrorFallback from "$lib/components/error-fallback.svelte";
  import Toast from "$lib/components/toast.svelte";
  import MobileNav from "$lib/components/mobile-nav.svelte";
  import KeyboardShortcutsModal from "$lib/components/keyboard-shortcuts-modal.svelte";
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
    if (href === "/") {return pathname === "/";}
    return pathname.startsWith(href);
  }

  let { children } = $props();

  // Apply theme changes reactively (client-side only)
  $effect(() => {
    if (typeof document !== "undefined") {
      applyTheme($activeTheme);
    }
  });

  // Sidebar collapse state with localStorage persistence
  let sidebarCollapsed = $state(false);
  const STORAGE_KEY = "pi-brain-sidebar-collapsed";

  function toggleSidebar() {
    sidebarCollapsed = !sidebarCollapsed;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sidebarCollapsed));
    } catch {
      // localStorage may be unavailable
    }
  }

  onMount(() => {
    // Load sidebar preference from localStorage
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved !== null) {
        sidebarCollapsed = JSON.parse(saved);
      }
    } catch {
      // localStorage may be unavailable
    }

    // Load initial daemon status
    daemonStore.loadStatus();

    // Initialize theme system
    const cleanupTheme = initTheme();

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

    // Initialize keyboard shortcuts
    const cleanupKeyboardShortcuts = keyboardShortcuts.init();

    return () => {
      cleanupTheme();
      unsubscribeWs();
      daemonStore.stopPolling();
      wsStore.disconnect();
      cleanupKeyboardShortcuts();
    };
  });
</script>

<div class="app-layout bg-page-effects" class:sidebar-collapsed={sidebarCollapsed}>
  <!-- Mobile navigation (hidden on desktop) -->
  <MobileNav />

  <aside class="sidebar" class:collapsed={sidebarCollapsed}>
    <a href="/" class="logo" title="pi-brain">
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
              title={sidebarCollapsed ? item.label : undefined}
            >
              <item.icon size={18} />
              <span class="nav-label">{item.label}</span>
            </a>
          </li>
        {/each}
      </ul>
    </nav>

    <div class="sidebar-footer">
      <div class="daemon-status" title={sidebarCollapsed ? ($daemonStore.loading ? "Checking..." : $daemonStore.backendOffline ? "Backend offline" : $daemonStore.status?.running ? "Daemon running" : $daemonStore.status ? "Daemon stopped" : "Daemon unknown") : undefined}>
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

      <button
        class="collapse-toggle"
        onclick={toggleSidebar}
        title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {#if sidebarCollapsed}
          <PanelLeft size={18} />
        {:else}
          <PanelLeftClose size={18} />
        {/if}
      </button>
    </div>
  </aside>

  <main class="main-content">
    <svelte:boundary>
      {@render children()}
      {#snippet failed(error, reset)}
        <ErrorFallback error={error instanceof Error ? error : new Error(String(error))} {reset} />
      {/snippet}
    </svelte:boundary>
  </main>

  <Toast />
  <KeyboardShortcutsModal />
</div>

<style>
  .app-layout {
    display: flex;
    min-height: 100vh;
  }

  .sidebar {
    width: var(--sidebar-width);
    background: rgba(20, 20, 23, 0.7);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-right: 1px solid var(--color-border);
    display: flex;
    flex-direction: column;
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    z-index: 100;
    transition: width var(--transition-slow);
    overflow: hidden;
    box-shadow: 4px 0 24px rgba(0, 0, 0, 0.4);
  }

  .sidebar.collapsed {
    width: var(--sidebar-width-collapsed);
  }

  .logo {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-6) var(--space-4);
    color: var(--color-text);
    text-decoration: none;
    border-bottom: 1px solid var(--color-border-subtle);
    white-space: nowrap;
    overflow: hidden;
  }

  .sidebar.collapsed .logo {
    justify-content: center;
    padding: var(--space-6) var(--space-3);
  }

  .logo-text {
    font-size: var(--text-lg);
    font-weight: 600;
    opacity: 1;
    transition: opacity var(--transition-normal);
  }

  .sidebar.collapsed .logo-text {
    opacity: 0;
    width: 0;
    overflow: hidden;
  }

  .nav {
    flex: 1;
    min-height: 0;
    padding: var(--space-4);
    overflow-y: auto;
  }

  .sidebar.collapsed .nav {
    padding: var(--space-4) var(--space-2);
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
    white-space: nowrap;
    overflow: hidden;
  }

  .sidebar.collapsed .nav-link {
    justify-content: center;
    padding: var(--space-2);
  }

  .nav-label {
    opacity: 1;
    transition: opacity var(--transition-normal);
  }

  .sidebar.collapsed .nav-label {
    opacity: 0;
    width: 0;
    overflow: hidden;
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
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .sidebar.collapsed .sidebar-footer {
    padding: var(--space-3) var(--space-2);
    align-items: center;
  }

  .daemon-status {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    white-space: nowrap;
    overflow: hidden;
  }

  .sidebar.collapsed .daemon-status {
    justify-content: center;
  }

  .status-text {
    opacity: 1;
    transition: opacity var(--transition-normal);
  }

  .sidebar.collapsed .status-text {
    opacity: 0;
    width: 0;
    overflow: hidden;
  }

  .collapse-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    width: 100%;
    padding: var(--space-2);
    background: transparent;
    color: var(--color-text-muted);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition:
      background var(--transition-fast),
      color var(--transition-fast),
      border-color var(--transition-fast);
  }

  .collapse-toggle:hover {
    background: var(--color-bg-hover);
    color: var(--color-text);
    border-color: var(--color-border);
  }

  .sidebar.collapsed .collapse-toggle {
    width: auto;
    padding: var(--space-2);
  }

  .main-content {
    flex: 1;
    margin-left: var(--sidebar-width);
    padding: var(--space-6);
    min-height: 100vh;
    transition: margin-left var(--transition-slow);
  }

  .app-layout.sidebar-collapsed .main-content {
    margin-left: var(--sidebar-width-collapsed);
  }

  /* Responsive: Hide sidebar on mobile, show mobile nav */
  @media (max-width: 768px) {
    .sidebar {
      display: none;
    }

    .main-content {
      margin-left: 0;
      /* Account for fixed mobile header (60px) */
      padding-top: calc(60px + var(--space-6));
    }

    .app-layout.sidebar-collapsed .main-content {
      margin-left: 0;
    }
  }
</style>
