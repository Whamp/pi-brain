/**
 * Tests for embedding-utils
 */

import { describe, expect, it } from "vitest";

import type { Node } from "../types/index.js";

import {
  buildEmbeddingText,
  buildSimpleEmbeddingText,
  EMBEDDING_FORMAT_VERSION,
  isRichEmbeddingFormat,
} from "./embedding-utils.js";

/**
 * Create a minimal Node for testing.
 *
 * Accepts only top-level overrides that replace entire sub-objects.
 * This ensures nested required fields aren't accidentally omitted.
 */
function createTestNode(
  overrides: {
    id?: string;
    version?: number;
    previousVersions?: string[];
    source?: Node["source"];
    classification?: Node["classification"];
    content?: Node["content"];
    lessons?: Node["lessons"];
    observations?: Node["observations"];
    metadata?: Node["metadata"];
    semantic?: Node["semantic"];
    daemonMeta?: Node["daemonMeta"];
  } = {}
): Node {
  const defaults: Node = {
    id: "test-node-id",
    version: 1,
    previousVersions: [],
    source: {
      sessionFile: "/test/session.jsonl",
      segment: {
        startEntryId: "00000001",
        endEntryId: "00000010",
        entryCount: 10,
      },
      computer: "test-host",
      sessionId: "test-session-id",
    },
    classification: {
      type: "coding",
      project: "/test/project",
      isNewProject: false,
      hadClearGoal: true,
    },
    content: {
      summary: "Test summary",
      outcome: "success",
      keyDecisions: [],
      filesTouched: [],
      toolsUsed: [],
      errorsSeen: [],
    },
    lessons: {
      project: [],
      task: [],
      user: [],
      model: [],
      tool: [],
      skill: [],
      subagent: [],
    },
    observations: {
      modelsUsed: [],
      promptingWins: [],
      promptingFailures: [],
      modelQuirks: [],
      toolUseErrors: [],
    },
    metadata: {
      tokensUsed: 1000,
      cost: 0.01,
      durationMinutes: 5,
      timestamp: "2026-01-27T12:00:00Z",
      analyzedAt: "2026-01-27T12:05:00Z",
      analyzerVersion: "v1",
    },
    semantic: {
      tags: [],
      topics: [],
    },
    daemonMeta: {
      decisions: [],
      rlmUsed: false,
    },
  };

  return {
    ...defaults,
    ...overrides,
  };
}

describe("buildEmbeddingText", () => {
  it("should include type, summary, and version marker", () => {
    const node = createTestNode({
      classification: {
        type: "debugging",
        project: "/test",
        isNewProject: false,
        hadClearGoal: true,
      },
      content: {
        summary: "Fixed a bug in the parser",
        outcome: "success",
        keyDecisions: [],
        filesTouched: [],
        toolsUsed: [],
        errorsSeen: [],
      },
    });

    const text = buildEmbeddingText(node);

    expect(text).toBe(
      `[debugging] Fixed a bug in the parser\n\n${EMBEDDING_FORMAT_VERSION}`
    );
  });

  it("should include decisions when present", () => {
    const node = createTestNode({
      content: {
        summary: "Implemented rate limiting",
        outcome: "success",
        keyDecisions: [
          {
            what: "Used token bucket algorithm",
            why: "predictable behavior under burst traffic",
            alternativesConsidered: ["leaky bucket"],
          },
          {
            what: "Chose Redis for storage",
            why: "shared state across instances",
            alternativesConsidered: ["in-memory"],
          },
        ],
        filesTouched: [],
        toolsUsed: [],
        errorsSeen: [],
      },
    });

    const text = buildEmbeddingText(node);

    expect(text).toContain("[coding] Implemented rate limiting");
    expect(text).toContain("\n\nDecisions:");
    expect(text).toContain(
      "- Used token bucket algorithm (why: predictable behavior under burst traffic)"
    );
    expect(text).toContain(
      "- Chose Redis for storage (why: shared state across instances)"
    );
  });

  it("should include lessons from all levels", () => {
    const node = createTestNode({
      content: {
        summary: "Database optimization session",
        outcome: "success",
        keyDecisions: [],
        filesTouched: [],
        toolsUsed: [],
        errorsSeen: [],
      },
      lessons: {
        project: [
          {
            level: "project",
            summary: "Use connection pooling for SQLite",
            details: "Improves performance under load",
            confidence: "high",
            tags: ["sqlite", "performance"],
          },
        ],
        task: [],
        user: [
          {
            level: "user",
            summary: "Be specific about performance requirements",
            details: "Helps the model focus on the right optimizations",
            confidence: "medium",
            tags: ["prompting"],
          },
        ],
        model: [
          {
            level: "model",
            summary: "Claude tends to over-engineer database solutions",
            details: "Start with simple solutions first",
            confidence: "high",
            tags: ["claude"],
          },
        ],
        tool: [],
        skill: [],
        subagent: [],
      },
    });

    const text = buildEmbeddingText(node);

    expect(text).toContain("\n\nLessons:");
    expect(text).toContain("- Use connection pooling for SQLite");
    expect(text).toContain("- Be specific about performance requirements");
    expect(text).toContain(
      "- Claude tends to over-engineer database solutions"
    );
  });

  it("should handle nodes with both decisions and lessons", () => {
    const node = createTestNode({
      classification: {
        type: "refactoring",
        project: "/test",
        isNewProject: false,
        hadClearGoal: true,
      },
      content: {
        summary: "Refactored authentication module",
        outcome: "success",
        keyDecisions: [
          {
            what: "Split into separate files",
            why: "improve maintainability",
            alternativesConsidered: [],
          },
        ],
        filesTouched: ["auth.ts"],
        toolsUsed: ["edit"],
        errorsSeen: [],
      },
      lessons: {
        project: [],
        task: [
          {
            level: "task",
            summary: "Refactor in small incremental steps",
            details: "Reduces risk of breaking changes",
            confidence: "high",
            tags: ["refactoring"],
          },
        ],
        user: [],
        model: [],
        tool: [],
        skill: [],
        subagent: [],
      },
    });

    const text = buildEmbeddingText(node);

    // Check order: summary, then decisions, then lessons
    const decisionIndex = text.indexOf("\nDecisions:");
    const lessonIndex = text.indexOf("\nLessons:");

    expect(decisionIndex).toBeGreaterThan(0);
    expect(lessonIndex).toBeGreaterThan(decisionIndex);
    expect(text).toContain(
      "- Split into separate files (why: improve maintainability)"
    );
    expect(text).toContain("- Refactor in small incremental steps");
  });

  it("should handle empty decisions and lessons", () => {
    const node = createTestNode({
      content: {
        summary: "Quick fix for typo",
        outcome: "success",
        keyDecisions: [],
        filesTouched: [],
        toolsUsed: [],
        errorsSeen: [],
      },
      lessons: {
        project: [],
        task: [],
        user: [],
        model: [],
        tool: [],
        skill: [],
        subagent: [],
      },
    });

    const text = buildEmbeddingText(node);

    expect(text).toBe(
      `[coding] Quick fix for typo\n\n${EMBEDDING_FORMAT_VERSION}`
    );
    expect(text).not.toContain("Decisions:");
    expect(text).not.toContain("Lessons:");
  });
});

describe("buildSimpleEmbeddingText", () => {
  it("should format type and summary", () => {
    const text = buildSimpleEmbeddingText("debugging", "Fixed parser bug");
    expect(text).toBe("[debugging] Fixed parser bug");
  });

  it("should handle null type", () => {
    const text = buildSimpleEmbeddingText(null, "Some summary");
    expect(text).toBe("Some summary");
  });

  it("should handle null summary", () => {
    const text = buildSimpleEmbeddingText("coding", null);
    expect(text).toBe("[coding]");
  });

  it("should handle both null", () => {
    const text = buildSimpleEmbeddingText(null, null);
    expect(text).toBe("");
  });
});

describe("isRichEmbeddingFormat", () => {
  it("should return true for text with Decisions section", () => {
    const text = "[coding] Summary\n\nDecisions:\n- Decision 1";
    expect(isRichEmbeddingFormat(text)).toBeTruthy();
  });

  it("should return true for text with Lessons section", () => {
    const text = "[coding] Summary\n\nLessons:\n- Lesson 1";
    expect(isRichEmbeddingFormat(text)).toBeTruthy();
  });

  it("should return true for text with both sections", () => {
    const text =
      "[coding] Summary\n\nDecisions:\n- Decision 1\n\nLessons:\n- Lesson 1";
    expect(isRichEmbeddingFormat(text)).toBeTruthy();
  });

  it("should return false for simple format", () => {
    const text = "[coding] Summary only";
    expect(isRichEmbeddingFormat(text)).toBeFalsy();
  });

  it("should return false for text mentioning decisions without section", () => {
    const text = "[coding] Made some decisions about the architecture";
    expect(isRichEmbeddingFormat(text)).toBeFalsy();
  });

  it("should return false for text without [type] prefix", () => {
    const text = "Summary\n\nDecisions:\n- Decision 1";
    expect(isRichEmbeddingFormat(text)).toBeFalsy();
  });

  it("should return false for user content containing Decisions: text", () => {
    // Edge case: user summary that happens to contain "\nDecisions:" text
    const text = "[coding] User wrote about\nDecisions: what to do next";
    expect(isRichEmbeddingFormat(text)).toBeFalsy();
  });

  it("should return true for text with version marker", () => {
    // Node with no decisions/lessons but marked as new format
    const text = `[coding] Summary only\n\n${EMBEDDING_FORMAT_VERSION}`;
    expect(isRichEmbeddingFormat(text)).toBeTruthy();
  });

  it("should return true for text with version marker and sections", () => {
    const text = `[coding] Summary\n\nDecisions:\n- Decision 1\n\n${EMBEDDING_FORMAT_VERSION}`;
    expect(isRichEmbeddingFormat(text)).toBeTruthy();
  });
});
