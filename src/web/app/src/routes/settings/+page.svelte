<svelte:head>
  <title>Settings - pi-brain</title>
  <meta name="description" content="Configure pi-brain settings" />
</svelte:head>

<div class="settings-page">
  <header class="page-header">
    <h1>Settings</h1>
  </header>

  <div class="settings-placeholder">
    <p>Settings page will be implemented in a future task</p>
  </div>
</div>

<style>
  .page-header {
    margin-bottom: var(--space-6);
  }

  .page-header h1 {
    font-size: var(--text-2xl);
  }

  .settings-placeholder {
    padding: var(--space-12);
    text-align: center;
    color: var(--color-text-muted);
    background: var(--color-bg-elevated);
    border: 1px dashed var(--color-border);
    border-radius: var(--radius-lg);
  }
</style>
