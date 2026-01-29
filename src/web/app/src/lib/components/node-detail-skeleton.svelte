<!--
  Node Detail Skeleton Component
  
  Shows skeleton placeholders for the node detail page during loading.
-->
<script lang="ts">
  // No props needed - this is a static layout placeholder
</script>

<div class="node-skeleton" role="status" aria-label="Loading node details...">
  <!-- Header Card Skeleton -->
  <div class="skeleton-header-card">
    <div class="skeleton-header-top">
      <div class="skeleton-summary-row">
        <div class="skeleton-outcome-icon"></div>
        <div class="skeleton-node-summary"></div>
      </div>
    </div>
    <div class="skeleton-header-meta">
      <div class="skeleton-meta-row">
        <div class="skeleton-meta-item" style="width: 80px"></div>
        <div class="skeleton-meta-separator"></div>
        <div class="skeleton-type-badge"></div>
        <div class="skeleton-meta-separator"></div>
        <div class="skeleton-meta-item" style="width: 60px"></div>
      </div>
      <div class="skeleton-meta-row">
        <div class="skeleton-meta-item" style="width: 120px"></div>
        <div class="skeleton-meta-separator"></div>
        <div class="skeleton-meta-item" style="width: 50px"></div>
        <div class="skeleton-meta-separator"></div>
        <div class="skeleton-meta-item" style="width: 80px"></div>
        <div class="skeleton-meta-separator"></div>
        <div class="skeleton-meta-item" style="width: 60px"></div>
      </div>
      <div class="skeleton-tags-row">
        <div class="skeleton-tag"></div>
        <div class="skeleton-tag"></div>
        <div class="skeleton-tag"></div>
      </div>
    </div>
  </div>

  <!-- Content Grid Skeleton -->
  <div class="skeleton-content-grid">
    <!-- Left Column -->
    <div class="skeleton-main-column">
      <!-- Key Decisions Skeleton -->
      <section class="skeleton-card">
        <div class="skeleton-section-title">
          <div class="skeleton-title-icon"></div>
          <div class="skeleton-title-text"></div>
        </div>
        <div class="skeleton-decisions-list">
          {#each Array(3) as _}
            <div class="skeleton-decision-item">
              <div class="skeleton-decision-chevron"></div>
              <div class="skeleton-decision-text"></div>
            </div>
          {/each}
        </div>
      </section>

      <!-- Lessons Skeleton -->
      <section class="skeleton-card">
        <div class="skeleton-section-header">
          <div class="skeleton-section-title">
            <div class="skeleton-title-icon"></div>
            <div class="skeleton-title-text"></div>
            <div class="skeleton-count"></div>
          </div>
          <div class="skeleton-select"></div>
        </div>
        <div class="skeleton-lessons-list">
          {#each Array(3) as _}
            <div class="skeleton-lesson-item">
              <div class="skeleton-lesson-summary"></div>
              <div class="skeleton-lesson-details"></div>
              <div class="skeleton-lesson-meta">
                <div class="skeleton-confidence-badge"></div>
                <div class="skeleton-lesson-tag"></div>
                <div class="skeleton-lesson-tag"></div>
              </div>
            </div>
          {/each}
        </div>
      </section>
    </div>

    <!-- Right Column -->
    <div class="skeleton-side-column">
      <!-- Connected Nodes Skeleton -->
      <section class="skeleton-card">
        <div class="skeleton-section-title">
          <div class="skeleton-title-text" style="width: 120px"></div>
        </div>
        <div class="skeleton-connections">
          {#each Array(3) as _}
            <div class="skeleton-connection">
              <div class="skeleton-edge-type"></div>
              <div class="skeleton-connection-id"></div>
            </div>
          {/each}
        </div>
      </section>

      <!-- Files Touched Skeleton -->
      <section class="skeleton-card">
        <div class="skeleton-section-title">
          <div class="skeleton-title-icon"></div>
          <div class="skeleton-title-text" style="width: 100px"></div>
          <div class="skeleton-count"></div>
        </div>
        <div class="skeleton-files-list">
          {#each Array(4) as _}
            <div class="skeleton-file-item"></div>
          {/each}
        </div>
      </section>
    </div>
  </div>
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

  /* Base skeleton element */
  .skeleton-base {
    background: var(--color-bg-hover);
    border-radius: var(--radius-sm);
    position: relative;
    overflow: hidden;
  }

  .skeleton-base::after {
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

  /* Header Card */
  .skeleton-header-card {
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-6);
    margin-bottom: var(--space-6);
  }

  .skeleton-header-top {
    margin-bottom: var(--space-4);
  }

  .skeleton-summary-row {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
  }

  .skeleton-outcome-icon {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--color-bg-hover);
    flex-shrink: 0;
    position: relative;
    overflow: hidden;
  }

  .skeleton-outcome-icon::after {
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
    height: 1.5rem;
    width: 70%;
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

  .skeleton-header-meta {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .skeleton-meta-row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .skeleton-meta-item {
    height: 0.875rem;
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

  .skeleton-meta-separator {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: var(--color-bg-hover);
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

  .skeleton-tags-row {
    display: flex;
    gap: var(--space-2);
    margin-top: var(--space-3);
  }

  .skeleton-tag {
    height: 1.5rem;
    width: 60px;
    background: var(--color-bg-hover);
    border-radius: var(--radius-sm);
    position: relative;
    overflow: hidden;
  }

  .skeleton-tag::after {
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

  /* Content Grid */
  .skeleton-content-grid {
    display: grid;
    grid-template-columns: 1fr 360px;
    gap: var(--space-6);
  }

  @media (max-width: 1024px) {
    .skeleton-content-grid {
      grid-template-columns: 1fr;
    }
  }

  /* Cards */
  .skeleton-card {
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-4);
    margin-bottom: var(--space-4);
  }

  .skeleton-section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-4);
  }

  .skeleton-section-title {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-4);
  }

  .skeleton-section-header .skeleton-section-title {
    margin-bottom: 0;
  }

  .skeleton-title-icon {
    width: 18px;
    height: 18px;
    border-radius: var(--radius-sm);
    background: var(--color-bg-hover);
    position: relative;
    overflow: hidden;
  }

  .skeleton-title-icon::after {
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

  .skeleton-title-text {
    height: 1rem;
    width: 100px;
    background: var(--color-bg-hover);
    border-radius: var(--radius-sm);
    position: relative;
    overflow: hidden;
  }

  .skeleton-title-text::after {
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

  .skeleton-count {
    height: 0.875rem;
    width: 30px;
    background: var(--color-bg-hover);
    border-radius: var(--radius-sm);
    position: relative;
    overflow: hidden;
  }

  .skeleton-count::after {
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

  .skeleton-select {
    height: 1.75rem;
    width: 100px;
    background: var(--color-bg-hover);
    border-radius: var(--radius-sm);
    position: relative;
    overflow: hidden;
  }

  .skeleton-select::after {
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

  /* Decisions */
  .skeleton-decisions-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .skeleton-decision-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3);
    background: var(--color-bg);
    border-radius: var(--radius-md);
  }

  .skeleton-decision-chevron {
    width: 16px;
    height: 16px;
    border-radius: var(--radius-sm);
    background: var(--color-bg-hover);
    flex-shrink: 0;
    position: relative;
    overflow: hidden;
  }

  .skeleton-decision-chevron::after {
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

  .skeleton-decision-text {
    height: 0.875rem;
    width: 80%;
    background: var(--color-bg-hover);
    border-radius: var(--radius-sm);
    position: relative;
    overflow: hidden;
  }

  .skeleton-decision-text::after {
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

  /* Lessons */
  .skeleton-lessons-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .skeleton-lesson-item {
    padding: var(--space-3);
    background: var(--color-bg);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-md);
  }

  .skeleton-lesson-summary {
    height: 1rem;
    width: 70%;
    background: var(--color-bg-hover);
    border-radius: var(--radius-sm);
    margin-bottom: var(--space-2);
    position: relative;
    overflow: hidden;
  }

  .skeleton-lesson-summary::after {
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

  .skeleton-lesson-details {
    height: 0.875rem;
    width: 90%;
    background: var(--color-bg-hover);
    border-radius: var(--radius-sm);
    margin-bottom: var(--space-2);
    position: relative;
    overflow: hidden;
  }

  .skeleton-lesson-details::after {
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

  .skeleton-lesson-meta {
    display: flex;
    gap: var(--space-2);
  }

  .skeleton-confidence-badge {
    height: 1.25rem;
    width: 50px;
    background: var(--color-bg-hover);
    border-radius: var(--radius-sm);
    position: relative;
    overflow: hidden;
  }

  .skeleton-confidence-badge::after {
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

  .skeleton-lesson-tag {
    height: 0.875rem;
    width: 40px;
    background: var(--color-bg-hover);
    border-radius: var(--radius-sm);
    position: relative;
    overflow: hidden;
  }

  .skeleton-lesson-tag::after {
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

  /* Connections */
  .skeleton-connections {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .skeleton-connection {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2);
    background: var(--color-bg);
    border-radius: var(--radius-md);
  }

  .skeleton-edge-type {
    height: 1.25rem;
    width: 60px;
    background: var(--color-bg-hover);
    border-radius: var(--radius-sm);
    position: relative;
    overflow: hidden;
  }

  .skeleton-edge-type::after {
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

  .skeleton-connection-id {
    flex: 1;
    height: 0.875rem;
    background: var(--color-bg-hover);
    border-radius: var(--radius-sm);
    position: relative;
    overflow: hidden;
  }

  .skeleton-connection-id::after {
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

  /* Files List */
  .skeleton-files-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .skeleton-file-item {
    height: 0.875rem;
    width: 100%;
    background: var(--color-bg-hover);
    border-radius: var(--radius-sm);
    padding: var(--space-2);
    position: relative;
    overflow: hidden;
  }

  .skeleton-file-item::after {
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

  .skeleton-file-item:nth-child(1) {
    width: 80%;
  }

  .skeleton-file-item:nth-child(2) {
    width: 90%;
  }

  .skeleton-file-item:nth-child(3) {
    width: 65%;
  }

  .skeleton-file-item:nth-child(4) {
    width: 75%;
  }
</style>
