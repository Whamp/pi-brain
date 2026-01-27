/**
 * Configuration loading and validation for pi-brain
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as yaml from "yaml";

import type {
  PiBrainConfig,
  HubConfig,
  DaemonConfig,
  QueryConfig,
  ApiConfig,
  SpokeConfig,
  RawConfig,
  SyncMethod,
  RsyncOptions,
} from "./types.js";

/**
 * Default configuration directory
 */
export const DEFAULT_CONFIG_DIR = path.join(os.homedir(), ".pi-brain");

/**
 * Default configuration file path
 */
export const DEFAULT_CONFIG_PATH = path.join(DEFAULT_CONFIG_DIR, "config.yaml");

/**
 * Expand ~ in paths to home directory
 */
export function expandPath(p: string): string {
  if (p.startsWith("~/")) {
    return path.join(os.homedir(), p.slice(2));
  }
  if (p === "~") {
    return os.homedir();
  }
  return p;
}

/**
 * Default hub configuration
 */
export function getDefaultHubConfig(): HubConfig {
  return {
    sessionsDir: path.join(os.homedir(), ".pi", "agent", "sessions"),
    databaseDir: path.join(os.homedir(), ".pi-brain", "data"),
    webUiPort: 8765,
  };
}

/**
 * Default daemon configuration
 */
export function getDefaultDaemonConfig(): DaemonConfig {
  return {
    idleTimeoutMinutes: 10,
    parallelWorkers: 1,
    maxRetries: 3,
    retryDelaySeconds: 60,
    reanalysisSchedule: "0 2 * * *",
    connectionDiscoverySchedule: "0 3 * * *",
    patternAggregationSchedule: "0 3 * * *",
    clusteringSchedule: "0 4 * * *",
    reanalysisLimit: 100,
    connectionDiscoveryLimit: 100,
    connectionDiscoveryLookbackDays: 7,
    connectionDiscoveryCooldownHours: 24,
    embeddingProvider: "openrouter" as const,
    embeddingModel: "qwen/qwen3-embedding-8b",
    embeddingApiKey: undefined,
    embeddingBaseUrl: undefined,
    embeddingDimensions: undefined,
    provider: "zai",
    model: "glm-4.7",
    promptFile: path.join(
      os.homedir(),
      ".pi-brain",
      "prompts",
      "session-analyzer.md"
    ),
    maxConcurrentAnalysis: 1,
    analysisTimeoutMinutes: 30,
    maxQueueSize: 1000,
  };
}

/**
 * Default query configuration
 */
export function getDefaultQueryConfig(): QueryConfig {
  return {
    provider: "zai",
    model: "glm-4.7",
  };
}

/**
 * Default API configuration
 */
export function getDefaultApiConfig(): ApiConfig {
  return {
    port: 8765,
    host: "127.0.0.1",
    corsOrigins: [
      "http://localhost:5173",
      "http://localhost:3000",
      "http://127.0.0.1:5173",
    ],
  };
}

/**
 * Get complete default configuration
 */
export function getDefaultConfig(): PiBrainConfig {
  return {
    hub: getDefaultHubConfig(),
    spokes: [],
    daemon: getDefaultDaemonConfig(),
    query: getDefaultQueryConfig(),
    api: getDefaultApiConfig(),
  };
}

/**
 * Validate sync method
 */
function validateSyncMethod(method: string, spokeName: string): SyncMethod {
  const validMethods: SyncMethod[] = ["syncthing", "rsync", "api"];
  if (!validMethods.includes(method as SyncMethod)) {
    throw new Error(
      `Invalid sync_method: ${method}. Must be one of: ${validMethods.join(", ")}`
    );
  }

  // Warn about unimplemented api method
  if (method === "api") {
    throw new Error(
      `Spoke "${spokeName}" uses sync_method "api" which is not yet implemented. ` +
        `Use "syncthing" or "rsync" instead.`
    );
  }

  return method as SyncMethod;
}

/**
 * Validate spoke configuration
 */
function validateSpoke(raw: RawConfig["spokes"], index: number): SpokeConfig {
  const spoke = raw?.[index];
  if (!spoke) {
    throw new Error(`Spoke at index ${index} is undefined`);
  }

  if (!spoke.name) {
    throw new Error(`Spoke at index ${index} missing required field: name`);
  }
  if (!spoke.sync_method) {
    throw new Error(
      `Spoke "${spoke.name}" missing required field: sync_method`
    );
  }
  if (!spoke.path) {
    throw new Error(`Spoke "${spoke.name}" missing required field: path`);
  }

  const syncMethod = validateSyncMethod(spoke.sync_method, spoke.name);

  // rsync requires source
  if (syncMethod === "rsync" && !spoke.source) {
    throw new Error(
      `Spoke "${spoke.name}" with rsync sync_method requires source field`
    );
  }

  // Validate schedule if provided (only valid for rsync)
  if (spoke.schedule) {
    if (syncMethod !== "rsync") {
      throw new Error(
        `Spoke "${spoke.name}" has schedule but sync_method is not rsync`
      );
    }
    validateCronSchedule(spoke.schedule, `spokes[${index}].schedule`);
  }

  // Transform rsync_options if provided
  let rsyncOptions: RsyncOptions | undefined;
  if (spoke.rsync_options) {
    if (syncMethod !== "rsync") {
      throw new Error(
        `Spoke "${spoke.name}" has rsync_options but sync_method is not rsync`
      );
    }

    rsyncOptions = {};

    if (spoke.rsync_options.bw_limit !== undefined) {
      if (
        !Number.isInteger(spoke.rsync_options.bw_limit) ||
        spoke.rsync_options.bw_limit < 0
      ) {
        throw new Error(
          `Spoke "${spoke.name}" has invalid rsync_options.bw_limit: must be a non-negative integer`
        );
      }
      rsyncOptions.bwLimit = spoke.rsync_options.bw_limit;
    }

    if (spoke.rsync_options.delete !== undefined) {
      rsyncOptions.delete = spoke.rsync_options.delete;
    }

    if (spoke.rsync_options.extra_args !== undefined) {
      if (!Array.isArray(spoke.rsync_options.extra_args)) {
        throw new TypeError(
          `Spoke "${spoke.name}" has invalid rsync_options.extra_args: must be an array`
        );
      }
      if (
        !spoke.rsync_options.extra_args.every((arg) => typeof arg === "string")
      ) {
        throw new TypeError(
          `Spoke "${spoke.name}" has invalid rsync_options.extra_args: all elements must be strings`
        );
      }
      // Reject dangerous rsync options that could execute arbitrary commands
      const dangerousOptions = ["--rsh", "-e"];
      for (const arg of spoke.rsync_options.extra_args) {
        for (const dangerous of dangerousOptions) {
          if (arg === dangerous || arg.startsWith(`${dangerous}=`)) {
            throw new Error(
              `Spoke "${spoke.name}" has disallowed rsync option "${arg}" in extra_args (security risk)`
            );
          }
        }
      }
      rsyncOptions.extraArgs = spoke.rsync_options.extra_args;
    }

    if (spoke.rsync_options.timeout_seconds !== undefined) {
      if (
        !Number.isInteger(spoke.rsync_options.timeout_seconds) ||
        spoke.rsync_options.timeout_seconds < 1
      ) {
        throw new Error(
          `Spoke "${spoke.name}" has invalid rsync_options.timeout_seconds: must be a positive integer`
        );
      }
      rsyncOptions.timeoutSeconds = spoke.rsync_options.timeout_seconds;
    }
  }

  return {
    name: spoke.name,
    syncMethod,
    path: expandPath(spoke.path),
    source: spoke.source,
    enabled: spoke.enabled ?? true,
    schedule: spoke.schedule,
    rsyncOptions,
  };
}

/**
 * Validate cron schedule format (basic validation)
 */
function validateCronSchedule(schedule: string, field: string): void {
  // Basic validation: should have 5 space-separated parts
  const parts = schedule.trim().split(/\s+/);
  if (parts.length !== 5) {
    throw new Error(
      `Invalid cron schedule for ${field}: "${schedule}". Expected 5 fields (minute hour day month weekday).`
    );
  }
}

/**
 * Validate port number
 */
function validatePort(port: number, field: string): void {
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(
      `Invalid port for ${field}: ${port}. Must be an integer between 1 and 65535.`
    );
  }
}

/**
 * Validate positive integer
 */
function validatePositiveInt(value: number, field: string): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(
      `Invalid value for ${field}: ${value}. Must be a positive integer.`
    );
  }
}

/**
 * Validate non-negative integer
 */
function validateNonNegativeInt(value: number, field: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(
      `Invalid value for ${field}: ${value}. Must be a non-negative integer.`
    );
  }
}

/**
 * Transform raw YAML config to typed config with validation
 */
export function transformConfig(raw: RawConfig): PiBrainConfig {
  const defaults = getDefaultConfig();

  // Transform hub config
  const hub: HubConfig = {
    sessionsDir: raw.hub?.sessions_dir
      ? expandPath(raw.hub.sessions_dir)
      : defaults.hub.sessionsDir,
    databaseDir: raw.hub?.database_dir
      ? expandPath(raw.hub.database_dir)
      : defaults.hub.databaseDir,
    webUiPort: raw.hub?.web_ui_port ?? defaults.hub.webUiPort,
  };

  validatePort(hub.webUiPort, "hub.web_ui_port");

  // Transform spokes
  const spokes: SpokeConfig[] = [];
  if (raw.spokes && Array.isArray(raw.spokes)) {
    for (let i = 0; i < raw.spokes.length; i++) {
      spokes.push(validateSpoke(raw.spokes, i));
    }
  }

  // Check for duplicate spoke names
  const spokeNames = new Set<string>();
  for (const spoke of spokes) {
    if (spokeNames.has(spoke.name)) {
      throw new Error(`Duplicate spoke name: ${spoke.name}`);
    }
    spokeNames.add(spoke.name);
  }

  // Transform daemon config
  const daemon: DaemonConfig = {
    idleTimeoutMinutes:
      raw.daemon?.idle_timeout_minutes ?? defaults.daemon.idleTimeoutMinutes,
    parallelWorkers:
      raw.daemon?.parallel_workers ?? defaults.daemon.parallelWorkers,
    maxRetries: raw.daemon?.max_retries ?? defaults.daemon.maxRetries,
    retryDelaySeconds:
      raw.daemon?.retry_delay_seconds ?? defaults.daemon.retryDelaySeconds,
    reanalysisSchedule:
      raw.daemon?.reanalysis_schedule ?? defaults.daemon.reanalysisSchedule,
    connectionDiscoverySchedule:
      raw.daemon?.connection_discovery_schedule ??
      defaults.daemon.connectionDiscoverySchedule,
    patternAggregationSchedule:
      raw.daemon?.pattern_aggregation_schedule ??
      defaults.daemon.patternAggregationSchedule,
    clusteringSchedule:
      raw.daemon?.clustering_schedule ?? defaults.daemon.clusteringSchedule,
    reanalysisLimit:
      raw.daemon?.reanalysis_limit ?? defaults.daemon.reanalysisLimit,
    connectionDiscoveryLimit:
      raw.daemon?.connection_discovery_limit ??
      defaults.daemon.connectionDiscoveryLimit,
    connectionDiscoveryLookbackDays:
      raw.daemon?.connection_discovery_lookback_days ??
      defaults.daemon.connectionDiscoveryLookbackDays,
    connectionDiscoveryCooldownHours:
      raw.daemon?.connection_discovery_cooldown_hours ??
      defaults.daemon.connectionDiscoveryCooldownHours,
    embeddingProvider:
      raw.daemon?.embedding_provider ?? defaults.daemon.embeddingProvider,
    embeddingModel:
      raw.daemon?.embedding_model ?? defaults.daemon.embeddingModel,
    embeddingApiKey: raw.daemon?.embedding_api_key,
    embeddingBaseUrl: raw.daemon?.embedding_base_url,
    embeddingDimensions: raw.daemon?.embedding_dimensions,
    provider: raw.daemon?.provider ?? defaults.daemon.provider,
    model: raw.daemon?.model ?? defaults.daemon.model,
    promptFile: raw.daemon?.prompt_file
      ? expandPath(raw.daemon.prompt_file)
      : defaults.daemon.promptFile,
    maxConcurrentAnalysis:
      raw.daemon?.max_concurrent_analysis ??
      defaults.daemon.maxConcurrentAnalysis,
    analysisTimeoutMinutes:
      raw.daemon?.analysis_timeout_minutes ??
      defaults.daemon.analysisTimeoutMinutes,
    maxQueueSize: raw.daemon?.max_queue_size ?? defaults.daemon.maxQueueSize,
  };

  // Validate daemon config
  validatePositiveInt(daemon.idleTimeoutMinutes, "daemon.idle_timeout_minutes");
  validatePositiveInt(daemon.parallelWorkers, "daemon.parallel_workers");
  validateNonNegativeInt(daemon.maxRetries, "daemon.max_retries");
  validateNonNegativeInt(
    daemon.retryDelaySeconds,
    "daemon.retry_delay_seconds"
  );
  validateCronSchedule(daemon.reanalysisSchedule, "daemon.reanalysis_schedule");
  validateCronSchedule(
    daemon.connectionDiscoverySchedule,
    "daemon.connection_discovery_schedule"
  );
  if (daemon.patternAggregationSchedule) {
    validateCronSchedule(
      daemon.patternAggregationSchedule,
      "daemon.pattern_aggregation_schedule"
    );
  }
  if (daemon.clusteringSchedule) {
    validateCronSchedule(
      daemon.clusteringSchedule,
      "daemon.clustering_schedule"
    );
  }
  validatePositiveInt(
    daemon.maxConcurrentAnalysis,
    "daemon.max_concurrent_analysis"
  );
  validatePositiveInt(
    daemon.analysisTimeoutMinutes,
    "daemon.analysis_timeout_minutes"
  );
  validatePositiveInt(daemon.maxQueueSize, "daemon.max_queue_size");
  validatePositiveInt(daemon.reanalysisLimit, "daemon.reanalysis_limit");
  validatePositiveInt(
    daemon.connectionDiscoveryLimit,
    "daemon.connection_discovery_limit"
  );
  validatePositiveInt(
    daemon.connectionDiscoveryLookbackDays,
    "daemon.connection_discovery_lookback_days"
  );
  validatePositiveInt(
    daemon.connectionDiscoveryCooldownHours,
    "daemon.connection_discovery_cooldown_hours"
  );

  // Transform query config
  const query: QueryConfig = {
    provider: raw.query?.provider ?? defaults.query.provider,
    model: raw.query?.model ?? defaults.query.model,
  };

  // Transform API config
  const api: ApiConfig = {
    port: raw.api?.port ?? defaults.api.port,
    host: raw.api?.host ?? defaults.api.host,
    corsOrigins: raw.api?.cors_origins ?? defaults.api.corsOrigins,
  };

  validatePort(api.port, "api.port");

  return { hub, spokes, daemon, query, api };
}

/**
 * Configuration loading errors
 */
export class ConfigError extends Error {
  constructor(
    message: string,
    public readonly configPath?: string
  ) {
    super(message);
    this.name = "ConfigError";
  }
}

/**
 * Load configuration from a YAML file
 */
export function loadConfig(configPath?: string): PiBrainConfig {
  const filePath = configPath ?? DEFAULT_CONFIG_PATH;

  // If no config file exists, return defaults
  if (!fs.existsSync(filePath)) {
    return getDefaultConfig();
  }

  let content: string;
  try {
    content = fs.readFileSync(filePath, "utf8");
  } catch (error) {
    throw new ConfigError(
      `Failed to read config file: ${(error as Error).message}`,
      filePath
    );
  }

  // Empty file returns defaults
  if (!content.trim()) {
    return getDefaultConfig();
  }

  let raw: RawConfig;
  try {
    raw = yaml.parse(content) as RawConfig;
  } catch (error) {
    throw new ConfigError(
      `Failed to parse YAML: ${(error as Error).message}`,
      filePath
    );
  }

  // null/undefined from YAML parse returns defaults
  if (raw === null || raw === undefined) {
    return getDefaultConfig();
  }

  try {
    return transformConfig(raw);
  } catch (error) {
    throw new ConfigError(
      `Invalid configuration: ${(error as Error).message}`,
      filePath
    );
  }
}

/**
 * Ensure the config directory exists
 */
export function ensureConfigDir(configDir?: string): void {
  const dir = configDir ?? DEFAULT_CONFIG_DIR;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Ensure all required directories exist based on configuration
 */
export function ensureDirectories(config: PiBrainConfig): void {
  // Ensure database directory
  if (!fs.existsSync(config.hub.databaseDir)) {
    fs.mkdirSync(config.hub.databaseDir, { recursive: true });
  }

  // Ensure nodes subdirectory
  const nodesDir = path.join(config.hub.databaseDir, "nodes");
  if (!fs.existsSync(nodesDir)) {
    fs.mkdirSync(nodesDir, { recursive: true });
  }

  // Ensure prompts directory
  const promptsDir = path.dirname(config.daemon.promptFile);
  if (!fs.existsSync(promptsDir)) {
    fs.mkdirSync(promptsDir, { recursive: true });
  }

  // Ensure prompts history subdirectory
  const historyDir = path.join(promptsDir, "history");
  if (!fs.existsSync(historyDir)) {
    fs.mkdirSync(historyDir, { recursive: true });
  }

  // Ensure logs directory
  const logsDir = path.join(DEFAULT_CONFIG_DIR, "logs");
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  // Ensure analysis logs subdirectory
  const analysisLogsDir = path.join(logsDir, "analysis");
  if (!fs.existsSync(analysisLogsDir)) {
    fs.mkdirSync(analysisLogsDir, { recursive: true });
  }
}

/**
 * Write a default configuration file
 */
export function writeDefaultConfig(configPath?: string): void {
  const filePath = configPath ?? DEFAULT_CONFIG_PATH;

  ensureConfigDir(path.dirname(filePath));

  const defaultYaml = `# pi-brain configuration
# See: https://github.com/willclarktech/pi-brain

# Hub settings (where daemon runs)
hub:
  sessions_dir: ~/.pi/agent/sessions
  database_dir: ~/.pi-brain/data
  web_ui_port: 8765

# Spoke machines that sync sessions (leave empty for single-computer use)
spokes: []
  # - name: laptop
  #   sync_method: syncthing  # syncthing, rsync, or api
  #   path: ~/.pi-brain/synced/laptop
  #   enabled: true  # optional, defaults to true
  #
  # - name: server
  #   sync_method: rsync
  #   source: user@server:~/.pi/agent/sessions
  #   path: ~/.pi-brain/synced/server
  #   enabled: true
  #   schedule: "*/15 * * * *"  # optional: sync every 15 minutes
  #   rsync_options:            # optional rsync settings
  #     bw_limit: 1000          # KB/s bandwidth limit
  #     delete: false           # delete files not on source
  #     timeout_seconds: 300    # timeout for rsync operations

# Daemon behavior
daemon:
  idle_timeout_minutes: 10
  parallel_workers: 1
  max_retries: 3
  reanalysis_schedule: "0 2 * * *"  # 2am nightly
  connection_discovery_schedule: "0 3 * * *"  # 3am nightly
  pattern_aggregation_schedule: "0 3 * * *"   # 3am nightly
  clustering_schedule: "0 4 * * *"            # 4am nightly
  embedding_provider: openrouter             # or: ollama, openai
  embedding_model: qwen/qwen3-embedding-8b   # for semantic clustering
  # embedding_api_key: sk-or-v1-...          # required for openrouter/openai
  # embedding_base_url: https://...          # optional, for custom endpoints
  provider: zai
  model: glm-4.7
  prompt_file: ~/.pi-brain/prompts/session-analyzer.md

# Query settings (for /brain command)
query:
  provider: zai
  model: glm-4.7
`;

  fs.writeFileSync(filePath, defaultYaml, "utf8");
}

/**
 * Get all session directories to watch (hub + enabled spokes)
 */
export function getSessionDirs(config: PiBrainConfig): string[] {
  const dirs = [config.hub.sessionsDir];
  for (const spoke of config.spokes) {
    if (spoke.enabled) {
      dirs.push(spoke.path);
    }
  }
  return dirs;
}

/**
 * Get enabled spokes from configuration
 */
export function getEnabledSpokes(config: PiBrainConfig): SpokeConfig[] {
  return config.spokes.filter((spoke) => spoke.enabled);
}

/**
 * Get rsync spokes (enabled spokes with rsync sync method)
 */
export function getRsyncSpokes(config: PiBrainConfig): SpokeConfig[] {
  return config.spokes.filter(
    (spoke) => spoke.enabled && spoke.syncMethod === "rsync"
  );
}

/**
 * Get scheduled rsync spokes (rsync spokes with a schedule)
 */
export function getScheduledRsyncSpokes(config: PiBrainConfig): SpokeConfig[] {
  return config.spokes.filter(
    (spoke) =>
      spoke.enabled &&
      spoke.syncMethod === "rsync" &&
      spoke.schedule !== undefined
  );
}

/**
 * Get the computer name for a session based on its path.
 *
 * For sessions from spoke directories, returns the spoke name.
 * For local sessions (hub), returns the local hostname.
 *
 * Uses proper path boundary checking to avoid false matches
 * (e.g., `/synced/laptop` should not match `/synced/laptop-backup/...`)
 */
export function getComputerFromPath(
  sessionPath: string,
  config: PiBrainConfig
): string {
  // Normalize session path separators to current platform
  const normalizedSessionPath = sessionPath.replaceAll(/[/\\]+/g, path.sep);

  // Check if the session is in any spoke directory
  for (const spoke of config.spokes) {
    if (!spoke.enabled) {
      continue;
    }

    // Normalize spoke path: convert separators and remove trailing slashes
    const normalizedSpokePath = spoke.path
      .replaceAll(/[/\\]+/g, path.sep)
      .replace(/[/\\]+$/, "");

    // Check for exact match or match with path separator
    if (
      normalizedSessionPath === normalizedSpokePath ||
      normalizedSessionPath.startsWith(normalizedSpokePath + path.sep)
    ) {
      return spoke.name;
    }
  }

  // Not in any spoke directory - it's a local session
  return os.hostname();
}
