"use server";

import { revalidatePath } from "next/cache";
import {
  completeMpesaTransaction,
  createMpesaTransaction,
  getDriver,
  getExpense,
  getMpesaTransaction,
  listMpesaTransactions as storeList,
  markExpenseReimbursed,
} from "@/server/store/mock-store";
import { mpesaSendSchema, normalisePhone, type MpesaSendInput } from "@/lib/validators/mpesa";
import { darajaSend } from "@/server/mpesa/daraja";
import type { MpesaTransactionType } from "@/lib/types/mpesa";

export async function listMpesaTransactions(filter?: {
  type?: MpesaTransactionType;
  tripId?: string;
  expenseId?: string;
  driverId?: string;
}) {
  return storeList(filter);
}

export async function getMpesaTx(id: string) {
  return getMpesaTransaction(id);
}

export type SendResult =
  | { ok: true; id: string; receipt?: string; source: "mock" | "daraja_sandbox" | "daraja_prod" }
  | { ok: false; error: string };

export async function sendMpesa(input: MpesaSendInput): Promise<SendResult> {
  const parsed = mpesaSendSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const recipient = normalisePhone(parsed.data.recipient);

  // 1. Persist a pending transaction
  const tx = createMpesaTransaction({
    type: parsed.data.type,
    recipient,
    recipientName: parsed.data.recipientName,
    amountKes: parsed.data.amountKes,
    tripId: parsed.data.tripId,
    expenseId: parsed.data.expenseId,
    driverId: parsed.data.driverId,
    supplierId: parsed.data.supplierId,
    initiatedBy: parsed.data.initiatedBy,
    notes: parsed.data.notes,
  });

  // 2. Call Daraja (or mock)
  const result = await darajaSend({
    type: parsed.data.type,
    recipient,
    amountKes: parsed.data.amountKes,
  });

  // 3. Persist result
  const completed = completeMpesaTransaction({
    id: tx.id,
    status: result.ok ? "sent" : "failed",
    source: result.source,
    checkoutRequestId: result.checkoutRequestId,
    merchantRequestId: result.merchantRequestId,
    mpesaReceiptNumber: result.mpesaReceiptNumber,
    errorMessage: result.errorMessage,
  });

  // 4. Side effects: if this was a reimbursement and it succeeded, mark
  //    the expense reimbursed.
  if (result.ok && parsed.data.type === "reimbursement" && parsed.data.expenseId) {
    markExpenseReimbursed(parsed.data.expenseId);
    revalidatePath(`/expenses/${parsed.data.expenseId}`);
  }

  // 5. Revalidations
  revalidatePath("/mpesa");
  if (parsed.data.tripId) revalidatePath(`/trips/${parsed.data.tripId}`);
  if (parsed.data.expenseId) revalidatePath(`/expenses/${parsed.data.expenseId}`);
  revalidatePath("/expenses");

  if (!result.ok) {
    return {
      ok: false,
      error: result.errorMessage ?? "M-Pesa send failed",
    };
  }
  return {
    ok: true,
    id: completed?.id ?? tx.id,
    receipt: completed?.mpesaReceiptNumber,
    source: result.source,
  };
}

/** Pre-fill helpers — called from the UI to suggest recipient details. */
export async function getReimbursementContext(expenseId: string) {
  const expense = getExpense(expenseId);
  if (!expense) return null;
  const driver = expense.driverId ? getDriver(expense.driverId) : undefined;
  return {
    amountKes: expense.amountKes,
    driverId: expense.driverId,
    driverName: driver?.fullName,
    driverPhone: driver?.phone,
    tripId: expense.tripId,
  };
}
