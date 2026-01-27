# Project Overview

## Languages
- typescript: 9 files

## Statistics
- Total files: 9
- Total symbols: 157
  - function: 107
  - interface: 37
  - type: 10
  - variable: 3

---

src/storage/database.ts [1-155]
  interface:
    19-26: interface DatabaseOptions [exported]
    28-33: interface MigrationInfo [exported]
  function:
    38-63: openDatabase(options: DatabaseOptions = {}): Database.Database [exported]
      /** Open or create the pi-brain database */
    68-91: loadMigrations(): {} [exported]
      /** Load migrations from the migrations directory */
    96-106: getSchemaVersion(db: Database.Database): number [exported]
      /** Get current schema version */
    111-135: migrate(db: Database.Database): number [exported]
      /** Run pending migrations */
    140-142: closeDatabase(db: Database.Database): void [exported]
      /** Close the database connection */
    147-154: isDatabaseHealthy(db: Database.Database): boolean [exported]
      /** Check if the database is healthy */
  variable:
    14-14: any [exported]
      /** Default pi-brain data directory */
    17-17: any [exported]
      /** Default database path */
  imports:
    - better-sqlite3
    - node:fs
    - node:os
    - node:path
    - node:url

src/storage/decision-repository.ts [1-143]
  interface:
    10-19: interface ListDecisionsFilters [exported]
      /** Filters for querying daemon decisions */
    22-27: interface ListDecisionsOptions [exported]
      /** Pagination options */
    30-39: interface DaemonDecisionResult [exported]
      /** A daemon decision result with metadata */
    42-51: interface ListDecisionsResult [exported]
      /** Result from listDecisions query */
  function:
    56-124: listDecisions(db: Database.Database, filters: ListDecisionsFilters = {}, options: ListDecisionsOptions = {}): ListDecisionsResult [exported]
      /** List daemon decisions with filters and pagination. */
    129-142: updateDecisionFeedback(db: Database.Database, decisionId: string, feedback: string | null): boolean [exported]
      /** Update user feedback for a daemon decision */
  imports:
    - better-sqlite3

src/storage/edge-repository.ts [1-178]
  interface:
    19-27: interface EdgeRow [exported]
      /** Edge row from the database */
  function:
    36-38: generateEdgeId(): string [exported]
      /** Generate a unique edge ID with 'edg_' prefix */
    47-83: createEdge(db: Database.Database, sourceNodeId: string, targetNodeId: string, type: EdgeType, options: {
    metadata?: EdgeMetadata;
    createdBy?: "boundary" | "daemon" | "user";
  } = {}): Edge [exported]
      /** Create an edge between two nodes */
    88-95: getEdgesFrom(db: Database.Database, nodeId: string): {} [exported]
      /** Get edges from a node (outgoing) */
    100-107: getEdgesTo(db: Database.Database, nodeId: string): {} [exported]
      /** Get edges to a node (incoming) */
    112-119: getNodeEdges(db: Database.Database, nodeId: string): {} [exported]
      /** Get all edges for a node (both directions) */
    124-127: getEdge(db: Database.Database, edgeId: string): EdgeRow [exported]
      /** Get edge by ID */
    132-135: deleteEdge(db: Database.Database, edgeId: string): boolean [exported]
      /** Delete an edge */
    140-158: edgeExists(db: Database.Database, sourceNodeId: string, targetNodeId: string, type?: EdgeType): boolean [exported]
      /** Check if an edge exists between two nodes */
    167-177: edgeRowToEdge(row: EdgeRow): Edge [exported]
      /** Convert an Edge row from the database to an Edge object */
  imports:
    - ./node-types.js
    - better-sqlite3

src/storage/index.ts [1-11]
  imports:
    - ./database.js
    - ./edge-repository.js
    - ./node-crud.js
    - ./node-repository.js
    - ./node-storage.js
    - ./node-types.js

src/storage/node-crud.ts [1-189]
  interface:
    26-29: interface RepositoryOptions extends NodeStorageOptions [exported]
      /** Options for node repository operations */
    32-54: interface NodeRow [exported]
      /** Node row from the database */
  function:
    60-62: generateLessonId(): string [exported]
    64-66: generateQuirkId(): string [exported]
    68-70: generateErrorId(): string [exported]
    72-74: generateDecisionId(): string [exported]
    83-114: insertLessons(db: Database.Database, nodeId: string, lessonsByLevel: LessonsByLevel): void [exported]
      /** Insert lessons for a node */
    119-139: insertModelQuirks(db: Database.Database, nodeId: string, quirks: ModelQuirk[]): void [exported]
      /** Insert model quirks for a node */
    144-164: insertToolErrors(db: Database.Database, nodeId: string, errors: ToolError[]): void [exported]
      /** Insert tool errors for a node */
    169-188: insertDaemonDecisions(db: Database.Database, nodeId: string, decisions: DaemonDecision[]): void [exported]
      /** Insert daemon decisions for a node */
  imports:
    - ./node-storage.js
    - ./node-types.js
    - better-sqlite3

src/storage/node-repository.ts [1-3064]
  interface:
    725-730: interface SearchHighlight [exported]
      /** Highlight match for search results */
    733-740: interface SearchResult [exported]
      /** Enhanced search result with score and highlights */
    743-752: interface SearchOptions [exported]
      /** Options for enhanced search */
    755-764: interface SearchNodesResult [exported]
      /** Result from enhanced search with pagination metadata */
    1167-1176: interface ListLessonsFilters [exported]
      /** Filters for querying lessons */
    1179-1184: interface ListLessonsOptions [exported]
      /** Pagination options for lessons */
    1187-1206: interface ListLessonsResult [exported]
      /** Result from listLessons query */
    1403-1412: interface ListQuirksFilters [exported]
      /** Filters for querying model quirks */
    1415-1420: interface ListQuirksOptions [exported]
      /** Pagination options for quirks */
    1423-1432: interface QuirkResult [exported]
      /** A quirk result with metadata */
    1435-1444: interface ListQuirksResult [exported]
      /** Result from listQuirks query */
    1527-1537: interface ModelQuirkStats [exported]
      /** Stats for a single model */
    1666-1675: interface ListToolErrorsFilters [exported]
      /** Filters for querying tool errors */
    1678-1683: interface ListToolErrorsOptions [exported]
      /** Pagination options for tool errors */
    1686-1695: interface ToolErrorResult [exported]
      /** A tool error result with metadata */
    1698-1707: interface ListToolErrorsResult [exported]
      /** Result from listToolErrors query */
    2175-2200: interface ListNodesFilters [exported]
      /** Filters for querying nodes */
    2203-2212: interface ListNodesOptions [exported]
      /** Pagination and sorting options */
    2215-2224: interface ListNodesResult [exported]
      /** Result from listNodes query */
    2384-2396: interface SessionSummaryRow [exported]
      /** Session summary row from aggregation query */
    2491-2507: interface ConnectedNodesOptions [exported]
      /** Options for getConnectedNodes */
    2510-2525: interface TraversalEdge [exported]
      /** An edge with direction information for traversal results */
    2528-2535: interface ConnectedNodesResult [exported]
      /** Result from getConnectedNodes */
    2828-2847: interface NodeConversionContext [exported]
      /** Context needed to convert AgentNodeOutput to a full Node */
  type:
    708-713: SearchField = | "summary"
  | "decisions"
  | "lessons"
  | "tags"
  | "topics" [exported]
      /** Fields that can be searched in the FTS index */
    1321-1331: LessonsByLevelResult = Record<
  string,
  {
    count: number;
    recent: {
      id: string;
      summary: string;
      createdAt: string;
    }[];
  }
> [exported]
      /** Result from getLessonsByLevel */
    1397-1397: QuirkFrequency = "once" | "sometimes" | "often" | "always" [exported]
      /** Frequency values for model quirks */
    1400-1400: QuirkSeverity = "low" | "medium" | "high" [exported]
      /** Severity values for model quirks (matches spec) */
    1540-1540: QuirksByModelResult = Record<string, ModelQuirkStats> [exported]
      /** Result from getQuirksByModel */
    2143-2151: NodeSortField = | "timestamp"
  | "analyzed_at"
  | "project"
  | "type"
  | "outcome"
  | "tokens_used"
  | "cost"
  | "duration_minutes" [exported]
      /** Valid sort fields for listNodes */
    2154-2154: SortOrder = "asc" | "desc" [exported]
      /** Sort order */
    2157-2169: NodeTypeFilter = | "coding"
  | "sysadmin"
  | "research"
  | "planning"
  | "debugging"
  | "qa"
  | "brainstorm"
  | "handoff"
  | "refactor"
  | "documentation"
  | "configuration"
  | "other" [exported]
      /** Node type filter values */
    2172-2172: OutcomeFilter = "success" | "partial" | "failed" | "abandoned" [exported]
      /** Outcome filter values */
    2488-2488: TraversalDirection = "incoming" | "outgoing" | "both" [exported]
      /** Direction for graph traversal */
  function:
    73-102: clearAllData(db: Database.Database): void [exported]
      /** Clear all data from the database (nodes, edges, etc.) Used by rebuild-index CLI */
    108-174: insertNodeToDb(db: Database.Database, node: Node, dataFile: string, options: { skipFts?: boolean } = {}): void [exported]
      /** Insert a node into the database (without writing JSON file) Used by createNode and rebuild-index CLI */
    180-194: createNode(db: Database.Database, node: Node, options: RepositoryOptions = {}): Node [exported]
      /** Create a node - writes to both SQLite and JSON storage Returns the node with any auto-generated fields filled in */
    205-312: upsertNode(db: Database.Database, node: Node, options: RepositoryOptions = {}): { node: Node; created: boolean; } [exported]
      /** Upsert a node - creates if not exists, updates if exists. This provides idempotent ingestion for analysis jobs. If a job crashes after writing JSON but before DB insert, re-running will update the existing data cleanly without duplicates or errors. Returns the node and whether it was created (true) or updated (false). */
    319-409: updateNode(db: Database.Database, node: Node, options: RepositoryOptions = {}): Node [exported]
      /** Update a node - writes new JSON version and updates SQLite row. Throws if the node doesn't exist in the database. Returns the updated node. */
    414-420: getNode(db: Database.Database, nodeId: string): any [exported]
      /** Get a node by ID (returns the row from SQLite - always the latest version) */
    427-437: getNodeVersion(db: Database.Database, nodeId: string, version: number): any [exported]
      /** Get a specific version of a node from SQLite. Note: SQLite only stores the current/latest version. For historical versions, use getAllNodeVersions() which reads from JSON storage. */
    442-445: nodeExistsInDb(db: Database.Database, nodeId: string): boolean [exported]
      /** Check if a node exists in the database */
    450-456: getAllNodeVersions(nodeId: string, options: RepositoryOptions = {}): {} [exported]
      /** Get all versions of a node from JSON storage */
    462-468: deleteNode(db: Database.Database, nodeId: string): boolean [exported]
      /** Delete a node and all related data Note: Due to ON DELETE CASCADE, related records are automatically deleted */
    473-485: findNodeByEndEntryId(db: Database.Database, sessionFile: string, entryId: string): any [exported]
      /** Find a node that contains a specific entry ID as its end boundary */
    490-501: findLastNodeInSession(db: Database.Database, sessionFile: string): any [exported]
      /** Find the latest node for a given session file */
    506-517: findFirstNodeInSession(db: Database.Database, sessionFile: string): any [exported]
      /** Find the first node for a given session file */
    526-551: findPreviousProjectNode(db: Database.Database, project: string, beforeTimestamp: string): any [exported]
      /** Find the most recent node for a project before a given timestamp. Used for abandoned restart detection. Returns the full Node from JSON storage (not just the row) to access filesTouched and other content fields. */
    578-616: linkNodeToPredecessors(db: Database.Database, node: Node, context: {
    boundaryType?: string;
  } = {}): {} [exported]
      /** Automatically link a node to its predecessors based on session structure. Creates structural edges based on session continuity and fork relationships. Idempotent: will not create duplicate edges if called multiple times. */
    641-669: indexNodeForSearch(db: Database.Database, node: Node): void [exported]
      /** Index a node for full-text search */
    675-701: searchNodes(db: Database.Database, query: string, limit = 20): {} [exported]
      /** Search nodes using full-text search Quotes the query to handle special characters like hyphens */
    944-1067: searchNodesAdvanced(db: Database.Database, query: string, options: SearchOptions = {}): SearchNodesResult [exported]
      /** Enhanced search with scores, highlights, and filter support */
    1072-1160: countSearchResults(db: Database.Database, query: string, options: Pick<SearchOptions, "fields" | "filters"> = {}): number [exported]
      /** Count total search results (without fetching data) */
    1219-1318: listLessons(db: Database.Database, filters: ListLessonsFilters = {}, options: ListLessonsOptions = {}): ListLessonsResult [exported]
      /** List lessons with filters and pagination. Supports filtering by: - level (exact match) - project (partial match via nodes table) - tags (AND logic via lesson_tags table) - confidence (exact match) Per specs/api.md GET /api/v1/lessons endpoint. */
    1339-1379: getLessonsByLevel(db: Database.Database, recentLimit = 5): Record<string, { count: number; recent: {}; }> [exported]
      /** Get aggregated lesson stats by level. Returns counts and most recent lessons for each level. Per specs/api.md GET /api/v1/lessons/by-level endpoint. */
    1384-1390: countLessons(db: Database.Database, filters: ListLessonsFilters = {}): number [exported]
      /** Count lessons matching filters (without fetching data) */
    1464-1524: listQuirks(db: Database.Database, filters: ListQuirksFilters = {}, options: ListQuirksOptions = {}): ListQuirksResult [exported]
      /** List model quirks with filters and pagination. Supports filtering by: - model (exact match) - frequency (minimum frequency ranking) - project (partial match via nodes table) Per specs/api.md GET /api/v1/quirks endpoint. */
    1548-1586: getQuirksByModel(db: Database.Database, recentLimit = 5): Record<string, ModelQuirkStats> [exported]
      /** Get aggregated quirk stats by model. Returns counts and most recent quirks for each model that has quirks. Per specs/api.md GET /api/v1/stats/models endpoint (quirkCount field). */
    1591-1597: countQuirks(db: Database.Database, filters: ListQuirksFilters = {}): number [exported]
      /** Count quirks matching filters (without fetching data) */
    1602-1609: getAllQuirkModels(db: Database.Database): {} [exported]
      /** Get all unique models that have quirks recorded */
    1617-1659: getAggregatedQuirks(db: Database.Database, options: { minOccurrences?: number; limit?: number } = {}): {} [exported]
      /** Get aggregated quirks - similar observations grouped together. Useful for the dashboard "Model Quirks" panel. Per specs/storage.md "Find model quirks by frequency" query. */
    1712-1770: listToolErrors(db: Database.Database, filters: ListToolErrorsFilters = {}, options: ListToolErrorsOptions = {}): ListToolErrorsResult [exported]
      /** List individual tool errors with filters and pagination. */
    1776-1864: getAggregatedToolErrors(db: Database.Database, filters: ListToolErrorsFilters = {}, options: { limit?: number; offset?: number; groupByModel?: boolean } = {}): {} [exported]
      /** Get aggregated tool errors - grouped by tool and error type (and optionally model). Per specs/api.md GET /api/v1/tool-errors. */
    1870-1928: getToolErrorStats(db: Database.Database): { byTool: {}; byModel: {}; trends: { thisWeek: number; lastWeek: number; change: number; }; } [exported]
      /** Get tool error statistics for the dashboard. Per specs/api.md GET /api/v1/stats/tool-errors. */
    1933-1939: countToolErrors(db: Database.Database, filters: ListToolErrorsFilters = {}): number [exported]
      /** Count tool errors matching filters. */
    1944-1951: getAllToolsWithErrors(db: Database.Database): {} [exported]
      /** Get all unique tools that have errors recorded */
    1960-1967: getNodeSummary(db: Database.Database, nodeId: string): string [exported]
      /** Get node summary from FTS index */
    1972-1976: getNodeTags(db: Database.Database, nodeId: string): {} [exported]
      /** Get tags for a node */
    1981-1985: getNodeTopics(db: Database.Database, nodeId: string): {} [exported]
      /** Get topics for a node */
    1990-2013: getNodeLessons(db: Database.Database, nodeId: string): {} [exported]
      /** Get lessons for a node */
    2018-2041: getNodeQuirks(db: Database.Database, nodeId: string): {} [exported]
      /** Get model quirks for a node */
    2046-2069: getNodeToolErrors(db: Database.Database, nodeId: string): {} [exported]
      /** Get tool errors for a node */
    2074-2084: getAllTags(db: Database.Database): {} [exported]
      /** Get all unique tags in the system */
    2089-2093: getAllTopics(db: Database.Database): {} [exported]
      /** Get all unique topics in the system */
    2098-2105: getLessonTags(db: Database.Database, lessonId: string): {} [exported]
      /** Get tags for a specific lesson */
    2110-2120: getNodesByTag(db: Database.Database, tag: string): {} [exported]
      /** Find nodes by tag (matches both node tags and lesson tags) */
    2125-2136: getNodesByTopic(db: Database.Database, topic: string): {} [exported]
      /** Find nodes by topic */
    2254-2379: listNodes(db: Database.Database, filters: ListNodesFilters = {}, options: ListNodesOptions = {}): ListNodesResult [exported]
      /** List nodes with filters, pagination, and sorting. Supports filtering by: - project (partial match via LIKE) - type (exact match) - outcome (exact match) - date range (from/to on timestamp field) - computer (exact match) - hadClearGoal (boolean) - isNewProject (boolean) - tags (AND logic - nodes must have ALL specified tags) - topics (AND logic - nodes must have ALL specified topics) Per specs/api.md GET /api/v1/nodes endpoint. */
    2402-2431: getSessionSummaries(db: Database.Database, project: string, options: { limit?: number; offset?: number } = {}): {} [exported]
      /** Get aggregated session summaries for a project. Used for the session browser to avoid loading thousands of nodes. */
    2436-2444: getAllProjects(db: Database.Database): {} [exported]
      /** Get all unique projects in the system */
    2449-2457: getAllNodeTypes(db: Database.Database): {} [exported]
      /** Get all unique node types that have been used */
    2462-2470: getAllComputers(db: Database.Database): {} [exported]
      /** Get all unique computers (source machines) */
    2475-2481: countNodes(db: Database.Database, filters: ListNodesFilters = {}): number [exported]
      /** Count nodes matching filters (without fetching data) */
    2566-2671: getConnectedNodes(db: Database.Database, nodeId: string, options: ConnectedNodesOptions = {}): ConnectedNodesResult [exported]
      /** Get all nodes connected to a specific node with graph traversal. Supports: - Multi-hop traversal (depth 1-5) - Direction filtering (incoming, outgoing, both) - Edge type filtering Based on specs/storage.md graph traversal query and specs/api.md GET /api/v1/nodes/:id/connected endpoint. */
    2680-2727: getSubgraph(db: Database.Database, rootNodeIds: string[], options: ConnectedNodesOptions = {}): ConnectedNodesResult [exported]
      /** Get the subgraph for visualization - returns nodes and edges within a given depth from multiple root nodes. Unlike getConnectedNodes, this INCLUDES the root nodes in the result, which is useful for rendering a graph view starting from selected nodes. */
    2735-2789: findPath(db: Database.Database, fromNodeId: string, toNodeId: string, options: { maxDepth?: number } = {}): { nodeIds: {}; edges: {}; } [exported]
      /** Get the path between two nodes if one exists. Uses BFS to find the shortest path. Returns null if no path exists. */
    2795-2805: getAncestors(db: Database.Database, nodeId: string, options: { maxDepth?: number; edgeTypes?: EdgeType[] } = {}): ConnectedNodesResult [exported]
      /** Get all ancestors of a node (nodes that lead TO this node). Follows incoming edges only. */
    2811-2821: getDescendants(db: Database.Database, nodeId: string, options: { maxDepth?: number; edgeTypes?: EdgeType[] } = {}): ConnectedNodesResult [exported]
      /** Get all descendants of a node (nodes that this node leads TO). Follows outgoing edges only. */
    2853-3060: agentOutputToNode(output: AgentNodeOutput, context: NodeConversionContext): Node [exported]
      /** Convert AgentNodeOutput from the analyzer to a full Node structure Fills in source, metadata, and identity fields from the job context */
  imports:
    - ../daemon/processor.js
    - ../daemon/queue.js
    - ./edge-repository.js
    - ./node-crud.js
    - ./node-storage.js
    - ./node-types.js
    - better-sqlite3

src/storage/node-storage.ts [1-292]
  interface:
    24-27: interface NodeStorageOptions [exported]
  function:
    33-41: getNodeDir(timestamp: string, nodesDir = DEFAULT_NODES_DIR): string [exported]
      /** Get the directory path for a node based on its timestamp Returns: nodesDir/YYYY/MM */
    47-55: getNodePath(nodeId: string, version: number, timestamp: string, nodesDir = DEFAULT_NODES_DIR): string [exported]
      /** Get the full file path for a node Returns: nodesDir/YYYY/MM/<nodeId>-v<version>.json */
    60-82: writeNode(node: Node, options: NodeStorageOptions = {}): string [exported]
      /** Write a node to JSON file storage */
    87-102: readNode(nodeId: string, version: number, timestamp: string, options: NodeStorageOptions = {}): Node [exported]
      /** Read a node from JSON file storage */
    107-114: readNodeFromPath(filePath: string): Node [exported]
      /** Read a node by file path */
    119-128: nodeExists(nodeId: string, version: number, timestamp: string, options: NodeStorageOptions = {}): boolean [exported]
      /** Check if a node file exists */
    134-175: listNodeFiles(options: NodeStorageOptions = {}): {} [exported]
      /** List all node files in the storage directory Returns array of file paths */
    181-202: listNodeVersions(nodeId: string, options: NodeStorageOptions = {}): {} [exported]
      /** List all versions of a specific node Returns array of { version, path } sorted by version ascending */
    207-217: getLatestNodeVersion(nodeId: string, options: NodeStorageOptions = {}): { version: number; path: string; } [exported]
      /** Get the latest version of a node */
    222-231: readLatestNode(nodeId: string, options: NodeStorageOptions = {}): any [exported]
      /** Read the latest version of a node */
    236-261: parseNodePath(filePath: string): { nodeId: string; version: number; year: string; month: string; } [exported]
      /** Parse a node file path to extract node ID, version, year, and month */
    267-291: createNodeVersion(existingNode: Node, updates: Partial<Node>, options: NodeStorageOptions = {}): Node [exported]
      /** Create a new version of an existing node Copies the node with incremented version and updated previousVersions */
  variable:
    22-22: any [exported]
      /** Default nodes directory */
  imports:
    - ./node-types.js
    - node:fs
    - node:os
    - node:path

src/storage/node-types.ts [1-113]
  function:
    25-27: generateNodeId(): string [exported]
      /** Generate a unique 16-character hex node ID Uses first 16 chars of UUID (64 bits of entropy) */
    43-53: generateDeterministicNodeId(sessionFile: string, segmentStart: string, segmentEnd: string): string [exported]
      /** Generate a deterministic 16-character hex node ID based on session and segment. This ensures idempotent ingestion - re-running the same job produces the same ID. The ID is derived from: - Session file path - Segment start entry ID - Segment end entry ID Uses length-prefix encoding to prevent collisions from inputs containing delimiter characters (e.g., "a:b" + "c" vs "a" + "b:c"). Two jobs with the same inputs will always produce the same node ID. */
    58-60: nodeRef(nodeId: string, version: number): string [exported]
      /** Create a full node reference with version */
    65-74: parseNodeRef(ref: string): { nodeId: string; version: number; } [exported]
      /** Parse a node reference into id and version */
    79-89: emptyLessons(): LessonsByLevel [exported]
      /** Create an empty lessons structure */
    94-102: emptyObservations(): ModelObservations [exported]
      /** Create an empty observations structure */
    107-112: emptyDaemonMeta(): DaemonMeta [exported]
      /** Create an empty daemon meta structure */
  imports:
    - ../types/index.js
    - node:crypto

src/storage/pattern-repository.ts [1-369]
  interface:
    74-78: interface ListFailurePatternsOptions [exported]
    142-146: interface ListLessonPatternsOptions [exported]
    188-197: interface ListInsightsOptions [exported]
  function:
    80-111: listFailurePatterns(db: Database.Database, options: ListFailurePatternsOptions = {}): {} [exported]
    117-136: listModelStats(db: Database.Database): {} [exported]
    148-182: listLessonPatterns(db: Database.Database, options: ListLessonPatternsOptions = {}): {} [exported]
    199-252: listInsights(db: Database.Database, options: ListInsightsOptions = {}): {} [exported]
    254-268: getInsight(db: Database.Database, id: string): any [exported]
    270-294: getInsightsByModel(db: Database.Database, model: string, options: { minConfidence?: number; promptIncludedOnly?: boolean } = {}): {} [exported]
    296-328: countInsights(db: Database.Database, options: { type?: InsightType; model?: string; promptIncluded?: boolean } = {}): number [exported]
    330-347: updateInsightPrompt(db: Database.Database, id: string, promptText: string, promptIncluded: boolean, promptVersion?: string): void [exported]
  imports:
    - ../types/index.js
    - better-sqlite3

---
Files: 9
Estimated tokens: 6,579 (codebase: ~955,085)
