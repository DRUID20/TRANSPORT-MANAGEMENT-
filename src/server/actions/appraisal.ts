"use server";

import { revalidatePath } from "next/cache";
import {
  advanceAppraisalReview as storeAdvance,
  createAppraisalCycle as storeCreateCycle,
  getAppraisalCycle,
  getAppraisalReview,
  listAppraisalCycles as storeListCycles,
  listReviewsForCycle as storeListReviews,
  reviewsForEmployee as storeReviewsForEmployee,
  setAppraisalCycleStatus as storeSetCycleStatus,
  updateAppraisalReview as storeUpdate,
} from "@/server/store/mock-store";
import type { AppraisalCycleStatus, AppraisalReviewStatus } from "@/lib/types/appraisal";
import {
  cycleCreateSchema,
  reviewUpdateSchema,
  type CycleCreateInput,
  type ReviewUpdateInput,
} from "@/lib/validators/appraisal";

export async function listAppraisalCycles() {
  return storeListCycles();
}
export async function getAppraisalCycleById(id: string) {
  return getAppraisalCycle(id);
}
export async function listReviewsForCycle(cycleId: string) {
  return storeListReviews(cycleId);
}
export async function getAppraisalReviewById(cycleId: string, employeeId: string) {
  return getAppraisalReview(cycleId, employeeId);
}
export async function reviewsForEmployee(employeeId: string) {
  return storeReviewsForEmployee(employeeId);
}

export type ActionResult = { ok: true; id: string } | { ok: false; error: string };

export async function createAppraisalCycle(input: CycleCreateInput): Promise<ActionResult> {
  const parsed = cycleCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const r = storeCreateCycle(parsed.data);
  if ("error" in r) return { ok: false, error: r.error };
  revalidatePath("/hr/appraisals");
  return { ok: true, id: r.id };
}

export async function setAppraisalCycleStatus(
  id: string,
  status: AppraisalCycleStatus,
): Promise<ActionResult> {
  const r = storeSetCycleStatus(id, status);
  if (!r) return { ok: false, error: "Not found" };
  revalidatePath("/hr/appraisals");
  revalidatePath(`/hr/appraisals/${id}`);
  return { ok: true, id: r.id };
}

export async function updateReview(input: ReviewUpdateInput): Promise<ActionResult> {
  const parsed = reviewUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const r = storeUpdate({
    ...parsed.data,
    competencies: parsed.data.competencies.map((c) => ({
      competency: c.competency,
      selfRating: c.selfRating as 1 | 2 | 3 | 4 | 5 | undefined,
      managerRating: c.managerRating as 1 | 2 | 3 | 4 | 5 | undefined,
      comment: c.comment,
    })),
  });
  if ("error" in r) return { ok: false, error: r.error };
  revalidatePath(`/hr/appraisals/${parsed.data.cycleId}`);
  revalidatePath(`/hr/appraisals/${parsed.data.cycleId}/${parsed.data.employeeId}`);
  return { ok: true, id: r.id };
}

export async function advanceReview(
  cycleId: string,
  employeeId: string,
  to: AppraisalReviewStatus,
): Promise<ActionResult> {
  const r = storeAdvance(cycleId, employeeId, to);
  if ("error" in r) return { ok: false, error: r.error };
  revalidatePath(`/hr/appraisals/${cycleId}`);
  revalidatePath(`/hr/appraisals/${cycleId}/${employeeId}`);
  return { ok: true, id: r.id };
}
