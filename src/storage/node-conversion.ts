/**
 * Node Conversion - Convert AgentNodeOutput to full Node structure
 *
 * This module handles the conversion of raw analyzer output into properly
 * structured Node objects with all source, identity, and metadata fields.
 */

import type { AgentNodeOutput } from "../daemon/processor.js";
import type { AnalysisJob } from "../daemon/queue.js";

import {
  generateDeterministicNodeId,
  type LessonsByLevel,
  type Node,
  type NodeSignals,
} from "./node-types.js";

// =============================================================================
// Types
// =============================================================================

/** Context needed to convert AgentNodeOutput to a full Node */
export interface NodeConversionContext {
  /** The analysis job that produced this output */
  job: AnalysisJob;
  /** Computer hostname */
  computer: string;
  /** Session ID from header */
  sessionId: string;
  /** Parent session path (if forked) */
  parentSession?: string;
  /** Number of entries in the segment */
  entryCount: number;
  /** Analysis duration in milliseconds */
  analysisDurationMs: number;
  /** Prompt version used for analysis */
  analyzerVersion: string;
  /** Existing node (if reanalyzing) */
  existingNode?: Node;
  /** Friction/delight signals detected in the segment */
  signals?: NodeSignals;
}

// =============================================================================
// Conversion Function
// =============================================================================

/**
 * Convert AgentNodeOutput from the analyzer to a full Node structure
 * Fills in source, metadata, and identity fields from the job context
 */
export function agentOutputToNode(
  output: AgentNodeOutput,
  context: NodeConversionContext
): Node {
  const now = new Date().toISOString();

  // Calculate duration from segment timestamps if available
  // For now, use a placeholder - real duration calculation requires parsing session
  const durationMinutes = Math.round(context.analysisDurationMs / 60_000);

  // Calculate total tokens from modelsUsed
  const tokensUsed = output.observations.modelsUsed.reduce(
    (sum, m) => sum + m.tokensInput + m.tokensOutput,
    0
  );

  // Calculate total cost from modelsUsed
  const cost = output.observations.modelsUsed.reduce(
    (sum, m) => sum + m.cost,
    0
  );

  // Identity and versioning
  // For reanalysis, reuse the existing node's ID
  // For initial analysis, use deterministic ID based on session + segment
  // This ensures idempotent ingestion - re-running the same job produces the same ID
  let id: string;
  if (context.existingNode) {
    ({ id } = context.existingNode);
  } else {
    // Generate deterministic ID from session file and segment boundaries
    id = generateDeterministicNodeId(
      context.job.sessionFile,
      context.job.segmentStart ?? "",
      context.job.segmentEnd ?? ""
    );
  }
  const version = (context.existingNode?.version ?? 0) + 1;
  const previousVersions = context.existingNode
    ? [
        ...context.existingNode.previousVersions,
        `${context.existingNode.id}-v${context.existingNode.version}`,
      ]
    : [];

  return {
    id,
    version,
    previousVersions,

    source: {
      sessionFile: context.job.sessionFile,
      segment: {
        startEntryId: context.job.segmentStart ?? "",
        endEntryId: context.job.segmentEnd ?? "",
        entryCount: context.entryCount,
      },
      computer: context.computer,
      sessionId: context.sessionId,
      parentSession: context.parentSession,
    },

    classification: {
      type: output.classification.type as Node["classification"]["type"],
      project: output.classification.project,
      isNewProject: output.classification.isNewProject,
      hadClearGoal: output.classification.hadClearGoal,
      language: output.classification.language,
      frameworks: output.classification.frameworks,
    },

    content: {
      summary: output.content.summary,
      outcome: output.content.outcome,
      keyDecisions: output.content.keyDecisions.map((d) => ({
        what: d.what,
        why: d.why,
        alternativesConsidered: d.alternativesConsidered,
      })),
      filesTouched: output.content.filesTouched,
      toolsUsed: output.content.toolsUsed,
      errorsSeen: output.content.errorsSeen.map((e) => ({
        type: e.type,
        message: e.message,
        resolved: e.resolved,
      })),
    },

    lessons: {
      project: output.lessons.project.map((l) => ({
        level: l.level as LessonsByLevel["project"][0]["level"],
        summary: l.summary,
        details: l.details,
        confidence: l.confidence,
        tags: l.tags,
        actionable: l.actionable,
      })),
      task: output.lessons.task.map((l) => ({
        level: l.level as LessonsByLevel["task"][0]["level"],
        summary: l.summary,
        details: l.details,
        confidence: l.confidence,
        tags: l.tags,
        actionable: l.actionable,
      })),
      user: output.lessons.user.map((l) => ({
        level: l.level as LessonsByLevel["user"][0]["level"],
        summary: l.summary,
        details: l.details,
        confidence: l.confidence,
        tags: l.tags,
        actionable: l.actionable,
      })),
      model: output.lessons.model.map((l) => ({
        level: l.level as LessonsByLevel["model"][0]["level"],
        summary: l.summary,
        details: l.details,
        confidence: l.confidence,
        tags: l.tags,
        actionable: l.actionable,
      })),
      tool: output.lessons.tool.map((l) => ({
        level: l.level as LessonsByLevel["tool"][0]["level"],
        summary: l.summary,
        details: l.details,
        confidence: l.confidence,
        tags: l.tags,
        actionable: l.actionable,
      })),
      skill: output.lessons.skill.map((l) => ({
        level: l.level as LessonsByLevel["skill"][0]["level"],
        summary: l.summary,
        details: l.details,
        confidence: l.confidence,
        tags: l.tags,
        actionable: l.actionable,
      })),
      subagent: output.lessons.subagent.map((l) => ({
        level: l.level as LessonsByLevel["subagent"][0]["level"],
        summary: l.summary,
        details: l.details,
        confidence: l.confidence,
        tags: l.tags,
        actionable: l.actionable,
      })),
    },

    observations: {
      modelsUsed: output.observations.modelsUsed.map((m) => ({
        provider: m.provider,
        model: m.model,
        tokensInput: m.tokensInput,
        tokensOutput: m.tokensOutput,
        cacheRead: m.cacheRead,
        cacheWrite: m.cacheWrite,
        cost: m.cost,
      })),
      promptingWins: output.observations.promptingWins,
      promptingFailures: output.observations.promptingFailures,
      modelQuirks: output.observations.modelQuirks.map((q) => ({
        model: q.model,
        observation: q.observation,
        frequency: q.frequency,
        workaround: q.workaround,
        severity: q.severity,
      })),
      toolUseErrors: output.observations.toolUseErrors.map((e) => ({
        tool: e.tool,
        errorType: e.errorType,
        context: e.context,
        model: e.model,
        wasRetried: e.wasRetried,
      })),
    },

    metadata: {
      tokensUsed,
      cost,
      durationMinutes,
      timestamp: context.job.queuedAt,
      analyzedAt: now,
      analyzerVersion: context.analyzerVersion,
    },

    semantic: {
      tags: output.semantic.tags,
      topics: output.semantic.topics,
      relatedProjects: output.semantic.relatedProjects,
      concepts: output.semantic.concepts,
    },

    daemonMeta: {
      decisions: output.daemonMeta.decisions.map((d) => ({
        timestamp: d.timestamp,
        decision: d.decision,
        reasoning: d.reasoning,
        needsReview: d.needsReview,
      })),
      rlmUsed: output.daemonMeta.rlmUsed,
      codemapAvailable: output.daemonMeta.codemapAvailable,
      analysisLog: output.daemonMeta.analysisLog,
      segmentTokenCount: output.daemonMeta.segmentTokenCount,
    },

    // Include signals if provided in context
    ...(context.signals ? { signals: context.signals } : {}),
  };
}
