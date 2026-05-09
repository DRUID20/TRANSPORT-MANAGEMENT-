/**
 * Performance / Appraisal — Phase 6E.
 * Annual cycle with goals + competency ratings + 3-stage signoff.
 */

export type AppraisalCycleStatus = "draft" | "open" | "closed";

export interface AppraisalCycle {
  id: string;
  /** Display label, e.g. "2026". */
  label: string;
  /** Year integer for sorting. */
  year: number;
  startDate: string;
  endDate: string;
  status: AppraisalCycleStatus;
  notes?: string;
  createdAt: string;
}

export type AppraisalReviewStatus =
  | "draft"
  | "employee_submitted"
  | "manager_reviewed"
  | "hr_finalised";

export type Rating = 1 | 2 | 3 | 4 | 5;

export interface AppraisalGoal {
  id: string;
  description: string;
  /** Optional measurable target. */
  target?: string;
  /** Self-assessed achievement (0-100). */
  selfRating?: number;
  /** Manager's rating of achievement (0-100). */
  managerRating?: number;
}

/** Standard NVL competencies. */
export const STANDARD_COMPETENCIES = [
  "Quality of work",
  "Job knowledge",
  "Reliability & punctuality",
  "Initiative & ownership",
  "Communication",
  "Teamwork",
  "Customer focus",
  "Safety & compliance",
] as const;

export interface CompetencyRating {
  competency: string;
  /** 1-5 scale: 1 unsatisfactory, 3 meets expectations, 5 outstanding. */
  selfRating?: Rating;
  managerRating?: Rating;
  comment?: string;
}

export interface AppraisalReview {
  id: string;
  cycleId: string;
  employeeId: string;
  /** Reviewer = the line manager doing the appraisal. */
  managerId?: string;
  goals: AppraisalGoal[];
  competencies: CompetencyRating[];
  /** Overall manager-set rating (1-5). */
  overallRating?: Rating;
  /** Free-text from each side. */
  employeeComment?: string;
  managerComment?: string;
  hrComment?: string;
  /** Workflow stage. */
  status: AppraisalReviewStatus;
  /** Recommended action: promote / increment / training / pip / none. */
  recommendation?: "promote" | "increment" | "training" | "pip" | "none";
  /** Suggested salary increment %, if any. */
  proposedIncrementPct?: number;
  submittedAt?: string;
  managerReviewedAt?: string;
  hrFinalisedAt?: string;
  createdAt: string;
}

export const RATING_LABELS: Record<Rating, string> = {
  1: "Unsatisfactory",
  2: "Below expectations",
  3: "Meets expectations",
  4: "Exceeds expectations",
  5: "Outstanding",
};

/** Compute overall progress (0-100) for a review. */
export function reviewProgress(review: AppraisalReview): number {
  let total = 0;
  let done = 0;
  // 1 point: goals filled
  if (review.goals.length > 0) {
    total++;
    if (review.goals.every((g) => g.selfRating !== undefined && g.managerRating !== undefined)) {
      done++;
    }
  }
  // 1 point: competencies rated
  if (review.competencies.length > 0) {
    total++;
    if (review.competencies.every((c) => c.selfRating !== undefined && c.managerRating !== undefined)) {
      done++;
    }
  }
  // 3 points: each signoff stage
  total += 3;
  if (review.status === "employee_submitted" || review.status === "manager_reviewed" || review.status === "hr_finalised") done++;
  if (review.status === "manager_reviewed" || review.status === "hr_finalised") done++;
  if (review.status === "hr_finalised") done++;

  return total > 0 ? Math.round((done / total) * 100) : 0;
}
