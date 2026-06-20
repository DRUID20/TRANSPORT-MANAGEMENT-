/**
 * AI Assistant — Phase 8B.
 *
 * For the mock implementation we run a rule-based intent parser that maps
 * common questions into structured queries against the existing aggregations.
 * The same Intent shape is what a real LLM would emit, so swapping in a
 * Claude / GPT-4 backed planner later only changes one function.
 */

export type IntentKind =
  | "ar_outstanding"
  | "ap_outstanding"
  | "overdue_invoices"
  | "profit_this_period"
  | "top_trucks_by_profit"
  | "worst_fuel"
  | "best_fuel"
  | "compliance_expiring"
  | "leave_pending"
  | "open_trips"
  | "headcount"
  | "revenue_period"
  | "fleet_size"
  | "howto"
  | "help"
  | "unknown";

export interface IntentRange {
  /** ISO date inclusive. */
  fromDate: string;
  /** ISO date inclusive. */
  toDate: string;
  /** Human-readable label, e.g. "this month". */
  label: string;
}

export interface Intent {
  kind: IntentKind;
  /** Raw question. */
  question: string;
  /** Optional date range parsed from phrasing. */
  range?: IntentRange;
  /** Optional top-N limit ("top 3 trucks" → 3). */
  limit?: number;
}

export interface AnswerRow {
  /** Cell key → string/number. */
  [key: string]: string | number | null;
}

export interface Answer {
  /** Prose summary. */
  text: string;
  /** Optional supporting data. */
  table?: {
    headers: string[];
    rows: AnswerRow[];
  };
  /** Optional deep-link to the relevant report page. */
  href?: string;
  hrefLabel?: string;
  /** Was the intent recognised? */
  recognised: boolean;
}
