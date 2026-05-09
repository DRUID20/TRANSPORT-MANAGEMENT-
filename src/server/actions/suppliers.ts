"use server";

import { revalidatePath } from "next/cache";
import {
  createSupplier as storeCreate,
  getSupplier,
  listSuppliers as storeList,
  updateSupplier as storeUpdate,
} from "@/server/store/mock-store";
import { supplierCreateSchema, type SupplierCreateInput } from "@/lib/validators/fleet";

export async function listSuppliers() {
  return storeList();
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
  const created = storeCreate({
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
  revalidatePath("/suppliers");
  return { ok: true, id: created.id };
}

export async function updateSupplierAction(id: string, patch: Partial<SupplierCreateInput>) {
  storeUpdate(id, patch);
  revalidatePath("/suppliers");
  revalidatePath(`/suppliers/${id}`);
}
