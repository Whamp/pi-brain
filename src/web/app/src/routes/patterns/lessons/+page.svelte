<svelte:head>
  <title>Lesson Patterns - pi-brain</title>
  <meta name="description" content="Aggregated lesson patterns from sessions" />
</svelte:head>

<script lang="ts">
  import { onMount } from "svelte";
  import { api, getErrorMessage, isBackendOffline } from "$lib/api/client";
  import { formatDistanceToNow, parseDate } from "$lib/utils/date";
  import {
    Lightbulb,
    AlertCircle,
    Loader2,
    Clock,
    Home,
    ChevronRight,
    ChevronDown,
    ChevronLeft,
    ChevronsLeft,
    ChevronsRight,
    BookOpen,
    Search,
    X,
    Filter,
  } from "lucide-svelte";
  import type { AggregatedLessonPattern, LessonLevel } from "$lib/types";

  const PAGE_SIZE = 25;
  const ALL_LEVELS: LessonLevel[] = ["project", "task", "user", "model", "tool", "skill", "subagent"];
  type LevelFilter = LessonLevel | "all";

  let loading = $state(true);
  let errorMessage = $state<string | null>(null);
  let allPatterns = $state<AggregatedLessonPattern[]>([]);

  // Pagination state
  let currentPage = $state(1);
  let searchQuery = $state("");
  let levelFilter = $state<LevelFilter>("all");

  // Collapsible sections state
  let collapsedLevels = $state<Set<string>>(new Set());

  // Filtered and paginated patterns
  let filteredPatterns = $derived.by(() => {
    let result = allPatterns;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.pattern.toLowerCase().includes(query) ||
          p.tags.some((t) => t.toLowerCase().includes(query))
      );
    }

    // Filter by level
    if (levelFilter !== "all") {
      result = result.filter((p) => p.level === levelFilter);
    }

    return result;
  });

  let totalPages = $derived(Math.max(1, Math.ceil(filteredPatterns.length / PAGE_SIZE)));
  let paginatedPatterns = $derived(
    filteredPatterns.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  );

  // Group patterns by level for collapsible view
  let patternsByLevel = $derived.by(() => {
    const grouped: Record<LessonLevel, AggregatedLessonPattern[]> = {
      project: [],
      task: [],
      user: [],
      model: [],
      tool: [],
      skill: [],
      subagent: [],
    };
    for (const p of paginatedPatterns) {
      const level = p.level || "project";
      if (grouped[level]) {
        grouped[level].push(p);
      }
    }
    return grouped;
  });

  // Page numbers to display
  let visiblePages = $derived.by(() => {
    const pages: number[] = [];
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {pages.push(i);}
    } else {
      // Always show first page
      pages.push(1);

      let start = Math.max(2, currentPage - 2);
      let end = Math.min(totalPages - 1, currentPage + 2);

      // Adjust range to show 5 pages in the middle
      if (currentPage <= 3) {
        end = Math.min(totalPages - 1, 5);
      } else if (currentPage >= totalPages - 2) {
        start = Math.max(2, totalPages - 4);
      }

      if (start > 2) {pages.push(-1);} // Ellipsis
      for (let i = start; i <= end; i++) {pages.push(i);}
      if (end < totalPages - 1) {pages.push(-1);} // Ellipsis

      // Always show last page
      if (totalPages > 1) {pages.push(totalPages);}
    }

    return pages;
  });

  async function loadData() {
    loading = true;
    errorMessage = null;
    try {
      // Load all patterns for client-side filtering
      allPatterns = await api.getLessonPatterns({ limit: 1000 });
    } catch (error) {
      errorMessage = isBackendOffline(error)
        ? "Backend is offline. Start the daemon with 'pi-brain daemon start'."
        : getErrorMessage(error);
    } finally {
      loading = false;
    }
  }

  function goToPage(page: number) {
    if (page >= 1 && page <= totalPages) {
      currentPage = page;
      // Scroll to top of list
      document.querySelector(".patterns-content")?.scrollIntoView({ behavior: "smooth" });
    }
  }

  function clearSearch() {
    searchQuery = "";
    currentPage = 1;
  }

  function setLevelFilter(level: LevelFilter) {
    levelFilter = level;
    currentPage = 1;
  }

  function toggleLevel(level: string) {
    const newSet = new Set(collapsedLevels);
    if (newSet.has(level)) {
      newSet.delete(level);
    } else {
      newSet.add(level);
    }
    collapsedLevels = newSet;
  }

  function getLevelColor(level: LessonLevel | string): string {
    switch (level) {
      case "project": {
        return "level-project";
      }
      case "task": {
        return "level-task";
      }
      case "user": {
        return "level-user";
      }
      case "model": {
        return "level-model";
      }
      case "tool": {
        return "level-tool";
      }
      case "skill": {
        return "level-skill";
      }
      case "subagent": {
        return "level-subagent";
      }
      default: {
        return "level-default";
      }
    }
  }

  function getLevelIcon(level: LessonLevel | string): string {
    switch (level) {
      case "project": {
        return "📁";
      }
      case "task": {
        return "📋";
      }
      case "user": {
        return "👤";
      }
      case "model": {
        return "🤖";
      }
      case "tool": {
        return "🔧";
      }
      case "skill": {
        return "⚡";
      }
      case "subagent": {
        return "🔗";
      }
      default: {
        return "💡";
      }
    }
  }

  // Reset page when filters change
  $effect(() => {
    // Track filter dependencies to trigger reset - assign to trigger reactivity
    if (searchQuery !== undefined || levelFilter !== undefined) {
      // Reset to page 1
      currentPage = 1;
    }
  });

  onMount(() => {
    loadData();
  });
</script>

<div class="patterns-page">
  <header class="page-header">
    <h1>
      <Lightbulb size={24} />
      Lesson Patterns
    </h1>
  </header>

  <!-- Breadcrumbs -->
  <nav class="breadcrumbs" aria-label="Breadcrumb navigation">
    <a href="/" class="breadcrumb">
      <Home size={14} />
      <span>Dashboard</span>
    </a>
    <ChevronRight size={14} class="breadcrumb-separator" />
    <span class="breadcrumb active" aria-current="page">
      <Lightbulb size={14} />
      <span>Lesson Patterns</span>
    </span>
  </nav>

  {#if loading}
    <div class="loading-state" role="status" aria-live="polite">
      <Loader2 size={32} class="spinner" />
      <p>Loading lesson patterns...</p>
    </div>
  {:else if errorMessage}
    <div class="error-state">
      <AlertCircle size={32} />
      <p>{errorMessage}</p>
      <button class="btn-primary" onclick={() => loadData()}>
        Retry
      </button>
    </div>
  {:else if allPatterns.length === 0}
    <div class="empty-state">
      <Lightbulb size={48} />
      <p>No lesson patterns recorded yet</p>
      <p class="empty-hint">Lesson patterns are aggregated from session analysis</p>
    </div>
  {:else}
    <div class="patterns-content">
      <!-- Search and Filter Controls -->
      <div class="controls-bar">
        <div class="search-box">
          <Search size={16} class="search-icon" />
          <input
            type="text"
            placeholder="Search lessons..."
            bind:value={searchQuery}
            class="search-input"
          />
          {#if searchQuery}
            <button class="clear-btn" onclick={clearSearch} aria-label="Clear search">
              <X size={14} />
            </button>
          {/if}
        </div>

        <div class="filter-group">
          <Filter size={14} class="filter-icon" />
          <button
            class="filter-btn {levelFilter === 'all' ? 'active' : ''}"
            onclick={() => setLevelFilter("all")}
          >
            All
          </button>
          {#each ALL_LEVELS as level}
            <button
              class="filter-btn {levelFilter === level ? 'active' : ''}"
              onclick={() => setLevelFilter(level)}
            >
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </button>
          {/each}
        </div>
      </div>

      <!-- Results Summary -->
      <div class="results-summary">
        Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(
          currentPage * PAGE_SIZE,
          filteredPatterns.length
        )} of {filteredPatterns.length} lessons
        {#if searchQuery || levelFilter !== "all"}
          <span class="filter-note">(filtered from {allPatterns.length} total)</span>
        {/if}
      </div>

      <!-- Patterns List by Level -->
      <div class="patterns-list">
        {#each ALL_LEVELS as level}
          {#if patternsByLevel[level].length > 0}
            <div class="level-section">
              <button
                class="level-header"
                onclick={() => toggleLevel(level)}
                aria-expanded={!collapsedLevels.has(level)}
              >
                <span class="level-icon">{getLevelIcon(level)}</span>
                <span class="level-name {getLevelColor(level)}">{level}</span>
                <span class="level-count">({patternsByLevel[level].length})</span>
                <span class="collapse-icon">
                  {#if collapsedLevels.has(level)}
                    <ChevronRight size={18} />
                  {:else}
                    <ChevronDown size={18} />
                  {/if}
                </span>
              </button>

              {#if !collapsedLevels.has(level)}
                <div class="level-patterns">
                  {#each patternsByLevel[level] as pattern}
                    <div class="pattern-card">
                      <div class="pattern-header">
                        <BookOpen size={18} class="pattern-icon" />
                        <span class="pattern-title">{pattern.pattern}</span>
                        <span class="pattern-count">{pattern.occurrences}×</span>
                      </div>

                      <div class="pattern-meta">
                        <span class="level-badge {getLevelColor(pattern.level)}">
                          {pattern.level}
                        </span>
                        <span class="meta-item">
                          <Clock size={14} />
                          Last seen {formatDistanceToNow(parseDate(pattern.lastSeen))}
                        </span>
                      </div>

                      {#if pattern.tags && pattern.tags.length > 0}
                        <div class="pattern-tags">
                          {#each pattern.tags as tag}
                            <button
                              class="tag"
                              onclick={() => {
                                searchQuery = tag;
                                currentPage = 1;
                              }}
                              title="Filter by this tag"
                            >
                              {tag}
                            </button>
                          {/each}
                        </div>
                      {/if}
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          {/if}
        {/each}
      </div>

      <!-- Pagination Controls -->
      {#if totalPages > 1}
        <nav class="pagination" aria-label="Pagination">
          <button
            class="page-btn"
            onclick={() => goToPage(1)}
            disabled={currentPage === 1}
            aria-label="First page"
          >
            <ChevronsLeft size={16} />
          </button>
          <button
            class="page-btn"
            onclick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label="Previous page"
          >
            <ChevronLeft size={16} />
          </button>

          <div class="page-numbers">
            {#each visiblePages as page}
              {#if page === -1}
                <span class="page-ellipsis">…</span>
              {:else}
                <button
                  class="page-num {currentPage === page ? 'active' : ''}"
                  onclick={() => goToPage(page)}
                  aria-label="Page {page}"
                  aria-current={currentPage === page ? "page" : undefined}
                >
                  {page}
                </button>
              {/if}
            {/each}
          </div>

          <button
            class="page-btn"
            onclick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            aria-label="Next page"
          >
            <ChevronRight size={16} />
          </button>
          <button
            class="page-btn"
            onclick={() => goToPage(totalPages)}
            disabled={currentPage === totalPages}
            aria-label="Last page"
          >
            <ChevronsRight size={16} />
          </button>
        </nav>
      {/if}
    </div>
  {/if}
</div>

<style>
  .patterns-page {
    max-width: 1000px;
  }

  .page-header {
    margin-bottom: var(--space-4);
  }

  .page-header h1 {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    font-size: var(--text-2xl);
  }

  /* Breadcrumbs */
  .breadcrumbs {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-4);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    margin-bottom: var(--space-4);
  }

  .breadcrumb {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-1) var(--space-2);
    color: var(--color-text-muted);
    font-size: var(--text-sm);
    text-decoration: none;
    border-radius: var(--radius-sm);
  }

  a.breadcrumb:hover {
    background: var(--color-bg-hover);
    color: var(--color-text);
  }

  .breadcrumb.active {
    color: var(--color-accent);
    font-weight: 500;
  }

  .breadcrumb-separator {
    color: var(--color-text-subtle);
  }

  /* Controls Bar */
  .controls-bar {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-4);
    margin-bottom: var(--space-4);
    padding: var(--space-4);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
  }

  .search-box {
    position: relative;
    flex: 1;
    min-width: 200px;
  }

  .search-icon {
    position: absolute;
    left: var(--space-3);
    top: 50%;
    transform: translateY(-50%);
    color: var(--color-text-muted);
  }

  .search-input {
    width: 100%;
    padding: var(--space-2) var(--space-3);
    padding-left: var(--space-8);
    padding-right: var(--space-8);
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    color: var(--color-text);
    font-size: var(--text-sm);
  }

  .search-input:focus {
    outline: none;
    border-color: var(--color-accent);
    box-shadow: 0 0 0 2px var(--color-accent-muted);
  }

  .clear-btn {
    position: absolute;
    right: var(--space-2);
    top: 50%;
    transform: translateY(-50%);
    padding: var(--space-1);
    background: none;
    border: none;
    color: var(--color-text-muted);
    cursor: pointer;
    border-radius: var(--radius-sm);
  }

  .clear-btn:hover {
    background: var(--color-bg-hover);
    color: var(--color-text);
  }

  .filter-group {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .filter-icon {
    color: var(--color-text-muted);
  }

  .filter-btn {
    padding: var(--space-1) var(--space-3);
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    color: var(--color-text-muted);
    font-size: var(--text-sm);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .filter-btn:hover {
    background: var(--color-bg-hover);
    color: var(--color-text);
  }

  .filter-btn.active {
    background: var(--color-accent-muted);
    border-color: var(--color-accent);
    color: var(--color-accent);
  }

  /* Results Summary */
  .results-summary {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    margin-bottom: var(--space-4);
  }

  .filter-note {
    color: var(--color-text-subtle);
  }

  /* Level Sections */
  .level-section {
    margin-bottom: var(--space-4);
  }

  .level-header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    width: 100%;
    padding: var(--space-3) var(--space-4);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    cursor: pointer;
    text-align: left;
    font-size: var(--text-base);
    color: var(--color-text);
    transition: background 0.15s ease;
  }

  .level-header:hover {
    background: var(--color-bg-hover);
  }

  .level-icon {
    font-size: var(--text-lg);
  }

  .level-name {
    font-weight: 600;
    text-transform: capitalize;
  }

  .level-count {
    color: var(--color-text-muted);
    font-size: var(--text-sm);
  }

  .collapse-icon {
    margin-left: auto;
    color: var(--color-text-muted);
    display: flex;
    align-items: center;
  }

  .level-patterns {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    margin-top: var(--space-3);
    padding-left: var(--space-4);
  }

  /* States */
  .loading-state,
  .error-state,
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-12);
    text-align: center;
    color: var(--color-text-muted);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    gap: var(--space-4);
  }

  .error-state {
    color: var(--color-error);
  }

  .empty-hint {
    font-size: var(--text-sm);
    color: var(--color-text-subtle);
  }

  :global(.spinner) {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  /* Patterns List */
  .patterns-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .pattern-card {
    padding: var(--space-4);
    background: rgba(34, 197, 94, 0.05);
    border: 1px solid var(--color-border);
    border-left: 3px solid var(--color-success);
    border-radius: var(--radius-lg);
  }

  .pattern-header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-3);
    color: var(--color-success);
  }

  .pattern-icon {
    flex-shrink: 0;
  }

  .pattern-title {
    flex: 1;
    font-weight: 600;
    color: var(--color-text);
  }

  .pattern-count {
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--color-success);
  }

  .pattern-meta {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    margin-bottom: var(--space-3);
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }

  .meta-item {
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }

  .level-badge {
    padding: 2px 8px;
    border-radius: var(--radius-sm);
    font-size: var(--text-xs);
    font-weight: 500;
    text-transform: capitalize;
  }

  .level-project {
    background: #3b82f620;
    color: #3b82f6;
  }

  .level-task {
    background: #8b5cf620;
    color: #8b5cf6;
  }

  .level-user {
    background: #06b6d420;
    color: #06b6d4;
  }

  .level-model {
    background: #f9731620;
    color: #f97316;
  }

  .level-tool {
    background: #84cc1620;
    color: #84cc16;
  }

  .level-skill {
    background: #eab30820;
    color: #eab308;
  }

  .level-subagent {
    background: #ec489920;
    color: #ec4899;
  }

  .level-default {
    background: var(--color-bg-hover);
    color: var(--color-text-muted);
  }

  .pattern-tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .tag {
    padding: 2px 6px;
    background: var(--color-accent-muted);
    color: var(--color-accent);
    border: none;
    border-radius: var(--radius-sm);
    font-size: var(--text-xs);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .tag:hover {
    background: var(--color-accent);
    color: white;
  }

  /* Pagination */
  .pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    margin-top: var(--space-6);
    padding: var(--space-4);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
  }

  .page-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    color: var(--color-text-muted);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .page-btn:hover:not(:disabled) {
    background: var(--color-bg-hover);
    color: var(--color-text);
    border-color: var(--color-accent);
  }

  .page-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .page-numbers {
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }

  .page-num {
    min-width: 36px;
    height: 36px;
    padding: 0 var(--space-2);
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    color: var(--color-text-muted);
    font-size: var(--text-sm);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .page-num:hover {
    background: var(--color-bg-hover);
    color: var(--color-text);
  }

  .page-num.active {
    background: var(--color-accent);
    border-color: var(--color-accent);
    color: white;
    font-weight: 600;
  }

  .page-ellipsis {
    padding: 0 var(--space-2);
    color: var(--color-text-subtle);
  }

  /* Responsive adjustments */
  @media (max-width: 640px) {
    .controls-bar {
      flex-direction: column;
    }

    .filter-group {
      flex-wrap: wrap;
    }

    .page-numbers {
      display: none;
    }
  }
</style>
