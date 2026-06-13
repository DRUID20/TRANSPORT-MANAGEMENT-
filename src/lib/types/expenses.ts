/**
 * Expenses domain — Phase 4A.
 * Per-trip / per-truck operating costs, awaiting AP integration in Phase 5.
 */

export type ExpenseStatus = "pending" | "approved" | "rejected" | "reimbursed";

/**
 * Coarse categories. These map to CoA accounts in Phase 5; for now the
 * label is free-text-friendly so dispatchers can capture without a CoA
 * picker.
 */
export type ExpenseCategory =
  | "fuel"               // → 500100 Fuel
  | "tolls"              // → 500200 Toll Fees
  | "border_charges"     // → 500300 Border / Customs / Transit Charges
  | "weighbridge"        // → 500400 Weighbridge Fees
  | "loading_offloading" // → 500500
  | "demurrage"          // → 500600
  | "driver_per_diem"    // → 502100 Driver Per-Diem
  | "driver_overnight"   // → 502200
  | "driver_welfare"     // → 502300 Driver Welfare (meals/accommodation)
  | "vehicle_repair"     // → 504500 Vehicle Repairs & Maintenance
  | "tyres"              // → 504100 Tyres
  | "spares"             // → 504300 Spare Parts & Consumables
  | "lubricants"         // → 504400 Lubricants & Oils
  | "tracker"            // → 504800 Tracker / GPS
  | "vehicle_licence"    // → 504900 Vehicle Licences
  | "fines_penalties"    // → 612000 Fines & Penalties
  | "other";             // → 509000

export type PaymentMethod = "cash" | "mpesa" | "bank" | "fuel_card" | "advance";

export interface Expense {
  id: string;
  number: string;             // e.g. "EXP-2026-0042"
  /** Always KES; foreign-currency amounts are converted at submission time
   *  using the day's CBK rate (Phase 5 will revalue on posting). */
  amountKes: number;
  /** When captured in foreign currency, original amount + currency are kept
   *  for the audit trail. */
  originalAmount?: number;
  originalCurrency?: "KES" | "USD" | "UGX";
  category: ExpenseCategory;
  description: string;
  /** Where the cost was incurred (free text; "Mombasa", "Malaba", etc.). */
  location?: string;
  /** ISO 3166-1 alpha-2; defaults to "KE". */
  countryCode?: string;
  /** When the expense was incurred (driver enters; defaults to now). */
  incurredAt: string;
  /** How it was paid. */
  paidBy: PaymentMethod;
  /** Optional links so reports can roll up by trip / truck / driver / supplier. */
  tripId?: string;
  truckId?: string;
  driverId?: string;
  supplierId?: string;
  /** When attached, the matching scanned receipt lives in TripDocument. */
  receiptDocumentId?: string;
  /** Workflow */
  status: ExpenseStatus;
  submittedBy: string;
  submittedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  reimbursedAt?: string;
  /** Free-text notes from approver. */
  notes?: string;
  createdAt: string;
}

export const expenseCategoryLabel: Record<ExpenseCategory, string> = {
  fuel: "Fuel",
  tolls: "Tolls",
  border_charges: "Border / Customs",
  weighbridge: "Weighbridge",
  loading_offloading: "Loading / Offloading",
  demurrage: "Demurrage / Detention",
  driver_per_diem: "Driver per-diem",
  driver_overnight: "Driver overnight",
  driver_welfare: "Driver welfare",
  vehicle_repair: "Vehicle repair",
  tyres: "Tyres",
  spares: "Spare parts",
  lubricants: "Lubricants & oils",
  tracker: "Tracker / GPS",
  vehicle_licence: "Vehicle licence",
  fines_penalties: "Fines & penalties",
  other: "Other",
};

export const paymentMethodLabel: Record<PaymentMethod, string> = {
  cash: "Cash",
  mpesa: "M-Pesa",
  bank: "Bank",
  fuel_card: "Fuel card",
  advance: "Driver advance",
};
