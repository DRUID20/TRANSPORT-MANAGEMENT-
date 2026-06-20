"use server";

import { revalidatePath } from "next/cache";
import {
  advanceManagementPack as repoAdvance,
  createManagementPack as repoCreate,
  getManagementPack,
  listManagementPacks as repoList,
  updateManagementPackNarrative as repoUpdate,
} from "@/server/repos/management-pack";
import type { ManagementPackStatus } from "@/lib/types/management-pack";
import {
  packCreateSchema,
  packNarrativeSchema,
  type PackCreateInput,
  type PackNarrativeInput,
} from "@/lib/validators/management-pack";
import { CURRENT_USER_EMPLOYEE_ID } from "@/server/auth/current-user";
import { logAudit } from "@/server/auth/audit";

export async function listManagementPacks() {
  return repoList();
}
export async function getManagementPackById(id: string) {
  return getManagementPack(id);
}

export type ActionResult = { ok: true; id: string } | { ok: false; error: string };

export async function createManagementPack(input: PackCreateInput): Promise<ActionResult> {
  const parsed = packCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const r = await repoCreate(parsed.data.yearMonth);
  if ("error" in r) return { ok: false, error: r.error };
  await logAudit({ entityType: "management_pack", entityId: r.id, action: "create", diff: { period: { from: null, to: parsed.data.yearMonth } } });
  revalidatePath("/management-pack");
  return { ok: true, id: r.id };
}

export async function saveNarrative(input: PackNarrativeInput): Promise<ActionResult> {
  const parsed = packNarrativeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const r = await repoUpdate(parsed.data);
  if ("error" in r) return { ok: false, error: r.error };
  revalidatePath(`/management-pack/${parsed.data.id}`);
  return { ok: true, id: r.id };
}

export async function advancePack(id: string, to: ManagementPackStatus): Promise<ActionResult> {
  const r = await repoAdvance(id, to, CURRENT_USER_EMPLOYEE_ID);
  if ("error" in r) return { ok: false, error: r.error };
  await logAudit({ entityType: "management_pack", entityId: id, action: "status_change", diff: { status: { from: null, to } } });
  revalidatePath("/management-pack");
  revalidatePath(`/management-pack/${id}`);
  return { ok: true, id: r.id };
}
