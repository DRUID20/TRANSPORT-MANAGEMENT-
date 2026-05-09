"use server";

import { revalidatePath } from "next/cache";
import {
  bookingsForCustomer,
  createCustomer as storeCreate,
  getCustomer,
  listCustomers as storeList,
  updateCustomer as storeUpdate,
} from "@/server/store/mock-store";
import { customerCreateSchema, type CustomerCreateInput } from "@/lib/validators/trips";

export async function listCustomers() {
  return storeList();
}

export async function getCustomerById(id: string) {
  const c = getCustomer(id);
  if (!c) return undefined;
  return { ...c, bookings: bookingsForCustomer(id) };
}

export type ActionResult = { ok: true; id: string } | { ok: false; error: string };

export async function createCustomer(input: CustomerCreateInput): Promise<ActionResult> {
  const parsed = customerCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const created = storeCreate({
    name: parsed.data.name,
    contactPerson: parsed.data.contactPerson,
    phone: parsed.data.phone,
    email: parsed.data.email || undefined,
    kraPin: parsed.data.kraPin || undefined,
    billingAddress: parsed.data.billingAddress || undefined,
    billingCurrency: parsed.data.billingCurrency,
    paymentTermsDays: parsed.data.paymentTermsDays,
    notes: parsed.data.notes || undefined,
  });
  revalidatePath("/customers");
  return { ok: true, id: created.id };
}

export async function updateCustomerAction(id: string, patch: Partial<CustomerCreateInput>) {
  storeUpdate(id, patch);
  revalidatePath("/customers");
  revalidatePath(`/customers/${id}`);
}
