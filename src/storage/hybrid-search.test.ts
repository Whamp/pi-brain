/**
 * Tests for Hybrid Search Implementation
 */

import type Database from "better-sqlite3";

import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as DatabaseModule from "./database.js";
import type * as SemanticSearchModule from "./semantic-search.js";

import {
  calculateNodeHybridScore,
  hybridSearch,
  HYBRID_WEIGHTS,
} from "./hybrid-search.js";

// Mock dependencies
vi.mock<typeof DatabaseModule>("./database.js", () => ({
  isVecLoaded: vi.fn(() => false),
}));

vi.mock<typeof SemanticSearchModule>("./semantic-search.js", () => ({
  semanticSearch: vi.fn(() => []),
}));

// Create a mock database with comprehensive query handling
function createMockDb(): Database.Database {
  const nodeData = new Map<string, Record<string, unknown>>();
  const ftsData = new Map<string, Record<string, unknown>>();
  const edgeData: { source_node_id: string; target_node_id: string }[] = [];
  const tagData: { node_id: string; tag: string }[] = [];

  // Seed some test data
  nodeData.set("node-1", {
    id: "node-1",
    version: 1,
    session_file: "/test/session.jsonl",
    segment_start: null,
    segment_end: null,
    computer: "test",
    type: "coding",
    project: "/projects/test-auth",
    is_new_project: 0,
    had_clear_goal: 1,
    outcome: "success",
    tokens_used: 1000,
    cost: 0.01,
    duration_minutes: 30,
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    analyzed_at: new Date().toISOString(),
    analyzer_version: "1.0",
    data_file: "/data/node-1.json",
    signals: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    relevance_score: 0.8,
    last_accessed: null,
    archived: 0,
    importance: 0.7,
  });

  nodeData.set("node-2", {
    id: "node-2",
    version: 1,
    session_file: "/test/session2.jsonl",
    segment_start: null,
    segment_end: null,
    computer: "test",
    type: "debugging",
    project: "/projects/test-database",
    is_new_project: 0,
    had_clear_goal: 1,
    outcome: "success",
    tokens_used: 500,
    cost: 0.005,
    duration_minutes: 15,
    timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
    analyzed_at: new Date().toISOString(),
    analyzer_version: "1.0",
    data_file: "/data/node-2.json",
    signals: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    relevance_score: 0.5,
    last_accessed: null,
    archived: 0,
    importance: 0.5,
  });

  ftsData.set("node-1", {
    node_id: "node-1",
    summary: "Implemented test authentication with JWT tokens",
    decisions: "Use JWT for stateless auth",
    lessons: "Always validate token expiry",
    tags: "auth jwt security test",
    topics: "authentication web-development",
  });

  ftsData.set("node-2", {
    node_id: "node-2",
    summary: "Fixed test database connection pooling issues",
    decisions: "Increase pool size",
    lessons: "Monitor connection counts",
    tags: "database postgresql performance test",
    topics: "database optimization",
  });

  edgeData.push({ source_node_id: "node-1", target_node_id: "node-2" });
  edgeData.push({ source_node_id: "node-1", target_node_id: "node-3" });
  edgeData.push({ source_node_id: "node-3", target_node_id: "node-1" });

  tagData.push({ node_id: "node-1", tag: "auth" });
  tagData.push({ node_id: "node-1", tag: "jwt" });
  tagData.push({ node_id: "node-2", tag: "database" });

  return {
    prepare: vi.fn((sql: string) => ({
      get: vi.fn((...params: unknown[]) => {
        // Node lookup
        if (sql.includes("SELECT * FROM nodes WHERE id")) {
          const nodeId = params[0] as string;
          return nodeData.get(nodeId);
        }

        // Edge count for single node
        if (sql.includes("COUNT(*)") && sql.includes("edges")) {
          const nodeId = params[0] as string;
          const count = edgeData.filter(
            (e) => e.source_node_id === nodeId || e.target_node_id === nodeId
          ).length;
          return { count };
        }

        // Tag count - both `calculateNodeHybridScore` and batch queries
        if (
          sql.includes("COUNT(*)") &&
          sql.includes("tags") &&
          sql.includes("node_id")
        ) {
          const nodeId = params[0] as string;
          const requestedTags = params.slice(1) as string[];
          const count = tagData.filter(
            (t) => t.node_id === nodeId && requestedTags.includes(t.tag)
          ).length;
          return { count };
        }

        return null;
      }),
      all: vi.fn((...params: unknown[]) => {
        // FTS search
        if (sql.includes("nodes_fts")) {
          const query = (params[0] as string).toLowerCase();
          const results: Record<string, unknown>[] = [];

          for (const [nodeId, fts] of ftsData.entries()) {
            const fullText = Object.values(fts).join(" ").toLowerCase();
            // Simple substring match for testing
            if (fullText.includes(query.replaceAll('"', ""))) {
              const node = nodeData.get(nodeId);
              if (node) {
                results.push({ ...node, fts_rank: -5 });
              }
            }
          }
          return results;
        }

        // Edge count batch
        if (sql.includes("UNION ALL") && sql.includes("edges")) {
          const nodeIds = new Set(params as string[]);
          const counts = new Map<string, number>();

          for (const edge of edgeData) {
            if (nodeIds.has(edge.source_node_id)) {
              counts.set(
                edge.source_node_id,
                (counts.get(edge.source_node_id) ?? 0) + 1
              );
            }
            if (nodeIds.has(edge.target_node_id)) {
              counts.set(
                edge.target_node_id,
                (counts.get(edge.target_node_id) ?? 0) + 1
              );
            }
          }

          return [...counts.entries()].map(([node_id, edge_count]) => ({
            node_id,
            edge_count,
          }));
        }

        // Tag count batch
        if (sql.includes("tags") && sql.includes("GROUP BY node_id")) {
          const [nodeIds, boostTags] = [
            params.slice(0, params.length / 2),
            params.slice(params.length / 2),
          ] as [string[], string[]];

          const counts = new Map<string, number>();
          for (const tag of tagData) {
            if (nodeIds.includes(tag.node_id) && boostTags.includes(tag.tag)) {
              counts.set(tag.node_id, (counts.get(tag.node_id) ?? 0) + 1);
            }
          }

          return [...counts.entries()].map(([node_id, tag_count]) => ({
            node_id,
            tag_count,
          }));
        }

        return [];
      }),
      run: vi.fn(),
    })),
  } as unknown as Database.Database;
}

describe("hybrid-search", () => {
  describe("hYBRID_WEIGHTS", () => {
    it("should have all required weight components", () => {
      expect(HYBRID_WEIGHTS).toHaveProperty("vector");
      expect(HYBRID_WEIGHTS).toHaveProperty("keyword");
      expect(HYBRID_WEIGHTS).toHaveProperty("relation");
      expect(HYBRID_WEIGHTS).toHaveProperty("content");
      expect(HYBRID_WEIGHTS).toHaveProperty("temporal");
      expect(HYBRID_WEIGHTS).toHaveProperty("tag");
      expect(HYBRID_WEIGHTS).toHaveProperty("importance");
      expect(HYBRID_WEIGHTS).toHaveProperty("recency");
    });

    it("weights should sum to approximately 1.3", () => {
      const sum = Object.values(HYBRID_WEIGHTS).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.3, 1);
    });
  });

  describe("hybridSearch", () => {
    let db: Database.Database;

    beforeEach(() => {
      vi.clearAllMocks();
      db = createMockDb();
    });

    it("should return empty results for empty query", () => {
      const result = hybridSearch(db, "");
      expect(result.results).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.usedVectorSearch).toBeFalsy();
    });

    it("should find results via FTS search", () => {
      const result = hybridSearch(db, "authentication");
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.results[0].node.id).toBe("node-1");
      expect(result.usedVectorSearch).toBeFalsy();
    });

    it("should include score breakdown in results", () => {
      const result = hybridSearch(db, "authentication");
      expect(result.results[0].breakdown).toBeDefined();
      expect(result.results[0].breakdown.keyword).toBeGreaterThan(0);
      expect(result.results[0].breakdown.final).toBeGreaterThan(0);
    });

    it("should respect limit option", () => {
      const result = hybridSearch(db, "test", { limit: 1 });
      expect(result.limit).toBe(1);
      expect(result.results.length).toBeLessThanOrEqual(1);
    });

    it("should respect offset option", () => {
      const result = hybridSearch(db, "test", { offset: 100 });
      expect(result.offset).toBe(100);
    });

    it("should boost nodes with matching boost tags", () => {
      const resultWithoutBoost = hybridSearch(db, "test");
      const resultWithBoost = hybridSearch(db, "test", {
        boostTags: ["auth", "jwt"],
      });

      // Find node-1 in both results and compare tag scores
      const node1WithoutBoost = resultWithoutBoost.results.find(
        (r) => r.node.id === "node-1"
      );
      const node1WithBoost = resultWithBoost.results.find(
        (r) => r.node.id === "node-1"
      );

      // Both should exist in test data
      if (!node1WithoutBoost || !node1WithBoost) {
        throw new Error("Expected node-1 in both result sets");
      }

      expect(node1WithBoost.breakdown.tag).toBeGreaterThan(
        node1WithoutBoost.breakdown.tag
      );
    });

    it("should sort results by final score descending", () => {
      const result = hybridSearch(db, "test");
      for (let i = 1; i < result.results.length; i++) {
        expect(result.results[i - 1].score).toBeGreaterThanOrEqual(
          result.results[i].score
        );
      }
    });

    it("should allow custom weights", () => {
      const result = hybridSearch(db, "authentication", {
        weights: { keyword: 1, vector: 0, relation: 0 },
      });
      expect(result.results.length).toBeGreaterThan(0);
      // With heavy keyword weight, FTS match should dominate
      expect(result.results[0].breakdown.keyword).toBeGreaterThan(0);
    });
  });

  describe("calculateNodeHybridScore", () => {
    let db: Database.Database;

    beforeEach(() => {
      vi.clearAllMocks();
      db = createMockDb();
    });

    it("should return null for non-existent node", () => {
      const result = calculateNodeHybridScore(db, "non-existent", "test");
      expect(result).toBeNull();
    });

    it("should return score breakdown for existing node", () => {
      const result = calculateNodeHybridScore(db, "node-1", "test");
      expect(result).not.toBeNull();
      expect(result?.final).toBeGreaterThan(0);
      expect(result?.importance).toBe(0.7); // node-1 has importance 0.7
    });

    it("should include relation score based on edge count", () => {
      const result = calculateNodeHybridScore(db, "node-1", "test");
      expect(result?.relation).toBeGreaterThan(0);
    });

    it("should include tag score when boost tags provided", () => {
      const resultWithBoost = calculateNodeHybridScore(db, "node-1", "test", {
        boostTags: ["auth", "jwt"],
      });
      expect(resultWithBoost?.tag).toBeGreaterThan(0);
    });

    it("should have zero tag score when no boost tags match", () => {
      const result = calculateNodeHybridScore(db, "node-1", "test", {
        boostTags: ["nonexistent-tag"],
      });
      expect(result?.tag).toBe(0);
    });
  });

  describe("score calculations", () => {
    let db: Database.Database;

    beforeEach(() => {
      vi.clearAllMocks();
      db = createMockDb();
    });

    // Helper to find a node by ID and throw if not found
    function findNode(
      results: { node: { id: string }; breakdown: Record<string, number> }[],
      nodeId: string
    ) {
      const result = results.find((r) => r.node.id === nodeId);
      if (!result) {
        throw new Error(`Node ${nodeId} not found in results`);
      }
      return result;
    }

    it("should give higher recency score to newer nodes", () => {
      // node-1 is 2 days old, node-2 is 30 days old
      const result = hybridSearch(db, "test");

      const node1 = findNode(result.results, "node-1");
      const node2 = findNode(result.results, "node-2");

      expect(node1.breakdown.recency).toBeGreaterThan(node2.breakdown.recency);
    });

    it("should give higher importance score to high-importance nodes", () => {
      // node-1 has importance 0.7, node-2 has importance 0.5
      const result = hybridSearch(db, "test");

      const node1 = findNode(result.results, "node-1");
      const node2 = findNode(result.results, "node-2");

      expect(node1.breakdown.importance).toBeGreaterThan(
        node2.breakdown.importance
      );
    });

    it("should give higher relation score to well-connected nodes", () => {
      // node-1 has 3 edges, node-2 has 1 edge
      const result = hybridSearch(db, "test");

      const node1 = findNode(result.results, "node-1");
      const node2 = findNode(result.results, "node-2");

      expect(node1.breakdown.relation).toBeGreaterThan(
        node2.breakdown.relation
      );
    });
  });
});
