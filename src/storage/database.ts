/**
 * Database connection and migration management
 */

import Database from "better-sqlite3";
import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as sqliteVec from "sqlite-vec";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Default pi-brain data directory */
export const DEFAULT_DATA_DIR = join(homedir(), ".pi-brain", "data");

/** Default database path */
export const DEFAULT_DB_PATH = join(DEFAULT_DATA_DIR, "brain.db");

export interface DatabaseOptions {
  /** Path to SQLite database file */
  path?: string;
  /** Enable verbose logging */
  verbose?: boolean;
  /** Run migrations on open */
  migrate?: boolean;
  /**
   * Load sqlite-vec extension for vector operations.
   * - true (default): Load extension, throw if it fails
   * - false: Skip loading the extension
   * - 'optional': Load extension but don't throw on failure
   */
  loadVec?: boolean | "optional";
}

export interface MigrationInfo {
  version: number;
  filename: string;
  sql: string;
  description: string;
}

/**
 * Open or create the pi-brain database
 */
export function openDatabase(options: DatabaseOptions = {}): Database.Database {
  const dbPath = options.path ?? DEFAULT_DB_PATH;

  // Ensure directory exists
  const dir = dirname(dbPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // Open database
  const db = new Database(dbPath, {
    verbose: options.verbose ? console.log : undefined,
  });

  // Configure for performance
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.pragma("foreign_keys = ON");

  // Load sqlite-vec extension
  const loadVecOption = options.loadVec ?? true;
  if (loadVecOption !== false) {
    const loaded = loadVecExtension(db);
    if (!loaded && loadVecOption === true) {
      db.close();
      throw new Error(
        "Failed to load sqlite-vec extension. Semantic search will not work. " +
          "Set loadVec: false to disable, or loadVec: 'optional' to continue without it."
      );
    }
  }

  // Run migrations if requested (default: true)
  if (options.migrate !== false) {
    migrate(db);
  }

  return db;
}

/**
 * Load migrations from the migrations directory
 */
export function loadMigrations(): MigrationInfo[] {
  const migrationsDir = join(__dirname, "migrations");
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .toSorted();

  const migrations: MigrationInfo[] = [];

  for (const filename of files) {
    // Extract version number from filename (e.g., "001_initial.sql" → 1)
    const match = /^(\d+)_(.+)\.sql$/.exec(filename);
    if (!match) {
      continue;
    }

    const version = Number.parseInt(match[1], 10);
    const description = match[2].replaceAll("_", " ");
    const sql = readFileSync(join(migrationsDir, filename), "utf8");

    migrations.push({ version, filename, sql, description });
  }

  return migrations;
}

/**
 * Get current schema version
 */
export function getSchemaVersion(db: Database.Database): number {
  try {
    const result = db
      .prepare("SELECT MAX(version) as version FROM schema_version")
      .get() as { version: number | null } | undefined;
    return result?.version ?? 0;
  } catch {
    // Table doesn't exist yet
    return 0;
  }
}

/**
 * Check if a specific migration was skipped due to missing dependencies.
 * Returns the requirement that caused it to be skipped, or null if not skipped.
 */
export function getMigrationSkippedReason(
  db: Database.Database,
  version: number
): string | null {
  try {
    const result = db
      .prepare(
        "SELECT description FROM schema_version WHERE version = ? AND description LIKE '%skipped:%'"
      )
      .get(version) as { description: string } | undefined;

    if (!result) {
      return null;
    }

    // Extract requirement from description like "semantic search (skipped: sqlite-vec not available)"
    const match = /\(skipped: (.+?)\)/.exec(result.description);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Parse a migration SQL file for REQUIRES directives.
 * Format: -- REQUIRES: requirement1, requirement2
 * Returns array of requirements (e.g., ['sqlite-vec'])
 */
export function parseMigrationRequirements(sql: string): string[] {
  const lines = sql.split("\n");
  for (const line of lines) {
    const match = /^--\s*REQUIRES:\s*(.+)$/i.exec(line.trim());
    if (match) {
      return match[1].split(",").map((r) => r.trim());
    }
  }
  return [];
}

/**
 * Check if migration requirements are satisfied.
 * Returns unsatisfied requirement, or null if all satisfied.
 */
export function checkMigrationRequirements(
  db: Database.Database,
  requirements: string[]
): string | null {
  for (const req of requirements) {
    if (req === "sqlite-vec" && !isVecLoaded(db)) {
      return "sqlite-vec not available";
    }
    // Add more requirement checks here as needed
  }
  return null;
}

/**
 * Run pending migrations
 */
export function migrate(db: Database.Database): number {
  const currentVersion = getSchemaVersion(db);
  const migrations = loadMigrations();
  let appliedCount = 0;

  for (const migration of migrations) {
    // Check if this migration was previously skipped and can now be retried
    const skippedReason = getMigrationSkippedReason(db, migration.version);
    if (skippedReason) {
      // Migration was skipped before - check if dependency is now available
      const requirements = parseMigrationRequirements(migration.sql);
      const unsatisfied = checkMigrationRequirements(db, requirements);

      if (unsatisfied) {
        // Still can't run this migration
        continue;
      }

      // Dependency is now available! Remove the skipped record and apply
      db.prepare("DELETE FROM schema_version WHERE version = ?").run(
        migration.version
      );
    } else if (migration.version <= currentVersion) {
      // Already applied and not skipped
      continue;
    }

    // Check requirements from SQL directive (-- REQUIRES: sqlite-vec)
    const requirements = parseMigrationRequirements(migration.sql);
    const unsatisfied = checkMigrationRequirements(db, requirements);

    if (unsatisfied) {
      // Record migration as skipped with the reason
      db.prepare(
        "INSERT INTO schema_version (version, description) VALUES (?, ?)"
      ).run(
        migration.version,
        `${migration.description} (skipped: ${unsatisfied})`
      );
      appliedCount++;
      continue;
    }

    // Apply migration in a transaction
    db.transaction(() => {
      db.exec(migration.sql);

      // Record migration (schema_version table is created in migration 001)
      db.prepare(
        "INSERT INTO schema_version (version, description) VALUES (?, ?)"
      ).run(migration.version, migration.description);
    })();

    appliedCount++;
  }

  return appliedCount;
}

/**
 * Close the database connection
 */
export function closeDatabase(db: Database.Database): void {
  db.close();
}

/**
 * Check if the database is healthy
 */
export function isDatabaseHealthy(db: Database.Database): boolean {
  try {
    const result = db.prepare("SELECT 1 as ok").get() as { ok: number };
    return result.ok === 1;
  } catch {
    return false;
  }
}

/**
 * Load the sqlite-vec extension
 */
export function loadVecExtension(db: Database.Database): boolean {
  try {
    sqliteVec.load(db);
    return true;
  } catch (error) {
    console.warn("Failed to load sqlite-vec extension:", error);
    return false;
  }
}

/**
 * Check if sqlite-vec extension is loaded
 */
export function isVecLoaded(db: Database.Database): boolean {
  try {
    const result = db.prepare("SELECT vec_version() as version").get() as
      | {
          version: string | null;
        }
      | undefined;
    return typeof result?.version === "string" && result.version.length > 0;
  } catch {
    return false;
  }
}
