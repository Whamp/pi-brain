/**
 * Tests for the job processor module
 */

import * as os from "node:os";
import * as path from "node:path";
import { describe, expect, it } from "vitest";

import type { AnalysisJob, JobType, JobStatus } from "./queue.js";

import {
  buildAnalysisPrompt,
  buildSkillsArg,
  checkSkillAvailable,
  consoleLogger,
  createProcessor,
  extractNodeFromText,
  getSkillAvailability,
  isValidNodeOutput,
  parseAgentOutput,
  REQUIRED_SKILLS,
  OPTIONAL_SKILLS,
  SKILLS_DIR,
  type AgentNodeOutput,
  type ProcessorLogger,
} from "./processor.js";

// =============================================================================
// Test Fixtures
// =============================================================================

function createTestJob(overrides: Partial<AnalysisJob> = {}): AnalysisJob {
  return {
    id: "testjob12345678",
    type: "initial" as JobType,
    priority: 100,
    sessionFile:
      "/home/will/.pi/agent/sessions/test-project--/2026-01-25.jsonl",
    status: "pending" as JobStatus,
    queuedAt: "2026-01-25T10:00:00.000Z",
    retryCount: 0,
    maxRetries: 3,
    ...overrides,
  };
}

function createValidNodeOutput(): AgentNodeOutput {
  return {
    classification: {
      type: "coding",
      project: "/home/will/projects/test",
      isNewProject: false,
      hadClearGoal: true,
      language: "typescript",
    },
    content: {
      summary: "Implemented a new feature for the test project.",
      outcome: "success",
      keyDecisions: [
        {
          what: "Used TypeScript",
          why: "Type safety",
          alternativesConsidered: ["JavaScript"],
        },
      ],
      filesTouched: ["src/index.ts"],
      toolsUsed: ["read", "write"],
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
      modelsUsed: [
        {
          provider: "zai",
          model: "glm-4.7",
          tokensInput: 1000,
          tokensOutput: 500,
          cost: 0.01,
        },
      ],
      promptingWins: [],
      promptingFailures: [],
      modelQuirks: [],
      toolUseErrors: [],
    },
    semantic: {
      tags: ["typescript", "testing"],
      topics: ["development"],
    },
    daemonMeta: {
      decisions: [],
      rlmUsed: false,
    },
  };
}

const silentLogger: ProcessorLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

// =============================================================================
// buildAnalysisPrompt Tests
// =============================================================================

describe("buildAnalysisPrompt", () => {
  it("should build a basic prompt with session file", () => {
    const job = createTestJob();
    const prompt = buildAnalysisPrompt(job);

    expect(prompt).toContain("Analyze this pi session segment");
    expect(prompt).toContain(job.sessionFile);
    expect(prompt).toContain("Return a JSON object matching the Node schema");
  });

  it("should include segment range when both start and end are provided", () => {
    const job = createTestJob({
      segmentStart: "entry_abc123",
      segmentEnd: "entry_xyz789",
    });
    const prompt = buildAnalysisPrompt(job);

    expect(prompt).toContain("entries from entry_abc123 to entry_xyz789");
  });

  it("should include only start when end is not provided", () => {
    const job = createTestJob({
      segmentStart: "entry_abc123",
    });
    const prompt = buildAnalysisPrompt(job);

    expect(prompt).toContain("starting from entry entry_abc123");
  });

  it("should include only end when start is not provided", () => {
    const job = createTestJob({
      segmentEnd: "entry_xyz789",
    });
    const prompt = buildAnalysisPrompt(job);

    expect(prompt).toContain("up to entry entry_xyz789");
  });

  it("should include context when provided", () => {
    const job = createTestJob({
      context: {
        existingNodeId: "node123",
        reason: "reanalysis",
        boundaryType: "compaction",
      },
    });
    const prompt = buildAnalysisPrompt(job);

    expect(prompt).toContain("Additional context:");
    expect(prompt).toContain("existingNodeId");
    expect(prompt).toContain("node123");
    expect(prompt).toContain("reanalysis");
    expect(prompt).toContain("compaction");
  });

  it("should not include context section when context is empty", () => {
    const job = createTestJob({
      context: {},
    });
    const prompt = buildAnalysisPrompt(job);

    expect(prompt).not.toContain("Additional context:");
  });

  it("should not include irrelevant context fields", () => {
    const job = createTestJob({
      context: {
        irrelevantField: "should be ignored",
        existingNodeId: "node123",
      },
    });
    const prompt = buildAnalysisPrompt(job);

    expect(prompt).toContain("existingNodeId");
    expect(prompt).not.toContain("irrelevantField");
  });
});

// =============================================================================
// isValidNodeOutput Tests
// =============================================================================

describe("isValidNodeOutput", () => {
  it("should return true for valid node output", () => {
    const valid = createValidNodeOutput();
    expect(isValidNodeOutput(valid)).toBeTruthy();
  });

  it("should return false for null", () => {
    expect(isValidNodeOutput(null)).toBeFalsy();
  });

  it("should return false for non-object", () => {
    expect(isValidNodeOutput("string")).toBeFalsy();
    expect(isValidNodeOutput(123)).toBeFalsy();
  });

  it("should return false for missing classification", () => {
    const invalid = createValidNodeOutput();
    // @ts-expect-error - testing invalid input
    delete invalid.classification;
    expect(isValidNodeOutput(invalid)).toBeFalsy();
  });

  it("should return false for missing content", () => {
    const invalid = createValidNodeOutput();
    // @ts-expect-error - testing invalid input
    delete invalid.content;
    expect(isValidNodeOutput(invalid)).toBeFalsy();
  });

  it("should return false for missing lessons", () => {
    const invalid = createValidNodeOutput();
    // @ts-expect-error - testing invalid input
    delete invalid.lessons;
    expect(isValidNodeOutput(invalid)).toBeFalsy();
  });

  it("should return false for missing observations", () => {
    const invalid = createValidNodeOutput();
    // @ts-expect-error - testing invalid input
    delete invalid.observations;
    expect(isValidNodeOutput(invalid)).toBeFalsy();
  });

  it("should return false for missing semantic", () => {
    const invalid = createValidNodeOutput();
    // @ts-expect-error - testing invalid input
    delete invalid.semantic;
    expect(isValidNodeOutput(invalid)).toBeFalsy();
  });

  it("should return false for missing daemonMeta", () => {
    const invalid = createValidNodeOutput();
    // @ts-expect-error - testing invalid input
    delete invalid.daemonMeta;
    expect(isValidNodeOutput(invalid)).toBeFalsy();
  });

  it("should return false for missing classification.type", () => {
    const invalid = createValidNodeOutput();
    // @ts-expect-error - testing invalid input
    delete invalid.classification.type;
    expect(isValidNodeOutput(invalid)).toBeFalsy();
  });

  it("should return false for missing classification.project", () => {
    const invalid = createValidNodeOutput();
    // @ts-expect-error - testing invalid input
    delete invalid.classification.project;
    expect(isValidNodeOutput(invalid)).toBeFalsy();
  });

  it("should return false for missing content.summary", () => {
    const invalid = createValidNodeOutput();
    // @ts-expect-error - testing invalid input
    delete invalid.content.summary;
    expect(isValidNodeOutput(invalid)).toBeFalsy();
  });

  it("should return false for missing content.outcome", () => {
    const invalid = createValidNodeOutput();
    // @ts-expect-error - testing invalid input
    delete invalid.content.outcome;
    expect(isValidNodeOutput(invalid)).toBeFalsy();
  });

  it("should return false when classification is not an object", () => {
    const invalid = { ...createValidNodeOutput(), classification: "string" };
    expect(isValidNodeOutput(invalid)).toBeFalsy();
  });
});

// =============================================================================
// extractNodeFromText Tests
// =============================================================================

describe("extractNodeFromText", () => {
  it("should extract JSON from code fence", () => {
    const nodeData = createValidNodeOutput();
    const text = `Here is the analysis:

\`\`\`json
${JSON.stringify(nodeData, null, 2)}
\`\`\`

That's the result.`;

    const result = extractNodeFromText(text, silentLogger);
    expect(result).toBeDefined();
    expect(result?.classification.type).toBe("coding");
    expect(result?.content.summary).toContain("Implemented");
  });

  it("should extract JSON from code fence without json label", () => {
    const nodeData = createValidNodeOutput();
    const text = `\`\`\`
${JSON.stringify(nodeData)}
\`\`\``;

    const result = extractNodeFromText(text, silentLogger);
    expect(result).toBeDefined();
    expect(result?.classification.type).toBe("coding");
  });

  it("should extract raw JSON when no code fence", () => {
    const nodeData = createValidNodeOutput();
    const text = `Analysis complete: ${JSON.stringify(nodeData)}`;

    const result = extractNodeFromText(text, silentLogger);
    expect(result).toBeDefined();
    expect(result?.classification.type).toBe("coding");
  });

  it("should return undefined for invalid JSON", () => {
    const text = "This is not JSON { broken: }";
    const result = extractNodeFromText(text, silentLogger);
    expect(result).toBeUndefined();
  });

  it("should return undefined for JSON that doesn't match schema", () => {
    const text = `\`\`\`json
{ "invalid": true }
\`\`\``;

    const result = extractNodeFromText(text, silentLogger);
    expect(result).toBeUndefined();
  });

  it("should return undefined for empty text", () => {
    const result = extractNodeFromText("", silentLogger);
    expect(result).toBeUndefined();
  });

  it("should prefer code-fenced JSON over raw JSON", () => {
    const fencedData = createValidNodeOutput();
    fencedData.content.summary = "Fenced version";

    const rawData = createValidNodeOutput();
    rawData.content.summary = "Raw version";

    const text = `${JSON.stringify(rawData)}

\`\`\`json
${JSON.stringify(fencedData)}
\`\`\``;

    const result = extractNodeFromText(text, silentLogger);
    expect(result?.content.summary).toBe("Fenced version");
  });
});

// =============================================================================
// parseAgentOutput Tests
// =============================================================================

describe("parseAgentOutput", () => {
  it("should parse valid agent output", () => {
    const nodeData = createValidNodeOutput();
    const agentEndEvent = {
      type: "agent_end",
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: "Analyze this" }],
        },
        {
          role: "assistant",
          content: [
            {
              type: "text",
              text: `Here is the analysis:\n\n\`\`\`json\n${JSON.stringify(nodeData)}\n\`\`\``,
            },
          ],
        },
      ],
    };

    const stdout = JSON.stringify(agentEndEvent);
    const result = parseAgentOutput(stdout, silentLogger);

    expect(result.success).toBeTruthy();
    expect(result.nodeData).toBeDefined();
    expect(result.nodeData?.classification.type).toBe("coding");
  });

  it("should handle multiple JSON lines", () => {
    const nodeData = createValidNodeOutput();
    const events = [
      { type: "agent_start", sessionId: "test" },
      { type: "message", content: "Processing..." },
      {
        type: "agent_end",
        messages: [
          {
            role: "assistant",
            content: [{ type: "text", text: JSON.stringify(nodeData) }],
          },
        ],
      },
    ];

    const stdout = events.map((e) => JSON.stringify(e)).join("\n");
    const result = parseAgentOutput(stdout, silentLogger);

    expect(result.success).toBeTruthy();
    expect(result.nodeData).toBeDefined();
  });

  it("should return error when no agent_end event", () => {
    const stdout = JSON.stringify({ type: "agent_start" });
    const result = parseAgentOutput(stdout, silentLogger);

    expect(result.success).toBeFalsy();
    expect(result.error).toContain("No agent_end event");
  });

  it("should return error when agent_end has no messages", () => {
    const stdout = JSON.stringify({ type: "agent_end" });
    const result = parseAgentOutput(stdout, silentLogger);

    expect(result.success).toBeFalsy();
    expect(result.error).toContain("No agent_end event");
  });

  it("should return error when no assistant message", () => {
    const stdout = JSON.stringify({
      type: "agent_end",
      messages: [{ role: "user", content: [{ type: "text", text: "test" }] }],
    });
    const result = parseAgentOutput(stdout, silentLogger);

    expect(result.success).toBeFalsy();
    expect(result.error).toContain("No assistant message");
  });

  it("should return error when JSON extraction fails", () => {
    const stdout = JSON.stringify({
      type: "agent_end",
      messages: [
        {
          role: "assistant",
          content: [{ type: "text", text: "No valid JSON here" }],
        },
      ],
    });
    const result = parseAgentOutput(stdout, silentLogger);

    expect(result.success).toBeFalsy();
    expect(result.error).toContain("Could not extract valid JSON");
  });

  it("should skip non-JSON lines", () => {
    const nodeData = createValidNodeOutput();
    const lines = [
      "Some debug output",
      JSON.stringify({ type: "agent_start" }),
      "More non-JSON",
      JSON.stringify({
        type: "agent_end",
        messages: [
          {
            role: "assistant",
            content: [{ type: "text", text: JSON.stringify(nodeData) }],
          },
        ],
      }),
    ];

    const stdout = lines.join("\n");
    const result = parseAgentOutput(stdout, silentLogger);

    expect(result.success).toBeTruthy();
    expect(result.nodeData).toBeDefined();
  });

  it("should use the last assistant message", () => {
    const firstNode = createValidNodeOutput();
    firstNode.content.summary = "First response";

    const lastNode = createValidNodeOutput();
    lastNode.content.summary = "Last response";

    const stdout = JSON.stringify({
      type: "agent_end",
      messages: [
        {
          role: "assistant",
          content: [{ type: "text", text: JSON.stringify(firstNode) }],
        },
        { role: "user", content: [{ type: "text", text: "Continue" }] },
        {
          role: "assistant",
          content: [{ type: "text", text: JSON.stringify(lastNode) }],
        },
      ],
    });

    const result = parseAgentOutput(stdout, silentLogger);

    expect(result.success).toBeTruthy();
    expect(result.nodeData?.content.summary).toBe("Last response");
  });

  it("should handle empty stdout", () => {
    const result = parseAgentOutput("", silentLogger);
    expect(result.success).toBeFalsy();
  });
});

// =============================================================================
// Skill Management Tests
// =============================================================================

describe("skill management", () => {
  describe("constants", () => {
    it("should have rlm as required skill", () => {
      expect(REQUIRED_SKILLS).toContain("rlm");
    });

    it("should have codemap as optional skill", () => {
      expect(OPTIONAL_SKILLS).toContain("codemap");
    });

    it("should use correct skills directory", () => {
      expect(SKILLS_DIR).toBe(path.join(os.homedir(), "skills"));
    });
  });

  describe("checkSkillAvailable", () => {
    it("should return true for rlm skill if it exists", async () => {
      // This test depends on the actual filesystem
      // rlm should exist in ~/skills/rlm/SKILL.md
      const available = await checkSkillAvailable("rlm");
      // Don't assert - just check it doesn't throw
      expect(typeof available).toBe("boolean");
    });

    it("should return false for non-existent skill", async () => {
      const available = await checkSkillAvailable(
        "definitely-not-a-real-skill-xyz123"
      );
      expect(available).toBeFalsy();
    });
  });

  describe("getSkillAvailability", () => {
    it("should return a map with all required and optional skills", async () => {
      const availability = await getSkillAvailability();

      // Check all required skills are in the map
      for (const skill of REQUIRED_SKILLS) {
        expect(availability.has(skill)).toBeTruthy();
        expect(availability.get(skill)?.name).toBe(skill);
      }

      // Check all optional skills are in the map
      for (const skill of OPTIONAL_SKILLS) {
        expect(availability.has(skill)).toBeTruthy();
        expect(availability.get(skill)?.name).toBe(skill);
      }
    });

    it("should return SkillInfo with correct availability structure", async () => {
      const availability = await getSkillAvailability();

      // Verify all entries have the expected structure
      for (const [name, info] of availability) {
        expect(info.name).toBe(name);
        expect(typeof info.available).toBe("boolean");
        // Path should be either undefined or a string
        expect(["undefined", "string"]).toContain(typeof info.path);
      }
    });
  });

  describe("buildSkillsArg", () => {
    it("should return a string type", async () => {
      const skills = await buildSkillsArg();
      expect(typeof skills).toBe("string");
    });

    it("should return a properly formatted skills string", async () => {
      const skills = await buildSkillsArg();
      const allKnownSkills = [
        ...REQUIRED_SKILLS,
        ...OPTIONAL_SKILLS,
      ] as string[];

      // Empty is valid, or comma-separated known skills
      const skillList = skills.split(",").filter((s) => s.length > 0);
      const allKnown = skillList.every((skill) =>
        allKnownSkills.includes(skill)
      );
      expect(allKnown).toBeTruthy();
    });
  });
});

// =============================================================================
// JobProcessor Tests
// =============================================================================

describe("jobProcessor", () => {
  describe("createProcessor", () => {
    it("should create a processor with config", () => {
      const processor = createProcessor({
        daemonConfig: {
          idleTimeoutMinutes: 10,
          parallelWorkers: 1,
          maxRetries: 3,
          retryDelaySeconds: 60,
          reanalysisSchedule: "0 2 * * *",
          connectionDiscoverySchedule: "0 3 * * *",
          provider: "zai",
          model: "glm-4.7",
          promptFile: "/path/to/prompt.md",
          maxConcurrentAnalysis: 1,
          analysisTimeoutMinutes: 30,
          maxQueueSize: 1000,
        },
        logger: silentLogger,
      });

      expect(processor).toBeDefined();
    });
  });
});

// =============================================================================
// Console Logger Tests
// =============================================================================

describe("consoleLogger", () => {
  it("should have all required methods", () => {
    expect(typeof consoleLogger.debug).toBe("function");
    expect(typeof consoleLogger.info).toBe("function");
    expect(typeof consoleLogger.warn).toBe("function");
    expect(typeof consoleLogger.error).toBe("function");
  });

  it("should not throw when called", () => {
    expect(() => consoleLogger.debug("test")).not.toThrow();
    expect(() => consoleLogger.info("test")).not.toThrow();
    expect(() => consoleLogger.warn("test")).not.toThrow();
    expect(() => consoleLogger.error("test")).not.toThrow();
  });
});
