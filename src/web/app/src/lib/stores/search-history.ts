/**
 * Search history store with localStorage persistence
 * Stores recent searches and provides quick access
 */

import { writable, type Writable } from "svelte/store";

const STORAGE_KEY = "pi-brain-search-history";
const MAX_HISTORY_SIZE = 10;

interface SearchHistoryEntry {
  query: string;
  timestamp: number;
}

interface SearchHistoryState {
  entries: SearchHistoryEntry[];
}

function createSearchHistoryStore(): Writable<SearchHistoryState> & {
  addSearch: (query: string) => void;
  removeSearch: (query: string) => void;
  clearHistory: () => void;
} {
  // Load initial state from localStorage
  function loadFromStorage(): SearchHistoryState {
    if (typeof window === "undefined") {
      return { entries: [] };
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as SearchHistoryState;
        return parsed;
      }
    } catch {
      // localStorage may be unavailable or corrupted
    }
    return { entries: [] };
  }

  // Save state to localStorage
  function saveToStorage(state: SearchHistoryState): void {
    if (typeof window === "undefined") {
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // localStorage may be unavailable
    }
  }

  const store = writable<SearchHistoryState>(loadFromStorage());

  // Subscribe to changes and persist
  store.subscribe((state) => {
    saveToStorage(state);
  });

  function addSearch(query: string): void {
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }

    store.update((state) => {
      // Remove existing entry with same query (case-insensitive)
      const filtered = state.entries.filter(
        (e) => e.query.toLowerCase() !== trimmed.toLowerCase()
      );

      // Add new entry at the beginning
      const newEntries = [
        { query: trimmed, timestamp: Date.now() },
        ...filtered,
      ].slice(0, MAX_HISTORY_SIZE);

      return { entries: newEntries };
    });
  }

  function removeSearch(query: string): void {
    store.update((state) => ({
      entries: state.entries.filter(
        (e) => e.query.toLowerCase() !== query.toLowerCase()
      ),
    }));
  }

  function clearHistory(): void {
    store.set({ entries: [] });
  }

  return {
    subscribe: store.subscribe,
    set: store.set,
    update: store.update,
    addSearch,
    removeSearch,
    clearHistory,
  };
}

export const searchHistory = createSearchHistoryStore();
