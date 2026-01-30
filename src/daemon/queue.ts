/**
 * Analysis Queue Manager
 *
 * SQLite-backed work queue for session analysis jobs.
 * Implements priority-based FIFO with locking and retry support.
 *
 * Based on specs/daemon.md queue system specification.
 */

import type Database from "better-sqlite3";

import type {
  AnalysisJob,
  JobContext,
  JobInput,
  JobStatus,
  JobType,
} from "./types.js";

export type { AnalysisJob, JobContext, JobInput, JobStatus, JobType };

// =============================================================================
// Priority Levels
// =============================================================================

/** Priority levels (lower = higher priority) */
export const PRIORITY = {
  /** Manual /brain analyze command */
  USER_TRIGGERED: 10,
  /** New fork from existing session */
  FORK: 50,
  /** First-time analysis (default) */
  INITIAL: 100,
  /** Improved prompt reprocessing */
  REANALYSIS: 200,
  /** Nightly connection discovery */
  CONNECTION: 300,
} as const;

/** Queue statistics */
export interface QueueStats {
  /** Jobs waiting to be processed */
  pending: number;
  /** Jobs currently being processed */
  running: number;
  /** Jobs completed successfully */
  completed: number;
  /** Jobs that failed */
  failed: number;
  /** Average duration in minutes (completed jobs) */
  avgDurationMinutes: number | null;
  /** Total jobs in queue */
  total: number;
}

/** Raw database row from analysis_queue */
interface QueueRow {
  id: string;
  type: string;
  priority: number;
  session_file: string;
  segment_start: string | null;
  segment_end: string | null;
  context: string | null;
  status: string;
  queued_at: string;
  started_at: string | null;
  completed_at: string | null;
  result_node_id: string | null;
  error: string | null;
  retry_count: number;
  max_retries: number;
  worker_id: string | null;
  locked_until: string | null;
}

/** Default configuration */
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_LOCK_DURATION_MINUTES = 30;

// =============================================================================
// QueueManager Class
// =============================================================================

/**
 * Manages the analysis job queue
 *
 * Thread-safe queue operations backed by SQLite with optimistic locking.
 */
export class QueueManager {
  constructor(
    private readonly db: Database.Database,
    private readonly lockDurationMinutes: number = DEFAULT_LOCK_DURATION_MINUTES
  ) {}

  /**
   * Add a job to the queue
   */
  enqueue(job: JobInput): string {
    const id = generateJobId();

    // Extract target_node_id from context for denormalized index
    const targetNodeId =
      job.context?.existingNodeId ?? job.context?.nodeId ?? null;

    this.db
      .prepare(
        `
      INSERT INTO analysis_queue (
        id, type, priority, session_file, segment_start, segment_end,
        context, status, queued_at, max_retries, target_node_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'), ?, ?)
    `
      )
      .run(
        id,
        job.type,
        job.priority ?? PRIORITY.INITIAL,
        job.sessionFile,
        job.segmentStart ?? null,
        job.segmentEnd ?? null,
        job.context ? JSON.stringify(job.context) : null,
        job.maxRetries ?? DEFAULT_MAX_RETRIES,
        targetNodeId
      );

    return id;
  }

  /**
   * Convert a JobInput to SQL parameters for insertion
   */
  private jobToInsertParams(
    job: JobInput
  ): [
    string,
    string,
    number,
    string,
    string | null,
    string | null,
    string | null,
    number,
    string | null,
  ] {
    const id = generateJobId();
    const targetNodeId =
      job.context?.existingNodeId ?? job.context?.nodeId ?? null;

    return [
      id,
      job.type,
      job.priority ?? PRIORITY.INITIAL,
      job.sessionFile,
      job.segmentStart ?? null,
      job.segmentEnd ?? null,
      job.context ? JSON.stringify(job.context) : null,
      job.maxRetries ?? DEFAULT_MAX_RETRIES,
      targetNodeId,
    ];
  }

  /**
   * Add multiple jobs to the queue in a single transaction
   */
  enqueueMany(jobs: JobInput[]): string[] {
    const ids: string[] = [];

    const insert = this.db.prepare(`
      INSERT INTO analysis_queue (
        id, type, priority, session_file, segment_start, segment_end,
        context, status, queued_at, max_retries, target_node_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'), ?, ?)
    `);

    const transaction = this.db.transaction(() => {
      for (const job of jobs) {
        const params = this.jobToInsertParams(job);
        insert.run(...params);
        ids.push(params[0]); // id is first param
      }
    });

    transaction();
    return ids;
  }

  /**
   * Get the next available job and lock it for processing
   *
   * Uses optimistic locking to prevent multiple workers from
   * processing the same job.
   */
  dequeue(workerId: string): AnalysisJob | null {
    // Find the highest priority pending job that isn't locked
    const row = this.db
      .prepare(
        `
      SELECT * FROM analysis_queue
      WHERE status = 'pending'
        AND (locked_until IS NULL OR locked_until < datetime('now'))
      ORDER BY priority ASC, queued_at ASC
      LIMIT 1
    `
      )
      .get() as QueueRow | undefined;

    if (!row) {
      return null;
    }

    // Try to lock it (optimistic locking)
    const result = this.db
      .prepare(
        `
      UPDATE analysis_queue
      SET status = 'running',
          started_at = datetime('now'),
          worker_id = ?,
          locked_until = datetime('now', '+' || ? || ' minutes')
      WHERE id = ?
        AND status = 'pending'
        AND (locked_until IS NULL OR locked_until < datetime('now'))
    `
      )
      .run(workerId, this.lockDurationMinutes, row.id);

    // If no rows were updated, another worker got it first
    if (result.changes === 0) {
      return null;
    }

    // Fetch the updated row
    const updatedRow = this.db
      .prepare("SELECT * FROM analysis_queue WHERE id = ?")
      .get(row.id) as QueueRow;

    return this.parseRow(updatedRow);
  }

  /**
   * Mark a job as completed successfully
   */
  complete(jobId: string, nodeId: string): void {
    this.db
      .prepare(
        `
      UPDATE analysis_queue
      SET status = 'completed',
          completed_at = datetime('now'),
          result_node_id = ?,
          worker_id = NULL,
          locked_until = NULL
      WHERE id = ?
    `
      )
      .run(nodeId, jobId);
  }

  /**
   * Mark a job as failed
   *
   * If retry count is below max, the job will be re-queued with
   * exponential backoff.
   */
  fail(jobId: string, error: string): void {
    const job = this.getJob(jobId);
    if (!job) {
      return;
    }

    if (job.retryCount < job.maxRetries) {
      // Retry with exponential backoff
      const delayMinutes = 2 ** job.retryCount;

      this.db
        .prepare(
          `
        UPDATE analysis_queue
        SET status = 'pending',
            retry_count = retry_count + 1,
            error = ?,
            worker_id = NULL,
            locked_until = datetime('now', '+' || ? || ' minutes')
        WHERE id = ?
      `
        )
        .run(error, delayMinutes, jobId);
    } else {
      // Max retries exceeded
      this.db
        .prepare(
          `
        UPDATE analysis_queue
        SET status = 'failed',
            completed_at = datetime('now'),
            error = ?,
            worker_id = NULL,
            locked_until = NULL
        WHERE id = ?
      `
        )
        .run(error, jobId);
    }
  }

  /**
   * Mark a job as permanently failed (no retries)
   *
   * Use this for errors that will never succeed on retry,
   * such as file not found or validation errors.
   */
  failPermanently(jobId: string, error: string): void {
    this.db
      .prepare(
        `
      UPDATE analysis_queue
      SET status = 'failed',
          completed_at = datetime('now'),
          error = ?,
          worker_id = NULL,
          locked_until = NULL
      WHERE id = ?
    `
      )
      .run(error, jobId);
  }

  /**
   * Get a job by ID
   */
  getJob(jobId: string): AnalysisJob | null {
    const row = this.db
      .prepare("SELECT * FROM analysis_queue WHERE id = ?")
      .get(jobId) as QueueRow | undefined;

    return row ? this.parseRow(row) : null;
  }

  /**
   * Get all pending jobs (optionally filtered by session file)
   */
  getPendingJobs(sessionFile?: string, limit?: number): AnalysisJob[] {
    let sql = "SELECT * FROM analysis_queue WHERE status = 'pending'";
    const params: unknown[] = [];

    if (sessionFile) {
      sql += " AND session_file = ?";
      params.push(sessionFile);
    }

    sql += " ORDER BY priority ASC, queued_at ASC";

    if (limit !== undefined) {
      sql += " LIMIT ?";
      params.push(limit);
    }

    const rows = this.db.prepare(sql).all(...params) as QueueRow[];
    return rows.map((row) => this.parseRow(row));
  }

  /**
   * Get all running jobs
   */
  getRunningJobs(): AnalysisJob[] {
    const rows = this.db
      .prepare(
        "SELECT * FROM analysis_queue WHERE status = 'running' ORDER BY started_at ASC"
      )
      .all() as QueueRow[];

    return rows.map((row) => this.parseRow(row));
  }

  /**
   * Get failed jobs
   */
  getFailedJobs(limit = 100): AnalysisJob[] {
    const rows = this.db
      .prepare(
        `
      SELECT * FROM analysis_queue
      WHERE status = 'failed'
      ORDER BY completed_at DESC
      LIMIT ?
    `
      )
      .all(limit) as QueueRow[];

    return rows.map((row) => this.parseRow(row));
  }

  /**
   * Get jobs for a specific session file
   */
  getJobsForSession(sessionFile: string): AnalysisJob[] {
    const rows = this.db
      .prepare(
        `
      SELECT * FROM analysis_queue
      WHERE session_file = ?
      ORDER BY queued_at DESC
    `
      )
      .all(sessionFile) as QueueRow[];

    return rows.map((row) => this.parseRow(row));
  }

  /**
   * Check if a job already exists for a session segment
   *
   * Prevents duplicate jobs for the same work.
   */
  hasExistingJob(
    sessionFile: string,
    segmentStart?: string,
    segmentEnd?: string
  ): boolean {
    let sql = `
      SELECT 1 FROM analysis_queue
      WHERE session_file = ?
        AND status IN ('pending', 'running')
    `;
    const params: unknown[] = [sessionFile];

    if (segmentStart === undefined) {
      sql += " AND segment_start IS NULL";
    } else {
      sql += " AND segment_start = ?";
      params.push(segmentStart);
    }

    if (segmentEnd === undefined) {
      sql += " AND segment_end IS NULL";
    } else {
      sql += " AND segment_end = ?";
      params.push(segmentEnd);
    }

    const result = this.db.prepare(sql).get(...params);
    return result !== undefined;
  }

  /**
   * Retry a failed job
   */
  retryJob(jobId: string): boolean {
    const job = this.getJob(jobId);
    if (!job || job.status !== "failed") {
      return false;
    }

    this.db
      .prepare(
        `
      UPDATE analysis_queue
      SET status = 'pending',
          retry_count = 0,
          error = NULL,
          started_at = NULL,
          completed_at = NULL
      WHERE id = ?
    `
      )
      .run(jobId);

    return true;
  }

  /**
   * Cancel a pending job
   */
  cancelJob(jobId: string): boolean {
    const result = this.db
      .prepare(
        `
      DELETE FROM analysis_queue
      WHERE id = ? AND status = 'pending'
    `
      )
      .run(jobId);

    return result.changes > 0;
  }

  /**
   * Cancel all pending jobs for a session
   */
  cancelJobsForSession(sessionFile: string): number {
    const result = this.db
      .prepare(
        `
      DELETE FROM analysis_queue
      WHERE session_file = ? AND status = 'pending'
    `
      )
      .run(sessionFile);

    return result.changes;
  }

  /**
   * Release stale locks (jobs that were running but never completed)
   *
   * Call this periodically to recover from worker crashes.
   * Note: We clear the error field on retry to give jobs a clean slate.
   * The stale lock condition itself is logged by the daemon when this returns > 0.
   */
  releaseStale(): number {
    const result = this.db
      .prepare(
        `
      UPDATE analysis_queue
      SET status = CASE WHEN retry_count + 1 >= max_retries THEN 'failed' ELSE 'pending' END,
          retry_count = retry_count + 1,
          worker_id = NULL,
          locked_until = NULL,
          started_at = NULL,
          error = CASE WHEN retry_count + 1 >= max_retries THEN 'Stale lock released (max retries exceeded)' ELSE NULL END,
          completed_at = CASE WHEN retry_count + 1 >= max_retries THEN datetime('now') ELSE NULL END
      WHERE status = 'running'
        AND locked_until < datetime('now')
    `
      )
      .run();

    return result.changes;
  }

  /**
   * Release ALL running jobs back to pending
   *
   * Use this on daemon startup to recover from a crash.
   * Note: We clear the error field on retry to give jobs a clean slate.
   * The daemon logs the count of released jobs for observability.
   */
  releaseAllRunning(): number {
    const result = this.db
      .prepare(
        `
      UPDATE analysis_queue
      SET status = CASE WHEN retry_count + 1 >= max_retries THEN 'failed' ELSE 'pending' END,
          retry_count = retry_count + 1,
          worker_id = NULL,
          locked_until = NULL,
          started_at = NULL,
          error = CASE WHEN retry_count + 1 >= max_retries THEN 'Daemon restart recovery (max retries exceeded)' ELSE NULL END,
          completed_at = CASE WHEN retry_count + 1 >= max_retries THEN datetime('now') ELSE NULL END
      WHERE status = 'running'
    `
      )
      .run();

    return result.changes;
  }

  /**
   * Get queue statistics for today
   */
  getDailyStats(): { completedToday: number; failedToday: number } {
    const result = this.db
      .prepare(
        `
      SELECT
        SUM(CASE WHEN status = 'completed' AND completed_at >= date('now', 'start of day') THEN 1 ELSE 0 END) as completed_today,
        SUM(CASE WHEN status = 'failed' AND completed_at >= date('now', 'start of day') THEN 1 ELSE 0 END) as failed_today
      FROM analysis_queue
    `
      )
      .get() as { completed_today: number; failed_today: number };

    return {
      completedToday: result.completed_today ?? 0,
      failedToday: result.failed_today ?? 0,
    };
  }

  /**
   * Get queue statistics
   */
  getStats(): QueueStats {
    const result = this.db
      .prepare(
        `
      SELECT
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        AVG(CASE
          WHEN status = 'completed' AND started_at IS NOT NULL
          THEN (julianday(completed_at) - julianday(started_at)) * 24 * 60
          ELSE NULL
        END) as avg_duration_minutes,
        COUNT(*) as total
      FROM analysis_queue
    `
      )
      .get() as {
      pending: number;
      running: number;
      completed: number;
      failed: number;
      avg_duration_minutes: number | null;
      total: number;
    };

    return {
      pending: result.pending ?? 0,
      running: result.running ?? 0,
      completed: result.completed ?? 0,
      failed: result.failed ?? 0,
      avgDurationMinutes: result.avg_duration_minutes,
      total: result.total ?? 0,
    };
  }

  /**
   * Get the count of jobs by status
   */
  getJobCounts(): Record<JobStatus, number> {
    const rows = this.db
      .prepare(
        `
      SELECT status, COUNT(*) as count
      FROM analysis_queue
      GROUP BY status
    `
      )
      .all() as { status: string; count: number }[];

    const counts: Record<JobStatus, number> = {
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0,
    };

    for (const row of rows) {
      if (row.status in counts) {
        counts[row.status as JobStatus] = row.count;
      }
    }

    return counts;
  }

  /**
   * Clear completed jobs older than the specified number of days
   */
  clearOldCompleted(daysOld: number): number {
    const result = this.db
      .prepare(
        `
      DELETE FROM analysis_queue
      WHERE status = 'completed'
        AND completed_at < datetime('now', '-' || ? || ' days')
    `
      )
      .run(daysOld);

    return result.changes;
  }

  /**
   * Clear all jobs (for testing)
   */
  clearAll(): number {
    const result = this.db.prepare("DELETE FROM analysis_queue").run();
    return result.changes;
  }

  /**
   * Parse a database row into an AnalysisJob
   */
  private parseRow(row: QueueRow): AnalysisJob {
    return {
      id: row.id,
      type: row.type as JobType,
      priority: row.priority,
      sessionFile: row.session_file,
      segmentStart: row.segment_start ?? undefined,
      segmentEnd: row.segment_end ?? undefined,
      context: row.context
        ? (JSON.parse(row.context) as JobContext)
        : undefined,
      status: row.status as JobStatus,
      queuedAt: row.queued_at,
      startedAt: row.started_at ?? undefined,
      completedAt: row.completed_at ?? undefined,
      resultNodeId: row.result_node_id ?? undefined,
      error: row.error ?? undefined,
      retryCount: row.retry_count,
      maxRetries: row.max_retries,
      workerId: row.worker_id ?? undefined,
      lockedUntil: row.locked_until ?? undefined,
    };
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Generate a unique job ID
 *
 * Uses the same format as node IDs: 16-char hex string
 */
export function generateJobId(): string {
  return crypto.randomUUID().replaceAll("-", "").slice(0, 16);
}

/**
 * Create a queue manager from a database
 */
export function createQueueManager(db: Database.Database): QueueManager {
  return new QueueManager(db);
}

/**
 * Get aggregated queue status
 * Used by CLI and API
 */
export function getQueueStatusSummary(db: Database.Database): {
  stats: QueueStats;
  pendingJobs: AnalysisJob[];
  runningJobs: AnalysisJob[];
  recentFailed: AnalysisJob[];
} {
  const queue = new QueueManager(db);
  const stats = queue.getStats();
  const pendingJobs = queue.getPendingJobs(undefined, 10);
  const runningJobs = queue.getRunningJobs();
  const recentFailed = queue.getFailedJobs(5);

  return {
    stats,
    pendingJobs,
    runningJobs,
    recentFailed,
  };
}
