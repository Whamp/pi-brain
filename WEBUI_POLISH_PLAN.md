# Pi-Brain Web UI Polish Plan

A comprehensive overhaul of the pi-brain web interface to transform it from a functional but generic dark UI into a distinctive, memorable experience.

## Overview

**Current State**: Functional SvelteKit application with D3 graph visualization, dashboard, search, and session browsing. Uses safe design choices (Inter font, Tailwind blue, flat cards) that lack personality.

**Target State**: A visually distinctive interface with strong typographic identity, cohesive color system, thoughtful motion design, and polished micro-interactions that make the knowledge graph feel alive.

---

## Tier 1: Critical / Structural Issues

### 1.1 Typography & Identity
- [ ] **Replace Inter with distinctive font pairing**
  - Display font: Something with character (e.g., Cabinet Grotesk, Satoshi, General Sans, or Geist)
  - Body font: Complementary readable sans
  - Code font: Keep JetBrains Mono or switch to Geist Mono
- [ ] **Establish typographic scale with clear hierarchy**
  - Larger, bolder page titles
  - Distinct heading weights
  - Better line-height for readability

### 1.2 Color Palette Overhaul
- [ ] **Replace generic blue accent (#3b82f6)**
  - Consider: Vibrant cyan, electric purple, warm amber, or dual-tone accent
  - Accent should feel intentional, not default
- [ ] **Design cohesive node type color system**
  - Current colors are arbitrary; create a harmonious palette
  - Consider using HSL with consistent saturation/lightness
- [ ] **Add gradient capability**
  - Subtle gradients for backgrounds, cards, or accent elements
  - Mesh gradients for hero sections

### 1.3 Layout & Spatial Design
- [ ] **Make sidebar collapsible**
  - Icon-only collapsed state
  - Smooth animation
  - Persist preference
- [ ] **Add visual variety to layouts**
  - Hero sections on key pages
  - Card elevation variations
  - Strategic use of full-bleed elements

---

## Tier 2: Functional / UX Issues

### 2.1 Mobile Navigation (P0 - Critical)
- [ ] **Add mobile hamburger menu**
  - Slide-out drawer with navigation
  - Touch-optimized tap targets (44px minimum)
  - Smooth open/close animation
- [ ] **Make graph controls accessible on mobile**
  - Move filters to bottom sheet or expandable panel

### 2.2 Empty States & Onboarding
- [ ] **Add dashboard empty state**
  - Show getting-started when no stats exist
  - Friendly illustration or icon
- [ ] **Enhance error states**
  - More helpful error messages
  - Contextual recovery actions
  - Softer visual treatment (not harsh red)

### 2.3 Loading States
- [ ] **Create unified loading component**
  - Single source of truth for spinner styles
  - Consistent usage across all pages
- [ ] **Add skeleton loading**
  - Dashboard stats cards
  - Session list items
  - Node detail sections
- [ ] **Add loading indicator during search debounce**
  - Subtle spinner or pulsing border on search box

### 2.4 Navigation & Wayfinding
- [ ] **Add consistent breadcrumb component**
  - Use across all detail pages
  - Node detail, session detail, cluster detail
- [ ] **Make settings save actions sticky**
  - Fixed bottom bar when changes pending
- [ ] **Add keyboard shortcuts**
  - `/` to focus search
  - `g h` for home, `g g` for graph, etc.
  - Help modal with shortcut reference

### 2.5 Search Improvements
- [ ] **Add search suggestions/history**
  - Recent searches
  - Popular tags as quick filters
- [ ] **Fix filter dropdown focus management**
  - Trap focus when open
  - Close on Escape key
  - Prevent toggle button from triggering close

### 2.6 Graph Improvements
- [ ] **Add node tooltips on hover**
  - Show full summary, project, outcome
  - Smooth fade-in
- [ ] **Complete the legend**
  - Show all 12 node types
  - Collapsible if too long
- [ ] **Add empty state inside canvas**
  - Centered illustration
  - Call to action

---

## Tier 3: Visual Polish

### 3.1 Motion & Micro-interactions
- [ ] **Add page entrance animations**
  - Staggered fade-up for card grids
  - Subtle scale on page load
- [ ] **Enhance button interactions**
  - Scale on press
  - Icon animations on hover
- [ ] **Add toast variety**
  - Different entrance directions
  - Success: subtle confetti or pulse
- [ ] **Improve graph animation**
  - Node entrance animation (scale from 0)
  - Edge draw animation
  - Selection pulse effect

### 3.2 Visual Depth & Texture
- [ ] **Add background gradient or pattern**
  - Subtle radial gradient from accent color
  - Or: noise/grain texture overlay
- [ ] **Increase shadow visibility**
  - Adjust for dark theme visibility
  - Add inner shadows for depth
- [ ] **Add glassmorphism to key elements**
  - Sidebar background
  - Floating controls
  - Modal overlays

### 3.3 Component Enhancements
- [ ] **Create card variants**
  - Elevated card (hero/featured)
  - Accent-bordered card
  - Interactive card with hover lift
- [ ] **Enhance tables**
  - Row hover highlighting
  - Sortable column headers with icons
- [ ] **Add tag color variants**
  - Different colors for different tag categories
  - Or: subtle hue variations

### 3.4 Graph Visual Enhancements
- [ ] **Add node glow effect**
  - Subtle glow matching node color
  - Brighter glow on hover/selection
- [ ] **Vary edge styling by type**
  - Different stroke patterns (dashed, dotted)
  - Varying thickness by edge weight
- [ ] **Add selection ring animation**
  - Pulsing or rotating selection indicator

---

## Tier 4: Accessibility

### 4.1 Color Contrast
- [ ] **Audit text contrast ratios**
  - Verify muted/subtle text meets WCAG AA
  - Adjust if needed
- [ ] **Add icons to status indicators**
  - Don't rely on color alone
  - Status dots should have shape variants or icons

### 4.2 Focus Management
- [ ] **Add custom focus ring styles**
  - Visible, consistent focus indicators
  - Match accent color
- [ ] **Trap focus in modals/dropdowns**
  - Implement focus trap utility

### 4.3 Form Accessibility
- [ ] **Add aria-describedby for hints**
  - Settings page form fields
  - Search filters

---

## Tier 5: Code Quality

### 5.1 Style Consolidation
- [ ] **Deduplicate button styles**
  - Single source in app.css
  - Remove page-level overrides
- [ ] **Consolidate spinner/loading styles**
  - Use Spinner component everywhere
- [ ] **Consolidate status dot styles**
  - Create StatusDot component

### 5.2 Component Extraction
- [ ] **Create CardHeader component**
  - Title + "View all" link pattern
- [ ] **Create EmptyState component**
  - Icon, title, description, action slots
- [ ] **Create LoadingState component**
  - Consistent loading presentation

### 5.3 Design Token Improvements
- [ ] **Add z-index scale**
  - `--z-dropdown`, `--z-modal`, `--z-toast`, etc.
- [ ] **Add animation easing tokens**
  - `--ease-out`, `--ease-spring`, etc.
- [ ] **Add semantic color aliases**
  - `--color-card-bg`, `--color-card-border`, etc.

---

## Tier 6: Enhancement Opportunities

### 6.1 Theme Support
- [ ] **Add light theme**
  - Full color palette for light mode
  - System preference detection
  - Manual toggle in settings

### 6.2 Dashboard Enhancements
- [ ] **Add sparkline charts**
  - Token usage over time
  - Cost trend
- [ ] **Add quick actions**
  - Daemon start/stop
  - Trigger analysis

### 6.3 Graph Enhancements
- [ ] **Add minimap**
  - Small overview in corner
  - Click to navigate
- [ ] **Add search within graph**
  - Jump to node by name
- [ ] **Add layout options**
  - Force-directed (current)
  - Hierarchical
  - Radial

### 6.4 Sessions Browser
- [ ] **Add sort options**
  - By date, tokens, cost, node count
- [ ] **Add filter persistence**
  - Remember last filter state

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
