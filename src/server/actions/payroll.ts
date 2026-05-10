"use server";

import { revalidatePath } from "next/cache";
import {
  cancelLoan as storeCancelLoan,
  createLoan as storeCreateLoan,
  createPayrollPeriod as storeCreatePeriod,
  getEmployee,
  getLoan,
  getPayrollInput,
  getPayrollPeriod,
  listLoans as storeListLoans,
  listPayrollInputs as storeListInputs,
  listPayrollPeriods as storeListPeriods,
  payrollTotals as storeTotals,
  setPayrollPeriodStatus as storeSetStatus,
  updatePayrollInput as storeUpdateInput,
} from "@/server/store/mock-store";
import type { LoanStatus, PayrollPeriodStatus } from "@/lib/types/payroll";
import { notify } from "@/server/notifications/service";
import {
  loanCreateSchema,
  payrollInputUpdateSchema,
  payrollPeriodCreateSchema,
  type LoanCreateInput,
  type PayrollInputUpdateInput,
  type PayrollPeriodCreateInput,
} from "@/lib/validators/payroll";

export async function listPayrollPeriods() {
  return storeListPeriods();
}
export async function getPayrollPeriodById(id: string) {
  return getPayrollPeriod(id);
}
export async function listPayrollInputs(periodId: string) {
  return storeListInputs(periodId);
}
export async function getPayrollInputById(periodId: string, employeeId: string) {
  return getPayrollInput(periodId, employeeId);
}
export async function payrollTotals(periodId: string) {
  return storeTotals(periodId);
}

export type ActionResult = { ok: true; id: string } | { ok: false; error: string };

export async function createPayrollPeriod(input: PayrollPeriodCreateInput): Promise<ActionResult> {
  const parsed = payrollPeriodCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const r = storeCreatePeriod(parsed.data);
  if ("error" in r) return { ok: false, error: r.error };
  revalidatePath("/hr/payroll");
  return { ok: true, id: r.id };
}

export async function setPayrollPeriodStatus(
  id: string,
  status: PayrollPeriodStatus,
): Promise<ActionResult> {
  const r = storeSetStatus(id, status);
  if (!r) return { ok: false, error: "Not found" };
  revalidatePath("/hr/payroll");
  revalidatePath(`/hr/payroll/${id}`);
  revalidatePath("/hr/loans");

  if (status === "paid") {
    // Fan out per-employee payslip notification
    const inputs = storeListInputs(id);
    for (const inp of inputs) {
      const emp = getEmployee(inp.employeeId);
      const bankOrMpesa = emp?.bankAccountNo
        ? `${emp.bankName ?? "Bank"} ****${emp.bankAccountNo.slice(-4)}`
        : `M-Pesa ${emp?.mpesaPhone ?? ""}`;
      await notify({
        category: "payroll_period_paid",
        recipientId: inp.employeeId,
        payload: {
          period: r.yearMonth,
          grossPay: inp.grossPay.toLocaleString(),
          deductions: inp.totalDeductions.toLocaleString(),
          netPay: inp.netPay.toLocaleString(),
          bankOrMpesa,
        },
        href: `/hr/payroll/${id}/${inp.employeeId}`,
        priority: "high",
      });
    }
  }
  return { ok: true, id: r.id };
}

export async function updatePayrollInput(input: PayrollInputUpdateInput): Promise<ActionResult> {
  const parsed = payrollInputUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const r = storeUpdateInput(parsed.data);
  if ("error" in r) return { ok: false, error: r.error };
  revalidatePath(`/hr/payroll/${parsed.data.periodId}`);
  revalidatePath(`/hr/payroll/${parsed.data.periodId}/${parsed.data.employeeId}`);
  return { ok: true, id: r.id };
}

// ---- Loans ----
export async function listLoans(filter?: { employeeId?: string; status?: LoanStatus }) {
  return storeListLoans(filter);
}
export async function getLoanById(id: string) {
  const l = getLoan(id);
  if (!l) return undefined;
  const employee = getEmployee(l.employeeId);
  return { ...l, employee };
}
export async function createLoan(input: LoanCreateInput): Promise<ActionResult> {
  const parsed = loanCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const r = storeCreateLoan(parsed.data);
  if ("error" in r) return { ok: false, error: r.error };
  revalidatePath("/hr/loans");
  revalidatePath(`/hr/employees/${parsed.data.employeeId}`);

  await notify({
    category: "loan_disbursed",
    recipientId: r.employeeId,
    payload: {
      number: r.number,
      principal: r.principal.toLocaleString(),
      monthlyRecovery: r.monthlyRecovery.toLocaleString(),
      termMonths: String(r.termMonths),
    },
    href: `/hr/loans/${r.id}`,
  });
  return { ok: true, id: r.id };
}
export async function cancelLoan(id: string): Promise<ActionResult> {
  const r = storeCancelLoan(id);
  if ("error" in r) return { ok: false, error: r.error };
  revalidatePath("/hr/loans");
  revalidatePath(`/hr/loans/${id}`);
  return { ok: true, id: r.id };
}
