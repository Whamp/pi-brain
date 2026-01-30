/**
 * WebSocket store - manages real-time connection to the daemon
 */

import { writable } from "svelte/store";

import { daemonStore } from "./daemon";
import { nodesStore } from "./nodes";

interface WSState {
  connected: boolean;
  reconnecting: boolean;
  error: string | null;
}

const MAX_RECONNECT_DELAY = 60_000; // 1 minute max
const BASE_DELAY = 1000; // 1 second base

function getDefaultWsUrl(): string {
  if (typeof window === "undefined") {
    return "ws://localhost:8765/ws";
  }

  // Check for explicit env override first
  if (import.meta.env?.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL as string;
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";

  // Dev mode: use fixed port if running on common dev hosts
  const devHosts = ["localhost", "127.0.0.1", "0.0.0.0"];
  const isDevHost = devHosts.includes(window.location.hostname);
  const host = isDevHost
    ? `${window.location.hostname}:8765`
    : window.location.host;

  return `${protocol}//${host}/ws`;
}

function createWebSocketStore() {
  const { subscribe, set, update } = writable<WSState>({
    connected: false,
    reconnecting: false,
    error: null,
  });

  let ws: WebSocket | null = null;
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  let reconnectAttempts = 0;

  function getReconnectDelay(): number {
    // Exponential backoff with jitter
    const exponentialDelay = BASE_DELAY * 2 ** reconnectAttempts;
    const jitter = Math.random() * 1000; // 0-1 second jitter
    return Math.min(exponentialDelay + jitter, MAX_RECONNECT_DELAY);
  }

  function handleMessage(event: MessageEvent) {
    try {
      const msg = JSON.parse(event.data);

      switch (msg.type) {
        case "analysis.completed": {
          // Trigger node list refresh
          nodesStore.loadNodes();
          break;
        }
        case "daemon.status": {
          daemonStore.setStatus(msg.data);
          break;
        }
        case "node.created": {
          // Could add notification here
          break;
        }
        case "analysis.failed": {
          // Could add error notification here
          break;
        }
        default: {
          // Ignore unknown message types
          break;
        }
      }
    } catch {
      console.error("Failed to parse WebSocket message");
    }
  }

  function scheduleReconnect() {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
    }

    const delay = getReconnectDelay();
    reconnectAttempts++;

    // nosemgrep: no-console-log - Browser-side debugging for WebSocket reconnection
    console.log(
      `WebSocket reconnecting in ${Math.round(delay / 1000)}s (attempt ${reconnectAttempts})`
    );

    reconnectTimeout = setTimeout(() => connect(), delay);
  }

  function connect(url?: string) {
    // Derive WebSocket URL from current location if not provided
    const wsUrl = url ?? getDefaultWsUrl();

    if (ws?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        reconnectAttempts = 0; // Reset on successful connection
        set({ connected: true, reconnecting: false, error: null });

        // Subscribe to events
        ws?.send(
          JSON.stringify({
            type: "subscribe",
            channels: ["daemon", "analysis", "node"],
          })
        );
      };

      ws.onclose = (event) => {
        // Don't reconnect if closed intentionally (code 1000)
        if (event.code === 1000) {
          set({ connected: false, reconnecting: false, error: null });
        } else {
          set({ connected: false, reconnecting: true, error: null });
          scheduleReconnect();
        }
      };

      ws.onerror = () => {
        update((s) => ({ ...s, error: "WebSocket connection error" }));
      };

      ws.onmessage = handleMessage;
    } catch (error) {
      update((s) => ({
        ...s,
        error: error instanceof Error ? error.message : "Failed to connect",
      }));
    }
  }

  function disconnect() {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
    reconnectAttempts = 0;
    ws?.close(1000); // Normal closure
    ws = null;
    set({ connected: false, reconnecting: false, error: null });
  }

  function send(message: Record<string, unknown>) {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  return {
    subscribe,
    connect,
    disconnect,
    send,
  };
}

export const wsStore = createWebSocketStore();
