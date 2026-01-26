Title: Session logs missing "Retry failed" context for auto-retry failures

### Problem Description

When the agent encounters a retryable error (e.g., 503 Capacity Unavailable) and exhausts all auto-retry attempts, the interactive TUI displays a specific error message: `Retry failed after X attempts: ...`.

However, this high-level "retry failure" context is **not persisted** to the session logs (`.jsonl`). The logs only record the underlying API error (e.g., the raw 503 error message) from the final failed attempt.

This makes debugging difficult because:

1. It is impossible to distinguish between a single transient error and a persistent outage that failed after multiple retries.
2. The session log does not accurately reflect the actual execution flow (that retries were attempted and failed).

### Reproduction Steps

1. Trigger a retryable error (e.g., hit a provider rate limit or force a 503).
2. Wait for the agent to exhaust `maxRetries` (default: 3).
3. Observe the TUI displays `Error: Retry failed after 3 attempts: ...`.
4. Inspect the session log (`.pi/agent/sessions/.../*.jsonl`).
5. **Observation:** The log contains the raw error message but no record of the "Retry failed" event or attempt count.

### Expected Behavior

The session log should persist a record of the retry failure, either by:

- Wrapping the final error message with the retry context (matching the TUI output).
- Or recording a distinct system/meta event indicating that auto-retry was attempted and exhausted.

### Technical Details

- **Location:** `packages/pi-coding-agent/src/modes/interactive/interactive-mode.ts` handles the `auto_retry_end` event and calls `showError()`.
- **Cause:** `showError()` only updates the ephemeral TUI state and does not call `sessionManager` to write to the session file.
- **Affected Version:** Current `main` branch.
