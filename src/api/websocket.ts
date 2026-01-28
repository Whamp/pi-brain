/**
 * WebSocket handler for real-time updates
 *
 * Manages WebSocket connections, subscriptions, and event broadcasting.
 * Based on specs/api.md WebSocket API specification.
 */

import type { FastifyInstance, FastifyRequest } from "fastify";
import type { WebSocket } from "ws";

import type { AnalysisJob } from "../daemon/queue.js";
import type { Node } from "../storage/node-types.js";

// =============================================================================
// Constants
// =============================================================================

/** WebSocket ready state values (mirrors WebSocket.OPEN, etc.) */
const WS_READY_STATE = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
} as const;

// =============================================================================
// Types
// =============================================================================

/** Available subscription channels */
export type WSChannel = "daemon" | "analysis" | "node" | "queue";

/** WebSocket message types from server to client */
export type WSEventType =
  | "daemon.status"
  | "analysis.started"
  | "analysis.completed"
  | "analysis.failed"
  | "node.created"
  | "queue.updated"
  | "subscribed"
  | "error";

/** Message format for WebSocket events */
export interface WSMessage {
  type: WSEventType;
  data?: unknown;
  timestamp: string;
}

/** Client subscription request */
interface SubscribeMessage {
  type: "subscribe";
  channels: WSChannel[];
}

/** Client message union type */
type ClientMessage = SubscribeMessage;

/** Connected client with subscriptions */
interface WSClient {
  socket: WebSocket;
  subscriptions: Set<WSChannel>;
  connectedAt: Date;
}

// =============================================================================
// WebSocket Manager
// =============================================================================

/**
 * Manages WebSocket connections and broadcasts events
 */
export class WebSocketManager {
  private clients = new Set<WSClient>();
  private readonly logger: {
    info: (msg: string) => void;
    error: (msg: string) => void;
    debug: (msg: string) => void;
  };

  constructor(logger?: {
    info: (msg: string) => void;
    error: (msg: string) => void;
    debug: (msg: string) => void;
  }) {
    this.logger = logger ?? {
      info: (msg: string) => console.log(`[ws] ${msg}`),
      error: (msg: string) => console.error(`[ws] ${msg}`),
      debug: (msg: string) => console.debug(`[ws] ${msg}`),
    };
  }

  /**
   * Handle a new WebSocket connection
   */
  handleConnection(socket: WebSocket): void {
    const client: WSClient = {
      socket,
      subscriptions: new Set(),
      connectedAt: new Date(),
    };

    this.clients.add(client);
    this.logger.info(
      `Client connected (${this.clients.size} total connections)`
    );

    socket.on("message", (data: Buffer | string) => {
      this.handleMessage(client, data);
    });

    socket.on("close", () => {
      this.clients.delete(client);
      this.logger.info(
        `Client disconnected (${this.clients.size} remaining connections)`
      );
    });

    socket.on("error", (error) => {
      this.logger.error(`WebSocket error: ${error.message}`);
      this.clients.delete(client);
    });
  }

  /**
   * Handle incoming message from client
   */
  private handleMessage(client: WSClient, data: Buffer | string): void {
    try {
      const message = JSON.parse(data.toString()) as ClientMessage;

      switch (message.type) {
        case "subscribe": {
          this.handleSubscribe(client, message);
          break;
        }
        default: {
          this.sendToClient(client, {
            type: "error",
            data: {
              message: `Unknown message type: ${(message as { type: string }).type}`,
            },
            timestamp: new Date().toISOString(),
          });
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to parse message: ${error instanceof Error ? error.message : String(error)}`
      );
      this.sendToClient(client, {
        type: "error",
        data: { message: "Invalid JSON message" },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Handle subscription request
   */
  private handleSubscribe(client: WSClient, message: SubscribeMessage): void {
    const validChannels = new Set<WSChannel>([
      "daemon",
      "analysis",
      "node",
      "queue",
    ]);

    // Validate that channels is actually an array
    if (!Array.isArray(message.channels)) {
      this.sendToClient(client, {
        type: "error",
        data: { message: "channels must be an array" },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    for (const channel of message.channels) {
      if (validChannels.has(channel)) {
        client.subscriptions.add(channel);
      }
    }

    this.logger.debug(
      `Client subscribed to: ${[...client.subscriptions].join(", ")}`
    );

    this.sendToClient(client, {
      type: "subscribed",
      data: { channels: [...client.subscriptions] },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send message to a specific client
   */
  private sendToClient(client: WSClient, message: WSMessage): void {
    if (client.socket.readyState === WS_READY_STATE.OPEN) {
      try {
        client.socket.send(JSON.stringify(message));
      } catch (error) {
        this.logger.error(
          `Failed to send message: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }

  /**
   * Broadcast message to all subscribed clients
   */
  broadcast(channel: WSChannel, message: WSMessage): void {
    let sentCount = 0;

    for (const client of this.clients) {
      if (client.subscriptions.has(channel)) {
        this.sendToClient(client, message);
        sentCount++;
      }
    }

    this.logger.debug(
      `Broadcast ${message.type} to ${sentCount} clients on channel ${channel}`
    );
  }

  /**
   * Get connected client count
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Close all connections
   */
  closeAll(): void {
    for (const client of this.clients) {
      client.socket.close(1001, "Server shutting down");
    }
    this.clients.clear();
  }

  // =========================================================================
  // Event Broadcasting Helpers
  // =========================================================================

  /**
   * Broadcast daemon status update
   */
  broadcastDaemonStatus(status: {
    running: boolean;
    workers?: { active: number; idle: number };
    queue?: { pending: number; running: number };
  }): void {
    this.broadcast("daemon", {
      type: "daemon.status",
      data: status,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast analysis started event
   */
  broadcastAnalysisStarted(job: AnalysisJob, workerId: string): void {
    this.broadcast("analysis", {
      type: "analysis.started",
      data: {
        jobId: job.id,
        sessionFile: job.sessionFile,
        workerId,
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast analysis completed event
   */
  broadcastAnalysisCompleted(job: AnalysisJob, node: Node): void {
    this.broadcast("analysis", {
      type: "analysis.completed",
      data: {
        jobId: job.id,
        nodeId: node.id,
        summary: node.content.summary,
      },
      timestamp: new Date().toISOString(),
    });

    // Also broadcast node.created on the node channel
    this.broadcast("node", {
      type: "node.created",
      data: {
        nodeId: node.id,
        project: node.classification.project,
        type: node.classification.type,
        summary: node.content.summary,
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast analysis failed event
   */
  broadcastAnalysisFailed(
    job: AnalysisJob,
    error: Error,
    willRetry: boolean
  ): void {
    this.broadcast("analysis", {
      type: "analysis.failed",
      data: {
        jobId: job.id,
        error: error.message,
        willRetry,
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast queue update event
   */
  broadcastQueueUpdate(stats: {
    pending: number;
    running: number;
    completed: number;
    failed: number;
  }): void {
    this.broadcast("queue", {
      type: "queue.updated",
      data: stats,
      timestamp: new Date().toISOString(),
    });
  }
}

// =============================================================================
// Fastify Route Registration
// =============================================================================

/**
 * Register the WebSocket route on a Fastify instance
 */
export function registerWebSocketRoute(
  app: FastifyInstance,
  wsManager: WebSocketManager
): void {
  // Use an async function to match @fastify/websocket's expected signature
  app.get(
    "/ws",
    { websocket: true },
    (socket: WebSocket, _request: FastifyRequest) => {
      wsManager.handleConnection(socket);
    }
  );
}

// =============================================================================
// Singleton for simple use cases
// =============================================================================

let globalWSManager: WebSocketManager | null = null;

/**
 * Get or create the global WebSocket manager
 */
export function getWebSocketManager(): WebSocketManager {
  if (!globalWSManager) {
    globalWSManager = new WebSocketManager();
  }
  return globalWSManager;
}

/**
 * Set the global WebSocket manager (for testing or custom config)
 */
export function setWebSocketManager(manager: WebSocketManager): void {
  globalWSManager = manager;
}
