import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  // Only include the root directory for testing
  "./vitest.config.ts",
]);
