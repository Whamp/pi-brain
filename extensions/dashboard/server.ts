/**
 * HTTP + WebSocket server for the dashboard
 */

import type {
  ExtensionAPI,
  ExtensionContext,
  SessionEntry,
} from "@mariozechner/pi-coding-agent";

import { readFile } from "node:fs/promises";
import {
  createServer as createHttpServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer, type WebSocket } from "ws";

import {
  scanSessions,
  groupByProject,
  findForkRelationships,
} from "../../src/parser/analyzer.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// WebSocket message types
export interface WsMessage {
  type: string;
  data?: unknown;
  id?: string;
}

export interface SessionStateMessage extends WsMessage {
  type: "session_state";
  data: {
    sessionFile: string | null;
    sessionId: string | null;
    entries: SessionEntry[];
    branch: SessionEntry[];
    leafId: string | null;
    isStreaming: boolean;
  };
}

export interface EntryAddedMessage extends WsMessage {
  type: "entry_added";
  data: SessionEntry;
}

export interface LeafChangedMessage extends WsMessage {
  type: "leaf_changed";
  data: {
    oldLeafId: string | null;
    newLeafId: string | null;
  };
}

export interface AgentStatusMessage extends WsMessage {
  type: "agent_status";
  data: {
    isStreaming: boolean;
    isCompacting: boolean;
  };
}

// Incoming WebSocket commands
export interface NavigateCommand {
  type: "navigate";
  entryId: string;
  summarize?: boolean;
}

export interface ForkCommand {
  type: "fork";
  entryId: string;
}

export interface SwitchSessionCommand {
  type: "switch_session";
  sessionPath: string;
}

export interface ListSessionsCommand {
  type: "list_sessions";
}

export interface GetStateCommand {
  type: "get_state";
  id?: string;
}

export interface SummarizeCommand {
  type: "summarize";
  entryId: string;
}

export type IncomingCommand =
  | NavigateCommand
  | ForkCommand
  | SwitchSessionCommand
  | ListSessionsCommand
  | GetStateCommand
  | SummarizeCommand;

/**
 * Action queued for execution via /dashboard-exec command
 * This pattern allows WebSocket handlers to request actions that require ExtensionCommandContext
 */
export interface DashboardAction {
  type: "navigate" | "fork" | "switch" | "summarize";
  entryId?: string;
  sessionPath?: string;
  summarize?: boolean;
}

export interface DashboardServerOptions {
  port: number;
  ctx: ExtensionContext;
  pi: ExtensionAPI;
  getSessionData: () => {
    sessionFile: string | null;
    sessionId: string | null;
    entries: SessionEntry[];
    branch: SessionEntry[];
    leafId: string | null;
    isStreaming: boolean;
  };
  /** Queue an action for execution via /dashboard-exec command */
  queueAction: (action: DashboardAction) => void;
}

export interface DashboardServer {
  port: number;
  broadcast: (message: WsMessage) => void;
  close: () => void;
}

/**
 * Create HTTP + WebSocket server for the dashboard
 */
export async function createServer(
  options: DashboardServerOptions
): Promise<DashboardServer> {
  const { port, getSessionData, queueAction } = options;

  const clients = new Set<WebSocket>();

  // MIME types for static files
  const mimeTypes: Record<string, string> = {
    ".css": "text/css",
    ".html": "text/html",
    ".js": "application/javascript",
    ".json": "application/json",
    ".png": "image/png",
    ".svg": "image/svg+xml",
  };

  /**
   * Serve static files from web directory
   */
  async function serveStatic(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<boolean> {
    const url = req.url || "/";
    const path = url === "/" ? "/index.html" : url;

    // Security: prevent directory traversal
    if (path.includes("..")) {
      res.writeHead(403);
      res.end("Forbidden");
      return true;
    }

    const filePath = join(__dirname, "web", path);
    const ext = path.slice(path.lastIndexOf("."));
    const contentType = mimeTypes[ext] || "application/octet-stream";

    try {
      const content = await readFile(filePath);
      res.writeHead(200, { "Content-Type": contentType });
      res.end(content);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Handle API requests
   */
  function handleApi(req: IncomingMessage, res: ServerResponse): boolean {
    const url = req.url || "";

    if (url === "/api/state") {
      const data = getSessionData();
      res.writeHead(200, {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      });
      res.end(JSON.stringify(data));
      return true;
    }

    return false;
  }

  // Create HTTP server
  const httpServer = createHttpServer(async (req, res) => {
    // Try API first
    if (handleApi(req, res)) {
      return;
    }

    // Try static files
    if (await serveStatic(req, res)) {
      return;
    }

    // 404
    res.writeHead(404);
    res.end("Not Found");
  });

  // Create WebSocket server
  const wss = new WebSocketServer({ server: httpServer });

  wss.on("connection", (ws) => {
    clients.add(ws);

    // Send initial state
    const state = getSessionData();
    ws.send(
      JSON.stringify({
        data: state,
        type: "session_state",
      })
    );

    ws.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString()) as IncomingCommand;
        await handleCommand(ws, message);
      } catch (error) {
        ws.send(
          JSON.stringify({
            data: { message: String(error) },
            type: "error",
          })
        );
      }
    });

    ws.on("close", () => {
      clients.delete(ws);
    });

    ws.on("error", () => {
      clients.delete(ws);
    });
  });

  /**
   * Handle incoming WebSocket commands
   */
  async function handleCommand(ws: WebSocket, command: IncomingCommand) {
    switch (command.type) {
      case "get_state": {
        const state = getSessionData();
        ws.send(
          JSON.stringify({
            data: state,
            id: command.id,
            type: "response",
          })
        );
        break;
      }

      case "navigate": {
        queueAction({
          entryId: command.entryId,
          summarize: command.summarize ?? false,
          type: "navigate",
        });
        ws.send(
          JSON.stringify({
            data: { queued: true },
            type: "response",
          })
        );
        break;
      }

      case "fork": {
        queueAction({
          entryId: command.entryId,
          type: "fork",
        });
        ws.send(
          JSON.stringify({
            data: { queued: true },
            type: "response",
          })
        );
        break;
      }

      case "switch_session": {
        queueAction({
          sessionPath: command.sessionPath,
          type: "switch",
        });
        ws.send(
          JSON.stringify({
            data: { queued: true },
            type: "response",
          })
        );
        break;
      }

      case "summarize": {
        queueAction({
          entryId: command.entryId,
          type: "summarize",
        });
        ws.send(
          JSON.stringify({
            data: { queued: true },
            type: "response",
          })
        );
        break;
      }

      case "list_sessions": {
        try {
          const sessions = await scanSessions();
          const projects = groupByProject(sessions);
          const forks = findForkRelationships(sessions);

          ws.send(
            JSON.stringify({
              data: {
                forks,
                projects,
                totalSessions: sessions.length,
              },
              type: "response",
            })
          );
        } catch (error) {
          ws.send(
            JSON.stringify({
              data: { message: `Failed to list sessions: ${error}` },
              type: "error",
            })
          );
        }
        break;
      }

      default: {
        // Exhaustive check - command.type is never at this point
        const _exhaustiveCheck: never = command;
        ws.send(
          JSON.stringify({
            data: {
              message: `Unknown command type: ${(_exhaustiveCheck as { type: string }).type}`,
            },
            type: "error",
          })
        );
        break;
      }
    }
  }

  /**
   * Broadcast message to all connected clients
   */
  function broadcast(message: WsMessage) {
    const json = JSON.stringify(message);
    for (const client of clients) {
      if (client.readyState === 1) {
        // OPEN
        client.send(json);
      }
    }
  }

  // Start server
  return new Promise((resolve, reject) => {
    httpServer.on("error", reject);

    httpServer.listen(port, () => {
      resolve({
        broadcast,
        close: () => {
          wss.close();
          httpServer.close();
        },
        port,
      });
    });
  });
}
