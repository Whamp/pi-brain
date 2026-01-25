/**
 * Event types for the SessionWatcher
 */

/**
 * Event detail for session events
 */
export interface SessionEventDetail {
  /** Path to the session file */
  sessionPath: string;
}

/**
 * Event detail for error events
 */
export interface ErrorEventDetail {
  /** The error that occurred */
  error: Error;
}

/**
 * Session event names
 */
export const SESSION_EVENTS = {
  /** Emitted when a new session file is detected */
  NEW: "sessionNew",
  /** Emitted when a session file is modified */
  CHANGE: "sessionChange",
  /** Emitted when a session becomes idle (ready for analysis) */
  IDLE: "sessionIdle",
  /** Emitted when a session file is removed */
  REMOVE: "sessionRemove",
  /** Emitted when a watcher error occurs */
  ERROR: "watcherError",
  /** Emitted when watcher is ready */
  READY: "watcherReady",
} as const;

/**
 * Type for session event names
 */
export type SessionEventName =
  (typeof SESSION_EVENTS)[keyof typeof SESSION_EVENTS];

/**
 * Create a session event
 */
export function createSessionEvent(
  type: string,
  sessionPath: string
): CustomEvent<SessionEventDetail> {
  return new CustomEvent<SessionEventDetail>(type, {
    detail: { sessionPath },
  });
}

/**
 * Create an error event
 */
export function createErrorEvent(error: Error): CustomEvent<ErrorEventDetail> {
  return new CustomEvent<ErrorEventDetail>(SESSION_EVENTS.ERROR, {
    detail: { error },
  });
}

/**
 * Create a ready event
 */
export function createReadyEvent(): Event {
  return new Event(SESSION_EVENTS.READY);
}

/**
 * Type guard to check if an event is a session event
 */
export function isSessionEvent(
  event: Event
): event is CustomEvent<SessionEventDetail> {
  return (
    event instanceof CustomEvent &&
    typeof (event as CustomEvent<SessionEventDetail>).detail?.sessionPath ===
      "string"
  );
}

/**
 * Type guard to check if an event is an error event
 */
export function isErrorEvent(
  event: Event
): event is CustomEvent<ErrorEventDetail> {
  return (
    event instanceof CustomEvent &&
    (event as CustomEvent<ErrorEventDetail>).detail?.error instanceof Error
  );
}

/**
 * Helper to get session path from a session event
 */
export function getSessionPath(event: Event): string | undefined {
  if (isSessionEvent(event)) {
    return event.detail.sessionPath;
  }
  return undefined;
}

/**
 * Helper to get error from an error event
 */
export function getEventError(event: Event): Error | undefined {
  if (isErrorEvent(event)) {
    return event.detail.error;
  }
  return undefined;
}
