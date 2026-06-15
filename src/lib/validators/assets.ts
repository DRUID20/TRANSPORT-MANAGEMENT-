import { z } from "zod";
import { ASSET_CATEGORY_KEYS } from "@/lib/types/assets";

export const assetCreateSchema = z
  .object({
    name: z.string().min(1, "Asset name is required"),
    category: z.enum(ASSET_CATEGORY_KEYS as [string, ...string[]]),
    description: z.string().optional(),
    serialNumber: z.string().optional(),
    location: z.string().optional(),
    supplierId: z.string().uuid().optional(),
    acquisitionDate: z.string().min(1, "Acquisition date is required"),
    cost: z.coerce.number().positive("Cost must be greater than zero"),
    depreciationMethod: z.enum(["straight_line", "reducing_balance", "none"]),
    usefulLifeMonths: z.coerce.number().int().positive().optional(),
    depreciationRatePct: z.coerce.number().positive().max(100).optional(),
    residualValue: z.coerce.number().min(0).optional(),
    depreciationStartDate: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine(
    (d) => d.depreciationMethod !== "straight_line" || (d.usefulLifeMonths ?? 0) > 0,
    { message: "Straight-line needs a useful life in months", path: ["usefulLifeMonths"] },
  )
  .refine(
    (d) => d.depreciationMethod !== "reducing_balance" || (d.depreciationRatePct ?? 0) > 0,
    { message: "Reducing-balance needs an annual rate %", path: ["depreciationRatePct"] },
  );

export type AssetCreateInput = z.infer<typeof assetCreateSchema>;

export const assetDisposeSchema = z.object({
  assetId: z.string().uuid(),
  disposalDate: z.string().min(1, "Disposal date is required"),
  proceeds: z.coerce.number().min(0).default(0),
  proceedsAccountCode: z.string().optional(),
  writeOff: z.boolean().optional(),
});

export type AssetDisposeInput = z.infer<typeof assetDisposeSchema>;
