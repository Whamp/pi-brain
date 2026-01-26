<script lang="ts">
  import { onMount } from "svelte";
  import { BrainCircuit, ThumbsUp, ThumbsDown } from "lucide-svelte";
  import { api } from "$lib/api/client";
  import type { DaemonDecision } from "$lib/types";
  import { formatDistanceToNow, parseDate } from "$lib/utils/date";

  let decisions: DaemonDecision[] = [];
  let loading = true;
  let errorMessage: string | null = null;
  let feedbackLoading: Record<string, boolean> = {};

  onMount(async () => {
    try {
      const res = await api.getDecisions({}, { limit: 5 });
      ({ decisions } = res);
    } catch (error) {
      console.error("Failed to load decisions:", error);
      errorMessage = "Failed to load decisions";
    } finally {
      loading = false;
    }
  });

  async function handleFeedback(id: string, feedback: string) {
    if (feedbackLoading[id]) {return;}
    
    // Toggle logic: if clicking same feedback, clear it.
    const current = decisions.find(d => d.id === id)?.userFeedback;
    const newFeedback = current === feedback ? null : feedback;

    feedbackLoading[id] = true;
    try {
      await api.updateDecisionFeedback(id, newFeedback);
      decisions = decisions.map(d => 
        d.id === id ? { ...d, userFeedback: newFeedback } : d
      );
    } catch (error) {
      console.error("Failed to update feedback:", error);
    } finally {
      feedbackLoading[id] = false;
    }
  }
</script>

<section class="card decisions-panel">
  <div class="card-header">
    <h2 class="card-title">
      <BrainCircuit size={20} />
      Daemon Decisions
    </h2>
    <a href="/decisions" class="view-all">View all →</a>
  </div>

  {#if loading}
    <div class="loading">Loading decisions...</div>
  {:else if errorMessage}
    <div class="error">{errorMessage}</div>
  {:else if decisions.length === 0}
    <div class="empty">No recent decisions</div>
  {:else}
    <ul class="decision-list">
      {#each decisions as decision}
        <li class="decision-item">
          <div class="decision-header">
            <span class="decision-time">
              {formatDistanceToNow(parseDate(decision.timestamp))}
            </span>
            <div class="decision-actions">
               <button 
                class="feedback-btn" 
                class:active={decision.userFeedback === 'good'}
                on:click={() => handleFeedback(decision.id, 'good')}
                title="Good decision"
                disabled={feedbackLoading[decision.id]}
              >
                <ThumbsUp size={14} />
              </button>
              <button 
                class="feedback-btn" 
                class:active={decision.userFeedback === 'bad'}
                on:click={() => handleFeedback(decision.id, 'bad')}
                title="Bad decision"
                disabled={feedbackLoading[decision.id]}
              >
                <ThumbsDown size={14} />
              </button>
            </div>
          </div>
          
          <div class="decision-content">
            <div class="decision-text">{decision.decision}</div>
            <div class="decision-reasoning">{decision.reasoning}</div>
          </div>

          {#if decision.sourceProject}
             <div class="decision-meta">
               {decision.sourceProject.split('/').pop()}
             </div>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .decisions-panel {
    grid-column: span 1;
    display: flex;
    flex-direction: column;
  }
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-4);
  }

  .card-header .card-title {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-lg);
    font-weight: 600;
  }

  .view-all {
    font-size: var(--text-sm);
    color: var(--color-accent);
    text-decoration: none;
  }

  .decision-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: 0;
    margin: 0;
  }

  .decision-item {
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-md);
    padding: var(--space-3);
    background: var(--color-bg-subtle);
  }

  .decision-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-2);
  }

  .decision-time {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  .decision-actions {
    display: flex;
    gap: var(--space-1);
  }

  .feedback-btn {
    background: none;
    border: none;
    padding: 4px;
    cursor: pointer;
    color: var(--color-text-muted);
    border-radius: var(--radius-sm);
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .feedback-btn:hover {
    background: var(--color-bg-hover);
    color: var(--color-text);
  }

  .feedback-btn.active {
    color: var(--color-primary);
    background: var(--color-primary-subtle);
  }
  
  .feedback-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .decision-content {
    margin-bottom: var(--space-2);
  }

  .decision-text {
    font-weight: 500;
    font-size: var(--text-sm);
    margin-bottom: var(--space-1);
    color: var(--color-text);
  }

  .decision-reasoning {
    font-size: var(--text-xs);
    color: var(--color-text-subtle);
    line-height: 1.4;
  }

  .decision-meta {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    font-family: var(--font-mono);
  }

  .loading, .error, .empty {
    padding: var(--space-4);
    text-align: center;
    color: var(--color-text-muted);
    font-size: var(--text-sm);
  }
  
  .error {
    color: var(--color-error);
  }
</style>
