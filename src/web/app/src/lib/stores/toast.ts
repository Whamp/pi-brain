/**
 * Toast notification store - manages temporary notification messages
 */

import { writable, derived } from "svelte/store";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
  createdAt: number;
}

interface ToastState {
  toasts: Toast[];
}

const initialState: ToastState = {
  toasts: [],
};

let toastIdCounter = 0;

function createToastStore() {
  const { subscribe, update } = writable<ToastState>(initialState);

  function removeToast(id: string) {
    update((state) => ({
      ...state,
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  }

  function addToast(type: ToastType, message: string, duration = 5000): string {
    toastIdCounter += 1;
    const id = `toast-${toastIdCounter}`;
    const toast: Toast = {
      id,
      type,
      message,
      duration,
      createdAt: Date.now(),
    };

    update((state) => ({
      ...state,
      toasts: [...state.toasts, toast],
    }));

    // Auto-dismiss after duration
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  }

  return {
    subscribe,

    /**
     * Show a success toast
     */
    success(message: string, duration?: number): string {
      return addToast("success", message, duration);
    },

    /**
     * Show an error toast
     */
    error(message: string, duration?: number): string {
      return addToast("error", message, duration ?? 8000);
    },

    /**
     * Show a warning toast
     */
    warning(message: string, duration?: number): string {
      return addToast("warning", message, duration);
    },

    /**
     * Show an info toast
     */
    info(message: string, duration?: number): string {
      return addToast("info", message, duration);
    },

    /**
     * Dismiss a specific toast by ID
     */
    dismiss(id: string): void {
      removeToast(id);
    },

    /**
     * Dismiss all toasts
     */
    dismissAll(): void {
      update(() => initialState);
    },
  };
}

export const toastStore = createToastStore();

// Derived store for easy access to toast list
export const toasts = derived(toastStore, ($store) => $store.toasts);
