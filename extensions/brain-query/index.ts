import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

import { Type } from "@sinclair/typebox";

interface BrainQueryResponse {
  status: "success" | "error";
  data?: {
    answer?: string;
    summary?: string;
    relatedNodes?: unknown[];
    sources?: unknown[];
  };
  error?: {
    message: string;
  };
}

/** Valid flag types for manual notation */
type FlagType = "quirk" | "failure" | "win" | "note";

const VALID_FLAG_TYPES: readonly FlagType[] = [
  "quirk",
  "failure",
  "win",
  "note",
] as const;

/**
 * Parse --flag or -f arguments from input
 * Formats:
 *   /brain --flag <type> <message>
 *   /brain -f <type> <message>
 *   /brain --flag:<type> <message>
 *   /brain -f:<type> <message>
 */
function parseFlagCommand(input: string): {
  isFlag: boolean;
  type?: FlagType;
  message?: string;
  error?: string;
} {
  // Check for --flag or -f prefix
  const flagPrefixMatch = input.match(/^(?:--flag|-f)(?::(\w+))?\s*(.*)/);
  if (!flagPrefixMatch) {
    return { isFlag: false };
  }

  const [, inlineType, rawRemaining] = flagPrefixMatch;
  let remaining = rawRemaining?.trim() ?? "";

  let flagType: FlagType;
  let message: string;

  if (inlineType) {
    // Format: --flag:type message
    if (!VALID_FLAG_TYPES.includes(inlineType as FlagType)) {
      return {
        isFlag: true,
        error: `Invalid flag type "${inlineType}". Valid types: ${VALID_FLAG_TYPES.join(", ")}`,
      };
    }
    flagType = inlineType as FlagType;
    message = remaining;
  } else {
    // Format: --flag type message
    const parts = remaining.split(/\s+/);
    const typeArg = parts[0]?.toLowerCase();

    if (!typeArg) {
      return {
        isFlag: true,
        error: `Missing flag type. Usage: /brain --flag <${VALID_FLAG_TYPES.join("|")}> <message>`,
      };
    }

    if (!VALID_FLAG_TYPES.includes(typeArg as FlagType)) {
      return {
        isFlag: true,
        error: `Invalid flag type "${typeArg}". Valid types: ${VALID_FLAG_TYPES.join(", ")}`,
      };
    }

    flagType = typeArg as FlagType;
    message = parts.slice(1).join(" ");
  }

  if (!message) {
    return {
      isFlag: true,
      error: `Missing message. Usage: /brain --flag ${flagType} <message>`,
    };
  }

  return { isFlag: true, type: flagType, message };
}

export default function brainExtension(pi: ExtensionAPI) {
  // Register /brain command for USER queries and manual flags
  // Usage:
  //   /brain <question>           - Query the knowledge graph
  //   /brain --flag <type> <msg>  - Record a manual flag
  //   /brain -f <type> <msg>      - Record a manual flag (short form)
  pi.registerCommand("brain", {
    description: "Query the pi-brain knowledge graph",
    handler: async (input, ctx) => {
      if (!input) {
        ctx.ui.notify(
          "Usage: /brain <question> OR /brain --flag <type> <message>",
          "error"
        );
        return;
      }

      // Check if this is a --flag command
      const flagResult = parseFlagCommand(input);

      if (flagResult.isFlag) {
        // Handle --flag command
        if (flagResult.error) {
          ctx.ui.notify(flagResult.error, "error");
          return;
        }

        // Write the flag as a custom entry to the session
        pi.appendEntry("brain_flag", {
          type: flagResult.type,
          message: flagResult.message,
        });

        ctx.ui.notify(
          `Recorded ${flagResult.type}: ${flagResult.message}`,
          "success"
        );
        return;
      }

      // Otherwise, treat as a query
      const query = input;

      try {
        // Query the brain API
        const response = await fetch("http://localhost:8765/api/v1/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query,
            context: {
              project: ctx.cwd,
              model: ctx.model
                ? `${ctx.model.provider}/${ctx.model.id}`
                : undefined,
            },
          }),
        });

        if (!response.ok) {
          throw new Error(
            `API Error: ${response.status} ${response.statusText}`
          );
        }

        const result = (await response.json()) as BrainQueryResponse;

        // Display summary notification
        if (result.status === "success" && result.data) {
          ctx.ui.notify(result.data.summary || "Query successful", "info");

          // Inject detailed answer into conversation as a follow-up message
          if (result.data.answer) {
            pi.sendUserMessage(
              `Based on pi-brain analysis:\n\n${result.data.answer}`,
              { deliverAs: "followUp" }
            );
          }
        } else {
          ctx.ui.notify("Query failed: Invalid response format", "error");
        }
      } catch (error) {
        ctx.ui.notify(`Query failed: ${(error as Error).message}`, "error");
      }
    },
  });

  // Register brain_query tool for AGENT queries
  // Agents can use this tool to query the knowledge graph programmatically
  pi.registerTool({
    name: "brain_query",
    label: "Brain Query",
    description:
      "Query the pi-brain knowledge graph for past decisions, lessons, and patterns. Use this to check if similar problems were solved before, find project context, or learn from past sessions.",
    parameters: Type.Object({
      query: Type.String({
        description:
          "Natural language query about past sessions, decisions, or lessons",
      }),
    }),
    async execute(toolCallId, params, onUpdate, ctx, signal) {
      try {
        const response = await fetch("http://localhost:8765/api/v1/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: params.query,
            context: {
              project: ctx.cwd,
              model: ctx.model
                ? `${ctx.model.provider}/${ctx.model.id}`
                : undefined,
            },
          }),
          signal,
        });

        if (!response.ok) {
          return {
            content: [
              {
                type: "text",
                text: `Error querying brain: ${response.status} ${response.statusText}`,
              },
            ],
            isError: true,
            details: undefined,
          };
        }

        const result = (await response.json()) as BrainQueryResponse;

        if (result.status === "success" && result.data) {
          return {
            content: [{ type: "text", text: result.data.answer ?? "" }],
            details: {
              nodes: result.data.relatedNodes,
              sources: result.data.sources,
            },
          };
        }
        return {
          content: [
            {
              type: "text",
              text: "Error: Invalid response from brain service",
            },
          ],
          isError: true,
          details: undefined,
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error querying brain: ${(error as Error).message}`,
            },
          ],
          isError: true,
          details: undefined,
        };
      }
    },
  });
}
