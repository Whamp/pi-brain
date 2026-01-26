/**
 * Query Processor - Answers natural language queries using pi agent
 *
 * Takes a user question, searches relevant nodes, and uses a pi agent
 * to synthesize an answer based on the knowledge graph data.
 */

import type { Database } from "better-sqlite3";

import { spawn } from "node:child_process";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import type { DaemonConfig } from "../config/types.js";

import {
  searchNodesAdvanced,
  listNodes,
  getAggregatedQuirks,
  getAggregatedToolErrors,
  type ListNodesFilters,
  type NodeRow,
} from "../storage/node-repository.js";
import { consoleLogger, type ProcessorLogger } from "./processor.js";

// =============================================================================
// Types
// =============================================================================

/** Query request from the API */
export interface QueryRequest {
  /** Natural language query */
  query: string;
  /** Optional context */
  context?: {
    project?: string;
    model?: string;
  };
  /** Query options */
  options?: {
    maxNodes?: number;
    includeDetails?: boolean;
  };
}

/** Query response to return to the client */
export interface QueryResponse {
  /** Synthesized answer */
  answer: string;
  /** Short summary for notifications */
  summary: string;
  /** Confidence level */
  confidence: "high" | "medium" | "low";
  /** Related nodes used to answer */
  relatedNodes: {
    id: string;
    relevance: number;
    summary: string;
  }[];
  /** Source excerpts */
  sources: {
    nodeId: string;
    excerpt: string;
  }[];
}

/** Result from the pi agent */
interface AgentQueryResult {
  success: boolean;
  response?: QueryResponse;
  error?: string;
  durationMs: number;
}

/** Internal structure for agent output */
interface AgentQueryOutput {
  answer: string;
  summary: string;
  confidence: "high" | "medium" | "low";
  sources: {
    nodeId: string;
    excerpt: string;
  }[];
}

// =============================================================================
// Query Processor
// =============================================================================

export interface QueryProcessorConfig {
  /** Database connection */
  db: Database;
  /** Daemon configuration for agent invocation */
  daemonConfig: DaemonConfig;
  /** Logger */
  logger?: ProcessorLogger;
  /** Path to query prompt file */
  queryPromptFile?: string;
}

/**
 * Process a natural language query against the knowledge graph
 */
export async function processQuery(
  request: QueryRequest,
  config: QueryProcessorConfig
): Promise<QueryResponse> {
  const logger = config.logger ?? consoleLogger;
  const maxNodes = request.options?.maxNodes ?? 10;

  logger.info(`Processing query: "${request.query.slice(0, 100)}..."`);

  // Step 1: Search for relevant nodes
  const relevantNodes = findRelevantNodes(
    config.db,
    request.query,
    request.context?.project,
    maxNodes
  );

  logger.info(`Found ${relevantNodes.length} relevant nodes`);

  // Step 2: If no nodes found, return early
  if (relevantNodes.length === 0) {
    return {
      answer:
        "I couldn't find any sessions in the knowledge graph matching your query. " +
        "This could mean:\n" +
        "- The work hasn't been done yet\n" +
        "- Sessions haven't been analyzed yet\n" +
        "- Try rephrasing your question with different terms",
      summary: "No matching sessions found",
      confidence: "high",
      relatedNodes: [],
      sources: [],
    };
  }

  // Step 3: Check for model quirks and tool errors if query seems related
  const additionalContext = gatherAdditionalContext(
    config.db,
    request.query,
    logger
  );

  // Step 4: Invoke pi agent to synthesize answer
  const result = await invokeQueryAgent(
    request.query,
    relevantNodes,
    additionalContext,
    config,
    logger
  );

  if (!result.success || !result.response) {
    logger.error(`Query agent failed: ${result.error}`);
    return {
      answer: `Failed to process query: ${result.error}`,
      summary: "Query processing failed",
      confidence: "low",
      relatedNodes: relevantNodes.map((n) => ({
        id: n.id,
        relevance: 0.5,
        summary: n.summary,
      })),
      sources: [],
    };
  }

  // Step 5: Enhance response with node metadata
  const { response } = result;
  response.relatedNodes = relevantNodes.map((n, idx) => ({
    id: n.id,
    relevance: 1 - idx * 0.1, // Simple relevance decay
    summary: n.summary,
  }));

  logger.info(`Query completed in ${result.durationMs}ms`);
  return response;
}

// =============================================================================
// Node Search
// =============================================================================

interface RelevantNode {
  id: string;
  summary: string;
  type: string;
  project: string;
  outcome: string;
  timestamp: string;
}

/**
 * Find nodes relevant to the query
 */
function findRelevantNodes(
  db: Database,
  query: string,
  project: string | undefined,
  maxNodes: number
): RelevantNode[] {
  // First try full-text search
  const filters: ListNodesFilters | undefined = project
    ? { project }
    : undefined;
  const searchResults = searchNodesAdvanced(db, query, {
    limit: maxNodes,
    filters,
  });

  if (searchResults.results.length > 0) {
    return searchResults.results.map((r) => nodeRowToRelevant(r.node));
  }

  // Fallback: list recent nodes from the project
  const listFilters: ListNodesFilters = {};
  if (project) {
    listFilters.project = project;
  }

  const nodes = listNodes(db, listFilters, {
    sort: "timestamp",
    order: "desc",
    limit: maxNodes,
  });

  return nodes.nodes.map(nodeRowToRelevant);
}

/**
 * Convert a NodeRow to RelevantNode summary
 */
function nodeRowToRelevant(row: NodeRow): RelevantNode {
  return {
    id: row.id,
    summary: `Session from ${row.timestamp}`, // NodeRow doesn't have summary directly
    type: row.type ?? "unknown",
    project: row.project ?? "unknown",
    outcome: row.outcome ?? "unknown",
    timestamp: row.timestamp,
  };
}

// =============================================================================
// Additional Context
// =============================================================================

interface AdditionalContext {
  modelQuirks?: string[];
  toolErrors?: string[];
}

/**
 * Gather additional context based on query keywords
 */
function gatherAdditionalContext(
  db: Database,
  query: string,
  logger: ProcessorLogger
): AdditionalContext {
  const context: AdditionalContext = {};
  const lowerQuery = query.toLowerCase();

  // Check for model-related queries
  if (
    lowerQuery.includes("model") ||
    lowerQuery.includes("quirk") ||
    lowerQuery.includes("claude") ||
    lowerQuery.includes("glm") ||
    lowerQuery.includes("gemini")
  ) {
    try {
      const quirks = getAggregatedQuirks(db, { limit: 10 });
      if (quirks.length > 0) {
        context.modelQuirks = quirks.map(
          (q) =>
            `${q.model}: ${q.observation} (${q.frequency ?? "unknown"}, ${q.occurrences}x)`
        );
      }
    } catch (error) {
      logger.warn(`Failed to get model quirks: ${error}`);
    }
  }

  // Check for tool-related queries
  if (
    lowerQuery.includes("tool") ||
    lowerQuery.includes("error") ||
    lowerQuery.includes("fail") ||
    lowerQuery.includes("edit") ||
    lowerQuery.includes("bash")
  ) {
    try {
      const errors = getAggregatedToolErrors(db, {}, { limit: 10 });
      if (errors.length > 0) {
        context.toolErrors = errors.map(
          (e) => `${e.tool} - ${e.errorType}: ${e.count} occurrences`
        );
      }
    } catch (error) {
      logger.warn(`Failed to get tool errors: ${error}`);
    }
  }

  return context;
}

// =============================================================================
// Agent Invocation
// =============================================================================

/**
 * Invoke the pi agent to synthesize an answer
 */
async function invokeQueryAgent(
  query: string,
  nodes: RelevantNode[],
  additionalContext: AdditionalContext,
  config: QueryProcessorConfig,
  logger: ProcessorLogger
): Promise<AgentQueryResult> {
  const startTime = Date.now();

  // Determine prompt file path
  const promptFile =
    config.queryPromptFile ??
    path.join(os.homedir(), ".pi-brain", "prompts", "brain-query.md");

  // Check if prompt file exists, fall back to project prompts dir
  let actualPromptFile = promptFile;
  try {
    await fs.access(promptFile);
  } catch {
    // Try project-local prompts directory
    const projectPromptFile = path.join(
      process.cwd(),
      "prompts",
      "brain-query.md"
    );
    try {
      await fs.access(projectPromptFile);
      actualPromptFile = projectPromptFile;
    } catch {
      return {
        success: false,
        error: `Query prompt file not found: ${promptFile}`,
        durationMs: Date.now() - startTime,
      };
    }
  }

  // Build the context prompt
  const contextPrompt = buildQueryPrompt(query, nodes, additionalContext);

  // Build pi arguments
  const args = [
    "--provider",
    config.daemonConfig.provider,
    "--model",
    config.daemonConfig.model,
    "--system-prompt",
    actualPromptFile,
    "--no-session",
    "--mode",
    "json",
    "-p",
    contextPrompt,
  ];

  logger.debug(`Spawning query agent with ${nodes.length} nodes of context`);

  // Spawn the process
  const spawnResult = await spawnPiProcess(
    args,
    config.daemonConfig.analysisTimeoutMinutes,
    logger
  );

  const durationMs = Date.now() - startTime;

  if (spawnResult.spawnError) {
    return {
      success: false,
      error: `Failed to spawn pi: ${spawnResult.spawnError}`,
      durationMs,
    };
  }

  if (spawnResult.timedOut) {
    return {
      success: false,
      error: "Query timed out",
      durationMs,
    };
  }

  if (spawnResult.exitCode !== 0) {
    return {
      success: false,
      error: `Pi exited with code ${spawnResult.exitCode}`,
      durationMs,
    };
  }

  // Parse the output
  const parseResult = parseQueryOutput(spawnResult.stdout, logger);

  return {
    success: parseResult.success,
    response: parseResult.response,
    error: parseResult.error,
    durationMs,
  };
}

/**
 * Build the prompt for the query agent
 */
function buildQueryPrompt(
  query: string,
  nodes: RelevantNode[],
  additionalContext: AdditionalContext
): string {
  const parts: string[] = [
    "Answer the following question based on the knowledge graph data provided.",
    "",
    `## Question`,
    query,
    "",
    "## Relevant Sessions",
    "",
  ];

  for (const node of nodes) {
    parts.push(`### Session ${node.id}`);
    parts.push(`- **Type**: ${node.type}`);
    parts.push(`- **Project**: ${node.project}`);
    parts.push(`- **Outcome**: ${node.outcome}`);
    parts.push(`- **Date**: ${node.timestamp}`);
    parts.push(`- **Summary**: ${node.summary}`);
    parts.push("");
  }

  // Add additional context if available
  if (
    additionalContext.modelQuirks &&
    additionalContext.modelQuirks.length > 0
  ) {
    parts.push("## Known Model Quirks");
    for (const quirk of additionalContext.modelQuirks) {
      parts.push(`- ${quirk}`);
    }
    parts.push("");
  }

  if (additionalContext.toolErrors && additionalContext.toolErrors.length > 0) {
    parts.push("## Known Tool Errors");
    for (const error of additionalContext.toolErrors) {
      parts.push(`- ${error}`);
    }
    parts.push("");
  }

  parts.push("## Instructions");
  parts.push(
    "Provide your response as a JSON object with the following structure:"
  );
  parts.push("```json");
  parts.push("{");
  parts.push('  "answer": "Your detailed answer",');
  parts.push('  "summary": "One-sentence summary",');
  parts.push('  "confidence": "high" | "medium" | "low",');
  parts.push('  "sources": [{"nodeId": "...", "excerpt": "..."}]');
  parts.push("}");
  parts.push("```");

  return parts.join("\n");
}

// =============================================================================
// Process Spawning
// =============================================================================

interface SpawnResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  spawnError?: string;
}

async function spawnPiProcess(
  args: string[],
  timeoutMinutes: number,
  logger: ProcessorLogger
): Promise<SpawnResult> {
  return new Promise<SpawnResult>((resolve) => {
    const timeoutMs = timeoutMinutes * 60 * 1000;
    let stdout = "";
    let stderr = "";
    let resolved = false;

    const complete = (result: SpawnResult) => {
      if (!resolved) {
        resolved = true;
        resolve(result);
      }
    };

    const proc = spawn("pi", args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    const timeout = setTimeout(() => {
      proc.kill("SIGTERM");
      logger.warn(`Query timed out after ${timeoutMinutes}m`);
      complete({
        stdout,
        stderr,
        exitCode: null,
        timedOut: true,
      });
    }, timeoutMs);

    proc.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      clearTimeout(timeout);
      complete({
        stdout,
        stderr,
        exitCode: code,
        timedOut: false,
      });
    });

    proc.on("error", (err) => {
      clearTimeout(timeout);
      complete({
        stdout,
        stderr,
        exitCode: null,
        timedOut: false,
        spawnError: err.message,
      });
    });
  });
}

// =============================================================================
// Output Parsing
// =============================================================================

interface PiJsonEvent {
  type: string;
  message?: PiMessage;
  messages?: PiMessage[];
}

interface PiMessage {
  role: string;
  content: PiContentBlock[];
}

interface PiContentBlock {
  type: string;
  text?: string;
}

interface ParseResult {
  success: boolean;
  response?: QueryResponse;
  error?: string;
}

function parseQueryOutput(
  stdout: string,
  logger: ProcessorLogger
): ParseResult {
  const lines = stdout.trim().split("\n");
  const events: PiJsonEvent[] = [];

  // Parse all JSON lines
  for (const line of lines) {
    if (!line.trim()) {
      continue;
    }
    try {
      events.push(JSON.parse(line) as PiJsonEvent);
    } catch {
      logger.debug(`Skipping non-JSON line: ${line.slice(0, 100)}...`);
    }
  }

  // Find the agent_end event
  const endEvent = events.find((e) => e.type === "agent_end");
  if (!endEvent?.messages) {
    return {
      success: false,
      error: "No agent_end event found in output",
    };
  }

  // Find the last assistant message
  const assistantMessages = endEvent.messages.filter(
    (m) => m.role === "assistant"
  );
  const assistantMsg = assistantMessages.at(-1);

  if (!assistantMsg) {
    return {
      success: false,
      error: "No assistant message in agent_end event",
    };
  }

  // Extract text content
  const textContent = assistantMsg.content
    .filter(
      (b): b is PiContentBlock & { text: string } =>
        b.type === "text" && typeof b.text === "string"
    )
    .map((b) => b.text)
    .join("\n");

  // Extract JSON from the response
  const queryOutput = extractQueryOutput(textContent, logger);

  if (!queryOutput) {
    return {
      success: false,
      error: "Could not extract valid JSON from assistant response",
    };
  }

  return {
    success: true,
    response: {
      answer: queryOutput.answer,
      summary: queryOutput.summary,
      confidence: queryOutput.confidence,
      relatedNodes: [], // Will be filled in by caller
      sources: queryOutput.sources,
    },
  };
}

function extractQueryOutput(
  text: string,
  logger: ProcessorLogger
): AgentQueryOutput | undefined {
  // Try to find JSON in code fence first
  const fenceMatch = /```(?:json)?\s*\n([\s\S]*?)\n```/.exec(text);
  if (fenceMatch) {
    try {
      const parsed = JSON.parse(fenceMatch[1]) as AgentQueryOutput;
      if (isValidQueryOutput(parsed)) {
        return parsed;
      }
      logger.warn("Code-fenced JSON did not match expected schema");
    } catch (error) {
      logger.warn(`Failed to parse code-fenced JSON: ${error}`);
    }
  }

  // Try to find raw JSON object
  const jsonMatch = /\{[\s\S]*\}/.exec(text);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]) as AgentQueryOutput;
      if (isValidQueryOutput(parsed)) {
        return parsed;
      }
      logger.warn("Raw JSON did not match expected schema");
    } catch (error) {
      logger.warn(`Failed to parse raw JSON: ${error}`);
    }
  }

  return undefined;
}

function isValidQueryOutput(obj: unknown): obj is AgentQueryOutput {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }

  const output = obj as Record<string, unknown>;

  if (typeof output.answer !== "string") {
    return false;
  }
  if (typeof output.summary !== "string") {
    return false;
  }
  if (!["high", "medium", "low"].includes(output.confidence as string)) {
    return false;
  }
  if (!Array.isArray(output.sources)) {
    return false;
  }

  return true;
}
