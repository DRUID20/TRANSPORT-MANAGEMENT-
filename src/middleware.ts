import { NextResponse, type NextRequest } from "next/server";
import { sealData, unsealData } from "iron-session";
import type { SessionData } from "@/server/auth/session";
import { resolveSessionPassword } from "@/server/auth/session-secret";
import { IDLE_TIMEOUT_MS } from "@/lib/auth/idle";

/**
 * Gate every page route behind a valid session. Unauthenticated requests
 * to app pages get bounced to /login with a returnTo query so they land
 * back where they meant to go after signing in.
 *
 * We read the cookie value directly from the request and verify it with
 * iron-session's `unsealData` — `getIronSession` is for route handlers
 * and server actions where it can both read and write the cookie. In
 * middleware all we need is read + verify.
 */

const PUBLIC_PATHS = [
  "/login",
  "/reset-password",
  "/forgot-password",
  "/_next",
  "/favicon.ico",
  "/manifest.webmanifest",
  "/robots.txt",
  "/sitemap.xml",
];

const SESSION_COOKIE = "tx_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days — matches session.ts

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}

function redirectToLogin(req: NextRequest, params?: Record<string, string>) {
  const url = new URL("/login", req.url);
  const { pathname } = req.nextUrl;
  if (pathname !== "/") url.searchParams.set("returnTo", pathname);
  for (const [k, v] of Object.entries(params ?? {})) url.searchParams.set(k, v);
  const res = NextResponse.redirect(url);
  // Clear the (now invalid) session cookie so the browser stops sending it.
  res.cookies.delete(SESSION_COOKIE);
  return res;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  // API routes carry their own auth checks (TODO: once we add any).
  if (pathname.startsWith("/api")) return NextResponse.next();

  const secret = resolveSessionPassword();
  if (!secret) {
    const url = new URL("/login?error=session_unconfigured", req.url);
    return NextResponse.redirect(url);
  }

  const cookieValue = req.cookies.get(SESSION_COOKIE)?.value;
  let session: SessionData | null = null;

  if (cookieValue) {
    try {
      session = await unsealData<SessionData>(cookieValue, { password: secret });
    } catch {
      // Cookie tampered, password rotated, or otherwise undecryptable.
      session = null;
    }
  }

  if (!session?.userId) {
    return redirectToLogin(req);
  }

  // ── Idle timeout (server-enforced sliding window) ──────────────────────
  // If the last recorded activity is older than the idle window, force a
  // sign-out. Otherwise stamp "now" and re-seal the cookie so the window
  // slides forward. A truly idle tab makes no requests, so its stamp goes
  // stale and the next request bounces it to /login?reason=idle. The client
  // idle watcher logs the user out proactively at the same threshold.
  const now = Date.now();
  const last = session.lastActivityAt ?? now; // legacy cookies: treat as fresh once
  if (now - last > IDLE_TIMEOUT_MS) {
    return redirectToLogin(req, { reason: "idle" });
  }

  const res = NextResponse.next();
  // Slide the window only on real GET navigations/data reads:
  //  - skip prefetches (background, not real activity)
  //  - skip non-GET (server actions set their own session cookie, e.g.
  //    signOut/signIn — a second Set-Cookie here would clobber them)
  const isPrefetch =
    req.headers.get("next-router-prefetch") === "1" ||
    req.headers.get("purpose") === "prefetch";
  if (req.method === "GET" && !isPrefetch) {
    const sealed = await sealData(
      { ...session, lastActivityAt: now },
      { password: secret, ttl: SESSION_MAX_AGE },
    );
    res.cookies.set(SESSION_COOKIE, sealed, cookieOptions());
  }
  return res;
}

export const config = {
  matcher: [
    // Match everything except static assets and the public files we explicitly want exposed.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2)$).*)",
  ],
};
