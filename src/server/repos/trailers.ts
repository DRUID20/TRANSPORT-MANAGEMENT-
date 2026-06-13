/**
 * Trailers repository — dual-mode (Postgres / mock store). Org-scoped.
 */
import { and, eq } from "drizzle-orm";
import { IS_DEMO_MODE } from "@/server/auth/session-secret";
import { requireOrgId } from "@/server/auth/current-org";
import { getDb } from "@/server/db/client";
import { trailers as table } from "@/server/db/schema";
import {
  createTrailer as storeCreate,
  getTrailer as storeGet,
  listTrailers as storeList,
  updateTrailer as storeUpdate,
} from "@/server/store/mock-store";
import type { OwnerType, Trailer, TrailerStatus, TrailerType } from "@/lib/types/fleet";

type Row = typeof table.$inferSelect;

function toTrailer(r: Row): Trailer {
  return {
    id: r.id,
    registration: r.registration,
    ownerType: r.ownerType as OwnerType,
    subcontractorId: r.subcontractorId ?? undefined,
    type: r.type as TrailerType,
    capacityTonnes: Number(r.capacityTonnes),
    axles: r.axles,
    year: r.year,
    status: r.status as TrailerStatus,
    attachedTruckId: r.attachedTruckId ?? undefined,
    insuranceExpiry: r.insuranceExpiry ?? undefined,
    ntsaInspectionExpiry: r.ntsaInspectionExpiry ?? undefined,
    notes: r.notes ?? undefined,
    createdAt: r.createdAt.toISOString(),
  };
}

export async function listTrailers(): Promise<Trailer[]> {
  if (IS_DEMO_MODE) return storeList();
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db.select().from(table).where(eq(table.organizationId, orgId));
  return rows.map(toTrailer).sort((a, b) => a.registration.localeCompare(b.registration));
}

export async function getTrailer(id: string): Promise<Trailer | undefined> {
  if (IS_DEMO_MODE) return storeGet(id);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .select()
    .from(table)
    .where(and(eq(table.id, id), eq(table.organizationId, orgId)))
    .limit(1);
  return rows[0] ? toTrailer(rows[0]) : undefined;
}

export async function createTrailer(
  input: Omit<Trailer, "id" | "createdAt">,
): Promise<Trailer> {
  if (IS_DEMO_MODE) return storeCreate(input);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .insert(table)
    .values({
      organizationId: orgId,
      registration: input.registration,
      ownerType: input.ownerType,
      subcontractorId: input.subcontractorId ?? null,
      type: input.type,
      capacityTonnes: String(input.capacityTonnes ?? 0),
      axles: input.axles,
      year: input.year,
      status: input.status,
      attachedTruckId: input.attachedTruckId ?? null,
      insuranceExpiry: input.insuranceExpiry ?? null,
      ntsaInspectionExpiry: input.ntsaInspectionExpiry ?? null,
      notes: input.notes ?? null,
    })
    .returning();
  return toTrailer(rows[0]!);
}

export async function updateTrailer(
  id: string,
  patch: Partial<Trailer>,
): Promise<Trailer | undefined> {
  if (IS_DEMO_MODE) return storeUpdate(id, patch);
  const db = getDb();
  const orgId = await requireOrgId();
  const set: Partial<typeof table.$inferInsert> = {};
  if (patch.registration !== undefined) set.registration = patch.registration;
  if (patch.ownerType !== undefined) set.ownerType = patch.ownerType;
  if (patch.subcontractorId !== undefined) set.subcontractorId = patch.subcontractorId ?? null;
  if (patch.type !== undefined) set.type = patch.type;
  if (patch.capacityTonnes !== undefined) set.capacityTonnes = String(patch.capacityTonnes);
  if (patch.axles !== undefined) set.axles = patch.axles;
  if (patch.year !== undefined) set.year = patch.year;
  if (patch.status !== undefined) set.status = patch.status;
  if (patch.attachedTruckId !== undefined) set.attachedTruckId = patch.attachedTruckId ?? null;
  if (patch.insuranceExpiry !== undefined) set.insuranceExpiry = patch.insuranceExpiry ?? null;
  if (patch.ntsaInspectionExpiry !== undefined)
    set.ntsaInspectionExpiry = patch.ntsaInspectionExpiry ?? null;
  if (patch.notes !== undefined) set.notes = patch.notes ?? null;
  if (Object.keys(set).length === 0) return getTrailer(id);
  const rows = await db
    .update(table)
    .set(set)
    .where(and(eq(table.id, id), eq(table.organizationId, orgId)))
    .returning();
  return rows[0] ? toTrailer(rows[0]) : undefined;
}
