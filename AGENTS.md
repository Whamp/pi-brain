# Ultracite Code Standards

This project uses **Ultracite**, a zero-config preset that enforces strict code quality standards through automated formatting and linting.

## Important Writing Standards

**available skill** `writing-clearly-and-concisely`

## Toolchain

Ultracite wraps two tools:

- **oxlint** - Fast linter (rules configured in `.oxlintrc.json`)
- **oxfmt** - Fast formatter (configured in `.oxfmtrc.jsonc`)

## Commands

**Critical Principle:** Always run read-only checks before applying any auto-fixes. Never skip exploration by running fix commands directly.

### 📖 Read-Only Commands

| Command                | What it does                                          |
| ---------------------- | ----------------------------------------------------- |
| `npm run check`        | Runs linter + formatter check. Fails if issues exist. |
| `npx ultracite doctor` | Diagnoses Ultracite setup issues.                     |

### ✏️ Auto-Modify Commands

Run `npm run check` first to understand what will change.

| Command               | What it does                                |
| --------------------- | ------------------------------------------- |
| `npm run fix`         | **MODIFIES FILES.** Auto-fixes lint issues. |
| `npx oxfmt --write .` | **MODIFIES FILES.** Auto-fixes formatting.  |

### 🔄 Blocking Commands

Use tmux—these never exit on their own.

| Command           | What it does                                                           |
| ----------------- | ---------------------------------------------------------------------- |
| `npm test`        | **BLOCKS.** Vitest watch mode. Use `npm test -- --run` for single run. |
| `npm run dev`     | **BLOCKS.** tsup watch mode.                                           |
| `npm run web:dev` | **BLOCKS.** Vite dev server for web app.                               |

### 🏗️ Build Commands

Safe to run directly—these exit when done.

| Command             | What it does                    |
| ------------------- | ------------------------------- |
| `npm run build`     | Builds with tsup. Output: dist/ |
| `npm run web:build` | Builds the web app.             |

### Workflow

```bash
npm run check                    # See issues (no changes)
npm run fix && npx oxfmt --write . # Apply fixes
npm run check                    # Verify
npm test -- --run                # Test (non-blocking)
```

### When to Use tmux

Commands that never exit block your session. Use tmux for:

- Watch modes: `npm run dev`, `npm test`, `tsc --watch`
- Dev servers: `npm run web:dev`, `vite`
- Log streaming: `tail -f`, `docker logs -f`
- REPLs: `node`, `python3`, `psql`

### Pre-commit Hook

The pre-commit hook runs:

1. `npm run fix` - Auto-fix lint issues
2. `npx oxfmt --write .` - Auto-fix formatting
3. `npm test -- --run` - Run tests
4. `./scripts/refresh-codemap.sh` - Refresh agent navigation maps

If any step fails, the commit is blocked.

---

## Codebase Navigation

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

## Configuration

### `.oxlintrc.json` - Linter Rules

Extends ultracite's core config. Project-specific rule overrides:

```json
{
  "extends": ["./node_modules/ultracite/config/oxlint/core/.oxlintrc.json"],
  "rules": {
    "rule-name": "off" // Disable a rule
  }
}
```

### `.oxfmtrc.jsonc` - Formatter Config

Standard Prettier-compatible options (printWidth, semi, quotes, etc.)

---

## Core Principles

Write code that is **accessible, performant, type-safe, and maintainable**. Focus on clarity and explicit intent over brevity.

### Type Safety & Explicitness

- Use explicit types for function parameters and return values when they enhance clarity
- Prefer `unknown` over `any` when the type is genuinely unknown
- Use const assertions (`as const`) for immutable values and literal types
- Leverage TypeScript's type narrowing instead of type assertions
- Use meaningful variable names instead of magic numbers - extract constants with descriptive names

### Modern JavaScript/TypeScript

- Use arrow functions for callbacks and short functions
- Prefer `for...of` loops over `.forEach()` and indexed `for` loops
- Use optional chaining (`?.`) and nullish coalescing (`??`) for safer property access
- Prefer template literals over string concatenation
- Use destructuring for object and array assignments
- Use `const` by default, `let` only when reassignment is needed, never `var`

### Async & Promises

- Always `await` promises in async functions - don't forget to use the return value
- Use `async/await` syntax instead of promise chains for better readability
- Handle errors appropriately in async code with try-catch blocks
- Don't use async functions as Promise executors

### Svelte & SvelteKit

The web app (`src/web/app`) uses Svelte 5 and SvelteKit:

- Use `class` and `for` attributes (not `className` or `htmlFor`)
- Use runes (`$state`, `$derived`, `$effect`) for reactivity in Svelte 5
- Use `{#each items as item (item.id)}` with keys for lists
- Use semantic HTML and ARIA attributes for accessibility
- Prefer `+page.server.ts` load functions over client-side fetching

### Error Handling

- Remove `console.log`, `debugger`, and `alert` before committing
- Throw `Error` objects with descriptive messages, not strings
- Use `try-catch` meaningfully—don't catch just to rethrow
- Prefer early returns over nested conditionals

### Code Organization

- Keep functions focused—limit cognitive complexity
- Extract complex conditions into well-named boolean variables
- Use early returns to reduce nesting
- Prefer simple conditionals over nested ternaries
- Group related code; separate concerns

### Security

- Add `rel="noopener"` when using `target="_blank"` on links
- Use `{@html}` sparingly in Svelte—sanitize untrusted content
- Don't use `eval()` or assign directly to `document.cookie`
- Validate and sanitize user input

### Performance

- Avoid spread syntax in accumulators within loops
- Use top-level regex literals instead of creating them in loops
- Prefer specific imports over namespace imports
- Avoid barrel files (index files that re-export everything)

---

## Testing

- Write assertions inside `it()` or `test()` blocks
- Avoid done callbacks in async tests—use async/await
- Don't use `.only` or `.skip` in committed code
- Keep test suites reasonably flat—avoid excessive `describe` nesting

## What Linting Can't Catch

Focus on:

1. **Business logic** - The linter can't validate your algorithms
2. **Meaningful naming** - Descriptive names for functions, variables, types
3. **Architecture** - Component structure, data flow, API design
4. **Edge cases** - Boundary conditions and error states
5. **UX** - Accessibility, performance, usability
6. **Documentation** - Comments for complex logic; prefer self-documenting code
