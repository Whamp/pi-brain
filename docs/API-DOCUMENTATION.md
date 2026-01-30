# API Documentation System

This project uses [API Extractor](https://api-extractor.com/) from Microsoft to generate structured, machine-readable documentation that is optimized for both human developers and AI agents.

## Why API Extractor?

Traditional documentation tools focus on producing HTML for human consumption. API Extractor produces a **JSON doc model** that agents can parse programmatically, enabling:

- **Structured API discovery** - Agents can query the API surface programmatically
- **Type-safe documentation** - Full TypeScript type information preserved
- **API change tracking** - Reports show API changes between versions
- **Multi-format output** - Same source generates JSON, Markdown, and .d.ts rollups

## Quick Start

```bash
# Generate all documentation
npm run docs:generate

# Generate only agent-friendly JSON outputs
npm run docs:agent

# Watch mode - regenerate on file changes
npm run docs:watch

# Query the API (find functions, types, etc.)
npm run docs:query -- --query="functionName"
```

## Output Structure

```
docs/
└── api/
    ├── pi-brain.api.json          # Main JSON doc model (for agents)
    ├── reports/
    │   └── pi-brain.api.md        # API report for review
    ├── markdown/                   # Human-readable Markdown docs
    │   ├── index.md
    │   ├── pi-brain.md
    │   └── ...
    └── agent/                      # Agent-optimized outputs
        ├── agent-api-index.json    # Flattened API index
        ├── agent-function-catalog.json  # Function reference
        └── agent-type-registry.json     # Type definitions
```

## For AI Agents

The agent-optimized JSON files are designed for programmatic consumption:

### agent-api-index.json

A flattened index of all exported symbols with:
- Full type information
- JSDoc descriptions
- Parameter and return types
- Release tags (@public, @beta, @alpha)

```javascript
import apiIndex from './docs/api/agent/agent-api-index.json';

// Find all functions
const functions = apiIndex.entries.filter(e => e.kind === 'Function');

// Search by name
const results = apiIndex.entries.filter(e => 
  e.name.includes('searchTerm')
);
```

### agent-function-catalog.json

Focused on callable functions with signatures:

```javascript
import catalog from './docs/api/agent/agent-function-catalog.json';

// Get function signature
const fn = catalog.functions.find(f => f.name === 'myFunction');
console.log(fn.parameters);  // Parameter names and types
console.log(fn.returnType);  // Return type
```

### agent-type-registry.json

Type definitions for code generation:

```javascript
import types from './docs/api/agent/agent-type-registry.json';

// Find interface definition
const iface = types.types.find(t => t.name === 'MyInterface');
console.log(iface.extends);  // Parent interfaces
```

## Configuration

### api-extractor.json

Main configuration file controlling:
- Entry point for analysis (`dist/index.d.ts`)
- Output paths for doc model and reports
- Compiler options
- Message reporting levels

### Release Tags

Use TSDoc tags to control API visibility:

```typescript
/**
 * This is a public API.
 * @public
 */
export function publicFunction() {}

/**
 * This is still experimental.
 * @beta
 */
export function betaFunction() {}

/**
 * Internal use only.
 * @internal
 */
export function internalFunction() {}
```

## CI/CD Integration

The documentation generation is designed for CI/CD pipelines:

```yaml
# GitHub Actions example
- name: Generate Documentation
  run: |
    npm run build
    npm run docs:generate
    npm run docs:agent

- name: Check API Report
  run: |
    # Fail if API changed without review
    git diff --exit-code docs/api/reports/
```

## Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run docs:generate` | Generate full documentation (JSON + Markdown) |
| `npm run docs:agent` | Generate agent-optimized JSON only |
| `npm run docs:watch` | Watch mode - regenerate on changes |
| `npm run docs:query -- --query="name"` | Search API by name/description |
| `npm run docs:extract` | Run API Extractor only |
| `npm run docs:markdown` | Generate Markdown from JSON model |

## Extending the System

### Adding Custom Processors

Create new processors in `scripts/` that consume `docs/api/pi-brain.api.json`:

```javascript
import docModel from './docs/api/pi-brain.api.json';

// Your custom processing logic
const customOutput = processDocModel(docModel);
```

### Custom Templates

API Documenter supports custom templates. See:
- https://api-extractor.com/pages/setup/custom_docs/

## Troubleshooting

### "Doc model not found"

Run `npm run build` first, then `npm run docs:generate`.

### Type errors during extraction

API Extractor uses the TypeScript compiler. Fix type errors in your source code.

### Missing exports

Add `/** @public */` comments to exported APIs you want documented.

## Resources

- [API Extractor Documentation](https://api-extractor.com/)
- [TSDoc Specification](https://tsdoc.org/)
- [api-documenter](https://api-extractor.com/pages/commands/api-documenter_markdown/)
