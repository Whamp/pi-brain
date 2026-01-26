import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "src/**/*.test.ts",
      "src/**/*.test.js",
      "extensions/**/*.test.ts",
    ],
    exclude: ["node_modules", "dist", "src/web"],
  },
});
