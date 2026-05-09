"use server";

import { revalidatePath } from "next/cache";
import {
  clearBorderCrossing as storeClear,
  createBorderCrossing as storeCreate,
  deleteBorderCrossing as storeDelete,
  getBorderCrossing,
  listAllActiveBorderCrossings as storeListActive,
  listBorderCrossings as storeList,
} from "@/server/store/mock-store";
import {
  borderClearSchema,
  borderCreateSchema,
  type BorderClearInput,
  type BorderCreateInput,
} from "@/lib/validators/borders";

export async function listBorderCrossingsForTrip(tripId: string) {
  return storeList(tripId);
}

export async function listActiveBorderCrossings() {
  return storeListActive();
}

export async function getBorderCrossingById(id: string) {
  return getBorderCrossing(id);
}

export type ActionResult = { ok: true; id: string } | { ok: false; error: string };

export async function recordBorderArrival(input: BorderCreateInput): Promise<ActionResult> {
  const parsed = borderCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const created = storeCreate(parsed.data);
  if (!created) return { ok: false, error: "Trip not found" };
  revalidatePath(`/trips/${parsed.data.tripId}`);
  revalidatePath("/dashboard");
  return { ok: true, id: created.id };
}

export async function clearBorder(input: BorderClearInput): Promise<ActionResult> {
  const parsed = borderClearSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const updated = storeClear(parsed.data);
  if (!updated) return { ok: false, error: "Border crossing not found" };
  revalidatePath(`/trips/${updated.tripId}`);
  revalidatePath("/dashboard");
  return { ok: true, id: updated.id };
}

export async function removeBorderCrossing(id: string): Promise<ActionResult> {
  const existing = getBorderCrossing(id);
  if (!existing) return { ok: false, error: "Border crossing not found" };
  storeDelete(id);
  revalidatePath(`/trips/${existing.tripId}`);
  revalidatePath("/dashboard");
  return { ok: true, id };
}
