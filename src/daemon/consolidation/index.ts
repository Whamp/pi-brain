/**
 * Memory Consolidation Engine
 *
 * Implements AutoMem-style "Sleep Cycle" processing for the knowledge graph:
 * - Decay: Daily job to lower relevance_score based on age and access patterns
 * - Creative: Weekly job to find non-obvious connections via vector similarity
 * - Cluster: Monthly job to group nodes into meta-patterns (handled by facet-discovery)
 * - Forget: Archive/delete nodes with low relevance
 *
 * @see docs/specs/automem-features.md
 */

export { RelevanceCalculator, type RelevanceFactors } from "./relevance.js";
export {
  type ConsolidationConfig,
  type ConsolidationResult,
  ConsolidationScheduler,
  createConsolidationScheduler,
} from "./decay-scheduler.js";
export {
  CreativeAssociator,
  type CreativeAssociatorConfig,
  type CreativeAssociatorResult,
} from "./creative-associator.js";
