/**
 * Trips repository — dual-mode (Postgres / mock store). Org-scoped.
 *
 * Owns the dispatch state machine in the DB: planning a trip from a confirmed
 * booking, validated status transitions with a timeline event per change, and
 * reconcile-and-close. Plan/transition/reconcile run in a transaction and
 * apply the same truck/driver busy↔free side-effects as the in-memory store.
 */
import { and, desc, eq, sql } from "drizzle-orm";
import { IS_DEMO_MODE } from "@/server/auth/session-secret";
import { requireOrgId } from "@/server/auth/current-org";
import { getDb } from "@/server/db/client";
import {
  bookings as bookingsTable,
  borderCrossings as borderTable,
  drivers as driversTable,
  tripStatusEvents as eventsTable,
  trips as table,
  trucks as trucksTable,
} from "@/server/db/schema";
import { nextDocumentNumber } from "@/server/repos/counters";
import {
  eventsForTrip as storeEvents,
  getTrip as storeGet,
  listTrips as storeList,
  planTrip as storePlan,
  reconcileAndCloseTrip as storeReconcile,
  transitionTrip as storeTransition,
  tripBorderCharges as storeBorderCharges,
  tripsForDriver as storeForDriver,
  tripsForTruck as storeForTruck,
  updateTrip as storeUpdate,
} from "@/server/store/mock-store";
import {
  allowedTransitions,
  computeFuelRevenue,
  isTerminal,
  type CargoUnit,
  type Currency,
  type FuelProduct,
  type RateBasis,
  type Trip,
  type TripStatus,
  type TripStatusEvent,
} from "@/lib/types/trips";

type Row = typeof table.$inferSelect;
type EventRow = typeof eventsTable.$inferSelect;

const num = (v: unknown) => (v === null || v === undefined ? undefined : Number(v));

function toTrip(r: Row): Trip {
  return {
    id: r.id,
    number: r.number,
    bookingId: r.bookingId,
    truckId: r.truckId,
    trailerId: r.trailerId ?? undefined,
    driverId: r.driverId,
    status: r.status as TripStatus,
    origin: r.origin,
    destination: r.destination ?? undefined,
    destinationConfirmedAt: r.destinationConfirmedAt?.toISOString(),
    destinationConfirmedBy: r.destinationConfirmedBy ?? undefined,
    product: (r.product as FuelProduct | null) ?? undefined,
    cargoType: r.cargoType,
    cargoQuantity: Number(r.cargoQuantity),
    cargoUnit: r.cargoUnit as CargoUnit,
    loadedLitres: num(r.loadedLitres),
    loadingTempC: num(r.loadingTempC),
    density15C: num(r.density15C),
    loadedLitres20C: num(r.loadedLitres20C),
    loadingSealNumbers: r.loadingSealNumbers ?? undefined,
    dischargedLitres: num(r.dischargedLitres),
    dischargeTempC: num(r.dischargeTempC),
    dischargedLitres20C: num(r.dischargedLitres20C),
    dischargeSealNumbers: r.dischargeSealNumbers ?? undefined,
    ullagePct: num(r.ullagePct),
    transitBondNumber: r.transitBondNumber ?? undefined,
    revenueAmount: Number(r.revenueAmount),
    revenueCurrency: r.revenueCurrency as Currency,
    driverAdvanceKes: num(r.driverAdvanceKes),
    driverAdvanceUsedKes: num(r.driverAdvanceUsedKes),
    plannedDepartureDate: r.plannedDepartureDate ?? undefined,
    plannedDeliveryDate: r.plannedDeliveryDate ?? undefined,
    actualDepartureAt: r.actualDepartureAt?.toISOString(),
    actualDeliveryAt: r.actualDeliveryAt?.toISOString(),
    closedAt: r.closedAt?.toISOString(),
    actualKm: num(r.actualKm),
    actualFuelLitres: num(r.actualFuelLitres),
    readyToInvoice: r.readyToInvoice,
    notes: r.notes ?? undefined,
    createdAt: r.createdAt.toISOString(),
  };
}

function toEvent(r: EventRow): TripStatusEvent {
  return {
    id: r.id,
    tripId: r.tripId,
    fromStatus: (r.fromStatus as TripStatus | null) ?? null,
    toStatus: r.toStatus as TripStatus,
    occurredAt: r.occurredAt.toISOString(),
    actorName: r.actorName,
    note: r.note ?? undefined,
    location: r.location ?? undefined,
  };
}

/** Map a Partial<Trip> onto DB columns (numeric→string, ISO→Date). */
function toTripSet(patch: Partial<Trip>): Partial<typeof table.$inferInsert> {
  const s: Partial<typeof table.$inferInsert> = {};
  const setNum = (k: keyof typeof table.$inferInsert, v?: number) => {
    if (v !== undefined) (s as Record<string, unknown>)[k] = v === null ? null : String(v);
  };
  if (patch.status !== undefined) s.status = patch.status;
  if (patch.trailerId !== undefined) s.trailerId = patch.trailerId ?? null;
  if (patch.product !== undefined) s.product = patch.product ?? null;
  if (patch.cargoType !== undefined) s.cargoType = patch.cargoType;
  setNum("cargoQuantity", patch.cargoQuantity);
  if (patch.cargoUnit !== undefined) s.cargoUnit = patch.cargoUnit;
  setNum("loadedLitres", patch.loadedLitres);
  setNum("loadingTempC", patch.loadingTempC);
  setNum("density15C", patch.density15C);
  setNum("loadedLitres20C", patch.loadedLitres20C);
  if (patch.loadingSealNumbers !== undefined) s.loadingSealNumbers = patch.loadingSealNumbers ?? null;
  setNum("dischargedLitres", patch.dischargedLitres);
  setNum("dischargeTempC", patch.dischargeTempC);
  setNum("dischargedLitres20C", patch.dischargedLitres20C);
  if (patch.dischargeSealNumbers !== undefined) s.dischargeSealNumbers = patch.dischargeSealNumbers ?? null;
  setNum("ullagePct", patch.ullagePct);
  if (patch.transitBondNumber !== undefined) s.transitBondNumber = patch.transitBondNumber ?? null;
  setNum("revenueAmount", patch.revenueAmount);
  if (patch.revenueCurrency !== undefined) s.revenueCurrency = patch.revenueCurrency;
  setNum("driverAdvanceKes", patch.driverAdvanceKes);
  setNum("driverAdvanceUsedKes", patch.driverAdvanceUsedKes);
  if (patch.plannedDepartureDate !== undefined) s.plannedDepartureDate = patch.plannedDepartureDate ?? null;
  if (patch.plannedDeliveryDate !== undefined) s.plannedDeliveryDate = patch.plannedDeliveryDate ?? null;
  if (patch.actualDepartureAt !== undefined) s.actualDepartureAt = patch.actualDepartureAt ? new Date(patch.actualDepartureAt) : null;
  if (patch.actualDeliveryAt !== undefined) s.actualDeliveryAt = patch.actualDeliveryAt ? new Date(patch.actualDeliveryAt) : null;
  if (patch.closedAt !== undefined) s.closedAt = patch.closedAt ? new Date(patch.closedAt) : null;
  setNum("actualKm", patch.actualKm);
  setNum("actualFuelLitres", patch.actualFuelLitres);
  if (patch.readyToInvoice !== undefined) s.readyToInvoice = patch.readyToInvoice;
  if (patch.notes !== undefined) s.notes = patch.notes ?? null;
  return s;
}

export async function listTrips(filterStatus?: TripStatus): Promise<Trip[]> {
  if (IS_DEMO_MODE) return storeList(filterStatus);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .select()
    .from(table)
    .where(eq(table.organizationId, orgId))
    .orderBy(desc(table.createdAt));
  const all = rows.map(toTrip);
  return filterStatus ? all.filter((t) => t.status === filterStatus) : all;
}

export async function getTrip(id: string): Promise<Trip | undefined> {
  if (IS_DEMO_MODE) return storeGet(id);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .select()
    .from(table)
    .where(and(eq(table.id, id), eq(table.organizationId, orgId)))
    .limit(1);
  return rows[0] ? toTrip(rows[0]) : undefined;
}

export async function tripsForTruck(truckId: string): Promise<Trip[]> {
  if (IS_DEMO_MODE) return storeForTruck(truckId);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .select()
    .from(table)
    .where(and(eq(table.truckId, truckId), eq(table.organizationId, orgId)))
    .orderBy(desc(table.createdAt));
  return rows.map(toTrip);
}

export async function tripsForDriver(driverId: string): Promise<Trip[]> {
  if (IS_DEMO_MODE) return storeForDriver(driverId);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .select()
    .from(table)
    .where(and(eq(table.driverId, driverId), eq(table.organizationId, orgId)))
    .orderBy(desc(table.createdAt));
  return rows.map(toTrip);
}

export async function updateTrip(id: string, patch: Partial<Trip>): Promise<Trip | undefined> {
  if (IS_DEMO_MODE) return storeUpdate(id, patch);
  const db = getDb();
  const orgId = await requireOrgId();
  const set = toTripSet(patch);
  if (Object.keys(set).length === 0) return getTrip(id);
  const rows = await db
    .update(table)
    .set(set)
    .where(and(eq(table.id, id), eq(table.organizationId, orgId)))
    .returning();
  return rows[0] ? toTrip(rows[0]) : undefined;
}

export async function eventsForTrip(tripId: string): Promise<TripStatusEvent[]> {
  if (IS_DEMO_MODE) return storeEvents(tripId);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .select()
    .from(eventsTable)
    .where(and(eq(eventsTable.tripId, tripId), eq(eventsTable.organizationId, orgId)))
    .orderBy(eventsTable.occurredAt);
  return rows.map(toEvent);
}

export async function tripBorderCharges(tripId: string): Promise<number> {
  if (IS_DEMO_MODE) return storeBorderCharges(tripId);
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .select({ total: sql<string>`coalesce(sum(${borderTable.chargesKes}), 0)` })
    .from(borderTable)
    .where(and(eq(borderTable.tripId, tripId), eq(borderTable.organizationId, orgId)));
  return Number(rows[0]?.total ?? 0);
}

export type PlanTripInput = {
  bookingId: string;
  truckId: string;
  trailerId?: string;
  driverId: string;
  driverAdvanceKes?: number;
  plannedDepartureDate?: string;
  plannedDeliveryDate?: string;
  notes?: string;
};

export async function planTrip(input: PlanTripInput): Promise<Trip | undefined> {
  if (IS_DEMO_MODE) return storePlan(input);
  const db = getDb();
  const orgId = await requireOrgId();

  const bk = (
    await db
      .select()
      .from(bookingsTable)
      .where(and(eq(bookingsTable.id, input.bookingId), eq(bookingsTable.organizationId, orgId)))
      .limit(1)
  )[0];
  // Only confirmed bookings can be planned.
  if (!bk || bk.status !== "confirmed") return undefined;

  const revenue = computeFuelRevenue({
    basis: bk.agreedBasis as RateBasis,
    amount: Number(bk.agreedAmount),
    cargoQuantityLitres: Number(bk.cargoQuantity),
  });
  const number = await nextDocumentNumber(orgId, "TRP", "trip");

  const trip = await db.transaction(async (tx) => {
    const inserted = (
      await tx
        .insert(table)
        .values({
          organizationId: orgId,
          number,
          bookingId: bk.id,
          truckId: input.truckId,
          trailerId: input.trailerId ?? null,
          driverId: input.driverId,
          status: "planned",
          origin: bk.origin,
          // Carry forward booking's intended destination if any; the
          // dispatcher confirms the binding destination on the trip later.
          destination: bk.destination ?? null,
          product: bk.product ?? null,
          cargoType: bk.cargoType,
          cargoQuantity: String(bk.cargoQuantity),
          cargoUnit: bk.cargoUnit,
          revenueAmount: String(revenue),
          revenueCurrency: bk.agreedCurrency,
          driverAdvanceKes: input.driverAdvanceKes != null ? String(input.driverAdvanceKes) : null,
          plannedDepartureDate: input.plannedDepartureDate ?? null,
          plannedDeliveryDate: input.plannedDeliveryDate ?? null,
          notes: input.notes ?? null,
        })
        .returning()
    )[0]!;

    await tx.insert(eventsTable).values({
      organizationId: orgId,
      tripId: inserted.id,
      fromStatus: null,
      toStatus: "planned",
      actorName: "Dispatcher",
      note: "Trip planned and assigned",
    });

    await tx
      .update(bookingsTable)
      .set({ status: "planned", tripId: inserted.id })
      .where(eq(bookingsTable.id, bk.id));

    return inserted;
  });

  return toTrip(trip);
}

export type TransitionInput = {
  tripId: string;
  toStatus: TripStatus;
  actorName: string;
  note?: string;
  location?: string;
};

export async function transitionTrip(
  input: TransitionInput,
): Promise<{ trip: Trip; event: TripStatusEvent } | { error: string }> {
  if (IS_DEMO_MODE) return storeTransition(input);
  const db = getDb();
  const orgId = await requireOrgId();

  const current = await getTrip(input.tripId);
  if (!current) return { error: "Trip not found" };
  if (isTerminal(current.status)) return { error: `Trip is ${current.status} and cannot be changed.` };
  const allowed = allowedTransitions(current.status);
  if (!allowed.includes(input.toStatus)) {
    return {
      error: `Cannot move from ${current.status} to ${input.toStatus}. Allowed: ${allowed.join(", ") || "(none)"}.`,
    };
  }

  const now = new Date();
  const patch: Partial<Trip> = { status: input.toStatus };
  if (input.toStatus === "in_transit" && !current.actualDepartureAt) patch.actualDepartureAt = now.toISOString();
  if (input.toStatus === "delivered" && !current.actualDeliveryAt) patch.actualDeliveryAt = now.toISOString();
  if (input.toStatus === "closed" && !current.closedAt) {
    patch.closedAt = now.toISOString();
    patch.readyToInvoice = true;
  }

  const result = await db.transaction(async (tx) => {
    const updated = (
      await tx
        .update(table)
        .set(toTripSet(patch))
        .where(and(eq(table.id, current.id), eq(table.organizationId, orgId)))
        .returning()
    )[0]!;
    const eventRow = (
      await tx
        .insert(eventsTable)
        .values({
          organizationId: orgId,
          tripId: current.id,
          fromStatus: current.status,
          toStatus: input.toStatus,
          actorName: input.actorName,
          note: input.note ?? null,
          location: input.location ?? null,
        })
        .returning()
    )[0]!;
    await applySideEffects(tx, orgId, updated.truckId, updated.driverId, current.id, input.toStatus);
    return { trip: toTrip(updated), event: toEvent(eventRow) };
  });

  return result;
}

export type ReconcileInput = {
  tripId: string;
  actualKm?: number;
  actualFuelLitres?: number;
  driverAdvanceUsedKes?: number;
  closingNotes?: string;
  actorName: string;
};

export async function reconcileAndCloseTrip(
  input: ReconcileInput,
): Promise<{ trip: Trip; event: TripStatusEvent } | { error: string }> {
  if (IS_DEMO_MODE) return storeReconcile(input);
  const db = getDb();
  const orgId = await requireOrgId();

  const current = await getTrip(input.tripId);
  if (!current) return { error: "Trip not found" };
  if (isTerminal(current.status)) return { error: `Trip is ${current.status} and cannot be reconciled.` };
  if (current.status !== "delivered") {
    return { error: `Reconciliation only allowed from 'delivered'. Current: ${current.status}.` };
  }

  const now = new Date();
  const patch: Partial<Trip> = {
    status: "closed",
    closedAt: now.toISOString(),
    actualKm: input.actualKm ?? current.actualKm,
    actualFuelLitres: input.actualFuelLitres ?? current.actualFuelLitres,
    driverAdvanceUsedKes: input.driverAdvanceUsedKes ?? current.driverAdvanceUsedKes,
    notes: input.closingNotes ?? current.notes,
    readyToInvoice: true,
  };

  return db.transaction(async (tx) => {
    const updated = (
      await tx
        .update(table)
        .set(toTripSet(patch))
        .where(and(eq(table.id, current.id), eq(table.organizationId, orgId)))
        .returning()
    )[0]!;
    const eventRow = (
      await tx
        .insert(eventsTable)
        .values({
          organizationId: orgId,
          tripId: current.id,
          fromStatus: current.status,
          toStatus: "closed",
          actorName: input.actorName,
          note: input.closingNotes ?? "Trip reconciled and closed",
        })
        .returning()
    )[0]!;
    await applySideEffects(tx, orgId, updated.truckId, updated.driverId, current.id, "closed");
    return { trip: toTrip(updated), event: toEvent(eventRow) };
  });
}

/** Mirror the store's truck/driver busy↔free transitions. */
async function applySideEffects(
  tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0],
  orgId: string,
  truckId: string,
  driverId: string,
  tripId: string,
  status: TripStatus,
) {
  const busy = status === "loading" || status === "in_transit" || status === "at_border" || status === "delivered";
  const freeing = status === "closed" || status === "cancelled";

  const truck = (await tx.select().from(trucksTable).where(eq(trucksTable.id, truckId)).limit(1))[0];
  const driver = (await tx.select().from(driversTable).where(eq(driversTable.id, driverId)).limit(1))[0];

  if (busy) {
    if (truck && truck.status === "active") {
      await tx.update(trucksTable).set({ status: "in_service" }).where(eq(trucksTable.id, truckId));
    }
    if (driver && driver.status === "active") {
      await tx.update(driversTable).set({ status: "on_trip" }).where(eq(driversTable.id, driverId));
    }
  }

  if (freeing) {
    // Other open (non-planned, non-terminal) trips keep the truck/driver busy.
    const otherTrips = (
      await tx.select().from(table).where(eq(table.organizationId, orgId))
    ).filter((t) => t.id !== tripId);
    const truckBusyElsewhere = otherTrips.some(
      (t) => t.truckId === truckId && !isTerminal(t.status as TripStatus) && t.status !== "planned",
    );
    const driverBusyElsewhere = otherTrips.some(
      (t) => t.driverId === driverId && !isTerminal(t.status as TripStatus) && t.status !== "planned",
    );
    if (truck && truck.status === "in_service" && !truckBusyElsewhere) {
      await tx.update(trucksTable).set({ status: "active" }).where(eq(trucksTable.id, truckId));
    }
    if (driver && driver.status === "on_trip" && !driverBusyElsewhere) {
      await tx.update(driversTable).set({ status: "active" }).where(eq(driversTable.id, driverId));
    }
  }
}

/**
 * Bind a trip's delivery destination. Called from the depot when the dispatcher
 * confirms where the load is going, or at the transit border (Malaba / Busia)
 * when the customer's instructions firm up. Records who confirmed it and when,
 * writes a timeline event, and from this point onwards the destination is
 * locked-in for the Road User Charge packet and downstream invoicing.
 *
 * Cannot be re-confirmed once set unless the trip is still in {planned, loading}
 * and the caller passes `force: true` — protects against accidental rebinds
 * mid-transit.
 */
export async function confirmTripDestination(input: {
  tripId: string;
  destination: string;
  actorName: string;
  location?: string;
  force?: boolean;
}): Promise<Trip | { error: string }> {
  if (IS_DEMO_MODE) {
    const t = await storeGet(input.tripId);
    if (!t) return { error: "Trip not found" };
    if (t.destination && !input.force) return { error: "Destination already confirmed" };
    // Best-effort store update; mock store doesn't model the new fields.
    return { ...t, destination: input.destination };
  }
  const dest = input.destination.trim();
  if (!dest) return { error: "Destination is required" };
  const db = getDb();
  const orgId = await requireOrgId();
  const trip = (
    await db
      .select()
      .from(table)
      .where(and(eq(table.id, input.tripId), eq(table.organizationId, orgId)))
      .limit(1)
  )[0];
  if (!trip) return { error: "Trip not found" };
  if (isTerminal(trip.status as TripStatus)) {
    return { error: `Cannot change destination of a ${trip.status} trip` };
  }
  if (
    trip.destination &&
    trip.destinationConfirmedAt &&
    !input.force &&
    trip.status !== "planned" &&
    trip.status !== "loading"
  ) {
    return { error: "Destination already confirmed for this trip" };
  }

  const updated = await db.transaction(async (tx) => {
    const r = (
      await tx
        .update(table)
        .set({
          destination: dest,
          destinationConfirmedAt: new Date(),
          destinationConfirmedBy: input.actorName,
        })
        .where(and(eq(table.id, input.tripId), eq(table.organizationId, orgId)))
        .returning()
    )[0]!;
    // Timeline event — keep `toStatus` = current status so it slots into the
    // existing per-status timeline without polluting the status machine.
    await tx.insert(eventsTable).values({
      organizationId: orgId,
      tripId: input.tripId,
      fromStatus: trip.status,
      toStatus: trip.status,
      actorName: input.actorName,
      location: input.location ?? null,
      note: `Destination confirmed: ${dest}`,
    });
    return r;
  });
  return toTrip(updated);
}
