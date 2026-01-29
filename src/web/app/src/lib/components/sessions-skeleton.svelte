<!--
  Sessions List Skeleton Component
  
  Shows skeleton placeholders for session/project list items during loading.
-->
<script lang="ts">
  interface Props {
    /** Number of skeleton items to show */
    count?: number;
    /** Variant: "projects" | "sessions" | "nodes" */
    variant?: "projects" | "sessions" | "nodes";
  }

  let { count = 5, variant = "projects" }: Props = $props();
</script>

<div class="skeleton-list" role="status" aria-label="Loading...">
  {#each Array(count) as _, i}
    {#if variant === "projects" || variant === "sessions"}
      <div class="skeleton-file-item">
        <div class="skeleton-file-icon"></div>
        <div class="skeleton-file-info">
          <div class="skeleton-file-name" style="width: {60 + (i % 3) * 10}%"></div>
          <div class="skeleton-file-path" style="width: {40 + (i % 4) * 8}%"></div>
          {#if variant === "sessions"}
            <div class="skeleton-type-badges">
              <div class="skeleton-badge"></div>
              <div class="skeleton-badge"></div>
              <div class="skeleton-badge"></div>
            </div>
          {/if}
        </div>
        <div class="skeleton-file-meta">
          <div class="skeleton-meta-item"></div>
          <div class="skeleton-meta-item"></div>
          {#if variant === "projects"}
            <div class="skeleton-meta-item"></div>
          {/if}
        </div>
        <div class="skeleton-chevron"></div>
      </div>
    {:else}
      <!-- Nodes variant -->
      <div class="skeleton-node-item">
        <div class="skeleton-node-index"></div>
        <div class="skeleton-node-content">
          <div class="skeleton-node-header">
            <div class="skeleton-type-badge"></div>
            <div class="skeleton-outcome"></div>
          </div>
          <div class="skeleton-node-summary" style="width: {70 + (i % 3) * 10}%"></div>
          <div class="skeleton-node-meta">
            <div class="skeleton-meta-small"></div>
            <div class="skeleton-meta-small"></div>
            <div class="skeleton-meta-small"></div>
          </div>
        </div>
        <div class="skeleton-chevron"></div>
      </div>
    {/if}
  {/each}
</div>

<style>
  /* Shimmer animation */
  @keyframes shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }

  .skeleton-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  /* File/Session Item Skeleton */
  .skeleton-file-item {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-4);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
  }

  .skeleton-file-icon {
    width: 40px;
    height: 40px;
    border-radius: var(--radius-md);
    background: var(--color-bg-hover);
    flex-shrink: 0;
    position: relative;
    overflow: hidden;
  }

  .skeleton-file-icon::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.04) 50%,
      transparent 100%
    );
    animation: shimmer 1.5s infinite;
  }

  .skeleton-file-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .skeleton-file-name {
    height: 1rem;
    background: var(--color-bg-hover);
    border-radius: var(--radius-sm);
    position: relative;
    overflow: hidden;
  }

  .skeleton-file-name::after,
  .skeleton-file-path::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.04) 50%,
      transparent 100%
    );
    animation: shimmer 1.5s infinite;
  }

  .skeleton-file-path {
    height: 0.75rem;
    background: var(--color-bg-hover);
    border-radius: var(--radius-sm);
    position: relative;
    overflow: hidden;
  }

  .skeleton-type-badges {
    display: flex;
    gap: var(--space-1);
  }

  .skeleton-badge {
    height: 1.25rem;
    width: 50px;
    background: var(--color-bg-hover);
    border-radius: var(--radius-sm);
    position: relative;
    overflow: hidden;
  }

  .skeleton-badge::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.04) 50%,
      transparent 100%
    );
    animation: shimmer 1.5s infinite;
  }

  .skeleton-file-meta {
    display: flex;
    align-items: center;
    gap: var(--space-4);
  }

  .skeleton-meta-item {
    height: 0.875rem;
    width: 60px;
    background: var(--color-bg-hover);
    border-radius: var(--radius-sm);
    position: relative;
    overflow: hidden;
  }

  .skeleton-meta-item::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.04) 50%,
      transparent 100%
    );
    animation: shimmer 1.5s infinite;
  }

  .skeleton-chevron {
    width: 18px;
    height: 18px;
    border-radius: var(--radius-sm);
    background: var(--color-bg-hover);
    flex-shrink: 0;
    position: relative;
    overflow: hidden;
  }

  .skeleton-chevron::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.04) 50%,
      transparent 100%
    );
    animation: shimmer 1.5s infinite;
  }

  /* Node Item Skeleton */
  .skeleton-node-item {
    display: flex;
    align-items: flex-start;
    gap: var(--space-4);
    padding: var(--space-4);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
  }

  .skeleton-node-index {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--color-bg-hover);
    flex-shrink: 0;
    position: relative;
    overflow: hidden;
  }

  .skeleton-node-index::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.04) 50%,
      transparent 100%
    );
    animation: shimmer 1.5s infinite;
  }

  .skeleton-node-content {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .skeleton-node-header {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .skeleton-type-badge {
    height: 1.25rem;
    width: 70px;
    background: var(--color-bg-hover);
    border-radius: var(--radius-sm);
    position: relative;
    overflow: hidden;
  }

  .skeleton-type-badge::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.04) 50%,
      transparent 100%
    );
    animation: shimmer 1.5s infinite;
  }

  .skeleton-outcome {
    height: 0.875rem;
    width: 60px;
    background: var(--color-bg-hover);
    border-radius: var(--radius-sm);
    position: relative;
    overflow: hidden;
  }

  .skeleton-outcome::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.04) 50%,
      transparent 100%
    );
    animation: shimmer 1.5s infinite;
  }

  .skeleton-node-summary {
    height: 1rem;
    background: var(--color-bg-hover);
    border-radius: var(--radius-sm);
    position: relative;
    overflow: hidden;
  }

  .skeleton-node-summary::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.04) 50%,
      transparent 100%
    );
    animation: shimmer 1.5s infinite;
  }

  .skeleton-node-meta {
    display: flex;
    gap: var(--space-3);
  }

  .skeleton-meta-small {
    height: 0.75rem;
    width: 50px;
    background: var(--color-bg-hover);
    border-radius: var(--radius-sm);
    position: relative;
    overflow: hidden;
  }

  .skeleton-meta-small::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.04) 50%,
      transparent 100%
    );
    animation: shimmer 1.5s infinite;
  }

  /* Responsive */
  @media (max-width: 640px) {
    .skeleton-file-item {
      flex-wrap: wrap;
    }

    .skeleton-file-meta {
      width: 100%;
      margin-top: var(--space-2);
      margin-left: 56px;
    }
  }
</style>
