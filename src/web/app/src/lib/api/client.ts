/**
 * pi-brain API client
 * Communicates with the pi-brain API server
 */

import type {
  Node,
  Edge,
  ListNodesResponse,
  SearchResult,
  DashboardStats,
  DaemonStatus,
  NodeFilters,
  DaemonDecisionEntity,
  AggregatedFailurePattern,
  AggregatedModelStats,
  AggregatedLessonPattern,
  AggregatedInsight,
  PromptEffectiveness,
  ClusterFeedResponse,
  ClusterListResponse,
  ClusterWithNodes,
  ClusterStatus,
  AbandonedRestartsResponse,
  FrictionSummary,
  SpokeConfig,
  SpokeCreateRequest,
  SpokeUpdateRequest,
} from "$lib/types";

// Use environment variable, or derive from window.location in browser
function getDefaultBaseUrl(): string {
  // Check for environment variable (SSR or build-time)
  if (import.meta.env?.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // In browser, derive from current location
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.host}/api/v1`;
  }
  // Fallback for SSR
  return "http://localhost:8765/api/v1";
}

const DEFAULT_BASE_URL = getDefaultBaseUrl();
const DEFAULT_TIMEOUT_MS = 30_000;

interface ApiResponse<T> {
  status: "success" | "error";
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    timestamp: string;
    duration_ms: number;
  };
}

interface ApiErrorOptions {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

function createApiError(options: ApiErrorOptions): Error {
  const error = new Error(options.message);
  error.name = "ApiError";
  (error as Error & { code: string; details?: Record<string, unknown> }).code =
    options.code;
  (
    error as Error & { code: string; details?: Record<string, unknown> }
  ).details = options.details;
  return error;
}

function createTimeoutError(timeoutMs: number): Error {
  const error = new Error(`Request timed out after ${timeoutMs}ms`);
  error.name = "TimeoutError";
  return error;
}

function createNetworkError(message: string): Error {
  const error = new Error(message);
  error.name = "NetworkError";
  return error;
}

function createContentTypeError(status: number, contentType: string): Error {
  const error = new Error(
    `API returned non-JSON response (${status}). Is the backend running?`
  );
  error.name = "ContentTypeError";
  (error as Error & { status: number; contentType: string }).status = status;
  (error as Error & { status: number; contentType: string }).contentType =
    contentType;
  return error;
}

function isApiError(
  error: unknown
): error is Error & { code: string; details?: Record<string, unknown> } {
  return error instanceof Error && error.name === "ApiError";
}

function isTimeoutError(error: unknown): error is Error {
  return error instanceof Error && error.name === "TimeoutError";
}

function isNetworkError(error: unknown): error is Error {
  return error instanceof Error && error.name === "NetworkError";
}

function isContentTypeError(
  error: unknown
): error is Error & { status: number; contentType: string } {
  return error instanceof Error && error.name === "ContentTypeError";
}

/**
 * Check if an error indicates the backend is unreachable
 * (network error, timeout, or non-JSON response like 404 HTML page)
 */
function isBackendOffline(error: unknown): boolean {
  return (
    isNetworkError(error) || isTimeoutError(error) || isContentTypeError(error)
  );
}

/**
 * Get a user-friendly message for API errors
 */
function getErrorMessage(error: unknown): string {
  if (isNetworkError(error)) {
    return "Cannot connect to the server. Is the backend running?";
  }
  if (isTimeoutError(error)) {
    return "Request timed out. The server may be overloaded.";
  }
  if (isContentTypeError(error)) {
    return "Backend returned an unexpected response. Is the API server running?";
  }
  if (isApiError(error)) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "An unknown error occurred";
}

function toQueryString(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) {
      continue;
    }

    if (Array.isArray(value)) {
      searchParams.set(key, value.join(","));
    } else {
      searchParams.set(key, String(value));
    }
  }

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  baseUrl: string = DEFAULT_BASE_URL,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    // Check content-type before parsing JSON
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      throw createContentTypeError(response.status, contentType);
    }

    const json: ApiResponse<T> = await response.json();

    if (json.status === "error" && json.error) {
      throw createApiError({
        code: json.error.code,
        message: json.error.message,
        details: json.error.details,
      });
    }

    return json.data as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw createTimeoutError(timeoutMs);
    }
    // Handle network errors (e.g., server unreachable)
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw createNetworkError("Unable to connect to the server");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const api = {
  // Nodes
  listNodes: (
    filters?: NodeFilters,
    options?: {
      limit?: number;
      offset?: number;
      sort?: string;
      order?: "asc" | "desc";
    }
  ) =>
    request<ListNodesResponse>(
      `/nodes${toQueryString({ ...filters, ...options })}`
    ),

  getNode: (id: string, options?: { version?: number; include?: string[] }) =>
    request<{
      node: Node;
      edges?: Edge[];
      versions?: { version: number; analyzedAt: string }[];
    }>(`/nodes/${id}${toQueryString(options ?? {})}`),

  getConnectedNodes: (
    id: string,
    depth = 1,
    direction?: "incoming" | "outgoing" | "both"
  ) =>
    request<{ rootNodeId: string; nodes: Node[]; edges: Edge[] }>(
      `/nodes/${id}/connected${toQueryString({ depth, direction })}`
    ),

  // Search
  search: (
    query: string,
    options?: {
      fields?: string[];
      limit?: number;
      offset?: number;
      filters?: NodeFilters;
    }
  ) => {
    const { filters, ...rest } = options ?? {};
    return request<{
      results: SearchResult[];
      total: number;
      limit: number;
      offset: number;
    }>(`/search${toQueryString({ q: query, ...rest, ...filters })}`);
  },

  // Stats
  getStats: () => request<DashboardStats>("/stats"),

  getToolErrorStats: () =>
    request<{
      byTool: { tool: string; count: number; models: string[] }[];
      byModel: { model: string; count: number }[];
      trends: { thisWeek: number; lastWeek: number; change: number };
    }>("/stats/tool-errors"),

  getTimeSeries: (days = 7) =>
    request<{
      data: {
        date: string;
        tokens: number;
        cost: number;
        nodes: number;
      }[];
      summary: {
        totalTokens: number;
        totalCost: number;
        totalNodes: number;
      };
    }>(`/stats/timeseries?days=${days}`),

  // Patterns
  getFailurePatterns: (options?: {
    limit?: number;
    offset?: number;
    minOccurrences?: number;
  }) =>
    request<AggregatedFailurePattern[]>(
      `/patterns/failures${toQueryString(options ?? {})}`
    ),

  getModelStats: () => request<AggregatedModelStats[]>("/patterns/models"),

  getLessonPatterns: (options?: {
    limit?: number;
    offset?: number;
    level?: string;
  }) =>
    request<AggregatedLessonPattern[]>(
      `/patterns/lessons${toQueryString(options ?? {})}`
    ),

  getAggregatedToolErrors: (
    filters?: { tool?: string; model?: string },
    options?: { limit?: number; offset?: number; groupByModel?: boolean }
  ) =>
    request<
      {
        tool: string;
        errorType: string;
        count: number;
        models?: string[];
        model?: string;
        recentNodes: string[];
        learningOpportunity?: string;
      }[]
    >(`/tool-errors/aggregated${toQueryString({ ...filters, ...options })}`),

  // Daemon
  getDaemonStatus: () => request<DaemonStatus>("/daemon/status"),

  getQueueStatus: (status?: string, limit?: number) =>
    request<{
      jobs: {
        id: string;
        type: string;
        status: string;
        sessionFile: string;
        queuedAt: string;
        startedAt?: string;
      }[];
      stats: {
        pending: number;
        running: number;
        completed: number;
        failed: number;
      };
    }>(`/daemon/queue${toQueryString({ status, limit })}`),

  triggerAnalysis: (sessionFile: string, priority?: number) =>
    request<{ jobId: string }>("/daemon/analyze", {
      method: "POST",
      body: JSON.stringify({ sessionFile, priority }),
    }),

  getDecisions: (
    filters?: {
      decision?: string;
      project?: string;
      from?: string;
      to?: string;
    },
    options?: { limit?: number; offset?: number }
  ) =>
    request<{
      decisions: DaemonDecisionEntity[];
      total: number;
      limit: number;
      offset: number;
    }>(`/decisions${toQueryString({ ...filters, ...options })}`),

  updateDecisionFeedback: (id: string, feedback: string | null) =>
    request<{ id: string; feedback: string | null; updated: boolean }>(
      `/decisions/${id}/feedback`,
      {
        method: "POST",
        body: JSON.stringify({ feedback }),
      }
    ),

  // Query (natural language)
  query: (query: string, context?: { project?: string }) =>
    request<{ answer: string; summary: string; relatedNodes: Node[] }>(
      "/query",
      {
        method: "POST",
        body: JSON.stringify({ query, context }),
      }
    ),

  // Sessions (file browser)
  getProjects: () =>
    request<{
      projects: {
        project: string;
        sessionCount: number;
        nodeCount: number;
        lastActivity: string;
      }[];
      total: number;
    }>("/sessions/projects"),

  getSessionsByProject: (
    project: string,
    options?: { limit?: number; offset?: number }
  ) =>
    request<{
      project: string;
      sessions: {
        sessionFile: string;
        nodeCount: number;
        firstTimestamp: string;
        lastTimestamp: string;
        outcomes: {
          success: number;
          partial: number;
          failed: number;
          abandoned: number;
        };
        types: string[];
        totalTokens: number;
        totalCost: number;
      }[];
      total: number;
      limit: number;
      offset: number;
    }>(`/sessions/list${toQueryString({ project, ...options })}`),

  getNodesBySession: (
    sessionFile: string,
    options?: { limit?: number; offset?: number }
  ) =>
    request<{
      sessionFile: string;
      project: string;
      nodes: Node[];
      total: number;
      limit: number;
      offset: number;
    }>(`/sessions/nodes${toQueryString({ sessionFile, ...options })}`),

  // Configuration
  getDaemonConfig: () =>
    request<{
      provider: string;
      model: string;
      idleTimeoutMinutes: number;
      parallelWorkers: number;
      maxRetries: number;
      retryDelaySeconds: number;
      analysisTimeoutMinutes: number;
      maxConcurrentAnalysis: number;
      maxQueueSize: number;
      backfillLimit: number;
      reanalysisLimit: number;
      connectionDiscoveryLimit: number;
      connectionDiscoveryLookbackDays: number;
      connectionDiscoveryCooldownHours: number;
      semanticSearchThreshold: number;
      // Embedding fields
      embeddingProvider: string;
      embeddingModel: string;
      hasApiKey: boolean;
      embeddingBaseUrl: string | null;
      embeddingDimensions: number | null;
      // Schedule fields
      reanalysisSchedule: string;
      connectionDiscoverySchedule: string;
      patternAggregationSchedule: string;
      clusteringSchedule: string;
      backfillEmbeddingsSchedule: string;
      defaults: {
        provider: string;
        model: string;
        embeddingProvider: string;
        embeddingModel: string;
        reanalysisSchedule: string;
        connectionDiscoverySchedule: string;
        patternAggregationSchedule: string;
        clusteringSchedule: string;
        backfillEmbeddingsSchedule: string;
      };
    }>("/config/daemon"),

  updateDaemonConfig: (config: {
    provider?: string;
    model?: string;
    idleTimeoutMinutes?: number;
    parallelWorkers?: number;
    maxRetries?: number;
    retryDelaySeconds?: number;
    analysisTimeoutMinutes?: number;
    maxConcurrentAnalysis?: number;
    maxQueueSize?: number;
    backfillLimit?: number;
    reanalysisLimit?: number;
    connectionDiscoveryLimit?: number;
    connectionDiscoveryLookbackDays?: number;
    connectionDiscoveryCooldownHours?: number;
    semanticSearchThreshold?: number;
    // Embedding fields
    embeddingProvider?: string;
    embeddingModel?: string;
    embeddingApiKey?: string | null;
    embeddingBaseUrl?: string | null;
    embeddingDimensions?: number | null;
    // Schedule fields
    reanalysisSchedule?: string;
    connectionDiscoverySchedule?: string;
    patternAggregationSchedule?: string;
    clusteringSchedule?: string;
    backfillEmbeddingsSchedule?: string;
  }) =>
    request<{
      provider: string;
      model: string;
      idleTimeoutMinutes: number;
      parallelWorkers: number;
      maxRetries: number;
      retryDelaySeconds: number;
      analysisTimeoutMinutes: number;
      maxConcurrentAnalysis: number;
      maxQueueSize: number;
      backfillLimit: number;
      reanalysisLimit: number;
      connectionDiscoveryLimit: number;
      connectionDiscoveryLookbackDays: number;
      connectionDiscoveryCooldownHours: number;
      semanticSearchThreshold: number;
      // Embedding fields
      embeddingProvider: string;
      embeddingModel: string;
      hasApiKey: boolean;
      embeddingBaseUrl: string | null;
      embeddingDimensions: number | null;
      // Schedule fields
      reanalysisSchedule: string;
      connectionDiscoverySchedule: string;
      patternAggregationSchedule: string;
      clusteringSchedule: string;
      backfillEmbeddingsSchedule: string;
      message: string;
    }>("/config/daemon", {
      method: "PUT",
      body: JSON.stringify(config),
    }),

  getProviders: () =>
    request<{
      providers: {
        id: string;
        name: string;
        models: string[];
      }[];
    }>("/config/providers"),

  // Query Configuration
  getQueryConfig: () =>
    request<{
      provider: string;
      model: string;
      defaults: { provider: string; model: string };
    }>("/config/query"),

  updateQueryConfig: (config: { provider?: string; model?: string }) =>
    request<{
      provider: string;
      model: string;
      message: string;
    }>("/config/query", {
      method: "PUT",
      body: JSON.stringify(config),
    }),

  // API Configuration
  getApiConfig: () =>
    request<{
      port: number;
      host: string;
      corsOrigins: string[];
      defaults: {
        port: number;
        host: string;
        corsOrigins: string[];
      };
    }>("/config/api"),

  updateApiConfig: (config: {
    port?: number;
    host?: string;
    corsOrigins?: string[];
  }) =>
    request<{
      port: number;
      host: string;
      corsOrigins: string[];
      message: string;
    }>("/config/api", {
      method: "PUT",
      body: JSON.stringify(config),
    }),

  // Hub Configuration
  getHubConfig: () =>
    request<{
      sessionsDir: string;
      databaseDir: string;
      webUiPort: number;
      defaults: {
        sessionsDir: string;
        databaseDir: string;
        webUiPort: number;
      };
    }>("/config/hub"),

  updateHubConfig: (config: {
    sessionsDir?: string;
    databaseDir?: string;
    webUiPort?: number;
  }) =>
    request<{
      sessionsDir: string;
      databaseDir: string;
      webUiPort: number;
      message: string;
    }>("/config/hub", {
      method: "PUT",
      body: JSON.stringify(config),
    }),

  // Prompt Learning
  getPromptInsights: (options?: {
    limit?: number;
    offset?: number;
    model?: string;
    promptIncluded?: boolean;
  }) =>
    request<
      (AggregatedInsight & {
        latestEffectiveness: PromptEffectiveness | null;
      })[]
    >(`/prompt-learning/insights${toQueryString(options ?? {})}`),

  getInsightHistory: (insightId: string) =>
    request<PromptEffectiveness[]>(`/prompt-learning/history/${insightId}`),

  toggleInsight: (insightId: string, enabled: boolean) =>
    request<{ success: boolean }>(`/prompt-learning/toggle/${insightId}`, {
      method: "POST",
      body: JSON.stringify({ enabled }),
    }),

  // Clusters
  getClusterFeed: (limit?: number) =>
    request<ClusterFeedResponse>(
      `/clusters/feed${toQueryString({ limit: limit ?? 10 })}`
    ),

  getClusters: (options?: {
    status?: ClusterStatus;
    signalType?: "friction" | "delight" | null;
    limit?: number;
    offset?: number;
    includeNodes?: boolean;
  }) =>
    request<ClusterListResponse>(`/clusters${toQueryString(options ?? {})}`),

  getCluster: (id: string) =>
    request<{ cluster: ClusterWithNodes }>(`/clusters/${id}`),

  updateClusterStatus: (id: string, status: "confirmed" | "dismissed") =>
    request<{ id: string; status: string; updatedAt: string }>(
      `/clusters/${id}/status`,
      {
        method: "POST",
        body: JSON.stringify({ status }),
      }
    ),

  // Signals (friction/delight patterns)
  getAbandonedRestarts: (options?: { limit?: number; offset?: number }) =>
    request<AbandonedRestartsResponse>(
      `/signals/abandoned-restarts${toQueryString(options ?? {})}`
    ),

  getFrictionSummary: () =>
    request<FrictionSummary>("/signals/friction-summary"),

  // Spokes Configuration
  getSpokes: () =>
    request<{
      spokes: SpokeConfig[];
    }>("/config/spokes"),

  createSpoke: (spoke: SpokeCreateRequest) =>
    request<{
      spoke: SpokeConfig;
      message: string;
    }>("/config/spokes", {
      method: "POST",
      body: JSON.stringify(spoke),
    }),

  updateSpoke: (name: string, updates: SpokeUpdateRequest) =>
    request<{
      spoke: SpokeConfig;
      message: string;
    }>(`/config/spokes/${encodeURIComponent(name)}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    }),

  deleteSpoke: (name: string) =>
    request<{
      message: string;
    }>(`/config/spokes/${encodeURIComponent(name)}`, {
      method: "DELETE",
    }),
};

export {
  createApiError,
  createTimeoutError,
  createNetworkError,
  createContentTypeError,
  isApiError,
  isTimeoutError,
  isNetworkError,
  isContentTypeError,
  isBackendOffline,
  getErrorMessage,
};
