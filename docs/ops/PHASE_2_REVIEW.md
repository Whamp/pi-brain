# Phase 2 Review: Session Parsing

## Executive Summary

Phase 2 (Session Parsing) is marked as "Done" in `TASKS.md`, and the core components (`boundary.ts`, `session.ts`, `fork.ts`, `analyzer.ts`) are implemented. However, a deep code audit and verification revealed **critical bugs** in the segment extraction logic that result in data loss. Specifically, the metadata explaining _why_ a session was segmented (e.g., "User branched", "Session resumed", "Context compacted") is dropped during extraction. Additionally, there are edge cases where simultaneous boundaries (e.g., a Branch that is also a Resume) cause one boundary to be silently overwritten.

While the "Happy Path" works, these bugs undermine the "Second Brain" vision by stripping semantic context from the knowledge graph. A downstream effect is that the Daemon may struggle to correctly categorize the nature of work segments.

## Missing / Incomplete Items

### 1. `Segment.boundaries` is Always Empty

In `src/parser/boundary.ts`, the `Segment` interface defines a `boundaries` field:

```typescript
export interface Segment {
  // ...
  boundaries: Boundary[];
  // ...
}
```

However, the `extractSegments` function **never populates this field**. It initializes it to `[]` and never assigns the detected boundaries to the segment.
**Impact**: The analysis engine loses the context of _why_ a segment started or ended.

### 2. Simultaneous Boundaries cause Data Loss

In `src/parser/boundary.ts`, `extractSegments` builds a lookup map:

```typescript
const boundaryByEntryId = new Map<string, Boundary>();
for (const boundary of boundaries) {
  boundaryByEntryId.set(boundary.entryId, boundary);
}
```

If a single entry triggers multiple boundaries (e.g., a `branch_summary` entry that occurs after a 10-minute gap, triggering both "branch" and "resume"), the `Map.set` operation **overwrites** the previous boundary.
**Impact**: If a "Branch" is also a "Resume", the system might record it only as "Resume", losing the explicit user intent to branch.

### 3. Naive Path Decoding

In `src/parser/analyzer.ts`, `decodeProjectDir` attempts to reverse the project directory encoding:

```typescript
return `/${inner.replaceAll("-", "/")}`;
```

This naive replacement converts ALL hyphens to slashes. A project path like `/home/user/my-project` becomes `/home/user/my/project`.
**Impact**: Project names in the UI or analysis reports will be incorrect for any project with hyphens in its name.

## Alignment & Drift

### Alignment

The implementation adheres to the `specs/node-model.md` regarding the _types_ of boundaries (Fork, Branch, Resume, Compaction). The parsing logic for identifying these events is largely correct.

### Drift / Integrity Issues

The "Second Brain" goal requires high-fidelity capture of user intent. The bug where `Segment.boundaries` is empty represents a significant drift from this goal. The system effectively "forgets" the structural reasons for session splits before they even reach the database.

## Technical Debt

- **Boundary Map Logic**: The use of `Map<string, Boundary>` instead of `Map<string, Boundary[]>` in `extractSegments` is a structural flaw that prevents handling complex boundary conditions.
- **Fixture Gaps**: The existing tests (`src/parser/real-session.test.ts`) check for segment _counts_ but do not verify that the resulting `Segment` objects contain the correct boundary metadata. This allowed the bugs to pass unnoticed.

## Actionable Next Steps

Before considering Phase 2 truly "Closed", the following must be addressed:

1.  **Fix `extractSegments`**: Update logic to populate `Segment.boundaries`.
2.  **Support Multiple Boundaries**: Change the internal map in `extractSegments` to store `Boundary[]` per entry ID, and handle multiple boundaries correctly when creating segments.
3.  **Fix `decodeProjectDir`**: Implement a robust decoding strategy or remove the function if `header.cwd` is sufficient.
4.  **Strengthen Tests**: Add assertions in `real-session.test.ts` to verify `segment.boundaries` content, specifically for "Mixed Boundary" scenarios.

## Verification Script

A reproduction script `reproduce_bugs.ts` was created and confirmed these issues:

- `Segment 0 boundaries length: 0` (Expected: >0)
- `decodeProjectDir` returned incorrect path.
