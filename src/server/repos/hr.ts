/**
 * HR repo — departments + employees + contracts. Dual-mode, org-scoped.
 *
 * Employee numbers follow the NVL-### convention (max + 1 per org). Contracts
 * carry a jsonb `allowances` array and roll up into the active monthly cost.
 */
import { and, asc, desc, eq } from "drizzle-orm";
import { IS_DEMO_MODE } from "@/server/auth/session-secret";
import { requireOrgId } from "@/server/auth/current-org";
import { getDb } from "@/server/db/client";
import {
  contracts as contractsTable,
  departments as deptsTable,
  employees as empsTable,
} from "@/server/db/schema";
import {
  activeContractFor as storeActive,
  createContract as storeCreateContract,
  createDepartment as storeCreateDept,
  createEmployee as storeCreateEmployee,
  getContract as storeGetContract,
  getDepartment as storeGetDept,
  getEmployee as storeGetEmployee,
  getEmployeeByDriverId as storeGetByDriver,
  listContracts as storeListContracts,
  listDepartments as storeListDepts,
  listEmployees as storeListEmployees,
  monthlyCostForEmployee as storeMonthlyCost,
  nextEmployeeNumber as storeNextEmpNumber,
  terminateContract as storeTerminate,
  updateEmployee as storeUpdateEmployee,
} from "@/server/store/mock-store";
import type {
  Contract,
  ContractAllowance,
  ContractStatus,
  ContractType,
  Department,
  Employee,
  EmployeeStatus,
  Gender,
  PayFrequency,
} from "@/lib/types/hr";
import type { Currency } from "@/lib/types/ledger";

type DRow = typeof deptsTable.$inferSelect;
type ERow = typeof empsTable.$inferSelect;
type CRow = typeof contractsTable.$inferSelect;

function toDept(r: DRow): Department {
  return {
    id: r.id,
    name: r.name,
    code: r.code,
    headEmployeeId: r.headEmployeeId ?? undefined,
    parentDepartmentId: r.parentDepartmentId ?? undefined,
    costCentre: r.costCentre ?? undefined,
    description: r.description ?? undefined,
  };
}

function toEmployee(r: ERow): Employee {
  return {
    id: r.id,
    employeeNumber: r.employeeNumber,
    fullName: r.fullName,
    preferredName: r.preferredName ?? undefined,
    gender: (r.gender as Gender | null) ?? undefined,
    dob: r.dob ?? undefined,
    nationalId: r.nationalId,
    kraPin: r.kraPin ?? undefined,
    nssfNo: r.nssfNo ?? undefined,
    shaNo: r.shaNo ?? undefined,
    mpesaPhone: r.mpesaPhone,
    alternatePhone: r.alternatePhone ?? undefined,
    email: r.email ?? undefined,
    physicalAddress: r.physicalAddress ?? undefined,
    emergencyContactName: r.emergencyContactName ?? undefined,
    emergencyContactRelationship: r.emergencyContactRelationship ?? undefined,
    emergencyContactPhone: r.emergencyContactPhone ?? undefined,
    bankName: r.bankName ?? undefined,
    bankBranch: r.bankBranch ?? undefined,
    bankAccountNo: r.bankAccountNo ?? undefined,
    bankAccountName: r.bankAccountName ?? undefined,
    hireDate: r.hireDate,
    terminationDate: r.terminationDate ?? undefined,
    status: r.status as EmployeeStatus,
    departmentId: r.departmentId,
    jobTitle: r.jobTitle,
    lineManagerId: r.lineManagerId ?? undefined,
    driverId: r.driverId ?? undefined,
    photoUrl: r.photoUrl ?? undefined,
    notes: r.notes ?? undefined,
    createdAt: r.createdAt.toISOString(),
  };
}

function toContract(r: CRow): Contract {
  return {
    id: r.id,
    employeeId: r.employeeId,
    type: r.type as ContractType,
    startDate: r.startDate,
    endDate: r.endDate ?? undefined,
    probationEndDate: r.probationEndDate ?? undefined,
    noticePeriodDays: r.noticePeriodDays,
    basicSalary: Number(r.basicSalary),
    currency: r.currency as Currency,
    payFrequency: r.payFrequency as PayFrequency,
    allowances: (r.allowances as ContractAllowance[]) ?? [],
    documentUrl: r.documentUrl ?? undefined,
    status: r.status as ContractStatus,
    notes: r.notes ?? undefined,
    createdAt: r.createdAt.toISOString(),
  };
}

// ----- Departments -----
export async function listDepartments(): Promise<Department[]> {
  if (IS_DEMO_MODE) return storeListDepts();
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .select()
    .from(deptsTable)
    .where(eq(deptsTable.organizationId, orgId))
    .orderBy(asc(deptsTable.code));
  return rows.map(toDept);
}

export async function getDepartment(id: string): Promise<Department | undefined> {
  if (IS_DEMO_MODE) return storeGetDept(id);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .select()
    .from(deptsTable)
    .where(and(eq(deptsTable.id, id), eq(deptsTable.organizationId, orgId)))
    .limit(1);
  return rows[0] ? toDept(rows[0]) : undefined;
}

export async function createDepartment(input: Omit<Department, "id">): Promise<Department> {
  if (IS_DEMO_MODE) return storeCreateDept(input);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .insert(deptsTable)
    .values({
      organizationId: orgId,
      name: input.name,
      code: input.code,
      headEmployeeId: input.headEmployeeId ?? null,
      parentDepartmentId: input.parentDepartmentId ?? null,
      costCentre: input.costCentre ?? null,
      description: input.description ?? null,
    })
    .returning();
  return toDept(rows[0]!);
}

// ----- Employees -----
export async function listEmployees(filter?: {
  departmentId?: string;
  status?: EmployeeStatus;
  search?: string;
}): Promise<Employee[]> {
  if (IS_DEMO_MODE) return storeListEmployees(filter);
  const db = getDb();
  const orgId = await requireOrgId();
  const where = [eq(empsTable.organizationId, orgId)];
  if (filter?.departmentId) where.push(eq(empsTable.departmentId, filter.departmentId));
  if (filter?.status) where.push(eq(empsTable.status, filter.status));
  const rows = await db
    .select()
    .from(empsTable)
    .where(and(...where))
    .orderBy(asc(empsTable.employeeNumber));
  let all = rows.map(toEmployee);
  if (filter?.search) {
    const q = filter.search.toLowerCase();
    all = all.filter(
      (e) =>
        e.fullName.toLowerCase().includes(q) ||
        e.employeeNumber.toLowerCase().includes(q) ||
        e.jobTitle.toLowerCase().includes(q) ||
        e.nationalId.includes(q),
    );
  }
  return all;
}

export async function getEmployee(id: string): Promise<Employee | undefined> {
  if (IS_DEMO_MODE) return storeGetEmployee(id);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .select()
    .from(empsTable)
    .where(and(eq(empsTable.id, id), eq(empsTable.organizationId, orgId)))
    .limit(1);
  return rows[0] ? toEmployee(rows[0]) : undefined;
}

export async function getEmployeeByDriverId(driverId: string): Promise<Employee | undefined> {
  if (IS_DEMO_MODE) return storeGetByDriver(driverId);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .select()
    .from(empsTable)
    .where(and(eq(empsTable.driverId, driverId), eq(empsTable.organizationId, orgId)))
    .limit(1);
  return rows[0] ? toEmployee(rows[0]) : undefined;
}

export async function nextEmployeeNumber(): Promise<string> {
  if (IS_DEMO_MODE) return storeNextEmpNumber();
  const all = await listEmployees();
  let max = 0;
  for (const e of all) {
    const m = e.employeeNumber.match(/^NVL-(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1]!, 10));
  }
  return `NVL-${String(max + 1).padStart(3, "0")}`;
}

export async function createEmployee(
  input: Omit<Employee, "id" | "createdAt">,
): Promise<Employee> {
  if (IS_DEMO_MODE) return storeCreateEmployee(input);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .insert(empsTable)
    .values({
      organizationId: orgId,
      employeeNumber: input.employeeNumber,
      fullName: input.fullName,
      preferredName: input.preferredName ?? null,
      gender: input.gender ?? null,
      dob: input.dob ?? null,
      nationalId: input.nationalId,
      kraPin: input.kraPin ?? null,
      nssfNo: input.nssfNo ?? null,
      shaNo: input.shaNo ?? null,
      mpesaPhone: input.mpesaPhone,
      alternatePhone: input.alternatePhone ?? null,
      email: input.email ?? null,
      physicalAddress: input.physicalAddress ?? null,
      emergencyContactName: input.emergencyContactName ?? null,
      emergencyContactRelationship: input.emergencyContactRelationship ?? null,
      emergencyContactPhone: input.emergencyContactPhone ?? null,
      bankName: input.bankName ?? null,
      bankBranch: input.bankBranch ?? null,
      bankAccountNo: input.bankAccountNo ?? null,
      bankAccountName: input.bankAccountName ?? null,
      hireDate: input.hireDate,
      terminationDate: input.terminationDate ?? null,
      status: input.status,
      departmentId: input.departmentId,
      jobTitle: input.jobTitle,
      lineManagerId: input.lineManagerId ?? null,
      driverId: input.driverId ?? null,
      photoUrl: input.photoUrl ?? null,
      notes: input.notes ?? null,
    })
    .returning();
  return toEmployee(rows[0]!);
}

export async function updateEmployee(
  id: string,
  patch: Partial<Employee>,
): Promise<Employee | undefined> {
  if (IS_DEMO_MODE) return storeUpdateEmployee(id, patch);
  const db = getDb();
  const orgId = await requireOrgId();
  const set: Partial<typeof empsTable.$inferInsert> = {};
  if (patch.fullName !== undefined) set.fullName = patch.fullName;
  if (patch.preferredName !== undefined) set.preferredName = patch.preferredName ?? null;
  if (patch.gender !== undefined) set.gender = patch.gender ?? null;
  if (patch.dob !== undefined) set.dob = patch.dob ?? null;
  if (patch.nationalId !== undefined) set.nationalId = patch.nationalId;
  if (patch.kraPin !== undefined) set.kraPin = patch.kraPin ?? null;
  if (patch.nssfNo !== undefined) set.nssfNo = patch.nssfNo ?? null;
  if (patch.shaNo !== undefined) set.shaNo = patch.shaNo ?? null;
  if (patch.mpesaPhone !== undefined) set.mpesaPhone = patch.mpesaPhone;
  if (patch.alternatePhone !== undefined) set.alternatePhone = patch.alternatePhone ?? null;
  if (patch.email !== undefined) set.email = patch.email ?? null;
  if (patch.physicalAddress !== undefined) set.physicalAddress = patch.physicalAddress ?? null;
  if (patch.emergencyContactName !== undefined) set.emergencyContactName = patch.emergencyContactName ?? null;
  if (patch.emergencyContactRelationship !== undefined) set.emergencyContactRelationship = patch.emergencyContactRelationship ?? null;
  if (patch.emergencyContactPhone !== undefined) set.emergencyContactPhone = patch.emergencyContactPhone ?? null;
  if (patch.bankName !== undefined) set.bankName = patch.bankName ?? null;
  if (patch.bankBranch !== undefined) set.bankBranch = patch.bankBranch ?? null;
  if (patch.bankAccountNo !== undefined) set.bankAccountNo = patch.bankAccountNo ?? null;
  if (patch.bankAccountName !== undefined) set.bankAccountName = patch.bankAccountName ?? null;
  if (patch.hireDate !== undefined) set.hireDate = patch.hireDate;
  if (patch.terminationDate !== undefined) set.terminationDate = patch.terminationDate ?? null;
  if (patch.status !== undefined) set.status = patch.status;
  if (patch.departmentId !== undefined) set.departmentId = patch.departmentId;
  if (patch.jobTitle !== undefined) set.jobTitle = patch.jobTitle;
  if (patch.lineManagerId !== undefined) set.lineManagerId = patch.lineManagerId ?? null;
  if (patch.driverId !== undefined) set.driverId = patch.driverId ?? null;
  if (patch.photoUrl !== undefined) set.photoUrl = patch.photoUrl ?? null;
  if (patch.notes !== undefined) set.notes = patch.notes ?? null;
  if (Object.keys(set).length === 0) return getEmployee(id);
  const rows = await db
    .update(empsTable)
    .set(set)
    .where(and(eq(empsTable.id, id), eq(empsTable.organizationId, orgId)))
    .returning();
  return rows[0] ? toEmployee(rows[0]) : undefined;
}

// ----- Contracts -----
export async function listContracts(filter?: {
  employeeId?: string;
  status?: ContractStatus;
}): Promise<Contract[]> {
  if (IS_DEMO_MODE) return storeListContracts(filter);
  const db = getDb();
  const orgId = await requireOrgId();
  const where = [eq(contractsTable.organizationId, orgId)];
  if (filter?.employeeId) where.push(eq(contractsTable.employeeId, filter.employeeId));
  if (filter?.status) where.push(eq(contractsTable.status, filter.status));
  const rows = await db
    .select()
    .from(contractsTable)
    .where(and(...where))
    .orderBy(desc(contractsTable.startDate));
  return rows.map(toContract);
}

export async function getContract(id: string): Promise<Contract | undefined> {
  if (IS_DEMO_MODE) return storeGetContract(id);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .select()
    .from(contractsTable)
    .where(and(eq(contractsTable.id, id), eq(contractsTable.organizationId, orgId)))
    .limit(1);
  return rows[0] ? toContract(rows[0]) : undefined;
}

export async function activeContractFor(employeeId: string): Promise<Contract | undefined> {
  if (IS_DEMO_MODE) return storeActive(employeeId);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .select()
    .from(contractsTable)
    .where(
      and(
        eq(contractsTable.organizationId, orgId),
        eq(contractsTable.employeeId, employeeId),
        eq(contractsTable.status, "active"),
      ),
    )
    .limit(1);
  return rows[0] ? toContract(rows[0]) : undefined;
}

export async function createContract(
  input: Omit<Contract, "id" | "createdAt">,
): Promise<Contract> {
  if (IS_DEMO_MODE) return storeCreateContract(input);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .insert(contractsTable)
    .values({
      organizationId: orgId,
      employeeId: input.employeeId,
      type: input.type,
      startDate: input.startDate,
      endDate: input.endDate ?? null,
      probationEndDate: input.probationEndDate ?? null,
      noticePeriodDays: input.noticePeriodDays,
      basicSalary: String(input.basicSalary),
      currency: input.currency,
      payFrequency: input.payFrequency,
      allowances: input.allowances ?? [],
      documentUrl: input.documentUrl ?? null,
      status: input.status,
      notes: input.notes ?? null,
    })
    .returning();
  return toContract(rows[0]!);
}

export async function terminateContract(id: string): Promise<Contract | undefined> {
  if (IS_DEMO_MODE) return storeTerminate(id);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .update(contractsTable)
    .set({ status: "terminated" })
    .where(and(eq(contractsTable.id, id), eq(contractsTable.organizationId, orgId)))
    .returning();
  return rows[0] ? toContract(rows[0]) : undefined;
}

export async function monthlyCostForEmployee(employeeId: string): Promise<{
  basic: number;
  allowances: number;
  total: number;
  currency: string;
} | null> {
  if (IS_DEMO_MODE) return storeMonthlyCost(employeeId);
  const c = await activeContractFor(employeeId);
  if (!c) return null;
  const allow = c.allowances.reduce((s, a) => s + a.amount, 0);
  return { basic: c.basicSalary, allowances: allow, total: c.basicSalary + allow, currency: c.currency };
}
