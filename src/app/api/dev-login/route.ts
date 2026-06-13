import { NextResponse } from "next/server";
import { getSession, IS_DEMO_MODE } from "@/server/auth/session";

/**
 * Preview-only login bypass.
 *
 * Creates a valid session without touching the database, so the app can be
 * browsed when no real DB/auth is configured. Every page reads from the
 * in-memory store, so a session cookie is all that's needed to walk the app.
 *
 * Enabled only when one of these holds:
 *   - IS_DEMO_MODE: no DATABASE_URL is configured, so there is no real auth
 *     and no data to protect (e.g. a fresh preview deploy or an offline box).
 *   - ALLOW_DEV_LOGIN=true is explicitly set (local dev convenience).
 *
 * The moment a real DATABASE_URL is configured (a real deployment) this route
 * 404s, unless the operator explicitly opts back in with ALLOW_DEV_LOGIN. It
 * is NOT an authentication path.
 *
 * Usage: visit /api/dev-login — it sets the cookie and redirects to /dashboard.
 */
export async function GET(request: Request) {
  const enabled = IS_DEMO_MODE || process.env.ALLOW_DEV_LOGIN === "true";
  if (!enabled) {
    return new NextResponse("Not found", { status: 404 });
  }

  const session = await getSession();
  session.userId = "dev-preview";
  session.email = "dev@nilevalley.co.ke";
  session.fullName = "Faith Njeri";
  session.roleKey = "admin";
  session.organizationId = "dev-org";
  await session.save();

  // Build the redirect from the request's Host header rather than the bind
  // host, so it works through a proxy (the dev server binds 0.0.0.0 and Next
  // would otherwise echo that back as the redirect target).
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  const host = request.headers.get("host") ?? "localhost:3100";
  return NextResponse.redirect(`${proto}://${host}/dashboard`);
}
