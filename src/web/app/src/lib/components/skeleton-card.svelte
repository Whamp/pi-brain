<script lang="ts">
  /**
   * SkeletonCard - Pre-built skeleton layouts for common card patterns
   * 
   * Provides ready-to-use skeleton patterns for dashboard cards,
   * list items, and stat displays.
   */
  import Skeleton from "./skeleton.svelte";

  interface Props {
    /** Card variant */
    variant?: "stat" | "activity" | "list-item" | "panel";
    /** Number of items for list variants */
    count?: number;
  }

  const { variant = "stat", count = 3 }: Props = $props();
</script>

{#if variant === "stat"}
  <div class="skeleton-stat">
    <div class="stat-header">
      <Skeleton width={20} height={20} radius="sm" />
    </div>
    <Skeleton width="60%" height={32} radius="md" />
    <Skeleton width="40%" height={14} radius="sm" />
  </div>
{:else if variant === "activity"}
  <div class="skeleton-activity">
    {#each Array(count) as _, i (i)}
      <div class="activity-item">
        <Skeleton width={32} height={32} radius="full" />
        <div class="activity-content">
          <Skeleton width="80%" height={14} radius="sm" />
          <Skeleton width="50%" height={12} radius="sm" />
        </div>
        <Skeleton width={60} height={12} radius="sm" />
      </div>
    {/each}
  </div>
{:else if variant === "list-item"}
  <div class="skeleton-list">
    {#each Array(count) as _, i (i)}
      <div class="list-item">
        <Skeleton width={40} height={40} radius="md" />
        <div class="list-content">
          <Skeleton width="70%" height={16} radius="sm" />
          <Skeleton width="40%" height={12} radius="sm" />
        </div>
      </div>
    {/each}
  </div>
{:else if variant === "panel"}
  <div class="skeleton-panel">
    <div class="panel-header">
      <Skeleton width="40%" height={20} radius="sm" />
      <Skeleton width={80} height={24} radius="md" />
    </div>
    <div class="panel-content">
      <Skeleton width="100%" height={100} radius="md" />
    </div>
  </div>
{/if}

<style>
  .skeleton-stat {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-4);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
  }

  .stat-header {
    margin-bottom: var(--space-2);
  }

  .skeleton-activity {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .activity-item {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
  }

  .activity-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .skeleton-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .list-item {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-4);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
  }

  .list-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .skeleton-panel {
    padding: var(--space-4);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-4);
  }

  .panel-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }
</style>
