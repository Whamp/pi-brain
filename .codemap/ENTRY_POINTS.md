# Project Overview

## Languages
- typescript: 31 files

## Statistics
- Total files: 31
- Total symbols: 161
  - function: 94
  - interface: 30
  - variable: 15
  - method: 12
  - type: 6
  - property: 2
  - class: 1
  - constructor: 1

---

src/api/index.ts [1-22]
  imports:
    - ./server.js
    - ./websocket.js

src/api/query-params.ts [1-65]
  function:
    16-33: parseIntParam(value: string | undefined, paramName?: string, logger?: FastifyBaseLogger): number [exported]
      /** Parse an integer query parameter */
      refs out: 3 [call: 2, type: 1]
        - src/api/query-params.ts:19: type FastifyBaseLogger -> external
        - src/api/query-params.ts:25: call isNaN -> external
        - src/api/query-params.ts:26: call debug -> external
    40-50: parseArrayParam(value: string | undefined): {} [exported]
      /** Parse a comma-separated string into an array */
      refs out: 4 [call: 4]
        - src/api/query-params.ts:46: call filter -> external
        - src/api/query-params.ts:46: call map -> external
        - src/api/query-params.ts:46: call split -> external
        - src/api/query-params.ts:48: call trim -> external
    57-64: parseBooleanParam(value: string | undefined): boolean [exported]
      /** Parse a boolean query parameter */
  imports:
    - fastify

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
    - ../types.js
    - fastify

src/api/routes/clusters.test.ts [1-267]
  imports:
    - ../../storage/database.js
    - ../server.js
    - better-sqlite3
    - fastify
    - vitest

src/api/routes/clusters.ts [1-393]
  interface:
    16-21: interface ClusterNodeWithDetails extends ClusterNode
    23-25: interface ClusterWithNodes extends Cluster
      refs out: 1 [type: 1]
        - src/api/routes/clusters.ts:24: type ClusterNodeWithDetails -> src/api/routes/clusters.ts
    28-40: interface ClusterRow
      /** Database row shape for cluster queries */
    43-52: interface ClusterNodeRow
      /** Database row shape for cluster node queries */
    142-145: interface ClusterFilterParams
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
    150-172: buildClusterWhereClause(filters: ClusterFilterParams): { sql: string; params: {}; }
      /** Build WHERE clause fragments for cluster filters */
      refs out: 3 [call: 2, type: 1]
        - src/api/routes/clusters.ts:150: type ClusterFilterParams -> src/api/routes/clusters.ts
        - src/api/routes/clusters.ts:159: call push -> external
        - src/api/routes/clusters.ts:167: call push -> external
    177-190: attachRepresentativeNodes(db: Database, clusters: ClusterWithNodes[], limitPerCluster: number): void
      /** Attach representative nodes to clusters */
      refs out: 3 [call: 1, type: 2]
        - src/api/routes/clusters.ts:178: type Database -> external
        - src/api/routes/clusters.ts:179: type ClusterWithNodes -> src/api/routes/clusters.ts
        - src/api/routes/clusters.ts:188: call get -> external
    196-392: async clustersRoutes(app: FastifyInstance): Promise<void> [exported]
      refs out: 23 [call: 14, type: 9]
        - src/api/routes/clusters.ts:196: type FastifyInstance -> external
        - src/api/routes/clusters.ts:196: type Promise -> external
        - src/api/routes/clusters.ts:202: call get -> external
        - src/api/routes/clusters.ts:237: call attachRepresentativeNodes -> src/api/routes/clusters.ts
        - src/api/routes/clusters.ts:241: type const -> external
  imports:
    - ../../types/index.js
    - better-sqlite3
    - fastify

src/api/routes/config.test.ts [1-2365]
  imports:
    - ../../config/config.js
    - ../../storage/database.js
    - ../server.js
    - better-sqlite3
    - node:fs
    - vitest

src/api/routes/config.ts [1-1740]
  interface:
    177-205: interface DaemonConfigUpdateBody
      /** Daemon configuration update request body */
      refs out: 1 [type: 1]
        - src/api/routes/config.ts:194: type EmbeddingProvider -> src/api/routes/config.ts
    210-213: interface QueryConfigUpdateBody
      /** Query configuration update request body */
    218-222: interface ApiConfigUpdateBody
      /** API configuration update request body */
    227-231: interface HubConfigUpdateBody
      /** Hub configuration update request body */
    241-246: interface RsyncOptionsBody
      /** Spoke rsync options request body */
    251-259: interface SpokeCreateBody
      /** Spoke configuration create request body */
      refs out: 2 [type: 2]
        - src/api/routes/config.ts:253: type SyncMethod -> src/config/types.ts
        - src/api/routes/config.ts:258: type RsyncOptionsBody -> src/api/routes/config.ts
    264-271: interface SpokeUpdateBody
      /** Spoke configuration update request body */
      refs out: 2 [type: 2]
        - src/api/routes/config.ts:265: type SyncMethod -> src/config/types.ts
        - src/api/routes/config.ts:270: type RsyncOptionsBody -> src/api/routes/config.ts
    276-284: interface SpokeResponse
      /** Spoke response format */
      refs out: 2 [type: 2]
        - src/api/routes/config.ts:278: type SyncMethod -> src/config/types.ts
        - src/api/routes/config.ts:283: type RsyncOptions -> src/config/types.ts
  type:
    33-33: ValidationResult = string | null
      /** Validation result - either success (null) or error message */
    172-172: EmbeddingProvider = (typeof VALID_EMBEDDING_PROVIDERS)[number]
  function:
    38-45: firstError(validations: ValidationResult[]): string
      /** Run validation checks and return first error */
      refs out: 2 [type: 2]
        - src/api/routes/config.ts:38: type ValidationResult -> src/api/routes/config.ts
        - src/api/routes/config.ts:38: type ValidationResult -> src/api/routes/config.ts
    50-63: validateIntRange(value: number | undefined, field: string, min: number, max: number): string
      /** Validate an integer field is within a range */
      refs out: 2 [call: 1, type: 1]
        - src/api/routes/config.ts:55: type ValidationResult -> src/api/routes/config.ts
        - src/api/routes/config.ts:59: call isInteger -> external
    69-82: validateNullableIntRange(value: number | null | undefined, field: string, min: number, max: number): string
      /** Validate a nullable integer field is within a range Allows undefined and null to pass, validates numbers */
      refs out: 2 [call: 1, type: 1]
        - src/api/routes/config.ts:74: type ValidationResult -> src/api/routes/config.ts
        - src/api/routes/config.ts:78: call isInteger -> external
    87-100: validateFloatRange(value: number | undefined, field: string, min: number, max: number): string
      /** Validate a float field is within a range */
      refs out: 1 [type: 1]
        - src/api/routes/config.ts:92: type ValidationResult -> src/api/routes/config.ts
    105-116: validateNonEmptyString(value: string | undefined, field: string): string
      /** Validate a non-empty string field */
      refs out: 1 [type: 1]
        - src/api/routes/config.ts:108: type ValidationResult -> src/api/routes/config.ts
    121-132: validateNullableNonEmptyString(value: string | null | undefined, field: string): string
      /** Validate a nullable non-empty string field (allows null to clear) */
      refs out: 1 [type: 1]
        - src/api/routes/config.ts:124: type ValidationResult -> src/api/routes/config.ts
    137-149: validateOneOf<T>(value: T | undefined, field: string, allowed: readonly T[]): string
      /** Validate a value is one of allowed options */
      refs out: 5 [call: 2, type: 3]
        - src/api/routes/config.ts:138: type T -> src/api/routes/config.ts
        - src/api/routes/config.ts:140: type T -> src/api/routes/config.ts
        - src/api/routes/config.ts:141: type ValidationResult -> src/api/routes/config.ts
        - src/api/routes/config.ts:145: call includes -> external
        - src/api/routes/config.ts:146: call join -> external
    155-166: validateCronSchedule(value: string | null | undefined, field: string): string
      /** Validate a cron schedule expression Returns error message if invalid, null if valid or undefined */
      refs out: 2 [call: 1, type: 1]
        - src/api/routes/config.ts:158: type ValidationResult -> src/api/routes/config.ts
        - src/api/routes/config.ts:162: call isValidCronExpression -> src/daemon/scheduler.ts
    289-314: validateEmbeddingFields(body: DaemonConfigUpdateBody): string
      /** Validate embedding configuration fields */
      refs out: 7 [call: 5, type: 2]
        - src/api/routes/config.ts:290: type DaemonConfigUpdateBody -> src/api/routes/config.ts
        - src/api/routes/config.ts:291: type ValidationResult -> src/api/routes/config.ts
        - src/api/routes/config.ts:299: call firstError -> src/api/routes/config.ts
        - src/api/routes/config.ts:300: call validateOneOf -> src/api/routes/config.ts
        - src/api/routes/config.ts:305: call validateNonEmptyString -> src/api/routes/config.ts
    319-395: validateDaemonUpdate(body: DaemonConfigUpdateBody): string
      /** Validate daemon configuration update fields */
      refs out: 3 [call: 1, type: 2]
        - src/api/routes/config.ts:319: type DaemonConfigUpdateBody -> src/api/routes/config.ts
        - src/api/routes/config.ts:319: type ValidationResult -> src/api/routes/config.ts
        - src/api/routes/config.ts:394: call firstError -> src/api/routes/config.ts
    400-402: hasAnyDaemonField(body: DaemonConfigUpdateBody): boolean
      /** Check if daemon config update body has at least one field defined */
      refs out: 3 [call: 2, type: 1]
        - src/api/routes/config.ts:400: type DaemonConfigUpdateBody -> src/api/routes/config.ts
        - src/api/routes/config.ts:401: call some -> external
        - src/api/routes/config.ts:401: call values -> external
    408-423: applyNullableString(target: NonNullable<RawConfig["daemon"]>, key: keyof NonNullable<RawConfig["daemon"]>, value: string | null | undefined): void
      /** Apply an optional nullable string field to a raw config object null/empty clears the field, undefined skips, string sets */
      refs out: 4 [type: 4]
        - src/api/routes/config.ts:409: type NonNullable -> external
        - src/api/routes/config.ts:409: type RawConfig -> src/config/types.ts
        - src/api/routes/config.ts:410: type NonNullable -> external
        - src/api/routes/config.ts:410: type RawConfig -> src/config/types.ts
    429-443: applyNullableNumber(target: NonNullable<RawConfig["daemon"]>, key: keyof NonNullable<RawConfig["daemon"]>, value: number | null | undefined): void
      /** Apply an optional nullable numeric field to a raw config object null clears the field, undefined skips, number sets */
      refs out: 4 [type: 4]
        - src/api/routes/config.ts:430: type NonNullable -> external
        - src/api/routes/config.ts:430: type RawConfig -> src/config/types.ts
        - src/api/routes/config.ts:431: type NonNullable -> external
        - src/api/routes/config.ts:431: type RawConfig -> src/config/types.ts
    448-469: applyEmbeddingUpdates(daemon: NonNullable<RawConfig["daemon"]>, body: DaemonConfigUpdateBody): void
      /** Apply embedding config updates to raw config object */
      refs out: 6 [call: 3, type: 3]
        - src/api/routes/config.ts:449: type NonNullable -> external
        - src/api/routes/config.ts:449: type RawConfig -> src/config/types.ts
        - src/api/routes/config.ts:450: type DaemonConfigUpdateBody -> src/api/routes/config.ts
        - src/api/routes/config.ts:466: call applyNullableString -> src/api/routes/config.ts
        - src/api/routes/config.ts:467: call applyNullableString -> src/api/routes/config.ts
    474-503: applyScheduleUpdates(daemon: NonNullable<RawConfig["daemon"]>, body: DaemonConfigUpdateBody): void
      /** Apply schedule config updates to raw config object */
      refs out: 8 [call: 5, type: 3]
        - src/api/routes/config.ts:475: type NonNullable -> external
        - src/api/routes/config.ts:475: type RawConfig -> src/config/types.ts
        - src/api/routes/config.ts:476: type DaemonConfigUpdateBody -> src/api/routes/config.ts
        - src/api/routes/config.ts:486: call applyNullableString -> src/api/routes/config.ts
        - src/api/routes/config.ts:487: call applyNullableString -> src/api/routes/config.ts
    530-553: applyDaemonUpdates(rawConfig: RawConfig, body: DaemonConfigUpdateBody): void
      /** Apply daemon config updates to raw config object */
      refs out: 6 [call: 3, type: 3]
        - src/api/routes/config.ts:531: type RawConfig -> src/config/types.ts
        - src/api/routes/config.ts:532: type DaemonConfigUpdateBody -> src/api/routes/config.ts
        - src/api/routes/config.ts:542: call entries -> external
        - src/api/routes/config.ts:546: type Record -> external
        - src/api/routes/config.ts:551: call applyEmbeddingUpdates -> src/api/routes/config.ts
    558-572: validateQueryUpdate(body: QueryConfigUpdateBody): string
      /** Validate query configuration update fields */
      refs out: 2 [type: 2]
        - src/api/routes/config.ts:558: type QueryConfigUpdateBody -> src/api/routes/config.ts
        - src/api/routes/config.ts:558: type ValidationResult -> src/api/routes/config.ts
    577-606: validateApiUpdate(body: ApiConfigUpdateBody): string
      /** Validate API configuration update fields */
      refs out: 3 [call: 1, type: 2]
        - src/api/routes/config.ts:577: type ApiConfigUpdateBody -> src/api/routes/config.ts
        - src/api/routes/config.ts:577: type ValidationResult -> src/api/routes/config.ts
        - src/api/routes/config.ts:595: call isArray -> external
    611-633: validatePath(p: string, field: string): string
      /** Validate a path exists or has a writable parent */
      refs out: 7 [call: 5, type: 2]
        - src/api/routes/config.ts:611: type ValidationResult -> src/api/routes/config.ts
        - src/api/routes/config.ts:613: call existsSync -> external
        - src/api/routes/config.ts:615: call isDirectory -> external
        - src/api/routes/config.ts:615: call statSync -> external
        - src/api/routes/config.ts:619: type Error -> external
    638-650: validateDirPath(value: string | undefined, field: string): string
      /** Validate a directory path field (non-empty string + valid path) */
      refs out: 2 [call: 1, type: 1]
        - src/api/routes/config.ts:641: type ValidationResult -> src/api/routes/config.ts
        - src/api/routes/config.ts:649: call validatePath -> src/api/routes/config.ts
    655-663: validateHubUpdate(body: HubConfigUpdateBody): string
      /** Validate hub configuration update fields */
      refs out: 6 [call: 4, type: 2]
        - src/api/routes/config.ts:655: type HubConfigUpdateBody -> src/api/routes/config.ts
        - src/api/routes/config.ts:655: type ValidationResult -> src/api/routes/config.ts
        - src/api/routes/config.ts:658: call firstError -> src/api/routes/config.ts
        - src/api/routes/config.ts:659: call validateDirPath -> src/api/routes/config.ts
        - src/api/routes/config.ts:660: call validateDirPath -> src/api/routes/config.ts
    668-679: validateSpokeName(name: string): string
      /** Validate spoke name is valid (alphanumeric, dash, underscore) */
      refs out: 2 [call: 1, type: 1]
        - src/api/routes/config.ts:668: type ValidationResult -> src/api/routes/config.ts
        - src/api/routes/config.ts:672: call test -> external
    684-700: validateStringArray(value: string[] | undefined, field: string): string
      /** Validate a string array field */
      refs out: 2 [call: 1, type: 1]
        - src/api/routes/config.ts:687: type ValidationResult -> src/api/routes/config.ts
        - src/api/routes/config.ts:691: call isArray -> external
    705-720: validateRsyncOptions(options: RsyncOptionsBody | undefined, field: string): string
      /** Validate rsync options */
      refs out: 6 [call: 4, type: 2]
        - src/api/routes/config.ts:706: type RsyncOptionsBody -> src/api/routes/config.ts
        - src/api/routes/config.ts:708: type ValidationResult -> src/api/routes/config.ts
        - src/api/routes/config.ts:715: call firstError -> src/api/routes/config.ts
        - src/api/routes/config.ts:716: call validateIntRange -> src/api/routes/config.ts
        - src/api/routes/config.ts:717: call validateIntRange -> src/api/routes/config.ts
    725-764: validateSpokeCreate(body: SpokeCreateBody): string
      /** Validate spoke create request body */
      refs out: 3 [call: 1, type: 2]
        - src/api/routes/config.ts:725: type SpokeCreateBody -> src/api/routes/config.ts
        - src/api/routes/config.ts:725: type ValidationResult -> src/api/routes/config.ts
        - src/api/routes/config.ts:750: call join -> external
    769-781: validateSpokeUpdate(body: SpokeUpdateBody): string
      /** Validate spoke update request body */
      refs out: 8 [call: 6, type: 2]
        - src/api/routes/config.ts:769: type SpokeUpdateBody -> src/api/routes/config.ts
        - src/api/routes/config.ts:769: type ValidationResult -> src/api/routes/config.ts
        - src/api/routes/config.ts:772: call firstError -> src/api/routes/config.ts
        - src/api/routes/config.ts:773: call validateOneOf -> src/api/routes/config.ts
        - src/api/routes/config.ts:774: call validateDirPath -> src/api/routes/config.ts
    790-796: async readRawConfig(): Promise<RawConfig>
      /** Read raw config from YAML file */
      refs out: 5 [call: 2, type: 3]
        - src/api/routes/config.ts:790: type Promise -> external
        - src/api/routes/config.ts:790: type RawConfig -> src/config/types.ts
        - src/api/routes/config.ts:792: call trim -> external
        - src/api/routes/config.ts:795: call parse -> external
        - src/api/routes/config.ts:795: type RawConfig -> src/config/types.ts
    801-807: async writeRawConfig(rawConfig: RawConfig): Promise<void>
      /** Write raw config to YAML file */
      refs out: 3 [call: 1, type: 2]
        - src/api/routes/config.ts:801: type RawConfig -> src/config/types.ts
        - src/api/routes/config.ts:801: type Promise -> external
        - src/api/routes/config.ts:806: call safeWriteFile -> src/utils/fs-async.ts
    812-833: buildRawRsyncOptions(options: RsyncOptionsBody): NonNullable<NonNullable<RawConfig>>
      /** Build raw rsync options from body rsync options */
      refs out: 4 [type: 4]
        - src/api/routes/config.ts:813: type RsyncOptionsBody -> src/api/routes/config.ts
        - src/api/routes/config.ts:814: type NonNullable -> external
        - src/api/routes/config.ts:814: type NonNullable -> external
        - src/api/routes/config.ts:814: type RawConfig -> src/config/types.ts
    838-859: buildRawSpokeFromBody(body: SpokeCreateBody): NonNullable<RawConfig>
      /** Build raw spoke config from create body */
      refs out: 4 [call: 1, type: 3]
        - src/api/routes/config.ts:839: type SpokeCreateBody -> src/api/routes/config.ts
        - src/api/routes/config.ts:840: type NonNullable -> external
        - src/api/routes/config.ts:840: type RawConfig -> src/config/types.ts
        - src/api/routes/config.ts:855: call buildRawRsyncOptions -> src/api/routes/config.ts
    864-883: applyRsyncOptionsUpdate(rawSpoke: NonNullable<RawConfig["spokes"]>[number], options: RsyncOptionsBody): void
      /** Apply rsync options update to raw spoke */
      refs out: 5 [call: 1, type: 4]
        - src/api/routes/config.ts:865: type NonNullable -> external
        - src/api/routes/config.ts:865: type RawConfig -> src/config/types.ts
        - src/api/routes/config.ts:866: type RsyncOptionsBody -> src/api/routes/config.ts
        - src/api/routes/config.ts:877: call entries -> external
        - src/api/routes/config.ts:880: type Record -> external
    888-902: applyNullableField(target: Record<string, unknown>, key: string, value: string | null | undefined): void
      /** Apply a nullable string field (null clears, string sets) */
      refs out: 2 [call: 1, type: 1]
        - src/api/routes/config.ts:889: type Record -> external
        - src/api/routes/config.ts:898: call deleteProperty -> external
    907-932: applySpokeUpdates(rawSpoke: NonNullable<RawConfig["spokes"]>[number], body: SpokeUpdateBody): void
      /** Apply spoke update fields to raw spoke config */
      refs out: 6 [call: 3, type: 3]
        - src/api/routes/config.ts:908: type NonNullable -> external
        - src/api/routes/config.ts:908: type RawConfig -> src/config/types.ts
        - src/api/routes/config.ts:909: type SpokeUpdateBody -> src/api/routes/config.ts
        - src/api/routes/config.ts:923: call applyNullableField -> src/api/routes/config.ts
        - src/api/routes/config.ts:924: call applyNullableField -> src/api/routes/config.ts
    937-964: spokeToResponse(spoke: {
  name: string;
  syncMethod: SyncMethod;
  path: string;
  source?: string;
  enabled: boolean;
  schedule?: string;
  rsyncOptions?: RsyncOptions;
}): SpokeResponse
      /** Convert a spoke config to response format */
      refs out: 3 [type: 3]
        - src/api/routes/config.ts:939: type SyncMethod -> src/config/types.ts
        - src/api/routes/config.ts:944: type RsyncOptions -> src/config/types.ts
        - src/api/routes/config.ts:945: type SpokeResponse -> src/api/routes/config.ts
    969-987: applyQueryUpdates(rawConfig: RawConfig, body: QueryConfigUpdateBody): void
      /** Apply query config updates to raw config object */
      refs out: 2 [type: 2]
        - src/api/routes/config.ts:970: type RawConfig -> src/config/types.ts
        - src/api/routes/config.ts:971: type QueryConfigUpdateBody -> src/api/routes/config.ts
    992-1013: applyApiUpdates(rawConfig: RawConfig, body: ApiConfigUpdateBody): void
      /** Apply API config updates to raw config object */
      refs out: 2 [type: 2]
        - src/api/routes/config.ts:993: type RawConfig -> src/config/types.ts
        - src/api/routes/config.ts:994: type ApiConfigUpdateBody -> src/api/routes/config.ts
    1018-1039: applyHubUpdates(rawConfig: RawConfig, body: HubConfigUpdateBody): void
      /** Apply hub config updates to raw config object */
      refs out: 2 [type: 2]
        - src/api/routes/config.ts:1019: type RawConfig -> src/config/types.ts
        - src/api/routes/config.ts:1020: type HubConfigUpdateBody -> src/api/routes/config.ts
    1041-1739: async configRoutes(app: FastifyInstance): Promise<void> [exported]
      refs out: 142 [call: 108, type: 34]
        - src/api/routes/config.ts:1041: type FastifyInstance -> external
        - src/api/routes/config.ts:1041: type Promise -> external
        - src/api/routes/config.ts:1045: call get -> external
        - src/api/routes/config.ts:1045: type FastifyRequest -> external
        - src/api/routes/config.ts:1045: type FastifyReply -> external
  variable:
    171-171: readonly ["ollama", "openai", "openrouter"]
      /** Valid embedding providers */
      refs out: 1 [type: 1]
        - src/api/routes/config.ts:171: type const -> external
    236-236: SyncMethod[]
      /** Valid sync methods for spokes */
      refs out: 1 [type: 1]
        - src/api/routes/config.ts:236: type SyncMethod -> src/config/types.ts
    508-525: Record<string, keyof NonNullable<RawConfig["daemon"]>>
      /** Mapping of body field names to raw config field names for simple daemon updates */
      refs out: 3 [type: 3]
        - src/api/routes/config.ts:508: type Record -> external
        - src/api/routes/config.ts:508: type NonNullable -> external
        - src/api/routes/config.ts:508: type RawConfig -> src/config/types.ts
  imports:
    - ../../config/config.js
    - ../../config/types.js
    - ../../daemon/scheduler.js
    - ../../utils/fs-async.js
    - ../responses.js
    - fastify
    - node:fs
    - node:path
    - yaml

src/api/routes/daemon.ts [1-386]
  function:
    27-318: async daemonRoutes(app: FastifyInstance): Promise<void> [exported]
      refs out: 46 [call: 34, type: 12]
        - src/api/routes/daemon.ts:27: type FastifyInstance -> external
        - src/api/routes/daemon.ts:27: type Promise -> external
        - src/api/routes/daemon.ts:31: call get -> external
        - src/api/routes/daemon.ts:31: type FastifyRequest -> external
        - src/api/routes/daemon.ts:31: type FastifyReply -> external
    326-385: getAverageProcessingRate(db: Database.Database): number
      /** Calculate average processing rate (bytes per second) from historical completed jobs Looks at recently completed jobs to estimate how long processing takes based on session file size. Returns 0 if no historical data is available. */
      refs out: 2 [call: 1, type: 1]
        - src/api/routes/daemon.ts:326: type Database -> external
        - src/api/routes/daemon.ts:381: call round -> external
  imports:
    - ../../daemon/cli.js
    - ../../daemon/errors.js
    - ../../daemon/pattern-aggregation.js
    - ../../daemon/queue.js
    - ../../utils/fs-async.js
    - ../responses.js
    - better-sqlite3
    - fastify
    - node:fs
    - node:path

src/api/routes/decisions.ts [1-84]
  function:
    16-83: async decisionsRoutes(app: FastifyInstance): Promise<void> [exported]
      refs out: 15 [call: 9, type: 6]
        - src/api/routes/decisions.ts:16: type FastifyInstance -> external
        - src/api/routes/decisions.ts:16: type Promise -> external
        - src/api/routes/decisions.ts:20: call get -> external
        - src/api/routes/decisions.ts:23: type FastifyRequest -> external
        - src/api/routes/decisions.ts:33: type FastifyReply -> external
  imports:
    - ../../storage/decision-repository.js
    - ../query-params.js
    - ../responses.js
    - fastify

src/api/routes/edges.ts [1-211]
  function:
    19-210: async edgesRoutes(app: FastifyInstance): Promise<void> [exported]
      refs out: 40 [call: 29, type: 11]
        - src/api/routes/edges.ts:19: type FastifyInstance -> external
        - src/api/routes/edges.ts:19: type Promise -> external
        - src/api/routes/edges.ts:23: call get -> external
        - src/api/routes/edges.ts:26: type FastifyRequest -> external
        - src/api/routes/edges.ts:35: type FastifyReply -> external
  imports:
    - ../../storage/edge-repository.js
    - ../../storage/node-types.js
    - ../query-params.js
    - ../responses.js
    - fastify

src/api/routes/lessons.ts [1-71]
  function:
    16-70: async lessonsRoutes(app: FastifyInstance): Promise<void> [exported]
      refs out: 12 [call: 6, type: 6]
        - src/api/routes/lessons.ts:16: type FastifyInstance -> external
        - src/api/routes/lessons.ts:16: type Promise -> external
        - src/api/routes/lessons.ts:20: call get -> external
        - src/api/routes/lessons.ts:23: type FastifyRequest -> external
        - src/api/routes/lessons.ts:33: type FastifyReply -> external
  imports:
    - ../../storage/lesson-repository.js
    - ../query-params.js
    - ../responses.js
    - fastify

src/api/routes/nodes.ts [1-232]
  function:
    39-61: buildIncludeFetchers(db: Database.Database, id: string): Record<string, () => unknown>
      /** Lookup table for include data fetchers Each key maps to a function that fetches the relevant data */
      refs out: 8 [call: 6, type: 2]
        - src/api/routes/nodes.ts:40: type Database -> external
        - src/api/routes/nodes.ts:42: type Record -> external
        - src/api/routes/nodes.ts:44: call getNodeLessons -> src/storage/lesson-repository.ts
        - src/api/routes/nodes.ts:45: call getNodeQuirks -> src/storage/quirk-repository.ts
        - src/api/routes/nodes.ts:46: call getNodeToolErrors -> src/storage/tool-error-repository.ts
    66-78: populateIncludeData(responseData: Record<string, unknown>, includes: string[], fetchers: Record<string, () => unknown>): void
      /** Populate response data based on include params */
      refs out: 5 [call: 3, type: 2]
        - src/api/routes/nodes.ts:67: type Record -> external
        - src/api/routes/nodes.ts:69: type Record -> external
        - src/api/routes/nodes.ts:73: call entries -> external
        - src/api/routes/nodes.ts:74: call includes -> external
        - src/api/routes/nodes.ts:75: call fetcher -> src/api/routes/nodes.ts
    80-231: async nodesRoutes(app: FastifyInstance): Promise<void> [exported]
      refs out: 24 [call: 16, type: 8]
        - src/api/routes/nodes.ts:80: type FastifyInstance -> external
        - src/api/routes/nodes.ts:80: type Promise -> external
        - src/api/routes/nodes.ts:84: call get -> external
        - src/api/routes/nodes.ts:87: type FastifyRequest -> external
        - src/api/routes/nodes.ts:105: type FastifyReply -> external
  imports:
    - ../../storage/graph-repository.js
    - ../../storage/lesson-repository.js
    - ../../storage/node-conversion.js
    - ../../storage/node-crud.js
    - ../../storage/node-queries.js
    - ../../storage/node-storage.js
    - ../../storage/node-types.js
    - ../../storage/quirk-repository.js
    - ../../storage/tool-error-repository.js
    - ../query-params.js
    - ../responses.js
    - better-sqlite3
    - fastify

src/api/routes/patterns.ts [1-93]
  function:
    15-92: async patternsRoutes(app: FastifyInstance): Promise<void> [exported]
      refs out: 17 [call: 9, type: 8]
        - src/api/routes/patterns.ts:15: type FastifyInstance -> external
        - src/api/routes/patterns.ts:15: type Promise -> external
        - src/api/routes/patterns.ts:19: call get -> external
        - src/api/routes/patterns.ts:22: type FastifyRequest -> external
        - src/api/routes/patterns.ts:29: type FastifyReply -> external
  imports:
    - ../../storage/pattern-repository.js
    - ../query-params.js
    - ../responses.js
    - fastify

src/api/routes/prompt-learning.ts [1-166]
  function:
    18-165: async promptLearningRoutes(app: FastifyInstance): Promise<void> [exported]
      refs out: 34 [call: 26, type: 8]
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

src/api/routes/query.ts [1-291]
  function:
    69-113: getEmbeddingProvider(config: {
  embeddingProvider?: "openrouter" | "ollama" | "openai";
  embeddingModel?: string;
  embeddingApiKey?: string;
  embeddingBaseUrl?: string;
  embeddingDimensions?: number;
}): any
      /** Get or create the embedding provider with caching. Cache is invalidated if the configuration changes. */
      refs out: 2 [call: 1, type: 1]
        - src/api/routes/query.ts:75: type EmbeddingProvider -> src/daemon/facet-discovery.ts
        - src/api/routes/query.ts:103: call createEmbeddingProvider -> src/daemon/facet-discovery.ts
    115-290: async queryRoutes(app: FastifyInstance): Promise<void> [exported]
      refs out: 37 [call: 30, instantiate: 1, type: 6]
        - src/api/routes/query.ts:115: type FastifyInstance -> external
        - src/api/routes/query.ts:115: type Promise -> external
        - src/api/routes/query.ts:126: call post -> external
        - src/api/routes/query.ts:129: type FastifyRequest -> external
        - src/api/routes/query.ts:143: type FastifyReply -> external
  variable:
    24-56: DEFAULT_QUERY_CONFIG
      /** Default daemon config for query processing */
      refs out: 3 [call: 2, type: 1]
        - src/api/routes/query.ts:27: call join -> external
        - src/api/routes/query.ts:28: call homedir -> external
        - src/api/routes/query.ts:42: type const -> external
    62-62: EmbeddingProvider | undefined
      /** Cached embedding provider instance. Created once on first use to avoid HTTP client setup overhead per request. */
      refs out: 1 [type: 1]
        - src/api/routes/query.ts:62: type EmbeddingProvider -> src/daemon/facet-discovery.ts
    63-63: string | undefined
  imports:
    - ../../daemon/facet-discovery.js
    - ../../daemon/query-processor.js
    - ../responses.js
    - fastify
    - node:child_process
    - node:os
    - node:path

src/api/routes/quirks.ts [1-98]
  function:
    17-97: async quirksRoutes(app: FastifyInstance): Promise<void> [exported]
      refs out: 17 [call: 9, type: 8]
        - src/api/routes/quirks.ts:17: type FastifyInstance -> external
        - src/api/routes/quirks.ts:17: type Promise -> external
        - src/api/routes/quirks.ts:21: call get -> external
        - src/api/routes/quirks.ts:24: type FastifyRequest -> external
        - src/api/routes/quirks.ts:33: type FastifyReply -> external
  imports:
    - ../../storage/quirk-repository.js
    - ../query-params.js
    - ../responses.js
    - fastify

src/api/routes/search.ts [1-82]
  function:
    17-81: async searchRoutes(app: FastifyInstance): Promise<void> [exported]
      refs out: 7 [call: 3, type: 4]
        - src/api/routes/search.ts:17: type FastifyInstance -> external
        - src/api/routes/search.ts:17: type Promise -> external
        - src/api/routes/search.ts:21: call get -> external
        - src/api/routes/search.ts:24: type FastifyRequest -> external
        - src/api/routes/search.ts:39: type FastifyReply -> external
  imports:
    - ../../storage/node-queries.js
    - ../../storage/search-repository.js
    - ../query-params.js
    - ../responses.js
    - fastify

src/api/routes/sessions.ts [1-263]
  interface:
    21-35: interface SessionSummary
      /** Session summary for the file browser */
    40-45: interface ProjectSummary
      /** Project summary for the file browser */
  function:
    47-262: async sessionsRoutes(app: FastifyInstance): Promise<void> [exported]
      refs out: 34 [call: 24, instantiate: 2, type: 8]
        - src/api/routes/sessions.ts:47: type FastifyInstance -> external
        - src/api/routes/sessions.ts:47: type Promise -> external
        - src/api/routes/sessions.ts:51: call get -> external
        - src/api/routes/sessions.ts:51: type FastifyRequest -> external
        - src/api/routes/sessions.ts:51: type FastifyReply -> external
  imports:
    - ../../storage/node-conversion.js
    - ../../storage/node-queries.js
    - ../query-params.js
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

src/api/routes/stats.test.ts [1-290]
  imports:
    - ../../storage/database.js
    - ../server.js
    - better-sqlite3
    - fastify
    - vitest

src/api/routes/stats.ts [1-485]
  interface:
    24-33: interface MessageEngagement
      /** Message engagement stats from aggregating user/assistant message counts */
    36-47: interface ClarifyingQuestions
      /** Clarifying questions stats from aggregating question counts */
    50-61: interface ContextWindowUsage
      /** Context window usage stats */
    195-199: interface DateRanges
      refs out: 3 [type: 3]
        - src/api/routes/stats.ts:196: type Date -> external
        - src/api/routes/stats.ts:197: type Date -> external
        - src/api/routes/stats.ts:198: type Date -> external
    216-221: interface OutcomeCounts
    232-236: interface VagueGoalTrends
    278-282: interface UsageTotals
      refs out: 1 [type: 1]
        - src/api/routes/stats.ts:281: type Record -> external
  function:
    19-21: formatDateToUTC(d: Date): string
      /** Format a date to UTC date string (YYYY-MM-DD) */
      refs out: 3 [call: 2, type: 1]
        - src/api/routes/stats.ts:19: type Date -> external
        - src/api/routes/stats.ts:20: call split -> external
        - src/api/routes/stats.ts:20: call toISOString -> external
    66-94: getMessageEngagement(db: Database.Database): MessageEngagement
      /** Get message engagement statistics from the database */
      refs out: 2 [type: 2]
        - src/api/routes/stats.ts:66: type Database -> external
        - src/api/routes/stats.ts:66: type MessageEngagement -> src/api/routes/stats.ts
    102-147: getClarifyingQuestions(db: Database.Database): ClarifyingQuestions
      /** Get clarifying questions statistics from the database Tracks agent-initiated clarifying questions (filtered to exclude cases where questions were explicitly requested by user/tools/skills). */
      refs out: 2 [type: 2]
        - src/api/routes/stats.ts:102: type Database -> external
        - src/api/routes/stats.ts:102: type ClarifyingQuestions -> src/api/routes/stats.ts
    160-189: getContextWindowUsage(db: Database.Database): ContextWindowUsage
      /** Get context window usage statistics from the database. Calculates what percentage of the context window is typically used, and counts how many sessions exceeded 50% and 75% thresholds. */
      refs out: 2 [type: 2]
        - src/api/routes/stats.ts:160: type Database -> external
        - src/api/routes/stats.ts:160: type ContextWindowUsage -> src/api/routes/stats.ts
    201-214: getDateRanges(): DateRanges
      refs out: 6 [call: 5, type: 1]
        - src/api/routes/stats.ts:201: type DateRanges -> src/api/routes/stats.ts
        - src/api/routes/stats.ts:205: call setDate -> external
        - src/api/routes/stats.ts:205: call getDate -> external
        - src/api/routes/stats.ts:208: call setDate -> external
        - src/api/routes/stats.ts:208: call getDate -> external
    223-230: getOutcomeCounts(db: Database.Database): OutcomeCounts
      refs out: 2 [type: 2]
        - src/api/routes/stats.ts:223: type Database -> external
        - src/api/routes/stats.ts:223: type OutcomeCounts -> src/api/routes/stats.ts
    238-276: getVagueGoalTrends(db: Database.Database, dates: DateRanges): VagueGoalTrends
      refs out: 3 [type: 3]
        - src/api/routes/stats.ts:239: type Database -> external
        - src/api/routes/stats.ts:240: type DateRanges -> src/api/routes/stats.ts
        - src/api/routes/stats.ts:241: type VagueGoalTrends -> src/api/routes/stats.ts
    284-295: getUsageTotals(db: Database.Database): UsageTotals
      refs out: 2 [type: 2]
        - src/api/routes/stats.ts:284: type Database -> external
        - src/api/routes/stats.ts:284: type UsageTotals -> src/api/routes/stats.ts
    297-475: async statsRoutes(app: FastifyInstance): Promise<void> [exported]
      refs out: 26 [call: 18, type: 8]
        - src/api/routes/stats.ts:297: type FastifyInstance -> external
        - src/api/routes/stats.ts:297: type Promise -> external
        - src/api/routes/stats.ts:301: call get -> external
        - src/api/routes/stats.ts:301: type FastifyRequest -> external
        - src/api/routes/stats.ts:301: type FastifyReply -> external
    480-484: countEdges(db: Database.Database): number
      /** Count edges in the database */
      refs out: 1 [type: 1]
        - src/api/routes/stats.ts:480: type Database -> external
  variable:
    152-152: 128000
      /** Default context window size for analysis (128K tokens, common for modern LLMs) */
  imports:
    - ../../storage/node-queries.js
    - ../../storage/tool-error-repository.js
    - ../responses.js
    - better-sqlite3
    - fastify

src/api/routes/tool-errors.ts [1-111]
  function:
    17-110: async toolErrorsRoutes(app: FastifyInstance): Promise<void> [exported]
      refs out: 17 [call: 9, type: 8]
        - src/api/routes/tool-errors.ts:17: type FastifyInstance -> external
        - src/api/routes/tool-errors.ts:17: type Promise -> external
        - src/api/routes/tool-errors.ts:21: call get -> external
        - src/api/routes/tool-errors.ts:24: type FastifyRequest -> external
        - src/api/routes/tool-errors.ts:34: type FastifyReply -> external
  imports:
    - ../../storage/tool-error-repository.js
    - ../query-params.js
    - ../responses.js
    - fastify

src/api/server.test.ts [1-778]
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
    - ../storage/node-crud.js
    - ../storage/node-types.js
    - ./server.js
    - ./websocket.js
    - node:fs
    - node:os
    - node:path
    - vitest

src/api/server.ts [1-197]
  interface:
    163-166: interface ServerResult [exported]
      /** Server result including the Fastify instance and WebSocket manager */
      refs out: 2 [type: 2]
        - src/api/server.ts:164: type FastifyInstance -> external
        - src/api/server.ts:165: type WebSocketManager -> src/api/websocket.ts
  function:
    60-158: async createServer(db: Database, config: ApiConfig, daemonConfig?: DaemonConfig, wsManager?: WebSocketManager): Promise<FastifyInstance> [exported]
      /** Create and configure the Fastify server */
      refs out: 34 [call: 27, instantiate: 1, type: 6]
        - src/api/server.ts:61: type Database -> external
        - src/api/server.ts:62: type ApiConfig -> src/config/types.ts
        - src/api/server.ts:63: type DaemonConfig -> src/config/types.ts
        - src/api/server.ts:64: type WebSocketManager -> src/api/websocket.ts
        - src/api/server.ts:65: type Promise -> external
    171-189: async startServer(db: Database, config: ApiConfig, daemonConfig?: DaemonConfig, wsManager?: WebSocketManager): Promise<ServerResult> [exported]
      /** Start the API server */
      refs out: 8 [call: 2, type: 6]
        - src/api/server.ts:172: type Database -> external
        - src/api/server.ts:173: type ApiConfig -> src/config/types.ts
        - src/api/server.ts:174: type DaemonConfig -> src/config/types.ts
        - src/api/server.ts:175: type WebSocketManager -> src/api/websocket.ts
        - src/api/server.ts:176: type Promise -> external
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
    - ./types.js
    - ./websocket.js
    - @fastify/cors
    - @fastify/websocket
    - better-sqlite3
    - fastify

src/api/types.ts [1-21]
  interface:
    15-20: interface ServerContext [exported]
      /** Server context passed to route handlers */
      refs out: 3 [type: 3]
        - src/api/types.ts:16: type Database -> external
        - src/api/types.ts:17: type ApiConfig -> src/config/types.ts
        - src/api/types.ts:19: type DaemonConfig -> src/config/types.ts
  imports:
    - ../config/types.js
    - better-sqlite3

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

src/api/websocket.ts [1-406]
  class:
    76-361: class WebSocketManager [exported]
      /** Manages WebSocket connections and broadcasts events */
      77-77: clients
        refs out: 2 [instantiate: 1, type: 1]
          - src/api/websocket.ts:77: instantiate Set -> external
          - src/api/websocket.ts:77: type WSClient -> src/api/websocket.ts
      78-82: logger: {
    info: (msg: string) => void;
    error: (msg: string) => void;
    debug: (msg: string) => void;
  }
      84-94: constructor(logger?: {
    info: (msg: string) => void;
    error: (msg: string) => void;
    debug: (msg: string) => void;
  })
        refs out: 3 [call: 3]
          - src/api/websocket.ts:90: call info -> src/utils/logger.ts
          - src/api/websocket.ts:91: call error -> src/utils/logger.ts
          - src/api/websocket.ts:92: call debug -> src/utils/logger.ts
      99-126: handleConnection(socket: WebSocket): void
        /** Handle a new WebSocket connection */
        refs out: 12 [call: 10, type: 2]
          - src/api/websocket.ts:99: type WebSocket -> external
          - src/api/websocket.ts:106: call add -> external
          - src/api/websocket.ts:107: call WebSocketManager.info -> src/api/websocket.ts
          - src/api/websocket.ts:111: call WebSocket.on -> external
          - src/api/websocket.ts:111: type Buffer -> external
      131-160: handleMessage(client: WSClient, data: Buffer | string): void
        /** Handle incoming message from client */
        refs out: 11 [call: 7, instantiate: 2, type: 2]
          - src/api/websocket.ts:131: type WSClient -> src/api/websocket.ts
          - src/api/websocket.ts:131: type Buffer -> external
          - src/api/websocket.ts:137: call WebSocketManager.handleSubscribe -> src/api/websocket.ts
          - src/api/websocket.ts:141: call WebSocketManager.sendToClient -> src/api/websocket.ts
          - src/api/websocket.ts:146: call toISOString -> external
      165-198: handleSubscribe(client: WSClient, message: SubscribeMessage): void
        /** Handle subscription request */
        refs out: 13 [call: 9, instantiate: 2, type: 2]
          - src/api/websocket.ts:165: type WSClient -> src/api/websocket.ts
          - src/api/websocket.ts:165: type SubscribeMessage -> src/api/websocket.ts
          - src/api/websocket.ts:174: call isArray -> external
          - src/api/websocket.ts:175: call WebSocketManager.sendToClient -> src/api/websocket.ts
          - src/api/websocket.ts:178: call toISOString -> external
      203-213: sendToClient(client: WSClient, message: WSMessage): void
        /** Send message to a specific client */
        refs out: 6 [call: 4, type: 2]
          - src/api/websocket.ts:203: type WSClient -> src/api/websocket.ts
          - src/api/websocket.ts:203: type WSMessage -> src/api/websocket.ts
          - src/api/websocket.ts:206: call WebSocket.send -> external
          - src/api/websocket.ts:206: call stringify -> external
          - src/api/websocket.ts:208: call WebSocketManager.error -> src/api/websocket.ts
      218-231: broadcast(channel: WSChannel, message: WSMessage): void
        /** Broadcast message to all subscribed clients */
        refs out: 5 [call: 3, type: 2]
          - src/api/websocket.ts:218: type WSChannel -> src/api/websocket.ts
          - src/api/websocket.ts:218: type WSMessage -> src/api/websocket.ts
          - src/api/websocket.ts:222: call has -> external
          - src/api/websocket.ts:223: call WebSocketManager.sendToClient -> src/api/websocket.ts
          - src/api/websocket.ts:228: call WebSocketManager.debug -> src/api/websocket.ts
      236-238: getClientCount(): number
        /** Get connected client count */
      243-248: closeAll(): void
        /** Close all connections */
        refs out: 2 [call: 2]
          - src/api/websocket.ts:245: call WebSocket.close -> external
          - src/api/websocket.ts:247: call clear -> external
      257-283: broadcastDaemonStatus(status: {
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
          - src/api/websocket.ts:278: call WebSocketManager.broadcast -> src/api/websocket.ts
          - src/api/websocket.ts:281: call toISOString -> external
          - src/api/websocket.ts:281: instantiate Date -> external
      288-298: broadcastAnalysisStarted(job: AnalysisJob, workerId: string): void
        /** Broadcast analysis started event */
        refs out: 4 [call: 2, instantiate: 1, type: 1]
          - src/api/websocket.ts:288: type AnalysisJob -> src/daemon/types.ts
          - src/api/websocket.ts:289: call WebSocketManager.broadcast -> src/api/websocket.ts
          - src/api/websocket.ts:296: call toISOString -> external
          - src/api/websocket.ts:296: instantiate Date -> external
      303-325: broadcastAnalysisCompleted(job: AnalysisJob, node: Node): void
        /** Broadcast analysis completed event */
        refs out: 8 [call: 4, instantiate: 2, type: 2]
          - src/api/websocket.ts:303: type AnalysisJob -> src/daemon/types.ts
          - src/api/websocket.ts:303: type Node -> src/types/index.ts
          - src/api/websocket.ts:304: call WebSocketManager.broadcast -> src/api/websocket.ts
          - src/api/websocket.ts:311: call toISOString -> external
          - src/api/websocket.ts:311: instantiate Date -> external
      330-344: broadcastAnalysisFailed(job: AnalysisJob, error: Error, willRetry: boolean): void
        /** Broadcast analysis failed event */
        refs out: 5 [call: 2, instantiate: 1, type: 2]
          - src/api/websocket.ts:331: type AnalysisJob -> src/daemon/types.ts
          - src/api/websocket.ts:332: type Error -> external
          - src/api/websocket.ts:335: call WebSocketManager.broadcast -> src/api/websocket.ts
          - src/api/websocket.ts:342: call toISOString -> external
          - src/api/websocket.ts:342: instantiate Date -> external
      349-360: broadcastQueueUpdate(stats: {
    pending: number;
    running: number;
    completed: number;
    failed: number;
  }): void
        /** Broadcast queue update event */
        refs out: 3 [call: 2, instantiate: 1]
          - src/api/websocket.ts:355: call WebSocketManager.broadcast -> src/api/websocket.ts
          - src/api/websocket.ts:358: call toISOString -> external
          - src/api/websocket.ts:358: instantiate Date -> external
  interface:
    47-51: interface WSMessage [exported]
      /** Message format for WebSocket events */
      refs out: 1 [type: 1]
        - src/api/websocket.ts:48: type WSEventType -> src/api/websocket.ts
    54-57: interface SubscribeMessage
      /** Client subscription request */
      refs out: 1 [type: 1]
        - src/api/websocket.ts:56: type WSChannel -> src/api/websocket.ts
    63-67: interface WSClient
      /** Connected client with subscriptions */
      refs out: 4 [type: 4]
        - src/api/websocket.ts:64: type WebSocket -> external
        - src/api/websocket.ts:65: type Set -> external
        - src/api/websocket.ts:65: type WSChannel -> src/api/websocket.ts
        - src/api/websocket.ts:66: type Date -> external
  type:
    33-33: WSChannel = "daemon" | "analysis" | "node" | "queue" [exported]
      /** Available subscription channels */
    36-44: WSEventType = | "daemon.status"
  | "analysis.started"
  | "analysis.completed"
  | "analysis.failed"
  | "node.created"
  | "queue.updated"
  | "subscribed"
  | "error" [exported]
      /** WebSocket message types from server to client */
    60-60: ClientMessage = SubscribeMessage
      /** Client message union type */
      refs out: 1 [type: 1]
        - src/api/websocket.ts:60: type SubscribeMessage -> src/api/websocket.ts
  function:
    370-382: registerWebSocketRoute(app: FastifyInstance, wsManager: WebSocketManager): void [exported]
      /** Register the WebSocket route on a Fastify instance */
      refs out: 6 [call: 2, type: 4]
        - src/api/websocket.ts:371: type FastifyInstance -> external
        - src/api/websocket.ts:372: type WebSocketManager -> src/api/websocket.ts
        - src/api/websocket.ts:375: call get -> external
        - src/api/websocket.ts:378: type WebSocket -> external
        - src/api/websocket.ts:378: type FastifyRequest -> external
    393-398: getWebSocketManager(): WebSocketManager [exported]
      /** Get or create the global WebSocket manager */
      refs out: 2 [instantiate: 1, type: 1]
        - src/api/websocket.ts:393: type WebSocketManager -> src/api/websocket.ts
        - src/api/websocket.ts:395: instantiate WebSocketManager -> src/api/websocket.ts
    403-405: setWebSocketManager(manager: WebSocketManager): void [exported]
      /** Set the global WebSocket manager (for testing or custom config) */
      refs out: 1 [type: 1]
        - src/api/websocket.ts:403: type WebSocketManager -> src/api/websocket.ts
  variable:
    21-26: { readonly CONNECTING: 0; readonly OPEN: 1; readonly CLOSING: 2; readonly CLOSED: 3; }
      /** WebSocket ready state values (mirrors WebSocket.OPEN, etc.) */
      refs out: 1 [type: 1]
        - src/api/websocket.ts:26: type const -> external
    388-388: WebSocketManager | null
      refs out: 1 [type: 1]
        - src/api/websocket.ts:388: type WebSocketManager -> src/api/websocket.ts
  imports:
    - ../daemon/queue.js
    - ../storage/node-types.js
    - ../utils/logger.js
    - fastify
    - ws

src/cli.ts [1-1165]
  function:
    392-400: printNoRsyncSpokesError(): void
      /** Print error message when no rsync spokes are configured */
      refs out: 7 [call: 7]
        - src/cli.ts:393: call error -> external
        - src/cli.ts:394: call error -> external
        - src/cli.ts:395: call error -> external
        - src/cli.ts:396: call error -> external
        - src/cli.ts:397: call error -> external
    405-414: printSpokeNotFoundError(spokeName: string, availableSpokes: { name: string }[]): void
      /** Print error message when spoke not found */
      refs out: 3 [call: 3]
        - src/cli.ts:409: call error -> external
        - src/cli.ts:410: call error -> external
        - src/cli.ts:412: call error -> external
  variable:
    73-73: any
      refs out: 1 [instantiate: 1]
        - src/cli.ts:73: instantiate Command -> external
    200-202: any
      refs out: 2 [call: 2]
        - src/cli.ts:200: call Command.description -> external
        - src/cli.ts:200: call Command.command -> external
    420-422: any
      refs out: 2 [call: 2]
        - src/cli.ts:420: call Command.description -> external
        - src/cli.ts:420: call Command.command -> external
    571-573: any
      refs out: 2 [call: 2]
        - src/cli.ts:571: call Command.description -> external
        - src/cli.ts:571: call Command.command -> external
    958-960: any
      refs out: 2 [call: 2]
        - src/cli.ts:958: call Command.description -> external
        - src/cli.ts:958: call Command.command -> external
    1109-1111: any
      refs out: 2 [call: 2]
        - src/cli.ts:1109: call Command.description -> external
        - src/cli.ts:1109: call Command.command -> external
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
Files: 31
Estimated tokens: 15,548 (codebase: ~1,370,356)
