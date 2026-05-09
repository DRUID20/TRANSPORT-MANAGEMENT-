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
  transitionTrip as storeTransition,
  tripsForDriver as storeForDriver,
  tripsForTruck as storeForTruck,
} from "@/server/store/mock-store";
import type { TripStatus } from "@/lib/types/trips";
import { tripPlanSchema, type TripPlanInput } from "@/lib/validators/trips";

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
  return { ...t, booking, customer, truck, trailer, driver, events };
}

export async function tripsForTruck(truckId: string) {
  return storeForTruck(truckId);
}
export async function tripsForDriver(driverId: string) {
  return storeForDriver(driverId);
}

export type ActionResult = { ok: true; id: string } | { ok: false; error: string };

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
