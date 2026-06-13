/**
 * Rates repository — dual-mode (Postgres / mock store). Org-scoped.
 *
 * `amount` is numeric (returned as a string by the driver, mapped to number).
 * lookupRate replicates the store's precedence: customer override → cargo
 * class default → plain default.
 */
import { eq } from "drizzle-orm";
import { IS_DEMO_MODE } from "@/server/auth/session-secret";
import { requireOrgId } from "@/server/auth/current-org";
import { getDb } from "@/server/db/client";
import { rates as table } from "@/server/db/schema";
import {
  createRate as storeCreate,
  listRates as storeList,
  lookupRate as storeLookup,
} from "@/server/store/mock-store";
import type { Currency, Rate, RateBasis } from "@/lib/types/trips";

type Row = typeof table.$inferSelect;

function toRate(r: Row): Rate {
  return {
    id: r.id,
    origin: r.origin,
    destination: r.destination,
    customerId: r.customerId ?? undefined,
    cargoClass: r.cargoClass ?? undefined,
    basis: r.basis as RateBasis,
    amount: Number(r.amount),
    currency: r.currency as Currency,
    notes: r.notes ?? undefined,
    createdAt: r.createdAt.toISOString(),
  };
}

export async function listRates(): Promise<Rate[]> {
  if (IS_DEMO_MODE) return storeList();
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db.select().from(table).where(eq(table.organizationId, orgId));
  return rows.map(toRate);
}

export async function createRate(
  input: Omit<Rate, "id" | "createdAt">,
): Promise<Rate> {
  if (IS_DEMO_MODE) return storeCreate(input);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .insert(table)
    .values({
      organizationId: orgId,
      origin: input.origin,
      destination: input.destination,
      customerId: input.customerId ?? null,
      cargoClass: input.cargoClass ?? null,
      basis: input.basis,
      amount: String(input.amount),
      currency: input.currency,
      notes: input.notes ?? null,
    })
    .returning();
  return toRate(rows[0]!);
}

export async function lookupRate(args: {
  origin: string;
  destination: string;
  customerId?: string;
  cargoClass?: string;
}): Promise<Rate | undefined> {
  if (IS_DEMO_MODE) return storeLookup(args);
  const all = await listRates();
  const matches = all.filter(
    (r) =>
      r.origin.toLowerCase() === args.origin.toLowerCase() &&
      r.destination.toLowerCase() === args.destination.toLowerCase(),
  );
  // 1. Customer-specific override
  const cust = matches.find((r) => r.customerId === args.customerId);
  if (cust) return cust;
  // 2. Cargo-class default
  if (args.cargoClass) {
    const cls = matches.find((r) => !r.customerId && r.cargoClass === args.cargoClass);
    if (cls) return cls;
  }
  // 3. Plain default
  return matches.find((r) => !r.customerId && !r.cargoClass);
}
