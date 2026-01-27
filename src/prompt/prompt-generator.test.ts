/**
 * Tests for prompt generator
 */

import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { AggregatedInsight } from "../types/index.js";

import { migrate } from "../storage/database.js";
import {
  filterActionableInsights,
  formatModelSection,
  formatPromptAdditionsDocument,
  generatePromptAdditions,
  generatePromptAdditionsFromDb,
  getModelDisplayName,
  getPromptAdditionsForModel,
  groupInsightsByModel,
  updateInsightPromptTexts,
} from "./prompt-generator.js";

// =============================================================================
// Test Fixtures
// =============================================================================

function createMockInsight(
  overrides: Partial<AggregatedInsight> = {}
): AggregatedInsight {
  return {
    id: "test-insight-1",
    type: "quirk",
    model: "google/gemini-3-flash",
    pattern: "Uses sed instead of read tool",
    frequency: 5,
    confidence: 0.75,
    severity: "medium",
    workaround: "Use the read tool for file examination",
    examples: ["node-1", "node-2"],
    firstSeen: "2026-01-01T00:00:00Z",
    lastSeen: "2026-01-25T00:00:00Z",
    promptIncluded: false,
    updatedAt: "2026-01-25T00:00:00Z",
    ...overrides,
  };
}

// =============================================================================
// getModelDisplayName Tests
// =============================================================================

describe("getModelDisplayName", () => {
  it("should format provider/model correctly", () => {
    expect(getModelDisplayName("google/gemini-3-flash")).toBe(
      "Google Gemini 3 Flash"
    );
  });

  it("should handle underscores in model names", () => {
    expect(getModelDisplayName("anthropic/claude_sonnet_4")).toBe(
      "Anthropic Claude Sonnet 4"
    );
  });

  it("should handle models without provider prefix", () => {
    expect(getModelDisplayName("gpt-4")).toBe("gpt-4");
  });

  it("should capitalize provider name", () => {
    expect(getModelDisplayName("zai/glm-4.7")).toBe("Zai Glm 4.7");
  });
});

// =============================================================================
// groupInsightsByModel Tests
// =============================================================================

describe("groupInsightsByModel", () => {
  it("should group insights by model", () => {
    const insights = [
      createMockInsight({ id: "1", model: "google/gemini-3-flash" }),
      createMockInsight({ id: "2", model: "google/gemini-3-flash" }),
      createMockInsight({ id: "3", model: "anthropic/claude-sonnet-4" }),
    ];

    const grouped = groupInsightsByModel(insights);

    expect(grouped.size).toBe(2);
    expect(grouped.get("google/gemini-3-flash")?.length).toBe(2);
    expect(grouped.get("anthropic/claude-sonnet-4")?.length).toBe(1);
  });

  it("should skip insights without model", () => {
    const insights = [
      createMockInsight({ id: "1", model: "google/gemini-3-flash" }),
      createMockInsight({ id: "2", model: undefined }),
    ];

    const grouped = groupInsightsByModel(insights);

    expect(grouped.size).toBe(1);
    expect(grouped.get("google/gemini-3-flash")?.length).toBe(1);
  });

  it("should return empty map for empty input", () => {
    const grouped = groupInsightsByModel([]);
    expect(grouped.size).toBe(0);
  });
});

// =============================================================================
// filterActionableInsights Tests
// =============================================================================

describe("filterActionableInsights", () => {
  it("should filter by confidence threshold", () => {
    const insights = [
      createMockInsight({ id: "1", confidence: 0.8 }),
      createMockInsight({ id: "2", confidence: 0.3 }),
    ];

    const filtered = filterActionableInsights(insights, { minConfidence: 0.5 });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("1");
  });

  it("should filter by frequency threshold", () => {
    const insights = [
      createMockInsight({ id: "1", frequency: 10 }),
      createMockInsight({ id: "2", frequency: 2 }),
    ];

    const filtered = filterActionableInsights(insights, { minFrequency: 3 });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("1");
  });

  it("should require workaround for quirks", () => {
    const insights = [
      createMockInsight({
        id: "1",
        type: "quirk",
        workaround: "Do this instead",
      }),
      createMockInsight({ id: "2", type: "quirk", workaround: undefined }),
    ];

    const filtered = filterActionableInsights(insights);

    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("1");
  });

  it("should allow wins without workaround", () => {
    const insight = createMockInsight({
      type: "win",
      workaround: undefined,
      frequency: 5,
      confidence: 0.7,
    });

    const filtered = filterActionableInsights([insight]);

    expect(filtered).toHaveLength(1);
  });

  it("should use default thresholds", () => {
    const insights = [
      createMockInsight({ id: "1", confidence: 0.6, frequency: 4 }),
      createMockInsight({ id: "2", confidence: 0.4, frequency: 4 }), // Below confidence
      createMockInsight({ id: "3", confidence: 0.6, frequency: 2 }), // Below frequency
    ];

    const filtered = filterActionableInsights(insights);

    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("1");
  });
});

// =============================================================================
// formatModelSection Tests
// =============================================================================

describe("formatModelSection", () => {
  it("should format quirks section", () => {
    const insights = [
      createMockInsight({
        type: "quirk",
        pattern: "Uses sed instead of read",
        workaround: "Use read tool",
      }),
    ];

    const section = formatModelSection("google/gemini-3-flash", insights);

    expect(section).toContain("### Known quirks to avoid:");
    expect(section).toContain("**Uses sed instead of read**");
    expect(section).toContain("Workaround: Use read tool");
  });

  it("should format wins section", () => {
    const insights = [
      createMockInsight({
        type: "win",
        pattern: "Specifying production-ready leads to better code",
      }),
    ];

    const section = formatModelSection("google/gemini-3-flash", insights);

    expect(section).toContain("### Effective techniques:");
    expect(section).toContain(
      "Specifying production-ready leads to better code"
    );
  });

  it("should format tool errors section", () => {
    const insights = [
      createMockInsight({
        type: "tool_error",
        tool: "edit",
        pattern: "whitespace mismatch errors",
      }),
    ];

    const section = formatModelSection("google/gemini-3-flash", insights);

    expect(section).toContain("### Tool usage reminders:");
    expect(section).toContain("edit: whitespace mismatch errors");
  });

  it("should respect max limits", () => {
    const quirks = Array.from({ length: 10 }, (_, i) =>
      createMockInsight({
        id: `quirk-${i}`,
        type: "quirk",
        pattern: `Quirk ${i}`,
        workaround: `Fix ${i}`,
        frequency: 10 - i, // Sorted by frequency
      })
    );

    const section = formatModelSection("google/gemini-3-flash", quirks, {
      maxQuirks: 3,
    });

    // Should only have 3 quirks (0, 1, 2 - highest frequency)
    expect(section).toContain("Quirk 0");
    expect(section).toContain("Quirk 1");
    expect(section).toContain("Quirk 2");
    expect(section).not.toContain("Quirk 3");
  });

  it("should return empty string for empty insights", () => {
    const section = formatModelSection("google/gemini-3-flash", []);
    expect(section).toBe("");
  });

  it("should combine all sections", () => {
    const insights = [
      createMockInsight({
        id: "1",
        type: "quirk",
        pattern: "A quirk",
        workaround: "Fix it",
      }),
      createMockInsight({ id: "2", type: "win", pattern: "A win" }),
      createMockInsight({
        id: "3",
        type: "tool_error",
        tool: "bash",
        pattern: "timeout issue",
      }),
    ];

    const section = formatModelSection("google/gemini-3-flash", insights);

    expect(section).toContain("### Known quirks to avoid:");
    expect(section).toContain("### Effective techniques:");
    expect(section).toContain("### Tool usage reminders:");
  });
});

// =============================================================================
// generatePromptAdditions Tests
// =============================================================================

describe("generatePromptAdditions", () => {
  it("should generate additions for each model", () => {
    const insights = [
      createMockInsight({
        id: "1",
        model: "google/gemini-3-flash",
        type: "quirk",
        workaround: "Fix",
      }),
      createMockInsight({
        id: "2",
        model: "anthropic/claude-sonnet-4",
        type: "quirk",
        workaround: "Fix",
      }),
    ];

    const additions = generatePromptAdditions(insights);

    expect(additions).toHaveLength(2);
    expect(additions.map((a) => a.model)).toContain("google/gemini-3-flash");
    expect(additions.map((a) => a.model)).toContain(
      "anthropic/claude-sonnet-4"
    );
  });

  it("should include section header with display name", () => {
    const insights = [
      createMockInsight({
        model: "google/gemini-3-flash",
        type: "quirk",
        workaround: "Fix",
      }),
    ];

    const additions = generatePromptAdditions(insights);

    expect(additions[0].section).toBe("## Notes for Google Gemini 3 Flash");
  });

  it("should skip models without actionable insights", () => {
    const insights = [
      createMockInsight({
        model: "google/gemini-3-flash",
        type: "quirk",
        workaround: undefined, // Not actionable
      }),
    ];

    const additions = generatePromptAdditions(insights);

    expect(additions).toHaveLength(0);
  });

  it("should include source insight IDs", () => {
    const insights = [
      createMockInsight({ id: "insight-1", type: "quirk", workaround: "Fix" }),
      createMockInsight({ id: "insight-2", type: "win" }),
    ];

    const additions = generatePromptAdditions(insights);

    expect(additions[0].sourceInsights).toContain("insight-1");
    expect(additions[0].sourceInsights).toContain("insight-2");
  });

  it("should sort additions by model name", () => {
    const insights = [
      createMockInsight({
        id: "1",
        model: "zai/glm-4.7",
        type: "quirk",
        workaround: "Fix",
      }),
      createMockInsight({
        id: "2",
        model: "anthropic/claude-sonnet-4",
        type: "quirk",
        workaround: "Fix",
      }),
    ];

    const additions = generatePromptAdditions(insights);

    expect(additions[0].model).toBe("anthropic/claude-sonnet-4");
    expect(additions[1].model).toBe("zai/glm-4.7");
  });

  it("should use custom options", () => {
    const insights = [
      createMockInsight({
        id: "1",
        confidence: 0.6,
        frequency: 2, // Below default of 3
        type: "quirk",
        workaround: "Fix",
      }),
    ];

    // With default options, should be filtered out
    expect(generatePromptAdditions(insights)).toHaveLength(0);

    // With custom options, should be included
    const additions = generatePromptAdditions(insights, {
      minFrequency: 2,
      minConfidence: 0.5,
    });
    expect(additions).toHaveLength(1);
  });
});

// =============================================================================
// formatPromptAdditionsDocument Tests
// =============================================================================

describe("formatPromptAdditionsDocument", () => {
  it("should format complete document with header", () => {
    const additions = [
      {
        model: "google/gemini-3-flash",
        section: "## Notes for Google Gemini 3 Flash",
        priority: 100,
        content: "### Known quirks to avoid:\n\n- **Test quirk**",
        sourceInsights: ["1"],
      },
    ];

    const doc = formatPromptAdditionsDocument(additions);

    expect(doc).toContain("# Model-Specific Insights");
    expect(doc).toContain(
      "The following insights have been learned from analyzing your coding sessions"
    );
    expect(doc).toContain("## Notes for Google Gemini 3 Flash");
    expect(doc).toContain("### Known quirks to avoid:");
  });

  it("should combine multiple model sections", () => {
    const additions = [
      {
        model: "google/gemini-3-flash",
        section: "## Notes for Google Gemini 3 Flash",
        priority: 100,
        content: "Content 1",
        sourceInsights: ["1"],
      },
      {
        model: "anthropic/claude-sonnet-4",
        section: "## Notes for Anthropic Claude Sonnet 4",
        priority: 100,
        content: "Content 2",
        sourceInsights: ["2"],
      },
    ];

    const doc = formatPromptAdditionsDocument(additions);

    expect(doc).toContain("## Notes for Google Gemini 3 Flash");
    expect(doc).toContain("Content 1");
    expect(doc).toContain("## Notes for Anthropic Claude Sonnet 4");
    expect(doc).toContain("Content 2");
  });

  it("should return empty string for empty additions", () => {
    const doc = formatPromptAdditionsDocument([]);
    expect(doc).toBe("");
  });
});

// =============================================================================
// Database Integration Tests
// =============================================================================

describe("generatePromptAdditionsFromDb", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(":memory:");
    migrate(db);
  });

  afterEach(() => {
    db.close();
  });

  function insertInsight(values: {
    id: string;
    type: string;
    model?: string;
    tool?: string;
    pattern: string;
    frequency?: number;
    confidence?: number;
    severity?: string;
    workaround?: string;
    examples?: string[];
  }): void {
    db.prepare(`
      INSERT INTO aggregated_insights (
        id, type, model, tool, pattern, frequency, confidence, severity,
        workaround, examples, first_seen, last_seen, prompt_included, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), 0, datetime('now'))
    `).run(
      values.id,
      values.type,
      values.model ?? null,
      values.tool ?? null,
      values.pattern,
      values.frequency ?? 5,
      values.confidence ?? 0.7,
      values.severity ?? "medium",
      values.workaround ?? null,
      JSON.stringify(values.examples ?? ["node-1"])
    );
  }

  it("should generate additions from database insights", () => {
    insertInsight({
      id: "quirk-1",
      type: "quirk",
      model: "google/gemini-3-flash",
      pattern: "Uses sed instead of read",
      workaround: "Use read tool",
    });

    const additions = generatePromptAdditionsFromDb(db);

    expect(additions).toHaveLength(1);
    expect(additions[0].model).toBe("google/gemini-3-flash");
    expect(additions[0].content).toContain("Uses sed instead of read");
  });

  it("should respect minFrequency option", () => {
    insertInsight({
      id: "quirk-1",
      type: "quirk",
      model: "google/gemini-3-flash",
      pattern: "Low frequency quirk",
      frequency: 2,
      workaround: "Fix",
    });

    const additions = generatePromptAdditionsFromDb(db, { minFrequency: 3 });

    expect(additions).toHaveLength(0);
  });

  it("should respect minConfidence option", () => {
    insertInsight({
      id: "quirk-1",
      type: "quirk",
      model: "google/gemini-3-flash",
      pattern: "Low confidence quirk",
      confidence: 0.3,
      workaround: "Fix",
    });

    const additions = generatePromptAdditionsFromDb(db, { minConfidence: 0.5 });

    expect(additions).toHaveLength(0);
  });
});

describe("getPromptAdditionsForModel", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(":memory:");
    migrate(db);
  });

  afterEach(() => {
    db.close();
  });

  function insertInsight(values: {
    id: string;
    type: string;
    model?: string;
    pattern: string;
    workaround?: string;
  }): void {
    db.prepare(`
      INSERT INTO aggregated_insights (
        id, type, model, tool, pattern, frequency, confidence, severity,
        workaround, examples, first_seen, last_seen, prompt_included, updated_at
      ) VALUES (?, ?, ?, NULL, ?, 5, 0.7, 'medium', ?, '[]', datetime('now'), datetime('now'), 0, datetime('now'))
    `).run(
      values.id,
      values.type,
      values.model ?? null,
      values.pattern,
      values.workaround ?? null
    );
  }

  it("should return addition for specific model", () => {
    insertInsight({
      id: "quirk-1",
      type: "quirk",
      model: "google/gemini-3-flash",
      pattern: "Test quirk",
      workaround: "Fix it",
    });
    insertInsight({
      id: "quirk-2",
      type: "quirk",
      model: "anthropic/claude-sonnet-4",
      pattern: "Other quirk",
      workaround: "Other fix",
    });

    const addition = getPromptAdditionsForModel(db, "google/gemini-3-flash");

    expect(addition).not.toBeNull();
    expect(addition?.model).toBe("google/gemini-3-flash");
    expect(addition?.content).toContain("Test quirk");
    expect(addition?.content).not.toContain("Other quirk");
  });

  it("should return null when no insights for model", () => {
    insertInsight({
      id: "quirk-1",
      type: "quirk",
      model: "google/gemini-3-flash",
      pattern: "Test quirk",
      workaround: "Fix it",
    });

    const addition = getPromptAdditionsForModel(db, "openai/gpt-4");

    expect(addition).toBeNull();
  });
});

describe("updateInsightPromptTexts", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(":memory:");
    migrate(db);
  });

  afterEach(() => {
    db.close();
  });

  function insertInsight(id: string): void {
    db.prepare(`
      INSERT INTO aggregated_insights (
        id, type, model, tool, pattern, frequency, confidence, severity,
        workaround, examples, first_seen, last_seen, prompt_included, updated_at
      ) VALUES (?, 'quirk', 'google/gemini-3-flash', NULL, 'Test', 5, 0.7, 'medium', 'Fix', '[]', datetime('now'), datetime('now'), 0, datetime('now'))
    `).run(id);
  }

  it("should update prompt text for insights", () => {
    insertInsight("insight-1");
    insertInsight("insight-2");

    const additions = [
      {
        model: "google/gemini-3-flash",
        section: "## Notes",
        priority: 100,
        content: "Generated content",
        sourceInsights: ["insight-1", "insight-2"],
      },
    ];

    updateInsightPromptTexts(db, additions, "v1-abc123");

    // Verify updates
    const row1 = db
      .prepare(
        "SELECT prompt_text, prompt_included, prompt_version FROM aggregated_insights WHERE id = ?"
      )
      .get("insight-1") as {
      prompt_text: string;
      prompt_included: number;
      prompt_version: string;
    };

    expect(row1.prompt_text).toBe("Generated content");
    expect(row1.prompt_included).toBe(1);
    expect(row1.prompt_version).toBe("v1-abc123");

    const row2 = db
      .prepare("SELECT prompt_included FROM aggregated_insights WHERE id = ?")
      .get("insight-2") as { prompt_included: number };

    expect(row2.prompt_included).toBe(1);
  });
});
