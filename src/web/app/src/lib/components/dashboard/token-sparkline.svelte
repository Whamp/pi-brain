<script lang="ts">
  import Sparkline from "$lib/components/sparkline.svelte";
  import Card from "$lib/components/card.svelte";
  import CardHeader from "$lib/components/card-header.svelte";

  interface Props {
    tokens: number[];
    costs: number[];
    loading?: boolean;
  }

  let { tokens, costs, loading = false }: Props = $props();

  // Calculate trends
  const lastTokens = $derived(tokens.at(-1) ?? 0);
  const previousTokens = $derived(tokens.at(-2) ?? tokens.at(0) ?? 0);
  const tokenTrend = $derived.by(() => {
    if (previousTokens === 0) {
      return "neutral";
    }
    if (lastTokens > previousTokens) {
      return "up";
    }
    if (lastTokens < previousTokens) {
      return "down";
    }
    return "neutral";
  });

  const lastCost = $derived(costs.at(-1) ?? 0);
  const previousCost = $derived(costs.at(-2) ?? costs.at(0) ?? 0);
  const costTrend = $derived.by(() => {
    if (previousCost === 0) {
      return "neutral";
    }
    if (lastCost > previousCost) {
      return "up";
    }
    if (lastCost < previousCost) {
      return "down";
    }
    return "neutral";
  });

  const totalTokens = $derived(tokens.reduce((sum, t) => sum + t, 0));
  const totalCost = $derived(costs.reduce((sum, c) => sum + c, 0));
</script>

<Card tag="section" variant="accent" class="token-sparkline-panel">
  <CardHeader title="Usage Trends" />

  {#if loading}
    <div class="loading-state">
      <div class="skeleton skeleton-chart"></div>
    </div>
  {:else}
    <div class="sparkline-grid">
      <!-- Token Usage -->
      <div class="sparkline-item">
        <div class="sparkline-header">
          <span class="sparkline-label">Tokens</span>
          <span class="sparkline-total">{totalTokens.toLocaleString()}</span>
        </div>
        <div class="sparkline-wrapper">
          <Sparkline
            data={tokens}
            color="var(--color-accent)"
            showLast={true}
            trend={tokenTrend}
          />
        </div>
        <div class="sparkline-meta">
          Last 7 days • Daily usage
        </div>
      </div>

      <!-- Cost -->
      <div class="sparkline-item">
        <div class="sparkline-header">
          <span class="sparkline-label">Cost</span>
          <span class="sparkline-total">${totalCost.toFixed(2)}</span>
        </div>
        <div class="sparkline-wrapper">
          <Sparkline
            data={costs}
            color="var(--color-success)"
            showLast={true}
            trend={costTrend}
          />
        </div>
        <div class="sparkline-meta">
          Last 7 days • Daily spend
        </div>
      </div>
    </div>
  {/if}
</Card>

<style>
  .sparkline-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-4);
  }

  .sparkline-item {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .sparkline-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .sparkline-label {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .sparkline-total {
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--color-text);
  }

  .sparkline-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-2);
    background: var(--color-bg-hover);
    border-radius: var(--radius-md);
  }

  .sparkline-meta {
    font-size: var(--text-xs);
    color: var(--color-text-subtle);
    text-align: center;
  }

  /* Loading skeleton */
  .loading-state {
    padding: var(--space-4);
  }

  .skeleton-chart {
    height: 80px;
    border-radius: var(--radius-md);
  }

  @media (max-width: 640px) {
    .sparkline-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
