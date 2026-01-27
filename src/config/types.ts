/**
 * Configuration types for pi-brain
 *
 * Configuration is loaded from ~/.pi-brain/config.yaml
 * All paths support ~ expansion for home directory
 */

/**
 * Spoke sync method options
 */
export type SyncMethod = "syncthing" | "rsync" | "api";

/**
 * Rsync-specific options for spoke configuration
 */
export interface RsyncOptions {
  /** Bandwidth limit in KB/s (0 = unlimited) */
  bwLimit?: number;

  /** Delete files on destination that don't exist on source */
  delete?: boolean;

  /** Additional rsync arguments (e.g., ["--exclude=*.tmp"]) */
  extraArgs?: string[];

  /** Timeout in seconds for rsync operations */
  timeoutSeconds?: number;
}

/**
 * Spoke machine configuration
 * Spokes are secondary machines that sync sessions to the hub
 */
export interface SpokeConfig {
  /** Unique name for this spoke */
  name: string;

  /** How sessions are synced from this spoke */
  syncMethod: SyncMethod;

  /** Local path where synced sessions appear */
  path: string;

  /** For rsync: source path (e.g., user@server:~/.pi/agent/sessions) */
  source?: string;

  /** Whether this spoke is enabled (default: true) */
  enabled: boolean;

  /** For rsync: cron schedule for automatic sync (e.g., "0 *\/15 * * *") */
  schedule?: string;

  /** For rsync: additional rsync options */
  rsyncOptions?: RsyncOptions;
}

/**
 * Hub configuration
 * The hub is the primary computer where daemon runs
 */
export interface HubConfig {
  /** Path to local pi sessions directory */
  sessionsDir: string;

  /** Path to pi-brain data directory (contains brain.db and nodes/) */
  databaseDir: string;

  /** Port for the web UI server */
  webUiPort: number;
}

/**
 * Daemon configuration
 * Controls the background analysis process
 */
export interface DaemonConfig {
  /** Minutes of inactivity before session is considered idle */
  idleTimeoutMinutes: number;

  /** Number of parallel analysis workers */
  parallelWorkers: number;

  /** Maximum retries for failed analysis jobs */
  maxRetries: number;

  /** Base delay between retries in seconds */
  retryDelaySeconds: number;

  /** Cron schedule for nightly reanalysis (e.g., "0 2 * * *") */
  reanalysisSchedule: string;

  /** Cron schedule for connection discovery */
  connectionDiscoverySchedule: string;

  /** Cron schedule for pattern aggregation (optional) */
  patternAggregationSchedule: string;

  /** Cron schedule for facet discovery/clustering (optional) */
  clusteringSchedule: string;

  /** Embedding provider for clustering ('openrouter', 'ollama', 'openai', 'mock') */
  embeddingProvider: "ollama" | "openai" | "openrouter" | "mock";

  /** Embedding model name (e.g., 'qwen/qwen3-embedding-8b') */
  embeddingModel: string;

  /** Embedding API key (required for openrouter/openai) */
  embeddingApiKey?: string;

  /** Embedding API base URL (for custom endpoints) */
  embeddingBaseUrl?: string;

  /** Embedding dimensions (optional, defaults based on model) */
  embeddingDimensions?: number;

  /** Model provider for analysis (e.g., "zai", "anthropic") */
  provider: string;

  /** Model name for analysis (e.g., "glm-4.7") */
  model: string;

  /** Path to session analyzer prompt file */
  promptFile: string;

  /** Maximum concurrent analysis jobs */
  maxConcurrentAnalysis: number;

  /** Timeout for each analysis in minutes */
  analysisTimeoutMinutes: number;

  /** Maximum queue size before rejecting new jobs */
  maxQueueSize: number;
}

/**
 * Query configuration
 * Controls the /brain query interface
 */
export interface QueryConfig {
  /** Model provider for queries */
  provider: string;

  /** Model name for queries */
  model: string;
}

/**
 * API server configuration
 */
export interface ApiConfig {
  /** Port for the API server */
  port: number;

  /** Host to bind to */
  host: string;

  /** CORS allowed origins for development */
  corsOrigins: string[];
}

/**
 * Complete pi-brain configuration
 */
export interface PiBrainConfig {
  /** Hub settings */
  hub: HubConfig;

  /** Spoke machines */
  spokes: SpokeConfig[];

  /** Daemon behavior */
  daemon: DaemonConfig;

  /** Query settings */
  query: QueryConfig;

  /** API server settings */
  api: ApiConfig;
}

/**
 * Raw YAML configuration (snake_case, before transformation)
 * This matches the YAML file structure
 */
export interface RawConfig {
  hub?: {
    sessions_dir?: string;
    database_dir?: string;
    web_ui_port?: number;
  };
  spokes?: {
    name?: string;
    sync_method?: string;
    path?: string;
    source?: string;
    enabled?: boolean;
    schedule?: string;
    rsync_options?: {
      bw_limit?: number;
      delete?: boolean;
      extra_args?: string[];
      timeout_seconds?: number;
    };
  }[];
  daemon?: {
    idle_timeout_minutes?: number;
    parallel_workers?: number;
    max_retries?: number;
    retry_delay_seconds?: number;
    reanalysis_schedule?: string;
    connection_discovery_schedule?: string;
    pattern_aggregation_schedule?: string;
    clustering_schedule?: string;
    embedding_provider?: "ollama" | "openai" | "openrouter" | "mock";
    embedding_model?: string;
    embedding_api_key?: string;
    embedding_base_url?: string;
    embedding_dimensions?: number;
    provider?: string;
    model?: string;
    prompt_file?: string;
    max_concurrent_analysis?: number;
    analysis_timeout_minutes?: number;
    max_queue_size?: number;
  };
  query?: {
    provider?: string;
    model?: string;
  };
  api?: {
    port?: number;
    host?: string;
    cors_origins?: string[];
  };
}
