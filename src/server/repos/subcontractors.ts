/**
 * Subcontractors repository — dual-mode (Postgres when DATABASE_URL is set,
 * mock store in demo mode). Org-scoped. See repos/customers.ts for the pattern.
 */
import { and, eq } from "drizzle-orm";
import { IS_DEMO_MODE } from "@/server/auth/session-secret";
import { requireOrgId } from "@/server/auth/current-org";
import { getDb } from "@/server/db/client";
import { subcontractors as table } from "@/server/db/schema";
import {
  createSubcontractor as storeCreate,
  getSubcontractor as storeGet,
  listSubcontractors as storeList,
  updateSubcontractor as storeUpdate,
} from "@/server/store/mock-store";
import type { Subcontractor } from "@/lib/types/fleet";

type Row = typeof table.$inferSelect;

function toSub(r: Row): Subcontractor {
  return {
    id: r.id,
    name: r.name,
    contactPerson: r.contactPerson,
    phone: r.phone,
    email: r.email ?? undefined,
    kraPin: r.kraPin ?? undefined,
    mpesaNumber: r.mpesaNumber ?? undefined,
    bankName: r.bankName ?? undefined,
    bankAccount: r.bankAccount ?? undefined,
    notes: r.notes ?? undefined,
    createdAt: r.createdAt.toISOString(),
  };
}

export async function listSubcontractors(): Promise<Subcontractor[]> {
  if (IS_DEMO_MODE) return storeList();
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db.select().from(table).where(eq(table.organizationId, orgId));
  return rows.map(toSub).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getSubcontractor(id: string): Promise<Subcontractor | undefined> {
  if (IS_DEMO_MODE) return storeGet(id);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .select()
    .from(table)
    .where(and(eq(table.id, id), eq(table.organizationId, orgId)))
    .limit(1);
  return rows[0] ? toSub(rows[0]) : undefined;
}

export async function createSubcontractor(
  input: Omit<Subcontractor, "id" | "createdAt">,
): Promise<Subcontractor> {
  if (IS_DEMO_MODE) return storeCreate(input);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .insert(table)
    .values({
      organizationId: orgId,
      name: input.name,
      contactPerson: input.contactPerson,
      phone: input.phone,
      email: input.email ?? null,
      kraPin: input.kraPin ?? null,
      mpesaNumber: input.mpesaNumber ?? null,
      bankName: input.bankName ?? null,
      bankAccount: input.bankAccount ?? null,
      notes: input.notes ?? null,
    })
    .returning();
  return toSub(rows[0]!);
}

export async function updateSubcontractor(
  id: string,
  patch: Partial<Subcontractor>,
): Promise<Subcontractor | undefined> {
  if (IS_DEMO_MODE) return storeUpdate(id, patch);
  const db = getDb();
  const orgId = await requireOrgId();
  const set: Partial<typeof table.$inferInsert> = {};
  if (patch.name !== undefined) set.name = patch.name;
  if (patch.contactPerson !== undefined) set.contactPerson = patch.contactPerson;
  if (patch.phone !== undefined) set.phone = patch.phone;
  if (patch.email !== undefined) set.email = patch.email ?? null;
  if (patch.kraPin !== undefined) set.kraPin = patch.kraPin ?? null;
  if (patch.mpesaNumber !== undefined) set.mpesaNumber = patch.mpesaNumber ?? null;
  if (patch.bankName !== undefined) set.bankName = patch.bankName ?? null;
  if (patch.bankAccount !== undefined) set.bankAccount = patch.bankAccount ?? null;
  if (patch.notes !== undefined) set.notes = patch.notes ?? null;
  if (Object.keys(set).length === 0) return getSubcontractor(id);
  const rows = await db
    .update(table)
    .set(set)
    .where(and(eq(table.id, id), eq(table.organizationId, orgId)))
    .returning();
  return rows[0] ? toSub(rows[0]) : undefined;
}
