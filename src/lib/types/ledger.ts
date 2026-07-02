/**
 * General Ledger — Phase 5B.
 * Double-entry journal entries with multi-currency support.
 */

export type Currency = "KES" | "USD" | "UGX";

export type JournalStatus = "draft" | "posted" | "reversed";

export type JournalReferenceType =
  | "manual"
  | "opening_balance"
  | "trip"
  | "expense"
  | "fuel"
  | "mpesa"
  | "invoice"
  | "bill"
  | "payment"
  | "fx_revaluation"
  | "depreciation"
  | "asset_acquisition"
  | "asset_disposal"
  | "payroll"
  | "reversal";

export interface JournalLine {
  id: string;
  journalEntryId: string;
  /** Denormalised for fast Trial Balance + readability. */
  accountId: string;
  accountCode: string;
  accountName: string;
  /** Native amount in the line's currency (one of debit/credit will be 0). */
  originalDebit: number;
  originalCredit: number;
  currency: Currency;
  /** FX rate to KES at posting; 1 if line is already KES. */
  fxRate: number;
  /** Always in KES base (debit or credit; one is 0). Used by the TB. */
  debitKes: number;
  creditKes: number;
  description?: string;
}

export interface JournalEntry {
  id: string;
  number: string;             // JE-YYYY-NNNNN
  /** Posting date (ISO, yyyy-mm-dd). */
  date: string;
  memo: string;
  referenceType: JournalReferenceType;
  referenceId?: string;
  status: JournalStatus;
  postedBy: string;
  postedAt: string;           // ISO datetime
  /** When this entry reverses another, the id of the reversed entry. */
  reversalOf?: string;
  /** When set, this entry has been reversed by another. */
  reversedById?: string;
  /** Aggregate KES totals (computed at post time; both equal). */
  totalDebitKes: number;
  totalCreditKes: number;
}

export interface JournalEntryDetail extends JournalEntry {
  lines: JournalLine[];
}

/**
 * A single Trial Balance row (one per account).
 */
export interface TrialBalanceRow {
  accountId: string;
  code: string;
  name: string;
  class: string;
  /** Sum of all debit postings (KES). */
  debitKes: number;
  /** Sum of all credit postings (KES). */
  creditKes: number;
  /** Net balance respecting normal-balance convention.
   *  Debit-balance accounts: debitKes - creditKes (positive = owed to/owned).
   *  Credit-balance accounts: creditKes - debitKes (positive = owed by). */
  balanceKes: number;
  /** Sign convention: 'Debit' means a positive balance is on the debit side. */
  balanceSide: "Debit" | "Credit";
}
