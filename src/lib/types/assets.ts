/**
 * Asset Register — fixed assets, depreciation, disposal.
 *
 * Each asset category maps to the matching triplet already present in the
 * Chart of Accounts: a Cost account (1xxxxx), an Accumulated Depreciation
 * contra-asset (101xxx), and a Depreciation Expense account (630xxx). Land
 * is held at cost and never depreciated. Disposals route the gain/loss to
 * 410300 / 700100.
 */

import type { Currency } from "@/lib/types/ledger";

export type AssetCategory =
  | "land"
  | "buildings"
  | "motor_vehicles"
  | "plant_machinery"
  | "furniture_fixtures"
  | "office_equipment"
  | "computer_equipment"
  | "computer_software";

export type DepreciationMethod = "straight_line" | "reducing_balance" | "none";

export type AssetStatus = "active" | "fully_depreciated" | "disposed" | "written_off";

export interface AssetCategoryConfig {
  label: string;
  /** GL cost account (debit-normal asset). */
  costCode: string;
  /** GL accumulated-depreciation contra-asset (credit-normal). Absent = not depreciated. */
  accumCode?: string;
  /** GL depreciation-expense account. */
  expenseCode?: string;
  depreciable: boolean;
  /** Sensible default useful life (months) for straight-line. */
  defaultUsefulLifeMonths?: number;
}

/** Category → CoA triplet. Mirrors the seeded fuel-haulage chart. */
export const ASSET_CATEGORIES: Record<AssetCategory, AssetCategoryConfig> = {
  land: { label: "Land (Freehold)", costCode: "100100", depreciable: false },
  buildings: {
    label: "Buildings (Freehold)",
    costCode: "100200",
    accumCode: "101200",
    expenseCode: "630100",
    depreciable: true,
    defaultUsefulLifeMonths: 480,
  },
  motor_vehicles: {
    label: "Motor Vehicles",
    costCode: "100300",
    accumCode: "101300",
    expenseCode: "630200",
    depreciable: true,
    defaultUsefulLifeMonths: 60,
  },
  plant_machinery: {
    label: "Plant & Machinery",
    costCode: "100400",
    accumCode: "101400",
    expenseCode: "630300",
    depreciable: true,
    defaultUsefulLifeMonths: 120,
  },
  furniture_fixtures: {
    label: "Furniture & Fixtures",
    costCode: "100500",
    accumCode: "101500",
    expenseCode: "630400",
    depreciable: true,
    defaultUsefulLifeMonths: 96,
  },
  office_equipment: {
    label: "Office Equipment",
    costCode: "100600",
    accumCode: "101600",
    expenseCode: "630500",
    depreciable: true,
    defaultUsefulLifeMonths: 60,
  },
  computer_equipment: {
    label: "Computer Equipment",
    costCode: "100700",
    accumCode: "101700",
    expenseCode: "630600",
    depreciable: true,
    defaultUsefulLifeMonths: 36,
  },
  computer_software: {
    label: "Computer Software",
    costCode: "100800",
    accumCode: "101800",
    expenseCode: "630700",
    depreciable: true,
    defaultUsefulLifeMonths: 36,
  },
};

export const ASSET_CATEGORY_KEYS = Object.keys(ASSET_CATEGORIES) as AssetCategory[];

export const DEPRECIATION_METHOD_LABEL: Record<DepreciationMethod, string> = {
  straight_line: "Straight line",
  reducing_balance: "Reducing balance",
  none: "Not depreciated",
};

export const ASSET_STATUS_LABEL: Record<AssetStatus, string> = {
  active: "Active",
  fully_depreciated: "Fully depreciated",
  disposed: "Disposed",
  written_off: "Written off",
};

/** Gain / loss on disposal accounts. */
export const DISPOSAL_GAIN_CODE = "410300";
export const DISPOSAL_LOSS_CODE = "700100";

export interface Asset {
  id: string;
  number: string; // AST-YYYY-NNNNN
  name: string;
  category: AssetCategory;
  description?: string;
  serialNumber?: string;
  location?: string;
  supplierId?: string;
  acquisitionDate: string; // ISO date
  cost: number;
  currency: Currency;
  depreciationMethod: DepreciationMethod;
  /** Straight-line: months of useful life. */
  usefulLifeMonths?: number;
  /** Reducing-balance: annual depreciation rate (%). */
  depreciationRatePct?: number;
  residualValue: number;
  accumulatedDepreciation: number;
  depreciationStartDate: string; // ISO date
  lastDepreciatedOn?: string; // ISO date — end of the last period charged
  status: AssetStatus;
  disposalDate?: string;
  disposalProceeds?: number;
  disposalJournalEntryId?: string;
  notes?: string;
  createdAt: string;
}

/** Net book value = cost − accumulated depreciation. */
export function netBookValue(asset: Pick<Asset, "cost" | "accumulatedDepreciation">): number {
  return Math.round((asset.cost - asset.accumulatedDepreciation) * 100) / 100;
}

/** Depreciable base = cost − residual value. */
export function depreciableBase(asset: Pick<Asset, "cost" | "residualValue">): number {
  return Math.max(0, asset.cost - asset.residualValue);
}

/**
 * Depreciation charge for ONE month, capped so accumulated depreciation never
 * pushes the net book value below the residual value.
 *
 *  - straight_line:    (cost − residual) / usefulLifeMonths
 *  - reducing_balance: NBV × (annualRate% / 12)
 *  - none / land:      0
 */
export function monthlyDepreciation(
  asset: Pick<
    Asset,
    | "category"
    | "cost"
    | "residualValue"
    | "accumulatedDepreciation"
    | "depreciationMethod"
    | "usefulLifeMonths"
    | "depreciationRatePct"
  >,
): number {
  const cfg = ASSET_CATEGORIES[asset.category];
  if (!cfg.depreciable || asset.depreciationMethod === "none") return 0;

  const remaining = depreciableBase(asset) - asset.accumulatedDepreciation;
  if (remaining <= 0) return 0;

  let charge = 0;
  if (asset.depreciationMethod === "straight_line") {
    const life = asset.usefulLifeMonths ?? cfg.defaultUsefulLifeMonths ?? 60;
    if (life <= 0) return 0;
    charge = depreciableBase(asset) / life;
  } else if (asset.depreciationMethod === "reducing_balance") {
    const rate = (asset.depreciationRatePct ?? 0) / 100 / 12;
    charge = netBookValue(asset) * rate;
  }
  // Never depreciate past the residual value.
  charge = Math.min(charge, remaining);
  return Math.round(charge * 100) / 100;
}
