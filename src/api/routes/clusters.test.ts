/**
 * Tests for Clusters API routes
 */

import type Database from "better-sqlite3";
import type { FastifyInstance } from "fastify";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { migrate } from "../../storage/database.js";
import { createServer } from "../server.js";

describe("clusters api routes", () => {
  let app: FastifyInstance;
  let db: Database.Database;

  beforeEach(async () => {
    const sqlite3Module = await import("better-sqlite3");
    const BetterSqlite3 = sqlite3Module.default;
    db = new BetterSqlite3(":memory:");
    migrate(db);

    // Insert test data for clusters
    const now = new Date().toISOString();

    // Create a named pending cluster
    db.prepare(
      `
      INSERT INTO clusters (id, name, description, node_count, algorithm, status, signal_type, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      "cluster-1",
      "Auth Failures",
      "Sessions with authentication issues",
      5,
      "hdbscan",
      "pending",
      "friction",
      now,
      now
    );

    // Create an unnamed pending cluster
    db.prepare(
      `
      INSERT INTO clusters (id, name, description, node_count, algorithm, status, signal_type, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run("cluster-2", null, null, 3, "kmeans", "pending", null, now, now);

    // Create a confirmed cluster
    db.prepare(
      `
      INSERT INTO clusters (id, name, description, node_count, algorithm, status, signal_type, created_at, updated_at, confirmed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      "cluster-3",
      "Delight Pattern",
      "One-shot successes",
      8,
      "hdbscan",
      "confirmed",
      "delight",
      now,
      now,
      now
    );

    // Create a node for representative nodes test
    db.prepare(
      `
      INSERT INTO nodes (id, version, session_file, type, project, outcome, timestamp, analyzed_at, analyzer_version, data_file)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      "node-1",
      1,
      "/sessions/test.jsonl",
      "coding",
      "/home/test/project",
      "success",
      now,
      now,
      "v1",
      "/data/node-1.json"
    );

    // Add FTS entry with summary
    db.prepare(
      `
      INSERT INTO nodes_fts (node_id, summary, decisions, lessons, tags, topics)
      VALUES (?, ?, ?, ?, ?, ?)
    `
    ).run("node-1", "Implemented auth", "", "", "auth", "");

    db.prepare(
      `
      INSERT INTO cluster_nodes (cluster_id, node_id, distance, is_representative)
      VALUES (?, ?, ?, ?)
    `
    ).run("cluster-1", "node-1", 0.1, 1);

    app = await createServer(db, {
      port: 0,
      host: "127.0.0.1",
      corsOrigins: [],
      authEnabled: false,
    });
  });

  afterEach(async () => {
    await app?.close();
    db?.close();
  });

  describe("get /clusters", () => {
    it("should list all clusters", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/clusters",
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.status).toBe("success");
      expect(body.data.clusters).toHaveLength(3);
      expect(body.data.total).toBe(3);
    });

    it("should filter by status", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/clusters?status=pending",
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.clusters).toHaveLength(2);
      for (const cluster of body.data.clusters) {
        expect(cluster.status).toBe("pending");
      }
    });

    it("should include nodes when requested", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/clusters?includeNodes=true",
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      const cluster1 = body.data.clusters.find(
        (c: { id: string }) => c.id === "cluster-1"
      );
      expect(cluster1.nodes).toBeDefined();
      expect(cluster1.nodes.length).toBeGreaterThan(0);
    });
  });

  describe("get /clusters/:id", () => {
    it("should get a single cluster with nodes", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/clusters/cluster-1",
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.status).toBe("success");
      expect(body.data.cluster.id).toBe("cluster-1");
      expect(body.data.cluster.name).toBe("Auth Failures");
      expect(body.data.cluster.nodes).toBeDefined();
      expect(body.data.cluster.nodes.length).toBeGreaterThan(0);
    });

    it("should return 404 for non-existent cluster", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/clusters/non-existent",
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("post /clusters/:id/status", () => {
    it("should confirm a cluster", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/clusters/cluster-1/status",
        payload: { status: "confirmed" },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.status).toBe("confirmed");

      // Verify in database
      const row = db
        .prepare("SELECT status FROM clusters WHERE id = ?")
        .get("cluster-1") as { status: string };
      expect(row.status).toBe("confirmed");
    });

    it("should dismiss a cluster", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/clusters/cluster-1/status",
        payload: { status: "dismissed" },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.status).toBe("dismissed");
    });

    it("should return 400 for invalid status", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/clusters/cluster-1/status",
        payload: { status: "invalid" },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 404 for non-existent cluster", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/clusters/non-existent/status",
        payload: { status: "confirmed" },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("get /clusters/feed", () => {
    it("should return named pending clusters for news feed", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/clusters/feed",
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.status).toBe("success");
      // Only cluster-1 is named and pending
      expect(body.data.clusters).toHaveLength(1);
      expect(body.data.clusters[0].name).toBe("Auth Failures");
      expect(body.data.clusters[0].nodes).toBeDefined();
    });

    it("should respect limit parameter", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/clusters/feed?limit=1",
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.clusters.length).toBeLessThanOrEqual(1);
    });
  });
});
