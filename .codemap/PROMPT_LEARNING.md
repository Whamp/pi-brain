# Project Overview

## Languages
- typescript: 14 files

## Statistics
- Total files: 14
- Total symbols: 80
  - function: 62
  - interface: 12
  - variable: 3
  - type: 2
  - class: 1

---

src/daemon/insight-aggregation.ts [1-553]
  class:
    149-552: class InsightAggregator [exported]
      refs in: 11 [import: 2, instantiate: 8, type: 1]
        - src/daemon/insight-aggregation.test.ts:14: import (module)
        - src/daemon/insight-aggregation.test.ts:185: instantiate aggregator
        - src/daemon/insight-aggregation.test.ts:236: instantiate aggregator
        - src/daemon/insight-aggregation.test.ts:272: instantiate aggregator
        - src/daemon/insight-aggregation.test.ts:384: instantiate aggregator
        - src/daemon/insight-aggregation.test.ts:472: instantiate aggregator
        - src/daemon/insight-aggregation.test.ts:492: instantiate aggregator
        - src/daemon/insight-aggregation.test.ts:552: instantiate aggregator
        - src/daemon/scheduler.ts:25: import (module)
        - src/daemon/scheduler.ts:141: type Scheduler.insightAggregator
  imports:
    - ../storage/node-storage.js
    - ../types/index.js
    - better-sqlite3
    - node:crypto

src/prompt/agents-generator.test.ts [1-242]
  imports:
    - ./agents-generator.js
    - ./prompt-generator.js
    - vitest

src/prompt/agents-generator.ts [1-649]
  interface:
    31-52: interface AgentsGeneratorConfig [exported]
      /** Configuration for AGENTS.md generation */
      refs in: 4 [type: 4]
        - src/prompt/agents-generator.ts:132: type gatherModelData
        - src/prompt/agents-generator.ts:361: type synthesizeWithLLM
        - src/prompt/agents-generator.ts:503: type generateAgentsForModel
        - src/prompt/agents-generator.ts:594: type previewAgentsForModel
    57-76: interface AgentsGeneratorResult [exported]
      /** Result of AGENTS.md generation */
      refs in: 2 [type: 2]
        - src/prompt/agents-generator.ts:504: type generateAgentsForModel
        - src/prompt/agents-generator.ts:595: type previewAgentsForModel
    81-90: interface ModelInsightData [exported]
      /** Data gathered for a model's AGENTS.md */
      refs in: 10 [import: 1, type: 9]
        - src/prompt/agents-generator.test.ts:10: import (module)
        - src/prompt/agents-generator.test.ts:17: type data
        - src/prompt/agents-generator.test.ts:85: type data
        - src/prompt/agents-generator.test.ts:105: type data
        - src/prompt/agents-generator.test.ts:142: type data
        - src/prompt/agents-generator.test.ts:194: type data
        - src/prompt/agents-generator.ts:133: type gatherModelData
        - src/prompt/agents-generator.ts:231: type formatDataForPrompt
        - src/prompt/agents-generator.ts:304: type generateFallbackAgents
        - src/prompt/agents-generator.ts:360: type synthesizeWithLLM
  function:
    129-189: gatherModelData(db: Database.Database, model: string, config: AgentsGeneratorConfig = {}): ModelInsightData [exported]
      /** Gather all insights and clusters for a specific model */
      refs in: 5 [call: 4, import: 1]
        - src/api/routes/agents.ts:15: import (module)
        - src/api/routes/agents.ts:55: call data
        - src/api/routes/agents.ts:190: call data
        - src/prompt/agents-generator.ts:509: call data
        - src/prompt/agents-generator.ts:598: call data
    231-298: formatDataForPrompt(data: ModelInsightData): string [exported]
      /** Format model data into a structured prompt for LLM synthesis */
      refs in: 7 [call: 5, import: 2]
        - src/api/routes/agents.ts:16: import (module)
        - src/api/routes/agents.ts:199: call promptContent
        - src/prompt/agents-generator.test.ts:8: import (module)
        - src/prompt/agents-generator.test.ts:72: call result
        - src/prompt/agents-generator.test.ts:96: call result
        - src/prompt/agents-generator.test.ts:131: call result
        - src/prompt/agents-generator.ts:376: call userPrompt
    304-354: generateFallbackAgents(data: ModelInsightData): string [exported]
      /** Generate a fallback AGENTS.md without LLM synthesis Used when LLM is not available or synthesis fails */
      refs in: 5 [call: 4, import: 1]
        - src/prompt/agents-generator.test.ts:9: import (module)
        - src/prompt/agents-generator.test.ts:181: call result
        - src/prompt/agents-generator.test.ts:220: call result
        - src/prompt/agents-generator.ts:536: call generateAgentsForModel
        - src/prompt/agents-generator.ts:625: call previewAgentsForModel
    359-388: async synthesizeWithLLM(data: ModelInsightData, config: AgentsGeneratorConfig = {}): Promise<string> [exported]
      /** Use LLM to synthesize model data into coherent AGENTS.md content */
      refs in: 2 [call: 2]
        - src/prompt/agents-generator.ts:531: call generateAgentsForModel
        - src/prompt/agents-generator.ts:620: call previewAgentsForModel
    500-571: async generateAgentsForModel(db: Database.Database, model: string, config: AgentsGeneratorConfig = {}): Promise<AgentsGeneratorResult> [exported]
      /** Generate AGENTS.md for a specific model */
      refs in: 4 [call: 2, import: 2]
        - src/api/routes/agents.ts:12: import (module)
        - src/api/routes/agents.ts:155: call result
        - src/cli.ts:40: import (module)
        - src/cli.ts:961: call result
    576-586: listModelsWithInsights(db: Database.Database): {} [exported]
      /** List all models that have insights in the database */
      refs in: 4 [call: 2, import: 2]
        - src/api/routes/agents.ts:13: import (module)
        - src/api/routes/agents.ts:31: call models
        - src/cli.ts:41: import (module)
        - src/cli.ts:909: call models
    591-648: async previewAgentsForModel(db: Database.Database, model: string, config: AgentsGeneratorConfig = {}): Promise<AgentsGeneratorResult> [exported]
      /** Preview AGENTS.md generation without saving */
      refs in: 4 [call: 2, import: 2]
        - src/api/routes/agents.ts:14: import (module)
        - src/api/routes/agents.ts:109: call result
        - src/cli.ts:42: import (module)
        - src/cli.ts:1022: call result
  imports:
    - ../storage/pattern-repository.js
    - ../types/index.js
    - ./prompt-generator.js
    - better-sqlite3
    - node:child_process
    - node:fs/promises
    - node:os
    - node:path

src/prompt/effectiveness.test.ts [1-1136]
  imports:
    - ../storage/database.js
    - ../storage/node-storage.js
    - ../types/index.js
    - ./effectiveness.js
    - better-sqlite3
    - vitest

src/prompt/effectiveness.ts [1-881]
  interface:
    32-38: interface MeasureEffectivenessOptions [exported]
      refs in: 2 [type: 2]
        - src/prompt/effectiveness.ts:404: type measureEffectiveness
        - src/prompt/effectiveness.ts:462: type measureAndStoreEffectiveness
  function:
    92-104: countSessions(db: Database.Database, dateRange: DateRange): number [exported]
      /** Count unique sessions within a date range */
      refs in: 5 [call: 4, import: 1]
        - src/prompt/effectiveness.test.ts:17: import (module)
        - src/prompt/effectiveness.test.ts:158: call count
        - src/prompt/effectiveness.test.ts:170: call count
        - src/prompt/effectiveness.ts:416: call beforeSessions
        - src/prompt/effectiveness.ts:421: call afterSessions
    109-121: countNodes(db: Database.Database, dateRange: DateRange): number [exported]
      /** Count nodes analyzed within a date range */
      refs in: 2 [call: 1, import: 1]
        - src/prompt/effectiveness.test.ts:15: import (module)
        - src/prompt/effectiveness.test.ts:190: call count
    295-320: countOccurrences(db: Database.Database, insight: AggregatedInsight, dateRange: DateRange): number [exported]
      /** Count occurrences of an insight pattern within a date range */
      refs in: 9 [call: 8, import: 1]
        - src/prompt/effectiveness.test.ts:16: import (module)
        - src/prompt/effectiveness.test.ts:252: call count
        - src/prompt/effectiveness.test.ts:284: call count
        - src/prompt/effectiveness.test.ts:342: call count
        - src/prompt/effectiveness.test.ts:382: call count
        - src/prompt/effectiveness.test.ts:426: call count
        - src/prompt/effectiveness.test.ts:466: call count
        - src/prompt/effectiveness.ts:415: call beforeCount
        - src/prompt/effectiveness.ts:420: call afterCount
    326-342: calculateAverageSeverity(insight: AggregatedInsight): number [exported]
      /** Calculate average severity for occurrences within a date range. Returns a value between 0.0 and 1.0. */
      refs in: 6 [call: 5, import: 1]
        - src/prompt/effectiveness.test.ts:14: import (module)
        - src/prompt/effectiveness.test.ts:492: call (module)
        - src/prompt/effectiveness.test.ts:510: call (module)
        - src/prompt/effectiveness.test.ts:528: call (module)
        - src/prompt/effectiveness.ts:481: call beforeSeverity
        - src/prompt/effectiveness.ts:482: call afterSeverity
    350-387: isStatisticallySignificant(beforeCount: number, afterCount: number, beforeSessions: number, afterSessions: number, minSessions: number = DEFAULT_MIN_SESSIONS): boolean [exported]
      /** Simplified chi-square test for statistical significance. Tests whether the difference between before and after rates is statistically significant at p < 0.05. */
      refs in: 7 [call: 6, import: 1]
        - src/prompt/effectiveness.test.ts:21: import (module)
        - src/prompt/effectiveness.test.ts:538: call result
        - src/prompt/effectiveness.test.ts:543: call result
        - src/prompt/effectiveness.test.ts:548: call result
        - src/prompt/effectiveness.test.ts:554: call result
        - src/prompt/effectiveness.test.ts:560: call result
        - src/prompt/effectiveness.ts:432: call significant
    399-451: measureEffectiveness(db: Database.Database, insightId: string, beforePeriod: DateRange, afterPeriod: DateRange, options: MeasureEffectivenessOptions = {}): EffectivenessResult [exported]
      /** Measure the effectiveness of a prompt addition for a specific insight. Compares occurrence rates before and after the prompt was added to determine if it actually helped reduce the targeted behavior. */
      refs in: 6 [call: 5, import: 1]
        - src/prompt/effectiveness.test.ts:23: import (module)
        - src/prompt/effectiveness.test.ts:581: call (module)
        - src/prompt/effectiveness.test.ts:610: call result
        - src/prompt/effectiveness.test.ts:647: call result
        - src/prompt/effectiveness.test.ts:676: call result
        - src/prompt/effectiveness.ts:469: call result
    456-621: measureAndStoreEffectiveness(db: Database.Database, insightId: string, beforePeriod: DateRange, afterPeriod: DateRange, promptVersion: string, options: MeasureEffectivenessOptions = {}): PromptEffectiveness [exported]
      /** Measure effectiveness and store the result in the database */
      refs in: 9 [call: 6, import: 3]
        - src/cli.ts:46: import (module)
        - src/cli.ts:748: call result
        - src/daemon/scheduler.ts:21: import (module)
        - src/daemon/scheduler.ts:605: call Scheduler.runPatternAggregation
        - src/prompt/effectiveness.test.ts:22: import (module)
        - src/prompt/effectiveness.test.ts:711: call result
        - src/prompt/effectiveness.test.ts:752: call result1
        - src/prompt/effectiveness.test.ts:761: call result2
        - src/prompt/effectiveness.test.ts:954: call (module)
    626-640: getEffectivenessHistory(db: Database.Database, insightId: string): {} [exported]
      /** Get effectiveness measurements for an insight */
      refs in: 5 [call: 3, import: 2]
        - src/api/routes/prompt-learning.ts:8: import (module)
        - src/api/routes/prompt-learning.ts:95: call history
        - src/prompt/effectiveness.test.ts:18: import (module)
        - src/prompt/effectiveness.test.ts:791: call history
        - src/prompt/effectiveness.test.ts:842: call history
    645-663: getLatestEffectiveness(db: Database.Database, insightId: string): any [exported]
      /** Get the latest effectiveness measurement for an insight */
      refs in: 3 [call: 2, import: 1]
        - src/prompt/effectiveness.test.ts:20: import (module)
        - src/prompt/effectiveness.test.ts:857: call result
        - src/prompt/effectiveness.test.ts:907: call result
    669-699: getLatestEffectivenessBatch(db: Database.Database, insightIds: string[]): Map<string, PromptEffectiveness> [exported]
      /** Get the latest effectiveness measurements for multiple insights in a single query. Returns a map of insightId -> PromptEffectiveness. */
      refs in: 2 [call: 1, import: 1]
        - src/api/routes/prompt-learning.ts:9: import (module)
        - src/api/routes/prompt-learning.ts:60: call effectivenessMap
    705-731: getInsightsNeedingMeasurement(db: Database.Database, measureAfterDays = 7): {} [exported]
      /** Get all insights that need effectiveness measurement. Returns insights that are included in prompts but haven't been measured recently. */
      refs in: 6 [call: 4, import: 2]
        - src/daemon/scheduler.ts:20: import (module)
        - src/daemon/scheduler.ts:574: call Scheduler.needingMeasurement
        - src/prompt/effectiveness.test.ts:19: import (module)
        - src/prompt/effectiveness.test.ts:933: call needing
        - src/prompt/effectiveness.test.ts:957: call needing
        - src/prompt/effectiveness.test.ts:996: call needing
    737-792: autoDisableIneffectiveInsights(db: Database.Database, options: {
    threshold?: number; // Improvement % threshold (e.g. -10)
    minSessions?: number;
  } = {}): {} [exported]
      /** Auto-disable insights that have been measured as ineffective. Returns the IDs of disabled insights. */
      refs in: 9 [call: 6, import: 3]
        - src/cli.ts:45: import (module)
        - src/cli.ts:767: call disabled
        - src/daemon/scheduler.ts:19: import (module)
        - src/daemon/scheduler.ts:621: call Scheduler.disabled
        - src/prompt/effectiveness.test.ts:13: import (module)
        - src/prompt/effectiveness.test.ts:1035: call disabled
        - src/prompt/effectiveness.test.ts:1068: call disabled
        - src/prompt/effectiveness.test.ts:1099: call disabled
        - src/prompt/effectiveness.test.ts:1126: call disabled
  imports:
    - ../storage/node-storage.js
    - ../storage/pattern-repository.js
    - ../types/index.js
    - better-sqlite3
    - node:crypto

src/prompt/index.ts [1-13]
  imports:
    - ./agents-generator.js
    - ./effectiveness.js
    - ./prompt-generator.js
    - ./prompt-injector.js
    - ./prompt.js
    - ./types.js

src/prompt/prompt-generator.test.ts [1-685]
  imports:
    - ../storage/database.js
    - ../types/index.js
    - ./prompt-generator.js
    - better-sqlite3
    - vitest

src/prompt/prompt-generator.ts [1-360]
  interface:
    25-36: interface GeneratePromptOptions [exported]
      refs in: 5 [type: 5]
        - src/prompt/prompt-generator.ts:106: type filterActionableInsights
        - src/prompt/prompt-generator.ts:137: type formatModelSection
        - src/prompt/prompt-generator.ts:209: type generatePromptAdditions
        - src/prompt/prompt-generator.ts:255: type generatePromptAdditionsFromDb
        - src/prompt/prompt-generator.ts:340: type getPromptAdditionsForModel
  function:
    55-74: getModelDisplayName(model: string): string [exported]
      /** Get a human-readable model name from provider/model format */
      refs in: 15 [call: 11, import: 4]
        - src/prompt/agents-generator.test.ts:12: import (module)
        - src/prompt/agents-generator.test.ts:230: call (module)
        - src/prompt/agents-generator.test.ts:231: call (module)
        - src/prompt/agents-generator.test.ts:234: call (module)
        - src/prompt/agents-generator.test.ts:238: call (module)
        - src/prompt/agents-generator.ts:22: import (module)
        - src/prompt/agents-generator.ts:181: call gatherModelData
        - src/prompt/prompt-generator.test.ts:17: import (module)
        - src/prompt/prompt-generator.test.ts:54: call (module)
        - src/prompt/prompt-generator.test.ts:60: call (module)
    79-99: groupInsightsByModel(insights: AggregatedInsight[]): Map<string, {}> [exported]
      /** Group insights by model */
      refs in: 5 [call: 4, import: 1]
        - src/prompt/prompt-generator.test.ts:19: import (module)
        - src/prompt/prompt-generator.test.ts:86: call grouped
        - src/prompt/prompt-generator.test.ts:99: call grouped
        - src/prompt/prompt-generator.test.ts:106: call grouped
        - src/prompt/prompt-generator.ts:217: call byModel
    104-129: filterActionableInsights(insights: AggregatedInsight[], options: GeneratePromptOptions = {}): {} [exported]
      /** Filter insights to actionable ones */
      refs in: 7 [call: 6, import: 1]
        - src/prompt/prompt-generator.test.ts:12: import (module)
        - src/prompt/prompt-generator.test.ts:122: call filtered
        - src/prompt/prompt-generator.test.ts:134: call filtered
        - src/prompt/prompt-generator.test.ts:150: call filtered
        - src/prompt/prompt-generator.test.ts:164: call filtered
        - src/prompt/prompt-generator.test.ts:176: call filtered
        - src/prompt/prompt-generator.ts:214: call actionable
    134-198: formatModelSection(model: string, insights: AggregatedInsight[], options: GeneratePromptOptions = {}): string [exported]
      /** Format a model-specific prompt section */
      refs in: 8 [call: 7, import: 1]
        - src/prompt/prompt-generator.test.ts:13: import (module)
        - src/prompt/prompt-generator.test.ts:197: call section
        - src/prompt/prompt-generator.test.ts:212: call section
        - src/prompt/prompt-generator.test.ts:229: call section
        - src/prompt/prompt-generator.test.ts:246: call section
        - src/prompt/prompt-generator.test.ts:258: call section
        - src/prompt/prompt-generator.test.ts:279: call section
        - src/prompt/prompt-generator.ts:226: call content
    207-246: generatePromptAdditions(insights: AggregatedInsight[], options: GeneratePromptOptions = {}): {} [exported]
      /** Generate prompt additions for all models with insights */
      refs in: 10 [call: 9, import: 1]
        - src/prompt/prompt-generator.test.ts:15: import (module)
        - src/prompt/prompt-generator.test.ts:308: call additions
        - src/prompt/prompt-generator.test.ts:326: call additions
        - src/prompt/prompt-generator.test.ts:340: call additions
        - src/prompt/prompt-generator.test.ts:351: call additions
        - src/prompt/prompt-generator.test.ts:373: call additions
        - src/prompt/prompt-generator.test.ts:391: call (module)
        - src/prompt/prompt-generator.test.ts:394: call additions
        - src/prompt/prompt-generator.ts:269: call generatePromptAdditionsFromDb
        - src/prompt/prompt-generator.ts:355: call additions
    253-270: generatePromptAdditionsFromDb(db: Database.Database, options: GeneratePromptOptions = {}): {} [exported]
      /** Generate prompt additions from the database Fetches insights from aggregated_insights table and generates additions. */
      refs in: 9 [call: 6, import: 3]
        - src/cli.ts:49: import (module)
        - src/cli.ts:553: call additions
        - src/prompt/prompt-generator.test.ts:16: import (module)
        - src/prompt/prompt-generator.test.ts:516: call additions
        - src/prompt/prompt-generator.test.ts:533: call additions
        - src/prompt/prompt-generator.test.ts:548: call additions
        - src/prompt/prompt-injector.ts:20: import (module)
        - src/prompt/prompt-injector.ts:142: call additions
        - src/prompt/prompt-injector.ts:249: call additions
    277-300: formatPromptAdditionsDocument(additions: PromptAddition[]): string [exported]
      /** Format a complete prompt additions document Combines all model-specific additions into a single markdown document. */
      refs in: 9 [call: 6, import: 3]
        - src/cli.ts:50: import (module)
        - src/cli.ts:566: call (module)
        - src/prompt/prompt-generator.test.ts:14: import (module)
        - src/prompt/prompt-generator.test.ts:418: call doc
        - src/prompt/prompt-generator.test.ts:446: call doc
        - src/prompt/prompt-generator.test.ts:455: call doc
        - src/prompt/prompt-injector.ts:21: import (module)
        - src/prompt/prompt-injector.ts:116: call content
        - src/prompt/prompt-injector.ts:221: call formatAgentsSection
    308-332: updateInsightPromptTexts(db: Database.Database, additions: PromptAddition[], promptVersion?: string): void [exported]
      /** Generate and store prompt text for insights For each insight that should be included in prompts, generates the appropriate prompt text and updates the database. */
      refs in: 2 [call: 1, import: 1]
        - src/prompt/prompt-generator.test.ts:20: import (module)
        - src/prompt/prompt-generator.test.ts:661: call (module)
    337-359: getPromptAdditionsForModel(db: Database.Database, model: string, options: GeneratePromptOptions = {}): any [exported]
      /** Get prompt additions for a specific model */
      refs in: 7 [call: 4, import: 3]
        - src/cli.ts:51: import (module)
        - src/cli.ts:533: call addition
        - src/prompt/prompt-generator.test.ts:18: import (module)
        - src/prompt/prompt-generator.test.ts:603: call addition
        - src/prompt/prompt-generator.test.ts:620: call addition
        - src/prompt/prompt-injector.ts:22: import (module)
        - src/prompt/prompt-injector.ts:197: call addition
  imports:
    - ../storage/pattern-repository.js
    - ../types/index.js
    - better-sqlite3

src/prompt/prompt-injector.test.ts [1-554]
  imports:
    - ../types/index.js
    - ./prompt-injector.js
    - better-sqlite3
    - node:fs
    - node:os
    - node:path
    - vitest

src/prompt/prompt-injector.ts [1-445]
  interface:
    33-46: interface PromptInjectionConfig [exported]
      refs in: 7 [type: 7]
        - src/prompt/prompt-injector.ts:133: type writeBrainInsightsSkill
        - src/prompt/prompt-injector.ts:190: type generateModelSkill
        - src/prompt/prompt-injector.ts:232: type updateAgentsFile
        - src/prompt/prompt-injector.ts:302: type removeFromAgentsFile
        - src/prompt/prompt-injector.ts:347: type injectInsights
        - src/prompt/prompt-injector.ts:371: type removeInjectedInsights
        - src/prompt/prompt-injector.ts:412: type getInjectionStatus
    48-57: interface InjectionResult [exported]
      refs in: 5 [type: 5]
        - src/prompt/prompt-injector.ts:134: type writeBrainInsightsSkill
        - src/prompt/prompt-injector.ts:233: type updateAgentsFile
        - src/prompt/prompt-injector.ts:303: type removeFromAgentsFile
        - src/prompt/prompt-injector.ts:348: type injectInsights
        - src/prompt/prompt-injector.ts:372: type removeInjectedInsights
  type:
    30-30: InjectionMethod = "skill" | "agents_file" [exported]
      refs in: 1 [type: 1]
        - src/prompt/prompt-injector.ts:35: type PromptInjectionConfig
    31-31: InjectionScope = "analysis_only" | "global" [exported]
      refs in: 1 [type: 1]
        - src/prompt/prompt-injector.ts:37: type PromptInjectionConfig
  function:
    96-126: generateBrainInsightsSkill(additions: PromptAddition[]): string [exported]
      /** Generate the full brain-insights skill content */
      refs in: 6 [call: 5, import: 1]
        - src/prompt/prompt-injector.test.ts:14: import (module)
        - src/prompt/prompt-injector.test.ts:125: call skill
        - src/prompt/prompt-injector.test.ts:135: call skill
        - src/prompt/prompt-injector.test.ts:149: call skill
        - src/prompt/prompt-injector.ts:148: call skillContent
        - src/prompt/prompt-injector.ts:206: call generateModelSkill
    131-182: writeBrainInsightsSkill(db: Database.Database, options: PromptInjectionConfig = {}): InjectionResult [exported]
      /** Write the brain-insights skill to disk */
      refs in: 6 [call: 5, import: 1]
        - src/prompt/prompt-injector.test.ts:15: import (module)
        - src/prompt/prompt-injector.test.ts:177: call result
        - src/prompt/prompt-injector.test.ts:188: call result
        - src/prompt/prompt-injector.test.ts:207: call result
        - src/prompt/prompt-injector.test.ts:231: call result
        - src/prompt/prompt-injector.ts:353: call injectInsights
    187-207: generateModelSkill(db: Database.Database, model: string, options: PromptInjectionConfig = {}): string [exported]
      /** Generate skill content for a specific model */
      refs in: 3 [call: 2, import: 1]
        - src/prompt/prompt-injector.test.ts:16: import (module)
        - src/prompt/prompt-injector.test.ts:259: call skill
        - src/prompt/prompt-injector.test.ts:274: call skill
    230-296: updateAgentsFile(db: Database.Database, options: PromptInjectionConfig = {}): InjectionResult [exported]
      /** Update AGENTS.md with insights section WARNING: This affects ALL pi sessions, not just analysis. Use skill-based injection instead. */
      refs in: 5 [call: 4, import: 1]
        - src/prompt/prompt-injector.test.ts:17: import (module)
        - src/prompt/prompt-injector.test.ts:305: call result
        - src/prompt/prompt-injector.test.ts:315: call result
        - src/prompt/prompt-injector.test.ts:355: call result
        - src/prompt/prompt-injector.ts:356: call injectInsights
    301-336: removeFromAgentsFile(options: PromptInjectionConfig = {}): InjectionResult [exported]
      /** Remove insights section from AGENTS.md */
      refs in: 5 [call: 4, import: 1]
        - src/prompt/prompt-injector.test.ts:18: import (module)
        - src/prompt/prompt-injector.test.ts:390: call result
        - src/prompt/prompt-injector.test.ts:399: call result
        - src/prompt/prompt-injector.test.ts:424: call result
        - src/prompt/prompt-injector.ts:398: call removeInjectedInsights
    345-365: injectInsights(db: Database.Database, options: PromptInjectionConfig = {}): InjectionResult [exported]
      /** Inject insights into prompts using configured method */
      refs in: 5 [call: 3, import: 2]
        - src/cli.ts:54: import (module)
        - src/cli.ts:799: call result
        - src/prompt/prompt-injector.test.ts:19: import (module)
        - src/prompt/prompt-injector.test.ts:456: call result
        - src/prompt/prompt-injector.test.ts:463: call result
    370-407: removeInjectedInsights(options: PromptInjectionConfig = {}): InjectionResult [exported]
      /** Remove injected insights */
      refs in: 5 [call: 3, import: 2]
        - src/cli.ts:55: import (module)
        - src/cli.ts:837: call result
        - src/prompt/prompt-injector.test.ts:20: import (module)
        - src/prompt/prompt-injector.test.ts:490: call result
        - src/prompt/prompt-injector.test.ts:500: call result
    412-436: getInjectionStatus(options: PromptInjectionConfig = {}): { skillExists: boolean; skillPath: string; agentsHasSection: boolean; agentsPath: string; } [exported]
      /** Check current injection status */
      refs in: 6 [call: 4, import: 2]
        - src/cli.ts:56: import (module)
        - src/cli.ts:861: call status
        - src/prompt/prompt-injector.test.ts:21: import (module)
        - src/prompt/prompt-injector.test.ts:525: call status
        - src/prompt/prompt-injector.test.ts:536: call status
        - src/prompt/prompt-injector.test.ts:548: call status
  imports:
    - ../types/index.js
    - ./prompt-generator.js
    - better-sqlite3
    - node:fs
    - node:os
    - node:path

src/prompt/prompt.test.ts [1-717]
  imports:
    - ./prompt.js
    - ./types.js
    - better-sqlite3
    - node:fs
    - node:os
    - node:path
    - vitest

src/prompt/prompt.ts [1-388]
  function:
    51-57: normalizePromptContent(content: string): string [exported]
      /** Normalize prompt content for hashing This ensures that whitespace changes and HTML comments don't unnecessarily trigger new versions. */
      refs in: 8 [call: 7, import: 1]
        - src/prompt/prompt.test.ts:21: import (module)
        - src/prompt/prompt.test.ts:79: call (module)
        - src/prompt/prompt.test.ts:83: call (module)
        - src/prompt/prompt.test.ts:87: call (module)
        - src/prompt/prompt.test.ts:91: call (module)
        - src/prompt/prompt.test.ts:103: call (module)
        - src/prompt/prompt.test.ts:107: call (module)
        - src/prompt/prompt.ts:65: call normalized
    64-67: calculatePromptHash(content: string): string [exported]
      /** Calculate the hash of prompt content Returns an 8-character hex prefix of SHA-256 hash */
      refs in: 11 [call: 10, import: 1]
        - src/prompt/prompt.test.ts:22: import (module)
        - src/prompt/prompt.test.ts:115: call hash
        - src/prompt/prompt.test.ts:120: call hash1
        - src/prompt/prompt.test.ts:121: call hash2
        - src/prompt/prompt.test.ts:126: call hash1
        - src/prompt/prompt.test.ts:127: call hash2
        - src/prompt/prompt.test.ts:132: call hash1
        - src/prompt/prompt.test.ts:133: call hash2
        - src/prompt/prompt.test.ts:138: call hash1
        - src/prompt/prompt.test.ts:139: call hash2
    72-83: parseVersionString(version: string): { sequential: number; hash: string; } [exported]
      /** Parse a version string into its components */
      refs in: 11 [call: 10, import: 1]
        - src/prompt/prompt.test.ts:23: import (module)
        - src/prompt/prompt.test.ts:146: call result
        - src/prompt/prompt.test.ts:151: call result
        - src/prompt/prompt.test.ts:156: call (module)
        - src/prompt/prompt.test.ts:157: call (module)
        - src/prompt/prompt.test.ts:158: call (module)
        - src/prompt/prompt.test.ts:159: call (module)
        - src/prompt/prompt.ts:220: call parsed
        - src/prompt/prompt.ts:263: call parsedA
        - src/prompt/prompt.ts:264: call parsedB
    88-90: createVersionString(sequential: number, hash: string): string [exported]
      /** Create a version string from components */
      refs in: 4 [call: 3, import: 1]
        - src/prompt/prompt.test.ts:24: import (module)
        - src/prompt/prompt.test.ts:165: call (module)
        - src/prompt/prompt.test.ts:166: call (module)
        - src/prompt/prompt.ts:237: call version
    95-98: getArchiveFilename(version: string): string [exported]
      /** Get the archive filename for a version */
      refs in: 3 [call: 2, import: 1]
        - src/prompt/prompt.test.ts:25: import (module)
        - src/prompt/prompt.test.ts:172: call filename
        - src/prompt/prompt.ts:189: call filename
    103-113: ensurePromptsDir(promptsDir?: string): void [exported]
      /** Ensure the prompts directory structure exists */
      refs in: 5 [call: 4, import: 1]
        - src/prompt/prompt.test.ts:26: import (module)
        - src/prompt/prompt.test.ts:182: call (module)
        - src/prompt/prompt.test.ts:195: call (module)
        - src/prompt/prompt.ts:182: call archivePrompt
        - src/prompt/prompt.ts:357: call ensureDefaultPrompt
    118-126: getVersionByHash(db: Database.Database, hash: string): any [exported]
      /** Get prompt version by content hash from database */
      refs in: 4 [call: 3, import: 1]
        - src/prompt/prompt.test.ts:27: import (module)
        - src/prompt/prompt.test.ts:208: call (module)
        - src/prompt/prompt.test.ts:221: call result
        - src/prompt/prompt.ts:218: call existing
    131-138: getLatestVersion(db: Database.Database): any [exported]
      /** Get the latest prompt version from database */
      refs in: 5 [call: 3, import: 2]
        - src/daemon/scheduler.ts:23: import (module)
        - src/daemon/scheduler.ts:395: call Scheduler.latestVersion
        - src/prompt/prompt.test.ts:28: import (module)
        - src/prompt/prompt.test.ts:235: call (module)
        - src/prompt/prompt.test.ts:251: call result
    143-151: getNextSequential(db: Database.Database): number [exported]
      /** Get the next sequential version number */
      refs in: 5 [call: 4, import: 1]
        - src/prompt/prompt.test.ts:29: import (module)
        - src/prompt/prompt.test.ts:263: call (module)
        - src/prompt/prompt.test.ts:276: call (module)
        - src/prompt/prompt.test.ts:295: call (module)
        - src/prompt/prompt.ts:236: call sequential
    156-171: recordPromptVersion(db: Database.Database, version: PromptVersion, notes?: string): void [exported]
      /** Record a new prompt version in the database */
      refs in: 4 [call: 3, import: 1]
        - src/prompt/prompt.test.ts:30: import (module)
        - src/prompt/prompt.test.ts:314: call (module)
        - src/prompt/prompt.test.ts:337: call (module)
        - src/prompt/prompt.ts:252: call getOrCreatePromptVersion
    176-194: archivePrompt(promptPath: string, historyDir: string, version: string): string [exported]
      /** Archive prompt to history directory */
      refs in: 4 [call: 3, import: 1]
        - src/prompt/prompt.test.ts:31: import (module)
        - src/prompt/prompt.test.ts:362: call archivePath
        - src/prompt/prompt.test.ts:385: call archivePath
        - src/prompt/prompt.ts:241: call archivePath
    203-255: getOrCreatePromptVersion(db: Database.Database, promptPath: string, historyDir?: string): PromptVersion [exported]
      /** Get or create a prompt version If the current prompt has the same hash as an existing version, returns that version. Otherwise, creates a new version, archives the prompt, and records it in the database. */
      refs in: 11 [call: 9, import: 2]
        - src/daemon/worker.ts:24: import (module)
        - src/daemon/worker.ts:322: call Worker.promptVersion
        - src/prompt/prompt.test.ts:32: import (module)
        - src/prompt/prompt.test.ts:403: call (module)
        - src/prompt/prompt.test.ts:421: call version
        - src/prompt/prompt.test.ts:444: call version1
        - src/prompt/prompt.test.ts:447: call version2
        - src/prompt/prompt.test.ts:467: call version1
        - src/prompt/prompt.test.ts:470: call version2
        - src/prompt/prompt.test.ts:490: call version
    262-272: compareVersions(a: string, b: string): number [exported]
      /** Compare two version strings Returns negative if a < b, positive if a > b, 0 if equal */
      refs in: 7 [call: 6, import: 1]
        - src/prompt/prompt.test.ts:33: import (module)
        - src/prompt/prompt.test.ts:526: call (module)
        - src/prompt/prompt.test.ts:527: call (module)
        - src/prompt/prompt.test.ts:528: call (module)
        - src/prompt/prompt.test.ts:532: call (module)
        - src/prompt/prompt.test.ts:533: call (module)
        - src/prompt/prompt.test.ts:537: call result
    277-292: listPromptVersions(db: Database.Database): {} [exported]
      /** List all prompt versions from database */
      refs in: 3 [call: 2, import: 1]
        - src/prompt/prompt.test.ts:34: import (module)
        - src/prompt/prompt.test.ts:546: call (module)
        - src/prompt/prompt.test.ts:562: call versions
    299-311: hasOutdatedNodes(db: Database.Database, currentVersion: string): boolean [exported]
      /** Check if a prompt needs reanalysis Returns true if nodes exist that were analyzed with an older version */
      refs in: 4 [call: 3, import: 1]
        - src/prompt/prompt.test.ts:35: import (module)
        - src/prompt/prompt.test.ts:584: call (module)
        - src/prompt/prompt.test.ts:600: call (module)
        - src/prompt/prompt.test.ts:613: call (module)
    316-328: getOutdatedNodeCount(db: Database.Database, currentVersion: string): number [exported]
      /** Get count of nodes needing reanalysis */
      refs in: 3 [call: 2, import: 1]
        - src/prompt/prompt.test.ts:36: import (module)
        - src/prompt/prompt.test.ts:632: call (module)
        - src/prompt/prompt.test.ts:645: call (module)
    335-340: getBundledPromptPath(): string [exported]
      /** Get the path to the bundled default prompt This is the prompt file shipped with the pi-brain package */
      refs in: 3 [call: 2, import: 1]
        - src/prompt/prompt.test.ts:37: import (module)
        - src/prompt/prompt.test.ts:654: call bundledPath
        - src/prompt/prompt.ts:360: call bundledPath
    348-387: ensureDefaultPrompt(targetPath?: string): boolean [exported]
      /** Ensure the default prompt exists at the target location If no prompt file exists at the target path, copies the bundled default. Returns true if a new prompt was installed, false if one already existed. */
      refs in: 4 [call: 3, import: 1]
        - src/prompt/prompt.test.ts:38: import (module)
        - src/prompt/prompt.test.ts:666: call result
        - src/prompt/prompt.test.ts:683: call result
        - src/prompt/prompt.test.ts:708: call (module)
  variable:
    30-30: any [exported]
      /** Default prompts directory */
    35-38: any [exported]
      /** Default prompt file path */
    43-43: any [exported]
      /** Default history directory */
  imports:
    - ./types.js
    - better-sqlite3
    - node:crypto
    - node:fs
    - node:os
    - node:path
    - node:url

src/prompt/types.ts [1-35]
  interface:
    8-23: interface PromptVersion [exported]
      /** Types for prompt versioning and management Prompt version information */
      refs in: 8 [import: 2, type: 6]
        - src/prompt/prompt.test.ts:18: import (module)
        - src/prompt/prompt.test.ts:306: type version
        - src/prompt/prompt.test.ts:329: type version
        - src/prompt/prompt.ts:25: import (module)
        - src/prompt/prompt.ts:158: type recordPromptVersion
        - src/prompt/prompt.ts:207: type getOrCreatePromptVersion
        - src/prompt/prompt.ts:244: type promptVersion
        - src/prompt/prompt.ts:277: type listPromptVersions
    28-34: interface PromptVersionRecord [exported]
      /** Prompt info retrieved from database */
      refs in: 6 [import: 1, type: 5]
        - src/prompt/prompt.ts:25: import (module)
        - src/prompt/prompt.ts:121: type getVersionByHash
        - src/prompt/prompt.ts:124: type result
        - src/prompt/prompt.ts:133: type getLatestVersion
        - src/prompt/prompt.ts:136: type result
        - src/prompt/prompt.ts:280: type rows

src/storage/pattern-repository.ts [1-369]
  interface:
    74-78: interface ListFailurePatternsOptions [exported]
      refs in: 1 [type: 1]
        - src/storage/pattern-repository.ts:82: type listFailurePatterns
    142-146: interface ListLessonPatternsOptions [exported]
      refs in: 1 [type: 1]
        - src/storage/pattern-repository.ts:150: type listLessonPatterns
    188-197: interface ListInsightsOptions [exported]
      refs in: 1 [type: 1]
        - src/storage/pattern-repository.ts:201: type listInsights
  function:
    80-111: listFailurePatterns(db: Database.Database, options: ListFailurePatternsOptions = {}): {} [exported]
      refs in: 5 [call: 3, import: 2]
        - src/api/routes/patterns.ts:13: import (module)
        - src/api/routes/patterns.ts:61: call result
        - src/storage/pattern-repository.test.ts:8: import (module)
        - src/storage/pattern-repository.test.ts:28: call patterns
        - src/storage/pattern-repository.test.ts:35: call rarePatterns
    117-136: listModelStats(db: Database.Database): {} [exported]
      refs in: 4 [call: 2, import: 2]
        - src/api/routes/patterns.ts:15: import (module)
        - src/api/routes/patterns.ts:83: call result
        - src/storage/pattern-repository.test.ts:11: import (module)
        - src/storage/pattern-repository.test.ts:52: call stats
    148-182: listLessonPatterns(db: Database.Database, options: ListLessonPatternsOptions = {}): {} [exported]
      refs in: 5 [call: 3, import: 2]
        - src/api/routes/patterns.ts:14: import (module)
        - src/api/routes/patterns.ts:108: call result
        - src/storage/pattern-repository.test.ts:10: import (module)
        - src/storage/pattern-repository.test.ts:71: call patterns
        - src/storage/pattern-repository.test.ts:76: call projectPatterns
    199-252: listInsights(db: Database.Database, options: ListInsightsOptions = {}): {} [exported]
      refs in: 21 [call: 16, import: 5]
        - src/api/routes/prompt-learning.ts:12: import (module)
        - src/api/routes/prompt-learning.ts:51: call insights
        - src/cli.ts:61: import (module)
        - src/cli.ts:594: call insights
        - src/cli.ts:737: call (module)
        - src/prompt/agents-generator.ts:21: import (module)
        - src/prompt/agents-generator.ts:143: call insights
        - src/prompt/agents-generator.ts:151: call generalToolErrors
        - src/prompt/prompt-generator.ts:15: import (module)
        - src/prompt/prompt-generator.ts:263: call insights
    254-268: getInsight(db: Database.Database, id: string): any [exported]
      refs in: 13 [call: 9, import: 4]
        - src/api/routes/prompt-learning.ts:13: import (module)
        - src/api/routes/prompt-learning.ts:146: call insight
        - src/cli.ts:60: import (module)
        - src/cli.ts:645: call insight
        - src/cli.ts:677: call insight
        - src/cli.ts:729: call insight
        - src/prompt/effectiveness.ts:24: import (module)
        - src/prompt/effectiveness.ts:409: call insight
        - src/prompt/effectiveness.ts:464: call insight
        - src/storage/pattern-repository.test.ts:6: import (module)
    270-294: getInsightsByModel(db: Database.Database, model: string, options: { minConfidence?: number; promptIncludedOnly?: boolean } = {}): {} [exported]
      refs in: 3 [call: 2, import: 1]
        - src/storage/pattern-repository.test.ts:7: import (module)
        - src/storage/pattern-repository.test.ts:179: call claudeInsights
        - src/storage/pattern-repository.test.ts:183: call highConfidence
    296-328: countInsights(db: Database.Database, options: { type?: InsightType; model?: string; promptIncluded?: boolean } = {}): number [exported]
      refs in: 5 [call: 4, import: 1]
        - src/storage/pattern-repository.test.ts:5: import (module)
        - src/storage/pattern-repository.test.ts:193: call (module)
        - src/storage/pattern-repository.test.ts:194: call (module)
        - src/storage/pattern-repository.test.ts:195: call (module)
        - src/storage/pattern-repository.test.ts:196: call (module)
    330-347: updateInsightPrompt(db: Database.Database, id: string, promptText: string, promptIncluded: boolean, promptVersion?: string): void [exported]
      refs in: 11 [call: 6, import: 5]
        - src/api/routes/prompt-learning.ts:14: import (module)
        - src/api/routes/prompt-learning.ts:153: call promptLearningRoutes
        - src/cli.ts:62: import (module)
        - src/cli.ts:651: call (module)
        - src/cli.ts:683: call (module)
        - src/prompt/effectiveness.ts:25: import (module)
        - src/prompt/effectiveness.ts:779: call autoDisableIneffectiveInsights
        - src/prompt/prompt-generator.ts:16: import (module)
        - src/prompt/prompt-generator.ts:329: call updateInsightPromptTexts
        - src/storage/pattern-repository.test.ts:12: import (module)
  imports:
    - ../types/index.js
    - better-sqlite3

---
Files: 14
Estimated tokens: 10,774 (codebase: ~914,945)
