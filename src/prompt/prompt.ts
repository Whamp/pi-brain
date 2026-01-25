/**
 * Prompt file management and versioning
 *
 * Handles:
 * - Prompt version calculation (hash-based)
 * - Archiving prompts to history
 * - Tracking versions in database
 * - Default prompt creation
 */

import type Database from "better-sqlite3";

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, copyFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

import type { PromptVersion, PromptVersionRecord } from "./types.js";

/**
 * Default prompts directory
 */
export const DEFAULT_PROMPTS_DIR = join(homedir(), ".pi-brain", "prompts");

/**
 * Default prompt file path
 */
export const DEFAULT_PROMPT_PATH = join(
  DEFAULT_PROMPTS_DIR,
  "session-analyzer.md"
);

/**
 * Default history directory
 */
export const DEFAULT_HISTORY_DIR = join(DEFAULT_PROMPTS_DIR, "history");

/**
 * Normalize prompt content for hashing
 *
 * This ensures that whitespace changes and HTML comments don't
 * unnecessarily trigger new versions.
 */
export function normalizePromptContent(content: string): string {
  return content
    .trim()
    .replaceAll(/<!--[\s\S]*?-->/g, "") // Remove HTML comments first
    .replaceAll(/\s+/g, " ") // Then collapse whitespace
    .trim(); // Trim any leftover edge whitespace
}

/**
 * Calculate the hash of prompt content
 *
 * Returns an 8-character hex prefix of SHA-256 hash
 */
export function calculatePromptHash(content: string): string {
  const normalized = normalizePromptContent(content);
  return createHash("sha256").update(normalized).digest("hex").slice(0, 8);
}

/**
 * Parse a version string into its components
 */
export function parseVersionString(
  version: string
): { sequential: number; hash: string } | null {
  const match = /^v(\d+)-([a-f0-9]{8})$/.exec(version);
  if (!match) {
    return null;
  }
  return {
    sequential: Number.parseInt(match[1], 10),
    hash: match[2],
  };
}

/**
 * Create a version string from components
 */
export function createVersionString(sequential: number, hash: string): string {
  return `v${sequential}-${hash}`;
}

/**
 * Get the archive filename for a version
 */
export function getArchiveFilename(version: string): string {
  const [date] = new Date().toISOString().split("T");
  return `${version}-${date}.md`;
}

/**
 * Ensure the prompts directory structure exists
 */
export function ensurePromptsDir(promptsDir?: string): void {
  const dir = promptsDir ?? DEFAULT_PROMPTS_DIR;
  const historyDir = join(dir, "history");

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  if (!existsSync(historyDir)) {
    mkdirSync(historyDir, { recursive: true });
  }
}

/**
 * Get prompt version by content hash from database
 */
export function getVersionByHash(
  db: Database.Database,
  hash: string
): PromptVersionRecord | null {
  const result = db
    .prepare("SELECT * FROM prompt_versions WHERE content_hash = ?")
    .get(hash) as PromptVersionRecord | undefined;
  return result ?? null;
}

/**
 * Get the latest prompt version from database
 */
export function getLatestVersion(
  db: Database.Database
): PromptVersionRecord | null {
  const result = db
    .prepare("SELECT * FROM prompt_versions ORDER BY created_at DESC LIMIT 1")
    .get() as PromptVersionRecord | undefined;
  return result ?? null;
}

/**
 * Get the next sequential version number
 */
export function getNextSequential(db: Database.Database): number {
  const result = db
    .prepare(`
      SELECT MAX(CAST(SUBSTR(version, 2, INSTR(version, '-') - 2) AS INTEGER)) as max_seq
      FROM prompt_versions
    `)
    .get() as { max_seq: number | null } | undefined;
  return (result?.max_seq ?? 0) + 1;
}

/**
 * Record a new prompt version in the database
 */
export function recordPromptVersion(
  db: Database.Database,
  version: PromptVersion,
  notes?: string
): void {
  db.prepare(`
    INSERT INTO prompt_versions (version, content_hash, created_at, file_path, notes)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    version.version,
    version.hash,
    version.createdAt,
    version.filePath,
    notes ?? null
  );
}

/**
 * Archive prompt to history directory
 */
export function archivePrompt(
  promptPath: string,
  historyDir: string,
  version: string
): string {
  ensurePromptsDir(dirname(promptPath));

  const filename = getArchiveFilename(version);
  const archivePath = join(historyDir, filename);

  copyFileSync(promptPath, archivePath);
  return archivePath;
}

/**
 * Get or create a prompt version
 *
 * If the current prompt has the same hash as an existing version,
 * returns that version. Otherwise, creates a new version, archives
 * the prompt, and records it in the database.
 */
export function getOrCreatePromptVersion(
  db: Database.Database,
  promptPath: string,
  historyDir?: string
): PromptVersion {
  const resolvedHistoryDir = historyDir ?? DEFAULT_HISTORY_DIR;

  // Read current prompt
  if (!existsSync(promptPath)) {
    throw new Error(`Prompt file not found: ${promptPath}`);
  }
  const content = readFileSync(promptPath, "utf8");
  const hash = calculatePromptHash(content);

  // Check if this hash already exists
  const existing = getVersionByHash(db, hash);
  if (existing) {
    const parsed = parseVersionString(existing.version);
    if (!parsed) {
      throw new Error(
        `Invalid version format in database: ${existing.version}`
      );
    }
    return {
      version: existing.version,
      sequential: parsed.sequential,
      hash: existing.content_hash,
      createdAt: existing.created_at,
      filePath: existing.file_path,
    };
  }

  // Create new version
  const sequential = getNextSequential(db);
  const version = createVersionString(sequential, hash);
  const createdAt = new Date().toISOString();

  // Archive the prompt
  const archivePath = archivePrompt(promptPath, resolvedHistoryDir, version);

  // Record in database
  const promptVersion: PromptVersion = {
    version,
    sequential,
    hash,
    createdAt,
    filePath: archivePath,
  };

  recordPromptVersion(db, promptVersion);

  return promptVersion;
}

/**
 * Compare two version strings
 *
 * Returns negative if a < b, positive if a > b, 0 if equal
 */
export function compareVersions(a: string, b: string): number {
  const parsedA = parseVersionString(a);
  const parsedB = parseVersionString(b);

  if (!parsedA || !parsedB) {
    // Fall back to string comparison if parsing fails
    return a.localeCompare(b);
  }

  return parsedA.sequential - parsedB.sequential;
}

/**
 * List all prompt versions from database
 */
export function listPromptVersions(db: Database.Database): PromptVersion[] {
  const rows = db
    .prepare("SELECT * FROM prompt_versions ORDER BY created_at DESC")
    .all() as PromptVersionRecord[];

  return rows.map((row) => {
    const parsed = parseVersionString(row.version);
    return {
      version: row.version,
      sequential: parsed?.sequential ?? 0,
      hash: row.content_hash,
      createdAt: row.created_at,
      filePath: row.file_path,
    };
  });
}

/**
 * Check if a prompt needs reanalysis
 *
 * Returns true if nodes exist that were analyzed with an older version
 */
export function hasOutdatedNodes(
  db: Database.Database,
  currentVersion: string
): boolean {
  const result = db
    .prepare(`
      SELECT COUNT(*) as count FROM nodes
      WHERE analyzer_version IS NOT NULL
        AND analyzer_version != ?
    `)
    .get(currentVersion) as { count: number };
  return result.count > 0;
}

/**
 * Get count of nodes needing reanalysis
 */
export function getOutdatedNodeCount(
  db: Database.Database,
  currentVersion: string
): number {
  const result = db
    .prepare(`
      SELECT COUNT(*) as count FROM nodes
      WHERE analyzer_version IS NOT NULL
        AND analyzer_version != ?
    `)
    .get(currentVersion) as { count: number };
  return result.count;
}
