# Coding Standards

Code quality, linting, formatting, and TypeScript configuration for pi-brain.

## Tooling

### Ultracite with Oxlint + Oxfmt

We use [Ultracite](https://docs.ultracite.ai/) configured for the oxlint provider, which uses:

- **[Oxlint](https://oxc.rs/docs/guide/usage/linter.html)** — 50-100x faster than ESLint, written in Rust
- **[Oxfmt](https://oxc.rs/docs/guide/usage/formatter.html)** — Fast formatter from the Oxc project

### Setup

```bash
# Initialize Ultracite with oxlint provider
npx ultracite init --provider oxlint

# Or manually install
npm install -D ultracite oxlint
```

### Configuration

Ultracite is zero-config by design. If customization is needed:

```json
// ultracite.json (optional overrides)
{
  "provider": "oxlint"
}
```

### Scripts

```json
// package.json
{
  "scripts": {
    "lint": "ultracite lint",
    "lint:fix": "ultracite lint --fix",
    "format": "ultracite format",
    "format:check": "ultracite format --check",
    "check": "ultracite check"
  }
}
```

### Editor Integration

- **VS Code**: Install the [Oxc extension](https://marketplace.visualstudio.com/items?itemName=nicholasraphael.oxc)
- Enable format on save in `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "nicholasraphael.oxc",
  "[typescript]": {
    "editor.defaultFormatter": "nicholasraphael.oxc"
  },
  "[javascript]": {
    "editor.defaultFormatter": "nicholasraphael.oxc"
  }
}
```

## TypeScript Configuration

### Compiler Options

```json
// tsconfig.json
{
  "compilerOptions": {
    // Strict mode - maximum type safety
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "noPropertyAccessFromIndexSignature": true,

    // Module system
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "target": "ES2022",
    "lib": ["ES2022"],

    // Output
    "outDir": "./dist",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,

    // Paths
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    },

    // Other
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Build Configuration

Using [tsup](https://tsup.egoist.dev/) for building:

```typescript
// tsup.config.ts
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/cli.ts", "src/daemon/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  target: "node20",
  splitting: true,
});
```

## Code Style Guidelines

### General

- **2 spaces** for indentation (Oxfmt default)
- **Single quotes** for strings
- **Semicolons** required
- **Trailing commas** in multiline
- **100 character** line width

### Naming Conventions

| Entity     | Convention      | Example             |
| ---------- | --------------- | ------------------- |
| Files      | kebab-case      | `session-parser.ts` |
| Classes    | PascalCase      | `SessionParser`     |
| Interfaces | PascalCase      | `NodeData`          |
| Types      | PascalCase      | `EdgeType`          |
| Functions  | camelCase       | `parseSession()`    |
| Variables  | camelCase       | `leafId`            |
| Constants  | SCREAMING_SNAKE | `DEFAULT_TIMEOUT`   |
| Enums      | PascalCase      | `NodeType.Coding`   |

### File Organization

```typescript
// 1. Imports (external, then internal, then types)
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { db } from "@/storage/database";

import type { Node, Edge } from "@/types";

// 2. Types/Interfaces (if file-specific)
interface ParseOptions {
  strict?: boolean;
}

// 3. Constants
const MAX_RETRIES = 3;

// 4. Main exports
export function parseSession(path: string, options?: ParseOptions): Node {
  // ...
}

// 5. Helper functions (private)
function validateEntry(entry: unknown): boolean {
  // ...
}
```

### Error Handling

```typescript
// Use typed errors
class SessionParseError extends Error {
  constructor(
    message: string,
    public readonly filePath: string,
    public readonly line?: number
  ) {
    super(message);
    this.name = "SessionParseError";
  }
}

// Prefer Result types for expected failures
type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };

function parseEntry(line: string): Result<SessionEntry, string> {
  try {
    return { ok: true, value: JSON.parse(line) };
  } catch {
    return { ok: false, error: "Invalid JSON" };
  }
}

// Throw for unexpected failures, return Result for expected ones
```

### Async Patterns

```typescript
// Prefer async/await over .then()
async function processSession(path: string): Promise<Node> {
  const content = await readFile(path, "utf-8");
  return parseSessionContent(content, path);
}

// Use Promise.all for concurrent operations
async function processAllSessions(paths: string[]): Promise<Node[]> {
  return Promise.all(paths.map(processSession));
}

// Handle cleanup with try/finally
async function withDatabase<T>(fn: (db: Database) => Promise<T>): Promise<T> {
  const db = await openDatabase();
  try {
    return await fn(db);
  } finally {
    await db.close();
  }
}
```

### Comments

```typescript
// Use JSDoc for public APIs
/**
 * Parse a pi session file and extract structured data.
 *
 * @param filePath - Absolute path to the session .jsonl file
 * @param options - Parsing options
 * @returns Parsed session with tree structure
 * @throws {SessionParseError} If the file is invalid or cannot be read
 *
 * @example
 * const session = await parseSession('/path/to/session.jsonl');
 * console.log(session.header.id);
 */
export async function parseSession(
  filePath: string,
  options?: ParseOptions
): Promise<SessionInfo> {
  // ...
}

// Use // comments for implementation notes
function detectBoundary(entries: SessionEntry[]): Boundary[] {
  // We detect boundaries by looking for:
  // 1. branch_summary entries (explicit tree navigation)
  // 2. compaction entries
  // 3. parentId mismatches (implicit tree jumps)
  // 4. 10+ minute gaps (resume detection)

  const boundaries: Boundary[] = [];
  // ...
}
```

## Testing

### Framework

Using [Vitest](https://vitest.dev/) for testing:

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
    },
  },
});
```

### Test Organization

```
tests/
├── unit/
│   ├── parser/
│   │   ├── session-parser.test.ts
│   │   └── boundary-detector.test.ts
│   └── storage/
│       └── database.test.ts
├── integration/
│   ├── daemon.test.ts
│   └── api.test.ts
└── fixtures/
    └── sessions/
        ├── simple.jsonl
        └── branching.jsonl
```

### Test Style

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { parseSession } from "@/parser/session";

describe("parseSession", () => {
  describe("valid sessions", () => {
    it("parses a simple linear session", async () => {
      const session = await parseSession(
        "tests/fixtures/sessions/simple.jsonl"
      );

      expect(session.header.version).toBe(3);
      expect(session.entries).toHaveLength(5);
      expect(session.tree).not.toBeNull();
    });

    it("detects branch points correctly", async () => {
      const session = await parseSession(
        "tests/fixtures/sessions/branching.jsonl"
      );

      expect(session.stats.branchPointCount).toBe(2);
    });
  });

  describe("error handling", () => {
    it("throws on missing file", async () => {
      await expect(parseSession("/nonexistent.jsonl")).rejects.toThrow(
        "ENOENT"
      );
    });

    it("throws on invalid JSON", async () => {
      await expect(
        parseSession("tests/fixtures/sessions/invalid.jsonl")
      ).rejects.toThrow("Invalid JSON");
    });
  });
});
```

## Git Hooks

Using [Husky](https://typicode.github.io/husky/) for pre-commit hooks:

```bash
# Install
npm install -D husky lint-staged
npx husky init
```

```bash
# .husky/pre-commit
npx lint-staged
```

```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": ["ultracite lint --fix", "ultracite format"],
    "*.{json,md,yaml,yml}": ["ultracite format"]
  }
}
```

## CI Integration

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run format:check

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx tsc --noEmit

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm test

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
```

## Dependencies

### Runtime

| Package             | Purpose                   |
| ------------------- | ------------------------- |
| `better-sqlite3`    | SQLite driver             |
| `chokidar`          | File watching             |
| `commander`         | CLI framework             |
| `open`              | Open URLs in browser      |
| `yaml`              | Config file parsing       |
| `@sinclair/typebox` | Runtime type validation   |
| `d3`                | Graph visualization (web) |

### Development

| Package                 | Purpose                         |
| ----------------------- | ------------------------------- |
| `ultracite`             | Linting/formatting orchestrator |
| `oxlint`                | Linting                         |
| `typescript`            | Type checking                   |
| `tsup`                  | Building                        |
| `vitest`                | Testing                         |
| `husky`                 | Git hooks                       |
| `lint-staged`           | Staged file linting             |
| `@types/better-sqlite3` | Type definitions                |
| `@types/node`           | Node.js types                   |
