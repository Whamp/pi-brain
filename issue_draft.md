Title: Meta-events (retries, compaction, login) are visible in TUI but missing from session logs

[I will write the human introduction here explaining that I've been auditing session logs for debugging and noticed discrepancies between what I see on screen vs what is saved.]

### Problem

Several critical system events displayed in the TUI via `showError()` are not persisted to the `.jsonl` session files. This creates "ghost" errors where the user sees a failure (e.g., "Retry failed", "Compaction cancelled"), but the permanent record shows no trace of it.

This makes debugging impossible for:

1. **Auto-retry exhaustion**: The log shows the final API error but misses the context that `maxRetries` was attempted and failed.
2. **Compaction failures**: If compaction fails silently (from a log perspective), it's unclear why a session's context window blew up.
3. **Authentication errors**: Login/logout failures are ephemeral and lost on restart.

### Affected Areas

The `showError` method in `interactive-mode.ts` is used for these unpersisted events:

- `auto_retry_end` (Retry failed after X attempts)
- Compaction failures (Compaction cancelled/failed)
- Authentication failures (Login/logout errors)

### Proposed Solution

Modify `AgentSession` or `SessionManager` to support a `system` or `meta` event type, and update `interactive-mode.ts` to persist these events when they occur, ensuring the session log accurately reflects the session's lifecycle.

This does not add new features, but ensures the existing core features (retry, compaction) are properly auditable.
