"use server";

import { revalidatePath } from "next/cache";
import {
  cancelInvoice as repoCancel,
  createInvoice as repoCreate,
  getInvoice,
  invoicesForTrip as repoForTrip,
  listInvoices as repoList,
  recordCustomerPayment as repoRecord,
  refreshInvoiceStatuses,
  sendInvoice as repoSend,
} from "@/server/repos/ar";
import { getCustomer } from "@/server/repos/customers";
import { getTrip } from "@/server/repos/trips";
import type { InvoiceStatus } from "@/lib/types/ar";
import {
  invoiceCreateSchema,
  paymentRecordSchema,
  type InvoiceCreateInput,
  type PaymentRecordInput,
} from "@/lib/validators/ar";

export async function listInvoices(filter?: { status?: InvoiceStatus; customerId?: string }) {
  await refreshInvoiceStatuses();
  return repoList(filter);
}

export async function getInvoiceById(id: string) {
  await refreshInvoiceStatuses();
  const inv = await getInvoice(id);
  if (!inv) return undefined;
  const [customer, trip] = await Promise.all([
    getCustomer(inv.customerId),
    inv.tripId ? getTrip(inv.tripId) : Promise.resolve(undefined),
  ]);
  return { ...inv, customer, trip };
}

export async function invoicesForTrip(tripId: string) {
  return repoForTrip(tripId);
}

export type ActionResult = { ok: true; id: string } | { ok: false; error: string };

export async function createInvoice(input: InvoiceCreateInput): Promise<ActionResult> {
  const parsed = invoiceCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const result = await repoCreate(parsed.data);
  if ("error" in result) return { ok: false, error: result.error };
  revalidatePath("/invoices");
  if (parsed.data.tripId) revalidatePath(`/trips/${parsed.data.tripId}`);
  return { ok: true, id: result.id };
}

export async function sendInvoice(id: string): Promise<ActionResult> {
  const r = await repoSend(id);
  if ("error" in r) return { ok: false, error: r.error };
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
  revalidatePath("/ledger");
  revalidatePath("/ledger/trial-balance");
  return { ok: true, id: r.id };
}

export async function cancelInvoice(id: string): Promise<ActionResult> {
  const r = await repoCancel(id);
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
  const result = await repoRecord(parsed.data);
  if ("error" in result) return { ok: false, error: result.error };
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${parsed.data.invoiceId}`);
  revalidatePath("/ledger");
  revalidatePath("/ledger/trial-balance");
  return { ok: true, id: result.id };
}
