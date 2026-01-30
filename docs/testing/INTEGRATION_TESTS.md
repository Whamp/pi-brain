# Integration Tests

This document describes the integration tests in pi-brain and their requirements.

## brain-integration.test.ts

Location: `src/integration/brain-integration.test.ts`

These tests verify the full integration chain for the brain query system:

1. Extension registration (brain-query extension)
2. API endpoints (`/api/v1/query`)
3. Query processor (searches nodes, invokes pi agent)
4. Response formatting

### Skipped Tests

4 tests are skipped by default because they require LLM API keys:

| Test                                                       | Description                                     |
| ---------------------------------------------------------- | ----------------------------------------------- |
| `should find nodes matching query text`                    | Tests semantic search and agent query synthesis |
| `should include model quirks in context for model queries` | Tests model quirk retrieval in query context    |
| `should include tool errors in context for tool queries`   | Tests tool error patterns in query context      |
| `should filter by project context`                         | Tests project-scoped queries                    |

### Required Environment Variables

To run these tests, set the following environment variables:

```bash
# Enable integration tests
export INTEGRATION_TESTS=1

# At least one LLM provider must be configured
# Option 1: Anthropic (Claude)
export ANTHROPIC_API_KEY=your-key-here

# Option 2: OpenRouter (supports multiple models)
export OPENROUTER_API_KEY=your-key-here

# Option 3: Google AI (Gemini)
export GOOGLE_API_KEY=your-key-here
```

### Running Integration Tests

```bash
# Run all tests including integration tests
INTEGRATION_TESTS=1 npm test -- --run

# Run only brain integration tests
INTEGRATION_TESTS=1 npm test -- --run -t "brain integration"
```

### Timeout Configuration

Integration tests have a 60-second timeout (`INTEGRATION_TIMEOUT = 60_000`) because:

- Agent queries invoke LLM APIs
- Network latency varies
- Token generation takes time

### Test That Always Runs

The test `should return empty result message when no nodes exist` runs without API keys because it tests the graceful fallback behavior when no matching nodes are found.
