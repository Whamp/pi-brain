<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    text?: string;
    variant?: 'default' | 'accent' | 'blue' | 'purple' | 'green' | 'amber' | 'rose' | 'indigo' | 'cyan' | 'tangerine' | 'auto';
    href?: string;
    children?: Snippet;
    className?: string;
  }

  let { 
    text, 
    variant = 'default', 
    href, 
    children, 
    className = "" 
  }: Props = $props();

  const variants = [
    'blue', 'purple', 'green', 'amber', 'rose', 'indigo', 'cyan', 'tangerine'
  ];

  function getAutoVariant(str: string): string {
    if (!str) {
      return 'default';
    }
    
    // Simple hash function (no bitwise to satisfy linter)
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.codePointAt(i) ?? 0;
      hash = (hash * 31 + char) % 1_000_000;
    }
    
    const index = Math.abs(hash) % variants.length;
    return variants[index];
  }

  const finalVariant = $derived(
    variant === 'auto' && text ? getAutoVariant(text) : variant
  );

  const variantClass = $derived(
    finalVariant === 'default' ? '' : `tag-${finalVariant}`
  );
</script>

{#if href}
  <a {href} class="tag {variantClass} {className}">
    {#if children}
      {@render children()}
    {:else}
      {text}
    {/if}
  </a>
{:else}
  <span class="tag {variantClass} {className}">
    {#if children}
      {@render children()}
    {:else}
      {text}
    {/if}
  </span>
{/if}
