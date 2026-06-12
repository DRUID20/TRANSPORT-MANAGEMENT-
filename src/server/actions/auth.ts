"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { users, passwordResetOtps } from "@/server/db/schema";
import { getSession } from "@/server/auth/session";
import { isValidRoleKey } from "@/lib/auth/roles";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Sign in with email + password. Sets the iron-session cookie on success;
 * tracks failed attempts and locks the account for 15 min after 5 in a row.
 *
 * On success: redirects to the returnTo path (or /dashboard). Throws
 * NEXT_REDIRECT internally so the caller must NOT wrap this in try/catch
 * that swallows redirects.
 */
export async function signIn(formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const returnTo = String(formData.get("returnTo") ?? "/dashboard");

  if (!email || !password) {
    return { ok: false, error: "Email and password are required." };
  }

  const db = getDb();
  const found = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user = found[0];

  // Always run a bcrypt compare even when the user doesn't exist — keeps
  // the timing equivalent so the response time can't leak which emails
  // are registered.
  const dummyHash = "$2a$10$abcdefghijklmnopqrstuv0Q1RsTUVwxYZabcdefghijklmnopqrs";
  const hashToCompare = user?.passwordHash ?? dummyHash;
  const passwordOk = await bcrypt.compare(password, hashToCompare);

  if (!user || !user.passwordHash || !passwordOk) {
    if (user) {
      // Track the failure, lock after 5
      const attempts = user.failedLoginAttempts + 1;
      await db
        .update(users)
        .set({
          failedLoginAttempts: attempts,
          lockedUntil: attempts >= 5 ? new Date(Date.now() + 15 * 60_000) : user.lockedUntil,
        })
        .where(eq(users.id, user.id));
    }
    return { ok: false, error: "Invalid email or password." };
  }

  if (!user.isActive) {
    return { ok: false, error: "This account has been deactivated. Contact your admin." };
  }

  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    const mins = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000);
    return {
      ok: false,
      error: `Account temporarily locked. Try again in ~${mins} minute${mins === 1 ? "" : "s"}.`,
    };
  }

  // Success — clear lockout, stamp login, populate session.
  await db
    .update(users)
    .set({
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    })
    .where(eq(users.id, user.id));

  const session = await getSession();
  session.userId = user.id;
  session.email = user.email;
  session.fullName = user.fullName;
  session.roleKey = isValidRoleKey(user.roleKey) ? user.roleKey : "viewer";
  session.organizationId = user.organizationId;
  await session.save();

  // Safe redirect target — must be a path on this app
  const safeReturnTo = returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/dashboard";
  redirect(safeReturnTo);
}

/** Sign out — destroys the session cookie and redirects to /login. */
export async function signOut() {
  const session = await getSession();
  session.destroy();
  redirect("/login");
}

/**
 * Request a password-reset OTP. Always returns ok=true regardless of
 * whether the email exists, to avoid leaking which emails are registered.
 */
export async function requestPasswordResetOtp(formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { ok: false, error: "Enter your email address." };

  const db = getDb();
  const found = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user = found[0];

  if (user) {
    // 6-digit code; hashed in the DB so even a DB leak can't grant access.
    const code = String(Math.floor(100_000 + Math.random() * 900_000));
    const codeHash = await bcrypt.hash(code, 10);
    const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

    await db.insert(passwordResetOtps).values({
      userId: user.id,
      codeHash,
      expiresAt: new Date(Date.now() + 15 * 60_000),
      requestedIp: ip,
    });

    // Email out-of-band — Resend integration lives in a separate module so
    // missing RESEND_API_KEY doesn't take down the action. Fire-and-forget.
    try {
      const { sendPasswordResetOtp } = await import("@/server/email/send-otp");
      await sendPasswordResetOtp({ to: user.email, fullName: user.fullName, code });
    } catch (err) {
      console.error("[auth] OTP email failed:", err);
      // We don't fail the action — user already saw "if your email exists…"
    }
  }

  return { ok: true };
}
