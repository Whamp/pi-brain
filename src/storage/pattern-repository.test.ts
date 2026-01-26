import { describe, expect, it } from "vitest";

import { openDatabase } from "./database.js";
import {
  listFailurePatterns,
  listLessonPatterns,
  listModelStats,
} from "./pattern-repository.js";

describe("pattern-repository", () => {
  it("should list failure patterns", () => {
    const db = openDatabase({ path: ":memory:", migrate: true });

    // Insert test data
    db.prepare(`
      INSERT INTO failure_patterns (
        id, pattern, occurrences, models, tools, example_nodes, last_seen, learning_opportunity
      ) VALUES 
      ('p1', 'Error 1', 5, '["gpt-4"]', '["tool1"]', '["n1"]', '2023-01-01', 'Learn this'),
      ('p2', 'Error 2', 2, '["claude"]', '["tool2"]', '["n2"]', '2023-01-02', 'Learn that')
    `).run();

    const patterns = listFailurePatterns(db);
    expect(patterns).toHaveLength(2);
    expect(patterns[0].id).toBe("p1"); // Higher occurrences first
    expect(patterns[0].models).toStrictEqual(["gpt-4"]);
    expect(patterns[1].id).toBe("p2");

    // Test filtering
    const rarePatterns = listFailurePatterns(db, { minOccurrences: 3 });
    expect(rarePatterns).toHaveLength(1);
    expect(rarePatterns[0].id).toBe("p1");
  });

  it("should list model stats", () => {
    const db = openDatabase({ path: ":memory:", migrate: true });

    // Insert test data
    db.prepare(`
      INSERT INTO model_stats (
        model, total_tokens, total_cost, total_sessions, quirk_count, error_count, last_used
      ) VALUES 
      ('gpt-4', 1000, 0.03, 5, 2, 1, '2023-01-02'),
      ('claude', 500, 0.01, 2, 0, 0, '2023-01-01')
    `).run();

    const stats = listModelStats(db);
    expect(stats).toHaveLength(2);
    expect(stats[0].model).toBe("gpt-4"); // Last used more recently
    expect(stats[0].totalTokens).toBe(1000);
    expect(stats[1].model).toBe("claude");
  });

  it("should list lesson patterns", () => {
    const db = openDatabase({ path: ":memory:", migrate: true });

    // Insert test data
    db.prepare(`
      INSERT INTO lesson_patterns (
        id, level, pattern, occurrences, tags, example_nodes, last_seen
      ) VALUES 
      ('l1', 'project', 'Lesson 1', 3, '["tag1"]', '["n1"]', '2023-01-01'),
      ('l2', 'user', 'Lesson 2', 1, '["tag2"]', '["n2"]', '2023-01-02')
    `).run();

    const patterns = listLessonPatterns(db);
    expect(patterns).toHaveLength(2);
    expect(patterns[0].id).toBe("l1"); // Higher occurrences first

    // Test filtering
    const projectPatterns = listLessonPatterns(db, { level: "project" });
    expect(projectPatterns).toHaveLength(1);
    expect(projectPatterns[0].id).toBe("l1");
  });
});
