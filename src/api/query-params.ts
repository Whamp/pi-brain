/**
 * Query parameter parsing utilities for API routes
 *
 * Shared helpers for parsing and validating query string parameters.
 */

import type { FastifyBaseLogger } from "fastify";

/**
 * Parse an integer query parameter
 * @param {string | undefined} value - The string value to parse
 * @param {string} [paramName] - Optional parameter name for debug logging
 * @param {FastifyBaseLogger} [logger] - Optional Fastify logger for debug logging
 * @returns {number | undefined} The parsed integer or undefined if invalid/missing
 */
export function parseIntParam(
  value: string | undefined,
  paramName?: string,
  logger?: FastifyBaseLogger
): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const num = Number.parseInt(value, 10);
  if (Number.isNaN(num)) {
    logger?.debug(
      { param: paramName, value },
      "Invalid integer param, using default"
    );
    return undefined;
  }
  return num;
}

/**
 * Parse a comma-separated string into an array
 * @param {string | undefined} value - The comma-separated string
 * @returns {string[] | undefined} An array of trimmed, non-empty strings or undefined
 */
export function parseArrayParam(
  value: string | undefined
): string[] | undefined {
  if (!value) {
    return undefined;
  }
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Parse a boolean query parameter
 * @param {string | undefined} value - The string value ("true", "1", "false", "0")
 * @returns {boolean | undefined} The parsed boolean or undefined if missing
 */
export function parseBooleanParam(
  value: string | undefined
): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }
  return value === "true" || value === "1";
}
