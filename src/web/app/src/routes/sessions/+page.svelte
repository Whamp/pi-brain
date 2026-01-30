<svelte:head>
  <title>Sessions - pi-brain</title>
  <meta name="description" content="Browse pi coding agent sessions by project" />
</svelte:head>

<script lang="ts">
  import { api, getErrorMessage, isBackendOffline } from "$lib/api/client";
  import { formatDistanceToNow, formatDate, parseDate } from "$lib/utils/date";
  import { onMount } from "svelte";
  import {
    FolderTree,
    Folder,
    FileText,
    ChevronRight,
    Clock,
    Hash,
    CheckCircle2,
    XCircle,
    MinusCircle,
    AlertCircle,
    SortAsc,
    SortDesc,
  } from "lucide-svelte";
  import type { Node, ProjectSummary, SessionSummary } from "$lib/types";
  import GettingStarted from "$lib/components/getting-started.svelte";
  import ErrorState from "$lib/components/error-state.svelte";
  import SessionsSkeleton from "$lib/components/sessions-skeleton.svelte";
  import Breadcrumbs from "$lib/components/breadcrumbs.svelte";
  import Card from "$lib/components/card.svelte";
  import EmptyState from "$lib/components/empty-state.svelte";
  import Tag from "$lib/components/tag.svelte";

  // View state: "projects" | "sessions" | "nodes"
  let view = $state<"projects" | "sessions" | "nodes">("projects");
  let loading = $state(true);
  let errorMessage = $state<string | null>(null);
  let isOfflineError = $state(false);

  // Persistence keys
  const STORAGE_KEY_SESSIONS_PREFS = "pi-brain-sessions-prefs";

  // Preferences (initialized from localStorage if available)
  let prefs = $state({
    projectSortBy: "lastActivity" as "name" | "sessionCount" | "nodeCount" | "lastActivity",
    projectSortDir: "desc" as "asc" | "desc",
    sessionSortBy: "date" as "date" | "nodeCount" | "tokens" | "cost",
    sessionSortDir: "desc" as "asc" | "desc",
    lastViewedProject: null as string | null,
  });

  // Track if initial load is done to avoid persisting during load
  let prefsLoaded = false;

  // Persist preferences when they change (but not during initial load)
  $effect(() => {
    if (typeof window !== "undefined" && prefsLoaded) {
      localStorage.setItem(STORAGE_KEY_SESSIONS_PREFS, JSON.stringify(prefs));
    }
  });

  // Data
  let projects = $state<ProjectSummary[]>([]);
  let sessions = $state<SessionSummary[]>([]);
  let nodes = $state<Node[]>([]);

  // Current selection for breadcrumbs
  let currentProject = $state<string | null>(null);
  let currentSession = $state<string | null>(null);

  // Sorted data
  const sortedProjects = $derived.by(() =>
    projects.toSorted((a, b) => {
      let comparison = 0;
      switch (prefs.projectSortBy) {
        case "name": {
          comparison = a.project.localeCompare(b.project);
          break;
        }
        case "sessionCount": {
          comparison = a.sessionCount - b.sessionCount;
          break;
        }
        case "nodeCount": {
          comparison = a.nodeCount - b.nodeCount;
          break;
        }
        case "lastActivity": {
          comparison = parseDate(a.lastActivity).getTime() - parseDate(b.lastActivity).getTime();
          break;
        }
        default: {
          comparison = 0;
        }
      }
      return prefs.projectSortDir === "asc" ? comparison : -comparison;
    })
  );

  const sortedSessions = $derived.by(() =>
    sessions.toSorted((a, b) => {
      let comparison = 0;
      switch (prefs.sessionSortBy) {
        case "date": {
          comparison = parseDate(a.firstTimestamp).getTime() - parseDate(b.firstTimestamp).getTime();
          break;
        }
        case "nodeCount": {
          comparison = a.nodeCount - b.nodeCount;
          break;
        }
        case "tokens": {
          comparison = a.totalTokens - b.totalTokens;
          break;
        }
        case "cost": {
          comparison = a.totalCost - b.totalCost;
          break;
        }
        default: {
          comparison = 0;
        }
      }
      return prefs.sessionSortDir === "asc" ? comparison : -comparison;
    })
  );

  // Load projects on mount
  async function loadProjects() {
    loading = true;
    errorMessage = null;
    try {
      const data = await api.getProjects();
      ({ projects } = data);
      view = "projects";
      currentProject = null;
      currentSession = null;
      prefs.lastViewedProject = null;
    } catch (error) {
      isOfflineError = isBackendOffline(error);
      errorMessage = isOfflineError
        ? "Backend is offline. Start the daemon with 'pi-brain daemon start'."
        : getErrorMessage(error);
    } finally {
      loading = false;
    }
  }

  // Load sessions for a project
  async function loadSessions(project: string) {
    loading = true;
    errorMessage = null;
    try {
      const data = await api.getSessionsByProject(project);
      ({ sessions } = data);
      currentProject = project;
      currentSession = null;
      view = "sessions";
      prefs.lastViewedProject = project;
    } catch (error) {
      isOfflineError = isBackendOffline(error);
      errorMessage = isOfflineError
        ? "Backend is offline. Start the daemon with 'pi-brain daemon start'."
        : getErrorMessage(error);
    } finally {
      loading = false;
    }
  }

  // Load nodes for a session
  async function loadNodes(sessionFile: string) {
    loading = true;
    errorMessage = null;
    try {
      const data = await api.getNodesBySession(sessionFile);
      ({ nodes } = data);
      currentSession = sessionFile;
      view = "nodes";
    } catch (error) {
      isOfflineError = isBackendOffline(error);
      errorMessage = isOfflineError
        ? "Backend is offline. Start the daemon with 'pi-brain daemon start'."
        : getErrorMessage(error);
    } finally {
      loading = false;
    }
  }

  // Helper to get project display name
  function getProjectName(project: string): string {
    const parts = project.split("/");
    return parts.at(-1) || project;
  }

  // Generate a deterministic color from project name
  // Returns HSL color values for consistent project identification
  function hashProjectToColor(project: string): { hue: number; saturation: number; lightness: number } {
    const name = getProjectName(project);
    // Simple hash using modular arithmetic (no bitwise operators)
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = ((hash * 31) + (name.codePointAt(i) ?? 0)) % 100_000;
    }
    // Use golden ratio for better hue distribution
    const hue = (hash * 137.508) % 360;
    return { hue, saturation: 65, lightness: 55 };
  }

  // Get CSS variables for project color
  function getProjectColorStyle(project: string): string {
    const { hue, saturation, lightness } = hashProjectToColor(project);
    return `--project-hue: ${hue}; --project-sat: ${saturation}%; --project-light: ${lightness}%;`;
  }

  // Categorize project activity level based on session count and recency
  function getActivityLevel(project: ProjectSummary): "high" | "medium" | "low" {
    const daysSinceActivity = (Date.now() - parseDate(project.lastActivity).getTime()) / (1000 * 60 * 60 * 24);
    const isRecent = daysSinceActivity < 7;
    const isActive = project.sessionCount >= 10;
    
    if (isRecent && isActive) {return "high";}
    if (isRecent || isActive) {return "medium";}
    return "low";
  }

  // Get initials from project name for badge
  function getProjectInitials(project: string): string {
    const name = getProjectName(project);
    // Handle kebab-case and camelCase
    const words = name.split(/[-_]|(?=[A-Z])/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  // Helper to get session display name
  function getSessionName(sessionFile: string): string {
    // Handle both / and \ separators for cross-platform compatibility
    const parts = sessionFile.split(/[/\\]/);
    const filename = parts.at(-1) || sessionFile;
    // Truncate if too long
    return filename.length > 50 ? `${filename.slice(0, 47)}...` : filename;
  }

  // Extract short session ID from filename for display
  // Filename format: 2026-01-05T19-41-33-626Z_94f3b659-cd2c-4d25-9a1...
  function extractSessionId(sessionFile: string): string {
    const parts = sessionFile.split(/[/\\]/);
    const filename = parts.at(-1) || sessionFile;
    // Extract UUID portion after the timestamp (after first underscore)
    const underscoreIndex = filename.indexOf("_");
    if (underscoreIndex > 0) {
      const uuid = filename.slice(underscoreIndex + 1).replace(/\.jsonl$/, "");
      // Return first 8 chars of UUID
      return uuid.slice(0, 8);
    }
    // Fallback: return first 8 chars
    return filename.slice(0, 8);
  }

  // Get outcome icon component
  function getOutcomeIcon(outcome: string) {
    switch (outcome) {
      case "success": {
        return CheckCircle2;
      }
      case "partial": {
        return MinusCircle;
      }
      case "failed": {
        return XCircle;
      }
      default: {
        return AlertCircle;
      }
    }
  }

  // Get outcome color class
  function getOutcomeColor(outcome: string): string {
    switch (outcome) {
      case "success": {
        return "color-success";
      }
      case "partial": {
        return "color-warning";
      }
      case "failed": {
        return "color-error";
      }
      default: {
        return "color-muted";
      }
    }
  }

  // Format token count
  function formatTokens(tokens: number): string {
    if (tokens >= 1_000_000) {
      return `${(tokens / 1_000_000).toFixed(1)}M`;
    }
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}K`;
    }
    return tokens.toString();
  }

  // Build breadcrumb items based on current view
  const breadcrumbItems = $derived.by(() => {
    const items: { label: string; icon?: typeof Folder; onClick?: () => void }[] = [];
    
    // All Projects - always first
    if (view === "projects") {
      items.push({ label: "All Projects", icon: FolderTree });
    } else {
      items.push({ label: "All Projects", icon: FolderTree, onClick: loadProjects });
    }
    
    // Current project
    if (currentProject) {
      const project = currentProject;
      if (view === "sessions") {
        items.push({ label: getProjectName(project), icon: Folder });
      } else if (view === "nodes" && currentSession) {
        items.push({ 
          label: getProjectName(project), 
          icon: Folder, 
          onClick: () => loadSessions(project) 
        });
        items.push({ label: getSessionName(currentSession), icon: FileText });
      }
    }
    
    return items;
  });

  // Load on mount
  onMount(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY_SESSIONS_PREFS);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          prefs = { ...prefs, ...parsed };
          prefsLoaded = true;
          if (parsed.lastViewedProject) {
            loadSessions(parsed.lastViewedProject);
            return;
          }
        } catch {
          // Ignore invalid saved preferences
          prefsLoaded = true;
        }
      } else {
        prefsLoaded = true;
      }
    }
    loadProjects();
  });
</script>

<div class="sessions-page page-animate">
  <header class="page-header animate-in">
    <h1 class="page-title">
      <FolderTree size={28} />
      Session Browser
    </h1>
  </header>

  <!-- Breadcrumbs -->
  <div class="page-controls animate-in">
    <Breadcrumbs items={breadcrumbItems} showHome={false} />

    {#if !loading && !errorMessage && (view === "projects" || view === "sessions")}
      <div class="sort-controls">
        <span class="sort-label">Sort by:</span>
        <select 
          class="sort-select"
          value={view === "projects" ? prefs.projectSortBy : prefs.sessionSortBy}
          onchange={(e) => {
            const val = e.currentTarget.value;
            if (view === "projects") prefs.projectSortBy = val as any;
            else prefs.sessionSortBy = val as any;
          }}
        >
          {#if view === "projects"}
            <option value="lastActivity">Last Activity</option>
            <option value="name">Project Name</option>
            <option value="sessionCount">Sessions</option>
            <option value="nodeCount">Nodes</option>
          {:else}
            <option value="date">Date</option>
            <option value="nodeCount">Nodes</option>
            <option value="tokens">Tokens</option>
            <option value="cost">Cost</option>
          {/if}
        </select>

        <button 
          class="sort-dir-btn"
          title={ (view === "projects" ? prefs.projectSortDir : prefs.sessionSortDir) === "asc" ? "Sort Ascending" : "Sort Descending" }
          onclick={() => {
            if (view === "projects") {
              prefs.projectSortDir = prefs.projectSortDir === "asc" ? "desc" : "asc";
            } else {
              prefs.sessionSortDir = prefs.sessionSortDir === "asc" ? "desc" : "asc";
            }
          }}
        >
          {#if (view === "projects" ? prefs.projectSortDir : prefs.sessionSortDir) === "asc"}
            <SortAsc size={16} />
          {:else}
            <SortDesc size={16} />
          {/if}
        </button>
      </div>
    {/if}
  </div>

  <!-- Loading State -->
  {#if loading}
    <SessionsSkeleton 
      variant={view === "nodes" ? "nodes" : view === "sessions" ? "sessions" : "projects"}
      count={5}
    />
  {:else if errorMessage}
    <!-- Error State -->
    <ErrorState
      variant={isOfflineError ? "offline" : "failed"}
      description={errorMessage}
      onRetry={loadProjects}
      showSettingsLink={isOfflineError}
    />
  {:else if view === "projects"}
    <!-- Projects List -->
    <div class="file-list list-animate" aria-label="Projects">
      {#if sortedProjects.length === 0}
        <GettingStarted variant="sessions" />
      {:else}
        {#each sortedProjects as project}
          {@const activityLevel = getActivityLevel(project)}
          <Card
            tag="button"
            interactive
            class="file-item project-card activity-{activityLevel}"
            onclick={() => loadSessions(project.project)}
            style={getProjectColorStyle(project.project)}
          >
            <div class="project-badge">
              <span class="badge-initials">{getProjectInitials(project.project)}</span>
            </div>
            <div class="file-info">
              <div class="project-name">{getProjectName(project.project)}</div>
              <div class="project-path">{project.project}</div>
            </div>
            <div class="file-meta">
              <span class="meta-item" title="Sessions">
                <FileText size={14} />
                {project.sessionCount}
              </span>
              <span class="meta-item" title="Nodes">
                <Hash size={14} />
                {project.nodeCount}
              </span>
              <span class="meta-item" title="Last activity">
                <Clock size={14} />
                {formatDistanceToNow(parseDate(project.lastActivity))}
              </span>
            </div>
            <ChevronRight size={18} class="file-chevron" />
          </Card>
        {/each}
      {/if}
    </div>
  {:else if view === "sessions"}
    <!-- Sessions List -->
    <div class="file-list list-animate" aria-label="Sessions">
      {#if sortedSessions.length === 0}
        <EmptyState
          icon={FileText}
          title="No sessions found"
          description="No sessions found for this project"
          size="sm"
        />
      {:else}
        {#each sortedSessions as session}
          {@const sessionTitle = session.title || getSessionName(session.sessionFile)}
          {@const sessionId = extractSessionId(session.sessionFile)}
          <Card
            tag="button"
            interactive
            class="file-item session-card"
            onclick={() => loadNodes(session.sessionFile)}
            style={currentProject ? getProjectColorStyle(currentProject) : undefined}
          >
            <div class="session-badge">
              <FileText size={18} />
            </div>
            <div class="file-info">
              <div class="session-title" title={session.title ? session.sessionFile : undefined}>{sessionTitle}</div>
              {#if session.title}
                <div class="session-id" title="Session ID">{sessionId}</div>
              {/if}
              <div class="file-meta-row">
                <span class="meta-item" title="Nodes">
                  <Hash size={12} />
                  {session.nodeCount} nodes
                </span>
                <span class="meta-item" title="Duration">
                  <Clock size={12} />
                  {formatDate(parseDate(session.firstTimestamp))}
                </span>
              </div>
              <div class="session-types">
                {#each session.types.slice(0, 4) as type}
                  <Tag text={type} variant="auto" />
                {/each}
                {#if session.types.length > 4}
                  <Tag text={`+${session.types.length - 4}`} />
                {/if}
              </div>
            </div>
            <div class="file-meta session-meta">
              <div class="outcomes-row">
                {#if session.outcomes.success > 0}
                  <span class="outcome-badge success" title="Success">
                    <CheckCircle2 size={12} />
                    {session.outcomes.success}
                  </span>
                {/if}
                {#if session.outcomes.partial > 0}
                  <span class="outcome-badge partial" title="Partial">
                    <MinusCircle size={12} />
                    {session.outcomes.partial}
                  </span>
                {/if}
                {#if session.outcomes.failed > 0}
                  <span class="outcome-badge failed" title="Failed">
                    <XCircle size={12} />
                    {session.outcomes.failed}
                  </span>
                {/if}
              </div>
              <div class="tokens-cost">
                <span title="Tokens">{formatTokens(session.totalTokens)} tokens</span>
                {#if session.totalCost > 0}
                  <span title="Cost">${session.totalCost.toFixed(2)}</span>
                {/if}
              </div>
            </div>
            <ChevronRight size={18} class="file-chevron" />
          </Card>
        {/each}
      {/if}
    </div>
  {:else if view === "nodes"}
    <!-- Nodes List -->
    <div class="nodes-list list-animate" aria-label="Session nodes">
      {#if nodes.length === 0}
        <EmptyState
          icon={Hash}
          title="No nodes"
          description="No nodes in this session"
          size="sm"
        />
      {:else}
        {#each nodes as node, index}
          {@const OutcomeIcon = getOutcomeIcon(node.content?.outcome ?? "abandoned")}
          <Card
            href="/nodes/{node.id}"
            interactive
            class="node-item"
          >
            <div class="node-index">{index + 1}</div>
            <div class="node-content">
              <div class="node-header">
                <span class="node-type type-{node.classification?.type ?? 'other'}">
                  {node.classification?.type ?? 'other'}
                </span>
                <span class="node-outcome {getOutcomeColor(node.content?.outcome ?? 'abandoned')}">
                  <OutcomeIcon size={14} />
                  {node.content?.outcome ?? 'abandoned'}
                </span>
              </div>
              <div class="node-summary">{node.content?.summary ?? `Node ${node.id}`}</div>
              <div class="node-meta">
                <span title="Timestamp">
                  <Clock size={12} />
                  {node.metadata?.timestamp ? formatDistanceToNow(parseDate(node.metadata.timestamp)) : 'unknown'}
                </span>
                <span title="Duration">
                  {node.metadata?.durationMinutes ?? 0} min
                </span>
                <span title="Tokens">
                  {formatTokens(node.metadata?.tokensUsed ?? 0)} tokens
                </span>
              </div>
              {#if node.semantic?.tags && node.semantic.tags.length > 0}
                <div class="node-tags">
                  {#each node.semantic.tags.slice(0, 5) as tag}
                    <Tag text={tag} variant="auto" />
                  {/each}
                  {#if node.semantic.tags.length > 5}
                    <Tag text={`+${node.semantic.tags.length - 5}`} />
                  {/if}
                </div>
              {/if}
            </div>
            <ChevronRight size={18} class="node-chevron" />
          </Card>
        {/each}
      {/if}
    </div>
  {/if}
</div>

<style>
  .sessions-page {
    max-width: 1000px;
  }

  .page-header {
    margin-bottom: var(--space-4);
  }

  .page-header h1 {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .page-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-4);
    gap: var(--space-4);
    flex-wrap: wrap;
  }

  .sort-controls {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    background: var(--color-bg-elevated);
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border);
  }

  .sort-label {
    font-size: var(--text-xs);
    color: var(--color-text-subtle);
    font-weight: 500;
  }

  .sort-select {
    background: transparent;
    border: none;
    color: var(--color-text);
    font-size: var(--text-xs);
    font-weight: 600;
    padding: var(--space-1);
    cursor: pointer;
    outline: none;
  }

  .sort-select option {
    background: var(--color-bg-elevated);
    color: var(--color-text);
  }

  .sort-dir-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    color: var(--color-text-muted);
    padding: var(--space-1);
    cursor: pointer;
    border-radius: var(--radius-sm);
    transition: all 0.2s ease;
  }

  .sort-dir-btn:hover {
    background: var(--color-bg-hover);
    color: var(--color-accent);
  }

  /* Loading and Empty States */
  .loading-state,
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

  .empty-hint {
    font-size: var(--text-sm);
    color: var(--color-text-subtle);
  }

  /* File List */
  .file-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .file-item {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    text-align: left;
    width: 100%;
  }

  /* Project Cards with Color-coded Badges */
  .project-card {
    --project-color: hsl(var(--project-hue, 200), var(--project-sat, 65%), var(--project-light, 55%));
    --project-color-muted: hsl(var(--project-hue, 200), var(--project-sat, 65%), var(--project-light, 55%), 0.15);
    border-left: 3px solid var(--project-color);
    transition: all 0.2s ease;
  }

  .project-card:hover {
    border-left-color: var(--project-color);
    box-shadow: 
      inset 3px 0 0 0 var(--project-color-muted),
      var(--shadow-sm);
  }

  /* Activity level variations */
  .project-card.activity-high {
    padding: var(--space-4) var(--space-5);
  }

  .project-card.activity-high :global(.project-name),
  :global(.project-card.activity-high) .project-name {
    font-size: var(--text-lg);
  }

  .project-card.activity-medium {
    padding: var(--space-3) var(--space-4);
  }

  .project-card.activity-low {
    padding: var(--space-2) var(--space-4);
    opacity: 0.85;
  }

  .project-card.activity-low :global(.project-name),
  :global(.project-card.activity-low) .project-name {
    font-size: var(--text-sm);
  }

  .project-badge {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: var(--radius-md);
    background: var(--project-color-muted);
    flex-shrink: 0;
  }

  .badge-initials {
    font-weight: 700;
    font-size: var(--text-sm);
    color: var(--project-color);
    letter-spacing: 0.5px;
  }

  .project-name {
    font-weight: 600;
    font-size: var(--text-base);
    color: var(--color-text);
    margin-bottom: var(--space-1);
  }

  .project-path {
    font-size: var(--text-xs);
    color: var(--color-text-subtle);
    font-family: var(--font-mono);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    opacity: 0.7;
  }

  /* Session Cards with Project Color Context */
  .session-card {
    --project-color: hsl(var(--project-hue, 145), var(--project-sat, 65%), var(--project-light, 52%));
    --project-color-muted: hsl(var(--project-hue, 145), var(--project-sat, 65%), var(--project-light, 52%), 0.15);
  }

  .session-badge {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: var(--radius-md);
    background: var(--project-color-muted);
    color: var(--project-color);
    flex-shrink: 0;
  }

  .session-title {
    font-weight: 500;
    font-size: var(--text-base);
    color: var(--color-text);
    margin-bottom: var(--space-1);
  }

  .file-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: var(--radius-md);
    flex-shrink: 0;
  }

  .project-icon {
    background: var(--color-accent-muted);
    color: var(--color-accent);
  }

  .session-icon {
    background: hsla(145, 65%, 52%, 0.15);
    color: var(--color-success);
  }

  .file-info {
    flex: 1;
    min-width: 0;
  }

  .file-name {
    font-weight: 500;
    color: var(--color-text);
    margin-bottom: var(--space-1);
  }

  .file-path {
    font-size: var(--text-xs);
    color: var(--color-text-subtle);
    font-family: var(--font-mono);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .session-id {
    font-size: var(--text-xs);
    color: var(--color-text-subtle);
    font-family: var(--font-mono);
    margin-bottom: var(--space-1);
  }

  .file-meta-row {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    font-size: var(--text-xs);
    color: var(--color-text-subtle);
    margin-bottom: var(--space-2);
  }

  .file-meta {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }

  .session-meta {
    flex-direction: column;
    align-items: flex-end;
    gap: var(--space-2);
  }

  .meta-item {
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }

  .file-chevron,
  .node-chevron {
    color: var(--color-text-subtle);
    flex-shrink: 0;
  }

  /* Session Types */
  .session-types {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
  }

  /* Outcomes */
  .outcomes-row {
    display: flex;
    gap: var(--space-2);
  }

  .outcome-badge {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 2px 6px;
    border-radius: var(--radius-sm);
    font-size: var(--text-xs);
    font-weight: 500;
  }

  .outcome-badge.success {
    background: hsla(145, 65%, 52%, 0.15);
    color: var(--color-success);
  }

  .outcome-badge.partial {
    background: hsla(45, 85%, 55%, 0.15);
    color: var(--color-warning);
  }

  .outcome-badge.failed {
    background: var(--color-error-muted);
    color: var(--color-error);
  }

  .tokens-cost {
    display: flex;
    gap: var(--space-3);
    font-size: var(--text-xs);
    color: var(--color-text-subtle);
  }

  /* Nodes List */
  .nodes-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .node-item {
    display: flex;
    align-items: flex-start;
    gap: var(--space-4);
    text-decoration: none;
    color: inherit;
  }

  .node-index {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--color-bg-hover);
    color: var(--color-text-muted);
    font-size: var(--text-sm);
    font-weight: 600;
    flex-shrink: 0;
  }

  .node-content {
    flex: 1;
    min-width: 0;
  }

  .node-header {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    margin-bottom: var(--space-2);
  }

  .node-type {
    padding: 2px 8px;
    border-radius: var(--radius-sm);
    font-size: var(--text-xs);
    font-weight: 500;
    text-transform: capitalize;
  }

  .type-coding {
    background: hsla(210, 72%, 60%, 0.15);
    color: var(--color-node-coding);
  }

  .type-debugging {
    background: hsla(0, 72%, 62%, 0.15);
    color: var(--color-node-debugging);
  }

  .type-refactor {
    background: hsla(270, 72%, 62%, 0.15);
    color: var(--color-node-refactor);
  }

  .type-sysadmin {
    background: hsla(145, 65%, 52%, 0.15);
    color: var(--color-node-sysadmin);
  }

  .type-research {
    background: hsla(45, 85%, 55%, 0.15);
    color: var(--color-node-research);
  }

  .type-planning {
    background: hsla(190, 72%, 55%, 0.15);
    color: var(--color-node-planning);
  }

  .type-documentation {
    background: hsla(170, 65%, 50%, 0.15);
    color: var(--color-node-documentation);
  }

  .type-configuration {
    background: hsla(235, 65%, 62%, 0.15);
    color: var(--color-node-configuration);
  }

  .type-other {
    background: var(--color-bg-hover);
    color: var(--color-text-muted);
  }

  .node-outcome {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    font-size: var(--text-xs);
    text-transform: capitalize;
  }

  .color-success {
    color: var(--color-success);
  }

  .color-warning {
    color: var(--color-warning);
  }

  .color-error {
    color: var(--color-error);
  }

  .color-muted {
    color: var(--color-text-muted);
  }

  .node-summary {
    color: var(--color-text);
    line-height: 1.5;
    margin-bottom: var(--space-2);
  }

  .node-meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    font-size: var(--text-xs);
    color: var(--color-text-subtle);
    margin-bottom: var(--space-2);
  }

  .node-meta span {
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }

  .node-tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
  }

  .node-chevron {
    margin-top: 6px;
  }

  /* Responsive */
  @media (max-width: 640px) {
    .file-item {
      flex-wrap: wrap;
    }

    .file-meta {
      width: 100%;
      margin-top: var(--space-2);
      margin-left: 56px;
    }

    .session-meta {
      align-items: flex-start;
    }
  }
</style>
