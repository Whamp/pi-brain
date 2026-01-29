<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import {
    Settings,
    Save,
    RotateCcw,
    Cpu,
    Database,
    Clock,
    Globe,
    Server,
    Search,
    Layers,
  } from "lucide-svelte";
  import { api, getErrorMessage, isBackendOffline } from "$lib/api/client";
  import { toastStore } from "$lib/stores/toast";
  import type { SpokeConfig, SpokeCreateRequest, SpokeUpdateRequest } from "$lib/types";
  import TagInput from "$lib/components/tag-input.svelte";
  import PasswordInput from "$lib/components/password-input.svelte";
  import CronInput from "$lib/components/cron-input.svelte";
  import SettingsTabs from "$lib/components/settings-tabs.svelte";
  import SpokeList from "$lib/components/spoke-list.svelte";
  import SpokeModal from "$lib/components/spoke-modal.svelte";
  import ConfirmDialog from "$lib/components/confirm-dialog.svelte";

  interface Provider {
    id: string;
    name: string;
    models: string[];
  }

  // Tab definitions
  const tabs = [
    { id: "daemon", label: "Daemon", icon: Cpu },
    { id: "embeddings", label: "Embeddings", icon: Layers },
    { id: "schedules", label: "Schedules", icon: Clock },
    { id: "query", label: "Query", icon: Search },
    { id: "api", label: "API Server", icon: Globe },
    { id: "hub", label: "Hub", icon: Database },
    { id: "spokes", label: "Spokes", icon: Server },
  ];

  // Active tab - read from URL hash or default to "daemon"
  let activeTab = $state("daemon");

  // Initialize tab from URL hash
  $effect(() => {
    const hash = $page.url.hash.slice(1);
    if (hash && tabs.some((t) => t.id === hash)) {
      activeTab = hash;
    }
  });

  function handleTabChange(tabId: string) {
    activeTab = tabId;
    goto(`#${tabId}`, { replaceState: true, noScroll: true });
  }

  // State
  let loading = $state(true);
  let saving = $state(false);

  // Config values
  let provider = $state("");
  let model = $state("");
  let idleTimeoutMinutes = $state(10);
  let parallelWorkers = $state(1);
  let maxRetries = $state(3);
  let retryDelaySeconds = $state(60);
  let analysisTimeoutMinutes = $state(10);
  let maxConcurrentAnalysis = $state(1);
  let maxQueueSize = $state(100);
  let backfillLimit = $state(50);
  let reanalysisLimit = $state(20);
  let connectionDiscoveryLimit = $state(20);
  let connectionDiscoveryLookbackDays = $state(7);
  let connectionDiscoveryCooldownHours = $state(24);
  let semanticSearchThreshold = $state(0.6);

  // Query config values
  let queryProvider = $state("");
  let queryModel = $state("");

  // API config values
  let apiPort = $state(8765);
  let apiHost = $state("localhost");
  let apiCorsOrigins: string[] = $state([]);

  // Hub config values
  let hubSessionsDir = $state("");
  let hubDatabaseDir = $state("");
  let hubWebUiPort = $state(8765);

  // Embedding config values
  let embeddingProvider = $state("ollama");
  let embeddingModel = $state("nomic-embed-text");
  let embeddingApiKey = $state("");
  let embeddingBaseUrl = $state("");
  let embeddingDimensions = $state<number | null>(null);
  let hasApiKey = $state(false);

  // Schedule config values
  let reanalysisSchedule = $state("0 2 * * *");
  let connectionDiscoverySchedule = $state("0 3 * * *");
  let patternAggregationSchedule = $state("0 3 * * *");
  let clusteringSchedule = $state("0 4 * * *");
  let backfillEmbeddingsSchedule = $state("0 5 * * *");

  // Spokes config
  let spokes: SpokeConfig[] = $state([]);
  let spokesLoading = $state(false);
  let spokeModalOpen = $state(false);
  let spokeModalMode = $state<"create" | "edit">("create");
  let editingSpoke = $state<SpokeConfig | undefined>();
  let confirmDeleteOpen = $state(false);
  let spokeToDelete = $state<SpokeConfig | undefined>();

  // Original values (for reset)
  let originalProvider = $state("");
  let originalModel = $state("");
  let originalIdleTimeoutMinutes = $state(10);
  let originalParallelWorkers = $state(1);
  let originalMaxRetries = $state(3);
  let originalRetryDelaySeconds = $state(60);
  let originalAnalysisTimeoutMinutes = $state(10);
  let originalMaxConcurrentAnalysis = $state(1);
  let originalMaxQueueSize = $state(100);
  let originalBackfillLimit = $state(50);
  let originalReanalysisLimit = $state(20);
  let originalConnectionDiscoveryLimit = $state(20);
  let originalConnectionDiscoveryLookbackDays = $state(7);
  let originalConnectionDiscoveryCooldownHours = $state(24);
  let originalSemanticSearchThreshold = $state(0.6);

  // Query config original values
  let originalQueryProvider = $state("");
  let originalQueryModel = $state("");

  // API config original values
  let originalApiPort = $state(8765);
  let originalApiHost = $state("localhost");
  let originalApiCorsOrigins: string[] = $state([]);

  // Hub config original values
  let originalHubSessionsDir = $state("");
  let originalHubDatabaseDir = $state("");
  let originalHubWebUiPort = $state(8765);

  // Embedding config original values
  let originalEmbeddingProvider = $state("ollama");
  let originalEmbeddingModel = $state("nomic-embed-text");
  let originalEmbeddingBaseUrl = $state("");
  let originalEmbeddingDimensions = $state<number | null>(null);
  let originalHasApiKey = $state(false);

  // Schedule config original values
  let originalReanalysisSchedule = $state("0 2 * * *");
  let originalConnectionDiscoverySchedule = $state("0 3 * * *");
  let originalPatternAggregationSchedule = $state("0 3 * * *");
  let originalClusteringSchedule = $state("0 4 * * *");
  let originalBackfillEmbeddingsSchedule = $state("0 5 * * *");

  // Available providers
  let providers: Provider[] = $state([]);

  // Get models for selected provider
  const availableModels = $derived(
    providers.find((p) => p.id === provider)?.models ?? []
  );

  // Track if there are unsaved changes (excluding spokes - they save immediately)
  const hasChanges = $derived(
    provider !== originalProvider ||
    model !== originalModel ||
    idleTimeoutMinutes !== originalIdleTimeoutMinutes ||
    parallelWorkers !== originalParallelWorkers ||
    maxRetries !== originalMaxRetries ||
    retryDelaySeconds !== originalRetryDelaySeconds ||
    analysisTimeoutMinutes !== originalAnalysisTimeoutMinutes ||
    maxConcurrentAnalysis !== originalMaxConcurrentAnalysis ||
    maxQueueSize !== originalMaxQueueSize ||
    backfillLimit !== originalBackfillLimit ||
    reanalysisLimit !== originalReanalysisLimit ||
    connectionDiscoveryLimit !== originalConnectionDiscoveryLimit ||
    connectionDiscoveryLookbackDays !== originalConnectionDiscoveryLookbackDays ||
    connectionDiscoveryCooldownHours !== originalConnectionDiscoveryCooldownHours ||
    semanticSearchThreshold !== originalSemanticSearchThreshold ||
    queryProvider !== originalQueryProvider ||
    queryModel !== originalQueryModel ||
    apiPort !== originalApiPort ||
    apiHost !== originalApiHost ||
    JSON.stringify(apiCorsOrigins) !== JSON.stringify(originalApiCorsOrigins) ||
    hubSessionsDir !== originalHubSessionsDir ||
    hubDatabaseDir !== originalHubDatabaseDir ||
    hubWebUiPort !== originalHubWebUiPort ||
    embeddingProvider !== originalEmbeddingProvider ||
    embeddingModel !== originalEmbeddingModel ||
    embeddingApiKey !== "" ||
    embeddingBaseUrl !== originalEmbeddingBaseUrl ||
    embeddingDimensions !== originalEmbeddingDimensions ||
    reanalysisSchedule !== originalReanalysisSchedule ||
    connectionDiscoverySchedule !== originalConnectionDiscoverySchedule ||
    patternAggregationSchedule !== originalPatternAggregationSchedule ||
    clusteringSchedule !== originalClusteringSchedule ||
    backfillEmbeddingsSchedule !== originalBackfillEmbeddingsSchedule
  );

  // Warn before leaving with unsaved changes
  function handleBeforeUnload(event: BeforeUnloadEvent) {
    if (hasChanges) {
      event.preventDefault();
    }
  }

  onMount(async () => {
    await Promise.all([
      loadConfig(),
      loadProviders(),
      loadQueryConfig(),
      loadApiConfig(),
      loadHubConfig(),
      loadSpokes(),
    ]);
    loading = false;
  });

  async function loadConfig() {
    try {
      const config = await api.getDaemonConfig();
      ({ provider } = config);
      ({ model } = config);
      ({ idleTimeoutMinutes } = config);
      ({ parallelWorkers } = config);
      maxRetries = config.maxRetries ?? 3;
      retryDelaySeconds = config.retryDelaySeconds ?? 60;
      analysisTimeoutMinutes = config.analysisTimeoutMinutes ?? 10;
      maxConcurrentAnalysis = config.maxConcurrentAnalysis ?? 1;
      maxQueueSize = config.maxQueueSize ?? 100;
      backfillLimit = config.backfillLimit ?? 50;
      reanalysisLimit = config.reanalysisLimit ?? 20;
      connectionDiscoveryLimit = config.connectionDiscoveryLimit ?? 20;
      connectionDiscoveryLookbackDays = config.connectionDiscoveryLookbackDays ?? 7;
      connectionDiscoveryCooldownHours = config.connectionDiscoveryCooldownHours ?? 24;
      semanticSearchThreshold = config.semanticSearchThreshold ?? 0.6;

      // Embedding config
      embeddingProvider = config.embeddingProvider ?? "ollama";
      embeddingModel = config.embeddingModel ?? "nomic-embed-text";
      hasApiKey = config.hasApiKey ?? false;
      embeddingBaseUrl = config.embeddingBaseUrl ?? "";
      embeddingDimensions = config.embeddingDimensions ?? null;
      embeddingApiKey = ""; // Always clear - write-only field

      // Schedule config
      reanalysisSchedule = config.reanalysisSchedule ?? config.defaults.reanalysisSchedule;
      connectionDiscoverySchedule = config.connectionDiscoverySchedule ?? config.defaults.connectionDiscoverySchedule;
      patternAggregationSchedule = config.patternAggregationSchedule ?? config.defaults.patternAggregationSchedule;
      clusteringSchedule = config.clusteringSchedule ?? config.defaults.clusteringSchedule;
      backfillEmbeddingsSchedule = config.backfillEmbeddingsSchedule ?? config.defaults.backfillEmbeddingsSchedule;

      // Store originals
      originalProvider = provider;
      originalModel = model;
      originalIdleTimeoutMinutes = idleTimeoutMinutes;
      originalParallelWorkers = parallelWorkers;
      originalMaxRetries = maxRetries;
      originalRetryDelaySeconds = retryDelaySeconds;
      originalAnalysisTimeoutMinutes = analysisTimeoutMinutes;
      originalMaxConcurrentAnalysis = maxConcurrentAnalysis;
      originalMaxQueueSize = maxQueueSize;
      originalBackfillLimit = backfillLimit;
      originalReanalysisLimit = reanalysisLimit;
      originalConnectionDiscoveryLimit = connectionDiscoveryLimit;
      originalConnectionDiscoveryLookbackDays = connectionDiscoveryLookbackDays;
      originalConnectionDiscoveryCooldownHours = connectionDiscoveryCooldownHours;
      originalSemanticSearchThreshold = semanticSearchThreshold;
      originalEmbeddingProvider = embeddingProvider;
      originalEmbeddingModel = embeddingModel;
      originalHasApiKey = hasApiKey;
      originalEmbeddingBaseUrl = embeddingBaseUrl;
      originalEmbeddingDimensions = embeddingDimensions;
      originalReanalysisSchedule = reanalysisSchedule;
      originalConnectionDiscoverySchedule = connectionDiscoverySchedule;
      originalPatternAggregationSchedule = patternAggregationSchedule;
      originalClusteringSchedule = clusteringSchedule;
      originalBackfillEmbeddingsSchedule = backfillEmbeddingsSchedule;
    } catch (error) {
      console.error("Failed to load config:", error);
      toastStore.error(
        isBackendOffline(error)
          ? "Backend is offline. Start the daemon with 'pi-brain daemon start'."
          : getErrorMessage(error)
      );
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

  async function loadQueryConfig() {
    try {
      const config = await api.getQueryConfig();
      ({ provider: queryProvider } = config);
      ({ model: queryModel } = config);

      // Store originals
      originalQueryProvider = queryProvider;
      originalQueryModel = queryModel;
    } catch (error) {
      console.error("Failed to load query config:", error);
      toastStore.error(
        isBackendOffline(error)
          ? "Backend is offline. Start the daemon with 'pi-brain daemon start'."
          : getErrorMessage(error)
      );
    }
  }

  async function loadApiConfig() {
    try {
      const config = await api.getApiConfig();
      apiPort = config.port;
      apiHost = config.host;
      apiCorsOrigins = [...config.corsOrigins];

      // Store originals
      originalApiPort = apiPort;
      originalApiHost = apiHost;
      originalApiCorsOrigins = [...apiCorsOrigins];
    } catch (error) {
      console.error("Failed to load API config:", error);
      toastStore.error(
        isBackendOffline(error)
          ? "Backend is offline. Start the daemon with 'pi-brain daemon start'."
          : getErrorMessage(error)
      );
    }
  }

  async function loadHubConfig() {
    try {
      const config = await api.getHubConfig();
      hubSessionsDir = config.sessionsDir;
      hubDatabaseDir = config.databaseDir;
      hubWebUiPort = config.webUiPort;

      // Store originals
      originalHubSessionsDir = hubSessionsDir;
      originalHubDatabaseDir = hubDatabaseDir;
      originalHubWebUiPort = hubWebUiPort;
    } catch (error) {
      console.error("Failed to load hub config:", error);
      toastStore.error(
        isBackendOffline(error)
          ? "Backend is offline. Start the daemon with 'pi-brain daemon start'."
          : getErrorMessage(error)
      );
    }
  }

  async function loadSpokes() {
    spokesLoading = true;
    try {
      const data = await api.getSpokes();
      ({ spokes } = data);
    } catch (error) {
      console.error("Failed to load spokes:", error);
      toastStore.error(
        isBackendOffline(error)
          ? "Backend is offline."
          : getErrorMessage(error)
      );
    } finally {
      spokesLoading = false;
    }
  }

  async function saveConfig() {
    saving = true;

    try {
      // Build daemon config update, only include embeddingApiKey if user entered a new one
      const daemonUpdate: Parameters<typeof api.updateDaemonConfig>[0] = {
        provider,
        model,
        idleTimeoutMinutes,
        parallelWorkers,
        maxRetries,
        retryDelaySeconds,
        analysisTimeoutMinutes,
        maxConcurrentAnalysis,
        maxQueueSize,
        backfillLimit,
        reanalysisLimit,
        connectionDiscoveryLimit,
        connectionDiscoveryLookbackDays,
        connectionDiscoveryCooldownHours,
        semanticSearchThreshold,
        embeddingProvider,
        embeddingModel,
        embeddingBaseUrl: embeddingBaseUrl || null,
        embeddingDimensions,
        reanalysisSchedule,
        connectionDiscoverySchedule,
        patternAggregationSchedule,
        clusteringSchedule,
        backfillEmbeddingsSchedule,
      };

      // Only send API key if user entered a new one
      if (embeddingApiKey) {
        daemonUpdate.embeddingApiKey = embeddingApiKey;
      }

      // Save daemon config
      const daemonResult = await api.updateDaemonConfig(daemonUpdate);

      // Save query config
      const queryResult = await api.updateQueryConfig({
        provider: queryProvider,
        model: queryModel,
      });

      // Save API config
      const apiResult = await api.updateApiConfig({
        port: apiPort,
        host: apiHost,
        corsOrigins: apiCorsOrigins,
      });

      // Save Hub config
      const hubResult = await api.updateHubConfig({
        sessionsDir: hubSessionsDir,
        databaseDir: hubDatabaseDir,
        webUiPort: hubWebUiPort,
      });

      // Update originals
      originalProvider = daemonResult.provider;
      originalModel = daemonResult.model;
      originalIdleTimeoutMinutes = daemonResult.idleTimeoutMinutes;
      originalParallelWorkers = daemonResult.parallelWorkers;
      originalMaxRetries = daemonResult.maxRetries;
      originalRetryDelaySeconds = daemonResult.retryDelaySeconds;
      originalAnalysisTimeoutMinutes = daemonResult.analysisTimeoutMinutes;
      originalMaxConcurrentAnalysis = daemonResult.maxConcurrentAnalysis;
      originalMaxQueueSize = daemonResult.maxQueueSize;
      originalBackfillLimit = daemonResult.backfillLimit;
      originalReanalysisLimit = daemonResult.reanalysisLimit;
      originalConnectionDiscoveryLimit = daemonResult.connectionDiscoveryLimit;
      originalConnectionDiscoveryLookbackDays = daemonResult.connectionDiscoveryLookbackDays;
      originalConnectionDiscoveryCooldownHours = daemonResult.connectionDiscoveryCooldownHours;
      originalSemanticSearchThreshold = daemonResult.semanticSearchThreshold;
      originalEmbeddingProvider = daemonResult.embeddingProvider;
      originalEmbeddingModel = daemonResult.embeddingModel;
      originalEmbeddingBaseUrl = daemonResult.embeddingBaseUrl ?? "";
      originalEmbeddingDimensions = daemonResult.embeddingDimensions;
      embeddingApiKey = ""; // Clear the input after save
      // Update hasApiKey from the response
      ({ hasApiKey } = daemonResult);
      originalHasApiKey = hasApiKey;
      originalReanalysisSchedule = daemonResult.reanalysisSchedule;
      originalConnectionDiscoverySchedule = daemonResult.connectionDiscoverySchedule;
      originalPatternAggregationSchedule = daemonResult.patternAggregationSchedule;
      originalClusteringSchedule = daemonResult.clusteringSchedule;
      originalBackfillEmbeddingsSchedule = daemonResult.backfillEmbeddingsSchedule;
      originalQueryProvider = queryResult.provider;
      originalQueryModel = queryResult.model;
      originalApiPort = apiResult.port;
      originalApiHost = apiResult.host;
      originalApiCorsOrigins = [...apiResult.corsOrigins];
      originalHubSessionsDir = hubResult.sessionsDir;
      originalHubDatabaseDir = hubResult.databaseDir;
      originalHubWebUiPort = hubResult.webUiPort;

      toastStore.success(daemonResult.message);
    } catch (error) {
      console.error("Failed to save config:", error);
      toastStore.error(
        isBackendOffline(error)
          ? "Backend is offline. Start the daemon with 'pi-brain daemon start'."
          : getErrorMessage(error)
      );
    } finally {
      saving = false;
    }
  }

  function resetConfig() {
    provider = originalProvider;
    model = originalModel;
    idleTimeoutMinutes = originalIdleTimeoutMinutes;
    parallelWorkers = originalParallelWorkers;
    maxRetries = originalMaxRetries;
    retryDelaySeconds = originalRetryDelaySeconds;
    analysisTimeoutMinutes = originalAnalysisTimeoutMinutes;
    maxConcurrentAnalysis = originalMaxConcurrentAnalysis;
    maxQueueSize = originalMaxQueueSize;
    backfillLimit = originalBackfillLimit;
    reanalysisLimit = originalReanalysisLimit;
    connectionDiscoveryLimit = originalConnectionDiscoveryLimit;
    connectionDiscoveryLookbackDays = originalConnectionDiscoveryLookbackDays;
    connectionDiscoveryCooldownHours = originalConnectionDiscoveryCooldownHours;
    semanticSearchThreshold = originalSemanticSearchThreshold;
    queryProvider = originalQueryProvider;
    queryModel = originalQueryModel;
    apiPort = originalApiPort;
    apiHost = originalApiHost;
    apiCorsOrigins = [...originalApiCorsOrigins];
    hubSessionsDir = originalHubSessionsDir;
    hubDatabaseDir = originalHubDatabaseDir;
    hubWebUiPort = originalHubWebUiPort;
    embeddingProvider = originalEmbeddingProvider;
    embeddingModel = originalEmbeddingModel;
    embeddingApiKey = "";
    embeddingBaseUrl = originalEmbeddingBaseUrl;
    embeddingDimensions = originalEmbeddingDimensions;
    hasApiKey = originalHasApiKey;
    reanalysisSchedule = originalReanalysisSchedule;
    connectionDiscoverySchedule = originalConnectionDiscoverySchedule;
    patternAggregationSchedule = originalPatternAggregationSchedule;
    clusteringSchedule = originalClusteringSchedule;
    backfillEmbeddingsSchedule = originalBackfillEmbeddingsSchedule;
    toastStore.info("Settings reset to last saved values");
  }

  function handleProviderChange() {
    // Reset model when provider changes
    const providerModels = providers.find((p) => p.id === provider)?.models ?? [];
    if (providerModels.length > 0 && !providerModels.includes(model)) {
      [model] = providerModels;
    }
  }

  // Spoke handlers
  function handleAddSpoke() {
    spokeModalMode = "create";
    editingSpoke = undefined;
    spokeModalOpen = true;
  }

  function handleEditSpoke(spoke: SpokeConfig) {
    spokeModalMode = "edit";
    editingSpoke = spoke;
    spokeModalOpen = true;
  }

  function handleDeleteSpoke(spoke: SpokeConfig) {
    spokeToDelete = spoke;
    confirmDeleteOpen = true;
  }

  async function handleToggleSpoke(spoke: SpokeConfig, enabled: boolean) {
    try {
      await api.updateSpoke(spoke.name, { enabled });
      toastStore.success(`Spoke "${spoke.name}" ${enabled ? "enabled" : "disabled"}`);
      await loadSpokes();
    } catch (error) {
      console.error("Failed to toggle spoke:", error);
      toastStore.error(getErrorMessage(error));
    }
  }

  async function handleSpokeSubmit(spokeData: Partial<SpokeConfig> & { name: string }) {
    try {
      if (spokeModalMode === "create") {
        await api.createSpoke(spokeData as SpokeCreateRequest);
        toastStore.success(`Spoke "${spokeData.name}" created`);
      } else {
        const { name, ...updates } = spokeData;
        await api.updateSpoke(name, updates as SpokeUpdateRequest);
        toastStore.success(`Spoke "${name}" updated`);
      }
      spokeModalOpen = false;
      await loadSpokes();
    } catch (error) {
      console.error("Failed to save spoke:", error);
      toastStore.error(getErrorMessage(error));
    }
  }

  async function confirmDeleteSpoke() {
    if (!spokeToDelete) {return;}

    try {
      await api.deleteSpoke(spokeToDelete.name);
      toastStore.success(`Spoke "${spokeToDelete.name}" deleted`);
      confirmDeleteOpen = false;
      spokeToDelete = undefined;
      await loadSpokes();
    } catch (error) {
      console.error("Failed to delete spoke:", error);
      toastStore.error(getErrorMessage(error));
    }
  }
</script>

<svelte:window on:beforeunload={handleBeforeUnload} />

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
    <SettingsTabs
      {tabs}
      {activeTab}
      onchange={handleTabChange}
    />

    <div class="tab-content">
      <!-- Daemon Tab -->
      {#if activeTab === "daemon"}
        <section class="settings-section" id="panel-daemon">
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

        <section class="settings-section">
          <h2>Analysis Execution</h2>
          <p class="section-description">
            Fine-tune timeouts and retry logic for analysis jobs
          </p>

          <div class="form-grid">
            <div class="form-group">
              <label for="analysisTimeout">Analysis Timeout (minutes)</label>
              <input
                type="number"
                id="analysisTimeout"
                bind:value={analysisTimeoutMinutes}
                min="1"
                max="120"
              />
              <span class="hint">Max time allowed for a single analysis job</span>
            </div>

            <div class="form-group">
              <label for="maxConcurrent">Max Concurrent Jobs</label>
              <input
                type="number"
                id="maxConcurrent"
                bind:value={maxConcurrentAnalysis}
                min="1"
                max="10"
              />
              <span class="hint">Limit concurrent API calls to providers</span>
            </div>

            <div class="form-group">
              <label for="maxRetries">Max Retries</label>
              <input
                type="number"
                id="maxRetries"
                bind:value={maxRetries}
                min="0"
                max="10"
              />
              <span class="hint">Number of times to retry failed jobs</span>
            </div>

            <div class="form-group">
              <label for="retryDelay">Retry Delay (seconds)</label>
              <input
                type="number"
                id="retryDelay"
                bind:value={retryDelaySeconds}
                min="1"
                max="3600"
              />
              <span class="hint">Wait time before retrying a failed job</span>
            </div>
          </div>
        </section>

        <section class="settings-section">
          <h2>Queue & Limits</h2>
          <p class="section-description">
            Manage queue capacity and processing limits
          </p>

          <div class="form-grid">
            <div class="form-group">
              <label for="maxQueueSize">Max Queue Size</label>
              <input
                type="number"
                id="maxQueueSize"
                bind:value={maxQueueSize}
                min="10"
                max="10000"
              />
              <span class="hint">Maximum number of pending jobs in queue</span>
            </div>

            <div class="form-group">
              <label for="backfillLimit">Backfill Limit</label>
              <input
                type="number"
                id="backfillLimit"
                bind:value={backfillLimit}
                min="1"
                max="1000"
              />
              <span class="hint">Max jobs to process during backfill</span>
            </div>

            <div class="form-group">
              <label for="reanalysisLimit">Reanalysis Limit</label>
              <input
                type="number"
                id="reanalysisLimit"
                bind:value={reanalysisLimit}
                min="1"
                max="1000"
              />
              <span class="hint">Max jobs for nightly reanalysis</span>
            </div>
          </div>
        </section>

        <section class="settings-section">
          <h2>Connection Discovery</h2>
          <p class="section-description">
            Configure how the daemon discovers connections between sessions
          </p>

          <div class="form-grid">
            <div class="form-group">
              <label for="connLimit">Discovery Limit</label>
              <input
                type="number"
                id="connLimit"
                bind:value={connectionDiscoveryLimit}
                min="1"
                max="1000"
              />
              <span class="hint">Max nodes to check for connections per run</span>
            </div>

            <div class="form-group">
              <label for="connLookback">Lookback Days</label>
              <input
                type="number"
                id="connLookback"
                bind:value={connectionDiscoveryLookbackDays}
                min="1"
                max="365"
              />
              <span class="hint">How far back to check for related sessions</span>
            </div>

            <div class="form-group">
              <label for="connCooldown">Cooldown (hours)</label>
              <input
                type="number"
                id="connCooldown"
                bind:value={connectionDiscoveryCooldownHours}
                min="1"
                max="168"
              />
              <span class="hint">Min time between discovery runs for a node</span>
            </div>
          </div>
        </section>

        <section class="settings-section">
          <h2>Semantic Search</h2>
          <p class="section-description">
            Configure parameters for vector-based semantic search
          </p>

          <div class="form-grid">
            <div class="form-group">
              <label for="semanticThreshold">Similarity Threshold</label>
              <div class="range-group">
                <input
                  type="range"
                  id="semanticThreshold"
                  bind:value={semanticSearchThreshold}
                  min="0"
                  max="1"
                  step="0.05"
                />
                <span class="range-value">{semanticSearchThreshold.toFixed(2)}</span>
              </div>
              <span class="hint">Minimum similarity score (0.0 - 1.0) for matches</span>
            </div>
          </div>
        </section>

      <!-- Embeddings Tab -->
      {:else if activeTab === "embeddings"}
        <section class="settings-section" id="panel-embeddings">
          <h2>Embedding Configuration</h2>
          <p class="section-description">
            Configure the embedding provider for semantic search and connection discovery
          </p>

          <div class="form-grid">
            <div class="form-group">
              <label for="embeddingProvider">Provider</label>
              <select
                id="embeddingProvider"
                bind:value={embeddingProvider}
              >
                <option value="ollama">Ollama (Local)</option>
                <option value="openai">OpenAI</option>
                <option value="openrouter">OpenRouter</option>
              </select>
              <span class="hint">Embedding service to use for vector generation</span>
            </div>

            <div class="form-group">
              <label for="embeddingModel">Model</label>
              <input
                type="text"
                id="embeddingModel"
                bind:value={embeddingModel}
                placeholder={embeddingProvider === "ollama" ? "nomic-embed-text" : "text-embedding-3-small"}
              />
              <span class="hint">
                {#if embeddingProvider === "ollama"}
                  e.g., nomic-embed-text, mxbai-embed-large
                {:else if embeddingProvider === "openai"}
                  e.g., text-embedding-3-small, text-embedding-3-large
                {:else}
                  e.g., qwen3-embedding-8b
                {/if}
              </span>
            </div>
          </div>

          {#if embeddingProvider !== "ollama"}
            <div class="form-group" style="margin-top: var(--space-4);">
              <PasswordInput
                label="API Key"
                bind:value={embeddingApiKey}
                placeholder="Enter your API key..."
                hint="Required for OpenAI and OpenRouter. Leave empty to keep existing key."
                hasExistingValue={hasApiKey}
              />
            </div>

            <div class="form-grid" style="margin-top: var(--space-4);">
              <div class="form-group">
                <label for="embeddingBaseUrl">Base URL (optional)</label>
                <input
                  type="text"
                  id="embeddingBaseUrl"
                  bind:value={embeddingBaseUrl}
                  placeholder={embeddingProvider === "openai" ? "https://api.openai.com/v1" : "https://openrouter.ai/api/v1"}
                />
                <span class="hint">Override the default API endpoint</span>
              </div>

              <div class="form-group">
                <label for="embeddingDimensions">Dimensions (optional)</label>
                <input
                  type="number"
                  id="embeddingDimensions"
                  bind:value={embeddingDimensions}
                  placeholder="Auto"
                  min="1"
                  max="10000"
                />
                <span class="hint">Override embedding vector size (leave empty for default)</span>
              </div>
            </div>
          {/if}
        </section>

      <!-- Schedules Tab -->
      {:else if activeTab === "schedules"}
        <section class="settings-section" id="panel-schedules">
          <h2>Background Task Schedules</h2>
          <p class="section-description">
            Configure when nightly background tasks run. Uses standard cron syntax.
          </p>

          <div class="schedules-grid">
            <CronInput
              bind:value={reanalysisSchedule}
              label="Reanalysis"
              hint="When to reanalyze older sessions with updated prompts"
            />

            <CronInput
              bind:value={connectionDiscoverySchedule}
              label="Connection Discovery"
              hint="When to find semantic connections between nodes"
            />

            <CronInput
              bind:value={patternAggregationSchedule}
              label="Pattern Aggregation"
              hint="When to aggregate failure patterns and model quirks"
            />

            <CronInput
              bind:value={clusteringSchedule}
              label="Clustering"
              hint="When to run cluster analysis and naming"
            />

            <CronInput
              bind:value={backfillEmbeddingsSchedule}
              label="Backfill Embeddings"
              hint="When to generate embeddings for nodes missing them"
            />
          </div>
        </section>

      <!-- Query Tab -->
      {:else if activeTab === "query"}
        <section class="settings-section" id="panel-query">
          <h2>Query Configuration</h2>
          <p class="section-description">
            Configure the AI model used for /brain queries
          </p>

          <div class="form-grid">
            <div class="form-group">
              <label for="queryProvider">Provider</label>
              <select
                id="queryProvider"
                bind:value={queryProvider}
              >
                {#each providers as p}
                  <option value={p.id}>{p.name}</option>
                {/each}
              </select>
              <span class="hint">Provider for /brain query responses</span>
            </div>

            <div class="form-group">
              <label for="queryModel">Model</label>
              <select id="queryModel" bind:value={queryModel}>
                {#each providers.find((p) => p.id === queryProvider)?.models ?? [] as m}
                  <option value={m}>{m}</option>
                {/each}
              </select>
              <span class="hint">Model used to answer /brain queries</span>
            </div>
          </div>
        </section>

      <!-- API Server Tab -->
      {:else if activeTab === "api"}
        <section class="settings-section" id="panel-api">
          <h2>API Server Configuration</h2>
          <p class="section-description">
            Configure the pi-brain API server settings
          </p>

          <div class="form-grid">
            <div class="form-group">
              <label for="apiPort">Port</label>
              <input
                type="number"
                id="apiPort"
                bind:value={apiPort}
                min="1024"
                max="65535"
              />
              <span class="hint">Port the API server listens on (default: 8765)</span>
            </div>

            <div class="form-group">
              <label for="apiHost">Host</label>
              <input
                type="text"
                id="apiHost"
                bind:value={apiHost}
                placeholder="localhost"
              />
              <span class="hint">Address to bind the server to (e.g. localhost, 0.0.0.0)</span>
            </div>
          </div>

          <div class="form-group" style="margin-top: var(--space-4);">
            <TagInput
              label="CORS Origins"
              bind:value={apiCorsOrigins}
              placeholder="e.g. http://localhost:5173"
              hint="Allowed origins for cross-origin requests. Press Enter to add."
            />
          </div>
        </section>

      <!-- Hub Tab -->
      {:else if activeTab === "hub"}
        <section class="settings-section" id="panel-hub">
          <h2>Hub Configuration</h2>
          <p class="section-description">
            Configure core paths and hub settings
          </p>

          <div class="warning-box" style="margin-bottom: var(--space-4);">
            <p><strong>⚠️ Warning:</strong> Changing directory paths requires a daemon restart and may require manual data migration if files are moved.</p>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label for="sessionsDir">Sessions Directory</label>
              <input
                type="text"
                id="sessionsDir"
                bind:value={hubSessionsDir}
                placeholder="~/.pi/agent/sessions"
              />
              <span class="hint">Path to where pi session files are stored</span>
            </div>

            <div class="form-group">
              <label for="databaseDir">Database Directory</label>
              <input
                type="text"
                id="databaseDir"
                bind:value={hubDatabaseDir}
                placeholder="~/.pi-brain/data"
              />
              <span class="hint">Path to where the brain database and nodes are stored</span>
            </div>

            <div class="form-group">
              <label for="webUiPort">Web UI Port</label>
              <input
                type="number"
                id="webUiPort"
                bind:value={hubWebUiPort}
                min="1024"
                max="65535"
              />
              <span class="hint">Port the Web UI dashboard runs on</span>
            </div>
          </div>
        </section>

      <!-- Spokes Tab -->
      {:else if activeTab === "spokes"}
        <section class="settings-section spokes-section" id="panel-spokes">
          <h2>Multi-Computer Sync</h2>
          <p class="section-description">
            Configure remote spokes to sync session files from other computers
          </p>

          <SpokeList
            {spokes}
            loading={spokesLoading}
            onadd={handleAddSpoke}
            onedit={handleEditSpoke}
            ondelete={handleDeleteSpoke}
            ontoggle={handleToggleSpoke}
          />
        </section>
      {/if}
    </div>

    <!-- Save/Reset buttons (only show for non-spokes tabs since spokes save immediately) -->
    {#if activeTab !== "spokes"}
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
  {/if}
</div>

<!-- Spoke Modal -->
<SpokeModal
  open={spokeModalOpen}
  mode={spokeModalMode}
  spoke={editingSpoke}
  onsubmit={handleSpokeSubmit}
  oncancel={() => spokeModalOpen = false}
/>

<!-- Delete Confirmation Dialog -->
<ConfirmDialog
  open={confirmDeleteOpen}
  title="Delete Spoke"
  message={`Are you sure you want to delete the spoke "${spokeToDelete?.name}"? This cannot be undone.`}
  confirmText="Delete"
  variant="danger"
  onconfirm={confirmDeleteSpoke}
  oncancel={() => { confirmDeleteOpen = false; spokeToDelete = undefined; }}
/>

<style>
  .settings-page {
    max-width: 800px;
    padding-bottom: var(--space-12);
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

  .tab-content {
    margin-top: var(--space-4);
  }

  .settings-section {
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-6);
    margin-bottom: var(--space-4);
  }

  .settings-section.spokes-section {
    background: transparent;
    border: none;
    padding: 0;
  }

  .settings-section.spokes-section h2,
  .settings-section.spokes-section .section-description {
    padding: 0 var(--space-2);
    margin-bottom: var(--space-2);
  }

  .settings-section.spokes-section .section-description {
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

  .schedules-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: var(--space-6);
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
  .form-group input[type="number"],
  .form-group input[type="text"],
  .form-group input[type="range"] {
    padding: var(--space-2) var(--space-3);
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    color: var(--color-text);
    transition: border-color 0.15s ease;
  }

  .form-group input[type="range"] {
    padding: 0;
  }

  .form-group select:focus,
  .form-group input[type="number"]:focus,
  .form-group input[type="text"]:focus {
    outline: none;
    border-color: var(--color-accent);
  }

  .form-group .hint {
    font-size: var(--text-xs);
    color: var(--color-text-subtle);
  }

  .warning-box {
    background: var(--color-warning-muted, #fff7ed);
    border: 1px solid var(--color-warning, #f97316);
    color: var(--color-warning-text, #9a3412);
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
  }

  .warning-box p {
    margin: 0;
  }

  .range-group {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .range-group input {
    flex: 1;
  }

  .range-value {
    font-variant-numeric: tabular-nums;
    font-weight: 500;
    width: 3em;
    text-align: right;
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
