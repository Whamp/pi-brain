import * as fs from "node:fs";
import * as path from "node:path";

/** Tool-facing error when a branch name would escape `.memory/branches/`. */
const INVALID_BRANCH_NAME_MESSAGE =
  "Branch names cannot escape .memory/branches: no '\\', '.', '..', or empty path segments.";

/**
 * Return the branch-name rule error, or null when `name` is a safe path
 * under `.memory/branches/` (single segment or nested like `feat/auth`).
 */
export function invalidBranchNameReason(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed === "" || trimmed.includes("\\") || path.isAbsolute(trimmed)) {
    return INVALID_BRANCH_NAME_MESSAGE;
  }

  const segments = trimmed.split("/");
  for (const segment of segments) {
    if (
      segment === "" ||
      segment === "." ||
      segment === ".." ||
      segment.startsWith(".")
    ) {
      return INVALID_BRANCH_NAME_MESSAGE;
    }
  }

  return null;
}

function assertValidBranchName(name: string): void {
  const reason = invalidBranchNameReason(name);
  if (reason) {
    throw new Error(reason);
  }
}

function sortBranchNames(names: readonly string[]): string[] {
  const sorted: string[] = [];

  for (const name of names) {
    const insertIndex = sorted.findIndex(
      (existing) => existing.localeCompare(name) > 0
    );

    if (insertIndex === -1) {
      sorted.push(name);
      continue;
    }

    sorted.splice(insertIndex, 0, name);
  }

  return sorted;
}

function isContainedBranchDir(branchesDir: string, resolved: string): boolean {
  const root = path.resolve(branchesDir);
  const rel = path.relative(root, resolved);
  return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
}

/**
 * Manages `.memory/branches/` directory operations.
 * Each branch has: log.md, commits.md, metadata.yaml.
 */
export class BranchManager {
  private readonly branchesDir: string;

  constructor(projectDir: string) {
    this.branchesDir = path.join(projectDir, ".memory", "branches");
  }

  createBranch(name: string, purpose: string): void {
    const branchDir = this.resolveBranchDir(name);
    fs.mkdirSync(branchDir, { recursive: true });
    fs.writeFileSync(path.join(branchDir, "log.md"), "");
    fs.writeFileSync(
      path.join(branchDir, "commits.md"),
      `# ${name}\n\n**Purpose:** ${purpose}\n`
    );
    fs.writeFileSync(path.join(branchDir, "metadata.yaml"), "");
  }

  appendLog(branch: string, content: string): void {
    const logPath = this.logPath(branch);
    fs.appendFileSync(logPath, content);
  }

  readLog(branch: string): string {
    const logPath = this.logPath(branch);
    if (!fs.existsSync(logPath)) {
      return "";
    }
    return fs.readFileSync(logPath, "utf8");
  }

  clearLog(branch: string): void {
    const logPath = this.logPath(branch);
    if (fs.existsSync(logPath)) {
      fs.writeFileSync(logPath, "");
    }
  }

  appendCommit(branch: string, entry: string): void {
    const commitsPath = this.commitsPath(branch);
    fs.appendFileSync(commitsPath, entry);
  }

  readCommits(branch: string): string {
    const commitsPath = this.commitsPath(branch);
    if (!fs.existsSync(commitsPath)) {
      return "";
    }
    return fs.readFileSync(commitsPath, "utf8");
  }

  readMetadata(branch: string): string {
    const metaPath = path.join(this.resolveBranchDir(branch), "metadata.yaml");
    if (!fs.existsSync(metaPath)) {
      return "";
    }
    return fs.readFileSync(metaPath, "utf8");
  }

  protected readBranchEntries(): string[] {
    return fs.readdirSync(this.branchesDir);
  }

  listBranches(): string[] {
    if (!fs.existsSync(this.branchesDir)) {
      return [];
    }

    const branchNames: string[] = [];
    this.collectBranchNames(this.branchesDir, "", branchNames);
    return sortBranchNames(branchNames);
  }

  branchExists(name: string): boolean {
    const branchDir = this.containedBranchDir(name);
    if (!branchDir) {
      return false;
    }

    return fs.existsSync(branchDir) && fs.statSync(branchDir).isDirectory();
  }

  getLogSizeBytes(branch: string): number {
    const lp = this.logPath(branch);
    if (!fs.existsSync(lp)) {
      return 0;
    }
    return fs.statSync(lp).size;
  }

  getLogTurnCount(branch: string): number {
    const log = this.readLog(branch);
    if (log === "") {
      return 0;
    }
    const matches = log.match(/^## Turn /gm);
    return matches ? matches.length : 0;
  }

  getLatestCommit(branch: string): string | null {
    const commits = this.readCommits(branch);
    if (commits === "") {
      return null;
    }

    // Split on commit separator (--- followed by ## Commit)
    const parts = commits.split(/\n---\n/);
    // Find the last part that contains a commit header
    for (let i = parts.length - 1; i >= 0; i--) {
      if (parts[i].includes("## Commit ")) {
        return parts[i].trim();
      }
    }

    return null;
  }

  private collectBranchNames(
    dir: string,
    relative: string,
    names: string[]
  ): void {
    const entries =
      relative === "" ? this.readBranchEntries() : fs.readdirSync(dir);

    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isDirectory()) {
        continue;
      }

      const childRelative = relative === "" ? entry : `${relative}/${entry}`;
      if (fs.existsSync(path.join(fullPath, "commits.md"))) {
        names.push(childRelative);
      }

      this.collectBranchNames(fullPath, childRelative, names);
    }
  }

  private containedBranchDir(name: string): string | null {
    if (invalidBranchNameReason(name)) {
      return null;
    }

    const resolved = path.resolve(this.branchesDir, name);
    if (!isContainedBranchDir(this.branchesDir, resolved)) {
      return null;
    }

    return resolved;
  }

  private resolveBranchDir(name: string): string {
    assertValidBranchName(name);
    const resolved = this.containedBranchDir(name);
    if (!resolved) {
      throw new Error(INVALID_BRANCH_NAME_MESSAGE);
    }

    return resolved;
  }

  private logPath(branch: string): string {
    return path.join(this.resolveBranchDir(branch), "log.md");
  }

  private commitsPath(branch: string): string {
    return path.join(this.resolveBranchDir(branch), "commits.md");
  }
}
