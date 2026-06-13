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
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ byOrg: index("subcontractors_org_idx").on(t.organizationId) }),
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
