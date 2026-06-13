"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createTruck as repoCreate,
  deleteTruck as repoDelete,
  getTruck as repoGet,
  getTruckByRegistration,
  listTrucks as repoList,
  updateTruck as repoUpdate,
} from "@/server/repos/trucks";
import { listSubcontractors } from "@/server/repos/subcontractors";
import { truckCreateSchema, type TruckCreateInput } from "@/lib/validators/fleet";

function normalizePlate(input: string): string {
  return input.replace(/\s+/g, " ").trim().toUpperCase();
}

export async function listTrucks() {
  return repoList();
}

export async function getTruck(id: string) {
  return repoGet(id);
}

export async function listSubcontractorsForSelect() {
  const subs = await listSubcontractors();
  return subs.map((s) => ({ id: s.id, name: s.name }));
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
  try {
    if (await getTruckByRegistration(reg)) {
      return { ok: false, error: `A truck with registration ${reg} already exists.` };
    }
    const created = await repoCreate({
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
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to save truck." };
  }
}

export async function updateTruckAction(id: string, patch: Partial<TruckCreateInput>) {
  await repoUpdate(id, patch);
  revalidatePath("/trucks");
  revalidatePath(`/trucks/${id}`);
}

export async function deleteTruckAction(id: string) {
  await repoDelete(id);
  revalidatePath("/trucks");
  redirect("/trucks");
}
