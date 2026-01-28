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
export type { ServerContext, ApiErrorCode, ServerResult } from "./server.js";

export {
  WebSocketManager,
  registerWebSocketRoute,
  getWebSocketManager,
  setWebSocketManager,
} from "./websocket.js";
export type { WSChannel, WSEventType, WSMessage } from "./websocket.js";
