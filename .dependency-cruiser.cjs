/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    // ============================================================================
    // CORE ARCHITECTURAL BOUNDARIES
    // ============================================================================

    {
      name: "no-web-to-daemon",
      comment: "Web UI must not import from daemon directly - use API client",
      severity: "error",
      from: { path: "^src/web" },
      to: { path: "^src/daemon" },
    },
    {
      name: "no-web-to-storage",
      comment: "Web UI must not import from storage directly - use API client",
      severity: "error",
      from: { path: "^src/web" },
      to: { path: "^src/storage" },
    },
    {
      name: "no-web-to-parser",
      comment: "Web UI must not import from parser - use API client",
      severity: "error",
      from: { path: "^src/web" },
      to: { path: "^src/parser" },
    },
    {
      name: "no-web-to-prompt",
      comment: "Web UI must not import from prompt - use API client",
      severity: "error",
      from: { path: "^src/web" },
      to: { path: "^src/prompt" },
    },

    // ============================================================================
    // API LAYER BOUNDARIES
    // ============================================================================

    {
      name: "api-may-use-daemon",
      comment: "API can depend on daemon (allowed)",
      severity: "ignore",
      from: { path: "^src/api" },
      to: { path: "^src/daemon" },
    },
    {
      name: "api-may-use-storage",
      comment: "API can depend on storage (allowed)",
      severity: "ignore",
      from: { path: "^src/api" },
      to: { path: "^src/storage" },
    },
    {
      name: "api-may-use-parser",
      comment: "API can depend on parser (allowed)",
      severity: "ignore",
      from: { path: "^src/api" },
      to: { path: "^src/parser" },
    },

    // ============================================================================
    // DAEMON LAYER BOUNDARIES
    // ============================================================================

    {
      name: "no-daemon-to-api",
      comment:
        "Daemon must not import from API layer (circular dependency risk)",
      severity: "error",
      from: {
        path: "^src/daemon",
        pathNot: "^src/daemon/daemon-process\\.ts$",
      },
      to: { path: "^src/api" },
    },
    {
      name: "no-daemon-to-web",
      comment: "Daemon must not import from web layer",
      severity: "error",
      from: { path: "^src/daemon" },
      to: { path: "^src/web" },
    },
    {
      name: "daemon-may-use-storage",
      comment: "Daemon can depend on storage (allowed)",
      severity: "ignore",
      from: { path: "^src/daemon" },
      to: { path: "^src/storage" },
    },
    {
      name: "daemon-may-use-parser",
      comment: "Daemon can depend on parser (allowed)",
      severity: "ignore",
      from: { path: "^src/daemon" },
      to: { path: "^src/parser" },
    },
    {
      name: "daemon-may-use-prompt",
      comment: "Daemon can depend on prompt (allowed)",
      severity: "ignore",
      from: { path: "^src/daemon" },
      to: { path: "^src/prompt" },
    },

    // ============================================================================
    // STORAGE LAYER BOUNDARIES (Bottom Layer - No Upward Dependencies)
    // ============================================================================

    {
      name: "no-storage-to-daemon",
      comment: "Storage must not import from daemon (bottom layer principle)",
      severity: "error",
      from: { path: "^src/storage" },
      to: { path: "^src/daemon", pathNot: "^src/daemon/types\\.ts$" },
    },
    {
      name: "no-storage-to-api",
      comment: "Storage must not import from API (bottom layer principle)",
      severity: "error",
      from: { path: "^src/storage" },
      to: { path: "^src/api" },
    },
    {
      name: "no-storage-to-web",
      comment: "Storage must not import from web (bottom layer principle)",
      severity: "error",
      from: { path: "^src/storage" },
      to: { path: "^src/web" },
    },
    {
      name: "no-storage-to-parser",
      comment: "Storage must not import from parser (keep layers separate)",
      severity: "error",
      from: { path: "^src/storage" },
      to: { path: "^src/parser" },
    },
    {
      name: "no-storage-to-prompt",
      comment: "Storage must not import from prompt (bottom layer principle)",
      severity: "error",
      from: { path: "^src/storage" },
      to: { path: "^src/prompt" },
    },

    // ============================================================================
    // PARSER LAYER BOUNDARIES (Should be isolated)
    // ============================================================================

    {
      name: "no-parser-to-daemon",
      comment: "Parser must not import from daemon (keep parsing isolated)",
      severity: "error",
      from: { path: "^src/parser" },
      to: { path: "^src/daemon" },
    },
    {
      name: "no-parser-to-api",
      comment: "Parser must not import from API (keep parsing isolated)",
      severity: "error",
      from: { path: "^src/parser" },
      to: { path: "^src/api" },
    },
    {
      name: "no-parser-to-storage",
      comment: "Parser must not import from storage (keep parsing isolated)",
      severity: "error",
      from: { path: "^src/parser" },
      to: { path: "^src/storage" },
    },
    {
      name: "no-parser-to-web",
      comment: "Parser must not import from web (keep parsing isolated)",
      severity: "error",
      from: { path: "^src/parser" },
      to: { path: "^src/web" },
    },
    {
      name: "no-parser-to-prompt",
      comment: "Parser must not import from prompt (keep parsing isolated)",
      severity: "error",
      from: { path: "^src/parser" },
      to: { path: "^src/prompt" },
    },

    // ============================================================================
    // PROMPT LAYER BOUNDARIES
    // ============================================================================

    {
      name: "no-prompt-to-daemon",
      comment: "Prompt must not import from daemon",
      severity: "error",
      from: { path: "^src/prompt" },
      to: { path: "^src/daemon" },
    },
    {
      name: "no-prompt-to-api",
      comment: "Prompt must not import from API",
      severity: "error",
      from: { path: "^src/prompt" },
      to: { path: "^src/api" },
    },
    {
      name: "no-prompt-to-web",
      comment: "Prompt must not import from web",
      severity: "error",
      from: { path: "^src/prompt" },
      to: { path: "^src/web" },
    },
    {
      name: "prompt-may-use-storage",
      comment: "Prompt can depend on storage for context (allowed)",
      severity: "ignore",
      from: { path: "^src/prompt" },
      to: { path: "^src/storage" },
    },
    {
      name: "prompt-may-use-parser",
      comment: "Prompt can depend on parser for session analysis (allowed)",
      severity: "ignore",
      from: { path: "^src/prompt" },
      to: { path: "^src/parser" },
    },

    // ============================================================================
    // EXTENSIONS BOUNDARIES
    // ============================================================================

    {
      name: "extensions-limited-deps",
      comment:
        "Extensions should have minimal dependencies - primarily types and config",
      severity: "warn",
      from: { path: "^extensions/" },
      to: { path: "^src/(daemon|storage|parser|prompt|web)" },
    },
    {
      name: "extensions-may-use-api",
      comment: "Extensions can use API types/responses",
      severity: "ignore",
      from: { path: "^extensions/" },
      to: { path: "^src/api/responses" },
    },
    {
      name: "extensions-may-use-types",
      comment: "Extensions can use shared types",
      severity: "ignore",
      from: { path: "^extensions/" },
      to: { path: "^src/types" },
    },

    // ============================================================================
    // SYNC LAYER BOUNDARIES
    // ============================================================================

    {
      name: "sync-isolated",
      comment: "Sync should be isolated - only use config and types",
      severity: "warn",
      from: { path: "^src/sync" },
      to: { path: "^src/(daemon|api|web|parser|prompt)" },
    },
    {
      name: "sync-may-use-storage",
      comment: "Sync can use storage for database operations",
      severity: "ignore",
      from: { path: "^src/sync" },
      to: { path: "^src/storage" },
    },

    // ============================================================================
    // ENTRY POINTS
    // ============================================================================

    {
      name: "cli-orchestrates",
      comment: "CLI can orchestrate all modules (entry point)",
      severity: "ignore",
      from: { path: "^src/cli\\.ts$" },
      to: { path: "^src/" },
    },
    {
      name: "daemon-process-orchestrates",
      comment:
        "Daemon process is an entry point that can orchestrate all modules",
      severity: "ignore",
      from: { path: "^src/daemon/daemon-process\\.ts$" },
      to: { path: "^src/" },
    },
    {
      name: "index-exports-only",
      comment:
        "Main index should only export, not import implementation details",
      severity: "warn",
      from: { path: "^src/index\\.ts$" },
      to: { path: "^src/(daemon|storage|parser|api|web)/.+" },
    },

    // ============================================================================
    // GENERAL BEST PRACTICES
    // ============================================================================

    {
      name: "no-test-in-production",
      comment: "Production code must not import test files",
      severity: "error",
      from: { path: "^src", pathNot: "\\.test\\.ts$" },
      to: { path: "\\.test\\.ts$" },
    },
    {
      name: "no-integration-in-unit",
      comment: "Unit tests should not import integration tests",
      severity: "warn",
      from: { path: "\\.test\\.ts$", pathNot: "integration" },
      to: { path: "integration" },
    },
    {
      name: "no-circular-deps",
      comment: "Circular dependencies detected",
      severity: "error",
      from: {},
      to: { circular: true },
    },
  ],

  options: {
    doNotFollow: {
      path: "node_modules",
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: "tsconfig.json",
    },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"],
    },
    reporterOptions: {
      dot: {
        collapsePattern: "node_modules/[^/]+",
      },
    },
  },
};
