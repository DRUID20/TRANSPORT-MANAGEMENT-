/**
 * Fleet domain types — Phase 1.
 * Shared by both UI and server-side mock store.
 */

export type OwnerType = "company_owned" | "subcontractor";

export type TruckStatus =
  | "active"
  | "in_service"
  | "in_workshop"
  | "idle"
  | "retired";

export type FuelType = "diesel" | "petrol";

/**
 * A truck. Identified by Kenyan registration plate (e.g. "KCB 421R").
 * If owned by a subcontractor, `subcontractorId` is set.
 */
export interface Truck {
  id: string;                      // uuid
  registration: string;            // primary identifier
  ownerType: OwnerType;
  subcontractorId?: string;        // required iff ownerType === 'subcontractor'
  make: string;                    // e.g. "Mercedes-Benz"
  model: string;                   // e.g. "Actros 2545"
  year: number;
  fuelType: FuelType;
  capacityTonnes: number;          // payload capacity
  axles: number;
  status: TruckStatus;
  currentDriverId?: string;
  notes?: string;
  // Compliance / expiry dates
  insuranceExpiry?: string;        // ISO date
  ntsaInspectionExpiry?: string;
  comesaPermitExpiry?: string;
  transitPermitExpiry?: string;
  createdAt: string;               // ISO datetime
}

/**
 * A subcontractor — third-party owner of one or more trucks operating
 * under our trips. Year-end settlement; rate methodology TBD.
 */
export interface Subcontractor {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email?: string;
  kraPin?: string;                 // Kenyan tax ID
  mpesaNumber?: string;            // for year-end settlement
  bankName?: string;
  bankAccount?: string;
  notes?: string;
  createdAt: string;
}

/**
 * Helper: derive a 30/60/90-day expiry classification for the dashboard.
 */
export type ExpiryStatus = "ok" | "warning" | "critical" | "expired";

export function classifyExpiry(iso: string | undefined, today = new Date()): ExpiryStatus {
  if (!iso) return "ok";
  const d = new Date(iso);
  const days = Math.floor((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 0) return "expired";
  if (days <= 14) return "critical";
  if (days <= 30) return "warning";
  return "ok";
}
