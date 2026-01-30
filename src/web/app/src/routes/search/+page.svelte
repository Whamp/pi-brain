<script lang="ts">
  import { onMount } from "svelte";
  import { Search as SearchIcon, Filter, X, ChevronDown, Clock, Hash, Trash2 } from "lucide-svelte";
  import SearchResultCard from "$lib/components/search-result-card.svelte";
  import Spinner from "$lib/components/spinner.svelte";
  import LoadingState from "$lib/components/loading-state.svelte";
  import EmptyState from "$lib/components/empty-state.svelte";
  import type { SearchResult, NodeType, Outcome } from "$lib/types";
  import { api, getErrorMessage, isBackendOffline } from "$lib/api/client";
  import { focusTrap, createFocusTrap } from "$lib/utils/focus-trap";
  import ErrorState from "$lib/components/error-state.svelte";
  import { searchHistory } from "$lib/stores/search-history";

  let searchQuery = $state("");
  let results = $state<SearchResult[]>([]);
  let total = $state(0);
  let loading = $state(false);
  let isDebouncing = $state(false);
  let errorMessage = $state<string | null>(null);
  let isOfflineError = $state(false);

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
    "refactoring",
    "documentation",
    "configuration",
    "sysadmin",
    "brainstorm",
    "handoff",
    "other",
  ];
  const availableOutcomes: Outcome[] = ["success", "partial", "failed", "abandoned"];

  const allFields = ["summary", "decisions", "lessons", "tags", "topics"];
  let showFieldDropdown = $state(false);
  let fieldDropdownRef = $state<HTMLDivElement | null>(null);
  let fieldDropdownMenuRef = $state<HTMLDivElement | null>(null);
  let filterToggleRef = $state<HTMLButtonElement | null>(null);
  let dropdownTriggerRef = $state<HTMLButtonElement | null>(null);
  let filtersPanelRef = $state<HTMLDivElement | null>(null);
  let focusTrapCleanup: (() => void) | null = null;
  let filtersPanelTrapCleanup: (() => void) | null = null;

  // Search suggestions state
  let showSuggestions = $state(false);
  let searchInputRef = $state<HTMLInputElement | null>(null);
  let suggestionsRef = $state<HTMLDivElement | null>(null);
  let selectedSuggestionIndex = $state(-1);
  
  // Popular tags extracted from results (updated after each search)
  let popularTags = $state<string[]>([]);

  // Debounce timer
  let searchTimeout: ReturnType<typeof setTimeout> | null = null;

  function shouldKeepFieldDropdownOpen(target: Node): boolean {
    return (
      (dropdownTriggerRef?.contains(target) ?? false) ||
      (fieldDropdownMenuRef?.contains(target) ?? false)
    );
  }

  function isClickOutsideFieldDropdown(target: Node): boolean {
    return showFieldDropdown && fieldDropdownRef !== null && !fieldDropdownRef.contains(target);
  }

  function isClickOutsideSuggestions(target: Node): boolean {
    return (
      showSuggestions &&
      suggestionsRef !== null &&
      !suggestionsRef.contains(target) &&
      searchInputRef !== null &&
      !searchInputRef.contains(target)
    );
  }

  function closeSuggestions(): void {
    showSuggestions = false;
    selectedSuggestionIndex = -1;
  }

  // Click outside handler for field dropdown and suggestions
  function handleClickOutside(event: MouseEvent) {
    const target = event.target as Node;
    
    if (shouldKeepFieldDropdownOpen(target)) {
      return;
    }
    
    if (isClickOutsideFieldDropdown(target)) {
      closeFieldDropdown();
    }
    
    if (isClickOutsideSuggestions(target)) {
      closeSuggestions();
    }
  }

  // Close field dropdown on Escape
  function closeFieldDropdown() {
    if (focusTrapCleanup) {
      focusTrapCleanup();
      focusTrapCleanup = null;
    }
    showFieldDropdown = false;
    dropdownTriggerRef?.focus();
  }

  // Toggle field dropdown with focus trap
  function toggleFieldDropdown() {
    if (showFieldDropdown) {
      closeFieldDropdown();
    } else {
      showFieldDropdown = true;
      // Focus trap will be set up via $effect when dropdown renders
    }
  }

  // Set up focus trap when field dropdown menu is rendered
  $effect(() => {
    if (showFieldDropdown && fieldDropdownMenuRef) {
      focusTrapCleanup = createFocusTrap(fieldDropdownMenuRef, {
        onEscape: closeFieldDropdown,
        restoreFocus: dropdownTriggerRef,
        autoFocus: true,
      });
    }
    return () => {
      if (focusTrapCleanup) {
        focusTrapCleanup();
        focusTrapCleanup = null;
      }
    };
  });

  // Set up focus trap when filters panel is rendered
  $effect(() => {
    if (showFilters && filtersPanelRef) {
      filtersPanelTrapCleanup = createFocusTrap(filtersPanelRef, {
        onEscape: () => {
          showFilters = false;
        },
        restoreFocus: filterToggleRef,
        autoFocus: true,
      });
    }
    return () => {
      if (filtersPanelTrapCleanup) {
        filtersPanelTrapCleanup();
        filtersPanelTrapCleanup = null;
      }
    };
  });

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

  // Get suggestions for dropdown (recent searches + filtered by current query)
  function getSuggestions(): { query: string; timestamp: number }[] {
    const history = $searchHistory.entries;
    if (!searchQuery.trim()) {
      return history;
    }
    // Filter by current query prefix
    const lower = searchQuery.toLowerCase();
    return history.filter((e) => 
      e.query.toLowerCase().includes(lower) && 
      e.query.toLowerCase() !== lower
    );
  }

  // Select a suggestion from the dropdown
  function selectSuggestion(query: string): void {
    searchQuery = query;
    showSuggestions = false;
    selectedSuggestionIndex = -1;
    performSearch();
  }

  // Remove a search from history
  function removeFromHistory(query: string, event: MouseEvent): void {
    event.stopPropagation();
    searchHistory.removeSearch(query);
  }

  function openSuggestionsOnArrowDown(event: KeyboardEvent): boolean {
    if (event.key === "ArrowDown" && $searchHistory.entries.length > 0) {
      showSuggestions = true;
      selectedSuggestionIndex = 0;
      event.preventDefault();
      return true;
    }
    return false;
  }

  // Lookup table for keyboard navigation actions
  const keydownHandlers: Record<string, (suggestions: ReturnType<typeof getSuggestions>) => void> = {
    ArrowDown: (suggestions) => {
      selectedSuggestionIndex = Math.min(selectedSuggestionIndex + 1, suggestions.length - 1);
    },
    ArrowUp: () => {
      selectedSuggestionIndex = Math.max(selectedSuggestionIndex - 1, -1);
    },
    Enter: (suggestions) => {
      if (selectedSuggestionIndex >= 0 && selectedSuggestionIndex < suggestions.length) {
        selectSuggestion(suggestions[selectedSuggestionIndex].query);
      }
    },
    Escape: () => {
      closeSuggestions();
    },
  };

  // Handle keyboard navigation in suggestions
  function handleSearchKeydown(event: KeyboardEvent): void {
    const suggestions = getSuggestions();
    
    if (!showSuggestions || suggestions.length === 0) {
      openSuggestionsOnArrowDown(event);
      return;
    }

    const handler = keydownHandlers[event.key];
    if (handler) {
      event.preventDefault();
      handler(suggestions);
    }
  }

  // Show suggestions when input is focused
  function handleSearchFocus(): void {
    if ($searchHistory.entries.length > 0 || popularTags.length > 0) {
      showSuggestions = true;
    }
  }

  // Extract popular tags from search results
  function updatePopularTags(searchResults: SearchResult[]): void {
    const tagCounts = new Map<string, number>();
    
    for (const result of searchResults) {
      const {tags} = result.node.semantic;
      for (const tag of tags) {
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
      }
    }
    
    // Sort by count and take top 8
    popularTags = [...tagCounts.entries()]
      .toSorted((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([tag]) => tag);
  }

  // Add a tag as a quick filter
  function addQuickTag(tag: string): void {
    if (!selectedTags.includes(tag)) {
      selectedTags = [...selectedTags, tag];
      showSuggestions = false;
      performSearch();
    }
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

  onMount(() => {
    // Register click outside handler
    document.addEventListener("click", handleClickOutside);

    // Load filter options
    loadFilterOptions();

    // Check if query is in URL
    const urlParams = new URLSearchParams(window.location.search);
    const q = urlParams.get("q");
    if (q) {
      searchQuery = q;
      performSearch();
    }

    // Cleanup
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  });

  async function loadFilterOptions(): Promise<void> {
    try {
      const data = await api.getProjects();
      availableProjects = data.projects.map(p => p.project);
    } catch (error) {
      console.error("Failed to load filter options:", error);
    }
  }

  async function performSearch() {
    if (!searchQuery.trim()) {
      results = [];
      total = 0;
      return;
    }

    loading = true;
    errorMessage = null;
    offset = 0; // Reset to first page on new search
    showSuggestions = false; // Hide suggestions when searching

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
      
      // Save successful search to history
      if (response.total > 0) {
        searchHistory.addSearch(searchQuery);
        updatePopularTags(response.results);
      }
    } catch (error: unknown) {
      isOfflineError = isBackendOffline(error);
      errorMessage = isOfflineError
        ? "Backend is offline. Start the daemon with 'pi-brain daemon start'."
        : getErrorMessage(error);
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

    // Show debouncing state while typing
    if (searchQuery.trim()) {
      isDebouncing = true;
    }

    // Debounce search by 300ms
    searchTimeout = setTimeout(() => {
      isDebouncing = false;
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
    performSearch();
  }

  function removeTag(tag: string) {
    selectedTags = selectedTags.filter((t) => t !== tag);
    performSearch();
  }

  function addTag(tag: string) {
    if (tag && !selectedTags.includes(tag)) {
      selectedTags = [...selectedTags, tag];
      performSearch();
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
      isOfflineError = isBackendOffline(error);
      errorMessage = isOfflineError
        ? "Backend is offline. Start the daemon with 'pi-brain daemon start'."
        : getErrorMessage(error);
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

<div class="search-page page-animate">
  <header class="page-header animate-in">
    <h1 class="page-title">Search</h1>
    <p class="page-subtitle page-description">
      Search across all nodes, lessons, decisions, and more in your knowledge graph
    </p>
  </header>

  <!-- Search Box with Suggestions -->
  <div class="search-container">
    <form class="search-box" class:debouncing={isDebouncing} role="search" onsubmit={handleSearchSubmit}>
      {#if isDebouncing}
        <div class="search-spinner"></div>
      {:else}
        <SearchIcon size={20} />
      {/if}
      <input
        type="search"
        placeholder="Search summaries, lessons, decisions..."
        bind:value={searchQuery}
        bind:this={searchInputRef}
        oninput={handleSearchInput}
        onfocus={handleSearchFocus}
        onkeydown={handleSearchKeydown}
        autocomplete="off"
        aria-autocomplete="list"
        aria-controls="search-suggestions"
        aria-expanded={showSuggestions}
      />
      <button
        type="button"
        class="filter-toggle"
        class:active={hasActiveFilters()}
        onclick={() => (showFilters = !showFilters)}
        aria-expanded={showFilters}
        aria-label="Toggle filters"
        bind:this={filterToggleRef}
      >
        <Filter size={20} />
        {#if hasActiveFilters()}
          <span class="filter-badge"></span>
        {/if}
      </button>
    </form>

    <!-- Search Suggestions Dropdown -->
    {#if showSuggestions && ($searchHistory.entries.length > 0 || popularTags.length > 0)}
      <div 
        class="suggestions-dropdown" 
        id="search-suggestions"
        role="listbox"
        bind:this={suggestionsRef}
      >
        <!-- Recent Searches -->
        {#if getSuggestions().length > 0}
          <div class="suggestions-section">
            <div class="suggestions-header">
              <Clock size={14} />
              <span>Recent searches</span>
              {#if $searchHistory.entries.length > 0 && !searchQuery.trim()}
                <button
                  class="btn-text btn-text-danger"
                  style="margin-left: auto; font-size: var(--text-xs);"
                  onclick={() => searchHistory.clearHistory()}
                  type="button"
                >
                  Clear all
                </button>
              {/if}
            </div>
            <ul class="suggestions-list">
              {#each getSuggestions() as suggestion, index (suggestion.query)}
                <li>
                  <div
                    class="suggestion-item"
                    class:selected={index === selectedSuggestionIndex}
                    role="option"
                    aria-selected={index === selectedSuggestionIndex}
                    tabindex="0"
                    onclick={() => selectSuggestion(suggestion.query)}
                    onkeydown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        selectSuggestion(suggestion.query);
                      }
                    }}
                  >
                    <SearchIcon size={14} />
                    <span class="suggestion-text">{suggestion.query}</span>
                    <button
                      type="button"
                      class="remove-suggestion"
                      onclick={(e) => removeFromHistory(suggestion.query, e)}
                      aria-label="Remove from history"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </li>
              {/each}
            </ul>
          </div>
        {/if}

        <!-- Popular Tags -->
        {#if popularTags.length > 0}
          <div class="suggestions-section">
            <div class="suggestions-header">
              <Hash size={14} />
              <span>Popular tags</span>
            </div>
            <div class="quick-tags">
              {#each popularTags as tag (tag)}
                <button 
                  type="button"
                  class="quick-tag"
                  class:active={selectedTags.includes(tag)}
                  onclick={() => addQuickTag(tag)}
                >
                  #{tag}
                </button>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Filters Panel -->
  {#if showFilters}
    <div class="filters-panel" bind:this={filtersPanelRef}>
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
          <div
            class="field-dropdown"
            role="group"
            aria-labelledby="search-in-label"
            bind:this={fieldDropdownRef}
          >
            <button
              class="dropdown-trigger"
              bind:this={dropdownTriggerRef}
              onclick={toggleFieldDropdown}
              aria-haspopup="listbox"
              aria-expanded={showFieldDropdown}
            >
              {selectedFields.length === 0
                ? "All fields"
                : selectedFields.length === allFields.length
                  ? "All fields selected"
                  : `${selectedFields.length} field${selectedFields.length > 1 ? "s" : ""} selected`}
              <ChevronDown size={16} />
            </button>

            {#if showFieldDropdown}
              <div 
                class="dropdown-menu" 
                role="listbox"
                bind:this={fieldDropdownMenuRef}
              >
                <label class="dropdown-option">
                  <input
                    type="checkbox"
                    checked={selectedFields.length === 0}
                    onchange={() => {
                      selectedFields = [];
                      performSearch();
                    }}
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
              aria-label="Add tag filter"
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
      <LoadingState message="Searching..." />
    {:else if errorMessage}
      <ErrorState
        variant={isOfflineError ? "offline" : "failed"}
        title="Search failed"
        description={errorMessage}
        onRetry={performSearch}
        showSettingsLink={isOfflineError}
      />
    {:else if !searchQuery}
      <EmptyState
        icon={SearchIcon}
        title="Search your knowledge graph"
        description="Enter a query to search across summaries, lessons, decisions, and more."
      />
    {:else if results.length === 0}
      <EmptyState
        icon={SearchIcon}
        title="No results found"
        description="Try adjusting your search terms or filters to find what you're looking for."
      />
    {:else}
      <div class="results-info" role="status" aria-live="polite">
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
        <button class="btn-secondary btn-full" style="margin-top: var(--space-6);" onclick={loadMore} disabled={loading}>
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

  .page-description {
    color: var(--color-text-muted);
    margin-bottom: 0;
  }

  /* Search Container */
  .search-container {
    position: relative;
    margin-bottom: var(--space-6);
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
    color: var(--color-text-muted);
    transition: border-color 0.15s ease;
  }

  .search-box:focus-within {
    border-color: var(--color-accent);
    color: var(--color-text);
  }

  .search-box.debouncing {
    border-color: var(--color-accent-muted);
  }

  .search-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid var(--color-border);
    border-top-color: var(--color-accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    flex-shrink: 0;
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
    background: rgba(20, 20, 23, 0.85);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.1);
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
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-4);
    padding: var(--space-12);
    text-align: center;
  }

  .loading-state {
    color: var(--color-text-muted);
  }

  .empty-state {
    color: var(--color-text-subtle);
  }

  .empty-state h2 {
    font-size: var(--text-xl);
    margin-bottom: var(--space-2);
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

  /* Search Suggestions Dropdown */
  .suggestions-dropdown {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    z-index: 100;
    background: rgba(20, 20, 23, 0.85);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    overflow: hidden;
    animation: slideDown 0.15s ease;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .suggestions-section {
    padding: var(--space-3);
  }

  .suggestions-section + .suggestions-section {
    border-top: 1px solid var(--color-border-subtle);
  }

  .suggestions-header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding-bottom: var(--space-2);
    font-size: var(--text-xs);
    font-weight: 500;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .suggestions-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .suggestion-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    width: 100%;
    padding: var(--space-2) var(--space-2);
    background: none;
    border: none;
    border-radius: var(--radius-sm);
    color: var(--color-text);
    font-size: var(--text-sm);
    cursor: pointer;
    text-align: left;
    transition: background 0.15s ease;
  }

  .suggestion-item:hover,
  .suggestion-item.selected {
    background: var(--color-bg-hover);
  }

  .suggestion-item.selected {
    outline: 2px solid var(--color-accent);
    outline-offset: -2px;
  }

  .suggestion-text {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .remove-suggestion {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-1);
    background: none;
    border: none;
    border-radius: var(--radius-sm);
    color: var(--color-text-subtle);
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.15s ease, color 0.15s ease, background 0.15s ease;
  }

  .suggestion-item:hover .remove-suggestion,
  .suggestion-item.selected .remove-suggestion {
    opacity: 1;
  }

  .remove-suggestion:hover {
    background: var(--color-bg);
    color: var(--color-error);
  }

  /* Quick Tags */
  .quick-tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .quick-tag {
    padding: var(--space-1) var(--space-2);
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-full);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
  }

  .quick-tag:hover {
    background: var(--color-bg-hover);
    border-color: var(--color-accent);
    color: var(--color-text);
  }

  .quick-tag.active {
    background: var(--color-accent-muted);
    border-color: var(--color-accent);
    color: var(--color-accent);
  }
</style>
