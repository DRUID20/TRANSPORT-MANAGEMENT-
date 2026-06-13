/**
 * Expenses repository — dual-mode (Postgres / mock store). Org-scoped.
 * EXP-YYYY-NNNN issued atomically from the counters table.
 */
import { and, desc, eq } from "drizzle-orm";
import { IS_DEMO_MODE } from "@/server/auth/session-secret";
import { requireOrgId } from "@/server/auth/current-org";
import { getDb } from "@/server/db/client";
import { expenses as table } from "@/server/db/schema";
import { nextDocumentNumber } from "@/server/repos/counters";
import {
  createExpense as storeCreate,
  deleteExpense as storeDelete,
  expensesForTrip as storeForTrip,
  getExpense as storeGet,
  listExpenses as storeList,
  markExpenseReimbursed as storeReimburse,
  reviewExpense as storeReview,
  tripExpenseTotal as storeTripTotal,
} from "@/server/store/mock-store";
import type {
  Expense,
  ExpenseCategory,
  ExpenseStatus,
  PaymentMethod,
} from "@/lib/types/expenses";

type Row = typeof table.$inferSelect;
type ListFilter = { status?: ExpenseStatus; tripId?: string; truckId?: string; driverId?: string };
type NewExpense = Omit<
  Expense,
  "id" | "number" | "createdAt" | "status" | "approvedBy" | "approvedAt" | "rejectionReason" | "reimbursedAt"
>;

function toExpense(r: Row): Expense {
  return {
    id: r.id,
    number: r.number,
    amountKes: Number(r.amountKes),
    originalAmount: r.originalAmount === null ? undefined : Number(r.originalAmount),
    originalCurrency: (r.originalCurrency as Expense["originalCurrency"]) ?? undefined,
    category: r.category as ExpenseCategory,
    description: r.description,
    location: r.location ?? undefined,
    countryCode: r.countryCode ?? undefined,
    incurredAt: r.incurredAt.toISOString(),
    paidBy: r.paidBy as PaymentMethod,
    tripId: r.tripId ?? undefined,
    truckId: r.truckId ?? undefined,
    driverId: r.driverId ?? undefined,
    supplierId: r.supplierId ?? undefined,
    receiptDocumentId: r.receiptDocumentId ?? undefined,
    status: r.status as ExpenseStatus,
    submittedBy: r.submittedBy,
    submittedAt: r.submittedAt.toISOString(),
    approvedBy: r.approvedBy ?? undefined,
    approvedAt: r.approvedAt?.toISOString(),
    rejectionReason: r.rejectionReason ?? undefined,
    reimbursedAt: r.reimbursedAt?.toISOString(),
    notes: r.notes ?? undefined,
    createdAt: r.createdAt.toISOString(),
  };
}

export async function listExpenses(filter?: ListFilter): Promise<Expense[]> {
  if (IS_DEMO_MODE) return storeList(filter);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .select()
    .from(table)
    .where(eq(table.organizationId, orgId))
    .orderBy(desc(table.submittedAt));
  let all = rows.map(toExpense);
  if (filter?.status) all = all.filter((e) => e.status === filter.status);
  if (filter?.tripId) all = all.filter((e) => e.tripId === filter.tripId);
  if (filter?.truckId) all = all.filter((e) => e.truckId === filter.truckId);
  if (filter?.driverId) all = all.filter((e) => e.driverId === filter.driverId);
  return all;
}

export async function getExpense(id: string): Promise<Expense | undefined> {
  if (IS_DEMO_MODE) return storeGet(id);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .select()
    .from(table)
    .where(and(eq(table.id, id), eq(table.organizationId, orgId)))
    .limit(1);
  return rows[0] ? toExpense(rows[0]) : undefined;
}

export async function expensesForTrip(tripId: string): Promise<Expense[]> {
  if (IS_DEMO_MODE) return storeForTrip(tripId);
  return listExpenses({ tripId });
}

export async function createExpense(input: NewExpense): Promise<Expense> {
  if (IS_DEMO_MODE) return storeCreate(input);
  const db = getDb();
  const orgId = await requireOrgId();
  const number = await nextDocumentNumber(orgId, "EXP", "expense");
  const rows = await db
    .insert(table)
    .values({
      organizationId: orgId,
      number,
      amountKes: String(input.amountKes),
      originalAmount: input.originalAmount !== undefined ? String(input.originalAmount) : null,
      originalCurrency: input.originalCurrency ?? null,
      category: input.category,
      description: input.description,
      location: input.location ?? null,
      countryCode: input.countryCode ?? null,
      incurredAt: new Date(input.incurredAt),
      paidBy: input.paidBy,
      tripId: input.tripId ?? null,
      truckId: input.truckId ?? null,
      driverId: input.driverId ?? null,
      supplierId: input.supplierId ?? null,
      receiptDocumentId: input.receiptDocumentId ?? null,
      status: "pending",
      submittedBy: input.submittedBy,
      submittedAt: input.submittedAt ? new Date(input.submittedAt) : new Date(),
      notes: input.notes ?? null,
    })
    .returning();
  return toExpense(rows[0]!);
}

export async function reviewExpense(input: {
  expenseId: string;
  approve: boolean;
  reason?: string;
  reviewedBy: string;
  notes?: string;
}): Promise<Expense | undefined> {
  if (IS_DEMO_MODE) return storeReview(input);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .update(table)
    .set({
      status: input.approve ? "approved" : "rejected",
      approvedBy: input.reviewedBy,
      approvedAt: new Date(),
      rejectionReason: input.approve ? null : input.reason ?? null,
      notes: input.notes ?? null,
    })
    .where(and(eq(table.id, input.expenseId), eq(table.organizationId, orgId)))
    .returning();
  return rows[0] ? toExpense(rows[0]) : undefined;
}

export async function markExpenseReimbursed(id: string): Promise<Expense | undefined> {
  if (IS_DEMO_MODE) return storeReimburse(id);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .update(table)
    .set({ status: "reimbursed", reimbursedAt: new Date() })
    .where(and(eq(table.id, id), eq(table.organizationId, orgId)))
    .returning();
  return rows[0] ? toExpense(rows[0]) : undefined;
}

export async function deleteExpense(id: string): Promise<boolean> {
  if (IS_DEMO_MODE) return storeDelete(id);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .delete(table)
    .where(and(eq(table.id, id), eq(table.organizationId, orgId)))
    .returning({ id: table.id });
  return rows.length > 0;
}

export async function tripExpenseTotal(tripId: string): Promise<number> {
  if (IS_DEMO_MODE) return storeTripTotal(tripId);
  const all = await expensesForTrip(tripId);
  return all
    .filter((e) => e.status === "approved" || e.status === "reimbursed")
    .reduce((s, e) => s + e.amountKes, 0);
}
