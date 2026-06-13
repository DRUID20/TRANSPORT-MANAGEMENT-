/** HR Compliance records repo — dual-mode, org-scoped. */
import { and, asc, eq } from "drizzle-orm";
import { IS_DEMO_MODE } from "@/server/auth/session-secret";
import { requireOrgId } from "@/server/auth/current-org";
import { getDb } from "@/server/db/client";
import { complianceRecords as table } from "@/server/db/schema";
import {
  createComplianceRecord as storeCreate,
  deleteComplianceRecord as storeDelete,
  getComplianceRecord as storeGet,
  listComplianceRecords as storeList,
} from "@/server/store/mock-store";
import type { ComplianceKind, ComplianceRecord } from "@/lib/types/hr-compliance";

type Row = typeof table.$inferSelect;

function toRecord(r: Row): ComplianceRecord {
  return {
    id: r.id,
    employeeId: r.employeeId,
    kind: r.kind as ComplianceKind,
    label: r.label ?? undefined,
    number: r.number ?? undefined,
    issueDate: r.issueDate ?? undefined,
    expiryDate: r.expiryDate ?? undefined,
    issuingAuthority: r.issuingAuthority ?? undefined,
    attachmentUrl: r.attachmentUrl ?? undefined,
    notes: r.notes ?? undefined,
    createdAt: r.createdAt.toISOString(),
  };
}

export async function listComplianceRecords(filter?: {
  employeeId?: string;
  kind?: ComplianceKind;
}): Promise<ComplianceRecord[]> {
  if (IS_DEMO_MODE) return storeList(filter);
  const db = getDb();
  const orgId = await requireOrgId();
  const where = [eq(table.organizationId, orgId)];
  if (filter?.employeeId) where.push(eq(table.employeeId, filter.employeeId));
  if (filter?.kind) where.push(eq(table.kind, filter.kind));
  const rows = await db.select().from(table).where(and(...where)).orderBy(asc(table.expiryDate));
  return rows.map(toRecord);
}

export async function getComplianceRecord(id: string): Promise<ComplianceRecord | undefined> {
  if (IS_DEMO_MODE) return storeGet(id);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .select()
    .from(table)
    .where(and(eq(table.id, id), eq(table.organizationId, orgId)))
    .limit(1);
  return rows[0] ? toRecord(rows[0]) : undefined;
}

export async function createComplianceRecord(
  input: Omit<ComplianceRecord, "id" | "createdAt">,
): Promise<ComplianceRecord> {
  if (IS_DEMO_MODE) return storeCreate(input);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .insert(table)
    .values({
      organizationId: orgId,
      employeeId: input.employeeId,
      kind: input.kind,
      label: input.label ?? null,
      number: input.number ?? null,
      issueDate: input.issueDate ?? null,
      expiryDate: input.expiryDate ?? null,
      issuingAuthority: input.issuingAuthority ?? null,
      attachmentUrl: input.attachmentUrl ?? null,
      notes: input.notes ?? null,
    })
    .returning();
  return toRecord(rows[0]!);
}

export async function deleteComplianceRecord(id: string): Promise<boolean> {
  if (IS_DEMO_MODE) return storeDelete(id);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .delete(table)
    .where(and(eq(table.id, id), eq(table.organizationId, orgId)))
    .returning({ id: table.id });
  return rows.length > 0;
}
