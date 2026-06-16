/**
 * Bookings repository — dual-mode (Postgres / mock store). Org-scoped.
 * Numbers (BK-YYYY-NNNN) are issued atomically from the counters table.
 */
import { and, desc, eq } from "drizzle-orm";
import { IS_DEMO_MODE } from "@/server/auth/session-secret";
import { requireOrgId } from "@/server/auth/current-org";
import { getDb } from "@/server/db/client";
import { bookings as table } from "@/server/db/schema";
import { nextDocumentNumber } from "@/server/repos/counters";
import {
  createBooking as storeCreate,
  getBooking as storeGet,
  listBookings as storeList,
  bookingsForCustomer as storeForCustomer,
  updateBookingStatus as storeUpdateStatus,
  deleteBooking as storeDelete,
} from "@/server/store/mock-store";
import type {
  Booking,
  BookingStatus,
  CargoUnit,
  Currency,
  FuelProduct,
  RateBasis,
} from "@/lib/types/trips";

type Row = typeof table.$inferSelect;

function toBooking(r: Row): Booking {
  return {
    id: r.id,
    number: r.number,
    customerId: r.customerId,
    origin: r.origin,
    destination: r.destination ?? undefined,
    product: (r.product as FuelProduct | null) ?? undefined,
    cargoType: r.cargoType,
    cargoQuantity: Number(r.cargoQuantity),
    cargoUnit: r.cargoUnit as CargoUnit,
    requestedDate: r.requestedDate,
    agreedAmount: r.agreedAmount === null ? undefined : Number(r.agreedAmount),
    agreedBasis: (r.agreedBasis as RateBasis | null) ?? undefined,
    agreedCurrency: (r.agreedCurrency as Currency | null) ?? undefined,
    status: r.status as BookingStatus,
    tripId: r.tripId ?? undefined,
    notes: r.notes ?? undefined,
    createdAt: r.createdAt.toISOString(),
  };
}

type NewBooking = Omit<Booking, "id" | "number" | "createdAt" | "status" | "tripId">;

export async function listBookings(filterStatus?: BookingStatus): Promise<Booking[]> {
  if (IS_DEMO_MODE) return storeList(filterStatus);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .select()
    .from(table)
    .where(eq(table.organizationId, orgId))
    .orderBy(desc(table.createdAt));
  const all = rows.map(toBooking);
  return filterStatus ? all.filter((b) => b.status === filterStatus) : all;
}

export async function getBooking(id: string): Promise<Booking | undefined> {
  if (IS_DEMO_MODE) return storeGet(id);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .select()
    .from(table)
    .where(and(eq(table.id, id), eq(table.organizationId, orgId)))
    .limit(1);
  return rows[0] ? toBooking(rows[0]) : undefined;
}

export async function bookingsForCustomer(customerId: string): Promise<Booking[]> {
  if (IS_DEMO_MODE) return storeForCustomer(customerId);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .select()
    .from(table)
    .where(and(eq(table.customerId, customerId), eq(table.organizationId, orgId)))
    .orderBy(desc(table.createdAt));
  return rows.map(toBooking);
}

export async function createBooking(input: NewBooking): Promise<Booking> {
  if (IS_DEMO_MODE) return storeCreate(input);
  const db = getDb();
  const orgId = await requireOrgId();
  const number = await nextDocumentNumber(orgId, "BK", "booking");
  const rows = await db
    .insert(table)
    .values({
      organizationId: orgId,
      number,
      customerId: input.customerId,
      origin: input.origin,
      destination: input.destination ?? null,
      product: input.product ?? null,
      cargoType: input.cargoType,
      cargoQuantity: String(input.cargoQuantity),
      cargoUnit: input.cargoUnit,
      requestedDate: input.requestedDate,
      agreedAmount: input.agreedAmount != null ? String(input.agreedAmount) : null,
      agreedBasis: input.agreedBasis ?? null,
      agreedCurrency: input.agreedCurrency ?? null,
      status: "draft",
    })
    .returning();
  return toBooking(rows[0]!);
}

export async function updateBookingStatus(
  id: string,
  status: BookingStatus,
  tripId?: string,
): Promise<Booking | undefined> {
  if (IS_DEMO_MODE) return storeUpdateStatus(id, status, tripId);
  const db = getDb();
  const orgId = await requireOrgId();
  const set: Partial<typeof table.$inferInsert> = { status };
  if (tripId !== undefined) set.tripId = tripId;
  const rows = await db
    .update(table)
    .set(set)
    .where(and(eq(table.id, id), eq(table.organizationId, orgId)))
    .returning();
  return rows[0] ? toBooking(rows[0]) : undefined;
}

export async function deleteBooking(id: string): Promise<boolean> {
  if (IS_DEMO_MODE) return storeDelete(id);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .delete(table)
    .where(and(eq(table.id, id), eq(table.organizationId, orgId)))
    .returning({ id: table.id });
  return rows.length > 0;
}
