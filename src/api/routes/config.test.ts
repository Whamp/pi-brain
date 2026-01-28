/**
 * Tests for Configuration API routes
 */

import type Database from "better-sqlite3";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { migrate } from "../../storage/database.js";
import { createServer } from "../server.js";

describe("config api routes", () => {
  let app: Awaited<ReturnType<typeof createServer>>;
  let db: Database.Database;

  beforeEach(async () => {
    // Create in-memory database
    const sqlite3Module = await import("better-sqlite3");
    const BetterSqlite3 = sqlite3Module.default;
    db = new BetterSqlite3(":memory:");
    migrate(db);

    // Create test server (will use default config path)
    app = await createServer(db, {
      port: 8765,
      host: "127.0.0.1",
      corsOrigins: ["http://localhost:5173"],
    });
  });

  afterEach(async () => {
    await app.close();
  });

  describe("gET /config/daemon", () => {
    it("returns daemon configuration with all fields", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/config/daemon",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("success");
      expect(body.data).toBeDefined();
      expect(body.data.provider).toBeDefined();
      expect(body.data.model).toBeDefined();
      expect(body.data.idleTimeoutMinutes).toBeDefined();
      expect(body.data.parallelWorkers).toBeDefined();
      expect(body.data.maxRetries).toBeDefined();
      expect(body.data.retryDelaySeconds).toBeDefined();
      expect(body.data.defaults).toBeDefined();
    });

    it("returns configured values for retry settings", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/config/daemon",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.maxRetries).toBeGreaterThan(-1);
      expect(body.data.retryDelaySeconds).toBeGreaterThan(0);
    });
  });

  describe("pUT /config/daemon", () => {
    it("requires at least one field", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("error");
      expect(body.error.message).toContain("At least one configuration field");
    });

    it("validates maxRetries is non-negative", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { maxRetries: -1 },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.message).toContain("maxRetries");
      expect(body.error.message).toContain("between 0 and 10");
    });

    it("validates maxRetries maximum", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { maxRetries: 11 },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.message).toContain("maxRetries");
    });

    it("allows maxRetries of 0", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { maxRetries: 0 },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("success");
      expect(body.data.maxRetries).toBe(0);
    });

    it("validates retryDelaySeconds minimum", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { retryDelaySeconds: 0 },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.message).toContain("retryDelaySeconds");
      expect(body.error.message).toContain("between 1 and 3600");
    });

    it("validates retryDelaySeconds maximum", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { retryDelaySeconds: 3601 },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.message).toContain("retryDelaySeconds");
    });

    it("accepts valid retryDelaySeconds", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { retryDelaySeconds: 120 },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("success");
      expect(body.data.retryDelaySeconds).toBe(120);
    });

    it("validates retryDelaySeconds must be integer", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { retryDelaySeconds: 1.5 },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.message).toContain("retryDelaySeconds");
      expect(body.error.message).toContain("integer");
    });

    it("updates both maxRetries and retryDelaySeconds together", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: {
          maxRetries: 5,
          retryDelaySeconds: 300,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("success");
      expect(body.data.maxRetries).toBe(5);
      expect(body.data.retryDelaySeconds).toBe(300);
    });

    it("includes message about restart required", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { maxRetries: 5 },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.message).toContain("Restart daemon");
    });
  });

  describe("gET /config/providers", () => {
    it("returns list of providers", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/config/providers",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("success");
      expect(body.data.providers).toBeInstanceOf(Array);
      expect(body.data.providers.length).toBeGreaterThan(0);

      // Check provider structure
      const [provider] = body.data.providers;
      expect(provider.id).toBeDefined();
      expect(provider.name).toBeDefined();
      expect(provider.models).toBeInstanceOf(Array);
    });
  });
});
