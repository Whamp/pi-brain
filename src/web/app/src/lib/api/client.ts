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
} from "$lib/types";

const DEFAULT_BASE_URL = "http://localhost:8765/api/v1";

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

class ApiError extends Error {
  code: string;
  details?: Record<string, unknown>;

  constructor(
    code: string,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.details = details;
  }
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
  baseUrl: string = DEFAULT_BASE_URL
): Promise<T> {
  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const json: ApiResponse<T> = await response.json();

  if (json.status === "error" && json.error) {
    throw new ApiError(json.error.code, json.error.message, json.error.details);
  }

  return json.data as T;
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

  // Query (natural language)
  query: (query: string, context?: { project?: string }) =>
    request<{ answer: string; summary: string; relatedNodes: Node[] }>(
      "/query",
      {
        method: "POST",
        body: JSON.stringify({ query, context }),
      }
    ),
};

export { ApiError };
