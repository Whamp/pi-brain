/**
 * Daemon module - file watching and analysis queue
 *
 * This module contains:
 * - watcher.ts - File system watching (inotify/chokidar)
 * - watcher-events.ts - Event types for the watcher
 * - queue.ts - Analysis job queue (TODO: Phase 3.2)
 * - processor.ts - Job processing and pi agent invocation (TODO: Phase 3.4)
 * - cli.ts - Daemon CLI (start, stop, status) (TODO: Phase 3.9)
 */

// Export watcher functionality
export {
  SessionWatcher,
  createWatcher,
  isSessionFile,
  getSessionName,
  getProjectFromSessionPath,
  DEFAULT_WATCHER_CONFIG,
  type SessionState,
  type WatcherConfig,
} from "./watcher.js";

// Export watcher events
export {
  SESSION_EVENTS,
  createSessionEvent,
  createErrorEvent,
  createReadyEvent,
  isSessionEvent,
  isErrorEvent,
  getSessionPath,
  getEventError,
  type SessionEventDetail,
  type ErrorEventDetail,
  type SessionEventName,
} from "./watcher-events.js";

/** Daemon module version */
export const DAEMON_MODULE_VERSION = "0.1.0";
