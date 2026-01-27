/**
 * Tests for friction signal detection
 */

import { describe, expect, it } from "vitest";

import type {
  AssistantMessage,
  SessionEntry,
  SessionMessageEntry,
  ToolResultMessage,
  UserMessage,
} from "../types.js";

import {
  calculateFrictionScore,
  countContextChurn,
  countRephrasingCascades,
  countToolLoops,
  detectFrictionSignals,
  detectModelSwitch,
  detectSilentTermination,
  extractManualFlags,
  getFilesTouched,
  getPrimaryModel,
  hasFileOverlap,
  isAbandonedRestart,
} from "./signals.js";

// =============================================================================
// Test Helpers
// =============================================================================

function createUserMessage(text: string, id: string): SessionMessageEntry {
  return {
    type: "message",
    id,
    parentId: null,
    timestamp: new Date().toISOString(),
    message: {
      role: "user",
      content: text,
    } as UserMessage,
  };
}

function createAssistantMessage(
  text: string,
  id: string,
  options?: {
    hasToolCall?: boolean;
    provider?: string;
    model?: string;
  }
): SessionMessageEntry {
  const content: {
    type: string;
    text?: string;
    name?: string;
    id?: string;
    arguments?: Record<string, unknown>;
  }[] = [];

  if (text) {
    content.push({ type: "text", text });
  }

  if (options?.hasToolCall) {
    content.push({
      type: "toolCall",
      id: "call-1",
      name: "read",
      arguments: { path: "/dummy/path" },
    });
  }

  return {
    type: "message",
    id,
    parentId: null,
    timestamp: new Date().toISOString(),
    message: {
      role: "assistant",
      content,
      provider: options?.provider ?? "anthropic",
      model: options?.model ?? "claude-sonnet",
    } as unknown as AssistantMessage,
  };
}

function createToolResult(
  toolName: string,
  isError: boolean,
  content: string,
  id: string
): SessionMessageEntry {
  return {
    type: "message",
    id,
    parentId: null,
    timestamp: new Date().toISOString(),
    message: {
      role: "toolResult",
      toolCallId: "call-1",
      toolName,
      content: [{ type: "text", text: content }],
      isError,
    } as unknown as ToolResultMessage,
  };
}

function createReadToolCall(filePath: string, id: string): SessionMessageEntry {
  return {
    type: "message",
    id,
    parentId: null,
    timestamp: new Date().toISOString(),
    message: {
      role: "assistant",
      content: [
        {
          type: "toolCall",
          id: "call-read",
          name: "read",
          arguments: { path: filePath },
        },
      ],
      provider: "anthropic",
      model: "claude-sonnet",
    } as unknown as AssistantMessage,
  };
}

function createBashToolCall(command: string, id: string): SessionMessageEntry {
  return {
    type: "message",
    id,
    parentId: null,
    timestamp: new Date().toISOString(),
    message: {
      role: "assistant",
      content: [
        {
          type: "toolCall",
          id: "call-bash",
          name: "bash",
          arguments: { command },
        },
      ],
      provider: "anthropic",
      model: "claude-sonnet",
    } as unknown as AssistantMessage,
  };
}

// =============================================================================
// countRephrasingCascades Tests
// =============================================================================

describe("countRephrasingCascades", () => {
  it("should return 0 for empty entries", () => {
    expect(countRephrasingCascades([])).toBe(0);
  });

  it("should return 0 when user messages get meaningful responses", () => {
    const entries: SessionEntry[] = [
      createUserMessage("Please read the file", "1"),
      createAssistantMessage("Here is the content", "2", { hasToolCall: true }),
      createUserMessage("Now edit it", "3"),
      createAssistantMessage("Done editing", "4", { hasToolCall: true }),
    ];
    expect(countRephrasingCascades(entries)).toBe(0);
  });

  it("should count cascade when 3+ user messages without meaningful response", () => {
    const entries: SessionEntry[] = [
      createUserMessage("Do something", "1"),
      createAssistantMessage("short", "2"), // Too short, not meaningful
      createUserMessage("I said do something", "3"),
      createAssistantMessage("ok", "4"), // Too short
      createUserMessage("Please understand", "5"),
      createAssistantMessage("working on it", "6"), // Too short
      createUserMessage("Finally", "7"),
      createAssistantMessage("Done!", "8", { hasToolCall: true }), // Meaningful
    ];
    expect(countRephrasingCascades(entries)).toBe(1);
  });

  it("should count multiple cascades", () => {
    const entries: SessionEntry[] = [
      // First cascade
      createUserMessage("First attempt", "1"),
      createAssistantMessage("?", "2"),
      createUserMessage("Second attempt", "3"),
      createAssistantMessage("?", "4"),
      createUserMessage("Third attempt", "5"),
      createAssistantMessage("Done!", "6", { hasToolCall: true }),
      // Second cascade
      createUserMessage("New task", "7"),
      createAssistantMessage("hm", "8"),
      createUserMessage("Rephrase new task", "9"),
      createAssistantMessage("ok", "10"),
      createUserMessage("Again", "11"),
    ];
    expect(countRephrasingCascades(entries)).toBe(2);
  });

  it("should not count cascade if only 2 consecutive user messages", () => {
    const entries: SessionEntry[] = [
      createUserMessage("First", "1"),
      createAssistantMessage("short", "2"),
      createUserMessage("Second", "3"),
      createAssistantMessage("Done!", "4", { hasToolCall: true }),
    ];
    expect(countRephrasingCascades(entries)).toBe(0);
  });
});

// =============================================================================
// countToolLoops Tests
// =============================================================================

describe("countToolLoops", () => {
  it("should return 0 for empty entries", () => {
    expect(countToolLoops([])).toBe(0);
  });

  it("should return 0 when no tool errors", () => {
    const entries: SessionEntry[] = [
      createToolResult("read", false, "file content", "1"),
      createToolResult("bash", false, "command output", "2"),
    ];
    expect(countToolLoops(entries)).toBe(0);
  });

  it("should count tool loop when same error occurs 3+ times", () => {
    const entries: SessionEntry[] = [
      createToolResult("edit", true, "File not found: /path/to/file", "1"),
      createToolResult("edit", true, "File not found: /path/to/file", "2"),
      createToolResult("edit", true, "File not found: /path/to/file", "3"),
    ];
    expect(countToolLoops(entries)).toBe(1);
  });

  it("should count multiple different tool loops", () => {
    const entries: SessionEntry[] = [
      // First loop: edit errors
      createToolResult("edit", true, "File not found", "1"),
      createToolResult("edit", true, "File not found", "2"),
      createToolResult("edit", true, "File not found", "3"),
      // Second loop: bash errors
      createToolResult("bash", true, "Command not found: foo", "4"),
      createToolResult("bash", true, "Command not found: foo", "5"),
      createToolResult("bash", true, "Command not found: foo", "6"),
    ];
    expect(countToolLoops(entries)).toBe(2);
  });

  it("should not count if errors are different", () => {
    const entries: SessionEntry[] = [
      createToolResult("edit", true, "File not found", "1"),
      createToolResult("edit", true, "Permission denied", "2"),
      createToolResult("edit", true, "Syntax error", "3"),
    ];
    expect(countToolLoops(entries)).toBe(0);
  });

  it("should normalize error messages for comparison", () => {
    const entries: SessionEntry[] = [
      createToolResult("read", true, "Error at line 10: something wrong", "1"),
      createToolResult("read", true, "Error at line 20: something wrong", "2"),
      createToolResult("read", true, "Error at line 30: something wrong", "3"),
    ];
    // Line numbers are normalized, so these should be seen as the same error
    expect(countToolLoops(entries)).toBe(1);
  });
});

// =============================================================================
// countContextChurn Tests
// =============================================================================

describe("countContextChurn", () => {
  it("should return 0 for empty entries", () => {
    expect(countContextChurn([])).toBe(0);
  });

  it("should return 0 when below threshold", () => {
    const entries: SessionEntry[] = [
      createReadToolCall("/file1.ts", "1"),
      createReadToolCall("/file2.ts", "2"),
      createReadToolCall("/file3.ts", "3"),
    ];
    expect(countContextChurn(entries)).toBe(0);
  });

  it("should count churn when many different files are read", () => {
    const entries: SessionEntry[] = [];
    for (let i = 0; i < 15; i++) {
      entries.push(createReadToolCall(`/file${i}.ts`, `${i}`));
    }
    expect(countContextChurn(entries)).toBe(1);
  });

  it("should not count duplicate file reads", () => {
    const entries: SessionEntry[] = [];
    for (let i = 0; i < 15; i++) {
      // Reading same 3 files repeatedly
      entries.push(createReadToolCall(`/file${i % 3}.ts`, `${i}`));
    }
    // Only 3 unique files, below threshold
    expect(countContextChurn(entries)).toBe(0);
  });

  it("should count ls commands toward churn", () => {
    const entries: SessionEntry[] = [];
    for (let i = 0; i < 5; i++) {
      entries.push(createReadToolCall(`/file${i}.ts`, `r${i}`));
      entries.push(createBashToolCall(`ls /dir${i}`, `l${i}`));
    }
    // 5 reads + 5 ls = 10, equals threshold
    expect(countContextChurn(entries)).toBe(1);
  });
});

// =============================================================================
// detectModelSwitch Tests
// =============================================================================

describe("detectModelSwitch", () => {
  it("should return undefined when no previous model", () => {
    const entries: SessionEntry[] = [
      createAssistantMessage("Hello", "1", {
        provider: "anthropic",
        model: "claude-sonnet",
      }),
    ];
    expect(detectModelSwitch(entries)).toBeUndefined();
  });

  it("should return undefined when same model as previous", () => {
    const entries: SessionEntry[] = [
      createAssistantMessage("Hello", "1", {
        provider: "anthropic",
        model: "claude-sonnet",
      }),
    ];
    expect(
      detectModelSwitch(entries, "anthropic/claude-sonnet")
    ).toBeUndefined();
  });

  it("should return previous model when switch detected", () => {
    const entries: SessionEntry[] = [
      createAssistantMessage("Hello", "1", {
        provider: "google",
        model: "gemini-3-flash",
      }),
    ];
    expect(detectModelSwitch(entries, "anthropic/claude-sonnet")).toBe(
      "anthropic/claude-sonnet"
    );
  });
});

// =============================================================================
// detectSilentTermination Tests
// =============================================================================

describe("detectSilentTermination", () => {
  it("should return false if not last segment", () => {
    const entries: SessionEntry[] = [
      createToolResult("edit", true, "Error occurred", "1"),
    ];
    expect(detectSilentTermination(entries, false, false)).toBeFalsy();
  });

  it("should return false if was resumed", () => {
    const entries: SessionEntry[] = [
      createToolResult("edit", true, "Error occurred", "1"),
    ];
    expect(detectSilentTermination(entries, true, true)).toBeFalsy();
  });

  it("should return true when ends with unresolved error", () => {
    const entries: SessionEntry[] = [
      createUserMessage("Do something", "1"),
      createAssistantMessage("Trying", "2", { hasToolCall: true }),
      createToolResult("edit", true, "Error occurred", "3"),
    ];
    expect(detectSilentTermination(entries, true, false)).toBeTruthy();
  });

  it("should return false when user expresses success", () => {
    const entries: SessionEntry[] = [
      createUserMessage("Do something", "1"),
      createAssistantMessage("Trying", "2", { hasToolCall: true }),
      createToolResult("edit", true, "Error occurred", "3"),
      createUserMessage("Thanks, that's perfect!", "4"),
    ];
    expect(detectSilentTermination(entries, true, false)).toBeFalsy();
  });
});

// =============================================================================
// extractManualFlags Tests
// =============================================================================

describe("extractManualFlags", () => {
  it("should return empty array for no flags", () => {
    const entries: SessionEntry[] = [createUserMessage("Hello", "1")];
    expect(extractManualFlags(entries)).toStrictEqual([]);
  });

  it("should extract brain_flag custom entries", () => {
    const entries: SessionEntry[] = [
      createUserMessage("Hello", "1"),
      {
        type: "custom",
        id: "2",
        parentId: null,
        timestamp: "2026-01-26T10:00:00.000Z",
        customType: "brain_flag",
        data: {
          type: "quirk",
          message: "Claude keeps using sed instead of read",
        },
      } as unknown as SessionEntry,
    ];
    const flags = extractManualFlags(entries);
    expect(flags).toHaveLength(1);
    expect(flags[0]).toStrictEqual({
      type: "quirk",
      message: "Claude keeps using sed instead of read",
      timestamp: "2026-01-26T10:00:00.000Z",
    });
  });

  it("should default to note type if type not specified", () => {
    const entries: SessionEntry[] = [
      {
        type: "custom",
        id: "1",
        parentId: null,
        timestamp: "2026-01-26T10:00:00.000Z",
        customType: "brain_flag",
        data: {
          message: "Just a note",
        },
      } as unknown as SessionEntry,
    ];
    const flags = extractManualFlags(entries);
    expect(flags[0]?.type).toBe("note");
  });
});

// =============================================================================
// calculateFrictionScore Tests
// =============================================================================

describe("calculateFrictionScore", () => {
  it("should return 0 for no friction", () => {
    const friction = {
      score: 0,
      rephrasingCount: 0,
      contextChurnCount: 0,
      abandonedRestart: false,
      toolLoopCount: 0,
      silentTermination: false,
    };
    expect(calculateFrictionScore(friction)).toBe(0);
  });

  it("should cap at 1.0", () => {
    const friction = {
      score: 0,
      rephrasingCount: 10,
      contextChurnCount: 10,
      abandonedRestart: true,
      toolLoopCount: 10,
      modelSwitchFrom: "other/model",
      silentTermination: true,
    };
    expect(calculateFrictionScore(friction)).toBe(1);
  });

  it("should weight different factors correctly", () => {
    // One rephrasing cascade
    const friction1 = {
      score: 0,
      rephrasingCount: 1,
      contextChurnCount: 0,
      abandonedRestart: false,
      toolLoopCount: 0,
      silentTermination: false,
    };
    expect(calculateFrictionScore(friction1)).toBeCloseTo(0.15, 2);

    // One tool loop (higher weight)
    const friction2 = {
      score: 0,
      rephrasingCount: 0,
      contextChurnCount: 0,
      abandonedRestart: false,
      toolLoopCount: 1,
      silentTermination: false,
    };
    expect(calculateFrictionScore(friction2)).toBeCloseTo(0.2, 2);

    // Abandoned restart (high friction)
    const friction3 = {
      score: 0,
      rephrasingCount: 0,
      contextChurnCount: 0,
      abandonedRestart: true,
      toolLoopCount: 0,
      silentTermination: false,
    };
    expect(calculateFrictionScore(friction3)).toBeCloseTo(0.3, 2);
  });
});

// =============================================================================
// detectFrictionSignals Tests
// =============================================================================

describe("detectFrictionSignals", () => {
  it("should detect all signals in a complex session", () => {
    const entries: SessionEntry[] = [
      // Rephrasing cascade
      createUserMessage("Do X", "1"),
      createAssistantMessage("?", "2"),
      createUserMessage("I mean do X", "3"),
      createAssistantMessage("ok", "4"),
      createUserMessage("X please", "5"),
      createAssistantMessage("Done", "6", { hasToolCall: true }),
      // Tool loop
      createToolResult("edit", true, "File not found", "7"),
      createToolResult("edit", true, "File not found", "8"),
      createToolResult("edit", true, "File not found", "9"),
    ];

    const signals = detectFrictionSignals(entries);
    expect(signals.rephrasingCount).toBe(1);
    expect(signals.toolLoopCount).toBe(1);
    expect(signals.score).toBeGreaterThan(0);
  });

  it("should detect model switch", () => {
    const entries: SessionEntry[] = [
      createAssistantMessage("Hello", "1", {
        provider: "google",
        model: "gemini-3-flash",
      }),
    ];
    const signals = detectFrictionSignals(entries, {
      previousSegmentModel: "anthropic/claude-sonnet",
    });
    expect(signals.modelSwitchFrom).toBe("anthropic/claude-sonnet");
  });
});

// =============================================================================
// File Overlap Tests
// =============================================================================

describe("getFilesTouched", () => {
  it("should extract file paths from tool calls", () => {
    const entries: SessionEntry[] = [
      createReadToolCall("/src/index.ts", "1"),
      createReadToolCall("/src/types.ts", "2"),
    ];
    const files = getFilesTouched(entries);
    expect(files.has("/src/index.ts")).toBeTruthy();
    expect(files.has("/src/types.ts")).toBeTruthy();
    expect(files.size).toBe(2);
  });
});

describe("hasFileOverlap", () => {
  it("should return false for empty sets", () => {
    expect(hasFileOverlap(new Set(), new Set())).toBeFalsy();
  });

  it("should detect overlap above threshold", () => {
    const files1 = new Set(["/a.ts", "/b.ts", "/c.ts"]);
    const files2 = new Set(["/a.ts", "/b.ts", "/d.ts"]);
    // 2/3 = 0.67 > 0.3 threshold
    expect(hasFileOverlap(files1, files2)).toBeTruthy();
  });

  it("should return false for low overlap", () => {
    const files1 = new Set(["/a.ts", "/b.ts", "/c.ts", "/d.ts", "/e.ts"]);
    const files2 = new Set(["/a.ts", "/x.ts", "/y.ts", "/z.ts", "/w.ts"]);
    // 1/5 = 0.2 < 0.3 threshold
    expect(hasFileOverlap(files1, files2)).toBeFalsy();
  });
});

describe("getPrimaryModel", () => {
  it("should return undefined for empty entries", () => {
    expect(getPrimaryModel([])).toBeUndefined();
  });

  it("should return the most used model", () => {
    const entries: SessionEntry[] = [
      createAssistantMessage("1", "1", {
        provider: "anthropic",
        model: "claude",
      }),
      createAssistantMessage("2", "2", {
        provider: "anthropic",
        model: "claude",
      }),
      createAssistantMessage("3", "3", { provider: "google", model: "gemini" }),
    ];
    expect(getPrimaryModel(entries)).toBe("anthropic/claude");
  });
});

describe("isAbandonedRestart", () => {
  const baseTime = new Date("2026-01-26T10:00:00.000Z");

  it("should return false if segment A not abandoned", () => {
    const segmentA = {
      entries: [],
      outcome: "success",
      endTime: baseTime.toISOString(),
    };
    const segmentB = {
      entries: [],
      startTime: new Date(baseTime.getTime() + 5 * 60 * 1000).toISOString(),
    };
    expect(isAbandonedRestart(segmentA, segmentB)).toBeFalsy();
  });

  it("should return false if too much time between segments", () => {
    const segmentA = {
      entries: [createReadToolCall("/file.ts", "1")],
      outcome: "abandoned",
      endTime: baseTime.toISOString(),
    };
    const segmentB = {
      entries: [createReadToolCall("/file.ts", "2")],
      startTime: new Date(baseTime.getTime() + 60 * 60 * 1000).toISOString(), // 1 hour
    };
    expect(isAbandonedRestart(segmentA, segmentB)).toBeFalsy();
  });

  it("should return true for abandoned restart within window", () => {
    const segmentA = {
      entries: [createReadToolCall("/src/index.ts", "1")],
      outcome: "abandoned",
      endTime: baseTime.toISOString(),
    };
    const segmentB = {
      entries: [createReadToolCall("/src/index.ts", "2")],
      startTime: new Date(baseTime.getTime() + 10 * 60 * 1000).toISOString(), // 10 min
    };
    expect(isAbandonedRestart(segmentA, segmentB)).toBeTruthy();
  });

  it("should return false if no file overlap", () => {
    const segmentA = {
      entries: [createReadToolCall("/src/a.ts", "1")],
      outcome: "abandoned",
      endTime: baseTime.toISOString(),
    };
    const segmentB = {
      entries: [createReadToolCall("/src/b.ts", "2")],
      startTime: new Date(baseTime.getTime() + 10 * 60 * 1000).toISOString(),
    };
    expect(isAbandonedRestart(segmentA, segmentB)).toBeFalsy();
  });
});
