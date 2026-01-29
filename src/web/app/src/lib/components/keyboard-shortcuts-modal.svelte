<script lang="ts">
  import { X, Keyboard } from "lucide-svelte";
  import { keyboardShortcuts } from "$lib/stores/keyboard-shortcuts";
  import { focusTrap } from "$lib/utils/focus-trap";

  const shortcuts = keyboardShortcuts.getShortcuts();

  // Group shortcuts by category
  const groupedShortcuts: Record<string, typeof shortcuts> = {};
  for (const shortcut of shortcuts) {
    if (!groupedShortcuts[shortcut.category]) {
      groupedShortcuts[shortcut.category] = [];
    }
    groupedShortcuts[shortcut.category].push(shortcut);
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      keyboardShortcuts.closeHelp();
    }
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      keyboardShortcuts.closeHelp();
    }
  }

  function formatKey(key: string): string[] {
    // Split multi-key shortcuts (e.g., "g h" -> ["g", "h"])
    return key.split(" ");
  }
</script>

{#if $keyboardShortcuts.helpModalOpen}
  <div
    class="modal-backdrop"
    role="dialog"
    aria-modal="true"
    aria-labelledby="shortcuts-title"
    onclick={handleBackdropClick}
    onkeydown={handleKeydown}
  >
    <div class="modal" use:focusTrap>
      <header class="modal-header">
        <div class="modal-title-section">
          <Keyboard size={20} />
          <h2 id="shortcuts-title">Keyboard Shortcuts</h2>
        </div>
        <button
          class="close-button"
          onclick={() => keyboardShortcuts.closeHelp()}
          aria-label="Close keyboard shortcuts"
        >
          <X size={20} />
        </button>
      </header>

      <div class="modal-body">
        {#each Object.entries(groupedShortcuts) as [category, categoryShortcuts]}
          <section class="shortcut-category">
            <h3 class="category-title">{category}</h3>
            <ul class="shortcut-list">
              {#each categoryShortcuts as shortcut}
                <li class="shortcut-item">
                  <span class="shortcut-description">{shortcut.description}</span>
                  <span class="shortcut-keys">
                    {#each formatKey(shortcut.key) as keyPart, i}
                      {#if i > 0}
                        <span class="key-separator">then</span>
                      {/if}
                      <kbd>{keyPart}</kbd>
                    {/each}
                  </span>
                </li>
              {/each}
            </ul>
          </section>
        {/each}
      </div>

      <footer class="modal-footer">
        <p class="footer-hint">
          Press <kbd>?</kbd> anytime to toggle this help
        </p>
      </footer>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: var(--space-4);
    animation: fade-in 0.15s ease-out;
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .modal {
    background: rgba(20, 20, 23, 0.85);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-xl), var(--shadow-highlight);
    width: 100%;
    max-width: 500px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    animation: slide-up 0.2s ease-out;
  }

  @keyframes slide-up {
    from {
      opacity: 0;
      transform: translateY(16px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4) var(--space-5);
    border-bottom: 1px solid var(--color-border-subtle);
  }

  .modal-title-section {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    color: var(--color-accent);
  }

  .modal-title-section h2 {
    font-size: var(--text-lg);
    font-weight: 600;
    color: var(--color-text);
    margin: 0;
  }

  .close-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    background: none;
    border: none;
    border-radius: var(--radius-md);
    color: var(--color-text-muted);
    cursor: pointer;
    transition:
      background var(--transition-fast),
      color var(--transition-fast);
  }

  .close-button:hover {
    background: var(--color-bg-hover);
    color: var(--color-text);
  }

  .modal-body {
    padding: var(--space-4) var(--space-5);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
  }

  .shortcut-category {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .category-title {
    font-size: var(--text-xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-subtle);
    margin: 0;
  }

  .shortcut-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .shortcut-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    padding: var(--space-2) 0;
  }

  .shortcut-description {
    font-size: var(--text-sm);
    color: var(--color-text);
  }

  .shortcut-keys {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex-shrink: 0;
  }

  .key-separator {
    font-size: var(--text-xs);
    color: var(--color-text-subtle);
  }

  kbd {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 24px;
    height: 24px;
    padding: 0 var(--space-2);
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--color-text);
    box-shadow:
      0 2px 0 0 var(--color-border-subtle),
      inset 0 1px 0 0 rgba(255, 255, 255, 0.05);
  }

  .modal-footer {
    padding: var(--space-3) var(--space-5);
    border-top: 1px solid var(--color-border-subtle);
    text-align: center;
  }

  .footer-hint {
    font-size: var(--text-xs);
    color: var(--color-text-subtle);
    margin: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
  }

  .footer-hint kbd {
    min-width: 20px;
    height: 20px;
    font-size: 10px;
  }
</style>
