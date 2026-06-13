/**
 * Customers repository — dual-mode data access.
 *
 * When DATABASE_URL is configured (real deployment) this reads/writes the
 * Postgres `customers` table, scoped to the signed-in user's organization.
 * In demo mode (no database) it falls back to the in-memory mock store so
 * the app still works for local dev and zero-config previews.
 *
 * The server action layer calls these functions instead of the store
 * directly, so the rest of the app is unaware of which backend is live.
 */
import { and, eq } from "drizzle-orm";
import { IS_DEMO_MODE } from "@/server/auth/session-secret";
import { requireOrgId } from "@/server/auth/current-org";
import { getDb } from "@/server/db/client";
import { customers as customersTable } from "@/server/db/schema";
import {
  createCustomer as storeCreate,
  getCustomer as storeGet,
  listCustomers as storeList,
  updateCustomer as storeUpdate,
} from "@/server/store/mock-store";
import type { Customer, CustomerType } from "@/lib/types/trips";

type Row = typeof customersTable.$inferSelect;

function toCustomer(r: Row): Customer {
  return {
    id: r.id,
    name: r.name,
    contactPerson: r.contactPerson,
    phone: r.phone,
    email: r.email ?? undefined,
    kraPin: r.kraPin ?? undefined,
    customerType: (r.customerType as CustomerType | null) ?? undefined,
    epraLicenceNumber: r.epraLicenceNumber ?? undefined,
    billingAddress: r.billingAddress ?? undefined,
    billingCurrency: r.billingCurrency as Customer["billingCurrency"],
    paymentTermsDays: r.paymentTermsDays,
    notes: r.notes ?? undefined,
    createdAt: r.createdAt.toISOString(),
  };
}

export async function listCustomers(): Promise<Customer[]> {
  if (IS_DEMO_MODE) return storeList();
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.organizationId, orgId));
  return rows.map(toCustomer).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getCustomer(id: string): Promise<Customer | undefined> {
  if (IS_DEMO_MODE) return storeGet(id);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .select()
    .from(customersTable)
    .where(and(eq(customersTable.id, id), eq(customersTable.organizationId, orgId)))
    .limit(1);
  return rows[0] ? toCustomer(rows[0]) : undefined;
}

export async function createCustomer(
  input: Omit<Customer, "id" | "createdAt">,
): Promise<Customer> {
  if (IS_DEMO_MODE) return storeCreate(input);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .insert(customersTable)
    .values({
      organizationId: orgId,
      name: input.name,
      contactPerson: input.contactPerson,
      phone: input.phone,
      email: input.email ?? null,
      kraPin: input.kraPin ?? null,
      customerType: input.customerType ?? null,
      epraLicenceNumber: input.epraLicenceNumber ?? null,
      billingAddress: input.billingAddress ?? null,
      billingCurrency: input.billingCurrency,
      paymentTermsDays: input.paymentTermsDays,
      notes: input.notes ?? null,
    })
    .returning();
  return toCustomer(rows[0]!);
}

export async function updateCustomer(
  id: string,
  patch: Partial<Customer>,
): Promise<Customer | undefined> {
  if (IS_DEMO_MODE) return storeUpdate(id, patch);
  const db = getDb();
  const orgId = await requireOrgId();
  const set: Partial<typeof customersTable.$inferInsert> = {};
  if (patch.name !== undefined) set.name = patch.name;
  if (patch.contactPerson !== undefined) set.contactPerson = patch.contactPerson;
  if (patch.phone !== undefined) set.phone = patch.phone;
  if (patch.email !== undefined) set.email = patch.email ?? null;
  if (patch.kraPin !== undefined) set.kraPin = patch.kraPin ?? null;
  if (patch.customerType !== undefined) set.customerType = patch.customerType ?? null;
  if (patch.epraLicenceNumber !== undefined)
    set.epraLicenceNumber = patch.epraLicenceNumber ?? null;
  if (patch.billingAddress !== undefined) set.billingAddress = patch.billingAddress ?? null;
  if (patch.billingCurrency !== undefined) set.billingCurrency = patch.billingCurrency;
  if (patch.paymentTermsDays !== undefined) set.paymentTermsDays = patch.paymentTermsDays;
  if (patch.notes !== undefined) set.notes = patch.notes ?? null;
  if (Object.keys(set).length === 0) return getCustomer(id);
  const rows = await db
    .update(customersTable)
    .set(set)
    .where(and(eq(customersTable.id, id), eq(customersTable.organizationId, orgId)))
    .returning();
  return rows[0] ? toCustomer(rows[0]) : undefined;
}
