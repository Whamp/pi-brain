/**
 * Tests for the session file watcher
 */

import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { describe, expect, it } from "vitest";

import {
  createWatcher,
  DEFAULT_WATCHER_CONFIG,
  getEventError,
  getProjectFromSessionPath,
  getSessionName,
  getSessionPath,
  isSessionFile,
  SESSION_EVENTS,
  SessionWatcher,
} from "./index.js";

// Test helpers
async function createTempDir(): Promise<string> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "pi-brain-test-"));
  return tempDir;
}

async function cleanupTempDir(tempDir: string): Promise<void> {
  try {
    await fs.rm(tempDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}

async function writeSessionFile(
  dir: string,
  name: string,
  content = ""
): Promise<string> {
  const filePath = path.join(dir, name);
  await fs.writeFile(filePath, content, "utf8");
  return filePath;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitForEvent(
  watcher: SessionWatcher,
  eventName: string,
  timeoutMs = 5000
): Promise<Event> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timeout waiting for event: ${eventName}`));
    }, timeoutMs);

    watcher.addEventListener(
      eventName,
      (event) => {
        clearTimeout(timeout);
        resolve(event);
      },
      { once: true }
    );
  });
}

function createTestWatcher(): SessionWatcher {
  return new SessionWatcher({
    idleTimeoutMinutes: 0.01, // 0.6 seconds for testing
    stabilityThreshold: 100, // Quick stability for tests
    pollInterval: 50,
  });
}

describe("sessionWatcher", () => {
  describe("constructor", () => {
    it("should create with default config", () => {
      const watcher = new SessionWatcher();
      expect(watcher.running).toBeFalsy();
      expect(watcher.sessionCount).toBe(0);
    });

    it("should merge custom config with defaults", () => {
      const watcher = new SessionWatcher({
        idleTimeoutMinutes: 5,
      });
      expect(watcher.running).toBeFalsy();
    });
  });

  describe("start", () => {
    it("should start watching a single directory", async () => {
      const tempDir = await createTempDir();
      const watcher = createTestWatcher();
      try {
        const readyPromise = waitForEvent(watcher, SESSION_EVENTS.READY);
        await watcher.start(tempDir);
        await readyPromise;

        expect(watcher.running).toBeTruthy();
        expect(watcher.getWatchPaths()).toStrictEqual([tempDir]);
      } finally {
        await watcher.stop();
        await cleanupTempDir(tempDir);
      }
    });

    it("should start watching multiple directories", async () => {
      const tempDir = await createTempDir();
      const dir2 = await createTempDir();
      const watcher = createTestWatcher();
      try {
        const readyPromise = waitForEvent(watcher, SESSION_EVENTS.READY);
        await watcher.start([tempDir, dir2]);
        await readyPromise;

        expect(watcher.running).toBeTruthy();
        expect(watcher.getWatchPaths()).toStrictEqual([tempDir, dir2]);
      } finally {
        await watcher.stop();
        await cleanupTempDir(tempDir);
        await cleanupTempDir(dir2);
      }
    });

    it("should create directory if it doesn't exist", async () => {
      const tempDir = await createTempDir();
      const watcher = createTestWatcher();
      try {
        const newDir = path.join(tempDir, "new-sessions");
        const readyPromise = waitForEvent(watcher, SESSION_EVENTS.READY);
        await watcher.start(newDir);
        await readyPromise;

        const stat = await fs.stat(newDir);
        expect(stat.isDirectory()).toBeTruthy();
      } finally {
        await watcher.stop();
        await cleanupTempDir(tempDir);
      }
    });

    it("should throw if already running", async () => {
      const tempDir = await createTempDir();
      const watcher = createTestWatcher();
      try {
        await watcher.start(tempDir);
        await expect(watcher.start(tempDir)).rejects.toThrow(
          "Watcher is already running"
        );
      } finally {
        await watcher.stop();
        await cleanupTempDir(tempDir);
      }
    });

    it("should throw if path is not a directory", async () => {
      const tempDir = await createTempDir();
      const watcher = createTestWatcher();
      try {
        const filePath = await writeSessionFile(tempDir, "test.jsonl");
        await expect(watcher.start(filePath)).rejects.toThrow(
          "Not a directory"
        );
      } finally {
        await watcher.stop();
        await cleanupTempDir(tempDir);
      }
    });
  });

  describe("stop", () => {
    it("should stop watching", async () => {
      const tempDir = await createTempDir();
      const watcher = createTestWatcher();
      try {
        const readyPromise = waitForEvent(watcher, SESSION_EVENTS.READY);
        await watcher.start(tempDir);
        await readyPromise;

        await watcher.stop();
        expect(watcher.running).toBeFalsy();
        expect(watcher.sessionCount).toBe(0);
      } finally {
        await cleanupTempDir(tempDir);
      }
    });

    it("should be safe to call stop multiple times", async () => {
      const tempDir = await createTempDir();
      const watcher = createTestWatcher();
      try {
        await watcher.start(tempDir);
        await watcher.stop();
        await watcher.stop(); // Should not throw
        expect(watcher.running).toBeFalsy();
      } finally {
        await cleanupTempDir(tempDir);
      }
    });

    it("should be safe to call stop without starting", async () => {
      const watcher = createTestWatcher();
      await watcher.stop(); // Should not throw
      expect(watcher.running).toBeFalsy();
    });
  });

  describe("file detection", () => {
    it("should detect new .jsonl files", async () => {
      const tempDir = await createTempDir();
      const watcher = createTestWatcher();
      try {
        const readyPromise = waitForEvent(watcher, SESSION_EVENTS.READY);
        await watcher.start(tempDir);
        await readyPromise;

        const newEventPromise = waitForEvent(watcher, SESSION_EVENTS.NEW);
        const filePath = await writeSessionFile(tempDir, "session.jsonl");

        const event = await newEventPromise;
        expect(getSessionPath(event)).toBe(filePath);
        expect(watcher.sessionCount).toBe(1);
      } finally {
        await watcher.stop();
        await cleanupTempDir(tempDir);
      }
    });

    it("should ignore non-.jsonl files", async () => {
      const tempDir = await createTempDir();
      const watcher = createTestWatcher();
      try {
        const readyPromise = waitForEvent(watcher, SESSION_EVENTS.READY);
        await watcher.start(tempDir);
        await readyPromise;

        // Write a non-jsonl file
        await writeSessionFile(tempDir, "readme.txt");

        // Wait a bit to ensure no event is fired
        await delay(200);
        expect(watcher.sessionCount).toBe(0);
      } finally {
        await watcher.stop();
        await cleanupTempDir(tempDir);
      }
    });

    it("should detect files in subdirectories", async () => {
      const tempDir = await createTempDir();
      const watcher = createTestWatcher();
      try {
        const subDir = path.join(tempDir, "project");
        await fs.mkdir(subDir, { recursive: true });

        const readyPromise = waitForEvent(watcher, SESSION_EVENTS.READY);
        await watcher.start(tempDir);
        await readyPromise;

        const newEventPromise = waitForEvent(watcher, SESSION_EVENTS.NEW);
        const filePath = await writeSessionFile(subDir, "session.jsonl");

        const event = await newEventPromise;
        expect(getSessionPath(event)).toBe(filePath);
      } finally {
        await watcher.stop();
        await cleanupTempDir(tempDir);
      }
    });

    it("should detect file changes", async () => {
      const tempDir = await createTempDir();
      const watcher = createTestWatcher();
      try {
        const filePath = await writeSessionFile(
          tempDir,
          "session.jsonl",
          '{"line": 1}'
        );

        // Set up listeners before starting to catch all events
        const newEventPromise = waitForEvent(watcher, SESSION_EVENTS.NEW);
        const readyPromise = waitForEvent(watcher, SESSION_EVENTS.READY);

        await watcher.start(tempDir);
        await readyPromise;

        // Wait for initial detection (might have already fired)
        await newEventPromise;

        const changeEventPromise = waitForEvent(watcher, SESSION_EVENTS.CHANGE);
        await fs.appendFile(filePath, '\n{"line": 2}');

        const event = await changeEventPromise;
        expect(getSessionPath(event)).toBe(filePath);
      } finally {
        await watcher.stop();
        await cleanupTempDir(tempDir);
      }
    });

    it("should detect file removal", async () => {
      const tempDir = await createTempDir();
      const watcher = createTestWatcher();
      try {
        const filePath = await writeSessionFile(tempDir, "session.jsonl");

        // Set up listeners before starting
        const newEventPromise = waitForEvent(watcher, SESSION_EVENTS.NEW);
        const readyPromise = waitForEvent(watcher, SESSION_EVENTS.READY);

        await watcher.start(tempDir);
        await readyPromise;

        // Wait for initial detection
        await newEventPromise;
        expect(watcher.sessionCount).toBe(1);

        const removeEventPromise = waitForEvent(watcher, SESSION_EVENTS.REMOVE);
        await fs.unlink(filePath);

        const event = await removeEventPromise;
        expect(getSessionPath(event)).toBe(filePath);
        expect(watcher.sessionCount).toBe(0);
      } finally {
        await watcher.stop();
        await cleanupTempDir(tempDir);
      }
    });
  });

  describe("idle detection", () => {
    it("should emit sessionIdle after timeout", async () => {
      const tempDir = await createTempDir();
      // Use a very short timeout for testing
      const watcher = new SessionWatcher({
        idleTimeoutMinutes: 0.005, // 0.3 seconds
        stabilityThreshold: 50,
        pollInterval: 25,
      });

      try {
        const readyPromise = waitForEvent(watcher, SESSION_EVENTS.READY);
        await watcher.start(tempDir);
        await readyPromise;

        const newEventPromise = waitForEvent(watcher, SESSION_EVENTS.NEW);
        const filePath = await writeSessionFile(tempDir, "session.jsonl");
        await newEventPromise;

        const idleEventPromise = waitForEvent(
          watcher,
          SESSION_EVENTS.IDLE,
          3000
        );
        const event = await idleEventPromise;
        expect(getSessionPath(event)).toBe(filePath);
      } finally {
        await watcher.stop();
        await cleanupTempDir(tempDir);
      }
    });

    it("should not emit idle while analyzing", async () => {
      const tempDir = await createTempDir();
      const watcher = new SessionWatcher({
        idleTimeoutMinutes: 0.005,
        stabilityThreshold: 50,
        pollInterval: 25,
      });

      try {
        const readyPromise = waitForEvent(watcher, SESSION_EVENTS.READY);
        await watcher.start(tempDir);
        await readyPromise;

        const newEventPromise = waitForEvent(watcher, SESSION_EVENTS.NEW);
        const filePath = await writeSessionFile(tempDir, "session.jsonl");
        await newEventPromise;

        // Mark as analyzing
        watcher.markAnalyzing(filePath);

        // Set up listener that should not be called
        let idleCalled = false;
        watcher.addEventListener(SESSION_EVENTS.IDLE, () => {
          idleCalled = true;
        });

        // Wait longer than idle timeout
        await delay(500);
        expect(idleCalled).toBeFalsy();
      } finally {
        await watcher.stop();
        await cleanupTempDir(tempDir);
      }
    });
  });

  describe("session state", () => {
    it("should track session state", async () => {
      const tempDir = await createTempDir();
      const watcher = createTestWatcher();
      try {
        const readyPromise = waitForEvent(watcher, SESSION_EVENTS.READY);
        await watcher.start(tempDir);
        await readyPromise;

        const newEventPromise = waitForEvent(watcher, SESSION_EVENTS.NEW);
        const filePath = await writeSessionFile(tempDir, "session.jsonl");
        await newEventPromise;

        const state = watcher.getSessionState(filePath);
        expect(state).toBeDefined();
        expect(state?.path).toBe(filePath);
        expect(state?.lastAnalyzed).toBeNull();
        expect(state?.analyzing).toBeFalsy();
      } finally {
        await watcher.stop();
        await cleanupTempDir(tempDir);
      }
    });

    it("should get all sessions", async () => {
      const tempDir = await createTempDir();
      const watcher = createTestWatcher();
      try {
        const readyPromise = waitForEvent(watcher, SESSION_EVENTS.READY);
        await watcher.start(tempDir);
        await readyPromise;

        await writeSessionFile(tempDir, "session1.jsonl");
        await waitForEvent(watcher, SESSION_EVENTS.NEW);

        await writeSessionFile(tempDir, "session2.jsonl");
        await waitForEvent(watcher, SESSION_EVENTS.NEW);

        const sessions = watcher.getAllSessions();
        expect(sessions.size).toBe(2);
      } finally {
        await watcher.stop();
        await cleanupTempDir(tempDir);
      }
    });

    it("should update lastAnalyzed with markAnalyzed", async () => {
      const tempDir = await createTempDir();
      const watcher = createTestWatcher();
      try {
        const readyPromise = waitForEvent(watcher, SESSION_EVENTS.READY);
        await watcher.start(tempDir);
        await readyPromise;

        const newEventPromise = waitForEvent(watcher, SESSION_EVENTS.NEW);
        const filePath = await writeSessionFile(tempDir, "session.jsonl");
        await newEventPromise;

        watcher.markAnalyzing(filePath);
        let state = watcher.getSessionState(filePath);
        expect(state?.analyzing).toBeTruthy();

        watcher.markAnalyzed(filePath);
        state = watcher.getSessionState(filePath);
        expect(state?.analyzing).toBeFalsy();
        expect(state?.lastAnalyzed).toBeGreaterThan(0);
      } finally {
        await watcher.stop();
        await cleanupTempDir(tempDir);
      }
    });
  });

  describe("fromConfig", () => {
    it("should create watcher from config", () => {
      const config = {
        hub: {
          sessionsDir: "/test/sessions",
          databaseDir: "/test/data",
          webUiPort: 8765,
        },
        spokes: [],
        daemon: {
          idleTimeoutMinutes: 15,
          parallelWorkers: 1,
          maxRetries: 3,
          retryDelaySeconds: 60,
          reanalysisSchedule: "0 2 * * *",
          connectionDiscoverySchedule: "0 3 * * *",
          provider: "zai",
          model: "glm-4.7",
          promptFile: "/test/prompt.md",
          maxConcurrentAnalysis: 1,
          analysisTimeoutMinutes: 30,
          maxQueueSize: 1000,
        },
        query: {
          provider: "zai",
          model: "glm-4.7",
        },
      };

      const configWatcher = SessionWatcher.fromConfig(config);
      expect(configWatcher).toBeInstanceOf(SessionWatcher);
    });
  });
});

describe("createWatcher", () => {
  it("should create watcher from daemon config", () => {
    const daemonConfig = {
      idleTimeoutMinutes: 20,
      parallelWorkers: 1,
      maxRetries: 3,
      retryDelaySeconds: 60,
      reanalysisSchedule: "0 2 * * *",
      connectionDiscoverySchedule: "0 3 * * *",
      provider: "zai",
      model: "glm-4.7",
      promptFile: "/test/prompt.md",
      maxConcurrentAnalysis: 1,
      analysisTimeoutMinutes: 30,
      maxQueueSize: 1000,
    };

    const watcher = createWatcher(daemonConfig);
    expect(watcher).toBeInstanceOf(SessionWatcher);
  });
});

describe("isSessionFile", () => {
  it("should return true for .jsonl files", () => {
    expect(isSessionFile("/path/to/session.jsonl")).toBeTruthy();
    expect(isSessionFile("session.jsonl")).toBeTruthy();
  });

  it("should return false for other files", () => {
    expect(isSessionFile("/path/to/file.json")).toBeFalsy();
    expect(isSessionFile("/path/to/file.txt")).toBeFalsy();
    expect(isSessionFile("/path/to/jsonl")).toBeFalsy();
  });
});

describe("getSessionName", () => {
  it("should extract session name from path", () => {
    expect(getSessionName("/path/to/my-session.jsonl")).toBe("my-session");
    expect(
      getSessionName("/home/user/.pi/agent/sessions/project/2026-01-25.jsonl")
    ).toBe("2026-01-25");
  });
});

describe("getProjectFromSessionPath", () => {
  it("should extract project name from session path", () => {
    expect(
      getProjectFromSessionPath(
        "/home/user/.pi/agent/sessions/my-project/session.jsonl"
      )
    ).toBe("my-project");
  });

  it("should return null for sessions directory itself", () => {
    expect(
      getProjectFromSessionPath("/home/user/.pi/agent/sessions/session.jsonl")
    ).toBeNull();
  });
});

describe("dEFAULT_WATCHER_CONFIG", () => {
  it("should have expected default values", () => {
    expect(DEFAULT_WATCHER_CONFIG.idleTimeoutMinutes).toBe(10);
    expect(DEFAULT_WATCHER_CONFIG.stabilityThreshold).toBe(2000);
    expect(DEFAULT_WATCHER_CONFIG.pollInterval).toBe(100);
    expect(DEFAULT_WATCHER_CONFIG.depth).toBe(2);
  });
});

describe("event helpers", () => {
  describe("getSessionPath", () => {
    it("should return undefined for non-session events", () => {
      const event = new Event("test");
      expect(getSessionPath(event)).toBeUndefined();
    });
  });

  describe("getEventError", () => {
    it("should return undefined for non-error events", () => {
      const event = new Event("test");
      expect(getEventError(event)).toBeUndefined();
    });
  });
});
