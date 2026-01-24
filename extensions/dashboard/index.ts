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

import type { ExtensionAPI, ExtensionContext, ExtensionCommandContext } from "@mariozechner/pi-coding-agent";
import { createServer, type DashboardServer } from "./server.js";
import open from "open";

const DEFAULT_PORT = 8765;

export default function dashboardExtension(pi: ExtensionAPI) {
  let server: DashboardServer | null = null;
  let currentCtx: ExtensionContext | null = null;
  
  // Navigation/fork from browser are handled via dashboard-nav/dashboard-fork commands

  /**
   * Start the dashboard server
   */
  async function startServer(ctx: ExtensionContext, port: number): Promise<DashboardServer> {
    if (server) {
      return server;
    }

    server = await createServer({
      port,
      ctx,
      pi,
      getSessionData: () => buildSessionData(ctx),
      onNavigate: async (entryId, summarize) => {
        // Notify user - they can use /dashboard-nav command
        ctx.ui.notify(`Navigate: /dashboard-nav ${entryId} ${summarize}`, "info");
      },
      onFork: async (entryId) => {
        // Notify user - they can use /dashboard-fork command
        ctx.ui.notify(`Fork: /dashboard-fork ${entryId}`, "info");
      },
      onSwitchSession: async (sessionPath) => {
        ctx.ui.notify(`Session switch requested: ${sessionPath}`, "info");
      },
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
      sessionFile,
      sessionId,
      entries,
      branch,
      leafId,
      isStreaming: !ctx.isIdle(),
    };
  }

  /**
   * Broadcast session state to all connected clients
   */
  function broadcastSessionState() {
    if (!server || !currentCtx) return;
    
    server.broadcast({
      type: "session_state",
      data: buildSessionData(currentCtx),
    });
  }

  // Reserved for future use: streaming individual entries
  // function broadcastEntryAdded(entry: SessionEntry) { ... }

  /**
   * Broadcast agent status change
   */
  function broadcastAgentStatus(isStreaming: boolean, isCompacting: boolean = false) {
    if (!server) return;
    
    server.broadcast({
      type: "agent_status",
      data: { isStreaming, isCompacting },
    });
  }

  // Register /dashboard command
  pi.registerCommand("dashboard", {
    description: "Open session visualization dashboard in browser",
    handler: async (args, ctx) => {
      const port = args ? parseInt(args, 10) || DEFAULT_PORT : DEFAULT_PORT;
      currentCtx = ctx;

      try {
        const srv = await startServer(ctx, port);
        const url = `http://localhost:${srv.port}`;
        
        ctx.ui.notify(`Dashboard running at ${url}`, "info");
        
        // Open browser
        await open(url);
      } catch (err) {
        ctx.ui.notify(`Failed to start dashboard: ${err}`, "error");
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
      } catch (err) {
        ctx.ui.notify(`Navigation failed: ${err}`, "error");
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
      } catch (err) {
        ctx.ui.notify(`Fork failed: ${err}`, "error");
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
      type: "leaf_changed",
      data: {
        oldLeafId: event.oldLeafId,
        newLeafId: event.newLeafId,
      },
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
