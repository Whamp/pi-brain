/**
 * Tests for query API routes
 */

import type { FastifyInstance } from "fastify";

import BetterSqlite3 from "better-sqlite3";
import { describe, it, expect, beforeAll, afterAll } from "vitest";

import { migrate } from "../../storage/database.js";
import { createServer } from "../server.js";

describe("query routes", () => {
  let app: FastifyInstance;
  let db: BetterSqlite3.Database;

  beforeAll(async () => {
    db = new BetterSqlite3(":memory:");
    migrate(db);

    app = await createServer(db, {
      port: 0,
      host: "127.0.0.1",
      corsOrigins: [],
    });
  });

  afterAll(async () => {
    await app.close();
    db.close();
  });

  describe("post /api/v1/query", () => {
    it("should reject empty query", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/query",
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("error");
      expect(body.error.code).toBe("BAD_REQUEST");
    });

    it("should reject whitespace-only query", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/query",
        payload: { query: "   " },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("error");
    });

    // Note: Full integration test requires pi to be available
    // These tests verify the API structure and validation
  });

  describe("get /api/v1/query/health", () => {
    it("should return availability status", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/query/health",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("success");
      expect(body.data).toHaveProperty("available");
      expect(body.data).toHaveProperty("message");
    });
  });
});
