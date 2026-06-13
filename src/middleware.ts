import { NextResponse, type NextRequest } from "next/server";
import { unsealData } from "iron-session";
import type { SessionData } from "@/server/auth/session";

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

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  // API routes carry their own auth checks (TODO: once we add any).
  if (pathname.startsWith("/api")) return NextResponse.next();

  const secret = process.env.SESSION_SECRET;
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
    const url = new URL("/login", req.url);
    if (pathname !== "/") url.searchParams.set("returnTo", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match everything except static assets and the public files we explicitly want exposed.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2)$).*)",
  ],
};
