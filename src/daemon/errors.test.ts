/**
 * Tests for error handling and retry logic
 */

import { describe, expect, it } from "vitest";

import {
  calculateRetryDelay,
  calculateRetryDelayMinutes,
  classifyError,
  classifyErrorWithContext,
  createFileNotFoundError,
  createInvalidSessionError,
  createRateLimitError,
  createTimeoutError,
  createTypedError,
  createValidationError,
  DEFAULT_RETRY_POLICY,
  formatErrorForStorage,
  isPermanentError,
  isRetryableError,
  parseStoredError,
  type RetryPolicy,
} from "./errors.js";

// =============================================================================
// Error Classification Tests
// =============================================================================

describe("classifyError", () => {
  describe("permanent errors", () => {
    it("classifies ENOENT as permanent", () => {
      const error = new Error("ENOENT: no such file or directory");
      const category = classifyError(error);

      expect(category.type).toBe("permanent");
      expect(category.retryable).toBeFalsy();
      expect(category.reason).toBe("Required file not found");
    });

    it("classifies file not found as permanent", () => {
      const error = new Error("File not found: /path/to/session.jsonl");
      const category = classifyError(error);

      expect(category.type).toBe("permanent");
      expect(category.retryable).toBeFalsy();
    });

    it("classifies invalid session header as permanent", () => {
      const error = new Error("Invalid session header: missing id field");
      const category = classifyError(error);

      expect(category.type).toBe("permanent");
      expect(category.retryable).toBeFalsy();
      expect(category.reason).toBe("Malformed session file");
    });

    it("classifies empty session as permanent", () => {
      const error = new Error("Empty session file");
      const category = classifyError(error);

      expect(category.type).toBe("permanent");
      expect(category.retryable).toBeFalsy();
      expect(category.reason).toBe("Empty session file");
    });

    it("classifies schema validation failure as permanent", () => {
      const error = new Error("Schema validation failed: missing content");
      const category = classifyError(error);

      expect(category.type).toBe("permanent");
      expect(category.retryable).toBeFalsy();
      expect(category.reason).toBe("Output validation failed");
    });

    it("classifies missing required skills as permanent", () => {
      const error = new Error("Missing required skills: rlm");
      const category = classifyError(error);

      expect(category.type).toBe("permanent");
      expect(category.retryable).toBeFalsy();
      expect(category.reason).toBe("Required skills not installed");
    });
  });

  describe("transient errors", () => {
    it("classifies timeout as transient", () => {
      const error = new Error("Analysis timed out after 30 minutes");
      const category = classifyError(error);

      expect(category.type).toBe("transient");
      expect(category.retryable).toBeTruthy();
      expect((category as { maxRetries: number }).maxRetries).toBe(3);
    });

    it("classifies ETIMEDOUT as transient", () => {
      const error = new Error("ETIMEDOUT: connection timed out");
      const category = classifyError(error);

      expect(category.type).toBe("transient");
      expect(category.retryable).toBeTruthy();
    });

    it("classifies rate limit as transient with more retries", () => {
      const error = new Error("Rate limit exceeded");
      const category = classifyError(error);

      expect(category.type).toBe("transient");
      expect(category.retryable).toBeTruthy();
      expect((category as { maxRetries: number }).maxRetries).toBe(5);
    });

    it("classifies 429 as transient", () => {
      const error = new Error("Error 429: Too many requests");
      const category = classifyError(error);

      expect(category.type).toBe("transient");
      expect(category.retryable).toBeTruthy();
    });

    it("classifies ECONNREFUSED as transient", () => {
      const error = new Error("ECONNREFUSED: connection refused");
      const category = classifyError(error);

      expect(category.type).toBe("transient");
      expect(category.retryable).toBeTruthy();
      expect(category.reason).toBe("Network connection failed");
    });

    it("classifies overloaded as transient", () => {
      const error = new Error("Model is currently overloaded");
      const category = classifyError(error);

      expect(category.type).toBe("transient");
      expect(category.retryable).toBeTruthy();
      expect((category as { maxRetries: number }).maxRetries).toBe(5);
    });

    it("classifies 503 as transient", () => {
      const error = new Error("503 Service Unavailable");
      const category = classifyError(error);

      expect(category.type).toBe("transient");
      expect(category.retryable).toBeTruthy();
    });

    it("classifies 500 as transient", () => {
      const error = new Error("500 Internal Server Error");
      const category = classifyError(error);

      expect(category.type).toBe("transient");
      expect(category.retryable).toBeTruthy();
    });

    it("classifies spawn failure as transient", () => {
      const error = new Error("Failed to spawn pi process");
      const category = classifyError(error);

      expect(category.type).toBe("transient");
      expect(category.retryable).toBeTruthy();
    });

    it("classifies SQLite busy as transient", () => {
      const error = new Error("SQLITE_BUSY: database is locked");
      const category = classifyError(error);

      expect(category.type).toBe("transient");
      expect(category.retryable).toBeTruthy();
    });

    it("classifies disk full as transient", () => {
      const error = new Error("ENOSPC: no space left on device");
      const category = classifyError(error);

      expect(category.type).toBe("transient");
      expect(category.retryable).toBeTruthy();
    });
  });

  describe("unknown errors", () => {
    it("classifies unrecognized errors as unknown", () => {
      const error = new Error("Something went wrong");
      const category = classifyError(error);

      expect(category.type).toBe("unknown");
      expect(category.retryable).toBeTruthy();
      expect((category as { maxRetries: number }).maxRetries).toBe(2);
    });

    it("truncates long error messages in reason", () => {
      const longMessage = "x".repeat(300);
      const error = new Error(longMessage);
      const category = classifyError(error);

      expect(category.type).toBe("unknown");
      expect(category.reason.length).toBeLessThanOrEqual(200);
    });
  });
});

// =============================================================================
// Retry Delay Calculation Tests
// =============================================================================

describe("calculateRetryDelay", () => {
  it("calculates first retry delay correctly", () => {
    const delay = calculateRetryDelay(0);
    expect(delay).toBe(60); // baseDelaySeconds * 2^0 = 60 * 1
  });

  it("applies exponential backoff", () => {
    expect(calculateRetryDelay(0)).toBe(60);
    expect(calculateRetryDelay(1)).toBe(120);
    expect(calculateRetryDelay(2)).toBe(240);
    expect(calculateRetryDelay(3)).toBe(480);
  });

  it("caps at maxDelaySeconds", () => {
    const delay = calculateRetryDelay(20); // Would be huge without cap
    expect(delay).toBe(3600); // maxDelaySeconds
  });

  it("uses custom policy", () => {
    const policy: RetryPolicy = {
      maxRetries: 5,
      baseDelaySeconds: 10,
      maxDelaySeconds: 100,
      backoffMultiplier: 3,
    };

    expect(calculateRetryDelay(0, policy)).toBe(10);
    expect(calculateRetryDelay(1, policy)).toBe(30);
    expect(calculateRetryDelay(2, policy)).toBe(90);
    expect(calculateRetryDelay(3, policy)).toBe(100); // Capped
  });
});

describe("calculateRetryDelayMinutes", () => {
  it("converts delay to minutes (ceiling)", () => {
    // 60 seconds = 1 minute
    expect(calculateRetryDelayMinutes(0)).toBe(1);
    // 120 seconds = 2 minutes
    expect(calculateRetryDelayMinutes(1)).toBe(2);
    // 240 seconds = 4 minutes
    expect(calculateRetryDelayMinutes(2)).toBe(4);
  });

  it("rounds up partial minutes", () => {
    const policy: RetryPolicy = {
      maxRetries: 3,
      baseDelaySeconds: 90, // 1.5 minutes
      maxDelaySeconds: 3600,
      backoffMultiplier: 2,
    };

    expect(calculateRetryDelayMinutes(0, policy)).toBe(2); // ceil(1.5)
  });
});

// =============================================================================
// classifyErrorWithContext Tests
// =============================================================================

describe("classifyErrorWithContext", () => {
  it("determines shouldRetry based on retry count", () => {
    const error = new Error("Connection timeout");

    // First retry - should retry
    const first = classifyErrorWithContext(error, 0, 3);
    expect(first.shouldRetry).toBeTruthy();
    expect(first.retryDelaySeconds).toBe(60);

    // At max retries - should not retry
    const atMax = classifyErrorWithContext(error, 3, 3);
    expect(atMax.shouldRetry).toBeFalsy();
    expect(atMax.retryDelaySeconds).toBeUndefined();
  });

  it("uses effective max retries from category", () => {
    const error = new Error("Rate limit exceeded");

    // Category suggests 5 retries, but job maxRetries is 3
    const result = classifyErrorWithContext(error, 2, 3);
    expect(result.shouldRetry).toBeTruthy();

    // At job's maxRetries limit
    const atLimit = classifyErrorWithContext(error, 3, 3);
    expect(atLimit.shouldRetry).toBeFalsy();
  });

  it("never retries permanent errors", () => {
    const error = new Error("File not found");

    const result = classifyErrorWithContext(error, 0, 5);
    expect(result.shouldRetry).toBeFalsy();
    expect(result.retryDelaySeconds).toBeUndefined();
  });

  it("calculates retry delay using policy", () => {
    const error = new Error("Connection timeout");
    const policy: RetryPolicy = {
      maxRetries: 5,
      baseDelaySeconds: 30,
      maxDelaySeconds: 600,
      backoffMultiplier: 2,
    };

    const result = classifyErrorWithContext(error, 2, 5, policy);
    expect(result.retryDelaySeconds).toBe(120); // 30 * 2^2
  });

  it("includes descriptive message", () => {
    const transient = classifyErrorWithContext(new Error("timeout"), 0, 3);
    expect(transient.description).toContain("TRANSIENT");
    expect(transient.description).toContain("will retry");

    const permanent = classifyErrorWithContext(
      new Error("File not found"),
      0,
      3
    );
    expect(permanent.description).toContain("PERMANENT");
    expect(permanent.description).toContain("permanent failure");
  });
});

// =============================================================================
// Error Formatting Tests
// =============================================================================

describe("formatErrorForStorage", () => {
  it("formats error as JSON string", () => {
    const error = new Error("Test error");
    const stored = formatErrorForStorage(error);
    const parsed = JSON.parse(stored);

    expect(parsed.type).toBe("unknown");
    expect(parsed.message).toBe("Test error");
    expect(parsed.timestamp).toBeDefined();
  });

  it("uses provided category", () => {
    const error = new Error("Test");
    const stored = formatErrorForStorage(error, {
      type: "transient",
      retryable: true,
      maxRetries: 3,
      reason: "Custom reason",
    });
    const parsed = JSON.parse(stored);

    expect(parsed.type).toBe("transient");
    expect(parsed.reason).toBe("Custom reason");
  });

  it("truncates long messages", () => {
    const error = new Error("x".repeat(2000));
    const stored = formatErrorForStorage(error);
    const parsed = JSON.parse(stored);

    expect(parsed.message.length).toBeLessThanOrEqual(1000);
  });

  it("includes stack trace (truncated)", () => {
    const error = new Error("Test");
    const stored = formatErrorForStorage(error);
    const parsed = JSON.parse(stored);

    expect(parsed.stack).toBeDefined();
    expect(parsed.stack.length).toBeLessThanOrEqual(2000);
  });
});

describe("parseStoredError", () => {
  it("parses valid stored error", () => {
    const stored = JSON.stringify({
      timestamp: "2026-01-25T12:00:00Z",
      type: "transient",
      reason: "Network error",
      message: "Connection failed",
    });

    const parsed = parseStoredError(stored);
    expect(parsed).toBeDefined();
    expect(parsed?.type).toBe("transient");
    expect(parsed?.reason).toBe("Network error");
  });

  it("returns null for invalid JSON", () => {
    expect(parseStoredError("not json")).toBeNull();
    expect(parseStoredError("")).toBeNull();
  });
});

// =============================================================================
// Helper Function Tests
// =============================================================================

describe("isRetryableError", () => {
  it("returns true for transient errors", () => {
    expect(isRetryableError(new Error("timeout"))).toBeTruthy();
    expect(isRetryableError(new Error("rate limit"))).toBeTruthy();
    expect(isRetryableError(new Error("ECONNREFUSED"))).toBeTruthy();
  });

  it("returns true for unknown errors", () => {
    expect(isRetryableError(new Error("random error"))).toBeTruthy();
  });

  it("returns false for permanent errors", () => {
    expect(isRetryableError(new Error("ENOENT"))).toBeFalsy();
    expect(isRetryableError(new Error("Invalid session header"))).toBeFalsy();
  });
});

describe("isPermanentError", () => {
  it("returns true for permanent errors", () => {
    expect(isPermanentError(new Error("ENOENT"))).toBeTruthy();
    expect(isPermanentError(new Error("Empty session"))).toBeTruthy();
    expect(isPermanentError(new Error("Schema validation"))).toBeTruthy();
  });

  it("returns false for transient and unknown errors", () => {
    expect(isPermanentError(new Error("timeout"))).toBeFalsy();
    expect(isPermanentError(new Error("random error"))).toBeFalsy();
  });
});

describe("createTypedError", () => {
  it("creates error with type prefix", () => {
    const permanent = createTypedError("test", "permanent");
    expect(permanent.message).toBe("[PERMANENT] test");

    const transient = createTypedError("test", "transient");
    expect(transient.message).toBe("[TRANSIENT] test");

    const unknown = createTypedError("test", "unknown");
    expect(unknown.message).toBe("[UNKNOWN] test");
  });
});

// =============================================================================
// Error Factory Tests
// =============================================================================

describe("error factories", () => {
  it("creates file not found error", () => {
    const error = createFileNotFoundError("/path/to/file");
    expect(error.message).toContain("ENOENT");
    expect(error.message).toContain("/path/to/file");
    expect(isPermanentError(error)).toBeTruthy();
  });

  it("creates invalid session error", () => {
    const error = createInvalidSessionError("missing id");
    expect(error.message).toContain("Invalid session header");
    expect(isPermanentError(error)).toBeTruthy();
  });

  it("creates timeout error", () => {
    const error = createTimeoutError(30);
    expect(error.message).toContain("timed out");
    expect(error.message).toContain("30");
    expect(isRetryableError(error)).toBeTruthy();
  });

  it("creates rate limit error", () => {
    const error = createRateLimitError(60);
    expect(error.message).toContain("Rate limit");
    expect(error.message).toContain("60");
    expect(isRetryableError(error)).toBeTruthy();
  });

  it("creates validation error", () => {
    const error = createValidationError("missing field");
    expect(error.message).toContain("Schema validation");
    expect(isPermanentError(error)).toBeTruthy();
  });
});

// =============================================================================
// Default Policy Tests
// =============================================================================

describe("dEFAULT_RETRY_POLICY", () => {
  it("has sensible defaults", () => {
    expect(DEFAULT_RETRY_POLICY.maxRetries).toBe(3);
    expect(DEFAULT_RETRY_POLICY.baseDelaySeconds).toBe(60);
    expect(DEFAULT_RETRY_POLICY.maxDelaySeconds).toBe(3600);
    expect(DEFAULT_RETRY_POLICY.backoffMultiplier).toBe(2);
  });
});
