<script lang="ts">
  /**
   * PageTransition - Provides smooth fade transitions when navigating between pages
   * 
   * Wraps page content with a fade animation on mount. Prevents jarring
   * content flashes during SvelteKit navigation.
   */
  import { fade } from "svelte/transition";
  import type { Snippet } from "svelte";

  interface Props {
    /** Duration of the fade animation in milliseconds */
    duration?: number;
    /** Optional key to force re-render (use page.url.pathname) */
    key?: string;
    children: Snippet;
  }

  const { duration = 150, key = "", children }: Props = $props();
</script>

{#key key}
  <div class="page-transition" in:fade={{ duration }}>
    {@render children()}
  </div>
{/key}

<style>
  .page-transition {
    width: 100%;
  }
</style>
