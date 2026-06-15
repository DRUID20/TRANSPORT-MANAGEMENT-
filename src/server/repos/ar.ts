/**
 * Accounts Receivable repo — dual-mode (Postgres / mock store). Org-scoped.
 *
 * Invoice lifecycle is faithful to the store:
 *   draft → sent (auto-posts AR debit / Revenue + VAT credit to the GL)
 *         → partially_paid / paid (via recordPayment, posts Bank Dr / AR Cr)
 *         → overdue (computed from due_date)
 *         → cancelled (reverses the GL entry if posted)
 * Invoice statuses (paid / overdue) are refreshed lazily on list/get.
 *
 * Writes go through a transaction so the entry, lines, and ledger posting are
 * either all committed or all rolled back.
 */
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { IS_DEMO_MODE } from "@/server/auth/session-secret";
import { requireOrgId } from "@/server/auth/current-org";
import { getDb } from "@/server/db/client";
import {
  customerInvoices as invoicesTable,
  customerPayments as paymentsTable,
  invoiceLineItems as linesTable,
} from "@/server/db/schema";
import { nextDocumentNumber } from "@/server/repos/counters";
import { getAccountByCode } from "@/server/repos/accounts";
import { postJournalEntry, reverseJournalEntry } from "@/server/repos/ledger";
import { getCustomer } from "@/server/repos/customers";
import {
  cancelInvoice as storeCancel,
  createInvoice as storeCreate,
  getInvoice as storeGet,
  invoicesForTrip as storeForTrip,
  listInvoices as storeList,
  recordCustomerPayment as storeRecord,
  refreshInvoiceStatuses as storeRefresh,
  sendInvoice as storeSend,
} from "@/server/store/mock-store";
import type {
  CustomerInvoice,
  CustomerPayment,
  InvoiceLineItem,
  InvoiceStatus,
  InvoiceWithLines,
  PaymentMethod as ARPaymentMethod,
} from "@/lib/types/ar";
import type { Currency } from "@/lib/types/ledger";

type IRow = typeof invoicesTable.$inferSelect;
type LRow = typeof linesTable.$inferSelect;
type PRow = typeof paymentsTable.$inferSelect;

function toInvoice(r: IRow): CustomerInvoice {
  return {
    id: r.id,
    number: r.number,
    customerId: r.customerId,
    tripId: r.tripId ?? undefined,
    issueDate: r.issueDate,
    dueDate: r.dueDate,
    currency: r.currency as Currency,
    fxRate: Number(r.fxRate),
    subtotal: Number(r.subtotal),
    taxRate: Number(r.taxRate),
    taxAmount: Number(r.taxAmount),
    total: Number(r.total),
    paidAmount: Number(r.paidAmount),
    balance: Number(r.balance),
    status: r.status as InvoiceStatus,
    notes: r.notes ?? undefined,
    journalEntryId: r.journalEntryId ?? undefined,
    createdAt: r.createdAt.toISOString(),
  };
}

function toLine(r: LRow): InvoiceLineItem {
  return {
    id: r.id,
    invoiceId: r.invoiceId,
    description: r.description,
    quantity: Number(r.quantity),
    unit: r.unit ?? undefined,
    unitPrice: Number(r.unitPrice),
    lineTotal: Number(r.lineTotal),
    revenueAccountCode: r.revenueAccountCode ?? undefined,
  };
}

function toPayment(r: PRow): CustomerPayment {
  return {
    id: r.id,
    number: r.number,
    invoiceId: r.invoiceId,
    customerId: r.customerId,
    date: r.date,
    amount: Number(r.amount),
    currency: r.currency as Currency,
    fxRate: Number(r.fxRate),
    paymentMethod: r.paymentMethod as ARPaymentMethod,
    reference: r.reference ?? undefined,
    journalEntryId: r.journalEntryId ?? undefined,
    notes: r.notes ?? undefined,
    createdAt: r.createdAt.toISOString(),
  };
}

async function recompute(invoiceId: string, orgId: string): Promise<CustomerInvoice | undefined> {
  const db = getDb();
  const inv = (
    await db
      .select()
      .from(invoicesTable)
      .where(and(eq(invoicesTable.id, invoiceId), eq(invoicesTable.organizationId, orgId)))
      .limit(1)
  )[0];
  if (!inv) return undefined;
  const payments = await db
    .select({ amount: paymentsTable.amount })
    .from(paymentsTable)
    .where(eq(paymentsTable.invoiceId, invoiceId));
  const paid = payments.reduce((s, p) => s + Number(p.amount), 0);
  const total = Number(inv.total);
  const balance = Math.max(0, total - paid);
  let status = inv.status as InvoiceStatus;
  if (status !== "cancelled" && status !== "draft") {
    if (balance < 0.01) status = "paid";
    else if (paid > 0) status = "partially_paid";
    else {
      const dueOverdue = new Date(inv.dueDate).getTime() < Date.now();
      status = dueOverdue ? "overdue" : "sent";
    }
  }
  const updated = (
    await db
      .update(invoicesTable)
      .set({ paidAmount: String(paid), balance: String(balance), status })
      .where(eq(invoicesTable.id, invoiceId))
      .returning()
  )[0];
  return updated ? toInvoice(updated) : undefined;
}

export async function refreshInvoiceStatuses(): Promise<void> {
  if (IS_DEMO_MODE) {
    storeRefresh();
    return;
  }
  const orgId = await requireOrgId();
  const db = getDb();
  // Read-path refresh: this runs on every list/get (dashboard, invoices, trip
  // cards). Do it in TWO queries — pull the open invoices + a single grouped
  // sum of their payments — then write back ONLY the rows whose status/balance
  // actually changed, instead of a SELECT+UPDATE per invoice. Same result,
  // a fraction of the round-trips.
  const open = await db
    .select({
      id: invoicesTable.id,
      total: invoicesTable.total,
      dueDate: invoicesTable.dueDate,
      status: invoicesTable.status,
      paidAmount: invoicesTable.paidAmount,
      balance: invoicesTable.balance,
    })
    .from(invoicesTable)
    .where(
      and(
        eq(invoicesTable.organizationId, orgId),
        inArray(invoicesTable.status, ["sent", "partially_paid", "overdue"]),
      ),
    );
  if (open.length === 0) return;

  const ids = open.map((i) => i.id);
  const paidRows = await db
    .select({
      invoiceId: paymentsTable.invoiceId,
      paid: sql<string>`coalesce(sum(${paymentsTable.amount}), 0)`,
    })
    .from(paymentsTable)
    .where(inArray(paymentsTable.invoiceId, ids))
    .groupBy(paymentsTable.invoiceId);
  const paidById = new Map(paidRows.map((r) => [r.invoiceId, Number(r.paid)]));

  const now = Date.now();
  for (const inv of open) {
    const paid = paidById.get(inv.id) ?? 0;
    const total = Number(inv.total);
    const balance = Math.max(0, total - paid);
    let status = inv.status as InvoiceStatus;
    if (balance < 0.01) status = "paid";
    else if (paid > 0) status = "partially_paid";
    else status = new Date(inv.dueDate).getTime() < now ? "overdue" : "sent";

    const changed =
      status !== inv.status ||
      Math.abs(Number(inv.paidAmount) - paid) > 0.005 ||
      Math.abs(Number(inv.balance) - balance) > 0.005;
    if (!changed) continue;
    await db
      .update(invoicesTable)
      .set({ paidAmount: String(paid), balance: String(balance), status })
      .where(eq(invoicesTable.id, inv.id));
  }
}

export async function listInvoices(filter?: {
  status?: InvoiceStatus;
  customerId?: string;
}): Promise<CustomerInvoice[]> {
  if (IS_DEMO_MODE) return storeList(filter);
  const db = getDb();
  const orgId = await requireOrgId();
  await refreshInvoiceStatuses();
  const where = [eq(invoicesTable.organizationId, orgId)];
  if (filter?.status) where.push(eq(invoicesTable.status, filter.status));
  if (filter?.customerId) where.push(eq(invoicesTable.customerId, filter.customerId));
  const rows = await db.select().from(invoicesTable).where(and(...where)).orderBy(desc(invoicesTable.issueDate));
  return rows.map(toInvoice);
}

export async function getInvoice(id: string): Promise<InvoiceWithLines | undefined> {
  if (IS_DEMO_MODE) return storeGet(id);
  const db = getDb();
  const orgId = await requireOrgId();
  await refreshInvoiceStatuses();
  const inv = (
    await db
      .select()
      .from(invoicesTable)
      .where(and(eq(invoicesTable.id, id), eq(invoicesTable.organizationId, orgId)))
      .limit(1)
  )[0];
  if (!inv) return undefined;
  const [lines, payments] = await Promise.all([
    db.select().from(linesTable).where(eq(linesTable.invoiceId, id)).orderBy(asc(linesTable.id)),
    db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.invoiceId, id))
      .orderBy(desc(paymentsTable.date)),
  ]);
  return { ...toInvoice(inv), lines: lines.map(toLine), payments: payments.map(toPayment) };
}

export async function invoicesForTrip(tripId: string): Promise<CustomerInvoice[]> {
  if (IS_DEMO_MODE) return storeForTrip(tripId);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .select()
    .from(invoicesTable)
    .where(and(eq(invoicesTable.tripId, tripId), eq(invoicesTable.organizationId, orgId)));
  return rows.map(toInvoice);
}

export async function createInvoice(input: {
  customerId: string;
  tripId?: string;
  issueDate: string;
  dueDate: string;
  currency: Currency;
  fxRate: number;
  taxRate: number;
  notes?: string;
  lines: Array<{
    description: string;
    quantity: number;
    unit?: string;
    unitPrice: number;
    revenueAccountCode?: string;
  }>;
}): Promise<CustomerInvoice | { error: string }> {
  if (IS_DEMO_MODE) return storeCreate(input);
  if (input.lines.length === 0) return { error: "At least one line item required" };
  const customer = await getCustomer(input.customerId);
  if (!customer) return { error: "Customer not found" };

  // One invoice per trip. Reject a second non-cancelled invoice on the same
  // trip — the freight bill is the delivered L20, period.
  if (input.tripId) {
    const existing = await invoicesForTrip(input.tripId);
    const live = existing.find((i) => i.status !== "cancelled");
    if (live) {
      return {
        error: `Trip already has invoice ${live.number} (${live.status}). Cancel it before raising another.`,
      };
    }
  }

  const subtotal = input.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const taxAmount = subtotal * input.taxRate;
  const total = subtotal + taxAmount;
  const orgId = await requireOrgId();
  const number = await nextDocumentNumber(orgId, "INV", "invoice", 5);
  const db = getDb();
  const inv = await db.transaction(async (tx) => {
    const e = (
      await tx
        .insert(invoicesTable)
        .values({
          organizationId: orgId,
          number,
          customerId: input.customerId,
          tripId: input.tripId ?? null,
          issueDate: input.issueDate,
          dueDate: input.dueDate,
          currency: input.currency,
          fxRate: String(input.fxRate),
          subtotal: String(subtotal),
          taxRate: String(input.taxRate),
          taxAmount: String(taxAmount),
          total: String(total),
          paidAmount: "0",
          balance: String(total),
          status: "draft",
          notes: input.notes ?? null,
        })
        .returning()
    )[0]!;
    for (const l of input.lines) {
      await tx.insert(linesTable).values({
        invoiceId: e.id,
        description: l.description,
        quantity: String(l.quantity),
        unit: l.unit ?? null,
        unitPrice: String(l.unitPrice),
        lineTotal: String(l.quantity * l.unitPrice),
        revenueAccountCode: l.revenueAccountCode ?? null,
      });
    }
    return e;
  });
  return toInvoice(inv);
}

export async function sendInvoice(invoiceId: string): Promise<CustomerInvoice | { error: string }> {
  if (IS_DEMO_MODE) return storeSend(invoiceId);
  const inv = await getInvoice(invoiceId);
  if (!inv) return { error: "Invoice not found" };
  if (inv.status !== "draft") return { error: `Already ${inv.status}` };
  const customer = await getCustomer(inv.customerId);

  const arCode = inv.currency === "USD" || customer?.billingCurrency === "USD" ? "111200" : "111100";
  const arAcc = await getAccountByCode(arCode);
  const isExport = inv.currency !== "KES";
  const revenueCode = inv.lines[0]?.revenueAccountCode ?? (isExport ? "400200" : "400100");
  const revenueAcc = await getAccountByCode(revenueCode);
  if (!arAcc || !revenueAcc) return { error: "Required accounts (AR / Revenue) not found in CoA" };

  const lines: Array<{ accountId: string; debit: number; credit: number; currency: Currency; fxRate: number; description?: string }> = [
    { accountId: arAcc.id, debit: inv.total, credit: 0, currency: inv.currency, fxRate: inv.fxRate, description: `${inv.number} — ${customer?.name ?? "Customer"}` },
    { accountId: revenueAcc.id, debit: 0, credit: inv.subtotal, currency: inv.currency, fxRate: inv.fxRate, description: `${inv.number} — freight revenue` },
  ];
  if (inv.taxAmount > 0) {
    const vatAcc = await getAccountByCode("220700");
    if (vatAcc) {
      lines.push({ accountId: vatAcc.id, debit: 0, credit: inv.taxAmount, currency: inv.currency, fxRate: inv.fxRate, description: `${inv.number} — output VAT` });
    }
  }
  const result = await postJournalEntry({
    date: inv.issueDate,
    memo: `Invoice ${inv.number} — ${customer?.name ?? "Customer"}`,
    referenceType: "invoice",
    referenceId: inv.id,
    postedBy: "Finance",
    lines,
  });
  if ("error" in result) return result;

  const db = getDb();
  const orgId = await requireOrgId();
  const updated = (
    await db
      .update(invoicesTable)
      .set({ status: "sent", journalEntryId: result.id })
      .where(and(eq(invoicesTable.id, invoiceId), eq(invoicesTable.organizationId, orgId)))
      .returning()
  )[0]!;
  return toInvoice(updated);
}

export async function cancelInvoice(invoiceId: string): Promise<CustomerInvoice | { error: string }> {
  if (IS_DEMO_MODE) return storeCancel(invoiceId);
  const inv = await getInvoice(invoiceId);
  if (!inv) return { error: "Invoice not found" };
  if (inv.status === "paid") return { error: "Cannot cancel a paid invoice" };
  if (inv.journalEntryId) await reverseJournalEntry({ entryId: inv.journalEntryId, postedBy: "Finance" });
  const db = getDb();
  const orgId = await requireOrgId();
  const updated = (
    await db
      .update(invoicesTable)
      .set({ status: "cancelled" })
      .where(and(eq(invoicesTable.id, invoiceId), eq(invoicesTable.organizationId, orgId)))
      .returning()
  )[0]!;
  return toInvoice(updated);
}

export async function recordCustomerPayment(input: {
  invoiceId: string;
  date: string;
  amount: number;
  currency: Currency;
  fxRate: number;
  paymentMethod: ARPaymentMethod;
  reference?: string;
  notes?: string;
}): Promise<CustomerPayment | { error: string }> {
  if (IS_DEMO_MODE) return storeRecord(input);
  const inv = await getInvoice(input.invoiceId);
  if (!inv) return { error: "Invoice not found" };
  if (inv.status === "draft") return { error: "Send the invoice first" };
  if (inv.status === "cancelled") return { error: "Invoice is cancelled" };

  const customer = await getCustomer(inv.customerId);
  const arCode = inv.currency === "USD" || customer?.billingCurrency === "USD" ? "111200" : "111100";
  const arAcc = await getAccountByCode(arCode);
  let bankCode: string;
  if (input.paymentMethod === "mpesa") bankCode = "129100";
  else if (input.paymentMethod === "mobile_money_ugx") bankCode = "129200";
  else if (input.paymentMethod === "cash") bankCode = "120100";
  else if (input.currency === "USD") bankCode = "122100";
  else if (input.currency === "UGX") bankCode = "123100";
  else bankCode = "121100";
  const bankAcc = await getAccountByCode(bankCode);
  if (!arAcc || !bankAcc) return { error: "Required accounts (AR / Bank) not found" };

  const orgId = await requireOrgId();
  const number = await nextDocumentNumber(orgId, "RCT", "receipt", 5);
  const db = getDb();
  const payRow = (
    await db
      .insert(paymentsTable)
      .values({
        organizationId: orgId,
        number,
        invoiceId: inv.id,
        customerId: inv.customerId,
        date: input.date,
        amount: String(input.amount),
        currency: input.currency,
        fxRate: String(input.fxRate),
        paymentMethod: input.paymentMethod,
        reference: input.reference ?? null,
        notes: input.notes ?? null,
      })
      .returning()
  )[0]!;

  const result = await postJournalEntry({
    date: input.date,
    memo: `Receipt ${payRow.number} — ${customer?.name ?? "Customer"} for ${inv.number}`,
    referenceType: "payment",
    referenceId: payRow.id,
    postedBy: "Finance",
    lines: [
      { accountId: bankAcc.id, debit: input.amount, credit: 0, currency: input.currency, fxRate: input.fxRate, description: `${payRow.number} — receipt` },
      { accountId: arAcc.id, debit: 0, credit: input.amount, currency: input.currency, fxRate: input.fxRate, description: `${payRow.number} — applies to ${inv.number}` },
    ],
  });
  if ("error" in result) {
    await db.delete(paymentsTable).where(eq(paymentsTable.id, payRow.id));
    return result;
  }
  const updatedPay = (
    await db
      .update(paymentsTable)
      .set({ journalEntryId: result.id })
      .where(eq(paymentsTable.id, payRow.id))
      .returning()
  )[0]!;
  await recompute(inv.id, orgId);
  return toPayment(updatedPay);
}
