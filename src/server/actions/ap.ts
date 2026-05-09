"use server";

import { revalidatePath } from "next/cache";
import {
  cancelBill as storeCancel,
  createBill as storeCreate,
  getBill,
  getSupplier,
  listBills as storeList,
  paySupplierBill as storePay,
  postBill as storePost,
  refreshBillStatuses,
} from "@/server/store/mock-store";
import type { BillStatus } from "@/lib/types/ap";
import {
  billCreateSchema,
  billPaymentSchema,
  type BillCreateInput,
  type BillPaymentInput,
} from "@/lib/validators/ap";

export async function listBills(filter?: { status?: BillStatus; supplierId?: string }) {
  refreshBillStatuses();
  return storeList(filter);
}

export async function getBillById(id: string) {
  refreshBillStatuses();
  const b = getBill(id);
  if (!b) return undefined;
  const supplier = getSupplier(b.supplierId);
  return { ...b, supplier };
}

export type ActionResult = { ok: true; id: string } | { ok: false; error: string };

export async function createBill(input: BillCreateInput): Promise<ActionResult> {
  const parsed = billCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const result = storeCreate(parsed.data);
  if ("error" in result) return { ok: false, error: result.error };
  revalidatePath("/bills");
  return { ok: true, id: result.id };
}

export async function postBill(id: string): Promise<ActionResult> {
  const r = storePost(id);
  if ("error" in r) return { ok: false, error: r.error };
  revalidatePath("/bills");
  revalidatePath(`/bills/${id}`);
  revalidatePath("/ledger");
  revalidatePath("/ledger/trial-balance");
  return { ok: true, id: r.id };
}

export async function cancelBill(id: string): Promise<ActionResult> {
  const r = storeCancel(id);
  if ("error" in r) return { ok: false, error: r.error };
  revalidatePath("/bills");
  revalidatePath(`/bills/${id}`);
  revalidatePath("/ledger");
  return { ok: true, id: r.id };
}

export async function payBill(input: BillPaymentInput): Promise<ActionResult> {
  const parsed = billPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const result = storePay(parsed.data);
  if ("error" in result) return { ok: false, error: result.error };
  revalidatePath("/bills");
  revalidatePath(`/bills/${parsed.data.billId}`);
  revalidatePath("/ledger");
  revalidatePath("/ledger/trial-balance");
  return { ok: true, id: result.id };
}
