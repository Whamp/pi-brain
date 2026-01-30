/**
 * Tests for relationship edge storage
 */

import type Database from "better-sqlite3";

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { RelationshipOutput } from "../daemon/types.js";

import { migrate, openDatabase } from "./database.js";
import { getEdgesFrom } from "./edge-repository.js";
import {
  findUnresolvedRelationships,
  isAutoMemEdgeType,
  resolveRelationship,
  storeRelationshipEdges,
  validateRelationship,
} from "./relationship-edges.js";

describe("relationship-edges", () => {
  let db: Database.Database;
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), "relationship-test-"));
    const dbPath = path.join(testDir, "brain.db");
    db = openDatabase({ path: dbPath });
    migrate(db);

    // Create minimal nodes for edge references
    db.prepare(
      `
      INSERT INTO nodes (id, version, session_file, type, project, outcome, timestamp, analyzed_at, analyzer_version, data_file)
      VALUES ('node-source', 1, '/test/session.jsonl', 'coding', '/project', 'success', '2026-01-28T10:00:00Z', '2026-01-28T10:00:00Z', 'v1', '/test/node.json')
    `
    ).run();

    db.prepare(
      `
      INSERT INTO nodes (id, version, session_file, type, project, outcome, timestamp, analyzed_at, analyzer_version, data_file)
      VALUES ('node-target', 1, '/test/session.jsonl', 'debugging', '/project', 'success', '2026-01-28T11:00:00Z', '2026-01-28T11:00:00Z', 'v1', '/test/node2.json')
    `
    ).run();
  });

  afterEach(() => {
    db.close();
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe("isAutoMemEdgeType", () => {
    it("should return true for valid AutoMem edge types", () => {
      expect(isAutoMemEdgeType("LEADS_TO")).toBeTruthy();
      expect(isAutoMemEdgeType("PREFERS_OVER")).toBeTruthy();
      expect(isAutoMemEdgeType("CONTRADICTS")).toBeTruthy();
      expect(isAutoMemEdgeType("REINFORCES")).toBeTruthy();
      expect(isAutoMemEdgeType("DERIVED_FROM")).toBeTruthy();
      expect(isAutoMemEdgeType("EXEMPLIFIES")).toBeTruthy();
      expect(isAutoMemEdgeType("PART_OF")).toBeTruthy();
      expect(isAutoMemEdgeType("RELATES_TO")).toBeTruthy();
      expect(isAutoMemEdgeType("OCCURRED_BEFORE")).toBeTruthy();
      expect(isAutoMemEdgeType("INVALIDATED_BY")).toBeTruthy();
      expect(isAutoMemEdgeType("EVOLVED_INTO")).toBeTruthy();
    });

    it("should return false for structural edge types", () => {
      expect(isAutoMemEdgeType("fork")).toBeFalsy();
      expect(isAutoMemEdgeType("branch")).toBeFalsy();
      expect(isAutoMemEdgeType("continuation")).toBeFalsy();
    });

    it("should return false for invalid types", () => {
      expect(isAutoMemEdgeType("INVALID_TYPE")).toBeFalsy();
      expect(isAutoMemEdgeType("")).toBeFalsy();
    });
  });

  describe("validateRelationship", () => {
    it("should accept valid relationship", () => {
      const rel: RelationshipOutput = {
        targetNodeId: "node-target",
        targetDescription: "Target node description",
        type: "LEADS_TO",
        confidence: 0.8,
        reason: "This causes that",
      };

      expect(validateRelationship(rel)).toStrictEqual({ valid: true });
    });

    it("should accept relationship with null targetNodeId but valid description", () => {
      const rel: RelationshipOutput = {
        targetNodeId: null,
        targetDescription: "Some earlier decision",
        type: "DERIVED_FROM",
        confidence: 0.7,
        reason: "Based on prior work",
      };

      expect(validateRelationship(rel)).toStrictEqual({ valid: true });
    });

    it("should reject invalid type", () => {
      const rel: RelationshipOutput = {
        targetNodeId: "node-target",
        targetDescription: "Target",
        type: "INVALID" as RelationshipOutput["type"],
        confidence: 0.8,
        reason: "Some reason",
      };

      const result = validateRelationship(rel);
      expect(result.valid).toBeFalsy();
      expect(result).toHaveProperty("error");
      expect((result as { valid: false; error: string }).error).toContain(
        "Invalid relationship type"
      );
    });

    it("should reject confidence out of range", () => {
      const rel: RelationshipOutput = {
        targetNodeId: "node-target",
        targetDescription: "Target",
        type: "LEADS_TO",
        confidence: 1.5,
        reason: "Some reason",
      };

      const result = validateRelationship(rel);
      expect(result.valid).toBeFalsy();
      expect(result).toHaveProperty("error");
      expect((result as { valid: false; error: string }).error).toContain(
        "Confidence must be 0.0-1.0"
      );
    });

    it("should reject missing target info", () => {
      const rel: RelationshipOutput = {
        targetNodeId: null,
        targetDescription: "",
        type: "LEADS_TO",
        confidence: 0.8,
        reason: "Some reason",
      };

      const result = validateRelationship(rel);
      expect(result.valid).toBeFalsy();
      expect(result).toHaveProperty("error");
      expect((result as { valid: false; error: string }).error).toContain(
        "targetNodeId or targetDescription"
      );
    });

    it("should reject empty reason", () => {
      const rel: RelationshipOutput = {
        targetNodeId: "node-target",
        targetDescription: "Target",
        type: "LEADS_TO",
        confidence: 0.8,
        reason: "   ",
      };

      const result = validateRelationship(rel);
      expect(result.valid).toBeFalsy();
      expect(result).toHaveProperty("error");
      expect((result as { valid: false; error: string }).error).toContain(
        "must have a reason"
      );
    });
  });

  describe("storeRelationshipEdges", () => {
    it("should store resolved relationships as edges", () => {
      const relationships: RelationshipOutput[] = [
        {
          targetNodeId: "node-target",
          targetDescription: "Target node",
          type: "LEADS_TO",
          confidence: 0.9,
          reason: "Direct causation",
        },
      ];

      const result = storeRelationshipEdges(db, "node-source", relationships);

      expect(result.resolvedCount).toBe(1);
      expect(result.unresolvedCount).toBe(0);
      expect(result.edgesCreated).toBe(1);
      expect(result.errors).toHaveLength(0);

      // Verify edge was created
      const edges = getEdgesFrom(db, "node-source");
      expect(edges).toHaveLength(1);
      expect(edges[0].type).toBe("LEADS_TO");
      expect(edges[0].target_node_id).toBe("node-target");
      expect(edges[0].confidence).toBe(0.9);
    });

    it("should store unresolved relationships with placeholder target", () => {
      const relationships: RelationshipOutput[] = [
        {
          targetNodeId: null,
          targetDescription: "Earlier API design discussion",
          type: "DERIVED_FROM",
          confidence: 0.7,
          reason: "Implementation follows earlier patterns",
        },
      ];

      const result = storeRelationshipEdges(db, "node-source", relationships);

      expect(result.resolvedCount).toBe(0);
      expect(result.unresolvedCount).toBe(1);
      expect(result.edgesCreated).toBe(1);

      // Verify edge was created with placeholder (source == target)
      const edges = getEdgesFrom(db, "node-source");
      expect(edges).toHaveLength(1);
      expect(edges[0].source_node_id).toBe("node-source");
      expect(edges[0].target_node_id).toBe("node-source"); // Placeholder

      // Verify metadata contains unresolved target
      const metadata = JSON.parse(edges[0].metadata ?? "{}");
      expect(metadata.unresolvedTarget).toBe("Earlier API design discussion");
      expect(metadata.reason).toBe("Implementation follows earlier patterns");
    });

    it("should handle mixed resolved and unresolved relationships", () => {
      const relationships: RelationshipOutput[] = [
        {
          targetNodeId: "node-target",
          targetDescription: "Target node",
          type: "LEADS_TO",
          confidence: 0.9,
          reason: "Direct link",
        },
        {
          targetNodeId: null,
          targetDescription: "Some other decision",
          type: "PREFERS_OVER",
          confidence: 0.6,
          reason: "Chose A over B",
        },
      ];

      const result = storeRelationshipEdges(db, "node-source", relationships);

      expect(result.resolvedCount).toBe(1);
      expect(result.unresolvedCount).toBe(1);
      expect(result.edgesCreated).toBe(2);
    });

    it("should return empty result for empty relationships", () => {
      const result = storeRelationshipEdges(db, "node-source", []);

      expect(result.resolvedCount).toBe(0);
      expect(result.unresolvedCount).toBe(0);
      expect(result.edgesCreated).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it("should collect validation errors", () => {
      const relationships: RelationshipOutput[] = [
        {
          targetNodeId: null,
          targetDescription: "",
          type: "LEADS_TO",
          confidence: 0.9,
          reason: "Missing description",
        },
        {
          targetNodeId: "node-target",
          targetDescription: "Target",
          type: "LEADS_TO",
          confidence: 0.8,
          reason: "Valid one",
        },
      ];

      const result = storeRelationshipEdges(db, "node-source", relationships);

      expect(result.errors).toHaveLength(1);
      expect(result.edgesCreated).toBe(1); // Only the valid one
    });
  });

  describe("findUnresolvedRelationships", () => {
    it("should find unresolved relationships for a node", () => {
      // Store an unresolved relationship
      storeRelationshipEdges(db, "node-source", [
        {
          targetNodeId: null,
          targetDescription: "Earlier work on auth",
          type: "DERIVED_FROM",
          confidence: 0.7,
          reason: "Based on prior implementation",
        },
      ]);

      const unresolved = findUnresolvedRelationships(db, "node-source");

      expect(unresolved).toHaveLength(1);
      expect(unresolved[0].sourceNodeId).toBe("node-source");
      expect(unresolved[0].type).toBe("DERIVED_FROM");
      expect(unresolved[0].targetDescription).toBe("Earlier work on auth");
      expect(unresolved[0].reason).toBe("Based on prior implementation");
    });

    it("should find all unresolved relationships when no nodeId given", () => {
      // Store unresolved relationships for two nodes
      storeRelationshipEdges(db, "node-source", [
        {
          targetNodeId: null,
          targetDescription: "Something",
          type: "LEADS_TO",
          confidence: 0.8,
          reason: "Reason 1",
        },
      ]);

      storeRelationshipEdges(db, "node-target", [
        {
          targetNodeId: null,
          targetDescription: "Something else",
          type: "PREFERS_OVER",
          confidence: 0.6,
          reason: "Reason 2",
        },
      ]);

      const unresolved = findUnresolvedRelationships(db);

      expect(unresolved).toHaveLength(2);
    });

    it("should not return resolved relationships", () => {
      // Store a resolved relationship
      storeRelationshipEdges(db, "node-source", [
        {
          targetNodeId: "node-target",
          targetDescription: "Target node",
          type: "LEADS_TO",
          confidence: 0.9,
          reason: "Direct link",
        },
      ]);

      const unresolved = findUnresolvedRelationships(db, "node-source");

      expect(unresolved).toHaveLength(0);
    });
  });

  describe("resolveRelationship", () => {
    it("should update target node and mark as resolved", () => {
      // Store an unresolved relationship
      storeRelationshipEdges(db, "node-source", [
        {
          targetNodeId: null,
          targetDescription: "Earlier auth work",
          type: "DERIVED_FROM",
          confidence: 0.7,
          reason: "Based on prior implementation",
        },
      ]);

      // Find the unresolved edge
      const unresolved = findUnresolvedRelationships(db, "node-source");
      expect(unresolved).toHaveLength(1);

      // Resolve it
      const success = resolveRelationship(
        db,
        unresolved[0].edgeId,
        "node-target"
      );
      expect(success).toBeTruthy();

      // Verify the edge is updated
      const edges = getEdgesFrom(db, "node-source");
      expect(edges).toHaveLength(1);
      expect(edges[0].target_node_id).toBe("node-target");

      // Verify metadata is updated
      const metadata = JSON.parse(edges[0].metadata ?? "{}");
      expect(metadata.unresolvedTarget).toBeUndefined();
      expect(metadata.resolvedFrom).toBe("Earlier auth work");
      expect(metadata.resolvedAt).toBeDefined();

      // Verify no more unresolved relationships
      const stillUnresolved = findUnresolvedRelationships(db, "node-source");
      expect(stillUnresolved).toHaveLength(0);
    });

    it("should return false for non-existent edge", () => {
      const success = resolveRelationship(
        db,
        "non-existent-edge",
        "node-target"
      );
      expect(success).toBeFalsy();
    });
  });
});
