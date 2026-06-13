/**
 * Appraisal repo — cycles + reviews. Dual-mode, org-scoped.
 *
 * Reviews progress through draft → employee_submitted → manager_reviewed →
 * hr_finalised (locked). listReviewsForCycle / getAppraisalReview auto-seed
 * an empty review for active employees so the UI never has to first POST.
 */
import { and, asc, desc, eq } from "drizzle-orm";
import { IS_DEMO_MODE } from "@/server/auth/session-secret";
import { requireOrgId } from "@/server/auth/current-org";
import { getDb } from "@/server/db/client";
import {
  appraisalCycles as cyclesTable,
  appraisalReviews as reviewsTable,
} from "@/server/db/schema";
import { listEmployees, getEmployee } from "@/server/repos/hr";
import {
  advanceAppraisalReview as storeAdvance,
  createAppraisalCycle as storeCreateCycle,
  getAppraisalCycle as storeGetCycle,
  getAppraisalReview as storeGetReview,
  listAppraisalCycles as storeListCycles,
  listReviewsForCycle as storeListReviews,
  reviewsForEmployee as storeReviewsForEmployee,
  setAppraisalCycleStatus as storeSetCycleStatus,
  updateAppraisalReview as storeUpdate,
} from "@/server/store/mock-store";
import type {
  AppraisalCycle,
  AppraisalCycleStatus,
  AppraisalGoal,
  AppraisalReview,
  AppraisalReviewStatus,
  CompetencyRating,
} from "@/lib/types/appraisal";

type CRow = typeof cyclesTable.$inferSelect;
type RRow = typeof reviewsTable.$inferSelect;

function toCycle(r: CRow): AppraisalCycle {
  return {
    id: r.id,
    label: r.label,
    year: r.year,
    startDate: r.startDate,
    endDate: r.endDate,
    status: r.status as AppraisalCycleStatus,
    notes: r.notes ?? undefined,
    createdAt: r.createdAt.toISOString(),
  };
}

function toReview(r: RRow): AppraisalReview {
  return {
    id: r.id,
    cycleId: r.cycleId,
    employeeId: r.employeeId,
    managerId: r.managerId ?? undefined,
    goals: ((r.goals as unknown) as AppraisalGoal[]) ?? [],
    competencies: ((r.competencies as unknown) as CompetencyRating[]) ?? [],
    overallRating: (r.overallRating as 1 | 2 | 3 | 4 | 5 | null) ?? undefined,
    employeeComment: r.employeeComment ?? undefined,
    managerComment: r.managerComment ?? undefined,
    hrComment: r.hrComment ?? undefined,
    status: r.status as AppraisalReviewStatus,
    recommendation: (r.recommendation as AppraisalReview["recommendation"]) ?? undefined,
    proposedIncrementPct: r.proposedIncrementPct === null ? undefined : Number(r.proposedIncrementPct),
    submittedAt: r.submittedAt?.toISOString(),
    managerReviewedAt: r.managerReviewedAt?.toISOString(),
    hrFinalisedAt: r.hrFinalisedAt?.toISOString(),
    createdAt: r.createdAt.toISOString(),
  };
}

async function seedReview(cycleId: string, employeeId: string): Promise<AppraisalReview> {
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .insert(reviewsTable)
    .values({
      organizationId: orgId,
      cycleId,
      employeeId,
      goals: [],
      competencies: [],
      status: "not_started",
    })
    .returning();
  return toReview(rows[0]!);
}

// ---- Cycles ----
export async function listAppraisalCycles(): Promise<AppraisalCycle[]> {
  if (IS_DEMO_MODE) return storeListCycles();
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .select()
    .from(cyclesTable)
    .where(eq(cyclesTable.organizationId, orgId))
    .orderBy(desc(cyclesTable.year));
  return rows.map(toCycle);
}

export async function getAppraisalCycle(id: string): Promise<AppraisalCycle | undefined> {
  if (IS_DEMO_MODE) return storeGetCycle(id);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .select()
    .from(cyclesTable)
    .where(and(eq(cyclesTable.id, id), eq(cyclesTable.organizationId, orgId)))
    .limit(1);
  return rows[0] ? toCycle(rows[0]) : undefined;
}

export async function createAppraisalCycle(input: {
  label: string;
  year: number;
  startDate: string;
  endDate: string;
  notes?: string;
}): Promise<AppraisalCycle | { error: string }> {
  if (IS_DEMO_MODE) return storeCreateCycle(input);
  const db = getDb();
  const orgId = await requireOrgId();
  const existing = await db
    .select({ id: cyclesTable.id })
    .from(cyclesTable)
    .where(and(eq(cyclesTable.organizationId, orgId), eq(cyclesTable.year, input.year)))
    .limit(1);
  if (existing[0]) return { error: "Cycle for that year already exists" };
  const rows = await db
    .insert(cyclesTable)
    .values({
      organizationId: orgId,
      label: input.label,
      year: input.year,
      startDate: input.startDate,
      endDate: input.endDate,
      status: "open",
      notes: input.notes ?? null,
    })
    .returning();
  return toCycle(rows[0]!);
}

export async function setAppraisalCycleStatus(
  id: string,
  status: AppraisalCycleStatus,
): Promise<AppraisalCycle | undefined> {
  if (IS_DEMO_MODE) return storeSetCycleStatus(id, status);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .update(cyclesTable)
    .set({ status })
    .where(and(eq(cyclesTable.id, id), eq(cyclesTable.organizationId, orgId)))
    .returning();
  return rows[0] ? toCycle(rows[0]) : undefined;
}

// ---- Reviews ----
export async function listReviewsForCycle(cycleId: string): Promise<AppraisalReview[]> {
  if (IS_DEMO_MODE) return storeListReviews(cycleId);
  const db = getDb();
  const orgId = await requireOrgId();
  // Seed any missing reviews for active employees.
  const emps = await listEmployees();
  const active = emps.filter((e) => e.status !== "terminated");
  const existing = await db
    .select({ employeeId: reviewsTable.employeeId })
    .from(reviewsTable)
    .where(and(eq(reviewsTable.organizationId, orgId), eq(reviewsTable.cycleId, cycleId)));
  const have = new Set(existing.map((r) => r.employeeId));
  for (const e of active) {
    if (!have.has(e.id)) await seedReview(cycleId, e.id);
  }
  const rows = await db
    .select({ review: reviewsTable })
    .from(reviewsTable)
    .where(and(eq(reviewsTable.organizationId, orgId), eq(reviewsTable.cycleId, cycleId)));
  // Sort by employee number for stable display
  const empMap = new Map(emps.map((e) => [e.id, e]));
  return rows
    .sort((a, b) =>
      (empMap.get(a.review.employeeId)?.employeeNumber ?? "").localeCompare(
        empMap.get(b.review.employeeId)?.employeeNumber ?? "",
      ),
    )
    .map((r) => toReview(r.review));
}

export async function getAppraisalReview(
  cycleId: string,
  employeeId: string,
): Promise<AppraisalReview | undefined> {
  if (IS_DEMO_MODE) return storeGetReview(cycleId, employeeId);
  const db = getDb();
  const orgId = await requireOrgId();
  const found = (
    await db
      .select()
      .from(reviewsTable)
      .where(
        and(
          eq(reviewsTable.organizationId, orgId),
          eq(reviewsTable.cycleId, cycleId),
          eq(reviewsTable.employeeId, employeeId),
        ),
      )
      .limit(1)
  )[0];
  if (found) return toReview(found);
  const cycle = await getAppraisalCycle(cycleId);
  const employee = await getEmployee(employeeId);
  if (!cycle || !employee) return undefined;
  return seedReview(cycleId, employeeId);
}

export async function updateAppraisalReview(input: {
  cycleId: string;
  employeeId: string;
  goals: Array<Omit<AppraisalGoal, "id"> & { id?: string }>;
  competencies: CompetencyRating[];
  overallRating?: number;
  employeeComment?: string;
  managerComment?: string;
  hrComment?: string;
  recommendation?: "promote" | "increment" | "training" | "pip" | "none";
  proposedIncrementPct?: number;
}): Promise<AppraisalReview | { error: string }> {
  if (IS_DEMO_MODE) return storeUpdate(input);
  const existing = await getAppraisalReview(input.cycleId, input.employeeId);
  if (!existing) return { error: "Review not found" };
  if (existing.status === "hr_finalised") return { error: "Review is HR-finalised — locked" };
  const goals = input.goals.map((g, i) => ({
    ...g,
    id: g.id ?? `goal-${input.cycleId}-${input.employeeId}-${i}`,
  }));
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .update(reviewsTable)
    .set({
      goals: goals as unknown as Record<string, unknown>[],
      competencies: input.competencies as unknown as Record<string, unknown>[],
      overallRating: input.overallRating ?? null,
      employeeComment: input.employeeComment ?? null,
      managerComment: input.managerComment ?? null,
      hrComment: input.hrComment ?? null,
      recommendation: input.recommendation ?? null,
      proposedIncrementPct: input.proposedIncrementPct !== undefined ? String(input.proposedIncrementPct) : null,
    })
    .where(and(eq(reviewsTable.id, existing.id), eq(reviewsTable.organizationId, orgId)))
    .returning();
  return rows[0] ? toReview(rows[0]) : { error: "Update failed" };
}

export async function advanceAppraisalReview(
  cycleId: string,
  employeeId: string,
  to: AppraisalReviewStatus,
): Promise<AppraisalReview | { error: string }> {
  if (IS_DEMO_MODE) return storeAdvance(cycleId, employeeId, to);
  const existing = await getAppraisalReview(cycleId, employeeId);
  if (!existing) return { error: "Review not found" };
  const order: AppraisalReviewStatus[] = ["draft", "employee_submitted", "manager_reviewed", "hr_finalised"];
  if (order.indexOf(to) <= order.indexOf(existing.status)) {
    return { error: `Cannot move backwards from ${existing.status} to ${to}` };
  }
  const db = getDb();
  const orgId = await requireOrgId();
  const set: Partial<typeof reviewsTable.$inferInsert> = { status: to };
  if (to === "employee_submitted") set.submittedAt = new Date();
  if (to === "manager_reviewed") set.managerReviewedAt = new Date();
  if (to === "hr_finalised") set.hrFinalisedAt = new Date();
  const rows = await db
    .update(reviewsTable)
    .set(set)
    .where(and(eq(reviewsTable.id, existing.id), eq(reviewsTable.organizationId, orgId)))
    .returning();
  return rows[0] ? toReview(rows[0]) : { error: "Advance failed" };
}

export async function reviewsForEmployee(employeeId: string): Promise<AppraisalReview[]> {
  if (IS_DEMO_MODE) return storeReviewsForEmployee(employeeId);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .select()
    .from(reviewsTable)
    .where(and(eq(reviewsTable.organizationId, orgId), eq(reviewsTable.employeeId, employeeId)))
    .orderBy(asc(reviewsTable.cycleId));
  return rows.map(toReview);
}
