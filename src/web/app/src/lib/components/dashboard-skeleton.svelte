<script lang="ts">
  /**
   * DashboardSkeleton - Loading state skeleton for the dashboard page
   * 
   * Displays animated placeholders matching the dashboard's exact layout
   * to prevent layout shift and provide visual continuity during data loading.
   */
  import Skeleton from "./skeleton.svelte";
</script>

<div class="dashboard-skeleton" role="status" aria-label="Loading dashboard...">
  <!-- Stats Grid Skeleton -->
  <section class="stats-grid-skeleton">
    {#each Array(4) as _, i (i)}
      <div class="stat-card-skeleton">
        <div class="stat-icon-skeleton">
          <Skeleton width={20} height={20} radius="sm" />
        </div>
        <div class="stat-content-skeleton">
          <Skeleton width={80} height={28} radius="md" />
          <Skeleton width={60} height={14} radius="sm" />
        </div>
      </div>
    {/each}
  </section>

  <!-- Main Grid Skeleton -->
  <div class="dashboard-grid-skeleton">
    <!-- Tool Errors Panel Skeleton -->
    <div class="card-skeleton tool-errors-skeleton">
      <div class="card-header-skeleton">
        <Skeleton width={140} height={20} radius="sm" />
        <Skeleton width={60} height={16} radius="sm" />
      </div>
      <div class="table-skeleton">
        <div class="table-header-skeleton">
          <Skeleton width="20%" height={14} radius="sm" />
          <Skeleton width="20%" height={14} radius="sm" />
          <Skeleton width="25%" height={14} radius="sm" />
          <Skeleton width="15%" height={14} radius="sm" />
        </div>
        {#each Array(4) as _, i (i)}
          <div class="table-row-skeleton">
            <Skeleton width="20%" height={16} radius="sm" />
            <Skeleton width="20%" height={16} radius="sm" />
            <Skeleton width="25%" height={16} radius="sm" />
            <Skeleton width="15%" height={16} radius="sm" />
          </div>
        {/each}
      </div>
    </div>

    <!-- Vague Goal Panel Skeleton -->
    <div class="card-skeleton vague-goal-skeleton">
      <div class="card-header-skeleton">
        <Skeleton width={130} height={20} radius="sm" />
      </div>
      <div class="vague-goal-content-skeleton">
        <Skeleton width={120} height={14} radius="sm" />
        <div class="metric-row-skeleton">
          <Skeleton width={60} height={36} radius="md" />
          <Skeleton width={80} height={20} radius="sm" />
        </div>
        <div class="comparison-skeleton">
          <div class="comparison-item-skeleton">
            <Skeleton width={70} height={12} radius="sm" />
            <Skeleton width={40} height={18} radius="sm" />
          </div>
          <div class="comparison-item-skeleton">
            <Skeleton width={70} height={12} radius="sm" />
            <Skeleton width={40} height={18} radius="sm" />
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Activity Panel Skeleton -->
    <div class="card-skeleton activity-skeleton">
      <div class="card-header-skeleton">
        <Skeleton width={110} height={20} radius="sm" />
      </div>
      <div class="activity-list-skeleton">
        {#each Array(5) as _, i (i)}
          <div class="activity-item-skeleton">
            <Skeleton width={24} height={24} radius="full" />
            <div class="activity-content-skeleton">
              <Skeleton width="85%" height={14} radius="sm" />
              <Skeleton width="50%" height={12} radius="sm" />
            </div>
          </div>
        {/each}
      </div>
    </div>

    <!-- Daemon Decisions Skeleton -->
    <div class="card-skeleton decisions-skeleton">
      <div class="card-header-skeleton">
        <Skeleton width={130} height={20} radius="sm" />
        <Skeleton width={70} height={16} radius="sm" />
      </div>
      <div class="decisions-list-skeleton">
        {#each Array(3) as _, i (i)}
          <div class="decision-item-skeleton">
            <Skeleton width="100%" height={16} radius="sm" />
            <Skeleton width="70%" height={12} radius="sm" />
          </div>
        {/each}
      </div>
    </div>

    <!-- Daemon Status Skeleton -->
    <div class="card-skeleton daemon-status-skeleton">
      <div class="card-header-skeleton">
        <Skeleton width={110} height={20} radius="sm" />
      </div>
      <div class="daemon-rows-skeleton">
        {#each Array(5) as _, i (i)}
          <div class="daemon-row-skeleton">
            <Skeleton width={70} height={14} radius="sm" />
            <Skeleton width={90} height={14} radius="sm" />
          </div>
        {/each}
      </div>
    </div>
  </div>

  <!-- Patterns Grid Skeleton -->
  <div class="patterns-grid-skeleton">
    <div class="card-skeleton">
      <div class="card-header-skeleton">
        <Skeleton width={120} height={20} radius="sm" />
        <Skeleton width={60} height={16} radius="sm" />
      </div>
      <div class="patterns-list-skeleton">
        {#each Array(2) as _, i (i)}
          <div class="pattern-card-skeleton">
            <div class="pattern-header-skeleton">
              <Skeleton width={16} height={16} radius="sm" />
              <Skeleton width="60%" height={16} radius="sm" />
              <Skeleton width={30} height={16} radius="sm" />
            </div>
            <Skeleton width="80%" height={12} radius="sm" />
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>

<style>
  .dashboard-skeleton {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  /* Stats Grid */
  .stats-grid-skeleton {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-4);
  }

  .stat-card-skeleton {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
    padding: var(--space-4);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
  }

  .stat-icon-skeleton {
    padding: var(--space-2);
    background: var(--color-bg-hover);
    border-radius: var(--radius-md);
  }

  .stat-content-skeleton {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  /* Dashboard Grid */
  .dashboard-grid-skeleton {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: auto auto;
    gap: var(--space-4);
  }

  .card-skeleton {
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-4);
  }

  .card-header-skeleton {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-4);
  }

  /* Tool Errors */
  .tool-errors-skeleton {
    grid-column: span 2;
  }

  .table-skeleton {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .table-header-skeleton,
  .table-row-skeleton {
    display: flex;
    gap: var(--space-3);
  }

  .table-header-skeleton {
    padding-bottom: var(--space-2);
    border-bottom: 1px solid var(--color-border);
  }

  /* Vague Goal */
  .vague-goal-content-skeleton {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .metric-row-skeleton {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .comparison-skeleton {
    display: flex;
    gap: var(--space-4);
    margin-top: var(--space-2);
  }

  .comparison-item-skeleton {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  /* Activity */
  .activity-skeleton {
    grid-row: span 2;
  }

  .activity-list-skeleton {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .activity-item-skeleton {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-2) 0;
    border-bottom: 1px solid var(--color-border-subtle);
  }

  .activity-content-skeleton {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  /* Decisions */
  .decisions-list-skeleton {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .decision-item-skeleton {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-3);
    background: var(--color-bg);
    border-radius: var(--radius-md);
  }

  /* Daemon Status */
  .daemon-rows-skeleton {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .daemon-row-skeleton {
    display: flex;
    justify-content: space-between;
    padding: var(--space-2) 0;
    border-bottom: 1px solid var(--color-border-subtle);
  }

  /* Patterns Grid */
  .patterns-grid-skeleton {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-4);
  }

  .patterns-list-skeleton {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .pattern-card-skeleton {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-3);
    background: var(--color-bg);
    border-radius: var(--radius-md);
  }

  .pattern-header-skeleton {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  /* Responsive */
  @media (max-width: 1200px) {
    .stats-grid-skeleton {
      grid-template-columns: repeat(2, 1fr);
    }

    .dashboard-grid-skeleton {
      grid-template-columns: repeat(2, 1fr);
    }

    .tool-errors-skeleton {
      grid-column: span 2;
    }

    .activity-skeleton {
      grid-row: span 1;
    }
  }

  @media (max-width: 768px) {
    .stats-grid-skeleton {
      grid-template-columns: 1fr;
    }

    .dashboard-grid-skeleton {
      grid-template-columns: 1fr;
    }

    .tool-errors-skeleton {
      grid-column: span 1;
    }

    .patterns-grid-skeleton {
      grid-template-columns: 1fr;
    }
  }
</style>
