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
import { getEmployeeByDriverId } from "@/server/repos/hr";
import { createLoan, listLoans } from "@/server/repos/payroll";
import type { InvoiceStatus } from "@/lib/types/ar";
import type { Currency } from "@/lib/types/ledger";
import { ULLAGE_ALERT_THRESHOLD_PCT } from "@/lib/types/trips";
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
  if (parsed.data.tripId) {
    revalidatePath(`/trips/${parsed.data.tripId}`);
    // A short delivery (loaded vs delivered L20, beyond tolerance) is recovered
    // from the driver as a payroll deduction. Best-effort: never block the invoice.
    await recordDriverShortageIfAny(parsed.data.tripId).catch(() => {});
  }
  return { ok: true, id: result.id };
}

/**
 * If the linked trip delivered less than it loaded (at 20 °C) beyond the ullage
 * tolerance, raise a one-month-recovery loan against the driver's employee
 * record so the value of the short is deducted from their pay. Idempotent per
 * trip; silently skips if the driver isn't linked to an employee.
 */
async function recordDriverShortageIfAny(tripId: string): Promise<void> {
  const trip = await getTrip(tripId);
  if (!trip || !trip.driverId) return;
  const { loadedLitres20C: loaded, dischargedLitres20C: delivered } = trip;
  if (loaded === undefined || delivered === undefined) return;
  const shortL = loaded - delivered;
  if (shortL <= 0 || loaded <= 0) return;
  const shortPct = (shortL / loaded) * 100;
  if (shortPct <= ULLAGE_ALERT_THRESHOLD_PCT) return; // within tolerance — not the driver's fault

  const employee = await getEmployeeByDriverId(trip.driverId);
  if (!employee) return; // driver has no employee record to deduct from

  // Idempotent: don't raise a second shortage loan for the same trip.
  const existing = await listLoans({ employeeId: employee.id });
  if (existing.some((l) => l.reason?.includes(trip.number))) return;

  const ratePerLitre = trip.cargoQuantity > 0 ? trip.revenueAmount / trip.cargoQuantity : 0;
  const value = Math.round(shortL * ratePerLitre * 100) / 100;
  if (value <= 0) return;

  const currency: Currency = (["KES", "USD", "UGX"] as const).includes(
    trip.revenueCurrency as Currency,
  )
    ? (trip.revenueCurrency as Currency)
    : "KES";

  await createLoan({
    employeeId: employee.id,
    principal: value,
    currency,
    disbursedDate: new Date().toISOString().slice(0, 10),
    termMonths: 1,
    monthlyRecovery: value,
    interestRate: 0,
    reason: `Fuel shortage ${trip.number} — ${shortL.toFixed(0)}L @20°C`,
    notes: `Auto-raised on invoicing: delivered ${delivered.toFixed(0)}L vs loaded ${loaded.toFixed(0)}L (${shortPct.toFixed(2)}% short). Recovered from driver via payroll.`,
  });
  revalidatePath("/hr/loans");
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
