/**
 * Export utilities for fine-tuning and data analysis
 */

import * as fs from "node:fs";
import * as path from "node:path";

import type { SessionEntry } from "../types.js";

import { loadConfig } from "../config/index.js";
import { parseSession } from "../parser/session.js";
import { listNodeFiles, readNodeFromPath } from "../storage/node-storage.js";

/**
 * Extract entries within a segment range
 */
export function getSegmentEntries(
  entries: SessionEntry[],
  startId: string,
  endId: string
): SessionEntry[] {
  const startIdx = entries.findIndex((e) => e.id === startId);
  const endIdx = entries.findIndex((e) => e.id === endId);

  if (startIdx === -1 || endIdx === -1 || startIdx > endIdx) {
    return [];
  }

  return entries.slice(startIdx, endIdx + 1);
}

/**
 * Export fine-tuning data to JSONL
 *
 * Format:
 * {
 *   "input": <JSON string of segment entries>,
 *   "output": <JSON string of node analysis>
 * }
 */
export async function exportFineTuneData(
  outputPath: string,
  configPath?: string
): Promise<{ success: boolean; message: string; count: number }> {
  try {
    const config = loadConfig(configPath);
    const nodesDir = path.join(config.hub.databaseDir, "nodes");

    if (!fs.existsSync(nodesDir)) {
      return {
        success: false,
        message: `Nodes directory not found: ${nodesDir}`,
        count: 0,
      };
    }

    const files = listNodeFiles({ nodesDir });
    const outStream = fs.createWriteStream(outputPath, { encoding: "utf8" });
    let count = 0;

    console.log(`Scanning ${files.length} node files...`);

    for (const file of files) {
      try {
        const node = readNodeFromPath(file);

        // Skip nodes without complete segment info
        if (
          !node.source.segment ||
          !node.source.segment.startEntryId ||
          !node.source.segment.endEntryId
        ) {
          continue;
        }

        // Read session
        const sessionPath = node.source.sessionFile;
        if (!fs.existsSync(sessionPath)) {
          // Try resolving relative to sessions dir if absolute path fails
          // This handles cases where session_file stored might be relative or moved
          continue;
        }

        const session = await parseSession(sessionPath);
        const segmentEntries = getSegmentEntries(
          session.entries,
          node.source.segment.startEntryId,
          node.source.segment.endEntryId
        );

        if (segmentEntries.length === 0) {
          continue;
        }

        // Create fine-tuning example
        // Input: The raw session segment
        // Output: The structured node analysis
        const example = {
          messages: [
            {
              role: "system",
              content:
                "You are an expert session analyzer. Analyze the following session segment and produce a structured JSON analysis.",
            },
            {
              role: "user",
              content: JSON.stringify(segmentEntries),
            },
            {
              role: "assistant",
              content: JSON.stringify(node),
            },
          ],
        };

        outStream.write(`${JSON.stringify(example)}\n`);
        count++;

        if (count % 100 === 0) {
          process.stdout.write(`\rExported ${count} examples...`);
        }
      } catch {
        // Skip malformed nodes or sessions
        continue;
      }
    }

    outStream.end();
    await new Promise<void>((resolve) => {
      outStream.on("finish", resolve);
    });

    console.log(`\nExport complete. Wrote ${count} examples to ${outputPath}`);

    return {
      success: true,
      message: `Successfully exported ${count} examples to ${outputPath}`,
      count,
    };
  } catch (error) {
    return {
      success: false,
      message: `Export failed: ${(error as Error).message}`,
      count: 0,
    };
  }
}
