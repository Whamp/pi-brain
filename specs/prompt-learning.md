# Prompt Learning

Systematic prompt improvement pipeline for learning from session analysis insights.

## Overview

Prompt learning closes the feedback loop between session analysis and future model behavior. By aggregating lessons about model quirks, tool use patterns, and prompting techniques, we can automatically improve system prompts.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          Prompt Learning Pipeline                               │
└─────────────────────────────────────────────────────────────────────────────────┘

 ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐
 │  Analyzed   │───▶│  Aggregate  │───▶│  Generate   │───▶│  Inject into       │
 │   Nodes     │    │  Insights   │    │  Prompts    │    │  Future Sessions   │
 └─────────────┘    └─────────────┘    └─────────────┘    └─────────────────────┘
       │                  │                  │                      │
       │                  │                  │                      │
       ▼                  ▼                  ▼                      ▼
 ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐
 │ - Quirks    │    │ - Patterns  │    │ - Model-    │    │ - System prompt    │
 │ - Wins      │    │ - Frequency │    │   specific  │    │   additions        │
 │ - Failures  │    │ - Severity  │    │   sections  │    │ - Skill hints      │
 │ - Tool errs │    │ - Confidence│    │ - Guidelines│    │ - User reminders   │
 └─────────────┘    └─────────────┘    └─────────────┘    └─────────────────────┘
```

## Insight Aggregation

### Data Sources

Insights come from analyzed nodes:

| Source             | Field                            | Example                                            |
| ------------------ | -------------------------------- | -------------------------------------------------- |
| Model quirks       | `observations.modelQuirks`       | "Claude uses sed instead of read tool"             |
| Prompting wins     | `observations.promptingWins`     | "Specifying 'production-ready' led to better code" |
| Prompting failures | `observations.promptingFailures` | "Vague 'refactor' request caused confusion"        |
| Tool errors        | `observations.toolUseErrors`     | "Edit failed due to whitespace mismatch"           |
| Model lessons      | `lessons.model`                  | "GLM-4.7 forgets context after compaction"         |
| Tool lessons       | `lessons.tool`                   | "Always use read tool before edit"                 |
| User lessons       | `lessons.user`                   | "Be specific about refactor scope"                 |

### Aggregation Algorithm

```typescript
interface AggregatedInsight {
  id: string;
  type: "quirk" | "win" | "failure" | "tool_error" | "lesson";
  model?: string; // provider/model
  tool?: string;
  pattern: string; // Normalized description
  frequency: number; // How often observed
  confidence: number; // 0.0 - 1.0
  severity: "low" | "medium" | "high";
  workaround?: string;
  examples: string[]; // Node IDs
  firstSeen: string;
  lastSeen: string;
}

async function aggregateInsights(): Promise<AggregatedInsight[]> {
  const insights = new Map<string, AggregatedInsight>();

  // Fetch all relevant data
  const quirks = await db.all("SELECT * FROM model_quirks");
  const toolErrors = await db.all("SELECT * FROM tool_errors");
  const lessons = await db.all(`
    SELECT * FROM lessons 
    WHERE level IN ('model', 'tool', 'user')
  `);

  // Aggregate quirks by model + observation
  for (const quirk of quirks) {
    const key = `quirk:${quirk.model}:${normalizePattern(quirk.observation)}`;

    if (insights.has(key)) {
      const existing = insights.get(key)!;
      existing.frequency++;
      existing.examples.push(quirk.node_id);
      existing.lastSeen = max(existing.lastSeen, quirk.created_at);
    } else {
      insights.set(key, {
        id: key,
        type: "quirk",
        model: quirk.model,
        pattern: quirk.observation,
        frequency: 1,
        confidence: frequencyToConfidence(quirk.frequency),
        severity: quirk.severity ?? "low",
        workaround: quirk.workaround,
        examples: [quirk.node_id],
        firstSeen: quirk.created_at,
        lastSeen: quirk.created_at,
      });
    }
  }

  // Similar aggregation for tool errors and lessons...

  return Array.from(insights.values())
    .filter((i) => i.frequency >= 2) // Only patterns seen multiple times
    .sort((a, b) => b.frequency - a.frequency);
}

function normalizePattern(text: string): string {
  // Normalize to canonical form for grouping
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function frequencyToConfidence(freq: string): number {
  switch (freq) {
    case "always":
      return 0.95;
    case "often":
      return 0.75;
    case "sometimes":
      return 0.5;
    case "once":
      return 0.25;
    default:
      return 0.5;
  }
}
```

### Storage

```sql
-- Aggregated insights table (updated by nightly job)
CREATE TABLE aggregated_insights (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    model TEXT,
    tool TEXT,
    pattern TEXT NOT NULL,
    frequency INTEGER DEFAULT 1,
    confidence REAL,
    severity TEXT,
    workaround TEXT,
    examples TEXT,                  -- JSON array of node IDs
    first_seen TEXT,
    last_seen TEXT,

    -- Prompt generation
    prompt_text TEXT,               -- Generated prompt addition
    prompt_included BOOLEAN DEFAULT FALSE,
    prompt_version TEXT,            -- Which prompt version includes this

    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_insights_model ON aggregated_insights(model);
CREATE INDEX idx_insights_type ON aggregated_insights(type);
CREATE INDEX idx_insights_frequency ON aggregated_insights(frequency DESC);
```

## Prompt Generation

### Model-Specific Sections

Generate prompt additions tailored to each model:

```typescript
interface PromptAddition {
  model: string;
  section: string;
  priority: number; // Order in prompt
  content: string;
  sourceInsights: string[]; // Insight IDs
}

async function generatePromptAdditions(
  insights: AggregatedInsight[]
): Promise<PromptAddition[]> {
  const additions: PromptAddition[] = [];

  // Group insights by model
  const byModel = groupBy(
    insights.filter((i) => i.model),
    (i) => i.model
  );

  for (const [model, modelInsights] of Object.entries(byModel)) {
    // Filter to actionable, high-frequency insights
    const actionable = modelInsights
      .filter((i) => i.confidence >= 0.5 && i.frequency >= 3)
      .filter((i) => i.workaround || i.type === "win");

    if (actionable.length === 0) continue;

    // Generate prompt section
    const content = formatModelSection(model, actionable);

    additions.push({
      model,
      section: `## Notes for ${getModelName(model)}`,
      priority: 100,
      content,
      sourceInsights: actionable.map((i) => i.id),
    });
  }

  return additions;
}

function formatModelSection(
  model: string,
  insights: AggregatedInsight[]
): string {
  const lines: string[] = [];

  // Quirks to avoid
  const quirks = insights.filter((i) => i.type === "quirk");
  if (quirks.length > 0) {
    lines.push("### Known quirks to avoid:\n");
    for (const quirk of quirks) {
      lines.push(`- **${quirk.pattern}**`);
      if (quirk.workaround) {
        lines.push(`  - Workaround: ${quirk.workaround}`);
      }
    }
    lines.push("");
  }

  // Effective techniques
  const wins = insights.filter((i) => i.type === "win");
  if (wins.length > 0) {
    lines.push("### Effective techniques:\n");
    for (const win of wins) {
      lines.push(`- ${win.pattern}`);
    }
    lines.push("");
  }

  // Tool usage reminders
  const toolIssues = insights.filter((i) => i.type === "tool_error");
  if (toolIssues.length > 0) {
    lines.push("### Tool usage reminders:\n");
    for (const issue of toolIssues) {
      lines.push(`- ${issue.tool}: ${issue.pattern}`);
    }
  }

  return lines.join("\n");
}
```

### Example Generated Content

For Claude Sonnet:

```markdown
## Notes for gemini-3-flash

### Known quirks to avoid:

- **Uses sed/cat/bash to read files instead of read tool**
  - Workaround: Remember to use the `read` tool for examining files. It provides line numbers and is more reliable.

- **Over-engineers simple solutions**
  - Workaround: Start with the simplest solution that works. Add complexity only when needed.

- **Apologizes excessively after errors**
  - Workaround: Skip apologies; focus on fixing the issue.

### Effective techniques:

- Specifying "production-ready" leads to more thorough implementations
- Breaking tasks into explicit phases maintains focus
- Providing example output format improves structured responses

### Tool usage reminders:

- edit: Always verify exact text match before editing. Read file first if unsure.
- bash: Use timeout for potentially long-running commands.
```

## Prompt Injection

### Injection Methods

#### Recommended: Skill-Based Injection (Default)

Create a `brain-insights` skill that's loaded only for analysis sessions:

```markdown
---
name: brain-insights
description: Load learned insights about current model
trigger: manual
---

# Model Insights for {model}

{dynamically generated content}
```

This approach:

- Only affects analyzer sessions
- No cross-contamination with user sessions
- Easy to disable/enable
- Version controlled separately

**Skill Generation:**

```typescript
async function generateBrainInsightsSkill(
  model: string,
  insights: AggregatedInsight[]
): Promise<void> {
  const skillPath = path.join(os.homedir(), "skills/brain-insights/SKILL.md");

  const relevantInsights = insights.filter(
    (i) => i.model === model || i.type === "tool_error"
  );

  const content = `---
name: brain-insights
description: Learned insights for ${model}
trigger: manual
---

# Model Insights for ${model}

${formatModelSection(model, relevantInsights)}
`;

  await fs.mkdir(path.dirname(skillPath), { recursive: true });
  await fs.writeFile(skillPath, content);
}
```

#### Not Recommended: AGENTS.md Modification

Modifying `~/.pi/agent/AGENTS.md` affects ALL sessions:

- User coding sessions
- Extension commands
- Subagent invocations

Only use if you want global model hints. Enable with:

```yaml
prompt_learning:
  injection_method: agents_file # NOT recommended
  injection_scope: global # Default would be 'analysis_only'
```

**Implementation (if enabled):**

```typescript
async function updateAgentsFile(additions: PromptAddition[]): Promise<void> {
  const agentsPath = path.join(os.homedir(), ".pi/agent/AGENTS.md");
  let content = await fs.readFile(agentsPath, "utf-8");

  // Find or create pi-brain section
  const marker = "<!-- pi-brain-insights -->";
  const endMarker = "<!-- /pi-brain-insights -->";

  const insightsSection = formatInsightsSection(additions);

  if (content.includes(marker)) {
    // Replace existing section
    const regex = new RegExp(`${marker}[\\s\\S]*?${endMarker}`, "g");
    content = content.replace(
      regex,
      `${marker}\n${insightsSection}\n${endMarker}`
    );
  } else {
    // Append new section
    content += `\n\n${marker}\n${insightsSection}\n${endMarker}`;
  }

  await fs.writeFile(agentsPath, content);
}
```

### Scoped Insights

Even with skill injection, scope insights appropriately:

```typescript
function shouldApplyInsight(
  insight: AggregatedInsight,
  context: AnalysisContext
): boolean {
  // Tool errors: apply broadly
  if (insight.type === "tool_error") return true;

  // Model quirks: only for matching model
  if (insight.type === "quirk" && insight.model !== context.model) {
    return false;
  }

  // Project lessons: only for matching project
  if (insight.level === "project" && insight.project !== context.project) {
    return false;
  }

  return true;
}
```

#### Alternative: Extension-Based Injection

Pi extension that adds insights to system prompt:

```typescript
// extension/brain-insights.ts
export default function brainInsightsExtension(pi: ExtensionAPI) {
  pi.registerPromptEnhancer({
    name: "brain-insights",
    enhance: async (prompt, context) => {
      const model = context.model;
      const insights = await fetchInsightsForModel(model);

      if (insights.length === 0) return prompt;

      const section = formatInsightsSection(insights);
      return `${prompt}\n\n${section}`;
    },
  });
}
```

## Feedback Tracking

### Measuring Improvement

Track whether prompts actually help:

```sql
CREATE TABLE prompt_effectiveness (
    id TEXT PRIMARY KEY,
    insight_id TEXT NOT NULL,
    prompt_version TEXT NOT NULL,

    -- Before metrics
    before_occurrences INTEGER,        -- How often issue occurred before
    before_severity REAL,              -- Average severity

    -- After metrics
    after_occurrences INTEGER,         -- How often after prompt added
    after_severity REAL,

    -- Analysis period
    before_start TEXT,
    before_end TEXT,
    after_start TEXT,
    after_end TEXT,

    -- Improvement
    improvement_pct REAL,              -- Positive = better
    statistically_significant BOOLEAN,

    FOREIGN KEY (insight_id) REFERENCES aggregated_insights(id)
);
```

### Effectiveness Calculation

```typescript
interface EffectivenessResult {
  insightId: string;
  beforeRate: number; // Occurrences per session
  afterRate: number;
  improvement: number; // Percentage improvement
  significant: boolean; // Statistically significant?
}

async function measureEffectiveness(
  insightId: string,
  beforePeriod: DateRange,
  afterPeriod: DateRange
): Promise<EffectivenessResult> {
  const insight = await db.get(
    "SELECT * FROM aggregated_insights WHERE id = ?",
    [insightId]
  );

  // Count occurrences before prompt change
  const beforeCount = await countOccurrences(insight, beforePeriod);
  const beforeSessions = await countSessions(beforePeriod);
  const beforeRate = beforeCount / beforeSessions;

  // Count occurrences after prompt change
  const afterCount = await countOccurrences(insight, afterPeriod);
  const afterSessions = await countSessions(afterPeriod);
  const afterRate = afterCount / afterSessions;

  // Calculate improvement
  const improvement =
    beforeRate > 0 ? ((beforeRate - afterRate) / beforeRate) * 100 : 0;

  // Statistical significance (simplified chi-square test)
  const significant = isSignificant(
    beforeCount,
    afterCount,
    beforeSessions,
    afterSessions
  );

  return {
    insightId,
    beforeRate,
    afterRate,
    improvement,
    significant,
  };
}
```

## User Interface

### Insights Dashboard

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  Prompt Learning Dashboard                                                     │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  ┌────────────────────────────────────────────────────────────────────────┐   │
│  │ Active Prompt Additions                                      [Refresh] │   │
│  │                                                                        │   │
│  │ ┌─────────────────────────────────────────────────────────────────┐   │   │
│  │ │ gemini-3-flash                               3 insights │   │   │
│  │ │ ▼ Uses sed instead of read tool                                  │   │   │
│  │ │   Frequency: 15 times • Improvement: +45% ✓                      │   │   │
│  │ │   [View] [Edit] [Disable]                                        │   │   │
│  │ ├─────────────────────────────────────────────────────────────────┤   │   │
│  │ │ ▼ Over-engineers solutions                                       │   │   │
│  │ │   Frequency: 8 times • Improvement: +20%                         │   │   │
│  │ │   [View] [Edit] [Disable]                                        │   │   │
│  │ └─────────────────────────────────────────────────────────────────┘   │   │
│  │                                                                        │   │
│  │ ┌─────────────────────────────────────────────────────────────────┐   │   │
│  │ │ zai/glm-4.7                                           1 insight  │   │   │
│  │ │ ▶ Forgets context after long sessions                            │   │   │
│  │ └─────────────────────────────────────────────────────────────────┘   │   │
│  └────────────────────────────────────────────────────────────────────────┘   │
│                                                                                │
│  ┌────────────────────────────────────────────────────────────────────────┐   │
│  │ Pending Insights (not yet in prompts)                    [Add Selected]│   │
│  │                                                                        │   │
│  │ ☐ Edit tool: whitespace mismatch errors (12 occurrences)              │   │
│  │ ☐ bash: timeout on long-running commands (8 occurrences)              │   │
│  │ ☐ User pattern: vague refactor requests (6 occurrences)               │   │
│  └────────────────────────────────────────────────────────────────────────┘   │
│                                                                                │
│  ┌────────────────────────────────────────────────────────────────────────┐   │
│  │ Effectiveness Trends                                                   │   │
│  │                                                                        │   │
│  │   +60% ┤ ╭╮                                                           │   │
│  │   +40% ┤╭╯╰╮  ╭─                                                      │   │
│  │   +20% ┼╯  ╰──╯                                                       │   │
│  │     0% ┼──────────────────                                            │   │
│  │        W1  W2  W3  W4  W5                                             │   │
│  │                                                                        │   │
│  │   — Overall quirk reduction                                           │   │
│  └────────────────────────────────────────────────────────────────────────┘   │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

### Insight Editor

```svelte
<!-- InsightEditor.svelte -->
<script lang="ts">
  export let insight: AggregatedInsight;

  let promptText = insight.prompt_text ?? generateDefaultPrompt(insight);
  let included = insight.prompt_included;
</script>

<div class="insight-editor">
  <h3>{insight.pattern}</h3>

  <div class="stats">
    <span>Frequency: {insight.frequency}</span>
    <span>Confidence: {(insight.confidence * 100).toFixed(0)}%</span>
    <span>Severity: {insight.severity}</span>
  </div>

  <div class="examples">
    <h4>Examples</h4>
    {#each insight.examples.slice(0, 3) as nodeId}
      <a href="/nodes/{nodeId}">{nodeId}</a>
    {/each}
  </div>

  <div class="prompt-section">
    <h4>Prompt Addition</h4>
    <textarea bind:value={promptText} rows="5"></textarea>

    <label>
      <input type="checkbox" bind:checked={included} />
      Include in system prompts
    </label>
  </div>

  <div class="actions">
    <button on:click={save}>Save</button>
    <button on:click={preview}>Preview in Prompt</button>
  </div>
</div>
```

## Automation

### Nightly Pipeline

```typescript
async function runPromptLearningPipeline(): Promise<void> {
  console.log("Running prompt learning pipeline...");

  // 1. Aggregate insights
  const insights = await aggregateInsights();
  console.log(`Aggregated ${insights.length} insights`);

  // 2. Update database
  await updateAggregatedInsights(insights);

  // 3. Generate prompt additions for high-confidence insights
  const additions = await generatePromptAdditions(
    insights.filter((i) => i.confidence >= 0.7 && i.frequency >= 5)
  );
  console.log(`Generated ${additions.length} prompt additions`);

  // 4. Measure effectiveness of existing additions
  const effectiveness = await measureAllEffectiveness();
  console.log(`Measured effectiveness of ${effectiveness.length} insights`);

  // 5. Auto-disable ineffective prompts
  for (const result of effectiveness) {
    if (result.significant && result.improvement < -10) {
      console.log(`Disabling ineffective insight: ${result.insightId}`);
      await disableInsight(result.insightId);
    }
  }

  // 6. Notify about pending insights
  const pending = insights.filter(
    (i) => !i.prompt_included && i.confidence >= 0.7 && i.frequency >= 3
  );
  if (pending.length > 0) {
    await notifyPendingInsights(pending);
  }
}
```

### Manual Triggers

```bash
# Run pipeline manually
pi-brain prompt-learning run

# View current insights
pi-brain prompt-learning insights

# Preview generated prompts
pi-brain prompt-learning preview --model google-antigravity/gemini-3-flash

# Enable/disable insights
pi-brain prompt-learning enable insight-123
pi-brain prompt-learning disable insight-456

# Measure effectiveness
pi-brain prompt-learning measure --days 7
```

## Configuration

```yaml
# ~/.pi-brain/config.yaml
prompt_learning:
  enabled: true

  # Thresholds for auto-inclusion
  auto_include:
    min_frequency: 5
    min_confidence: 0.7

  # Injection method (recommended: skill)
  injection_method: skill # 'skill' (recommended), 'agents_file', or 'extension'
  injection_scope: analysis_only # 'analysis_only' (recommended) or 'global'

  # Effectiveness tracking
  effectiveness:
    measure_after_days: 7
    disable_threshold: -10 # Disable if improvement < -10%

  # Schedule
  pipeline_schedule: "0 3 * * *" # 3am nightly
```

## Future Enhancements

### Fine-Tuning Data Export

Export aggregated insights for model fine-tuning:

```typescript
interface FineTuningExample {
  input: string; // Session segment
  output: string; // Correct behavior
  insight: string; // What was learned
}

async function exportForFineTuning(): Promise<FineTuningExample[]> {
  // Export examples where quirks were observed and corrected
  // or where prompting wins led to good outcomes
}
```

### Cross-Project Learning

Identify patterns that apply across projects:

```typescript
async function findCrossProjectPatterns(): Promise<AggregatedInsight[]> {
  // Group insights by pattern, look for those appearing in multiple projects
}
```

### User Behavior Learning

Track and improve user prompting patterns:

```typescript
interface UserPattern {
  pattern: string;
  frequency: number;
  successRate: number;
  suggestion: string; // How to improve
}

async function analyzeUserPatterns(): Promise<UserPattern[]> {
  // Analyze lessons.user across all nodes
}
```
