# Pi-Brain Web UI Review Report

**Date**: January 30, 2026  
**Reviewed by**: Automated UI Analysis  
**Screenshots**: `docs/plans/ui-review-screenshots/`

---

## Executive Summary

Pi-brain's web UI provides a functional knowledge graph explorer with session browsing, pattern detection, and decision tracking. The interface has received recent polish work (typography, color system, motion) but still shows **critical functional bugs** and **visual inconsistencies** that undermine the user experience.

**Key Findings**:

- 2 pages have **500 errors or broken functionality** (Graph, Search)
- **Theme inconsistency**: Clusters page uses dark theme while rest uses light
- **Dashboard information overload**: Too many sections competing for attention
- Session lists lack visual hierarchy and differentiation
- Several pages feel repetitive with tall, uniform cards

---

## 1. Functional Issues (Critical)

### 1.1 Graph Page: 500 Internal Error

**File**: `01-graph.png`  
**Severity**: Critical

The Graph page—central to pi-brain's value proposition as a "knowledge graph"—returns a 500 Internal Error. This breaks the core visualization feature.

**Impact**: Users cannot visualize connections between decisions, sessions, and patterns. This defeats the primary purpose of pi-brain.

**Recommendation**: Debug server-side route handler. Check for null/undefined data in graph data fetching.

---

### 1.2 Search: JavaScript Error

**File**: `04b-search-results.png`  
**Severity**: Critical

Search returns error:

```
Cannot destructure property 'tags' of 'result.node.semantic' as it is undefined.
```

**Impact**: Users cannot search the knowledge graph. Semantic search—a key feature—is unusable.

**Recommendation**: Add null checks for `result.node.semantic` before destructuring. Handle missing semantic data gracefully.

---

## 2. Visual Consistency Issues

### 2.1 Theme Mismatch: Clusters Page

**File**: `11-clusters.png`  
**Severity**: Medium

The Clusters page uses a **dark theme** with dark card backgrounds, while all other pages use a light theme. This creates jarring navigation when moving between pages.

**Recommendation**: Apply consistent theme. If dark mode is intentional for clusters, either:

- Make it match the system/light theme
- Or make dark mode the global default

---

### 2.2 Sidebar Inconsistency

**Observed across all screenshots**

The sidebar navigation appears in different visual states across pages:

- Sometimes items appear faded/grayed out
- Active states aren't always clear
- The "Daemon running" status indicator at bottom is barely visible

**Recommendation**: Audit sidebar styles for consistent active/inactive/hover states.

---

## 3. Dashboard Analysis

**File**: `01-home.png`

### 3.1 Information Overload

The dashboard packs **12+ distinct sections** into a single scrolling page:

1. Quick Actions
2. Usage Trends
3. Tool Errors by Model
4. Vague Goal Tracker
5. Recent Activity
6. Daemon Decisions
7. Daemon Status
8. Failure Patterns
9. Lesson Patterns
10. News Feed
11. Abandoned Restarts
12. Model Reliability

**Problems**:

- No clear visual hierarchy—everything competes equally
- User doesn't know where to look first
- Empty sections still take space ("No new patterns discovered yet")
- Very long scroll distance

**Recommendations**:

1. **Hide empty sections** or collapse them by default
2. **Prioritize** 3-4 key sections; move others to sub-pages
3. Add **visual hierarchy**: larger stats at top, secondary info below
4. Consider **tabbed or segmented views** instead of vertical scroll

---

### 3.2 Tool Errors Table Readability

The "Tool Errors by Model" table has:

- Very small, cramped text
- Long model names that are hard to scan (e.g., `google-antigravity/claude-opus-4-5-thinking`)
- Inconsistent column widths

**Recommendation**: Truncate model names with tooltip on hover, or use abbreviated display names.

---

### 3.3 Stats Cards Lack Context

Top-line metrics (`84 TOTAL NODES`, `$7.50 TOTAL COST`) lack context:

- Is 84 nodes good or bad?
- What's the trend?
- What does this mean for the user?

**Recommendation**: Add trend indicators (↑12% this week) or contextual labels.

---

## 4. Sessions Browser Analysis

**Files**: `02-sessions.png`, `13-session-detail.png`, `14-session-expanded.png`

### 4.1 Repetitive Card Design

The sessions list shows identical cards:

- Same folder icon for every project
- Same height, same layout
- Long file paths that are hard to scan
- No visual grouping or categorization

**Problems**:

- Hard to visually distinguish important/recent projects
- Cognitive load increases with list length
- File paths dominate—project names are secondary

**Recommendations**:

1. Use **project-specific icons** or color badges
2. **Emphasize project name**, de-emphasize file path
3. Add **grouping** by category, recency, or activity level
4. Consider **card size variation** for more/less active projects

---

### 4.2 Session Titles Are UUIDs

Session cards display raw file names like:

```
2026-01-05T19-41-33-626Z_94f3b659-cd2c-4d25-9a1...
```

**Problem**: Meaningless to users. No quick way to identify what happened in a session.

**Recommendation**: Generate human-readable session titles from:

- First user message
- Detected task type
- Key topics or files touched

---

## 5. Decisions Page Analysis

**File**: `12-decisions.png`

### 5.1 Card Height Excessive

Each decision card is tall with:

- Timestamp
- Title
- Multi-line description
- Project reference
- Action buttons (thumbs up/down)

**Problem**: Only ~4 decisions visible per screen. Requires extensive scrolling.

**Recommendations**:

1. **Compact view option** with single-line items
2. **Expandable cards** that show details on click
3. **Batch action mode** for rating multiple decisions

---

### 5.2 No Grouping or Filtering

Decisions appear as a flat chronological list with no:

- Grouping by project
- Filtering by decision type
- Status indicators (rated vs. unrated)

**Recommendation**: Add filter chips for project, type, and rating status.

---

## 6. Patterns Pages Analysis

**Files**: `07-patterns.png`, `08-patterns-failures.png`, `09-patterns-lessons.png`

### 6.1 Model Reliability Cards Work Well

The Model Reliability page has clean, scannable cards with:

- Model name as primary
- Quirks/Errors counts with color coding
- Recency indicator

**Positive**: This is one of the better-designed list views.

---

### 6.2 Lessons Page Is Extremely Long

The lessons page (`09-patterns-lessons.png`) is **14,171 pixels tall**—roughly 20 screens of scrolling.

**Problem**: Unmanageable amount of content in a single view.

**Recommendations**:

1. **Paginate** with 20-50 items per page
2. Add **search/filter** for lessons
3. Add **collapsible sections** by category

---

### 6.3 Failure Patterns Cards Need Polish

Failure pattern cards show:

- Error title with occurrence count
- Model and tool info
- Investigation prompt

**Issues**:

- Pink/red background is visually heavy
- Cards could be more compact
- "Learning: Investigate why..." text is generic

---

## 7. Settings Page Analysis

**File**: `06-settings.png`, `16-settings-appearance.png`

### 7.1 Well-Organized Settings

The Settings page is well-structured:

- Clear tab navigation
- Logical groupings (Daemon, Embeddings, Schedules, etc.)
- Two-column form layout
- Helpful descriptions for each field

**Positive**: This is professional-grade settings UI.

---

### 7.2 Theme Selection Doesn't Propagate

Despite having System/Light/Dark theme selection in Appearance tab, the Clusters page remains dark regardless.

**Recommendation**: Ensure all pages respect the theme preference.

---

## 8. Prompt Learning Page Analysis

**File**: `05-prompt-learning.png`

### 8.1 Clean Empty State

The Prompt Learning page has a proper empty state with:

- Descriptive text
- Icon
- Clear layout (master-detail)

**Positive**: Good empty state design.

### 8.2 Cannot Evaluate with Data

Page shows "No active insights found" so the data-populated state cannot be evaluated.

---

## 9. Node Detail Page Analysis

**File**: `15-node-detail.png`

### 9.1 Rich Information Display

The node detail page is well-designed:

- Clear summary at top
- Metadata row (project, type, date, tokens, cost)
- Tag badges
- Key Decisions section
- Lessons grouped by category (Task, User, Model)
- Model Observations

**Positive**: This is the most polished content page.

### 9.2 Sidebar Takes Space on Detail Pages

The sidebar remains visible on detail pages where it's less useful. Users are focused on content, not navigation.

**Recommendation**: Consider auto-collapsing sidebar on detail pages, or using full-width layout.

---

## 10. Recommendations Summary

### Critical (Fix Immediately)

| Issue          | Page     | Action                            |
| -------------- | -------- | --------------------------------- |
| 500 Error      | Graph    | Debug API/data fetching           |
| Search Error   | Search   | Add null checks for semantic data |
| Theme Mismatch | Clusters | Apply consistent theme            |

### High Priority

| Issue               | Page             | Action                                      |
| ------------------- | ---------------- | ------------------------------------------- |
| Dashboard overload  | Dashboard        | Hide empty sections, prioritize key metrics |
| Lessons page length | Patterns/Lessons | Add pagination                              |
| Session UUIDs       | Sessions         | Generate human-readable titles              |

### Medium Priority

| Issue                    | Page      | Action                       |
| ------------------------ | --------- | ---------------------------- |
| Repetitive session cards | Sessions  | Add visual differentiation   |
| Decision card height     | Decisions | Compact view option          |
| Tool errors readability  | Dashboard | Truncate model names         |
| Sidebar inconsistency    | Global    | Audit active/inactive states |

### Low Priority (Polish)

| Issue                   | Page              | Action                      |
| ----------------------- | ----------------- | --------------------------- |
| Failure cards heavy     | Patterns/Failures | Soften visual treatment     |
| Sidebar on detail pages | Node Detail       | Auto-collapse or full-width |
| Stats lack context      | Dashboard         | Add trend indicators        |

---

## 11. Alignment with Pi-Brain Goals

**Pi-brain's stated purpose**: "A second brain for the pi coding agent—analyzes, connects, and learns from every interaction."

### What the UI Does Well

1. **Session browsing**: Functional navigation through projects and sessions
2. **Node detail**: Rich display of extracted insights, lessons, decisions
3. **Pattern detection**: Failure patterns and model reliability tracking
4. **Settings**: Comprehensive daemon configuration

### Where the UI Falls Short

1. **Knowledge Graph Visualization**: Broken. The Graph page—the visual representation of "connections" between decisions—doesn't work. This is the core differentiator.

2. **Semantic Search**: Broken. Users cannot "recall past decisions" via search. The brain cannot be queried.

3. **Learning Loop**: The Decisions page with thumbs up/down exists, but:
   - No visible impact of ratings
   - No feedback on how ratings improve the system
   - No indication of what the brain has "learned"

4. **Actionability**: The dashboard shows data but doesn't guide action:
   - What should the user do with failure patterns?
   - How do they apply lessons?
   - Where's the integration back into the agent?

### Functional Gap Analysis

| Core Feature        | Status         | Notes                                   |
| ------------------- | -------------- | --------------------------------------- |
| Session ingestion   | ✅ Works       | Sessions appear in browser              |
| Decision extraction | ✅ Works       | Decisions displayed                     |
| Lesson extraction   | ✅ Works       | Lessons displayed                       |
| Pattern detection   | ✅ Works       | Failures/models tracked                 |
| Knowledge graph viz | ❌ Broken      | 500 error                               |
| Semantic search     | ❌ Broken      | JS error                                |
| Learning feedback   | ⚠️ Unclear     | Ratings exist but impact unknown        |
| Agent integration   | ⚠️ Not visible | `brain-query` extension not shown in UI |

---

## 12. Conclusion

Pi-brain's web UI has a solid foundation with good typography, color work, and component structure. The recent polish work (per `WEBUI_POLISH_PLAN.md`) addressed many aesthetic issues.

However, **two core features are broken** (Graph, Search), which undermines the entire value proposition. The dashboard suffers from information overload, and several list views need pagination or filtering.

Before further visual polish, **fix the critical functional bugs**. Then address information architecture to make the knowledge graph—and the learning it enables—more visible and actionable.

---

## Screenshots Reference

| File                         | Page                            |
| ---------------------------- | ------------------------------- |
| `01-home.png`                | Dashboard                       |
| `02-sessions.png`            | Session Browser (project list)  |
| `03-graph.png`               | Graph (500 error)               |
| `04-search.png`              | Search (empty state)            |
| `04b-search-results.png`     | Search (error state)            |
| `05-prompt-learning.png`     | Prompt Learning                 |
| `06-settings.png`            | Settings (Daemon tab)           |
| `07-patterns.png`            | Model Reliability               |
| `08-patterns-failures.png`   | Failure Patterns                |
| `09-patterns-lessons.png`    | Lessons                         |
| `10-patterns-models.png`     | Model Reliability               |
| `11-clusters.png`            | Discovered Clusters             |
| `12-decisions.png`           | Daemon Decisions                |
| `13-session-detail.png`      | Session Detail (project filter) |
| `14-session-expanded.png`    | Session Expanded                |
| `15-node-detail.png`         | Node Detail                     |
| `16-settings-appearance.png` | Settings (Appearance tab)       |
