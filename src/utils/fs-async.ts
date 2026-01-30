/**
 * Async filesystem helpers for pi-brain.
 *
 * This module provides async replacements for common sync fs operations.
 * Use these in async functions to avoid blocking the event loop.
 */

import { access, mkdir, readFile, writeFile } from "node:fs/promises";

/**
 * Check if a file or directory exists asynchronously.
 *
 * @param {string} path - Path to check
 * @returns {Promise<boolean>} Promise that resolves to true if path exists, false otherwise
 *
 * @example
 * ```typescript
 * if (await fileExists("/path/to/file.txt")) {
 *   const content = await readFile("/path/to/file.txt", "utf8");
 * }
 * ```
 */
export async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read a file if it exists, returning undefined if not.
 *
 * @param {string} path - Path to read
 * @param {BufferEncoding} encoding - File encoding (default: "utf8")
 * @returns {Promise<string | undefined>} Promise with file content or undefined if file doesn't exist
 *
 * @example
 * ```typescript
 * const content = await safeReadFile("/path/to/config.yaml");
 * if (content !== undefined) {
 *   // process content
 * }
 * ```
 */
export async function safeReadFile(
  path: string,
  encoding: BufferEncoding = "utf8"
): Promise<string | undefined> {
  try {
    return await readFile(path, encoding);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}

/**
 * Write a file, creating parent directories if needed.
 *
 * @param {string} path - Path to write
 * @param {string} content - Content to write
 * @param {BufferEncoding} encoding - File encoding (default: "utf8")
 *
 * @example
 * ```typescript
 * await safeWriteFile("/path/to/config.yaml", yamlContent);
 * ```
 */
export async function safeWriteFile(
  path: string,
  content: string,
  encoding: BufferEncoding = "utf8"
): Promise<void> {
  await writeFile(path, content, encoding);
}

/**
 * Ensure a directory exists, creating it if needed.
 *
 * @public
 * @param {string} path - Directory path to ensure exists
 *
 * @example
 * ```typescript
 * await ensureDir("/path/to/logs");
 * ```
 */
export async function ensureDir(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}
