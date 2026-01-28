# Code Review Fix Tasks: WebSocket Implementation

| ID  | Task                                                                                 | Priority | Status  | Notes                                    |
| --- | ------------------------------------------------------------------------------------ | -------- | ------- | ---------------------------------------- |
| 1.1 | Fix type mismatch: `validChannels` typed as `WSChannel[]` but assigned `Set<string>` | P1       | pending | File: src/api/websocket.ts:152-160       |
| 1.2 | Add input validation to verify `message.channels` is an array before iterating       | P2       | pending | File: src/api/websocket.ts:152-163       |
| 1.3 | Wire `broadcastAnalysisStarted` to worker `onJobStarted` callback                    | P2       | pending | File: src/daemon/daemon-process.ts:77-86 |
| 1.4 | Replace magic number for WebSocket ready state with named constant                   | P3       | pending | File: src/api/websocket.ts:172           |
| 1.5 | Fix test type errors with incomplete mock objects for `Node`                         | P3       | pending | File: src/api/websocket.test.ts:305-363  |
