"use server";

import { revalidatePath } from "next/cache";
import {
  createRate as storeCreate,
  listRates as storeList,
  lookupRate as storeLookup,
} from "@/server/store/mock-store";
import { rateCreateSchema, type RateCreateInput } from "@/lib/validators/trips";

export async function listRates() {
  return storeList();
}

export async function lookupRate(args: {
  origin: string;
  destination: string;
  customerId?: string;
  cargoClass?: string;
}) {
  return storeLookup(args);
}

export type ActionResult = { ok: true; id: string } | { ok: false; error: string };

export async function createRate(input: RateCreateInput): Promise<ActionResult> {
  const parsed = rateCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const created = storeCreate({
    origin: parsed.data.origin,
    destination: parsed.data.destination,
    customerId: parsed.data.customerId || undefined,
    cargoClass: parsed.data.cargoClass || undefined,
    basis: parsed.data.basis,
    amount: parsed.data.amount,
    currency: parsed.data.currency,
    notes: parsed.data.notes || undefined,
  });
  revalidatePath("/rates");
  return { ok: true, id: created.id };
}
