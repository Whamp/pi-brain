<script lang="ts">
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";

  onMount(() => {
    // Redirect to models page by default
    goto("/patterns/models", { replaceState: true });
  });
</script>

<svelte:head>
  <title>Patterns - pi-brain</title>
</svelte:head>

<div class="redirect-state">
  <p>Redirecting to patterns...</p>
</div>

<style>
  .redirect-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 200px;
    color: var(--color-text-muted);
  }
</style>
