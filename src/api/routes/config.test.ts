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

  // Embedding configuration tests
  describe("embedding config in daemon routes", () => {
    it("returns embedding fields on GET", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/config/daemon",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.embeddingProvider).toBeDefined();
      expect(body.data.embeddingModel).toBeDefined();
      expect(typeof body.data.hasApiKey).toBe("boolean");
      // embeddingBaseUrl and embeddingDimensions may be undefined if not set
      // Just verify the main fields are present
    });

    it("never returns actual API key on GET", async () => {
      // First set an API key
      await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { embeddingApiKey: "sk-test-secret-key" },
      });

      // Then verify it's not returned
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/config/daemon",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.embeddingApiKey).toBeUndefined();
      expect(body.data.hasApiKey).toBeTruthy();
    });

    it("returns hasApiKey: false when no key is set", async () => {
      // Clear any existing key
      await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { embeddingApiKey: null },
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/config/daemon",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.hasApiKey).toBeFalsy();
    });

    it("includes embedding defaults for UI reference", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/config/daemon",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.defaults.embeddingProvider).toBeDefined();
      expect(body.data.defaults.embeddingModel).toBeDefined();
    });

    it("validates embeddingProvider must be valid", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { embeddingProvider: "invalid-provider" },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.message).toContain("embeddingProvider");
      expect(body.error.message).toContain("ollama");
      expect(body.error.message).toContain("openai");
      expect(body.error.message).toContain("openrouter");
    });

    it("accepts valid embeddingProvider: ollama", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { embeddingProvider: "ollama" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.embeddingProvider).toBe("ollama");
    });

    it("accepts valid embeddingProvider: openai", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { embeddingProvider: "openai" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.embeddingProvider).toBe("openai");
    });

    it("accepts valid embeddingProvider: openrouter", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { embeddingProvider: "openrouter" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.embeddingProvider).toBe("openrouter");
    });

    it("validates embeddingModel must be non-empty string", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { embeddingModel: "" },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.message).toContain("embeddingModel");
      expect(body.error.message).toContain("non-empty");
    });

    it("accepts valid embeddingModel", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { embeddingModel: "text-embedding-3-small" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.embeddingModel).toBe("text-embedding-3-small");
    });

    it("accepts embeddingApiKey and returns hasApiKey: true on PUT", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { embeddingApiKey: "sk-test-key-12345" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.hasApiKey).toBeTruthy();
      expect(body.data.embeddingApiKey).toBeUndefined();
    });

    it("clears API key when set to null", async () => {
      // First set a key
      await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { embeddingApiKey: "sk-will-be-cleared" },
      });

      // Then clear it
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { embeddingApiKey: null },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.hasApiKey).toBeFalsy();
    });

    it("validates embeddingBaseUrl must be non-empty string or null", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { embeddingBaseUrl: "" },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.message).toContain("embeddingBaseUrl");
    });

    it("accepts valid embeddingBaseUrl", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { embeddingBaseUrl: "https://custom-api.example.com/v1" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.embeddingBaseUrl).toBe(
        "https://custom-api.example.com/v1"
      );
    });

    it("clears embeddingBaseUrl when set to null", async () => {
      // First set a value
      await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { embeddingBaseUrl: "https://example.com" },
      });

      // Then clear it
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { embeddingBaseUrl: null },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.embeddingBaseUrl).toBeUndefined();
    });

    it("validates embeddingDimensions minimum", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { embeddingDimensions: 0 },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.message).toContain("embeddingDimensions");
      expect(body.error.message).toContain("positive integer");
    });

    it("validates embeddingDimensions maximum", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { embeddingDimensions: 10_001 },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.message).toContain("embeddingDimensions");
    });

    it("validates embeddingDimensions must be integer", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { embeddingDimensions: 512.5 },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.message).toContain("embeddingDimensions");
      expect(body.error.message).toContain("integer");
    });

    it("accepts valid embeddingDimensions", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { embeddingDimensions: 1536 },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.embeddingDimensions).toBe(1536);
    });

    it("clears embeddingDimensions when set to null", async () => {
      // First set a value
      await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { embeddingDimensions: 768 },
      });

      // Then clear it
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { embeddingDimensions: null },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.embeddingDimensions).toBeUndefined();
    });

    it("updates multiple embedding fields together", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: {
          embeddingProvider: "openai",
          embeddingModel: "text-embedding-3-large",
          embeddingDimensions: 3072,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.embeddingProvider).toBe("openai");
      expect(body.data.embeddingModel).toBe("text-embedding-3-large");
      expect(body.data.embeddingDimensions).toBe(3072);
    });
  });

  describe("schedule config in daemon routes", () => {
    it("returns schedule fields on GET", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/config/daemon",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.reanalysisSchedule).toBeDefined();
      expect(body.data.connectionDiscoverySchedule).toBeDefined();
      expect(body.data.patternAggregationSchedule).toBeDefined();
      expect(body.data.clusteringSchedule).toBeDefined();
      // backfillEmbeddingsSchedule may be undefined if not set
    });

    it("includes schedule defaults for UI reference", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/config/daemon",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.defaults.reanalysisSchedule).toBeDefined();
      expect(body.data.defaults.connectionDiscoverySchedule).toBeDefined();
      expect(body.data.defaults.patternAggregationSchedule).toBeDefined();
      expect(body.data.defaults.clusteringSchedule).toBeDefined();
      expect(body.data.defaults.backfillEmbeddingsSchedule).toBeDefined();
    });

    it("validates reanalysisSchedule must be valid cron expression", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { reanalysisSchedule: "invalid cron" },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.message).toContain("reanalysisSchedule");
      expect(body.error.message).toContain("valid cron expression");
    });

    it("validates connectionDiscoverySchedule must be valid cron expression", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { connectionDiscoverySchedule: "bad schedule" },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.message).toContain("connectionDiscoverySchedule");
    });

    it("validates patternAggregationSchedule must be valid cron expression", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { patternAggregationSchedule: "not a cron" },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.message).toContain("patternAggregationSchedule");
    });

    it("validates clusteringSchedule must be valid cron expression", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { clusteringSchedule: "1 2 3" },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.message).toContain("clusteringSchedule");
    });

    it("validates backfillEmbeddingsSchedule must be valid cron expression", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { backfillEmbeddingsSchedule: "every hour" },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.message).toContain("backfillEmbeddingsSchedule");
    });

    it("accepts valid reanalysisSchedule", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { reanalysisSchedule: "0 3 * * *" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.reanalysisSchedule).toBe("0 3 * * *");
    });

    it("accepts valid connectionDiscoverySchedule", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { connectionDiscoverySchedule: "0 */6 * * *" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.connectionDiscoverySchedule).toBe("0 */6 * * *");
    });

    it("accepts valid patternAggregationSchedule", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { patternAggregationSchedule: "30 4 * * *" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.patternAggregationSchedule).toBe("30 4 * * *");
    });

    it("accepts valid clusteringSchedule", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { clusteringSchedule: "0 5 * * 0" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.clusteringSchedule).toBe("0 5 * * 0");
    });

    it("accepts valid backfillEmbeddingsSchedule", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { backfillEmbeddingsSchedule: "0 6 * * *" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.backfillEmbeddingsSchedule).toBe("0 6 * * *");
    });

    it("clears schedule with null value", async () => {
      // First set a schedule
      await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { backfillEmbeddingsSchedule: "0 7 * * *" },
      });

      // Then clear it
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { backfillEmbeddingsSchedule: null },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      // After clearing, it returns to default
      expect(body.data.backfillEmbeddingsSchedule).toBeDefined();
    });

    it("clears schedule with empty string", async () => {
      // First set a schedule
      await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { reanalysisSchedule: "0 8 * * *" },
      });

      // Then clear it with empty string
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: { reanalysisSchedule: "" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      // After clearing, it returns to default
      expect(body.data.reanalysisSchedule).toBeDefined();
    });

    it("updates multiple schedules at once", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/daemon",
        payload: {
          reanalysisSchedule: "0 1 * * *",
          connectionDiscoverySchedule: "0 2 * * *",
          patternAggregationSchedule: "0 3 * * *",
          clusteringSchedule: "0 4 * * *",
          backfillEmbeddingsSchedule: "0 5 * * *",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.reanalysisSchedule).toBe("0 1 * * *");
      expect(body.data.connectionDiscoverySchedule).toBe("0 2 * * *");
      expect(body.data.patternAggregationSchedule).toBe("0 3 * * *");
      expect(body.data.clusteringSchedule).toBe("0 4 * * *");
      expect(body.data.backfillEmbeddingsSchedule).toBe("0 5 * * *");
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

  describe("get /config/hub", () => {
    it("returns hub configuration", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/config/hub",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toBeDefined();
      expect(body.data.sessionsDir).toBeDefined();
      expect(body.data.databaseDir).toBeDefined();
      expect(body.data.webUiPort).toBeDefined();
      expect(body.data.defaults).toBeDefined();
    });

    it("includes defaults for UI reference", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/config/hub",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.defaults.sessionsDir).toBeDefined();
      expect(body.data.defaults.databaseDir).toBeDefined();
      expect(body.data.defaults.webUiPort).toBeDefined();
    });
  });

  describe("put /config/hub", () => {
    it("rejects request with no fields", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/hub",
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("error");
      expect(body.error.code).toBe("BAD_REQUEST");
    });

    it("rejects empty sessionsDir", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/hub",
        payload: { sessionsDir: "" },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe("BAD_REQUEST");
      expect(body.error.message).toContain("sessionsDir");
    });

    it("rejects empty databaseDir", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/hub",
        payload: { databaseDir: "" },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe("BAD_REQUEST");
      expect(body.error.message).toContain("databaseDir");
    });

    it("rejects port below minimum", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/hub",
        payload: { webUiPort: 1023 },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe("BAD_REQUEST");
      expect(body.error.message).toContain("webUiPort");
    });

    it("accepts valid sessionsDir update", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/hub",
        payload: { sessionsDir: "/tmp/sessions" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.sessionsDir).toBe("/tmp/sessions");
      expect(body.data.message).toContain("Configuration updated");
    });

    it("accepts valid databaseDir update", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/hub",
        payload: { databaseDir: "/tmp/data" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.databaseDir).toBe("/tmp/data");
    });

    it("accepts valid webUiPort update", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/hub",
        payload: { webUiPort: 9001 },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.webUiPort).toBe(9001);
    });

    it("accepts all fields together", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/hub",
        payload: {
          sessionsDir: "/tmp/s2",
          databaseDir: "/tmp/d2",
          webUiPort: 9002,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.sessionsDir).toBe("/tmp/s2");
      expect(body.data.databaseDir).toBe("/tmp/d2");
      expect(body.data.webUiPort).toBe(9002);
    });
  });

  describe("gET /config/spokes", () => {
    it("returns empty array when no spokes configured", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/config/spokes",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("success");
      expect(body.data.spokes).toBeDefined();
      expect(Array.isArray(body.data.spokes)).toBeTruthy();
    });
  });

  describe("pOST /config/spokes", () => {
    it("requires request body", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/config/spokes",
        payload: null,
      });

      expect(response.statusCode).toBe(400);
    });

    it("requires name field", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/config/spokes",
        payload: {
          syncMethod: "syncthing",
          path: "/tmp/spoke",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.message).toContain("name");
    });

    it("requires syncMethod field", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/config/spokes",
        payload: {
          name: "test-spoke",
          path: "/tmp/spoke",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.message).toContain("syncMethod");
    });

    it("requires path field", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/config/spokes",
        payload: {
          name: "test-spoke",
          syncMethod: "syncthing",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.message).toContain("path");
    });

    it("validates name format", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/config/spokes",
        payload: {
          name: "test spoke!",
          syncMethod: "syncthing",
          path: "/tmp/spoke",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.message).toContain("name");
    });

    it("validates syncMethod is valid", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/config/spokes",
        payload: {
          name: "test-spoke",
          syncMethod: "invalid",
          path: "/tmp/spoke",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.message).toContain("syncMethod");
    });

    it("requires source for rsync method", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/config/spokes",
        payload: {
          name: "test-spoke",
          syncMethod: "rsync",
          path: "/tmp/spoke",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.message).toContain("source");
    });

    it("creates spoke with syncthing method", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/config/spokes",
        payload: {
          name: "laptop",
          syncMethod: "syncthing",
          path: "/tmp/laptop-sessions",
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data.spoke.name).toBe("laptop");
      expect(body.data.spoke.syncMethod).toBe("syncthing");
      expect(body.data.spoke.path).toBe("/tmp/laptop-sessions");
      expect(body.data.spoke.enabled).toBeTruthy();
    });

    it("creates spoke with rsync method", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/config/spokes",
        payload: {
          name: "server",
          syncMethod: "rsync",
          path: "/tmp/server-sessions",
          source: "user@server:~/.pi/sessions",
          schedule: "0 */6 * * *",
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data.spoke.name).toBe("server");
      expect(body.data.spoke.syncMethod).toBe("rsync");
      expect(body.data.spoke.source).toBe("user@server:~/.pi/sessions");
      expect(body.data.spoke.schedule).toBe("0 */6 * * *");
    });

    it("creates spoke with rsyncOptions", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/config/spokes",
        payload: {
          name: "remote",
          syncMethod: "rsync",
          path: "/tmp/remote-sessions",
          source: "user@remote:/data",
          rsyncOptions: {
            bwLimit: 1000,
            delete: true,
            timeoutSeconds: 300,
            extraArgs: ["--exclude=*.tmp"],
          },
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data.spoke.rsyncOptions).toBeDefined();
      expect(body.data.spoke.rsyncOptions.bwLimit).toBe(1000);
      expect(body.data.spoke.rsyncOptions.delete).toBeTruthy();
      expect(body.data.spoke.rsyncOptions.timeoutSeconds).toBe(300);
    });

    it("prevents duplicate spoke names", async () => {
      // Create first spoke
      await app.inject({
        method: "POST",
        url: "/api/v1/config/spokes",
        payload: {
          name: "unique-spoke",
          syncMethod: "syncthing",
          path: "/tmp/spoke1",
        },
      });

      // Try to create another with same name
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/config/spokes",
        payload: {
          name: "unique-spoke",
          syncMethod: "syncthing",
          path: "/tmp/spoke2",
        },
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body);
      expect(body.error.message).toContain("already exists");
    });

    it("validates cron schedule format", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/config/spokes",
        payload: {
          name: "test-spoke",
          syncMethod: "rsync",
          path: "/tmp/spoke",
          source: "user@server:/data",
          schedule: "invalid cron",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.message).toContain("cron");
    });
  });

  describe("pUT /config/spokes/:name", () => {
    beforeEach(async () => {
      // Create a spoke for testing updates
      await app.inject({
        method: "POST",
        url: "/api/v1/config/spokes",
        payload: {
          name: "update-test",
          syncMethod: "syncthing",
          path: "/tmp/update-test",
          enabled: true,
        },
      });
    });

    it("returns 404 for non-existent spoke", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/spokes/non-existent",
        payload: { enabled: false },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error.message).toContain("not found");
    });

    it("requires at least one field", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/spokes/update-test",
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });

    it("updates enabled field", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/spokes/update-test",
        payload: { enabled: false },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.spoke.enabled).toBeFalsy();
    });

    it("updates path field", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/spokes/update-test",
        payload: { path: "/tmp/new-path" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.spoke.path).toBe("/tmp/new-path");
    });

    it("updates syncMethod to rsync with source", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/spokes/update-test",
        payload: {
          syncMethod: "rsync",
          source: "user@host:/path",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.spoke.syncMethod).toBe("rsync");
      expect(body.data.spoke.source).toBe("user@host:/path");
    });

    it("clears source with null value", async () => {
      // First set a source
      await app.inject({
        method: "PUT",
        url: "/api/v1/config/spokes/update-test",
        payload: { source: "user@host:/path" },
      });

      // Then clear it
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/spokes/update-test",
        payload: { source: null },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.spoke.source).toBeUndefined();
    });

    it("updates rsyncOptions", async () => {
      // First switch to rsync method with source
      await app.inject({
        method: "PUT",
        url: "/api/v1/config/spokes/update-test",
        payload: {
          syncMethod: "rsync",
          source: "user@host:/path",
        },
      });

      // Now update rsyncOptions
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/spokes/update-test",
        payload: {
          rsyncOptions: {
            bwLimit: 500,
            delete: false,
          },
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.spoke.rsyncOptions.bwLimit).toBe(500);
      expect(body.data.spoke.rsyncOptions.delete).toBeFalsy();
    });

    it("clears rsyncOptions with null value", async () => {
      // First switch to rsync and set rsyncOptions
      await app.inject({
        method: "PUT",
        url: "/api/v1/config/spokes/update-test",
        payload: {
          syncMethod: "rsync",
          source: "user@host:/path",
          rsyncOptions: { bwLimit: 500 },
        },
      });

      // Then clear them
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/spokes/update-test",
        payload: { rsyncOptions: null },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.spoke.rsyncOptions).toBeUndefined();
    });

    it("validates rsyncOptions.bwLimit range", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/v1/config/spokes/update-test",
        payload: { rsyncOptions: { bwLimit: -1 } },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("dELETE /config/spokes/:name", () => {
    beforeEach(async () => {
      // Create a spoke for testing deletion
      await app.inject({
        method: "POST",
        url: "/api/v1/config/spokes",
        payload: {
          name: "delete-test",
          syncMethod: "syncthing",
          path: "/tmp/delete-test",
        },
      });
    });

    it("returns 404 for non-existent spoke", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/api/v1/config/spokes/non-existent",
      });

      expect(response.statusCode).toBe(404);
    });

    it("deletes existing spoke", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/api/v1/config/spokes/delete-test",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.message).toContain("deleted");

      // Verify it's gone
      const listResponse = await app.inject({
        method: "GET",
        url: "/api/v1/config/spokes",
      });
      const listBody = JSON.parse(listResponse.body);
      const deletedSpoke = listBody.data.spokes.find(
        (s: { name: string }) => s.name === "delete-test"
      );
      expect(deletedSpoke).toBeUndefined();
    });

    it("persists deletion after GET", async () => {
      await app.inject({
        method: "DELETE",
        url: "/api/v1/config/spokes/delete-test",
      });

      // Should not find the spoke in subsequent GET
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/config/spokes",
      });

      const body = JSON.parse(response.body);
      const spokes = body.data.spokes as { name: string }[];
      expect(spokes.find((s) => s.name === "delete-test")).toBeUndefined();
    });
  });
});
