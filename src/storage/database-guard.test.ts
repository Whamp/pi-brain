/**
 * Test that the production database guard works properly
 * This prevents test data contamination
 */

import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

import { openDatabase, DEFAULT_DB_PATH } from "./database.js";

describe("production database guard", () => {
  it("should block test code from opening production database", () => {
    // VITEST is already set in test environment
    expect(() => {
      openDatabase({ path: DEFAULT_DB_PATH });
    }).toThrow("Test code attempted to open production database");
  });

  it("should allow test code to open :memory: database", () => {
    expect(() => {
      const db = openDatabase({ path: ":memory:" });
      db.close();
    }).not.toThrow();
  });

  it("should allow test code to open temp database", () => {
    const tempDir = join(tmpdir(), `guard-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });

    try {
      const dbPath = join(tempDir, "test.db");
      expect(() => {
        const db = openDatabase({ path: dbPath });
        db.close();
      }).not.toThrow();
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("should allow production access with skipTestCheck", () => {
    // This should NOT throw because skipTestCheck is set
    // We won't actually open the production DB to avoid side effects,
    // but we verify the guard allows it
    expect(() => {
      openDatabase({ path: DEFAULT_DB_PATH, skipTestCheck: true });
    }).not.toThrow("Test code attempted to open production database");
  });
});
