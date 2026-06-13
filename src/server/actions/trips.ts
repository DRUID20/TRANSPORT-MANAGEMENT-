"use server";

import { revalidatePath } from "next/cache";
import {
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
  const trip = await repoPlan(parsed.data);
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
  const trip = await getTrip(tripId);
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

  await repoUpdateTrip(tripId, {
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
  const trip = await getTrip(tripId);
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

  await repoUpdateTrip(tripId, {
    dischargedLitres: parsed.data.dischargedLitres,
    dischargeTempC: parsed.data.dischargeTempC,
    dischargedLitres20C: discharged20C,
    dischargeSealNumbers: parsed.data.dischargeSealNumbers,
    ullagePct: ullage,
  });
  revalidatePath(`/trips/${tripId}`);
  return { ok: true, id: tripId };
}
