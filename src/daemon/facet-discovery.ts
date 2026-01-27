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
 * 4. (Task 11.6) LLM analyzes clusters to generate names/descriptions
 */

import type Database from "better-sqlite3";

import { randomBytes } from "node:crypto";

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
          embedding.push((seed / 0x7f_ff_ff_ff) * 2 - 1);
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
