"use server";

import { revalidatePath } from "next/cache";
import {
  eventsForTrip,
  getBooking,
  getCustomer,
  getDriver,
  getTrailer,
  getTrip,
  getTruck,
  listTrips as storeList,
  planTrip as storePlan,
  reconcileAndCloseTrip as storeReconcile,
  transitionTrip as storeTransition,
  tripBorderCharges as storeBorderCharges,
  tripsForDriver as storeForDriver,
  tripsForTruck as storeForTruck,
  updateTrip as storeUpdateTrip,
} from "@/server/store/mock-store";
import {
  correctVolumeTo20C,
  isTerminal,
  ullageVariancePct,
  type TripStatus,
} from "@/lib/types/trips";
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
  return storeList(filterStatus);
}

export async function getTripById(id: string) {
  const t = getTrip(id);
  if (!t) return undefined;
  const booking = getBooking(t.bookingId);
  const customer = booking ? getCustomer(booking.customerId) : undefined;
  const truck = getTruck(t.truckId);
  const trailer = t.trailerId ? getTrailer(t.trailerId) : undefined;
  const driver = getDriver(t.driverId);
  const events = eventsForTrip(t.id);
  const borderChargesKes = storeBorderCharges(t.id);
  return { ...t, booking, customer, truck, trailer, driver, events, borderChargesKes };
}

export async function tripsForTruck(truckId: string) {
  return storeForTruck(truckId);
}
export async function tripsForDriver(driverId: string) {
  return storeForDriver(driverId);
}

export type ActionResult = { ok: true; id: string } | { ok: false; error: string };

export async function reconcileAndCloseTrip(
  input: TripReconcileInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const parsed = tripReconcileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const result = storeReconcile(parsed.data);
  if ("error" in result) return { ok: false, error: result.error };
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
  const result = storeTransition(input);
  if ("error" in result) return { ok: false, error: result.error };
  revalidatePath("/trips");
  revalidatePath(`/trips/${input.tripId}`);
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
  const trip = storePlan(parsed.data);
  if (!trip) {
    return { ok: false, error: "Booking not found or already planned/cancelled." };
  }
  revalidatePath("/bookings");
  revalidatePath(`/bookings/${input.bookingId}`);
  revalidatePath("/trips");
  revalidatePath(`/trips/${trip.id}`);
  return { ok: true, id: trip.id };
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
  const trip = getTrip(tripId);
  if (!trip) return { ok: false, error: "Trip not found." };
  if (isTerminal(trip.status)) {
    return {
      ok: false,
      error: "Trip is closed — loading observations can no longer be edited.",
    };
  }
  if (!trip.product) {
    return {
      ok: false,
      error: "Trip is missing a fuel product. Set it on the booking before capturing loading.",
    };
  }
  const loaded20C = correctVolumeTo20C(
    trip.product,
    parsed.data.loadedLitres,
    parsed.data.loadingTempC,
  );
  // Recompute ullage if discharge is already captured.
  const ullage =
    trip.dischargedLitres20C !== undefined
      ? ullageVariancePct(loaded20C, trip.dischargedLitres20C)
      : trip.ullagePct;

  storeUpdateTrip(tripId, {
    loadedLitres: parsed.data.loadedLitres,
    loadingTempC: parsed.data.loadingTempC,
    density15C: parsed.data.density15C,
    loadedLitres20C: loaded20C,
    loadingSealNumbers: parsed.data.loadingSealNumbers,
    transitBondNumber: parsed.data.transitBondNumber ?? trip.transitBondNumber,
    ullagePct: ullage,
  });
  revalidatePath(`/trips/${tripId}`);
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
  const trip = getTrip(tripId);
  if (!trip) return { ok: false, error: "Trip not found." };
  if (isTerminal(trip.status)) {
    return {
      ok: false,
      error: "Trip is closed — discharge observations can no longer be edited.",
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
  const discharged20C = correctVolumeTo20C(
    trip.product,
    parsed.data.dischargedLitres,
    parsed.data.dischargeTempC,
  );
  const ullage = ullageVariancePct(trip.loadedLitres20C, discharged20C);

  storeUpdateTrip(tripId, {
    dischargedLitres: parsed.data.dischargedLitres,
    dischargeTempC: parsed.data.dischargeTempC,
    dischargedLitres20C: discharged20C,
    dischargeSealNumbers: parsed.data.dischargeSealNumbers,
    ullagePct: ullage,
  });
  revalidatePath(`/trips/${tripId}`);
  return { ok: true, id: tripId };
}
