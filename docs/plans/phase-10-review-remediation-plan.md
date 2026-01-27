# Phase 10 Remediation Plan: Closing the Prompt Learning Loop

**Status**: Draft
**Date**: 2026-01-27
**Target**: Phase 10 Completion

## 1. Executive Summary

The Prompt Learning Pipeline (Phase 10) implementation currently suffers from a "fire and forget" architecture. While it successfully generates and injects prompt additions, it fails to record these deployment events in the database. This causes two critical issues:

1.  **Empty Dashboard**: The UI displays "No prompt text generated yet" because `aggregated_insights.prompt_text` is never populated.
2.  **Broken Measurement**: The effectiveness measurement system relies on a default 7-day lookback because it lacks the actual deployment timestamp (`prompt_version`), rendering "learning" metrics inaccurate for recently injected prompts.

This plan outlines the steps to close this feedback loop, ensuring `pi-brain` remembers its interventions and can accurately measure their impact.

## 2. Problem Analysis

| Issue           | Current Behavior                                                                  | Required Behavior                                                                                                        |
| --------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Persistence** | `prompt-injector.ts` generates text and writes to disk, but DB remains unchanged. | After writing to disk, `prompt-injector.ts` must call `updateInsightPromptTexts` to save the text and version to the DB. |
| **Versioning**  | No `prompt_version` is created or tracked during injection.                       | A unique version ID (hash or timestamp) must be generated for each injection and stored on the insights.                 |
| **Measurement** | `measureEffectiveness` falls back to "7 days ago" if version is missing.          | Measurement should strictly require a valid version timestamp or return "insufficient data" to avoid misleading metrics. |
| **Agent Gen**   | `agents-generator.ts` creates `AGENTS.md` files but updates no records.           | (Optional) Model-specific agent generation should also flag insights as "deployed" in the DB.                            |

## 3. Implementation Plan

### Task 1: Wire up Persistence in `prompt-injector.ts`

Modify `src/prompt/prompt-injector.ts` to update the database when injection succeeds.

- **Changes**:
  - Import `updateInsightPromptTexts` from `./prompt-generator.js`.
  - In `writeBrainInsightsSkill`:
    - Generate a version ID (e.g., `v-{timestamp}`).
    - After `fs.writeFileSync`, call `updateInsightPromptTexts(db, additions, versionId)`.
    - Create a record in `prompt_versions` table (needs migration/verification if table exists or just usage of `prompt_version` column).
  - In `updateAgentsFile`:
    - Similar logic: update DB after file write.

### Task 2: Strict Effectiveness Measurement

Modify `src/prompt/effectiveness.ts` to remove the hardcoded fallback.

- **Changes**:
  - In `measureAndStoreEffectiveness`, if `promptVersion` is not found or invalid, throw error or return skipped status.
  - Remove `DEFAULT_SPLIT_DAYS` usage in `scheduler.ts` or make it explicit that it's a fallback only for legacy/manual items.

### Task 3: Enable Insight Editing (API Side)

Allow users to refine the auto-generated prompt text.

- **Changes**:
  - Add `PUT /api/prompt-learning/insights/:id` endpoint.
  - Handler should update `aggregated_insights.prompt_text`.
  - Note: This text will be overwritten on next injection _unless_ we add a "lock" flag. For now, simple update is sufficient, assuming re-generation might overwrite.

### Task 4: Verify Dashboard Data Flow

Ensure the UI correctly reflects the state.

- **Verification**:
  - Run `pi-brain prompt-learning inject`.
  - Check `aggregated_insights` table for populated `prompt_text` and `prompt_version`.
  - Refresh Dashboard: "No prompt text generated yet" should be replaced by the actual text.

## 4. Technical Details

### `updateInsightPromptTexts` Usage

The function already exists in `src/prompt/prompt-generator.ts` but is unused.

```typescript
export function updateInsightPromptTexts(
  db: Database.Database,
  additions: PromptAddition[],
  promptVersion?: string
): void {
  // ... existing implementation ...
}
```

We need to ensure it sets `prompt_included = 1` and updates `updated_at`.

### Versioning Strategy

We will use a simple timestamp-based version string: `v-YYYYMMDD-HHMMSS`.

## 5. Deployment Steps

1. **Apply Code Changes**: Implement changes in `prompt-injector.ts` and `effectiveness.ts`.
2. **Run Test Injection**: Execute `pi-brain prompt-learning inject --dry-run` (if available) or just run it.
3. **Verify DB**: `sqlite3 ~/.pi-brain/data/brain.db "select prompt_text from aggregated_insights where prompt_included=1 limit 1;"`
4. **Restart Daemon**: Ensure scheduler picks up new versioning logic.
