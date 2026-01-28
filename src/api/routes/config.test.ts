/**
 * Tests for Configuration API routes
 */

import type Database from "better-sqlite3";

import * as fs from "node:fs";
import { afterEach, beforeEach, beforeAll, describe, expect, it } from "vitest";

import { DEFAULT_CONFIG_PATH } from "../../config/config.js";
import { migrate } from "../../storage/database.js";
import { createServer } from "../server.js";

describe("config api routes", () => {
  let app: Awaited<ReturnType<typeof createServer>>;
  let db: Database.Database;
  let originalConfigContent: string | null = null;

  beforeAll(() => {
    // Save original config content for cleanup ONCE before all tests
    if (fs.existsSync(DEFAULT_CONFIG_PATH)) {
      originalConfigContent = fs.readFileSync(DEFAULT_CONFIG_PATH, "utf8");
    } else {
      originalConfigContent = null;
    }
  });

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

    // Restore original config content
    if (originalConfigContent !== null) {
      fs.writeFileSync(DEFAULT_CONFIG_PATH, originalConfigContent, "utf8");
    } else if (fs.existsSync(DEFAULT_CONFIG_PATH)) {
      // No original config existed, delete the file
      fs.unlinkSync(DEFAULT_CONFIG_PATH);
    }
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
      // First set the values
      await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: {
          analysisTimeoutMinutes: 45,
          maxConcurrentAnalysis: 2,
        },
      });

      // Then verify they're returned
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/config/daemon",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.analysisTimeoutMinutes).toBe(45);
      expect(body.data.maxConcurrentAnalysis).toBe(2);
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
      // First set values
      await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: {
          maxQueueSize: 2000,
          backfillLimit: 150,
          reanalysisLimit: 75,
        },
      });

      // Then verify they're returned
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/config/daemon",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.maxQueueSize).toBe(2000);
      expect(body.data.backfillLimit).toBe(150);
      expect(body.data.reanalysisLimit).toBe(75);
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
      // First set the values
      await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: {
          connectionDiscoveryLimit: 150,
          connectionDiscoveryLookbackDays: 14,
          connectionDiscoveryCooldownHours: 12,
        },
      });

      // Then verify they're returned
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/config/daemon",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.connectionDiscoveryLimit).toBe(150);
      expect(body.data.connectionDiscoveryLookbackDays).toBe(14);
      expect(body.data.connectionDiscoveryCooldownHours).toBe(12);
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

    // semanticSearchThreshold tests
    it("validates semanticSearchThreshold minimum", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { semanticSearchThreshold: -0.1 },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.message).toContain("semanticSearchThreshold");
      expect(body.error.message).toContain("between 0 and 1");
    });

    it("validates semanticSearchThreshold maximum", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { semanticSearchThreshold: 1.1 },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.message).toContain("semanticSearchThreshold");
      expect(body.error.message).toContain("between 0 and 1");
    });

    it("accepts valid semanticSearchThreshold minimum", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { semanticSearchThreshold: 0 },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("success");
      expect(body.data.semanticSearchThreshold).toBe(0);
    });

    it("accepts valid semanticSearchThreshold maximum", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { semanticSearchThreshold: 1 },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("success");
      expect(body.data.semanticSearchThreshold).toBe(1);
    });

    it("accepts valid semanticSearchThreshold midpoint", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { semanticSearchThreshold: 0.5 },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("success");
      expect(body.data.semanticSearchThreshold).toBe(0.5);
    });

    it("accepts semanticSearchThreshold with decimal precision", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { semanticSearchThreshold: 0.75 },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("success");
      expect(body.data.semanticSearchThreshold).toBe(0.75);
    });

    it("returns semanticSearchThreshold on GET", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/config/daemon",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.semanticSearchThreshold).toBeDefined();
      expect(typeof body.data.semanticSearchThreshold).toBe("number");
    });

    it("returns all daemon fields including semanticSearchThreshold", async () => {
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
      expect(body.data.semanticSearchThreshold).toBeDefined();
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

  describe("get /config/query", () => {
    it("returns query configuration", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/config/query",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toBeDefined();
      expect(body.data.provider).toBeDefined();
      expect(body.data.model).toBeDefined();
      expect(body.data.defaults).toBeDefined();
    });

    it("includes defaults for UI reference", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/config/query",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.defaults.provider).toBeDefined();
      expect(body.data.defaults.model).toBeDefined();
    });
  });

  describe("put /config/query", () => {
    it("rejects request with no fields", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/query",
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("error");
      expect(body.error.code).toBe("BAD_REQUEST");
    });

    it("rejects empty provider", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/query",
        payload: { provider: "" },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe("BAD_REQUEST");
      expect(body.error.message).toContain("provider");
    });

    it("rejects empty model", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/query",
        payload: { model: "" },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe("BAD_REQUEST");
      expect(body.error.message).toContain("model");
    });

    it("accepts valid provider update", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/query",
        payload: { provider: "anthropic" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.provider).toBe("anthropic");
      expect(body.data.message).toContain("Configuration updated");
    });

    it("accepts valid model update", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/query",
        payload: { model: "gpt-4o" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.model).toBe("gpt-4o");
      expect(body.data.message).toContain("Configuration updated");
    });

    it("accepts both provider and model update", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/query",
        payload: { provider: "openai", model: "gpt-4o-mini" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.provider).toBe("openai");
      expect(body.data.model).toBe("gpt-4o-mini");
      expect(body.data.message).toContain("Configuration updated");
    });
  });

  describe("get /config/api", () => {
    it("returns API server configuration", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/config/api",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toBeDefined();
      expect(body.data.port).toBeDefined();
      expect(body.data.host).toBeDefined();
      expect(body.data.corsOrigins).toBeDefined();
      expect(Array.isArray(body.data.corsOrigins)).toBeTruthy();
      expect(body.data.defaults).toBeDefined();
    });

    it("includes defaults for UI reference", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/config/api",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.defaults.port).toBeDefined();
      expect(body.data.defaults.host).toBeDefined();
      expect(body.data.defaults.corsOrigins).toBeDefined();
      expect(Array.isArray(body.data.defaults.corsOrigins)).toBeTruthy();
    });
  });

  describe("put /config/api", () => {
    it("rejects request with no fields", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/api",
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("error");
      expect(body.error.code).toBe("BAD_REQUEST");
    });

    it("rejects port below minimum", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/api",
        payload: { port: 1023 },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe("BAD_REQUEST");
      expect(body.error.message).toContain("port");
    });

    it("rejects port above maximum", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/api",
        payload: { port: 65_536 },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe("BAD_REQUEST");
      expect(body.error.message).toContain("port");
    });

    it("rejects non-integer port", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/api",
        payload: { port: 8765.5 },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe("BAD_REQUEST");
      expect(body.error.message).toContain("integer");
    });

    it("rejects empty host", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/api",
        payload: { host: "" },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe("BAD_REQUEST");
      expect(body.error.message).toContain("host");
    });

    it("rejects corsOrigins as non-array", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/api",
        payload: { corsOrigins: "not-an-array" },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe("BAD_REQUEST");
      expect(body.error.message).toContain("corsOrigins");
    });

    it("rejects corsOrigins with non-string elements", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/api",
        payload: { corsOrigins: ["http://localhost:5173", 123] },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe("BAD_REQUEST");
      expect(body.error.message).toContain("corsOrigins");
    });

    it("accepts valid port update", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/api",
        payload: { port: 3000 },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.port).toBe(3000);
      expect(body.data.message).toContain("Configuration updated");
    });

    it("accepts valid host update", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/api",
        payload: { host: "0.0.0.0" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.host).toBe("0.0.0.0");
      expect(body.data.message).toContain("Configuration updated");
    });

    it("accepts valid corsOrigins update", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/api",
        payload: {
          corsOrigins: ["http://localhost:5173", "https://example.com"],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.corsOrigins).toStrictEqual([
        "http://localhost:5173",
        "https://example.com",
      ]);
      expect(body.data.message).toContain("Configuration updated");
    });

    it("accepts all fields together", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/api",
        payload: {
          port: 9000,
          host: "0.0.0.0",
          corsOrigins: ["http://localhost:9000"],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.port).toBe(9000);
      expect(body.data.host).toBe("0.0.0.0");
      expect(body.data.corsOrigins).toStrictEqual(["http://localhost:9000"]);
      expect(body.data.message).toContain("Configuration updated");
    });

    it("includes message about restart required", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/api",
        payload: { port: 8080 },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.message).toContain("Restart API server");
    });
  });
});
