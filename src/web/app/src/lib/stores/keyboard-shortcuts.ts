import { goto } from "$app/navigation";
import { writable, get } from "svelte/store";

/**
 * Keyboard shortcut definition
 */
interface Shortcut {
  key: string;
  description: string;
  category: string;
}

/**
 * Keyboard shortcuts store state
 */
interface KeyboardShortcutsState {
  helpModalOpen: boolean;
  pendingPrefix: string | null;
}

function createKeyboardShortcutsStore() {
  const { subscribe, update } = writable<KeyboardShortcutsState>({
    helpModalOpen: false,
    pendingPrefix: null,
  });

  // All available shortcuts
  const shortcuts: Shortcut[] = [
    // Navigation shortcuts (g prefix)
    { key: "g h", description: "Go to Dashboard", category: "Navigation" },
    { key: "g g", description: "Go to Graph", category: "Navigation" },
    { key: "g s", description: "Go to Search", category: "Navigation" },
    { key: "g l", description: "Go to Learning", category: "Navigation" },
    { key: "g e", description: "Go to Sessions", category: "Navigation" },
    { key: "g t", description: "Go to Settings", category: "Navigation" },
    // Global shortcuts
    { key: "/", description: "Focus search", category: "Global" },
    { key: "?", description: "Show keyboard shortcuts", category: "Global" },
    {
      key: "Escape",
      description: "Close modal / Clear focus",
      category: "Global",
    },
  ];

  // Navigation map for g prefix shortcuts
  const gotoMap: Record<string, string> = {
    h: "/",
    g: "/graph",
    s: "/search",
    l: "/prompt-learning",
    e: "/sessions",
    t: "/settings",
  };

  let prefixTimeout: ReturnType<typeof setTimeout> | null = null;

  function clearPendingPrefix() {
    update((state) => ({ ...state, pendingPrefix: null }));
    if (prefixTimeout) {
      clearTimeout(prefixTimeout);
      prefixTimeout = null;
    }
  }

  async function focusSearchInput() {
    await goto("/search");
    // Wait for DOM to update then focus search input
    requestAnimationFrame(() => {
      const searchInput = document.querySelector(
        '.search-box input[type="search"]'
      ) as HTMLInputElement | null;
      searchInput?.focus();
    });
  }

  function handleKeydown(event: KeyboardEvent) {
    const state = get({ subscribe });
    const target = event.target as HTMLElement;
    const tagName = target.tagName.toLowerCase();
    const isEditable =
      tagName === "input" ||
      tagName === "textarea" ||
      tagName === "select" ||
      target.isContentEditable;

    // Always handle Escape
    if (event.key === "Escape") {
      if (state.helpModalOpen) {
        event.preventDefault();
        update((s) => ({ ...s, helpModalOpen: false }));
        return;
      }
      if (state.pendingPrefix) {
        event.preventDefault();
        clearPendingPrefix();
        return;
      }
      // Blur active element if in a form field
      if (isEditable && document.activeElement instanceof HTMLElement) {
        event.preventDefault();
        document.activeElement.blur();
      }
      return;
    }

    // Don't handle shortcuts when in editable fields (except Escape above)
    if (isEditable) {
      return;
    }

    // Handle ? for help modal
    if (
      event.key === "?" &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      event.preventDefault();
      update((s) => ({ ...s, helpModalOpen: !s.helpModalOpen }));
      return;
    }

    // Handle / for search focus
    if (
      event.key === "/" &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      event.preventDefault();
      focusSearchInput();
      return;
    }

    // Handle g prefix for navigation
    if (state.pendingPrefix === "g") {
      const destination = gotoMap[event.key];
      if (destination) {
        event.preventDefault();
        clearPendingPrefix();
        goto(destination);
        return;
      }
      // Invalid follow-up key, clear prefix
      clearPendingPrefix();
      return;
    }

    // Start g prefix
    if (
      event.key === "g" &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      event.preventDefault();
      update((s) => ({ ...s, pendingPrefix: "g" }));
      // Clear prefix after 1.5 seconds if no follow-up
      prefixTimeout = setTimeout(clearPendingPrefix, 1500);
    }
  }

  function openHelp() {
    update((s) => ({ ...s, helpModalOpen: true }));
  }

  function closeHelp() {
    update((s) => ({ ...s, helpModalOpen: false }));
  }

  function init() {
    if (typeof window === "undefined") {
      return () => {
        /* noop for SSR */
      };
    }

    window.addEventListener("keydown", handleKeydown);
    return () => {
      window.removeEventListener("keydown", handleKeydown);
      if (prefixTimeout) {
        clearTimeout(prefixTimeout);
      }
    };
  }

  return {
    subscribe,
    init,
    openHelp,
    closeHelp,
    getShortcuts: () => shortcuts,
  };
}

export const keyboardShortcuts = createKeyboardShortcutsStore();
