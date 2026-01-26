<svelte:head>
  <title>Sessions - pi-brain</title>
  <meta name="description" content="Browse pi coding agent sessions" />
</svelte:head>

<div class="sessions-page">
  <header class="page-header">
    <h1>Session Browser</h1>
  </header>

  <div class="sessions-placeholder">
    <p>Session browser will be implemented in Task 5.9</p>
  </div>
</div>

<style>
  .page-header {
    margin-bottom: var(--space-6);
  }

  .page-header h1 {
    font-size: var(--text-2xl);
  }

  .sessions-placeholder {
    padding: var(--space-12);
    text-align: center;
    color: var(--color-text-muted);
    background: var(--color-bg-elevated);
    border: 1px dashed var(--color-border);
    border-radius: var(--radius-lg);
  }
</style>
