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
  SpokeConfig,
  RawConfig,
  SyncMethod,
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
 * Get complete default configuration
 */
export function getDefaultConfig(): PiBrainConfig {
  return {
    hub: getDefaultHubConfig(),
    spokes: [],
    daemon: getDefaultDaemonConfig(),
    query: getDefaultQueryConfig(),
  };
}

/**
 * Validate sync method
 */
function validateSyncMethod(method: string): SyncMethod {
  const validMethods: SyncMethod[] = ["syncthing", "rsync", "api"];
  if (!validMethods.includes(method as SyncMethod)) {
    throw new Error(
      `Invalid sync_method: ${method}. Must be one of: ${validMethods.join(", ")}`
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

  const syncMethod = validateSyncMethod(spoke.sync_method);

  // rsync requires source
  if (syncMethod === "rsync" && !spoke.source) {
    throw new Error(
      `Spoke "${spoke.name}" with rsync sync_method requires source field`
    );
  }

  return {
    name: spoke.name,
    syncMethod,
    path: expandPath(spoke.path),
    source: spoke.source,
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
  validatePositiveInt(
    daemon.maxConcurrentAnalysis,
    "daemon.max_concurrent_analysis"
  );
  validatePositiveInt(
    daemon.analysisTimeoutMinutes,
    "daemon.analysis_timeout_minutes"
  );
  validatePositiveInt(daemon.maxQueueSize, "daemon.max_queue_size");

  // Transform query config
  const query: QueryConfig = {
    provider: raw.query?.provider ?? defaults.query.provider,
    model: raw.query?.model ?? defaults.query.model,
  };

  return { hub, spokes, daemon, query };
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
  #   path: /synced/laptop-sessions
  # - name: server
  #   sync_method: rsync
  #   source: user@server:~/.pi/agent/sessions
  #   path: /synced/server-sessions

# Daemon behavior
daemon:
  idle_timeout_minutes: 10
  parallel_workers: 1
  max_retries: 3
  reanalysis_schedule: "0 2 * * *"  # 2am nightly
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
 * Get all session directories to watch (hub + spokes)
 */
export function getSessionDirs(config: PiBrainConfig): string[] {
  const dirs = [config.hub.sessionsDir];
  for (const spoke of config.spokes) {
    dirs.push(spoke.path);
  }
  return dirs;
}
