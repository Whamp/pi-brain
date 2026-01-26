/**
 * API module - REST and WebSocket endpoints
 *
 * This module provides the HTTP API server for pi-brain.
 */

export {
  createServer,
  startServer,
  successResponse,
  errorResponse,
} from "./server.js";
export type { ServerContext, ApiErrorCode } from "./server.js";
