<script lang="ts">
  import { page } from "$app/state";
  import { onMount } from "svelte";
  import {
    ArrowLeft,
    ArrowRight,
    Clock,
    Coins,
    FileText,
    GitBranch,
    ChevronDown,
    ChevronRight,
    Tag,
    AlertCircle,
    CheckCircle,
    XCircle,
    Circle,
    Folder,
    Zap,
    History,
    ExternalLink,
  } from "lucide-svelte";
  import { api } from "$lib/api/client";
  import type { Node, Edge, LessonLevel } from "$lib/types";

  const nodeId = $derived(page.params.id);

  let node: Node | null = $state(null);
  let edges: Edge[] = $state([]);
  let versions: { version: number; analyzedAt: string }[] = $state([]);
  let loading = $state(true);
  let errorMessage: string | null = $state(null);

  // Collapsed state for decisions
  let expandedDecisions: Record<number, boolean> = $state({});

  // Lesson grouping
  let lessonGroupBy: "level" | "confidence" = $state("level");

  async function loadNode() {
    if (!nodeId) {
      errorMessage = "No node ID provided";
      loading = false;
      return;
    }

    loading = true;
    errorMessage = null;

    try {
      const result = await api.getNode(nodeId, {
        include: ["edges", "versions"],
      });
      ({ node, edges = [], versions = [] } = {
        node: result.node,
        edges: result.edges ?? [],
        versions: result.versions ?? [],
      });
    } catch (error: unknown) {
      errorMessage = error instanceof Error ? error.message : "Failed to load node";
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    loadNode();
  });

  // Re-load when nodeId changes
  $effect(() => {
    if (nodeId) {
      loadNode();
    }
  });

  function getOutcomeIcon(outcome: string) {
    switch (outcome) {
      case "success": {
        return CheckCircle;
      }
      case "partial": {
        return AlertCircle;
      }
      case "failed": {
        return XCircle;
      }
      case "abandoned": {
        return Circle;
      }
      default: {
        return Circle;
      }
    }
  }

  function getOutcomeClass(outcome: string): string {
    switch (outcome) {
      case "success": {
        return "outcome-success";
      }
      case "partial": {
        return "outcome-partial";
      }
      case "failed": {
        return "outcome-failed";
      }
      case "abandoned": {
        return "outcome-abandoned";
      }
      default: {
        return "";
      }
    }
  }

  function formatDate(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }

  function formatTokens(count: number): string {
    if (count >= 1_000_000) {
      return `${(count / 1_000_000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  }

  function formatCost(cost: number): string {
    if (cost === 0) {
      return "$0.00";
    }
    if (cost < 0.01) {
      return "<$0.01";
    }
    return `$${cost.toFixed(2)}`;
  }

  function toggleDecision(index: number) {
    expandedDecisions[index] = !expandedDecisions[index];
  }

  function getProjectName(path: string): string {
    return path.split("/").at(-1) ?? path;
  }

  function getEdgeLabel(edge: Edge): string {
    switch (edge.type) {
      case "fork": {
        return "fork";
      }
      case "branch": {
        return "branch";
      }
      case "continuation": {
        return "continues";
      }
      case "resume": {
        return "resume";
      }
      case "compaction": {
        return "compact";
      }
      case "semantic": {
        return "related";
      }
      case "reference": {
        return "refs";
      }
      case "lesson_application": {
        return "applies";
      }
      case "failure_pattern": {
        return "same pattern";
      }
      default: {
        return edge.type;
      }
    }
  }

  const levelIcons: Record<LessonLevel, string> = {
    project: "📁",
    task: "📋",
    user: "👤",
    model: "🤖",
    tool: "🔧",
    skill: "⚡",
    subagent: "🔀",
  };

  const levelLabels: Record<LessonLevel, string> = {
    project: "Project",
    task: "Task",
    user: "User",
    model: "Model",
    tool: "Tool",
    skill: "Skill",
    subagent: "Subagent",
  };

  function getAllLessons(
    lessons: Node["lessons"]
  ): { lesson: Node["lessons"]["project"][0]; level: LessonLevel }[] {
    const levels: LessonLevel[] = [
      "project",
      "task",
      "user",
      "model",
      "tool",
      "skill",
      "subagent",
    ];
    const result: { lesson: Node["lessons"]["project"][0]; level: LessonLevel }[] = [];

    for (const level of levels) {
      for (const lesson of lessons[level]) {
        result.push({ lesson, level });
      }
    }

    return result;
  }

  function getLessonCount(lessons: Node["lessons"]): number {
    return (
      lessons.project.length +
      lessons.task.length +
      lessons.user.length +
      lessons.model.length +
      lessons.tool.length +
      lessons.skill.length +
      lessons.subagent.length
    );
  }

  // Separate edges into incoming and outgoing
  const incomingEdges = $derived(
    edges.filter((e) => e.targetNodeId === nodeId)
  );
  const outgoingEdges = $derived(
    edges.filter((e) => e.sourceNodeId === nodeId)
  );
</script>

<svelte:head>
  <title>{node?.content.summary ?? `Node ${nodeId}`} - pi-brain</title>
  <meta name="description" content="View node details and lessons learned" />
</svelte:head>

<div class="node-detail-page">
  <a href="/graph" class="back-link">
    <ArrowLeft size={16} />
    Back to Graph
  </a>

  {#if loading}
    <div class="loading-state">
      <div class="loading-spinner"></div>
      <p>Loading node...</p>
    </div>
  {:else if errorMessage}
    <div class="error-state">
      <AlertCircle size={24} />
      <p>{errorMessage}</p>
      <button class="retry-button" onclick={loadNode}>Retry</button>
    </div>
  {:else if node}
    <!-- Header Card -->
    <div class="header-card">
      <div class="header-top">
        <div class="summary-row">
          {#if node.content.outcome}
            {@const OutcomeIcon = getOutcomeIcon(node.content.outcome)}
            <span class={`outcome-icon ${getOutcomeClass(node.content.outcome)}`}>
              <OutcomeIcon size={20} />
            </span>
          {/if}
          <h1 class="node-summary">{node.content.summary}</h1>
        </div>
      </div>

      <div class="header-meta">
        <div class="meta-row">
          <span class="meta-item">
            <Folder size={14} />
            <a href={`/graph?project=${encodeURIComponent(node.classification.project)}`}>
              {getProjectName(node.classification.project)}
            </a>
          </span>
          <span class="meta-separator">•</span>
          <span class="meta-item type-badge" data-type={node.classification.type}>
            {node.classification.type}
          </span>
          <span class="meta-separator">•</span>
          <span class={`meta-item outcome-text ${getOutcomeClass(node.content.outcome)}`}>
            {node.content.outcome}
          </span>
          {#if node.version > 1}
            <span class="meta-separator">•</span>
            <span class="meta-item version-badge">
              <History size={14} />
              v{node.version}
            </span>
          {/if}
        </div>

        <div class="meta-row secondary">
          <span class="meta-item">
            <Clock size={14} />
            {formatDate(node.metadata.timestamp)}
          </span>
          <span class="meta-separator">•</span>
          <span class="meta-item">
            {formatDuration(node.metadata.durationMinutes)}
          </span>
          <span class="meta-separator">•</span>
          <span class="meta-item">
            <Zap size={14} />
            {formatTokens(node.metadata.tokensUsed)} tokens
          </span>
          <span class="meta-separator">•</span>
          <span class="meta-item">
            <Coins size={14} />
            {formatCost(node.metadata.cost)}
          </span>
        </div>

        {#if node.semantic.tags.length > 0}
          <div class="tags-row">
            {#each node.semantic.tags as tag}
              <a href={`/search?tags=${encodeURIComponent(tag)}`} class="tag">
                {tag}
              </a>
            {/each}
          </div>
        {/if}
      </div>
    </div>

    <div class="content-grid">
      <!-- Left Column -->
      <div class="main-column">
        <!-- Key Decisions -->
        {#if node.content.keyDecisions.length > 0}
          <section class="card">
            <h2 class="section-title">
              <GitBranch size={18} />
              Key Decisions
            </h2>

            <div class="decisions-list">
              {#each node.content.keyDecisions as decision, index}
                <div class="decision-item">
                  <button
                    class="decision-header"
                    onclick={() => toggleDecision(index)}
                    aria-expanded={expandedDecisions[index] ?? false}
                  >
                    {#if expandedDecisions[index]}
                      <ChevronDown size={16} />
                    {:else}
                      <ChevronRight size={16} />
                    {/if}
                    <span class="decision-what">{decision.what}</span>
                  </button>

                  {#if expandedDecisions[index]}
                    <div class="decision-details">
                      <div class="decision-why">
                        <strong>Why:</strong>
                        {decision.why}
                      </div>
                      {#if decision.alternativesConsidered.length > 0}
                        <div class="decision-alternatives">
                          <strong>Alternatives considered:</strong>
                          <ul>
                            {#each decision.alternativesConsidered as alt}
                              <li>{alt}</li>
                            {/each}
                          </ul>
                        </div>
                      {/if}
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          </section>
        {/if}

        <!-- Lessons -->
        {#if getLessonCount(node.lessons) > 0}
          <section class="card">
            <div class="section-header">
              <h2 class="section-title">
                <Tag size={18} />
                Lessons
                <span class="count">({getLessonCount(node.lessons)})</span>
              </h2>
              <select
                class="group-select"
                bind:value={lessonGroupBy}
                aria-label="Group lessons by"
              >
                <option value="level">By Level</option>
                <option value="confidence">By Confidence</option>
              </select>
            </div>

            <div class="lessons-list">
              {#if lessonGroupBy === "level"}
                {#each ["project", "task", "user", "model", "tool", "skill", "subagent"] as level}
                  {#if node.lessons[level as LessonLevel].length > 0}
                    <div class="lesson-group">
                      <h3 class="group-header">
                        <span class="level-icon">{levelIcons[level as LessonLevel]}</span>
                        {levelLabels[level as LessonLevel]}
                        <span class="count">({node.lessons[level as LessonLevel].length})</span>
                      </h3>

                      {#each node.lessons[level as LessonLevel] as lesson}
                        <div class="lesson-item" data-confidence={lesson.confidence}>
                          <div class="lesson-summary">{lesson.summary}</div>
                          {#if lesson.details}
                            <div class="lesson-details">{lesson.details}</div>
                          {/if}
                          <div class="lesson-meta">
                            <span class="confidence-badge" data-level={lesson.confidence}>
                              {lesson.confidence}
                            </span>
                            {#if lesson.tags && lesson.tags.length > 0}
                              <div class="lesson-tags">
                                {#each lesson.tags as tag}
                                  <span class="lesson-tag">#{tag}</span>
                                {/each}
                              </div>
                            {/if}
                          </div>
                        </div>
                      {/each}
                    </div>
                  {/if}
                {/each}
              {:else}
                <!-- Group by confidence -->
                {#each ["high", "medium", "low"] as confidence}
                  {@const lessonsAtLevel = getAllLessons(node.lessons).filter(
                    (l) => l.lesson.confidence === confidence
                  )}
                  {#if lessonsAtLevel.length > 0}
                    <div class="lesson-group">
                      <h3 class="group-header">
                        <span class="confidence-badge" data-level={confidence}>
                          {confidence}
                        </span>
                        confidence
                        <span class="count">({lessonsAtLevel.length})</span>
                      </h3>

                      {#each lessonsAtLevel as { lesson, level }}
                        <div class="lesson-item">
                          <div class="lesson-summary">
                            <span class="level-icon">{levelIcons[level]}</span>
                            {lesson.summary}
                          </div>
                          {#if lesson.details}
                            <div class="lesson-details">{lesson.details}</div>
                          {/if}
                        </div>
                      {/each}
                    </div>
                  {/if}
                {/each}
              {/if}
            </div>
          </section>
        {/if}

        <!-- Model Observations -->
        {#if node.observations.modelQuirks.length > 0 || node.observations.promptingWins.length > 0 || node.observations.promptingFailures.length > 0}
          <section class="card">
            <h2 class="section-title">Model Observations</h2>

            {#if node.observations.promptingWins.length > 0}
              <div class="observation-group">
                <h3 class="sub-title success">✓ Prompting Wins</h3>
                <ul class="observation-list">
                  {#each node.observations.promptingWins as win}
                    <li>{win}</li>
                  {/each}
                </ul>
              </div>
            {/if}

            {#if node.observations.promptingFailures.length > 0}
              <div class="observation-group">
                <h3 class="sub-title error">✗ Prompting Failures</h3>
                <ul class="observation-list">
                  {#each node.observations.promptingFailures as failure}
                    <li>{failure}</li>
                  {/each}
                </ul>
              </div>
            {/if}

            {#if node.observations.modelQuirks.length > 0}
              <div class="observation-group">
                <h3 class="sub-title">Model Quirks</h3>
                {#each node.observations.modelQuirks as quirk}
                  <div class="quirk-item">
                    <div class="quirk-model">{quirk.model}</div>
                    <div class="quirk-observation">{quirk.observation}</div>
                    <div class="quirk-meta">
                      <span class="frequency-badge" data-frequency={quirk.frequency}>
                        {quirk.frequency}
                      </span>
                      {#if quirk.workaround}
                        <span class="workaround">💡 {quirk.workaround}</span>
                      {/if}
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </section>
        {/if}
      </div>

      <!-- Right Column -->
      <div class="side-column">
        <!-- Connected Nodes -->
        {#if edges.length > 0}
          <section class="card">
            <h2 class="section-title">Connected Nodes</h2>

            {#if incomingEdges.length > 0}
              <div class="connections-group">
                <h3 class="sub-title">
                  <ArrowLeft size={14} />
                  Incoming
                </h3>
                {#each incomingEdges as edge}
                  <a href={`/nodes/${edge.sourceNodeId}`} class="connection-link">
                    <span class="edge-type">{getEdgeLabel(edge)}</span>
                    <span class="connection-id">{edge.sourceNodeId.slice(0, 8)}...</span>
                    <ArrowRight size={14} />
                  </a>
                {/each}
              </div>
            {/if}

            {#if outgoingEdges.length > 0}
              <div class="connections-group">
                <h3 class="sub-title">
                  <ArrowRight size={14} />
                  Outgoing
                </h3>
                {#each outgoingEdges as edge}
                  <a href={`/nodes/${edge.targetNodeId}`} class="connection-link">
                    <span class="edge-type">{getEdgeLabel(edge)}</span>
                    <span class="connection-id">{edge.targetNodeId.slice(0, 8)}...</span>
                    <ArrowRight size={14} />
                  </a>
                {/each}
              </div>
            {/if}
          </section>
        {/if}

        <!-- Files Touched -->
        {#if node.content.filesTouched.length > 0}
          <section class="card">
            <h2 class="section-title">
              <FileText size={18} />
              Files Touched
              <span class="count">({node.content.filesTouched.length})</span>
            </h2>

            <ul class="files-list">
              {#each node.content.filesTouched as file}
                <li class="file-item">
                  <code>{file}</code>
                </li>
              {/each}
            </ul>
          </section>
        {/if}

        <!-- Version History -->
        {#if versions.length > 1}
          <section class="card">
            <h2 class="section-title">
              <History size={18} />
              Version History
            </h2>

            <div class="versions-list">
              {#each versions as ver}
                <div class="version-item" class:current={ver.version === node.version}>
                  <span class="version-number">v{ver.version}</span>
                  <span class="version-date">{formatDate(ver.analyzedAt)}</span>
                  {#if ver.version === node.version}
                    <span class="current-badge">current</span>
                  {/if}
                </div>
              {/each}
            </div>
          </section>
        {/if}

        <!-- Raw Session Link -->
        <section class="card">
          <a href={`/sessions?file=${encodeURIComponent(node.source.sessionFile)}`} class="session-link">
            <ExternalLink size={16} />
            View Raw Session
          </a>
          <div class="session-meta">
            <span>Computer: {node.source.computer}</span>
            <span>Entries: {node.source.segment.startEntryId} → {node.source.segment.endEntryId}</span>
          </div>
        </section>
      </div>
    </div>
  {:else}
    <div class="empty-state">
      <p>Node not found</p>
    </div>
  {/if}
</div>

<style>
  .node-detail-page {
    padding: var(--space-6);
    max-width: 1400px;
    margin: 0 auto;
  }

  .back-link {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    color: var(--color-text-muted);
    font-size: var(--text-sm);
    margin-bottom: var(--space-4);
    text-decoration: none;
  }

  .back-link:hover {
    color: var(--color-accent);
  }

  /* Loading & Error States */
  .loading-state,
  .error-state,
  .empty-state {
    padding: var(--space-12);
    text-align: center;
    color: var(--color-text-muted);
  }

  .loading-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--color-border);
    border-top-color: var(--color-accent);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto var(--space-4);
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .error-state {
    color: var(--color-error);
  }

  .retry-button {
    margin-top: var(--space-4);
    padding: var(--space-2) var(--space-4);
    background: var(--color-accent);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
  }

  /* Header Card */
  .header-card {
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-6);
    margin-bottom: var(--space-6);
  }

  .header-top {
    margin-bottom: var(--space-4);
  }

  .summary-row {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
  }

  .outcome-icon {
    flex-shrink: 0;
    margin-top: 2px;
  }

  .outcome-icon.outcome-success {
    color: var(--color-success);
  }

  .outcome-icon.outcome-partial {
    color: var(--color-warning);
  }

  .outcome-icon.outcome-failed {
    color: var(--color-error);
  }

  .outcome-icon.outcome-abandoned {
    color: var(--color-text-subtle);
  }

  .node-summary {
    font-size: var(--text-xl);
    font-weight: 600;
    line-height: 1.4;
    margin: 0;
  }

  .header-meta {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .meta-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-1);
    font-size: var(--text-sm);
  }

  .meta-row.secondary {
    color: var(--color-text-muted);
  }

  .meta-item {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
  }

  .meta-item a {
    color: var(--color-accent);
    text-decoration: none;
  }

  .meta-item a:hover {
    text-decoration: underline;
  }

  .meta-separator {
    color: var(--color-text-subtle);
    margin: 0 var(--space-1);
  }

  .type-badge {
    padding: 2px 8px;
    background: var(--color-bg);
    border-radius: var(--radius-sm);
    font-weight: 500;
    text-transform: capitalize;
  }

  .type-badge[data-type="coding"] {
    color: var(--color-node-coding);
  }

  .type-badge[data-type="debugging"] {
    color: var(--color-node-debugging);
  }

  .type-badge[data-type="refactor"] {
    color: var(--color-node-refactoring);
  }

  .type-badge[data-type="sysadmin"] {
    color: var(--color-node-sysadmin);
  }

  .type-badge[data-type="research"] {
    color: var(--color-node-research);
  }

  .type-badge[data-type="planning"] {
    color: var(--color-node-planning);
  }

  .outcome-text.outcome-success {
    color: var(--color-success);
  }

  .outcome-text.outcome-partial {
    color: var(--color-warning);
  }

  .outcome-text.outcome-failed {
    color: var(--color-error);
  }

  .version-badge {
    color: var(--color-accent);
  }

  .tags-row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin-top: var(--space-3);
  }

  .tag {
    padding: 4px 10px;
    background: var(--color-accent-muted);
    color: var(--color-accent);
    border-radius: var(--radius-sm);
    font-size: var(--text-xs);
    text-decoration: none;
    transition: background-color 0.15s ease;
  }

  .tag:hover {
    background: var(--color-accent);
    color: white;
  }

  /* Content Grid */
  .content-grid {
    display: grid;
    grid-template-columns: 1fr 360px;
    gap: var(--space-6);
  }

  @media (max-width: 1024px) {
    .content-grid {
      grid-template-columns: 1fr;
    }
  }

  .card {
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-4);
    margin-bottom: var(--space-4);
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-4);
  }

  .section-title {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-base);
    font-weight: 600;
    margin: 0 0 var(--space-4);
    color: var(--color-text);
  }

  .section-title .count {
    color: var(--color-text-subtle);
    font-weight: 400;
  }

  .section-header .section-title {
    margin-bottom: 0;
  }

  .group-select {
    padding: var(--space-1) var(--space-2);
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    color: var(--color-text-muted);
    font-size: var(--text-sm);
    cursor: pointer;
  }

  .sub-title {
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--color-text-muted);
    margin: 0 0 var(--space-2);
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .sub-title.success {
    color: var(--color-success);
  }

  .sub-title.error {
    color: var(--color-error);
  }

  /* Decisions */
  .decisions-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .decision-item {
    background: var(--color-bg);
    border-radius: var(--radius-md);
    overflow: hidden;
  }

  .decision-header {
    width: 100%;
    display: flex;
    align-items: flex-start;
    gap: var(--space-2);
    padding: var(--space-3);
    background: none;
    border: none;
    color: var(--color-text);
    cursor: pointer;
    text-align: left;
    font-size: var(--text-sm);
  }

  .decision-header:hover {
    background: var(--color-bg-hover);
  }

  .decision-what {
    font-weight: 500;
  }

  .decision-details {
    padding: 0 var(--space-3) var(--space-3);
    padding-left: calc(var(--space-3) + 24px);
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }

  .decision-why {
    margin-bottom: var(--space-2);
  }

  .decision-alternatives ul {
    margin: var(--space-1) 0 0 var(--space-4);
    padding: 0;
  }

  .decision-alternatives li {
    color: var(--color-text-subtle);
  }

  /* Lessons */
  .lessons-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .lesson-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .group-header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--color-text-muted);
    margin: 0;
  }

  .group-header .count {
    font-weight: 400;
    color: var(--color-text-subtle);
  }

  .level-icon {
    font-size: var(--text-base);
  }

  .lesson-item {
    padding: var(--space-3);
    background: var(--color-bg);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-md);
  }

  .lesson-summary {
    font-weight: 500;
    margin-bottom: var(--space-1);
    display: flex;
    align-items: flex-start;
    gap: var(--space-2);
  }

  .lesson-details {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    line-height: 1.5;
    margin-bottom: var(--space-2);
  }

  .lesson-meta {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .confidence-badge {
    font-size: var(--text-xs);
    padding: 2px 6px;
    border-radius: var(--radius-sm);
    text-transform: uppercase;
    font-weight: 500;
  }

  .confidence-badge[data-level="high"] {
    background: var(--color-success);
    color: white;
  }

  .confidence-badge[data-level="medium"] {
    background: var(--color-warning);
    color: black;
  }

  .confidence-badge[data-level="low"] {
    background: var(--color-text-subtle);
    color: white;
  }

  .lesson-tags {
    display: flex;
    gap: var(--space-1);
  }

  .lesson-tag {
    font-size: var(--text-xs);
    color: var(--color-text-subtle);
  }

  /* Model Observations */
  .observation-group {
    margin-bottom: var(--space-4);
  }

  .observation-group:last-child {
    margin-bottom: 0;
  }

  .observation-list {
    margin: 0;
    padding-left: var(--space-4);
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }

  .observation-list li {
    margin-bottom: var(--space-1);
  }

  .quirk-item {
    padding: var(--space-3);
    background: var(--color-bg);
    border-radius: var(--radius-md);
    margin-bottom: var(--space-2);
  }

  .quirk-model {
    font-size: var(--text-xs);
    color: var(--color-text-subtle);
    font-family: var(--font-mono);
  }

  .quirk-observation {
    font-size: var(--text-sm);
    margin: var(--space-1) 0;
  }

  .quirk-meta {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-xs);
  }

  .frequency-badge {
    padding: 2px 6px;
    border-radius: var(--radius-sm);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
  }

  .frequency-badge[data-frequency="always"] {
    border-color: var(--color-error);
    color: var(--color-error);
  }

  .frequency-badge[data-frequency="often"] {
    border-color: var(--color-warning);
    color: var(--color-warning);
  }

  .workaround {
    color: var(--color-success);
  }

  /* Connections */
  .connections-group {
    margin-bottom: var(--space-4);
  }

  .connections-group:last-child {
    margin-bottom: 0;
  }

  .connection-link {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2);
    background: var(--color-bg);
    border-radius: var(--radius-md);
    text-decoration: none;
    color: var(--color-text);
    font-size: var(--text-sm);
    margin-bottom: var(--space-1);
    transition: background-color 0.15s ease;
  }

  .connection-link:hover {
    background: var(--color-bg-hover);
  }

  .edge-type {
    padding: 2px 6px;
    background: var(--color-accent-muted);
    color: var(--color-accent);
    border-radius: var(--radius-sm);
    font-size: var(--text-xs);
  }

  .connection-id {
    flex: 1;
    font-family: var(--font-mono);
    color: var(--color-text-muted);
  }

  /* Files List */
  .files-list {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .file-item {
    padding: var(--space-2);
    font-size: var(--text-sm);
    border-bottom: 1px solid var(--color-border-subtle);
  }

  .file-item:last-child {
    border-bottom: none;
  }

  .file-item code {
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    word-break: break-all;
  }

  /* Version History */
  .versions-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .version-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2);
    background: var(--color-bg);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
  }

  .version-item.current {
    border: 1px solid var(--color-accent);
  }

  .version-number {
    font-weight: 600;
    font-family: var(--font-mono);
  }

  .version-date {
    flex: 1;
    color: var(--color-text-muted);
  }

  .current-badge {
    font-size: var(--text-xs);
    padding: 2px 6px;
    background: var(--color-accent);
    color: white;
    border-radius: var(--radius-sm);
  }

  /* Session Link */
  .session-link {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    color: var(--color-accent);
    text-decoration: none;
    font-size: var(--text-sm);
    margin-bottom: var(--space-2);
  }

  .session-link:hover {
    text-decoration: underline;
  }

  .session-meta {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    font-size: var(--text-xs);
    color: var(--color-text-subtle);
  }
</style>
