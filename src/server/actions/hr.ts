"use server";

import { revalidatePath } from "next/cache";
import {
  activeContractFor as storeActiveContract,
  createContract as storeCreateContract,
  createDepartment as storeCreateDept,
  createEmployee as storeCreateEmployee,
  getContract,
  getDepartment,
  getDriver,
  getEmployee,
  getEmployeeByDriverId,
  listContracts as storeListContracts,
  listDepartments as storeListDepartments,
  listDrivers,
  listEmployees as storeListEmployees,
  monthlyCostForEmployee as storeMonthlyCost,
  nextEmployeeNumber,
  terminateContract as storeTerminateContract,
  updateEmployee as storeUpdateEmployee,
} from "@/server/store/mock-store";
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
  return storeListDepartments();
}
export async function getDepartmentById(id: string) {
  return getDepartment(id);
}

export async function listEmployees(filter?: {
  departmentId?: string;
  status?: EmployeeStatus;
  search?: string;
}) {
  return storeListEmployees(filter);
}

export async function getEmployeeById(id: string) {
  const employee = getEmployee(id);
  if (!employee) return undefined;
  const department = getDepartment(employee.departmentId);
  const lineManager = employee.lineManagerId ? getEmployee(employee.lineManagerId) : undefined;
  const driver = employee.driverId ? getDriver(employee.driverId) : undefined;
  const activeContract = storeActiveContract(employee.id);
  const monthlyCost = storeMonthlyCost(employee.id);
  const allContracts = storeListContracts({ employeeId: employee.id });
  return {
    ...employee,
    department,
    lineManager,
    driver,
    activeContract,
    monthlyCost,
    contracts: allContracts,
  };
}

export async function getEmployeeForDriver(driverId: string) {
  return getEmployeeByDriverId(driverId);
}

export async function getNextEmployeeNumber() {
  return nextEmployeeNumber();
}

export async function listManagerCandidates() {
  // Anyone active in management or department-head positions
  return storeListEmployees({ status: "active" }).map((e) => ({
    id: e.id,
    name: `${e.fullName} — ${e.jobTitle}`,
  }));
}

export async function listUnlinkedDrivers() {
  // Drivers without an Employee record
  const all = listDrivers();
  return all.filter((d) => !getEmployeeByDriverId(d.id));
}

export type ActionResult = { ok: true; id: string } | { ok: false; error: string };

export async function createEmployee(input: EmployeeCreateInput): Promise<ActionResult> {
  const parsed = employeeCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const e = storeCreateEmployee({
    ...parsed.data,
    email: parsed.data.email || undefined,
  });
  revalidatePath("/hr");
  revalidatePath("/hr/employees");
  return { ok: true, id: e.id };
}

export async function updateEmployeeStatus(id: string, status: EmployeeStatus): Promise<ActionResult> {
  const updated = storeUpdateEmployee(id, { status });
  if (!updated) return { ok: false, error: "Not found" };
  revalidatePath("/hr/employees");
  revalidatePath(`/hr/employees/${id}`);
  return { ok: true, id };
}

export async function createDepartment(input: DepartmentCreateInput): Promise<ActionResult> {
  const parsed = departmentCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const d = storeCreateDept(parsed.data);
  revalidatePath("/hr/departments");
  return { ok: true, id: d.id };
}

export async function listContracts(filter?: { employeeId?: string; status?: ContractStatus }) {
  return storeListContracts(filter);
}
export async function getContractById(id: string) {
  return getContract(id);
}

export async function createContract(input: ContractCreateInput): Promise<ActionResult> {
  const parsed = contractCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const c = storeCreateContract({ ...parsed.data, status: "active" });
  revalidatePath(`/hr/employees/${parsed.data.employeeId}`);
  return { ok: true, id: c.id };
}

export async function terminateContract(id: string, employeeId: string): Promise<ActionResult> {
  const c = storeTerminateContract(id);
  if (!c) return { ok: false, error: "Not found" };
  revalidatePath(`/hr/employees/${employeeId}`);
  return { ok: true, id };
}
