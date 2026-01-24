#!/usr/bin/env node
/**
 * CLI for pi-tree-viz
 * Generate interactive HTML visualization of pi sessions
 */

import { Command } from 'commander';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { watch } from 'node:fs';
import open from 'open';

import { scanSessions, findForkRelationships, getDefaultSessionDir, getOverallStats } from './analyzer.js';
import { generateHTML } from './generator.js';

const program = new Command();

program
  .name('pi-tree-viz')
  .description('Generate interactive HTML visualization of pi coding agent sessions')
  .version('0.1.0')
  .option('-o, --output <path>', 'Output HTML file', 'pi-sessions.html')
  .option('-d, --session-dir <path>', 'Session directory', getDefaultSessionDir())
  .option('-w, --watch', 'Watch for changes and regenerate')
  .option('--open', 'Open in browser after generation')
  .option('-p, --project <path>', 'Filter to specific project path')
  .option('-q, --quiet', 'Suppress output except errors')
  .action(async (options) => {
    const log = options.quiet ? () => {} : console.log;

    try {
      const outputPath = resolve(options.output);
      const sessionDir = resolve(options.sessionDir);

      async function generate() {
        log(`Scanning sessions in ${sessionDir}...`);
        
        let sessions = await scanSessions(sessionDir);
        
        if (options.project) {
          sessions = sessions.filter(s => s.header.cwd === options.project);
          log(`Filtered to ${sessions.length} sessions for project: ${options.project}`);
        }

        if (sessions.length === 0) {
          console.error('No sessions found');
          process.exit(1);
        }

        const stats = getOverallStats(sessions);
        log(`Found ${stats.totalSessions} sessions across ${stats.projectCount} projects`);
        log(`Total: ${stats.totalEntries.toLocaleString()} entries, ${stats.totalMessages.toLocaleString()} messages`);

        const forks = findForkRelationships(sessions);
        if (forks.length > 0) {
          log(`Found ${forks.length} fork relationships`);
        }

        log(`Generating visualization...`);
        const html = generateHTML(sessions, forks);

        await writeFile(outputPath, html, 'utf-8');
        log(`✓ Written to ${outputPath}`);
        
        return outputPath;
      }

      const generatedPath = await generate();

      if (options.open) {
        log(`Opening in browser...`);
        await open(generatedPath);
      }

      if (options.watch) {
        log(`\nWatching for changes in ${sessionDir}...`);
        log(`Press Ctrl+C to stop\n`);

        let debounceTimer: ReturnType<typeof setTimeout> | null = null;

        // Watch the session directory recursively
        const watcher = watch(sessionDir, { recursive: true }, (_eventType, filename) => {
          if (!filename?.endsWith('.jsonl')) return;

          // Debounce to avoid multiple regenerations
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(async () => {
            log(`\nChange detected: ${filename}`);
            try {
              await generate();
            } catch (e) {
              console.error('Regeneration failed:', e);
            }
          }, 500);
        });

        // Keep process running
        process.on('SIGINT', () => {
          watcher.close();
          log('\nStopped watching');
          process.exit(0);
        });
      }
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  });

program.parse();
