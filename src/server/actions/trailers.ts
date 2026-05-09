"use server";

import { revalidatePath } from "next/cache";
import {
  createTrailer as storeCreate,
  getTrailer,
  listTrailers as storeList,
  listTrucks,
  updateTrailer as storeUpdate,
} from "@/server/store/mock-store";
import { trailerCreateSchema, type TrailerCreateInput } from "@/lib/validators/fleet";

function normalizePlate(input: string): string {
  return input.replace(/\s+/g, " ").trim().toUpperCase();
}

export async function listTrailers() {
  return storeList();
}
export async function getTrailerById(id: string) {
  return getTrailer(id);
}
export async function listTrucksForSelect() {
  return listTrucks().map((t) => ({ id: t.id, registration: t.registration }));
}

export type CreateTrailerResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function createTrailer(input: TrailerCreateInput): Promise<CreateTrailerResult> {
  const parsed = trailerCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const data = parsed.data;
  const created = storeCreate({
    registration: normalizePlate(data.registration),
    ownerType: data.ownerType,
    subcontractorId: data.ownerType === "subcontractor" ? data.subcontractorId : undefined,
    type: data.type,
    capacityTonnes: data.capacityTonnes,
    axles: data.axles,
    year: data.year,
    status: data.status,
    attachedTruckId: data.attachedTruckId || undefined,
    insuranceExpiry: data.insuranceExpiry || undefined,
    ntsaInspectionExpiry: data.ntsaInspectionExpiry || undefined,
    notes: data.notes || undefined,
  });
  revalidatePath("/trailers");
  return { ok: true, id: created.id };
}

export async function updateTrailerAction(id: string, patch: Partial<TrailerCreateInput>) {
  storeUpdate(id, patch);
  revalidatePath("/trailers");
  revalidatePath(`/trailers/${id}`);
}
