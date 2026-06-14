import { z } from "zod";

export const jobCardCreateSchema = z.object({
  truckId: z.string().min(1, "Truck is required"),
  tripId: z.string().optional(),
  mechanicName: z.string().min(2, "Mechanic name is required"),
  openingOdometer: z.coerce.number().int().nonnegative().optional(),
  mechanicAnalysis: z.string().optional(),
});
export type JobCardCreateInput = z.infer<typeof jobCardCreateSchema>;

export const jobCardServiceSchema = z.object({
  description: z.string().min(2, "Description is required"),
  hours: z.coerce.number().nonnegative().default(0),
  costKes: z.coerce.number().nonnegative().default(0),
});
export type JobCardServiceInput = z.infer<typeof jobCardServiceSchema>;

export const jobCardSpareSchema = z.object({
  description: z.string().min(2, "Description is required"),
  quantity: z.coerce.number().positive(),
  unitCostKes: z.coerce.number().nonnegative(),
  supplierId: z.string().optional(),
  accountCode: z.string().optional(),
});
export type JobCardSpareInput = z.infer<typeof jobCardSpareSchema>;

export const jobCardCloseSchema = z.object({
  closingOdometer: z.coerce.number().int().nonnegative().optional(),
  notes: z.string().optional(),
});
export type JobCardCloseInput = z.infer<typeof jobCardCloseSchema>;
