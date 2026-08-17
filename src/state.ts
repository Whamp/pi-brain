import * as fs from "node:fs";
import * as path from "node:path";

import { parseYaml, quoteUnquotedHashScalars, serializeYaml } from "./yaml.js";

interface LastCommit {
  branch: string;
  hash: string;
  timestamp: string;
  summary: string;
}

interface SessionRecord {
  file: string;
  branch: string;
  started: string;
}

type PersistedValue =
  | string
  | Record<string, string>
  | Array<Record<string, string>>;

function stringField(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export class MemoryState {
  private readonly statePath: string;
  private readonly memoryDir: string;
  activeBranch = "main";
  initialized = "";
  lastCommit: LastCommit | null = null;
  sessions: SessionRecord[] = [];

  constructor(projectDir: string) {
    this.memoryDir = path.join(projectDir, ".memory");
    this.statePath = path.join(this.memoryDir, "state.yaml");
  }

  get isInitialized(): boolean {
    return this.initialized !== "";
  }

  load(): void {
    if (!fs.existsSync(this.statePath)) {
      return;
    }

    let content: string;
    try {
      content = fs.readFileSync(this.statePath, "utf8");
    } catch {
      return;
    }

    if (content.trim() === "") {
      return;
    }

    const data = parseYaml(quoteUnquotedHashScalars(content));
    this.applyParsed(data);
    this.rewriteIfNotCanonical(content);
  }

  private applyParsed(data: ReturnType<typeof parseYaml>): void {
    if (typeof data.active_branch === "string") {
      this.activeBranch = data.active_branch;
    }

    if (typeof data.initialized === "string") {
      this.initialized = data.initialized;
    }

    if (typeof data.last_commit === "object" && data.last_commit !== null) {
      const lastCommit = data.last_commit;
      if (!Array.isArray(lastCommit)) {
        this.lastCommit = {
          branch: stringField(lastCommit.branch),
          hash: stringField(lastCommit.hash),
          timestamp: stringField(lastCommit.timestamp),
          summary: stringField(lastCommit.summary),
        };
      }
    }

    if (Array.isArray(data.sessions)) {
      this.sessions = data.sessions
        .map((item) => {
          const file = stringField(item.file);
          const branch = stringField(item.branch);
          const started = stringField(item.started);
          if (file === "" || branch === "" || started === "") {
            return null;
          }

          return { file, branch, started };
        })
        .filter((item): item is SessionRecord => item !== null);
    }
  }

  private persistedObject(): Record<string, PersistedValue> {
    const data: Record<string, PersistedValue> = {
      active_branch: this.activeBranch,
    };

    if (this.initialized) {
      data.initialized = this.initialized;
    }

    if (this.lastCommit) {
      data.last_commit = {
        branch: this.lastCommit.branch,
        hash: this.lastCommit.hash,
        timestamp: this.lastCommit.timestamp,
        summary: this.lastCommit.summary,
      };
    }

    if (this.sessions.length > 0) {
      data.sessions = this.sessions.map((session) => ({
        file: session.file,
        branch: session.branch,
        started: session.started,
      }));
    }

    return data;
  }

  private rewriteIfNotCanonical(content: string): void {
    const normalizedDisk = content.replaceAll("\r\n", "\n").replace(/\n+$/, "");
    const canonical = serializeYaml(this.persistedObject());
    if (canonical === normalizedDisk) {
      return;
    }

    try {
      this.save();
    } catch {
      // Read-only filesystem or a vanished file must not fail load().
    }
  }

  setActiveBranch(branch: string): void {
    this.activeBranch = branch;
  }

  setLastCommit(
    branch: string,
    hash: string,
    timestamp: string,
    summary: string
  ): void {
    this.lastCommit = { branch, hash, timestamp, summary };
  }

  upsertSession(file: string, branch: string, started: string): void {
    const existing = this.sessions.find((session) => session.file === file);
    if (existing) {
      existing.branch = branch;
      if (existing.started === "") {
        existing.started = started;
      }
      return;
    }

    this.sessions.push({ file, branch, started });
  }

  save(): void {
    fs.writeFileSync(this.statePath, serializeYaml(this.persistedObject()));
  }
}
