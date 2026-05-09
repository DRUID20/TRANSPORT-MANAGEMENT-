"use server";

import { revalidatePath } from "next/cache";
import {
  createBooking as storeCreate,
  getBooking,
  getCustomer,
  listBookings as storeList,
  updateBookingStatus as storeUpdateStatus,
} from "@/server/store/mock-store";
import type { BookingStatus } from "@/lib/types/trips";
import { bookingCreateSchema, type BookingCreateInput } from "@/lib/validators/trips";

export async function listBookings(filterStatus?: BookingStatus) {
  return storeList(filterStatus);
}

export async function getBookingById(id: string) {
  const b = getBooking(id);
  if (!b) return undefined;
  const customer = getCustomer(b.customerId);
  return { ...b, customer };
}

export type ActionResult = { ok: true; id: string } | { ok: false; error: string };

export async function createBooking(input: BookingCreateInput): Promise<ActionResult> {
  const parsed = bookingCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const created = storeCreate({
    customerId: parsed.data.customerId,
    origin: parsed.data.origin,
    destination: parsed.data.destination,
    cargoType: parsed.data.cargoType,
    cargoQuantity: parsed.data.cargoQuantity,
    cargoUnit: parsed.data.cargoUnit,
    requestedDate: parsed.data.requestedDate,
    agreedAmount: parsed.data.agreedAmount,
    agreedBasis: parsed.data.agreedBasis,
    agreedCurrency: parsed.data.agreedCurrency,
    notes: parsed.data.notes || undefined,
  });
  revalidatePath("/bookings");
  return { ok: true, id: created.id };
}

export async function setBookingStatus(id: string, status: BookingStatus) {
  storeUpdateStatus(id, status);
  revalidatePath("/bookings");
  revalidatePath(`/bookings/${id}`);
}
