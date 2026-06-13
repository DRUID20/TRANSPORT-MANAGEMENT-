/**
 * Session-secret resolution, shared by the session helper (Node runtime) and
 * the middleware (Edge runtime). Kept free of `next/headers` and other
 * Node-only imports so it is safe to import from middleware.
 */

/**
 * Demo mode: no database is configured. Real auth is impossible and there is
 * no data to protect, so the app runs as a self-contained preview (fixed
 * session secret, dev-login enabled). Never active when DATABASE_URL is set.
 */
export const IS_DEMO_MODE = !process.env.DATABASE_URL;

/**
 * Fixed secret used ONLY in demo mode so a zero-config preview can seal and
 * verify sessions. It is intentionally public — it protects nothing, because
 * demo mode has no database and no real data.
 */
const DEMO_SECRET = "tms-preview-demo-session-secret-do-not-use-in-production-0001";

/**
 * Resolve the password used to seal/unseal the session cookie. Returns the
 * configured SESSION_SECRET when valid, the demo secret in demo mode, or
 * undefined when neither applies (callers surface the misconfiguration).
 */
export function resolveSessionPassword(): string | undefined {
  const env = process.env.SESSION_SECRET;
  if (env && env.length >= 32) return env;
  if (IS_DEMO_MODE) return DEMO_SECRET;
  return env;
}
