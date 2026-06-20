"use server";

import { revalidatePath } from "next/cache";
import {
  createComplianceRecord as repoCreate,
  deleteComplianceRecord as repoDelete,
  getComplianceRecord,
  listComplianceRecords as repoList,
} from "@/server/repos/hr-compliance";
import { logAudit } from "@/server/auth/audit";
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
  await logAudit({ entityType: "hr_compliance", entityId: r.id, action: "create", diff: { kind: { from: null, to: parsed.data.kind } } });
  revalidatePath("/hr/compliance");
  revalidatePath(`/hr/employees/${parsed.data.employeeId}`);
  return { ok: true, id: r.id };
}

export async function deleteComplianceRecord(
  id: string,
  employeeId: string,
): Promise<ActionResult> {
  const record = await getComplianceRecord(id);
  const ok = await repoDelete(id);
  if (!ok) return { ok: false, error: "Not found" };
  await logAudit({ entityType: "hr_compliance", entityId: id, action: "delete" });
  // Best-effort: also remove the underlying file from Storage.
  if (record?.attachmentUrl) {
    try {
      const { deleteFile } = await import("@/server/storage/files");
      await deleteFile(record.attachmentUrl);
    } catch (err) {
      console.error("[hr-compliance] failed to delete storage object:", err);
    }
  }
  revalidatePath("/hr/compliance");
  revalidatePath(`/hr/employees/${employeeId}`);
  return { ok: true, id };
}
