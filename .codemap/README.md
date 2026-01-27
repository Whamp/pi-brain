# Codemap Guide for pi-brain

This directory /.codemap/ contains codemap-generated navigation aids for agents and developers working on pi-brain.

## Files

- `API.md` - Public API surface (exported functions, types, classes)
- `STORAGE.md` - Storage layer architecture and data model
- `ENTRY_POINTS.md` - CLI and API entry points with call relationships
- `ANNOTATIONS.md` - Human-curated annotations about key files
- `DAEMON_DEPS.md` - Daemon module dependency tree
- `SESSION_INGESTION.md` - Session processing pipeline
- `PROMPT_LEARNING.md` - Insight extraction and prompt learning
- `BRAIN_QUERIES.md` - Knowledge graph query operations
- `index.json` - Complete symbol index (machine-readable)

## Regenerating Maps

```bash
# All maps
make codemap-maps  # or npm run codemap:all

# Individual maps
codemap "src/**/*.ts" --exported-only --headings --code-blocks \
  --ignore "**/*.test.ts" > API.md
```

## Using These Maps

**For agents:**

- Load `API.md` to understand public interfaces
- Load `STORAGE.md` before data layer work
- Load `ENTRY_POINTS.md` for CLI/API integration
- Use `index.json` for programmatic symbol lookup

**For humans:**

- Start with `API.md` for overview
- Check `ANNOTATIONS.md` for architecture notes
- Use dependency maps to understand module relationships

## Adding Annotations

```bash
# Annotate a file's purpose
codemap annotate src/types/index.ts "Core type definitions - shared across daemon, storage, and web"

# Remove an annotation
codemap annotate src/types/index.ts

# List all annotations
codemap annotations
```

## Key Patterns

### Finding callers for a function

```bash
codemap callers src/storage/node-repository.ts:insertNode --max-refs 20
```

### Tracing data flow

```bash
codemap call-graph src/daemon/worker.ts:processSession
codemap find-refs src/types/index.ts:Node --refs=full --max-refs 30
```

### Understanding module dependencies

```bash
codemap deps src/daemon/index.ts
```
