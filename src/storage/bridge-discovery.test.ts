import type { Database as DatabaseType } from "better-sqlite3";

import { rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, beforeEach, afterEach } from "vitest";

import { findBridgePaths } from "./bridge-discovery.js";
import { openDatabase, closeDatabase } from "./database.js";
import { createEdge } from "./edge-repository.js";
import { createNode } from "./node-crud.js";
import { generateNodeId } from "./node-types.js";

function createTempDbPath(): string {
  const dir = join(
    tmpdir(),
    `pi-brain-bridge-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  mkdirSync(dir, { recursive: true });
  return join(dir, "brain.db");
}

describe("bridge-discovery", () => {
  let db: DatabaseType;
  let tempDbPath: string;

  beforeEach(() => {
    tempDbPath = createTempDbPath();
    db = openDatabase({ path: tempDbPath, loadVec: false });
  });

  afterEach(() => {
    if (db) {
      closeDatabase(db);
    }
    rmSync(join(tempDbPath, ".."), { recursive: true, force: true });
  });

  function createTestNode(id: string, summary: string, relevanceScore = 1) {
    createNode(
      db,
      {
        id,
        version: 1,
        previousVersions: [],
        source: {
          sessionFile: "test.jsonl",
          segment: { startEntryId: "1", endEntryId: "2", entryCount: 2 },
          computer: "test",
          sessionId: "sess1",
        },
        classification: {
          type: "coding",
          project: "/test",
          isNewProject: false,
          hadClearGoal: true,
        },
        content: {
          summary,
          outcome: "success",
          keyDecisions: [],
          filesTouched: [],
          toolsUsed: [],
          errorsSeen: [],
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
          tokensUsed: 0,
          cost: 0,
          durationMinutes: 1,
          timestamp: new Date().toISOString(),
          analyzedAt: new Date().toISOString(),
          analyzerVersion: "v1",
        },
        semantic: { tags: [], topics: [] },
        daemonMeta: { decisions: [], rlmUsed: false },
        relevanceScore, // AutoMem field
      },
      { nodesDir: join(tempDbPath, "..") }
    ); // Pass nodesDir for JSON storage
  }

  it("finds direct connections (1 hop)", () => {
    const idA = generateNodeId();
    const idB = generateNodeId();

    createTestNode(idA, "Node A");
    createTestNode(idB, "Node B");

    createEdge(db, idA, idB, "LEADS_TO", { confidence: 0.9 });

    const paths = findBridgePaths(db, [idA], { maxDepth: 1 });

    expect(paths).toHaveLength(1);
    expect(paths[0].nodes).toHaveLength(2);
    expect(paths[0].nodes[0].id).toBe(idA);
    expect(paths[0].nodes[1].id).toBe(idB);
    expect(paths[0].edges[0].type).toBe("LEADS_TO");
    // Score should be ~ 1.0 * 0.9 * 0.9 = 0.81
    expect(paths[0].score).toBeCloseTo(0.81, 2);
  });

  it("finds multi-hop paths (2 hops)", () => {
    const idA = generateNodeId();
    const idB = generateNodeId();
    const idC = generateNodeId();

    createTestNode(idA, "Node A");
    createTestNode(idB, "Node B");
    createTestNode(idC, "Node C");

    createEdge(db, idA, idB, "LEADS_TO", { confidence: 0.9 });
    createEdge(db, idB, idC, "CONTRADICTS", { confidence: 0.8 });

    const paths = findBridgePaths(db, [idA], { maxDepth: 2 });

    expect(paths).toHaveLength(2); // A->B, A->B->C

    const pathToC = paths.find((p) => p.nodes.length === 3);
    expect(pathToC).toBeDefined();
    expect(pathToC?.nodes.map((n) => n.id)).toStrictEqual([idA, idB, idC]);
    // Score: 1.0 * 0.9*0.9 * 0.8*0.9 = 0.81 * 0.72 = 0.5832
    expect(pathToC?.score).toBeCloseTo(0.5832, 3);
  });

  it("respects score threshold", () => {
    const idA = generateNodeId();
    const idB = generateNodeId();

    createTestNode(idA, "Node A");
    createTestNode(idB, "Node B");

    createEdge(db, idA, idB, "LEADS_TO", { confidence: 0.1 }); // Low confidence

    const paths = findBridgePaths(db, [idA], { minScore: 0.5 });
    expect(paths).toHaveLength(0);
  });

  it("avoids cycles", () => {
    const idA = generateNodeId();
    const idB = generateNodeId();

    createTestNode(idA, "Node A");
    createTestNode(idB, "Node B");

    createEdge(db, idA, idB, "LEADS_TO", { confidence: 1 });
    createEdge(db, idB, idA, "LEADS_TO", { confidence: 1 }); // Cycle back to A

    const paths = findBridgePaths(db, [idA], { maxDepth: 3 });

    // Should find A->B. Should NOT find A->B->A
    const cyclicPath = paths.find(
      (p) => p.nodes.length === 3 && p.nodes[2].id === idA
    );
    expect(cyclicPath).toBeUndefined();

    expect(paths.length).toBeGreaterThan(0);
    expect(paths[0].nodes.map((n) => n.id)).toStrictEqual([idA, idB]);
  });

  it("prioritizes higher scoring paths", () => {
    const idStart = generateNodeId();
    const idWeak = generateNodeId();
    const idStrong = generateNodeId();

    createTestNode(idStart, "Start");
    createTestNode(idWeak, "Weak Path");
    createTestNode(idStrong, "Strong Path");

    createEdge(db, idStart, idWeak, "LEADS_TO", { confidence: 0.5 });
    createEdge(db, idStart, idStrong, "LEADS_TO", { confidence: 0.95 });

    const paths = findBridgePaths(db, [idStart], { limit: 1 });

    expect(paths).toHaveLength(1);
    expect(paths[0].nodes[1].id).toBe(idStrong);
  });

  it("generates correct description", () => {
    const idA = generateNodeId();
    const idB = generateNodeId();

    createTestNode(idA, "Feature X");
    createTestNode(idB, "Bug Y");

    createEdge(db, idA, idB, "LEADS_TO", { confidence: 1 });

    const paths = findBridgePaths(db, [idA], { maxDepth: 1 });
    expect(paths[0].description).toBe('"Feature X" leads to "Bug Y"');
  });
});
