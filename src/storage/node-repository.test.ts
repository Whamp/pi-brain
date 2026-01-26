/**
 * Tests for node-repository.ts
 * Tests CRUD operations for nodes and edges in SQLite
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { AgentNodeOutput } from "../daemon/processor.js";
import type { AnalysisJob } from "../daemon/queue.js";

import { migrate, openDatabase } from "./database.js";
import {
  agentOutputToNode,
  createEdge,
  createNode,
  deleteEdge,
  deleteNode,
  edgeExists,
  edgeRowToEdge,
  getEdge,
  getEdgesFrom,
  getEdgesTo,
  getNode,
  getNodeEdges,
  getNodeLessons,
  getNodeQuirks,
  getNodeTags,
  getNodeToolErrors,
  getNodeTopics,
  getNodeVersion,
  indexNodeForSearch,
  nodeExistsInDb,
  searchNodes,
  updateNode,
  getAllNodeVersions,
  type NodeConversionContext,
  type RepositoryOptions,
} from "./node-repository.js";
import {
  emptyDaemonMeta,
  emptyLessons,
  emptyObservations,
  generateNodeId,
  type Node,
} from "./node-types.js";

// =============================================================================
// Test Fixtures
// =============================================================================

function createTestNode(overrides: Partial<Node> = {}): Node {
  const id = generateNodeId();
  const now = new Date().toISOString();

  return {
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
    lessons: {
      ...emptyLessons(),
      project: [
        {
          level: "project",
          summary: "Project uses vitest",
          details: "Vitest is configured for testing",
          confidence: "high",
          tags: ["testing", "vitest"],
        },
      ],
    },
    observations: {
      ...emptyObservations(),
      modelsUsed: [
        {
          provider: "zai",
          model: "glm-4.7",
          tokensInput: 1000,
          tokensOutput: 500,
          cost: 0,
        },
      ],
    },
    metadata: {
      tokensUsed: 1500,
      cost: 0,
      durationMinutes: 10,
      timestamp: now,
      analyzedAt: now,
      analyzerVersion: "v1-test",
    },
    semantic: {
      tags: ["test", "coding"],
      topics: ["testing", "development"],
    },
    daemonMeta: emptyDaemonMeta(),
    ...overrides,
  };
}

function createTestAgentOutput(): AgentNodeOutput {
  return {
    classification: {
      type: "coding",
      project: "/home/test/project",
      isNewProject: false,
      hadClearGoal: true,
      language: "typescript",
      frameworks: ["vitest"],
    },
    content: {
      summary: "Implemented new feature",
      outcome: "success",
      keyDecisions: [
        {
          what: "Used SQLite",
          why: "Lightweight and fast",
          alternativesConsidered: ["PostgreSQL"],
        },
      ],
      filesTouched: ["src/db.ts"],
      toolsUsed: ["read", "write"],
      errorsSeen: [],
    },
    lessons: {
      project: [
        {
          level: "project",
          summary: "SQLite works well",
          details: "Good for embedded use",
          confidence: "high",
          tags: ["database"],
        },
      ],
      task: [],
      user: [],
      model: [],
      tool: [],
      skill: [],
      subagent: [],
    },
    observations: {
      modelsUsed: [
        {
          provider: "zai",
          model: "glm-4.7",
          tokensInput: 2000,
          tokensOutput: 1000,
          cost: 0,
        },
      ],
      promptingWins: ["Clear instructions worked well"],
      promptingFailures: [],
      modelQuirks: [],
      toolUseErrors: [],
    },
    semantic: {
      tags: ["database", "sqlite"],
      topics: ["data storage"],
    },
    daemonMeta: {
      decisions: [],
      rlmUsed: false,
    },
  };
}

function createTestConversionContext(
  jobOverrides: Partial<AnalysisJob> = {},
  existingNode?: Node
): NodeConversionContext {
  const job: AnalysisJob = {
    id: "job-123",
    type: "initial",
    priority: 100,
    sessionFile: "/tmp/test-session.jsonl",
    segmentStart: "entry1",
    segmentEnd: "entry20",
    status: "completed",
    queuedAt: new Date().toISOString(),
    retryCount: 0,
    maxRetries: 3,
    ...jobOverrides,
  };

  return {
    job,
    computer: "test-host",
    sessionId: "session-abc",
    entryCount: 20,
    analysisDurationMs: 30_000,
    analyzerVersion: "v1-abc123",
    existingNode,
  };
}

// =============================================================================
// Test Setup
// =============================================================================

describe("node-repository", () => {
  let testDir: string;
  let dbPath: string;
  let nodesDir: string;
  let db: ReturnType<typeof openDatabase>;
  let options: RepositoryOptions;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), "node-repo-test-"));
    dbPath = path.join(testDir, "brain.db");
    nodesDir = path.join(testDir, "nodes");
    fs.mkdirSync(nodesDir, { recursive: true });

    db = openDatabase({ path: dbPath });
    migrate(db);

    options = { nodesDir, skipFts: false };
  });

  afterEach(() => {
    db.close();
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  // ===========================================================================
  // Node CRUD Tests
  // ===========================================================================

  describe("createNode", () => {
    it("should create a node in SQLite and JSON storage", () => {
      const node = createTestNode();
      const created = createNode(db, node, options);

      expect(created.id).toBe(node.id);

      // Verify in database
      const row = getNode(db, node.id);
      expect(row).not.toBeNull();
      expect(row?.id).toBe(node.id);
      expect(row?.version).toBe(1);
      expect(row?.project).toBe(node.classification.project);
      expect(row?.type).toBe(node.classification.type);
    });

    it("should store tags in the tags table", () => {
      const node = createTestNode({
        semantic: {
          tags: ["tag1", "tag2", "tag3"],
          topics: [],
        },
      });
      createNode(db, node, options);

      const tags = getNodeTags(db, node.id);
      expect(tags).toHaveLength(3);
      expect(tags).toContain("tag1");
      expect(tags).toContain("tag2");
      expect(tags).toContain("tag3");
    });

    it("should store topics in the topics table", () => {
      const node = createTestNode({
        semantic: {
          tags: [],
          topics: ["topic1", "topic2"],
        },
      });
      createNode(db, node, options);

      const topics = getNodeTopics(db, node.id);
      expect(topics).toHaveLength(2);
      expect(topics).toContain("topic1");
      expect(topics).toContain("topic2");
    });

    it("should store lessons in the lessons table", () => {
      const node = createTestNode({
        lessons: {
          ...emptyLessons(),
          project: [
            {
              level: "project",
              summary: "Test lesson 1",
              details: "Details 1",
              confidence: "high",
              tags: ["lesson-tag"],
            },
          ],
          model: [
            {
              level: "model",
              summary: "Model lesson",
              details: "Model details",
              confidence: "medium",
              tags: [],
            },
          ],
        },
      });
      createNode(db, node, options);

      const lessons = getNodeLessons(db, node.id);
      expect(lessons).toHaveLength(2);
      expect(lessons.map((l) => l.level)).toContain("project");
      expect(lessons.map((l) => l.level)).toContain("model");
    });

    it("should store model quirks in model_quirks table", () => {
      const node = createTestNode({
        observations: {
          ...emptyObservations(),
          modelQuirks: [
            {
              model: "zai/glm-4.7",
              observation: "Tends to be verbose",
              frequency: "often",
              workaround: "Ask for concise output",
              severity: "low",
            },
          ],
        },
      });
      createNode(db, node, options);

      const quirks = getNodeQuirks(db, node.id);
      expect(quirks).toHaveLength(1);
      expect(quirks[0].model).toBe("zai/glm-4.7");
      expect(quirks[0].observation).toBe("Tends to be verbose");
    });

    it("should store tool errors in tool_errors table", () => {
      const node = createTestNode({
        observations: {
          ...emptyObservations(),
          toolUseErrors: [
            {
              tool: "edit",
              errorType: "match_failed",
              context: "Whitespace mismatch",
              model: "zai/glm-4.7",
              wasRetried: true,
            },
          ],
        },
      });
      createNode(db, node, options);

      const errors = getNodeToolErrors(db, node.id);
      expect(errors).toHaveLength(1);
      expect(errors[0].tool).toBe("edit");
      expect(errors[0].error_type).toBe("match_failed");
    });

    it("should index node for full-text search", () => {
      const node = createTestNode({
        content: {
          summary: "Implemented unique feature with special keywords",
          outcome: "success",
          keyDecisions: [],
          filesTouched: [],
          toolsUsed: [],
          errorsSeen: [],
        },
      });
      createNode(db, node, { ...options, skipFts: false });

      const results = searchNodes(db, "unique feature");
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.some((r) => r.id === node.id)).toBeTruthy();
    });
  });

  describe("getNode", () => {
    it("should return null for non-existent node", () => {
      const result = getNode(db, "nonexistent");
      expect(result).toBeNull();
    });

    it("should return node row for existing node", () => {
      const node = createTestNode();
      createNode(db, node, options);

      const result = getNode(db, node.id);
      expect(result).not.toBeNull();
      expect(result?.id).toBe(node.id);
    });
  });

  describe("getNodeVersion", () => {
    it("should return specific version of node", () => {
      const node = createTestNode({ version: 1 });
      createNode(db, node, options);

      const result = getNodeVersion(db, node.id, 1);
      expect(result).not.toBeNull();
      expect(result?.version).toBe(1);
    });

    it("should return null for non-existent version", () => {
      const node = createTestNode({ version: 1 });
      createNode(db, node, options);

      const result = getNodeVersion(db, node.id, 2);
      expect(result).toBeNull();
    });
  });

  describe("nodeExistsInDb", () => {
    it("should return false for non-existent node", () => {
      expect(nodeExistsInDb(db, "nonexistent")).toBeFalsy();
    });

    it("should return true for existing node", () => {
      const node = createTestNode();
      createNode(db, node, options);

      expect(nodeExistsInDb(db, node.id)).toBeTruthy();
    });
  });

  describe("deleteNode", () => {
    it("should delete node and return true", () => {
      const node = createTestNode();
      createNode(db, node, options);

      const result = deleteNode(db, node.id);
      expect(result).toBeTruthy();
      expect(nodeExistsInDb(db, node.id)).toBeFalsy();
    });

    it("should return false for non-existent node", () => {
      const result = deleteNode(db, "nonexistent");
      expect(result).toBeFalsy();
    });

    it("should cascade delete related data", () => {
      const node = createTestNode({
        lessons: {
          ...emptyLessons(),
          project: [
            {
              level: "project",
              summary: "Test",
              details: "Details",
              confidence: "high",
              tags: [],
            },
          ],
        },
        semantic: {
          tags: ["tag1"],
          topics: ["topic1"],
        },
      });
      createNode(db, node, options);

      deleteNode(db, node.id);

      expect(getNodeTags(db, node.id)).toHaveLength(0);
      expect(getNodeTopics(db, node.id)).toHaveLength(0);
      expect(getNodeLessons(db, node.id)).toHaveLength(0);
    });
  });

  // ===========================================================================
  // Reanalysis and Versioning Tests
  // ===========================================================================

  describe("reanalysis and versioning", () => {
    it("should create a new version of an existing node", () => {
      const node = createTestNode({
        semantic: {
          tags: ["coding"],
          topics: [],
        },
      });
      createNode(db, node, options);

      // Create new version using agentOutputToNode
      const output = createTestAgentOutput();
      output.content.summary = "Updated summary in new version";
      output.semantic.tags = ["database"];
      const context = createTestConversionContext({}, node);

      const newNode = agentOutputToNode(output, context);
      expect(newNode.id).toBe(node.id);
      expect(newNode.version).toBe(2);
      expect(newNode.previousVersions).toContain(`${node.id}-v1`);

      // Update in database
      updateNode(db, newNode, options);

      // Verify in database
      const row = getNode(db, node.id);
      expect(row?.version).toBe(2);

      // Verify related data was updated (tags)
      const tags = getNodeTags(db, node.id);
      expect(tags).toContain("database"); // From output
      expect(tags).not.toContain("coding"); // From original node
    });

    it("should increment version each time reanalyzed", () => {
      let node = createTestNode();
      createNode(db, node, options);

      for (let i = 2; i <= 5; i++) {
        const output = createTestAgentOutput();
        const context = createTestConversionContext({}, node);
        node = agentOutputToNode(output, context);
        updateNode(db, node, options);

        const row = getNode(db, node.id);
        expect(row?.version).toBe(i);
      }

      expect(node.previousVersions).toHaveLength(4);
      expect(node.previousVersions).toContain(`${node.id}-v1`);
      expect(node.previousVersions).toContain(`${node.id}-v4`);
    });

    it("should keep previous version JSON files", () => {
      const node = createTestNode();
      createNode(db, node, options);

      const output = createTestAgentOutput();
      const context = createTestConversionContext({}, node);
      const newNode = agentOutputToNode(output, context);
      updateNode(db, newNode, options);

      // Check files
      const nodeDir = path.join(
        nodesDir,
        new Date(node.metadata.timestamp).getFullYear().toString(),
        (new Date(node.metadata.timestamp).getMonth() + 1)
          .toString()
          .padStart(2, "0")
      );

      expect(
        fs.existsSync(path.join(nodeDir, `${node.id}-v1.json`))
      ).toBeTruthy();
      expect(
        fs.existsSync(path.join(nodeDir, `${node.id}-v2.json`))
      ).toBeTruthy();
    });

    it("should retrieve all versions of a node", () => {
      let node = createTestNode();
      createNode(db, node, options);

      // Create version 2
      const output = createTestAgentOutput();
      const context = createTestConversionContext({}, node);
      node = agentOutputToNode(output, context);
      updateNode(db, node, options);

      const allVersions = getAllNodeVersions(node.id, options);
      expect(allVersions).toHaveLength(2);
      expect(allVersions[0].version).toBe(1);
      expect(allVersions[1].version).toBe(2);
      expect(allVersions[1].previousVersions).toContain(`${node.id}-v1`);
    });

    it("should throw when updating a non-existent node", () => {
      const node = createTestNode();
      // Don't call createNode - node doesn't exist in database

      expect(() => updateNode(db, node, options)).toThrow(
        /does not exist in database/
      );
    });
  });

  // ===========================================================================
  // Edge CRUD Tests
  // ===========================================================================

  describe("createEdge", () => {
    it("should create an edge between two nodes", () => {
      const node1 = createTestNode();
      const node2 = createTestNode();
      createNode(db, node1, options);
      createNode(db, node2, options);

      const edge = createEdge(db, node1.id, node2.id, "continuation", {
        createdBy: "boundary",
      });

      expect(edge.id).toBeDefined();
      expect(edge.sourceNodeId).toBe(node1.id);
      expect(edge.targetNodeId).toBe(node2.id);
      expect(edge.type).toBe("continuation");
      expect(edge.createdBy).toBe("boundary");
    });

    it("should store edge metadata as JSON", () => {
      const node1 = createTestNode();
      const node2 = createTestNode();
      createNode(db, node1, options);
      createNode(db, node2, options);

      const edge = createEdge(db, node1.id, node2.id, "resume", {
        metadata: { gapMinutes: 15 },
        createdBy: "daemon",
      });

      const retrieved = getEdge(db, edge.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.metadata).toContain("gapMinutes");
      expect(retrieved?.metadata).toContain("15");
    });
  });

  describe("getEdgesFrom", () => {
    it("should return outgoing edges from a node", () => {
      const node1 = createTestNode();
      const node2 = createTestNode();
      const node3 = createTestNode();
      createNode(db, node1, options);
      createNode(db, node2, options);
      createNode(db, node3, options);

      createEdge(db, node1.id, node2.id, "continuation");
      createEdge(db, node1.id, node3.id, "branch");

      const edges = getEdgesFrom(db, node1.id);
      expect(edges).toHaveLength(2);
      expect(edges.map((e) => e.target_node_id)).toContain(node2.id);
      expect(edges.map((e) => e.target_node_id)).toContain(node3.id);
    });

    it("should return empty array for node with no outgoing edges", () => {
      const node = createTestNode();
      createNode(db, node, options);

      const edges = getEdgesFrom(db, node.id);
      expect(edges).toHaveLength(0);
    });
  });

  describe("getEdgesTo", () => {
    it("should return incoming edges to a node", () => {
      const node1 = createTestNode();
      const node2 = createTestNode();
      const node3 = createTestNode();
      createNode(db, node1, options);
      createNode(db, node2, options);
      createNode(db, node3, options);

      createEdge(db, node1.id, node3.id, "continuation");
      createEdge(db, node2.id, node3.id, "branch");

      const edges = getEdgesTo(db, node3.id);
      expect(edges).toHaveLength(2);
      expect(edges.map((e) => e.source_node_id)).toContain(node1.id);
      expect(edges.map((e) => e.source_node_id)).toContain(node2.id);
    });
  });

  describe("getNodeEdges", () => {
    it("should return all edges connected to a node", () => {
      const node1 = createTestNode();
      const node2 = createTestNode();
      const node3 = createTestNode();
      createNode(db, node1, options);
      createNode(db, node2, options);
      createNode(db, node3, options);

      createEdge(db, node1.id, node2.id, "continuation");
      createEdge(db, node3.id, node2.id, "branch");

      const edges = getNodeEdges(db, node2.id);
      expect(edges).toHaveLength(2);
    });
  });

  describe("edgeExists", () => {
    it("should return false for non-existent edge", () => {
      const node1 = createTestNode();
      const node2 = createTestNode();
      createNode(db, node1, options);
      createNode(db, node2, options);

      expect(edgeExists(db, node1.id, node2.id)).toBeFalsy();
    });

    it("should return true for existing edge", () => {
      const node1 = createTestNode();
      const node2 = createTestNode();
      createNode(db, node1, options);
      createNode(db, node2, options);
      createEdge(db, node1.id, node2.id, "continuation");

      expect(edgeExists(db, node1.id, node2.id)).toBeTruthy();
    });

    it("should filter by edge type when provided", () => {
      const node1 = createTestNode();
      const node2 = createTestNode();
      createNode(db, node1, options);
      createNode(db, node2, options);
      createEdge(db, node1.id, node2.id, "continuation");

      expect(edgeExists(db, node1.id, node2.id, "continuation")).toBeTruthy();
      expect(edgeExists(db, node1.id, node2.id, "branch")).toBeFalsy();
    });
  });

  describe("deleteEdge", () => {
    it("should delete edge and return true", () => {
      const node1 = createTestNode();
      const node2 = createTestNode();
      createNode(db, node1, options);
      createNode(db, node2, options);
      const edge = createEdge(db, node1.id, node2.id, "continuation");

      const result = deleteEdge(db, edge.id);
      expect(result).toBeTruthy();
      expect(getEdge(db, edge.id)).toBeNull();
    });

    it("should return false for non-existent edge", () => {
      const result = deleteEdge(db, "nonexistent");
      expect(result).toBeFalsy();
    });
  });

  describe("edgeRowToEdge", () => {
    it("should convert database row to Edge object", () => {
      const node1 = createTestNode();
      const node2 = createTestNode();
      createNode(db, node1, options);
      createNode(db, node2, options);
      const edge = createEdge(db, node1.id, node2.id, "branch", {
        metadata: { summary: "Test branch" },
        createdBy: "boundary",
      });

      const row = getEdge(db, edge.id);
      expect(row).toBeDefined();
      // Type assertion - row is guaranteed defined after expect
      const converted = edgeRowToEdge(row as NonNullable<typeof row>);

      expect(converted.id).toBe(edge.id);
      expect(converted.sourceNodeId).toBe(node1.id);
      expect(converted.targetNodeId).toBe(node2.id);
      expect(converted.type).toBe("branch");
      expect(converted.metadata.summary).toBe("Test branch");
      expect(converted.createdBy).toBe("boundary");
    });
  });

  // ===========================================================================
  // Full-Text Search Tests
  // ===========================================================================

  describe("searchNodes", () => {
    it("should find nodes matching search query", () => {
      const node1 = createTestNode({
        content: {
          summary: "Implemented authentication with JWT tokens",
          outcome: "success",
          keyDecisions: [],
          filesTouched: [],
          toolsUsed: [],
          errorsSeen: [],
        },
      });
      const node2 = createTestNode({
        content: {
          summary: "Fixed database connection pooling",
          outcome: "success",
          keyDecisions: [],
          filesTouched: [],
          toolsUsed: [],
          errorsSeen: [],
        },
      });
      createNode(db, node1, options);
      createNode(db, node2, options);

      const results = searchNodes(db, "authentication JWT");
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.some((r) => r.id === node1.id)).toBeTruthy();
      expect(results.some((r) => r.id === node2.id)).toBeFalsy();
    });

    it("should search in lessons", () => {
      const node = createTestNode({
        lessons: {
          ...emptyLessons(),
          project: [
            {
              level: "project",
              summary: "Unique searchable lesson content",
              details: "More unique details here",
              confidence: "high",
              tags: [],
            },
          ],
        },
      });
      createNode(db, node, options);

      const results = searchNodes(db, "searchable lesson");
      expect(results.some((r) => r.id === node.id)).toBeTruthy();
    });

    it("should respect limit parameter", () => {
      // Create multiple nodes
      for (let i = 0; i < 10; i++) {
        const node = createTestNode({
          content: {
            summary: `Test node ${i} with common keyword`,
            outcome: "success",
            keyDecisions: [],
            filesTouched: [],
            toolsUsed: [],
            errorsSeen: [],
          },
        });
        createNode(db, node, options);
      }

      const results = searchNodes(db, "common keyword", 5);
      expect(results.length).toBeLessThanOrEqual(5);
    });
  });

  describe("indexNodeForSearch", () => {
    it("should update FTS index for existing node", () => {
      const node = createTestNode({
        content: {
          summary: "Original summary content",
          outcome: "success",
          keyDecisions: [],
          filesTouched: [],
          toolsUsed: [],
          errorsSeen: [],
        },
      });
      createNode(db, node, options);

      // Update the node's content and re-index
      node.content.summary = "Updated with new unique keywords";
      indexNodeForSearch(db, node);

      const results = searchNodes(db, "unique keywords");
      expect(results.some((r) => r.id === node.id)).toBeTruthy();
    });
  });

  // ===========================================================================
  // AgentNodeOutput Conversion Tests
  // ===========================================================================

  describe("agentOutputToNode", () => {
    it("should convert AgentNodeOutput to Node", () => {
      const output = createTestAgentOutput();
      const context = createTestConversionContext();

      const node = agentOutputToNode(output, context);

      expect(node.id).toHaveLength(16);
      expect(node.version).toBe(1);
      expect(node.previousVersions).toStrictEqual([]);
      expect(node.source.sessionFile).toBe(context.job.sessionFile);
      expect(node.source.computer).toBe(context.computer);
      expect(node.classification.type).toBe(output.classification.type);
      expect(node.content.summary).toBe(output.content.summary);
    });

    it("should calculate tokensUsed from modelsUsed", () => {
      const output = createTestAgentOutput();
      output.observations.modelsUsed = [
        {
          provider: "zai",
          model: "glm-4.7",
          tokensInput: 1000,
          tokensOutput: 500,
          cost: 0,
        },
        {
          provider: "anthropic",
          model: "claude",
          tokensInput: 2000,
          tokensOutput: 1000,
          cost: 0.05,
        },
      ];
      const context = createTestConversionContext();

      const node = agentOutputToNode(output, context);

      expect(node.metadata.tokensUsed).toBe(4500); // 1000+500+2000+1000
    });

    it("should calculate cost from modelsUsed", () => {
      const output = createTestAgentOutput();
      output.observations.modelsUsed = [
        {
          provider: "anthropic",
          model: "claude",
          tokensInput: 1000,
          tokensOutput: 500,
          cost: 0.01,
        },
        {
          provider: "anthropic",
          model: "claude",
          tokensInput: 500,
          tokensOutput: 250,
          cost: 0.005,
        },
      ];
      const context = createTestConversionContext();

      const node = agentOutputToNode(output, context);

      expect(node.metadata.cost).toBeCloseTo(0.015);
    });

    it("should preserve all lesson levels", () => {
      const output = createTestAgentOutput();
      output.lessons = {
        project: [
          {
            level: "project",
            summary: "P1",
            details: "D1",
            confidence: "high",
            tags: [],
          },
        ],
        task: [
          {
            level: "task",
            summary: "T1",
            details: "D2",
            confidence: "medium",
            tags: [],
          },
        ],
        user: [],
        model: [],
        tool: [
          {
            level: "tool",
            summary: "Tool1",
            details: "D3",
            confidence: "low",
            tags: ["tool"],
          },
        ],
        skill: [],
        subagent: [],
      };
      const context = createTestConversionContext();

      const node = agentOutputToNode(output, context);

      expect(node.lessons.project).toHaveLength(1);
      expect(node.lessons.task).toHaveLength(1);
      expect(node.lessons.tool).toHaveLength(1);
      expect(node.lessons.user).toHaveLength(0);
    });

    it("should preserve segment info from job", () => {
      const context = createTestConversionContext({
        segmentStart: "entry-abc",
        segmentEnd: "entry-xyz",
      });
      const output = createTestAgentOutput();

      const node = agentOutputToNode(output, context);

      expect(node.source.segment.startEntryId).toBe("entry-abc");
      expect(node.source.segment.endEntryId).toBe("entry-xyz");
      expect(node.source.segment.entryCount).toBe(context.entryCount);
    });

    it("should set analyzerVersion from context", () => {
      const context = createTestConversionContext();
      context.analyzerVersion = "v2-xyz789";
      const output = createTestAgentOutput();

      const node = agentOutputToNode(output, context);

      expect(node.metadata.analyzerVersion).toBe("v2-xyz789");
    });

    it("should preserve daemonMeta fields", () => {
      const output = createTestAgentOutput();
      output.daemonMeta = {
        decisions: [
          {
            timestamp: "2026-01-25T12:00:00Z",
            decision: "Created new tag",
            reasoning: "Better organization",
            needsReview: true,
          },
        ],
        rlmUsed: true,
        codemapAvailable: true,
        segmentTokenCount: 5000,
      };
      const context = createTestConversionContext();

      const node = agentOutputToNode(output, context);

      expect(node.daemonMeta.rlmUsed).toBeTruthy();
      expect(node.daemonMeta.codemapAvailable).toBeTruthy();
      expect(node.daemonMeta.segmentTokenCount).toBe(5000);
      expect(node.daemonMeta.decisions).toHaveLength(1);
      expect(node.daemonMeta.decisions[0].needsReview).toBeTruthy();
    });

    it("should handle optional fields gracefully", () => {
      const output = createTestAgentOutput();
      // Remove optional fields
      output.classification.language = undefined;
      output.classification.frameworks = undefined;
      output.semantic.relatedProjects = undefined;
      output.semantic.concepts = undefined;

      const context = createTestConversionContext();
      context.parentSession = undefined;

      const node = agentOutputToNode(output, context);

      expect(node.classification.language).toBeUndefined();
      expect(node.classification.frameworks).toBeUndefined();
      expect(node.semantic.relatedProjects).toBeUndefined();
      expect(node.source.parentSession).toBeUndefined();
    });
  });

  // ===========================================================================
  // Integration Tests
  // ===========================================================================

  describe("integration", () => {
    it("should convert AgentNodeOutput and store in database", () => {
      const output = createTestAgentOutput();
      const context = createTestConversionContext();

      const node = agentOutputToNode(output, context);
      const created = createNode(db, node, options);

      // Verify full round-trip
      const retrieved = getNode(db, created.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.project).toBe(output.classification.project);

      const tags = getNodeTags(db, created.id);
      expect(tags).toContain("database");
      expect(tags).toContain("sqlite");

      const lessons = getNodeLessons(db, created.id);
      expect(lessons).toHaveLength(1);
      expect(lessons[0].summary).toBe("SQLite works well");
    });

    it("should create edges between converted nodes", () => {
      const output1 = createTestAgentOutput();
      output1.content.summary = "First segment of work";
      const output2 = createTestAgentOutput();
      output2.content.summary = "Second segment continues first";

      const context1 = createTestConversionContext({ id: "job-1" });
      const context2 = createTestConversionContext({ id: "job-2" });

      const node1 = agentOutputToNode(output1, context1);
      const node2 = agentOutputToNode(output2, context2);

      createNode(db, node1, options);
      createNode(db, node2, options);

      createEdge(db, node1.id, node2.id, "continuation", {
        createdBy: "boundary",
      });

      expect(edgeExists(db, node1.id, node2.id, "continuation")).toBeTruthy();
      expect(getEdgesFrom(db, node1.id)).toHaveLength(1);
      expect(getEdgesTo(db, node2.id)).toHaveLength(1);
    });
  });
});
