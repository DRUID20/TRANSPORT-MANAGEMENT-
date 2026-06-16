"use server";

import { revalidatePath } from "next/cache";
import {
  createFuelLog as repoCreate,
  tripFuelDerivation as repoTripFuelDerivation,
  deleteFuelLog as repoDelete,
  fleetFuelSnapshot as repoFleetSnapshot,
  fuelLogsForTrip as repoForTrip,
  fuelLogsForTruck as repoForTruck,
  getFuelLog,
  listFuelLogs as repoList,
  tripFuelTotals as repoTripTotals,
  truckFuelEfficiency as repoTruckEfficiency,
} from "@/server/repos/fuel";
import { fuelLogCreateSchema, type FuelLogCreateInput } from "@/lib/validators/fuel";

export async function listFuelLogs(filter?: { tripId?: string; truckId?: string }) {
  return repoList(filter);
}

/** Trip km / litres / km/L derived from the fuel-log timeline. */
export async function getTripFuelDerivation(tripId: string) {
  return repoTripFuelDerivation(tripId);
}

export async function getFuelLogById(id: string) {
  return getFuelLog(id);
}

export async function fuelLogsForTrip(tripId: string) {
  return repoForTrip(tripId);
}

export async function fuelLogsForTruck(truckId: string) {
  return repoForTruck(truckId);
}

export async function tripFuelTotals(tripId: string) {
  return repoTripTotals(tripId);
}

export async function truckFuelEfficiency(truckId: string) {
  return repoTruckEfficiency(truckId);
}

export async function fleetFuelSnapshot() {
  return repoFleetSnapshot();
}

export type ActionResult = { ok: true; id: string } | { ok: false; error: string };

export async function createFuelLog(input: FuelLogCreateInput): Promise<ActionResult> {
  const parsed = fuelLogCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const log = await repoCreate({
    tripId: parsed.data.tripId,
    truckId: parsed.data.truckId,
    driverId: parsed.data.driverId,
    datetime: parsed.data.datetime,
    station: parsed.data.station,
    countryCode: parsed.data.countryCode.toUpperCase(),
    litres: parsed.data.litres,
    costKes: parsed.data.costKes,
    odometerKm: parsed.data.odometerKm,
    stationManagerName: parsed.data.stationManagerName,
    expenseId: parsed.data.expenseId,
    notes: parsed.data.notes,
    submittedBy: parsed.data.submittedBy,
  });
  revalidatePath("/fuel");
  if (parsed.data.tripId) revalidatePath(`/trips/${parsed.data.tripId}`);
  revalidatePath(`/trucks/${parsed.data.truckId}`);
  revalidatePath("/dashboard");
  return { ok: true, id: log.id };
}

export async function removeFuelLog(id: string): Promise<ActionResult> {
  const log = await getFuelLog(id);
  if (!log) return { ok: false, error: "Fuel log not found" };
  await repoDelete(id);
  revalidatePath("/fuel");
  if (log.tripId) revalidatePath(`/trips/${log.tripId}`);
  revalidatePath(`/trucks/${log.truckId}`);
  revalidatePath("/dashboard");
  return { ok: true, id };
}
