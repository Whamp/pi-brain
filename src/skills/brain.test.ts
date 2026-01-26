import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("brain skill", () => {
  const skillPath = join(__dirname, "../../skills/brain/SKILL.md");
  const content = readFileSync(skillPath, "utf8");

  it("should have valid YAML frontmatter", () => {
    // Check that it starts with ---
    expect(content.startsWith("---")).toBeTruthy();

    // Find the closing ---
    const endIndex = content.indexOf("---", 3);
    expect(endIndex).toBeGreaterThan(3);

    // Extract frontmatter
    const frontmatter = content.slice(3, endIndex).trim();

    // Check required fields
    expect(frontmatter).toMatch(/^name:\s*brain$/m);
    expect(frontmatter).toMatch(/^description:/m);
  });

  it("should have required name field", () => {
    const nameMatch = content.match(/^name:\s*(.+)$/m);
    expect(nameMatch).not.toBeNull();
    expect(nameMatch?.[1]).toBe("brain");
  });

  it("should have description with trigger keywords", () => {
    const descMatch = content.match(/^description:\s*(.+(?:\n(?!---).+)*)$/m);
    expect(descMatch).not.toBeNull();

    const description = descMatch?.[1] || "";
    // Description should mention key use cases
    expect(description).toMatch(/past decision|previous session/i);
    expect(description).toMatch(/knowledge graph/i);
  });

  it("should have markdown body with usage examples", () => {
    // Find the body (after frontmatter)
    const endFrontmatter = content.indexOf("---", 3) + 3;
    const body = content.slice(endFrontmatter).trim();

    // Should have brain_query examples
    expect(body).toMatch(/brain_query/);

    // Should have when to use section
    expect(body).toMatch(/when to use/i);

    // Should have example queries
    expect(body).toMatch(/authentication|error|quirks?/i);
  });

  it("should not have extraneous frontmatter fields", () => {
    const endIndex = content.indexOf("---", 3);
    const frontmatter = content.slice(3, endIndex).trim();
    const lines = frontmatter.split("\n").filter((l) => l.trim());

    // Should only have name and description fields (description might span multiple lines)
    const fieldNames = lines
      .filter((l) => l.match(/^\w+:/))
      .map((l) => l.match(/^(\w+):/)?.[1]);

    expect(fieldNames).toContain("name");
    expect(fieldNames).toContain("description");
    // No other top-level fields
    expect(
      fieldNames.filter((f) => f !== "name" && f !== "description")
    ).toStrictEqual([]);
  });
});
