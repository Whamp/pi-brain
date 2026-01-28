/**
 * Tests for the Memory Consolidation Engine
 */

import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { CreativeAssociator } from "./creative-associator.js";
import {
  createConsolidationScheduler,
  type ConsolidationScheduler,
} from "./decay-scheduler.js";
import { RelevanceCalculator } from "./relevance.js";

// =============================================================================
// Test Helpers
// =============================================================================

function createTestDb(): Database.Database {
  const db = new Database(":memory:");

  // Create minimal schema for testing
  db.exec(`
    CREATE TABLE nodes (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      last_accessed TEXT,
      relevance_score REAL DEFAULT 1.0,
      importance REAL DEFAULT 0.5,
      archived INTEGER DEFAULT 0,
      summary TEXT
    );

    CREATE TABLE edges (
      id TEXT PRIMARY KEY,
      source_node_id TEXT NOT NULL,
      target_node_id TEXT NOT NULL,
      type TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      created_by TEXT DEFAULT 'daemon',
      confidence REAL,
      similarity REAL,
      metadata TEXT
    );

    CREATE TABLE node_embeddings (
      node_id TEXT PRIMARY KEY,
      embedding BLOB,
      embedding_model TEXT,
      input_text TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  return db;
}

function insertTestNode(
  db: Database.Database,
  id: string,
  daysAgo: number,
  options: {
    lastAccessedDaysAgo?: number;
    relevanceScore?: number;
    importance?: number;
    archived?: boolean;
    summary?: string;
  } = {}
): void {
  const timestamp = new Date(
    Date.now() - daysAgo * 24 * 60 * 60 * 1000
  ).toISOString();
  const lastAccessed = options.lastAccessedDaysAgo
    ? new Date(
        Date.now() - options.lastAccessedDaysAgo * 24 * 60 * 60 * 1000
      ).toISOString()
    : null;

  db.prepare(
    `
    INSERT INTO nodes (id, timestamp, last_accessed, relevance_score, importance, archived, summary)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `
  ).run(
    id,
    timestamp,
    lastAccessed,
    options.relevanceScore ?? 1,
    options.importance ?? 0.5,
    options.archived ? 1 : 0,
    options.summary ?? `Summary for ${id}`
  );
}

function insertTestEdge(
  db: Database.Database,
  sourceId: string,
  targetId: string,
  type = "semantic"
): void {
  db.prepare(
    `
    INSERT INTO edges (id, source_node_id, target_node_id, type)
    VALUES (?, ?, ?, ?)
  `
  ).run(`edge-${sourceId}-${targetId}`, sourceId, targetId, type);
}

// =============================================================================
// RelevanceCalculator Tests
// =============================================================================

describe("relevanceCalculator", () => {
  let db: Database.Database;
  let calculator: RelevanceCalculator;

  beforeEach(() => {
    db = createTestDb();
    calculator = new RelevanceCalculator(db);
  });

  afterEach(() => {
    db.close();
  });

  describe("calculateDecayFactor", () => {
    it("should return 1.0 for age 0", () => {
      expect(calculator.calculateDecayFactor(0)).toBeCloseTo(1);
    });

    it("should decay exponentially with age", () => {
      const day1 = calculator.calculateDecayFactor(1);
      const day7 = calculator.calculateDecayFactor(7);
      const day30 = calculator.calculateDecayFactor(30);

      expect(day1).toBeLessThan(1);
      expect(day7).toBeLessThan(day1);
      expect(day30).toBeLessThan(day7);
    });

    it("should approach 0 for very old nodes", () => {
      const day100 = calculator.calculateDecayFactor(100);
      expect(day100).toBeLessThan(0.01);
    });
  });

  describe("calculateAccessRecency", () => {
    it("should return 1.0 for recently accessed nodes", () => {
      expect(calculator.calculateAccessRecency(0)).toBe(1);
    });

    it("should decrease linearly for first week", () => {
      const day3 = calculator.calculateAccessRecency(3);
      const day7 = calculator.calculateAccessRecency(7);

      expect(day3).toBeCloseTo(0.85);
      expect(day7).toBeCloseTo(0.65);
    });

    it("should decay logarithmically after first week", () => {
      const day14 = calculator.calculateAccessRecency(14);
      const day30 = calculator.calculateAccessRecency(30);

      expect(day14).toBeLessThan(0.65);
      expect(day30).toBeLessThan(day14);
    });
  });

  describe("calculateRelationshipDensity", () => {
    it("should return 0.5 for nodes with no edges", () => {
      expect(calculator.calculateRelationshipDensity(0)).toBe(0.5);
    });

    it("should increase with edge count up to 5", () => {
      expect(calculator.calculateRelationshipDensity(1)).toBe(0.6);
      expect(calculator.calculateRelationshipDensity(3)).toBe(0.8);
      expect(calculator.calculateRelationshipDensity(5)).toBe(1);
    });

    it("should cap at 1.0 for more than 5 edges", () => {
      expect(calculator.calculateRelationshipDensity(10)).toBe(1);
    });
  });

  describe("calculateRelevance", () => {
    it("should return high relevance for new, accessed, connected nodes", () => {
      const relevance = calculator.calculateRelevance({
        ageInDays: 0,
        daysSinceAccess: 0,
        edgeCount: 5,
        importance: 0.5,
        confidence: 1,
      });

      expect(relevance).toBeGreaterThan(0.5);
    });

    it("should return low relevance for old, unaccessed, isolated nodes", () => {
      const relevance = calculator.calculateRelevance({
        ageInDays: 60,
        daysSinceAccess: 60,
        edgeCount: 0,
        importance: 0,
        confidence: 0,
      });

      expect(relevance).toBeLessThan(0.2);
    });

    it("should clamp relevance to 0.0-1.0 range", () => {
      const high = calculator.calculateRelevance({
        ageInDays: 0,
        daysSinceAccess: 0,
        edgeCount: 100,
        importance: 1,
        confidence: 1,
      });

      const low = calculator.calculateRelevance({
        ageInDays: 1000,
        daysSinceAccess: 1000,
        edgeCount: 0,
        importance: 0,
        confidence: 0,
      });

      expect(high).toBeLessThanOrEqual(1);
      expect(low).toBeGreaterThanOrEqual(0);
    });
  });

  describe("calculateForNode", () => {
    it("should return null for non-existent node", () => {
      const result = calculator.calculateForNode("nonexistent");
      expect(result).toBeNull();
    });

    it("should calculate relevance for existing node", () => {
      insertTestNode(db, "node1", 7, { lastAccessedDaysAgo: 3 });
      insertTestEdge(db, "node1", "other");

      const result = calculator.calculateForNode("node1");

      expect(result).not.toBeNull();
      expect(result?.nodeId).toBe("node1");
      expect(result?.newScore).toBeGreaterThan(0);
      expect(result?.newScore).toBeLessThanOrEqual(1);
      expect(result?.factors.edgeCount).toBe(1);
    });

    it("should flag low-relevance nodes for archiving", () => {
      insertTestNode(db, "old-node", 90, { lastAccessedDaysAgo: 90 });

      const result = calculator.calculateForNode("old-node");

      expect(result).not.toBeNull();
      expect(result?.shouldArchive).toBeTruthy();
    });
  });

  describe("runDecay", () => {
    it("should update relevance for all non-archived nodes", () => {
      insertTestNode(db, "node1", 7);
      insertTestNode(db, "node2", 14);
      insertTestNode(db, "node3", 7, { archived: true });

      const result = calculator.runDecay();

      expect(result.updated).toBe(2); // node3 is archived, not updated
    });

    it("should archive nodes below threshold", () => {
      insertTestNode(db, "old-node", 90, { lastAccessedDaysAgo: 90 });

      const result = calculator.runDecay();

      expect(result.archived).toBeGreaterThanOrEqual(1);

      // Verify node is archived in DB
      const row = db
        .prepare("SELECT archived FROM nodes WHERE id = ?")
        .get("old-node") as { archived: number };
      expect(row.archived).toBe(1);
    });
  });

  describe("touchNode", () => {
    it("should update last_accessed timestamp", () => {
      insertTestNode(db, "node1", 7, { lastAccessedDaysAgo: 7 });

      calculator.touchNode("node1");

      const row = db
        .prepare("SELECT last_accessed FROM nodes WHERE id = ?")
        .get("node1") as { last_accessed: string };

      // Verify last_accessed was updated (not null and not the old value)
      expect(row.last_accessed).not.toBeNull();
      const lastAccessed = new Date(`${row.last_accessed}Z`); // SQLite returns UTC without 'Z'

      // Should be more recent than 7 days ago (within last hour)
      expect(lastAccessed.getTime()).toBeGreaterThan(
        Date.now() - 60 * 60 * 1000
      );
    });
  });

  describe("unarchiveNode", () => {
    it("should restore archived node", () => {
      insertTestNode(db, "node1", 30, {
        archived: true,
        relevanceScore: 0.1,
      });

      calculator.unarchiveNode("node1");

      const row = db
        .prepare("SELECT archived, relevance_score FROM nodes WHERE id = ?")
        .get("node1") as { archived: number; relevance_score: number };

      expect(row.archived).toBe(0);
      expect(row.relevance_score).toBe(0.5);
    });
  });
});

// =============================================================================
// CreativeAssociator Tests
// =============================================================================

describe("creativeAssociator", () => {
  let db: Database.Database;
  let associator: CreativeAssociator;

  beforeEach(() => {
    db = createTestDb();
    associator = new CreativeAssociator(db, {
      sampleSize: 10,
      similarityThreshold: 0.7,
    });
  });

  afterEach(() => {
    db.close();
  });

  it("should return empty result when no nodes have embeddings", async () => {
    insertTestNode(db, "node1", 1);

    const result = await associator.run();

    // sqlite-vec not loaded, so should report error
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("sqlite-vec");
  });

  it("should report error when sqlite-vec not loaded", async () => {
    // In test environment, sqlite-vec is not loaded
    const result = await associator.run();

    // Should report error about sqlite-vec
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("sqlite-vec");
  });

  it("should return config", () => {
    const config = associator.getConfig();

    expect(config.sampleSize).toBe(10);
    expect(config.similarityThreshold).toBe(0.7);
    expect(config.minRelevance).toBe(0.3);
    expect(config.maxEdgesPerNode).toBe(3);
  });
});

// =============================================================================
// ConsolidationScheduler Tests
// =============================================================================

describe("consolidationScheduler", () => {
  let db: Database.Database;
  let scheduler: ConsolidationScheduler;

  beforeEach(() => {
    db = createTestDb();
    scheduler = createConsolidationScheduler(db, {
      decaySchedule: "0 3 * * *",
      creativeSchedule: "0 4 * * 0",
    });
  });

  afterEach(() => {
    scheduler.stop();
    db.close();
  });

  describe("start/stop", () => {
    it("should start and stop without error", () => {
      expect(scheduler.isRunning()).toBeFalsy();

      scheduler.start();
      expect(scheduler.isRunning()).toBeTruthy();

      scheduler.stop();
      expect(scheduler.isRunning()).toBeFalsy();
    });

    it("should be idempotent", () => {
      scheduler.start();
      scheduler.start(); // Should not throw
      expect(scheduler.isRunning()).toBeTruthy();

      scheduler.stop();
      scheduler.stop(); // Should not throw
      expect(scheduler.isRunning()).toBeFalsy();
    });
  });

  describe("getStatus", () => {
    it("should return status with schedules", () => {
      scheduler.start();
      const status = scheduler.getStatus();

      expect(status.running).toBeTruthy();
      expect(status.decay.schedule).toBe("0 3 * * *");
      expect(status.creative.schedule).toBe("0 4 * * 0");
      expect(status.decay.nextRun).toBeInstanceOf(Date);
      expect(status.creative.nextRun).toBeInstanceOf(Date);
    });
  });

  describe("triggerDecay", () => {
    it("should run decay and return result", async () => {
      insertTestNode(db, "node1", 7);
      insertTestNode(db, "node2", 14);

      const result = await scheduler.triggerDecay();

      expect(result.type).toBe("decay");
      expect(result.itemsProcessed).toBe(2);
      expect(result.details.updated).toBe(2);
      expect(result.error).toBeUndefined();
    });
  });

  describe("triggerCreative", () => {
    it("should run creative association and return result with sqlite-vec error", async () => {
      const result = await scheduler.triggerCreative();

      expect(result.type).toBe("creative");
      // sqlite-vec not loaded in test env, so creative associator reports internal errors
      // but the scheduler itself completes without throwing
    });
  });

  describe("getRelevanceCalculator", () => {
    it("should return the relevance calculator", () => {
      const calc = scheduler.getRelevanceCalculator();
      expect(calc).toBeInstanceOf(RelevanceCalculator);
    });
  });

  describe("getCreativeAssociator", () => {
    it("should return the creative associator", () => {
      const assoc = scheduler.getCreativeAssociator();
      expect(assoc).toBeInstanceOf(CreativeAssociator);
    });
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe("consolidation Integration", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
  });

  afterEach(() => {
    db.close();
  });

  it("should archive old unconnected nodes after decay", () => {
    // Create a very old node with no connections
    insertTestNode(db, "ancient", 120, {
      lastAccessedDaysAgo: 120,
      importance: 0,
    });

    // Create a recent, well-connected node
    insertTestNode(db, "recent", 1, {
      lastAccessedDaysAgo: 0,
      importance: 0.8,
    });
    insertTestEdge(db, "recent", "other1");
    insertTestEdge(db, "recent", "other2");
    insertTestEdge(db, "recent", "other3");

    const calculator = new RelevanceCalculator(db);
    calculator.runDecay();

    // Ancient node should be archived
    const ancientRow = db
      .prepare("SELECT archived, relevance_score FROM nodes WHERE id = ?")
      .get("ancient") as { archived: number; relevance_score: number };
    expect(ancientRow.archived).toBe(1);
    expect(ancientRow.relevance_score).toBeLessThan(0.2);

    // Recent node should not be archived
    const recentRow = db
      .prepare("SELECT archived, relevance_score FROM nodes WHERE id = ?")
      .get("recent") as { archived: number; relevance_score: number };
    expect(recentRow.archived).toBe(0);
    expect(recentRow.relevance_score).toBeGreaterThan(0.3);
  });

  it("should preserve high-importance nodes with recent activity", () => {
    // Create a recently active high-importance node with good connectivity
    insertTestNode(db, "important", 7, {
      lastAccessedDaysAgo: 1,
      importance: 1, // Maximum importance
    });
    insertTestEdge(db, "important", "other1");
    insertTestEdge(db, "important", "other2");
    insertTestEdge(db, "important", "other3");

    const calculator = new RelevanceCalculator(db);
    const result = calculator.calculateForNode("important");

    // Should not be flagged for archive due to high importance and connections
    expect(result).not.toBeNull();
    expect(result?.shouldArchive).toBeFalsy();
    // High importance should boost relevance above archive threshold
    expect(result?.newScore).toBeGreaterThan(calculator.getArchiveThreshold());
  });
});
