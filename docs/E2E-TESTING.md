# Pi Integration E2E Testing Guide

Task 7.6: Test integration end-to-end

## Components Tested

1. **brain-query Extension** - `/brain` command and `brain_query` tool
2. **Query API** - `/api/v1/query` endpoint
3. **Query Processor** - Node search + pi agent synthesis
4. **Brain Skill** - Agent guidance for brain queries
5. **Web UI** (optional) - Dashboard, Graph, Search views

## Prerequisites

### Required

- pi installed and in PATH (`which pi`)
- Node.js and npm
- SQLite support (better-sqlite3)

### Optional (for browser E2E)

- agent-browser installed at `~/skills/web-tools-router/headless/`

## Installation Verification

### 1. Extension Installation

```bash
# Verify extension is symlinked
ls -la ~/.pi/agent/extensions/brain-query
# Should show: brain-query -> /path/to/pi-brain/extensions/brain-query

# If not installed:
ln -s /path/to/pi-brain/extensions/brain-query ~/.pi/agent/extensions/brain-query
```

### 2. Skill Installation

```bash
# Verify skill is symlinked
ls -la ~/skills/brain
# Should show: brain -> /path/to/pi-brain/skills/brain

# If not installed:
ln -s /path/to/pi-brain/skills/brain ~/skills/brain
```

### 3. Prompts Installation

```bash
# Verify prompts are installed
ls ~/.pi-brain/prompts/
# Should show: brain-query.md, session-analyzer.md

# If not installed, copy from project:
mkdir -p ~/.pi-brain/prompts
cp /path/to/pi-brain/prompts/*.md ~/.pi-brain/prompts/
```

## Automated Tests

### Run Integration Tests

```bash
cd /path/to/pi-brain
npm test -- --run src/integration/brain-integration.test.ts
```

These tests verify:

- Query endpoint with test data
- Model quirks context inclusion
- Tool errors context inclusion
- Empty result handling
- Project context filtering
- Extension registration

### Run All Tests

```bash
npm test -- --run
```

## Manual Testing

### Test 1: /brain Command

Start a pi session and test the command:

```bash
pi
# In pi, type:
/brain What decisions have been made in this project?
```

**Expected**: Notification with summary, detailed answer injected into conversation.

### Test 2: brain_query Tool

In a pi session:

```
Ask pi to use the brain_query tool to find past decisions
```

**Expected**: Pi calls brain_query tool, receives answer from knowledge graph.

### Test 3: API Direct Query

```bash
# Start API server (in one terminal)
npm run serve

# Query the API (in another terminal)
curl -X POST http://localhost:8765/api/v1/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What have I worked on recently?"}'
```

**Expected**: JSON response with answer, summary, confidence, sources.

### Test 4: Health Check

```bash
curl http://localhost:8765/api/v1/query/health
```

**Expected**: `{"status":"success","data":{"available":true,"message":"Query processing is available"}}`

## Browser E2E Testing

### Setup

```bash
# Start API server
npm run serve &

# Start web UI dev server
npm run web:dev &

# Wait for servers to start
sleep 5
```

### Run Browser Tests

```bash
./scripts/e2e-browser-test.sh
```

### Manual Browser Test

1. Open http://localhost:5173 (or the port shown by `npm run web:dev`)
2. Verify dashboard loads with stats panels
3. Navigate to /graph - verify graph visualization works
4. Navigate to /search - verify search interface works
5. Navigate to /browse - verify file browser works

## Troubleshooting

### "pi command not found"

Ensure pi is in your PATH:

```bash
which pi
# Should return path like /home/user/.local/bin/pi
```

### "Query prompt file not found"

Ensure prompts are installed:

```bash
ls ~/.pi-brain/prompts/brain-query.md
# If missing, copy from project
```

### "Extension not loading"

Check extension structure:

```bash
ls ~/.pi/agent/extensions/brain-query/
# Should contain: index.ts, package.json
```

### Query times out

- Check API server is running
- Check pi agent can spawn: `pi --help`
- Increase timeout in tests if needed

## Test Results

| Component              | Status | Notes                         |
| ---------------------- | ------ | ----------------------------- |
| Extension registration | ✅     | Command + tool registered     |
| Query API validation   | ✅     | Rejects invalid queries       |
| Query processor        | ✅     | Searches nodes, invokes agent |
| Health endpoint        | ✅     | Returns availability status   |
| Full integration       | ✅     | 7 tests passing (30s timeout) |
