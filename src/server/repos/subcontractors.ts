/**
 * Subcontractors repository — dual-mode (Postgres when DATABASE_URL is set,
 * mock store in demo mode). Org-scoped. See repos/customers.ts for the pattern.
 */
import { and, desc, eq } from "drizzle-orm";
import { IS_DEMO_MODE } from "@/server/auth/session-secret";
import { requireOrgId } from "@/server/auth/current-org";
import { getDb } from "@/server/db/client";
import { subcontractors as table, subcontractorPayments as payTable } from "@/server/db/schema";
import { nextDocumentNumber } from "@/server/repos/counters";
import { listTrips } from "@/server/repos/trips";
import { listTrucks } from "@/server/repos/trucks";
import { createBill } from "@/server/repos/ap";
import { getRatesToKesMap } from "@/server/repos/fx";
import {
  createSubcontractor as storeCreate,
  getSubcontractor as storeGet,
  listSubcontractors as storeList,
  updateSubcontractor as storeUpdate,
} from "@/server/store/mock-store";
import type {
  Subcontractor,
  SubcontractorAccount,
  SubcontractorLedgerRow,
  SubcontractorPayment,
  SubcontractorPaymentMethod,
} from "@/lib/types/fleet";

type PayRow = typeof payTable.$inferSelect;
function toPayment(r: PayRow): SubcontractorPayment {
  return {
    id: r.id,
    number: r.number,
    subcontractorId: r.subcontractorId,
    date: r.date,
    amountKes: Number(r.amountKes),
    method: r.method as SubcontractorPaymentMethod,
    supplierId: r.supplierId ?? undefined,
    billId: r.billId ?? undefined,
    reference: r.reference ?? undefined,
    notes: r.notes ?? undefined,
    createdAt: r.createdAt.toISOString(),
  };
}

type Row = typeof table.$inferSelect;

function toSub(r: Row): Subcontractor {
  return {
    id: r.id,
    name: r.name,
    contactPerson: r.contactPerson,
    phone: r.phone,
    email: r.email ?? undefined,
    kraPin: r.kraPin ?? undefined,
    mpesaNumber: r.mpesaNumber ?? undefined,
    bankName: r.bankName ?? undefined,
    bankAccount: r.bankAccount ?? undefined,
    commissionRate: Number(r.commissionRate),
    notes: r.notes ?? undefined,
    createdAt: r.createdAt.toISOString(),
  };
}

export async function listSubcontractors(): Promise<Subcontractor[]> {
  if (IS_DEMO_MODE) return storeList();
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db.select().from(table).where(eq(table.organizationId, orgId));
  return rows.map(toSub).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getSubcontractor(id: string): Promise<Subcontractor | undefined> {
  if (IS_DEMO_MODE) return storeGet(id);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .select()
    .from(table)
    .where(and(eq(table.id, id), eq(table.organizationId, orgId)))
    .limit(1);
  return rows[0] ? toSub(rows[0]) : undefined;
}

export async function createSubcontractor(
  input: Omit<Subcontractor, "id" | "createdAt">,
): Promise<Subcontractor> {
  if (IS_DEMO_MODE) return storeCreate(input);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .insert(table)
    .values({
      organizationId: orgId,
      name: input.name,
      contactPerson: input.contactPerson,
      phone: input.phone,
      email: input.email ?? null,
      kraPin: input.kraPin ?? null,
      mpesaNumber: input.mpesaNumber ?? null,
      bankName: input.bankName ?? null,
      bankAccount: input.bankAccount ?? null,
      commissionRate: String(input.commissionRate ?? 0.1),
      notes: input.notes ?? null,
    })
    .returning();
  return toSub(rows[0]!);
}

export async function updateSubcontractor(
  id: string,
  patch: Partial<Subcontractor>,
): Promise<Subcontractor | undefined> {
  if (IS_DEMO_MODE) return storeUpdate(id, patch);
  const db = getDb();
  const orgId = await requireOrgId();
  const set: Partial<typeof table.$inferInsert> = {};
  if (patch.name !== undefined) set.name = patch.name;
  if (patch.contactPerson !== undefined) set.contactPerson = patch.contactPerson;
  if (patch.phone !== undefined) set.phone = patch.phone;
  if (patch.email !== undefined) set.email = patch.email ?? null;
  if (patch.kraPin !== undefined) set.kraPin = patch.kraPin ?? null;
  if (patch.mpesaNumber !== undefined) set.mpesaNumber = patch.mpesaNumber ?? null;
  if (patch.bankName !== undefined) set.bankName = patch.bankName ?? null;
  if (patch.bankAccount !== undefined) set.bankAccount = patch.bankAccount ?? null;
  if (patch.commissionRate !== undefined) set.commissionRate = String(patch.commissionRate);
  if (patch.notes !== undefined) set.notes = patch.notes ?? null;
  if (Object.keys(set).length === 0) return getSubcontractor(id);
  const rows = await db
    .update(table)
    .set(set)
    .where(and(eq(table.id, id), eq(table.organizationId, orgId)))
    .returning();
  return rows[0] ? toSub(rows[0]) : undefined;
}

// ============================================================
// Subcontractor current account (memo ledger)
// ============================================================

export async function listSubcontractorPayments(
  subcontractorId?: string,
): Promise<SubcontractorPayment[]> {
  if (IS_DEMO_MODE) return [];
  const db = getDb();
  const orgId = await requireOrgId();
  const where = [eq(payTable.organizationId, orgId)];
  if (subcontractorId) where.push(eq(payTable.subcontractorId, subcontractorId));
  const rows = await db.select().from(payTable).where(and(...where)).orderBy(desc(payTable.date));
  return rows.map(toPayment);
}

/**
 * Record a payment out of a subcontractor's account. For `supplier_direct`
 * (the supplier paid them on our behalf) we also raise a draft AP bill to that
 * supplier — Dr Subcontracted Haulage (502500) / Cr AP on send — since we now
 * owe the supplier.
 */
export async function recordSubcontractorPayment(input: {
  subcontractorId: string;
  date: string;
  amountKes: number;
  method: SubcontractorPaymentMethod;
  supplierId?: string;
  reference?: string;
  notes?: string;
}): Promise<SubcontractorPayment | { error: string }> {
  if (IS_DEMO_MODE) return { error: "Recording payments isn't available in demo mode." };
  const sub = await getSubcontractor(input.subcontractorId);
  if (!sub) return { error: "Subcontractor not found" };
  if (input.amountKes <= 0) return { error: "Amount must be greater than zero." };
  if (input.method === "supplier_direct" && !input.supplierId) {
    return { error: "Select the supplier who paid them." };
  }
  const orgId = await requireOrgId();
  const db = getDb();
  const number = await nextDocumentNumber(orgId, "SCP", "subpay", 5);

  let billId: string | null = null;
  if (input.method === "supplier_direct" && input.supplierId) {
    const bill = await createBill({
      supplierId: input.supplierId,
      issueDate: input.date,
      dueDate: input.date,
      currency: "KES",
      fxRate: 1,
      taxRate: 0,
      notes: `Paid ${sub.name} on our behalf — subcontractor settlement ${number}`,
      lines: [
        {
          description: `Subcontractor settlement — ${sub.name}`,
          quantity: 1,
          unit: "lot",
          unitPrice: input.amountKes,
          expenseAccountCode: "502500", // Subcontracted Haulage
        },
      ],
    });
    if ("error" in bill) return { error: `Could not raise the supplier bill: ${bill.error}` };
    billId = bill.id;
  }

  const rows = await db
    .insert(payTable)
    .values({
      organizationId: orgId,
      number,
      subcontractorId: input.subcontractorId,
      date: input.date,
      amountKes: String(input.amountKes),
      method: input.method,
      supplierId: input.supplierId ?? null,
      billId,
      reference: input.reference ?? null,
      notes: input.notes ?? null,
    })
    .returning();
  return toPayment(rows[0]!);
}

/**
 * Build a subcontractor's current-account statement: trip earnings (their share
 * of completed-trip freight) as credits, payments as debits, with a running
 * balance. Positive balance = we still owe them. Freight is treated as KES.
 */
export async function subcontractorAccount(
  subcontractorId: string,
  range?: { fromDate?: string; toDate?: string },
): Promise<SubcontractorAccount | undefined> {
  const sub = await getSubcontractor(subcontractorId);
  if (!sub) return undefined;
  const rate = sub.commissionRate ?? 0.1;
  const [trips, trucks, payments, fxToKes] = await Promise.all([
    listTrips(),
    listTrucks(),
    listSubcontractorPayments(subcontractorId),
    getRatesToKesMap(),
  ]);
  const subTruckIds = new Set(
    trucks
      .filter((t) => t.ownerType === "subcontractor" && t.subcontractorId === subcontractorId)
      .map((t) => t.id),
  );

  const all: SubcontractorLedgerRow[] = [];
  for (const t of trips) {
    if (!t.truckId || !subTruckIds.has(t.truckId) || t.status !== "closed") continue;
    const date = (
      t.actualDeliveryAt ?? t.actualDepartureAt ?? t.plannedDepartureDate ?? t.createdAt
    ).slice(0, 10);
    // Freight may be in USD/UGX for cross-border trips — convert to KES using
    // the live KES-equivalent rate so the account isn't ~140× under-credited.
    const fx = fxToKes[t.revenueCurrency] ?? 1;
    const revenueKes = t.revenueAmount * fx;
    all.push({
      date,
      ref: t.number,
      description:
        `Trip ${t.origin} → ${t.destination} · ${((1 - rate) * 100).toFixed(0)}% of freight` +
        (t.revenueCurrency !== "KES" ? ` (from ${t.revenueAmount.toLocaleString()} ${t.revenueCurrency})` : ""),
      credit: revenueKes * (1 - rate),
      debit: 0,
      balance: 0,
    });
  }
  for (const p of payments) {
    all.push({
      date: p.date,
      ref: p.number,
      description:
        p.method === "supplier_direct" ? "Paid via supplier (on our behalf)" : `${p.method} payment`,
      credit: 0,
      debit: p.amountKes,
      balance: 0,
    });
  }
  all.sort((a, b) => a.date.localeCompare(b.date) || a.ref.localeCompare(b.ref));

  let opening = 0;
  const rows: SubcontractorLedgerRow[] = [];
  for (const r of all) {
    if (range?.fromDate && r.date < range.fromDate) {
      opening += r.credit - r.debit;
      continue;
    }
    if (range?.toDate && r.date > range.toDate) continue;
    rows.push(r);
  }
  let bal = opening;
  for (const r of rows) {
    bal += r.credit - r.debit;
    r.balance = bal;
  }
  return {
    subcontractorId,
    name: sub.name,
    commissionRate: rate,
    openingBalance: opening,
    rows,
    totalEarned: rows.reduce((s, r) => s + r.credit, 0),
    totalPaid: rows.reduce((s, r) => s + r.debit, 0),
    closingBalance: bal,
  };
}
