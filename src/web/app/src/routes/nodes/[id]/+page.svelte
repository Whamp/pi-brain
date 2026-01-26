<script lang="ts">
  import { page } from "$app/state";
  import { ArrowLeft } from "lucide-svelte";

  const nodeId = $derived(page.params.id);
</script>

<svelte:head>
  <title>Node {nodeId} - pi-brain</title>
  <meta name="description" content="View node details" />
</svelte:head>

<div class="node-detail-page">
  <a href="/graph" class="back-link">
    <ArrowLeft size={16} />
    Back to Graph
  </a>

  <header class="page-header">
    <h1>Node Detail</h1>
  </header>

  <div class="node-placeholder">
    <p>Node detail view will be implemented in Task 5.7</p>
    <p class="node-id">Node ID: <code>{nodeId}</code></p>
  </div>
</div>

<style>
  .back-link {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    color: var(--color-text-muted);
    font-size: var(--text-sm);
    margin-bottom: var(--space-4);
  }

  .back-link:hover {
    color: var(--color-accent);
  }

  .page-header {
    margin-bottom: var(--space-6);
  }

  .page-header h1 {
    font-size: var(--text-2xl);
  }

  .node-placeholder {
    padding: var(--space-12);
    text-align: center;
    color: var(--color-text-muted);
    background: var(--color-bg-elevated);
    border: 1px dashed var(--color-border);
    border-radius: var(--radius-lg);
  }

  .node-id {
    margin-top: var(--space-4);
  }

  .node-id code {
    color: var(--color-accent);
  }
</style>
