#!/usr/bin/env node
/**
 * Launch script for pi-brain
 * Builds if needed, starts daemon, starts web UI, opens browser
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import open from "open";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");
const distDir = path.join(rootDir, "dist");

const DAEMON_PORT = 8765;
const WEB_PORT = 5173;
const DAEMON_URL = `http://localhost:${DAEMON_PORT}`;
const WEB_URL = `http://localhost:${WEB_PORT}`;

// ANSI colors
const c = {
  reset: "\u001B[0m",
  bright: "\u001B[1m",
  dim: "\u001B[2m",
  green: "\u001B[32m",
  yellow: "\u001B[33m",
  blue: "\u001B[34m",
  cyan: "\u001B[36m",
};

function log(message, color = "reset") {
  console.log(`${c[color]}${message}${c.reset}`);
}

function logStep(step, message) {
  console.log(`${c.bright}${c.cyan}[${step}]${c.reset} ${message}`);
}

// Check if daemon is healthy
async function isDaemonReady() {
  try {
    const response = await fetch(`${DAEMON_URL}/api/v1/daemon/status`);
    return response.ok;
  } catch {
    return false;
  }
}

// Wait for daemon with timeout
async function waitForDaemon(maxSeconds = 30) {
  logStep("WAIT", "Waiting for daemon to be ready...");
  const start = Date.now();
  while (Date.now() - start < maxSeconds * 1000) {
    if (await isDaemonReady()) {
      log("  Daemon is ready!", "green");
      return true;
    }
    await new Promise((resolve) => {
      setTimeout(resolve, 500);
    });
  }
  throw new Error(`Daemon failed to start within ${maxSeconds}s`);
}

// Run a command and return promise
function runCommand(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, {
      stdio: options.silent ? "ignore" : "inherit",
      ...options,
    });

    if (options.detached) {
      proc.unref();
      resolve(proc);
      return;
    }

    proc.on("close", (code) => {
      if (code !== 0 && code !== null) {
        reject(new Error(`Command failed with exit code ${code}`));
      } else {
        resolve(proc);
      }
    });

    proc.on("error", reject);
  });
}

// Build if needed
async function buildIfNeeded() {
  if (existsSync(distDir)) {
    logStep("BUILD", "Using existing build (run 'npm run build' to rebuild)");
  } else {
    logStep("BUILD", "Building project (first time)...");
    await runCommand("npm", ["run", "build"], { cwd: rootDir });
    log("  Build complete!", "green");
  }
}

// Start daemon
function startDaemon() {
  logStep("DAEMON", "Starting background daemon...");

  const daemonProc = spawn(
    "node",
    [path.join(distDir, "src/daemon/daemon-process.js"), "--force"],
    {
      detached: true,
      stdio: "ignore",
    }
  );

  daemonProc.unref();
  log(`  Daemon started (PID: ${daemonProc.pid})`, "dim");

  return daemonProc;
}

// Start web UI
function startWeb() {
  logStep("WEB", "Starting web dashboard...");
  return spawn("npm", ["run", "web:dev"], {
    cwd: rootDir,
    stdio: "inherit",
  });
}

// Cleanup function
function cleanup(daemonProc) {
  log(`\n${c.yellow}Shutting down...${c.reset}`);
  if (daemonProc) {
    try {
      process.kill(-daemonProc.pid, "SIGTERM");
    } catch {
      // Ignore errors
    }
  }
  process.exit(0);
}

// Main
async function main() {
  console.log(`\n${c.bright}${c.cyan}🧠 pi-brain launcher${c.reset}\n`);

  let daemonProc = null;

  try {
    // Handle cleanup
    process.on("SIGINT", () => {
      cleanup(daemonProc);
    });
    process.on("SIGTERM", () => {
      cleanup(daemonProc);
    });

    // Build if needed
    await buildIfNeeded();

    // Start daemon
    daemonProc = await startDaemon();

    // Wait for daemon
    await waitForDaemon();

    // Open browser
    logStep("OPEN", `Opening ${WEB_URL} in browser...`);
    await open(WEB_URL);

    // Start web (this blocks)
    log(`\n${c.green}${c.bright}✓ pi-brain is running!${c.reset}`);
    log(`${c.dim}  Daemon:${c.reset} ${DAEMON_URL}`);
    log(`${c.dim}  Web UI:${c.reset} ${WEB_URL}`);
    log(`${c.dim}  Press Ctrl+C to stop${c.reset}\n`);

    const webProc = startWeb();

    // Wait for web process
    await new Promise((resolve) => {
      webProc.on("close", resolve);
    });
  } catch (error) {
    console.error(`${c.yellow}\nError: ${error.message}${c.reset}`);
    cleanup(daemonProc);
    process.exit(1);
  }
}

main();
