/**
 * Tests for parser module
 */

import { describe, expect, it, vi } from "vitest";

import type {
  AssistantMessage,
  LabelEntry,
  SessionEntry,
  SessionInfoEntry,
  SessionMessageEntry,
  UserMessage,
} from "../types/index.js";

import {
  buildTree,
  calculateStats,
  extractTextPreview,
  findBranchPoints,
  findLeaf,
  getEntry,
  getPathToEntry,
  parseSessionContent,
} from "./session.js";

// =============================================================================
// Test Helpers
// =============================================================================

function createMessageEntry(
  id: string,
  parentId: string | null,
  role: "user" | "assistant" | "toolResult",
  options: {
    timestamp?: string;
    content?: string;
    provider?: string;
    model?: string;
    usage?: {
      input: number;
      output: number;
      cost?: {
        input: number;
        output: number;
        cacheRead: number;
        cacheWrite: number;
        total: number;
      };
    };
  } = {}
): SessionMessageEntry {
  const timestamp =
    options.timestamp ?? `2024-01-01T00:00:00.${id.padStart(3, "0")}Z`;

  if (role === "user") {
    return {
      type: "message",
      id,
      parentId,
      timestamp,
      message: {
        role: "user",
        content: options.content ?? `User message ${id}`,
      },
    };
  }

  if (role === "assistant") {
    return {
      type: "message",
      id,
      parentId,
      timestamp,
      message: {
        role: "assistant",
        content: [
          { type: "text", text: options.content ?? `Assistant message ${id}` },
        ],
        provider: options.provider ?? "anthropic",
        model: options.model ?? "claude-3",
        usage: options.usage,
      },
    };
  }

  return {
    type: "message",
    id,
    parentId,
    timestamp,
    message: {
      role: "toolResult",
      toolCallId: `tool-${id}`,
      toolName: "read",
      content: [{ type: "text", text: options.content ?? `Tool result ${id}` }],
      isError: false,
    },
  };
}

function createLabelEntry(
  id: string,
  parentId: string | null,
  targetId: string,
  label?: string,
  timestamp?: string
): LabelEntry {
  return {
    type: "label",
    id,
    parentId,
    timestamp: timestamp ?? `2024-01-01T00:00:00.${id.padStart(3, "0")}Z`,
    targetId,
    label,
  };
}

function createSessionInfoEntry(
  id: string,
  parentId: string | null,
  name: string,
  timestamp?: string
): SessionInfoEntry {
  return {
    type: "session_info",
    id,
    parentId,
    timestamp: timestamp ?? `2024-01-01T00:00:00.${id.padStart(3, "0")}Z`,
    name,
  };
}

function createValidSessionContent(entries: SessionEntry[] = []): string {
  const header = JSON.stringify({
    type: "session",
    version: 3,
    id: "test-session",
    timestamp: "2024-01-01T00:00:00.000Z",
    cwd: "/test/project",
  });

  const entryLines = entries.map((e) => JSON.stringify(e));
  return [header, ...entryLines].join("\n");
}

// =============================================================================
// parseSessionContent Tests
// =============================================================================

describe("parseSessionContent", () => {
  describe("happy path", () => {
    it("parses a valid session with header only", () => {
      const content = createValidSessionContent();
      const result = parseSessionContent(content, "/test/session.jsonl");

      expect(result.header.type).toBe("session");
      expect(result.header.id).toBe("test-session");
      expect(result.header.cwd).toBe("/test/project");
      expect(result.entries).toStrictEqual([]);
      expect(result.path).toBe("/test/session.jsonl");
    });

    it("parses a session with entries", () => {
      const entries = [
        createMessageEntry("1", null, "user"),
        createMessageEntry("2", "1", "assistant"),
      ];
      const content = createValidSessionContent(entries);

      const result = parseSessionContent(content, "/test/session.jsonl");

      expect(result.entries).toHaveLength(2);
      expect(result.entries[0].id).toBe("1");
      expect(result.entries[1].id).toBe("2");
    });

    it("extracts session name from session_info entry", () => {
      const entries = [
        createMessageEntry("1", null, "user"),
        createSessionInfoEntry("2", "1", "My Session Name"),
      ];
      const content = createValidSessionContent(entries);

      const result = parseSessionContent(content, "/test/session.jsonl");

      expect(result.name).toBe("My Session Name");
    });

    it("uses latest session_info when multiple exist", () => {
      const entries = [
        createMessageEntry("1", null, "user"),
        createSessionInfoEntry(
          "2",
          "1",
          "First Name",
          "2024-01-01T00:00:00.000Z"
        ),
        createSessionInfoEntry(
          "3",
          "1",
          "Latest Name",
          "2024-01-01T01:00:00.000Z"
        ),
      ];
      const content = createValidSessionContent(entries);

      const result = parseSessionContent(content, "/test/session.jsonl");

      expect(result.name).toBe("Latest Name");
    });

    it("extracts first user message preview", () => {
      const entries = [
        createMessageEntry("1", null, "user", { content: "Hello, world!" }),
        createMessageEntry("2", "1", "assistant"),
      ];
      const content = createValidSessionContent(entries);

      const result = parseSessionContent(content, "/test/session.jsonl");

      expect(result.firstMessage).toBe("Hello, world!");
    });

    it("handles whitespace in content lines", () => {
      const header = JSON.stringify({
        type: "session",
        version: 3,
        id: "test",
        timestamp: "2024-01-01T00:00:00.000Z",
        cwd: "/test",
      });
      const entry = JSON.stringify(createMessageEntry("1", null, "user"));
      const content = `${header}\n  \n${entry}\n  \n`;

      const result = parseSessionContent(content, "/test/session.jsonl");

      expect(result.entries).toHaveLength(1);
    });
  });

  describe("error handling", () => {
    it("throws on empty file", () => {
      expect(() => parseSessionContent("", "/test/session.jsonl")).toThrow(
        "Unexpected end of JSON input"
      );
    });

    it("throws on whitespace-only file", () => {
      expect(() =>
        parseSessionContent("   \n  \n  ", "/test/session.jsonl")
      ).toThrow("Unexpected end of JSON input");
    });

    it("throws on invalid header type", () => {
      const content = JSON.stringify({ type: "not-session", id: "test" });

      expect(() => parseSessionContent(content, "/test/session.jsonl")).toThrow(
        'expected type "session"'
      );
    });

    it("throws on malformed JSON header", () => {
      const content = "not valid json";

      expect(() => parseSessionContent(content, "/test/session.jsonl")).toThrow(
        "Unexpected token"
      );
    });

    it("skips malformed entry lines gracefully", () => {
      const header = JSON.stringify({
        type: "session",
        version: 3,
        id: "test",
        timestamp: "2024-01-01T00:00:00.000Z",
        cwd: "/test",
      });
      const validEntry = JSON.stringify(createMessageEntry("1", null, "user"));
      const content = `${header}\nnot valid json\n${validEntry}`;

      // Suppress expected warning during test
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const result = parseSessionContent(content, "/test/session.jsonl");

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].id).toBe("1");
      expect(warnSpy).toHaveBeenCalledOnce();

      warnSpy.mockRestore();
    });
  });
});

// =============================================================================
// buildTree Tests
// =============================================================================

describe("buildTree", () => {
  describe("happy path", () => {
    it("returns null for empty entries", () => {
      const tree = buildTree([]);
      expect(tree).toBeNull();
    });

    it("builds single-node tree with correct structure", () => {
      const entries = [createMessageEntry("1", null, "user")];
      const tree = buildTree(entries);

      expect(tree).not.toBeNull();
      expect(tree?.entry.id).toBe("1");
      expect(tree?.depth).toBe(0);
      expect(tree?.children).toStrictEqual([]);
    });

    it("builds single-node tree with correct flags", () => {
      const entries = [createMessageEntry("1", null, "user")];
      const tree = buildTree(entries);

      expect(tree?.isLeaf).toBeTruthy();
      expect(tree?.isBranchPoint).toBeFalsy();
    });

    it("builds linear tree root correctly", () => {
      const entries = [
        createMessageEntry("1", null, "user", {
          timestamp: "2024-01-01T00:00:00.000Z",
        }),
        createMessageEntry("2", "1", "assistant", {
          timestamp: "2024-01-01T00:00:01.000Z",
        }),
        createMessageEntry("3", "2", "user", {
          timestamp: "2024-01-01T00:00:02.000Z",
        }),
      ];
      const tree = buildTree(entries);

      expect(tree?.entry.id).toBe("1");
      expect(tree?.depth).toBe(0);
      expect(tree?.children).toHaveLength(1);
    });

    it("builds linear tree descendants correctly", () => {
      const entries = [
        createMessageEntry("1", null, "user", {
          timestamp: "2024-01-01T00:00:00.000Z",
        }),
        createMessageEntry("2", "1", "assistant", {
          timestamp: "2024-01-01T00:00:01.000Z",
        }),
        createMessageEntry("3", "2", "user", {
          timestamp: "2024-01-01T00:00:02.000Z",
        }),
      ];
      const tree = buildTree(entries);

      expect(tree?.children[0].entry.id).toBe("2");
      expect(tree?.children[0].depth).toBe(1);
      expect(tree?.children[0].children[0].entry.id).toBe("3");
      expect(tree?.children[0].children[0].depth).toBe(2);
      expect(tree?.children[0].children[0].isLeaf).toBeTruthy();
    });

    it("builds branching tree", () => {
      const entries = [
        createMessageEntry("1", null, "user", {
          timestamp: "2024-01-01T00:00:00.000Z",
        }),
        createMessageEntry("2a", "1", "assistant", {
          timestamp: "2024-01-01T00:00:01.000Z",
        }),
        createMessageEntry("2b", "1", "assistant", {
          timestamp: "2024-01-01T00:00:02.000Z",
        }),
      ];
      const tree = buildTree(entries);

      expect(tree?.entry.id).toBe("1");
      expect(tree?.isBranchPoint).toBeTruthy();
      expect(tree?.children).toHaveLength(2);
      expect(tree?.children[0].entry.id).toBe("2a");
      expect(tree?.children[1].entry.id).toBe("2b");
    });

    it("sorts children by timestamp", () => {
      const entries = [
        createMessageEntry("1", null, "user", {
          timestamp: "2024-01-01T00:00:00.000Z",
        }),
        createMessageEntry("late", "1", "assistant", {
          timestamp: "2024-01-01T00:00:03.000Z",
        }),
        createMessageEntry("early", "1", "assistant", {
          timestamp: "2024-01-01T00:00:01.000Z",
        }),
        createMessageEntry("middle", "1", "assistant", {
          timestamp: "2024-01-01T00:00:02.000Z",
        }),
      ];
      const tree = buildTree(entries);

      expect(tree?.children.map((c) => c.entry.id)).toStrictEqual([
        "early",
        "middle",
        "late",
      ]);
    });
  });

  describe("labels", () => {
    it("collects labels for entries", () => {
      const entries: SessionEntry[] = [
        createMessageEntry("1", null, "user"),
        createLabelEntry("label1", "1", "1", "important"),
      ];
      const tree = buildTree(entries);

      expect(tree?.labels).toStrictEqual(["important"]);
    });

    it("collects multiple labels for same entry", () => {
      const entries: SessionEntry[] = [
        createMessageEntry("1", null, "user"),
        createLabelEntry("label1", "1", "1", "important"),
        createLabelEntry("label2", "1", "1", "reviewed"),
      ];
      const tree = buildTree(entries);

      expect(tree?.labels).toContain("important");
      expect(tree?.labels).toContain("reviewed");
    });

    it("excludes label entries from tree children", () => {
      const entries: SessionEntry[] = [
        createMessageEntry("1", null, "user"),
        createMessageEntry("2", "1", "assistant"),
        createLabelEntry("label1", "1", "1", "important"),
      ];
      const tree = buildTree(entries);

      expect(tree?.children).toHaveLength(1);
      expect(tree?.children[0].entry.type).toBe("message");
    });

    it("ignores labels with undefined label value", () => {
      const entries: SessionEntry[] = [
        createMessageEntry("1", null, "user"),
        createLabelEntry("label1", "1", "1"),
      ];
      const tree = buildTree(entries);

      expect(tree?.labels).toStrictEqual([]);
    });
  });

  describe("edge cases", () => {
    it("handles orphaned entries (missing parent)", () => {
      const entries = [
        createMessageEntry("1", null, "user"),
        createMessageEntry("orphan", "missing-parent", "assistant"),
      ];
      const tree = buildTree(entries);

      expect(tree?.entry.id).toBe("1");
      expect(tree?.children).toStrictEqual([]);
    });

    it("marks leaf correctly in complex tree", () => {
      const entries = [
        createMessageEntry("1", null, "user", {
          timestamp: "2024-01-01T00:00:00.000Z",
        }),
        createMessageEntry("2", "1", "assistant", {
          timestamp: "2024-01-01T00:00:01.000Z",
        }),
        createMessageEntry("3", "2", "user", {
          timestamp: "2024-01-01T00:00:02.000Z",
        }),
        createMessageEntry("4", "1", "assistant", {
          timestamp: "2024-01-01T00:00:03.000Z",
        }),
      ];
      const tree = buildTree(entries);

      expect(tree?.children[0].children[0].isLeaf).toBeFalsy();
      expect(tree?.children[1].isLeaf).toBeTruthy();
    });
  });
});

// =============================================================================
// findLeaf Tests
// =============================================================================

describe("findLeaf", () => {
  it("returns null for empty entries", () => {
    expect(findLeaf([])).toBeNull();
  });

  it("returns single entry as leaf", () => {
    const entries = [createMessageEntry("1", null, "user")];
    expect(findLeaf(entries)).toBe("1");
  });

  it("returns entry without children in linear chain", () => {
    const entries = [
      createMessageEntry("1", null, "user", {
        timestamp: "2024-01-01T00:00:00.000Z",
      }),
      createMessageEntry("2", "1", "assistant", {
        timestamp: "2024-01-01T00:00:01.000Z",
      }),
      createMessageEntry("3", "2", "user", {
        timestamp: "2024-01-01T00:00:02.000Z",
      }),
    ];
    expect(findLeaf(entries)).toBe("3");
  });

  it("returns latest entry among multiple leaves", () => {
    const entries = [
      createMessageEntry("1", null, "user", {
        timestamp: "2024-01-01T00:00:00.000Z",
      }),
      createMessageEntry("2a", "1", "assistant", {
        timestamp: "2024-01-01T00:00:01.000Z",
      }),
      createMessageEntry("2b", "1", "assistant", {
        timestamp: "2024-01-01T00:00:03.000Z",
      }),
    ];
    expect(findLeaf(entries)).toBe("2b");
  });

  it("handles complex branching with multiple leaves", () => {
    const entries = [
      createMessageEntry("1", null, "user", {
        timestamp: "2024-01-01T00:00:00.000Z",
      }),
      createMessageEntry("2", "1", "assistant", {
        timestamp: "2024-01-01T00:00:01.000Z",
      }),
      createMessageEntry("3a", "2", "user", {
        timestamp: "2024-01-01T00:00:02.000Z",
      }),
      createMessageEntry("3b", "2", "user", {
        timestamp: "2024-01-01T00:00:04.000Z",
      }),
      createMessageEntry("branch", "1", "assistant", {
        timestamp: "2024-01-01T00:00:03.000Z",
      }),
    ];
    expect(findLeaf(entries)).toBe("3b");
  });
});

// =============================================================================
// findBranchPoints Tests
// =============================================================================

describe("findBranchPoints", () => {
  it("returns empty array for empty entries", () => {
    expect(findBranchPoints([])).toStrictEqual([]);
  });

  it("returns empty array for linear chain", () => {
    const entries = [
      createMessageEntry("1", null, "user"),
      createMessageEntry("2", "1", "assistant"),
      createMessageEntry("3", "2", "user"),
    ];
    expect(findBranchPoints(entries)).toStrictEqual([]);
  });

  it("identifies single branch point", () => {
    const entries = [
      createMessageEntry("1", null, "user"),
      createMessageEntry("2a", "1", "assistant"),
      createMessageEntry("2b", "1", "assistant"),
    ];
    expect(findBranchPoints(entries)).toStrictEqual(["1"]);
  });

  it("identifies multiple branch points", () => {
    const entries = [
      createMessageEntry("1", null, "user"),
      createMessageEntry("2a", "1", "assistant"),
      createMessageEntry("2b", "1", "assistant"),
      createMessageEntry("3a", "2a", "user"),
      createMessageEntry("3b", "2a", "user"),
    ];
    const branchPoints = findBranchPoints(entries);

    expect(branchPoints).toContain("1");
    expect(branchPoints).toContain("2a");
    expect(branchPoints).toHaveLength(2);
  });

  it("requires more than one child for branch point", () => {
    const entries = [
      createMessageEntry("1", null, "user"),
      createMessageEntry("2", "1", "assistant"),
    ];
    expect(findBranchPoints(entries)).toStrictEqual([]);
  });
});

// =============================================================================
// calculateStats Tests
// =============================================================================

describe("calculateStats", () => {
  it("returns zeroed message counts for empty entries", () => {
    const stats = calculateStats([], null);

    expect(stats.entryCount).toBe(0);
    expect(stats.messageCount).toBe(0);
    expect(stats.userMessageCount).toBe(0);
    expect(stats.assistantMessageCount).toBe(0);
    expect(stats.toolResultCount).toBe(0);
  });

  it("returns zeroed special counts for empty entries", () => {
    const stats = calculateStats([], null);

    expect(stats.compactionCount).toBe(0);
    expect(stats.branchSummaryCount).toBe(0);
    expect(stats.branchPointCount).toBe(0);
  });

  it("returns zeroed usage stats for empty entries", () => {
    const stats = calculateStats([], null);

    expect(stats.totalTokens).toBe(0);
    expect(stats.totalCost).toBe(0);
    expect(stats.maxDepth).toBe(0);
    expect(stats.modelsUsed).toStrictEqual([]);
  });

  it("counts message types correctly", () => {
    const entries = [
      createMessageEntry("1", null, "user"),
      createMessageEntry("2", "1", "assistant"),
      createMessageEntry("3", "2", "toolResult"),
      createMessageEntry("4", "3", "user"),
    ];
    const tree = buildTree(entries);
    const stats = calculateStats(entries, tree);

    expect(stats.messageCount).toBe(4);
    expect(stats.userMessageCount).toBe(2);
    expect(stats.assistantMessageCount).toBe(1);
    expect(stats.toolResultCount).toBe(1);
  });

  it("counts compaction and branch summary entries", () => {
    const entries: SessionEntry[] = [
      createMessageEntry("1", null, "user"),
      {
        type: "compaction",
        id: "2",
        parentId: "1",
        timestamp: "2024-01-01T00:00:01.000Z",
        summary: "Compacted",
        firstKeptEntryId: "1",
        tokensBefore: 1000,
      },
      {
        type: "branch_summary",
        id: "3",
        parentId: "2",
        timestamp: "2024-01-01T00:00:02.000Z",
        fromId: "1",
        summary: "Branch summary",
      },
    ];
    const stats = calculateStats(entries, null);

    expect(stats.compactionCount).toBe(1);
    expect(stats.branchSummaryCount).toBe(1);
  });

  it("aggregates token usage from assistant messages", () => {
    const entries = [
      createMessageEntry("1", null, "user"),
      createMessageEntry("2", "1", "assistant", {
        usage: { input: 100, output: 50 },
      }),
      createMessageEntry("3", "2", "user"),
      createMessageEntry("4", "3", "assistant", {
        usage: { input: 200, output: 75 },
      }),
    ];
    const stats = calculateStats(entries, null);

    expect(stats.totalTokens).toBe(100 + 50 + 200 + 75);
  });

  it("aggregates cost from assistant messages", () => {
    const entries = [
      createMessageEntry("1", null, "user"),
      createMessageEntry("2", "1", "assistant", {
        usage: {
          input: 100,
          output: 50,
          cost: {
            input: 0.003,
            output: 0.005,
            cacheRead: 0,
            cacheWrite: 0.002,
            total: 0.01,
          },
        },
      }),
      createMessageEntry("3", "2", "user"),
      createMessageEntry("4", "3", "assistant", {
        usage: {
          input: 200,
          output: 75,
          cost: {
            input: 0.006,
            output: 0.01,
            cacheRead: 0,
            cacheWrite: 0.004,
            total: 0.02,
          },
        },
      }),
    ];
    const stats = calculateStats(entries, null);

    expect(stats.totalCost).toBeCloseTo(0.03);
  });

  it("tracks models used", () => {
    const entries = [
      createMessageEntry("1", null, "user"),
      createMessageEntry("2", "1", "assistant", {
        provider: "anthropic",
        model: "claude-3",
      }),
      createMessageEntry("3", "2", "user"),
      createMessageEntry("4", "3", "assistant", {
        provider: "openai",
        model: "gpt-4",
      }),
      createMessageEntry("5", "4", "user"),
      createMessageEntry("6", "5", "assistant", {
        provider: "anthropic",
        model: "claude-3",
      }),
    ];
    const stats = calculateStats(entries, null);

    expect(stats.modelsUsed).toContain("anthropic/claude-3");
    expect(stats.modelsUsed).toContain("openai/gpt-4");
    expect(stats.modelsUsed).toHaveLength(2);
  });

  it("counts branch points", () => {
    const entries = [
      createMessageEntry("1", null, "user"),
      createMessageEntry("2a", "1", "assistant"),
      createMessageEntry("2b", "1", "assistant"),
    ];
    const stats = calculateStats(entries, null);

    expect(stats.branchPointCount).toBe(1);
  });

  it("calculates max depth from tree", () => {
    const entries = [
      createMessageEntry("1", null, "user", {
        timestamp: "2024-01-01T00:00:00.000Z",
      }),
      createMessageEntry("2", "1", "assistant", {
        timestamp: "2024-01-01T00:00:01.000Z",
      }),
      createMessageEntry("3", "2", "user", {
        timestamp: "2024-01-01T00:00:02.000Z",
      }),
      createMessageEntry("4", "3", "assistant", {
        timestamp: "2024-01-01T00:00:03.000Z",
      }),
    ];
    const tree = buildTree(entries);
    const stats = calculateStats(entries, tree);

    expect(stats.maxDepth).toBe(3);
  });

  it("handles missing usage data gracefully", () => {
    const entries = [
      createMessageEntry("1", null, "user"),
      createMessageEntry("2", "1", "assistant"),
    ];
    const stats = calculateStats(entries, null);

    expect(stats.totalTokens).toBe(0);
    expect(stats.totalCost).toBe(0);
  });
});

// =============================================================================
// extractTextPreview Tests
// =============================================================================

describe("extractTextPreview", () => {
  it("extracts text from string content", () => {
    const message: UserMessage = {
      role: "user",
      content: "Hello, world!",
    };

    expect(extractTextPreview(message)).toBe("Hello, world!");
  });

  it("extracts text from array content with text block", () => {
    const message: AssistantMessage = {
      role: "assistant",
      content: [{ type: "text", text: "Response text" }],
      provider: "anthropic",
      model: "claude-3",
    };

    expect(extractTextPreview(message)).toBe("Response text");
  });

  it("finds first text block in mixed content", () => {
    const message: AssistantMessage = {
      role: "assistant",
      content: [
        { type: "thinking", thinking: "Internal thoughts" },
        { type: "text", text: "Visible response" },
      ],
      provider: "anthropic",
      model: "claude-3",
    };

    expect(extractTextPreview(message)).toBe("Visible response");
  });

  it("truncates long text with ellipsis", () => {
    const message: UserMessage = {
      role: "user",
      content: "A".repeat(150),
    };

    const preview = extractTextPreview(message, 100);

    expect(preview).toHaveLength(100);
    expect(preview.endsWith("...")).toBeTruthy();
  });

  it("normalizes whitespace", () => {
    const message: UserMessage = {
      role: "user",
      content: "  Hello\n\n  world  \t  test  ",
    };

    expect(extractTextPreview(message)).toBe("Hello world test");
  });

  it("returns empty string for content with no text blocks", () => {
    const message: AssistantMessage = {
      role: "assistant",
      content: [{ type: "thinking", thinking: "Just thinking" }],
      provider: "anthropic",
      model: "claude-3",
    };

    expect(extractTextPreview(message)).toBe("");
  });

  it("respects custom max length", () => {
    const message: UserMessage = {
      role: "user",
      content: "Hello, world!",
    };

    expect(extractTextPreview(message, 8)).toBe("Hello...");
  });

  it("does not truncate text at or below max length", () => {
    const message: UserMessage = {
      role: "user",
      content: "Exact",
    };

    expect(extractTextPreview(message, 5)).toBe("Exact");
  });
});

// =============================================================================
// getPathToEntry Tests
// =============================================================================

describe("getPathToEntry", () => {
  it("returns empty array for non-existent entry", () => {
    const entries = [createMessageEntry("1", null, "user")];

    expect(getPathToEntry(entries, "nonexistent")).toStrictEqual([]);
  });

  it("returns single entry path for root", () => {
    const entries = [createMessageEntry("1", null, "user")];
    const path = getPathToEntry(entries, "1");

    expect(path).toHaveLength(1);
    expect(path[0].id).toBe("1");
  });

  it("returns full path from root to target", () => {
    const entries = [
      createMessageEntry("1", null, "user"),
      createMessageEntry("2", "1", "assistant"),
      createMessageEntry("3", "2", "user"),
      createMessageEntry("4", "3", "assistant"),
    ];
    const path = getPathToEntry(entries, "4");

    expect(path.map((e) => e.id)).toStrictEqual(["1", "2", "3", "4"]);
  });

  it("handles branching - returns path to specific branch", () => {
    const entries = [
      createMessageEntry("1", null, "user"),
      createMessageEntry("2a", "1", "assistant"),
      createMessageEntry("2b", "1", "assistant"),
      createMessageEntry("3a", "2a", "user"),
    ];
    const path = getPathToEntry(entries, "3a");

    expect(path.map((e) => e.id)).toStrictEqual(["1", "2a", "3a"]);
  });

  it("handles missing parent in chain gracefully", () => {
    const entries = [createMessageEntry("orphan", "missing", "user")];
    const path = getPathToEntry(entries, "orphan");

    expect(path.map((e) => e.id)).toStrictEqual(["orphan"]);
  });
});

// =============================================================================
// getEntry Tests
// =============================================================================

describe("getEntry", () => {
  it("returns undefined for empty entries", () => {
    expect(getEntry([], "1")).toBeUndefined();
  });

  it("returns undefined for non-existent id", () => {
    const entries = [createMessageEntry("1", null, "user")];
    expect(getEntry(entries, "nonexistent")).toBeUndefined();
  });

  it("finds entry by id", () => {
    const entries = [
      createMessageEntry("1", null, "user"),
      createMessageEntry("2", "1", "assistant"),
      createMessageEntry("3", "2", "user"),
    ];

    const entry = getEntry(entries, "2");
    expect(entry).toBeDefined();
    expect(entry?.id).toBe("2");
  });

  it("returns first match when duplicate ids exist", () => {
    const entries = [
      createMessageEntry("dup", null, "user", { content: "First" }),
      createMessageEntry("dup", null, "user", { content: "Second" }),
    ];

    const entry = getEntry(entries, "dup");
    const msgEntry = entry as SessionMessageEntry;
    const userMsg = msgEntry.message as UserMessage;
    expect(userMsg.content).toBe("First");
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe("parser integration", () => {
  function createRealisticSession() {
    const entries: SessionEntry[] = [
      createMessageEntry("msg1", null, "user", {
        timestamp: "2024-01-01T10:00:00.000Z",
        content: "Help me write a function",
      }),
      createMessageEntry("msg2", "msg1", "assistant", {
        timestamp: "2024-01-01T10:00:05.000Z",
        provider: "anthropic",
        model: "claude-sonnet-4-20250514",
        usage: {
          input: 500,
          output: 200,
          cost: {
            input: 0.001,
            output: 0.003,
            cacheRead: 0,
            cacheWrite: 0.001,
            total: 0.005,
          },
        },
      }),
      createMessageEntry("msg3", "msg2", "toolResult", {
        timestamp: "2024-01-01T10:00:10.000Z",
      }),
      createMessageEntry("msg4", "msg3", "assistant", {
        timestamp: "2024-01-01T10:00:15.000Z",
        provider: "anthropic",
        model: "claude-sonnet-4-20250514",
        usage: {
          input: 800,
          output: 300,
          cost: {
            input: 0.002,
            output: 0.005,
            cacheRead: 0,
            cacheWrite: 0.001,
            total: 0.008,
          },
        },
      }),
      createSessionInfoEntry(
        "info1",
        "msg4",
        "Coding Session",
        "2024-01-01T10:00:20.000Z"
      ),
      createLabelEntry(
        "lbl1",
        "msg4",
        "msg2",
        "checkpoint",
        "2024-01-01T10:00:21.000Z"
      ),
    ];
    return createValidSessionContent(entries);
  }

  it("parses realistic session basic structure", () => {
    const content = createRealisticSession();
    const result = parseSessionContent(content, "/test/session.jsonl");

    expect(result.entries).toHaveLength(6);
    expect(result.name).toBe("Coding Session");
    expect(result.firstMessage).toBe("Help me write a function");
  });

  it("parses realistic session tree structure", () => {
    const content = createRealisticSession();
    const result = parseSessionContent(content, "/test/session.jsonl");

    expect(result.tree).not.toBeNull();
    expect(result.tree?.entry.id).toBe("msg1");
    expect(result.leafId).toBe("lbl1");
  });

  it("parses realistic session message stats", () => {
    const content = createRealisticSession();
    const result = parseSessionContent(content, "/test/session.jsonl");

    expect(result.stats.entryCount).toBe(6);
    expect(result.stats.userMessageCount).toBe(1);
    expect(result.stats.assistantMessageCount).toBe(2);
    expect(result.stats.toolResultCount).toBe(1);
  });

  it("parses realistic session usage stats", () => {
    const content = createRealisticSession();
    const result = parseSessionContent(content, "/test/session.jsonl");

    expect(result.stats.totalTokens).toBe(500 + 200 + 800 + 300);
    expect(result.stats.totalCost).toBeCloseTo(0.013);
  });

  it("parses realistic session model list", () => {
    const content = createRealisticSession();
    const result = parseSessionContent(content, "/test/session.jsonl");

    expect(result.stats.modelsUsed).toStrictEqual([
      "anthropic/claude-sonnet-4-20250514",
    ]);
  });

  it("parses realistic session labels", () => {
    const content = createRealisticSession();
    const result = parseSessionContent(content, "/test/session.jsonl");

    const msgNode = result.tree?.children[0];
    expect(msgNode?.labels).toContain("checkpoint");
  });

  it("handles session with branching correctly", () => {
    const entries = [
      createMessageEntry("1", null, "user", {
        timestamp: "2024-01-01T00:00:00.000Z",
      }),
      createMessageEntry("2", "1", "assistant", {
        timestamp: "2024-01-01T00:00:01.000Z",
      }),
      createMessageEntry("3a", "2", "user", {
        timestamp: "2024-01-01T00:00:02.000Z",
      }),
      createMessageEntry("3b", "2", "user", {
        timestamp: "2024-01-01T00:00:03.000Z",
      }),
      createMessageEntry("4a", "3a", "assistant", {
        timestamp: "2024-01-01T00:00:04.000Z",
      }),
    ];

    const content = createValidSessionContent(entries);
    const result = parseSessionContent(content, "/test/session.jsonl");

    expect(result.stats.branchPointCount).toBe(1);
    expect(result.tree?.children[0].isBranchPoint).toBeTruthy();
    expect(result.leafId).toBe("4a");
  });
});
