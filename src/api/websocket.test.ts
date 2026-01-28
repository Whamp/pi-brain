/**
 * Tests for WebSocket handler
 */

import type { WebSocket } from "ws";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import type { AnalysisJob } from "../daemon/queue.js";
import type { Node } from "../storage/node-types.js";

import { WebSocketManager } from "./websocket.js";

// =============================================================================
// Mock WebSocket
// =============================================================================

interface MockSocket {
  readyState: number;
  send: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  listeners: Map<string, ((...args: unknown[]) => void)[]>;
}

function createMockSocket(): MockSocket {
  const listeners = new Map<string, ((...args: unknown[]) => void)[]>();

  return {
    readyState: 1, // WebSocket.OPEN
    send: vi.fn(),
    close: vi.fn(),
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (!listeners.has(event)) {
        listeners.set(event, []);
      }
      listeners.get(event)?.push(handler);
    }),
    listeners,
  };
}

function emitEvent(socket: MockSocket, event: string, ...args: unknown[]) {
  const handlers = socket.listeners.get(event) || [];
  for (const handler of handlers) {
    handler(...args);
  }
}

// =============================================================================
// Tests
// =============================================================================

describe("webSocketManager", () => {
  let manager: WebSocketManager;
  let mockLogger: {
    info: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    debug: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };
    manager = new WebSocketManager(mockLogger);
  });

  afterEach(() => {
    manager.closeAll();
  });

  describe("connection handling", () => {
    it("should track connected clients", () => {
      const socket1 = createMockSocket();
      const socket2 = createMockSocket();

      manager.handleConnection(socket1 as unknown as WebSocket);
      expect(manager.getClientCount()).toBe(1);

      manager.handleConnection(socket2 as unknown as WebSocket);
      expect(manager.getClientCount()).toBe(2);
    });

    it("should remove client on disconnect", () => {
      const socket = createMockSocket();
      manager.handleConnection(socket as unknown as WebSocket);
      expect(manager.getClientCount()).toBe(1);

      // Simulate close event
      emitEvent(socket, "close");
      expect(manager.getClientCount()).toBe(0);
    });

    it("should remove client on error", () => {
      const socket = createMockSocket();
      manager.handleConnection(socket as unknown as WebSocket);
      expect(manager.getClientCount()).toBe(1);

      // Simulate error event
      emitEvent(socket, "error", new Error("Connection reset"));
      expect(manager.getClientCount()).toBe(0);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it("should close all connections on closeAll", () => {
      const socket1 = createMockSocket();
      const socket2 = createMockSocket();

      manager.handleConnection(socket1 as unknown as WebSocket);
      manager.handleConnection(socket2 as unknown as WebSocket);

      manager.closeAll();

      expect(socket1.close).toHaveBeenCalledWith(1001, "Server shutting down");
      expect(socket2.close).toHaveBeenCalledWith(1001, "Server shutting down");
      expect(manager.getClientCount()).toBe(0);
    });
  });

  describe("subscription handling", () => {
    it("should handle subscribe messages", () => {
      const socket = createMockSocket();
      manager.handleConnection(socket as unknown as WebSocket);

      // Simulate subscribe message
      const message = JSON.stringify({
        type: "subscribe",
        channels: ["daemon", "analysis"],
      });
      emitEvent(socket, "message", message);

      // Should send confirmation
      expect(socket.send).toHaveBeenCalled();
      const sentMessage = JSON.parse(socket.send.mock.calls[0][0] as string);
      expect(sentMessage.type).toBe("subscribed");
      expect(sentMessage.data.channels).toContain("daemon");
      expect(sentMessage.data.channels).toContain("analysis");
    });

    it("should filter invalid channels", () => {
      const socket = createMockSocket();
      manager.handleConnection(socket as unknown as WebSocket);

      const message = JSON.stringify({
        type: "subscribe",
        channels: ["daemon", "invalid-channel", "node"],
      });
      emitEvent(socket, "message", message);

      const sentMessage = JSON.parse(socket.send.mock.calls[0][0] as string);
      expect(sentMessage.data.channels).toContain("daemon");
      expect(sentMessage.data.channels).toContain("node");
      expect(sentMessage.data.channels).not.toContain("invalid-channel");
    });

    it("should handle malformed JSON", () => {
      const socket = createMockSocket();
      manager.handleConnection(socket as unknown as WebSocket);

      emitEvent(socket, "message", "not valid json");

      expect(socket.send).toHaveBeenCalled();
      const sentMessage = JSON.parse(socket.send.mock.calls[0][0] as string);
      expect(sentMessage.type).toBe("error");
      expect(sentMessage.data.message).toBe("Invalid JSON message");
    });

    it("should handle unknown message type", () => {
      const socket = createMockSocket();
      manager.handleConnection(socket as unknown as WebSocket);

      const message = JSON.stringify({ type: "unknown-type" });
      emitEvent(socket, "message", message);

      const sentMessage = JSON.parse(socket.send.mock.calls[0][0] as string);
      expect(sentMessage.type).toBe("error");
      expect(sentMessage.data.message).toContain("Unknown message type");
    });
  });

  describe("broadcasting", () => {
    it("should broadcast to subscribed clients only", () => {
      const socket1 = createMockSocket();
      const socket2 = createMockSocket();
      const socket3 = createMockSocket();

      manager.handleConnection(socket1 as unknown as WebSocket);
      manager.handleConnection(socket2 as unknown as WebSocket);
      manager.handleConnection(socket3 as unknown as WebSocket);

      // Subscribe socket1 and socket2 to daemon, socket3 to analysis
      emitEvent(
        socket1,
        "message",
        JSON.stringify({ type: "subscribe", channels: ["daemon"] })
      );
      emitEvent(
        socket2,
        "message",
        JSON.stringify({ type: "subscribe", channels: ["daemon"] })
      );
      emitEvent(
        socket3,
        "message",
        JSON.stringify({ type: "subscribe", channels: ["analysis"] })
      );

      // Clear subscription confirmations
      socket1.send.mockClear();
      socket2.send.mockClear();
      socket3.send.mockClear();

      // Broadcast to daemon channel
      manager.broadcast("daemon", {
        type: "daemon.status",
        data: { running: true },
        timestamp: new Date().toISOString(),
      });

      expect(socket1.send).toHaveBeenCalledOnce();
      expect(socket2.send).toHaveBeenCalledOnce();
      expect(socket3.send).not.toHaveBeenCalled();
    });

    it("should not send to closed sockets", () => {
      const socket = createMockSocket();
      socket.readyState = 3; // WebSocket.CLOSED

      manager.handleConnection(socket as unknown as WebSocket);
      emitEvent(
        socket,
        "message",
        JSON.stringify({ type: "subscribe", channels: ["daemon"] })
      );

      // Should not throw and should not call send (socket is closed)
      // Note: send is called for the subscription confirmation, so we clear it
      socket.send.mockClear();

      manager.broadcast("daemon", {
        type: "daemon.status",
        data: { running: true },
        timestamp: new Date().toISOString(),
      });

      expect(socket.send).not.toHaveBeenCalled();
    });
  });

  describe("event helpers", () => {
    it("should broadcast daemon status", () => {
      const socket = createMockSocket();
      manager.handleConnection(socket as unknown as WebSocket);
      emitEvent(
        socket,
        "message",
        JSON.stringify({ type: "subscribe", channels: ["daemon"] })
      );
      socket.send.mockClear();

      manager.broadcastDaemonStatus({
        running: true,
        workers: { active: 1, idle: 0 },
        queue: { pending: 5, running: 1 },
      });

      expect(socket.send).toHaveBeenCalledOnce();
      const sentMessage = JSON.parse(socket.send.mock.calls[0][0] as string);
      expect(sentMessage.type).toBe("daemon.status");
      expect(sentMessage.data.running).toBeTruthy();
      expect(sentMessage.data.workers.active).toBe(1);
    });

    it("should broadcast analysis completed and node created", () => {
      const socket = createMockSocket();
      manager.handleConnection(socket as unknown as WebSocket);
      emitEvent(
        socket,
        "message",
        JSON.stringify({ type: "subscribe", channels: ["analysis", "node"] })
      );
      socket.send.mockClear();

      const mockJob: AnalysisJob = {
        id: "job-123",
        type: "initial",
        priority: 50,
        sessionFile: "/test/session.jsonl",
        queuedAt: new Date().toISOString(),
        status: "running",
        retryCount: 0,
        maxRetries: 3,
      };

      const mockNode: Node = {
        id: "node-456",
        version: 1,
        previousVersions: [],
        source: {
          sessionFile: "/test/session.jsonl",
          sessionId: "sess-1",
          segment: {},
          computer: "test-machine",
          entryCount: 10,
        },
        classification: {
          type: "coding",
          project: "/home/will/projects/test",
          isNewProject: false,
          hadClearGoal: true,
        },
        content: {
          summary: "Implemented feature X",
          outcome: "success",
          keyDecisions: [],
          filesTouched: [],
        },
        lessons: {
          project: [],
          task: [],
          user: [],
          model: [],
          tool: [],
          skill: [],
          subagent: [],
        },
        observations: {
          modelsUsed: [],
          promptingWins: [],
          promptingFailures: [],
          modelQuirks: [],
          toolUseErrors: [],
        },
        metadata: {
          timestamp: new Date().toISOString(),
          analyzedAt: new Date().toISOString(),
          analyzerVersion: "1.0.0",
          analysisDurationMs: 1000,
        },
        semantic: {
          tags: [],
          topics: [],
        },
        signals: {
          friction: { score: 0, signals: [] },
          delight: { score: 0, signals: [] },
          manualFlags: [],
        },
        daemonMeta: {
          daemonDecisions: [],
        },
      };

      manager.broadcastAnalysisCompleted(mockJob, mockNode);

      // Should send both analysis.completed and node.created
      expect(socket.send).toHaveBeenCalledTimes(2);

      const messages = socket.send.mock.calls.map(
        (call: [string]) => JSON.parse(call[0]) as { type: string }
      );
      const analysisMsg = messages.find((m) => m.type === "analysis.completed");
      const nodeMsg = messages.find((m) => m.type === "node.created");

      expect(analysisMsg).toBeDefined();
      expect(nodeMsg).toBeDefined();
    });

    it("should broadcast analysis failed", () => {
      const socket = createMockSocket();
      manager.handleConnection(socket as unknown as WebSocket);
      emitEvent(
        socket,
        "message",
        JSON.stringify({ type: "subscribe", channels: ["analysis"] })
      );
      socket.send.mockClear();

      const mockJob: AnalysisJob = {
        id: "job-123",
        type: "initial",
        priority: 50,
        sessionFile: "/test/session.jsonl",
        queuedAt: new Date().toISOString(),
        status: "running",
        retryCount: 0,
        maxRetries: 3,
      };

      manager.broadcastAnalysisFailed(
        mockJob,
        new Error("Agent timeout"),
        true
      );

      expect(socket.send).toHaveBeenCalledOnce();
      const sentMessage = JSON.parse(socket.send.mock.calls[0][0] as string);
      expect(sentMessage.type).toBe("analysis.failed");
      expect(sentMessage.data.error).toBe("Agent timeout");
      expect(sentMessage.data.willRetry).toBeTruthy();
    });

    it("should broadcast queue update", () => {
      const socket = createMockSocket();
      manager.handleConnection(socket as unknown as WebSocket);
      emitEvent(
        socket,
        "message",
        JSON.stringify({ type: "subscribe", channels: ["queue"] })
      );
      socket.send.mockClear();

      manager.broadcastQueueUpdate({
        pending: 10,
        running: 2,
        completed: 45,
        failed: 1,
      });

      expect(socket.send).toHaveBeenCalledOnce();
      const sentMessage = JSON.parse(socket.send.mock.calls[0][0] as string);
      expect(sentMessage.type).toBe("queue.updated");
      expect(sentMessage.data.pending).toBe(10);
    });
  });
});
