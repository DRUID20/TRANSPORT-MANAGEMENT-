/**
 * Trips domain types — Phase 2.
 * Customers, Rate Table, Bookings, Trips.
 *
 * Fuel-only TMS (2026-05-11). Cargo is exclusively PMS (petrol) or AGO
 * (diesel). Volume is in litres; loaded vs delivered litres are
 * temperature-corrected to 20°C using captured density. Trucks are
 * tankers with calibrated compartments.
 */

// ============================================================
// Fuel products in scope
// ============================================================
export type FuelProduct = "PMS" | "AGO";

export const FUEL_PRODUCT_LABELS: Record<FuelProduct, string> = {
  PMS: "PMS (petrol)",
  AGO: "AGO (diesel)",
};

/** Typical density at 15°C in kg/L. Captured per consignment in production. */
export const FUEL_TYPICAL_DENSITY: Record<FuelProduct, number> = {
  PMS: 0.745,
  AGO: 0.840,
};

// ============================================================
// Customers (fuel offtakers)
// ============================================================
export type CustomerType =
  | "service_station"
  | "industrial"
  | "transporter"
  | "other";
export interface Customer {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email?: string;
  kraPin?: string;
  /** Service station vs industrial vs transporter (resale). */
  customerType?: CustomerType;
  /** EPRA marketer / dealer licence number, if applicable. */
  epraLicenceNumber?: string;
  /** Where to send invoices and statements. */
  billingAddress?: string;
  /** Currency the customer is billed in. KES base; USD common for exports;
   *  UGX for Uganda-billed customers. */
  billingCurrency: "KES" | "USD" | "UGX";
  /** Net N days; null = on-receipt. */
  paymentTermsDays: number;
  notes?: string;
  createdAt: string;
}

// ============================================================
// Rate table (destination-driven rate engine)
// ============================================================
/**
 * Rate basis for fuel hauls.
 *  - per_m3:    primary basis. Volume in cubic metres (1 m³ = 1000 L).
 *  - per_litre: alternative volume basis for customers who price per litre.
 *  - per_trip:  flat-fee charters.
 */
export type RateBasis = "per_m3" | "per_litre" | "per_trip";
/** Operating currencies. KES is the base; USD and UGX are the
 *  cross-border / export currencies in active use. */
export type Currency = "KES" | "USD" | "UGX";

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
  origin: string;          // depot, e.g. "KPC Mombasa"
  /** Optional — destination is bound on the trip (at the depot or border),
   *  not at booking. May still be captured as a non-binding intent here. */
  destination?: string;
  /** Fuel product. Free-text cargoType is preserved for legacy seeds but
   *  every new booking now sets `product` instead. */
  product?: FuelProduct;
  cargoType: string;       // legacy free-text — equal to FUEL_PRODUCT_LABELS[product] for new rows
  /** Volume agreed at booking time. */
  cargoQuantity: number;
  /** Always "litres" for new fuel bookings; legacy seeds may use other units. */
  cargoUnit: CargoUnit;
  /** Required pick-up date. */
  requestedDate: string;   // ISO date
  /** Rate is set on the TRIP after the destination is bound (looked up from
   *  the rate card for origin→destination). Optional here — only present if a
   *  deal was pre-agreed at booking. */
  agreedAmount?: number;
  agreedBasis?: RateBasis;
  agreedCurrency?: Currency;
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

/** A status transition event, captured for the trip timeline. */
export interface TripStatusEvent {
  id: string;
  tripId: string;
  fromStatus: TripStatus | null;   // null = initial 'planned' state
  toStatus: TripStatus;
  occurredAt: string;              // ISO datetime
  actorName: string;               // dispatcher / driver name (free-text)
  note?: string;
  /** Optional location/border tag, e.g. "Malaba (KE→UG)". */
  location?: string;
}

/**
 * State machine for trips. Returns the set of statuses reachable from
 * `from`. Used to drive the action buttons on the trip detail page.
 */
export function allowedTransitions(from: TripStatus): TripStatus[] {
  switch (from) {
    case "planned":     return ["loading", "cancelled"];
    case "loading":     return ["in_transit", "delayed", "cancelled"];
    case "in_transit":  return ["at_border", "delivered", "delayed", "cancelled"];
    case "at_border":   return ["in_transit", "delivered", "delayed", "cancelled"];
    case "delivered":   return ["closed", "delayed"];
    case "delayed":     return ["loading", "in_transit", "at_border", "delivered", "cancelled"];
    case "closed":      return [];
    case "cancelled":   return [];
  }
}

export function isTerminal(status: TripStatus): boolean {
  return status === "closed" || status === "cancelled";
}

export interface Trip {
  id: string;
  number: string;          // e.g. "TRP-2026-0142"
  bookingId: string;
  truckId: string;
  trailerId?: string;
  driverId: string;
  status: TripStatus;
  /** Snapshot of route + cargo at planning time. */
  origin: string;          // depot, e.g. "KPC Mombasa"
  /** Bound when the dispatcher confirms the delivery point — at the depot or
   *  the transit border (Malaba / Busia). The Road User Charge packet uses
   *  this; until set, the trip is "destination TBC". */
  destination?: string;
  destinationConfirmedAt?: string;
  destinationConfirmedBy?: string;
  /** Fuel product. New trips always set this; legacy rows keep cargoType only. */
  product?: FuelProduct;
  cargoType: string;
  cargoQuantity: number;
  cargoUnit: CargoUnit;
  /** Loading observations at the depot. */
  loadedLitres?: number;
  loadingTempC?: number;
  /** Product density at 15°C in kg/L from the product certificate. */
  density15C?: number;
  /** Loaded volume corrected to 20°C using captured density. */
  loadedLitres20C?: number;
  /** Seal numbers fitted at the depot (top + bottom or per compartment). */
  loadingSealNumbers?: string;
  /** Discharge observations at the customer. */
  dischargedLitres?: number;
  dischargeTempC?: number;
  dischargedLitres20C?: number;
  dischargeSealNumbers?: string;
  /** Ullage variance % = (loaded20C - discharged20C) / loaded20C * 100.
   *  Threshold typically 0.5%; anything higher triggers an investigation. */
  ullagePct?: number;
  /** Optional transit-bond reference for cross-border loads. */
  transitBondNumber?: string;
  /** Snapshot of agreed revenue. */
  revenueAmount: number;
  revenueCurrency: Currency;
  /** Driver advance issued at planning, refined at close (Phase 2E). */
  driverAdvanceKes?: number;
  /** How much of the advance was actually spent (captured at close). */
  driverAdvanceUsedKes?: number;
  /** Planning timestamps. */
  plannedDepartureDate?: string;
  plannedDeliveryDate?: string;
  /** Actuals — captured during/after the trip (Phase 2B-2E). */
  actualDepartureAt?: string;
  actualDeliveryAt?: string;
  closedAt?: string;
  /** Captured at close (Phase 2E). */
  actualKm?: number;
  actualFuelLitres?: number;
  /** Once the trip is closed and reconciled, dispatch flips this on
   * to release it to AR / invoicing in Phase 5. */
  readyToInvoice?: boolean;
  notes?: string;
  createdAt: string;
}

// ============================================================
// Fuel volume helpers
// ============================================================

/**
 * Convert an observed (ambient-temperature) volume to its 20°C-corrected
 * equivalent using a simplified Volume Correction Factor (VCF). Petroleum
 * tables (ASTM D1250) give a precise factor per product + density; the
 * approximation here uses the cubical expansion coefficient β (per °C):
 *   AGO (diesel): β ≈ 0.00084 /°C
 *   PMS (petrol): β ≈ 0.00120 /°C
 * VCF = 1 / (1 + β × (T − 20)).
 *
 * Accurate enough for operational ullage reporting; the authoritative
 * temperature-correction at month-end still uses ASTM tables.
 */
export function correctVolumeTo20C(
  product: FuelProduct,
  observedLitres: number,
  tempC: number,
): number {
  const beta = product === "PMS" ? 0.0012 : 0.00084;
  const vcf = 1 / (1 + beta * (tempC - 20));
  return Math.round(observedLitres * vcf);
}

/**
 * Compute the ullage variance (%): positive = loss, negative = gain.
 * Both inputs are 20°C-corrected litres.
 */
export function ullageVariancePct(
  loadedLitres20C: number,
  dischargedLitres20C: number,
): number {
  if (loadedLitres20C <= 0) return 0;
  return ((loadedLitres20C - dischargedLitres20C) / loadedLitres20C) * 100;
}

/** Threshold above which an ullage variance should trigger an alert. */
export const ULLAGE_ALERT_THRESHOLD_PCT = 0.5;

/**
 * The freight we ACTUALLY invoice the customer.
 *
 * Fuel freight is billed on what was delivered, not what was booked: the
 * customer pays for the litres that arrive in their tank (@20°C). The rate per
 * litre is fixed from the rate card (booked revenue ÷ booked litres); we just
 * re-multiply it by the delivered volume.
 *
 *   billed litres = delivered L20  (else loaded L20, else booked — in that
 *                   order of preference, depending on how far the trip is)
 *   amount        = billed litres × rate/L
 *
 * Non-litre cargo (flat charters priced per_trip) bills the booked revenue
 * as-is — there's no per-litre rate to re-apply.
 *
 * Mirrors the rounding used by the invoice create form so the figure shown on
 * the trip matches the figure on the generated invoice to the cent.
 */
export function billableFreight(trip: {
  cargoUnit: string;
  cargoQuantity: number;
  revenueAmount: number;
  revenueCurrency: Currency | string;
  loadedLitres?: number;
  loadedLitres20C?: number;
  dischargedLitres?: number;
  dischargedLitres20C?: number;
}): {
  amount: number;
  currency: string;
  billedLitres?: number;
  ratePerLitre?: number;
  source: "delivered" | "loaded" | "booked";
} {
  const isLitres = trip.cargoUnit === "litres";
  if (!isLitres || trip.cargoQuantity <= 0) {
    return { amount: trip.revenueAmount, currency: trip.revenueCurrency, source: "booked" };
  }
  const ratePerLitre = Math.round((trip.revenueAmount / trip.cargoQuantity) * 10_000) / 10_000;
  const delivered = trip.dischargedLitres20C ?? trip.dischargedLitres;
  const loaded = trip.loadedLitres20C ?? trip.loadedLitres;
  const billed =
    delivered !== undefined
      ? { litres: delivered, source: "delivered" as const }
      : loaded !== undefined
        ? { litres: loaded, source: "loaded" as const }
        : { litres: trip.cargoQuantity, source: "booked" as const };
  return {
    amount: Math.round(ratePerLitre * billed.litres * 100) / 100,
    currency: trip.revenueCurrency,
    billedLitres: billed.litres,
    ratePerLitre,
    source: billed.source,
  };
}

/**
 * Compute revenue for a fuel haul given the agreed rate and the cargo volume.
 *
 *  - per_m3:    amount × (litres / 1000)
 *  - per_litre: amount × litres
 *  - per_trip:  amount (flat charter fee)
 */
export function computeFuelRevenue(input: {
  basis: RateBasis;
  amount: number;
  cargoQuantityLitres: number;
}): number {
  const { basis, amount, cargoQuantityLitres } = input;
  switch (basis) {
    case "per_m3":
      return amount * (cargoQuantityLitres / 1000);
    case "per_litre":
      return amount * cargoQuantityLitres;
    case "per_trip":
      return amount;
  }
}
