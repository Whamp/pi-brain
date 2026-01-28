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

### 📖 Read-Only Commands (No file changes)

Use these for exploration and understanding. They report issues without modifying files.

| Command                | What it does                                                         |
| ---------------------- | -------------------------------------------------------------------- |
| `npm run check`        | **Read-only.** Runs linter + formatter check. Fails if issues found. |
| `npx ultracite doctor` | **Read-only.** Diagnoses Ultracite setup issues.                     |

### ✏️ Auto-Modify Commands (Will change your files)

Use these only when you understand what changes will be made and have reviewed the issues first.

| Command               | What it does                                                       |
| --------------------- | ------------------------------------------------------------------ |
| `npm run fix`         | **MODIFIES FILES.** Auto-fixes lint issues (does NOT format).      |
| `npx oxfmt --write .` | **MODIFIES FILES.** Auto-fixes formatting issues across all files. |

### 🔄 Blocking Commands (Will hang until interrupted)

Use tmux for these commands to avoid getting blocked.

| Command           | What it does                                                                                          |
| ----------------- | ----------------------------------------------------------------------------------------------------- |
| `npm test`        | **BLOCKING.** Runs Vitest in watch mode. Never use directly - use `npm test -- --run` or run in tmux. |
| `npm run dev`     | **BLOCKING.** Runs tsup in watch mode for this project. Run in tmux for development.                  |
| `npm run web:dev` | **BLOCKING.** Runs web app dev server. Run in tmux.                                                   |

### 🏗️ Build Commands (Run once, then exit)

These commands complete their work and exit. Safe to run directly.

| Command             | What it does                                             |
| ------------------- | -------------------------------------------------------- |
| `npm run build`     | Builds the project with tsup. Generates dist/ directory. |
| `npm run web:build` | Builds the web app.                                      |

### Recommended Exploration Workflow

```bash
# Step 1: Check what issues exist (no changes)
npm run check

# Step 2: Review and understand the issues manually
# (Read the files, understand what needs fixing)

# Step 3: Only when ready, apply fixes
npm run fix && npx oxfmt --write .

# Step 4: Verify fixes worked
npm run check

# Step 5: Run tests in non-blocking mode
npm test -- --run
```

### When to Use tmux

Always use tmux for commands that **never exit** and will block your session:

- Dev servers: `npm run dev`, `yarn dev`, `vite`, `next dev`, `rails server`, `flask run`, `uvicorn`
- Watch modes: `tsc --watch`, `cargo watch`, `nodemon`, `npm test` (without `--run`)
- Log streaming: `tail -f`, `docker logs -f`, `journalctl -f`
- Interactive REPLs: `python3`, `node`, `psql`, `mysql`, `gdb`, `lldb`, `ipdb`, `pdb`

**Pattern:** If the command expects continuous input/output and doesn't have a natural exit, use tmux.

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

**Usage for Agents:**

- Always check `.codemap/API.md` before implementing new features.
- Use `codemap callers <symbol>` to understand how a function is used.
- Use `codemap call-graph <symbol>` to trace complex data flows.

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

### React & JSX

- Use function components over class components
- Call hooks at the top level only, never conditionally
- Specify all dependencies in hook dependency arrays correctly
- Use the `key` prop for elements in iterables (prefer unique IDs over array indices)
- Nest children between opening and closing tags instead of passing as props
- Don't define components inside other components
- Use semantic HTML and ARIA attributes for accessibility:
  - Provide meaningful alt text for images
  - Use proper heading hierarchy
  - Add labels for form inputs
  - Include keyboard event handlers alongside mouse events
  - Use semantic elements (`<button>`, `<nav>`, etc.) instead of divs with roles

### Error Handling & Debugging

- Remove `console.log`, `debugger`, and `alert` statements from production code
- Throw `Error` objects with descriptive messages, not strings or other values
- Use `try-catch` blocks meaningfully - don't catch errors just to rethrow them
- Prefer early returns over nested conditionals for error cases

### Code Organization

- Keep functions focused and under reasonable cognitive complexity limits
- Extract complex conditions into well-named boolean variables
- Use early returns to reduce nesting
- Prefer simple conditionals over nested ternary operators
- Group related code together and separate concerns

### Security

- Add `rel="noopener"` when using `target="_blank"` on links
- Avoid `dangerouslySetInnerHTML` unless absolutely necessary
- Don't use `eval()` or assign directly to `document.cookie`
- Validate and sanitize user input

### Performance

- Avoid spread syntax in accumulators within loops
- Use top-level regex literals instead of creating them in loops
- Prefer specific imports over namespace imports
- Avoid barrel files (index files that re-export everything)
- Use proper image components (e.g., Next.js `<Image>`) over `<img>` tags

### Framework-Specific Guidance

**Next.js:**

- Use Next.js `<Image>` component for images
- Use `next/head` or App Router metadata API for head elements
- Use Server Components for async data fetching instead of async Client Components

**React 19+:**

- Use ref as a prop instead of `React.forwardRef`

**Solid/Svelte/Vue/Qwik:**

- Use `class` and `for` attributes (not `className` or `htmlFor`)

---

## Testing

- **Never run `npm test` directly** - it blocks in watch mode. Use `npm test -- --run` for single-run execution, or run in tmux.
- Write assertions inside `it()` or `test()` blocks
- Avoid done callbacks in async tests - use async/await instead
- Don't use `.only` or `.skip` in committed code
- Keep test suites reasonably flat - avoid excessive `describe` nesting

## When Oxlint + Oxfmt Can't Help

Oxlint + Oxfmt's linter will catch most issues automatically. Focus your attention on:

1. **Business logic correctness** - Oxlint + Oxfmt can't validate your algorithms
2. **Meaningful naming** - Use descriptive names for functions, variables, and types
3. **Architecture decisions** - Component structure, data flow, and API design
4. **Edge cases** - Handle boundary conditions and error states
5. **User experience** - Accessibility, performance, and usability considerations
6. **Documentation** - Add comments for complex logic, but prefer self-documenting code
