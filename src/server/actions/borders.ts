"use server";

import { revalidatePath } from "next/cache";
import {
  clearBorderCrossing as repoClear,
  createBorderCrossing as repoCreate,
  deleteBorderCrossing as repoDelete,
  getBorderCrossing,
  listAllActiveBorderCrossings as repoListActive,
  listBorderCrossings as repoList,
} from "@/server/repos/borders";
import {
  borderClearSchema,
  borderCreateSchema,
  type BorderClearInput,
  type BorderCreateInput,
} from "@/lib/validators/borders";

export async function listBorderCrossingsForTrip(tripId: string) {
  return repoList(tripId);
}

export async function listActiveBorderCrossings() {
  return repoListActive();
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
  const created = await repoCreate(parsed.data);
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
  const updated = await repoClear(parsed.data);
  if (!updated) return { ok: false, error: "Border crossing not found" };
  revalidatePath(`/trips/${updated.tripId}`);
  revalidatePath("/dashboard");
  return { ok: true, id: updated.id };
}

export async function removeBorderCrossing(id: string): Promise<ActionResult> {
  const existing = await getBorderCrossing(id);
  if (!existing) return { ok: false, error: "Border crossing not found" };
  await repoDelete(id);
  revalidatePath(`/trips/${existing.tripId}`);
  revalidatePath("/dashboard");
  return { ok: true, id };
}
