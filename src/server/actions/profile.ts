"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { getDb } from "@/server/db/client";
import { users } from "@/server/db/schema";
import { getCurrentUser } from "@/server/auth/current-user";
import { requireOrgId } from "@/server/auth/current-org";
import { logAudit } from "@/server/auth/audit";
import { deleteFile, isKeyForOrg, uploadFile } from "@/server/storage/files";

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Change the signed-in user's password. They MUST supply their current
 * password — we re-verify it server-side and refuse if it doesn't match.
 * (Admin reset goes through resetUserPassword on /admin/users; that one
 * mails a fresh temp password and doesn't require the current one.)
 */
export async function changeMyPassword(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<ActionResult> {
  const me = await getCurrentUser();
  if (!me?.userId) return { ok: false, error: "Not signed in." };

  if (!input.currentPassword) return { ok: false, error: "Enter your current password." };
  if (!input.newPassword || input.newPassword.length < 8) {
    return { ok: false, error: "New password must be at least 8 characters." };
  }
  if (input.newPassword !== input.confirmPassword) {
    return { ok: false, error: "New password and confirmation don't match." };
  }
  if (input.newPassword === input.currentPassword) {
    return { ok: false, error: "Pick a new password — it can't match the current one." };
  }

  const db = getDb();
  const row = (await db.select().from(users).where(eq(users.id, me.userId)).limit(1))[0];
  if (!row || !row.passwordHash) {
    return { ok: false, error: "Account is not password-enabled. Contact your admin." };
  }
  const ok = await bcrypt.compare(input.currentPassword, row.passwordHash);
  if (!ok) return { ok: false, error: "Current password is incorrect." };

  const hash = await bcrypt.hash(input.newPassword, 10);
  await db
    .update(users)
    .set({ passwordHash: hash, failedLoginAttempts: 0, lockedUntil: null })
    .where(eq(users.id, me.userId));

  await logAudit({ entityType: "user", entityId: me.userId, action: "change_password" });
  revalidatePath("/settings");
  return { ok: true };
}

/**
 * Replace the signed-in user's avatar with a freshly-uploaded image. The
 * file is stored in the documents bucket under the `profile` namespace; we
 * persist only the storage key on `users.profile_photo_key` and best-effort
 * delete the previous photo so old uploads don't accumulate.
 */
export async function setMyProfilePhoto(form: FormData): Promise<ActionResult> {
  const me = await getCurrentUser();
  if (!me?.userId) return { ok: false, error: "Not signed in." };
  const orgId = await requireOrgId();

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Pick an image to upload." };
  }
  if (!file.type.startsWith("image/")) {
    return { ok: false, error: "Profile photo must be an image (JPG, PNG or WebP)." };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { ok: false, error: "Profile photo must be 5 MB or smaller." };
  }

  let uploaded;
  try {
    uploaded = await uploadFile({ orgId, namespace: "profile", file });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Upload failed." };
  }

  const db = getDb();
  const previous = (
    await db.select({ key: users.profilePhotoKey }).from(users).where(eq(users.id, me.userId)).limit(1)
  )[0]?.key;
  await db.update(users).set({ profilePhotoKey: uploaded.storageKey }).where(eq(users.id, me.userId));

  if (previous && previous !== uploaded.storageKey && isKeyForOrg(previous, orgId)) {
    deleteFile(previous).catch(() => {});
  }
  await logAudit({ entityType: "user", entityId: me.userId, action: "update_profile_photo" });
  revalidatePath("/settings");
  revalidatePath("/", "layout"); // sidebar avatar updates everywhere
  return { ok: true };
}

/** Remove the avatar entirely; falls back to initials. */
export async function clearMyProfilePhoto(): Promise<ActionResult> {
  const me = await getCurrentUser();
  if (!me?.userId) return { ok: false, error: "Not signed in." };
  const orgId = await requireOrgId();
  const db = getDb();
  const previous = (
    await db.select({ key: users.profilePhotoKey }).from(users).where(and(eq(users.id, me.userId))).limit(1)
  )[0]?.key;
  await db.update(users).set({ profilePhotoKey: null }).where(eq(users.id, me.userId));
  if (previous && isKeyForOrg(previous, orgId)) deleteFile(previous).catch(() => {});
  await logAudit({ entityType: "user", entityId: me.userId, action: "remove_profile_photo" });
  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Look up just the avatar key for the current user. */
export async function getMyProfilePhotoKey(): Promise<string | null> {
  const me = await getCurrentUser();
  if (!me?.userId) return null;
  const db = getDb();
  const row = (
    await db.select({ key: users.profilePhotoKey }).from(users).where(eq(users.id, me.userId)).limit(1)
  )[0];
  return row?.key ?? null;
}
