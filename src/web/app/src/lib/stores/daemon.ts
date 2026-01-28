/**
 * Daemon store - manages daemon status and real-time updates
 *
 * Supports two modes of status updates:
 * 1. WebSocket push (preferred) - real-time via setStatus()
 * 2. Polling fallback - periodic HTTP calls when WebSocket unavailable
 */

import type { DaemonStatus } from "$lib/types";

import { api, isBackendOffline } from "$lib/api/client";
import { writable } from "svelte/store";

/** Default polling interval: 30 seconds */
const DEFAULT_POLL_INTERVAL_MS = 30_000;

interface DaemonState {
  status: DaemonStatus | null;
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
  /** Whether polling is active (separate from WebSocket status) */
  polling: boolean;
  /** Whether the backend is unreachable */
  backendOffline: boolean;
}

const initialState: DaemonState = {
  status: null,
  loading: false,
  error: null,
  lastUpdated: null,
  polling: false,
  backendOffline: false,
};

function createDaemonStore() {
  const { subscribe, set, update } = writable<DaemonState>(initialState);
  let pollIntervalId: ReturnType<typeof setInterval> | null = null;

  async function fetchStatus() {
    update((s) => ({ ...s, loading: true, error: null }));

    try {
      const status = await api.getDaemonStatus();
      update((s) => ({
        ...s,
        status,
        loading: false,
        lastUpdated: new Date().toISOString(),
        backendOffline: false,
      }));
    } catch (error) {
      const offline = isBackendOffline(error);
      update((s) => ({
        ...s,
        loading: false,
        backendOffline: offline,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load daemon status",
      }));
    }
  }

  return {
    subscribe,

    /**
     * Load daemon status once (for initial load or manual refresh)
     */
    async loadStatus() {
      await fetchStatus();
    },

    /**
     * Start polling for daemon status at the given interval.
     * Used as a fallback when WebSocket is unavailable.
     * @param {number} intervalMs Polling interval in milliseconds (default: 30s)
     */
    startPolling(intervalMs: number = DEFAULT_POLL_INTERVAL_MS) {
      // Avoid multiple intervals
      if (pollIntervalId !== null) {
        return;
      }

      update((s) => ({ ...s, polling: true }));

      // Poll immediately, then at interval
      fetchStatus();
      pollIntervalId = setInterval(fetchStatus, intervalMs);
    },

    /**
     * Stop polling for daemon status.
     * Call this when WebSocket connection is established.
     */
    stopPolling() {
      if (pollIntervalId !== null) {
        clearInterval(pollIntervalId);
        pollIntervalId = null;
      }
      update((s) => ({ ...s, polling: false }));
    },

    /**
     * Set daemon status from WebSocket push.
     * Clears any error state since we have fresh data.
     */
    setStatus(status: DaemonStatus) {
      update((s) => ({
        ...s,
        status,
        lastUpdated: new Date().toISOString(),
        error: null,
        backendOffline: false,
      }));
    },

    reset() {
      if (pollIntervalId !== null) {
        clearInterval(pollIntervalId);
        pollIntervalId = null;
      }
      set(initialState);
    },
  };
}

export const daemonStore = createDaemonStore();
