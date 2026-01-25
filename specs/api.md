# API Specification

HTTP and WebSocket APIs for web UI, CLI queries, and external integrations.

## Overview

The API server provides:

- **HTTP REST API** — CRUD operations, queries, daemon control
- **WebSocket** — Real-time updates, streaming queries
- **Query endpoint** — Natural language queries via pi agent

## Server Configuration

```yaml
# ~/.pi-brain/config.yaml
api:
  port: 8765
  host: "127.0.0.1" # localhost only by default
  cors_origins: # CORS origins for development
    - "http://localhost:5173" # Vite dev server
    - "http://localhost:3000" # Alternative dev port
    - "http://127.0.0.1:5173"
  auth_enabled: false # API key auth (future)
  rate_limit:
    requests_per_minute: 60
    burst: 10
```

### CORS Configuration

```typescript
import cors from "@fastify/cors";

// Development CORS setup
if (process.env.NODE_ENV === "development") {
  await app.register(cors, {
    origin: ["http://localhost:5173", "http://localhost:3000"],
    credentials: true,
  });
}

// Production: no CORS needed (same origin)
```

## Base URL

```
http://localhost:8765/api/v1
```

## Authentication

Currently unauthenticated (localhost only). Future:

```http
Authorization: Bearer <api-key>
```

## Response Format

### Success Response

```json
{
  "status": "success",
  "data": { ... },
  "meta": {
    "timestamp": "2026-01-24T10:00:00.000Z",
    "duration_ms": 42
  }
}
```

### Error Response

```json
{
  "status": "error",
  "error": {
    "code": "NOT_FOUND",
    "message": "Node not found",
    "details": { ... }
  },
  "meta": {
    "timestamp": "2026-01-24T10:00:00.000Z"
  }
}
```

### Error Codes

| Code                  | HTTP Status | Description                |
| --------------------- | ----------- | -------------------------- |
| `BAD_REQUEST`         | 400         | Invalid request parameters |
| `NOT_FOUND`           | 404         | Resource not found         |
| `CONFLICT`            | 409         | Resource conflict          |
| `RATE_LIMITED`        | 429         | Too many requests          |
| `INTERNAL_ERROR`      | 500         | Server error               |
| `SERVICE_UNAVAILABLE` | 503         | Daemon not running         |

## Nodes API

### List Nodes

```http
GET /api/v1/nodes
```

**Query Parameters:**

| Parameter  | Type     | Description                            |
| ---------- | -------- | -------------------------------------- |
| `project`  | string   | Filter by project path (partial match) |
| `type`     | string   | Filter by node type                    |
| `outcome`  | string   | Filter by outcome                      |
| `from`     | string   | Start date (ISO 8601)                  |
| `to`       | string   | End date (ISO 8601)                    |
| `tags`     | string[] | Filter by tags (comma-separated)       |
| `computer` | string   | Filter by source computer              |
| `limit`    | number   | Max results (default: 50, max: 500)    |
| `offset`   | number   | Pagination offset                      |
| `sort`     | string   | Sort field (default: "timestamp")      |
| `order`    | string   | Sort order: "asc" or "desc"            |

**Response:**

```json
{
  "status": "success",
  "data": {
    "nodes": [
      {
        "id": "a1b2c3d4",
        "version": 1,
        "classification": {
          "type": "coding",
          "project": "/home/will/projects/pi-brain"
        },
        "content": {
          "summary": "Implemented SQLite storage layer...",
          "outcome": "success"
        },
        "metadata": {
          "timestamp": "2026-01-24T10:00:00.000Z",
          "tokensUsed": 18000,
          "cost": 0.0
        },
        "semantic": {
          "tags": ["storage", "sqlite"]
        }
      }
    ],
    "total": 150,
    "limit": 50,
    "offset": 0
  }
}
```

### Get Node

```http
GET /api/v1/nodes/:id
```

**Query Parameters:**

| Parameter | Type     | Description                        |
| --------- | -------- | ---------------------------------- |
| `version` | number   | Specific version (default: latest) |
| `include` | string[] | Related data to include            |

**Include options:** `edges`, `lessons`, `quirks`, `errors`, `versions`, `full`

**Response:**

```json
{
  "status": "success",
  "data": {
    "node": {
      "id": "a1b2c3d4",
      "version": 2,
      "previousVersions": ["a1b2c3d4-v1"],
      "source": { ... },
      "classification": { ... },
      "content": { ... },
      "lessons": { ... },
      "observations": { ... },
      "metadata": { ... },
      "semantic": { ... },
      "daemonMeta": { ... }
    },
    "edges": [
      {
        "id": "edge-123",
        "type": "branch",
        "direction": "incoming",
        "connectedNodeId": "b2c3d4e5"
      }
    ],
    "versions": [
      { "version": 1, "analyzedAt": "2026-01-24T10:00:00.000Z" },
      { "version": 2, "analyzedAt": "2026-01-25T02:00:00.000Z" }
    ]
  }
}
```

### Get Node Diff

```http
GET /api/v1/nodes/:id/diff
```

**Query Parameters:**

| Parameter | Type   | Description                      |
| --------- | ------ | -------------------------------- |
| `from`    | number | From version (default: previous) |
| `to`      | number | To version (default: current)    |

**Response:**

```json
{
  "status": "success",
  "data": {
    "nodeId": "a1b2c3d4",
    "fromVersion": 1,
    "toVersion": 2,
    "changes": [
      {
        "path": "content.summary",
        "type": "changed",
        "oldValue": "Old summary...",
        "newValue": "Updated summary..."
      },
      {
        "path": "lessons.model",
        "type": "added",
        "newValue": [{ "level": "model", ... }]
      }
    ]
  }
}
```

### Get Connected Nodes

```http
GET /api/v1/nodes/:id/connected
```

**Query Parameters:**

| Parameter   | Type     | Description                          |
| ----------- | -------- | ------------------------------------ |
| `depth`     | number   | Traversal depth (default: 1, max: 5) |
| `direction` | string   | "incoming", "outgoing", "both"       |
| `edgeTypes` | string[] | Filter by edge types                 |

**Response:**

```json
{
  "status": "success",
  "data": {
    "rootNodeId": "a1b2c3d4",
    "nodes": [
      { "id": "b2c3d4e5", ... },
      { "id": "c3d4e5f6", ... }
    ],
    "edges": [
      { "source": "a1b2c3d4", "target": "b2c3d4e5", "type": "branch" },
      { "source": "b2c3d4e5", "target": "c3d4e5f6", "type": "continuation" }
    ]
  }
}
```

## Edges API

### List Edges

```http
GET /api/v1/edges
```

**Query Parameters:**

| Parameter   | Type   | Description              |
| ----------- | ------ | ------------------------ |
| `nodeId`    | string | Filter by connected node |
| `type`      | string | Filter by edge type      |
| `createdBy` | string | Filter by creator        |
| `limit`     | number | Max results              |
| `offset`    | number | Pagination offset        |

### Create Edge

```http
POST /api/v1/edges
```

**Request:**

```json
{
  "sourceNodeId": "a1b2c3d4",
  "targetNodeId": "b2c3d4e5",
  "type": "semantic",
  "metadata": {
    "similarity": 0.85,
    "reason": "Both implement authentication"
  }
}
```

### Delete Edge

```http
DELETE /api/v1/edges/:id
```

## Lessons API

### List Lessons

```http
GET /api/v1/lessons
```

**Query Parameters:**

| Parameter    | Type     | Description              |
| ------------ | -------- | ------------------------ |
| `level`      | string   | Filter by level          |
| `project`    | string   | Filter by source project |
| `tags`       | string[] | Filter by tags           |
| `confidence` | string   | Minimum confidence       |
| `limit`      | number   | Max results              |
| `offset`     | number   | Pagination offset        |

**Response:**

```json
{
  "status": "success",
  "data": {
    "lessons": [
      {
        "id": "lesson-123",
        "nodeId": "a1b2c3d4",
        "level": "model",
        "summary": "Claude uses sed instead of read tool",
        "details": "...",
        "confidence": "high",
        "tags": ["claude", "tool-use"],
        "sourceProject": "/home/will/projects/pi-brain",
        "createdAt": "2026-01-24T10:00:00.000Z"
      }
    ],
    "total": 45
  }
}
```

### Get Lessons by Level

```http
GET /api/v1/lessons/by-level
```

**Response:**

```json
{
  "status": "success",
  "data": {
    "project": { "count": 120, "recent": [...] },
    "task": { "count": 85, "recent": [...] },
    "user": { "count": 42, "recent": [...] },
    "model": { "count": 67, "recent": [...] },
    "tool": { "count": 31, "recent": [...] },
    "skill": { "count": 12, "recent": [...] },
    "subagent": { "count": 8, "recent": [...] }
  }
}
```

## Model Observations API

### List Model Quirks

```http
GET /api/v1/quirks
```

**Query Parameters:**

| Parameter   | Type   | Description                                                 |
| ----------- | ------ | ----------------------------------------------------------- |
| `model`     | string | Filter by model (e.g., "google-antigravity/gemini-3-flash") |
| `severity`  | string | Minimum severity                                            |
| `frequency` | string | Minimum frequency                                           |

**Response:**

```json
{
  "status": "success",
  "data": {
    "quirks": [
      {
        "id": "quirk-123",
        "model": "google-antigravity/gemini-3-flash",
        "observation": "Uses sed to read files instead of read tool",
        "frequency": "often",
        "severity": "low",
        "workaround": "Add reminder in system prompt",
        "occurrences": 15,
        "nodeIds": ["a1b2c3d4", "b2c3d4e5"]
      }
    ]
  }
}
```

### List Tool Errors

```http
GET /api/v1/tool-errors
```

**Query Parameters:**

| Parameter   | Type   | Description          |
| ----------- | ------ | -------------------- |
| `tool`      | string | Filter by tool       |
| `model`     | string | Filter by model      |
| `errorType` | string | Filter by error type |

**Response:**

```json
{
  "status": "success",
  "data": {
    "errors": [
      {
        "tool": "edit",
        "errorType": "exact_match_failed",
        "count": 47,
        "models": ["google-antigravity/gemini-3-flash", "zai/glm-4.7"],
        "recentNodes": ["a1b2c3d4", "b2c3d4e5"]
      }
    ]
  }
}
```

## Search API

### Full-Text Search

```http
GET /api/v1/search
```

**Query Parameters:**

| Parameter | Type     | Description                                         |
| --------- | -------- | --------------------------------------------------- |
| `q`       | string   | Search query                                        |
| `fields`  | string[] | Fields to search: "summary", "lessons", "decisions" |
| `filters` | object   | Additional filters (same as list nodes)             |
| `limit`   | number   | Max results                                         |

**Response:**

```json
{
  "status": "success",
  "data": {
    "results": [
      {
        "nodeId": "a1b2c3d4",
        "score": 0.92,
        "highlights": [
          {
            "field": "content.summary",
            "snippet": "...implemented <mark>JWT authentication</mark>..."
          }
        ],
        "node": { ... }
      }
    ],
    "total": 12
  }
}
```

### Structured Search

```http
POST /api/v1/search
```

**Request:**

```json
{
  "query": {
    "must": [
      { "field": "classification.type", "value": "coding" },
      { "field": "semantic.tags", "contains": "auth" }
    ],
    "should": [{ "field": "content.summary", "match": "authentication" }],
    "mustNot": [{ "field": "content.outcome", "value": "failed" }]
  },
  "sort": [{ "field": "metadata.timestamp", "order": "desc" }],
  "limit": 20
}
```

## Query API

### Natural Language Query

```http
POST /api/v1/query
```

Ask questions in natural language. Uses a pi agent to search and answer.

**Request:**

```json
{
  "query": "Why did authentication fail last month?",
  "context": {
    "project": "/home/will/projects/myapp"
  },
  "options": {
    "maxNodes": 10,
    "includeDetails": true
  }
}
```

**Response:**

```json
{
  "status": "success",
  "data": {
    "answer": "Authentication failures last month were primarily due to...",
    "summary": "Found 3 relevant sessions with auth failures",
    "relatedNodes": [
      {
        "id": "a1b2c3d4",
        "relevance": 0.95,
        "summary": "Failed JWT implementation..."
      }
    ],
    "sources": [
      {
        "nodeId": "a1b2c3d4",
        "excerpt": "Token validation was missing expiry check..."
      }
    ]
  }
}
```

## Stats API

### Dashboard Stats

```http
GET /api/v1/stats
```

**Response:**

```json
{
  "status": "success",
  "data": {
    "totals": {
      "nodes": 847,
      "edges": 1234,
      "lessons": 456,
      "sessions": 312
    },
    "recent": {
      "nodesThisWeek": 42,
      "sessionsToday": 5
    },
    "usage": {
      "totalTokens": 2500000,
      "totalCost": 12.45,
      "byModel": {
        "google-antigravity/gemini-3-flash": {
          "tokens": 1500000,
          "cost": 8.5
        },
        "zai/glm-4.7": { "tokens": 1000000, "cost": 0.0 }
      }
    },
    "outcomes": {
      "success": 650,
      "partial": 120,
      "failed": 50,
      "abandoned": 27
    },
    "topProjects": [
      { "project": "/home/will/projects/pi-brain", "nodeCount": 150 },
      { "project": "/home/will/projects/webapp", "nodeCount": 89 }
    ],
    "trends": {
      "vagueGoals": {
        "thisWeek": 0.15,
        "lastWeek": 0.22,
        "change": -0.07
      }
    }
  }
}
```

### Model Stats

```http
GET /api/v1/stats/models
```

**Response:**

```json
{
  "status": "success",
  "data": {
    "models": [
      {
        "model": "google-antigravity/gemini-3-flash",
        "totalTokens": 1500000,
        "totalCost": 8.5,
        "sessionCount": 200,
        "quirkCount": 12,
        "errorCount": 47,
        "avgTokensPerSession": 7500,
        "lastUsed": "2026-01-24T10:00:00.000Z"
      }
    ]
  }
}
```

### Tool Error Stats

```http
GET /api/v1/stats/tool-errors
```

**Response:**

```json
{
  "status": "success",
  "data": {
    "byTool": [
      {
        "tool": "edit",
        "count": 47,
        "models": ["google-antigravity/gemini-3-flash"]
      },
      { "tool": "bash", "count": 12, "models": ["zai/glm-4.7"] }
    ],
    "byModel": [
      { "model": "google-antigravity/gemini-3-flash", "count": 52 },
      { "model": "zai/glm-4.7", "count": 8 }
    ],
    "trends": {
      "thisWeek": 15,
      "lastWeek": 22,
      "change": -7
    }
  }
}
```

## Daemon API

### Daemon Status

```http
GET /api/v1/daemon/status
```

**Response:**

```json
{
  "status": "success",
  "data": {
    "running": true,
    "pid": 12345,
    "uptime": 86400,
    "workers": {
      "total": 2,
      "active": 1,
      "idle": 1
    },
    "queue": {
      "pending": 12,
      "running": 1,
      "completedToday": 45,
      "failedToday": 2
    },
    "lastAnalysis": "2026-01-24T10:30:00.000Z",
    "nextScheduled": {
      "reanalysis": "2026-01-25T02:00:00.000Z",
      "connectionDiscovery": "2026-01-25T03:00:00.000Z"
    }
  }
}
```

### Queue Status

```http
GET /api/v1/daemon/queue
```

**Query Parameters:**

| Parameter | Type   | Description      |
| --------- | ------ | ---------------- |
| `status`  | string | Filter by status |
| `limit`   | number | Max results      |

**Response:**

```json
{
  "status": "success",
  "data": {
    "jobs": [
      {
        "id": "job-123",
        "type": "initial",
        "status": "running",
        "sessionFile": "...sessions/.../2026-01-24....jsonl",
        "queuedAt": "2026-01-24T10:00:00.000Z",
        "startedAt": "2026-01-24T10:05:00.000Z",
        "workerId": "worker-0"
      }
    ],
    "stats": {
      "pending": 12,
      "running": 1,
      "completed": 45,
      "failed": 2
    }
  }
}
```

### Trigger Analysis

```http
POST /api/v1/daemon/analyze
```

**Request:**

```json
{
  "sessionFile": "/path/to/session.jsonl",
  "segmentStart": "entry-abc",
  "segmentEnd": "entry-xyz",
  "priority": 10
}
```

### Trigger Nightly Job

```http
POST /api/v1/daemon/run-nightly
```

## WebSocket API

### Connection

```javascript
const ws = new WebSocket("ws://localhost:8765/ws");

ws.onopen = () => {
  // Subscribe to events
  ws.send(
    JSON.stringify({
      type: "subscribe",
      channels: ["daemon", "analysis", "queue"],
    })
  );
};
```

### Event Types

#### Daemon Status Update

```json
{
  "type": "daemon.status",
  "data": {
    "workers": { "active": 1, "idle": 1 },
    "queue": { "pending": 12 }
  },
  "timestamp": "2026-01-24T10:00:00.000Z"
}
```

#### Analysis Started

```json
{
  "type": "analysis.started",
  "data": {
    "jobId": "job-123",
    "sessionFile": "...",
    "workerId": "worker-0"
  },
  "timestamp": "2026-01-24T10:00:00.000Z"
}
```

#### Analysis Completed

```json
{
  "type": "analysis.completed",
  "data": {
    "jobId": "job-123",
    "nodeId": "a1b2c3d4",
    "summary": "Implemented SQLite storage..."
  },
  "timestamp": "2026-01-24T10:05:00.000Z"
}
```

#### Analysis Failed

```json
{
  "type": "analysis.failed",
  "data": {
    "jobId": "job-123",
    "error": "Agent timeout",
    "willRetry": true
  },
  "timestamp": "2026-01-24T10:05:00.000Z"
}
```

#### Node Created

```json
{
  "type": "node.created",
  "data": {
    "nodeId": "a1b2c3d4",
    "project": "/home/will/projects/pi-brain",
    "type": "coding",
    "summary": "..."
  },
  "timestamp": "2026-01-24T10:05:00.000Z"
}
```

### Streaming Query

For long-running queries, use streaming:

```javascript
ws.send(
  JSON.stringify({
    type: "query",
    id: "query-123",
    query: "Why did auth fail?",
  })
);

// Receive streaming updates
// { type: 'query.progress', id: 'query-123', data: { status: 'searching' } }
// { type: 'query.progress', id: 'query-123', data: { found: 3 } }
// { type: 'query.result', id: 'query-123', data: { answer: '...' } }
```

## Rate Limiting

### Limits

| Endpoint Pattern        | Rate Limit |
| ----------------------- | ---------- |
| `GET /api/v1/*`         | 60 req/min |
| `POST /api/v1/query`    | 10 req/min |
| `POST /api/v1/daemon/*` | 5 req/min  |
| WebSocket messages      | 30 msg/min |

### Implementation

Using `@fastify/rate-limit` with in-memory storage:

```typescript
import rateLimit from "@fastify/rate-limit";

await app.register(rateLimit, {
  global: true,
  max: 60, // Default: 60 requests
  timeWindow: "1 minute",

  // Per-route overrides
  keyGenerator: (request) => {
    // Rate limit by IP (localhost allowed higher limits)
    const ip = request.ip;
    return ip === "127.0.0.1" ? "localhost" : ip;
  },

  // Custom error response
  errorResponseBuilder: (request, context) => ({
    status: "error",
    error: {
      code: "RATE_LIMITED",
      message: "Too many requests",
      details: {
        retryAfter: Math.ceil(context.ttl / 1000),
      },
    },
  }),
});

// Route-specific limits
app.post(
  "/api/v1/query",
  {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: "1 minute",
      },
    },
  },
  queryHandler
);

app.post(
  "/api/v1/daemon/*",
  {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: "1 minute",
      },
    },
  },
  daemonHandler
);
```

### Rate Limit Scoping

| Scope     | Limit         | Rationale                |
| --------- | ------------- | ------------------------ |
| localhost | 10x normal    | Local development        |
| Per-IP    | Normal limits | Standard protection      |
| WebSocket | 30 msg/min    | Prevent message flooding |

### Persistence (Future)

For multi-process deployments, use Redis:

```typescript
import Redis from "ioredis";

await app.register(rateLimit, {
  redis: new Redis(),
  // ... same config
});
```

### Rate Limit Headers

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1706101200
```

### Rate Limited Response

```json
{
  "status": "error",
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests",
    "details": {
      "retryAfter": 30
    }
  }
}
```

## Implementation

### Server Setup

```typescript
import Fastify from "fastify";
import websocket from "@fastify/websocket";

const app = Fastify({ logger: true });

await app.register(websocket);

// Routes
app.register(nodesRoutes, { prefix: "/api/v1/nodes" });
app.register(edgesRoutes, { prefix: "/api/v1/edges" });
app.register(lessonsRoutes, { prefix: "/api/v1/lessons" });
app.register(searchRoutes, { prefix: "/api/v1/search" });
app.register(queryRoutes, { prefix: "/api/v1/query" });
app.register(statsRoutes, { prefix: "/api/v1/stats" });
app.register(daemonRoutes, { prefix: "/api/v1/daemon" });

// WebSocket
app.register(async (fastify) => {
  fastify.get("/ws", { websocket: true }, (socket, req) => {
    handleWebSocket(socket);
  });
});

await app.listen({ port: config.api.port, host: config.api.host });
```

### Request Validation

```typescript
import { Type } from "@sinclair/typebox";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";

const ListNodesSchema = {
  querystring: Type.Object({
    project: Type.Optional(Type.String()),
    type: Type.Optional(Type.String()),
    limit: Type.Optional(Type.Number({ minimum: 1, maximum: 500 })),
    offset: Type.Optional(Type.Number({ minimum: 0 })),
  }),
  response: {
    200: Type.Object({
      status: Type.Literal("success"),
      data: Type.Object({
        nodes: Type.Array(NodeSchema),
        total: Type.Number(),
        limit: Type.Number(),
        offset: Type.Number(),
      }),
    }),
  },
};

app.get("/nodes", { schema: ListNodesSchema }, async (request, reply) => {
  // Handler
});
```
