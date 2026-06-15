/**
 * Accounts Receivable — Phase 5C.
 * Customer invoices generated from trips, with payments and aged-AR.
 */

import type { Currency } from "@/lib/types/ledger";

export type InvoiceStatus =
  | "draft"
  | "sent"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "cancelled";

export interface InvoiceLineItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unit?: string;            // tonnes / TEUs / km / trip
  unitPrice: number;
  lineTotal: number;
  /** Revenue account (CoA code) this line credits when posted. */
  revenueAccountCode?: string;
}

export interface CustomerInvoice {
  id: string;
  number: string;           // INV-YYYY-NNNNN
  customerId: string;
  tripId?: string;
  issueDate: string;        // ISO date
  dueDate: string;          // ISO date
  currency: Currency;
  /** FX rate to KES at issue date — captured immutably for audit. */
  fxRate: number;
  /** Subtotal of all line items in invoice currency. */
  subtotal: number;
  /** VAT rate (0 for exports, 0.16 for domestic Kenya). */
  taxRate: number;
  taxAmount: number;
  total: number;
  /** Sum of payments received against this invoice (in invoice currency). */
  paidAmount: number;
  /** Balance owed = total - paidAmount (in invoice currency). */
  balance: number;
  status: InvoiceStatus;
  notes?: string;
  /** Journal entry posted when invoice was sent. */
  journalEntryId?: string;
  createdAt: string;
}

export interface InvoiceWithLines extends CustomerInvoice {
  lines: InvoiceLineItem[];
  payments: CustomerPayment[];
}

export type PaymentMethod = "bank" | "mpesa" | "mobile_money_ugx" | "cash" | "cheque";

/** Human labels for payment methods (M-Pesa is KES; Mobile Money UGX is
 *  MTN MoMo / Airtel in Uganda). */
export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  bank: "Bank transfer",
  mpesa: "M-Pesa",
  mobile_money_ugx: "Mobile Money (UGX)",
  cash: "Cash",
  cheque: "Cheque",
};

export interface CustomerPayment {
  id: string;
  number: string;           // RCT-YYYY-NNNNN
  invoiceId: string;
  customerId: string;
  date: string;             // ISO date
  amount: number;           // in invoice currency
  currency: Currency;
  fxRate: number;
  paymentMethod: PaymentMethod;
  reference?: string;
  /** Journal entry posted when payment was recorded. */
  journalEntryId?: string;
  notes?: string;
  createdAt: string;
}

/** Aged AR bucket for a single invoice. */
export type AgeBucket = "current" | "1-30" | "31-60" | "61-90" | "90+";

export function ageBucket(dueDate: string, today = new Date()): AgeBucket {
  const due = new Date(dueDate);
  const days = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "current";
  if (days <= 30) return "1-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  return "90+";
}
