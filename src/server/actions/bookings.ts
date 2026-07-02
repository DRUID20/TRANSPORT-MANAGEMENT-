"use server";

import { revalidatePath } from "next/cache";
import {
  createBooking as repoCreate,
  deleteBooking as repoDelete,
  getBooking,
  listBookings as repoList,
  updateBookingStatus as repoUpdateStatus,
} from "@/server/repos/bookings";
import { getCustomer } from "@/server/repos/customers";
import { requireCapability, PermissionError, guard } from "@/server/auth/permissions";
import { logAudit } from "@/server/auth/audit";
import type { BookingStatus } from "@/lib/types/trips";
import { FUEL_PRODUCT_LABELS } from "@/lib/types/trips";
import { bookingCreateSchema, type BookingCreateInput } from "@/lib/validators/trips";

export async function listBookings(filterStatus?: BookingStatus) {
  return repoList(filterStatus);
}

export async function getBookingById(id: string) {
  const b = await getBooking(id);
  if (!b) return undefined;
  const customer = await getCustomer(b.customerId);
  return { ...b, customer };
}

export type ActionResult = { ok: true; id: string } | { ok: false; error: string };

export async function createBooking(input: BookingCreateInput): Promise<ActionResult> {
  const denied = await guard("fleet.write");
  if (denied) return denied;
  const parsed = bookingCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  // Fuel-only TMS — default to AGO when the caller hasn't specified yet.
  const product = parsed.data.product ?? "AGO";
  const cargoType = parsed.data.cargoType ?? FUEL_PRODUCT_LABELS[product];
  const created = await repoCreate({
    customerId: parsed.data.customerId,
    origin: parsed.data.origin,
    destination: parsed.data.destination,
    product,
    cargoType,
    cargoQuantity: parsed.data.cargoQuantity,
    cargoUnit: parsed.data.cargoUnit,
    requestedDate: parsed.data.requestedDate,
    agreedAmount: parsed.data.agreedAmount,
    agreedBasis: parsed.data.agreedBasis,
    agreedCurrency: parsed.data.agreedCurrency,
    notes: parsed.data.notes || undefined,
  });
  await logAudit({ entityType: "booking", entityId: created.id, action: "create", diff: { number: { from: null, to: created.number } } });
  revalidatePath("/bookings");
  return { ok: true, id: created.id };
}

export async function setBookingStatus(id: string, status: BookingStatus) {
  await requireCapability("fleet.write");
  const prev = await getBooking(id);
  await repoUpdateStatus(id, status);
  await logAudit({
    entityType: "booking",
    entityId: id,
    action: "status_change",
    diff: { status: { from: prev?.status ?? null, to: status } },
  });
  revalidatePath("/bookings");
  revalidatePath(`/bookings/${id}`);
}

/**
 * Delete a booking — admin only, and only while it hasn't been planned onto
 * a trip. Once a trip exists the booking is part of the operational record
 * and must be cancelled, not deleted.
 */
export async function deleteBooking(id: string): Promise<ActionResult> {
  try {
    await requireCapability("admin");
  } catch (e) {
    return { ok: false, error: e instanceof PermissionError ? e.message : "Forbidden" };
  }
  const booking = await getBooking(id);
  if (!booking) return { ok: false, error: "Booking not found." };
  if (booking.status === "planned" || booking.tripId) {
    return { ok: false, error: "This booking is already planned onto a trip — cancel the trip instead." };
  }
  const ok = await repoDelete(id);
  if (!ok) return { ok: false, error: "Delete failed." };
  await logAudit({ entityType: "booking", entityId: id, action: "delete", diff: { number: { from: booking.number, to: null } } });
  revalidatePath("/bookings");
  return { ok: true, id };
}
