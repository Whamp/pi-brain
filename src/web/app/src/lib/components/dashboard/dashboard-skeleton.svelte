<!--
  Dashboard Skeleton Loading Component
  
  Shows skeleton placeholders for the dashboard during initial load.
  Matches the layout of the actual dashboard content.
-->
<script lang="ts">
  // No props needed - this is a static layout placeholder
</script>

<div class="dashboard-skeleton" role="status" aria-label="Loading dashboard...">
  <!-- Hero Section Skeleton -->
  <section class="skeleton-hero">
    <div class="skeleton-hero-content">
      <div class="skeleton-hero-text">
        <div class="skeleton-overline"></div>
        <div class="skeleton-title"></div>
        <div class="skeleton-subtitle"></div>
      </div>
      <div class="skeleton-hero-stats">
        <div class="skeleton-stat">
          <div class="skeleton-stat-value"></div>
          <div class="skeleton-stat-label"></div>
        </div>
        <div class="skeleton-stat accent">
          <div class="skeleton-stat-value"></div>
          <div class="skeleton-stat-label"></div>
        </div>
        <div class="skeleton-stat">
          <div class="skeleton-stat-value"></div>
          <div class="skeleton-stat-label"></div>
        </div>
        <div class="skeleton-stat">
          <div class="skeleton-stat-value"></div>
          <div class="skeleton-stat-label"></div>
        </div>
      </div>
    </div>
    <div class="skeleton-hero-glow"></div>
  </section>

  <!-- Main Grid Skeleton -->
  <div class="skeleton-grid">
    <!-- Tool Errors Panel Skeleton -->
    <section class="skeleton-card tall">
      <div class="skeleton-card-header">
        <div class="skeleton-card-title"></div>
        <div class="skeleton-card-link"></div>
      </div>
      <div class="skeleton-table">
        {#each Array(5) as _}
          <div class="skeleton-table-row">
            <div class="skeleton-cell" style="width: 25%"></div>
            <div class="skeleton-cell" style="width: 20%"></div>
            <div class="skeleton-cell" style="width: 35%"></div>
            <div class="skeleton-cell" style="width: 10%"></div>
          </div>
        {/each}
      </div>
    </section>

    <!-- Vague Goal Panel Skeleton -->
    <section class="skeleton-card">
      <div class="skeleton-card-header">
        <div class="skeleton-card-title"></div>
      </div>
      <div class="skeleton-metric">
        <div class="skeleton-metric-label"></div>
        <div class="skeleton-metric-value"></div>
      </div>
      <div class="skeleton-comparison">
        <div class="skeleton-comparison-item">
          <div class="skeleton-comparison-label"></div>
          <div class="skeleton-comparison-value"></div>
        </div>
        <div class="skeleton-comparison-item">
          <div class="skeleton-comparison-label"></div>
          <div class="skeleton-comparison-value"></div>
        </div>
      </div>
    </section>

    <!-- Recent Activity Panel Skeleton -->
    <section class="skeleton-card">
      <div class="skeleton-card-header">
        <div class="skeleton-card-title"></div>
      </div>
      <div class="skeleton-activity-list">
        {#each Array(4) as _}
          <div class="skeleton-activity-item">
            <div class="skeleton-activity-icon"></div>
            <div class="skeleton-activity-content">
              <div class="skeleton-activity-summary"></div>
              <div class="skeleton-activity-meta"></div>
            </div>
          </div>
        {/each}
      </div>
    </section>

    <!-- Daemon Status Panel Skeleton -->
    <section class="skeleton-card">
      <div class="skeleton-card-header">
        <div class="skeleton-card-title"></div>
      </div>
      <div class="skeleton-daemon-rows">
        {#each Array(5) as _}
          <div class="skeleton-daemon-row">
            <div class="skeleton-daemon-label"></div>
            <div class="skeleton-daemon-value"></div>
          </div>
        {/each}
      </div>
    </section>
  </div>
</div>

<style>
  .dashboard-skeleton {
    max-width: 1400px;
  }

  /* Shimmer animation */
  @keyframes shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }

  /* Hero Section */
  .skeleton-hero {
    position: relative;
    padding: var(--space-8) var(--space-6);
    margin-bottom: var(--space-6);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-xl);
    overflow: hidden;
  }

  .skeleton-hero-content {
    position: relative;
    z-index: 1;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--space-8);
    flex-wrap: wrap;
  }

  .skeleton-hero-text {
    flex: 1;
    min-width: 280px;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .skeleton-overline {
    height: 0.75rem;
    width: 100px;
    background: var(--color-bg-hover);
    border-radius: var(--radius-sm);
    position: relative;
    overflow: hidden;
  }

  .skeleton-overline::after,
  .skeleton-title::after,
  .skeleton-subtitle::after {
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

  .skeleton-title {
    height: 2.5rem;
    width: 180px;
    background: var(--color-bg-hover);
    border-radius: var(--radius-md);
    position: relative;
    overflow: hidden;
  }

  .skeleton-subtitle {
    height: 1.25rem;
    width: 320px;
    max-width: 100%;
    background: var(--color-bg-hover);
    border-radius: var(--radius-sm);
    position: relative;
    overflow: hidden;
  }

  .skeleton-hero-stats {
    display: flex;
    gap: var(--space-4);
    flex-wrap: wrap;
  }

  .skeleton-stat {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-4);
    background: var(--color-bg-hover);
    border-radius: var(--radius-lg);
    min-width: 100px;
    border: 1px solid var(--color-border-subtle);
  }

  .skeleton-stat.accent {
    border-color: var(--color-accent-muted);
    background: rgba(0, 217, 255, 0.05);
  }

  .skeleton-stat-value {
    height: 1.75rem;
    width: 60px;
    background: var(--color-bg-elevated);
    border-radius: var(--radius-sm);
    position: relative;
    overflow: hidden;
  }

  .skeleton-stat-value::after,
  .skeleton-stat-label::after {
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

  .skeleton-stat-label {
    height: 0.625rem;
    width: 70px;
    background: var(--color-bg-elevated);
    border-radius: var(--radius-sm);
    position: relative;
    overflow: hidden;
  }

  .skeleton-hero-glow {
    position: absolute;
    top: -50%;
    right: -20%;
    width: 60%;
    height: 200%;
    background: radial-gradient(
      ellipse at center,
      rgba(0, 217, 255, 0.08) 0%,
      transparent 60%
    );
    pointer-events: none;
  }

  /* Grid */
  .skeleton-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-4);
    margin-bottom: var(--space-4);
  }

  @media (max-width: 1024px) {
    .skeleton-grid {
      grid-template-columns: 1fr;
    }
  }

  /* Card */
  .skeleton-card {
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-4);
  }

  .skeleton-card.tall {
    min-height: 280px;
  }

  .skeleton-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-4);
  }

  .skeleton-card-title {
    height: 0.875rem;
    width: 120px;
    background: var(--color-bg-hover);
    border-radius: var(--radius-sm);
    position: relative;
    overflow: hidden;
  }

  .skeleton-card-title::after,
  .skeleton-card-link::after {
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

  .skeleton-card-link {
    height: 0.875rem;
    width: 60px;
    background: var(--color-bg-hover);
    border-radius: var(--radius-sm);
    position: relative;
    overflow: hidden;
  }

  /* Table */
  .skeleton-table {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .skeleton-table-row {
    display: flex;
    gap: var(--space-3);
    padding: var(--space-2) 0;
    border-bottom: 1px solid var(--color-border-subtle);
  }

  .skeleton-cell {
    height: 0.875rem;
    background: var(--color-bg-hover);
    border-radius: var(--radius-sm);
    position: relative;
    overflow: hidden;
  }

  .skeleton-cell::after {
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

  /* Metric */
  .skeleton-metric {
    margin-bottom: var(--space-4);
  }

  .skeleton-metric-label {
    height: 0.875rem;
    width: 140px;
    background: var(--color-bg-hover);
    border-radius: var(--radius-sm);
    margin-bottom: var(--space-2);
    position: relative;
    overflow: hidden;
  }

  .skeleton-metric-label::after,
  .skeleton-metric-value::after {
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

  .skeleton-metric-value {
    height: 2.5rem;
    width: 80px;
    background: var(--color-bg-hover);
    border-radius: var(--radius-md);
    position: relative;
    overflow: hidden;
  }

  /* Comparison */
  .skeleton-comparison {
    display: flex;
    gap: var(--space-6);
  }

  .skeleton-comparison-item {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .skeleton-comparison-label {
    height: 0.625rem;
    width: 60px;
    background: var(--color-bg-hover);
    border-radius: var(--radius-sm);
    position: relative;
    overflow: hidden;
  }

  .skeleton-comparison-label::after,
  .skeleton-comparison-value::after {
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

  .skeleton-comparison-value {
    height: 1.25rem;
    width: 40px;
    background: var(--color-bg-hover);
    border-radius: var(--radius-sm);
    position: relative;
    overflow: hidden;
  }

  /* Activity List */
  .skeleton-activity-list {
    display: flex;
    flex-direction: column;
  }

  .skeleton-activity-item {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
    padding: var(--space-3) 0;
    border-bottom: 1px solid var(--color-border-subtle);
  }

  .skeleton-activity-item:last-child {
    border-bottom: none;
  }

  .skeleton-activity-icon {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--color-bg-hover);
    flex-shrink: 0;
    position: relative;
    overflow: hidden;
  }

  .skeleton-activity-icon::after {
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

  .skeleton-activity-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .skeleton-activity-summary {
    height: 0.875rem;
    width: 80%;
    background: var(--color-bg-hover);
    border-radius: var(--radius-sm);
    position: relative;
    overflow: hidden;
  }

  .skeleton-activity-summary::after,
  .skeleton-activity-meta::after {
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

  .skeleton-activity-meta {
    height: 0.75rem;
    width: 50%;
    background: var(--color-bg-hover);
    border-radius: var(--radius-sm);
    position: relative;
    overflow: hidden;
  }

  /* Daemon Rows */
  .skeleton-daemon-rows {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .skeleton-daemon-row {
    display: flex;
    justify-content: space-between;
  }

  .skeleton-daemon-label {
    height: 0.875rem;
    width: 60px;
    background: var(--color-bg-hover);
    border-radius: var(--radius-sm);
    position: relative;
    overflow: hidden;
  }

  .skeleton-daemon-label::after,
  .skeleton-daemon-value::after {
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

  .skeleton-daemon-value {
    height: 0.875rem;
    width: 80px;
    background: var(--color-bg-hover);
    border-radius: var(--radius-sm);
    position: relative;
    overflow: hidden;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .skeleton-hero {
      padding: var(--space-6) var(--space-4);
    }

    .skeleton-hero-content {
      flex-direction: column;
      gap: var(--space-6);
    }

    .skeleton-hero-stats {
      width: 100%;
      justify-content: space-between;
    }

    .skeleton-stat {
      flex: 1;
      min-width: 70px;
      padding: var(--space-2) var(--space-3);
    }
  }
</style>
