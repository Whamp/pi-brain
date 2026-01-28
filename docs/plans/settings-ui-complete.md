# Plan: Complete Settings UI for All Config Options

**Status**: Draft  
**Created**: 2026-01-28  
**Estimated Effort**: 2-3 days

## Overview

Make all `~/.pi-brain/config.yaml` options editable through the web UI settings page. Currently only 4 daemon fields are supported. This plan covers all 38+ configuration fields across 5 sections.

## Current State

The settings page (`src/web/app/src/routes/settings/+page.svelte`) supports:

- `daemon.provider` ✅
- `daemon.model` ✅
- `daemon.idleTimeoutMinutes` ✅
- `daemon.parallelWorkers` ✅

The pattern is established:

1. API route reads/writes YAML (`src/api/routes/config.ts`)
2. UI calls API, displays form, saves changes
3. Changes require daemon restart to take effect

## Architecture

### API Structure

```
GET  /api/v1/config/daemon     → DaemonConfig subset
PUT  /api/v1/config/daemon     → Update daemon fields
GET  /api/v1/config/hub        → HubConfig (NEW)
PUT  /api/v1/config/hub        → Update hub fields (NEW)
GET  /api/v1/config/query      → QueryConfig (NEW)
PUT  /api/v1/config/query      → Update query fields (NEW)
GET  /api/v1/config/api        → ApiConfig (NEW)
PUT  /api/v1/config/api        → Update API fields (NEW)
GET  /api/v1/config/spokes     → SpokeConfig[] (NEW)
PUT  /api/v1/config/spokes     → Update spokes array (NEW)
POST /api/v1/config/spokes     → Add spoke (NEW)
DELETE /api/v1/config/spokes/:name → Remove spoke (NEW)
GET  /api/v1/config/providers  → Available AI providers (EXISTS)
```

### UI Structure

Settings page reorganized into tabbed sections:

```
/settings
  ├── Daemon (default tab)
  │   ├── Analysis Model
  │   ├── Worker Settings
  │   ├── Retry Settings
  │   └── Limits
  ├── Embeddings
  │   ├── Provider
  │   ├── Model
  │   ├── API Key (masked)
  │   └── Semantic Search
  ├── Schedules
  │   ├── Reanalysis
  │   ├── Connection Discovery
  │   ├── Pattern Aggregation
  │   ├── Clustering
  │   └── Embedding Backfill
  ├── Query
  │   ├── Provider
  │   └── Model
  ├── Hub
  │   ├── Sessions Directory
  │   ├── Database Directory
  │   └── Web UI Port
  ├── API Server
  │   ├── Port
  │   ├── Host
  │   └── CORS Origins
  └── Spokes
      └── [Dynamic list with add/edit/remove]
```

---

## Phase 1: Extend Daemon Settings (Trivial)

**Effort**: 2-3 hours

Add remaining daemon fields to existing endpoints and UI.

### 1.1 Backend: Extend PUT /config/daemon

Add validation and handling for:

```typescript
// Additional fields in request body
interface DaemonConfigUpdate {
  // Existing
  provider?: string;
  model?: string;
  idleTimeoutMinutes?: number;
  parallelWorkers?: number;
  // New
  maxRetries?: number; // 1-10
  retryDelaySeconds?: number; // 1-3600
  analysisTimeoutMinutes?: number; // 1-120
  maxConcurrentAnalysis?: number; // 1-10
  maxQueueSize?: number; // 10-10000
  backfillLimit?: number; // 1-1000
  reanalysisLimit?: number; // 1-1000
  connectionDiscoveryLimit?: number; // 1-1000
  connectionDiscoveryLookbackDays?: number; // 1-365
  connectionDiscoveryCooldownHours?: number; // 1-168
  semanticSearchThreshold?: number; // 0.0-1.0
}
```

### 1.2 Frontend: Add Form Fields

Extend settings page with new sections:

```svelte
<section class="settings-section">
  <h2>Retry Settings</h2>
  <div class="form-grid">
    <!-- maxRetries: number input 1-10 -->
    <!-- retryDelaySeconds: number input 1-3600 -->
  </div>
</section>

<section class="settings-section">
  <h2>Analysis Limits</h2>
  <div class="form-grid">
    <!-- analysisTimeoutMinutes -->
    <!-- maxConcurrentAnalysis -->
    <!-- maxQueueSize -->
  </div>
</section>

<section class="settings-section">
  <h2>Scheduled Job Limits</h2>
  <div class="form-grid">
    <!-- backfillLimit -->
    <!-- reanalysisLimit -->
    <!-- connectionDiscoveryLimit -->
    <!-- connectionDiscoveryLookbackDays -->
    <!-- connectionDiscoveryCooldownHours -->
  </div>
</section>

<section class="settings-section">
  <h2>Semantic Search</h2>
  <div class="form-grid">
    <!-- semanticSearchThreshold: slider 0.0-1.0 -->
  </div>
</section>
```

### 1.3 Tasks

- [ ] Update `src/api/routes/config.ts`: Add new fields to GET/PUT /config/daemon
- [ ] Update `src/web/app/src/lib/api/client.ts`: Extend type definitions
- [ ] Update `src/web/app/src/routes/settings/+page.svelte`: Add form sections
- [ ] Add validation messages for each field

---

## Phase 2: Query & API Config (Trivial)

**Effort**: 2-3 hours

### 2.1 Backend: New Routes

Add to `src/api/routes/config.ts`:

```typescript
// GET /config/query
app.get("/query", async (request, reply) => {
  const config = loadConfig();
  return reply.send(
    successResponse({
      provider: config.query.provider,
      model: config.query.model,
    })
  );
});

// PUT /config/query
app.put("/query", async (request, reply) => {
  // Same pattern as daemon
});

// GET /config/api
app.get("/api", async (request, reply) => {
  const config = loadConfig();
  return reply.send(
    successResponse({
      port: config.api.port,
      host: config.api.host,
      corsOrigins: config.api.corsOrigins,
    })
  );
});

// PUT /config/api
app.put("/api", async (request, reply) => {
  // Validate port (1024-65535), host, corsOrigins array
});
```

### 2.2 Frontend: New Sections

Add Query and API Server sections to settings page.

For `corsOrigins` (array), create a simple tag-like input:

```svelte
<div class="form-group">
  <label>CORS Origins</label>
  <div class="tag-input">
    {#each corsOrigins as origin, i}
      <span class="tag">
        {origin}
        <button onclick={() => removeOrigin(i)}>×</button>
      </span>
    {/each}
    <input
      type="text"
      placeholder="Add origin..."
      onkeydown={handleAddOrigin}
    />
  </div>
</div>
```

### 2.3 Tasks

- [ ] Add GET/PUT /config/query routes
- [ ] Add GET/PUT /config/api routes
- [ ] Add Query section to settings UI
- [ ] Add API Server section to settings UI
- [ ] Create `TagInput` component for corsOrigins

---

## Phase 3: Hub Config (Moderate)

**Effort**: 2-3 hours

### 3.1 Backend: New Routes

```typescript
// GET /config/hub
app.get("/hub", async (request, reply) => {
  const config = loadConfig();
  return reply.send(
    successResponse({
      sessionsDir: config.hub.sessionsDir,
      databaseDir: config.hub.databaseDir,
      webUiPort: config.hub.webUiPort,
    })
  );
});

// PUT /config/hub
app.put("/hub", async (request, reply) => {
  // Validate paths exist or can be created
  // Validate port range
});
```

### 3.2 Path Validation

Add helper to validate directory paths:

```typescript
function validatePath(path: string): { valid: boolean; error?: string } {
  const expanded = expandPath(path);
  try {
    if (fs.existsSync(expanded)) {
      const stat = fs.statSync(expanded);
      if (!stat.isDirectory()) {
        return { valid: false, error: "Path exists but is not a directory" };
      }
    }
    // Path doesn't exist - check parent is writable
    const parent = path.dirname(expanded);
    if (!fs.existsSync(parent)) {
      return { valid: false, error: "Parent directory does not exist" };
    }
    return { valid: true };
  } catch (e) {
    return { valid: false, error: (e as Error).message };
  }
}
```

### 3.3 Frontend: Hub Section

```svelte
<section class="settings-section">
  <h2>Hub Directories</h2>
  <p class="section-description">
    ⚠️ Changing these paths requires daemon restart and may require data migration.
  </p>
  <div class="form-grid">
    <div class="form-group">
      <label>Sessions Directory</label>
      <input type="text" bind:value={sessionsDir} />
      <span class="hint">Path to pi agent sessions (supports ~)</span>
    </div>
    <div class="form-group">
      <label>Database Directory</label>
      <input type="text" bind:value={databaseDir} />
      <span class="hint">Path to brain.db and nodes/</span>
    </div>
    <div class="form-group">
      <label>Web UI Port</label>
      <input type="number" bind:value={webUiPort} min="1024" max="65535" />
    </div>
  </div>
</section>
```

### 3.4 Tasks

- [ ] Add GET/PUT /config/hub routes
- [ ] Add path validation helper
- [ ] Add Hub section to settings UI
- [ ] Add warning about data migration for path changes

---

## Phase 4: Embedding Config (Moderate)

**Effort**: 3-4 hours

### 4.1 Backend: Extend Daemon Routes

Add embedding fields to existing daemon routes:

```typescript
interface EmbeddingConfigUpdate {
  embeddingProvider?: "ollama" | "openai" | "openrouter";
  embeddingModel?: string;
  embeddingApiKey?: string; // Write-only, never returned in GET
  embeddingBaseUrl?: string;
  embeddingDimensions?: number; // Optional
}
```

**Security**: API key handling:

- GET returns `hasApiKey: boolean` instead of the actual key
- PUT accepts new key or `null` to clear
- Key is only written, never read back

### 4.2 Frontend: Embedding Section

```svelte
<section class="settings-section">
  <h2>Embedding Configuration</h2>
  <p class="section-description">
    Configure vector embeddings for semantic search and clustering
  </p>

  <div class="form-grid">
    <div class="form-group">
      <label>Provider</label>
      <select bind:value={embeddingProvider} onchange={handleEmbeddingProviderChange}>
        <option value="ollama">Ollama (Local)</option>
        <option value="openai">OpenAI</option>
        <option value="openrouter">OpenRouter</option>
      </select>
    </div>

    <div class="form-group">
      <label>Model</label>
      <input type="text" bind:value={embeddingModel} />
      <span class="hint">
        {#if embeddingProvider === "ollama"}
          e.g., nomic-embed-text
        {:else if embeddingProvider === "openai"}
          e.g., text-embedding-3-small
        {:else}
          e.g., qwen/qwen3-embedding-8b
        {/if}
      </span>
    </div>

    {#if embeddingProvider !== "ollama"}
      <div class="form-group">
        <label>API Key</label>
        <div class="password-input">
          <input
            type={showApiKey ? "text" : "password"}
            bind:value={embeddingApiKey}
            placeholder={hasExistingApiKey ? "••••••••" : "Enter API key"}
          />
          <button onclick={() => showApiKey = !showApiKey}>
            {showApiKey ? "Hide" : "Show"}
          </button>
        </div>
        <span class="hint">Required for {embeddingProvider}</span>
      </div>
    {/if}

    <div class="form-group">
      <label>Base URL (Optional)</label>
      <input type="text" bind:value={embeddingBaseUrl} placeholder="Default" />
      <span class="hint">Custom API endpoint</span>
    </div>

    <div class="form-group">
      <label>Dimensions (Optional)</label>
      <input type="number" bind:value={embeddingDimensions} placeholder="Auto" />
      <span class="hint">Leave empty to use model default</span>
    </div>
  </div>
</section>
```

### 4.3 Tasks

- [ ] Extend GET/PUT /config/daemon for embedding fields
- [ ] Implement secure API key handling (write-only)
- [ ] Add Embeddings section to settings UI
- [ ] Add conditional field visibility based on provider
- [ ] Add "Test Connection" button (optional enhancement)

---

## Phase 5: Cron Schedules (Moderate)

**Effort**: 4-5 hours

### 5.1 Backend: Extend Daemon Routes

Add schedule fields:

```typescript
interface ScheduleConfigUpdate {
  reanalysisSchedule?: string;
  connectionDiscoverySchedule?: string;
  patternAggregationSchedule?: string;
  clusteringSchedule?: string;
  backfillEmbeddingsSchedule?: string;
}
```

Add validation using existing `isValidCronExpression`:

```typescript
import { isValidCronExpression } from "../../daemon/scheduler.js";

// In PUT handler
if (reanalysisSchedule && !isValidCronExpression(reanalysisSchedule)) {
  return reply
    .status(400)
    .send(
      errorResponse(
        "BAD_REQUEST",
        "Invalid cron expression for reanalysisSchedule"
      )
    );
}
```

### 5.2 Frontend: Schedule Section

Create a reusable `CronInput` component:

```svelte
<!-- src/lib/components/cron-input.svelte -->
<script lang="ts">
  interface Props {
    value: string;
    label: string;
    description?: string;
    presets?: { label: string; value: string }[];
  }

  let { value = $bindable(), label, description, presets = [] }: Props = $props();

  const defaultPresets = [
    { label: "Every hour", value: "0 * * * *" },
    { label: "Every 6 hours", value: "0 */6 * * *" },
    { label: "Daily at 2am", value: "0 2 * * *" },
    { label: "Weekly (Sunday 3am)", value: "0 3 * * 0" },
    { label: "Disabled", value: "" },
  ];

  const allPresets = presets.length ? presets : defaultPresets;
  let isCustom = $derived(!allPresets.some(p => p.value === value));
</script>

<div class="form-group">
  <label>{label}</label>
  <div class="cron-input">
    <select onchange={(e) => value = e.target.value}>
      {#each allPresets as preset}
        <option value={preset.value} selected={value === preset.value}>
          {preset.label}
        </option>
      {/each}
      <option value="__custom__" selected={isCustom}>Custom...</option>
    </select>
    {#if isCustom}
      <input type="text" bind:value placeholder="0 2 * * *" />
    {/if}
  </div>
  {#if description}
    <span class="hint">{description}</span>
  {/if}
</div>
```

### 5.3 Schedules Section

```svelte
<section class="settings-section">
  <h2>Scheduled Jobs</h2>
  <p class="section-description">
    Configure when background maintenance jobs run (cron format)
  </p>

  <div class="form-stack">
    <CronInput
      bind:value={reanalysisSchedule}
      label="Reanalysis"
      description="Re-analyze nodes with updated prompts"
    />
    <CronInput
      bind:value={connectionDiscoverySchedule}
      label="Connection Discovery"
      description="Find semantic connections between nodes"
    />
    <CronInput
      bind:value={patternAggregationSchedule}
      label="Pattern Aggregation"
      description="Aggregate recurring patterns into insights"
    />
    <CronInput
      bind:value={clusteringSchedule}
      label="Clustering"
      description="Group similar nodes using embeddings"
    />
    <CronInput
      bind:value={backfillEmbeddingsSchedule}
      label="Embedding Backfill"
      description="Generate embeddings for nodes missing them"
    />
  </div>
</section>
```

### 5.4 Tasks

- [ ] Extend GET/PUT /config/daemon for schedule fields
- [ ] Add cron validation using existing `isValidCronExpression`
- [ ] Create `CronInput` component with presets dropdown
- [ ] Add Schedules section to settings UI
- [ ] Show next run time for each schedule (optional enhancement)

---

## Phase 6: Spokes Configuration (Major)

**Effort**: 8-12 hours

This is the most complex phase - managing a dynamic array of spoke configurations with nested rsync options.

### 6.1 Backend: Spokes Routes

```typescript
// GET /config/spokes - List all spokes
app.get("/spokes", async (request, reply) => {
  const config = loadConfig();
  return reply.send(
    successResponse({
      spokes: config.spokes.map((spoke) => ({
        name: spoke.name,
        syncMethod: spoke.syncMethod,
        path: spoke.path,
        source: spoke.source,
        enabled: spoke.enabled,
        schedule: spoke.schedule,
        rsyncOptions: spoke.rsyncOptions,
      })),
    })
  );
});

// POST /config/spokes - Add new spoke
app.post("/spokes", async (request, reply) => {
  const { name, syncMethod, path, source, enabled, schedule, rsyncOptions } =
    request.body;

  // Validate name uniqueness
  const config = loadConfig();
  if (config.spokes.some((s) => s.name === name)) {
    return reply
      .status(409)
      .send(errorResponse("CONFLICT", `Spoke "${name}" already exists`));
  }

  // Validate required fields based on syncMethod
  if (syncMethod === "rsync" && !source) {
    return reply
      .status(400)
      .send(
        errorResponse("BAD_REQUEST", "source is required for rsync spokes")
      );
  }

  // Add to config and save
  // ...
});

// PUT /config/spokes/:name - Update spoke
app.put("/spokes/:name", async (request, reply) => {
  // Find and update spoke by name
});

// DELETE /config/spokes/:name - Remove spoke
app.delete("/spokes/:name", async (request, reply) => {
  // Remove spoke from array
});
```

### 6.2 Frontend: Spokes List Component

```svelte
<!-- src/lib/components/spoke-list.svelte -->
<script lang="ts">
  import { Plus, Edit2, Trash2, Power, PowerOff } from "lucide-svelte";

  interface Spoke {
    name: string;
    syncMethod: "syncthing" | "rsync" | "api";
    path: string;
    source?: string;
    enabled: boolean;
    schedule?: string;
    rsyncOptions?: RsyncOptions;
  }

  let spokes: Spoke[] = $state([]);
  let editingSpoke: Spoke | null = $state(null);
  let showAddModal = $state(false);
</script>

<section class="settings-section">
  <div class="section-header">
    <div>
      <h2>Spoke Machines</h2>
      <p class="section-description">
        Configure secondary machines that sync sessions to this hub
      </p>
    </div>
    <button class="btn-primary" onclick={() => showAddModal = true}>
      <Plus size={16} /> Add Spoke
    </button>
  </div>

  {#if spokes.length === 0}
    <div class="empty-state">
      <p>No spokes configured</p>
      <p class="hint">Add a spoke to sync sessions from other machines</p>
    </div>
  {:else}
    <div class="spoke-list">
      {#each spokes as spoke}
        <div class="spoke-card" class:disabled={!spoke.enabled}>
          <div class="spoke-info">
            <div class="spoke-header">
              <span class="spoke-name">{spoke.name}</span>
              <span class="spoke-method badge">{spoke.syncMethod}</span>
              {#if !spoke.enabled}
                <span class="badge disabled">Disabled</span>
              {/if}
            </div>
            <div class="spoke-path">{spoke.path}</div>
            {#if spoke.source}
              <div class="spoke-source">← {spoke.source}</div>
            {/if}
            {#if spoke.schedule}
              <div class="spoke-schedule">⏰ {spoke.schedule}</div>
            {/if}
          </div>
          <div class="spoke-actions">
            <button
              class="icon-btn"
              title={spoke.enabled ? "Disable" : "Enable"}
              onclick={() => toggleSpoke(spoke.name)}
            >
              {#if spoke.enabled}
                <Power size={16} />
              {:else}
                <PowerOff size={16} />
              {/if}
            </button>
            <button
              class="icon-btn"
              title="Edit"
              onclick={() => editingSpoke = spoke}
            >
              <Edit2 size={16} />
            </button>
            <button
              class="icon-btn danger"
              title="Delete"
              onclick={() => deleteSpoke(spoke.name)}
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</section>

{#if showAddModal || editingSpoke}
  <SpokeModal
    spoke={editingSpoke}
    onSave={handleSaveSpoke}
    onClose={() => { showAddModal = false; editingSpoke = null; }}
  />
{/if}
```

### 6.3 Spoke Edit Modal

```svelte
<!-- src/lib/components/spoke-modal.svelte -->
<script lang="ts">
  interface Props {
    spoke?: Spoke | null;
    onSave: (spoke: Spoke) => void;
    onClose: () => void;
  }

  let { spoke, onSave, onClose }: Props = $props();

  // Form state
  let name = $state(spoke?.name ?? "");
  let syncMethod = $state(spoke?.syncMethod ?? "syncthing");
  let path = $state(spoke?.path ?? "");
  let source = $state(spoke?.source ?? "");
  let enabled = $state(spoke?.enabled ?? true);
  let schedule = $state(spoke?.schedule ?? "");

  // Rsync options
  let bwLimit = $state(spoke?.rsyncOptions?.bwLimit ?? 0);
  let deleteFiles = $state(spoke?.rsyncOptions?.delete ?? false);
  let timeoutSeconds = $state(spoke?.rsyncOptions?.timeoutSeconds ?? 300);
  let extraArgs = $state(spoke?.rsyncOptions?.extraArgs?.join("\n") ?? "");

  const isEdit = !!spoke;
</script>

<div class="modal-backdrop" onclick={onClose}>
  <div class="modal" onclick|stopPropagation>
    <h3>{isEdit ? "Edit Spoke" : "Add Spoke"}</h3>

    <div class="form-stack">
      <div class="form-group">
        <label>Name *</label>
        <input type="text" bind:value={name} disabled={isEdit} />
        <span class="hint">Unique identifier for this spoke</span>
      </div>

      <div class="form-group">
        <label>Sync Method *</label>
        <select bind:value={syncMethod}>
          <option value="syncthing">Syncthing (auto-sync)</option>
          <option value="rsync">Rsync (scheduled pull)</option>
          <option value="api">API (push from spoke)</option>
        </select>
      </div>

      <div class="form-group">
        <label>Local Path *</label>
        <input type="text" bind:value={path} placeholder="~/.pi-brain/spokes/laptop" />
        <span class="hint">Where synced sessions appear locally</span>
      </div>

      {#if syncMethod === "rsync"}
        <div class="form-group">
          <label>Source *</label>
          <input type="text" bind:value={source} placeholder="user@host:~/.pi/agent/sessions" />
          <span class="hint">Remote path to pull from</span>
        </div>

        <div class="form-group">
          <label>Schedule</label>
          <CronInput bind:value={schedule} />
          <span class="hint">When to run rsync (leave empty for manual only)</span>
        </div>

        <details class="rsync-options">
          <summary>Rsync Options</summary>
          <div class="form-grid">
            <div class="form-group">
              <label>Bandwidth Limit (KB/s)</label>
              <input type="number" bind:value={bwLimit} min="0" />
              <span class="hint">0 = unlimited</span>
            </div>
            <div class="form-group">
              <label>Timeout (seconds)</label>
              <input type="number" bind:value={timeoutSeconds} min="0" />
            </div>
            <div class="form-group checkbox">
              <input type="checkbox" id="deleteFiles" bind:checked={deleteFiles} />
              <label for="deleteFiles">Delete remote files not in source</label>
            </div>
            <div class="form-group full-width">
              <label>Extra Arguments</label>
              <textarea bind:value={extraArgs} rows="3" placeholder="--exclude=*.tmp&#10;--compress" />
              <span class="hint">One argument per line</span>
            </div>
          </div>
        </details>
      {/if}

      <div class="form-group checkbox">
        <input type="checkbox" id="enabled" bind:checked={enabled} />
        <label for="enabled">Enabled</label>
      </div>
    </div>

    <div class="modal-actions">
      <button class="btn-secondary" onclick={onClose}>Cancel</button>
      <button class="btn-primary" onclick={handleSave} disabled={!isValid}>
        {isEdit ? "Save Changes" : "Add Spoke"}
      </button>
    </div>
  </div>
</div>
```

### 6.4 Tasks

- [ ] Add GET /config/spokes route
- [ ] Add POST /config/spokes route with validation
- [ ] Add PUT /config/spokes/:name route
- [ ] Add DELETE /config/spokes/:name route
- [ ] Create `SpokeList` component
- [ ] Create `SpokeModal` component with form
- [ ] Create `CronInput` component (reuse from Phase 5)
- [ ] Add confirmation dialog for delete
- [ ] Handle rsync options nested object
- [ ] Add validation for required fields by sync method

---

## Phase 7: UI Polish & Tabs

**Effort**: 2-3 hours

### 7.1 Convert to Tabbed Layout

With all sections added, the page will be long. Convert to tabs:

```svelte
<script>
  type SettingsTab = "daemon" | "embeddings" | "schedules" | "query" | "hub" | "api" | "spokes";
  let activeTab: SettingsTab = $state("daemon");
</script>

<div class="settings-page">
  <header class="page-header">
    <h1><Settings size={28} /> Settings</h1>
  </header>

  <nav class="settings-tabs">
    <button class:active={activeTab === "daemon"} onclick={() => activeTab = "daemon"}>
      Daemon
    </button>
    <button class:active={activeTab === "embeddings"} onclick={() => activeTab = "embeddings"}>
      Embeddings
    </button>
    <button class:active={activeTab === "schedules"} onclick={() => activeTab = "schedules"}>
      Schedules
    </button>
    <button class:active={activeTab === "query"} onclick={() => activeTab = "query"}>
      Query
    </button>
    <button class:active={activeTab === "hub"} onclick={() => activeTab = "hub"}>
      Hub
    </button>
    <button class:active={activeTab === "api"} onclick={() => activeTab = "api"}>
      API Server
    </button>
    <button class:active={activeTab === "spokes"} onclick={() => activeTab = "spokes"}>
      Spokes
    </button>
  </nav>

  <div class="tab-content">
    {#if activeTab === "daemon"}
      <DaemonSettings />
    {:else if activeTab === "embeddings"}
      <EmbeddingsSettings />
    <!-- ... -->
    {/if}
  </div>
</div>
```

### 7.2 Extract Section Components

Split settings page into focused components:

```
src/lib/components/settings/
  ├── daemon-settings.svelte
  ├── embeddings-settings.svelte
  ├── schedules-settings.svelte
  ├── query-settings.svelte
  ├── hub-settings.svelte
  ├── api-settings.svelte
  └── spokes-settings.svelte
```

### 7.3 Tasks

- [ ] Create tab navigation component
- [ ] Extract each settings section into its own component
- [ ] Add URL hash support for direct tab linking (`/settings#embeddings`)
- [ ] Add keyboard navigation between tabs
- [ ] Add unsaved changes warning when switching tabs

---

## Phase 8: Testing & Documentation

**Effort**: 2-3 hours

### 8.1 API Tests

Add tests to `src/api/routes/config.test.ts`:

```typescript
describe("Config API", () => {
  describe("GET /config/daemon", () => {
    it("returns all daemon fields");
    it("includes defaults");
  });

  describe("PUT /config/daemon", () => {
    it("validates numeric ranges");
    it("validates cron expressions");
    it("preserves unspecified fields");
    it("writes to config file");
  });

  describe("Spokes CRUD", () => {
    it("creates spoke with valid data");
    it("rejects duplicate spoke names");
    it("requires source for rsync method");
    it("updates spoke by name");
    it("deletes spoke by name");
  });
});
```

### 8.2 E2E Tests

Add Playwright tests for settings UI:

```typescript
test("can update daemon settings", async ({ page }) => {
  await page.goto("/settings");
  await page.fill('[id="parallelWorkers"]', "4");
  await page.click('button:has-text("Save Changes")');
  await expect(page.locator(".toast")).toContainText("Configuration updated");
});

test("can add and remove spokes", async ({ page }) => {
  await page.goto("/settings#spokes");
  await page.click('button:has-text("Add Spoke")');
  await page.fill('[id="name"]', "test-laptop");
  // ...
});
```

### 8.3 Documentation

Update README and add inline help:

- [ ] Update README with new settings capabilities
- [ ] Add tooltips/info icons for complex fields
- [ ] Add "Learn more" links to relevant docs
- [ ] Document config.yaml format for reference

---

## Summary

| Phase | Scope                | Effort | Dependencies          |
| ----- | -------------------- | ------ | --------------------- |
| 1     | Extend daemon fields | 2-3h   | None                  |
| 2     | Query & API config   | 2-3h   | None                  |
| 3     | Hub config           | 2-3h   | None                  |
| 4     | Embedding config     | 3-4h   | None                  |
| 5     | Cron schedules       | 4-5h   | CronInput component   |
| 6     | Spokes (CRUD)        | 8-12h  | Modal, CronInput      |
| 7     | Tabs & polish        | 2-3h   | All sections complete |
| 8     | Testing & docs       | 2-3h   | All phases            |

**Total**: 26-36 hours (~2-3 days focused work)

### Recommended Order

1. **Phase 1** - Quick win, extends existing code
2. **Phase 2** - More quick wins
3. **Phase 5** - Build CronInput component (needed by Phase 6)
4. **Phase 3-4** - Moderate complexity sections
5. **Phase 6** - Most complex, save for last
6. **Phase 7** - Polish after all sections exist
7. **Phase 8** - Testing throughout, docs at end

### Risk Mitigation

- **Breaking changes**: All saves show "restart daemon to apply" message
- **Path validation**: Validate paths exist before saving hub config
- **API key security**: Never return keys in GET, only accept in PUT
- **Cron validation**: Use existing `isValidCronExpression` function
- **Spoke conflicts**: Validate unique names on create
