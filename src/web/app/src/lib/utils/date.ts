/**
 * Date formatting utilities for pi-brain web UI
 */

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 60 * SECONDS_PER_MINUTE;
const SECONDS_PER_DAY = 24 * SECONDS_PER_HOUR;
const SECONDS_PER_WEEK = 7 * SECONDS_PER_DAY;
const SECONDS_PER_MONTH = 30 * SECONDS_PER_DAY;
const SECONDS_PER_YEAR = 365 * SECONDS_PER_DAY;

interface TimeUnit {
  threshold: number;
  divisor: number;
  singular: string;
  plural: string;
}

const TIME_UNITS: TimeUnit[] = [
  {
    threshold: SECONDS_PER_MINUTE,
    divisor: 1,
    singular: "second",
    plural: "seconds",
  },
  {
    threshold: SECONDS_PER_HOUR,
    divisor: SECONDS_PER_MINUTE,
    singular: "minute",
    plural: "minutes",
  },
  {
    threshold: SECONDS_PER_DAY,
    divisor: SECONDS_PER_HOUR,
    singular: "hour",
    plural: "hours",
  },
  {
    threshold: SECONDS_PER_WEEK,
    divisor: SECONDS_PER_DAY,
    singular: "day",
    plural: "days",
  },
  {
    threshold: SECONDS_PER_MONTH,
    divisor: SECONDS_PER_WEEK,
    singular: "week",
    plural: "weeks",
  },
  {
    threshold: SECONDS_PER_YEAR,
    divisor: SECONDS_PER_MONTH,
    singular: "month",
    plural: "months",
  },
  {
    threshold: Number.POSITIVE_INFINITY,
    divisor: SECONDS_PER_YEAR,
    singular: "year",
    plural: "years",
  },
];

function formatTimeUnit(value: number, unit: TimeUnit): string {
  const label = value === 1 ? unit.singular : unit.plural;
  return `${value} ${label} ago`;
}

/**
 * Format a date as a relative distance from now
 * e.g., "5 minutes ago", "2 hours ago", "3 days ago"
 */
export function formatDistanceToNow(date: Date): string {
  const now = new Date();
  const diff = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

  for (const unit of TIME_UNITS) {
    if (diff < unit.threshold) {
      const value = Math.floor(diff / unit.divisor);
      return formatTimeUnit(value, unit);
    }
  }

  // Fallback (should never reach due to Infinity threshold)
  const years = Math.floor(diff / SECONDS_PER_YEAR);
  const lastUnit = TIME_UNITS.at(-1);
  return formatTimeUnit(years, lastUnit ?? TIME_UNITS[6]);
}

/**
 * Format a date as "MMM D, YYYY at h:mm AM/PM"
 */
export function formatDate(date: Date): string {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Format a date as "MMM D, YYYY"
 */
export function formatDateShort(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format a date as "YYYY-MM-DD" for input[type="date"]
 */
export function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parse a date string or Date object to Date
 */
export function parseDate(date: string | Date): Date {
  return typeof date === "string" ? new Date(date) : date;
}
