"use server";

import { revalidatePath } from "next/cache";
import {
  activeContractFor as repoActiveContract,
  createContract as repoCreateContract,
  createDepartment as repoCreateDept,
  createEmployee as repoCreateEmployee,
  getContract,
  getDepartment,
  getEmployee,
  getEmployeeByDriverId,
  listContracts as repoListContracts,
  listDepartments as repoListDepartments,
  listEmployees as repoListEmployees,
  monthlyCostForEmployee as repoMonthlyCost,
  nextEmployeeNumber as repoNextEmpNumber,
  terminateContract as repoTerminateContract,
  updateEmployee as repoUpdateEmployee,
} from "@/server/repos/hr";
import { getDriver, listDrivers } from "@/server/repos/drivers";
import { logAudit } from "@/server/auth/audit";
import { guard } from "@/server/auth/permissions";
import type { EmployeeStatus, ContractStatus } from "@/lib/types/hr";
import {
  contractCreateSchema,
  departmentCreateSchema,
  employeeCreateSchema,
  type ContractCreateInput,
  type DepartmentCreateInput,
  type EmployeeCreateInput,
} from "@/lib/validators/hr";

export async function listDepartments() {
  return repoListDepartments();
}
export async function getDepartmentById(id: string) {
  return getDepartment(id);
}

export async function listEmployees(filter?: {
  departmentId?: string;
  status?: EmployeeStatus;
  search?: string;
}) {
  return repoListEmployees(filter);
}

export async function getEmployeeById(id: string) {
  const employee = await getEmployee(id);
  if (!employee) return undefined;
  const [department, lineManager, driver, activeContract, monthlyCost, contracts] = await Promise.all([
    getDepartment(employee.departmentId),
    employee.lineManagerId ? getEmployee(employee.lineManagerId) : Promise.resolve(undefined),
    employee.driverId ? getDriver(employee.driverId) : Promise.resolve(undefined),
    repoActiveContract(employee.id),
    repoMonthlyCost(employee.id),
    repoListContracts({ employeeId: employee.id }),
  ]);
  return {
    ...employee,
    department,
    lineManager,
    driver,
    activeContract,
    monthlyCost,
    contracts,
  };
}

export async function getEmployeeForDriver(driverId: string) {
  return getEmployeeByDriverId(driverId);
}

export async function getNextEmployeeNumber() {
  return repoNextEmpNumber();
}

export async function listManagerCandidates() {
  const all = await repoListEmployees({ status: "active" });
  return all.map((e) => ({ id: e.id, name: `${e.fullName} — ${e.jobTitle}` }));
}

export async function listUnlinkedDrivers() {
  const all = await listDrivers();
  const result: typeof all = [];
  for (const d of all) {
    const emp = await getEmployeeByDriverId(d.id);
    if (!emp) result.push(d);
  }
  return result;
}

export type ActionResult = { ok: true; id: string } | { ok: false; error: string };

export async function createEmployee(input: EmployeeCreateInput): Promise<ActionResult> {
  const denied = await guard("hr.write");
  if (denied) return denied;
  const parsed = employeeCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const e = await repoCreateEmployee({
    ...parsed.data,
    email: parsed.data.email || undefined,
  });
  await logAudit({ entityType: "employee", entityId: e.id, action: "create", diff: { name: { from: null, to: e.fullName } } });
  revalidatePath("/hr");
  revalidatePath("/hr/employees");
  return { ok: true, id: e.id };
}

export async function updateEmployeeStatus(id: string, status: EmployeeStatus): Promise<ActionResult> {
  const denied = await guard("hr.write");
  if (denied) return denied;
  const updated = await repoUpdateEmployee(id, { status });
  if (!updated) return { ok: false, error: "Not found" };
  await logAudit({ entityType: "employee", entityId: id, action: "status_change", diff: { status: { from: null, to: status } } });
  revalidatePath("/hr/employees");
  revalidatePath(`/hr/employees/${id}`);
  return { ok: true, id };
}

export async function createDepartment(input: DepartmentCreateInput): Promise<ActionResult> {
  const denied = await guard("hr.write");
  if (denied) return denied;
  const parsed = departmentCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const d = await repoCreateDept(parsed.data);
  await logAudit({ entityType: "department", entityId: d.id, action: "create" });
  revalidatePath("/hr/departments");
  return { ok: true, id: d.id };
}

export async function listContracts(filter?: { employeeId?: string; status?: ContractStatus }) {
  return repoListContracts(filter);
}
export async function getContractById(id: string) {
  return getContract(id);
}

export async function createContract(input: ContractCreateInput): Promise<ActionResult> {
  const denied = await guard("hr.write");
  if (denied) return denied;
  const parsed = contractCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const c = await repoCreateContract({ ...parsed.data, status: "active" });
  await logAudit({ entityType: "contract", entityId: c.id, action: "create", diff: { employeeId: { from: null, to: parsed.data.employeeId } } });
  revalidatePath(`/hr/employees/${parsed.data.employeeId}`);
  return { ok: true, id: c.id };
}

export async function terminateContract(id: string, employeeId: string): Promise<ActionResult> {
  const denied = await guard("hr.write");
  if (denied) return denied;
  const c = await repoTerminateContract(id);
  if (!c) return { ok: false, error: "Not found" };
  await logAudit({ entityType: "contract", entityId: id, action: "terminate" });
  revalidatePath(`/hr/employees/${employeeId}`);
  return { ok: true, id };
}
