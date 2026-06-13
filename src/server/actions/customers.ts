"use server";

import { revalidatePath } from "next/cache";
import { bookingsForCustomer } from "@/server/repos/bookings";
import {
  createCustomer as repoCreate,
  getCustomer as repoGet,
  listCustomers as repoList,
  updateCustomer as repoUpdate,
} from "@/server/repos/customers";
import { customerCreateSchema, type CustomerCreateInput } from "@/lib/validators/trips";

export async function listCustomers() {
  return repoList();
}

export async function getCustomerById(id: string) {
  const c = await repoGet(id);
  if (!c) return undefined;
  return { ...c, bookings: await bookingsForCustomer(id) };
}

export type ActionResult = { ok: true; id: string } | { ok: false; error: string };

export async function createCustomer(input: CustomerCreateInput): Promise<ActionResult> {
  const parsed = customerCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  try {
    const created = await repoCreate({
      name: parsed.data.name,
      contactPerson: parsed.data.contactPerson,
      phone: parsed.data.phone,
      email: parsed.data.email || undefined,
      kraPin: parsed.data.kraPin || undefined,
      customerType: parsed.data.customerType,
      epraLicenceNumber: parsed.data.epraLicenceNumber || undefined,
      billingAddress: parsed.data.billingAddress || undefined,
      billingCurrency: parsed.data.billingCurrency,
      paymentTermsDays: parsed.data.paymentTermsDays,
      notes: parsed.data.notes || undefined,
    });
    revalidatePath("/customers");
    return { ok: true, id: created.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to save customer.";
    return { ok: false, error: msg };
  }
}

export async function updateCustomerAction(id: string, patch: Partial<CustomerCreateInput>) {
  await repoUpdate(id, patch);
  revalidatePath("/customers");
  revalidatePath(`/customers/${id}`);
}
