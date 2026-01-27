/**
 * Tests for Model-Specific AGENTS.md Generator
 */

import { describe, expect, it } from "vitest";

import {
  formatDataForPrompt,
  generateFallbackAgents,
  type ModelInsightData,
} from "./agents-generator.js";
import { getModelDisplayName } from "./prompt-generator.js";

describe("agents-generator", () => {
  describe("formatDataForPrompt", () => {
    it("should format model data with all insight types", () => {
      const data: ModelInsightData = {
        model: "zai/glm-4.7",
        displayName: "Zai Glm 4.7",
        quirks: [
          {
            id: "q1",
            type: "quirk",
            model: "zai/glm-4.7",
            pattern: "Uses sed instead of read",
            frequency: 5,
            confidence: 0.8,
            severity: "medium",
            workaround: "Use read tool",
            examples: [],
            firstSeen: "2026-01-01",
            lastSeen: "2026-01-25",
            promptIncluded: false,
          },
        ],
        wins: [
          {
            id: "w1",
            type: "win",
            model: "zai/glm-4.7",
            pattern: "Explicit phase breakdown works well",
            frequency: 3,
            confidence: 0.7,
            severity: "low",
            examples: [],
            firstSeen: "2026-01-10",
            lastSeen: "2026-01-20",
            promptIncluded: false,
          },
        ],
        toolErrors: [
          {
            id: "te1",
            type: "tool_error",
            model: "zai/glm-4.7",
            tool: "edit",
            pattern: "Whitespace mismatch",
            frequency: 10,
            confidence: 0.9,
            severity: "high",
            examples: [],
            firstSeen: "2026-01-05",
            lastSeen: "2026-01-26",
            promptIncluded: false,
          },
        ],
        failures: [],
        lessons: [],
        frictionClusters: [],
      };

      const result = formatDataForPrompt(data);

      expect(result).toContain("# Model Data for Zai Glm 4.7 (zai/glm-4.7)");
      expect(result).toContain("## Known Quirks");
      expect(result).toContain("Uses sed instead of read");
      expect(result).toContain("Workaround: Use read tool");
      expect(result).toContain("## Effective Techniques");
      expect(result).toContain("Explicit phase breakdown works well");
      expect(result).toContain("## Common Tool Errors");
      expect(result).toContain("[edit] Whitespace mismatch");
    });

    it("should handle empty data gracefully", () => {
      const data: ModelInsightData = {
        model: "anthropic/claude-sonnet-4-20250514",
        displayName: "Anthropic Claude Sonnet 4 20250514",
        quirks: [],
        wins: [],
        toolErrors: [],
        failures: [],
        lessons: [],
        frictionClusters: [],
      };

      const result = formatDataForPrompt(data);

      expect(result).toContain("# Model Data for");
      // Should not contain section headers when empty
      expect(result).not.toContain("## Known Quirks");
      expect(result).not.toContain("## Effective Techniques");
    });

    it("should include friction clusters when present", () => {
      const data: ModelInsightData = {
        model: "zai/glm-4.7",
        displayName: "Zai Glm 4.7",
        quirks: [],
        wins: [],
        toolErrors: [],
        failures: [],
        lessons: [],
        frictionClusters: [
          {
            id: "c1",
            name: "Large File Struggles",
            description: "Model struggles with files over 1000 lines",
            nodeCount: 15,
            signalType: "friction",
            relatedModel: "zai/glm-4.7",
            status: "pending",
            algorithm: "hdbscan",
            minClusterSize: 3,
            centroid: null,
            createdAt: "2026-01-20",
            updatedAt: "2026-01-20",
          },
        ],
      };

      const result = formatDataForPrompt(data);

      expect(result).toContain("## Friction Patterns");
      expect(result).toContain("Large File Struggles");
      expect(result).toContain("struggles with files over 1000 lines");
      expect(result).toContain("15 sessions");
    });
  });

  describe("generateFallbackAgents", () => {
    it("should generate valid markdown without LLM", () => {
      const data: ModelInsightData = {
        model: "test/model",
        displayName: "Test Model",
        quirks: [
          {
            id: "q1",
            type: "quirk",
            model: "test/model",
            pattern: "Test quirk",
            frequency: 5,
            confidence: 0.8,
            severity: "medium",
            examples: [],
            firstSeen: "2026-01-01",
            lastSeen: "2026-01-25",
            promptIncluded: false,
          },
        ],
        wins: [
          {
            id: "w1",
            type: "win",
            model: "test/model",
            pattern: "Test win",
            frequency: 3,
            confidence: 0.7,
            severity: "low",
            examples: [],
            firstSeen: "2026-01-10",
            lastSeen: "2026-01-20",
            promptIncluded: false,
          },
        ],
        toolErrors: [],
        failures: [],
        lessons: [],
        frictionClusters: [],
      };

      const result = generateFallbackAgents(data);

      expect(result).toContain("# AGENTS.md for Test Model");
      expect(result).toContain(
        "Auto-generated guidance based on 2 analyzed patterns"
      );
      expect(result).toContain("## Known Quirks to Avoid");
      expect(result).toContain("Test quirk");
      expect(result).toContain("## Effective Techniques");
      expect(result).toContain("Test win");
    });

    it("should handle friction clusters in fallback", () => {
      const data: ModelInsightData = {
        model: "test/model",
        displayName: "Test Model",
        quirks: [],
        wins: [],
        toolErrors: [],
        failures: [],
        lessons: [],
        frictionClusters: [
          {
            id: "c1",
            name: "Test Friction",
            description: "Test description",
            nodeCount: 5,
            signalType: "friction",
            relatedModel: null,
            status: "pending",
            algorithm: "hdbscan",
            minClusterSize: 3,
            centroid: null,
            createdAt: "2026-01-20",
            updatedAt: "2026-01-20",
          },
        ],
      };

      const result = generateFallbackAgents(data);

      expect(result).toContain("## Common Friction Patterns");
      expect(result).toContain("Test Friction");
      expect(result).toContain("Test description");
    });
  });

  describe("getModelDisplayName", () => {
    it("should format provider/model to display name", () => {
      expect(getModelDisplayName("zai/glm-4.7")).toBe("Zai Glm 4.7");
      expect(getModelDisplayName("anthropic/claude-sonnet-4-20250514")).toBe(
        "Anthropic Claude Sonnet 4 20250514"
      );
      expect(getModelDisplayName("openai/gpt-4")).toBe("Openai Gpt 4");
    });

    it("should handle models without provider prefix", () => {
      expect(getModelDisplayName("glm-4.7")).toBe("glm-4.7");
    });
  });
});
