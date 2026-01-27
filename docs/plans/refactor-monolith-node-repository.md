# Refactoring Plan: node-repository.ts

## Current State

- **3,350 lines**, 100 exports
- Single monolithic file mixing CRUD, search, graph traversal, and domain queries
- Re-exported via `src/storage/index.ts`
- 20 files import from it

## Proposed Module Structure

### 1. `node-crud.ts` (~600 lines)

Core node CRUD operations:

- `clearAllData`
- `insertNodeToDb`, `createNode`, `upsertNode`, `updateNode`
- `getNode`, `getNodeVersion`, `nodeExistsInDb`, `getAllNodeVersions`
- `deleteNode`
- `findNodeByEndEntryId`, `findLastNodeInSession`, `findFirstNodeInSession`
- `findPreviousProjectNode`, `linkNodeToPredecessors`
- `generateNodeId` (re-export)
- Types: `RepositoryOptions`, `NodeRow`

### 2. `edge-repository.ts` (~150 lines)

Edge operations:

- `createEdge`, `getEdge`, `getEdgesFrom`, `getEdgesTo`, `getNodeEdges`
- `deleteEdge`, `edgeExists`, `edgeRowToEdge`
- Types: `EdgeRow`

### 3. `search-repository.ts` (~400 lines)

Full-text search:

- `indexNodeForSearch`, `searchNodes`, `searchNodesAdvanced`, `countSearchResults`
- Types: `SearchField`, `SearchHighlight`, `SearchResult`, `SearchOptions`, `SearchNodesResult`

### 4. `lesson-repository.ts` (~250 lines)

Lesson queries:

- `listLessons`, `getLessonsByLevel`, `countLessons`
- `getNodeLessons`, `getLessonTags`
- Types: `ListLessonsFilters`, `ListLessonsOptions`, `ListLessonsResult`, `LessonsByLevelResult`

### 5. `quirk-repository.ts` (~300 lines)

Model quirk queries:

- `listQuirks`, `getQuirksByModel`, `countQuirks`, `getAllQuirkModels`, `getAggregatedQuirks`
- `getNodeQuirks`
- Types: `QuirkFrequency`, `QuirkSeverity`, `ListQuirksFilters`, `ListQuirksOptions`, `QuirkResult`, `ListQuirksResult`, `ModelQuirkStats`, `QuirksByModelResult`

### 6. `tool-error-repository.ts` (~250 lines)

Tool error queries:

- `listToolErrors`, `getAggregatedToolErrors`, `getToolErrorStats`, `countToolErrors`, `getAllToolsWithErrors`
- `getNodeToolErrors`
- Types: `ListToolErrorsFilters`, `ListToolErrorsOptions`, `ToolErrorResult`, `ListToolErrorsResult`

### 7. `node-queries.ts` (~400 lines)

Listing and aggregation:

- `listNodes`, `countNodes`, `getSessionSummaries`
- `getAllProjects`, `getAllNodeTypes`, `getAllComputers`
- `getNodeSummary`, `getNodeTags`, `getNodeTopics`
- `getAllTags`, `getAllTopics`, `getNodesByTag`, `getNodesByTopic`
- Types: `NodeSortField`, `SortOrder`, `NodeTypeFilter`, `OutcomeFilter`, `ListNodesFilters`, `ListNodesOptions`, `ListNodesResult`, `SessionSummaryRow`

### 8. `graph-repository.ts` (~300 lines)

Graph traversal:

- `getConnectedNodes`, `getSubgraph`, `findPath`, `getAncestors`, `getDescendants`
- Types: `TraversalDirection`, `ConnectedNodesOptions`, `TraversalEdge`, `ConnectedNodesResult`

### 9. `node-conversion.ts` (~200 lines)

Node conversion utilities:

- `agentOutputToNode`
- Types: `NodeConversionContext`

---

## Implementation Steps

### Phase 1: Create new modules (no breaking changes)

1. Create each new file with functions extracted from node-repository.ts
2. Keep original functions in node-repository.ts (importing from new modules)
3. Maintain backward compatibility via re-exports in node-repository.ts

### Phase 2: Update imports

1. Update internal imports to use new modules directly
2. Keep `src/storage/index.ts` re-exporting everything

### Phase 3: Remove legacy barrel

1. Delete re-exports from node-repository.ts
2. Convert node-repository.ts to just re-export from new modules (or delete entirely)

---

## Dependency Order

Extract in this order to minimize circular dependencies:

1. `node-crud.ts` (no internal deps)
2. `edge-repository.ts` (no internal deps)
3. `node-conversion.ts` (depends on node-crud)
4. `search-repository.ts` (depends on node-crud)
5. `lesson-repository.ts` (no deps)
6. `quirk-repository.ts` (no deps)
7. `tool-error-repository.ts` (no deps)
8. `node-queries.ts` (depends on node-crud)
9. `graph-repository.ts` (depends on edge-repository)

---

## Estimated Effort

- **Phase 1**: 2-3 hours (mechanical extraction)
- **Phase 2**: 1 hour (update imports)
- **Phase 3**: 30 min (cleanup)
- **Testing**: Run full test suite after each phase

## Risk Mitigation

- All tests must pass after each phase
- No API changes - pure internal refactor
- Re-export everything from `storage/index.ts` to maintain public API
