<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';

  /**
   * Card - Reusable card component with different variants
   * 
   * Variants:
   * - default: Standard card with subtle shadow
   * - elevated: Higher elevation with more prominent shadow
   * - featured: Gradient background and larger padding/radius
   * - accent: Subtle accent border gradient
   * 
   * Features:
   * - interactive: Hover lift effect and pointer cursor
   * - href: If provided, renders as an <a> tag
   * - tag: HTML element to render (default: 'div')
   */
  interface Props extends HTMLAttributes<HTMLElement> {
    variant?: 'default' | 'elevated' | 'featured' | 'accent';
    interactive?: boolean;
    padding?: string;
    class?: string;
    href?: string;
    tag?: string;
    children?: Snippet;
  }

  let { 
    variant = 'default', 
    interactive = false, 
    padding,
    class: className = '',
    href,
    tag = 'div',
    children,
    ...rest 
  }: Props = $props();

  const variantClass = $derived(variant === 'default' ? 'card' : `card-${variant}`);
  const Component = $derived(href ? 'a' : tag);
</script>

<svelte:element
  this={Component}
  {href}
  class="{variantClass} {interactive ? 'card-interactive' : ''} {className}"
  style={padding ? `padding: ${padding}` : undefined}
  {...rest}
>
  {@render children?.()}
</svelte:element>
