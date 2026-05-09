/**
 * Trips domain types — Phase 2.
 * Customers, Rate Table, Bookings, Trips.
 */

// ============================================================
// Customers (export shippers)
// ============================================================
export interface Customer {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email?: string;
  kraPin?: string;
  /** Where to send invoices and statements. */
  billingAddress?: string;
  /** Currency the customer is billed in (KES base; USD common for exports). */
  billingCurrency: "KES" | "USD";
  /** Net N days; null = on-receipt. */
  paymentTermsDays: number;
  notes?: string;
  createdAt: string;
}

// ============================================================
// Rate table (destination-driven rate engine)
// ============================================================
export type RateBasis = "per_trip" | "per_tonne" | "per_km" | "per_container";
export type Currency = "KES" | "USD" | "UGX" | "TZS" | "RWF";

export interface Rate {
  id: string;
  origin: string;          // e.g. "Mombasa"
  destination: string;     // e.g. "Kampala"
  /** When set, this rate only applies to that customer (overrides default). */
  customerId?: string;
  /** Optional cargo class, e.g. "general", "containerised", "fuel" */
  cargoClass?: string;
  basis: RateBasis;
  amount: number;
  currency: Currency;
  notes?: string;
  createdAt: string;
}

// ============================================================
// Bookings (customer orders)
// ============================================================
export type BookingStatus = "draft" | "confirmed" | "planned" | "cancelled";
export type CargoUnit = "tonnes" | "TEUs" | "units" | "litres";

export interface Booking {
  id: string;
  number: string;          // e.g. "BK-2026-0042"
  customerId: string;
  origin: string;
  destination: string;
  cargoType: string;       // free-text e.g. "General cargo", "Coffee beans"
  cargoQuantity: number;
  cargoUnit: CargoUnit;
  /** Required pick-up date. */
  requestedDate: string;   // ISO date
  /** The rate agreed for this booking, snapshotted at confirmation time
   * (so later rate-table edits don't change historical bookings). */
  agreedAmount: number;
  agreedBasis: RateBasis;
  agreedCurrency: Currency;
  status: BookingStatus;
  tripId?: string;         // set once a Trip is planned from this booking
  notes?: string;
  createdAt: string;
}

// ============================================================
// Trips (the actual movement)
// ============================================================
export type TripStatus =
  | "planned"
  | "loading"
  | "in_transit"
  | "at_border"
  | "delivered"
  | "closed"
  | "delayed"
  | "cancelled";

export interface Trip {
  id: string;
  number: string;          // e.g. "TRP-2026-0142"
  bookingId: string;
  truckId: string;
  trailerId?: string;
  driverId: string;
  status: TripStatus;
  /** Snapshot of route + cargo at planning time. */
  origin: string;
  destination: string;
  cargoType: string;
  cargoQuantity: number;
  cargoUnit: CargoUnit;
  /** Snapshot of agreed revenue. */
  revenueAmount: number;
  revenueCurrency: Currency;
  /** Driver advance issued at planning, refined at close (Phase 2E). */
  driverAdvanceKes?: number;
  /** Planning timestamps. */
  plannedDepartureDate?: string;
  plannedDeliveryDate?: string;
  /** Actuals — captured during/after the trip (Phase 2B-2E). */
  actualDepartureAt?: string;
  actualDeliveryAt?: string;
  closedAt?: string;
  notes?: string;
  createdAt: string;
}
