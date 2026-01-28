<svelte:head>
  <title>Sessions - pi-brain</title>
  <meta name="description" content="Browse pi coding agent sessions by project" />
</svelte:head>

<script lang="ts">
  import { api, getErrorMessage, isBackendOffline } from "$lib/api/client";
  import { formatDistanceToNow, formatDate, parseDate } from "$lib/utils/date";
  import {
    FolderTree,
    Folder,
    FileText,
    ChevronRight,
    Home,
    Clock,
    Hash,
    AlertCircle,
    Loader2,
    CheckCircle2,
    XCircle,
    MinusCircle,
  } from "lucide-svelte";
  import type { Node, ProjectSummary, SessionSummary } from "$lib/types";
  import GettingStarted from "$lib/components/getting-started.svelte";

  // View state: "projects" | "sessions" | "nodes"
  let view = $state<"projects" | "sessions" | "nodes">("projects");
  let loading = $state(true);
  let errorMessage = $state<string | null>(null);

  // Data
  let projects = $state<ProjectSummary[]>([]);
  let sessions = $state<SessionSummary[]>([]);
  let nodes = $state<Node[]>([]);

  // Current selection for breadcrumbs
  let currentProject = $state<string | null>(null);
  let currentSession = $state<string | null>(null);

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
    } catch (error) {
      errorMessage = isBackendOffline(error)
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
    } catch (error) {
      errorMessage = isBackendOffline(error)
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
      errorMessage = isBackendOffline(error)
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

  // Helper to get session display name
  function getSessionName(sessionFile: string): string {
    // Handle both / and \ separators for cross-platform compatibility
    const parts = sessionFile.split(/[/\\]/);
    const filename = parts.at(-1) || sessionFile;
    // Truncate if too long
    return filename.length > 50 ? `${filename.slice(0, 47)}...` : filename;
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

  // Load on mount
  $effect(() => {
    loadProjects();
  });
</script>

<div class="sessions-page">
  <header class="page-header">
    <h1>
      <FolderTree size={24} />
      Session Browser
    </h1>
  </header>

  <!-- Breadcrumbs -->
  <nav class="breadcrumbs" aria-label="Breadcrumb navigation">
    <button
      class="breadcrumb"
      class:active={view === "projects"}
      onclick={() => loadProjects()}
      aria-current={view === "projects" ? "page" : undefined}
      disabled={view === "projects"}
    >
      <Home size={14} />
      <span>All Projects</span>
    </button>

    {#if currentProject}
      <ChevronRight size={14} class="breadcrumb-separator" />
      <button
        class="breadcrumb"
        class:active={view === "sessions"}
        onclick={() => loadSessions(currentProject!)}
        aria-current={view === "sessions" ? "page" : undefined}
        disabled={view === "sessions"}
      >
        <Folder size={14} />
        <span>{getProjectName(currentProject)}</span>
      </button>
    {/if}

    {#if currentSession}
      <ChevronRight size={14} class="breadcrumb-separator" />
      <button
        class="breadcrumb active"
        aria-current="page"
        disabled
      >
        <FileText size={14} />
        <span>{getSessionName(currentSession)}</span>
      </button>
    {/if}
  </nav>

  <!-- Loading State -->
  {#if loading}
    <div class="loading-state" role="status" aria-live="polite">
      <Loader2 size={32} class="spinner" />
      <p>Loading...</p>
    </div>
  {:else if errorMessage}
    <!-- Error State -->
    <div class="error-state">
      <AlertCircle size={32} />
      <p>{errorMessage}</p>
      <button class="btn-primary" onclick={() => loadProjects()}>
        Retry
      </button>
    </div>
  {:else if view === "projects"}
    <!-- Projects List -->
    <div class="file-list" aria-label="Projects">
      {#if projects.length === 0}
        <GettingStarted variant="sessions" />
      {:else}
        {#each projects as project}
          <button
            class="file-item"
            onclick={() => loadSessions(project.project)}
          >
            <div class="file-icon project-icon">
              <Folder size={20} />
            </div>
            <div class="file-info">
              <div class="file-name">{getProjectName(project.project)}</div>
              <div class="file-path">{project.project}</div>
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
          </button>
        {/each}
      {/if}
    </div>
  {:else if view === "sessions"}
    <!-- Sessions List -->
    <div class="file-list" aria-label="Sessions">
      {#if sessions.length === 0}
        <div class="empty-state">
          <FileText size={48} />
          <p>No sessions found for this project</p>
        </div>
      {:else}
        {#each sessions as session}
          <button
            class="file-item"
            onclick={() => loadNodes(session.sessionFile)}
          >
            <div class="file-icon session-icon">
              <FileText size={20} />
            </div>
            <div class="file-info">
              <div class="file-name">{getSessionName(session.sessionFile)}</div>
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
                  <span class="type-badge">{type}</span>
                {/each}
                {#if session.types.length > 4}
                  <span class="type-badge more">+{session.types.length - 4}</span>
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
          </button>
        {/each}
      {/if}
    </div>
  {:else if view === "nodes"}
    <!-- Nodes List -->
    <div class="nodes-list" aria-label="Session nodes">
      {#if nodes.length === 0}
        <div class="empty-state">
          <Hash size={48} />
          <p>No nodes in this session</p>
        </div>
      {:else}
        {#each nodes as node, index}
          {@const OutcomeIcon = getOutcomeIcon(node.content.outcome)}
          <a
            href="/nodes/{node.id}"
            class="node-item"
          >
            <div class="node-index">{index + 1}</div>
            <div class="node-content">
              <div class="node-header">
                <span class="node-type type-{node.classification.type}">
                  {node.classification.type}
                </span>
                <span class="node-outcome {getOutcomeColor(node.content.outcome)}">
                  <OutcomeIcon size={14} />
                  {node.content.outcome}
                </span>
              </div>
              <div class="node-summary">{node.content.summary}</div>
              <div class="node-meta">
                <span title="Timestamp">
                  <Clock size={12} />
                  {formatDistanceToNow(parseDate(node.metadata.timestamp))}
                </span>
                <span title="Duration">
                  {node.metadata.durationMinutes} min
                </span>
                <span title="Tokens">
                  {formatTokens(node.metadata.tokensUsed)} tokens
                </span>
              </div>
              {#if node.semantic.tags.length > 0}
                <div class="node-tags">
                  {#each node.semantic.tags.slice(0, 5) as tag}
                    <span class="tag">{tag}</span>
                  {/each}
                  {#if node.semantic.tags.length > 5}
                    <span class="tag more">+{node.semantic.tags.length - 5}</span>
                  {/if}
                </div>
              {/if}
            </div>
            <ChevronRight size={18} class="node-chevron" />
          </a>
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
    overflow-x: auto;
  }

  .breadcrumb {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-1) var(--space-2);
    background: transparent;
    border: none;
    color: var(--color-text-muted);
    font-size: var(--text-sm);
    cursor: pointer;
    border-radius: var(--radius-sm);
    white-space: nowrap;
  }

  .breadcrumb:hover:not(:disabled) {
    background: var(--color-bg-hover);
    color: var(--color-text);
  }

  .breadcrumb.active {
    color: var(--color-accent);
    font-weight: 500;
  }

  .breadcrumb:disabled {
    cursor: default;
  }

  .breadcrumb-separator {
    color: var(--color-text-subtle);
    flex-shrink: 0;
  }

  /* Loading and Error States */
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
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
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
    padding: var(--space-4);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    cursor: pointer;
    text-align: left;
    width: 100%;
    transition:
      border-color var(--transition-fast),
      background var(--transition-fast);
  }

  .file-item:hover {
    border-color: var(--color-accent);
    background: var(--color-bg-hover);
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
    background: #22c55e20;
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

  .type-badge {
    padding: 2px 6px;
    background: var(--color-bg-hover);
    border-radius: var(--radius-sm);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  .type-badge.more {
    color: var(--color-text-subtle);
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
    background: #22c55e20;
    color: var(--color-success);
  }

  .outcome-badge.partial {
    background: #eab30820;
    color: var(--color-warning);
  }

  .outcome-badge.failed {
    background: #ef444420;
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
    padding: var(--space-4);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    text-decoration: none;
    color: inherit;
    transition:
      border-color var(--transition-fast),
      background var(--transition-fast);
  }

  .node-item:hover {
    border-color: var(--color-accent);
    background: var(--color-bg-hover);
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
    background: #3b82f620;
    color: var(--color-node-coding);
  }

  .type-debugging {
    background: #ef444420;
    color: var(--color-node-debugging);
  }

  .type-refactor {
    background: #8b5cf620;
    color: var(--color-node-refactor);
  }

  .type-sysadmin {
    background: #22c55e20;
    color: var(--color-node-sysadmin);
  }

  .type-research {
    background: #eab30820;
    color: var(--color-node-research);
  }

  .type-planning {
    background: #06b6d420;
    color: var(--color-node-planning);
  }

  .type-documentation {
    background: #14b8a620;
    color: var(--color-node-documentation);
  }

  .type-configuration {
    background: #6366f120;
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

  .node-tags .tag {
    padding: 2px 6px;
    background: var(--color-accent-muted);
    color: var(--color-accent);
    border-radius: var(--radius-sm);
    font-size: var(--text-xs);
  }

  .node-tags .tag.more {
    background: var(--color-bg-hover);
    color: var(--color-text-subtle);
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
