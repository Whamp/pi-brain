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
  loadVecExtension(db);

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
 * Run pending migrations
 */
export function migrate(db: Database.Database): number {
  const currentVersion = getSchemaVersion(db);
  const migrations = loadMigrations();
  let appliedCount = 0;

  for (const migration of migrations) {
    if (migration.version <= currentVersion) {
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
    const result = db.prepare("SELECT vec_version() as version").get() as {
      version: string;
    };
    return !!result.version;
  } catch {
    return false;
  }
}
