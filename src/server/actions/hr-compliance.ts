"use server";

import { revalidatePath } from "next/cache";
import {
  createComplianceRecord as repoCreate,
  deleteComplianceRecord as repoDelete,
  getComplianceRecord,
  listComplianceRecords as repoList,
} from "@/server/repos/hr-compliance";
import type { ComplianceKind } from "@/lib/types/hr-compliance";
import {
  complianceCreateSchema,
  type ComplianceCreateInput,
} from "@/lib/validators/hr-compliance";

export async function listComplianceRecords(filter?: {
  employeeId?: string;
  kind?: ComplianceKind;
}) {
  return repoList(filter);
}

export async function getComplianceRecordById(id: string) {
  return getComplianceRecord(id);
}

export type ActionResult = { ok: true; id: string } | { ok: false; error: string };

export async function createComplianceRecord(input: ComplianceCreateInput): Promise<ActionResult> {
  const parsed = complianceCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const r = await repoCreate(parsed.data);
  revalidatePath("/hr/compliance");
  revalidatePath(`/hr/employees/${parsed.data.employeeId}`);
  return { ok: true, id: r.id };
}

export async function deleteComplianceRecord(
  id: string,
  employeeId: string,
): Promise<ActionResult> {
  const ok = await repoDelete(id);
  if (!ok) return { ok: false, error: "Not found" };
  revalidatePath("/hr/compliance");
  revalidatePath(`/hr/employees/${employeeId}`);
  return { ok: true, id };
}
