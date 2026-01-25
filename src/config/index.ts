/**
 * Configuration module for pi-brain
 */

export type {
  PiBrainConfig,
  HubConfig,
  DaemonConfig,
  QueryConfig,
  SpokeConfig,
  SyncMethod,
  RawConfig,
} from "./types.js";

export {
  loadConfig,
  getDefaultConfig,
  getDefaultHubConfig,
  getDefaultDaemonConfig,
  getDefaultQueryConfig,
  transformConfig,
  expandPath,
  ensureConfigDir,
  ensureDirectories,
  writeDefaultConfig,
  getSessionDirs,
  ConfigError,
  DEFAULT_CONFIG_DIR,
  DEFAULT_CONFIG_PATH,
} from "./config.js";
