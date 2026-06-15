/**
 * Asset Register repo — fixed assets + depreciation + disposal.
 *
 * Postgres-backed (org-scoped). Depreciation and disposal post real journal
 * entries to the GL via postJournalEntry, tagged referenceType
 * "depreciation" / "asset_disposal" with referenceId = asset id — so each
 * asset's depreciation schedule IS the ledger (no shadow table to drift).
 */
import { and, desc, eq } from "drizzle-orm";
import { IS_DEMO_MODE } from "@/server/auth/session-secret";
import { requireOrgId } from "@/server/auth/current-org";
import { getDb } from "@/server/db/client";
import { assets as table } from "@/server/db/schema";
import { nextDocumentNumber } from "@/server/repos/counters";
import { getAccountByCode } from "@/server/repos/accounts";
import { postJournalEntry, listJournalEntries } from "@/server/repos/ledger";
import {
  ASSET_CATEGORIES,
  DISPOSAL_GAIN_CODE,
  DISPOSAL_LOSS_CODE,
  monthlyDepreciation,
  netBookValue,
  type Asset,
  type AssetCategory,
  type AssetStatus,
  type DepreciationMethod,
} from "@/lib/types/assets";
import type { Currency } from "@/lib/types/ledger";

type Row = typeof table.$inferSelect;
const num = (v: unknown) => (v === null || v === undefined ? undefined : Number(v));

function toAsset(r: Row): Asset {
  return {
    id: r.id,
    number: r.number,
    name: r.name,
    category: r.category as AssetCategory,
    description: r.description ?? undefined,
    serialNumber: r.serialNumber ?? undefined,
    location: r.location ?? undefined,
    supplierId: r.supplierId ?? undefined,
    acquisitionDate: r.acquisitionDate,
    cost: Number(r.cost),
    currency: r.currency as Currency,
    depreciationMethod: r.depreciationMethod as DepreciationMethod,
    usefulLifeMonths: num(r.usefulLifeMonths),
    depreciationRatePct: num(r.depreciationRatePct),
    residualValue: Number(r.residualValue),
    accumulatedDepreciation: Number(r.accumulatedDepreciation),
    depreciationStartDate: r.depreciationStartDate,
    lastDepreciatedOn: r.lastDepreciatedOn ?? undefined,
    status: r.status as AssetStatus,
    disposalDate: r.disposalDate ?? undefined,
    disposalProceeds: num(r.disposalProceeds),
    disposalJournalEntryId: r.disposalJournalEntryId ?? undefined,
    notes: r.notes ?? undefined,
    createdAt: r.createdAt.toISOString(),
  };
}

/** Last calendar day of a YYYY-MM period, as an ISO date. */
function monthEndISO(yearMonth: string): string {
  const [y, m] = yearMonth.split("-").map(Number);
  const last = new Date(Date.UTC(y!, m!, 0)).getUTCDate();
  return `${yearMonth}-${String(last).padStart(2, "0")}`;
}

export async function listAssets(filter?: {
  category?: AssetCategory;
  status?: AssetStatus;
}): Promise<Asset[]> {
  if (IS_DEMO_MODE) return [];
  const db = getDb();
  const orgId = await requireOrgId();
  const where = [eq(table.organizationId, orgId)];
  if (filter?.category) where.push(eq(table.category, filter.category));
  if (filter?.status) where.push(eq(table.status, filter.status));
  const rows = await db.select().from(table).where(and(...where)).orderBy(desc(table.createdAt));
  return rows.map(toAsset);
}

export async function getAsset(id: string): Promise<Asset | undefined> {
  if (IS_DEMO_MODE) return undefined;
  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .select()
    .from(table)
    .where(and(eq(table.id, id), eq(table.organizationId, orgId)))
    .limit(1);
  return rows[0] ? toAsset(rows[0]) : undefined;
}

export type CreateAssetInput = {
  name: string;
  category: AssetCategory;
  description?: string;
  serialNumber?: string;
  location?: string;
  supplierId?: string;
  acquisitionDate: string;
  cost: number;
  depreciationMethod: DepreciationMethod;
  usefulLifeMonths?: number;
  depreciationRatePct?: number;
  residualValue?: number;
  depreciationStartDate?: string;
  notes?: string;
};

export async function createAsset(input: CreateAssetInput): Promise<Asset | { error: string }> {
  if (IS_DEMO_MODE) return { error: "Asset register requires the database." };
  const cfg = ASSET_CATEGORIES[input.category];
  if (!cfg) return { error: "Unknown asset category." };
  const db = getDb();
  const orgId = await requireOrgId();
  const number = await nextDocumentNumber(orgId, "AST", "asset", 5);
  const method: DepreciationMethod = cfg.depreciable ? input.depreciationMethod : "none";
  const rows = await db
    .insert(table)
    .values({
      organizationId: orgId,
      number,
      name: input.name,
      category: input.category,
      description: input.description ?? null,
      serialNumber: input.serialNumber ?? null,
      location: input.location ?? null,
      supplierId: input.supplierId ?? null,
      acquisitionDate: input.acquisitionDate,
      cost: String(input.cost),
      currency: "KES",
      depreciationMethod: method,
      usefulLifeMonths: input.usefulLifeMonths ?? null,
      depreciationRatePct: input.depreciationRatePct != null ? String(input.depreciationRatePct) : null,
      residualValue: String(input.residualValue ?? 0),
      accumulatedDepreciation: "0",
      depreciationStartDate: input.depreciationStartDate ?? input.acquisitionDate,
      status: "active",
      notes: input.notes ?? null,
    })
    .returning();
  return toAsset(rows[0]!);
}

export async function updateAsset(id: string, patch: Partial<CreateAssetInput>): Promise<Asset | { error: string }> {
  if (IS_DEMO_MODE) return { error: "Asset register requires the database." };
  const db = getDb();
  const orgId = await requireOrgId();
  const set: Record<string, unknown> = {};
  if (patch.name !== undefined) set.name = patch.name;
  if (patch.description !== undefined) set.description = patch.description ?? null;
  if (patch.serialNumber !== undefined) set.serialNumber = patch.serialNumber ?? null;
  if (patch.location !== undefined) set.location = patch.location ?? null;
  if (patch.supplierId !== undefined) set.supplierId = patch.supplierId ?? null;
  if (patch.depreciationMethod !== undefined) set.depreciationMethod = patch.depreciationMethod;
  if (patch.usefulLifeMonths !== undefined) set.usefulLifeMonths = patch.usefulLifeMonths ?? null;
  if (patch.depreciationRatePct !== undefined)
    set.depreciationRatePct = patch.depreciationRatePct != null ? String(patch.depreciationRatePct) : null;
  if (patch.residualValue !== undefined) set.residualValue = String(patch.residualValue);
  if (patch.notes !== undefined) set.notes = patch.notes ?? null;
  if (Object.keys(set).length === 0) return (await getAsset(id))!;
  const rows = await db
    .update(table)
    .set(set)
    .where(and(eq(table.id, id), eq(table.organizationId, orgId)))
    .returning();
  return rows[0] ? toAsset(rows[0]) : { error: "Asset not found" };
}

export interface DepreciationRunResult {
  period: string;
  count: number;
  totalKes: number;
  skipped: number;
  charges: Array<{ assetId: string; number: string; name: string; amount: number }>;
  errors: string[];
}

/**
 * Post one month of depreciation for a single asset or every eligible asset.
 * Idempotent per period: an asset already charged for `period` (its
 * lastDepreciatedOn is on/after the month end) is skipped.
 */
export async function runDepreciation(input: {
  period: string; // YYYY-MM
  assetId?: string;
  postedBy: string;
}): Promise<DepreciationRunResult | { error: string }> {
  if (IS_DEMO_MODE) return { error: "Asset register requires the database." };
  if (!/^\d{4}-\d{2}$/.test(input.period)) return { error: "Period must be YYYY-MM." };
  const chargeDate = monthEndISO(input.period);
  const result: DepreciationRunResult = {
    period: input.period,
    count: 0,
    totalKes: 0,
    skipped: 0,
    charges: [],
    errors: [],
  };

  const pool = input.assetId
    ? ([await getAsset(input.assetId)].filter(Boolean) as Asset[])
    : await listAssets({ status: "active" });

  for (const asset of pool) {
    if (asset.status !== "active") {
      result.skipped++;
      continue;
    }
    const cfg = ASSET_CATEGORIES[asset.category];
    if (!cfg.depreciable || !cfg.accumCode || !cfg.expenseCode) {
      result.skipped++;
      continue;
    }
    // Not yet started, or already charged for this period.
    if (asset.depreciationStartDate > chargeDate) {
      result.skipped++;
      continue;
    }
    if (asset.lastDepreciatedOn && asset.lastDepreciatedOn >= chargeDate) {
      result.skipped++;
      continue;
    }
    const charge = monthlyDepreciation(asset);
    if (charge <= 0) {
      result.skipped++;
      continue;
    }
    const expenseAcc = await getAccountByCode(cfg.expenseCode);
    const accumAcc = await getAccountByCode(cfg.accumCode);
    if (!expenseAcc || !accumAcc) {
      result.errors.push(`${asset.number}: depreciation accounts (${cfg.expenseCode}/${cfg.accumCode}) not found in CoA.`);
      continue;
    }
    const je = await postJournalEntry({
      date: chargeDate,
      memo: `Depreciation ${asset.number} — ${asset.name} (${input.period})`,
      referenceType: "depreciation",
      referenceId: asset.id,
      postedBy: input.postedBy,
      lines: [
        { accountId: expenseAcc.id, debit: charge, credit: 0, currency: "KES", fxRate: 1, description: `Depreciation — ${asset.name}` },
        { accountId: accumAcc.id, debit: 0, credit: charge, currency: "KES", fxRate: 1, description: `Acc. dep. — ${asset.name}` },
      ],
    });
    if ("error" in je) {
      result.errors.push(`${asset.number}: ${je.error}`);
      continue;
    }
    const newAccum = Math.round((asset.accumulatedDepreciation + charge) * 100) / 100;
    const fullyDepreciated = newAccum >= asset.cost - asset.residualValue - 0.005;
    const db = getDb();
    const orgId = await requireOrgId();
    await db
      .update(table)
      .set({
        accumulatedDepreciation: String(newAccum),
        lastDepreciatedOn: chargeDate,
        status: fullyDepreciated ? "fully_depreciated" : "active",
      })
      .where(and(eq(table.id, asset.id), eq(table.organizationId, orgId)));
    result.count++;
    result.totalKes += charge;
    result.charges.push({ assetId: asset.id, number: asset.number, name: asset.name, amount: charge });
  }
  result.totalKes = Math.round(result.totalKes * 100) / 100;
  return result;
}

export async function disposeAsset(input: {
  assetId: string;
  disposalDate: string;
  proceeds: number;
  proceedsAccountCode?: string; // bank/cash/mpesa account; omit for write-off
  writeOff?: boolean;
  postedBy: string;
}): Promise<Asset | { error: string }> {
  if (IS_DEMO_MODE) return { error: "Asset register requires the database." };
  const asset = await getAsset(input.assetId);
  if (!asset) return { error: "Asset not found." };
  if (asset.status === "disposed" || asset.status === "written_off") {
    return { error: `Asset is already ${asset.status.replace("_", " ")}.` };
  }
  const cfg = ASSET_CATEGORIES[asset.category];
  const costAcc = await getAccountByCode(cfg.costCode);
  if (!costAcc) return { error: `Cost account ${cfg.costCode} not found in CoA.` };

  const proceeds = input.writeOff ? 0 : Math.max(0, input.proceeds);
  const nbv = netBookValue(asset);
  const gain = Math.round((proceeds - nbv) * 100) / 100;

  const lines: Array<{ accountId: string; debit: number; credit: number; currency: Currency; fxRate: number; description?: string }> = [];
  // Remove the asset cost.
  lines.push({ accountId: costAcc.id, debit: 0, credit: asset.cost, currency: "KES", fxRate: 1, description: `Disposal — ${asset.name} (cost)` });
  // Remove accumulated depreciation.
  if (cfg.accumCode && asset.accumulatedDepreciation > 0) {
    const accumAcc = await getAccountByCode(cfg.accumCode);
    if (!accumAcc) return { error: `Accumulated-depreciation account ${cfg.accumCode} not found in CoA.` };
    lines.push({ accountId: accumAcc.id, debit: asset.accumulatedDepreciation, credit: 0, currency: "KES", fxRate: 1, description: `Disposal — ${asset.name} (acc. dep.)` });
  }
  // Proceeds to bank/cash.
  if (proceeds > 0) {
    const code = input.proceedsAccountCode ?? "121100";
    const cashAcc = await getAccountByCode(code);
    if (!cashAcc) return { error: `Proceeds account ${code} not found in CoA.` };
    lines.push({ accountId: cashAcc.id, debit: proceeds, credit: 0, currency: "KES", fxRate: 1, description: `Disposal proceeds — ${asset.name}` });
  }
  // Gain (credit) or loss (debit) on disposal.
  if (gain > 0) {
    const gainAcc = await getAccountByCode(DISPOSAL_GAIN_CODE);
    if (!gainAcc) return { error: `Gain-on-disposal account ${DISPOSAL_GAIN_CODE} not found in CoA.` };
    lines.push({ accountId: gainAcc.id, debit: 0, credit: gain, currency: "KES", fxRate: 1, description: `Gain on disposal — ${asset.name}` });
  } else if (gain < 0) {
    const lossAcc = await getAccountByCode(DISPOSAL_LOSS_CODE);
    if (!lossAcc) return { error: `Loss-on-disposal account ${DISPOSAL_LOSS_CODE} not found in CoA.` };
    lines.push({ accountId: lossAcc.id, debit: -gain, credit: 0, currency: "KES", fxRate: 1, description: `Loss on disposal — ${asset.name}` });
  }

  const je = await postJournalEntry({
    date: input.disposalDate,
    memo: `${input.writeOff ? "Write-off" : "Disposal"} ${asset.number} — ${asset.name}`,
    referenceType: "asset_disposal",
    referenceId: asset.id,
    postedBy: input.postedBy,
    lines,
  });
  if ("error" in je) return { error: je.error };

  const db = getDb();
  const orgId = await requireOrgId();
  const rows = await db
    .update(table)
    .set({
      status: input.writeOff ? "written_off" : "disposed",
      disposalDate: input.disposalDate,
      disposalProceeds: String(proceeds),
      disposalJournalEntryId: je.id,
    })
    .where(and(eq(table.id, asset.id), eq(table.organizationId, orgId)))
    .returning();
  return rows[0] ? toAsset(rows[0]) : { error: "Disposal update failed." };
}

/** An asset's depreciation + disposal postings, newest first (from the GL). */
export async function assetLedgerHistory(assetId: string) {
  if (IS_DEMO_MODE) return [];
  const [dep, disp] = await Promise.all([
    listJournalEntries({ referenceType: "depreciation", referenceId: assetId }),
    listJournalEntries({ referenceType: "asset_disposal", referenceId: assetId }),
  ]);
  return [...dep, ...disp].sort((a, b) => b.date.localeCompare(a.date));
}
