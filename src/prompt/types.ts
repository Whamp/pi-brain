/**
 * Types for prompt versioning and management
 */

/**
 * Prompt version information
 */
export interface PromptVersion {
  /** Full version string, e.g., "v1-a1b2c3d4" */
  version: string;

  /** Sequential version number (1, 2, 3, ...) */
  sequential: number;

  /** 8-character SHA-256 hash prefix of normalized content */
  hash: string;

  /** When this version was created */
  createdAt: string;

  /** Path to archived prompt file */
  filePath: string;
}

/**
 * Prompt info retrieved from database
 */
export interface PromptVersionRecord {
  version: string;
  content_hash: string;
  created_at: string;
  file_path: string;
  notes: string | null;
}
