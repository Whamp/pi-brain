/**
 * Tests for database module
 */

import type Database from "better-sqlite3";

import { existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  closeDatabase,
  getSchemaVersion,
  isDatabaseHealthy,
  loadMigrations,
  migrate,
  openDatabase,
} from "./database.js";

/** Create a unique test database path */
function createTestDbPath(): string {
  return join(
    tmpdir(),
    `pi-brain-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`
  );
}

/** Clean up test database files */
function cleanupTestDb(dbPath: string, db?: Database.Database): void {
  if (db) {
    try {
      db.close();
    } catch {
      // Ignore close errors
    }
  }

  for (const suffix of ["", "-wal", "-shm"]) {
    const file = dbPath + suffix;
    if (existsSync(file)) {
      rmSync(file);
    }
  }
}

describe("database", () => {
  describe("loadMigrations", () => {
    it("loads migration files in order", () => {
      const migrations = loadMigrations();

      expect(migrations.length).toBeGreaterThan(0);
      expect(migrations[0].version).toBe(1);
      expect(migrations[0].description).toContain("initial");
    });

    it("parses migration metadata correctly", () => {
      const migrations = loadMigrations();
      const [initial] = migrations;

      expect(initial.filename).toBe("001_initial.sql");
      expect(initial.sql).toContain("CREATE TABLE");
    });
  });

  describe("openDatabase", () => {
    it("creates database file if it does not exist", () => {
      const testDbPath = createTestDbPath();
      try {
        expect(existsSync(testDbPath)).toBeFalsy();

        const db = openDatabase({ path: testDbPath });

        expect(existsSync(testDbPath)).toBeTruthy();
        cleanupTestDb(testDbPath, db);
      } finally {
        cleanupTestDb(testDbPath);
      }
    });

    it("runs migrations by default", () => {
      const testDbPath = createTestDbPath();
      try {
        const db = openDatabase({ path: testDbPath });

        const version = getSchemaVersion(db);
        expect(version).toBeGreaterThan(0);
        cleanupTestDb(testDbPath, db);
      } finally {
        cleanupTestDb(testDbPath);
      }
    });

    it("skips migrations when migrate: false", () => {
      const testDbPath = createTestDbPath();
      try {
        const db = openDatabase({ path: testDbPath, migrate: false });

        // Schema version table won't exist, should return 0
        expect(getSchemaVersion(db)).toBe(0);
        cleanupTestDb(testDbPath, db);
      } finally {
        cleanupTestDb(testDbPath);
      }
    });

    it("configures WAL mode", () => {
      const testDbPath = createTestDbPath();
      try {
        const db = openDatabase({ path: testDbPath });

        const result = db.pragma("journal_mode") as {
          journal_mode: string;
        }[];
        expect(result[0].journal_mode).toBe("wal");
        cleanupTestDb(testDbPath, db);
      } finally {
        cleanupTestDb(testDbPath);
      }
    });

    it("enables foreign keys", () => {
      const testDbPath = createTestDbPath();
      try {
        const db = openDatabase({ path: testDbPath });

        const result = db.pragma("foreign_keys") as {
          foreign_keys: number;
        }[];
        expect(result[0].foreign_keys).toBe(1);
        cleanupTestDb(testDbPath, db);
      } finally {
        cleanupTestDb(testDbPath);
      }
    });
  });

  describe("migrate", () => {
    it("applies all migrations to fresh database", () => {
      const testDbPath = createTestDbPath();
      try {
        const db = openDatabase({ path: testDbPath, migrate: false });
        const migrations = loadMigrations();

        const applied = migrate(db);

        expect(applied).toBe(migrations.length);
        expect(getSchemaVersion(db)).toBe(migrations.length);
        cleanupTestDb(testDbPath, db);
      } finally {
        cleanupTestDb(testDbPath);
      }
    });

    it("skips already applied migrations", () => {
      const testDbPath = createTestDbPath();
      try {
        const db = openDatabase({ path: testDbPath });
        const firstVersion = getSchemaVersion(db);

        // Run migrations again
        const applied = migrate(db);

        expect(applied).toBe(0);
        expect(getSchemaVersion(db)).toBe(firstVersion);
        cleanupTestDb(testDbPath, db);
      } finally {
        cleanupTestDb(testDbPath);
      }
    });

    it("creates core tables", () => {
      const testDbPath = createTestDbPath();
      try {
        const db = openDatabase({ path: testDbPath });

        const tables = db
          .prepare(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
          )
          .all() as { name: string }[];
        const tableNames = tables.map((t) => t.name);

        // Check core tables exist
        expect(tableNames).toContain("nodes");
        expect(tableNames).toContain("edges");
        expect(tableNames).toContain("tags");
        expect(tableNames).toContain("lessons");
        expect(tableNames).toContain("schema_version");
        cleanupTestDb(testDbPath, db);
      } finally {
        cleanupTestDb(testDbPath);
      }
    });

    it("creates daemon and analytics tables", () => {
      const testDbPath = createTestDbPath();
      try {
        const db = openDatabase({ path: testDbPath });

        const tables = db
          .prepare(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
          )
          .all() as { name: string }[];
        const tableNames = tables.map((t) => t.name);

        expect(tableNames).toContain("analysis_queue");
        expect(tableNames).toContain("daemon_decisions");
        expect(tableNames).toContain("failure_patterns");
        expect(tableNames).toContain("model_stats");
        cleanupTestDb(testDbPath, db);
      } finally {
        cleanupTestDb(testDbPath);
      }
    });

    it("creates prompt learning tables", () => {
      const testDbPath = createTestDbPath();
      try {
        const db = openDatabase({ path: testDbPath });

        const tables = db
          .prepare(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
          )
          .all() as { name: string }[];
        const tableNames = tables.map((t) => t.name);

        expect(tableNames).toContain("aggregated_insights");
        expect(tableNames).toContain("prompt_effectiveness");
        cleanupTestDb(testDbPath, db);
      } finally {
        cleanupTestDb(testDbPath);
      }
    });

    it("creates prompt_effectiveness table with correct columns", () => {
      const testDbPath = createTestDbPath();
      try {
        const db = openDatabase({ path: testDbPath });

        const columns = db
          .prepare("PRAGMA table_info(prompt_effectiveness)")
          .all() as { name: string; type: string }[];
        const columnNames = columns.map((c) => c.name);

        // Core columns
        expect(columnNames).toContain("id");
        expect(columnNames).toContain("insight_id");
        expect(columnNames).toContain("prompt_version");

        // Before/after metrics
        expect(columnNames).toContain("before_occurrences");
        expect(columnNames).toContain("before_severity");
        expect(columnNames).toContain("after_occurrences");
        expect(columnNames).toContain("after_severity");

        // Period columns
        expect(columnNames).toContain("before_start");
        expect(columnNames).toContain("before_end");
        expect(columnNames).toContain("after_start");
        expect(columnNames).toContain("after_end");

        // Improvement metrics
        expect(columnNames).toContain("improvement_pct");
        expect(columnNames).toContain("statistically_significant");

        // Session counts
        expect(columnNames).toContain("sessions_before");
        expect(columnNames).toContain("sessions_after");

        // Timestamps
        expect(columnNames).toContain("measured_at");
        expect(columnNames).toContain("created_at");
        expect(columnNames).toContain("updated_at");

        cleanupTestDb(testDbPath, db);
      } finally {
        cleanupTestDb(testDbPath);
      }
    });

    it("creates prompt_effectiveness indexes", () => {
      const testDbPath = createTestDbPath();
      try {
        const db = openDatabase({ path: testDbPath });

        const indexes = db
          .prepare(
            "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_effectiveness%'"
          )
          .all() as { name: string }[];
        const indexNames = indexes.map((i) => i.name);

        expect(indexNames).toContain("idx_effectiveness_insight");
        expect(indexNames).toContain("idx_effectiveness_measured_at");
        expect(indexNames).toContain("idx_effectiveness_significant");
        expect(indexNames).toContain("idx_effectiveness_improvement");
        expect(indexNames).toContain("idx_effectiveness_unique");

        cleanupTestDb(testDbPath, db);
      } finally {
        cleanupTestDb(testDbPath);
      }
    });

    it("creates FTS virtual table", () => {
      const testDbPath = createTestDbPath();
      try {
        const db = openDatabase({ path: testDbPath });

        const tables = db
          .prepare(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='nodes_fts'"
          )
          .all();

        expect(tables).toHaveLength(1);
        cleanupTestDb(testDbPath, db);
      } finally {
        cleanupTestDb(testDbPath);
      }
    });

    it("creates node_embeddings_vec virtual table for semantic search", () => {
      const testDbPath = createTestDbPath();
      try {
        const db = openDatabase({ path: testDbPath });

        // Check virtual table exists
        const tables = db
          .prepare(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='node_embeddings_vec'"
          )
          .all();

        expect(tables).toHaveLength(1);

        // Verify we can insert and query vectors
        // First insert a node (required for foreign key)
        db.prepare(`
          INSERT INTO nodes (id, session_file, timestamp, analyzed_at, data_file)
          VALUES (?, ?, ?, ?, ?)
        `).run(
          "test-node-vec",
          "/test/session.jsonl",
          "2026-01-27T00:00:00Z",
          "2026-01-27T00:00:00Z",
          "/test/node.json"
        );

        // Insert an embedding into node_embeddings
        const testEmbedding = new Float32Array(4096);
        testEmbedding[0] = 0.1;
        testEmbedding[1] = 0.2;

        db.prepare(`
          INSERT INTO node_embeddings (node_id, embedding, embedding_model, input_text)
          VALUES (?, ?, ?, ?)
        `).run("test-node-vec", testEmbedding, "test-model", "test input");

        // Get the rowid
        const row = db
          .prepare("SELECT rowid FROM node_embeddings WHERE node_id = ?")
          .get("test-node-vec") as { rowid: number };

        // Insert into vec table - vec0 requires BigInt for rowid
        db.prepare(`
          INSERT INTO node_embeddings_vec (rowid, embedding)
          VALUES (?, ?)
        `).run(BigInt(row.rowid), testEmbedding);

        // Query the vec table
        const result = db
          .prepare(`
            SELECT rowid, distance 
            FROM node_embeddings_vec 
            WHERE embedding MATCH ? 
            ORDER BY distance 
            LIMIT 1
          `)
          .get(testEmbedding) as { rowid: bigint; distance: number };

        expect(result).toBeDefined();
        expect(Number(result.rowid)).toBe(row.rowid);
        expect(result.distance).toBeCloseTo(0);

        cleanupTestDb(testDbPath, db);
      } finally {
        cleanupTestDb(testDbPath);
      }
    });

    it("creates query performance indexes", () => {
      const testDbPath = createTestDbPath();
      try {
        const db = openDatabase({ path: testDbPath });

        const indexes = db
          .prepare(
            "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'"
          )
          .all() as { name: string }[];
        const indexNames = indexes.map((i) => i.name);

        expect(indexNames).toContain("idx_nodes_project");
        expect(indexNames).toContain("idx_nodes_type");
        expect(indexNames).toContain("idx_edges_source");
        expect(indexNames).toContain("idx_lessons_node");
        cleanupTestDb(testDbPath, db);
      } finally {
        cleanupTestDb(testDbPath);
      }
    });
  });

  describe("isDatabaseHealthy", () => {
    it("returns true for healthy database", () => {
      const testDbPath = createTestDbPath();
      try {
        const db = openDatabase({ path: testDbPath });

        expect(isDatabaseHealthy(db)).toBeTruthy();
        cleanupTestDb(testDbPath, db);
      } finally {
        cleanupTestDb(testDbPath);
      }
    });

    it("returns false for closed database", () => {
      const testDbPath = createTestDbPath();
      try {
        const db = openDatabase({ path: testDbPath });
        db.close();

        expect(isDatabaseHealthy(db)).toBeFalsy();
        cleanupTestDb(testDbPath);
      } finally {
        cleanupTestDb(testDbPath);
      }
    });
  });

  describe("closeDatabase", () => {
    it("closes the database connection", () => {
      const testDbPath = createTestDbPath();
      try {
        const db = openDatabase({ path: testDbPath });

        closeDatabase(db);

        expect(isDatabaseHealthy(db)).toBeFalsy();
        cleanupTestDb(testDbPath);
      } finally {
        cleanupTestDb(testDbPath);
      }
    });
  });

  describe("schema integrity", () => {
    it("enforces foreign key constraints", () => {
      const testDbPath = createTestDbPath();
      try {
        const db = openDatabase({ path: testDbPath });

        // Try to insert a tag referencing non-existent node
        expect(() => {
          db.prepare("INSERT INTO tags (node_id, tag) VALUES (?, ?)").run(
            "nonexistent",
            "test"
          );
        }).toThrow(/FOREIGN KEY constraint failed/);
        cleanupTestDb(testDbPath, db);
      } finally {
        cleanupTestDb(testDbPath);
      }
    });

    it("cascades deletes from nodes to tags", () => {
      const testDbPath = createTestDbPath();
      try {
        const db = openDatabase({ path: testDbPath });

        // Insert a node
        db.prepare(`
          INSERT INTO nodes (id, session_file, timestamp, analyzed_at, data_file)
          VALUES (?, ?, ?, ?, ?)
        `).run(
          "test-node",
          "/test/session.jsonl",
          "2026-01-25T00:00:00Z",
          "2026-01-25T00:00:00Z",
          "/test/node.json"
        );

        // Insert related tag
        db.prepare("INSERT INTO tags (node_id, tag) VALUES (?, ?)").run(
          "test-node",
          "test-tag"
        );

        // Delete the node
        db.prepare("DELETE FROM nodes WHERE id = ?").run("test-node");

        // Verify cascaded delete
        const tags = db
          .prepare("SELECT * FROM tags WHERE node_id = ?")
          .all("test-node");
        expect(tags).toHaveLength(0);
        cleanupTestDb(testDbPath, db);
      } finally {
        cleanupTestDb(testDbPath);
      }
    });

    it("cascades deletes from nodes to lessons", () => {
      const testDbPath = createTestDbPath();
      try {
        const db = openDatabase({ path: testDbPath });

        // Insert a node
        db.prepare(`
          INSERT INTO nodes (id, session_file, timestamp, analyzed_at, data_file)
          VALUES (?, ?, ?, ?, ?)
        `).run(
          "test-node",
          "/test/session.jsonl",
          "2026-01-25T00:00:00Z",
          "2026-01-25T00:00:00Z",
          "/test/node.json"
        );

        // Insert related lesson
        db.prepare(`
          INSERT INTO lessons (id, node_id, level, summary)
          VALUES (?, ?, ?, ?)
        `).run("lesson-1", "test-node", "project", "Test lesson");

        // Delete the node
        db.prepare("DELETE FROM nodes WHERE id = ?").run("test-node");

        // Verify cascaded delete
        const lessons = db
          .prepare("SELECT * FROM lessons WHERE node_id = ?")
          .all("test-node");
        expect(lessons).toHaveLength(0);
        cleanupTestDb(testDbPath, db);
      } finally {
        cleanupTestDb(testDbPath);
      }
    });

    it("enforces foreign key on prompt_effectiveness to aggregated_insights", () => {
      const testDbPath = createTestDbPath();
      try {
        const db = openDatabase({ path: testDbPath });

        // Try to insert effectiveness record referencing non-existent insight
        expect(() => {
          db.prepare(`
            INSERT INTO prompt_effectiveness (id, insight_id, prompt_version)
            VALUES (?, ?, ?)
          `).run("eff-1", "nonexistent-insight", "v1");
        }).toThrow(/FOREIGN KEY constraint failed/);
        cleanupTestDb(testDbPath, db);
      } finally {
        cleanupTestDb(testDbPath);
      }
    });

    it("cascades deletes from aggregated_insights to prompt_effectiveness", () => {
      const testDbPath = createTestDbPath();
      try {
        const db = openDatabase({ path: testDbPath });

        // Insert an insight
        db.prepare(`
          INSERT INTO aggregated_insights (id, type, pattern)
          VALUES (?, ?, ?)
        `).run("insight-1", "quirk", "Test pattern");

        // Insert related effectiveness record
        db.prepare(`
          INSERT INTO prompt_effectiveness (id, insight_id, prompt_version)
          VALUES (?, ?, ?)
        `).run("eff-1", "insight-1", "v1");

        // Delete the insight
        db.prepare("DELETE FROM aggregated_insights WHERE id = ?").run(
          "insight-1"
        );

        // Verify cascaded delete
        const effectiveness = db
          .prepare("SELECT * FROM prompt_effectiveness WHERE insight_id = ?")
          .all("insight-1");
        expect(effectiveness).toHaveLength(0);
        cleanupTestDb(testDbPath, db);
      } finally {
        cleanupTestDb(testDbPath);
      }
    });

    it("enforces unique constraint on (insight_id, prompt_version)", () => {
      const testDbPath = createTestDbPath();
      try {
        const db = openDatabase({ path: testDbPath });

        // Insert an insight
        db.prepare(`
          INSERT INTO aggregated_insights (id, type, pattern)
          VALUES (?, ?, ?)
        `).run("insight-1", "quirk", "Test pattern");

        // Insert first effectiveness record
        db.prepare(`
          INSERT INTO prompt_effectiveness (id, insight_id, prompt_version)
          VALUES (?, ?, ?)
        `).run("eff-1", "insight-1", "v1");

        // Try to insert duplicate (same insight_id + prompt_version)
        expect(() => {
          db.prepare(`
            INSERT INTO prompt_effectiveness (id, insight_id, prompt_version)
            VALUES (?, ?, ?)
          `).run("eff-2", "insight-1", "v1");
        }).toThrow(/UNIQUE constraint failed/);

        // Different prompt_version should succeed
        db.prepare(`
          INSERT INTO prompt_effectiveness (id, insight_id, prompt_version)
          VALUES (?, ?, ?)
        `).run("eff-3", "insight-1", "v2");

        cleanupTestDb(testDbPath, db);
      } finally {
        cleanupTestDb(testDbPath);
      }
    });
  });
});
