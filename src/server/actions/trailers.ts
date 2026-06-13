"use server";

import { revalidatePath } from "next/cache";
import {
  createTrailer as repoCreate,
  getTrailer,
  listTrailers as repoList,
  updateTrailer as repoUpdate,
} from "@/server/repos/trailers";
import { listTrucks } from "@/server/repos/trucks";
import { trailerCreateSchema, type TrailerCreateInput } from "@/lib/validators/fleet";

function normalizePlate(input: string): string {
  return input.replace(/\s+/g, " ").trim().toUpperCase();
}

export async function listTrailers() {
  return repoList();
}
export async function getTrailerById(id: string) {
  return getTrailer(id);
}
export async function listTrucksForSelect() {
  const trucks = await listTrucks();
  return trucks.map((t) => ({ id: t.id, registration: t.registration }));
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
  try {
    const created = await repoCreate({
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
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to save trailer." };
  }
}

export async function updateTrailerAction(id: string, patch: Partial<TrailerCreateInput>) {
  await repoUpdate(id, patch);
  revalidatePath("/trailers");
  revalidatePath(`/trailers/${id}`);
}
