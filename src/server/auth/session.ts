import { getIronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { IS_DEMO_MODE, resolveSessionPassword } from "@/server/auth/session-secret";

export { IS_DEMO_MODE };

/**
 * Session payload — kept tiny so the cookie stays under 4 KB after signing.
 * Full user record is re-fetched from DB on every request via getCurrentUser().
 */
export interface SessionData {
  userId?: string;
  email?: string;
  fullName?: string;
  roleKey?: string;
  organizationId?: string;
}

const SESSION_COOKIE = "tx_session";

function getOptions(): SessionOptions {
  const password = resolveSessionPassword();
  if (!password || password.length < 32) {
    throw new Error(
      "SESSION_SECRET must be set to a 32+ character random string. Run: node -e \"console.log(require('crypto').randomBytes(48).toString('base64'))\"",
    );
  }
  return {
    password,
    cookieName: SESSION_COOKIE,
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      // 7 days — short enough that revoking access by deactivating a user
      // takes effect within a week; long enough that operators aren't
      // re-authenticating every shift.
      maxAge: 60 * 60 * 24 * 7,
    },
  };
}

/** Read the signed session from the current request's cookies. */
export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, getOptions());
}
