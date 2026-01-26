import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

import { describe, it, expect, vi } from "vitest";

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
