<script lang="ts">
  import type { SearchResult, NodeType, Outcome } from "$lib/types";
  import { formatDistanceToNow, parseDate } from "$lib/utils/date";
  import SafeHighlight from "./safe-highlight.svelte";

  interface Props {
    result: SearchResult;
  }

  const { result }: Props = $props();

  // Derive node from props to avoid stale reference warning
  const node = $derived(result.node);

  function getOutcomeIcon(outcome: Outcome): string {
    switch (outcome) {
      case "success": {
        return "🟢";
      }
      case "partial": {
        return "🟡";
      }
      case "failed": {
        return "🔴";
      }
      case "abandoned": {
        return "⚪";
      }
      default: {
        return "⚪";
      }
    }
  }

  function getNodeIcon(type: NodeType): string {
    switch (type) {
      case "coding": {
        return "💻";
      }
      case "debugging": {
        return "🐛";
      }
      case "research": {
        return "🔍";
      }
      case "planning": {
        return "📋";
      }
      case "refactoring": {
        return "🔄";
      }
      case "documentation": {
        return "📝";
      }
      case "configuration": {
        return "🔧";
      }
      case "sysadmin": {
        return "⚙️";
      }
      case "qa": {
        return "✅";
      }
      case "brainstorm": {
        return "💡";
      }
      case "handoff": {
        return "🤝";
      }
      default: {
        return "📦";
      }
    }
  }

  const projectName = $derived(node.classification.project.split("/").pop() ?? "unknown");
  const outcomeIcon = $derived(getOutcomeIcon(node.content.outcome));
  const typeIcon = $derived(getNodeIcon(node.classification.type));
  const timeAgo = $derived(formatDistanceToNow(parseDate(node.metadata.timestamp)));
</script>

<a href="/nodes/{node.id}" class="result-card">
  <div class="result-header">
    <div class="result-score">
      <span class="score-value">{Math.round(result.score * 100)}%</span>
      <span class="score-label">match</span>
    </div>
    <div class="result-meta">
      <span class="outcome-icon">{outcomeIcon}</span>
      <span class="node-type">{typeIcon} {node.classification.type}</span>
      <span class="separator">•</span>
      <span class="project-name">{projectName}</span>
      <span class="separator">•</span>
      <span class="time-ago">{timeAgo}</span>
    </div>
  </div>

  <h3 class="result-title">{node.content.summary}</h3>

  {#if result.highlights.length > 0}
    <div class="highlights">
      {#each result.highlights as highlight}
        <div class="highlight-item">
          <span class="highlight-field">{highlight.field}</span>
          <span class="highlight-snippet">
            <SafeHighlight snippet={highlight.snippet} />
          </span>
        </div>
      {/each}
    </div>
  {/if}

  {#if node.semantic.tags.length > 0}
    <div class="tags">
      {#each node.semantic.tags.slice(0, 5) as tag}
        <span class="tag">#{tag}</span>
      {/each}
    </div>
  {/if}
</a>

<style>
  .result-card {
    display: block;
    padding: var(--space-4);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    text-decoration: none;
    color: inherit;
    transition: border-color 0.15s ease, background 0.15s ease;
  }

  .result-card:hover {
    border-color: var(--color-accent);
    background: var(--color-bg-hover);
  }

  .result-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-3);
  }

  .result-score {
    display: flex;
    align-items: baseline;
    gap: var(--space-1);
    padding: var(--space-1) var(--space-2);
    background: var(--color-accent-muted);
    border-radius: 4px;
    color: var(--color-accent);
  }

  .score-value {
    font-weight: 700;
    font-size: var(--text-sm);
  }

  .score-label {
    font-size: var(--text-xs);
    text-transform: uppercase;
  }

  .result-meta {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }

  .outcome-icon {
    font-size: var(--text-sm);
  }

  .node-type {
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }

  .separator {
    color: var(--color-text-subtle);
  }

  .project-name {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    padding: 2px 6px;
    background: var(--color-bg);
    border-radius: 4px;
  }

  .time-ago {
    font-size: var(--text-sm);
  }

  .result-title {
    margin: 0 0 var(--space-3) 0;
    font-size: var(--text-base);
    font-weight: 600;
    line-height: 1.4;
  }

  .highlights {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin-bottom: var(--space-3);
  }

  .highlight-item {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .highlight-field {
    font-size: var(--text-xs);
    color: var(--color-text-subtle);
    text-transform: uppercase;
    font-weight: 500;
  }

  .highlight-snippet {
    font-size: var(--text-sm);
    line-height: 1.5;
    color: var(--color-text-muted);
  }

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
  }

  .tag {
    padding: 2px 8px;
    background: var(--color-bg);
    border: 1px solid var(--color-border-subtle);
    border-radius: 4px;
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }
</style>
