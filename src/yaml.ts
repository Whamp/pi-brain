/**
 * Minimal YAML parser and serializer for flat values, one-level nested objects,
 * nested scalar lists, and top-level lists of one-level objects.
 */

type YamlItem = Record<string, string>;
type YamlNestedValue = string | string[];
type YamlValue = string | Record<string, YamlNestedValue> | YamlItem[];
type YamlObject = Record<string, YamlValue>;

const NEEDS_QUOTING = /[-:{}[\],&*?|>!%@#`]|^\d{4}-\d{2}/;

/** True for lines that are blank or start with a YAML comment */
function isCommentOrBlank(line: string): boolean {
  const trimmed = line.trim();
  return trimmed === "" || trimmed.startsWith("#");
}

/**
 * Strip a trailing YAML comment from a scalar value: a `#` starts a comment
 * only at the start of the value or when preceded by whitespace, and only
 * outside single- or double-quoted regions. Escaped quotes (`\"`) do not
 * end a double-quoted region.
 */
function stripComment(value: string): string {
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < value.length; i++) {
    const char = value[i];

    if (char === "\\" && inDouble && i + 1 < value.length) {
      i++;
      continue;
    }

    if (char === "'" && !inDouble) {
      inSingle = !inSingle;
    } else if (char === '"' && !inSingle) {
      inDouble = !inDouble;
    } else if (char === "#" && !inSingle && !inDouble) {
      const prev = i === 0 ? "" : value[i - 1];
      if (i === 0 || prev === " " || prev === "\t") {
        return value.slice(0, i).trimEnd();
      }
    }
  }

  return value;
}

function unescapeDoubleQuoted(body: string): string {
  let result = "";

  for (let i = 0; i < body.length; i++) {
    if (body[i] === "\\" && i + 1 < body.length) {
      result += body[i + 1];
      i++;
      continue;
    }

    result += body[i];
  }

  return result;
}

function unquote(value: string): string {
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    return unescapeDoubleQuoted(value.slice(1, -1));
  }

  if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }

  return value;
}

function escapeDoubleQuoted(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function quoteIfNeeded(value: string): string {
  if (
    value === "" ||
    value.trim() !== value ||
    value.includes("'") ||
    value.includes('"') ||
    value.includes("\\") ||
    NEEDS_QUOTING.test(value)
  ) {
    return `"${escapeDoubleQuoted(value)}"`;
  }

  return value;
}

/**
 * Quote unquoted scalars that contain `#` so later comment stripping cannot
 * truncate them. Used to migrate state.yaml files written before `#` quoting.
 */
export function quoteUnquotedHashScalars(content: string): string {
  return content
    .split("\n")
    .map((line) => {
      const trimmedStart = line.trimStart();
      if (trimmedStart === "" || trimmedStart.startsWith("#")) {
        return line;
      }

      const colonIdx = line.indexOf(":");
      if (colonIdx === -1) {
        return line;
      }

      const value = line.slice(colonIdx + 1).trim();
      if (
        value === "" ||
        value.startsWith('"') ||
        value.startsWith("'") ||
        !value.includes("#")
      ) {
        return line;
      }

      return `${line.slice(0, colonIdx + 1)} ${quoteIfNeeded(value)}`;
    })
    .join("\n");
}

function parseKeyValue(text: string): { key: string; value: string } | null {
  const colonIdx = text.indexOf(":");
  if (colonIdx === -1) {
    return null;
  }

  return {
    key: text.slice(0, colonIdx).trim(),
    value: stripComment(text.slice(colonIdx + 1).trim()),
  };
}

function parseNestedScalarList(
  lines: string[],
  startIndex: number
): {
  value: string[];
  nextIndex: number;
} {
  const items: string[] = [];
  let i = startIndex;

  while (i < lines.length) {
    const line = lines[i];
    if (isCommentOrBlank(line)) {
      i++;
      continue;
    }

    if (!line.startsWith("    - ")) {
      break;
    }

    const raw = stripComment(line.slice(6).trim());
    if (raw !== "") {
      items.push(unquote(raw));
    }

    i++;
  }

  return { value: items, nextIndex: i };
}

function parseNestedObject(
  lines: string[],
  startIndex: number
): {
  value: Record<string, YamlNestedValue>;
  nextIndex: number;
} {
  const nested: Record<string, YamlNestedValue> = {};
  let i = startIndex;

  while (i < lines.length) {
    const line = lines[i];
    if (isCommentOrBlank(line)) {
      i++;
      continue;
    }

    if (!line.startsWith("  ") || line.startsWith("    ")) {
      break;
    }

    const parsed = parseKeyValue(line.slice(2));
    if (!parsed) {
      i++;
      continue;
    }

    if (parsed.value === "") {
      let lookAhead = i + 1;
      while (lookAhead < lines.length && isCommentOrBlank(lines[lookAhead])) {
        lookAhead++;
      }

      if (lookAhead < lines.length && lines[lookAhead].startsWith("    - ")) {
        const parsedList = parseNestedScalarList(lines, lookAhead);
        nested[parsed.key] = parsedList.value;
        i = parsedList.nextIndex;
        continue;
      }
    }

    nested[parsed.key] = unquote(parsed.value);
    i++;
  }

  return { value: nested, nextIndex: i };
}

function parseList(
  lines: string[],
  startIndex: number
): {
  value: YamlItem[];
  nextIndex: number;
} {
  const list: YamlItem[] = [];
  let currentItem: YamlItem | null = null;
  let i = startIndex;

  while (i < lines.length) {
    const line = lines[i];
    if (isCommentOrBlank(line)) {
      i++;
      continue;
    }

    if (line.startsWith("  - ")) {
      const item: YamlItem = {};
      const inline = line.slice(4).trim();
      if (inline !== "") {
        const parsed = parseKeyValue(inline);
        if (parsed) {
          item[parsed.key] = unquote(parsed.value);
        }
      }

      list.push(item);
      currentItem = item;
      i++;
      continue;
    }

    if (line.startsWith("    ") && currentItem !== null) {
      const parsed = parseKeyValue(line.slice(4));
      if (parsed) {
        currentItem[parsed.key] = unquote(parsed.value);
      }

      i++;
      continue;
    }

    break;
  }

  return { value: list, nextIndex: i };
}

export function parseYaml(input: string): YamlObject {
  const result: YamlObject = {};
  const lines = input.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (isCommentOrBlank(line)) {
      i++;
      continue;
    }

    if (line.startsWith(" ")) {
      i++;
      continue;
    }

    const parsedTop = parseKeyValue(line);
    if (!parsedTop) {
      i++;
      continue;
    }

    const { key, value } = parsedTop;
    if (value !== "") {
      result[key] = unquote(value);
      i++;
      continue;
    }

    i++;
    while (i < lines.length && isCommentOrBlank(lines[i])) {
      i++;
    }

    if (i >= lines.length || !lines[i].startsWith("  ")) {
      result[key] = {};
      continue;
    }

    if (lines[i].startsWith("  - ")) {
      const parsedList = parseList(lines, i);
      result[key] = parsedList.value;
      i = parsedList.nextIndex;
      continue;
    }

    const parsedNested = parseNestedObject(lines, i);
    result[key] = parsedNested.value;
    i = parsedNested.nextIndex;
  }

  return result;
}

export function serializeYaml(obj: YamlObject): string {
  const lines: string[] = [];

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      lines.push(`${key}: ${quoteIfNeeded(value)}`);
      continue;
    }

    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const item of value) {
        const entries = Object.entries(item);
        if (entries.length === 0) {
          lines.push("  -");
          continue;
        }

        const [firstEntry, ...remainingEntries] = entries;
        const [firstKey, firstValue] = firstEntry;
        lines.push(`  - ${firstKey}: ${quoteIfNeeded(firstValue)}`);
        for (const [nestedKey, nestedValue] of remainingEntries) {
          lines.push(`    ${nestedKey}: ${quoteIfNeeded(nestedValue)}`);
        }
      }
      continue;
    }

    lines.push(`${key}:`);
    for (const [nestedKey, nestedValue] of Object.entries(value)) {
      if (Array.isArray(nestedValue)) {
        lines.push(`  ${nestedKey}:`);
        for (const item of nestedValue) {
          lines.push(`    - ${quoteIfNeeded(item)}`);
        }
        continue;
      }

      lines.push(`  ${nestedKey}: ${quoteIfNeeded(nestedValue)}`);
    }
  }

  return lines.join("\n");
}
