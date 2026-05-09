"use server";

import { revalidatePath } from "next/cache";
import {
  createExpense as storeCreate,
  deleteExpense as storeDelete,
  expensesForTrip as storeForTrip,
  getExpense,
  listExpenses as storeList,
  markExpenseReimbursed as storeReimburse,
  reviewExpense as storeReview,
} from "@/server/store/mock-store";
import type { ExpenseStatus } from "@/lib/types/expenses";
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
  return storeList(filter);
}

export async function getExpenseById(id: string) {
  return getExpense(id);
}

export async function expensesForTrip(tripId: string) {
  return storeForTrip(tripId);
}

export type ActionResult = { ok: true; id: string } | { ok: false; error: string };

export async function createExpense(input: ExpenseCreateInput): Promise<ActionResult> {
  const parsed = expenseCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const e = storeCreate({
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
  revalidatePath("/expenses");
  if (parsed.data.tripId) revalidatePath(`/trips/${parsed.data.tripId}`);
  return { ok: true, id: e.id };
}

export async function reviewExpense(input: ExpenseReviewInput): Promise<ActionResult> {
  const parsed = expenseReviewSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const exp = storeReview({
    expenseId: parsed.data.expenseId,
    approve: parsed.data.approve,
    reason: parsed.data.reason,
    reviewedBy: parsed.data.reviewedBy,
    notes: parsed.data.notes,
  });
  if (!exp) return { ok: false, error: "Expense not found" };
  revalidatePath("/expenses");
  if (exp.tripId) revalidatePath(`/trips/${exp.tripId}`);
  return { ok: true, id: exp.id };
}

export async function markReimbursed(id: string): Promise<ActionResult> {
  const exp = storeReimburse(id);
  if (!exp) return { ok: false, error: "Expense not found" };
  revalidatePath("/expenses");
  if (exp.tripId) revalidatePath(`/trips/${exp.tripId}`);
  return { ok: true, id: exp.id };
}

export async function removeExpense(id: string): Promise<ActionResult> {
  const exp = getExpense(id);
  if (!exp) return { ok: false, error: "Expense not found" };
  storeDelete(id);
  revalidatePath("/expenses");
  if (exp.tripId) revalidatePath(`/trips/${exp.tripId}`);
  return { ok: true, id };
}
