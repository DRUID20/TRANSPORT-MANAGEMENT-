/**
 * Workshop / Job Card domain types — Phase 1C.
 * A Job Card is generated every time a truck is serviced at the yard.
 */

export type JobCardStatus =
  | "open"
  | "in_progress"
  | "awaiting_parts"
  | "completed"
  | "cancelled";

export interface JobCardService {
  id: string;
  jobCardId: string;
  description: string;
  hours: number;
  costKes: number;
  performedAt: string; // ISO datetime
}

export interface JobCardSpare {
  id: string;
  jobCardId: string;
  description: string;
  quantity: number;
  unitCostKes: number;
  totalCostKes: number;
  supplierId?: string;
  // Posting bookkeeping (Phase 5 will create the actual AP bill)
  posted: boolean;
  postedAt?: string;
  consumedAt: string;
}

export interface JobCard {
  id: string;
  number: string;             // human-readable e.g. JC-2026-001
  truckId: string;
  status: JobCardStatus;
  mechanicName: string;
  openingOdometer?: number;   // optional: km at intake
  closingOdometer?: number;   // set on close
  mechanicAnalysis: string;   // free-text diagnostic
  notes?: string;
  openedAt: string;           // ISO datetime
  closedAt?: string;
  // Computed totals (recomputed on every mutation)
  laborTotalKes: number;
  sparesTotalKes: number;
  totalKes: number;
}

/** Aggregate returned from the store with related lines pre-loaded. */
export interface JobCardDetail extends JobCard {
  services: JobCardService[];
  spares: JobCardSpare[];
}
