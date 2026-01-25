/**
 * Pi Dashboard Extension
 *
 * Provides a /dashboard command that opens a browser-based visualization
 * of the current session tree with real-time updates via WebSocket.
 *
 * Features:
 * - Real-time session tree visualization
 * - Live message streaming display
 * - Navigate tree from browser (calls pi's tree navigation)
 * - Fork from any entry
 * - Switch between sessions
 */

import  {
  type ExtensionAPI,
  type ExtensionContext,
  type ExtensionCommandContext,
} from "@mariozechner/pi-coding-agent";

import open from "open";

import {
  createServer,
  type DashboardServer,
  type DashboardAction,
} from "./server.js";

const DEFAULT_PORT = 8765;

export default function dashboardExtension(pi: ExtensionAPI) {
  let server: DashboardServer | null = null;
  let currentCtx: ExtensionContext | null = null;

  // Action queue for command proxying pattern
  // WebSocket handlers queue actions, then trigger /dashboard-exec which has proper ExtensionCommandContext
  const pendingActions: DashboardAction[] = [];

  /**
   * Queue an action and trigger execution via /dashboard-exec command
   */
  function queueAction(action: DashboardAction) {
    pendingActions.push(action);
    // Auto-trigger execution - the command handler will have proper context
    pi.sendUserMessage("/dashboard-exec", { deliverAs: "steer" });
  }

  /**
   * Start the dashboard server
   */
  async function startServer(
    ctx: ExtensionContext,
    port: number
  ): Promise<DashboardServer> {
    if (server) {
      return server;
    }

    // Set initial context
    currentCtx = ctx;

    server = await createServer({
      port,
      ctx,
      pi,
      // Use currentCtx (kept fresh via event handlers) rather than stale ctx from server start
      getSessionData: () => {
        if (!currentCtx) {
          // Fallback to original ctx if currentCtx not set (shouldn't happen)
          return buildSessionData(ctx);
        }
        return buildSessionData(currentCtx);
      },
      queueAction,
    });

    return server;
  }

  /**
   * Build session data for the dashboard
   */
  function buildSessionData(ctx: ExtensionContext) {
    const sm = ctx.sessionManager;
    const entries = sm.getEntries();
    const branch = sm.getBranch();
    const leafId = sm.getLeafId();
    const sessionFile = sm.getSessionFile();
    const sessionId = sm.getSessionId();

    return {
      branch,
      entries,
      isStreaming: !ctx.isIdle(),
      leafId,
      sessionFile,
      sessionId,
    };
  }

  /**
   * Broadcast session state to all connected clients
   */
  function broadcastSessionState() {
    if (!server || !currentCtx) {
      return;
    }

    server.broadcast({
      data: buildSessionData(currentCtx),
      type: "session_state",
    });
  }

  // Reserved for future use: streaming individual entries
  // function broadcastEntryAdded(entry: SessionEntry) { ... }

  /**
   * Broadcast agent status change
   */
  function broadcastAgentStatus(isStreaming: boolean, isCompacting = false) {
    if (!server) {
      return;
    }

    server.broadcast({
      data: { isCompacting, isStreaming },
      type: "agent_status",
    });
  }

  // Register /dashboard command
  pi.registerCommand("dashboard", {
    description: "Open session visualization dashboard in browser",
    handler: async (args, ctx) => {
      const port = args
        ? Number.parseInt(args, 10) || DEFAULT_PORT
        : DEFAULT_PORT;
      currentCtx = ctx;

      try {
        const srv = await startServer(ctx, port);
        const url = `http://localhost:${srv.port}`;

        ctx.ui.notify(`Dashboard running at ${url}`, "info");

        // Open browser
        await open(url);
      } catch (error) {
        ctx.ui.notify(`Failed to start dashboard: ${error}`, "error");
      }
    },
  });

  // Register /dashboard-nav command to navigate from dashboard
  pi.registerCommand("dashboard-nav", {
    description: "Navigate to entry (used by dashboard)",
    handler: async (args, ctx: ExtensionCommandContext) => {
      if (!args) {
        ctx.ui.notify("Usage: /dashboard-nav <entryId> [summarize]", "error");
        return;
      }

      const [entryId, summarizeArg] = args.split(" ");
      const summarize = summarizeArg === "true" || summarizeArg === "1";

      try {
        await ctx.navigateTree(entryId, { summarize });
        ctx.ui.notify(`Navigated to ${entryId.slice(0, 8)}...`, "success");
      } catch (error) {
        ctx.ui.notify(`Navigation failed: ${error}`, "error");
      }
    },
  });

  // Register /dashboard-fork command to fork from dashboard
  pi.registerCommand("dashboard-fork", {
    description: "Fork from entry (used by dashboard)",
    handler: async (args, ctx: ExtensionCommandContext) => {
      if (!args) {
        ctx.ui.notify("Usage: /dashboard-fork <entryId>", "error");
        return;
      }

      try {
        await ctx.fork(args.trim());
        ctx.ui.notify(`Forked from ${args.slice(0, 8)}...`, "success");
      } catch (error) {
        ctx.ui.notify(`Fork failed: ${error}`, "error");
      }
    },
  });

  // Register /dashboard-exec command to execute queued actions from WebSocket
  // This uses the command proxying pattern: WebSocket handlers queue actions,
  // then trigger this command which has proper ExtensionCommandContext
  pi.registerCommand("dashboard-exec", {
    description: "Execute queued dashboard action (internal)",
    handler: async (_args, ctx: ExtensionCommandContext) => {
      const action = pendingActions.shift();
      if (!action) {
        return;
      }

      switch (action.type) {
        case "navigate": {
          if (!action.entryId) {
            ctx.ui.notify("Navigate action missing entryId", "error");
            return;
          }
          try {
            await ctx.navigateTree(action.entryId, {
              summarize: action.summarize ?? false,
            });
            ctx.ui.notify(
              `Navigated to ${action.entryId.slice(0, 8)}...`,
              "success"
            );
          } catch (error) {
            ctx.ui.notify(`Navigation failed: ${error}`, "error");
          }
          break;
        }

        case "fork": {
          if (!action.entryId) {
            ctx.ui.notify("Fork action missing entryId", "error");
            return;
          }
          try {
            await ctx.fork(action.entryId);
            ctx.ui.notify(
              `Forked from ${action.entryId.slice(0, 8)}...`,
              "success"
            );
          } catch (error) {
            ctx.ui.notify(`Fork failed: ${error}`, "error");
          }
          break;
        }

        case "switch": {
          // Session switching via /resume command
          if (!action.sessionPath) {
            ctx.ui.notify("Switch action missing sessionPath", "error");
            return;
          }
          // Use pi.sendUserMessage to trigger /resume command
          // This switches to the specified session
          pi.sendUserMessage(`/resume ${action.sessionPath}`, {
            deliverAs: "steer",
          });
          ctx.ui.notify(`Switching to session...`, "info");
          break;
        }

        case "summarize": {
          // Standalone summarization of a branch
          if (!action.entryId) {
            ctx.ui.notify("Summarize action missing entryId", "error");
            return;
          }
          // Navigate to the entry with summarize flag
          // This uses Pi's built-in summarization during navigation
          try {
            await ctx.navigateTree(action.entryId, { summarize: true });
            ctx.ui.notify(
              `Summarized and navigated to ${action.entryId.slice(0, 8)}...`,
              "success"
            );
          } catch (error) {
            ctx.ui.notify(`Summarization failed: ${error}`, "error");
          }
          break;
        }
      }
    },
  });

  // Track session context
  pi.on("session_start", async (_event, ctx) => {
    currentCtx = ctx;
    broadcastSessionState();
  });

  // Broadcast updates on agent events
  pi.on("agent_start", async (_event, _ctx) => {
    broadcastAgentStatus(true, false);
  });

  pi.on("agent_end", async (_event, _ctx) => {
    broadcastAgentStatus(false, false);
    broadcastSessionState();
  });

  pi.on("turn_end", async (event, _ctx) => {
    // Broadcast the new messages from this turn
    if (event.message) {
      // The message entry will be in the session, broadcast full state
      broadcastSessionState();
    }
  });

  // Track tree navigation
  pi.on("session_tree", async (event, ctx) => {
    currentCtx = ctx;
    server?.broadcast({
      data: {
        newLeafId: event.newLeafId,
        oldLeafId: event.oldLeafId,
      },
      type: "leaf_changed",
    });
    broadcastSessionState();
  });

  // Track session switches
  pi.on("session_switch", async (_event, ctx) => {
    currentCtx = ctx;
    broadcastSessionState();
  });

  // Track forks
  pi.on("session_fork", async (_event, ctx) => {
    currentCtx = ctx;
    broadcastSessionState();
  });

  // Track compaction
  pi.on("session_before_compact", async (_event, _ctx) => {
    broadcastAgentStatus(false, true);
  });

  pi.on("session_compact", async (_event, ctx) => {
    currentCtx = ctx;
    broadcastAgentStatus(false, false);
    broadcastSessionState();
  });

  // Cleanup on shutdown
  pi.on("session_shutdown", async (_event, _ctx) => {
    if (server) {
      server.close();
      server = null;
    }
  });
}
