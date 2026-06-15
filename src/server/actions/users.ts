"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { and, desc, eq, ne } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { users } from "@/server/db/schema";
import { requireOrgId } from "@/server/auth/current-org";
import { getCurrentUser } from "@/server/auth/current-user";
import { requireCapability, PermissionError } from "@/server/auth/permissions";
import { logAudit } from "@/server/auth/audit";
import { sendUserInvite } from "@/server/email/send-user-invite";
import { ROLES, isValidRoleKey, type RoleKey } from "@/lib/auth/roles";

export type ActionResult =
  | { ok: true; id: string; emailSent?: boolean; emailError?: string }
  | { ok: false; error: string };

export interface OrgUser {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  roleKey: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

/** All users in the signed-in admin's organisation (admin-only). */
export async function listOrgUsers(): Promise<OrgUser[]> {
  await requireCapability("admin");
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.organizationId, orgId))
    .orderBy(desc(users.createdAt));
  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    fullName: r.fullName,
    phone: r.phone ?? undefined,
    roleKey: r.roleKey,
    isActive: r.isActive,
    lastLoginAt: r.lastLoginAt?.toISOString(),
    createdAt: r.createdAt.toISOString(),
  }));
}

/** Generate a readable, reasonably strong temporary password. */
function generateTempPassword(): string {
  // 9 random bytes → 12 url-safe chars; strip ambiguous look-alikes.
  return randomBytes(9)
    .toString("base64url")
    .replace(/[-_]/g, "")
    .slice(0, 10)
    .concat(String(randomBytes(1)[0]! % 10)); // ensure at least one digit
}

async function loginUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}/login`;
}

/**
 * Create a user in the admin's organisation, assign a role, and email them a
 * sign-in link + temporary password. Admin-only + audited. The account is
 * created even if the email fails to send (we surface the email error so the
 * admin can resend); the temp password is never returned to the client.
 */
export async function createUser(input: {
  email: string;
  fullName: string;
  phone?: string;
  roleKey: string;
}): Promise<ActionResult> {
  try {
    await requireCapability("admin");
  } catch (e) {
    return { ok: false, error: e instanceof PermissionError ? e.message : "Forbidden" };
  }

  const email = input.email.trim().toLowerCase();
  const fullName = input.fullName.trim();
  const phone = input.phone?.trim() || undefined;
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, error: "A valid email address is required." };
  }
  if (!fullName) return { ok: false, error: "Full name is required." };
  if (!isValidRoleKey(input.roleKey)) {
    return { ok: false, error: "Pick a valid role." };
  }
  const roleKey: RoleKey = input.roleKey;

  const db = getDb();
  const orgId = await requireOrgId();

  // Email is the global sign-in key — must be unique across all orgs.
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing[0]) {
    return { ok: false, error: "A user with that email already exists." };
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);
  const inserted = (
    await db
      .insert(users)
      .values({ organizationId: orgId, email, fullName, phone, passwordHash, roleKey, isActive: true })
      .returning()
  )[0]!;

  await logAudit({
    entityType: "user",
    entityId: inserted.id,
    action: "create",
    diff: { email: { from: null, to: email }, roleKey: { from: null, to: roleKey } },
  });

  // Email the invite. Don't fail the whole operation if the email bounces —
  // the admin can resend a fresh password from the list.
  let emailSent = false;
  let emailError: string | undefined;
  try {
    const me = await getCurrentUser();
    await sendUserInvite({
      to: email,
      fullName,
      tempPassword,
      loginUrl: await loginUrl(),
      roleLabel: ROLES[roleKey].label,
      inviterName: me?.fullName,
    });
    emailSent = true;
  } catch (e) {
    emailError = e instanceof Error ? e.message : "Failed to send invite email.";
  }

  revalidatePath("/admin/users");
  return { ok: true, id: inserted.id, emailSent, emailError };
}

/** Change a user's role. Refuses to remove the last active admin. */
export async function setUserRole(input: { userId: string; roleKey: string }): Promise<ActionResult> {
  try {
    await requireCapability("admin");
  } catch (e) {
    return { ok: false, error: e instanceof PermissionError ? e.message : "Forbidden" };
  }
  if (!isValidRoleKey(input.roleKey)) return { ok: false, error: "Pick a valid role." };
  const roleKey: RoleKey = input.roleKey;
  const db = getDb();
  const orgId = await requireOrgId();
  const target = (
    await db.select().from(users).where(and(eq(users.id, input.userId), eq(users.organizationId, orgId))).limit(1)
  )[0];
  if (!target) return { ok: false, error: "User not found." };

  if (target.roleKey === "admin" && roleKey !== "admin") {
    const guard = await ensureNotLastAdmin(orgId, input.userId);
    if (guard) return guard;
  }

  await db.update(users).set({ roleKey }).where(eq(users.id, input.userId));
  await logAudit({
    entityType: "user",
    entityId: input.userId,
    action: "update",
    diff: { roleKey: { from: target.roleKey, to: roleKey } },
  });
  revalidatePath("/admin/users");
  return { ok: true, id: input.userId };
}

/** Activate / deactivate a user. Refuses to deactivate the last active admin. */
export async function setUserActive(input: { userId: string; isActive: boolean }): Promise<ActionResult> {
  try {
    await requireCapability("admin");
  } catch (e) {
    return { ok: false, error: e instanceof PermissionError ? e.message : "Forbidden" };
  }
  const db = getDb();
  const orgId = await requireOrgId();
  const target = (
    await db.select().from(users).where(and(eq(users.id, input.userId), eq(users.organizationId, orgId))).limit(1)
  )[0];
  if (!target) return { ok: false, error: "User not found." };

  if (!input.isActive && target.roleKey === "admin") {
    const guard = await ensureNotLastAdmin(orgId, input.userId);
    if (guard) return guard;
  }

  await db.update(users).set({ isActive: input.isActive }).where(eq(users.id, input.userId));
  await logAudit({
    entityType: "user",
    entityId: input.userId,
    action: input.isActive ? "activate" : "deactivate",
  });
  revalidatePath("/admin/users");
  return { ok: true, id: input.userId };
}

/** Reset a user's password to a fresh temp one and email it to them. */
export async function resetUserPassword(input: { userId: string }): Promise<ActionResult> {
  try {
    await requireCapability("admin");
  } catch (e) {
    return { ok: false, error: e instanceof PermissionError ? e.message : "Forbidden" };
  }
  const db = getDb();
  const orgId = await requireOrgId();
  const target = (
    await db.select().from(users).where(and(eq(users.id, input.userId), eq(users.organizationId, orgId))).limit(1)
  )[0];
  if (!target) return { ok: false, error: "User not found." };

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);
  await db
    .update(users)
    .set({ passwordHash, failedLoginAttempts: 0, lockedUntil: null })
    .where(eq(users.id, input.userId));
  await logAudit({ entityType: "user", entityId: input.userId, action: "reset_password" });

  let emailSent = false;
  let emailError: string | undefined;
  try {
    const me = await getCurrentUser();
    await sendUserInvite({
      to: target.email,
      fullName: target.fullName,
      tempPassword,
      loginUrl: await loginUrl(),
      roleLabel: isValidRoleKey(target.roleKey) ? ROLES[target.roleKey].label : target.roleKey,
      inviterName: me?.fullName,
    });
    emailSent = true;
  } catch (e) {
    emailError = e instanceof Error ? e.message : "Failed to send the email.";
  }

  revalidatePath("/admin/users");
  return { ok: true, id: input.userId, emailSent, emailError };
}

/** Returns an error result if `excludeUserId` is the last active admin. */
async function ensureNotLastAdmin(orgId: string, excludeUserId: string): Promise<{ ok: false; error: string } | null> {
  const db = getDb();
  const otherAdmins = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.organizationId, orgId),
        eq(users.roleKey, "admin"),
        eq(users.isActive, true),
        ne(users.id, excludeUserId),
      ),
    );
  if (otherAdmins.length === 0) {
    return { ok: false, error: "This is the last active admin — promote another admin first." };
  }
  return null;
}
