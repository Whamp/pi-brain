# Project Overview

## Languages
- typescript: 20 files

## Statistics
- Total files: 20
- Total symbols: 213
  - function: 140
  - interface: 58
  - type: 10
  - variable: 5

---

src/storage/bridge-discovery.ts [1-260]
  interface:
    23-32: interface BridgePath [exported]
      /** A discovered path in the graph */
    34-41: interface BridgeDiscoveryOptions [exported]
  function:
    57-218: findBridgePaths(db: Database.Database, seedNodeIds: string[], options: BridgeDiscoveryOptions = {}): {} [exported]
      /** Find interesting multi-hop paths originating from seed nodes. Uses BFS/DFS to traverse outgoing edges, scoring paths based on edge confidence and node relevance. */
  imports:
    - ./edge-repository.js
    - ./node-crud.js
    - ./node-storage.js
    - better-sqlite3

src/storage/database.ts [1-298]
  interface:
    20-34: interface DatabaseOptions [exported]
    36-41: interface MigrationInfo [exported]
  function:
    46-84: openDatabase(options: DatabaseOptions = {}): Database.Database [exported]
      /** Open or create the pi-brain database */
    89-112: loadMigrations(): {} [exported]
      /** Load migrations from the migrations directory */
    117-127: getSchemaVersion(db: Database.Database): number [exported]
      /** Get current schema version */
    133-154: getMigrationSkippedReason(db: Database.Database, version: number): string [exported]
      /** Check if a specific migration was skipped due to missing dependencies. Returns the requirement that caused it to be skipped, or null if not skipped. */
    161-170: parseMigrationRequirements(sql: string): {} [exported]
      /** Parse a migration SQL file for REQUIRES directives. Format: -- REQUIRES: requirement1, requirement2 Returns array of requirements (e.g., ['sqlite-vec']) */
    176-187: checkMigrationRequirements(db: Database.Database, requirements: string[]): string [exported]
      /** Check if migration requirements are satisfied. Returns unsatisfied requirement, or null if all satisfied. */
    192-249: migrate(db: Database.Database): number [exported]
      /** Run pending migrations */
    254-256: closeDatabase(db: Database.Database): void [exported]
      /** Close the database connection */
    261-268: isDatabaseHealthy(db: Database.Database): boolean [exported]
      /** Check if the database is healthy */
    273-281: loadVecExtension(db: Database.Database): boolean [exported]
      /** Load the sqlite-vec extension */
    286-297: isVecLoaded(db: Database.Database): boolean [exported]
      /** Check if sqlite-vec extension is loaded */
  variable:
    15-15: any [exported]
      /** Default pi-brain data directory */
    18-18: any [exported]
      /** Default database path */
  imports:
    - better-sqlite3
    - node:fs
    - node:os
    - node:path
    - node:url
    - sqlite-vec

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

src/storage/edge-repository.ts [1-197]
  interface:
    19-30: interface EdgeRow [exported]
      /** Edge row from the database */
  function:
    39-41: generateEdgeId(): string [exported]
      /** Generate a unique edge ID with 'edg_' prefix */
    50-92: createEdge(db: Database.Database, sourceNodeId: string, targetNodeId: string, type: EdgeType, options: {
    metadata?: EdgeMetadata;
    createdBy?: "boundary" | "daemon" | "user";
    confidence?: number;
    similarity?: number;
  } = {}): Edge [exported]
      /** Create an edge between two nodes */
    97-104: getEdgesFrom(db: Database.Database, nodeId: string): {} [exported]
      /** Get edges from a node (outgoing) */
    109-116: getEdgesTo(db: Database.Database, nodeId: string): {} [exported]
      /** Get edges to a node (incoming) */
    121-128: getNodeEdges(db: Database.Database, nodeId: string): {} [exported]
      /** Get all edges for a node (both directions) */
    133-136: getAllEdges(db: Database.Database): {} [exported]
      /** Get all edges */
    141-144: getEdge(db: Database.Database, edgeId: string): EdgeRow [exported]
      /** Get edge by ID */
    149-152: deleteEdge(db: Database.Database, edgeId: string): boolean [exported]
      /** Delete an edge */
    157-175: edgeExists(db: Database.Database, sourceNodeId: string, targetNodeId: string, type?: EdgeType): boolean [exported]
      /** Check if an edge exists between two nodes */
    184-196: edgeRowToEdge(row: EdgeRow): Edge [exported]
      /** Convert an Edge row from the database to an Edge object */
  imports:
    - ./node-types.js
    - better-sqlite3

src/storage/embedding-utils.ts [1-625]
  interface:
    325-329: interface BackfillEmbeddingProvider [exported]
      /** Embedding provider interface for backfill operations. Matches the EmbeddingProvider interface from facet-discovery.ts. */
    334-339: interface BackfillLogger [exported]
      /** Logger interface for backfill operations. */
    344-355: interface BackfillEmbeddingsOptions [exported]
      /** Options for backfillEmbeddings function. */
    360-371: interface BackfillResult [exported]
      /** Result of a backfill operation. */
  function:
    43-83: buildEmbeddingText(node: Node): string [exported]
      /** Build embedding text from a node for semantic search. Format: ``` [{type}] {summary} Decisions: - {decision.what} (why: {decision.why}) - ... Lessons: - {lesson.summary} - ... ``` This richer format enables semantic search to find nodes by: - What type of work was done - What was accomplished (summary) - What decisions were made and why - What lessons were learned */
    97-109: buildSimpleEmbeddingText(type: string | null, summary: string | null): string [exported]
      /** Build simple embedding text from node summary data. This is a lightweight version for use with partial node data (e.g., NodeSummaryRow from database queries). Returns: - `[type] summary` when both are present - `summary` when only summary is present - `[type]` when only type is present (sparse but valid for type-only filtering) - `` (empty string) when both are null */
    119-121: isRichEmbeddingFormat(inputText: string): boolean [exported]
      /** Check if embedding text uses the rich format (includes decisions/lessons). Used to detect nodes with old-format embeddings that need re-embedding. Detection relies on the version marker [emb:v2]. This avoids strict dependencies on whitespace or formatting of the sections. */
    135-205: storeEmbeddingWithVec(db: Database.Database, nodeId: string, embedding: number[], modelName: string, inputText: string): { rowid: bigint; vecUpdated: boolean; } [exported]
      /** Store an embedding for a node in both node_embeddings and node_embeddings_vec tables. Handles upsert semantics - if an embedding already exists for the node, it will be replaced. The vec table is only updated if sqlite-vec is loaded. Uses a transaction to ensure atomicity - either both tables are updated or neither. */
    210-237: deleteEmbedding(db: Database.Database, nodeId: string): boolean [exported]
      /** Delete an embedding from both node_embeddings and node_embeddings_vec tables. */
    242-275: getEmbedding(db: Database.Database, nodeId: string): { embedding: {}; modelName: string; inputText: string; createdAt: string; } [exported]
      /** Get embedding for a node. */
    280-285: hasEmbedding(db: Database.Database, nodeId: string): boolean [exported]
      /** Check if a node has an embedding stored. */
    296-302: serializeEmbedding(embedding: number[]): Buffer [exported]
      /** Serialize an embedding array to a binary Buffer (Float32 little-endian). This format is used for storing in the node_embeddings table. */
    309-315: deserializeEmbedding(buffer: Buffer): {} [exported]
      /** Deserialize a binary Buffer to an embedding array. Inverse of serializeEmbedding. */
    403-443: findNodesNeedingEmbedding(db: Database.Database, provider: BackfillEmbeddingProvider, options: { limit?: number; force?: boolean } = {}): {} [exported]
      /** Find nodes that need embedding generation or update. A node needs embedding if: 1. No embedding exists for it 2. Embedding uses a different model than the current provider 3. Embedding uses old format (not rich format with decisions/lessons) */
    459-585: async backfillEmbeddings(db: Database.Database, provider: BackfillEmbeddingProvider, readNodeFromPath: (dataFile: string) => Node, options: BackfillEmbeddingsOptions = {}): Promise<BackfillResult> [exported]
      /** Backfill embeddings for nodes that are missing or have outdated embeddings. This function: 1. Finds nodes needing embedding (missing, wrong model, or old format) 2. Loads full node data from JSON files 3. Builds rich embedding text (summary + decisions + lessons) 4. Generates embeddings in batches via the provider 5. Stores in both node_embeddings table and node_embeddings_vec (if available) Errors are handled gracefully: - Individual node failures don't stop the batch - Returns statistics including failed node IDs for retry */
    592-624: countNodesNeedingEmbedding(db: Database.Database, provider: BackfillEmbeddingProvider, options: { force?: boolean } = {}): { total: number; needsEmbedding: number; } [exported]
      /** Count nodes that need embedding backfill. Useful for showing progress or estimating work before running backfill. */
  variable:
    19-19: "[emb:v2]" [exported]
      /** Format version marker appended to rich embedding text. Used to distinguish new-format embeddings (even with empty decisions/lessons) from old simple-format embeddings. */
  imports:
    - ../types/index.js
    - ./database.js
    - better-sqlite3

src/storage/graph-repository.ts [1-366]
  interface:
    31-47: interface ConnectedNodesOptions [exported]
      /** Options for getConnectedNodes */
    50-65: interface TraversalEdge [exported]
      /** An edge with direction information for traversal results */
    68-75: interface ConnectedNodesResult [exported]
      /** Result from getConnectedNodes */
  type:
    28-28: TraversalDirection = "incoming" | "outgoing" | "both" [exported]
      /** Direction for graph traversal */
  function:
    110-215: getConnectedNodes(db: Database.Database, nodeId: string, options: ConnectedNodesOptions = {}): ConnectedNodesResult [exported]
      /** Get all nodes connected to a specific node with graph traversal. Supports: - Multi-hop traversal (depth 1-5) - Direction filtering (incoming, outgoing, both) - Edge type filtering Based on specs/storage.md graph traversal query and specs/api.md GET /api/v1/nodes/:id/connected endpoint. */
    224-271: getSubgraph(db: Database.Database, rootNodeIds: string[], options: ConnectedNodesOptions = {}): ConnectedNodesResult [exported]
      /** Get the subgraph for visualization - returns nodes and edges within a given depth from multiple root nodes. Unlike getConnectedNodes, this INCLUDES the root nodes in the result, which is useful for rendering a graph view starting from selected nodes. */
    279-333: findPath(db: Database.Database, fromNodeId: string, toNodeId: string, options: { maxDepth?: number } = {}): { nodeIds: {}; edges: {}; } [exported]
      /** Get the path between two nodes if one exists. Uses BFS to find the shortest path. Returns null if no path exists. */
    339-349: getAncestors(db: Database.Database, nodeId: string, options: { maxDepth?: number; edgeTypes?: EdgeType[] } = {}): ConnectedNodesResult [exported]
      /** Get all ancestors of a node (nodes that lead TO this node). Follows incoming edges only. */
    355-365: getDescendants(db: Database.Database, nodeId: string, options: { maxDepth?: number; edgeTypes?: EdgeType[] } = {}): ConnectedNodesResult [exported]
      /** Get all descendants of a node (nodes that this node leads TO). Follows outgoing edges only. */
  imports:
    - ./edge-repository.js
    - ./node-crud.js
    - ./node-types.js
    - better-sqlite3

src/storage/hybrid-search.ts [1-609]
  interface:
    60-79: interface HybridScoreBreakdown [exported]
      /** Breakdown of scores for transparency and debugging. */
    84-95: interface HybridSearchResult [exported]
      /** Enhanced search result with hybrid scoring. */
    100-117: interface HybridSearchOptions [exported]
      /** Options for hybrid search. */
    122-133: interface HybridSearchResponse [exported]
      /** Result from hybrid search with pagination metadata. */
  function:
    351-553: hybridSearch(db: Database.Database, query: string, options: HybridSearchOptions = {}): HybridSearchResponse [exported]
      /** Perform hybrid search combining vector, FTS, relation, and other signals. The algorithm: 1. If queryEmbedding provided, perform vector search to get initial candidates 2. Perform FTS search to get keyword matches 3. Merge candidates from both sources 4. For each candidate, calculate edge count (relation score) 5. Calculate all score components and weighted final score 6. Sort by final score, apply pagination */
    562-608: calculateNodeHybridScore(db: Database.Database, nodeId: string, query: string, options: HybridSearchOptions = {}): HybridScoreBreakdown [exported]
      /** Calculate hybrid score for a single node (useful for re-ranking). */
  variable:
    33-42: HYBRID_WEIGHTS [exported]
      /** Weights for each scoring component. Sum should equal ~1.3 to allow strong signals to boost final score. Final scores are normalized to 0..1 range. */
  imports:
    - ./database.js
    - ./node-crud.js
    - ./search-repository.js
    - ./semantic-search.js
    - better-sqlite3

src/storage/index.ts [1-22]
  imports:
    - ./bridge-discovery.js
    - ./database.js
    - ./edge-repository.js
    - ./embedding-utils.js
    - ./graph-repository.js
    - ./hybrid-search.js
    - ./lesson-repository.js
    - ./node-conversion.js
    - ./node-crud.js
    - ./node-queries.js
    - ./node-storage.js
    - ./node-types.js
    - ./quirk-repository.js
    - ./relationship-edges.js
    - ./search-repository.js
    - ./semantic-search.js
    - ./tool-error-repository.js

src/storage/lesson-repository.ts [1-284]
  interface:
    16-25: interface ListLessonsFilters [exported]
      /** Filters for querying lessons */
    28-33: interface ListLessonsOptions [exported]
      /** Pagination options for lessons */
    36-55: interface ListLessonsResult [exported]
      /** Result from listLessons query */
  type:
    58-68: LessonsByLevelResult = Record<
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
  function:
    85-184: listLessons(db: Database.Database, filters: ListLessonsFilters = {}, options: ListLessonsOptions = {}): ListLessonsResult [exported]
      /** List lessons with filters and pagination. Supports filtering by: - level (exact match) - project (partial match via nodes table) - tags (AND logic via lesson_tags table) - confidence (exact match) Per specs/api.md GET /api/v1/lessons endpoint. */
    192-232: getLessonsByLevel(db: Database.Database, recentLimit = 5): Record<string, { count: number; recent: {}; }> [exported]
      /** Get aggregated lesson stats by level. Returns counts and most recent lessons for each level. Per specs/api.md GET /api/v1/lessons/by-level endpoint. */
    237-243: countLessons(db: Database.Database, filters: ListLessonsFilters = {}): number [exported]
      /** Count lessons matching filters (without fetching data) */
    248-271: getNodeLessons(db: Database.Database, nodeId: string): {} [exported]
      /** Get lessons for a node */
    276-283: getLessonTags(db: Database.Database, lessonId: string): {} [exported]
      /** Get tags for a specific lesson */
  imports:
    - better-sqlite3

src/storage/node-conversion.ts [1-356]
  interface:
    25-44: interface NodeConversionContext [exported]
      /** Context needed to convert AgentNodeOutput to a full Node */
  function:
    54-261: agentOutputToNode(output: AgentNodeOutput, context: NodeConversionContext): Node [exported]
      /** Convert AgentNodeOutput from the analyzer to a full Node structure Fills in source, metadata, and identity fields from the job context */
    268-348: nodeRowToNode(row: NodeRow, loadFull = false): Node [exported]
      /** Transform a NodeRow (flat SQLite row) to Node (nested structure). For listings, constructs Node from row data without reading JSON. For full details, reads the JSON file. */
    353-355: nodeRowsToNodes(rows: NodeRow[], loadFull = false): {} [exported]
      /** Transform array of NodeRows to Nodes */
  imports:
    - ../daemon/processor.js
    - ../daemon/queue.js
    - ./node-crud.js
    - ./node-storage.js
    - ./node-types.js

src/storage/node-crud.ts [1-763]
  interface:
    39-42: interface RepositoryOptions extends NodeStorageOptions [exported]
      /** Options for node repository operations */
    45-72: interface NodeRow [exported]
      /** Node row from the database */
  function:
    81-112: insertLessons(db: Database.Database, nodeId: string, lessonsByLevel: LessonsByLevel): void [exported]
      /** Insert lessons for a node */
    117-137: insertModelQuirks(db: Database.Database, nodeId: string, quirks: ModelQuirk[]): void [exported]
      /** Insert model quirks for a node */
    142-162: insertToolErrors(db: Database.Database, nodeId: string, errors: ToolError[]): void [exported]
      /** Insert tool errors for a node */
    167-186: insertDaemonDecisions(db: Database.Database, nodeId: string, decisions: DaemonDecision[]): void [exported]
      /** Insert daemon decisions for a node */
    196-225: clearAllData(db: Database.Database): void [exported]
      /** Clear all data from the database (nodes, edges, etc.) Used by rebuild-index CLI */
    231-304: insertNodeToDb(db: Database.Database, node: Node, dataFile: string, options: { skipFts?: boolean } = {}): void [exported]
      /** Insert a node into the database (without writing JSON file) Used by createNode and rebuild-index CLI */
    310-324: createNode(db: Database.Database, node: Node, options: RepositoryOptions = {}): Node [exported]
      /** Create a node - writes to both SQLite and JSON storage Returns the node with any auto-generated fields filled in */
    335-442: upsertNode(db: Database.Database, node: Node, options: RepositoryOptions = {}): { node: Node; created: boolean; } [exported]
      /** Upsert a node - creates if not exists, updates if exists. This provides idempotent ingestion for analysis jobs. If a job crashes after writing JSON but before DB insert, re-running will update the existing data cleanly without duplicates or errors. Returns the node and whether it was created (true) or updated (false). */
    449-539: updateNode(db: Database.Database, node: Node, options: RepositoryOptions = {}): Node [exported]
      /** Update a node - writes new JSON version and updates SQLite row. Throws if the node doesn't exist in the database. Returns the updated node. */
    544-550: getNode(db: Database.Database, nodeId: string): NodeRow [exported]
      /** Get a node by ID (returns the row from SQLite - always the latest version) */
    557-567: getNodeVersion(db: Database.Database, nodeId: string, version: number): NodeRow [exported]
      /** Get a specific version of a node from SQLite. Note: SQLite only stores the current/latest version. For historical versions, use getAllNodeVersions() which reads from JSON storage. */
    572-575: nodeExistsInDb(db: Database.Database, nodeId: string): boolean [exported]
      /** Check if a node exists in the database */
    580-586: getAllNodeVersions(nodeId: string, options: RepositoryOptions = {}): {} [exported]
      /** Get all versions of a node from JSON storage */
    592-598: deleteNode(db: Database.Database, nodeId: string): boolean [exported]
      /** Delete a node and all related data Note: Due to ON DELETE CASCADE, related records are automatically deleted */
    603-615: findNodeByEndEntryId(db: Database.Database, sessionFile: string, entryId: string): NodeRow [exported]
      /** Find a node that contains a specific entry ID as its end boundary */
    620-631: findLastNodeInSession(db: Database.Database, sessionFile: string): NodeRow [exported]
      /** Find the latest node for a given session file */
    636-647: findFirstNodeInSession(db: Database.Database, sessionFile: string): NodeRow [exported]
      /** Find the first node for a given session file */
    656-681: findPreviousProjectNode(db: Database.Database, project: string, beforeTimestamp: string): any [exported]
      /** Find the most recent node for a project before a given timestamp. Used for abandoned restart detection. Returns the full Node from JSON storage (not just the row) to access filesTouched and other content fields. */
    708-746: linkNodeToPredecessors(db: Database.Database, node: Node, context: {
    boundaryType?: string;
  } = {}): {} [exported]
      /** Automatically link a node to its predecessors based on session structure. Creates structural edges based on session continuity and fork relationships. Idempotent: will not create duplicate edges if called multiple times. */
  imports:
    - ./edge-repository.js
    - ./node-storage.js
    - ./node-types.js
    - ./search-repository.js
    - better-sqlite3

src/storage/node-queries.ts [1-455]
  interface:
    140-165: interface ListNodesFilters [exported]
      /** Filters for querying nodes */
    168-177: interface ListNodesOptions [exported]
      /** Pagination and sorting options */
    180-189: interface ListNodesResult [exported]
      /** Result from listNodes query */
    353-365: interface SessionSummaryRow [exported]
      /** Session summary row from aggregation query */
  type:
    108-116: NodeSortField = | "timestamp"
  | "analyzed_at"
  | "project"
  | "type"
  | "outcome"
  | "tokens_used"
  | "cost"
  | "duration_minutes" [exported]
      /** Valid sort fields for listNodes */
    119-119: SortOrder = "asc" | "desc" [exported]
      /** Sort order */
    122-134: NodeTypeFilter = | "coding"
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
    137-137: OutcomeFilter = "success" | "partial" | "failed" | "abandoned" [exported]
      /** Outcome filter values */
  function:
    21-28: getNodeSummary(db: Database.Database, nodeId: string): string [exported]
      /** Get node summary from FTS index */
    33-37: getNodeTags(db: Database.Database, nodeId: string): {} [exported]
      /** Get tags for a node */
    42-46: getNodeTopics(db: Database.Database, nodeId: string): {} [exported]
      /** Get topics for a node */
    51-61: getAllTags(db: Database.Database): {} [exported]
      /** Get all unique tags in the system */
    66-70: getAllTopics(db: Database.Database): {} [exported]
      /** Get all unique topics in the system */
    75-85: getNodesByTag(db: Database.Database, tag: string): {} [exported]
      /** Find nodes by tag (matches both node tags and lesson tags) */
    90-101: getNodesByTopic(db: Database.Database, topic: string): {} [exported]
      /** Find nodes by topic */
    219-344: listNodes(db: Database.Database, filters: ListNodesFilters = {}, options: ListNodesOptions = {}): ListNodesResult [exported]
      /** List nodes with filters, pagination, and sorting. Supports filtering by: - project (partial match via LIKE) - type (exact match) - outcome (exact match) - date range (from/to on timestamp field) - computer (exact match) - hadClearGoal (boolean) - isNewProject (boolean) - tags (AND logic - nodes must have ALL specified tags) - topics (AND logic - nodes must have ALL specified topics) Per specs/api.md GET /api/v1/nodes endpoint. */
    371-400: getSessionSummaries(db: Database.Database, project: string, options: { limit?: number; offset?: number } = {}): {} [exported]
      /** Get aggregated session summaries for a project. Used for the session browser to avoid loading thousands of nodes. */
    409-417: getAllProjects(db: Database.Database): {} [exported]
      /** Get all unique projects in the system */
    422-430: getAllNodeTypes(db: Database.Database): {} [exported]
      /** Get all unique node types that have been used */
    435-443: getAllComputers(db: Database.Database): {} [exported]
      /** Get all unique computers (source machines) */
    448-454: countNodes(db: Database.Database, filters: ListNodesFilters = {}): number [exported]
      /** Count nodes matching filters (without fetching data) */
  imports:
    - ./node-crud.js
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

src/storage/node-types.ts [1-129]
  function:
    25-27: generateNodeId(): string [exported]
      /** Generate a unique 16-character hex node ID Uses first 16 chars of UUID (64 bits of entropy) */
    29-31: generateLessonId(): string [exported]
    33-35: generateQuirkId(): string [exported]
    37-39: generateErrorId(): string [exported]
    41-43: generateDecisionId(): string [exported]
    59-69: generateDeterministicNodeId(sessionFile: string, segmentStart: string, segmentEnd: string): string [exported]
      /** Generate a deterministic 16-character hex node ID based on session and segment. This ensures idempotent ingestion - re-running the same job produces the same ID. The ID is derived from: - Session file path - Segment start entry ID - Segment end entry ID Uses length-prefix encoding to prevent collisions from inputs containing delimiter characters (e.g., "a:b" + "c" vs "a" + "b:c"). Two jobs with the same inputs will always produce the same node ID. */
    74-76: nodeRef(nodeId: string, version: number): string [exported]
      /** Create a full node reference with version */
    81-90: parseNodeRef(ref: string): { nodeId: string; version: number; } [exported]
      /** Parse a node reference into id and version */
    95-105: emptyLessons(): LessonsByLevel [exported]
      /** Create an empty lessons structure */
    110-118: emptyObservations(): ModelObservations [exported]
      /** Create an empty observations structure */
    123-128: emptyDaemonMeta(): DaemonMeta [exported]
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

src/storage/quirk-repository.ts [1-315]
  interface:
    22-31: interface ListQuirksFilters [exported]
      /** Filters for querying model quirks */
    34-39: interface ListQuirksOptions [exported]
      /** Pagination options for quirks */
    42-51: interface QuirkResult [exported]
      /** A quirk result with metadata */
    54-63: interface ListQuirksResult [exported]
      /** Result from listQuirks query */
    66-76: interface ModelQuirkStats [exported]
      /** Stats for a single model */
  type:
    16-16: QuirkFrequency = "once" | "sometimes" | "often" | "always" [exported]
      /** Frequency values for model quirks */
    19-19: QuirkSeverity = "low" | "medium" | "high" [exported]
      /** Severity values for model quirks (matches spec) */
    79-79: QuirksByModelResult = Record<string, ModelQuirkStats> [exported]
      /** Result from getQuirksByModel */
  function:
    107-167: listQuirks(db: Database.Database, filters: ListQuirksFilters = {}, options: ListQuirksOptions = {}): ListQuirksResult [exported]
      /** List model quirks with filters and pagination. Supports filtering by: - model (exact match) - frequency (minimum frequency ranking) - project (partial match via nodes table) Per specs/api.md GET /api/v1/quirks endpoint. */
    175-213: getQuirksByModel(db: Database.Database, recentLimit = 5): Record<string, ModelQuirkStats> [exported]
      /** Get aggregated quirk stats by model. Returns counts and most recent quirks for each model that has quirks. Per specs/api.md GET /api/v1/stats/models endpoint (quirkCount field). */
    218-224: countQuirks(db: Database.Database, filters: ListQuirksFilters = {}): number [exported]
      /** Count quirks matching filters (without fetching data) */
    229-236: getAllQuirkModels(db: Database.Database): {} [exported]
      /** Get all unique models that have quirks recorded */
    244-286: getAggregatedQuirks(db: Database.Database, options: { minOccurrences?: number; limit?: number } = {}): {} [exported]
      /** Get aggregated quirks - similar observations grouped together. Useful for the dashboard "Model Quirks" panel. Per specs/storage.md "Find model quirks by frequency" query. */
    291-314: getNodeQuirks(db: Database.Database, nodeId: string): {} [exported]
      /** Get model quirks for a node */
  imports:
    - better-sqlite3

src/storage/relationship-edges.ts [1-290]
  interface:
    28-37: interface StoreRelationshipsResult [exported]
      /** Result of storing relationships for a node */
    49-56: interface UnresolvedRelationship [exported]
      /** Result type for unresolved relationships */
  function:
    65-67: isAutoMemEdgeType(type: string): boolean [exported]
      /** Check if a type is a valid AutoMem edge type */
    72-105: validateRelationship(relationship: RelationshipOutput): { valid: true; } | { valid: false; error: string; } [exported]
      /** Validate a relationship output from the analyzer */
    118-185: storeRelationshipEdges(db: Database.Database, sourceNodeId: string, relationships: RelationshipOutput[]): StoreRelationshipsResult [exported]
      /** Store relationships extracted by the analyzer as edges For resolved relationships (with targetNodeId), creates an edge directly. For unresolved relationships (targetNodeId is null), stores the description in metadata for potential future resolution via semantic search. */
    194-234: findUnresolvedRelationships(db: Database.Database, nodeId?: string): {} [exported]
      /** Find unresolved relationships (edges with unresolvedTarget in metadata) These are relationships where the analyzer identified a connection but couldn't determine the target node ID. They can be resolved later via semantic search. */
    242-289: resolveRelationship(db: Database.Database, edgeId: string, resolvedTargetNodeId: string): boolean [exported]
      /** Resolve an unresolved relationship by updating its target node Call this after semantic search finds a matching node for an unresolved relationship. */
  imports:
    - ../daemon/processor.js
    - ../types/index.js
    - ./edge-repository.js
    - better-sqlite3

src/storage/search-repository.ts [1-549]
  interface:
    36-41: interface SearchHighlight [exported]
      /** Highlight match for search results */
    44-51: interface SearchResult [exported]
      /** Enhanced search result with score and highlights */
    54-75: interface SearchFilters [exported]
      /** Filters for search queries (subset of node filters relevant to search) */
    78-87: interface SearchOptions [exported]
      /** Options for enhanced search */
    90-99: interface SearchNodesResult [exported]
      /** Result from enhanced search with pagination metadata */
  type:
    19-24: SearchField = | "summary"
  | "decisions"
  | "lessons"
  | "tags"
  | "topics" [exported]
      /** Fields that can be searched in the FTS index */
  function:
    108-136: indexNodeForSearch(db: Database.Database, node: Node): void [exported]
      /** Index a node for full-text search */
    146-172: searchNodes(db: Database.Database, query: string, limit = 20): {} [exported]
      /** Search nodes using full-text search Quotes the query to handle special characters like hyphens */
    226-293: extractSnippet(text: string, query: string, maxLength = 100): string [exported]
      /** Extract a highlight snippet from text containing a match */
    361-432: buildFilterClause(filters: SearchFilters | undefined): { clause: string; params: {}; } [exported]
      /** Build WHERE clause conditions and params from search filters */
    458-518: searchNodesAdvanced(db: Database.Database, query: string, options: SearchOptions = {}): SearchNodesResult [exported]
      /** Enhanced search with scores, highlights, and filter support */
    523-548: countSearchResults(db: Database.Database, query: string, options: Pick<SearchOptions, "fields" | "filters"> = {}): number [exported]
      /** Count total search results (without fetching data) */
  imports:
    - ./node-crud.js
    - ./node-types.js
    - better-sqlite3

src/storage/semantic-search.ts [1-212]
  interface:
    25-28: interface SemanticSearchResult extends SearchResult [exported]
    30-39: interface SemanticSearchOptions [exported]
  function:
    55-154: semanticSearch(db: Database.Database, queryEmbedding: number[], options: SemanticSearchOptions = {}): {} [exported]
      /** Perform semantic search using vector similarity. Finds nodes with embeddings close to the query embedding. */
    164-177: getNodeEmbeddingVector(db: Database.Database, nodeId: string): {} [exported]
      /** Get the embedding vector for a node from the database. Useful for finding "related nodes" (node-to-node similarity). */
    187-211: findSimilarNodes(db: Database.Database, nodeId: string, options: SemanticSearchOptions = {}): {} [exported]
      /** Find nodes similar to a given node. Wraps semanticSearch using the node's own embedding. */
  imports:
    - ./database.js
    - ./embedding-utils.js
    - ./node-crud.js
    - ./search-repository.js
    - better-sqlite3

src/storage/tool-error-repository.ts [1-352]
  interface:
    16-25: interface ListToolErrorsFilters [exported]
      /** Filters for querying tool errors */
    28-33: interface ListToolErrorsOptions [exported]
      /** Pagination options for tool errors */
    36-45: interface ToolErrorResult [exported]
      /** A tool error result with metadata */
    48-57: interface ListToolErrorsResult [exported]
      /** Result from listToolErrors query */
    60-64: interface ToolStats [exported]
      /** Stats by tool from getToolErrorStats */
    67-70: interface ModelErrorStats [exported]
      /** Stats by model from getToolErrorStats */
    73-77: interface ToolErrorTrends [exported]
      /** Trend data from getToolErrorStats */
    80-84: interface ToolErrorStatsResult [exported]
      /** Result from getToolErrorStats */
    87-94: interface AggregatedToolError [exported]
      /** Aggregated tool error result */
    97-103: interface NodeToolError [exported]
      /** A single tool error for a node */
  function:
    112-170: listToolErrors(db: Database.Database, filters: ListToolErrorsFilters = {}, options: ListToolErrorsOptions = {}): ListToolErrorsResult [exported]
      /** List individual tool errors with filters and pagination. */
    176-252: getAggregatedToolErrors(db: Database.Database, filters: ListToolErrorsFilters = {}, options: { limit?: number; offset?: number; groupByModel?: boolean } = {}): {} [exported]
      /** Get aggregated tool errors - grouped by tool and error type (and optionally model). Per specs/api.md GET /api/v1/tool-errors. */
    258-312: getToolErrorStats(db: Database.Database): ToolErrorStatsResult [exported]
      /** Get tool error statistics for the dashboard. Per specs/api.md GET /api/v1/stats/tool-errors. */
    317-323: countToolErrors(db: Database.Database, filters: ListToolErrorsFilters = {}): number [exported]
      /** Count tool errors matching filters. */
    328-335: getAllToolsWithErrors(db: Database.Database): {} [exported]
      /** Get all unique tools that have errors recorded */
    340-351: getNodeToolErrors(db: Database.Database, nodeId: string): {} [exported]
      /** Get tool errors for a node */
  imports:
    - better-sqlite3

---
Files: 20
Estimated tokens: 9,947 (codebase: ~1,157,134)
