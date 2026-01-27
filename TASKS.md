# Code Review Fix Tasks

| ID  | Task                                               | Priority | Status  | Notes                                                                    |
| --- | -------------------------------------------------- | -------- | ------- | ------------------------------------------------------------------------ |
| 1.1 | Fix `decodeProjectDir()` hyphen corruption         | P1       | pending | File: src/parser/analyzer.ts - naively replaces all hyphens with slashes |
| 1.2 | Populate `boundaries` field in `extractSegments()` | P2       | pending | File: src/parser/boundary.ts - boundaries array always empty             |
| 1.3 | Support multiple boundaries at same entry          | P2       | pending | File: src/parser/boundary.ts - Map overwrites concurrent boundaries      |
