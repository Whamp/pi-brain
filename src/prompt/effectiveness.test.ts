/**
 * Tests for prompt effectiveness measurement
 */

import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { DateRange } from "../types/index.js";

import { migrate } from "../storage/database.js";
import {
  calculateAverageSeverity,
  countNodes,
  countOccurrences,
  countSessions,
  getEffectivenessHistory,
  getInsightsNeedingMeasurement,
  getLatestEffectiveness,
  isStatisticallySignificant,
  measureAndStoreEffectiveness,
  measureEffectiveness,
} from "./effectiveness.js";

// =============================================================================
// Test Setup
// =============================================================================

describe("effectiveness", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(":memory:");
    migrate(db);
  });

  afterEach(() => {
    db.close();
  });

  // ===========================================================================
  // Helper Functions
  // ===========================================================================

  function insertNode(
    nodeId: string,
    timestamp: string,
    sessionFile = "/test/session.jsonl"
  ): void {
    db.prepare(
      `
    INSERT INTO nodes (id, session_file, timestamp, analyzed_at, data_file)
    VALUES (?, ?, ?, datetime('now'), '/tmp/test.json')
  `
    ).run(nodeId, sessionFile, timestamp);
  }

  function insertModelQuirk(
    nodeId: string,
    model: string,
    observation: string,
    workaround?: string
  ): void {
    const id = `quirk_${nodeId}_${Date.now()}_${Math.random()}`;
    db.prepare(
      `
    INSERT INTO model_quirks (id, node_id, model, observation, workaround)
    VALUES (?, ?, ?, ?, ?)
  `
    ).run(id, nodeId, model, observation, workaround ?? null);
  }

  function insertToolError(
    nodeId: string,
    tool: string,
    errorType: string,
    model?: string
  ): void {
    const id = `error_${nodeId}_${Date.now()}_${Math.random()}`;
    db.prepare(
      `
    INSERT INTO tool_errors (id, node_id, tool, error_type, model)
    VALUES (?, ?, ?, ?, ?)
  `
    ).run(id, nodeId, tool, errorType, model ?? null);
  }

  function insertLesson(
    nodeId: string,
    summary: string,
    level = "model"
  ): void {
    const id = `lesson_${nodeId}_${Date.now()}_${Math.random()}`;
    db.prepare(
      `
    INSERT INTO lessons (id, node_id, level, summary)
    VALUES (?, ?, ?, ?)
  `
    ).run(id, nodeId, level, summary);
  }

  function insertInsight(
    id: string,
    type: string,
    pattern: string,
    frequency: number,
    options: {
      model?: string;
      tool?: string;
      promptIncluded?: boolean;
      confidence?: number;
      severity?: string;
    } = {}
  ): void {
    db.prepare(
      `
    INSERT INTO aggregated_insights (
      id, type, model, tool, pattern, frequency, confidence, severity,
      prompt_included, examples, first_seen, last_seen
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', datetime('now'), datetime('now'))
  `
    ).run(
      id,
      type,
      options.model ?? null,
      options.tool ?? null,
      pattern,
      frequency,
      options.confidence ?? 0.5,
      options.severity ?? "medium",
      options.promptIncluded ? 1 : 0
    );
  }

  // =============================================================================
  // countSessions Tests
  // =============================================================================

  describe("countSessions", () => {
    it("should count unique sessions within date range", () => {
      insertNode("n1", "2026-01-15T10:00:00Z", "/test/session1.jsonl");
      insertNode("n2", "2026-01-15T11:00:00Z", "/test/session1.jsonl"); // Same session
      insertNode("n3", "2026-01-16T10:00:00Z", "/test/session2.jsonl");
      insertNode("n4", "2026-01-20T10:00:00Z", "/test/session3.jsonl"); // Outside range

      const range: DateRange = {
        start: "2026-01-14T00:00:00Z",
        end: "2026-01-17T00:00:00Z",
      };

      const count = countSessions(db, range);
      expect(count).toBe(2); // session1 and session2
    });

    it("should return 0 for empty date range", () => {
      insertNode("n1", "2026-01-15T10:00:00Z");

      const range: DateRange = {
        start: "2026-02-01T00:00:00Z",
        end: "2026-02-28T00:00:00Z",
      };

      const count = countSessions(db, range);
      expect(count).toBe(0);
    });
  });

  // =============================================================================
  // countNodes Tests
  // =============================================================================

  describe("countNodes", () => {
    it("should count nodes within date range", () => {
      insertNode("n1", "2026-01-15T10:00:00Z");
      insertNode("n2", "2026-01-16T10:00:00Z");
      insertNode("n3", "2026-01-20T10:00:00Z"); // Outside range

      const range: DateRange = {
        start: "2026-01-14T00:00:00Z",
        end: "2026-01-17T00:00:00Z",
      };

      const count = countNodes(db, range);
      expect(count).toBe(2);
    });
  });

  // =============================================================================
  // countOccurrences Tests
  // =============================================================================

  describe("countOccurrences", () => {
    describe("quirk type", () => {
      it("should count matching quirk occurrences", () => {
        insertNode("n1", "2026-01-15T10:00:00Z");
        insertNode("n2", "2026-01-16T10:00:00Z");
        insertNode("n3", "2026-01-20T10:00:00Z"); // Outside range

        insertModelQuirk(
          "n1",
          "google/gemini-3-flash",
          "uses sed instead of read tool"
        );
        insertModelQuirk(
          "n2",
          "google/gemini-3-flash",
          "Uses sed instead of read tool"
        ); // Different case
        insertModelQuirk(
          "n3",
          "google/gemini-3-flash",
          "uses sed instead of read tool"
        ); // Outside range

        insertInsight(
          "test-quirk",
          "quirk",
          "uses sed instead of read tool",
          3,
          {
            model: "google/gemini-3-flash",
          }
        );

        const range: DateRange = {
          start: "2026-01-14T00:00:00Z",
          end: "2026-01-17T00:00:00Z",
        };

        const insight = {
          id: "test-quirk",
          type: "quirk" as const,
          model: "google/gemini-3-flash",
          pattern: "uses sed instead of read tool",
          frequency: 3,
          confidence: 0.75,
          severity: "medium" as const,
          examples: [],
          firstSeen: "2026-01-15T00:00:00Z",
          lastSeen: "2026-01-16T00:00:00Z",
          promptIncluded: false,
          updatedAt: "2026-01-16T00:00:00Z",
        };

        const count = countOccurrences(db, insight, range);
        expect(count).toBe(2);
      });
    });

    describe("tool_error type", () => {
      it("should count matching tool error occurrences", () => {
        insertNode("n1", "2026-01-15T10:00:00Z");
        insertNode("n2", "2026-01-16T10:00:00Z");

        insertToolError(
          "n1",
          "edit",
          "whitespace mismatch",
          "google/gemini-3-flash"
        );
        insertToolError(
          "n2",
          "edit",
          "whitespace mismatch",
          "google/gemini-3-flash"
        );
        insertToolError("n2", "read", "file not found"); // Different tool

        insertInsight(
          "test-error",
          "tool_error",
          "whitespace mismatch in edit",
          2,
          {
            tool: "edit",
            model: "google/gemini-3-flash",
          }
        );

        const range: DateRange = {
          start: "2026-01-14T00:00:00Z",
          end: "2026-01-17T00:00:00Z",
        };

        const insight = {
          id: "test-error",
          type: "tool_error" as const,
          model: "google/gemini-3-flash",
          tool: "edit",
          pattern: "whitespace mismatch in edit",
          frequency: 2,
          confidence: 0.75,
          severity: "medium" as const,
          examples: [],
          firstSeen: "2026-01-15T00:00:00Z",
          lastSeen: "2026-01-16T00:00:00Z",
          promptIncluded: false,
          updatedAt: "2026-01-16T00:00:00Z",
        };

        const count = countOccurrences(db, insight, range);
        expect(count).toBe(2);
      });
    });

    describe("lesson type", () => {
      it("should count matching lesson occurrences", () => {
        insertNode("n1", "2026-01-15T10:00:00Z");
        insertNode("n2", "2026-01-16T10:00:00Z");

        insertLesson("n1", "Always read file before editing", "tool");
        insertLesson("n2", "always read file before editing", "model"); // Different case
        insertLesson("n2", "Use specific prompts", "user"); // Different lesson

        insertInsight(
          "test-lesson",
          "lesson",
          "always read file before editing",
          2
        );

        const range: DateRange = {
          start: "2026-01-14T00:00:00Z",
          end: "2026-01-17T00:00:00Z",
        };

        const insight = {
          id: "test-lesson",
          type: "lesson" as const,
          pattern: "always read file before editing",
          frequency: 2,
          confidence: 0.75,
          severity: "low" as const,
          examples: [],
          firstSeen: "2026-01-15T00:00:00Z",
          lastSeen: "2026-01-16T00:00:00Z",
          promptIncluded: false,
          updatedAt: "2026-01-16T00:00:00Z",
        };

        const count = countOccurrences(db, insight, range);
        expect(count).toBe(2);
      });
    });
  });

  // =============================================================================
  // calculateAverageSeverity Tests
  // =============================================================================

  describe("calculateAverageSeverity", () => {
    it("should return 0.9 for high severity", () => {
      const insight = {
        id: "test",
        type: "quirk" as const,
        pattern: "test pattern",
        frequency: 5,
        confidence: 0.75,
        severity: "high" as const,
        examples: [],
        firstSeen: "2026-01-15T00:00:00Z",
        lastSeen: "2026-01-16T00:00:00Z",
        promptIncluded: false,
        updatedAt: "2026-01-16T00:00:00Z",
      };

      expect(calculateAverageSeverity(insight, 5)).toBe(0.9);
    });

    it("should return 0.5 for medium severity", () => {
      const insight = {
        id: "test",
        type: "quirk" as const,
        pattern: "test pattern",
        frequency: 5,
        confidence: 0.75,
        severity: "medium" as const,
        examples: [],
        firstSeen: "2026-01-15T00:00:00Z",
        lastSeen: "2026-01-16T00:00:00Z",
        promptIncluded: false,
        updatedAt: "2026-01-16T00:00:00Z",
      };

      expect(calculateAverageSeverity(insight, 5)).toBe(0.5);
    });

    it("should return 0.2 for low severity", () => {
      const insight = {
        id: "test",
        type: "quirk" as const,
        pattern: "test pattern",
        frequency: 5,
        confidence: 0.75,
        severity: "low" as const,
        examples: [],
        firstSeen: "2026-01-15T00:00:00Z",
        lastSeen: "2026-01-16T00:00:00Z",
        promptIncluded: false,
        updatedAt: "2026-01-16T00:00:00Z",
      };

      expect(calculateAverageSeverity(insight, 5)).toBe(0.2);
    });
  });

  // =============================================================================
  // isStatisticallySignificant Tests
  // =============================================================================

  describe("isStatisticallySignificant", () => {
    it("should return false when not enough sessions before", () => {
      const result = isStatisticallySignificant(5, 2, 5, 15, 10);
      expect(result).toBeFalsy();
    });

    it("should return false when not enough sessions after", () => {
      const result = isStatisticallySignificant(5, 2, 15, 5, 10);
      expect(result).toBeFalsy();
    });

    it("should return false when no occurrences at all", () => {
      const result = isStatisticallySignificant(0, 0, 20, 20, 10);
      expect(result).toBeFalsy();
    });

    it("should return true for significant difference", () => {
      // Large drop: 20 occurrences in 20 sessions -> 2 occurrences in 20 sessions
      const result = isStatisticallySignificant(20, 2, 20, 20, 10);
      expect(result).toBeTruthy();
    });

    it("should return false for insignificant difference", () => {
      // Small difference: 10 occurrences in 20 sessions -> 9 occurrences in 20 sessions
      const result = isStatisticallySignificant(10, 9, 20, 20, 10);
      expect(result).toBeFalsy();
    });
  });

  // =============================================================================
  // measureEffectiveness Tests
  // =============================================================================

  describe("measureEffectiveness", () => {
    it("should throw error for non-existent insight", () => {
      const beforePeriod: DateRange = {
        start: "2026-01-01T00:00:00Z",
        end: "2026-01-15T00:00:00Z",
      };
      const afterPeriod: DateRange = {
        start: "2026-01-16T00:00:00Z",
        end: "2026-01-31T00:00:00Z",
      };

      expect(() =>
        measureEffectiveness(db, "non-existent", beforePeriod, afterPeriod)
      ).toThrow("Insight not found: non-existent");
    });

    it("should calculate improvement correctly", () => {
      // Before period: 2 quirks in 2 sessions (rate = 1.0)
      insertNode("n1", "2026-01-05T10:00:00Z", "/test/session1.jsonl");
      insertNode("n2", "2026-01-10T10:00:00Z", "/test/session2.jsonl");
      insertModelQuirk("n1", "google/gemini-3-flash", "uses sed to read files");
      insertModelQuirk("n2", "google/gemini-3-flash", "uses sed to read files");

      // After period: 1 quirk in 2 sessions (rate = 0.5)
      insertNode("n3", "2026-01-20T10:00:00Z", "/test/session3.jsonl");
      insertNode("n4", "2026-01-25T10:00:00Z", "/test/session4.jsonl");
      insertModelQuirk("n3", "google/gemini-3-flash", "uses sed to read files");

      insertInsight("test-insight", "quirk", "uses sed to read files", 3, {
        model: "google/gemini-3-flash",
      });

      const beforePeriod: DateRange = {
        start: "2026-01-01T00:00:00Z",
        end: "2026-01-15T00:00:00Z",
      };
      const afterPeriod: DateRange = {
        start: "2026-01-16T00:00:00Z",
        end: "2026-01-31T00:00:00Z",
      };

      const result = measureEffectiveness(
        db,
        "test-insight",
        beforePeriod,
        afterPeriod
      );

      expect(result.insightId).toBe("test-insight");
      expect(result.beforeRate).toBe(1); // 2 quirks / 2 sessions
      expect(result.afterRate).toBe(0.5); // 1 quirk / 2 sessions
      expect(result.improvement).toBe(50); // 50% improvement
    });

    it("should return 0 improvement when before rate is 0", () => {
      // No quirks before or after
      insertNode("n1", "2026-01-05T10:00:00Z", "/test/session1.jsonl");
      insertNode("n2", "2026-01-20T10:00:00Z", "/test/session2.jsonl");

      insertInsight("test-insight", "quirk", "nonexistent pattern", 0, {
        model: "google/gemini-3-flash",
      });

      const beforePeriod: DateRange = {
        start: "2026-01-01T00:00:00Z",
        end: "2026-01-15T00:00:00Z",
      };
      const afterPeriod: DateRange = {
        start: "2026-01-16T00:00:00Z",
        end: "2026-01-31T00:00:00Z",
      };

      const result = measureEffectiveness(
        db,
        "test-insight",
        beforePeriod,
        afterPeriod
      );

      expect(result.improvement).toBe(0);
    });
  });

  // =============================================================================
  // measureAndStoreEffectiveness Tests
  // =============================================================================

  describe("measureAndStoreEffectiveness", () => {
    it("should store effectiveness record in database", () => {
      insertNode("n1", "2026-01-05T10:00:00Z", "/test/session1.jsonl");
      insertNode("n2", "2026-01-20T10:00:00Z", "/test/session2.jsonl");
      insertModelQuirk("n1", "google/gemini-3-flash", "uses sed to read files");

      insertInsight("test-insight", "quirk", "uses sed to read files", 1, {
        model: "google/gemini-3-flash",
        severity: "high",
      });

      const beforePeriod: DateRange = {
        start: "2026-01-01T00:00:00Z",
        end: "2026-01-15T00:00:00Z",
      };
      const afterPeriod: DateRange = {
        start: "2026-01-16T00:00:00Z",
        end: "2026-01-31T00:00:00Z",
      };

      const result = measureAndStoreEffectiveness(
        db,
        "test-insight",
        beforePeriod,
        afterPeriod,
        "v1.0.0"
      );

      expect(result.insightId).toBe("test-insight");
      expect(result.promptVersion).toBe("v1.0.0");
      expect(result.beforeStart).toBe(beforePeriod.start);
      expect(result.beforeEnd).toBe(beforePeriod.end);
      expect(result.afterStart).toBe(afterPeriod.start);
      expect(result.afterEnd).toBe(afterPeriod.end);

      // Verify stored in database
      const stored = db
        .prepare("SELECT * FROM prompt_effectiveness WHERE insight_id = ?")
        .get("test-insight") as { improvement_pct: number } | undefined;

      expect(stored).toBeDefined();
      expect(stored?.improvement_pct).toBe(result.improvementPct);
    });

    it("should update existing record for same insight and version", () => {
      insertNode("n1", "2026-01-05T10:00:00Z", "/test/session1.jsonl");

      insertInsight("test-insight", "quirk", "test pattern", 1, {
        model: "google/gemini-3-flash",
      });

      const beforePeriod: DateRange = {
        start: "2026-01-01T00:00:00Z",
        end: "2026-01-15T00:00:00Z",
      };
      const afterPeriod: DateRange = {
        start: "2026-01-16T00:00:00Z",
        end: "2026-01-31T00:00:00Z",
      };

      // First measurement
      const result1 = measureAndStoreEffectiveness(
        db,
        "test-insight",
        beforePeriod,
        afterPeriod,
        "v1.0.0"
      );

      // Second measurement - should update
      const result2 = measureAndStoreEffectiveness(
        db,
        "test-insight",
        beforePeriod,
        afterPeriod,
        "v1.0.0"
      );

      // Should have same ID (updated, not inserted)
      expect(result2.id).toBe(result1.id);

      // Should only have one record
      const count = db
        .prepare(
          "SELECT COUNT(*) as count FROM prompt_effectiveness WHERE insight_id = ?"
        )
        .get("test-insight") as { count: number };

      expect(count.count).toBe(1);
    });
  });

  // =============================================================================
  // getEffectivenessHistory Tests
  // =============================================================================

  describe("getEffectivenessHistory", () => {
    it("should return empty array for insight without measurements", () => {
      const history = getEffectivenessHistory(db, "non-existent");
      expect(history).toStrictEqual([]);
    });

    it("should return measurements ordered by measured_at desc", () => {
      insertNode("n1", "2026-01-05T10:00:00Z", "/test/session1.jsonl");
      insertNode("n2", "2026-01-20T10:00:00Z", "/test/session2.jsonl");

      insertInsight("test-insight", "quirk", "test pattern", 1, {
        model: "google/gemini-3-flash",
      });

      // Insert two measurements with different prompt versions and explicit timestamps
      db.prepare(`
      INSERT INTO prompt_effectiveness (
        id, insight_id, prompt_version,
        before_occurrences, before_severity,
        after_occurrences, after_severity,
        before_start, before_end, after_start, after_end,
        improvement_pct, statistically_significant,
        sessions_before, sessions_after,
        measured_at, created_at, updated_at
      ) VALUES (
        'eff-1', 'test-insight', 'v1.0.0',
        5, 0.5, 3, 0.5,
        '2026-01-01T00:00:00Z', '2026-01-15T00:00:00Z',
        '2026-01-16T00:00:00Z', '2026-01-31T00:00:00Z',
        40.0, 0, 10, 10,
        '2026-02-01T10:00:00Z', '2026-02-01T10:00:00Z', '2026-02-01T10:00:00Z'
      )
    `).run();

      db.prepare(`
      INSERT INTO prompt_effectiveness (
        id, insight_id, prompt_version,
        before_occurrences, before_severity,
        after_occurrences, after_severity,
        before_start, before_end, after_start, after_end,
        improvement_pct, statistically_significant,
        sessions_before, sessions_after,
        measured_at, created_at, updated_at
      ) VALUES (
        'eff-2', 'test-insight', 'v2.0.0',
        5, 0.5, 1, 0.5,
        '2026-01-01T00:00:00Z', '2026-01-15T00:00:00Z',
        '2026-01-16T00:00:00Z', '2026-01-31T00:00:00Z',
        80.0, 1, 15, 15,
        '2026-02-15T10:00:00Z', '2026-02-15T10:00:00Z', '2026-02-15T10:00:00Z'
      )
    `).run();

      const history = getEffectivenessHistory(db, "test-insight");

      expect(history).toHaveLength(2);
      // Most recent first (v2.0.0 has later measured_at)
      expect(history[0].promptVersion).toBe("v2.0.0");
      expect(history[1].promptVersion).toBe("v1.0.0");
    });
  });

  // =============================================================================
  // getLatestEffectiveness Tests
  // =============================================================================

  describe("getLatestEffectiveness", () => {
    it("should return null for insight without measurements", () => {
      const result = getLatestEffectiveness(db, "non-existent");
      expect(result).toBeNull();
    });

    it("should return the most recent measurement", () => {
      insertNode("n1", "2026-01-05T10:00:00Z", "/test/session1.jsonl");

      insertInsight("test-insight", "quirk", "test pattern", 1, {
        model: "google/gemini-3-flash",
      });

      // Insert two measurements with different prompt versions and explicit timestamps
      db.prepare(`
      INSERT INTO prompt_effectiveness (
        id, insight_id, prompt_version,
        before_occurrences, before_severity,
        after_occurrences, after_severity,
        before_start, before_end, after_start, after_end,
        improvement_pct, statistically_significant,
        sessions_before, sessions_after,
        measured_at, created_at, updated_at
      ) VALUES (
        'eff-1', 'test-insight', 'v1.0.0',
        5, 0.5, 3, 0.5,
        '2026-01-01T00:00:00Z', '2026-01-15T00:00:00Z',
        '2026-01-16T00:00:00Z', '2026-01-31T00:00:00Z',
        40.0, 0, 10, 10,
        '2026-02-01T10:00:00Z', '2026-02-01T10:00:00Z', '2026-02-01T10:00:00Z'
      )
    `).run();

      db.prepare(`
      INSERT INTO prompt_effectiveness (
        id, insight_id, prompt_version,
        before_occurrences, before_severity,
        after_occurrences, after_severity,
        before_start, before_end, after_start, after_end,
        improvement_pct, statistically_significant,
        sessions_before, sessions_after,
        measured_at, created_at, updated_at
      ) VALUES (
        'eff-2', 'test-insight', 'v2.0.0',
        5, 0.5, 1, 0.5,
        '2026-01-01T00:00:00Z', '2026-01-15T00:00:00Z',
        '2026-01-16T00:00:00Z', '2026-01-31T00:00:00Z',
        80.0, 1, 15, 15,
        '2026-02-15T10:00:00Z', '2026-02-15T10:00:00Z', '2026-02-15T10:00:00Z'
      )
    `).run();

      const result = getLatestEffectiveness(db, "test-insight");

      expect(result).not.toBeNull();
      expect(result?.promptVersion).toBe("v2.0.0");
    });
  });

  // =============================================================================
  // getInsightsNeedingMeasurement Tests
  // =============================================================================

  describe("getInsightsNeedingMeasurement", () => {
    it("should return insights included in prompts without measurements", () => {
      insertInsight("insight-1", "quirk", "pattern 1", 5, {
        model: "google/gemini-3-flash",
        promptIncluded: true,
      });
      insertInsight("insight-2", "quirk", "pattern 2", 3, {
        model: "google/gemini-3-flash",
        promptIncluded: false, // Not included
      });
      insertInsight("insight-3", "quirk", "pattern 3", 8, {
        model: "google/gemini-3-flash",
        promptIncluded: true,
      });

      const needing = getInsightsNeedingMeasurement(db, 7);

      expect(needing).toHaveLength(2);
      // Ordered by frequency desc
      expect(needing[0].id).toBe("insight-3");
      expect(needing[1].id).toBe("insight-1");
    });

    it("should exclude insights measured recently", () => {
      insertNode("n1", "2026-01-05T10:00:00Z", "/test/session1.jsonl");

      insertInsight("insight-1", "quirk", "pattern 1", 5, {
        model: "google/gemini-3-flash",
        promptIncluded: true,
      });

      // Measure this insight
      const period: DateRange = {
        start: "2026-01-01T00:00:00Z",
        end: "2026-01-31T00:00:00Z",
      };
      measureAndStoreEffectiveness(db, "insight-1", period, period, "v1.0.0");

      // Measurement was just now, so with 7 days cutoff, it should not need measurement
      const needing = getInsightsNeedingMeasurement(db, 7);

      expect(needing).toHaveLength(0);
    });
  });
}); // Close the main describe block
