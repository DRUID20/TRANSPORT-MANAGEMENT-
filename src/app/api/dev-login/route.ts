import { NextResponse } from "next/server";
import { getSession } from "@/server/auth/session";

/**
 * DEV-ONLY login bypass.
 *
 * Creates a valid session without touching the database, so the app can be
 * browsed locally when the Postgres host is unreachable (e.g. inside a
 * sandbox with no outbound network). Every page reads from the in-memory
 * store, so a forged session is all that's needed to see the whole app.
 *
 * Hard-gated to non-production: in production this route 404s and can never
 * mint a session. It is NOT an authentication path — do not rely on it for
 * anything but local preview.
 *
 * Usage: visit /api/dev-login — it sets the cookie and redirects to /dashboard.
 */
export async function GET(request: Request) {
  // Two independent gates, both required:
  //  1. Never in production.
  //  2. Off by default even in dev — must be explicitly enabled with
  //     ALLOW_DEV_LOGIN=true so it can't become an accidental backdoor.
  if (
    process.env.NODE_ENV === "production" ||
    process.env.ALLOW_DEV_LOGIN !== "true"
  ) {
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
