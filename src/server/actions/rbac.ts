"use server";

import { revalidatePath } from "next/cache";
import {
  assignJobDescription as storeAssign,
  clearJobDescription as storeClear,
  employeesAssignedToJd,
  getJobDescription,
  jobDescriptionForEmployee,
  listJobDescriptions as storeList,
} from "@/server/store/mock-store";

export async function listJobDescriptions() {
  return storeList();
}

export async function getJobDescriptionById(id: string) {
  const jd = getJobDescription(id);
  if (!jd) return undefined;
  const assigned = employeesAssignedToJd(id);
  return { ...jd, assignedEmployees: assigned };
}

export async function jobDescriptionForEmployeeAction(employeeId: string) {
  return jobDescriptionForEmployee(employeeId);
}

export type ActionResult = { ok: true; id: string } | { ok: false; error: string };

export async function assignJobDescription(
  employeeId: string,
  jdId: string,
): Promise<ActionResult> {
  const r = storeAssign(employeeId, jdId);
  if (!r.ok) return { ok: false, error: r.error };
  revalidatePath(`/hr/employees/${employeeId}`);
  revalidatePath("/hr/permissions");
  revalidatePath(`/hr/job-descriptions/${jdId}`);
  return { ok: true, id: jdId };
}

export async function clearJobDescription(employeeId: string): Promise<ActionResult> {
  const ok = storeClear(employeeId);
  if (!ok) return { ok: false, error: "Not found" };
  revalidatePath(`/hr/employees/${employeeId}`);
  revalidatePath("/hr/permissions");
  return { ok: true, id: employeeId };
}
