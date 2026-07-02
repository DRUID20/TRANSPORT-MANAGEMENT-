"use server";

import { revalidatePath } from "next/cache";
import {
  createSubcontractor as repoCreate,
  getSubcontractor,
  listSubcontractors as repoList,
  listSubcontractorPayments as repoListPayments,
  recordSubcontractorPayment as repoRecordPayment,
  subcontractorAccount as repoAccount,
  updateSubcontractor as repoUpdate,
} from "@/server/repos/subcontractors";
import { trucksForSubcontractor } from "@/server/repos/trucks";
import { logAudit, toDiff } from "@/server/auth/audit";
import { guard, requireCapability } from "@/server/auth/permissions";
import {
  subcontractorCreateSchema,
  type SubcontractorCreateInput,
} from "@/lib/validators/fleet";
import type { SubcontractorPaymentMethod } from "@/lib/types/fleet";

export async function listSubcontractors() {
  return repoList();
}

export async function getSubcontractorById(id: string) {
  const sub = await getSubcontractor(id);
  if (!sub) return undefined;
  const trucks = await trucksForSubcontractor(id);
  return { ...sub, trucks };
}

export type CreateSubcontractorResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function createSubcontractor(
  input: SubcontractorCreateInput,
): Promise<CreateSubcontractorResult> {
  const denied = await guard("fleet.write");
  if (denied) return denied;
  const parsed = subcontractorCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  try {
    const created = await repoCreate({
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
    await logAudit({ entityType: "subcontractor", entityId: created.id, action: "create", diff: { name: { from: null, to: created.name } } });
    revalidatePath("/subcontractors");
    return { ok: true, id: created.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to save subcontractor." };
  }
}

export async function updateSubcontractorAction(
  id: string,
  patch: Partial<SubcontractorCreateInput> & { commissionRate?: number },
) {
  await requireCapability("fleet.write");
  await repoUpdate(id, patch);
  await logAudit({ entityType: "subcontractor", entityId: id, action: "update", diff: toDiff(patch) });
  revalidatePath("/subcontractors");
  revalidatePath(`/subcontractors/${id}`);
}

export async function getSubcontractorAccount(
  id: string,
  range?: { fromDate?: string; toDate?: string },
) {
  return repoAccount(id, range);
}

export async function listSubcontractorPaymentsAction(id: string) {
  return repoListPayments(id);
}

export type RecordPaymentResult = { ok: true; id: string } | { ok: false; error: string };

export async function recordSubcontractorPayment(input: {
  subcontractorId: string;
  date: string;
  amountKes: number;
  method: SubcontractorPaymentMethod;
  supplierId?: string;
  reference?: string;
  notes?: string;
}): Promise<RecordPaymentResult> {
  const denied = await guard("finance.post");
  if (denied) return denied;
  if (!input.subcontractorId) return { ok: false, error: "Subcontractor is required." };
  const r = await repoRecordPayment(input);
  if ("error" in r) return { ok: false, error: r.error };
  await logAudit({
    entityType: "subcontractor_payment",
    entityId: r.id,
    action: "create",
    diff: { amountKes: { from: null, to: input.amountKes }, method: { from: null, to: input.method } },
  });
  revalidatePath(`/subcontractors/${input.subcontractorId}`);
  if (input.method === "supplier_direct") revalidatePath("/bills");
  return { ok: true, id: r.id };
}
