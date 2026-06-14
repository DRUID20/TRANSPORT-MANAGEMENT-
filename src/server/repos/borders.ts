/** Border crossings repo — dual-mode (Postgres / mock store). Org-scoped. */
import { and, eq, inArray } from "drizzle-orm";
import { IS_DEMO_MODE } from "@/server/auth/session-secret";
import { requireOrgId } from "@/server/auth/current-org";
import { getDb } from "@/server/db/client";
import { borderCrossings as table, trips as tripsTable } from "@/server/db/schema";
import {
  clearBorderCrossing as storeClear,
  createBorderCrossing as storeCreate,
  deleteBorderCrossing as storeDelete,
  getBorderCrossing as storeGet,
  listAllActiveBorderCrossings as storeListActive,
  listBorderCrossings as storeListForTrip,
} from "@/server/store/mock-store";
import type { BorderCrossing, BorderStatus } from "@/lib/types/borders";

type Row = typeof table.$inferSelect;

function toCrossing(r: Row): BorderCrossing {
  return {
    id: r.id,
    tripId: r.tripId,
    postName: r.postName,
    countryFrom: r.countryFrom,
    countryTo: r.countryTo,
    status: r.status as BorderStatus,
    arrivedAt: r.arrivedAt?.toISOString(),
    clearedAt: r.clearedAt?.toISOString(),
    axleLoadKg: r.axleLoadKg ?? undefined,
    transitPermitNumber: r.transitPermitNumber ?? undefined,
    chargesKes: r.chargesKes === null ? undefined : Number(r.chargesKes),
    notes: r.notes ?? undefined,
    createdAt: r.createdAt.toISOString(),
  };
}

export async function listBorderCrossings(tripId: string): Promise<BorderCrossing[]> {
  if (IS_DEMO_MODE) return storeListForTrip(tripId);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .select()
    .from(table)
    .where(and(eq(table.tripId, tripId), eq(table.organizationId, orgId)))
    .orderBy(table.createdAt);
  return rows.map(toCrossing);
}

/**
 * Batched fetch for cost aggregators (reports / tracker / statements / truck
 * statement). Replaces the per-trip Promise.all(listBorderCrossings(t.id))
 * pattern — one round-trip instead of N. Returns a Map<tripId, total KES>.
 */
export async function borderChargesByTrip(tripIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (tripIds.length === 0) return out;
  if (IS_DEMO_MODE) {
    for (const id of tripIds) {
      const xs = await storeListForTrip(id);
      out.set(id, xs.reduce((s, b) => s + (b.chargesKes ?? 0), 0));
    }
    return out;
  }
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .select({ tripId: table.tripId, chargesKes: table.chargesKes })
    .from(table)
    .where(and(eq(table.organizationId, orgId), inArray(table.tripId, tripIds)));
  for (const r of rows) {
    const charges = r.chargesKes === null ? 0 : Number(r.chargesKes);
    out.set(r.tripId, (out.get(r.tripId) ?? 0) + charges);
  }
  return out;
}

export async function listAllActiveBorderCrossings(): Promise<BorderCrossing[]> {
  if (IS_DEMO_MODE) return storeListActive();
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .select()
    .from(table)
    .where(and(eq(table.organizationId, orgId), inArray(table.status, ["approaching", "queued"])));
  return rows.map(toCrossing);
}

export async function getBorderCrossing(id: string): Promise<BorderCrossing | undefined> {
  if (IS_DEMO_MODE) return storeGet(id);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .select()
    .from(table)
    .where(and(eq(table.id, id), eq(table.organizationId, orgId)))
    .limit(1);
  return rows[0] ? toCrossing(rows[0]) : undefined;
}

export async function createBorderCrossing(input: {
  tripId: string;
  postName: string;
  countryFrom: string;
  countryTo: string;
  status?: BorderStatus;
  arrivedAt?: string;
  axleLoadKg?: number;
  transitPermitNumber?: string;
  chargesKes?: number;
  notes?: string;
}): Promise<BorderCrossing | undefined> {
  if (IS_DEMO_MODE) return storeCreate(input);
  const db = getDb();
  const orgId = await requireOrgId();
  // ensure trip exists in this org
  const trip = (
    await db
      .select({ id: tripsTable.id })
      .from(tripsTable)
      .where(and(eq(tripsTable.id, input.tripId), eq(tripsTable.organizationId, orgId)))
      .limit(1)
  )[0];
  if (!trip) return undefined;
  const rows = await db
    .insert(table)
    .values({
      organizationId: orgId,
      tripId: input.tripId,
      postName: input.postName,
      countryFrom: input.countryFrom.toUpperCase(),
      countryTo: input.countryTo.toUpperCase(),
      status: input.status ?? "queued",
      arrivedAt: input.arrivedAt ? new Date(input.arrivedAt) : new Date(),
      axleLoadKg: input.axleLoadKg ?? null,
      transitPermitNumber: input.transitPermitNumber ?? null,
      chargesKes: input.chargesKes !== undefined ? String(input.chargesKes) : null,
      notes: input.notes ?? null,
    })
    .returning();
  return toCrossing(rows[0]!);
}

export async function clearBorderCrossing(input: {
  borderId: string;
  axleLoadKg?: number;
  transitPermitNumber?: string;
  chargesKes?: number;
  notes?: string;
}): Promise<BorderCrossing | undefined> {
  if (IS_DEMO_MODE) return storeClear(input);
  const db = getDb();
  const orgId = await requireOrgId();
  const set: Partial<typeof table.$inferInsert> = {
    status: "cleared",
    clearedAt: new Date(),
  };
  if (input.axleLoadKg !== undefined) set.axleLoadKg = input.axleLoadKg;
  if (input.transitPermitNumber !== undefined) set.transitPermitNumber = input.transitPermitNumber;
  if (input.chargesKes !== undefined) set.chargesKes = String(input.chargesKes);
  if (input.notes !== undefined) set.notes = input.notes;
  const rows = await db
    .update(table)
    .set(set)
    .where(and(eq(table.id, input.borderId), eq(table.organizationId, orgId)))
    .returning();
  return rows[0] ? toCrossing(rows[0]) : undefined;
}

export async function deleteBorderCrossing(id: string): Promise<boolean> {
  if (IS_DEMO_MODE) return storeDelete(id);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .delete(table)
    .where(and(eq(table.id, id), eq(table.organizationId, orgId)))
    .returning({ id: table.id });
  return rows.length > 0;
}
