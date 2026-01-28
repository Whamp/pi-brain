/**
 * Tests for sqlite-vec extension loading
 */
import Database from "better-sqlite3";
import * as sqliteVec from "sqlite-vec";
import { describe, expect, it } from "vitest";

describe("sqlite-vec installation", () => {
  it("loads sqlite-vec extension successfully", () => {
    const db = new Database(":memory:");

    // Load extension - should not throw
    sqliteVec.load(db);

    // Verify extension is loaded by checking version
    const result = db.prepare("SELECT vec_version() as version").get() as {
      version: string;
    };
    expect(result.version).toMatch(/^v?\d+\.\d+/);

    db.close();
  });

  it("creates vec0 virtual table", () => {
    const db = new Database(":memory:");
    sqliteVec.load(db);

    // Create a virtual table with 4-dimensional vectors
    db.exec(`
      CREATE VIRTUAL TABLE test_vecs USING vec0(embedding float[4]);
    `);

    // Verify table exists
    const tables = db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='test_vecs'`
      )
      .get() as { name: string } | undefined;
    expect(tables?.name).toBe("test_vecs");

    db.close();
  });

  it("inserts and searches vectors", () => {
    const db = new Database(":memory:");
    sqliteVec.load(db);

    // Create table
    db.exec(`CREATE VIRTUAL TABLE test_vecs USING vec0(embedding float[4]);`);

    // Insert test vectors - vec0 requires BigInt for rowid
    const insert = db.prepare(
      `INSERT INTO test_vecs (rowid, embedding) VALUES (?, vec_f32(?))`
    );
    insert.run(1n, JSON.stringify([1, 0, 0, 0]));
    insert.run(2n, JSON.stringify([0, 1, 0, 0]));
    insert.run(3n, JSON.stringify([1, 1, 0, 0])); // More similar to query

    // Search for similar vectors
    const query = [1, 0.5, 0, 0];
    const results = db
      .prepare(
        `
        SELECT rowid, vec_distance_cosine(embedding, vec_f32(?)) as distance
        FROM test_vecs
        ORDER BY distance ASC
        LIMIT 3
      `
      )
      .all(JSON.stringify(query)) as { rowid: number; distance: number }[];

    // Expect rowid 3 (1,1,0,0) to be closest to (1,0.5,0,0)
    expect(results[0].rowid).toBe(3);
    expect(results[0].distance).toBeLessThan(results[1].distance);

    db.close();
  });

  it("handles dimension mismatch gracefully", () => {
    const db = new Database(":memory:");
    sqliteVec.load(db);

    // Create table with 4 dimensions
    db.exec(`CREATE VIRTUAL TABLE test_vecs USING vec0(embedding float[4]);`);

    // Try to insert wrong dimension - should throw
    const insert = db.prepare(
      `INSERT INTO test_vecs (rowid, embedding) VALUES (?, vec_f32(?))`
    );

    expect(() => insert.run(1n, JSON.stringify([1, 0]))).toThrow(
      "Dimension mismatch"
    );

    db.close();
  });
});
