<script lang="ts">
  import { X, ChevronDown, ChevronUp } from "lucide-svelte";
  import type { SpokeConfig, SyncMethod, RsyncOptions } from "$lib/types";
  import CronInput from "./cron-input.svelte";

  interface Props {
    open: boolean;
    mode: "create" | "edit";
    spoke?: SpokeConfig;
    onsubmit: (spoke: Partial<SpokeConfig> & { name: string }) => void;
    oncancel: () => void;
  }

  const {
    open = false,
    mode = "create",
    spoke,
    onsubmit,
    oncancel,
  }: Props = $props();

  // Form state
  let name = $state("");
  let syncMethod = $state<SyncMethod>("syncthing");
  let path = $state("");
  let source = $state("");
  let enabled = $state(true);
  let schedule = $state("0 * * * *");
  
  // Rsync options (nested)
  let rsyncBwLimit = $state(0);
  let rsyncDelete = $state(false);
  let rsyncExtraArgs = $state("");
  let rsyncTimeoutSeconds = $state(300);
  let showRsyncOptions = $state(false);

  // Validation state
  let errors: Record<string, string> = $state({});

  // Reset form when modal opens/closes or spoke changes
  $effect(() => {
    if (open) {
      if (mode === "edit" && spoke) {
        ({ name } = spoke);
        ({ syncMethod } = spoke);
        ({ path } = spoke);
        source = spoke.source ?? "";
        ({ enabled } = spoke);
        schedule = spoke.schedule ?? "0 * * * *";
        rsyncBwLimit = spoke.rsyncOptions?.bwLimit ?? 0;
        rsyncDelete = spoke.rsyncOptions?.delete ?? false;
        rsyncExtraArgs = spoke.rsyncOptions?.extraArgs?.join(" ") ?? "";
        rsyncTimeoutSeconds = spoke.rsyncOptions?.timeoutSeconds ?? 300;
        showRsyncOptions = syncMethod === "rsync" && Boolean(spoke.rsyncOptions);
      } else {
        // Reset to defaults for create mode
        name = "";
        syncMethod = "syncthing";
        path = "";
        source = "";
        enabled = true;
        schedule = "0 * * * *";
        rsyncBwLimit = 0;
        rsyncDelete = false;
        rsyncExtraArgs = "";
        rsyncTimeoutSeconds = 300;
        showRsyncOptions = false;
      }
      errors = {};
    }
  });

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    // Name validation (only for create)
    if (mode === "create") {
      if (!name.trim()) {
        newErrors.name = "Name is required";
      } else if (!/^[\w-]+$/.test(name)) {
        newErrors.name = "Name can only contain letters, numbers, dashes, and underscores";
      } else if (name.length > 64) {
        newErrors.name = "Name must be 64 characters or less";
      }
    }

    // Path validation
    if (!path.trim()) {
      newErrors.path = "Path is required";
    }

    // Source validation (required for rsync)
    if (syncMethod === "rsync" && !source.trim()) {
      newErrors.source = "Source is required for rsync method";
    }

    // Rsync options validation
    if (syncMethod === "rsync") {
      if (rsyncBwLimit < 0 || rsyncBwLimit > 1_000_000) {
        newErrors.rsyncBwLimit = "Bandwidth limit must be 0-1000000 KB/s";
      }
      if (rsyncTimeoutSeconds < 0 || rsyncTimeoutSeconds > 86_400) {
        newErrors.rsyncTimeoutSeconds = "Timeout must be 0-86400 seconds";
      }
    }

    errors = newErrors;
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(event: Event) {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    // Build rsync options if applicable
    let rsyncOptions: RsyncOptions | undefined;
    if (syncMethod === "rsync" && showRsyncOptions) {
      rsyncOptions = {
        bwLimit: rsyncBwLimit || undefined,
        delete: rsyncDelete || undefined,
        extraArgs: rsyncExtraArgs.trim() ? rsyncExtraArgs.trim().split(/\s+/) : undefined,
        timeoutSeconds: rsyncTimeoutSeconds || undefined,
      };
    }

    const spokeData: Partial<SpokeConfig> & { name: string } = {
      name: mode === "edit" && spoke ? spoke.name : name,
      syncMethod,
      path,
      enabled,
    };

    // Add optional fields
    if (syncMethod === "rsync") {
      spokeData.source = source || undefined;
      spokeData.schedule = schedule || undefined;
      if (rsyncOptions && Object.keys(rsyncOptions).length > 0) {
        spokeData.rsyncOptions = rsyncOptions;
      }
    }

    onsubmit(spokeData);
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      oncancel();
    }
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      oncancel();
    }
  }
</script>

{#if open}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <!-- svelte-ignore a11y_interactive_supports_focus -->
  <div
    class="modal-backdrop"
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
    onclick={handleBackdropClick}
    onkeydown={handleKeydown}
  >
    <div class="modal">
      <header class="modal-header">
        <h2 id="modal-title">
          {mode === "create" ? "Add Spoke" : `Edit Spoke: ${spoke?.name}`}
        </h2>
        <button
          type="button"
          class="close-btn"
          onclick={oncancel}
          aria-label="Close modal"
        >
          <X size={20} />
        </button>
      </header>

      <form onsubmit={handleSubmit}>
        <div class="modal-body">
          <!-- Name (only editable on create) -->
          {#if mode === "create"}
            <div class="form-group">
              <label for="spoke-name">Name</label>
              <input
                type="text"
                id="spoke-name"
                bind:value={name}
                placeholder="e.g., laptop, workstation"
                class:error={errors.name}
              />
              {#if errors.name}
                <span class="error-text">{errors.name}</span>
              {:else}
                <span class="hint">Unique identifier for this spoke (cannot be changed later)</span>
              {/if}
            </div>
          {/if}

          <!-- Sync Method -->
          <div class="form-group">
            <label for="sync-method">Sync Method</label>
            <select id="sync-method" bind:value={syncMethod}>
              <option value="syncthing">Syncthing</option>
              <option value="rsync">Rsync</option>
              <option value="api">API</option>
            </select>
            <span class="hint">
              {#if syncMethod === "syncthing"}
                Uses Syncthing for automatic real-time sync
              {:else if syncMethod === "rsync"}
                Uses rsync for scheduled sync from a remote source
              {:else}
                Uses the pi-brain API for programmatic access
              {/if}
            </span>
          </div>

          <!-- Path -->
          <div class="form-group">
            <label for="spoke-path">Local Path</label>
            <input
              type="text"
              id="spoke-path"
              bind:value={path}
              placeholder="~/.pi-brain/spokes/laptop"
              class:error={errors.path}
            />
            {#if errors.path}
              <span class="error-text">{errors.path}</span>
            {:else}
              <span class="hint">Directory where session files will be stored locally</span>
            {/if}
          </div>

          <!-- Source (rsync only) -->
          {#if syncMethod === "rsync"}
            <div class="form-group">
              <label for="spoke-source">Remote Source</label>
              <input
                type="text"
                id="spoke-source"
                bind:value={source}
                placeholder="user@host:~/.pi/agent/sessions"
                class:error={errors.source}
              />
              {#if errors.source}
                <span class="error-text">{errors.source}</span>
              {:else}
                <span class="hint">Remote rsync source path</span>
              {/if}
            </div>

            <!-- Schedule (rsync only) -->
            <div class="form-group">
              <CronInput
                bind:value={schedule}
                label="Sync Schedule"
                hint="When to run rsync sync"
              />
            </div>
          {/if}

          <!-- Enabled toggle -->
          <div class="form-group checkbox-group">
            <label class="checkbox-label">
              <input
                type="checkbox"
                bind:checked={enabled}
              />
              <span>Enabled</span>
            </label>
            <span class="hint">Whether this spoke is actively watched</span>
          </div>

          <!-- Rsync Options (collapsible) -->
          {#if syncMethod === "rsync"}
            <div class="rsync-options-section">
              <button
                type="button"
                class="rsync-toggle"
                onclick={() => showRsyncOptions = !showRsyncOptions}
              >
                {#if showRsyncOptions}
                  <ChevronUp size={16} />
                {:else}
                  <ChevronDown size={16} />
                {/if}
                <span>Rsync Options</span>
              </button>

              {#if showRsyncOptions}
                <div class="rsync-options">
                  <div class="form-grid">
                    <div class="form-group">
                      <label for="rsync-bw-limit">Bandwidth Limit (KB/s)</label>
                      <input
                        type="number"
                        id="rsync-bw-limit"
                        bind:value={rsyncBwLimit}
                        min="0"
                        max="1000000"
                        class:error={errors.rsyncBwLimit}
                      />
                      {#if errors.rsyncBwLimit}
                        <span class="error-text">{errors.rsyncBwLimit}</span>
                      {:else}
                        <span class="hint">0 = unlimited</span>
                      {/if}
                    </div>

                    <div class="form-group">
                      <label for="rsync-timeout">Timeout (seconds)</label>
                      <input
                        type="number"
                        id="rsync-timeout"
                        bind:value={rsyncTimeoutSeconds}
                        min="0"
                        max="86400"
                        class:error={errors.rsyncTimeoutSeconds}
                      />
                      {#if errors.rsyncTimeoutSeconds}
                        <span class="error-text">{errors.rsyncTimeoutSeconds}</span>
                      {:else}
                        <span class="hint">0 = no timeout</span>
                      {/if}
                    </div>
                  </div>

                  <div class="form-group checkbox-group">
                    <label class="checkbox-label">
                      <input
                        type="checkbox"
                        bind:checked={rsyncDelete}
                      />
                      <span>Delete files not in source</span>
                    </label>
                    <span class="hint">Equivalent to rsync --delete</span>
                  </div>

                  <div class="form-group">
                    <label for="rsync-extra-args">Extra Arguments</label>
                    <input
                      type="text"
                      id="rsync-extra-args"
                      bind:value={rsyncExtraArgs}
                      placeholder="e.g., --compress --progress"
                    />
                    <span class="hint">Additional rsync command-line arguments</span>
                  </div>
                </div>
              {/if}
            </div>
          {/if}
        </div>

        <footer class="modal-footer">
          <button
            type="button"
            class="btn-secondary"
            onclick={oncancel}
          >
            Cancel
          </button>
          <button type="submit" class="btn-primary">
            {mode === "create" ? "Add Spoke" : "Save Changes"}
          </button>
        </footer>
      </form>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 10vh;
    overflow-y: auto;
    z-index: var(--z-modal, 100);
    animation: fadeIn 0.15s ease-out;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .modal {
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    width: 100%;
    max-width: 500px;
    margin: var(--space-4);
    margin-bottom: 10vh;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    animation: slideUp 0.2s ease-out;
  }

  @keyframes slideUp {
    from {
      transform: translateY(10px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4);
    border-bottom: 1px solid var(--color-border);
  }

  .modal-header h2 {
    font-size: var(--text-lg);
    font-weight: 600;
    margin: 0;
  }

  .close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-1);
    background: transparent;
    border: none;
    color: var(--color-text-muted);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: color 0.15s ease, background 0.15s ease;
  }

  .close-btn:hover {
    color: var(--color-text);
    background: var(--color-bg-hover);
  }

  .modal-body {
    padding: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-3);
    padding: var(--space-4);
    border-top: 1px solid var(--color-border);
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .form-group label {
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--color-text);
  }

  .form-group input[type="text"],
  .form-group input[type="number"],
  .form-group select {
    padding: var(--space-2) var(--space-3);
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    color: var(--color-text);
    transition: border-color 0.15s ease;
  }

  .form-group input:focus,
  .form-group select:focus {
    outline: none;
    border-color: var(--color-accent);
  }

  .form-group input.error,
  .form-group select.error {
    border-color: var(--color-error);
  }

  .form-group .hint {
    font-size: var(--text-xs);
    color: var(--color-text-subtle);
  }

  .form-group .error-text {
    font-size: var(--text-xs);
    color: var(--color-error);
  }

  .form-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-4);
  }

  .checkbox-group {
    flex-direction: row;
    align-items: center;
    gap: var(--space-3);
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    cursor: pointer;
  }

  .checkbox-label input[type="checkbox"] {
    width: 16px;
    height: 16px;
    accent-color: var(--color-accent);
  }

  .rsync-options-section {
    border-top: 1px solid var(--color-border);
    padding-top: var(--space-4);
  }

  .rsync-toggle {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2);
    background: transparent;
    border: none;
    color: var(--color-text-muted);
    font-size: var(--text-sm);
    cursor: pointer;
    transition: color 0.15s ease;
  }

  .rsync-toggle:hover {
    color: var(--color-text);
  }

  .rsync-options {
    margin-top: var(--space-3);
    padding: var(--space-4);
    background: var(--color-bg);
    border-radius: var(--radius-md);
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .btn-secondary,
  .btn-primary {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease;
  }

  .btn-secondary {
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    color: var(--color-text);
  }

  .btn-secondary:hover {
    background: var(--color-bg-hover);
    border-color: var(--color-text-muted);
  }

  .btn-primary {
    background: var(--color-accent);
    border: 1px solid var(--color-accent);
    color: white;
  }

  .btn-primary:hover {
    background: var(--color-accent-hover);
  }
</style>
