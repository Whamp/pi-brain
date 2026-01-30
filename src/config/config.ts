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
    backfillEmbeddingsSchedule: "0 5 * * *",
    backfillLimit: 100,
    reanalysisLimit: 100,
    connectionDiscoveryLimit: 100,
    connectionDiscoveryLookbackDays: 7,
    connectionDiscoveryCooldownHours: 24,
    semanticSearchThreshold: 0.5,
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
    decaySchedule: "0 3 * * *", // 3am daily
    creativeSchedule: "0 4 * * 0", // 4am Sunday
    baseDecayRate: 0.1,
    creativeSimilarityThreshold: 0.75,
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
 * Validate spoke schedule configuration
 */
function validateSpokeSchedule(
  spokeName: string,
  syncMethod: SyncMethod,
  schedule: string,
  index: number
): void {
  if (syncMethod !== "rsync") {
    throw new Error(
      `Spoke "${spokeName}" has schedule but sync_method is not rsync`
    );
  }
  validateCronSchedule(schedule, `spokes[${index}].schedule`);
}

/**
 * Dangerous rsync options that could execute arbitrary commands
 */
const DANGEROUS_RSYNC_OPTIONS = ["--rsh", "-e"];

/**
 * Check if an rsync arg is dangerous
 */
function isDangerousRsyncArg(arg: string): boolean {
  return DANGEROUS_RSYNC_OPTIONS.some(
    (dangerous) => arg === dangerous || arg.startsWith(`${dangerous}=`)
  );
}

/**
 * Validate rsync extra_args field
 */
function validateRsyncExtraArgs(
  spokeName: string,
  extraArgs: unknown
): string[] {
  if (!Array.isArray(extraArgs)) {
    throw new TypeError(
      `Spoke "${spokeName}" has invalid rsync_options.extra_args: must be an array`
    );
  }
  if (!extraArgs.every((arg) => typeof arg === "string")) {
    throw new TypeError(
      `Spoke "${spokeName}" has invalid rsync_options.extra_args: all elements must be strings`
    );
  }
  for (const arg of extraArgs) {
    if (isDangerousRsyncArg(arg)) {
      throw new Error(
        `Spoke "${spokeName}" has disallowed rsync option "${arg}" in extra_args (security risk)`
      );
    }
  }
  return extraArgs;
}

/**
 * Validate rsync options configuration
 */
/**
 * Validate and transform bw_limit
 */
function transformBwLimit(
  spokeName: string,
  bwLimit: number | undefined
): number | undefined {
  if (bwLimit === undefined) {
    return undefined;
  }
  if (!Number.isInteger(bwLimit) || bwLimit < 0) {
    throw new Error(
      `Spoke "${spokeName}" has invalid rsync_options.bw_limit: must be a non-negative integer`
    );
  }
  return bwLimit;
}

/**
 * Validate and transform timeout_seconds
 */
function transformTimeoutSeconds(
  spokeName: string,
  timeoutSeconds: number | undefined
): number | undefined {
  if (timeoutSeconds === undefined) {
    return undefined;
  }
  if (!Number.isInteger(timeoutSeconds) || timeoutSeconds < 1) {
    throw new Error(
      `Spoke "${spokeName}" has invalid rsync_options.timeout_seconds: must be a positive integer`
    );
  }
  return timeoutSeconds;
}

function validateRsyncOptions(
  spokeName: string,
  syncMethod: SyncMethod,
  rawOptions: NonNullable<RawConfig["spokes"]>[number]["rsync_options"]
): RsyncOptions | undefined {
  if (!rawOptions) {
    return undefined;
  }

  if (syncMethod !== "rsync") {
    throw new Error(
      `Spoke "${spokeName}" has rsync_options but sync_method is not rsync`
    );
  }

  const bwLimit = transformBwLimit(spokeName, rawOptions.bw_limit);
  const timeoutSeconds = transformTimeoutSeconds(
    spokeName,
    rawOptions.timeout_seconds
  );
  const extraArgs =
    rawOptions.extra_args === undefined
      ? undefined
      : validateRsyncExtraArgs(spokeName, rawOptions.extra_args);

  const rsyncOptions: RsyncOptions = {};
  if (bwLimit !== undefined) {
    rsyncOptions.bwLimit = bwLimit;
  }
  if (rawOptions.delete !== undefined) {
    rsyncOptions.delete = rawOptions.delete;
  }
  if (extraArgs !== undefined) {
    rsyncOptions.extraArgs = extraArgs;
  }
  if (timeoutSeconds !== undefined) {
    rsyncOptions.timeoutSeconds = timeoutSeconds;
  }

  return rsyncOptions;
}

/**
 * Validate spoke configuration
 */
function validateSpoke(
  raw: NonNullable<RawConfig["spokes"]>,
  index: number
): SpokeConfig {
  const spoke = raw[index];
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

  // Validate schedule if provided
  if (spoke.schedule) {
    validateSpokeSchedule(spoke.name, syncMethod, spoke.schedule, index);
  }

  // Transform rsync_options if provided
  const rsyncOptions = validateRsyncOptions(
    spoke.name,
    syncMethod,
    spoke.rsync_options
  );

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
 * Transform hub configuration from raw config
 */
function transformHubConfig(
  raw: RawConfig,
  defaults: PiBrainConfig
): HubConfig {
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

  return hub;
}

/**
 * Transform daemon primary scheduling configuration
 */
function transformDaemonPrimarySchedules(
  rawDaemon: RawConfig["daemon"],
  defaultDaemon: DaemonConfig
): Pick<
  DaemonConfig,
  | "reanalysisSchedule"
  | "connectionDiscoverySchedule"
  | "patternAggregationSchedule"
> {
  return {
    reanalysisSchedule:
      rawDaemon?.reanalysis_schedule ?? defaultDaemon.reanalysisSchedule,
    connectionDiscoverySchedule:
      rawDaemon?.connection_discovery_schedule ??
      defaultDaemon.connectionDiscoverySchedule,
    patternAggregationSchedule:
      rawDaemon?.pattern_aggregation_schedule ??
      defaultDaemon.patternAggregationSchedule,
  };
}

/**
 * Transform daemon secondary scheduling configuration
 */
function transformDaemonSecondarySchedules(
  rawDaemon: RawConfig["daemon"],
  defaultDaemon: DaemonConfig
): Pick<DaemonConfig, "clusteringSchedule" | "backfillEmbeddingsSchedule"> {
  return {
    clusteringSchedule:
      rawDaemon?.clustering_schedule ?? defaultDaemon.clusteringSchedule,
    backfillEmbeddingsSchedule:
      rawDaemon?.backfill_embeddings_schedule ??
      defaultDaemon.backfillEmbeddingsSchedule,
  };
}

/**
 * Transform daemon scheduling configuration from raw config
 */
function transformDaemonSchedules(
  rawDaemon: RawConfig["daemon"],
  defaultDaemon: DaemonConfig
): Pick<
  DaemonConfig,
  | "reanalysisSchedule"
  | "connectionDiscoverySchedule"
  | "patternAggregationSchedule"
  | "clusteringSchedule"
  | "backfillEmbeddingsSchedule"
> {
  return {
    ...transformDaemonPrimarySchedules(rawDaemon, defaultDaemon),
    ...transformDaemonSecondarySchedules(rawDaemon, defaultDaemon),
  };
}

/**
 * Transform daemon primary limits from raw config
 */
function transformDaemonPrimaryLimits(
  rawDaemon: RawConfig["daemon"],
  defaultDaemon: DaemonConfig
): Pick<
  DaemonConfig,
  "backfillLimit" | "reanalysisLimit" | "connectionDiscoveryLimit"
> {
  return {
    backfillLimit: rawDaemon?.backfill_limit ?? defaultDaemon.backfillLimit,
    reanalysisLimit:
      rawDaemon?.reanalysis_limit ?? defaultDaemon.reanalysisLimit,
    connectionDiscoveryLimit:
      rawDaemon?.connection_discovery_limit ??
      defaultDaemon.connectionDiscoveryLimit,
  };
}

/**
 * Transform daemon secondary limits from raw config
 */
function transformDaemonSecondaryLimits(
  rawDaemon: RawConfig["daemon"],
  defaultDaemon: DaemonConfig
): Pick<
  DaemonConfig,
  | "connectionDiscoveryLookbackDays"
  | "connectionDiscoveryCooldownHours"
  | "semanticSearchThreshold"
> {
  return {
    connectionDiscoveryLookbackDays:
      rawDaemon?.connection_discovery_lookback_days ??
      defaultDaemon.connectionDiscoveryLookbackDays,
    connectionDiscoveryCooldownHours:
      rawDaemon?.connection_discovery_cooldown_hours ??
      defaultDaemon.connectionDiscoveryCooldownHours,
    semanticSearchThreshold:
      rawDaemon?.semantic_search_threshold ??
      defaultDaemon.semanticSearchThreshold,
  };
}

/**
 * Transform daemon limits and thresholds from raw config
 */
function transformDaemonLimits(
  rawDaemon: RawConfig["daemon"],
  defaultDaemon: DaemonConfig
): Pick<
  DaemonConfig,
  | "backfillLimit"
  | "reanalysisLimit"
  | "connectionDiscoveryLimit"
  | "connectionDiscoveryLookbackDays"
  | "connectionDiscoveryCooldownHours"
  | "semanticSearchThreshold"
> {
  return {
    ...transformDaemonPrimaryLimits(rawDaemon, defaultDaemon),
    ...transformDaemonSecondaryLimits(rawDaemon, defaultDaemon),
  };
}

/**
 * Transform daemon embedding configuration from raw config
 */
function transformDaemonEmbeddings(
  rawDaemon: RawConfig["daemon"],
  defaultDaemon: DaemonConfig
): Pick<
  DaemonConfig,
  | "embeddingProvider"
  | "embeddingModel"
  | "embeddingApiKey"
  | "embeddingBaseUrl"
  | "embeddingDimensions"
> {
  return {
    embeddingProvider:
      rawDaemon?.embedding_provider ?? defaultDaemon.embeddingProvider,
    embeddingModel: rawDaemon?.embedding_model ?? defaultDaemon.embeddingModel,
    embeddingApiKey: rawDaemon?.embedding_api_key,
    embeddingBaseUrl: rawDaemon?.embedding_base_url,
    embeddingDimensions: rawDaemon?.embedding_dimensions,
  };
}

/**
 * Transform daemon timing settings from raw config
 */
function transformDaemonTiming(
  rawDaemon: RawConfig["daemon"],
  defaultDaemon: DaemonConfig
): Pick<
  DaemonConfig,
  "idleTimeoutMinutes" | "parallelWorkers" | "maxRetries" | "retryDelaySeconds"
> {
  return {
    idleTimeoutMinutes:
      rawDaemon?.idle_timeout_minutes ?? defaultDaemon.idleTimeoutMinutes,
    parallelWorkers:
      rawDaemon?.parallel_workers ?? defaultDaemon.parallelWorkers,
    maxRetries: rawDaemon?.max_retries ?? defaultDaemon.maxRetries,
    retryDelaySeconds:
      rawDaemon?.retry_delay_seconds ?? defaultDaemon.retryDelaySeconds,
  };
}

/**
 * Transform daemon provider settings from raw config
 */
function transformDaemonProvider(
  rawDaemon: RawConfig["daemon"],
  defaultDaemon: DaemonConfig
): Pick<DaemonConfig, "provider" | "model" | "promptFile"> {
  return {
    provider: rawDaemon?.provider ?? defaultDaemon.provider,
    model: rawDaemon?.model ?? defaultDaemon.model,
    promptFile: rawDaemon?.prompt_file
      ? expandPath(rawDaemon.prompt_file)
      : defaultDaemon.promptFile,
  };
}

/**
 * Transform daemon core settings from raw config
 */
function transformDaemonCore(
  rawDaemon: RawConfig["daemon"],
  defaultDaemon: DaemonConfig
): Pick<
  DaemonConfig,
  | "idleTimeoutMinutes"
  | "parallelWorkers"
  | "maxRetries"
  | "retryDelaySeconds"
  | "provider"
  | "model"
  | "promptFile"
> {
  return {
    ...transformDaemonTiming(rawDaemon, defaultDaemon),
    ...transformDaemonProvider(rawDaemon, defaultDaemon),
  };
}

/**
 * Transform daemon queue settings from raw config
 */
function transformDaemonQueue(
  rawDaemon: RawConfig["daemon"],
  defaultDaemon: DaemonConfig
): Pick<
  DaemonConfig,
  "maxConcurrentAnalysis" | "analysisTimeoutMinutes" | "maxQueueSize"
> {
  return {
    maxConcurrentAnalysis:
      rawDaemon?.max_concurrent_analysis ?? defaultDaemon.maxConcurrentAnalysis,
    analysisTimeoutMinutes:
      rawDaemon?.analysis_timeout_minutes ??
      defaultDaemon.analysisTimeoutMinutes,
    maxQueueSize: rawDaemon?.max_queue_size ?? defaultDaemon.maxQueueSize,
  };
}

/**
 * Transform daemon decay settings from raw config
 */
function transformDaemonDecay(
  rawDaemon: RawConfig["daemon"],
  defaultDaemon: DaemonConfig
): Pick<
  DaemonConfig,
  | "decaySchedule"
  | "creativeSchedule"
  | "baseDecayRate"
  | "creativeSimilarityThreshold"
> {
  return {
    decaySchedule: rawDaemon?.decay_schedule ?? defaultDaemon.decaySchedule,
    creativeSchedule:
      rawDaemon?.creative_schedule ?? defaultDaemon.creativeSchedule,
    baseDecayRate: rawDaemon?.base_decay_rate ?? defaultDaemon.baseDecayRate,
    creativeSimilarityThreshold:
      rawDaemon?.creative_similarity_threshold ??
      defaultDaemon.creativeSimilarityThreshold,
  };
}

/**
 * Transform daemon analysis settings from raw config
 */
function transformDaemonAnalysis(
  rawDaemon: RawConfig["daemon"],
  defaultDaemon: DaemonConfig
): Pick<
  DaemonConfig,
  | "maxConcurrentAnalysis"
  | "analysisTimeoutMinutes"
  | "maxQueueSize"
  | "decaySchedule"
  | "creativeSchedule"
  | "baseDecayRate"
  | "creativeSimilarityThreshold"
> {
  return {
    ...transformDaemonQueue(rawDaemon, defaultDaemon),
    ...transformDaemonDecay(rawDaemon, defaultDaemon),
  };
}

/**
 * Transform daemon configuration from raw config
 */
function transformDaemonConfig(
  raw: RawConfig,
  defaults: PiBrainConfig
): DaemonConfig {
  const rawDaemon = raw.daemon;
  const defaultDaemon = defaults.daemon;

  return {
    ...transformDaemonCore(rawDaemon, defaultDaemon),
    ...transformDaemonSchedules(rawDaemon, defaultDaemon),
    ...transformDaemonLimits(rawDaemon, defaultDaemon),
    ...transformDaemonEmbeddings(rawDaemon, defaultDaemon),
    ...transformDaemonAnalysis(rawDaemon, defaultDaemon),
  };
}

/**
 * Validate a ratio value (0.0 to 1.0)
 */
function validateRatio(value: number, field: string): void {
  if (value < 0 || value > 1) {
    throw new Error(
      `Invalid value for ${field}: ${value}. Must be between 0.0 and 1.0.`
    );
  }
}

/**
 * Validate optional cron schedule
 */
function validateOptionalCronSchedule(
  schedule: string | undefined,
  field: string
): void {
  if (schedule) {
    validateCronSchedule(schedule, field);
  }
}

/**
 * Validate daemon core integers
 */
function validateDaemonCoreInts(daemon: DaemonConfig): void {
  validatePositiveInt(daemon.idleTimeoutMinutes, "daemon.idle_timeout_minutes");
  validatePositiveInt(daemon.parallelWorkers, "daemon.parallel_workers");
  validateNonNegativeInt(daemon.maxRetries, "daemon.max_retries");
  validateNonNegativeInt(
    daemon.retryDelaySeconds,
    "daemon.retry_delay_seconds"
  );
}

/**
 * Validate daemon schedules
 */
function validateDaemonSchedules(daemon: DaemonConfig): void {
  validateCronSchedule(daemon.reanalysisSchedule, "daemon.reanalysis_schedule");
  validateCronSchedule(
    daemon.connectionDiscoverySchedule,
    "daemon.connection_discovery_schedule"
  );
  validateOptionalCronSchedule(
    daemon.patternAggregationSchedule,
    "daemon.pattern_aggregation_schedule"
  );
  validateOptionalCronSchedule(
    daemon.clusteringSchedule,
    "daemon.clustering_schedule"
  );
  validateOptionalCronSchedule(
    daemon.backfillEmbeddingsSchedule,
    "daemon.backfill_embeddings_schedule"
  );
  validateCronSchedule(daemon.decaySchedule, "daemon.decay_schedule");
  validateCronSchedule(daemon.creativeSchedule, "daemon.creative_schedule");
}

/**
 * Validate daemon limits
 */
function validateDaemonLimits(daemon: DaemonConfig): void {
  validatePositiveInt(
    daemon.maxConcurrentAnalysis,
    "daemon.max_concurrent_analysis"
  );
  validatePositiveInt(
    daemon.analysisTimeoutMinutes,
    "daemon.analysis_timeout_minutes"
  );
  validatePositiveInt(daemon.maxQueueSize, "daemon.max_queue_size");
  validatePositiveInt(daemon.backfillLimit, "daemon.backfill_limit");
  validatePositiveInt(daemon.reanalysisLimit, "daemon.reanalysis_limit");
  validatePositiveInt(
    daemon.connectionDiscoveryLimit,
    "daemon.connection_discovery_limit"
  );
  validatePositiveInt(
    daemon.connectionDiscoveryLookbackDays,
    "daemon.connection_discovery_lookback_days"
  );
  if (daemon.connectionDiscoveryCooldownHours) {
    validatePositiveInt(
      daemon.connectionDiscoveryCooldownHours,
      "daemon.connection_discovery_cooldown_hours"
    );
  }
}

/**
 * Validate daemon thresholds
 */
function validateDaemonThresholds(daemon: DaemonConfig): void {
  if (daemon.semanticSearchThreshold !== undefined) {
    validateRatio(
      daemon.semanticSearchThreshold,
      "daemon.semantic_search_threshold"
    );
  }
  validateRatio(daemon.baseDecayRate, "daemon.base_decay_rate");
  validateRatio(
    daemon.creativeSimilarityThreshold,
    "daemon.creative_similarity_threshold"
  );
}

/**
 * Validate daemon configuration
 */
function validateDaemonConfig(daemon: DaemonConfig): void {
  validateDaemonCoreInts(daemon);
  validateDaemonSchedules(daemon);
  validateDaemonLimits(daemon);
  validateDaemonThresholds(daemon);
}

/**
 * Transform query configuration from raw config
 */
function transformQueryConfig(
  raw: RawConfig,
  defaults: PiBrainConfig
): QueryConfig {
  return {
    provider: raw.query?.provider ?? defaults.query.provider,
    model: raw.query?.model ?? defaults.query.model,
  };
}

/**
 * Transform API configuration from raw config
 */
function transformApiConfig(
  raw: RawConfig,
  defaults: PiBrainConfig
): ApiConfig {
  const api: ApiConfig = {
    port: raw.api?.port ?? defaults.api.port,
    host: raw.api?.host ?? defaults.api.host,
    corsOrigins: raw.api?.cors_origins ?? defaults.api.corsOrigins,
  };

  validatePort(api.port, "api.port");

  return api;
}

/**
 * Transform raw YAML config to typed config with validation
 */
export function transformConfig(raw: RawConfig): PiBrainConfig {
  const defaults = getDefaultConfig();

  // Transform hub config
  const hub = transformHubConfig(raw, defaults);

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
  const daemon = transformDaemonConfig(raw, defaults);
  validateDaemonConfig(daemon);

  // Transform query config
  const query = transformQueryConfig(raw, defaults);

  // Transform API config
  const api = transformApiConfig(raw, defaults);

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
 * Validate config file extension
 */
function validateConfigExtension(filePath: string): void {
  const ext = path.extname(filePath).toLowerCase();
  const isValidExtension = !ext || ext === ".yaml" || ext === ".yml";
  if (!isValidExtension) {
    throw new ConfigError(
      `Config file must be YAML format (.yaml or .yml), got: ${ext}`,
      filePath
    );
  }
}

/**
 * Read config file content
 */
function readConfigFile(filePath: string): string {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (error) {
    throw new ConfigError(
      `Failed to read config file: ${(error as Error).message}`,
      filePath
    );
  }
}

/**
 * Parse YAML content
 */
function parseYamlContent(content: string, filePath: string): RawConfig | null {
  try {
    return yaml.parse(content) as RawConfig | null;
  } catch (error) {
    throw new ConfigError(
      `Failed to parse YAML: ${(error as Error).message}`,
      filePath
    );
  }
}

/**
 * Load configuration from a YAML file
 */
export function loadConfig(configPath?: string): PiBrainConfig {
  const filePath = configPath ?? DEFAULT_CONFIG_PATH;

  if (!fs.existsSync(filePath)) {
    return getDefaultConfig();
  }

  validateConfigExtension(filePath);

  const content = readConfigFile(filePath);
  if (!content.trim()) {
    return getDefaultConfig();
  }

  const raw = parseYamlContent(content, filePath);
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
  # embedding_api_key: sk-or-v1-...          # REQUIRED for openrouter/openai providers
                                             # Get a key at: https://openrouter.ai/keys
                                             # Without this, clustering is skipped (no error)
  # embedding_base_url: https://...          # optional, for custom endpoints
  semantic_search_threshold: 0.5             # 0.0-1.0, distance above which FTS fallback triggers
  decay_schedule: "0 3 * * *"                # 3am daily - memory decay job
  creative_schedule: "0 4 * * 0"             # 4am Sunday - creative association job
  base_decay_rate: 0.1                       # 0.0-1.0, higher = faster memory decay
  creative_similarity_threshold: 0.75        # 0.0-1.0, minimum similarity for creative edges
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
