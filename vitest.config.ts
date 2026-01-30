import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "src/**/*.test.ts",
      "src/**/*.test.js",
      "extensions/**/*.test.ts",
    ],
    exclude: ["node_modules", "dist", "src/web"],

    // Performance tracking
    reporters: ["default", "json", "hanging-process"],
    outputFile: {
      json: "./reports/test-results.json",
    },
    slowTestThreshold: 300, // Flag tests slower than 300ms
    logHeapUsage: true, // Track memory usage
    testTimeout: 10_000, // 10s default timeout
    hookTimeout: 10_000,

    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      reportsDirectory: "./reports/coverage",
      include: ["src/**/*.ts", "extensions/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.d.ts",
        "src/web/**",
        "node_modules/**",
        "dist/**",
      ],
      thresholds: {
        // Start with achievable thresholds, increase over time
        lines: 50,
        functions: 50,
        branches: 50,
        statements: 50,
      },
    },
  },
});
