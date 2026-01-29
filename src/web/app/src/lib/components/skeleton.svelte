<script lang="ts">
  /**
   * Skeleton - Animated placeholder for loading content
   * 
   * Displays a shimmering placeholder that matches content dimensions.
   * Use for cards, text lines, and stat values during data fetching.
   */
  interface Props {
    /** Width - can be a number (px) or string (e.g., "100%", "12rem") */
    width?: number | string;
    /** Height - can be a number (px) or string */
    height?: number | string;
    /** Border radius variant */
    radius?: "sm" | "md" | "lg" | "full";
    /** Display as inline-block instead of block */
    inline?: boolean;
  }

  const { 
    width = "100%", 
    height = 16, 
    radius = "md",
    inline = false
  }: Props = $props();

  const widthStyle = typeof width === "number" ? `${width}px` : width;
  const heightStyle = typeof height === "number" ? `${height}px` : height;
</script>

<div 
  class="skeleton" 
  class:inline
  class:radius-sm={radius === "sm"}
  class:radius-md={radius === "md"}
  class:radius-lg={radius === "lg"}
  class:radius-full={radius === "full"}
  style="width: {widthStyle}; height: {heightStyle}"
  role="status"
  aria-label="Loading..."
></div>

<style>
  .skeleton {
    display: block;
    background: linear-gradient(
      90deg,
      var(--color-bg-hover) 0%,
      var(--color-border) 50%,
      var(--color-bg-hover) 100%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite ease-in-out;
  }

  .skeleton.inline {
    display: inline-block;
    vertical-align: middle;
  }

  .radius-sm {
    border-radius: var(--radius-sm);
  }

  .radius-md {
    border-radius: var(--radius-md);
  }

  .radius-lg {
    border-radius: var(--radius-lg);
  }

  .radius-full {
    border-radius: 9999px;
  }

  @keyframes shimmer {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }
</style>
