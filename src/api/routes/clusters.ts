/**
 * Clusters API Routes
 *
 * Endpoints for cluster management from facet discovery pipeline.
 */

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

    // Build query
    let sql = "SELECT * FROM clusters WHERE 1=1";
    const params: unknown[] = [];

    if (status) {
      sql += " AND status = ?";
      params.push(status);
    }

    if (signalType !== undefined) {
      if (signalType === null) {
        sql += " AND signal_type IS NULL";
      } else {
        sql += " AND signal_type = ?";
        params.push(signalType);
      }
    }

    sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

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

    const rows = db.prepare(sql).all(...params) as ClusterRow[];

    // Get total count
    let countSql = "SELECT COUNT(*) as total FROM clusters WHERE 1=1";
    const countParams: unknown[] = [];

    if (status) {
      countSql += " AND status = ?";
      countParams.push(status);
    }

    if (signalType !== undefined) {
      if (signalType === null) {
        countSql += " AND signal_type IS NULL";
      } else {
        countSql += " AND signal_type = ?";
        countParams.push(signalType);
      }
    }

    const totalRow = db.prepare(countSql).get(...countParams) as {
      total: number;
    };

    // Map to Cluster type
    const clusters: ClusterWithNodes[] = rows.map((row) => ({
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
    }));

    // Optionally include representative nodes
    if (includeNodes) {
      for (const cluster of clusters) {
        const nodesSql = `
          SELECT cn.cluster_id, cn.node_id, cn.distance, cn.is_representative,
                 fts.summary, n.type, n.project, n.outcome
          FROM cluster_nodes cn
          LEFT JOIN nodes n ON n.id = cn.node_id
          LEFT JOIN nodes_fts fts ON fts.node_id = cn.node_id
          WHERE cn.cluster_id = ? AND cn.is_representative = 1
          ORDER BY cn.distance ASC
          LIMIT 5
        `;

        const nodeRows = db.prepare(nodesSql).all(cluster.id) as {
          cluster_id: string;
          node_id: string;
          distance: number | null;
          is_representative: number;
          summary: string | null;
          type: string | null;
          project: string | null;
          outcome: string | null;
        }[];

        cluster.nodes = nodeRows.map((nr) => ({
          clusterId: nr.cluster_id,
          nodeId: nr.node_id,
          distance: nr.distance ?? undefined,
          isRepresentative: nr.is_representative === 1,
          summary: nr.summary ?? undefined,
          type: nr.type ?? undefined,
          project: nr.project ?? undefined,
          outcome: nr.outcome ?? undefined,
        }));
      }
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
  // GET /clusters/:id - Get a single cluster with its nodes
  // ---------------------------------------------------------------------------
  app.get<{
    Params: { id: string };
  }>("/clusters/:id", async (request, reply) => {
    const { id } = request.params;
    const { db } = app.ctx;

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

    // Get nodes for this cluster
    const nodesSql = `
      SELECT cn.cluster_id, cn.node_id, cn.distance, cn.is_representative,
             fts.summary, n.type, n.project, n.outcome
      FROM cluster_nodes cn
      LEFT JOIN nodes n ON n.id = cn.node_id
      LEFT JOIN nodes_fts fts ON fts.node_id = cn.node_id
      WHERE cn.cluster_id = ?
      ORDER BY cn.distance ASC
    `;

    const nodeRows = db.prepare(nodesSql).all(id) as {
      cluster_id: string;
      node_id: string;
      distance: number | null;
      is_representative: number;
      summary: string | null;
      type: string | null;
      project: string | null;
      outcome: string | null;
    }[];

    const cluster: ClusterWithNodes = {
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
      nodes: nodeRows.map((nr) => ({
        clusterId: nr.cluster_id,
        nodeId: nr.node_id,
        distance: nr.distance ?? undefined,
        isRepresentative: nr.is_representative === 1,
        summary: nr.summary ?? undefined,
        type: nr.type ?? undefined,
        project: nr.project ?? undefined,
        outcome: nr.outcome ?? undefined,
      })),
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

  // ---------------------------------------------------------------------------
  // GET /clusters/feed - Get clusters for news feed (named, pending review)
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

    const rows = db.prepare(sql).all(limit) as ClusterRow[];

    // Get representative nodes for each cluster
    const clusters: ClusterWithNodes[] = [];

    for (const row of rows) {
      const nodesSql = `
        SELECT cn.cluster_id, cn.node_id, cn.distance, cn.is_representative,
               fts.summary, n.type, n.project, n.outcome
        FROM cluster_nodes cn
        LEFT JOIN nodes n ON n.id = cn.node_id
        LEFT JOIN nodes_fts fts ON fts.node_id = cn.node_id
        WHERE cn.cluster_id = ? AND cn.is_representative = 1
        ORDER BY cn.distance ASC
        LIMIT 3
      `;

      const nodeRows = db.prepare(nodesSql).all(row.id) as {
        cluster_id: string;
        node_id: string;
        distance: number | null;
        is_representative: number;
        summary: string | null;
        type: string | null;
        project: string | null;
        outcome: string | null;
      }[];

      clusters.push({
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
        nodes: nodeRows.map((nr) => ({
          clusterId: nr.cluster_id,
          nodeId: nr.node_id,
          distance: nr.distance ?? undefined,
          isRepresentative: nr.is_representative === 1,
          summary: nr.summary ?? undefined,
          type: nr.type ?? undefined,
          project: nr.project ?? undefined,
          outcome: nr.outcome ?? undefined,
        })),
      });
    }

    return {
      status: "success" as const,
      data: {
        clusters,
        count: clusters.length,
      },
    };
  });
}
