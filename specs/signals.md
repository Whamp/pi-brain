# Signals & Insights Specification

System for detecting user friction, delight, and behavioral patterns to enable recursive self-improvement.

## Overview

The Signals system moves beyond simple "success/failure" metrics to understand the _quality_ and _feel_ of an interaction. It detects:

1.  **Friction**: When the user is struggling (rephrasing, abandoning tasks, fighting context).
2.  **Delight**: When the system performs exceptionally well (resilient recovery).
3.  **Patterns**: Bespoke user behaviors and model quirks discovered via clustering.
4.  **Manual Flags**: User-explicit signals about noteworthy events.

These signals feed into the **Prompt Learning** pipeline to generate model-specific improvements.

## 1. Friction & Delight Signals

Signals are extracted during the session analysis phase (by the `session-analyzer`).

### Friction Signals

| Signal                 | Detection Logic                                                                            | Significance                                                      |
| :--------------------- | :----------------------------------------------------------------------------------------- | :---------------------------------------------------------------- |
| **Rephrasing Cascade** | 3+ consecutive user messages without a tool call or meaningful assistant response.         | Indicates the model isn't understanding the intent.               |
| **Abandoned Restart**  | Node outcome is `abandoned`, followed within 30 mins by a new node on the same task/files. | User gave up and started over (frustration signature).            |
| **Context Churn**      | High frequency of `read` / `ls` on different files, or adding/removing files from context. | User is fighting the context window or can't find relevant files. |
| **Silent Termination** | Session ends mid-task (no handoff, no success) and is not resumed.                         | User walked away in frustration.                                  |
| **Model Switch**       | Same task attempted with Model A, then immediately retried with Model B.                   | Model A failed to handle the task.                                |
| **Tool Loop**          | Same tool call fails with the same error 3+ times in a segment.                            | Model is stuck in an error loop.                                  |

### Delight Signals

| Signal                 | Detection Logic                                                                            | Significance                   |
| :--------------------- | :----------------------------------------------------------------------------------------- | :----------------------------- |
| **Resilient Recovery** | Tool error occurs, but the model fixes it _without_ user intervention, leading to success. | Builds trust; model is robust. |
| **One-Shot Success**   | Complex task (multiple steps) completed with 0 user corrections/rephrasings.               | High-efficiency interaction.   |
| **Explicit Praise**    | User says "great job", "perfect", "thanks", etc.                                           | Explicit user satisfaction.    |

### Data Model

Added to the `Node` interface:

```typescript
interface NodeSignals {
  friction: {
    score: number; // 0.0 - 1.0 (calculated based on signals)
    rephrasingCount: number;
    contextChurnCount: number;
    abandonedRestart: boolean;
    toolLoopCount: number;
    modelSwitchFrom?: string; // If this node is a switch FROM another model
  };
  delight: {
    score: number; // 0.0 - 1.0
    resilientRecovery: boolean;
    oneShotSuccess: boolean;
    explicitPraise: boolean;
  };
  manualFlags: ManualFlag[];
}

interface ManualFlag {
  type: "quirk" | "failure" | "win" | "note";
  message: string;
  timestamp: string;
}
```

## 2. Manual Notation

Allows the user to explicitly flag events during a session without disrupting the flow.

### Syntax

The user invokes a specific command in the `pi` agent.

**Command:** `/brain --flag <type> <message>`

**Flag Types:**

| Type    | Use For                                    |
| ------- | ------------------------------------------ |
| `quirk` | Model-specific behaviors worth remembering |
| `fail`  | Approaches that didn't work (and why)      |
| `win`   | Techniques that worked exceptionally well  |
| `note`  | General observations for future reference  |

**Formats:**

- `--flag <type> <message>` - Standard form
- `-f <type> <message>` - Short form
- `--flag:<type> <message>` - Colon syntax
- `-f:<type> <message>` - Short colon syntax

**Examples:**

```
/brain --flag quirk gemini-3-pro hates markdown in descriptions
/brain --flag fail This caching approach caused race conditions
/brain --flag win One-shot implementation with clear spec worked perfectly
/brain -f note Remember to check edge cases
/brain -f:win Perfect first try
```

### Implementation

1.  **Pi Extension**: A `brain` extension registers the `/brain` command.
2.  **Handling**:
    - The command parses the flags.
    - It writes a `CustomEntry` to the session file with type `brain_flag`.
    - It shows a brief notification confirming the flag was recorded (via `ctx.ui.notify`), without injecting a message into the agent conversation.
3.  **Analysis**: The `session-analyzer` reads these `brain_flag` entries and adds them to `node.signals.manualFlags`.

## 3. Facet Discovery (Clustering)

Discover new patterns by clustering node content.

### Workflow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Analyzed   │───▶│  Embed      │───▶│  Cluster    │───▶│  Analyze    │
│   Nodes     │    │  Summaries  │    │  (HDBSCAN)  │    │  Clusters   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                                │
                                                                ▼
                                                         ┌─────────────┐
                                                         │  News Feed  │
                                                         │  (Web UI)   │
                                                         └─────────────┘
```

### Steps

1.  **Embedding**:
    - Use a local embedding model (e.g., `nomic-embed-text` via Ollama or similar lightweight model).
    - Embed `node.content.summary` + `node.classification.type`.
2.  **Clustering**:
    - Run a clustering algorithm (Hybrid: Hierarchical + Density-based like HDBSCAN).
    - Group nodes into clusters.
3.  **Analysis (LLM)**:
    - For each cluster, select 5 representative nodes.
    - Send to LLM: "What do these sessions have in common? Name this pattern."
    - Output: `ClusterName` (e.g., "Gemini Large File Struggles") and `Description`.
4.  **Presentation**:
    - Surface in the **Dashboard News Feed**.
    - User can "Confirm" (add as a permanent tag/lesson) or "Dismiss".

## 4. Model-Specific AGENTS.md

Workflow for generating tailored `AGENTS.md` files for different models.

### Hybrid Workflow

1.  **Passive Collection**:
    - Signals and Manual Flags are aggregated by model (Phase 8).
    - Stored in `aggregated_insights` table (from `prompt-learning.md` spec).

2.  **On-Demand Generation**:
    - User Command: `/brain generate agents.md for gemini-3-pro`
    - Process:
      - Fetch all high-confidence insights (quirks, wins, tool errors) for `gemini-3-pro`.
      - Fetch all `friction` clusters associated with this model.
      - LLM Task: "Write an AGENTS.md that addresses these specific issues and exploits these strengths."
      - Output: A markdown file content.

3.  **Conventions**:
    - Pi doesn't support dynamic `AGENTS.md` switching yet.
    - We establish a convention: `~/.pi/agent/contexts/<model-id>.md` (or similar).
    - Future: Extension to auto-load this context when model changes.
