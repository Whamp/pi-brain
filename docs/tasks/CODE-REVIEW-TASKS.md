# Code Review Fix Tasks

| ID  | Task                                                               | Priority | Status  | Notes                                                                                                   |
| --- | ------------------------------------------------------------------ | -------- | ------- | ------------------------------------------------------------------------------------------------------- |
| 1.1 | Create daemon-process.ts entry point for background daemon process | P0       | done    | File: src/daemon/daemon-process.ts (missing, referenced by cli.ts:245)                                  |
| 1.2 | Fix build script to reference correct brain-query extension path   | P0       | done    | File: package.json - references extensions/brain-query.ts but actual is extensions/brain-query/index.ts |
| 1.3 | Replace hardcoded mock embeddingModel with config value            | P1       | pending | File: src/api/routes/query.ts - DEFAULT_QUERY_CONFIG has embeddingModel: "mock"                         |
| 1.4 | Update server to accept DaemonConfig and propagate to routes       | P1       | pending | File: src/api/server.ts - only accepts ApiConfig but routes need DaemonConfig                           |
