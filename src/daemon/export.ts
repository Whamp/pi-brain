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
 * Check if a node has complete segment info for export
 */
function hasCompleteSegmentInfo(node: {
  source: {
    segment?: { startEntryId?: string; endEntryId?: string };
    sessionFile: string;
  };
}): node is {
  source: {
    segment: { startEntryId: string; endEntryId: string };
    sessionFile: string;
  };
} {
  return Boolean(
    node.source.segment?.startEntryId && node.source.segment?.endEntryId
  );
}

/**
 * Create a fine-tuning example from segment entries and node
 */
function createFineTuneExample(
  segmentEntries: SessionEntry[],
  node: unknown
): object {
  return {
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
}

/**
 * Process a single node file and write fine-tuning example if valid
 * Returns 1 if example was written, 0 otherwise
 */
async function processNodeFile(
  file: string,
  outStream: fs.WriteStream
): Promise<number> {
  const node = readNodeFromPath(file);

  if (!hasCompleteSegmentInfo(node)) {
    return 0;
  }

  const sessionPath = node.source.sessionFile;
  if (!fs.existsSync(sessionPath)) {
    return 0;
  }

  const session = await parseSession(sessionPath);
  const segmentEntries = getSegmentEntries(
    session.entries,
    node.source.segment.startEntryId,
    node.source.segment.endEntryId
  );

  if (segmentEntries.length === 0) {
    return 0;
  }

  const example = createFineTuneExample(segmentEntries, node);
  outStream.write(`${JSON.stringify(example)}\n`);
  return 1;
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
        count += await processNodeFile(file, outStream);

        if (count > 0 && count % 100 === 0) {
          process.stdout.write(`\rExported ${count} examples...`);
        }
      } catch {
        // Skip malformed nodes or sessions
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
