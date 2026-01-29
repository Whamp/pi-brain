/**
 * Focus trap utility for modals, dropdowns, and panels.
 * Traps focus within a container and handles Escape key to close.
 */

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

/**
 * Gets all focusable elements within a container
 */
function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)];
}

/**
 * Creates a focus trap for a container element.
 *
 * @param {HTMLElement} container - The element to trap focus within
 * @param {object} options - Configuration options
 * @returns {function} A cleanup function to remove the trap
 *
 * @example
 * ```svelte
 * <script>
 *   let panelRef: HTMLDivElement;
 *   let isOpen = $state(false);
 *   let cleanup: (() => void) | null = null;
 *
 *   $effect(() => {
 *     if (isOpen && panelRef) {
 *       cleanup = createFocusTrap(panelRef, {
 *         onEscape: () => { isOpen = false; }
 *       });
 *     }
 *     return () => cleanup?.();
 *   });
 * </script>
 * ```
 */
export function createFocusTrap(
  container: HTMLElement,
  options: {
    /** Called when Escape key is pressed */
    onEscape?: () => void;
    /** Element to restore focus to when trap is removed */
    restoreFocus?: HTMLElement | null;
    /** Whether to focus the first element on activation (default: true) */
    autoFocus?: boolean;
  } = {}
): () => void {
  const { onEscape, restoreFocus, autoFocus = true } = options;

  // Store the element that had focus before the trap
  const previouslyFocused =
    restoreFocus ?? (document.activeElement as HTMLElement | null);

  // Focus first element if requested
  if (autoFocus) {
    const focusable = getFocusableElements(container);
    if (focusable.length > 0) {
      // Small delay to ensure element is rendered
      requestAnimationFrame(() => {
        focusable[0].focus();
      });
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    // Handle Escape
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onEscape?.();
      return;
    }

    // Handle Tab for focus trapping
    if (event.key === "Tab") {
      const focusable = getFocusableElements(container);
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const [first] = focusable;
      const last = focusable.at(-1);

      if (event.shiftKey) {
        // Shift+Tab: if on first element, go to last
        if (document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        // Tab: if on last element, go to first
        event.preventDefault();
        first.focus();
      }
    }
  }

  // Add listener to container (captures events from children)
  container.addEventListener("keydown", handleKeyDown);

  // Cleanup function
  return () => {
    container.removeEventListener("keydown", handleKeyDown);

    // Restore focus to previous element
    if (previouslyFocused && typeof previouslyFocused.focus === "function") {
      previouslyFocused.focus();
    }
  };
}

/**
 * Svelte action for focus trapping.
 * Use as `use:focusTrap={{ onEscape: () => ... }}`
 */
export function focusTrap(
  node: HTMLElement,
  options: Parameters<typeof createFocusTrap>[1] = {}
): {
  destroy: () => void;
  update: (newOptions: Parameters<typeof createFocusTrap>[1]) => void;
} {
  let cleanup = createFocusTrap(node, options);

  return {
    update(newOptions: Parameters<typeof createFocusTrap>[1]) {
      cleanup();
      cleanup = createFocusTrap(node, newOptions);
    },
    destroy() {
      cleanup();
    },
  };
}
