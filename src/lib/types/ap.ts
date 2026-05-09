/**
 * Accounts Payable — Phase 5D.
 * Supplier bills (from job-card spares / fuel / expenses), payments,
 * and aged-AP report.
 */

import type { Currency } from "@/lib/types/ledger";
import type { AgeBucket } from "@/lib/types/ar";

export type BillStatus =
  | "draft"
  | "sent"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "cancelled";

export interface BillLineItem {
  id: string;
  billId: string;
  description: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  lineTotal: number;
  /** Expense account (CoA code) this line debits when posted. */
  expenseAccountCode: string;
}

export interface SupplierBill {
  id: string;
  number: string;             // BIL-YYYY-NNNNN
  supplierId: string;
  /** Supplier-side reference, e.g. their invoice number. */
  supplierRef?: string;
  issueDate: string;
  dueDate: string;
  currency: Currency;
  fxRate: number;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  paidAmount: number;
  balance: number;
  status: BillStatus;
  notes?: string;
  journalEntryId?: string;
  createdAt: string;
}

export interface BillWithLines extends SupplierBill {
  lines: BillLineItem[];
  payments: SupplierPayment[];
}

export type APPaymentMethod = "bank" | "mpesa" | "cash" | "cheque";

export interface SupplierPayment {
  id: string;
  number: string;             // PAY-YYYY-NNNNN
  billId: string;
  supplierId: string;
  date: string;
  amount: number;
  currency: Currency;
  fxRate: number;
  paymentMethod: APPaymentMethod;
  reference?: string;
  journalEntryId?: string;
  notes?: string;
  createdAt: string;
}

export type { AgeBucket };
