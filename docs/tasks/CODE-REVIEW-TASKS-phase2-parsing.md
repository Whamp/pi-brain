# Code Review Fix Tasks - Phase 2 Session Parsing

Review Date: 2026-01-27
Branch: fix/code-review-20260127-113810
Main Branch: major/pi-brain

## Issues Summary

Phase 2 (Session Parsing) was reviewed against PLAN.md and SPECS.md specifications.
Overall status: **Complete & Robust** with some improvements needed.

---

| ID  | Task                                                       | Priority | Status  | Notes                                                                                |
| --- | ---------------------------------------------------------- | -------- | ------- | ------------------------------------------------------------------------------------ |
| 1.1 | Add `handoff` boundary type stub with detection heuristic  | P1       | pending | File: src/parser/boundary.ts - Handoff type specified in PLAN.md but not implemented |
| 1.2 | Improve root handling with warning for multiple roots      | P2       | pending | File: src/parser/session.ts:143-148 - Current code silently returns first root       |
| 1.3 | Deprecate getProjectName with proper JSDoc and alternative | P2       | pending | File: src/parser/analyzer.ts - Should document SessionInfo.header.cwd as preferred   |
| 1.4 | Add iterator/generator mode for scanSessions               | P2       | pending | File: src/parser/analyzer.ts - Memory bottleneck for large histories                 |
| 1.5 | Make RESUME_GAP_MINUTES configurable                       | P3       | pending | File: src/parser/boundary.ts:58 - Should move to config system                       |
