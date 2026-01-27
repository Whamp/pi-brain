import { describe, expect, it } from "vitest";

import { openDatabase } from "./database.js";
import {
  countInsights,
  getInsight,
  getInsightsByModel,
  listFailurePatterns,
  listInsights,
  listLessonPatterns,
  listModelStats,
  updateInsightPrompt,
} from "./pattern-repository.js";

describe("pattern-repository", () => {
  it("should list failure patterns", () => {
    const db = openDatabase({ path: ":memory:", migrate: true });

    // Insert test data
    db.prepare(`
      INSERT INTO failure_patterns (
        id, pattern, occurrences, models, tools, example_nodes, last_seen, learning_opportunity
      ) VALUES 
      ('p1', 'Error 1', 5, '["gpt-4"]', '["tool1"]', '["n1"]', '2023-01-01', 'Learn this'),
      ('p2', 'Error 2', 2, '["claude"]', '["tool2"]', '["n2"]', '2023-01-02', 'Learn that')
    `).run();

    const patterns = listFailurePatterns(db);
    expect(patterns).toHaveLength(2);
    expect(patterns[0].id).toBe("p1"); // Higher occurrences first
    expect(patterns[0].models).toStrictEqual(["gpt-4"]);
    expect(patterns[1].id).toBe("p2");

    // Test filtering
    const rarePatterns = listFailurePatterns(db, { minOccurrences: 3 });
    expect(rarePatterns).toHaveLength(1);
    expect(rarePatterns[0].id).toBe("p1");
  });

  it("should list model stats", () => {
    const db = openDatabase({ path: ":memory:", migrate: true });

    // Insert test data
    db.prepare(`
      INSERT INTO model_stats (
        model, total_tokens, total_cost, total_sessions, quirk_count, error_count, last_used
      ) VALUES 
      ('gpt-4', 1000, 0.03, 5, 2, 1, '2023-01-02'),
      ('claude', 500, 0.01, 2, 0, 0, '2023-01-01')
    `).run();

    const stats = listModelStats(db);
    expect(stats).toHaveLength(2);
    expect(stats[0].model).toBe("gpt-4"); // Last used more recently
    expect(stats[0].totalTokens).toBe(1000);
    expect(stats[1].model).toBe("claude");
  });

  it("should list lesson patterns", () => {
    const db = openDatabase({ path: ":memory:", migrate: true });

    // Insert test data
    db.prepare(`
      INSERT INTO lesson_patterns (
        id, level, pattern, occurrences, tags, example_nodes, last_seen
      ) VALUES 
      ('l1', 'project', 'Lesson 1', 3, '["tag1"]', '["n1"]', '2023-01-01'),
      ('l2', 'user', 'Lesson 2', 1, '["tag2"]', '["n2"]', '2023-01-02')
    `).run();

    const patterns = listLessonPatterns(db);
    expect(patterns).toHaveLength(2);
    expect(patterns[0].id).toBe("l1"); // Higher occurrences first

    // Test filtering
    const projectPatterns = listLessonPatterns(db, { level: "project" });
    expect(projectPatterns).toHaveLength(1);
    expect(projectPatterns[0].id).toBe("l1");
  });
});

describe("insight-repository", () => {
  function setupInsightsDb() {
    const db = openDatabase({ path: ":memory:", migrate: true });

    // Insert test insights
    db.prepare(`
      INSERT INTO aggregated_insights (
        id, type, model, tool, pattern, frequency, confidence, severity,
        workaround, examples, first_seen, last_seen, prompt_included
      ) VALUES 
      ('i1', 'quirk', 'claude', NULL, 'Uses sed instead of read', 10, 0.9, 'high', 'Use read tool', '["n1","n2"]', '2023-01-01', '2023-01-10', 1),
      ('i2', 'tool_error', 'claude', 'edit', 'Text not found', 5, 0.7, 'medium', NULL, '["n3"]', '2023-01-02', '2023-01-09', 0),
      ('i3', 'win', 'gpt-4', NULL, 'Specific prompts work better', 3, 0.6, 'low', NULL, '["n4"]', '2023-01-03', '2023-01-08', 0),
      ('i4', 'lesson', NULL, NULL, 'Always test before commit', 2, 0.5, 'low', NULL, '["n5"]', '2023-01-04', '2023-01-07', 0)
    `).run();

    return db;
  }

  it("should list insights with defaults", () => {
    const db = setupInsightsDb();

    const insights = listInsights(db);
    expect(insights).toHaveLength(4);
    expect(insights[0].id).toBe("i1"); // Highest frequency first
    expect(insights[0].type).toBe("quirk");
    expect(insights[0].model).toBe("claude");
    expect(insights[0].examples).toStrictEqual(["n1", "n2"]);
  });

  it("should filter insights by type", () => {
    const db = setupInsightsDb();

    const quirks = listInsights(db, { type: "quirk" });
    expect(quirks).toHaveLength(1);
    expect(quirks[0].id).toBe("i1");

    const toolErrors = listInsights(db, { type: "tool_error" });
    expect(toolErrors).toHaveLength(1);
    expect(toolErrors[0].id).toBe("i2");
  });

  it("should filter insights by model", () => {
    const db = setupInsightsDb();

    const claudeInsights = listInsights(db, { model: "claude" });
    expect(claudeInsights).toHaveLength(2);
  });

  it("should filter insights by tool", () => {
    const db = setupInsightsDb();

    const editInsights = listInsights(db, { tool: "edit" });
    expect(editInsights).toHaveLength(1);
    expect(editInsights[0].id).toBe("i2");
  });

  it("should filter by minimum frequency", () => {
    const db = setupInsightsDb();

    const frequentInsights = listInsights(db, { minFrequency: 5 });
    expect(frequentInsights).toHaveLength(2);
  });

  it("should filter by minimum confidence", () => {
    const db = setupInsightsDb();

    const confidentInsights = listInsights(db, { minConfidence: 0.7 });
    expect(confidentInsights).toHaveLength(2);
  });

  it("should filter by prompt included status", () => {
    const db = setupInsightsDb();

    const includedInsights = listInsights(db, { promptIncluded: true });
    expect(includedInsights).toHaveLength(1);
    expect(includedInsights[0].id).toBe("i1");

    const notIncludedInsights = listInsights(db, { promptIncluded: false });
    expect(notIncludedInsights).toHaveLength(3);
  });

  it("should get a single insight by id", () => {
    const db = setupInsightsDb();

    const insight = getInsight(db, "i1");
    expect(insight).not.toBeNull();
    expect(insight?.pattern).toBe("Uses sed instead of read");
    expect(insight?.workaround).toBe("Use read tool");

    const missing = getInsight(db, "nonexistent");
    expect(missing).toBeNull();
  });

  it("should get insights by model", () => {
    const db = setupInsightsDb();

    const claudeInsights = getInsightsByModel(db, "claude");
    expect(claudeInsights).toHaveLength(2);

    // With minimum confidence filter
    const highConfidence = getInsightsByModel(db, "claude", {
      minConfidence: 0.8,
    });
    expect(highConfidence).toHaveLength(1);
    expect(highConfidence[0].id).toBe("i1");
  });

  it("should count insights", () => {
    const db = setupInsightsDb();

    expect(countInsights(db)).toBe(4);
    expect(countInsights(db, { type: "quirk" })).toBe(1);
    expect(countInsights(db, { model: "claude" })).toBe(2);
    expect(countInsights(db, { promptIncluded: true })).toBe(1);
  });

  it("should update insight prompt", () => {
    const db = setupInsightsDb();

    updateInsightPrompt(db, "i2", "Always verify text match", true, "v2");

    const updated = getInsight(db, "i2");
    expect(updated?.promptText).toBe("Always verify text match");
    expect(updated?.promptIncluded).toBeTruthy();
    expect(updated?.promptVersion).toBe("v2");
  });
});
