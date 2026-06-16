/**
 * TX System — Database schema (Phase 0 foundation)
 *
 * Only the foundational tables for multi-tenancy, auth/roles, FX, and audit.
 * Domain tables (trucks, trips, GL, etc.) come in Phase 1+.
 *
 * Multi-currency rule: every monetary column carries (amount, currency,
 * fx_rate_at_posting, posted_amount_in_kes). Implemented as a reusable shape
 * once the GL is added in Phase 5.
 */

import {
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  integer,
  numeric,
  boolean,
  jsonb,
  primaryKey,
  index,
  date,
} from "drizzle-orm/pg-core";

// ---------- Organisations (multi-tenancy root) ----------
export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  baseCurrency: varchar("base_currency", { length: 3 }).notNull().default("KES"),
  countryCode: varchar("country_code", { length: 2 }).notNull().default("KE"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------- Users (custom auth — email + password + OTP recovery) ----------
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  phone: varchar("phone", { length: 32 }),
  fullName: text("full_name").notNull(),
  /** bcryptjs hash. Null only for OAuth-style users — not used today. */
  passwordHash: text("password_hash"),
  /** Storage key (in the documents bucket) of the user's avatar. */
  profilePhotoKey: text("profile_photo_key"),
  /** Quick-lookup role key; userRoles is the authoritative many-to-many. */
  roleKey: varchar("role_key", { length: 32 }).notNull().default("viewer"),
  isActive: boolean("is_active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  byOrg: index("users_org_idx").on(t.organizationId),
  byEmail: index("users_email_idx").on(t.email),
}));

// ---------- Password reset OTPs (one-time, 15-min TTL, single-use) ----------
export const passwordResetOtps = pgTable(
  "password_reset_otps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** bcryptjs hash of the 6-digit code (never store the code in plaintext). */
    codeHash: text("code_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    /** Failed verify attempts; the code is burned after 5 to stop brute force. */
    attempts: integer("attempts").notNull().default(0),
    requestedIp: varchar("requested_ip", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byUser: index("otp_user_idx").on(t.userId),
    byExpiry: index("otp_expiry_idx").on(t.expiresAt),
  }),
);

// ---------- Roles (RBAC primitive — full role catalogue defined later) ----------
export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  key: varchar("key", { length: 64 }).notNull(),
  label: text("label").notNull(),
  // permissions are { resource: ["read"|"write"|"approve"|...] } — refined per module
  permissions: jsonb("permissions").$type<Record<string, string[]>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userRoles = pgTable(
  "user_roles",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.userId, t.roleId] }) }),
);

// ---------- Currencies (lookup) ----------
export const currencies = pgTable("currencies", {
  code: varchar("code", { length: 3 }).primaryKey(), // KES, USD, UGX, TZS, RWF, ...
  name: text("name").notNull(),
  symbol: varchar("symbol", { length: 8 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

// ---------- FX rates (CBK primary; Frankfurter fallback; manual override) ----------
export const fxRates = pgTable(
  "fx_rates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    rateDate: date("rate_date").notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    rateToKes: numeric("rate_to_kes", { precision: 18, scale: 8 }).notNull(),
    source: varchar("source", { length: 16 }).notNull(), // 'CBK' | 'FRANKFURTER' | 'MANUAL'
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
    overrideReason: text("override_reason"),
    overrideBy: uuid("override_by").references(() => users.id),
  },
  (t) => ({
    byDateCcy: index("fx_rates_date_ccy_idx").on(t.rateDate, t.currency),
  }),
);

// ---------- Audit log (every write captured) ----------
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "cascade",
    }),
    actorUserId: uuid("actor_user_id").references(() => users.id),
    action: varchar("action", { length: 64 }).notNull(), // 'create' | 'update' | 'delete' | 'login' | etc.
    entityType: varchar("entity_type", { length: 64 }).notNull(),
    entityId: text("entity_id"),
    diff: jsonb("diff").$type<Record<string, { from: unknown; to: unknown }>>(),
    ipAddress: varchar("ip_address", { length: 64 }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byOrgEntity: index("audit_org_entity_idx").on(t.organizationId, t.entityType, t.entityId),
    byActor: index("audit_actor_idx").on(t.actorUserId),
  }),
);

// ---------- Chart of Accounts (seeded from docs/finance/coa-proposed.csv in Phase 5) ----------
export const chartOfAccounts = pgTable(
  "chart_of_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 16 }).notNull(),
    name: text("name").notNull(),
    class: varchar("class", { length: 32 }).notNull(),
    group: varchar("group", { length: 32 }).notNull(),
    type: varchar("type", { length: 64 }).notNull(),
    normalBalance: varchar("normal_balance", { length: 8 }).notNull(), // 'Debit' | 'Credit'
    currency: varchar("currency", { length: 3 }).notNull().default("KES"),
    status: varchar("status", { length: 16 }).notNull().default("Active"),
    notes: text("notes"),
  },
  (t) => ({
    byOrgCode: index("coa_org_code_idx").on(t.organizationId, t.code),
  }),
);

// ---------- Counters (for human-friendly numbers like TRP-2026-0142) ----------
export const counters = pgTable(
  "counters",
  {
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    key: varchar("key", { length: 32 }).notNull(),
    nextValue: integer("next_value").notNull().default(1),
  },
  (t) => ({ pk: primaryKey({ columns: [t.organizationId, t.key] }) }),
);

// ============================================================
// Phase 1 — Master data (customers, fleet, partners, rates)
//
// Conventions: every row carries organization_id; uuid PKs; timestamptz
// created_at. Cross-entity "current/default" pointers (currentDriverId,
// defaultTruckId, attachedTruckId) are soft uuid links with no FK, to
// avoid circular constraints and match how dispatch reassigns them freely.
// ============================================================

// ---------- Subcontractors (third-party truck owners) ----------
export const subcontractors = pgTable(
  "subcontractors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    contactPerson: text("contact_person").notNull(),
    phone: varchar("phone", { length: 32 }).notNull(),
    email: text("email"),
    kraPin: varchar("kra_pin", { length: 32 }),
    mpesaNumber: varchar("mpesa_number", { length: 32 }),
    bankName: text("bank_name"),
    bankAccount: varchar("bank_account", { length: 64 }),
    /** Commission we keep per trip (decimal, e.g. 0.10 = 10%); they earn the rest. */
    commissionRate: numeric("commission_rate", { precision: 5, scale: 4 }).notNull().default("0.10"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ byOrg: index("subcontractors_org_idx").on(t.organizationId) }),
);

/**
 * Subcontractor current-account payments (memo ledger). Credits to the account
 * are derived from completed trips (their share of freight); these rows are the
 * debits — cash/mpesa/bank withdrawals, or "supplier_direct" where a fuel
 * supplier paid them on our behalf (which also raises an AP bill to that
 * supplier, linked via billId).
 */
export const subcontractorPayments = pgTable(
  "subcontractor_payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    number: varchar("number", { length: 24 }).notNull(),
    subcontractorId: uuid("subcontractor_id")
      .notNull()
      .references(() => subcontractors.id, { onDelete: "restrict" }),
    date: date("date").notNull(),
    amountKes: numeric("amount_kes", { precision: 14, scale: 2 }).notNull(),
    method: varchar("method", { length: 16 }).notNull(), // cash | mpesa | bank | supplier_direct
    supplierId: uuid("supplier_id").references(() => suppliers.id, { onDelete: "set null" }),
    billId: uuid("bill_id").references(() => supplierBills.id, { onDelete: "set null" }),
    reference: text("reference"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byOrg: index("subcontractor_payments_org_idx").on(t.organizationId),
    bySub: index("subcontractor_payments_sub_idx").on(t.subcontractorId, t.date),
  }),
);

// ---------- Suppliers (AP / workshop vendors) ----------
export const suppliers = pgTable(
  "suppliers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    contactPerson: text("contact_person"),
    phone: varchar("phone", { length: 32 }).notNull(),
    email: text("email"),
    kraPin: varchar("kra_pin", { length: 32 }),
    paymentTerms: varchar("payment_terms", { length: 24 }).notNull().default("net_30"),
    defaultPaymentMethod: varchar("default_payment_method", { length: 12 }).notNull().default("bank"),
    mpesaNumber: varchar("mpesa_number", { length: 32 }),
    bankName: text("bank_name"),
    bankAccount: varchar("bank_account", { length: 64 }),
    defaultExpenseCategory: text("default_expense_category"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ byOrg: index("suppliers_org_idx").on(t.organizationId) }),
);

// ---------- Customers (fuel offtakers) ----------
export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    contactPerson: text("contact_person").notNull(),
    phone: varchar("phone", { length: 32 }).notNull(),
    email: text("email"),
    kraPin: varchar("kra_pin", { length: 32 }),
    customerType: varchar("customer_type", { length: 24 }),
    epraLicenceNumber: varchar("epra_licence_number", { length: 64 }),
    billingAddress: text("billing_address"),
    billingCurrency: varchar("billing_currency", { length: 3 }).notNull().default("KES"),
    paymentTermsDays: integer("payment_terms_days").notNull().default(30),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ byOrg: index("customers_org_idx").on(t.organizationId) }),
);

// ---------- Trucks (tankers) ----------
export const trucks = pgTable(
  "trucks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    registration: varchar("registration", { length: 16 }).notNull(),
    ownerType: varchar("owner_type", { length: 16 }).notNull().default("company_owned"),
    subcontractorId: uuid("subcontractor_id").references(() => subcontractors.id, {
      onDelete: "set null",
    }),
    make: text("make").notNull(),
    model: text("model").notNull(),
    year: integer("year").notNull(),
    fuelType: varchar("fuel_type", { length: 8 }).notNull().default("diesel"),
    capacityTonnes: numeric("capacity_tonnes", { precision: 8, scale: 2 }).notNull().default("0"),
    axles: integer("axles").notNull().default(2),
    status: varchar("status", { length: 16 }).notNull().default("active"),
    currentDriverId: uuid("current_driver_id"), // soft link
    notes: text("notes"),
    // Tanker spec
    tankCapacityLitres: integer("tank_capacity_litres"),
    compartmentCount: integer("compartment_count"),
    compartmentCapacitiesLitres: integer("compartment_capacities_litres").array(),
    lastCalibrationDate: date("last_calibration_date"),
    calibrationDueDate: date("calibration_due_date"),
    permittedProducts: varchar("permitted_products", { length: 8 }).array(),
    // Compliance expiries
    insuranceExpiry: date("insurance_expiry"),
    ntsaInspectionExpiry: date("ntsa_inspection_expiry"),
    comesaPermitExpiry: date("comesa_permit_expiry"),
    transitPermitExpiry: date("transit_permit_expiry"),
    epraTransitLicenceExpiry: date("epra_transit_licence_expiry"),
    petroleumLiabilityExpiry: date("petroleum_liability_expiry"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byOrg: index("trucks_org_idx").on(t.organizationId),
    byReg: index("trucks_registration_idx").on(t.organizationId, t.registration),
  }),
);

// ---------- Trailers ----------
export const trailers = pgTable(
  "trailers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    registration: varchar("registration", { length: 16 }).notNull(),
    ownerType: varchar("owner_type", { length: 16 }).notNull().default("company_owned"),
    subcontractorId: uuid("subcontractor_id").references(() => subcontractors.id, {
      onDelete: "set null",
    }),
    type: varchar("type", { length: 24 }).notNull().default("tanker"),
    capacityTonnes: numeric("capacity_tonnes", { precision: 8, scale: 2 }).notNull().default("0"),
    axles: integer("axles").notNull().default(3),
    year: integer("year").notNull(),
    status: varchar("status", { length: 16 }).notNull().default("active"),
    attachedTruckId: uuid("attached_truck_id"), // soft link
    insuranceExpiry: date("insurance_expiry"),
    ntsaInspectionExpiry: date("ntsa_inspection_expiry"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ byOrg: index("trailers_org_idx").on(t.organizationId) }),
);

// ---------- Drivers ----------
export const drivers = pgTable(
  "drivers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    fullName: text("full_name").notNull(),
    phone: varchar("phone", { length: 32 }).notNull(),
    nationalId: varchar("national_id", { length: 32 }).notNull(),
    status: varchar("status", { length: 16 }).notNull().default("active"),
    licenceClass: varchar("licence_class", { length: 8 }).notNull(),
    licenceNumber: varchar("licence_number", { length: 32 }).notNull(),
    licenceExpiry: date("licence_expiry"),
    medicalExpiry: date("medical_expiry"),
    passportNumber: varchar("passport_number", { length: 32 }),
    passportExpiry: date("passport_expiry"),
    comesaDriverPermitExpiry: date("comesa_driver_permit_expiry"),
    defaultTruckId: uuid("default_truck_id"), // soft link
    hireDate: date("hire_date"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ byOrg: index("drivers_org_idx").on(t.organizationId) }),
);

// ---------- Rates (destination-driven rate card) ----------
export const rates = pgTable(
  "rates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    origin: text("origin").notNull(),
    destination: text("destination").notNull(),
    // Optional customer-specific override; null = default rate for the route.
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "cascade" }),
    cargoClass: varchar("cargo_class", { length: 16 }),
    basis: varchar("basis", { length: 16 }).notNull().default("per_m3"),
    // Rate cards store a unit price (amount + currency). The posted-amount FX
    // convention applies to transactions (invoices/bills), not to the card.
    amount: numeric("amount", { precision: 18, scale: 6 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("USD"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byOrg: index("rates_org_idx").on(t.organizationId),
    byRoute: index("rates_route_idx").on(t.organizationId, t.origin, t.destination),
  }),
);

// ============================================================
// Phase 2 — Full domain schema (dispatch, finance, HR, workshop, bank, reports)
//
// Conventions (per the Phase 1 set): every table carries organization_id;
// uuid PKs (gen_random_uuid); timestamptz created_at; money stored as
// numeric(18,4) + currency + fx_rate (KES equivalent computed at posting).
// Line-item children (invoice/bill/journal lines, job-card services/spares)
// are full tables so reports can query them; tightly bound arrays
// (contract allowances, payroll allowances) are jsonb on the parent.
// ============================================================

// ---------- Bookings (customer orders) ----------
export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    number: varchar("number", { length: 24 }).notNull(),
    customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "restrict" }),
    origin: text("origin").notNull(),
    // Destination is unknown at booking — only customer, product and volume
    // are agreed up-front. The truck is loaded at origin and the final
    // destination is set en-route (at the loading depot or transit border)
    // on the trip. Kept here as a non-binding "intended" destination if the
    // dispatcher captures one.
    destination: text("destination"),
    product: varchar("product", { length: 8 }), // PMS | AGO | null
    cargoType: text("cargo_type").notNull(),
    cargoQuantity: numeric("cargo_quantity", { precision: 14, scale: 2 }).notNull(),
    cargoUnit: varchar("cargo_unit", { length: 12 }).notNull().default("litres"),
    requestedDate: date("requested_date").notNull(),
    // Rate is NOT known at booking — it depends on the destination, which is
    // only set on the trip (at the depot / transit border). The rate is looked
    // up from the rate card (origin→destination) and applied to the trip when
    // the destination is confirmed. Kept nullable here for any pre-agreed deal.
    agreedAmount: numeric("agreed_amount", { precision: 18, scale: 4 }),
    agreedBasis: varchar("agreed_basis", { length: 16 }),
    agreedCurrency: varchar("agreed_currency", { length: 3 }),
    status: varchar("status", { length: 16 }).notNull().default("draft"),
    tripId: uuid("trip_id"), // soft link — set when planned
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byOrg: index("bookings_org_idx").on(t.organizationId),
    byNumber: index("bookings_number_idx").on(t.organizationId, t.number),
    byCustomer: index("bookings_customer_idx").on(t.customerId),
  }),
);

// ---------- Trips (the actual movement) ----------
export const trips = pgTable(
  "trips",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    number: varchar("number", { length: 24 }).notNull(),
    bookingId: uuid("booking_id").notNull().references(() => bookings.id, { onDelete: "restrict" }),
    truckId: uuid("truck_id").notNull().references(() => trucks.id, { onDelete: "restrict" }),
    trailerId: uuid("trailer_id").references(() => trailers.id, { onDelete: "set null" }),
    driverId: uuid("driver_id").notNull().references(() => drivers.id, { onDelete: "restrict" }),
    status: varchar("status", { length: 16 }).notNull().default("planned"),
    origin: text("origin").notNull(),
    // Set when the dispatcher confirms the delivery point — typically at the
    // depot loading bay or the transit border (Malaba / Busia). Until then
    // the trip is "destination TBC". Track who confirmed it and when so the
    // Road User Charge packet is anchored to a real decision.
    destination: text("destination"),
    destinationConfirmedAt: timestamp("destination_confirmed_at", { withTimezone: true }),
    destinationConfirmedBy: text("destination_confirmed_by"),
    product: varchar("product", { length: 8 }),
    cargoType: text("cargo_type").notNull(),
    cargoQuantity: numeric("cargo_quantity", { precision: 14, scale: 2 }).notNull(),
    cargoUnit: varchar("cargo_unit", { length: 12 }).notNull().default("litres"),
    // Loading observations
    loadedLitres: numeric("loaded_litres", { precision: 14, scale: 2 }),
    loadingTempC: numeric("loading_temp_c", { precision: 5, scale: 2 }),
    density15C: numeric("density_15c", { precision: 6, scale: 4 }),
    loadedLitres20C: numeric("loaded_litres_20c", { precision: 14, scale: 2 }),
    loadingSealNumbers: text("loading_seal_numbers"),
    // Discharge observations
    dischargedLitres: numeric("discharged_litres", { precision: 14, scale: 2 }),
    dischargeTempC: numeric("discharge_temp_c", { precision: 5, scale: 2 }),
    dischargedLitres20C: numeric("discharged_litres_20c", { precision: 14, scale: 2 }),
    dischargeSealNumbers: text("discharge_seal_numbers"),
    ullagePct: numeric("ullage_pct", { precision: 6, scale: 3 }),
    transitBondNumber: varchar("transit_bond_number", { length: 64 }),
    // Revenue snapshot
    revenueAmount: numeric("revenue_amount", { precision: 18, scale: 4 }).notNull().default("0"),
    revenueCurrency: varchar("revenue_currency", { length: 3 }).notNull(),
    driverAdvanceKes: numeric("driver_advance_kes", { precision: 18, scale: 4 }),
    driverAdvanceUsedKes: numeric("driver_advance_used_kes", { precision: 18, scale: 4 }),
    plannedDepartureDate: date("planned_departure_date"),
    plannedDeliveryDate: date("planned_delivery_date"),
    actualDepartureAt: timestamp("actual_departure_at", { withTimezone: true }),
    actualDeliveryAt: timestamp("actual_delivery_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    actualKm: numeric("actual_km", { precision: 10, scale: 2 }),
    actualFuelLitres: numeric("actual_fuel_litres", { precision: 14, scale: 2 }),
    readyToInvoice: boolean("ready_to_invoice").notNull().default(false),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byOrg: index("trips_org_idx").on(t.organizationId),
    byNumber: index("trips_number_idx").on(t.organizationId, t.number),
    byStatus: index("trips_status_idx").on(t.organizationId, t.status),
    byTruck: index("trips_truck_idx").on(t.truckId),
    byDriver: index("trips_driver_idx").on(t.driverId),
  }),
);

// ---------- Trip status events (audit-style timeline) ----------
export const tripStatusEvents = pgTable(
  "trip_status_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    tripId: uuid("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
    fromStatus: varchar("from_status", { length: 16 }),
    toStatus: varchar("to_status", { length: 16 }).notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    actorName: text("actor_name").notNull(),
    location: text("location"),
    note: text("note"),
  },
  (t) => ({ byTrip: index("trip_events_trip_idx").on(t.tripId, t.occurredAt) }),
);

// ---------- Trip documents ----------
export const tripDocuments = pgTable(
  "trip_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    tripId: uuid("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
    kind: varchar("kind", { length: 32 }).notNull(),
    name: text("name").notNull(),
    fileName: text("file_name").notNull(),
    fileSize: integer("file_size").notNull(),
    mimeType: varchar("mime_type", { length: 64 }).notNull(),
    status: varchar("status", { length: 12 }).notNull().default("pending"),
    storageKey: text("storage_key"),
    uploadedBy: text("uploaded_by").notNull(),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
    reviewedBy: text("reviewed_by"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    rejectionReason: text("rejection_reason"),
    notes: text("notes"),
  },
  (t) => ({ byTrip: index("trip_docs_trip_idx").on(t.tripId) }),
);

// ---------- Border crossings ----------
export const borderCrossings = pgTable(
  "border_crossings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    tripId: uuid("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
    postName: text("post_name").notNull(),
    countryFrom: varchar("country_from", { length: 2 }).notNull(),
    countryTo: varchar("country_to", { length: 2 }).notNull(),
    status: varchar("status", { length: 16 }).notNull().default("queued"),
    arrivedAt: timestamp("arrived_at", { withTimezone: true }),
    clearedAt: timestamp("cleared_at", { withTimezone: true }),
    axleLoadKg: integer("axle_load_kg"),
    transitPermitNumber: varchar("transit_permit_number", { length: 64 }),
    chargesKes: numeric("charges_kes", { precision: 14, scale: 2 }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ byTrip: index("border_crossings_trip_idx").on(t.tripId) }),
);

// ---------- Expenses ----------
export const expenses = pgTable(
  "expenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    number: varchar("number", { length: 24 }).notNull(),
    amountKes: numeric("amount_kes", { precision: 18, scale: 4 }).notNull(),
    originalAmount: numeric("original_amount", { precision: 18, scale: 4 }),
    originalCurrency: varchar("original_currency", { length: 3 }),
    category: varchar("category", { length: 32 }).notNull(),
    description: text("description").notNull(),
    location: text("location"),
    countryCode: varchar("country_code", { length: 2 }),
    incurredAt: timestamp("incurred_at", { withTimezone: true }).notNull(),
    paidBy: varchar("paid_by", { length: 16 }).notNull(),
    tripId: uuid("trip_id").references(() => trips.id, { onDelete: "set null" }),
    truckId: uuid("truck_id").references(() => trucks.id, { onDelete: "set null" }),
    driverId: uuid("driver_id").references(() => drivers.id, { onDelete: "set null" }),
    supplierId: uuid("supplier_id").references(() => suppliers.id, { onDelete: "set null" }),
    receiptDocumentId: uuid("receipt_document_id"),
    status: varchar("status", { length: 16 }).notNull().default("pending"),
    submittedBy: text("submitted_by").notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
    approvedBy: text("approved_by"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    rejectionReason: text("rejection_reason"),
    reimbursedAt: timestamp("reimbursed_at", { withTimezone: true }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byOrg: index("expenses_org_idx").on(t.organizationId),
    byStatus: index("expenses_status_idx").on(t.organizationId, t.status),
    byTrip: index("expenses_trip_idx").on(t.tripId),
  }),
);

// ---------- Fuel logs (fill-ups) ----------
export const fuelLogs = pgTable(
  "fuel_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    number: varchar("number", { length: 24 }).notNull(),
    tripId: uuid("trip_id").references(() => trips.id, { onDelete: "set null" }),
    truckId: uuid("truck_id").notNull().references(() => trucks.id, { onDelete: "restrict" }),
    driverId: uuid("driver_id").references(() => drivers.id, { onDelete: "set null" }),
    datetime: timestamp("datetime", { withTimezone: true }).notNull(),
    station: text("station").notNull(),
    countryCode: varchar("country_code", { length: 2 }).notNull(),
    litres: numeric("litres", { precision: 12, scale: 2 }).notNull(),
    costKes: numeric("cost_kes", { precision: 14, scale: 2 }).notNull(),
    pricePerLitreKes: numeric("price_per_litre_kes", { precision: 10, scale: 4 }).notNull(),
    odometerKm: integer("odometer_km").notNull(),
    paidBy: varchar("paid_by", { length: 16 }).notNull(),
    expenseId: uuid("expense_id").references(() => expenses.id, { onDelete: "set null" }),
    submittedBy: text("submitted_by").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byOrg: index("fuel_logs_org_idx").on(t.organizationId),
    byTruck: index("fuel_logs_truck_idx").on(t.truckId, t.datetime),
  }),
);

// ---------- Workshop: job cards ----------
export const jobCards = pgTable(
  "job_cards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    number: varchar("number", { length: 24 }).notNull(),
    truckId: uuid("truck_id").notNull().references(() => trucks.id, { onDelete: "restrict" }),
    // Optional link — set only for an en-route breakdown so the repair can flow
    // into that trip's profitability. Blank = truck/period maintenance.
    tripId: uuid("trip_id").references(() => trips.id, { onDelete: "set null" }),
    status: varchar("status", { length: 16 }).notNull().default("open"),
    mechanicName: text("mechanic_name").notNull(),
    openingOdometer: integer("opening_odometer"),
    closingOdometer: integer("closing_odometer"),
    mechanicAnalysis: text("mechanic_analysis").notNull(),
    notes: text("notes"),
    openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    laborTotalKes: numeric("labor_total_kes", { precision: 14, scale: 2 }).notNull().default("0"),
    sparesTotalKes: numeric("spares_total_kes", { precision: 14, scale: 2 }).notNull().default("0"),
    totalKes: numeric("total_kes", { precision: 14, scale: 2 }).notNull().default("0"),
  },
  (t) => ({
    byOrg: index("job_cards_org_idx").on(t.organizationId),
    byTruck: index("job_cards_truck_idx").on(t.truckId),
  }),
);

export const jobCardServices = pgTable(
  "job_card_services",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobCardId: uuid("job_card_id").notNull().references(() => jobCards.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    hours: numeric("hours", { precision: 6, scale: 2 }).notNull(),
    costKes: numeric("cost_kes", { precision: 14, scale: 2 }).notNull(),
    performedAt: timestamp("performed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ byCard: index("jc_services_card_idx").on(t.jobCardId) }),
);

export const jobCardSpares = pgTable(
  "job_card_spares",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobCardId: uuid("job_card_id").notNull().references(() => jobCards.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    quantity: numeric("quantity", { precision: 12, scale: 2 }).notNull(),
    unitCostKes: numeric("unit_cost_kes", { precision: 14, scale: 4 }).notNull(),
    totalCostKes: numeric("total_cost_kes", { precision: 14, scale: 2 }).notNull(),
    supplierId: uuid("supplier_id").references(() => suppliers.id, { onDelete: "set null" }),
    // CoA Direct-Cost account this spare posts to (defaults are derived from the
    // description at bill time: tyres → 504100, tyre repair → 504200, etc.).
    accountCode: varchar("account_code", { length: 12 }),
    // Set once the spare has been rolled onto a supplier bill (AP).
    billId: uuid("bill_id").references(() => supplierBills.id, { onDelete: "set null" }),
    posted: boolean("posted").notNull().default(false),
    postedAt: timestamp("posted_at", { withTimezone: true }),
    consumedAt: timestamp("consumed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ byCard: index("jc_spares_card_idx").on(t.jobCardId) }),
);

// ============================================================
// HR
// ============================================================
export const departments = pgTable(
  "departments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    code: varchar("code", { length: 16 }).notNull(),
    headEmployeeId: uuid("head_employee_id"), // soft link (set after employees exist)
    parentDepartmentId: uuid("parent_department_id"),
    costCentre: varchar("cost_centre", { length: 16 }),
    description: text("description"),
  },
  (t) => ({ byOrg: index("departments_org_idx").on(t.organizationId) }),
);

export const employees = pgTable(
  "employees",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    employeeNumber: varchar("employee_number", { length: 24 }).notNull(),
    fullName: text("full_name").notNull(),
    preferredName: text("preferred_name"),
    gender: varchar("gender", { length: 8 }),
    dob: date("dob"),
    nationalId: varchar("national_id", { length: 32 }).notNull(),
    kraPin: varchar("kra_pin", { length: 32 }),
    nssfNo: varchar("nssf_no", { length: 32 }),
    shaNo: varchar("sha_no", { length: 32 }),
    mpesaPhone: varchar("mpesa_phone", { length: 32 }).notNull(),
    alternatePhone: varchar("alternate_phone", { length: 32 }),
    email: text("email"),
    physicalAddress: text("physical_address"),
    emergencyContactName: text("emergency_contact_name"),
    emergencyContactRelationship: varchar("emergency_contact_relationship", { length: 32 }),
    emergencyContactPhone: varchar("emergency_contact_phone", { length: 32 }),
    bankName: text("bank_name"),
    bankBranch: text("bank_branch"),
    bankAccountNo: varchar("bank_account_no", { length: 64 }),
    bankAccountName: text("bank_account_name"),
    hireDate: date("hire_date").notNull(),
    terminationDate: date("termination_date"),
    status: varchar("status", { length: 16 }).notNull().default("active"),
    departmentId: uuid("department_id").notNull().references(() => departments.id, { onDelete: "restrict" }),
    jobTitle: text("job_title").notNull(),
    lineManagerId: uuid("line_manager_id"), // soft link to another employee
    driverId: uuid("driver_id").references(() => drivers.id, { onDelete: "set null" }),
    photoUrl: text("photo_url"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byOrg: index("employees_org_idx").on(t.organizationId),
    byNumber: index("employees_number_idx").on(t.organizationId, t.employeeNumber),
    byDept: index("employees_dept_idx").on(t.departmentId),
  }),
);

export const contracts = pgTable(
  "contracts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 24 }).notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date"),
    probationEndDate: date("probation_end_date"),
    noticePeriodDays: integer("notice_period_days").notNull().default(30),
    basicSalary: numeric("basic_salary", { precision: 14, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("KES"),
    payFrequency: varchar("pay_frequency", { length: 12 }).notNull().default("monthly"),
    /** Array of { name, amount, taxable } — tightly bound to the contract. */
    allowances: jsonb("allowances").$type<Array<{ name: string; amount: number; taxable: boolean }>>().notNull().default([]),
    documentUrl: text("document_url"),
    status: varchar("status", { length: 12 }).notNull().default("draft"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ byEmployee: index("contracts_employee_idx").on(t.employeeId) }),
);

export const leaveRequests = pgTable(
  "leave_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    number: varchar("number", { length: 24 }).notNull(),
    employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
    leaveType: varchar("leave_type", { length: 16 }).notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    days: numeric("days", { precision: 6, scale: 2 }).notNull(),
    reason: text("reason").notNull(),
    status: varchar("status", { length: 12 }).notNull().default("pending"),
    attachmentUrl: text("attachment_url"),
    approvedById: uuid("approved_by_id"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    rejectedReason: text("rejected_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ byEmployee: index("leave_employee_idx").on(t.employeeId, t.startDate) }),
);

export const attendanceRecords = pgTable(
  "attendance_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    status: varchar("status", { length: 16 }).notNull(),
    clockInTime: varchar("clock_in_time", { length: 8 }),
    clockOutTime: varchar("clock_out_time", { length: 8 }),
    hours: numeric("hours", { precision: 5, scale: 2 }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ byEmployeeDate: index("attendance_employee_date_idx").on(t.employeeId, t.date) }),
);

export const payrollPeriods = pgTable(
  "payroll_periods",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    yearMonth: varchar("year_month", { length: 7 }).notNull(), // 'YYYY-MM'
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    status: varchar("status", { length: 12 }).notNull().default("draft"),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ byOrgPeriod: index("payroll_periods_org_period_idx").on(t.organizationId, t.yearMonth) }),
);

export const payrollInputs = pgTable(
  "payroll_inputs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    periodId: uuid("period_id").notNull().references(() => payrollPeriods.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
    basicSalary: numeric("basic_salary", { precision: 14, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("KES"),
    allowances: jsonb("allowances").$type<Array<{ name: string; amount: number; taxable: boolean }>>().notNull().default([]),
    overtimeHours: numeric("overtime_hours", { precision: 6, scale: 2 }).notNull().default("0"),
    overtimeRate: numeric("overtime_rate", { precision: 10, scale: 2 }).notNull().default("0"),
    bonus: numeric("bonus", { precision: 14, scale: 2 }).notNull().default("0"),
    otherDeductions: numeric("other_deductions", { precision: 14, scale: 2 }).notNull().default("0"),
    loanRecovery: numeric("loan_recovery", { precision: 14, scale: 2 }).notNull().default("0"),
    paye: numeric("paye", { precision: 14, scale: 2 }).notNull().default("0"),
    nssfEmployee: numeric("nssf_employee", { precision: 14, scale: 2 }).notNull().default("0"),
    nssfEmployer: numeric("nssf_employer", { precision: 14, scale: 2 }).notNull().default("0"),
    shaEmployee: numeric("sha_employee", { precision: 14, scale: 2 }).notNull().default("0"),
    nitaEmployer: numeric("nita_employer", { precision: 14, scale: 2 }).notNull().default("0"),
    ahlEmployee: numeric("ahl_employee", { precision: 14, scale: 2 }).notNull().default("0"),
    ahlEmployer: numeric("ahl_employer", { precision: 14, scale: 2 }).notNull().default("0"),
    grossPay: numeric("gross_pay", { precision: 14, scale: 2 }).notNull().default("0"),
    totalDeductions: numeric("total_deductions", { precision: 14, scale: 2 }).notNull().default("0"),
    netPay: numeric("net_pay", { precision: 14, scale: 2 }).notNull().default("0"),
    employerCost: numeric("employer_cost", { precision: 14, scale: 2 }).notNull().default("0"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byPeriodEmployee: index("payroll_inputs_period_employee_idx").on(t.periodId, t.employeeId),
  }),
);

export const loans = pgTable(
  "loans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    number: varchar("number", { length: 24 }).notNull(),
    employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
    principal: numeric("principal", { precision: 14, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("KES"),
    disbursedDate: date("disbursed_date").notNull(),
    monthlyRecovery: numeric("monthly_recovery", { precision: 14, scale: 2 }).notNull(),
    termMonths: integer("term_months").notNull(),
    interestRate: numeric("interest_rate", { precision: 6, scale: 3 }).notNull().default("0"),
    recovered: numeric("recovered", { precision: 14, scale: 2 }).notNull().default("0"),
    balance: numeric("balance", { precision: 14, scale: 2 }).notNull(),
    status: varchar("status", { length: 16 }).notNull().default("active"),
    reason: text("reason"),
    notes: text("notes"),
    /** Set when this loan is an auto-raised driver shortage recovery; used as
     *  a hard idempotency key so two invoices for the same trip can't double-bill
     *  the driver (substring match on `reason` collides: "TRP-001" ⊂ "TRP-0010"). */
    shortageTripId: uuid("shortage_trip_id").references(() => trips.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ byEmployee: index("loans_employee_idx").on(t.employeeId) }),
);

export const appraisalCycles = pgTable(
  "appraisal_cycles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    year: integer("year").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    status: varchar("status", { length: 12 }).notNull().default("draft"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ byOrg: index("appraisal_cycles_org_idx").on(t.organizationId) }),
);

export const appraisalReviews = pgTable(
  "appraisal_reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    cycleId: uuid("cycle_id").notNull().references(() => appraisalCycles.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
    managerId: uuid("manager_id"), // soft link
    /** Goals + competencies stored as jsonb (free-form nested by spec). */
    goals: jsonb("goals").$type<Array<Record<string, unknown>>>().notNull().default([]),
    competencies: jsonb("competencies").$type<Array<Record<string, unknown>>>().notNull().default([]),
    overallRating: integer("overall_rating"),
    employeeComment: text("employee_comment"),
    managerComment: text("manager_comment"),
    hrComment: text("hr_comment"),
    status: varchar("status", { length: 16 }).notNull().default("not_started"),
    recommendation: varchar("recommendation", { length: 16 }),
    proposedIncrementPct: numeric("proposed_increment_pct", { precision: 5, scale: 2 }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    managerReviewedAt: timestamp("manager_reviewed_at", { withTimezone: true }),
    hrFinalisedAt: timestamp("hr_finalised_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ byCycleEmployee: index("appraisal_reviews_cycle_employee_idx").on(t.cycleId, t.employeeId) }),
);

export const jobDescriptions = pgTable(
  "job_descriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    departmentId: uuid("department_id").references(() => departments.id, { onDelete: "set null" }),
    summary: text("summary"),
    responsibilities: jsonb("responsibilities").$type<string[]>().notNull().default([]),
    requirements: jsonb("requirements").$type<string[]>().notNull().default([]),
    grade: varchar("grade", { length: 16 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ byOrg: index("job_descriptions_org_idx").on(t.organizationId) }),
);

export const jdAssignments = pgTable(
  "jd_assignments",
  {
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    jobDescriptionId: uuid("job_description_id")
      .notNull()
      .references(() => jobDescriptions.id, { onDelete: "cascade" }),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.employeeId, t.jobDescriptionId] }) }),
);

export const complianceRecords = pgTable(
  "compliance_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
    kind: varchar("kind", { length: 32 }).notNull(),
    label: text("label"),
    number: varchar("number", { length: 64 }),
    issueDate: date("issue_date"),
    expiryDate: date("expiry_date"),
    issuingAuthority: text("issuing_authority"),
    attachmentUrl: text("attachment_url"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byEmployee: index("compliance_employee_idx").on(t.employeeId),
    byExpiry: index("compliance_expiry_idx").on(t.organizationId, t.expiryDate),
  }),
);

// ============================================================
// Finance — AR (customer invoices + receipts)
// ============================================================
export const customerInvoices = pgTable(
  "customer_invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    number: varchar("number", { length: 24 }).notNull(),
    customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "restrict" }),
    tripId: uuid("trip_id").references(() => trips.id, { onDelete: "set null" }),
    issueDate: date("issue_date").notNull(),
    dueDate: date("due_date").notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    fxRate: numeric("fx_rate", { precision: 18, scale: 8 }).notNull().default("1"),
    subtotal: numeric("subtotal", { precision: 18, scale: 4 }).notNull().default("0"),
    taxRate: numeric("tax_rate", { precision: 6, scale: 3 }).notNull().default("0"),
    taxAmount: numeric("tax_amount", { precision: 18, scale: 4 }).notNull().default("0"),
    total: numeric("total", { precision: 18, scale: 4 }).notNull().default("0"),
    paidAmount: numeric("paid_amount", { precision: 18, scale: 4 }).notNull().default("0"),
    balance: numeric("balance", { precision: 18, scale: 4 }).notNull().default("0"),
    status: varchar("status", { length: 16 }).notNull().default("draft"),
    notes: text("notes"),
    journalEntryId: uuid("journal_entry_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byOrg: index("invoices_org_idx").on(t.organizationId),
    byCustomer: index("invoices_customer_idx").on(t.customerId, t.issueDate),
    byNumber: index("invoices_number_idx").on(t.organizationId, t.number),
  }),
);

export const invoiceLineItems = pgTable(
  "invoice_line_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    invoiceId: uuid("invoice_id").notNull().references(() => customerInvoices.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    quantity: numeric("quantity", { precision: 14, scale: 4 }).notNull(),
    unit: varchar("unit", { length: 16 }),
    unitPrice: numeric("unit_price", { precision: 18, scale: 6 }).notNull(),
    lineTotal: numeric("line_total", { precision: 18, scale: 4 }).notNull(),
    revenueAccountCode: varchar("revenue_account_code", { length: 16 }),
  },
  (t) => ({ byInvoice: index("invoice_lines_invoice_idx").on(t.invoiceId) }),
);

export const customerPayments = pgTable(
  "customer_payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    number: varchar("number", { length: 24 }).notNull(),
    invoiceId: uuid("invoice_id").notNull().references(() => customerInvoices.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "restrict" }),
    date: date("date").notNull(),
    amount: numeric("amount", { precision: 18, scale: 4 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    fxRate: numeric("fx_rate", { precision: 18, scale: 8 }).notNull().default("1"),
    paymentMethod: varchar("payment_method", { length: 12 }).notNull(),
    reference: varchar("reference", { length: 64 }),
    journalEntryId: uuid("journal_entry_id"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ byInvoice: index("customer_payments_invoice_idx").on(t.invoiceId) }),
);

// ============================================================
// Finance — AP (supplier bills + payments)
// ============================================================
export const supplierBills = pgTable(
  "supplier_bills",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    number: varchar("number", { length: 24 }).notNull(),
    supplierId: uuid("supplier_id").notNull().references(() => suppliers.id, { onDelete: "restrict" }),
    supplierRef: varchar("supplier_ref", { length: 64 }),
    issueDate: date("issue_date").notNull(),
    dueDate: date("due_date").notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    fxRate: numeric("fx_rate", { precision: 18, scale: 8 }).notNull().default("1"),
    subtotal: numeric("subtotal", { precision: 18, scale: 4 }).notNull().default("0"),
    taxRate: numeric("tax_rate", { precision: 6, scale: 3 }).notNull().default("0"),
    taxAmount: numeric("tax_amount", { precision: 18, scale: 4 }).notNull().default("0"),
    total: numeric("total", { precision: 18, scale: 4 }).notNull().default("0"),
    paidAmount: numeric("paid_amount", { precision: 18, scale: 4 }).notNull().default("0"),
    balance: numeric("balance", { precision: 18, scale: 4 }).notNull().default("0"),
    status: varchar("status", { length: 16 }).notNull().default("draft"),
    notes: text("notes"),
    journalEntryId: uuid("journal_entry_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byOrg: index("bills_org_idx").on(t.organizationId),
    bySupplier: index("bills_supplier_idx").on(t.supplierId, t.issueDate),
    byNumber: index("bills_number_idx").on(t.organizationId, t.number),
  }),
);

export const billLineItems = pgTable(
  "bill_line_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    billId: uuid("bill_id").notNull().references(() => supplierBills.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    quantity: numeric("quantity", { precision: 14, scale: 4 }).notNull(),
    unit: varchar("unit", { length: 16 }),
    unitPrice: numeric("unit_price", { precision: 18, scale: 6 }).notNull(),
    lineTotal: numeric("line_total", { precision: 18, scale: 4 }).notNull(),
    expenseAccountCode: varchar("expense_account_code", { length: 16 }).notNull(),
  },
  (t) => ({ byBill: index("bill_lines_bill_idx").on(t.billId) }),
);

export const supplierPayments = pgTable(
  "supplier_payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    number: varchar("number", { length: 24 }).notNull(),
    billId: uuid("bill_id").notNull().references(() => supplierBills.id, { onDelete: "cascade" }),
    supplierId: uuid("supplier_id").notNull().references(() => suppliers.id, { onDelete: "restrict" }),
    date: date("date").notNull(),
    amount: numeric("amount", { precision: 18, scale: 4 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    fxRate: numeric("fx_rate", { precision: 18, scale: 8 }).notNull().default("1"),
    paymentMethod: varchar("payment_method", { length: 12 }).notNull(),
    reference: varchar("reference", { length: 64 }),
    journalEntryId: uuid("journal_entry_id"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ byBill: index("supplier_payments_bill_idx").on(t.billId) }),
);

// ============================================================
// Finance — General Ledger
// ============================================================
export const journalEntries = pgTable(
  "journal_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    number: varchar("number", { length: 24 }).notNull(),
    date: date("date").notNull(),
    memo: text("memo").notNull(),
    referenceType: varchar("reference_type", { length: 16 }).notNull().default("manual"),
    referenceId: varchar("reference_id", { length: 64 }),
    status: varchar("status", { length: 12 }).notNull().default("draft"),
    postedBy: text("posted_by").notNull(),
    postedAt: timestamp("posted_at", { withTimezone: true }).notNull().defaultNow(),
    reversalOf: uuid("reversal_of"),
    reversedById: uuid("reversed_by_id"),
    totalDebitKes: numeric("total_debit_kes", { precision: 18, scale: 4 }).notNull().default("0"),
    totalCreditKes: numeric("total_credit_kes", { precision: 18, scale: 4 }).notNull().default("0"),
  },
  (t) => ({
    byOrg: index("journal_entries_org_idx").on(t.organizationId, t.date),
    byNumber: index("journal_entries_number_idx").on(t.organizationId, t.number),
  }),
);

export const journalLines = pgTable(
  "journal_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    journalEntryId: uuid("journal_entry_id").notNull().references(() => journalEntries.id, { onDelete: "cascade" }),
    accountId: uuid("account_id").notNull().references(() => chartOfAccounts.id, { onDelete: "restrict" }),
    accountCode: varchar("account_code", { length: 16 }).notNull(),
    accountName: text("account_name").notNull(),
    originalDebit: numeric("original_debit", { precision: 18, scale: 4 }).notNull().default("0"),
    originalCredit: numeric("original_credit", { precision: 18, scale: 4 }).notNull().default("0"),
    currency: varchar("currency", { length: 3 }).notNull().default("KES"),
    fxRate: numeric("fx_rate", { precision: 18, scale: 8 }).notNull().default("1"),
    debitKes: numeric("debit_kes", { precision: 18, scale: 4 }).notNull().default("0"),
    creditKes: numeric("credit_kes", { precision: 18, scale: 4 }).notNull().default("0"),
    description: text("description"),
  },
  (t) => ({ byEntry: index("journal_lines_entry_idx").on(t.journalEntryId) }),
);

// ============================================================
// Finance — Bank statement transactions (for reconciliation)
// ============================================================
export const bankStatementTransactions = pgTable(
  "bank_statement_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    accountCode: varchar("account_code", { length: 16 }).notNull(),
    date: date("date").notNull(),
    description: text("description").notNull(),
    reference: varchar("reference", { length: 64 }),
    debit: numeric("debit", { precision: 18, scale: 4 }).notNull().default("0"),
    credit: numeric("credit", { precision: 18, scale: 4 }).notNull().default("0"),
    currency: varchar("currency", { length: 3 }).notNull(),
    status: varchar("status", { length: 12 }).notNull().default("unmatched"),
    matchedJournalLineId: uuid("matched_journal_line_id"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byAccountDate: index("bank_tx_account_date_idx").on(t.organizationId, t.accountCode, t.date),
  }),
);

// ============================================================
// Reports — Monthly management pack
// ============================================================
export const managementPacks = pgTable(
  "management_packs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    yearMonth: varchar("year_month", { length: 7 }).notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    status: varchar("status", { length: 16 }).notNull().default("draft"),
    narrative: text("narrative").notNull().default(""),
    highlights: text("highlights").notNull().default(""),
    risks: text("risks").notNull().default(""),
    preparedById: uuid("prepared_by_id"),
    preparedAt: timestamp("prepared_at", { withTimezone: true }),
    reviewedById: uuid("reviewed_by_id"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ byOrgPeriod: index("management_packs_org_period_idx").on(t.organizationId, t.yearMonth) }),
);

// ---------- Asset Register (fixed assets + depreciation) ----------
export const assets = pgTable(
  "assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    number: varchar("number", { length: 24 }).notNull(),
    name: text("name").notNull(),
    /** AssetCategory — maps to the CoA cost/accum-dep/expense triplet. */
    category: varchar("category", { length: 32 }).notNull(),
    description: text("description"),
    serialNumber: varchar("serial_number", { length: 120 }),
    location: text("location"),
    /** Optional link to the supplier the asset was bought from. */
    supplierId: uuid("supplier_id").references(() => suppliers.id, { onDelete: "set null" }),
    acquisitionDate: date("acquisition_date").notNull(),
    cost: numeric("cost", { precision: 16, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("KES"),
    /** straight_line | reducing_balance | none */
    depreciationMethod: varchar("depreciation_method", { length: 20 }).notNull().default("straight_line"),
    usefulLifeMonths: integer("useful_life_months"),
    depreciationRatePct: numeric("depreciation_rate_pct", { precision: 6, scale: 3 }),
    residualValue: numeric("residual_value", { precision: 16, scale: 2 }).notNull().default("0"),
    accumulatedDepreciation: numeric("accumulated_depreciation", { precision: 16, scale: 2 }).notNull().default("0"),
    depreciationStartDate: date("depreciation_start_date").notNull(),
    /** End-of-month date of the last depreciation charge posted. */
    lastDepreciatedOn: date("last_depreciated_on"),
    /** active | fully_depreciated | disposed | written_off */
    status: varchar("status", { length: 20 }).notNull().default("active"),
    disposalDate: date("disposal_date"),
    disposalProceeds: numeric("disposal_proceeds", { precision: 16, scale: 2 }),
    disposalJournalEntryId: uuid("disposal_journal_entry_id"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byOrg: index("assets_org_idx").on(t.organizationId),
    byCategory: index("assets_category_idx").on(t.organizationId, t.category),
  }),
);
