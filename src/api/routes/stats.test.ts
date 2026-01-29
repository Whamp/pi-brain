/**
 * Tests for Stats API routes
 */

import type Database from "better-sqlite3";
import type { FastifyInstance } from "fastify";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { migrate } from "../../storage/database.js";
import { createServer } from "../server.js";

describe("stats api routes", () => {
  let app: FastifyInstance;
  let db: Database.Database;

  beforeEach(async () => {
    const sqlite3Module = await import("better-sqlite3");
    const BetterSqlite3 = sqlite3Module.default;
    db = new BetterSqlite3(":memory:");
    migrate(db);

    // Insert test nodes with various timestamps and metrics
    const now = new Date();
    const oneDayAgo = new Date(now);
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const twoDaysAgo = new Date(now);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    // Insert test nodes
    const insertNode = db.prepare(`
      INSERT INTO nodes (
        id, version, session_file, segment_start, segment_end, computer,
        type, project, is_new_project, had_clear_goal, outcome,
        tokens_used, cost, duration_minutes,
        timestamp, analyzed_at, analyzer_version, data_file
      ) VALUES (
        ?, 1, 'session1.json', 'start1', 'end1', 'test-computer',
        'coding', 'test-project', 0, 1, 'success',
        ?, ?, 30,
        ?, ?, 'v1.0', '/test/path.json'
      )
    `);

    // Insert nodes for different dates
    insertNode.run(
      "node-1",
      1000,
      0.01,
      twoDaysAgo.toISOString(),
      twoDaysAgo.toISOString()
    );
    insertNode.run(
      "node-2",
      2000,
      0.02,
      oneDayAgo.toISOString(),
      oneDayAgo.toISOString()
    );
    insertNode.run("node-3", 3000, 0.03, now.toISOString(), now.toISOString());

    // Insert edges for edge counting
    db.prepare(
      "INSERT INTO edges (id, source_node_id, target_node_id, type) VALUES (?, ?, ?, ?)"
    ).run("edge-1", "node-1", "node-2", "continuation");
    db.prepare(
      "INSERT INTO edges (id, source_node_id, target_node_id, type) VALUES (?, ?, ?, ?)"
    ).run("edge-2", "node-2", "node-3", "continuation");

    app = await createServer(db, {
      port: 0,
      host: "localhost",
      corsOrigins: ["http://localhost:5173"],
    });
  });

  afterEach(async () => {
    await app.close();
    db.close();
  });

  describe("gET /stats", () => {
    it("should return dashboard statistics", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/stats",
      });

      expect(response.statusCode).toBe(200);
      const json = JSON.parse(response.body);
      expect(json.status).toBe("success");
      expect(json.data).toBeDefined();

      // Check totals
      expect(json.data.totals.nodes).toBe(3);
      expect(json.data.totals.edges).toBe(2);

      // Check outcomes
      expect(json.data.outcomes.success).toBe(3);

      // Check usage totals from recent nodes
      expect(json.data.usage.totalTokens).toBe(6000);
      // Use toBeCloseTo for floating point comparison
      expect(json.data.usage.totalCost).toBeCloseTo(0.06, 10);
    });

    it("should return top projects", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/stats",
      });

      const json = JSON.parse(response.body);
      expect(json.data.topProjects).toBeDefined();
      expect(json.data.topProjects.length).toBeGreaterThan(0);
      expect(json.data.topProjects[0].project).toBe("test-project");
      expect(json.data.topProjects[0].nodeCount).toBe(3);
    });
  });

  describe("gET /stats/timeseries", () => {
    it("should return time-series data for tokens and costs", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/stats/timeseries?days=7",
      });

      expect(response.statusCode).toBe(200);
      const json = JSON.parse(response.body);
      expect(json.status).toBe("success");
      expect(json.data).toBeDefined();
      expect(json.data.data).toBeDefined();
      expect(Array.isArray(json.data.data)).toBeTruthy();
      expect(json.data.data.length).toBeGreaterThan(0);

      // Verify data structure
      // oxlint-disable-next-line prefer-destructuring
      const dataPoint = json.data.data[0];
      expect(dataPoint).toHaveProperty("date");
      expect(dataPoint).toHaveProperty("tokens");
      expect(dataPoint).toHaveProperty("cost");
      expect(dataPoint).toHaveProperty("nodes");

      // Check that values are numbers
      expect(typeof dataPoint.tokens).toBe("number");
      expect(typeof dataPoint.cost).toBe("number");
      expect(typeof dataPoint.nodes).toBe("number");
    });

    it("should return non-zero totals in summary", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/stats/timeseries?days=7",
      });

      const json = JSON.parse(response.body);
      expect(json.data.summary).toBeDefined();
      expect(json.data.summary.totalTokens).toBeGreaterThan(0);
      expect(json.data.summary.totalCost).toBeGreaterThan(0);
      expect(json.data.summary.totalNodes).toBeGreaterThan(0);

      // Verify totals match sum of data
      const totalTokensFromData = json.data.data.reduce(
        (sum: number, d: { tokens: number }) => sum + d.tokens,
        0
      );
      expect(json.data.summary.totalTokens).toBe(totalTokensFromData);
    });

    it("should handle custom day ranges", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/stats/timeseries?days=3",
      });

      expect(response.statusCode).toBe(200);
      const json = JSON.parse(response.body);
      // Returns days+1 data points (inclusive of start and end dates)
      // e.g., days=3 returns 4 data points: 3 days ago, 2 days ago, 1 day ago, today
      expect(json.data.data).toHaveLength(4);
    });

    it("should fill in missing dates with zeros", async () => {
      // Insert a node only for today
      const today = new Date().toISOString();
      db.prepare("UPDATE nodes SET timestamp = ? WHERE id = 'node-1'").run(
        today
      );
      db.prepare("UPDATE nodes SET timestamp = ? WHERE id = 'node-2'").run(
        today
      );
      db.prepare("UPDATE nodes SET timestamp = ? WHERE id = 'node-3'").run(
        today
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/stats/timeseries?days=3",
      });

      const json = JSON.parse(response.body);
      // All data should be on one day, others should be zero
      // days=3 returns 4 data points (inclusive), so 1 non-zero + 3 zero days
      const nonZeroDays = json.data.data.filter(
        (d: { tokens: number }) => d.tokens > 0
      );
      const zeroDays = json.data.data.filter(
        (d: { tokens: number }) => d.tokens === 0
      );

      expect(nonZeroDays).toHaveLength(1);
      expect(zeroDays).toHaveLength(3);
    });

    it("should return empty data for future date ranges", async () => {
      // Delete all nodes
      db.prepare("DELETE FROM nodes").run();

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/stats/timeseries?days=7",
      });

      expect(response.statusCode).toBe(200);
      const json = JSON.parse(response.body);
      // days=7 returns 8 data points (inclusive of start and end dates)
      expect(json.data.data).toHaveLength(8);
      expect(json.data.summary.totalTokens).toBe(0);
      expect(json.data.summary.totalCost).toBe(0);
      expect(json.data.summary.totalNodes).toBe(0);
    });
  });

  describe("gET /stats/tool-errors", () => {
    it("should return tool error statistics", async () => {
      // Insert test tool errors
      db.prepare(
        "INSERT INTO tool_errors (id, node_id, tool, error_type, context, model) VALUES (?, ?, ?, ?, ?, ?)"
      ).run(
        "error-1",
        "node-1",
        "read",
        "FILE_NOT_FOUND",
        "test context",
        "gpt-4"
      );
      db.prepare(
        "INSERT INTO tool_errors (id, node_id, tool, error_type, context, model) VALUES (?, ?, ?, ?, ?, ?)"
      ).run(
        "error-2",
        "node-2",
        "edit",
        "PARSE_ERROR",
        "test context",
        "claude-3"
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/stats/tool-errors",
      });

      expect(response.statusCode).toBe(200);
      const json = JSON.parse(response.body);
      expect(json.status).toBe("success");
      expect(json.data).toBeDefined();
      expect(json.data.byTool).toBeDefined();
      expect(json.data.byModel).toBeDefined();
      expect(Array.isArray(json.data.byTool)).toBeTruthy();
      expect(Array.isArray(json.data.byModel)).toBeTruthy();
    });

    it("should return empty arrays when no tool errors exist", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/stats/tool-errors",
      });

      const json = JSON.parse(response.body);
      expect(json.data.byTool).toStrictEqual([]);
      expect(json.data.byModel).toStrictEqual([]);
      expect(json.data.trends).toStrictEqual({
        thisWeek: 0,
        lastWeek: 0,
        change: 0,
      });
    });
  });
});
