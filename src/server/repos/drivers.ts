/**
 * Drivers repository — dual-mode (Postgres / mock store). Org-scoped.
 */
import { and, eq } from "drizzle-orm";
import { IS_DEMO_MODE } from "@/server/auth/session-secret";
import { requireOrgId } from "@/server/auth/current-org";
import { getDb } from "@/server/db/client";
import { drivers as table } from "@/server/db/schema";
import {
  createDriver as storeCreate,
  getDriver as storeGet,
  listDrivers as storeList,
  updateDriver as storeUpdate,
} from "@/server/store/mock-store";
import type { Driver, DriverStatus, LicenceClass } from "@/lib/types/fleet";

type Row = typeof table.$inferSelect;

function toDriver(r: Row): Driver {
  return {
    id: r.id,
    fullName: r.fullName,
    phone: r.phone,
    nationalId: r.nationalId,
    status: r.status as DriverStatus,
    licenceClass: r.licenceClass as LicenceClass,
    licenceNumber: r.licenceNumber,
    licenceExpiry: r.licenceExpiry ?? undefined,
    medicalExpiry: r.medicalExpiry ?? undefined,
    passportNumber: r.passportNumber ?? undefined,
    passportExpiry: r.passportExpiry ?? undefined,
    comesaDriverPermitExpiry: r.comesaDriverPermitExpiry ?? undefined,
    defaultTruckId: r.defaultTruckId ?? undefined,
    hireDate: r.hireDate ?? undefined,
    notes: r.notes ?? undefined,
    createdAt: r.createdAt.toISOString(),
  };
}

export async function listDrivers(): Promise<Driver[]> {
  if (IS_DEMO_MODE) return storeList();
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db.select().from(table).where(eq(table.organizationId, orgId));
  return rows.map(toDriver).sort((a, b) => a.fullName.localeCompare(b.fullName));
}

export async function getDriver(id: string): Promise<Driver | undefined> {
  if (IS_DEMO_MODE) return storeGet(id);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .select()
    .from(table)
    .where(and(eq(table.id, id), eq(table.organizationId, orgId)))
    .limit(1);
  return rows[0] ? toDriver(rows[0]) : undefined;
}

export async function createDriver(
  input: Omit<Driver, "id" | "createdAt">,
): Promise<Driver> {
  if (IS_DEMO_MODE) return storeCreate(input);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .insert(table)
    .values({
      organizationId: orgId,
      fullName: input.fullName,
      phone: input.phone,
      nationalId: input.nationalId,
      status: input.status,
      licenceClass: input.licenceClass,
      licenceNumber: input.licenceNumber,
      licenceExpiry: input.licenceExpiry ?? null,
      medicalExpiry: input.medicalExpiry ?? null,
      passportNumber: input.passportNumber ?? null,
      passportExpiry: input.passportExpiry ?? null,
      comesaDriverPermitExpiry: input.comesaDriverPermitExpiry ?? null,
      defaultTruckId: input.defaultTruckId ?? null,
      hireDate: input.hireDate ?? null,
      notes: input.notes ?? null,
    })
    .returning();
  return toDriver(rows[0]!);
}

export async function updateDriver(
  id: string,
  patch: Partial<Driver>,
): Promise<Driver | undefined> {
  if (IS_DEMO_MODE) return storeUpdate(id, patch);
  const db = getDb();
  const orgId = await requireOrgId();
  const set: Partial<typeof table.$inferInsert> = {};
  if (patch.fullName !== undefined) set.fullName = patch.fullName;
  if (patch.phone !== undefined) set.phone = patch.phone;
  if (patch.nationalId !== undefined) set.nationalId = patch.nationalId;
  if (patch.status !== undefined) set.status = patch.status;
  if (patch.licenceClass !== undefined) set.licenceClass = patch.licenceClass;
  if (patch.licenceNumber !== undefined) set.licenceNumber = patch.licenceNumber;
  if (patch.licenceExpiry !== undefined) set.licenceExpiry = patch.licenceExpiry ?? null;
  if (patch.medicalExpiry !== undefined) set.medicalExpiry = patch.medicalExpiry ?? null;
  if (patch.passportNumber !== undefined) set.passportNumber = patch.passportNumber ?? null;
  if (patch.passportExpiry !== undefined) set.passportExpiry = patch.passportExpiry ?? null;
  if (patch.comesaDriverPermitExpiry !== undefined)
    set.comesaDriverPermitExpiry = patch.comesaDriverPermitExpiry ?? null;
  if (patch.defaultTruckId !== undefined) set.defaultTruckId = patch.defaultTruckId ?? null;
  if (patch.hireDate !== undefined) set.hireDate = patch.hireDate ?? null;
  if (patch.notes !== undefined) set.notes = patch.notes ?? null;
  if (Object.keys(set).length === 0) return getDriver(id);
  const rows = await db
    .update(table)
    .set(set)
    .where(and(eq(table.id, id), eq(table.organizationId, orgId)))
    .returning();
  return rows[0] ? toDriver(rows[0]) : undefined;
}
