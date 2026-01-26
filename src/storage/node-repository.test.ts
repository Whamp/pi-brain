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
  countLessons,
  countNodes,
  countSearchResults,
  createEdge,
  createNode,
  deleteEdge,
  deleteNode,
  edgeExists,
  edgeRowToEdge,
  findPath,
  getAncestors,
  getAllComputers,
  getAllNodeTypes,
  getAllNodeVersions,
  getAllProjects,
  getAllTags,
  getAllTopics,
  getAggregatedQuirks,
  getAllQuirkModels,
  getConnectedNodes,
  getDescendants,
  getEdge,
  getEdgesFrom,
  getEdgesTo,
  getLessonsByLevel,
  getLessonTags,
  getNode,
  getNodeEdges,
  getNodeLessons,
  getNodeQuirks,
  getNodesByTag,
  getNodesByTopic,
  getNodeTags,
  getNodeToolErrors,
  getNodeTopics,
  getNodeVersion,
  getQuirksByModel,
  getSubgraph,
  indexNodeForSearch,
  linkNodeToPredecessors,
  listLessons,
  listNodes,
  listQuirks,
  countQuirks,
  nodeExistsInDb,
  searchNodes,
  searchNodesAdvanced,
  updateNode,
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
  // Tag and Topic Indexing Tests
  // ===========================================================================

  describe("tag and topic indexing", () => {
    it("should retrieve all unique tags across nodes and lessons", () => {
      const node1 = createTestNode({
        semantic: { tags: ["tag1", "shared"], topics: [] },
        lessons: {
          ...emptyLessons(),
          project: [
            {
              level: "project",
              summary: "L1",
              details: "D1",
              confidence: "high",
              tags: ["lesson-tag1"],
            },
          ],
        },
      });
      const node2 = createTestNode({
        semantic: { tags: ["tag2", "shared"], topics: [] },
        lessons: {
          ...emptyLessons(),
          task: [
            {
              level: "task",
              summary: "L2",
              details: "D2",
              confidence: "medium",
              tags: ["lesson-tag2"],
            },
          ],
        },
      });

      createNode(db, node1, options);
      createNode(db, node2, options);

      const allTags = getAllTags(db);
      expect(allTags).toContain("tag1");
      expect(allTags).toContain("tag2");
      expect(allTags).toContain("shared");
      expect(allTags).toContain("lesson-tag1");
      expect(allTags).toContain("lesson-tag2");
      expect(allTags).toHaveLength(5);
    });

    it("should retrieve all unique topics", () => {
      const node1 = createTestNode({
        semantic: { tags: [], topics: ["topic1", "shared-topic"] },
      });
      const node2 = createTestNode({
        semantic: { tags: [], topics: ["topic2", "shared-topic"] },
      });

      createNode(db, node1, options);
      createNode(db, node2, options);

      const allTopics = getAllTopics(db);
      expect(allTopics).toContain("topic1");
      expect(allTopics).toContain("topic2");
      expect(allTopics).toContain("shared-topic");
      expect(allTopics).toHaveLength(3);
    });

    it("should get tags for a specific lesson", () => {
      const node = createTestNode({
        lessons: {
          ...emptyLessons(),
          project: [
            {
              level: "project",
              summary: "L1",
              details: "D1",
              confidence: "high",
              tags: ["tag-a", "tag-b"],
            },
          ],
        },
      });
      createNode(db, node, options);

      const lessons = getNodeLessons(db, node.id);
      const lessonTags = getLessonTags(db, lessons[0].id);
      expect(lessonTags).toContain("tag-a");
      expect(lessonTags).toContain("tag-b");
    });

    it("should find nodes by tag (both node and lesson tags)", () => {
      const node1 = createTestNode({
        semantic: { tags: ["search-tag"], topics: [] },
      });
      const node2 = createTestNode({
        lessons: {
          ...emptyLessons(),
          task: [
            {
              level: "task",
              summary: "L",
              details: "D",
              confidence: "high",
              tags: ["search-tag"],
            },
          ],
        },
      });
      const node3 = createTestNode({
        semantic: { tags: ["other"], topics: [] },
      });

      createNode(db, node1, options);
      createNode(db, node2, options);
      createNode(db, node3, options);

      const results = getNodesByTag(db, "search-tag");
      expect(results).toHaveLength(2);
      expect(results.map((r) => r.id)).toContain(node1.id);
      expect(results.map((r) => r.id)).toContain(node2.id);
      expect(results.map((r) => r.id)).not.toContain(node3.id);
    });

    it("should find nodes by topic", () => {
      const node1 = createTestNode({
        semantic: { tags: [], topics: ["search-topic"] },
      });
      const node2 = createTestNode({
        semantic: { tags: [], topics: ["other"] },
      });

      createNode(db, node1, options);
      createNode(db, node2, options);

      const results = getNodesByTopic(db, "search-topic");
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(node1.id);
    });

    it("should include topics in FTS index", () => {
      const node = createTestNode({
        semantic: {
          tags: [],
          topics: ["unique-topic-keyword"],
        },
      });
      createNode(db, node, options);

      const results = searchNodes(db, "unique-topic-keyword");
      expect(results.some((r) => r.id === node.id)).toBeTruthy();
    });

    it("should include all lesson tags in FTS tags column", () => {
      const node = createTestNode({
        semantic: { tags: ["node-tag"], topics: [] },
        lessons: {
          ...emptyLessons(),
          project: [
            {
              level: "project",
              summary: "L",
              details: "D",
              confidence: "high",
              tags: ["unique-lesson-tag"],
            },
          ],
        },
      });
      createNode(db, node, options);

      const results = searchNodes(db, "unique-lesson-tag");
      expect(results.some((r) => r.id === node.id)).toBeTruthy();
    });
  });

  describe("linkNodeToPredecessors", () => {
    it("should create a continuation edge to the previous node in the same session", () => {
      const node1 = createTestNode({
        id: "node1",
        metadata: {
          ...createTestNode().metadata,
          timestamp: "2026-01-25T10:00:00Z",
        },
      });
      const node2 = createTestNode({
        id: "node2",
        metadata: {
          ...createTestNode().metadata,
          timestamp: "2026-01-25T10:10:00Z",
        },
      });
      createNode(db, node1, options);
      createNode(db, node2, options);

      const edges = linkNodeToPredecessors(db, node2);
      expect(edges).toHaveLength(1);
      expect(edges[0].type).toBe("continuation");
      expect(edges[0].sourceNodeId).toBe(node1.id);
      expect(edges[0].targetNodeId).toBe(node2.id);
    });

    it("should use boundaryType for edge type if provided", () => {
      const node1 = createTestNode({
        id: "node1",
        metadata: {
          ...createTestNode().metadata,
          timestamp: "2026-01-25T10:00:00Z",
        },
      });
      const node2 = createTestNode({
        id: "node2",
        metadata: {
          ...createTestNode().metadata,
          timestamp: "2026-01-25T10:10:00Z",
        },
      });
      createNode(db, node1, options);
      createNode(db, node2, options);

      const edges = linkNodeToPredecessors(db, node2, {
        boundaryType: "resume",
      });
      expect(edges).toHaveLength(1);
      expect(edges[0].type).toBe("resume");
    });

    it("should create a fork edge if parentSession is provided and no previous node exists", () => {
      const parentNode = createTestNode({
        id: "parent-node",
        source: {
          ...createTestNode().source,
          sessionFile: "/tmp/parent.jsonl",
        },
      });
      createNode(db, parentNode, options);

      const childNode = createTestNode({
        id: "child-node",
        source: {
          ...createTestNode().source,
          sessionFile: "/tmp/child.jsonl",
          parentSession: "/tmp/parent.jsonl",
        },
      });
      createNode(db, childNode, options);

      const edges = linkNodeToPredecessors(db, childNode);
      expect(edges).toHaveLength(1);
      expect(edges[0].type).toBe("fork");
      expect(edges[0].sourceNodeId).toBe(parentNode.id);
      expect(edges[0].targetNodeId).toBe(childNode.id);
    });

    it("should be idempotent - calling multiple times does not create duplicate edges", () => {
      const node1 = createTestNode({
        id: "node1",
        metadata: {
          ...createTestNode().metadata,
          timestamp: "2026-01-25T10:00:00Z",
        },
      });
      const node2 = createTestNode({
        id: "node2",
        metadata: {
          ...createTestNode().metadata,
          timestamp: "2026-01-25T10:10:00Z",
        },
      });
      createNode(db, node1, options);
      createNode(db, node2, options);

      // Call multiple times
      const edges1 = linkNodeToPredecessors(db, node2);
      const edges2 = linkNodeToPredecessors(db, node2);
      const edges3 = linkNodeToPredecessors(db, node2);

      // First call creates edge, subsequent calls return empty
      expect(edges1).toHaveLength(1);
      expect(edges2).toHaveLength(0);
      expect(edges3).toHaveLength(0);

      // Only one edge should exist in the database
      const allEdges = getEdgesTo(db, node2.id);
      expect(allEdges).toHaveLength(1);
    });

    it("should fall back to 'continuation' for invalid boundaryType", () => {
      const node1 = createTestNode({
        id: "node1",
        metadata: {
          ...createTestNode().metadata,
          timestamp: "2026-01-25T10:00:00Z",
        },
      });
      const node2 = createTestNode({
        id: "node2",
        metadata: {
          ...createTestNode().metadata,
          timestamp: "2026-01-25T10:10:00Z",
        },
      });
      createNode(db, node1, options);
      createNode(db, node2, options);

      const edges = linkNodeToPredecessors(db, node2, {
        boundaryType: "invalid_type_that_does_not_exist",
      });
      expect(edges).toHaveLength(1);
      expect(edges[0].type).toBe("continuation");
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

    it("should return empty array for empty query", () => {
      const results = searchNodes(db, "");
      expect(results).toStrictEqual([]);
    });

    it("should return empty array for whitespace-only query", () => {
      const results = searchNodes(db, "   ");
      expect(results).toStrictEqual([]);
    });
  });

  // ===========================================================================
  // Enhanced Full-Text Search Tests
  // ===========================================================================

  describe("searchNodesAdvanced", () => {
    it("should return results with scores and highlights", () => {
      const node = createTestNode({
        content: {
          summary: "Implemented unique authentication with JWT tokens",
          outcome: "success",
          keyDecisions: [],
          filesTouched: [],
          toolsUsed: [],
          errorsSeen: [],
        },
      });
      createNode(db, node, options);

      const { results, total } = searchNodesAdvanced(
        db,
        "unique authentication"
      );
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(total).toBeGreaterThanOrEqual(1);

      const match = results.find((r) => r.node.id === node.id);
      expect(match).toBeDefined();
      expect(typeof match?.score).toBe("number");
      expect(match?.highlights.length).toBeGreaterThan(0);
      expect(match?.highlights[0].field).toBe("summary");
    });

    it("should filter by specific fields", () => {
      const node1 = createTestNode({
        content: {
          summary: "Summary with uniqueFieldTest123",
          outcome: "success",
          keyDecisions: [
            {
              what: "Decision content",
              why: "Reason",
              alternativesConsidered: [],
            },
          ],
          filesTouched: [],
          toolsUsed: [],
          errorsSeen: [],
        },
      });
      const node2 = createTestNode({
        content: {
          summary: "Different summary",
          outcome: "success",
          keyDecisions: [
            {
              what: "uniqueFieldTest123 in decision",
              why: "Test",
              alternativesConsidered: [],
            },
          ],
          filesTouched: [],
          toolsUsed: [],
          errorsSeen: [],
        },
      });
      createNode(db, node1, options);
      createNode(db, node2, options);

      // Search only in summary field
      const summaryResults = searchNodesAdvanced(db, "uniqueFieldTest123", {
        fields: ["summary"],
      });
      expect(
        summaryResults.results.some((r) => r.node.id === node1.id)
      ).toBeTruthy();
      expect(
        summaryResults.results.some((r) => r.node.id === node2.id)
      ).toBeFalsy();

      // Search only in decisions field
      const decisionResults = searchNodesAdvanced(db, "uniqueFieldTest123", {
        fields: ["decisions"],
      });
      expect(
        decisionResults.results.some((r) => r.node.id === node2.id)
      ).toBeTruthy();
      expect(
        decisionResults.results.some((r) => r.node.id === node1.id)
      ).toBeFalsy();
    });

    it("should respect pagination options", () => {
      // Create 10 nodes with same keyword
      for (let i = 0; i < 10; i++) {
        const node = createTestNode({
          content: {
            summary: `Node ${i} with paginationTestKeyword789`,
            outcome: "success",
            keyDecisions: [],
            filesTouched: [],
            toolsUsed: [],
            errorsSeen: [],
          },
        });
        createNode(db, node, options);
      }

      // Get first page
      const page1 = searchNodesAdvanced(db, "paginationTestKeyword789", {
        limit: 3,
        offset: 0,
      });
      expect(page1.results).toHaveLength(3);
      expect(page1.total).toBe(10);
      expect(page1.limit).toBe(3);
      expect(page1.offset).toBe(0);

      // Get second page
      const page2 = searchNodesAdvanced(db, "paginationTestKeyword789", {
        limit: 3,
        offset: 3,
      });
      expect(page2.results).toHaveLength(3);
      expect(page2.offset).toBe(3);

      // Ensure no overlap between pages
      const page1Ids = new Set(page1.results.map((r) => r.node.id));
      const page2Ids = new Set(page2.results.map((r) => r.node.id));
      for (const id of page2Ids) {
        expect(page1Ids.has(id)).toBeFalsy();
      }
    });

    it("should combine search with filters", () => {
      const node1 = createTestNode({
        classification: {
          type: "coding",
          project: "/home/test/filterCombine",
          isNewProject: false,
          hadClearGoal: true,
        },
        content: {
          summary: "filterCombineKeyword456 in coding project",
          outcome: "success",
          keyDecisions: [],
          filesTouched: [],
          toolsUsed: [],
          errorsSeen: [],
        },
      });
      const node2 = createTestNode({
        classification: {
          type: "debugging",
          project: "/home/test/other",
          isNewProject: false,
          hadClearGoal: true,
        },
        content: {
          summary: "filterCombineKeyword456 in debugging project",
          outcome: "success",
          keyDecisions: [],
          filesTouched: [],
          toolsUsed: [],
          errorsSeen: [],
        },
      });
      createNode(db, node1, options);
      createNode(db, node2, options);

      // Search with type filter
      const results = searchNodesAdvanced(db, "filterCombineKeyword456", {
        filters: { type: "coding" },
      });
      expect(results.results.some((r) => r.node.id === node1.id)).toBeTruthy();
      expect(results.results.some((r) => r.node.id === node2.id)).toBeFalsy();
    });

    it("should combine search with project filter", () => {
      const node1 = createTestNode({
        classification: {
          type: "coding",
          project: "/home/test/projectFilter123",
          isNewProject: false,
          hadClearGoal: true,
        },
        content: {
          summary: "projectFilterKeyword111 in target project",
          outcome: "success",
          keyDecisions: [],
          filesTouched: [],
          toolsUsed: [],
          errorsSeen: [],
        },
      });
      const node2 = createTestNode({
        classification: {
          type: "coding",
          project: "/home/test/other",
          isNewProject: false,
          hadClearGoal: true,
        },
        content: {
          summary: "projectFilterKeyword111 in other project",
          outcome: "success",
          keyDecisions: [],
          filesTouched: [],
          toolsUsed: [],
          errorsSeen: [],
        },
      });
      createNode(db, node1, options);
      createNode(db, node2, options);

      const results = searchNodesAdvanced(db, "projectFilterKeyword111", {
        filters: { project: "projectFilter123" },
      });
      expect(results.results.some((r) => r.node.id === node1.id)).toBeTruthy();
      expect(results.results.some((r) => r.node.id === node2.id)).toBeFalsy();
    });

    it("should return empty results for empty query", () => {
      const results = searchNodesAdvanced(db, "");
      expect(results.results).toStrictEqual([]);
      expect(results.total).toBe(0);
    });

    it("should return empty results for whitespace-only query", () => {
      const results = searchNodesAdvanced(db, "   ");
      expect(results.results).toStrictEqual([]);
      expect(results.total).toBe(0);
    });

    it("should search in lessons", () => {
      const node = createTestNode({
        lessons: {
          ...emptyLessons(),
          project: [
            {
              level: "project",
              summary: "lessonSearchAdvanced999 unique content",
              details: "More details",
              confidence: "high",
              tags: [],
            },
          ],
        },
      });
      createNode(db, node, options);

      const results = searchNodesAdvanced(db, "lessonSearchAdvanced999", {
        fields: ["lessons"],
      });
      expect(results.results.some((r) => r.node.id === node.id)).toBeTruthy();
    });

    it("should enforce max limit of 500", () => {
      const results = searchNodesAdvanced(db, "test", { limit: 1000 });
      expect(results.limit).toBe(500);
    });

    it("should enforce min limit of 1", () => {
      const results = searchNodesAdvanced(db, "test", { limit: 0 });
      expect(results.limit).toBe(1);
    });
  });

  describe("countSearchResults", () => {
    it("should count matching results without fetching data", () => {
      // Create nodes with unique keyword
      for (let i = 0; i < 5; i++) {
        const node = createTestNode({
          content: {
            summary: `Node ${i} with countSearchKeyword222`,
            outcome: "success",
            keyDecisions: [],
            filesTouched: [],
            toolsUsed: [],
            errorsSeen: [],
          },
        });
        createNode(db, node, options);
      }

      const count = countSearchResults(db, "countSearchKeyword222");
      expect(count).toBe(5);
    });

    it("should count with field filter", () => {
      const node1 = createTestNode({
        content: {
          summary: "countFieldFilter333 in summary",
          outcome: "success",
          keyDecisions: [],
          filesTouched: [],
          toolsUsed: [],
          errorsSeen: [],
        },
      });
      const node2 = createTestNode({
        content: {
          summary: "Different summary",
          outcome: "success",
          keyDecisions: [
            {
              what: "countFieldFilter333",
              why: "Test",
              alternativesConsidered: [],
            },
          ],
          filesTouched: [],
          toolsUsed: [],
          errorsSeen: [],
        },
      });
      createNode(db, node1, options);
      createNode(db, node2, options);

      const summaryCount = countSearchResults(db, "countFieldFilter333", {
        fields: ["summary"],
      });
      expect(summaryCount).toBe(1);

      const allFieldsCount = countSearchResults(db, "countFieldFilter333");
      expect(allFieldsCount).toBe(2);
    });

    it("should return 0 for empty query", () => {
      const count = countSearchResults(db, "");
      expect(count).toBe(0);
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

  // ===========================================================================
  // Query Layer: listNodes with Filters
  // ===========================================================================

  describe("listNodes", () => {
    it("should return all nodes when no filters provided", () => {
      const node1 = createTestNode({
        classification: {
          ...createTestNode().classification,
          project: "/project/a",
        },
      });
      const node2 = createTestNode({
        classification: {
          ...createTestNode().classification,
          project: "/project/b",
        },
      });
      createNode(db, node1, options);
      createNode(db, node2, options);

      const result = listNodes(db);

      expect(result.nodes).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
    });

    it("should filter by project (partial match)", () => {
      const node1 = createTestNode({
        classification: {
          ...createTestNode().classification,
          project: "/home/will/projects/pi-brain",
        },
      });
      const node2 = createTestNode({
        classification: {
          ...createTestNode().classification,
          project: "/home/will/projects/other-app",
        },
      });
      createNode(db, node1, options);
      createNode(db, node2, options);

      const result = listNodes(db, { project: "pi-brain" });

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].project).toContain("pi-brain");
      expect(result.total).toBe(1);
    });

    it("should filter by type (exact match)", () => {
      const node1 = createTestNode({
        classification: { ...createTestNode().classification, type: "coding" },
      });
      const node2 = createTestNode({
        classification: {
          ...createTestNode().classification,
          type: "debugging",
        },
      });
      const node3 = createTestNode({
        classification: { ...createTestNode().classification, type: "coding" },
      });
      createNode(db, node1, options);
      createNode(db, node2, options);
      createNode(db, node3, options);

      const result = listNodes(db, { type: "coding" });

      expect(result.nodes).toHaveLength(2);
      expect(result.total).toBe(2);
      for (const node of result.nodes) {
        expect(node.type).toBe("coding");
      }
    });

    it("should filter by outcome", () => {
      const node1 = createTestNode({
        content: { ...createTestNode().content, outcome: "success" },
      });
      const node2 = createTestNode({
        content: { ...createTestNode().content, outcome: "failed" },
      });
      const node3 = createTestNode({
        content: { ...createTestNode().content, outcome: "partial" },
      });
      createNode(db, node1, options);
      createNode(db, node2, options);
      createNode(db, node3, options);

      const result = listNodes(db, { outcome: "failed" });

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].outcome).toBe("failed");
    });

    it("should filter by date range (from)", () => {
      const node1 = createTestNode({
        metadata: {
          ...createTestNode().metadata,
          timestamp: "2026-01-01T10:00:00Z",
        },
      });
      const node2 = createTestNode({
        metadata: {
          ...createTestNode().metadata,
          timestamp: "2026-01-15T10:00:00Z",
        },
      });
      createNode(db, node1, options);
      createNode(db, node2, options);

      const result = listNodes(db, { from: "2026-01-10T00:00:00Z" });

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].timestamp).toBe("2026-01-15T10:00:00Z");
    });

    it("should filter by date range (to)", () => {
      const node1 = createTestNode({
        metadata: {
          ...createTestNode().metadata,
          timestamp: "2026-01-01T10:00:00Z",
        },
      });
      const node2 = createTestNode({
        metadata: {
          ...createTestNode().metadata,
          timestamp: "2026-01-15T10:00:00Z",
        },
      });
      createNode(db, node1, options);
      createNode(db, node2, options);

      const result = listNodes(db, { to: "2026-01-10T00:00:00Z" });

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].timestamp).toBe("2026-01-01T10:00:00Z");
    });

    it("should filter by date range (from and to)", () => {
      const node1 = createTestNode({
        metadata: {
          ...createTestNode().metadata,
          timestamp: "2026-01-01T10:00:00Z",
        },
      });
      const node2 = createTestNode({
        metadata: {
          ...createTestNode().metadata,
          timestamp: "2026-01-15T10:00:00Z",
        },
      });
      const node3 = createTestNode({
        metadata: {
          ...createTestNode().metadata,
          timestamp: "2026-01-30T10:00:00Z",
        },
      });
      createNode(db, node1, options);
      createNode(db, node2, options);
      createNode(db, node3, options);

      const result = listNodes(db, {
        from: "2026-01-10T00:00:00Z",
        to: "2026-01-20T00:00:00Z",
      });

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].timestamp).toBe("2026-01-15T10:00:00Z");
    });

    it("should filter by computer", () => {
      const node1 = createTestNode({
        source: { ...createTestNode().source, computer: "desktop" },
      });
      const node2 = createTestNode({
        source: { ...createTestNode().source, computer: "laptop" },
      });
      createNode(db, node1, options);
      createNode(db, node2, options);

      const result = listNodes(db, { computer: "laptop" });

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].computer).toBe("laptop");
    });

    it("should filter by hadClearGoal", () => {
      const node1 = createTestNode({
        classification: {
          ...createTestNode().classification,
          hadClearGoal: true,
        },
      });
      const node2 = createTestNode({
        classification: {
          ...createTestNode().classification,
          hadClearGoal: false,
        },
      });
      createNode(db, node1, options);
      createNode(db, node2, options);

      const vagueResult = listNodes(db, { hadClearGoal: false });
      expect(vagueResult.nodes).toHaveLength(1);
      expect(vagueResult.nodes[0].had_clear_goal).toBe(0);

      const clearResult = listNodes(db, { hadClearGoal: true });
      expect(clearResult.nodes).toHaveLength(1);
      expect(clearResult.nodes[0].had_clear_goal).toBe(1);
    });

    it("should filter by isNewProject", () => {
      const node1 = createTestNode({
        classification: {
          ...createTestNode().classification,
          isNewProject: true,
        },
      });
      const node2 = createTestNode({
        classification: {
          ...createTestNode().classification,
          isNewProject: false,
        },
      });
      createNode(db, node1, options);
      createNode(db, node2, options);

      const result = listNodes(db, { isNewProject: true });

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].is_new_project).toBe(1);
    });

    it("should combine multiple filters", () => {
      const node1 = createTestNode({
        classification: {
          ...createTestNode().classification,
          type: "coding",
          project: "/proj/a",
        },
        content: { ...createTestNode().content, outcome: "success" },
      });
      const node2 = createTestNode({
        classification: {
          ...createTestNode().classification,
          type: "debugging",
          project: "/proj/a",
        },
        content: { ...createTestNode().content, outcome: "success" },
      });
      const node3 = createTestNode({
        classification: {
          ...createTestNode().classification,
          type: "coding",
          project: "/proj/b",
        },
        content: { ...createTestNode().content, outcome: "failed" },
      });
      createNode(db, node1, options);
      createNode(db, node2, options);
      createNode(db, node3, options);

      const result = listNodes(db, { type: "coding", outcome: "success" });

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].type).toBe("coding");
      expect(result.nodes[0].outcome).toBe("success");
    });

    it("should apply pagination with limit and offset", () => {
      // Create 5 nodes
      for (let i = 0; i < 5; i++) {
        const node = createTestNode({
          metadata: {
            ...createTestNode().metadata,
            timestamp: `2026-01-0${i + 1}T10:00:00Z`,
          },
        });
        createNode(db, node, options);
      }

      const page1 = listNodes(
        db,
        {},
        { limit: 2, offset: 0, sort: "timestamp", order: "asc" }
      );
      expect(page1.nodes).toHaveLength(2);
      expect(page1.total).toBe(5);
      expect(page1.nodes[0].timestamp).toBe("2026-01-01T10:00:00Z");
      expect(page1.nodes[1].timestamp).toBe("2026-01-02T10:00:00Z");

      const page2 = listNodes(
        db,
        {},
        { limit: 2, offset: 2, sort: "timestamp", order: "asc" }
      );
      expect(page2.nodes).toHaveLength(2);
      expect(page2.total).toBe(5);
      expect(page2.nodes[0].timestamp).toBe("2026-01-03T10:00:00Z");
      expect(page2.nodes[1].timestamp).toBe("2026-01-04T10:00:00Z");

      const page3 = listNodes(
        db,
        {},
        { limit: 2, offset: 4, sort: "timestamp", order: "asc" }
      );
      expect(page3.nodes).toHaveLength(1);
      expect(page3.total).toBe(5);
    });

    it("should sort by timestamp descending by default", () => {
      const node1 = createTestNode({
        metadata: {
          ...createTestNode().metadata,
          timestamp: "2026-01-01T10:00:00Z",
        },
      });
      const node2 = createTestNode({
        metadata: {
          ...createTestNode().metadata,
          timestamp: "2026-01-15T10:00:00Z",
        },
      });
      createNode(db, node1, options);
      createNode(db, node2, options);

      const result = listNodes(db);

      expect(result.nodes[0].timestamp).toBe("2026-01-15T10:00:00Z");
      expect(result.nodes[1].timestamp).toBe("2026-01-01T10:00:00Z");
    });

    it("should sort ascending when order is asc", () => {
      const node1 = createTestNode({
        metadata: {
          ...createTestNode().metadata,
          timestamp: "2026-01-15T10:00:00Z",
        },
      });
      const node2 = createTestNode({
        metadata: {
          ...createTestNode().metadata,
          timestamp: "2026-01-01T10:00:00Z",
        },
      });
      createNode(db, node1, options);
      createNode(db, node2, options);

      const result = listNodes(db, {}, { order: "asc" });

      expect(result.nodes[0].timestamp).toBe("2026-01-01T10:00:00Z");
      expect(result.nodes[1].timestamp).toBe("2026-01-15T10:00:00Z");
    });

    it("should sort by project", () => {
      const node1 = createTestNode({
        classification: {
          ...createTestNode().classification,
          project: "/project/zebra",
        },
      });
      const node2 = createTestNode({
        classification: {
          ...createTestNode().classification,
          project: "/project/alpha",
        },
      });
      createNode(db, node1, options);
      createNode(db, node2, options);

      const result = listNodes(db, {}, { sort: "project", order: "asc" });

      expect(result.nodes[0].project).toBe("/project/alpha");
      expect(result.nodes[1].project).toBe("/project/zebra");
    });

    it("should enforce max limit of 500", () => {
      const result = listNodes(db, {}, { limit: 1000 });
      expect(result.limit).toBe(500);
    });

    it("should enforce min limit of 1", () => {
      const result = listNodes(db, {}, { limit: 0 });
      expect(result.limit).toBe(1);
    });

    it("should default to safe sort field for invalid input", () => {
      const node = createTestNode();
      createNode(db, node, options);

      // Invalid sort field should fall back to "timestamp"
      const result = listNodes(db, {}, { sort: "invalid_field" as never });

      expect(result.nodes).toHaveLength(1);
      // No error thrown, defaults to timestamp
    });

    it("should return empty result when no nodes match filters", () => {
      const node = createTestNode({
        classification: { ...createTestNode().classification, type: "coding" },
      });
      createNode(db, node, options);

      const result = listNodes(db, { type: "debugging" });

      expect(result.nodes).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it("should filter by single tag", () => {
      const node1 = createTestNode({
        semantic: {
          ...createTestNode().semantic,
          tags: ["auth", "jwt", "security"],
        },
      });
      const node2 = createTestNode({
        semantic: {
          ...createTestNode().semantic,
          tags: ["database", "sql"],
        },
      });
      const node3 = createTestNode({
        semantic: {
          ...createTestNode().semantic,
          tags: ["auth", "oauth"],
        },
      });
      createNode(db, node1, options);
      createNode(db, node2, options);
      createNode(db, node3, options);

      const result = listNodes(db, { tags: ["auth"] });

      expect(result.nodes).toHaveLength(2);
      expect(result.total).toBe(2);
      const ids = result.nodes.map((n) => n.id);
      expect(ids).toContain(node1.id);
      expect(ids).toContain(node3.id);
    });

    it("should filter by multiple tags with AND logic", () => {
      const node1 = createTestNode({
        semantic: {
          ...createTestNode().semantic,
          tags: ["auth", "jwt", "security"],
        },
      });
      const node2 = createTestNode({
        semantic: {
          ...createTestNode().semantic,
          tags: ["auth", "oauth"],
        },
      });
      const node3 = createTestNode({
        semantic: {
          ...createTestNode().semantic,
          tags: ["jwt", "tokens"],
        },
      });
      createNode(db, node1, options);
      createNode(db, node2, options);
      createNode(db, node3, options);

      // Only node1 has BOTH "auth" and "jwt"
      const result = listNodes(db, { tags: ["auth", "jwt"] });

      expect(result.nodes).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.nodes[0].id).toBe(node1.id);
    });

    it("should filter by single topic", () => {
      const node1 = createTestNode({
        semantic: {
          ...createTestNode().semantic,
          topics: ["authentication", "web security"],
        },
      });
      const node2 = createTestNode({
        semantic: {
          ...createTestNode().semantic,
          topics: ["database design"],
        },
      });
      createNode(db, node1, options);
      createNode(db, node2, options);

      const result = listNodes(db, { topics: ["authentication"] });

      expect(result.nodes).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.nodes[0].id).toBe(node1.id);
    });

    it("should filter by multiple topics with AND logic", () => {
      const node1 = createTestNode({
        semantic: {
          ...createTestNode().semantic,
          topics: ["authentication", "web security", "api design"],
        },
      });
      const node2 = createTestNode({
        semantic: {
          ...createTestNode().semantic,
          topics: ["authentication", "mobile apps"],
        },
      });
      createNode(db, node1, options);
      createNode(db, node2, options);

      // Only node1 has BOTH "authentication" and "api design"
      const result = listNodes(db, {
        topics: ["authentication", "api design"],
      });

      expect(result.nodes).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.nodes[0].id).toBe(node1.id);
    });

    it("should combine tags and topics filters", () => {
      const node1 = createTestNode({
        semantic: {
          ...createTestNode().semantic,
          tags: ["auth", "jwt"],
          topics: ["authentication", "web security"],
        },
      });
      const node2 = createTestNode({
        semantic: {
          ...createTestNode().semantic,
          tags: ["auth", "jwt"],
          topics: ["database design"],
        },
      });
      const node3 = createTestNode({
        semantic: {
          ...createTestNode().semantic,
          tags: ["database"],
          topics: ["authentication", "web security"],
        },
      });
      createNode(db, node1, options);
      createNode(db, node2, options);
      createNode(db, node3, options);

      // Only node1 has tag "auth" AND topic "authentication"
      const result = listNodes(db, {
        tags: ["auth"],
        topics: ["authentication"],
      });

      expect(result.nodes).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.nodes[0].id).toBe(node1.id);
    });

    it("should combine tags filter with other filters", () => {
      const node1 = createTestNode({
        classification: { ...createTestNode().classification, type: "coding" },
        semantic: {
          ...createTestNode().semantic,
          tags: ["auth", "jwt"],
        },
      });
      const node2 = createTestNode({
        classification: {
          ...createTestNode().classification,
          type: "debugging",
        },
        semantic: {
          ...createTestNode().semantic,
          tags: ["auth", "jwt"],
        },
      });
      createNode(db, node1, options);
      createNode(db, node2, options);

      // Only node1 is "coding" with tag "auth"
      const result = listNodes(db, { type: "coding", tags: ["auth"] });

      expect(result.nodes).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.nodes[0].id).toBe(node1.id);
    });

    it("should return empty when no nodes have requested tags", () => {
      const node = createTestNode({
        semantic: {
          ...createTestNode().semantic,
          tags: ["auth", "jwt"],
        },
      });
      createNode(db, node, options);

      const result = listNodes(db, { tags: ["nonexistent"] });

      expect(result.nodes).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it("should return empty when no nodes have all requested tags", () => {
      const node = createTestNode({
        semantic: {
          ...createTestNode().semantic,
          tags: ["auth"],
        },
      });
      createNode(db, node, options);

      // Node has "auth" but not "jwt"
      const result = listNodes(db, { tags: ["auth", "jwt"] });

      expect(result.nodes).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it("should handle empty tags array", () => {
      const node = createTestNode();
      createNode(db, node, options);

      // Empty tags array should not filter
      const result = listNodes(db, { tags: [] });

      expect(result.nodes).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("should paginate tag-filtered results correctly", () => {
      // Create 5 nodes with same tag
      const nodes: Node[] = [];
      for (let i = 0; i < 5; i++) {
        const node = createTestNode({
          metadata: {
            ...createTestNode().metadata,
            timestamp: `2026-01-${String(i + 1).padStart(2, "0")}T00:00:00Z`,
          },
          semantic: {
            ...createTestNode().semantic,
            tags: ["common-tag"],
          },
        });
        nodes.push(node);
        createNode(db, node, options);
      }

      const page1 = listNodes(db, { tags: ["common-tag"] }, { limit: 2 });
      expect(page1.nodes).toHaveLength(2);
      expect(page1.total).toBe(5);

      const page2 = listNodes(
        db,
        { tags: ["common-tag"] },
        { limit: 2, offset: 2 }
      );
      expect(page2.nodes).toHaveLength(2);
      expect(page2.total).toBe(5);

      const page3 = listNodes(
        db,
        { tags: ["common-tag"] },
        { limit: 2, offset: 4 }
      );
      expect(page3.nodes).toHaveLength(1);
      expect(page3.total).toBe(5);
    });
  });

  describe("getAllProjects", () => {
    it("should return unique projects sorted alphabetically", () => {
      const node1 = createTestNode({
        classification: {
          ...createTestNode().classification,
          project: "/project/zebra",
        },
      });
      const node2 = createTestNode({
        classification: {
          ...createTestNode().classification,
          project: "/project/alpha",
        },
      });
      const node3 = createTestNode({
        classification: {
          ...createTestNode().classification,
          project: "/project/alpha",
        }, // duplicate
      });
      createNode(db, node1, options);
      createNode(db, node2, options);
      createNode(db, node3, options);

      const projects = getAllProjects(db);

      expect(projects).toStrictEqual(["/project/alpha", "/project/zebra"]);
    });

    it("should return empty array when no nodes exist", () => {
      const projects = getAllProjects(db);
      expect(projects).toStrictEqual([]);
    });
  });

  describe("getAllNodeTypes", () => {
    it("should return unique node types sorted alphabetically", () => {
      const node1 = createTestNode({
        classification: {
          ...createTestNode().classification,
          type: "debugging",
        },
      });
      const node2 = createTestNode({
        classification: { ...createTestNode().classification, type: "coding" },
      });
      createNode(db, node1, options);
      createNode(db, node2, options);

      const types = getAllNodeTypes(db);

      expect(types).toStrictEqual(["coding", "debugging"]);
    });
  });

  describe("getAllComputers", () => {
    it("should return unique computers sorted alphabetically", () => {
      const node1 = createTestNode({
        source: { ...createTestNode().source, computer: "laptop" },
      });
      const node2 = createTestNode({
        source: { ...createTestNode().source, computer: "desktop" },
      });
      createNode(db, node1, options);
      createNode(db, node2, options);

      const computers = getAllComputers(db);

      expect(computers).toStrictEqual(["desktop", "laptop"]);
    });
  });

  describe("countNodes", () => {
    it("should count nodes matching filters", () => {
      const node1 = createTestNode({
        classification: { ...createTestNode().classification, type: "coding" },
      });
      const node2 = createTestNode({
        classification: {
          ...createTestNode().classification,
          type: "debugging",
        },
      });
      const node3 = createTestNode({
        classification: { ...createTestNode().classification, type: "coding" },
      });
      createNode(db, node1, options);
      createNode(db, node2, options);
      createNode(db, node3, options);

      expect(countNodes(db)).toBe(3);
      expect(countNodes(db, { type: "coding" })).toBe(2);
      expect(countNodes(db, { type: "debugging" })).toBe(1);
      expect(countNodes(db, { type: "research" })).toBe(0);
    });
  });

  describe("getConnectedNodes", () => {
    it("should return empty result for node with no connections", () => {
      const node = createTestNode();
      createNode(db, node, options);

      const result = getConnectedNodes(db, node.id);

      expect(result.rootNodeId).toBe(node.id);
      expect(result.nodes).toHaveLength(0);
      expect(result.edges).toHaveLength(0);
    });

    it("should find directly connected nodes (1 hop)", () => {
      const nodeA = createTestNode();
      const nodeB = createTestNode();
      const nodeC = createTestNode();
      createNode(db, nodeA, options);
      createNode(db, nodeB, options);
      createNode(db, nodeC, options);

      // A -> B -> C
      createEdge(db, nodeA.id, nodeB.id, "continuation");
      createEdge(db, nodeB.id, nodeC.id, "continuation");

      // From A with depth 1, should only find B
      const result = getConnectedNodes(db, nodeA.id, { depth: 1 });

      expect(result.rootNodeId).toBe(nodeA.id);
      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].id).toBe(nodeB.id);
      expect(result.edges).toHaveLength(1);
      expect(result.edges[0].targetNodeId).toBe(nodeB.id);
    });

    it("should find multi-hop connected nodes", () => {
      const nodeA = createTestNode();
      const nodeB = createTestNode();
      const nodeC = createTestNode();
      createNode(db, nodeA, options);
      createNode(db, nodeB, options);
      createNode(db, nodeC, options);

      // A -> B -> C
      createEdge(db, nodeA.id, nodeB.id, "continuation");
      createEdge(db, nodeB.id, nodeC.id, "continuation");

      // From A with depth 2, should find both B and C
      const result = getConnectedNodes(db, nodeA.id, { depth: 2 });

      expect(result.nodes).toHaveLength(2);
      const nodeIds = result.nodes.map((n) => n.id);
      expect(nodeIds).toContain(nodeB.id);
      expect(nodeIds).toContain(nodeC.id);
      expect(result.edges).toHaveLength(2);
    });

    it("should respect direction=outgoing", () => {
      const nodeA = createTestNode();
      const nodeB = createTestNode();
      const nodeC = createTestNode();
      createNode(db, nodeA, options);
      createNode(db, nodeB, options);
      createNode(db, nodeC, options);

      // C -> A -> B (A has both incoming and outgoing)
      createEdge(db, nodeC.id, nodeA.id, "continuation");
      createEdge(db, nodeA.id, nodeB.id, "continuation");

      // From A, outgoing only should find B
      const result = getConnectedNodes(db, nodeA.id, { direction: "outgoing" });

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].id).toBe(nodeB.id);
    });

    it("should respect direction=incoming", () => {
      const nodeA = createTestNode();
      const nodeB = createTestNode();
      const nodeC = createTestNode();
      createNode(db, nodeA, options);
      createNode(db, nodeB, options);
      createNode(db, nodeC, options);

      // C -> A -> B (A has both incoming and outgoing)
      createEdge(db, nodeC.id, nodeA.id, "continuation");
      createEdge(db, nodeA.id, nodeB.id, "continuation");

      // From A, incoming only should find C
      const result = getConnectedNodes(db, nodeA.id, { direction: "incoming" });

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].id).toBe(nodeC.id);
    });

    it("should respect direction=both (default)", () => {
      const nodeA = createTestNode();
      const nodeB = createTestNode();
      const nodeC = createTestNode();
      createNode(db, nodeA, options);
      createNode(db, nodeB, options);
      createNode(db, nodeC, options);

      // C -> A -> B (A has both incoming and outgoing)
      createEdge(db, nodeC.id, nodeA.id, "continuation");
      createEdge(db, nodeA.id, nodeB.id, "continuation");

      // From A, both should find B and C
      const result = getConnectedNodes(db, nodeA.id, { direction: "both" });

      expect(result.nodes).toHaveLength(2);
      const nodeIds = result.nodes.map((n) => n.id);
      expect(nodeIds).toContain(nodeB.id);
      expect(nodeIds).toContain(nodeC.id);
    });

    it("should filter by edge types", () => {
      const nodeA = createTestNode();
      const nodeB = createTestNode();
      const nodeC = createTestNode();
      createNode(db, nodeA, options);
      createNode(db, nodeB, options);
      createNode(db, nodeC, options);

      // A -fork-> B, A -semantic-> C
      createEdge(db, nodeA.id, nodeB.id, "fork");
      createEdge(db, nodeA.id, nodeC.id, "semantic");

      // Filter to only fork edges
      const result = getConnectedNodes(db, nodeA.id, { edgeTypes: ["fork"] });

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].id).toBe(nodeB.id);
    });

    it("should avoid cycles in graph traversal", () => {
      const nodeA = createTestNode();
      const nodeB = createTestNode();
      const nodeC = createTestNode();
      createNode(db, nodeA, options);
      createNode(db, nodeB, options);
      createNode(db, nodeC, options);

      // Create a cycle: A -> B -> C -> A
      createEdge(db, nodeA.id, nodeB.id, "continuation");
      createEdge(db, nodeB.id, nodeC.id, "continuation");
      createEdge(db, nodeC.id, nodeA.id, "continuation");

      // Should not infinite loop, should find all nodes
      const result = getConnectedNodes(db, nodeA.id, { depth: 5 });

      expect(result.nodes).toHaveLength(2); // B and C (not A since it's root)
    });

    it("should include hop distance in edges", () => {
      const nodeA = createTestNode();
      const nodeB = createTestNode();
      const nodeC = createTestNode();
      createNode(db, nodeA, options);
      createNode(db, nodeB, options);
      createNode(db, nodeC, options);

      // A -> B -> C
      createEdge(db, nodeA.id, nodeB.id, "continuation");
      createEdge(db, nodeB.id, nodeC.id, "continuation");

      const result = getConnectedNodes(db, nodeA.id, { depth: 2 });

      // Edge A->B should be at hop 1, edge B->C should be at hop 2
      const edgeAB = result.edges.find((e) => e.targetNodeId === nodeB.id);
      const edgeBC = result.edges.find((e) => e.targetNodeId === nodeC.id);

      expect(edgeAB?.hopDistance).toBe(1);
      expect(edgeBC?.hopDistance).toBe(2);
    });

    it("should cap depth at maximum 5", () => {
      // Create chain of 7 nodes
      const nodes: Node[] = [];
      for (let i = 0; i < 7; i++) {
        const node = createTestNode();
        createNode(db, node, options);
        nodes.push(node);
      }

      // Create chain: 0 -> 1 -> 2 -> 3 -> 4 -> 5 -> 6
      for (let i = 0; i < 6; i++) {
        createEdge(db, nodes[i].id, nodes[i + 1].id, "continuation");
      }

      // Request depth 10, should be capped at 5
      const result = getConnectedNodes(db, nodes[0].id, { depth: 10 });

      // Should only find nodes 1-5 (5 hops), not node 6
      expect(result.nodes).toHaveLength(5);
      const nodeIds = result.nodes.map((n) => n.id);
      expect(nodeIds).not.toContain(nodes[6].id);
    });

    it("should handle minimum depth of 1", () => {
      const nodeA = createTestNode();
      const nodeB = createTestNode();
      createNode(db, nodeA, options);
      createNode(db, nodeB, options);
      createEdge(db, nodeA.id, nodeB.id, "continuation");

      // Request depth 0, should be treated as 1
      const result = getConnectedNodes(db, nodeA.id, { depth: 0 });

      expect(result.nodes).toHaveLength(1);
    });
  });

  describe("getSubgraph", () => {
    it("should return empty result for empty root list", () => {
      const result = getSubgraph(db, []);

      expect(result.rootNodeId).toBe("");
      expect(result.nodes).toHaveLength(0);
      expect(result.edges).toHaveLength(0);
    });

    it("should combine results from multiple roots", () => {
      const nodeA = createTestNode();
      const nodeB = createTestNode();
      const nodeC = createTestNode();
      const nodeD = createTestNode();
      createNode(db, nodeA, options);
      createNode(db, nodeB, options);
      createNode(db, nodeC, options);
      createNode(db, nodeD, options);

      // A -> B, C -> D (two separate chains)
      createEdge(db, nodeA.id, nodeB.id, "continuation");
      createEdge(db, nodeC.id, nodeD.id, "continuation");

      const result = getSubgraph(db, [nodeA.id, nodeC.id], { depth: 1 });

      // Should include all 4 nodes (both roots A,C and their connections B,D)
      expect(result.nodes).toHaveLength(4);
      expect(result.edges).toHaveLength(2);
    });

    it("should include root node for single root", () => {
      const nodeA = createTestNode();
      const nodeB = createTestNode();
      createNode(db, nodeA, options);
      createNode(db, nodeB, options);

      createEdge(db, nodeA.id, nodeB.id, "continuation");

      const result = getSubgraph(db, [nodeA.id], { depth: 1 });

      // Should include both root A and connected B
      expect(result.nodes).toHaveLength(2);
      const nodeIds = result.nodes.map((n) => n.id);
      expect(nodeIds).toContain(nodeA.id);
      expect(nodeIds).toContain(nodeB.id);
    });

    it("should deduplicate overlapping results", () => {
      const nodeA = createTestNode();
      const nodeB = createTestNode();
      const nodeC = createTestNode();
      createNode(db, nodeA, options);
      createNode(db, nodeB, options);
      createNode(db, nodeC, options);

      // A -> B <- C (B is reachable from both A and C)
      createEdge(db, nodeA.id, nodeB.id, "continuation");
      createEdge(db, nodeC.id, nodeB.id, "continuation");

      const result = getSubgraph(db, [nodeA.id, nodeC.id], { depth: 1 });

      // All 3 nodes, but B only once
      expect(result.nodes).toHaveLength(3);
      const nodeIds = result.nodes.map((n) => n.id);
      expect(nodeIds.filter((id) => id === nodeB.id)).toHaveLength(1);
    });
  });

  describe("findPath", () => {
    it("should return null when no path exists", () => {
      const nodeA = createTestNode();
      const nodeB = createTestNode();
      createNode(db, nodeA, options);
      createNode(db, nodeB, options);
      // No edge between them

      const result = findPath(db, nodeA.id, nodeB.id);

      expect(result).toBeNull();
    });

    it("should find direct path between adjacent nodes", () => {
      const nodeA = createTestNode();
      const nodeB = createTestNode();
      createNode(db, nodeA, options);
      createNode(db, nodeB, options);
      createEdge(db, nodeA.id, nodeB.id, "continuation");

      const result = findPath(db, nodeA.id, nodeB.id);

      expect(result).not.toBeNull();
      expect(result?.nodeIds).toStrictEqual([nodeA.id, nodeB.id]);
      expect(result?.edges).toHaveLength(1);
    });

    it("should find multi-hop path", () => {
      const nodeA = createTestNode();
      const nodeB = createTestNode();
      const nodeC = createTestNode();
      createNode(db, nodeA, options);
      createNode(db, nodeB, options);
      createNode(db, nodeC, options);

      // A -> B -> C
      createEdge(db, nodeA.id, nodeB.id, "continuation");
      createEdge(db, nodeB.id, nodeC.id, "continuation");

      const result = findPath(db, nodeA.id, nodeC.id);

      expect(result).not.toBeNull();
      expect(result?.nodeIds).toStrictEqual([nodeA.id, nodeB.id, nodeC.id]);
      expect(result?.edges).toHaveLength(2);
    });

    it("should find path when same node is from and to", () => {
      const nodeA = createTestNode();
      createNode(db, nodeA, options);

      const result = findPath(db, nodeA.id, nodeA.id);

      expect(result).not.toBeNull();
      expect(result?.nodeIds).toStrictEqual([nodeA.id]);
      expect(result?.edges).toHaveLength(0);
    });

    it("should respect maxDepth limit", () => {
      // Create chain: 0 -> 1 -> 2 -> 3 -> 4
      const nodes: Node[] = [];
      for (let i = 0; i < 5; i++) {
        const node = createTestNode();
        createNode(db, node, options);
        nodes.push(node);
      }
      for (let i = 0; i < 4; i++) {
        createEdge(db, nodes[i].id, nodes[i + 1].id, "continuation");
      }

      // Path exists at depth 4, but limit to 2
      const result = findPath(db, nodes[0].id, nodes[4].id, { maxDepth: 2 });

      expect(result).toBeNull();
    });
  });

  describe("getAncestors", () => {
    it("should find nodes leading to a node", () => {
      const nodeA = createTestNode();
      const nodeB = createTestNode();
      const nodeC = createTestNode();
      createNode(db, nodeA, options);
      createNode(db, nodeB, options);
      createNode(db, nodeC, options);

      // A -> B -> C
      createEdge(db, nodeA.id, nodeB.id, "continuation");
      createEdge(db, nodeB.id, nodeC.id, "continuation");

      const result = getAncestors(db, nodeC.id, { maxDepth: 2 });

      expect(result.nodes).toHaveLength(2);
      const nodeIds = result.nodes.map((n) => n.id);
      expect(nodeIds).toContain(nodeA.id);
      expect(nodeIds).toContain(nodeB.id);
    });

    it("should filter by edge types", () => {
      const nodeA = createTestNode();
      const nodeB = createTestNode();
      const nodeC = createTestNode();
      createNode(db, nodeA, options);
      createNode(db, nodeB, options);
      createNode(db, nodeC, options);

      // A -fork-> C, B -semantic-> C
      createEdge(db, nodeA.id, nodeC.id, "fork");
      createEdge(db, nodeB.id, nodeC.id, "semantic");

      const result = getAncestors(db, nodeC.id, { edgeTypes: ["fork"] });

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].id).toBe(nodeA.id);
    });
  });

  describe("getDescendants", () => {
    it("should find nodes a node leads to", () => {
      const nodeA = createTestNode();
      const nodeB = createTestNode();
      const nodeC = createTestNode();
      createNode(db, nodeA, options);
      createNode(db, nodeB, options);
      createNode(db, nodeC, options);

      // A -> B -> C
      createEdge(db, nodeA.id, nodeB.id, "continuation");
      createEdge(db, nodeB.id, nodeC.id, "continuation");

      const result = getDescendants(db, nodeA.id, { maxDepth: 2 });

      expect(result.nodes).toHaveLength(2);
      const nodeIds = result.nodes.map((n) => n.id);
      expect(nodeIds).toContain(nodeB.id);
      expect(nodeIds).toContain(nodeC.id);
    });

    it("should filter by edge types", () => {
      const nodeA = createTestNode();
      const nodeB = createTestNode();
      const nodeC = createTestNode();
      createNode(db, nodeA, options);
      createNode(db, nodeB, options);
      createNode(db, nodeC, options);

      // A -fork-> B, A -semantic-> C
      createEdge(db, nodeA.id, nodeB.id, "fork");
      createEdge(db, nodeA.id, nodeC.id, "semantic");

      const result = getDescendants(db, nodeA.id, { edgeTypes: ["fork"] });

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].id).toBe(nodeB.id);
    });
  });

  // ===========================================================================
  // Lesson Aggregation Tests
  // ===========================================================================

  describe("lesson aggregation", () => {
    it("should list lessons with filters and pagination", () => {
      const node1 = createTestNode({
        classification: {
          ...createTestNode().classification,
          project: "/home/test/project1",
        },
        lessons: {
          ...emptyLessons(),
          project: [
            {
              level: "project",
              summary: "Lesson 1",
              details: "D1",
              confidence: "high",
              tags: ["tag1"],
            },
          ],
        },
      });
      const node2 = createTestNode({
        classification: {
          ...createTestNode().classification,
          project: "/home/test/project2",
        },
        lessons: {
          ...emptyLessons(),
          model: [
            {
              level: "model",
              summary: "Lesson 2",
              details: "D2",
              confidence: "medium",
              tags: ["tag1", "tag2"],
            },
          ],
        },
      });

      createNode(db, node1, options);
      createNode(db, node2, options);

      // Filter by level
      const modelLessons = listLessons(db, { level: "model" });
      expect(modelLessons.lessons).toHaveLength(1);
      expect(modelLessons.lessons[0].summary).toBe("Lesson 2");

      // Filter by project
      const project1Lessons = listLessons(db, { project: "project1" });
      expect(project1Lessons.lessons).toHaveLength(1);
      expect(project1Lessons.lessons[0].summary).toBe("Lesson 1");

      // Filter by tags (AND logic)
      const tag1Lessons = listLessons(db, { tags: ["tag1"] });
      expect(tag1Lessons.lessons).toHaveLength(2);

      const tag2Lessons = listLessons(db, { tags: ["tag1", "tag2"] });
      expect(tag2Lessons.lessons).toHaveLength(1);
      expect(tag2Lessons.lessons[0].summary).toBe("Lesson 2");

      // Pagination
      const paginated = listLessons(db, {}, { limit: 1 });
      expect(paginated.lessons).toHaveLength(1);
      expect(paginated.total).toBe(2);
    });

    it("should get lessons by level statistics", () => {
      const node = createTestNode({
        lessons: {
          ...emptyLessons(),
          project: [
            {
              level: "project",
              summary: "P1",
              details: "D1",
              confidence: "high",
              tags: [],
            },
            {
              level: "project",
              summary: "P2",
              details: "D2",
              confidence: "high",
              tags: [],
            },
          ],
          model: [
            {
              level: "model",
              summary: "M1",
              details: "D3",
              confidence: "medium",
              tags: [],
            },
          ],
        },
      });
      createNode(db, node, options);

      const stats = getLessonsByLevel(db);

      expect(stats.project.count).toBe(2);
      expect(stats.project.recent).toHaveLength(2);
      const summaries = stats.project.recent.map((r) => r.summary);
      expect(summaries).toContain("P1");
      expect(summaries).toContain("P2");

      expect(stats.model.count).toBe(1);
      expect(stats.model.recent).toHaveLength(1);
      expect(stats.model.recent[0].summary).toBe("M1");

      expect(stats.user.count).toBe(0);
      expect(stats.user.recent).toHaveLength(0);
    });

    it("should count lessons matching filters", () => {
      const node = createTestNode({
        lessons: {
          ...emptyLessons(),
          project: [
            {
              level: "project",
              summary: "P1",
              details: "D1",
              confidence: "high",
              tags: [],
            },
          ],
          model: [
            {
              level: "model",
              summary: "M1",
              details: "D3",
              confidence: "medium",
              tags: [],
            },
          ],
        },
      });
      createNode(db, node, options);

      expect(countLessons(db, { level: "project" })).toBe(1);
      expect(countLessons(db, { level: "model" })).toBe(1);
      expect(countLessons(db, { level: "user" })).toBe(0);
    });
  });

  describe("model quirk aggregation", () => {
    it("should return empty results when no quirks exist", () => {
      const result = listQuirks(db);
      expect(result.quirks).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it("should list quirks with filters", () => {
      // Create node with quirks
      const node1 = createTestNode({
        classification: {
          ...createTestNode().classification,
          project: "/home/will/projects/project1",
        },
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
            {
              model: "anthropic/claude-3",
              observation: "Uses sed instead of read",
              frequency: "sometimes",
              workaround: "Remind to use read tool",
              severity: "medium",
            },
          ],
        },
      });
      createNode(db, node1, options);

      const node2 = createTestNode({
        classification: {
          ...createTestNode().classification,
          project: "/home/will/projects/project2",
        },
        observations: {
          ...emptyObservations(),
          modelQuirks: [
            {
              model: "zai/glm-4.7",
              observation: "Forgets context easily",
              frequency: "once",
              workaround: undefined,
              severity: "high",
            },
          ],
        },
      });
      createNode(db, node2, options);

      // All quirks
      const all = listQuirks(db);
      expect(all.quirks).toHaveLength(3);
      expect(all.total).toBe(3);

      // Filter by model
      const glmQuirks = listQuirks(db, { model: "zai/glm-4.7" });
      expect(glmQuirks.quirks).toHaveLength(2);
      expect(glmQuirks.total).toBe(2);

      const claudeQuirks = listQuirks(db, { model: "anthropic/claude-3" });
      expect(claudeQuirks.quirks).toHaveLength(1);
      expect(claudeQuirks.total).toBe(1);
      expect(claudeQuirks.quirks[0].observation).toBe(
        "Uses sed instead of read"
      );

      // Filter by project
      const project1Quirks = listQuirks(db, { project: "project1" });
      expect(project1Quirks.quirks).toHaveLength(2);

      // Filter by frequency (minimum)
      const sometimesOrMore = listQuirks(db, { frequency: "sometimes" });
      expect(sometimesOrMore.quirks).toHaveLength(2); // sometimes + often

      const oftenOrMore = listQuirks(db, { frequency: "often" });
      expect(oftenOrMore.quirks).toHaveLength(1);
      expect(oftenOrMore.quirks[0].observation).toBe("Tends to be verbose");
    });

    it("should paginate quirk results", () => {
      // Create multiple quirks
      const node = createTestNode({
        observations: {
          ...emptyObservations(),
          modelQuirks: [
            {
              model: "model-a",
              observation: "Quirk 1",
              frequency: "once",
              workaround: undefined,
              severity: "low",
            },
            {
              model: "model-b",
              observation: "Quirk 2",
              frequency: "sometimes",
              workaround: undefined,
              severity: "low",
            },
            {
              model: "model-c",
              observation: "Quirk 3",
              frequency: "often",
              workaround: undefined,
              severity: "low",
            },
          ],
        },
      });
      createNode(db, node, options);

      const page1 = listQuirks(db, {}, { limit: 2, offset: 0 });
      expect(page1.quirks).toHaveLength(2);
      expect(page1.total).toBe(3);
      expect(page1.limit).toBe(2);
      expect(page1.offset).toBe(0);

      const page2 = listQuirks(db, {}, { limit: 2, offset: 2 });
      expect(page2.quirks).toHaveLength(1);
      expect(page2.total).toBe(3);
    });

    it("should get quirks aggregated by model", () => {
      const node1 = createTestNode({
        observations: {
          ...emptyObservations(),
          modelQuirks: [
            {
              model: "zai/glm-4.7",
              observation: "Quirk A",
              frequency: "often",
              workaround: undefined,
              severity: "low",
            },
            {
              model: "anthropic/claude-3",
              observation: "Quirk B",
              frequency: "sometimes",
              workaround: undefined,
              severity: "low",
            },
          ],
        },
      });
      createNode(db, node1, options);

      const node2 = createTestNode({
        observations: {
          ...emptyObservations(),
          modelQuirks: [
            {
              model: "zai/glm-4.7",
              observation: "Quirk C",
              frequency: "once",
              workaround: "Fix it",
              severity: "low",
            },
          ],
        },
      });
      createNode(db, node2, options);

      const stats = getQuirksByModel(db);

      expect(stats["zai/glm-4.7"]).toBeDefined();
      expect(stats["zai/glm-4.7"].count).toBe(2);
      expect(stats["zai/glm-4.7"].recent).toHaveLength(2);

      expect(stats["anthropic/claude-3"]).toBeDefined();
      expect(stats["anthropic/claude-3"].count).toBe(1);
      expect(stats["anthropic/claude-3"].recent).toHaveLength(1);
      expect(stats["anthropic/claude-3"].recent[0].observation).toBe("Quirk B");
    });

    it("should count quirks matching filters", () => {
      const node = createTestNode({
        observations: {
          ...emptyObservations(),
          modelQuirks: [
            {
              model: "model-a",
              observation: "Q1",
              frequency: "often",
              workaround: undefined,
              severity: "low",
            },
            {
              model: "model-b",
              observation: "Q2",
              frequency: "sometimes",
              workaround: undefined,
              severity: "low",
            },
          ],
        },
      });
      createNode(db, node, options);

      expect(countQuirks(db)).toBe(2);
      expect(countQuirks(db, { model: "model-a" })).toBe(1);
      expect(countQuirks(db, { model: "model-c" })).toBe(0);
    });

    it("should get all unique quirk models", () => {
      const node = createTestNode({
        observations: {
          ...emptyObservations(),
          modelQuirks: [
            {
              model: "zai/glm-4.7",
              observation: "Q1",
              frequency: "once",
              workaround: undefined,
              severity: "low",
            },
            {
              model: "anthropic/claude-3",
              observation: "Q2",
              frequency: "once",
              workaround: undefined,
              severity: "low",
            },
            {
              model: "zai/glm-4.7",
              observation: "Q3",
              frequency: "once",
              workaround: undefined,
              severity: "low",
            },
          ],
        },
      });
      createNode(db, node, options);

      const models = getAllQuirkModels(db);
      expect(models).toHaveLength(2);
      expect(models).toContain("zai/glm-4.7");
      expect(models).toContain("anthropic/claude-3");
    });

    it("should aggregate quirks by observation", () => {
      // Create the same observation from multiple nodes
      const node1 = createTestNode({
        observations: {
          ...emptyObservations(),
          modelQuirks: [
            {
              model: "zai/glm-4.7",
              observation: "Uses sed instead of read",
              frequency: "often",
              workaround: undefined,
              severity: "low",
            },
          ],
        },
      });
      createNode(db, node1, options);

      const node2 = createTestNode({
        observations: {
          ...emptyObservations(),
          modelQuirks: [
            {
              model: "zai/glm-4.7",
              observation: "Uses sed instead of read",
              frequency: "sometimes",
              workaround: undefined,
              severity: "low",
            },
            {
              model: "zai/glm-4.7",
              observation: "Unique quirk",
              frequency: "once",
              workaround: undefined,
              severity: "low",
            },
          ],
        },
      });
      createNode(db, node2, options);

      // Get aggregated quirks with minOccurrences = 2
      const aggregated = getAggregatedQuirks(db, { minOccurrences: 2 });
      expect(aggregated).toHaveLength(1);
      expect(aggregated[0].model).toBe("zai/glm-4.7");
      expect(aggregated[0].observation).toBe("Uses sed instead of read");
      expect(aggregated[0].occurrences).toBe(2);
      expect(aggregated[0].nodeIds).toHaveLength(2);
      expect(aggregated[0].nodeIds).toContain(node1.id);
      expect(aggregated[0].nodeIds).toContain(node2.id);

      // Get all aggregated quirks (minOccurrences = 1)
      const all = getAggregatedQuirks(db);
      expect(all).toHaveLength(2);
    });

    it("should include sourceProject in quirk results", () => {
      const node = createTestNode({
        classification: {
          ...createTestNode().classification,
          project: "/home/will/special-project",
        },
        observations: {
          ...emptyObservations(),
          modelQuirks: [
            {
              model: "test-model",
              observation: "Test observation",
              frequency: "once",
              workaround: undefined,
              severity: "low",
            },
          ],
        },
      });
      createNode(db, node, options);

      const result = listQuirks(db);
      expect(result.quirks[0].sourceProject).toBe("/home/will/special-project");
    });
  });
});
