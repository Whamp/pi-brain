/**
 * API response helpers
 *
 * Shared response formatting utilities used by all route handlers.
 */

/**
 * API response wrapper for success
 */
export function successResponse<T>(data: T, durationMs?: number) {
  return {
    status: "success" as const,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      duration_ms: durationMs ?? 0,
    },
  };
}

/**
 * API error codes
 */
export type ApiErrorCode =
  | "BAD_REQUEST"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR"
  | "SERVICE_UNAVAILABLE";

/**
 * API response wrapper for errors
 */
export function errorResponse(
  code: ApiErrorCode,
  message: string,
  details?: Record<string, unknown>
) {
  return {
    status: "error" as const,
    error: {
      code,
      message,
      details,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  };
}
