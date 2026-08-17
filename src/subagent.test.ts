import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { pathToFileURL } from "node:url";

import fc from "fast-check";

import {
  buildCommitterTask,
  directoryFromModuleUrl,
  extractCommitBlocks,
  extractFinalText,
  spawnCommitter,
} from "./subagent.js";
import type { CommitterOptions } from "./types.js";

// Helpers

/** Generate valid JSON-mode stdout with message_end events */
const messageEndEventArb = fc.record({
  type: fc.constant("message_end"),
  message: fc.record({
    role: fc.oneof(fc.constant("assistant"), fc.constant("user")),
    content: fc.array(
      fc.record({
        type: fc.constant("text"),
        text: fc.string(),
      })
    ),
  }),
});

/**
 * Stdout guaranteed to contain at least one assistant message_end event
 * with at least one non-empty text content item.
 */
const validAssistantStdoutArb = fc
  .tuple(
    fc.array(messageEndEventArb),
    fc.record({
      type: fc.constant("message_end" as const),
      message: fc.record({
        role: fc.constant("assistant" as const),
        content: fc
          .tuple(
            fc.record({
              type: fc.constant("text"),
              text: fc.string({ minLength: 1 }),
            }),
            fc.array(
              fc.record({
                type: fc.constant("text"),
                text: fc.string(),
              })
            )
          )
          .map(([required, rest]) => [required, ...rest]),
      }),
    }),
    fc.array(messageEndEventArb)
  )
  .map(([before, required, after]) =>
    [...before, required, ...after].map((e) => JSON.stringify(e)).join("\n")
  );

/** Generate text that contains all three required headings */
const validCommitTextArb = fc
  .record({
    preamble: fc.string(),
    purpose: fc.string({ minLength: 1 }),
    progress: fc.string({ minLength: 1 }),
    contribution: fc.string({ minLength: 1 }),
    trailer: fc.string(),
  })
  .map((parts) =>
    [
      parts.preamble,
      "",
      "### Branch Purpose",
      parts.purpose,
      "",
      "### Previous Progress Summary",
      parts.progress,
      "",
      "### This Commit's Contribution",
      parts.contribution,
      "",
      parts.trailer,
    ].join("\n")
  );

describe("directoryFromModuleUrl", () => {
  it("decodes percent-encoded spaces so memory-committer.md can be found", () => {
    // URL.pathname leaves `%20`; npm global installs can contain spaces.
    const filePath = path.join("/tmp", "pi brain", "src", "subagent.ts");
    const moduleUrl = pathToFileURL(filePath).href;

    expect(moduleUrl).toContain("%20");
    expect(new URL(moduleUrl).pathname).toContain("%20");
    expect(directoryFromModuleUrl(moduleUrl)).toBe(
      path.join("/tmp", "pi brain", "src")
    );
  });
});

describe("buildCommitterTask", () => {
  it("should build task string with branch, summary, and file paths", () => {
    const task = buildCommitterTask("main", "Fixed auth flow");

    expect(task).toContain('branch "main"');
    expect(task).toContain("Fixed auth flow");
    expect(task).toContain(".memory/AGENTS.md");
    expect(task).toContain(".memory/branches/main/log.md");
    expect(task).toContain(".memory/branches/main/commits.md");
  });

  it("should escape branch names with special characters", () => {
    const task = buildCommitterTask("feature/auth-fix", "Summary");

    expect(task).toContain("feature/auth-fix");
    expect(task).toContain(".memory/branches/feature/auth-fix/log.md");
  });
});

describe("extractFinalText", () => {
  it("should extract text from the last assistant message_end event", () => {
    const stdout = [
      JSON.stringify({
        type: "message_end",
        message: {
          role: "assistant",
          content: [
            {
              type: "text",
              text: "### Branch Purpose\nBuild the project.\n\n### Previous Progress Summary\nInitial commit.\n\n### This Commit's Contribution\n- Added spawn module.",
            },
          ],
        },
      }),
    ].join("\n");

    const result = extractFinalText(stdout);
    expect(result).toContain("### Branch Purpose");
    expect(result).toContain("### This Commit's Contribution");
  });

  it("should return the last assistant message when there are multiple", () => {
    const stdout = [
      JSON.stringify({
        type: "message_end",
        message: {
          role: "assistant",
          content: [{ type: "text", text: "Let me read the files..." }],
        },
      }),
      JSON.stringify({
        type: "tool_result_end",
        message: {
          role: "tool",
          content: [{ type: "text", text: "file contents" }],
        },
      }),
      JSON.stringify({
        type: "message_end",
        message: {
          role: "assistant",
          content: [
            { type: "text", text: "### Branch Purpose\nFinal answer." },
          ],
        },
      }),
    ].join("\n");

    const result = extractFinalText(stdout);
    expect(result).toContain("Final answer.");
    expect(result).not.toContain("Let me read");
  });

  it("should return empty string when stdout has no assistant messages", () => {
    expect(extractFinalText("")).toBe("");
    expect(extractFinalText("not json\n")).toBe("");
  });

  it("should handle multiple text content parts", () => {
    const stdout = JSON.stringify({
      type: "message_end",
      message: {
        role: "assistant",
        content: [
          { type: "text", text: "Part one." },
          { type: "text", text: "Part two." },
        ],
      },
    });

    const result = extractFinalText(stdout);
    expect(result).toContain("Part one.");
    expect(result).toContain("Part two.");
  });
});

describe("extractCommitBlocks", () => {
  it("should extract three commit blocks from text", () => {
    const text = [
      "### Branch Purpose",
      "Build the memory extension for persistent agent memory.",
      "",
      "### Previous Progress Summary",
      "Completed Phase 1 foundation: YAML parser, state manager, hash generator.",
      "",
      "### This Commit's Contribution",
      "Added OTA formatter and branch manager modules with full test coverage.",
    ].join("\n");

    const result = extractCommitBlocks(text);
    expect(result).toContain("### Branch Purpose");
    expect(result).toContain("### Previous Progress Summary");
    expect(result).toContain("### This Commit's Contribution");
  });

  it("should strip preamble and trailing text", () => {
    const text = [
      "I've reviewed the log and here is the commit:",
      "",
      "### Branch Purpose",
      "Build the memory extension.",
      "",
      "### Previous Progress Summary",
      "Phase 1 done.",
      "",
      "### This Commit's Contribution",
      "Phase 2 tools implemented.",
      "",
      "Let me know if you want to adjust anything.",
    ].join("\n");

    const result = extractCommitBlocks(text);
    expect(result).not.toContain("I've reviewed");
    expect(result).not.toContain("Let me know");
    expect(result).toContain("### Branch Purpose");
  });

  it("should return null when blocks are missing", () => {
    expect(extractCommitBlocks("No commit blocks here.")).toBeNull();
    expect(
      extractCommitBlocks("### Branch Purpose\nOnly one block.")
    ).toBeNull();
  });
});

describe("extractFinalText property-based tests", () => {
  it("should never throw on arbitrary input", () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        expect(() => extractFinalText(input)).not.toThrow();
      })
    );
  });

  it("should always return a string", () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        // Act
        const result = extractFinalText(input);

        // Assert
        expect(result).toBeTypeOf("string");
      })
    );
  });

  it("should extract text from the last assistant message in valid stdout", () => {
    fc.assert(
      fc.property(validAssistantStdoutArb, (stdout) => {
        // Act
        const result = extractFinalText(stdout);

        // Assert
        const events = stdout.split("\n").map(
          (line) =>
            JSON.parse(line) as {
              message: {
                role: string;
                content: { text: string }[];
              };
            }
        );
        const assistantEvents = events.filter(
          (e) => e.message.role === "assistant"
        );
        const assistant = assistantEvents.at(-1) as (typeof assistantEvents)[0];
        const expectedTexts = assistant.message.content
          .map((c) => c.text)
          .filter((t) => t.length > 0);
        for (const text of expectedTexts) {
          expect(result).toContain(text);
        }
      })
    );
  });
});

describe("extractCommitBlocks property-based tests", () => {
  it("should never throw on arbitrary input", () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        expect(() => extractCommitBlocks(input)).not.toThrow();
      })
    );
  });

  it("should return null or a string", () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        // Act
        const result = extractCommitBlocks(input);

        // Assert
        expect(result === null || typeof result === "string").toBeTruthy();
      })
    );
  });

  it("should extract all three headings when present", () => {
    fc.assert(
      fc.property(validCommitTextArb, (text) => {
        // Act
        const result = extractCommitBlocks(text);

        // Assert
        expect(result).not.toBeNull();
        expect(result).toContain("### Branch Purpose");
        expect(result).toContain("### Previous Progress Summary");
        expect(result).toContain("### This Commit's Contribution");
      })
    );
  });

  it("should start result with ### Branch Purpose", () => {
    fc.assert(
      fc.property(validCommitTextArb, (text) => {
        // Act
        const result = extractCommitBlocks(text);

        // Assert
        expect(result).not.toBeNull();
        expect(result?.startsWith("### Branch Purpose")).toBeTruthy();
      })
    );
  });
});

describe("buildCommitterTask property-based tests", () => {
  it("should include branch name and summary in task", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        (branch, summary) => {
          // Act
          const task = buildCommitterTask(branch, summary);

          // Assert
          expect(task).toContain(branch);
          expect(task).toContain(summary);
        }
      )
    );
  });

  it("should include all required file paths", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        (branch, summary) => {
          // Act
          const task = buildCommitterTask(branch, summary);

          // Assert
          expect(task).toContain(".memory/AGENTS.md");
          expect(task).toContain(`${branch}/log.md`);
          expect(task).toContain(`${branch}/commits.md`);
        }
      )
    );
  });
});

// --- spawnCommitter argv resolution ---

/** Read the value that follows a flag in captured argv, or undefined when absent */
function argAfter(argv: string[], flag: string): string | undefined {
  const index = argv.indexOf(flag);
  return index === -1 ? undefined : argv[index + 1];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

describe("spawnCommitter model and thinking resolution", () => {
  const originalPath = process.env.PATH;
  let binDir: string;
  let capturePath: string;
  let tmpCwd: string;

  beforeEach(() => {
    tmpCwd = fs.mkdtempSync(path.join(os.tmpdir(), "committer-cwd-"));
    binDir = fs.mkdtempSync(path.join(os.tmpdir(), "committer-bin-"));
    capturePath = path.join(binDir, "argv.txt");
    // Fake pi: capture argv and exit 0 (a successful, empty commit run)
    fs.writeFileSync(
      path.join(binDir, "pi"),
      `#!/bin/sh\nprintf '%s\\n' "$@" > "${capturePath}"\nexit 0\n`,
      { mode: 0o755 }
    );
    process.env.PATH = `${binDir}:${originalPath}`;
  });

  afterEach(() => {
    process.env.PATH = originalPath;
    fs.rmSync(tmpCwd, { recursive: true, force: true });
    fs.rmSync(binDir, { recursive: true, force: true });
  });

  async function runSpawn(current: CommitterOptions = {}): Promise<string[]> {
    const result = await spawnCommitter(
      tmpCwd,
      "distill the log",
      undefined,
      current
    );

    expect(result.exitCode).toBe(0);
    expect(result.error).toBeUndefined();
    return fs.readFileSync(capturePath, "utf8").split("\n").filter(Boolean);
  }

  function writeConfig(content: string): void {
    fs.mkdirSync(path.join(tmpCwd, ".memory"), { recursive: true });
    fs.writeFileSync(path.join(tmpCwd, ".memory", "config.yaml"), content);
  }

  it("omits --model and --thinking when no config and no session values exist", async () => {
    const argv = await runSpawn();

    expect(argv).not.toContain("--model");
    expect(argv).not.toContain("--thinking");
    // Preservation: core committer flags unchanged
    expect(argAfter(argv, "--mode")).toBe("json");
    expect(argv).toContain("--no-session");
    expect(argAfter(argv, "-p")).toBe("Task: distill the log");
  });

  it("passes session model and thinking when no config exists", async () => {
    const argv = await runSpawn({
      model: "openai/gpt-5.6-luna",
      thinking: "high",
    });

    expect(argAfter(argv, "--model")).toBe("openai/gpt-5.6-luna");
    expect(argAfter(argv, "--thinking")).toBe("high");
  });

  it("lets config override session values", async () => {
    writeConfig(
      "committer:\n  model: google/gemini-3.6-flash\n  thinking: low\n"
    );

    const argv = await runSpawn({
      model: "openai/gpt-5.6-luna",
      thinking: "high",
    });

    expect(argAfter(argv, "--model")).toBe("google/gemini-3.6-flash");
    expect(argAfter(argv, "--thinking")).toBe("low");
  });

  it("merges config and session values per field", async () => {
    writeConfig("committer:\n  model: google/gemini-3.6-flash\n");

    const argv = await runSpawn({
      model: "openai/gpt-5.6-luna",
      thinking: "high",
    });

    expect(argAfter(argv, "--model")).toBe("google/gemini-3.6-flash");
    expect(argAfter(argv, "--thinking")).toBe("high");
  });

  it("inherits session values from a comment-only config file", async () => {
    writeConfig(
      "# Optional Brain configuration.\n# committer:\n#   model: x\n"
    );

    const argv = await runSpawn({
      model: "openai/gpt-5.6-luna",
      thinking: "high",
    });

    expect(argAfter(argv, "--model")).toBe("openai/gpt-5.6-luna");
    expect(argAfter(argv, "--thinking")).toBe("high");
  });

  it("falls back to session values when the config file is unreadable", async () => {
    fs.mkdirSync(path.join(tmpCwd, ".memory", "config.yaml"), {
      recursive: true,
    });

    const argv = await runSpawn({
      model: "openai/gpt-5.6-luna",
      thinking: "high",
    });

    expect(argAfter(argv, "--model")).toBe("openai/gpt-5.6-luna");
    expect(argAfter(argv, "--thinking")).toBe("high");
  });

  it("falls back to session values when committer is not a map", async () => {
    writeConfig("committer: not-a-map\n");

    const argv = await runSpawn({
      model: "openai/gpt-5.6-luna",
      thinking: "high",
    });

    expect(argAfter(argv, "--model")).toBe("openai/gpt-5.6-luna");
    expect(argAfter(argv, "--thinking")).toBe("high");
  });

  it("treats empty config strings as unset and inherits session values", async () => {
    writeConfig('committer:\n  model: ""\n');

    const argv = await runSpawn({
      model: "openai/gpt-5.6-luna",
      thinking: "high",
    });

    expect(argAfter(argv, "--model")).toBe("openai/gpt-5.6-luna");
    expect(argAfter(argv, "--thinking")).toBe("high");
  });

  it("runs the committer child with extension discovery disabled", async () => {
    const argv = await runSpawn();

    expect(argv).toContain("--no-extensions");
    expect(argv).not.toContain("--extension");
  });

  it("does not forward session extensions onto the committer child", async () => {
    const argv = await runSpawn({
      extensions: ["./from-session.ts"],
    });

    expect(argv).not.toContain("--extension");
  });

  it("passes --extension args from a config list before -p", async () => {
    writeConfig(
      [
        "committer:",
        "  extensions:",
        "    - ./custom-provider.ts",
        "    - ./another-ext.ts",
      ].join("\n")
    );

    const argv = await runSpawn();
    const pIndex = argv.indexOf("-p");
    const firstExt = argv.indexOf("--extension");
    const secondExt = argv.indexOf("--extension", firstExt + 1);

    expect(firstExt).toBeGreaterThan(-1);
    expect(firstExt).toBeLessThan(pIndex);
    expect(argv[firstExt + 1]).toBe("./custom-provider.ts");
    expect(secondExt).toBeGreaterThan(firstExt);
    expect(secondExt).toBeLessThan(pIndex);
    expect(argv[secondExt + 1]).toBe("./another-ext.ts");
  });

  it("passes --extension args from a comma-separated config string before -p", async () => {
    writeConfig(
      "committer:\n  extensions: ./custom-provider.ts, ./another-ext.ts\n"
    );

    const argv = await runSpawn();
    const pIndex = argv.indexOf("-p");
    const firstExt = argv.indexOf("--extension");
    const secondExt = argv.indexOf("--extension", firstExt + 1);

    expect(argv[firstExt + 1]).toBe("./custom-provider.ts");
    expect(argv[secondExt + 1]).toBe("./another-ext.ts");
    expect(firstExt).toBeLessThan(pIndex);
    expect(secondExt).toBeLessThan(pIndex);
  });
});

describe("spawnCommitter abort escalation", () => {
  const originalPath = process.env.PATH;
  let binDir: string;
  let tmpCwd: string;

  beforeEach(() => {
    tmpCwd = fs.mkdtempSync(path.join(os.tmpdir(), "committer-cwd-"));
    binDir = fs.mkdtempSync(path.join(os.tmpdir(), "committer-bin-"));
    // Fake pi that ignores SIGTERM and self-exits after 20s as a safety net
    fs.writeFileSync(
      path.join(binDir, "pi"),
      [
        "#!/usr/bin/env node",
        'process.on("SIGTERM", () => {});',
        "setTimeout(() => process.exit(0), 20_000);",
        "",
      ].join("\n"),
      { mode: 0o755 }
    );
    process.env.PATH = `${binDir}:${originalPath}`;
  });

  afterEach(() => {
    process.env.PATH = originalPath;
    fs.rmSync(tmpCwd, { recursive: true, force: true });
    fs.rmSync(binDir, { recursive: true, force: true });
  });

  it(
    "kills a child that ignores SIGTERM and resolves with an error",
    { timeout: 15_000 },
    async () => {
      const controller = new AbortController();
      const pending = spawnCommitter(
        tmpCwd,
        "distill the log",
        controller.signal,
        { model: "openai/gpt-5.6-luna" }
      );

      // Give the child time to install its SIGTERM handler
      await sleep(600);
      controller.abort();

      const result = await Promise.race([
        pending,
        sleep(9000).then(() => {
          throw new Error(
            "spawnCommitter never resolved: SIGKILL escalation did not fire"
          );
        }),
      ]);

      expect(result.exitCode).not.toBe(0);
      expect(result.error).toBeTruthy();
    }
  );
});
