# Code Review Fix Tasks

| ID  | Task                                                                                | Priority | Status | Notes                                 |
| --- | ----------------------------------------------------------------------------------- | -------- | ------ | ------------------------------------- |
| 1.1 | Add `missingPromptFile` field to EnvironmentValidationResult for better diagnostics | P2       | done   | File: src/daemon/processor.ts:749-754 |
| 1.2 | Make idle loop interruptible so stop() doesn't block for up to 30 seconds           | P2       | done   | File: src/daemon/worker.ts:193-203    |

## Ignored Issues (per instructions)

- **P3** package.json `copy-assets` script not portable to Windows - Windows compatibility ignored
- **P3** vite.config.ts proxy only active in dev mode - intentional, production uses reverse proxy
