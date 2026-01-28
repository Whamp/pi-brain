# Settings UI Specification

Complete web-based configuration management for pi-brain.

## Overview

The Settings UI provides a web interface for editing all `~/.pi-brain/config.yaml` options. Currently only 4 daemon fields are supported; this spec covers all 38+ configuration fields across 5 sections.

## Design Goals

1. **Complete coverage** - All config.yaml options editable via UI
2. **Validation** - Server-side validation with clear error messages
3. **Security** - API keys write-only (never returned in GET responses)
4. **Usability** - Sensible defaults, presets for complex fields (cron)
5. **Safety** - Clear warnings for destructive changes (paths, restart required)

## API Endpoints

### Daemon Config

```
GET  /api/v1/config/daemon
PUT  /api/v1/config/daemon
```

**Fields:**

- `provider` - LLM provider for analysis
- `model` - Model name
- `idleTimeoutMinutes` - Session idle detection (1-1440)
- `parallelWorkers` - Concurrent workers (1-10)
- `maxRetries` - Job retry limit (1-10)
- `retryDelaySeconds` - Base retry delay (1-3600)
- `analysisTimeoutMinutes` - Per-job timeout (1-120)
- `maxConcurrentAnalysis` - Concurrent jobs (1-10)
- `maxQueueSize` - Queue limit (10-10000)
- `backfillLimit` - Embedding backfill batch size (1-1000)
- `reanalysisLimit` - Reanalysis batch size (1-1000)
- `connectionDiscoveryLimit` - Connection discovery batch (1-1000)
- `connectionDiscoveryLookbackDays` - Days to look back (1-365)
- `connectionDiscoveryCooldownHours` - Cooldown period (1-168)
- `semanticSearchThreshold` - Vector search threshold (0.0-1.0)

**Cron Schedules:**

- `reanalysisSchedule`
- `connectionDiscoverySchedule`
- `patternAggregationSchedule`
- `clusteringSchedule`
- `backfillEmbeddingsSchedule`

**Embedding Config:**

- `embeddingProvider` - ollama | openai | openrouter
- `embeddingModel` - Model name
- `embeddingApiKey` - Write-only, GET returns `hasApiKey: boolean`
- `embeddingBaseUrl` - Optional custom endpoint
- `embeddingDimensions` - Optional override

### Hub Config

```
GET  /api/v1/config/hub
PUT  /api/v1/config/hub
```

**Fields:**

- `sessionsDir` - Path to pi sessions (supports ~)
- `databaseDir` - Path to brain.db and nodes/
- `webUiPort` - Web UI port (1024-65535)

**Validation:**

- Paths must exist or have writable parent directory
- Path changes require daemon restart and may need data migration

### Query Config

```
GET  /api/v1/config/query
PUT  /api/v1/config/query
```

**Fields:**

- `provider` - LLM provider for /brain queries
- `model` - Model name

### API Config

```
GET  /api/v1/config/api
PUT  /api/v1/config/api
```

**Fields:**

- `port` - API server port (1024-65535)
- `host` - Bind address
- `corsOrigins` - Array of allowed origins

### Spokes Config

```
GET    /api/v1/config/spokes          - List all spokes
POST   /api/v1/config/spokes          - Add new spoke
PUT    /api/v1/config/spokes/:name    - Update spoke
DELETE /api/v1/config/spokes/:name    - Remove spoke
```

**Spoke Fields:**

- `name` - Unique identifier (immutable after creation)
- `syncMethod` - syncthing | rsync | api
- `path` - Local path for synced sessions
- `source` - Remote source (required for rsync)
- `enabled` - Whether spoke is active
- `schedule` - Cron schedule for rsync

**Rsync Options (nested):**

- `bwLimit` - Bandwidth limit KB/s (0 = unlimited)
- `delete` - Delete files not in source
- `extraArgs` - Additional rsync arguments
- `timeoutSeconds` - Operation timeout

### Providers Reference

```
GET  /api/v1/config/providers
```

Returns list of known AI providers and their models for UI dropdowns.

## UI Components

### Settings Page Layout

Tabbed interface with 7 sections:

```
┌─────────────────────────────────────────────────────────┐
│ ⚙️ Settings                                             │
├─────────────────────────────────────────────────────────┤
│ [Daemon] [Embeddings] [Schedules] [Query] [Hub] [API] [Spokes] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Tab Content Area                                       │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                              [Reset] [Save Changes]     │
└─────────────────────────────────────────────────────────┘
```

### Reusable Components

#### CronInput

Dropdown with common presets + custom option:

```svelte
<CronInput bind:value={schedule} label="Reanalysis Schedule">
  <!-- Presets: Every hour, Every 6 hours, Daily 2am, Weekly, Disabled -->
  <!-- Custom: Raw cron expression input -->
</CronInput>
```

#### TagInput

Array editor for CORS origins:

```svelte
<TagInput bind:value={corsOrigins} label="CORS Origins" />
```

#### SpokeModal

Full-screen modal for add/edit spoke with:

- Basic fields (name, method, path)
- Conditional rsync fields (source, schedule)
- Collapsible rsync options section

#### PasswordInput

Masked input with show/hide toggle for API keys.

### Validation Messages

Each field displays inline validation errors:

```
┌─────────────────────────────────────────┐
│ Idle Timeout (minutes)                  │
│ ┌─────────────────────────────────────┐ │
│ │ 2000                                │ │
│ └─────────────────────────────────────┘ │
│ ⚠️ Must be between 1 and 1440           │
└─────────────────────────────────────────┘
```

### Warning States

For sensitive changes:

```
┌─────────────────────────────────────────┐
│ ⚠️ Hub Directories                       │
│                                         │
│ Changing paths requires daemon restart  │
│ and may require data migration.         │
└─────────────────────────────────────────┘
```

## Implementation Notes

### Config File Handling

1. Read existing YAML if present
2. Merge updates (preserve unrelated fields)
3. Write back with proper formatting
4. Reload config to validate

```typescript
// Pattern for all PUT routes
const rawConfig = loadRawConfig();
rawConfig.section = { ...rawConfig.section, ...updates };
writeConfig(rawConfig);
const validated = loadConfig(); // Re-validates
return validated.section;
```

### API Key Security

Never return API keys in GET responses:

```typescript
// GET /config/daemon
return {
  embeddingProvider: config.daemon.embeddingProvider,
  embeddingModel: config.daemon.embeddingModel,
  hasApiKey: !!config.daemon.embeddingApiKey, // Boolean only
  // embeddingApiKey: NEVER INCLUDED
};

// PUT /config/daemon
if (request.body.embeddingApiKey !== undefined) {
  if (request.body.embeddingApiKey === null) {
    // Clear the key
    delete rawConfig.daemon.embedding_api_key;
  } else {
    // Set new key
    rawConfig.daemon.embedding_api_key = request.body.embeddingApiKey;
  }
}
```

### Cron Validation

Use existing `isValidCronExpression` from scheduler:

```typescript
import { isValidCronExpression } from "../../daemon/scheduler.js";

if (schedule && !isValidCronExpression(schedule)) {
  return errorResponse("BAD_REQUEST", "Invalid cron expression");
}
```

### Path Validation

Validate directory paths before saving:

```typescript
function validatePath(path: string): { valid: boolean; error?: string } {
  const expanded = expandPath(path);
  if (fs.existsSync(expanded)) {
    if (!fs.statSync(expanded).isDirectory()) {
      return { valid: false, error: "Path exists but is not a directory" };
    }
  } else {
    const parent = path.dirname(expanded);
    if (!fs.existsSync(parent)) {
      return { valid: false, error: "Parent directory does not exist" };
    }
  }
  return { valid: true };
}
```

### Spoke Name Uniqueness

Validate on create:

```typescript
if (config.spokes.some((s) => s.name === name)) {
  return errorResponse("CONFLICT", `Spoke "${name}" already exists`);
}
```

## Testing

### API Tests

- Validate all field ranges
- Test cron expression validation
- Test spoke CRUD operations
- Test API key security (not returned)
- Test path validation
- Test config file persistence

### E2E Tests

- Tab navigation
- Form submission
- Validation messages
- Spoke add/edit/delete
- Unsaved changes warning

## Cross-References

- [API Specification](api.md) - Existing API patterns
- [Web UI](web-ui.md) - Component patterns
- [Daemon](daemon.md) - Config usage
- [Sync Protocol](sync-protocol.md) - Spoke configuration
- [Signals](signals.md) - Embedding configuration
