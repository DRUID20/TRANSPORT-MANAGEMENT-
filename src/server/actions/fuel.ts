"use server";

import { revalidatePath } from "next/cache";
import {
  createFuelLog as storeCreate,
  deleteFuelLog as storeDelete,
  fleetFuelSnapshot as storeFleetSnapshot,
  fuelLogsForTrip as storeForTrip,
  fuelLogsForTruck as storeForTruck,
  getFuelLog,
  listFuelLogs as storeList,
  tripFuelTotals as storeTripTotals,
  truckFuelEfficiency as storeTruckEfficiency,
} from "@/server/store/mock-store";
import { fuelLogCreateSchema, type FuelLogCreateInput } from "@/lib/validators/fuel";

export async function listFuelLogs(filter?: { tripId?: string; truckId?: string }) {
  return storeList(filter);
}

export async function getFuelLogById(id: string) {
  return getFuelLog(id);
}

export async function fuelLogsForTrip(tripId: string) {
  return storeForTrip(tripId);
}

export async function fuelLogsForTruck(truckId: string) {
  return storeForTruck(truckId);
}

export async function tripFuelTotals(tripId: string) {
  return storeTripTotals(tripId);
}

export async function truckFuelEfficiency(truckId: string) {
  return storeTruckEfficiency(truckId);
}

export async function fleetFuelSnapshot() {
  return storeFleetSnapshot();
}

export type ActionResult = { ok: true; id: string } | { ok: false; error: string };

export async function createFuelLog(input: FuelLogCreateInput): Promise<ActionResult> {
  const parsed = fuelLogCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const log = storeCreate({
    tripId: parsed.data.tripId,
    truckId: parsed.data.truckId,
    driverId: parsed.data.driverId,
    datetime: parsed.data.datetime,
    station: parsed.data.station,
    countryCode: parsed.data.countryCode.toUpperCase(),
    litres: parsed.data.litres,
    costKes: parsed.data.costKes,
    odometerKm: parsed.data.odometerKm,
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
  const log = getFuelLog(id);
  if (!log) return { ok: false, error: "Fuel log not found" };
  storeDelete(id);
  revalidatePath("/fuel");
  if (log.tripId) revalidatePath(`/trips/${log.tripId}`);
  revalidatePath(`/trucks/${log.truckId}`);
  revalidatePath("/dashboard");
  return { ok: true, id };
}
