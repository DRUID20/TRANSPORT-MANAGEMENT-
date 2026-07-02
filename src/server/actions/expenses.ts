"use server";

import { revalidatePath } from "next/cache";
import {
  createExpense as repoCreate,
  deleteExpense as repoDelete,
  expensesForTrip as repoForTrip,
  getExpense,
  listExpenses as repoList,
  reviewExpense as repoReview,
} from "@/server/repos/expenses";
import type { ExpenseStatus } from "@/lib/types/expenses";
import { requireCapability, PermissionError, guard, guardFleetOrDriver } from "@/server/auth/permissions";
import { logAudit } from "@/server/auth/audit";
import {
  expenseCreateSchema,
  expenseReviewSchema,
  type ExpenseCreateInput,
  type ExpenseReviewInput,
} from "@/lib/validators/expenses";

export async function listExpenses(filter?: {
  status?: ExpenseStatus;
  tripId?: string;
  truckId?: string;
  driverId?: string;
}) {
  return repoList(filter);
}

export async function getExpenseById(id: string) {
  return getExpense(id);
}

export async function expensesForTrip(tripId: string) {
  return repoForTrip(tripId);
}

export type ActionResult = { ok: true; id: string } | { ok: false; error: string };

export async function createExpense(input: ExpenseCreateInput): Promise<ActionResult> {
  const denied = await guardFleetOrDriver();
  if (denied) return denied;
  const parsed = expenseCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const e = await repoCreate({
    amountKes: parsed.data.amountKes,
    originalAmount: parsed.data.originalAmount,
    originalCurrency: parsed.data.originalCurrency,
    category: parsed.data.category,
    description: parsed.data.description,
    location: parsed.data.location,
    countryCode: parsed.data.countryCode,
    incurredAt: parsed.data.incurredAt,
    paidBy: parsed.data.paidBy,
    tripId: parsed.data.tripId,
    truckId: parsed.data.truckId,
    driverId: parsed.data.driverId,
    supplierId: parsed.data.supplierId,
    receiptDocumentId: parsed.data.receiptDocumentId,
    submittedBy: parsed.data.submittedBy,
    submittedAt: new Date().toISOString(),
  });
  await logAudit({
    entityType: "expense",
    entityId: e.id,
    action: "create",
    diff: { amountKes: { from: null, to: e.amountKes }, category: { from: null, to: e.category } },
  });
  revalidatePath("/expenses");
  if (parsed.data.tripId) revalidatePath(`/trips/${parsed.data.tripId}`);
  return { ok: true, id: e.id };
}

export async function reviewExpense(input: ExpenseReviewInput): Promise<ActionResult> {
  const denied = await guard("fleet.write");
  if (denied) return denied;
  const parsed = expenseReviewSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const exp = await repoReview({
    expenseId: parsed.data.expenseId,
    approve: parsed.data.approve,
    reason: parsed.data.reason,
    reviewedBy: parsed.data.reviewedBy,
    notes: parsed.data.notes,
  });
  if (!exp) return { ok: false, error: "Expense not found" };
  await logAudit({
    entityType: "expense",
    entityId: exp.id,
    action: parsed.data.approve ? "approve" : "reject",
    diff: parsed.data.reason ? { reason: { from: null, to: parsed.data.reason } } : undefined,
  });
  revalidatePath("/expenses");
  if (exp.tripId) revalidatePath(`/trips/${exp.tripId}`);
  return { ok: true, id: exp.id };
}

export async function removeExpense(id: string): Promise<ActionResult> {
  try {
    await requireCapability("admin");
  } catch (e) {
    return { ok: false, error: e instanceof PermissionError ? e.message : "Forbidden" };
  }
  const exp = await getExpense(id);
  if (!exp) return { ok: false, error: "Expense not found" };
  if (exp.status === "approved") {
    return { ok: false, error: "Approved expenses can't be deleted — they're a committed cost." };
  }
  await repoDelete(id);
  await logAudit({ entityType: "expense", entityId: id, action: "delete", diff: { status: { from: exp.status, to: "deleted" } } });
  revalidatePath("/expenses");
  if (exp.tripId) revalidatePath(`/trips/${exp.tripId}`);
  return { ok: true, id };
}
