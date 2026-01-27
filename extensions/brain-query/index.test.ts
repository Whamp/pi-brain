import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

import { describe, it, expect, vi, beforeEach } from "vitest";

import brainExtension from "./index.js";

describe("brainExtension", () => {
  it("should register command and tool", () => {
    const pi = {
      registerCommand: vi.fn(),
      registerTool: vi.fn(),
    } as unknown as ExtensionAPI;

    brainExtension(pi);

    expect(pi.registerCommand).toHaveBeenCalledWith(
      "brain",
      expect.objectContaining({
        description: "Query the pi-brain knowledge graph",
        handler: expect.any(Function),
      })
    );

    expect(pi.registerTool).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "brain_query",
        label: "Brain Query",
        description: expect.stringContaining("Query the pi-brain"),
        parameters: expect.any(Object),
        execute: expect.any(Function),
      })
    );
  });
});

describe("/brain --flag command", () => {
  let pi: ReturnType<typeof createMockPi>;
  let ctx: ReturnType<typeof createMockCtx>;
  let commandHandler: (args: string, ctx: unknown) => Promise<void>;

  function createMockPi() {
    return {
      registerCommand: vi.fn(),
      registerTool: vi.fn(),
      appendEntry: vi.fn(),
    };
  }

  function createMockCtx() {
    return {
      ui: {
        notify: vi.fn(),
      },
      cwd: "/test/project",
      model: null,
    };
  }

  beforeEach(() => {
    pi = createMockPi();
    ctx = createMockCtx();
    brainExtension(pi as unknown as ExtensionAPI);
    // Extract the command handler
    commandHandler = pi.registerCommand.mock.calls[0][1].handler;
  });

  it("should show usage when no input provided", async () => {
    await commandHandler("", ctx);

    expect(ctx.ui.notify).toHaveBeenCalledWith(
      "Usage: /brain <question> | --flag <type> <message> | generate agents.md for <model>",
      "error"
    );
  });

  it("should record a flag with --flag syntax", async () => {
    await commandHandler("--flag quirk Claude uses sed instead of read", ctx);

    expect(pi.appendEntry).toHaveBeenCalledWith("brain_flag", {
      type: "quirk",
      message: "Claude uses sed instead of read",
    });
    expect(ctx.ui.notify).toHaveBeenCalledWith(
      "Recorded quirk: Claude uses sed instead of read",
      "info"
    );
  });

  it("should record a flag with -f short syntax", async () => {
    await commandHandler("-f fail This approach did not work", ctx);

    expect(pi.appendEntry).toHaveBeenCalledWith("brain_flag", {
      type: "fail",
      message: "This approach did not work",
    });
    expect(ctx.ui.notify).toHaveBeenCalledWith(
      "Recorded fail: This approach did not work",
      "info"
    );
  });

  it("should record a flag with --flag:type colon syntax", async () => {
    await commandHandler("--flag:win One-shot implementation succeeded", ctx);

    expect(pi.appendEntry).toHaveBeenCalledWith("brain_flag", {
      type: "win",
      message: "One-shot implementation succeeded",
    });
  });

  it("should record a flag with -f:type colon syntax", async () => {
    await commandHandler("-f:note Remember to check edge cases", ctx);

    expect(pi.appendEntry).toHaveBeenCalledWith("brain_flag", {
      type: "note",
      message: "Remember to check edge cases",
    });
  });

  it("should accept all valid flag types", async () => {
    const types = ["quirk", "fail", "win", "note"] as const;

    for (const type of types) {
      pi.appendEntry.mockClear();
      await commandHandler(`--flag ${type} Test message for ${type}`, ctx);
      expect(pi.appendEntry).toHaveBeenCalledWith("brain_flag", {
        type,
        message: `Test message for ${type}`,
      });
    }
  });

  it("should error on invalid flag type", async () => {
    await commandHandler("--flag invalid This is a test", ctx);

    expect(pi.appendEntry).not.toHaveBeenCalled();
    expect(ctx.ui.notify).toHaveBeenCalledWith(
      'Invalid flag type "invalid". Valid types: quirk, fail, win, note',
      "error"
    );
  });

  it("should error on missing flag type", async () => {
    await commandHandler("--flag", ctx);

    expect(pi.appendEntry).not.toHaveBeenCalled();
    expect(ctx.ui.notify).toHaveBeenCalledWith(
      expect.stringContaining("Missing flag type"),
      "error"
    );
  });

  it("should error on missing message", async () => {
    await commandHandler("--flag quirk", ctx);

    expect(pi.appendEntry).not.toHaveBeenCalled();
    expect(ctx.ui.notify).toHaveBeenCalledWith(
      expect.stringContaining("Missing message"),
      "error"
    );
  });

  it("should error on missing message with colon syntax", async () => {
    await commandHandler("--flag:note", ctx);

    expect(pi.appendEntry).not.toHaveBeenCalled();
    expect(ctx.ui.notify).toHaveBeenCalledWith(
      expect.stringContaining("Missing message"),
      "error"
    );
  });

  it("should treat input without --flag as a query", async () => {
    // Mock fetch to simulate query behavior
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("Network error"));

    await commandHandler("why did auth fail?", ctx);

    expect(pi.appendEntry).not.toHaveBeenCalled();
    expect(ctx.ui.notify).toHaveBeenCalledWith(
      expect.stringContaining("Query failed"),
      "error"
    );

    fetchSpy.mockRestore();
  });

  it("should handle flag type case-insensitively", async () => {
    await commandHandler("--flag QUIRK Uppercase type test", ctx);

    expect(pi.appendEntry).toHaveBeenCalledWith("brain_flag", {
      type: "quirk",
      message: "Uppercase type test",
    });
  });

  it("should handle colon syntax flag type case-insensitively", async () => {
    await commandHandler("--flag:QUIRK Uppercase colon type test", ctx);

    expect(pi.appendEntry).toHaveBeenCalledWith("brain_flag", {
      type: "quirk",
      message: "Uppercase colon type test",
    });
  });

  it("should not match -flag as a flag command", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("Network error"));

    await commandHandler("-flag quirk test", ctx);

    expect(pi.appendEntry).not.toHaveBeenCalled();
    // Treated as query, not flag
    expect(fetchSpy).toHaveBeenCalled();

    fetchSpy.mockRestore();
  });

  it("should handle messages with multiple words", async () => {
    await commandHandler("--flag note Message with multiple words here", ctx);

    expect(pi.appendEntry).toHaveBeenCalledWith("brain_flag", {
      type: "note",
      message: "Message with multiple words here",
    });
  });
});

describe("/brain generate agents.md command", () => {
  let pi: ReturnType<typeof createMockPi>;
  let ctx: ReturnType<typeof createMockCtx>;
  let commandHandler: (args: string, ctx: unknown) => Promise<void>;

  function createMockPi() {
    return {
      registerCommand: vi.fn(),
      registerTool: vi.fn(),
      appendEntry: vi.fn(),
      sendUserMessage: vi.fn(),
    };
  }

  function createMockCtx() {
    return {
      ui: {
        notify: vi.fn(),
      },
      cwd: "/test/project",
      model: null,
    };
  }

  beforeEach(() => {
    pi = createMockPi();
    ctx = createMockCtx();
    brainExtension(pi as unknown as ExtensionAPI);
    // Extract the command handler
    commandHandler = pi.registerCommand.mock.calls[0][1].handler;
  });

  it("should parse generate agents.md for <model> command", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      json: async () => ({
        status: "success",
        model: "zai/glm-4.7",
        outputPath: "/home/user/.pi/agent/contexts/zai_glm-4.7.md",
        stats: {
          quirksIncluded: 3,
          winsIncluded: 2,
          toolErrorsIncluded: 1,
          failuresIncluded: 0,
          lessonsIncluded: 1,
          clustersIncluded: 0,
        },
      }),
    } as Response);

    await commandHandler("generate agents.md for zai/glm-4.7", ctx);

    expect(fetchSpy).toHaveBeenCalledWith(
      "http://localhost:8765/api/v1/agents/generate/zai%2Fglm-4.7",
      expect.objectContaining({
        method: "POST",
      })
    );

    expect(ctx.ui.notify).toHaveBeenCalledWith(
      "Generating AGENTS.md for zai/glm-4.7...",
      "info"
    );

    expect(ctx.ui.notify).toHaveBeenCalledWith(
      expect.stringContaining("/home/user/.pi/agent/contexts/zai_glm-4.7.md"),
      "info"
    );

    fetchSpy.mockRestore();
  });

  it("should handle missing model in generate command", async () => {
    await commandHandler("generate agents.md for", ctx);

    expect(ctx.ui.notify).toHaveBeenCalledWith(
      expect.stringContaining("Missing model"),
      "error"
    );
  });

  it("should handle API errors", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      json: async () => ({
        status: "error",
        error: "No insights found",
      }),
    } as Response);

    await commandHandler("generate agents.md for unknown/model", ctx);

    expect(ctx.ui.notify).toHaveBeenCalledWith(
      "Failed: No insights found",
      "error"
    );

    fetchSpy.mockRestore();
  });

  it("should handle network errors", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("Connection refused"));

    await commandHandler("generate agents.md for zai/glm-4.7", ctx);

    expect(ctx.ui.notify).toHaveBeenCalledWith(
      "Generation failed: Connection refused",
      "error"
    );

    fetchSpy.mockRestore();
  });

  it("should not match partial generate commands", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("Network error"));

    // This should be treated as a query, not a generate command
    await commandHandler("generate something else", ctx);

    // Should hit the query path
    expect(fetchSpy).toHaveBeenCalledWith(
      "http://localhost:8765/api/v1/query",
      expect.any(Object)
    );

    fetchSpy.mockRestore();
  });
});
