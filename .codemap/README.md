# Codebase Navigation Maps

This directory contains auto-generated maps of the codebase to help agents understand structure, dependencies, and flows without reading thousands of lines of code.

## 🗺️ Static Maps

Start with these files to get a high-level understanding of specific subsystems:

- **[API.md](./API.md)**: Public API surface. Check this first to see what functionality is exported and available for use.
- **[BOUNDARIES.md](./BOUNDARIES.md)**: Architectural boundary rules and dependency-cruiser configuration.
- **[STORAGE.md](./STORAGE.md)**: Data model and storage layer. Crucial for understanding how data is persisted.
- **[SESSION_INGESTION.md](./SESSION_INGESTION.md)**: Documentation of the ingestion pipeline logic.
- **[BRAIN_QUERIES.md](./BRAIN_QUERIES.md)**: Common patterns for querying the knowledge graph.
- **[ENTRY_POINTS.md](./ENTRY_POINTS.md)**: Application entry points (CLI commands, server start, etc.).
- **[DAEMON_DEPS.md](./DAEMON_DEPS.md)**: Dependency graph for the long-running daemon process.
- **[PROMPT_LEARNING.md](./PROMPT_LEARNING.md)**: Information about prompt learning subsystems.
- **[index.json](./index.json)**: Complete machine-readable symbol index.

## 🔍 Dynamic Exploration (CLI)

For specific questions not covered by the static maps, use the `codemap` CLI tool. It is available in the environment path.

### Common Commands

**Find usages of a function/class (Impact Analysis):**
```bash
codemap callers <SymbolName>
```

**Trace where data goes (Control Flow):**
```bash
codemap calls <SymbolName>
```

**See the call graph for a complex flow:**
```bash
codemap call-graph <SymbolName>
```

**Find type hierarchy:**
```bash
codemap subtypes <BaseClass>
codemap supertypes <DerivedClass>
```

**Search for references:**
```bash
codemap find-refs <SymbolName>
```

## 🤖 For Agents

1. **Read Static Maps First**: Before implementing features, read the relevant map (e.g., `API.md` for new integrations, `STORAGE.md` for database changes).
2. **Use CLI for Detail**: If you need to change a core function, use `codemap callers <func>` to check impact.
3. **Refresh**: These maps are auto-generated. If you make significant structural changes, they are usually refreshed via pre-commit hooks or manual scripts.
