import type Database from "better-sqlite3";

import { unlinkSync } from "node:fs";
import { describe, it, expect, beforeEach, afterEach } from "vitest";

import type { Node } from "./node-types.js";

import { openDatabase, closeDatabase, migrate } from "./database.js";
import {
  listDecisions,
  updateDecisionFeedback,
} from "./decision-repository.js";
import { createNode } from "./node-repository.js";

describe("decisionRepository", () => {
  let db: Database.Database;
  const dbPath = "./test-decisions.db";

  beforeEach(() => {
    db = openDatabase({ path: dbPath });
    migrate(db);
  });

  afterEach(() => {
    closeDatabase(db);
    try {
      unlinkSync(dbPath);
    } catch {
      // ignore
    }
  });

  it("should list decisions", () => {
    // Create a node with decisions
    const node: Node = {
      id: "node-1",
      version: 1,
      previousVersions: [],
      source: {
        sessionFile: "session.jsonl",
        segment: { startEntryId: "1", endEntryId: "2" },
        computer: "test-pc",
      },
      classification: {
        type: "coding",
        project: "/test/project",
        isNewProject: false,
        hadClearGoal: true,
      },
      content: {
        summary: "test summary",
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
        tokensUsed: 100,
        cost: 0.01,
        durationMinutes: 5,
        timestamp: "2023-01-01T12:00:00Z",
        analyzedAt: "2023-01-01T12:10:00Z",
        analyzerVersion: "v1",
      },
      semantic: { tags: [], topics: [] },
      daemonMeta: {
        decisions: [
          {
            timestamp: "2023-01-01T12:00:00Z",
            decision: "Test decision",
            reasoning: "Because reasoning",
          },
        ],
        rlmUsed: false,
      },
    };

    createNode(db, node, { skipFts: true, skipJsonWrite: true });

    const result = listDecisions(db);
    expect(result.decisions).toHaveLength(1);
    expect(result.decisions[0].decision).toBe("Test decision");
    expect(result.decisions[0].sourceProject).toBe("/test/project");
    expect(result.total).toBe(1);
  });

  it("should filter decisions", () => {
    // Create node 1
    createNode(
      db,
      {
        id: "node-1",
        version: 1,
        previousVersions: [],
        source: {
          sessionFile: "s1",
          segment: { startEntryId: "1", endEntryId: "2" },
          computer: "pc",
        },
        classification: {
          type: "coding",
          project: "proj-a",
          isNewProject: false,
          hadClearGoal: true,
        },
        content: {
          summary: "s",
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
          tokensUsed: 0,
          cost: 0,
          durationMinutes: 0,
          timestamp: "2023-01-01T12:00:00Z",
          analyzedAt: "",
          analyzerVersion: "",
        },
        semantic: { tags: [], topics: [] },
        daemonMeta: {
          decisions: [
            {
              timestamp: "2023-01-01T12:00:00Z",
              decision: "A",
              reasoning: "R",
            },
          ],
          rlmUsed: false,
        },
      } as unknown as Node,
      { skipFts: true, skipJsonWrite: true }
    );

    // Create node 2
    createNode(
      db,
      {
        id: "node-2",
        version: 1,
        previousVersions: [],
        source: {
          sessionFile: "s2",
          segment: { startEntryId: "1", endEntryId: "2" },
          computer: "pc",
        },
        classification: {
          type: "coding",
          project: "proj-b",
          isNewProject: false,
          hadClearGoal: true,
        },
        content: {
          summary: "s",
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
          tokensUsed: 0,
          cost: 0,
          durationMinutes: 0,
          timestamp: "2023-01-01T12:00:00Z",
          analyzedAt: "",
          analyzerVersion: "",
        },
        semantic: { tags: [], topics: [] },
        daemonMeta: {
          decisions: [
            {
              timestamp: "2023-01-01T13:00:00Z",
              decision: "B",
              reasoning: "R",
            },
          ],
          rlmUsed: false,
        },
      } as unknown as Node,
      { skipFts: true, skipJsonWrite: true }
    );

    const resA = listDecisions(db, { project: "proj-a" });
    expect(resA.decisions).toHaveLength(1);
    expect(resA.decisions[0].decision).toBe("A");

    const resB = listDecisions(db, { decision: "B" });
    expect(resB.decisions).toHaveLength(1);
    expect(resB.decisions[0].decision).toBe("B");
  });

  it("should update feedback", () => {
    // Create node
    createNode(
      db,
      {
        id: "node-1",
        version: 1,
        previousVersions: [],
        source: {
          sessionFile: "s1",
          segment: { startEntryId: "1", endEntryId: "2" },
          computer: "pc",
        },
        classification: {
          type: "coding",
          project: "proj-a",
          isNewProject: false,
          hadClearGoal: true,
        },
        content: {
          summary: "s",
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
          tokensUsed: 0,
          cost: 0,
          durationMinutes: 0,
          timestamp: "2023-01-01T12:00:00Z",
          analyzedAt: "",
          analyzerVersion: "",
        },
        semantic: { tags: [], topics: [] },
        daemonMeta: {
          decisions: [
            {
              timestamp: "2023-01-01T12:00:00Z",
              decision: "D",
              reasoning: "R",
            },
          ],
          rlmUsed: false,
        },
      } as unknown as Node,
      { skipFts: true, skipJsonWrite: true }
    );

    const [decision] = listDecisions(db).decisions;
    expect(decision.userFeedback).toBeNull();

    const updated = updateDecisionFeedback(db, decision.id, "good");
    expect(updated).toBeTruthy();

    const [updatedDecision] = listDecisions(db).decisions;
    expect(updatedDecision.userFeedback).toBe("good");

    // Clear feedback
    updateDecisionFeedback(db, decision.id, null);
    const [clearedDecision] = listDecisions(db).decisions;
    expect(clearedDecision.userFeedback).toBeNull();
  });
});
