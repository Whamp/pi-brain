import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { BranchManager } from "./branches.js";
import { executeMemoryBranch } from "./memory-branch.js";
import { MemoryState } from "./state.js";

describe("executeMemoryBranch", () => {
  let tmpDir: string;
  let state: MemoryState;
  let branches: BranchManager;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "memory-branch-tool-test-"));
    const memoryDir = path.join(tmpDir, ".memory");
    fs.mkdirSync(path.join(memoryDir, "branches"), { recursive: true });

    fs.writeFileSync(
      path.join(memoryDir, "state.yaml"),
      'active_branch: main\ninitialized: "2026-02-22T14:00:00Z"'
    );

    state = new MemoryState(tmpDir);
    state.load();
    branches = new BranchManager(tmpDir);
    branches.createBranch("main", "Main branch");

    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // --- create action ---

  it("should create a new branch and switch to it", () => {
    const result = executeMemoryBranch(
      { action: "create", name: "explore-redis", purpose: "Evaluate Redis" },
      state,
      branches,
      tmpDir
    );

    expect(result).toContain("explore-redis");
    expect(branches.branchExists("explore-redis")).toBeTruthy();
    expect(state.activeBranch).toBe("explore-redis");
  });

  it("should initialize commits.md with branch purpose", () => {
    executeMemoryBranch(
      { action: "create", name: "explore-redis", purpose: "Evaluate Redis" },
      state,
      branches,
      tmpDir
    );

    const commits = branches.readCommits("explore-redis");
    expect(commits).toContain("Evaluate Redis");
  });

  it("should reject duplicate branch names on create", () => {
    const result = executeMemoryBranch(
      { action: "create", name: "main", purpose: "Duplicate" },
      state,
      branches,
      tmpDir
    );

    expect(result).toContain("already exists");
  });

  it("should require name and purpose for create", () => {
    const result = executeMemoryBranch(
      { action: "create" },
      state,
      branches,
      tmpDir
    );

    expect(result).toContain("required");
  });

  it("rejects invalid branch names on create without throwing", () => {
    const invalidNames = ["../x", "a\\b", ".hidden", "..", "."];

    for (const name of invalidNames) {
      const result = executeMemoryBranch(
        { action: "create", name, purpose: "invalid" },
        state,
        branches,
        tmpDir
      );

      expect(result).toMatch(/cannot escape \.memory\/branches/);
      expect(result).not.toContain("# Memory Status");
      expect(state.activeBranch).toBe("main");
    }
  });

  it("creates a nested git-style branch name", () => {
    const result = executeMemoryBranch(
      { action: "create", name: "feat/auth", purpose: "Auth work" },
      state,
      branches,
      tmpDir
    );

    expect(result).toContain("feat/auth");
    expect(branches.branchExists("feat/auth")).toBeTruthy();
    expect(state.activeBranch).toBe("feat/auth");
  });

  // --- switch action ---

  it("should switch to an existing branch", () => {
    branches.createBranch("feature-x", "Feature X");

    const result = executeMemoryBranch(
      { action: "switch", branch: "feature-x" },
      state,
      branches,
      tmpDir
    );

    expect(state.activeBranch).toBe("feature-x");
    expect(result).toContain("feature-x");
  });

  it("should return latest commit on switch for orientation", () => {
    branches.createBranch("feature-x", "Feature X");
    branches.appendCommit(
      "feature-x",
      "\n---\n\n## Commit a1b2c3d4 | 2026-02-22\n\n### This Commit's Contribution\n\nRedis is viable.\n"
    );

    const result = executeMemoryBranch(
      { action: "switch", branch: "feature-x" },
      state,
      branches,
      tmpDir
    );

    expect(result).toContain("Redis is viable.");
  });

  it("should reject switching to nonexistent branch", () => {
    const result = executeMemoryBranch(
      { action: "switch", branch: "nope" },
      state,
      branches,
      tmpDir
    );

    expect(result).toContain("not found");
    expect(state.activeBranch).toBe("main");
  });

  it("should reject switching to a nested branch's parent directory", () => {
    executeMemoryBranch(
      { action: "create", name: "feat/auth", purpose: "Auth work" },
      state,
      branches,
      tmpDir
    );

    const result = executeMemoryBranch(
      { action: "switch", branch: "feat" },
      state,
      branches,
      tmpDir
    );

    expect(result).toContain("not found");
    expect(state.activeBranch).toBe("feat/auth");
  });

  it("should require branch for switch", () => {
    const result = executeMemoryBranch(
      { action: "switch" },
      state,
      branches,
      tmpDir
    );

    expect(result).toContain("required");
  });

  it("rejects invalid branch names on switch", () => {
    const result = executeMemoryBranch(
      { action: "switch", branch: "../x" },
      state,
      branches,
      tmpDir
    );

    expect(result).toMatch(/cannot escape \.memory\/branches/);
    expect(result).not.toContain("# Memory Status");
    expect(state.activeBranch).toBe("main");
  });

  // --- merge action ---

  it("should append a merge commit to the current branch", () => {
    branches.createBranch("explore-redis", "Evaluate Redis");
    branches.appendCommit(
      "explore-redis",
      "\n---\n\n## Commit a1b2c3d4 | 2026-02-22\n\n### This Commit's Contribution\n\nRedis is viable.\n"
    );

    const result = executeMemoryBranch(
      {
        action: "merge",
        branch: "explore-redis",
        synthesis: "Redis confirmed as caching layer.",
      },
      state,
      branches,
      tmpDir
    );

    expect(result).toContain("Merge commit");
    const commits = branches.readCommits("main");
    expect(commits).toContain("Merge from explore-redis");
    expect(commits).toContain("Redis confirmed as caching layer.");
  });

  it("should reject merging a branch into itself", () => {
    const result = executeMemoryBranch(
      { action: "merge", branch: "main", synthesis: "Self merge." },
      state,
      branches,
      tmpDir
    );

    expect(result).toContain("Cannot merge");
  });

  it("should reject merging a nonexistent branch", () => {
    const result = executeMemoryBranch(
      { action: "merge", branch: "nonexistent", synthesis: "Missing." },
      state,
      branches,
      tmpDir
    );

    expect(result).toContain("not found");
  });

  it("should require branch and synthesis for merge", () => {
    const result = executeMemoryBranch(
      { action: "merge" },
      state,
      branches,
      tmpDir
    );

    expect(result).toContain("required");
  });

  it("rejects invalid branch names on merge", () => {
    const result = executeMemoryBranch(
      { action: "merge", branch: "../x", synthesis: "Nope." },
      state,
      branches,
      tmpDir
    );

    expect(result).toMatch(/cannot escape \.memory\/branches/);
    expect(result).not.toContain("# Memory Status");
  });

  it("should update state with last commit info on merge", () => {
    vi.setSystemTime(new Date("2026-02-22T16:00:00.000Z"));
    branches.createBranch("explore-redis", "Evaluate Redis");

    executeMemoryBranch(
      {
        action: "merge",
        branch: "explore-redis",
        synthesis: "Merged Redis findings.",
      },
      state,
      branches,
      tmpDir
    );

    expect(state.lastCommit).not.toBeNull();
    expect(state.lastCommit?.branch).toBe("main");
    expect(state.lastCommit?.summary).toContain("Merge from explore-redis");
  });

  // --- invalid action ---

  it("should reject invalid action values", () => {
    const result = executeMemoryBranch(
      { action: "delete" },
      state,
      branches,
      tmpDir
    );

    expect(result).toContain("Unknown action");
  });

  // --- status appending ---

  it("should include status view in create result", () => {
    fs.writeFileSync(
      path.join(tmpDir, ".memory/main.md"),
      "# Roadmap\n\nGoals.\n"
    );

    const result = executeMemoryBranch(
      { action: "create", name: "test-branch", purpose: "Testing" },
      state,
      branches,
      tmpDir
    );

    expect(result).toContain("Created branch");
    expect(result).toContain("# Memory Status");
    expect(result).toContain("Active branch: test-branch");
  });

  it("should include status view in switch result", () => {
    branches.createBranch("feature-x", "Feature X");
    fs.writeFileSync(
      path.join(tmpDir, ".memory/main.md"),
      "# Roadmap\n\nGoals.\n"
    );

    const result = executeMemoryBranch(
      { action: "switch", branch: "feature-x" },
      state,
      branches,
      tmpDir
    );

    expect(result).toContain("Switched to branch");
    expect(result).toContain("# Memory Status");
    expect(result).toContain("Active branch: feature-x");
  });

  it("should include status view in merge result", () => {
    branches.createBranch("explore-redis", "Redis eval");
    fs.writeFileSync(
      path.join(tmpDir, ".memory/main.md"),
      "# Roadmap\n\nGoals.\n"
    );

    const result = executeMemoryBranch(
      {
        action: "merge",
        branch: "explore-redis",
        synthesis: "Redis works.",
      },
      state,
      branches,
      tmpDir
    );

    expect(result).toContain("Merge commit");
    expect(result).toContain("# Memory Status");
  });

  it("should keep auto-appended status compact when roadmap is large", () => {
    fs.writeFileSync(
      path.join(tmpDir, ".memory/main.md"),
      `# Roadmap\n\n${"x".repeat(20_000)}`
    );

    const result = executeMemoryBranch(
      { action: "create", name: "compact-test", purpose: "Testing" },
      state,
      branches,
      tmpDir
    );

    expect(result).toContain("# Memory Status");
    expect(result).toContain("Roadmap truncated");
    expect(result.length).toBeLessThan(5000);
  });

  it("should NOT include status view in error results", () => {
    const result = executeMemoryBranch(
      { action: "switch", branch: "nonexistent" },
      state,
      branches,
      tmpDir
    );

    expect(result).toContain("not found");
    expect(result).not.toContain("# Memory Status");
  });
});
