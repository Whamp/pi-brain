<script lang="ts">
  /**
   * Displays truncated text with a tooltip showing the full value on hover.
   * Useful for long model names, paths, or other text that may overflow.
   */
  interface Props {
    /** Full text value */
    text: string;
    /** Optional abbreviated display text (defaults to full text) */
    displayText?: string;
    /** Maximum width before truncation (CSS value) */
    maxWidth?: string;
    /** Use monospace font */
    mono?: boolean;
  }

  let { text, displayText, maxWidth = "180px", mono = true }: Props = $props();

  const display = $derived(displayText ?? text);
  const showTooltip = $derived(display !== text || display.length > 20);
</script>

<span
  class="truncated-text"
  class:mono
  style:max-width={maxWidth}
  title={showTooltip ? text : undefined}
>
  {display}
</span>

<style>
  .truncated-text {
    display: inline-block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    vertical-align: bottom;
  }

  .mono {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
  }
</style>
