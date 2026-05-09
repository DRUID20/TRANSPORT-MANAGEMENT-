"use server";

import { revalidatePath } from "next/cache";
import {
  createComplianceRecord as storeCreate,
  deleteComplianceRecord as storeDelete,
  getComplianceRecord,
  listComplianceRecords as storeList,
} from "@/server/store/mock-store";
import type { ComplianceKind } from "@/lib/types/hr-compliance";
import {
  complianceCreateSchema,
  type ComplianceCreateInput,
} from "@/lib/validators/hr-compliance";

export async function listComplianceRecords(filter?: {
  employeeId?: string;
  kind?: ComplianceKind;
}) {
  return storeList(filter);
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
  const r = storeCreate(parsed.data);
  revalidatePath("/hr/compliance");
  revalidatePath(`/hr/employees/${parsed.data.employeeId}`);
  return { ok: true, id: r.id };
}

export async function deleteComplianceRecord(
  id: string,
  employeeId: string,
): Promise<ActionResult> {
  const ok = storeDelete(id);
  if (!ok) return { ok: false, error: "Not found" };
  revalidatePath("/hr/compliance");
  revalidatePath(`/hr/employees/${employeeId}`);
  return { ok: true, id };
}
