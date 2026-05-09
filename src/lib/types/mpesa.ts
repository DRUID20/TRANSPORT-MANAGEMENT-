/**
 * M-Pesa Daraja transactions — Phase 4D.
 * Driver advances (STK push) + supplier/driver reimbursements (B2C send).
 */

export type MpesaTransactionType =
  | "driver_advance"  // STK push to driver phone for trip advance
  | "reimbursement"   // B2C send to driver phone (over-spent advance)
  | "supplier_payment"; // B2C send to supplier (Phase 5 AP)

export type MpesaTransactionStatus =
  | "pending"     // initiated; waiting for Daraja confirmation
  | "sent"        // M-Pesa accepted and sent to recipient
  | "failed"      // Daraja rejected or timed out
  | "cancelled";  // user cancelled before sending

export interface MpesaTransaction {
  id: string;
  number: string;          // MP-YYYY-NNNN
  type: MpesaTransactionType;
  /** Phone number receiving the funds (E.164: +2547xxxxxxxx). */
  recipient: string;
  recipientName?: string;
  amountKes: number;
  status: MpesaTransactionStatus;
  /** Cross-reference to the source record. */
  tripId?: string;
  expenseId?: string;
  driverId?: string;
  supplierId?: string;
  /** Daraja-side identifiers (populated when real API is wired). */
  checkoutRequestId?: string;
  merchantRequestId?: string;
  mpesaReceiptNumber?: string;
  /** Failure reason text if status === 'failed'. */
  errorMessage?: string;
  initiatedBy: string;
  initiatedAt: string;
  completedAt?: string;
  /** Mock vs real, captured for the audit trail. */
  source: "mock" | "daraja_sandbox" | "daraja_prod";
  notes?: string;
}

export const transactionTypeLabel: Record<MpesaTransactionType, string> = {
  driver_advance: "Driver advance",
  reimbursement: "Driver reimbursement",
  supplier_payment: "Supplier payment",
};
