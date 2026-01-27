/**
 * Facet Discovery Pipeline
 *
 * Implements embedding + clustering to discover patterns across nodes.
 * See specs/signals.md Section 3 for specification.
 *
 * Pipeline:
 * 1. Embed node summaries using a local or API-based embedding model
 * 2. Cluster embeddings using HDBSCAN or K-means
 * 3. Store clusters and representative nodes
 * 4. LLM analyzes clusters to generate names/descriptions (analyzeClusters)
 */

import type Database from "better-sqlite3";

import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import type {
  Cluster,
  ClusteringConfig,
  ClusteringRun,
  ClusterNode,
  ClusterSignalType,
  EmbeddingConfig,
  FacetDiscoveryResult,
  NodeEmbedding,
} from "../types/index.js";

// =============================================================================
// Constants
// =============================================================================

/** Default batch size for embedding requests */
const EMBEDDING_BATCH_SIZE = 50;

/** Maximum nodes to process in one clustering run */
const DEFAULT_MAX_NODES = 10_000;

/** Default minimum cluster size for HDBSCAN */
const DEFAULT_MIN_CLUSTER_SIZE = 3;

/** Number of representative nodes to select per cluster */
const REPRESENTATIVE_COUNT = 5;

// =============================================================================
// Database Row Types
// =============================================================================

interface NodeSummaryRow {
  id: string;
  summary: string | null;
  type: string | null;
  project: string | null;
  outcome: string | null;
}

interface EmbeddingRow {
  node_id: string;
  embedding: Buffer;
  embedding_model: string;
  input_text: string;
  created_at: string;
}

interface ClusterRow {
  id: string;
  name: string | null;
  description: string | null;
  node_count: number;
  algorithm: string;
  min_cluster_size: number | null;
  status: string;
  related_model: string | null;
  signal_type: string | null;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// Cluster Analysis Types
// =============================================================================

/**
 * Configuration for LLM cluster analysis
 */
export interface ClusterAnalysisConfig {
  /** LLM provider (e.g., 'zai', 'anthropic') */
  provider: string;
  /** Model name (e.g., 'glm-4.7') */
  model: string;
  /** Path to the cluster analyzer prompt file */
  promptFile?: string;
  /** Timeout in minutes (default: 5) */
  timeoutMinutes?: number;
}

/**
 * Result from analyzing a single cluster
 */
export interface ClusterAnalysisResult {
  clusterId: string;
  success: boolean;
  name?: string;
  description?: string;
  confidence?: "high" | "medium" | "low";
  reasoning?: string;
  error?: string;
}

/**
 * Result from analyzing multiple clusters
 */
export interface ClusterAnalysisBatchResult {
  analyzed: number;
  succeeded: number;
  failed: number;
  results: ClusterAnalysisResult[];
}

// =============================================================================
// Embedding Providers
// =============================================================================

/**
 * Interface for embedding providers
 */
export interface EmbeddingProvider {
  embed(texts: string[]): Promise<number[][]>;
  dimensions: number;
  modelName: string;
}

/**
 * Create an embedding provider from config
 */
export function createEmbeddingProvider(
  config: EmbeddingConfig
): EmbeddingProvider {
  switch (config.provider) {
    case "ollama": {
      return createOllamaProvider(
        config.model,
        config.baseUrl ?? "http://localhost:11434"
      );
    }
    case "openai": {
      if (!config.apiKey) {
        throw new Error("OpenAI embedding provider requires apiKey");
      }
      return createOpenAIProvider(
        config.model,
        config.apiKey,
        config.dimensions
      );
    }
    case "mock": {
      return createMockProvider(config.dimensions ?? 384);
    }
    default: {
      throw new Error(`Unknown embedding provider: ${config.provider}`);
    }
  }
}

/**
 * Create Ollama embedding provider
 */
function createOllamaProvider(
  model: string,
  baseUrl: string
): EmbeddingProvider {
  let dimensions = 768; // nomic-embed-text default

  return {
    modelName: model,
    get dimensions() {
      return dimensions;
    },
    async embed(texts: string[]): Promise<number[][]> {
      const results: number[][] = [];

      for (const text of texts) {
        const response = await fetch(`${baseUrl}/api/embeddings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model, prompt: text }),
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(
            `Ollama embedding failed: ${response.status} ${error}`
          );
        }

        const data = (await response.json()) as { embedding: number[] };
        results.push(data.embedding);

        if (data.embedding.length > 0) {
          dimensions = data.embedding.length;
        }
      }

      return results;
    },
  };
}

/**
 * Create OpenAI embedding provider
 */
function createOpenAIProvider(
  model: string,
  apiKey: string,
  dims?: number
): EmbeddingProvider {
  const dimensions = dims ?? (model.includes("3-small") ? 1536 : 3072);

  return {
    modelName: model,
    dimensions,
    async embed(texts: string[]): Promise<number[][]> {
      const response = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model, input: texts }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI embedding failed: ${response.status} ${error}`);
      }

      interface EmbeddingData {
        embedding: number[];
        index: number;
      }
      const data = (await response.json()) as { data: EmbeddingData[] };

      const sorted = data.data.toSorted((a, b) => a.index - b.index);
      return sorted.map((d) => d.embedding);
    },
  };
}

/**
 * Create mock embedding provider for testing
 */
function createMockProvider(dims: number): EmbeddingProvider {
  return {
    modelName: "mock",
    dimensions: dims,
    async embed(texts: string[]): Promise<number[][]> {
      return texts.map((text) => {
        const embedding: number[] = [];
        let seed = hashString(text);

        for (let i = 0; i < dims; i++) {
          // Simple LCG for deterministic pseudo-random values
          seed = Math.abs(Math.imul(seed, 1_664_525) + 1_013_904_223);
          embedding.push((seed / 2_147_483_647) * 2 - 1);
        }

        // Normalize
        const magnitude = Math.sqrt(
          embedding.reduce((sum, v) => sum + v * v, 0)
        );
        return embedding.map((v) => v / magnitude);
      });
    },
  };
}

/**
 * Simple string hash for mock embeddings
 * Uses absolute value for overflow handling
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.codePointAt(i) ?? 0;
    hash = Math.abs(Math.imul(hash, 31) + char);
  }
  return hash;
}

// =============================================================================
// Clustering Algorithms
// =============================================================================

/**
 * K-means clustering result
 */
interface KMeansResult {
  labels: number[];
  centroids: number[][];
}

/**
 * Simple K-means++ clustering implementation
 */
export function kMeansClustering(
  embeddings: number[][],
  k: number,
  maxIterations = 100
): KMeansResult {
  if (embeddings.length === 0) {
    return { labels: [], centroids: [] };
  }

  if (embeddings.length < k) {
    return {
      labels: embeddings.map((_, i) => i),
      centroids: embeddings.map((e) => [...e]),
    };
  }

  const n = embeddings.length;
  const dims = embeddings[0]?.length ?? 0;
  const centroids = kMeansPlusPlusInit(embeddings, k);

  let labels = Array.from<number>({ length: n }).fill(0);

  for (let iter = 0; iter < maxIterations; iter++) {
    const newLabels = embeddings.map((emb) => {
      let minDist = Number.POSITIVE_INFINITY;
      let minIdx = 0;
      for (let c = 0; c < k; c++) {
        const dist = euclideanDistance(emb, centroids[c]);
        if (dist < minDist) {
          minDist = dist;
          minIdx = c;
        }
      }
      return minIdx;
    });

    const prevLabels = labels;
    const changed = newLabels.some((l, i) => l !== prevLabels[i]);
    labels = newLabels;

    if (!changed) {
      break;
    }

    const counts = Array.from<number>({ length: k }).fill(0);
    const sums = Array.from({ length: k }, () =>
      Array.from<number>({ length: dims }).fill(0)
    );

    for (let i = 0; i < n; i++) {
      const c = labels[i];
      counts[c]++;
      for (let d = 0; d < dims; d++) {
        sums[c][d] += embeddings[i][d];
      }
    }

    for (let c = 0; c < k; c++) {
      if (counts[c] > 0) {
        for (let d = 0; d < dims; d++) {
          centroids[c][d] = sums[c][d] / counts[c];
        }
      }
    }
  }

  return { labels, centroids };
}

/**
 * K-means++ initialization
 */
function kMeansPlusPlusInit(embeddings: number[][], k: number): number[][] {
  const n = embeddings.length;
  const centroids: number[][] = [];

  const firstIdx = Math.floor(Math.random() * n);
  centroids.push([...embeddings[firstIdx]]);

  for (let c = 1; c < k; c++) {
    const distances = embeddings.map((emb) => {
      let minDist = Number.POSITIVE_INFINITY;
      for (const centroid of centroids) {
        const dist = euclideanDistance(emb, centroid);
        minDist = Math.min(minDist, dist);
      }
      return minDist * minDist;
    });

    const totalDist = distances.reduce((a, b) => a + b, 0);
    let r = Math.random() * totalDist;

    let idx = 0;
    for (let i = 0; i < n; i++) {
      r -= distances[i];
      if (r <= 0) {
        idx = i;
        break;
      }
    }

    centroids.push([...embeddings[idx]]);
  }

  return centroids;
}

/**
 * HDBSCAN-like density-based clustering (simplified)
 */
export function hdbscanClustering(
  embeddings: number[][],
  minClusterSize = 3,
  minSamples = 3
): number[] {
  if (embeddings.length < minClusterSize) {
    return Array.from<number>({ length: embeddings.length }).fill(-1);
  }

  const n = embeddings.length;
  const distances = computeDistanceMatrix(embeddings);
  const coreDistances = computeCoreDistances(distances, minSamples);
  const mutualReachability = computeMutualReachability(
    distances,
    coreDistances
  );
  const labels = extractClusters(mutualReachability, n, minClusterSize);

  return labels;
}

function computeDistanceMatrix(embeddings: number[][]): number[][] {
  const n = embeddings.length;
  const matrix: number[][] = Array.from({ length: n }, () =>
    Array.from<number>({ length: n }).fill(0)
  );

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dist = euclideanDistance(embeddings[i], embeddings[j]);
      matrix[i][j] = dist;
      matrix[j][i] = dist;
    }
  }

  return matrix;
}

function computeCoreDistances(
  distances: number[][],
  minSamples: number
): number[] {
  return distances.map((row) => {
    const sorted = [...row].toSorted((a, b) => a - b);
    return sorted[Math.min(minSamples, sorted.length - 1)];
  });
}

function computeMutualReachability(
  distances: number[][],
  coreDistances: number[]
): number[][] {
  const n = distances.length;
  const reachability: number[][] = Array.from({ length: n }, () =>
    Array.from<number>({ length: n }).fill(0)
  );

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const mr = Math.max(coreDistances[i], coreDistances[j], distances[i][j]);
      reachability[i][j] = mr;
      reachability[j][i] = mr;
    }
  }

  return reachability;
}

function extractClusters(
  reachability: number[][],
  n: number,
  minClusterSize: number
): number[] {
  const mstEdges: { from: number; to: number; weight: number }[] = [];
  const inMst = new Set<number>([0]);

  while (inMst.size < n) {
    let minEdge: { from: number; to: number; weight: number } | null = null;
    let minWeight = Number.POSITIVE_INFINITY;

    for (const node of inMst) {
      for (let j = 0; j < n; j++) {
        if (!inMst.has(j) && reachability[node][j] < minWeight) {
          minWeight = reachability[node][j];
          minEdge = { from: node, to: j, weight: minWeight };
        }
      }
    }

    if (!minEdge) {
      break;
    }

    mstEdges.push(minEdge);
    inMst.add(minEdge.to);
  }

  mstEdges.sort((a, b) => b.weight - a.weight);

  const thresholdIdx = Math.floor(mstEdges.length * 0.1);
  const threshold = mstEdges[thresholdIdx]?.weight ?? Number.POSITIVE_INFINITY;

  const adj: Set<number>[] = Array.from({ length: n }, () => new Set());
  for (const edge of mstEdges) {
    if (edge.weight < threshold) {
      adj[edge.from].add(edge.to);
      adj[edge.to].add(edge.from);
    }
  }

  const labels = Array.from<number>({ length: n }).fill(-1);
  let clusterId = 0;

  for (let i = 0; i < n; i++) {
    if (labels[i] !== -1) {
      continue;
    }

    const component: number[] = [];
    const queue = [i];

    while (queue.length > 0) {
      const node = queue.shift();
      if (node === undefined || labels[node] !== -1) {
        continue;
      }

      labels[node] = clusterId;
      component.push(node);

      for (const neighbor of adj[node]) {
        if (labels[neighbor] === -1) {
          queue.push(neighbor);
        }
      }
    }

    if (component.length < minClusterSize) {
      for (const node of component) {
        labels[node] = -1;
      }
    } else {
      clusterId++;
    }
  }

  return labels;
}

function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

// =============================================================================
// Facet Discovery Class
// =============================================================================

export interface FacetDiscoveryLogger {
  info: (message: string) => void;
  error: (message: string) => void;
  debug?: (message: string) => void;
}

const noopLogger: FacetDiscoveryLogger = {
  info: () => {},
  error: () => {},
  debug: () => {},
};

export class FacetDiscovery {
  private provider: EmbeddingProvider;
  private clusteringConfig: ClusteringConfig;
  private logger: FacetDiscoveryLogger;

  constructor(
    private db: Database.Database,
    embeddingConfig: EmbeddingConfig,
    clusteringConfig?: ClusteringConfig,
    logger?: FacetDiscoveryLogger
  ) {
    this.provider = createEmbeddingProvider(embeddingConfig);
    this.clusteringConfig = clusteringConfig ?? {
      algorithm: "hdbscan",
      minClusterSize: DEFAULT_MIN_CLUSTER_SIZE,
    };
    this.logger = logger ?? noopLogger;
  }

  async run(options?: {
    signalType?: ClusterSignalType;
    model?: string;
    maxNodes?: number;
  }): Promise<FacetDiscoveryResult> {
    const runId = generateId();
    const startedAt = new Date().toISOString();

    this.logger.info(`Starting facet discovery run ${runId}`);

    this.db
      .prepare(
        `INSERT INTO clustering_runs (id, started_at, embedding_model, algorithm, parameters, status)
       VALUES (?, ?, ?, ?, ?, 'running')`
      )
      .run(
        runId,
        startedAt,
        this.provider.modelName,
        this.clusteringConfig.algorithm,
        JSON.stringify(this.clusteringConfig)
      );

    try {
      const nodes = this.getNodesForClustering(
        options?.maxNodes ??
          this.clusteringConfig.maxNodes ??
          DEFAULT_MAX_NODES,
        options?.signalType,
        options?.model
      );

      this.logger.info(`Found ${nodes.length} nodes to process`);

      if (nodes.length === 0) {
        return this.completeRun(runId, [], 0, 0, 0);
      }

      const embeddings = await this.embedNodes(nodes, runId);
      this.logger.info(`Embedded ${embeddings.length} nodes`);

      const labels = this.clusterEmbeddings(embeddings);

      const clusters = this.createClusters(
        nodes,
        embeddings,
        labels,
        runId,
        options?.signalType,
        options?.model
      );

      this.logger.info(`Created ${clusters.length} clusters`);

      return this.completeRun(
        runId,
        clusters,
        nodes.length,
        embeddings.length,
        clusters.length
      );
    } catch (error) {
      this.failRun(
        runId,
        error instanceof Error ? error.message : String(error)
      );
      throw error;
    }
  }

  private getNodesForClustering(
    maxNodes: number,
    _signalType?: ClusterSignalType,
    model?: string
  ): NodeSummaryRow[] {
    let sql = `
      SELECT 
        n.id,
        fts.summary,
        n.type,
        n.project,
        n.outcome
      FROM nodes n
      LEFT JOIN nodes_fts fts ON fts.node_id = n.id
      WHERE fts.summary IS NOT NULL
        AND fts.summary != ''
    `;

    const params: unknown[] = [];

    if (model) {
      sql += `
        AND EXISTS (
          SELECT 1 FROM model_quirks mq 
          WHERE mq.node_id = n.id AND mq.model = ?
        )
      `;
      params.push(model);
    }

    sql += " ORDER BY n.timestamp DESC LIMIT ?";
    params.push(maxNodes);

    return this.db.prepare(sql).all(...params) as NodeSummaryRow[];
  }

  private async embedNodes(
    nodes: NodeSummaryRow[],
    runId: string
  ): Promise<{ nodeId: string; embedding: number[]; inputText: string }[]> {
    const results: {
      nodeId: string;
      embedding: number[];
      inputText: string;
    }[] = [];

    const nodeIds = nodes.map((n) => n.id);
    const cached = this.getCachedEmbeddings(nodeIds);
    const cachedMap = new Map(cached.map((c) => [c.nodeId, c]));

    const needsEmbedding: NodeSummaryRow[] = [];
    for (const node of nodes) {
      const cachedEmb = cachedMap.get(node.id);
      if (cachedEmb && cachedEmb.embeddingModel === this.provider.modelName) {
        results.push({
          nodeId: node.id,
          embedding: cachedEmb.embedding,
          inputText: cachedEmb.inputText,
        });
      } else {
        needsEmbedding.push(node);
      }
    }

    this.logger.debug?.(
      `Using ${results.length} cached embeddings, generating ${needsEmbedding.length} new`
    );

    for (let i = 0; i < needsEmbedding.length; i += EMBEDDING_BATCH_SIZE) {
      const batch = needsEmbedding.slice(i, i + EMBEDDING_BATCH_SIZE);
      const texts = batch.map((n) => this.buildEmbeddingText(n));

      try {
        const embeddings = await this.provider.embed(texts);

        for (let j = 0; j < batch.length; j++) {
          const node = batch[j];
          const embedding = embeddings[j];
          const inputText = texts[j];

          this.cacheEmbedding(node.id, embedding, inputText);

          results.push({ nodeId: node.id, embedding, inputText });
        }
      } catch (error) {
        this.logger.error(
          `Error embedding batch ${i / EMBEDDING_BATCH_SIZE}: ${error}`
        );
      }
    }

    this.db
      .prepare("UPDATE clustering_runs SET nodes_embedded = ? WHERE id = ?")
      .run(results.length, runId);

    return results;
  }

  private buildEmbeddingText(node: NodeSummaryRow): string {
    const parts: string[] = [];
    if (node.type) {
      parts.push(`[${node.type}]`);
    }
    if (node.summary) {
      parts.push(node.summary);
    }
    return parts.join(" ");
  }

  private getCachedEmbeddings(nodeIds: string[]): NodeEmbedding[] {
    if (nodeIds.length === 0) {
      return [];
    }

    const placeholders = nodeIds.map(() => "?").join(",");
    const rows = this.db
      .prepare(
        `SELECT node_id, embedding, embedding_model, input_text, created_at
         FROM node_embeddings WHERE node_id IN (${placeholders})`
      )
      .all(...nodeIds) as EmbeddingRow[];

    return rows.map((row) => ({
      nodeId: row.node_id,
      embedding: deserializeEmbedding(row.embedding),
      embeddingModel: row.embedding_model,
      inputText: row.input_text,
      createdAt: row.created_at,
    }));
  }

  private cacheEmbedding(
    nodeId: string,
    embedding: number[],
    inputText: string
  ): void {
    const embeddingBlob = serializeEmbedding(embedding);

    this.db
      .prepare(
        `INSERT OR REPLACE INTO node_embeddings (node_id, embedding, embedding_model, input_text)
         VALUES (?, ?, ?, ?)`
      )
      .run(nodeId, embeddingBlob, this.provider.modelName, inputText);
  }

  private clusterEmbeddings(
    embeddings: { nodeId: string; embedding: number[] }[]
  ): number[] {
    const embeddingVectors = embeddings.map((e) => e.embedding);

    if (this.clusteringConfig.algorithm === "kmeans") {
      const k =
        this.clusteringConfig.numClusters ??
        Math.max(2, Math.floor(Math.sqrt(embeddings.length / 2)));
      const result = kMeansClustering(embeddingVectors, k);
      return result.labels;
    }

    return hdbscanClustering(
      embeddingVectors,
      this.clusteringConfig.minClusterSize ?? DEFAULT_MIN_CLUSTER_SIZE,
      this.clusteringConfig.minSamples ?? 3
    );
  }

  private createClusters(
    _nodes: NodeSummaryRow[],
    embeddings: { nodeId: string; embedding: number[] }[],
    labels: number[],
    runId: string,
    signalType?: ClusterSignalType,
    model?: string
  ): Cluster[] {
    const clusterGroups = new Map<number, number[]>();
    for (let i = 0; i < labels.length; i++) {
      const label = labels[i];
      if (label === -1) {
        continue;
      }

      const group = clusterGroups.get(label);
      if (group) {
        group.push(i);
      } else {
        clusterGroups.set(label, [i]);
      }
    }

    const clusters: Cluster[] = [];

    for (const [_label, indices] of clusterGroups) {
      const clusterId = generateId();
      const nodeCount = indices.length;

      const centroid = this.computeCentroid(
        indices.map((i) => embeddings[i].embedding)
      );

      const now = new Date().toISOString();
      this.db
        .prepare(
          `INSERT INTO clusters (id, node_count, centroid, algorithm, min_cluster_size, related_model, signal_type, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          clusterId,
          nodeCount,
          serializeEmbedding(centroid),
          this.clusteringConfig.algorithm,
          this.clusteringConfig.minClusterSize,
          model ?? null,
          signalType ?? null,
          now,
          now
        );

      const nodesWithDistance = indices.map((i) => ({
        nodeId: embeddings[i].nodeId,
        distance: euclideanDistance(embeddings[i].embedding, centroid),
        index: i,
      }));

      nodesWithDistance.sort((a, b) => a.distance - b.distance);

      const insertNode = this.db.prepare(
        `INSERT INTO cluster_nodes (cluster_id, node_id, distance, is_representative)
         VALUES (?, ?, ?, ?)`
      );

      for (let i = 0; i < nodesWithDistance.length; i++) {
        const { nodeId, distance } = nodesWithDistance[i];
        const isRepresentative = i < REPRESENTATIVE_COUNT;
        insertNode.run(clusterId, nodeId, distance, isRepresentative ? 1 : 0);
      }

      clusters.push({
        id: clusterId,
        name: null,
        description: null,
        nodeCount,
        algorithm: this.clusteringConfig.algorithm,
        minClusterSize: this.clusteringConfig.minClusterSize,
        status: "pending",
        relatedModel: model,
        signalType: signalType ?? null,
        createdAt: now,
        updatedAt: now,
      });
    }

    this.db
      .prepare(
        "UPDATE clustering_runs SET nodes_clustered = ?, clusters_created = ? WHERE id = ?"
      )
      .run(embeddings.length - countNoise(labels), clusters.length, runId);

    return clusters;
  }

  private computeCentroid(embeddings: number[][]): number[] {
    if (embeddings.length === 0) {
      return [];
    }

    const dims = embeddings[0]?.length ?? 0;
    const centroid = Array.from<number>({ length: dims }).fill(0);

    for (const emb of embeddings) {
      for (let i = 0; i < dims; i++) {
        centroid[i] += emb[i];
      }
    }

    for (let i = 0; i < dims; i++) {
      centroid[i] /= embeddings.length;
    }

    return centroid;
  }

  private completeRun(
    runId: string,
    clusters: Cluster[],
    nodesEmbedded: number,
    nodesClustered: number,
    clustersCreated: number
  ): FacetDiscoveryResult {
    const now = new Date().toISOString();

    this.db
      .prepare(
        `UPDATE clustering_runs 
         SET completed_at = ?, nodes_embedded = ?, nodes_clustered = ?, 
             clusters_created = ?, status = 'completed'
         WHERE id = ?`
      )
      .run(now, nodesEmbedded, nodesClustered, clustersCreated, runId);

    const run = this.getClusteringRun(runId);
    if (!run) {
      throw new Error(`Failed to retrieve clustering run ${runId}`);
    }

    this.logger.info(`Completed facet discovery run ${runId}`);

    return { run, clusters };
  }

  private failRun(runId: string, error: string): void {
    const now = new Date().toISOString();

    this.db
      .prepare(
        `UPDATE clustering_runs 
         SET completed_at = ?, status = 'failed', error = ?
         WHERE id = ?`
      )
      .run(now, error, runId);

    this.logger.error(`Failed facet discovery run ${runId}: ${error}`);
  }

  getClusteringRun(runId: string): ClusteringRun | null {
    const row = this.db
      .prepare("SELECT * FROM clustering_runs WHERE id = ?")
      .get(runId) as Record<string, unknown> | undefined;

    if (!row) {
      return null;
    }

    return {
      id: row.id as string,
      startedAt: row.started_at as string,
      completedAt: row.completed_at as string | undefined,
      nodesEmbedded: row.nodes_embedded as number,
      nodesClustered: row.nodes_clustered as number,
      clustersCreated: row.clusters_created as number,
      clustersAnalyzed: row.clusters_analyzed as number,
      embeddingModel: row.embedding_model as string,
      algorithm: row.algorithm as string,
      parameters: JSON.parse((row.parameters as string) || "{}"),
      status: row.status as "running" | "completed" | "failed",
      error: row.error as string | undefined,
    };
  }

  getClusters(options?: {
    status?: string;
    signalType?: ClusterSignalType;
    limit?: number;
  }): Cluster[] {
    let sql = "SELECT * FROM clusters WHERE 1=1";
    const params: unknown[] = [];

    if (options?.status) {
      sql += " AND status = ?";
      params.push(options.status);
    }

    if (options?.signalType !== undefined) {
      if (options.signalType === null) {
        sql += " AND signal_type IS NULL";
      } else {
        sql += " AND signal_type = ?";
        params.push(options.signalType);
      }
    }

    sql += " ORDER BY created_at DESC";

    if (options?.limit) {
      sql += " LIMIT ?";
      params.push(options.limit);
    }

    const rows = this.db.prepare(sql).all(...params) as ClusterRow[];

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      nodeCount: row.node_count,
      algorithm: row.algorithm,
      minClusterSize: row.min_cluster_size ?? undefined,
      status: row.status as "pending" | "confirmed" | "dismissed",
      relatedModel: row.related_model ?? undefined,
      signalType: row.signal_type as ClusterSignalType,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  getClusterNodes(
    clusterId: string,
    options?: { representativeOnly?: boolean }
  ): ClusterNode[] {
    let sql = `
      SELECT cluster_id, node_id, distance, is_representative
      FROM cluster_nodes
      WHERE cluster_id = ?
    `;
    const params: unknown[] = [clusterId];

    if (options?.representativeOnly) {
      sql += " AND is_representative = 1";
    }

    sql += " ORDER BY distance ASC";

    const rows = this.db.prepare(sql).all(...params) as {
      cluster_id: string;
      node_id: string;
      distance: number | null;
      is_representative: number;
    }[];

    return rows.map((row) => ({
      clusterId: row.cluster_id,
      nodeId: row.node_id,
      distance: row.distance ?? undefined,
      isRepresentative: row.is_representative === 1,
    }));
  }

  updateClusterStatus(
    clusterId: string,
    status: "confirmed" | "dismissed"
  ): void {
    const now = new Date().toISOString();
    const statusField =
      status === "confirmed" ? "confirmed_at" : "dismissed_at";

    this.db
      .prepare(
        `UPDATE clusters SET status = ?, ${statusField} = ?, updated_at = ? WHERE id = ?`
      )
      .run(status, now, now, clusterId);
  }

  updateClusterDetails(
    clusterId: string,
    name: string,
    description: string
  ): void {
    const now = new Date().toISOString();

    this.db
      .prepare(
        "UPDATE clusters SET name = ?, description = ?, updated_at = ? WHERE id = ?"
      )
      .run(name, description, now, clusterId);
  }

  // ===========================================================================
  // Cluster Analysis (LLM)
  // ===========================================================================

  /**
   * Analyze pending clusters using an LLM to generate names and descriptions.
   *
   * This method:
   * 1. Gets clusters with status 'pending' that haven't been named
   * 2. For each cluster, gets the representative nodes
   * 3. Builds a prompt with node summaries
   * 4. Invokes a pi agent to analyze and name the cluster
   * 5. Updates the cluster with the generated name and description
   */
  async analyzeClusters(
    config: ClusterAnalysisConfig,
    options?: { limit?: number }
  ): Promise<ClusterAnalysisBatchResult> {
    const limit = options?.limit ?? 10;

    // Get pending clusters that need analysis
    const pendingClusters = this.getClusters({ status: "pending", limit });
    const unnamedClusters = pendingClusters.filter((c) => c.name === null);

    this.logger.info(
      `Found ${unnamedClusters.length} unnamed clusters to analyze`
    );

    const results: ClusterAnalysisResult[] = [];
    let succeeded = 0;
    let failed = 0;

    for (const cluster of unnamedClusters) {
      const result = await this.analyzeCluster(cluster, config);
      results.push(result);

      if (result.success) {
        succeeded++;
        // Update the cluster with name and description
        if (result.name && result.description) {
          this.updateClusterDetails(
            cluster.id,
            result.name,
            result.description
          );
        }
      } else {
        failed++;
      }
    }

    this.logger.info(
      `Cluster analysis complete: ${succeeded} succeeded, ${failed} failed`
    );

    return {
      analyzed: unnamedClusters.length,
      succeeded,
      failed,
      results,
    };
  }

  /**
   * Analyze a single cluster
   */
  private async analyzeCluster(
    cluster: Cluster,
    config: ClusterAnalysisConfig
  ): Promise<ClusterAnalysisResult> {
    this.logger.info(
      `Analyzing cluster ${cluster.id} (${cluster.nodeCount} nodes)`
    );

    // Get representative nodes for this cluster
    const repNodes = this.getClusterNodes(cluster.id, {
      representativeOnly: true,
    });

    if (repNodes.length === 0) {
      return {
        clusterId: cluster.id,
        success: false,
        error: "No representative nodes found",
      };
    }

    // Get node summaries for the representative nodes
    const nodeSummaries = this.getNodeSummaries(repNodes.map((n) => n.nodeId));

    if (nodeSummaries.length === 0) {
      return {
        clusterId: cluster.id,
        success: false,
        error: "Could not retrieve node summaries",
      };
    }

    // Build the prompt
    const prompt = this.buildClusterAnalysisPrompt(nodeSummaries, cluster);

    // Invoke the LLM
    try {
      const llmResult = await this.invokeClusterAnalysisAgent(prompt, config);

      if (!llmResult.success) {
        return {
          clusterId: cluster.id,
          success: false,
          error: llmResult.error,
        };
      }

      return {
        clusterId: cluster.id,
        success: true,
        name: llmResult.name,
        description: llmResult.description,
        confidence: llmResult.confidence,
        reasoning: llmResult.reasoning,
      };
    } catch (error) {
      return {
        clusterId: cluster.id,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get node summaries for a list of node IDs
   */
  private getNodeSummaries(nodeIds: string[]): NodeSummaryRow[] {
    if (nodeIds.length === 0) {
      return [];
    }

    const placeholders = nodeIds.map(() => "?").join(",");
    const rows = this.db
      .prepare(
        `SELECT 
          n.id,
          fts.summary,
          n.type,
          n.project,
          n.outcome
        FROM nodes n
        LEFT JOIN nodes_fts fts ON fts.node_id = n.id
        WHERE n.id IN (${placeholders})`
      )
      .all(...nodeIds) as NodeSummaryRow[];

    return rows;
  }

  /**
   * Build the prompt for cluster analysis
   */
  private buildClusterAnalysisPrompt(
    nodes: NodeSummaryRow[],
    cluster: Cluster
  ): string {
    const parts: string[] = [
      "Analyze the following cluster of related sessions and identify the pattern.",
      "",
      `## Cluster Metadata`,
      `- **Node count**: ${cluster.nodeCount}`,
    ];

    if (cluster.relatedModel) {
      parts.push(`- **Related model**: ${cluster.relatedModel}`);
    }

    if (cluster.signalType) {
      parts.push(`- **Signal type**: ${cluster.signalType}`);
    }

    parts.push("", "## Representative Sessions", "");

    for (const node of nodes) {
      parts.push(`### Session ${node.id}`);
      parts.push(`- **Type**: ${node.type ?? "unknown"}`);
      parts.push(`- **Project**: ${node.project ?? "unknown"}`);
      parts.push(`- **Outcome**: ${node.outcome ?? "unknown"}`);
      parts.push(`- **Summary**: ${node.summary ?? "No summary available"}`);
      parts.push("");
    }

    parts.push("## Instructions");
    parts.push(
      "Identify what these sessions have in common and name the pattern."
    );
    parts.push("Return your response as a JSON object:");
    parts.push("```json");
    parts.push("{");
    parts.push('  "name": "Short Pattern Name",');
    parts.push(
      '  "description": "One to two sentences explaining the pattern.",'
    );
    parts.push('  "confidence": "high" | "medium" | "low",');
    parts.push(
      '  "reasoning": "Brief explanation of how you identified this pattern"'
    );
    parts.push("}");
    parts.push("```");

    return parts.join("\n");
  }

  /**
   * Invoke the pi agent to analyze a cluster
   */
  private async invokeClusterAnalysisAgent(
    prompt: string,
    config: ClusterAnalysisConfig
  ): Promise<{
    success: boolean;
    name?: string;
    description?: string;
    confidence?: "high" | "medium" | "low";
    reasoning?: string;
    error?: string;
  }> {
    // Determine prompt file path
    const defaultPromptFile = path.join(
      os.homedir(),
      ".pi-brain",
      "prompts",
      "cluster-analyzer.md"
    );
    const promptFile = config.promptFile ?? defaultPromptFile;

    // Check if prompt file exists
    // Only fall back to project prompts dir if using default path (not explicit config)
    let actualPromptFile = promptFile;
    try {
      await fs.access(promptFile);
    } catch {
      // If explicit path was provided, don't fall back
      if (config.promptFile) {
        return {
          success: false,
          error: `Cluster analyzer prompt file not found: ${promptFile}`,
        };
      }

      // Try project prompts dir as fallback
      const projectPromptFile = path.join(
        process.cwd(),
        "prompts",
        "cluster-analyzer.md"
      );
      try {
        await fs.access(projectPromptFile);
        actualPromptFile = projectPromptFile;
      } catch {
        return {
          success: false,
          error: `Cluster analyzer prompt file not found: ${promptFile}`,
        };
      }
    }

    const timeoutMinutes = config.timeoutMinutes ?? 5;

    // Build pi arguments
    const args = [
      "--provider",
      config.provider,
      "--model",
      config.model,
      "--system-prompt",
      actualPromptFile,
      "--no-session",
      "--mode",
      "json",
      "-p",
      prompt,
    ];

    this.logger.debug?.(`Invoking cluster analysis agent`);

    // Spawn the process
    const spawnResult = await this.spawnPiProcess(args, timeoutMinutes);

    if (spawnResult.spawnError) {
      return {
        success: false,
        error: `Failed to spawn pi: ${spawnResult.spawnError}`,
      };
    }

    if (spawnResult.timedOut) {
      return {
        success: false,
        error: "Cluster analysis timed out",
      };
    }

    if (spawnResult.exitCode !== 0) {
      return {
        success: false,
        error: `Pi exited with code ${spawnResult.exitCode}`,
      };
    }

    // Parse the output
    return this.parseClusterAnalysisOutput(spawnResult.stdout);
  }

  /**
   * Spawn a pi process and wait for completion
   */
  private async spawnPiProcess(
    args: string[],
    timeoutMinutes: number
  ): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number | null;
    timedOut: boolean;
    spawnError?: string;
  }> {
    return new Promise((resolve) => {
      const timeoutMs = timeoutMinutes * 60 * 1000;
      let stdout = "";
      let stderr = "";
      let resolved = false;

      const complete = (result: {
        stdout: string;
        stderr: string;
        exitCode: number | null;
        timedOut: boolean;
        spawnError?: string;
      }) => {
        if (!resolved) {
          resolved = true;
          resolve(result);
        }
      };

      const proc = spawn("pi", args, {
        stdio: ["ignore", "pipe", "pipe"],
      });

      const timeout = setTimeout(() => {
        proc.kill("SIGTERM");
        this.logger.error(
          `Cluster analysis timed out after ${timeoutMinutes}m`
        );
        complete({
          stdout,
          stderr,
          exitCode: null,
          timedOut: true,
        });
      }, timeoutMs);

      proc.stdout.on("data", (data: Buffer) => {
        stdout += data.toString();
      });

      proc.stderr.on("data", (data: Buffer) => {
        stderr += data.toString();
      });

      proc.on("close", (code) => {
        clearTimeout(timeout);
        complete({
          stdout,
          stderr,
          exitCode: code,
          timedOut: false,
        });
      });

      proc.on("error", (err) => {
        clearTimeout(timeout);
        complete({
          stdout,
          stderr,
          exitCode: null,
          timedOut: false,
          spawnError: err.message,
        });
      });
    });
  }

  /**
   * Parse the LLM output for cluster analysis
   */
  private parseClusterAnalysisOutput(stdout: string): {
    success: boolean;
    name?: string;
    description?: string;
    confidence?: "high" | "medium" | "low";
    reasoning?: string;
    error?: string;
  } {
    // Pi JSON mode outputs newline-delimited JSON events
    const lines = stdout.trim().split("\n");
    const events: {
      type: string;
      messages?: { role: string; content: { type: string; text?: string }[] }[];
    }[] = [];

    for (const line of lines) {
      if (!line.trim()) {
        continue;
      }
      try {
        events.push(JSON.parse(line));
      } catch {
        // Skip non-JSON lines
      }
    }

    // Find the agent_end event
    const endEvent = events.find((e) => e.type === "agent_end");
    if (!endEvent?.messages) {
      return { success: false, error: "No agent_end event found" };
    }

    // Find the assistant message
    const assistantMsg = endEvent.messages.find((m) => m.role === "assistant");
    if (!assistantMsg) {
      return { success: false, error: "No assistant message found" };
    }

    // Extract text content
    const textContent = assistantMsg.content
      .filter((b) => b.type === "text" && b.text)
      .map((b) => b.text)
      .join("\n");

    // Try to extract JSON from the response
    const jsonMatch =
      textContent.match(/```json\n([\s\S]*?)\n```/) ||
      textContent.match(/\{[\s\S]*"name"[\s\S]*"description"[\s\S]*\}/);

    if (!jsonMatch) {
      return { success: false, error: "No JSON found in response" };
    }

    try {
      const json = JSON.parse(jsonMatch[1] || jsonMatch[0]);

      if (!json.name || !json.description) {
        return {
          success: false,
          error: "Missing name or description in response",
        };
      }

      return {
        success: true,
        name: json.name,
        description: json.description,
        confidence: json.confidence,
        reasoning: json.reasoning,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to parse JSON: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}

// =============================================================================
// Helpers
// =============================================================================

function generateId(): string {
  return randomBytes(8).toString("hex");
}

function serializeEmbedding(embedding: number[]): Buffer {
  const buffer = Buffer.alloc(embedding.length * 4);
  for (let i = 0; i < embedding.length; i++) {
    buffer.writeFloatLE(embedding[i], i * 4);
  }
  return buffer;
}

function deserializeEmbedding(buffer: Buffer): number[] {
  const embedding: number[] = [];
  for (let i = 0; i < buffer.length; i += 4) {
    embedding.push(buffer.readFloatLE(i));
  }
  return embedding;
}

function countNoise(labels: number[]): number {
  return labels.filter((l) => l === -1).length;
}
