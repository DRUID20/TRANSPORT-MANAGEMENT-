"use server";

import { revalidatePath } from "next/cache";
import {
  addJobCardService as repoAddSvc,
  addJobCardSpare as repoAddSpare,
  closeJobCard as repoClose,
  completeAndBillJobCard as repoCompleteAndBill,
  createJobCard as repoCreate,
  getJobCard,
  jobCardsForTruck as repoForTruck,
  listJobCards as repoList,
  removeJobCardService as repoRemoveSvc,
  removeJobCardSpare as repoRemoveSpare,
  setJobCardStatus as repoSetStatus,
  updateJobCardAnalysis as repoUpdateAnalysis,
} from "@/server/repos/workshop";
import { logAudit } from "@/server/auth/audit";
import { guard, requireCapability } from "@/server/auth/permissions";
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
  const denied = await guard("workshop.write");
  if (denied) return denied;
  const parsed = jobCardCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const created = await repoCreate(parsed.data);
  await logAudit({ entityType: "job_card", entityId: created.id, action: "create", diff: { truckId: { from: null, to: parsed.data.truckId } } });
  revalidatePath("/workshop");
  revalidatePath("/trucks");
  revalidatePath(`/trucks/${parsed.data.truckId}`);
  return { ok: true, id: created.id };
}

export async function setStatus(jobCardId: string, status: JobCardStatus) {
  await requireCapability("workshop.write");
  await repoSetStatus(jobCardId, status);
  await logAudit({ entityType: "job_card", entityId: jobCardId, action: "status_change", diff: { status: { from: null, to: status } } });
  revalidatePath("/workshop");
  revalidatePath(`/workshop/${jobCardId}`);
}

export async function updateAnalysis(jobCardId: string, analysis: string) {
  await requireCapability("workshop.write");
  await repoUpdateAnalysis(jobCardId, analysis);
  await logAudit({ entityType: "job_card", entityId: jobCardId, action: "update", diff: { analysis: { from: null, to: analysis } } });
  revalidatePath(`/workshop/${jobCardId}`);
}

export async function addService(
  jobCardId: string,
  input: JobCardServiceInput,
): Promise<ActionResult> {
  const denied = await guard("workshop.write");
  if (denied) return denied;
  const parsed = jobCardServiceSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const svc = await repoAddSvc({ jobCardId, ...parsed.data });
  if (!svc) return { ok: false, error: "Job card not found" };
  revalidatePath(`/workshop/${jobCardId}`);
  return { ok: true, id: svc.id };
}

export async function removeService(jobCardId: string, serviceId: string) {
  await requireCapability("workshop.write");
  await repoRemoveSvc(serviceId);
  revalidatePath(`/workshop/${jobCardId}`);
}

export async function addSpare(
  jobCardId: string,
  input: JobCardSpareInput,
): Promise<ActionResult> {
  const denied = await guard("workshop.write");
  if (denied) return denied;
  const parsed = jobCardSpareSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const spare = await repoAddSpare({ jobCardId, ...parsed.data });
  if (!spare) return { ok: false, error: "Job card not found" };
  revalidatePath(`/workshop/${jobCardId}`);
  return { ok: true, id: spare.id };
}

export async function removeSpare(jobCardId: string, spareId: string) {
  await requireCapability("workshop.write");
  await repoRemoveSpare(spareId);
  revalidatePath(`/workshop/${jobCardId}`);
}

export async function closeJobCard(
  jobCardId: string,
  input: JobCardCloseInput,
): Promise<ActionResult> {
  const denied = await guard("workshop.write");
  if (denied) return denied;
  const parsed = jobCardCloseSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const jc = await repoClose({ jobCardId, ...parsed.data });
  if (!jc) return { ok: false, error: "Job card not found" };
  await logAudit({ entityType: "job_card", entityId: jc.id, action: "close" });
  revalidatePath("/workshop");
  revalidatePath(`/workshop/${jobCardId}`);
  revalidatePath(`/trucks/${jc.truckId}`);
  return { ok: true, id: jc.id };
}

export type CompleteResult =
  | { ok: true; id: string; billNumbers: string[]; nonBillableCount: number }
  | { ok: false; error: string };

export async function completeAndBillJobCard(
  jobCardId: string,
  input: JobCardCloseInput,
): Promise<CompleteResult> {
  const denied = await guard("workshop.complete");
  if (denied) return denied;
  const parsed = jobCardCloseSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const r = await repoCompleteAndBill({ jobCardId, ...parsed.data });
  if ("error" in r) return { ok: false, error: r.error };
  await logAudit({
    entityType: "job_card",
    entityId: r.jobCard.id,
    action: "complete_and_bill",
    diff: { bills: { from: null, to: r.billNumbers.join(", ") } },
  });
  revalidatePath("/workshop");
  revalidatePath(`/workshop/${jobCardId}`);
  revalidatePath(`/trucks/${r.jobCard.truckId}`);
  revalidatePath("/bills");
  return {
    ok: true,
    id: r.jobCard.id,
    billNumbers: r.billNumbers,
    nonBillableCount: r.nonBillableCount,
  };
}
