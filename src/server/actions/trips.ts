"use server";

import { revalidatePath } from "next/cache";
import {
  confirmTripDestination as repoConfirmDestination,
  eventsForTrip,
  getTrip,
  listTrips as repoList,
  planTrip as repoPlan,
  reconcileAndCloseTrip as repoReconcile,
  transitionTrip as repoTransition,
  tripBorderCharges as repoBorderCharges,
  tripsForDriver as repoForDriver,
  tripsForTruck as repoForTruck,
  updateTrip as repoUpdateTrip,
} from "@/server/repos/trips";
import { getBooking } from "@/server/repos/bookings";
import { getCustomer } from "@/server/repos/customers";
import { getTruck } from "@/server/repos/trucks";
import { getTrailer } from "@/server/repos/trailers";
import { getDriver } from "@/server/repos/drivers";
import { lookupRate as repoLookupRate } from "@/server/repos/rates";
import { listTripDocuments } from "@/server/repos/documents";
import { listBorderCrossings as repoListBorderCrossings } from "@/server/repos/borders";
import { invoicesForTrip, cancelInvoice } from "@/server/repos/ar";
import { listLoans, cancelLoan } from "@/server/repos/payroll";
import { getEmployeeByDriverId } from "@/server/repos/hr";
import { requireCapability, PermissionError } from "@/server/auth/permissions";
import { logAudit } from "@/server/auth/audit";
import {
  correctVolumeTo20C,
  isTerminal,
  ullageVariancePct,
  type RateBasis,
  type TripStatus,
} from "@/lib/types/trips";
import type { Currency } from "@/lib/types/ledger";
import {
  tripPlanSchema,
  tripReconcileSchema,
  tripLoadingSchema,
  tripDischargeSchema,
  type TripPlanInput,
  type TripReconcileInput,
  type TripLoadingInput,
  type TripDischargeInput,
} from "@/lib/validators/trips";

export async function listTrips(filterStatus?: TripStatus) {
  return repoList(filterStatus);
}

export async function getTripById(id: string) {
  const t = await getTrip(id);
  if (!t) return undefined;
  const booking = await getBooking(t.bookingId);
  const [customer, truck, trailer, driver, events, borderChargesKes] = await Promise.all([
    booking ? getCustomer(booking.customerId) : Promise.resolve(undefined),
    getTruck(t.truckId),
    t.trailerId ? getTrailer(t.trailerId) : Promise.resolve(undefined),
    getDriver(t.driverId),
    eventsForTrip(t.id),
    repoBorderCharges(t.id),
  ]);
  return { ...t, booking, customer, truck, trailer, driver, events, borderChargesKes };
}

export async function tripsForTruck(truckId: string) {
  return repoForTruck(truckId);
}
export async function tripsForDriver(driverId: string) {
  return repoForDriver(driverId);
}

export type ActionResult = { ok: true; id: string } | { ok: false; error: string };

export async function reconcileAndCloseTrip(
  input: TripReconcileInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const parsed = tripReconcileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const result = await repoReconcile(parsed.data);
  if ("error" in result) return { ok: false, error: result.error };
  await logAudit({ entityType: "trip", entityId: result.trip.id, action: "reconcile_close", diff: { status: { from: "delivered", to: "closed" } } });
  revalidatePath("/trips");
  revalidatePath(`/trips/${input.tripId}`);
  revalidatePath("/dashboard");
  return { ok: true, id: result.trip.id };
}

export type TransitionResult =
  | { ok: true; status: TripStatus }
  | { ok: false; error: string };

export async function transitionTrip(input: {
  tripId: string;
  toStatus: TripStatus;
  actorName: string;
  note?: string;
  location?: string;
}): Promise<TransitionResult> {
  const result = await repoTransition(input);
  if ("error" in result) return { ok: false, error: result.error };
  await logAudit({
    entityType: "trip",
    entityId: input.tripId,
    action: "status_change",
    diff: { status: { from: null, to: result.trip.status } },
  });
  revalidatePath("/trips", "layout");
  revalidatePath(`/trips/${input.tripId}`, "layout");
  revalidatePath("/dashboard");
  revalidatePath(`/trucks/${result.trip.truckId}`);
  revalidatePath(`/drivers/${result.trip.driverId}`);
  return { ok: true, status: result.trip.status };
}

export async function planTrip(input: TripPlanInput): Promise<ActionResult> {
  const parsed = tripPlanSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  // A truck can't take a new trip until its previous one is closed/cancelled.
  const truckTrips = await repoForTruck(parsed.data.truckId);
  const open = truckTrips.find((t) => t.status !== "closed" && t.status !== "cancelled");
  if (open) {
    return {
      ok: false,
      error: `That truck is still on ${open.number} (${open.status.replace(/_/g, " ")}). Close or cancel that trip before dispatching it again.`,
    };
  }
  const trip = await repoPlan(parsed.data);
  if (!trip) {
    return { ok: false, error: "Booking not found or already planned/cancelled." };
  }
  await logAudit({ entityType: "trip", entityId: trip.id, action: "create", diff: { number: { from: null, to: trip.number } } });
  revalidatePath("/bookings");
  revalidatePath(`/bookings/${input.bookingId}`);
  revalidatePath("/trips");
  revalidatePath(`/trips/${trip.id}`);
  return { ok: true, id: trip.id };
}

/**
 * Bind the trip's delivery destination. Called at the depot when the
 * dispatcher confirms the unload point, or at the transit border (Malaba /
 * Busia) when the customer's instructions firm up. Once confirmed the
 * destination locks for the Road User Charge packet — caller can `force`
 * while still in planned/loading, otherwise it refuses.
 */
export async function confirmTripDestination(input: {
  tripId: string;
  destination: string;
  actorName: string;
  location?: string;
  force?: boolean;
  rateAmount?: number;
  rateBasis?: RateBasis;
  rateCurrency?: Currency;
}): Promise<ActionResult> {
  if (!input.destination.trim()) return { ok: false, error: "Destination is required" };
  if (!input.actorName.trim()) return { ok: false, error: "Your name is required" };
  const r = await repoConfirmDestination(input);
  if ("error" in r) return { ok: false, error: r.error };
  await logAudit({
    entityType: "trip",
    entityId: input.tripId,
    action: "confirm_destination",
    diff: { destination: { from: null, to: input.destination } },
  });
  revalidatePath("/trips");
  revalidatePath(`/trips/${input.tripId}`);
  revalidatePath("/invoices");
  return { ok: true, id: r.id };
}

/** Preview the rate-card rate for a route (used by the confirm-destination UI). */
export async function lookupRateForTrip(input: {
  origin: string;
  destination: string;
  customerId?: string;
  cargoClass?: string;
}) {
  return repoLookupRate(input);
}

/**
 * Capture depot loading observations on a trip.
 *
 * Computes the @20°C-corrected volume on the server using the product's
 * cubical-expansion coefficient so the canonical figure isn't a client
 * preview. Authoritative monthly correction still re-runs against ASTM
 * D1250 tables in the volumetric accountant's spreadsheet.
 */
export async function captureTripLoading(
  tripId: string,
  input: TripLoadingInput,
): Promise<ActionResult> {
  const parsed = tripLoadingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const trip = await getTrip(tripId);
  if (!trip) return { ok: false, error: "Trip not found." };
  if (isTerminal(trip.status)) {
    return {
      ok: false,
      error: "Trip is closed — loading observations can no longer be edited.",
    };
  }
  if (await tripHasLiveInvoice(tripId)) {
    return {
      ok: false,
      error:
        "An invoice already exists for this trip — volumes are locked. Have an admin reopen the trip to amend the load.",
    };
  }
  if (!trip.product) {
    return {
      ok: false,
      error: "Trip is missing a fuel product. Set it on the booking before capturing loading.",
    };
  }
  // BOL is already at 20 °C — observed = corrected. If a legacy entry still
  // supplies temp/density, the correction stays mathematically right (it's
  // a no-op when temp = 20).
  const loaded20C = parsed.data.loadingTempC !== undefined
    ? correctVolumeTo20C(trip.product, parsed.data.loadedLitres, parsed.data.loadingTempC)
    : parsed.data.loadedLitres;
  const ullage =
    trip.dischargedLitres20C !== undefined
      ? ullageVariancePct(loaded20C, trip.dischargedLitres20C)
      : trip.ullagePct;

  await repoUpdateTrip(tripId, {
    loadedLitres: parsed.data.loadedLitres,
    loadingTempC: parsed.data.loadingTempC,
    density15C: parsed.data.density15C,
    loadedLitres20C: loaded20C,
    loadingSealNumbers: parsed.data.loadingSealNumbers,
    transitBondNumber: parsed.data.transitBondNumber ?? trip.transitBondNumber,
    ullagePct: ullage,
  });
  await logAudit({
    entityType: "trip",
    entityId: tripId,
    action: "capture_loading",
    diff: { loadedLitres: { from: trip.loadedLitres ?? null, to: parsed.data.loadedLitres } },
  });
  revalidatePath(`/trips/${tripId}`, "layout");
  return { ok: true, id: tripId };
}

/**
 * Capture customer-side discharge observations. Once discharge is in,
 * ullage variance is computed and persisted so the dashboard alert can
 * pick it up without rerunning the math.
 */
export async function captureTripDischarge(
  tripId: string,
  input: TripDischargeInput,
): Promise<ActionResult> {
  const parsed = tripDischargeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const trip = await getTrip(tripId);
  if (!trip) return { ok: false, error: "Trip not found." };
  if (isTerminal(trip.status)) {
    return {
      ok: false,
      error: "Trip is closed — discharge observations can no longer be edited.",
    };
  }
  if (await tripHasLiveInvoice(tripId)) {
    return {
      ok: false,
      error:
        "An invoice already exists for this trip — volumes are locked. Have an admin reopen the trip to amend the delivery.",
    };
  }
  if (!trip.product) {
    return {
      ok: false,
      error: "Trip is missing a fuel product. Capture loading first.",
    };
  }
  if (trip.loadedLitres20C === undefined) {
    return {
      ok: false,
      error: "Capture depot loading observations before discharge.",
    };
  }
  // BOL volume is at 20 °C, so observed = corrected when temp isn't given.
  const discharged20C = parsed.data.dischargeTempC !== undefined
    ? correctVolumeTo20C(trip.product, parsed.data.dischargedLitres, parsed.data.dischargeTempC)
    : parsed.data.dischargedLitres;
  const ullage = ullageVariancePct(trip.loadedLitres20C, discharged20C);

  await repoUpdateTrip(tripId, {
    dischargedLitres: parsed.data.dischargedLitres,
    dischargeTempC: parsed.data.dischargeTempC,
    dischargedLitres20C: discharged20C,
    dischargeSealNumbers: parsed.data.dischargeSealNumbers,
    ullagePct: ullage,
  });
  await logAudit({
    entityType: "trip",
    entityId: tripId,
    action: "capture_discharge",
    diff: { dischargedLitres: { from: trip.dischargedLitres ?? null, to: parsed.data.dischargedLitres } },
  });
  revalidatePath(`/trips/${tripId}`, "layout");
  return { ok: true, id: tripId };
}

/** True if the trip has any non-cancelled invoice. Used to lock volumes:
 *  once we've billed the delivered L20, the load/discharge figures are
 *  frozen — amending them would silently desync the invoice + the shortage
 *  loan. An admin reopen is the only way back. */
async function tripHasLiveInvoice(tripId: string): Promise<boolean> {
  const invoices = await invoicesForTrip(tripId);
  return invoices.some((i) => i.status !== "cancelled");
}

// ============================================================
// Wizard stage advancement
// ============================================================

/**
 * Advance a trip to the next wizard stage, enforcing the gate for that step
 * SERVER-SIDE (the UI also gates, but never trust the button). Each target
 * status validates its preconditions before delegating to `transitionTrip`,
 * which owns the actual status-machine validation + timeline event.
 *
 *   to in_transit  → requires BOL approved + loaded volume + seals
 *                    (auto-walks planned→loading→in_transit)
 *   to at_border   → no extra gate (passive "reached the border" milestone)
 *   to delivered   → requires destination bound + a border crossing recorded
 */
export async function advanceTripStage(input: {
  tripId: string;
  to: "in_transit" | "at_border" | "delivered";
  actorName?: string;
  location?: string;
}): Promise<TransitionResult> {
  const trip = await getTrip(input.tripId);
  if (!trip) return { ok: false, error: "Trip not found." };
  if (isTerminal(trip.status)) {
    return { ok: false, error: `Trip is ${trip.status} and cannot be advanced.` };
  }
  const actorName = input.actorName?.trim() || "Dispatcher";

  if (input.to === "in_transit") {
    const documents = await listTripDocuments(input.tripId);
    const bol = documents.find((d) => d.kind === "bill_of_lading");
    if (!bol) return { ok: false, error: "Upload the Bill of Lading before dispatching." };
    if (bol.status !== "approved") {
      return { ok: false, error: "The Bill of Lading must be approved before the truck moves." };
    }
    if (trip.loadedLitres === undefined || !trip.loadingSealNumbers) {
      return { ok: false, error: "Capture the loaded volume + seal numbers before dispatching." };
    }
    // planned can't jump straight to in_transit — walk it through loading.
    if (trip.status === "planned") {
      const toLoading = await transitionTrip({ tripId: input.tripId, toStatus: "loading", actorName, note: "Loading started" });
      if (!toLoading.ok) return toLoading;
    }
    return transitionTrip({
      tripId: input.tripId,
      toStatus: "in_transit",
      actorName,
      note: "Loading complete — departed depot",
      location: input.location,
    });
  }

  if (input.to === "at_border") {
    return transitionTrip({
      tripId: input.tripId,
      toStatus: "at_border",
      actorName,
      note: "Reached the border post",
      location: input.location,
    });
  }

  // to === "delivered" — clear the border
  if (!trip.destination) {
    return { ok: false, error: "Assign the destination before clearing the border." };
  }
  const crossings = await repoListBorderCrossings(input.tripId);
  if (crossings.length === 0) {
    return {
      ok: false,
      error: "Record at least one border crossing (Malaba or Busia) before delivery.",
    };
  }
  return transitionTrip({
    tripId: input.tripId,
    toStatus: "delivered",
    actorName,
    note: "Cleared the border — en route to consignee",
    location: input.location,
  });
}

/**
 * Admin escape hatch: reopen a closed/invoiced trip so volumes, expenses or
 * border charges can be corrected. Capability-gated (`finance.post`) and
 * audited.
 *
 *   - If a SENT (GL-posted) invoice exists → refuse. The finance trail is
 *     live; the operator must issue a credit note first (deferred feature).
 *   - If only a DRAFT invoice exists → cancel it (reverses nothing on the GL
 *     since draft never posted) AND reverse the auto-raised shortage loan for
 *     this trip, so re-invoicing re-derives the deduction cleanly.
 *   - Reset status to 'delivered' and clear readyToInvoice so the wizard
 *     drops back to the Delivery/Invoice stage, unlocked for edits.
 */
export async function reopenTrip(input: {
  tripId: string;
  actorName?: string;
}): Promise<ActionResult> {
  try {
    await requireCapability("finance.post");
  } catch (e) {
    return { ok: false, error: e instanceof PermissionError ? e.message : "Forbidden" };
  }

  const trip = await getTrip(input.tripId);
  if (!trip) return { ok: false, error: "Trip not found." };
  if (trip.status === "cancelled") {
    return { ok: false, error: "Cancelled trips can't be reopened." };
  }

  const invoices = await invoicesForTrip(input.tripId);
  const sent = invoices.find((i) => i.status !== "cancelled" && i.status !== "draft");
  if (sent) {
    return {
      ok: false,
      error: `Invoice ${sent.number} is already ${sent.status}. Issue a credit note before reopening this trip.`,
    };
  }

  // Cancel any draft invoice so re-invoicing starts clean.
  const draft = invoices.find((i) => i.status === "draft");
  if (draft) {
    const r = await cancelInvoice(draft.id);
    if ("error" in r) return { ok: false, error: r.error };
  }

  // Reverse the auto-raised shortage loan (idempotent key: shortageTripId).
  if (trip.driverId) {
    const employee = await getEmployeeByDriverId(trip.driverId);
    if (employee) {
      const loans = await listLoans({ employeeId: employee.id });
      const shortageLoan = loans.find(
        (l) => l.shortageTripId === trip.id && l.status === "active",
      );
      if (shortageLoan) await cancelLoan(shortageLoan.id);
    }
  }

  // Drop back to 'delivered', unlocked. readyToInvoice cleared so the wizard
  // re-derives the Delivery/Invoice stage and the volume-lock lifts. (closedAt
  // is left as the prior close timestamp; it's overwritten on the next close.)
  await repoUpdateTrip(input.tripId, {
    status: "delivered",
    readyToInvoice: false,
  });

  await logAudit({
    entityType: "trip",
    entityId: input.tripId,
    action: "reopen",
    diff: {
      status: { from: trip.status, to: "delivered" },
      ...(draft ? { invoice: { from: draft.number, to: "cancelled" } } : {}),
    },
  });

  revalidatePath("/trips", "layout");
  revalidatePath(`/trips/${input.tripId}`, "layout");
  revalidatePath("/invoices");
  revalidatePath("/hr/loans");
  revalidatePath("/dashboard");
  return { ok: true, id: input.tripId };
}
