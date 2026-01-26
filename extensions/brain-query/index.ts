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

export default function brainExtension(pi: ExtensionAPI) {
  // Register /brain command for USER queries
  // Usage: /brain why did auth fail last month?
  pi.registerCommand("brain", {
    description: "Query the pi-brain knowledge graph",
    handler: async (query, ctx) => {
      if (!query) {
        ctx.ui.notify("Usage: /brain <your question>", "error");
        return;
      }

      try {
        // Query the brain API
        const response = await fetch("http://localhost:8765/api/v1/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query,
            context: {
              project: ctx.cwd,
              model: ctx.model,
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
              model: ctx.model,
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
