<script lang="ts">
  import {
    Rocket,
    Terminal,
    FolderOpen,
    Zap,
    ExternalLink,
    ArrowRight,
    FileText,
    Network,
    LayoutDashboard,
  } from "lucide-svelte";

  interface Props {
    variant: "sessions" | "graph" | "dashboard";
  }

  const { variant }: Props = $props();

  const steps = [
    {
      icon: Terminal,
      title: "Start the daemon",
      description: "Run the background service to watch for sessions",
      command: "pi-brain daemon start",
    },
    {
      icon: FolderOpen,
      title: "Run a pi session",
      description: "Work with pi in any project directory",
      command: "pi 'help me with something'",
    },
    {
      icon: Zap,
      title: "Wait for analysis",
      description:
        "The daemon auto-analyzes sessions after 10 minutes of idle time",
      command: null,
    },
  ];

  function copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text);
  }
</script>

<div class="getting-started" role="region" aria-label="Getting started guide">
  <div class="header">
    <div class="icon-container">
      {#if variant === "sessions"}
        <FileText size={32} />
      {:else if variant === "dashboard"}
        <LayoutDashboard size={32} />
      {:else}
        <Network size={32} />
      {/if}
    </div>
    <h2>
      {#if variant === "sessions"}
        No Sessions Yet
      {:else if variant === "dashboard"}
        Welcome to pi-brain
      {:else}
        Knowledge Graph Empty
      {/if}
    </h2>
    <p class="subtitle">
      {#if variant === "sessions"}
        Once the daemon analyzes your pi sessions, they'll appear here organized
        by project.
      {:else if variant === "dashboard"}
        Start by running some pi sessions. The daemon will analyze your coding
        conversations and build a knowledge graph of decisions, lessons, and
        patterns.
      {:else}
        Nodes and connections will appear here after the daemon analyzes your pi
        sessions.
      {/if}
    </p>
  </div>

  <div class="steps">
    <h3><Rocket size={16} /> Quick Start</h3>
    <ol class="step-list">
      {#each steps as step, i}
        {@const StepIcon = step.icon}
        <li class="step-item">
          <div class="step-number">{i + 1}</div>
          <div class="step-content">
            <div class="step-header">
              <StepIcon size={16} class="step-icon" />
              <span class="step-title">{step.title}</span>
            </div>
            <p class="step-description">{step.description}</p>
            {#if step.command}
              <button
                type="button"
                class="step-command"
                onclick={() => step.command && copyToClipboard(step.command)}
                title="Click to copy"
              >
                <code>{step.command}</code>
                <span class="copy-hint">Copy</span>
              </button>
            {/if}
          </div>
        </li>
      {/each}
    </ol>
  </div>

  <div class="actions">
    <a href="/settings" class="btn-secondary">
      <span>Check Settings</span>
      <ArrowRight size={14} />
    </a>
    <a
      href="https://github.com/badlogic/pi-brain"
      target="_blank"
      rel="noopener noreferrer"
      class="btn-ghost"
    >
      <span>View Documentation</span>
      <ExternalLink size={14} />
    </a>
  </div>

  <div class="tip">
    <strong>Tip:</strong>
    {#if variant === "sessions"}
      Use <code>/tree</code> and <code>/branch</code> commands in pi to create
      meaningful session segments.
    {:else if variant === "dashboard"}
      The daemon analyzes sessions after 10 minutes of idle time, or you can
      trigger analysis manually with <code>pi-brain analyze</code>.
    {:else}
      Click on nodes to see their connections, or double-click to view full
      details.
    {/if}
  </div>
</div>

<style>
  .getting-started {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-6);
    max-width: 560px;
    margin: 0 auto;
    padding: var(--space-8);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-xl);
    text-align: center;
  }

  .header {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
  }

  .icon-container {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 64px;
    height: 64px;
    border-radius: var(--radius-lg);
    background: var(--color-accent-muted);
    color: var(--color-accent);
  }

  .header h2 {
    font-size: var(--text-xl);
    font-weight: 600;
    color: var(--color-text);
    margin: 0;
  }

  .subtitle {
    color: var(--color-text-muted);
    font-size: var(--text-sm);
    line-height: 1.5;
    max-width: 400px;
    margin: 0;
  }

  .steps {
    width: 100%;
    background: var(--color-bg);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-lg);
    padding: var(--space-4);
  }

  .steps h3 {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: var(--space-4);
  }

  .step-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    text-align: left;
    margin: 0;
    padding: 0;
  }

  .step-item {
    display: flex;
    gap: var(--space-3);
    padding: var(--space-3);
    background: var(--color-bg-elevated);
    border-radius: var(--radius-md);
    transition: background var(--transition-fast);
  }

  .step-item:hover {
    background: var(--color-bg-hover);
  }

  .step-number {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--color-accent);
    color: white;
    font-size: var(--text-xs);
    font-weight: 600;
    flex-shrink: 0;
  }

  .step-content {
    flex: 1;
    min-width: 0;
  }

  .step-header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-1);
  }

  .step-header :global(.step-icon) {
    color: var(--color-text-muted);
  }

  .step-title {
    font-weight: 500;
    color: var(--color-text);
    font-size: var(--text-sm);
  }

  .step-description {
    font-size: var(--text-xs);
    color: var(--color-text-subtle);
    line-height: 1.4;
    margin: 0;
  }

  .step-command {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    margin-top: var(--space-2);
    padding: var(--space-1) var(--space-2);
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: var(--text-xs);
    transition:
      background var(--transition-fast),
      border-color var(--transition-fast);
  }

  .step-command:hover {
    background: var(--color-bg-hover);
    border-color: var(--color-accent);
  }

  .step-command code {
    font-family: var(--font-mono);
    color: var(--color-accent);
  }

  .copy-hint {
    color: var(--color-text-subtle);
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    justify-content: center;
  }

  .actions a {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    font-weight: 500;
    text-decoration: none;
    transition:
      background var(--transition-fast),
      color var(--transition-fast);
  }

  .btn-secondary {
    background: var(--color-bg-hover);
    color: var(--color-text);
    border: 1px solid var(--color-border);
  }

  .btn-secondary:hover {
    background: var(--color-accent-muted);
    color: var(--color-accent);
    border-color: var(--color-accent);
  }

  .btn-ghost {
    background: transparent;
    color: var(--color-text-muted);
    border: none;
  }

  .btn-ghost:hover {
    color: var(--color-text);
    background: var(--color-bg-hover);
  }

  .tip {
    font-size: var(--text-xs);
    color: var(--color-text-subtle);
    padding: var(--space-3);
    background: var(--color-bg);
    border-radius: var(--radius-md);
    border-left: 3px solid var(--color-accent);
    text-align: left;
    width: 100%;
  }

  .tip strong {
    color: var(--color-text-muted);
  }

  .tip code {
    font-family: var(--font-mono);
    color: var(--color-accent);
    background: var(--color-accent-muted);
    padding: 1px 4px;
    border-radius: 2px;
  }
</style>
