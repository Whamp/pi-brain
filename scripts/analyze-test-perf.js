#!/usr/bin/env node
// Analyze test performance from vitest JSON output

import { readFileSync, existsSync } from "fs";

const RESULTS_FILE = "./reports/test-results.json";
const SLOW_THRESHOLD_MS = 300;

if (!existsSync(RESULTS_FILE)) {
  console.error(`No test results found at ${RESULTS_FILE}`);
  console.error("Run 'npm run test:perf' first to generate results.");
  process.exit(1);
}

const results = JSON.parse(readFileSync(RESULTS_FILE, "utf-8"));

// Extract all tests with timing
const tests = [];
for (const file of results.testResults || []) {
  for (const test of file.assertionResults || []) {
    tests.push({
      name: test.fullName || test.title,
      file: file.name,
      duration: test.duration || 0,
      status: test.status,
    });
  }
}

// Sort by duration (slowest first)
tests.sort((a, b) => b.duration - a.duration);

// Summary
const total = tests.length;
const passed = tests.filter((t) => t.status === "passed").length;
const failed = tests.filter((t) => t.status === "failed").length;
const slow = tests.filter((t) => t.duration > SLOW_THRESHOLD_MS).length;
const totalTime = tests.reduce((sum, t) => sum + t.duration, 0);

console.log("\n📊 Test Performance Report\n");
console.log(`Total tests: ${total}`);
console.log(`Passed: ${passed} | Failed: ${failed}`);
console.log(`Total time: ${(totalTime / 1000).toFixed(2)}s`);
console.log(`Slow tests (>${SLOW_THRESHOLD_MS}ms): ${slow}\n`);

// Top 10 slowest tests
console.log("🐢 Top 10 Slowest Tests:\n");
console.log("Duration  | Test");
console.log("----------|" + "-".repeat(60));

for (const test of tests.slice(0, 10)) {
  const duration = `${test.duration}ms`.padEnd(8);
  const name = test.name.length > 55 ? test.name.slice(0, 52) + "..." : test.name;
  const marker = test.duration > SLOW_THRESHOLD_MS ? "⚠️ " : "  ";
  console.log(`${marker}${duration} | ${name}`);
}

// Warn about slow tests
if (slow > 0) {
  console.log(`\n⚠️  ${slow} test(s) exceed ${SLOW_THRESHOLD_MS}ms threshold`);
}
