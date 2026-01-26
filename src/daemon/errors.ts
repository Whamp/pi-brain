/**
 * Error Handling and Retry Logic
 *
 * Classifies errors and determines retry behavior for analysis jobs.
 * Based on specs/daemon.md error handling specification.
 */

import type { JobContext } from "./queue.js";

// =============================================================================
// Types
// =============================================================================

/** Retry policy configuration */
export interface RetryPolicy {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Base delay in seconds for exponential backoff */
  baseDelaySeconds: number;
  /** Maximum delay in seconds (cap for exponential growth) */
  maxDelaySeconds: number;
  /** Multiplier for exponential backoff */
  backoffMultiplier: number;
}

/** Error category types */
export type ErrorCategoryType = "transient" | "permanent" | "unknown";

/** Error category - determines retry behavior */
export type ErrorCategory =
  | {
      type: "transient";
      retryable: true;
      /** Suggested max retries for this error type */
      maxRetries: number;
      /** Reason for classification */
      reason: string;
    }
  | {
      type: "permanent";
      retryable: false;
      /** Why this error is permanent */
      reason: string;
    }
  | {
      type: "unknown";
      retryable: true;
      /** Default max retries for unknown errors */
      maxRetries: number;
      /** Original error message */
      reason: string;
    };

/** Classified error with metadata */
export interface ClassifiedError {
  /** Original error */
  original: Error;
  /** Error category */
  category: ErrorCategory;
  /** Whether the error should be retried */
  shouldRetry: boolean;
  /** Suggested delay before retry (seconds) */
  retryDelaySeconds?: number;
  /** Human-readable description */
  description: string;
}

// =============================================================================
// Default Configuration
// =============================================================================

/** Default retry policy */
export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 3,
  baseDelaySeconds: 60,
  maxDelaySeconds: 3600, // 1 hour max
  backoffMultiplier: 2,
};

// =============================================================================
// Error Classification
// =============================================================================

/**
 * Error patterns for classification
 * Order matters - first match wins
 */
const ERROR_PATTERNS: {
  patterns: RegExp[];
  category: () => ErrorCategory;
}[] = [
  // Permanent: File not found (session, prompt, or other required files)
  {
    patterns: [
      /enoent/i,
      /file not found/i,
      /no such file/i,
      /prompt file not found/i,
      /session file not found/i,
    ],
    category: () => ({
      type: "permanent",
      retryable: false,
      reason: "Required file not found",
    }),
  },

  // Permanent: Invalid session format
  {
    patterns: [
      /invalid session header/i,
      /malformed session/i,
      /invalid jsonl/i,
    ],
    category: () => ({
      type: "permanent",
      retryable: false,
      reason: "Malformed session file",
    }),
  },

  // Permanent: Empty session
  {
    patterns: [/empty session/i, /no entries/i],
    category: () => ({
      type: "permanent",
      retryable: false,
      reason: "Empty session file",
    }),
  },

  // Permanent: Schema validation failure (likely analyzer bug)
  {
    patterns: [/schema validation/i, /invalid node output/i],
    category: () => ({
      type: "permanent",
      retryable: false,
      reason: "Output validation failed",
    }),
  },

  // Permanent: Missing required skills
  {
    patterns: [/missing required skills/i],
    category: () => ({
      type: "permanent",
      retryable: false,
      reason: "Required skills not installed",
    }),
  },

  // Transient: Timeout
  {
    patterns: [/timeout/i, /etimedout/i, /timed out/i],
    category: () => ({
      type: "transient",
      retryable: true,
      maxRetries: 3,
      reason: "Analysis timed out",
    }),
  },

  // Transient: Rate limiting
  {
    patterns: [/rate limit/i, /429/i, /too many requests/i],
    category: () => ({
      type: "transient",
      retryable: true,
      maxRetries: 5, // More retries for rate limits
      reason: "Rate limited by API",
    }),
  },

  // Transient: Connection issues
  {
    patterns: [
      /econnrefused/i,
      /connection refused/i,
      /econnreset/i,
      /connection reset/i,
      /enetunreach/i,
      /network unreachable/i,
    ],
    category: () => ({
      type: "transient",
      retryable: true,
      maxRetries: 3,
      reason: "Network connection failed",
    }),
  },

  // Transient: Model overload
  {
    patterns: [/overloaded/i, /capacity/i, /503/i, /service unavailable/i],
    category: () => ({
      type: "transient",
      retryable: true,
      maxRetries: 5,
      reason: "Model service overloaded",
    }),
  },

  // Transient: Server errors
  {
    patterns: [/500/i, /internal server error/i, /502/i, /bad gateway/i],
    category: () => ({
      type: "transient",
      retryable: true,
      maxRetries: 3,
      reason: "Server error",
    }),
  },

  // Transient: Process spawn issues
  {
    patterns: [/failed to spawn/i, /enoent.*pi/i, /command not found/i],
    category: () => ({
      type: "transient",
      retryable: true,
      maxRetries: 2,
      reason: "Failed to spawn pi process",
    }),
  },

  // Transient: Storage issues
  {
    patterns: [/sqlite.*busy/i, /database is locked/i],
    category: () => ({
      type: "transient",
      retryable: true,
      maxRetries: 5,
      reason: "Database temporarily locked",
    }),
  },

  // Transient: Disk space
  {
    patterns: [/enospc/i, /no space left/i, /disk full/i],
    category: () => ({
      type: "transient",
      retryable: true,
      maxRetries: 2,
      reason: "Disk space issue",
    }),
  },
];

/**
 * Classify an error to determine retry behavior
 */
export function classifyError(
  error: Error,
  _context?: JobContext
): ErrorCategory {
  const message = error.message.toLowerCase();

  // Check against known patterns
  for (const { patterns, category } of ERROR_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(message)) {
        return category();
      }
    }
  }

  // Unknown error - retry with limited attempts
  return {
    type: "unknown",
    retryable: true,
    maxRetries: 2,
    reason: error.message.slice(0, 200),
  };
}

/**
 * Classify an error with full context
 */
export function classifyErrorWithContext(
  error: Error,
  retryCount: number,
  maxRetries: number,
  policy: RetryPolicy = DEFAULT_RETRY_POLICY
): ClassifiedError {
  const category = classifyError(error);

  // Check if we should retry
  const effectiveMaxRetries = category.retryable
    ? Math.min(
        category.type === "unknown" ? category.maxRetries : category.maxRetries,
        maxRetries
      )
    : 0;

  const shouldRetry = category.retryable && retryCount < effectiveMaxRetries;

  // Calculate retry delay if retrying
  const retryDelaySeconds = shouldRetry
    ? calculateRetryDelay(retryCount, policy)
    : undefined;

  return {
    original: error,
    category,
    shouldRetry,
    retryDelaySeconds,
    description: formatErrorDescription(error, category),
  };
}

// =============================================================================
// Retry Delay Calculation
// =============================================================================

/**
 * Calculate retry delay with exponential backoff
 */
export function calculateRetryDelay(
  retryCount: number,
  policy: RetryPolicy = DEFAULT_RETRY_POLICY
): number {
  const delay =
    policy.baseDelaySeconds * policy.backoffMultiplier ** retryCount;
  return Math.min(delay, policy.maxDelaySeconds);
}

/**
 * Calculate retry delay in minutes (for queue integration)
 */
export function calculateRetryDelayMinutes(
  retryCount: number,
  policy: RetryPolicy = DEFAULT_RETRY_POLICY
): number {
  return Math.ceil(calculateRetryDelay(retryCount, policy) / 60);
}

// =============================================================================
// Error Formatting
// =============================================================================

/**
 * Format error description for logging/storage
 */
function formatErrorDescription(error: Error, category: ErrorCategory): string {
  const prefix = `[${category.type.toUpperCase()}]`;
  const { reason } = category;

  if (category.retryable) {
    return `${prefix} ${reason} (will retry)`;
  }
  return `${prefix} ${reason} (permanent failure)`;
}

/**
 * Format error for storage in database
 */
export function formatErrorForStorage(
  error: Error,
  category?: ErrorCategory
): string {
  const cat = category ?? classifyError(error);
  const timestamp = new Date().toISOString();

  return JSON.stringify({
    timestamp,
    type: cat.type,
    reason: cat.reason,
    message: error.message.slice(0, 1000),
    stack: error.stack?.slice(0, 2000),
  });
}

/**
 * Parse stored error back to object
 */
export function parseStoredError(stored: string): {
  timestamp: string;
  type: ErrorCategoryType;
  reason: string;
  message: string;
  stack?: string;
} | null {
  try {
    return JSON.parse(stored) as {
      timestamp: string;
      type: ErrorCategoryType;
      reason: string;
      message: string;
      stack?: string;
    };
  } catch {
    return null;
  }
}

// =============================================================================
// Error Helpers
// =============================================================================

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: Error): boolean {
  return classifyError(error).retryable;
}

/**
 * Check if an error is permanent
 */
export function isPermanentError(error: Error): boolean {
  return classifyError(error).type === "permanent";
}

/**
 * Create a typed error with a specific category
 */
export function createTypedError(
  message: string,
  type: ErrorCategoryType
): Error {
  const prefixes: Record<ErrorCategoryType, string> = {
    permanent: "[PERMANENT]",
    transient: "[TRANSIENT]",
    unknown: "[UNKNOWN]",
  };
  return new Error(`${prefixes[type]} ${message}`);
}

// =============================================================================
// Specific Error Factories
// =============================================================================

/** Create a "file not found" error */
export function createFileNotFoundError(path: string): Error {
  return new Error(`ENOENT: no such file or directory: ${path}`);
}

/** Create a "session invalid" error */
export function createInvalidSessionError(reason: string): Error {
  return new Error(`Invalid session header: ${reason}`);
}

/** Create a "timeout" error */
export function createTimeoutError(durationMinutes: number): Error {
  return new Error(`Analysis timed out after ${durationMinutes} minutes`);
}

/** Create a "rate limit" error */
export function createRateLimitError(retryAfter?: number): Error {
  const suffix = retryAfter ? ` (retry after ${retryAfter}s)` : "";
  return new Error(`Rate limit exceeded${suffix}`);
}

/** Create a "validation" error */
export function createValidationError(details: string): Error {
  return new Error(`Schema validation failed: ${details}`);
}
