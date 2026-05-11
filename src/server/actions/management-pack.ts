"use server";

import { revalidatePath } from "next/cache";
import {
  advanceManagementPack as storeAdvance,
  createManagementPack as storeCreate,
  getManagementPack,
  listManagementPacks as storeList,
  updateManagementPackNarrative as storeUpdate,
} from "@/server/store/mock-store";
import type { ManagementPackStatus } from "@/lib/types/management-pack";
import {
  packCreateSchema,
  packNarrativeSchema,
  type PackCreateInput,
  type PackNarrativeInput,
} from "@/lib/validators/management-pack";
import { CURRENT_USER_EMPLOYEE_ID } from "@/server/auth/current-user";

export async function listManagementPacks() {
  return storeList();
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
  const r = storeCreate(parsed.data.yearMonth);
  if ("error" in r) return { ok: false, error: r.error };
  revalidatePath("/management-pack");
  return { ok: true, id: r.id };
}

export async function saveNarrative(input: PackNarrativeInput): Promise<ActionResult> {
  const parsed = packNarrativeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const r = storeUpdate(parsed.data);
  if ("error" in r) return { ok: false, error: r.error };
  revalidatePath(`/management-pack/${parsed.data.id}`);
  return { ok: true, id: r.id };
}

export async function advancePack(
  id: string,
  to: ManagementPackStatus,
): Promise<ActionResult> {
  const r = storeAdvance(id, to, CURRENT_USER_EMPLOYEE_ID);
  if ("error" in r) return { ok: false, error: r.error };
  revalidatePath(`/management-pack/${id}`);
  revalidatePath("/management-pack");
  return { ok: true, id: r.id };
}
