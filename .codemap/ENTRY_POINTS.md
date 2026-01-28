# Project Overview

## Languages
- typescript: 27 files

## Statistics
- Total files: 27
- Total symbols: 97
  - function: 52
  - interface: 14
  - method: 12
  - variable: 11
  - type: 4
  - property: 2
  - class: 1
  - constructor: 1

---

src/api/index.ts [1-22]
  imports:
    - ./server.js
    - ./websocket.js

src/api/responses.ts [1-52]
  type:
    24-30: ApiErrorCode = | "BAD_REQUEST"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR"
  | "SERVICE_UNAVAILABLE" [exported]
      /** API error codes */
  function:
    10-19: successResponse<T>(data: T, durationMs?: number): { status: "success"; data: T; meta: { timestamp: any; duration_ms: number; }; } [exported]
      /** API response helpers Shared response formatting utilities used by all route handlers. API response wrapper for success */
      refs out: 4 [call: 1, instantiate: 1, type: 2]
        - src/api/responses.ts:10: type T -> src/api/responses.ts
        - src/api/responses.ts:12: type const -> external
        - src/api/responses.ts:15: call toISOString -> external
        - src/api/responses.ts:15: instantiate Date -> external
    35-51: errorResponse(code: ApiErrorCode, message: string, details?: Record<string, unknown>): { status: "error"; error: { code: ApiErrorCode; message: string; details: Record<string, unknown>; }; meta: { timestamp: any; }; } [exported]
      /** API response wrapper for errors */
      refs out: 5 [call: 1, instantiate: 1, type: 3]
        - src/api/responses.ts:36: type ApiErrorCode -> src/api/responses.ts
        - src/api/responses.ts:38: type Record -> external
        - src/api/responses.ts:41: type const -> external
        - src/api/responses.ts:48: call toISOString -> external
        - src/api/responses.ts:48: instantiate Date -> external

src/api/routes/agents.ts [1-207]
  function:
    22-206: async agentsRoutes(app: FastifyInstance): Promise<void> [exported]
      /** Register AGENTS.md routes */
      refs out: 11 [call: 9, type: 2]
        - src/api/routes/agents.ts:22: type FastifyInstance -> external
        - src/api/routes/agents.ts:22: type Promise -> external
        - src/api/routes/agents.ts:30: call get -> external
        - src/api/routes/agents.ts:42: call get -> external
        - src/api/routes/agents.ts:83: call get -> external
  imports:
    - ../../prompt/agents-generator.js
    - ../server.js
    - fastify

src/api/routes/clusters.test.ts [1-268]
  imports:
    - ../../storage/database.js
    - ../server.js
    - better-sqlite3
    - fastify
    - vitest

src/api/routes/clusters.ts [1-375]
  interface:
    16-21: interface ClusterNodeWithDetails extends ClusterNode
    23-25: interface ClusterWithNodes extends Cluster
      refs out: 1 [type: 1]
        - src/api/routes/clusters.ts:24: type ClusterNodeWithDetails -> src/api/routes/clusters.ts
    28-40: interface ClusterRow
      /** Database row shape for cluster queries */
    43-52: interface ClusterNodeRow
      /** Database row shape for cluster node queries */
  function:
    59-73: mapClusterRow(row: ClusterRow): ClusterWithNodes
      /** Map a database row to a ClusterWithNodes object */
      refs out: 2 [type: 2]
        - src/api/routes/clusters.ts:59: type ClusterRow -> src/api/routes/clusters.ts
        - src/api/routes/clusters.ts:59: type ClusterWithNodes -> src/api/routes/clusters.ts
    76-87: mapNodeRow(nr: ClusterNodeRow): ClusterNodeWithDetails
      /** Map a node row to ClusterNodeWithDetails */
      refs out: 2 [type: 2]
        - src/api/routes/clusters.ts:76: type ClusterNodeRow -> src/api/routes/clusters.ts
        - src/api/routes/clusters.ts:76: type ClusterNodeWithDetails -> src/api/routes/clusters.ts
    93-136: fetchRepresentativeNodes(db: Database, clusterIds: string[], limitPerCluster: number): Map<string, {}>
      /** Batch fetch representative nodes for multiple clusters. Returns a map of clusterId -> nodes array. */
      refs out: 8 [call: 4, instantiate: 1, type: 3]
        - src/api/routes/clusters.ts:94: type Database -> external
        - src/api/routes/clusters.ts:97: type Map -> external
        - src/api/routes/clusters.ts:97: type ClusterNodeWithDetails -> src/api/routes/clusters.ts
        - src/api/routes/clusters.ts:99: instantiate Map -> external
        - src/api/routes/clusters.ts:129: call set -> external
    142-374: async clustersRoutes(app: FastifyInstance): Promise<void> [exported]
      refs out: 28 [call: 19, type: 9]
        - src/api/routes/clusters.ts:142: type FastifyInstance -> external
        - src/api/routes/clusters.ts:142: type Promise -> external
        - src/api/routes/clusters.ts:148: call get -> external
        - src/api/routes/clusters.ts:171: call push -> external
        - src/api/routes/clusters.ts:179: call push -> external
  imports:
    - ../../types/index.js
    - better-sqlite3
    - fastify

src/api/routes/config.ts [1-218]
  function:
    19-217: async configRoutes(app: FastifyInstance): Promise<void> [exported]
      refs out: 32 [call: 24, type: 8]
        - src/api/routes/config.ts:19: type FastifyInstance -> external
        - src/api/routes/config.ts:19: type Promise -> external
        - src/api/routes/config.ts:23: call get -> external
        - src/api/routes/config.ts:23: type FastifyRequest -> external
        - src/api/routes/config.ts:23: type FastifyReply -> external
  imports:
    - ../../config/config.js
    - ../../config/types.js
    - ../responses.js
    - fastify
    - node:fs
    - yaml

src/api/routes/daemon.ts [1-157]
  function:
    22-156: async daemonRoutes(app: FastifyInstance): Promise<void> [exported]
      refs out: 32 [call: 24, type: 8]
        - src/api/routes/daemon.ts:22: type FastifyInstance -> external
        - src/api/routes/daemon.ts:22: type Promise -> external
        - src/api/routes/daemon.ts:26: call get -> external
        - src/api/routes/daemon.ts:26: type FastifyRequest -> external
        - src/api/routes/daemon.ts:26: type FastifyReply -> external
  imports:
    - ../../daemon/cli.js
    - ../../daemon/queue.js
    - ../responses.js
    - fastify
    - node:fs
    - node:path

src/api/routes/decisions.ts [1-94]
  function:
    18-24: parseIntParam(value: string | undefined): number
      /** Parse integer query param */
      refs out: 1 [call: 1]
        - src/api/routes/decisions.ts:23: call isNaN -> external
    26-93: async decisionsRoutes(app: FastifyInstance): Promise<void> [exported]
      refs out: 15 [call: 9, type: 6]
        - src/api/routes/decisions.ts:26: type FastifyInstance -> external
        - src/api/routes/decisions.ts:26: type Promise -> external
        - src/api/routes/decisions.ts:30: call get -> external
        - src/api/routes/decisions.ts:33: type FastifyRequest -> external
        - src/api/routes/decisions.ts:43: type FastifyReply -> external
  imports:
    - ../../storage/decision-repository.js
    - ../responses.js
    - fastify

src/api/routes/edges.ts [1-221]
  function:
    21-27: parseIntParam(value: string | undefined): number
      /** Parse integer query param */
      refs out: 1 [call: 1]
        - src/api/routes/edges.ts:26: call isNaN -> external
    29-220: async edgesRoutes(app: FastifyInstance): Promise<void> [exported]
      refs out: 40 [call: 29, type: 11]
        - src/api/routes/edges.ts:29: type FastifyInstance -> external
        - src/api/routes/edges.ts:29: type Promise -> external
        - src/api/routes/edges.ts:33: call get -> external
        - src/api/routes/edges.ts:36: type FastifyRequest -> external
        - src/api/routes/edges.ts:45: type FastifyReply -> external
  imports:
    - ../../storage/edge-repository.js
    - ../../storage/node-types.js
    - ../responses.js
    - fastify

src/api/routes/lessons.ts [1-94]
  function:
    18-26: parseArrayParam(value: string | undefined): {}
      /** Parse comma-separated string to array */
      refs out: 4 [call: 4]
        - src/api/routes/lessons.ts:22: call filter -> external
        - src/api/routes/lessons.ts:22: call map -> external
        - src/api/routes/lessons.ts:22: call split -> external
        - src/api/routes/lessons.ts:24: call trim -> external
    31-37: parseIntParam(value: string | undefined): number
      /** Parse integer query param */
      refs out: 1 [call: 1]
        - src/api/routes/lessons.ts:36: call isNaN -> external
    39-93: async lessonsRoutes(app: FastifyInstance): Promise<void> [exported]
      refs out: 12 [call: 6, type: 6]
        - src/api/routes/lessons.ts:39: type FastifyInstance -> external
        - src/api/routes/lessons.ts:39: type Promise -> external
        - src/api/routes/lessons.ts:43: call get -> external
        - src/api/routes/lessons.ts:46: type FastifyRequest -> external
        - src/api/routes/lessons.ts:56: type FastifyReply -> external
  imports:
    - ../../storage/lesson-repository.js
    - ../responses.js
    - fastify

src/api/routes/nodes.ts [1-243]
  function:
    28-36: parseArrayParam(value: string | undefined): {}
      /** Parse comma-separated string to array */
      refs out: 4 [call: 4]
        - src/api/routes/nodes.ts:32: call filter -> external
        - src/api/routes/nodes.ts:32: call map -> external
        - src/api/routes/nodes.ts:32: call split -> external
        - src/api/routes/nodes.ts:34: call trim -> external
    41-46: parseBooleanParam(value: string | undefined): boolean
      /** Parse boolean query param */
    51-57: parseIntParam(value: string | undefined): number
      /** Parse integer query param */
      refs out: 1 [call: 1]
        - src/api/routes/nodes.ts:56: call isNaN -> external
    59-242: async nodesRoutes(app: FastifyInstance): Promise<void> [exported]
      refs out: 43 [call: 35, type: 8]
        - src/api/routes/nodes.ts:59: type FastifyInstance -> external
        - src/api/routes/nodes.ts:59: type Promise -> external
        - src/api/routes/nodes.ts:63: call get -> external
        - src/api/routes/nodes.ts:66: type FastifyRequest -> external
        - src/api/routes/nodes.ts:84: type FastifyReply -> external
  imports:
    - ../../storage/graph-repository.js
    - ../../storage/index.js
    - ../../storage/lesson-repository.js
    - ../../storage/node-conversion.js
    - ../../storage/node-queries.js
    - ../../storage/node-storage.js
    - ../../storage/node-types.js
    - ../../storage/quirk-repository.js
    - ../../storage/tool-error-repository.js
    - ../responses.js
    - fastify

src/api/routes/patterns.ts [1-119]
  function:
    22-39: parseIntParam(value: string | undefined, paramName?: string, logger?: FastifyBaseLogger): number
      /** Parse integer query param with optional debug logging for invalid values */
      refs out: 3 [call: 2, type: 1]
        - src/api/routes/patterns.ts:25: type FastifyBaseLogger -> external
        - src/api/routes/patterns.ts:31: call isNaN -> external
        - src/api/routes/patterns.ts:32: call debug -> external
    41-118: async patternsRoutes(app: FastifyInstance): Promise<void> [exported]
      refs out: 17 [call: 9, type: 8]
        - src/api/routes/patterns.ts:41: type FastifyInstance -> external
        - src/api/routes/patterns.ts:41: type Promise -> external
        - src/api/routes/patterns.ts:45: call get -> external
        - src/api/routes/patterns.ts:48: type FastifyRequest -> external
        - src/api/routes/patterns.ts:55: type FastifyReply -> external
  imports:
    - ../../storage/pattern-repository.js
    - ../responses.js
    - fastify

src/api/routes/prompt-learning.ts [1-166]
  function:
    18-165: async promptLearningRoutes(app: FastifyInstance): Promise<void> [exported]
      refs out: 35 [call: 27, type: 8]
        - src/api/routes/prompt-learning.ts:19: type FastifyInstance -> external
        - src/api/routes/prompt-learning.ts:20: type Promise -> external
        - src/api/routes/prompt-learning.ts:24: call get -> external
        - src/api/routes/prompt-learning.ts:27: type FastifyRequest -> external
        - src/api/routes/prompt-learning.ts:35: type FastifyReply -> external
  imports:
    - ../../prompt/effectiveness.js
    - ../../storage/pattern-repository.js
    - ../responses.js
    - fastify

src/api/routes/query.test.ts [1-78]
  imports:
    - ../../storage/database.js
    - ../server.js
    - better-sqlite3
    - fastify
    - vitest

src/api/routes/query.ts [1-281]
  function:
    60-104: getEmbeddingProvider(config: {
  embeddingProvider?: "openrouter" | "ollama" | "openai";
  embeddingModel?: string;
  embeddingApiKey?: string;
  embeddingBaseUrl?: string;
  embeddingDimensions?: number;
}): any
      /** Get or create the embedding provider with caching. Cache is invalidated if the configuration changes. */
    106-280: async queryRoutes(app: FastifyInstance): Promise<void> [exported]
      refs out: 37 [call: 30, instantiate: 1, type: 6]
        - src/api/routes/query.ts:106: type FastifyInstance -> external
        - src/api/routes/query.ts:106: type Promise -> external
        - src/api/routes/query.ts:117: call post -> external
        - src/api/routes/query.ts:120: type FastifyRequest -> external
        - src/api/routes/query.ts:133: type FastifyReply -> external
  variable:
    24-47: DEFAULT_QUERY_CONFIG
      /** Default daemon config for query processing */
      refs out: 3 [call: 2, type: 1]
        - src/api/routes/query.ts:27: call join -> external
        - src/api/routes/query.ts:28: call homedir -> external
        - src/api/routes/query.ts:42: type const -> external
    53-53: EmbeddingProvider | undefined
      /** Cached embedding provider instance. Created once on first use to avoid HTTP client setup overhead per request. */
    54-54: string | undefined
  imports:
    - ../../daemon/facet-discovery.js
    - ../../daemon/query-processor.js
    - ../responses.js
    - fastify
    - node:child_process
    - node:os
    - node:path

src/api/routes/quirks.ts [1-110]
  function:
    19-25: parseIntParam(value: string | undefined): number
      /** Parse integer query param */
      refs out: 1 [call: 1]
        - src/api/routes/quirks.ts:24: call isNaN -> external
    27-109: async quirksRoutes(app: FastifyInstance): Promise<void> [exported]
      refs out: 17 [call: 9, type: 8]
        - src/api/routes/quirks.ts:27: type FastifyInstance -> external
        - src/api/routes/quirks.ts:27: type Promise -> external
        - src/api/routes/quirks.ts:31: call get -> external
        - src/api/routes/quirks.ts:34: type FastifyRequest -> external
        - src/api/routes/quirks.ts:44: type FastifyReply -> external
  imports:
    - ../../storage/quirk-repository.js
    - ../responses.js
    - fastify

src/api/routes/search.ts [1-105]
  function:
    19-27: parseArrayParam(value: string | undefined): {}
      /** Parse comma-separated string to array */
      refs out: 4 [call: 4]
        - src/api/routes/search.ts:23: call filter -> external
        - src/api/routes/search.ts:23: call map -> external
        - src/api/routes/search.ts:23: call split -> external
        - src/api/routes/search.ts:25: call trim -> external
    32-38: parseIntParam(value: string | undefined): number
      /** Parse integer query param */
      refs out: 1 [call: 1]
        - src/api/routes/search.ts:37: call isNaN -> external
    40-104: async searchRoutes(app: FastifyInstance): Promise<void> [exported]
      refs out: 7 [call: 3, type: 4]
        - src/api/routes/search.ts:40: type FastifyInstance -> external
        - src/api/routes/search.ts:40: type Promise -> external
        - src/api/routes/search.ts:44: call get -> external
        - src/api/routes/search.ts:47: type FastifyRequest -> external
        - src/api/routes/search.ts:62: type FastifyReply -> external
  imports:
    - ../../storage/node-queries.js
    - ../../storage/search-repository.js
    - ../responses.js
    - fastify

src/api/routes/sessions.ts [1-273]
  interface:
    31-45: interface SessionSummary
      /** Session summary for the file browser */
    50-55: interface ProjectSummary
      /** Project summary for the file browser */
  function:
    20-26: parseIntParam(value: string | undefined): number
      /** Parse integer query param */
      refs out: 1 [call: 1]
        - src/api/routes/sessions.ts:25: call isNaN -> external
    57-272: async sessionsRoutes(app: FastifyInstance): Promise<void> [exported]
      refs out: 34 [call: 24, instantiate: 2, type: 8]
        - src/api/routes/sessions.ts:57: type FastifyInstance -> external
        - src/api/routes/sessions.ts:57: type Promise -> external
        - src/api/routes/sessions.ts:61: call get -> external
        - src/api/routes/sessions.ts:61: type FastifyRequest -> external
        - src/api/routes/sessions.ts:61: type FastifyReply -> external
  imports:
    - ../../storage/node-conversion.js
    - ../../storage/node-queries.js
    - ../responses.js
    - fastify

src/api/routes/signals.test.ts [1-306]
  function:
    14-20: createTestApiConfig(): ApiConfig
      /** Create a minimal valid API config for tests */
  imports:
    - ../../config/types.js
    - ./signals.js
    - better-sqlite3
    - fastify
    - vitest

src/api/routes/signals.ts [1-260]
  interface:
    19-33: interface AbandonedRestartPattern
    35-48: interface FrictionSummary
  function:
    54-111: async signalsRoutes(app: FastifyInstance): Promise<void> [exported]
      refs out: 12 [call: 6, type: 6]
        - src/api/routes/signals.ts:54: type FastifyInstance -> external
        - src/api/routes/signals.ts:54: type Promise -> external
        - src/api/routes/signals.ts:60: call get -> external
        - src/api/routes/signals.ts:63: type FastifyRequest -> external
        - src/api/routes/signals.ts:66: type FastifyReply -> external
    122-166: getAbandonedRestartPatterns(db: Database.Database, limit: number, offset: number): {}
      /** Get abandoned restart patterns by querying the signals column. Uses SQLite's json_extract to query the stored signals JSON. */
      refs out: 3 [call: 1, type: 2]
        - src/api/routes/signals.ts:123: type Database -> external
        - src/api/routes/signals.ts:126: type AbandonedRestartPattern -> src/api/routes/signals.ts
        - src/api/routes/signals.ts:153: call push -> external
    173-181: countAbandonedRestartPatterns(db: Database.Database): number
      /** Count total abandoned restart patterns using the signals column. This is now accurate instead of an approximation. */
      refs out: 1 [type: 1]
        - src/api/routes/signals.ts:173: type Database -> external
    188-259: getFrictionSummary(db: Database.Database): FrictionSummary
      /** Get friction summary statistics using the signals column. Queries are now efficient using SQLite's json_extract. */
      refs out: 4 [call: 2, type: 2]
        - src/api/routes/signals.ts:188: type Database -> external
        - src/api/routes/signals.ts:188: type FrictionSummary -> src/api/routes/signals.ts
        - src/api/routes/signals.ts:190: call setDate -> external
        - src/api/routes/signals.ts:190: call getDate -> external
  imports:
    - ../../types/index.js
    - ../responses.js
    - better-sqlite3
    - fastify

src/api/routes/stats.ts [1-165]
  function:
    16-155: async statsRoutes(app: FastifyInstance): Promise<void> [exported]
      refs out: 17 [call: 11, type: 6]
        - src/api/routes/stats.ts:16: type FastifyInstance -> external
        - src/api/routes/stats.ts:16: type Promise -> external
        - src/api/routes/stats.ts:20: call get -> external
        - src/api/routes/stats.ts:20: type FastifyRequest -> external
        - src/api/routes/stats.ts:20: type FastifyReply -> external
    160-164: countEdges(db: Database.Database): number
      /** Count edges in the database */
      refs out: 1 [type: 1]
        - src/api/routes/stats.ts:160: type Database -> external
  imports:
    - ../../storage/node-queries.js
    - ../../storage/tool-error-repository.js
    - ../responses.js
    - better-sqlite3
    - fastify

src/api/routes/tool-errors.ts [1-121]
  function:
    19-25: parseIntParam(value: string | undefined): number
      /** Parse integer query param */
      refs out: 1 [call: 1]
        - src/api/routes/tool-errors.ts:24: call isNaN -> external
    27-120: async toolErrorsRoutes(app: FastifyInstance): Promise<void> [exported]
      refs out: 17 [call: 9, type: 8]
        - src/api/routes/tool-errors.ts:27: type FastifyInstance -> external
        - src/api/routes/tool-errors.ts:27: type Promise -> external
        - src/api/routes/tool-errors.ts:31: call get -> external
        - src/api/routes/tool-errors.ts:34: type FastifyRequest -> external
        - src/api/routes/tool-errors.ts:44: type FastifyReply -> external
  imports:
    - ../../storage/tool-error-repository.js
    - ../responses.js
    - fastify

src/api/server.test.ts [1-703]
  function:
    21-25: createTempDir(): string
      refs out: 1 [call: 1]
        - src/api/server.test.ts:23: call mkdirSync -> external
    27-31: cleanupTempDir(dir: string): void
      refs out: 2 [call: 2]
        - src/api/server.test.ts:28: call existsSync -> external
        - src/api/server.test.ts:29: call rmSync -> external
    33-39: createTestApiConfig(): ApiConfig
    41-111: createTestNode(overrides: Partial<Node> = {}): Node
      refs out: 6 [call: 3, instantiate: 2, type: 1]
        - src/api/server.test.ts:41: type Partial -> external
        - src/api/server.test.ts:43: call now -> external
        - src/api/server.test.ts:92: call toISOString -> external
        - src/api/server.test.ts:92: instantiate Date -> external
        - src/api/server.test.ts:93: call toISOString -> external
  imports:
    - ../config/types.js
    - ../storage/database.js
    - ../storage/index.js
    - ../storage/node-types.js
    - ./server.js
    - ./websocket.js
    - node:fs
    - node:os
    - node:path
    - vitest

src/api/server.ts [1-205]
  interface:
    49-54: interface ServerContext [exported]
      /** Server context passed to route handlers */
      refs out: 1 [type: 1]
        - src/api/server.ts:50: type Database -> external
    171-174: interface ServerResult [exported]
      /** Server result including the Fastify instance and WebSocket manager */
      refs out: 2 [type: 2]
        - src/api/server.ts:172: type FastifyInstance -> external
        - src/api/server.ts:173: type WebSocketManager -> src/api/websocket.ts
  function:
    68-166: async createServer(db: Database, config: ApiConfig, daemonConfig?: DaemonConfig, wsManager?: WebSocketManager): Promise<FastifyInstance> [exported]
      /** Create and configure the Fastify server */
      refs out: 32 [call: 27, instantiate: 1, type: 4]
        - src/api/server.ts:69: type Database -> external
        - src/api/server.ts:72: type WebSocketManager -> src/api/websocket.ts
        - src/api/server.ts:73: type Promise -> external
        - src/api/server.ts:73: type FastifyInstance -> external
        - src/api/server.ts:81: call register -> external
    179-197: async startServer(db: Database, config: ApiConfig, daemonConfig?: DaemonConfig, wsManager?: WebSocketManager): Promise<ServerResult> [exported]
      /** Start the API server */
      refs out: 6 [call: 2, type: 4]
        - src/api/server.ts:180: type Database -> external
        - src/api/server.ts:183: type WebSocketManager -> src/api/websocket.ts
        - src/api/server.ts:184: type Promise -> external
        - src/api/server.ts:184: type ServerResult -> src/api/server.ts
        - src/api/server.ts:189: call listen -> external
  imports:
    - ../config/types.js
    - ./responses.js
    - ./routes/agents.js
    - ./routes/clusters.js
    - ./routes/config.js
    - ./routes/daemon.js
    - ./routes/decisions.js
    - ./routes/edges.js
    - ./routes/lessons.js
    - ./routes/nodes.js
    - ./routes/patterns.js
    - ./routes/prompt-learning.js
    - ./routes/query.js
    - ./routes/quirks.js
    - ./routes/search.js
    - ./routes/sessions.js
    - ./routes/signals.js
    - ./routes/stats.js
    - ./routes/tool-errors.js
    - ./websocket.js
    - @fastify/cors
    - @fastify/websocket
    - better-sqlite3
    - fastify

src/api/websocket.test.ts [1-463]
  interface:
    18-24: interface MockSocket
      refs out: 4 [type: 4]
        - src/api/websocket.test.ts:20: type ReturnType -> external
        - src/api/websocket.test.ts:21: type ReturnType -> external
        - src/api/websocket.test.ts:22: type ReturnType -> external
        - src/api/websocket.test.ts:23: type Map -> external
  function:
    26-41: createMockSocket(): MockSocket
      refs out: 8 [call: 7, type: 1]
        - src/api/websocket.test.ts:26: type MockSocket -> src/api/websocket.test.ts
        - src/api/websocket.test.ts:31: call fn -> external
        - src/api/websocket.test.ts:32: call fn -> external
        - src/api/websocket.test.ts:33: call fn -> external
        - src/api/websocket.test.ts:34: call has -> external
    43-48: emitEvent(socket: MockSocket, event: string, ...args: unknown[]): void
      refs out: 2 [call: 1, type: 1]
        - src/api/websocket.test.ts:43: type MockSocket -> src/api/websocket.test.ts
        - src/api/websocket.test.ts:46: call handler -> src/api/websocket.test.ts
  imports:
    - ../daemon/queue.js
    - ../storage/node-types.js
    - ./websocket.js
    - vitest
    - ws

src/api/websocket.ts [1-404]
  class:
    74-359: class WebSocketManager [exported]
      /** Manages WebSocket connections and broadcasts events */
      75-75: clients
        refs out: 2 [instantiate: 1, type: 1]
          - src/api/websocket.ts:75: instantiate Set -> external
          - src/api/websocket.ts:75: type WSClient -> src/api/websocket.ts
      76-80: logger: {
    info: (msg: string) => void;
    error: (msg: string) => void;
    debug: (msg: string) => void;
  }
      82-92: constructor(logger?: {
    info: (msg: string) => void;
    error: (msg: string) => void;
    debug: (msg: string) => void;
  })
        refs out: 3 [call: 3]
          - src/api/websocket.ts:88: call log -> external
          - src/api/websocket.ts:89: call error -> external
          - src/api/websocket.ts:90: call debug -> external
      97-124: handleConnection(socket: WebSocket): void
        /** Handle a new WebSocket connection */
        refs out: 12 [call: 10, type: 2]
          - src/api/websocket.ts:97: type WebSocket -> external
          - src/api/websocket.ts:104: call add -> external
          - src/api/websocket.ts:105: call WebSocketManager.info -> src/api/websocket.ts
          - src/api/websocket.ts:109: call WebSocket.on -> external
          - src/api/websocket.ts:109: type Buffer -> external
      129-158: handleMessage(client: WSClient, data: Buffer | string): void
        /** Handle incoming message from client */
        refs out: 11 [call: 7, instantiate: 2, type: 2]
          - src/api/websocket.ts:129: type WSClient -> src/api/websocket.ts
          - src/api/websocket.ts:129: type Buffer -> external
          - src/api/websocket.ts:135: call WebSocketManager.handleSubscribe -> src/api/websocket.ts
          - src/api/websocket.ts:139: call WebSocketManager.sendToClient -> src/api/websocket.ts
          - src/api/websocket.ts:144: call toISOString -> external
      163-196: handleSubscribe(client: WSClient, message: SubscribeMessage): void
        /** Handle subscription request */
        refs out: 13 [call: 9, instantiate: 2, type: 2]
          - src/api/websocket.ts:163: type WSClient -> src/api/websocket.ts
          - src/api/websocket.ts:163: type SubscribeMessage -> src/api/websocket.ts
          - src/api/websocket.ts:172: call isArray -> external
          - src/api/websocket.ts:173: call WebSocketManager.sendToClient -> src/api/websocket.ts
          - src/api/websocket.ts:176: call toISOString -> external
      201-211: sendToClient(client: WSClient, message: WSMessage): void
        /** Send message to a specific client */
        refs out: 6 [call: 4, type: 2]
          - src/api/websocket.ts:201: type WSClient -> src/api/websocket.ts
          - src/api/websocket.ts:201: type WSMessage -> src/api/websocket.ts
          - src/api/websocket.ts:204: call WebSocket.send -> external
          - src/api/websocket.ts:204: call stringify -> external
          - src/api/websocket.ts:206: call WebSocketManager.error -> src/api/websocket.ts
      216-229: broadcast(channel: WSChannel, message: WSMessage): void
        /** Broadcast message to all subscribed clients */
        refs out: 5 [call: 3, type: 2]
          - src/api/websocket.ts:216: type WSChannel -> src/api/websocket.ts
          - src/api/websocket.ts:216: type WSMessage -> src/api/websocket.ts
          - src/api/websocket.ts:220: call has -> external
          - src/api/websocket.ts:221: call WebSocketManager.sendToClient -> src/api/websocket.ts
          - src/api/websocket.ts:226: call WebSocketManager.debug -> src/api/websocket.ts
      234-236: getClientCount(): number
        /** Get connected client count */
      241-246: closeAll(): void
        /** Close all connections */
        refs out: 2 [call: 2]
          - src/api/websocket.ts:243: call WebSocket.close -> external
          - src/api/websocket.ts:245: call clear -> external
      255-281: broadcastDaemonStatus(status: {
    running: boolean;
    pid?: number;
    uptime?: number;
    workers?: {
      total: number;
      active: number;
      idle: number;
    };
    queue?: {
      pending: number;
      running: number;
      completedToday: number;
      failedToday: number;
    };
    lastAnalysis?: string;
    nextScheduled?: {
      reanalysis?: string;
      connectionDiscovery?: string;
    };
  }): void
        /** Broadcast daemon status update */
        refs out: 3 [call: 2, instantiate: 1]
          - src/api/websocket.ts:276: call WebSocketManager.broadcast -> src/api/websocket.ts
          - src/api/websocket.ts:279: call toISOString -> external
          - src/api/websocket.ts:279: instantiate Date -> external
      286-296: broadcastAnalysisStarted(job: AnalysisJob, workerId: string): void
        /** Broadcast analysis started event */
        refs out: 4 [call: 2, instantiate: 1, type: 1]
          - src/api/websocket.ts:286: type AnalysisJob -> src/daemon/queue.ts
          - src/api/websocket.ts:287: call WebSocketManager.broadcast -> src/api/websocket.ts
          - src/api/websocket.ts:294: call toISOString -> external
          - src/api/websocket.ts:294: instantiate Date -> external
      301-323: broadcastAnalysisCompleted(job: AnalysisJob, node: Node): void
        /** Broadcast analysis completed event */
        refs out: 7 [call: 4, instantiate: 2, type: 1]
          - src/api/websocket.ts:301: type AnalysisJob -> src/daemon/queue.ts
          - src/api/websocket.ts:302: call WebSocketManager.broadcast -> src/api/websocket.ts
          - src/api/websocket.ts:309: call toISOString -> external
          - src/api/websocket.ts:309: instantiate Date -> external
          - src/api/websocket.ts:313: call WebSocketManager.broadcast -> src/api/websocket.ts
      328-342: broadcastAnalysisFailed(job: AnalysisJob, error: Error, willRetry: boolean): void
        /** Broadcast analysis failed event */
        refs out: 5 [call: 2, instantiate: 1, type: 2]
          - src/api/websocket.ts:329: type AnalysisJob -> src/daemon/queue.ts
          - src/api/websocket.ts:330: type Error -> external
          - src/api/websocket.ts:333: call WebSocketManager.broadcast -> src/api/websocket.ts
          - src/api/websocket.ts:340: call toISOString -> external
          - src/api/websocket.ts:340: instantiate Date -> external
      347-358: broadcastQueueUpdate(stats: {
    pending: number;
    running: number;
    completed: number;
    failed: number;
  }): void
        /** Broadcast queue update event */
        refs out: 3 [call: 2, instantiate: 1]
          - src/api/websocket.ts:353: call WebSocketManager.broadcast -> src/api/websocket.ts
          - src/api/websocket.ts:356: call toISOString -> external
          - src/api/websocket.ts:356: instantiate Date -> external
  interface:
    45-49: interface WSMessage [exported]
      /** Message format for WebSocket events */
      refs out: 1 [type: 1]
        - src/api/websocket.ts:46: type WSEventType -> src/api/websocket.ts
    52-55: interface SubscribeMessage
      /** Client subscription request */
      refs out: 1 [type: 1]
        - src/api/websocket.ts:54: type WSChannel -> src/api/websocket.ts
    61-65: interface WSClient
      /** Connected client with subscriptions */
      refs out: 4 [type: 4]
        - src/api/websocket.ts:62: type WebSocket -> external
        - src/api/websocket.ts:63: type Set -> external
        - src/api/websocket.ts:63: type WSChannel -> src/api/websocket.ts
        - src/api/websocket.ts:64: type Date -> external
  type:
    31-31: WSChannel = "daemon" | "analysis" | "node" | "queue" [exported]
      /** Available subscription channels */
    34-42: WSEventType = | "daemon.status"
  | "analysis.started"
  | "analysis.completed"
  | "analysis.failed"
  | "node.created"
  | "queue.updated"
  | "subscribed"
  | "error" [exported]
      /** WebSocket message types from server to client */
    58-58: ClientMessage = SubscribeMessage
      /** Client message union type */
      refs out: 1 [type: 1]
        - src/api/websocket.ts:58: type SubscribeMessage -> src/api/websocket.ts
  function:
    368-380: registerWebSocketRoute(app: FastifyInstance, wsManager: WebSocketManager): void [exported]
      /** Register the WebSocket route on a Fastify instance */
      refs out: 6 [call: 2, type: 4]
        - src/api/websocket.ts:369: type FastifyInstance -> external
        - src/api/websocket.ts:370: type WebSocketManager -> src/api/websocket.ts
        - src/api/websocket.ts:373: call get -> external
        - src/api/websocket.ts:376: type WebSocket -> external
        - src/api/websocket.ts:376: type FastifyRequest -> external
    391-396: getWebSocketManager(): WebSocketManager [exported]
      /** Get or create the global WebSocket manager */
      refs out: 2 [instantiate: 1, type: 1]
        - src/api/websocket.ts:391: type WebSocketManager -> src/api/websocket.ts
        - src/api/websocket.ts:393: instantiate WebSocketManager -> src/api/websocket.ts
    401-403: setWebSocketManager(manager: WebSocketManager): void [exported]
      /** Set the global WebSocket manager (for testing or custom config) */
      refs out: 1 [type: 1]
        - src/api/websocket.ts:401: type WebSocketManager -> src/api/websocket.ts
  variable:
    19-24: { readonly CONNECTING: 0; readonly OPEN: 1; readonly CLOSING: 2; readonly CLOSED: 3; }
      /** WebSocket ready state values (mirrors WebSocket.OPEN, etc.) */
      refs out: 1 [type: 1]
        - src/api/websocket.ts:24: type const -> external
    386-386: WebSocketManager | null
      refs out: 1 [type: 1]
        - src/api/websocket.ts:386: type WebSocketManager -> src/api/websocket.ts
  imports:
    - ../daemon/queue.js
    - ../storage/node-types.js
    - fastify
    - ws

src/cli.ts [1-1148]
  variable:
    73-73: any
      refs out: 1 [instantiate: 1]
        - src/cli.ts:73: instantiate Command -> external
    200-202: any
      refs out: 2 [call: 2]
        - src/cli.ts:200: call Command.description -> external
        - src/cli.ts:200: call Command.command -> external
    389-391: any
      refs out: 2 [call: 2]
        - src/cli.ts:389: call Command.description -> external
        - src/cli.ts:389: call Command.command -> external
    554-556: any
      refs out: 2 [call: 2]
        - src/cli.ts:554: call Command.description -> external
        - src/cli.ts:554: call Command.command -> external
    941-943: any
      refs out: 2 [call: 2]
        - src/cli.ts:941: call Command.description -> external
        - src/cli.ts:941: call Command.command -> external
    1092-1094: any
      refs out: 2 [call: 2]
        - src/cli.ts:1092: call Command.description -> external
        - src/cli.ts:1092: call Command.command -> external
  imports:
    - ./config/index.js
    - ./daemon/export.js
    - ./daemon/graph-export.js
    - ./daemon/index.js
    - ./parser/analyzer.js
    - ./prompt/agents-generator.js
    - ./prompt/effectiveness.js
    - ./prompt/prompt-generator.js
    - ./prompt/prompt-injector.js
    - ./storage/database.js
    - ./storage/pattern-repository.js
    - ./sync/index.js
    - ./types/index.js
    - ./web/generator.js
    - commander
    - node:fs
    - node:fs/promises
    - node:path
    - open

---
Files: 27
Estimated tokens: 9,072 (codebase: ~1,135,760)
