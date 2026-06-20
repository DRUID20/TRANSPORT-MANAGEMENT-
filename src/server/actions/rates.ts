"use server";

import { revalidatePath } from "next/cache";
import {
  createRate as repoCreate,
  listRates as repoList,
  lookupRate as repoLookup,
} from "@/server/repos/rates";
import { logAudit } from "@/server/auth/audit";
import { rateCreateSchema, type RateCreateInput } from "@/lib/validators/trips";

export async function listRates() {
  return repoList();
}

export async function lookupRate(args: {
  origin: string;
  destination: string;
  customerId?: string;
  cargoClass?: string;
}) {
  return repoLookup(args);
}

export type ActionResult = { ok: true; id: string } | { ok: false; error: string };

export async function createRate(input: RateCreateInput): Promise<ActionResult> {
  const parsed = rateCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  try {
    const created = await repoCreate({
      origin: parsed.data.origin,
      destination: parsed.data.destination,
      customerId: parsed.data.customerId || undefined,
      cargoClass: parsed.data.cargoClass || undefined,
      basis: parsed.data.basis,
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      notes: parsed.data.notes || undefined,
    });
    await logAudit({
      entityType: "rate",
      entityId: created.id,
      action: "create",
      diff: { route: { from: null, to: `${created.origin} → ${created.destination}` }, amount: { from: null, to: created.amount } },
    });
    revalidatePath("/rates");
    return { ok: true, id: created.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to save rate." };
  }
}
