"use server";

import { revalidatePath } from "next/cache";
import {
  addJobCardService as storeAddSvc,
  addJobCardSpare as storeAddSpare,
  closeJobCard as storeClose,
  createJobCard as storeCreate,
  getJobCard,
  jobCardsForTruck as storeForTruck,
  listJobCards as storeList,
  removeJobCardService as storeRemoveSvc,
  removeJobCardSpare as storeRemoveSpare,
  setJobCardStatus as storeSetStatus,
  updateJobCardAnalysis as storeUpdateAnalysis,
} from "@/server/store/mock-store";
import type { JobCardStatus } from "@/lib/types/workshop";
import {
  jobCardCloseSchema,
  jobCardCreateSchema,
  jobCardServiceSchema,
  jobCardSpareSchema,
  type JobCardCloseInput,
  type JobCardCreateInput,
  type JobCardServiceInput,
  type JobCardSpareInput,
} from "@/lib/validators/workshop";

export async function listJobCards(filterStatus?: JobCardStatus) {
  return storeList(filterStatus);
}

export async function getJobCardById(id: string) {
  return getJobCard(id);
}

export async function jobCardsForTruck(truckId: string) {
  return storeForTruck(truckId);
}

export type ActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function createJobCard(input: JobCardCreateInput): Promise<ActionResult> {
  const parsed = jobCardCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const created = storeCreate(parsed.data);
  revalidatePath("/workshop");
  revalidatePath("/trucks");
  revalidatePath(`/trucks/${parsed.data.truckId}`);
  return { ok: true, id: created.id };
}

export async function setStatus(jobCardId: string, status: JobCardStatus) {
  storeSetStatus(jobCardId, status);
  revalidatePath("/workshop");
  revalidatePath(`/workshop/${jobCardId}`);
}

export async function updateAnalysis(jobCardId: string, analysis: string) {
  storeUpdateAnalysis(jobCardId, analysis);
  revalidatePath(`/workshop/${jobCardId}`);
}

export async function addService(
  jobCardId: string,
  input: JobCardServiceInput,
): Promise<ActionResult> {
  const parsed = jobCardServiceSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const svc = storeAddSvc({ jobCardId, ...parsed.data });
  revalidatePath(`/workshop/${jobCardId}`);
  return { ok: true, id: svc.id };
}

export async function removeService(jobCardId: string, serviceId: string) {
  storeRemoveSvc(serviceId);
  revalidatePath(`/workshop/${jobCardId}`);
}

export async function addSpare(
  jobCardId: string,
  input: JobCardSpareInput,
): Promise<ActionResult> {
  const parsed = jobCardSpareSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const spare = storeAddSpare({ jobCardId, ...parsed.data });
  revalidatePath(`/workshop/${jobCardId}`);
  return { ok: true, id: spare.id };
}

export async function removeSpare(jobCardId: string, spareId: string) {
  storeRemoveSpare(spareId);
  revalidatePath(`/workshop/${jobCardId}`);
}

export async function closeJobCard(
  jobCardId: string,
  input: JobCardCloseInput,
): Promise<ActionResult> {
  const parsed = jobCardCloseSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const jc = storeClose({ jobCardId, ...parsed.data });
  if (!jc) return { ok: false, error: "Job card not found" };
  revalidatePath("/workshop");
  revalidatePath(`/workshop/${jobCardId}`);
  revalidatePath(`/trucks/${jc.truckId}`);
  return { ok: true, id: jc.id };
}
