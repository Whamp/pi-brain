import * as fs from "node:fs";
import * as path from "node:path";

const BRAIN_NPM_SPEC = /^npm:pi-brain(?:@|$)/;
const BRAIN_GIT_SPEC = /github\.com\/Whamp\/pi-brain(?:\/|$)/i;

function extensionSpecsFromArgv(argv: readonly string[]): string[] {
  const specs: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if ((arg === "--extension" || arg === "-e") && i + 1 < argv.length) {
      specs.push(argv[i + 1]);
      i += 1;
    }
  }

  return specs;
}

function extensionSpecsFromSettings(settingsPath: string): string[] {
  if (!fs.existsSync(settingsPath)) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return [];
    }

    if (!("extensions" in parsed) || !Array.isArray(parsed.extensions)) {
      return [];
    }

    const { extensions } = parsed;

    const specs: string[] = [];
    for (const item of extensions) {
      if (typeof item === "string" && item.trim() !== "") {
        specs.push(item.trim());
      }
    }

    return specs;
  } catch {
    return [];
  }
}

function extensionFilesInDir(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const specs: string[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    if (entry.isFile() && /\.(?:ts|js)$/.test(entry.name)) {
      specs.push(fullPath);
      continue;
    }

    if (!entry.isDirectory()) {
      continue;
    }

    const indexTs = path.join(fullPath, "index.ts");
    const indexJs = path.join(fullPath, "index.js");
    if (fs.existsSync(indexTs)) {
      specs.push(indexTs);
    } else if (fs.existsSync(indexJs)) {
      specs.push(indexJs);
    }
  }

  return specs;
}

/**
 * True when an extension spec would reload this pi-brain package in the
 * committer child — that child must not append to the log it is distilling.
 */
export function isBrainExtensionSpec(
  spec: string,
  cwd: string,
  brainPackageDir: string
): boolean {
  const trimmed = spec.trim();
  if (trimmed === "") {
    return false;
  }

  if (BRAIN_NPM_SPEC.test(trimmed) || BRAIN_GIT_SPEC.test(trimmed)) {
    return true;
  }

  const resolved = path.resolve(cwd, trimmed);
  const root = path.resolve(brainPackageDir);
  const rel = path.relative(root, resolved);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

/**
 * Collect --extension specs the committer child should load: session CLI
 * flags, settings.json lists, and Pi's standard extension directories,
 * minus this Brain package.
 */
export function discoverCommitterExtensionSpecs(input: {
  cwd: string;
  argv: readonly string[];
  homeDir: string;
  brainPackageDir: string;
}): string[] {
  const specs: string[] = [];
  const seen = new Set<string>();

  const add = (spec: string): void => {
    const trimmed = spec.trim();
    if (trimmed === "" || seen.has(trimmed)) {
      return;
    }

    if (isBrainExtensionSpec(trimmed, input.cwd, input.brainPackageDir)) {
      return;
    }

    seen.add(trimmed);
    specs.push(trimmed);
  };

  for (const spec of extensionSpecsFromArgv(input.argv)) {
    add(spec);
  }

  for (const spec of extensionSpecsFromSettings(
    path.join(input.cwd, ".pi", "settings.json")
  )) {
    add(spec);
  }

  for (const spec of extensionSpecsFromSettings(
    path.join(input.homeDir, ".pi", "agent", "settings.json")
  )) {
    add(spec);
  }

  for (const spec of extensionFilesInDir(
    path.join(input.cwd, ".pi", "extensions")
  )) {
    add(spec);
  }

  for (const spec of extensionFilesInDir(
    path.join(input.homeDir, ".pi", "agent", "extensions")
  )) {
    add(spec);
  }

  return specs;
}
