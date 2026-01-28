# Project Overview

## Languages
- typescript: 25 files

## Statistics
- Total files: 25
- Total symbols: 62
  - function: 46
  - interface: 9
  - variable: 6
  - type: 1

---

src/api/index.ts [1-14]
  imports:
    - ./server.js

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
      refs out: 33 [call: 25, type: 8]
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

src/api/routes/nodes.ts [1-233]
  function:
    27-35: parseArrayParam(value: string | undefined): {}
      /** Parse comma-separated string to array */
      refs out: 4 [call: 4]
        - src/api/routes/nodes.ts:31: call filter -> external
        - src/api/routes/nodes.ts:31: call map -> external
        - src/api/routes/nodes.ts:31: call split -> external
        - src/api/routes/nodes.ts:33: call trim -> external
    40-45: parseBooleanParam(value: string | undefined): boolean
      /** Parse boolean query param */
    50-56: parseIntParam(value: string | undefined): number
      /** Parse integer query param */
      refs out: 1 [call: 1]
        - src/api/routes/nodes.ts:55: call isNaN -> external
    58-232: async nodesRoutes(app: FastifyInstance): Promise<void> [exported]
      refs out: 43 [call: 35, type: 8]
        - src/api/routes/nodes.ts:58: type FastifyInstance -> external
        - src/api/routes/nodes.ts:58: type Promise -> external
        - src/api/routes/nodes.ts:62: call get -> external
        - src/api/routes/nodes.ts:65: type FastifyRequest -> external
        - src/api/routes/nodes.ts:83: type FastifyReply -> external
  imports:
    - ../../storage/graph-repository.js
    - ../../storage/index.js
    - ../../storage/lesson-repository.js
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

src/api/routes/query.ts [1-205]
  function:
    44-204: async queryRoutes(app: FastifyInstance): Promise<void> [exported]
      refs out: 35 [call: 28, instantiate: 1, type: 6]
        - src/api/routes/query.ts:44: type FastifyInstance -> external
        - src/api/routes/query.ts:44: type Promise -> external
        - src/api/routes/query.ts:55: call post -> external
        - src/api/routes/query.ts:58: type FastifyRequest -> external
        - src/api/routes/query.ts:71: type FastifyReply -> external
  variable:
    20-42: DEFAULT_QUERY_CONFIG
      /** Default daemon config for query processing */
      refs out: 3 [call: 2, type: 1]
        - src/api/routes/query.ts:23: call join -> external
        - src/api/routes/query.ts:24: call homedir -> external
        - src/api/routes/query.ts:38: type const -> external
  imports:
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

src/api/routes/sessions.ts [1-272]
  interface:
    30-44: interface SessionSummary
      /** Session summary for the file browser */
    49-54: interface ProjectSummary
      /** Project summary for the file browser */
  function:
    19-25: parseIntParam(value: string | undefined): number
      /** Parse integer query param */
      refs out: 1 [call: 1]
        - src/api/routes/sessions.ts:24: call isNaN -> external
    56-271: async sessionsRoutes(app: FastifyInstance): Promise<void> [exported]
      refs out: 34 [call: 24, instantiate: 2, type: 8]
        - src/api/routes/sessions.ts:56: type FastifyInstance -> external
        - src/api/routes/sessions.ts:56: type Promise -> external
        - src/api/routes/sessions.ts:60: call get -> external
        - src/api/routes/sessions.ts:60: type FastifyRequest -> external
        - src/api/routes/sessions.ts:60: type FastifyReply -> external
  imports:
    - ../../storage/node-queries.js
    - ../responses.js
    - fastify

src/api/routes/signals.test.ts [1-306]
  function:
    14-20: createTestApiConfig(): ApiConfig
      /** Create a minimal valid API config for tests */
      refs out: 1 [type: 1]
        - src/api/routes/signals.test.ts:14: type ApiConfig -> src/config/types.ts
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

src/api/server.test.ts [1-683]
  function:
    21-25: createTempDir(): string
      refs out: 1 [call: 1]
        - src/api/server.test.ts:23: call mkdirSync -> external
    27-31: cleanupTempDir(dir: string): void
      refs out: 2 [call: 2]
        - src/api/server.test.ts:28: call existsSync -> external
        - src/api/server.test.ts:29: call rmSync -> external
    33-39: createTestApiConfig(): ApiConfig
      refs out: 1 [type: 1]
        - src/api/server.test.ts:33: type ApiConfig -> src/config/types.ts
    41-111: createTestNode(overrides: Partial<Node> = {}): Node
      refs out: 8 [call: 3, instantiate: 2, type: 3]
        - src/api/server.test.ts:41: type Partial -> external
        - src/api/server.test.ts:41: type Node -> src/types/index.ts
        - src/api/server.test.ts:41: type Node -> src/types/index.ts
        - src/api/server.test.ts:43: call now -> external
        - src/api/server.test.ts:92: call toISOString -> external
  imports:
    - ../config/types.js
    - ../storage/database.js
    - ../storage/index.js
    - ../storage/node-types.js
    - ./server.js
    - node:fs
    - node:os
    - node:path
    - vitest

src/api/server.ts [1-183]
  interface:
    46-51: interface ServerContext [exported]
      /** Server context passed to route handlers */
      refs out: 3 [type: 3]
        - src/api/server.ts:47: type Database -> external
        - src/api/server.ts:48: type ApiConfig -> src/config/types.ts
        - src/api/server.ts:50: type DaemonConfig -> src/config/types.ts
  function:
    65-155: async createServer(db: Database, config: ApiConfig, daemonConfig?: DaemonConfig): Promise<FastifyInstance> [exported]
      /** Create and configure the Fastify server */
      refs out: 32 [call: 26, instantiate: 1, type: 5]
        - src/api/server.ts:66: type Database -> external
        - src/api/server.ts:67: type ApiConfig -> src/config/types.ts
        - src/api/server.ts:68: type DaemonConfig -> src/config/types.ts
        - src/api/server.ts:69: type Promise -> external
        - src/api/server.ts:69: type FastifyInstance -> external
    160-175: async startServer(db: Database, config: ApiConfig, daemonConfig?: DaemonConfig): Promise<FastifyInstance> [exported]
      /** Start the API server */
      refs out: 7 [call: 2, type: 5]
        - src/api/server.ts:161: type Database -> external
        - src/api/server.ts:162: type ApiConfig -> src/config/types.ts
        - src/api/server.ts:163: type DaemonConfig -> src/config/types.ts
        - src/api/server.ts:164: type Promise -> external
        - src/api/server.ts:164: type FastifyInstance -> external
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
    - @fastify/cors
    - @fastify/websocket
    - better-sqlite3
    - fastify

src/cli.ts [1-1047]
  variable:
    72-72: any
      refs out: 1 [instantiate: 1]
        - src/cli.ts:72: instantiate Command -> external
    198-200: any
      refs out: 2 [call: 2]
        - src/cli.ts:198: call Command.description -> external
        - src/cli.ts:198: call Command.command -> external
    343-345: any
      refs out: 2 [call: 2]
        - src/cli.ts:343: call Command.description -> external
        - src/cli.ts:343: call Command.command -> external
    508-510: any
      refs out: 2 [call: 2]
        - src/cli.ts:508: call Command.description -> external
        - src/cli.ts:508: call Command.command -> external
    895-897: any
      refs out: 2 [call: 2]
        - src/cli.ts:895: call Command.description -> external
        - src/cli.ts:895: call Command.command -> external
  imports:
    - ./config/index.js
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
Files: 25
Estimated tokens: 6,107 (codebase: ~971,374)
