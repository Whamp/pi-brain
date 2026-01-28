/**
 * Integration tests for Abandoned Restart detection
 *
 * Task 11R.1: Wire up Abandoned Restart detection
 *
 * Tests the full integration chain:
 * 1. First session is ingested with outcome "abandoned"
 * 2. Second session starts within 30 minutes, touching same files
 * 3. Verify the second session's node has signals.friction.abandonedRestart === true
 */

import BetterSqlite3 from "better-sqlite3";
import { mkdtempSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";

import { isAbandonedRestartFromNode } from "../parser/signals.js";
import { migrate } from "../storage/database.js";
import { createNode, findPreviousProjectNode } from "../storage/index.js";
import { generateNodeId, type Node } from "../storage/node-types.js";

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
  const id = overrides.id ?? generateNodeId();
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
      project: "test-project",
      isNewProject: false,
      hadClearGoal: true,
    },
    content: {
      summary: "Test node summary",
      outcome: "success",
      keyDecisions: [],
      filesTouched: ["src/index.ts", "src/utils.ts"],
      toolsUsed: ["read", "write"],
      errorsSeen: [],
    },
    lessons: emptyLessons(),
    observations: {
      modelsUsed: [{ provider: "zai", model: "glm-4.7", tokensUsed: 1000 }],
      promptingWins: [],
      promptingFailures: [],
      modelQuirks: [],
      toolUseErrors: [],
    },
    metadata: {
      tokensUsed: 1000,
      cost: 0.01,
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
    ...overrides,
  };

  // Handle nested overrides properly
  if (overrides.content) {
    base.content = { ...base.content, ...overrides.content };
  }
  if (overrides.classification) {
    base.classification = {
      ...base.classification,
      ...overrides.classification,
    };
  }
  if (overrides.metadata) {
    base.metadata = { ...base.metadata, ...overrides.metadata };
  }
  if (overrides.source) {
    base.source = { ...base.source, ...overrides.source };
  }

  return base;
}

// =============================================================================
// Tests
// =============================================================================

describe("abandoned restart detection integration", () => {
  let tmpDir: string;
  let db: BetterSqlite3.Database;
  let nodesDir: string;

  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "pi-brain-abandoned-test-"));
    nodesDir = join(tmpDir, "nodes");
    mkdirSync(nodesDir, { recursive: true });
  });

  beforeEach(() => {
    // Fresh database for each test
    const dbPath = join(tmpDir, `test-${Date.now()}.db`);
    db = new BetterSqlite3(dbPath);
    migrate(db);
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("should detect abandoned restart pattern", () => {
    const baseTime = new Date("2026-01-26T10:00:00.000Z");

    // 1. Create first node - abandoned, touches auth.ts
    const abandonedNode = createTestNode({
      id: "aaaa111111111111",
      classification: {
        type: "coding",
        project: "my-project",
        isNewProject: false,
        hadClearGoal: true,
      },
      content: {
        summary: "Working on authentication",
        outcome: "abandoned",
        keyDecisions: [],
        filesTouched: ["src/auth.ts", "src/middleware.ts"],
        toolsUsed: ["read", "edit"],
        errorsSeen: [],
      },
      metadata: {
        tokensUsed: 1000,
        cost: 0.01,
        durationMinutes: 30,
        timestamp: baseTime.toISOString(),
        analyzedAt: baseTime.toISOString(),
        analyzerVersion: "test-v1",
      },
    });

    createNode(db, abandonedNode, { nodesDir });

    // 2. "Ingest" second session 5 minutes later, touching same file
    const restartTime = new Date(baseTime.getTime() + 5 * 60 * 1000);
    const currentStartTime = restartTime.toISOString();
    const currentFilesTouched = ["src/auth.ts", "src/new-feature.ts"];

    // 3. Look up previous node and check for abandoned restart
    const previousNode = findPreviousProjectNode(
      db,
      "my-project",
      currentStartTime
    );

    expect(previousNode).not.toBeNull();
    expect(previousNode?.id).toBe("aaaa111111111111");
    expect(previousNode?.content.outcome).toBe("abandoned");

    // 4. Check if it's an abandoned restart - use optional chaining
    if (!previousNode) {
      throw new Error("Expected previousNode to exist");
    }

    const isAbandoned = isAbandonedRestartFromNode(
      {
        outcome: previousNode.content.outcome,
        timestamp: previousNode.metadata.timestamp,
        filesTouched: previousNode.content.filesTouched,
      },
      currentStartTime,
      currentFilesTouched
    );

    expect(isAbandoned).toBeTruthy();
  });

  it("should NOT detect abandoned restart when outcome is success", () => {
    const baseTime = new Date("2026-01-26T10:00:00.000Z");

    // Create a successful node (not abandoned)
    const successNode = createTestNode({
      id: "bbbb222222222222",
      classification: {
        type: "coding",
        project: "my-project",
        isNewProject: false,
        hadClearGoal: true,
      },
      content: {
        summary: "Finished auth feature",
        outcome: "success",
        keyDecisions: [],
        filesTouched: ["src/auth.ts"],
        toolsUsed: ["read", "edit"],
        errorsSeen: [],
      },
      metadata: {
        tokensUsed: 1000,
        cost: 0.01,
        durationMinutes: 30,
        timestamp: baseTime.toISOString(),
        analyzedAt: baseTime.toISOString(),
        analyzerVersion: "test-v1",
      },
    });

    createNode(db, successNode, { nodesDir });

    // New session 5 minutes later
    const restartTime = new Date(baseTime.getTime() + 5 * 60 * 1000);
    const currentStartTime = restartTime.toISOString();
    const currentFilesTouched = ["src/auth.ts"];

    const previousNode = findPreviousProjectNode(
      db,
      "my-project",
      currentStartTime
    );

    expect(previousNode).not.toBeNull();
    if (!previousNode) {
      throw new Error("Expected previousNode to exist");
    }

    const isAbandoned = isAbandonedRestartFromNode(
      {
        outcome: previousNode.content.outcome,
        timestamp: previousNode.metadata.timestamp,
        filesTouched: previousNode.content.filesTouched,
      },
      currentStartTime,
      currentFilesTouched
    );

    expect(isAbandoned).toBeFalsy();
  });

  it("should NOT detect abandoned restart when too much time passed", () => {
    const baseTime = new Date("2026-01-26T10:00:00.000Z");

    const abandonedNode = createTestNode({
      id: "cccc333333333333",
      classification: {
        type: "coding",
        project: "my-project",
        isNewProject: false,
        hadClearGoal: true,
      },
      content: {
        summary: "Working on auth",
        outcome: "abandoned",
        keyDecisions: [],
        filesTouched: ["src/auth.ts"],
        toolsUsed: ["read"],
        errorsSeen: [],
      },
      metadata: {
        tokensUsed: 1000,
        cost: 0.01,
        durationMinutes: 30,
        timestamp: baseTime.toISOString(),
        analyzedAt: baseTime.toISOString(),
        analyzerVersion: "test-v1",
      },
    });

    createNode(db, abandonedNode, { nodesDir });

    // New session 2 hours later (outside 30 min window)
    const restartTime = new Date(baseTime.getTime() + 2 * 60 * 60 * 1000);
    const currentStartTime = restartTime.toISOString();
    const currentFilesTouched = ["src/auth.ts"];

    const previousNode = findPreviousProjectNode(
      db,
      "my-project",
      currentStartTime
    );

    expect(previousNode).not.toBeNull();
    if (!previousNode) {
      throw new Error("Expected previousNode to exist");
    }

    const isAbandoned = isAbandonedRestartFromNode(
      {
        outcome: previousNode.content.outcome,
        timestamp: previousNode.metadata.timestamp,
        filesTouched: previousNode.content.filesTouched,
      },
      currentStartTime,
      currentFilesTouched
    );

    expect(isAbandoned).toBeFalsy();
  });

  it("should NOT detect abandoned restart when files don't overlap", () => {
    const baseTime = new Date("2026-01-26T10:00:00.000Z");

    const abandonedNode = createTestNode({
      id: "dddd444444444444",
      classification: {
        type: "coding",
        project: "my-project",
        isNewProject: false,
        hadClearGoal: true,
      },
      content: {
        summary: "Working on auth",
        outcome: "abandoned",
        keyDecisions: [],
        filesTouched: ["src/auth.ts", "src/middleware.ts"],
        toolsUsed: ["read"],
        errorsSeen: [],
      },
      metadata: {
        tokensUsed: 1000,
        cost: 0.01,
        durationMinutes: 30,
        timestamp: baseTime.toISOString(),
        analyzedAt: baseTime.toISOString(),
        analyzerVersion: "test-v1",
      },
    });

    createNode(db, abandonedNode, { nodesDir });

    // New session 5 minutes later but different files
    const restartTime = new Date(baseTime.getTime() + 5 * 60 * 1000);
    const currentStartTime = restartTime.toISOString();
    // Completely different files
    const currentFilesTouched = ["src/database.ts", "src/config.ts"];

    const previousNode = findPreviousProjectNode(
      db,
      "my-project",
      currentStartTime
    );

    expect(previousNode).not.toBeNull();
    if (!previousNode) {
      throw new Error("Expected previousNode to exist");
    }

    const isAbandoned = isAbandonedRestartFromNode(
      {
        outcome: previousNode.content.outcome,
        timestamp: previousNode.metadata.timestamp,
        filesTouched: previousNode.content.filesTouched,
      },
      currentStartTime,
      currentFilesTouched
    );

    expect(isAbandoned).toBeFalsy();
  });

  it("should NOT detect abandoned restart for different projects", () => {
    const baseTime = new Date("2026-01-26T10:00:00.000Z");

    // Abandoned node in project-a
    const abandonedNode = createTestNode({
      id: "eeee555555555555",
      classification: {
        type: "coding",
        project: "project-a",
        isNewProject: false,
        hadClearGoal: true,
      },
      content: {
        summary: "Working on auth in project A",
        outcome: "abandoned",
        keyDecisions: [],
        filesTouched: ["src/auth.ts"],
        toolsUsed: ["read"],
        errorsSeen: [],
      },
      metadata: {
        tokensUsed: 1000,
        cost: 0.01,
        durationMinutes: 30,
        timestamp: baseTime.toISOString(),
        analyzedAt: baseTime.toISOString(),
        analyzerVersion: "test-v1",
      },
    });

    createNode(db, abandonedNode, { nodesDir });

    // New session in project-b (should not be considered a restart of project-a)
    const restartTime = new Date(baseTime.getTime() + 5 * 60 * 1000);
    const currentStartTime = restartTime.toISOString();

    // Look up previous node for project-b
    const previousNode = findPreviousProjectNode(
      db,
      "project-b", // Different project
      currentStartTime
    );

    // Should return null - no previous node for project-b
    expect(previousNode).toBeNull();
  });
});
