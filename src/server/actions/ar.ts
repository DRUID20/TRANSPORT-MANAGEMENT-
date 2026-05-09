"use server";

import { revalidatePath } from "next/cache";
import {
  cancelInvoice as storeCancel,
  createInvoice as storeCreate,
  getCustomer,
  getInvoice,
  getTrip,
  invoicesForTrip as storeForTrip,
  listInvoices as storeList,
  recordCustomerPayment as storeRecordPayment,
  refreshInvoiceStatuses,
  sendInvoice as storeSend,
} from "@/server/store/mock-store";
import type { InvoiceStatus } from "@/lib/types/ar";
import {
  invoiceCreateSchema,
  paymentRecordSchema,
  type InvoiceCreateInput,
  type PaymentRecordInput,
} from "@/lib/validators/ar";

export async function listInvoices(filter?: { status?: InvoiceStatus; customerId?: string }) {
  refreshInvoiceStatuses();
  return storeList(filter);
}

export async function getInvoiceById(id: string) {
  refreshInvoiceStatuses();
  const inv = getInvoice(id);
  if (!inv) return undefined;
  const customer = getCustomer(inv.customerId);
  const trip = inv.tripId ? getTrip(inv.tripId) : undefined;
  return { ...inv, customer, trip };
}

export async function invoicesForTrip(tripId: string) {
  return storeForTrip(tripId);
}

export type ActionResult = { ok: true; id: string } | { ok: false; error: string };

export async function createInvoice(input: InvoiceCreateInput): Promise<ActionResult> {
  const parsed = invoiceCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const result = storeCreate(parsed.data);
  if ("error" in result) return { ok: false, error: result.error };
  revalidatePath("/invoices");
  if (parsed.data.tripId) revalidatePath(`/trips/${parsed.data.tripId}`);
  return { ok: true, id: result.id };
}

export async function sendInvoice(id: string): Promise<ActionResult> {
  const r = storeSend(id);
  if ("error" in r) return { ok: false, error: r.error };
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
  revalidatePath("/ledger");
  revalidatePath("/ledger/trial-balance");
  return { ok: true, id: r.id };
}

export async function cancelInvoice(id: string): Promise<ActionResult> {
  const r = storeCancel(id);
  if ("error" in r) return { ok: false, error: r.error };
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
  revalidatePath("/ledger");
  return { ok: true, id: r.id };
}

export async function recordPayment(input: PaymentRecordInput): Promise<ActionResult> {
  const parsed = paymentRecordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const result = storeRecordPayment(parsed.data);
  if ("error" in result) return { ok: false, error: result.error };
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${parsed.data.invoiceId}`);
  revalidatePath("/ledger");
  revalidatePath("/ledger/trial-balance");
  return { ok: true, id: result.id };
}
