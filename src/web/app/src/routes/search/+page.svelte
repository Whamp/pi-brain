<script lang="ts">
  import { Search as SearchIcon } from "lucide-svelte";

  let searchQuery = $state("");
</script>

<svelte:head>
  <title>Search - pi-brain</title>
  <meta name="description" content="Search the pi-brain knowledge graph" />
</svelte:head>

<div class="search-page">
  <header class="page-header">
    <h1>Search</h1>
  </header>

  <div class="search-box">
    <SearchIcon size={18} />
    <input
      type="search"
      placeholder="Search summaries, lessons, decisions..."
      bind:value={searchQuery}
    />
  </div>

  <div class="search-results">
    {#if searchQuery}
      <p class="placeholder-text">Search functionality will be implemented in Task 5.8</p>
    {:else}
      <p class="placeholder-text">Enter a search query to find nodes</p>
    {/if}
  </div>
</div>

<style>
  .search-page {
    max-width: 800px;
  }

  .page-header {
    margin-bottom: var(--space-6);
  }

  .page-header h1 {
    font-size: var(--text-2xl);
  }

  .search-box {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    margin-bottom: var(--space-6);
    color: var(--color-text-muted);
  }

  .search-box:focus-within {
    border-color: var(--color-accent);
  }

  .search-box input {
    flex: 1;
    background: none;
    border: none;
    font-size: var(--text-base);
    color: var(--color-text);
  }

  .search-box input:focus {
    outline: none;
  }

  .search-results {
    min-height: 200px;
  }

  .placeholder-text {
    color: var(--color-text-muted);
    text-align: center;
    padding: var(--space-12);
  }
</style>
