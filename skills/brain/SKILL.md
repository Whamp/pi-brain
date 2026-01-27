---
name: brain
description: Query the pi-brain knowledge graph for past decisions, lessons learned, and patterns from previous coding sessions. Use when you need project context, want to check if similar problems were solved before, encounter known tool errors or model quirks, or are about to make architectural decisions. Triggers on - past decision, previous session, what did we decide, how did we, have we seen this, known issues, project history, lessons learned.
---

# Brain Query Skill

Query the pi-brain knowledge graph for insights from analyzed coding sessions.

## When to Use

- **Before architectural decisions**: Check what was decided before and why
- **When encountering errors**: See if this error pattern was solved before
- **Starting work on a project**: Get context from previous sessions
- **Debugging**: Find similar issues and their solutions
- **Model quirks**: Check known behaviors of the current model
- **Recording insights**: Flag model quirks, failures, or wins during sessions

## Using the Tool

The `brain_query` tool is available via the brain-query extension. Query with natural language:

```
brain_query "What authentication approach did we use in this project?"
brain_query "Have we seen this SQLite connection error before?"
brain_query "What are known quirks of Claude when using the edit tool?"
brain_query "What lessons were learned about async debugging?"
brain_query "How did we implement caching in project-x?"
```

## Manual Flags

Record observations directly into the session for later analysis using `/brain --flag`:

```
/brain --flag quirk Claude keeps using sed instead of read tool
/brain --flag fail This caching approach caused race conditions
/brain --flag win One-shot implementation with clear spec worked perfectly
/brain --flag note Remember to check edge cases for empty arrays
```

Short form:

```
/brain -f quirk Model hallucinated a non-existent API
/brain -f:win Perfect first try
```

### Flag Types

| Type    | Use For                                    |
| ------- | ------------------------------------------ |
| `quirk` | Model-specific behaviors worth remembering |
| `fail`  | Approaches that didn't work (and why)      |
| `win`   | Techniques that worked exceptionally well  |
| `note`  | General observations for future reference  |

Flags are extracted during session analysis and become part of the node's `signals.manualFlags` field.

## Query Types

| Query Type      | Example                                            |
| --------------- | -------------------------------------------------- |
| Decision lookup | "What did we decide about X in project Y?"         |
| Error patterns  | "Have we encountered this {error message} before?" |
| Model quirks    | "What quirks does {model} have with {tool/task}?"  |
| Project history | "What's the history of feature X?"                 |
| Lessons         | "What lessons about {topic} have been learned?"    |
| Techniques      | "What debugging techniques work for TypeScript?"   |

## Understanding Results

Responses include:

- **answer**: Synthesized response with specific references
- **summary**: One-sentence summary
- **confidence**: high/medium/low based on matching data
- **sources**: Node IDs and excerpts for verification

## Best Practices

1. **Query before deciding**: When facing architectural choices, check past decisions first
2. **Include context**: Mention the project or error type for better matches
3. **Check model-specific quirks**: Especially for new models or unfamiliar tools
4. **Verify confidence**: Low confidence means limited matching data - proceed with caution
5. **Follow up**: If initial results are partial, refine the query with more specifics

## When NOT to Use

- For general programming knowledge (use web search instead)
- When the task is entirely new with no prior sessions
- For real-time information (brain only contains analyzed sessions)
