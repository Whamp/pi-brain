# Code Modularization Boundaries

This document describes the architectural boundary enforcement for pi-brain.

## Tool: dependency-cruiser

The project uses `dependency-cruiser` to enforce code modularization boundaries at the architectural level.

## Quick Reference for Agents

### Check Boundaries

```bash
# Quick summary (JSON output for agents)
npm run boundaries

# Detailed JSON output
npm run boundaries:detail

# Focus on specific module
node scripts/check-boundaries.js --focus "^src/daemon"

# CLI with human-readable output
npx depcruise src extensions --output-type err
```

### Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                        CLI Entry Point                       │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│      API      │    │    Daemon     │    │      Web      │
│   (server)    │    │  (background) │    │     (UI)      │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Parser  │  Prompt  │  Config  │  Sync   │  Extensions      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Storage (Database)                       │
└─────────────────────────────────────────────────────────────┘
```

### Dependency Rules

| From | Can Import | Cannot Import |
|------|-----------|---------------|
| **CLI** | All | - |
| **API** | daemon, storage, parser, config, types | web |
| **Daemon** | storage, parser, prompt, config, types | api, web |
| **Web** | api client, config, types | daemon, storage, parser, prompt |
| **Storage** | config, types | daemon, api, web, parser, prompt |
| **Parser** | config, types | daemon, api, storage, web, prompt |
| **Prompt** | storage, parser, config, types | daemon, api, web |
| **Extensions** | types, api/responses | daemon, storage, parser |

### Configuration

- **Config file**: `.dependency-cruiser.cjs`
- **Agent script**: `scripts/check-boundaries.js`

### Exit Codes

- `0` - No violations found (clean)
- `1` - Violations detected or error occurred

### JSON Output Format

```json
{
  "status": "violations-found",
  "summary": {
    "totalViolations": 3,
    "errors": 2,
    "warnings": 1,
    "info": 0,
    "modules": 45,
    "dependencies": 120
  },
  "violations": [
    {
      "rule": "no-web-to-daemon",
      "severity": "error",
      "message": "Web UI must not import from daemon directly",
      "from": "src/web/app/src/lib/stores/daemon.ts",
      "to": "src/daemon/index.ts"
    }
  ]
}
```

## When to Use

1. **Before refactoring** - Check current boundaries
2. **After adding features** - Verify no architectural violations
3. **During code review** - Automated boundary checking
4. **CI/CD pipeline** - Enforce architecture on commits

## Adding New Rules

Edit `.dependency-cruiser.cjs` and add to the `forbidden` array:

```javascript
{
  name: 'rule-name',
  comment: 'Human-readable description',
  severity: 'error', // or 'warn', 'info'
  from: { path: '^src/module-a' },
  to: { path: '^src/module-b' },
}
```
