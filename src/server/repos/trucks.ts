/**
 * Trucks repository — dual-mode (Postgres / mock store). Org-scoped.
 *
 * Tanker spec stored as native arrays; capacity is numeric (returned as a
 * string by the driver, mapped back to number here). Date columns round-trip
 * as 'YYYY-MM-DD' strings.
 */
import { and, eq } from "drizzle-orm";
import { IS_DEMO_MODE } from "@/server/auth/session-secret";
import { requireOrgId } from "@/server/auth/current-org";
import { getDb } from "@/server/db/client";
import { trucks as table } from "@/server/db/schema";
import {
  createTruck as storeCreate,
  deleteTruck as storeDelete,
  getTruck as storeGet,
  getTruckByRegistration as storeGetByReg,
  listTrucks as storeList,
  trucksForSubcontractor as storeForSub,
  updateTruck as storeUpdate,
} from "@/server/store/mock-store";
import type { FuelType, OwnerType, Truck, TruckStatus } from "@/lib/types/fleet";

type Row = typeof table.$inferSelect;

function toTruck(r: Row): Truck {
  return {
    id: r.id,
    registration: r.registration,
    ownerType: r.ownerType as OwnerType,
    subcontractorId: r.subcontractorId ?? undefined,
    make: r.make,
    model: r.model,
    year: r.year,
    fuelType: r.fuelType as FuelType,
    capacityTonnes: Number(r.capacityTonnes),
    axles: r.axles,
    status: r.status as TruckStatus,
    currentDriverId: r.currentDriverId ?? undefined,
    notes: r.notes ?? undefined,
    tankCapacityLitres: r.tankCapacityLitres ?? undefined,
    compartmentCount: r.compartmentCount ?? undefined,
    compartmentCapacitiesLitres: r.compartmentCapacitiesLitres ?? undefined,
    lastCalibrationDate: r.lastCalibrationDate ?? undefined,
    calibrationDueDate: r.calibrationDueDate ?? undefined,
    permittedProducts: (r.permittedProducts as ("PMS" | "AGO")[] | null) ?? undefined,
    insuranceExpiry: r.insuranceExpiry ?? undefined,
    ntsaInspectionExpiry: r.ntsaInspectionExpiry ?? undefined,
    comesaPermitExpiry: r.comesaPermitExpiry ?? undefined,
    transitPermitExpiry: r.transitPermitExpiry ?? undefined,
    epraTransitLicenceExpiry: r.epraTransitLicenceExpiry ?? undefined,
    petroleumLiabilityExpiry: r.petroleumLiabilityExpiry ?? undefined,
    createdAt: r.createdAt.toISOString(),
  };
}

function toInsert(input: Omit<Truck, "id" | "createdAt">, orgId: string) {
  return {
    organizationId: orgId,
    registration: input.registration,
    ownerType: input.ownerType,
    subcontractorId: input.subcontractorId ?? null,
    make: input.make,
    model: input.model,
    year: input.year,
    fuelType: input.fuelType,
    capacityTonnes: String(input.capacityTonnes ?? 0),
    axles: input.axles,
    status: input.status,
    currentDriverId: input.currentDriverId ?? null,
    notes: input.notes ?? null,
    tankCapacityLitres: input.tankCapacityLitres ?? null,
    compartmentCount: input.compartmentCount ?? null,
    compartmentCapacitiesLitres: input.compartmentCapacitiesLitres ?? null,
    lastCalibrationDate: input.lastCalibrationDate ?? null,
    calibrationDueDate: input.calibrationDueDate ?? null,
    permittedProducts: input.permittedProducts ?? null,
    insuranceExpiry: input.insuranceExpiry ?? null,
    ntsaInspectionExpiry: input.ntsaInspectionExpiry ?? null,
    comesaPermitExpiry: input.comesaPermitExpiry ?? null,
    transitPermitExpiry: input.transitPermitExpiry ?? null,
    epraTransitLicenceExpiry: input.epraTransitLicenceExpiry ?? null,
    petroleumLiabilityExpiry: input.petroleumLiabilityExpiry ?? null,
  } satisfies typeof table.$inferInsert;
}

export async function listTrucks(): Promise<Truck[]> {
  if (IS_DEMO_MODE) return storeList();
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db.select().from(table).where(eq(table.organizationId, orgId));
  return rows.map(toTruck).sort((a, b) => a.registration.localeCompare(b.registration));
}

export async function getTruck(id: string): Promise<Truck | undefined> {
  if (IS_DEMO_MODE) return storeGet(id);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .select()
    .from(table)
    .where(and(eq(table.id, id), eq(table.organizationId, orgId)))
    .limit(1);
  return rows[0] ? toTruck(rows[0]) : undefined;
}

export async function getTruckByRegistration(registration: string): Promise<Truck | undefined> {
  if (IS_DEMO_MODE) return storeGetByReg(registration);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .select()
    .from(table)
    .where(and(eq(table.registration, registration), eq(table.organizationId, orgId)))
    .limit(1);
  return rows[0] ? toTruck(rows[0]) : undefined;
}

export async function trucksForSubcontractor(subcontractorId: string): Promise<Truck[]> {
  if (IS_DEMO_MODE) return storeForSub(subcontractorId);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .select()
    .from(table)
    .where(and(eq(table.subcontractorId, subcontractorId), eq(table.organizationId, orgId)));
  return rows.map(toTruck);
}

export async function createTruck(
  input: Omit<Truck, "id" | "createdAt">,
): Promise<Truck> {
  if (IS_DEMO_MODE) return storeCreate(input);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db.insert(table).values(toInsert(input, orgId)).returning();
  return toTruck(rows[0]!);
}

export async function updateTruck(
  id: string,
  patch: Partial<Truck>,
): Promise<Truck | undefined> {
  if (IS_DEMO_MODE) return storeUpdate(id, patch);
  const db = getDb();
  const orgId = await requireOrgId();
  const set: Partial<typeof table.$inferInsert> = {};
  if (patch.registration !== undefined) set.registration = patch.registration;
  if (patch.ownerType !== undefined) set.ownerType = patch.ownerType;
  if (patch.subcontractorId !== undefined) set.subcontractorId = patch.subcontractorId ?? null;
  if (patch.make !== undefined) set.make = patch.make;
  if (patch.model !== undefined) set.model = patch.model;
  if (patch.year !== undefined) set.year = patch.year;
  if (patch.fuelType !== undefined) set.fuelType = patch.fuelType;
  if (patch.capacityTonnes !== undefined) set.capacityTonnes = String(patch.capacityTonnes);
  if (patch.axles !== undefined) set.axles = patch.axles;
  if (patch.status !== undefined) set.status = patch.status;
  if (patch.currentDriverId !== undefined) set.currentDriverId = patch.currentDriverId ?? null;
  if (patch.notes !== undefined) set.notes = patch.notes ?? null;
  if (patch.tankCapacityLitres !== undefined) set.tankCapacityLitres = patch.tankCapacityLitres ?? null;
  if (patch.compartmentCount !== undefined) set.compartmentCount = patch.compartmentCount ?? null;
  if (patch.compartmentCapacitiesLitres !== undefined)
    set.compartmentCapacitiesLitres = patch.compartmentCapacitiesLitres ?? null;
  if (patch.lastCalibrationDate !== undefined) set.lastCalibrationDate = patch.lastCalibrationDate ?? null;
  if (patch.calibrationDueDate !== undefined) set.calibrationDueDate = patch.calibrationDueDate ?? null;
  if (patch.permittedProducts !== undefined) set.permittedProducts = patch.permittedProducts ?? null;
  if (patch.insuranceExpiry !== undefined) set.insuranceExpiry = patch.insuranceExpiry ?? null;
  if (patch.ntsaInspectionExpiry !== undefined) set.ntsaInspectionExpiry = patch.ntsaInspectionExpiry ?? null;
  if (patch.comesaPermitExpiry !== undefined) set.comesaPermitExpiry = patch.comesaPermitExpiry ?? null;
  if (patch.transitPermitExpiry !== undefined) set.transitPermitExpiry = patch.transitPermitExpiry ?? null;
  if (patch.epraTransitLicenceExpiry !== undefined)
    set.epraTransitLicenceExpiry = patch.epraTransitLicenceExpiry ?? null;
  if (patch.petroleumLiabilityExpiry !== undefined)
    set.petroleumLiabilityExpiry = patch.petroleumLiabilityExpiry ?? null;
  if (Object.keys(set).length === 0) return getTruck(id);
  const rows = await db
    .update(table)
    .set(set)
    .where(and(eq(table.id, id), eq(table.organizationId, orgId)))
    .returning();
  return rows[0] ? toTruck(rows[0]) : undefined;
}

export async function deleteTruck(id: string): Promise<boolean> {
  if (IS_DEMO_MODE) return storeDelete(id);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .delete(table)
    .where(and(eq(table.id, id), eq(table.organizationId, orgId)))
    .returning({ id: table.id });
  return rows.length > 0;
}
