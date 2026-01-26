<script lang="ts">
  import { onMount } from "svelte";
  import { Search as SearchIcon, Filter, X, ChevronDown } from "lucide-svelte";
  import SearchResultCard from "$lib/components/search-result-card.svelte";
  import type { SearchResult, NodeType, Outcome } from "$lib/types";
  import { api } from "$lib/api/client";

  let searchQuery = $state("");
  let results = $state<SearchResult[]>([]);
  let total = $state(0);
  let loading = $state(false);
  let errorMessage = $state<string | null>(null);

  // Filters
  let showFilters = $state(false);
  let selectedFields = $state<string[]>([]);
  let selectedType = $state<NodeType | "">("");
  let selectedOutcome = $state<Outcome | "">("");
  let selectedProject = $state("");
  let selectedTags = $state<string[]>([]);

  // Pagination
  const limit = 20;
  let offset = $state(0);

  // Available filter options (loaded on mount)
  let availableProjects = $state<string[]>([]);
  const availableTypes: NodeType[] = [
    "coding",
    "debugging",
    "research",
    "planning",
    "qa",
    "refactor",
    "documentation",
    "sysadmin",
    "brainstorm",
    "handoff",
    "other",
  ];
  const availableOutcomes: Outcome[] = ["success", "partial", "failed", "abandoned"];

  const allFields = ["summary", "decisions", "lessons", "tags", "topics"];
  let showFieldDropdown = $state(false);

  // Debounce timer
  let searchTimeout: ReturnType<typeof setTimeout> | null = null;

  // Computed: check if any filters are active
  function hasActiveFilters(): boolean {
    return (
      selectedFields.length > 0 ||
      selectedType !== "" ||
      selectedOutcome !== "" ||
      selectedProject !== "" ||
      selectedTags.length > 0
    );
  }

  function buildFilters(): Record<string, unknown> {
    const filters: Record<string, unknown> = {};
    if (selectedType) {
      filters.type = selectedType;
    }
    if (selectedOutcome) {
      filters.outcome = selectedOutcome;
    }
    if (selectedProject) {
      filters.project = selectedProject;
    }
    if (selectedTags.length > 0) {
      filters.tags = selectedTags;
    }
    return filters;
  }

  onMount(async () => {
    // Load filter options
    try {
      // Projects would come from API, for now use empty
      availableProjects = [];
    } catch (error) {
      console.error("Failed to load filter options:", error);
    }

    // Check if query is in URL
    const urlParams = new URLSearchParams(window.location.search);
    const q = urlParams.get("q");
    if (q) {
      searchQuery = q;
      await performSearch();
    }
  });

  async function performSearch() {
    if (!searchQuery.trim()) {
      results = [];
      total = 0;
      return;
    }

    loading = true;
    errorMessage = null;
    offset = 0; // Reset to first page on new search

    try {
      const filters = buildFilters();

      const response = await api.search(searchQuery, {
        fields: selectedFields.length > 0 ? selectedFields : undefined,
        limit,
        offset,
        filters: Object.keys(filters).length > 0 ? filters : undefined,
      });

      ({ results } = response);
      ({ total } = response);
    } catch (error: unknown) {
      errorMessage = error instanceof Error ? error.message : "Search failed";
      results = [];
      total = 0;
    } finally {
      loading = false;
    }
  }

  function handleSearchInput() {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Debounce search by 300ms
    searchTimeout = setTimeout(() => {
      performSearch();
    }, 300);
  }

  function handleSearchSubmit(e: Event) {
    e.preventDefault();
    performSearch();
  }

  function toggleField(field: string) {
    if (selectedFields.includes(field)) {
      selectedFields = selectedFields.filter((f) => f !== field);
    } else {
      selectedFields = [...selectedFields, field];
    }
  }

  function removeTag(tag: string) {
    selectedTags = selectedTags.filter((t) => t !== tag);
  }

  function addTag(tag: string) {
    if (tag && !selectedTags.includes(tag)) {
      selectedTags = [...selectedTags, tag];
    }
  }

  async function loadMore() {
    const newOffset = offset + limit;
    if (newOffset >= total) {
      return;
    }

    loading = true;
    offset = newOffset;

    try {
      const filters = buildFilters();

      const response = await api.search(searchQuery, {
        fields: selectedFields.length > 0 ? selectedFields : undefined,
        limit,
        offset,
        filters: Object.keys(filters).length > 0 ? filters : undefined,
      });

      results = [...results, ...response.results];
    } catch (error: unknown) {
      errorMessage = error instanceof Error ? error.message : "Failed to load more results";
    } finally {
      loading = false;
    }
  }

  function clearFilters() {
    selectedFields = [];
    selectedType = "";
    selectedOutcome = "";
    selectedProject = "";
    selectedTags = [];
    performSearch();
  }
</script>

<svelte:head>
  <title>Search - pi-brain</title>
  <meta name="description" content="Search pi-brain knowledge graph" />
</svelte:head>

<div class="search-page">
  <header class="page-header">
    <h1>Search</h1>
    <p class="page-description">
      Search across all nodes, lessons, decisions, and more in your knowledge graph
    </p>
  </header>

  <!-- Search Box -->
  <form class="search-box" onsubmit={handleSearchSubmit}>
    <SearchIcon size={20} />
    <input
      type="search"
      placeholder="Search summaries, lessons, decisions..."
      bind:value={searchQuery}
      oninput={handleSearchInput}
    />
    <button
      type="button"
      class="filter-toggle"
      class:active={hasActiveFilters()}
      onclick={() => (showFilters = !showFilters)}
      aria-expanded={showFilters}
      aria-label="Toggle filters"
    >
      <Filter size={20} />
      {#if hasActiveFilters()}
        <span class="filter-badge"></span>
      {/if}
    </button>
  </form>

  <!-- Filters Panel -->
  {#if showFilters}
    <div class="filters-panel">
      <div class="filters-header">
        <h2>Filters</h2>
        {#if hasActiveFilters()}
          <button class="clear-filters" onclick={clearFilters}>
            <X size={16} />
            Clear all
          </button>
        {/if}
      </div>

      <div class="filter-groups">
        <!-- Field Filter -->
        <div class="filter-group">
          <span class="filter-label" id="search-in-label">Search in</span>
          <div class="field-dropdown" role="group" aria-labelledby="search-in-label">
            <button
              class="dropdown-trigger"
              onclick={() => (showFieldDropdown = !showFieldDropdown)}
            >
              {selectedFields.length === 0
                ? "All fields"
                : selectedFields.length === allFields.length
                  ? "All fields selected"
                  : `${selectedFields.length} field${selectedFields.length > 1 ? "s" : ""} selected`}
              <ChevronDown size={16} />
            </button>

            {#if showFieldDropdown}
              <div class="dropdown-menu">
                <label class="dropdown-option">
                  <input
                    type="checkbox"
                    checked={selectedFields.length === 0}
                    onchange={() => (selectedFields = [])}
                  />
                  All fields
                </label>
                <div class="dropdown-divider"></div>
                {#each allFields as field}
                  <label class="dropdown-option">
                    <input
                      type="checkbox"
                      checked={selectedFields.includes(field)}
                      onchange={() => toggleField(field)}
                    />
                    {field}
                  </label>
                {/each}
              </div>
            {/if}
          </div>
        </div>

        <!-- Type Filter -->
        <div class="filter-group">
          <label class="filter-label" for="type-filter">Node type</label>
          <select id="type-filter" bind:value={selectedType} onchange={performSearch}>
            <option value="">All types</option>
            {#each availableTypes as type}
              <option value={type}>{type}</option>
            {/each}
          </select>
        </div>

        <!-- Outcome Filter -->
        <div class="filter-group">
          <label class="filter-label" for="outcome-filter">Outcome</label>
          <select id="outcome-filter" bind:value={selectedOutcome} onchange={performSearch}>
            <option value="">All outcomes</option>
            {#each availableOutcomes as outcome}
              <option value={outcome}>{outcome}</option>
            {/each}
          </select>
        </div>

        <!-- Project Filter -->
        <div class="filter-group">
          <label class="filter-label" for="project-filter">Project</label>
          <select id="project-filter" bind:value={selectedProject} onchange={performSearch}>
            <option value="">All projects</option>
            {#each availableProjects as project}
              <option value={project}>{project}</option>
            {/each}
          </select>
        </div>

        <!-- Tags Filter -->
        <div class="filter-group">
          <span class="filter-label" id="tags-label">Tags</span>
          <div class="tags-input" role="group" aria-labelledby="tags-label">
            {#each selectedTags as tag}
              <span class="tag-pill">
                #{tag}
                <button class="tag-remove" onclick={() => removeTag(tag)}>
                  <X size={12} />
                </button>
              </span>
            {/each}
            <input
              type="text"
              placeholder="Add tag..."
              onkeydown={(e) => {
                if (e.key === "Enter" && e.target instanceof HTMLInputElement) {
                  addTag(e.target.value.trim());
                  e.target.value = "";
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Search Results -->
  <div class="results-container">
    {#if loading && results.length === 0}
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Searching...</p>
      </div>
    {:else if errorMessage}
      <div class="error-state">
        <p>Search failed: {errorMessage}</p>
        <button class="retry-button" onclick={performSearch}>Try again</button>
      </div>
    {:else if !searchQuery}
      <div class="empty-state">
        <SearchIcon size={48} />
        <h2>Search your knowledge graph</h2>
        <p>
          Enter a query to search across summaries, lessons, decisions, and more.
        </p>
      </div>
    {:else if results.length === 0}
      <div class="empty-state">
        <SearchIcon size={48} />
        <h2>No results found</h2>
        <p>
          Try adjusting your search terms or filters to find what you're looking for.
        </p>
      </div>
    {:else}
      <div class="results-info">
        <p class="results-count">
          Found {total} result{total !== 1 ? "s" : ""} for "{searchQuery}"
        </p>
      </div>

      <div class="results-list">
        {#each results as result (result.nodeId)}
          <SearchResultCard {result} />
        {/each}
      </div>

      {#if offset + limit < total}
        <button class="load-more-button" onclick={loadMore} disabled={loading}>
          {loading ? "Loading..." : "Load more"}
        </button>
      {/if}
    {/if}
  </div>
</div>

<style>
  .search-page {
    max-width: 900px;
  }

  .page-header {
    margin-bottom: var(--space-6);
  }

  .page-header h1 {
    font-size: var(--text-3xl);
    margin-bottom: var(--space-2);
  }

  .page-description {
    color: var(--color-text-muted);
    font-size: var(--text-base);
  }

  /* Search Box */
  .search-box {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    background: var(--color-bg-elevated);
    border: 2px solid var(--color-border);
    border-radius: var(--radius-lg);
    margin-bottom: var(--space-6);
    color: var(--color-text-muted);
    transition: border-color 0.15s ease;
  }

  .search-box:focus-within {
    border-color: var(--color-accent);
    color: var(--color-text);
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

  .filter-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-2);
    background: none;
    border: none;
    border-radius: var(--radius-md);
    color: var(--color-text-muted);
    cursor: pointer;
    position: relative;
    transition: background 0.15s ease, color 0.15s ease;
  }

  .filter-toggle:hover {
    background: var(--color-bg-hover);
    color: var(--color-text);
  }

  .filter-toggle.active {
    color: var(--color-accent);
  }

  .filter-badge {
    position: absolute;
    top: 4px;
    right: 4px;
    width: 8px;
    height: 8px;
    background: var(--color-accent);
    border-radius: 50%;
  }

  /* Filters Panel */
  .filters-panel {
    padding: var(--space-4);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    margin-bottom: var(--space-6);
  }

  .filters-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-4);
  }

  .filters-header h2 {
    font-size: var(--text-lg);
    font-weight: 600;
  }

  .clear-filters {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-2) var(--space-3);
    background: none;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    color: var(--color-text-muted);
    font-size: var(--text-sm);
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
  }

  .clear-filters:hover {
    background: var(--color-bg-hover);
    color: var(--color-text);
  }

  .filter-groups {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--space-4);
  }

  .filter-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .filter-label {
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--color-text-muted);
  }

  .filter-group select {
    padding: var(--space-2) var(--space-3);
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    color: var(--color-text);
    cursor: pointer;
  }

  .filter-group select:focus {
    outline: none;
    border-color: var(--color-accent);
  }

  /* Field Dropdown */
  .field-dropdown {
    position: relative;
  }

  .dropdown-trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: var(--space-2) var(--space-3);
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    color: var(--color-text);
    cursor: pointer;
    transition: border-color 0.15s ease;
  }

  .dropdown-trigger:hover {
    border-color: var(--color-accent);
  }

  .dropdown-menu {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    z-index: 100;
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    padding: var(--space-2);
  }

  .dropdown-option {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2);
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: var(--text-sm);
  }

  .dropdown-option:hover {
    background: var(--color-bg-hover);
  }

  .dropdown-option input[type="checkbox"] {
    margin: 0;
  }

  .dropdown-divider {
    height: 1px;
    background: var(--color-border-subtle);
    margin: var(--space-2) 0;
  }

  /* Tags Input */
  .tags-input {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    padding: var(--space-2);
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    min-height: 40px;
  }

  .tags-input:focus-within {
    border-color: var(--color-accent);
  }

  .tag-pill {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    padding: 2px var(--space-2);
    background: var(--color-accent-muted);
    color: var(--color-accent);
    border-radius: var(--radius-sm);
    font-size: var(--text-sm);
  }

  .tag-remove {
    display: flex;
    align-items: center;
    padding: 0;
    background: none;
    border: none;
    cursor: pointer;
    color: inherit;
    opacity: 0.7;
    transition: opacity 0.15s ease;
  }

  .tag-remove:hover {
    opacity: 1;
  }

  .tags-input input {
    flex: 1;
    min-width: 100px;
    background: none;
    border: none;
    font-size: var(--text-sm);
    color: var(--color-text);
  }

  .tags-input input:focus {
    outline: none;
  }

  /* Results Container */
  .results-container {
    min-height: 400px;
  }

  .loading-state,
  .error-state,
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-4);
    padding: var(--space-12);
    text-align: center;
  }

  .loading-state,
  .error-state {
    color: var(--color-text-muted);
  }

  .empty-state {
    color: var(--color-text-subtle);
  }

  .empty-state h2 {
    font-size: var(--text-xl);
    margin-bottom: var(--space-2);
  }

  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--color-border);
    border-top-color: var(--color-accent);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .retry-button {
    padding: var(--space-2) var(--space-4);
    background: var(--color-accent);
    border: none;
    border-radius: var(--radius-md);
    color: white;
    font-size: var(--text-sm);
    cursor: pointer;
    transition: background 0.15s ease;
  }

  .retry-button:hover {
    background: var(--color-accent-hover);
  }

  .results-info {
    margin-bottom: var(--space-4);
  }

  .results-count {
    color: var(--color-text-muted);
    font-size: var(--text-sm);
  }

  .results-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .load-more-button {
    display: block;
    width: 100%;
    margin-top: var(--space-6);
    padding: var(--space-3) var(--space-4);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    color: var(--color-text);
    font-size: var(--text-sm);
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease;
  }

  .load-more-button:hover:not(:disabled) {
    background: var(--color-bg-hover);
    border-color: var(--color-accent);
  }

  .load-more-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
