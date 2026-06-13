import { z } from "zod";

export const expenseCategoryEnum = z.enum([
  "fuel",
  "tolls",
  "border_charges",
  "weighbridge",
  "loading_offloading",
  "demurrage",
  "driver_per_diem",
  "driver_overnight",
  "driver_welfare",
  "vehicle_repair",
  "tyres",
  "spares",
  "lubricants",
  "tracker",
  "vehicle_licence",
  "fines_penalties",
  "other",
]);

export const paymentMethodEnum = z.enum([
  "cash",
  "mpesa",
  "bank",
  "fuel_card",
  "advance",
]);

const currencyEnum = z.enum(["KES", "USD", "UGX"]);

export const expenseCreateSchema = z.object({
  amountKes: z.coerce.number().positive(),
  originalAmount: z.coerce.number().positive().optional(),
  originalCurrency: currencyEnum.optional(),
  category: expenseCategoryEnum,
  description: z.string().min(2, "Description is required"),
  location: z.string().optional(),
  countryCode: z.string().length(2).optional(),
  incurredAt: z.string().min(1),
  paidBy: paymentMethodEnum,
  tripId: z.string().optional(),
  truckId: z.string().optional(),
  driverId: z.string().optional(),
  supplierId: z.string().optional(),
  receiptDocumentId: z.string().optional(),
  submittedBy: z.string().default("Dispatcher"),
});
export type ExpenseCreateInput = z.infer<typeof expenseCreateSchema>;

export const expenseReviewSchema = z.object({
  expenseId: z.string().min(1),
  approve: z.boolean(),
  reason: z.string().optional(),
  reviewedBy: z.string().default("Manager"),
  notes: z.string().optional(),
});
export type ExpenseReviewInput = z.infer<typeof expenseReviewSchema>;
