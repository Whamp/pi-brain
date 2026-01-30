<script lang="ts">
  import type { Snippet } from "svelte";

  interface TooltipArgs {
    data: number[];
    last: number;
    trend: "up" | "down" | "neutral" | undefined;
  }

  interface Props {
    data: number[];
    color?: string;
    height?: number;
    width?: number;
    showLast?: boolean;
    trend?: "up" | "down" | "neutral";
    tooltip?: Snippet<[TooltipArgs]>;
  }

  let {
    data,
    color = "var(--color-accent)",
    height = 40,
    width = 200,
    showLast = false,
    trend,
    tooltip,
  }: Props = $props();

  // Calculate SVG path
  const svgPath = $derived.by(() => {
    if (data.length < 2) {
      return "";
    }

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const step = width / (data.length - 1);

    let path = `M 0 ${height - ((data[0] - min) / range) * height}`;
    for (let i = 1; i < data.length; i++) {
      const x = i * step;
      const y = height - ((data[i] - min) / range) * height;
      path += ` L ${x} ${y}`;
    }

    return path;
  });

  // Calculate area path (filled)
  const areaPath = $derived.by(() => {
    if (!svgPath) {
      return "";
    }
    return `${svgPath} L ${width} ${height} L 0 ${height} Z`;
  });

  const lastValue = $derived(data.at(-1) ?? 0);
</script>

<svg
  {width}
  {height}
  class="sparkline"
  role="img"
  aria-label="Sparkline chart showing trend"
>
  {#if data.length > 1}
    <defs>
      <linearGradient id="sparkline-gradient-{color}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color={color} stop-opacity="0.3" />
        <stop offset="100%" stop-color={color} stop-opacity="0" />
      </linearGradient>
    </defs>

    <!-- Area fill -->
    <path
      d={areaPath}
      fill="url(#sparkline-gradient-{color})"
      class="sparkline-area"
    />

    <!-- Line -->
    <path d={svgPath} fill="none" stroke={color} stroke-width="2" class="sparkline-line" />

    <!-- End dot -->
    <circle
      cx={width}
      cy={height - ((lastValue - Math.min(...data)) / (Math.max(...data) - Math.min(...data) || 1)) * height}
      r="3"
      fill={color}
      class="sparkline-dot"
    />
  {:else}
    <!-- Single point or empty -->
    {#if data.length === 1}
      <circle cx={width / 2} cy={height / 2} r="2" fill={color} />
    {/if}
  {/if}

  {#if tooltip && data.length > 1}
    <foreignObject x="0" y="0" width={width} height={height} class="sparkline-tooltip">
      {@render tooltip({ data, last: lastValue, trend })}
    </foreignObject>
  {/if}
</svg>

{#if showLast}
  <div class="sparkline-value" class:trend-up={trend === "up"} class:trend-down={trend === "down"}>
    {lastValue.toLocaleString()}
    {#if trend === "up"}
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="18 15 12 9 6 15" />
      </svg>
    {:else if trend === "down"}
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 9 12 15 18 9" />
      </svg>
    {/if}
  </div>
{/if}

<style>
  .sparkline {
    display: block;
    overflow: visible;
  }

  .sparkline-line {
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .sparkline-dot {
    transition: r 0.2s ease;
  }

  .sparkline:hover .sparkline-dot {
    r: 4;
  }

  .sparkline-tooltip {
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .sparkline:hover .sparkline-tooltip {
    opacity: 1;
  }

  .sparkline-value {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    font-size: var(--text-sm);
    font-weight: 500;
  }

  .sparkline-value.trend-up {
    color: var(--color-success);
  }

  .sparkline-value.trend-down {
    color: var(--color-error);
  }
</style>
