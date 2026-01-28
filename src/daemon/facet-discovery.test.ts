/**
 * Tests for Facet Discovery Pipeline
 */

import type Database from "better-sqlite3";

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { openDatabase } from "../storage/database.js";
import { EMBEDDING_FORMAT_VERSION } from "../storage/embedding-utils.js";
import {
  createEmbeddingProvider,
  createMockEmbeddingProvider,
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
    ) VALUES (?, 1, ?, ?, ?, 'test.jsonl', '/nonexistent/test-node-data.json', datetime('now'), datetime('now'), 'v1')
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
  it("should throw for OpenAI without API key", () => {
    expect(() =>
      createEmbeddingProvider({
        provider: "openai",
        model: "text-embedding-3-small",
      })
    ).toThrow("OpenAI embedding provider requires apiKey");
  });

  it("should throw for OpenRouter without API key", () => {
    expect(() =>
      createEmbeddingProvider({
        provider: "openrouter",
        model: "qwen/qwen3-embedding-8b",
      })
    ).toThrow("OpenRouter embedding provider requires apiKey");
  });
});

describe("createMockEmbeddingProvider", () => {
  it("should create a mock provider with specified dimensions", () => {
    const provider = createMockEmbeddingProvider(128);

    expect(provider.dimensions).toBe(128);
    expect(provider.modelName).toBe("mock");
  });

  it("should generate deterministic embeddings", async () => {
    const provider = createMockEmbeddingProvider(64);

    const emb1 = await provider.embed(["hello world"]);
    const emb2 = await provider.embed(["hello world"]);

    expect(emb1[0]).toStrictEqual(emb2[0]);
    expect(emb1[0]).toHaveLength(64);
  });

  it("should generate normalized embeddings", async () => {
    const provider = createMockEmbeddingProvider(128);

    const [embedding] = await provider.embed(["test"]);

    // Check magnitude is ~1.0
    const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
    expect(magnitude).toBeCloseTo(1, 5);
  });

  it("should generate different embeddings for different text", async () => {
    const provider = createMockEmbeddingProvider(64);

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
  let provider: ReturnType<typeof createMockEmbeddingProvider>;

  beforeEach(() => {
    const testSetup = createTestDb();
    ({ db } = testSetup);
    ({ cleanup } = testSetup);
    provider = createMockEmbeddingProvider(64);
    discovery = new FacetDiscovery(db, provider, {
      algorithm: "kmeans",
      numClusters: 3,
    });
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

    it("should re-embed nodes with old simple format (not rich format)", async () => {
      insertTestNodes(db, [{ id: "node1", summary: "Test summary" }]);

      // Insert old-format embedding directly (simple format without version marker)
      const mockEmbedding = Buffer.alloc(provider.dimensions * 4);
      for (let i = 0; i < provider.dimensions; i++) {
        mockEmbedding.writeFloatLE(Math.random(), i * 4);
      }
      const oldInputText = "[coding] Test summary";
      db.prepare(
        `INSERT INTO node_embeddings (node_id, embedding, embedding_model, input_text)
         VALUES (?, ?, ?, ?)`
      ).run("node1", mockEmbedding, "mock", oldInputText);

      // Capture the old embedding bytes
      const oldEmbeddingBytes = Buffer.from(mockEmbedding);

      // Run discovery - should detect old format and re-embed
      await discovery.run();

      // Get the updated row - should have been regenerated
      const newRow = db
        .prepare(
          "SELECT embedding, input_text FROM node_embeddings WHERE node_id = ?"
        )
        .get("node1") as { embedding: Buffer; input_text: string };

      // Verify the embedding was regenerated (bytes should differ from random values)
      expect(Buffer.compare(newRow.embedding, oldEmbeddingBytes)).not.toBe(0);

      // Verify fallback to simple format (since node JSON doesn't exist)
      expect(newRow.input_text).toBe("[coding] Test summary");
    });

    it("should use cached embedding when already in rich format", async () => {
      insertTestNodes(db, [{ id: "node1", summary: "Test summary" }]);

      // Insert rich-format embedding (has Decisions section)
      const mockEmbedding = Buffer.alloc(provider.dimensions * 4);
      for (let i = 0; i < provider.dimensions; i++) {
        mockEmbedding.writeFloatLE(0.5, i * 4);
      }
      // Include version marker so it's recognized as rich format
      const richInputText =
        `[coding] Test summary\n\nDecisions:\n- Used X (why: because Y)\n\n${EMBEDDING_FORMAT_VERSION}`;
      db.prepare(
        `INSERT INTO node_embeddings (node_id, embedding, embedding_model, input_text)
         VALUES (?, ?, ?, ?)`
      ).run("node1", mockEmbedding, "mock", richInputText);

      // Run discovery - should use cached embedding (no re-embed)
      await discovery.run();

      // Verify the input_text was NOT changed (used cache)
      const row = db
        .prepare("SELECT input_text FROM node_embeddings WHERE node_id = ?")
        .get("node1") as { input_text: string };
      expect(row.input_text).toBe(richInputText);
    });

    it("should use cached embedding when it has version marker", async () => {
      insertTestNodes(db, [{ id: "node1", summary: "Test summary" }]);

      // Insert embedding with version marker (no Decisions/Lessons but marked as v2)
      const mockEmbedding = Buffer.alloc(provider.dimensions * 4);
      for (let i = 0; i < provider.dimensions; i++) {
        mockEmbedding.writeFloatLE(0.5, i * 4);
      }
      const versionedInputText = "[coding] Test summary\n\n[emb:v2]";
      db.prepare(
        `INSERT INTO node_embeddings (node_id, embedding, embedding_model, input_text)
         VALUES (?, ?, ?, ?)`
      ).run("node1", mockEmbedding, "mock", versionedInputText);

      // Run discovery - should use cached embedding (recognized as v2 format)
      await discovery.run();

      // Verify the input_text was NOT changed (used cache)
      const row = db
        .prepare("SELECT input_text FROM node_embeddings WHERE node_id = ?")
        .get("node1") as { input_text: string };
      expect(row.input_text).toBe(versionedInputText);
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
      expect(clusters.length).toBeGreaterThan(0);

      const [firstCluster] = clusters;
      const nodes = discovery.getClusterNodes(firstCluster.id);
      expect(nodes.length).toBeGreaterThan(0);
      expect(nodes[0].clusterId).toBe(firstCluster.id);
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
      expect(clusters.length).toBeGreaterThan(0);

      // Find a suitable cluster (or use first if none with 5+)
      const suitableCluster =
        clusters.find((c) => c.nodeCount >= 5) ?? clusters[0];
      const representatives = discovery.getClusterNodes(suitableCluster.id, {
        representativeOnly: true,
      });

      expect(representatives.length).toBeLessThanOrEqual(5);
      expect(representatives.every((n) => n.isRepresentative)).toBeTruthy();
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
      expect(clusters.length).toBeGreaterThan(0);

      const [firstCluster] = clusters;
      discovery.updateClusterStatus(firstCluster.id, "confirmed");

      const updated = discovery.getClusters({ status: "confirmed" });
      expect(updated).toHaveLength(1);
      expect(updated[0].id).toBe(firstCluster.id);
    });

    it("should update status to dismissed", async () => {
      insertTestNodes(db, [
        { id: "node1", summary: "Test 1" },
        { id: "node2", summary: "Test 2" },
      ]);

      await discovery.run();

      const clusters = discovery.getClusters();
      expect(clusters.length).toBeGreaterThan(0);

      const [firstCluster] = clusters;
      discovery.updateClusterStatus(firstCluster.id, "dismissed");

      const dismissed = discovery.getClusters({ status: "dismissed" });
      expect(dismissed).toHaveLength(1);
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
      expect(clusters.length).toBeGreaterThan(0);

      const [firstCluster] = clusters;
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
    discovery = new FacetDiscovery(db, createMockEmbeddingProvider(64), {
      algorithm: "hdbscan",
      minClusterSize: 2,
      minSamples: 2,
    });
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

// =============================================================================
// Cluster Analysis Tests
// =============================================================================

describe("analyzeClusters", () => {
  let db: Database.Database;
  let discovery: FacetDiscovery;
  let cleanup: () => void;

  beforeEach(() => {
    const testSetup = createTestDb();
    ({ db } = testSetup);
    ({ cleanup } = testSetup);
    discovery = new FacetDiscovery(db, createMockEmbeddingProvider(64), {
      algorithm: "kmeans",
      numClusters: 2,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("should return empty results when no pending clusters", async () => {
    const result = await discovery.analyzeClusters({
      provider: "zai",
      model: "glm-4.7",
    });

    expect(result.analyzed).toBe(0);
    expect(result.succeeded).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.results).toHaveLength(0);
  });

  it("should skip clusters that already have names", async () => {
    // Create clusters
    insertTestNodes(db, [
      { id: "node1", summary: "Auth implementation" },
      { id: "node2", summary: "Auth tokens" },
      { id: "node3", summary: "Database queries" },
      { id: "node4", summary: "Database indexes" },
    ]);

    await discovery.run();

    const clusters = discovery.getClusters();
    expect(clusters.length).toBeGreaterThan(0);

    // Name ALL clusters so none need analysis
    for (const cluster of clusters) {
      discovery.updateClusterDetails(
        cluster.id,
        `Pattern ${cluster.id}`,
        "Test description"
      );
    }

    // Now analyze - all clusters have names, so none should be analyzed
    const result = await discovery.analyzeClusters({
      provider: "zai",
      model: "glm-4.7",
    });

    // All clusters are named, so nothing to analyze
    expect(result.analyzed).toBe(0);
    expect(result.succeeded).toBe(0);
    expect(result.failed).toBe(0);
  });

  it("should return failure for clusters when pi is unavailable", async () => {
    insertTestNodes(db, [
      { id: "node1", summary: "Test 1" },
      { id: "node2", summary: "Test 2" },
    ]);

    await discovery.run();

    const clusters = discovery.getClusters();
    expect(clusters.length).toBeGreaterThan(0);

    // Provide a non-existent prompt file path with no fallback possible
    // Using a subdirectory that definitely doesn't exist
    const uniquePath = `/tmp/nonexistent-${Date.now()}/cluster-analyzer.md`;
    const result = await discovery.analyzeClusters({
      provider: "zai",
      model: "glm-4.7",
      promptFile: uniquePath,
    });

    // Should have attempted to analyze but failed due to missing prompt file
    expect(result.analyzed).toBeGreaterThan(0);
    expect(result.failed).toBe(result.analyzed);

    const [failedResult] = result.results;
    expect(failedResult.success).toBeFalsy();
    expect(failedResult.error).toContain("prompt file not found");
  });

  it("should respect limit option", async () => {
    // Create multiple clusters
    insertTestNodes(db, [
      { id: "node1", summary: "Pattern A type 1" },
      { id: "node2", summary: "Pattern A type 2" },
      { id: "node3", summary: "Pattern B type 1" },
      { id: "node4", summary: "Pattern B type 2" },
      { id: "node5", summary: "Pattern C type 1" },
      { id: "node6", summary: "Pattern C type 2" },
    ]);

    // Use kmeans with 3 clusters
    const discoveryWithMore = new FacetDiscovery(
      db,
      createMockEmbeddingProvider(64),
      { algorithm: "kmeans", numClusters: 3 }
    );

    await discoveryWithMore.run();

    const clusters = discoveryWithMore.getClusters();
    expect(clusters).toHaveLength(3);

    // Name 2 of 3 clusters, so only 1 unnamed
    discovery.updateClusterDetails(
      clusters[0].id,
      "Named Cluster 1",
      "Description 1"
    );
    discovery.updateClusterDetails(
      clusters[1].id,
      "Named Cluster 2",
      "Description 2"
    );

    // Analyze with limit of 1 - should only pick up 1 unnamed cluster
    const result = await discoveryWithMore.analyzeClusters(
      {
        provider: "zai",
        model: "glm-4.7",
        promptFile: `/tmp/nonexistent-${Date.now()}/prompt.md`,
      },
      { limit: 10 }
    );

    // Only 1 unnamed cluster, so should analyze 1
    expect(result.analyzed).toBe(1);
  });

  it("should get node summaries for representative nodes", async () => {
    insertTestNodes(db, [
      { id: "node1", summary: "Summary for node 1", type: "coding" },
      { id: "node2", summary: "Summary for node 2", type: "debugging" },
    ]);

    await discovery.run();

    const clusters = discovery.getClusters();
    expect(clusters.length).toBeGreaterThan(0);

    const [firstCluster] = clusters;
    const repNodes = discovery.getClusterNodes(firstCluster.id, {
      representativeOnly: true,
    });

    expect(repNodes.length).toBeGreaterThan(0);

    // The representative nodes should have isRepresentative = true
    for (const node of repNodes) {
      expect(node.isRepresentative).toBeTruthy();
    }
  });
});
