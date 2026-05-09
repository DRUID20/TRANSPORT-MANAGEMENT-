/**
 * Next.js instrumentation hook — runs once at server boot.
 * Phase 0: Sentry wiring is gated behind env vars. When SENTRY_DSN is set
 * we'll initialise; otherwise it's a no-op so the app runs locally without it.
 *
 * Real Sentry integration is added in Phase 0.5 once the team has a Sentry
 * project. Until then this file just declares the intent.
 */
export async function register() {
  if (!process.env.SENTRY_DSN) {
    return;
  }
  // TODO: import @sentry/nextjs and call Sentry.init() once the package is added.
  // We deliberately don't add @sentry/nextjs to dependencies in Phase 0 until
  // the Sentry project + DSN are issued — keeps install footprint lean.
  console.log("[tx-system] Sentry DSN detected (init deferred to Phase 0.5).");
}
