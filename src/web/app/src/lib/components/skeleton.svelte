<!--
  Skeleton Loading Component
  
  A shimmer-based skeleton loader for placeholder UI elements.
  
  Usage:
    <Skeleton />                    - Default line skeleton
    <Skeleton variant="text" />     - Text line (h: 1em)
    <Skeleton variant="title" />    - Title text (h: 1.5em)
    <Skeleton variant="circle" />   - Avatar/icon circle (40x40)
    <Skeleton variant="rect" />     - Rectangular block (100% x 100px)
    <Skeleton variant="card" />     - Card placeholder with content
    <Skeleton width="120px" />      - Custom width
    <Skeleton height="24px" />      - Custom height
    <Skeleton class="my-custom" />  - Additional classes
-->
<script lang="ts">
  interface Props {
    /** Skeleton shape variant */
    variant?: "text" | "title" | "circle" | "rect" | "card";
    /** Custom width (CSS value or number in px) */
    width?: string | number;
    /** Custom height (CSS value or number in px) */
    height?: string | number;
    /** Border radius preset */
    radius?: "sm" | "md" | "lg" | "full";
    /** Whether to animate the shimmer */
    animate?: boolean;
    /** Additional CSS classes */
    class?: string;
  }

  let {
    variant = "text",
    width,
    height,
    radius,
    animate = true,
    class: className = "",
  }: Props = $props();

  const variantStyles: Record<string, { width: string; height: string }> = {
    text: { width: "100%", height: "1em" },
    title: { width: "60%", height: "1.5em" },
    circle: { width: "40px", height: "40px" },
    rect: { width: "100%", height: "100px" },
    card: { width: "100%", height: "auto" },
  };

  // Convert number to px string
  function toCss(value: string | number | undefined, fallback: string): string {
    if (value === undefined) {return fallback;}
    return typeof value === "number" ? `${value}px` : value;
  }

  const defaultStyle = $derived(variantStyles[variant] ?? variantStyles.text);
  const computedWidth = $derived(toCss(width, defaultStyle.width));
  const computedHeight = $derived(toCss(height, defaultStyle.height));
</script>

{#if variant === "card"}
  <div
    class="skeleton-card {className}"
    class:animate
    role="status"
    aria-label="Loading..."
  >
    <div class="skeleton-card-header">
      <div class="skeleton-circle"></div>
      <div class="skeleton-lines">
        <div class="skeleton-line" style="width: 40%"></div>
        <div class="skeleton-line short" style="width: 25%"></div>
      </div>
    </div>
    <div class="skeleton-card-body">
      <div class="skeleton-line"></div>
      <div class="skeleton-line" style="width: 85%"></div>
      <div class="skeleton-line" style="width: 70%"></div>
    </div>
  </div>
{:else}
  <div
    class="skeleton {variant} {className}"
    class:animate
    style="width: {computedWidth}; height: {computedHeight};"
    role="status"
    aria-label="Loading..."
  ></div>
{/if}

<style>
  .skeleton {
    background: var(--color-bg-hover);
    border-radius: var(--radius-sm);
    position: relative;
    overflow: hidden;
  }

  .skeleton.circle {
    border-radius: 50%;
  }

  .skeleton.rect {
    border-radius: var(--radius-md);
  }

  /* Shimmer animation */
  .skeleton.animate::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.04) 50%,
      transparent 100%
    );
    animation: shimmer 1.5s infinite;
  }

  @keyframes shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }

  /* Card variant */
  .skeleton-card {
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-4);
  }

  .skeleton-card-header {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    margin-bottom: var(--space-4);
  }

  .skeleton-circle {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--color-bg-hover);
    flex-shrink: 0;
    position: relative;
    overflow: hidden;
  }

  .skeleton-card.animate .skeleton-circle::after,
  .skeleton-card.animate .skeleton-line::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.04) 50%,
      transparent 100%
    );
    animation: shimmer 1.5s infinite;
  }

  .skeleton-lines {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .skeleton-line {
    height: 0.875em;
    background: var(--color-bg-hover);
    border-radius: var(--radius-sm);
    width: 100%;
    position: relative;
    overflow: hidden;
  }

  .skeleton-line.short {
    height: 0.75em;
  }

  .skeleton-card-body {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
</style>
