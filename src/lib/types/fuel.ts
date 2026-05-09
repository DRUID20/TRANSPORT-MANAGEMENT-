/**
 * Fuel logs — Phase 4C.
 * Tracks litres + odometer per truck so we can compute km/L efficiency.
 * Distinct from generic Expenses because the operational fields
 * (litres, odometer, station, country) drive the Performance Tracker.
 */

export type FuelLogPaymentMethod = "cash" | "mpesa" | "fuel_card" | "advance";

export interface FuelLog {
  id: string;
  number: string;             // e.g. FUEL-2026-0042
  tripId?: string;
  truckId: string;
  driverId?: string;
  /** When the truck was fuelled. */
  datetime: string;           // ISO datetime
  /** Station/vendor name. */
  station: string;
  /** ISO 3166-1 alpha-2; defaults to "KE". */
  countryCode: string;
  /** Total litres pumped. */
  litres: number;
  /** Cost in KES (converted on submission if foreign currency). */
  costKes: number;
  /** Computed at submission: costKes / litres. */
  pricePerLitreKes: number;
  /** Truck odometer reading at fuelling (km). */
  odometerKm: number;
  /** Optional link to the matching expense record (when created from
   *  a receipt scan). */
  expenseId?: string;
  notes?: string;
  submittedBy: string;
  createdAt: string;
}
