"use server";

import { revalidatePath } from "next/cache";
import {
  cancelBill as repoCancel,
  createBill as repoCreate,
  getBill,
  listBills as repoList,
  paySupplierBill as repoPay,
  postBill as repoPost,
  refreshBillStatuses,
} from "@/server/repos/ap";
import { getSupplier } from "@/server/repos/suppliers";
import { logAudit } from "@/server/auth/audit";
import { PermissionError, requireCapability } from "@/server/auth/permissions";
import type { BillStatus } from "@/lib/types/ap";
import {
  billCreateSchema,
  billPaymentSchema,
  type BillCreateInput,
  type BillPaymentInput,
} from "@/lib/validators/ap";

export async function listBills(filter?: { status?: BillStatus; supplierId?: string }) {
  await refreshBillStatuses();
  return repoList(filter);
}

export async function getBillById(id: string) {
  await refreshBillStatuses();
  const b = await getBill(id);
  if (!b) return undefined;
  const supplier = await getSupplier(b.supplierId);
  return { ...b, supplier };
}

export type ActionResult = { ok: true; id: string } | { ok: false; error: string };

export async function createBill(input: BillCreateInput): Promise<ActionResult> {
  try {
    await requireCapability("finance.post");
  } catch (e) {
    return { ok: false, error: e instanceof PermissionError ? e.message : "Forbidden" };
  }
  const parsed = billCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const result = await repoCreate(parsed.data);
  if ("error" in result) return { ok: false, error: result.error };
  revalidatePath("/bills");
  return { ok: true, id: result.id };
}

export async function postBill(id: string): Promise<ActionResult> {
  try {
    await requireCapability("finance.post");
  } catch (e) {
    return { ok: false, error: e instanceof PermissionError ? e.message : "Forbidden" };
  }
  const r = await repoPost(id);
  if ("error" in r) return { ok: false, error: r.error };
  await logAudit({ entityType: "bill", entityId: id, action: "send" });
  revalidatePath("/bills");
  revalidatePath(`/bills/${id}`);
  revalidatePath("/ledger");
  revalidatePath("/ledger/trial-balance");
  return { ok: true, id: r.id };
}

export async function cancelBill(id: string): Promise<ActionResult> {
  try {
    await requireCapability("finance.post");
  } catch (e) {
    return { ok: false, error: e instanceof PermissionError ? e.message : "Forbidden" };
  }
  const r = await repoCancel(id);
  if ("error" in r) return { ok: false, error: r.error };
  await logAudit({ entityType: "bill", entityId: id, action: "cancel" });
  revalidatePath("/bills");
  revalidatePath(`/bills/${id}`);
  revalidatePath("/ledger");
  return { ok: true, id: r.id };
}

export async function payBill(input: BillPaymentInput): Promise<ActionResult> {
  try {
    await requireCapability("finance.post");
  } catch (e) {
    return { ok: false, error: e instanceof PermissionError ? e.message : "Forbidden" };
  }
  const parsed = billPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const result = await repoPay(parsed.data);
  if ("error" in result) return { ok: false, error: result.error };
  await logAudit({
    entityType: "supplier_payment",
    entityId: result.id,
    action: "create",
    diff: { billId: { from: null, to: parsed.data.billId }, amount: { from: null, to: parsed.data.amount } },
  });
  revalidatePath("/bills");
  revalidatePath(`/bills/${parsed.data.billId}`);
  revalidatePath("/ledger");
  revalidatePath("/ledger/trial-balance");
  return { ok: true, id: result.id };
}
