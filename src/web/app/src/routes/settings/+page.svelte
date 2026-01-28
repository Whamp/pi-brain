<script lang="ts">
  import { onMount } from "svelte";
  import { Settings, Save, RotateCcw, AlertCircle, CheckCircle } from "lucide-svelte";
  import { api, getErrorMessage, isBackendOffline } from "$lib/api/client";

  interface Provider {
    id: string;
    name: string;
    models: string[];
  }

  // State
  let loading = $state(true);
  let saving = $state(false);
  let errorMessage: string | null = $state(null);
  let successMessage: string | null = $state(null);

  // Config values
  let provider = $state("");
  let model = $state("");
  let idleTimeoutMinutes = $state(10);
  let parallelWorkers = $state(1);

  // Original values (for reset) - must be $state for $derived reactivity
  let originalProvider = $state("");
  let originalModel = $state("");
  let originalIdleTimeoutMinutes = $state(10);
  let originalParallelWorkers = $state(1);

  // Available providers
  let providers: Provider[] = $state([]);

  // Get models for selected provider
  const availableModels = $derived(
    providers.find(p => p.id === provider)?.models ?? []
  );

  // Track if there are unsaved changes
  const hasChanges = $derived(
    provider !== originalProvider ||
    model !== originalModel ||
    idleTimeoutMinutes !== originalIdleTimeoutMinutes ||
    parallelWorkers !== originalParallelWorkers
  );

  onMount(async () => {
    await Promise.all([loadConfig(), loadProviders()]);
    loading = false;
  });

  async function loadConfig() {
    try {
      const config = await api.getDaemonConfig();
      ({ provider } = config);
      ({ model } = config);
      ({ idleTimeoutMinutes } = config);
      ({ parallelWorkers } = config);

      // Store originals
      originalProvider = config.provider;
      originalModel = config.model;
      originalIdleTimeoutMinutes = config.idleTimeoutMinutes;
      originalParallelWorkers = config.parallelWorkers;
    } catch (error) {
      console.error("Failed to load config:", error);
      errorMessage = isBackendOffline(error)
        ? "Backend is offline. Start the daemon with 'pi-brain daemon start'."
        : getErrorMessage(error);
    }
  }

  async function loadProviders() {
    try {
      const data = await api.getProviders();
      ({ providers } = data);
    } catch (error) {
      console.error("Failed to load providers:", error);
      // Use fallback
      providers = [
        { id: "zai", name: "Zhipu AI", models: ["glm-4.7", "glm-4.6"] },
        { id: "anthropic", name: "Anthropic", models: ["claude-sonnet-4-20250514"] },
        { id: "openai", name: "OpenAI", models: ["gpt-4o"] },
      ];
    }
  }

  async function saveConfig() {
    saving = true;
    errorMessage = null;
    successMessage = null;

    try {
      const result = await api.updateDaemonConfig({
        provider,
        model,
        idleTimeoutMinutes,
        parallelWorkers,
      });

      // Update originals
      originalProvider = result.provider;
      originalModel = result.model;
      originalIdleTimeoutMinutes = result.idleTimeoutMinutes;
      originalParallelWorkers = result.parallelWorkers;

      successMessage = result.message;

      // Clear success message after 5 seconds
      setTimeout(() => {
        successMessage = null;
      }, 5000);
    } catch (error) {
      console.error("Failed to save config:", error);
      errorMessage = isBackendOffline(error)
        ? "Backend is offline. Start the daemon with 'pi-brain daemon start'."
        : getErrorMessage(error);
    } finally {
      saving = false;
    }
  }

  function resetConfig() {
    provider = originalProvider;
    model = originalModel;
    idleTimeoutMinutes = originalIdleTimeoutMinutes;
    parallelWorkers = originalParallelWorkers;
    errorMessage = null;
    successMessage = null;
  }

  function handleProviderChange() {
    // Reset model when provider changes
    const providerModels = providers.find(p => p.id === provider)?.models ?? [];
    if (providerModels.length > 0 && !providerModels.includes(model)) {
      [model] = providerModels;
    }
  }
</script>

<svelte:head>
  <title>Settings - pi-brain</title>
  <meta name="description" content="Configure pi-brain settings" />
</svelte:head>

<div class="settings-page">
  <header class="page-header">
    <h1>
      <Settings size={28} />
      Settings
    </h1>
    <p class="page-description">Configure the pi-brain daemon and analysis settings</p>
  </header>

  {#if loading}
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading configuration...</p>
    </div>
  {:else}
    {#if successMessage}
      <div class="message success">
        <CheckCircle size={18} />
        {successMessage}
      </div>
    {/if}

    {#if errorMessage}
      <div class="message error">
        <AlertCircle size={18} />
        {errorMessage}
      </div>
    {/if}

    <section class="settings-section">
      <h2>Daemon Agent Model</h2>
      <p class="section-description">
        Configure which AI model the daemon uses for session analysis
      </p>

      <div class="form-grid">
        <div class="form-group">
          <label for="provider">Provider</label>
          <select
            id="provider"
            bind:value={provider}
            onchange={handleProviderChange}
          >
            {#each providers as p}
              <option value={p.id}>{p.name}</option>
            {/each}
          </select>
        </div>

        <div class="form-group">
          <label for="model">Model</label>
          <select id="model" bind:value={model}>
            {#each availableModels as m}
              <option value={m}>{m}</option>
            {/each}
          </select>
          <span class="hint">The model used for analyzing sessions</span>
        </div>
      </div>
    </section>

    <section class="settings-section">
      <h2>Daemon Behavior</h2>
      <p class="section-description">
        Configure how the daemon processes sessions
      </p>

      <div class="form-grid">
        <div class="form-group">
          <label for="idleTimeout">Idle Timeout (minutes)</label>
          <input
            type="number"
            id="idleTimeout"
            bind:value={idleTimeoutMinutes}
            min="1"
            max="1440"
          />
          <span class="hint">
            Wait time after session activity before analyzing
          </span>
        </div>

        <div class="form-group">
          <label for="parallelWorkers">Parallel Workers</label>
          <input
            type="number"
            id="parallelWorkers"
            bind:value={parallelWorkers}
            min="1"
            max="10"
          />
          <span class="hint">Number of concurrent analysis workers</span>
        </div>
      </div>
    </section>

    <div class="actions">
      <button
        class="btn-secondary"
        onclick={resetConfig}
        disabled={!hasChanges || saving}
      >
        <RotateCcw size={16} />
        Reset
      </button>
      <button
        class="btn-primary"
        onclick={saveConfig}
        disabled={!hasChanges || saving}
      >
        <Save size={16} />
        {saving ? "Saving..." : "Save Changes"}
      </button>
    </div>
  {/if}
</div>

<style>
  .settings-page {
    max-width: 800px;
  }

  .page-header {
    margin-bottom: var(--space-6);
  }

  .page-header h1 {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    font-size: var(--text-2xl);
    margin-bottom: var(--space-2);
  }

  .page-description {
    color: var(--color-text-muted);
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-12);
    color: var(--color-text-muted);
  }

  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--color-border);
    border-top-color: var(--color-accent);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .message {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-md);
    margin-bottom: var(--space-4);
    font-size: var(--text-sm);
  }

  .message.success {
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid var(--color-success);
    color: var(--color-success);
  }

  .message.error {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid var(--color-error);
    color: var(--color-error);
  }

  .settings-section {
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-6);
    margin-bottom: var(--space-4);
  }

  .settings-section h2 {
    font-size: var(--text-lg);
    font-weight: 600;
    margin-bottom: var(--space-2);
  }

  .section-description {
    color: var(--color-text-muted);
    font-size: var(--text-sm);
    margin-bottom: var(--space-4);
  }

  .form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: var(--space-4);
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .form-group label {
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--color-text);
  }

  .form-group select,
  .form-group input[type="number"] {
    padding: var(--space-2) var(--space-3);
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    color: var(--color-text);
    transition: border-color 0.15s ease;
  }

  .form-group select:focus,
  .form-group input[type="number"]:focus {
    outline: none;
    border-color: var(--color-accent);
  }

  .form-group .hint {
    font-size: var(--text-xs);
    color: var(--color-text-subtle);
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-3);
    margin-top: var(--space-6);
  }

  .btn-primary,
  .btn-secondary {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease, opacity 0.15s ease;
  }

  .btn-primary {
    background: var(--color-accent);
    border: 1px solid var(--color-accent);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--color-accent-hover);
    border-color: var(--color-accent-hover);
  }

  .btn-secondary {
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    color: var(--color-text);
  }

  .btn-secondary:hover:not(:disabled) {
    background: var(--color-bg-hover);
    border-color: var(--color-accent);
  }

  .btn-primary:disabled,
  .btn-secondary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
