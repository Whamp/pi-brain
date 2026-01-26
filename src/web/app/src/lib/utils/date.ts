/**
 * Date formatting utilities for pi-brain web UI
 */

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 60 * SECONDS_PER_MINUTE;
const SECONDS_PER_DAY = 24 * SECONDS_PER_HOUR;
const SECONDS_PER_WEEK = 7 * SECONDS_PER_DAY;
const SECONDS_PER_MONTH = 30 * SECONDS_PER_DAY;
const SECONDS_PER_YEAR = 365 * SECONDS_PER_DAY;

/**
 * Format a date as a relative distance from now
 * e.g., "5 minutes ago", "2 hours ago", "3 days ago"
 */
export function formatDistanceToNow(date: Date): string {
  const now = new Date();
  const diff = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

  if (diff < SECONDS_PER_MINUTE) {
    return diff === 1 ? "1 second ago" : `${diff} seconds ago`;
  }

  if (diff < SECONDS_PER_HOUR) {
    const minutes = Math.floor(diff / SECONDS_PER_MINUTE);
    return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;
  }

  if (diff < SECONDS_PER_DAY) {
    const hours = Math.floor(diff / SECONDS_PER_HOUR);
    return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  }

  if (diff < SECONDS_PER_WEEK) {
    const days = Math.floor(diff / SECONDS_PER_DAY);
    return days === 1 ? "1 day ago" : `${days} days ago`;
  }

  if (diff < SECONDS_PER_MONTH) {
    const weeks = Math.floor(diff / SECONDS_PER_WEEK);
    return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
  }

  if (diff < SECONDS_PER_YEAR) {
    const months = Math.floor(diff / SECONDS_PER_MONTH);
    return months === 1 ? "1 month ago" : `${months} months ago`;
  }

  const years = Math.floor(diff / SECONDS_PER_YEAR);
  return years === 1 ? "1 year ago" : `${years} years ago`;
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
