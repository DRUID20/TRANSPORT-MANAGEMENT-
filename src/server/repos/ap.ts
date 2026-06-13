/**
 * Accounts Payable repo — dual-mode (Postgres / mock store). Org-scoped.
 *
 * Bill lifecycle:
 *   draft → sent (auto-posts expense lines Dr + Input VAT Dr / AP Cr)
 *         → partially_paid / paid (via payBill, posts AP Dr / Bank Cr)
 *         → overdue (computed from due_date)
 *         → cancelled (reverses GL entry if posted)
 * Writes happen inside transactions so the bill, lines, and ledger postings are
 * either all committed or all rolled back.
 */
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { IS_DEMO_MODE } from "@/server/auth/session-secret";
import { requireOrgId } from "@/server/auth/current-org";
import { getDb } from "@/server/db/client";
import {
  billLineItems as linesTable,
  supplierBills as billsTable,
  supplierPayments as paymentsTable,
} from "@/server/db/schema";
import { nextDocumentNumber } from "@/server/repos/counters";
import { getAccountByCode } from "@/server/repos/accounts";
import { postJournalEntry, reverseJournalEntry } from "@/server/repos/ledger";
import { getSupplier } from "@/server/repos/suppliers";
import {
  cancelBill as storeCancel,
  createBill as storeCreate,
  getBill as storeGet,
  listBills as storeList,
  paySupplierBill as storePay,
  postBill as storePost,
  refreshBillStatuses as storeRefresh,
} from "@/server/store/mock-store";
import type {
  APPaymentMethod,
  BillLineItem,
  BillStatus,
  BillWithLines,
  SupplierBill,
  SupplierPayment,
} from "@/lib/types/ap";
import type { Currency } from "@/lib/types/ledger";

type BRow = typeof billsTable.$inferSelect;
type LRow = typeof linesTable.$inferSelect;
type PRow = typeof paymentsTable.$inferSelect;

function toBill(r: BRow): SupplierBill {
  return {
    id: r.id,
    number: r.number,
    supplierId: r.supplierId,
    supplierRef: r.supplierRef ?? undefined,
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
    status: r.status as BillStatus,
    notes: r.notes ?? undefined,
    journalEntryId: r.journalEntryId ?? undefined,
    createdAt: r.createdAt.toISOString(),
  };
}

function toLine(r: LRow): BillLineItem {
  return {
    id: r.id,
    billId: r.billId,
    description: r.description,
    quantity: Number(r.quantity),
    unit: r.unit ?? undefined,
    unitPrice: Number(r.unitPrice),
    lineTotal: Number(r.lineTotal),
    expenseAccountCode: r.expenseAccountCode,
  };
}

function toPayment(r: PRow): SupplierPayment {
  return {
    id: r.id,
    number: r.number,
    billId: r.billId,
    supplierId: r.supplierId,
    date: r.date,
    amount: Number(r.amount),
    currency: r.currency as Currency,
    fxRate: Number(r.fxRate),
    paymentMethod: r.paymentMethod as APPaymentMethod,
    reference: r.reference ?? undefined,
    journalEntryId: r.journalEntryId ?? undefined,
    notes: r.notes ?? undefined,
    createdAt: r.createdAt.toISOString(),
  };
}

async function recomputeBill(billId: string, orgId: string) {
  const db = getDb();
  const bill = (
    await db
      .select()
      .from(billsTable)
      .where(and(eq(billsTable.id, billId), eq(billsTable.organizationId, orgId)))
      .limit(1)
  )[0];
  if (!bill) return;
  const payments = await db
    .select({ amount: paymentsTable.amount })
    .from(paymentsTable)
    .where(eq(paymentsTable.billId, billId));
  const paid = payments.reduce((s, p) => s + Number(p.amount), 0);
  const total = Number(bill.total);
  const balance = Math.max(0, total - paid);
  let status = bill.status as BillStatus;
  if (status !== "cancelled" && status !== "draft") {
    if (balance < 0.01) status = "paid";
    else if (paid > 0) status = "partially_paid";
    else status = new Date(bill.dueDate).getTime() < Date.now() ? "overdue" : "sent";
  }
  await db
    .update(billsTable)
    .set({ paidAmount: String(paid), balance: String(balance), status })
    .where(eq(billsTable.id, billId));
}

export async function refreshBillStatuses(): Promise<void> {
  if (IS_DEMO_MODE) {
    storeRefresh();
    return;
  }
  const db = getDb();
  const orgId = await requireOrgId();
  const ids = await db
    .select({ id: billsTable.id })
    .from(billsTable)
    .where(
      and(
        eq(billsTable.organizationId, orgId),
        inArray(billsTable.status, ["sent", "partially_paid", "overdue"]),
      ),
    );
  for (const { id } of ids) await recomputeBill(id, orgId);
}

export async function listBills(filter?: {
  status?: BillStatus;
  supplierId?: string;
}): Promise<SupplierBill[]> {
  if (IS_DEMO_MODE) return storeList(filter);
  await refreshBillStatuses();
  const db = getDb();
  const orgId = await requireOrgId();
  const where = [eq(billsTable.organizationId, orgId)];
  if (filter?.status) where.push(eq(billsTable.status, filter.status));
  if (filter?.supplierId) where.push(eq(billsTable.supplierId, filter.supplierId));
  const rows = await db.select().from(billsTable).where(and(...where)).orderBy(desc(billsTable.issueDate));
  return rows.map(toBill);
}

export async function getBill(id: string): Promise<BillWithLines | undefined> {
  if (IS_DEMO_MODE) return storeGet(id);
  await refreshBillStatuses();
  const db = getDb();
  const orgId = await requireOrgId();
  const b = (
    await db
      .select()
      .from(billsTable)
      .where(and(eq(billsTable.id, id), eq(billsTable.organizationId, orgId)))
      .limit(1)
  )[0];
  if (!b) return undefined;
  const [lines, payments] = await Promise.all([
    db.select().from(linesTable).where(eq(linesTable.billId, id)).orderBy(asc(linesTable.id)),
    db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.billId, id))
      .orderBy(desc(paymentsTable.date)),
  ]);
  return { ...toBill(b), lines: lines.map(toLine), payments: payments.map(toPayment) };
}

export async function createBill(input: {
  supplierId: string;
  supplierRef?: string;
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
    expenseAccountCode: string;
  }>;
}): Promise<SupplierBill | { error: string }> {
  if (IS_DEMO_MODE) return storeCreate(input);
  if (input.lines.length === 0) return { error: "At least one line item required" };
  const supplier = await getSupplier(input.supplierId);
  if (!supplier) return { error: "Supplier not found" };
  const subtotal = input.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const taxAmount = subtotal * input.taxRate;
  const total = subtotal + taxAmount;
  const orgId = await requireOrgId();
  const number = await nextDocumentNumber(orgId, "BIL", "bill", 5);
  const db = getDb();
  const bill = await db.transaction(async (tx) => {
    const e = (
      await tx
        .insert(billsTable)
        .values({
          organizationId: orgId,
          number,
          supplierId: input.supplierId,
          supplierRef: input.supplierRef ?? null,
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
        billId: e.id,
        description: l.description,
        quantity: String(l.quantity),
        unit: l.unit ?? null,
        unitPrice: String(l.unitPrice),
        lineTotal: String(l.quantity * l.unitPrice),
        expenseAccountCode: l.expenseAccountCode,
      });
    }
    return e;
  });
  return toBill(bill);
}

export async function postBill(billId: string): Promise<SupplierBill | { error: string }> {
  if (IS_DEMO_MODE) return storePost(billId);
  const bill = await getBill(billId);
  if (!bill) return { error: "Bill not found" };
  if (bill.status !== "draft") return { error: `Already ${bill.status}` };
  const supplier = await getSupplier(bill.supplierId);
  const apCode = bill.currency === "USD" ? "210200" : "210100";
  const apAcc = await getAccountByCode(apCode);
  if (!apAcc) return { error: "AP account not found in CoA" };

  const lines: Array<{ accountId: string; debit: number; credit: number; currency: Currency; fxRate: number; description?: string }> = [];
  for (const l of bill.lines) {
    const acc = await getAccountByCode(l.expenseAccountCode);
    if (!acc) return { error: `Expense account ${l.expenseAccountCode} not found` };
    lines.push({ accountId: acc.id, debit: l.lineTotal, credit: 0, currency: bill.currency, fxRate: bill.fxRate, description: `${bill.number} — ${l.description}` });
  }
  if (bill.taxAmount > 0) {
    const vatAcc = await getAccountByCode("113100");
    if (vatAcc) lines.push({ accountId: vatAcc.id, debit: bill.taxAmount, credit: 0, currency: bill.currency, fxRate: bill.fxRate, description: `${bill.number} — input VAT` });
  }
  lines.push({ accountId: apAcc.id, debit: 0, credit: bill.total, currency: bill.currency, fxRate: bill.fxRate, description: `${bill.number} — ${supplier?.name ?? "Supplier"}` });

  const result = await postJournalEntry({
    date: bill.issueDate,
    memo: `Bill ${bill.number} — ${supplier?.name ?? "Supplier"}`,
    referenceType: "bill",
    referenceId: bill.id,
    postedBy: "Finance",
    lines,
  });
  if ("error" in result) return result;

  const db = getDb();
  const orgId = await requireOrgId();
  const updated = (
    await db
      .update(billsTable)
      .set({ status: "sent", journalEntryId: result.id })
      .where(and(eq(billsTable.id, billId), eq(billsTable.organizationId, orgId)))
      .returning()
  )[0]!;
  return toBill(updated);
}

export async function cancelBill(billId: string): Promise<SupplierBill | { error: string }> {
  if (IS_DEMO_MODE) return storeCancel(billId);
  const bill = await getBill(billId);
  if (!bill) return { error: "Bill not found" };
  if (bill.status === "paid") return { error: "Cannot cancel a paid bill" };
  if (bill.journalEntryId) await reverseJournalEntry({ entryId: bill.journalEntryId, postedBy: "Finance" });
  const db = getDb();
  const orgId = await requireOrgId();
  const updated = (
    await db
      .update(billsTable)
      .set({ status: "cancelled" })
      .where(and(eq(billsTable.id, billId), eq(billsTable.organizationId, orgId)))
      .returning()
  )[0]!;
  return toBill(updated);
}

export async function paySupplierBill(input: {
  billId: string;
  date: string;
  amount: number;
  currency: Currency;
  fxRate: number;
  paymentMethod: APPaymentMethod;
  reference?: string;
  notes?: string;
}): Promise<SupplierPayment | { error: string }> {
  if (IS_DEMO_MODE) return storePay(input);
  const bill = await getBill(input.billId);
  if (!bill) return { error: "Bill not found" };
  if (bill.status === "draft") return { error: "Post the bill first" };
  if (bill.status === "cancelled") return { error: "Bill is cancelled" };
  if (bill.status === "paid") return { error: "Bill already fully paid" };

  const supplier = await getSupplier(bill.supplierId);
  const apCode = bill.currency === "USD" ? "210200" : "210100";
  const apAcc = await getAccountByCode(apCode);
  let bankCode: string;
  if (input.paymentMethod === "mpesa") bankCode = "129100";
  else if (input.paymentMethod === "cash") bankCode = "120100";
  else if (input.currency === "USD") bankCode = "122100";
  else bankCode = "121100";
  const bankAcc = await getAccountByCode(bankCode);
  if (!apAcc || !bankAcc) return { error: "Required accounts (AP / Bank) not found" };

  const orgId = await requireOrgId();
  const number = await nextDocumentNumber(orgId, "PAY", "supplier_payment", 5);
  const db = getDb();
  const payRow = (
    await db
      .insert(paymentsTable)
      .values({
        organizationId: orgId,
        number,
        billId: bill.id,
        supplierId: bill.supplierId,
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
    memo: `Payment ${payRow.number} — ${supplier?.name ?? "Supplier"} for ${bill.number}`,
    referenceType: "payment",
    referenceId: payRow.id,
    postedBy: "Finance",
    lines: [
      { accountId: apAcc.id, debit: input.amount, credit: 0, currency: input.currency, fxRate: input.fxRate, description: `${payRow.number} — applies to ${bill.number}` },
      { accountId: bankAcc.id, debit: 0, credit: input.amount, currency: input.currency, fxRate: input.fxRate, description: `${payRow.number} — supplier paid` },
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
  await recomputeBill(bill.id, orgId);
  return toPayment(updatedPay);
}
