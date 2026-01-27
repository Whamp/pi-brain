/**
 * File watcher for monitoring pi session directories
 *
 * Uses chokidar for cross-platform file watching (inotify on Linux).
 * Monitors session directories for new/changed .jsonl files.
 */

import type { Stats } from "node:fs";

import { watch, type FSWatcher } from "chokidar";
import * as fs from "node:fs/promises";
import * as path from "node:path";

import type { DaemonConfig, PiBrainConfig } from "../config/types.js";

import { getSessionDirs } from "../config/config.js";
import {
  SESSION_EVENTS,
  createSessionEvent,
  createErrorEvent,
  createReadyEvent,
} from "./watcher-events.js";

/**
 * State tracking for a single session file
 */
export interface SessionState {
  /** Absolute path to the session file */
  path: string;

  /** Timestamp when file was last modified */
  lastModified: number;

  /** Timestamp when file was last analyzed (null if never) */
  lastAnalyzed: number | null;

  /** Timer for idle detection */
  idleTimer: ReturnType<typeof setTimeout> | null;

  /** Whether the session is currently being analyzed */
  analyzing: boolean;
}

/**
 * Watcher configuration options
 */
export interface WatcherConfig {
  /** Idle timeout in minutes before triggering analysis */
  idleTimeoutMinutes: number;

  /** Stability threshold in milliseconds for local sessions */
  stabilityThreshold: number;

  /** Stability threshold in milliseconds for synced sessions (longer to account for network sync) */
  syncedStabilityThreshold: number;

  /** Poll interval in milliseconds for awaitWriteFinish */
  pollInterval: number;

  /** Watch depth (how many levels of subdirectories) */
  depth: number;
}

/**
 * Default watcher configuration
 */
export const DEFAULT_WATCHER_CONFIG: WatcherConfig = {
  idleTimeoutMinutes: 10,
  stabilityThreshold: 5000, // 5 seconds for local sessions
  syncedStabilityThreshold: 30_000, // 30 seconds for synced sessions
  pollInterval: 100,
  depth: 2,
};

/**
 * Session file watcher
 *
 * Monitors directories for .jsonl session files, tracks their state,
 * and emits events when sessions are ready for analysis.
 *
 * Uses EventTarget for cross-platform compatibility.
 */
export class SessionWatcher extends EventTarget {
  private watcher: FSWatcher | null = null;
  private sessionStates = new Map<string, SessionState>();
  private watchConfig: WatcherConfig;
  private watchPaths: string[] = [];
  private spokePaths = new Set<string>();
  private isRunning = false;

  constructor(config?: Partial<WatcherConfig>) {
    super();
    this.watchConfig = { ...DEFAULT_WATCHER_CONFIG, ...config };
  }

  /**
   * Create a SessionWatcher from pi-brain config
   */
  static fromConfig(config: PiBrainConfig): SessionWatcher {
    const watcher = new SessionWatcher({
      idleTimeoutMinutes: config.daemon.idleTimeoutMinutes,
    });

    // Track spoke paths for differentiated stability thresholds
    for (const spoke of config.spokes) {
      if (spoke.enabled) {
        watcher.addSpokePath(spoke.path);
      }
    }

    return watcher;
  }

  /**
   * Add a path as a spoke (synced) directory
   * Synced directories use longer stability thresholds
   */
  addSpokePath(spokePath: string): void {
    this.spokePaths.add(spokePath);
  }

  /**
   * Check if a session file is from a spoke (synced) directory
   */
  isFromSpoke(sessionPath: string): boolean {
    for (const spokePath of this.spokePaths) {
      if (sessionPath.startsWith(spokePath)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get the stability threshold for a given session path
   */
  getStabilityThreshold(sessionPath: string): number {
    return this.isFromSpoke(sessionPath)
      ? this.watchConfig.syncedStabilityThreshold
      : this.watchConfig.stabilityThreshold;
  }

  /**
   * Get the set of spoke paths being watched
   */
  getSpokePaths(): Set<string> {
    return new Set(this.spokePaths);
  }

  /**
   * Start watching the specified directories
   */
  async start(watchPaths: string | string[]): Promise<void> {
    if (this.isRunning) {
      throw new Error("Watcher is already running");
    }

    // Mark as running immediately to prevent double-start
    this.isRunning = true;

    this.watchPaths = Array.isArray(watchPaths) ? watchPaths : [watchPaths];

    // Validate paths exist
    for (const watchPath of this.watchPaths) {
      try {
        const stat = await fs.stat(watchPath);
        if (!stat.isDirectory()) {
          this.isRunning = false;
          throw new Error(`Not a directory: ${watchPath}`);
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          // Create directory if it doesn't exist
          await fs.mkdir(watchPath, { recursive: true });
        } else {
          this.isRunning = false;
          throw error;
        }
      }
    }

    // Check if stop() was called during path validation
    if (!this.isRunning) {
      return;
    }

    this.watcher = watch(this.watchPaths, {
      persistent: true,
      ignoreInitial: false,
      depth: this.watchConfig.depth,
      awaitWriteFinish: {
        stabilityThreshold: this.watchConfig.stabilityThreshold,
        pollInterval: this.watchConfig.pollInterval,
      },
      // Only watch .jsonl files
      ignored: (filePath: string, stats?: Stats) => {
        // When stats is undefined, don't ignore (let chokidar stat it first)
        if (stats === undefined) {
          return false;
        }
        // Always allow directories (needed for recursive watching)
        if (stats.isDirectory()) {
          return false;
        }
        // Only allow .jsonl files
        return !filePath.endsWith(".jsonl");
      },
    });

    this.watcher
      .on("add", (filePath) => this.handleNewFile(filePath))
      .on("change", (filePath) => this.handleFileChange(filePath))
      .on("unlink", (filePath) => this.handleFileRemove(filePath))
      .on("error", (error) =>
        this.dispatchEvent(createErrorEvent(error as Error))
      )
      .on("ready", () => {
        this.dispatchEvent(createReadyEvent());
      });
  }

  /**
   * Start watching directories from pi-brain config
   *
   * This automatically includes both local sessions (hub) and synced sessions (enabled spokes).
   * Spoke paths are tracked separately to allow differentiated handling.
   */
  async startFromConfig(config: PiBrainConfig): Promise<void> {
    // Track spoke paths before starting (fromConfig already does this, but be explicit)
    for (const spoke of config.spokes) {
      if (spoke.enabled) {
        this.addSpokePath(spoke.path);
      }
    }

    const paths = getSessionDirs(config);
    return this.start(paths);
  }

  /**
   * Stop watching
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    // Mark as not running first to prevent race conditions with start()
    this.isRunning = false;

    // Clear all idle timers
    for (const state of this.sessionStates.values()) {
      if (state.idleTimer) {
        clearTimeout(state.idleTimer);
        state.idleTimer = null;
      }
    }

    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }

    this.sessionStates.clear();
  }

  /**
   * Get the current state of a session
   */
  getSessionState(sessionPath: string): SessionState | undefined {
    return this.sessionStates.get(sessionPath);
  }

  /**
   * Get all tracked sessions
   */
  getAllSessions(): Map<string, SessionState> {
    return new Map(this.sessionStates);
  }

  /**
   * Get paths being watched
   */
  getWatchPaths(): string[] {
    return [...this.watchPaths];
  }

  /**
   * Check if watcher is running
   */
  get running(): boolean {
    return this.isRunning;
  }

  /**
   * Get count of tracked sessions
   */
  get sessionCount(): number {
    return this.sessionStates.size;
  }

  /**
   * Mark a session as analyzed
   */
  markAnalyzed(sessionPath: string): void {
    const state = this.sessionStates.get(sessionPath);
    if (state) {
      state.lastAnalyzed = Date.now();
      state.analyzing = false;
    }
  }

  /**
   * Mark a session as being analyzed
   */
  markAnalyzing(sessionPath: string): void {
    const state = this.sessionStates.get(sessionPath);
    if (state) {
      state.analyzing = true;
    }
  }

  /**
   * Handle new file detected
   */
  private handleNewFile(filePath: string): void {
    // Ignore events after watcher is stopped
    if (!this.isRunning) {
      return;
    }

    // Double-check it's a .jsonl file (chokidar's ignore can be unreliable)
    if (!filePath.endsWith(".jsonl")) {
      return;
    }

    const now = Date.now();

    // Track new session
    const state: SessionState = {
      path: filePath,
      lastModified: now,
      lastAnalyzed: null,
      idleTimer: null,
      analyzing: false,
    };

    this.sessionStates.set(filePath, state);

    // Emit new session event
    this.dispatchEvent(createSessionEvent(SESSION_EVENTS.NEW, filePath));

    // Schedule idle check
    this.scheduleIdleCheck(filePath);
  }

  /**
   * Handle file change detected
   */
  private handleFileChange(filePath: string): void {
    // Ignore events after watcher is stopped
    if (!this.isRunning) {
      return;
    }

    if (!filePath.endsWith(".jsonl")) {
      return;
    }

    const state = this.sessionStates.get(filePath);
    if (!state) {
      // File changed but we weren't tracking it - treat as new
      this.handleNewFile(filePath);
      return;
    }

    // Update last modified time
    state.lastModified = Date.now();

    // Emit change event
    this.dispatchEvent(createSessionEvent(SESSION_EVENTS.CHANGE, filePath));

    // Reschedule idle check
    this.scheduleIdleCheck(filePath);
  }

  /**
   * Handle file removal
   */
  private handleFileRemove(filePath: string): void {
    // Ignore events after watcher is stopped
    if (!this.isRunning) {
      return;
    }

    const state = this.sessionStates.get(filePath);
    if (!state) {
      return;
    }

    // Clear idle timer
    if (state.idleTimer) {
      clearTimeout(state.idleTimer);
    }

    // Remove from tracking
    this.sessionStates.delete(filePath);

    // Emit remove event
    this.dispatchEvent(createSessionEvent(SESSION_EVENTS.REMOVE, filePath));
  }

  /**
   * Schedule an idle check for a session
   */
  private scheduleIdleCheck(filePath: string): void {
    const state = this.sessionStates.get(filePath);
    if (!state) {
      return;
    }

    // Clear existing timer
    if (state.idleTimer) {
      clearTimeout(state.idleTimer);
      state.idleTimer = null;
    }

    // Schedule new check
    const timeoutMs = this.watchConfig.idleTimeoutMinutes * 60 * 1000;
    state.idleTimer = setTimeout(() => {
      this.checkIdle(filePath);
    }, timeoutMs);
  }

  /**
   * Check if a session is idle and trigger analysis if so
   */
  private checkIdle(filePath: string): void {
    // Ignore if watcher is stopped
    if (!this.isRunning) {
      return;
    }

    const state = this.sessionStates.get(filePath);
    if (!state) {
      return;
    }

    // Clear the timer reference
    state.idleTimer = null;

    // Don't emit if already analyzing
    if (state.analyzing) {
      return;
    }

    const now = Date.now();
    const idleDuration = now - state.lastModified;
    const idleThreshold = this.watchConfig.idleTimeoutMinutes * 60 * 1000;

    if (idleDuration >= idleThreshold) {
      // Session is idle, emit event
      this.dispatchEvent(createSessionEvent(SESSION_EVENTS.IDLE, filePath));
    } else {
      // Not idle yet, reschedule
      const remaining = idleThreshold - idleDuration;
      state.idleTimer = setTimeout(() => {
        this.checkIdle(filePath);
      }, remaining);
    }
  }
}

/**
 * Create a watcher from daemon config
 */
export function createWatcher(daemonConfig: DaemonConfig): SessionWatcher {
  return new SessionWatcher({
    idleTimeoutMinutes: daemonConfig.idleTimeoutMinutes,
  });
}

/**
 * Check if a path is a valid session file
 */
export function isSessionFile(filePath: string): boolean {
  return filePath.endsWith(".jsonl");
}

/**
 * Extract session name from path
 */
export function getSessionName(sessionPath: string): string {
  return path.basename(sessionPath, ".jsonl");
}

/**
 * Extract project name from session path
 *
 * Session paths are typically: ~/.pi/agent/sessions/<project-name>/<session-file>.jsonl
 */
export function getProjectFromSessionPath(sessionPath: string): string | null {
  const dir = path.dirname(sessionPath);
  const projectDir = path.basename(dir);

  // Skip if it's the sessions directory itself
  if (projectDir === "sessions") {
    return null;
  }

  return projectDir;
}
