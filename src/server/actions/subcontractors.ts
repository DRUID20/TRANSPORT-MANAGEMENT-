"use server";

import { revalidatePath } from "next/cache";
import {
  createSubcontractor as storeCreate,
  getSubcontractor,
  listSubcontractors as storeList,
  trucksForSubcontractor,
  updateSubcontractor as storeUpdate,
} from "@/server/store/mock-store";
import {
  subcontractorCreateSchema,
  type SubcontractorCreateInput,
} from "@/lib/validators/fleet";

export async function listSubcontractors() {
  return storeList();
}

export async function getSubcontractorById(id: string) {
  const sub = getSubcontractor(id);
  if (!sub) return undefined;
  const trucks = trucksForSubcontractor(id);
  return { ...sub, trucks };
}

export type CreateSubcontractorResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function createSubcontractor(
  input: SubcontractorCreateInput,
): Promise<CreateSubcontractorResult> {
  const parsed = subcontractorCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const created = storeCreate({
    name: parsed.data.name,
    contactPerson: parsed.data.contactPerson,
    phone: parsed.data.phone,
    email: parsed.data.email || undefined,
    kraPin: parsed.data.kraPin || undefined,
    mpesaNumber: parsed.data.mpesaNumber || undefined,
    bankName: parsed.data.bankName || undefined,
    bankAccount: parsed.data.bankAccount || undefined,
    notes: parsed.data.notes || undefined,
  });
  revalidatePath("/subcontractors");
  return { ok: true, id: created.id };
}

export async function updateSubcontractorAction(
  id: string,
  patch: Partial<SubcontractorCreateInput>,
) {
  storeUpdate(id, patch);
  revalidatePath("/subcontractors");
  revalidatePath(`/subcontractors/${id}`);
}
