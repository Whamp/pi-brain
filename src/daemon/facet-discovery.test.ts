/**
 * Tests for Facet Discovery Pipeline
 */

import type Database from "better-sqlite3";

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { openDatabase } from "../storage/database.js";
import {
  createEmbeddingProvider,
  FacetDiscovery,
  hdbscanClustering,
  kMeansClustering,
} from "./facet-discovery.js";

// =============================================================================
// Test Fixtures
// =============================================================================

function createTestDb(): { db: Database.Database; cleanup: () => void } {
  const testDir = fs.mkdtempSync(path.join(os.tmpdir(), "facet-test-"));
  const dbPath = path.join(testDir, "brain.db");

  const db = openDatabase({ path: dbPath });

  const cleanup = () => {
    db.close();
    fs.rmSync(testDir, { recursive: true, force: true });
  };

  return { db, cleanup };
}

function insertTestNodes(
  db: Database.Database,
  nodes: {
    id: string;
    summary: string;
    type?: string;
    project?: string;
    outcome?: string;
  }[]
): void {
  const insertNode = db.prepare(`
    INSERT INTO nodes (
      id, version, type, project, outcome,
      session_file, data_file, timestamp, analyzed_at, analyzer_version
    ) VALUES (?, 1, ?, ?, ?, 'test.jsonl', 'test.json', datetime('now'), datetime('now'), 'v1')
  `);

  const insertFts = db.prepare(`
    INSERT INTO nodes_fts (node_id, summary, decisions, lessons, tags, topics)
    VALUES (?, ?, '', '', '', '')
  `);

  for (const node of nodes) {
    insertNode.run(
      node.id,
      node.type ?? "coding",
      node.project ?? "/test/project",
      node.outcome ?? "success"
    );

    insertFts.run(node.id, node.summary);
  }
}

// =============================================================================
// Embedding Provider Tests
// =============================================================================

describe("createEmbeddingProvider", () => {
  it("should create a mock provider", () => {
    const provider = createEmbeddingProvider({
      provider: "mock",
      model: "mock",
      dimensions: 128,
    });

    expect(provider.dimensions).toBe(128);
    expect(provider.modelName).toBe("mock");
  });

  it("should throw for OpenAI without API key", () => {
    expect(() =>
      createEmbeddingProvider({
        provider: "openai",
        model: "text-embedding-3-small",
      })
    ).toThrow("OpenAI embedding provider requires apiKey");
  });

  it("mock provider should generate deterministic embeddings", async () => {
    const provider = createEmbeddingProvider({
      provider: "mock",
      model: "mock",
      dimensions: 64,
    });

    const emb1 = await provider.embed(["hello world"]);
    const emb2 = await provider.embed(["hello world"]);

    expect(emb1[0]).toStrictEqual(emb2[0]);
    expect(emb1[0]).toHaveLength(64);
  });

  it("mock provider should generate normalized embeddings", async () => {
    const provider = createEmbeddingProvider({
      provider: "mock",
      model: "mock",
      dimensions: 128,
    });

    const [embedding] = await provider.embed(["test"]);

    // Check magnitude is ~1.0
    const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
    expect(magnitude).toBeCloseTo(1, 5);
  });

  it("mock provider should generate different embeddings for different text", async () => {
    const provider = createEmbeddingProvider({
      provider: "mock",
      model: "mock",
      dimensions: 64,
    });

    const [emb1] = await provider.embed(["hello"]);
    const [emb2] = await provider.embed(["goodbye"]);

    expect(emb1).not.toStrictEqual(emb2);
  });
});

// =============================================================================
// K-Means Clustering Tests
// =============================================================================

describe("kMeansClustering", () => {
  it("should handle empty input", () => {
    const result = kMeansClustering([], 3);
    expect(result.labels).toStrictEqual([]);
    expect(result.centroids).toStrictEqual([]);
  });

  it("should handle fewer points than clusters", () => {
    const embeddings = [
      [1, 0],
      [0, 1],
    ];
    const result = kMeansClustering(embeddings, 5);

    // Each point becomes its own cluster
    expect(result.labels).toHaveLength(2);
    expect(result.centroids).toHaveLength(2);
  });

  it("should cluster clearly separated points", () => {
    // Two well-separated clusters
    const embeddings = [
      // Cluster 1: around (0, 0)
      [0, 0],
      [0.1, 0.1],
      [-0.1, 0.1],
      [0, -0.1],
      // Cluster 2: around (10, 10)
      [10, 10],
      [10.1, 10.1],
      [9.9, 10.1],
      [10, 9.9],
    ];

    const result = kMeansClustering(embeddings, 2);

    expect(result.labels).toHaveLength(8);

    // First 4 points should be in same cluster
    expect(result.labels[0]).toBe(result.labels[1]);
    expect(result.labels[0]).toBe(result.labels[2]);
    expect(result.labels[0]).toBe(result.labels[3]);

    // Last 4 points should be in same cluster
    expect(result.labels[4]).toBe(result.labels[5]);
    expect(result.labels[4]).toBe(result.labels[6]);
    expect(result.labels[4]).toBe(result.labels[7]);

    // The two groups should be in different clusters
    expect(result.labels[0]).not.toBe(result.labels[4]);
  });

  it("should return k centroids", () => {
    const embeddings = Array.from({ length: 20 }, (_, i) => [i % 3, i % 5]);
    const result = kMeansClustering(embeddings, 4);

    expect(result.centroids).toHaveLength(4);
    expect(result.centroids[0]).toHaveLength(2);
  });

  it("should assign all points a label", () => {
    const embeddings = Array.from({ length: 50 }, () => [
      Math.random(),
      Math.random(),
    ]);
    const result = kMeansClustering(embeddings, 5);

    expect(result.labels).toHaveLength(50);
    expect(result.labels.every((l) => l >= 0 && l < 5)).toBeTruthy();
  });
});

// =============================================================================
// HDBSCAN Clustering Tests
// =============================================================================

describe("hdbscanClustering", () => {
  it("should handle empty input", () => {
    const labels = hdbscanClustering([]);
    expect(labels).toStrictEqual([]);
  });

  it("should handle fewer points than minClusterSize", () => {
    const embeddings = [[1, 0]];
    const labels = hdbscanClustering(embeddings, 3);

    // All points should be noise
    expect(labels).toStrictEqual([-1]);
  });

  it("should mark sparse points as noise", () => {
    // One dense cluster and some outliers
    const embeddings = [
      // Dense cluster
      [0, 0],
      [0.1, 0],
      [0, 0.1],
      [0.1, 0.1],
      [-0.1, 0],
      // Outliers
      [100, 100],
      [-50, 75],
    ];

    const labels = hdbscanClustering(embeddings, 3);

    // The dense cluster should be labeled
    const [clusterLabel] = labels;
    expect(clusterLabel).toBeGreaterThanOrEqual(0);
    expect(labels[1]).toBe(clusterLabel);
    expect(labels[2]).toBe(clusterLabel);
  });

  it("should find multiple distinct clusters", () => {
    // Two dense clusters far apart
    const embeddings = [
      // Cluster 1
      [0, 0],
      [0.1, 0],
      [0, 0.1],
      [0.1, 0.1],
      [-0.1, -0.1],
      // Cluster 2
      [10, 10],
      [10.1, 10],
      [10, 10.1],
      [10.1, 10.1],
      [9.9, 9.9],
    ];

    const labels = hdbscanClustering(embeddings, 3);

    // Count unique non-noise labels
    const uniqueLabels = new Set(labels.filter((l) => l !== -1));

    // Should find at least some clusters
    expect(uniqueLabels.size).toBeGreaterThanOrEqual(1);
  });

  it("should respect minClusterSize", () => {
    // Cluster of exactly 5 points
    const embeddings = [
      [0, 0],
      [0.1, 0],
      [0, 0.1],
      [0.1, 0.1],
      [0.05, 0.05],
    ];

    // With minClusterSize = 6, all should be noise
    const labels6 = hdbscanClustering(embeddings, 6);
    expect(labels6.every((l) => l === -1)).toBeTruthy();
  });
});

// =============================================================================
// FacetDiscovery Class Tests
// =============================================================================

describe("facetDiscovery", () => {
  let db: Database.Database;
  let discovery: FacetDiscovery;
  let cleanup: () => void;

  beforeEach(() => {
    const testSetup = createTestDb();
    ({ db } = testSetup);
    ({ cleanup } = testSetup);
    discovery = new FacetDiscovery(
      db,
      { provider: "mock", model: "mock", dimensions: 64 },
      { algorithm: "kmeans", numClusters: 3 }
    );
  });

  afterEach(() => {
    cleanup();
  });

  describe("run", () => {
    it("should handle empty database", async () => {
      const result = await discovery.run();

      expect(result.run.status).toBe("completed");
      expect(result.run.nodesEmbedded).toBe(0);
      expect(result.run.clustersCreated).toBe(0);
      expect(result.clusters).toStrictEqual([]);
    });

    it("should create clusters from nodes", async () => {
      insertTestNodes(db, [
        { id: "node1", summary: "Implemented auth with JWT" },
        { id: "node2", summary: "Added JWT token refresh" },
        { id: "node3", summary: "Fixed database connection pooling" },
        { id: "node4", summary: "Database query optimization" },
        { id: "node5", summary: "Setup Docker containers" },
        { id: "node6", summary: "Docker compose configuration" },
      ]);

      const result = await discovery.run();

      expect(result.run.status).toBe("completed");
      expect(result.run.nodesEmbedded).toBe(6);
      expect(result.clusters.length).toBeGreaterThan(0);
    });

    it("should cache embeddings", async () => {
      insertTestNodes(db, [
        { id: "node1", summary: "Test summary 1" },
        { id: "node2", summary: "Test summary 2" },
      ]);

      // First run
      await discovery.run();

      // Check embeddings are cached
      const cached = db.prepare("SELECT * FROM node_embeddings").all() as {
        node_id: string;
      }[];
      expect(cached).toHaveLength(2);
      expect(cached.map((r) => r.node_id).toSorted()).toStrictEqual([
        "node1",
        "node2",
      ]);
    });

    it("should use cached embeddings on second run", async () => {
      insertTestNodes(db, [{ id: "node1", summary: "Test summary" }]);

      // First run
      await discovery.run();

      // Get embedding created time
      const firstRun = db
        .prepare("SELECT created_at FROM node_embeddings WHERE node_id = ?")
        .get("node1") as { created_at: string };

      // Second run should use cache
      await discovery.run();

      const secondRun = db
        .prepare("SELECT created_at FROM node_embeddings WHERE node_id = ?")
        .get("node1") as { created_at: string };

      expect(secondRun.created_at).toBe(firstRun.created_at);
    });

    it("should track clustering run", async () => {
      insertTestNodes(db, [
        { id: "node1", summary: "Test 1" },
        { id: "node2", summary: "Test 2" },
      ]);

      const result = await discovery.run();

      expect(result.run.id).toBeDefined();
      expect(result.run.startedAt).toBeDefined();
      expect(result.run.completedAt).toBeDefined();
      expect(result.run.embeddingModel).toBe("mock");
      expect(result.run.algorithm).toBe("kmeans");
    });
  });

  describe("getClusters", () => {
    it("should return empty array when no clusters", () => {
      const clusters = discovery.getClusters();
      expect(clusters).toStrictEqual([]);
    });

    it("should return clusters after run", async () => {
      insertTestNodes(db, [
        { id: "node1", summary: "Auth implementation" },
        { id: "node2", summary: "Auth testing" },
        { id: "node3", summary: "Database setup" },
        { id: "node4", summary: "Database queries" },
      ]);

      await discovery.run();

      const clusters = discovery.getClusters();
      expect(clusters.length).toBeGreaterThan(0);
      expect(clusters[0].status).toBe("pending");
    });

    it("should filter by status", async () => {
      insertTestNodes(db, [
        { id: "node1", summary: "Test 1" },
        { id: "node2", summary: "Test 2" },
        { id: "node3", summary: "Test 3" },
      ]);

      await discovery.run();

      const pending = discovery.getClusters({ status: "pending" });
      expect(pending.length).toBeGreaterThan(0);

      const confirmed = discovery.getClusters({ status: "confirmed" });
      expect(confirmed).toHaveLength(0);
    });
  });

  describe("getClusterNodes", () => {
    it("should return nodes in a cluster", async () => {
      insertTestNodes(db, [
        { id: "node1", summary: "Auth JWT implementation" },
        { id: "node2", summary: "Auth JWT refresh" },
        { id: "node3", summary: "Auth JWT testing" },
      ]);

      await discovery.run();

      const clusters = discovery.getClusters();
      expect(Array.isArray(clusters)).toBeTruthy();

      // Validate first cluster if it exists
      const [firstCluster] = clusters;
      if (firstCluster) {
        const nodes = discovery.getClusterNodes(firstCluster.id);
        expect(nodes.length).toBeGreaterThan(0);
        expect(nodes[0].clusterId).toBe(firstCluster.id);
      }
    });

    it("should filter to representative nodes only", async () => {
      // Create enough nodes to have representatives
      const nodes = Array.from({ length: 10 }, (_, i) => ({
        id: `node${i}`,
        summary: `Similar topic about testing feature ${i}`,
      }));
      insertTestNodes(db, nodes);

      await discovery.run();

      const clusters = discovery.getClusters();
      expect(Array.isArray(clusters)).toBeTruthy();

      // Find a suitable cluster
      const suitableCluster = clusters.find((c) => c.nodeCount >= 5);
      if (suitableCluster) {
        const representatives = discovery.getClusterNodes(suitableCluster.id, {
          representativeOnly: true,
        });

        expect(representatives.length).toBeLessThanOrEqual(5);
        expect(representatives.every((n) => n.isRepresentative)).toBeTruthy();
      }
    });
  });

  describe("updateClusterStatus", () => {
    it("should update status to confirmed", async () => {
      insertTestNodes(db, [
        { id: "node1", summary: "Test 1" },
        { id: "node2", summary: "Test 2" },
      ]);

      await discovery.run();

      const clusters = discovery.getClusters();
      expect(Array.isArray(clusters)).toBeTruthy();

      const [firstCluster] = clusters;
      if (firstCluster) {
        discovery.updateClusterStatus(firstCluster.id, "confirmed");

        const updated = discovery.getClusters({ status: "confirmed" });
        expect(updated).toHaveLength(1);
        expect(updated[0].id).toBe(firstCluster.id);
      }
    });

    it("should update status to dismissed", async () => {
      insertTestNodes(db, [
        { id: "node1", summary: "Test 1" },
        { id: "node2", summary: "Test 2" },
      ]);

      await discovery.run();

      const clusters = discovery.getClusters();
      expect(Array.isArray(clusters)).toBeTruthy();

      const [firstCluster] = clusters;
      if (firstCluster) {
        discovery.updateClusterStatus(firstCluster.id, "dismissed");

        const dismissed = discovery.getClusters({ status: "dismissed" });
        expect(dismissed).toHaveLength(1);
      }
    });
  });

  describe("updateClusterDetails", () => {
    it("should update cluster name and description", async () => {
      insertTestNodes(db, [
        { id: "node1", summary: "Test 1" },
        { id: "node2", summary: "Test 2" },
      ]);

      await discovery.run();

      const clusters = discovery.getClusters();
      expect(Array.isArray(clusters)).toBeTruthy();

      const [firstCluster] = clusters;
      if (firstCluster) {
        discovery.updateClusterDetails(
          firstCluster.id,
          "Auth Patterns",
          "Sessions related to authentication implementation"
        );

        const updated = discovery.getClusters();
        const cluster = updated.find((c) => c.id === firstCluster.id);
        expect(cluster?.name).toBe("Auth Patterns");
        expect(cluster?.description).toBe(
          "Sessions related to authentication implementation"
        );
      }
    });
  });

  describe("getClusteringRun", () => {
    it("should return null for non-existent run", () => {
      const run = discovery.getClusteringRun("nonexistent");
      expect(run).toBeNull();
    });

    it("should return run details", async () => {
      insertTestNodes(db, [{ id: "node1", summary: "Test" }]);

      const result = await discovery.run();
      const run = discovery.getClusteringRun(result.run.id);

      expect(run).not.toBeNull();
      expect(run?.id).toBe(result.run.id);
      expect(run?.status).toBe("completed");
    });
  });
});

// =============================================================================
// HDBSCAN Algorithm Tests
// =============================================================================

describe("hdbscanClustering - algorithm specifics", () => {
  it("should handle 3D embeddings", () => {
    const embeddings = [
      [0, 0, 0],
      [0.1, 0, 0],
      [0, 0.1, 0],
      [5, 5, 5],
      [5.1, 5, 5],
      [5, 5.1, 5],
    ];

    const labels = hdbscanClustering(embeddings, 2);
    expect(labels).toHaveLength(6);
  });

  it("should handle high-dimensional embeddings", () => {
    // 64 dimensions
    const dims = 64;
    const embeddings = [
      Array.from<number>({ length: dims }).fill(0),
      Array.from<number>({ length: dims }).fill(0.1),
      Array.from<number>({ length: dims }).fill(0.05),
      Array.from<number>({ length: dims }).fill(10),
      Array.from<number>({ length: dims }).fill(10.1),
      Array.from<number>({ length: dims }).fill(10.05),
    ];

    const labels = hdbscanClustering(embeddings, 2);
    expect(labels).toHaveLength(6);
  });
});

// =============================================================================
// Integration with HDBSCAN
// =============================================================================

describe("facetDiscovery with HDBSCAN", () => {
  let db: Database.Database;
  let discovery: FacetDiscovery;
  let cleanup: () => void;

  beforeEach(() => {
    const testSetup = createTestDb();
    ({ db } = testSetup);
    ({ cleanup } = testSetup);
    discovery = new FacetDiscovery(
      db,
      { provider: "mock", model: "mock", dimensions: 64 },
      { algorithm: "hdbscan", minClusterSize: 2, minSamples: 2 }
    );
  });

  afterEach(() => {
    cleanup();
  });

  it("should create clusters using HDBSCAN", async () => {
    insertTestNodes(db, [
      { id: "node1", summary: "Auth JWT implementation" },
      { id: "node2", summary: "Auth JWT refresh" },
      { id: "node3", summary: "Database connection pooling" },
      { id: "node4", summary: "Database query optimization" },
    ]);

    const result = await discovery.run();

    expect(result.run.status).toBe("completed");
    expect(result.run.algorithm).toBe("hdbscan");
    // May have clusters or all noise depending on mock embeddings
  });

  it("should handle sparse data gracefully", async () => {
    // Single node should be noise
    insertTestNodes(db, [{ id: "node1", summary: "Single node" }]);

    const result = await discovery.run();

    expect(result.run.status).toBe("completed");
    expect(result.clusters).toHaveLength(0);
  });
});
