/**
 * Fuel-logs repository — dual-mode (Postgres / mock store). Org-scoped.
 *
 * FUEL-YYYY-NNNN issued atomically. price_per_litre_kes is derived on insert
 * so reports never see a stale ratio. Aggregations (trip totals, truck km/L,
 * fleet snapshot) port the store's math 1-for-1 in JS over the repo reads.
 */
import { and, desc, eq } from "drizzle-orm";
import { IS_DEMO_MODE } from "@/server/auth/session-secret";
import { requireOrgId } from "@/server/auth/current-org";
import { getDb } from "@/server/db/client";
import { fuelLogs as table } from "@/server/db/schema";
import { nextDocumentNumber } from "@/server/repos/counters";
import { getTrip } from "@/server/repos/trips";
import {
  createFuelLog as storeCreate,
  deleteFuelLog as storeDelete,
  fleetFuelSnapshot as storeFleet,
  fuelLogsForTrip as storeForTrip,
  fuelLogsForTruck as storeForTruck,
  getFuelLog as storeGet,
  listFuelLogs as storeList,
  tripFuelTotals as storeTripTotals,
  truckFuelEfficiency as storeTruckEff,
} from "@/server/store/mock-store";
import type { FuelLog, FuelLogPaymentMethod } from "@/lib/types/fuel";

type Row = typeof table.$inferSelect;
type ListFilter = { tripId?: string; truckId?: string };
type NewFuelLog = Omit<FuelLog, "id" | "number" | "createdAt" | "pricePerLitreKes"> & {
  paidBy?: FuelLogPaymentMethod;
};

function toLog(r: Row): FuelLog {
  return {
    id: r.id,
    number: r.number,
    tripId: r.tripId ?? undefined,
    truckId: r.truckId,
    driverId: r.driverId ?? undefined,
    datetime: r.datetime.toISOString(),
    station: r.station,
    countryCode: r.countryCode,
    litres: Number(r.litres),
    costKes: Number(r.costKes),
    pricePerLitreKes: Number(r.pricePerLitreKes),
    odometerKm: r.odometerKm,
    stationManagerName: r.stationManagerName,
    expenseId: r.expenseId ?? undefined,
    notes: r.notes ?? undefined,
    submittedBy: r.submittedBy,
    createdAt: r.createdAt.toISOString(),
  };
}

export async function listFuelLogs(filter?: ListFilter): Promise<FuelLog[]> {
  if (IS_DEMO_MODE) return storeList(filter);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .select()
    .from(table)
    .where(eq(table.organizationId, orgId))
    .orderBy(desc(table.datetime));
  let all = rows.map(toLog);
  if (filter?.tripId) all = all.filter((l) => l.tripId === filter.tripId);
  if (filter?.truckId) all = all.filter((l) => l.truckId === filter.truckId);
  return all;
}

export async function getFuelLog(id: string): Promise<FuelLog | undefined> {
  if (IS_DEMO_MODE) return storeGet(id);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .select()
    .from(table)
    .where(and(eq(table.id, id), eq(table.organizationId, orgId)))
    .limit(1);
  return rows[0] ? toLog(rows[0]) : undefined;
}

export async function fuelLogsForTrip(tripId: string): Promise<FuelLog[]> {
  if (IS_DEMO_MODE) return storeForTrip(tripId);
  return listFuelLogs({ tripId });
}

export async function fuelLogsForTruck(truckId: string): Promise<FuelLog[]> {
  if (IS_DEMO_MODE) return storeForTruck(truckId);
  return listFuelLogs({ truckId });
}

export async function createFuelLog(input: NewFuelLog): Promise<FuelLog> {
  if (IS_DEMO_MODE) return storeCreate(input);
  const db = getDb();
  const orgId = await requireOrgId();
  const number = await nextDocumentNumber(orgId, "FUEL", "fuel");
  const ppl = input.litres > 0 ? Math.round((input.costKes / input.litres) * 100) / 100 : 0;
  const rows = await db
    .insert(table)
    .values({
      organizationId: orgId,
      number,
      tripId: input.tripId ?? null,
      truckId: input.truckId,
      driverId: input.driverId ?? null,
      datetime: new Date(input.datetime),
      station: input.station,
      countryCode: input.countryCode,
      litres: String(input.litres),
      costKes: String(input.costKes),
      pricePerLitreKes: String(ppl),
      odometerKm: input.odometerKm,
      stationManagerName: input.stationManagerName,
      paidBy: input.paidBy ?? "cash",
      expenseId: input.expenseId ?? null,
      notes: input.notes ?? null,
      submittedBy: input.submittedBy,
    })
    .returning();
  return toLog(rows[0]!);
}

export async function deleteFuelLog(id: string): Promise<boolean> {
  if (IS_DEMO_MODE) return storeDelete(id);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .delete(table)
    .where(and(eq(table.id, id), eq(table.organizationId, orgId)))
    .returning({ id: table.id });
  return rows.length > 0;
}

export async function tripFuelTotals(
  tripId: string,
): Promise<{ litres: number; costKes: number; count: number }> {
  if (IS_DEMO_MODE) return storeTripTotals(tripId);
  const logs = await fuelLogsForTrip(tripId);
  return {
    litres: logs.reduce((s, l) => s + l.litres, 0),
    costKes: logs.reduce((s, l) => s + l.costKes, 0),
    count: logs.length,
  };
}

export async function truckFuelEfficiency(truckId: string): Promise<{
  kmPerLitre: number | null;
  litresTotal: number;
  costKesTotal: number;
  kmCovered: number;
  count: number;
}> {
  if (IS_DEMO_MODE) return storeTruckEff(truckId);
  const logs = await fuelLogsForTruck(truckId);
  const litresTotal = logs.reduce((s, l) => s + l.litres, 0);
  const costKesTotal = logs.reduce((s, l) => s + l.costKes, 0);
  if (logs.length < 2) {
    return { kmPerLitre: null, litresTotal, costKesTotal, kmCovered: 0, count: logs.length };
  }
  const sorted = [...logs].sort((a, b) => a.odometerKm - b.odometerKm);
  const minOdo = sorted[0]!.odometerKm;
  const maxOdo = sorted[sorted.length - 1]!.odometerKm;
  const kmCovered = maxOdo - minOdo;
  const subsequentLitres = sorted.slice(1).reduce((s, l) => s + l.litres, 0);
  const kmPerLitre =
    subsequentLitres > 0 && kmCovered > 0
      ? Math.round((kmCovered / subsequentLitres) * 100) / 100
      : null;
  return { kmPerLitre, litresTotal, costKesTotal, kmCovered, count: logs.length };
}

export async function fleetFuelSnapshot(): Promise<{
  totalLitres: number;
  totalCostKes: number;
  fleetKmPerLitre: number | null;
  byCountry: Array<{ code: string; litres: number; pct: number }>;
}> {
  if (IS_DEMO_MODE) return storeFleet();
  const all = await listFuelLogs();
  const totalLitres = all.reduce((s, l) => s + l.litres, 0);
  const totalCostKes = all.reduce((s, l) => s + l.costKes, 0);

  const truckIds = Array.from(new Set(all.map((l) => l.truckId)));
  let weightedKm = 0;
  let weightedLitres = 0;
  for (const truckId of truckIds) {
    const eff = await truckFuelEfficiency(truckId);
    if (eff.kmPerLitre !== null) {
      weightedKm += eff.kmCovered;
      const truckLogs = all.filter((l) => l.truckId === truckId).sort((a, b) => a.odometerKm - b.odometerKm);
      weightedLitres += truckLogs.slice(1).reduce((s, l) => s + l.litres, 0);
    }
  }
  const fleetKmPerLitre =
    weightedLitres > 0 ? Math.round((weightedKm / weightedLitres) * 100) / 100 : null;

  const byCountryMap = new Map<string, number>();
  for (const l of all) byCountryMap.set(l.countryCode, (byCountryMap.get(l.countryCode) ?? 0) + l.litres);
  const byCountry = Array.from(byCountryMap.entries())
    .map(([code, litres]) => ({ code, litres, pct: totalLitres > 0 ? (litres / totalLitres) * 100 : 0 }))
    .sort((a, b) => b.litres - a.litres);

  return { totalLitres, totalCostKes, fleetKmPerLitre, byCountry };
}

/**
 * Derive a trip's km / litres / km/L from the truck's fuel-log timeline,
 * with **no manual km input on the trip**. Station-manager-verified fuel
 * logs are the single source of truth.
 *
 *   Trip window = [actualDepartureAt, actualDeliveryAt]   (whichever exist)
 *   startOdoKm  = last fuel log on/before the start
 *   endOdoKm    = last fuel log on/before the end
 *   kmCovered   = endOdoKm − startOdoKm
 *   litresDuring = sum(litres) for fuel logs whose datetime is INSIDE the
 *                  trip window — supports refuelling twice mid-trip without
 *                  any extra plumbing.
 *
 * Returns the contributing log ids so the UI can link "view fuel logs that
 * fed this calculation". Each component is `undefined` rather than zero when
 * we can't compute it (no anchoring fuel log; trip not departed yet).
 */
export interface TripFuelDerivation {
  startOdoKm?: number;
  endOdoKm?: number;
  kmCovered?: number;
  litresDuring: number;
  kmPerLitre?: number;
  contributingLogIds: string[];
  /** Human-readable note about why a field is missing, if any. */
  note?: string;
}

export async function tripFuelDerivation(tripId: string): Promise<TripFuelDerivation> {
  const trip = await getTrip(tripId);
  if (!trip) return { litresDuring: 0, contributingLogIds: [], note: "Trip not found." };
  if (!trip.actualDepartureAt) {
    return { litresDuring: 0, contributingLogIds: [], note: "Trip hasn't departed yet." };
  }
  const startMs = new Date(trip.actualDepartureAt).getTime();
  const endMs = trip.actualDeliveryAt ? new Date(trip.actualDeliveryAt).getTime() : Date.now();

  // Pull the truck's whole fuel-log history; cheap (indexed by truck+datetime)
  // and we need both sides of the trip window to anchor odometers anyway.
  const logs = await fuelLogsForTruck(trip.truckId);
  if (logs.length === 0) {
    return { litresDuring: 0, contributingLogIds: [], note: "No fuel logs for this truck yet." };
  }
  // Sort by datetime, then by odometer to break same-minute ties deterministically.
  const sorted = [...logs].sort((a, b) => {
    const t = new Date(a.datetime).getTime() - new Date(b.datetime).getTime();
    return t !== 0 ? t : a.odometerKm - b.odometerKm;
  });

  const lastOnOrBefore = (boundMs: number) => {
    let pick: typeof sorted[number] | undefined;
    for (const l of sorted) {
      if (new Date(l.datetime).getTime() <= boundMs) pick = l;
      else break;
    }
    return pick;
  };

  const startAnchor = lastOnOrBefore(startMs);
  const endAnchor = lastOnOrBefore(endMs);

  const during = sorted.filter((l) => {
    const t = new Date(l.datetime).getTime();
    return t > startMs && t <= endMs;
  });
  const litresDuring = Math.round(during.reduce((s, l) => s + l.litres, 0) * 100) / 100;
  const contributingLogIds = during.map((l) => l.id);

  const startOdoKm = startAnchor?.odometerKm;
  const endOdoKm = endAnchor?.odometerKm;
  const kmCovered =
    startOdoKm !== undefined && endOdoKm !== undefined && endOdoKm >= startOdoKm
      ? endOdoKm - startOdoKm
      : undefined;
  const kmPerLitre =
    kmCovered !== undefined && litresDuring > 0
      ? Math.round((kmCovered / litresDuring) * 100) / 100
      : undefined;

  let note: string | undefined;
  if (!startAnchor) note = "No fuel log on or before the trip's departure — start odometer unknown.";
  else if (!trip.actualDeliveryAt) note = "Trip not yet delivered — figures based on time-of-now.";
  else if (during.length === 0) note = "No fuel logs during this trip's window.";

  return { startOdoKm, endOdoKm, kmCovered, litresDuring, kmPerLitre, contributingLogIds, note };
}
