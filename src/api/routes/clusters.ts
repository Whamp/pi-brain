/**
 * Clusters API Routes
 *
 * Endpoints for cluster management from facet discovery pipeline.
 */

import type { Database } from "better-sqlite3";
import type { FastifyInstance } from "fastify";

import type { Cluster, ClusterNode, ClusterStatus } from "../../types/index.js";

// =============================================================================
// Types
// =============================================================================

interface ClusterNodeWithDetails extends ClusterNode {
  summary?: string;
  type?: string;
  project?: string;
  outcome?: string;
}

interface ClusterWithNodes extends Cluster {
  nodes?: ClusterNodeWithDetails[];
}

/** Database row shape for cluster queries */
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

/** Database row shape for cluster node queries */
interface ClusterNodeRow {
  cluster_id: string;
  node_id: string;
  distance: number | null;
  is_representative: number;
  summary: string | null;
  type: string | null;
  project: string | null;
  outcome: string | null;
}

// =============================================================================
// Helpers
// =============================================================================

/** Map a database row to a ClusterWithNodes object */
function mapClusterRow(row: ClusterRow): ClusterWithNodes {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    nodeCount: row.node_count,
    algorithm: row.algorithm,
    minClusterSize: row.min_cluster_size ?? undefined,
    status: row.status as ClusterStatus,
    relatedModel: row.related_model ?? undefined,
    signalType: row.signal_type as "friction" | "delight" | null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Map a node row to ClusterNodeWithDetails */
function mapNodeRow(nr: ClusterNodeRow): ClusterNodeWithDetails {
  return {
    clusterId: nr.cluster_id,
    nodeId: nr.node_id,
    distance: nr.distance ?? undefined,
    isRepresentative: nr.is_representative === 1,
    summary: nr.summary ?? undefined,
    type: nr.type ?? undefined,
    project: nr.project ?? undefined,
    outcome: nr.outcome ?? undefined,
  };
}

/**
 * Batch fetch representative nodes for multiple clusters.
 * Returns a map of clusterId -> nodes array.
 */
function fetchRepresentativeNodes(
  db: Database,
  clusterIds: string[],
  limitPerCluster: number
): Map<string, ClusterNodeWithDetails[]> {
  if (clusterIds.length === 0) {
    return new Map();
  }

  // Build placeholders for IN clause
  const placeholders = clusterIds.map(() => "?").join(", ");

  // Use window function to limit per cluster
  const sql = `
    WITH ranked AS (
      SELECT cn.cluster_id, cn.node_id, cn.distance, cn.is_representative,
             fts.summary, n.type, n.project, n.outcome,
             ROW_NUMBER() OVER (PARTITION BY cn.cluster_id ORDER BY cn.distance ASC) as rn
      FROM cluster_nodes cn
      LEFT JOIN nodes n ON n.id = cn.node_id
      LEFT JOIN nodes_fts fts ON fts.node_id = cn.node_id
      WHERE cn.cluster_id IN (${placeholders}) AND cn.is_representative = 1
    )
    SELECT cluster_id, node_id, distance, is_representative, summary, type, project, outcome
    FROM ranked
    WHERE rn <= ?
    ORDER BY cluster_id, distance ASC
  `;

  const rows = db
    .prepare(sql)
    .all(...clusterIds, limitPerCluster) as ClusterNodeRow[];

  // Group by cluster_id
  const result = new Map<string, ClusterNodeWithDetails[]>();
  for (const id of clusterIds) {
    result.set(id, []);
  }
  for (const row of rows) {
    result.get(row.cluster_id)?.push(mapNodeRow(row));
  }

  return result;
}

// =============================================================================
// Query Builder Helpers
// =============================================================================

interface ClusterFilterParams {
  status?: ClusterStatus;
  signalType?: "friction" | "delight" | null;
}

/**
 * Build WHERE clause fragments for cluster filters
 */
function buildClusterWhereClause(filters: ClusterFilterParams): {
  sql: string;
  params: unknown[];
} {
  let sql = "";
  const params: unknown[] = [];

  if (filters.status) {
    sql += " AND status = ?";
    params.push(filters.status);
  }

  if (filters.signalType !== undefined) {
    if (filters.signalType === null) {
      sql += " AND signal_type IS NULL";
    } else {
      sql += " AND signal_type = ?";
      params.push(filters.signalType);
    }
  }

  return { sql, params };
}

/**
 * Attach representative nodes to clusters
 */
function attachRepresentativeNodes(
  db: Database,
  clusters: ClusterWithNodes[],
  limitPerCluster: number
): void {
  if (clusters.length === 0) {
    return;
  }
  const clusterIds = clusters.map((c) => c.id);
  const nodesMap = fetchRepresentativeNodes(db, clusterIds, limitPerCluster);
  for (const cluster of clusters) {
    cluster.nodes = nodesMap.get(cluster.id) ?? [];
  }
}

// =============================================================================
// Route Registration
// =============================================================================

export async function clustersRoutes(app: FastifyInstance): Promise<void> {
  const { db } = app.ctx;

  // ---------------------------------------------------------------------------
  // GET /clusters - List clusters
  // ---------------------------------------------------------------------------
  app.get<{
    Querystring: {
      status?: ClusterStatus;
      signalType?: "friction" | "delight" | null;
      limit?: number;
      offset?: number;
      includeNodes?: boolean;
    };
  }>("/clusters", async (request) => {
    const {
      status,
      signalType,
      limit = 50,
      offset = 0,
      includeNodes = false,
    } = request.query;

    // Build query with shared WHERE clause helper
    const whereClause = buildClusterWhereClause({ status, signalType });

    const sql = `SELECT * FROM clusters WHERE 1=1${whereClause.sql} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    const params = [...whereClause.params, limit, offset];
    const rows = db.prepare(sql).all(...params) as ClusterRow[];

    // Get total count using same WHERE clause
    const countSql = `SELECT COUNT(*) as total FROM clusters WHERE 1=1${whereClause.sql}`;
    const totalRow = db.prepare(countSql).get(...whereClause.params) as {
      total: number;
    };

    // Map to Cluster type
    const clusters: ClusterWithNodes[] = rows.map(mapClusterRow);

    // Optionally include representative nodes (batched query)
    if (includeNodes) {
      attachRepresentativeNodes(db, clusters, 5);
    }

    return {
      status: "success" as const,
      data: {
        clusters,
        total: totalRow.total,
        limit,
        offset,
      },
    };
  });

  // ---------------------------------------------------------------------------
  // GET /clusters/feed - Get clusters for news feed (named, pending review)
  // NOTE: Must be registered BEFORE /clusters/:id to avoid route shadowing
  // ---------------------------------------------------------------------------
  app.get<{
    Querystring: {
      limit?: number;
    };
  }>("/clusters/feed", async (request) => {
    const { limit = 10 } = request.query;
    const { db } = app.ctx;

    // Get named clusters that are still pending (for user to confirm/dismiss)
    const sql = `
      SELECT * FROM clusters
      WHERE name IS NOT NULL
        AND status = 'pending'
      ORDER BY created_at DESC
      LIMIT ?
    `;

    const rows = db.prepare(sql).all(limit) as ClusterRow[];

    // Batch fetch representative nodes for all clusters
    const clusterIds = rows.map((r) => r.id);
    const nodesMap = fetchRepresentativeNodes(db, clusterIds, 3);

    const clusters: ClusterWithNodes[] = rows.map((row) => ({
      ...mapClusterRow(row),
      nodes: nodesMap.get(row.id) ?? [],
    }));

    return {
      status: "success" as const,
      data: {
        clusters,
        count: clusters.length,
      },
    };
  });

  // ---------------------------------------------------------------------------
  // GET /clusters/:id - Get a single cluster with its nodes
  // ---------------------------------------------------------------------------
  app.get<{
    Params: { id: string };
  }>("/clusters/:id", async (request, reply) => {
    const { id } = request.params;
    const { db } = app.ctx;

    const row = db.prepare("SELECT * FROM clusters WHERE id = ?").get(id) as
      | ClusterRow
      | undefined;

    if (!row) {
      return reply.status(404).send({
        status: "error" as const,
        error: {
          code: "NOT_FOUND",
          message: `Cluster ${id} not found`,
        },
      });
    }

    // Get all nodes for this cluster (not just representative)
    const nodesSql = `
      SELECT cn.cluster_id, cn.node_id, cn.distance, cn.is_representative,
             fts.summary, n.type, n.project, n.outcome
      FROM cluster_nodes cn
      LEFT JOIN nodes n ON n.id = cn.node_id
      LEFT JOIN nodes_fts fts ON fts.node_id = cn.node_id
      WHERE cn.cluster_id = ?
      ORDER BY cn.distance ASC
    `;

    const nodeRows = db.prepare(nodesSql).all(id) as ClusterNodeRow[];

    const cluster: ClusterWithNodes = {
      ...mapClusterRow(row),
      nodes: nodeRows.map(mapNodeRow),
    };

    return {
      status: "success" as const,
      data: { cluster },
    };
  });

  // ---------------------------------------------------------------------------
  // POST /clusters/:id/status - Update cluster status (confirm/dismiss)
  // ---------------------------------------------------------------------------
  app.post<{
    Params: { id: string };
    Body: { status: "confirmed" | "dismissed" };
  }>("/clusters/:id/status", async (request, reply) => {
    const { id } = request.params;
    const { status: newStatus } = request.body;

    if (!newStatus || !["confirmed", "dismissed"].includes(newStatus)) {
      return reply.status(400).send({
        status: "error" as const,
        error: {
          code: "BAD_REQUEST",
          message: "Status must be 'confirmed' or 'dismissed'",
        },
      });
    }

    const { db } = app.ctx;

    // Check cluster exists
    const exists = db.prepare("SELECT id FROM clusters WHERE id = ?").get(id);

    if (!exists) {
      return reply.status(404).send({
        status: "error" as const,
        error: {
          code: "NOT_FOUND",
          message: `Cluster ${id} not found`,
        },
      });
    }

    // Update status
    const now = new Date().toISOString();
    const statusField =
      newStatus === "confirmed" ? "confirmed_at" : "dismissed_at";

    db.prepare(
      `UPDATE clusters SET status = ?, ${statusField} = ?, updated_at = ? WHERE id = ?`
    ).run(newStatus, now, now, id);

    return {
      status: "success" as const,
      data: {
        id,
        status: newStatus,
        updatedAt: now,
      },
    };
  });
}
