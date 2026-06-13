"use server";

import { revalidatePath } from "next/cache";
import {
  cancelLoan as repoCancelLoan,
  createLoan as repoCreateLoan,
  createPayrollPeriod as repoCreatePeriod,
  getLoan,
  getPayrollInput,
  getPayrollPeriod,
  listLoans as repoListLoans,
  listPayrollInputs as repoListInputs,
  listPayrollPeriods as repoListPeriods,
  payrollTotals as repoTotals,
  setPayrollPeriodStatus as repoSetStatus,
  updatePayrollInput as repoUpdateInput,
} from "@/server/repos/payroll";
import { getEmployee } from "@/server/repos/hr";
import type { LoanStatus, PayrollPeriodStatus } from "@/lib/types/payroll";
import {
  loanCreateSchema,
  payrollInputUpdateSchema,
  payrollPeriodCreateSchema,
  type LoanCreateInput,
  type PayrollInputUpdateInput,
  type PayrollPeriodCreateInput,
} from "@/lib/validators/payroll";

export async function listPayrollPeriods() {
  return repoListPeriods();
}
export async function getPayrollPeriodById(id: string) {
  return getPayrollPeriod(id);
}
export async function listPayrollInputs(periodId: string) {
  return repoListInputs(periodId);
}
export async function getPayrollInputById(periodId: string, employeeId: string) {
  return getPayrollInput(periodId, employeeId);
}
export async function payrollTotals(periodId: string) {
  return repoTotals(periodId);
}

export type ActionResult = { ok: true; id: string } | { ok: false; error: string };

export async function createPayrollPeriod(input: PayrollPeriodCreateInput): Promise<ActionResult> {
  const parsed = payrollPeriodCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const r = await repoCreatePeriod(parsed.data);
  if ("error" in r) return { ok: false, error: r.error };
  revalidatePath("/hr/payroll");
  return { ok: true, id: r.id };
}

export async function setPayrollPeriodStatus(
  id: string,
  status: PayrollPeriodStatus,
): Promise<ActionResult> {
  const r = await repoSetStatus(id, status);
  if (!r) return { ok: false, error: "Not found" };
  revalidatePath("/hr/payroll");
  revalidatePath(`/hr/payroll/${id}`);
  revalidatePath("/hr/loans");
  return { ok: true, id: r.id };
}

export async function updatePayrollInput(input: PayrollInputUpdateInput): Promise<ActionResult> {
  const parsed = payrollInputUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const r = await repoUpdateInput(parsed.data);
  if ("error" in r) return { ok: false, error: r.error };
  revalidatePath(`/hr/payroll/${parsed.data.periodId}`);
  revalidatePath(`/hr/payroll/${parsed.data.periodId}/${parsed.data.employeeId}`);
  return { ok: true, id: r.id };
}

export async function listLoans(filter?: { employeeId?: string; status?: LoanStatus }) {
  return repoListLoans(filter);
}
export async function getLoanById(id: string) {
  const l = await getLoan(id);
  if (!l) return undefined;
  const employee = await getEmployee(l.employeeId);
  return { ...l, employee };
}
export async function createLoan(input: LoanCreateInput): Promise<ActionResult> {
  const parsed = loanCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const r = await repoCreateLoan(parsed.data);
  if ("error" in r) return { ok: false, error: r.error };
  revalidatePath("/hr/loans");
  revalidatePath(`/hr/employees/${parsed.data.employeeId}`);
  return { ok: true, id: r.id };
}
export async function cancelLoan(id: string): Promise<ActionResult> {
  const r = await repoCancelLoan(id);
  if ("error" in r) return { ok: false, error: r.error };
  revalidatePath("/hr/loans");
  revalidatePath(`/hr/loans/${id}`);
  return { ok: true, id: r.id };
}
