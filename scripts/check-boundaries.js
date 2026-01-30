#!/usr/bin/env node
/**
 * Code Boundary Check Script for Agent Workflows
 *
 * Checks architectural boundaries using dependency-cruiser
 * Returns structured JSON output for automated processing
 *
 * Usage:
 *   node scripts/check-boundaries.js
 *   node scripts/check-boundaries.js --format summary
 *   node scripts/check-boundaries.js --focus src/daemon
 */

import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

function runDepcruise(args = "") {
  try {
    const output = execSync(
      `npx depcruise src extensions ${args} --output-type json`,
      {
        cwd: ROOT,
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      }
    );
    return { success: true, output: JSON.parse(output) };
  } catch (error) {
    // depcruise exits with code 1 if violations found, but still outputs JSON
    if (error.stdout) {
      try {
        return { success: false, output: JSON.parse(error.stdout) };
      } catch {
        return { success: false, error: error.stdout };
      }
    }
    return { success: false, error: error.message };
  }
}

function buildViolationReport(violations) {
  return violations.slice(0, 20).map((v) => ({
    rule: v.rule?.name || "unknown",
    severity: v.rule?.severity || "error",
    message: v.rule?.comment || "No message",
    from: v.from,
    to: v.to,
  }));
}

function buildSummaryStats(summary, violations) {
  const errorViolations = violations.filter(
    (v) => v.rule?.severity === "error"
  );
  return {
    status: errorViolations.length > 0 ? "violations-found" : "clean",
    summary: {
      totalViolations: violations.length,
      errors: summary.error || 0,
      warnings: summary.warn || 0,
      info: summary.info || 0,
      modules: summary.totalCruised || 0,
      dependencies: summary.totalDependenciesCruised || 0,
    },
    violations: buildViolationReport(violations),
  };
}

function formatSummary(result) {
  if (!result.output?.summary) {
    return {
      status: "error",
      message: result.error || "Failed to analyze",
    };
  }

  const { summary } = result.output;
  const violations = summary.violations || [];
  return buildSummaryStats(summary, violations);
}

function parseArgs(args) {
  const format = args.includes("--format")
    ? args[args.indexOf("--format") + 1]
    : "summary";
  const focusArg = args.includes("--focus")
    ? `--focus "${args[args.indexOf("--focus") + 1]}"`
    : "";
  return { format, focusArg };
}

function hasErrorsInViolations(violations) {
  return violations.some((v) => v.rule?.severity === "error");
}

function outputSummary(result) {
  const summary = formatSummary(result);
  console.log(JSON.stringify(summary, null, 2));
  const shouldExitError = summary.summary?.errors > 0;
  process.exit(shouldExitError ? 1 : 0);
}

function outputFull(result) {
  console.log(
    JSON.stringify(result.output || { error: result.error }, null, 2)
  );
  const violations = result.output?.summary?.violations || [];
  const shouldExitError = hasErrorsInViolations(violations);
  process.exit(shouldExitError ? 1 : 0);
}

function main() {
  const args = process.argv.slice(2);
  const { format, focusArg } = parseArgs(args);
  const result = runDepcruise(focusArg);

  if (format === "summary") {
    outputSummary(result);
  } else {
    outputFull(result);
  }
}

main();
