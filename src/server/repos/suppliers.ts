/**
 * Suppliers repository — dual-mode (Postgres / mock store). Org-scoped.
 */
import { and, eq } from "drizzle-orm";
import { IS_DEMO_MODE } from "@/server/auth/session-secret";
import { requireOrgId } from "@/server/auth/current-org";
import { getDb } from "@/server/db/client";
import { suppliers as table } from "@/server/db/schema";
import {
  createSupplier as storeCreate,
  getSupplier as storeGet,
  listSuppliers as storeList,
  updateSupplier as storeUpdate,
} from "@/server/store/mock-store";
import type {
  DefaultPaymentMethod,
  PaymentTerms,
  Supplier,
} from "@/lib/types/fleet";

type Row = typeof table.$inferSelect;

function toSupplier(r: Row): Supplier {
  return {
    id: r.id,
    name: r.name,
    contactPerson: r.contactPerson ?? undefined,
    phone: r.phone,
    email: r.email ?? undefined,
    kraPin: r.kraPin ?? undefined,
    paymentTerms: r.paymentTerms as PaymentTerms,
    defaultPaymentMethod: r.defaultPaymentMethod as DefaultPaymentMethod,
    mpesaNumber: r.mpesaNumber ?? undefined,
    bankName: r.bankName ?? undefined,
    bankAccount: r.bankAccount ?? undefined,
    defaultExpenseCategory: r.defaultExpenseCategory ?? undefined,
    notes: r.notes ?? undefined,
    createdAt: r.createdAt.toISOString(),
  };
}

export async function listSuppliers(): Promise<Supplier[]> {
  if (IS_DEMO_MODE) return storeList();
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db.select().from(table).where(eq(table.organizationId, orgId));
  return rows.map(toSupplier).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getSupplier(id: string): Promise<Supplier | undefined> {
  if (IS_DEMO_MODE) return storeGet(id);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .select()
    .from(table)
    .where(and(eq(table.id, id), eq(table.organizationId, orgId)))
    .limit(1);
  return rows[0] ? toSupplier(rows[0]) : undefined;
}

export async function createSupplier(
  input: Omit<Supplier, "id" | "createdAt">,
): Promise<Supplier> {
  if (IS_DEMO_MODE) return storeCreate(input);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .insert(table)
    .values({
      organizationId: orgId,
      name: input.name,
      contactPerson: input.contactPerson ?? null,
      phone: input.phone,
      email: input.email ?? null,
      kraPin: input.kraPin ?? null,
      paymentTerms: input.paymentTerms,
      defaultPaymentMethod: input.defaultPaymentMethod,
      mpesaNumber: input.mpesaNumber ?? null,
      bankName: input.bankName ?? null,
      bankAccount: input.bankAccount ?? null,
      defaultExpenseCategory: input.defaultExpenseCategory ?? null,
      notes: input.notes ?? null,
    })
    .returning();
  return toSupplier(rows[0]!);
}

export async function updateSupplier(
  id: string,
  patch: Partial<Supplier>,
): Promise<Supplier | undefined> {
  if (IS_DEMO_MODE) return storeUpdate(id, patch);
  const db = getDb();
  const orgId = await requireOrgId();
  const set: Partial<typeof table.$inferInsert> = {};
  if (patch.name !== undefined) set.name = patch.name;
  if (patch.contactPerson !== undefined) set.contactPerson = patch.contactPerson ?? null;
  if (patch.phone !== undefined) set.phone = patch.phone;
  if (patch.email !== undefined) set.email = patch.email ?? null;
  if (patch.kraPin !== undefined) set.kraPin = patch.kraPin ?? null;
  if (patch.paymentTerms !== undefined) set.paymentTerms = patch.paymentTerms;
  if (patch.defaultPaymentMethod !== undefined)
    set.defaultPaymentMethod = patch.defaultPaymentMethod;
  if (patch.mpesaNumber !== undefined) set.mpesaNumber = patch.mpesaNumber ?? null;
  if (patch.bankName !== undefined) set.bankName = patch.bankName ?? null;
  if (patch.bankAccount !== undefined) set.bankAccount = patch.bankAccount ?? null;
  if (patch.defaultExpenseCategory !== undefined)
    set.defaultExpenseCategory = patch.defaultExpenseCategory ?? null;
  if (patch.notes !== undefined) set.notes = patch.notes ?? null;
  if (Object.keys(set).length === 0) return getSupplier(id);
  const rows = await db
    .update(table)
    .set(set)
    .where(and(eq(table.id, id), eq(table.organizationId, orgId)))
    .returning();
  return rows[0] ? toSupplier(rows[0]) : undefined;
}
