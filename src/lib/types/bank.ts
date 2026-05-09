/**
 * Bank reconciliation — Phase 5E.
 *
 * "Bank accounts" reuse the CoA Bank/Cash accounts (121100/121200/122100/etc).
 * BankStatementTransaction is one line on the bank's statement; we match
 * each one to a GL posting on the same account.
 */

import type { Currency } from "@/lib/types/ledger";

export type BankReconStatus = "unmatched" | "matched" | "flagged";

export interface BankStatementTransaction {
  id: string;
  /** Account code from CoA, e.g. "121100" (KES bank). */
  accountCode: string;
  /** Statement date. */
  date: string;
  description: string;
  reference?: string;
  /** One of debit / credit will be 0 (in account's native currency). */
  debit: number;
  credit: number;
  currency: Currency;
  status: BankReconStatus;
  /** When matched, the id of the matched JournalLine. */
  matchedJournalLineId?: string;
  notes?: string;
  createdAt: string;
}

export interface BankReconSummary {
  accountCode: string;
  accountName: string;
  currency: Currency;
  /** Sum of all matched + unmatched statement transactions (signed: dr - cr). */
  statementBalance: number;
  /** GL balance (dr - cr) for this account in native currency. */
  glBalance: number;
  /** Difference: statementBalance - glBalance. Zero when fully reconciled. */
  difference: number;
  unmatchedStatementCount: number;
  unmatchedGlCount: number;
}
