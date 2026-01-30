/**
 * Structured logger for pi-brain daemon and components.
 *
 * This module intentionally wraps console.log to provide structured,
 * timestamped logging with prefixes. It's excluded from the no-console-log
 * semgrep rule since it's the canonical logging implementation.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface Logger {
  debug: (msg: string, ...args: unknown[]) => void;
  info: (msg: string, ...args: unknown[]) => void;
  warn: (msg: string, ...args: unknown[]) => void;
  error: (msg: string, ...args: unknown[]) => void;
}

/**
 * Global log level. Set via LOG_LEVEL environment variable.
 * Only messages at or above this level will be output.
 */
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function getLogLevel(): number {
  const envLevel = process.env["LOG_LEVEL"]?.toLowerCase() as LogLevel;
  return LOG_LEVELS[envLevel] ?? LOG_LEVELS.info;
}

/**
 * Creates a logger instance with a specific prefix.
 *
 * @param {string} prefix - Component identifier (e.g., "daemon", "worker", "scheduler")
 * @returns {Logger} Logger instance with debug, info, warn, and error methods
 *
 * @example
 * ```typescript
 * const log = createLogger("daemon");
 * log.info("Starting daemon...");
 * // Output: [2026-01-30T10:30:00.000Z] [daemon] Starting daemon...
 *
 * log.error("Failed to connect", { host: "localhost", port: 5432 });
 * // Output: [2026-01-30T10:30:00.000Z] [daemon] Failed to connect { host: 'localhost', port: 5432 }
 * ```
 */
export function createLogger(prefix: string): Logger {
  const log = (level: LogLevel, msg: string, ...args: unknown[]) => {
    const currentLevel = getLogLevel();
    if (LOG_LEVELS[level] < currentLevel) {
      return;
    }

    const timestamp = new Date().toISOString();
    const formatted = `[${timestamp}] [${prefix}] ${msg}`;

    // Use the appropriate console method for each level
    // nosemgrep: no-console-log - This is the logger implementation
    switch (level) {
      case "debug": {
        console.debug(formatted, ...args);
        break;
      }
      case "info": {
        console.log(formatted, ...args);
        break;
      }
      case "warn": {
        console.warn(formatted, ...args);
        break;
      }
      case "error": {
        console.error(formatted, ...args);
        break;
      }
      default: {
        // Exhaustive check - this should never happen with LogLevel type
        const _exhaustive: never = level;
        console.log(formatted, _exhaustive, ...args);
      }
    }
  };

  return {
    debug: (msg, ...args) => log("debug", msg, ...args),
    info: (msg, ...args) => log("info", msg, ...args),
    warn: (msg, ...args) => log("warn", msg, ...args),
    error: (msg, ...args) => log("error", msg, ...args),
  };
}

/**
 * Pre-configured logger instances for common components.
 * Use these for consistency, or create custom loggers with createLogger().
 */
export const daemonLogger = createLogger("daemon");
export const workerLogger = createLogger("worker");
export const schedulerLogger = createLogger("scheduler");
export const websocketLogger = createLogger("ws");
export const apiLogger = createLogger("api");
