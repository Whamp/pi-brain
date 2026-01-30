#!/usr/bin/env node
/**
 * Documentation Generator for pi-brain
 *
 * This script generates structured API documentation using API Extractor.
 * It produces:
 * 1. JSON doc model (docs/api/pi-brain.api.json) - for programmatic consumption
 * 2. Markdown API reference (docs/api/markdown/) - for human reading
 * 3. API report (docs/api/reports/) - for API review workflows
 *
 * Usage:
 *   node scripts/generate-docs.js
 *   node scripts/generate-docs.js --watch
 *   node scripts/generate-docs.js --agent-only
 */

import { spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");

// Parse arguments
const args = new Set(process.argv.slice(2));
const watchMode = args.has("--watch");
const agentOnly = args.has("--agent-only");
const verbose = args.has("--verbose") || args.has("-v");

/**
 * Execute a command and return a promise
 */
function execCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    if (verbose) {
      console.log(`Running: ${command} ${args.join(" ")}`);
    }

    const child = spawn(command, args, {
      stdio: verbose ? "inherit" : "pipe",
      cwd: rootDir,
      ...options,
    });

    let stdout = "";
    let stderr = "";

    if (!verbose) {
      child.stdout?.on("data", (data) => {
        stdout += data.toString();
      });
      child.stderr?.on("data", (data) => {
        stderr += data.toString();
      });
    }

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr, code });
      } else {
        reject(
          new Error(`Command failed with code ${code}: ${stderr || stdout}`)
        );
      }
    });
  });
}

/**
 * Ensure directory exists
 */
function ensureDir(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * Generate documentation
 */
async function generateDocs() {
  console.log("🔧 Building project...");
  await execCommand("npm", ["run", "build"]);

  console.log("📦 Extracting API...");
  await execCommand("npx", ["api-extractor", "run", "--local", "--verbose"]);

  if (!agentOnly) {
    console.log("📝 Generating Markdown documentation...");
    ensureDir(join(rootDir, "docs/api/markdown"));

    try {
      await execCommand("npx", [
        "api-documenter",
        "markdown",
        "--input-folder",
        join(rootDir, "docs/api"),
        "--output-folder",
        join(rootDir, "docs/api/markdown"),
      ]);
    } catch (error) {
      console.warn(
        "⚠️  Markdown generation failed (this is OK if no .api.json exists yet):",
        error.message
      );
    }
  }

  console.log("✅ Documentation generated successfully!");
  console.log("");
  console.log("Output locations:");
  console.log("  📄 JSON Doc Model: docs/api/pi-brain.api.json");
  console.log("  📊 API Report:     docs/api/reports/pi-brain.api.md");
  if (!agentOnly) {
    console.log("  📖 Markdown Docs:  docs/api/markdown/");
  }
  console.log("");
  console.log(
    "For agents: Import the JSON doc model to explore the API programmatically."
  );
}

// Main execution
(async () => {
  try {
    console.log("🚀 pi-brain Documentation Generator");
    console.log("=====================================\n");

    ensureDir(join(rootDir, "docs/api"));
    ensureDir(join(rootDir, "temp"));

    if (watchMode) {
      console.log("👀 Watch mode enabled. Press Ctrl+C to stop.\n");

      // Initial generation
      await generateDocs();

      // Set up file watcher
      const chokidar = await import("chokidar");
      const watcher = chokidar.watch(join(rootDir, "src/**/*.ts"), {
        ignored: /node_modules/,
        persistent: true,
      });

      let debounceTimer = null;
      watcher.on("change", () => {
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }
        debounceTimer = setTimeout(async () => {
          console.log("\n🔄 File changed, regenerating...\n");
          try {
            await generateDocs();
          } catch (error) {
            console.error(error);
          }
        }, 1000);
      });
    } else {
      await generateDocs();
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
})();
