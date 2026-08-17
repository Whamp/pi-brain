import fc from "fast-check";

import { parseYaml, serializeYaml } from "./yaml.js";

// Helpers

/**
 * Property-based tests for YAML roundtrip and invariants.
 *
 * Strategy constraints reflect the minimal YAML subset this parser supports:
 * - Keys: no colons, no newlines, no leading/trailing whitespace, non-empty
 * - Values: no newlines, no double-quotes (quoting wraps in `"`)
 * - Structure: flat strings, one-level nested objects, top-level lists of
 *   one-level objects
 */

/** Safe YAML key: alphanumeric + underscore, non-empty, no leading space */
const yamlKey = fc
  .stringMatching(/^[a-zA-Z_][a-zA-Z0-9_]{0,19}$/)
  .filter((k) => k.length > 0);

/** Safe YAML scalar value: no newlines, no double-quotes (breaks quoting) */
const yamlValue = fc
  .string({ size: "-1" })
  .filter((v) => !v.includes("\n") && !v.includes("\r") && !v.includes('"'));

/**
 * fc.dictionary creates objects with null prototype ({__proto__: null}).
 * The YAML parser produces normal objects ({}). Convert to match.
 */
function toPlainObject<V>(dict: Record<string, V>): Record<string, V> {
  return { ...dict };
}

/** A nested object (one level deep) */
const nestedObject = fc
  .dictionary(yamlKey, yamlValue, { minKeys: 1 })
  .map(toPlainObject);

/** A list item (one-level object) */
const listItem = fc
  .dictionary(yamlKey, yamlValue, { minKeys: 1 })
  .map(toPlainObject);

/** A list of items */
const yamlList = fc.array(listItem, { minLength: 1 });

/** A YamlValue: string, nested object, or list */
const yamlValueArb: fc.Arbitrary<
  string | Record<string, string> | Record<string, string>[]
> = fc.oneof(yamlValue, nestedObject, yamlList);

/** A complete YamlObject */
const yamlObject = fc
  .dictionary(yamlKey, yamlValueArb, { minKeys: 1 })
  .map(toPlainObject);

/** A flat-only YamlObject (all values are strings) */
const flatYamlObject = fc
  .dictionary(yamlKey, yamlValue, { minKeys: 1 })
  .map(toPlainObject);

describe("parseYaml", () => {
  it("should parse flat key-value pairs", () => {
    const input = `active_branch: main\ninitialized: "2026-02-22T14:00:00Z"`;
    expect(parseYaml(input)).toStrictEqual({
      active_branch: "main",
      initialized: "2026-02-22T14:00:00Z",
    });
  });

  it("should parse nested objects (one level)", () => {
    const input = `last_commit:\n  branch: main\n  hash: a1b2c3d4\n  summary: "Decided X"`;
    expect(parseYaml(input)).toStrictEqual({
      last_commit: { branch: "main", hash: "a1b2c3d4", summary: "Decided X" },
    });
  });

  it("should parse top-level list of one-level objects", () => {
    const input = [
      "sessions:",
      "  - file: /tmp/session-1.jsonl",
      "    branch: main",
      '    started: "2026-02-23T00:00:00Z"',
      "  - file: /tmp/session-2.jsonl",
      "    branch: feature-x",
      '    started: "2026-02-23T01:00:00Z"',
    ].join("\n");

    expect(parseYaml(input)).toStrictEqual({
      sessions: [
        {
          file: "/tmp/session-1.jsonl",
          branch: "main",
          started: "2026-02-23T00:00:00Z",
        },
        {
          file: "/tmp/session-2.jsonl",
          branch: "feature-x",
          started: "2026-02-23T01:00:00Z",
        },
      ],
    });
  });

  it("should return empty object for empty or whitespace input", () => {
    expect(parseYaml("")).toStrictEqual({});
    expect(parseYaml("  \n  ")).toStrictEqual({});
  });
});

describe("serializeYaml", () => {
  it("should serialize flat key-value pairs", () => {
    const obj = { active_branch: "main", initialized: "2026-02-22" };
    expect(serializeYaml(obj)).toBe(
      `active_branch: main\ninitialized: "2026-02-22"`
    );
  });

  it("should serialize nested objects (one level)", () => {
    const obj = { last_commit: { branch: "main", hash: "a1b2c3d4" } };
    expect(serializeYaml(obj)).toBe(
      `last_commit:\n  branch: main\n  hash: a1b2c3d4`
    );
  });

  it("should serialize top-level list of one-level objects", () => {
    const obj = {
      sessions: [
        {
          file: "/tmp/session-1.jsonl",
          branch: "main",
          started: "2026-02-23T00:00:00Z",
        },
      ],
    };

    expect(serializeYaml(obj)).toBe(
      [
        "sessions:",
        '  - file: "/tmp/session-1.jsonl"',
        "    branch: main",
        '    started: "2026-02-23T00:00:00Z"',
      ].join("\n")
    );
  });

  it("should round-trip through parse and serialize", () => {
    const original = {
      active_branch: "main",
      last_commit: { branch: "main", hash: "abc" },
      sessions: [
        {
          file: "/tmp/session.jsonl",
          branch: "main",
          started: "2026-02-23T00:00:00Z",
        },
      ],
    };
    expect(parseYaml(serializeYaml(original))).toStrictEqual(original);
  });
});

describe("yaml property-based tests", () => {
  it("should roundtrip: parseYaml(serializeYaml(obj)) deep-equals obj", () => {
    fc.assert(
      fc.property(yamlObject, (obj) => {
        // Act
        const serialized = serializeYaml(obj);
        const parsed = parseYaml(serialized);

        // Assert
        expect(parsed).toStrictEqual(obj);
      })
    );
  });

  it("should be idempotent: serialize-parse-serialize applied twice yields same result", () => {
    fc.assert(
      fc.property(yamlObject, (obj) => {
        // Act
        const once = serializeYaml(parseYaml(serializeYaml(obj)));
        const twice = serializeYaml(parseYaml(once));

        // Assert
        expect(twice).toBe(once);
      })
    );
  });

  it("should emit each key exactly once for flat objects", () => {
    fc.assert(
      fc.property(flatYamlObject, (obj) => {
        // Act
        const serialized = serializeYaml(obj);

        // Assert
        for (const key of Object.keys(obj)) {
          const occurrences = serialized
            .split("\n")
            .filter((line) => line.startsWith(`${key}: `));
          expect(occurrences).toHaveLength(1);
        }
      })
    );
  });

  it("should never produce empty output for non-empty objects", () => {
    fc.assert(
      fc.property(yamlObject, (obj) => {
        // Act
        const serialized = serializeYaml(obj);

        // Assert
        expect(serialized.length).toBeGreaterThan(0);
      })
    );
  });

  it("should preserve all top-level keys through roundtrip", () => {
    fc.assert(
      fc.property(yamlObject, (obj) => {
        // Act
        const parsed = parseYaml(serializeYaml(obj));
        const parsedKeySet = new Set(Object.keys(parsed));
        const objKeySet = new Set(Object.keys(obj));

        // Assert
        expect(parsedKeySet).toStrictEqual(objKeySet);
      })
    );
  });

  it("should never throw on arbitrary input", () => {
    fc.assert(
      fc.property(fc.string({ size: "-1" }), (input) => {
        expect(() => parseYaml(input)).not.toThrow();
      })
    );
  });
});

// --- comment handling ---

describe("parseYaml comment handling", () => {
  it("strips an inline comment after an unquoted scalar", () => {
    expect(parseYaml("model: openai/gpt-4o  # note")).toStrictEqual({
      model: "openai/gpt-4o",
    });
  });

  it("keeps # inside double-quoted values", () => {
    expect(parseYaml('model: "openai/x # y"')).toStrictEqual({
      model: "openai/x # y",
    });
  });

  it("keeps # inside single-quoted values", () => {
    expect(parseYaml("model: 'a # b'")).toStrictEqual({ model: "a # b" });
  });

  it("keeps # that is not preceded by whitespace", () => {
    expect(parseYaml("model: a#b")).toStrictEqual({ model: "a#b" });
  });

  it("treats a value that is only a comment like an empty value", () => {
    // `key:` with no value parses as an empty nested map; a comment-only
    // value must behave identically after stripping
    expect(parseYaml("model: #fff")).toStrictEqual({ model: {} });
  });

  it("ignores top-level comment lines, even with colons", () => {
    expect(parseYaml("# a comment: with colon\nkey: v")).toStrictEqual({
      key: "v",
    });
  });

  it("preserves a nested map across a comment line after the key", () => {
    expect(parseYaml("committer:\n# note\n  model: x\n")).toStrictEqual({
      committer: { model: "x" },
    });
  });

  it("preserves indented comment lines inside a nested map", () => {
    expect(parseYaml("committer:\n  # note\n  model: x\n")).toStrictEqual({
      committer: { model: "x" },
    });
  });

  it("preserves comment lines inside a list", () => {
    expect(parseYaml("items:\n  # note\n  - name: a\n")).toStrictEqual({
      items: [{ name: "a" }],
    });
  });

  it("serializes values containing ' #' quoted so they round-trip", () => {
    const original = { key: "x #y" };
    const serialized = serializeYaml(original);

    expect(serialized).toBe('key: "x #y"');
    expect(parseYaml(serialized)).toStrictEqual(original);
  });
});
