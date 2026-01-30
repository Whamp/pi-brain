<script lang="ts">
  import { X, ChevronDown, ChevronUp } from "lucide-svelte";
  import type { SpokeConfig, SyncMethod, RsyncOptions } from "$lib/types";
  import { focusTrap } from "$lib/utils/focus-trap";
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

  // Helper: Load form fields from existing spoke config
  function loadFromSpoke(spokeConfig: SpokeConfig): void {
    ({ name } = spokeConfig);
    ({ syncMethod } = spokeConfig);
    ({ path } = spokeConfig);
    source = spokeConfig.source ?? "";
    ({ enabled } = spokeConfig);
    schedule = spokeConfig.schedule ?? "0 * * * *";
    loadRsyncOptions(spokeConfig);
  }

  // Helper: Load rsync options from spoke config
  function loadRsyncOptions(spokeConfig: SpokeConfig): void {
    rsyncBwLimit = spokeConfig.rsyncOptions?.bwLimit ?? 0;
    rsyncDelete = spokeConfig.rsyncOptions?.delete ?? false;
    rsyncExtraArgs = spokeConfig.rsyncOptions?.extraArgs?.join(" ") ?? "";
    rsyncTimeoutSeconds = spokeConfig.rsyncOptions?.timeoutSeconds ?? 300;
    showRsyncOptions = syncMethod === "rsync" && Boolean(spokeConfig.rsyncOptions);
  }

  // Helper: Reset form to defaults for create mode
  function resetToDefaults(): void {
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

  // Reset form when modal opens/closes or spoke changes
  $effect(() => {
    if (open) {
      if (mode === "edit" && spoke) {
        loadFromSpoke(spoke);
      } else {
        resetToDefaults();
      }
      errors = {};
    }
  });

  // Helper: Validate name field (create mode only)
  function validateName(errs: Record<string, string>): void {
    if (mode !== "create") {
      return;
    }
    if (!name.trim()) {
      errs.name = "Name is required";
    } else if (!/^[\w-]+$/.test(name)) {
      errs.name = "Name can only contain letters, numbers, dashes, and underscores";
    } else if (name.length > 64) {
      errs.name = "Name must be 64 characters or less";
    }
  }

  // Helper: Validate rsync-specific fields
  function validateRsyncFields(errs: Record<string, string>): void {
    if (syncMethod !== "rsync") {
      return;
    }
    if (!source.trim()) {
      errs.source = "Source is required for rsync method";
    }
    if (rsyncBwLimit < 0 || rsyncBwLimit > 1_000_000) {
      errs.rsyncBwLimit = "Bandwidth limit must be 0-1000000 KB/s";
    }
    if (rsyncTimeoutSeconds < 0 || rsyncTimeoutSeconds > 86_400) {
      errs.rsyncTimeoutSeconds = "Timeout must be 0-86400 seconds";
    }
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    validateName(newErrors);
    if (!path.trim()) {
      newErrors.path = "Path is required";
    }
    validateRsyncFields(newErrors);
    errors = newErrors;
    return Object.keys(newErrors).length === 0;
  }

  // Helper: Build rsync options object if applicable
  function buildRsyncOptions(): RsyncOptions | undefined {
    if (syncMethod !== "rsync" || !showRsyncOptions) {
      return undefined;
    }
    return {
      bwLimit: rsyncBwLimit || undefined,
      delete: rsyncDelete || undefined,
      extraArgs: rsyncExtraArgs.trim() ? rsyncExtraArgs.trim().split(/\s+/) : undefined,
      timeoutSeconds: rsyncTimeoutSeconds || undefined,
    };
  }

  // Helper: Build spoke data object for submission
  function buildSpokeData(): Partial<SpokeConfig> & { name: string } {
    const spokeData: Partial<SpokeConfig> & { name: string } = {
      name: mode === "edit" && spoke ? spoke.name : name,
      syncMethod,
      path,
      enabled,
    };
    if (syncMethod === "rsync") {
      spokeData.source = source || undefined;
      spokeData.schedule = schedule || undefined;
      const rsyncOptions = buildRsyncOptions();
      if (rsyncOptions && Object.keys(rsyncOptions).length > 0) {
        spokeData.rsyncOptions = rsyncOptions;
      }
    }
    return spokeData;
  }

  function handleSubmit(event: Event) {
    event.preventDefault();
    if (!validate()) {
      return;
    }
    onsubmit(buildSpokeData());
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
    tabindex="-1"
    onclick={handleBackdropClick}
  >
    <div class="modal" use:focusTrap={{ onEscape: oncancel }}>
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
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
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
    background: rgba(20, 20, 23, 0.85);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--radius-lg);
    width: 100%;
    max-width: 500px;
    margin: var(--space-4);
    margin-bottom: 10vh;
    box-shadow: var(--shadow-xl), var(--shadow-highlight);
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
