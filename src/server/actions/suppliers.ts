"use server";

import { revalidatePath } from "next/cache";
import {
  createSupplier as repoCreate,
  getSupplier,
  listSuppliers as repoList,
  updateSupplier as repoUpdate,
} from "@/server/repos/suppliers";
import { logAudit, toDiff } from "@/server/auth/audit";
import { supplierCreateSchema, type SupplierCreateInput } from "@/lib/validators/fleet";

export async function listSuppliers() {
  return repoList();
}
export async function getSupplierById(id: string) {
  return getSupplier(id);
}

export type CreateSupplierResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function createSupplier(input: SupplierCreateInput): Promise<CreateSupplierResult> {
  const parsed = supplierCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const data = parsed.data;
  try {
    const created = await repoCreate({
      name: data.name,
      contactPerson: data.contactPerson || undefined,
      phone: data.phone,
      email: data.email || undefined,
      kraPin: data.kraPin || undefined,
      paymentTerms: data.paymentTerms,
      defaultPaymentMethod: data.defaultPaymentMethod,
      mpesaNumber: data.mpesaNumber || undefined,
      bankName: data.bankName || undefined,
      bankAccount: data.bankAccount || undefined,
      defaultExpenseCategory: data.defaultExpenseCategory || undefined,
      notes: data.notes || undefined,
    });
    await logAudit({ entityType: "supplier", entityId: created.id, action: "create", diff: { name: { from: null, to: created.name } } });
    revalidatePath("/suppliers");
    return { ok: true, id: created.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to save supplier." };
  }
}

export async function updateSupplierAction(id: string, patch: Partial<SupplierCreateInput>) {
  await repoUpdate(id, patch);
  await logAudit({ entityType: "supplier", entityId: id, action: "update", diff: toDiff(patch) });
  revalidatePath("/suppliers");
  revalidatePath(`/suppliers/${id}`);
}
