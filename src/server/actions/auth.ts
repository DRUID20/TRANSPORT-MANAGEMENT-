"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
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
    // Rate-limit: at most 3 active codes issued in the last 15 min per user,
    // so the endpoint can't be used to email-bomb someone. Silent (no leak).
    const since = new Date(Date.now() - 15 * 60_000);
    const recent = await db
      .select({ id: passwordResetOtps.id })
      .from(passwordResetOtps)
      .where(
        and(
          eq(passwordResetOtps.userId, user.id),
          gt(passwordResetOtps.createdAt, since),
        ),
      );

    if (recent.length < 3) {
      // Invalidate any still-pending codes — only one live code at a time.
      await db
        .update(passwordResetOtps)
        .set({ consumedAt: new Date() })
        .where(
          and(
            eq(passwordResetOtps.userId, user.id),
            isNull(passwordResetOtps.consumedAt),
          ),
        );

      // CSPRNG 6-digit code; hashed in the DB so a DB leak can't grant access.
      const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
      const codeHash = await bcrypt.hash(code, 10);
      const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

      await db.insert(passwordResetOtps).values({
        userId: user.id,
        codeHash,
        expiresAt: new Date(Date.now() + 15 * 60_000),
        requestedIp: ip,
      });

      // Email out-of-band — Resend lives in a separate module so a missing
      // RESEND_API_KEY can't take down the action.
      try {
        const { sendPasswordResetOtp } = await import("@/server/email/send-otp");
        await sendPasswordResetOtp({ to: user.email, fullName: user.fullName, code });
      } catch (err) {
        // Scrub: log only the error type/message — Resend errors can echo
        // back the recipient address or request body, which we don't want
        // in plain prod logs.
        const msg = err instanceof Error ? err.name + ": " + err.message : "unknown";
        console.error("[auth] OTP email failed:", msg);
        // Don't fail — the user already saw the generic "if it exists…" message.
      }
    }
  }

  return { ok: true };
}

/**
 * Verify a password-reset OTP and set a new password. Generic errors only
 * (never reveals whether the email or code was the problem). The code is
 * burned after 5 failed attempts to stop brute force; on success all of the
 * user's pending codes are consumed and any account lock is cleared.
 */
export async function verifyPasswordResetOtp(formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const code = String(formData.get("code") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!email || !code || !password) {
    return { ok: false, error: "All fields are required." };
  }
  if (!/^\d{6}$/.test(code)) {
    return { ok: false, error: "Enter the 6-digit code from your email." };
  }
  if (password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }
  if (password !== confirm) {
    return { ok: false, error: "Passwords do not match." };
  }

  const GENERIC = "That code is invalid or has expired. Request a new one.";
  const db = getDb();
  const found = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user = found[0];
  if (!user) return { ok: false, error: GENERIC };

  // Most recent live (unconsumed, unexpired) code for this user.
  const otpRows = await db
    .select()
    .from(passwordResetOtps)
    .where(
      and(
        eq(passwordResetOtps.userId, user.id),
        isNull(passwordResetOtps.consumedAt),
        gt(passwordResetOtps.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(passwordResetOtps.createdAt))
    .limit(1);
  const otp = otpRows[0];
  if (!otp) return { ok: false, error: GENERIC };

  // Brute-force guard — burn the code after too many wrong tries.
  if (otp.attempts >= 5) {
    await db
      .update(passwordResetOtps)
      .set({ consumedAt: new Date() })
      .where(eq(passwordResetOtps.id, otp.id));
    return { ok: false, error: GENERIC };
  }

  const codeOk = await bcrypt.compare(code, otp.codeHash);
  if (!codeOk) {
    const attempts = otp.attempts + 1;
    await db
      .update(passwordResetOtps)
      .set({
        attempts,
        consumedAt: attempts >= 5 ? new Date() : null,
      })
      .where(eq(passwordResetOtps.id, otp.id));
    return { ok: false, error: GENERIC };
  }

  // Success — set the new password, clear any lock, and burn ALL pending codes.
  const passwordHash = await bcrypt.hash(password, 10);
  await db
    .update(users)
    .set({ passwordHash, failedLoginAttempts: 0, lockedUntil: null })
    .where(eq(users.id, user.id));
  await db
    .update(passwordResetOtps)
    .set({ consumedAt: new Date() })
    .where(
      and(
        eq(passwordResetOtps.userId, user.id),
        isNull(passwordResetOtps.consumedAt),
      ),
    );

  return { ok: true };
}
