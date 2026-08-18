import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { discoverCommitterExtensionSpecs } from "./committer-extensions.js";

describe("discoverCommitterExtensionSpecs", () => {
  let cwd: string;
  let homeDir: string;
  let brainPackageDir: string;

  beforeEach(() => {
    cwd = fs.mkdtempSync(path.join(os.tmpdir(), "committer-ext-cwd-"));
    homeDir = fs.mkdtempSync(path.join(os.tmpdir(), "committer-ext-home-"));
    brainPackageDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "committer-ext-brain-")
    );
    fs.mkdirSync(path.join(brainPackageDir, "src"), { recursive: true });
    fs.writeFileSync(path.join(brainPackageDir, "src", "index.ts"), "");
  });

  afterEach(() => {
    fs.rmSync(cwd, { recursive: true, force: true });
    fs.rmSync(homeDir, { recursive: true, force: true });
    fs.rmSync(brainPackageDir, { recursive: true, force: true });
  });

  function discover(argv: string[] = ["node", "pi"]): string[] {
    return discoverCommitterExtensionSpecs({
      cwd,
      argv,
      homeDir,
      brainPackageDir,
    });
  }

  it("collects -e and --extension specs from argv", () => {
    expect(
      discover([
        "pi",
        "-e",
        "./custom-provider.ts",
        "--extension",
        "./other.ts",
      ])
    ).toStrictEqual(["./custom-provider.ts", "./other.ts"]);
  });

  it("drops npm:pi-brain and paths inside the Brain package", () => {
    const brainEntry = path.join(brainPackageDir, "src", "index.ts");
    expect(
      discover([
        "pi",
        "-e",
        "./custom-provider.ts",
        "--extension",
        "npm:pi-brain",
        "-e",
        brainEntry,
        "-e",
        "npm:pi-brain@0.1.9",
      ])
    ).toStrictEqual(["./custom-provider.ts"]);
  });

  it("drops git-URL Brain specs including SSH form and .git suffix", () => {
    expect(
      discover([
        "pi",
        "-e",
        "./custom-provider.ts",
        "-e",
        "git@github.com:Whamp/pi-brain.git",
        "-e",
        "https://github.com/Whamp/pi-brain.git",
        "-e",
        "https://github.com/Whamp/pi-brain",
        // lookalike repo names must NOT be excluded
        "-e",
        "git@github.com:Whamp/pi-brain-fork.git",
      ])
    ).toStrictEqual([
      "./custom-provider.ts",
      "git@github.com:Whamp/pi-brain-fork.git",
    ]);
  });

  it("reads extensions from project and user settings.json", () => {
    fs.mkdirSync(path.join(cwd, ".pi"), { recursive: true });
    fs.writeFileSync(
      path.join(cwd, ".pi", "settings.json"),
      JSON.stringify({ extensions: ["./project-provider.ts"] })
    );
    fs.mkdirSync(path.join(homeDir, ".pi", "agent"), { recursive: true });
    fs.writeFileSync(
      path.join(homeDir, ".pi", "agent", "settings.json"),
      JSON.stringify({ extensions: ["./user-provider.ts"] })
    );

    expect(discover()).toStrictEqual([
      "./project-provider.ts",
      "./user-provider.ts",
    ]);
  });

  it("scans ~/.pi/agent/extensions and cwd/.pi/extensions for ts files", () => {
    const userExtDir = path.join(homeDir, ".pi", "agent", "extensions");
    const projectExtDir = path.join(cwd, ".pi", "extensions");
    fs.mkdirSync(userExtDir, { recursive: true });
    fs.mkdirSync(projectExtDir, { recursive: true });
    fs.writeFileSync(path.join(userExtDir, "custom-provider.ts"), "");
    fs.writeFileSync(path.join(projectExtDir, "local.ts"), "");

    expect(discover()).toStrictEqual([
      path.join(projectExtDir, "local.ts"),
      path.join(userExtDir, "custom-provider.ts"),
    ]);
  });

  it("includes subdirectory index.ts extension packages", () => {
    const nested = path.join(
      homeDir,
      ".pi",
      "agent",
      "extensions",
      "gitlab-duo"
    );
    fs.mkdirSync(nested, { recursive: true });
    fs.writeFileSync(path.join(nested, "index.ts"), "");

    expect(discover()).toStrictEqual([path.join(nested, "index.ts")]);
  });
});
