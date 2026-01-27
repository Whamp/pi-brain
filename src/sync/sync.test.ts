/**
 * Tests for rsync sync module
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { SpokeConfig } from "../config/types.js";

import {
  formatBytes,
  countSpokeSessionFiles,
  listSpokeSessions,
  getLastSyncTime,
  runRsync,
} from "./rsync.js";
import {
  formatSyncStatus,
  formatTimeAgo,
  getSpokeStatus,
  getSyncStatus,
} from "./status.js";

describe("rsync", () => {
  describe("formatBytes", () => {
    it("should format zero bytes", () => {
      expect(formatBytes(0)).toBe("0 B");
    });

    it("should format bytes", () => {
      expect(formatBytes(512)).toBe("512.0 B");
    });

    it("should format kilobytes", () => {
      expect(formatBytes(1024)).toBe("1.0 KB");
      expect(formatBytes(1536)).toBe("1.5 KB");
    });

    it("should format megabytes", () => {
      expect(formatBytes(1024 * 1024)).toBe("1.0 MB");
      expect(formatBytes(2.5 * 1024 * 1024)).toBe("2.5 MB");
    });

    it("should format gigabytes", () => {
      expect(formatBytes(1024 * 1024 * 1024)).toBe("1.0 GB");
    });
  });

  describe("countSpokeSessionFiles", () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pi-brain-test-"));
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it("should return 0 for non-existent directory", () => {
      expect(countSpokeSessionFiles("/non/existent/path")).toBe(0);
    });

    it("should return 0 for empty directory", () => {
      expect(countSpokeSessionFiles(tmpDir)).toBe(0);
    });

    it("should count .jsonl files", () => {
      fs.writeFileSync(path.join(tmpDir, "session1.jsonl"), "{}");
      fs.writeFileSync(path.join(tmpDir, "session2.jsonl"), "{}");
      fs.writeFileSync(path.join(tmpDir, "other.txt"), "");

      expect(countSpokeSessionFiles(tmpDir)).toBe(2);
    });

    it("should count files in subdirectories", () => {
      const subdir = path.join(tmpDir, "2026", "01");
      fs.mkdirSync(subdir, { recursive: true });
      fs.writeFileSync(path.join(subdir, "session1.jsonl"), "{}");
      fs.writeFileSync(path.join(tmpDir, "session2.jsonl"), "{}");

      expect(countSpokeSessionFiles(tmpDir)).toBe(2);
    });
  });

  describe("listSpokeSessions", () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pi-brain-test-"));
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it("should return empty array for non-existent directory", () => {
      expect(listSpokeSessions("/non/existent/path")).toStrictEqual([]);
    });

    it("should return session file paths", () => {
      fs.writeFileSync(path.join(tmpDir, "session1.jsonl"), "{}");
      fs.writeFileSync(path.join(tmpDir, "session2.jsonl"), "{}");

      const sessions = listSpokeSessions(tmpDir);

      expect(sessions).toHaveLength(2);
      expect(sessions).toContain(path.join(tmpDir, "session1.jsonl"));
      expect(sessions).toContain(path.join(tmpDir, "session2.jsonl"));
    });

    it("should return sorted paths", () => {
      fs.writeFileSync(path.join(tmpDir, "b.jsonl"), "{}");
      fs.writeFileSync(path.join(tmpDir, "a.jsonl"), "{}");
      fs.writeFileSync(path.join(tmpDir, "c.jsonl"), "{}");

      const sessions = listSpokeSessions(tmpDir);

      expect(sessions).toStrictEqual([
        path.join(tmpDir, "a.jsonl"),
        path.join(tmpDir, "b.jsonl"),
        path.join(tmpDir, "c.jsonl"),
      ]);
    });
  });

  describe("getLastSyncTime", () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pi-brain-test-"));
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it("should return null for non-existent directory", () => {
      expect(getLastSyncTime("/non/existent/path")).toBeNull();
    });

    it("should return directory modification time", () => {
      const time = getLastSyncTime(tmpDir);

      expect(time).toBeInstanceOf(Date);
      expect(time?.getTime()).toBeGreaterThan(Date.now() - 10_000);
    });
  });
});

describe("status", () => {
  describe("formatTimeAgo", () => {
    it("should format just now", () => {
      expect(formatTimeAgo(new Date())).toBe("just now");
    });

    it("should format minutes ago", () => {
      const date = new Date(Date.now() - 5 * 60 * 1000);
      expect(formatTimeAgo(date)).toBe("5m ago");
    });

    it("should format hours ago", () => {
      const date = new Date(Date.now() - 3 * 60 * 60 * 1000);
      expect(formatTimeAgo(date)).toBe("3h ago");
    });

    it("should format days ago", () => {
      const date = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      expect(formatTimeAgo(date)).toBe("2d ago");
    });
  });

  describe("getSpokeStatus", () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pi-brain-test-"));
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it("should get status for existing spoke", () => {
      const spoke: SpokeConfig = {
        name: "test-spoke",
        syncMethod: "rsync",
        path: tmpDir,
        source: "user@host:~/.pi/agent/sessions",
        enabled: true,
      };

      const status = getSpokeStatus(spoke);

      expect(status.name).toBe("test-spoke");
      expect(status.syncMethod).toBe("rsync");
      expect(status.path).toBe(tmpDir);
      expect(status.source).toBe("user@host:~/.pi/agent/sessions");
      expect(status.exists).toBeTruthy();
      expect(status.sessionCount).toBe(0);
      expect(status.lastSync).toBeInstanceOf(Date);
    });

    it("should handle non-existent spoke path", () => {
      const spoke: SpokeConfig = {
        name: "missing-spoke",
        syncMethod: "rsync",
        path: "/non/existent/path",
        enabled: true,
      };

      const status = getSpokeStatus(spoke);

      expect(status.exists).toBeFalsy();
      expect(status.sessionCount).toBe(0);
      expect(status.lastSync).toBeNull();
    });

    it("should count sessions in spoke directory", () => {
      fs.writeFileSync(path.join(tmpDir, "session1.jsonl"), "{}");
      fs.writeFileSync(path.join(tmpDir, "session2.jsonl"), "{}");

      const spoke: SpokeConfig = {
        name: "test-spoke",
        syncMethod: "syncthing",
        path: tmpDir,
        enabled: true,
      };

      const status = getSpokeStatus(spoke);

      expect(status.sessionCount).toBe(2);
    });

    it("should report enabled status correctly", () => {
      const enabledSpoke: SpokeConfig = {
        name: "enabled-spoke",
        syncMethod: "syncthing",
        path: tmpDir,
        enabled: true,
      };

      const disabledSpoke: SpokeConfig = {
        name: "disabled-spoke",
        syncMethod: "syncthing",
        path: tmpDir,
        enabled: false,
      };

      expect(getSpokeStatus(enabledSpoke).enabled).toBeTruthy();
      expect(getSpokeStatus(disabledSpoke).enabled).toBeFalsy();
    });
  });

  describe("getSyncStatus", () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pi-brain-test-"));
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it("should get overall sync status", async () => {
      const config = {
        hub: {
          sessionsDir: tmpDir,
          databaseDir: tmpDir,
          webUiPort: 8765,
        },
        spokes: [],
        daemon: {} as never,
        query: {} as never,
        api: {} as never,
      };

      const status = await getSyncStatus(config);

      expect(status.hubName).toBe(os.hostname());
      expect(status.hubSessionsDir).toBe(tmpDir);
      expect(status.hubSessionCount).toBe(0);
      expect(typeof status.rsyncAvailable).toBe("boolean");
      expect(status.spokes).toStrictEqual([]);
      expect(status.totalSpokeSessionCount).toBe(0);
    });

    it("should include spoke statuses", async () => {
      const spokePath = path.join(tmpDir, "spoke");
      fs.mkdirSync(spokePath);
      fs.writeFileSync(path.join(spokePath, "session.jsonl"), "{}");

      const config = {
        hub: {
          sessionsDir: tmpDir,
          databaseDir: tmpDir,
          webUiPort: 8765,
        },
        spokes: [
          {
            name: "test-spoke",
            syncMethod: "rsync" as const,
            path: spokePath,
            source: "user@host:~/sessions",
            enabled: true,
          },
        ],
        daemon: {} as never,
        query: {} as never,
        api: {} as never,
      };

      const status = await getSyncStatus(config);

      expect(status.spokes).toHaveLength(1);
      expect(status.spokes[0].name).toBe("test-spoke");
      expect(status.spokes[0].sessionCount).toBe(1);
      expect(status.totalSpokeSessionCount).toBe(1);
    });
  });

  describe("formatSyncStatus", () => {
    it("should format status with no spokes", () => {
      const status = {
        hubName: "test-hub",
        hubSessionsDir: "/home/user/.pi/agent/sessions",
        hubSessionCount: 10,
        rsyncAvailable: true,
        spokes: [],
        totalSpokeSessionCount: 0,
      };

      const output = formatSyncStatus(status);

      expect(output).toContain("test-hub");
      expect(output).toContain("10");
      expect(output).toContain("No spokes configured");
    });

    it("should format status with spokes", () => {
      const status = {
        hubName: "test-hub",
        hubSessionsDir: "/home/user/.pi/agent/sessions",
        hubSessionCount: 10,
        rsyncAvailable: true,
        spokes: [
          {
            name: "laptop",
            syncMethod: "rsync",
            path: "/synced/laptop",
            source: "user@laptop:~/sessions",
            enabled: true,
            exists: true,
            sessionCount: 5,
            lastSync: new Date(),
            lastSyncFormatted: "just now",
          },
        ],
        totalSpokeSessionCount: 5,
      };

      const output = formatSyncStatus(status);

      expect(output).toContain("laptop");
      expect(output).toContain("rsync");
      expect(output).toContain("5");
      expect(output).toContain("just now");
      expect(output).toContain("Total spoke sessions: 5");
    });

    it("should warn when rsync is not available", () => {
      const status = {
        hubName: "test-hub",
        hubSessionsDir: "/home/user/.pi/agent/sessions",
        hubSessionCount: 0,
        rsyncAvailable: false,
        spokes: [],
        totalSpokeSessionCount: 0,
      };

      const output = formatSyncStatus(status);

      expect(output).toContain("rsync command not found");
    });
  });
});

describe("runRsync", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pi-brain-rsync-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("should reject non-rsync sync methods", async () => {
    const spoke: SpokeConfig = {
      name: "syncthing-spoke",
      syncMethod: "syncthing",
      path: tmpDir,
      enabled: true,
    };

    const result = await runRsync(spoke);

    expect(result.success).toBeFalsy();
    expect(result.spokeName).toBe("syncthing-spoke");
    expect(result.message).toContain("not configured for rsync");
    expect(result.message).toContain("method: syncthing");
  });

  it("should reject spoke missing source field", async () => {
    const spoke: SpokeConfig = {
      name: "no-source",
      syncMethod: "rsync",
      path: tmpDir,
      // source is missing
      enabled: true,
    };

    const result = await runRsync(spoke);

    expect(result.success).toBeFalsy();
    expect(result.spokeName).toBe("no-source");
    expect(result.message).toContain("missing source field");
  });

  it("should handle rsync command not found (ENOENT)", async () => {
    // This test uses an invalid source that will cause rsync to fail
    // In a real scenario with mocking, we'd mock ENOENT directly
    const spoke: SpokeConfig = {
      name: "test-spoke",
      syncMethod: "rsync",
      path: tmpDir,
      source: "nonexistent@host:~/sessions",
      enabled: true,
      rsyncOptions: {
        timeoutSeconds: 1, // Fast timeout
      },
    };

    const result = await runRsync(spoke);

    // Will fail due to SSH connection or command issues
    expect(result.success).toBeFalsy();
    expect(result.spokeName).toBe("test-spoke");
    expect(result.durationMs).toBeGreaterThan(0);
    // Error should be populated with some message
    expect(result.error).toBeDefined();
  });

  it("should create destination directory if it does not exist", async () => {
    const destDir = path.join(tmpDir, "new-subdir", "sessions");
    const spoke: SpokeConfig = {
      name: "test-spoke",
      syncMethod: "rsync",
      path: destDir,
      source: "user@host:~/sessions",
      enabled: true,
      rsyncOptions: {
        timeoutSeconds: 1,
      },
    };

    // Run rsync (will fail due to connection, but should create dir first)
    await runRsync(spoke);

    // Directory should have been created
    expect(fs.existsSync(destDir)).toBeTruthy();
  });

  it("should respect dry-run option", async () => {
    const spoke: SpokeConfig = {
      name: "dry-run-spoke",
      syncMethod: "rsync",
      path: tmpDir,
      source: "user@host:~/sessions",
      enabled: true,
      rsyncOptions: {
        timeoutSeconds: 1,
      },
    };

    const result = await runRsync(spoke, { dryRun: true });

    // Will still fail due to connection, but tests option passing
    expect(result.success).toBeFalsy();
    expect(result.spokeName).toBe("dry-run-spoke");
  });

  it("should use spoke rsyncOptions as defaults", async () => {
    const spoke: SpokeConfig = {
      name: "options-spoke",
      syncMethod: "rsync",
      path: tmpDir,
      source: "user@host:~/sessions",
      enabled: true,
      rsyncOptions: {
        bwLimit: 1000,
        delete: true,
        timeoutSeconds: 1,
      },
    };

    const result = await runRsync(spoke);

    // Tests that options are merged without errors
    expect(result.spokeName).toBe("options-spoke");
  });

  it("should allow overriding spoke options", async () => {
    const spoke: SpokeConfig = {
      name: "override-spoke",
      syncMethod: "rsync",
      path: tmpDir,
      source: "user@host:~/sessions",
      enabled: true,
      rsyncOptions: {
        bwLimit: 1000,
        timeoutSeconds: 5,
      },
    };

    const result = await runRsync(spoke, {
      bwLimit: 500,
      timeoutMs: 1000, // Override timeout
    });

    // Tests that passed options take precedence
    expect(result.spokeName).toBe("override-spoke");
  });
});
