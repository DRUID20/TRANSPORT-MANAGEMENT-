"use server";

import { revalidatePath } from "next/cache";
import {
  addJobCardService as repoAddSvc,
  addJobCardSpare as repoAddSpare,
  closeJobCard as repoClose,
  createJobCard as repoCreate,
  getJobCard,
  jobCardsForTruck as repoForTruck,
  listJobCards as repoList,
  removeJobCardService as repoRemoveSvc,
  removeJobCardSpare as repoRemoveSpare,
  setJobCardStatus as repoSetStatus,
  updateJobCardAnalysis as repoUpdateAnalysis,
} from "@/server/repos/workshop";
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
  return repoList(filterStatus);
}

export async function getJobCardById(id: string) {
  return getJobCard(id);
}

export async function jobCardsForTruck(truckId: string) {
  return repoForTruck(truckId);
}

export type ActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function createJobCard(input: JobCardCreateInput): Promise<ActionResult> {
  const parsed = jobCardCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const created = await repoCreate(parsed.data);
  revalidatePath("/workshop");
  revalidatePath("/trucks");
  revalidatePath(`/trucks/${parsed.data.truckId}`);
  return { ok: true, id: created.id };
}

export async function setStatus(jobCardId: string, status: JobCardStatus) {
  await repoSetStatus(jobCardId, status);
  revalidatePath("/workshop");
  revalidatePath(`/workshop/${jobCardId}`);
}

export async function updateAnalysis(jobCardId: string, analysis: string) {
  await repoUpdateAnalysis(jobCardId, analysis);
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
  const svc = await repoAddSvc({ jobCardId, ...parsed.data });
  revalidatePath(`/workshop/${jobCardId}`);
  return { ok: true, id: svc.id };
}

export async function removeService(jobCardId: string, serviceId: string) {
  await repoRemoveSvc(serviceId);
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
  const spare = await repoAddSpare({ jobCardId, ...parsed.data });
  revalidatePath(`/workshop/${jobCardId}`);
  return { ok: true, id: spare.id };
}

export async function removeSpare(jobCardId: string, spareId: string) {
  await repoRemoveSpare(spareId);
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
  const jc = await repoClose({ jobCardId, ...parsed.data });
  if (!jc) return { ok: false, error: "Job card not found" };
  revalidatePath("/workshop");
  revalidatePath(`/workshop/${jobCardId}`);
  revalidatePath(`/trucks/${jc.truckId}`);
  return { ok: true, id: jc.id };
}
