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
 * Fuel-only TMS: every truck is a tanker.
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
  fuelType: FuelType;              // truck's own engine fuel (diesel)
  capacityTonnes: number;          // legacy payload capacity — kept for non-tanker rigs (Phase 1)
  axles: number;
  status: TruckStatus;
  currentDriverId?: string;
  notes?: string;
  // ── Tanker specification (fuel-only TMS) ────────────────────
  /** Total tank capacity in litres (sum of compartments). */
  tankCapacityLitres?: number;
  /** Number of compartments — usually 4 to 7 for road tankers. */
  compartmentCount?: number;
  /** Per-compartment capacity in litres, in order. */
  compartmentCapacitiesLitres?: number[];
  /** Last EPRA tank-calibration certificate date. Cert valid for 2 years. */
  lastCalibrationDate?: string;
  /** Next calibration due date. */
  calibrationDueDate?: string;
  /** Permitted products this tanker is rated to carry. */
  permittedProducts?: ("PMS" | "AGO")[];
  // Compliance / expiry dates
  insuranceExpiry?: string;        // ISO date
  ntsaInspectionExpiry?: string;
  comesaPermitExpiry?: string;
  transitPermitExpiry?: string;
  /** EPRA / Kenya Pipeline transit licence. */
  epraTransitLicenceExpiry?: string;
  /** Petroleum carriers' liability insurance. */
  petroleumLiabilityExpiry?: string;
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
  /** Commission we keep per trip (decimal); they earn (1 − rate). Default 0.10. */
  commissionRate?: number;
  notes?: string;
  createdAt: string;
}

export type SubcontractorPaymentMethod = "cash" | "mpesa" | "bank" | "supplier_direct";

/** A debit on a subcontractor's current account — money paid out to/for them. */
export interface SubcontractorPayment {
  id: string;
  number: string;
  subcontractorId: string;
  date: string;
  amountKes: number;
  method: SubcontractorPaymentMethod;
  /** Set when method = supplier_direct (the supplier who paid them on our behalf). */
  supplierId?: string;
  /** The AP bill raised for the supplier-direct payment, if any. */
  billId?: string;
  reference?: string;
  notes?: string;
  createdAt: string;
}

export interface SubcontractorLedgerRow {
  date: string;
  ref: string;
  description: string;
  /** Their earnings (share of completed-trip freight). */
  credit: number;
  /** Money paid out to/for them. */
  debit: number;
  /** Running balance — positive = we still owe them. */
  balance: number;
}

export interface SubcontractorAccount {
  subcontractorId: string;
  name: string;
  commissionRate: number;
  openingBalance: number;
  rows: SubcontractorLedgerRow[];
  totalEarned: number;
  totalPaid: number;
  /** Positive = we owe the subcontractor; negative = they're overdrawn. */
  closingBalance: number;
}

// ============================================================
// Trailers
// ============================================================
export type TrailerType =
  | "flatbed"
  | "tanker"
  | "curtain_side"
  | "reefer"
  | "tipper"
  | "low_loader"
  | "container_skeleton";

export type TrailerStatus = "active" | "in_workshop" | "idle" | "retired";

export interface Trailer {
  id: string;
  registration: string;
  ownerType: OwnerType;
  subcontractorId?: string;
  type: TrailerType;
  capacityTonnes: number;
  axles: number;
  year: number;
  status: TrailerStatus;
  attachedTruckId?: string;        // currently coupled to which truck
  insuranceExpiry?: string;
  ntsaInspectionExpiry?: string;
  notes?: string;
  createdAt: string;
}

// ============================================================
// Drivers
// ============================================================
export type DriverStatus = "active" | "on_leave" | "on_trip" | "suspended" | "terminated";
export type LicenceClass = "BCE" | "CD" | "CE" | "DE";

export interface Driver {
  id: string;
  fullName: string;
  phone: string;
  nationalId: string;
  status: DriverStatus;
  licenceClass: LicenceClass;
  licenceNumber: string;
  licenceExpiry?: string;
  medicalExpiry?: string;
  passportNumber?: string;
  passportExpiry?: string;
  comesaDriverPermitExpiry?: string;
  defaultTruckId?: string;         // home truck (changeable per trip)
  hireDate?: string;
  notes?: string;
  createdAt: string;
}

// ============================================================
// Suppliers (for AP / Workshop)
// ============================================================
export type PaymentTerms = "cash_on_delivery" | "net_7" | "net_14" | "net_30" | "net_60";
export type DefaultPaymentMethod = "mpesa" | "bank" | "cash";

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  kraPin?: string;
  paymentTerms: PaymentTerms;
  defaultPaymentMethod: DefaultPaymentMethod;
  mpesaNumber?: string;
  bankName?: string;
  bankAccount?: string;
  defaultExpenseCategory?: string; // free-text for now (Phase 5 will reference CoA)
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
