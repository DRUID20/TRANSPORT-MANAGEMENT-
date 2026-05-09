/**
 * Chart of Accounts — Phase 5A.
 * 6-digit numbering scheme; sourced from docs/finance/coa-proposed.csv.
 */

export type AccountClass =
  | "Asset"
  | "Liability"
  | "Equity"
  | "Income"
  | "Direct Cost"
  | "Expense"
  | "Other Income"
  | "Other Expense"
  | "Tax";

export type NormalBalance = "Debit" | "Credit";

export type AccountStatus = "Active" | "Closed";

export interface Account {
  id: string;
  /** 6-digit code, e.g. "100100". Unique within the org. */
  code: string;
  name: string;
  class: AccountClass;
  /** Sub-grouping within class (e.g. 'Non-current', 'Current', 'Cost of Sales'). */
  group: string;
  /** Finer type label (e.g. 'PPE', 'Bank', 'Receivable'). */
  type: string;
  normalBalance: NormalBalance;
  currency: string;            // ISO 4217 code; usually KES, sometimes USD/UGX
  status: AccountStatus;
  notes?: string;
}

/** Convenience predicate for account class signs in the GL. */
export function increasesByDebit(c: AccountClass): boolean {
  return (
    c === "Asset" || c === "Direct Cost" || c === "Expense" || c === "Other Expense" || c === "Tax"
  );
}
