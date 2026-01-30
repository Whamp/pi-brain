const STORAGE_KEY = "pi-brain-sidebar-collapsed";

/**
 * Detail page patterns that should auto-collapse the sidebar.
 * These are content-focused pages where users need more horizontal space.
 */
const DETAIL_PAGE_PATTERNS = [
  /^\/nodes\/[^/]+$/, // /nodes/[id]
  /^\/sessions\/[^/]+$/, // /sessions/[id] (if exists)
  /^\/patterns\/failures\/[^/]+$/, // /patterns/failures/[id]
  /^\/patterns\/lessons\/[^/]+$/, // /patterns/lessons/[id]
  /^\/patterns\/models\/[^/]+$/, // /patterns/models/[id]
];

/**
 * Check if a pathname is a detail page.
 */
export function isDetailPage(pathname: string): boolean {
  return DETAIL_PAGE_PATTERNS.some((pattern) => pattern.test(pathname));
}

/**
 * Load saved sidebar preference from localStorage.
 */
export function loadSidebarPreference(): boolean | null {
  if (typeof localStorage === "undefined") {
    return null;
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
      return JSON.parse(saved) as boolean;
    }
  } catch {
    // localStorage may be unavailable
  }
  return null;
}

/**
 * Save sidebar preference to localStorage.
 */
export function saveSidebarPreference(collapsed: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(collapsed));
  } catch {
    // localStorage may be unavailable
  }
}

/**
 * Determine if sidebar should be collapsed based on page and preferences.
 */
export function shouldCollapseForPage(
  pathname: string,
  userPreference: boolean | null,
  hasManualOverride: boolean
): boolean {
  const isDetail = isDetailPage(pathname);

  // If user has manually overridden, use their preference
  if (hasManualOverride && userPreference !== null) {
    return userPreference;
  }

  // Auto-collapse on detail pages
  if (isDetail) {
    return true;
  }

  // Use user preference on list pages, default to expanded
  return userPreference ?? false;
}
