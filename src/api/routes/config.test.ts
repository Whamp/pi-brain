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
      expect(body.data.analysisTimeoutMinutes).toBeDefined();
      expect(body.data.maxConcurrentAnalysis).toBeDefined();
      expect(body.data.maxQueueSize).toBeDefined();
      expect(body.data.backfillLimit).toBeDefined();
      expect(body.data.reanalysisLimit).toBeDefined();
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

    it("validates analysisTimeoutMinutes minimum", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { analysisTimeoutMinutes: 0 },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.message).toContain("analysisTimeoutMinutes");
      expect(body.error.message).toContain("between 1 and 120");
    });

    it("validates analysisTimeoutMinutes maximum", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { analysisTimeoutMinutes: 121 },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.message).toContain("analysisTimeoutMinutes");
    });

    it("accepts valid analysisTimeoutMinutes", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { analysisTimeoutMinutes: 60 },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("success");
      expect(body.data.analysisTimeoutMinutes).toBe(60);
    });

    it("validates analysisTimeoutMinutes must be integer", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { analysisTimeoutMinutes: 30.5 },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.message).toContain("analysisTimeoutMinutes");
      expect(body.error.message).toContain("integer");
    });

    it("validates maxConcurrentAnalysis minimum", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { maxConcurrentAnalysis: 0 },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.message).toContain("maxConcurrentAnalysis");
      expect(body.error.message).toContain("between 1 and 10");
    });

    it("validates maxConcurrentAnalysis maximum", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { maxConcurrentAnalysis: 11 },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.message).toContain("maxConcurrentAnalysis");
    });

    it("accepts valid maxConcurrentAnalysis", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { maxConcurrentAnalysis: 3 },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("success");
      expect(body.data.maxConcurrentAnalysis).toBe(3);
    });

    it("validates maxConcurrentAnalysis must be integer", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { maxConcurrentAnalysis: 2.5 },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.message).toContain("maxConcurrentAnalysis");
      expect(body.error.message).toContain("integer");
    });

    it("updates both analysisTimeoutMinutes and maxConcurrentAnalysis together", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: {
          analysisTimeoutMinutes: 45,
          maxConcurrentAnalysis: 2,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("success");
      expect(body.data.analysisTimeoutMinutes).toBe(45);
      expect(body.data.maxConcurrentAnalysis).toBe(2);
    });

    it("returns configured values for new fields on GET", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/config/daemon",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.analysisTimeoutMinutes).toBe(45); // Updated by previous test
      expect(body.data.maxConcurrentAnalysis).toBe(2); // Updated by previous test
    });

    // maxQueueSize tests
    it("validates maxQueueSize minimum", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { maxQueueSize: 9 },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.message).toContain("maxQueueSize");
      expect(body.error.message).toContain("between 10 and 10000");
    });

    it("validates maxQueueSize maximum", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { maxQueueSize: 10_001 },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.message).toContain("maxQueueSize");
    });

    it("accepts valid maxQueueSize", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { maxQueueSize: 5000 },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("success");
      expect(body.data.maxQueueSize).toBe(5000);
    });

    it("validates maxQueueSize must be integer", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { maxQueueSize: 1000.5 },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.message).toContain("maxQueueSize");
      expect(body.error.message).toContain("integer");
    });

    // backfillLimit tests
    it("validates backfillLimit minimum", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { backfillLimit: 0 },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.message).toContain("backfillLimit");
      expect(body.error.message).toContain("between 1 and 1000");
    });

    it("validates backfillLimit maximum", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { backfillLimit: 1001 },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.message).toContain("backfillLimit");
    });

    it("accepts valid backfillLimit", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { backfillLimit: 200 },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("success");
      expect(body.data.backfillLimit).toBe(200);
    });

    it("validates backfillLimit must be integer", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { backfillLimit: 50.5 },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.message).toContain("backfillLimit");
      expect(body.error.message).toContain("integer");
    });

    // reanalysisLimit tests
    it("validates reanalysisLimit minimum", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { reanalysisLimit: 0 },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.message).toContain("reanalysisLimit");
      expect(body.error.message).toContain("between 1 and 1000");
    });

    it("validates reanalysisLimit maximum", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { reanalysisLimit: 1001 },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.message).toContain("reanalysisLimit");
    });

    it("accepts valid reanalysisLimit", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { reanalysisLimit: 50 },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("success");
      expect(body.data.reanalysisLimit).toBe(50);
    });

    it("validates reanalysisLimit must be integer", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { reanalysisLimit: 25.5 },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.message).toContain("reanalysisLimit");
      expect(body.error.message).toContain("integer");
    });

    it("updates all three new fields together", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: {
          maxQueueSize: 2000,
          backfillLimit: 150,
          reanalysisLimit: 75,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("success");
      expect(body.data.maxQueueSize).toBe(2000);
      expect(body.data.backfillLimit).toBe(150);
      expect(body.data.reanalysisLimit).toBe(75);
    });

    it("returns new fields on GET", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/config/daemon",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.maxQueueSize).toBe(2000); // Updated by previous test
      expect(body.data.backfillLimit).toBe(150); // Updated by previous test
      expect(body.data.reanalysisLimit).toBe(75); // Updated by previous test
    });

    // connectionDiscoveryLimit tests
    it("validates connectionDiscoveryLimit minimum", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { connectionDiscoveryLimit: 0 },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.message).toContain("connectionDiscoveryLimit");
      expect(body.error.message).toContain("between 1 and 1000");
    });

    it("validates connectionDiscoveryLimit maximum", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { connectionDiscoveryLimit: 1001 },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.message).toContain("connectionDiscoveryLimit");
    });

    it("accepts valid connectionDiscoveryLimit", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { connectionDiscoveryLimit: 200 },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("success");
      expect(body.data.connectionDiscoveryLimit).toBe(200);
    });

    it("validates connectionDiscoveryLimit must be integer", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { connectionDiscoveryLimit: 50.5 },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.message).toContain("connectionDiscoveryLimit");
      expect(body.error.message).toContain("integer");
    });

    // connectionDiscoveryLookbackDays tests
    it("validates connectionDiscoveryLookbackDays minimum", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { connectionDiscoveryLookbackDays: 0 },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.message).toContain("connectionDiscoveryLookbackDays");
      expect(body.error.message).toContain("between 1 and 365");
    });

    it("validates connectionDiscoveryLookbackDays maximum", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { connectionDiscoveryLookbackDays: 366 },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.message).toContain("connectionDiscoveryLookbackDays");
    });

    it("accepts valid connectionDiscoveryLookbackDays", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { connectionDiscoveryLookbackDays: 30 },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("success");
      expect(body.data.connectionDiscoveryLookbackDays).toBe(30);
    });

    it("validates connectionDiscoveryLookbackDays must be integer", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { connectionDiscoveryLookbackDays: 7.5 },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.message).toContain("connectionDiscoveryLookbackDays");
      expect(body.error.message).toContain("integer");
    });

    // connectionDiscoveryCooldownHours tests
    it("validates connectionDiscoveryCooldownHours minimum", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { connectionDiscoveryCooldownHours: 0 },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.message).toContain("connectionDiscoveryCooldownHours");
      expect(body.error.message).toContain("between 1 and 168");
    });

    it("validates connectionDiscoveryCooldownHours maximum", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { connectionDiscoveryCooldownHours: 169 },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.message).toContain("connectionDiscoveryCooldownHours");
    });

    it("accepts valid connectionDiscoveryCooldownHours", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { connectionDiscoveryCooldownHours: 12 },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("success");
      expect(body.data.connectionDiscoveryCooldownHours).toBe(12);
    });

    it("validates connectionDiscoveryCooldownHours must be integer", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { connectionDiscoveryCooldownHours: 6.5 },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.message).toContain("connectionDiscoveryCooldownHours");
      expect(body.error.message).toContain("integer");
    });

    it("updates all three connection discovery fields together", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: {
          connectionDiscoveryLimit: 150,
          connectionDiscoveryLookbackDays: 14,
          connectionDiscoveryCooldownHours: 12,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("success");
      expect(body.data.connectionDiscoveryLimit).toBe(150);
      expect(body.data.connectionDiscoveryLookbackDays).toBe(14);
      expect(body.data.connectionDiscoveryCooldownHours).toBe(12);
    });

    it("returns connection discovery fields on GET", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/config/daemon",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.connectionDiscoveryLimit).toBe(150); // Updated by previous test
      expect(body.data.connectionDiscoveryLookbackDays).toBe(14); // Updated by previous test
      expect(body.data.connectionDiscoveryCooldownHours).toBe(12); // Updated by previous test
    });

    it("returns all daemon fields including connection discovery", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/config/daemon",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toBeDefined();
      expect(body.data.provider).toBeDefined();
      expect(body.data.model).toBeDefined();
      expect(body.data.idleTimeoutMinutes).toBeDefined();
      expect(body.data.parallelWorkers).toBeDefined();
      expect(body.data.maxRetries).toBeDefined();
      expect(body.data.retryDelaySeconds).toBeDefined();
      expect(body.data.analysisTimeoutMinutes).toBeDefined();
      expect(body.data.maxConcurrentAnalysis).toBeDefined();
      expect(body.data.maxQueueSize).toBeDefined();
      expect(body.data.backfillLimit).toBeDefined();
      expect(body.data.reanalysisLimit).toBeDefined();
      expect(body.data.connectionDiscoveryLimit).toBeDefined();
      expect(body.data.connectionDiscoveryLookbackDays).toBeDefined();
      expect(body.data.connectionDiscoveryCooldownHours).toBeDefined();
      expect(body.data.defaults).toBeDefined();
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
