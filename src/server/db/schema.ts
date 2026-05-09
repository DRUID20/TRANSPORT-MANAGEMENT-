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

// ---------- Users (mirrors Supabase auth.users via id) ----------
export const users = pgTable("users", {
  id: uuid("id").primaryKey(), // Supabase auth user id
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  phone: varchar("phone", { length: 32 }),
  fullName: text("full_name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  byOrg: index("users_org_idx").on(t.organizationId),
  byEmail: index("users_email_idx").on(t.email),
}));

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
