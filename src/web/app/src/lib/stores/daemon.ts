/**
 * Daemon store - manages daemon status and real-time updates
 */

import type { DaemonStatus } from "$lib/types";

import { api } from "$lib/api/client";
import { writable } from "svelte/store";

interface DaemonState {
  status: DaemonStatus | null;
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

const initialState: DaemonState = {
  status: null,
  loading: false,
  error: null,
  lastUpdated: null,
};

function createDaemonStore() {
  const { subscribe, set, update } = writable<DaemonState>(initialState);

  return {
    subscribe,

    async loadStatus() {
      update((s) => ({ ...s, loading: true, error: null }));

      try {
        const status = await api.getDaemonStatus();
        update((s) => ({
          ...s,
          status,
          loading: false,
          lastUpdated: new Date().toISOString(),
        }));
      } catch (error) {
        update((s) => ({
          ...s,
          loading: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to load daemon status",
        }));
      }
    },

    setStatus(status: DaemonStatus) {
      update((s) => ({
        ...s,
        status,
        lastUpdated: new Date().toISOString(),
      }));
    },

    reset() {
      set(initialState);
    },
  };
}

export const daemonStore = createDaemonStore();
