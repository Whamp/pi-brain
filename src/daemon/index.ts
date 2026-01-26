/**
 * Daemon module - file watching and analysis queue
 *
 * This module contains:
 * - watcher.ts - File system watching (inotify/chokidar)
 * - watcher-events.ts - Event types for the watcher
 * - queue.ts - Analysis job queue (SQLite-backed)
 * - processor.ts - Job processing and pi agent invocation
 * - cli.ts - Daemon CLI (start, stop, status)
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

// Export queue functionality
export {
  QueueManager,
  createQueueManager,
  generateJobId,
  PRIORITY,
  type JobType,
  type JobStatus,
  type JobContext,
  type JobInput,
  type AnalysisJob,
  type QueueStats,
} from "./queue.js";

// Export processor functionality
export {
  JobProcessor,
  createProcessor,
  invokeAgent,
  parseAgentOutput,
  extractNodeFromText,
  isValidNodeOutput,
  buildAnalysisPrompt,
  buildSkillsArg,
  getSkillAvailability,
  checkSkillAvailable,
  validateRequiredSkills,
  consoleLogger,
  REQUIRED_SKILLS,
  OPTIONAL_SKILLS,
  SKILLS_DIR,
  type AgentResult,
  type AgentNodeOutput,
  type SkillInfo,
  type ProcessorLogger,
  type ProcessorConfig,
} from "./processor.js";

// Export error handling functionality
export {
  classifyError,
  classifyErrorWithContext,
  calculateRetryDelay,
  calculateRetryDelayMinutes,
  formatErrorForStorage,
  parseStoredError,
  isRetryableError,
  isPermanentError,
  createTypedError,
  createFileNotFoundError,
  createInvalidSessionError,
  createTimeoutError,
  createRateLimitError,
  createValidationError,
  DEFAULT_RETRY_POLICY,
  type RetryPolicy,
  type ErrorCategory,
  type ErrorCategoryType,
  type ClassifiedError,
} from "./errors.js";

// Export worker functionality
export {
  Worker,
  createWorker,
  processSingleJob,
  handleJobError,
  type WorkerConfig,
  type WorkerStatus,
  type JobProcessingResult,
} from "./worker.js";

// Export CLI functionality
export {
  PID_FILE,
  LOG_FILE,
  readPidFile,
  writePidFile,
  removePidFile,
  isProcessRunning,
  isDaemonRunning,
  formatUptime,
  getProcessUptime,
  startDaemon,
  stopDaemon,
  getDaemonStatus,
  getQueueStatus,
  queueAnalysis,
  runHealthChecks,
  formatDaemonStatus,
  formatQueueStatus,
  formatHealthStatus,
  type DaemonStatus,
  type QueueStatus,
  type HealthCheckResult,
  type HealthStatus,
  type OutputOptions,
  type StartOptions,
  type StopOptions,
} from "./cli.js";

/** Daemon module version */
export const DAEMON_MODULE_VERSION = "0.1.0";
