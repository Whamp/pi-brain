# pi-brain

A "second brain" for the pi coding agent—analyzes, connects, and learns from every interaction.

## What It Does

pi-brain builds a knowledge graph from your coding sessions. It ingests session files, extracts decisions, errors, patterns, and lessons, and stores them in SQLite with vector embeddings for semantic search.

The brain recalls past decisions, surfaces recurring mistakes, and exposes model quirks. The web dashboard visualizes session history, traces connections between decisions, and shows agent behavior over time.

## Components

- **Daemon**: Watches session files, analyzes them with LLMs
- **Knowledge Graph**: SQLite database with `better-sqlite3` and `sqlite-vec`
- **Web Dashboard**: SvelteKit app for graph visualization and session exploration
- **Pi Integration**: `brain-query` extension for agents to query the knowledge graph

## Quick Start

```bash
npm install && npm run build
node dist/src/daemon/daemon-process.js --force
npm run web:dev
# Open http://localhost:5173/
```

## Code Standards

This project uses **Ultracite** for code quality and the `writing-clearly-and-concisely` skill for prose.

### Toolchain

Scripts call oxlint and oxfmt directly:

- **oxlint** - Linter (configured in `.oxlintrc.json`)
- **oxfmt** - Formatter (configured in `.oxfmtrc.jsonc`)

### Commands

**Principle:** Run read-only checks first. Explore issues before running fix commands.

#### Workflow

```bash
npm run check                    # Build + format + lint (read-only)
npm run fix                      # Auto-fix lint and format issues
npm run validate                 # Full validation before commit
```

#### Additional Commands

| Command                | Description                                 |
| ---------------------- | ------------------------------------------- |
| `npm run deadcode`     | Find unused exports and dependencies.       |
| `npm run duplicates`   | Find duplicate code blocks.                 |
| `npm start`            | Launch daemon and web UI together.          |
| `npm run dev:all`      | Concurrent dev mode (daemon + web + watch). |
| `npm run web:check`    | Lint the web app.                           |
| `npx ultracite doctor` | Diagnose Ultracite setup issues.            |

#### Blocking Commands

These block indefinitely—use tmux:

| Command           | Description                                               |
| ----------------- | --------------------------------------------------------- |
| `npm run dev`     | tsup watch mode.                                          |
| `npm run web:dev` | Vite dev server.                                          |
| `npx vitest`      | Vitest watch mode. Use `npx vitest --run` for single run. |

#### Build Commands

These exit when done:

| Command             | Description                    |
| ------------------- | ------------------------------ |
| `npm run build`     | Build with tsup. Output: dist/ |
| `npm run web:build` | Build the web app.             |

#### Pre-commit Hook

The pre-commit hook (`.husky/pre-commit`) validates all changes:

1. `npm run validate`:
   - Build + format check + lint
   - Unused exports/dependencies
   - Duplicate code detection
   - Tests (quiet output on success)
2. `./scripts/refresh-codemap.sh` - Refresh agent navigation maps

If any step fails, the commit is blocked.

---

### Codebase Navigation

This project uses **codemap** to provide structured navigation aids for agents. These are stored in the `.codemap/` directory and auto-refreshed on every commit.

| Guide                                                          | Description                                  |
| -------------------------------------------------------------- | -------------------------------------------- |
| [.codemap/README.md](.codemap/README.md)                       | **Start here** - Overview of navigation maps |
| [.codemap/API.md](.codemap/API.md)                             | Public API surface (exported symbols)        |
| [.codemap/STORAGE.md](.codemap/STORAGE.md)                     | Data model and storage layer                 |
| [.codemap/SESSION_INGESTION.md](.codemap/SESSION_INGESTION.md) | Ingestion pipeline flow                      |
| [.codemap/BRAIN_QUERIES.md](.codemap/BRAIN_QUERIES.md)         | Knowledge graph query patterns               |
| [.codemap/index.json](.codemap/index.json)                     | Complete machine-readable symbol index       |

- Check `.codemap/API.md` before implementing new features
- Use `codemap callers <symbol>` to understand how a function is used
- Use `codemap call-graph <symbol>` to trace data flows

---

### Configuration

#### `.oxlintrc.json` - Linter Rules

Extends ultracite's core config. Project-specific rule overrides:

```json
{
  "extends": ["./node_modules/ultracite/config/oxlint/core/.oxlintrc.json"],
  "rules": {
    "rule-name": "off" // Disable a rule
  }
}
```

#### `.oxfmtrc.jsonc` - Formatter Config

Standard Prettier-compatible options (printWidth, semi, quotes, etc.)

---

### Core Principles

Write **accessible, performant, type-safe, and maintainable** code. Prefer clarity and explicit intent over brevity.

#### Type Safety & Explicitness

- Use explicit types for function parameters and return values when they enhance clarity
- Prefer `unknown` over `any` when the type is genuinely unknown
- Use const assertions (`as const`) for immutable values and literal types
- Use TypeScript's type narrowing instead of type assertions
- Use meaningful variable names instead of magic numbers - extract constants with descriptive names

#### Modern JavaScript/TypeScript

- Use arrow functions for callbacks and short functions
- Prefer `for...of` loops over `.forEach()` and indexed `for` loops
- Use optional chaining (`?.`) and nullish coalescing (`??`) for safer property access
- Prefer template literals over string concatenation
- Use destructuring for object and array assignments
- Use `const` by default, `let` only when reassignment is needed, never `var`

#### Async & Promises

- Always `await` promises in async functions - don't forget to use the return value
- Use `async/await` syntax instead of promise chains for better readability
- Handle errors appropriately in async code with try-catch blocks
- Avoid async functions as Promise executors

#### Svelte & SvelteKit

The web app (`src/web/app`) uses Svelte 5 and SvelteKit:

- Use `class` and `for` attributes (not `className` or `htmlFor`)
- Use runes (`$state`, `$derived`, `$effect`) for reactivity in Svelte 5
- Use `{#each items as item (item.id)}` with keys for lists
- Use semantic HTML and ARIA attributes for accessibility
- Prefer `+page.server.ts` load functions over client-side fetching

#### Error Handling

- Remove `console.log`, `debugger`, and `alert` before committing
- Throw `Error` objects with descriptive messages, not strings
- Use `try-catch` meaningfully—don't catch just to rethrow
- Prefer early returns over nested conditionals

#### Code Organization

- Keep functions focused—limit cognitive complexity
- Extract complex conditions into well-named boolean variables
- Use early returns to reduce nesting
- Prefer simple conditionals over nested ternaries
- Group related code; separate concerns

#### Security

- Add `rel="noopener"` when using `target="_blank"` on links
- Use `{@html}` sparingly in Svelte—sanitize untrusted content
- Avoid `eval()` and direct assignment to `document.cookie`
- Validate and sanitize user input

#### Performance

- Avoid spread syntax in accumulators within loops
- Use top-level regex literals instead of creating them in loops
- Prefer specific imports over namespace imports
- Avoid barrel files (index files that re-export everything)

---

### Testing

- Write assertions inside `it()` or `test()` blocks
- Avoid done callbacks in async tests—use async/await
- Avoid `.only` or `.skip` in committed code
- Keep test suites reasonably flat—avoid excessive `describe` nesting

### What Linting Can't Catch

Focus on:

1. **Business logic** - The linter can't validate your algorithms
2. **Meaningful naming** - Descriptive names for functions, variables, types
3. **Architecture** - Component structure, data flow, API design
4. **Edge cases** - Boundary conditions and error states
5. **UX** - Accessibility, performance, usability
6. **Documentation** - Comments for complex logic; prefer self-documenting code
