#!/bin/bash
# Script to refresh codemap documentation
set -e

echo "Refreshing codemap documentation..."

# Ensure directory exists
mkdir -p .codemap

# Public API Surface
codemap "src/**/*.ts" --exported-only --headings --code-blocks --comments --imports --ignore "**/*.test.ts" --ignore "**/*.test-d.ts" > .codemap/API.md

# Storage Layer
codemap "src/storage/*.ts" --exported-only --comments --imports --headings --code-blocks --ignore "**/*.test.ts" > .codemap/STORAGE.md

# Entry Points
codemap "src/cli.ts" "src/api/**/*.ts" --refs-out --max-refs 5 --headings --code-blocks > .codemap/ENTRY_POINTS.md

# Annotations
codemap annotations > .codemap/ANNOTATIONS.md 2>&1 || echo "# No annotations yet" > .codemap/ANNOTATIONS.md

# Dependency Trees
codemap deps src/daemon/index.ts > .codemap/DAEMON_DEPS.md
codemap deps src/storage/database.ts > .codemap/STORAGE_DEPS.md

# Specialized Maps
codemap "src/parser/*.ts" "src/daemon/*.ts" --exported-only --refs-out --max-refs 10 > .codemap/SESSION_INGESTION.md
codemap "src/daemon/insight-aggregation.ts" "src/prompt/*.ts" "src/storage/pattern-repository.ts" --exported-only --refs --max-refs 10 > .codemap/PROMPT_LEARNING.md
codemap "src/storage/*.ts" "src/daemon/*.ts" --exported-only --refs-in --max-refs 10 --pattern "*Node*" "*Edge*" "*search*" "*query*" > .codemap/BRAIN_QUERIES.md

# Machine Readable Index
codemap "src/**/*.ts" --output json --ignore "**/*.test.ts" --ignore "**/*.test-d.ts" > .codemap/index.json

# Add all generated files to git (since this runs in pre-commit)
git add .codemap/*.md .codemap/*.json

echo "Codemap refresh complete."
