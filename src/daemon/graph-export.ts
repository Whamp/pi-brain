/**
 * Graphviz/DOT export utilities
 */

import * as fs from "node:fs";
import * as path from "node:path";

import type { NodeRow } from "../storage/node-crud.js";

import { loadConfig } from "../config/index.js";
import { openDatabase, migrate } from "../storage/database.js";
import { getAllEdges, edgeRowToEdge } from "../storage/edge-repository.js";
import { listNodes } from "../storage/node-queries.js";

export interface GraphExportOptions {
  project?: string;
  limit?: number;
  depth?: number;
  root?: string;
}

/**
 * Export knowledge graph to Graphviz DOT format
 */
export function exportGraphviz(
  outputPath: string,
  configPath?: string,
  options: GraphExportOptions = {}
): { success: boolean; message: string } {
  const config = loadConfig(configPath);
  const dbPath = path.join(config.hub.databaseDir, "brain.db");
  const db = openDatabase({ path: dbPath });
  migrate(db);

  try {
    // Fetch nodes with filters
    const nodesResult = listNodes(
      db,
      {
        project: options.project,
      },
      {
        limit: options.limit || 1000,
      }
    );

    const { nodes } = nodesResult;
    const nodeIds = new Set(nodes.map((n) => n.id));

    // Fetch all edges and filter
    const allEdges = getAllEdges(db);
    const edges = allEdges
      .map(edgeRowToEdge)
      .filter(
        (e) => nodeIds.has(e.sourceNodeId) && nodeIds.has(e.targetNodeId)
      );

    // Generate DOT
    let dot = "digraph PiBrain {\n";
    dot += "  rankdir=LR;\n";
    dot +=
      '  node [shape=box, style=filled, fillcolor=white, fontname="Helvetica"];\n';
    dot += '  edge [fontname="Helvetica"];\n';

    // Nodes
    for (const node of nodes) {
      const label = formatNodeLabel(node);
      const color = getNodeColor(node.type);
      const tooltip = escapeString(node.summary || "");
      dot += `  "${node.id}" [label="${label}", fillcolor="${color}", tooltip="${tooltip}"];\n`;
    }

    // Edges
    for (const edge of edges) {
      const style = getEdgeStyle(edge.type);
      const label = edge.type;
      dot += `  "${edge.sourceNodeId}" -> "${edge.targetNodeId}" [label="${label}", style="${style}", fontsize=10];\n`;
    }

    dot += "}\n";

    fs.writeFileSync(outputPath, dot, "utf8");

    return {
      success: true,
      message: `Exported ${nodes.length} nodes and ${edges.length} edges to ${outputPath}`,
    };
  } finally {
    db.close();
  }
}

function escapeString(str: string): string {
  return str.replaceAll('"', String.raw`\"`).replaceAll("\n", String.raw`\n`);
}

function formatNodeLabel(node: NodeRow): string {
  const summary = escapeString(node.summary || "No summary");
  const { type } = node;
  // Truncate summary to 30 chars
  const truncatedSummary =
    summary.length > 30 ? summary.slice(0, 30) + "..." : summary;
  return `${type}\\n${truncatedSummary}`;
}

function getNodeColor(type: string): string {
  // Map types to colors (light pastels)
  const colors: Record<string, string> = {
    coding: "#e3f2fd", // blue
    debugging: "#ffebee", // red
    planning: "#f3e5f5", // purple
    research: "#e8f5e9", // green
    analysis: "#fff3e0", // orange
    handoff: "#eceff1", // grey
  };
  return colors[type] || "#ffffff";
}

function getEdgeStyle(type: string): string {
  if (type === "branch" || type === "fork") {
    return "solid";
  }
  if (type === "resume") {
    return "dashed";
  }
  if (type === "semantic") {
    return "dotted";
  }
  return "solid";
}
