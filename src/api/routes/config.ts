/**
 * Configuration API routes
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

import * as fs from "node:fs";
import * as path from "node:path";
import * as yaml from "yaml";

import type {
  RawConfig,
  SyncMethod,
  RsyncOptions,
} from "../../config/types.js";

import {
  DEFAULT_CONFIG_PATH,
  loadConfig,
  getDefaultDaemonConfig,
  getDefaultQueryConfig,
  getDefaultApiConfig,
  getDefaultHubConfig,
  expandPath,
} from "../../config/config.js";
import { isValidCronExpression } from "../../daemon/scheduler.js";
import { successResponse, errorResponse } from "../responses.js";

/**
 * Validation result - either success (null) or error message
 */
type ValidationResult = string | null;

/**
 * Run validation checks and return first error
 */
function firstError(validations: ValidationResult[]): ValidationResult {
  for (const error of validations) {
    if (error !== null) {
      return error;
    }
  }
  return null;
}

/**
 * Validate an integer field is within a range
 */
function validateIntRange(
  value: number | undefined,
  field: string,
  min: number,
  max: number
): ValidationResult {
  if (value === undefined) {
    return null;
  }
  if (!Number.isInteger(value) || value < min || value > max) {
    return `${field} must be an integer between ${min} and ${max}`;
  }
  return null;
}

/**
 * Validate a nullable integer field is within a range
 * Allows undefined and null to pass, validates numbers
 */
function validateNullableIntRange(
  value: number | null | undefined,
  field: string,
  min: number,
  max: number
): ValidationResult {
  if (value === undefined || value === null) {
    return null;
  }
  if (!Number.isInteger(value) || value < min || value > max) {
    return `${field} must be a positive integer between ${min} and ${max}`;
  }
  return null;
}

/**
 * Validate a float field is within a range
 */
function validateFloatRange(
  value: number | undefined,
  field: string,
  min: number,
  max: number
): ValidationResult {
  if (value === undefined) {
    return null;
  }
  if (typeof value !== "number" || value < min || value > max) {
    return `${field} must be a number between ${min} and ${max}`;
  }
  return null;
}

/**
 * Validate a non-empty string field
 */
function validateNonEmptyString(
  value: string | undefined,
  field: string
): ValidationResult {
  if (value === undefined) {
    return null;
  }
  if (!value || typeof value !== "string") {
    return `${field} must be a non-empty string`;
  }
  return null;
}

/**
 * Validate a nullable non-empty string field (allows null to clear)
 */
function validateNullableNonEmptyString(
  value: string | null | undefined,
  field: string
): ValidationResult {
  if (value === undefined || value === null) {
    return null;
  }
  if (!value || typeof value !== "string") {
    return `${field} must be a non-empty string or null`;
  }
  return null;
}

/**
 * Validate a value is one of allowed options
 */
function validateOneOf<T>(
  value: T | undefined,
  field: string,
  allowed: readonly T[]
): ValidationResult {
  if (value === undefined) {
    return null;
  }
  if (!allowed.includes(value)) {
    return `${field} must be one of: ${allowed.join(", ")}`;
  }
  return null;
}

/**
 * Validate a cron schedule expression
 * Returns error message if invalid, null if valid or undefined
 */
function validateCronSchedule(
  value: string | null | undefined,
  field: string
): ValidationResult {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  if (!isValidCronExpression(value)) {
    return `${field} must be a valid cron expression (e.g., "0 2 * * *")`;
  }
  return null;
}

/**
 * Valid embedding providers
 */
const VALID_EMBEDDING_PROVIDERS = ["ollama", "openai", "openrouter"] as const;
type EmbeddingProvider = (typeof VALID_EMBEDDING_PROVIDERS)[number];

/**
 * Daemon configuration update request body
 */
interface DaemonConfigUpdateBody {
  provider?: string;
  model?: string;
  idleTimeoutMinutes?: number;
  parallelWorkers?: number;
  maxRetries?: number;
  retryDelaySeconds?: number;
  analysisTimeoutMinutes?: number;
  maxConcurrentAnalysis?: number;
  maxQueueSize?: number;
  backfillLimit?: number;
  reanalysisLimit?: number;
  connectionDiscoveryLimit?: number;
  connectionDiscoveryLookbackDays?: number;
  connectionDiscoveryCooldownHours?: number;
  semanticSearchThreshold?: number;
  // Embedding fields
  embeddingProvider?: EmbeddingProvider;
  embeddingModel?: string;
  embeddingApiKey?: string | null;
  embeddingBaseUrl?: string | null;
  embeddingDimensions?: number | null;
  // Schedule fields
  reanalysisSchedule?: string | null;
  connectionDiscoverySchedule?: string | null;
  patternAggregationSchedule?: string | null;
  clusteringSchedule?: string | null;
  backfillEmbeddingsSchedule?: string | null;
}

/**
 * Query configuration update request body
 */
interface QueryConfigUpdateBody {
  provider?: string;
  model?: string;
}

/**
 * API configuration update request body
 */
interface ApiConfigUpdateBody {
  port?: number;
  host?: string;
  corsOrigins?: string[];
}

/**
 * Hub configuration update request body
 */
interface HubConfigUpdateBody {
  sessionsDir?: string;
  databaseDir?: string;
  webUiPort?: number;
}

/**
 * Valid sync methods for spokes
 */
const VALID_SYNC_METHODS: SyncMethod[] = ["syncthing", "rsync", "api"];

/**
 * Spoke rsync options request body
 */
interface RsyncOptionsBody {
  bwLimit?: number;
  delete?: boolean;
  extraArgs?: string[];
  timeoutSeconds?: number;
}

/**
 * Spoke configuration create request body
 */
interface SpokeCreateBody {
  name: string;
  syncMethod: SyncMethod;
  path: string;
  source?: string;
  enabled?: boolean;
  schedule?: string;
  rsyncOptions?: RsyncOptionsBody;
}

/**
 * Spoke configuration update request body
 */
interface SpokeUpdateBody {
  syncMethod?: SyncMethod;
  path?: string;
  source?: string | null;
  enabled?: boolean;
  schedule?: string | null;
  rsyncOptions?: RsyncOptionsBody | null;
}

/**
 * Spoke response format
 */
interface SpokeResponse {
  name: string;
  syncMethod: SyncMethod;
  path: string;
  source?: string;
  enabled: boolean;
  schedule?: string;
  rsyncOptions?: RsyncOptions;
}

/**
 * Validate embedding configuration fields
 */
function validateEmbeddingFields(
  body: DaemonConfigUpdateBody
): ValidationResult {
  const {
    embeddingProvider,
    embeddingModel,
    embeddingBaseUrl,
    embeddingDimensions,
  } = body;

  return firstError([
    validateOneOf(
      embeddingProvider,
      "embeddingProvider",
      VALID_EMBEDDING_PROVIDERS
    ),
    validateNonEmptyString(embeddingModel, "embeddingModel"),
    validateNullableNonEmptyString(embeddingBaseUrl, "embeddingBaseUrl"),
    validateNullableIntRange(
      embeddingDimensions,
      "embeddingDimensions",
      1,
      10_000
    ),
  ]);
}

/**
 * Validate daemon configuration update fields
 */
function validateDaemonUpdate(body: DaemonConfigUpdateBody): ValidationResult {
  const {
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
    reanalysisSchedule,
    connectionDiscoverySchedule,
    patternAggregationSchedule,
    clusteringSchedule,
    backfillEmbeddingsSchedule,
  } = body;

  const validations: ValidationResult[] = [
    validateIntRange(idleTimeoutMinutes, "idleTimeoutMinutes", 1, 1440),
    validateIntRange(parallelWorkers, "parallelWorkers", 1, 10),
    validateIntRange(maxRetries, "maxRetries", 0, 10),
    validateIntRange(retryDelaySeconds, "retryDelaySeconds", 1, 3600),
    validateIntRange(analysisTimeoutMinutes, "analysisTimeoutMinutes", 1, 120),
    validateIntRange(maxConcurrentAnalysis, "maxConcurrentAnalysis", 1, 10),
    validateIntRange(maxQueueSize, "maxQueueSize", 10, 10_000),
    validateIntRange(backfillLimit, "backfillLimit", 1, 1000),
    validateIntRange(reanalysisLimit, "reanalysisLimit", 1, 1000),
    validateIntRange(
      connectionDiscoveryLimit,
      "connectionDiscoveryLimit",
      1,
      1000
    ),
    validateIntRange(
      connectionDiscoveryLookbackDays,
      "connectionDiscoveryLookbackDays",
      1,
      365
    ),
    validateIntRange(
      connectionDiscoveryCooldownHours,
      "connectionDiscoveryCooldownHours",
      1,
      168
    ),
    validateFloatRange(
      semanticSearchThreshold,
      "semanticSearchThreshold",
      0,
      1
    ),
    // Schedule validations
    validateCronSchedule(reanalysisSchedule, "reanalysisSchedule"),
    validateCronSchedule(
      connectionDiscoverySchedule,
      "connectionDiscoverySchedule"
    ),
    validateCronSchedule(
      patternAggregationSchedule,
      "patternAggregationSchedule"
    ),
    validateCronSchedule(clusteringSchedule, "clusteringSchedule"),
    validateCronSchedule(
      backfillEmbeddingsSchedule,
      "backfillEmbeddingsSchedule"
    ),
    // Embedding validations
    validateEmbeddingFields(body),
  ];

  return firstError(validations);
}

/**
 * Check if daemon config update body has at least one field defined
 */
function hasAnyDaemonField(body: DaemonConfigUpdateBody): boolean {
  return Object.values(body).some((value) => value !== undefined);
}

/**
 * Apply an optional nullable string field to a raw config object
 * null/empty clears the field, undefined skips, string sets
 */
function applyNullableString(
  target: NonNullable<RawConfig["daemon"]>,
  key: keyof NonNullable<RawConfig["daemon"]>,
  value: string | null | undefined
): void {
  if (value === undefined) {
    return;
  }
  if (value === null || value === "") {
    // Clear the field by setting to undefined
    // TypeScript needs us to use a type assertion here
    target[key] = undefined as never;
  } else {
    target[key] = value as never;
  }
}

/**
 * Apply an optional nullable numeric field to a raw config object
 * null clears the field, undefined skips, number sets
 */
function applyNullableNumber(
  target: NonNullable<RawConfig["daemon"]>,
  key: keyof NonNullable<RawConfig["daemon"]>,
  value: number | null | undefined
): void {
  if (value === undefined) {
    return;
  }
  if (value === null) {
    // Clear the field by setting to undefined
    target[key] = undefined as never;
  } else {
    target[key] = value as never;
  }
}

/**
 * Apply embedding config updates to raw config object
 */
function applyEmbeddingUpdates(
  daemon: NonNullable<RawConfig["daemon"]>,
  body: DaemonConfigUpdateBody
): void {
  const {
    embeddingProvider,
    embeddingModel,
    embeddingApiKey,
    embeddingBaseUrl,
    embeddingDimensions,
  } = body;

  if (embeddingProvider !== undefined) {
    daemon.embedding_provider = embeddingProvider;
  }
  if (embeddingModel !== undefined) {
    daemon.embedding_model = embeddingModel;
  }
  applyNullableString(daemon, "embedding_api_key", embeddingApiKey);
  applyNullableString(daemon, "embedding_base_url", embeddingBaseUrl);
  applyNullableNumber(daemon, "embedding_dimensions", embeddingDimensions);
}

/**
 * Apply schedule config updates to raw config object
 */
function applyScheduleUpdates(
  daemon: NonNullable<RawConfig["daemon"]>,
  body: DaemonConfigUpdateBody
): void {
  const {
    reanalysisSchedule,
    connectionDiscoverySchedule,
    patternAggregationSchedule,
    clusteringSchedule,
    backfillEmbeddingsSchedule,
  } = body;

  applyNullableString(daemon, "reanalysis_schedule", reanalysisSchedule);
  applyNullableString(
    daemon,
    "connection_discovery_schedule",
    connectionDiscoverySchedule
  );
  applyNullableString(
    daemon,
    "pattern_aggregation_schedule",
    patternAggregationSchedule
  );
  applyNullableString(daemon, "clustering_schedule", clusteringSchedule);
  applyNullableString(
    daemon,
    "backfill_embeddings_schedule",
    backfillEmbeddingsSchedule
  );
}

/**
 * Mapping of body field names to raw config field names for simple daemon updates
 */
const DAEMON_FIELD_MAP: Record<string, keyof NonNullable<RawConfig["daemon"]>> =
  {
    provider: "provider",
    model: "model",
    idleTimeoutMinutes: "idle_timeout_minutes",
    parallelWorkers: "parallel_workers",
    maxRetries: "max_retries",
    retryDelaySeconds: "retry_delay_seconds",
    analysisTimeoutMinutes: "analysis_timeout_minutes",
    maxConcurrentAnalysis: "max_concurrent_analysis",
    maxQueueSize: "max_queue_size",
    backfillLimit: "backfill_limit",
    reanalysisLimit: "reanalysis_limit",
    connectionDiscoveryLimit: "connection_discovery_limit",
    connectionDiscoveryLookbackDays: "connection_discovery_lookback_days",
    connectionDiscoveryCooldownHours: "connection_discovery_cooldown_hours",
    semanticSearchThreshold: "semantic_search_threshold",
  };

/**
 * Apply daemon config updates to raw config object
 */
function applyDaemonUpdates(
  rawConfig: RawConfig,
  body: DaemonConfigUpdateBody
): void {
  // Initialize daemon section if needed
  if (!rawConfig.daemon) {
    rawConfig.daemon = {};
  }

  const { daemon } = rawConfig;

  // Apply simple field mappings using lookup table
  for (const [bodyKey, daemonKey] of Object.entries(DAEMON_FIELD_MAP)) {
    const value = body[bodyKey as keyof DaemonConfigUpdateBody];
    if (value !== undefined) {
      // Use type assertion since we've verified the mapping is correct
      (daemon as Record<string, unknown>)[daemonKey] = value;
    }
  }

  // Delegate to specialized update functions
  applyEmbeddingUpdates(daemon, body);
  applyScheduleUpdates(daemon, body);
}

/**
 * Validate query configuration update fields
 */
function validateQueryUpdate(body: QueryConfigUpdateBody): ValidationResult {
  const { provider, model } = body;

  // Validate provider is a non-empty string
  if (provider !== undefined && (!provider || typeof provider !== "string")) {
    return "provider must be a non-empty string";
  }

  // Validate model is a non-empty string
  if (model !== undefined && (!model || typeof model !== "string")) {
    return "model must be a non-empty string";
  }

  return null;
}

/**
 * Validate API configuration update fields
 */
function validateApiUpdate(body: ApiConfigUpdateBody): ValidationResult {
  const { port, host, corsOrigins } = body;

  // Validate port range
  if (port !== undefined) {
    const portError = validateIntRange(port, "port", 1024, 65_535);
    if (portError !== null) {
      return portError;
    }
  }

  // Validate host is non-empty string
  if (host !== undefined && (!host || typeof host !== "string")) {
    return "host must be a non-empty string";
  }

  // Validate corsOrigins is array of strings
  if (corsOrigins !== undefined) {
    if (!Array.isArray(corsOrigins)) {
      return "corsOrigins must be an array";
    }
    for (const origin of corsOrigins) {
      if (typeof origin !== "string") {
        return "corsOrigins must be an array of strings";
      }
    }
  }

  return null;
}

/**
 * Validate a path exists or has a writable parent
 */
function validatePath(p: string, field: string): ValidationResult {
  const expanded = expandPath(p);
  if (fs.existsSync(expanded)) {
    try {
      if (!fs.statSync(expanded).isDirectory()) {
        return `${field} exists but is not a directory`;
      }
    } catch (error) {
      return `Failed to access ${field}: ${(error as Error).message}`;
    }
  } else {
    const parent = path.dirname(expanded);
    if (!fs.existsSync(parent)) {
      return `Parent directory for ${field} does not exist: ${parent}`;
    }
    try {
      fs.accessSync(parent, fs.constants.W_OK);
    } catch {
      return `Parent directory for ${field} is not writable: ${parent}`;
    }
  }
  return null;
}

/**
 * Validate a directory path field (non-empty string + valid path)
 */
function validateDirPath(
  value: string | undefined,
  field: string
): ValidationResult {
  if (value === undefined) {
    return null;
  }
  const stringError = validateNonEmptyString(value, field);
  if (stringError) {
    return stringError;
  }
  return validatePath(value, field);
}

/**
 * Validate hub configuration update fields
 */
function validateHubUpdate(body: HubConfigUpdateBody): ValidationResult {
  const { sessionsDir, databaseDir, webUiPort } = body;

  return firstError([
    validateDirPath(sessionsDir, "sessionsDir"),
    validateDirPath(databaseDir, "databaseDir"),
    validateIntRange(webUiPort, "webUiPort", 1024, 65_535),
  ]);
}

/**
 * Validate spoke name is valid (alphanumeric, dash, underscore)
 */
function validateSpokeName(name: string): ValidationResult {
  if (!name || typeof name !== "string") {
    return "name must be a non-empty string";
  }
  if (!/^[\w-]+$/.test(name)) {
    return "name must contain only letters, numbers, dashes, and underscores";
  }
  if (name.length > 64) {
    return "name must be 64 characters or fewer";
  }
  return null;
}

/**
 * Validate a string array field
 */
function validateStringArray(
  value: string[] | undefined,
  field: string
): ValidationResult {
  if (value === undefined) {
    return null;
  }
  if (!Array.isArray(value)) {
    return `${field} must be an array`;
  }
  for (const item of value) {
    if (typeof item !== "string") {
      return `${field} must be an array of strings`;
    }
  }
  return null;
}

/**
 * Validate rsync options
 */
function validateRsyncOptions(
  options: RsyncOptionsBody | undefined,
  field: string
): ValidationResult {
  if (options === undefined) {
    return null;
  }

  const { bwLimit, timeoutSeconds, extraArgs } = options;

  return firstError([
    validateIntRange(bwLimit, `${field}.bwLimit`, 0, 1_000_000),
    validateIntRange(timeoutSeconds, `${field}.timeoutSeconds`, 0, 86_400),
    validateStringArray(extraArgs, `${field}.extraArgs`),
  ]);
}

/**
 * Validate spoke create request body
 */
function validateSpokeCreate(body: SpokeCreateBody): ValidationResult {
  const {
    name,
    syncMethod,
    path: spokePath,
    source,
    schedule,
    rsyncOptions,
  } = body;

  // Basic validations using helper array
  const basicErrors = firstError([
    validateSpokeName(name),
    validateOneOf(syncMethod, "syncMethod", VALID_SYNC_METHODS),
    validateDirPath(spokePath, "path"),
    validateCronSchedule(schedule, "schedule"),
    validateRsyncOptions(rsyncOptions, "rsyncOptions"),
  ]);

  if (basicErrors !== null) {
    return basicErrors;
  }

  // Validate syncMethod is provided (required field)
  if (!syncMethod) {
    return `syncMethod must be one of: ${VALID_SYNC_METHODS.join(", ")}`;
  }

  // Validate path is provided (required field)
  if (!spokePath || typeof spokePath !== "string") {
    return "path must be a non-empty string";
  }

  // Validate source for rsync
  if (syncMethod === "rsync" && (!source || typeof source !== "string")) {
    return "source is required for rsync sync method";
  }

  return null;
}

/**
 * Validate spoke update request body
 */
function validateSpokeUpdate(body: SpokeUpdateBody): ValidationResult {
  const { syncMethod, path: spokePath, source, schedule, rsyncOptions } = body;

  return firstError([
    validateOneOf(syncMethod, "syncMethod", VALID_SYNC_METHODS),
    validateDirPath(spokePath, "path"),
    validateNullableNonEmptyString(source, "source"),
    validateCronSchedule(schedule, "schedule"),
    rsyncOptions === null
      ? null
      : validateRsyncOptions(rsyncOptions, "rsyncOptions"),
  ]);
}

// =============================================================================
// Config File I/O Helpers
// =============================================================================

/**
 * Read raw config from YAML file
 */
function readRawConfig(): RawConfig {
  if (!fs.existsSync(DEFAULT_CONFIG_PATH)) {
    return {};
  }
  const content = fs.readFileSync(DEFAULT_CONFIG_PATH, "utf8");
  if (!content.trim()) {
    return {};
  }
  return yaml.parse(content) as RawConfig;
}

/**
 * Write raw config to YAML file
 */
function writeRawConfig(rawConfig: RawConfig): void {
  const yamlContent = yaml.stringify(rawConfig, {
    indent: 2,
    lineWidth: 0,
  });
  fs.writeFileSync(DEFAULT_CONFIG_PATH, yamlContent, "utf8");
}

/**
 * Build raw rsync options from body rsync options
 */
function buildRawRsyncOptions(
  options: RsyncOptionsBody
): NonNullable<NonNullable<RawConfig["spokes"]>[number]["rsync_options"]> {
  const raw: NonNullable<
    NonNullable<RawConfig["spokes"]>[number]["rsync_options"]
  > = {};

  if (options.bwLimit !== undefined) {
    raw.bw_limit = options.bwLimit;
  }
  if (options.delete !== undefined) {
    raw.delete = options.delete;
  }
  if (options.extraArgs !== undefined) {
    raw.extra_args = options.extraArgs;
  }
  if (options.timeoutSeconds !== undefined) {
    raw.timeout_seconds = options.timeoutSeconds;
  }

  return raw;
}

/**
 * Build raw spoke config from create body
 */
function buildRawSpokeFromBody(
  body: SpokeCreateBody
): NonNullable<RawConfig["spokes"]>[number] {
  const rawSpoke: NonNullable<RawConfig["spokes"]>[number] = {
    name: body.name,
    sync_method: body.syncMethod,
    path: body.path,
    enabled: body.enabled ?? true,
  };

  if (body.source !== undefined) {
    rawSpoke.source = body.source;
  }
  if (body.schedule !== undefined) {
    rawSpoke.schedule = body.schedule;
  }
  if (body.rsyncOptions !== undefined) {
    rawSpoke.rsync_options = buildRawRsyncOptions(body.rsyncOptions);
  }

  return rawSpoke;
}

/**
 * Apply rsync options update to raw spoke
 */
function applyRsyncOptionsUpdate(
  rawSpoke: NonNullable<RawConfig["spokes"]>[number],
  options: RsyncOptionsBody
): void {
  if (!rawSpoke.rsync_options) {
    rawSpoke.rsync_options = {};
  }
  const fieldMap: Record<keyof RsyncOptionsBody, string> = {
    bwLimit: "bw_limit",
    delete: "delete",
    extraArgs: "extra_args",
    timeoutSeconds: "timeout_seconds",
  };
  for (const [bodyKey, rawKey] of Object.entries(fieldMap)) {
    const value = options[bodyKey as keyof RsyncOptionsBody];
    if (value !== undefined) {
      (rawSpoke.rsync_options as Record<string, unknown>)[rawKey] = value;
    }
  }
}

/**
 * Apply a nullable string field (null clears, string sets)
 */
function applyNullableField(
  target: Record<string, unknown>,
  key: string,
  value: string | null | undefined
): void {
  if (value === undefined) {
    return;
  }
  if (value === null || value === "") {
    // Remove key by using Reflect.deleteProperty (allowed alternative to dynamic delete)
    Reflect.deleteProperty(target, key);
  } else {
    target[key] = value;
  }
}

/**
 * Apply spoke update fields to raw spoke config
 */
function applySpokeUpdates(
  rawSpoke: NonNullable<RawConfig["spokes"]>[number],
  body: SpokeUpdateBody
): void {
  if (body.syncMethod !== undefined) {
    rawSpoke.sync_method = body.syncMethod;
  }
  if (body.path !== undefined) {
    rawSpoke.path = body.path;
  }
  if (body.enabled !== undefined) {
    rawSpoke.enabled = body.enabled;
  }

  // Handle nullable fields
  const target = rawSpoke as unknown as Record<string, unknown>;
  applyNullableField(target, "source", body.source);
  applyNullableField(target, "schedule", body.schedule);

  // Handle rsyncOptions specially (null clears, object updates)
  if (body.rsyncOptions === null) {
    delete rawSpoke.rsync_options;
  } else if (body.rsyncOptions !== undefined) {
    applyRsyncOptionsUpdate(rawSpoke, body.rsyncOptions);
  }
}

/**
 * Convert a spoke config to response format
 */
function spokeToResponse(spoke: {
  name: string;
  syncMethod: SyncMethod;
  path: string;
  source?: string;
  enabled: boolean;
  schedule?: string;
  rsyncOptions?: RsyncOptions;
}): SpokeResponse {
  const response: SpokeResponse = {
    name: spoke.name,
    syncMethod: spoke.syncMethod,
    path: spoke.path,
    enabled: spoke.enabled,
  };

  if (spoke.source !== undefined) {
    response.source = spoke.source;
  }
  if (spoke.schedule !== undefined) {
    response.schedule = spoke.schedule;
  }
  if (spoke.rsyncOptions !== undefined) {
    response.rsyncOptions = spoke.rsyncOptions;
  }

  return response;
}

/**
 * Apply query config updates to raw config object
 */
function applyQueryUpdates(
  rawConfig: RawConfig,
  body: QueryConfigUpdateBody
): void {
  const { provider, model } = body;

  // Initialize query section if needed
  if (!rawConfig.query) {
    rawConfig.query = {};
  }

  // Update provided fields
  if (provider !== undefined) {
    rawConfig.query.provider = provider;
  }
  if (model !== undefined) {
    rawConfig.query.model = model;
  }
}

/**
 * Apply API config updates to raw config object
 */
function applyApiUpdates(
  rawConfig: RawConfig,
  body: ApiConfigUpdateBody
): void {
  const { port, host, corsOrigins } = body;

  // Initialize api section if needed
  if (!rawConfig.api) {
    rawConfig.api = {};
  }

  // Update provided fields
  if (port !== undefined) {
    rawConfig.api.port = port;
  }
  if (host !== undefined) {
    rawConfig.api.host = host;
  }
  if (corsOrigins !== undefined) {
    rawConfig.api.cors_origins = corsOrigins;
  }
}

/**
 * Apply hub config updates to raw config object
 */
function applyHubUpdates(
  rawConfig: RawConfig,
  body: HubConfigUpdateBody
): void {
  const { sessionsDir, databaseDir, webUiPort } = body;

  // Initialize hub section if needed
  if (!rawConfig.hub) {
    rawConfig.hub = {};
  }

  // Update provided fields
  if (sessionsDir !== undefined) {
    rawConfig.hub.sessions_dir = sessionsDir;
  }
  if (databaseDir !== undefined) {
    rawConfig.hub.database_dir = databaseDir;
  }
  if (webUiPort !== undefined) {
    rawConfig.hub.web_ui_port = webUiPort;
  }
}

export async function configRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /config/daemon - Get daemon configuration
   */
  app.get("/daemon", async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = request.startTime ?? Date.now();

    const config = loadConfig();
    const defaults = getDefaultDaemonConfig();

    const durationMs = Date.now() - startTime;
    return reply.send(
      successResponse(
        {
          provider: config.daemon.provider,
          model: config.daemon.model,
          idleTimeoutMinutes: config.daemon.idleTimeoutMinutes,
          parallelWorkers: config.daemon.parallelWorkers,
          maxRetries: config.daemon.maxRetries,
          retryDelaySeconds: config.daemon.retryDelaySeconds,
          analysisTimeoutMinutes: config.daemon.analysisTimeoutMinutes,
          maxConcurrentAnalysis: config.daemon.maxConcurrentAnalysis,
          maxQueueSize: config.daemon.maxQueueSize,
          backfillLimit: config.daemon.backfillLimit,
          reanalysisLimit: config.daemon.reanalysisLimit,
          connectionDiscoveryLimit: config.daemon.connectionDiscoveryLimit,
          connectionDiscoveryLookbackDays:
            config.daemon.connectionDiscoveryLookbackDays,
          connectionDiscoveryCooldownHours:
            config.daemon.connectionDiscoveryCooldownHours,
          semanticSearchThreshold: config.daemon.semanticSearchThreshold,
          // Embedding fields - never return the actual API key
          embeddingProvider: config.daemon.embeddingProvider,
          embeddingModel: config.daemon.embeddingModel,
          hasApiKey: !!config.daemon.embeddingApiKey,
          embeddingBaseUrl: config.daemon.embeddingBaseUrl,
          embeddingDimensions: config.daemon.embeddingDimensions,
          // Schedule fields
          reanalysisSchedule: config.daemon.reanalysisSchedule,
          connectionDiscoverySchedule:
            config.daemon.connectionDiscoverySchedule,
          patternAggregationSchedule: config.daemon.patternAggregationSchedule,
          clusteringSchedule: config.daemon.clusteringSchedule,
          backfillEmbeddingsSchedule: config.daemon.backfillEmbeddingsSchedule,
          // Include defaults for UI reference
          defaults: {
            provider: defaults.provider,
            model: defaults.model,
            embeddingProvider: defaults.embeddingProvider,
            embeddingModel: defaults.embeddingModel,
            reanalysisSchedule: defaults.reanalysisSchedule,
            connectionDiscoverySchedule: defaults.connectionDiscoverySchedule,
            patternAggregationSchedule: defaults.patternAggregationSchedule,
            clusteringSchedule: defaults.clusteringSchedule,
            backfillEmbeddingsSchedule: defaults.backfillEmbeddingsSchedule,
          },
        },
        durationMs
      )
    );
  });

  /**
   * PUT /config/daemon - Update daemon configuration
   */
  app.put(
    "/daemon",
    async (
      request: FastifyRequest<{ Body: DaemonConfigUpdateBody }>,
      reply: FastifyReply
    ) => {
      const startTime = request.startTime ?? Date.now();
      const body = request.body ?? {};

      // Validate at least one field is provided
      if (!hasAnyDaemonField(body)) {
        return reply
          .status(400)
          .send(
            errorResponse(
              "BAD_REQUEST",
              "At least one configuration field is required"
            )
          );
      }

      // Validate fields
      const validationError = validateDaemonUpdate(body);
      if (validationError !== null) {
        return reply
          .status(400)
          .send(errorResponse("BAD_REQUEST", validationError));
      }

      // Read existing config file
      let rawConfig: RawConfig = {};
      if (fs.existsSync(DEFAULT_CONFIG_PATH)) {
        const content = fs.readFileSync(DEFAULT_CONFIG_PATH, "utf8");
        if (content.trim()) {
          rawConfig = yaml.parse(content) as RawConfig;
        }
      }

      // Apply updates
      applyDaemonUpdates(rawConfig, body);

      // Write updated config
      const yamlContent = yaml.stringify(rawConfig, {
        indent: 2,
        lineWidth: 0,
      });
      fs.writeFileSync(DEFAULT_CONFIG_PATH, yamlContent, "utf8");

      // Reload and return updated config
      const updatedConfig = loadConfig();

      const durationMs = Date.now() - startTime;
      return reply.send(
        successResponse(
          {
            provider: updatedConfig.daemon.provider,
            model: updatedConfig.daemon.model,
            idleTimeoutMinutes: updatedConfig.daemon.idleTimeoutMinutes,
            parallelWorkers: updatedConfig.daemon.parallelWorkers,
            maxRetries: updatedConfig.daemon.maxRetries,
            retryDelaySeconds: updatedConfig.daemon.retryDelaySeconds,
            analysisTimeoutMinutes: updatedConfig.daemon.analysisTimeoutMinutes,
            maxConcurrentAnalysis: updatedConfig.daemon.maxConcurrentAnalysis,
            maxQueueSize: updatedConfig.daemon.maxQueueSize,
            backfillLimit: updatedConfig.daemon.backfillLimit,
            reanalysisLimit: updatedConfig.daemon.reanalysisLimit,
            connectionDiscoveryLimit:
              updatedConfig.daemon.connectionDiscoveryLimit,
            connectionDiscoveryLookbackDays:
              updatedConfig.daemon.connectionDiscoveryLookbackDays,
            connectionDiscoveryCooldownHours:
              updatedConfig.daemon.connectionDiscoveryCooldownHours,
            semanticSearchThreshold:
              updatedConfig.daemon.semanticSearchThreshold,
            // Embedding fields - never return the actual API key
            embeddingProvider: updatedConfig.daemon.embeddingProvider,
            embeddingModel: updatedConfig.daemon.embeddingModel,
            hasApiKey: !!updatedConfig.daemon.embeddingApiKey,
            embeddingBaseUrl: updatedConfig.daemon.embeddingBaseUrl,
            embeddingDimensions: updatedConfig.daemon.embeddingDimensions,
            // Schedule fields
            reanalysisSchedule: updatedConfig.daemon.reanalysisSchedule,
            connectionDiscoverySchedule:
              updatedConfig.daemon.connectionDiscoverySchedule,
            patternAggregationSchedule:
              updatedConfig.daemon.patternAggregationSchedule,
            clusteringSchedule: updatedConfig.daemon.clusteringSchedule,
            backfillEmbeddingsSchedule:
              updatedConfig.daemon.backfillEmbeddingsSchedule,
            message: "Configuration updated. Restart daemon to apply changes.",
          },
          durationMs
        )
      );
    }
  );

  /**
   * GET /config/query - Get query configuration
   */
  app.get("/query", async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = request.startTime ?? Date.now();

    const config = loadConfig();
    const defaults = getDefaultQueryConfig();

    const durationMs = Date.now() - startTime;
    return reply.send(
      successResponse(
        {
          provider: config.query.provider,
          model: config.query.model,
          // Include defaults for UI reference
          defaults: {
            provider: defaults.provider,
            model: defaults.model,
          },
        },
        durationMs
      )
    );
  });

  /**
   * PUT /config/query - Update query configuration
   */
  app.put(
    "/query",
    async (
      request: FastifyRequest<{ Body: QueryConfigUpdateBody }>,
      reply: FastifyReply
    ) => {
      const startTime = request.startTime ?? Date.now();
      const body = request.body ?? {};
      const { provider, model } = body;

      // Validate at least one field is provided
      const hasAnyField = provider !== undefined || model !== undefined;

      if (!hasAnyField) {
        return reply
          .status(400)
          .send(
            errorResponse(
              "BAD_REQUEST",
              "At least one configuration field is required"
            )
          );
      }

      // Validate fields
      const validationError = validateQueryUpdate(body);
      if (validationError !== null) {
        return reply
          .status(400)
          .send(errorResponse("BAD_REQUEST", validationError));
      }

      // Read existing config file
      let rawConfig: RawConfig = {};
      if (fs.existsSync(DEFAULT_CONFIG_PATH)) {
        const content = fs.readFileSync(DEFAULT_CONFIG_PATH, "utf8");
        if (content.trim()) {
          rawConfig = yaml.parse(content) as RawConfig;
        }
      }

      // Apply updates
      applyQueryUpdates(rawConfig, body);

      // Write updated config
      const yamlContent = yaml.stringify(rawConfig, {
        indent: 2,
        lineWidth: 0,
      });
      fs.writeFileSync(DEFAULT_CONFIG_PATH, yamlContent, "utf8");

      // Reload and return updated config
      const updatedConfig = loadConfig();

      const durationMs = Date.now() - startTime;
      return reply.send(
        successResponse(
          {
            provider: updatedConfig.query.provider,
            model: updatedConfig.query.model,
            message: "Configuration updated. Restart daemon to apply changes.",
          },
          durationMs
        )
      );
    }
  );

  /**
   * GET /config/providers - Get available AI providers
   */
  app.get(
    "/providers",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const startTime = request.startTime ?? Date.now();

      // List of known providers
      const providers = [
        {
          id: "zai",
          name: "Zhipu AI",
          models: ["glm-4.7", "glm-4.6", "glm-4"],
        },
        {
          id: "anthropic",
          name: "Anthropic",
          models: ["claude-sonnet-4-20250514", "claude-3-5-sonnet-latest"],
        },
        {
          id: "openai",
          name: "OpenAI",
          models: ["gpt-4o", "gpt-4o-mini", "o1-preview"],
        },
        {
          id: "google",
          name: "Google",
          models: ["gemini-2.0-flash-exp", "gemini-1.5-pro"],
        },
        { id: "xai", name: "xAI", models: ["grok-2", "grok-2-mini"] },
        {
          id: "groq",
          name: "Groq",
          models: ["llama-3.3-70b-versatile", "mixtral-8x7b-32768"],
        },
      ];

      const durationMs = Date.now() - startTime;
      return reply.send(successResponse({ providers }, durationMs));
    }
  );

  /**
   * GET /config/api - Get API server configuration
   */
  app.get("/api", async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = request.startTime ?? Date.now();

    const config = loadConfig();
    const defaults = getDefaultApiConfig();

    const durationMs = Date.now() - startTime;
    return reply.send(
      successResponse(
        {
          port: config.api.port,
          host: config.api.host,
          corsOrigins: config.api.corsOrigins,
          // Include defaults for UI reference
          defaults: {
            port: defaults.port,
            host: defaults.host,
            corsOrigins: defaults.corsOrigins,
          },
        },
        durationMs
      )
    );
  });

  /**
   * PUT /config/api - Update API server configuration
   */
  app.put(
    "/api",
    async (
      request: FastifyRequest<{ Body: ApiConfigUpdateBody }>,
      reply: FastifyReply
    ) => {
      const startTime = request.startTime ?? Date.now();
      const body = request.body ?? {};
      const { port, host, corsOrigins } = body;

      // Validate at least one field is provided
      const hasAnyField =
        port !== undefined || host !== undefined || corsOrigins !== undefined;

      if (!hasAnyField) {
        return reply
          .status(400)
          .send(
            errorResponse(
              "BAD_REQUEST",
              "At least one configuration field is required"
            )
          );
      }

      // Validate fields
      const validationError = validateApiUpdate(body);
      if (validationError !== null) {
        return reply
          .status(400)
          .send(errorResponse("BAD_REQUEST", validationError));
      }

      // Read existing config file
      let rawConfig: RawConfig = {};
      if (fs.existsSync(DEFAULT_CONFIG_PATH)) {
        const content = fs.readFileSync(DEFAULT_CONFIG_PATH, "utf8");
        if (content.trim()) {
          rawConfig = yaml.parse(content) as RawConfig;
        }
      }

      // Apply updates
      applyApiUpdates(rawConfig, body);

      // Write updated config
      const yamlContent = yaml.stringify(rawConfig, {
        indent: 2,
        lineWidth: 0,
      });
      fs.writeFileSync(DEFAULT_CONFIG_PATH, yamlContent, "utf8");

      // Reload and return updated config
      const updatedConfig = loadConfig();

      const durationMs = Date.now() - startTime;
      return reply.send(
        successResponse(
          {
            port: updatedConfig.api.port,
            host: updatedConfig.api.host,
            corsOrigins: updatedConfig.api.corsOrigins,
            message:
              "Configuration updated. Restart API server to apply changes.",
          },
          durationMs
        )
      );
    }
  );

  /**
   * GET /config/hub - Get hub configuration
   */
  app.get("/hub", async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = request.startTime ?? Date.now();

    const config = loadConfig();
    const defaults = getDefaultHubConfig();

    const durationMs = Date.now() - startTime;
    return reply.send(
      successResponse(
        {
          sessionsDir: config.hub.sessionsDir,
          databaseDir: config.hub.databaseDir,
          webUiPort: config.hub.webUiPort,
          // Include defaults for UI reference
          defaults: {
            sessionsDir: defaults.sessionsDir,
            databaseDir: defaults.databaseDir,
            webUiPort: defaults.webUiPort,
          },
        },
        durationMs
      )
    );
  });

  /**
   * PUT /config/hub - Update hub configuration
   */
  app.put(
    "/hub",
    async (
      request: FastifyRequest<{ Body: HubConfigUpdateBody }>,
      reply: FastifyReply
    ) => {
      const startTime = request.startTime ?? Date.now();
      const body = request.body ?? {};
      const { sessionsDir, databaseDir, webUiPort } = body;

      // Validate at least one field is provided
      const hasAnyField =
        sessionsDir !== undefined ||
        databaseDir !== undefined ||
        webUiPort !== undefined;

      if (!hasAnyField) {
        return reply
          .status(400)
          .send(
            errorResponse(
              "BAD_REQUEST",
              "At least one configuration field is required"
            )
          );
      }

      // Validate fields
      const validationError = validateHubUpdate(body);
      if (validationError !== null) {
        return reply
          .status(400)
          .send(errorResponse("BAD_REQUEST", validationError));
      }

      // Read existing config file
      let rawConfig: RawConfig = {};
      if (fs.existsSync(DEFAULT_CONFIG_PATH)) {
        const content = fs.readFileSync(DEFAULT_CONFIG_PATH, "utf8");
        if (content.trim()) {
          rawConfig = yaml.parse(content) as RawConfig;
        }
      }

      // Apply updates
      applyHubUpdates(rawConfig, body);

      // Write updated config
      const yamlContent = yaml.stringify(rawConfig, {
        indent: 2,
        lineWidth: 0,
      });
      fs.writeFileSync(DEFAULT_CONFIG_PATH, yamlContent, "utf8");

      // Reload and return updated config
      const updatedConfig = loadConfig();

      const durationMs = Date.now() - startTime;
      return reply.send(
        successResponse(
          {
            sessionsDir: updatedConfig.hub.sessionsDir,
            databaseDir: updatedConfig.hub.databaseDir,
            webUiPort: updatedConfig.hub.webUiPort,
            message: "Configuration updated. Restart daemon to apply changes.",
          },
          durationMs
        )
      );
    }
  );

  /**
   * GET /config/spokes - List all spokes
   */
  app.get("/spokes", async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = request.startTime ?? Date.now();

    const config = loadConfig();

    const spokes = config.spokes.map((spoke) => spokeToResponse(spoke));

    const durationMs = Date.now() - startTime;
    return reply.send(successResponse({ spokes }, durationMs));
  });

  /**
   * POST /config/spokes - Create a new spoke
   */
  app.post(
    "/spokes",
    async (
      request: FastifyRequest<{ Body: SpokeCreateBody }>,
      reply: FastifyReply
    ) => {
      const startTime = request.startTime ?? Date.now();
      const { body } = request;

      // Validate body
      if (!body || typeof body !== "object") {
        return reply
          .status(400)
          .send(errorResponse("BAD_REQUEST", "Request body is required"));
      }

      // Validate fields
      const validationError = validateSpokeCreate(body);
      if (validationError !== null) {
        return reply
          .status(400)
          .send(errorResponse("BAD_REQUEST", validationError));
      }

      // Read existing config file
      const rawConfig = readRawConfig();

      // Initialize spokes array if needed
      if (!rawConfig.spokes) {
        rawConfig.spokes = [];
      }

      // Check for duplicate name
      const existingSpoke = rawConfig.spokes.find((s) => s.name === body.name);
      if (existingSpoke) {
        return reply
          .status(409)
          .send(
            errorResponse("CONFLICT", `Spoke "${body.name}" already exists`)
          );
      }

      // Build raw spoke config
      const rawSpoke = buildRawSpokeFromBody(body);

      // Add to spokes array
      rawConfig.spokes.push(rawSpoke);

      // Write updated config
      writeRawConfig(rawConfig);

      // Reload and return created spoke
      const updatedConfig = loadConfig();
      const createdSpoke = updatedConfig.spokes.find(
        (s) => s.name === body.name
      );

      if (!createdSpoke) {
        return reply
          .status(500)
          .send(
            errorResponse(
              "INTERNAL_ERROR",
              "Failed to create spoke - not found after save"
            )
          );
      }

      const durationMs = Date.now() - startTime;
      return reply.status(201).send(
        successResponse(
          {
            spoke: spokeToResponse(createdSpoke),
            message: "Spoke created. Restart daemon to apply changes.",
          },
          durationMs
        )
      );
    }
  );

  /**
   * PUT /config/spokes/:name - Update a spoke
   */
  app.put(
    "/spokes/:name",
    async (
      request: FastifyRequest<{
        Params: { name: string };
        Body: SpokeUpdateBody;
      }>,
      reply: FastifyReply
    ) => {
      const startTime = request.startTime ?? Date.now();
      const { name } = request.params;
      const body = request.body ?? {};

      // Check if at least one field is provided
      const hasAnyField = Object.values(body).some((v) => v !== undefined);

      if (!hasAnyField) {
        return reply
          .status(400)
          .send(
            errorResponse(
              "BAD_REQUEST",
              "At least one configuration field is required"
            )
          );
      }

      // Validate fields
      const validationError = validateSpokeUpdate(body);
      if (validationError !== null) {
        return reply
          .status(400)
          .send(errorResponse("BAD_REQUEST", validationError));
      }

      // Read existing config file
      const rawConfig = readRawConfig();

      // Find spoke by name
      if (!rawConfig.spokes) {
        rawConfig.spokes = [];
      }

      const spokeIndex = rawConfig.spokes.findIndex((s) => s.name === name);
      if (spokeIndex === -1) {
        return reply
          .status(404)
          .send(errorResponse("NOT_FOUND", `Spoke "${name}" not found`));
      }

      const rawSpoke = rawConfig.spokes[spokeIndex];

      // Apply updates using helper
      applySpokeUpdates(rawSpoke, body);

      // Write updated config
      writeRawConfig(rawConfig);

      // Reload and return updated spoke
      const updatedConfig = loadConfig();
      const updatedSpoke = updatedConfig.spokes.find((s) => s.name === name);

      if (!updatedSpoke) {
        return reply
          .status(500)
          .send(
            errorResponse(
              "INTERNAL_ERROR",
              "Failed to update spoke - not found after save"
            )
          );
      }

      const durationMs = Date.now() - startTime;
      return reply.send(
        successResponse(
          {
            spoke: spokeToResponse(updatedSpoke),
            message: "Spoke updated. Restart daemon to apply changes.",
          },
          durationMs
        )
      );
    }
  );

  /**
   * DELETE /config/spokes/:name - Delete a spoke
   */
  app.delete(
    "/spokes/:name",
    async (
      request: FastifyRequest<{ Params: { name: string } }>,
      reply: FastifyReply
    ) => {
      const startTime = request.startTime ?? Date.now();
      const { name } = request.params;

      // Read existing config file
      let rawConfig: RawConfig = {};
      if (fs.existsSync(DEFAULT_CONFIG_PATH)) {
        const content = fs.readFileSync(DEFAULT_CONFIG_PATH, "utf8");
        if (content.trim()) {
          rawConfig = yaml.parse(content) as RawConfig;
        }
      }

      // Find spoke by name
      if (!rawConfig.spokes) {
        rawConfig.spokes = [];
      }

      const spokeIndex = rawConfig.spokes.findIndex((s) => s.name === name);
      if (spokeIndex === -1) {
        return reply
          .status(404)
          .send(errorResponse("NOT_FOUND", `Spoke "${name}" not found`));
      }

      // Remove the spoke
      rawConfig.spokes.splice(spokeIndex, 1);

      // Write updated config
      const yamlContent = yaml.stringify(rawConfig, {
        indent: 2,
        lineWidth: 0,
      });
      fs.writeFileSync(DEFAULT_CONFIG_PATH, yamlContent, "utf8");

      const durationMs = Date.now() - startTime;
      return reply.send(
        successResponse(
          {
            message: `Spoke "${name}" deleted. Restart daemon to apply changes.`,
          },
          durationMs
        )
      );
    }
  );
}
