/**
 * Tracks the last time the user did something (a keypress) so background work can
 * be suspended when they're away from the keyboard — "snooze mode". This keeps an
 * idle client from polling the API forever like a zombie.
 */

const IDLE_MS = 10 * 60_000; // 10 minutes

let lastActivityAt = Date.now();
const resumeListeners = new Set<() => void>();
const changeListeners = new Set<(idle: boolean) => void>();

/** True once the user has been inactive for longer than the idle threshold. */
export function isIdle(): boolean {
  return Date.now() - lastActivityAt > IDLE_MS;
}

/** Record activity. Fires resume/change listeners if we were previously idle. */
export function markActivity(): void {
  const wasIdle = isIdle();
  lastActivityAt = Date.now();
  if (wasIdle) {
    for (const fn of resumeListeners) fn();
    for (const fn of changeListeners) fn(false);
  }
}

/** Called on transition into idle (drives the snooze indicator). */
function notifyIdle(): void {
  for (const fn of changeListeners) fn(true);
}

/** Fires once each time the user returns from being idle. */
export function onResume(fn: () => void): () => void {
  resumeListeners.add(fn);
  return () => resumeListeners.delete(fn);
}

/** Fires with the current idle state whenever it flips. */
export function onIdleChange(fn: (idle: boolean) => void): () => void {
  changeListeners.add(fn);
  return () => changeListeners.delete(fn);
}

/**
 * Start a timer that watches for the idle transition so `onIdleChange` fires even
 * when no key is pressed (activity can only be observed via keypresses). Returns a
 * disposer. Poll interval is well under the idle threshold.
 */
export function startIdleWatcher(): () => void {
  let idle = false;
  const timer = setInterval(() => {
    const now = isIdle();
    if (now && !idle) {
      idle = true;
      notifyIdle();
    } else if (!now && idle) {
      // markActivity already handled the resume notification.
      idle = false;
    }
  }, 30_000);
  return () => clearInterval(timer);
}

export const IDLE_THRESHOLD_MS = IDLE_MS;
