<script lang="ts">
  import { TrendingUp, TrendingDown, Minus } from "lucide-svelte";
  
  interface Props {
    /** Main stat value to display */
    value: number | string;
    /** Label shown below the value */
    label: string;
    /** Value from the comparison period (e.g., last week) */
    previousValue?: number;
    /** Description of what the trend compares (e.g., "vs last week") */
    trendPeriod?: string;
    /** Contextual hint explaining what this number means */
    contextHint?: string;
    /** Format type for the value */
    format?: "number" | "currency" | "percent";
    /** Visual variant */
    variant?: "default" | "accent" | "success" | "warning";
    /** Whether higher values are good (affects trend coloring) */
    higherIsBetter?: boolean;
  }

  let {
    value,
    label,
    previousValue,
    trendPeriod = "vs last week",
    contextHint,
    format = "number",
    variant = "default",
    higherIsBetter = true,
  }: Props = $props();

  // Calculate trend
  const numericValue = $derived(typeof value === "number" ? value : Number.parseFloat(String(value)) || 0);
  
  const trendPercent = $derived.by(() => {
    if (previousValue === undefined || previousValue === 0) {
      return null;
    }
    return ((numericValue - previousValue) / previousValue) * 100;
  });

  const trendDirection = $derived.by(() => {
    if (trendPercent === null || Math.abs(trendPercent) < 1) {
      return "neutral";
    }
    return trendPercent > 0 ? "up" : "down";
  });

  const absoluteChange = $derived.by(() => {
    if (previousValue === undefined) {
      return null;
    }
    return numericValue - previousValue;
  });

  // Determine if trend is positive (good) or negative (bad)
  const trendIsPositive = $derived.by(() => {
    if (trendDirection === "neutral") {
      return null;
    }
    if (higherIsBetter) {
      return trendDirection === "up";
    }
    return trendDirection === "down";
  });

  // Format the display value
  const displayValue = $derived.by(() => {
    if (typeof value === "string") {
      return value;
    }
    switch (format) {
      case "currency": {
        return `$${value.toFixed(2)}`;
      }
      case "percent": {
        return `${Math.round(value)}%`;
      }
      default: {
        return value.toLocaleString();
      }
    }
  });

  // Format absolute change for display
  const changeDisplay = $derived.by(() => {
    if (absoluteChange === null) {
      return null;
    }
    const prefix = absoluteChange > 0 ? "+" : "";
    if (format === "currency") {
      return `${prefix}$${Math.abs(absoluteChange).toFixed(2)}`;
    }
    if (format === "percent") {
      return `${prefix}${Math.round(absoluteChange)}%`;
    }
    return `${prefix}${Math.round(absoluteChange).toLocaleString()}`;
  });
</script>

<div class="stat-card" class:accent={variant === "accent"} class:success={variant === "success"} class:warning={variant === "warning"}>
  <div class="stat-value">{displayValue}</div>
  <div class="stat-label">{label}</div>
  
  {#if trendPercent !== null || contextHint}
    <div class="stat-meta">
      {#if trendPercent !== null && trendDirection !== "neutral"}
        <span 
          class="stat-trend" 
          class:positive={trendIsPositive === true}
          class:negative={trendIsPositive === false}
        >
          {#if trendDirection === "up"}
            <TrendingUp size={12} />
          {:else}
            <TrendingDown size={12} />
          {/if}
          <span class="trend-value">
            {changeDisplay}
          </span>
          <span class="trend-period">{trendPeriod}</span>
        </span>
      {:else if trendPercent !== null}
        <span class="stat-trend neutral">
          <Minus size={12} />
          <span class="trend-period">No change</span>
        </span>
      {/if}
      
      {#if contextHint}
        <span class="stat-context">{contextHint}</span>
      {/if}
    </div>
  {/if}
</div>

<style>
  .stat-card {
    text-align: center;
    padding: var(--space-3) var(--space-4);
    background: var(--color-bg-hover);
    border-radius: var(--radius-lg);
    min-width: 120px;
    border: 1px solid var(--color-border-subtle);
    transition: border-color var(--transition-fast), transform var(--transition-fast);
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .stat-card:hover {
    border-color: var(--color-border);
    transform: translateY(-1px);
  }

  .stat-card.accent {
    border-color: var(--color-accent-muted);
    background: hsla(190, 100%, 50%, 0.05);
  }

  .stat-card.accent .stat-value {
    color: var(--color-accent);
  }

  .stat-card.success {
    border-color: hsla(145, 65%, 52%, 0.3);
    background: hsla(145, 65%, 52%, 0.05);
  }

  .stat-card.success .stat-value {
    color: var(--color-success);
  }

  .stat-card.warning {
    border-color: hsla(45, 100%, 50%, 0.3);
    background: hsla(45, 100%, 50%, 0.05);
  }

  .stat-card.warning .stat-value {
    color: var(--color-warning);
  }

  .stat-value {
    font-size: var(--text-2xl);
    font-weight: var(--font-bold);
    color: var(--color-text);
    line-height: 1;
  }

  .stat-label {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .stat-meta {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    margin-top: var(--space-1);
  }

  .stat-trend {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-1);
    font-size: var(--text-xs);
    font-weight: 500;
    padding: 2px 6px;
    border-radius: var(--radius-sm);
  }

  .stat-trend.positive {
    color: var(--color-success);
    background: hsla(145, 65%, 52%, 0.1);
  }

  .stat-trend.negative {
    color: var(--color-error);
    background: hsla(0, 72%, 72%, 0.1);
  }

  .stat-trend.neutral {
    color: var(--color-text-muted);
    background: var(--color-bg-elevated);
  }

  .trend-value {
    font-weight: 600;
  }

  .trend-period {
    opacity: 0.8;
  }

  .stat-context {
    font-size: 10px;
    color: var(--color-text-subtle);
    font-style: italic;
  }

  @media (max-width: 768px) {
    .stat-card {
      min-width: 80px;
      padding: var(--space-2) var(--space-3);
    }

    .stat-value {
      font-size: var(--text-lg);
    }

    .stat-meta {
      display: none;
    }
  }
</style>
