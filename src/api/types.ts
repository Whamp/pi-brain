/**
 * API Types - Shared types for the API layer
 *
 * This module provides types that need to be shared across the API layer
 * without creating circular dependencies.
 */

import type { Database } from "better-sqlite3";

import type { ApiConfig, DaemonConfig } from "../config/types.js";

/**
 * Server context passed to route handlers
 */
export interface ServerContext {
  db: Database;
  config: ApiConfig;
  /** Optional full daemon config for routes that need it (e.g., query) */
  daemonConfig?: DaemonConfig;
}
