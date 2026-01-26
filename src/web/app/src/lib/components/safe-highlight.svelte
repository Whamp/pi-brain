<script lang="ts">
  /**
   * SafeHighlight - Safely renders text with <mark> highlighting
   *
   * This component parses a snippet containing <mark> tags for highlighting
   * and renders them safely without using the html directive. Only <mark> and </mark>
   * tags are recognized; all other HTML is escaped and rendered as text.
   */

  interface Props {
    snippet: string;
  }

  interface TextSegment {
    type: "text" | "mark";
    content: string;
  }

  const { snippet }: Props = $props();

  /**
   * Parse snippet into segments of plain text and marked (highlighted) text.
   * Only recognizes <mark> and </mark> tags - everything else is treated as plain text.
   */
  function parseSnippet(raw: string): TextSegment[] {
    const segments: TextSegment[] = [];
    // Match only <mark> and </mark> tags (case-insensitive)
    const regex = /<mark>(.*?)<\/mark>/gi;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    match = regex.exec(raw);
    while (match !== null) {
      // Add text before this match
      if (match.index > lastIndex) {
        segments.push({
          type: "text",
          content: raw.slice(lastIndex, match.index),
        });
      }
      // Add the highlighted content
      segments.push({
        type: "mark",
        content: match[1],
      });
      ({ lastIndex } = regex);
      match = regex.exec(raw);
    }

    // Add remaining text after last match
    if (lastIndex < raw.length) {
      segments.push({
        type: "text",
        content: raw.slice(lastIndex),
      });
    }

    return segments;
  }

  const segments = $derived(parseSnippet(snippet));
</script>

{#each segments as segment}
  {#if segment.type === "mark"}
    <mark>{segment.content}</mark>
  {:else}
    {segment.content}
  {/if}
{/each}

<style>
  mark {
    background: var(--color-accent-muted);
    color: var(--color-accent);
    padding: 0 2px;
    border-radius: 2px;
  }
</style>
