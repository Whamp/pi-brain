# Web UI Functionality Report

This document summarizes the findings from a comprehensive audit of the `pi-brain` Web UI. It documents current feature implementations, identifies UX highlights, and establishes a punch list for future polish.

## 1. Feature Report Summary

| Feature             | Implementation Notes                                                                                                                                  | Status        |
| :------------------ | :---------------------------------------------------------------------------------------------------------------------------------------------------- | :------------ |
| **Dashboard**       | Orchestrates several API calls (`/stats`, `/decisions`, `/clusters/feed`) into a cohesive overview. Uses Svelte reactive stores for real-time status. | 🟢 Functional |
| **Knowledge Graph** | Powered by **D3.js** in `Graph.svelte`. Supports zoom, pan, and real-time filtering by project, node type, and date range.                            | 🟢 Functional |
| **Search**          | Integrated with the backend's **FTS5 SQLite extension**. Provides advanced filtering by outcome and type alongside a free-text searchbox.             | 🟢 Functional |
| **Session Browser** | Hierarchical navigation: **Projects → Sessions → Nodes**. Uses breadcrumbs and provides metadata summaries for each level.                            | 🟢 Functional |
| **Prompt Learning** | Interface for managing "injected" system prompts based on learned patterns. Shows effectiveness metrics and allows toggling insights.                 | 🟢 Functional |
| **Settings**        | Direct integration with `config.yaml`. Allows live updates to the daemon's model, provider, and worker pool size.                                     | 🟢 Functional |
| **Daemon Status**   | Sidebar indicator powered by **WebSockets** (`/ws`). Updates color and text based on heartbeat and connection state.                                  | 🟢 Functional |

---

## 2. Key Audit Findings

### News Feed UX

The "News Feed" on the Dashboard successfully implements a **confirmation/dismissal loop** for discovered patterns.

- **UX Highlight**: When clicking "Confirm" or "Dismiss", the UI displays an **Undo window** (5 seconds) with an animated progress bar before committing the change to the database. This prevents accidental data loss.

### Settings Reactivity

Changes to the configuration are successfully persisted to the backend `config.yaml` file.

- **Verification**: Changing "Parallel Workers" from 1 to 3 in the UI correctly updated the YAML file on disk and was reflected in the daemon's runtime state immediately.

### Error Handling

The UI gracefully handles backend failures.

- **Verification**: Stopping the daemon process immediately triggers a "Backend offline" state in the sidebar and displays descriptive error messages on data-dependent cards.

---

## 3. Punch List (Visible UI Improvements)

These items represent UX polish or minor bugs only obvious through direct UI interaction.

1.  **[UX] Settings Save Button State**: The "Save Changes" button remains enabled after a successful save. It should revert to a disabled state until the user makes new changes to prevent redundant API calls.
2.  **[UX] Feedback Notifications**: The application lacks "Toasts" or temporary notifications. While button state changes are visible, explicit confirmation (e.g., "Configuration saved successfully") would improve confidence.
3.  **[UX] Empty State Engagement**: The "Sessions" and "Graph" pages are sparse when no data exists. Adding a "Getting Started" guide or a link to manually trigger a session analysis would improve the first-run experience.
4.  **[Bug] Sidebar Overflow**: On smaller viewports (or when many projects exist), the sidebar navigation does not scroll independently, potentially hiding the "Daemon Status" footer.
5.  **[Feature] Real-time Stats**: While the Daemon Status dot is real-time (WebSocket), the "Total Nodes" and "Tokens Used" stats on the Dashboard require a page refresh to update. These should subscribe to the `analysis.completed` WebSocket event.
6.  **[UX] Search Result Highlighting**: Search results show summaries but do not highlight the specific terms matched by the FTS query, making it harder to scan results.
7.  **[UX] Navigation Breadcrumbs**: In the Session Browser, clicking a breadcrumb item that represents the current page triggers a full re-render/fetch instead of being a no-op.

---

## 4. Technical Debt Fixed During Audit

- **Build Pipeline**: Resolved a critical bundling issue where the `/ws` route registration was being wrapped in an infinite recursive function by the bundler, crashing the daemon on startup.
- **Daemon CLI**: Transitioned from using the `pi-brain daemon start` shell command to running `dist/src/daemon/daemon-process.js` directly during development for reliable background execution.
