# Code Review Fix Tasks - Task 16.3: Status Polling Fallback

| ID  | Task                                                            | Priority | Status  | Notes                                             |
| --- | --------------------------------------------------------------- | -------- | ------- | ------------------------------------------------- |
| 1.1 | Fix race condition: polling starts before WebSocket connects    | P1       | pending | File: src/web/app/src/routes/+layout.svelte:53-63 |
| 1.2 | Simplify redundant condition branches in WebSocket subscription | P2       | pending | File: src/web/app/src/routes/+layout.svelte:53-63 |
| 1.3 | Add finally block to fetchStatus for loading cleanup robustness | P3       | pending | File: src/web/app/src/lib/stores/daemon.ts:38-53  |
