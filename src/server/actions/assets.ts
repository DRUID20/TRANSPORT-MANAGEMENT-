"use server";

import { revalidatePath } from "next/cache";
import {
  assetLedgerHistory as repoHistory,
  createAsset as repoCreate,
  disposeAsset as repoDispose,
  getAsset as repoGet,
  listAssets as repoList,
  runDepreciation as repoRunDep,
  updateAsset as repoUpdate,
  type CreateAssetInput,
} from "@/server/repos/assets";
import { getCurrentUser } from "@/server/auth/current-user";
import { requireCapability, PermissionError } from "@/server/auth/permissions";
import { logAudit } from "@/server/auth/audit";
import { assetCreateSchema, assetDisposeSchema } from "@/lib/validators/assets";
import type { AssetCategory, AssetStatus, DepreciationMethod } from "@/lib/types/assets";

export type ActionResult = { ok: true; id: string } | { ok: false; error: string };

export async function listAssets(filter?: { category?: AssetCategory; status?: AssetStatus }) {
  await requireCapability("finance.read");
  return repoList(filter);
}

export async function getAssetById(id: string) {
  await requireCapability("finance.read");
  return repoGet(id);
}

export async function getAssetHistory(id: string) {
  await requireCapability("finance.read");
  return repoHistory(id);
}

export async function createAsset(input: unknown): Promise<ActionResult> {
  try {
    await requireCapability("finance.post");
  } catch (e) {
    return { ok: false, error: e instanceof PermissionError ? e.message : "Forbidden" };
  }
  const parsed = assetCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const d = parsed.data;
  const payload: CreateAssetInput = {
    name: d.name,
    category: d.category as AssetCategory,
    description: d.description,
    serialNumber: d.serialNumber,
    location: d.location,
    supplierId: d.supplierId,
    acquisitionDate: d.acquisitionDate,
    cost: d.cost,
    depreciationMethod: d.depreciationMethod as DepreciationMethod,
    usefulLifeMonths: d.usefulLifeMonths,
    depreciationRatePct: d.depreciationRatePct,
    residualValue: d.residualValue,
    depreciationStartDate: d.depreciationStartDate,
    notes: d.notes,
  };
  const r = await repoCreate(payload);
  if ("error" in r) return { ok: false, error: r.error };
  await logAudit({ entityType: "asset", entityId: r.id, action: "create", diff: { name: { from: null, to: r.name }, cost: { from: null, to: r.cost } } });
  revalidatePath("/assets");
  return { ok: true, id: r.id };
}

export async function runAssetDepreciation(input: { period: string; assetId?: string }): Promise<
  { ok: true; count: number; totalKes: number; skipped: number; errors: string[] } | { ok: false; error: string }
> {
  try {
    await requireCapability("finance.post");
  } catch (e) {
    return { ok: false, error: e instanceof PermissionError ? e.message : "Forbidden" };
  }
  const me = await getCurrentUser();
  const r = await repoRunDep({ period: input.period, assetId: input.assetId, postedBy: me?.fullName ?? "Finance" });
  if ("error" in r) return { ok: false, error: r.error };
  await logAudit({
    entityType: "asset",
    entityId: input.assetId ?? null,
    action: "depreciation_run",
    diff: { period: { from: null, to: r.period }, total: { from: null, to: r.totalKes } },
  });
  revalidatePath("/assets");
  if (input.assetId) revalidatePath(`/assets/${input.assetId}`);
  revalidatePath("/ledger");
  return { ok: true, count: r.count, totalKes: r.totalKes, skipped: r.skipped, errors: r.errors };
}

export async function disposeAsset(input: unknown): Promise<ActionResult> {
  try {
    await requireCapability("finance.post");
  } catch (e) {
    return { ok: false, error: e instanceof PermissionError ? e.message : "Forbidden" };
  }
  const parsed = assetDisposeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((e) => e.message).join("; ") };
  }
  const me = await getCurrentUser();
  const r = await repoDispose({ ...parsed.data, postedBy: me?.fullName ?? "Finance" });
  if ("error" in r) return { ok: false, error: r.error };
  await logAudit({
    entityType: "asset",
    entityId: r.id,
    action: parsed.data.writeOff ? "write_off" : "dispose",
    diff: { status: { from: "active", to: r.status }, proceeds: { from: null, to: r.disposalProceeds ?? 0 } },
  });
  revalidatePath("/assets");
  revalidatePath(`/assets/${r.id}`);
  revalidatePath("/ledger");
  return { ok: true, id: r.id };
}

export async function updateAsset(id: string, patch: Partial<CreateAssetInput>): Promise<ActionResult> {
  try {
    await requireCapability("finance.post");
  } catch (e) {
    return { ok: false, error: e instanceof PermissionError ? e.message : "Forbidden" };
  }
  const r = await repoUpdate(id, patch);
  if ("error" in r) return { ok: false, error: r.error };
  await logAudit({ entityType: "asset", entityId: id, action: "update" });
  revalidatePath("/assets");
  revalidatePath(`/assets/${id}`);
  return { ok: true, id };
}
