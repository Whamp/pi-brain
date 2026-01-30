#!/usr/bin/env node
/**
 * Agent-Friendly Documentation Processor
 *
 * Transforms API Extractor's JSON doc model into formats optimized for AI agents.
 *
 * Output formats:
 * 1. agent-api-index.json - Flattened index of all exported symbols
 * 2. agent-function-catalog.json - Functions/methods with signatures and docs
 * 3. agent-type-registry.json - Types, interfaces, and their relationships
 * 4. agent-module-graph.json - Module dependency graph
 *
 * Usage:
 *   node scripts/agent-docs-processor.js
 *   node scripts/agent-docs-processor.js --format json
 *   node scripts/agent-docs-processor.js --query "functionName"
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const apiJsonPath = join(rootDir, "docs/api/pi-brain.api.json");
const outputDir = join(rootDir, "docs/api/agent");

// Parse arguments
const args = process.argv.slice(2);
const queryMode = args.find((arg) => arg.startsWith("--query="))?.split("=")[1];

/**
 * Load the API doc model
 */
function loadDocModel() {
  if (!existsSync(apiJsonPath)) {
    throw new Error(
      `API doc model not found at ${apiJsonPath}\n` +
        `Run 'npm run docs:generate' first to generate the doc model.`
    );
  }

  const content = readFileSync(apiJsonPath, "utf8");
  return JSON.parse(content);
}

/**
 * Process doc comment to extract description
 */
function extractDescription(docComment) {
  if (!docComment) {
    return "";
  }

  // Extract text from JSDoc comment
  const lines = docComment.split("\n");
  const description = [];

  for (const line of lines) {
    const trimmed = line.replace(/^\s*\*\s?/, "").trim();
    if (trimmed && !trimmed.startsWith("@")) {
      description.push(trimmed);
    }
  }

  return description.join(" ").trim();
}

/**
 * Extract tags from doc comment
 */
function extractTags(docComment) {
  if (!docComment) {
    return {};
  }

  const tags = {};
  const lines = docComment.split("\n");

  for (const line of lines) {
    const match = line.match(/^\s*\*\s*@(\w+)\s*(.*)$/);
    if (match) {
      const [, tagName, content] = match;
      if (!tags[tagName]) {
        tags[tagName] = [];
      }
      tags[tagName].push(content.trim());
    }
  }

  return tags;
}

/**
 * Add function/method details to entry
 */
function addFunctionDetails(entry, member) {
  entry.parameters = (member.parameters || []).map((p) => ({
    name: p.parameterName,
    type: extractTypeText(p.parameterTypeTokenRange, member.excerptTokens),
    optional: p.isOptional || false,
  }));
  entry.returnType = extractTypeText(
    member.returnTypeTokenRange,
    member.excerptTokens
  );
  entry.overloadIndex = member.overloadIndex;
}

/**
 * Add class/interface details to entry
 */
function addClassDetails(entry, member) {
  entry.extends =
    member.extendsTokenRanges?.map((r) =>
      extractTypeText(r, member.excerptTokens)
    ) || [];
  entry.implements =
    member.implementsTokenRanges?.map((r) =>
      extractTypeText(r, member.excerptTokens)
    ) || [];
}

/**
 * Add property details to entry
 */
function addPropertyDetails(entry, member) {
  entry.propertyType = extractTypeText(
    member.propertyTypeTokenRange,
    member.excerptTokens
  );
  entry.isOptional = member.isOptional || false;
  entry.isReadonly = member.isReadonly || false;
}

/**
 * Add kind-specific details to an entry
 */
function addKindDetails(entry, member) {
  switch (member.kind) {
    case "Function":
    case "Method":
    case "MethodSignature": {
      addFunctionDetails(entry, member);
      break;
    }
    case "Interface":
    case "Class": {
      addClassDetails(entry, member);
      break;
    }
    case "Property":
    case "PropertySignature": {
      addPropertyDetails(entry, member);
      break;
    }
    case "TypeAlias": {
      entry.type = extractTypeText(member.typeTokenRange, member.excerptTokens);
      break;
    }
    default: {
      // Other kinds don't need special handling
      break;
    }
  }
}

/**
 * Process a single member into an entry
 */
function processMember(member, currentPath) {
  return {
    kind: member.kind,
    name: member.name,
    canonicalReference: member.canonicalReference,
    path: currentPath,
    description: extractDescription(member.docComment),
    tags: extractTags(member.docComment),
    releaseTag: member.releaseTag || "public",
  };
}

/**
 * Recursively traverse API members
 */
function traverseMembers(members, path = "") {
  const results = [];

  for (const member of members || []) {
    const currentPath = path ? `${path}.${member.name}` : member.name;
    const entry = processMember(member, currentPath);
    addKindDetails(entry, member);
    results.push(entry);

    if (member.members) {
      results.push(...traverseMembers(member.members, currentPath));
    }
  }

  return results;
}

/**
 * Extract type text from token range
 */
function extractTypeText(tokenRange, excerptTokens) {
  if (!tokenRange || !excerptTokens) {
    return "any";
  }

  const tokens = [];
  for (let i = tokenRange.startIndex; i < tokenRange.endIndex; i++) {
    const token = excerptTokens[i];
    if (token && token.text) {
      tokens.push(token.text);
    }
  }

  return tokens.join("").trim() || "any";
}

/**
 * Generate agent API index
 */
function generateApiIndex(docModel) {
  const entries = [];

  for (const member of docModel.members || []) {
    if (member.kind === "EntryPoint") {
      entries.push(...traverseMembers(member.members));
    }
  }

  return {
    metadata: {
      tool: "agent-docs-processor",
      version: "1.0.0",
      generatedAt: new Date().toISOString(),
      packageName: docModel.name,
      packageVersion: docModel.metadata?.toolVersion || "unknown",
    },
    summary: {
      totalSymbols: entries.length,
      byKind: countByKey(entries, "kind"),
    },
    entries,
  };
}

/**
 * Count items by a key property
 */
function countByKey(items, key) {
  const counts = {};
  for (const item of items) {
    const value = item[key];
    counts[value] = (counts[value] || 0) + 1;
  }
  return counts;
}

/**
 * Generate function catalog
 */
function generateFunctionCatalog(apiIndex) {
  const functions = apiIndex.entries.filter((e) =>
    ["Function", "Method", "MethodSignature"].includes(e.kind)
  );

  // Count by namespace (first path segment)
  const byPath = {};
  for (const f of functions) {
    const [namespace] = f.path.split(".");
    byPath[namespace] = (byPath[namespace] || 0) + 1;
  }

  const catalog = {
    metadata: apiIndex.metadata,
    summary: {
      totalFunctions: functions.length,
      byPath,
    },
    functions: functions.map((f) => ({
      name: f.name,
      path: f.path,
      description: f.description,
      parameters: f.parameters,
      returnType: f.returnType,
      releaseTag: f.releaseTag,
      tags: f.tags,
    })),
  };

  return catalog;
}

/**
 * Generate type registry
 */
function generateTypeRegistry(apiIndex) {
  const types = apiIndex.entries.filter((e) =>
    ["Interface", "TypeAlias", "Class", "Enum"].includes(e.kind)
  );

  const registry = {
    metadata: apiIndex.metadata,
    summary: {
      totalTypes: types.length,
      byKind: countByKey(types, "kind"),
    },
    types: types.map((t) => ({
      name: t.name,
      kind: t.kind,
      path: t.path,
      description: t.description,
      extends: t.extends,
      implements: t.implements,
      type: t.type,
      releaseTag: t.releaseTag,
    })),
  };

  return registry;
}

/**
 * Query the API index
 */
function queryApi(apiIndex, query) {
  const lowerQuery = query.toLowerCase();

  const matches = apiIndex.entries.filter((e) => {
    const nameMatch = e.name?.toLowerCase().includes(lowerQuery) || false;
    const pathMatch = e.path?.toLowerCase().includes(lowerQuery) || false;
    const descMatch =
      e.description?.toLowerCase().includes(lowerQuery) || false;
    return nameMatch || pathMatch || descMatch;
  });

  return {
    query,
    totalMatches: matches.length,
    matches: matches.slice(0, 20), // Limit to first 20
  };
}

/**
 * Main processing
 */
function main() {
  console.log("🤖 Agent Documentation Processor");
  console.log("=================================\n");

  try {
    const docModel = loadDocModel();
    console.log(`📄 Loaded doc model for package: ${docModel.name}`);

    // Generate API index
    console.log("🔍 Generating API index...");
    const apiIndex = generateApiIndex(docModel);

    if (queryMode) {
      // Query mode
      const results = queryApi(apiIndex, queryMode);
      console.log("\n🔎 Query Results:");
      console.log(JSON.stringify(results, null, 2));
      return;
    }

    // Generate all outputs
    console.log("📚 Generating function catalog...");
    const functionCatalog = generateFunctionCatalog(apiIndex);

    console.log("📐 Generating type registry...");
    const typeRegistry = generateTypeRegistry(apiIndex);

    // Write outputs
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    writeFileSync(
      join(outputDir, "agent-api-index.json"),
      JSON.stringify(apiIndex, null, 2)
    );

    writeFileSync(
      join(outputDir, "agent-function-catalog.json"),
      JSON.stringify(functionCatalog, null, 2)
    );

    writeFileSync(
      join(outputDir, "agent-type-registry.json"),
      JSON.stringify(typeRegistry, null, 2)
    );

    console.log("\n✅ Agent documentation generated!");
    console.log("\nOutput files:");
    console.log("  📄 agent-api-index.json - Complete API index");
    console.log("  📄 agent-function-catalog.json - Function reference");
    console.log("  📄 agent-type-registry.json - Type definitions");
    console.log(`\nLocation: ${outputDir}`);

    // Print summary
    console.log("\n📊 Summary:");
    console.log(`  Total symbols: ${apiIndex.summary.totalSymbols}`);
    console.log("  By kind:");
    for (const [kind, count] of Object.entries(apiIndex.summary.byKind)) {
      console.log(`    ${kind}: ${count}`);
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

main();
