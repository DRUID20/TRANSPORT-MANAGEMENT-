"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createTruck as storeCreateTruck,
  deleteTruck as storeDeleteTruck,
  getTruck as storeGetTruck,
  getTruckByRegistration,
  listSubcontractors,
  listTrucks as storeListTrucks,
  updateTruck as storeUpdateTruck,
} from "@/server/store/mock-store";
import { truckCreateSchema, type TruckCreateInput } from "@/lib/validators/fleet";

function normalizePlate(input: string): string {
  return input.replace(/\s+/g, " ").trim().toUpperCase();
}

export async function listTrucks() {
  return storeListTrucks();
}

export async function getTruck(id: string) {
  return storeGetTruck(id);
}

export async function listSubcontractorsForSelect() {
  return listSubcontractors().map((s) => ({ id: s.id, name: s.name }));
}

export type CreateTruckResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function createTruck(input: TruckCreateInput): Promise<CreateTruckResult> {
  const parsed = truckCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const data = parsed.data;
  const reg = normalizePlate(data.registration);
  if (getTruckByRegistration(reg)) {
    return { ok: false, error: `A truck with registration ${reg} already exists.` };
  }
  const created = storeCreateTruck({
    registration: reg,
    ownerType: data.ownerType,
    subcontractorId: data.ownerType === "subcontractor" ? data.subcontractorId : undefined,
    make: data.make,
    model: data.model,
    year: data.year,
    fuelType: data.fuelType,
    capacityTonnes: data.capacityTonnes,
    axles: data.axles,
    status: data.status,
    insuranceExpiry: data.insuranceExpiry || undefined,
    ntsaInspectionExpiry: data.ntsaInspectionExpiry || undefined,
    comesaPermitExpiry: data.comesaPermitExpiry || undefined,
    transitPermitExpiry: data.transitPermitExpiry || undefined,
    notes: data.notes || undefined,
  });
  revalidatePath("/trucks");
  return { ok: true, id: created.id };
}

export async function updateTruckAction(id: string, patch: Partial<TruckCreateInput>) {
  storeUpdateTruck(id, patch);
  revalidatePath("/trucks");
  revalidatePath(`/trucks/${id}`);
}

export async function deleteTruckAction(id: string) {
  storeDeleteTruck(id);
  revalidatePath("/trucks");
  redirect("/trucks");
}
