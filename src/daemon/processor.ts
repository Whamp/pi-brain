/**
 * Job Processor - Spawns pi agents to analyze sessions
 *
 * Takes jobs from the queue and invokes pi with the session analyzer prompt.
 * Based on specs/daemon.md and specs/session-analyzer.md.
 */

import { spawn } from "node:child_process";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import type { DaemonConfig } from "../config/types.js";
import type { AnalysisJob } from "./queue.js";

// =============================================================================
// Types
// =============================================================================

/** Result from invoking the pi agent */
export interface AgentResult {
  /** Whether the analysis succeeded */
  success: boolean;
  /** Raw output from the agent */
  rawOutput: string;
  /** Parsed node data (if successful) */
  nodeData?: AgentNodeOutput;
  /** Error message (if failed) */
  error?: string;
  /** Exit code from the process */
  exitCode: number | null;
  /** Duration in milliseconds */
  durationMs: number;
}

/** Output schema from the session analyzer (matches session-analyzer.md) */
export interface AgentNodeOutput {
  classification: {
    type: string;
    project: string;
    isNewProject: boolean;
    hadClearGoal: boolean;
    language?: string;
    frameworks?: string[];
  };
  content: {
    summary: string;
    outcome: "success" | "partial" | "failed" | "abandoned";
    keyDecisions: {
      what: string;
      why: string;
      alternativesConsidered: string[];
    }[];
    filesTouched: string[];
    toolsUsed: string[];
    errorsSeen: {
      type: string;
      message: string;
      resolved: boolean;
    }[];
  };
  lessons: {
    project: LessonOutput[];
    task: LessonOutput[];
    user: LessonOutput[];
    model: LessonOutput[];
    tool: LessonOutput[];
    skill: LessonOutput[];
    subagent: LessonOutput[];
  };
  observations: {
    modelsUsed: {
      provider: string;
      model: string;
      tokensInput: number;
      tokensOutput: number;
      cacheRead?: number;
      cacheWrite?: number;
      cost: number;
    }[];
    promptingWins: string[];
    promptingFailures: string[];
    modelQuirks: {
      model: string;
      observation: string;
      frequency: "once" | "sometimes" | "often" | "always";
      workaround?: string;
      severity: "low" | "medium" | "high";
    }[];
    toolUseErrors: {
      tool: string;
      errorType: string;
      context: string;
      model: string;
      wasRetried: boolean;
    }[];
  };
  semantic: {
    tags: string[];
    topics: string[];
    relatedProjects?: string[];
    concepts?: string[];
  };
  daemonMeta: {
    decisions: {
      timestamp: string;
      decision: string;
      reasoning: string;
      needsReview?: boolean;
    }[];
    rlmUsed: boolean;
    codemapAvailable?: boolean;
    analysisLog?: string;
    segmentTokenCount?: number;
  };
}

interface LessonOutput {
  level: string;
  summary: string;
  details: string;
  confidence: "high" | "medium" | "low";
  tags: string[];
  actionable?: string;
}

/** Skill availability information */
export interface SkillInfo {
  name: string;
  available: boolean;
  path?: string;
}

/** Logger interface for processor */
export interface ProcessorLogger {
  debug: (message: string) => void;
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
}

/** Default console logger */
export const consoleLogger: ProcessorLogger = {
  debug: (msg) => console.debug(`[processor] ${msg}`),
  info: (msg) => console.log(`[processor] ${msg}`),
  warn: (msg) => console.warn(`[processor] ${msg}`),
  error: (msg) => console.error(`[processor] ${msg}`),
};

// =============================================================================
// Constants
// =============================================================================

/** Required skills for analysis - must be available */
export const REQUIRED_SKILLS = [] as const;

/** Optional skills - enhance analysis but not required */
export const OPTIONAL_SKILLS = ["codemap"] as const;

/** Skills that are conditionally included based on file size */
export const CONDITIONAL_SKILLS = ["rlm"] as const;

/** File size threshold (in bytes) for including RLM skill */
export const RLM_SIZE_THRESHOLD = 500 * 1024; // 500KB

/** Skills directory location */
export const SKILLS_DIR = path.join(os.homedir(), "skills");

// =============================================================================
// Skill Management
// =============================================================================

/**
 * Check if a skill is available by looking for SKILL.md
 */
export async function checkSkillAvailable(skillName: string): Promise<boolean> {
  const skillPath = path.join(SKILLS_DIR, skillName, "SKILL.md");
  try {
    await fs.access(skillPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get availability information for all skills
 */
export async function getSkillAvailability(): Promise<Map<string, SkillInfo>> {
  const availability = new Map<string, SkillInfo>();
  const allSkills = [
    ...REQUIRED_SKILLS,
    ...OPTIONAL_SKILLS,
    ...CONDITIONAL_SKILLS,
  ];

  for (const skill of allSkills) {
    const skillPath = path.join(SKILLS_DIR, skill, "SKILL.md");
    const available = await checkSkillAvailable(skill);

    availability.set(skill, {
      name: skill,
      available,
      path: available ? skillPath : undefined,
    });
  }

  return availability;
}

/** Result of environment validation */
export interface EnvironmentValidationResult {
  /** Whether environment is valid for job processing */
  valid: boolean;
  /** Missing skill names */
  missingSkills: string[];
  /** Path to missing prompt file, if validation failed due to missing prompt */
  missingPromptFile?: string;
}

/**
 * Validate that all required skills are available
 * Returns validation result instead of throwing
 */
export async function validateRequiredSkills(): Promise<EnvironmentValidationResult> {
  const skills = await getSkillAvailability();

  const missingSkills = REQUIRED_SKILLS.filter(
    (s) => !skills.get(s)?.available
  );

  if (missingSkills.length > 0) {
    return { valid: false, missingSkills };
  }

  return { valid: true, missingSkills: [] };
}

/**
 * Build the skills argument for pi invocation
 * Returns comma-separated list of available skills
 *
 * RLM skill is only included for files larger than RLM_SIZE_THRESHOLD
 * to avoid confusing smaller models with RLM instructions.
 */
export async function buildSkillsArg(sessionFile?: string): Promise<string> {
  const skills = await getSkillAvailability();

  // Check if we should include RLM (only for large files)
  let includeRlm = false;
  if (sessionFile) {
    try {
      const stat = await fs.stat(sessionFile);
      includeRlm = stat.size >= RLM_SIZE_THRESHOLD;
    } catch {
      // If we can't stat the file, don't include RLM
      includeRlm = false;
    }
  }

  const skillsToInclude: string[] = [];

  // Add required skills
  for (const skill of REQUIRED_SKILLS) {
    if (skills.get(skill)?.available) {
      skillsToInclude.push(skill);
    }
  }

  // Add optional skills
  for (const skill of OPTIONAL_SKILLS) {
    if (skills.get(skill)?.available) {
      skillsToInclude.push(skill);
    }
  }

  // Add conditional skills (RLM) only for large files
  if (includeRlm && skills.get("rlm")?.available) {
    skillsToInclude.push("rlm");
  }

  return skillsToInclude.join(",");
}

// =============================================================================
// Prompt Building
// =============================================================================

/**
 * Build the analysis prompt for a job
 */
export function buildAnalysisPrompt(job: AnalysisJob): string {
  const parts: string[] = [
    "Analyze this pi session segment and extract structured insights.",
    "",
    `Session: ${job.sessionFile}`,
  ];

  if (job.segmentStart && job.segmentEnd) {
    parts.push(
      `Segment: entries from ${job.segmentStart} to ${job.segmentEnd}`
    );
  } else if (job.segmentStart) {
    parts.push(`Segment: starting from entry ${job.segmentStart}`);
  } else if (job.segmentEnd) {
    parts.push(`Segment: up to entry ${job.segmentEnd}`);
  }

  if (job.context) {
    const contextStr = formatJobContext(job.context);
    if (contextStr) {
      parts.push("");
      parts.push("Additional context:");
      parts.push(contextStr);
    }
  }

  parts.push("");
  parts.push(
    "Return a JSON object matching the Node schema. Wrap in ```json code fence."
  );

  return parts.join("\n");
}

/**
 * Format job context for the prompt
 */
function formatJobContext(context: Record<string, unknown>): string {
  const relevant: Record<string, unknown> = {};

  // Include relevant context fields
  if (context.existingNodeId) {
    relevant.existingNodeId = context.existingNodeId;
  }
  if (context.reason) {
    relevant.reason = context.reason;
  }
  if (context.boundaryType) {
    relevant.boundaryType = context.boundaryType;
  }

  if (Object.keys(relevant).length === 0) {
    return "";
  }

  return JSON.stringify(relevant, null, 2);
}

// =============================================================================
// Agent Invocation
// =============================================================================

/**
 * Invoke the pi agent to analyze a session
 */
export async function invokeAgent(
  job: AnalysisJob,
  config: DaemonConfig,
  logger: ProcessorLogger = consoleLogger
): Promise<AgentResult> {
  const startTime = Date.now();

  // Validate prompt file exists
  try {
    await fs.access(config.promptFile);
  } catch {
    return {
      success: false,
      rawOutput: "",
      error: `Prompt file not found: ${config.promptFile}`,
      exitCode: null,
      durationMs: Date.now() - startTime,
    };
  }

  // Validate session file exists
  try {
    await fs.access(job.sessionFile);
  } catch {
    return {
      success: false,
      rawOutput: "",
      error: `Session file not found: ${job.sessionFile}`,
      exitCode: null,
      durationMs: Date.now() - startTime,
    };
  }

  // Build skills arg (includes RLM only for large files)
  const skills = await buildSkillsArg(job.sessionFile);
  // Note: empty skills string is now allowed since RLM is conditional

  // Build prompt
  const prompt = buildAnalysisPrompt(job);

  // Build arguments for pi
  const args = [
    "--provider",
    config.provider,
    "--model",
    config.model,
    "--system-prompt",
    config.promptFile,
    // Only include --skills if we have skills to include
    ...(skills ? ["--skills", skills] : []),
    "--no-session",
    "--mode",
    "json",
    "-p",
    prompt,
  ];

  logger.debug(`Spawning: pi ${args.slice(0, -2).join(" ")} -p "..."`);

  // Spawn the process and collect output
  const spawnResult = await spawnPiProcess(
    args,
    config.analysisTimeoutMinutes,
    logger
  );

  const durationMs = Date.now() - startTime;

  // Handle spawn error
  if (spawnResult.spawnError) {
    return {
      success: false,
      rawOutput: spawnResult.stdout,
      error: `Failed to spawn pi: ${spawnResult.spawnError}`,
      exitCode: null,
      durationMs,
    };
  }

  // Handle timeout
  if (spawnResult.timedOut) {
    return {
      success: false,
      rawOutput: spawnResult.stdout,
      error: `Analysis timed out after ${config.analysisTimeoutMinutes} minutes`,
      exitCode: spawnResult.exitCode,
      durationMs,
    };
  }

  // Handle non-zero exit
  if (spawnResult.exitCode !== 0) {
    return {
      success: false,
      rawOutput: spawnResult.stdout,
      error: `Pi exited with code ${spawnResult.exitCode}: ${spawnResult.stderr.slice(0, 500)}`,
      exitCode: spawnResult.exitCode,
      durationMs,
    };
  }

  // Parse the output
  const parseResult = parseAgentOutput(spawnResult.stdout, logger);
  return {
    ...parseResult,
    exitCode: spawnResult.exitCode,
    durationMs,
  };
}

/** Result from spawning the pi process */
interface SpawnResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  spawnError?: string;
}

/**
 * Spawn the pi process and wait for completion
 */
function spawnPiProcess(
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

    // Set up timeout
    const timeout = setTimeout(() => {
      proc.kill("SIGTERM");
      logger.warn(`Analysis timed out after ${timeoutMinutes}m`);
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
      logger.warn(data.toString().trim());
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

/** Pi JSON mode event types */
interface PiJsonEvent {
  type: string;
  message?: PiMessage;
  messages?: PiMessage[];
  [key: string]: unknown;
}

interface PiMessage {
  role: string;
  content: PiContentBlock[];
}

interface PiContentBlock {
  type: string;
  text?: string;
  [key: string]: unknown;
}

/**
 * Parse the pi agent's JSON mode output
 */
export function parseAgentOutput(
  stdout: string,
  logger: ProcessorLogger = consoleLogger
): Omit<AgentResult, "exitCode" | "durationMs"> {
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
      // Skip non-JSON lines
      logger.debug(`Skipping non-JSON line: ${line.slice(0, 100)}...`);
    }
  }

  // Find the agent_end event with final messages
  const endEvent = events.find((e) => e.type === "agent_end");
  if (!endEvent?.messages) {
    return {
      success: false,
      rawOutput: stdout,
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
      rawOutput: stdout,
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
  const nodeData = extractNodeFromText(textContent, logger);

  if (!nodeData) {
    return {
      success: false,
      rawOutput: stdout,
      error: "Could not extract valid JSON from assistant response",
    };
  }

  return {
    success: true,
    rawOutput: stdout,
    nodeData,
  };
}

/**
 * Extract node JSON from text content
 * Handles both raw JSON and code-fenced JSON
 */
export function extractNodeFromText(
  text: string,
  logger: ProcessorLogger = consoleLogger
): AgentNodeOutput | undefined {
  // Try to find JSON in code fence first
  const fenceMatch = /```(?:json)?\s*\n([\s\S]*?)\n```/.exec(text);
  if (fenceMatch) {
    try {
      const parsed = JSON.parse(fenceMatch[1]) as AgentNodeOutput;
      if (isValidNodeOutput(parsed)) {
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
      const parsed = JSON.parse(jsonMatch[0]) as AgentNodeOutput;
      if (isValidNodeOutput(parsed)) {
        return parsed;
      }
      logger.warn("Raw JSON did not match expected schema");
    } catch (error) {
      logger.warn(`Failed to parse raw JSON: ${error}`);
    }
  }

  return undefined;
}

/**
 * Basic validation that output matches expected schema
 */
export function isValidNodeOutput(obj: unknown): obj is AgentNodeOutput {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }

  const node = obj as Record<string, unknown>;

  // Check required top-level fields
  if (!node.classification || typeof node.classification !== "object") {
    return false;
  }
  if (!node.content || typeof node.content !== "object") {
    return false;
  }
  if (!node.lessons || typeof node.lessons !== "object") {
    return false;
  }
  if (!node.observations || typeof node.observations !== "object") {
    return false;
  }
  if (!node.semantic || typeof node.semantic !== "object") {
    return false;
  }
  if (!node.daemonMeta || typeof node.daemonMeta !== "object") {
    return false;
  }

  // Check classification fields
  const classification = node.classification as Record<string, unknown>;
  if (typeof classification.type !== "string") {
    return false;
  }
  if (typeof classification.project !== "string") {
    return false;
  }

  // Check content fields
  const content = node.content as Record<string, unknown>;
  if (typeof content.summary !== "string") {
    return false;
  }
  if (typeof content.outcome !== "string") {
    return false;
  }

  return true;
}

// =============================================================================
// Processor Class
// =============================================================================

/** Processor configuration */
export interface ProcessorConfig {
  /** Daemon configuration */
  daemonConfig: DaemonConfig;
  /** Logger */
  logger?: ProcessorLogger;
}

/**
 * Job processor that invokes pi agents for analysis
 */
export class JobProcessor {
  private readonly config: DaemonConfig;
  private readonly logger: ProcessorLogger;

  constructor(processorConfig: ProcessorConfig) {
    this.config = processorConfig.daemonConfig;
    this.logger = processorConfig.logger ?? consoleLogger;
  }

  /**
   * Process a single analysis job
   */
  async process(job: AnalysisJob): Promise<AgentResult> {
    this.logger.info(
      `Processing job ${job.id}: ${job.type} for ${path.basename(job.sessionFile)}`
    );

    const result = await invokeAgent(job, this.config, this.logger);

    if (result.success) {
      this.logger.info(
        `Job ${job.id} completed in ${(result.durationMs / 1000).toFixed(1)}s`
      );
    } else {
      this.logger.error(`Job ${job.id} failed: ${result.error}`);
    }

    return result;
  }

  /**
   * Validate environment before processing
   * Returns validation result - does not throw
   */
  async validateEnvironment(): Promise<EnvironmentValidationResult> {
    // Check skills
    const skillsResult = await validateRequiredSkills();
    if (!skillsResult.valid) {
      return skillsResult;
    }

    // Check prompt file
    try {
      await fs.access(this.config.promptFile);
    } catch {
      return {
        valid: false,
        missingSkills: [],
        missingPromptFile: this.config.promptFile,
      };
    }

    return { valid: true, missingSkills: [] };
  }
}

/**
 * Create a job processor
 */
export function createProcessor(config: ProcessorConfig): JobProcessor {
  return new JobProcessor(config);
}
