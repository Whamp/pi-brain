/**
 * Tests for configuration loading and validation
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, it, expect } from "vitest";

import type { RawConfig } from "./types.js";

import {
  loadConfig,
  getDefaultConfig,
  getDefaultHubConfig,
  getDefaultDaemonConfig,
  getDefaultQueryConfig,
  transformConfig,
  expandPath,
  ensureConfigDir,
  ensureDirectories,
  writeDefaultConfig,
  getSessionDirs,
  getEnabledSpokes,
  getRsyncSpokes,
  getScheduledRsyncSpokes,
  getComputerFromPath,
  ConfigError,
} from "./config.js";

/** Create a unique temp directory */
function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "pi-brain-test-"));
}

/** Clean up temp directory */
function cleanupTempDir(dir: string): void {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}

describe("expandPath", () => {
  it("expands ~ to home directory", () => {
    expect(expandPath("~/test")).toBe(path.join(os.homedir(), "test"));
  });

  it("expands bare ~ to home directory", () => {
    expect(expandPath("~")).toBe(os.homedir());
  });

  it("leaves absolute paths unchanged", () => {
    expect(expandPath("/absolute/path")).toBe("/absolute/path");
  });

  it("leaves relative paths unchanged", () => {
    expect(expandPath("relative/path")).toBe("relative/path");
  });

  it("handles nested paths after ~", () => {
    expect(expandPath("~/a/b/c")).toBe(path.join(os.homedir(), "a", "b", "c"));
  });
});

describe("getDefaultConfig", () => {
  it("returns hub configuration", () => {
    const config = getDefaultConfig();
    expect(config.hub).toBeDefined();
  });

  it("returns empty spokes array", () => {
    const config = getDefaultConfig();
    expect(config.spokes).toStrictEqual([]);
  });

  it("returns daemon configuration", () => {
    const config = getDefaultConfig();
    expect(config.daemon).toBeDefined();
  });

  it("returns query configuration", () => {
    const config = getDefaultConfig();
    expect(config.query).toBeDefined();
  });
});

describe("getDefaultHubConfig", () => {
  it("returns correct sessions directory", () => {
    const hub = getDefaultHubConfig();
    expect(hub.sessionsDir).toBe(
      path.join(os.homedir(), ".pi", "agent", "sessions")
    );
  });

  it("returns correct database directory", () => {
    const hub = getDefaultHubConfig();
    expect(hub.databaseDir).toBe(path.join(os.homedir(), ".pi-brain", "data"));
  });

  it("returns correct web UI port", () => {
    const hub = getDefaultHubConfig();
    expect(hub.webUiPort).toBe(8765);
  });
});

describe("getDefaultDaemonConfig", () => {
  it("returns correct idle timeout", () => {
    const daemon = getDefaultDaemonConfig();
    expect(daemon.idleTimeoutMinutes).toBe(10);
  });

  it("returns correct parallel workers", () => {
    const daemon = getDefaultDaemonConfig();
    expect(daemon.parallelWorkers).toBe(1);
  });

  it("returns correct retry settings", () => {
    const daemon = getDefaultDaemonConfig();
    expect(daemon.maxRetries).toBe(3);
    expect(daemon.retryDelaySeconds).toBe(60);
  });

  it("returns correct schedule", () => {
    const daemon = getDefaultDaemonConfig();
    expect(daemon.reanalysisSchedule).toBe("0 2 * * *");
  });

  it("returns correct model settings", () => {
    const daemon = getDefaultDaemonConfig();
    expect(daemon.provider).toBe("zai");
    expect(daemon.model).toBe("glm-4.7");
  });

  it("returns correct resource limits", () => {
    const daemon = getDefaultDaemonConfig();
    expect(daemon.maxConcurrentAnalysis).toBe(1);
    expect(daemon.analysisTimeoutMinutes).toBe(30);
    expect(daemon.maxQueueSize).toBe(1000);
  });
});

describe("getDefaultQueryConfig", () => {
  it("returns correct provider", () => {
    const query = getDefaultQueryConfig();
    expect(query.provider).toBe("zai");
  });

  it("returns correct model", () => {
    const query = getDefaultQueryConfig();
    expect(query.model).toBe("glm-4.7");
  });
});

describe("transformConfig", () => {
  it("transforms empty raw config to defaults", () => {
    const config = transformConfig({});
    const defaults = getDefaultConfig();
    expect(config.hub).toStrictEqual(defaults.hub);
    expect(config.spokes).toStrictEqual([]);
  });

  it("applies default daemon config for empty input", () => {
    const config = transformConfig({});
    const defaults = getDefaultConfig();
    expect(config.daemon).toStrictEqual(defaults.daemon);
  });

  it("applies default query config for empty input", () => {
    const config = transformConfig({});
    const defaults = getDefaultConfig();
    expect(config.query).toStrictEqual(defaults.query);
  });

  it("expands hub sessions_dir path", () => {
    const raw: RawConfig = {
      hub: { sessions_dir: "~/custom/sessions" },
    };
    const config = transformConfig(raw);
    expect(config.hub.sessionsDir).toBe(
      path.join(os.homedir(), "custom", "sessions")
    );
  });

  it("expands hub database_dir path", () => {
    const raw: RawConfig = {
      hub: { database_dir: "~/custom/data" },
    };
    const config = transformConfig(raw);
    expect(config.hub.databaseDir).toBe(
      path.join(os.homedir(), "custom", "data")
    );
  });

  it("transforms hub web_ui_port", () => {
    const raw: RawConfig = {
      hub: { web_ui_port: 9000 },
    };
    const config = transformConfig(raw);
    expect(config.hub.webUiPort).toBe(9000);
  });

  it("transforms syncthing spoke", () => {
    const raw: RawConfig = {
      spokes: [
        {
          name: "laptop",
          sync_method: "syncthing",
          path: "~/synced/laptop",
        },
      ],
    };
    const config = transformConfig(raw);
    expect(config.spokes).toHaveLength(1);
    expect(config.spokes[0].name).toBe("laptop");
    expect(config.spokes[0].syncMethod).toBe("syncthing");
    expect(config.spokes[0].enabled).toBeTruthy();
  });

  it("transforms rsync spoke with source", () => {
    const raw: RawConfig = {
      spokes: [
        {
          name: "server",
          sync_method: "rsync",
          path: "/synced/server",
          source: "user@server:~/.pi/sessions",
        },
      ],
    };
    const config = transformConfig(raw);
    expect(config.spokes[0].syncMethod).toBe("rsync");
    expect(config.spokes[0].source).toBe("user@server:~/.pi/sessions");
    expect(config.spokes[0].enabled).toBeTruthy();
  });

  it("transforms spoke with enabled: false", () => {
    const raw: RawConfig = {
      spokes: [
        {
          name: "laptop",
          sync_method: "syncthing",
          path: "/synced/laptop",
          enabled: false,
        },
      ],
    };
    const config = transformConfig(raw);
    expect(config.spokes[0].enabled).toBeFalsy();
  });

  it("transforms rsync spoke with schedule", () => {
    const raw: RawConfig = {
      spokes: [
        {
          name: "server",
          sync_method: "rsync",
          path: "/synced/server",
          source: "user@server:~/.pi/sessions",
          schedule: "0 0 * * *",
        },
      ],
    };
    const config = transformConfig(raw);
    expect(config.spokes[0].schedule).toBe("0 0 * * *");
  });

  it("transforms rsync spoke with rsync_options", () => {
    const raw: RawConfig = {
      spokes: [
        {
          name: "server",
          sync_method: "rsync",
          path: "/synced/server",
          source: "user@server:~/.pi/sessions",
          rsync_options: {
            bw_limit: 1000,
            delete: true,
            extra_args: ["--exclude=*.tmp"],
            timeout_seconds: 600,
          },
        },
      ],
    };
    const config = transformConfig(raw);
    expect(config.spokes[0].rsyncOptions).toBeDefined();
    expect(config.spokes[0].rsyncOptions?.bwLimit).toBe(1000);
    expect(config.spokes[0].rsyncOptions?.delete).toBeTruthy();
    expect(config.spokes[0].rsyncOptions?.extraArgs).toStrictEqual([
      "--exclude=*.tmp",
    ]);
    expect(config.spokes[0].rsyncOptions?.timeoutSeconds).toBe(600);
  });

  it("expands spoke path with tilde", () => {
    const raw: RawConfig = {
      spokes: [
        {
          name: "laptop",
          sync_method: "syncthing",
          path: "~/synced/laptop",
        },
      ],
    };
    const config = transformConfig(raw);
    expect(config.spokes[0].path).toBe(
      path.join(os.homedir(), "synced", "laptop")
    );
  });

  it("transforms daemon idle_timeout_minutes", () => {
    const raw: RawConfig = {
      daemon: { idle_timeout_minutes: 15 },
    };
    const config = transformConfig(raw);
    expect(config.daemon.idleTimeoutMinutes).toBe(15);
  });

  it("transforms daemon parallel_workers", () => {
    const raw: RawConfig = {
      daemon: { parallel_workers: 2 },
    };
    const config = transformConfig(raw);
    expect(config.daemon.parallelWorkers).toBe(2);
  });

  it("transforms daemon retry settings", () => {
    const raw: RawConfig = {
      daemon: { max_retries: 5, retry_delay_seconds: 120 },
    };
    const config = transformConfig(raw);
    expect(config.daemon.maxRetries).toBe(5);
    expect(config.daemon.retryDelaySeconds).toBe(120);
  });

  it("transforms daemon schedules", () => {
    const raw: RawConfig = {
      daemon: {
        reanalysis_schedule: "0 3 * * *",
        connection_discovery_schedule: "0 4 * * *",
      },
    };
    const config = transformConfig(raw);
    expect(config.daemon.reanalysisSchedule).toBe("0 3 * * *");
    expect(config.daemon.connectionDiscoverySchedule).toBe("0 4 * * *");
  });

  it("transforms daemon model settings", () => {
    const raw: RawConfig = {
      daemon: { provider: "anthropic", model: "claude-sonnet-4-20250514" },
    };
    const config = transformConfig(raw);
    expect(config.daemon.provider).toBe("anthropic");
    expect(config.daemon.model).toBe("claude-sonnet-4-20250514");
  });

  it("expands daemon prompt_file path", () => {
    const raw: RawConfig = {
      daemon: { prompt_file: "~/custom/prompt.md" },
    };
    const config = transformConfig(raw);
    expect(config.daemon.promptFile).toBe(
      path.join(os.homedir(), "custom", "prompt.md")
    );
  });

  it("transforms daemon resource limits", () => {
    const raw: RawConfig = {
      daemon: {
        max_concurrent_analysis: 2,
        analysis_timeout_minutes: 60,
        max_queue_size: 500,
      },
    };
    const config = transformConfig(raw);
    expect(config.daemon.maxConcurrentAnalysis).toBe(2);
    expect(config.daemon.analysisTimeoutMinutes).toBe(60);
    expect(config.daemon.maxQueueSize).toBe(500);
  });

  it("transforms query config", () => {
    const raw: RawConfig = {
      query: { provider: "openai", model: "gpt-4o" },
    };
    const config = transformConfig(raw);
    expect(config.query.provider).toBe("openai");
    expect(config.query.model).toBe("gpt-4o");
  });

  describe("validation errors", () => {
    it("rejects port above 65535", () => {
      const raw: RawConfig = { hub: { web_ui_port: 70_000 } };
      expect(() => transformConfig(raw)).toThrow("Invalid port");
    });

    it("rejects port 0", () => {
      const raw: RawConfig = { hub: { web_ui_port: 0 } };
      expect(() => transformConfig(raw)).toThrow("Invalid port");
    });

    it("rejects negative port", () => {
      const raw: RawConfig = { hub: { web_ui_port: -1 } };
      expect(() => transformConfig(raw)).toThrow("Invalid port");
    });

    it("rejects invalid sync_method", () => {
      const raw: RawConfig = {
        spokes: [{ name: "test", sync_method: "invalid", path: "/test" }],
      };
      expect(() => transformConfig(raw)).toThrow("Invalid sync_method");
    });

    it("rejects unimplemented api sync_method", () => {
      const raw: RawConfig = {
        spokes: [{ name: "test", sync_method: "api", path: "/test" }],
      };
      expect(() => transformConfig(raw)).toThrow("not yet implemented");
    });

    it("rejects spoke without name", () => {
      const raw: RawConfig = {
        spokes: [{ sync_method: "syncthing", path: "/test" }],
      };
      expect(() => transformConfig(raw)).toThrow(
        "missing required field: name"
      );
    });

    it("rejects spoke without sync_method", () => {
      const raw: RawConfig = {
        spokes: [{ name: "test", path: "/test" }],
      };
      expect(() => transformConfig(raw)).toThrow(
        "missing required field: sync_method"
      );
    });

    it("rejects spoke without path", () => {
      const raw: RawConfig = {
        spokes: [{ name: "test", sync_method: "syncthing" }],
      };
      expect(() => transformConfig(raw)).toThrow(
        "missing required field: path"
      );
    });

    it("rejects rsync spoke without source", () => {
      const raw: RawConfig = {
        spokes: [{ name: "test", sync_method: "rsync", path: "/test" }],
      };
      expect(() => transformConfig(raw)).toThrow("requires source field");
    });

    it("rejects schedule on non-rsync spoke", () => {
      const raw: RawConfig = {
        spokes: [
          {
            name: "test",
            sync_method: "syncthing",
            path: "/test",
            schedule: "0 0 * * *",
          },
        ],
      };
      expect(() => transformConfig(raw)).toThrow(
        "has schedule but sync_method is not rsync"
      );
    });

    it("rejects rsync_options on non-rsync spoke", () => {
      const raw: RawConfig = {
        spokes: [
          {
            name: "test",
            sync_method: "syncthing",
            path: "/test",
            rsync_options: { bw_limit: 100 },
          },
        ],
      };
      expect(() => transformConfig(raw)).toThrow(
        "has rsync_options but sync_method is not rsync"
      );
    });

    it("rejects invalid spoke schedule", () => {
      const raw: RawConfig = {
        spokes: [
          {
            name: "test",
            sync_method: "rsync",
            path: "/test",
            source: "user@host:/path",
            schedule: "invalid",
          },
        ],
      };
      expect(() => transformConfig(raw)).toThrow("Invalid cron schedule");
    });

    it("rejects negative bw_limit", () => {
      const raw: RawConfig = {
        spokes: [
          {
            name: "test",
            sync_method: "rsync",
            path: "/test",
            source: "user@host:/path",
            rsync_options: { bw_limit: -1 },
          },
        ],
      };
      expect(() => transformConfig(raw)).toThrow(
        "invalid rsync_options.bw_limit"
      );
    });

    it("rejects zero timeout_seconds", () => {
      const raw: RawConfig = {
        spokes: [
          {
            name: "test",
            sync_method: "rsync",
            path: "/test",
            source: "user@host:/path",
            rsync_options: { timeout_seconds: 0 },
          },
        ],
      };
      expect(() => transformConfig(raw)).toThrow(
        "invalid rsync_options.timeout_seconds"
      );
    });

    it("rejects non-string elements in extra_args", () => {
      const raw: RawConfig = {
        spokes: [
          {
            name: "test",
            sync_method: "rsync",
            path: "/test",
            source: "user@host:/path",
            rsync_options: {
              extra_args: [123, "--verbose"] as unknown as string[],
            },
          },
        ],
      };
      expect(() => transformConfig(raw)).toThrow(
        "all elements must be strings"
      );
    });

    it("rejects dangerous --rsh option in extra_args", () => {
      const raw: RawConfig = {
        spokes: [
          {
            name: "test",
            sync_method: "rsync",
            path: "/test",
            source: "user@host:/path",
            rsync_options: { extra_args: ["--rsh=evil command"] },
          },
        ],
      };
      expect(() => transformConfig(raw)).toThrow("disallowed rsync option");
    });

    it("rejects dangerous -e option in extra_args", () => {
      const raw: RawConfig = {
        spokes: [
          {
            name: "test",
            sync_method: "rsync",
            path: "/test",
            source: "user@host:/path",
            rsync_options: { extra_args: ["-e", "evil command"] },
          },
        ],
      };
      expect(() => transformConfig(raw)).toThrow("disallowed rsync option");
    });

    it("rejects duplicate spoke names", () => {
      const raw: RawConfig = {
        spokes: [
          { name: "same", sync_method: "syncthing", path: "/a" },
          { name: "same", sync_method: "syncthing", path: "/b" },
        ],
      };
      expect(() => transformConfig(raw)).toThrow("Duplicate spoke name");
    });

    it("rejects invalid cron schedule", () => {
      const raw: RawConfig = {
        daemon: { reanalysis_schedule: "invalid" },
      };
      expect(() => transformConfig(raw)).toThrow("Invalid cron schedule");
    });

    it("rejects cron schedule with wrong number of fields", () => {
      const raw: RawConfig = {
        daemon: { reanalysis_schedule: "0 2 * *" },
      };
      expect(() => transformConfig(raw)).toThrow("Expected 5 fields");
    });

    it("rejects zero idle_timeout_minutes", () => {
      const raw: RawConfig = {
        daemon: { idle_timeout_minutes: 0 },
      };
      expect(() => transformConfig(raw)).toThrow("positive integer");
    });

    it("rejects negative parallel_workers", () => {
      const raw: RawConfig = {
        daemon: { parallel_workers: -1 },
      };
      expect(() => transformConfig(raw)).toThrow("positive integer");
    });

    it("allows zero max_retries", () => {
      const raw: RawConfig = {
        daemon: { max_retries: 0 },
      };
      const config = transformConfig(raw);
      expect(config.daemon.maxRetries).toBe(0);
    });

    it("rejects negative max_retries", () => {
      const raw: RawConfig = {
        daemon: { max_retries: -1 },
      };
      expect(() => transformConfig(raw)).toThrow("non-negative integer");
    });
  });
});

describe("loadConfig", () => {
  it("returns defaults when file does not exist", () => {
    const tempDir = createTempDir();
    try {
      const configPath = path.join(tempDir, "nonexistent.yaml");
      const config = loadConfig(configPath);
      expect(config).toStrictEqual(getDefaultConfig());
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  it("returns defaults for empty file", () => {
    const tempDir = createTempDir();
    try {
      const configPath = path.join(tempDir, "empty.yaml");
      fs.writeFileSync(configPath, "", "utf8");
      const config = loadConfig(configPath);
      expect(config).toStrictEqual(getDefaultConfig());
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  it("returns defaults for whitespace-only file", () => {
    const tempDir = createTempDir();
    try {
      const configPath = path.join(tempDir, "whitespace.yaml");
      fs.writeFileSync(configPath, "   \n\n   ", "utf8");
      const config = loadConfig(configPath);
      expect(config).toStrictEqual(getDefaultConfig());
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  it("loads valid YAML configuration", () => {
    const tempDir = createTempDir();
    try {
      const configPath = path.join(tempDir, "config.yaml");
      fs.writeFileSync(
        configPath,
        `
hub:
  web_ui_port: 9000

daemon:
  idle_timeout_minutes: 15
`,
        "utf8"
      );
      const config = loadConfig(configPath);
      expect(config.hub.webUiPort).toBe(9000);
      expect(config.daemon.idleTimeoutMinutes).toBe(15);
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  it("throws ConfigError for invalid YAML", () => {
    const tempDir = createTempDir();
    try {
      const configPath = path.join(tempDir, "invalid.yaml");
      fs.writeFileSync(configPath, "invalid: yaml: syntax:", "utf8");
      expect(() => loadConfig(configPath)).toThrow(ConfigError);
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  it("throws ConfigError for invalid configuration", () => {
    const tempDir = createTempDir();
    try {
      const configPath = path.join(tempDir, "invalid-config.yaml");
      fs.writeFileSync(
        configPath,
        `
hub:
  web_ui_port: 99999
`,
        "utf8"
      );
      expect(() => loadConfig(configPath)).toThrow(ConfigError);
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  it("configError includes config path", () => {
    const tempDir = createTempDir();
    try {
      const configPath = path.join(tempDir, "invalid.yaml");
      fs.writeFileSync(
        configPath,
        `
hub:
  web_ui_port: -1
`,
        "utf8"
      );
      expect(() => loadConfig(configPath)).toThrow(
        expect.objectContaining({ configPath })
      );
    } finally {
      cleanupTempDir(tempDir);
    }
  });
});

describe("ensureConfigDir", () => {
  it("creates directory if it does not exist", () => {
    const tempDir = createTempDir();
    try {
      const dir = path.join(tempDir, "new-dir");
      ensureConfigDir(dir);
      expect(fs.existsSync(dir)).toBeTruthy();
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  it("does nothing if directory exists", () => {
    const tempDir = createTempDir();
    try {
      const dir = path.join(tempDir, "existing");
      fs.mkdirSync(dir);
      ensureConfigDir(dir);
      expect(fs.existsSync(dir)).toBeTruthy();
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  it("creates nested directories", () => {
    const tempDir = createTempDir();
    try {
      const dir = path.join(tempDir, "a", "b", "c");
      ensureConfigDir(dir);
      expect(fs.existsSync(dir)).toBeTruthy();
    } finally {
      cleanupTempDir(tempDir);
    }
  });
});

describe("ensureDirectories", () => {
  it("creates database directory", () => {
    const tempDir = createTempDir();
    try {
      const config = getDefaultConfig();
      config.hub.databaseDir = path.join(tempDir, "data");
      config.daemon.promptFile = path.join(tempDir, "prompts", "analyzer.md");
      ensureDirectories(config);
      expect(fs.existsSync(config.hub.databaseDir)).toBeTruthy();
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  it("creates nodes subdirectory", () => {
    const tempDir = createTempDir();
    try {
      const config = getDefaultConfig();
      config.hub.databaseDir = path.join(tempDir, "data");
      config.daemon.promptFile = path.join(tempDir, "prompts", "analyzer.md");
      ensureDirectories(config);
      expect(
        fs.existsSync(path.join(config.hub.databaseDir, "nodes"))
      ).toBeTruthy();
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  it("creates prompts directory", () => {
    const tempDir = createTempDir();
    try {
      const config = getDefaultConfig();
      config.hub.databaseDir = path.join(tempDir, "data");
      config.daemon.promptFile = path.join(tempDir, "prompts", "analyzer.md");
      ensureDirectories(config);
      expect(
        fs.existsSync(path.dirname(config.daemon.promptFile))
      ).toBeTruthy();
    } finally {
      cleanupTempDir(tempDir);
    }
  });
});

describe("writeDefaultConfig", () => {
  it("writes a valid config file", () => {
    const tempDir = createTempDir();
    try {
      const configPath = path.join(tempDir, "config.yaml");
      writeDefaultConfig(configPath);
      expect(fs.existsSync(configPath)).toBeTruthy();
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  it("written config can be loaded", () => {
    const tempDir = createTempDir();
    try {
      const configPath = path.join(tempDir, "config.yaml");
      writeDefaultConfig(configPath);
      const config = loadConfig(configPath);
      expect(config.hub.webUiPort).toBe(8765);
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  it("creates parent directories", () => {
    const tempDir = createTempDir();
    try {
      const configPath = path.join(tempDir, "nested", "config.yaml");
      writeDefaultConfig(configPath);
      expect(fs.existsSync(configPath)).toBeTruthy();
    } finally {
      cleanupTempDir(tempDir);
    }
  });
});

describe("getSessionDirs", () => {
  it("returns only hub sessions dir when no spokes", () => {
    const config = getDefaultConfig();
    const dirs = getSessionDirs(config);
    expect(dirs).toHaveLength(1);
    expect(dirs[0]).toBe(config.hub.sessionsDir);
  });

  it("includes spoke directories", () => {
    const config = getDefaultConfig();
    config.spokes = [
      {
        name: "laptop",
        syncMethod: "syncthing",
        path: "/synced/laptop",
        enabled: true,
      },
      {
        name: "server",
        syncMethod: "rsync",
        path: "/synced/server",
        enabled: true,
      },
    ];
    const dirs = getSessionDirs(config);
    expect(dirs).toHaveLength(3);
  });

  it("includes hub directory first", () => {
    const config = getDefaultConfig();
    config.spokes = [
      {
        name: "laptop",
        syncMethod: "syncthing",
        path: "/synced/laptop",
        enabled: true,
      },
    ];
    const dirs = getSessionDirs(config);
    expect(dirs[0]).toBe(config.hub.sessionsDir);
  });

  it("includes all spoke paths", () => {
    const config = getDefaultConfig();
    config.spokes = [
      {
        name: "laptop",
        syncMethod: "syncthing",
        path: "/synced/laptop",
        enabled: true,
      },
      {
        name: "server",
        syncMethod: "rsync",
        path: "/synced/server",
        enabled: true,
      },
    ];
    const dirs = getSessionDirs(config);
    expect(dirs).toContain("/synced/laptop");
    expect(dirs).toContain("/synced/server");
  });

  it("excludes disabled spokes", () => {
    const config = getDefaultConfig();
    config.spokes = [
      {
        name: "laptop",
        syncMethod: "syncthing",
        path: "/synced/laptop",
        enabled: true,
      },
      {
        name: "server",
        syncMethod: "rsync",
        path: "/synced/server",
        enabled: false,
      },
    ];
    const dirs = getSessionDirs(config);
    expect(dirs).toHaveLength(2);
    expect(dirs).toContain("/synced/laptop");
    expect(dirs).not.toContain("/synced/server");
  });
});

describe("getEnabledSpokes", () => {
  it("returns empty array when no spokes", () => {
    const config = getDefaultConfig();
    expect(getEnabledSpokes(config)).toStrictEqual([]);
  });

  it("returns only enabled spokes", () => {
    const config = getDefaultConfig();
    config.spokes = [
      {
        name: "laptop",
        syncMethod: "syncthing",
        path: "/synced/laptop",
        enabled: true,
      },
      {
        name: "server",
        syncMethod: "rsync",
        path: "/synced/server",
        enabled: false,
      },
      {
        name: "desktop",
        syncMethod: "syncthing",
        path: "/synced/desktop",
        enabled: true,
      },
    ];
    const enabled = getEnabledSpokes(config);
    expect(enabled).toHaveLength(2);
    expect(enabled.map((s) => s.name)).toStrictEqual(["laptop", "desktop"]);
  });
});

describe("getRsyncSpokes", () => {
  it("returns only enabled rsync spokes", () => {
    const config = getDefaultConfig();
    config.spokes = [
      {
        name: "laptop",
        syncMethod: "syncthing",
        path: "/synced/laptop",
        enabled: true,
      },
      {
        name: "server",
        syncMethod: "rsync",
        path: "/synced/server",
        enabled: true,
        source: "u@h:/p",
      },
      {
        name: "other",
        syncMethod: "rsync",
        path: "/synced/other",
        enabled: false,
        source: "u@h:/o",
      },
    ];
    const rsync = getRsyncSpokes(config);
    expect(rsync).toHaveLength(1);
    expect(rsync[0].name).toBe("server");
  });
});

describe("getScheduledRsyncSpokes", () => {
  it("returns only rsync spokes with schedule", () => {
    const config = getDefaultConfig();
    config.spokes = [
      {
        name: "laptop",
        syncMethod: "syncthing",
        path: "/synced/laptop",
        enabled: true,
      },
      {
        name: "server",
        syncMethod: "rsync",
        path: "/synced/server",
        enabled: true,
        source: "u@h:/p",
        schedule: "0 0 * * *",
      },
      {
        name: "other",
        syncMethod: "rsync",
        path: "/synced/other",
        enabled: true,
        source: "u@h:/o",
      },
    ];
    const scheduled = getScheduledRsyncSpokes(config);
    expect(scheduled).toHaveLength(1);
    expect(scheduled[0].name).toBe("server");
  });

  it("excludes disabled scheduled spokes", () => {
    const config = getDefaultConfig();
    config.spokes = [
      {
        name: "server",
        syncMethod: "rsync",
        path: "/synced/server",
        enabled: false,
        source: "u@h:/p",
        schedule: "0 0 * * *",
      },
    ];
    const scheduled = getScheduledRsyncSpokes(config);
    expect(scheduled).toHaveLength(0);
  });
});

describe("getComputerFromPath", () => {
  it("returns hostname for local sessions (not in any spoke)", () => {
    const config = getDefaultConfig();
    config.spokes = [
      {
        name: "laptop",
        syncMethod: "syncthing",
        path: "/synced/laptop",
        enabled: true,
      },
    ];
    const sessionPath = "/home/user/.pi/agent/sessions/project/session.jsonl";
    const computer = getComputerFromPath(sessionPath, config);
    expect(computer).toBe(os.hostname());
  });

  it("returns spoke name for sessions in spoke directory", () => {
    const config = getDefaultConfig();
    config.spokes = [
      {
        name: "laptop",
        syncMethod: "syncthing",
        path: "/synced/laptop",
        enabled: true,
      },
      {
        name: "server",
        syncMethod: "rsync",
        path: "/synced/server",
        enabled: true,
        source: "u@h:/p",
      },
    ];
    const sessionPath = "/synced/laptop/project/session.jsonl";
    const computer = getComputerFromPath(sessionPath, config);
    expect(computer).toBe("laptop");
  });

  it("returns correct spoke name when multiple spokes exist", () => {
    const config = getDefaultConfig();
    config.spokes = [
      {
        name: "laptop",
        syncMethod: "syncthing",
        path: "/synced/laptop",
        enabled: true,
      },
      {
        name: "server",
        syncMethod: "rsync",
        path: "/synced/server",
        enabled: true,
        source: "u@h:/p",
      },
    ];
    const sessionPath = "/synced/server/project/session.jsonl";
    const computer = getComputerFromPath(sessionPath, config);
    expect(computer).toBe("server");
  });

  it("ignores disabled spokes", () => {
    const config = getDefaultConfig();
    config.spokes = [
      {
        name: "disabled-laptop",
        syncMethod: "syncthing",
        path: "/synced/laptop",
        enabled: false,
      },
    ];
    const sessionPath = "/synced/laptop/project/session.jsonl";
    const computer = getComputerFromPath(sessionPath, config);
    // Falls back to hostname since spoke is disabled
    expect(computer).toBe(os.hostname());
  });

  it("handles spoke paths with trailing slashes", () => {
    const config = getDefaultConfig();
    config.spokes = [
      {
        name: "laptop",
        syncMethod: "syncthing",
        path: "/synced/laptop/", // Trailing slash
        enabled: true,
      },
    ];
    const sessionPath = "/synced/laptop/project/session.jsonl";
    const computer = getComputerFromPath(sessionPath, config);
    expect(computer).toBe("laptop");
  });

  it("uses proper path boundary checking (no false prefix matches)", () => {
    const config = getDefaultConfig();
    config.spokes = [
      {
        name: "laptop",
        syncMethod: "syncthing",
        path: "/synced/laptop",
        enabled: true,
      },
    ];
    // This path starts with /synced/laptop but is NOT a child of it
    const sessionPath = "/synced/laptop-backup/project/session.jsonl";
    const computer = getComputerFromPath(sessionPath, config);
    // Should NOT match "laptop" - falls back to hostname
    expect(computer).toBe(os.hostname());
  });

  it("returns hostname when no spokes configured", () => {
    const config = getDefaultConfig();
    config.spokes = [];
    const sessionPath = "/home/user/.pi/agent/sessions/project/session.jsonl";
    const computer = getComputerFromPath(sessionPath, config);
    expect(computer).toBe(os.hostname());
  });
});
