/**
 * Payroll & Loans — Phase 6D.
 *
 * TX System captures payroll INPUTS and computes indicative deductions
 * (Kenyan PAYE / NSSF / SHA / NITA / AHL) for visibility. The authoritative
 * payroll run still happens in the external payroll provider — we export
 * a CSV of inputs to feed it.
 */

import type { Currency } from "@/lib/types/ledger";

export type PayrollPeriodStatus = "draft" | "processing" | "paid" | "closed";

export interface PayrollPeriod {
  id: string;
  /** YYYY-MM, e.g. "2026-05". */
  yearMonth: string;
  /** Period start (1st of month). */
  startDate: string;
  /** Period end (last day of month). */
  endDate: string;
  status: PayrollPeriodStatus;
  /** When the period was processed (deductions calculated). */
  processedAt?: string;
  /** When net was paid out. */
  paidAt?: string;
  notes?: string;
  createdAt: string;
}

export interface PayrollAllowance {
  name: string;
  amount: number;
  taxable: boolean;
}

export interface PayrollInput {
  id: string;
  periodId: string;
  employeeId: string;
  /** Basic salary in employee's contract currency. */
  basicSalary: number;
  currency: Currency;
  /** Pulled from contract; can be edited per period. */
  allowances: PayrollAllowance[];
  /** Overtime hours × rate. */
  overtimeHours: number;
  overtimeRate: number;
  /** Bonus / commission line. */
  bonus: number;
  /** Adhoc deductions (e.g. canteen, salary advance recovery). */
  otherDeductions: number;
  /** Recovery of approved loans this month. */
  loanRecovery: number;
  /** Computed deductions (Kenyan statutory). */
  paye: number;
  nssfEmployee: number;
  nssfEmployer: number;
  shaEmployee: number;
  nitaEmployer: number;
  ahlEmployee: number;
  ahlEmployer: number;
  /** Computed totals. */
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  /** Indicative employer cost for cost-centre reporting. */
  employerCost: number;
  notes?: string;
  createdAt: string;
}

export type LoanStatus = "active" | "paid_off" | "written_off" | "cancelled";

export interface Loan {
  id: string;
  /** LN-YYYY-NNNNN */
  number: string;
  employeeId: string;
  /** Loan principal in disbursement currency. */
  principal: number;
  currency: Currency;
  /** Disbursed on. */
  disbursedDate: string;
  /** Monthly amount to recover from payroll. */
  monthlyRecovery: number;
  /** Months over which the loan is recovered. */
  termMonths: number;
  /** Optional simple interest rate p.a. (decimal, e.g. 0.06 = 6%). */
  interestRate: number;
  /** Total recovered to date. */
  recovered: number;
  /** Outstanding balance. */
  balance: number;
  status: LoanStatus;
  reason?: string;
  notes?: string;
  createdAt: string;
}

/** Kenyan PAYE bands (KES, monthly). 2024-2026 schedule.
 *  https://www.kra.go.ke/en/individual/individual-paye-rates */
export const PAYE_BANDS: Array<{ upTo: number; rate: number }> = [
  { upTo: 24_000, rate: 0.10 },
  { upTo: 32_333, rate: 0.25 },
  { upTo: 500_000, rate: 0.30 },
  { upTo: 800_000, rate: 0.325 },
  { upTo: Infinity, rate: 0.35 },
];

/** Personal relief KES 2,400/month. */
export const PAYE_PERSONAL_RELIEF = 2_400;

/** Indicative Kenya PAYE for a taxable monthly amount (KES). */
export function computePaye(taxable: number): number {
  if (taxable <= 0) return 0;
  let remaining = taxable;
  let prevCap = 0;
  let tax = 0;
  for (const band of PAYE_BANDS) {
    const span = band.upTo - prevCap;
    const taxedHere = Math.min(remaining, span);
    tax += taxedHere * band.rate;
    remaining -= taxedHere;
    prevCap = band.upTo;
    if (remaining <= 0) break;
  }
  return Math.max(0, tax - PAYE_PERSONAL_RELIEF);
}

/** NSSF tier-I + tier-II employee contribution (KES, 2024+ schedule).
 *  Tier I: 6% of pensionable pay up to 8,000  → max 480
 *  Tier II: 6% from 8,001 up to 72,000        → max 3,840
 *  Combined max employee = 4,320 (post-2024). Employer matches 1:1. */
export function computeNssfEmployee(gross: number): number {
  const tier1 = Math.min(gross, 8_000) * 0.06;
  const tier2 = Math.min(Math.max(0, gross - 8_000), 64_000) * 0.06;
  return Math.round(tier1 + tier2);
}

/** SHA (Social Health Authority) 2.75% of gross, min KES 300. */
export function computeSha(gross: number): number {
  return Math.max(300, Math.round(gross * 0.0275));
}

/** Affordable Housing Levy 1.5% on each side of gross. */
export function computeAhl(gross: number): number {
  return Math.round(gross * 0.015);
}

/** NITA: KES 50/month flat employer levy. No employee deduction. */
export const NITA_EMPLOYER = 50;
