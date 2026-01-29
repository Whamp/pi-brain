# Pi-Brain Web UI Polish Plan

A comprehensive overhaul of the pi-brain web interface to transform it from a functional but generic dark UI into a distinctive, memorable experience.

## Overview

**Current State**: Functional SvelteKit application with D3 graph visualization, dashboard, search, and session browsing. Uses safe design choices (Inter font, Tailwind blue, flat cards) that lack personality.

**Target State**: A visually distinctive interface with strong typographic identity, cohesive color system, thoughtful motion design, and polished micro-interactions that make the knowledge graph feel alive.

---

## Tier 1: Critical / Structural Issues

### 1.1 Typography & Identity

- [x] **Replace Inter with distinctive font pairing**
  - Display font: Something with character (e.g., Cabinet Grotesk, Satoshi, General Sans, or Geist)
  - Body font: Complementary readable sans
  - Code font: Keep JetBrains Mono or switch to Geist Mono
- [x] **Establish typographic scale with clear hierarchy**
  - Larger, bolder page titles
  - Distinct heading weights
  - Better line-height for readability

### 1.2 Color Palette Overhaul

- [x] **Replace generic blue accent (#3b82f6)**
  - Consider: Vibrant cyan, electric purple, warm amber, or dual-tone accent
  - Accent should feel intentional, not default
  - Implemented: Electric cyan (#00d9ff) with hover (#33e4ff) and muted variants
- [x] **Design cohesive node type color system**
  - Current colors are arbitrary; create a harmonious palette
  - Consider using HSL with consistent saturation/lightness
  - Implemented: HSL palette with ~72% saturation, ~58-62% lightness, evenly distributed hues
- [x] **Add gradient capability**
  - Subtle gradients for backgrounds, cards, or accent elements
  - Mesh gradients for hero sections

### 1.3 Layout & Spatial Design

- [x] **Make sidebar collapsible**
  - Icon-only collapsed state
  - Smooth animation
  - Persist preference
- [x] **Add visual variety to layouts**
  - Hero sections on key pages
  - Card elevation variations
  - Strategic use of full-bleed elements

---

## Tier 2: Functional / UX Issues

### 2.1 Mobile Navigation (P0 - Critical)

- [x] **Add mobile hamburger menu**
  - Slide-out drawer with navigation
  - Touch-optimized tap targets (44px minimum)
  - Smooth open/close animation
- [x] **Make graph controls accessible on mobile**
  - Move filters to bottom sheet or expandable panel

### 2.2 Empty States & Onboarding

- [x] **Add dashboard empty state**
  - Show getting-started when no stats exist
  - Friendly illustration or icon
  - Implemented: Dashboard shows GettingStarted component with variant="dashboard" when stats.totals.nodes === 0
- [x] **Enhance error states**
  - More helpful error messages
  - Contextual recovery actions
  - Softer visual treatment (not harsh red)
  - Implemented: Softer coral error color (`hsl(0, 65%, 65%)`), error tokens (`--color-error-muted`, `--color-error-hover`), reusable `.inline-error` utility class in app.css

### 2.3 Loading States

- [x] **Create unified loading component**
  - Single source of truth for spinner styles
  - Consistent usage across all pages
  - Implemented: Enhanced Spinner component with size variants (sm/md/lg/xl/number), variant prop (default/inline), added global .loading-state and .loading-overlay classes to app.css
- [x] **Add skeleton loading**
  - Dashboard stats cards
  - Session list items
  - Node detail sections
  - Implemented: Created Skeleton component (skeleton.svelte), DashboardSkeleton (dashboard-skeleton.svelte), SessionsSkeleton (sessions-skeleton.svelte), NodeDetailSkeleton (node-detail-skeleton.svelte). Added skeleton utility classes to app.css. Updated dashboard, sessions, and node detail pages to use skeleton loading instead of spinner.
- [x] **Add loading indicator during search debounce**
  - Subtle spinner or pulsing border on search box
  - Implemented: Search icon replaced with spinner during 300ms debounce, border color changes to accent-muted

### 2.4 Navigation & Wayfinding

- [x] **Add consistent breadcrumb component**
  - Use across all detail pages
  - Node detail, session detail, cluster detail
  - Implemented: Enhanced Breadcrumbs component with icon and onClick support. Updated sessions page to use Breadcrumbs component instead of custom inline implementation. Node detail page already uses the component.
- [x] **Make settings save actions sticky**
  - Fixed bottom bar when changes pending
  - Implemented: Sticky save bar appears at bottom of viewport when `hasChanges` is true. Includes slide-up animation, pulsing unsaved indicator dot, and responsive layout for mobile. Bar has proper z-index and shadow for visibility.
- [x] **Add keyboard shortcuts**
  - `/` to focus search
  - `g h` for home, `g g` for graph, etc.
  - Help modal with shortcut reference
  - Implemented: Full keyboard shortcuts system with `keyboardShortcuts` store, navigation with `g` prefix (g h, g g, g s, g l, g e, g t), `/` to focus search, `?` to toggle help modal, Escape to close modals/clear focus. Help modal displays all shortcuts grouped by category with focus trap.

### 2.5 Search Improvements

- [x] **Add search suggestions/history**
  - Recent searches
  - Popular tags as quick filters
  - Implemented: SearchHistory store with localStorage persistence, suggestions dropdown on focus, keyboard navigation (arrow keys, Enter, Escape), remove individual items, clear all history, popular tags from search results
- [x] **Fix filter dropdown focus management**
  - Trap focus when open
  - Close on Escape key
  - Prevent toggle button from triggering close
  - Implemented: Focus traps for field dropdown (fieldDropdownMenuRef) and filters panel (filtersPanelRef) using createFocusTrap utility. Escape key closes via onEscape callback. handleClickOutside prevents toggle button from triggering close by checking dropdownTriggerRef.contains(target).

### 2.6 Graph Improvements

- [x] **Add node tooltips on hover**
  - Show full summary, project, outcome
  - Smooth fade-in
- [x] **Complete the legend**
  - Show all 12 node types
  - Collapsible if too long
  - Implemented: Legend section with all 12 node types (coding, debugging, refactoring, planning, research, sysadmin, brainstorm, documentation, configuration, qa, handoff, other). Collapsible with chevron animation, persists visual state. Each type uses HSL color from design tokens.
- [x] **Add empty state inside canvas**
  - Centered illustration
  - Call to action
  - Implemented: Network icon with animated orbital rings, title, description, and two action buttons (Check Settings, View Sessions). Smooth pulse animation on orbits for visual interest.

---

## Tier 3: Visual Polish

### 3.1 Motion & Micro-interactions

- [x] **Add page entrance animations**
  - Staggered fade-up for card grids
  - Subtle scale on page load
  - Implemented: Keyframes (fade-in, fade-up, scale-in, slide-in-left/right) with animation classes (.animate-in, .animate-fade, .animate-scale), stagger utilities (.stagger-1 through .stagger-12), container animations (.card-grid-animate, .list-animate, .hero-animate, .page-animate). Applied across all pages (dashboard, sessions, search, settings, graph, node detail). Respects prefers-reduced-motion.
- [x] **Enhance button interactions**
  - Scale on press
  - Icon animations on hover
  - Implemented: Enhanced button base with spring easing, lift + shadow on hover for primary/secondary/gradient buttons, icon animation utilities (slide-right, slide-left, grow, rotate, bounce), shine effect class, pulse CTA animation, size variants (sm/lg), respects prefers-reduced-motion
- [x] **Add toast variety**
  - Different entrance directions
  - Success: subtle confetti or pulse
  - Implemented: Toast types have unique entrance animations (success drops from top, error/info slide from right, warning slides diagonal). Success toasts feature a pulse glow animation, subtle confetti burst particles, background gradient, and icon pop animation. Error icons shake, warning icons wobble. All toasts have type-colored progress bars. Respects prefers-reduced-motion.
- [x] **Improve graph animation**
  - Node entrance animation (scale from 0)
  - Edge draw animation
  - Selection pulse effect
  - Implemented: Nodes animate in with D3 easeBackOut transition from radius 0, staggered by 20ms per node. Edges animate with stroke-dasharray draw effect, staggered by 30ms. Selected nodes have pulsing glow animation. All animations respect prefers-reduced-motion.

### 3.2 Visual Depth & Texture

- [x] **Add background gradient or pattern**
  - Subtle radial gradient from accent color
  - Or: noise/grain texture overlay
  - Implemented: Multi-layer radial gradients (accent, purple, green) with fixed positioning, combined with a noise texture and subtle grid pattern overlay using mix-blend-mode for depth. Applied globally via .bg-page-effects in layout.
- [x] **Increase shadow visibility**
  - Adjust for dark theme visibility
  - Add inner shadows for depth
  - Implemented: Updated shadow variables with higher opacity, added --shadow-highlight and --shadow-inner, applied consistently to cards, buttons, modals, and sidebar for enhanced depth and definition.
- [x] **Add glassmorphism to key elements**
  - Sidebar background
  - Floating controls
  - Modal overlays

### 3.3 Component Enhancements

- [x] **Create card variants**
  - Elevated card (hero/featured)
  - Accent-bordered card
  - Interactive card with hover lift
- [x] **Enhance tables**
  - Row hover highlighting
  - Sortable column headers with icons
  - Implemented: Added global `.data-table` styles to `app.css` with hover states, sortable header classes, and numeric alignment. Created `TableSortIcon` component. Implemented sorting logic and sortable headers in Dashboard (Tool Errors, Model Reliability) and Prompt Learning (History) pages.
- [x] **Add tag color variants**
  - Different colors for different tag categories
  - Or: subtle hue variations
  - Implemented: Added comprehensive tag color system to `app.css` with 10 color variants. Created `Tag.svelte` component with automatic deterministic color assignment based on tag text (hue variations). Updated all pages and components to use the new system.

### 3.4 Graph Visual Enhancements

- [x] **Add node glow effect**
  - Subtle glow matching node color
  - Brighter glow on hover/selection
  - Implemented: Added `--node-color` CSS property to nodes, applied dynamic `drop-shadow` filter to circles, updated selection pulse to use node-specific glow.
- [x] **Vary edge styling by type**
  - Different stroke patterns (dashed, dotted)
  - Varying thickness by edge weight
  - Implemented: Edge style mapping by type with dynamic stroke-dasharray and weight-based stroke-width (similarity-driven for semantic edges).
- [x] **Add selection ring animation**
  - Pulsing or rotating selection indicator
  - Implemented: Added a premium dual-ring selection system with a rotating outer dashed ring and a pulsing inner solid ring. Uses CSS transforms for high-performance animation and smooth transitions.

---

## Tier 4: Accessibility

### 4.1 Color Contrast

- [x] **Audit text contrast ratios**
  - Verify muted/subtle text meets WCAG AA
  - Adjust if needed
  - Implemented: Updated `--color-text-subtle` (#71717a -> #898991), `--color-node-other` (lightness 50% -> 60%), and `--color-error` (lightness 65% -> 72%) to meet WCAG AA 4.5:1 contrast on dark backgrounds. Cleaned up hardcoded light-mode colors in Prompt Learning and Dashboard pages.
- [x] **Add icons to status indicators**
  - Don't rely on color alone
  - Status dots should have shape variants or icons
  - Implemented: Created StatusDot component with Lucide icons (check, x, alert, info, circle-off) for different states. Applied in sidebar, dashboard, and mobile navigation.

### 4.2 Focus Management

- [x] **Add custom focus ring styles**
  - Visible, consistent focus indicators
  - Match accent color
  - Implemented: Global :focus-visible styles in app.css with accent color ring and subtle glow. Consolidated focus styles across components.
- [x] **Trap focus in modals/dropdowns**
  - Implement focus trap utility
  - Implemented: Focus trap utility in focus-trap.ts. Applied to ConfirmDialog, SpokeModal, MobileNav, and GraphControlsSheet. Search dropdowns already use it.

### 4.3 Form Accessibility

- [x] **Add aria-describedby for hints**
  - Settings page form fields
  - Search filters

---

## Tier 5: Code Quality

### 5.1 Style Consolidation

- [x] **Deduplicate button styles**
  - Single source in app.css
  - Remove page-level overrides
  - Implemented: Added `.btn-outline`, `.btn-outline-color`, `.btn-text`, `.btn-text-danger`, `.btn-full`, `.btn-icon-sm`, `.btn-icon-bordered` to app.css. Replaced page-level button classes in search, decisions, prompt-learning, daemon-decisions, and spoke-list components. Removed all duplicate button style definitions.
- [x] **Consolidate spinner/loading styles**
  - Use Spinner component everywhere
  - Implemented: Replaced all duplicate `.spinner` and `@keyframes spin` definitions with the unified `Spinner` component. Updated settings, search, prompt-learning, graph-controls-sheet, graph, spoke-list, and decisions pages/components.
- [x] **Consolidate status dot styles**
  - Create StatusDot component
  - Implemented: Created src/web/app/src/lib/components/status-dot.svelte and replaced inline status dots. Removed local CSS overrides.

### 5.2 Component Extraction

- [x] **Create CardHeader component**
  - Title + "View all" link pattern
- [x] **Create EmptyState component**
  - Icon, title, description, action slots
- [x] **Create LoadingState component**
  - Consistent loading presentation

### 5.3 Design Token Improvements

- [x] **Add z-index scale**
  - `--z-dropdown`, `--z-modal`, `--z-toast`, etc.
- [x] **Add animation easing tokens**
  - `--ease-out`, `--ease-spring`, etc.
- [x] **Add semantic color aliases**
  - `--color-card-bg`, `--color-card-border`, etc.

---

## Tier 6: Enhancement Opportunities

### 6.1 Theme Support

- [x] **Add light theme**
  - Full color palette for light mode
  - System preference detection
  - Manual toggle in settings

### 6.2 Dashboard Enhancements

- [x] **Add sparkline charts**
  - Token usage over time
  - Cost trend
- [x] **Add quick actions**
  - Daemon start/stop
  - Trigger analysis

### 6.3 Graph Enhancements

- [x] **Add minimap**
  - Small overview in corner
  - Click to navigate
- [x] **Add search within graph**
  - Jump to node by name
- [x] **Add layout options**
  - Force-directed (current)
  - Hierarchical
  - Radial

### 6.4 Sessions Browser

- [x] **Add sort options**
  - By date, tokens, cost, node count
  - Implemented sorting for both Projects (name, sessionCount, nodeCount, lastActivity) and Sessions (date, nodeCount, tokens, cost)
  - UI includes dropdown selector and direction toggle button with SortAsc/SortDesc icons
  - Fixed all lint errors: proper switch-case braces, default cases, merged duplicate imports, use toSorted() instead of sort()
- [x] **Add filter persistence**
  - Remember last filter state
  - Uses localStorage key `pi-brain-sessions-prefs`
  - Persists: projectSortBy, projectSortDir, sessionSortBy, sessionSortDir, lastViewedProject
  - Loads on mount and saves when preferences change
  - Automatically restores last viewed project on page load

---

## Implementation Order

### Phase 1: Foundation (P0-P1)

1. Mobile navigation fix
2. Typography overhaul
3. Color palette redesign
4. Sidebar collapse

### Phase 2: UX Polish (P2)

1. Skeleton loading
2. Empty states
3. Breadcrumb component
4. Search improvements

### Phase 3: Visual Delight (P3)

1. Motion system
2. Background depth
3. Card variants
4. Graph enhancements

### Phase 4: Accessibility & Quality (P4-P5)

1. Contrast audit
2. Focus management
3. Component extraction
4. Token cleanup

### Phase 5: Enhancements (P6)

1. Light theme
2. Dashboard charts
3. Graph minimap
4. Keyboard shortcuts

---

## Files to Modify

### Core Styles

- `src/web/app/src/app.css` - Design tokens, base styles

### Layout

- `src/web/app/src/routes/+layout.svelte` - Sidebar, mobile nav

### Components (New)

- `src/web/app/src/lib/components/mobile-nav.svelte`
- `src/web/app/src/lib/components/card-header.svelte`
- `src/web/app/src/lib/components/empty-state.svelte`
- `src/web/app/src/lib/components/skeleton.svelte`
- `src/web/app/src/lib/components/breadcrumbs.svelte`
- `src/web/app/src/lib/components/status-dot.svelte`

### Pages

- `src/web/app/src/routes/+page.svelte` - Dashboard
- `src/web/app/src/routes/graph/+page.svelte`
- `src/web/app/src/routes/search/+page.svelte`
- `src/web/app/src/routes/sessions/+page.svelte`
- `src/web/app/src/routes/nodes/[id]/+page.svelte`
- `src/web/app/src/routes/settings/+page.svelte`

### Existing Components

- `src/web/app/src/lib/components/graph.svelte`
- `src/web/app/src/lib/components/toast.svelte`
- `src/web/app/src/lib/components/getting-started.svelte`
- `src/web/app/src/lib/components/spinner.svelte`

---

## Success Metrics

1. **Visual Distinctiveness**: Screenshot should be immediately recognizable, not generic
2. **Mobile Usability**: Full navigation and core features work on mobile
3. **Performance**: No regression in load time or interaction latency
4. **Accessibility**: WCAG AA compliance for contrast and keyboard nav
5. **Code Quality**: No duplicate style definitions, consistent component usage
