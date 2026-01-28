/**
 * Library exports for pi-brain
 *
 * This is the public API surface for the package.
 * Barrel file is intentional here for consumer ergonomics.
 */
/* oxlint-disable no-barrel-file */

// Types
export * from "./types.js";

// Parser module
export * from "./parser/session.js";
export * from "./parser/analyzer.js";
export * from "./parser/boundary.js";
export * from "./parser/fork.js";

// Storage module
export * from "./storage/database.js";
export * from "./storage/node-types.js";
export * from "./storage/node-storage.js";

// Config module
export * from "./config/index.js";

// Prompt module
export * from "./prompt/index.js";

// Daemon module
export {
  createWatcher,
  DEFAULT_WATCHER_CONFIG,
  DAEMON_MODULE_VERSION,
  getProjectFromSessionPath,
  getSessionName,
  isSessionFile,
  SessionWatcher,
  // Event helpers
  SESSION_EVENTS,
  createSessionEvent,
  createErrorEvent,
  createReadyEvent,
  isSessionEvent,
  isErrorEvent,
  getSessionPath,
  getEventError,
} from "./daemon/index.js";
export type {
  SessionState,
  WatcherConfig,
  SessionEventDetail,
  ErrorEventDetail,
  SessionEventName,
} from "./daemon/index.js";

// Web visualization
export * from "./web/generator.js";
