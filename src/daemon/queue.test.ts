/**
 * Tests for the analysis queue manager
 */

import type Database from "better-sqlite3";

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { openDatabase, closeDatabase } from "../storage/database.js";
import {
  type QueueManager,
  createQueueManager,
  generateJobId,
  PRIORITY,
  type JobInput,
} from "./queue.js";

describe("queueManager", () => {
  let db: Database.Database;
  let queue: QueueManager;
  let tempDir: string;

  beforeEach(() => {
    // Create temp directory for test database
    tempDir = mkdtempSync(join(tmpdir(), "pi-brain-queue-test-"));
    db = openDatabase({ path: join(tempDir, "test.db") });
    queue = createQueueManager(db);
  });

  afterEach(() => {
    closeDatabase(db);
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe("generateJobId", () => {
    it("should generate a 16-char hex string", () => {
      const id = generateJobId();
      expect(id).toMatch(/^[a-f0-9]{16}$/);
    });

    it("should generate unique IDs", () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateJobId());
      }
      expect(ids.size).toBe(100);
    });
  });

  describe("enqueue", () => {
    it("should add a job to the queue", () => {
      const id = queue.enqueue({
        type: "initial",
        priority: PRIORITY.INITIAL,
        sessionFile: "/path/to/session.jsonl",
      });

      expect(id).toMatch(/^[a-f0-9]{16}$/);

      const job = queue.getJob(id);
      expect(job).not.toBeNull();
      expect(job?.type).toBe("initial");
      expect(job?.priority).toBe(PRIORITY.INITIAL);
      expect(job?.sessionFile).toBe("/path/to/session.jsonl");
      expect(job?.status).toBe("pending");
      expect(job?.retryCount).toBe(0);
      expect(job?.maxRetries).toBe(3);
    });

    it("should use default priority when not specified", () => {
      const id = queue.enqueue({
        type: "initial",
        sessionFile: "/path/to/session.jsonl",
      });

      const job = queue.getJob(id);
      expect(job?.priority).toBe(PRIORITY.INITIAL);
    });

    it("should store segment start and end", () => {
      const id = queue.enqueue({
        type: "initial",
        priority: PRIORITY.INITIAL,
        sessionFile: "/path/to/session.jsonl",
        segmentStart: "entry-abc",
        segmentEnd: "entry-xyz",
      });

      const job = queue.getJob(id);
      expect(job?.segmentStart).toBe("entry-abc");
      expect(job?.segmentEnd).toBe("entry-xyz");
    });

    it("should store context as JSON", () => {
      const context = {
        existingNodeId: "node123",
        reason: "prompt_update",
      };

      const id = queue.enqueue({
        type: "reanalysis",
        priority: PRIORITY.REANALYSIS,
        sessionFile: "/path/to/session.jsonl",
        context,
      });

      const job = queue.getJob(id);
      expect(job?.context).toStrictEqual(context);
    });

    it("should allow custom max retries", () => {
      const id = queue.enqueue({
        type: "initial",
        priority: PRIORITY.INITIAL,
        sessionFile: "/path/to/session.jsonl",
        maxRetries: 5,
      });

      const job = queue.getJob(id);
      expect(job?.maxRetries).toBe(5);
    });
  });

  describe("enqueueMany", () => {
    it("should add multiple jobs in a transaction", () => {
      const jobs: JobInput[] = [
        { type: "initial", sessionFile: "/path/1.jsonl" },
        { type: "initial", sessionFile: "/path/2.jsonl" },
        { type: "initial", sessionFile: "/path/3.jsonl" },
      ];

      const ids = queue.enqueueMany(jobs);

      expect(ids).toHaveLength(3);
      for (const id of ids) {
        expect(queue.getJob(id)).not.toBeNull();
      }
    });

    it("should return empty array for empty input", () => {
      const ids = queue.enqueueMany([]);
      expect(ids).toHaveLength(0);
    });
  });

  describe("dequeue", () => {
    it("should return null when queue is empty", () => {
      const job = queue.dequeue("worker-1");
      expect(job).toBeNull();
    });

    it("should return the highest priority job", () => {
      queue.enqueue({
        type: "reanalysis",
        priority: PRIORITY.REANALYSIS,
        sessionFile: "/path/low-priority.jsonl",
      });
      queue.enqueue({
        type: "initial",
        priority: PRIORITY.USER_TRIGGERED,
        sessionFile: "/path/high-priority.jsonl",
      });
      queue.enqueue({
        type: "initial",
        priority: PRIORITY.INITIAL,
        sessionFile: "/path/medium-priority.jsonl",
      });

      const job = queue.dequeue("worker-1");
      expect(job?.priority).toBe(PRIORITY.USER_TRIGGERED);
      expect(job?.sessionFile).toBe("/path/high-priority.jsonl");
    });

    it("should return FIFO for same priority", () => {
      queue.enqueue({
        type: "initial",
        priority: PRIORITY.INITIAL,
        sessionFile: "/path/first.jsonl",
      });
      queue.enqueue({
        type: "initial",
        priority: PRIORITY.INITIAL,
        sessionFile: "/path/second.jsonl",
      });

      const job1 = queue.dequeue("worker-1");
      expect(job1?.sessionFile).toBe("/path/first.jsonl");

      const job2 = queue.dequeue("worker-2");
      expect(job2?.sessionFile).toBe("/path/second.jsonl");
    });

    it("should set status to running and record worker ID", () => {
      queue.enqueue({
        type: "initial",
        sessionFile: "/path/session.jsonl",
      });

      const job = queue.dequeue("worker-test");

      expect(job?.status).toBe("running");
      expect(job?.workerId).toBe("worker-test");
      expect(job?.startedAt).toBeDefined();
      expect(job?.lockedUntil).toBeDefined();
    });

    it("should not return jobs that are already running", () => {
      const id = queue.enqueue({
        type: "initial",
        sessionFile: "/path/session.jsonl",
      });

      // First dequeue gets the job
      const job1 = queue.dequeue("worker-1");
      expect(job1?.id).toBe(id);

      // Second dequeue should get nothing
      const job2 = queue.dequeue("worker-2");
      expect(job2).toBeNull();
    });

    it("should skip locked jobs", () => {
      queue.enqueue({
        type: "initial",
        sessionFile: "/path/session.jsonl",
      });

      // Dequeue to lock
      queue.dequeue("worker-1");

      // Try to dequeue again - should fail
      const job = queue.dequeue("worker-2");
      expect(job).toBeNull();
    });
  });

  describe("complete", () => {
    it("should mark job as completed with result node ID", () => {
      const id = queue.enqueue({
        type: "initial",
        sessionFile: "/path/session.jsonl",
      });

      queue.dequeue("worker-1");
      // Pass null for result_node_id since we don't have a real node in tests
      queue.complete(id, null as unknown as string);

      const job = queue.getJob(id);
      expect(job?.status).toBe("completed");
      expect(job?.resultNodeId).toBeUndefined();
      expect(job?.completedAt).toBeDefined();
      expect(job?.workerId).toBeUndefined();
      expect(job?.lockedUntil).toBeUndefined();
    });
  });

  describe("fail", () => {
    it("should requeue job for retry when below max retries", () => {
      const id = queue.enqueue({
        type: "initial",
        sessionFile: "/path/session.jsonl",
        maxRetries: 3,
      });

      queue.dequeue("worker-1");
      queue.fail(id, "Test error");

      const job = queue.getJob(id);
      expect(job?.status).toBe("pending");
      expect(job?.retryCount).toBe(1);
      expect(job?.error).toBe("Test error");
      expect(job?.lockedUntil).toBeDefined(); // Backoff delay
    });

    it("should mark as failed when max retries exceeded", () => {
      const id = queue.enqueue({
        type: "initial",
        sessionFile: "/path/session.jsonl",
        maxRetries: 0,
      });

      queue.dequeue("worker-1");
      queue.fail(id, "Final error");

      const job = queue.getJob(id);
      expect(job?.status).toBe("failed");
      expect(job?.error).toBe("Final error");
      expect(job?.completedAt).toBeDefined();
    });

    it("should use exponential backoff for retries", () => {
      const id = queue.enqueue({
        type: "initial",
        sessionFile: "/path/session.jsonl",
        maxRetries: 5,
      });

      // Simulate multiple failures
      for (let i = 0; i < 3; i++) {
        queue.dequeue("worker-1");
        queue.fail(id, `Error ${i + 1}`);

        const job = queue.getJob(id);
        expect(job?.retryCount).toBe(i + 1);
      }
    });
  });

  describe("getPendingJobs", () => {
    it("should return all pending jobs", () => {
      queue.enqueue({
        type: "initial",
        sessionFile: "/path/1.jsonl",
      });
      queue.enqueue({
        type: "initial",
        sessionFile: "/path/2.jsonl",
      });
      queue.dequeue("worker-1"); // Make one running

      const pending = queue.getPendingJobs();
      expect(pending).toHaveLength(1);
      expect(pending[0].sessionFile).toBe("/path/2.jsonl");
    });

    it("should filter by session file", () => {
      queue.enqueue({
        type: "initial",
        sessionFile: "/path/a.jsonl",
      });
      queue.enqueue({
        type: "initial",
        sessionFile: "/path/b.jsonl",
      });
      queue.enqueue({
        type: "initial",
        sessionFile: "/path/a.jsonl",
      });

      const pending = queue.getPendingJobs("/path/a.jsonl");
      expect(pending).toHaveLength(2);
    });
  });

  describe("getRunningJobs", () => {
    it("should return all running jobs", () => {
      queue.enqueue({
        type: "initial",
        sessionFile: "/path/1.jsonl",
      });
      queue.enqueue({
        type: "initial",
        sessionFile: "/path/2.jsonl",
      });

      queue.dequeue("worker-1");

      const running = queue.getRunningJobs();
      expect(running).toHaveLength(1);
      expect(running[0].sessionFile).toBe("/path/1.jsonl");
    });
  });

  describe("getFailedJobs", () => {
    it("should return failed jobs", () => {
      const id = queue.enqueue({
        type: "initial",
        sessionFile: "/path/session.jsonl",
        maxRetries: 0,
      });

      queue.dequeue("worker-1");
      queue.fail(id, "Error");

      const failed = queue.getFailedJobs();
      expect(failed).toHaveLength(1);
      expect(failed[0].status).toBe("failed");
    });

    it("should limit results", () => {
      // Create multiple failed jobs
      for (let i = 0; i < 10; i++) {
        const id = queue.enqueue({
          type: "initial",
          sessionFile: `/path/session${i}.jsonl`,
          maxRetries: 0,
        });
        queue.dequeue(`worker-${i}`);
        queue.fail(id, `Error ${i}`);
      }

      const failed = queue.getFailedJobs(5);
      expect(failed).toHaveLength(5);
    });
  });

  describe("hasExistingJob", () => {
    it("should return true if job exists", () => {
      queue.enqueue({
        type: "initial",
        sessionFile: "/path/session.jsonl",
        segmentStart: "abc",
        segmentEnd: "xyz",
      });

      expect(
        queue.hasExistingJob("/path/session.jsonl", "abc", "xyz")
      ).toBeTruthy();
    });

    it("should return false if no job exists", () => {
      expect(
        queue.hasExistingJob("/path/session.jsonl", "abc", "xyz")
      ).toBeFalsy();
    });

    it("should return false for completed jobs", () => {
      const id = queue.enqueue({
        type: "initial",
        sessionFile: "/path/session.jsonl",
        segmentStart: "abc",
        segmentEnd: "xyz",
      });

      queue.dequeue("worker-1");
      queue.complete(id, null as unknown as string);

      expect(
        queue.hasExistingJob("/path/session.jsonl", "abc", "xyz")
      ).toBeFalsy();
    });

    it("should handle null segments", () => {
      queue.enqueue({
        type: "initial",
        sessionFile: "/path/session.jsonl",
      });

      expect(queue.hasExistingJob("/path/session.jsonl")).toBeTruthy();
      expect(queue.hasExistingJob("/path/session.jsonl", "abc")).toBeFalsy();
    });
  });

  describe("retryJob", () => {
    it("should reset a failed job to pending", () => {
      const id = queue.enqueue({
        type: "initial",
        sessionFile: "/path/session.jsonl",
        maxRetries: 0,
      });

      queue.dequeue("worker-1");
      queue.fail(id, "Error");

      expect(queue.retryJob(id)).toBeTruthy();

      const job = queue.getJob(id);
      expect(job?.status).toBe("pending");
      expect(job?.retryCount).toBe(0);
      expect(job?.error).toBeUndefined();
    });

    it("should return false for non-failed jobs", () => {
      const id = queue.enqueue({
        type: "initial",
        sessionFile: "/path/session.jsonl",
      });

      expect(queue.retryJob(id)).toBeFalsy();
    });

    it("should return false for non-existent jobs", () => {
      expect(queue.retryJob("nonexistent")).toBeFalsy();
    });
  });

  describe("cancelJob", () => {
    it("should remove a pending job", () => {
      const id = queue.enqueue({
        type: "initial",
        sessionFile: "/path/session.jsonl",
      });

      expect(queue.cancelJob(id)).toBeTruthy();
      expect(queue.getJob(id)).toBeNull();
    });

    it("should not remove running jobs", () => {
      const id = queue.enqueue({
        type: "initial",
        sessionFile: "/path/session.jsonl",
      });

      queue.dequeue("worker-1");

      expect(queue.cancelJob(id)).toBeFalsy();
      expect(queue.getJob(id)).not.toBeNull();
    });
  });

  describe("cancelJobsForSession", () => {
    it("should remove all pending jobs for a session", () => {
      queue.enqueue({
        type: "initial",
        sessionFile: "/path/session.jsonl",
      });
      queue.enqueue({
        type: "reanalysis",
        sessionFile: "/path/session.jsonl",
      });
      queue.enqueue({
        type: "initial",
        sessionFile: "/path/other.jsonl",
      });

      const count = queue.cancelJobsForSession("/path/session.jsonl");

      expect(count).toBe(2);
      expect(queue.getPendingJobs("/path/session.jsonl")).toHaveLength(0);
      expect(queue.getPendingJobs("/path/other.jsonl")).toHaveLength(1);
    });
  });

  describe("releaseStale", () => {
    it("should release jobs with expired locks", () => {
      // Manually insert a job with an expired lock
      db.prepare(
        `
        INSERT INTO analysis_queue (
          id, type, priority, session_file, status, queued_at,
          started_at, worker_id, locked_until, max_retries
        ) VALUES (
          'stale-job-id12',
          'initial',
          100,
          '/path/stale.jsonl',
          'running',
          datetime('now', '-1 hour'),
          datetime('now', '-1 hour'),
          'worker-dead',
          datetime('now', '-30 minutes'),
          3
        )
      `
      ).run();

      const count = queue.releaseStale();

      expect(count).toBe(1);

      const job = queue.getJob("stale-job-id12");
      expect(job?.status).toBe("pending");
      expect(job?.workerId).toBeUndefined();
    });
  });

  describe("releaseAllRunning", () => {
    it("should release all running jobs regardless of lock expiration", () => {
      // Add a job and make it running (locked in future)
      queue.enqueue({
        type: "initial",
        sessionFile: "/path/running.jsonl",
      });
      queue.dequeue("worker-1");

      // Add another stale job (locked in past)
      db.prepare(
        `
        INSERT INTO analysis_queue (
          id, type, priority, session_file, status, queued_at,
          started_at, worker_id, locked_until, max_retries
        ) VALUES (
          'stale-job-id34',
          'initial',
          100,
          '/path/stale.jsonl',
          'running',
          datetime('now', '-1 hour'),
          datetime('now', '-1 hour'),
          'worker-dead',
          datetime('now', '-30 minutes'),
          3
        )
      `
      ).run();

      const count = queue.releaseAllRunning();

      expect(count).toBe(2);

      const job1 = queue.getJob("stale-job-id34");
      expect(job1?.status).toBe("pending");

      const runningJobs = queue.getRunningJobs();
      expect(runningJobs).toHaveLength(0);
    });
  });

  describe("getStats", () => {
    it("should return queue statistics", () => {
      // First add the completed and failed jobs (they get dequeued immediately)
      const completedId = queue.enqueue({
        type: "initial",
        sessionFile: "/path/completed.jsonl",
      });
      queue.dequeue("worker-c");
      queue.complete(completedId, null as unknown as string);

      const failId = queue.enqueue({
        type: "initial",
        sessionFile: "/path/failed.jsonl",
        maxRetries: 0,
      });
      queue.dequeue("worker-f");
      queue.fail(failId, "Error");

      // Now add pending jobs (these won't be touched)
      queue.enqueue({
        type: "initial",
        sessionFile: "/path/pending1.jsonl",
      });
      queue.enqueue({
        type: "initial",
        sessionFile: "/path/pending2.jsonl",
      });

      const stats = queue.getStats();

      expect(stats.pending).toBe(2);
      expect(stats.running).toBe(0);
      expect(stats.completed).toBe(1);
      expect(stats.failed).toBe(1);
      expect(stats.total).toBe(4);
    });
  });

  describe("getJobCounts", () => {
    it("should return counts by status", () => {
      queue.enqueue({
        type: "initial",
        sessionFile: "/path/session.jsonl",
      });

      const counts = queue.getJobCounts();

      expect(counts.pending).toBe(1);
      expect(counts.running).toBe(0);
      expect(counts.completed).toBe(0);
      expect(counts.failed).toBe(0);
    });
  });

  describe("clearOldCompleted", () => {
    it("should remove old completed jobs", () => {
      // Insert an old completed job manually (without result_node_id to avoid FK constraint)
      db.prepare(
        `
        INSERT INTO analysis_queue (
          id, type, priority, session_file, status, queued_at,
          completed_at, max_retries
        ) VALUES (
          'old-completed12',
          'initial',
          100,
          '/path/old.jsonl',
          'completed',
          datetime('now', '-100 days'),
          datetime('now', '-100 days'),
          3
        )
      `
      ).run();

      // Add a recent completed job
      const id = queue.enqueue({
        type: "initial",
        sessionFile: "/path/recent.jsonl",
      });
      queue.dequeue("worker-1");
      queue.complete(id, null as unknown as string);

      const count = queue.clearOldCompleted(30);

      expect(count).toBe(1);
      expect(queue.getJob("old-completed12")).toBeNull();
      expect(queue.getJob(id)).not.toBeNull();
    });
  });

  describe("clearAll", () => {
    it("should remove all jobs", () => {
      queue.enqueue({
        type: "initial",
        sessionFile: "/path/1.jsonl",
      });
      queue.enqueue({
        type: "initial",
        sessionFile: "/path/2.jsonl",
      });

      const count = queue.clearAll();

      expect(count).toBe(2);
      expect(queue.getStats().total).toBe(0);
    });
  });

  describe("pRIORITY constants", () => {
    it("should have correct ordering", () => {
      expect(PRIORITY.USER_TRIGGERED).toBeLessThan(PRIORITY.FORK);
      expect(PRIORITY.FORK).toBeLessThan(PRIORITY.INITIAL);
      expect(PRIORITY.INITIAL).toBeLessThan(PRIORITY.REANALYSIS);
      expect(PRIORITY.REANALYSIS).toBeLessThan(PRIORITY.CONNECTION);
    });
  });

  describe("concurrency", () => {
    it("should handle concurrent dequeue attempts", () => {
      // Add a single job
      queue.enqueue({
        type: "initial",
        sessionFile: "/path/session.jsonl",
      });

      // Simulate concurrent workers (in practice, this tests the optimistic locking)
      const results: ReturnType<typeof queue.dequeue>[] = [];
      for (let i = 0; i < 10; i++) {
        results.push(queue.dequeue(`worker-${i}`));
      }

      // Only one worker should get the job
      const gotJob = results.filter((r) => r !== null);
      expect(gotJob).toHaveLength(1);
    });
  });
});
