import { NextResponse, type NextRequest } from "next/server";
import { getIronSession } from "iron-session";
import type { SessionData } from "@/server/auth/session";

/**
 * Gate every page route behind a valid session. Unauthenticated requests
 * to app pages get bounced to /login with a returnTo query so they land
 * back where they meant to go after signing in.
 *
 * Public routes: /login, /api/health (if we add one), static assets.
 *
 * The middleware reads the same iron-session cookie the server actions
 * write — they share the same SESSION_SECRET via env.
 */

const PUBLIC_PATHS = [
  "/login",
  "/reset-password",
  "/forgot-password",
  "/_next",
  "/favicon.ico",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  // Don't gate API routes — they have their own auth checks (TODO once we add any).
  if (pathname.startsWith("/api")) return NextResponse.next();

  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    // No secret = misconfigured deploy. Send to login with an error so the
    // operator notices instead of seeing a blank page.
    const url = new URL("/login?error=session_unconfigured", req.url);
    return NextResponse.redirect(url);
  }

  const res = NextResponse.next();
  const session = await getIronSession<SessionData>(req.cookies as never, res.cookies as never, {
    password: secret,
    cookieName: "tx_session",
  });

  if (!session.userId) {
    const url = new URL("/login", req.url);
    if (pathname !== "/") url.searchParams.set("returnTo", pathname);
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: [
    // Match everything except static assets and the public files we explicitly want exposed.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2)$).*)",
  ],
};
