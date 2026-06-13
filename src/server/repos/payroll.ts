/**
 * Payroll + Loans repo — dual-mode (Postgres / mock store). Org-scoped.
 *
 * Creating a period seeds a PayrollInput per active employee from each active
 * contract. PAYE / NSSF / SHA / AHL / NITA all compute via pure helpers in
 * @/lib/types/payroll so the math stays identical across modes. Marking a
 * period 'paid' recovers each input's loan_recovery across the employee's
 * active loans (oldest first), flipping any cleared loan to 'paid_off'.
 *
 * Loans: LN-YYYY-NNNNN issued atomically.
 */
import { and, asc, desc, eq } from "drizzle-orm";
import { IS_DEMO_MODE } from "@/server/auth/session-secret";
import { requireOrgId } from "@/server/auth/current-org";
import { getDb } from "@/server/db/client";
import {
  loans as loansTable,
  payrollInputs as inputsTable,
  payrollPeriods as periodsTable,
  employees as empsTable,
} from "@/server/db/schema";
import { nextDocumentNumber } from "@/server/repos/counters";
import { activeContractFor, getEmployee, listEmployees } from "@/server/repos/hr";
import {
  cancelLoan as storeCancelLoan,
  createLoan as storeCreateLoan,
  createPayrollPeriod as storeCreatePeriod,
  getLoan as storeGetLoan,
  getPayrollInput as storeGetInput,
  getPayrollPeriod as storeGetPeriod,
  listLoans as storeListLoans,
  listPayrollInputs as storeListInputs,
  listPayrollPeriods as storeListPeriods,
  payrollTotals as storeTotals,
  setPayrollPeriodStatus as storeSetStatus,
  updatePayrollInput as storeUpdateInput,
} from "@/server/store/mock-store";
import {
  computeAhl,
  computeNssfEmployee,
  computePaye,
  computeSha,
  NITA_EMPLOYER,
  type Loan,
  type LoanStatus,
  type PayrollAllowance,
  type PayrollInput,
  type PayrollPeriod,
  type PayrollPeriodStatus,
} from "@/lib/types/payroll";
import type { Currency } from "@/lib/types/ledger";

type PRow = typeof periodsTable.$inferSelect;
type IRow = typeof inputsTable.$inferSelect;
type LRow = typeof loansTable.$inferSelect;

function ymToDates(yearMonth: string): { startDate: string; endDate: string } {
  const [y, m] = yearMonth.split("-").map(Number);
  const startDate = `${yearMonth}-01`;
  const lastDay = new Date(y!, m!, 0).getDate();
  return { startDate, endDate: `${yearMonth}-${String(lastDay).padStart(2, "0")}` };
}

function toPeriod(r: PRow): PayrollPeriod {
  return {
    id: r.id,
    yearMonth: r.yearMonth,
    startDate: r.startDate,
    endDate: r.endDate,
    status: r.status as PayrollPeriodStatus,
    processedAt: r.processedAt?.toISOString(),
    paidAt: r.paidAt?.toISOString(),
    notes: r.notes ?? undefined,
    createdAt: r.createdAt.toISOString(),
  };
}

function toInput(r: IRow): PayrollInput {
  return {
    id: r.id,
    periodId: r.periodId,
    employeeId: r.employeeId,
    basicSalary: Number(r.basicSalary),
    currency: r.currency as Currency,
    allowances: (r.allowances as PayrollAllowance[]) ?? [],
    overtimeHours: Number(r.overtimeHours),
    overtimeRate: Number(r.overtimeRate),
    bonus: Number(r.bonus),
    otherDeductions: Number(r.otherDeductions),
    loanRecovery: Number(r.loanRecovery),
    paye: Number(r.paye),
    nssfEmployee: Number(r.nssfEmployee),
    nssfEmployer: Number(r.nssfEmployer),
    shaEmployee: Number(r.shaEmployee),
    nitaEmployer: Number(r.nitaEmployer),
    ahlEmployee: Number(r.ahlEmployee),
    ahlEmployer: Number(r.ahlEmployer),
    grossPay: Number(r.grossPay),
    totalDeductions: Number(r.totalDeductions),
    netPay: Number(r.netPay),
    employerCost: Number(r.employerCost),
    notes: r.notes ?? undefined,
    createdAt: r.createdAt.toISOString(),
  };
}

function toLoan(r: LRow): Loan {
  return {
    id: r.id,
    number: r.number,
    employeeId: r.employeeId,
    principal: Number(r.principal),
    currency: r.currency as Currency,
    disbursedDate: r.disbursedDate,
    monthlyRecovery: Number(r.monthlyRecovery),
    termMonths: r.termMonths,
    interestRate: Number(r.interestRate),
    recovered: Number(r.recovered),
    balance: Number(r.balance),
    status: r.status as LoanStatus,
    reason: r.reason ?? undefined,
    notes: r.notes ?? undefined,
    createdAt: r.createdAt.toISOString(),
  };
}

/** Pure helper — same math as the store. */
function computeLine(line: PayrollInput): PayrollInput {
  const allowancesTaxable = line.allowances.filter((a) => a.taxable).reduce((s, a) => s + a.amount, 0);
  const allowancesNonTaxable = line.allowances.filter((a) => !a.taxable).reduce((s, a) => s + a.amount, 0);
  const overtime = line.overtimeHours * line.overtimeRate;
  const grossPay = line.basicSalary + allowancesTaxable + allowancesNonTaxable + overtime + line.bonus;
  const taxable = line.basicSalary + allowancesTaxable + overtime + line.bonus;
  const nssfEmployee = computeNssfEmployee(grossPay);
  const nssfEmployer = nssfEmployee;
  const shaEmployee = computeSha(grossPay);
  const ahlEmployee = computeAhl(grossPay);
  const ahlEmployer = ahlEmployee;
  const paye = computePaye(taxable - nssfEmployee - shaEmployee - ahlEmployee);
  const totalDeductions = paye + nssfEmployee + shaEmployee + ahlEmployee + line.otherDeductions + line.loanRecovery;
  const netPay = grossPay - totalDeductions;
  const employerCost = grossPay + nssfEmployer + ahlEmployer + NITA_EMPLOYER;
  return {
    ...line,
    paye: Math.round(paye),
    nssfEmployee,
    nssfEmployer,
    shaEmployee,
    nitaEmployer: NITA_EMPLOYER,
    ahlEmployee,
    ahlEmployer,
    grossPay: Math.round(grossPay),
    totalDeductions: Math.round(totalDeductions),
    netPay: Math.round(netPay),
    employerCost: Math.round(employerCost),
  };
}

// ---- Periods + inputs ----
export async function listPayrollPeriods(): Promise<PayrollPeriod[]> {
  if (IS_DEMO_MODE) return storeListPeriods();
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .select()
    .from(periodsTable)
    .where(eq(periodsTable.organizationId, orgId))
    .orderBy(desc(periodsTable.yearMonth));
  return rows.map(toPeriod);
}

export async function getPayrollPeriod(id: string): Promise<PayrollPeriod | undefined> {
  if (IS_DEMO_MODE) return storeGetPeriod(id);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .select()
    .from(periodsTable)
    .where(and(eq(periodsTable.id, id), eq(periodsTable.organizationId, orgId)))
    .limit(1);
  return rows[0] ? toPeriod(rows[0]) : undefined;
}

export async function createPayrollPeriod(input: { yearMonth: string; notes?: string }): Promise<
  PayrollPeriod | { error: string }
> {
  if (IS_DEMO_MODE) return storeCreatePeriod(input);
  if (!/^\d{4}-\d{2}$/.test(input.yearMonth)) return { error: "yearMonth must be YYYY-MM" };
  const db = getDb();
  const orgId = await requireOrgId();
  const existing = await db
    .select({ id: periodsTable.id })
    .from(periodsTable)
    .where(and(eq(periodsTable.organizationId, orgId), eq(periodsTable.yearMonth, input.yearMonth)))
    .limit(1);
  if (existing[0]) return { error: "Period already exists" };
  const { startDate, endDate } = ymToDates(input.yearMonth);
  const period = (
    await db
      .insert(periodsTable)
      .values({
        organizationId: orgId,
        yearMonth: input.yearMonth,
        startDate,
        endDate,
        status: "draft",
        notes: input.notes ?? null,
      })
      .returning()
  )[0]!;

  // Seed PayrollInput from each active employee's active contract.
  const emps = await listEmployees();
  for (const e of emps) {
    if (e.status === "terminated") continue;
    const contract = await activeContractFor(e.id);
    if (!contract) continue;
    const empLoans = await db
      .select()
      .from(loansTable)
      .where(
        and(
          eq(loansTable.organizationId, orgId),
          eq(loansTable.employeeId, e.id),
          eq(loansTable.status, "active"),
        ),
      );
    const loanRecovery = empLoans.reduce(
      (s, l) => s + Math.min(Number(l.monthlyRecovery), Number(l.balance)),
      0,
    );
    const computed = computeLine({
      id: "",
      periodId: period.id,
      employeeId: e.id,
      basicSalary: contract.basicSalary,
      currency: contract.currency,
      allowances: contract.allowances,
      overtimeHours: 0,
      overtimeRate: 0,
      bonus: 0,
      otherDeductions: 0,
      loanRecovery,
      paye: 0,
      nssfEmployee: 0,
      nssfEmployer: 0,
      shaEmployee: 0,
      nitaEmployer: 0,
      ahlEmployee: 0,
      ahlEmployer: 0,
      grossPay: 0,
      totalDeductions: 0,
      netPay: 0,
      employerCost: 0,
      createdAt: "",
    });
    await db.insert(inputsTable).values({
      organizationId: orgId,
      periodId: period.id,
      employeeId: e.id,
      basicSalary: String(computed.basicSalary),
      currency: computed.currency,
      allowances: computed.allowances,
      overtimeHours: String(computed.overtimeHours),
      overtimeRate: String(computed.overtimeRate),
      bonus: String(computed.bonus),
      otherDeductions: String(computed.otherDeductions),
      loanRecovery: String(computed.loanRecovery),
      paye: String(computed.paye),
      nssfEmployee: String(computed.nssfEmployee),
      nssfEmployer: String(computed.nssfEmployer),
      shaEmployee: String(computed.shaEmployee),
      nitaEmployer: String(computed.nitaEmployer),
      ahlEmployee: String(computed.ahlEmployee),
      ahlEmployer: String(computed.ahlEmployer),
      grossPay: String(computed.grossPay),
      totalDeductions: String(computed.totalDeductions),
      netPay: String(computed.netPay),
      employerCost: String(computed.employerCost),
    });
  }
  return toPeriod(period);
}

export async function setPayrollPeriodStatus(
  id: string,
  status: PayrollPeriodStatus,
): Promise<PayrollPeriod | undefined> {
  if (IS_DEMO_MODE) return storeSetStatus(id, status);
  const db = getDb();
  const orgId = await requireOrgId();
  const set: Partial<typeof periodsTable.$inferInsert> = { status };
  if (status === "processing" || status === "paid") set.processedAt = new Date();
  if (status === "paid") set.paidAt = new Date();
  const updated = (
    await db
      .update(periodsTable)
      .set(set)
      .where(and(eq(periodsTable.id, id), eq(periodsTable.organizationId, orgId)))
      .returning()
  )[0];
  if (!updated) return undefined;

  // On 'paid': recover each input's loan_recovery against active loans.
  if (status === "paid") {
    const inputs = await listPayrollInputs(id);
    for (const inp of inputs) {
      if (inp.loanRecovery <= 0) continue;
      let remaining = inp.loanRecovery;
      const empLoans = await db
        .select()
        .from(loansTable)
        .where(
          and(
            eq(loansTable.organizationId, orgId),
            eq(loansTable.employeeId, inp.employeeId),
            eq(loansTable.status, "active"),
          ),
        )
        .orderBy(asc(loansTable.disbursedDate));
      for (const l of empLoans) {
        if (remaining <= 0) break;
        const bal = Number(l.balance);
        const apply = Math.min(remaining, bal);
        const newBal = bal - apply;
        await db
          .update(loansTable)
          .set({
            recovered: String(Number(l.recovered) + apply),
            balance: String(newBal),
            status: newBal <= 0 ? "paid_off" : "active",
          })
          .where(eq(loansTable.id, l.id));
        remaining -= apply;
      }
    }
  }
  return toPeriod(updated);
}

export async function listPayrollInputs(periodId: string): Promise<PayrollInput[]> {
  if (IS_DEMO_MODE) return storeListInputs(periodId);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .select({
      input: inputsTable,
      employeeNumber: empsTable.employeeNumber,
    })
    .from(inputsTable)
    .leftJoin(empsTable, eq(inputsTable.employeeId, empsTable.id))
    .where(and(eq(inputsTable.periodId, periodId), eq(inputsTable.organizationId, orgId)));
  return rows
    .sort((a, b) => (a.employeeNumber ?? "").localeCompare(b.employeeNumber ?? ""))
    .map((r) => toInput(r.input));
}

export async function getPayrollInput(
  periodId: string,
  employeeId: string,
): Promise<PayrollInput | undefined> {
  if (IS_DEMO_MODE) return storeGetInput(periodId, employeeId);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .select()
    .from(inputsTable)
    .where(
      and(
        eq(inputsTable.organizationId, orgId),
        eq(inputsTable.periodId, periodId),
        eq(inputsTable.employeeId, employeeId),
      ),
    )
    .limit(1);
  return rows[0] ? toInput(rows[0]) : undefined;
}

export async function updatePayrollInput(input: {
  periodId: string;
  employeeId: string;
  basicSalary: number;
  overtimeHours: number;
  overtimeRate: number;
  bonus: number;
  otherDeductions: number;
  loanRecovery: number;
  notes?: string;
}): Promise<PayrollInput | { error: string }> {
  if (IS_DEMO_MODE) return storeUpdateInput(input);
  const period = await getPayrollPeriod(input.periodId);
  if (period && (period.status === "paid" || period.status === "closed")) {
    return { error: `Period is ${period.status} — locked` };
  }
  const existing = await getPayrollInput(input.periodId, input.employeeId);
  if (!existing) return { error: "Payroll input not found" };
  const recomputed = computeLine({
    ...existing,
    basicSalary: input.basicSalary,
    overtimeHours: input.overtimeHours,
    overtimeRate: input.overtimeRate,
    bonus: input.bonus,
    otherDeductions: input.otherDeductions,
    loanRecovery: input.loanRecovery,
    notes: input.notes,
  });
  const db = getDb();
  const rows = await db
    .update(inputsTable)
    .set({
      basicSalary: String(recomputed.basicSalary),
      overtimeHours: String(recomputed.overtimeHours),
      overtimeRate: String(recomputed.overtimeRate),
      bonus: String(recomputed.bonus),
      otherDeductions: String(recomputed.otherDeductions),
      loanRecovery: String(recomputed.loanRecovery),
      paye: String(recomputed.paye),
      nssfEmployee: String(recomputed.nssfEmployee),
      nssfEmployer: String(recomputed.nssfEmployer),
      shaEmployee: String(recomputed.shaEmployee),
      nitaEmployer: String(recomputed.nitaEmployer),
      ahlEmployee: String(recomputed.ahlEmployee),
      ahlEmployer: String(recomputed.ahlEmployer),
      grossPay: String(recomputed.grossPay),
      totalDeductions: String(recomputed.totalDeductions),
      netPay: String(recomputed.netPay),
      employerCost: String(recomputed.employerCost),
      notes: recomputed.notes ?? null,
    })
    .where(eq(inputsTable.id, existing.id))
    .returning();
  return rows[0] ? toInput(rows[0]) : { error: "Update failed" };
}

export async function payrollTotals(periodId: string) {
  if (IS_DEMO_MODE) return storeTotals(periodId);
  const lines = await listPayrollInputs(periodId);
  return lines.reduce(
    (acc, l) => {
      acc.count++;
      acc.grossPay += l.grossPay;
      acc.paye += l.paye;
      acc.nssfEmployee += l.nssfEmployee;
      acc.shaEmployee += l.shaEmployee;
      acc.ahlEmployee += l.ahlEmployee;
      acc.loanRecovery += l.loanRecovery;
      acc.totalDeductions += l.totalDeductions;
      acc.netPay += l.netPay;
      acc.employerCost += l.employerCost;
      return acc;
    },
    { count: 0, grossPay: 0, paye: 0, nssfEmployee: 0, shaEmployee: 0, ahlEmployee: 0, loanRecovery: 0, totalDeductions: 0, netPay: 0, employerCost: 0 },
  );
}

// ---- Loans ----
export async function listLoans(filter?: { employeeId?: string; status?: LoanStatus }): Promise<Loan[]> {
  if (IS_DEMO_MODE) return storeListLoans(filter);
  const db = getDb();
  const orgId = await requireOrgId();
  const where = [eq(loansTable.organizationId, orgId)];
  if (filter?.employeeId) where.push(eq(loansTable.employeeId, filter.employeeId));
  if (filter?.status) where.push(eq(loansTable.status, filter.status));
  const rows = await db.select().from(loansTable).where(and(...where)).orderBy(desc(loansTable.disbursedDate));
  return rows.map(toLoan);
}

export async function getLoan(id: string): Promise<Loan | undefined> {
  if (IS_DEMO_MODE) return storeGetLoan(id);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .select()
    .from(loansTable)
    .where(and(eq(loansTable.id, id), eq(loansTable.organizationId, orgId)))
    .limit(1);
  return rows[0] ? toLoan(rows[0]) : undefined;
}

export async function createLoan(input: {
  employeeId: string;
  principal: number;
  currency: Currency;
  disbursedDate: string;
  termMonths: number;
  monthlyRecovery: number;
  interestRate: number;
  reason?: string;
  notes?: string;
}): Promise<Loan | { error: string }> {
  if (IS_DEMO_MODE) return storeCreateLoan(input);
  const employee = await getEmployee(input.employeeId);
  if (!employee) return { error: "Employee not found" };
  const db = getDb();
  const orgId = await requireOrgId();
  const number = await nextDocumentNumber(orgId, "LN", "loan", 5);
  const rows = await db
    .insert(loansTable)
    .values({
      organizationId: orgId,
      number,
      employeeId: input.employeeId,
      principal: String(input.principal),
      currency: input.currency,
      disbursedDate: input.disbursedDate,
      termMonths: input.termMonths,
      monthlyRecovery: String(input.monthlyRecovery),
      interestRate: String(input.interestRate),
      recovered: "0",
      balance: String(input.principal),
      status: "active",
      reason: input.reason ?? null,
      notes: input.notes ?? null,
    })
    .returning();
  return toLoan(rows[0]!);
}

export async function cancelLoan(id: string): Promise<Loan | { error: string }> {
  if (IS_DEMO_MODE) return storeCancelLoan(id);
  const cur = await getLoan(id);
  if (!cur) return { error: "Not found" };
  if (cur.status === "paid_off") return { error: "Already paid off" };
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .update(loansTable)
    .set({ status: "cancelled" })
    .where(and(eq(loansTable.id, id), eq(loansTable.organizationId, orgId)))
    .returning();
  return rows[0] ? toLoan(rows[0]) : { error: "Not found" };
}
