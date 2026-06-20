/**
 * Idle-session policy. Shared by the middleware (server enforcement) and the
 * client idle watcher (proactive logout + warning). Plain constants only so
 * the Edge middleware can import them without pulling server-only code.
 */

/** Auto sign-out after this much inactivity. */
export const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

/** Show the "you're about to be signed out" warning this long before timeout. */
export const IDLE_WARN_MS = 60 * 1000; // 60 seconds

/** Cross-tab activity heartbeat key (localStorage). Activity in any tab keeps
 *  every tab's timer alive. */
export const IDLE_ACTIVITY_KEY = "tx_last_activity";
