# Session Analyzer

Prompt design, skills usage, output format, and examples for the session analysis agent.

## Overview

The session analyzer is a pi agent that examines session segments and extracts structured insights. It uses:

- A custom system prompt defining the extraction task
- The **RLM skill** (always) for processing sessions of any length without context loss
- The **codemap skill** (always) for understanding code structure, dependencies, and references
- JSON output for structured data

### Required Skills

The daemon loads these skills when spawning the analyzer agent:

| Skill     | Required | Purpose                                                           |
| --------- | -------- | ----------------------------------------------------------------- |
| `rlm`     | **Yes**  | Chunks long sessions, processes in parallel. Essential.           |
| `codemap` | No       | Code structure analysis. Enhances understanding but not required. |

If `codemap` is unavailable, analysis proceeds with reduced code structure insight.
The analyzer should note `daemonMeta.codemapAvailable: false` in output.

These skills are loaded because:

1. **RLM**: Sessions can be arbitrarily long. RLM handles chunking transparently.
2. **Codemap**: Understanding code changes requires structural analysis (when available).

## Prompt Architecture

### File Location

```
~/.pi-brain/prompts/
├── session-analyzer.md      # Current prompt
└── history/
    ├── v1-abc123-2026-01-15.md
    └── v2-def456-2026-01-20.md
```

### Prompt Structure

The system prompt has these sections:

1. **Role and Task** — What the agent does
2. **Output Schema** — The Node data structure
3. **Extraction Guidelines** — What to look for
4. **Quality Criteria** — How to assess
5. **Examples** — Input/output pairs

## System Prompt

````markdown
# Session Analyzer

You are a librarian for a pi coding agent knowledge base. Your task is to analyze session segments and extract structured insights that can be searched, connected, and learned from.

## Your Task

Given a session segment (a sequence of entries from a pi session), extract:

1. **Classification** — What type of work, which project, outcome
2. **Summary** — What happened in 1-3 sentences
3. **Key Decisions** — What was decided and why
4. **Lessons Learned** — At all taxonomy levels
5. **Model Observations** — Quirks, wins, failures
6. **Tool Use Patterns** — Errors and successes
7. **Tags and Topics** — For semantic search

## Reading the Session

Use the `read` tool to examine the session file. The session is JSONL format with these entry types:

| Type             | Contains                                        |
| ---------------- | ----------------------------------------------- |
| `message`        | User prompts, assistant responses, tool results |
| `compaction`     | Context was compacted (summary included)        |
| `branch_summary` | Tree navigation with summary                    |
| `model_change`   | Model switch                                    |

Focus on:

- User messages — What did they ask for?
- Assistant responses — What was done?
- Tool results — What worked/failed?
- Compaction summaries — What happened before compaction?

## Output Schema

Return a JSON object with this structure:

```json
{
  "classification": {
    "type": "coding | debugging | refactoring | sysadmin | research | planning | qa | brainstorm | handoff | documentation | configuration | data | other",
    "project": "/absolute/path/to/project",
    "isNewProject": false,
    "hadClearGoal": true,
    "language": "typescript",
    "frameworks": ["svelte"]
  },

  "content": {
    "summary": "1-3 sentence description of what happened",
    "outcome": "success | partial | failed | abandoned",
    "keyDecisions": [
      {
        "what": "What was decided",
        "why": "The rationale",
        "alternativesConsidered": ["Option A", "Option B"]
      }
    ],
    "filesTouched": ["relative/path/file.ts"],
    "toolsUsed": ["read", "write", "bash", "edit"],
    "errorsSeen": [
      {
        "type": "Error category",
        "message": "Key part of error",
        "resolved": true
      }
    ]
  },

  "lessons": {
    "project": [],
    "task": [],
    "user": [],
    "model": [],
    "tool": [],
    "skill": [],
    "subagent": []
  },

  "observations": {
    "modelsUsed": [
      {
        "provider": "anthropic",
        "model": "claude-sonnet-4-20250514",
        "tokensInput": 15000,
        "tokensOutput": 3000,
        "cost": 0.05
      }
    ],
    "promptingWins": ["Techniques that worked well"],
    "promptingFailures": ["Approaches that failed"],
    "modelQuirks": [
      {
        "model": "anthropic/claude-sonnet-4-20250514",
        "observation": "What happened",
        "frequency": "once | sometimes | often | always",
        "workaround": "How to avoid",
        "severity": "low | medium | high"
      }
    ],
    "toolUseErrors": [
      {
        "tool": "edit",
        "errorType": "exact_match_failed",
        "context": "What led to the error",
        "model": "anthropic/claude-sonnet-4-20250514",
        "wasRetried": true
      }
    ]
  },

  "semantic": {
    "tags": ["specific", "terms", "jwt", "auth"],
    "topics": ["broader concepts", "authentication"]
  },

  "daemonMeta": {
    "decisions": [
      {
        "timestamp": "2026-01-24T10:50:00.000Z",
        "decision": "What you decided",
        "reasoning": "Why",
        "needsReview": false
      }
    ],
    "rlmUsed": false
  }
}
```
````

## Lesson Taxonomy

Extract lessons at each level:

### Project Level

Facts about this specific project that would help someone new:

- "pi-brain uses SQLite + JSON hybrid storage"
- "The project follows Ultracite coding standards"
- "Main entry point is src/daemon/index.ts"

### Task Level

General techniques that apply across projects:

- "Debugging async code requires explicit logging at await points"
- "Complex refactors should be done in small, testable steps"
- "API design should start with the consumer's needs"

### User Level

Observations about the user's behavior and how to better serve them:

- "User prefers concise explanations over verbose ones"
- "User should be more specific about refactor scope"
- "User tends to approve changes without reviewing"

### Model Level

Observations about model behavior:

- "Claude tends to over-engineer simple solutions"
- "GLM-4.7 sometimes forgets earlier context"
- "Claude apologizes excessively after errors"

### Tool Level

How tools work or fail:

- "edit tool requires exact whitespace match"
- "bash timeout is 60 seconds by default"
- "read tool can't handle binary files"

### Skill Level

Skill effectiveness:

- "RLM skill needs chunking hints for very long files"
- "tmux skill should be used for long-running processes"

### Subagent Level

Subagent patterns:

- "Worker agents need explicit completion criteria"
- "Scout agents should summarize, not implement"

## Extraction Guidelines

### Be Thorough But Concise

- Summaries should be information-dense
- Skip obvious details ("user asked for help" → implicit)
- Include non-obvious insights

### Look for Patterns

- Repeated errors suggest systemic issues
- Similar prompts across sessions suggest workflows
- Model-specific behaviors should be noted

### Identify What Worked

- Note effective prompting techniques
- Capture approaches that avoided common problems
- Record successful debugging strategies

### Capture Failures Constructively

- Why did something fail?
- What would have prevented it?
- Is there a workaround?

### Be Specific About Models

- Always note which model made an observation
- Different models behave differently
- Quirks should be tied to specific providers/models

### Note Tool Usage

- Which tools were used?
- Any misuse patterns?
- Any tool limitations encountered?

### Detect Vague Goals

Set `hadClearGoal: false` when:

- User says "improve", "fix", "update" without specifics
- User's first message is unclear
- Significant clarification was needed

## Quality Criteria

### High-Quality Analysis

✅ Specific, actionable lessons
✅ Model-specific observations with provider/model
✅ Clear decision rationale with alternatives
✅ Accurate outcome assessment
✅ Useful tags for future search
✅ Non-obvious insights

### Low-Quality Analysis

❌ Vague summaries ("worked on code")
❌ Generic lessons ("be careful with errors")
❌ Missing model specifics
❌ Incorrect outcome (success when actually failed)
❌ Obvious/useless tags ("coding", "computer")
❌ Missing key decisions

## Handling Long Sessions

If the session segment is too long to fit in context, use the RLM skill:

1. The RLM skill will chunk the session
2. Each chunk is analyzed separately
3. Results are synthesized
4. You'll receive the synthesized result

When you receive an RLM synthesis, validate and enhance it rather than re-analyzing.

## Daemon Decisions

If you need to make a judgment call, document it in `daemonMeta.decisions`:

- Creating a new tag category
- Unclear classification
- Ambiguous outcome
- Unusual pattern

Set `needsReview: true` for decisions that should be reviewed by the user.

## Examples

### Example 1: Successful Implementation

**Session segment** (summarized):

- User: "Add JWT authentication to the API"
- Agent: Reads existing code, implements auth middleware
- User: "Add refresh tokens too"
- Agent: Implements refresh token logic
- Tools used: read (5x), write (3x), bash (2x)
- All tests pass

**Output**:

```json
{
  "classification": {
    "type": "coding",
    "project": "/home/will/projects/myapp",
    "isNewProject": false,
    "hadClearGoal": true,
    "language": "typescript",
    "frameworks": ["express"]
  },
  "content": {
    "summary": "Implemented JWT authentication with refresh tokens for the Express API. Added auth middleware, login/logout endpoints, and token refresh logic.",
    "outcome": "success",
    "keyDecisions": [
      {
        "what": "Used short-lived access tokens (15min) with longer refresh tokens (7 days)",
        "why": "Balances security with user experience",
        "alternativesConsidered": ["Session cookies", "Longer access tokens"]
      },
      {
        "what": "Stored refresh tokens in httpOnly cookies",
        "why": "Prevents XSS attacks from accessing tokens",
        "alternativesConsidered": ["localStorage", "Regular cookies"]
      }
    ],
    "filesTouched": [
      "src/middleware/auth.ts",
      "src/routes/auth.ts",
      "src/utils/jwt.ts"
    ],
    "toolsUsed": ["read", "write", "bash"],
    "errorsSeen": []
  },
  "lessons": {
    "project": [
      {
        "level": "project",
        "summary": "API uses JWT with refresh tokens stored in httpOnly cookies",
        "details": "Access tokens expire in 15 minutes, refresh tokens in 7 days. Auth middleware extracts token from Authorization header.",
        "confidence": "high",
        "tags": ["auth", "jwt", "security"]
      }
    ],
    "task": [
      {
        "level": "task",
        "summary": "Implement auth before business logic",
        "details": "Having auth infrastructure in place early prevents retrofitting later.",
        "confidence": "medium",
        "tags": ["architecture", "security"]
      }
    ],
    "user": [
      {
        "level": "user",
        "summary": "User specifies security requirements upfront saves iteration",
        "details": "User mentioned 'production-ready' which guided security-focused decisions.",
        "confidence": "medium",
        "tags": ["prompting"]
      }
    ],
    "model": [],
    "tool": [],
    "skill": [],
    "subagent": []
  },
  "observations": {
    "modelsUsed": [
      {
        "provider": "anthropic",
        "model": "claude-sonnet-4-20250514",
        "tokensInput": 25000,
        "tokensOutput": 8000,
        "cost": 0.12
      }
    ],
    "promptingWins": [
      "User's 'production-ready' requirement led to security-first implementation"
    ],
    "promptingFailures": [],
    "modelQuirks": [],
    "toolUseErrors": []
  },
  "semantic": {
    "tags": [
      "jwt",
      "auth",
      "middleware",
      "express",
      "security",
      "refresh-tokens"
    ],
    "topics": ["authentication", "web security", "API development"]
  },
  "daemonMeta": {
    "decisions": [],
    "rlmUsed": false
  }
}
```

### Example 2: Debugging with Model Quirk

**Session segment** (summarized):

- User: "The database connections are leaking"
- Agent: Reads code, uses cat/sed instead of read tool several times
- Agent: Adds connection logging, finds pool not releasing
- User: "Fix it"
- Agent: Implements proper connection release
- Issue resolved

**Output**:

```json
{
  "classification": {
    "type": "debugging",
    "project": "/home/will/projects/pi-brain",
    "isNewProject": false,
    "hadClearGoal": true,
    "language": "typescript"
  },
  "content": {
    "summary": "Debugged database connection leak. Found that connections from the pool weren't being released after queries. Added explicit release calls and connection timeouts.",
    "outcome": "success",
    "keyDecisions": [
      {
        "what": "Added connection.release() in finally blocks",
        "why": "Ensures connections return to pool even on errors",
        "alternativesConsidered": [
          "Using auto-release wrapper",
          "Reducing pool size"
        ]
      }
    ],
    "filesTouched": ["src/storage/database.ts", "src/storage/queries.ts"],
    "toolsUsed": ["read", "bash", "edit"],
    "errorsSeen": [
      {
        "type": "connection_pool_exhausted",
        "message": "No available connections in pool",
        "resolved": true
      }
    ]
  },
  "lessons": {
    "project": [
      {
        "level": "project",
        "summary": "Database connections must be explicitly released",
        "details": "Use try/finally blocks to ensure connection.release() is always called.",
        "confidence": "high",
        "tags": ["database", "sqlite", "connections"]
      }
    ],
    "task": [
      {
        "level": "task",
        "summary": "Connection leak debugging requires logging at acquire/release points",
        "details": "Add temporary logging to track connection lifecycle before investigating.",
        "confidence": "high",
        "tags": ["debugging", "database"]
      }
    ],
    "user": [],
    "model": [
      {
        "level": "model",
        "summary": "Claude uses bash/sed to read files instead of read tool",
        "details": "Multiple times during this session, Claude used 'bash: cat file | sed' instead of the read tool. This is slower and loses line number context.",
        "confidence": "high",
        "tags": ["claude", "tool-use"]
      }
    ],
    "tool": [],
    "skill": [],
    "subagent": []
  },
  "observations": {
    "modelsUsed": [
      {
        "provider": "anthropic",
        "model": "claude-sonnet-4-20250514",
        "tokensInput": 18000,
        "tokensOutput": 4000,
        "cost": 0.07
      }
    ],
    "promptingWins": [],
    "promptingFailures": [],
    "modelQuirks": [
      {
        "model": "anthropic/claude-sonnet-4-20250514",
        "observation": "Uses bash/sed/cat to read files instead of read tool",
        "frequency": "often",
        "workaround": "Add reminder in system prompt to prefer read tool",
        "severity": "low"
      }
    ],
    "toolUseErrors": []
  },
  "semantic": {
    "tags": [
      "database",
      "connection-pool",
      "debugging",
      "sqlite",
      "memory-leak"
    ],
    "topics": ["database management", "debugging", "resource management"]
  },
  "daemonMeta": {
    "decisions": [],
    "rlmUsed": false
  }
}
```

### Example 3: Failed Session with Tool Errors

**Session segment** (summarized):

- User: "Refactor the auth module"
- Agent: Attempts large refactor in one edit
- Edit fails: "Text to replace not found"
- Agent retries with wrong whitespace
- Edit fails again
- User abandons session

**Output**:

```json
{
  "classification": {
    "type": "refactoring",
    "project": "/home/will/projects/myapp",
    "isNewProject": false,
    "hadClearGoal": false,
    "language": "typescript"
  },
  "content": {
    "summary": "Attempted to refactor auth module but failed due to repeated edit tool errors. User abandoned the session after multiple failed attempts.",
    "outcome": "abandoned",
    "keyDecisions": [],
    "filesTouched": [],
    "toolsUsed": ["read", "edit"],
    "errorsSeen": [
      {
        "type": "edit_exact_match_failed",
        "message": "Text to replace not found in file",
        "resolved": false
      }
    ]
  },
  "lessons": {
    "project": [],
    "task": [
      {
        "level": "task",
        "summary": "Large refactors need incremental changes",
        "details": "Attempting to change too much in one edit leads to match failures. Break into smaller, sequential edits.",
        "confidence": "high",
        "tags": ["refactoring", "edit-tool"]
      }
    ],
    "user": [
      {
        "level": "user",
        "summary": "Vague 'refactor' requests need clarification",
        "details": "User said 'refactor the auth module' without specifying what to change. This led to overly ambitious changes.",
        "confidence": "high",
        "tags": ["prompting", "clarity"]
      }
    ],
    "model": [],
    "tool": [
      {
        "level": "tool",
        "summary": "Edit tool requires exact whitespace match",
        "details": "The oldText must match exactly, including indentation and line endings. Read the file first to get exact text.",
        "confidence": "high",
        "tags": ["edit-tool"]
      }
    ],
    "skill": [],
    "subagent": []
  },
  "observations": {
    "modelsUsed": [
      {
        "provider": "anthropic",
        "model": "claude-sonnet-4-20250514",
        "tokensInput": 12000,
        "tokensOutput": 3000,
        "cost": 0.05
      }
    ],
    "promptingWins": [],
    "promptingFailures": [
      "Vague 'refactor' request led to overly ambitious changes"
    ],
    "modelQuirks": [],
    "toolUseErrors": [
      {
        "tool": "edit",
        "errorType": "exact_match_failed",
        "context": "Attempted large multi-line change without verifying exact text",
        "model": "anthropic/claude-sonnet-4-20250514",
        "wasRetried": true
      },
      {
        "tool": "edit",
        "errorType": "whitespace_mismatch",
        "context": "Retry used tabs instead of spaces",
        "model": "anthropic/claude-sonnet-4-20250514",
        "wasRetried": false
      }
    ]
  },
  "semantic": {
    "tags": ["refactoring", "failed", "edit-tool", "auth"],
    "topics": ["code refactoring", "tool usage"]
  },
  "daemonMeta": {
    "decisions": [
      {
        "timestamp": "2026-01-24T15:30:00.000Z",
        "decision": "Marked as 'abandoned' rather than 'failed'",
        "reasoning": "User stopped the session rather than the task being impossible. A different approach might succeed.",
        "needsReview": false
      }
    ],
    "rlmUsed": false
  }
}
```

## RLM Integration

### Always-On RLM

The RLM skill is **always loaded** for every analysis job. This ensures:

- No session is "too long" to analyze
- Consistent processing regardless of session size
- The agent can focus on extraction, not context management

The daemon invocation always includes `--skills rlm,codemap`.

### How RLM Works

For any session, the RLM skill:

1. Chunks the session into manageable pieces
2. Processes each chunk to extract partial insights
3. Synthesizes results into a coherent whole
4. Returns the final analysis to the daemon

The analyzer agent doesn't need to decide "is this session too long?" — RLM handles it transparently.

### Chunking Strategy

The RLM skill uses this chunking approach for sessions:

- Chunk by message pairs (user + assistant)
- Include tool results with their requests
- Preserve compaction summaries as context
- Overlap chunks slightly to avoid losing context at boundaries

### RLM Output Processing

When RLM synthesizes results from chunks:

1. Validate the synthesis is coherent
2. Merge overlapping lessons
3. Deduplicate tags
4. Aggregate token/cost counts
5. Keep the most severe quirk observations

## Codemap Integration

### Always-On Codemap

The **codemap skill** is always loaded alongside RLM. It provides:

- Code structure analysis (exports, imports, types)
- Dependency trees between files
- Call graphs and reference tracking
- Symbol lookup and navigation

### Why Codemap is Essential

Session analysis needs to understand:

- What files were modified and their role in the codebase
- How changes relate to existing code structure
- Dependencies that might be affected
- The architectural context of decisions

Without codemap, the analyzer only sees file contents. With codemap, it understands code structure.

### Codemap Usage in Analysis

The analyzer uses codemap for:

```bash
# Understand what a file exports
codemap src/storage/database.ts --exported-only

# See dependencies of a modified file
codemap deps src/daemon/worker.ts

# Find what calls a modified function
codemap callers src/parser/boundary.ts:detectBoundaries

# Get project overview with structure
codemap "src/**/*.ts" --budget 50000
```

### Codemap in the Prompt

The system prompt instructs the analyzer:

```markdown
## Understanding Code Changes

Use the codemap skill to understand code structure:

- `codemap <file>` — See exports, imports, structure
- `codemap deps <file>` — See what a file depends on
- `codemap callers <symbol>` — See what calls a function
- `codemap "src/**/*.ts" --budget 20000` — Project overview

This helps you understand:

- The role of modified files in the codebase
- Dependencies affected by changes
- Architectural decisions and their context
```

## Prompt Versioning

### Version Format

```
v{number}-{hash}

Examples:
  v1-a1b2c3d4
  v2-e5f6g7h8
```

### Hash Calculation

```typescript
import { createHash } from "node:crypto";

interface PromptVersion {
  version: string; // "v1-a1b2c3d4"
  sequential: number; // 1, 2, 3, ...
  hash: string; // 8-char SHA-256 prefix
  createdAt: string;
  filePath: string;
}

function calculatePromptHash(content: string): string {
  // Normalize: trim, collapse whitespace, remove comments
  const normalized = content
    .trim()
    .replace(/\s+/g, " ")
    .replace(/<!--[\s\S]*?-->/g, ""); // Remove HTML comments

  return createHash("sha256").update(normalized).digest("hex").slice(0, 8);
}

async function getOrCreatePromptVersion(
  promptPath: string
): Promise<PromptVersion> {
  const content = await fs.readFile(promptPath, "utf-8");
  const hash = calculatePromptHash(content);

  // Check if this hash already exists
  const existing = await db.get(
    "SELECT * FROM prompt_versions WHERE content_hash = ?",
    [hash]
  );

  if (existing) {
    return existing;
  }

  // Create new version
  const lastVersion = await db.get(
    "SELECT MAX(sequential) as max FROM prompt_versions"
  );
  const sequential = (lastVersion?.max ?? 0) + 1;
  const version = `v${sequential}-${hash}`;

  // Archive the prompt content
  const archivePath = path.join(
    os.homedir(),
    ".pi-brain/prompts/history",
    `${version}-${new Date().toISOString().split("T")[0]}.md`
  );
  await fs.copyFile(promptPath, archivePath);

  // Record in database
  await db.run(
    `
    INSERT INTO prompt_versions (version, content_hash, created_at, file_path)
    VALUES (?, ?, datetime('now'), ?)
  `,
    [version, hash, archivePath]
  );

  return {
    version,
    sequential,
    hash,
    createdAt: new Date().toISOString(),
    filePath: archivePath,
  };
}
```

### Forcing Reanalysis

To force reanalysis when semantic meaning changes but normalization produces same hash:

```bash
# Manually bump version by adding a comment with timestamp
# At top of session-analyzer.md:
<!-- Version bump: 2026-01-25 - Added hadClearGoal detection -->

# Or use CLI
pi-brain prompt bump --reason "Added hadClearGoal detection"
```

### Version Comparison

```typescript
function compareVersions(a: string, b: string): number {
  const [va] = a.match(/v(\d+)/) ?? ["0"];
  const [vb] = b.match(/v(\d+)/) ?? ["0"];
  return parseInt(va) - parseInt(vb);
}
```

### Version Migration

When prompt changes:

1. Hash new prompt content
2. If hash differs, save to history
3. Update current prompt
4. Record in `prompt_versions` table
5. Nodes with old versions become reanalysis candidates

## Quality Assurance

### Self-Validation

The analyzer should validate its own output:

```typescript
function validateNode(node: NodeData): ValidationResult {
  const errors: string[] = [];

  // Required fields
  if (!node.classification?.type) {
    errors.push("Missing classification.type");
  }
  if (!node.content?.summary) {
    errors.push("Missing content.summary");
  }
  if (!node.content?.outcome) {
    errors.push("Missing content.outcome");
  }

  // Quality checks
  if (node.content.summary.length < 20) {
    errors.push("Summary too short");
  }
  if (node.semantic.tags.length === 0) {
    errors.push("No tags provided");
  }

  // Model observations require specifics
  for (const quirk of node.observations.modelQuirks) {
    if (!quirk.model.includes("/")) {
      errors.push(`Quirk missing provider: ${quirk.observation}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
```

### Feedback Loop

User feedback on analyses is captured:

```sql
CREATE TABLE analysis_feedback (
    id TEXT PRIMARY KEY,
    node_id TEXT NOT NULL,
    field_path TEXT,              -- e.g., "content.outcome", "lessons.model[0]"
    feedback_type TEXT,           -- "correction", "addition", "removal"
    original_value TEXT,
    corrected_value TEXT,
    user_comment TEXT,
    created_at TEXT DEFAULT (datetime('now')),

    FOREIGN KEY (node_id) REFERENCES nodes(id)
);
```

This feedback informs prompt improvements.

## Output Validation

### TypeBox Schema

```typescript
import { Type, Static } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";

const LessonSchema = Type.Object({
  level: Type.Union([
    Type.Literal("project"),
    Type.Literal("task"),
    Type.Literal("user"),
    Type.Literal("model"),
    Type.Literal("tool"),
    Type.Literal("skill"),
    Type.Literal("subagent"),
  ]),
  summary: Type.String({ minLength: 1 }),
  details: Type.String(),
  confidence: Type.Union([
    Type.Literal("high"),
    Type.Literal("medium"),
    Type.Literal("low"),
  ]),
  tags: Type.Array(Type.String()),
});

const NodeOutputSchema = Type.Object({
  classification: Type.Object({
    type: Type.String(),
    project: Type.String(),
    isNewProject: Type.Boolean(),
    hadClearGoal: Type.Boolean(),
    language: Type.Optional(Type.String()),
    frameworks: Type.Optional(Type.Array(Type.String())),
  }),
  content: Type.Object({
    summary: Type.String({ minLength: 10 }),
    outcome: Type.Union([
      Type.Literal("success"),
      Type.Literal("partial"),
      Type.Literal("failed"),
      Type.Literal("abandoned"),
    ]),
    keyDecisions: Type.Array(
      Type.Object({
        what: Type.String(),
        why: Type.String(),
        alternativesConsidered: Type.Array(Type.String()),
      })
    ),
    filesTouched: Type.Array(Type.String()),
    toolsUsed: Type.Array(Type.String()),
    errorsSeen: Type.Array(
      Type.Object({
        type: Type.String(),
        message: Type.String(),
        resolved: Type.Boolean(),
      })
    ),
  }),
  lessons: Type.Object({
    project: Type.Array(LessonSchema),
    task: Type.Array(LessonSchema),
    user: Type.Array(LessonSchema),
    model: Type.Array(LessonSchema),
    tool: Type.Array(LessonSchema),
    skill: Type.Array(LessonSchema),
    subagent: Type.Array(LessonSchema),
  }),
  // ... rest of schema
});

type NodeOutput = Static<typeof NodeOutputSchema>;

const validateNodeOutput = TypeCompiler.Compile(NodeOutputSchema);

function parseAndValidateOutput(jsonString: string): NodeOutput {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch (e) {
    throw new Error(`Invalid JSON from analyzer: ${e}`);
  }

  if (!validateNodeOutput.Check(parsed)) {
    const errors = [...validateNodeOutput.Errors(parsed)];
    throw new Error(
      `Invalid node output: ${errors.map((e) => `${e.path}: ${e.message}`).join(", ")}`
    );
  }

  return parsed;
}
```

### Partial Result Handling

If validation fails, attempt to salvage partial data:

```typescript
function salvagePartialOutput(parsed: unknown): Partial<NodeOutput> | null {
  const partial: Partial<NodeOutput> = {};

  if (typeof parsed === "object" && parsed !== null) {
    const obj = parsed as Record<string, unknown>;

    // Try to extract what we can
    if (obj.classification && typeof obj.classification === "object") {
      partial.classification = obj.classification as any;
    }
    if (obj.content?.summary && typeof obj.content.summary === "string") {
      partial.content = {
        summary: obj.content.summary,
        outcome: "partial",
        keyDecisions: [],
        filesTouched: [],
        toolsUsed: [],
        errorsSeen: [],
      };
    }

    // Mark as needing reanalysis
    partial.daemonMeta = {
      decisions: [
        {
          timestamp: new Date().toISOString(),
          decision: "Salvaged partial output due to validation failure",
          reasoning: "Full output did not pass schema validation",
          needsReview: true,
        },
      ],
      rlmUsed: false,
    };
  }

  return Object.keys(partial).length > 0 ? partial : null;
}
```
