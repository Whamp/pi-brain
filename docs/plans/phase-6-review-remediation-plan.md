# Phase 6 Review Remediation Plan

This plan addresses the gaps identified during the comprehensive review of Phase 6 (Web UI - Dashboard). The primary focus is on bringing the dashboard to life with real-time updates and richer visualizations.

## 1. Objectives

- **Enable Real-Time Awareness**: Ensure the dashboard reflects the current state of the daemon and queue without manual refreshes.
- **Deepen Insight Visualization**: Convert the Vague Goal metric from a simple comparison to a time-series trend to better visualize user improvement.
- **Visual Polish**: Enhance the dynamic feel of the dashboard.

## 2. Tasks

### Task 6.R.1: Real-Time Daemon Status (Polling)

**Problem**: The dashboard only fetches status on load.
**Solution**: Implement a robust polling mechanism for the daemon status and recent activity.
**Steps**:

1.  Create a `usePoll` store or utility in Svelte.
2.  Update `src/web/app/src/routes/+page.svelte` to poll `api.getDaemonStatus()` and `api.listNodes({ limit: 5 })` every 5 seconds.
3.  Add a visual indicator (e.g., a "pulse" dot) to show the dashboard is live.

### Task 6.R.2: Vague Goal Time-Series Chart

**Problem**: The current implementation only shows "This Week vs Last Week" numbers.
**Solution**: Update the API to provide daily granularity and render a chart.
**Steps**:

1.  **Backend**: Update `src/api/routes/stats.ts`:
    - Modify `GET /stats` to include `trends.dailyVagueGoals` (array of `{ date: string, vague: number, clear: number }` for the last 14 days).
2.  **Frontend**: Update `src/web/app/src/lib/components/dashboard/vague-goal-panel.svelte` (or inline component):
    - Implement a lightweight SVG sparkline or bar chart using the daily data.
    - Show the trend visually over time.

### Task 6.R.3: Visual Polish & Reactivity

**Problem**: The "Trend" labels are functional but basic.
**Solution**: Improve visual feedback for trends.
**Steps**:

1.  Enhance the `TrendingUp`/`TrendingDown` components with specific colors (Green for clear goal improvement, Red for regression).
2.  Ensure empty states look "premium" (e.g., subtle illustrations or better spacing).

## 3. Implementation details

### API Changes (`src/api/routes/stats.ts`)

Return shape extension:

```typescript
interface StatsResponse {
  // ... existing fields
  trends: {
    vagueGoals: {
      thisWeek: number;
      lastWeek: number;
      change: number;
      // New field
      daily: Array<{
        date: string; // ISO date YYYY-MM-DD
        vague: number;
        clear: number;
      }>;
    };
  };
}
```

## 4. Verification

- **Real-time**: Start a long running task, open dashboard. Watch the queue count change without refreshing the page.
- **Charts**: Verify the Vague Goal panel shows a 14-day history chart.
- **Aesthetics**: Verify trend colors match semantic meaning (improvement = green, even if the number goes down/up depending on the metric).
