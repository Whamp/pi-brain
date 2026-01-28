import type Database from "better-sqlite3";

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect, afterEach } from "vitest";

import { openDatabase, closeDatabase, isVecLoaded } from "./database";

describe("database Vector Extension", () => {
  let tempDir: string | undefined;
  let db: Database.Database | undefined;

  afterEach(() => {
    if (db) {
      try {
        closeDatabase(db);
      } catch {
        // Ignore close errors during cleanup
      }
      db = undefined;
    }
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
      tempDir = undefined;
    }
  });

  it("should load sqlite-vec extension on open", () => {
    tempDir = mkdtempSync(join(tmpdir(), "pi-brain-vec-test-"));
    const dbPath = join(tempDir, "test.db");

    db = openDatabase({ path: dbPath, migrate: false });

    expect(isVecLoaded(db)).toBeTruthy();

    // Verify we can actually use vector functions
    const version = db.prepare("SELECT vec_version() as v").get() as {
      v: string;
    };
    expect(version.v).toBeDefined();
    expect(typeof version.v).toBe("string");

    // Verify basic vector operations
    // Create a virtual table (needs memory or temp db, but we have a file db)
    db.exec("CREATE VIRTUAL TABLE vec_test USING vec0(embedding float[2])");

    // Insert
    db.prepare("INSERT INTO vec_test(rowid, embedding) VALUES (1, ?)").run(
      new Float32Array([0.1, 0.2])
    );

    // Query
    const result = db
      .prepare(`
        SELECT rowid, distance 
        FROM vec_test 
        WHERE embedding MATCH ? 
        ORDER BY distance 
        LIMIT 1
      `)
      .get(new Float32Array([0.1, 0.2])) as {
      rowid: number;
      distance: number;
    };

    expect(result).toBeDefined();
    expect(Number(result.rowid)).toBe(1); // vec0 rowids are BigInts usually, but check type
    expect(result.distance).toBeCloseTo(0);
  });
});
