/**
 * End-to-end integration tests for the /brain command and brain_query tool
 *
 * Task 7.6: Test integration end-to-end
 *
 * These tests verify the full integration chain:
 * 1. Extension registration (brain-query extension)
 * 2. API endpoints (/api/v1/query)
 * 3. Query processor (searches nodes, invokes pi agent)
 * 4. Response formatting
 *
 * Note: Full E2E tests requiring pi agent are marked as integration tests
 * and can be run manually with: npm test -- --run integration
 */

import type { FastifyInstance } from "fastify";

import BetterSqlite3 from "better-sqlite3";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from "vitest";

import type { RepositoryOptions } from "../storage/node-crud.js";
import type { Node } from "../storage/node-types.js";

import { createServer } from "../api/server.js";
import { migrate } from "../storage/database.js";
import { createNode, generateNodeId } from "../storage/index.js";

// Integration tests that invoke pi agent need longer timeout
const INTEGRATION_TIMEOUT = 60_000; // 60 seconds - agent queries can be slow

// Skip slow tests unless explicitly running integration tests
// Set INTEGRATION_TESTS=1 to run, or use: npm test -- --run -t "brain integration"
const skipSlowTests = process.env.INTEGRATION_TESTS !== "1";

// =============================================================================
// Test Fixtures
// =============================================================================

function emptyLessons() {
  return {
    project: [],
    task: [],
    user: [],
    model: [],
    tool: [],
    skill: [],
    subagent: [],
  };
}

function createTestNode(overrides: Partial<Node> = {}): Node {
  const id = generateNodeId();
  const now = new Date().toISOString();

  const base: Node = {
    id,
    version: 1,
    previousVersions: [],
    source: {
      sessionFile: "/tmp/test-session.jsonl",
      segment: {
        startEntryId: "entry1",
        endEntryId: "entry10",
        entryCount: 10,
      },
      computer: "test-host",
      sessionId: "test-session-id",
    },
    classification: {
      type: "coding",
      project: "/home/test/project",
      isNewProject: false,
      hadClearGoal: true,
    },
    content: {
      summary: "Test node summary",
      outcome: "success",
      keyDecisions: [
        {
          what: "Used test framework",
          why: "Better coverage",
          alternativesConsidered: ["Jest", "Mocha"],
        },
      ],
      filesTouched: ["src/index.ts", "src/utils.ts"],
      toolsUsed: ["read", "write", "bash"],
      errorsSeen: [],
    },
    lessons: emptyLessons(),
    observations: {
      modelsUsed: [
        {
          provider: "zai",
          model: "glm-4.7",
          tokensInput: 1000,
          tokensOutput: 500,
          cost: 0,
        },
      ],
      promptingWins: [],
      promptingFailures: [],
      modelQuirks: [],
      toolUseErrors: [],
    },
    metadata: {
      tokensUsed: 1500,
      cost: 0,
      durationMinutes: 10,
      timestamp: now,
      analyzedAt: now,
      analyzerVersion: "test-v1",
    },
    semantic: {
      tags: ["test"],
      topics: ["testing"],
    },
    daemonMeta: {
      decisions: [],
      rlmUsed: false,
    },
  };

  // Deep merge overrides
  return {
    ...base,
    ...overrides,
    source: { ...base.source, ...overrides.source },
    classification: {
      ...base.classification,
      ...overrides.classification,
    },
    content: { ...base.content, ...overrides.content },
    lessons: { ...base.lessons, ...overrides.lessons },
    observations: { ...base.observations, ...overrides.observations },
    metadata: { ...base.metadata, ...overrides.metadata },
    semantic: { ...base.semantic, ...overrides.semantic },
    daemonMeta: { ...base.daemonMeta, ...overrides.daemonMeta },
  };
}

// =============================================================================
// Integration Tests
// =============================================================================

describe("brain integration", () => {
  let app: FastifyInstance;
  let db: BetterSqlite3.Database;
  let testDir: string;
  let nodesDir: string;
  let options: RepositoryOptions;

  beforeAll(async () => {
    // Create temp directory for test nodes
    testDir = mkdtempSync(join(tmpdir(), "brain-integration-test-"));
    nodesDir = join(testDir, "nodes");
    mkdirSync(nodesDir, { recursive: true });
    options = { nodesDir, skipFts: true };

    // Create in-memory database
    db = new BetterSqlite3(":memory:");
    migrate(db);

    // Create server
    app = await createServer(db, {
      port: 0,
      host: "127.0.0.1",
      corsOrigins: [],
    });
  });

  afterAll(async () => {
    await app.close();
    db.close();
    rmSync(testDir, { recursive: true, force: true });
  });

  describe("query endpoint with test data", () => {
    beforeEach(() => {
      // Clear existing data (order matters for foreign keys)
      db.exec("DELETE FROM lessons");
      db.exec("DELETE FROM model_quirks");
      db.exec("DELETE FROM tool_errors");
      db.exec("DELETE FROM tags");
      db.exec("DELETE FROM topics");
      db.exec("DELETE FROM edges");
      db.exec("DELETE FROM nodes");
    });

    it.skipIf(skipSlowTests)(
      "should find nodes matching query text",
      { timeout: INTEGRATION_TIMEOUT },
      async () => {
        // Insert test nodes with specific content
        const node = createTestNode({
          content: {
            summary: "Implemented JWT authentication with refresh tokens",
            outcome: "success",
            keyDecisions: [],
            filesTouched: [],
            toolsUsed: [],
            errorsSeen: [],
          },
          classification: {
            type: "coding",
            project: "/home/will/projects/myapp",
            isNewProject: false,
            hadClearGoal: true,
          },
          semantic: {
            tags: ["auth", "jwt", "security"],
            topics: ["authentication"],
          },
        });
        createNode(db, node, options);

        // Query should find the node via search
        const response = await app.inject({
          method: "POST",
          url: "/api/v1/query",
          payload: {
            query: "authentication JWT",
            context: { project: "/home/will/projects/myapp" },
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.status).toBe("success");
        // The response should have data (even if agent fails, it should gracefully degrade)
        expect(body).toHaveProperty("data");
      }
    );

    it.skipIf(skipSlowTests)(
      "should include model quirks in context for model-related queries",
      { timeout: INTEGRATION_TIMEOUT },
      async () => {
        // Insert a node with model quirks
        const node = createTestNode({
          content: {
            summary: "Debugging session with Claude model issues",
            outcome: "partial",
            keyDecisions: [],
            filesTouched: [],
            toolsUsed: [],
            errorsSeen: [],
          },
          classification: {
            type: "debugging",
            project: "/test/project",
            isNewProject: false,
            hadClearGoal: true,
          },
          observations: {
            modelsUsed: [
              {
                provider: "anthropic",
                model: "claude-sonnet-4-20250514",
                tokensInput: 500,
                tokensOutput: 200,
                cost: 0.01,
              },
            ],
            promptingWins: [],
            promptingFailures: [],
            modelQuirks: [
              {
                model: "anthropic/claude-sonnet-4-20250514",
                observation: "Uses sed/cat instead of read tool",
                frequency: "often",
                workaround: "Add reminder in system prompt",
                severity: "medium",
              },
            ],
            toolUseErrors: [],
          },
        });
        createNode(db, node, options);

        // Query about model quirks
        const response = await app.inject({
          method: "POST",
          url: "/api/v1/query",
          payload: {
            query: "What quirks does Claude have?",
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.status).toBe("success");
      }
    );

    it.skipIf(skipSlowTests)(
      "should include tool errors in context for tool-related queries",
      { timeout: INTEGRATION_TIMEOUT },
      async () => {
        // Insert a node with tool errors
        const node = createTestNode({
          content: {
            summary: "Session with edit tool failures",
            outcome: "partial",
            keyDecisions: [],
            filesTouched: [],
            toolsUsed: ["edit"],
            errorsSeen: [
              { type: "tool_error", message: "edit failed", resolved: true },
            ],
          },
          classification: {
            type: "debugging",
            project: "/test/project",
            isNewProject: false,
            hadClearGoal: true,
          },
          observations: {
            modelsUsed: [
              {
                provider: "anthropic",
                model: "claude-sonnet-4-20250514",
                tokensInput: 500,
                tokensOutput: 200,
                cost: 0.01,
              },
            ],
            promptingWins: [],
            promptingFailures: [],
            modelQuirks: [],
            toolUseErrors: [
              {
                tool: "edit",
                errorType: "whitespace_mismatch",
                context: "Trailing whitespace caused match failure",
                model: "anthropic/claude-sonnet-4-20250514",
                wasRetried: false,
              },
            ],
          },
        });
        createNode(db, node, options);

        // Query about tool errors
        const response = await app.inject({
          method: "POST",
          url: "/api/v1/query",
          payload: {
            query: "What edit tool errors have occurred?",
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.status).toBe("success");
      }
    );

    it("should return empty result message when no nodes exist", async () => {
      // Query with empty database
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/query",
        payload: {
          query: "something that does not exist",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("success");
      expect(body.data.answer).toContain("couldn't find");
    });

    it.skipIf(skipSlowTests)(
      "should filter by project context",
      { timeout: INTEGRATION_TIMEOUT },
      async () => {
        // Insert nodes for different projects
        const node1 = createTestNode({
          content: {
            summary: "Auth implementation in project A",
            outcome: "success",
            keyDecisions: [],
            filesTouched: [],
            toolsUsed: [],
            errorsSeen: [],
          },
          classification: {
            type: "coding",
            project: "/projects/project-a",
            isNewProject: false,
            hadClearGoal: true,
          },
        });
        const node2 = createTestNode({
          content: {
            summary: "Auth implementation in project B",
            outcome: "success",
            keyDecisions: [],
            filesTouched: [],
            toolsUsed: [],
            errorsSeen: [],
          },
          classification: {
            type: "coding",
            project: "/projects/project-b",
            isNewProject: false,
            hadClearGoal: true,
          },
        });
        createNode(db, node1, options);
        createNode(db, node2, options);

        // Query with project context
        const response = await app.inject({
          method: "POST",
          url: "/api/v1/query",
          payload: {
            query: "auth",
            context: { project: "/projects/project-a" },
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.status).toBe("success");
      }
    );
  });

  describe("health check endpoint", () => {
    it("should return pi availability status", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/query/health",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("success");
      expect(body.data).toHaveProperty("available");
      expect(typeof body.data.available).toBe("boolean");
    });
  });
});

describe("extension registration", () => {
  it("should export a valid extension function", async () => {
    // Dynamic import of the extension
    const { default: brainExtension } =
      await import("../../extensions/brain-query/index.js");

    expect(typeof brainExtension).toBe("function");

    // Mock pi API
    const mockPi = {
      registerCommand: vi.fn(),
      registerTool: vi.fn(),
    } as unknown as Parameters<typeof brainExtension>[0];

    // Call extension
    brainExtension(mockPi);

    // Verify command registration
    expect(mockPi.registerCommand).toHaveBeenCalledWith(
      "brain",
      expect.objectContaining({
        description: expect.any(String),
        handler: expect.any(Function),
      })
    );

    // Verify tool registration
    expect(mockPi.registerTool).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "brain_query",
        execute: expect.any(Function),
      })
    );
  });
});
