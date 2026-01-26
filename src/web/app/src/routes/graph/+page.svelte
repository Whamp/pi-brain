<svelte:head>
  <title>Graph - pi-brain</title>
  <meta
    name="description"
    content="Interactive knowledge graph visualization"
  />
</svelte:head>

<div class="graph-page">
  <header class="page-header">
    <h1>Knowledge Graph</h1>
  </header>

  <div class="graph-placeholder">
    <p>Graph visualization will be implemented in Task 5.3</p>
  </div>
</div>

<style>
  .graph-page {
    height: calc(100vh - var(--space-12));
    display: flex;
    flex-direction: column;
  }

  .page-header {
    margin-bottom: var(--space-4);
  }

  .page-header h1 {
    font-size: var(--text-2xl);
  }

  .graph-placeholder {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-bg-elevated);
    border: 1px dashed var(--color-border);
    border-radius: var(--radius-lg);
    color: var(--color-text-muted);
  }
</style>
